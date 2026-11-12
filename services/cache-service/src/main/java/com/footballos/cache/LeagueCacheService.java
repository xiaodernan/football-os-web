package com.footballos.cache;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * The cache-aside engine — now the wire TWIN of domain/cache.ts's singleFlight + expiryWithJitter
 * folds (M1076). M1058 shipped a plain get→miss→origin→set; that left the two defences the atlas
 * prints ("one load per hot key", "seeded TTL scatter") living only in the analysis layer while
 * the process that actually talks to Redis did neither. This class makes both real without moving
 * an endpoint or breaking the M1070 honest-degrade contract.
 *
 * single-flight: one owner per key reads the origin; sibling misses inside the in-flight window
 *   await that owner's CompletableFuture (bounded) and share its bytes, so a cold-key burst cannot
 *   stampede the origin. A dead/timed-out owner degrades to its own origin read — no parked worker.
 *   The ledger is process-local: one cache-service instance is the shipped topology; a multi-node
 *   fleet would move the lock to a Redis SET NX (honest boundary, in the runbook).
 *
 * TTL full jitter: write-back lifetime = ttl + floor(mulberry32(fnv1a(seed:key:now)) * (jitter+1)),
 *   the exact shape of lib/rng.ts + domain/cache.ts expiryWithJitter.
 *
 * The counters are AtomicLong because single-flight is genuinely concurrent now (M1058's "no
 * concurrency contract" note is superseded). originLoads and coalesced are MEASURED values the
 * live parity witness checks, not asserted ones.
 */
@Service
public class LeagueCacheService {

    private static final String JITTER_SEED = "football-os";   // == CACHE_POLICY.seed in domain/cache.ts
    private static final long COALESCE_FLOOR_MS = 8000;        // bounded wait, mirrors the degrade budget

    private final StringRedisTemplate redis;
    private final String resource;
    private final long ttlSeconds;
    private final long jitterSeconds;
    private final long originLatencyMs;

    private final ConcurrentHashMap<String, CompletableFuture<String>> inFlight = new ConcurrentHashMap<>();
    private final AtomicLong requests = new AtomicLong();
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();
    private final AtomicLong originLoads = new AtomicLong();
    private final AtomicLong coalesced = new AtomicLong();

    public LeagueCacheService(
            StringRedisTemplate redis,
            @Value("${footballos.cache.contract-resource:league-summary.json}") String resource,
            @Value("${footballos.cache.ttl-seconds:60}") long ttlSeconds,
            @Value("${footballos.cache.ttl-jitter-seconds:24}") long jitterSeconds,
            @Value("${footballos.cache.origin-latency-ms:0}") long originLatencyMs) {
        this.redis = redis;
        this.resource = resource;
        this.ttlSeconds = ttlSeconds;
        this.jitterSeconds = jitterSeconds;
        this.originLatencyMs = originLatencyMs;
    }

    /** The Redis key the summary lives under — a namespaced, readable key, not a bare id. */
    public String key() {
        return "footballos:league:summary";
    }

    /** The BASE TTL the write-back jitters on top of; surfaced so the controller can mirror it. */
    public long ttlSeconds() {
        return ttlSeconds;
    }

    /** The origin read: the frozen contract from the classpath. The cache layer never re-derives it. */
    public String originJson() throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** This key's seeded write-back lifetime, within [ttlSeconds, ttlSeconds + jitterSeconds]. */
    public long jitteredTtlSeconds() {
        return CacheJitter.jitteredTtlSeconds(key(), System.currentTimeMillis() / 1000L,
                ttlSeconds, jitterSeconds, JITTER_SEED);
    }

    /** One cache-aside cycle with single-flight and TTL jitter. */
    public String readSummary() throws IOException {
        requests.incrementAndGet();
        String cached;
        try {
            cached = redis.opsForValue().get(key());
        } catch (Exception e) {
            // M1070: Redis unreachable — serve the origin directly; stats() reports redisUp=false.
            return originJson();
        }
        if (cached != null) {
            hits.incrementAndGet();
            return cached;
        }
        misses.incrementAndGet();

        // Single-flight: the first miss owns the origin load; concurrent siblings share its future.
        CompletableFuture<String> mine = new CompletableFuture<>();
        CompletableFuture<String> owner = inFlight.putIfAbsent(key(), mine);
        if (owner != null) {
            coalesced.incrementAndGet();
            long window = Math.max(COALESCE_FLOOR_MS, originLatencyMs * 4L);
            try {
                return owner.get(window, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                // The owner died or exceeded the window: degrade to our own origin read.
                return originJson();
            }
        }
        try {
            if (originLatencyMs > 0) Thread.sleep(originLatencyMs); // witness-injected slow origin
            String fresh = originJson();
            originLoads.incrementAndGet();
            try {
                redis.opsForValue().set(key(), fresh, Duration.ofSeconds(jitteredTtlSeconds()));
            } catch (Exception ignored) {
                // Write-through failed: the fresh origin is served this turn anyway.
            }
            mine.complete(fresh);
            return fresh;
        } catch (Exception e) {
            mine.completeExceptionally(e);
            if (e instanceof IOException) throw (IOException) e;
            throw new IOException("origin load failed for " + key(), e);
        } finally {
            inFlight.remove(key(), mine);
        }
    }

    /** The single-instance observability surface; a fleet would read these from Redis INFO/Micrometer. */
    public Map<String, Object> stats() {
        boolean redisUp = true;
        try (RedisConnection conn = redis.getConnectionFactory().getConnection()) {
            conn.ping();
        } catch (Exception e) {
            redisUp = false;
        }
        long h = hits.get(), m = misses.get();
        double rate = (h + m) == 0 ? 0.0 : (double) h / (h + m);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("requests", requests.get());
        out.put("hits", h);
        out.put("misses", m);
        out.put("hitRate", Math.round(rate * 1000.0) / 10.0);
        out.put("redisUp", redisUp);
        out.put("key", key());
        out.put("ttlSeconds", ttlSeconds);
        out.put("ttlJitterSeconds", jitterSeconds); // M1076 measured config
        out.put("originLoads", originLoads.get());  // M1076 measured: real origin reads
        out.put("coalesced", coalesced.get());      // M1076 measured: collapsed sibling misses
        return out;
    }

    /** Drop the cached entry so the next read is a miss — the manual half of invalidation. */
    public void evict() {
        try {
            redis.delete(key());
        } catch (Exception ignored) {
            // Next read re-populates; a failed evict is never a lie in either direction.
        }
    }
}
