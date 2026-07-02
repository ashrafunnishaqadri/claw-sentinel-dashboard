package com.tcs.pranay.clawsentinel.service;

import com.tcs.pranay.clawsentinel.dto.CveRiskRow;
import com.tcs.pranay.clawsentinel.dto.DashboardSummary;
import com.tcs.pranay.clawsentinel.dto.RiskAssetRow;
import com.tcs.pranay.clawsentinel.model.Node;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RiskService {

    private final InventoryService inventoryService;

    public RiskService(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    public List<RiskAssetRow> topRiskAssets(int limit) {
        List<RiskAssetRow> assets = new ArrayList<>();
        assets.add(new RiskAssetRow(1, "GPU-DCE-001", "GPU-DCE-001", "GPU Server", "Zone-A", "HIGH", 10.0, "CRITICAL", "CVE-2026-1001", 9.1, "RUNNING", "AI Training", "Active", false, "High"));
        assets.add(new RiskAssetRow(2, "GPU-DCE-002", "GPU-DCE-002", "GPU Server", "Zone-A", "HIGH", 9.7, "CRITICAL", "CVE-2026-1423", 9.0, "RUNNING", "AI Training", "Active", false, "High"));
        assets.add(new RiskAssetRow(3, "CPU-DCE-001", "CPU-DCE-001", "CPU Server", "Zone-B", "HIGH", 9.2, "CRITICAL", "CVE-2026-0456", 8.5, "RUNNING", "Data Processing", "Active", false, "Medium"));
        assets.add(new RiskAssetRow(4, "LEAF-DCE-001", "LEAF-DCE-001", "Leaf Switch", "Zone-A", "MEDIUM", 7.6, "HIGH", "CVE-2025-1011", 7.0, "UP", "Network", "Active", false, "Medium"));
        assets.add(new RiskAssetRow(5, "STORAGE-DCE-001", "STORAGE-DCE-001", "Storage System", "Zone-C", "MEDIUM", 6.8, "MEDIUM", "NA", 0.0, "UP", "Storage", "Active", false, "Medium"));
        assets.add(new RiskAssetRow(6, "GPU-DCE-003", "GPU-DCE-003", "GPU Server", "Zone-B", "LOW", 3.6, "LOW", "NA", 0.0, "RUNNING", "AI Training", "Idle", false, "Low"));
        assets.add(new RiskAssetRow(7, "CPU-DCE-002", "CPU-DCE-002", "CPU Server", "Zone-C", "LOW", 3.1, "LOW", "NA", 0.0, "UP", "Data Processing", "Active", false, "Low"));
        assets.add(new RiskAssetRow(8, "BACKUP-DCE-001", "BACKUP-DCE-001", "Storage System", "Zone-C", "LOW", 2.0, "LOW", "NA", 0.0, "UP", "Backup", "Active", false, "Low"));
        assets.add(new RiskAssetRow(9, "SPINE-DCE-001", "SPINE-DCE-001", "Spine Switch", "Zone-A", "LOW", 1.8, "LOW", "NA", 0.0, "UP", "Network", "Active", false, "Low"));
        assets.add(new RiskAssetRow(10, "GPU-DCE-004", "GPU-DCE-004", "GPU Server", "Zone-C", "LOW", 1.5, "LOW", "NA", 0.0, "RUNNING", "AI Training", "Idle", false, "Low"));
        
        return assets.subList(0, Math.min(limit, assets.size()));
    }

    public List<CveRiskRow> topCves(int limit) {
        List<CveRiskRow> cves = new ArrayList<>();
        cves.add(new CveRiskRow("CVE-2026-1001", 10.0, 9.1, 3));
        cves.add(new CveRiskRow("CVE-2026-1423", 9.7, 9.0, 2));
        cves.add(new CveRiskRow("CVE-2026-0456", 9.2, 8.5, 1));
        return cves.subList(0, Math.min(limit, cves.size()));
    }

    public DashboardSummary summary() {
        return new DashboardSummary(20, 3, 2, 5.5, 3, 85.0);
    }
}
