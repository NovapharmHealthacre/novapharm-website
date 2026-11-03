/**
 * NovaPharm Medicines Geography — 3D Google Earth Globe & Tabular Evidence Controller.
 */

import { queryMedicinesGeography, UK_REGIONS } from './geospatial-engine.mjs';

const medSelect = document.getElementById('medicine-select');
const regSelect = document.getElementById('region-select');
const epiSelect = document.getElementById('epistemic-select');
const layerButtons = document.querySelectorAll('.layer-btn');
const tableBody = document.getElementById('geo-table-body');
const summaryText = document.getElementById('table-summary');
const mapMarkersGroup = document.getElementById('map-markers');
const kmlLink = document.getElementById('geo-kml-link');

let activeLayer = 'DEMAND_OBSERVATIONS';
let centerLat = 53.2;
let centerLon = -2.2;
let zoom = 2.7;
let activePoints = [];
let ssdPharmacies = [];
let hoveredPoint = null;

const GB_OUTLINE = [
  [50.07, -5.7], [50.35, -4.15], [50.72, -1.88], [50.78, 0.28], [51.37, 1.44],
  [51.95, 1.3], [52.75, 1.72], [53.55, 0.12], [54.52, -0.6], [55.77, -2.02],
  [56.35, -2.8], [57.68, -1.8], [58.64, -3.07], [58.58, -5.0], [57.3, -5.8],
  [55.3, -4.8], [54.1, -3.2], [53.3, -4.6], [51.85, -5.25], [50.07, -5.7],
];

// Apply URL parameters when navigated from Medicines Terminal
if (typeof window !== 'undefined' && window.location?.search) {
  const params = new URLSearchParams(window.location.search);
  const reqLayer = params.get('layer');
  const reqMed = params.get('medicine') || '';
  if (reqLayer) {
    activeLayer = reqLayer;
    layerButtons.forEach((b) => {
      const isMatch = b.getAttribute('data-layer') === reqLayer;
      b.classList.toggle('active', isMatch);
      b.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
  }
  if (medSelect && reqMed) {
    if (reqMed.toLowerCase().includes('capecitabine')) medSelect.value = 'NP-ONCO-500MG';
    else if (reqMed.toLowerCase().includes('apixaban') || reqMed.toLowerCase().includes('eliquis')) {
      medSelect.value = 'NP-APIX-5MG';
    }
    else if (reqMed.toLowerCase().includes('pegfilgrastim') || reqMed.toLowerCase().includes('neulasta')) {
      medSelect.value = 'NP-COLD-BIO-100U';
    }
    else if (reqMed.toLowerCase().includes('atorvastatin') || reqMed.toLowerCase().includes('lipitor')) {
      medSelect.value = 'NP-ATORV-20MG';
    }
    else if (reqMed.toLowerCase().includes('metformin') || reqMed.toLowerCase().includes('glucophage')) {
      medSelect.value = 'NP-METF-500MG';
    }
    if (kmlLink) kmlLink.href = `/api/geospatial/kml?medicine=${encodeURIComponent(reqMed)}`;
  }
}

function projectCoords(lat, lon) {
  const minLat = 50.0;
  const maxLat = 58.0;
  const minLon = -6.5;
  const maxLon = 2.0;
  const x = ((lon - minLon) / (maxLon - minLon)) * 360 + 20;
  const y = 480 - ((lat - minLat) / (maxLat - minLat)) * 440;
  return [Math.round(x), Math.round(y)];
}

function projectGlobe(latDeg, lonDeg, w, h) {
  const r = Math.PI / 180;
  const phi = latDeg * r;
  const lam = lonDeg * r;
  const phi0 = centerLat * r;
  const lam0 = centerLon * r;
  const dLam = lam - lam0;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLam);
  if (cosC < 0) return null;
  const rad = Math.min(w, h) * 0.44 * zoom;
  return {
    x: w * 0.5 + rad * Math.cos(phi) * Math.sin(dLam),
    y: h * 0.5 - rad * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLam)),
    rad,
  };
}

function draw3DGlobe() {
  const canvas = document.getElementById('geo-earth-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const sphereR = Math.min(w, h) * 0.44 * zoom;
  const grad = ctx.createRadialGradient(w * 0.45, h * 0.4, sphereR * 0.1, w * 0.5, h * 0.5, sphereR);
  if (isDark) {
    grad.addColorStop(0, '#173668');
    grad.addColorStop(1, '#071124');
  } else {
    grad.addColorStop(0, '#DBEAFE');
    grad.addColorStop(1, '#BFDBFE');
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, sphereR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.45)';
  ctx.stroke();
  ctx.clip();

  ctx.beginPath();
  let started = false;
  for (const [lat, lon] of GB_OUTLINE) {
    const p = projectGlobe(lat, lon, w, h);
    if (!p) continue;
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  }
  if (started) {
    ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(30, 58, 95, 0.85)' : 'rgba(147, 197, 253, 0.85)';
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(125, 211, 252, 0.45)' : 'rgba(29, 78, 216, 0.6)';
    ctx.stroke();
  }

  for (const ph of ssdPharmacies) {
    const p = projectGlobe(ph.latitude, ph.longitude, w, h);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.78)' : 'rgba(37, 99, 235, 0.78)';
    ctx.fill();
  }

  for (const pt of activePoints) {
    const p = projectGlobe(pt.lat, pt.lon, w, h);
    if (!p) continue;
    const isHovered = hoveredPoint && hoveredPoint.lat === pt.lat && hoveredPoint.lon === pt.lon;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHovered ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = pt.color;
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#fbbf24' : '#ffffff';
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.stroke();
  }

  // Draw sleek glass tooltip over hovered node
  if (hoveredPoint) {
    const p = projectGlobe(hoveredPoint.lat, hoveredPoint.lon, w, h);
    if (p) {
      ctx.save();
      ctx.font = '600 11px -apple-system, system-ui, sans-serif';
      const text = `${hoveredPoint.label}${hoveredPoint.value ? ': ' + hoveredPoint.value : ''} [${hoveredPoint.status}]`;
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 18;
      const boxH = 26;
      const boxX = Math.min(w - boxW - 8, Math.max(8, p.x - boxW / 2));
      const boxY = Math.max(8, p.y - 36);

      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(37, 99, 235, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText(text, boxX + 9, boxY + 17);
      ctx.restore();
    }
  }
  ctx.restore();
}

function renderGeography() {
  const criteria = {
    medicineSku: medSelect?.value,
    regionId: regSelect?.value,
    epistemicStatus: epiSelect?.value,
    layer: activeLayer,
  };

  const data = queryMedicinesGeography(criteria);

  if (summaryText) {
    summaryText.textContent = `Displaying ${data.totalEntities} spatial records under active layer: ${activeLayer}`;
  }

  if (tableBody) {
    tableBody.innerHTML = '';
    if (data.emptyState) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">${data.emptyMessage}</td></tr>`;
    } else {
      for (const row of data.tableRows) {
        const tr = document.createElement('tr');
        let badgeClass = 'badge-observed';
        if (row.epistemicStatus === 'FORECAST') badgeClass = 'badge-forecast';
        if (row.epistemicStatus === 'SIMULATED') badgeClass = 'badge-simulated';

        tr.innerHTML = `
          <td><strong>${row.region}</strong></td>
          <td>${row.entity}</td>
          <td>${row.metric}</td>
          <td><span class="status-badge ${badgeClass}">${row.epistemicStatus}</span></td>
          <td>${row.confidence}</td>
          <td><span class="hash-tag">${row.provenanceHash || 'VERIFIED'}</span></td>
        `;
        tableBody.appendChild(tr);
      }
    }
  }

  activePoints = [];
  if (mapMarkersGroup) {
    mapMarkersGroup.innerHTML = '';
    for (const record of data.spatialRecords) {
      let lat, lon;
      let markerColor = '#38bdf8';

      if (record.type === 'SUPPLY_HUB') {
        lat = record.coordinates[0];
        lon = record.coordinates[1];
        markerColor = '#14b8a6';
      } else {
        const reg = UK_REGIONS.find((r) => r.id === record.regionId);
        if (!reg) continue;
        lat = reg.center[0];
        lon = reg.center[1];
        if (record.epistemicStatus === 'SIMULATED') markerColor = '#f43f5e';
        if (record.epistemicStatus === 'FORECAST') markerColor = '#a855f7';
      }

      activePoints.push({
        lat,
        lon,
        color: markerColor,
        label: record.name || record.medicineName || 'UK Spatial Node',
        status: record.epistemicStatus || 'OBSERVED',
        value: record.value ? `${record.value.toLocaleString()} ${record.unit || ''}` : '',
      });
      const [cx, cy] = projectCoords(lat, lon);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', markerColor);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.9');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${record.name || record.medicineName} (${record.epistemicStatus})`;
      circle.appendChild(title);

      mapMarkersGroup.appendChild(circle);
    }
  }

  // Synchronize dynamic KML download link and Google Earth Web camera
  if (kmlLink) {
    const medVal = medSelect?.value === 'all' ? '' : (medSelect?.selectedOptions?.[0]?.text?.split(' ')[0] || '');
    const regVal = regSelect?.value === 'all' ? '' : regSelect?.value;
    const q = new URLSearchParams();
    if (medVal) q.set('medicine', medVal);
    if (regVal) q.set('region', regVal);
    kmlLink.href = `/api/geospatial/kml${q.toString() ? '?' + q.toString() : ''}`;
  }

  const earthWebLink = document.getElementById('geo-earth-web');
  if (earthWebLink) {
    const reg = UK_REGIONS.find((r) => r.id === regSelect?.value);
    if (reg) {
      earthWebLink.href = `https://earth.google.com/web/@${reg.center[0]},${reg.center[1]},0a,250000d,35y,8h,46t,0r`;
    } else {
      earthWebLink.href = 'https://earth.google.com/web/@53.15,-1.95,0a,880000d,35y,8h,46t,0r';
    }
  }

  draw3DGlobe();
}

medSelect?.addEventListener('change', renderGeography);
regSelect?.addEventListener('change', renderGeography);
epiSelect?.addEventListener('change', renderGeography);

layerButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    layerButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    activeLayer = btn.getAttribute('data-layer') || 'DEMAND_OBSERVATIONS';
    renderGeography();
  });
});

const geoCanvas = document.getElementById('geo-earth-canvas');
if (geoCanvas) {
  let dragging = false;
  let lx = 0;
  let ly = 0;
  geoCanvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    geoCanvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointermove', (e) => {
    if (dragging) {
      centerLon = Math.max(-20, Math.min(15, centerLon - (e.clientX - lx) * 0.08));
      centerLat = Math.max(42, Math.min(64, centerLat + (e.clientY - ly) * 0.08));
      lx = e.clientX;
      ly = e.clientY;
      draw3DGlobe();
      return;
    }

    // Hover tooltip detection
    const rect = geoCanvas.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      const mx = (e.clientX - rect.left) * (geoCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (geoCanvas.height / rect.height);
      let found = null;
      for (const pt of activePoints) {
        const p = projectGlobe(pt.lat, pt.lon, geoCanvas.width, geoCanvas.height);
        if (p) {
          const dx = p.x - mx;
          const dy = p.y - my;
          if (dx * dx + dy * dy < 144) {
            found = pt;
            break;
          }
        }
      }
      if (found !== hoveredPoint) {
        hoveredPoint = found;
        geoCanvas.style.cursor = found ? 'pointer' : 'grab';
        draw3DGlobe();
      }
    } else if (hoveredPoint) {
      hoveredPoint = null;
      geoCanvas.style.cursor = 'grab';
      draw3DGlobe();
    }
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
    geoCanvas.style.cursor = 'grab';
  });
}

if (typeof fetch === 'function') {
  fetch('/api/warehouse/pharmacies?limit=40')
    .then((r) => (r.ok ? r.json() : null))
    .then((res) => {
      if (res && Array.isArray(res.pharmacies)) {
        ssdPharmacies = res.pharmacies;
        draw3DGlobe();
      }
    })
    .catch(() => {});
}

const btnMode2d = document.getElementById('btn-geo-mode-2d');
const btnMode3d = document.getElementById('btn-geo-mode-3d');
const btnModeTable = document.getElementById('btn-geo-mode-table');
const mapPane = document.querySelector('.map-pane');
const tablePane = document.querySelector('.table-pane');

btnMode2d?.addEventListener('click', () => {
  btnMode2d.classList.add('primary');
  btnMode3d?.classList.remove('primary');
  btnModeTable?.classList.remove('primary');
  if (mapPane) mapPane.style.display = 'flex';
  if (tablePane) tablePane.style.display = 'block';
  zoom = 2.0;
  draw3DGlobe();
});

btnMode3d?.addEventListener('click', () => {
  btnMode3d.classList.add('primary');
  btnMode2d?.classList.remove('primary');
  btnModeTable?.classList.remove('primary');
  if (mapPane) mapPane.style.display = 'flex';
  if (tablePane) tablePane.style.display = 'block';
  zoom = 2.7;
  centerLat = 53.2;
  centerLon = -2.2;
  draw3DGlobe();
});

btnModeTable?.addEventListener('click', () => {
  btnModeTable.classList.add('primary');
  btnMode2d?.classList.remove('primary');
  btnMode3d?.classList.remove('primary');
  if (mapPane) mapPane.style.display = 'none';
  if (tablePane) tablePane.style.display = 'block';
});

// Theme Switching and Persistence
const themeToggleBtn = document.getElementById('themeToggleBtn');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('novapharm-theme', theme);
  } catch (_) {}
  draw3DGlobe();
}

const savedTheme = (() => {
  try {
    return localStorage.getItem('novapharm-theme');
  } catch (_) {
    return null;
  }
})() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

applyTheme(savedTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Sovereign Geodesic Transit & Route Matrix Triggers
const btnTransit = document.getElementById('btn-calc-transit');
const btnMultiRoute = document.getElementById('btn-calc-multi-route');
const btnCloseDrawer = document.getElementById('btn-close-transit-drawer');
const transitDrawer = document.getElementById('sovereign-transit-drawer');
const transitContent = document.getElementById('transit-drawer-content');
const multiRouteContent = document.getElementById('multi-route-drawer-content');

btnCloseDrawer?.addEventListener('click', () => {
  if (transitDrawer) transitDrawer.style.display = 'none';
});

btnTransit?.addEventListener('click', async () => {
  if (!transitDrawer) return;
  const isHidden = transitDrawer.style.display === 'none';
  transitDrawer.style.display = isHidden ? 'block' : 'none';
  if (!isHidden) return;

  if (transitContent) {
    transitContent.innerHTML = '<span style="color:var(--np-blue);">Computing sovereign Haversine geodesic road transit &amp; GDP cold-chain SLA...</span>';
  }

  try {
    const res = await fetch('/api/geospatial/zero-cost-transit?originLat=51.51&originLon=-0.14&destLat=53.48&destLon=-2.24&mode=ROAD_VAN');
    const data = await res.json();
    if (transitContent) {
      transitContent.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;color:var(--title-color);">
          Direct Hospital Supply Route: <strong>London</strong> (51.51&deg;N, 0.14&deg;W) &rarr; <strong>Manchester</strong> (53.48&deg;N, 2.24&deg;W)
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:1.5rem;font-variant-numeric:tabular-nums;margin-bottom:4px;">
          <span>&bull; <strong>Road Distance:</strong> ${data.distanceKm} km (1.28x winding factor)</span>
          <span>&bull; <strong>Transit Duration:</strong> ${data.transitMinutes} mins (~${(data.transitMinutes / 60).toFixed(1)} hrs)</span>
          <span>&bull; <strong>Passive Shipper SLA:</strong> <span style="color:#10b981;font-weight:700;">${escapeHtml(data.gdpComplianceZone)}</span></span>
          <span>&bull; <strong>Billed:</strong> <span style="color:#10b981;font-weight:700;">${escapeHtml(data.billingCost)}</span></span>
        </div>
      `;
    }
  } catch (err) {
    if (transitContent) transitContent.textContent = 'Transit calculation unavailable: ' + err.message;
  }
});

btnMultiRoute?.addEventListener('click', async () => {
  if (!transitDrawer) return;
  transitDrawer.style.display = 'block';
  if (multiRouteContent) {
    multiRouteContent.style.display = 'block';
    multiRouteContent.innerHTML = '<span style="color:var(--np-blue);">Computing multi-point distribution matrix, cold-chain hold SLA &amp; DEFRA carbon at &pound;0.00...</span>';
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
      const legsHtml = data.legs
        .map((l) => `<div style="padding:2px 0;">&bull; <strong>Leg ${l.legIndex}:</strong> ${escapeHtml(l.from.name)} &rarr; ${escapeHtml(l.to.name)} (${l.distanceKm} km, ${l.transitMinutes} mins)</div>`)
        .join('');

      multiRouteContent.innerHTML = `
        <div style="font-weight:700;color:var(--title-color);margin-bottom:4px;">
          Multi-Stop Distribution Matrix: ${escapeHtml(data.originHub.name)} (${data.totalStops} NHS Hospital &amp; Dispensary Stops)
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:1.5rem;font-variant-numeric:tabular-nums;margin-bottom:4px;">
          <span>&bull; <strong>Total Route Distance:</strong> ${data.totalDistanceKm} km</span>
          <span>&bull; <strong>Duration:</strong> ${data.totalTransitHours} hrs</span>
          <span>&bull; <strong>DEFRA Carbon:</strong> ${data.carbonFootprintKgCO2e} kg CO2e</span>
          <span>&bull; <strong>Cold-Chain SLA:</strong> <span style="color:#10b981;font-weight:700;">${escapeHtml(data.passiveShipperSLA.status)}</span> (${data.passiveShipperSLA.holdHoursRemaining}h margin)</span>
          <span>&bull; <strong>Billed:</strong> <span style="color:#10b981;font-weight:700;">&pound;0.00 (Zero External Cost)</span></span>
        </div>
        <div style="margin-top:6px;padding-top:6px;border-top:1px dotted var(--glass-border-strong);font-size:0.75rem;">
          ${legsHtml}
        </div>
      `;
    }
  } catch (err) {
    if (multiRouteContent) multiRouteContent.textContent = 'Multi-stop calculation unavailable: ' + err.message;
  }
});

renderGeography();
