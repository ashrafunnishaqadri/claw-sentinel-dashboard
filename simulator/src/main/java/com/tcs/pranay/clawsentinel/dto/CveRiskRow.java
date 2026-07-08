package com.tcs.pranay.clawsentinel.dto;

/**
 * CveRiskRow — record DTO representing a CVE in the top-risk CVE list.
 * Matches the existing record definition exactly.
 */
public record CveRiskRow(
    String cveId,
    double maxRiskScore,
    double maxCveScore,
    int affectedAssetsCount
) {}
