package com.tcs.pranay.clawsentinel.service;

import com.tcs.pranay.clawsentinel.model.Node;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * InventoryService — in-memory store for all 20 datacenter nodes.
 *
 * Extended from the original to:
 *  1. Hold fully-populated Node objects (all 20 assets, not dummy stubs)
 *  2. Support PATCH updates to any node field
 *  3. Broadcast SSE events to all connected browser clients on change
 */
@Service
public class InventoryService {

    private final List<Node> nodes = new ArrayList<>();

    // Thread-safe list of active SSE emitters (one per open browser tab)
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public InventoryService() {
        initNodes();
    }

    // ── Public API ─────────────────────────────────────────────────────────

    public List<Node> getAllNodes() {
        // Return sorted by risk score descending
        return nodes.stream()
                .sorted((a, b) -> Double.compare(b.risk, a.risk))
                .toList();
    }

    public Node getNodeById(String id) {
        return nodes.stream()
                .filter(n -> n.id.equals(id))
                .findFirst()
                .orElse(null);
    }

    /**
     * Apply a partial update (PATCH) to a node.
     * Supported fields: health, risk, criticality, status,
     *                   actionBadge, actionText, lastSeen,
     *                   workload.util, workload.mem, workload.state,
     *                   hardware.temp, hardware.power
     *
     * After updating, broadcasts an SSE event to all connected clients
     * so the ClawSentinel frontend refreshes without a page reload.
     */
    @SuppressWarnings("unchecked")
    public Node patchNode(String id, Map<String, Object> fields) {
        Node node = getNodeById(id);
        if (node == null) return null;

        fields.forEach((key, value) -> {
            switch (key) {
                case "health"       -> node.health = str(value);
                case "risk"         -> {
                    node.risk = num(value);
                    // Auto-recalculate criticality from risk unless explicitly provided
                    if (!fields.containsKey("criticality")) {
                        node.criticality = node.risk >= 7.0 ? "HIGH"
                                         : node.risk >= 4.0 ? "MEDIUM" : "LOW";
                    }
                    // Auto-recalculate actionBadge from risk unless explicitly provided
                    if (!fields.containsKey("actionBadge")) {
                        node.actionBadge = node.risk >= 9.0 ? "IMMEDIATE"
                                         : node.risk >= 7.0 ? "HIGH PRIORITY"
                                         : node.risk >= 4.0 ? "MEDIUM PRIORITY" : "LOW PRIORITY";
                    }
                }
                case "criticality"  -> node.criticality = str(value);
                case "status"       -> node.status = str(value);
                case "actionBadge"  -> node.actionBadge = str(value);
                case "actionText"   -> node.actionText = str(value);
                case "lastSeen"     -> node.lastSeen = str(value);
                case "workload"     -> {
                    if (node.workload == null) node.workload = new Node.Workload();
                    Map<String, Object> wl = (Map<String, Object>) value;
                    if (wl.containsKey("util"))  node.workload.util  = (int) num(wl.get("util"));
                    if (wl.containsKey("mem"))   node.workload.mem   = str(wl.get("mem"));
                    if (wl.containsKey("state")) node.workload.state = str(wl.get("state"));
                    if (wl.containsKey("name"))  node.workload.name  = str(wl.get("name"));
                }
                case "hardware"     -> {
                    if (node.hardware == null) node.hardware = new Node.Hardware();
                    Map<String, Object> hw = (Map<String, Object>) value;
                    if (hw.containsKey("temp"))  node.hardware.temp  = str(hw.get("temp"));
                    if (hw.containsKey("power")) node.hardware.power = str(hw.get("power"));
                }
            }
        });

        broadcastNodeUpdate(node);
        return node;
    }

    // ── SSE Emitter Management ─────────────────────────────────────────────

    public SseEmitter addEmitter() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    private void broadcastNodeUpdate(Node node) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("node-updated").data(node));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private String str(Object v) { return v == null ? "" : v.toString(); }
    private double num(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0; }
    }

    private Node.CveEntry cve(String name, double score, String severity) {
        return new Node.CveEntry(name, score, severity);
    }
    private Node.RiskContribution rc(String name, int pct, double score, String color) {
        return new Node.RiskContribution(name, pct, score, color);
    }
    private Node.TimelineEntry tl(String time, String title, String desc, String css) {
        return new Node.TimelineEntry(time, title, desc, css);
    }

    // ── Data Initialization — All 20 Nodes ────────────────────────────────

    private void initNodes() {

        // ── 1. GPU-DCE-001 ───────────────────────────────────────────────
        Node n1 = new Node();
        n1.id = "GPU-DCE-001"; n1.name = "GPU-DCE-001"; n1.hostname = "GPU-DCE-001";
        n1.type = "GPU Server"; n1.zone = "Zone-A";
        n1.health = "DEGRADED"; n1.risk = 10.0; n1.criticality = "HIGH";
        n1.status = "RUNNING"; n1.ipAddress = "10.10.10.21";
        n1.desc = "GPU Server · NVIDIA H100 · S/N: G100-AX12F8";
        n1.rack = "Zone-A / Rack-12"; n1.os = "Ubuntu 22.04 LTS";
        n1.lastSeen = "22 May 2025, 10:24:30";
        n1.owner = "AI Platform Team"; n1.env = "Production"; n1.blastRadius = "High";
        n1.security = new Node.Security();
        n1.security.cveId = "CVE-2026-1001"; n1.security.cveScore = 9.1;
        n1.security.exploitAvailable = true;
        n1.businessContext = new Node.BusinessContext(); n1.businessContext.criticality = "HIGH";
        n1.workload = new Node.Workload();
        n1.workload.type = "AI Training"; n1.workload.name = "AI Training";
        n1.workload.model = "LLM Training (v2.3)"; n1.workload.state = "Active";
        n1.workload.util = 92; n1.workload.mem = "78% (624 GB / 800 GB)";
        n1.workload.jobId = "job-7f9a3c8d";
        n1.exposure = new Node.Exposure();
        n1.exposure.internetReachable = false; n1.exposure.managementInterfaceExposed = false;
        n1.hardware = new Node.Hardware();
        n1.hardware.gpuModel = "NVIDIA H100 SXM5"; n1.hardware.gpuDriver = "535.104.05";
        n1.hardware.cpuMem = "64 vCPU / 512 GB"; n1.hardware.storage = "7.6 TB NVMe";
        n1.hardware.power = "680 W"; n1.hardware.temp = "72 °C";
        n1.cves = List.of(
            cve("CVE-2026-1001", 9.1, "Critical"), cve("CVE-2026-1423", 9.0, "Critical"),
            cve("CVE-2026-0456", 8.5, "High"), cve("CVE-2026-9988", 7.8, "High"),
            cve("CVE-2026-1122", 6.5, "Medium")
        );
        n1.riskContribution = List.of(
            rc("Vulnerabilities", 45, 4.5, "#ef4444"), rc("Exposure", 25, 2.5, "#f97316"),
            rc("Workload", 15, 1.5, "#3b82f6"), rc("Health", 10, 1.0, "#10b981"),
            rc("Network", 5, 0.5, "#22d3ee")
        );
        n1.actionBadge = "IMMEDIATE";
        n1.actionText = "Isolate this asset and apply security patches.";
        n1.timeline = List.of(
            tl("22 May 2025, 10:24:30", "Degraded Health Detected", "GPU temperature exceeded limit (72°C)", "critical"),
            tl("22 May 2025, 09:15:10", "New Critical CVE Identified", "CVE-2026-1001 (score 9.1) flagged by auto scanner", "critical"),
            tl("20 May 2025, 11:42:00", "Workload Started", "Job job-7f9a3c8d (LLM Training v2.3) initialized", "info")
        );
        nodes.add(n1);

        // ── 2. GPU-DCE-002 ───────────────────────────────────────────────
        Node n2 = new Node();
        n2.id = "GPU-DCE-002"; n2.name = "GPU-DCE-002"; n2.hostname = "GPU-DCE-002";
        n2.type = "GPU Server"; n2.zone = "Zone-A";
        n2.health = "HEALTHY"; n2.risk = 9.7; n2.criticality = "HIGH";
        n2.status = "RUNNING"; n2.ipAddress = "10.10.10.22";
        n2.desc = "GPU Server · NVIDIA H100 · S/N: G100-AX12F9";
        n2.rack = "Zone-A / Rack-13"; n2.os = "Ubuntu 22.04 LTS";
        n2.lastSeen = "22 May 2025, 10:24:12";
        n2.owner = "AI Platform Team"; n2.env = "Production"; n2.blastRadius = "High";
        n2.security = new Node.Security();
        n2.security.cveId = "CVE-2026-1001"; n2.security.cveScore = 9.1;
        n2.security.exploitAvailable = false;
        n2.businessContext = new Node.BusinessContext(); n2.businessContext.criticality = "HIGH";
        n2.workload = new Node.Workload();
        n2.workload.type = "AI Inference"; n2.workload.name = "AI Inference";
        n2.workload.model = "Speech-to-Text (v1.8)"; n2.workload.state = "Active";
        n2.workload.util = 84; n2.workload.mem = "68% (544 GB / 800 GB)";
        n2.workload.jobId = "job-8c2d9a4f";
        n2.exposure = new Node.Exposure();
        n2.exposure.internetReachable = false; n2.exposure.managementInterfaceExposed = false;
        n2.hardware = new Node.Hardware();
        n2.hardware.gpuModel = "NVIDIA H100 SXM5"; n2.hardware.gpuDriver = "535.104.05";
        n2.hardware.cpuMem = "64 vCPU / 512 GB"; n2.hardware.storage = "7.6 TB NVMe";
        n2.hardware.power = "520 W"; n2.hardware.temp = "61 °C";
        n2.cves = List.of(
            cve("CVE-2026-1001", 9.1, "Critical"), cve("CVE-2026-0812", 8.8, "High"),
            cve("CVE-2026-1499", 7.2, "High")
        );
        n2.riskContribution = List.of(
            rc("Vulnerabilities", 60, 5.82, "#ef4444"), rc("Exposure", 20, 1.94, "#f97316"),
            rc("Workload", 10, 0.97, "#3b82f6"), rc("Health", 5, 0.49, "#10b981"),
            rc("Network", 5, 0.48, "#22d3ee")
        );
        n2.actionBadge = "HIGH PRIORITY";
        n2.actionText = "Schedule kernel updates and security patch routine.";
        n2.timeline = List.of(
            tl("22 May 2025, 10:24:12", "Asset Status Active", "Reported running with 84% utilization", "info"),
            tl("21 May 2025, 08:30:15", "Vulnerability Scan Complete", "3 vulnerabilities found, 1 critical", "warning")
        );
        nodes.add(n2);

        // ── 3. CPU-DCE-001 ───────────────────────────────────────────────
        Node n3 = new Node();
        n3.id = "CPU-DCE-001"; n3.name = "CPU-DCE-001"; n3.hostname = "CPU-DCE-001";
        n3.type = "CPU Server"; n3.zone = "Zone-B";
        n3.health = "HEALTHY"; n3.risk = 9.2; n3.criticality = "HIGH";
        n3.status = "RUNNING"; n3.ipAddress = "10.10.20.11";
        n3.desc = "CPU Server · AMD EPYC 9654 · S/N: E9654-B101";
        n3.rack = "Zone-B / Rack-04"; n3.os = "RHEL 9.2";
        n3.lastSeen = "22 May 2025, 10:22:45";
        n3.owner = "Infrastructure Team"; n3.env = "Production"; n3.blastRadius = "Medium";
        n3.security = new Node.Security();
        n3.security.cveId = "CVE-2026-1144"; n3.security.cveScore = 8.9;
        n3.security.exploitAvailable = false;
        n3.businessContext = new Node.BusinessContext(); n3.businessContext.criticality = "HIGH";
        n3.workload = new Node.Workload();
        n3.workload.type = "Data Processing"; n3.workload.name = "DB Cluster Node";
        n3.workload.model = "PostgreSQL Master"; n3.workload.state = "Active";
        n3.workload.util = 67; n3.workload.mem = "45% (115 GB / 256 GB)";
        n3.workload.jobId = "job-db990a1b";
        n3.exposure = new Node.Exposure();
        n3.exposure.internetReachable = false; n3.exposure.managementInterfaceExposed = false;
        n3.hardware = new Node.Hardware();
        n3.hardware.gpuModel = "N/A"; n3.hardware.gpuDriver = "N/A";
        n3.hardware.cpuMem = "96 vCPU / 256 GB"; n3.hardware.storage = "15.2 TB NVMe";
        n3.hardware.power = "320 W"; n3.hardware.temp = "48 °C";
        n3.cves = List.of(cve("CVE-2026-1144", 8.9, "High"), cve("CVE-2026-2211", 8.1, "High"));
        n3.riskContribution = List.of(
            rc("Vulnerabilities", 55, 5.06, "#ef4444"), rc("Exposure", 30, 2.76, "#f97316"),
            rc("Workload", 10, 0.92, "#3b82f6"), rc("Health", 3, 0.28, "#10b981"),
            rc("Network", 2, 0.18, "#22d3ee")
        );
        n3.actionBadge = "HIGH PRIORITY";
        n3.actionText = "Apply immediate firewall policy update and block external port 5432.";
        n3.timeline = List.of(
            tl("22 May 2025, 10:22:45", "DB Replication Synced", "Secondary nodes fully synced", "info")
        );
        nodes.add(n3);

        // ── 4. LEAF-DCE-001 ──────────────────────────────────────────────
        Node n4 = new Node();
        n4.id = "LEAF-DCE-001"; n4.name = "LEAF-DCE-001"; n4.hostname = "LEAF-DCE-001";
        n4.type = "Leaf Switch"; n4.zone = "Zone-A";
        n4.health = "WARNING"; n4.risk = 7.6; n4.criticality = "MEDIUM";
        n4.status = "UP"; n4.ipAddress = "10.10.10.101";
        n4.desc = "Leaf Switch · Cisco Nexus 9300 · S/N: C9300-L88";
        n4.rack = "Zone-A / Rack-01 (Top)"; n4.os = "NX-OS 10.2";
        n4.lastSeen = "22 May 2025, 10:23:59";
        n4.owner = "Network Admin Team"; n4.env = "Infrastructure"; n4.blastRadius = "Medium";
        n4.security = new Node.Security();
        n4.security.cveId = "CVE-2026-4402"; n4.security.cveScore = 7.6;
        n4.security.exploitAvailable = false;
        n4.businessContext = new Node.BusinessContext(); n4.businessContext.criticality = "MEDIUM";
        n4.workload = new Node.Workload();
        n4.workload.type = "Network"; n4.workload.name = "Top-of-Rack Switch";
        n4.workload.model = "Cisco NX-OS Core routing"; n4.workload.state = "Active";
        n4.workload.util = 41; n4.workload.mem = "35% (11 GB / 32 GB)";
        n4.workload.jobId = "net-leaf-101";
        n4.exposure = new Node.Exposure();
        n4.exposure.internetReachable = false; n4.exposure.managementInterfaceExposed = false;
        n4.hardware = new Node.Hardware();
        n4.hardware.gpuModel = "N/A"; n4.hardware.gpuDriver = "N/A";
        n4.hardware.cpuMem = "8 vCPU / 32 GB"; n4.hardware.storage = "128 GB Flash";
        n4.hardware.power = "180 W"; n4.hardware.temp = "56 °C";
        n4.cves = List.of(cve("CVE-2026-4402", 7.6, "High"));
        n4.riskContribution = List.of(
            rc("Vulnerabilities", 40, 3.04, "#ef4444"), rc("Exposure", 45, 3.42, "#f97316"),
            rc("Workload", 5, 0.38, "#3b82f6"), rc("Health", 5, 0.38, "#10b981"),
            rc("Network", 5, 0.38, "#22d3ee")
        );
        n4.actionBadge = "MEDIUM PRIORITY";
        n4.actionText = "Upgrade switch IOS firmware to release 10.2(4b) to patch route leak.";
        n4.timeline = List.of(
            tl("22 May 2025, 10:10:12", "Route flapping alert", "Detected flap on port eth1/12, auto-remediated", "warning")
        );
        nodes.add(n4);

        // ── 5. STORAGE-DCE-001 ───────────────────────────────────────────
        Node n5 = new Node();
        n5.id = "STORAGE-DCE-001"; n5.name = "STORAGE-DCE-001"; n5.hostname = "STORAGE-DCE-001";
        n5.type = "Storage System"; n5.zone = "Zone-C";
        n5.health = "HEALTHY"; n5.risk = 6.8; n5.criticality = "MEDIUM";
        n5.status = "UP"; n5.ipAddress = "10.10.30.51";
        n5.desc = "Storage System · NetApp AFF A800 · S/N: NA-AFF800-41";
        n5.rack = "Zone-C / Rack-08"; n5.os = "ONTAP 9.12";
        n5.lastSeen = "22 May 2025, 10:24:20";
        n5.owner = "Storage Management Team"; n5.env = "Production"; n5.blastRadius = "Medium";
        n5.security = new Node.Security();
        n5.security.cveId = "CVE-2026-9011"; n5.security.cveScore = 6.8;
        n5.security.exploitAvailable = false;
        n5.businessContext = new Node.BusinessContext(); n5.businessContext.criticality = "MEDIUM";
        n5.workload = new Node.Workload();
        n5.workload.type = "Storage"; n5.workload.name = "Distributed Storage Pool";
        n5.workload.model = "Ceph Block storage"; n5.workload.state = "Active";
        n5.workload.util = 72; n5.workload.mem = "80% (204 GB / 256 GB)";
        n5.workload.jobId = "storage-ceph-pool-a";
        n5.exposure = new Node.Exposure();
        n5.exposure.internetReachable = false; n5.exposure.managementInterfaceExposed = false;
        n5.hardware = new Node.Hardware();
        n5.hardware.gpuModel = "N/A"; n5.hardware.gpuDriver = "N/A";
        n5.hardware.cpuMem = "32 vCPU / 256 GB"; n5.hardware.storage = "1.2 PB NVMe-oF";
        n5.hardware.power = "420 W"; n5.hardware.temp = "41 °C";
        n5.cves = List.of(cve("CVE-2026-9011", 6.8, "Medium"));
        n5.riskContribution = List.of(
            rc("Vulnerabilities", 30, 2.04, "#ef4444"), rc("Exposure", 50, 3.40, "#f97316"),
            rc("Workload", 10, 0.68, "#3b82f6"), rc("Health", 5, 0.34, "#10b981"),
            rc("Network", 5, 0.34, "#22d3ee")
        );
        n5.actionBadge = "MEDIUM PRIORITY";
        n5.actionText = "Schedule volume maintenance check and restrict block storage access lists.";
        n5.timeline = List.of(
            tl("22 May 2025, 10:24:20", "Storage pool check complete", "0 bad blocks detected", "info")
        );
        nodes.add(n5);

        // ── 6–20: Lower-risk nodes ────────────────────────────────────────
        addLowRiskNode("GPU-DCE-003",    "GPU Server",    "Zone-B", 3.6,  "RUNNING", "10.10.20.21", "NLP Inference",          "Translator Pro (v3.1)",             51, "38% (304 GB / 800 GB)", "job-9a1b2c3d", "NVIDIA H100 SXM5", "535.104.05", "64 vCPU / 512 GB", "7.6 TB NVMe", "390 W", "54 °C");
        addLowRiskNode("CPU-DCE-002",    "CPU Server",    "Zone-C", 3.1,  "UP",      "10.10.30.12", "API Gateway",            "Load Balancer Routing Engine",      35, "22% (56 GB / 256 GB)",  "job-lb101-gw",  "N/A", "N/A", "96 vCPU / 256 GB", "15.2 TB NVMe", "210 W", "43 °C");
        addLowRiskNode("BACKUP-DCE-001", "Storage System","Zone-C", 2.0,  "UP",      "10.10.30.52", "Daily Sync Storage",     "Differential Backup Pool (v1.2)",   12, "15% (38 GB / 256 GB)",  "job-backup-daily-01", "N/A", "N/A", "32 vCPU / 256 GB", "2.4 PB Storage Array", "310 W", "39 °C");
        addLowRiskNode("SPINE-DCE-001",  "Spine Switch",  "Zone-A", 1.8,  "UP",      "10.10.10.1",  "Core Datacenter Spine",  "BGP & EVPN Spine Routing",          18, "25% (16 GB / 64 GB)",   "net-spine-core-101", "N/A", "N/A", "16 vCPU / 64 GB", "256 GB Flash", "480 W", "45 °C");
        addLowRiskNode("GPU-DCE-004",    "GPU Server",    "Zone-C", 1.5,  "RUNNING", "10.10.30.13", "RLHF Policy Model",      "Reward Model Training (v1.1)",      28, "22% (176 GB / 800 GB)", "job-10f88a9c", "NVIDIA H100 SXM5", "535.104.05", "64 vCPU / 512 GB", "7.6 TB NVMe", "310 W", "50 °C");
        addLowRiskNode("GPU-DCE-005",    "GPU Server",    "Zone-B", 1.2,  "RUNNING", "10.10.20.22", "Tokenization Tests",     "Tokenizer Sandbox (v0.9)",          15, "10% (80 GB / 800 GB)",  "job-dev-token-99", "NVIDIA H100 SXM5", "535.104.05", "64 vCPU / 512 GB", "7.6 TB NVMe", "240 W", "46 °C");
        addLowRiskNode("CPU-DCE-003",    "CPU Server",    "Zone-A", 1.0,  "UP",      "10.10.10.12", "Redis Cache Master",     "In-Memory Session Store",           24, "58% (148 GB / 256 GB)", "job-redis-sessions", "N/A", "N/A", "112 vCPU / 256 GB", "3.8 TB NVMe", "190 W", "42 °C");
        addLowRiskNode("LEAF-DCE-002",   "Leaf Switch",   "Zone-B", 0.9,  "UP",      "10.10.20.101","Rack Switch Link",       "JunOS L2/L3 Routing",               28, "15% (3 GB / 20 GB)",    "net-leaf-201", "N/A", "N/A", "4 vCPU / 20 GB", "64 GB Flash", "140 W", "44 °C");
        addLowRiskNode("STORAGE-DCE-002","Storage System","Zone-B", 0.8,  "UP",      "10.10.20.51", "Staging File Share",     "NFS Shared Directory",              45, "32% (82 GB / 256 GB)",  "storage-staging-nfs", "N/A", "N/A", "32 vCPU / 256 GB", "500 TB SSD Group", "280 W", "37 °C");
        addLowRiskNode("GPU-DCE-006",    "GPU Server",    "Zone-C", 0.7,  "RUNNING", "10.10.30.14", "Interactive JupyterHub", "Jupyter Python Kernels",            12, "5% (40 GB / 800 GB)",   "job-dev-jupyter", "NVIDIA H100 SXM5", "535.104.05", "64 vCPU / 512 GB", "7.6 TB NVMe", "190 W", "44 °C");
        addLowRiskNode("SPINE-DCE-002",  "Spine Switch",  "Zone-B", 0.5,  "UP",      "10.10.20.1",  "Core Datacenter Spine B","Spine Active-Active L3 Mesh",       14, "22% (14 GB / 64 GB)",   "net-spine-core-102", "N/A", "N/A", "16 vCPU / 64 GB", "256 GB Flash", "420 W", "42 °C");
        addLowRiskNode("BACKUP-DCE-002", "Storage System","Zone-A", 0.4,  "UP",      "10.10.10.52", "Secondary Sync",         "Off-site Cold Archives",             5, "10% (25 GB / 256 GB)",  "job-backup-cold", "N/A", "N/A", "32 vCPU / 256 GB", "1.2 PB Storage Pool", "220 W", "35 °C");
        addLowRiskNode("CPU-DCE-004",    "CPU Server",    "Zone-C", 0.3,  "UP",      "10.10.30.15", "Prometheus Monitoring",  "TSDB Scraper Engine",               28, "64% (164 GB / 256 GB)", "job-prometheus-cluster", "N/A", "N/A", "112 vCPU / 256 GB", "7.6 TB NVMe", "210 W", "41 °C");
        addLowRiskNode("GPU-DCE-007",    "GPU Server",    "Zone-A", 0.2,  "RUNNING", "10.10.10.23", "Validation Job",         "Cross Validation Checks",            8, "2% (16 GB / 800 GB)",   "job-dev-crossval", "NVIDIA H100 SXM5", "535.104.05", "64 vCPU / 512 GB", "7.6 TB NVMe", "180 W", "42 °C");
        addLowRiskNode("LEAF-DCE-003",   "Leaf Switch",   "Zone-C", 0.1,  "UP",      "10.10.30.101","Rack Switch Link C",     "JunOS L2/L3 Routing",               12, "10% (2 GB / 20 GB)",    "net-leaf-301", "N/A", "N/A", "4 vCPU / 20 GB", "64 GB Flash", "120 W", "40 °C");
    }

    /** Helper to build a low-risk node quickly */
    private void addLowRiskNode(String id, String type, String zone, double risk, String status,
                                 String ip, String wlName, String wlModel, int util, String mem,
                                 String jobId, String gpuModel, String gpuDriver, String cpuMem,
                                 String storage, String power, String temp) {
        Node n = new Node();
        n.id = id; n.name = id; n.hostname = id;
        n.type = type; n.zone = zone;
        n.health = "HEALTHY"; n.risk = risk; n.criticality = "LOW";
        n.status = status; n.ipAddress = ip;
        n.desc = type + " · " + id;
        n.rack = zone + " / Rack-??"; n.os = type.contains("GPU") ? "Ubuntu 22.04 LTS"
                                                : type.contains("CPU") ? "RHEL 9.2"
                                                : type.contains("Switch") ? "NX-OS 10.2" : "ONTAP 9.12";
        n.lastSeen = "22 May 2025, 10:24:00";
        n.owner = type.contains("GPU") ? "AI Platform Team"
                : type.contains("Switch") ? "Network Admin Team"
                : type.contains("Storage") || type.contains("Backup") ? "Storage Management Team"
                : "Infrastructure Team";
        n.env = "Production"; n.blastRadius = "Low";
        n.security = new Node.Security();
        n.security.cveId = "N/A"; n.security.cveScore = 0.0; n.security.exploitAvailable = false;
        n.businessContext = new Node.BusinessContext(); n.businessContext.criticality = "LOW";
        n.workload = new Node.Workload();
        n.workload.name = wlName; n.workload.model = wlModel;
        n.workload.type = type.contains("GPU") ? "AI Training" : "General";
        n.workload.state = "Active"; n.workload.util = util;
        n.workload.mem = mem; n.workload.jobId = jobId;
        n.exposure = new Node.Exposure();
        n.exposure.internetReachable = false; n.exposure.managementInterfaceExposed = false;
        n.hardware = new Node.Hardware();
        n.hardware.gpuModel = gpuModel; n.hardware.gpuDriver = gpuDriver;
        n.hardware.cpuMem = cpuMem; n.hardware.storage = storage;
        n.hardware.power = power; n.hardware.temp = temp;
        n.cves = List.of();
        n.riskContribution = List.of(
            rc("Vulnerabilities", 0, 0.0, "#ef4444"),
            rc("Exposure", 30, Math.round(risk * 0.3 * 100.0) / 100.0, "#f97316"),
            rc("Workload", 30, Math.round(risk * 0.3 * 100.0) / 100.0, "#3b82f6"),
            rc("Health", 20, Math.round(risk * 0.2 * 100.0) / 100.0, "#10b981"),
            rc("Network", 20, Math.round(risk * 0.2 * 100.0) / 100.0, "#22d3ee")
        );
        n.actionBadge = "LOW PRIORITY";
        n.actionText = "No urgent actions. Maintain standard monitoring schedules.";
        n.timeline = List.of();
        nodes.add(n);
    }
}
