package com.footballos.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The browser's single door. It matches a path predicate, strips the leading segment and
 * forwards to a service resolved by name through the registry — the routes live in
 * application.yml, and domain/platform.ts mirrors them for the SPA's atlas screen.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
