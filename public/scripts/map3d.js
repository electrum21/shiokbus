(function () {
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
  const CITY = [103.8520, 1.2903];
  const SG = { w: 103.59, e: 104.10, s: 1.15, n: 1.48 };
  const BUS_MIN_ZOOM = 14.2;
  const STOP_ICON_ZOOM = 14.5;
  const MAX_POLL_STOPS = 12;
  const POLL_MS = 20000;
  const POLL_MIN_GAP_MS = 10000;
  const BUS_TTL_MS = 50000;
  const FRAME_MS = 40;
  const BUS_PX = 42;
  const CAMPUS = [
    { flag: '_isNtu', lat: 1.3483, lng: 103.6831, routeKey: 'NtuRoute', fetch: r => fetchNtuBuses(r), op: 'NTU' },
    { flag: '_isNus', lat: 1.2966, lng: 103.7764, routeKey: 'NusRoute', fetch: r => fetchNusBuses(r), op: 'NUS' },
  ];
  const OP_COLORS = { 'op-sbs': '#5B2D8E', 'op-smrt': '#D7181C', 'op-tts': '#1A6B2A', 'op-gas': '#9A7000', 'op-private': '#1A2C5B', 'op-ntu': '#B5121B', 'op-nus': '#003D7C' };
  const OP_NAMES = { SBST: 'SBS Transit', SMRT: 'SMRT Buses', TTS: 'Tower Transit Singapore', GAS: 'Go-Ahead Singapore', NTU: 'NTU (ComfortDelGro)', NUS: 'NUS' };
  const LOAD_LABELS = { SEA: 'Seats available', SDA: 'Standing available', LSD: 'Crowded' };
  const LOAD_COLORS = { SEA: 'var(--green)', SDA: '#FF8C00', LSD: '#FF3333' };
  const TYPE_LABELS = { SD: 'Single deck', DD: 'Double deck', BD: 'Bendy' };
  const PALETTES = {
    light: { bg: '#FFF6E9', land: '#FFEFD9', water: '#A9DEF9', park: '#C9F0C1', road: '#FFFFFF', casing: '#F1D6C2', rail: '#D9C7E8', b0: '#FFD9E1', b1: '#E4C1F9', text: '#6B5B7B', halo: '#FFF6E9', glass: '#CFEFFF', roof: '#FFFFFF', wheel: '#4A4458', dot: '#FF8FAB', dotStroke: '#FFFFFF' },
    dark: { bg: '#1B1F3B', land: '#20254A', water: '#27407A', park: '#1F4A45', road: '#343C6E', casing: '#161A33', rail: '#4B3F78', b0: '#463C74', b1: '#7A5FB5', text: '#CFC8EE', halo: '#1B1F3B', glass: '#9FD8FF', roof: '#F2EEFF', wheel: '#0E1022', dot: '#FF8FAB', dotStroke: '#1B1F3B' },
  };

  const M = {
    map: null, lib: null, initing: null, open: false, ready: false, userMoved: false,
    stops: [], stopsLen: -1, stopsSrc: null,
    buses: new Map(), seq: 0, sel: null,
    pollTimer: null, lastPoll: 0, polling: false, moveTimer: null, raf: 0, lastFrame: 0, dirty: true,
    lastUpdate: 0, hudTimer: null, userMarker: null, baseOk: true,
    resultsHome: null,
    svcRoutes: new Map(), svcPending: new Set(), svcFail: new Map(),
  };

  const $ = id => document.getElementById(id);
  const isLight = () => document.body.classList.contains('light');
  const pal = () => PALETTES[isLight() ? 'light' : 'dark'];
  const inSG = (lat, lng) => lat > SG.s && lat < SG.n && lng > SG.w && lng < SG.e;
  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s ?? '')) : String(s ?? ''));
  const toRad = d => d * Math.PI / 180;

  function metres(lat1, lng1, lat2, lng2) {
    const x = toRad(lng2 - lng1) * Math.cos(toRad((lat1 + lat2) / 2)), y = toRad(lat2 - lat1);
    return Math.sqrt(x * x + y * y) * 6371000;
  }
  function bearing(lat1, lng1, lat2, lng2) {
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function lerpAngle(a, b, t) {
    const d = ((b - a + 540) % 360) - 180;
    return (a + d * t + 360) % 360;
  }

  const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'busway', 'bus_guideway']);
  const RK = 5e4, CELL = 0.001, SNAP_M = 40;

  function buildRoads() {
    const map = M.map;
    if (!map || !M.ready || !M.roadSource || map.getZoom() < 13) return;
    let feats;
    try { feats = map.querySourceFeatures(M.roadSource, { sourceLayer: 'transportation' }); } catch (e) { return; }
    const nodes = new Map(), cells = new Map();
    const node = (lng, lat) => {
      const k = Math.round(lng * RK) + ':' + Math.round(lat * RK);
      let n = nodes.get(k);
      if (!n) { n = { lng, lat, adj: [] }; nodes.set(k, n); }
      return n;
    };
    const link = (a, b, d) => {
      if (a === b || a.adj.some(e => e.n === b)) return false;
      a.adj.push({ n: b, d }); b.adj.push({ n: a, d });
      return true;
    };
    const addLine = line => {
      let prev = null;
      for (const c of line) {
        const n = node(c[0], c[1]);
        if (prev && prev !== n && link(prev, n, metres(prev.lat, prev.lng, n.lat, n.lng))) {
          const x0 = Math.floor(Math.min(prev.lng, n.lng) / CELL), x1 = Math.floor(Math.max(prev.lng, n.lng) / CELL);
          const y0 = Math.floor(Math.min(prev.lat, n.lat) / CELL), y1 = Math.floor(Math.max(prev.lat, n.lat) / CELL);
          for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
            const k = x + ':' + y;
            let list = cells.get(k);
            if (!list) cells.set(k, list = []);
            list.push([prev, n]);
          }
        }
        prev = n;
      }
    };
    for (const f of feats) {
      if (!ROAD_CLASSES.has(f.properties?.class)) continue;
      const g = f.geometry;
      if (g.type === 'LineString') addLine(g.coordinates);
      else if (g.type === 'MultiLineString') g.coordinates.forEach(addLine);
    }
    M.roads = { nodes, cells };
    for (const n of nodes.values()) {
      if (n.adj.length !== 1) continue;
      const s = roadSnap(n.lat, n.lng, 3, n);
      if (s) { link(n, s.a, s.da); link(n, s.b, s.db); }
    }
  }

  function roadSnap(lat, lng, maxM, skip, accept) {
    const roads = M.roads;
    if (!roads) return null;
    const kx = 111320 * Math.cos(toRad(lat)), ky = 110540;
    const cx = Math.floor(lng / CELL), cy = Math.floor(lat / CELL);
    let best = null, bestD = maxM;
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
      const list = roads.cells.get(x + ':' + y);
      if (!list) continue;
      for (const [a, b] of list) {
        if (a === skip || b === skip) continue;
        const ax = (a.lng - lng) * kx, ay = (a.lat - lat) * ky, bx = (b.lng - lng) * kx, by = (b.lat - lat) * ky;
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
        const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px, py);
        if (d < bestD) {
          if (accept && !accept(lat + py / ky, lng + px / kx)) continue;
          const len = Math.sqrt(len2);
          bestD = d;
          best = { lat: lat + py / ky, lng: lng + px / kx, a, b, da: len * t, db: len * (1 - t), d };
        }
      }
    }
    return best;
  }

  // ── ROUTE-CONSTRAINED SNAP ──
  // Buses are snapped to roads that lie near their own service's route (built
  // from its stop sequence), so a reading can't land on a parallel road.
  const CORRIDOR_M = 45;
  const svcKey = svc => String(svc).replace(/^0+/, '').toUpperCase();

  function loadSvcRoute(svc) {
    const key = svcKey(svc);
    if (M.svcRoutes.has(key) || M.svcPending.has(key)) return;
    if (Date.now() - (M.svcFail.get(key) || 0) < 60000) return;
    if (typeof fetchBusRoute !== 'function' || typeof stopByCode !== 'function') return;
    M.svcPending.add(key);
    fetchBusRoute(key).then(rows => {
      const byDir = new Map();
      for (const r of rows || []) {
        if (!byDir.has(r.Direction)) byDir.set(r.Direction, []);
        byDir.get(r.Direction).push(r);
      }
      const out = {};
      for (const [dir, list] of byDir) {
        list.sort((x, y) => x.StopSequence - y.StopSequence);
        const pts = [];
        for (const r of list) {
          const st = stopByCode(r.BusStopCode);
          const lat = parseFloat(st?.Latitude), lng = parseFloat(st?.Longitude);
          if (isFinite(lat) && isFinite(lng)) pts.push({ lat, lng, code: r.BusStopCode });
        }
        if (pts.length >= 2) out[dir] = { pts, last: String(list[list.length - 1].BusStopCode) };
      }
      if (Object.keys(out).length) M.svcRoutes.set(key, out);
      else M.svcFail.set(key, Date.now());
    }).catch(() => { M.svcFail.set(key, Date.now()); }).finally(() => M.svcPending.delete(key));
  }

  function routeDir(route, nb) {
    const dirs = Object.values(route);
    let hit = nb.destCode ? dirs.find(d => d.last === String(nb.destCode)) : null;
    if (!hit && nb.nextStop) hit = dirs.find(d => d.pts.some(p => p.code === nb.nextStop));
    return hit || null;
  }

  function distToLine(lat, lng, pts) {
    const kx = 111320 * Math.cos(toRad(lat)), ky = 110540;
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const ax = (pts[i - 1].lng - lng) * kx, ay = (pts[i - 1].lat - lat) * ky;
      const bx = (pts[i].lng - lng) * kx, by = (pts[i].lat - lat) * ky;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      const d = Math.hypot(ax + dx * t, ay + dy * t);
      if (d < best) best = d;
    }
    return best;
  }

  function snapForBus(nb) {
    const plain = () => roadSnap(nb.lat, nb.lng, SNAP_M);
    if (nb.campus) return plain();
    const route = M.svcRoutes.get(svcKey(nb.svc));
    if (!route) { loadSvcRoute(nb.svc); return plain(); }
    const dir = routeDir(route, nb);
    if (!dir) return plain();
    const near = roadSnap(nb.lat, nb.lng, SNAP_M, undefined, (la, ln) => distToLine(la, ln, dir.pts) <= CORRIDOR_M);
    return near || plain();
  }

  function heapPush(h, item) {
    let i = h.push(item) - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p][0] <= h[i][0]) break;
      [h[p], h[i]] = [h[i], h[p]]; i = p;
    }
  }
  function heapPop(h) {
    const top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]]; i = m;
      }
    }
    return top;
  }

  function makePath(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + metres(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng));
    return { pts, cum, total: cum[cum.length - 1], i: 1 };
  }

  function roadRoute(s1, s2, maxLen) {
    if ((s1.a === s2.a && s1.b === s2.b) || (s1.a === s2.b && s1.b === s2.a)) return makePath([s1, s2]);
    const dist = new Map(), prev = new Map(), heap = [];
    const relax = (n, d, from) => {
      if (d > maxLen || d >= (dist.get(n) ?? Infinity)) return;
      dist.set(n, d); prev.set(n, from); heapPush(heap, [d, n]);
    };
    relax(s1.a, s1.da, null); relax(s1.b, s1.db, null);
    let best = Infinity, bestEnd = null;
    while (heap.length) {
      const [d, u] = heapPop(heap);
      if (d >= best) break;
      if (d > dist.get(u)) continue;
      if (u === s2.a && d + s2.da < best) { best = d + s2.da; bestEnd = u; }
      if (u === s2.b && d + s2.db < best) { best = d + s2.db; bestEnd = u; }
      for (const e of u.adj) relax(e.n, d + e.d, u);
    }
    if (!bestEnd || best > maxLen) return null;
    const mid = [];
    for (let n = bestEnd; n; n = prev.get(n)) mid.push(n);
    mid.reverse();
    return makePath([s1, ...mid, s2]);
  }

  function alongPath(path, t) {
    const target = path.total * t, { pts, cum } = path;
    let i = path.i;
    if (cum[i - 1] > target) i = 1;
    while (i < pts.length - 1 && cum[i] < target) i++;
    path.i = i;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1];
    const f = seg > 0 ? Math.min(1, Math.max(0, (target - cum[i - 1]) / seg)) : 1;
    return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, brg: seg > 1.5 ? bearing(a.lat, a.lng, b.lat, b.lng) : null };
  }

  function scheduleRoads() {
    clearTimeout(M.roadTimer);
    M.roadTimer = setTimeout(() => { if (M.open) buildRoads(); }, 500);
  }

  function loadLib() {
    if (M.lib) return M.lib;
    M.lib = new Promise((resolve, reject) => {
      if (window.maplibregl) return resolve();
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'assets/maplibre-gl.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'scripts/maplibre-gl.js';
      js.onload = () => resolve();
      js.onerror = () => { M.lib = null; reject(new Error('Map library failed to load')); };
      document.head.appendChild(js);
    });
    return M.lib;
  }

  async function loadBaseStyle() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    try {
      const res = await fetch(STYLE_URL, { signal: ctl.signal });
      if (!res.ok) throw new Error('style ' + res.status);
      const style = await res.json();
      if (!style || !Array.isArray(style.layers)) throw new Error('bad style');
      M.baseOk = true;
      return style;
    } catch (e) {
      M.baseOk = false;
      return { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': pal().bg } }] };
    } finally { clearTimeout(timer); }
  }

  function setPaint(id, prop, value) { try { M.map.setPaintProperty(id, prop, value); } catch (e) {} }
  function setLayout(id, prop, value) { try { M.map.setLayoutProperty(id, prop, value); } catch (e) {} }

  function applyPalette() {
    const map = M.map, p = pal();
    if (!map) return;
    const wrap = $('map3d-wrap');
    if (wrap) wrap.style.background = p.bg;
    const buildingColor = ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, p.b0, 120, p.b1];
    for (const l of map.getStyle().layers) {
      if (l.id.startsWith('sb-')) continue;
      const sl = l['source-layer'] || '', id = l.id.toLowerCase();
      if (l.type === 'background') setPaint(l.id, 'background-color', p.bg);
      else if (l.type === 'fill') {
        if (sl === 'water') setPaint(l.id, 'fill-color', p.water);
        else if (sl === 'park' || sl === 'landcover') setPaint(l.id, 'fill-color', p.park);
        else if (sl === 'building') { setPaint(l.id, 'fill-color', p.b0); setPaint(l.id, 'fill-outline-color', p.b0); }
        else if (sl === 'landuse' || sl === 'aeroway') setPaint(l.id, 'fill-color', p.land);
        else if (sl === 'transportation') setPaint(l.id, 'fill-color', p.road);
        try { map.setPaintProperty(l.id, 'fill-pattern', undefined); } catch (e) {}
      } else if (l.type === 'line') {
        if (sl === 'waterway' || sl === 'water') setPaint(l.id, 'line-color', p.water);
        else if (sl === 'transportation') setPaint(l.id, 'line-color', /rail|transit/.test(id) ? p.rail : /casing|outline/.test(id) ? p.casing : p.road);
        else if (sl === 'boundary') setLayout(l.id, 'visibility', 'none');
        else if (sl === 'park' || sl === 'landcover') setPaint(l.id, 'line-color', p.park);
        else if (sl === 'aeroway') setPaint(l.id, 'line-color', p.road);
      } else if (l.type === 'fill-extrusion') {
        setPaint(l.id, 'fill-extrusion-color', buildingColor);
        setPaint(l.id, 'fill-extrusion-opacity', 0.92);
      } else if (l.type === 'symbol') {
        if (sl === 'poi' || sl === 'housenumber' || sl === 'aerodrome_label') setLayout(l.id, 'visibility', 'none');
        else { setPaint(l.id, 'text-color', p.text); setPaint(l.id, 'text-halo-color', p.halo); setPaint(l.id, 'text-halo-width', 1.4); }
      }
    }
    if (map.getLayer('sb-bg-tint')) setPaint('sb-bg-tint', 'background-color', p.bg);
    if (map.getLayer('sb-buildings')) setPaint('sb-buildings', 'fill-extrusion-color', buildingColor);
    if (map.getLayer('sb-stops-dot')) { setPaint('sb-stops-dot', 'circle-color', p.dot); setPaint('sb-stops-dot', 'circle-stroke-color', p.dotStroke); }
    if (map.getLayer('sb-stops-name')) { setPaint('sb-stops-name', 'text-color', p.text); setPaint('sb-stops-name', 'text-halo-color', p.halo); }
    M.dirty = true;
    drawBuses();
  }

  function canvasImage(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx);
    return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data };
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function stopImage(color) {
    return canvasImage(72, 88, ctx => {
      ctx.fillStyle = 'rgba(40,30,70,0.22)';
      ctx.beginPath(); ctx.ellipse(36, 82, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(24, 56); ctx.lineTo(36, 82); ctx.lineTo(48, 56); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(36, 34, 31, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(36, 34, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 21, 19, 30, 27, 7); ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, 25, 23, 22, 10, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(28, 40, 2.6, 0, Math.PI * 2); ctx.arc(44, 40, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(27, 48, 3.4, 0, Math.PI * 2); ctx.arc(45, 48, 3.4, 0, Math.PI * 2); ctx.fill();
    });
  }
  function labelImage(text, bg, fg) {
    const font = '700 26px LTAIdentity, "Barlow Condensed", Arial, sans-serif';
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const w = Math.max(56, Math.ceil(m.measureText(text).width) + 32), h = 56;
    return canvasImage(w, h, ctx => {
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 0, 0, w, 44, 22); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2 - 9, 42); ctx.lineTo(w / 2, 56); ctx.lineTo(w / 2 + 9, 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = bg;
      roundRect(ctx, 4, 4, w - 8, 36, 18); ctx.fill();
      ctx.font = font; ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, 23);
    });
  }

  function addOwnLayers() {
    const map = M.map, p = pal();
    const empty = { type: 'FeatureCollection', features: [] };
    const layers = map.getStyle().layers;
    const firstSymbol = layers.find(l => l.type === 'symbol');
    M.roadSource = (M.baseOk && layers.find(l => l['source-layer'] === 'transportation' && l.source)?.source) || null;

    if (M.baseOk && !layers.some(l => l.type === 'fill-extrusion')) {
      const b = layers.find(l => l['source-layer'] === 'building' && l.source);
      if (b) {
        try {
          map.addLayer({
            id: 'sb-buildings', type: 'fill-extrusion', source: b.source, 'source-layer': 'building', minzoom: 14,
            paint: {
              'fill-extrusion-color': p.b0,
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.92,
            },
          }, firstSymbol && firstSymbol.id);
        } catch (e) {}
      }
    }

    map.addImage('sb-stop', stopImage('#FF8FAB'), { pixelRatio: 2 });
    map.addImage('sb-stop-campus', stopImage('#5BC8E8'), { pixelRatio: 2 });
    map.on('styleimagemissing', e => {
      if (!e.id.startsWith('sbl|') || map.hasImage(e.id)) return;
      const [, text, bg, fg] = e.id.split('|');
      map.addImage(e.id, labelImage(text, bg, fg), { pixelRatio: 2 });
    });

    map.addSource('sb-stops', { type: 'geojson', data: empty });
    map.addSource('sb-sel', { type: 'geojson', data: empty });
    map.addSource('sb-bus-parts', { type: 'geojson', data: empty });
    map.addSource('sb-bus-pts', { type: 'geojson', data: empty });

    map.addLayer({
      id: 'sb-stops-dot', type: 'circle', source: 'sb-stops', minzoom: 11.5, maxzoom: STOP_ICON_ZOOM,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.5, 1.4, 14.5, 4.5],
        'circle-color': p.dot, 'circle-stroke-color': p.dotStroke,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 0, 14.5, 1.5],
        'circle-opacity': 0.9,
      },
    });
    map.addLayer({
      id: 'sb-sel-ring', type: 'circle', source: 'sb-sel',
      paint: { 'circle-radius': 26, 'circle-color': '#FFD000', 'circle-opacity': 0.28, 'circle-stroke-color': '#FFD000', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' },
    });
    map.addLayer({
      id: 'sb-bus-parts', type: 'fill-extrusion', source: 'sb-bus-parts', minzoom: BUS_MIN_ZOOM - 1,
      paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1 },
    });
    map.addLayer({
      id: 'sb-stops-icon', type: 'symbol', source: 'sb-stops', minzoom: STOP_ICON_ZOOM,
      layout: {
        'icon-image': ['case', ['get', 'campus'], 'sb-stop-campus', 'sb-stop'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 14.5, 0.55, 17, 0.9],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      },
    });
    const fontLayer = M.baseOk && layers.find(l => l.type === 'symbol' && Array.isArray(l.layout?.['text-font']));
    if (fontLayer) {
      try {
        map.addLayer({
          id: 'sb-stops-name', type: 'symbol', source: 'sb-stops', minzoom: 16.2,
          layout: { 'text-field': ['get', 'name'], 'text-font': fontLayer.layout['text-font'], 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.3], 'text-optional': true, 'text-max-width': 8 },
          paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 1.5 },
        });
      } catch (e) {}
    }
    map.addLayer({
      id: 'sb-bus-label', type: 'symbol', source: 'sb-bus-pts', minzoom: BUS_MIN_ZOOM - 1,
      layout: {
        'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-offset': [0, -30],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 13.5, 0.7, 17, 1],
        'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'symbol-sort-key': ['get', 'sort'],
      },
    });
  }

  function refreshStops() {
    if (!M.map || !M.ready) return;
    const all = (typeof ALL_STOPS !== 'undefined' && ALL_STOPS) || null;
    if (!all) {
      if (typeof fetchAllStops === 'function') fetchAllStops().then(refreshStops).catch(() => hud('Could not load bus stops'));
      return;
    }
    if (all === M.stopsSrc && all.length === M.stopsLen) return;
    M.stopsSrc = all; M.stopsLen = all.length;
    M.stops = [];
    const features = [];
    for (const s of all) {
      const lat = parseFloat(s.Latitude), lng = parseFloat(s.Longitude);
      if (!isFinite(lat) || !isFinite(lng) || !inSG(lat, lng)) continue;
      const code = String(s.BusStopCode);
      M.stops.push({ code, lat, lng, lta: /^\d{5}$/.test(code) });
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { code, name: s.Description || '', campus: !!(s._isNtu || s._isNus) } });
    }
    M.map.getSource('sb-stops').setData({ type: 'FeatureCollection', features });
    schedulePoll(400);
  }

  function hud(text) { const el = $('map3d-hud'); if (el) el.textContent = text; }
  function updateHud() {
    if (!M.map || !M.ready) return;
    if (M.map.getZoom() < BUS_MIN_ZOOM) return hud('Zoom in to see live buses');
    if (!M.lastUpdate) return hud('Finding buses…');
    const n = M.buses.size, age = Math.max(0, Math.round((Date.now() - M.lastUpdate) / 1000));
    hud(`${n} bus${n === 1 ? '' : 'es'} nearby · updated ${age}s ago`);
  }

  function opInfo(svcNo, operator) {
    const key = (typeof normalizeServiceNo === 'function' ? normalizeServiceNo(String(svcNo).replace(/^0+/, '').toUpperCase()) : svcNo);
    const info = (typeof ALL_SERVICES !== 'undefined' && ALL_SERVICES) ? (ALL_SERVICES[key + '-1'] || ALL_SERVICES[key + '-2']) : null;
    const cls = typeof opClass === 'function' ? opClass((operator || '').toUpperCase(), !!info?._isPrivate) : 'op-smrt';
    return { cls, color: OP_COLORS[cls] || '#D7181C' };
  }

  const SAME_BUS_M = 250;

  function collectLta(results, codes) {
    const cands = [];
    results.forEach((res, i) => {
      if (res.status !== 'fulfilled') return;
      const stop = codes[i];
      for (const s of res.value.Services || []) {
        for (const nb of [s.NextBus, s.NextBus2, s.NextBus3]) {
          if (!nb || !nb.EstimatedArrival) continue;
          const lat = parseFloat(nb.Latitude), lng = parseFloat(nb.Longitude);
          if (!isFinite(lat) || !isFinite(lng) || !inSG(lat, lng)) continue;
          const eta = (new Date(nb.EstimatedArrival).getTime() - Date.now()) / 60000;
          cands.push({ s, nb, lat, lng, eta, stop: stop.code, group: 'lta|' + s.ServiceNo + '|' + (nb.DestinationCode || '') + '|' + (nb.Type || 'SD') });
        }
      }
    });
    cands.sort((x, y) => x.eta - y.eta);
    const clusters = new Map();
    const out = [];
    for (const c of cands) {
      let list = clusters.get(c.group);
      if (!list) clusters.set(c.group, list = []);
      let best = null, bestD = SAME_BUS_M;
      for (const cl of list) {
        if (cl.stops.has(c.stop)) continue;
        const d = metres(c.lat, c.lng, cl.lat, cl.lng);
        if (d < bestD) { bestD = d; best = cl; }
      }
      if (best) { best.stops.add(c.stop); continue; }
      const { s, nb } = c;
      const { cls, color } = opInfo(s.ServiceNo, s.Operator);
      const bus = {
        group: c.group, svc: s.ServiceNo, label: typeof formatSvcNo === 'function' ? formatSvcNo(s.ServiceNo) : s.ServiceNo,
        operator: (s.Operator || '').toUpperCase(), opCls: cls, color, fg: '#FFFFFF',
        lat: c.lat, lng: c.lng, type: nb.Type || 'SD', load: nb.Load || '', feature: nb.Feature || '',
        destCode: nb.DestinationCode || '', nextStop: c.stop, eta: c.eta, heading: null, campus: null, stops: new Set([c.stop]),
      };
      list.push(bus);
      out.push(bus);
    }
    return out;
  }

  async function collectCampus(center) {
    const out = [];
    const priv = (typeof PRIVATE_SERVICES !== 'undefined' && PRIVATE_SERVICES) || null;
    if (!priv) return out;
    for (const c of CAMPUS) {
      if (metres(center.lat, center.lng, c.lat, c.lng) > 2600) continue;
      const svcs = Object.values(priv).filter(p => p[c.flag] && p[c.routeKey]);
      const results = await Promise.all(svcs.map(svc => c.fetch(svc[c.routeKey]).catch(() => ({ buses: [] }))));
      results.forEach((r, i) => {
        const svc = svcs[i];
        for (const b of r.buses || []) {
          const lat = Number(b.lat), lng = Number(b.lng);
          if (!isFinite(lat) || !isFinite(lng) || !inSG(lat, lng)) continue;
          out.push({
            group: 'campus|' + svc.ServiceNo, svc: svc.ServiceNo, label: String(svc[c.routeKey]),
            operator: c.op, opCls: c.flag === '_isNtu' ? 'op-ntu' : 'op-nus', color: svc.Color || OP_COLORS['op-ntu'], fg: svc.TextColor || '#FFFFFF',
            lat, lng, type: 'SD', load: b.crowd || '', feature: '', destCode: '', nextStop: '', eta: null,
            heading: Number.isFinite(b.heading) ? b.heading : null,
            plate: b.plate || '', campus: { ridership: b.ridership, capacity: b.capacity },
          });
        }
      });
    }
    return out;
  }

  function mergeBuses(incoming, polledStops, campusPolled) {
    const now = Date.now();
    const byGroup = new Map();
    for (const b of M.buses.values()) {
      if (!byGroup.has(b.group)) byGroup.set(b.group, []);
      byGroup.get(b.group).push(b);
    }
    const claimed = new Set();
    const pairs = [];
    incoming.forEach((nb, i) => {
      for (const ob of byGroup.get(nb.group) || []) {
        if (nb.plate && ob.plate) { if (nb.plate === ob.plate) pairs.push([0, i, ob]); continue; }
        const d = metres(nb.lat, nb.lng, ob.to.lat, ob.to.lng);
        if (d < 1500) pairs.push([d, i, ob]);
      }
    });
    pairs.sort((a, b) => a[0] - b[0]);
    const matched = new Map();
    for (const [, i, ob] of pairs) {
      if (matched.has(i) || claimed.has(ob.id)) continue;
      matched.set(i, ob); claimed.add(ob.id);
    }
    incoming.forEach((nb, i) => {
      let b = matched.get(i);
      const snap = snapForBus(nb);
      const tgt = snap ? { lat: snap.lat, lng: snap.lng } : { lat: nb.lat, lng: nb.lng };
      if (!b) {
        let heading = nb.heading;
        if (heading == null && nb.nextStop) {
          const st = typeof stopByCode === 'function' ? stopByCode(nb.nextStop) : null;
          const sl = parseFloat(st?.Latitude), sg = parseFloat(st?.Longitude);
          if (isFinite(sl) && isFinite(sg) && metres(nb.lat, nb.lng, sl, sg) > 15) heading = bearing(nb.lat, nb.lng, sl, sg);
        }
        if (snap && nb.heading == null) {
          const road = bearing(snap.a.lat, snap.a.lng, snap.b.lat, snap.b.lng);
          const off = heading == null ? 0 : Math.abs(((heading - road + 540) % 360) - 180);
          heading = off > 90 ? (road + 180) % 360 : road;
        }
        b = { id: 'b' + (++M.seq), from: { ...tgt }, to: { ...tgt }, cur: { ...tgt }, heading: heading ?? 0, headTo: heading ?? 0, headFinal: null, path: null, t0: now, dur: 1 };
        M.buses.set(b.id, b);
      } else {
        const moved = metres(b.cur.lat, b.cur.lng, tgt.lat, tgt.lng);
        b.from = { lat: b.cur.lat, lng: b.cur.lng };
        b.to = tgt;
        b.t0 = now;
        b.dur = moved > 4 ? POLL_MS : 1;
        b.path = null;
        if (snap && moved > 6 && moved < 1500) {
          const start = roadSnap(b.cur.lat, b.cur.lng, SNAP_M);
          if (start) b.path = roadRoute(start, snap, moved * 2.5 + 150);
        }
        b.headFinal = nb.heading;
        if (!b.path) b.headTo = nb.heading != null ? nb.heading : (moved > 12 ? bearing(b.cur.lat, b.cur.lng, tgt.lat, tgt.lng) : b.heading);
      }
      Object.assign(b, {
        group: nb.group, svc: nb.svc, label: nb.label, operator: nb.operator, opCls: nb.opCls, color: nb.color, fg: nb.fg,
        type: nb.type, load: nb.load, feature: nb.feature, destCode: nb.destCode, nextStop: nb.nextStop, eta: nb.eta,
        plate: nb.plate || '', campus: nb.campus, seen: now, stops: nb.stops || null,
      });
    });
    for (const [id, b] of M.buses) {
      if (b.seen === now) continue;
      let gone = now - b.seen > BUS_TTL_MS;
      if (!gone && b.campus) gone = campusPolled.has(b.group);
      if (!gone && b.stops) for (const st of b.stops) if (polledStops.has(st)) { gone = true; break; }
      if (gone) M.buses.delete(id);
    }
    const kept = [...M.buses.values()].filter(b => !b.campus && b.seen === now);
    for (const [id, b] of M.buses) {
      if (b.campus || b.seen === now) continue;
      if (kept.some(k => k.group === b.group && metres(k.to.lat, k.to.lng, b.to.lat, b.to.lng) < SAME_BUS_M)) M.buses.delete(id);
    }
    if (M.sel?.kind === 'bus') {
      if (M.buses.has(M.sel.id)) renderBusSheet(M.buses.get(M.sel.id));
      else closeSheet();
    }
    M.dirty = true;
    startLoop();
  }

  function pickStops() {
    const map = M.map, b = map.getBounds(), c = map.getCenter();
    const w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
    const inView = [];
    for (const st of M.stops) {
      if (!st.lta || st.lng < w || st.lng > e || st.lat < s || st.lat > n) continue;
      const dx = st.lng - c.lng, dy = st.lat - c.lat;
      inView.push([dx * dx + dy * dy, st]);
    }
    inView.sort((a, b2) => a[0] - b2[0]);
    if (inView.length <= MAX_POLL_STOPS) return inView.map(x => x[1]);
    const picked = [], cell = new Set();
    const gx = (e - w) / 4, gy = (n - s) / 3;
    for (const [, st] of inView) {
      const k = Math.floor((st.lng - w) / gx) + ':' + Math.floor((st.lat - s) / gy);
      if (cell.has(k)) continue;
      cell.add(k); picked.push(st);
      if (picked.length >= MAX_POLL_STOPS) return picked;
    }
    for (const [, st] of inView) {
      if (picked.includes(st)) continue;
      picked.push(st);
      if (picked.length >= MAX_POLL_STOPS) break;
    }
    return picked;
  }

  async function poll() {
    if (!M.open || !M.ready || M.polling || document.hidden) return;
    if (M.map.getZoom() < BUS_MIN_ZOOM) { updateHud(); return; }
    M.polling = true; M.lastPoll = Date.now();
    try {
      const stops = pickStops();
      const c = M.map.getCenter();
      const [ltaRes, campus] = await Promise.all([
        Promise.allSettled(stops.map(st => fetchLTA(st.code))),
        collectCampus({ lat: c.lat, lng: c.lng }).catch(() => []),
      ]);
      if (!M.open) return;
      const incoming = collectLta(ltaRes, stops).concat(campus);
      const anyOk = ltaRes.some(r => r.status === 'fulfilled') || campus.length || !stops.length;
      if (anyOk) {
        const polledStops = new Set(stops.filter((st, i) => ltaRes[i].status === 'fulfilled').map(st => st.code));
        mergeBuses(incoming, polledStops, new Set(campus.map(b => b.group)));
        M.lastUpdate = Date.now();
      }
      updateHud();
    } finally { M.polling = false; }
  }

  function schedulePoll(delay) {
    clearTimeout(M.moveTimer);
    M.moveTimer = setTimeout(() => {
      const wait = POLL_MIN_GAP_MS - (Date.now() - M.lastPoll);
      if (wait > 0) return schedulePoll(wait);
      poll();
    }, delay);
  }

  function startTimers() {
    stopTimers();
    M.pollTimer = setInterval(poll, POLL_MS);
    M.hudTimer = setInterval(updateHud, 1000);
    schedulePoll(300);
  }
  function stopTimers() {
    clearInterval(M.pollTimer); clearInterval(M.hudTimer); clearTimeout(M.moveTimer); clearTimeout(M.roadTimer);
    M.pollTimer = M.hudTimer = M.moveTimer = null;
    cancelAnimationFrame(M.raf); M.raf = 0;
  }

  function localPoly(pts, lat, lng, cosLat, sinH, cosH) {
    const ring = pts.map(([x, y]) => {
      const east = x * sinH - y * cosH, north = x * cosH + y * sinH;
      return [lng + east / (111320 * cosLat), lat + north / 110540];
    });
    ring.push(ring[0]);
    return ring;
  }
  function roundedRect(L, W, r) {
    const hx = L / 2 - r, hy = W / 2 - r, pts = [];
    for (const [cx, cy, a0] of [[hx, hy, 0], [-hx, hy, 90], [-hx, -hy, 180], [hx, -hy, 270]]) {
      for (let i = 0; i <= 3; i++) { const a = toRad(a0 + i * 30); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    }
    return pts;
  }
  function box(cx, cy, l, w) { return [[cx + l / 2, cy + w / 2], [cx - l / 2, cy + w / 2], [cx - l / 2, cy - w / 2], [cx + l / 2, cy - w / 2]]; }
  function tint(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const ch = s => { const v = (n >> s) & 255; return Math.round(v + (255 - v) * amt); };
    return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
  }

  const LIVERY = { green: '#8FD42A', pod: '#7CC21F', glass: '#1E2A32', silver: '#DADFE3', black: '#15191C', wheel: '#1A1A1E', joint: '#3B3F44', led: '#FF9A1F', head: '#FFF4B8', tail: '#E5332A' };

  const CAMPUS_LIVERY = {
    'op-ntu': { body: '#1F56D8', roof: '#1A3FB0', pod: '#15338C', stripe: '#3FC1F0', bumper: '#E0263C', led: '#FFC247', rear: '#2E8FF0', mid: '#2566E4', cap: '#2F5BEA' },
    'op-nus': { body: '#F28A1C', roof: '#2458C9', pod: '#1B449C', stripe: '#F28A1C', bumper: '#F28A1C', led: '#FF5A4D' },
  };

  function capsule(x0, x1, W, rBack, rFront) {
    const hy = W / 2, pts = [];
    for (const [cx, cy, a0, r] of [[x1 - rFront, hy - rFront, 0, rFront], [x0 + rBack, hy - rBack, 90, rBack], [x0 + rBack, -(hy - rBack), 180, rBack], [x1 - rFront, -(hy - rFront), 270, rFront]]) {
      if (!r) { pts.push([cx, cy]); continue; }
      for (let i = 0; i <= 3; i++) { const a = toRad(a0 + i * 30); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    }
    return pts;
  }

  function busFrame(lat, lng, heading) {
    return { lat, lng, cosLat: Math.cos(toRad(lat)), sinH: Math.sin(toRad(heading)), cosH: Math.cos(toRad(heading)) };
  }
  function framePoint(f, x, k) {
    return { lat: f.lat + (x * k * f.cosH) / 110540, lng: f.lng + (x * k * f.sinH) / (111320 * f.cosLat) };
  }

  function busSection(add, f, o) {
    const { x0, x1, W, body, dd, front, rear, wheels } = o;
    const rb = rear ? 0.9 : 0.25, rf = front ? 1.0 : 0.25;
    const full = capsule(x0, x1, W, rb, rf);
    const cap = rear ? 1.0 : 0;
    const glassBand = (base, top) => {
      if (cap) {
        add(f, capsule(x0, x0 + cap, W, rb, 0), base, top, body);
        add(f, capsule(x0 + cap, x1, W, 0, rf), base, top, LIVERY.glass);
      } else add(f, full, base, top, LIVERY.glass);
    };
    for (const wx of wheels) for (const sy of [1, -1]) {
      add(f, box(wx, sy * (W / 2 - 0.2), 1.6, 0.9), 0, 1.45, LIVERY.wheel);
      if (o.detail) add(f, box(wx, sy * (W / 2 + 0.3), 0.75, 0.14), 0.35, 1.1, LIVERY.silver);
    }
    let top;
    if (dd) {
      const nose = front ? 1.3 : 0;
      add(f, full, 0.6, 2.0, body);
      add(f, full, 2.0, 2.15, LIVERY.silver);
      glassBand(2.15, 3.55);
      if (nose) {
        add(f, capsule(x0, x1 - nose, W, rb, 0), 3.55, 4.4, body);
        add(f, capsule(x1 - nose, x1, W, 0, rf), 3.55, 4.4, LIVERY.black);
      } else add(f, full, 3.55, 4.4, body);
      glassBand(4.4, 5.85);
      if (nose) {
        add(f, capsule(x0, x1 - nose * 1.7, W, rb, 0), 5.85, 6.25, body);
        add(f, capsule(x1 - nose * 1.7, x1, W, 0, rf), 5.85, 6.25, LIVERY.black);
      } else add(f, full, 5.85, 6.25, body);
      top = 6.25;
      if (front) add(f, box(x1 + 0.04, 0, 0.14, W * 0.6), 3.7, 4.25, LIVERY.led);
    } else {
      const c = o.campus, len = x1 - x0, d = !!(o.detail && c);
      if (c && front) {
        const nose = 1.1, bumperTop = d ? 1.6 : 1.25;
        if (d && c.rear) {
          const s1 = x0 + len * 0.36, s2 = x0 + len * 0.5;
          add(f, capsule(x0, s1, W, rb, 0), 0.6, 2.2, c.rear);
          add(f, capsule(s1, s2, W, 0, 0), 0.6, 2.2, c.mid || body);
          add(f, capsule(s2, x1 - nose, W, 0, 0), 0.6, 2.2, body);
        } else add(f, capsule(x0, x1 - nose, W, rb, 0), 0.6, 2.2, body);
        add(f, capsule(x1 - nose, x1, W, 0, rf), 0.6, bumperTop, c.bumper);
        add(f, capsule(x1 - nose, x1, W, 0, rf), bumperTop, 2.2, LIVERY.black);
      } else add(f, full, 0.6, 2.2, body);
      add(f, full, 2.2, 2.38, c ? c.stripe : LIVERY.silver);
      glassBand(2.38, 4.15);
      if (d) for (const t of [0.2, 0.34, 0.48, 0.62]) add(f, box(x0 + len * t, 0, 0.16, W + 0.08), 2.38, 4.15, body);
      if (d && c.cap) {
        const cut = x1 - len * 0.2;
        add(f, capsule(x0, cut, W, rb, 0), 4.15, 4.5, c.roof);
        add(f, capsule(cut, x1, W, 0, rf), 4.15, 4.5, c.cap);
      } else add(f, full, 4.15, 4.5, c ? c.roof : body);
      top = 4.5;
      if (c) {
        const rearH = d ? 0.3 : 0.45, frontH = d ? 0.6 : 0.45;
        add(f, capsule(x0 + len * 0.08, x0 + len * 0.46, W * 0.7, 0.3, 0.3), top, top + rearH, c.pod);
        add(f, capsule(x0 + len * 0.52, x0 + len * 0.9, W * 0.7, 0.3, 0.3), top, top + frontH, c.pod);
      } else add(f, capsule(x0 + len * 0.3, x0 + len * 0.72, W * 0.62, 0.3, 0.3), top, top + 0.4, o.pod);
      if (d && front) for (const sy of [1, -1]) add(f, box(x1 - 0.9, sy * (W / 2 + 0.25), 0.3, 0.55), 2.5, 3.5, LIVERY.black);
      if (front) add(f, box(x1 + 0.04, 0, 0.14, W * 0.58), 3.55, 4.05, c ? c.led : LIVERY.led);
    }
    if (front) for (const sy of [1, -1]) add(f, box(x1 - 0.1, sy * W * 0.3, 0.4, 0.8), 0.95, 1.45, LIVERY.head);
    if (rear) for (const sy of [1, -1]) add(f, box(x0 + 0.1, sy * W * 0.32, 0.4, 0.6), 1.3, 1.8, LIVERY.tail);
  }

  function busParts(b, k, out, detail) {
    const publicBus = !b.campus && b.opCls !== 'op-private';
    const campus = CAMPUS_LIVERY[b.opCls] || null;
    const body = campus ? campus.body : publicBus ? LIVERY.green : b.color;
    const pod = publicBus ? LIVERY.pod : tint(b.color, 0.25);
    const W = 4.2;
    const add = (f, pts, base, height, c) => out.push({
      type: 'Feature', properties: { id: b.id, b: base * k, h: height * k, c },
      geometry: { type: 'Polygon', coordinates: [localPoly(pts.map(([x, y]) => [x * k, y * k]), f.lat, f.lng, f.cosLat, f.sinH, f.cosH)] },
    });
    const main = busFrame(b.cur.lat, b.cur.lng, b.heading);
    if (b.type === 'DD') {
      busSection(add, main, { detail, x0: -5.8, x1: 5.8, W, body, pod, dd: true, front: true, rear: true, wheels: [3.7, -2.3, -4.1] });
    } else if (b.type === 'BD') {
      const trail = b.trail ?? b.heading;
      busSection(add, main, { detail, x0: -1.4, x1: 8.4, W, body, pod, dd: false, front: true, rear: false, wheels: [6.0, 0.4] });
      const pivot = framePoint(main, -2.1, k);
      const mid = busFrame(pivot.lat, pivot.lng, lerpAngle(trail, b.heading, 0.5));
      add(mid, capsule(-0.9, 0.9, W * 0.9, 0.3, 0.3), 0.7, 4.4, LIVERY.joint);
      const back = busFrame(pivot.lat, pivot.lng, trail);
      busSection(add, back, { detail, x0: -7.2, x1: -0.7, W, body, pod, dd: false, front: false, rear: true, wheels: [-4.6] });
    } else {
      busSection(add, main, { detail, x0: -5.5, x1: 5.5, W, body, pod, campus, dd: false, front: true, rear: true, wheels: [3.4, -3.2] });
    }
  }

  function drawBuses() {
    const map = M.map;
    if (!map || !M.ready || !map.getSource('sb-bus-parts')) return;
    const zoom = map.getZoom();
    const parts = [], pts = [];
    if (zoom >= BUS_MIN_ZOOM - 1) {
      const res = 78271.517 * Math.cos(toRad(map.getCenter().lat)) / Math.pow(2, zoom);
      const k = Math.min(40, Math.max(1.2, BUS_PX * res / 11));
      const detail = zoom >= 16;
      const vb = map.getBounds(), pad = 0.004;
      const w = vb.getWest() - pad, e = vb.getEast() + pad, so = vb.getSouth() - pad, n = vb.getNorth() + pad;
      for (const b of M.buses.values()) {
        if (b.cur.lng < w || b.cur.lng > e || b.cur.lat < so || b.cur.lat > n) continue;
        busParts(b, k, parts, detail);
        pts.push({ type: 'Feature', properties: { id: b.id, img: `sbl|${b.label}|${b.color}|${b.fg}`, sort: -b.cur.lat }, geometry: { type: 'Point', coordinates: [b.cur.lng, b.cur.lat] } });
      }
    }
    map.getSource('sb-bus-parts').setData({ type: 'FeatureCollection', features: parts });
    map.getSource('sb-bus-pts').setData({ type: 'FeatureCollection', features: pts });
    if (M.sel?.kind === 'bus') {
      const b = M.buses.get(M.sel.id);
      if (b) setSelPoint(b.cur.lng, b.cur.lat);
    }
    M.dirty = false;
  }

  function frame(ts) {
    M.raf = 0;
    if (!M.open || !M.ready) return;
    if (ts - M.lastFrame >= FRAME_MS) {
      M.lastFrame = ts;
      const now = Date.now();
      let moving = false;
      for (const b of M.buses.values()) {
        const t = Math.min(1, (now - b.t0) / b.dur);
        if (t < 1 || b.cur.lat !== b.to.lat || b.cur.lng !== b.to.lng) {
          if (b.path && t < 1) {
            const p = alongPath(b.path, t);
            b.cur.lat = p.lat; b.cur.lng = p.lng;
            if (p.brg != null) b.headTo = p.brg;
          } else {
            b.cur.lat = b.from.lat + (b.to.lat - b.from.lat) * t;
            b.cur.lng = b.from.lng + (b.to.lng - b.from.lng) * t;
            if (t >= 1 && b.headFinal != null) b.headTo = b.headFinal;
          }
          moving = true;
        }
        const gap = Math.abs(((b.headTo - b.heading + 540) % 360) - 180);
        if (gap > 0.5) { b.heading = lerpAngle(b.heading, b.headTo, 0.2); moving = true; }
        else if (gap > 0) b.heading = b.headTo;
        if (b.type === 'BD') {
          if (b.trail == null) b.trail = b.heading;
          const lag = Math.abs(((b.heading - b.trail + 540) % 360) - 180);
          if (lag > 0.5) { b.trail = lerpAngle(b.trail, b.heading, t < 1 ? 0.07 : 0.2); moving = true; }
        }
      }
      if (moving || M.dirty) drawBuses();
      if (!moving) return;
    }
    M.raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!M.raf && M.open && M.ready) M.raf = requestAnimationFrame(frame); }

  function setSelPoint(lng, lat) {
    const src = M.map?.getSource('sb-sel');
    if (src) src.setData({ type: 'FeatureCollection', features: lng == null ? [] : [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }] });
  }

  function parkResults() {
    const res = $('results-stop'), home = M.resultsHome;
    if (!res || !home || res.parentNode === home.parent) return;
    home.parent.insertBefore(res, home.marker);
    if (typeof currentTab !== 'undefined' && currentTab !== 'stop') res.style.display = 'none';
  }
  function borrowResults() {
    const res = $('results-stop'), body = $('map3d-sheet-stop');
    if (!res || !body) return;
    if (!M.resultsHome) {
      const marker = document.createComment('results-stop-home');
      res.parentNode.insertBefore(marker, res.nextSibling);
      M.resultsHome = { parent: res.parentNode, marker };
    }
    if (res.parentNode !== body) body.appendChild(res);
    res.style.display = 'block';
  }

  function showSheet(kind) {
    const sheet = $('map3d-sheet');
    if (!sheet) return;
    $('map3d-sheet-bus').style.display = kind === 'bus' ? 'block' : 'none';
    $('map3d-sheet-stop').style.display = kind === 'stop' ? 'block' : 'none';
    sheet.classList.add('open');
    sheet.scrollTop = 0;
  }
  function closeSheet() {
    const sheet = $('map3d-sheet');
    if (sheet) sheet.classList.remove('open');
    M.sel = null;
    setSelPoint(null);
    parkResults();
    if (M.map && M.ready && M.open) M.map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
  }

  function openStop(code) {
    const st = typeof stopByCode === 'function' ? stopByCode(code) : null;
    const lat = parseFloat(st?.Latitude), lng = parseFloat(st?.Longitude);
    M.sel = { kind: 'stop', code };
    if (isFinite(lat) && isFinite(lng)) {
      setSelPoint(lng, lat);
      const h = $('map3d-wrap').clientHeight;
      M.map.easeTo({ center: [lng, lat], zoom: Math.max(M.map.getZoom(), 16), padding: { top: 0, left: 0, right: 0, bottom: Math.round(h * 0.45) }, duration: 700 });
    }
    borrowResults();
    showSheet('stop');
    const input = $('stopInput');
    if (input) input.value = code;
    lastStopCode = code;
    doSearch();
  }

  function renderBusSheet(b) {
    const el = $('map3d-sheet-bus');
    if (!el) return;
    const sn = c => (typeof stopByCode === 'function' && stopByCode(c)?.Description) || c;
    const dest = b.destCode ? sn(b.destCode) : '';
    const rows = [];
    if (b.nextStop) {
      const eta = b.eta == null ? '' : b.eta <= 1 ? 'Arriving' : `${Math.round(b.eta)} min`;
      rows.push(['Next stop', `${esc(sn(b.nextStop))} <span class="m3d-dim">(${esc(b.nextStop)})</span>${eta ? ` · <strong>${eta}</strong>` : ''}`]);
    }
    if (b.load) rows.push(['Crowd', `<span class="m3d-dot" style="background:${LOAD_COLORS[b.load] || 'var(--muted)'}"></span>${LOAD_LABELS[b.load] || esc(b.load)}${b.campus && b.campus.capacity ? ` <span class="m3d-dim">(${b.campus.ridership ?? '?'} / ${b.campus.capacity})</span>` : ''}${b.campus ? ' <span class="m3d-dim">approx.</span>' : ''}`]);
    if (!b.campus) rows.push(['Bus type', `${typeof busTypeIcon === 'function' ? busTypeIcon(b.type, true, 'var(--muted)') : ''} ${TYPE_LABELS[b.type] || 'Single deck'}${b.feature === 'WAB' ? ' · <i class="fa-solid fa-wheelchair"></i> Wheelchair accessible' : ''}`]);
    rows.push(['Operator', esc(OP_NAMES[b.operator] || b.operator || 'Private operator')]);
    const svcArg = esc(String(b.svc).replace(/'/g, ''));
    el.innerHTML = `
      <div class="m3d-bus-head">
        <div class="m3d-pill" style="background:${b.color};color:${b.fg}">${esc(b.campus ? b.svc : b.label)}</div>
        <div class="m3d-bus-dest">${dest ? `<span class="m3d-dim">towards</span><br>${esc(dest)}` : `<span class="m3d-dim">${b.campus ? 'Campus shuttle' : 'In service'}</span>`}</div>
      </div>
      <div class="m3d-rows">${rows.map(([k, v]) => `<div class="m3d-row"><span class="m3d-key">${k}</span><span class="m3d-val">${v}</span></div>`).join('')}</div>
      <div class="m3d-actions">
        <button class="m3d-btn" onclick="map3d.viewRoute('${svcArg}','${esc(b.nextStop)}')"><i class="fa-solid fa-route"></i> View route</button>
        ${b.nextStop ? `<button class="m3d-btn alt" onclick="map3d.openStop('${esc(b.nextStop)}')"><i class="fa-solid fa-clock"></i> Stop arrivals</button>` : ''}
      </div>`;
  }

  function openBus(id) {
    const b = M.buses.get(id);
    if (!b) return;
    parkResults();
    M.sel = { kind: 'bus', id };
    setSelPoint(b.cur.lng, b.cur.lat);
    renderBusSheet(b);
    showSheet('bus');
  }

  function onMapClick(e) {
    const map = M.map, pt = e.point;
    const hitBox = r => [[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]];
    const busLayers = ['sb-bus-label', 'sb-bus-parts'].filter(l => map.getLayer(l));
    let f = map.queryRenderedFeatures(hitBox(6), { layers: busLayers })[0];
    if (f) return openBus(f.properties.id);
    const stopLayers = ['sb-stops-icon', 'sb-stops-dot'].filter(l => map.getLayer(l));
    const hits = map.queryRenderedFeatures(hitBox(12), { layers: stopLayers });
    if (hits.length) {
      let best = hits[0], bestD = Infinity;
      for (const h of hits) {
        const p = map.project(h.geometry.coordinates), d = (p.x - pt.x) ** 2 + (p.y - 14 - pt.y) ** 2;
        if (d < bestD) { bestD = d; best = h; }
      }
      return openStop(best.properties.code);
    }
    closeSheet();
  }

  function placeUser(lat, lng) {
    if (!M.map) return;
    if (!M.userMarker) {
      const el = document.createElement('div');
      el.className = 'm3d-user';
      M.userMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(M.map);
    } else M.userMarker.setLngLat([lng, lat]);
  }
  function locate(force) {
    if (!navigator.geolocation) { if (force && typeof toast === 'function') toast('Location is not available on this device'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      if (!inSG(lat, lng)) { if (force && typeof toast === 'function') toast('You seem to be outside Singapore'); return; }
      try { userLat = lat; userLng = lng; } catch (e) {}
      placeUser(lat, lng);
      if (force || !M.userMoved) M.map.flyTo({ center: [lng, lat], zoom: Math.max(M.map.getZoom(), 16), duration: 1400, essential: true });
    }, () => { if (force && typeof toast === 'function') toast('Could not get your location'); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  }

  async function init() {
    const wrap = $('map3d-wrap'), el = $('map3d-canvas');
    if (!wrap || !el) return;
    hud('Loading map…');
    await loadLib();
    const style = await loadBaseStyle();
    let center = CITY, known = false;
    try { if (userLat != null && userLng != null && inSG(userLat, userLng)) { center = [userLng, userLat]; known = true; } } catch (e) {}
    const map = new maplibregl.Map({
      container: el, style, center, zoom: 16, pitch: 58, bearing: -18, maxPitch: 72, minZoom: 10.5,
      maxBounds: [[103.35, 1.0], [104.3, 1.65]], attributionControl: { compact: true },
    });
    M.map = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    await new Promise(resolve => map.once('load', resolve));
    addOwnLayers();
    M.ready = true;
    applyPalette();
    if (!M.baseOk) $('map3d-note').style.display = 'block';
    if (known) placeUser(center[1], center[0]);

    map.on('click', onMapClick);
    map.on('mousemove', e => {
      const layers = ['sb-bus-label', 'sb-bus-parts', 'sb-stops-icon', 'sb-stops-dot'].filter(l => map.getLayer(l));
      map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers }).length ? 'pointer' : '';
    });
    map.on('dragstart', () => { M.userMoved = true; });
    map.on('zoom', () => { M.dirty = true; startLoop(); });
    map.on('moveend', () => { updateHud(); M.dirty = true; startLoop(); if (M.open) { schedulePoll(900); scheduleRoads(); } });
    map.on('sourcedata', e => { if (M.open && M.roadSource && e.sourceId === M.roadSource && e.isSourceLoaded) scheduleRoads(); });

    new MutationObserver(() => applyPalette()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && M.open) schedulePoll(200); });
    window.addEventListener('resize', () => { if (M.open) map.resize(); });

    refreshStops();
    locate(false);
  }

  function onTab(tab) {
    const isMap = tab === 'map';
    if (!isMap) {
      if (M.open) { M.open = false; stopTimers(); }
      $('map3d-wrap')?.classList.remove('full');
      document.body.classList.remove('m3d-noscroll');
      closeSheet();
      parkResults();
      return;
    }
    M.open = true;
    const begin = () => { M.map.resize(); refreshStops(); startTimers(); startLoop(); updateHud(); scheduleRoads(); };
    if (M.ready) return begin();
    if (!M.initing) {
      M.initing = init().then(() => { if (M.open) begin(); }).catch(e => {
        M.initing = null;
        hud('3D map could not start');
        const note = $('map3d-note');
        if (note) { note.textContent = 'The 3D map could not start on this device or browser.'; note.style.display = 'block'; }
        console.error(e);
      });
    }
  }

  function toggleFull() {
    const wrap = $('map3d-wrap');
    if (!wrap) return;
    const on = wrap.classList.toggle('full');
    document.body.classList.toggle('m3d-noscroll', on);
    const icon = $('map3d-full-icon');
    if (icon) icon.className = on ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    if (M.map) setTimeout(() => M.map.resize(), 60);
  }

  function viewRoute(svc, stopCode) {
    if (typeof goToService === 'function') goToService(svc, stopCode || undefined);
  }

  window.map3d = { onTab, openStop, openBus, closeSheet, locate: () => locate(true), toggleFull, viewRoute, _state: M, _roads: { buildRoads, roadSnap, roadRoute } };
})();