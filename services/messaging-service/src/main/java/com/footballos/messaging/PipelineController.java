package com.footballos.messaging;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.cloud.stream.function.StreamBridge;
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
    private final Supplier<PipelineFunctions.MatchEvent> publisher;
    private final Consumer<PipelineFunctions.MatchEvent> processor;

    public PipelineController(StreamBridge bridge, PipelineFunctions pipeline,
                              @Qualifier("publishFixtures") Supplier<PipelineFunctions.MatchEvent> publisher,
                              @Qualifier("processEvents") Consumer<PipelineFunctions.MatchEvent> processor) {
        this.bridge = bridge;
        this.pipeline = pipeline;
        this.publisher = publisher;
        this.processor = processor;
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
                "live", false));
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
     *  a NACK with the exponential ladder and dead-letters after max attempts. */
    @PostMapping("/publish")
    public ResponseEntity<Map<String, Object>> publish(@RequestBody List<PipelineFunctions.MatchEvent> events) {
        int sent = 0;
        if (events != null) {
            for (PipelineFunctions.MatchEvent event : events) {
                boolean ok = bridge.send("publishFixtures-out-0", event);
                if (ok) sent += 1;
            }
        }
        return ResponseEntity.ok(Map.of("sent", sent, "requested", events == null ? 0 : events.size()));
    }
}
