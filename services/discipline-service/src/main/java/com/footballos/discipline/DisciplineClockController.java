package com.footballos.discipline;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The card clock for one competition, served from the same exported world — computed once by
 * scripts/export-service-contract.mjs and committed next to the clocks, never re-derived in
 * Java and never the live seed.
 *
 * The clocks resource name resolves the same way the league's two resources do: the optional
 * config import wins when the config server is running, and the committed filename is the
 * fallback, so a stand-alone boot keeps working. An unknown competition is a 404, not an
 * invented clock.
 *
 * The mapping is /discipline/clock, not /api/discipline/clock: the gateway's route strips
 * exactly one segment, so /api/discipline/clock/ucl arrives here as /discipline/clock/ucl.
 */
@RestController
@RequestMapping("/discipline/clock")
public class DisciplineClockController {

    private final Map<String, Object> doc;
    private final String clocksResource;

    @SuppressWarnings("unchecked")
    public DisciplineClockController(ObjectMapper mapper,
                                     @Value("${footballos.discipline.clocks-resource:discipline-clocks.json}") String clocksResource) throws IOException {
        this.clocksResource = clocksResource;
        try (InputStream in = new ClassPathResource(clocksResource).getInputStream()) {
            this.doc = mapper.readValue(in, new TypeReference<Map<String, Object>>() {
            });
        }
    }

    @GetMapping
    public Map<String, Object> list() {
        Map<String, Object> clocks = (Map<String, Object>) doc.get("clocks");
        return Map.of(
            "generatedBy", doc.get("generatedBy"),
            "dataset", doc.get("dataset"),
            "competitions", clocks == null ? Map.of() : clocks.keySet()
        );
    }

    @GetMapping("/{competitionId}")
    public Map<String, Object> clock(@PathVariable String competitionId) {
        Map<String, Object> clocks = (Map<String, Object>) doc.get("clocks");
        Object clock = clocks == null ? null : clocks.get(competitionId);
        if (clock == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no card clock for " + competitionId);
        }
        return (Map<String, Object>) clock;
    }
}
