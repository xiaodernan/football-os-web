package com.footballos.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

/**
 * The config server: it hands each service the property tree another service or a human would
 * otherwise copy into code. The league service reads the resource name of its contract payload
 * from here by import, not by hard string — which is also the reason the controller still works
 * stand-alone (the import is optional and a sensible default sits beside it).
 */
@SpringBootApplication
@EnableConfigServer
public class ConfigApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigApplication.class, args);
    }
}
