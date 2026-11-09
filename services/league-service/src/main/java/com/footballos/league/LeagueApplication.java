package com.footballos.league;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The one domain service in the skeleton: a read-only league summary behind the gateway.
 * It registers under {@code league-service}, which is the name the gateway's route resolves.
 */
@SpringBootApplication
public class LeagueApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeagueApplication.class, args);
    }
}
