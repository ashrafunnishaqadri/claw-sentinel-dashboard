package com.tcs.pranay.clawsentinel.service;

import com.tcs.pranay.clawsentinel.dto.CveRiskRow;
import com.tcs.pranay.clawsentinel.dto.DashboardSummary;
import com.tcs.pranay.clawsentinel.dto.RiskAssetRow;
import com.tcs.pranay.clawsentinel.model.Node;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * RiskService — computes risk metrics dynamically from the live InventoryService.
 *
 * Extended from the original hardcoded version to:
 *  1. Compute all metrics LIVE from the mutable InventoryService store
 *  2. Support configurable bonus values via @Value (risk.bonus.*)
 *  3. Derive top-risk assets and CVE lists from real node data
 */
@Service
public class RiskService {

    private final InventoryService inventoryService;

    @Value("${risk.bonus.exploit}")
    private double exploitBonus;

    @Value("${risk.bonus.internet}")
    private double internetBonus;

    @Value("${risk.bonus.management}")
    private double managementBonus;

    public RiskService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * Returns the top N risk assets sorted by risk score descending.
     * Each RiskAssetRow matches the original record shape exactly.
     */
    public List<RiskAssetRow> topRiskAssets(int limit) {
        return inventoryService.getAllNodes().stream()
                .sorted((a, b) -> Double.compare(b.risk, a.risk))
                .limit(limit)
                .map(n -> new RiskAssetRow(
                        inventoryService.getAllNodes().indexOf(n) + 1,
                        n.id,
                        n.hostname,
                        n.type,
                        n.zone,
                        n.criticality,
                        n.risk,
                        n.risk >= 9.0 ? "CRITICAL" : n.risk >= 7.0 ? "HIGH" : n.risk >= 4.0 ? "MEDIUM" : "LOW",
                        n.security != null ? n.security.cveId : "N/A",
                        n.security != null ? n.security.cveScore : 0.0,
                        n.status,
                        n.workload != null ? n.workload.type : "N/A",
                        n.workload != null ? n.workload.state : "N/A",
                        n.exposure != null && Boolean.TRUE.equals(n.exposure.managementInterfaceExposed),
                        n.blastRadius != null ? n.blastRadius : "Low"
                ))
                .collect(Collectors.toList());
    }

    /**
     * Returns the top N CVEs aggregated across all nodes.
     * Groups by CVE ID, taking the maximum risk/CVE score and counting affected nodes.
     */
    public List<CveRiskRow> topCves(int limit) {
        Map<String, double[]> cveMap = new LinkedHashMap<>();

        inventoryService.getAllNodes().forEach(node -> {
            if (node.cves == null) return;
            node.cves.forEach(cve -> {
                cveMap.merge(
                    cve.name,
                    new double[]{node.risk, cve.score, 1},
                    (existing, incoming) -> new double[]{
                        Math.max(existing[0], incoming[0]),  // max risk score
                        Math.max(existing[1], incoming[1]),  // max CVE score
                        existing[2] + 1                      // affected count
                    }
                );
            });
        });

        return cveMap.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[0], a.getValue()[0]))
                .limit(limit)
                .map(e -> new CveRiskRow(
                        e.getKey(),
                        round(e.getValue()[0]),
                        round(e.getValue()[1]),
                        (int) e.getValue()[2]
                ))
                .collect(Collectors.toList());
    }

    /**
     * Computes the live DashboardSummary from current node states.
     * Matches the original DashboardSummary record fields exactly.
     */
    public DashboardSummary summary() {
        List<Node> nodes = inventoryService.getAllNodes();

        int totalAssets = nodes.size();

        long criticalRisks = nodes.stream()
                .filter(n -> n.risk >= 9.0)
                .count();

        long highRiskNodes = nodes.stream()
                .filter(n -> n.risk >= 7.0 && n.risk < 9.0)
                .count();

        double avgRisk = nodes.stream()
                .mapToDouble(n -> n.risk)
                .average()
                .orElse(0.0);
        double averageRiskScore = round(avgRisk);

        // openResponses = nodes with CVEs that haven't been remediated
        long openResponses = nodes.stream()
                .filter(n -> n.cves != null && !n.cves.isEmpty())
                .count();

        // patchCompliance = % of nodes with no CVEs (considered patched)
        long patchedNodes = nodes.stream()
                .filter(n -> n.cves == null || n.cves.isEmpty())
                .count();
        double patchCompliancePercent = round((double) patchedNodes / totalAssets * 100.0);

        return new DashboardSummary(
                totalAssets, criticalRisks, highRiskNodes,
                averageRiskScore, openResponses, patchCompliancePercent
        );
    }

    private double round(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
