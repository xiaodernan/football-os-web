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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The second read-through: the frozen league TABLES snapshot, cached as one whole resource the
 * same way the summary is. M1076 brings it to wire parity with the summary — the SAME single-flight
 * ledger and seeded TTL jitter — so the two read-throughs cannot silently diverge the way a lone
 * upgraded service would. Its counters stay separate from the summary's on purpose: /cache/league/
 * table/stats shows the table's census without polluting the summary's one.
 */
@Service
public class LeagueTablesCacheService {

    private static final String JITTER_SEED = "football-os";   // == CACHE_POLICY.seed in domain/cache.ts
    private static final long COALESCE_FLOOR_MS = 8000;

    private final StringRedisTemplate redis;
    private final String resource;
    private final long ttlSeconds;
    private final long jitterSeconds;
    private final long originLatencyMs;
    private final ObjectMapper mapper;

    private final ConcurrentHashMap<String, CompletableFuture<String>> inFlight = new ConcurrentHashMap<>();
    private final AtomicLong requests = new AtomicLong();
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();
    private final AtomicLong originLoads = new AtomicLong();
    private final AtomicLong coalesced = new AtomicLong();

    public LeagueTablesCacheService(
            StringRedisTemplate redis,
            ObjectMapper mapper,
            @Value("${footballos.cache.tables-resource:league-tables.json}") String resource,
            @Value("${footballos.cache.tables-ttl-seconds:60}") long ttlSeconds,
            @Value("${footballos.cache.ttl-jitter-seconds:24}") long jitterSeconds,
            @Value("${footballos.cache.origin-latency-ms:0}") long originLatencyMs) {
        this.redis = redis;
        this.mapper = mapper;
        this.resource = resource;
        this.ttlSeconds = ttlSeconds;
        this.jitterSeconds = jitterSeconds;
        this.originLatencyMs = originLatencyMs;
    }

    public String key() {
        return "footballos:league:tables";
    }

    public long ttlSeconds() {
        return ttlSeconds;
    }

    public String originJson() throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    public long jitteredTtlSeconds() {
        return CacheJitter.jitteredTtlSeconds(key(), System.currentTimeMillis() / 1000L,
                ttlSeconds, jitterSeconds, JITTER_SEED);
    }

    /** One cache-aside cycle with single-flight and TTL jitter (wire twin of the summary path). */
    public String readTablesJson() throws IOException {
        requests.incrementAndGet();
        String cached;
        try {
            cached = redis.opsForValue().get(key());
        } catch (Exception e) {
            return originJson();
        }
        if (cached != null) {
            hits.incrementAndGet();
            return cached;
        }
        misses.incrementAndGet();

        CompletableFuture<String> mine = new CompletableFuture<>();
        CompletableFuture<String> owner = inFlight.putIfAbsent(key(), mine);
        if (owner != null) {
            coalesced.incrementAndGet();
            long window = Math.max(COALESCE_FLOOR_MS, originLatencyMs * 4L);
            try {
                return owner.get(window, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                return originJson();
            }
        }
        try {
            if (originLatencyMs > 0) Thread.sleep(originLatencyMs);
            String fresh = originJson();
            originLoads.incrementAndGet();
            try {
                redis.opsForValue().set(key(), fresh, Duration.ofSeconds(jitteredTtlSeconds()));
            } catch (Exception ignored) {
                // Write-through failed: serve the fresh origin this turn anyway.
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

    /** The list view: generatedBy/dataset/leagues + the set of competitions that hold a frozen table. */
    public Map<String, Object> listJson() throws IOException {
        Map<String, Object> doc = mapper.readValue(readTablesJson(), new TypeReference<Map<String, Object>>() {
        });
        Map<String, Object> tables = (Map<String, Object>) doc.get("tables");
        return Map.of(
                "generatedBy", doc.get("generatedBy"),
                "dataset", doc.get("dataset"),
                "leagues", doc.get("leagues"),
                "competitions", tables == null ? Map.of() : tables.keySet());
    }

    /** One competition, or null so the controller can refuse with a 404 like the league service. */
    public Map<String, Object> table(String competitionId) throws IOException {
        Map<String, Object> doc = mapper.readValue(readTablesJson(), new TypeReference<Map<String, Object>>() {
        });
        Map<String, Object> tables = (Map<String, Object>) doc.get("tables");
        Object table = tables == null ? null : tables.get(competitionId);
        if (table == null) return null;
        return (Map<String, Object>) table;
    }

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
        out.put("ttlJitterSeconds", jitterSeconds);
        out.put("originLoads", originLoads.get());
        out.put("coalesced", coalesced.get());
        return out;
    }

    /** Drop the frozen tables key so the next read is a miss — the manual half of invalidation. */
    public void evict() {
        try {
            redis.delete(key());
        } catch (Exception ignored) {
            // Next read re-populates; a failed evict is never a lie in either direction.
        }
    }
}
