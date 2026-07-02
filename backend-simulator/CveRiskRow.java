package com.tcs.pranay.clawsentinel.dto;

public record CveRiskRow(
    String cveId,
    double maxRiskScore,
    double maxCveScore,
    int affectedAssetsCount
) {}
