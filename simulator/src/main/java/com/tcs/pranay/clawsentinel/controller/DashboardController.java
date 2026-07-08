package com.tcs.pranay.clawsentinel.controller;

import com.tcs.pranay.clawsentinel.dto.CveRiskRow;
import com.tcs.pranay.clawsentinel.dto.DashboardSummary;
import com.tcs.pranay.clawsentinel.dto.RiskAssetRow;
import com.tcs.pranay.clawsentinel.model.Node;
import com.tcs.pranay.clawsentinel.service.InventoryService;
import com.tcs.pranay.clawsentinel.service.RiskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * DashboardController — handles all frontend REST API calls.
 * Includes the original endpoints from the user's screenshot,
 * plus PATCH and SSE endpoints for real-time simulator updates.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin("*") // Allow frontend to call us
public class DashboardController {

    private final InventoryService inventoryService;
    private final RiskService riskService;

    public DashboardController(InventoryService inventoryService, RiskService riskService) {
        this.inventoryService = inventoryService;
        this.riskService = riskService;
    }

    // ── Original Endpoints ──────────────────────────────────────────────────

    @GetMapping("/health")
    public String health() {
        return "ClawSentinel server is running!";
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

    // ── New Simulator Endpoints (Real-time updates) ─────────────────────────

    /**
     * PATCH /api/assets/{id}
     * Used by the simulator control panel to edit an asset's live state.
     * Triggers an SSE broadcast to all connected frontend clients.
     */
    @PatchMapping("/assets/{id}")
    public ResponseEntity<Node> patchAsset(
            @PathVariable String id,
            @RequestBody Map<String, Object> fields) {
        Node updated = inventoryService.patchNode(id, fields);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * GET /api/events
     * SSE (Server-Sent Events) endpoint. The frontend (app.js) listens here.
     * When patchAsset() is called, InventoryService pushes an event down this stream,
     * causing the frontend to re-render the affected row/panel live.
     */
    @GetMapping(value = "/events", produces = "text/event-stream")
    public SseEmitter streamEvents() {
        SseEmitter emitter = inventoryService.addEmitter();
        try {
            // Send a handshake event
            emitter.send(SseEmitter.event().name("connected").data("{\"status\":\"connected\"}"));
        } catch (Exception e) {
            emitter.complete();
        }
        return emitter;
    }
}
