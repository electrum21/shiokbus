/* ── NUS INTERNAL SHUTTLES (nus.js) ───────────────────────────────────────────
 * Everything NUS-specific lives here (the NUS counterpart of ntu.js); code shared with NTU is in
 * campus.js. Loaded as a plain <script> AFTER campus.js and BEFORE app.js; it only defines things,
 * nothing runs until app.js calls it.
 *
 * Data: ./assets/nus-shuttle.json (built by helper_scripts/nus/build_nus_assets.py) is merged into
 * PRIVATE_SERVICES by app.js (fetchPBSServices). A stop NUS shares with public buses uses its real LTA
 * code; NUS-only stops use a synthetic "NUS-<n>" code (NUS-1, NUS-2, ...). Either way the live lookup
 * uses NusStopName (the name the feed is queried with), never the code.
 *
 * One Worker call per STOP returns every route calling there (up to 3 ETAs each, in seconds), so a stop
 * served by A1 + D1 + R1 costs one request. First/last bus comes from svc.Schedule (NUS's published timetable).
 *
 * Bus positions + crowd come from a second feed, one call per ROUTE (Worker endpoint NusBuses, which
 * proxies nusbus.app/api/active-bus?route_code=A1 and returns { buses: [{ id, lat, lng, heading, crowd, ridership, capacity }], fetchedAt }). The ETA feed has no vehicle id, so crowd on an ETA is
 * an estimate: each active bus is snapped to its nearest stop and ranked by stops-to-go (campus.js).
 * The same feed drives the Live map (nusLiveOpen).
 *
 * app.js calls into this file through:
 *   loadNusServices()                 fetch + parse nus-shuttle.json ({} on failure)
 *   nusResetIndex() / nusIndexStop()  build NUS_STOP_INDEX while injecting private services
 *   hasNus(code) / isNusCode(code)    "NUS serves this code" / "NUS code, no LTA data"
 *   renderNusStopCards(code, n)       stop view: NUS cards appended after the public ones
 *   nusRowsHtml(code)                 route view: NUS arrival rows (HTML string)
 *   nusLoopLabel(info, fallbackOrig)  "first ↻ last" (loops) or "first → last" label
 *   nusRouteTimes(svc)                first/last bus fields for the route view's timing grid
 *   nusLiveButton(serviceNo) / nusLiveOpen(serviceNo) / nusLiveStop()   route-view Live map
 * ──────────────────────────────────────────────────────────────────────────── */

let NUS_STOP_INDEX = {};   // BusStopCode (real LTA code or NUS-<n>) → [{ svc, stop }, ...]

function nusResetIndex() { NUS_STOP_INDEX = {}; }
function nusIndexStop(svc, stop) { campusIndexStop(NUS_STOP_INDEX, svc, stop); }
function loadNusServices() { return campusLoadJson('./assets/nus-shuttle.json'); }

function isNusCode(code) { return typeof code === 'string' && code.startsWith('NUS-'); }
function hasNus(code) { return !!NUS_STOP_INDEX[code]; }
function nusEntriesAtStop(code) { return NUS_STOP_INDEX[code] || []; }

const nusServiceByNo = serviceNo => campusServiceByNo('_isNus', serviceNo);
// Loops read "first ↻ last"; point-to-point routes (R1, R2) read "first → last".
function nusLoopLabel(info, fallbackOrig) { return campusLoopLabel(nusServiceByNo(info?.ServiceNo), info, fallbackOrig); }

// First / last bus from NUS's published timetable (24h "HH:MM"); a missing day means no service.
const nusRouteTimes = campusRouteTimes;
const nusStatus = campusStatus;

// ── Live ETAs ─────────────────────────────────────────────────────────────────
const NUS_ETA_TTL_MS = 20000;
const NUS_BUSES_TTL_MS = 10000;   // positions are polled faster than ETAs (live map)
const _nusEtaCache = new Map();   // stopName → { t, promise }
const _nusBusCache = new Map();   // route → { t, promise }

// Resolves { routes: { A1: [sec, sec, sec], … }, base } or { error } — never throws.
// "base" is the moment the seconds are measured from: NUS's own timestamp when it is plausible
// (0–120 s old), otherwise the moment we received the response (guards against a skewed device clock).
function fetchNusEta(stopName) {
  return campusCached(_nusEtaCache, stopName, NUS_ETA_TTL_MS, async () => {
    try {
      const r = await campusProxy(`endpoint=NusShuttle&BusStopName=${encodeURIComponent(stopName)}`);
      if (!r.ok || r.json.error || !Array.isArray(r.json.shuttles)) return { error: r.json.error || ('http ' + r.status) };
      const recv = Date.now();
      const asOf = Date.parse(r.json.asOf);
      const age = recv - asOf;
      const base = Number.isFinite(asOf) && age >= 0 && age <= 120000 ? asOf : recv;
      const routes = {};
      for (const s of r.json.shuttles) routes[s.route] = (s.etas || []).map(e => e.sec).filter(Number.isFinite);
      return { routes, base };
    } catch (e) { return { error: 'network' }; }
  }, r => r.error); // don't cache failures
}

// Minutes until each upcoming bus of one route at this stop (soonest first), recomputed from the
// seconds at call time so a cached response never shows stale minutes. Buses >30 s past are dropped.
function nusMinsFor(res, route, now = Date.now()) {
  if (!res || res.error) return null;
  const secs = res.routes[route];
  if (!secs) return [];
  const elapsed = (now - res.base) / 1000;
  return secs.map(s => s - elapsed).filter(r => r > -30).map(r => Math.max(0, Math.round(r / 60)));
}

// ── Active buses + crowd ──────────────────────────────────────────────────────
// crowdLevel from the feed ("low" | "medium" | "high") → the same keys NTU uses (SEA / SDA / LSD).
// Falls back to occupancy (0–1) if the level is missing or a value we don't know.
function nusCrowdKey(load) {
  const lvl = String(load?.crowdLevel || '').toLowerCase();
  if (lvl === 'low') return 'SEA';
  if (lvl === 'medium' || lvl === 'moderate' || lvl === 'mid') return 'SDA';
  if (lvl === 'high' || lvl === 'full') return 'LSD';
  const o = Number(load?.occupancy);
  if (!Number.isFinite(o)) return null;
  return o < 0.5 ? 'SEA' : o < 0.85 ? 'SDA' : 'LSD';
}

// Resolves { buses: [{ plate, lat, lng, heading, speed, crowd, ridership, capacity }], fetchedAt } or
// { buses: [], failed: true }. Never throws, so ETAs still render when this feed is down.
// Accepts the raw nusbus.app shape ({ ActiveBusResult: { TimeStamp, activebus: [...] } }) or an already
// normalised { buses: [...] } from the Worker.
function fetchNusBuses(route) {
  return campusCached(_nusBusCache, route, NUS_BUSES_TTL_MS, async () => {
    try {
      const r = await campusProxy(`endpoint=NusBuses&RouteCode=${encodeURIComponent(route)}`);
      if (!r.ok || r.json.error) return { buses: [], failed: true };
      const raw = r.json.ActiveBusResult;
      if (!raw && !Array.isArray(r.json.buses)) return { buses: [], failed: true };
      const list = raw ? (raw.activebus || []) : r.json.buses;
      const buses = list.map(b => ({
        plate: b.vehplate || b.id || b.plate || '', // Worker sends an opaque id, never the plate
        lat: Number(b.lat), lng: Number(b.lng),
        heading: Number.isFinite(Number(b.direction ?? b.heading)) ? Number(b.direction ?? b.heading) : null,
        speed: Number(b.speed),
        crowd: b.crowd || nusCrowdKey(b.loadInfo),
        ridership: b.loadInfo?.ridership ?? b.ridership, capacity: b.loadInfo?.capacity ?? b.capacity,
      })).filter(b => Number.isFinite(b.lat) && Number.isFinite(b.lng));
      return { buses, fetchedAt: raw?.TimeStamp || r.json.fetchedAt };
    } catch (e) { return { buses: [], failed: true }; }
  }, r => r.failed);
}

// Crowd of the next three buses to reach a stop (soonest first), as [c1, c2, c3].
const nusCrowdForStop = (svc, stopName, buses) => campusCrowdForStop(svc, 'NusStopName', stopName, buses, 3);

// One ETA call per stop covers every route there; bus positions are one call per route.
async function _nusLoadAt(entries) {
  const [res, busRes] = await Promise.all([
    fetchNusEta(entries[0].stop.NusStopName),
    Promise.all(entries.map(e => fetchNusBuses(e.svc.NusRoute))),
  ]);
  return { res, busRes };
}

// Stop view: one bus-card per NUS route at this stop, filled in when the ETA call returns.
function renderNusStopCards(code, publicCount) {
  if (!hasNus(code)) return;
  const entries = nusEntriesAtStop(code);
  return campusRenderStopCards({
    code, publicCount, entries, wrapId: 'nus-cards', load: () => _nusLoadAt(entries),
    buildCard: ({ svc, stop }, i, { res, busRes }) => {
      const mins = nusMinsFor(res, svc.NusRoute);
      const first = mins && mins.length ? campusMins(mins[0]) : null;
      const next = mins && mins.length > 1 ? campusMins(mins[1]) : null;
      const [crowd1, crowd2] = nusCrowdForStop(svc, stop.NusStopName, busRes[i].buses);
      return campusCardHtml({
        svc, code, delay: publicCount + i, opClass: 'op-nus', tag: 'NUS', route: svc.NusRoute, first, next,
        lc1: CAMPUS_LOAD_COLOR[crowd1] || 'var(--muted)', lc2: CAMPUS_LOAD_COLOR[crowd2] || 'var(--muted)',
        note: res.error ? 'ETA unavailable' : (first === null ? (nusStatus(svc) || 'No buses right now') : ''),
      });
    },
  });
}

// Route view: expanded stop shows an arrival row per NUS route calling at that stop.
async function nusRowsHtml(code) {
  const entries = nusEntriesAtStop(code);
  if (!entries.length) return '';
  const { res, busRes } = await _nusLoadAt(entries);
  const html = entries.map(({ svc, stop }, i) => {
    const m = nusMinsFor(res, svc.NusRoute) || [];
    // No buses for this route right now: hide the row. Errors still show so failures aren't silent.
    if (!res.error && !m.length) return '';
    const crowd = nusCrowdForStop(svc, stop.NusStopName, busRes[i].buses);
    return campusRowHtml({
      svc, code, opClass: 'op-nus', route: `NUS ${svc.NusRoute}`, label: 'Campus shuttle',
      cells: campusRowCell(m[0] ?? null, crowd[0]) + campusRowCell(m[1] ?? null, crowd[1]) + campusRowCell(m[2] ?? null, crowd[2]),
    });
  }).join('');
  return html + (res.error ? '<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> NUS shuttle ETAs are unavailable right now.</div>' : '');
}

// ── Live map ──────────────────────────────────────────────────────────────────
// "Live" button on an NUS route → shared stop-map modal (campus.js): route line + stops + one marker per
// active bus (ring = crowd, arrow = heading). The feed carries a plate per bus, so markers are matched by
// plate and glide between polls.
let _nusLive = null;   // { svc, color, layer, markers: Map(plate → marker), poll, tick, updatedAt, failed, busy }

function nusLiveButton(serviceNo) { return campusLiveButton('nusLiveOpen', serviceNo); }
function nusLiveStop() { campusLiveClear(_nusLive); _nusLive = null; }
function _nusLiveStatus() { if (_nusLive) campusLiveStatus(_nusLive, _nusLive.markers.size); }

function _nusBusTip(svc, b) {
  const load = Number.isFinite(b.ridership) && Number.isFinite(b.capacity) ? ` (${b.ridership}/${b.capacity})` : '';
  return campusBusTip(svc, `NUS ${svc.NusRoute}`, b.crowd, load, '#003D7C');
}

// Reconcile markers with a fresh list of buses, keyed by plate.
function _nusLiveSync(live, buses) {
  const seen = new Set();
  buses.forEach((b, i) => {
    const key = b.plate || ('bus' + i);
    seen.add(key);
    const m = live.markers.get(key);
    if (!m) { live.markers.set(key, campusBusMarker(live.layer, b, live.color, _nusBusTip(live.svc, b))); return; }
    campusBusUpdate(m, b);
    m.setTooltipContent(_nusBusTip(live.svc, b)); // load count changes as people board
  });
  for (const [key, m] of live.markers) if (!seen.has(key)) { live.layer.removeLayer(m); live.markers.delete(key); }
}

async function _nusLivePoll(live) {
  if (_nusLive !== live || document.hidden || live.busy) return;
  live.busy = true;
  try {
    const r = await fetchNusBuses(live.svc.NusRoute);
    if (_nusLive !== live) return;
    live.failed = !!r.failed;
    if (!r.failed) { // on failure keep the last known positions; they're greyed out as stale
      _nusLiveSync(live, r.buses);
      const t = r.fetchedAt ? Date.parse(r.fetchedAt) : NaN;
      live.updatedAt = Number.isFinite(t) && Math.abs(Date.now() - t) < 600000 ? t : Date.now(); // guard against a skewed clock
    }
    _nusLiveStatus();
  } finally { live.busy = false; }
}

// Stop popup: arrivals for every NUS route calling at the stop (not just the one being viewed), then
// public buses when the stop has a real LTA code.
function _nusStopPopup(map, stop) {
  const entries = nusEntriesAtStop(stop.BusStopCode);
  return campusStopPopup(map, stop, async () => {
    if (!entries.length) return { rows: '' };
    const { res, busRes } = await _nusLoadAt(entries);
    const rows = entries.map(({ svc, stop: eStop }, i) => {
      const mins = nusMinsFor(res, svc.NusRoute);
      const has = mins && mins.length;
      const badge = `NUS ${svc.NusRoute}`, bg = svc.Color || '#003D7C', fg = svc.TextColor || '#fff';
      if (res && !res.error && !has) {
        // No buses for this route: only show a row when the schedule explains why (not running / ended).
        const note = nusStatus(svc);
        return note ? campusPopupRow(badge, bg, fg, note, 'transparent', null, null) : '';
      }
      const [c1, c2] = nusCrowdForStop(svc, eStop.NusStopName, busRes[i].buses);
      return campusPopupRow(badge, bg, fg, has ? campusMins(mins[0]) : '—', CAMPUS_CROWD_RING[c1] || '#888',
        has && mins.length > 1 ? campusMins(mins[1]) : null, CAMPUS_CROWD_RING[c2] || '#888');
    }).join('');
    return { rows, error: res.error ? 'NUS ETAs unavailable right now.' : '' };
  });
}

function nusLiveOpen(serviceNo) {
  const svc = nusServiceByNo(serviceNo);
  if (!svc || typeof L === 'undefined') return;
  ntuLiveStop();
  nusLiveStop();
  const { map, color, line } = campusLiveMapOpen(svc, {
    label: `NUS ${svc.NusRoute}`, nameKey: 'NusStopName', defaultColor: '#003D7C',
    defaultCentre: [1.2966, 103.7764], popupFn: _nusStopPopup,
  });

  const live = _nusLive = { svc, color, layer: L.layerGroup().addTo(map), markers: new Map(), updatedAt: null, failed: false, busy: false };
  // Route line: road path from assets/nus-paths.json when there is one, else straight lines (closed for loops).
  campusPaths('./assets/nus-paths.json').then(paths => {
    if (_nusLive === live) campusDrawRoute(map, svc, svc.NusRoute, line, color, paths); // else modal closed meanwhile
  });
  live.poll = setInterval(() => _nusLivePoll(live), CAMPUS_LIVE_POLL_MS);
  live.tick = setInterval(_nusLiveStatus, 1000);
  _nusLiveStatus();
  _nusLivePoll(live);
}

// Coming back to the tab: refresh straight away instead of waiting for the next tick.
document.addEventListener('visibilitychange', () => { if (!document.hidden && _nusLive) _nusLivePoll(_nusLive); });