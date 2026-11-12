package com.footballos.cache;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The seconds read-through, exposed. The gateway strips one segment, so
 * /api/cache/league/table arrives here as /cache/league/table. The list view mirrors the league
 * service's /league/table byte for byte on the hit path AND the miss path; /table/{comp} is the
 * same contract, 404 for an unknown competition. /table/stats is the observability surface and
 * /table/evict drops the frozen tables key.
 */
@RestController
@RequestMapping("/cache/league/table")
public class LeagueTablesController {

    private final LeagueTablesCacheService service;

    public LeagueTablesController(LeagueTablesCacheService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list() {
        try {
            return ResponseEntity.ok().body(service.listJson());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "cache tables read failed: " + e.getMessage());
        }
    }

    @GetMapping("/{competitionId}")
    public ResponseEntity<Map<String, Object>> table(@PathVariable String competitionId) {
        try {
            Map<String, Object> table = service.table(competitionId);
            if (table == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "no frozen table for competition " + competitionId);
            }
            return ResponseEntity.ok().body(table);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "cache table read failed: " + e.getMessage());
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
