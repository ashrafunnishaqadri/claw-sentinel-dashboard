import os
import json
import random
from http.server import SimpleHTTPRequestHandler, HTTPServer
from datetime import datetime

PORT = 8000

# Mock Database / State in Memory
dashboard_data = {
    "criticalCVEs": 15,
    "highNodes": 24,
    "avgRiskScore": 6.4,
    "openResponses": 8,
    "complianceRate": 82,
    "totalAssets": 250,
    "topCVEs": [
        { "id": "CVE-2024-1102", "cvss": 9.8, "affected": 6, "riskScore": 9.8, "criticality": "critical" },
        { "id": "CVE-2024-9122", "cvss": 8.8, "affected": 15, "riskScore": 8.8, "criticality": "high" },
        { "id": "CVE-2024-5561", "cvss": 8.4, "affected": 9, "riskScore": 8.4, "criticality": "high" },
        { "id": "CVE-2024-2313", "cvss": 8.2, "affected": 4, "riskScore": 8.2, "criticality": "high" },
        { "id": "CVE-2024-0012", "cvss": 7.6, "affected": 11, "riskScore": 7.6, "criticality": "medium" }
    ],
    "trendData": {
        "labels": ["May 1", "May 4", "May 7", "May 10", "May 13", "May 16", "May 19", "May 22", "May 25", "May 28"],
        "values": [5.2, 5.8, 6.1, 5.9, 6.3, 6.7, 6.4, 6.8, 6.2, 6.4]
    },
    "sparklineData": [5.8, 6.0, 5.9, 6.2, 6.3, 6.2, 6.4],
    "assets": [
        { 
            "rank": 1, 
            "name": "GPU-88", 
            "ip": "10.10.12.88", 
            "type": "GPU Node", 
            "dc": "dc-east", 
            "criticality": "critical", 
            "score": 9.6, 
            "cve": "CVE-2024-1102", 
            "status": "open", 
            "lastSeen": "1m ago",
            "os": "Ubuntu 22.04 LTS",
            "rack": "Rack E-04",
            "gpuInfo": "8x NVIDIA H100 80GB SXM5",
            "details": "Critical buffer overflow vulnerability identified in driver package. Allows remote execution."
        },
        { 
            "rank": 2, 
            "name": "GPU-12", 
            "ip": "10.10.12.12", 
            "type": "GPU Node", 
            "dc": "dc-east", 
            "criticality": "high", 
            "score": 8.8, 
            "cve": "CVE-2024-9122", 
            "status": "open", 
            "lastSeen": "3m ago",
            "os": "RedHat Enterprise Linux 9",
            "rack": "Rack E-12",
            "gpuInfo": "8x NVIDIA A100 80GB PCIe",
            "details": "Unauthenticated API command execution on BMC controller. Out of compliance with policy SEC-GPU-02."
        },
        { 
            "rank": 3, 
            "name": "GPU-45", 
            "ip": "10.10.12.45", 
            "type": "GPU Node", 
            "dc": "dc-west", 
            "criticality": "high", 
            "score": 8.4, 
            "cve": "CVE-2024-5561", 
            "status": "in-progress", 
            "lastSeen": "5m ago",
            "os": "Ubuntu 22.04 LTS",
            "rack": "Rack W-09",
            "gpuInfo": "4x NVIDIA H100 80GB PCIe",
            "details": "Local privilege escalation vulnerability via Linux kernel subsystem. Mitigation script running."
        },
        { 
            "rank": 4, 
            "name": "DPU-03", 
            "ip": "10.10.12.7", 
            "type": "DPU Node", 
            "dc": "dc-east", 
            "criticality": "high", 
            "score": 8.2, 
            "cve": "CVE-2024-2313", 
            "status": "open", 
            "lastSeen": "6m ago",
            "os": "NVIDIA BlueField OS",
            "rack": "Rack E-01",
            "gpuInfo": "NVIDIA BlueField-3 DPU",
            "details": "Critical vulnerability inside network packet parser. Risk of DDoS injection and system crash."
        },
        { 
            "rank": 5, 
            "name": "GPU-77", 
            "ip": "10.10.12.77", 
            "type": "GPU Node", 
            "dc": "dc-west", 
            "criticality": "medium", 
            "score": 7.6, 
            "cve": "CVE-2024-0012", 
            "status": "open", 
            "lastSeen": "8m ago",
            "os": "Ubuntu 20.04 LTS",
            "rack": "Rack W-04",
            "gpuInfo": "8x NVIDIA H100 80GB SXM5",
            "details": "Medium exposure from outdated software library in training containers. Active exposure detected."
        },
        { 
            "rank": 6, 
            "name": "VM-Storage-01", 
            "ip": "10.10.10.15", 
            "type": "Storage VM", 
            "dc": "dc-west", 
            "criticality": "medium", 
            "score": 6.9, 
            "cve": "CVE-2024-3882", 
            "status": "resolved", 
            "lastSeen": "12m ago",
            "os": "Ubuntu 22.04 LTS",
            "rack": "Rack W-11",
            "gpuInfo": "N/A (NVMe Storage Tier)",
            "details": "Container escape vulnerability. Remediated via cluster kernel upgrade. Active monitoring enabled."
        },
        { 
            "rank": 7, 
            "name": "K8s-Worker-14", 
            "ip": "10.20.15.14", 
            "type": "K8s Node", 
            "dc": "dc-east", 
            "criticality": "low", 
            "score": 4.2, 
            "cve": "CVE-2024-4421", 
            "status": "resolved", 
            "lastSeen": "1h ago",
            "os": "Ubuntu 22.04 LTS",
            "rack": "Rack E-08",
            "gpuInfo": "1x NVIDIA L40S 48GB",
            "details": "Low severity container dependency vulnerability. Patched dependency tree. Integrity verified."
        }
    ],
    "complianceRate": 82,
    "prioritizationCount": 3
}

def build_report_html(report_type, scope, inc_kpi, inc_charts, inc_table):
    # Filter assets
    filtered = [a for a in dashboard_data["assets"] if scope == "all" or a["dc"] == scope]
    
    total = len(filtered)
    critical = len([a for a in filtered if a["criticality"] == "critical"])
    high = len([a for a in filtered if a["criticality"] == "high"])
    medium = len([a for a in filtered if a["criticality"] == "medium"])
    low = len([a for a in filtered if a["criticality"] == "low"])
    
    avg_score = round(sum(a["score"] for a in filtered) / total, 1) if total > 0 else 0
    compliance_rate = dashboard_data["complianceRate"] if scope == "all" else (78 if scope == "dc-east" else 86)
    
    title = "EXECUTIVE RISK SUMMARY"
    subtitle = "High-level posture assessment for datacenter stakeholders"
    if report_type == "vulnerability":
        title = "DETAILED VULNERABILITY EXPOSURE REPORT"
        subtitle = "Full inventory of CVE signatures and unmitigated risks"
    elif report_type == "compliance":
        title = "DATA CENTER COMPLIANCE AUDIT"
        subtitle = "Review of asset patch levels against security standards (SEC-GPU)"
        
    timestamp = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
    dc_label = "All Data Centers" if scope == "all" else ("DC-East only" if scope == "dc-east" else "DC-West only")
    
    html = f"""
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <h1 style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase;">ClawSentinel Security Report</h1>
                <span style="font-size: 10px; color: #64748b;">Generated: {timestamp}</span>
            </div>
            <p style="font-size: 12px; font-weight: 700; color: #2563eb; margin: 4px 0 0 0; text-transform: uppercase;">{title}</p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0; font-style: italic;">{subtitle}</p>
        </div>
        
        <div style="margin-bottom: 16px; background-color: #f8fafc; padding: 10px; border-radius: 4px; border-left: 3px solid #64748b;">
            <strong>Scope Parameters:</strong> Target Area: <strong>{dc_label}</strong> | Handled Assets: <strong>{total}</strong>
        </div>
    """
    
    if inc_kpi:
        avg_color = '#ef4444' if avg_score >= 7.5 else '#f97316'
        comp_color = '#10b981' if compliance_rate >= 80 else '#f97316'
        html += f"""
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e3a8a; margin-top:0;">1. KEY POSTURE METRICS</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Avg Risk Score</span>
                        <strong style="font-size: 16px; color: {avg_color};">{avg_score} / 10</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Patch Level</span>
                        <strong style="font-size: 16px; color: {comp_color};">{compliance_rate}%</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Critical Alerts</span>
                        <strong style="font-size: 16px; color: #ef4444;">{critical}</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">High Risk Nodes</span>
                        <strong style="font-size: 16px; color: #f97316;">{high}</strong>
                    </div>
                </div>
            </div>
        """
        
    if inc_charts:
        crit_pct = int((critical / total) * 100) if total > 0 else 0
        high_pct = int((high / total) * 100) if total > 0 else 0
        med_pct = int((medium / total) * 100) if total > 0 else 0
        low_pct = int((low / total) * 100) if total > 0 else 0
        
        html += f"""
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e3a8a;">2. SEVERITY DISTRIBUTION PROFILE</h3>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Critical Severity Assets (Score 9.0+)</span>
                            <strong>{critical} ({crit_pct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: {crit_pct}%; background: #ef4444; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>High Severity Assets (Score 7.0 - 8.9)</span>
                            <strong>{high} ({high_pct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: {high_pct}%; background: #f97316; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Medium Severity Assets (Score 4.0 - 6.9)</span>
                            <strong>{medium} ({med_pct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: {med_pct}%; background: #eab308; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Low Severity Assets (Score 0 - 3.9)</span>
                            <strong>{low} ({low_pct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: {low_pct}%; background: #10b981; height: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        """
        
    if inc_table:
        html += """
            <div style="margin-bottom: 12px;">
                <h3 style="font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e3a8a;">3. REGISTERED RISKY ASSET INDEX</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Name</th>
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">IP Address</th>
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Type</th>
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Data Center</th>
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">Severity</th>
                            <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; font-weight: bold; text-align: right;">Score</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for asset in filtered:
            color = "#eab308"
            if asset["criticality"] == "critical":
                color = "#ef4444"
            elif asset["criticality"] == "high":
                color = "#f97316"
                
            dc_name = "DC-East" if asset["dc"] == "dc-east" else "DC-West"
            html += f"""
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px; font-weight: bold;">{asset['name']}</td>
                    <td style="padding: 6px; color: #475569;">{asset['ip']}</td>
                    <td style="padding: 6px;">{asset['type']}</td>
                    <td style="padding: 6px; text-transform: uppercase;">{dc_name}</td>
                    <td style="padding: 6px;"><span style="color: {color}; font-weight: bold;">{asset['criticality'].upper()}</span></td>
                    <td style="padding: 6px; text-align: right; font-weight: bold;">{asset['score']}</td>
                </tr>
            """
            
        html += """
                    </tbody>
                </table>
            </div>
        """
        
    html += """
        <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 8px; text-align: center; color: #94a3b8;">
            ClawSentinel Automated Compliance Audit | End of Report | System Health: Operational
        </div>
    """
    return html

class ClawSentinelAPIHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for development versatility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/dashboard':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(dashboard_data).encode('utf-8'))
        else:
            # Fall back to standard file serving
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        if self.path == '/api/prioritization-count':
            count = payload.get('count', 3)
            dashboard_data['prioritizationCount'] = max(0, count)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"count": dashboard_data['prioritizationCount']}).encode('utf-8'))

        elif self.path == '/api/mitigate':
            asset_name = payload.get('assetName')
            cve = payload.get('cve')
            
            # Update asset status
            success = False
            for asset in dashboard_data['assets']:
                if asset['name'] == asset_name:
                    asset['status'] = 'in-progress'
                    success = True
                    break
            
            # Recalculate open responses
            dashboard_data['openResponses'] = len([
                a for a in dashboard_data['assets'] if a['status'] in ('open', 'in-progress')
            ]) + 3  # Add offset for matches
            
            message = f"[PLAYBOOK RUNNING] Initialized backend security containment and patching pipeline for {asset_name} resolving vulnerability {cve}."
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": success, 
                "message": message,
                "assets": dashboard_data['assets'],
                "openResponses": dashboard_data['openResponses']
            }).encode('utf-8'))

        elif self.path == '/api/refresh':
            # Simulate real-time risk score shifts on backend
            for asset in dashboard_data['assets']:
                shift = (random.random() - 0.5) * 0.4
                asset['score'] = min(10.0, max(1.0, round(asset['score'] + shift, 1)))
                
                # Update severity
                if asset['score'] >= 9.0:
                    asset['criticality'] = 'critical'
                elif asset['score'] >= 7.0:
                    asset['criticality'] = 'high'
                elif asset['score'] >= 4.0:
                    asset['criticality'] = 'medium'
                else:
                    asset['criticality'] = 'low'
            
            # Randomly shift average score
            dashboard_data['avgRiskScore'] = min(10.0, max(1.0, round(dashboard_data['avgRiskScore'] + (random.random() - 0.5) * 0.2, 1)))
            
            # Shift sparkline values
            dashboard_data['sparklineData'].pop(0)
            dashboard_data['sparklineData'].append(dashboard_data['avgRiskScore'])
            
            # Update CVE counters slightly
            dashboard_data['criticalCVEs'] = len([a for a in dashboard_data['assets'] if a['criticality'] == 'critical']) + 13
            dashboard_data['highNodes'] = len([a for a in dashboard_data['assets'] if a['criticality'] == 'high']) + 20
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(dashboard_data).encode('utf-8'))

        elif self.path == '/api/generate-report':
            report_type = payload.get('type', 'executive')
            scope = payload.get('scope', 'all')
            inc_kpi = payload.get('incKpi', True)
            inc_charts = payload.get('incCharts', True)
            inc_table = payload.get('incTable', True)
            
            html_report = build_report_html(report_type, scope, inc_kpi, inc_charts, inc_table)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"html": html_report}).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=ClawSentinelAPIHandler, port=PORT):
    # Go to directory of current script to find static assets properly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"ClawSentinel Backend API Server running at http://localhost:{port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == '__main__':
    run()
