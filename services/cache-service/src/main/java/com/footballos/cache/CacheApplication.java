package com.footballos.cache;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The cache tier. It is a read-through / cache-aside layer in front of the same frozen league
 * contract the league service serves: the first request for the summary is a Redis miss, the
 * origin (the classpath resource) is read once and written back with a TTL, and every later
 * request is a Redis hit the origin never sees. Spring Data Redis talks RESP to Redis over a
 * netty connection managed by Lettuce; this class just boots the context.
 */
@SpringBootApplication
public class CacheApplication {

    public static void main(String[] args) {
        SpringApplication.run(CacheApplication.class, args);
    }
}
