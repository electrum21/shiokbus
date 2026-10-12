/* ── NUS INTERNAL SHUTTLES (nus.js) ───────────────────────────────────────────
 * Everything NUS-specific that isn't just a view flag lives here (the NUS counterpart of ntu.js).
 * Loaded as a plain <script> BEFORE app.js; it only defines things, nothing runs until app.js calls it.
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
 * an estimate: each active bus is snapped to its nearest stop and ranked by stops-to-go (same idea as ntu.js).
 * The same feed drives the Live map (nusLiveOpen).
 *
 * app.js calls into this file through:
 *   loadNusServices()                 fetch + parse nus-shuttle.json ({} on failure)
 *   nusResetIndex() / nusIndexStop()  build NUS_STOP_INDEX while injecting private services
 *   hasNus(code) / isNusCode(code)    "NUS serves this code" / "NUS code, no LTA data"
 *   renderNusStopCards(code, n)       stop view: NUS cards appended after the public ones
 *   nusRowsHtml(code)                 route view: NUS arrival rows (HTML string)
 *   nusLoopLabel(info, fallbackOrig)  "first ↻ last" (loops) or "first → last" label
 *   nusLiveButton(serviceNo) / nusLiveOpen(serviceNo) / nusLiveStop()   route-view Live map
 *
 * This file expects these globals from app.js (used at call time only): PROXY_URL, getProxyHeaders,
 * busTypeIcon, favSvcId, PRIVATE_SERVICES, plus goToService / addSvcFavSmart in onclick handlers.
 * ──────────────────────────────────────────────────────────────────────────── */

let NUS_STOP_INDEX = {};   // BusStopCode (real LTA code or NUS-<n>) → [{ svc, stop }, ...]

function nusResetIndex() { NUS_STOP_INDEX = {}; }
function nusIndexStop(svc, stop) {
  const list = (NUS_STOP_INDEX[stop.BusStopCode] ||= []);
  if (!list.some(e => e.svc === svc)) list.push({ svc, stop }); // a route may pass the same stop twice
}

async function loadNusServices() {
  try {
    const res = await fetch('./assets/nus-shuttle.json');
    return res.ok ? await res.json() : {};
  } catch (e) { console.error('nus-shuttle.json', e); return {}; }
}

function isNusCode(code) { return typeof code === 'string' && code.startsWith('NUS-'); }
function hasNus(code) { return !!NUS_STOP_INDEX[code]; }
function nusEntriesAtStop(code) { return NUS_STOP_INDEX[code] || []; }

// The NUS service object (from PRIVATE_SERVICES) for a ServiceNo like "NUS A1".
function nusServiceByNo(serviceNo) {
  const norm = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return Object.values(PRIVATE_SERVICES || {}).find(p => p._isNus && norm(p.ServiceNo) === norm(serviceNo));
}

// Loops read "first ↻ last"; point-to-point routes (R1, R2) read "first → last".
function nusLoopLabel(info, fallbackOrig) {
  const svc = nusServiceByNo(info?.ServiceNo);
  const stops = svc?.Directions?.['1']?.Stops || [];
  const first = stops[0]?.Description || info?.OriginDesc || fallbackOrig || '';
  const last = stops[stops.length - 1]?.Description || '';
  if (svc && !svc._isLoop) return last && last !== first ? `${first} → ${last}` : first;
  return last && last !== first ? `${first} ↻ ${last}` : `${first} ↻`;
}

// ── First / last bus ──────────────────────────────────────────────────────────
// svc.Schedule: { 'Mon-Fri'|'Sat'|'Sun': { first, last } } in 24h "HH:MM" (from NUS's published timetable).
// A missing day key means no service that day. Public holidays use the Sun entry.
const NUS_DAY_KEYS = ['Sun', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Sat']; // by Date.getDay()

// Same field names the LTA route stops use, so the route view's per-stop timing grid renders them as is.
function nusRouteTimes(svc) {
  const s = svc?.Schedule || {};
  const t = (day, f) => (s[day] ? s[day][f].replace(':', '') : '-');
  return {
    WD_FirstBus: t('Mon-Fri', 'first'), WD_LastBus: t('Mon-Fri', 'last'),
    SAT_FirstBus: t('Sat', 'first'), SAT_LastBus: t('Sat', 'last'),
    SUN_FirstBus: t('Sun', 'first'), SUN_LastBus: t('Sun', 'last'),
  };
}

// Short note for when a route has no ETA: null when the route should be running (or has no schedule data).
function nusStatus(svc, now = new Date()) {
  const sched = svc?.Schedule;
  if (!sched || !Object.keys(sched).length) return null;
  const holiday = typeof isTodayPublicHoliday === 'function' && isTodayPublicHoliday();
  const today = sched[holiday ? 'Sun' : NUS_DAY_KEYS[now.getDay()]];
  if (!today) return 'No service today';
  const mins = t => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const n = now.getHours() * 60 + now.getMinutes();
  if (n < mins(today.first)) return `First bus ${today.first}`;
  if (n > mins(today.last)) return `Service ended · last bus ${today.last}`;
  return null;
}

// Route pill colours: background from the route, text colour per route (yellow A2 and grey P need dark text).
// --pill-fg also reaches the nested labels (see .op-nus rules in styles.css).
function _nusPillStyle(svc) {
  return svc.Color ? `background:${svc.Color};color:${svc.TextColor || '#fff'};--pill-fg:${svc.TextColor || '#fff'}` : '';
}

// ── Live ETAs ─────────────────────────────────────────────────────────────────
const NUS_ETA_TTL_MS = 20000;
const _nusEtaCache = new Map(); // stopName → { t, promise }

// Resolves { routes: { A1: [sec, sec, sec], … }, base } or { error } — never throws.
// "base" is the moment the seconds are measured from: NUS's own timestamp when it is plausible
// (0–120 s old), otherwise the moment we received the response (guards against a skewed device clock).
function fetchNusEta(stopName) {
  const hit = _nusEtaCache.get(stopName);
  if (hit && Date.now() - hit.t < NUS_ETA_TTL_MS) return hit.promise;
  const promise = (async () => {
    try {
      const url = `${PROXY_URL}?endpoint=NusShuttle&BusStopName=${encodeURIComponent(stopName)}`;
      const res = await fetch(url, { headers: await getProxyHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error || !Array.isArray(json.shuttles)) return { error: json.error || ('http ' + res.status) };
      const recv = Date.now();
      const asOf = Date.parse(json.asOf);
      const age = recv - asOf;
      const base = Number.isFinite(asOf) && age >= 0 && age <= 120000 ? asOf : recv;
      const routes = {};
      for (const s of json.shuttles) routes[s.route] = (s.etas || []).map(e => e.sec).filter(Number.isFinite);
      return { routes, base };
    } catch (e) { return { error: 'network' }; }
  })();
  _nusEtaCache.set(stopName, { t: Date.now(), promise });
  promise.then(r => { if (r.error) _nusEtaCache.delete(stopName); }); // don't cache failures
  return promise;
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

function _nusMins(m) { return m === null || m === undefined ? null : (m <= 0 ? 'ARR' : m + ' min'); }

// ── Active buses + crowd ──────────────────────────────────────────────────────
const NUS_BUSES_TTL_MS = 10000;   // positions are polled faster than ETAs (live map)
const _nusBusCache = new Map();   // route → { t, promise }

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
  const hit = _nusBusCache.get(route);
  if (hit && Date.now() - hit.t < NUS_BUSES_TTL_MS) return hit.promise;
  const promise = (async () => {
    try {
      const url = `${PROXY_URL}?endpoint=NusBuses&RouteCode=${encodeURIComponent(route)}`;
      const res = await fetch(url, { headers: await getProxyHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) return { buses: [], failed: true };
      const raw = json.ActiveBusResult;
      if (!raw && !Array.isArray(json.buses)) return { buses: [], failed: true };
      const list = raw ? (raw.activebus || []) : json.buses;
      const buses = list.map(b => ({
        plate: b.vehplate || b.id || b.plate || '', // Worker sends an opaque id, never the plate
        lat: Number(b.lat), lng: Number(b.lng),
        heading: Number.isFinite(Number(b.direction ?? b.heading)) ? Number(b.direction ?? b.heading) : null,
        speed: Number(b.speed),
        crowd: b.crowd || nusCrowdKey(b.loadInfo),
        ridership: b.loadInfo?.ridership ?? b.ridership, capacity: b.loadInfo?.capacity ?? b.capacity,
      })).filter(b => Number.isFinite(b.lat) && Number.isFinite(b.lng));
      return { buses, fetchedAt: raw?.TimeStamp || json.fetchedAt };
    } catch (e) { return { buses: [], failed: true }; }
  })();
  _nusBusCache.set(route, { t: Date.now(), promise });
  promise.then(r => { if (r.failed) _nusBusCache.delete(route); }); // don't cache failures
  return promise;
}

const NUS_LOAD_COLOR = { SEA: 'var(--green)', SDA: '#FF8C00', LSD: '#FF3333' };
const NUS_CROWD_RING = { SEA: '#43C463', SDA: '#FF8C00', LSD: '#E53935' };
const NUS_CROWD_LABEL = { SEA: 'Seats available', SDA: 'Standing available', LSD: 'Limited standing' };

// Estimated crowd of the next buses to reach a stop (soonest first), as [c1, c2, c3].
// Each active bus is snapped to its nearest stop on the route and ranked by stops to go. On a loop the
// bus keeps circling, so a bus just past the stop is a full lap away; on R1/R2 (one way) it is dropped.
// Approximate where a loop doubles back near itself.
function nusCrowdForStop(svc, stopName, buses) {
  const stops = svc?.Directions?.['1']?.Stops || [];
  const n = stops.length;
  const target = stops.findIndex(s => s.NusStopName === stopName);
  if (target < 0 || !buses || !buses.length) return [];
  const loop = svc._isLoop !== false;
  const rad = x => x * Math.PI / 180;
  const dist = (b, s) => Math.hypot(rad(b.lat - s.Latitude), rad(b.lng - s.Longitude) * Math.cos(rad(b.lat)));
  return buses.map(b => {
    let near = 0, best = Infinity;
    stops.forEach((s, i) => {
      if (s.Latitude == null || s.Longitude == null) return;
      const d = dist(b, s);
      if (d < best) { best = d; near = i; }
    });
    return { crowd: b.crowd, away: loop ? (target - near + n) % n : target - near };
  }).filter(x => x.away >= 0).sort((a, b) => a.away - b.away).slice(0, 3).map(x => x.crowd);
}

// Stop view: one bus-card per NUS route at this stop, filled in when the ETA call returns.
async function renderNusStopCards(code, publicCount) {
  if (!hasNus(code)) return;
  const entries = nusEntriesAtStop(code);
  const host = document.getElementById('results-stop');
  if (!host || !entries.length) return;
  const label = host.querySelector('.results-label');
  if (label) label.textContent = `${publicCount + entries.length} services`;
  const wrap = document.createElement('div');
  wrap.id = 'nus-cards';
  host.appendChild(wrap);
  const [res, busRes] = await Promise.all([
    fetchNusEta(entries[0].stop.NusStopName),
    Promise.all(entries.map(e => fetchNusBuses(e.svc.NusRoute))),
  ]);
  if (document.getElementById('nus-cards') !== wrap) return; // user navigated away mid-fetch
  wrap.innerHTML = entries.map(({ svc, stop }, i) => {
    const mins = nusMinsFor(res, svc.NusRoute);
    const first = mins && mins.length ? _nusMins(mins[0]) : null;
    const next = mins && mins.length > 1 ? _nusMins(mins[1]) : null;
    const [crowd1, crowd2] = nusCrowdForStop(svc, stop.NusStopName, busRes[i].buses);
    const lc1 = NUS_LOAD_COLOR[crowd1] || 'var(--muted)';
    const lc2 = NUS_LOAD_COLOR[crowd2] || 'var(--muted)';
    const note = res.error ? 'ETA unavailable' : (first === null ? (nusStatus(svc) || 'No buses right now') : '');
    const big = first === 'ARR' ? 'ARR' : first ? first.replace(' min', '') : '—';
    const unit = first && first !== 'ARR' ? 'min' : '';
    const fav = (window._favs || {})['svc_' + favSvcId(svc.ServiceNo)];
    return `
    <div class="bus-card" style="animation-delay:${(publicCount + i) * .09}s">
      <div class="card-top">
        <div class="bus-num-col op-nus" onclick="goToService('${svc.ServiceNo}', '${code}')" style="position:relative;${_nusPillStyle(svc)}">
          <div class="bus-num-from">NUS</div>
          <div class="bus-num">${svc.NusRoute}</div>
          <div class="bus-num-to">Campus shuttle</div>
        </div>
        <div class="card-middle">
          <div class="arrival-row">
            <div class="first-timing"><div class="mins-big">${big}</div><div class="mins-unit">${unit}</div></div>
            ${next ? `<div class="next-pill"><span>${next}</span>${busTypeIcon('SD', true, lc2)}</div>` : ''}
          </div>
          ${first !== null ? `<div class="bus-type-tag">${busTypeIcon('SD', false, lc1)}</div>` : (note ? `<div class="bus-type-tag" style="color:var(--muted);font-size:11px">${note}</div>` : '')}
        </div>
        <div class="card-right">
          <button class="sun-toggle-btn fav-btn" data-key="svc_${favSvcId(svc.ServiceNo)}" onclick="event.stopPropagation();addSvcFavSmart('${svc.ServiceNo}')" style="background:none;justify-content:center;font-size:16px;color:${fav ? 'var(--yellow)' : 'var(--muted)'}">${fav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Route view: expanded stop shows an arrival row per NUS route calling at that stop.
async function nusRowsHtml(code) {
  const entries = nusEntriesAtStop(code);
  if (!entries.length) return '';
  const [res, busRes] = await Promise.all([
    fetchNusEta(entries[0].stop.NusStopName),
    Promise.all(entries.map(e => fetchNusBuses(e.svc.NusRoute))),
  ]);
  const cell = (m, crowd) => {
    const has = m !== null && m !== undefined;
    const icon = has ? `<div class="rs-time-meta">${busTypeIcon('SD', true, NUS_LOAD_COLOR[crowd] || 'var(--muted)')}</div>` : '';
    return `<div class="rs-time-cell"><span class="rs-time-main${has && m <= 1 ? ' arriving' : ''}">${has ? (m <= 0 ? 'Arr' : m + ' min') : '—'}</span>${icon}</div>`;
  };
  const html = entries.map(({ svc, stop }, i) => {
    const mins = nusMinsFor(res, svc.NusRoute);
    // No buses for this route right now: hide the row. Errors still show so failures aren't silent.
    if (!res.error && !(mins && mins.length)) return '';
    const m = mins || [];
    const crowd = nusCrowdForStop(svc, stop.NusStopName, busRes[i].buses);
    return `<div class="rs-arrival-row">
      <div class="rs-svc-col op-nus" style="${_nusPillStyle(svc)}" onclick="goToService('${svc.ServiceNo}', '${code}')">NUS ${svc.NusRoute}<div class="rs-dest-label">Campus shuttle</div></div>
      ${cell(m[0] ?? null, crowd[0])}${cell(m[1] ?? null, crowd[1])}${cell(m[2] ?? null, crowd[2])}
    </div>`;
  }).join('');
  return html + (res.error ? '<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> NUS shuttle ETAs are unavailable right now.</div>' : '');
}

// Road-following paths: assets/nus-paths.json = { "<NusRoute>": "<encoded polyline>" | [[lat, lng], ...] }.
// Optional: a missing file or route falls back to straight lines between stops.
let _nusPathsP = null;
function nusPaths() {
  return _nusPathsP ||= fetch('./assets/nus-paths.json')
    .then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(raw => {
      const out = {};
      for (const k in raw) {
        const v = raw[k];
        if (typeof v === 'string') out[k] = _nusDecodePolyline(v);
        else if (Array.isArray(v) && v.length > 1) out[k] = v;
      }
      return out;
    });
}
function _nusDecodePolyline(str) {   // Google encoded polyline, precision 5
  const pts = []; let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (let axis = 0; axis < 2; axis++) {
      let shift = 0, result = 0, b;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
      const d = (result & 1) ? ~(result >> 1) : (result >> 1);
      if (axis === 0) lat += d; else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

// ── Live map ──────────────────────────────────────────────────────────────────
// "Live" button on an NUS route → reuses the stop-map modal (shared with NTU): route line + stops + one
// marker per active bus (ring = crowd, arrow = heading). Polled only while the modal is open and the
// tab is visible. The feed carries a plate per bus, so markers are matched by plate and glide between polls.
const NUS_LIVE_POLL_MS = 15000;
const NUS_LIVE_STALE_S = 90;
let _nusLive = null;   // { svc, color, layer, markers: Map(plate → marker), poll, tick, updatedAt, failed, busy }

function nusLiveButton(serviceNo) {
  return `<button class="ntu-live-btn" style="margin-left:auto;flex-shrink:0;padding:5px 10px;font-size:12px" onclick="event.stopPropagation();nusLiveOpen('${serviceNo}')"><i class="fa-solid fa-location-crosshairs"></i> Live</button>`;
}

function nusLiveStop() {
  if (_nusLive) { clearInterval(_nusLive.poll); clearInterval(_nusLive.tick); _nusLive = null; }
  const st = document.getElementById('stop-map-live'); if (st) st.style.display = 'none';
  const ti = document.getElementById('stop-map-title'); if (ti) ti.textContent = 'Stop Location';
}

function _nusLiveStatus() {
  const live = _nusLive, el = document.getElementById('stop-map-live');
  if (!live || !el) return;
  const n = live.markers.size;
  const age = live.updatedAt ? Math.round((Date.now() - live.updatedAt) / 1000) : null;
  const stale = live.failed || (age !== null && age > NUS_LIVE_STALE_S);
  el.style.display = '';
  el.style.color = stale ? '#FF9999' : 'var(--muted)';
  el.textContent = age === null ? (live.failed ? 'Unavailable' : 'Loading…')
    : `${n} bus${n === 1 ? '' : 'es'} · ${age < 5 ? 'just now' : age + 's ago'}${stale ? ' · stale' : ''}`;
  document.querySelectorAll('.nus-live-bus').forEach(e => e.classList.toggle('stale', stale));
}

// White disc with a front-facing bus; coloured ring = crowd; small triangle on top rotates to the heading.
function _nusBusHtml(color, crowd, heading) {
  const ring = NUS_CROWD_RING[crowd] || '#888';
  const arrow = heading == null ? '' : `<div class="nus-bus-arrow" style="transform:rotate(${heading}deg)"><i style="border-bottom-color:${ring}"></i></div>`;
  return `<div class="nus-bus-inner">${arrow}<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">
    <circle cx="23" cy="23" r="16.5" fill="white" stroke="${ring}" stroke-width="2.8"/>
    <rect x="15" y="14" width="16" height="4" rx="2" fill="${color}"/>
    <rect x="14" y="17" width="18" height="14" rx="2.5" fill="${color}"/>
    <rect x="16" y="18" width="14" height="7" rx="1.5" fill="rgba(255,255,255,0.55)"/>
    <rect x="15" y="27" width="4" height="3" rx="1" fill="rgba(255,220,50,0.9)"/>
    <rect x="27" y="27" width="4" height="3" rx="1" fill="rgba(255,220,50,0.9)"/>
    <rect x="20" y="28" width="6" height="1.5" rx="0.75" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="30" width="5" height="3.5" rx="1.5" fill="rgba(0,0,0,0.45)"/>
    <rect x="27" y="30" width="5" height="3.5" rx="1.5" fill="rgba(0,0,0,0.45)"/>
  </svg></div>`;
}

function _nusBusTip(svc, b) {
  const bg = svc.Color || '#003D7C';
  const label = NUS_CROWD_LABEL[b.crowd] ? ` · ${NUS_CROWD_LABEL[b.crowd]}` : '';
  const load = Number.isFinite(b.ridership) && Number.isFinite(b.capacity) ? ` (${b.ridership}/${b.capacity})` : '';
  return `<span style="background:${bg};color:${svc.TextColor || '#fff'};border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700">NUS ${svc.NusRoute}</span>${label}${load}`;
}

// Reconcile markers with a fresh list of buses, keyed by plate.
function _nusLiveSync(live, buses) {
  const seen = new Set();
  buses.forEach((b, i) => {
    const key = b.plate || ('bus' + i);
    seen.add(key);
    let m = live.markers.get(key);
    if (!m) {
      m = L.marker([b.lat, b.lng], {
        icon: L.divIcon({ className: 'nus-live-bus', html: _nusBusHtml(live.color, b.crowd, b.heading), iconSize: [46, 46], iconAnchor: [23, 23] }),
        zIndexOffset: 1000,
      }).bindTooltip(_nusBusTip(live.svc, b), { direction: 'top', offset: [0, -23] }).addTo(live.layer);
      m._crowd = b.crowd;
      live.markers.set(key, m);
      return;
    }
    m.setLatLng([b.lat, b.lng]);
    if (m._crowd !== b.crowd) {
      m._crowd = b.crowd;
      const ring = NUS_CROWD_RING[b.crowd] || '#888';
      const el = m.getElement();
      el?.querySelector('svg circle')?.setAttribute('stroke', ring);
      const tri = el?.querySelector('.nus-bus-arrow i'); if (tri) tri.style.borderBottomColor = ring;
    }
    const arrow = m.getElement()?.querySelector('.nus-bus-arrow');
    if (arrow && b.heading != null) arrow.style.transform = `rotate(${b.heading}deg)`;
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

function nusLiveOpen(serviceNo) {
  const svc = nusServiceByNo(serviceNo);
  if (!svc || typeof L === 'undefined') return;
  if (typeof ntuLiveStop === 'function') ntuLiveStop();
  nusLiveStop();
  if (window._stopMap) { window._stopMap.remove(); window._stopMap = null; }
  document.getElementById('stop-map-modal').style.display = 'flex';
  const color = svc.Color || '#003D7C';
  document.getElementById('stop-map-title').innerHTML =
    `<span style="background:${color};color:${svc.TextColor || '#fff'};border-radius:6px;padding:2px 8px;font-size:13px;font-weight:700;margin-right:6px">NUS ${svc.NusRoute}</span>Live`;

  const isLight = document.body.classList.contains('light');
  const map = L.map('stop-map-container', { zoomControl: true, attributionControl: false });
  window._stopMap = map;
  L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${isLight ? 'Default' : 'Night'}/{z}/{x}/{y}.png`, { maxZoom: 19 }).addTo(map);
  const box = map.getContainer();
  map.on('zoomstart', () => box.classList.add('nus-zooming'));   // no glide while zooming
  map.on('zoomend', () => box.classList.remove('nus-zooming'));

  const pts = (svc.Directions['1'].Stops || []).filter(s => s.Latitude != null && s.Longitude != null);
  const line = pts.map(s => [s.Latitude, s.Longitude]);
  pts.forEach(s => {
    L.circleMarker([s.Latitude, s.Longitude], { radius: 6, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 1 })
      .bindTooltip(s.Description || s.NusStopName).addTo(map);
  });
  if (line.length) map.fitBounds(line, { padding: [24, 24] }); else map.setView([1.2966, 103.7764], 15);

  const live = _nusLive = { svc, color, layer: L.layerGroup().addTo(map), markers: new Map(), updatedAt: null, failed: false, busy: false };
  // Route line: road-following path from assets/nus-paths.json when there is one for this route, else
  // straight lines between stops (closed for loops).
  nusPaths().then(paths => {
    if (_nusLive !== live) return; // modal closed meanwhile
    const path = paths[svc.NusRoute] || (line.length > 1 && svc._isLoop !== false ? [...line, line[0]] : line);
    if (path.length > 1) L.polyline(path, { color, weight: 4, opacity: .65, lineJoin: 'round' }).addTo(map).bringToBack();
  });
  live.poll = setInterval(() => _nusLivePoll(live), NUS_LIVE_POLL_MS);
  live.tick = setInterval(_nusLiveStatus, 1000);
  _nusLiveStatus();
  _nusLivePoll(live);
}

// Coming back to the tab: refresh straight away instead of waiting for the next tick.
document.addEventListener('visibilitychange', () => { if (!document.hidden && _nusLive) _nusLivePoll(_nusLive); });