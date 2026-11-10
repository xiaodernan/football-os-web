package com.footballos.league;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
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
 * The resource NAME is read from the config server when one is running (import is optional),
 * falling back to the committed filename — so the only hardcoded string is a
 * defensive default, not a source of truth. The SPA still does not call this endpoint.
 *
 * The mapping is /league, not /api/league: the gateway's route strips exactly one segment, so a
 * gateway call to /api/league/summary arrives here as /league/summary. The direct path is this
 * controller's own concern and is not printed anywhere in the web app.
 */
@RestController
@RequestMapping("/league")
public class LeagueSummaryController {

    private final Map<String, Object> summary;
    private final String contractResource;

    public LeagueSummaryController(ObjectMapper mapper,
                                   @Value("${footballos.league.contract-resource:league-summary.json}") String contractResource) throws IOException {
        this.contractResource = contractResource;
        try (InputStream contract = new ClassPathResource(contractResource).getInputStream()) {
            this.summary = mapper.readValue(contract, new TypeReference<Map<String, Object>>() {
            });
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return summary;
    }
}
