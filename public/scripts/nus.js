// ════════════════════════════════════════════════════════════════════
//  NUS SHUTTLE INTEGRATION
//  Loaded AFTER app.js (relies on its globals: PROXY_URL, ALL_STOPS,
//  ALL_SERVICES, ALL_ROUTES, haversine, normalizeServiceNo, tripMap …).
//
//  Data flow
//    Worker ?endpoint=nus  →  normalised into the same shape LTA returns
//    ({Services:[{ServiceNo, NextBus, NextBus2, NextBus3}]}) so render(),
//    loadArrivalsInRoute() and the sun-seat panel work unchanged.
//
//  Stop identity
//    • An NUS stop within NUS_MERGE_RADIUS_M of an LTA stop is MERGED into
//      it: NUS arrivals simply appear on that LTA stop's page.
//    • Any other NUS stop is injected into ALL_STOPS as its own stop with
//      BusStopCode "NUS-<id>" and _isNus:true.
//  Everything degrades silently if NUS is down: LTA data is never blocked.
// ════════════════════════════════════════════════════════════════════

const NUS = {
  stops: [],          // [{ id, code, name, lat, lng, mergedInto }]
  byId: {},           // 'KR-MRT'     → stop
  byCode: {},         // 'NUS-KR-MRT' → stop
  services: {},       // 'A1'         → { route, desc, longName }
  link: {},           // LTA code     → [NUS stop ids merged into it]
  linked: false,
  loadPromise: null,
};
const NUS_PREFIX = 'NUS-';
const NUS_MERGE_RADIUS_M = 35;
// Manual overrides: NUS stop id → LTA BusStopCode to merge into, or null to
// never merge. Seeded with the one mapping documented in the API spec.
const NUS_STOP_OVERRIDES = { 'KR-MRT': '18331' };
const NUS_ORANGE = '#EF7C00';

function isNusCode(code) { return typeof code === 'string' && code.startsWith(NUS_PREFIX); }
function isNusService(svc) { return !!NUS.services[String(svc || '').toUpperCase()]; }

async function nusFetch(path, params = {}) {
  const qs = new URLSearchParams({ endpoint: 'nus', path, ...params });
  const res = await fetch(`${PROXY_URL}?${qs}`, { headers: await getProxyHeaders() });
  if (!res.ok) throw new Error(`NUS ${path} ${res.status}`);
  return res.json();
}

function nusRegisterStop(id, name, lat, lng) {
  if (NUS.byId[id]) return NUS.byId[id];
  const code = NUS_PREFIX + id.replace(/[^A-Za-z0-9-]/g, '_');
  const stop = { id, code, name, lat, lng, mergedInto: null };
  NUS.stops.push(stop);
  NUS.byId[id] = stop;
  NUS.byCode[code] = stop;
  return stop;
}

// ── LOADING ──────────────────────────────────────────────────────────
function loadNusData() {
  if (NUS.loadPromise) return NUS.loadPromise;
  NUS.loadPromise = (async () => {
    try {
      const [stopsJ, svcJ] = await Promise.all([nusFetch('BusStops'), nusFetch('ServiceDescription')]);
      (stopsJ?.BusStopsResult?.busstops || []).forEach(r => {
        const id = String(r.name || '').trim();
        const lat = parseFloat(r.latitude), lng = parseFloat(r.longitude);
        if (!id || !isFinite(lat) || !isFinite(lng)) return;
        nusRegisterStop(id, r.LongName || r.caption || r.ShortName || id, lat, lng);
      });
      (svcJ?.ServiceDescriptionResult?.ServiceDescription || []).forEach(r => {
        const route = String(r.Route || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{1,10}$/.test(route)) return;
        NUS.services[route] = { route, desc: r.RouteDescription || '', longName: r.RouteLongName || '' };
      });
    } catch (e) {
      console.warn('NUS data unavailable:', e.message);
    }
    injectNusIntoStops();
    injectNusIntoServices();
    if (typeof renderServiceBrowseList === 'function') renderServiceBrowseList();
  })();
  return NUS.loadPromise;
}

// Resolves once NUS static data is loaded and stop links are built.
async function nusEnsureReady() {
  await loadNusData();
  if (!NUS.stops.length) return false;
  if (!NUS.linked) {
    try { await fetchAllStops(); } catch (e) {}
    nusRebuildLinks();
  }
  return true;
}

// ── STOP LINKING / INJECTION ────────────────────────────────────────
function nusRebuildLinks() {
  if (!ALL_STOPS || !NUS.stops.length) return;
  NUS.link = {};
  const lta = ALL_STOPS.filter(s => !s._isNus);
  for (const n of NUS.stops) {
    n.mergedInto = null;
    if (Object.prototype.hasOwnProperty.call(NUS_STOP_OVERRIDES, n.id)) {
      const forced = NUS_STOP_OVERRIDES[n.id];
      if (forced && lta.some(s => String(s.BusStopCode) === String(forced))) n.mergedInto = String(forced);
    } else {
      let best = null, bestD = NUS_MERGE_RADIUS_M;
      for (const s of lta) {
        const la = parseFloat(s.Latitude);
        if (!isFinite(la) || Math.abs(la - n.lat) > 0.0006) continue; // ~65 m cheap prefilter
        const d = haversine(n.lat, n.lng, la, parseFloat(s.Longitude));
        if (d <= bestD) { bestD = d; best = s; }
      }
      if (best) n.mergedInto = String(best.BusStopCode);
    }
    if (n.mergedInto) (NUS.link[n.mergedInto] = NUS.link[n.mergedInto] || []).push(n.id);
  }
  NUS.linked = true;
}

// Mutates ALL_STOPS in place (push) so references captured earlier by
// in-flight code (e.g. doServiceSearch's Promise.all) still see NUS stops.
function injectNusIntoStops() {
  if (!ALL_STOPS || !NUS.stops.length) return;
  nusRebuildLinks();
  const existing = new Set(ALL_STOPS.map(s => String(s.BusStopCode)));
  for (const n of NUS.stops) {
    if (n.mergedInto || existing.has(n.code)) continue;
    ALL_STOPS.push({
      BusStopCode: n.code, RoadName: 'NUS', Description: n.name,
      Latitude: n.lat, Longitude: n.lng, _isNus: true,
    });
  }
}

function injectNusIntoServices() {
  if (!ALL_SERVICES) return;
  for (const sv of Object.values(NUS.services)) {
    const key = normalizeServiceNo(sv.route) + '-1';
    if (ALL_SERVICES[key] && !ALL_SERVICES[key]._isNus) continue; // never shadow an LTA service
    ALL_SERVICES[key] = {
      ServiceNo: sv.route, Operator: 'NUS', Direction: 1, Category: 'SHUTTLE',
      OriginCode: '', OriginDesc: '', DestinationCode: '', DestinationDesc: '',
      AM_Peak_Freq: '-', AM_Offpeak_Freq: '-', PM_Peak_Freq: '-', PM_Offpeak_Freq: '-',
      LoopDesc: '', _isNus: true, _nusDesc: sv.desc || sv.longName || '',
    };
  }
}

// ── LIVE ARRIVALS ───────────────────────────────────────────────────
const NUS_LOAD = { low: 'SEA', medium: 'SDA', high: 'LSD' };

function nusEtaSeconds(e) {
  const s = Number(e?.eta_s);
  if (e?.eta_s !== '' && e?.eta_s != null && isFinite(s) && s >= 0) return s;
  const m = Number(e?.eta);
  if (e?.eta !== '' && e?.eta != null && isFinite(m) && m >= 0) return m * 60;
  return null;
}

function nusHeading(d) {
  if (d === '' || d == null) return null;
  const n = Number(d);
  return isFinite(n) && n >= 0 && n <= 360 ? n % 360 : null;
}

function nusBusFromEta(e, bus) {
  const lat = Number(bus?.lat), lng = Number(bus?.lng);
  return {
    EstimatedArrival: new Date(Date.now() + e.s * 1000).toISOString(),
    Latitude: bus && isFinite(lat) ? String(lat) : '',
    Longitude: bus && isFinite(lng) ? String(lng) : '',
    Load: NUS_LOAD[String(bus?.loadInfo?.crowdLevel || '').toLowerCase()] || '',
    Type: 'SD', OriginCode: '', DestinationCode: '', VisitNumber: '1', Feature: '',
    _nus: true, _heading: nusHeading(bus?.direction), _plate: e.plate || '',
  };
}

// Worker "Arrivals" payload → LTA-shaped Services array.
function nusNormalizeArrivals(j) {
  const plateIdx = {};
  for (const buses of Object.values(j?.active || {})) {
    (buses || []).forEach(b => { if (b?.vehplate) plateIdx[b.vehplate] = b; });
  }
  const byRoute = {};
  (j?.stops || []).forEach(st => {
    if (!st?.ok) return;
    (st.result?.shuttles || []).forEach(sh => {
      const route = String(sh?.name || '').trim().toUpperCase();
      if (!route) return;
      let etas = (sh._etas || [])
        .map(e => ({ s: nusEtaSeconds(e), plate: e?.plate }))
        .filter(e => e.s !== null);
      if (!etas.length) {
        [[sh.arrivalTime, sh.arrivalTime_veh_plate], [sh.nextArrivalTime, sh.nextArrivalTime_veh_plate]]
          .forEach(([t, plate]) => {
            const m = parseInt(t, 10);
            if (isFinite(m) && m >= 0) etas.push({ s: m * 60, plate });
          });
      }
      (byRoute[route] = byRoute[route] || []).push(...etas);
    });
  });
  return Object.entries(byRoute).map(([route, etas]) => {
    etas.sort((a, b) => a.s - b.s);
    const mk = e => (e ? nusBusFromEta(e, plateIdx[e.plate]) : { EstimatedArrival: '' });
    return { ServiceNo: route, Operator: 'NUS', _isNus: true,
             NextBus: mk(etas[0]), NextBus2: mk(etas[1]), NextBus3: mk(etas[2]) };
  }).filter(s => s.NextBus.EstimatedArrival);
}

// NUS Services to merge into whatever fetchLTA() returns for `code`.
// NEVER rejects — NUS trouble must not break LTA arrivals.
async function nusArrivalsFor(code) {
  try {
    if (!(await nusEnsureReady())) return [];
    const ids = isNusCode(code) ? [NUS.byCode[code]?.id].filter(Boolean) : (NUS.link[code] || []);
    if (!ids.length) return [];
    return nusNormalizeArrivals(await nusFetch('Arrivals', { stops: ids.join(',') }));
  } catch (e) {
    console.warn('NUS arrivals failed:', e.message);
    return [];
  }
}

// ── ROUTES ──────────────────────────────────────────────────────────
// Returns stops in the same shape as LTA BusRoutes so renderRoute() works.
async function nusFetchRoute(route) {
  await nusEnsureReady();
  const j = await nusFetch('PickupPoint', { route_code: route });
  const pts = (j?.PickupPointResult?.pickuppoint || []).slice().sort((a, b) => (a.seq || 0) - (b.seq || 0));
  const stops = [];
  pts.forEach((p, i) => {
    const id = String(p.busstopcode || '').trim();
    let n = NUS.byId[id];
    if (!n && id && isFinite(parseFloat(p.lat)) && isFinite(parseFloat(p.lng))) {
      n = nusRegisterStop(id, p.LongName || p.pickupname || id, parseFloat(p.lat), parseFloat(p.lng));
      injectNusIntoStops();
    }
    if (!n) return;
    stops.push({
      ServiceNo: route, Operator: 'NUS', Direction: 1,
      StopSequence: p.seq ?? i + 1,
      BusStopCode: n.mergedInto || n.code, Distance: 0,
      WD_FirstBus: '-', WD_LastBus: '-', SAT_FirstBus: '-', SAT_LastBus: '-',
      SUN_FirstBus: '-', SUN_LastBus: '-',
    });
  });
  if (!ALL_ROUTES) ALL_ROUTES = [];
  ALL_ROUTES = ALL_ROUTES.filter(s => s.ServiceNo.replace(/^0+/, '').toUpperCase() !== route);
  ALL_ROUTES.push(...stops);
  return stops;
}

// ── UI HELPERS ──────────────────────────────────────────────────────
function nusBadgeHtml() {
  return `<span style="font-size:9px;background:${NUS_ORANGE}20;color:${NUS_ORANGE};border:1px solid ${NUS_ORANGE}60;border-radius:4px;padding:1px 4px;margin-left:4px;font-weight:700;flex-shrink:0">NUS</span>`;
}

// Shown in place of the seat diagram when ActiveBus has no heading for a bus.
function nusNoSunPanel() {
  return `<div class="panel-title"><i class="fa-solid fa-sun"></i> Sun-Smart Seating</div>
    <div class="rec-banner any"><div class="rec-emoji"><i class="fa-solid fa-circle-info"></i></div>
    <div>Live heading isn't available for this bus yet. Try refreshing in a moment.</div></div>`;
}

// ── LIVE BUS MARKERS ON THE ROUTE MAP ───────────────────────────────
const _nusLive = { timer: null, layer: null, map: null };

function nusDetachLiveBuses() {
  if (_nusLive.timer) clearInterval(_nusLive.timer);
  try { _nusLive.layer?.remove(); } catch (e) {}
  _nusLive.timer = _nusLive.layer = _nusLive.map = null;
}

function nusBusMarkerHtml(b, route) {
  const col = { low: '#00C86E', medium: '#FF8C00', high: '#FF3333' }[String(b.loadInfo?.crowdLevel || '').toLowerCase()] || '#888';
  const h = nusHeading(b.direction);
  const arrow = h == null ? '' :
    `<div style="position:absolute;left:50%;top:50%;width:0;height:0;transform:translate(-50%,-50%) rotate(${h}deg)">
       <div style="position:absolute;left:-5px;top:-22px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${col}"></div></div>`;
  return `<div style="position:relative;width:28px;height:28px">${arrow}
    <div style="position:absolute;inset:3px;border-radius:50%;background:${NUS_ORANGE};border:2px solid ${col};color:#fff;font:700 9px/18px sans-serif;text-align:center;box-shadow:0 1px 4px #0008">${escapeHtml(route)}</div></div>`;
}

function nusAttachLiveBuses(map, svc) {
  nusDetachLiveBuses();
  const route = String(svc || '').toUpperCase();
  if (!map || !isNusService(route)) return;
  const layer = L.layerGroup().addTo(map);
  _nusLive.layer = layer; _nusLive.map = map;
  const tick = async () => {
    // Stop polling once the map was replaced or removed from the page.
    if (_nusLive.map !== map || tripMap !== map || !map.getContainer()?.isConnected) { nusDetachLiveBuses(); return; }
    if (document.hidden) return;
    try {
      const j = await nusFetch('ActiveBus', { route_code: route });
      if (_nusLive.map !== map) return;
      layer.clearLayers();
      (j?.ActiveBusResult?.activebus || []).forEach(b => {
        const lat = Number(b.lat), lng = Number(b.lng);
        if (!isFinite(lat) || !isFinite(lng)) return;
        const crowd = b.loadInfo?.crowdLevel ? ` · ${escapeHtml(b.loadInfo.crowdLevel)} crowd` : '';
        L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: nusBusMarkerHtml(b, route), iconSize: [28, 28], iconAnchor: [14, 14] }),
          zIndexOffset: 1000,
        }).bindTooltip(`${escapeHtml(b.vehplate || route)}${crowd}`).addTo(layer);
      });
    } catch (e) { /* keep last markers; try again next tick */ }
  };
  tick();
  _nusLive.timer = setInterval(tick, 15000);
}