package com.tcs.pranay.clawsentinel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ClawSentinelSimulatorApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClawSentinelSimulatorApplication.class, args);
        System.out.println("\n======================================================");
        System.out.println("  ClawSentinel Simulator  |  com.tcs.pranay");
        System.out.println("  Dashboard  →  http://localhost:8080");
        System.out.println("  Simulator  →  http://localhost:8080/simulator.html");
        System.out.println("  API        →  http://localhost:8080/api/assets");
        System.out.println("======================================================\n");
    }
}
