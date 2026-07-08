package com.tcs.pranay.clawsentinel.model;

import java.util.List;

/**
 * Node — the core domain model representing a datacenter asset.
 * Extended from the original Node.java to include all fields
 * needed by the ClawSentinel frontend (health, risk, CVE list,
 * workload details, hardware info, risk contribution breakdown, timeline).
 */
public class Node {

    // ── Identity ─────────────────────────────────────────────────────────
    public String id;
    public String hostname;
    public String name;
    public String type;
    public String zone;
    public String status;       // RUNNING | UP | DOWN
    public String health;       // HEALTHY | DEGRADED | WARNING
    public String ipAddress;
    public String desc;
    public String rack;
    public String os;
    public String lastSeen;
    public String owner;
    public String env;
    public String blastRadius;

    // ── Risk ─────────────────────────────────────────────────────────────
    public double risk;          // 0.0 – 10.0 composite risk score
    public String criticality;   // HIGH | MEDIUM | LOW

    // ── Nested objects ────────────────────────────────────────────────────
    public Security security;
    public BusinessContext businessContext;
    public Workload workload;
    public Exposure exposure;
    public Hardware hardware;

    // ── CVE / Risk contribution / Timeline ───────────────────────────────
    public List<CveEntry> cves;
    public List<RiskContribution> riskContribution;
    public String actionBadge;
    public String actionText;
    public List<TimelineEntry> timeline;

    // ── Nested classes ────────────────────────────────────────────────────

    public static class Security {
        public String cveId;
        public Double cveScore;
        public Boolean exploitAvailable;
        public PatchStatus patchStatus;
    }

    public static class PatchStatus {
        public String state;
    }

    public static class BusinessContext {
        public String criticality;
    }

    public static class Workload {
        public String type;
        public String state;
        public String name;
        public String model;
        public int util;
        public String mem;
        public String jobId;
    }

    public static class Exposure {
        public Boolean internetReachable;
        public Boolean managementInterfaceExposed;
    }

    public static class Hardware {
        public String gpuModel;
        public String gpuDriver;
        public String cpuMem;
        public String storage;
        public String power;
        public String temp;
    }

    public static class CveEntry {
        public String name;
        public double score;
        public String severity;

        public CveEntry() {}
        public CveEntry(String name, double score, String severity) {
            this.name = name; this.score = score; this.severity = severity;
        }
    }

    public static class RiskContribution {
        public String name;
        public int pct;
        public double score;
        public String color;

        public RiskContribution() {}
        public RiskContribution(String name, int pct, double score, String color) {
            this.name = name; this.pct = pct; this.score = score; this.color = color;
        }
    }

    public static class TimelineEntry {
        // "class" is a Java reserved word — we use cssClass internally;
        // Jackson serializes it as "class" via getter name convention below.
        public String time;
        public String title;
        public String desc;
        private String cssClass;

        public TimelineEntry() {}
        public TimelineEntry(String time, String title, String desc, String cssClass) {
            this.time = time; this.title = title; this.desc = desc; this.cssClass = cssClass;
        }

        @com.fasterxml.jackson.annotation.JsonProperty("class")
        public String getCssClass() { return cssClass; }

        @com.fasterxml.jackson.annotation.JsonProperty("class")
        public void setCssClass(String cssClass) { this.cssClass = cssClass; }
    }
}
