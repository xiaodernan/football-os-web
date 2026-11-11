package com.footballos.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The wire policy, bound from `footballos.messaging.*` in application.yml. The defaults are the
 *  exact numbers of domain/queue.ts's QUEUE_POLICY; proof-services.mjs checks the yml, the Java
 *  defaults and the TypeScript constants agree, so a retry bound cannot drift between the fold a
 *  proof recounts and the broker that would actually deliver it. */
@ConfigurationProperties(prefix = "footballos.messaging")
public class DeliveryPolicy {
    private String exchange = "footballos.events";
    private String dlq = "footballos.events.dlq";
    private long baseDelay = 20;      // ms — first retry's exponential base
    private long capDelay = 640;      // ms — the ceiling the exponential is clamped to
    private int maxAttempts = 5;      // a message that fails this many times is dead-lettered
    private int highWater = 64;       // prefetch / admission high mark
    private int lowWater = 16;        // admission low mark (hysteresis band 16..64)
    private int shards = 8;           // partition count, matching the stream binding

    /** min(cap, base · 2^(attempt-1)) — the same ladder rawBackoff() computes in the fold. */
    public long rawBackoff(int attempt) {
        int step = Math.max(1, attempt);
        return Math.min(capDelay, baseDelay * (1L << Math.min(step - 1, 62)));
    }

    /** A partition for a key, matching shardOf(): hash mod shards. Java's String.hashCode is the
     *  wire-side hash; the proof checks the SHAPE (mod shards), not the exact bucket, because the
     *  two languages deliberately use different hash functions but the same partition count. */
    public int shardOf(String key) {
        return Math.floorMod(key.hashCode(), shards);
    }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }
    public String getDlq() { return dlq; }
    public void setDlq(String dlq) { this.dlq = dlq; }
    public long getBaseDelay() { return baseDelay; }
    public void setBaseDelay(long baseDelay) { this.baseDelay = baseDelay; }
    public long getCapDelay() { return capDelay; }
    public void setCapDelay(long capDelay) { this.capDelay = capDelay; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public int getHighWater() { return highWater; }
    public void setHighWater(int highWater) { this.highWater = highWater; }
    public int getLowWater() { return lowWater; }
    public void setLowWater(int lowWater) { this.lowWater = lowWater; }
    public int getShards() { return shards; }
    public void setShards(int shards) { this.shards = shards; }
}
