package com.tcs.pranay.clawsentinel.dto;

public record DashboardSummary(
    int totalAssets,
    long criticalRisks,
    long highRiskNodes,
    double averageRiskScore,
    long openResponses,
    double patchCompliancePercent
) {}
