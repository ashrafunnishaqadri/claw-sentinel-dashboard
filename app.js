// ClawSentinel Dashboard Application Logic

// --- Global State ---
let isDarkMode = false;
let riskDistChart = null;
let riskTrendChart = null;
let avgSparkline = null;
let prioritizationCount = 3; // Global alert counter
let dashboardData = null; // Loaded from REST API
const apiStatusIndicator = document.getElementById("api-status-indicator");

// --- Fallback Mock Data ---
const localFallbackData = {
    criticalCVEs: 15,
    highNodes: 24,
    avgRiskScore: 6.4,
    openResponses: 8,
    complianceRate: 82, // Percent
    totalAssets: 250,
    
    // CVE list
    topCVEs: [
        { id: "CVE-2024-1102", cvss: 9.8, affected: 6, riskScore: 9.8, criticality: "critical" },
        { id: "CVE-2024-9122", cvss: 8.8, affected: 15, riskScore: 8.8, criticality: "high" },
        { id: "CVE-2024-5561", cvss: 8.4, affected: 9, riskScore: 8.4, criticality: "high" },
        { id: "CVE-2024-2313", cvss: 8.2, affected: 4, riskScore: 8.2, criticality: "high" },
        { id: "CVE-2024-0012", cvss: 7.6, affected: 11, riskScore: 7.6, criticality: "medium" }
    ],

    // Risk Trend points (last 30 days - 10 values)
    trendData: {
        labels: ["May 1", "May 4", "May 7", "May 10", "May 13", "May 16", "May 19", "May 22", "May 25", "May 28"],
        values: [5.2, 5.8, 6.1, 5.9, 6.3, 6.7, 6.4, 6.8, 6.2, 6.4]
    },

    // Sparkline points for average risk score card (last 7 points)
    sparklineData: [5.8, 6.0, 5.9, 6.2, 6.3, 6.2, 6.4],

    // Top Risky Assets Array
    assets: [
        { 
            rank: 1, 
            name: "GPU-88", 
            ip: "10.10.12.88", 
            type: "GPU Node", 
            dc: "dc-east", 
            criticality: "critical", 
            score: 9.6, 
            cve: "CVE-2024-1102", 
            status: "open", 
            lastSeen: "1m ago",
            os: "Ubuntu 22.04 LTS",
            rack: "Rack E-04",
            gpuInfo: "8x NVIDIA H100 80GB SXM5",
            details: "Critical buffer overflow vulnerability identified in driver package. Allows remote execution."
        },
        { 
            rank: 2, 
            name: "GPU-12", 
            ip: "10.10.12.12", 
            type: "GPU Node", 
            dc: "dc-east", 
            criticality: "high", 
            score: 8.8, 
            cve: "CVE-2024-9122", 
            status: "open", 
            lastSeen: "3m ago",
            os: "RedHat Enterprise Linux 9",
            rack: "Rack E-12",
            gpuInfo: "8x NVIDIA A100 80GB PCIe",
            details: "Unauthenticated API command execution on BMC controller. Out of compliance with policy SEC-GPU-02."
        },
        { 
            rank: 3, 
            name: "GPU-45", 
            ip: "10.10.12.45", 
            type: "GPU Node", 
            dc: "dc-west", 
            criticality: "high", 
            score: 8.4, 
            cve: "CVE-2024-5561", 
            status: "in-progress", 
            lastSeen: "5m ago",
            os: "Ubuntu 22.04 LTS",
            rack: "Rack W-09",
            gpuInfo: "4x NVIDIA H100 80GB PCIe",
            details: "Local privilege escalation vulnerability via Linux kernel subsystem. Mitigation script running."
        },
        { 
            rank: 4, 
            name: "DPU-03", 
            ip: "10.10.12.7", 
            type: "DPU Node", 
            dc: "dc-east", 
            criticality: "high", 
            score: 8.2, 
            cve: "CVE-2024-2313", 
            status: "open", 
            lastSeen: "6m ago",
            os: "NVIDIA BlueField OS",
            rack: "Rack E-01",
            gpuInfo: "NVIDIA BlueField-3 DPU",
            details: "Critical vulnerability inside network packet parser. Risk of DDoS injection and system crash."
        },
        { 
            rank: 5, 
            name: "GPU-77", 
            ip: "10.10.12.77", 
            type: "GPU Node", 
            dc: "dc-west", 
            criticality: "medium", 
            score: 7.6, 
            cve: "CVE-2024-0012", 
            status: "open", 
            lastSeen: "8m ago",
            os: "Ubuntu 20.04 LTS",
            rack: "Rack W-04",
            gpuInfo: "8x NVIDIA H100 80GB SXM5",
            details: "Medium exposure from outdated software library in training containers. Active exposure detected."
        },
        { 
            rank: 6, 
            name: "VM-Storage-01", 
            ip: "10.10.10.15", 
            type: "Storage VM", 
            dc: "dc-west", 
            criticality: "medium", 
            score: 6.9, 
            cve: "CVE-2024-3882", 
            status: "resolved", 
            lastSeen: "12m ago",
            os: "Ubuntu 22.04 LTS",
            rack: "Rack W-11",
            gpuInfo: "N/A (NVMe Storage Tier)",
            details: "Container escape vulnerability. Remediated via cluster kernel upgrade. Active monitoring enabled."
        },
        { 
            rank: 7, 
            name: "K8s-Worker-14", 
            ip: "10.20.15.14", 
            type: "K8s Node", 
            dc: "dc-east", 
            criticality: "low", 
            score: 4.2, 
            cve: "CVE-2024-4421", 
            status: "resolved", 
            lastSeen: "1h ago",
            os: "Ubuntu 22.04 LTS",
            rack: "Rack E-08",
            gpuInfo: "1x NVIDIA L40S 48GB",
            details: "Low severity container dependency vulnerability. Patched dependency tree. Integrity verified."
        }
    ],
    complianceRate: 82,
    prioritizationCount: 3
};

// --- REST API Helper Functions ---

// Fetch dashboard data from the dummy server
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error("REST API responded with error " + response.status);
        dashboardData = await response.json();
        prioritizationCount = dashboardData.prioritizationCount;
        
        // Update connection status in UI
        if (apiStatusIndicator) {
            apiStatusIndicator.className = "api-status connected";
            const textEl = apiStatusIndicator.querySelector(".api-status-text");
            if (textEl) textEl.textContent = "API Connected";
        }
        return true;
    } catch (e) {
        console.warn("REST API server offline. Falling back to local browser mock mode.", e);
        dashboardData = JSON.parse(JSON.stringify(localFallbackData));
        prioritizationCount = dashboardData.prioritizationCount;
        
        // Update connection status in UI
        if (apiStatusIndicator) {
            apiStatusIndicator.className = "api-status offline";
            const textEl = apiStatusIndicator.querySelector(".api-status-text");
            if (textEl) textEl.textContent = "API Offline (Mock)";
        }
        return false;
    }
}

// --- DOM References ---
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const themeToggle = document.getElementById("theme-toggle");
const complianceCircle = document.getElementById("compliance-circle-bar");
const topCvesList = document.getElementById("top-cves-list");
const assetsTableBody = document.getElementById("assets-table-body");
const assetSearch = document.getElementById("asset-search");
const severityFilter = document.getElementById("severity-filter");
const statusFilter = document.getElementById("status-filter");
const datacenterSelect = document.getElementById("datacenter-select");
const refreshAssetsBtn = document.getElementById("refresh-assets-btn");
const detailsDrawer = document.getElementById("details-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const drawerClose = document.getElementById("drawer-close");
const drawerContent = document.getElementById("drawer-content");

// Alert Count Controller DOM references
const headerAlertCount = document.getElementById("header-alert-count");
const sidebarAlertBadge = document.getElementById("sidebar-alert-badge");
const countIncrementBtn = document.getElementById("count-increment");
const countDecrementBtn = document.getElementById("count-decrement");
const countResetBtn = document.getElementById("count-reset");

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Icons
    try {
        lucide.createIcons();
    } catch (e) {
        console.error("Lucide icons load error:", e);
    }

    // Load data from REST API or offline fallback
    await fetchDashboardData();

    // 2. Set static KPI card text from loaded data
    try {
        updateKPICards();
    } catch (e) {
        console.error("KPI cards populating error:", e);
    }

    // Initialize Alert Count Sync UI
    try {
        updateAlertCountUI(prioritizationCount);
    } catch (e) {
        console.error("Prioritization alert count synchronization error:", e);
    }

    // 3. Render Circular Compliance Bar
    try {
        renderComplianceProgress(dashboardData.complianceRate);
    } catch (e) {
        console.error("Compliance progress render error:", e);
    }

    // 4. Render Sparkline Chart
    try {
        renderSparkline(dashboardData.sparklineData);
    } catch (e) {
        console.error("Sparkline chart render error:", e);
    }

    // 5. Render Top CVEs
    try {
        renderTopCVEList(dashboardData.topCVEs);
    } catch (e) {
        console.error("Top CVEs side panel render error:", e);
    }

    // 6. Populate Top Risky Assets Table
    try {
        renderAssetsTable();
    } catch (e) {
        console.error("Top Risky Assets table render error:", e);
    }

    // 7. Initialize Charts (Chart.js)
    try {
        initCharts();
    } catch (e) {
        console.error("Chart.js main elements initialization error:", e);
    }

    // 8. Setup Interactivity Event Listeners
    try {
        setupEventListeners();
    } catch (e) {
        console.error("Event listeners attachment error:", e);
    }
});

// Helper to populate KPI metrics on UI
function updateKPICards() {
    try {
        document.getElementById("kpi-critical-cves").textContent = dashboardData.criticalCVEs;
        document.getElementById("kpi-high-nodes").textContent = dashboardData.highNodes;
        document.getElementById("kpi-avg-score").textContent = dashboardData.avgRiskScore;
        document.getElementById("kpi-open-responses").textContent = dashboardData.openResponses;
        document.getElementById("kpi-compliance-val").textContent = `${dashboardData.complianceRate}%`;
        document.getElementById("kpi-compliance-subtitle").textContent = `${dashboardData.complianceRate}%`;
    } catch (e) {
        console.error("KPI cards populating error:", e);
    }
}

// --- Helper Functions ---

// Synchronize prioritization alert counts in sidebar & header (UI updates only)
function updateAlertCountUI(newCount) {
    prioritizationCount = Math.max(0, newCount); // Clamp to 0
    
    // Update Header Text
    if (headerAlertCount) {
        headerAlertCount.textContent = prioritizationCount;
        
        // Quick scaling micro-animation to indicate update
        headerAlertCount.classList.remove("pop-animation");
        void headerAlertCount.offsetWidth; // Reflow
        headerAlertCount.classList.add("pop-animation");
    }
    
    // Update Sidebar Badge
    if (sidebarAlertBadge) {
        if (prioritizationCount === 0) {
            sidebarAlertBadge.style.display = "none";
        } else {
            sidebarAlertBadge.style.display = "block";
            sidebarAlertBadge.textContent = prioritizationCount;
            
            sidebarAlertBadge.classList.remove("pop-animation");
            void sidebarAlertBadge.offsetWidth; // Reflow
            sidebarAlertBadge.classList.add("pop-animation");
        }
    }
}

// Synchronize prioritization alert counts with REST API (or fallback)
async function updateAlertCount(newCount) {
    const clampedCount = Math.max(0, newCount);
    
    // Update UI immediately for responsiveness
    updateAlertCountUI(clampedCount);
    
    try {
        const response = await fetch('/api/prioritization-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: clampedCount })
        });
        if (response.ok) {
            const data = await response.json();
            // Sync with actual value confirmed by server
            updateAlertCountUI(data.count);
        }
    } catch (e) {
        console.warn("Failed to save prioritization count to server. Running offline.");
    }
}

// Avg Risk Score Sparkline Chart (Simple Sparkline using Chart.js)
function renderSparkline(points) {
    const ctx = document.getElementById("avg-risk-sparkline").getContext("2d");
    avgSparkline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: points.map((_, i) => i),
            datasets: [{
                data: points,
                borderColor: '#eab308',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Render Top CVEs side panel
function renderTopCVEList(cves) {
    topCvesList.innerHTML = "";
    cves.forEach(cve => {
        const item = document.createElement("div");
        item.className = "cve-item";
        item.innerHTML = `
            <div class="cve-left">
                <span class="cve-id">${cve.id}</span>
                <span class="cve-sub">CVSS: ${cve.cvss}</span>
            </div>
            <div class="cve-metric">
                <span class="cve-count-badge">${cve.affected} Assets</span>
                <span class="cve-score-badge ${cve.criticality}">${cve.riskScore}</span>
            </div>
        `;
        topCvesList.appendChild(item);
    });
}

// Render Risky Assets Table
function renderAssetsTable() {
    const searchVal = assetSearch.value.toLowerCase();
    const severityVal = severityFilter.value;
    const statusVal = statusFilter.value;
    const dcVal = datacenterSelect.value;

    assetsTableBody.innerHTML = "";

    // Filtering assets
    const filteredAssets = dashboardData.assets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchVal) || 
                              asset.cve.toLowerCase().includes(searchVal) || 
                              asset.ip.includes(searchVal) ||
                              asset.type.toLowerCase().includes(searchVal);
        const matchesSeverity = severityVal === "all" || asset.criticality === severityVal;
        const matchesStatus = statusVal === "all" || asset.status === statusVal;
        const matchesDC = dcVal === "all" || asset.dc === dcVal;

        return matchesSearch && matchesSeverity && matchesStatus && matchesDC;
    });

    if (filteredAssets.length === 0) {
        assetsTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 24px; color: var(--text-secondary);">
                    No risky assets matching active filters
                </td>
            </tr>
        `;
        return;
    }

    filteredAssets.forEach(asset => {
        const tr = document.createElement("tr");
        
        // Criticality badge class
        let rankClass = "rank-other";
        if (asset.rank === 1) rankClass = "rank-1";
        else if (asset.rank === 2) rankClass = "rank-2";
        else if (asset.rank === 3) rankClass = "rank-3";

        // Score bar styling based on level
        let scoreColorClass = "medium";
        if (asset.score >= 9.0) scoreColorClass = "critical";
        else if (asset.score >= 7.0) scoreColorClass = "high";

        tr.innerHTML = `
            <td>
                <div class="rank-badge ${rankClass}">${asset.rank}</div>
            </td>
            <td>
                <div class="asset-name-wrapper">
                    <span class="asset-title">${asset.name}</span>
                    <span class="asset-ip">${asset.ip}</span>
                </div>
            </td>
            <td>${asset.type}</td>
            <td>${asset.dc === 'dc-east' ? 'DC-East' : 'DC-West'}</td>
            <td>
                <span class="badge-severity ${asset.criticality}">${asset.criticality.toUpperCase()}</span>
            </td>
            <td>
                <div class="table-score-container">
                    <span class="table-score-val">${asset.score}</span>
                    <div class="table-score-bar-wrapper">
                        <div class="table-score-bar ${scoreColorClass}" style="width: ${asset.score * 10}%"></div>
                    </div>
                </div>
            </td>
            <td style="font-weight: 600;">${asset.cve}</td>
            <td>
                <span class="badge-status ${asset.status}">${asset.status === 'in-progress' ? 'In Progress' : asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}</span>
            </td>
            <td style="color: var(--text-secondary); font-size: 12px;">${asset.lastSeen}</td>
            <td style="display: flex; align-items: center; gap: 8px;">
                <button class="btn-investigate" onclick="openAssetDrawer(${asset.rank})">Investigate</button>
                <button class="table-menu-btn" title="More options"><i data-lucide="more-vertical" style="width:16px;height:16px;"></i></button>
            </td>
        `;
        assetsTableBody.appendChild(tr);
    });

    // Re-create icons for table dynamically loaded items
    lucide.createIcons();
}

// Open Investigation Drawer with dynamic details
window.openAssetDrawer = function(rank) {
    const asset = dashboardData.assets.find(a => a.rank === rank);
    if (!asset) return;

    let scoreColorClass = "medium";
    if (asset.score >= 9.0) scoreColorClass = "critical";
    else if (asset.score >= 7.0) scoreColorClass = "high";

    drawerContent.innerHTML = `
        <div class="drawer-section">
            <h4 class="drawer-section-title">Asset Identity</h4>
            <div class="detail-row">
                <span class="detail-label">Name</span>
                <span class="detail-value">${asset.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">IP Address</span>
                <span class="detail-value">${asset.ip}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">${asset.type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">OS</span>
                <span class="detail-value">${asset.os}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">${asset.dc.toUpperCase()} - ${asset.rack}</span>
            </div>
        </div>

        <div class="drawer-section">
            <h4 class="drawer-section-title">Hardware Details</h4>
            <div class="detail-row">
                <span class="detail-label">Engine Config</span>
                <span class="detail-value" style="font-size: 12px;">${asset.gpuInfo}</span>
            </div>
        </div>

        <div class="drawer-section">
            <h4 class="drawer-section-title">Security State</h4>
            <div class="detail-row">
                <span class="detail-label">Risk Rating</span>
                <span class="badge-severity ${asset.criticality}">${asset.criticality.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Risk Score</span>
                <span class="detail-value" style="color: var(--color-${scoreColorClass}); font-weight: 700;">${asset.score} / 10</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Response Status</span>
                <span class="badge-status ${asset.status}">${asset.status.toUpperCase()}</span>
            </div>
        </div>

        <div class="drawer-section">
            <h4 class="drawer-section-title">Active Exposure</h4>
            <div class="drawer-cve-pill">
                <div class="drawer-cve-title">
                    <span>${asset.cve}</span>
                    <span class="cve-score-badge ${asset.criticality}" style="padding: 1px 6px; font-size:10px;">${asset.score}</span>
                </div>
                <p class="drawer-cve-desc">${asset.details}</p>
            </div>
        </div>

        <button class="drawer-action-btn" onclick="executeMitigationPlaybook('${asset.name}', '${asset.cve}')">
            Deploy Automated Mitigation Playbook
        </button>
    `;

    detailsDrawer.classList.add("open");
    drawerOverlay.classList.add("open");
    document.body.style.overflow = "hidden"; // Disable scroll background
};

// Close Investigation Drawer
function closeDrawer() {
    detailsDrawer.classList.remove("open");
    drawerOverlay.classList.remove("open");
    document.body.style.overflow = ""; // Enable scroll
}

// Action Trigger Playbook Alert
window.executeMitigationPlaybook = async function(assetName, cve) {
    try {
        const response = await fetch('/api/mitigate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetName, cve })
        });
        if (!response.ok) throw new Error("HTTP error: " + response.status);
        
        const data = await response.json();
        alert(data.message);
        
        // Update local asset status and UI
        const asset = dashboardData.assets.find(a => a.name === assetName);
        if (asset) {
            asset.status = "in-progress";
        }
        if (data.openResponses !== undefined) {
            dashboardData.openResponses = data.openResponses;
        }
        updateKPICards();
        renderAssetsTable();
    } catch (error) {
        console.warn("Failed to execute playbook on server. Running offline fallback.", error);
        alert(`[PLAYBOOK RUNNING] Initialized security containment and patching pipeline for ${assetName} resolving vulnerability ${cve}.`);
        
        // Local fallback update
        const asset = dashboardData.assets.find(a => a.name === assetName);
        if (asset) {
            asset.status = "in-progress";
            // Recalculate local open count if not resolved
            dashboardData.openResponses = dashboardData.assets.filter(
                a => a.status === 'open' || a.status === 'in-progress'
            ).length + 3;
            updateKPICards();
            renderAssetsTable();
        }
    }
    closeDrawer();
};

// Initialize Chart.js Elements
function initCharts() {
    // Shared chart fonts setup depending on theme
    const fontColor = isDarkMode ? 'hsl(220, 15%, 70%)' : 'hsl(220, 20%, 45%)';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // 1. Doughnut Chart: Risk Score Distribution
    const distCtx = document.getElementById("risk-distribution-chart").getContext("2d");
    
    // Dynamically calculate segment counts to sync with assets data
    const criticalCount = dashboardData.assets.filter(a => a.criticality === "critical").length + 10;
    const highCount = dashboardData.assets.filter(a => a.criticality === "high").length + 25;
    const mediumCount = dashboardData.assets.filter(a => a.criticality === "medium").length + 75;
    const lowCount = Math.max(0, 250 - (criticalCount + highCount + mediumCount));

    // Doughnut segments data (Critical, High, Medium, Low)
    const distData = {
        labels: ["Critical (9.0-10)", "High (7.0-8.9)", "Medium (4.0-6.9)", "Low (0-3.9)"],
        datasets: [{
            data: [criticalCount, highCount, mediumCount, lowCount], // Matches 250 Total Assets
            backgroundColor: [
                '#ef4444', // Critical
                '#f97316', // High
                '#eab308', // Medium
                '#10b981'  // Low
            ],
            borderWidth: isDarkMode ? 2 : 1,
            borderColor: isDarkMode ? 'hsl(222, 25%, 10%)' : '#fff',
            hoverOffset: 4
        }]
    };

    riskDistChart = new Chart(distCtx, {
        type: 'doughnut',
        data: distData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(0);
                            return ` ${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '75%'
        }
    });

    // Populate legend HTML dynamically
    renderDoughnutLegend(distData.datasets[0].data);

    // 2. Line Chart: Risk Trend (Last 30 Days)
    const trendCtx = document.getElementById("risk-trend-chart").getContext("2d");
    
    const gradient = trendCtx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

    riskTrendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: dashboardData.trendData.labels,
            datasets: [{
                label: 'Avg Risk Score',
                data: dashboardData.trendData.values,
                borderColor: '#2563eb',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2563eb',
                pointHoverRadius: 6,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: fontColor, font: { family: 'Outfit', size: 10 } }
                },
                y: {
                    min: 0,
                    max: 10,
                    grid: { color: gridColor },
                    ticks: { color: fontColor, font: { family: 'Outfit', size: 10 } }
                }
            }
        }
    });
}

// Populate Doughnut legend and center overlay dynamically
function renderDoughnutLegend(counts) {
    const legendContainer = document.getElementById("chart-legend");
    if (!legendContainer) return;
    legendContainer.innerHTML = "";
    
    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981'];
    const total = counts.reduce((a, b) => a + b, 0);
    const labels = ["Critical", "High", "Medium", "Low"];
    const ranges = ["(9.0 - 10)", "(7.0 - 8.9)", "(4.0 - 6.9)", "(0 - 3.9)"];

    for (let i = 0; i < labels.length; i++) {
        const pct = total > 0 ? ((counts[i] / total) * 100).toFixed(0) : 0;
        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `
            <div class="legend-left">
                <div class="legend-color" style="background-color: ${colors[i]};"></div>
                <span style="font-weight: 500;">${labels[i]} <span style="color: var(--text-secondary); font-size:10px;">${ranges[i]}</span></span>
            </div>
            <div class="legend-right">${counts[i]} (${pct}%)</div>
        `;
        legendContainer.appendChild(item);
    }
    
    const centerTotal = document.getElementById("doughnut-center-total");
    if (centerTotal) {
        centerTotal.textContent = total;
    }
}

// Update charts with fresh REST API data
function updateCharts() {
    if (riskTrendChart) {
        riskTrendChart.data.datasets[0].data = dashboardData.trendData.values;
        riskTrendChart.update();
    }
    if (avgSparkline) {
        avgSparkline.data.datasets[0].data = dashboardData.sparklineData;
        avgSparkline.update();
    }
    if (riskDistChart) {
        const criticalCount = dashboardData.assets.filter(a => a.criticality === "critical").length + 10;
        const highCount = dashboardData.assets.filter(a => a.criticality === "high").length + 25;
        const mediumCount = dashboardData.assets.filter(a => a.criticality === "medium").length + 75;
        const lowCount = Math.max(0, 250 - (criticalCount + highCount + mediumCount));
        
        riskDistChart.data.datasets[0].data = [criticalCount, highCount, mediumCount, lowCount];
        riskDistChart.update();
        renderDoughnutLegend(riskDistChart.data.datasets[0].data);
    }
}

// Refresh layouts when theme changes
function updateChartsTheme() {
    const fontColor = isDarkMode ? 'hsl(220, 15%, 70%)' : 'hsl(220, 20%, 45%)';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    if (riskTrendChart) {
        riskTrendChart.options.scales.x.grid.color = gridColor;
        riskTrendChart.options.scales.x.ticks.color = fontColor;
        riskTrendChart.options.scales.y.grid.color = gridColor;
        riskTrendChart.options.scales.y.ticks.color = fontColor;
        riskTrendChart.update();
    }

    if (riskDistChart) {
        riskDistChart.options.datasets[0].borderColor = isDarkMode ? 'hsl(222, 25%, 10%)' : '#fff';
        riskDistChart.options.datasets[0].borderWidth = isDarkMode ? 2 : 1;
        riskDistChart.update();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Sidebar collapse toggler
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
    });

    // Handle viewport changes to reset sidebar mobile classes
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove("mobile-open");
        }
    });

    // Theme Switcher Toggle (Light/Dark Mode)
    themeToggle.addEventListener("click", () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle("dark-theme", isDarkMode);
        
        // Update Lucide icon
        const icon = themeToggle.querySelector("i");
        if (isDarkMode) {
            icon.setAttribute("data-lucide", "sun");
        } else {
            icon.setAttribute("data-lucide", "moon");
        }
        lucide.createIcons();

        // Update Charts styling
        updateChartsTheme();
    });

    // Filters and search fields
    assetSearch.addEventListener("input", renderAssetsTable);
    severityFilter.addEventListener("change", renderAssetsTable);
    statusFilter.addEventListener("change", renderAssetsTable);
    datacenterSelect.addEventListener("change", renderAssetsTable);

    // Refresh table button animation & action
    refreshAssetsBtn.addEventListener("click", async () => {
        refreshAssetsBtn.classList.add("spinning");
        
        try {
            const response = await fetch('/api/refresh', { method: 'POST' });
            if (!response.ok) throw new Error("HTTP error: " + response.status);
            
            dashboardData = await response.json();
            
            // Update UI elements
            updateKPICards();
            renderAssetsTable();
            updateCharts();
        } catch (error) {
            console.warn("Failed to refresh data from server. Running offline refresh simulation.", error);
            // Offline fallback simulation
            dashboardData.assets.forEach(asset => {
                const shift = (Math.random() - 0.5) * 0.4;
                asset.score = Math.min(10, Math.max(1, +(asset.score + shift).toFixed(1)));
                
                // Update criticality
                if (asset.score >= 9.0) asset.criticality = "critical";
                else if (asset.score >= 7.0) asset.criticality = "high";
                else if (asset.score >= 4.0) asset.criticality = "medium";
                else asset.criticality = "low";
            });
            
            // Randomly shift average score
            dashboardData.avgRiskScore = Math.min(10, Math.max(1, +(dashboardData.avgRiskScore + (Math.random() - 0.5) * 0.2).toFixed(1)));
            
            dashboardData.sparklineData.shift();
            dashboardData.sparklineData.push(dashboardData.avgRiskScore);
            
            // Recalculate CVE counts
            dashboardData.criticalCVEs = dashboardData.assets.filter(a => a.criticality === "critical").length + 13;
            dashboardData.highNodes = dashboardData.assets.filter(a => a.criticality === "high").length + 20;
            
            updateKPICards();
            renderAssetsTable();
            updateCharts();
        } finally {
            // Keep spinning animation visible briefly for realistic user feedback
            setTimeout(() => {
                refreshAssetsBtn.classList.remove("spinning");
            }, 600);
        }
    });

    // Close drawers
    drawerClose.addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    // Add ESC key listener to close drawer
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDrawer();
        }
    });

    // Alert count button listeners
    if (countIncrementBtn) {
        countIncrementBtn.addEventListener("click", () => {
            updateAlertCount(prioritizationCount + 1);
        });
    }
    if (countDecrementBtn) {
        countDecrementBtn.addEventListener("click", () => {
            updateAlertCount(prioritizationCount - 1);
        });
    }
    if (countResetBtn) {
        countResetBtn.addEventListener("click", () => {
            updateAlertCount(3);
        });
    }

    // Report modal triggers (trends & reports link in sidebar)
    const trendsLink = Array.from(document.querySelectorAll("aside a")).find(el => el.textContent.includes("Trends & Reports"));
    if (trendsLink) {
        trendsLink.addEventListener("click", (e) => {
            e.preventDefault();
            openReportModal();
        });
    }

    // Header actions "View Trends & Reports" footer link in the line chart card
    const trendsFooterLink = Array.from(document.querySelectorAll("main a.chart-footer-link")).find(el => el.textContent.includes("View Trends & Reports"));
    if (trendsFooterLink) {
        trendsFooterLink.addEventListener("click", (e) => {
            e.preventDefault();
            openReportModal();
        });
    }

    // Modal UI listeners
    const reportOverlay = document.getElementById("report-modal-overlay");
    const reportClose = document.getElementById("report-modal-close");
    const btnGenReport = document.getElementById("btn-generate-report");
    const btnRepBack = document.getElementById("btn-report-back");
    const btnRepPrint = document.getElementById("btn-report-print");

    if (reportClose) reportClose.addEventListener("click", closeReportModal);
    if (reportOverlay) reportOverlay.addEventListener("click", closeReportModal);

    if (btnGenReport) btnGenReport.addEventListener("click", generateReport);
    if (btnRepBack) {
        btnRepBack.addEventListener("click", () => {
            document.getElementById("report-preview-view").style.display = "none";
            document.getElementById("report-config-view").style.display = "block";
        });
    }
    if (btnRepPrint) {
        btnRepPrint.addEventListener("click", () => {
            window.print();
        });
    }
}

// --- Report Generation Helper Functions ---

function openReportModal() {
    document.getElementById("report-config-view").style.display = "block";
    document.getElementById("report-loading-view").style.display = "none";
    document.getElementById("report-preview-view").style.display = "none";
    
    document.getElementById("report-modal").classList.add("open");
    document.getElementById("report-modal-overlay").classList.add("open");
}

function closeReportModal() {
    document.getElementById("report-modal").classList.remove("open");
    document.getElementById("report-modal-overlay").classList.remove("open");
}

async function generateReport() {
    const type = document.getElementById("report-type").value;
    const scope = document.getElementById("report-scope").value;
    const incKpi = document.getElementById("inc-kpi").checked;
    const incCharts = document.getElementById("inc-charts").checked;
    const incTable = document.getElementById("inc-table").checked;
    
    const configView = document.getElementById("report-config-view");
    const loadingView = document.getElementById("report-loading-view");
    const previewView = document.getElementById("report-preview-view");
    const statusText = document.getElementById("report-loading-status");
    
    configView.style.display = "none";
    loadingView.style.display = "block";
    
    const stages = [
        { time: 0, text: "Assembling telemetry logs..." },
        { time: 400, text: "Filtering datasets for selected scope..." },
        { time: 800, text: "Calculating compliance metrics..." },
        { time: 1200, text: "Compiling HTML printable layouts..." }
    ];
    
    stages.forEach(stage => {
        setTimeout(() => {
            statusText.textContent = stage.text;
        }, stage.time);
    });

    let reportHTML = "";
    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, scope, incKpi, incCharts, incTable })
        });
        if (!response.ok) throw new Error("HTTP error: " + response.status);
        const data = await response.json();
        reportHTML = data.html;
    } catch (error) {
        console.warn("Failed to generate report from API. Using local generator.", error);
        reportHTML = buildReportHTML(type, scope, incKpi, incCharts, incTable);
    }
    
    setTimeout(() => {
        loadingView.style.display = "none";
        previewView.style.display = "block";
        document.getElementById("report-print-area").innerHTML = reportHTML;
    }, 1600);
}

function buildReportHTML(type, scope, incKpi, incCharts, incTable) {
    // 1. Filter raw assets matching scope
    const filteredAssets = dashboardData.assets.filter(asset => {
        return scope === "all" || asset.dc === scope;
    });
    
    // 2. Compute aggregate values based on scope
    const totalAssetsCount = filteredAssets.length;
    const criticalCount = filteredAssets.filter(a => a.criticality === "critical").length;
    const highCount = filteredAssets.filter(a => a.criticality === "high").length;
    const mediumCount = filteredAssets.filter(a => a.criticality === "medium").length;
    const lowCount = filteredAssets.filter(a => a.criticality === "low").length;
    
    const avgScore = totalAssetsCount > 0 
        ? +(filteredAssets.reduce((sum, a) => sum + a.score, 0) / totalAssetsCount).toFixed(1)
        : 0;
        
    const complianceRate = scope === "all" 
        ? dashboardData.complianceRate
        : scope === "dc-east" ? 78 : 86; // Scope compliance mock numbers

    // 3. Set titles based on type
    let reportTitle = "EXECUTIVE RISK SUMMARY";
    let subtitle = "High-level posture assessment for datacenter stakeholders";
    if (type === "vulnerability") {
        reportTitle = "DETAILED VULNERABILITY EXPOSURE REPORT";
        subtitle = "Full inventory of CVE signatures and unmitigated risks";
    } else if (type === "compliance") {
        reportTitle = "DATA CENTER COMPLIANCE AUDIT";
        subtitle = "Review of asset patch levels against security standards (SEC-GPU)";
    }

    const timestamp = new Date().toLocaleString();
    const dcLabel = scope === "all" ? "All Data Centers" : scope === "dc-east" ? "DC-East only" : "DC-West only";

    let html = `
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <h1 style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase;">ClawSentinel Security Report</h1>
                <span style="font-size: 10px; color: #64748b;">Generated: ${timestamp}</span>
            </div>
            <p style="font-size: 12px; font-weight: 700; color: #2563eb; margin: 4px 0 0 0; text-transform: uppercase;">${reportTitle}</p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0; font-style: italic;">${subtitle}</p>
        </div>
        
        <div style="margin-bottom: 16px; background-color: #f8fafc; padding: 10px; border-radius: 4px; border-left: 3px solid #64748b;">
            <strong>Scope Parameters:</strong> Target Area: <strong>${dcLabel}</strong> | Analyzed Assets: <strong>${totalAssetsCount}</strong>
        </div>
    `;

    // A. Include KPI Section
    if (incKpi) {
        html += `
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e3a8a; margin-top:0;">1. KEY POSTURE METRICS</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Avg Risk Score</span>
                        <strong style="font-size: 16px; color: ${avgScore >= 7.5 ? '#ef4444' : '#f97316'};">${avgScore} / 10</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Patch Level</span>
                        <strong style="font-size: 16px; color: ${complianceRate >= 80 ? '#10b981' : '#f97316'};">${complianceRate}%</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">Critical Alerts</span>
                        <strong style="font-size: 16px; color: #ef4444;">${criticalCount}</strong>
                    </div>
                    <div style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; text-align: center;">
                        <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:600;">High Risk Nodes</span>
                        <strong style="font-size: 16px; color: #f97316;">${highCount}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    // B. Include Chart Summary Section
    if (incCharts) {
        const critPct = totalAssetsCount > 0 ? ((criticalCount / totalAssetsCount) * 100).toFixed(0) : 0;
        const highPct = totalAssetsCount > 0 ? ((highCount / totalAssetsCount) * 100).toFixed(0) : 0;
        const medPct = totalAssetsCount > 0 ? ((mediumCount / totalAssetsCount) * 100).toFixed(0) : 0;
        const lowPct = totalAssetsCount > 0 ? ((lowCount / totalAssetsCount) * 100).toFixed(0) : 0;

        html += `
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e3a8a;">2. SEVERITY DISTRIBUTION PROFILE</h3>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Critical Severity Assets (Score 9.0+)</span>
                            <strong>${criticalCount} (${critPct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${critPct}%; background: #ef4444; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>High Severity Assets (Score 7.0 - 8.9)</span>
                            <strong>${highCount} (${highPct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${highPct}%; background: #f97316; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Medium Severity Assets (Score 4.0 - 6.9)</span>
                            <strong>${mediumCount} (${medPct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${medPct}%; background: #eab308; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                            <span>Low Severity Assets (Score 0 - 3.9)</span>
                            <strong>${lowCount} (${lowPct}%)</strong>
                        </div>
                        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${lowPct}%; background: #10b981; height: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // C. Include Risky Assets Table
    if (incTable) {
        html += `
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
        `;
        
        filteredAssets.forEach(asset => {
            let color = "#eab308";
            if (asset.criticality === "critical") color = "#ef4444";
            else if (asset.criticality === "high") color = "#f97316";
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px; font-weight: bold;">${asset.name}</td>
                    <td style="padding: 6px; color: #475569;">${asset.ip}</td>
                    <td style="padding: 6px;">${asset.type}</td>
                    <td style="padding: 6px; text-transform: uppercase;">${asset.dc === 'dc-east' ? 'DC-East' : 'DC-West'}</td>
                    <td style="padding: 6px;"><span style="color: ${color}; font-weight: bold;">${asset.criticality.toUpperCase()}</span></td>
                    <td style="padding: 6px; text-align: right; font-weight: bold;">${asset.score}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `
        <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 8px; text-align: center; color: #94a3b8;">
            ClawSentinel Automated Compliance Audit | End of Report | System Health: Operational
        </div>
    `;

    return html;
}
