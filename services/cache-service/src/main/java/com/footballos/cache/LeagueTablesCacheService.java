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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The second read-through: the frozen league TABLES snapshot, cached as one whole resource the
 * same way the summary is. The working set is still one key, so Redis's own TTL is the expiry
 * policy; a dead Redis degrades to a direct origin read and the stats say so.
 *
 * The counters are separate from the summary's on purpose: /cache/league/table/stats shows the
 * table's census without polluting the summary's one, and the summary's stats stay exactly what
 * the previous witness asserted — this class never touches them.
 */
@Service
public class LeagueTablesCacheService {

    private final StringRedisTemplate redis;
    private final String resource;
    private final long ttlSeconds;
    private final ObjectMapper mapper;

    private volatile long requests = 0;
    private volatile long hits = 0;
    private volatile long misses = 0;

    public LeagueTablesCacheService(
            StringRedisTemplate redis,
            ObjectMapper mapper,
            @Value("${footballos.cache.tables-resource:league-tables.json}") String resource,
            @Value("${footballos.cache.tables-ttl-seconds:60}") long ttlSeconds) {
        this.redis = redis;
        this.mapper = mapper;
        this.resource = resource;
        this.ttlSeconds = ttlSeconds;
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

    public String readTablesJson() throws IOException {
        requests++;
        try {
            String cached = redis.opsForValue().get(key());
            if (cached != null) { hits++; return cached; }
            misses++;
            String fresh = originJson();
            try {
                redis.opsForValue().set(key(), fresh, Duration.ofSeconds(ttlSeconds));
            } catch (Exception ignored) {
                // Write-through failed: the fresh origin is served this turn anyway.
            }
            return fresh;
        } catch (Exception e) {
            return originJson();
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

    /** Drop the frozen tables key so the next read is a miss — the manual half of invalidation. */
    public void evict() {
        try {
            redis.delete(key());
        } catch (Exception ignored) {
            // Next read re-populates; a failed evict is never a lie in either direction.
        }
    }
}
