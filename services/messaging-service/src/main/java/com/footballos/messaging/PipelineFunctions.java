package com.footballos.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** The functional pipeline: a Supplier publishes the seeded world's finished fixtures, a Consumer
 *  processes them with a consumer-side idempotency set, and a second Consumer is the dead-letter
 *  sink. These are the bean names application.yml binds to (publishFixtures / processEvents /
 *  deadLetter). Every decision here mirrors a pure function in domain/queue.ts:
 *    · shardOf(key)          -> the partition key the binder routes on
 *    · rawBackoff(attempt)   -> the Rabbit retry back-off ladder
 *    · maxAttempts -> DLQ    -> the republish-to-dlq binding + the deadLetter sink
 *    · a seen-id set         -> exactly-once EFFECT under at-least-once delivery
 *  The counters are observable through PipelineController, this service's /stats surface. */
@Component
public class PipelineFunctions {
    private static final Logger log = LoggerFactory.getLogger(PipelineFunctions.class);

    /** The message on the wire: an id (idempotency key), a key (partition key), and a body. */
    public record MatchEvent(String id, String key, String body, long availableAt) {}

    private final DeliveryPolicy policy;
    private final StreamBridge bridge;
    private final Set<String> seen = ConcurrentHashMap.newKeySet();
    private final AtomicLong delivered = new AtomicLong();
    private final AtomicLong duplicates = new AtomicLong();
    private final AtomicLong deadLettered = new AtomicLong();
    private final Map<Integer, AtomicLong> byShard = new ConcurrentHashMap<>();
    /** M1072: per-id attempt ledger for wire-level fault injection (only fault-marked bodies enter
     *  it — normal traffic never touches this map). Mirrors the pure fold's FailurePlan: a body
     *  `FAIL:n:` NACKs its first n tries, `POISON:` NACKs forever. */
    private final Map<String, AtomicLong> attempts = new ConcurrentHashMap<>();
    private final AtomicLong faultAttempts = new AtomicLong();
    /** M1072: how many exhausted poison pills this instance ROUTED to the DLQ itself (as opposed
     *  to the deadLetter sink's consumption count). The two together prove the termination path. */
    private final AtomicLong routedToDlq = new AtomicLong();

    public PipelineFunctions(DeliveryPolicy policy, StreamBridge bridge) {
        this.policy = policy;
        this.bridge = bridge;
    }

    /** Publisher: emits nothing until /publish plants a world snapshot (the SPA's seeded fixtures
     *  are not compiled into a broker process). Kept as a Supplier so the binding is a real Stream
     *  publisher the proof can name, not a hand-rolled RabbitTemplate call. */
    @Bean
    public Supplier<MatchEvent> publishFixtures() {
        return () -> null; // a null payload is not emitted; /publish drives the out binding directly
    }

    /** M1072 fault-injection marker, parsed from the opaque body so it survives JSON serialization
     *  without changing the MatchEvent record (and without needing a second binding). It is the wire
     *  twin of domain/queue.ts's `failures[id]` FailurePlan, carried on the message itself:
     *    · `POISON:<...>`     — NACK every try, so the binder walks the whole max-attempts ladder
     *                           and republishes the message to the DLQ (termination).
     *    · `FAIL:<n>:<...>`   — NACK the first n tries, deliver on try n+1 (transient recovery).
     *    · any other body      — normal delivery.
     *  Parsing is defensive: a malformed marker is treated as a normal body, never a failure. */
    private static final String POISON_PREFIX = "POISON:";
    private static final String FAIL_PREFIX = "FAIL:";

    /** How many INITIAL tries this event must NACK before it may be delivered. -1 means "forever"
     *  (a poison pill); 0 means the ordinary happy path. */
    static int failTriesOf(String body) {
        if (body == null) return 0;
        if (body.startsWith(POISON_PREFIX)) return -1;
        if (body.startsWith(FAIL_PREFIX)) {
            int end = body.indexOf(':', FAIL_PREFIX.length());
            if (end > FAIL_PREFIX.length()) {
                try {
                    int n = Integer.parseInt(body.substring(FAIL_PREFIX.length(), end));
                    if (n >= 0 && n < 1_000_000) return n; // bound the ledger memory
                } catch (NumberFormatException ignored) { /* malformed → normal delivery */ }
            }
        }
        return 0;
    }

    /** Processing consumer: the idempotency door AND the retry/DLQ ladder.
     *
     *  M1072 — a real defect the live RabbitMQ witness exposed: the failure check MUST come BEFORE
     *  the seen-set. The old code called `seen.add(id)` first and only then could a message fail.
     *  With an injectable failure that ordering silently SWALLOWS poison messages: try 1 adds the id
     *  to `seen` then throws; the binder retries, try 2 sees the id already in `seen`, counts it as
     *  a duplicate and returns SUCCESS — so the retry ladder never advances, max-attempts is never
     *  reached, and the poison message is neither delivered nor dead-lettered. It vanishes. The pure
     *  fold in domain/queue.ts already has it right: `seen.add` happens only on a SUCCESSFUL try,
     *  after `attempt <= failTries` has been ruled out. This is the wire twin of that ordering:
     *    try = attempts[id] + 1
     *    failTries = failTriesOf(body)
     *    if isPoison && try >= maxAttempts → route to poison-out-0 (the DLQ) OURSELVES, return
     *    if failTries < 0 || try <= failTries → record a fault attempt, throw (framework retries/backoffs)
     *    else → idempotency door, shard census, delivered.
     *  A `FAIL:n` pill therefore delivers on try n+1. A `POISON` pill exhausts max-attempts (5) and
     *  processEvents() itself routes it to the DLQ — the framework RetryTemplate would otherwise
     *  log-and-drop it into the global errorChannel; the binder's `republish-to-dlq` recoverer is a
     *  DIFFERENT path and is NOT reached by a functional consumer's retry. Termination is owned here. */
    @Bean
    public Consumer<MatchEvent> processEvents() {
        return event -> {
            if (event == null) return;
            int failTries = failTriesOf(event.body());
            // Only fault-marked bodies enter the per-id attempt ledger: ordinary traffic pays no
            // map lookup / allocation and behaves EXACTLY as it did before M1072.
            if (failTries != 0) {
                long tryNumber = attempts.computeIfAbsent(event.id(), k -> new AtomicLong()).incrementAndGet();
                // Failure door FIRST: a NACK'd try must NOT occupy the seen-set, or the retry is
                // mistaken for a duplicate and the ladder/DLQ never fires (the swallowed-poison bug).
                boolean isPoison = failTries < 0;
                if (isPoison && tryNumber >= policy.getMaxAttempts()) {
                    // M1072 TERMINATION FIX. A framework-level RetryTemplate exhausts its ladder and
                    // hands the failed Message to the global errorChannel — whose default handler is
                    // a LoggingHandler that LOG-AND-DROPS it. `republish-to-dlq` does NOT rescue it:
                    // that is a BINDER-level recoverer and the functional-consumer retry never passes
                    // through the binder's republish interceptor. The live witness caught the result:
                    // faultAttempts hit 5, but deadLettered stayed 0 and the poison vanished. So on the
                    // LAST allowed try, route it to the DLQ binding OURSELVES and return normally — no
                    // exception, nothing to log-and-drop. The deadLetter sink then consumes it (exactly
                    // as it does a directly-published DLQ message), so termination is observable and
                    // owned by this service, independent of Spring's two disjoint retry mechanisms.
                    faultAttempts.incrementAndGet();
                    boolean routed = bridge.send("poison-out-0", event);
                    if (routed) routedToDlq.incrementAndGet();
                    log.warn("poison exhausted maxAttempts={} id={} try={} routedToDlq={}", policy.getMaxAttempts(), event.id(), tryNumber, routed);
                    return; // terminal: never enters seen, never counted as delivered/duplicate
                }
                if (isPoison || tryNumber <= failTries) {
                    faultAttempts.incrementAndGet();
                    log.warn("injected failure id={} try={} failTries={} body={}", event.id(), tryNumber, failTries, event.body());
                    throw new IllegalStateException("injected failure for id=" + event.id() + " on try " + tryNumber);
                }
            }
            if (!seen.add(event.id())) {
                duplicates.incrementAndGet();
                log.info("duplicate dropped id={}", event.id());
                return;
            }
            byShard.computeIfAbsent(policy.shardOf(event.key()), k -> new AtomicLong()).incrementAndGet();
            delivered.incrementAndGet();
            log.debug("delivered id={} shard={} body={}", event.id(), policy.shardOf(event.key()), event.body());
        };
    }

    /** Dead-letter sink: a poison message that exhausted maxAttempts arrives here, which is the
     *  termination guarantee — no infinite requeue. Mirrors deadLettered in the pure fold. */
    @Bean
    public Consumer<MatchEvent> deadLetter() {
        return event -> {
            if (event == null) return;
            deadLettered.incrementAndGet();
            log.warn("dead-lettered id={} after {} attempts", event.id(), policy.getMaxAttempts());
        };
    }

    /** The stats the controller prints — a real reachability/stats surface, never a claimed green. */
    public Map<String, Object> stats() {
        Map<Integer, Long> shards = new java.util.TreeMap<>();
        byShard.forEach((k, v) -> shards.put(k, v.get()));
        return Map.of(
                "delivered", delivered.get(),
                "duplicates", duplicates.get(),
                "deadLettered", deadLettered.get(),
                "seen", seen.size(),
                "byShard", shards,
                // M1072: fault-injection evidence — how many tries NACK'd, and how many distinct
                // ids entered the ledger. A POISON pill raises faultAttempts to maxAttempts and
                // deadLettered by 1; a FAIL:n pill raises it by n then still delivers. Both are
                // measured live by verify-messaging-dlq-live.mjs, not claimed here.
                "faultAttempts", faultAttempts.get(),
                "faultIds", attempts.size(),
                "routedToDlq", routedToDlq.get());
    }

    /** The policy the broker runs under, for the controller's /policy surface. */
    public DeliveryPolicy policy() {
        return policy;
    }
}
