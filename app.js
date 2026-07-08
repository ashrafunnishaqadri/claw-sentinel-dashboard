// ClawSentinel AI Datacenter Security Dashboard Logic

const API_BASE = "http://localhost:8080/api";
let assetsData = [];

// Application State Management
let state = {
  assets: [],
  selectedId: "GPU-DCE-001",
  activeTab: "overview",
  
  // Table Pagination
  currentPage: 1,
  pageSize: 10,
  
  // Filters and sorting
  searchQuery: "",
  filterType: "all",
  filterZone: "all",
  filterStatus: "all",
  
  sortBy: null,
  sortAscending: true,

  // Selected row checkboxes
  checkedIds: new Set()
};

// Elements DOM Cache
const dom = {
  tableBody: document.getElementById("table-body"),
  pageNumbers: document.getElementById("page-numbers"),
  showingText: document.getElementById("showing-text"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  searchInput: document.getElementById("search-input"),
  selectAllCheck: document.getElementById("select-all-assets"),
  
  // Right side panel details binding
  detailAssetId: document.getElementById("detail-asset-id"),
  detailAssetDesc: document.getElementById("detail-asset-desc"),
  detailCriticalityBadge: document.getElementById("detail-criticality-badge"),
  detailRiskScore: document.getElementById("detail-risk-score"),
  detailRiskLabel: document.getElementById("detail-risk-label"),
  detailHealthStatus: document.getElementById("detail-health-status"),
  detailStatus: document.getElementById("detail-status"),
  detailZone: document.getElementById("detail-zone"),
  detailHexLogo: document.getElementById("detail-hex-logo"),
  detailVulnCount: document.getElementById("detail-vuln-count"),
  
  // Overview Tab Fields
  infoId: document.getElementById("info-id"),
  infoType: document.getElementById("info-type"),
  infoZoneRack: document.getElementById("info-zone-rack"),
  infoIp: document.getElementById("info-ip"),
  infoOs: document.getElementById("info-os"),
  infoLastSeen: document.getElementById("info-last-seen"),
  infoOwner: document.getElementById("info-owner"),
  infoEnv: document.getElementById("info-env"),
  
  detailCvesList: document.getElementById("detail-cves-list"),
  
  workloadName: document.getElementById("workload-name"),
  workloadModel: document.getElementById("workload-model"),
  workloadUtil: document.getElementById("workload-util"),
  workloadMem: document.getElementById("workload-mem"),
  workloadJobId: document.getElementById("workload-job-id"),
  
  hwGpu: document.getElementById("hw-gpu"),
  hwDriver: document.getElementById("hw-driver"),
  hwCpuMem: document.getElementById("hw-cpu-mem"),
  hwStorage: document.getElementById("hw-storage"),
  hwPower: document.getElementById("hw-power"),
  hwTemp: document.getElementById("hw-temp"),
  
  donutChartSvg: document.getElementById("donut-chart-svg"),
  donutScoreText: document.getElementById("donut-score-text"),
  riskLegendList: document.getElementById("risk-legend-list"),
  
  detailActionBadge: document.getElementById("detail-action-badge"),
  detailActionText: document.getElementById("detail-action-text"),
  
  // Tab panels DOM
  tabOverview: document.getElementById("tab-overview"),
  tabVulnerabilities: document.getElementById("tab-vulnerabilities"),
  tabWorkload: document.getElementById("tab-workload"),
  tabNetwork: document.getElementById("tab-network"),
  tabTimeline: document.getElementById("tab-timeline"),
  tabAudit: document.getElementById("tab-audit"),
  
  vulnListDetailed: document.getElementById("vuln-list-detailed"),
  detailTimelineList: document.getElementById("detail-timeline-list"),
  
  btnRefreshAsset: document.getElementById("btn-refresh-asset"),
  btnInvestigate: document.getElementById("btn-investigate"),
  btnRemediate: document.getElementById("btn-remediate")
};

// Initialize Application
async function init() {
  setupEventListeners();
  
  // Fetch initial data from the Java Simulator
  await fetchAssets();
  
  // Start listening for real-time updates
  initSSE();
}

// Fetch live assets from Spring Boot
async function fetchAssets() {
  try {
    const response = await fetch(`${API_BASE}/assets`);
    if (response.ok) {
      assetsData = await response.json();
      state.assets = [...assetsData];
      
      // Ensure the selected ID actually exists in the live data
      if (!assetsData.find(a => a.id === state.selectedId) && assetsData.length > 0) {
        state.selectedId = assetsData[0].id;
      }
      
      render();
      renderSelectedAssetDetails();
    }
  } catch (error) {
    console.error("Failed to connect to Java Simulator at localhost:8080", error);
  }
}

// Listen for live SSE pushes from the Simulator
function initSSE() {
  const eventSource = new EventSource(`${API_BASE}/events`);
  
  eventSource.addEventListener('connected', (e) => {
    console.log("SSE Connected to Simulator:", e.data);
  });

  // When a node is attacked or patched in the simulator, this fires
  eventSource.addEventListener('node-updated', async (e) => {
    console.log("Live update received from Simulator!");
    await fetchAssets();
  });

  eventSource.onerror = (error) => {
    console.warn("SSE Connection lost. Is the Spring Boot simulator running?", error);
  };
}

// Attach Event Listeners
function setupEventListeners() {
  // Global Dropdowns Toggling
  setupDropdown("datacenter-dropdown");
  setupDropdown("timeframe-dropdown");
  setupCustomSelect("export-select", (val) => {
    alert(`Exporting asset details as ${val.toUpperCase()}...`);
  });
  
  // Custom Filters Select Toggling
  setupCustomSelect("type-select", (val) => {
    state.filterType = val;
    state.currentPage = 1;
    render();
  });
  
  setupCustomSelect("zone-select", (val) => {
    state.filterZone = val;
    state.currentPage = 1;
    render();
  });
  
  setupCustomSelect("status-select", (val) => {
    state.filterStatus = val;
    state.currentPage = 1;
    render();
  });
  
  setupCustomSelect("page-size-select", (val) => {
    state.pageSize = parseInt(val);
    state.currentPage = 1;
    render();
  });

  // Search input change
  dom.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    state.currentPage = 1;
    render();
  });

  // Checkbox select all
  dom.selectAllCheck.addEventListener("change", (e) => {
    const activeAssets = getFilteredAndSortedAssets();
    const startIdx = (state.currentPage - 1) * state.pageSize;
    const pageAssets = activeAssets.slice(startIdx, startIdx + state.pageSize);
    
    if (e.target.checked) {
      pageAssets.forEach(a => state.checkedIds.add(a.id));
    } else {
      pageAssets.forEach(a => state.checkedIds.delete(a.id));
    }
    renderTableRows(pageAssets);
  });

  // Pagination click events
  dom.btnPrev.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      render();
    }
  });

  dom.btnNext.addEventListener("click", () => {
    const totalFiltered = getFilteredAndSortedAssets().length;
    const maxPage = Math.ceil(totalFiltered / state.pageSize);
    if (state.currentPage < maxPage) {
      state.currentPage++;
      render();
    }
  });

  // Table sorting headers
  document.querySelectorAll("table.assets-table th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const field = th.getAttribute("data-sort");
      if (state.sortBy === field) {
        state.sortAscending = !state.sortAscending;
      } else {
        state.sortBy = field;
        state.sortAscending = true;
      }
      
      // Update sort visual indicator
      document.querySelectorAll("table.assets-table th.sortable span").forEach(s => s.textContent = "↕");
      th.querySelector("span").textContent = state.sortAscending ? "▲" : "▼";
      
      render();
    });
  });

  // Tabs selection logic
  document.querySelectorAll(".panel-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".panel-tabs .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const targetTab = btn.getAttribute("data-tab");
      state.activeTab = targetTab;
      
      // Show/hide correct panels
      const panels = [dom.tabOverview, dom.tabVulnerabilities, dom.tabWorkload, dom.tabNetwork, dom.tabTimeline, dom.tabAudit];
      panels.forEach(p => {
        if (p) p.classList.remove("active");
      });
      
      const activePanel = document.getElementById("tab-" + targetTab);
      if (activePanel) activePanel.classList.add("active");
    });
  });

  // Refresh Asset Details Button
  dom.btnRefreshAsset.addEventListener("click", () => {
    const icon = dom.btnRefreshAsset.querySelector("svg");
    icon.style.transform = "rotate(360deg)";
    icon.style.transition = "transform 0.8s ease";
    setTimeout(() => {
      icon.style.transform = "none";
      icon.style.transition = "none";
      renderSelectedAssetDetails();
    }, 800);
  });

  // Investigate Asset Action
  dom.btnInvestigate.addEventListener("click", () => {
    alert(`Initiating target threat hunting forensics trace on security node: ${state.selectedId}`);
  });

  // Generate AI Remediation Plan Action
  dom.btnRemediate.addEventListener("click", () => {
    const asset = assetsData.find(a => a.id === state.selectedId);
    alert(`Sentinel AI Engine generating immediate remediation blueprint for ${asset.id}...\nThreat mitigation priority: ${asset.actionBadge}\nResolution path: ${asset.actionText}`);
  });

  // Sidebar Page Switching Logic
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPage = item.getAttribute("data-page");
      console.log("NAV ITEM CLICKED, TARGET PAGE =", targetPage);
      if (!targetPage) return;
      
      document.querySelectorAll(".sidebar-nav .nav-item").forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
      
      document.querySelectorAll(".main-content .page-view").forEach(page => page.classList.remove("active"));
      const activePage = document.getElementById("page-" + targetPage);
      if (activePage) activePage.classList.add("active");
    });
  });

  // Overview Page Interactions
  const btnHeroInvestigate = document.getElementById("btn-hero-investigate");
  if (btnHeroInvestigate) {
    btnHeroInvestigate.addEventListener("click", () => {
      window.viewAssetFromOverview("GPU-DCE-001");
    });
  }

  const btnInvestigateNow = document.getElementById("btn-investigate-now");
  if (btnInvestigateNow) {
    btnInvestigateNow.addEventListener("click", (e) => {
      e.stopPropagation();
      window.viewAssetFromOverview("GPU-DCE-001");
    });
  }

  const overviewAlertCard = document.getElementById("overview-alert-card");
  if (overviewAlertCard) {
    overviewAlertCard.addEventListener("click", () => {
      window.viewAssetFromOverview("GPU-DCE-001");
    });
  }

  const linkViewAllRisks = document.getElementById("link-view-all-risks");
  if (linkViewAllRisks) {
    linkViewAllRisks.addEventListener("click", (e) => {
      e.preventDefault();
      const assetsNav = document.querySelector('.sidebar-nav .nav-item[data-page="assets"]');
      if (assetsNav) assetsNav.click();
    });
  }
}

// Global helper to view asset from Overview page
window.viewAssetFromOverview = function(assetId) {
  state.selectedId = assetId;
  
  // Highlight sidebar Assets link
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(nav => {
    if (nav.getAttribute("data-page") === "assets") {
      nav.classList.add("active");
    } else {
      nav.classList.remove("active");
    }
  });
  
  // Switch visible page
  document.querySelectorAll(".main-content .page-view").forEach(page => page.classList.remove("active"));
  const assetsPage = document.getElementById("page-assets");
  if (assetsPage) assetsPage.classList.add("active");
  
  // Re-render components
  render();
  renderSelectedAssetDetails();
};

// Dropdown utility
function setupDropdown(id) {
  const container = document.getElementById(id);
  if (!container) return;
  const trigger = container.querySelector(".dropdown-trigger");
  if (!trigger) return;
  
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    const menu = container.querySelector(".dropdown-menu");
    if (menu) menu.classList.toggle("show");
  });

  container.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      container.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      const span = trigger.querySelector("span");
      if (span) span.textContent = item.textContent;
      const menu = container.querySelector(".dropdown-menu");
      if (menu) menu.classList.remove("show");
    });
  });
}

// Custom Select Dropdown utility
function setupCustomSelect(id, onChangeCallback) {
  const container = document.getElementById(id);
  if (!container) return;
  const trigger = container.querySelector(".select-trigger");
  if (!trigger) return;
  const label = trigger.querySelector(".trigger-label") || trigger.querySelector("span");
  
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = container.classList.contains("open");
    closeAllDropdowns();
    if (!isOpen) {
      container.classList.add("open");
    }
  });

  container.querySelectorAll(".select-option").forEach(option => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      container.querySelectorAll(".select-option").forEach(o => o.classList.remove("active"));
      option.classList.add("active");
      
      const val = option.getAttribute("data-value");
      if (label) label.textContent = option.textContent;
      container.classList.remove("open");
      
      if (onChangeCallback) onChangeCallback(val);
    });
  });
}

// Global closer for dropdown elements
function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("show"));
  document.querySelectorAll(".custom-select").forEach(s => s.classList.remove("open"));
}

document.addEventListener("click", () => {
  closeAllDropdowns();
});

// Filter & Sort Logic
function getFilteredAndSortedAssets() {
  let list = [...assetsData];

  // 1. Text Search query
  if (state.searchQuery) {
    list = list.filter(a => 
      a.id.toLowerCase().includes(state.searchQuery) ||
      a.ip.toLowerCase().includes(state.searchQuery) ||
      a.type.toLowerCase().includes(state.searchQuery) ||
      a.zone.toLowerCase().includes(state.searchQuery)
    );
  }

  // 2. Dropdown Filter: Type
  if (state.filterType !== "all") {
    list = list.filter(a => a.type === state.filterType);
  }

  // 3. Dropdown Filter: Zone
  if (state.filterZone !== "all") {
    list = list.filter(a => a.zone === state.filterZone);
  }

  // 4. Dropdown Filter: Status
  if (state.filterStatus !== "all") {
    list = list.filter(a => a.status === state.filterStatus || a.health === state.filterStatus);
  }

  // 5. Sorting
  if (state.sortBy) {
    list.sort((a, b) => {
      let valA = a[state.sortBy];
      let valB = b[state.sortBy];

      // Handle nested or custom sort attributes if needed
      if (state.sortBy === "id") { valA = a.id; valB = b.id; }
      if (state.sortBy === "type") { valA = a.type; valB = b.type; }
      if (state.sortBy === "zone") { valA = a.zone; valB = b.zone; }
      if (state.sortBy === "health") { valA = a.health; valB = b.health; }
      if (state.sortBy === "risk") { valA = a.risk; valB = b.risk; }
      if (state.sortBy === "criticality") {
        const critOrder = { "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4 };
        valA = critOrder[a.criticality] || 0;
        valB = critOrder[b.criticality] || 0;
      }
      if (state.sortBy === "status") { valA = a.status; valB = b.status; }
      if (state.sortBy === "ip") {
        // Simple IP sorting
        valA = a.ip.split('.').map(n => parseInt(n).toString().padStart(3, '0')).join('');
        valB = b.ip.split('.').map(n => parseInt(n).toString().padStart(3, '0')).join('');
      }

      if (valA < valB) return state.sortAscending ? -1 : 1;
      if (valA > valB) return state.sortAscending ? 1 : -1;
      return 0;
    });
  }

  return list;
}

// Global Redraw Main Layout
function render() {
  const filtered = getFilteredAndSortedAssets();
  const totalAssets = filtered.length;
  
  // Enforce page bounds
  const maxPage = Math.max(1, Math.ceil(totalAssets / state.pageSize));
  if (state.currentPage > maxPage) {
    state.currentPage = maxPage;
  }
  
  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, totalAssets);
  const pageAssets = filtered.slice(startIdx, endIdx);

  // Render Table
  renderTableRows(pageAssets);
  
  // Render pagination buttons
  renderPagination(totalAssets, maxPage);
  
  // Update footer descriptive text
  dom.showingText.textContent = totalAssets > 0 
    ? `Showing ${startIdx + 1} to ${endIdx} of ${totalAssets} assets`
    : `Showing 0 to 0 of 0 assets`;
}

// Populate table rows HTML
function renderTableRows(pageAssets) {
  dom.tableBody.innerHTML = "";
  
  if (pageAssets.length === 0) {
    dom.tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">No assets match the active search and filter constraints.</td></tr>`;
    return;
  }
  
  pageAssets.forEach(asset => {
    const isChecked = state.checkedIds.has(asset.id);
    const isSelected = state.selectedId === asset.id;
    
    // Status dot color mapping
    const healthDotClass = asset.health.toLowerCase() === "healthy" ? "healthy" : (asset.health.toLowerCase() === "warning" ? "warning" : "critical");
    const statusTextClass = asset.health.toLowerCase() === "healthy" ? "text-healthy" : (asset.health.toLowerCase() === "warning" ? "text-warning" : "text-critical");
    
    // Criticality color class
    let criticalityTextClass = "text-low";
    if (asset.criticality === "HIGH" || asset.criticality === "CRITICAL") criticalityTextClass = "text-critical";
    else if (asset.criticality === "MEDIUM") criticalityTextClass = "text-warning";

    const tr = document.createElement("tr");
    tr.className = isSelected ? "selected" : "";
    tr.dataset.id = asset.id;
    
    tr.innerHTML = `
      <td class="col-checkbox">
        <input type="checkbox" class="row-checkbox" ${isChecked ? "checked" : ""}>
      </td>
      <td class="font-semibold text-white">${asset.id}</td>
      <td>${asset.type}</td>
      <td>${asset.zone}</td>
      <td class="health-cell">
        <span class="status-dot ${healthDotClass}"></span>
        <span class="font-semibold ${statusTextClass}">${asset.health}</span>
      </td>
      <td class="font-semibold text-white">${asset.risk.toFixed(1)}</td>
      <td class="font-semibold ${criticalityTextClass}">${asset.criticality}</td>
      <td class="font-semibold ${asset.status === 'RUNNING' || asset.status === 'UP' ? 'text-healthy' : 'text-critical'}">${asset.status}${asset.status === 'UP' ? ' <span class="status-arrow">▲</span>' : ''}</td>
      <td class="text-secondary">${asset.ip}</td>
    `;
    
    // Click events inside table rows
    tr.querySelector(".row-checkbox").addEventListener("click", (e) => {
      e.stopPropagation(); // Stop row click trigger
      if (e.target.checked) {
        state.checkedIds.add(asset.id);
      } else {
        state.checkedIds.delete(asset.id);
      }
      updateSelectAllCheckboxState(pageAssets);
    });

    tr.addEventListener("click", () => {
      state.selectedId = asset.id;
      document.querySelectorAll("#assets-table tbody tr").forEach(row => row.classList.remove("selected"));
      tr.classList.add("selected");
      renderSelectedAssetDetails();
    });

    dom.tableBody.appendChild(tr);
  });

  updateSelectAllCheckboxState(pageAssets);
}

// Synchronize global checkbox state
function updateSelectAllCheckboxState(pageAssets) {
  if (pageAssets.length === 0) {
    dom.selectAllCheck.checked = false;
    dom.selectAllCheck.indeterminate = false;
    return;
  }
  
  let checkedCount = 0;
  pageAssets.forEach(a => {
    if (state.checkedIds.has(a.id)) checkedCount++;
  });
  
  if (checkedCount === 0) {
    dom.selectAllCheck.checked = false;
    dom.selectAllCheck.indeterminate = false;
  } else if (checkedCount === pageAssets.length) {
    dom.selectAllCheck.checked = true;
    dom.selectAllCheck.indeterminate = false;
  } else {
    dom.selectAllCheck.checked = false;
    dom.selectAllCheck.indeterminate = true;
  }
}

// Generate pagination controls
function renderPagination(totalAssets, maxPage) {
  dom.pageNumbers.innerHTML = "";
  
  dom.btnPrev.disabled = state.currentPage === 1;
  dom.btnNext.disabled = state.currentPage === maxPage;

  for (let i = 1; i <= maxPage; i++) {
    const btn = document.createElement("button");
    btn.className = `page-num ${state.currentPage === i ? "active" : ""}`;
    btn.textContent = i;
    btn.addEventListener("click", () => {
      state.currentPage = i;
      render();
    });
    dom.pageNumbers.appendChild(btn);
  }
}

// Render selected asset detail elements (Right Panel)
function renderSelectedAssetDetails() {
  const asset = assetsData.find(a => a.id === state.selectedId);
  if (!asset) return;

  // Header Details Setup
  dom.detailAssetId.textContent = asset.id;
  dom.detailAssetDesc.textContent = asset.desc;
  
  // Criticality Pill
  dom.detailCriticalityBadge.className = `asset-criticality-badge ${asset.criticality.toLowerCase()}`;
  dom.detailCriticalityBadge.textContent = asset.criticality;
  
  // Hex Logo Colors
  let logoColorClass = "healthy";
  if (asset.health === "DEGRADED" || asset.criticality === "CRITICAL") logoColorClass = "critical";
  else if (asset.health === "WARNING") logoColorClass = "warning";
  dom.detailHexLogo.className = `asset-hex-logo ${logoColorClass}`;

  // Core indicators box
  dom.detailRiskScore.textContent = asset.risk.toFixed(1);
  dom.detailRiskLabel.textContent = asset.criticality;
  
  // Risk style mapping
  let riskClass = "text-low";
  if (asset.risk >= 8.0) riskClass = "text-critical";
  else if (asset.risk >= 4.0) riskClass = "text-warning";
  dom.detailRiskScore.className = `indicator-value ${riskClass}`;
  dom.detailRiskLabel.className = `indicator-status ${riskClass}`;

  // Health and online status
  const healthDotClass = asset.health.toLowerCase() === "healthy" ? "healthy" : (asset.health.toLowerCase() === "warning" ? "warning" : "critical");
  const healthTextClass = asset.health.toLowerCase() === "healthy" ? "text-healthy" : (asset.health.toLowerCase() === "warning" ? "text-warning" : "text-critical");
  
  dom.detailHealthStatus.className = `indicator-value status-indicator ${healthTextClass}`;
  dom.detailHealthStatus.innerHTML = `<span class="status-dot ${healthDotClass}"></span><span class="val-text">${asset.health}</span>`;
  
  const statusColorClass = asset.status === 'RUNNING' || asset.status === 'UP' ? 'text-healthy' : 'text-critical';
  dom.detailStatus.className = `indicator-value ${statusColorClass}`;
  dom.detailStatus.textContent = asset.status;
  
  dom.detailZone.textContent = asset.zone;
  dom.detailVulnCount.textContent = asset.cves.length;

  // Overview Tab: Info Card data bindings
  dom.infoId.textContent = asset.id;
  dom.infoType.textContent = asset.type;
  dom.infoZoneRack.textContent = asset.rack;
  dom.infoIp.textContent = asset.ip;
  dom.infoOs.textContent = asset.os;
  dom.infoLastSeen.textContent = asset.lastSeen;
  dom.infoOwner.textContent = asset.owner;
  dom.infoEnv.textContent = asset.env;

  // Overview Tab: CVE list population
  dom.detailCvesList.innerHTML = "";
  if (asset.cves.length === 0) {
    dom.detailCvesList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">No open vulnerabilities detected.</div>`;
  } else {
    asset.cves.slice(0, 3).forEach(cve => {
      const severityClass = cve.severity.toLowerCase();
      dom.detailCvesList.innerHTML += `
        <div class="cve-item">
          <span class="cve-name">${cve.name}</span>
          <div class="cve-score-group">
            <span class="cve-score ${severityClass === 'critical' || severityClass === 'high' ? 'text-critical' : 'text-warning'}">${cve.score.toFixed(1)}</span>
            <span class="cve-badge ${severityClass}">${cve.severity}</span>
          </div>
        </div>
      `;
    });
    if (asset.cves.length > 3) {
      dom.detailCvesList.innerHTML += `<a href="#" class="more-cves-link" id="link-more-cves">+${asset.cves.length - 3} more</a>`;
      setTimeout(() => {
        const link = document.getElementById("link-more-cves");
        if (link) {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            // Switch to vulnerabilities tab
            const vulnTabBtn = document.querySelector('.panel-tabs button[data-tab="vulnerabilities"]');
            if (vulnTabBtn) vulnTabBtn.click();
          });
        }
      }, 0);
    }
  }

  // Workload details
  dom.workloadName.textContent = asset.workload.name;
  dom.workloadModel.textContent = asset.workload.model;
  dom.workloadUtil.textContent = `${asset.workload.util}%`;
  
  if (asset.workload.mem) {
    dom.workloadMem.innerHTML = asset.workload.mem;
  } else {
    dom.workloadMem.textContent = "N/A";
  }
  dom.workloadJobId.textContent = asset.workload.jobId || "N/A";

  // Hardware configuration card
  dom.hwGpu.textContent = asset.hardware.gpuModel;
  dom.hwDriver.textContent = asset.hardware.gpuDriver;
  dom.hwCpuMem.textContent = asset.hardware.cpuMem;
  dom.hwStorage.textContent = asset.hardware.storage;
  dom.hwPower.textContent = asset.hardware.power;
  dom.hwTemp.textContent = asset.hardware.temp;
  
  if (parseInt(asset.hardware.temp) >= 70) {
    dom.hwTemp.className = "info-val text-critical font-semibold";
  } else if (parseInt(asset.hardware.temp) >= 55) {
    dom.hwTemp.className = "info-val text-warning font-semibold";
  } else {
    dom.hwTemp.className = "info-val text-healthy font-semibold";
  }

  // Recommended Action card
  dom.detailActionBadge.textContent = asset.actionBadge;
  dom.detailActionText.textContent = asset.actionText;
  if (asset.actionBadge === "IMMEDIATE" || asset.actionBadge === "HIGH PRIORITY") {
    dom.detailActionBadge.style.color = "var(--color-critical)";
  } else if (asset.actionBadge === "MEDIUM PRIORITY") {
    dom.detailActionBadge.style.color = "var(--color-warning)";
  } else {
    dom.detailActionBadge.style.color = "var(--text-secondary)";
  }

  // Donut Chart Rendering (SVG)
  renderDonutChart(asset);

  // Tab detailed view lists (Vulnerabilities, Timeline, Network)
  renderDetailedTabContents(asset);
}

// Generate SVG Donut chart sectors
function renderDonutChart(asset) {
  dom.donutScoreText.textContent = asset.risk.toFixed(1);
  
  // Clean dynamic circle elements
  const circles = dom.donutChartSvg.querySelectorAll("circle.donut-segment");
  circles.forEach(c => c.remove());
  
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  
  let currentOffset = 0;
  
  asset.riskContribution.forEach(segment => {
    // If score/risk is low, downscale segment values relative to total risk score
    // Let's compute actual stroke sizes based on segment.pct
    const segmentLength = (segment.pct / 100) * circumference;
    const segmentOffset = currentOffset;
    
    // Increment accumulated offset
    currentOffset -= segmentLength;
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "donut-segment");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", radius.toString());
    circle.setAttribute("fill", "transparent");
    circle.setAttribute("stroke", segment.color);
    circle.setAttribute("stroke-width", "8");
    circle.setAttribute("stroke-dasharray", `${segmentLength.toFixed(2)} ${circumference.toFixed(2)}`);
    circle.setAttribute("stroke-dashoffset", segmentOffset.toFixed(2));
    
    dom.donutChartSvg.appendChild(circle);
  });
  
  // Render Legend
  dom.riskLegendList.innerHTML = "";
  asset.riskContribution.forEach(segment => {
    dom.riskLegendList.innerHTML += `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-color-dot" style="background-color: ${segment.color};"></span>
          <span class="legend-name">${segment.name}</span>
        </div>
        <span class="legend-val">${segment.pct}% <span class="legend-score-sub">(${segment.score.toFixed(1)})</span></span>
      </div>
    `;
  });
}

// Populate deep tabs details
function renderDetailedTabContents(asset) {
  // 1. Detailed Vulnerabilities tab list
  dom.vulnListDetailed.innerHTML = "";
  if (asset.cves.length === 0) {
    dom.vulnListDetailed.innerHTML = `<div class="vuln-detailed-card" style="text-align: center; color: var(--text-muted); padding: 24px;">No vulnerabilities found. System meets active compliance policy guidelines.</div>`;
  } else {
    asset.cves.forEach(cve => {
      const badgeClass = cve.severity.toLowerCase();
      dom.vulnListDetailed.innerHTML += `
        <div class="vuln-detailed-card">
          <div class="vuln-header">
            <span class="vuln-cve">${cve.name}</span>
            <span class="vuln-score-badge ${badgeClass}">${cve.severity} (Score: ${cve.score.toFixed(1)})</span>
          </div>
          <p class="vuln-desc">Security bypass validation vulnerability detected in the virtualization stack. An authenticated remote attacker could bypass sandbox limitations and compromise system memory allocation maps.</p>
          <div class="vuln-meta-row">
            <span>Package: libvirt-qemu</span>
            <span>Fixed Version: 8.0.0-r3</span>
            <span>Detected: 22 May 2025</span>
          </div>
        </div>
      `;
    });
  }

  // 2. Timeline tab list
  dom.detailTimelineList.innerHTML = "";
  const events = asset.timeline.length > 0 ? asset.timeline : [
    { time: "22 May 2025, 08:00:00", title: "Monitoring Pulse Online", desc: "No status drift detected in active workloads", class: "info" }
  ];
  events.forEach(event => {
    dom.detailTimelineList.innerHTML += `
      <div class="timeline-event ${event.class}">
        <span class="event-time">${event.time}</span>
        <h4 class="event-title">${event.title}</h4>
        <p class="event-desc">${event.desc}</p>
      </div>
    `;
  });
}

// Initialize or defer based on readyState
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}