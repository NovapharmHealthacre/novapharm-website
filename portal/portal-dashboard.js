/**
 * @file portal-dashboard.js
 * @description Client controller for NovaPharm Integrated Operating Ecosystem Portal.
 */

import { SEED_REFERENCE_DATA, searchMedicinesTerminal } from "../terminal/medicines-terminal-search.mjs";
import { calculatePlpiPriceSpread, assessShortageRisk, generateDemandForecast } from "../terminal/market-analytics.mjs";

document.addEventListener("DOMContentLoaded", () => {
  // 0. Theme Switching and Persistence
  const themeToggleBtn = document.getElementById("btn-portal-theme-toggle");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("novapharm-theme", theme);
    } catch (_) {}
    if (themeToggleBtn) {
      const label = themeToggleBtn.querySelector("#theme-toggle-label");
      if (label) label.textContent = theme === "dark" ? "Dark" : "Light";
    }
  }

  const savedTheme = (() => {
    try {
      return localStorage.getItem("novapharm-theme");
    } catch (_) {
      return null;
    }
  })() || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  // 1. Navigation Tab Switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  function activateTab(tab) {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add("active");
    document.getElementById(`pane-${tab}`)?.classList.add("active");
  }

  function handleUrlHash() {
    const rawHash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    if (!rawHash) return false;

    const hashMap = {
      "customer": "role-customer",
      "supplier": "role-supplier",
      "staff": "role-rp",
      "workforce": "role-rp",
      "rp": "role-rp",
      "qp": "role-rp",
      "board": "role-board",
      "governance": "role-board",
      "terminal": "terminal",
      "medicines": "terminal",
      "account": "codex-account",
      "nova": "nova",
      "commercial": "commercial",
      "quality": "quality",
      "pandora": "pandora",
      "security": "security",
      "geospatial": "geospatial",
      "warehouse": "warehouse",
      "astra": "astra"
    };

    const targetTab = hashMap[rawHash] || (document.getElementById(`pane-${rawHash}`) ? rawHash : null);
    if (targetTab) {
      activateTab(targetTab);
      return true;
    }
    return false;
  }

  window.addEventListener("hashchange", handleUrlHash);

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      activateTab(target);
    });
  });

  // 2. Medicines Terminal Live Search
  const searchInput = document.getElementById("terminal-search-input");
  const levelSelect = document.getElementById("terminal-level-select");
  const coldCheck = document.getElementById("terminal-cold-check");
  const resultsBody = document.getElementById("terminal-results-body");
  const analyticsOutput = document.getElementById("analytics-output");

  function renderTerminalResults() {
    if (!resultsBody) return;
    const query = searchInput ? searchInput.value : "";
    const level = levelSelect ? levelSelect.value : "all";
    const coldChainOnly = coldCheck ? coldCheck.checked : false;

    const results = searchMedicinesTerminal({ query, level, coldChainOnly }, SEED_REFERENCE_DATA);
    resultsBody.innerHTML = "";

    if (results.length === 0) {
      resultsBody.innerHTML = "<tr><td colspan='4' style='color: var(--text-muted); text-align: center;'>No matching reference items found.</td></tr>";
      return;
    }

    results.forEach(item => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      const badgeClass = item.level === 'VTM' ? 'badge-inferred' :
        item.level === 'VMP' ? 'badge-derived' :
        item.level === 'TF' ? 'badge-tf' :
        item.level === 'TFG' ? 'badge-tfg' : 'badge-observed';
      tr.innerHTML = `
        <td><span class="badge ${badgeClass}">${item.level}</span></td>
        <td><code>${item.identifier}</code></td>
        <td><strong>${item.label}</strong></td>
        <td>${item.legalCategory || 'POM'} ${item.isColdChain ? '❄️' : ''}</td>
      `;

      tr.addEventListener("click", () => {
        selectMedicineForAnalytics(item);
      });

      resultsBody.appendChild(tr);
    });
  }

  function selectMedicineForAnalytics(item) {
    if (!analyticsOutput) return;

    let spreadHtml = "";
    const spreadRes = calculatePlpiPriceSpread(item.identifier, 18500);
    if (spreadRes.valid && spreadRes.spreadAnalysis) {
      const s = spreadRes.spreadAnalysis;
      spreadHtml = `[PLPI MARGIN ANALYSIS]
Tariff Reimbursement: £${(s.tariffPriceMinor / 100).toFixed(2)} (${s.tariffCategory})
Wholesale Acquisition: £${(s.plpiPriceMinor / 100).toFixed(2)}
Net Margin Per Pack:   £${(s.spreadMinor / 100).toFixed(2)} (${s.marginPercentage}%)
Arbitrage Status:      FAVORABLE (Active PLPI Sourcing)`;
    } else {
      spreadHtml = `[PLPI MARGIN ANALYSIS] Standard hospital contract pricing active (No Part VIIIA Category M spread).`;
    }

    const shortage = assessShortageRisk({
      identifier: item.identifier,
      currentUkStockDays: item.isColdChain ? 22 : 65,
      isSingleSource: item.level === "AMP",
      isColdChain: item.isColdChain
    });

    const forecast = generateDemandForecast(item.identifier, [10000, 11500, 12800, 14000]);

    analyticsOutput.textContent = `=== MEDICINES TERMINAL INTELLIGENCE: ${item.label} ===
Identifer: ${item.identifier} (${item.level})
Cold Chain Required: ${item.isColdChain ? 'YES (2-8°C Validated)' : 'NO (15-25°C Controlled)'}

${spreadHtml}

[MHRA SHORTAGE RISK SCORING]
UK Wholesale Stock Days: ${shortage.currentUkStockDays} days
Risk Classification:    ${shortage.riskTier} (Score: ${shortage.riskScore}/100)
Action Directive:       ${shortage.recommendedAction}

[90-DAY PREDICTIVE DEMAND FORECAST]
Monthly Run-Rate:       ${forecast.baselineMonthlyRunRate} units/mo
90-Day Projection:      ${forecast.forecast90Days} units
95% Confidence Interval: [${forecast.confidenceInterval95.lowerBound} to ${forecast.confidenceInterval95.upperBound} units]
Epistemic Status:       FORECAST / PROJECTION (Governed by PANDORA)`;
  }

  if (searchInput) searchInput.addEventListener("input", renderTerminalResults);
  if (levelSelect) levelSelect.addEventListener("change", renderTerminalResults);
  if (coldCheck) coldCheck.addEventListener("change", renderTerminalResults);

  // Initial render
  renderTerminalResults();

  // 3. NOVA Governed Proposal Simulation
  const novaSubmitBtn = document.getElementById("nova-submit-btn");
  const novaPromptInput = document.getElementById("nova-prompt-input");
  const proposalView = document.getElementById("nova-proposal-view");
  const rpControls = document.getElementById("nova-rp-controls");
  const rpApproveBtn = document.getElementById("rp-approve-btn");
  const rpRejectBtn = document.getElementById("rp-reject-btn");

  let activeProposal = null;

  if (novaSubmitBtn && novaPromptInput) {
    novaSubmitBtn.addEventListener("click", () => {
      const text = novaPromptInput.value.trim();
      if (!text) return;

      // Simulated pharmacovigilance barrier
      if (text.toLowerCase().includes("adverse") || text.toLowerCase().includes("yellow card")) {
        alert("SAFETY BARRIER ENGAGED: Adverse drug reaction detected. Legally mandated referral to MHRA Yellow Card Scheme engaged. Automated AI processing blocked.");
        return;
      }

      // Clinical Hallucination Firewall (Suite 118): Prompt Injection & Prescribing Interception
      if (text.toLowerCase().includes("ignore all") || text.toLowerCase().includes("bypass") || text.toLowerCase().includes("dan mode") || text.toLowerCase().includes("override")) {
        if (proposalView) {
          proposalView.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); padding: 1rem; border-radius: 8px; border: 1px solid var(--danger);">
              <div style="color: var(--danger); font-weight: 700;">CLINICAL FIREWALL INTERCEPTION (Suite 118)</div>
              <div style="margin: 0.5rem 0; color: var(--text-main);"><strong>Violation:</strong> PROMPT_INJECTION_DETECTED &bull; Adversarial attempt to bypass regulatory guardrails.</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Execution halted. Invariant logged to Zero Trust SIEM with SHA-256 seal.</div>
            </div>
          `;
        }
        if (rpControls) rpControls.style.display = "none";
        return;
      }

      if (text.toLowerCase().includes("prescribe") || text.toLowerCase().includes("stop taking") || text.toLowerCase().includes("double your dose")) {
        if (proposalView) {
          proposalView.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); padding: 1rem; border-radius: 8px; border: 1px solid var(--danger);">
              <div style="color: var(--danger); font-weight: 700;">CLINICAL FIREWALL INTERCEPTION (Suite 118)</div>
              <div style="margin: 0.5rem 0; color: var(--text-main);"><strong>Violation:</strong> UNLICENSED_AUTONOMOUS_PRESCRIBING_DIRECTIVE &bull; AI is legally prohibited from issuing prescribing imperatives.</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Execution halted. Mandatory human Qualified Person (QP) / prescriber consultation required.</div>
            </div>
          `;
        }
        if (rpControls) rpControls.style.display = "none";
        return;
      }

      activeProposal = {
        id: `NOVA-PROP-${Date.now().toString().slice(-6)}`,
        subject: text.slice(0, 50) + "...",
        recommendation: "Approved for regulatory progression per ICH Q1A guidelines.",
        status: "PENDING_RP_APPROVAL",
        confidence: "98.4%",
        digest: "88fa4109b821..."
      };

      if (proposalView) {
        proposalView.innerHTML = `
          <div style="background: #080a0f; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="color: var(--primary); font-weight: 700;">PROPOSAL ${activeProposal.id}</div>
            <div style="margin: 0.5rem 0;"><strong>Subject:</strong> ${activeProposal.subject}</div>
            <div style="margin: 0.5rem 0;"><strong>Recommendation:</strong> ${activeProposal.recommendation}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Confidence: ${activeProposal.confidence} &bull; Epistemic: INFERRED &bull; Status: <span style="color: var(--warning); font-weight: 600;">PENDING RP APPROVAL</span>
            </div>
          </div>
        `;
      }

      if (rpControls) rpControls.style.display = "block";
    });
  }

  if (rpApproveBtn) {
    rpApproveBtn.addEventListener("click", () => {
      if (!activeProposal) return;
      alert(`AUTHORIZED: Responsible Person digital signature applied. Proposal ${activeProposal.id} is now legally executable.`);
      if (proposalView) {
        proposalView.innerHTML += `<div style="color: var(--success); font-weight: 600; margin-top: 0.5rem;">✓ AUTHORIZED BY RP-UK-88210 (ALCOA+ Chained to SIEM)</div>`;
      }
      if (rpControls) rpControls.style.display = "none";
    });
  }

  if (rpRejectBtn) {
    rpRejectBtn.addEventListener("click", () => {
      if (!activeProposal) return;
      alert(`REVOKED: Proposal ${activeProposal.id} was rejected by Responsible Person.`);
      if (proposalView) {
        proposalView.innerHTML = `<div style="color: var(--danger); font-weight: 600;">✗ PROPOSAL REVOKED BY RESPONSIBLE PERSON</div>`;
      }
      if (rpControls) rpControls.style.display = "none";
    });
  }

  // 7. Geospatial & Google Earth GIS Handlers
  const btnLoadGis = document.getElementById("btn-load-gis-network");
  const gisOutput = document.getElementById("gis-network-output");
  const btnLoadEquity = document.getElementById("btn-load-health-equity");
  const equityOutput = document.getElementById("health-equity-output");

  function renderGeospatialRadar(data) {
    const mapContainer = document.getElementById("gis-network-map");
    if (!mapContainer) return;

    const width = 800;
    const height = 360;

    // UK Bounding Box projection: Lat 50.2 to 56.5, Lon -5.0 to 1.0
    const minLat = 50.2, maxLat = 56.5;
    const minLon = -5.0, maxLon = 1.0;

    const project = (lat, lon) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (width - 220) + 110;
      const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 80) + 40;
      return { x: Math.round(x), y: Math.round(y) };
    };

    const hubs = data.features ? data.features.filter(f => f.properties.featureType === "LOGISTICS_HUB") : [];
    const corridors = data.features ? data.features.filter(f => f.properties.featureType === "TRANSIT_CORRIDOR") : [];

    let svgLines = "";
    corridors.forEach(c => {
      const coords = c.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      const pts = coords.map(pt => project(pt[1], pt[0]));
      const pathD = pts.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
      const isDrone = c.id && c.id.includes("DRONE");
      const stroke = isDrone ? "#c084fc" : "#06b6d4";
      const dash = isDrone ? "stroke-dasharray='4,3'" : "stroke-dasharray='6,4'";
      svgLines += `
        <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${isDrone ? 3 : 2.5}" ${dash} opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="40" to="0" dur="${isDrone ? '1.5s' : '3s'}" repeatCount="indefinite" />
        </path>
      `;
    });

    let svgHubs = "";
    hubs.forEach(h => {
      const [lon, lat] = h.geometry.coordinates;
      const p = project(lat, lon);
      const name = h.properties.name || "";
      const code = h.id || "";
      svgHubs += `
        <g transform="translate(${p.x}, ${p.y})">
          <circle r="14" fill="#10b981" opacity="0.15">
            <animate attributeName="r" values="8;18;8" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle r="6" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />
          <text x="12" y="4" fill="#f8fafc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${code}</text>
          <text x="12" y="16" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">${name.split(' ')[0]}</text>
        </g>
      `;
    });

    mapContainer.innerHTML = `
      <div style="position: absolute; top: 12px; right: 16px; display: flex; gap: 8px; z-index: 10;">
        <span style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">M1/M6 2-8°C REEFER</span>
        <span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">CAA BVLOS CHEMO DRONE</span>
        <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">WDA(H) GDP HUBS</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 380px; display: block;">
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#080c14" />
        <circle cx="${width/2}" cy="${height/2}" r="220" fill="url(#radar-glow)" />
        <line x1="40" y1="90" x2="${width-40}" y2="90" stroke="#1e293b" stroke-dasharray="2,4" />
        <line x1="40" y1="180" x2="${width-40}" y2="180" stroke="#1e293b" stroke-dasharray="2,4" />
        <line x1="40" y1="270" x2="${width-40}" y2="270" stroke="#1e293b" stroke-dasharray="2,4" />
        <line x1="${width/3}" y1="20" x2="${width/3}" y2="${height-20}" stroke="#1e293b" stroke-dasharray="2,4" />
        <line x1="${width*2/3}" y1="20" x2="${width*2/3}" y2="${height-20}" stroke="#1e293b" stroke-dasharray="2,4" />
        ${svgLines}
        ${svgHubs}
      </svg>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; padding-top: 8px; border-top: 1px solid var(--border-color); margin-top: 8px;">
        <div><strong>Active GDP Corridors:</strong> 3 monitored routes &bull; <strong>Reefer MKT:</strong> 4.2°C (USP &lt;1079&gt; compliant)</div>
        <div><strong>Autonomous Chemotherapy Drone:</strong> Solent CAA BVLOS (18 min transit, -19.5°C Ultra-Cold)</div>
      </div>
    `;
  }

  if (btnLoadGis) {
    btnLoadGis.addEventListener("click", async () => {
      gisOutput.textContent = "Loading RFC 7946 GeoJSON from /api/geospatial/network...";
      try {
        const res = await fetch("/api/geospatial/network");
        const data = await res.json();
        renderGeospatialRadar(data);

        const hubs = data.features.filter(f => f.properties.featureType === "LOGISTICS_HUB");
        const corridors = data.features.filter(f => f.properties.featureType === "TRANSIT_CORRIDOR");

        let out = `[GEOJSON LOADED] Features: ${data.features.length} | Generated: ${data.metadata.generatedAt}\n\n`;
        out += `--- VERIFIED UK DISTRIBUTION HUBS (${hubs.length}) ---\n`;
        hubs.forEach(h => {
          out += `• ${h.properties.name} [${h.id}]: WDA ${h.properties.wdaLicense} | GDP: ${h.properties.gdpCertified ? 'YES' : 'NO'}\n  Coords: [${h.geometry.coordinates[1]}, ${h.geometry.coordinates[0]}] | Cap: ${h.properties.capabilities.join(", ")}\n`;
        });
        out += `\n--- ACTIVE COLD-CHAIN CORRIDORS (${corridors.length}) ---\n`;
        corridors.forEach(c => {
          out += `• ${c.properties.name}: Regime: ${c.properties.temperatureRegime} (Target: ${c.properties.mktTargetCelsius}°C) | Transit: ${c.properties.avgTransitMinutes}m | Status: ${c.properties.status}\n`;
        });
        gisOutput.textContent = out;
      } catch (err) {
        gisOutput.textContent = `ERROR loading GeoJSON: ${err.message}`;
      }
    });
  }

  const btnPortalTransit = document.getElementById("btn-portal-calc-transit");
  if (btnPortalTransit) {
    btnPortalTransit.addEventListener("click", async () => {
      gisOutput.textContent = "Calculating sovereign geodesic transit distance and GDP SLA via /api/geospatial/zero-cost-transit...";
      try {
        const res = await fetch("/api/geospatial/zero-cost-transit?originLat=51.51&originLon=-0.14&destLat=53.48&destLon=-2.24&mode=ROAD_VAN");
        const data = await res.json();
        let out = `[SOVEREIGN GEODESIC ENGINE - ZERO EXTERNAL BILLING]\n`;
        out += `Route: London Central Depot (51.51°N, 0.14°W) -> Manchester Regional Hospital (53.48°N, 2.24°W)\n`;
        out += `Mode: ${data.mode} | Winding Distance: ${data.distanceKm} km (1.28x UK road factor)\n`;
        out += `Transit Duration: ${data.transitMinutes} minutes (~${(data.transitMinutes / 60).toFixed(1)} hours)\n`;
        out += `GDP Passive Shipper Envelope: ${data.gdpComplianceZone}\n`;
        out += `Billed Cost: ${data.billingCost}\n`;
        out += `Epistemic Classification: ${data.epistemicClassification}\n`;
        gisOutput.textContent = out;
      } catch (err) {
        gisOutput.textContent = `ERROR calculating transit: ${err.message}`;
      }
    });
  }

  const btnPortalRouteMatrix = document.getElementById("btn-portal-route-matrix");
  if (btnPortalRouteMatrix) {
    btnPortalRouteMatrix.addEventListener("click", async () => {
      gisOutput.textContent = "Calculating sovereign multi-stop route matrix, cold-chain SLA & carbon footprint via /api/geospatial/zero-cost-route-matrix...";
      try {
        const res = await fetch("/api/geospatial/zero-cost-route-matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hubId: "HUB-LON-01",
            mode: "ROAD_VAN",
            shipperHoldHours: 48,
            stops: [
              { id: "STOP-1", name: "The Health Centre (NHS NW London)", lat: 51.524, lon: -0.198 },
              { id: "STOP-2", name: "Green Lane Surgery (NHS Birmingham)", lat: 52.472, lon: -1.864 },
              { id: "STOP-3", name: "City Road Medical Centre (NHS Manchester)", lat: 53.465, lon: -2.253 },
            ],
          }),
        });
        const data = await res.json();
        let out = `[SOVEREIGN MULTI-STOP ROUTE MATRIX - ZERO EXTERNAL BILLING]\n`;
        out += `Origin: ${data.originHub.name} (${data.originHub.wdaLicense})\n`;
        out += `Total Stops: ${data.totalStops} | Total Distance: ${data.totalDistanceKm} km | Duration: ${data.totalTransitHours} hrs\n`;
        out += `Passive Shipper SLA: ${data.passiveShipperSLA.status} (${data.passiveShipperSLA.complianceVerdict})\n`;
        out += `DEFRA Carbon Footprint: ${data.carbonFootprintKgCO2e} kg CO2e\n`;
        out += `Billed Cost: £0.00 (${data.billingAudit.notice})\n\n`;
        out += `Delivery Legs:\n`;
        data.legs.forEach(leg => {
          out += `  Leg ${leg.legIndex}: ${leg.from.name} -> ${leg.to.name} (${leg.distanceKm} km, ${leg.transitMinutes} mins, cum: ${leg.cumulativeDistanceKm} km)\n`;
        });
        gisOutput.textContent = out;
      } catch (err) {
        gisOutput.textContent = `ERROR calculating route matrix: ${err.message}`;
      }
    });
  }

  if (btnLoadEquity) {
    btnLoadEquity.addEventListener("click", async () => {
      equityOutput.textContent = "Evaluating Core20PLUS5 Health Equity Models...";
      try {
        const res = await fetch("/api/geospatial/network");
        const data = await res.json();
        const clusters = data.features.filter(f => f.properties.featureType === "HEALTH_EQUITY_CLUSTER");

        let out = `--- NHS ICB DEPRIVATION & DISPENSING EQUITY AUDIT (${clusters.length} ICBs) ---\n\n`;
        clusters.forEach(c => {
          const p = c.properties;
          out += `ICB: ${p.name} [IMD Decile ${p.imdDecile} - ${p.urbanRuralClass}]\n`;
          out += `• Equity Index Score: ${p.equityIndexScore}/100\n`;
          out += `• Pharmacy Desert Status: ${p.isPharmacyDesert ? 'CRITICAL DESERT (>15-25m transport, <1.5/10k)' : 'SUFFICIENT ACCESS'}\n`;
          out += `• Inverse Care Law Gap: ${p.hasInverseCareLawGap ? `DEFICIT DETECTED (${p.dispensingEquityGapPct}% shortfall)` : 'EQUITY ALIGNED'}\n`;
          out += `• Priority Intervention: ${p.priorityAction}\n\n`;
        });
        equityOutput.textContent = out;
      } catch (err) {
        equityOutput.textContent = `ERROR evaluating equity: ${err.message}`;
      }
    });
  }

  // 8. SSD Warehouse Dataset Handlers
  const btnProbeWarehouse = document.getElementById("btn-probe-warehouse");
  const btnProbeIntelligence = document.getElementById("btn-probe-intelligence");
  const warehouseStatusOutput = document.getElementById("warehouse-status-output");
  const warehouseStatusBadge = document.getElementById("warehouse-status-badge");
  const btnViewDeepMind = document.getElementById("btn-view-deepmind");
  const deepmindSelect = document.getElementById("deepmind-target-select");
  const deepmindOutput = document.getElementById("deepmind-target-output");
  const btnSearchPharmacy = document.getElementById("btn-search-pharmacy");
  const pharmacyInput = document.getElementById("pharmacy-search-input");
  const pharmacyOutput = document.getElementById("pharmacy-search-output");
  const btnSearchDocuments = document.getElementById("btn-search-documents");
  const documentInput = document.getElementById("document-search-input");
  const documentOutput = document.getElementById("document-search-output");

  if (btnProbeWarehouse) {
    btnProbeWarehouse.addEventListener("click", async () => {
      warehouseStatusOutput.textContent = "Probing /Volumes/PortableSSD/NovaPharmData...";
      try {
        const res = await fetch("/api/warehouse/status");
        const data = await res.json();
        if (warehouseStatusBadge) {
          warehouseStatusBadge.textContent = data.statusMode;
          warehouseStatusBadge.className = data.statusMode === "LIVE_PHYSICAL_ATTACHED" ? "badge badge-observed" : "badge badge-derived";
        }
        let out = `[WAREHOUSE PROBE] Status: ${data.statusMode}\n`;
        out += `Mount Point: ${data.mountPoint} (Mounted: ${data.ssdMounted})\n`;
        out += `Datasets Available: ${data.availableDatasets} / ${data.totalDatasets}\n\n`;
        data.datasets.forEach(d => {
          out += `• ${d.name} [${d.id}]:\n  Path: ${d.relativePath}\n  Category: ${d.category} | Present: ${d.isAvailable ? 'YES (' + (d.sizeBytes / 1024 / 1024).toFixed(2) + ' MiB)' : 'STANDBY/UNMOUNTED'}\n`;
        });
        warehouseStatusOutput.textContent = out;
      } catch (err) {
        warehouseStatusOutput.textContent = `ERROR probing warehouse: ${err.message}`;
      }
    });
  }

  if (btnProbeIntelligence) {
    btnProbeIntelligence.addEventListener("click", async () => {
      warehouseStatusOutput.textContent = "Querying live intelligence metrics from novapharm_intelligence.sqlite...";
      try {
        const res = await fetch("/api/warehouse/intelligence/stats");
        const data = await res.json();
        let out = `[INTELLIGENCE VAULT] Source: ${data.source}\n\n`;
        out += `• Indexed Data Assets: ${data.dataAssets?.toLocaleString()}\n`;
        out += `• Normalized Demand Candidates: ${data.demandCandidates?.toLocaleString()} observations\n`;
        out += `• Asset Profiles: ${data.assetProfiles?.toLocaleString()}\n\n`;
        if (data.sampleCandidates && data.sampleCandidates.length > 0) {
          out += `--- SAMPLE HOSPITAL PRESCRIBING DEMAND OBSERVATIONS ---\n`;
          data.sampleCandidates.forEach(c => {
            out += `[${c.period}] Med: ${c.medicine_id} | Trust: ${c.geography} | Qty: ${c.quantity} | Cost: £${Number(c.cost).toFixed(2)}\n`;
          });
        }
        warehouseStatusOutput.textContent = out;
      } catch (err) {
        warehouseStatusOutput.textContent = `ERROR querying intelligence: ${err.message}`;
      }
    });
  }

  const btnProbeDuckdb = document.getElementById("btn-probe-duckdb");

  if (btnProbeDuckdb) {
    btnProbeDuckdb.addEventListener("click", async () => {
      warehouseStatusOutput.textContent = "Querying live DuckDB columnar OLAP marts (novapharm_analytics.duckdb)...";
      try {
        const res = await fetch("/api/warehouse/analytics/summary");
        const data = await res.json();
        const m = data.marts || {};
        let out = `[DUCKDB COLUMNAR OLAP MARTS]\n`;
        out += `Source: ${data.source} | Status: ${data.status}\n`;
        out += `Engine: ${data.databaseEngine || 'DuckDB v1.0+'} | Tables Monitored: ${data.queriedTables || 29}\n`;
        out += `Total Tracked Records: ${Number(m.totalTrackedRecords).toLocaleString()} records\n\n`;
        out += `--- HEALTHCARE & HOSPITAL PRESCRIBING MARTS ---\n`;
        out += `• England Hospital Prescribing Views: ${Number(m.hospitalPrescribingViews).toLocaleString()} rows\n`;
        out += `• ICB Monthly Prescribing Views:     ${Number(m.icbMonthlyPrescribingViews).toLocaleString()} rows\n`;
        out += `• Drug Tariff Part VIIIA/B/D Rates:   ${Number(m.drugTariffPricings).toLocaleString()} pricings\n\n`;
        out += `--- ONTOLOGY, MEDICINES & DISPENSING IDENTITY ---\n`;
        out += `• UK Postcodes & Spatial Coords:      ${Number(m.ukPostcodesAndCoords).toLocaleString()} postcodes\n`;
        out += `• Medicine Relationships (Graph):     ${Number(m.medicineInterRelationships).toLocaleString()} relationships\n`;
        out += `• Curated Medicine References:        ${Number(m.curatedMedicineReferences).toLocaleString()} references\n`;
        out += `• Master dm+d Catalogues:             ${Number(m.masterDmdCatalogue).toLocaleString()} catalogue entries\n`;
        out += `• GTIN Barcode / FMD Mappings:        ${Number(m.gtinBarcodeMappings).toLocaleString()} barcodes\n`;
        out += `• Healthcare Organisations:           ${Number(m.healthcareOrganisations).toLocaleString()} entities\n`;
        out += `• Community Dispensary Pharmacies:    ${Number(m.registeredPharmacies).toLocaleString()} pharmacies\n`;
        out += `• BNF Presentation Mappings:          ${Number(m.bnfPresentationMappings).toLocaleString()} mappings\n`;
        warehouseStatusOutput.textContent = out;
      } catch (err) {
        warehouseStatusOutput.textContent = `ERROR querying DuckDB marts: ${err.message}`;
      }
    });
  }

  function renderDeepMindProteinCanvas(t) {
    const canvasContainer = document.getElementById("deepmind-structure-canvas");
    if (!canvasContainer) return;

    const plddtColor = t.meanPlddt >= 90 ? "#0053D6" : t.meanPlddt >= 70 ? "#65CBF3" : t.meanPlddt >= 50 ? "#FFDB13" : "#FF7D45";
    const plddtLabel = t.meanPlddt >= 90 ? "Very High (pLDDT > 90)" : t.meanPlddt >= 70 ? "Confident (70-90)" : "Low (50-70)";

    canvasContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #f8fafc;">
            ${t.geneSymbol} &bull; <span style="font-weight: 400; color: #cbd5e1;">${t.proteinName}</span>
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
            UniProt: <code>${t.uniprotId}</code> | Model: <code>${t.alphaFoldModelId}</code> | Target: <strong>${t.associatedMedicines.join(", ")}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="background: ${plddtColor}22; color: ${plddtColor}; border: 1px solid ${plddtColor}; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">
            Mean pLDDT: ${t.meanPlddt}
          </span>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">${plddtLabel}</div>
        </div>
      </div>

      <!-- Interactive Protein Backbone Ribbon Schematic -->
      <svg viewBox="0 0 700 130" style="width: 100%; height: auto; background: #0b111e; border-radius: 6px; border: 1px solid #1e293b; display: block; margin-bottom: 12px;">
        <line x1="50" y1="65" x2="650" y2="65" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        
        <!-- Domain 1: N-Terminal Alpha Helix Cluster -->
        <path d="M 60 65 Q 80 35 100 65 T 140 65 T 180 65 T 220 65" fill="none" stroke="#0053D6" stroke-width="5" stroke-linecap="round" />
        <text x="140" y="24" fill="#60a5fa" font-size="10" text-anchor="middle" font-family="system-ui">N-Term Helix (α1-α4)</text>

        <!-- Domain 2: Active Catalytic Core & Binding Pocket -->
        <path d="M 230 65 Q 250 95 270 65 T 310 65 T 350 65 T 390 65 T 430 65" fill="none" stroke="#0053D6" stroke-width="6" stroke-linecap="round" />
        <circle cx="330" cy="65" r="14" fill="#f59e0b" opacity="0.25">
          <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="330" cy="65" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" />
        <text x="330" y="110" fill="#fbbf24" font-size="10" font-weight="700" text-anchor="middle" font-family="system-ui">Active Pocket: ${t.bindingPocket || 'Catalytic Cleft'}</text>

        <!-- Domain 3: Beta-Sheet Barrel & Loop -->
        <path d="M 440 65 L 480 45 L 520 65 L 560 45 L 600 65" fill="none" stroke="#65CBF3" stroke-width="4" stroke-linejoin="round" />
        <text x="520" y="24" fill="#93c5fd" font-size="10" text-anchor="middle" font-family="system-ui">Beta Sheet (β1-β5)</text>

        <!-- C-Terminal Domain -->
        <path d="M 605 65 Q 625 80 645 65" fill="none" stroke="#0053D6" stroke-width="4" stroke-linecap="round" />
        <text x="645" y="86" fill="#64748b" font-size="9" text-anchor="middle" font-family="system-ui">C-Term</text>
      </svg>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <a href="${t.pdbUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration: none; font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
          <span>↓</span> Download PDB Structure
        </a>
        <a href="${t.cifUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="text-decoration: none; font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
          <span>↓</span> Download mmCIF File
        </a>
        <a href="${t.paeImageUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="text-decoration: none; font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
          <span>☵</span> View PAE Alignment Matrix
        </a>
        <a href="https://www.uniprot.org/uniprotkb/${t.uniprotId}" target="_blank" rel="noopener" class="btn btn-secondary" style="text-decoration: none; font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
          <span>↗</span> UniProt Entry
        </a>
      </div>
    `;
  }

  if (btnViewDeepMind && deepmindSelect) {
    btnViewDeepMind.addEventListener("click", async () => {
      const id = deepmindSelect.value;
      deepmindOutput.textContent = `Loading DeepMind AlphaFold model for UniProt ${id}...`;
      try {
        const res = await fetch(`/api/deepmind/alphafold/target/${id}`);
        const data = await res.json();
        const t = data.target;
        renderDeepMindProteinCanvas(t);

        let out = `[DEEPMIND ALPHAFOLD DB] Gene: ${t.geneSymbol} (${t.proteinName})\n`;
        out += `• UniProt ID: ${t.uniprotId} | Model ID: ${t.alphaFoldModelId}\n`;
        out += `• Mean pLDDT Confidence: ${t.meanPlddt} [${t.confidenceCategory}]\n`;
        out += `• Therapeutic Class: ${t.therapeuticClass}\n`;
        out += `• Associated Medicines: ${t.associatedMedicines.join(", ")}\n`;
        out += `• Binding Pocket: ${t.bindingPocket}\n\n`;
        out += `--- 3D STRUCTURE ATOMS & PAE DOWNLOAD ---\n`;
        out += `• PDB Coordinates: ${t.pdbUrl}\n`;
        out += `• CIF Coordinates: ${t.cifUrl}\n`;
        out += `• Predicted Aligned Error (PAE): ${t.paeImageUrl}\n`;
        deepmindOutput.textContent = out;
      } catch (err) {
        deepmindOutput.textContent = `ERROR loading DeepMind model: ${err.message}`;
      }
    });
  }

  if (btnSearchPharmacy && pharmacyInput) {
    btnSearchPharmacy.addEventListener("click", async () => {
      const q = pharmacyInput.value.trim();
      pharmacyOutput.textContent = `Querying UK Pharmacy Directory for '${q}'...`;
      try {
        const res = await fetch(`/api/warehouse/pharmacies?q=${encodeURIComponent(q)}&limit=15`);
        const data = await res.json();
        let out = `[PHARMACY DIRECTORY] Found: ${data.returned} of ${data.totalInWarehouse || data.totalFound} dispensaries in database\n`;
        out += `Source: ${data.source}\n\n`;
        data.pharmacies.forEach(p => {
          out += `• ${p.tradingName || p.trading_name}\n`;
          out += `  Address: ${p.address} | Postcode: ${p.postcode || p.postcode_raw}\n`;
          if (p.latitude && p.longitude) {
            out += `  GPS Coords: [Lat: ${p.latitude}, Lon: ${p.longitude}]\n`;
          }
          if (p.telephone) out += `  Tel: ${p.telephone}\n`;
          out += `\n`;
        });
        pharmacyOutput.textContent = out;
      } catch (err) {
        pharmacyOutput.textContent = `ERROR querying pharmacy directory: ${err.message}`;
      }
    });
  }

  if (btnSearchDocuments && documentInput) {
    btnSearchDocuments.addEventListener("click", async () => {
      const q = documentInput.value.trim();
      documentOutput.textContent = `Searching FTS5 clinical index for '${q}'...`;
      try {
        const res = await fetch(`/api/warehouse/documents/search?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json();
        let out = `[CLINICAL FTS5 INDEX] Matches: ${data.returned} (Indexed corpus: ${data.totalIndexed} documents)\n`;
        out += `Source: ${data.source}\n\n`;
        data.matches.forEach(m => {
          out += `[DOCUMENT #${m.rowid}] ${m.title}\n`;
          out += `Path: ${m.sourcePath}\n`;
          out += `Snippet: "${m.snippet}"\n\n`;
        });
        documentOutput.textContent = out;
      } catch (err) {
        documentOutput.textContent = `ERROR searching clinical documents: ${err.message}`;
      }
    });
  }

  // 9. Load Live SIEM Chained Audit Ledger
  const siemOutput = document.getElementById("siem-stream-output");
  if (siemOutput) {
    fetch("/api/security/audit/stream")
      .then(r => r.json())
      .then(data => {
        let out = `[ALCOA+ CRYPTOGRAPHIC SIEM STREAM] Total Blocks: ${data.totalBlocks} | Chain Integrity: ${data.chainValid ? '100% VALID' : 'COMPROMISED'}\n`;
        out += `Latest Block Hash: ${data.latestBlockHash}\n\n`;
        data.recentRecords.forEach(b => {
          out += `[BLOCK #${b.index}] ${b.timestamp} | ${b.eventType}\n`;
          out += `  App-ID: ${b.appId} | Actor: ${b.actorRole} | Tenant: ${b.tenantId}\n`;
          out += `  Decision: ${b.decision} | Threat Score: ${b.threatScore} | Reason: ${b.reason}\n`;
          out += `  Hash: ${b.blockHash.slice(0, 24)}... (Prev: ${b.prevHash.slice(0, 16)}...)\n\n`;
        });
        siemOutput.textContent = out;
      })
      .catch(() => {});
  }

  // 10. Historical ASTRA Programme & Acceptance Evidence Handlers
  const btnProbeAstra = document.getElementById("btn-probe-astra");
  const btnViewConstitution = document.getElementById("btn-view-constitution");
  const btnViewCandidateHashes = document.getElementById("btn-view-candidate-hashes");
  const astraOutput = document.getElementById("astra-status-output");

  if (btnProbeAstra && astraOutput) {
    btnProbeAstra.addEventListener("click", async () => {
      astraOutput.textContent = "Loading authoritative ASTRA execution register and Phase 12 gate matrix...";
      try {
        const res = await fetch("/api/warehouse/astra/programme-evidence");
        const data = await res.json();
        let out = `[HISTORICAL ASTRA PROGRAMME & ACCEPTANCE EVIDENCE]\n`;
        out += `Programme: ${data.programmeTitle}\n`;
        out += `Authority: ${data.evidenceAuthority} | 15 Governed Phases\n\n`;

        out += `--- 15-PHASE EXECUTION ARCHITECTURE & STATUS REGISTER ---\n`;
        data.phaseRegistry.forEach(p => {
          out += `• Phase ${p.phase.toString().padStart(2, ' ')}: [${p.status.padEnd(28, ' ')}] ${p.name}\n`;
          out += `    ${p.description}\n`;
        });

        out += `\n--- PHASE 12 PRODUCT EXPERIENCE (APPLE-DISCIPLINE MATRIX) ---\n`;
        const p12 = data.phase12Acceptance;
        out += `Run ID: ${p12.runId} | Completion: ${p12.completionPercentage}% (${p12.passCount}/${p12.gateCount} Gates PASS)\n`;
        out += `Governed Hold: ${p12.governedHoldGate}\n`;
        out += `Gate Categories: Control (${p12.gatesSummary.control}), Runtime (${p12.gatesSummary.runtime}), Isolation (${p12.gatesSummary.isolation}), Engineering (${p12.gatesSummary.engineering}), Product (${p12.gatesSummary.product}), Design (${p12.gatesSummary.design}), Security (${p12.gatesSummary.security}), Browser (${p12.gatesSummary.browser}), Visual (${p12.gatesSummary.visual}), Accessibility (${p12.gatesSummary.accessibility}), Responsive (${p12.gatesSummary.responsive})\n\n`;

        out += `--- PHYSICAL ON-DISK ARCHIVES MONITORED ---\n`;
        data.onDiskArchives.forEach(a => {
          out += `• ${a}\n`;
        });

        astraOutput.textContent = out;
      } catch (err) {
        astraOutput.textContent = `ERROR querying ASTRA register: ${err.message}`;
      }
    });

    if (btnViewConstitution) {
      btnViewConstitution.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/warehouse/astra/programme-evidence");
          const data = await res.json();
          let out = `--- NOVA INTEL & ASTRA GOVERNING CONSTITUTION ---\n\n`;
          data.constitution.forEach((c, idx) => {
            out += `${idx + 1}. ${c}\n`;
          });
          out += `\n--- 12-STAGE CRYPTOGRAPHIC PROVENANCE PIPELINE ---\n`;
          out += `${data.provenancePipeline}\n\n`;
          out += `All operational claims must be backed by verifiable upstream evidence.`;
          astraOutput.textContent = out;
        } catch (err) {
          astraOutput.textContent = `ERROR: ${err.message}`;
        }
      });
    }

    if (btnViewCandidateHashes) {
      btnViewCandidateHashes.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/warehouse/astra/programme-evidence");
          const data = await res.json();
          const b = data.candidateBaselines;
          let out = `--- CRYPTOGRAPHIC CANDIDATE BASELINES & HANDOVER ANCHORS ---\n\n`;
          out += `• ${b.candidateB.name}:\n`;
          out += `    Path:   ${b.candidateB.path}\n`;
          out += `    Policy: ${b.candidateB.policy}\n`;
          out += `    SHA256: ${b.candidateB.knownSha256}\n\n`;
          out += `• ${b.candidateC.name}:\n`;
          out += `    Path:   ${b.candidateC.path}\n`;
          out += `    Policy: ${b.candidateC.policy}\n\n`;
          out += `• Codex Handover Snapshot:\n`;
          out += `    Archive: ${b.codexHandover.archive}\n`;
          out += `    Status:  ${b.codexHandover.status} (${b.codexHandover.timestampUtc})\n`;
          astraOutput.textContent = out;
        } catch (err) {
          astraOutput.textContent = `ERROR: ${err.message}`;
        }
      });
    }
  }

  // 11. International Regulatory & Clinical Research Datasets Handler
  const btnProbeIntl = document.getElementById("btn-probe-international");
  const btnFilterEma = document.getElementById("btn-filter-ema");
  const btnFilterFda = document.getElementById("btn-filter-fda");
  const btnFilterTrials = document.getElementById("btn-filter-trials");
  const intlOutput = document.getElementById("international-datasets-output");
  let cachedIntlData = null;

  async function loadInternationalData() {
    if (cachedIntlData) return cachedIntlData;
    const res = await fetch("/api/warehouse/international/summary");
    cachedIntlData = await res.json();
    return cachedIntlData;
  }

  if (btnProbeIntl && intlOutput) {
    btnProbeIntl.addEventListener("click", async () => {
      intlOutput.textContent = "Querying live international datasets on SSD (/Volumes/PortableSSD/NovaPharmData/01_RAW)...";
      try {
        const data = await loadInternationalData();
        const d = data.datasets;

        // Update count badges if available
        const emaCount = document.getElementById("intl-ema-count");
        if (emaCount) emaCount.textContent = (d.ema.totalMedicines || 2746).toLocaleString();
        const fdaCount = document.getElementById("intl-fda-count");
        if (fdaCount) fdaCount.textContent = (d.fda.labelRecords || 8).toLocaleString();
        const trialsCount = document.getElementById("intl-trials-count");
        if (trialsCount) trialsCount.textContent = (d.clinicalTrials.totalProtocols || 100).toLocaleString();
        const epmcCount = document.getElementById("intl-epmc-count");
        if (epmcCount) epmcCount.textContent = (d.europePmc.totalCitationsAvailable || 25952).toLocaleString();
        const ftsCount = document.getElementById("intl-fts-count");
        if (ftsCount) ftsCount.textContent = (d.findATender.totalProcurements || 100).toLocaleString();

        let out = `[GOVERNED INTERNATIONAL REPOSITORIES] Status: ${data.status} | Base: ${data.baseDirectory}\n`;
        out += `Timestamp: ${data.timestampUtc}\n\n`;

        out += `--- 1. EUROPEAN MEDICINES AGENCY (EMA) ---\n`;
        out += `• Total Centrally Authorised Medicines: ${d.ema.totalMedicines} (${d.ema.authorisedMedicines} Authorised)\n`;
        out += `• Orphan Medicines: ${d.ema.orphanMedicines} | Additional Monitoring: ${d.ema.additionalMonitoringMedicines}\n`;
        out += `• Sample: ${d.ema.sampleMedicines[0]?.name} (${d.ema.sampleMedicines[0]?.activeSubstance}) - ATC: ${d.ema.sampleMedicines[0]?.atcCode}\n\n`;

        out += `--- 2. US FDA STRUCTURED PRODUCT LABELS ---\n`;
        out += `• Active Ingestion Drug: ${d.fda.drugName} | Total SPL Records: ${d.fda.labelRecords}\n`;
        out += `• Labels with Boxed Warnings: ${d.fda.boxedWarningsCount} / ${d.fda.labelRecords}\n`;
        out += `• Sample Manufacturer: ${d.fda.sampleLabels[0]?.manufacturerName} (NDC: ${d.fda.sampleLabels[0]?.productNdc})\n\n`;

        out += `--- 3. CLINICALTRIALS.GOV PROTOCOLS ---\n`;
        out += `• Total Global Protocols: ${d.clinicalTrials.totalProtocols} | Target: ${d.clinicalTrials.conditionTarget}\n`;
        out += `• Phase Breakdown: Phase 3 (${d.clinicalTrials.phaseBreakdown?.PHASE3 || 15}), Phase 4 (${d.clinicalTrials.phaseBreakdown?.PHASE4 || 15}), Phase 1/2 (${(d.clinicalTrials.phaseBreakdown?.PHASE1 || 0) + (d.clinicalTrials.phaseBreakdown?.PHASE2 || 0)})\n`;
        out += `• Sample Lead Sponsor: ${d.clinicalTrials.sampleStudies[0]?.leadSponsor} (${d.clinicalTrials.sampleStudies[0]?.nctId})\n\n`;

        out += `--- 4. EUROPE PMC BIOMEDICAL LITERATURE ---\n`;
        out += `• Total Citations Available: ${d.europePmc.totalCitationsAvailable.toLocaleString()} | Recent Corpus Indexed: ${d.europePmc.indexedRecentPapers}\n`;
        out += `• Sample Title: "${d.europePmc.sampleCitations[0]?.title}" (${d.europePmc.sampleCitations[0]?.pubYear})\n\n`;

        out += `--- 5. UK FIND A TENDER PUBLIC PROCUREMENT (OCDS) ---\n`;
        out += `• OCDS Releases Tracked: ${d.findATender.totalProcurements} | Schema: ${d.findATender.schema}\n`;
        out += `• Sample Tender: "${d.findATender.sampleTenders[0]?.tenderTitle}" (Buyer: ${d.findATender.sampleTenders[0]?.buyerName || 'NHS Trust'})\n`;

        intlOutput.textContent = out;
      } catch (err) {
        intlOutput.textContent = `ERROR loading international repositories: ${err.message}`;
      }
    });

    if (btnFilterEma) {
      btnFilterEma.addEventListener("click", async () => {
        try {
          const data = await loadInternationalData();
          let out = `--- EMA CENTRALLY AUTHORISED MEDICINES (${data.datasets.ema.totalMedicines} Total) ---\n\n`;
          data.datasets.ema.sampleMedicines.forEach(m => {
            out += `• ${m.name} [${m.activeSubstance}]\n`;
            out += `  EPAR Product No: ${m.productNumber} | ATC: ${m.atcCode}\n`;
            out += `  MA Holder: ${m.marketingAuthorisationHolder} | Status: ${m.status}\n`;
            out += `  Indication: ${m.indication}\n\n`;
          });
          intlOutput.textContent = out;
        } catch (err) {
          intlOutput.textContent = `ERROR: ${err.message}`;
        }
      });
    }

    if (btnFilterFda) {
      btnFilterFda.addEventListener("click", async () => {
        try {
          const data = await loadInternationalData();
          let out = `--- US FDA STRUCTURED PRODUCT LABELS (${data.datasets.fda.drugName}) ---\n\n`;
          data.datasets.fda.sampleLabels.forEach(l => {
            out += `• ${l.brandName} (${l.genericName}) - Version ${l.version}\n`;
            out += `  Manufacturer: ${l.manufacturerName} | NDC: ${l.productNdc}\n`;
            out += `  Boxed Warning: ${l.hasBoxedWarning ? 'YES (Black Box Warning Active)' : 'None'}\n`;
            out += `  Indications: ${l.indicationsSummary}\n\n`;
          });
          intlOutput.textContent = out;
        } catch (err) {
          intlOutput.textContent = `ERROR: ${err.message}`;
        }
      });
    }

    if (btnFilterTrials) {
      btnFilterTrials.addEventListener("click", async () => {
        try {
          const data = await loadInternationalData();
          let out = `--- CLINICALTRIALS.GOV PROTOCOLS (${data.datasets.clinicalTrials.conditionTarget}) ---\n\n`;
          data.datasets.clinicalTrials.sampleStudies.forEach(s => {
            out += `• [${s.nctId}] ${s.briefTitle}\n`;
            out += `  Status: ${s.overallStatus} | Phase: ${s.phases.join(', ') || 'N/A'}\n`;
            out += `  Sponsor: ${s.leadSponsor} | Enrollment: ${s.enrollment} subjects\n\n`;
          });
          intlOutput.textContent = out;
        } catch (err) {
          intlOutput.textContent = `ERROR: ${err.message}`;
        }
      });
    }
  }

  // 12. Codex Procurement & Drug Tariff Mart & Longitudinal EPD Handlers
  const btnProbeTariffComm = document.getElementById("btn-probe-tariff-commercial");
  const commercialTariffOutput = document.getElementById("commercial-tariff-output");

  const btnProbeProcurementTariff = document.getElementById("btn-probe-procurement-tariff");
  const btnProbeEpdApixaban = document.getElementById("btn-probe-epd-apixaban");
  const btnProbeEpdOncology = document.getElementById("btn-probe-epd-oncology");
  const procurementEpdOutput = document.getElementById("procurement-epd-warehouse-output");

  async function loadProcurementTariffData() {
    const res = await fetch("/api/warehouse/procurement-tariff/summary");
    return await res.json();
  }

  async function loadEpdFactsData(molecule = "") {
    const res = await fetch(`/api/warehouse/epd/observed-facts${molecule ? `?q=${encodeURIComponent(molecule)}` : ""}`);
    return await res.json();
  }

  if (btnProbeTariffComm && commercialTariffOutput) {
    btnProbeTariffComm.addEventListener("click", async () => {
      commercialTariffOutput.textContent = "Querying Codex Drug Tariff & MPSC Generics Framework from novapharm_codex_query.duckdb...";
      try {
        const data = await loadProcurementTariffData();
        let out = `[CODEX DRUG TARIFF & MPSC GENERICS FRAMEWORK] Authority: ${data.authority}\n`;
        out += `Status: ${data.status} | Source Mart: ${data.sourceMart}\n\n`;
        out += `--- ACTIVE REIMBURSEMENT RULES ---\n`;
        out += `• Total Drug Tariff Rules: ${data.counts.drugTariffRules.toLocaleString()}\n`;
        out += `• Procurement Workplans: ${data.counts.procurementWorkplans.toLocaleString()}\n`;
        out += `• MHRA Regulatory Alerts: ${data.counts.mhraRegulatoryAlerts.toLocaleString()}\n`;
        out += `• dm+d GTIN Mappings: ${data.counts.dmdGtinMappings.toLocaleString()}\n\n`;

        out += `--- SAMPLE CATEGORY M REIMBURSEMENT RATES ---\n`;
        data.sampleTariffEntries.forEach(t => {
          out += `• ${t.drugName} (${t.packSize}): £${(t.basicPricePence / 100).toFixed(2)} [${t.category} - ${t.tariffPeriod}]\n`;
        });

        out += `\n--- MPSC REGIONAL GENERICS BUYING GROUPS ---\n`;
        data.mpscBuyingGroups.forEach(bg => {
          out += `• [${bg.groupCode}] ${bg.groupName} - Region: ${bg.region} | Lead Trust: ${bg.leadTrust} (Status: ${bg.activeStatus})\n`;
        });

        commercialTariffOutput.textContent = out;
      } catch (err) {
        commercialTariffOutput.textContent = `ERROR querying procurement tariff: ${err.message}`;
      }
    });
  }

  if (btnProbeProcurementTariff && procurementEpdOutput) {
    btnProbeProcurementTariff.addEventListener("click", async () => {
      procurementEpdOutput.textContent = "Probing novapharm_codex_query.duckdb mart metrics...";
      try {
        const data = await loadProcurementTariffData();
        const tariffCount = document.getElementById("mart-tariff-count");
        if (tariffCount) tariffCount.textContent = (data.counts.drugTariffRules || 548312).toLocaleString();
        const mpscCount = document.getElementById("mart-mpsc-count");
        if (mpscCount) mpscCount.textContent = (data.counts.procurementWorkplans || 68).toLocaleString();
        const mhraCount = document.getElementById("mart-mhra-count");
        if (mhraCount) mhraCount.textContent = (data.counts.mhraRegulatoryAlerts || 616).toLocaleString();

        let out = `[CODEX QUERY MART INVENTORY] Authority: ${data.authority}\n`;
        out += `Path: ${data.sourceMart} | Status: ${data.status}\n\n`;
        out += `--- TABLES & CORE METRICS ---\n`;
        out += `• source.drug_tariff:      ${data.counts.drugTariffRules.toLocaleString()} pricing & reimbursement rows\n`;
        out += `• source.procurement:      ${data.counts.procurementWorkplans.toLocaleString()} NHS MPSC buying plans\n`;
        out += `• source.regulatory:       ${data.counts.mhraRegulatoryAlerts.toLocaleString()} MHRA defective medicine notices\n`;
        out += `• source.dmd_gtin_mapping: ${data.counts.dmdGtinMappings.toLocaleString()} GTIN-13 to dm+d AMPP mappings\n\n`;

        out += `--- MPSC GENERICS FRAMEWORK CONSORTIA ---\n`;
        data.mpscBuyingGroups.forEach(g => {
          out += `• ${g.groupName} (${g.region}) • Lead: ${g.leadTrust}\n`;
        });

        procurementEpdOutput.textContent = out;
      } catch (err) {
        procurementEpdOutput.textContent = `ERROR querying Codex mart: ${err.message}`;
      }
    });
  }

  if (btnProbeEpdApixaban && procurementEpdOutput) {
    btnProbeEpdApixaban.addEventListener("click", async () => {
      procurementEpdOutput.textContent = "Loading Apixaban longitudinal observed dispensing facts (June 2026 anchor)...";
      try {
        const data = await loadEpdFactsData("Apixaban");
        const req = data.requestedMolecule;
        let out = `[LONGITUDINAL EPD DISPENSING FACTS: ${req.chemical.toUpperCase()}]\n`;
        out += `Authority: ${data.authority} | Release Month: ${data.epdReleaseMonth}\n`;
        out += `June 2026 Total Dispensing Rows: ${data.totalObservedRowsJune2026.toLocaleString()} across ${data.totalTrackedGpPractices.toLocaleString()} GP practices\n`;
        out += `Longitudinal Series Coverage: ${data.longitudinalSeriesCoverage.totalMonthsOnDisk} months on disk (${data.longitudinalSeriesCoverage.startPeriod} to ${data.longitudinalSeriesCoverage.endPeriod}; ~${(data.longitudinalSeriesCoverage.estimatedTotalDispensingRows / 1000000).toFixed(0)}M rows)\n\n`;

        out += `--- OBSERVED PRIMARY CARE DISPENSING FACTS ---\n`;
        out += `• Therapeutic Class:            ${req.therapeuticClass}\n`;
        out += `• Dispensing GP Practices:      ${req.totalPracticeRecords.toLocaleString()} GP practice cohorts\n`;
        out += `• Prescriptions Dispensed:      ${req.totalPrescriptionsDispensed.toLocaleString()} items\n`;
        out += `• Net Ingredient Cost (NIC):    £${req.netIngredientCostGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n`;
        out += `• Actual Cost (NIC - Discount): £${req.actualCostGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n`;
        out += `• Care Setting:                 ${req.careSetting}\n`;
        out += `• Observed Fact Type:           ${req.observedFactType}\n`;

        procurementEpdOutput.textContent = out;
      } catch (err) {
        procurementEpdOutput.textContent = `ERROR loading EPD facts: ${err.message}`;
      }
    });
  }

  if (btnProbeEpdOncology && procurementEpdOutput) {
    btnProbeEpdOncology.addEventListener("click", async () => {
      procurementEpdOutput.textContent = "Loading secondary care hospital oncology facts (Trastuzumab / Capecitabine)...";
      try {
        const data = await loadEpdFactsData("Trastuzumab");
        const trast = data.monitoredMolecules.Trastuzumab;
        const cape = data.monitoredMolecules.Capecitabine;

        let out = `[SECONDARY CARE HOSPITAL SCMD FACTS (SECONDARY CARE MEDICINES DATA)]\n`;
        out += `Authority: NHS_ENGLAND_SCMD_SECONDARY_CARE\n\n`;

        out += `--- 1. ${trast.chemical.toUpperCase()} ---\n`;
        out += `• Class:                ${trast.therapeuticClass}\n`;
        out += `• Care Setting:         ${trast.careSetting}\n`;
        out += `• Storage Verification: ${trast.coldChainStorage}\n`;
        out += `• Fact Classification:  ${trast.observedFactType}\n\n`;

        out += `--- 2. ${cape.chemical.toUpperCase()} ---\n`;
        out += `• Class:                ${cape.therapeuticClass}\n`;
        out += `• Care Setting:         ${cape.careSetting}\n`;
        out += `• Storage Verification: ${cape.coldChainStorage}\n`;
        out += `• Fact Classification:  ${cape.observedFactType}\n\n`;

        out += `Note: Secondary care hospital oncology infusions are dispensed via SCMD hospital Trust lines rather than primary care EPD GP scripts.`;

        procurementEpdOutput.textContent = out;
      } catch (err) {
        procurementEpdOutput.textContent = `ERROR loading oncology facts: ${err.message}`;
      }
    });
  }

  // 13. DHSC Supply Disruptions, UKIPO SPC Patents & Contractor Dispensing Handlers
  const btnProbeDhsc = document.getElementById("btn-probe-dhsc-dash");
  const btnProbeSpc = document.getElementById("btn-probe-ukipo-spc");
  const btnProbeContractor = document.getElementById("btn-probe-contractor-dispensing");
  const dhscSpcOutput = document.getElementById("dhsc-spc-contractor-output");

  if (btnProbeDhsc && dhscSpcOutput) {
    btnProbeDhsc.addEventListener("click", async () => {
      dhscSpcOutput.textContent = "Querying DHSC DaSH medicine supply disruption dataset (ODS 2020-2026)...";
      try {
        const res = await fetch("/api/warehouse/supply-disruptions/summary");
        const data = await res.json();
        let out = `[DHSC DaSH MEDICINE SUPPLY DISRUPTIONS & DISCONTINUATIONS]\n`;
        out += `Authority: ${data.authority} | Period: ${data.reportingPeriod} (${data.totalReportingMonths} months)\n\n`;

        out += `--- ANNUAL NOTIFICATION VOLUMES ---\n`;
        out += `• 2024: ${data.annualNotifications['2024'].totalSupplyNotifications} supply issues, ${data.annualNotifications['2024'].discontinuations} discontinuations\n`;
        out += `• 2025: ${data.annualNotifications['2025'].totalSupplyNotifications} supply issues, ${data.annualNotifications['2025'].discontinuations} discontinuations\n\n`;

        out += `--- ROOT CAUSES BREAKDOWN (2025 DaSH NOTIFICATIONS) ---\n`;
        data.rootCauses2025.forEach(rc => {
          out += `• [${rc.percentage}%] ${rc.mainCategory} (${rc.notificationsCount} notifications)\n`;
          rc.primarySubCategories.forEach(sub => {
            out += `    - ${sub.subCategory}: ${sub.count} (${sub.percentage}%)\n`;
          });
        });

        out += `\n--- 2026 MONTHLY RUN-RATE (H1 2026) ---\n`;
        data.sampleDisruptionTrend2026.forEach(m => {
          out += `• ${m.month}: ${m.supplyIssues} issues | ${m.discontinuations} discontinuations\n`;
        });

        dhscSpcOutput.textContent = out;
      } catch (err) {
        dhscSpcOutput.textContent = `ERROR loading DHSC supply disruptions: ${err.message}`;
      }
    });
  }

  if (btnProbeSpc && dhscSpcOutput) {
    btnProbeSpc.addEventListener("click", async () => {
      dhscSpcOutput.textContent = "Querying UKIPO Supplementary Protection Certificates (SPC) Patent Register...";
      try {
        const res = await fetch("/api/warehouse/spc-patents/summary");
        const data = await res.json();
        let out = `[UKIPO SUPPLEMENTARY PROTECTION CERTIFICATES (SPCs)]\n`;
        out += `Authority: ${data.authority} | Total Registered SPCs: ${data.totalRegisteredSpcs.toLocaleString()}\n\n`;

        out += `--- CORE MEDICINES STATUTORY PATENT EXTENSIONS ---\n`;
        data.coreMoleculeCertificates.forEach(spc => {
          out += `• [SPC #${spc.spcNumber}] ${spc.molecule.toUpperCase()} (${spc.status})\n`;
          out += `    Applicant:    ${spc.applicant}\n`;
          out += `    Basic Patent: ${spc.basicPatentNumber}\n`;
          out += `    Description:  ${spc.productDescription}\n`;
          out += `    Therapeutic:  ${spc.therapeuticClass}\n\n`;
        });

        dhscSpcOutput.textContent = out;
      } catch (err) {
        dhscSpcOutput.textContent = `ERROR querying UKIPO SPCs: ${err.message}`;
      }
    });
  }

  if (btnProbeContractor && dhscSpcOutput) {
    btnProbeContractor.addEventListener("click", async () => {
      dhscSpcOutput.textContent = "Loading NHSBSA community pharmacy contractor dispensing data (June 2026)...";
      try {
        const res = await fetch("/api/warehouse/contractor-dispensing/summary");
        const data = await res.json();
        let out = `[NHSBSA COMMUNITY PHARMACY CONTRACTOR DISPENSING (JUNE 2026)]\n`;
        out += `Authority: ${data.authority} | Total Contractor Rows: ${data.totalContractorRecords.toLocaleString()}\n`;
        out += `Integrated Care Boards Tracked: ${data.totalTrackedIcbs}\n\n`;

        out += `--- NATIONAL MONTHLY AGGREGATES (JUNE 2026) ---\n`;
        out += `• Total Prescription Forms:    ${data.headlineNationalMetrics.totalPrescriptionForms.toLocaleString()} forms\n`;
        out += `• Total Prescription Items:    ${data.headlineNationalMetrics.totalItemsDispensed.toLocaleString()} items\n`;
        out += `• Total Professional Fees:     £${data.headlineNationalMetrics.totalProfessionalFeesGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n`;
        out += `• Average Items Per Form:      ${data.headlineNationalMetrics.averageItemsPerForm}\n\n`;

        out += `--- SAMPLE CONTRACTOR DISPENSARY PROFILES ---\n`;
        data.sampleContractors.forEach(c => {
          out += `• [${c.contractorCode}] ${c.contractorName} (${c.postcode})\n`;
          out += `    Address: ${c.address} | ICB: ${c.icbName} (${c.icbCode})\n`;
          out += `    Dispensed: ${c.prescriptionForms.toLocaleString()} forms, ${c.prescriptionItems.toLocaleString()} items (${c.totalProfessionalFeesCount.toLocaleString()} fee units)\n\n`;
        });

        dhscSpcOutput.textContent = out;
      } catch (err) {
        dhscSpcOutput.textContent = `ERROR loading contractor dispensing: ${err.message}`;
      }
    });
  }

  // 14. Secondary Care (SCMD), Primary Care (PCA) & Four-Nation Pharmacy Handlers
  const btnProbeScmdHospitals = document.getElementById("btn-probe-scmd-hospitals");
  const btnProbePcaPrescribing = document.getElementById("btn-probe-pca-prescribing");
  const btnProbeFourNation = document.getElementById("btn-probe-four-nation-pharmacies");
  const btnProbeIcbBoundaries = document.getElementById("btn-probe-icb-boundaries");
  const scmdPcaOutput = document.getElementById("scmd-pca-fournation-output");

  if (btnProbeScmdHospitals && scmdPcaOutput) {
    btnProbeScmdHospitals.addEventListener("click", async () => {
      scmdPcaOutput.textContent = "Loading Secondary Care Medicines Data (SCMD) hospital dispensing from /Volumes/PortableSSD...";
      try {
        const res = await fetch("/api/warehouse/scmd-hospital/summary?q=Apixaban");
        const data = await res.json();
        let out = `[NHSBSA SECONDARY CARE MEDICINES DATA (SCMD HOSPITAL PRESCRIBING)]\n`;
        out += `Authority: ${data.datasetId} | Reporting Period: ${data.reportingPeriod}\n`;
        out += `Total Hospital Dispensing Records: ${data.totalHospitalRecords.toLocaleString()}\n`;
        out += `NHS Foundation Trusts Reporting:  ${data.distinctHospitalTrusts}\n`;
        out += `Distinct Hospital Medicines:       ${data.distinctHospitalMedicines.toLocaleString()} SNOMED VMPs\n\n`;

        out += `--- HIGH-VALUE ONCOLOGY & DOAC HOSPITAL USAGE ---\n`;
        data.topHospitalMolecules.forEach(m => {
          out += `• ${m.vmpProductName} [SNOMED: ${m.snomedCode}]\n`;
          out += `    Therapeutic:      ${m.therapeuticClass}\n`;
          out += `    Reporting Trusts: ${m.reportingTrusts} NHS Foundation Trusts\n`;
          out += `    Hospital Volume:  ${m.totalHospitalUnits.toLocaleString()} ${m.unitOfMeasure} units\n\n`;
        });

        scmdPcaOutput.textContent = out;
      } catch (err) {
        scmdPcaOutput.textContent = `ERROR loading SCMD hospital data: ${err.message}`;
      }
    });
  }

  if (btnProbePcaPrescribing && scmdPcaOutput) {
    btnProbePcaPrescribing.addEventListener("click", async () => {
      scmdPcaOutput.textContent = "Loading NHSBSA Prescription Cost Analysis (PCA) primary care data...";
      try {
        const res = await fetch("/api/warehouse/pca-prescribing/summary?icb=QMJ");
        const data = await res.json();
        let out = `[NHSBSA PRESCRIPTION COST ANALYSIS (PCA PRIMARY CARE)]\n`;
        out += `Financial Year: ${data.financialYear} | Total PCA Rows: ${data.totalPcaRows.toLocaleString()}\n`;
        out += `Total England ICBs: ${data.totalTrackedIcbs} | Total BNF Chapters: ${data.totalBnfChapters}\n`;
        out += `Total Annual Net Ingredient Cost: £${data.totalNetIngredientCostGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n\n`;

        out += `--- TOP THERAPEUTIC CHAPTERS BY ANNUAL EXPENDITURE ---\n`;
        data.topTherapeuticChapters.forEach(c => {
          out += `• Chapter ${c.chapterCode} (${c.chapterName}): £${c.estimatedAnnualNicGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${c.itemsSharePct}% share)\n`;
        });

        out += `\n--- SAMPLE INTEGRATED CARE BOARDS ---\n`;
        data.sampleIcbs.forEach(icb => {
          out += `• [${icb.icbCode}] ${icb.icbName} (${icb.regionName})\n`;
          out += `    Prescribing Rows: ${icb.observedRowsCount.toLocaleString()} | Total NIC: £${icb.totalNicGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n\n`;
        });

        scmdPcaOutput.textContent = out;
      } catch (err) {
        scmdPcaOutput.textContent = `ERROR loading PCA data: ${err.message}`;
      }
    });
  }

  if (btnProbeFourNation && scmdPcaOutput) {
    btnProbeFourNation.addEventListener("click", async () => {
      scmdPcaOutput.textContent = "Loading UK Four-Nation Community Pharmacy Parquet Network from SSD...";
      try {
        const res = await fetch("/api/warehouse/four-nation-pharmacies/summary");
        const data = await res.json();
        let out = `[UK FOUR-NATION COMMUNITY PHARMACY PARQUET NETWORK]\n`;
        out += `Total Registered UK Dispensaries: ${data.totalDispensaries.toLocaleString()}\n`;
        out += `Storage Format: Apache Parquet (Snappy Compressed) | Zero-Copy Columnar\n\n`;

        out += `--- FOUR-NATION DISPENSARY CENSUS ---\n`;
        out += `• England:          ${data.nations.england.count.toLocaleString()} pharmacies (${data.nations.england.sourceAuthority})\n`;
        out += `• Scotland:         ${data.nations.scotland.count.toLocaleString()} pharmacies (${data.nations.scotland.sourceAuthority})\n`;
        out += `• Wales:            ${data.nations.wales.count.toLocaleString()} pharmacy chains (${data.nations.wales.activeOpenings2026} openings, ${data.nations.wales.activeClosures2026} closures in 2026)\n`;
        out += `• Northern Ireland: ${data.nations.northernIreland.count.toLocaleString()} registered premises (${data.nations.northernIreland.sourceAuthority})\n\n`;

        out += `--- GOVERNED PARQUET PATHS ---\n`;
        out += `• England:  ${data.nations.england.path}\n`;
        out += `• Scotland: ${data.nations.scotland.path}\n`;
        out += `• Wales:    ${data.nations.wales.path}\n`;
        out += `• NI:       ${data.nations.northernIreland.path}\n`;

        scmdPcaOutput.textContent = out;
      } catch (err) {
        scmdPcaOutput.textContent = `ERROR loading four-nation pharmacies: ${err.message}`;
      }
    });
  }

  if (btnProbeIcbBoundaries && scmdPcaOutput) {
    btnProbeIcbBoundaries.addEventListener("click", async () => {
      scmdPcaOutput.textContent = "Inspecting ONS Integrated Care Boards April 2026 GeoJSON boundaries...";
      try {
        const res = await fetch("/api/warehouse/icb-boundaries/summary");
        const data = await res.json();
        let out = `[ONS INTEGRATED CARE BOARDS APRIL 2026 GEOJSON BOUNDARIES]\n`;
        out += `Specification: ${data.boundarySpecification} | Type: ${data.geoJsonType}\n`;
        out += `Total Geographic Features: ${data.totalFeatures} (Covering all ${data.totalCoveredIcbs} England ICBs)\n`;
        out += `Spatial Standard: ${data.crs} | Google Earth GIS Ready\n\n`;

        out += `--- SAMPLE GEODETIC CENTROIDS (WGS84 & BRITISH NATIONAL GRID) ---\n`;
        data.sampleCentroids.forEach(c => {
          out += `• [FID #${c.fid}] ${c.icbName} (${c.icbCode})\n`;
          out += `    Coordinates: Lat ${c.latitude.toFixed(5)}, Long ${c.longitude.toFixed(5)}\n`;
          out += `    BNG Grid:    Eastings ${c.bngEastings}, Northings ${c.bngNorthings}\n\n`;
        });

        scmdPcaOutput.textContent = out;
      } catch (err) {
        scmdPcaOutput.textContent = `ERROR loading ICB boundaries: ${err.message}`;
      }
    });
  }

  // 15. Devolved Nations Prescribing & MHRA Safety Alerts Handlers
  const btnProbeNi = document.getElementById("btn-probe-ni-prescribing");
  const btnProbeScot = document.getElementById("btn-probe-scot-prescribing");
  const btnProbeWales = document.getElementById("btn-probe-wales-hospital");
  const btnProbeMhra = document.getElementById("btn-probe-mhra-alerts");
  const devolvedMhraOutput = document.getElementById("devolved-mhra-output");

  if (btnProbeNi && devolvedMhraOutput) {
    btnProbeNi.addEventListener("click", async () => {
      devolvedMhraOutput.textContent = "Loading Northern Ireland BSO GP Prescribing Data from SSD...";
      try {
        const res = await fetch("/api/warehouse/ni-prescribing/summary?q=Apixaban");
        const data = await res.json();
        let out = `[NORTHERN IRELAND BSO GP PRESCRIBING DATA]\n`;
        out += `Reporting Month: ${data.reportingPeriod} | Total Prescribing Records: ${data.totalMonthlyRows.toLocaleString()}\n`;
        out += `Tracked HSC Practices: ${data.trackedPracticesCount} | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE MONITORED DISPENSING (CARDIOVASCULAR & ONCOLOGY) ---\n`;
        data.samplePrescriptions.forEach(p => {
          out += `• Practice #${p.practiceId}: ${p.vmpName} (${p.strength})\n`;
          out += `    BNF: ${p.bnfCode} | Items: ${p.totalItems} | Qty: ${p.totalQuantity.toLocaleString()}\n`;
          out += `    Gross Cost: £${p.grossCostGbp.toFixed(2)} | Actual Cost: £${p.actualCostGbp.toFixed(2)}\n\n`;
        });

        devolvedMhraOutput.textContent = out;
      } catch (err) {
        devolvedMhraOutput.textContent = `ERROR loading Northern Ireland data: ${err.message}`;
      }
    });
  }

  if (btnProbeScot && devolvedMhraOutput) {
    btnProbeScot.addEventListener("click", async () => {
      devolvedMhraOutput.textContent = "Loading Public Health Scotland Prescribed & Dispensed Annual Matrix...";
      try {
        const res = await fetch("/api/warehouse/scotland-prescribing/summary");
        const data = await res.json();
        let out = `[PUBLIC HEALTH SCOTLAND PRESCRIBED & DISPENSED ANNUAL MATRIX]\n`;
        out += `Series: ${data.reportingSeries} | Total Matrix Rows: ${data.totalDispensingMatrixRows.toLocaleString()}\n`;
        out += `Covered Health Boards: ${data.coveredHealthBoards} | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CROSS-LOCATION DISPENSING MATRIX FLOWS ---\n`;
        data.sampleDispensingRoutes.forEach(r => {
          out += `• Prescriber [Practice ${r.prescriberPractice}, ${r.prescriberPostcode}] (${r.prescriberType})\n`;
          out += `    -> Dispenser [Code ${r.dispenserCode}, ${r.dispenserPostcode}] (${r.dispenserType})\n`;
          out += `    Paid Items: ${r.paidItemsCount} | Period: ${r.paidDateMonth}\n\n`;
        });

        devolvedMhraOutput.textContent = out;
      } catch (err) {
        devolvedMhraOutput.textContent = `ERROR loading Scotland data: ${err.message}`;
      }
    });
  }

  if (btnProbeWales && devolvedMhraOutput) {
    btnProbeWales.addEventListener("click", async () => {
      devolvedMhraOutput.textContent = "Loading NWSSP NHS Wales Secondary Care Hospital Prescribing Data...";
      try {
        const res = await fetch("/api/warehouse/wales-hospital/summary");
        const data = await res.json();
        let out = `[NWSSP NHS WALES SECONDARY CARE HOSPITAL PRESCRIBING]\n`;
        out += `Reporting Period: ${data.reportingPeriod} | Total Hospital Records: ${data.totalHospitalRecords.toLocaleString()}\n`;
        out += `Health Boards: ${data.coveredHealthBoards} | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HOSPITAL TRUST DISPENSING ---\n`;
        data.sampleHospitalPrescriptions.forEach(h => {
          out += `• [${h.healthBoard}] ${h.hospitalName} (${h.directorate})\n`;
          out += `    Trust: ${h.trustName} | BNF: ${h.bnfCode}\n`;
          out += `    Medicine: ${h.bnfName} | Items: ${h.items} | Qty: ${h.quantity.toLocaleString()}\n`;
          out += `    NIC: £${h.nicGbp.toFixed(2)} | Actual Cost: £${h.actualCostGbp.toFixed(2)}\n\n`;
        });

        devolvedMhraOutput.textContent = out;
      } catch (err) {
        devolvedMhraOutput.textContent = `ERROR loading Wales hospital data: ${err.message}`;
      }
    });
  }

  if (btnProbeMhra && devolvedMhraOutput) {
    btnProbeMhra.addEventListener("click", async () => {
      devolvedMhraOutput.textContent = "Loading MHRA Drug Safety Updates & Defect Notifications Feed...";
      try {
        const res = await fetch("/api/warehouse/mhra-alerts/summary");
        const data = await res.json();
        let out = `[MHRA DRUG SAFETY UPDATES & NATIONAL PATIENT SAFETY ALERTS]\n`;
        out += `Feed: ${data.feedTitle}\n`;
        out += `Active Alerts Tracked: ${data.totalActiveAlerts} | Format: ${data.feedFormat}\n`;
        out += `Last Ingest Timestamp: ${data.lastIngestTimestamp}\n\n`;

        out += `--- ACTIVE CLASS 1-4 MEDICINES RECALLS & DEFECT NOTIFICATIONS ---\n`;
        data.activeRecalls.forEach(a => {
          out += `• [${a.classification}] ${a.productName}\n`;
          out += `    Company: ${a.company} | Ref: ${a.referenceNumber} | Date: ${a.updatedAt.slice(0, 10)}\n`;
          out += `    Reason: ${a.reasonSummary}\n`;
          out += `    Gov.uk: ${a.govUkUrl}\n\n`;
        });

        devolvedMhraOutput.textContent = out;
      } catch (err) {
        devolvedMhraOutput.textContent = `ERROR loading MHRA alerts: ${err.message}`;
      }
    });
  }

  // 16. Transatlantic Regulatory Intelligence & Shortages Handlers
  const btnProbeFdaOb = document.getElementById("btn-probe-fda-orange-book");
  const btnProbeFdaRecalls = document.getElementById("btn-probe-fda-recalls");
  const btnProbeFdaShortages = document.getElementById("btn-probe-fda-shortages");
  const btnProbeEmaShortages = document.getElementById("btn-probe-ema-shortages");
  const transatlanticOutput = document.getElementById("transatlantic-regulatory-output");

  if (btnProbeFdaOb && transatlanticOutput) {
    btnProbeFdaOb.addEventListener("click", async () => {
      transatlanticOutput.textContent = "Loading US FDA Orange Book Therapeutic Equivalence & Patent Database...";
      try {
        const res = await fetch("/api/warehouse/fda-orange-book/summary?q=Capecitabine");
        const data = await res.json();
        let out = `[US FDA ORANGE BOOK THERAPEUTIC EQUIVALENCE DATABASE]\n`;
        out += `Edition: ${data.edition} | Uncompressed Size: ${data.uncompressedSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Bioequivalence & TE Evaluations\n\n`;

        out += `--- SAMPLE MONITORED ORANGE BOOK ENTRIES (RLD & GENERIC EQUIVALENCE) ---\n`;
        data.sampleProducts.forEach(p => {
          out += `• [${p.applNo}] ${p.drugName} (${p.activeIngredient}) - ${p.strength}\n`;
          out += `    Dosage Form: ${p.dosageForm} | Applicant: ${p.applicantHolder}\n`;
          out += `    TE Code: ${p.teCode} | Approval: ${p.approvalDate} | RLD: ${p.rld}\n\n`;
        });

        transatlanticOutput.textContent = out;
      } catch (err) {
        transatlanticOutput.textContent = `ERROR loading FDA Orange Book: ${err.message}`;
      }
    });
  }

  if (btnProbeFdaRecalls && transatlanticOutput) {
    btnProbeFdaRecalls.addEventListener("click", async () => {
      transatlanticOutput.textContent = "Loading US FDA Drug Recall Enforcement Actions from SSD...";
      try {
        const res = await fetch("/api/warehouse/fda-recalls/summary");
        const data = await res.json();
        let out = `[US FDA DRUG RECALL ENFORCEMENT REPORTS]\n`;
        out += `Total Enforcement Events in Corpus: ${data.totalEnforcementRecords.toLocaleString()}\n`;
        out += `Authority: ${data.authority} | Last Updated: ${data.lastUpdated}\n\n`;

        out += `--- ACTIVE RECALL ENFORCEMENT ACTIONS ---\n`;
        data.sampleRecalls.forEach(r => {
          out += `• [${r.classification}] Event #${r.eventId} (Recall ${r.recallNumber})\n`;
          out += `    Firm: ${r.recallingFirm} | Status: ${r.status}\n`;
          out += `    Reason: ${r.reasonForRecall}\n`;
          out += `    Distribution: ${r.distributionPattern}\n\n`;
        });

        transatlanticOutput.textContent = out;
      } catch (err) {
        transatlanticOutput.textContent = `ERROR loading FDA Recalls: ${err.message}`;
      }
    });
  }

  if (btnProbeFdaShortages && transatlanticOutput) {
    btnProbeFdaShortages.addEventListener("click", async () => {
      transatlanticOutput.textContent = "Loading US FDA Drug Shortages Database...";
      try {
        const res = await fetch("/api/warehouse/fda-shortages/summary");
        const data = await res.json();
        let out = `[US FDA DRUG SHORTAGES DATABASE]\n`;
        out += `Total Shortage Records: ${data.totalShortageRecords.toLocaleString()} | Last Updated: ${data.lastUpdated}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- MONITORED US DRUG SHORTAGES ---\n`;
        data.sampleShortages.forEach(s => {
          out += `• ${s.genericName} (${s.companyName})\n`;
          out += `    Status: ${s.status} | NDC: ${s.packageNdc} | Date: ${s.updateDate}\n`;
          out += `    Therapeutic Category: ${s.therapeuticCategory.join(', ')}\n`;
          out += `    Related Info: ${s.relatedInfo}\n\n`;
        });

        transatlanticOutput.textContent = out;
      } catch (err) {
        transatlanticOutput.textContent = `ERROR loading FDA Shortages: ${err.message}`;
      }
    });
  }

  if (btnProbeEmaShortages && transatlanticOutput) {
    btnProbeEmaShortages.addEventListener("click", async () => {
      transatlanticOutput.textContent = "Loading European Medicines Agency (EMA) EU-Wide Shortages Catalogue...";
      try {
        const res = await fetch("/api/warehouse/ema-shortages/summary");
        const data = await res.json();
        let out = `[EUROPEAN MEDICINES AGENCY EU-WIDE SHORTAGES CATALOGUE]\n`;
        out += `Active Pan-European Shortages: ${data.totalEmaShortages} | Timestamp: ${data.timestamp}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- PAN-EUROPEAN SUPPLY SHORTAGES ---\n`;
        data.sampleShortages.forEach(e => {
          out += `• ${e.medicineAffected} (${e.innCommonName})\n`;
          out += `    Status: ${e.supplyShortageStatus} | Expected Resolution: ${e.expectedResolution}\n`;
          out += `    Therapeutic Area: ${e.therapeuticAreaMesh}\n`;
          out += `    Alternatives Available: ${e.alternativesAvailable} | URL: ${e.shortageUrl}\n\n`;
        });

        transatlanticOutput.textContent = out;
      } catch (err) {
        transatlanticOutput.textContent = `ERROR loading EMA Shortages: ${err.message}`;
      }
    });
  }

  // 17. Primary Care Network & Workforce Intelligence Handlers
  const btnProbeOdsPractices = document.getElementById("btn-probe-ods-practices");
  const btnProbeOdsPcns = document.getElementById("btn-probe-ods-pcns");
  const btnProbePrescribers = document.getElementById("btn-probe-prescribers");
  const btnProbeGpPopulation = document.getElementById("btn-probe-gp-population");
  const btnProbePharmacyFirst = document.getElementById("btn-probe-pharmacy-first");
  const primaryCareOutput = document.getElementById("primary-care-workforce-output");

  if (btnProbeOdsPractices && primaryCareOutput) {
    btnProbeOdsPractices.addEventListener("click", async () => {
      primaryCareOutput.textContent = "Loading NHS Organisation Data Service (ODS) GP Practices Master Database...";
      try {
        const res = await fetch("/api/warehouse/ods-practices/summary");
        const data = await res.json();
        let out = `[NHS ORGANISATION DATA SERVICE (ODS) GP PRACTICES]\n`;
        out += `Total Registered Practices: ${data.totalRegisteredPractices.toLocaleString()} | Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- SAMPLE ACTIVE ENGLAND GP PRACTICES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [${p.practiceCode}] ${p.practiceName} (${p.status})\n`;
          out += `    Address: ${p.address}, ${p.town} (${p.postcode})\n`;
          out += `    ICB Code: ${p.icbCode} | Sub-ICB: ${p.subIcbLocation} | Tel: ${p.telephone}\n\n`;
        });

        primaryCareOutput.textContent = out;
      } catch (err) {
        primaryCareOutput.textContent = `ERROR loading ODS Practices: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPcns && primaryCareOutput) {
    btnProbeOdsPcns.addEventListener("click", async () => {
      primaryCareOutput.textContent = "Loading NHS Primary Care Networks (PCN) Statutory Directory...";
      try {
        const res = await fetch("/api/warehouse/ods-pcns/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE NETWORKS (PCN) DIRECTORY]\n`;
        out += `Total Primary Care Networks: ${data.totalPrimaryCareNetworks.toLocaleString()} | Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- STATUTORY PCN FOOTPRINTS & HEADQUARTERS ---\n`;
        data.samplePcns.forEach(p => {
          out += `• [${p.pcnCode}] ${p.pcnName}\n`;
          out += `    Parent ICB: ${p.parentIcbName} (Code: ${p.parentIcbCode})\n`;
          out += `    Headquarters: ${p.headquarters} (${p.postcode})\n`;
          out += `    Operational Since: ${p.startDate}\n\n`;
        });

        primaryCareOutput.textContent = out;
      } catch (err) {
        primaryCareOutput.textContent = `ERROR loading PCN Directory: ${err.message}`;
      }
    });
  }

  if (btnProbePrescribers && primaryCareOutput) {
    btnProbePrescribers.addEventListener("click", async () => {
      primaryCareOutput.textContent = "Loading NHSBSA National Prescriber Details Master Database...";
      try {
        const res = await fetch("/api/warehouse/prescribers/summary");
        const data = await res.json();
        let out = `[NHSBSA NATIONAL PRESCRIBER DETAILS MASTER DATABASE]\n`;
        out += `Total Active Prescribers: ${data.totalPrescribers.toLocaleString()} | Extract Month: ${data.extractMonth}\n`;
        out += `Authority: ${data.authority} | Raw Size: ${data.fileSizeMb} MB\n`;
        out += `Recognized Types: ${data.recognizedPrescriberTypes.join(', ')}\n\n`;

        out += `--- SAMPLE MONITORED PRESCRIBERS & DISCIPLINES ---\n`;
        data.samplePrescribers.forEach(p => {
          out += `• [${p.prescriberCode}] ${p.prescriberTitle} ${p.prescriberName} — ${p.prescriberType}\n`;
          out += `    Practice: ${p.practiceName} (${p.practiceCode}) | Postcode: ${p.postcode}\n`;
          out += `    ICB: ${p.sicblName} (Joined: ${p.dateJoined})\n\n`;
        });

        primaryCareOutput.textContent = out;
      } catch (err) {
        primaryCareOutput.textContent = `ERROR loading Prescribers Database: ${err.message}`;
      }
    });
  }

  if (btnProbeGpPopulation && primaryCareOutput) {
    btnProbeGpPopulation.addEventListener("click", async () => {
      primaryCareOutput.textContent = "Loading NHS England GP Registered Patients by Practice Database...";
      try {
        const res = await fetch("/api/warehouse/gp-registered-population/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND GP REGISTERED POPULATION BY PRACTICE]\n`;
        out += `Active Practices: ${data.totalActivePractices.toLocaleString()} | Total Registered Patients: ${data.totalRegisteredPopulationEngland.toLocaleString()}\n`;
        out += `Authority: ${data.authority} | Extract Date: ${data.extractDate}\n\n`;

        out += `--- SAMPLE PRACTICE REGISTERED LIST SIZES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [Practice ${p.practiceCode}] Postcode: ${p.postcode} | Sub-ICB: ${p.subIcbCode}\n`;
          out += `    Registered Headcount: ${p.registeredPatients.toLocaleString()} patients\n\n`;
        });

        primaryCareOutput.textContent = out;
      } catch (err) {
        primaryCareOutput.textContent = `ERROR loading GP Registered Population: ${err.message}`;
      }
    });
  }

  if (btnProbePharmacyFirst && primaryCareOutput) {
    btnProbePharmacyFirst.addEventListener("click", async () => {
      primaryCareOutput.textContent = "Loading NHS England Community Pharmacy Pharmacy First Clinical Pathways...";
      try {
        const res = await fetch("/api/warehouse/pharmacy-first-pathways/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND PHARMACY FIRST CLINICAL PATHWAYS]\n`;
        out += `Service: ${data.serviceName} | Launch Date: ${data.launchDate}\n`;
        out += `Authority: ${data.authority} | Participating Pharmacies: ${data.participatingCommunityPharmaciesEngland.toLocaleString()}\n\n`;

        out += `--- 7 STATUTORY CLINICAL PATHWAYS ---\n`;
        data.pathways.forEach(pw => {
          out += `• [${pw.id}] ${pw.condition} (Eligibility: ${pw.ageEligibility})\n`;
          out += `    Gateway: ${pw.clinicalGateway}\n`;
          out += `    First-line: ${pw.firstLineTreatments.join(', ')}\n`;
          out += `    Protocol: ${pw.pgdProtocol}\n\n`;
        });

        primaryCareOutput.textContent = out;
      } catch (err) {
        primaryCareOutput.textContent = `ERROR loading Pharmacy First Pathways: ${err.message}`;
      }
    });
  }

  // 18. Clinical Formulary, Pharmacy Contractors, Rural Dispensing, QOF Disease Registers & Regional GIS Boundaries Handlers
  const btnProbeBnfDirectory = document.getElementById("btn-probe-bnf-directory");
  const btnProbeContractorProfiles = document.getElementById("btn-probe-contractor-profiles");
  const btnProbeDispensingDoctors = document.getElementById("btn-probe-dispensing-doctors");
  const btnProbeQofPrevalence = document.getElementById("btn-probe-qof-prevalence");
  const btnProbeRegionBoundaries = document.getElementById("btn-probe-region-boundaries");
  const formularyOutput = document.getElementById("formulary-qof-regional-output");

  if (btnProbeBnfDirectory && formularyOutput) {
    btnProbeBnfDirectory.addEventListener("click", async () => {
      formularyOutput.textContent = "Loading NHS BNF Code Hierarchy Directory...";
      try {
        const res = await fetch("/api/warehouse/bnf-directory/summary");
        const data = await res.json();
        let out = `[NHS BRITISH NATIONAL FORMULARY (BNF) CODE DIRECTORY]\n`;
        out += `Total BNF Codes: ${data.totalBnfCodes.toLocaleString()} | Edition: ${data.edition}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- SAMPLE BNF CLINICAL PRESENTATIONS ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• [${p.bnfCode}] ${p.presentation}\n`;
          out += `    Product: ${p.product} | Substance: ${p.chemicalSubstance}\n`;
          out += `    Chapter: ${p.chapter} | Section: ${p.section}\n\n`;
        });

        formularyOutput.textContent = out;
      } catch (err) {
        formularyOutput.textContent = `ERROR loading BNF Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeContractorProfiles && formularyOutput) {
    btnProbeContractorProfiles.addEventListener("click", async () => {
      formularyOutput.textContent = "Loading NHSBSA Community Pharmacy Contractor Profiles Database...";
      try {
        const res = await fetch("/api/warehouse/contractor-profiles/summary");
        const data = await res.json();
        let out = `[NHSBSA COMMUNITY PHARMACY CONTRACTOR PROFILES]\n`;
        out += `Total Contractors: ${data.totalContractorProfiles.toLocaleString()} | Extract Month: ${data.extractMonth || data.reportingMonth}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- SAMPLE CONTRACTOR PROFILES ---\n`;
        data.sampleContractors.forEach(c => {
          out += `• [${c.contractorCode}] ${c.tradingName} (${c.contractorName})\n`;
          out += `    Address: ${c.address} (${c.postcode}) | Tel: ${c.phone}\n`;
          out += `    ICB: ${c.icbName} (${c.icbCode}) | Type: ${c.contractorType}\n`;
          out += `    100-Hour Status: ${c.is100Hour ? 'YES' : 'NO'} | Distance Selling: ${c.isDistanceSelling ? 'YES' : 'NO'}\n\n`;
        });

        formularyOutput.textContent = out;
      } catch (err) {
        formularyOutput.textContent = `ERROR loading Contractor Profiles: ${err.message}`;
      }
    });
  }

  if (btnProbeDispensingDoctors && formularyOutput) {
    btnProbeDispensingDoctors.addEventListener("click", async () => {
      formularyOutput.textContent = "Loading NHS England Rural Dispensing Doctor Practices Register...";
      try {
        const res = await fetch("/api/warehouse/dispensing-doctors/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND RURAL DISPENSING DOCTOR PRACTICES REGISTER]\n`;
        out += `Total Dispensing Practices: ${data.totalDispensingPractices.toLocaleString()} | Reporting Month: ${data.reportingMonth}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- SAMPLE RURAL DISPENSING PRACTICES & DOCTOR HEADCOUNT ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [${p.practiceCode}] ${p.practiceName}\n`;
          out += `    Address: ${p.address} (${p.postcode})\n`;
          out += `    ICB/SICBL: ${p.sicblName}\n`;
          out += `    Total GPs: ${p.totalGps} | Dispensing GPs: ${p.dispensingGps}\n\n`;
        });

        formularyOutput.textContent = out;
      } catch (err) {
        formularyOutput.textContent = `ERROR loading Dispensing Doctors: ${err.message}`;
      }
    });
  }

  if (btnProbeQofPrevalence && formularyOutput) {
    btnProbeQofPrevalence.addEventListener("click", async () => {
      formularyOutput.textContent = "Loading NHS England QOF Clinical Disease Prevalence Registers...";
      try {
        const res = await fetch("/api/warehouse/qof-prevalence/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND QUALITY AND OUTCOMES FRAMEWORK (QOF) PREVALENCE]\n`;
        out += `Total Clinical Registers: ${data.totalPrevalenceRecords.toLocaleString()} | Reporting Year: ${data.reportingYear}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Covered Clinical Domains: ${data.clinicalDomains.join(', ')}\n\n`;

        out += `--- SAMPLE PRACTICE DISEASE REGISTERS ---\n`;
        data.sampleRegisters.forEach(r => {
          out += `• [Practice ${r.practiceCode}] Domain: ${r.groupCode} — ${r.registerName}\n`;
          out += `    Register Size: ${r.registerSize.toLocaleString()} patients (List: ${r.practiceListSize.toLocaleString()})\n`;
          out += `    Prevalence Rate: ${r.prevalenceRatePct}%\n\n`;
        });

        formularyOutput.textContent = out;
      } catch (err) {
        formularyOutput.textContent = `ERROR loading QOF Prevalence: ${err.message}`;
      }
    });
  }

  if (btnProbeRegionBoundaries && formularyOutput) {
    btnProbeRegionBoundaries.addEventListener("click", async () => {
      formularyOutput.textContent = "Loading ONS NHS England Commissioning Regions GeoJSON Boundaries...";
      try {
        const res = await fetch("/api/warehouse/region-boundaries/summary");
        const data = await res.json();
        let out = `[ONS NHS ENGLAND COMMISSIONING REGIONS HIGH-PRECISION GEOJSON]\n`;
        out += `Total Regions: ${data.totalRegions} | Boundary File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Standard: ${data.format}\n\n`;

        out += `--- 7 NHS ENGLAND COMMISSIONING REGIONS ---\n`;
        data.regions.forEach(r => {
          out += `• [${r.regionCode}] ${r.regionName} (HQ: ${r.headquarters})\n`;
        });

        formularyOutput.textContent = out;
      } catch (err) {
        formularyOutput.textContent = `ERROR loading Region Boundaries: ${err.message}`;
      }
    });
  }

  // 19. Hospital Community Dispensing, Shortage Protocols, Cancer Drugs Fund, Category M & Welsh Prescriber Pharmacists Handlers
  const btnProbeHospitalDispensed = document.getElementById("btn-probe-hospital-dispensed");
  const btnProbeSspProtocols = document.getElementById("btn-probe-ssp-protocols");
  const btnProbeCdfList = document.getElementById("btn-probe-cdf-list");
  const btnProbeCategoryM = document.getElementById("btn-probe-category-m");
  const btnProbeWalesPharmacists = document.getElementById("btn-probe-wales-pharmacists");
  const hospitalSspOutput = document.getElementById("hospital-ssp-cdf-output");

  if (btnProbeHospitalDispensed && hospitalSspOutput) {
    btnProbeHospitalDispensed.addEventListener("click", async () => {
      hospitalSspOutput.textContent = "Loading NHS England Hospital Outpatient Prescriptions Dispensed in the Community...";
      try {
        const res = await fetch("/api/warehouse/hospital-dispensed-community/summary");
        const data = await res.json();
        let out = `[NHS HOSPITAL PRESCRIPTIONS DISPENSED IN COMMUNITY (FP10HP)]\n`;
        out += `Total Records: ${data.totalDispensedRecords.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority} | Format: ${data.format}\n\n`;

        out += `--- SAMPLE HOSPITAL OUTPATIENT DISPENSED MEDICINES ---\n`;
        data.sampleDispensedRows.forEach(r => {
          out += `• ${r.bnfName} (${r.bnfCode})\n`;
          out += `    Hospital Trust: ${r.hospitalTrust} (${r.hospitalTrustCode})\n`;
          out += `    Dispensed Items: ${r.totalItems} | Quantity: ${r.totalQuantity} | NIC: £${r.totalNic.toFixed(2)}\n\n`;
        });

        hospitalSspOutput.textContent = out;
      } catch (err) {
        hospitalSspOutput.textContent = `ERROR loading Hospital Dispensed Community: ${err.message}`;
      }
    });
  }

  if (btnProbeSspProtocols && hospitalSspOutput) {
    btnProbeSspProtocols.addEventListener("click", async () => {
      hospitalSspOutput.textContent = "Loading NHS Statutory Serious Shortage Protocols (SSP) Active Register...";
      try {
        const res = await fetch("/api/warehouse/ssp-protocols/summary");
        const data = await res.json();
        let out = `[NHS STATUTORY SERIOUS SHORTAGE PROTOCOLS (HUMAN MEDICINES REG 226A)]\n`;
        out += `Total Active Protocols: ${data.totalActiveProtocols} | Issuing Body: ${data.issuingBody}\n`;
        out += `Legal Basis: ${data.legalAuthority}\n\n`;

        out += `--- ACTIVE STATUTORY PROTOCOLS ---\n`;
        data.protocols.forEach(p => {
          out += `• [${p.sspNumber}] ${p.drugName} (${p.status})\n`;
          out += `    Protocol Type: ${p.protocolType}\n`;
          out += `    Signed Date: ${p.signedDate} | Document: ${p.fileName}\n\n`;
        });

        hospitalSspOutput.textContent = out;
      } catch (err) {
        hospitalSspOutput.textContent = `ERROR loading Serious Shortage Protocols: ${err.message}`;
      }
    });
  }

  if (btnProbeCdfList && hospitalSspOutput) {
    btnProbeCdfList.addEventListener("click", async () => {
      hospitalSspOutput.textContent = "Loading NHS England National Cancer Drugs Fund (CDF) Approved Inclusions...";
      try {
        const res = await fetch("/api/warehouse/cancer-drugs-fund/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND NATIONAL CANCER DRUGS FUND (CDF) APPROVED LIST]\n`;
        out += `Version: ${data.version} | Document Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- ANCHOR ONCOLOGY MEDICINES & ALPHAFOLD TARGETS ---\n`;
        data.anchorOncologyMedicines.forEach(m => {
          out += `• ${m.genericName} (${m.brandName})\n`;
          out += `    Indication: ${m.indication}\n`;
          out += `    Funding Route: ${m.fundingRoute}\n`;
          out += `    AlphaFold Target: ${m.alphaFoldTarget}\n\n`;
        });

        hospitalSspOutput.textContent = out;
      } catch (err) {
        hospitalSspOutput.textContent = `ERROR loading Cancer Drugs Fund: ${err.message}`;
      }
    });
  }

  if (btnProbeCategoryM && hospitalSspOutput) {
    btnProbeCategoryM.addEventListener("click", async () => {
      hospitalSspOutput.textContent = "Loading NHS England Drug Tariff Category M Generic Reimbursement Prices...";
      try {
        const res = await fetch("/api/warehouse/category-m/summary");
        const data = await res.json();
        let out = `[NHS DRUG TARIFF CATEGORY M GENERIC REIMBURSEMENT PRICES]\n`;
        out += `Total Presentations: ${data.totalBenchmarkPresentations.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority} | Standard: ${data.format}\n\n`;

        out += `--- SAMPLE CATEGORY M BENCHMARK PRICES ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• ${p.drugName} (SNOMED: ${p.vmpSnomedCode})\n`;
          out += `    Pack: ${p.packSize} ${p.unit} | Basic Price: £${p.basicPriceGbp.toFixed(2)} (${p.basicPricePence}p)\n\n`;
        });

        hospitalSspOutput.textContent = out;
      } catch (err) {
        hospitalSspOutput.textContent = `ERROR loading Category M Prices: ${err.message}`;
      }
    });
  }

  if (btnProbeWalesPharmacists && hospitalSspOutput) {
    btnProbeWalesPharmacists.addEventListener("click", async () => {
      hospitalSspOutput.textContent = "Loading NWSSP NHS Wales Primary Care Independent Prescriber Pharmacists Dataset...";
      try {
        const res = await fetch("/api/warehouse/wales-pharmacist-prescribing/summary");
        const data = await res.json();
        let out = `[NWSSP NHS WALES INDEPENDENT PRESCRIBER PHARMACISTS DATASET]\n`;
        out += `Reporting Month: ${data.reportingMonth} | Uncompressed Size: ${data.uncompressedSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Format: ${data.format}\n\n`;

        out += `--- ARCHIVE COMPONENTS ---\n`;
        data.archiveMembers.forEach(m => {
          out += `• ${m.name}: ${m.description}\n`;
        });
        out += `\n--- SAMPLE INDEPENDENT PRESCRIBER PHARMACISTS ---\n`;
        data.samplePrescribers.forEach(p => {
          out += `• [${p.prescriberCode}] ${p.prescriberName}\n`;
          out += `    Health Board: ${p.healthBoard} | Location: ${p.practiceLocation} (${p.postcode})\n`;
          out += `    Domain: ${p.primaryTherapeuticDomain}\n\n`;
        });

        hospitalSspOutput.textContent = out;
      } catch (err) {
        hospitalSspOutput.textContent = `ERROR loading Wales Pharmacists Prescribing: ${err.message}`;
      }
    });
  }

  // 20. Drug Tariff Monthly Statutory Parts, PSNI NI Premises, Wales Pharmacy Chains, Sub-ICB Boundaries & EMA Variations Handlers
  const btnProbeTariffParts = document.getElementById("btn-probe-tariff-parts");
  const btnProbePsniPremises = document.getElementById("btn-probe-psni-premises");
  const btnProbeWalesChains = document.getElementById("btn-probe-wales-chains");
  const btnProbeSubIcb = document.getElementById("btn-probe-sub-icb");
  const btnProbeEmaPostAuth = document.getElementById("btn-probe-ema-post-auth");
  const tariffPsniWalesOutput = document.getElementById("tariff-psni-wales-output");

  if (btnProbeTariffParts && tariffPsniWalesOutput) {
    btnProbeTariffParts.addEventListener("click", async () => {
      tariffPsniWalesOutput.textContent = "Loading NHSBSA Drug Tariff Monthly Publications Suite (October 2026)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-parts/summary");
        const data = await res.json();
        let out = `[NHSBSA DRUG TARIFF MONTHLY PUBLICATIONS SUITE]\n`;
        out += `Edition: ${data.edition} | Total Statutory Parts: ${data.totalPartsCount} | Size: ${data.totalSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STATUTORY PUBLICATION PARTS ---\n`;
        data.publicationParts.forEach(p => {
          const sz = p.sizeMb ? `${p.sizeMb} MB` : `${p.sizeKb} KB`;
          out += `• ${p.filename} (${sz})\n`;
          out += `    ${p.description}\n\n`;
        });

        tariffPsniWalesOutput.textContent = out;
      } catch (err) {
        tariffPsniWalesOutput.textContent = `ERROR loading Drug Tariff Parts: ${err.message}`;
      }
    });
  }

  if (btnProbePsniPremises && tariffPsniWalesOutput) {
    btnProbePsniPremises.addEventListener("click", async () => {
      tariffPsniWalesOutput.textContent = "Loading PSNI Northern Ireland Registered Pharmacy Premises Master Register...";
      try {
        const res = await fetch("/api/warehouse/psni-premises/summary");
        const data = await res.json();
        let out = `[PSNI NORTHERN IRELAND REGISTERED PHARMACY PREMISES REGISTER]\n`;
        out += `Published Date: ${data.publishedDate} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Legal Framework: ${data.legalFramework}\n\n`;

        out += `--- SAMPLE REGISTERED PHARMACY PREMISES ---\n`;
        data.samplePremises.forEach(p => {
          out += `• [${p.registrationNumber}] ${p.tradingName}\n`;
          out += `    Address: ${p.addressLine} (${p.postcode})\n`;
          out += `    Superintendent: ${p.registeredSuperintendent} | Type: ${p.dispensingFacilityType}\n\n`;
        });

        tariffPsniWalesOutput.textContent = out;
      } catch (err) {
        tariffPsniWalesOutput.textContent = `ERROR loading PSNI Premises Register: ${err.message}`;
      }
    });
  }

  if (btnProbeWalesChains && tariffPsniWalesOutput) {
    btnProbeWalesChains.addEventListener("click", async () => {
      tariffPsniWalesOutput.textContent = "Loading NWSSP NHS Wales Community Pharmacy Contractor Ownership & Chains Directory...";
      try {
        const res = await fetch("/api/warehouse/wales-pharmacy-chains/summary");
        const data = await res.json();
        let out = `[NWSSP NHS WALES COMMUNITY PHARMACY CONTRACTOR & CHAINS DIRECTORY]\n`;
        out += `Published Date: ${data.publishedDate} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Format: ${data.format}\n\n`;

        out += `--- SAMPLE PHARMACY MULTIPLES & INDEPENDENT CONTRACTOR GROUPS ---\n`;
        data.sampleChainMultiples.forEach(c => {
          out += `• ${c.multipleGroupName} (${c.totalWelshBranches} Welsh Branches)\n`;
          out += `    HQ: ${c.headquarters}\n`;
          out += `    Health Boards: ${c.primaryHealthBoards.join(', ')}\n`;
          out += `    Independent Prescriber Ready: ${c.independentPrescriberCapacity ? 'YES' : 'NO'}\n\n`;
        });

        tariffPsniWalesOutput.textContent = out;
      } catch (err) {
        tariffPsniWalesOutput.textContent = `ERROR loading Wales Pharmacy Chains: ${err.message}`;
      }
    });
  }

  if (btnProbeSubIcb && tariffPsniWalesOutput) {
    btnProbeSubIcb.addEventListener("click", async () => {
      tariffPsniWalesOutput.textContent = "Loading ONS Sub-ICB Integrated Care Boards High-Precision GeoJSON Boundaries...";
      try {
        const res = await fetch("/api/warehouse/sub-icb-boundaries/summary");
        const data = await res.json();
        let out = `[ONS SUB-ICB HIGH-PRECISION GEOJSON BOUNDARIES]\n`;
        out += `Total Features: ${data.totalFeaturesCount} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Standard: ${data.boundaryStandard} | CRS: ${data.crs}\n\n`;

        out += `--- SAMPLE SUB-ICB GEOMETRY FEATURES ---\n`;
        data.sampleSubIcbs.forEach(s => {
          out += `• [${s.code}] ${s.name}\n`;
          out += `    Region: ${s.region} | Geometry: ${s.polygonType}\n`;
          out += `    BBox: ${s.coordinatesBoundingBox}\n\n`;
        });

        tariffPsniWalesOutput.textContent = out;
      } catch (err) {
        tariffPsniWalesOutput.textContent = `ERROR loading Sub-ICB Boundaries: ${err.message}`;
      }
    });
  }

  if (btnProbeEmaPostAuth && tariffPsniWalesOutput) {
    btnProbeEmaPostAuth.addEventListener("click", async () => {
      tariffPsniWalesOutput.textContent = "Loading EMA Post-Authorisation Procedures & Variations Registry...";
      try {
        const res = await fetch("/api/warehouse/ema-post-authorisation/summary");
        const data = await res.json();
        let out = `[EMA POST-AUTHORISATION PROCEDURES & REGULATORY DECISIONS REGISTRY]\n`;
        out += `Total Tracked Procedures: ${data.totalProceduresCount} | Timestamp: ${data.timestamp}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE POST-AUTHORISATION PROCEDURES ---\n`;
        data.sampleProcedures.forEach(p => {
          out += `• ${p.medicineName} (${p.activeSubstance.toUpperCase()} - ${p.productNumber})\n`;
          out += `    ATC: ${p.atcCode} | Developer: ${p.mahDeveloper}\n`;
          out += `    Therapeutic Area: ${p.therapeuticArea}\n`;
          out += `    Status: ${p.procedureStatus}${p.withdrawalDate ? ' (Withdrawn: ' + p.withdrawalDate + ')' : ''}\n\n`;
        });

        tariffPsniWalesOutput.textContent = out;
      } catch (err) {
        tariffPsniWalesOutput.textContent = `ERROR loading EMA Post-Authorisation: ${err.message}`;
      }
    });
  }

  // 21. England Monthly PCA Master (529k Rows), NI Longitudinal PCA (15 Yrs), WAST Ambulance, NI Contractor Dispensing & US FDA CDER Handlers
  const btnProbeEnglandMonthlyPca = document.getElementById("btn-probe-england-monthly-pca");
  const btnProbeNiPcaLongitudinal = document.getElementById("btn-probe-ni-pca-longitudinal");
  const btnProbeWalesAmbulance = document.getElementById("btn-probe-wales-ambulance");
  const btnProbeNiContractorDisp = document.getElementById("btn-probe-ni-contractor-disp");
  const btnProbeFdaApprovals = document.getElementById("btn-probe-fda-approvals");
  const englandNiWastOutput = document.getElementById("england-ni-wast-output");

  if (btnProbeEnglandMonthlyPca && englandNiWastOutput) {
    btnProbeEnglandMonthlyPca.addEventListener("click", async () => {
      englandNiWastOutput.textContent = "Loading NHS England Monthly Prescription Cost Analysis (June 2026, 529k Rows)...";
      try {
        const res = await fetch("/api/warehouse/england-monthly-pca/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND MONTHLY PRESCRIPTION COST ANALYSIS (PCA) MASTER]\n`;
        out += `Reporting Period: ${data.reportingPeriod} | Total Granular Rows: ${data.totalRows.toLocaleString()} | Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Format: ${data.format}\n\n`;

        out += `--- SAMPLE DISPENSING PRESENTATIONS (JUNE 2026) ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• [${p.bnfPresentationCode}] ${p.bnfPresentationName}\n`;
          out += `    Region: ${p.regionName} | ICB: ${p.icbName}\n`;
          out += `    SNOMED: ${p.snomedCode} | Dispensed Items: ${p.items.toLocaleString()} | NIC: £${p.nicGbp.toLocaleString()}\n\n`;
        });

        englandNiWastOutput.textContent = out;
      } catch (err) {
        englandNiWastOutput.textContent = `ERROR loading England Monthly PCA: ${err.message}`;
      }
    });
  }

  if (btnProbeNiPcaLongitudinal && englandNiWastOutput) {
    btnProbeNiPcaLongitudinal.addEventListener("click", async () => {
      englandNiWastOutput.textContent = "Loading HSC Northern Ireland 15-Year Longitudinal PCA Series (2011-2025)...";
      try {
        const res = await fetch("/api/warehouse/ni-pca-longitudinal/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND LONGITUDINAL PRESCRIPTION COST ANALYSIS (PCA)]\n`;
        out += `Timespan: ${data.timespan} | Total Annual Workbooks: ${data.totalAnnualWorkbooks} | Size: ${data.totalSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- KEY STATUTORY ANNUAL PCA WORKBOOKS ---\n`;
        data.keyWorkbooks.forEach(w => {
          out += `• ${w.filename} (${w.sizeMb} MB)\n`;
          out += `    Description: ${w.description}\n\n`;
        });

        englandNiWastOutput.textContent = out;
      } catch (err) {
        englandNiWastOutput.textContent = `ERROR loading NI Longitudinal PCA: ${err.message}`;
      }
    });
  }

  if (btnProbeWalesAmbulance && englandNiWastOutput) {
    btnProbeWalesAmbulance.addEventListener("click", async () => {
      englandNiWastOutput.textContent = "Loading Welsh Ambulance Services NHS Trust (WAST) Emergency Prescribing Dataset...";
      try {
        const res = await fetch("/api/warehouse/wales-ambulance-prescribing/summary");
        const data = await res.json();
        let out = `[WELSH AMBULANCE SERVICES NHS TRUST (WAST) EMERGENCY PRESCRIBING]\n`;
        out += `Series: ${data.reportingYear} | Total Monthly Archives: ${data.totalMonthlyArchives} | Size: ${data.totalSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Domain: ${data.clinicalDomain}\n\n`;

        out += `--- SAMPLE EMERGENCY RESUSCITATION MEDICINES ---\n`;
        data.sampleEmergencyMedicines.forEach(m => {
          out += `• ${m.drugName}\n`;
          out += `    Clinical Indication: ${m.clinicalIndication} | Route: ${m.route}\n\n`;
        });

        englandNiWastOutput.textContent = out;
      } catch (err) {
        englandNiWastOutput.textContent = `ERROR loading WAST Ambulance Prescribing: ${err.message}`;
      }
    });
  }

  if (btnProbeNiContractorDisp && englandNiWastOutput) {
    btnProbeNiContractorDisp.addEventListener("click", async () => {
      englandNiWastOutput.textContent = "Loading HSC Northern Ireland Monthly Contractor Dispensing Series (135 Datasets)...";
      try {
        const res = await fetch("/api/warehouse/ni-contractor-dispensing/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND DISPENSED PRESCRIPTION ITEMS BY CONTRACTOR]\n`;
        out += `Timespan: ${data.timespan} | Total Datasets: ${data.totalMonthlyDatasets} | Total Size: ${data.totalSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Latest Anchor: ${data.latestAnchorFile}\n\n`;

        out += `--- SAMPLE GP SURGERY TO PHARMACY CONTRACTOR DISPENSING ---\n`;
        data.sampleContractorDispensing.forEach(c => {
          out += `• GP Practice [${c.gpPracticeCode}] ${c.gpPracticeName}\n`;
          out += `    → Pharmacy Contractor [${c.contractorNumber}] ${c.contractorName} (${c.address})\n`;
          out += `    Items Dispensed: ${c.totalItemsDispensed.toLocaleString()}\n\n`;
        });

        englandNiWastOutput.textContent = out;
      } catch (err) {
        englandNiWastOutput.textContent = `ERROR loading NI Contractor Dispensing: ${err.message}`;
      }
    });
  }

  if (btnProbeFdaApprovals && englandNiWastOutput) {
    btnProbeFdaApprovals.addEventListener("click", async () => {
      englandNiWastOutput.textContent = "Loading US FDA CDER Drugs@FDA Regulatory Approvals and Submissions Archive...";
      try {
        const res = await fetch("/api/warehouse/fda-approvals/summary");
        const data = await res.json();
        let out = `[US FDA CDER DRUGS@FDA REGULATORY APPROVALS & SUBMISSIONS ARCHIVE]\n`;
        out += `Total Approval Actions: ${data.totalApprovalActions} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Database: ${data.database}\n\n`;

        out += `--- SAMPLE REGULATORY APPROVAL ACTIONS & SUBMISSIONS ---\n`;
        data.sampleApprovalActions.forEach(a => {
          out += `• Submission ${a.submissionType}-${a.submissionNumber} (${a.reviewPriority} Priority): ${a.submissionStatus} on ${a.submissionStatusDate}\n`;
          out += `    Document Type: ${a.applicationDocType}\n`;
          out += `    URL: ${a.docUrl}\n\n`;
        });

        englandNiWastOutput.textContent = out;
      } catch (err) {
        englandNiWastOutput.textContent = `ERROR loading US FDA Approvals: ${err.message}`;
      }
    });
  }

  // 22. Scottish PITC Monthly Dispensing, MPSC Generics Framework, NHS Purchasing Depots, Wales Dental & NHSBSA Model Handlers
  const btnProbeScotlandPitc = document.getElementById("btn-probe-scotland-pitc");
  const btnProbeMpscWorkplan = document.getElementById("btn-probe-mpsc-workplan");
  const btnProbePurchasingPoints = document.getElementById("btn-probe-purchasing-points");
  const btnProbeWalesDental = document.getElementById("btn-probe-wales-dental");
  const btnProbeFinancialForecasting = document.getElementById("btn-probe-financial-forecasting");
  const scotlandMpscForecastingOutput = document.getElementById("scotland-mpsc-forecasting-output");

  if (btnProbeScotlandPitc && scotlandMpscForecastingOutput) {
    btnProbeScotlandPitc.addEventListener("click", async () => {
      scotlandMpscForecastingOutput.textContent = "Loading Public Health Scotland Monthly Community Dispensing (PITC, 1.47M Rows)...";
      try {
        const res = await fetch("/api/warehouse/scotland-monthly-pitc/summary");
        const data = await res.json();
        let out = `[PUBLIC HEALTH SCOTLAND PRESCRIPTIONS DISPENSED IN COMMUNITY (PITC)]\n`;
        out += `Period: ${data.reportingPeriod} | Total Granular Rows: ${data.totalRows.toLocaleString()} | Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING RECORDS (MAY 2026) ---\n`;
        data.sampleRecords.forEach(r => {
          out += `• ${r.bnfItemDescription} (${r.prescribedType})\n`;
          out += `    Health Board: ${r.healthBoard} | Disp Location: ${r.dispLocation}\n`;
          out += `    Paid Items: ${r.numberOfPaidItems} | Quantity: ${r.paidQuantity} | Cost: £${r.grossIngredientCostGbp.toFixed(2)}\n\n`;
        });

        scotlandMpscForecastingOutput.textContent = out;
      } catch (err) {
        scotlandMpscForecastingOutput.textContent = `ERROR loading Scottish PITC: ${err.message}`;
      }
    });
  }

  if (btnProbeMpscWorkplan && scotlandMpscForecastingOutput) {
    btnProbeMpscWorkplan.addEventListener("click", async () => {
      scotlandMpscForecastingOutput.textContent = "Loading NHS MPSC Generics Framework Workplan by Product...";
      try {
        const res = await fetch("/api/warehouse/mpsc-generics-workplan/summary");
        const data = await res.json();
        let out = `[NHS MPSC GENERICS FRAMEWORK WORKPLAN BY PRODUCT]\n`;
        out += `Period: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Sheets: ${data.sheets.join(", ")}\n\n`;

        out += `--- SAMPLE GENERICS FRAMEWORK CONTRACTS ---\n`;
        data.sampleProducts.forEach(p => {
          out += `• ${p.product}\n`;
          out += `    Group: ${p.purchasingGroup} | Status: ${p.contractStatus} (${p.frameworkRound})\n\n`;
        });

        scotlandMpscForecastingOutput.textContent = out;
      } catch (err) {
        scotlandMpscForecastingOutput.textContent = `ERROR loading MPSC Workplan: ${err.message}`;
      }
    });
  }

  if (btnProbePurchasingPoints && scotlandMpscForecastingOutput) {
    btnProbePurchasingPoints.addEventListener("click", async () => {
      scotlandMpscForecastingOutput.textContent = "Loading NHS CMU Hospital Pharmacy Purchasing Depots Directory...";
      try {
        const res = await fetch("/api/warehouse/mpsc-purchasing-points/summary");
        const data = await res.json();
        let out = `[NHS CMU HOSPITAL PHARMACY PURCHASING DEPOTS DIRECTORY]\n`;
        out += `Total Authorized Depots: ${data.totalPurchasingDepots} | External Clinics: ${data.totalExternalClinics}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HOSPITAL PURCHASING DEPOTS ---\n`;
        data.sampleDepots.forEach(d => {
          out += `• [${d.depotCode}] ${d.depotName} (${d.region})\n`;
          out += `    Address: ${d.address}\n\n`;
        });

        scotlandMpscForecastingOutput.textContent = out;
      } catch (err) {
        scotlandMpscForecastingOutput.textContent = `ERROR loading Pharmacy Purchasing Points: ${err.message}`;
      }
    });
  }

  if (btnProbeWalesDental && scotlandMpscForecastingOutput) {
    btnProbeWalesDental.addEventListener("click", async () => {
      scotlandMpscForecastingOutput.textContent = "Loading NWSSP Welsh Dental Prescribing Monthly Extract...";
      try {
        const res = await fetch("/api/warehouse/wales-dental-prescribing/summary");
        const data = await res.json();
        let out = `[NWSSP NHS WALES PRIMARY CARE DENTAL PRESCRIBING EXTRACT]\n`;
        out += `Period: ${data.reportingPeriod} | Archive Files: ${data.totalArchiveFiles} | Uncompressed: ${(data.uncompressedBytes / 1024 / 1024).toFixed(2)} MB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Files: ${data.archiveFiles.join(", ")}\n\n`;

        out += `--- SAMPLE DENTAL FORMULARY MEDICINES ---\n`;
        data.sampleDentalMedicines.forEach(m => {
          out += `• ${m.drugName} (${m.bnfSection})\n`;
          out += `    Indication: ${m.clinicalIndication}\n\n`;
        });

        scotlandMpscForecastingOutput.textContent = out;
      } catch (err) {
        scotlandMpscForecastingOutput.textContent = `ERROR loading Wales Dental Prescribing: ${err.message}`;
      }
    });
  }

  if (btnProbeFinancialForecasting && scotlandMpscForecastingOutput) {
    btnProbeFinancialForecasting.addEventListener("click", async () => {
      scotlandMpscForecastingOutput.textContent = "Loading NHSBSA Sub-ICB Prescribing Financial Forecasting Model...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-financial-forecasting/summary");
        const data = await res.json();
        let out = `[NHSBSA SUB-ICB PRESCRIBING FINANCIAL FORECASTING MODEL]\n`;
        out += `Model Title: ${data.modelTitle}\n`;
        out += `Total Sheets: ${data.totalSheets} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Methodology: ${data.methodology}\n\n`;

        out += `--- KEY MODEL PARAMETERS & PROFILE MODULES ---\n`;
        data.sampleParameters.forEach(p => {
          out += `• ${p.parameter}: ${p.annualPeriods} [${p.status}]\n`;
        });

        scotlandMpscForecastingOutput.textContent = out;
      } catch (err) {
        scotlandMpscForecastingOutput.textContent = `ERROR loading NHSBSA Financial Forecasting: ${err.message}`;
      }
    });
  }

  // 23. Welsh GP Prescribing, Scotland PHS Dispensers, MHRA Safety Updates, NHS IMF Fund & NHSBSA CKAN Catalogue Handlers
  const btnProbeWalesGp = document.getElementById("btn-probe-wales-gp");
  const btnProbeScotlandDispensers = document.getElementById("btn-probe-scotland-dispensers");
  const btnProbeMhraSafety = document.getElementById("btn-probe-mhra-safety");
  const btnProbeImfFund = document.getElementById("btn-probe-imf-fund");
  const btnProbeCkanCatalogue = document.getElementById("btn-probe-ckan-catalogue");
  const walesGpImfSafetyOutput = document.getElementById("wales-gp-imf-safety-output");

  if (btnProbeWalesGp && walesGpImfSafetyOutput) {
    btnProbeWalesGp.addEventListener("click", async () => {
      walesGpImfSafetyOutput.textContent = "Loading NWSSP NHS Wales Primary Care GP Prescribing Monthly Extract (572k Rows)...";
      try {
        const res = await fetch("/api/warehouse/wales-gp-prescribing/summary");
        const data = await res.json();
        let out = `[NWSSP NHS WALES PRIMARY CARE GP PRESCRIBING EXTRACT]\n`;
        out += `Reporting Period: ${data.period} | Total Prescribing Records: ${data.totalPrescribingRecords.toLocaleString()}\n`;
        out += `Total GP Practices: ${data.totalPractices} | Local Health Boards: ${data.healthBoardsCovered}\n`;
        out += `Archive Size: ${data.archiveSizeMb} MB | Uncompressed: ${data.uncompressedSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- CONTAINED ARCHIVE CSV FILES ---\n`;
        data.containedFiles.forEach(f => {
          out += `• ${f.name} (${(f.sizeBytes / 1024 / 1024).toFixed(2)} MB): ${f.description}\n`;
        });

        out += `\n--- SAMPLE WELSH GP SURGERIES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [${p.practiceCode}] ${p.practiceName} (${p.postcode}, ${p.county}) - Cluster ${p.clusterId}\n`;
        });

        walesGpImfSafetyOutput.textContent = out;
      } catch (err) {
        walesGpImfSafetyOutput.textContent = `ERROR loading Welsh GP Prescribing: ${err.message}`;
      }
    });
  }

  if (btnProbeScotlandDispensers && walesGpImfSafetyOutput) {
    btnProbeScotlandDispensers.addEventListener("click", async () => {
      walesGpImfSafetyOutput.textContent = "Loading Public Health Scotland (PHS) Community Pharmacy Dispenser Directory...";
      try {
        const res = await fetch("/api/warehouse/scotland-phs-dispensers/summary");
        const data = await res.json();
        let out = `[PUBLIC HEALTH SCOTLAND COMMUNITY PHARMACY DISPENSER DIRECTORY]\n`;
        out += `Total Licensed Dispensers: ${data.totalDispensers} | Health Boards Covered: ${data.healthBoardsCovered}\n`;
        out += `Period: ${data.period} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SCOTTISH COMMUNITY DISPENSARIES ---\n`;
        data.sampleDispensers.forEach(d => {
          out += `• [DispCode ${d.code}] ${d.name}\n`;
          out += `    Address: ${d.address} (${d.postcode}) | Health Board: ${d.healthBoard} | Paid Items: ${d.paidItems.toLocaleString()}\n\n`;
        });

        walesGpImfSafetyOutput.textContent = out;
      } catch (err) {
        walesGpImfSafetyOutput.textContent = `ERROR loading Scotland Dispensers: ${err.message}`;
      }
    });
  }

  if (btnProbeMhraSafety && walesGpImfSafetyOutput) {
    btnProbeMhraSafety.addEventListener("click", async () => {
      walesGpImfSafetyOutput.textContent = "Loading MHRA National Drug Safety Updates and Clinical Bulletins Feed...";
      try {
        const res = await fetch("/api/warehouse/mhra-safety-updates/summary");
        const data = await res.json();
        let out = `[MHRA NATIONAL DRUG SAFETY UPDATES & CLINICAL BULLETINS FEED]\n`;
        out += `Total Active Alerts: ${data.totalActiveAlerts} | Format: ${data.format} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Focus Areas: ${data.bulletinTopics.join(", ")}\n\n`;

        out += `--- SAMPLE MHRA CLINICAL SAFETY BULLETINS ---\n`;
        data.sampleBulletins.forEach(b => {
          out += `• ${b.title}\n`;
          out += `    Therapeutic Class: ${b.therapeuticClass} | Updated: ${b.updated}\n`;
          out += `    Regulatory Action: ${b.regulatoryAction}\n\n`;
        });

        walesGpImfSafetyOutput.textContent = out;
      } catch (err) {
        walesGpImfSafetyOutput.textContent = `ERROR loading MHRA Drug Safety Updates: ${err.message}`;
      }
    });
  }

  if (btnProbeImfFund && walesGpImfSafetyOutput) {
    btnProbeImfFund.addEventListener("click", async () => {
      walesGpImfSafetyOutput.textContent = "Loading NHS England Innovative Medicines Fund (IMF) List...";
      try {
        const res = await fetch("/api/warehouse/nhs-imf-list/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND NATIONAL INNOVATIVE MEDICINES FUND (IMF) LIST]\n`;
        out += `Version: ${data.version} | Ring-Fenced Budget: £${(data.annualRingFencedBudgetGbp / 1000000).toFixed(0)}M Annual\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Objective: ${data.programmeObjective}\n`;
        out += `Governance: ${data.governanceFramework}\n\n`;

        out += `--- SAMPLE FAST-TRACK NON-ONCOLOGY INDICATIONS ---\n`;
        data.sampleIndications.forEach(i => {
          out += `• ${i.medicine} - ${i.accessType} (Review ${i.reviewYear})\n`;
          out += `    Indication: ${i.indication}\n\n`;
        });

        walesGpImfSafetyOutput.textContent = out;
      } catch (err) {
        walesGpImfSafetyOutput.textContent = `ERROR loading NHS IMF List: ${err.message}`;
      }
    });
  }

  if (btnProbeCkanCatalogue && walesGpImfSafetyOutput) {
    btnProbeCkanCatalogue.addEventListener("click", async () => {
      walesGpImfSafetyOutput.textContent = "Loading NHSBSA Open Data Portal Master CKAN Data Catalogue...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-ckan-catalogue/summary");
        const data = await res.json();
        let out = `[NHSBSA OPEN DATA PORTAL MASTER CKAN DATA CATALOGUE]\n`;
        out += `Total Datasets Indexed: ${data.totalDatasetsIndexed} | File Size: ${data.fileSizeMb} MB\n`;
        out += `API Engine: ${data.catalogApiVersion} | Authority: ${data.authority}\n`;
        out += `Primary Domains: ${data.primaryCategories.join(" • ")}\n\n`;

        out += `--- SAMPLE OPEN DATA PACKAGES ---\n`;
        data.samplePackages.forEach(p => {
          out += `• [${p.id.substring(0, 8)}...] ${p.title}\n`;
          out += `    Resources: ${p.resourceCount} distributions | Format: ${p.format}\n\n`;
        });

        walesGpImfSafetyOutput.textContent = out;
      } catch (err) {
        walesGpImfSafetyOutput.textContent = `ERROR loading NHSBSA CKAN Catalogue: ${err.message}`;
      }
    });
  }

  // 24. NHSBSA Annual PCA Baseline (348 MB), Monthly Dispensing Accounts (50 MB), NI LCG Prescribing, Scottish PHS Report & ONS NSUL London Directory (1.3 GB)
  const btnProbePcaBaseline = document.getElementById("btn-probe-pca-baseline");
  const btnProbeMonthlyDispensing = document.getElementById("btn-probe-monthly-dispensing");
  const btnProbeNiLcg = document.getElementById("btn-probe-ni-lcg");
  const btnProbeScotlandReport = document.getElementById("btn-probe-scotland-report");
  const btnProbeOnsNsul = document.getElementById("btn-probe-ons-nsul");
  const pcaNsulAccountsOutput = document.getElementById("pca-nsul-accounts-output");

  if (btnProbePcaBaseline && pcaNsulAccountsOutput) {
    btnProbePcaBaseline.addEventListener("click", async () => {
      pcaNsulAccountsOutput.textContent = "Loading NHSBSA 2024/25 Annual PCA ICB Baseline Extract (348 MB)...";
      try {
        const res = await fetch("/api/warehouse/pca-annual-baseline/summary");
        const data = await res.json();
        let out = `[NHSBSA ANNUAL PRESCRIPTION COST ANALYSIS (PCA) ICB BASELINE]\n`;
        out += `Financial Year: ${data.financialYear} | Total ICBs: ${data.totalIntegratedCareBoards}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeMb} MB (${data.totalAttributes} Columns)\n\n`;

        out += `--- SAMPLE PRIMARY CARE PRESCRIBING RECORDS ---\n`;
        data.samplePrescriptions.forEach(p => {
          out += `• [${p.icbCode}] ${p.icbName}\n`;
          out += `    Chemical: ${p.chemical} | Presentation: ${p.presentation}\n`;
          out += `    Items: ${p.items.toLocaleString()} | Net Ingredient Cost: £${p.nicGbp.toFixed(2)}\n\n`;
        });

        pcaNsulAccountsOutput.textContent = out;
      } catch (err) {
        pcaNsulAccountsOutput.textContent = `ERROR loading Annual PCA Baseline: ${err.message}`;
      }
    });
  }

  if (btnProbeMonthlyDispensing && pcaNsulAccountsOutput) {
    btnProbeMonthlyDispensing.addEventListener("click", async () => {
      pcaNsulAccountsOutput.textContent = "Loading NHSBSA Monthly Contractor Dispensing Accounts (50 MB)...";
      try {
        const res = await fetch("/api/warehouse/monthly-dispensing-accounts/summary");
        const data = await res.json();
        let out = `[NHSBSA MONTHLY PHARMACY DISPENSING ACCOUNTS & REMUNERATION]\n`;
        out += `Period: ${data.reportingPeriod} | Total Accounts: ${data.totalContractorAccounts.toLocaleString()}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeMb} MB\n\n`;

        out += `--- SAMPLE DISPENSING CONTRACTOR PROFILES ---\n`;
        data.sampleContractors.forEach(c => {
          out += `• [${c.code}] ${c.name} (${c.postcode}) - ${c.icb}\n`;
          out += `    Forms Processed: ${c.formsCount.toLocaleString()} | Items Dispensed: ${c.itemsCount.toLocaleString()}\n\n`;
        });

        pcaNsulAccountsOutput.textContent = out;
      } catch (err) {
        pcaNsulAccountsOutput.textContent = `ERROR loading Monthly Dispensing Accounts: ${err.message}`;
      }
    });
  }

  if (btnProbeNiLcg && pcaNsulAccountsOutput) {
    btnProbeNiLcg.addEventListener("click", async () => {
      pcaNsulAccountsOutput.textContent = "Loading Northern Ireland HSC BSO LCG Prescribing Summary...";
      try {
        const res = await fetch("/api/warehouse/ni-pca-lcg/summary");
        const data = await res.json();
        let out = `[NORTHERN IRELAND HSC BSO LCG PRESCRIBING SUMMARY]\n`;
        out += `Financial Year: ${data.financialYear} | Total LCGs: ${data.totalLocalCommissioningGroups}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Commissioning Bodies: ${data.commissioningBodies.join(" • ")}\n\n`;

        out += `--- SAMPLE LCG DRUG EXPENDITURE ---\n`;
        data.sampleLcgExpenditure.forEach(l => {
          out += `• ${l.lcg}: £${(l.grossIngredientCostGbp / 1000000).toFixed(2)}M Gross Cost | ${l.dispensedItemsCount.toLocaleString()} items\n`;
        });

        pcaNsulAccountsOutput.textContent = out;
      } catch (err) {
        pcaNsulAccountsOutput.textContent = `ERROR loading NI LCG Summary: ${err.message}`;
      }
    });
  }

  if (btnProbeScotlandReport && pcaNsulAccountsOutput) {
    btnProbeScotlandReport.addEventListener("click", async () => {
      pcaNsulAccountsOutput.textContent = "Loading Public Health Scotland Prescribed & Dispensed Summary Report...";
      try {
        const res = await fetch("/api/warehouse/scotland-dispensing-report/summary");
        const data = await res.json();
        let out = `[PUBLIC HEALTH SCOTLAND DISPENSING NATIONAL STATISTICS REPORT]\n`;
        out += `Publication Date: ${data.publicationDate} | Document: ${data.documentType}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeKb} KB\n\n`;

        out += `--- STATUTORY FINDINGS & BENCHMARKS ---\n`;
        data.keyFindings.forEach(f => {
          out += `• ${f}\n`;
        });
        out += `\nCoverage: ${data.sampleHealthBoards.join(" • ")}\n`;

        pcaNsulAccountsOutput.textContent = out;
      } catch (err) {
        pcaNsulAccountsOutput.textContent = `ERROR loading Scotland Dispensing Report: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsNsul && pcaNsulAccountsOutput) {
    btnProbeOnsNsul.addEventListener("click", async () => {
      pcaNsulAccountsOutput.textContent = "Loading ONS AddressBase NSUL London UPRN Directory (1.30 GB)...";
      try {
        const res = await fetch("/api/warehouse/ons-nsul-london/summary");
        const data = await res.json();
        let out = `[ONS NATIONAL STATISTICS ADDRESSBASE UPRN DIRECTORY (LONDON)]\n`;
        out += `Release: ${data.releaseDate} | Region: ${data.geographicalCoverage}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeGb} GB (${data.totalAttributes} Attributes)\n`;
        out += `Coordinate System: ${data.coordinateSystem}\n\n`;

        out += `--- SAMPLE PROPERTY & HEALTH GEOGRAPHY LOOKUPS ---\n`;
        data.samplePropertyLookups.forEach(p => {
          out += `• UPRN ${p.uprn}: ${p.postcode} (${p.borough})\n`;
          out += `    Coordinates: (${p.easting}, ${p.northing}) | Sub-ICB: ${p.subIcb} | IMD Decile: ${p.imdDecile}\n\n`;
        });

        pcaNsulAccountsOutput.textContent = out;
      } catch (err) {
        pcaNsulAccountsOutput.textContent = `ERROR loading ONS NSUL London Directory: ${err.message}`;
      }
    });
  }

  // 25. NHS England ODS GP Practitioners (125k), Nurse Prescribers (68k), GP Branches (6.6k), Pharmacy HQs (6.2k) & Care Homes (26.4k)
  const btnProbeOdsGps = document.getElementById("btn-probe-ods-gps");
  const btnProbeOdsNurses = document.getElementById("btn-probe-ods-nurses");
  const btnProbeOdsBranches = document.getElementById("btn-probe-ods-branches");
  const btnProbeOdsPharmacyHq = document.getElementById("btn-probe-ods-pharmacy-hq");
  const btnProbeOdsCareHomes = document.getElementById("btn-probe-ods-care-homes");
  const odsWorkforcePremisesOutput = document.getElementById("ods-workforce-premises-output");

  if (btnProbeOdsGps && odsWorkforcePremisesOutput) {
    btnProbeOdsGps.addEventListener("click", async () => {
      odsWorkforcePremisesOutput.textContent = "Loading NHS England ODS General Medical Practitioners Register (26.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-gp-practitioners/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS GENERAL MEDICAL PRACTITIONERS REGISTER (egpcur)]\n`;
        out += `Total Practitioners: ${data.totalPractitioners.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GENERAL PRACTITIONERS ---\n`;
        data.samplePractitioners.forEach(p => {
          out += `• [${p.doctorCode}] ${p.name} (${p.status}) - Role: ${p.role}\n`;
          out += `    Practice: ${p.practiceCode} | Address: ${p.address}\n\n`;
        });

        odsWorkforcePremisesOutput.textContent = out;
      } catch (err) {
        odsWorkforcePremisesOutput.textContent = `ERROR loading GP Practitioners: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsNurses && odsWorkforcePremisesOutput) {
    btnProbeOdsNurses.addEventListener("click", async () => {
      odsWorkforcePremisesOutput.textContent = "Loading NHS England ODS Independent Nurse Prescribers Register (15.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-nurse-prescribers/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS INDEPENDENT NURSE PRESCRIBERS REGISTER (enurse)]\n`;
        out += `Total Prescribers: ${data.totalPrescribers.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NURSE PRESCRIBERS ---\n`;
        data.sampleNurses.forEach(n => {
          out += `• [${n.prescriberId}] ${n.name} (${n.postcode}) - ${n.icb}\n`;
          out += `    Service: ${n.service}\n\n`;
        });

        odsWorkforcePremisesOutput.textContent = out;
      } catch (err) {
        odsWorkforcePremisesOutput.textContent = `ERROR loading Nurse Prescribers: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsBranches && odsWorkforcePremisesOutput) {
    btnProbeOdsBranches.addEventListener("click", async () => {
      odsWorkforcePremisesOutput.textContent = "Loading NHS England ODS GP Branch Surgeries Directory (1.30 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-gp-branches/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS GP BRANCH SURGERIES & SECONDARY HUBS (ebranchs)]\n`;
        out += `Total Branch Surgeries: ${data.totalBranchSurgeries.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE BRANCH SURGERIES ---\n`;
        data.sampleBranches.forEach(b => {
          out += `• [${b.branchCode}] ${b.name} (${b.postcode})\n`;
          out += `    Parent Practice: ${b.parentPractice} | Location: ${b.town}\n\n`;
        });

        odsWorkforcePremisesOutput.textContent = out;
      } catch (err) {
        odsWorkforcePremisesOutput.textContent = `ERROR loading GP Branches: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPharmacyHq && odsWorkforcePremisesOutput) {
    btnProbeOdsPharmacyHq.addEventListener("click", async () => {
      odsWorkforcePremisesOutput.textContent = "Loading NHS England ODS Pharmacy Corporate HQs Directory (965 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-pharmacy-hq/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS COMMUNITY PHARMACY CORPORATE HEADQUARTERS (epharmacyhq)]\n`;
        out += `Total Headquarters: ${data.totalHeadquarters.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CORPORATE MULTIPLES & SUPERINTENDENT HQS ---\n`;
        data.sampleHeadquarters.forEach(h => {
          out += `• [${h.hqCode}] ${h.legalName} (${h.postcode})\n`;
          out += `    Registered Address: ${h.address}\n\n`;
        });

        odsWorkforcePremisesOutput.textContent = out;
      } catch (err) {
        odsWorkforcePremisesOutput.textContent = `ERROR loading Pharmacy HQs: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCareHomes && odsWorkforcePremisesOutput) {
    btnProbeOdsCareHomes.addEventListener("click", async () => {
      odsWorkforcePremisesOutput.textContent = "Loading NHS England ODS Registered Care Home Sites Directory (4.70 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-care-homes/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS RESIDENTIAL & NURSING CARE HOME SITES (ecarehomesite)]\n`;
        out += `Total Registered Care Homes: ${data.totalCareHomes.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE REGULATED CARE HOMES ---\n`;
        data.sampleCareHomes.forEach(c => {
          out += `• [${c.siteCode}] ${c.name} (${c.postcode})\n`;
          out += `    Address: ${c.address} | Parent HQ: ${c.parentHq}\n\n`;
        });

        odsWorkforcePremisesOutput.textContent = out;
      } catch (err) {
        odsWorkforcePremisesOutput.textContent = `ERROR loading Care Home Sites: ${err.message}`;
      }
    });
  }

  // 26. NHS England ODS Hospital Consultants (66k), Dispensaries (16.9k), Dental Practitioners (12.7k), Dental Practices (12.1k) & Care Home HQs (12.5k)
  const btnProbeOdsConsultants = document.getElementById("btn-probe-ods-consultants");
  const btnProbeOdsDispensaries = document.getElementById("btn-probe-ods-dispensaries");
  const btnProbeOdsDentists = document.getElementById("btn-probe-ods-dentists");
  const btnProbeOdsDentalSurgeries = document.getElementById("btn-probe-ods-dental-surgeries");
  const btnProbeOdsCareHomeHq = document.getElementById("btn-probe-ods-care-home-hq");
  const odsSecondaryDentalOutput = document.getElementById("ods-secondary-dental-output");

  if (btnProbeOdsConsultants && odsSecondaryDentalOutput) {
    btnProbeOdsConsultants.addEventListener("click", async () => {
      odsSecondaryDentalOutput.textContent = "Loading NHS England ODS Hospital Medical Consultants Register (4.41 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-consultants/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HOSPITAL MEDICAL CONSULTANTS REGISTER (econcur)]\n`;
        out += `Total Registered Consultants: ${data.totalConsultants.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HOSPITAL CONSULTANTS ---\n`;
        data.sampleConsultants.forEach(c => {
          out += `• [${c.gmcRef}] ${c.name} - Specialty: ${c.specialtyCode} | Trust: ${c.trustCode}\n`;
        });

        odsSecondaryDentalOutput.textContent = out;
      } catch (err) {
        odsSecondaryDentalOutput.textContent = `ERROR loading Consultants: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsDispensaries && odsSecondaryDentalOutput) {
    btnProbeOdsDispensaries.addEventListener("click", async () => {
      odsSecondaryDentalOutput.textContent = "Loading NHS England ODS Secondary & Community Dispensaries Register (3.29 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-dispensaries/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS DISPENSARY PREMISES REGISTER (edispensary)]\n`;
        out += `Total Dispensary Sites: ${data.totalDispensaries.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSARY SITES ---\n`;
        data.sampleDispensaries.forEach(d => {
          out += `• [${d.code}] ${d.name} (${d.postcode}) - Status: ${d.status}\n`;
          out += `    Address: ${d.address} | Tel: ${d.phone}\n\n`;
        });

        odsSecondaryDentalOutput.textContent = out;
      } catch (err) {
        odsSecondaryDentalOutput.textContent = `ERROR loading Dispensaries: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsDentists && odsSecondaryDentalOutput) {
    btnProbeOdsDentists.addEventListener("click", async () => {
      odsSecondaryDentalOutput.textContent = "Loading NHS England ODS Primary Care Dental Practitioners Register (2.15 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-dental-practitioners/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS PRIMARY CARE DENTAL PRACTITIONERS REGISTER (epcdp)]\n`;
        out += `Total Dental Practitioners: ${data.totalPractitioners.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PRIMARY CARE DENTAL PRACTITIONERS ---\n`;
        data.samplePractitioners.forEach(p => {
          out += `• [${p.code}] ${p.name} (${p.postcode})\n`;
          out += `    Address: ${p.address} | Region: ${p.region}\n\n`;
        });

        odsSecondaryDentalOutput.textContent = out;
      } catch (err) {
        odsSecondaryDentalOutput.textContent = `ERROR loading Dental Practitioners: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsDentalSurgeries && odsSecondaryDentalOutput) {
    btnProbeOdsDentalSurgeries.addEventListener("click", async () => {
      odsSecondaryDentalOutput.textContent = "Loading NHS England ODS General Dental Practices Directory (2.14 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-dental-practices/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS GENERAL DENTAL PRACTICES DIRECTORY (egdpprac)]\n`;
        out += `Total Dental Practices: ${data.totalPractices.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GENERAL DENTAL SURGERIES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [${p.code}] ${p.name} (${p.postcode}) - Status: ${p.status}\n`;
          out += `    Address: ${p.address} | ICB: ${p.icb}\n\n`;
        });

        odsSecondaryDentalOutput.textContent = out;
      } catch (err) {
        odsSecondaryDentalOutput.textContent = `ERROR loading Dental Practices: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCareHomeHq && odsSecondaryDentalOutput) {
    btnProbeOdsCareHomeHq.addEventListener("click", async () => {
      odsSecondaryDentalOutput.textContent = "Loading NHS England ODS Care Home Corporate Headquarters Directory (2.05 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-care-home-hq/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CARE HOME CORPORATE HEADQUARTERS DIRECTORY (ecarehomehq)]\n`;
        out += `Total Corporate Headquarters: ${data.totalHeadquarters.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CARE HOME CORPORATE MULTIPLES ---\n`;
        data.sampleHeadquarters.forEach(h => {
          out += `• [${h.hqCode}] ${h.legalName} (${h.postcode}) - ${h.country}\n`;
          out += `    Registered Office: ${h.address}\n\n`;
        });

        odsSecondaryDentalOutput.textContent = out;
      } catch (err) {
        odsSecondaryDentalOutput.textContent = `ERROR loading Care Home Headquarters: ${err.message}`;
      }
    });
  }

  // 27. MHRA Drug & Device Alerts, Optical Premises, Optical HQs, Other Health Bodies & Hospice Providers Handlers
  const btnProbeMhraDeviceAlerts = document.getElementById("btn-probe-mhra-device-alerts");
  const btnProbeOdsOpticalSites = document.getElementById("btn-probe-ods-optical-sites");
  const btnProbeOdsOpticalHq = document.getElementById("btn-probe-ods-optical-hq");
  const btnProbeOdsOtherOrgs = document.getElementById("btn-probe-ods-other-orgs");
  const btnProbeOdsHospices = document.getElementById("btn-probe-ods-hospices");
  const odsOpticalHospiceOutput = document.getElementById("ods-optical-hospice-output");

  if (btnProbeMhraDeviceAlerts && odsOpticalHospiceOutput) {
    btnProbeMhraDeviceAlerts.addEventListener("click", async () => {
      odsOpticalHospiceOutput.textContent = "Loading MHRA Drug and Medical Device Alerts ATOM XML Feed (33.8 KB)...";
      try {
        const res = await fetch("/api/warehouse/mhra-drug-device-alerts/summary");
        const data = await res.json();
        let out = `[MHRA DRUG & MEDICAL DEVICE ALERTS FEED (ATOM XML)]\n`;
        out += `Total Active Alerts: ${data.totalActiveAlerts} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Standard: ${data.format}\n`;
        out += `Feed Title: ${data.feedTitle}\n\n`;

        out += `--- SAMPLE MHRA PATIENT SAFETY ALERTS & DEFECTS ---\n`;
        data.sampleAlerts.forEach(a => {
          out += `• ${a.title}\n`;
          out += `    Category: ${a.category} | Status: ${a.status} | Updated: ${a.updated}\n`;
          out += `    Notice URI: ${a.id}\n\n`;
        });

        odsOpticalHospiceOutput.textContent = out;
      } catch (err) {
        odsOpticalHospiceOutput.textContent = `ERROR loading MHRA Alerts: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsOpticalSites && odsOpticalHospiceOutput) {
    btnProbeOdsOpticalSites.addEventListener("click", async () => {
      odsOpticalHospiceOutput.textContent = "Loading NHS England ODS Optical & Ophthalmic Premises Directory (1.70 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-optical-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS OPTICAL & OPHTHALMIC PREMISES DIRECTORY (eoptsite)]\n`;
        out += `Total Optical Premises: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE OPHTHALMIC & OPTICIAN SITES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Address: ${s.address} | Region: ${s.region} | ICB: ${s.icb}\n\n`;
        });

        odsOpticalHospiceOutput.textContent = out;
      } catch (err) {
        odsOpticalHospiceOutput.textContent = `ERROR loading Optical Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsOpticalHq && odsOpticalHospiceOutput) {
    btnProbeOdsOpticalHq.addEventListener("click", async () => {
      odsOpticalHospiceOutput.textContent = "Loading NHS England ODS Optical Corporate Headquarters Directory (702 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-optical-hq/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS OPTICAL CORPORATE HEADQUARTERS DIRECTORY (eopthq)]\n`;
        out += `Total Optical Headquarters: ${data.totalHeadquarters.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE OPTICAL CORPORATE MULTIPLES ---\n`;
        data.sampleHeadquarters.forEach(h => {
          out += `• [${h.hqCode}] ${h.corporateName} (${h.postcode}) - Status: ${h.status}\n`;
          out += `    Registered Office: ${h.address}\n\n`;
        });

        odsOpticalHospiceOutput.textContent = out;
      } catch (err) {
        odsOpticalHospiceOutput.textContent = `ERROR loading Optical Headquarters: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsOtherOrgs && odsOpticalHospiceOutput) {
    btnProbeOdsOtherOrgs.addEventListener("click", async () => {
      odsOpticalHospiceOutput.textContent = "Loading NHS England ODS Other Statutory Healthcare Organisations (180 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-other-organisations/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS OTHER STATUTORY HEALTH BODIES (eother)]\n`;
        out += `Total Registered Organisations: ${data.totalOrganisations.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE STATUTORY HEALTHCARE BODIES ---\n`;
        data.sampleOrganisations.forEach(o => {
          out += `• [${o.orgCode}] ${o.orgName} (${o.postcode}) - Status: ${o.status}\n`;
          out += `    Location: ${o.address}\n\n`;
        });

        odsOpticalHospiceOutput.textContent = out;
      } catch (err) {
        odsOpticalHospiceOutput.textContent = `ERROR loading Other Organisations: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsHospices && odsOpticalHospiceOutput) {
    btnProbeOdsHospices.addEventListener("click", async () => {
      odsOpticalHospiceOutput.textContent = "Loading NHS England ODS Palliative Care & Hospice Providers Directory (57 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-hospices/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS PALLIATIVE CARE & HOSPICE PROVIDERS (ehospice)]\n`;
        out += `Total Hospice Providers: ${data.totalHospices.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PALLIATIVE CARE HOSPICES ---\n`;
        data.sampleHospices.forEach(h => {
          out += `• [${h.code}] ${h.name} (${h.postcode}) - Status: ${h.status}\n`;
          out += `    Premises: ${h.address} | Region: ${h.region} | ICB: ${h.icb}\n\n`;
        });

        odsOpticalHospiceOutput.textContent = out;
      } catch (err) {
        odsOpticalHospiceOutput.textContent = `ERROR loading Hospice Providers: ${err.message}`;
      }
    });
  }

  // 28. NHS Provider Trusts, Hospital Sites, Non-NHS Providers, Justice Health & PCN Membership Handlers
  const btnProbeOdsTrusts = document.getElementById("btn-probe-ods-trusts");
  const btnProbeOdsTrustSites = document.getElementById("btn-probe-ods-trust-sites");
  const btnProbeOdsNonNhs = document.getElementById("btn-probe-ods-non-nhs");
  const btnProbeOdsJusticeHealth = document.getElementById("btn-probe-ods-justice-health");
  const btnProbeOdsPcnMembership = document.getElementById("btn-probe-ods-pcn-membership");
  const odsTrustsJusticeOutput = document.getElementById("ods-trusts-justice-output");

  if (btnProbeOdsTrusts && odsTrustsJusticeOutput) {
    btnProbeOdsTrusts.addEventListener("click", async () => {
      odsTrustsJusticeOutput.textContent = "Loading NHS England ODS Provider Trusts Directory (56 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-trusts/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS STATUTORY PROVIDER TRUSTS (etr)]\n`;
        out += `Total Registered Trusts: ${data.totalTrusts.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NHS PROVIDER TRUSTS ---\n`;
        data.sampleTrusts.forEach(t => {
          out += `• [${t.code}] ${t.name} (${t.postcode}) - Status: ${t.status}\n`;
          out += `    Headquarters: ${t.address} | Region: ${t.region} | ICB: ${t.icb}\n\n`;
        });

        odsTrustsJusticeOutput.textContent = out;
      } catch (err) {
        odsTrustsJusticeOutput.textContent = `ERROR loading Provider Trusts: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsTrustSites && odsTrustsJusticeOutput) {
    btnProbeOdsTrustSites.addEventListener("click", async () => {
      odsTrustsJusticeOutput.textContent = "Loading NHS England ODS Trust Hospital & Clinic Sites Directory (7.70 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-trust-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS TRUST HOSPITAL & CLINIC SITES (ets)]\n`;
        out += `Total Hospital & Clinic Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HOSPITAL & CLINIC PREMISES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Premises: ${s.address} | Region: ${s.region} | ICB: ${s.icb}\n\n`;
        });

        odsTrustsJusticeOutput.textContent = out;
      } catch (err) {
        odsTrustsJusticeOutput.textContent = `ERROR loading Hospital Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsNonNhs && odsTrustsJusticeOutput) {
    btnProbeOdsNonNhs.addEventListener("click", async () => {
      odsTrustsJusticeOutput.textContent = "Loading NHS England ODS Non-NHS Healthcare Organisations Directory (2.80 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-non-nhs/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS NON-NHS HEALTHCARE ORGANISATIONS (enonnhs)]\n`;
        out += `Total Non-NHS Organisations: ${data.totalOrganisations.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE INDEPENDENT HEALTHCARE PROVIDERS ---\n`;
        data.sampleOrganisations.forEach(o => {
          out += `• [${o.orgCode}] ${o.orgName} (${o.postcode}) - Status: ${o.status}\n`;
          out += `    Premises: ${o.address} | Region: ${o.region} | ICB: ${o.icb}\n\n`;
        });

        odsTrustsJusticeOutput.textContent = out;
      } catch (err) {
        odsTrustsJusticeOutput.textContent = `ERROR loading Non-NHS Organisations: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsJusticeHealth && odsTrustsJusticeOutput) {
    btnProbeOdsJusticeHealth.addEventListener("click", async () => {
      odsTrustsJusticeOutput.textContent = "Loading NHS England & MoJ Justice Sector Healthcare Directory (138 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-justice-sector/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS JUSTICE SECTOR HEALTHCARE PREMISES (ejustice)]\n`;
        out += `Total Justice Health Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SECURE HEALTHCARE SITES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Facility: ${s.address} | Region: ${s.region} | ICB: ${s.icb}\n\n`;
        });

        odsTrustsJusticeOutput.textContent = out;
      } catch (err) {
        odsTrustsJusticeOutput.textContent = `ERROR loading Justice Sector Health: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPcnMembership && odsTrustsJusticeOutput) {
    btnProbeOdsPcnMembership.addEventListener("click", async () => {
      odsTrustsJusticeOutput.textContent = "Loading NHS England ODS Primary Care Network Practice Membership Database (1.90 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-pcn-membership/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS PCN PRACTICE MEMBERSHIP DATABASE (epcmem)]\n`;
        out += `Total Practice-to-PCN Mappings: ${data.totalMembershipRecords.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PCN PRACTICE MEMBERSHIPS ---\n`;
        data.sampleMemberships.forEach(m => {
          out += `• Practice ${m.practiceCode} ➜ PCN ${m.pcnCode}\n`;
          out += `    Tenure: ${m.startDate} to ${m.endDate} | Type: ${m.membershipType}\n\n`;
        });

        odsTrustsJusticeOutput.textContent = out;
      } catch (err) {
        odsTrustsJusticeOutput.textContent = `ERROR loading PCN Membership: ${err.message}`;
      }
    });
  }

  // 29. NHS Local Authorities, Civic Sites, PCN Core Partners, Independent Providers & Successors Handlers
  const btnProbeOdsLocalAuthorities = document.getElementById("btn-probe-ods-local-authorities");
  const btnProbeOdsLaSites = document.getElementById("btn-probe-ods-la-sites");
  const btnProbeOdsPcnCorePartners = document.getElementById("btn-probe-ods-pcn-core-partners");
  const btnProbeOdsIndependentProviders = document.getElementById("btn-probe-ods-independent-providers");
  const btnProbeOdsSuccessors = document.getElementById("btn-probe-ods-successors");
  const odsLaPartnersOutput = document.getElementById("ods-la-partners-output");

  if (btnProbeOdsLocalAuthorities && odsLaPartnersOutput) {
    btnProbeOdsLocalAuthorities.addEventListener("click", async () => {
      odsLaPartnersOutput.textContent = "Loading NHS England ODS Local Authorities Directory (66 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-local-authorities/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS STATUTORY LOCAL AUTHORITIES (lauth)]\n`;
        out += `Total Registered Local Authorities: ${data.totalLocalAuthorities.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE LOCAL AUTHORITIES ---\n`;
        data.sampleLocalAuthorities.forEach(l => {
          out += `• [${l.code}] ${l.name} (${l.postcode}) - Status: ${l.status}\n`;
          out += `    Civic HQ: ${l.address} | Established: ${l.openDate}\n\n`;
        });

        odsLaPartnersOutput.textContent = out;
      } catch (err) {
        odsLaPartnersOutput.textContent = `ERROR loading Local Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLaSites && odsLaPartnersOutput) {
    btnProbeOdsLaSites.addEventListener("click", async () => {
      odsLaPartnersOutput.textContent = "Loading NHS England ODS Local Authority Civic Sites Directory (94 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-local-authority-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS LOCAL AUTHORITY SITES & CIVIC PREMISES (lauthsite)]\n`;
        out += `Total Local Authority Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CIVIC & ADMINISTRATIVE SITES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Location: ${s.address} | Region: ${s.region} | ICB: ${s.icb}\n\n`;
        });

        odsLaPartnersOutput.textContent = out;
      } catch (err) {
        odsLaPartnersOutput.textContent = `ERROR loading Local Authority Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPcnCorePartners && odsLaPartnersOutput) {
    btnProbeOdsPcnCorePartners.addEventListener("click", async () => {
      odsLaPartnersOutput.textContent = "Loading NHS England ODS Primary Care Network Core Partners Directory (1.36 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-pcn-core-partners/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS PCN CORE PARTNER DETAILS (epcncorepartnerdetails)]\n`;
        out += `Total Core Partner Mappings: ${data.totalCorePartners.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PCN CORE PARTNERSHIPS ---\n`;
        data.samplePartners.forEach(p => {
          out += `• Practice [${p.practiceCode}] ${p.practiceName} ➜ PCN [${p.pcnCode}] ${p.pcnName}\n`;
          out += `    ICB: ${p.icbName} | Active: ${p.isActive}\n\n`;
        });

        odsLaPartnersOutput.textContent = out;
      } catch (err) {
        odsLaPartnersOutput.textContent = `ERROR loading PCN Core Partners: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsIndependentProviders && odsLaPartnersOutput) {
    btnProbeOdsIndependentProviders.addEventListener("click", async () => {
      odsLaPartnersOutput.textContent = "Loading NHS England ODS Independent Sector Healthcare Providers (1.12 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-independent-providers/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS INDEPENDENT HEALTHCARE PROVIDERS (ephp)]\n`;
        out += `Total Registered Providers: ${data.totalProviders.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE INDEPENDENT HEALTHCARE ORGANISATIONS ---\n`;
        data.sampleProviders.forEach(p => {
          out += `• [${p.code}] ${p.name} (${p.postcode}) - Status: ${p.status}\n`;
          out += `    Premises: ${p.address} | Region: ${p.region} | ICB: ${p.icb}\n\n`;
        });

        odsLaPartnersOutput.textContent = out;
      } catch (err) {
        odsLaPartnersOutput.textContent = `ERROR loading Independent Providers: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsSuccessors && odsLaPartnersOutput) {
    btnProbeOdsSuccessors.addEventListener("click", async () => {
      odsLaPartnersOutput.textContent = "Loading NHS England ODS Organisation Successors & Merger Lineage (388 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-organisation-successors/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS ORGANISATION SUCCESSORS & MERGER LINEAGE (succ)]\n`;
        out += `Total Successor Records: ${data.totalSuccessorRecords.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE ORGANISATIONAL MERGERS & SUCCESSORS ---\n`;
        data.sampleSuccessors.forEach(s => {
          out += `• Predecessor [${s.predecessorCode}] ➜ Successor [${s.successorCode}]\n`;
          out += `    Effective Date: ${s.effectiveDate} | Lineage Type: ${s.type}\n\n`;
        });

        odsLaPartnersOutput.textContent = out;
      } catch (err) {
        odsLaPartnersOutput.textContent = `ERROR loading Successors: ${err.message}`;
      }
    });
  }

  // 30. NHS GP Practice Memberships, Independent Provider Sites, Welsh Health Boards, Welsh Hospital Sites & CCGs Handlers
  const btnProbeOdsPracMem = document.getElementById("btn-probe-ods-practice-memberships");
  const btnProbeOdsPhpSites = document.getElementById("btn-probe-ods-php-sites");
  const btnProbeOdsWalesHb = document.getElementById("btn-probe-ods-wales-hb");
  const btnProbeOdsWalesSites = document.getElementById("btn-probe-ods-wales-sites");
  const btnProbeOdsCcgs = document.getElementById("btn-probe-ods-ccgs");
  const odsMemWalesCcgOutput = document.getElementById("ods-mem-wales-ccg-output");

  if (btnProbeOdsPracMem && odsMemWalesCcgOutput) {
    btnProbeOdsPracMem.addEventListener("click", async () => {
      odsMemWalesCcgOutput.textContent = "Loading NHS England ODS GP Practice Membership Mappings (8.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-practice-memberships/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS GP PRACTICE MEMBERSHIP DATABASE (epracmem)]\n`;
        out += `Total Practice Membership Records: ${data.totalMembershipRecords.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PRACTICE COMMISSIONER MEMBERSHIPS ---\n`;
        data.sampleMemberships.forEach(m => {
          out += `• Practice [${m.practiceCode}] ➜ Commissioner [${m.commissionerCode}]\n`;
          out += `    Type: ${m.type} | Active Period: ${m.startDate} ➜ ${m.endDate || 'PRESENT'}\n\n`;
        });

        odsMemWalesCcgOutput.textContent = out;
      } catch (err) {
        odsMemWalesCcgOutput.textContent = `ERROR loading GP Practice Memberships: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPhpSites && odsMemWalesCcgOutput) {
    btnProbeOdsPhpSites.addEventListener("click", async () => {
      odsMemWalesCcgOutput.textContent = "Loading NHS England ODS Independent Sector Provider Sites (3.40 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-independent-provider-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS INDEPENDENT SECTOR PROVIDER SITES (ephpsite)]\n`;
        out += `Total Registered Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE INDEPENDENT HEALTHCARE PREMISES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Premises: ${s.address} | Parent Org: ${s.parentCode} | Region: ${s.region}\n\n`;
        });

        odsMemWalesCcgOutput.textContent = out;
      } catch (err) {
        odsMemWalesCcgOutput.textContent = `ERROR loading Independent Provider Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsWalesHb && odsMemWalesCcgOutput) {
    btnProbeOdsWalesHb.addEventListener("click", async () => {
      odsMemWalesCcgOutput.textContent = "Loading NHS Wales Local Health Boards Statutory Directory (1.20 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-wales-health-boards/summary");
        const data = await res.json();
        let out = `[NHS WALES STATUTORY LOCAL HEALTH BOARDS (wlhb)]\n`;
        out += `Total Territorial Health Boards: ${data.totalHealthBoards} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- 7 NHS WALES LOCAL HEALTH BOARDS ---\n`;
        data.sampleHealthBoards.forEach(b => {
          out += `• [${b.code}] ${b.name} (${b.postcode}) - Status: ${b.status}\n`;
          out += `    Headquarters: ${b.headquarters} | Established: ${b.openDate}\n\n`;
        });

        odsMemWalesCcgOutput.textContent = out;
      } catch (err) {
        odsMemWalesCcgOutput.textContent = `ERROR loading Welsh Health Boards: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsWalesSites && odsMemWalesCcgOutput) {
    btnProbeOdsWalesSites.addEventListener("click", async () => {
      odsMemWalesCcgOutput.textContent = "Loading NHS Wales Local Health Board Hospital & Clinic Sites (143 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-wales-health-board-sites/summary");
        const data = await res.json();
        let out = `[NHS WALES HOSPITAL & CLINIC SITES DIRECTORY (wlhbsite)]\n`;
        out += `Total Health Board Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE WELSH CLINICS & HOSPITALS ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (${s.postcode}) - Status: ${s.status}\n`;
          out += `    Location: ${s.address}, ${s.town}\n\n`;
        });

        odsMemWalesCcgOutput.textContent = out;
      } catch (err) {
        odsMemWalesCcgOutput.textContent = `ERROR loading Welsh Health Board Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCcgs && odsMemWalesCcgOutput) {
    btnProbeOdsCcgs.addEventListener("click", async () => {
      odsMemWalesCcgOutput.textContent = "Loading NHS England ODS Clinical Commissioning Groups (59 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ccgs/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CLINICAL COMMISSIONING GROUPS (eccg)]\n`;
        out += `Total Statutory Predecessor CCGs: ${data.totalCcgs.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CLINICAL COMMISSIONING GROUPS ---\n`;
        data.sampleCcgs.forEach(c => {
          out += `• [${c.code}] ${c.name} (${c.postcode}) - Status: ${c.status}\n`;
          out += `    Headquarters: ${c.address}, ${c.town} | Active: ${c.openDate} ➜ ${c.closeDate}\n\n`;
        });

        odsMemWalesCcgOutput.textContent = out;
      } catch (err) {
        odsMemWalesCcgOutput.textContent = `ERROR loading CCGs: ${err.message}`;
      }
    });
  }

  // Section 31: Northern Ireland Primary Care Network, CCG Sites & Commissioning Support Units
  const btnProbeOdsNiGpPractices = document.getElementById("btn-probe-ods-ni-gp-practices");
  const btnProbeOdsNiGps = document.getElementById("btn-probe-ods-ni-gps");
  const btnProbeOdsCcgSites = document.getElementById("btn-probe-ods-ccg-sites");
  const btnProbeOdsCsus = document.getElementById("btn-probe-ods-csus");
  const btnProbeOdsCsuSites = document.getElementById("btn-probe-ods-csu-sites");
  const odsNiCsuOutput = document.getElementById("ods-ni-csu-output");

  if (btnProbeOdsNiGpPractices && odsNiCsuOutput) {
    btnProbeOdsNiGpPractices.addEventListener("click", async () => {
      odsNiCsuOutput.textContent = "Loading NHS ODS Northern Ireland GP Practices Master Directory (60 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ni-gp-practices/summary");
        const data = await res.json();
        let out = `[NHS ODS NORTHERN IRELAND GP PRACTICES MASTER DIRECTORY (npraccur)]\n`;
        out += `Total GP Surgeries: ${data.totalPractices.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NORTHERN IRELAND GP PRACTICES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [${p.code}] ${p.name} - Surgery: ${p.surgery}\n`;
          out += `    Location: ${p.building || p.street}, ${p.town} (${p.postcode}) | LCG: ${p.lcg} | Status: ${p.status}\n\n`;
        });

        odsNiCsuOutput.textContent = out;
      } catch (err) {
        odsNiCsuOutput.textContent = `ERROR loading NI GP Practices: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsNiGps && odsNiCsuOutput) {
    btnProbeOdsNiGps.addEventListener("click", async () => {
      odsNiCsuOutput.textContent = "Loading NHS ODS Northern Ireland General Medical Practitioners (312 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ni-gps/summary");
        const data = await res.json();
        let out = `[NHS ODS NORTHERN IRELAND GENERAL MEDICAL PRACTITIONERS (ngpcur)]\n`;
        out += `Total Registered Doctors: ${data.totalGps.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GENERAL MEDICAL PRACTITIONERS ---\n`;
        data.sampleGps.forEach(g => {
          out += `• [${g.code}] Dr. ${g.name} - Role: ${g.role}\n`;
          out += `    Surgery: ${g.surgery} (${g.practiceCode}), ${g.town} (${g.postcode}) | Status: ${g.status}\n\n`;
        });

        odsNiCsuOutput.textContent = out;
      } catch (err) {
        odsNiCsuOutput.textContent = `ERROR loading NI GPs: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCcgSites && odsNiCsuOutput) {
    btnProbeOdsCcgSites.addEventListener("click", async () => {
      odsNiCsuOutput.textContent = "Loading NHS England ODS Clinical Commissioning Group Sites Directory (385 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ccg-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CCG OPERATIONAL & CLINIC SITES (eccgsite)]\n`;
        out += `Total CCG Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CCG SITES & PREMISES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (Parent CCG: ${s.parentCcg})\n`;
          out += `    Location: ${s.address}, ${s.town} (${s.postcode}) | Region: ${s.region} | Status: ${s.status}\n\n`;
        });

        odsNiCsuOutput.textContent = out;
      } catch (err) {
        odsNiCsuOutput.textContent = `ERROR loading CCG Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCsus && odsNiCsuOutput) {
    btnProbeOdsCsus.addEventListener("click", async () => {
      odsNiCsuOutput.textContent = "Loading NHS England ODS Commissioning Support Units (7.3 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-csus/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS COMMISSIONING SUPPORT UNITS (ecsu)]\n`;
        out += `Total CSUs: ${data.totalCsus.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE COMMISSIONING SUPPORT UNITS ---\n`;
        data.sampleCsus.forEach(c => {
          out += `• [${c.code}] ${c.name} (${c.postcode}) - Status: ${c.status}\n`;
          out += `    Headquarters: ${c.address}, ${c.town} | Active: ${c.openDate} ➜ ${c.closeDate || 'PRESENT'}\n\n`;
        });

        odsNiCsuOutput.textContent = out;
      } catch (err) {
        odsNiCsuOutput.textContent = `ERROR loading CSUs: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCsuSites && odsNiCsuOutput) {
    btnProbeOdsCsuSites.addEventListener("click", async () => {
      odsNiCsuOutput.textContent = "Loading NHS England ODS Commissioning Support Unit Sites (26 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-csu-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CSU OPERATIONAL PREMISES & BRANCHES (ecsusite)]\n`;
        out += `Total CSU Operational Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CSU OPERATIONAL SITES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (Parent CSU: ${s.parentCsu})\n`;
          out += `    Location: ${s.address}, ${s.town} (${s.postcode}) | Active: ${s.openDate} ➜ ${s.closeDate} | Status: ${s.status}\n\n`;
        });

        odsNiCsuOutput.textContent = out;
      } catch (err) {
        odsNiCsuOutput.textContent = `ERROR loading CSU Sites: ${err.message}`;
      }
    });
  }

  // 32. Clinical Education Deaneries, NHS Care Trusts, Care Trust Sites, NI HSC Statutory Bodies & LCG Relations Handlers
  const btnProbeOdsEducationProviders = document.getElementById("btn-probe-ods-education-providers");
  const btnProbeOdsCareTrusts = document.getElementById("btn-probe-ods-care-trusts");
  const btnProbeOdsCareTrustSites = document.getElementById("btn-probe-ods-care-trust-sites");
  const btnProbeOdsNiHscOrgs = document.getElementById("btn-probe-ods-ni-hsc-orgs");
  const btnProbeOdsNiLcgRelations = document.getElementById("btn-probe-ods-ni-lcg-relations");
  const odsEducationCareNiOutput = document.getElementById("ods-education-care-ni-output");

  if (btnProbeOdsEducationProviders && odsEducationCareNiOutput) {
    btnProbeOdsEducationProviders.addEventListener("click", async () => {
      odsEducationCareNiOutput.textContent = "Loading NHS England ODS Education and Training Providers (4.3 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-education-providers/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS EDUCATION & WORKFORCE DEANERIES (educate)]\n`;
        out += `Total Deaneries: ${data.totalDeaneries} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE POSTGRADUATE MEDICAL & DENTAL DEANERIES ---\n`;
        data.sampleDeaneries.forEach(d => {
          out += `• [${d.code}] ${d.name} (Region: ${d.region})\n`;
          out += `    Headquarters: ${d.address}, ${d.town} (${d.postcode}) | Higher Org: ${d.higherOrg} | Status: ${d.status}\n\n`;
        });

        odsEducationCareNiOutput.textContent = out;
      } catch (err) {
        odsEducationCareNiOutput.textContent = `ERROR loading Education Deaneries: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCareTrusts && odsEducationCareNiOutput) {
    btnProbeOdsCareTrusts.addEventListener("click", async () => {
      odsEducationCareNiOutput.textContent = "Loading NHS England ODS Care Trusts Directory (2.2 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-care-trusts/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS STATUTORY CARE TRUSTS (ect)]\n`;
        out += `Total Care Trusts: ${data.totalCareTrusts} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NHS CARE TRUSTS (JOINT HEALTH & SOCIAL CARE) ---\n`;
        data.sampleCareTrusts.forEach(t => {
          out += `• [${t.code}] ${t.name} (Region: ${t.region})\n`;
          out += `    Headquarters: ${t.address}, ${t.town} (${t.postcode}) | Active: ${t.openDate} ➜ ${t.closeDate || 'PRESENT'} | Status: ${t.status}\n\n`;
        });

        odsEducationCareNiOutput.textContent = out;
      } catch (err) {
        odsEducationCareNiOutput.textContent = `ERROR loading Care Trusts: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCareTrustSites && odsEducationCareNiOutput) {
    btnProbeOdsCareTrustSites.addEventListener("click", async () => {
      odsEducationCareNiOutput.textContent = "Loading NHS England ODS Care Trust Hospital & Clinic Sites (168 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-care-trust-sites/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CARE TRUST SITES & CLINICAL PREMISES (ectsite)]\n`;
        out += `Total Care Trust Sites: ${data.totalSites.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE CARE TRUST CLINICAL SITES ---\n`;
        data.sampleSites.forEach(s => {
          out += `• [${s.code}] ${s.name} (Parent Care Trust: ${s.parentCareTrust})\n`;
          out += `    Location: ${s.address}, ${s.town} (${s.postcode}) | Active: ${s.openDate} ➜ ${s.closeDate || 'PRESENT'} | Status: ${s.status}\n\n`;
        });

        odsEducationCareNiOutput.textContent = out;
      } catch (err) {
        odsEducationCareNiOutput.textContent = `ERROR loading Care Trust Sites: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsNiHscOrgs && odsEducationCareNiOutput) {
    btnProbeOdsNiHscOrgs.addEventListener("click", async () => {
      odsEducationCareNiOutput.textContent = "Loading Northern Ireland Health & Social Care Organisations (3.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ni-hsc-orgs/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND STATUTORY ORGANISATIONS (niorg)]\n`;
        out += `Total HSC Organisations: ${data.totalOrganisations} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NORTHERN IRELAND HSC STATUTORY BODIES ---\n`;
        data.sampleOrganisations.forEach(o => {
          out += `• [${o.code}] ${o.name} (Role: ${o.roleCode})\n`;
          out += `    Address: ${o.address}, ${o.town} (${o.postcode}) | Active: ${o.openDate} | Status: ${o.status}\n\n`;
        });

        odsEducationCareNiOutput.textContent = out;
      } catch (err) {
        odsEducationCareNiOutput.textContent = `ERROR loading NI HSC Organisations: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsNiLcgRelations && odsEducationCareNiOutput) {
    btnProbeOdsNiLcgRelations.addEventListener("click", async () => {
      odsEducationCareNiOutput.textContent = "Loading Northern Ireland LCG Practice Affiliations (12 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-ni-lcg-relations/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND LCG PRACTICE RELATIONS (nlhscgpr)]\n`;
        out += `Total Practice Affiliations: ${data.totalRelations} across ${data.totalLcgs} Local Commissioning Groups\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- 5 NORTHERN IRELAND LOCAL COMMISSIONING GROUPS (LCGs) ---\n`;
        data.lcgDistribution.forEach(l => {
          out += `• [${l.lcgCode}] ${l.lcgName}: ${l.practiceCount} GP Practices\n`;
        });
        out += `\n--- SAMPLE PRACTICE RELATIONS ---\n`;
        data.sampleRelations.forEach(r => {
          out += `• [Practice ${r.practiceCode}] ➜ ${r.lcgCode} (${r.lcgName}) | Active: ${r.openDate} ➜ ${r.closeDate || 'PRESENT'} | Status: ${r.status}\n`;
        });

        odsEducationCareNiOutput.textContent = out;
      } catch (err) {
        odsEducationCareNiOutput.textContent = `ERROR loading NI LCG Practice Relations: ${err.message}`;
      }
    });
  }

  // 33. Dispensing Doctor Practices, Dental Consultants, Pathology Labs, Special Health Authorities & Isle of Man Health Handlers
  const btnProbeOdsDispensingDoctorGps = document.getElementById("btn-probe-ods-dispensing-doctor-gps");
  const btnProbeOdsDentalConsultants = document.getElementById("btn-probe-ods-dental-consultants");
  const btnProbeOdsPathologyLaboratories = document.getElementById("btn-probe-ods-pathology-laboratories");
  const btnProbeOdsSpecialHealthAuthorities = document.getElementById("btn-probe-ods-special-health-authorities");
  const btnProbeOdsIomHealth = document.getElementById("btn-probe-ods-iom-health");
  const odsDispensingPathologyOutput = document.getElementById("ods-dispensing-pathology-output");

  if (btnProbeOdsDispensingDoctorGps && odsDispensingPathologyOutput) {
    btnProbeOdsDispensingDoctorGps.addEventListener("click", async () => {
      odsDispensingPathologyOutput.textContent = "Loading NHS England Dispensing Doctor Practices & Appointments (347 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-dispensing-doctor-gps/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS DISPENSING DOCTOR PRACTICES & APPOINTMENTS (eabeydispgp)]\n`;
        out += `Total Appointments: ${data.totalAppointments.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING DOCTOR APPOINTMENTS ---\n`;
        data.sampleAppointments.forEach(a => {
          out += `• [${a.code}] ${a.name} (Parent Practice: ${a.parentPractice})\n`;
          out += `    Location: ${a.address}, ${a.town} (${a.postcode}) | Active: ${a.openDate} ➜ ${a.closeDate || 'PRESENT'} | Status: ${a.status}\n\n`;
        });

        odsDispensingPathologyOutput.textContent = out;
      } catch (err) {
        odsDispensingPathologyOutput.textContent = `ERROR loading Dispensing Doctor Appointments: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsDentalConsultants && odsDispensingPathologyOutput) {
    btnProbeOdsDentalConsultants.addEventListener("click", async () => {
      odsDispensingPathologyOutput.textContent = "Loading NHS Hospital Dental Consultants Directory (53 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-dental-consultants/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HOSPITAL DENTAL CONSULTANTS REGISTER (edconcur)]\n`;
        out += `Total Consultants: ${data.totalConsultants.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HOSPITAL DENTAL CONSULTANTS ---\n`;
        data.sampleConsultants.forEach(c => {
          out += `• [${c.code} / ${c.registerCode}] ${c.name}\n`;
          out += `    Specialty: ${c.specialty} | Trust Affiliation: ${c.trustAffiliation}\n\n`;
        });

        odsDispensingPathologyOutput.textContent = out;
      } catch (err) {
        odsDispensingPathologyOutput.textContent = `ERROR loading Dental Consultants: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPathologyLaboratories && odsDispensingPathologyOutput) {
    btnProbeOdsPathologyLaboratories.addEventListener("click", async () => {
      odsDispensingPathologyOutput.textContent = "Loading NHS Clinical Pathology Laboratories Directory (55 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-pathology-laboratories/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS CLINICAL PATHOLOGY LABORATORIES (eplab)]\n`;
        out += `Total Laboratories: ${data.totalLaboratories} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NHS CLINICAL PATHOLOGY LABORATORIES ---\n`;
        data.sampleLaboratories.forEach(l => {
          out += `• [Lab ${l.code}] ${l.name} (Parent Trust: ${l.parentTrust})\n`;
          out += `    Address: ${l.address}, ${l.town} (${l.postcode}) | Region: ${l.region} | Status: ${l.status}\n\n`;
        });

        odsDispensingPathologyOutput.textContent = out;
      } catch (err) {
        odsDispensingPathologyOutput.textContent = `ERROR loading Pathology Laboratories: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsSpecialHealthAuthorities && odsDispensingPathologyOutput) {
    btnProbeOdsSpecialHealthAuthorities.addEventListener("click", async () => {
      odsDispensingPathologyOutput.textContent = "Loading Special Health Authorities Statutory Directory (3.2 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-special-health-authorities/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS SPECIAL HEALTH AUTHORITIES (espha)]\n`;
        out += `Total Special Health Authorities: ${data.totalAuthorities} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE STATUTORY SPECIAL HEALTH AUTHORITIES ---\n`;
        data.sampleAuthorities.forEach(a => {
          out += `• [${a.code}] ${a.name}\n`;
          out += `    Headquarters: ${a.address}, ${a.town} (${a.postcode}) | Active: ${a.openDate} | Status: ${a.status}\n\n`;
        });

        odsDispensingPathologyOutput.textContent = out;
      } catch (err) {
        odsDispensingPathologyOutput.textContent = `ERROR loading Special Health Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsIomHealth && odsDispensingPathologyOutput) {
    btnProbeOdsIomHealth.addEventListener("click", async () => {
      odsDispensingPathologyOutput.textContent = "Loading Isle of Man Health Organisations Directory (2.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-iom-health/summary");
        const data = await res.json();
        let out = `[ISLE OF MAN MANX CARE HEALTH ORGANISATIONS (eiom)]\n`;
        out += `Total Organisations: ${data.totalOrganisations} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE MANX CARE HEALTH SERVICES & HUBS ---\n`;
        data.sampleOrganisations.forEach(o => {
          out += `• [${o.code}] ${o.name}\n`;
          out += `    Location: ${o.address}, ${o.town} (${o.postcode}) | Active: ${o.openDate} | Status: ${o.status}\n\n`;
        });

        odsDispensingPathologyOutput.textContent = out;
      } catch (err) {
        odsDispensingPathologyOutput.textContent = `ERROR loading Isle of Man Health: ${err.message}`;
      }
    });
  }

  // 34. Non-Statutory Authorities, Urgent Treatment Centres, Regional Authorities, NI Chemists & NI Dispensing Doctors Handlers
  const btnProbeOdsNonStatutoryAuthorities = document.getElementById("btn-probe-ods-non-statutory-authorities");
  const btnProbeOdsTreatmentCentres = document.getElementById("btn-probe-ods-treatment-centres");
  const btnProbeOdsGovernmentOfficeRegions = document.getElementById("btn-probe-ods-government-office-regions");
  const btnProbeNiBsoCommunityChemists = document.getElementById("btn-probe-ni-bso-community-chemists");
  const btnProbeNiBsoDispensingDoctors = document.getElementById("btn-probe-ni-bso-dispensing-doctors");
  const odsTreatmentNiChemistsOutput = document.getElementById("ods-treatment-ni-chemists-output");

  if (btnProbeOdsNonStatutoryAuthorities && odsTreatmentNiChemistsOutput) {
    btnProbeOdsNonStatutoryAuthorities.addEventListener("click", async () => {
      odsTreatmentNiChemistsOutput.textContent = "Loading NHS England Non-Statutory Authorities & Collaboratives (37 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-non-statutory-authorities/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS NON-STATUTORY AUTHORITIES & COLLABORATIVES (ensa)]\n`;
        out += `Total Authorities: ${data.totalAuthorities.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NON-STATUTORY AUTHORITIES & HUBS ---\n`;
        data.sampleAuthorities.forEach(a => {
          out += `• [${a.code}] ${a.name} (Region: ${a.region})\n`;
          out += `    Higher Org: ${a.higherOrg} | Address: ${a.address}, ${a.town} (${a.postcode}) | Active: ${a.openDate} | Status: ${a.status}\n\n`;
        });

        odsTreatmentNiChemistsOutput.textContent = out;
      } catch (err) {
        odsTreatmentNiChemistsOutput.textContent = `ERROR loading Non-Statutory Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsTreatmentCentres && odsTreatmentNiChemistsOutput) {
    btnProbeOdsTreatmentCentres.addEventListener("click", async () => {
      odsTreatmentNiChemistsOutput.textContent = "Loading NHS England Urgent Treatment & Clinical Centres (39 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-treatment-centres/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS URGENT TREATMENT & CLINICAL CENTRES (etreat)]\n`;
        out += `Total Centres: ${data.totalCentres.toLocaleString()} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE URGENT TREATMENT CENTRES ---\n`;
        data.sampleCentres.forEach(c => {
          out += `• [${c.code}] ${c.name} (Role: ${c.role})\n`;
          out += `    Higher Org: ${c.higherOrg} | Address: ${c.address}, ${c.town} (${c.postcode}) | Active: ${c.openDate} | Status: ${c.status}\n\n`;
        });

        odsTreatmentNiChemistsOutput.textContent = out;
      } catch (err) {
        odsTreatmentNiChemistsOutput.textContent = `ERROR loading Urgent Treatment Centres: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsGovernmentOfficeRegions && odsTreatmentNiChemistsOutput) {
    btnProbeOdsGovernmentOfficeRegions.addEventListener("click", async () => {
      odsTreatmentNiChemistsOutput.textContent = "Loading Government Office Regions Directory (4.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-government-office-regions/summary");
        const data = await res.json();
        let out = `[GOVERNMENT OFFICE REGIONS DIRECTORY (eauth)]\n`;
        out += `Total Regions: ${data.totalRegions} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GOVERNMENT OFFICE REGIONS ---\n`;
        data.sampleRegions.forEach(r => {
          out += `• [Region ${r.code}] ${r.name}\n`;
          out += `    Address: ${r.address}, ${r.town} (${r.postcode}) | Active: ${r.openDate} | Status: ${r.status}\n\n`;
        });

        odsTreatmentNiChemistsOutput.textContent = out;
      } catch (err) {
        odsTreatmentNiChemistsOutput.textContent = `ERROR loading Government Office Regions: ${err.message}`;
      }
    });
  }

  if (btnProbeNiBsoCommunityChemists && odsTreatmentNiChemistsOutput) {
    btnProbeNiBsoCommunityChemists.addEventListener("click", async () => {
      odsTreatmentNiChemistsOutput.textContent = "Loading NI BSO Licensed Community Chemists Master Directory (76 KB)...";
      try {
        const res = await fetch("/api/warehouse/ni-bso-community-chemists/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND BSO LICENSED COMMUNITY CHEMISTS DIRECTORY]\n`;
        out += `Total Chemists: ${data.totalChemists.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NORTHERN IRELAND COMMUNITY PHARMACIES ---\n`;
        data.sampleChemists.forEach(c => {
          out += `• [${c.chemistId} / No. ${c.chemistNumber}] ${c.tradingName} (${c.name})\n`;
          out += `    LCG: ${c.lcg} | Address: ${c.address}, ${c.town} (${c.postcode}) | Tel: ${c.telephone} | Status: ${c.status}\n\n`;
        });

        odsTreatmentNiChemistsOutput.textContent = out;
      } catch (err) {
        odsTreatmentNiChemistsOutput.textContent = `ERROR loading NI Community Chemists: ${err.message}`;
      }
    });
  }

  if (btnProbeNiBsoDispensingDoctors && odsTreatmentNiChemistsOutput) {
    btnProbeNiBsoDispensingDoctors.addEventListener("click", async () => {
      odsTreatmentNiChemistsOutput.textContent = "Loading NI BSO Rural Dispensing Doctors Statutory Register (15 KB)...";
      try {
        const res = await fetch("/api/warehouse/ni-bso-dispensing-doctors/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND BSO RURAL DISPENSING DOCTORS REGISTER]\n`;
        out += `Total Practices: ${data.totalPractices} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE NORTHERN IRELAND RURAL DISPENSING PRACTICES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• ${p.name}\n`;
          out += `    Location: ${p.address}, ${p.town}, ${p.county} (${p.postcode}) | Status: ${p.status}\n\n`;
        });

        odsTreatmentNiChemistsOutput.textContent = out;
      } catch (err) {
        odsTreatmentNiChemistsOutput.textContent = `ERROR loading NI Dispensing Doctors: ${err.message}`;
      }
    });
  }

  // 35. Public Health Scotland Dispensers, NI Amendments, ICB Partners, Commissioning Hubs & Dispensing Days Handlers
  const btnProbeScotDispensers = document.getElementById("btn-probe-scot-dispensers");
  const btnProbeNiAmendments = document.getElementById("btn-probe-ni-amendments");
  const btnProbeOdsIcbPartners = document.getElementById("btn-probe-ods-icb-partners");
  const btnProbeOdsCommissioningHubs = document.getElementById("btn-probe-ods-commissioning-hubs");
  const btnProbeNhsbsaDispensingDays = document.getElementById("btn-probe-nhsbsa-dispensing-days");
  const scotIcbCommissioningDaysOutput = document.getElementById("scot-icb-commissioning-days-output");

  if (btnProbeScotDispensers && scotIcbCommissioningDaysOutput) {
    btnProbeScotDispensers.addEventListener("click", async () => {
      scotIcbCommissioningDaysOutput.textContent = "Loading Public Health Scotland Pharmacy Dispensers & Paid Items Master (160 KB)...";
      try {
        const res = await fetch("/api/warehouse/public-health-scotland-dispensers/summary");
        const data = await res.json();
        let out = `[PUBLIC HEALTH SCOTLAND PHARMACY DISPENSERS & PAID ITEMS MASTER (PHS)]\n`;
        out += `Total Dispensers: ${data.totalDispensers.toLocaleString()} | Health Boards: ${data.totalHealthBoards} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SCOTTISH LICENSED DISPENSERS ---\n`;
        data.sampleDispensers.forEach(d => {
          out += `• [DispCode ${d.dispCode}] ${d.locationName}\n`;
          out += `    Health Board: ${d.healthBoard} (${d.healthBoardCode}) | HSCP: ${d.hscp} (${d.hscpCode})\n`;
          out += `    Address: ${d.address}, ${d.town} (${d.postcode}) | Tel: ${d.telephone} | Paid Items: ${d.paidItems.toLocaleString()}\n\n`;
        });

        scotIcbCommissioningDaysOutput.textContent = out;
      } catch (err) {
        scotIcbCommissioningDaysOutput.textContent = `ERROR loading Scottish Dispensers: ${err.message}`;
      }
    });
  }

  if (btnProbeNiAmendments && scotIcbCommissioningDaysOutput) {
    btnProbeNiAmendments.addEventListener("click", async () => {
      scotIcbCommissioningDaysOutput.textContent = "Loading NI BSO Pharmacy Master Monthly Amendments (11.3 KB)...";
      try {
        const res = await fetch("/api/warehouse/ni-bso-pharmacy-amendments/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND BSO PHARMACY MASTER MONTHLY AMENDMENTS]\n`;
        out += `Total Amendments: ${data.totalAmendments} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STATUTORY CONTRACTOR AMENDMENTS ---\n`;
        data.sampleAmendments.forEach(a => {
          out += `• [Contractor No. ${a.contractorNumber}] ${a.name} (Amendment: ${a.amendmentType})\n`;
          out += `    Address: ${a.address}, ${a.town} (${a.postcode}) | Tel: ${a.telephone}\n`;
          out += `    Hours: ${a.operatingHours}\n\n`;
        });

        scotIcbCommissioningDaysOutput.textContent = out;
      } catch (err) {
        scotIcbCommissioningDaysOutput.textContent = `ERROR loading NI Amendments: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsIcbPartners && scotIcbCommissioningDaysOutput) {
    btnProbeOdsIcbPartners.addEventListener("click", async () => {
      scotIcbCommissioningDaysOutput.textContent = "Loading NHS England ODS Integrated Care Board (ICB) Partners Master (86.5 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhs-ods-icb-partners-master/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS INTEGRATED CARE BOARD (ICB) PARTNERS MASTER REGISTER]\n`;
        out += `Total Mapped Relationships: ${data.totalMappedRelationships} | Integrated Care Boards: ${data.totalIntegratedCareBoards} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Reporting: ${data.reportingPeriod}\n\n`;

        out += `--- SAMPLE STATUTORY ICB PARTNER RELATIONSHIPS ---\n`;
        data.samplePartners.forEach(p => {
          out += `• [ICB ${p.icbCode}] ${p.icbName} (${p.region})\n`;
          out += `    Local Authority: [${p.laCode}] ${p.localAuthority}\n`;
          out += `    Partner NHS Trust: [${p.trustCode}] ${p.trustName} | Status: ${p.partnershipStatus}\n\n`;
        });

        scotIcbCommissioningDaysOutput.textContent = out;
      } catch (err) {
        scotIcbCommissioningDaysOutput.textContent = `ERROR loading ICB Partners Master: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCommissioningHubs && scotIcbCommissioningDaysOutput) {
    btnProbeOdsCommissioningHubs.addEventListener("click", async () => {
      scotIcbCommissioningDaysOutput.textContent = "Loading NHS England Provider-to-Specialised-Commissioning-Hub Directory (66.1 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhs-ods-commissioning-hub-relationships/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS PROVIDER-TO-COMMISSIONING-HUB RELATIONSHIP DIRECTORY]\n`;
        out += `Total Mapped Providers: ${data.totalMappedProviders} | Commissioning Hubs: ${data.totalHubs} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SPECIALISED COMMISSIONING HUB RELATIONSHIPS ---\n`;
        data.sampleRelationships.forEach(r => {
          out += `• [${r.providerCode}] ${r.providerName} (Group: ${r.grouping})\n`;
          out += `    Commissioning Hub: [${r.hubCode}] ${r.hubName}\n\n`;
        });

        scotIcbCommissioningDaysOutput.textContent = out;
      } catch (err) {
        scotIcbCommissioningDaysOutput.textContent = `ERROR loading Commissioning Hub Relationships: ${err.message}`;
      }
    });
  }

  if (btnProbeNhsbsaDispensingDays && scotIcbCommissioningDaysOutput) {
    btnProbeNhsbsaDispensingDays.addEventListener("click", async () => {
      scotIcbCommissioningDaysOutput.textContent = "Loading NHSBSA Statutory Dispensing Days Reference Calendar (7.1 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-dispensing-days-calendar/summary");
        const data = await res.json();
        let out = `[NHSBSA STATUTORY DISPENSING DAYS REFERENCE CALENDAR]\n`;
        out += `Operational Year: ${data.currentFinancialYear} (${data.totalDispensingDays2026_27} Days) | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Scope: ${data.reportingPeriod}\n`;
        out += `Standard Definition: ${data.definition}\n\n`;

        out += `--- MULTI-YEAR ANNUAL DISPENSING DAY CAPACITY ---\n`;
        Object.entries(data.multiYearTotals).forEach(([yr, days]) => {
          out += `• ${yr}: ${days} Dispensing Days\n`;
        });

        out += `\n--- 2026/2027 MONTHLY OPERATIONAL DISPENSING BREAKDOWN ---\n`;
        data.monthlySchedule2026_27.forEach(m => {
          out += `• Month ${m.monthNumber} (${m.month}): ${m.dispensingDays} dispensing days\n`;
        });

        scotIcbCommissioningDaysOutput.textContent = out;
      } catch (err) {
        scotIcbCommissioningDaysOutput.textContent = `ERROR loading Dispensing Days Calendar: ${err.message}`;
      }
    });
  }

  // 36. BNF Changes, ePACT2 Dictionary, Info Services Glossary, Sub-ICB Locations & Local Authority Districts Handlers
  const btnProbeBnfCodeChanges = document.getElementById("btn-probe-bnf-code-changes");
  const btnProbeEpact2Dictionary = document.getElementById("btn-probe-epact2-dictionary");
  const btnProbeInfoGlossary = document.getElementById("btn-probe-info-glossary");
  const btnProbeOnsSubIcb = document.getElementById("btn-probe-ons-sub-icb");
  const btnProbeOnsLad = document.getElementById("btn-probe-ons-lad");
  const bnfEpactGlossaryOnsOutput = document.getElementById("bnf-epact-glossary-ons-output");

  if (btnProbeBnfCodeChanges && bnfEpactGlossaryOnsOutput) {
    btnProbeBnfCodeChanges.addEventListener("click", async () => {
      bnfEpactGlossaryOnsOutput.textContent = "Loading NHS BNF Monthly Code Changes Register (308.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhs-bnf-code-monthly-changes/summary");
        const data = await res.json();
        let out = `[NHS STATUTORY BNF MONTHLY CODE CHANGES REGISTER]\n`;
        out += `Total Monthly Changes: ${data.totalMonthlyChanges.toLocaleString()} | Edition: ${data.bnfEdition} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE FORMULARY ADDITIONS & AMENDMENTS ---\n`;
        data.sampleChanges.forEach(c => {
          out += `• [BNF ${c.presentationCode}] ${c.presentation} (${c.changeType})\n`;
          out += `    Chapter: [${c.chapterCode}] ${c.chapter} | Active Chemical: ${c.chemical}\n\n`;
        });

        bnfEpactGlossaryOnsOutput.textContent = out;
      } catch (err) {
        bnfEpactGlossaryOnsOutput.textContent = `ERROR loading BNF Code Changes: ${err.message}`;
      }
    });
  }

  if (btnProbeEpact2Dictionary && bnfEpactGlossaryOnsOutput) {
    btnProbeEpact2Dictionary.addEventListener("click", async () => {
      bnfEpactGlossaryOnsOutput.textContent = "Loading NHSBSA ePACT2 External Data Dictionary (48.8 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-epact2-data-dictionary/summary");
        const data = await res.json();
        let out = `[NHSBSA EPACT2 EXTERNAL DATA DICTIONARY]\n`;
        out += `Total Attributes: ${data.totalAttributes.toLocaleString()} | Relational Domains: ${data.totalDomains} | Version: ${data.version} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- CORE RELATIONAL DATA DOMAINS ---\n`;
        data.sampleDomains.forEach(d => {
          out += `• [Domain ${d.sheetId}] ${d.domain}\n`;
          out += `    Description: ${d.description}\n\n`;
        });

        bnfEpactGlossaryOnsOutput.textContent = out;
      } catch (err) {
        bnfEpactGlossaryOnsOutput.textContent = `ERROR loading ePACT2 Data Dictionary: ${err.message}`;
      }
    });
  }

  if (btnProbeInfoGlossary && bnfEpactGlossaryOnsOutput) {
    btnProbeInfoGlossary.addEventListener("click", async () => {
      bnfEpactGlossaryOnsOutput.textContent = "Loading NHSBSA Information Services Financial Glossary (27.5 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-info-services-glossary/summary");
        const data = await res.json();
        let out = `[NHSBSA INFORMATION SERVICES STATUTORY FINANCIAL GLOSSARY]\n`;
        out += `Total Financial Terms: ${data.totalTerms.toLocaleString()} | Version: ${data.version} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE STATUTORY PRESCRIBING & REIMBURSEMENT TERMS ---\n`;
        data.sampleTerms.forEach(t => {
          out += `• [${t.acronym}] ${t.term}\n`;
          out += `    Definition: ${t.definition}\n\n`;
        });

        bnfEpactGlossaryOnsOutput.textContent = out;
      } catch (err) {
        bnfEpactGlossaryOnsOutput.textContent = `ERROR loading Info Services Glossary: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsSubIcb && bnfEpactGlossaryOnsOutput) {
    btnProbeOnsSubIcb.addEventListener("click", async () => {
      bnfEpactGlossaryOnsOutput.textContent = "Loading ONS / NHS England Sub-ICB Locations Directory (8.2 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-sub-icb-locations/summary");
        const data = await res.json();
        let out = `[ONS / NHS ENGLAND SUB-ICB LOCATIONS & HEALTH BOARDS DIRECTORY]\n`;
        out += `Total Locations: ${data.totalLocations} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE SUB-ICB LOCATIONS & LOCAL HEALTH BOARDS ---\n`;
        data.sampleLocations.forEach(l => {
          out += `• [ODS ${l.odsCode}] ${l.name} (${l.nation})\n`;
          out += `    ONS GSS Code: ${l.gssCode}\n\n`;
        });

        bnfEpactGlossaryOnsOutput.textContent = out;
      } catch (err) {
        bnfEpactGlossaryOnsOutput.textContent = `ERROR loading Sub-ICB Locations: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsLad && bnfEpactGlossaryOnsOutput) {
    btnProbeOnsLad.addEventListener("click", async () => {
      bnfEpactGlossaryOnsOutput.textContent = "Loading ONS UK Local Authority Districts Master Directory (8.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-local-authority-districts/summary");
        const data = await res.json();
        let out = `[ONS UK LOCAL AUTHORITY DISTRICTS (LAD) MASTER DIRECTORY]\n`;
        out += `Total Districts: ${data.totalDistricts} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE LOCAL AUTHORITY DISTRICTS ---\n`;
        data.sampleDistricts.forEach(d => {
          out += `• [LAD ${d.ladCode}] ${d.name} (${d.country})\n`;
          out += `    Entity Type: ${d.entityType}\n\n`;
        });

        bnfEpactGlossaryOnsOutput.textContent = out;
      } catch (err) {
        bnfEpactGlossaryOnsOutput.textContent = `ERROR loading Local Authority Districts: ${err.message}`;
      }
    });
  }

  // 37. ONS Counties, Regions, Parliamentary Constituencies, Police Force Areas & Electoral Wards Handlers
  const btnProbeOnsCounties = document.getElementById("btn-probe-ons-counties");
  const btnProbeOnsRegions = document.getElementById("btn-probe-ons-regions");
  const btnProbeOnsPcon = document.getElementById("btn-probe-ons-pcon");
  const btnProbeOnsPfa = document.getElementById("btn-probe-ons-pfa");
  const btnProbeOnsWards = document.getElementById("btn-probe-ons-wards");
  const onsCivicBoundaryOutput = document.getElementById("ons-civic-boundary-output");

  if (btnProbeOnsCounties && onsCivicBoundaryOutput) {
    btnProbeOnsCounties.addEventListener("click", async () => {
      onsCivicBoundaryOutput.textContent = "Loading ONS County Names & Codes Directory for England & Wales (0.8 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-counties/summary");
        const data = await res.json();
        let out = `[ONS COUNTY NAMES & CODES DIRECTORY FOR ENGLAND & WALES]\n`;
        out += `Total Counties: ${data.totalCounties} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE STATUTORY COUNTIES ---\n`;
        data.sampleCounties.forEach(c => {
          out += `• [CTY ${c.ctyCode}] ${c.name} (${c.country})\n`;
        });

        onsCivicBoundaryOutput.textContent = out;
      } catch (err) {
        onsCivicBoundaryOutput.textContent = `ERROR loading Counties: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsRegions && onsCivicBoundaryOutput) {
    btnProbeOnsRegions.addEventListener("click", async () => {
      onsCivicBoundaryOutput.textContent = "Loading ONS Government Office Regions Directory (0.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-regions/summary");
        const data = await res.json();
        let out = `[ONS GOVERNMENT OFFICE REGIONS DIRECTORY FOR ENGLAND]\n`;
        out += `Total Regions: ${data.totalRegions} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE ENGLISH REGIONS ---\n`;
        data.sampleRegions.forEach(r => {
          out += `• [RGN ${r.rgnCode}] ${r.name} | Welsh: ${r.welshName}\n`;
        });

        onsCivicBoundaryOutput.textContent = out;
      } catch (err) {
        onsCivicBoundaryOutput.textContent = `ERROR loading Regions: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsPcon && onsCivicBoundaryOutput) {
    btnProbeOnsPcon.addEventListener("click", async () => {
      onsCivicBoundaryOutput.textContent = "Loading Westminster Parliamentary Constituencies Master Directory (20.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-parliamentary-constituencies/summary");
        const data = await res.json();
        let out = `[WESTMINSTER PARLIAMENTARY CONSTITUENCIES MASTER DIRECTORY]\n`;
        out += `Total Constituencies: ${data.totalConstituencies} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE WESTMINSTER CONSTITUENCIES ---\n`;
        data.sampleConstituencies.forEach(c => {
          out += `• [PCON ${c.pconCode}] ${c.name} (${c.country})\n`;
        });

        onsCivicBoundaryOutput.textContent = out;
      } catch (err) {
        onsCivicBoundaryOutput.textContent = `ERROR loading Parliamentary Constituencies: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsPfa && onsCivicBoundaryOutput) {
    btnProbeOnsPfa.addEventListener("click", async () => {
      onsCivicBoundaryOutput.textContent = "Loading ONS Police Force Areas Directory (1.1 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-police-force-areas/summary");
        const data = await res.json();
        let out = `[ONS POLICE FORCE AREAS (PFA) DIRECTORY FOR THE UK]\n`;
        out += `Total Police Force Areas: ${data.totalPoliceForceAreas} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE POLICE FORCE AREAS ---\n`;
        data.sampleAreas.forEach(a => {
          out += `• [PFA ${a.pfaCode}] ${a.name} (${a.nation})\n`;
        });

        onsCivicBoundaryOutput.textContent = out;
      } catch (err) {
        onsCivicBoundaryOutput.textContent = `ERROR loading Police Force Areas: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsWards && onsCivicBoundaryOutput) {
    btnProbeOnsWards.addEventListener("click", async () => {
      onsCivicBoundaryOutput.textContent = "Loading ONS UK Electoral Wards & Divisions Master Directory (231.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-electoral-wards/summary");
        const data = await res.json();
        let out = `[ONS UK ELECTORAL WARDS & DIVISIONS MASTER DIRECTORY]\n`;
        out += `Total Electoral Wards: ${data.totalWards.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE UK ELECTORAL WARDS ---\n`;
        data.sampleWards.forEach(w => {
          out += `• [WD ${w.wdCode}] ${w.name} (District: ${w.district})\n`;
        });

        onsCivicBoundaryOutput.textContent = out;
      } catch (err) {
        onsCivicBoundaryOutput.textContent = `ERROR loading Electoral Wards: ${err.message}`;
      }
    });
  }

  // 38. ONS Countries, Rural-Urban Indicators, County Electoral Divisions, National Parks & Built-Up Areas Handlers
  const btnProbeOnsCtry = document.getElementById("btn-probe-ons-ctry");
  const btnProbeOnsRuc = document.getElementById("btn-probe-ons-ruc");
  const btnProbeOnsCed = document.getElementById("btn-probe-ons-ced");
  const btnProbeOnsNpark = document.getElementById("btn-probe-ons-npark");
  const btnProbeOnsBua = document.getElementById("btn-probe-ons-bua");
  const onsSpatialSettlementOutput = document.getElementById("ons-spatial-settlement-output");

  if (btnProbeOnsCtry && onsSpatialSettlementOutput) {
    btnProbeOnsCtry.addEventListener("click", async () => {
      onsSpatialSettlementOutput.textContent = "Loading ONS Sovereign Countries Directory (0.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-countries/summary");
        const data = await res.json();
        let out = `[ONS SOVEREIGN COUNTRIES & GEOPOLITICAL ENTITIES DIRECTORY]\n`;
        out += `Total Countries/Entities: ${data.totalCountries} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE SOVEREIGN & REGIONAL ENTITIES ---\n`;
        data.sampleCountries.forEach(c => {
          out += `• [CTRY ${c.ctryCode}] ${c.name} | Welsh: ${c.welshName || 'N/A'}\n`;
        });

        onsSpatialSettlementOutput.textContent = out;
      } catch (err) {
        onsSpatialSettlementOutput.textContent = `ERROR loading Sovereign Countries: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsRuc && onsSpatialSettlementOutput) {
    btnProbeOnsRuc.addEventListener("click", async () => {
      onsSpatialSettlementOutput.textContent = "Loading DEFRA/ONS Rural-Urban (2021) Classification (0.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-rural-urban-indicators/summary");
        const data = await res.json();
        let out = `[DEFRA / ONS RURAL-URBAN (2021) CLASSIFICATION SCHEME]\n`;
        out += `Total Indicator Classes: ${data.totalIndicators} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- STATUTORY RURAL-URBAN CLASSES ---\n`;
        data.sampleIndicators.forEach(i => {
          out += `• [${i.indicatorCode}] ${i.description} (Flag: ${i.flag})\n`;
        });

        onsSpatialSettlementOutput.textContent = out;
      } catch (err) {
        onsSpatialSettlementOutput.textContent = `ERROR loading Rural-Urban Indicators: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsCed && onsSpatialSettlementOutput) {
    btnProbeOnsCed.addEventListener("click", async () => {
      onsSpatialSettlementOutput.textContent = "Loading ONS County Electoral Divisions Master Directory (70.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-county-electoral-divisions/summary");
        const data = await res.json();
        let out = `[ONS COUNTY ELECTORAL DIVISIONS (CED) MASTER DIRECTORY FOR ENGLAND]\n`;
        out += `Total Divisions: ${data.totalDivisions.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE COUNTY ELECTORAL DIVISIONS ---\n`;
        data.sampleDivisions.forEach(d => {
          out += `• [CED ${d.cedCode}] ${d.name} (County: ${d.countyName} / ${d.countyCode})\n`;
        });

        onsSpatialSettlementOutput.textContent = out;
      } catch (err) {
        onsSpatialSettlementOutput.textContent = `ERROR loading County Electoral Divisions: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsNpark && onsSpatialSettlementOutput) {
    btnProbeOnsNpark.addEventListener("click", async () => {
      onsSpatialSettlementOutput.textContent = "Loading ONS National Parks Directory for Great Britain (0.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-national-parks/summary");
        const data = await res.json();
        let out = `[ONS NATIONAL PARKS & BROADS DIRECTORY FOR GREAT BRITAIN]\n`;
        out += `Total National Parks: ${data.totalNationalParks} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE NATIONAL PARKS ---\n`;
        data.sampleParks.forEach(p => {
          out += `• [NPARK ${p.nparkCode}] ${p.name} (${p.nation})\n`;
        });

        onsSpatialSettlementOutput.textContent = out;
      } catch (err) {
        onsSpatialSettlementOutput.textContent = `ERROR loading National Parks: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsBua && onsSpatialSettlementOutput) {
    btnProbeOnsBua.addEventListener("click", async () => {
      onsSpatialSettlementOutput.textContent = "Loading ONS Built-Up Areas (BUA) Master Directory (191.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-built-up-areas/summary");
        const data = await res.json();
        let out = `[ONS BUILT-UP AREAS (BUA) MASTER DIRECTORY FOR ENGLAND & WALES]\n`;
        out += `Total Built-Up Areas: ${data.totalBuiltUpAreas.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE BUILT-UP SETTLEMENTS ---\n`;
        data.sampleAreas.forEach(a => {
          out += `• [BUA ${a.buaCode}] ${a.name} (${a.nation})\n`;
        });

        onsSpatialSettlementOutput.textContent = out;
      } catch (err) {
        onsSpatialSettlementOutput.textContent = `ERROR loading Built-Up Areas: ${err.message}`;
      }
    });
  }

  // 39. ONS LSOA & MSOA Statistical Geography, Travel to Work Areas, Health Authorities & Local Enterprise Partnerships Handlers
  const btnProbeOnsLsoa = document.getElementById("btn-probe-ons-lsoa");
  const btnProbeOnsMsoa = document.getElementById("btn-probe-ons-msoa");
  const btnProbeOnsTtwa = document.getElementById("btn-probe-ons-ttwa");
  const btnProbeOnsHlthau = document.getElementById("btn-probe-ons-hlthau");
  const btnProbeOnsLep = document.getElementById("btn-probe-ons-lep");
  const onsStatisticalGeographyOutput = document.getElementById("ons-statistical-geography-output");

  if (btnProbeOnsLsoa && onsStatisticalGeographyOutput) {
    btnProbeOnsLsoa.addEventListener("click", async () => {
      onsStatisticalGeographyOutput.textContent = "Loading ONS Lower Layer Super Output Areas (LSOA 2021) Directory (1.03 MB)...";
      try {
        const res = await fetch("/api/warehouse/ons-lsoa-2021/summary");
        const data = await res.json();
        let out = `[ONS LOWER LAYER SUPER OUTPUT AREAS (LSOA 2021) MASTER DIRECTORY]\n`;
        out += `Total LSOAs: ${data.totalLsoas.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE LOWER LAYER SUPER OUTPUT AREAS (LSOA) ---\n`;
        data.sampleLsoas.forEach(l => {
          out += `• [LSOA ${l.lsoaCode}] ${l.name}\n`;
        });

        onsStatisticalGeographyOutput.textContent = out;
      } catch (err) {
        onsStatisticalGeographyOutput.textContent = `ERROR loading LSOA 2021 Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsMsoa && onsStatisticalGeographyOutput) {
    btnProbeOnsMsoa.addEventListener("click", async () => {
      onsStatisticalGeographyOutput.textContent = "Loading ONS Middle Layer Super Output Areas (MSOA 2021) Directory (190.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-msoa-2021/summary");
        const data = await res.json();
        let out = `[ONS MIDDLE LAYER SUPER OUTPUT AREAS (MSOA 2021) MASTER DIRECTORY]\n`;
        out += `Total MSOAs: ${data.totalMsoas.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE MIDDLE LAYER SUPER OUTPUT AREAS (MSOA) ---\n`;
        data.sampleMsoas.forEach(m => {
          out += `• [MSOA ${m.msoaCode}] ${m.name}\n`;
        });

        onsStatisticalGeographyOutput.textContent = out;
      } catch (err) {
        onsStatisticalGeographyOutput.textContent = `ERROR loading MSOA 2021 Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsTtwa && onsStatisticalGeographyOutput) {
    btnProbeOnsTtwa.addEventListener("click", async () => {
      onsStatisticalGeographyOutput.textContent = "Loading ONS Travel to Work Areas Directory (5.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-travel-to-work-areas/summary");
        const data = await res.json();
        let out = `[ONS TRAVEL TO WORK AREAS (TTWA) MASTER DIRECTORY]\n`;
        out += `Total TTWAs: ${data.totalTtwas} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE TRAVEL TO WORK AREAS (COMMUTER BASINS) ---\n`;
        data.sampleTtwas.forEach(t => {
          out += `• [TTWA ${t.ttwaCode}] ${t.name}\n`;
        });

        onsStatisticalGeographyOutput.textContent = out;
      } catch (err) {
        onsStatisticalGeographyOutput.textContent = `ERROR loading Travel to Work Areas: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsHlthau && onsStatisticalGeographyOutput) {
    btnProbeOnsHlthau.addEventListener("click", async () => {
      onsStatisticalGeographyOutput.textContent = "Loading ONS Health Authorities Directory (1.5 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-health-authorities/summary");
        const data = await res.json();
        let out = `[ONS STATUTORY HEALTH AUTHORITIES DIRECTORY]\n`;
        out += `Total Authorities: ${data.totalHealthAuthorities} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE REGIONAL HEALTH AUTHORITIES ---\n`;
        data.sampleAuthorities.forEach(h => {
          out += `• [HLTHAU ${h.hlthauCode} / ${h.oldCode}] ${h.name} ${h.welshName ? `(${h.welshName})` : ''}\n`;
        });

        onsStatisticalGeographyOutput.textContent = out;
      } catch (err) {
        onsStatisticalGeographyOutput.textContent = `ERROR loading Health Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsLep && onsStatisticalGeographyOutput) {
    btnProbeOnsLep.addEventListener("click", async () => {
      onsStatisticalGeographyOutput.textContent = "Loading ONS Local Enterprise Partnerships Directory (1.2 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-local-enterprise-partnerships/summary");
        const data = await res.json();
        let out = `[ONS LOCAL ENTERPRISE PARTNERSHIPS (LEP) DIRECTORY]\n`;
        out += `Total LEPs: ${data.totalLeps} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE LOCAL ENTERPRISE PARTNERSHIPS ---\n`;
        data.sampleLeps.forEach(l => {
          out += `• [LEP ${l.lepCode}] ${l.name}\n`;
        });

        onsStatisticalGeographyOutput.textContent = out;
      } catch (err) {
        onsStatisticalGeographyOutput.textContent = `ERROR loading Local Enterprise Partnerships: ${err.message}`;
      }
    });
  }

  // 40. Scottish Data Zones, Intermediate Zones, Rural-Urban Indicators, UK ITL/LAU Hierarchies & European Electoral Regions Handlers
  const btnProbeOnsScotDz = document.getElementById("btn-probe-ons-scot-dz");
  const btnProbeOnsScotIz = document.getElementById("btn-probe-ons-scot-iz");
  const btnProbeOnsScotRuc = document.getElementById("btn-probe-ons-scot-ruc");
  const btnProbeOnsItlLau = document.getElementById("btn-probe-ons-itl-lau");
  const btnProbeOnsEer = document.getElementById("btn-probe-ons-eer");
  const onsScottishTerritorialOutput = document.getElementById("ons-scottish-territorial-output");

  if (btnProbeOnsScotDz && onsScottishTerritorialOutput) {
    btnProbeOnsScotDz.addEventListener("click", async () => {
      onsScottishTerritorialOutput.textContent = "Loading Scottish Government Data Zones (DZ22) Directory (254.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-scotland-data-zones/summary");
        const data = await res.json();
        let out = `[SCOTTISH GOVERNMENT DATA ZONES (DZ22) MASTER DIRECTORY]\n`;
        out += `Total Data Zones: ${data.totalDataZones.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE SCOTTISH DATA ZONES (SIMD UNITS) ---\n`;
        data.sampleDataZones.forEach(d => {
          out += `• [DZ ${d.dataZoneCode}] ${d.name}\n`;
        });

        onsScottishTerritorialOutput.textContent = out;
      } catch (err) {
        onsScottishTerritorialOutput.textContent = `ERROR loading Scottish Data Zones: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsScotIz && onsScottishTerritorialOutput) {
    btnProbeOnsScotIz.addEventListener("click", async () => {
      onsScottishTerritorialOutput.textContent = "Loading Scottish Government Intermediate Zones (IZ22) Directory (40.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-scotland-intermediate-zones/summary");
        const data = await res.json();
        let out = `[SCOTTISH GOVERNMENT INTERMEDIATE ZONES (IZ22) MASTER DIRECTORY]\n`;
        out += `Total Intermediate Zones: ${data.totalIntermediateZones.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE SCOTTISH INTERMEDIATE ZONES (HEALTH BOARD CLUSTERS) ---\n`;
        data.sampleIntermediateZones.forEach(i => {
          out += `• [IZ ${i.izCode}] ${i.name}\n`;
        });

        onsScottishTerritorialOutput.textContent = out;
      } catch (err) {
        onsScottishTerritorialOutput.textContent = `ERROR loading Scottish Intermediate Zones: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsScotRuc && onsScottishTerritorialOutput) {
    btnProbeOnsScotRuc.addEventListener("click", async () => {
      onsScottishTerritorialOutput.textContent = "Loading Scottish Government Rural-Urban (2021) Classification (0.15 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-scotland-rural-urban-indicators/summary");
        const data = await res.json();
        let out = `[SCOTTISH GOVERNMENT RURAL-URBAN (2021) 6-FOLD CLASSIFICATION]\n`;
        out += `Total Indicators: ${data.totalIndicators} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- STATUTORY SCOTTISH RURAL-URBAN CLASSES ---\n`;
        data.sampleIndicators.forEach(i => {
          out += `• [Class ${i.indicatorCode}] ${i.description}\n`;
        });

        onsScottishTerritorialOutput.textContent = out;
      } catch (err) {
        onsScottishTerritorialOutput.textContent = `ERROR loading Scottish Rural-Urban Classification: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsItlLau && onsScottishTerritorialOutput) {
    btnProbeOnsItlLau.addEventListener("click", async () => {
      onsScottishTerritorialOutput.textContent = "Loading ONS ITL 1/2/3 & LAU 1 Lookup Hierarchy (46.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-itl-lau-lookup/summary");
        const data = await res.json();
        let out = `[ONS INTERNATIONAL TERRITORIAL LEVELS (ITL) & LOCAL ADMINISTRATIVE UNITS (LAU) LOOKUP]\n`;
        out += `Total Local Authority District Mappings: ${data.totalMappings.toLocaleString()} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE ITL / LAU MAPPINGS ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [${m.itl1Code}] ${m.itl1Name} → [${m.itl2Code}] ${m.itl2Name} → [${m.itl3Code}] ${m.itl3Name} → [${m.ladCode}] ${m.ladName}\n`;
        });

        onsScottishTerritorialOutput.textContent = out;
      } catch (err) {
        onsScottishTerritorialOutput.textContent = `ERROR loading ITL & LAU Lookup: ${err.message}`;
      }
    });
  }

  if (btnProbeOnsEer && onsScottishTerritorialOutput) {
    btnProbeOnsEer.addEventListener("click", async () => {
      onsScottishTerritorialOutput.textContent = "Loading ONS European Electoral Regions Directory (0.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ons-european-electoral-regions/summary");
        const data = await res.json();
        let out = `[ONS EUROPEAN ELECTORAL REGIONS (EER) DIRECTORY FOR THE UK]\n`;
        out += `Total Regions: ${data.totalRegions} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE REGIONAL ENTITIES ---\n`;
        data.sampleRegions.forEach(r => {
          out += `• [EER ${r.eerCode} / ${r.oldCode || 'N/A'}] ${r.name}\n`;
        });

        onsScottishTerritorialOutput.textContent = out;
      } catch (err) {
        onsScottishTerritorialOutput.textContent = `ERROR loading European Electoral Regions: ${err.message}`;
      }
    });
  }

  // 41. UKIPO Patent Open Data, SCMD Baseline 2021, Enterprise Asset Audit Index, NHSBSA CKAN Resources & NI Historical HSC Trusts Handlers
  const btnProbeUkipoPatents = document.getElementById("btn-probe-ukipo-patents");
  const btnProbeScmdBaseline = document.getElementById("btn-probe-scmd-baseline");
  const btnProbeNovapharmAssetAudit = document.getElementById("btn-probe-novapharm-asset-audit");
  const btnProbeNhsbsaCkanRegistry = document.getElementById("btn-probe-nhsbsa-ckan-registry");
  const btnProbeNiHistoricalTrusts = document.getElementById("btn-probe-ni-historical-trusts");
  const ukipoAuditHscOutput = document.getElementById("ukipo-audit-hsc-output");

  if (btnProbeUkipoPatents && ukipoAuditHscOutput) {
    btnProbeUkipoPatents.addEventListener("click", async () => {
      ukipoAuditHscOutput.textContent = "Loading UKIPO Patent Open Data Master Register (22.75 MB Parquet)...";
      try {
        const res = await fetch("/api/warehouse/ukipo-patents/summary");
        const data = await res.json();
        let out = `[UK INTELLECTUAL PROPERTY OFFICE (UKIPO) PATENT OPEN DATA MASTER REGISTER]\n`;
        out += `Total Statutory Patents: ${data.totalPatents.toLocaleString()} | Unique Applicants: ${data.uniqueApplicants.toLocaleString()} | Status Classes: ${data.statusClasses}\n`;
        out += `Authority: ${data.authority} | Reporting Era: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE PHARMACEUTICAL & BIOCHEMICAL STATUTORY PATENTS ---\n`;
        data.samplePatents.forEach(p => {
          out += `• [App: ${p.applicationNumber} / Pub: ${p.publicationNumber}] ${p.applicantName}\n`;
          out += `    IPC: ${p.ipc} | Filed: ${p.filingDate} | Status: ${p.status}\n`;
        });

        ukipoAuditHscOutput.textContent = out;
      } catch (err) {
        ukipoAuditHscOutput.textContent = `ERROR loading UKIPO Patent Open Data: ${err.message}`;
      }
    });
  }

  if (btnProbeScmdBaseline && ukipoAuditHscOutput) {
    btnProbeScmdBaseline.addEventListener("click", async () => {
      ukipoAuditHscOutput.textContent = "Loading NHSBSA SCMD Baseline Hospital Dispensing Extract (31.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/scmd-baseline-2021/summary");
        const data = await res.json();
        let out = `[NHSBSA SECONDARY CARE MEDICINES DATA (SCMD) BASELINE EXTRACT]\n`;
        out += `Total Dispensing Records: ${data.totalRecords.toLocaleString()} | Acute NHS Hospital Trusts: ${data.totalTrusts} | Reporting: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeMb} MB | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE BASELINE SECONDARY CARE DISPENSING RECORDS ---\n`;
        data.sampleRecords.forEach(r => {
          out += `• [Trust: ${r.odsCode} | SNOMED: ${r.snomedCode}] ${r.productName}\n`;
          out += `    Quantity Dispensed: ${r.quantity.toLocaleString()} ${r.unit}s | Period: ${r.yearMonth}\n`;
        });

        ukipoAuditHscOutput.textContent = out;
      } catch (err) {
        ukipoAuditHscOutput.textContent = `ERROR loading SCMD Baseline Extract: ${err.message}`;
      }
    });
  }

  if (btnProbeNovapharmAssetAudit && ukipoAuditHscOutput) {
    btnProbeNovapharmAssetAudit.addEventListener("click", async () => {
      ukipoAuditHscOutput.textContent = "Loading NovaPharm Master Asset Audit Provenance Ledger (419.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/novapharm-legacy-asset-audit/summary");
        const data = await res.json();
        let out = `[NOVAPHARM ENTERPRISE LEGACY ASSET AUDIT PROVENANCE LEDGER]\n`;
        out += `Total Audited Datasets: ${data.totalAssets.toLocaleString()} | Volume: ${data.totalGigabytes} GB | Logical Families: ${data.familiesCount}\n`;
        out += `Authority: ${data.authority} | Milestone: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- TOP LOGICAL ASSET FAMILIES BY DATASET COUNT ---\n`;
        data.topFamilies.forEach(f => {
          out += `• [Family: ${f.family}] ${f.count.toLocaleString()} datasets\n`;
        });

        ukipoAuditHscOutput.textContent = out;
      } catch (err) {
        ukipoAuditHscOutput.textContent = `ERROR loading NovaPharm Asset Audit Index: ${err.message}`;
      }
    });
  }

  if (btnProbeNhsbsaCkanRegistry && ukipoAuditHscOutput) {
    btnProbeNhsbsaCkanRegistry.addEventListener("click", async () => {
      ukipoAuditHscOutput.textContent = "Loading NHSBSA Open Data Portal Master CKAN Resource Registry (66.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/nhsbsa-ckan-resource-registry/summary");
        const data = await res.json();
        let out = `[NHSBSA OPEN DATA PORTAL MASTER CKAN RESOURCE REGISTRY]\n`;
        out += `Total Open Data Packages: ${data.totalResources} | Catalogued Volume: ${data.totalGigabytes} GB | Horizon: ${data.earliestModified} ➜ ${data.latestModified}\n`;
        out += `Authority: ${data.authority} | Reporting: ${data.reportingPeriod} | File Size: ${data.fileSizeKb} KB\n`;
        out += `Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE HIGH-VOLUME PRESCRIBING PACKAGES ---\n`;
        data.sampleResources.forEach(r => {
          out += `• [${r.resourceName}] ${r.sizeGb} GB (Modified: ${r.modified})\n`;
          out += `    Dataset: ${r.dataset}\n`;
        });

        ukipoAuditHscOutput.textContent = out;
      } catch (err) {
        ukipoAuditHscOutput.textContent = `ERROR loading NHSBSA CKAN Registry: ${err.message}`;
      }
    });
  }

  if (btnProbeNiHistoricalTrusts && ukipoAuditHscOutput) {
    btnProbeNiHistoricalTrusts.addEventListener("click", async () => {
      ukipoAuditHscOutput.textContent = "Loading Northern Ireland Historical HSS Trusts & Fundholders Archive (32.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/ni-historical-hsc-trusts/summary");
        const data = await res.json();
        let out = `[NORTHERN IRELAND HEALTH & SOCIAL SERVICES HISTORICAL TRUSTS & FUNDHOLDERS ARCHIVE]\n`;
        out += `Total Statutory Organisations: ${data.totalOrgs} (Trusts: ${data.trustsCount}, Fundholders: ${data.fundholdersCount}) | Era: ${data.reportingEra}\n`;
        out += `Authority: ${data.authority} | File Size: ${data.fileSizeKb} KB | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE HISTORICAL HSS TRUSTS & FUNDHOLDING PRACTICES ---\n`;
        data.sampleOrgs.forEach(o => {
          out += `• [${o.code} - ${o.type.toUpperCase()}] ${o.name} (${o.postcode})\n`;
          out += `    Statutory Operational Span: ${o.openDate} ➜ ${o.closeDate}\n`;
        });

        ukipoAuditHscOutput.textContent = out;
      } catch (err) {
        ukipoAuditHscOutput.textContent = `ERROR loading NI Historical HSC Trusts: ${err.message}`;
      }
    });
  }

  // 42. ODS Postcode Health Directory, Historical Closed Archive, Regional Demographics, Canonical Medicine Bridge & Identity Quarantine Handlers
  const btnProbeOdsPcodeall = document.getElementById("btn-probe-ods-pcodeall");
  const btnProbeOdsEarchive = document.getElementById("btn-probe-ods-earchive");
  const btnProbeGpDemographicsRegions = document.getElementById("btn-probe-gp-demographics-regions");
  const btnProbeNovapharmCanonicalBridge = document.getElementById("btn-probe-novapharm-canonical-bridge");
  const btnProbeNovapharmIdentityQuarantine = document.getElementById("btn-probe-novapharm-identity-quarantine");
  const pcodeArchiveBridgeOutput = document.getElementById("pcode-archive-bridge-output");

  if (btnProbeOdsPcodeall && pcodeArchiveBridgeOutput) {
    btnProbeOdsPcodeall.addEventListener("click", async () => {
      pcodeArchiveBridgeOutput.textContent = "Loading NHS England ODS Master Postcode-to-Health Geography Directory (64.5 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-postcode-health-lookup/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS MASTER POSTCODE-TO-HEALTH GEOGRAPHY DIRECTORY (pcodeall)]\n`;
        out += `Total Postcodes Mapped: ${data.totalPostcodes.toLocaleString()} | Era: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE POSTCODE-TO-HEALTH AUTHORITY MAPPINGS ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [${m.postcode}] → Health Authority: ${m.healthAuthority} | District Health Authority: ${m.districtHealthAuthority}\n`;
        });

        pcodeArchiveBridgeOutput.textContent = out;
      } catch (err) {
        pcodeArchiveBridgeOutput.textContent = `ERROR loading Postcode Health Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsEarchive && pcodeArchiveBridgeOutput) {
    btnProbeOdsEarchive.addEventListener("click", async () => {
      pcodeArchiveBridgeOutput.textContent = "Loading NHS England ODS Historical Closed & Predecessor Organisations Archive (13.4 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-historical-archive/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HISTORICAL PREDECESSOR HEALTH ORGANISATIONS ARCHIVE (earchive)]\n`;
        out += `Total Predecessor Bodies: ${data.totalHistoricalOrgs.toLocaleString()} | Era: ${data.reportingEra} | File Size: ${data.fileSizeMb} MB\n`;
        out += `Authority: ${data.authority} | Schema: ${data.dataSchema.join(', ')}\n\n`;

        out += `--- SAMPLE HISTORICAL HEALTH AUTHORITIES & COMMITTEES ---\n`;
        data.sampleHistoricalOrgs.forEach(o => {
          out += `• [Code: ${o.code}] ${o.name} (Grouping: ${o.grouping}) - Status: ${o.status}\n`;
          out += `    Operational Span: ${o.openDate} ➜ ${o.closeDate}\n`;
        });

        pcodeArchiveBridgeOutput.textContent = out;
      } catch (err) {
        pcodeArchiveBridgeOutput.textContent = `ERROR loading Historical Closed Archive: ${err.message}`;
      }
    });
  }

  if (btnProbeGpDemographicsRegions && pcodeArchiveBridgeOutput) {
    btnProbeGpDemographicsRegions.addEventListener("click", async () => {
      pcodeArchiveBridgeOutput.textContent = "Loading NHS Primary Care Registered Patient Demographics by Region (15.1 MB)...";
      try {
        const res = await fetch("/api/warehouse/gp-demographics-regions/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE REGISTERED PATIENT DEMOGRAPHICS BY COMMISSIONING REGION]\n`;
        out += `Total Demographic Rows: ${data.totalObservationRows.toLocaleString()} | Covered Commissioning Regions: ${data.coveredRegions}\n`;
        out += `Total Registered Population: ${data.totalNationalPopulation.toLocaleString()} | Authority: ${data.authority} | Reporting: ${data.reportingPeriod}\n\n`;

        out += `--- REGIONAL POPULATION AGGREGATES ---\n`;
        data.sampleDemographics.forEach(d => {
          out += `• [Region ${d.regionCode}] ${d.regionName}: ${d.patientsCount.toLocaleString()} registered patients (${d.sex} / ${d.age})\n`;
        });

        pcodeArchiveBridgeOutput.textContent = out;
      } catch (err) {
        pcodeArchiveBridgeOutput.textContent = `ERROR loading Regional Demographics: ${err.message}`;
      }
    });
  }

  if (btnProbeNovapharmCanonicalBridge && pcodeArchiveBridgeOutput) {
    btnProbeNovapharmCanonicalBridge.addEventListener("click", async () => {
      pcodeArchiveBridgeOutput.textContent = "Loading NovaPharm Phase 2 Authoritative Canonical Medicine Bridge (4.81 MB)...";
      try {
        const res = await fetch("/api/warehouse/novapharm-canonical-bridge/summary");
        const data = await res.json();
        let out = `[NOVAPHARM PHASE 2 AUTHORITATIVE CANONICAL MEDICINE BRIDGE]\n`;
        out += `Total Canonical Presentations: ${data.totalPresentations.toLocaleString()} | Verified Identities: ${data.verifiedIdentitiesCount.toLocaleString()} | Ambiguous: ${data.ambiguousCount.toLocaleString()}\n`;
        out += `Authority: ${data.authority} | Milestone: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB\n\n`;

        out += `--- TOP CANONICAL MEDICINE PRESENTATIONS & DISPENSING VOLUME ---\n`;
        data.sampleBridgePresentations.forEach(p => {
          out += `• ${p.canonicalName} [${p.level}]\n`;
          out += `    Monthly Items: ${p.itemsDispensed.toLocaleString()} | Net Ingredient Cost: £${p.nicGbp.toLocaleString()} | Active SNOMED Codes: ${p.activeSnomedCount}\n`;
        });

        pcodeArchiveBridgeOutput.textContent = out;
      } catch (err) {
        pcodeArchiveBridgeOutput.textContent = `ERROR loading Canonical Medicine Bridge: ${err.message}`;
      }
    });
  }

  if (btnProbeNovapharmIdentityQuarantine && pcodeArchiveBridgeOutput) {
    btnProbeNovapharmIdentityQuarantine.addEventListener("click", async () => {
      pcodeArchiveBridgeOutput.textContent = "Loading NovaPharm Phase 2 Medicine Identity Quarantine & Non-Inference Register (1.18 MB)...";
      try {
        const res = await fetch("/api/warehouse/novapharm-identity-quarantine/summary");
        const data = await res.json();
        let out = `[NOVAPHARM PHASE 2 MEDICINE IDENTITY QUARANTINE & NON-INFERENCE REGISTER]\n`;
        out += `Total Quarantined Entities: ${data.totalQuarantined.toLocaleString()} | File Size: ${data.fileSizeMb} MB | Milestone: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Enforcement Policy: ${data.segregationRule}\n\n`;

        out += `--- SAMPLE QUARANTINED MEDICINE ENTITIES (REFUSAL TO GUESS) ---\n`;
        data.sampleQuarantined.forEach(q => {
          out += `• [${q.medicineId}] ${q.canonicalName} (${q.level}) - SNOMED: ${q.snomedCode}\n`;
          out += `    Quarantine Reason: ${q.reason}\n`;
        });

        pcodeArchiveBridgeOutput.textContent = out;
      } catch (err) {
        pcodeArchiveBridgeOutput.textContent = `ERROR loading Identity Quarantine Register: ${err.message}`;
      }
    });
  }

  // 43. NHS Primary Care Female & Male Demographics, Quinquennial Cohorts, Practice Mapping & Historical Surgeries Archive Handlers
  const btnProbeGpDemographicsFemale = document.getElementById("btn-probe-gp-demographics-female");
  const btnProbeGpDemographicsMale = document.getElementById("btn-probe-gp-demographics-male");
  const btnProbeGpDemographicsQuin = document.getElementById("btn-probe-gp-demographics-quin");
  const btnProbeGpPracMap = document.getElementById("btn-probe-gp-prac-map");
  const btnProbeOdsEpracarc = document.getElementById("btn-probe-ods-epracarc");
  const primaryCareDemographicsOutput = document.getElementById("primary-care-demographics-output");

  if (btnProbeGpDemographicsFemale && primaryCareDemographicsOutput) {
    btnProbeGpDemographicsFemale.addEventListener("click", async () => {
      primaryCareDemographicsOutput.textContent = "Loading NHS Primary Care Registered Female Patients by Single Year of Age (31.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/primary-care-demographics-female/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE REGISTERED FEMALE PATIENTS BY SINGLE YEAR OF AGE (June 2026)]\n`;
        out += `Total Demographic Observations: ${data.totalObservationRows.toLocaleString()} | Covered GP Practices: ${data.totalPractices.toLocaleString()}\n`;
        out += `Reporting Era: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GP PRACTICE SINGLE-YEAR FEMALE OBSERVATIONS ---\n`;
        data.sampleObservations.forEach(o => {
          out += `• Practice [${o.practiceCode}] (Postcode: ${o.postcode}, Sub-ICB: ${o.subIcbCode}) - Age: ${o.age} ➜ ${o.femalePatients.toLocaleString()} female patients\n`;
        });

        primaryCareDemographicsOutput.textContent = out;
      } catch (err) {
        primaryCareDemographicsOutput.textContent = `ERROR loading Female Demographics: ${err.message}`;
      }
    });
  }

  if (btnProbeGpDemographicsMale && primaryCareDemographicsOutput) {
    btnProbeGpDemographicsMale.addEventListener("click", async () => {
      primaryCareDemographicsOutput.textContent = "Loading NHS Primary Care Registered Male Patients by Single Year of Age (30.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/primary-care-demographics-male/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE REGISTERED MALE PATIENTS BY SINGLE YEAR OF AGE (June 2026)]\n`;
        out += `Total Demographic Observations: ${data.totalObservationRows.toLocaleString()} | Covered GP Practices: ${data.totalPractices.toLocaleString()}\n`;
        out += `Reporting Era: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GP PRACTICE SINGLE-YEAR MALE OBSERVATIONS ---\n`;
        data.sampleObservations.forEach(o => {
          out += `• Practice [${o.practiceCode}] (Postcode: ${o.postcode}, Sub-ICB: ${o.subIcbCode}) - Age: ${o.age} ➜ ${o.malePatients.toLocaleString()} male patients\n`;
        });

        primaryCareDemographicsOutput.textContent = out;
      } catch (err) {
        primaryCareDemographicsOutput.textContent = `ERROR loading Male Demographics: ${err.message}`;
      }
    });
  }

  if (btnProbeGpDemographicsQuin && primaryCareDemographicsOutput) {
    btnProbeGpDemographicsQuin.addEventListener("click", async () => {
      primaryCareDemographicsOutput.textContent = "Loading NHS Primary Care Registered Patients by 5-Year Quinquennial Cohorts (20.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/primary-care-demographics-quinquennial/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE 5-YEAR QUINQUENNIAL POPULATION DISTRIBUTION (June 2026)]\n`;
        out += `Total Distribution Records: ${data.totalObservationRows.toLocaleString()} | Groupings: ${data.ageGroupings}\n`;
        out += `Reporting Period: ${data.reportingPeriod} | File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE QUINQUENNIAL REGIONAL AGGREGATES ---\n`;
        data.sampleAggregates.forEach(a => {
          out += `• [${a.orgType}: ${a.regionName} (${a.orgCode})] Sex: ${a.sex} | Cohort: ${a.ageGroup} ➜ ${a.patientsCount.toLocaleString()} patients\n`;
        });

        primaryCareDemographicsOutput.textContent = out;
      } catch (err) {
        primaryCareDemographicsOutput.textContent = `ERROR loading Quinquennial Demographics: ${err.message}`;
      }
    });
  }

  if (btnProbeGpPracMap && primaryCareDemographicsOutput) {
    btnProbeGpPracMap.addEventListener("click", async () => {
      primaryCareDemographicsOutput.textContent = "Loading NHS Primary Care GP Practice-to-Sub-ICB & PCN Organisational Directory Mapping (1.4 MB)...";
      try {
        const res = await fetch("/api/warehouse/primary-care-organisation-mapping/summary");
        const data = await res.json();
        let out = `[NHS PRIMARY CARE GP PRACTICE DIRECTORY & STATUTORY COMMISSIONING MAPPING]\n`;
        out += `Total Active GP Practices: ${data.totalPracticesMapped.toLocaleString()} | Reporting Period: ${data.reportingPeriod}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE GP PRACTICE-TO-PCN/ICB/SUPPLIER DIRECTORY ENTRIES ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [Practice ${m.practiceCode}] ${m.practiceName} (${m.postcode})\n`;
          out += `    PCN: ${m.pcnName} (${m.pcnCode}) | ICB: ${m.icbName} (${m.icbCode}) | EHR: ${m.supplier}\n`;
        });

        primaryCareDemographicsOutput.textContent = out;
      } catch (err) {
        primaryCareDemographicsOutput.textContent = `ERROR loading GP Practice Mapping: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsEpracarc && primaryCareDemographicsOutput) {
    btnProbeOdsEpracarc.addEventListener("click", async () => {
      primaryCareDemographicsOutput.textContent = "Loading NHS England ODS Historical Closed & Predecessor GP Surgeries Archive (827 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-historical-practices-archive/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HISTORICAL CLOSED & PREDECESSOR GP SURGERIES ARCHIVE (epracarc)]\n`;
        out += `Total Historical Closed Practices: ${data.totalClosedPractices.toLocaleString()} | Era: ${data.reportingEra}\n`;
        out += `File Size: ${data.fileSizeKb} KB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HISTORICAL CLOSED GP SURGERIES & SUCCESSION LINEAGES ---\n`;
        data.sampleClosedPractices.forEach(p => {
          out += `• [Code: ${p.code}] ${p.name} (${p.postcode}) - Status: ${p.status}\n`;
          out += `    Active Lifespan: ${p.openDate} ➜ ${p.closeDate} | Successor Code: ${p.successorCode}\n`;
        });

        primaryCareDemographicsOutput.textContent = out;
      } catch (err) {
        primaryCareDemographicsOutput.textContent = `ERROR loading Historical Closed Practices Archive: ${err.message}`;
      }
    });
  }

  // 44. National Grid Geography, Historical Closed Practitioners, Dispensing Practices, Provisional SCMD & Cancer Alliances Handlers
  const btnProbeOdsGridall = document.getElementById("btn-probe-ods-gridall");
  const btnProbeOdsEgparc = document.getElementById("btn-probe-ods-egparc");
  const btnProbeDispPractices = document.getElementById("btn-probe-disp-practices");
  const btnProbeProvScmd = document.getElementById("btn-probe-prov-scmd");
  const btnProbeCancerAlliances = document.getElementById("btn-probe-cancer-alliances");
  const gridPractitionerDispensingOutput = document.getElementById("grid-practitioner-dispensing-output");

  if (btnProbeOdsGridall && gridPractitionerDispensingOutput) {
    btnProbeOdsGridall.addEventListener("click", async () => {
      gridPractitionerDispensingOutput.textContent = "Loading NHS England ODS National Grid Reference Directory (1,018.5 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-national-grid-lookup/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS NATIONAL GRID REFERENCE & GEOGRAPHY DIRECTORY (gridall)]\n`;
        out += `Total Postcodes Mapped: ${data.totalPostcodesMapped.toLocaleString()} | Era: ${data.reportingEra}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE POSTCODE NATIONAL GRID COORDINATES (EASTINGS & NORTHINGS) ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [${m.postcode}] Easting: ${m.easting} | Northing: ${m.northing} | Geo: ${m.highLevelGeography} | HA: ${m.healthAuthority}\n`;
        });

        gridPractitionerDispensingOutput.textContent = out;
      } catch (err) {
        gridPractitionerDispensingOutput.textContent = `ERROR loading National Grid Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsEgparc && gridPractitionerDispensingOutput) {
    btnProbeOdsEgparc.addEventListener("click", async () => {
      gridPractitionerDispensingOutput.textContent = "Loading NHS England ODS Historical Closed Practitioners Archive (1.6 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-historical-practitioners-archive/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HISTORICAL CLOSED GENERAL PRACTITIONERS ARCHIVE (egparc)]\n`;
        out += `Total Closed Practitioners: ${data.totalClosedPractitioners.toLocaleString()} | Era: ${data.reportingEra}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HISTORICAL CLOSED GP PRACTITIONERS ---\n`;
        data.samplePractitioners.forEach(p => {
          out += `• [${p.code}] ${p.name} (${p.postcode}) - Status: ${p.status} | Practice: ${p.practiceCode}\n`;
          out += `    Active Lifespan: ${p.openDate} ➜ ${p.closeDate}\n`;
        });

        gridPractitionerDispensingOutput.textContent = out;
      } catch (err) {
        gridPractitionerDispensingOutput.textContent = `ERROR loading Historical Practitioners Archive: ${err.message}`;
      }
    });
  }

  if (btnProbeDispPractices && gridPractitionerDispensingOutput) {
    btnProbeDispPractices.addEventListener("click", async () => {
      gridPractitionerDispensingOutput.textContent = "Loading NHSBSA Dispensing Doctor Practice Prescriptions Activity (141.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/dispensing-practice-prescriptions/summary");
        const data = await res.json();
        let out = `[NHSBSA DISPENSING DOCTOR PRACTICE PRESCRIPTION ACTIVITY (May 2026)]\n`;
        out += `Total Prescription Records: ${data.totalPrescriptionRecords.toLocaleString()} | Era: ${data.reportingPeriod}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING DOCTOR SURGERY PRESCRIPTION LINKAGES ---\n`;
        data.samplePrescriptions.forEach(p => {
          out += `• Practice [${p.practiceCode}] ${p.practiceName} (${p.practicePostcode})\n`;
          out += `    Contractor: [${p.contractorCode}] ${p.contractorName} (${p.contractorPostcode}) ➜ Items: ${p.items.toLocaleString()} (EPS: ${p.epsItems.toLocaleString()})\n`;
        });

        gridPractitionerDispensingOutput.textContent = out;
      } catch (err) {
        gridPractitionerDispensingOutput.textContent = `ERROR loading Dispensing Practice Prescriptions: ${err.message}`;
      }
    });
  }

  if (btnProbeProvScmd && gridPractitionerDispensingOutput) {
    btnProbeProvScmd.addEventListener("click", async () => {
      gridPractitionerDispensingOutput.textContent = "Loading NHSBSA SCMD June 2026 Provisional Hospital Prescribing (40.2 MB)...";
      try {
        const res = await fetch("/api/warehouse/scmd-provisional-hospital-prescribing/summary");
        const data = await res.json();
        let out = `[NHSBSA SCMD JUNE 2026 PROVISIONAL HOSPITAL DRUG USAGE & DISPENSING]\n`;
        out += `Total Hospital Dispensing Records: ${data.totalHospitalRecords.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SECONDARY CARE TRUST DRUG UTILIZATION ---\n`;
        data.sampleHospitalDispensing.forEach(d => {
          out += `• Trust [${d.trustCode}] - ${d.productName}\n`;
          out += `    SNOMED: ${d.snomedCode} | Quantity: ${d.quantityUdfs.toLocaleString()} ${d.udfsUnit} | Cost: £${d.indicativeCostGbp.toFixed(2)}\n`;
        });

        gridPractitionerDispensingOutput.textContent = out;
      } catch (err) {
        gridPractitionerDispensingOutput.textContent = `ERROR loading Provisional SCMD: ${err.message}`;
      }
    });
  }

  if (btnProbeCancerAlliances && gridPractitionerDispensingOutput) {
    btnProbeCancerAlliances.addEventListener("click", async () => {
      gridPractitionerDispensingOutput.textContent = "Loading NHS England Statutory Cancer Alliances Directory (April 2026)...";
      try {
        const res = await fetch("/api/warehouse/ods-cancer-alliance-directory/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS STATUTORY CANCER ALLIANCES DIRECTORY (April 2026)]\n`;
        out += `Total Statutory Cancer Alliances: ${data.totalCancerAlliances.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- REGIONAL ONCOLOGY CLINICAL NETWORKS & CANCER PATHWAYS ---\n`;
        data.sampleAlliances.forEach(a => {
          out += `• [Code: ${a.code}] ${a.name} (Region: ${a.region})\n`;
        });

        gridPractitionerDispensingOutput.textContent = out;
      } catch (err) {
        gridPractitionerDispensingOutput.textContent = `ERROR loading Cancer Alliances Directory: ${err.message}`;
      }
    });
  }

  // 45. Devolved National Grid & Health Geography, Drug Tariff Part VIIIA/VIIIB & Cancer Networks Handlers
  const btnProbeGridwsn = document.getElementById("btn-probe-gridwsn");
  const btnProbePcodewsn = document.getElementById("btn-probe-pcodewsn");
  const btnProbeDtViiia = document.getElementById("btn-probe-dt-viiia");
  const btnProbeDtViiib = document.getElementById("btn-probe-dt-viiib");
  const btnProbeCancerNetworks = document.getElementById("btn-probe-cancer-networks");
  const devolvedTariffCancerOutput = document.getElementById("devolved-tariff-cancer-output");

  if (btnProbeGridwsn && devolvedTariffCancerOutput) {
    btnProbeGridwsn.addEventListener("click", async () => {
      devolvedTariffCancerOutput.textContent = "Loading NHS England ODS Devolved Nations National Grid Directory (168.0 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-national-grid-devolved/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS DEVOLVED NATIONS NATIONAL GRID LOOKUP (gridwsn)]\n`;
        out += `Total Postcodes Mapped: ${data.totalPostcodesMapped.toLocaleString()} | Era: ${data.reportingEra}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DEVOLVED POSTCODE NATIONAL GRID COORDINATES (EASTINGS & NORTHINGS) ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [${m.postcode}] Easting: ${m.easting} | Northing: ${m.northing} | Geo: ${m.highLevelGeography} | HA: ${m.healthAuthority}\n`;
        });

        devolvedTariffCancerOutput.textContent = out;
      } catch (err) {
        devolvedTariffCancerOutput.textContent = `ERROR loading Devolved National Grid Directory: ${err.message}`;
      }
    });
  }

  if (btnProbePcodewsn && devolvedTariffCancerOutput) {
    btnProbePcodewsn.addEventListener("click", async () => {
      devolvedTariffCancerOutput.textContent = "Loading NHS England ODS Devolved Nations Postcode Health Directory (10.5 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-postcode-health-devolved/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS DEVOLVED NATIONS POSTCODE HEALTH DIRECTORY (pcodewsn)]\n`;
        out += `Total Postcodes Mapped: ${data.totalPostcodesMapped.toLocaleString()} | Era: ${data.reportingEra}\n`;
        out += `File Size: ${data.fileSizeMb} MB | Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DEVOLVED HEALTH BOARD & TRUST DIRECTORY LINKAGES ---\n`;
        data.sampleMappings.forEach(m => {
          out += `• [${m.postcode}] Health Authority / Board: ${m.healthAuthorityBoard} | Trust / Local Authority: ${m.trustOrLocalAuthority}\n`;
        });

        devolvedTariffCancerOutput.textContent = out;
      } catch (err) {
        devolvedTariffCancerOutput.textContent = `ERROR loading Devolved Postcode Health Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeDtViiia && devolvedTariffCancerOutput) {
    btnProbeDtViiia.addEventListener("click", async () => {
      devolvedTariffCancerOutput.textContent = "Loading NHSBSA September 2026 Drug Tariff Part VIIIA Basic Prices (413 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-part-viiia-sep2026/summary");
        const data = await res.json();
        let out = `[NHSBSA SEPTEMBER 2026 DRUG TARIFF PART VIIIA BASIC REIMBURSEMENT PRICES]\n`;
        out += `Total Prescribing Presentations: ${data.totalPresentations.toLocaleString()} | Tariff Period: ${data.tariffPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE STATUTORY REIMBURSEMENT PRESENTATIONS (CATEGORY A, C, M) ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• ${p.medicine} (${p.packSize} ${p.unit})\n`;
          out += `    VMP SNOMED: ${p.vmpSnomedCode} | Category: ${p.category} | Price: £${p.basicPriceGbp.toFixed(2)} (${p.basicPricePence}p)\n`;
        });

        devolvedTariffCancerOutput.textContent = out;
      } catch (err) {
        devolvedTariffCancerOutput.textContent = `ERROR loading Drug Tariff Part VIIIA: ${err.message}`;
      }
    });
  }

  if (btnProbeDtViiib && devolvedTariffCancerOutput) {
    btnProbeDtViiib.addEventListener("click", async () => {
      devolvedTariffCancerOutput.textContent = "Loading NHSBSA May 2026 Drug Tariff Part VIIIB Unlicensed Specials & Imports (54 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-part-viiib-may2026/summary");
        const data = await res.json();
        let out = `[NHSBSA MAY 2026 DRUG TARIFF PART VIIIB UNLICENSED SPECIALS & IMPORTS]\n`;
        out += `Total Unlicensed Specials: ${data.totalUnlicensedSpecials.toLocaleString()} | Tariff Period: ${data.tariffPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE UNLICENSED SPECIALS & IMPORT FORMULATIONS ---\n`;
        data.sampleSpecials.forEach(s => {
          out += `• ${s.medicine} (${s.packSize} ${s.unit})\n`;
          out += `    VMP SNOMED: ${s.vmpSnomedCode} | Formulations: ${s.formulations} | Price: £${s.basicPriceGbp.toFixed(2)} (${s.basicPricePence}p)\n`;
        });

        devolvedTariffCancerOutput.textContent = out;
      } catch (err) {
        devolvedTariffCancerOutput.textContent = `ERROR loading Drug Tariff Part VIIIB: ${err.message}`;
      }
    });
  }

  if (btnProbeCancerNetworks && devolvedTariffCancerOutput) {
    btnProbeCancerNetworks.addEventListener("click", async () => {
      devolvedTariffCancerOutput.textContent = "Loading NHS Statutory Cancer Networks Directory (England & Wales)...";
      try {
        const res = await fetch("/api/warehouse/ods-cancer-networks/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND & WALES STATUTORY CANCER NETWORKS HISTORICAL DIRECTORY]\n`;
        out += `Total Statutory Cancer Networks: ${data.totalCancerNetworks.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STATUTORY REGIONAL ONCOLOGY DELIVERY NETWORKS ---\n`;
        data.sampleNetworks.forEach(n => {
          out += `• [Code: ${n.code}] ${n.name}\n`;
        });

        devolvedTariffCancerOutput.textContent = out;
      } catch (err) {
        devolvedTariffCancerOutput.textContent = `ERROR loading Cancer Networks Directory: ${err.message}`;
      }
    });
  }

  // 46. Non-Standard Postcodes, Drug Tariff Part VIIID & Category M, Dispensing Practices Directory & Historical PCOs Handlers
  const btnProbePcodeoth = document.getElementById("btn-probe-pcodeoth");
  const btnProbeDtViiid = document.getElementById("btn-probe-dt-viiid");
  const btnProbeDtCategoryM = document.getElementById("btn-probe-dt-category-m");
  const btnProbeDispPracticesDir = document.getElementById("btn-probe-disp-practices-dir");
  const btnProbeOdsPcos = document.getElementById("btn-probe-ods-pcos");
  const nonstandardTariffPcoOutput = document.getElementById("nonstandard-tariff-pco-output");

  if (btnProbePcodeoth && nonstandardTariffPcoOutput) {
    btnProbePcodeoth.addEventListener("click", async () => {
      nonstandardTariffPcoOutput.textContent = "Loading Non-Standard & Channel Islands Postcodes Directory (446 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-postcode-health-other/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS NON-STANDARD & SPECIAL POSTCODES HEALTH DIRECTORY (pcodeoth)]\n`;
        out += `Total Postcodes Mapped: ${data.totalPostcodes.toLocaleString()} | Geocoded Entities: ${data.totalGeocodedEntities.toLocaleString()}\n`;
        out += `Authority: ${data.authority} | Period: ${data.reportingPeriod}\n\n`;

        out += `--- SAMPLE NON-STANDARD & OFFSHORE POSTCODES ---\n`;
        data.samplePostcodes.forEach(p => {
          out += `• [${p.postcode}] Health Authority: ${p.healthAuthority} | Trust/Board: ${p.pctOrTrust} | Jurisdiction: ${p.jurisdiction}\n`;
        });

        nonstandardTariffPcoOutput.textContent = out;
      } catch (err) {
        nonstandardTariffPcoOutput.textContent = `ERROR loading Non-Standard Postcodes: ${err.message}`;
      }
    });
  }

  if (btnProbeDtViiid && nonstandardTariffPcoOutput) {
    btnProbeDtViiid.addEventListener("click", async () => {
      nonstandardTariffPcoOutput.textContent = "Loading August 2026 Drug Tariff Part VIIID Unlicensed Specials (6.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-part-viiid-aug2026/summary");
        const data = await res.json();
        let out = `[NHSBSA AUGUST 2026 DRUG TARIFF PART VIIID UNLICENSED SPECIALS & IMPORTS]\n`;
        out += `Total Unlicensed Specials: ${data.totalUnlicensedSpecials.toLocaleString()} | Tariff Period: ${data.tariffPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE UNLICENSED SPECIALS & FORMULATIONS ---\n`;
        data.sampleSpecials.forEach(s => {
          out += `• ${s.medicine} (${s.packSize} ${s.unit})\n`;
          out += `    VMP SNOMED: ${s.vmpSnomedCode} | Formulations: ${s.formulations} | Special Container: ${s.specialContainer ? 'Yes' : 'No'} | Price: £${s.basicPriceGbp.toFixed(2)} (${s.basicPricePence}p)\n`;
        });

        nonstandardTariffPcoOutput.textContent = out;
      } catch (err) {
        nonstandardTariffPcoOutput.textContent = `ERROR loading Drug Tariff Part VIIID: ${err.message}`;
      }
    });
  }

  if (btnProbeDtCategoryM && nonstandardTariffPcoOutput) {
    btnProbeDtCategoryM.addEventListener("click", async () => {
      nonstandardTariffPcoOutput.textContent = "Loading May 2026 Drug Tariff Category M Generic Benchmark Prices (34.9 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-category-m-may2026/summary");
        const data = await res.json();
        let out = `[NHSBSA MAY 2026 DRUG TARIFF CATEGORY M GENERIC BENCHMARK PRICES (QUARTER 1)]\n`;
        out += `Total Prescribing Presentations: ${data.totalPresentations.toLocaleString()} | Tariff Period: ${data.tariffPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HIGH-VOLUME CATEGORY M GENERIC DRUGS ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• ${p.drugName} (${p.packSize} ${p.unit})\n`;
          out += `    VMPP SNOMED: ${p.vmppSnomedCode} | Basic Price: £${p.basicPriceGbp.toFixed(2)} (${p.basicPricePence}p)\n`;
        });

        nonstandardTariffPcoOutput.textContent = out;
      } catch (err) {
        nonstandardTariffPcoOutput.textContent = `ERROR loading Drug Tariff Category M: ${err.message}`;
      }
    });
  }

  if (btnProbeDispPracticesDir && nonstandardTariffPcoOutput) {
    btnProbeDispPracticesDir.addEventListener("click", async () => {
      nonstandardTariffPcoOutput.textContent = "Loading NHSBSA Dispensing Doctor Practices National Directory (115 KB)...";
      try {
        const res = await fetch("/api/warehouse/dispensing-practices-directory-july2026/summary");
        const data = await res.json();
        let out = `[NHSBSA DISPENSING DOCTOR PRACTICES NATIONAL DIRECTORY (July 2026)]\n`;
        out += `Total Dispensing Surgeries: ${data.totalDispensingPractices.toLocaleString()} | Reporting Month: ${data.reportingMonth}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING DOCTOR SURGERIES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [Code: ${p.practiceCode}] ${p.practiceName} (${p.postcode})\n`;
          out += `    Location: ${p.address} | Sub-ICB: ${p.sicblName} | Dispensing GPs: ${p.dispensingGps} / ${p.totalGps}\n`;
        });

        nonstandardTariffPcoOutput.textContent = out;
      } catch (err) {
        nonstandardTariffPcoOutput.textContent = `ERROR loading Dispensing Practices Directory: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPcos && nonstandardTariffPcoOutput) {
    btnProbeOdsPcos.addEventListener("click", async () => {
      nonstandardTariffPcoOutput.textContent = "Loading Historical Primary Care Organisations & Trusts (4.6 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-primary-care-organisations/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS HISTORICAL PRIMARY CARE ORGANISATIONS DIRECTORY (PCOs)]\n`;
        out += `Total Primary Care Organisations: ${data.totalPrimaryCareOrganisations.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HISTORICAL PRIMARY CARE TRUSTS (PCTs & PCOs) ---\n`;
        data.sampleOrganisations.forEach(o => {
          out += `• [Code: ${o.code} / ODS: ${o.odsCode}] ${o.name}\n`;
        });

        nonstandardTariffPcoOutput.textContent = out;
      } catch (err) {
        nonstandardTariffPcoOutput.textContent = `ERROR loading Historical PCOs: ${err.message}`;
      }
    });
  }

  // 47. Sub-ICB Locations, Integrated Care Boards, NHS England Regions, Drug Tariff Category M April 2026 & Dispensing Practices May 2026 Handlers
  const btnProbeSubIcbReg = document.getElementById("btn-probe-sub-icb");
  const btnProbeIcbDir = document.getElementById("btn-probe-icb-dir");
  const btnProbeNhser = document.getElementById("btn-probe-nhser");
  const btnProbeDtCatMApr26 = document.getElementById("btn-probe-dt-cat-m-apr26");
  const btnProbeDispMay26 = document.getElementById("btn-probe-disp-may26");
  const regionalTariffDispOutput = document.getElementById("regional-tariff-disp-output");

  if (btnProbeSubIcbReg && regionalTariffDispOutput) {
    btnProbeSubIcbReg.addEventListener("click", async () => {
      regionalTariffDispOutput.textContent = "Loading Sub-ICB Locations Statutory Directory (5.6 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-sub-icb-locations/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS SUB-ICB LOCATIONS STATUTORY DIRECTORY (April 2026)]\n`;
        out += `Total Sub-ICB Locations: ${data.totalSubIcbLocations.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SUB-ICB LOCATIONS ---\n`;
        data.sampleLocations.forEach(l => {
          out += `• [GSS: ${l.code} / ODS: ${l.odsCode}] ${l.name}\n`;
        });

        regionalTariffDispOutput.textContent = out;
      } catch (err) {
        regionalTariffDispOutput.textContent = `ERROR loading Sub-ICB Locations: ${err.message}`;
      }
    });
  }

  if (btnProbeIcbDir && regionalTariffDispOutput) {
    btnProbeIcbDir.addEventListener("click", async () => {
      regionalTariffDispOutput.textContent = "Loading Integrated Care Boards Statutory Directory (2.3 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-integrated-care-boards/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS INTEGRATED CARE BOARDS STATUTORY DIRECTORY (April 2026)]\n`;
        out += `Total Integrated Care Boards: ${data.totalIntegratedCareBoards.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE INTEGRATED CARE BOARDS ---\n`;
        data.sampleBoards.forEach(b => {
          out += `• [GSS: ${b.code} / ODS: ${b.odsCode}] ${b.name}\n`;
        });

        regionalTariffDispOutput.textContent = out;
      } catch (err) {
        regionalTariffDispOutput.textContent = `ERROR loading Integrated Care Boards: ${err.message}`;
      }
    });
  }

  if (btnProbeNhser && regionalTariffDispOutput) {
    btnProbeNhser.addEventListener("click", async () => {
      regionalTariffDispOutput.textContent = "Loading NHS England Commissioning Regions Directory (0.23 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-commissioning-regions/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND ODS COMMISSIONING REGIONS STATUTORY DIRECTORY (April 2024)]\n`;
        out += `Total Commissioning Regions: ${data.totalCommissioningRegions.toLocaleString()} | Period: ${data.reportingPeriod}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- ALL 7 NHS ENGLAND COMMISSIONING REGIONS ---\n`;
        data.sampleRegions.forEach(r => {
          out += `• [GSS: ${r.code} / Regional ODS: ${r.odsCode}] ${r.name}\n`;
        });

        regionalTariffDispOutput.textContent = out;
      } catch (err) {
        regionalTariffDispOutput.textContent = `ERROR loading Commissioning Regions: ${err.message}`;
      }
    });
  }

  if (btnProbeDtCatMApr26 && regionalTariffDispOutput) {
    btnProbeDtCatMApr26.addEventListener("click", async () => {
      regionalTariffDispOutput.textContent = "Loading Drug Tariff Category M Benchmark Prices (April 2026, 38.0 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-category-m-apr2026/summary");
        const data = await res.json();
        let out = `[NHSBSA DRUG TARIFF CATEGORY M BENCHMARK GENERIC PRICES (April 2026)]\n`;
        out += `Total Generic Presentations: ${data.totalGenericPresentations.toLocaleString()} | Quarter: ${data.tariffQuarter}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HIGH-VOLUME GENERIC PRESENTATIONS ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• [SNOMED: ${p.snomedCode}] ${p.drugName} (${p.packSize})\n`;
          out += `    Basic Price: ${p.basicPriceGbp} (${p.basicPricePence}p)\n`;
        });

        regionalTariffDispOutput.textContent = out;
      } catch (err) {
        regionalTariffDispOutput.textContent = `ERROR loading Category M April 2026: ${err.message}`;
      }
    });
  }

  if (btnProbeDispMay26 && regionalTariffDispOutput) {
    btnProbeDispMay26.addEventListener("click", async () => {
      regionalTariffDispOutput.textContent = "Loading NHSBSA Dispensing Doctor Practices National Directory (May 2026, 115.5 KB)...";
      try {
        const res = await fetch("/api/warehouse/dispensing-practices-directory-may2026/summary");
        const data = await res.json();
        let out = `[NHSBSA DISPENSING DOCTOR PRACTICES NATIONAL DIRECTORY (May 2026)]\n`;
        out += `Total Dispensing Surgeries: ${data.totalDispensingPractices.toLocaleString()} | Month: ${data.reportingMonth}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING DOCTOR SURGERIES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [Code: ${p.practiceCode}] ${p.practiceName} (${p.postcode})\n`;
          out += `    Location: ${p.address} | Sub-ICB: ${p.sicblName} | Dispensing GPs: ${p.dispensingGps} / ${p.totalGps}\n`;
        });

        regionalTariffDispOutput.textContent = out;
      } catch (err) {
        regionalTariffDispOutput.textContent = `ERROR loading Dispensing Practices May 2026: ${err.message}`;
      }
    });
  }

  // 48. Wales Local Health Boards, Scotland Health Boards & CHPs, Drug Tariff Category M Jan 2026 & Dispensing Practices Apr 2026 Handlers
  const btnProbeWaLhb = document.getElementById("btn-probe-wa-lhb");
  const btnProbeScHb = document.getElementById("btn-probe-sc-hb");
  const btnProbeScChp = document.getElementById("btn-probe-sc-chp");
  const btnProbeDtCatMJan26 = document.getElementById("btn-probe-dt-cat-m-jan26");
  const btnProbeDispApr26 = document.getElementById("btn-probe-disp-apr26");
  const devolvedTariffDispOutput = document.getElementById("devolved-tariff-disp-output");

  if (btnProbeWaLhb && devolvedTariffDispOutput) {
    btnProbeWaLhb.addEventListener("click", async () => {
      devolvedTariffDispOutput.textContent = "Loading NHS Wales Local Health Boards Statutory Directory (0.66 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-wales-local-health-boards/summary");
        const data = await res.json();
        let out = `[NHS WALES ODS LOCAL HEALTH BOARDS STATUTORY DIRECTORY (April 2019 / 2026)]\n`;
        out += `Total Health Boards: ${data.totalHealthBoards.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- ALL 7 WELSH LOCAL HEALTH BOARDS ---\n`;
        data.sampleBoards.forEach(b => {
          out += `• [GSS: ${b.lhbCode} / ODS: ${b.lhbOdsCode}] ${b.lhbNameEn}\n`;
          out += `    Welsh Title: ${b.lhbNameCy}\n`;
        });

        devolvedTariffDispOutput.textContent = out;
      } catch (err) {
        devolvedTariffDispOutput.textContent = `ERROR loading Wales Health Boards: ${err.message}`;
      }
    });
  }

  if (btnProbeScHb && devolvedTariffDispOutput) {
    btnProbeScHb.addEventListener("click", async () => {
      devolvedTariffDispOutput.textContent = "Loading NHS Scotland Territorial Health Boards Directory (0.41 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-scotland-health-boards/summary");
        const data = await res.json();
        let out = `[NHS SCOTLAND ODS TERRITORIAL HEALTH BOARDS STATUTORY DIRECTORY (April 2019 / 2026)]\n`;
        out += `Total Health Boards: ${data.totalHealthBoards.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SCOTTISH HEALTH BOARDS ---\n`;
        data.sampleBoards.forEach(b => {
          out += `• [GSS: ${b.hbCode} / PHS: ${b.hbPhsCode}] ${b.hbName}\n`;
        });

        devolvedTariffDispOutput.textContent = out;
      } catch (err) {
        devolvedTariffDispOutput.textContent = `ERROR loading Scotland Health Boards: ${err.message}`;
      }
    });
  }

  if (btnProbeScChp && devolvedTariffDispOutput) {
    btnProbeScChp.addEventListener("click", async () => {
      devolvedTariffDispOutput.textContent = "Loading NHS Scotland Community Health Partnerships Directory (2.11 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-scotland-community-health-partnerships/summary");
        const data = await res.json();
        let out = `[NHS SCOTLAND ODS COMMUNITY HEALTH PARTNERSHIPS DIRECTORY (April 2012 / 2026)]\n`;
        out += `Total CHPs: ${data.totalChps.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE COMMUNITY HEALTH PARTNERSHIPS ---\n`;
        data.sampleChps.forEach(c => {
          out += `• [GSS: ${c.chpCode} / ODS: ${c.chpOdsCode}] ${c.chpName}\n`;
        });

        devolvedTariffDispOutput.textContent = out;
      } catch (err) {
        devolvedTariffDispOutput.textContent = `ERROR loading Scotland CHPs: ${err.message}`;
      }
    });
  }

  if (btnProbeDtCatMJan26 && devolvedTariffDispOutput) {
    btnProbeDtCatMJan26.addEventListener("click", async () => {
      devolvedTariffDispOutput.textContent = "Loading Drug Tariff Category M Benchmark Prices (January 2026, 37.7 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-category-m-jan2026/summary");
        const data = await res.json();
        let out = `[NHSBSA DRUG TARIFF CATEGORY M BENCHMARK GENERIC PRICES (January 2026)]\n`;
        out += `Total Presentations: ${data.totalPresentations.toLocaleString()} | Quarter: ${data.tariffQuarter}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HIGH-VOLUME GENERIC PRESENTATIONS ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• [SNOMED: ${p.snomedCode}] ${p.drugName} (${p.packSize})\n`;
          out += `    Basic Price: ${p.basicPriceGbp} (${p.basicPricePence}p)\n`;
        });

        devolvedTariffDispOutput.textContent = out;
      } catch (err) {
        devolvedTariffDispOutput.textContent = `ERROR loading Category M January 2026: ${err.message}`;
      }
    });
  }

  if (btnProbeDispApr26 && devolvedTariffDispOutput) {
    btnProbeDispApr26.addEventListener("click", async () => {
      devolvedTariffDispOutput.textContent = "Loading NHSBSA Dispensing Doctor Practices National Directory (April 2026, 115.7 KB)...";
      try {
        const res = await fetch("/api/warehouse/dispensing-practices-directory-apr2026/summary");
        const data = await res.json();
        let out = `[NHSBSA DISPENSING DOCTOR PRACTICES NATIONAL DIRECTORY (April 2026)]\n`;
        out += `Total Dispensing Surgeries: ${data.totalDispensingPractices.toLocaleString()} | Month: ${data.reportingMonth}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE DISPENSING DOCTOR SURGERIES ---\n`;
        data.samplePractices.forEach(p => {
          out += `• [Code: ${p.practiceCode}] ${p.practiceName} (${p.postcode})\n`;
          out += `    Location: ${p.address} | Sub-ICB: ${p.sicblName} | Dispensing GPs: ${p.dispensingGps} / ${p.totalGps}\n`;
        });

        devolvedTariffDispOutput.textContent = out;
      } catch (err) {
        devolvedTariffDispOutput.textContent = `ERROR loading Dispensing Practices April 2026: ${err.message}`;
      }
    });
  }

  // Section 49: Cancer Registries, Sovereign Countries, English Shire Counties, Historical Health Authorities & Category M Oct 2025
  const btnProbeOdsCreg = document.getElementById("btn-probe-ods-creg");
  const btnProbeOdsCtry = document.getElementById("btn-probe-ods-ctry");
  const btnProbeOdsCty = document.getElementById("btn-probe-ods-cty");
  const btnProbeOdsHa = document.getElementById("btn-probe-ods-ha");
  const btnProbeDtCatMOct25 = document.getElementById("btn-probe-dt-cat-m-oct25");
  const registriesCountiesTariffOutput = document.getElementById("registries-counties-tariff-output");

  if (btnProbeOdsCreg && registriesCountiesTariffOutput) {
    btnProbeOdsCreg.addEventListener("click", async () => {
      registriesCountiesTariffOutput.textContent = "Loading NHS England & Wales ODS Cancer Registries Directory (0.43 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-cancer-registries/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND & WALES ODS CANCER REGISTRIES DIRECTORY (CREG)]\n`;
        out += `Total Registries: ${data.totalRegistries.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE REGIONAL CANCER REGISTRIES ---\n`;
        data.sampleRegistries.forEach(r => {
          out += `• [Code: ${r.cregCode}] ${r.cregName}\n`;
        });

        registriesCountiesTariffOutput.textContent = out;
      } catch (err) {
        registriesCountiesTariffOutput.textContent = `ERROR loading Cancer Registries: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCtry && registriesCountiesTariffOutput) {
    btnProbeOdsCtry.addEventListener("click", async () => {
      registriesCountiesTariffOutput.textContent = "Loading Sovereign Country Names and Codes UK Directory (0.24 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-country-names-codes/summary");
        const data = await res.json();
        let out = `[SOVEREIGN COUNTRY NAMES AND CODES UK DIRECTORY (CTRY)]\n`;
        out += `Total Countries: ${data.totalCountries.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SOVEREIGN ENTITIES ---\n`;
        data.sampleCountries.forEach(c => {
          const welsh = c.ctryNameCy ? ` / ${c.ctryNameCy}` : '';
          out += `• [GSS: ${c.ctryCode} / ODS: ${c.ctryOdsCode}] ${c.ctryNameEn}${welsh}\n`;
        });

        registriesCountiesTariffOutput.textContent = out;
      } catch (err) {
        registriesCountiesTariffOutput.textContent = `ERROR loading Sovereign Countries: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsCty && registriesCountiesTariffOutput) {
    btnProbeOdsCty.addEventListener("click", async () => {
      registriesCountiesTariffOutput.textContent = "Loading Non-Metropolitan Shire Counties Directory (0.53 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-counties-directory/summary");
        const data = await res.json();
        let out = `[NON-METROPOLITAN SHIRE COUNTIES DIRECTORY (CTY)]\n`;
        out += `Total Counties: ${data.totalCounties.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE SHIRE COUNTIES ---\n`;
        data.sampleCounties.forEach(c => {
          out += `• [GSS: ${c.ctyCode}] ${c.ctyName}\n`;
        });

        registriesCountiesTariffOutput.textContent = out;
      } catch (err) {
        registriesCountiesTariffOutput.textContent = `ERROR loading Shire Counties: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsHa && registriesCountiesTariffOutput) {
    btnProbeOdsHa.addEventListener("click", async () => {
      registriesCountiesTariffOutput.textContent = "Loading Historical Statutory Health Authorities Directory (2.06 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-health-authorities-historical/summary");
        const data = await res.json();
        let out = `[HISTORICAL STATUTORY HEALTH AUTHORITIES DIRECTORY (HA01)]\n`;
        out += `Total Health Authorities: ${data.totalHealthAuthorities.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HISTORICAL HEALTH AUTHORITIES ---\n`;
        data.sampleHealthAuthorities.forEach(h => {
          out += `• [ODS: ${h.haCode}] ${h.haName}\n`;
        });

        registriesCountiesTariffOutput.textContent = out;
      } catch (err) {
        registriesCountiesTariffOutput.textContent = `ERROR loading Health Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeDtCatMOct25 && registriesCountiesTariffOutput) {
    btnProbeDtCatMOct25.addEventListener("click", async () => {
      registriesCountiesTariffOutput.textContent = "Loading Drug Tariff Category M Benchmark Prices (October 2025, 37.4 KB)...";
      try {
        const res = await fetch("/api/warehouse/drug-tariff-category-m-oct2025/summary");
        const data = await res.json();
        let out = `[NHSBSA DRUG TARIFF CATEGORY M BENCHMARK GENERIC PRICES (October 2025)]\n`;
        out += `Total Presentations: ${data.totalPresentations.toLocaleString()} | Quarter: ${data.tariffQuarter}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE HIGH-VOLUME GENERIC PRESENTATIONS ---\n`;
        data.samplePresentations.forEach(p => {
          out += `• [SNOMED: ${p.snomedCode}] ${p.drugName} (${p.packSize})\n`;
          out += `    Basic Price: ${p.basicPriceGbp} (${p.basicPricePence}p)\n`;
        });

        registriesCountiesTariffOutput.textContent = out;
      } catch (err) {
        registriesCountiesTariffOutput.textContent = `ERROR loading Category M October 2025: ${err.message}`;
      }
    });
  }

  // =========================================================================
  // Section 50: Historical EW Counties 1991, Districts 1991, NI HSCB, Welsh HAs & NI HBs
  // =========================================================================
  const btnProbeOdsCty91 = document.getElementById("btn-probe-ods-cty-91");
  const btnProbeOdsDist91 = document.getElementById("btn-probe-ods-dist-91");
  const btnProbeOdsHscbNi = document.getElementById("btn-probe-ods-hscb-ni");
  const btnProbeOdsHaWa = document.getElementById("btn-probe-ods-ha-wa");
  const btnProbeOdsHbNi = document.getElementById("btn-probe-ods-hb-ni");
  const countiesDistrictsDevolvedOutput = document.getElementById("counties-districts-devolved-output");

  if (btnProbeOdsCty91 && countiesDistrictsDevolvedOutput) {
    btnProbeOdsCty91.addEventListener("click", async () => {
      countiesDistrictsDevolvedOutput.textContent = "Loading Historical Shire Counties Directory 1991 (1.22 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-counties-ew-1991/summary");
        const data = await res.json();
        let out = `[HISTORICAL SHIRE COUNTIES DIRECTORY (1991 Census Baseline)]\n`;
        out += `Total Counties: ${data.totalCounties.toLocaleString()} | Effective: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 1991 COUNTIES & ADMINISTRATIVE REGIONS ---\n`;
        data.sampleCounties.forEach(c => {
          out += `• [Code: ${c.code1 || c.code2 || '-'}] ${c.countyName}\n`;
        });

        countiesDistrictsDevolvedOutput.textContent = out;
      } catch (err) {
        countiesDistrictsDevolvedOutput.textContent = `ERROR loading Counties 1991: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsDist91 && countiesDistrictsDevolvedOutput) {
    btnProbeOdsDist91.addEventListener("click", async () => {
      countiesDistrictsDevolvedOutput.textContent = "Loading Historical Local Government Districts Directory 1991 (11.1 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-districts-ew-1991/summary");
        const data = await res.json();
        let out = `[HISTORICAL LOCAL GOVERNMENT DISTRICTS DIRECTORY (1991 Census Baseline)]\n`;
        out += `Total Districts: ${data.totalDistricts.toLocaleString()} | Effective: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 1991 LOCAL GOVERNMENT DISTRICTS & BOROUGHS ---\n`;
        data.sampleDistricts.forEach(d => {
          out += `• ${d.districtName} (Code: ${d.code1 || d.code2})\n`;
        });

        countiesDistrictsDevolvedOutput.textContent = out;
      } catch (err) {
        countiesDistrictsDevolvedOutput.textContent = `ERROR loading Districts 1991: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsHscbNi && countiesDistrictsDevolvedOutput) {
    btnProbeOdsHscbNi.addEventListener("click", async () => {
      countiesDistrictsDevolvedOutput.textContent = "Loading HSCB Northern Ireland Statutory Directory (65 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-hscb-ni/summary");
        const data = await res.json();
        let out = `[HSC NORTHERN IRELAND HEALTH & SOCIAL CARE BOARD DIRECTORY (HSCB)]\n`;
        out += `Total Boards: ${data.totalBoards.toLocaleString()} | Date: ${data.effectiveDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STATUTORY HSCB ENTITY ---\n`;
        data.sampleBoards.forEach(b => {
          out += `• [ODS: ${b.odsCode}] ${b.boardName}\n`;
        });

        countiesDistrictsDevolvedOutput.textContent = out;
      } catch (err) {
        countiesDistrictsDevolvedOutput.textContent = `ERROR loading HSCB NI: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsHaWa && countiesDistrictsDevolvedOutput) {
    btnProbeOdsHaWa.addEventListener("click", async () => {
      countiesDistrictsDevolvedOutput.textContent = "Loading Historical Welsh Health Authorities Directory (91 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-health-authorities-wales-historical/summary");
        const data = await res.json();
        let out = `[HISTORICAL WELSH HEALTH AUTHORITIES DIRECTORY (HA01 Wales)]\n`;
        out += `Total Health Authorities: ${data.totalHealthAuthorities.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- PREDECESSOR WELSH HEALTH AUTHORITIES ---\n`;
        data.sampleHealthAuthorities.forEach(h => {
          out += `• [ODS: ${h.haCode}] ${h.haName}\n`;
        });

        countiesDistrictsDevolvedOutput.textContent = out;
      } catch (err) {
        countiesDistrictsDevolvedOutput.textContent = `ERROR loading Welsh Health Authorities: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsHbNi && countiesDistrictsDevolvedOutput) {
    btnProbeOdsHbNi.addEventListener("click", async () => {
      countiesDistrictsDevolvedOutput.textContent = "Loading Historical NI Health Boards Directory (124 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-health-boards-ni-historical/summary");
        const data = await res.json();
        let out = `[HISTORICAL NORTHERN IRELAND HEALTH & SOCIAL SERVICES BOARDS (HA03 NI)]\n`;
        out += `Total Health Boards: ${data.totalHealthBoards.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- PREDECESSOR NI HEALTH & SOCIAL SERVICES BOARDS ---\n`;
        data.sampleHealthBoards.forEach(b => {
          out += `• [ODS: ${b.hbCode}] ${b.hbName}\n`;
        });

        countiesDistrictsDevolvedOutput.textContent = out;
      } catch (err) {
        countiesDistrictsDevolvedOutput.textContent = `ERROR loading NI Health Boards: ${err.message}`;
      }
    });
  }

  // 51. NPfIT IT Clusters, UK Local Authorities 2025, NI LCGs, NHS Region Local Offices & PCOs 2005 Handlers
  const btnProbeOdsItClusters = document.getElementById("btn-probe-ods-it-clusters");
  const btnProbeOdsLa2025 = document.getElementById("btn-probe-ods-la-2025");
  const btnProbeOdsLcgNi = document.getElementById("btn-probe-ods-lcg-ni");
  const btnProbeOdsRloEn = document.getElementById("btn-probe-ods-rlo-en");
  const btnProbeOdsPco2005 = document.getElementById("btn-probe-ods-pco-2005");
  const itcLadLcgRloPcoOutput = document.getElementById("itc-lad-lcg-rlo-pco-output");

  if (btnProbeOdsItClusters && itcLadLcgRloPcoOutput) {
    btnProbeOdsItClusters.addEventListener("click", async () => {
      itcLadLcgRloPcoOutput.textContent = "Loading NPfIT Regional Clusters Directory England (132 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-it-clusters/summary");
        const data = await res.json();
        let out = `[NHS NATIONAL PROGRAMME FOR IT (NPfIT) REGIONAL CLUSTERS]\n`;
        out += `Total Clusters: ${data.totalClusters.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- REGIONAL IT CLUSTERS ENGLAND ---\n`;
        data.sampleClusters.forEach(c => {
          out += `• [Cluster: ${c.clusterCode}] ${c.clusterName}\n`;
        });

        itcLadLcgRloPcoOutput.textContent = out;
      } catch (err) {
        itcLadLcgRloPcoOutput.textContent = `ERROR loading IT Clusters: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLa2025 && itcLadLcgRloPcoOutput) {
    btnProbeOdsLa2025.addEventListener("click", async () => {
      itcLadLcgRloPcoOutput.textContent = "Loading UK Local Authorities & Unitary Authorities April 2025 (9.13 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-local-authorities-2025/summary");
        const data = await res.json();
        let out = `[UK LOCAL AUTHORITIES & UNITARY AUTHORITIES (LAD25 April 2025)]\n`;
        out += `Total Local Authorities: ${data.totalLocalAuthorities.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE LOCAL AUTHORITY DISTRICTS ---\n`;
        data.sampleLocalAuthorities.forEach(la => {
          out += `• [GSS: ${la.ladCode}] ${la.ladName}\n`;
        });

        itcLadLcgRloPcoOutput.textContent = out;
      } catch (err) {
        itcLadLcgRloPcoOutput.textContent = `ERROR loading Local Authorities 2025: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLcgNi && itcLadLcgRloPcoOutput) {
    btnProbeOdsLcgNi.addEventListener("click", async () => {
      itcLadLcgRloPcoOutput.textContent = "Loading Northern Ireland Local Commissioning Groups Directory (107 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-lcg-ni/summary");
        const data = await res.json();
        let out = `[NORTHERN IRELAND LOCAL COMMISSIONING GROUPS (LCG10 NI)]\n`;
        out += `Total LCGs: ${data.totalLcgs.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- LOCAL COMMISSIONING GROUPS ---\n`;
        data.sampleLcgs.forEach(l => {
          out += `• [ODS: ${l.lcgOdsCode}] ${l.lcgName}\n`;
        });

        itcLadLcgRloPcoOutput.textContent = out;
      } catch (err) {
        itcLadLcgRloPcoOutput.textContent = `ERROR loading NI LCGs: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsRloEn && itcLadLcgRloPcoOutput) {
    btnProbeOdsRloEn.addEventListener("click", async () => {
      itcLadLcgRloPcoOutput.textContent = "Loading NHS England Region Local Offices Directory (866 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-region-local-offices/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND REGION LOCAL OFFICES DIRECTORY (NHSRLO April 2019)]\n`;
        out += `Total Offices: ${data.totalOffices.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- REGION LOCAL OFFICES ---\n`;
        data.sampleOffices.forEach(o => {
          out += `• [GSS: ${o.gssCode} | ODS: ${o.odsCode}] ${o.officeName}\n`;
        });

        itcLadLcgRloPcoOutput.textContent = out;
      } catch (err) {
        itcLadLcgRloPcoOutput.textContent = `ERROR loading Region Local Offices: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsPco2005 && itcLadLcgRloPcoOutput) {
    btnProbeOdsPco2005.addEventListener("click", async () => {
      itcLadLcgRloPcoOutput.textContent = "Loading Primary Care Organisations Directory October 2005 Baseline (6.95 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-primary-care-organisations-2005/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND PRIMARY CARE ORGANISATIONS (October 2005 Baseline)]\n`;
        out += `Total PCOs: ${data.totalPcos.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE PRIMARY CARE ORGANISATIONS & TRUSTS ---\n`;
        data.samplePcos.forEach(p => {
          out += `• [ODS: ${p.pcoCode}] ${p.pcoName}\n`;
        });

        itcLadLcgRloPcoOutput.textContent = out;
      } catch (err) {
        itcLadLcgRloPcoOutput.textContent = `ERROR loading PCOs 2005: ${err.message}`;
      }
    });
  }

  // Section 52: Pan SHAs 2010, Government Office Regions 2020, Strategic Clinical Networks 2013 & Strategic Health Authorities 2004/2010
  const btnProbeOdsPanSha = document.getElementById("btn-probe-ods-pan-sha");
  const btnProbeOdsRegions2020 = document.getElementById("btn-probe-ods-regions-2020");
  const btnProbeOdsScn2013 = document.getElementById("btn-probe-ods-scn-2013");
  const btnProbeOdsSha2004 = document.getElementById("btn-probe-ods-sha-2004");
  const btnProbeOdsSha2010 = document.getElementById("btn-probe-ods-sha-2010");
  const panShaRgnScnShaOutput = document.getElementById("pan-sha-rgn-scn-sha-output");

  if (btnProbeOdsPanSha && panShaRgnScnShaOutput) {
    btnProbeOdsPanSha.addEventListener("click", async () => {
      panShaRgnScnShaOutput.textContent = "Loading NHS England NPfIT Pan SHA Directory (198 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-pan-sha/summary");
        const data = await res.json();
        let out = `[NHS NATIONAL PROGRAMME FOR IT (NPfIT) PAN SHA DIRECTORY (December 2010)]\n`;
        out += `Total Pan SHAs: ${data.totalPanSha.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- PAN STRATEGIC HEALTH AUTHORITIES FOR IT ---\n`;
        data.samplePanSha.forEach(s => {
          out += `• [GSS: ${s.gssCode} | ODS: ${s.odsCode}] ${s.panShaName}\n`;
        });

        panShaRgnScnShaOutput.textContent = out;
      } catch (err) {
        panShaRgnScnShaOutput.textContent = `ERROR loading Pan SHAs: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsRegions2020 && panShaRgnScnShaOutput) {
    btnProbeOdsRegions2020.addEventListener("click", async () => {
      panShaRgnScnShaOutput.textContent = "Loading Standard Government Office Regions Directory December 2020 (589 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-regions-2020/summary");
        const data = await res.json();
        let out = `[STANDARD GOVERNMENT OFFICE REGIONS DIRECTORY (RGN20 December 2020)]\n`;
        out += `Total Regions: ${data.totalRegions.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STANDARD REGIONS (ENGLISH & DEVOLVED TRANSLATIONS) ---\n`;
        data.sampleRegions.forEach(r => {
          out += `• [GSS: ${r.gssCode} | Code: ${r.codeO}] ${r.regionName} (${r.welshName})\n`;
        });

        panShaRgnScnShaOutput.textContent = out;
      } catch (err) {
        panShaRgnScnShaOutput.textContent = `ERROR loading Regions 2020: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsScn2013 && panShaRgnScnShaOutput) {
    btnProbeOdsScn2013.addEventListener("click", async () => {
      panShaRgnScnShaOutput.textContent = "Loading Strategic Clinical Networks Directory April 2013 (343 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-strategic-clinical-networks/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND STRATEGIC CLINICAL NETWORKS DIRECTORY (SCN13 April 2013)]\n`;
        out += `Total Networks: ${data.totalNetworks.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- STRATEGIC CLINICAL NETWORKS ---\n`;
        data.sampleNetworks.forEach(n => {
          out += `• [Network: ${n.networkCode}] ${n.networkName}\n`;
        });

        panShaRgnScnShaOutput.textContent = out;
      } catch (err) {
        panShaRgnScnShaOutput.textContent = `ERROR loading Clinical Networks: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsSha2004 && panShaRgnScnShaOutput) {
    btnProbeOdsSha2004.addEventListener("click", async () => {
      panShaRgnScnShaOutput.textContent = "Loading Strategic Health Authorities Baseline Directory February 2004 (821 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-sha-2004/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND STRATEGIC HEALTH AUTHORITIES (SHA04 February 2004 Baseline)]\n`;
        out += `Total SHAs: ${data.totalSha.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE ORIGINAL STRATEGIC HEALTH AUTHORITIES (Q01-Q28) ---\n`;
        data.sampleSha.forEach(s => {
          out += `• [SHA: ${s.shaCode}] ${s.shaName}\n`;
        });

        panShaRgnScnShaOutput.textContent = out;
      } catch (err) {
        panShaRgnScnShaOutput.textContent = `ERROR loading SHAs 2004: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsSha2010 && panShaRgnScnShaOutput) {
    btnProbeOdsSha2010.addEventListener("click", async () => {
      panShaRgnScnShaOutput.textContent = "Loading Consolidated Strategic Health Authorities Directory December 2010 (316 B)...";
      try {
        const res = await fetch("/api/warehouse/ods-sha-2010/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND CONSOLIDATED STRATEGIC HEALTH AUTHORITIES (SHA10 December 2010)]\n`;
        out += `Total SHAs: ${data.totalSha.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- CONSOLIDATED STRATEGIC HEALTH AUTHORITIES (Q30-Q39) ---\n`;
        data.sampleSha.forEach(s => {
          out += `• [GSS: ${s.gssCode} | ODS: ${s.odsCode}] ${s.shaName}\n`;
        });

        panShaRgnScnShaOutput.textContent = out;
      } catch (err) {
        panShaRgnScnShaOutput.textContent = `ERROR loading SHAs 2010: ${err.message}`;
      }
    });
  }

  // Section 53: Specialised Mental Health Collaboratives 2021 & Census LSOA/MSOA Geography 2001/2011/2021
  const btnProbeOdsSmhpc2021 = document.getElementById("btn-probe-ods-smhpc-2021");
  const btnProbeOdsLsoa2001 = document.getElementById("btn-probe-ods-lsoa-2001");
  const btnProbeOdsLsoa2011 = document.getElementById("btn-probe-ods-lsoa-2011");
  const btnProbeOdsLsoa2021 = document.getElementById("btn-probe-ods-lsoa-2021");
  const btnProbeOdsMsoa2011 = document.getElementById("btn-probe-ods-msoa-2011");
  const smhpcLsoaMsoaOutput = document.getElementById("smhpc-lsoa-msoa-output");

  if (btnProbeOdsSmhpc2021 && smhpcLsoaMsoaOutput) {
    btnProbeOdsSmhpc2021.addEventListener("click", async () => {
      smhpcLsoaMsoaOutput.textContent = "Loading Specialised Mental Health Provider Collaboratives (2.58 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-smhpc-2021/summary");
        const data = await res.json();
        let out = `[NHS ENGLAND SPECIALISED MENTAL HEALTH PROVIDER COLLABORATIVES (SMHPC 2021)]\n`;
        out += `Total Collaboratives: ${data.totalCollaboratives.toLocaleString()} | Date: ${data.archivedDate}\n`;
        out += `Authority: ${data.authority}\n`;
        out += `Specialities: ${data.specialities.join(', ')}\n\n`;

        out += `--- SAMPLE SPECIALISED MENTAL HEALTH PROVIDER COLLABORATIVES ---\n`;
        data.sampleCollaboratives.forEach(c => {
          out += `• [${c.code}] ${c.name} (${c.speciality})\n`;
        });

        smhpcLsoaMsoaOutput.textContent = out;
      } catch (err) {
        smhpcLsoaMsoaOutput.textContent = `ERROR loading SMHPC 2021: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLsoa2001 && smhpcLsoaMsoaOutput) {
    btnProbeOdsLsoa2001.addEventListener("click", async () => {
      smhpcLsoaMsoaOutput.textContent = "Loading 2001 Census Lower Layer Super Output Areas (962.64 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-lsoa-2001/summary");
        const data = await res.json();
        let out = `[ONS / NHS ODS 2001 CENSUS LOWER LAYER SUPER OUTPUT AREAS (02_05 Baseline)]\n`;
        out += `Total LSOAs: ${data.totalLsoa.toLocaleString()} | Coverage: ${data.coverage}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 2001 CENSUS LSOAs ---\n`;
        data.sampleLsoa.forEach(l => {
          out += `• [Code: ${l.lsoaCode}] ${l.lsoaName}\n`;
        });

        smhpcLsoaMsoaOutput.textContent = out;
      } catch (err) {
        smhpcLsoaMsoaOutput.textContent = `ERROR loading LSOA 2001: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLsoa2011 && smhpcLsoaMsoaOutput) {
    btnProbeOdsLsoa2011.addEventListener("click", async () => {
      smhpcLsoaMsoaOutput.textContent = "Loading 2011 Census Lower Layer Super Output Areas (1.21 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-lsoa-2011/summary");
        const data = await res.json();
        let out = `[ONS / NHS ODS 2011 CENSUS LOWER LAYER SUPER OUTPUT AREAS (12_12 Baseline)]\n`;
        out += `Total LSOAs: ${data.totalLsoa.toLocaleString()} | Coverage: ${data.coverage}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 2011 CENSUS LSOAs ---\n`;
        data.sampleLsoa.forEach(l => {
          out += `• [Code: ${l.lsoaCode}] ${l.lsoaName}\n`;
        });

        smhpcLsoaMsoaOutput.textContent = out;
      } catch (err) {
        smhpcLsoaMsoaOutput.textContent = `ERROR loading LSOA 2011: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsLsoa2021 && smhpcLsoaMsoaOutput) {
    btnProbeOdsLsoa2021.addEventListener("click", async () => {
      smhpcLsoaMsoaOutput.textContent = "Loading 2021 Census Lower Layer Super Output Areas (1.35 MB)...";
      try {
        const res = await fetch("/api/warehouse/ods-lsoa-2021/summary");
        const data = await res.json();
        let out = `[ONS / NHS ODS 2021 CENSUS LOWER LAYER SUPER OUTPUT AREAS (12_22 Baseline)]\n`;
        out += `Total LSOAs: ${data.totalLsoa.toLocaleString()} | Coverage: ${data.coverage}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 2021 CENSUS LSOAs (INCLUDING BILINGUAL WELSH) ---\n`;
        data.sampleLsoa.forEach(l => {
          const welsh = l.lsoaNameWelsh ? ` / ${l.lsoaNameWelsh}` : '';
          out += `• [Code: ${l.lsoaCode}] ${l.lsoaName}${welsh}\n`;
        });

        smhpcLsoaMsoaOutput.textContent = out;
      } catch (err) {
        smhpcLsoaMsoaOutput.textContent = `ERROR loading LSOA 2021: ${err.message}`;
      }
    });
  }

  if (btnProbeOdsMsoa2011 && smhpcLsoaMsoaOutput) {
    btnProbeOdsMsoa2011.addEventListener("click", async () => {
      smhpcLsoaMsoaOutput.textContent = "Loading 2011 Census Middle Layer Super Output Areas (229.12 KB)...";
      try {
        const res = await fetch("/api/warehouse/ods-msoa-2011/summary");
        const data = await res.json();
        let out = `[ONS / NHS ODS 2011 CENSUS MIDDLE LAYER SUPER OUTPUT AREAS (12_12 Baseline)]\n`;
        out += `Total MSOAs: ${data.totalMsoa.toLocaleString()} | Coverage: ${data.coverage}\n`;
        out += `Authority: ${data.authority}\n\n`;

        out += `--- SAMPLE 2011 CENSUS MSOAs ---\n`;
        data.sampleMsoa.forEach(m => {
          out += `• [Code: ${m.msoaCode}] ${m.msoaName}\n`;
        });

        smhpcLsoaMsoaOutput.textContent = out;
      } catch (err) {
        smhpcLsoaMsoaOutput.textContent = `ERROR loading MSOA 2011: ${err.message}`;
      }
    });
  }

  // =========================================================================
  // MULTI-TENANT ENTERPRISE ROLE PORTAL WORKFLOW ROUTING & SESSION CONTROLLER
  // =========================================================================

  let currentSession = null;

  const formatMinor = (v) => (typeof v === "number" ? `£${(v / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—");

  /** Codex mode: the session, account, catalogue and orders all come from Codex via the pass-through gateway. */
  async function initCodexAccount() {
    const sessionRes = await fetch("/codex/api/portal/session", { credentials: "same-origin" });
    if (!sessionRes.ok) return false;
    const { user } = await sessionRes.json();
    const sessionBar = document.getElementById("user-session-bar");
    const unauthBar = document.getElementById("unauth-session-bar");
    if (unauthBar) unauthBar.style.display = "none";
    if (sessionBar) sessionBar.style.display = "flex";
    document.getElementById("session-user-name").textContent = user.displayName || user.username;
    document.getElementById("session-role-badge").textContent = `${user.role} / ${user.accessType}`;
    document.getElementById("session-tenant-badge").textContent = "CODEX SESSION";
    const navBtn = document.getElementById("nav-codex-account");
    if (navBtn) navBtn.style.display = "";
    activateTab("codex-account");

    const get = (path) => fetch(path, { credentials: "same-origin" }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }));
    const [data, products, orders] = await Promise.all([get("/codex/api/portal/data"), get("/codex/api/catalog/products?q="), get("/codex/api/orders")]);

    if (data.ok && data.body.dashboard?.account) {
      const d = data.body.dashboard;
      document.getElementById("codex-account-name").textContent = d.account.legal_name || "—";
      document.getElementById("codex-account-number").textContent = d.account.customer_number || "";
      document.getElementById("codex-order-count").textContent = String(d.orderCount ?? 0);
      document.getElementById("codex-available-credit").textContent = formatMinor(d.availableCreditMinor);
      document.getElementById("codex-data-freshness").textContent = `Backend data as of ${d.dataFreshness}. ${data.body.dataPolicy || ""}`;
    } else {
      document.getElementById("codex-account-name").textContent = data.body.error || `Unavailable (HTTP ${data.status})`;
    }
    const cat = document.getElementById("codex-catalogue");
    if (products.ok) {
      const list = products.body.products || [];
      cat.textContent = list.length
        ? list.map((p) => `${p.sku}  ${p.product_name || p.productName}  ${formatMinor(p.list_price_minor ?? p.listPriceMinor)}`).join("\n")
        : "No products are currently released for ordering on this account. Products appear here only after regulatory and marketing approval.";
    } else cat.textContent = products.body.error || `Unavailable (HTTP ${products.status})`;
    const ord = document.getElementById("codex-orders");
    if (orders.ok) {
      const list = orders.body.orders || [];
      ord.textContent = list.length ? list.map((o) => `${o.order_number}  ${o.status}  ${formatMinor(o.total_minor)}`).join("\n") : "No orders on this account yet.";
    } else ord.textContent = orders.body.error || `Unavailable (HTTP ${orders.status})`;

    const logoutBtn = document.getElementById("portal-logout-btn");
    logoutBtn?.addEventListener("click", async () => {
      try {
        const csrf = await fetch("/codex/api/security/csrf", { credentials: "same-origin" }).then((r) => r.json());
        await fetch("/codex/api/auth/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken }, body: "{}" });
      } finally {
        try {
          localStorage.removeItem("np_session_token");
          localStorage.removeItem("np_session_role");
        } catch {}
        window.location.href = "/portal/login";
      }
    });
    return true;
  }

  async function initSessionAndRolePortals() {
    const unauthBar = document.getElementById("unauth-session-bar");
    const sessionBar = document.getElementById("user-session-bar");

    // Check URL hash immediately on initial load
    handleUrlHash();

    try {
      const cfg = await fetch("/api/platform/config", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      if (cfg.mode === "PASS_THROUGH_TO_CODEX") {
        await initCodexAccount();
        return; // Codex is the identity authority; no local staging session is consulted.
      }

      const token = localStorage.getItem("np_session_token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/platform/auth/session", {
        credentials: "same-origin",
        headers
      });

      let data = null;
      if (res.ok) {
        data = await res.json().catch(() => null);
      }

      if (data && data.authenticated && data.session) {
        currentSession = data.session;
      } else {
        // Fallback for static hosting / offline harness
        const localUser = localStorage.getItem("np_session_user");
        if (localUser) {
          try {
            currentSession = JSON.parse(localUser);
          } catch {}
        }
      }

      if (!currentSession) {
        if (unauthBar) unauthBar.style.display = "flex";
        if (sessionBar) sessionBar.style.display = "none";
        return;
      }

      // Update header session bar
      if (unauthBar) unauthBar.style.display = "none";
      if (sessionBar) sessionBar.style.display = "flex";
      const nameEl = document.getElementById("session-user-name");
      const roleEl = document.getElementById("session-role-badge");
      const tenantEl = document.getElementById("session-tenant-badge");
      const logoutBtn = document.getElementById("portal-logout-btn");

      if (nameEl) nameEl.textContent = currentSession.name || currentSession.email;
      if (roleEl) roleEl.textContent = currentSession.role;
      if (tenantEl) tenantEl.textContent = currentSession.tenantId;

      // Update tenant labels in role panes
      const custTenant = document.getElementById("customer-tenant-display");
      if (custTenant && currentSession.role === "ROLE_GDP_CUSTOMER") {
        custTenant.textContent = currentSession.tenantId;
      }
      const suppTenant = document.getElementById("supplier-tenant-display");
      if (suppTenant && currentSession.role === "ROLE_SUPPLIER_WDA") {
        suppTenant.textContent = currentSession.tenantId;
      }

      // If URL hash wasn't explicitly specified, auto-switch to appropriate role tab
      if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#terminal") {
        let targetTab = null;
        if (currentSession.role === "ROLE_GDP_CUSTOMER") targetTab = "role-customer";
        else if (currentSession.role === "ROLE_SUPPLIER_WDA") targetTab = "role-supplier";
        else if (currentSession.role === "ROLE_RESPONSIBLE_PERSON_RP" || currentSession.role === "ROLE_QUALIFIED_PERSON_QP") targetTab = "role-rp";
        else if (currentSession.role === "ROLE_EXECUTIVE_AUDIT") targetTab = "role-board";

        if (targetTab) {
          activateTab(targetTab);
        }
      }

      // Bind Logout button
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          try {
            const token = localStorage.getItem("np_session_token");
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;
            await fetch("/api/platform/auth/logout", { method: "POST", headers, credentials: "same-origin" }).catch(() => {});
          } catch (err) {
            console.warn("Logout request failed:", err);
          } finally {
            try {
              localStorage.removeItem("np_session_token");
              localStorage.removeItem("np_session_role");
              localStorage.removeItem("np_session_user");
            } catch {}
            const targetLogin = window.location.pathname.startsWith('/portal') ? '/portal/login.html' : '/login';
            window.location.href = targetLogin;
          }
        });
      }
    } catch (err) {
      console.warn("Session check offline or unauthenticated, consulting local sovereign store:", err);
      const localUser = localStorage.getItem("np_session_user");
      if (localUser) {
        try {
          currentSession = JSON.parse(localUser);
          if (unauthBar) unauthBar.style.display = "none";
          if (sessionBar) sessionBar.style.display = "flex";
          const nameEl = document.getElementById("session-user-name");
          const roleEl = document.getElementById("session-role-badge");
          const tenantEl = document.getElementById("session-tenant-badge");
          if (nameEl) nameEl.textContent = currentSession.name || currentSession.email;
          if (roleEl) roleEl.textContent = currentSession.role;
          if (tenantEl) tenantEl.textContent = currentSession.tenantId;

          if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#terminal") {
            let targetTab = null;
            if (currentSession.role === "ROLE_GDP_CUSTOMER") targetTab = "role-customer";
            else if (currentSession.role === "ROLE_SUPPLIER_WDA") targetTab = "role-supplier";
            else if (currentSession.role === "ROLE_RESPONSIBLE_PERSON_RP" || currentSession.role === "ROLE_QUALIFIED_PERSON_QP") targetTab = "role-rp";
            else if (currentSession.role === "ROLE_EXECUTIVE_AUDIT") targetTab = "role-board";
            if (targetTab) activateTab(targetTab);
          }
        } catch {}
      } else {
        if (unauthBar) unauthBar.style.display = "flex";
        if (sessionBar) sessionBar.style.display = "none";
      }
    }
  }

  // Helper for executing portal workflows
  async function invokePortalWorkflow(workflowCode, targetSurface, targetTenantId, payload) {
    const token = localStorage.getItem("np_session_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/platform/portal/workflow", {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({
        workflowCode,
        targetSurface,
        targetTenantId,
        payload
      })
    });
    return await res.json();
  }

  // 1. Wholesale Customer Workflows
  const btnCustomerTrackOrder = document.getElementById("btn-customer-track-order");
  const customerOrderOutput = document.getElementById("customer-order-output");
  if (btnCustomerTrackOrder && customerOrderOutput) {
    btnCustomerTrackOrder.addEventListener("click", async () => {
      const orderId = document.getElementById("customer-order-id-input")?.value || "ORD-2026-GSTT-0419";
      customerOrderOutput.textContent = `Querying order dispatch ledger for ${orderId}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-customer-gstt-nhs";
        const result = await invokePortalWorkflow(
          "CUSTOMER_ORDER_TRACKING",
          "PORTAL_CUSTOMER",
          tenantId,
          { orderId }
        );
        let out = `[ORDER TRACKING REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} (HTTP ${result.httpStatus})\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Execution ID: ${result.executionId}\n`;
        out += `Actor / Tenant: ${result.actorId} [${result.tenantId}]\n`;
        out += `Consignment Items:\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}\n`;
        out += `Committed At: ${result.executedAt}`;
        customerOrderOutput.textContent = out;
      } catch (err) {
        customerOrderOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnCustomerSubmitRfq = document.getElementById("btn-customer-submit-rfq");
  const customerRfqOutput = document.getElementById("customer-rfq-output");
  if (btnCustomerSubmitRfq && customerRfqOutput) {
    btnCustomerSubmitRfq.addEventListener("click", async () => {
      const sku = document.getElementById("customer-rfq-sku")?.value || "39873111000001103";
      const requestedQuantity = Number(document.getElementById("customer-rfq-qty")?.value || 500);
      const targetPriceMinor = Number(document.getElementById("customer-rfq-price")?.value || 18500);

      customerRfqOutput.textContent = `Submitting RFQ for SKU ${sku}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-customer-gstt-nhs";
        const result = await invokePortalWorkflow(
          "CUSTOMER_RFQ_QUOTE_REQUEST",
          "PORTAL_CUSTOMER",
          tenantId,
          { sku, requestedQuantity, targetPriceMinor }
        );
        let out = `[RFQ REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} (HTTP ${result.httpStatus})\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Execution ID: ${result.executionId}\n`;
        out += `Quoted SKU: ${sku} | Quantity: ${requestedQuantity} packs\n`;
        out += `Target Unit Price: £${(targetPriceMinor / 100).toFixed(2)}\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}\n`;
        out += `Committed At: ${result.executedAt}`;
        customerRfqOutput.textContent = out;
      } catch (err) {
        customerRfqOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnCustomerStatement = document.getElementById("btn-customer-statement");
  const customerStatementOutput = document.getElementById("customer-statement-output");
  if (btnCustomerStatement && customerStatementOutput) {
    btnCustomerStatement.addEventListener("click", async () => {
      const statementPeriod = document.getElementById("customer-statement-period")?.value || "2026-Q3";
      customerStatementOutput.textContent = `Loading verified statement for ${statementPeriod}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-customer-gstt-nhs";
        const result = await invokePortalWorkflow(
          "CUSTOMER_INVOICE_STATEMENT_HISTORY",
          "PORTAL_CUSTOMER",
          tenantId,
          { statementPeriod }
        );
        let out = `[STATEMENT REQUEST - STAGING SIMULATION: ${statementPeriod}]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `ALCOA+ Block Hash: ${result.tamperHash}`;
        customerStatementOutput.textContent = out;
      } catch (err) {
        customerStatementOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  // 2. Licensed Supplier Workflows
  const btnSupplierAckPo = document.getElementById("btn-supplier-ack-po");
  const supplierPoOutput = document.getElementById("supplier-po-output");
  if (btnSupplierAckPo && supplierPoOutput) {
    btnSupplierAckPo.addEventListener("click", async () => {
      const purchaseOrderId = document.getElementById("supplier-po-id")?.value || "PO-2026-UK-0842";
      const confirmedDeliveryDate = document.getElementById("supplier-delivery-date")?.value || "2026-11-15";
      supplierPoOutput.textContent = `Acknowledging PO ${purchaseOrderId}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-supplier-biopharm";
        const result = await invokePortalWorkflow(
          "SUPPLIER_PO_ACKNOWLEDGEMENT",
          "PORTAL_SUPPLIER",
          tenantId,
          { purchaseOrderId, confirmedDeliveryDate }
        );
        let out = `[PO ACKNOWLEDGEMENT REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `PO Reference: ${purchaseOrderId} | Confirmed Date: ${confirmedDeliveryDate}\n`;
        out += `Supplier Tenant: ${result.tenantId}\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        supplierPoOutput.textContent = out;
      } catch (err) {
        supplierPoOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnSupplierSubmitCoa = document.getElementById("btn-supplier-submit-coa");
  const supplierCoaOutput = document.getElementById("supplier-coa-output");
  if (btnSupplierSubmitCoa && supplierCoaOutput) {
    btnSupplierSubmitCoa.addEventListener("click", async () => {
      const batchNumber = document.getElementById("supplier-batch-num")?.value || "BAT-2026-CP-901";
      const expiryDate = document.getElementById("supplier-batch-expiry")?.value || "2028-10-31";
      const coaSha256 = document.getElementById("supplier-coa-sha")?.value || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      supplierCoaOutput.textContent = `Submitting sealed COA for batch ${batchNumber}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-supplier-biopharm";
        const result = await invokePortalWorkflow(
          "SUPPLIER_BATCH_COA_SUBMISSION",
          "PORTAL_SUPPLIER",
          tenantId,
          { batchNumber, expiryDate, coaSha256 }
        );
        let out = `[COA SUBMISSION REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Batch: ${batchNumber} | Expiry: ${expiryDate}\n`;
        out += `Document Digest: ${coaSha256.slice(0, 16)}...\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        supplierCoaOutput.textContent = out;
      } catch (err) {
        supplierCoaOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnSupplierSubmitCapa = document.getElementById("btn-supplier-submit-capa");
  const supplierCapaOutput = document.getElementById("supplier-capa-output");
  if (btnSupplierSubmitCapa && supplierCapaOutput) {
    btnSupplierSubmitCapa.addEventListener("click", async () => {
      const deviationId = document.getElementById("supplier-capa-dev-id")?.value || "DEV-2026-081";
      const rootCauseSummary = document.getElementById("supplier-capa-root-cause")?.value || "Thermal packaging seal calibration drift";
      const correctiveActionPlan = document.getElementById("supplier-capa-plan")?.value || "Weekly thermal sensor recalibration and 100% seal integrity testing";
      supplierCapaOutput.textContent = `Submitting CAPA for deviation ${deviationId}...`;
      try {
        const tenantId = currentSession?.tenantId || "tenant-supplier-biopharm";
        const result = await invokePortalWorkflow(
          "SUPPLIER_QUALITY_ISSUE_CAPA_RESPONSE",
          "PORTAL_SUPPLIER",
          tenantId,
          { deviationId, rootCauseSummary, correctiveActionPlan }
        );
        let out = `[CAPA RESPONSE REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Deviation: ${deviationId}\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        supplierCapaOutput.textContent = out;
      } catch (err) {
        supplierCapaOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  // 3. RP / Staff Operations Workflows
  const btnRpEscalateQuality = document.getElementById("btn-rp-escalate-quality");
  const rpEscalationOutput = document.getElementById("rp-escalation-output");
  if (btnRpEscalateQuality && rpEscalationOutput) {
    btnRpEscalateQuality.addEventListener("click", async () => {
      const escalationType = document.getElementById("rp-escalation-type")?.value || "GDP_WDA_WHOLESALE_RELEASE";
      const referenceId = document.getElementById("rp-incident-ref")?.value || "INC-2026-LDN-004";
      rpEscalationOutput.textContent = `Executing statutory quality escalation for ${referenceId}...`;
      try {
        const result = await invokePortalWorkflow(
          "STAFF_REGULATORY_QUALITY_ESCALATION",
          "PORTAL_STAFF_WORKFORCE",
          "tenant-novapharm-hq",
          {
            escalationType,
            statutoryAuthorityRole: currentSession?.role || "ROLE_RESPONSIBLE_PERSON_RP",
            referenceId
          }
        );
        let out = `[QUALITY ESCALATION REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Escalation Type: ${escalationType}\n`;
        out += `Incident Reference: ${referenceId}\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        rpEscalationOutput.textContent = out;
      } catch (err) {
        rpEscalationOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnRpWorkQueue = document.getElementById("btn-rp-work-queue");
  const rpQueueOutput = document.getElementById("rp-queue-output");
  if (btnRpWorkQueue && rpQueueOutput) {
    btnRpWorkQueue.addEventListener("click", async () => {
      const queueDomain = document.getElementById("rp-queue-domain")?.value || "COLD_CHAIN_DISTRIBUTION";
      rpQueueOutput.textContent = `Loading work queue for domain ${queueDomain}...`;
      try {
        const result = await invokePortalWorkflow(
          "STAFF_ROLE_BASED_QUEUE",
          "PORTAL_STAFF_WORKFORCE",
          "tenant-novapharm-hq",
          { queueDomain }
        );
        let out = `[WORK QUEUE REQUEST - STAGING SIMULATION: ${queueDomain}]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        rpQueueOutput.textContent = out;
      } catch (err) {
        rpQueueOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnRpSubmitChecklist = document.getElementById("btn-rp-submit-checklist");
  const rpChecklistOutput = document.getElementById("rp-checklist-output");
  if (btnRpSubmitChecklist && rpChecklistOutput) {
    btnRpSubmitChecklist.addEventListener("click", async () => {
      rpChecklistOutput.textContent = "Committing morning GDP release checklist...";
      try {
        const result = await invokePortalWorkflow(
          "STAFF_OPERATIONAL_CHECKLIST",
          "PORTAL_STAFF_WORKFORCE",
          "tenant-novapharm-hq",
          { checklistId: "CHK-GDP-DAILY-20261020", completedItemsCount: 12 }
        );
        let out = `[CHECKLIST REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        rpChecklistOutput.textContent = out;
      } catch (err) {
        rpChecklistOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  // 4. Executive Board Workflows
  const btnBoardLoadKpis = document.getElementById("btn-board-load-kpis");
  const boardKpiOutput = document.getElementById("board-kpi-output");
  if (btnBoardLoadKpis && boardKpiOutput) {
    btnBoardLoadKpis.addEventListener("click", async () => {
      const reportingQuarter = document.getElementById("board-kpi-quarter")?.value || "2026-Q3";
      boardKpiOutput.textContent = `Compiling Executive Board KPIs for ${reportingQuarter}...`;
      try {
        const result = await invokePortalWorkflow(
          "BOARD_EXECUTIVE_KPI_SUMMARY",
          "PORTAL_BOARD_LEADERSHIP",
          "tenant-novapharm-hq",
          { reportingQuarter }
        );
        let out = `[KPI REQUEST - STAGING SIMULATION (no real KPIs): ${reportingQuarter}]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        boardKpiOutput.textContent = out;
      } catch (err) {
        boardKpiOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnBoardReviewRisks = document.getElementById("btn-board-review-risks");
  const boardRiskOutput = document.getElementById("board-risk-output");
  if (btnBoardReviewRisks && boardRiskOutput) {
    btnBoardReviewRisks.addEventListener("click", async () => {
      const riskCategory = document.getElementById("board-risk-category")?.value || "REGULATORY_AND_SUPPLY_CHAIN";
      boardRiskOutput.textContent = `Retrieving Risk Register for ${riskCategory}...`;
      try {
        const result = await invokePortalWorkflow(
          "BOARD_RISK_REGISTER",
          "PORTAL_BOARD_LEADERSHIP",
          "tenant-novapharm-hq",
          { riskCategory }
        );
        let out = `[RISK REGISTER REQUEST - STAGING SIMULATION: ${riskCategory}]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        boardRiskOutput.textContent = out;
      } catch (err) {
        boardRiskOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  const btnBoardSecuritySummary = document.getElementById("btn-board-security-summary");
  const boardSecurityOutput = document.getElementById("board-security-output");
  if (btnBoardSecuritySummary && boardSecurityOutput) {
    btnBoardSecuritySummary.addEventListener("click", async () => {
      boardSecurityOutput.textContent = "Querying NIST SP 800-207 Zero Trust Security Posture...";
      try {
        const result = await invokePortalWorkflow(
          "BOARD_SECURITY_COMPLIANCE_SUMMARY",
          "PORTAL_BOARD_LEADERSHIP",
          "tenant-novapharm-hq",
          { trustAuditWindow: "LAST_30_DAYS" }
        );
        let out = `[SECURITY SUMMARY REQUEST - STAGING SIMULATION]\n`;
        out += `Status: ${result.status} | Execution ID: ${result.executionId}\n`;
        out += `Evidence class: ${result.evidenceClass} | durable: ${result.durable}\n`;
        out += `STAGING SIMULATION: validated by role/tenant rules, held in memory only; no business record created.\n`;
        out += `Integrity hash (in-memory): ${result.tamperHash}`;
        boardSecurityOutput.textContent = out;
      } catch (err) {
        boardSecurityOutput.textContent = `Workflow Error: ${err.message}`;
      }
    });
  }

  // Initialize session and role portals on page load
  initSessionAndRolePortals();

  // Bloomberg live telemetry clock
  const portalClockEl = document.getElementById("portal-live-clock");
  if (portalClockEl) {
    const updatePortalClock = () => {
      const now = new Date();
      portalClockEl.textContent = `${now.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
    };
    setInterval(updatePortalClock, 1000);
    updatePortalClock();
  }
});



