package com.footballos.discipline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * The discipline service: one more read-only frozen-snapshot reader, same discipline as the
 * league service — a committed resource computed once by the exporter, never the live seed.
 */
@SpringBootApplication
@EnableDiscoveryClient
public class DisciplineApplication {
    public static void main(String[] args) {
        SpringApplication.run(DisciplineApplication.class, args);
    }
}
