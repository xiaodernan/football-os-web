package com.footballos.messaging;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** M1059: the Spring Cloud Stream messaging service — the broker-facing half of the reliable
 *  delivery pipeline. Its semantics (retry, dead-letter, partition key, backpressure) are the
 *  wire twin of the pure fold in domain/queue.ts; scripts/proof-services.mjs reads both and
 *  refuses a drift. Nothing in the SPA calls it: PLATFORM_LIVE is false. */
@SpringBootApplication
public class MessagingApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessagingApplication.class, args);
    }
}
