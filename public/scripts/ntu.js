/* ── NTU CAMPUS SHUTTLES (ntu.js) ─────────────────────────────────────────────
 * Everything NTU-specific lives here; code shared with NUS is in campus.js. Loaded as a plain <script>
 * AFTER campus.js and BEFORE app.js; it only defines things, nothing runs until app.js calls it.
 *
 * Data: ./assets/ntu-shuttle.json (built by helper_scripts/ntu/build_ntu_assets.py) is merged
 * into PRIVATE_SERVICES by app.js (loadNtuServices). A stop NTU shares with public buses uses its
 * real LTA code; NTU-only stops use a synthetic "NTU-…" code. Either way the ETA lookup uses
 * NtuStopName, never the code.
 *
 * NTU's ETA call is per (stop, route) and returns minutes; its bus feed has no vehicle id, so live-map
 * markers are matched between polls by nearest distance.
 *
 * app.js calls into this file through:
 *   loadNtuServices()                 fetch + parse ntu-shuttle.json ({} on failure)
 *   ntuResetIndex() / ntuIndexStop()  build NTU_STOP_INDEX while injecting private services
 *   hasNtu(code) / isNtuCode(code)    "NTU serves this code" / "NTU-only code, no LTA data"
 *   renderNtuStopCards(code, n)       stop view: NTU cards appended after the public ones
 *   ntuRowsHtml(code)                 route view: NTU arrival rows (HTML string)
 *   ntuLoopLabel(info, fallbackOrig)  "first ↻ last" label for NTU loops
 *   ntuRouteTimes(svc)                first/last bus fields for the route view's timing grid
 *   ntuLiveButton(serviceNo) / ntuLiveOpen(serviceNo) / ntuLiveStop()   route-view Live map
 * ──────────────────────────────────────────────────────────────────────────── */

let NTU_STOP_INDEX = {};   // BusStopCode (real LTA code or NTU-…) → [{ svc, stop }, ...]

function ntuResetIndex() { NTU_STOP_INDEX = {}; }
function ntuIndexStop(svc, stop) { campusIndexStop(NTU_STOP_INDEX, svc, stop); }
function loadNtuServices() { return campusLoadJson('./assets/ntu-shuttle.json'); }

function isNtuCode(code) { return typeof code === 'string' && code.startsWith('NTU-'); }
function hasNtu(code) { return !!NTU_STOP_INDEX[code]; }
function ntuEntriesAtStop(code) { return NTU_STOP_INDEX[code] || []; }

const ntuServiceByNo = serviceNo => campusServiceByNo('_isNtu', serviceNo);
// NTU campus shuttles are all loops: "first stop ↻ last stop" (e.g. Opp Hall 11 ↻ Opp NY Cres Halls).
function ntuLoopLabel(info, fallbackOrig) { return campusLoopLabel(ntuServiceByNo(info?.ServiceNo), info, fallbackOrig); }

// First / last bus from NTU's RouteMinMaxTimes (Term timetable). Brown (weekend/holiday) replaces Green
// (weekdays) on public holidays via the Sun entry.
const ntuRouteTimes = campusRouteTimes;
const ntuStatus = campusStatus;

// ── Live ETAs + buses ─────────────────────────────────────────────────────────
const NTU_ETA_TTL_MS = 20000;
const NTU_BUSES_TTL_MS = 10000;   // bus positions are polled faster than ETAs (live map)
const _ntuEtaCache = new Map();   // "route|stop" → { t, promise }
const _ntuBusCache = new Map();   // route → { t, promise }

// Returns { ETA, NextETA } (minutes or null) or { error } — never throws.
function fetchNtuEta(stopName, route) {
  return campusCached(_ntuEtaCache, route + '|' + stopName, NTU_ETA_TTL_MS, async () => {
    try {
      const r = await campusProxy(`endpoint=NtuShuttle&BusStopCode=${encodeURIComponent(stopName)}&RouteCode=${encodeURIComponent(route)}`);
      if (!r.ok || r.json.error) return { error: r.json.error || ('http ' + r.status) };
      return { ETA: r.json.ETA ?? null, NextETA: r.json.NextETA ?? null };
    } catch (e) { return { error: 'network' }; }
  }, r => r.error); // don't cache failures
}

// Active buses on a route with crowd level: { buses: [{ lat, lng, crowd }] }. Crowd is optional,
// so this never reports errors: on any failure it just returns no buses and ETAs still render.
function fetchNtuBuses(route) {
  return campusCached(_ntuBusCache, route, NTU_BUSES_TTL_MS, async () => {
    try {
      const r = await campusProxy(`endpoint=NtuBuses&RouteCode=${encodeURIComponent(route)}`);
      if (!r.ok || r.json.error) return { buses: [], failed: true };
      return { buses: r.json.buses || [], fetchedAt: r.json.fetchedAt };
    } catch (e) { return { buses: [], failed: true }; }
  }, r => r.failed);
}

// Crowd of the next two buses to reach a stop (soonest first), as [c1, c2].
const ntuCrowdForStop = (svc, stopName, buses) => campusCrowdForStop(svc, 'NtuStopName', stopName, buses, 2);

// ETAs + bus positions for every entry at a stop: { results: [ETA result], busRes: [buses result] }.
async function _ntuLoadAt(entries) {
  const [results, busRes] = await Promise.all([
    Promise.all(entries.map(e => fetchNtuEta(e.stop.NtuStopName, e.svc.NtuRoute))),
    Promise.all(entries.map(e => fetchNtuBuses(e.svc.NtuRoute))),
  ]);
  return { results, busRes };
}

// Stop view: one bus-card per NTU route at this stop, filled in as ETAs arrive.
function renderNtuStopCards(code, publicCount) {
  if (!hasNtu(code)) return;
  const entries = ntuEntriesAtStop(code);
  return campusRenderStopCards({
    code, publicCount, entries, wrapId: 'ntu-cards', load: () => _ntuLoadAt(entries),
    buildCard: ({ svc, stop }, i, { results, busRes }) => {
      const r = results[i];
      const first = r.error ? null : campusMins(r.ETA);
      const next = r.error ? null : campusMins(r.NextETA);
      const [crowd1, crowd2] = ntuCrowdForStop(svc, stop.NtuStopName, busRes[i].buses);
      return campusCardHtml({
        svc, code, delay: publicCount + i, opClass: 'op-ntu', tag: 'NTU', route: svc.NtuRoute, first, next,
        lc1: CAMPUS_LOAD_COLOR[crowd1] || 'var(--muted)', lc2: CAMPUS_LOAD_COLOR[crowd2] || 'var(--muted)',
        note: !r.error && first === null ? ntuStatus(svc) : null,
      });
    },
  });
}

// Route view: expanded stop shows an arrival row per NTU route calling at that stop.
async function ntuRowsHtml(code) {
  const entries = ntuEntriesAtStop(code);
  const { results, busRes } = await _ntuLoadAt(entries);
  const html = entries.map(({ svc, stop }, i) => {
    const r = results[i];
    // No arrivals (e.g. Green doesn't run on weekends): hide the row. Errors still show so failures aren't silent.
    if (!r.error && r.ETA == null && r.NextETA == null) return '';
    const [crowd1, crowd2] = ntuCrowdForStop(svc, stop.NtuStopName, busRes[i].buses);
    return campusRowHtml({
      svc, code, opClass: 'op-ntu', route: `NTU ${svc.NtuRoute}`, label: 'Campus Loop',
      cells: campusRowCell(r.ETA, crowd1, r.error) + campusRowCell(r.NextETA, crowd2, r.error) + '<div class="rs-time-cell"></div>',
    });
  }).join('');
  return html + (results.some(r => r.error) ? campusRowsError('NTU') : '');
}

// ── Live map ──────────────────────────────────────────────────────────────────
// "Live" button → shared stop-map modal (campus.js): loop lines + stops + one marker per active bus.
// Data is fetchNtuBuses (worker caches 30s), polled just above the client TTL. NTU gives no bus id, so each
// poll's positions are matched to the previous markers by nearest distance, which lets markers glide.
const NTU_LIVE_MATCH_DEG = 0.004;   // ~440m: further than a bus moves in one poll, so treat as a different bus
let _ntuLive = null;                // { routes, layer, poll, tick, updatedAt, failed, busy }

function ntuLiveButton(serviceNo) { return campusLiveButton('ntuLiveOpen', serviceNo); }
function ntuLiveStop() { campusLiveClear(_ntuLive); _ntuLive = null; }
function _ntuLiveStatus() {
  if (_ntuLive) campusLiveStatus(_ntuLive, _ntuLive.routes.reduce((a, r) => a + r.markers.length, 0));
}

const _ntuBusTip = (route, crowd) => campusBusTip(route.svc, `NTU ${route.svc.NtuRoute}`, crowd, '', '#B5121B');

// Reconcile one route's markers with a fresh list of positions.
function _ntuLiveSync(live, route, buses) {
  const old = route.markers, pairs = [];
  buses.forEach((b, bi) => old.forEach((m, mi) => {
    const ll = m.getLatLng();
    pairs.push({ bi, mi, d: Math.hypot(b.lat - ll.lat, b.lng - ll.lng) });
  }));
  pairs.sort((a, b) => a.d - b.d);
  const usedB = new Set(), usedM = new Set(), next = [];
  for (const p of pairs) {
    if (p.d > NTU_LIVE_MATCH_DEG || usedB.has(p.bi) || usedM.has(p.mi)) continue;
    usedB.add(p.bi); usedM.add(p.mi);
    const m = old[p.mi], b = buses[p.bi];
    if (campusBusUpdate(m, b)) m.setTooltipContent(_ntuBusTip(route, b.crowd));
    next.push(m);
  }
  buses.forEach((b, bi) => {
    if (!usedB.has(bi)) next.push(campusBusMarker(live.layer, b, route.color, _ntuBusTip(route, b.crowd)));
  });
  old.forEach((m, mi) => { if (!usedM.has(mi)) live.layer.removeLayer(m); });
  route.markers = next;
}

async function _ntuLivePoll(live) {
  if (_ntuLive !== live || document.hidden || live.busy) return;
  live.busy = true;
  try {
    const res = await Promise.all(live.routes.map(r => fetchNtuBuses(r.svc.NtuRoute)));
    if (_ntuLive !== live) return;
    live.failed = res.some(r => r.failed);
    let oldest = null;
    res.forEach((r, i) => {
      if (r.failed) return; // keep the last known positions; they're greyed out as stale
      _ntuLiveSync(live, live.routes[i], r.buses);
      const t = r.fetchedAt ? Date.parse(r.fetchedAt) : Date.now();
      oldest = oldest === null ? t : Math.min(oldest, t);
    });
    if (oldest !== null) live.updatedAt = oldest;
    _ntuLiveStatus();
  } finally { live.busy = false; }
}

// Stop popup: NTU rows for every route at the stop, plus public buses when it has a real LTA code.
function _ntuStopPopup(map, stop) {
  const entries = ntuEntriesAtStop(stop.BusStopCode);
  return campusStopPopup(map, stop, async () => {
    const { results, busRes } = await _ntuLoadAt(entries);
    const rows = entries.map(({ svc, stop: eStop }, i) => {
      const r = results[i];
      if (!r.error && r.ETA == null && r.NextETA == null) return '';
      const status = !r.error && r.ETA == null ? ntuStatus(svc) : null;
      const [crowd1, crowd2] = ntuCrowdForStop(svc, eStop.NtuStopName, busRes[i].buses);
      const eta1 = r.error ? '—' : (campusMins(r.ETA) ?? '—');
      const eta2 = r.error ? null : campusMins(r.NextETA);
      return campusPopupRow(`NTU ${svc.NtuRoute}`, svc.Color || '#B5121B', '#fff',
        status || eta1, status ? 'transparent' : (CAMPUS_CROWD_RING[crowd1] || '#888'),
        status ? null : eta2, CAMPUS_CROWD_RING[crowd2] || '#888');
    }).join('');
    return { rows };
  }, { publicFirst: true });
}

function ntuLiveOpen(serviceNo) {
  const svc = ntuServiceByNo(serviceNo);
  if (!svc || typeof L === 'undefined') return;
  ntuLiveStop();
  const { map, color, line } = campusLiveMapOpen(svc, {
    label: `NTU ${svc.NtuRoute}`, nameKey: 'NtuStopName', defaultColor: '#B5121B',
    defaultCentre: [1.3483, 103.6831], popupFn: _ntuStopPopup,
  });

  const live = _ntuLive = { routes: [{ svc, color, markers: [] }], layer: L.layerGroup().addTo(map), updatedAt: null, failed: false, busy: false };
  // Loop lines: road path from assets/ntu-paths.json when there is one, else straight lines closed into a loop.
  campusPaths('./assets/ntu-paths.json').then(paths => {
    if (_ntuLive === live) campusDrawRoute(map, svc, svc.NtuRoute, line, color, paths); // else modal closed meanwhile
  });
  live.poll = setInterval(() => _ntuLivePoll(live), CAMPUS_LIVE_POLL_MS);
  live.tick = setInterval(_ntuLiveStatus, 1000);
  _ntuLiveStatus();
  _ntuLivePoll(live);
}

// Coming back to the tab: refresh straight away instead of waiting for the next tick.
document.addEventListener('visibilitychange', () => { if (!document.hidden && _ntuLive) _ntuLivePoll(_ntuLive); });