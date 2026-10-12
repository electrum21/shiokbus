/* ── CAMPUS SHUTTLES: SHARED HELPERS (campus.js) ──────────────────────────────
 * Code that NTU (ntu.js) and NUS (nus.js) have in common. Loaded as a plain <script> BEFORE ntu.js,
 * nus.js and app.js; it only defines things, nothing runs until they call it.
 *
 * What lives here: static-data loading and the stop index, timetable status (first/last bus), the
 * crowd ranking and colours, request caching, the shared stop-map modal (live map base, bus markers,
 * status line), the stop-arrival popup, and the HTML for stop cards and route-view rows.
 * What stays in ntu.js / nus.js: how each upstream is queried and parsed, how ETAs map to routes,
 * and how bus positions are matched between polls.
 *
 * Campus services are PRIVATE_SERVICES entries flagged `_isNtu` / `_isNus`. Their stops carry the
 * lookup name in `NtuStopName` / `NusStopName` (the `nameKey` arguments below).
 *
 * This file expects these globals (used at call time only): PROXY_URL, getProxyHeaders, busTypeIcon,
 * favSvcId, fetchLTA, PRIVATE_SERVICES, isTodayPublicHoliday (optional), Leaflet's L, and goToService /
 * addSvcFavSmart in onclick handlers.
 * ──────────────────────────────────────────────────────────────────────────── */

// ── Static data + stop index ──────────────────────────────────────────────────
async function campusLoadJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : {};
  } catch (e) { console.error(url, e); return {}; }
}

// index: BusStopCode → [{ svc, stop }, ...]
function campusIndexStop(index, svc, stop) {
  const list = (index[stop.BusStopCode] ||= []);
  if (!list.some(e => e.svc === svc)) list.push({ svc, stop }); // a route may pass the same stop twice
}

// The campus service object (from PRIVATE_SERVICES) for a ServiceNo like "NTU Red" / "NUS A1".
// Tolerant match: the route view may hold the number as typed/normalised ("NTUBROWN", "ntu brown").
function campusServiceByNo(flag, serviceNo) {
  const norm = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return Object.values(PRIVATE_SERVICES || {}).find(p => p[flag] && norm(p.ServiceNo) === norm(serviceNo));
}

// Loops read "first ↻ last"; point-to-point routes (NUS R1, R2: _isLoop === false) read "first → last".
function campusLoopLabel(svc, info, fallbackOrig) {
  const stops = svc?.Directions?.['1']?.Stops || [];
  const first = stops[0]?.Description || info?.OriginDesc || fallbackOrig || '';
  const last = stops[stops.length - 1]?.Description || '';
  if (svc && svc._isLoop === false) return last && last !== first ? `${first} → ${last}` : first;
  return last && last !== first ? `${first} ↻ ${last}` : `${first} ↻`;
}

// Route pill: background from the route colour, text colour per route (NUS yellow A2 and grey P need
// dark text). --pill-fg also reaches the nested labels (see .op-nus rules in styles.css).
function campusPillStyle(svc) {
  return svc.Color ? `background:${svc.Color};color:${svc.TextColor || '#fff'};--pill-fg:${svc.TextColor || '#fff'}` : '';
}

// ── First / last bus ──────────────────────────────────────────────────────────
// svc.Schedule: { 'Mon-Fri'|'Sat'|'Sun': { first, last } } in 24h "HH:MM". A missing day key means no
// service that day. Public holidays use the Sun entry.
const CAMPUS_DAY_KEYS = ['Sun', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Mon-Fri', 'Sat']; // by Date.getDay()

// Same field names the LTA route stops use, so the route view's per-stop timing grid renders them as is.
function campusRouteTimes(svc) {
  const s = svc?.Schedule || {};
  const t = (day, f) => (s[day] ? s[day][f].replace(':', '') : '-');
  return {
    WD_FirstBus: t('Mon-Fri', 'first'), WD_LastBus: t('Mon-Fri', 'last'),
    SAT_FirstBus: t('Sat', 'first'), SAT_LastBus: t('Sat', 'last'),
    SUN_FirstBus: t('Sun', 'first'), SUN_LastBus: t('Sun', 'last'),
  };
}

// Short note for when a route has no ETA: null when the route should be running (or has no schedule data).
function campusStatus(svc, now = new Date()) {
  const sched = svc?.Schedule;
  if (!sched || !Object.keys(sched).length) return null;
  const holiday = typeof isTodayPublicHoliday === 'function' && isTodayPublicHoliday();
  const today = sched[holiday ? 'Sun' : CAMPUS_DAY_KEYS[now.getDay()]];
  if (!today) return 'No service today';
  const mins = t => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const n = now.getHours() * 60 + now.getMinutes();
  if (n < mins(today.first)) return `First bus ${today.first}`;
  if (n > mins(today.last)) return `Service ended · last bus ${today.last}`;
  return null;
}

// ── Requests ──────────────────────────────────────────────────────────────────
// Shares one in-flight promise per key for `ttl` ms; a result that isFail() is dropped from the cache
// so the next call retries.
function campusCached(cache, key, ttl, load, isFail) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.promise;
  const promise = load();
  cache.set(key, { t: Date.now(), promise });
  promise.then(r => { if (isFail(r)) cache.delete(key); });
  return promise;
}

// GET a Worker endpoint → { ok, status, json } (json is {} when the body isn't JSON). Throws on network failure.
async function campusProxy(query) {
  const res = await fetch(`${PROXY_URL}?${query}`, { headers: await getProxyHeaders() });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

// ── Road-following paths ──────────────────────────────────────────────────────
// assets/<campus>-paths.json = { "<Route>": "<encoded polyline>" | [[lat, lng], ...] }.
// Optional: a missing file or route falls back to straight lines between stops.
const _campusPathsCache = {};
function campusPaths(url) {
  return _campusPathsCache[url] ||= fetch(url)
    .then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(raw => {
      const out = {};
      for (const k in raw) {
        const v = raw[k];
        if (typeof v === 'string') out[k] = campusDecodePolyline(v);
        else if (Array.isArray(v) && v.length > 1) out[k] = v;
      }
      return out;
    });
}
function campusDecodePolyline(str) {   // Google encoded polyline, precision 5
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

// ── Crowd ─────────────────────────────────────────────────────────────────────
// Three levels, same keys as public buses: SEA seats available, SDA standing available, LSD limited standing.
const CAMPUS_LOAD_COLOR = { SEA: 'var(--green)', SDA: '#FF8C00', LSD: '#FF3333' };   // stop cards / rows
const CAMPUS_CROWD_RING = { SEA: '#43C463', SDA: '#FF8C00', LSD: '#E53935' };        // map markers / popups
const CAMPUS_CROWD_LABEL = { SEA: 'Seats available', SDA: 'Standing available', LSD: 'Limited standing' };

// Estimated crowd of the next `max` buses to reach a stop (soonest first). The ETA feeds have no vehicle
// id, so each active bus is snapped to its nearest stop on the route and ranked by stops to go. On a loop
// the bus keeps circling, so a bus just past the stop is a full lap away; on one-way routes (_isLoop === false)
// it is dropped. Approximate where a route doubles back near itself.
function campusCrowdForStop(svc, nameKey, stopName, buses, max) {
  const stops = svc?.Directions?.['1']?.Stops || [];
  const n = stops.length;
  const target = stops.findIndex(s => s[nameKey] === stopName);
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
  }).filter(x => x.away >= 0).sort((a, b) => a.away - b.away).slice(0, max).map(x => x.crowd);
}

// ── Stop view cards + route view rows ─────────────────────────────────────────
function campusMins(m) { return m === null || m === undefined ? null : (m <= 0 ? 'ARR' : m + ' min'); }

// Stop view: appends a wrapper after the public cards, then fills it with one card per entry once
// load() resolves. buildCard(entry, index, data) returns the card's HTML (see campusCardHtml).
async function campusRenderStopCards({ code, publicCount, entries, wrapId, load, buildCard }) {
  const host = document.getElementById('results-stop');
  if (!host) return;
  const label = host.querySelector('.results-label');
  if (label) label.textContent = `${publicCount + entries.length} services`;
  const wrap = document.createElement('div');
  wrap.id = wrapId;
  host.appendChild(wrap);
  const data = await load();
  if (document.getElementById(wrapId) !== wrap) return; // user navigated away mid-fetch
  wrap.innerHTML = entries.map((e, i) => buildCard(e, i, data)).join('');
}

// One stop-view card. `first` / `next` are strings from campusMins (or null); `note` shows when there is no ETA.
function campusCardHtml({ svc, code, delay, opClass, tag, route, first, next, lc1, lc2, note }) {
  const big = first === 'ARR' ? 'ARR' : first ? first.replace(' min', '') : '—';
  const unit = first && first !== 'ARR' ? 'min' : '';
  const fav = (window._favs || {})['svc_' + favSvcId(svc.ServiceNo)];
  return `
    <div class="bus-card" style="animation-delay:${delay * .09}s">
      <div class="card-top">
        <div class="bus-num-col ${opClass}" onclick="goToService('${svc.ServiceNo}', '${code}')" style="position:relative;${campusPillStyle(svc)}">
          <div class="bus-num-from">${tag}</div>
          <div class="bus-num">${route}</div>
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
}

// Route view: one time cell (m = minutes or null; err = lookup failed). `crowd` is a SEA/SDA/LSD key.
function campusRowCell(m, crowd, err = false) {
  const has = !err && m !== null && m !== undefined;
  const icon = has ? `<div class="rs-time-meta">${busTypeIcon('SD', true, CAMPUS_LOAD_COLOR[crowd] || 'var(--muted)')}</div>` : '';
  return `<div class="rs-time-cell"><span class="rs-time-main${has && m <= 1 ? ' arriving' : ''}">${has ? (m <= 0 ? 'Arr' : m + ' min') : '—'}</span>${icon}</div>`;
}

// Route view: one arrival row. `cells` is the joined HTML of campusRowCell()s.
function campusRowHtml({ svc, code, opClass, route, label, cells }) {
  return `<div class="rs-arrival-row">
      <div class="rs-svc-col ${opClass}" style="${campusPillStyle(svc)}" onclick="goToService('${svc.ServiceNo}', '${code}')">${route}<div class="rs-dest-label">${label}</div></div>
      ${cells}
    </div>`;
}

function campusRowsError(who) {
  return `<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> Some ${who} ETAs are unavailable right now.</div>`;
}

// ── Live map ──────────────────────────────────────────────────────────────────
// The "Live" button on a campus route reuses the stop-map modal (#stop-map-modal): route line + stops +
// one marker per active bus. Polled only while the modal is open and the tab is visible.
const CAMPUS_LIVE_POLL_MS = 15000;
const CAMPUS_LIVE_STALE_S = 90;

// Header button for one service's route view (placed above the favourite star). openFn: 'ntuLiveOpen' | 'nusLiveOpen'.
function campusLiveButton(openFn, serviceNo) {
  return `<button class="campus-live-btn" style="margin-left:auto;flex-shrink:0;padding:5px 10px;font-size:12px" onclick="event.stopPropagation();${openFn}('${serviceNo}')"><i class="fa-solid fa-location-crosshairs"></i> Live</button>`;
}

// Stop polling and reset the shared modal's title / status line. `live` may be null.
function campusLiveClear(live) {
  if (live) { clearInterval(live.poll); clearInterval(live.tick); }
  const st = document.getElementById('stop-map-live'); if (st) st.style.display = 'none';
  const ti = document.getElementById('stop-map-title'); if (ti) ti.textContent = 'Stop Location';
}

// Status line in the modal header: "<n> buses · 12s ago", turning red and greying the markers when stale.
function campusLiveStatus(live, count) {
  const el = document.getElementById('stop-map-live');
  if (!live || !el) return;
  const age = live.updatedAt ? Math.round((Date.now() - live.updatedAt) / 1000) : null;
  const stale = live.failed || (age !== null && age > CAMPUS_LIVE_STALE_S);
  el.style.display = '';
  el.style.color = stale ? '#FF9999' : 'var(--muted)';
  el.textContent = age === null ? (live.failed ? 'Unavailable' : 'Loading…')
    : `${count} bus${count === 1 ? '' : 'es'} · ${age < 5 ? 'just now' : age + 's ago'}${stale ? ' · stale' : ''}`;
  document.querySelectorAll('.campus-live-bus').forEach(e => e.classList.toggle('stale', stale));
}

// Opens the modal and builds the map: tiles, one circle marker per stop (tap → popupFn(map, stop)), fitted
// bounds. Returns { map, color, line } where line is the stop coordinates in order.
//   opts: { label ('NTU Red'), nameKey, defaultColor, defaultCentre, popupFn }
function campusLiveMapOpen(svc, opts) {
  if (window._stopMap) { window._stopMap.remove(); window._stopMap = null; }
  document.getElementById('stop-map-modal').style.display = 'flex';
  const color = svc.Color || opts.defaultColor;
  document.getElementById('stop-map-title').innerHTML =
    `<span style="background:${color};color:${svc.TextColor || '#fff'};border-radius:6px;padding:2px 8px;font-size:13px;font-weight:700;margin-right:6px">${opts.label}</span>Live`;

  const isLight = document.body.classList.contains('light');
  const map = L.map('stop-map-container', { zoomControl: true, attributionControl: false });
  window._stopMap = map;
  L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${isLight ? 'Default' : 'Night'}/{z}/{x}/{y}.png`, { maxZoom: 19 }).addTo(map);
  const box = map.getContainer();
  map.on('zoomstart', () => box.classList.add('campus-zooming'));   // no glide while zooming
  map.on('zoomend', () => box.classList.remove('campus-zooming'));

  const pts = (svc.Directions['1'].Stops || []).filter(s => s.Latitude != null && s.Longitude != null);
  const line = pts.map(s => [s.Latitude, s.Longitude]);
  pts.forEach(s => {
    L.circleMarker([s.Latitude, s.Longitude], { radius: 6, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 1, interactive: true })
      .bindTooltip(s.Description || s[opts.nameKey]).addTo(map)
      .on('click', () => opts.popupFn(map, s));
  });
  if (line.length) map.fitBounds(line, { padding: [24, 24] }); else map.setView(opts.defaultCentre, 15);
  return { map, color, line };
}

// Draws the route line once its path is known: the road path when there is one, else straight lines
// between stops (closed back to the first stop for loops).
function campusDrawRoute(map, svc, route, line, color, paths) {
  const path = paths[route] || (line.length > 1 && svc._isLoop !== false ? [...line, line[0]] : line);
  if (path.length > 1) L.polyline(path, { color, weight: 4, opacity: .65, lineJoin: 'round' }).addTo(map).bringToBack();
}

// White disc with a front-facing bus in the route colour; ring = crowd; optional triangle rotated to the heading.
function campusBusHtml(color, crowd, heading) {
  const ring = CAMPUS_CROWD_RING[crowd] || '#888';
  const arrow = heading == null ? '' : `<div class="campus-bus-arrow" style="transform:rotate(${heading}deg)"><i style="border-bottom-color:${ring}"></i></div>`;
  return `<div class="campus-bus-inner">${arrow}<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">
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

// New bus marker on `layer`, with tooltip HTML `tip`.
function campusBusMarker(layer, bus, color, tip) {
  const m = L.marker([bus.lat, bus.lng], {
    icon: L.divIcon({ className: 'campus-live-bus', html: campusBusHtml(color, bus.crowd, bus.heading), iconSize: [46, 46], iconAnchor: [23, 23] }),
    zIndexOffset: 1000,
  }).bindTooltip(tip, { direction: 'top', offset: [0, -23] }).addTo(layer);
  m._crowd = bus.crowd;
  return m;
}

// Move an existing marker to a fresh position and, if the crowd changed, recolour its ring; rotates the
// heading arrow when there is one. Returns true when the crowd changed (so the caller can refresh the tooltip).
function campusBusUpdate(m, bus) {
  m.setLatLng([bus.lat, bus.lng]);
  const el = m.getElement();
  const arrow = el?.querySelector('.campus-bus-arrow');
  if (arrow && bus.heading != null) arrow.style.transform = `rotate(${bus.heading}deg)`;
  if (m._crowd === bus.crowd) return false;
  m._crowd = bus.crowd;
  const ring = CAMPUS_CROWD_RING[bus.crowd] || '#888';
  el?.querySelector('svg circle')?.setAttribute('stroke', ring);
  const tri = el?.querySelector('.campus-bus-arrow i'); if (tri) tri.style.borderBottomColor = ring;
  return true;
}

// Route badge + crowd label for a bus tooltip.
function campusBusTip(svc, label, crowd, extra = '', fallbackBg = '#888') {
  const bg = svc.Color || fallbackBg;
  const crowdLabel = CAMPUS_CROWD_LABEL[crowd] ? ` · ${CAMPUS_CROWD_LABEL[crowd]}` : '';
  return `<span style="background:${bg};color:${svc.TextColor || '#fff'};border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700">${label}</span>${crowdLabel}${extra}`;
}

// ── Stop arrival popup ────────────────────────────────────────────────────────
const CAMPUS_OP_COLORS = { SBST: '#5B2D8E', SBS: '#5B2D8E', SMRT: '#C0392B', TTS: '#1A6B2A', GAS: '#9A7000' };

// One popup row: badge + next two ETAs, each with a crowd bar. eta2 may be null.
function campusPopupRow(badge, bg, fg, eta1, lc1, eta2, lc2) {
  return `<div class="campus-popup-row">
      <div class="campus-popup-badge" style="background:${bg};color:${fg}">${badge}</div>
      <div class="campus-popup-etas">
        <div class="campus-popup-eta-wrap">
          <span class="campus-popup-eta1">${eta1}</span>
          <div class="campus-popup-crowd-bar" style="background:${lc1}"></div>
        </div>
        ${eta2 ? `<div class="campus-popup-eta-wrap">
          <span class="campus-popup-eta2">${eta2}</span>
          <div class="campus-popup-crowd-bar" style="background:${lc2}"></div>
        </div>` : ''}
      </div>
    </div>`;
}

// Rows for public buses from an LTA BusArrival response (null → nothing).
function campusPublicRows(ltaData) {
  const mins = iso => { const m = Math.round((new Date(iso) - Date.now()) / 60000); return m <= 0 ? 'Arr' : m + ' min'; };
  return (ltaData?.Services || []).map(s => {
    const nb = s.NextBus, nb2 = s.NextBus2;
    if (!nb?.EstimatedArrival) return '';
    return campusPopupRow(s.ServiceNo, CAMPUS_OP_COLORS[(s.Operator || '').toUpperCase()] || '#3a3f52', '#fff',
      mins(nb.EstimatedArrival), CAMPUS_CROWD_RING[nb.Load] || '#888',
      nb2?.EstimatedArrival ? mins(nb2.EstimatedArrival) : null, nb2?.Load ? (CAMPUS_CROWD_RING[nb2.Load] || '#888') : '#888');
  }).join('');
}

// Opens a popup on the stop (loading state), then fills it with the campus rows from loadRows() plus public
// bus arrivals when the stop has a real LTA code. A stale popup (closed or replaced meanwhile) is left alone.
//   loadRows: async () => ({ rows: html, error?: bool })     opts.publicFirst: put public rows above campus rows
async function campusStopPopup(map, stop, loadRows, opts = {}) {
  const desc = stop.Description || stop.NtuStopName || stop.NusStopName;
  const hasPublic = !isNtuCode(stop.BusStopCode) && !isNusCode(stop.BusStopCode);

  const popup = L.popup({ maxWidth: 280, className: 'campus-stop-popup' })
    .setLatLng([stop.Latitude, stop.Longitude])
    .setContent(`<div class="campus-popup-inner"><div class="campus-popup-title">${desc}</div><div class="campus-popup-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</div></div>`)
    .openOn(map);

  const [campus, ltaData] = await Promise.all([
    loadRows(),
    hasPublic ? fetchLTA(stop.BusStopCode).catch(() => null) : Promise.resolve(null),
  ]);
  if (!map.hasLayer(popup)) return;

  const publicRows = campusPublicRows(ltaData);
  const allRows = opts.publicFirst ? publicRows + campus.rows : campus.rows + publicRows;
  const empty = allRows.trim() ? '' : (campus.error ? '' : '<div class="campus-popup-loading">No arrivals right now.</div>');
  const errNote = campus.error ? `<div class="campus-popup-loading" style="color:#FF9999;margin-top:4px">${campus.error}</div>` : '';
  popup.setContent(`<div class="campus-popup-inner"><div class="campus-popup-title">${desc}</div>${allRows.trim() ? allRows : empty}${errNote}</div>`);
}