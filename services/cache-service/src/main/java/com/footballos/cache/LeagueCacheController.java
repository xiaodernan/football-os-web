package com.footballos.cache;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The cache's edge. The gateway strips exactly one segment, so /api/cache/league/summary arrives
 * here as /cache/league/summary. GET serves the contract through the cache-aside engine; GET
 * /stats reports the hit/miss census and whether Redis is reachable; POST /evict clears the entry.
 *
 * The response body is the contract JSON on both the hit and the miss path — the cache is invisible
 * to a caller that only wants data, and observable only to one that asks the stats endpoint.
 */
@RestController
@RequestMapping("/cache/league")
public class LeagueCacheController {

    private final LeagueCacheService service;

    public LeagueCacheController(LeagueCacheService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<String> summary() {
        try {
            String json = service.readSummary();
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .header("Cache-Control", "public, max-age=" + service.ttlSeconds())
                    .body(json);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "cache read failed: " + e.getMessage());
        }
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return service.stats();
    }

    @PostMapping("/evict")
    public Map<String, Object> evict() {
        service.evict();
        return service.stats();
    }
}
