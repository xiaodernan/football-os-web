package com.footballos.league;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The skeleton's one read. The payload is not hand-written: it is the frozen snapshot that
 * scripts/export-service-contract.mjs writes from the TypeScript world (counts plus a digest over
 * those counts), copied onto the classpath. A stale resource is a red proof, not a silent drift.
 * The SPA still does not call this endpoint — the atlas screen says so.
 */
@RestController
@RequestMapping("/api/league")
public class LeagueSummaryController {

    private final Map<String, Object> summary;

    public LeagueSummaryController(ObjectMapper mapper) throws IOException {
        try (InputStream contract = new ClassPathResource("league-summary.json").getInputStream()) {
            this.summary = mapper.readValue(contract, new TypeReference<Map<String, Object>>() {
            });
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return summary;
    }
}
