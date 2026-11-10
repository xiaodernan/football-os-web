package com.footballos.gateway;

import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

/**
 * What the gateway serves when the circuit for the league service opens: a small, honest 503.
 * The demo world does not pretend the league is reachable while its service is down — the canned
 * body names the fault the SPA would surface one day.
 */
@Configuration
public class FallbackRouter {

    @Bean
    RouterFunction<ServerResponse> fallbackFunction() {
        return route(GET("/fallback"), request ->
            ServerResponse
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                    "status", "SERVICE_UNAVAILABLE",
                    "error", "league-service is quiet and the gateway circuit is open",
                    "detail", "no hung call will be made to the dead service while this body stands"
                )));
    }
}
