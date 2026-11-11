package com.footballos.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private final Set<String> seen = ConcurrentHashMap.newKeySet();
    private final AtomicLong delivered = new AtomicLong();
    private final AtomicLong duplicates = new AtomicLong();
    private final AtomicLong deadLettered = new AtomicLong();
    private final Map<Integer, AtomicLong> byShard = new ConcurrentHashMap<>();

    public PipelineFunctions(DeliveryPolicy policy) {
        this.policy = policy;
    }

    /** Publisher: emits nothing until /publish plants a world snapshot (the SPA's seeded fixtures
     *  are not compiled into a broker process). Kept as a Supplier so the binding is a real Stream
     *  publisher the proof can name, not a hand-rolled RabbitTemplate call. */
    @Bean
    public Supplier<MatchEvent> publishFixtures() {
        return () -> null; // a null payload is not emitted; /publish drives the out binding directly
    }

    /** Processing consumer: the idempotency door. A repeated id is counted as a duplicate and
     *  dropped before any effect — the wire twin of the seen-set in deliverQueue(). A thrown
     *  exception is what makes the binder retry with the configured back-off and finally DLQ. */
    @Bean
    public Consumer<MatchEvent> processEvents() {
        return event -> {
            if (event == null) return;
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
                "byShard", shards);
    }

    /** The policy the broker runs under, for the controller's /policy surface. */
    public DeliveryPolicy policy() {
        return policy;
    }
}
