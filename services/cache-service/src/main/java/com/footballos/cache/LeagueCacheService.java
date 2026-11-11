package com.footballos.cache;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * The cache-aside engine. It owns three counters the /cache/stats endpoint and the proof read:
 * how many requests arrived, how many were served from Redis, and how many fell through to the
 * origin. The counters are plain volatile longs — the demo is single-instance, so there is no
 * concurrency contract to honour here, and a real deployment would read these from Redis's own
 * INFO or a Micrometer meter rather than local memory.
 *
 * The origin read is the same frozen contract the league service serves, loaded from the classpath.
 * Nothing here touches the live seed; the cache sits in front of a snapshot, exactly as the gateway
 * sits in front of the league service.
 */
@Service
public class LeagueCacheService {

    private final StringRedisTemplate redis;
    private final String resource;
    private final long ttlSeconds;

    private volatile long requests = 0;
    private volatile long hits = 0;
    private volatile long misses = 0;

    public LeagueCacheService(
            StringRedisTemplate redis,
            @Value("${footballos.cache.contract-resource:league-summary.json}") String resource,
            @Value("${footballos.cache.ttl-seconds:60}") long ttlSeconds) {
        this.redis = redis;
        this.resource = resource;
        this.ttlSeconds = ttlSeconds;
    }

    /** The Redis key the summary lives under — a namespaced, readable key, not a bare id. */
    public String key() {
        return "footballos:league:summary";
    }

    /** The TTL the write-back applies, surfaced so the controller can mirror it on the response. */
    public long ttlSeconds() {
        return ttlSeconds;
    }

    /** The origin read: the frozen contract from the classpath. The cache layer never re-derives it. */
    public String originJson() throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** One cache-aside cycle. On a hit the origin is untouched; on a miss the origin is read once
     *  and written back with a TTL. A dead Redis degrades to a direct origin read so the endpoint
     *  still answers — the stats carry the redis state so the caller is never lied to. */
    public String readSummary() throws IOException {
        requests++;
        try {
            String cached = redis.opsForValue().get(key());
            if (cached != null) {
                hits++;
                return cached;
            }
            misses++;
            String fresh = originJson();
            try {
                redis.opsForValue().set(key(), fresh, Duration.ofSeconds(ttlSeconds));
            } catch (Exception ignored) {
                // Write-through failed: the read still returns the fresh origin this turn.
            }
            return fresh;
        } catch (Exception e) {
            // Redis unreachable: serve the origin directly and report redisUp=false via stats.
            return originJson();
        }
    }

    /** A bounded, hand-rolled LRU would expire the least-recently-read key when the working set
     *  outgrows the budget; here the working set is one key, so Redis's own TTL is the expiry
     *  policy and this map is only the observability surface the stats endpoint returns. */
    public Map<String, Object> stats() {
        boolean redisUp = true;
        try (RedisConnection conn = redis.getConnectionFactory().getConnection()) {
            conn.ping();
        } catch (Exception e) {
            redisUp = false;
        }
        double rate = (hits + misses) == 0 ? 0.0 : (double) hits / (hits + misses);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("requests", requests);
        out.put("hits", hits);
        out.put("misses", misses);
        out.put("hitRate", Math.round(rate * 1000.0) / 10.0);
        out.put("redisUp", redisUp);
        out.put("key", key());
        out.put("ttlSeconds", ttlSeconds);
        return out;
    }

    /** Drop the cached entry so the next read is a miss — the manual half of cache invalidation. */
    public void evict() {
        try {
            redis.delete(key());
        } catch (Exception ignored) {
            // A failed evict is logged nowhere on purpose: the next read will simply re-populate.
        }
    }
}
