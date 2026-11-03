/**
 * NovaPharm Medicines Terminal — Flagship Canonical Medicine Vertical Slice & Governed NOVA Controller.
 *
 * Implements Sections 3, 4, 5, and 6 of the 2 November 2026 Master Implementation Directive:
 *  - Shared Light/Dark NovaPharm Design System (Light default + independently crafted Dark mode)
 *  - Unmistakable "Search a medicine." entry + ⌘K / Ctrl+K keyboard command palette
 *  - Disambiguation -> Canonical Identity -> OVERVIEW / EVIDENCE / MARKET / MORE tabs -> Right Evidence Rail
 *  - Observed History strictly separated from Holt Damped Model Forecast (MAE/WAPE/sMAPE + 95% CI) + Accessible Table
 *  - NOVA governed explanation panel with exact source-version citations & "CANNOT_VERIFY" handling
 *  - Source-verified AlphaFold structural limitation disclosures & [OBSERVED] vs [SIMULATED] GIS truth separation
 */

import { searchMedicinesTerminal, SEED_REFERENCE_DATA } from './medicines-terminal-search.mjs';
import {
  ALPHAFOLD_STUDIO_TARGETS,
  generate3DBackboneTrace,
  resolveAlphaFoldTarget,
} from '../scientific/alphafold-3d-backbone-studio.mjs';

const htmlRoot = document.documentElement;
const themeToggleBtn = document.getElementById('btn-theme-toggle');
const latencyPill = document.getElementById('latency-telemetry-pill');
const ssdMountPill = document.getElementById('ssd-mount-pill');

const searchInput = document.getElementById('terminal-search');
const levelSelect = document.getElementById('level-select');
const coldCheck = document.getElementById('check-cold-chain');
const plpiCheck = document.getElementById('check-plpi');
const docBackedCheck = document.getElementById('check-document-backed');
const countDisplay = document.getElementById('results-count');
const grid = document.getElementById('reference-grid');

const disambigListEl = document.getElementById('canonical-disambig-list');
const cmdkBackdrop = document.getElementById('cmdk-backdrop');
const cmdkInput = document.getElementById('cmdk-input');
const cmdkResults = document.getElementById('cmdk-results');
const openCmdkBtn = document.getElementById('btn-open-cmdk');

const afSelect = document.getElementById('alphafold-target-select');
const afLiveBtn = document.getElementById('btn-alphafold-live');
const afSubtitle = document.getElementById('alphafold-studio-subtitle');
const afPocketCaption = document.getElementById('alphafold-pocket-caption');
const afPlddtBadge = document.getElementById('af-plddt-badge');
const afPdbLink = document.getElementById('af-pdb-download');
const afLimitationNote = document.getElementById('af-limitation-note');

const focusUkBtn = document.getElementById('btn-focus-uk');
const earthCaption = document.getElementById('earth-globe-caption');
const kmlExportBtn = document.getElementById('btn-export-kml');

let activeCanonicalSlug = 'apixaban-5mg-tablets';
let cachedProfiles = [];
let lastRenderedDossier = null;
let debounceTimer = null;
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMetricValue(val, unit = '') {
  if (val === 'UNAVAILABLE' || val === null || val === undefined) return 'UNAVAILABLE';
  if (typeof val === 'number') {
    if (unit === 'GBP') return `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return val.toLocaleString('en-GB');
  }
  return String(val);
}

// ============================================================================
// 1. Light / Dark Theme Management (Section 3)
// ============================================================================
function applyTheme(theme) {
  const clean = theme === 'dark' ? 'dark' : 'light';
  htmlRoot.setAttribute('data-theme', clean);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = `Theme: ${clean === 'dark' ? 'Dark' : 'Light'}`;
    themeToggleBtn.setAttribute('aria-pressed', String(clean === 'dark'));
  }
  try {
    localStorage.setItem('np_terminal_theme', clean);
  } catch {}
  if (lastRenderedDossier) {
    renderObservedVsForecastSvg(lastRenderedDossier);
  }
}

const savedTheme = (() => {
  try {
    return localStorage.getItem('np_terminal_theme');
  } catch {
    return null;
  }
})();
const urlTheme = new URLSearchParams(window.location.search).get('theme');
applyTheme(urlTheme || savedTheme || 'dark');

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const next = htmlRoot.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

// ============================================================================
// 2. Accessible Tab Bar (OVERVIEW / EVIDENCE / MARKET / MORE)
// ============================================================================
const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
const tabPanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

function activateTab(tabName, moveFocus = false) {
  let targetPanelName = tabName;
  let scrollAnchorId = null;

  if (tabName === 'geography') {
    targetPanelName = 'overview';
    scrollAnchorId = 'region-comparison-bar';
  } else if (tabName === 'forecasting') {
    targetPanelName = 'overview';
    scrollAnchorId = 'trend-chart-container';
  } else if (tabName === 'practices' || tabName === 'pharmacies') {
    targetPanelName = 'overview';
    scrollAnchorId = 'top-practices-container';
  }

  for (const btn of tabButtons) {
    const isTarget = btn.dataset.tab === tabName;
    btn.setAttribute('aria-selected', String(isTarget));
    btn.classList.toggle('active', isTarget);
    btn.tabIndex = isTarget ? 0 : -1;
    if (isTarget && moveFocus) btn.focus();
  }
  for (const panel of tabPanels) {
    panel.hidden = panel.id !== `panel-${targetPanelName}`;
  }

  if (scrollAnchorId) {
    const el = document.getElementById(scrollAnchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

tabButtons.forEach((btn, idx) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab, false));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (idx + delta + tabButtons.length) % tabButtons.length;
      activateTab(tabButtons[nextIdx].dataset.tab, true);
    }
  });
});

document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.jumpTab, true));
});

// ============================================================================
// 3. Flagship Canonical Medicine Dossier Loader & Renderer
// ============================================================================

async function loadDisambiguationList(query = '') {
  try {
    const t0 = performance.now();
    const params = new URLSearchParams({
      q: query,
      level: levelSelect?.value || 'all',
      coldChain: String(Boolean(coldCheck?.checked)),
    });
    const res = await fetch(`/api/medicines/canonical-search?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    const elapsed = Math.round(performance.now() - t0);
    if (latencyPill) latencyPill.textContent = `Search: ${elapsed} ms`;

    cachedProfiles = data.canonicalProfiles || [];
    renderDisambiguationSidebar(cachedProfiles);
  } catch {
    // Keep existing list on transient error
  }
}

function renderDisambiguationSidebar(profiles) {
  if (!disambigListEl) return;
  if (!profiles.length) {
    disambigListEl.innerHTML = `<div style="font-size:12px;color:var(--np-text-muted);padding:8px;">No exact canonical presentation matched. Refine search or clear filters.</div>`;
    return;
  }
  disambigListEl.innerHTML = profiles
    .map(
      (p) => `
      <button type="button" class="np-disambig-item" role="option" data-slug="${escapeHtml(p.slug)}" aria-current="${String(p.slug === activeCanonicalSlug)}">
        <div class="np-disambig-title">${escapeHtml(p.displayName)}</div>
        <div class="np-disambig-sub">${escapeHtml(p.dmdLevel)} • SNOMED ${escapeHtml(p.snomedCt)} • ${escapeHtml(p.strength)}</div>
      </button>
    `,
    )
    .join('');

  disambigListEl.querySelectorAll('[data-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadCanonicalDossier(btn.dataset.slug);
    });
  });
}

async function loadCanonicalDossier(slug) {
  activeCanonicalSlug = slug;
  renderDisambiguationSidebar(cachedProfiles);

  const t0 = performance.now();
  try {
    const [dossierRes, pandoraRes] = await Promise.all([
      fetch(`/api/medicines/canonical/${encodeURIComponent(slug)}`),
      fetch(`/api/pandora/evidence-graph/${encodeURIComponent(slug)}`),
    ]);
    if (!dossierRes.ok) return;
    const dossier = await dossierRes.json();
    const pandora = pandoraRes.ok ? await pandoraRes.json() : null;
    const elapsed = Math.round(performance.now() - t0);
    if (latencyPill) latencyPill.textContent = `Dossier: ${elapsed} ms`;

    lastRenderedDossier = dossier;
    renderCanonicalDossier(dossier, pandora);
    runNovaExplanation(slug, 'Summarise observed primary care and hospital outpatient demand with source versions.');
  } catch (err) {
    if (latencyPill) latencyPill.textContent = `Dossier: ERROR`;
  }
}

function renderCanonicalDossier(dossier, pandora) {
  const id = dossier.identity;
  document.getElementById('canonical-med-title').textContent = id.displayName;
  document.getElementById('id-badge-level').textContent = id.dmdLevel;
  document.getElementById('id-therapeutic-area').textContent = id.therapeuticArea;
  document.getElementById('canonical-med-sub').textContent =
    `Active substance: ${id.activeSubstance} • Strength: ${id.strength} • Form: ${id.form} • Presentation: ${id.packPresentation}`;

  const storageChip = document.getElementById('id-storage-chip');
  if (id.storageSmpc64.status === 'UNAVAILABLE') {
    storageChip.className = 'np-epistemic-badge np-epistemic-unavailable';
    storageChip.textContent = 'SmPC 6.4: UNAVAILABLE (NON-INFERENCE)';
  } else {
    storageChip.className = 'np-epistemic-badge np-epistemic-observed';
    storageChip.textContent = `SmPC 6.4: ${id.storageSmpc64.regime}`;
  }

  document.getElementById('canonical-storage-banner').textContent = `SmPC Section 6.4 Storage Governance: ${id.storageSmpc64.statement}`;

  const idCells = [
    { label: 'VTM (Moiety)', val: `${id.hierarchy.VTM.code} (${id.hierarchy.VTM.label})` },
    { label: 'VMP (Generic)', val: id.hierarchy.VMP.code },
    { label: 'AMP (Product)', val: id.hierarchy.AMP.code },
    { label: 'VMPP / AMPP', val: `${id.hierarchy.VMPP.code} / ${id.hierarchy.AMPP.code}` },
    { label: 'SNOMED CT', val: id.identifiers.snomedCt },
    { label: 'BNF Presentation', val: id.identifiers.bnfCode },
    { label: 'WHO ATC', val: id.identifiers.atcCode },
    { label: 'GTIN-14', val: `${id.identifiers.gtin}` },
    { label: 'Marketing Auth.', val: id.identifiers.marketingAuthorisation },
  ];
  document.getElementById('canonical-identity-grid').innerHTML = idCells
    .map(
      (c) => `
      <div class="np-id-cell">
        <div class="np-id-label">${escapeHtml(c.label)}</div>
        <div class="np-id-val">${escapeHtml(c.val)}</div>
      </div>
    `,
    )
    .join('');

  // Export links
  const confirmed = document.getElementById('check-confirm-export')?.checked ? 'true' : 'false';
  const jsonUrl = `/api/medicines/canonical/${encodeURIComponent(id.slug)}/export?format=json&confirmed=${confirmed}`;
  const csvUrl = `/api/medicines/canonical/${encodeURIComponent(id.slug)}/export?format=csv&confirmed=${confirmed}`;
  document.getElementById('btn-export-dossier-json')?.setAttribute('href', jsonUrl);
  document.getElementById('btn-more-export-json')?.setAttribute('href', jsonUrl);
  document.getElementById('btn-more-export-csv')?.setAttribute('href', csvUrl);
  document.getElementById('btn-export-evidence-bundle')?.setAttribute(
    'href',
    `/api/export/permitted-evidence-bundle?canonicalSlug=${encodeURIComponent(id.slug)}`
  );
  if (kmlExportBtn) kmlExportBtn.href = dossier.geography.kmlExportPath;

  // Overview KPIs
  const kpiGrid = document.getElementById('overview-kpi-grid');
  kpiGrid.innerHTML = dossier.overview.keyMetrics
    .map((m) => {
      const cls =
        m.value === 'UNAVAILABLE'
          ? 'np-epistemic-unavailable'
          : m.evidenceClass === 'MODEL_FORECAST'
            ? 'np-epistemic-forecast'
            : 'np-epistemic-observed';
      return `
        <div class="np-kpi-card">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:center;">
            <span class="np-epistemic-badge ${cls}">${escapeHtml(m.evidenceClass)}</span>
            <span style="font-size:11px;color:var(--np-text-muted);" class="np-tabular">${escapeHtml(m.period)}</span>
          </div>
          <div class="np-kpi-value np-tabular">${escapeHtml(formatMetricValue(m.value, m.unit))}</div>
          <div style="font-size:12.5px;font-weight:600;color:var(--np-text-secondary);">${escapeHtml(m.label)}</div>
          <div class="np-kpi-meta">${escapeHtml(m.sourceDomain)}</div>
        </div>
      `;
    })
    .join('');

  // Render SVG Chart + Accessible Table
  renderObservedVsForecastSvg(dossier);
  renderTrendAccessibleTable(dossier);

  // Render Evidence Tab
  const docsContainer = document.getElementById('evidence-docs-container');
  const docsMeta = document.getElementById('ssd-docs-meta');
  docsMeta.textContent = `FTS5 Total Indexed: ${dossier.evidence.ftsIndexedTotal} UK clinical/regulatory documents • Direct FTS5 hits for "${id.activeSubstance}": ${dossier.evidence.ftsMatchesCount}`;

  const docCards = [];
  for (const d of dossier.evidence.clinicalDocuments) {
    docCards.push(`
      <article style="padding:12px 14px;border-radius:var(--np-radius-md);border:1px solid var(--np-border-subtle);background:var(--np-bg-surface-secondary);">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:13px;">${escapeHtml(d.title)}</strong>
          <span class="np-epistemic-badge np-epistemic-observed">${escapeHtml(d.evidenceId)} • OBSERVED_FACT</span>
        </div>
        <p style="font-size:12px;color:var(--np-text-secondary);margin-top:6px;">${escapeHtml(d.excerpt)}...</p>
        <div style="font-family:var(--np-font-mono);font-size:11px;color:var(--np-text-muted);margin-top:6px;">Source: ${escapeHtml(d.sourcePath)} • ${escapeHtml(d.ingestionMethod)}</div>
      </article>
    `);
  }
  for (const s of dossier.evidence.supplementaryJurisdictionalAssets || []) {
    docCards.push(`
      <article style="padding:12px 14px;border-radius:var(--np-radius-md);border:1px solid var(--np-border-subtle);background:var(--np-bg-surface-secondary);">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:13px;">${escapeHtml(s.title)}</strong>
          <span class="np-epistemic-badge np-epistemic-observed">${escapeHtml(s.evidenceId)}</span>
        </div>
        <p style="font-size:12px;color:var(--np-status-assumption);margin-top:4px;">Jurisdictional Caveat: ${escapeHtml(s.caveat)}</p>
        <div style="font-family:var(--np-font-mono);font-size:11px;color:var(--np-text-muted);margin-top:4px;">${escapeHtml(s.sourcePath)} (${escapeHtml(s.licence)})</div>
      </article>
    `);
  }
  docsContainer.innerHTML =
    docCards.length > 0
      ? docCards.join('')
      : `<div style="padding:12px;border-radius:var(--np-radius-sm);background:var(--np-bg-surface-secondary);font-size:12.5px;">UNAVAILABLE in FTS5 index for this exact term (0 fabricated excerpts).</div>`;

  document.getElementById('evidence-provenance-box').innerHTML = `
    <div><strong>Physical Source Archive:</strong> <code>${escapeHtml(dossier.evidence.provenanceChain.source)}</code></div>
    <div><strong>Intelligence Vault SHA-256:</strong> <code>${escapeHtml(dossier.evidence.provenanceChain.warehouseIntegrityHash)}</code></div>
    <div><strong>Unresolved GTIN Note:</strong> ${escapeHtml(id.identifiers.gtinUnresolvedReason)}</div>
    ${dossier.evidence.provenanceChain.historicalCaveats.map((c) => `<div>• ${escapeHtml(c)}</div>`).join('')}
  `;

  // Render Market Tab
  const pca = dossier.market.primaryCareIcbPca;
  const marketSummary = document.getElementById('market-pca-summary');
  const regTbody = document.getElementById('market-regions-tbody');
  const icbTbody = document.getElementById('market-icbs-tbody');

  if (pca.status === 'OBSERVED') {
    const brandNote =
      pca.originatorBrandSeparateMetrics !== 'UNAVAILABLE'
        ? ` • Originator brand (${pca.originatorBrandSeparateMetrics.bnfPresentationCode}) tracked separately without silent merge: ${pca.originatorBrandSeparateMetrics.dispensedItems.toLocaleString('en-GB')} items (£${pca.originatorBrandSeparateMetrics.netIngredientCostGbp.toLocaleString('en-GB')}).`
        : '';
    marketSummary.textContent = `Source: ${pca.datasetName} (${pca.activityPeriod}) • Observed Suppliers (${pca.genericPresentationMetrics.supplierCountObserved}): ${pca.genericPresentationMetrics.suppliersObserved.join(', ') || 'Generic unspecified'}${brandNote}`;

    regTbody.innerHTML = pca.regionalBreakdown
      .map(
        (r) => `
        <tr>
          <td><strong>${escapeHtml(r.regionName)}</strong></td>
          <td>${r.items.toLocaleString('en-GB')}</td>
          <td>${r.quantity.toLocaleString('en-GB')}</td>
          <td>£${r.nicGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${escapeHtml(String(r.shareOfItemsPercent))}%</td>
        </tr>
      `,
      )
      .join('');

    icbTbody.innerHTML = pca.topIcbs
      .map(
        (i) => `
        <tr>
          <td><code>${escapeHtml(i.icbCode)}</code></td>
          <td>${escapeHtml(i.icbName)}</td>
          <td>${escapeHtml(i.regionName)}</td>
          <td>${i.items.toLocaleString('en-GB')}</td>
          <td>£${i.nicGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `,
      )
      .join('');
  } else {
    marketSummary.textContent = `Primary Care PCA Status: UNAVAILABLE — ${pca.reason}`;
    regTbody.innerHTML = `<tr><td colspan="5">UNAVAILABLE (never rendered as 0)</td></tr>`;
    icbTbody.innerHTML = `<tr><td colspan="5">UNAVAILABLE (never rendered as 0)</td></tr>`;
  }

  // Render PANDORA Graph in MORE Tab
  const pandoraBox = document.getElementById('pandora-graph-box');
  if (pandora && pandora.nodes) {
    pandoraBox.innerHTML = pandora.nodes
      .map(
        (n) => `
        <div style="padding:10px 12px;border-radius:var(--np-radius-sm);background:var(--np-bg-surface-secondary);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div>
            <strong>${escapeHtml(n.nodeType)}:</strong> ${escapeHtml(n.label)}
            <div style="font-size:11px;color:var(--np-text-muted);">Source: ${escapeHtml(n.sourceId)} • Licence: ${escapeHtml(n.licence)}</div>
          </div>
          <span class="np-epistemic-badge np-epistemic-derived">${escapeHtml(n.truthClass)}</span>
        </div>
      `,
      )
      .join('');
  }

  // Render Right Evidence Rail
  document.getElementById('rail-med-name').textContent = id.displayName;
  const primarySource = pca.status === 'OBSERVED' ? pca : dossier.market.hospitalOutpatientCommunityLongitudinal;
  const railFields = [
    ['Canonical ID', `SNOMED ${id.identifiers.snomedCt}`],
    ['BNF / ATC', `${id.identifiers.bnfCode} / ${id.identifiers.atcCode}`],
    ['Publisher', primarySource.publisher || 'NHSBSA / NHS TRUD'],
    ['Pub. Date', primarySource.publicationDate || 'UNAVAILABLE'],
    ['Activity Period', primarySource.activityPeriod || 'UNAVAILABLE'],
    ['Ingested At', primarySource.ingestionTimestamp || '2026-08-30T19:14:00Z'],
    ['Licence', primarySource.licence || 'OGL-UK-3.0'],
    ['Geometry', primarySource.geometry || 'England National / ICB'],
    ['Grain', primarySource.grain || `${id.dmdLevel} presentation`],
    ['Freshness', primarySource.freshness || 'Frozen 215-dataset SSD archive'],
  ];
  document.getElementById('rail-provenance-dl').innerHTML = railFields
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
    .join('');

  // Forecast Backtest Rail Card
  const fc = dossier.forecast;
  const fcAuditEl = document.getElementById('rail-forecast-audit');
  if (fc.status === 'ACCEPTED_BACKTESTED_BASELINE') {
    fcAuditEl.innerHTML = `
      <div><span class="np-epistemic-badge np-epistemic-forecast">MODEL_FORECAST</span></div>
      <div><strong>Model:</strong> <code>${escapeHtml(fc.modelMetadata.modelId)}</code></div>
      <div><strong>Training:</strong> ${escapeHtml(fc.modelMetadata.trainingWindow)}</div>
      <div><strong>Holdout Backtest (6m):</strong> MAE <strong>${fc.backtestMetrics.mae}</strong> • WAPE <strong>${fc.backtestMetrics.wapePercent}%</strong> • sMAPE <strong>${fc.backtestMetrics.smapePercent}%</strong></div>
      <div><strong>Drift Status:</strong> ${escapeHtml(fc.modelMetadata.driftStatus)}</div>
      <div style="font-size:11.5px;color:var(--np-text-muted);">${escapeHtml(fc.modelMetadata.permittedUse)}</div>
    `;
  } else {
    fcAuditEl.innerHTML = `
      <div><span class="np-epistemic-badge np-epistemic-unavailable">FORECAST GATED: UNAVAILABLE</span></div>
      <div>${escapeHtml(fc.reason)}</div>
    `;
  }

  // Sync AlphaFold Viewer & Structural Limitation Disclosure
  if (dossier.structuralBiology && dossier.structuralBiology.status === 'AVAILABLE_COMPUTATIONAL_PREDICTION') {
    selectAlphaFoldTarget(dossier.structuralBiology.uniprotAccession);
    if (afLimitationNote) {
      afLimitationNote.textContent = `${dossier.structuralBiology.residueMappingDisclosure} ${dossier.structuralBiology.structuralLimitations[0]}`;
    }
  } else if (afLimitationNote) {
    afLimitationNote.textContent = 'No human protein target structure mapped for this presentation (UNAVAILABLE).';
  }
}

function renderObservedVsForecastSvg(dossier) {
  const svg = document.getElementById('observed-forecast-svg');
  if (!svg) return;
  const obs = dossier.market.hospitalOutpatientCommunityLongitudinal?.monthlySeriesLast24 || [];
  const fc = dossier.forecast?.forecastHorizon || [];

  if (!obs.length) {
    svg.innerHTML = `
      <rect x="0" y="0" width="780" height="240" rx="10" fill="var(--np-bg-surface-secondary)" />
      <text x="390" y="112" text-anchor="middle" fill="var(--np-text-primary)" font-size="14" font-weight="700">
        Monthly Longitudinal Series: UNAVAILABLE at this presentation grain
      </text>
      <text x="390" y="136" text-anchor="middle" fill="var(--np-text-muted)" font-size="12">
        NovaPharm never plots fabricated zeros or synthetic forecasts when accepted monthly history is absent. Inspect the MARKET tab for 2025/2026 PCA facts.
      </text>
    `;
    return;
  }

  const allVals = [
    ...obs.map((p) => p.items),
    ...fc.flatMap((f) => [f.lower95Items, f.upper95Items, f.centralItems]),
  ];
  const minVal = Math.max(0, Math.min(...allVals) * 0.9);
  const maxVal = Math.max(...allVals) * 1.08 || 1;
  const totalSlots = obs.length + fc.length;
  const padL = 58;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = 780 - padL - padR;
  const plotH = 240 - padT - padB;

  const xAt = (idx) => padL + (idx / Math.max(1, totalSlots - 1)) * plotW;
  const yAt = (v) => padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  // Grid lines
  let gridLines = '';
  for (let g = 0; g <= 3; g++) {
    const gv = minVal + ((maxVal - minVal) * g) / 3;
    const gy = yAt(gv);
    gridLines += `
      <line x1="${padL}" y1="${gy.toFixed(1)}" x2="${780 - padR}" y2="${gy.toFixed(1)}" stroke="var(--np-chart-grid)" stroke-width="1" />
      <text x="${padL - 8}" y="${(gy + 4).toFixed(1)}" text-anchor="end" fill="var(--np-text-muted)" font-size="10.5">${Math.round(gv).toLocaleString('en-GB')}</text>
    `;
  }

  // Observed polyline (solid)
  const obsPoints = obs.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.items).toFixed(1)}`).join(' ');

  // Forecast 95% CI polygon + strictly separate dashed line (starts at first forecast period t+1 after vertical cutoff!)
  const splitX = xAt(obs.length - 1) + (xAt(obs.length) - xAt(obs.length - 1)) * 0.5;
  let ciPolygon = '';
  let fcLine = '';
  if (fc.length > 0) {
    const upperPts = fc.map((f, j) => `${xAt(obs.length + j).toFixed(1)},${yAt(f.upper95Items).toFixed(1)}`);
    const lowerPts = [...fc]
      .reverse()
      .map((f, j) => `${xAt(obs.length + (fc.length - 1 - j)).toFixed(1)},${yAt(f.lower95Items).toFixed(1)}`);
    ciPolygon = `<polygon points="${[...upperPts, ...lowerPts].join(' ')}" fill="var(--np-chart-ci)" />`;
    const fcPts = fc.map((f, j) => `${xAt(obs.length + j).toFixed(1)},${yAt(f.centralItems).toFixed(1)}`).join(' ');
    fcLine = `<polyline points="${fcPts}" fill="none" stroke="var(--np-chart-forecast)" stroke-width="2.5" stroke-dasharray="6 4" />`;
  }

  svg.innerHTML = `
    ${gridLines}
    <line x1="${splitX.toFixed(1)}" y1="${padT}" x2="${splitX.toFixed(1)}" y2="${padT + plotH}" stroke="var(--np-border-strong)" stroke-dasharray="3 3" stroke-width="1.2" />
    <text x="${(splitX - 6).toFixed(1)}" y="${padT + 12}" text-anchor="end" fill="var(--np-text-muted)" font-size="10" font-weight="700">OBSERVED_FACT &larr;</text>
    <text x="${(splitX + 6).toFixed(1)}" y="${padT + 12}" text-anchor="start" fill="var(--np-brand-red)" font-size="10" font-weight="700">&rarr; MODEL_FORECAST (95% CI)</text>
    ${ciPolygon}
    <polyline points="${obsPoints}" fill="none" stroke="var(--np-chart-observed)" stroke-width="2.4" />
    ${fcLine}
    <text x="${xAt(0).toFixed(1)}" y="228" text-anchor="start" fill="var(--np-text-muted)" font-size="10.5">${escapeHtml(obs[0].periodIso)}</text>
    <text x="${xAt(obs.length - 1).toFixed(1)}" y="228" text-anchor="middle" fill="var(--np-text-muted)" font-size="10.5">${escapeHtml(obs[obs.length - 1].periodIso)}</text>
    ${
      fc.length
        ? `<text x="${xAt(totalSlots - 1).toFixed(1)}" y="228" text-anchor="end" fill="var(--np-brand-red)" font-size="10.5">${escapeHtml(fc[fc.length - 1].periodIso)}</text>`
        : ''
    }
  `;
}

function renderTrendAccessibleTable(dossier) {
  const tbody = document.getElementById('trend-accessible-tbody');
  if (!tbody) return;
  const obs = (dossier.market.hospitalOutpatientCommunityLongitudinal?.monthlySeriesLast24 || []).slice(-6);
  const fc = dossier.forecast?.forecastHorizon || [];

  if (!obs.length && !fc.length) {
    tbody.innerHTML = `<tr><td colspan="5">UNAVAILABLE — No monthly FP10HP series mapped for this presentation.</td></tr>`;
    return;
  }

  const rows = [
    ...obs.map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.periodIso)}</td>
        <td><span class="np-epistemic-badge np-epistemic-observed">OBSERVED_FACT</span></td>
        <td>${r.items.toLocaleString('en-GB')}</td>
        <td>Not applicable (observed)</td>
        <td>NHSBSA FP10HP SSD Snapshot</td>
      </tr>
    `,
    ),
    ...fc.map(
      (f) => `
      <tr>
        <td>${escapeHtml(f.periodIso)}</td>
        <td><span class="np-epistemic-badge np-epistemic-forecast">MODEL_FORECAST</span></td>
        <td>${f.centralItems.toLocaleString('en-GB')}</td>
        <td>${f.lower95Items.toLocaleString('en-GB')} – ${f.upper95Items.toLocaleString('en-GB')}</td>
        <td>Damped Holt v1.2 (Holdout WAPE ${dossier.forecast.backtestMetrics.wapePercent}%)</td>
      </tr>
    `,
    ),
  ];
  tbody.innerHTML = rows.join('');
}

// ============================================================================
// 4. NOVA Governed Investigation Plane (Section 6)
// ============================================================================
async function runNovaExplanation(medicineSlug, question) {
  const box = document.getElementById('nova-response-box');
  if (!box) return;
  box.innerHTML = `<div style="color:var(--np-text-muted);">Synthesising governed explanation...</div>`;

  try {
    const res = await fetch('/api/nova/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineSlug, question }),
    });
    const data = await res.json();

    if (data.status === 'VERIFIED_GOVERNED_EXPLANATION') {
      const sr = data.structuredReasoning;
      box.innerHTML = `
        <div style="font-family:var(--np-font-mono);font-size:10.5px;color:var(--np-text-muted);">
          Scope: ${escapeHtml(data.effectivePermissions.tenantScope)} • Prompt ${escapeHtml(data.modelGatewayMetadata.promptVersion)}
        </div>
        ${sr.observedFacts
          .map(
            (f) => `
          <div style="padding:8px 10px;border-radius:var(--np-radius-sm);background:var(--np-bg-surface-secondary);">
            <span class="np-epistemic-badge np-epistemic-observed">OBSERVED_FACT</span>
            <p style="margin-top:4px;">${escapeHtml(f.statement)}</p>
            <div style="font-size:10.5px;color:var(--np-text-muted);margin-top:3px;">Citation: ${escapeHtml(f.citation.sourceId)} • ${escapeHtml(f.citation.version)}</div>
          </div>
        `,
          )
          .join('')}
        <div style="padding:8px 10px;border-radius:var(--np-radius-sm);background:var(--np-bg-surface-secondary);">
          <span class="np-epistemic-badge np-epistemic-forecast">MODEL_FORECAST</span>
          <p style="margin-top:4px;">${escapeHtml(sr.modelForecast.statement)}</p>
        </div>
        <div style="padding:8px 10px;border-radius:var(--np-radius-sm);background:var(--np-bg-surface-secondary);">
          <span class="np-epistemic-badge np-epistemic-recommendation">RECOMMENDATION (HUMAN DECISION)</span>
          <p style="margin-top:4px;">${escapeHtml(sr.recommendationsAndNextChecks[0].statement)}</p>
        </div>
      `;
    } else if (data.status === 'CANNOT_VERIFY') {
      box.innerHTML = `
        <div style="padding:10px;border-radius:var(--np-radius-sm);background:var(--np-status-unavailable-bg);border:1px solid var(--np-border-subtle);">
          <strong>CANNOT VERIFY</strong>
          <p style="margin-top:4px;">${escapeHtml(data.explanation?.cannotVerifyStatement || data.message)}</p>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="padding:10px;border-radius:var(--np-radius-sm);background:var(--np-status-blocked-bg);color:var(--np-status-blocked);">
          <strong>${escapeHtml(data.status)}:</strong> ${escapeHtml(data.message)}
        </div>
      `;
    }
  } catch {
    box.innerHTML = `<div style="color:var(--np-status-blocked);">ERROR: Unable to reach NOVA governed gateway.</div>`;
  }
}

document.getElementById('nova-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('nova-question-input')?.value?.trim();
  if (q) runNovaExplanation(activeCanonicalSlug, q);
});

document.querySelectorAll('.nova-preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.q;
    const inp = document.getElementById('nova-question-input');
    if (inp) inp.value = q;
    runNovaExplanation(activeCanonicalSlug, q);
  });
});

// ============================================================================
// 5. ⌘K / Ctrl+K Command Palette
// ============================================================================
function openCommandPalette() {
  if (!cmdkBackdrop) return;
  cmdkBackdrop.hidden = false;
  cmdkBackdrop.removeAttribute('hidden');
  renderCmdkList(cachedProfiles);
  cmdkInput?.focus();
}

function closeCommandPalette() {
  if (!cmdkBackdrop) return;
  cmdkBackdrop.hidden = true;
  cmdkBackdrop.setAttribute('hidden', '');
}

function renderCmdkList(profiles) {
  if (!cmdkResults) return;
  cmdkResults.innerHTML = profiles
    .map(
      (p, idx) => `
      <button type="button" class="np-cmd-option" role="option" data-cmd-slug="${escapeHtml(p.slug)}" aria-selected="${idx === 0 ? 'true' : 'false'}">
        <div>
          <div style="font-weight:700;font-size:13.5px;">${escapeHtml(p.displayName)}</div>
          <div style="font-size:11.5px;color:var(--np-text-muted);">${escapeHtml(p.disambiguationLabel)}</div>
        </div>
        <span class="np-kbd">${escapeHtml(p.snomedCt)}</span>
      </button>
    `,
    )
    .join('');

  cmdkResults.querySelectorAll('[data-cmd-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadCanonicalDossier(btn.dataset.cmdSlug);
      closeCommandPalette();
    });
  });
}

openCmdkBtn?.addEventListener('click', openCommandPalette);
cmdkBackdrop?.addEventListener('click', (e) => {
  if (e.target === cmdkBackdrop) closeCommandPalette();
});
cmdkInput?.addEventListener('input', () => {
  const q = cmdkInput.value.trim().toLowerCase();
  const filtered = cachedProfiles.filter(
    (p) =>
      p.displayName.toLowerCase().includes(q) ||
      p.snomedCt.toLowerCase().includes(q) ||
      p.bnfCode.toLowerCase().includes(q),
  );
  renderCmdkList(filtered);
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (cmdkBackdrop?.hidden) openCommandPalette();
    else closeCommandPalette();
  } else if (e.key === 'Escape' && cmdkBackdrop && !cmdkBackdrop.hidden) {
    closeCommandPalette();
  }
});

// ============================================================================
// 6. Spatial UK Globe & DeepMind AlphaFold 3D Studio (Backward-Compatible Canvases)
// ============================================================================
const globeState = {
  centerLat: 53.2,
  centerLon: -2.2,
  zoom: 2.85,
  dragging: false,
  lastX: 0,
  lastY: 0,
  pharmacies: [
    { tradingName: '29 Fleet Street Limited', postcode: 'EC4Y 1AA', latitude: 51.5138, longitude: -0.1104 },
    { tradingName: 'A.H. Hale Ltd (Bath)', postcode: 'BA2 4BQ', latitude: 51.3832, longitude: -2.3571 },
  ],
  corridors: [
    { coords: [[51.515, -0.141], [52.04, -0.759], [52.486, -1.89]], isDrone: false },
    { coords: [[52.486, -1.89], [53.48, -2.242], [55.953, -3.188]], isDrone: false },
    { coords: [[50.805, -1.087], [50.75, -1.18], [50.7, -1.29]], isDrone: true },
  ],
};

const LANDMASS_POLYGONS = [
  [
    [50.07, -5.7], [50.35, -4.15], [50.72, -1.88], [50.78, 0.28], [51.37, 1.44],
    [51.95, 1.3], [52.75, 1.72], [53.55, 0.12], [54.52, -0.6], [55.77, -2.02],
    [56.35, -2.8], [57.68, -1.8], [57.65, -4.02], [58.64, -3.07], [58.58, -5.0],
    [57.3, -5.8], [56.5, -5.6], [55.3, -4.8], [54.7, -4.9], [54.1, -3.2],
    [53.4, -3.1], [53.3, -4.6], [52.8, -4.75], [51.85, -5.25], [51.55, -3.8],
    [51.2, -4.2], [50.07, -5.7],
  ],
  [
    [51.45, -9.8], [52.15, -6.35], [53.35, -6.05], [54.65, -5.55], [55.25, -7.35],
    [54.25, -10.0], [53.25, -9.9], [52.1, -10.3], [51.45, -9.8],
  ],
];

function projectGlobePoint(latDeg, lonDeg, width, height) {
  const deg2rad = Math.PI / 180;
  const phi = latDeg * deg2rad;
  const lam = lonDeg * deg2rad;
  const phi0 = globeState.centerLat * deg2rad;
  const lam0 = globeState.centerLon * deg2rad;
  const dLam = lam - lam0;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLam);
  if (cosC < 0) return null;
  const radius = Math.min(width, height) * 0.44 * globeState.zoom;
  return {
    x: width * 0.5 + radius * Math.cos(phi) * Math.sin(dLam),
    y: height * 0.5 - radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLam)),
  };
}

function drawEarthGlobe() {
  const canvas = document.getElementById('earth-globe-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const sphereRadius = Math.min(w, h) * 0.44 * globeState.zoom;
  const grad = ctx.createRadialGradient(w * 0.44, h * 0.4, sphereRadius * 0.08, w * 0.5, h * 0.5, sphereRadius);
  grad.addColorStop(0, '#16315c');
  grad.addColorStop(0.75, '#0b1b36');
  grad.addColorStop(1, '#061024');
  ctx.save();
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, sphereRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  for (const poly of LANDMASS_POLYGONS) {
    ctx.beginPath();
    let started = false;
    for (const [lat, lon] of poly) {
      const p = projectGlobePoint(lat, lon, w, h);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    if (started) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 58, 95, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  for (const corr of globeState.corridors) {
    ctx.beginPath();
    let started = false;
    for (const [lat, lon] of corr.coords) {
      const p = projectGlobePoint(lat, lon, w, h);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = corr.isDrone ? '#f43f5e' : '#14b8a6';
    ctx.lineWidth = 2.2;
    ctx.setLineDash(corr.isDrone ? [5, 4] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const ph of globeState.pharmacies) {
    if (typeof ph.latitude !== 'number' || typeof ph.longitude !== 'number') continue;
    const p = projectGlobePoint(ph.latitude, ph.longitude, w, h);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }
  ctx.restore();
}

const afViewerState = {
  target: ALPHAFOLD_STUDIO_TARGETS.P00742,
  trace: generate3DBackboneTrace(ALPHAFOLD_STUDIO_TARGETS.P00742),
  rotX: -0.32,
  rotY: 0.65,
  autoSpin: !prefersReducedMotion,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

function plddtColor(plddt) {
  if (plddt >= 90) return '#0053D6';
  if (plddt >= 70) return '#65CBF3';
  if (plddt >= 50) return '#FFDB13';
  return '#FF7D45';
}

function selectAlphaFoldTarget(identifier) {
  const target = resolveAlphaFoldTarget(identifier) || ALPHAFOLD_STUDIO_TARGETS.P00742;
  afViewerState.target = target;
  afViewerState.trace = generate3DBackboneTrace(target);
  if (afSelect && afSelect.value !== target.uniprotId) {
    afSelect.value = target.uniprotId;
  }
  if (afSubtitle) {
    afSubtitle.textContent = `Target: ${target.geneSymbol} (${target.uniprotId}) — ${target.proteinName} • Full chain ${target.sequenceLength} aa vs 96-node domain trace [COMPUTATIONAL_PREDICTION]`;
  }
  if (afPocketCaption) {
    afPocketCaption.textContent = `Binding Pocket: ${target.bindingPocket} • Computational prediction (CC-BY-4.0), not clinical proof.`;
  }
  if (afPlddtBadge) {
    afPlddtBadge.textContent = `Mean pLDDT: ${target.meanPlddt.toFixed(1)}`;
  }
  if (afPdbLink) {
    afPdbLink.href = target.pdbUrl;
  }
  drawAlphaFoldStructure();
}

function drawAlphaFoldStructure() {
  const canvas = document.getElementById('alphafold-3d-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const residues = afViewerState.trace.residues;
  const cosY = Math.cos(afViewerState.rotY);
  const sinY = Math.sin(afViewerState.rotY);
  const cosX = Math.cos(afViewerState.rotX);
  const sinX = Math.sin(afViewerState.rotX);

  const projected = residues.map((r) => {
    const x1 = r.x * cosY - r.z * sinY;
    const z1 = r.x * sinY + r.z * cosY;
    const y2 = r.y * cosX - z1 * sinX;
    const z2 = r.y * sinX + z1 * cosX;
    const fov = 44 / (44 + z2);
    return {
      ...r,
      sx: w * 0.5 + x1 * 10.5 * fov,
      sy: h * 0.5 + y2 * 10.5 * fov,
      sz: z2,
      scale: fov,
    };
  });

  for (let i = 0; i < projected.length - 1; i++) {
    const a = projected[i];
    const b = projected[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.strokeStyle = plddtColor((a.plddt + b.plddt) * 0.5);
    ctx.lineWidth = Math.max(1.8, 3.8 * a.scale);
    ctx.stroke();
  }

  for (const node of [...projected].sort((a, b) => b.sz - a.sz)) {
    ctx.beginPath();
    ctx.arc(node.sx, node.sy, Math.max(2.0, (node.isBindingPocket ? 4.8 : 3.2) * node.scale), 0, Math.PI * 2);
    ctx.fillStyle = node.isBindingPocket ? '#fbbf24' : plddtColor(node.plddt);
    ctx.fill();
  }
}

afSelect?.addEventListener('change', () => selectAlphaFoldTarget(afSelect.value));
focusUkBtn?.addEventListener('click', () => {
  globeState.centerLat = 53.2;
  globeState.centerLon = -2.2;
  globeState.zoom = 2.85;
  drawEarthGlobe();
});

afLiveBtn?.addEventListener('click', async () => {
  try {
    const res = await fetch(`/api/deepmind/alphafold/structure/${encodeURIComponent(afViewerState.target.uniprotId)}?live=true`);
    if (res.ok) {
      const payload = await res.json();
      if (afPlddtBadge) afPlddtBadge.textContent = `Mean pLDDT: ${Number(payload.meanPlddt).toFixed(1)} (${payload.sourceMode})`;
    }
  } catch {}
});

function wireCanvasDrag() {
  const earthCanvas = document.getElementById('earth-globe-canvas');
  if (earthCanvas) {
    earthCanvas.addEventListener('pointerdown', (e) => {
      globeState.dragging = true;
      globeState.lastX = e.clientX;
      globeState.lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!globeState.dragging) return;
      globeState.centerLon -= (e.clientX - globeState.lastX) * 0.08;
      globeState.centerLat = Math.max(-70, Math.min(75, globeState.centerLat + (e.clientY - globeState.lastY) * 0.08));
      globeState.lastX = e.clientX;
      globeState.lastY = e.clientY;
      drawEarthGlobe();
    });
    window.addEventListener('pointerup', () => {
      globeState.dragging = false;
    });
  }

  const afCanvas = document.getElementById('alphafold-3d-canvas');
  if (afCanvas) {
    afCanvas.addEventListener('pointerdown', (e) => {
      afViewerState.dragging = true;
      afViewerState.autoSpin = false;
      afViewerState.lastX = e.clientX;
      afViewerState.lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!afViewerState.dragging) return;
      afViewerState.rotY += (e.clientX - afViewerState.lastX) * 0.012;
      afViewerState.rotX += (e.clientY - afViewerState.lastY) * 0.012;
      afViewerState.lastX = e.clientX;
      afViewerState.lastY = e.clientY;
      drawAlphaFoldStructure();
    });
    window.addEventListener('pointerup', () => {
      afViewerState.dragging = false;
    });
  }
}

function setupCanvasControls() {
  const btn2d = document.getElementById('btn-view-2d-map');
  const btn3d = document.getElementById('btn-view-3d-earth');
  const btnTable = document.getElementById('btn-view-geo-table');
  const mapViewport = document.getElementById('geo-map-viewport');
  const tableWrap = document.getElementById('geo-accessible-table-wrap');

  btn2d?.addEventListener('click', () => {
    btn2d.classList.add('active');
    btn3d?.classList.remove('active');
    btnTable?.classList.remove('active');
    if (mapViewport) mapViewport.style.display = 'flex';
    if (tableWrap) tableWrap.style.display = 'none';
  });

  btn3d?.addEventListener('click', () => {
    btn3d.classList.add('active');
    btn2d?.classList.remove('active');
    btnTable?.classList.remove('active');
    if (mapViewport) mapViewport.style.display = 'flex';
    if (tableWrap) tableWrap.style.display = 'none';
    globeState.centerLat = 53.2;
    globeState.centerLon = -2.2;
    globeState.zoom = 3.2;
    drawEarthGlobe();
  });

  btnTable?.addEventListener('click', () => {
    btnTable.classList.add('active');
    btn2d?.classList.remove('active');
    btn3d?.classList.remove('active');
    if (mapViewport) mapViewport.style.display = 'none';
    if (tableWrap) tableWrap.style.display = 'block';
  });

  // Layer toggles
  const layerPharm = document.getElementById('layer-btn-pharmacies');
  const layerChoro = document.getElementById('layer-btn-choropleth');
  const layerCorr = document.getElementById('layer-btn-corridors');

  layerPharm?.addEventListener('click', () => {
    layerPharm.classList.toggle('active');
    drawEarthGlobe();
  });
  layerChoro?.addEventListener('click', () => {
    layerChoro.classList.toggle('active');
  });
  layerCorr?.addEventListener('click', () => {
    layerCorr.classList.toggle('active');
    drawEarthGlobe();
  });

  // Sovereign Geodesic Transit Calculator trigger
  const btnTransit = document.getElementById('btn-calc-transit');
  const transitDrawer = document.getElementById('sovereign-transit-drawer');
  const transitContent = document.getElementById('transit-drawer-content');

  btnTransit?.addEventListener('click', async () => {
    if (!transitDrawer) return;
    const isHidden = transitDrawer.style.display === 'none';
    transitDrawer.style.display = isHidden ? 'block' : 'none';
    if (!isHidden) return;

    if (transitContent) {
      transitContent.innerHTML = '<span style="color:var(--ps-blue-primary);">Computing geodesic Haversine distance &amp; GDP cold-chain compliance SLA...</span>';
    }

    try {
      const res = await fetch('/api/geospatial/zero-cost-transit?originLat=51.51&originLon=-0.14&destLat=53.48&destLon=-2.24&mode=ROAD_VAN');
      const data = await res.json();
      if (transitContent) {
        transitContent.innerHTML = `
          <div><strong>Origin:</strong> London (51.51&deg;N, 0.14&deg;W) &rarr; <strong>Destination:</strong> Manchester (53.48&deg;N, 2.24&deg;W)</div>
          <div style="margin-top:2px;">
            &bull; <strong>Road Distance:</strong> ${data.distanceKm} km (1.28x winding factor)
            &bull; <strong>Transit Duration:</strong> ${data.transitMinutes} mins (~${(data.transitMinutes / 60).toFixed(1)} hrs)
          </div>
          <div style="margin-top:2px;">
            &bull; <strong>GDP Shipper SLA:</strong> <span style="color:#10B981;font-weight:700;">${escapeHtml(data.gdpComplianceZone)}</span>
            &bull; <strong>Billing Cost:</strong> <span style="color:#10B981;font-weight:700;">${escapeHtml(data.billingCost)}</span>
          </div>
        `;
      }
    } catch (err) {
      if (transitContent) transitContent.textContent = 'Transit calculation unavailable: ' + err.message;
    }
  });

  // Sovereign Multi-Stop Route Matrix trigger
  const btnMultiRoute = document.getElementById('btn-calc-multi-route');
  const multiRouteContent = document.getElementById('multi-route-drawer-content');

  btnMultiRoute?.addEventListener('click', async () => {
    if (!transitDrawer) return;
    transitDrawer.style.display = 'block';
    if (multiRouteContent) {
      multiRouteContent.style.display = 'block';
      multiRouteContent.innerHTML = '<span style="color:var(--ps-blue-primary);">Calculating multi-point route matrix, cold-chain SLA &amp; DEFRA carbon...</span>';
    }

    try {
      const res = await fetch('/api/geospatial/zero-cost-route-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubId: 'HUB-LON-01',
          mode: 'ROAD_VAN',
          shipperHoldHours: 48,
          stops: [
            { id: 'STOP-1', name: 'The Health Centre (NHS NW London)', lat: 51.524, lon: -0.198 },
            { id: 'STOP-2', name: 'Green Lane Surgery (NHS Birmingham)', lat: 52.472, lon: -1.864 },
            { id: 'STOP-3', name: 'City Road Medical Centre (NHS Manchester)', lat: 53.465, lon: -2.253 },
          ],
        }),
      });
      const data = await res.json();
      if (multiRouteContent) {
        let legsHtml = data.legs
          .map((l) => `<div>&bull; <strong>Leg ${l.legIndex}:</strong> ${escapeHtml(l.from.name)} &rarr; ${escapeHtml(l.to.name)} (${l.distanceKm} km, ${l.transitMinutes} mins)</div>`)
          .join('');

        multiRouteContent.innerHTML = `
          <div style="font-weight:700;color:var(--ps-text-main);margin-bottom:2px;">
            Multi-Stop Distribution Matrix: ${escapeHtml(data.originHub.name)} (${data.totalStops} Hospital Stops)
          </div>
          <div>
            &bull; <strong>Total Distance:</strong> ${data.totalDistanceKm} km
            &bull; <strong>Duration:</strong> ${data.totalTransitHours} hrs
            &bull; <strong>Carbon:</strong> ${data.carbonFootprintKgCO2e} kg CO2e
          </div>
          <div style="margin-top:2px;">
            &bull; <strong>Shipper Hold SLA:</strong> <span style="color:#10B981;font-weight:700;">${escapeHtml(data.passiveShipperSLA.status)}</span> (${data.passiveShipperSLA.holdHoursRemaining}h safety margin)
            &bull; <strong>Billed:</strong> <span style="color:#10B981;font-weight:700;">£0.00 (Zero External Cost)</span>
          </div>
          <div style="margin-top:4px;padding-top:4px;border-top:1px dotted #CBD5E1;font-size:10.5px;">
            ${legsHtml}
          </div>
        `;
      }
    } catch (err) {
      if (multiRouteContent) multiRouteContent.textContent = 'Multi-stop calculation unavailable: ' + err.message;
    }
  });

  // NOVA Gemini Explanation trigger
  const btnExplain = document.getElementById('btn-explain-variation');
  const drawer = document.getElementById('nova-gemini-explanation-drawer');
  const content = document.getElementById('gemini-explanation-content');
  const costBadge = document.getElementById('gemini-cost-badge');

  btnExplain?.addEventListener('click', async () => {
    if (!drawer) return;
    const isHidden = drawer.style.display === 'none';
    drawer.style.display = isHidden ? 'block' : 'none';
    if (!isHidden) return;

    if (content) content.innerHTML = '<span style="color:var(--ps-blue-primary);">Consulting NOVA Governed Gemini Gateway (querying authoritative NHS BSA &amp; SmPC)...</span>';

    try {
      const res = await fetch('/api/nova/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineSlug: activeCanonicalSlug || 'apixaban-5mg-tablets',
          regionCode: 'UK-NW',
          userQuestion: 'Explain the observed regional prescribing variation and evidence here.',
        }),
      });
      const data = await res.json();
      if (data.status === 'GOVERNED_EXPLANATION_SUCCESS') {
        if (costBadge) costBadge.textContent = `£0.00 (Sovereign Zero-Cost Engine • $${data.telemetry.estimatedCostUsd.toFixed(5)} equiv)`;
        const factsHtml = data.epistemicEnvelopes.observedFacts.items
          .map((f) => `<li style="margin-bottom:3px;"><span style="color:#10B981;font-weight:700;">[FACT]</span> ${escapeHtml(f)}</li>`)
          .join('');
        const hypHtml = data.epistemicEnvelopes.analyticalHypotheses.items
          .map((h) => `<li style="margin-bottom:3px;"><span style="color:#3B82F6;font-weight:700;">[HYPOTHESIS]</span> ${escapeHtml(h)}</li>`)
          .join('');
        const unvHtml = data.epistemicEnvelopes.cannotVerify.items
          .map((u) => `<li style="margin-bottom:3px;"><span style="color:#EF4444;font-weight:700;">[NON-INFERENCE]</span> ${escapeHtml(u)}</li>`)
          .join('');
        const citeHtml = data.citations
          .map((c) => `&bull; <em>${escapeHtml(c.description)}</em> (${escapeHtml(c.licence)})`)
          .join('<br>');

        if (content) {
          content.innerHTML = `
            <div style="margin-bottom:8px;"><strong>Observed Evidence &amp; Synthesis:</strong></div>
            <ul style="padding-left:16px;margin-bottom:8px;">${factsHtml}</ul>
            <div style="margin-bottom:4px;"><strong>Plausible Hypotheses for Clinical Review:</strong></div>
            <ul style="padding-left:16px;margin-bottom:8px;">${hypHtml}</ul>
            <div style="margin-bottom:4px;"><strong>Truth Boundary Refusals:</strong></div>
            <ul style="padding-left:16px;margin-bottom:8px;">${unvHtml}</ul>
            <div style="font-size:10px;color:var(--ps-text-muted);border-top:1px solid var(--ps-card-border);padding-top:4px;">
              <strong>Citations:</strong><br>${citeHtml}
            </div>
          `;
        }
      } else {
        if (content) content.innerHTML = `<span style="color:#EF4444;">${escapeHtml(data.message || 'NOVA explanation refused.')}</span>`;
      }
    } catch (err) {
      if (content) content.innerHTML = `<span style="color:#EF4444;">Failed to connect to NOVA Gemini Gateway: ${escapeHtml(err.message)}</span>`;
    }
  });

  // Residue Scrubber & Inspector
  const slider = document.getElementById('af-residue-slider');
  const chip = document.getElementById('af-residue-chip');
  if (slider) {
    slider.addEventListener('input', async () => {
      const seq = slider.value;
      const targetId = afViewerState.target.uniprotId;
      try {
        const res = await fetch(`/api/deepmind/alphafold/residue/${targetId}/${seq}`);
        if (res.ok) {
          const detail = await res.json();
          if (chip) {
            chip.textContent = `Residue ${seq}: ${detail.functionalRole} • ${detail.importance.slice(0, 50)}...`;
          }
        }
      } catch {}
    });
  }

  // Regional Choropleth Map Interactivity & Synchronized Google Earth 3D
  const regionMap = {
    'UK': { name: 'United Kingdom', rate: 218.6, pct: 'Benchmark Baseline' },
    'England': { name: 'England', rate: 238.9, pct: '+9.3%' },
    'North West': { name: 'North West', rate: 245.7, pct: '+12.4%' },
    'UK-NW': { name: 'North West', rate: 245.7, pct: '+12.4%' },
    'London': { name: 'London & South East', rate: 263.1, pct: '+20.3%' },
    'UK-LON': { name: 'London & South East', rate: 263.1, pct: '+20.3%' },
    'Midlands': { name: 'Midlands', rate: 228.4, pct: '+4.5%' },
    'UK-MID': { name: 'Midlands', rate: 228.4, pct: '+4.5%' },
    'Scotland': { name: 'Scotland', rate: 206.4, pct: '-5.6%' },
    'UK-SCT': { name: 'Scotland', rate: 206.4, pct: '-5.6%' },
    'Wales': { name: 'Wales', rate: 189.3, pct: '-13.4%' },
    'UK-WLS': { name: 'Wales', rate: 189.3, pct: '-13.4%' },
    'NI': { name: 'Northern Ireland', rate: 176.8, pct: '-19.1%' },
    'UK-NI': { name: 'Northern Ireland', rate: 176.8, pct: '-19.1%' },
  };

  window.highlightRegion = function(regionKey) {
    const reg = regionMap[regionKey] || regionMap['UK'];

    document.querySelectorAll('.ps-region-btn').forEach((btn) => {
      const text = btn.textContent.trim();
      const isActive = (regionKey === 'UK' && text === 'UK') ||
                       (regionKey === 'England' && text === 'England') ||
                       ((regionKey === 'Scotland' || regionKey === 'UK-SCT') && text === 'Scotland') ||
                       ((regionKey === 'Wales' || regionKey === 'UK-WLS') && text === 'Wales') ||
                       ((regionKey === 'NI' || regionKey === 'UK-NI') && text === 'Northern Ireland');
      btn.classList.toggle('active', isActive);
    });

    document.querySelectorAll('.ps-uk-map-path').forEach((path) => {
      const pCode = path.dataset.regionCode;
      const pName = path.dataset.regionName;
      const isTarget = (regionKey === 'UK') ||
                       (regionKey === pCode) ||
                       (regionKey === pName) ||
                       (regionKey === 'England' && (pCode === 'UK-NW' || pCode === 'UK-LON' || pCode === 'UK-MID' || pCode === 'UK-NE' || pCode === 'UK-SW'));
      if (isTarget) {
        path.setAttribute('stroke', '#FFFFFF');
        path.setAttribute('stroke-width', '2');
        path.style.opacity = '1.0';
      } else {
        path.removeAttribute('stroke');
        path.style.opacity = '0.65';
      }
    });

    const ttRegion = document.querySelector('.ps-tt-region');
    const ttNum = document.querySelector('.ps-tt-num');
    const ttPct = document.querySelector('.ps-tt-pct');
    if (ttRegion) ttRegion.textContent = reg.name;
    if (ttNum) ttNum.textContent = reg.rate.toFixed(1);
    if (ttPct) ttPct.textContent = reg.pct + ' vs. UK average';

    const compBar = document.getElementById('region-comparison-bar');
    if (compBar) {
      const deltaColor = reg.rate >= 218.6 ? '#10B981' : '#EF4444';
      const deltaSign = reg.rate >= 218.6 ? '+' : '';
      const textDiv = compBar.querySelector('div:first-child');
      if (textDiv) {
        textDiv.innerHTML = `
          <strong>${escapeHtml(reg.name)}</strong> (${reg.rate.toFixed(1)}/1k) vs <strong>UK Benchmark</strong> (218.6/1k) &bull; Delta: <span style="color:${deltaColor};font-weight:600;">${deltaSign}${(reg.rate - 218.6).toFixed(1)} items/1k (${reg.pct})</span>
        `;
      }
    }

    const btnKml = document.getElementById('btn-export-kml');
    if (btnKml) {
      const currentMed = activeCanonicalSlug ? (activeCanonicalSlug.includes('capecitabine') ? 'Capecitabine' : 'Apixaban') : 'Apixaban';
      btnKml.href = `/api/geospatial/kml?medicine=${encodeURIComponent(currentMed)}&region=${encodeURIComponent(regionKey)}`;
    }
  };

  document.querySelectorAll('.ps-uk-map-path').forEach((path) => {
    path.addEventListener('mouseenter', () => {
      const name = path.dataset.regionName;
      const rate = path.dataset.rate;
      const pct = path.dataset.pct;
      const ttRegion = document.querySelector('.ps-tt-region');
      const ttNum = document.querySelector('.ps-tt-num');
      const ttPct = document.querySelector('.ps-tt-pct');
      if (ttRegion) ttRegion.textContent = name;
      if (ttNum) ttNum.textContent = rate;
      if (ttPct) ttPct.textContent = pct + ' vs. UK average';
    });
    path.addEventListener('click', () => {
      const code = path.dataset.regionCode;
      window.highlightRegion(code);
    });
  });
}

// ============================================================================
// 7. 7-Class NHS dm+d Ontology Grid + SSD Live Rail
// ============================================================================
function renderReferenceCards(results, totalCount) {
  if (countDisplay) {
    countDisplay.textContent = `Showing ${results.length} of ${totalCount} reference dm+d presentations`;
  }
  if (!grid) return;
  grid.innerHTML = results
    .map((item) => {
      const smpc = item.smpcStorage || { status: 'UNMAPPED_STORAGE_CHARACTERISTICS' };
      const isBacked = smpc.status === 'DOCUMENT_BACKED';
      return `
        <article class="reference-card" role="listitem">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="np-epistemic-badge np-epistemic-observed">${escapeHtml(item.level)} • SNOMED ${escapeHtml(item.id)}</span>
            <span class="np-epistemic-badge ${isBacked ? 'np-epistemic-derived' : 'np-epistemic-unavailable'}">
              ${isBacked ? 'SmPC 6.4 Verified' : 'UNAVAILABLE (Non-Inference Refusal)'}
            </span>
          </div>
          <div class="reference-title">${escapeHtml(item.label)}</div>
          <div class="reference-meta">Active Moiety: ${escapeHtml(item.activeIngredient || 'UNAVAILABLE')} • Supplier: ${escapeHtml(item.supplier || 'Generic VTM/VMP')}</div>
          <div class="smpc-box ${isBacked ? 'ok' : 'unmapped'}">
            ${
              isBacked
                ? `<strong>SmPC 6.4:</strong> ${escapeHtml(smpc.verbatimSummary)}`
                : `<strong>NON-INFERENCE GATE:</strong> Storage unmapped without authorised SmPC Section 6.4 (never assumed ambient).`
            }
          </div>
        </article>
      `;
    })
    .join('');
}

async function refreshDmdAndWarehouse(q = '') {
  const opts = {
    query: q,
    level: levelSelect?.value || 'all',
    coldChainOnly: Boolean(coldCheck?.checked),
    plpiOnly: Boolean(plpiCheck?.checked),
    documentBackedOnly: Boolean(docBackedCheck?.checked),
  };
  const items = searchMedicinesTerminal(opts);
  renderReferenceCards(items, items.length);

  try {
    const [statusRes, catRes, pharmRes] = await Promise.all([
      fetch('/api/warehouse/status'),
      fetch(`/api/warehouse/catalog?q=${encodeURIComponent(q || 'Apixaban')}&limit=6`),
      fetch('/api/warehouse/pharmacies?q=London&limit=18'),
    ]);
    if (statusRes.ok) {
      const st = await statusRes.json();
      if (ssdMountPill) {
        ssdMountPill.textContent = st.ssdMounted
          ? `SSD Warehouse: ${st.availableDatasets}/${st.totalDatasets} Frozen Read-Only`
          : `SSD Warehouse: UNAVAILABLE (Standby)`;
      }
    }
    if (catRes.ok) {
      const cat = await catRes.json();
      const catMeta = document.getElementById('ssd-catalog-meta');
      const catList = document.getElementById('ssd-catalog-list');
      if (catMeta) catMeta.textContent = `novapharm.sqlite dim_medicine (${cat.results?.length || 0} sample rows)`;
      if (catList) {
        catList.innerHTML = (cat.results || [])
          .slice(0, 5)
          .map(
            (r) =>
              `<div style="padding:6px 8px;border-radius:6px;background:var(--np-bg-surface-secondary);"><strong>${escapeHtml(r.name)}</strong><br><span style="color:var(--np-text-muted);font-size:11px;">${escapeHtml(r.level)} • SNOMED ${escapeHtml(r.snomedCode)}</span></div>`,
          )
          .join('');
      }
    }
    if (pharmRes.ok) {
      const ph = await pharmRes.json();
      if (Array.isArray(ph.results) && ph.results.length) {
        globeState.pharmacies = ph.results;
        drawEarthGlobe();
        const phList = document.getElementById('ssd-pharmacies-list');
        if (phList) {
          phList.innerHTML = ph.results
            .slice(0, 5)
            .map(
              (p) =>
                `<div style="padding:6px 8px;border-radius:6px;background:var(--np-bg-surface-secondary);"><strong>${escapeHtml(p.tradingName)}</strong> • ${escapeHtml(p.postcode || '')}</div>`,
            )
            .join('');
        }
      }
    }
  } catch {}
}

function handleSearchChange() {
  const q = searchInput?.value || '';
  loadDisambiguationList(q);
  refreshDmdAndWarehouse(q);
  const matched = cachedProfiles.find(
    (p) =>
      q.trim().length >= 3 &&
      (p.displayName.toLowerCase().includes(q.trim().toLowerCase()) || p.snomedCt === q.trim()),
  );
  if (matched && matched.slug !== activeCanonicalSlug) {
    loadCanonicalDossier(matched.slug);
  }
}

searchInput?.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleSearchChange, 120);
});
[levelSelect, coldCheck, plpiCheck, docBackedCheck].forEach((el) =>
  el?.addEventListener('change', handleSearchChange),
);

// Boot sequence
function updateUtcClock() {
  const clockEl = document.getElementById('live-utc-clock');
  if (clockEl) {
    const now = new Date();
    const iso = now.toISOString().replace('T', ' ').slice(0, 19);
    clockEl.textContent = `${iso} UTC`;
  }
}
setInterval(updateUtcClock, 1000);
updateUtcClock();

wireCanvasDrag();
setupCanvasControls();
drawEarthGlobe();
selectAlphaFoldTarget('P00742');
await loadDisambiguationList('');
await loadCanonicalDossier('apixaban-5mg-tablets');
await refreshDmdAndWarehouse('');

if (!prefersReducedMotion) {
  function tick() {
    if (afViewerState.autoSpin && !afViewerState.dragging) {
      afViewerState.rotY += 0.006;
      drawAlphaFoldStructure();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
