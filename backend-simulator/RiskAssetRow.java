package com.tcs.pranay.clawsentinel.dto;

public record RiskAssetRow(
    int rank,
    String id,
    String hostname,
    String type,
    String zone,
    String criticality,
    double riskScore,
    String severity,
    String topCveId,
    double topCveScore,
    String status,
    String workloadType,
    String workloadState,
    boolean managementInterfaceExposed,
    String blastRadius
) {}
