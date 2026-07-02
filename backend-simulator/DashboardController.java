package com.tcs.pranay.clawsentinel.controller;

import com.tcs.pranay.clawsentinel.dto.CveRiskRow;
import com.tcs.pranay.clawsentinel.dto.DashboardSummary;
import com.tcs.pranay.clawsentinel.dto.RiskAssetRow;
import com.tcs.pranay.clawsentinel.model.Node;
import com.tcs.pranay.clawsentinel.service.InventoryService;
import com.tcs.pranay.clawsentinel.service.RiskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class DashboardController {

    private final InventoryService inventoryService;
    private final RiskService riskService;

    public DashboardController(InventoryService inventoryService, RiskService riskService) {
        this.inventoryService = inventoryService;
        this.riskService = riskService;
    }

    @GetMapping("/health")
    public String health() {
        return "ClawSentinel server is running";
    }

    @GetMapping("/dashboard/summary")
    public DashboardSummary summary() {
        return riskService.summary();
    }

    @GetMapping("/risks/top")
    public List<RiskAssetRow> topRisks(@RequestParam(defaultValue = "3") int limit) {
        return riskService.topRiskAssets(limit);
    }

    @GetMapping("/cves/top")
    public List<CveRiskRow> topCves(@RequestParam(defaultValue = "2") int limit) {
        return riskService.topCves(limit);
    }

    @GetMapping("/assets")
    public List<Node> assets() {
        return inventoryService.getAllNodes();
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<Node> assetById(@PathVariable String id) {
        Node n = inventoryService.getNodeById(id);
        if (n != null) {
            return ResponseEntity.ok(n);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
