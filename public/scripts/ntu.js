/* ── NTU CAMPUS SHUTTLES (ntu.js) ─────────────────────────────────────────────
 * Everything NTU-specific that isn't just a view flag lives here. Loaded as a plain
 * <script> BEFORE app.js; it only defines things, nothing runs until app.js calls it.
 *
 * Data: ./assets/ntu-shuttle.json (built by helper_scripts/ntu/build_ntu_assets.py) is merged
 * into PRIVATE_SERVICES by app.js (loadNtuServices). A stop NTU shares with public buses uses its
 * real LTA code; NTU-only stops use a synthetic "NTU-…" code. Either way the ETA lookup uses
 * NtuStopName, never the code.
 *
 * app.js calls into this file through:
 *   loadNtuServices()                 fetch + parse ntu-shuttle.json ({} on failure)
 *   ntuResetIndex() / ntuIndexStop()  build NTU_STOP_INDEX while injecting private services
 *   hasNtu(code) / isNtuCode(code)    "NTU serves this code" / "NTU-only code, no LTA data"
 *   renderNtuStopCards(code, n)       stop view: NTU cards appended after the public ones
 *   ntuRowsHtml(code)                 route view: NTU arrival rows (HTML string)
 *   ntuLoopLabel(info, fallbackOrig)  "first ↻ last" label for NTU loops
 *   ntuRouteTimes(svc)                first/last bus fields for the route view's timing grid
 *
 * This file expects these globals from app.js (used at call time only): PROXY_URL,
 * getProxyHeaders, busTypeIcon, plus goToService / addSvcFavSmart in onclick handlers.
 * ──────────────────────────────────────────────────────────────────────────── */

let NTU_STOP_INDEX = {};   // BusStopCode (real LTA code or NTU-…) → [{ svc, stop }, ...]

function ntuResetIndex() { NTU_STOP_INDEX = {}; }
function ntuIndexStop(svc, stop) {
  const list = (NTU_STOP_INDEX[stop.BusStopCode] ||= []);
  if (!list.some(e => e.svc === svc)) list.push({ svc, stop }); // a loop may pass the same stop twice
}

async function loadNtuServices() {
  try {
    const res = await fetch('./assets/ntu-shuttle.json');
    return res.ok ? await res.json() : {};
  } catch (e) { console.error('ntu-shuttle.json', e); return {}; }
}

// ── First / last bus ──────────────────────────────────────────────────────────
// svc.Schedule comes from NTU's RouteMinMaxTimes (Term timetable): { 'Mon-Fri'|'Sat'|'Sun': { first, last } }.
// Public holidays use the Sun entry: Brown (weekend/holiday) replaces Green (weekdays) on those days.
const NTU_DAY_KEYS = ['Sun', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Sat']; // by Date.getDay()

// Same field names the LTA route stops use, so the existing per-stop timing grid renders them as is.
function ntuRouteTimes(svc) {
  const s = svc?.Schedule || {};
  const t = (day, f) => (s[day] ? s[day][f].replace(':', '') : '-');
  return {
    WD_FirstBus: t('Mon-Fri', 'first'), WD_LastBus: t('Mon-Fri', 'last'),
    SAT_FirstBus: t('Sat', 'first'), SAT_LastBus: t('Sat', 'last'),
    SUN_FirstBus: t('Sun', 'first'), SUN_LastBus: t('Sun', 'last'),
  };
}

// Short note for when a route has no ETA: null when the route should be running (or has no schedule data).
function ntuStatus(svc, now = new Date()) {
  const sched = svc?.Schedule;
  if (!sched || !Object.keys(sched).length) return null;
  const holiday = typeof isTodayPublicHoliday === 'function' && isTodayPublicHoliday();
  const today = sched[holiday ? 'Sun' : NTU_DAY_KEYS[now.getDay()]];
  if (!today) return 'No service today';
  const mins = t => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const n = now.getHours() * 60 + now.getMinutes();
  if (n < mins(today.first)) return `First bus ${today.first}`;
  if (n > mins(today.last)) return `Service ended · last bus ${today.last}`;
  return null;
}

// The NTU service object (from PRIVATE_SERVICES) for a ServiceNo like "NTU Red".
function ntuServiceByNo(serviceNo) {
  // Tolerant match: the route view may hold the number as typed/normalised ("NTUBROWN", "ntu brown").
  const norm = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return Object.values(PRIVATE_SERVICES || {}).find(p => p._isNtu && norm(p.ServiceNo) === norm(serviceNo));
}

// NTU campus shuttles are all loops, so their label is "first stop ↻ last stop" (e.g. Opp Hall 11 ↻ Opp NY Cres Halls).
// The last stop comes from the route's own stop list, since LTA-style origin/destination are both the first stop.
function ntuLoopLabel(info, fallbackOrig) {
  const svc = ntuServiceByNo(info?.ServiceNo);
  const stops = svc?.Directions?.['1']?.Stops || [];
  const first = stops[0]?.Description || info?.OriginDesc || fallbackOrig || '';
  const last = stops[stops.length - 1]?.Description || '';
  return last && last !== first ? `${first} ↻ ${last}` : `${first} ↻`;
}

const NTU_ETA_TTL_MS = 20000;
const NTU_BUSES_TTL_MS = 10000;   // bus positions are polled faster than ETAs (live map)
const _ntuEtaCache = new Map(); // "route|stop" → { t, promise }

function isNtuCode(code) { return typeof code === 'string' && code.startsWith('NTU-'); }

// Returns { ETA, NextETA } (minutes or null) or { error } — never throws.
function fetchNtuEta(stopName, route) {
  const key = route + '|' + stopName;
  const hit = _ntuEtaCache.get(key);
  if (hit && Date.now() - hit.t < NTU_ETA_TTL_MS) return hit.promise;
  const promise = (async () => {
    try {
      const url = `${PROXY_URL}?endpoint=NtuShuttle&BusStopCode=${encodeURIComponent(stopName)}&RouteCode=${encodeURIComponent(route)}`;
      const res = await fetch(url, { headers: await getProxyHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) return { error: json.error || ('http ' + res.status) };
      return { ETA: json.ETA ?? null, NextETA: json.NextETA ?? null };
    } catch (e) { return { error: 'network' }; }
  })();
  _ntuEtaCache.set(key, { t: Date.now(), promise });
  promise.then(r => { if (r.error) _ntuEtaCache.delete(key); }); // don't cache failures
  return promise;
}

// Active buses on a route with crowd level: { buses: [{ lat, lng, crowd }] }. Crowd is optional,
// so this never reports errors: on any failure it just returns no buses and ETAs still render.
const _ntuBusCache = new Map(); // route → { t, promise }
function fetchNtuBuses(route) {
  const hit = _ntuBusCache.get(route);
  if (hit && Date.now() - hit.t < NTU_BUSES_TTL_MS) return hit.promise;
  const promise = (async () => {
    try {
      const url = `${PROXY_URL}?endpoint=NtuBuses&RouteCode=${encodeURIComponent(route)}`;
      const res = await fetch(url, { headers: await getProxyHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) return { buses: [], failed: true };
      return { buses: json.buses || [], fetchedAt: json.fetchedAt };
    } catch (e) { return { buses: [], failed: true }; }
  })();
  _ntuBusCache.set(route, { t: Date.now(), promise });
  promise.then(r => { if (r.failed) _ntuBusCache.delete(route); }); // don't cache failures
  return promise;
}

const NTU_LOAD_COLOR = { SEA: 'var(--green)', SDA: '#FF8C00', LSD: '#FF3333' };

// Estimated crowd level of the next two buses to reach a stop (soonest first), as [c1, c2].
// NTU's ETA call has no vehicle id, so each active bus is snapped to its nearest stop on the loop
// and ranked by how many stops it is from the target. Approximate where the loop doubles back.
function ntuCrowdForStop(svc, stopName, buses) {
  const stops = svc?.Directions?.['1']?.Stops || [];
  const n = stops.length;
  const target = stops.findIndex(s => s.NtuStopName === stopName);
  if (target < 0 || !buses || !buses.length) return [];
  const rad = x => x * Math.PI / 180;
  const dist = (b, s) => Math.hypot(rad(b.lat - s.Latitude), rad(b.lng - s.Longitude) * Math.cos(rad(b.lat)));
  return buses.map(b => {
    let near = 0, best = Infinity;
    stops.forEach((s, i) => {
      if (s.Latitude == null || s.Longitude == null) return;
      const d = dist(b, s);
      if (d < best) { best = d; near = i; }
    });
    return { crowd: b.crowd, away: (target - near + n) % n };
  }).sort((a, b) => a.away - b.away).slice(0, 2).map(x => x.crowd);
}

// Every NTU service entry ({ svc, stop }) that calls at this code. The code is either an NTU-only
// synthetic code or the real LTA code of a stop NTU shares with public buses.
function hasNtu(code) { return !!NTU_STOP_INDEX[code]; }
function ntuEntriesAtStop(code) { return NTU_STOP_INDEX[code] || []; }

function _ntuMins(m) { return m === null || m === undefined ? null : (m <= 0 ? 'ARR' : m + ' min'); }

// Stop view: one bus-card per NTU route at this stop, filled in as ETAs arrive.
async function renderNtuStopCards(code, publicCount) {
  if (!hasNtu(code)) return;
  const entries = ntuEntriesAtStop(code);
  const host = document.getElementById('results-stop');
  if (!host) return;
  const label = host.querySelector('.results-label');
  if (label) label.textContent = `${publicCount + entries.length} services`;
  if (!entries.length) {
    host.insertAdjacentHTML('beforeend', '<div class="error-card">No NTU shuttle data for this stop.</div>');
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'ntu-cards';
  host.appendChild(wrap);
  const [results, busRes] = await Promise.all([
    Promise.all(entries.map(e => fetchNtuEta(e.stop.NtuStopName, e.svc.NtuRoute))),
    Promise.all(entries.map(e => fetchNtuBuses(e.svc.NtuRoute))),
  ]);
  if (document.getElementById('ntu-cards') !== wrap) return; // user navigated away mid-fetch
  wrap.innerHTML = entries.map(({ svc, stop }, i) => {
    const r = results[i];
    const d = svc.Directions['1'];
    const first = r.error ? null : _ntuMins(r.ETA);
    const next = r.error ? null : _ntuMins(r.NextETA);
    const [crowd1, crowd2] = ntuCrowdForStop(svc, stop.NtuStopName, busRes[i].buses);
    const lc1 = NTU_LOAD_COLOR[crowd1] || 'var(--muted)';
    const lc2 = NTU_LOAD_COLOR[crowd2] || 'var(--muted)';
    const status = !r.error && first === null ? ntuStatus(svc) : null;
    const big = first === 'ARR' ? 'ARR' : first ? first.replace(' min', '') : '—';
    const unit = first && first !== 'ARR' ? 'min' : '';
    return `
    <div class="bus-card" style="animation-delay:${(publicCount + i) * .09}s">
      <div class="card-top">
        <div class="bus-num-col op-ntu" onclick="goToService('${svc.ServiceNo}', '${code}')" style="position:relative;${svc.Color ? `background:${svc.Color}` : ''}">
          <div class="bus-num-from">NTU</div>
          <div class="bus-num">${svc.NtuRoute}</div>
          <div class="bus-num-to">Campus loop</div>
        </div>
        <div class="card-middle">
          <div class="arrival-row">
            <div class="first-timing"><div class="mins-big">${big}</div><div class="mins-unit">${unit}</div></div>
            ${next ? `<div class="next-pill"><span>${next}</span>${busTypeIcon('SD', true, lc2)}</div>` : ''}
          </div>
          ${first !== null ? `<div class="bus-type-tag">${busTypeIcon('SD', false, lc1)}</div>` : (status ? `<div class="bus-type-tag" style="color:var(--muted);font-size:11px">${status}</div>` : '')}
        </div>
        <div class="card-right">
          <button class="sun-toggle-btn fav-btn" data-key="svc_${favSvcId(svc.ServiceNo)}" onclick="event.stopPropagation();addSvcFavSmart('${svc.ServiceNo}')" style="background:none;justify-content:center;font-size:16px;color:${(window._favs||{})['svc_'+favSvcId(svc.ServiceNo)]?'var(--yellow)':'var(--muted)'}">${(window._favs||{})['svc_'+favSvcId(svc.ServiceNo)]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Route view: expanded stop shows an arrival row per NTU route calling at that stop.
async function ntuRowsHtml(code) {
  const entries = ntuEntriesAtStop(code);
  const [results, busRes] = await Promise.all([
    Promise.all(entries.map(e => fetchNtuEta(e.stop.NtuStopName, e.svc.NtuRoute))),
    Promise.all(entries.map(e => fetchNtuBuses(e.svc.NtuRoute))),
  ]);
  const cell = (m, err, crowd) => {
    const ok = !err && m !== null;
    const icon = ok ? `<div class="rs-time-meta">${busTypeIcon('SD', true, NTU_LOAD_COLOR[crowd] || 'var(--muted)')}</div>` : '';
    return `<div class="rs-time-cell"><span class="rs-time-main${m !== null && m <= 1 && !err ? ' arriving' : ''}">${err || m === null ? '—' : (m <= 0 ? 'Arr' : m + ' min')}</span>${icon}</div>`;
  };
  const html = entries.map(({ svc }, i) => {
    const r = results[i];
    // No arrivals (e.g. Green doesn't run on weekends): hide the row. Errors still show so failures aren't silent.
    if (!r.error && r.ETA == null && r.NextETA == null) return '';
    const [crowd1, crowd2] = ntuCrowdForStop(svc, entries[i].stop.NtuStopName, busRes[i].buses);
    return `<div class="rs-arrival-row">
      <div class="rs-svc-col op-ntu" style="${svc.Color ? `background:${svc.Color}` : ''}" onclick="goToService('${svc.ServiceNo}', '${code}')">NTU ${svc.NtuRoute}<div class="rs-dest-label">Campus Loop</div></div>
      ${cell(r.ETA, r.error, crowd1)}${cell(r.NextETA, r.error, crowd2)}<div class="rs-time-cell"></div>
    </div>`;
  }).join('');
  const anyErr = results.some(r => r.error);
  return html + (anyErr ? '<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> Some NTU ETAs are unavailable right now.</div>' : '');
}

// ── Live map ──────────────────────────────────────────────────────────────────
// "Live NTU buses" button → reuses the stop-map modal: loop lines + stops + one marker per active bus.
// Data is fetchNtuBuses (worker caches 30s), so we poll just above the client TTL, only while the modal
// is open and the tab is visible. NTU gives no bus id, so each poll's positions are matched to the
// previous markers by nearest distance, which lets the markers glide instead of jumping.
const NTU_LIVE_POLL_MS = 15000;
const NTU_LIVE_MATCH_DEG = 0.004;   // ~440m: further than a bus moves in one poll, so treat as a different bus
const NTU_LIVE_STALE_S = 90;
const NTU_CROWD_LABEL = { SEA: 'Seats available', SDA: 'Standing available', LSD: 'Limited standing' };
let _ntuLive = null;                // { routes, layer, poll, tick, updatedAt, failed }

// Header button for one NTU service's route view (placed above the favourite star).
function ntuLiveButton(serviceNo) {
  return `<button class="ntu-live-btn" style="margin-left:auto;flex-shrink:0;padding:5px 10px;font-size:12px" onclick="event.stopPropagation();ntuLiveOpen('${serviceNo}')"><i class="fa-solid fa-location-crosshairs"></i> Live</button>`;
}

function ntuLiveStop() {
  if (_ntuLive) { clearInterval(_ntuLive.poll); clearInterval(_ntuLive.tick); _ntuLive = null; }
  const st = document.getElementById('stop-map-live'); if (st) st.style.display = 'none';
  const ti = document.getElementById('stop-map-title'); if (ti) ti.textContent = 'Stop Location';
}

function _ntuLiveStatus() {
  const live = _ntuLive, el = document.getElementById('stop-map-live');
  if (!live || !el) return;
  const n = live.routes.reduce((a, r) => a + r.markers.length, 0);
  const age = live.updatedAt ? Math.round((Date.now() - live.updatedAt) / 1000) : null;
  const stale = live.failed || (age !== null && age > NTU_LIVE_STALE_S);
  el.style.display = '';
  el.style.color = stale ? '#FF9999' : 'var(--muted)';
  el.textContent = age === null ? (live.failed ? 'Unavailable' : 'Loading…')
    : `${n} bus${n === 1 ? '' : 'es'} · ${age < 5 ? 'just now' : age + 's ago'}${stale ? ' · stale' : ''}`;
  document.querySelectorAll('.ntu-live-bus').forEach(e => e.classList.toggle('stale', stale));
}

// White circle with front-facing bus icon; coloured ring = crowd level (green/orange/red).
const NTU_CROWD_RING = { SEA: '#43C463', SDA: '#FF8C00', LSD: '#E53935' };

function _ntuBusIcon(color, crowd) {
  const ring = NTU_CROWD_RING[crowd] || '#888';
  return L.divIcon({
    className: 'ntu-live-bus',
    html: `<div class="ntu-bus-inner">${_ntuBusSvg(color, ring)}</div>`,
    iconSize: [46, 46], iconAnchor: [23, 23],
  });
}

// Front-facing bus inside a white disc, 46×46 canvas (5px padding for arrow clearance).
function _ntuBusSvg(color, ring) {
  return `<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">
    <circle cx="23" cy="23" r="16.5" fill="white" stroke="${ring}" stroke-width="2.8"/>
    <rect x="15" y="14" width="16" height="4"   rx="2"    fill="${color}"/>
    <rect x="14" y="17" width="18" height="14"  rx="2.5"  fill="${color}"/>
    <rect x="16" y="18" width="14" height="7"   rx="1.5"  fill="rgba(255,255,255,0.55)"/>
    <rect x="15" y="27" width="4"  height="3"   rx="1"    fill="rgba(255,220,50,0.9)"/>
    <rect x="27" y="27" width="4"  height="3"   rx="1"    fill="rgba(255,220,50,0.9)"/>
    <rect x="20" y="28" width="6"  height="1.5" rx="0.75" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="30" width="5"  height="3.5" rx="1.5"  fill="rgba(0,0,0,0.45)"/>
    <rect x="27" y="30" width="5"  height="3.5" rx="1.5"  fill="rgba(0,0,0,0.45)"/>
  </svg>`;
}

function _ntuBusTip(route, crowd) {
  const bg = route.svc.Color || '#B5121B';
  const label = NTU_CROWD_LABEL[crowd] ? ` · ${NTU_CROWD_LABEL[crowd]}` : '';
  return `<span style="background:${bg};color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700">NTU ${route.svc.NtuRoute}</span>${label}`;
}

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
    m.setLatLng([b.lat, b.lng]);
    if (m._crowd !== b.crowd) {
      m._crowd = b.crowd;
      const ring = NTU_CROWD_RING[b.crowd] || '#888';
      const el = m.getElement();
      el?.querySelector('svg circle')?.setAttribute('stroke', ring);
      m.setTooltipContent(_ntuBusTip(route, b.crowd));
    }
    next.push(m);
  }
  buses.forEach((b, bi) => {
    if (usedB.has(bi)) return;
    const m = L.marker([b.lat, b.lng], { icon: _ntuBusIcon(route.color, b.crowd), zIndexOffset: 1000 })
      .bindTooltip(_ntuBusTip(route, b.crowd), { direction: 'top', offset: [0, -23] }).addTo(live.layer);
    m._crowd = b.crowd;
    next.push(m);
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

// Road-following paths: assets/ntu-paths.json = { "<NtuRoute>": "<encoded polyline>" } built by
// helper_scripts/ntu/build_ntu_paths.py. Optional: a missing file or route falls back to straight lines.
let _ntuPathsP = null;
function ntuPaths() {
  return _ntuPathsP ||= fetch('./assets/ntu-paths.json')
    .then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(raw => { const out = {}; for (const k in raw) out[k] = _ntuDecodePolyline(raw[k]); return out; });
}
function _ntuDecodePolyline(str) {   // Google encoded polyline, precision 5
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

// ── Stop arrival popup ────────────────────────────────────────────────────────
async function _ntuStopPopup(map, stop) {
  const desc = stop.Description || stop.NtuStopName;
  const code = stop.BusStopCode;

  const loading = `<div class="ntu-popup-inner"><div class="ntu-popup-title">${desc}</div><div class="ntu-popup-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</div></div>`;
  const popup = L.popup({ maxWidth: 280, className: 'ntu-stop-popup' })
    .setLatLng([stop.Latitude, stop.Longitude])
    .setContent(loading)
    .openOn(map);

  const entries = ntuEntriesAtStop(code);
  const hasPublic = !isNtuCode(code);

  const [results, busRes, ltaData] = await Promise.all([
    Promise.all(entries.map(e => fetchNtuEta(e.stop.NtuStopName, e.svc.NtuRoute))),
    Promise.all(entries.map(e => fetchNtuBuses(e.svc.NtuRoute))),
    hasPublic ? fetchLTA(code).catch(() => null) : Promise.resolve(null),
  ]);

  if (!map.hasLayer(popup)) return;

  const ntuRows = entries.map(({ svc, stop: eStop }, i) => {
    const r = results[i];
    if (!r.error && r.ETA == null && r.NextETA == null) return '';
    const status = !r.error && r.ETA == null ? ntuStatus(svc) : null;
    const [crowd1, crowd2] = ntuCrowdForStop(svc, eStop.NtuStopName, busRes[i].buses);
    const lc1 = NTU_CROWD_RING[crowd1] || '#888';
    const lc2 = NTU_CROWD_RING[crowd2] || '#888';
    const eta1 = r.error ? '—' : (_ntuMins(r.ETA) ?? '—');
    const eta2 = r.error ? null : _ntuMins(r.NextETA);
    const bg = svc.Color || '#B5121B';
    return `<div class="ntu-popup-row">
      <div class="ntu-popup-badge" style="background:${bg}">NTU ${svc.NtuRoute}</div>
      <div class="ntu-popup-etas">
        <div class="ntu-popup-eta-wrap">
          <span class="ntu-popup-eta1">${status || eta1}</span>
          <div class="ntu-popup-crowd-bar" style="background:${status ? 'transparent' : lc1}"></div>
        </div>
        ${eta2 && !status ? `<div class="ntu-popup-eta-wrap">
          <span class="ntu-popup-eta2">${eta2}</span>
          <div class="ntu-popup-crowd-bar" style="background:${lc2}"></div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  const _ltaMins = iso => { const m = Math.round((new Date(iso) - Date.now()) / 60000); return m <= 0 ? 'Arr' : m + ' min'; };
  const publicRows = (ltaData?.Services || []).map(s => {
    const nb = s.NextBus, nb2 = s.NextBus2;
    if (!nb?.EstimatedArrival) return '';
    const eta1 = _ltaMins(nb.EstimatedArrival);
    const eta2 = nb2?.EstimatedArrival ? _ltaMins(nb2.EstimatedArrival) : null;
    const lc1 = NTU_CROWD_RING[nb.Load] || '#888';
    const lc2 = nb2?.Load ? (NTU_CROWD_RING[nb2.Load] || '#888') : '#888';
    const opColors = { SBST: '#5B2D8E', SBS: '#5B2D8E', SMRT: '#C0392B', TTS: '#1A6B2A', GAS: '#9A7000' };
    const opBg = opColors[(s.Operator||'').toUpperCase()] || '#3a3f52';
    return `<div class="ntu-popup-row">
      <div class="ntu-popup-badge" style="background:${opBg}">${s.ServiceNo}</div>
      <div class="ntu-popup-etas">
        <div class="ntu-popup-eta-wrap">
          <span class="ntu-popup-eta1">${eta1}</span>
          <div class="ntu-popup-crowd-bar" style="background:${lc1}"></div>
        </div>
        ${eta2 ? `<div class="ntu-popup-eta-wrap">
          <span class="ntu-popup-eta2">${eta2}</span>
          <div class="ntu-popup-crowd-bar" style="background:${lc2}"></div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  const allRows = publicRows + ntuRows;
  const empty = !allRows.trim();
  popup.setContent(`<div class="ntu-popup-inner"><div class="ntu-popup-title">${desc}</div>${empty ? '<div class="ntu-popup-loading">No arrivals right now.</div>' : allRows}</div>`);
}

function ntuLiveOpen(serviceNo) {
  const svc = ntuServiceByNo(serviceNo);
  if (!svc || typeof L === 'undefined') return;
  ntuLiveStop();
  if (window._stopMap) { window._stopMap.remove(); window._stopMap = null; }
  document.getElementById('stop-map-modal').style.display = 'flex';
  document.getElementById('stop-map-title').innerHTML =
    `<span style="background:${svc.Color||'#B5121B'};color:#fff;border-radius:6px;padding:2px 8px;font-size:13px;font-weight:700;margin-right:6px">NTU ${svc.NtuRoute}</span>Live`;

  const isLight = document.body.classList.contains('light');
  const map = L.map('stop-map-container', { zoomControl: true, attributionControl: false });
  window._stopMap = map;
  L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${isLight ? 'Default' : 'Night'}/{z}/{x}/{y}.png`, { maxZoom: 19 }).addTo(map);

  const all = [], routeLines = [];
  const color = svc.Color || '#B5121B';
  const pts = (svc.Directions['1'].Stops || []).filter(s => s.Latitude != null && s.Longitude != null);
  const line = pts.map(s => [s.Latitude, s.Longitude]);
  routeLines.push({ svc, color, line });
  pts.forEach(s => {
    const m = L.circleMarker([s.Latitude, s.Longitude], {
      radius: 6, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 1, interactive: true,
    }).bindTooltip(s.Description || s.NtuStopName).addTo(map);
    m.on('click', () => _ntuStopPopup(map, s));
  });
  all.push(...line);
  const routes = [{ svc, color, markers: [], path: null }];
  routeLines[0].route = routes[0];
  if (all.length) map.fitBounds(all, { padding: [24, 24] }); else map.setView([1.3483, 103.6831], 15);

  const live = _ntuLive = { routes, layer: L.layerGroup().addTo(map), updatedAt: null, failed: false, busy: false };
  // Loop lines: follow the road path when we have one, else straight lines between stops (NTU shuttles are loops).
  ntuPaths().then(paths => {
    if (_ntuLive !== live) return; // modal closed meanwhile
    routeLines.forEach(({ svc, color, line, route }) => {
      const pts = paths[svc.NtuRoute] || (line.length > 1 ? [...line, line[0]] : null);
      if (pts) {
        if (route) route.path = pts;
        L.polyline(pts, { color, weight: 4, opacity: .65, lineJoin: 'round' }).addTo(map).bringToBack();
      }
    });
  });
  live.poll = setInterval(() => _ntuLivePoll(live), NTU_LIVE_POLL_MS);
  live.tick = setInterval(_ntuLiveStatus, 1000);
  _ntuLiveStatus();
  _ntuLivePoll(live);
}

// Coming back to the tab: refresh straight away instead of waiting for the next tick.
document.addEventListener('visibilitychange', () => { if (!document.hidden && _ntuLive) _ntuLivePoll(_ntuLive); });
