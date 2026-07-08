package com.tcs.pranay.clawsentinel.dto;

/**
 * DashboardSummary — record DTO for the Overview page KPI cards.
 * Matches the existing record definition exactly.
 */
public record DashboardSummary(
    int totalAssets,
    long criticalRisks,
    long highRiskNodes,
    double averageRiskScore,
    long openResponses,
    double patchCompliancePercent
) {}
