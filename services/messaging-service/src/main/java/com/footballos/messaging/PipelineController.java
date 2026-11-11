package com.footballos.messaging;

import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** The read/observe surface of the messaging tier. It serves the pipeline's own policy and live
 *  counters as JSON, and publishes a batch of events onto the bound exchange. No SPA route calls
 *  it — PLATFORM_LIVE is false — so this is an honest witness of the wiring, not a claimed feed. */
@RestController
@RequestMapping("/messaging")
public class PipelineController {
    private final StreamBridge bridge;
    private final PipelineFunctions pipeline;
    private final RabbitTemplate rabbit;
    private final Supplier<PipelineFunctions.MatchEvent> publisher;
    private final Consumer<PipelineFunctions.MatchEvent> processor;

    public PipelineController(StreamBridge bridge, PipelineFunctions pipeline, RabbitTemplate rabbit,
                              @Qualifier("publishFixtures") Supplier<PipelineFunctions.MatchEvent> publisher,
                              @Qualifier("processEvents") Consumer<PipelineFunctions.MatchEvent> processor) {
        this.bridge = bridge;
        this.pipeline = pipeline;
        this.rabbit = rabbit;
        this.publisher = publisher;
        this.processor = processor;
    }

    /** M1071: `live` used to be a hardcoded `false`, so a fully working tier — health UP, AMQP
     *  connection open, exchange/queues provisioned — still told every caller it was DOWN. That is
     *  the opposite of the cache tier's honest, ping-derived `redisUp`. Probe a REAL AMQP connection
     *  on the same connection factory the binder uses; the bounded `spring.rabbitmq.connection-timeout`
     *  (2s) keeps a broker outage from parking a worker for a minute. Any failure is an honest
     *  `live:false`, and the observe surface is the only place that decides it. */
    private boolean brokerLive() {
        Connection conn = null;
        try {
            conn = rabbit.getConnectionFactory().createConnection();
            return conn != null && conn.isOpen();
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) {
                try { conn.close(); } catch (Exception ignored) { /* best effort */ }
            }
        }
    }

    /** GET /messaging/summary — the contract: the bound exchange, the DLQ and the policy. */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        DeliveryPolicy p = pipeline.policy();
        return ResponseEntity.ok(Map.of(
                "exchange", p.getExchange(),
                "dlq", p.getDlq(),
                "shards", p.getShards(),
                "maxAttempts", p.getMaxAttempts(),
                "binder", "rabbit",
                "live", brokerLive()));
    }

    /** GET /messaging/stats — the live counters, including the seen-set and per-shard load. */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(pipeline.stats());
    }

    /** GET /messaging/policy — the retry ladder and water marks the fold also runs under. */
    @GetMapping("/policy")
    public ResponseEntity<Map<String, Object>> policy() {
        DeliveryPolicy p = pipeline.policy();
        return ResponseEntity.ok(Map.of(
                "baseDelay", p.getBaseDelay(),
                "capDelay", p.getCapDelay(),
                "maxAttempts", p.getMaxAttempts(),
                "highWater", p.getHighWater(),
                "lowWater", p.getLowWater(),
                "shards", p.getShards(),
                "rung3", p.rawBackoff(3)));
    }

    /** POST /messaging/publish — send a batch of events onto the bound output binding. The Spring
     *  Cloud Stream binder routes each by its partition key, applies prefetch backpressure, retries
     *  a NACK with the exponential ladder and dead-letters after max attempts.
     *
     *  M1071: the partition/routing SpEL in application.yml reads `headers['partitionKey']`, NOT
     *  `payload.key` — by the time the RabbitExpressionEvaluatingInterceptor runs, the JSON converter
     *  has already turned the POJO into a byte[], so a payload-field expression throws EL1008E and
     *  every send 500s. Carrying the key in a header (which survives serialization) is the documented
     *  Spring Cloud Stream fix. A send that the broker refuses is counted as not-sent rather than
     *  throwing a 500, so the surface stays honest under a broker outage. */
    @PostMapping("/publish")
    public ResponseEntity<Map<String, Object>> publish(@RequestBody List<PipelineFunctions.MatchEvent> events) {
        int sent = 0;
        if (events != null) {
            for (PipelineFunctions.MatchEvent event : events) {
                Message<PipelineFunctions.MatchEvent> msg = MessageBuilder
                        .withPayload(event)
                        .setHeader("partitionKey", event.key())
                        .build();
                boolean ok;
                try {
                    ok = bridge.send("publishFixtures-out-0", msg);
                } catch (Exception e) {
                    ok = false; // a dead broker must not turn the observe surface into a 500
                }
                if (ok) sent += 1;
            }
        }
        return ResponseEntity.ok(Map.of("sent", sent, "requested", events == null ? 0 : events.size()));
    }
}
