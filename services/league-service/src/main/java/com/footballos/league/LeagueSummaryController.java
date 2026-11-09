package com.footballos.league;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The skeleton's one read. It answers a labelled skeleton, not the seeded world the SPA
 * renders: no fixture data is copied into Java, so this payload cannot silently drift from
 * the TypeScript dataset. The SPA does not call it — the atlas screen says so.
 */
@RestController
@RequestMapping("/api/league")
public class LeagueSummaryController {

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
            "service", "league-service",
            "status", "skeleton",
            "wired", false,
            "datasets", List.of(),
            "note", "The seeded world lives in TypeScript; this endpoint is a labelled skeleton."
        );
    }
}
