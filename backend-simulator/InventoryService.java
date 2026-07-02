package com.tcs.pranay.clawsentinel.service;

import com.tcs.pranay.clawsentinel.model.Node;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryService {

    private final List<Node> nodes = new ArrayList<>();

    public InventoryService() {
        // Detailed Node matching "Selected Asset" screenshot exactly
        Node gpu001 = new Node();
        gpu001.id = "GPU-DCE-001";
        gpu001.hostname = "GPU-DCE-001";
        gpu001.type = "GPU Server";
        gpu001.zone = "Zone-A";
        gpu001.status = "RUNNING";
        gpu001.ipAddress = "10.10.10.21";
        gpu001.health = "DEGRADED";
        
        gpu001.businessContext = new Node.BusinessContext();
        gpu001.businessContext.criticality = "HIGH";
        
        gpu001.security = new Node.Security();
        gpu001.security.cveId = "CVE-2026-1001";
        gpu001.security.cveScore = 9.1;
        gpu001.security.exploitAvailable = true;
        
        gpu001.workload = new Node.Workload();
        gpu001.workload.type = "AI Training";
        gpu001.workload.state = "Active";
        
        gpu001.exposure = new Node.Exposure();
        gpu001.exposure.internetReachable = false;
        gpu001.exposure.managementInterfaceExposed = false;
        
        nodes.add(gpu001);

        // Add dummy nodes to make up the total of 20
        for (int i = 2; i <= 20; i++) {
            Node n = new Node();
            n.id = "NODE-" + i;
            n.hostname = "NODE-" + i;
            n.type = "Generic Node";
            n.zone = "Zone-B";
            n.status = "UP";
            n.ipAddress = "10.0.0." + i;
            n.health = "HEALTHY";
            nodes.add(n);
        }
    }

    public List<Node> getAllNodes() {
        return nodes;
    }

    public Node getNodeById(String id) {
        return nodes.stream()
                .filter(n -> n.id.equals(id))
                .findFirst()
                .orElse(null);
    }
}
