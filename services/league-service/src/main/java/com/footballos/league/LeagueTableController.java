package com.footballos.league;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The read the summary contract cannot carry: the frozen table for one competition, served from
 * the same exported world — computed once by scripts/export-service-contract.mjs and committed
 * next to the counts, never re-derived in Java and never the live seed.
 *
 * The tables resource name resolves the same way the summary's does: the optional config import
 * wins when the config server is running, and the committed filename is the fallback, so a
 * stand-alone boot keeps working. A stale resource is a red proof, not a silent drift.
 *
 * The mapping is /league/table, not /api/league/table: the gateway's table route strips exactly
 * one segment, so /api/league/table/ucl arrives here as /league/table/ucl.
 *
 * Conditional GET (M1079): both reads answer with the validator of the WHOLE tables document, not
 * of the slice each one returns. That is exact, not sloppy. A validator only ever has to answer
 * "are the bytes you already hold for THIS Request-URI still the bytes I would send?", and both of
 * these bodies are pure projections of one immutable document — so the document digest moves if
 * and only if any projection under it moves. Two URIs carrying the same validator string is legal
 * (validators are scoped to the Request-URI, not to the server) and costs one hash per boot.
 * The 404 is settled BEFORE the validator is consulted: a competition this document does not carry
 * has never served a 200, so no client can legitimately hold a copy to be told is still fresh.
 */
@RestController
@RequestMapping("/league/table")
public class LeagueTableController {

    private final Map<String, Object> doc;
    private final String tablesResource;
    private final String etag;

    @SuppressWarnings("unchecked")
    public LeagueTableController(ObjectMapper mapper,
                                 @Value("${footballos.league.tables-resource:league-tables.json}") String tablesResource) throws IOException {
        this.tablesResource = tablesResource;
        this.etag = new ContractDigest(tablesResource).value();
        try (InputStream in = new ClassPathResource(tablesResource).getInputStream()) {
            this.doc = mapper.readValue(in, new TypeReference<Map<String, Object>>() {
            });
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(WebRequest request) {
        if (request.checkNotModified(etag)) {
            return null;
        }
        Map<String, Object> tables = (Map<String, Object>) doc.get("tables");
        return ResponseEntity.ok().eTag(etag).body(Map.of(
            "generatedBy", doc.get("generatedBy"),
            "dataset", doc.get("dataset"),
            "leagues", doc.get("leagues"),
            "competitions", tables == null ? Map.of() : tables.keySet()
        ));
    }

    @GetMapping("/{competitionId}")
    public ResponseEntity<Map<String, Object>> table(@PathVariable String competitionId, WebRequest request) {
        Map<String, Object> tables = (Map<String, Object>) doc.get("tables");
        Object table = tables == null ? null : tables.get(competitionId);
        if (table == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no frozen table for competition " + competitionId);
        }
        if (request.checkNotModified(etag)) {
            return null;
        }
        return ResponseEntity.ok().eTag(etag).body((Map<String, Object>) table);
    }
}
