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
  return Object.values(PRIVATE_SERVICES || {}).find(p => p._isNtu && p.ServiceNo === serviceNo);
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
  if (hit && Date.now() - hit.t < NTU_ETA_TTL_MS) return hit.promise;
  const promise = (async () => {
    try {
      const url = `${PROXY_URL}?endpoint=NtuBuses&RouteCode=${encodeURIComponent(route)}`;
      const res = await fetch(url, { headers: await getProxyHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) return { buses: [], failed: true };
      return { buses: json.buses || [] };
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
          <button class="sun-toggle-btn fav-btn" data-key="svc_${svc.ServiceNo}" onclick="event.stopPropagation();addSvcFavSmart('${svc.ServiceNo}')" style="background:none;justify-content:center;font-size:16px;color:${(window._favs||{})['svc_'+svc.ServiceNo]?'var(--yellow)':'var(--muted)'}">${(window._favs||{})['svc_'+svc.ServiceNo]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
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
    const [crowd1, crowd2] = ntuCrowdForStop(svc, entries[i].stop.NtuStopName, busRes[i].buses);
    return `<div class="rs-arrival-row">
      <div class="rs-svc-col op-ntu" style="${svc.Color ? `background:${svc.Color}` : ''}" onclick="goToService('${svc.ServiceNo}', '${code}')">${svc.NtuRoute}</div>
      ${cell(r.ETA, r.error, crowd1)}${cell(r.NextETA, r.error, crowd2)}<div class="rs-time-cell"></div>
    </div>`;
  }).join('');
  const anyErr = results.some(r => r.error);
  return html + (anyErr ? '<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> Some NTU ETAs are unavailable right now.</div>' : '');
}