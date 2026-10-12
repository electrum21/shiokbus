/* ── NUS INTERNAL SHUTTLES (nus.js) ───────────────────────────────────────────
 * Everything NUS-specific that isn't just a view flag lives here (the NUS counterpart of ntu.js).
 * Loaded as a plain <script> BEFORE app.js; it only defines things, nothing runs until app.js calls it.
 *
 * Data: ./assets/nus-shuttle.json (built by helper_scripts/nus/build_nus_assets.py) is merged into
 * PRIVATE_SERVICES by app.js (fetchPBSServices). NUS stops use synthetic "NUS-<name>" codes; the live
 * lookup uses NusStopName (the name the feed is queried with), never the code.
 *
 * One Worker call per STOP returns every route calling there (up to 3 ETAs each, in seconds), so a stop
 * served by A1 + D1 + R1 costs one request. No schedule, crowd or bus-position data exists for NUS yet.
 *
 * app.js calls into this file through:
 *   loadNusServices()                 fetch + parse nus-shuttle.json ({} on failure)
 *   nusResetIndex() / nusIndexStop()  build NUS_STOP_INDEX while injecting private services
 *   hasNus(code) / isNusCode(code)    "NUS serves this code" / "NUS code, no LTA data"
 *   renderNusStopCards(code, n)       stop view: NUS cards appended after the public ones
 *   nusRowsHtml(code)                 route view: NUS arrival rows (HTML string)
 *   nusLoopLabel(info, fallbackOrig)  "first ↻ last" (loops) or "first → last" label
 *
 * This file expects these globals from app.js (used at call time only): PROXY_URL, getProxyHeaders,
 * busTypeIcon, favSvcId, PRIVATE_SERVICES, plus goToService / addSvcFavSmart in onclick handlers.
 * ──────────────────────────────────────────────────────────────────────────── */

let NUS_STOP_INDEX = {};   // BusStopCode (NUS-…) → [{ svc, stop }, ...]

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

// Stop view: one bus-card per NUS route at this stop, filled in when the single ETA call returns.
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
  const res = await fetchNusEta(entries[0].stop.NusStopName);
  if (document.getElementById('nus-cards') !== wrap) return; // user navigated away mid-fetch
  wrap.innerHTML = entries.map(({ svc }, i) => {
    const mins = nusMinsFor(res, svc.NusRoute);
    const first = mins && mins.length ? _nusMins(mins[0]) : null;
    const next = mins && mins.length > 1 ? _nusMins(mins[1]) : null;
    const note = res.error ? 'ETA unavailable' : (first === null ? 'No buses right now' : '');
    const big = first === 'ARR' ? 'ARR' : first ? first.replace(' min', '') : '—';
    const unit = first && first !== 'ARR' ? 'min' : '';
    const fav = (window._favs || {})['svc_' + favSvcId(svc.ServiceNo)];
    return `
    <div class="bus-card" style="animation-delay:${(publicCount + i) * .09}s">
      <div class="card-top">
        <div class="bus-num-col op-nus" onclick="goToService('${svc.ServiceNo}', '${code}')" style="position:relative;${svc.Color ? `background:${svc.Color}` : ''}">
          <div class="bus-num-from">NUS</div>
          <div class="bus-num">${svc.NusRoute}</div>
          <div class="bus-num-to">Campus shuttle</div>
        </div>
        <div class="card-middle">
          <div class="arrival-row">
            <div class="first-timing"><div class="mins-big">${big}</div><div class="mins-unit">${unit}</div></div>
            ${next ? `<div class="next-pill"><span>${next}</span>${busTypeIcon('SD', true, 'var(--muted)')}</div>` : ''}
          </div>
          ${first !== null ? `<div class="bus-type-tag">${busTypeIcon('SD', false, 'var(--muted)')}</div>` : (note ? `<div class="bus-type-tag" style="color:var(--muted);font-size:11px">${note}</div>` : '')}
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
  const res = await fetchNusEta(entries[0].stop.NusStopName);
  const cell = m => `<div class="rs-time-cell"><span class="rs-time-main${m !== null && m !== undefined && m <= 1 ? ' arriving' : ''}">${m === null || m === undefined ? '—' : (m <= 0 ? 'Arr' : m + ' min')}</span></div>`;
  const html = entries.map(({ svc }) => {
    const mins = nusMinsFor(res, svc.NusRoute);
    // No buses for this route right now: hide the row. Errors still show so failures aren't silent.
    if (!res.error && !(mins && mins.length)) return '';
    const m = mins || [];
    return `<div class="rs-arrival-row">
      <div class="rs-svc-col op-nus" style="${svc.Color ? `background:${svc.Color}` : ''}" onclick="goToService('${svc.ServiceNo}', '${code}')">NUS ${svc.NusRoute}<div class="rs-dest-label">Campus shuttle</div></div>
      ${cell(m[0] ?? null)}${cell(m[1] ?? null)}${cell(m[2] ?? null)}
    </div>`;
  }).join('');
  return html + (res.error ? '<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> NUS shuttle ETAs are unavailable right now.</div>' : '');
}