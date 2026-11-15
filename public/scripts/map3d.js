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
    try { map.addLayer(meshLayer()); } catch (e) { MESH.ok = false; }
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

  let CAP_N = 3;
  function capsule(x0, x1, W, rBack, rFront) {
    const hy = W / 2, pts = [];
    for (const [cx, cy, a0, r] of [[x1 - rFront, hy - rFront, 0, rFront], [x0 + rBack, hy - rBack, 90, rBack], [x0 + rBack, -(hy - rBack), 180, rBack], [x1 - rFront, -(hy - rFront), 270, rFront]]) {
      if (!r) { pts.push([cx, cy]); continue; }
      for (let i = 0; i <= CAP_N; i++) { const a = toRad(a0 + i * 90 / CAP_N); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
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

  // ---- NTU / NUS electric campus bus (Zhongtong-style, 10.5 m single deck) ----
  // Detailed model built from stacked extruded prisms. lvl 0 = far, 1 = mid (zoom >= 16), 2 = full detail (zoom >= 18).
  const NTU_LIVERY = {
    navy: '#0C2480', blue: '#1B46C8', blue2: '#2158D8', blue3: '#2B68E4', sky: '#27A9EA', ice: '#8EDEFB',
    roof: '#2147CC', pod: '#1B3BB0', podTop: '#2C52D2', glass: '#0F1923', glassHi: '#1E3041', door: '#182A3B',
    black: '#0A0C0F', pillar: '#0B1636', arch: '#05070D', tyre: '#2A2D33', rim: '#CBD2D8', hub: '#7C858D', chrome: '#D8DEE3',
    red: '#D4202E', white: '#FFFFFF', led: '#FFB02E', ledB: '#3DA5E8', head: '#D6E6F2', drl: '#8FD8F5',
    tail: '#E5332A', plate: '#F3F3F3', marker: '#FF9A1F', bolt: '#F7C32E',
    skirt: '#0C2480', belt: '#0C2480', rearPanel: '#27A9EA',
  };
  // NUS orange campus bus: same chassis, orange body, blue roof with an orange centre stripe
  const NUS_LIVERY = Object.assign({}, NTU_LIVERY, {
    blue: '#FF9626', skirt: '#EC8512', belt: '#D8760E', rearPanel: '#FF9626',
    roof: '#1F4DB8', pod: '#1B45A8', podTop: '#3568D0', pillar: '#2B2012', ledB: '#E5262A',
    stripe: '#FFA02E', navy: '#1A2F7A', crestRed: '#C8102E', ink: '#0F2F7A',
  });

  // letter glyphs for "NTU." as lists of [u, z, w, h] boxes in a 0.62 x 0.95 cell (u rightwards as read)
  const NTU_GLYPHS = {
    N: [[0, 0, .17, .95], [.45, 0, .17, .95], [.17, .66, .12, .29], [.25, .42, .12, .28], [.33, .2, .12, .28]],
    T: [[0, .78, .62, .17], [.225, 0, .17, .78]],
    U: [[0, .17, .17, .78], [.45, .17, .17, .78], [.1, 0, .42, .17]],
    '.': [[0, 0, .17, .17]],
    S: [[0, .78, .62, .17], [0, .5, .17, .28], [0, .39, .62, .17], [.45, .17, .17, .22], [0, 0, .62, .17]],
  };

  function campusBus(add, f, o) {
    const nus = o.kind === 'nus', C = nus ? NUS_LIVERY : NTU_LIVERY, lvl = o.lvl, W = 3.8, hw = W / 2;
    const x0 = -5.5, x1 = 5.5, L = x1 - x0, rb = 0.7, rf = 0.9, nose = 0.75;
    const wf = 2.85, wr = -2.8, arch = 0.85, archTop = 1.4;
    const full = capsule(x0, x1, W, rb, rf);
    const rect = (a, b, w = W) => capsule(a, b, w, 0, 0);

    // --- chassis / wheel wells ---
    add(f, capsule(x0 + 0.5, x1 - 1.1, W - 0.5, 0.3, 0.3), 0.3, archTop, C.arch);
    for (const wx of [wr, wf]) for (const s of [1, -1]) {
      const ty = s * (hw - 0.5);
      // round-ish tyre: three stacked slabs
      add(f, box(wx, ty, 0.85, 0.78), 0, 1.12, C.tyre);
      add(f, box(wx, ty, 1.2, 0.78), 0.14, 0.98, C.tyre);
      add(f, box(wx, ty, 1.04, 0.78), 0.05, 1.07, C.tyre);
      if (lvl >= 1) {
        const ry = s * (hw - 0.5 + 0.4);
        add(f, box(wx, ry, 0.62, 0.05), 0.2, 0.92, C.rim);
        add(f, box(wx, ry, 0.84, 0.05), 0.3, 0.82, C.rim);
        if (lvl >= 2) add(f, box(wx, s * (hw - 0.5 + 0.43), 0.3, 0.05), 0.46, 0.66, C.hub);
      }
    }

    // --- lower body between the wheel arches (0.45 .. archTop) ---
    const panel = nus ? [[x0, x1 - nose, C.blue, rb, 0]] : [[x0, -3.9, C.sky, rb, 0], [-3.9, -2.4, '#2A9AE6', 0, 0], [-2.4, -0.8, C.blue2, 0, 0], [-0.8, 1.2, C.blue3, 0, 0], [1.2, 2.2, C.blue2, 0, 0], [2.2, x1 - nose, C.blue, 0, 0]];
    const lowerSegs = [[x0, wr - arch], [wr + arch, wf - arch], [wf + arch, x1 - nose]];
    for (const [a, b] of lowerSegs) {
      add(f, capsule(a, b, W, a === x0 ? rb : 0, 0), 0.45, 0.95, C.skirt);
      for (const [pa, pb, col, r1] of panel) {
        const lo = Math.max(a, pa), hi2 = Math.min(b, pb);
        if (hi2 - lo > 0.01) add(f, capsule(lo, hi2, W, lo === x0 ? rb : 0, 0), 0.95, archTop, col);
      }
    }
    // main side panel above the arches (archTop .. 2.3): gradient from sky (rear) to royal blue (front)
    for (const [pa, pb, col, r1, r2] of panel) add(f, capsule(pa, pb, W, r1, r2), archTop, 2.3, col);
    // thin dark sill line under the windows
    add(f, full, 2.3, 2.38, C.belt);

    // --- front nose: red bumper, black fascia, windscreen, destination sign ---
    add(f, capsule(x1 - nose, x1, W, 0, rf), 0.45, 1.15, nus ? C.blue : C.red);
    if (nus) {                                                              // orange front corners, black centre fascia
      add(f, capsule(x1 - nose, x1, W, 0, rf), 1.15, 2.38, C.blue);
      add(f, box(x1 + 0.02, 0, 0.12, 2.1), 1.2, 2.38, C.black);
    } else add(f, capsule(x1 - nose, x1, W, 0, rf), 1.15, 2.38, C.black);
    add(f, capsule(x1 - nose, x1, W, 0, rf), 2.38, 3.35, C.glass);
    add(f, capsule(x1 - nose, x1, W, 0, rf), 3.35, 3.55, C.black);          // sign header; the roof curves over it from 3.55
    if (lvl >= 1) {
      // upper windscreen reflection band
      add(f, capsule(x1 - 0.25, x1 - 0.02, W - 0.6, 0, 0.7), 3.0, 3.35, C.glassHi);
      // destination LED (amber text bar + blue route box)
      add(f, box(x1 + 0.03, 0, 0.1, 1.55), 3.38, 3.53, '#050505');
      const ls = nus ? -1 : 1;                                           // route box sits on the viewer's left for NUS, right for NTU
      add(f, box(x1 + 0.05, -0.12 * ls, 0.09, 1.25), 3.4, 3.5, C.led);
      add(f, box(x1 + 0.05, 0.73 * ls, 0.09, 0.42), 3.39, 3.51, C.ledB);
      // headlights + DRL
      for (const s of [1, -1]) {
        add(f, box(x1 - 0.12, s * 1.3, 0.3, 0.56), 1.6, 1.92, C.head);
        add(f, box(x1 - 0.07, s * 1.27, 0.3, 0.46), 1.92, 1.99, C.drl);
      }
      // chrome grille line + plate
      add(f, box(x1 + 0.03, 0, 0.08, 1.9), 1.6, 1.68, C.chrome);
      add(f, box(x1 + 0.03, 0, 0.1, 1.2), 0.62, 1.0, C.plate);
      add(f, box(x1 + 0.05, 0, 0.1, 1.08), 0.68, 0.95, C.black);
    }
    // windscreen pillars
    for (const s of [1, -1]) add(f, box(x1 - 0.55, s * (hw - 0.05), 0.5, 0.12), 2.38, 3.45, C.black);

    // --- side window band (2.38 .. 3.7) ---
    const rearSill = 2.85, rearEnd = -2.55;
    add(f, rect(x0 + 0.8, rearEnd), 2.38, rearSill, C.rearPanel);                  // solid rear-quarter panel
    add(f, rect(x0 + 0.8, rearEnd), rearSill, 3.7, C.glass);                 // stepped rear windows
    add(f, rect(rearEnd, x1 - nose), 2.38, 3.7, C.glass);                    // main window band
    add(f, capsule(x0, x0 + 0.8, W, rb, 0), 2.38, 3.7, C.rearPanel);               // rear wall
    // pillars / window dividers
    const pillars = lvl >= 1 ? [-4.5, -3.6, -2.55, -1.0, 0.55, 2.1, 3.7] : [-2.55, 0.55, 3.7];
    for (const px of pillars) add(f, box(px, 0, 0.1, W + 0.06), px < rearEnd ? rearSill : 2.38, 3.7, C.pillar);
    // lower window ledge shadow (seats / reflection)
    if (lvl >= 1) add(f, rect(rearEnd + 0.1, x1 - nose - 0.1, W + 0.02), 2.38, 2.6, C.glassHi);

    // --- roof: blue shell + two raised battery pods ---
    // roof shell: stacked, progressively inset layers so the front rolls down into the windscreen header
    // and the side / rear edges round off (a prism-only approximation of a curved roof)
    {
      const N = 7, rz = 0.05, f1 = t => 1 - Math.sqrt(1 - t * t);
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N, z0 = 3.55 + rz * i, z1 = z0 + rz;
        const dx = 0.6 * f1(t), dy = 0.28 * f1(t), dr = 0.3 * f1(t), wl = W - 2 * dy, rfl = Math.max(0.3, rf - dx * 0.6);
        if (z1 <= 3.7 + 1e-6) add(f, capsule(x1 - 1.0, x1 - dx, wl, 0, rfl), z0, z1, C.roof);   // front-only curved cap above the sign
        else add(f, capsule(x0 + dr, x1 - dx, wl, Math.max(0.25, rb - dr), rfl), z0, z1, C.roof);
      }
    }
    add(f, capsule(x0 + 0.2, x1 - 0.9, W - 0.7, rb - 0.2, 0.4), 3.9, 3.96, C.pod);
    if (nus) add(f, capsule(x0 + 0.3, x1 - 1.5, W - 0.95, 0.3, 0.3), 3.96, 3.99, C.stripe);
    const px0 = x0 + L * 0.13, px1 = x0 + L * 0.44, px2 = x0 + L * 0.46, px3 = x0 + L * 0.84;
    add(f, capsule(px0, px1, W * 0.7, 0.35, 0.35), 3.96, 4.2, C.pod);
    add(f, capsule(px2, px3, W * 0.7, 0.35, 0.35), 3.96, nus ? 4.22 : 4.36, C.pod);
    if (lvl >= 1) {
      add(f, capsule(px0 + 0.1, px1 - 0.1, W * 0.7 - 0.25, 0.3, 0.3), 4.2, 4.25, C.podTop);
      add(f, capsule(px2 + 0.1, px3 - 0.1, W * 0.7 - 0.25, 0.3, 0.3), nus ? 4.22 : 4.36, nus ? 4.27 : 4.41, C.podTop);
    }

    // --- mirrors ---
    for (const s of [1, -1]) {
      add(f, box(x1 - 0.55, s * (hw + 0.22), 0.14, 0.5), 3.2, 3.3, C.black);
      add(f, box(x1 - 0.6, s * (hw + 0.45), 0.2, 0.1), 2.45, 3.3, C.black);
    }

    // --- tail lights, rear window, rear plate ---
    for (const s of [1, -1]) add(f, box(x0 + 0.16, s * 1.5, 0.3, 0.5), 1.4, 2.1, C.tail);
    add(f, box(x0 + 0.04, 0, 0.1, W * 0.62), 2.72, 3.5, C.glass);
    if (lvl >= 1) add(f, box(x0 + 0.05, 0, 0.1, 1.0), 0.95, 1.3, C.plate);

    // --- three doors on the kerb (left) side: front, middle, rear ---
    const doors = [4.15, 1.25, -4.3];
    if (lvl >= 1) for (const dx of doors) {
      const dy = hw + 0.055;
      add(f, box(dx, dy, 1.0, 0.06), 0.72, 1.12, C.skirt);                    // door lower panel
      add(f, box(dx, dy, 1.0, 0.06), 1.12, 3.55, C.door);                    // glazed leaves
      add(f, box(dx, dy + 0.02, 1.0, 0.04), 3.45, 3.55, C.pillar);            // door header
      if (lvl >= 2) {
        add(f, box(dx, dy + 0.02, 0.07, 0.1), 0.72, 3.55, C.black);           // centre seam
        add(f, box(dx - 0.5, dy + 0.02, 0.07, 0.1), 0.72, 3.55, C.black);
        add(f, box(dx + 0.5, dy + 0.02, 0.07, 0.1), 0.72, 3.55, C.black);
      }
    }
    // electric badge panel behind the windscreen (both sides)
    if (lvl >= 1) for (const s of [1, -1]) {
      add(f, box(x1 - 1.1, s * (hw + 0.025), 0.5, 0.06), 3.0, 3.3, C.black);
      if (lvl >= 2) add(f, box(x1 - 1.1, s * (hw + 0.055), 0.12, 0.06), 3.05, 3.25, C.bolt);
    }

    if (lvl < 2) return;

    // --- full-detail side graphics ---
    for (const s of [1, -1]) {
      const dir = -s;                                    // reading direction along +x: right side reads forward, left side reads rearward
      const sy = hw + 0.015;
      const clear = x => !(s === 1 && doors.some(d => Math.abs(x - d) < 0.6));   // keep decals off the door leaves
      // marker lights
      for (const mx of [wf + 0.95, wr - 0.95, 0.2]) if (clear(mx)) add(f, box(mx, s * (hw + 0.02), 0.14, 0.06), 1.5, 1.62, C.marker);
      if (nus) {
        const xa = -2.6, xb = -0.5;                      // span of the crest + wordmark group
        const pos = c => dir > 0 ? xa + c : xb - c;
        // crest (shield) + "NUS" wordmark
        add(f, box(pos(0.22), s * (hw + 0.02), 0.44, 0.05), 1.55, 2.25, C.navy);
        add(f, box(pos(0.22), s * (hw + 0.045), 0.28, 0.05), 1.7, 2.1, C.crestRed);
        add(f, box(pos(0.22), s * (hw + 0.07), 0.14, 0.05), 1.82, 1.98, C.white);
        let cursor = 0.62;
        for (const ch of ['N', 'U', 'S']) {
          for (const [gu, gz, gw, gh] of NTU_GLYPHS[ch]) {
            add(f, box(pos(cursor + (gu + gw / 2) * 0.62), s * (hw + 0.025), gw * 0.62, 0.05), 1.75 + gz * 0.52, 1.75 + (gz + gh) * 0.52, C.ink);
          }
          cursor += 0.52;
        }
        // "National University / of Singapore" as fine letter ticks
        const sub = [['National University', 1.6, 1.67], ['of Singapore', 1.5, 1.57]];
        for (const [txt, zb, zt] of sub) {
          let c = 0.62;
          for (const ch of txt) { if (ch !== ' ') add(f, box(pos(c), s * (hw + 0.02), 0.05, 0.04), zb, zt, C.ink); c += 0.08; }
        }
        // rear engine-bay vents
        for (const vx of [-4.85, -4.3]) if (clear(vx)) add(f, box(vx, s * (hw + 0.02), 0.4, 0.04), 1.05, 1.3, C.black);
      } else {
        // cyan "smart campus building" wireframe at the rear
        for (let i = 0; i < 9; i++) if (clear(-5.0 + i * 0.4)) add(f, box(-5.0 + i * 0.4, s * sy, 0.05, 0.05), 1.0, 2.28, C.ice);
        const gx = s === 1 ? [-3.0, 1.7] : [-3.55, 3.3];              // left side stops short of the rear door
        for (const z of [1.3, 1.65, 2.0]) add(f, box(gx[0], s * (hw + 0.03), gx[1], 0.08), z, z + 0.05, C.ice);
        // facet highlights on the royal-blue panel
        add(f, box(-0.2, s * sy, 1.6, 0.05), 0.95, 1.12, C.blue3);
        if (clear(1.4)) add(f, box(1.4, s * sy, 1.1, 0.05), 1.5, 1.62, C.ice);
        // "NTU." on the window glass, reads correctly from both sides
        let u0 = -2.45 + (dir > 0 ? 0 : 1.9);
        let cursor = 0;
        for (const ch of ['N', 'T', 'U', '.']) {
          for (const [gu, gz, gw, gh] of NTU_GLYPHS[ch]) {
            const cu = cursor + gu + gw / 2;
            add(f, box(dir > 0 ? u0 + cu : u0 - cu, s * (hw + 0.025), gw, 0.06), 2.55 + gz * 0.85, 2.55 + (gz + gh) * 0.85, C.white);
          }
          cursor += (ch === '.' ? 0.3 : 0.82);
        }
        // slogan lines: "SMART CAMPUS," / "SMARTER THINKING" as letter blocks
        const rows = [['SMART CAMPUS,', 1.62, 1.9, 0.2], ['SMARTER THINKING', 1.2, 1.52, 0.2]];
        for (const [txt, zb, zt, adv] of rows) {
          let c = 0;
          for (const ch of txt) {
            const lx = dir > 0 ? -2.3 + c : -2.3 + (txt.length * adv) - c;
            if (ch !== ' ' && ch !== ',' && clear(lx)) add(f, box(lx, s * (hw + 0.02), 0.12, 0.05), zb, zt, C.white);
            c += adv;
          }
        }
      }
    }
  }

  // ---- Public bus models: SG♥BUS lime-green livery (single deck / double deck / bendy) ----
  // Same approach as campusBus: stacked extruded prisms. lvl 0 = far, 1 = mid (zoom >= 16), 2 = full detail (zoom >= 18).
  // Frame: +x forward, +y towards the kerb (left) side where the doors are.
  const PUB = {
    green: '#8FD42A', roof: '#9BDD33', pod: '#84C722', greenDk: '#74B91D', skirt: '#68A819',
    black: '#0B0E11', glass: '#18232B', glassHi: '#2B3C48', pillar: '#0F171C', door: '#142029',
    silver: '#D7DDE1', silverDk: '#9FA9B0', arch: '#05070A', tyre: '#25282D', rim: '#CDD4D9', hub: '#7D878F',
    led: '#FF8A1F', ledBg: '#070707', head: '#F2F6F9', drl: '#BFE6FF', tail: '#E5332A', plate: '#F3F3F3',
    marker: '#FF9A1F', ink: '#0E1316', heart: '#E5262A', white: '#FFFFFF', wc: '#2C6BD6', vent: '#1D2328',
    joint: '#17191C', rib: '#0A0B0D', ribHi: '#2A2724',
  };
  const PUB_OPS = { SBST: ['SBS Transit', '#D5202F'], SMRT: ['SMRT', '#E2231A'], TTS: ['Tower Transit', '#1F7A33'], GAS: ['Go-Ahead', '#0E3B5B'] };
  // "SG♥BUS" decal glyphs, same [u, z, w, h] box format and 0.62 x 0.95 cell as NTU_GLYPHS
  const HEART_ROWS = [[1, 4, 5, 8], [0, 9], [0, 9], [0, 9], [1, 8], [2, 7], [3, 6], [4, 5]];
  const PUB_GLYPHS = Object.assign({}, NTU_GLYPHS, {
    G: [[0, .17, .17, .61], [.1, .78, .52, .17], [.1, 0, .52, .17], [.45, .17, .17, .3], [.28, .3, .34, .15]],
    B: [[0, 0, .17, .95], [.1, .78, .4, .17], [.1, .39, .4, .17], [.1, 0, .4, .17], [.45, .56, .17, .26], [.45, .17, .17, .24]],
    '*': HEART_ROWS.map((r, i) => {
      const z = (7 - i) * 0.95 / 8, u = c => c * 0.62 / 9, out = [];
      for (let j = 0; j < r.length; j += 2) out.push([u(r[j]), z, u(r[j + 1]) - u(r[j]), 0.95 / 8]);
      return out;
    }).flat(),
  });
  // seven-segment strokes (a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle) for the LED route number
  const SEG7 = {
    0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
    A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg', G: 'acdef', H: 'bcefg', J: 'bcde', K: 'efg', L: 'def', M: 'abcef',
    N: 'ceg', P: 'abefg', R: 'efg', S: 'acdfg', T: 'defg', U: 'bcdef', W: 'bcdef', X: 'bcefg', Y: 'bcdfg', Z: 'abdeg',
  };

  // wheels as stacked slabs whose chord follows a circle (smooth round profile)
  function pubTyres(add, f, o, th) {
    const hw = o.W / 2, lvl = o.lvl, R = th / 2;
    const disc = (wx, y, wd, rad, m, col) => {
      for (let j = 0; j < m; j++) {
        const dz = -rad + (j + 0.5) * 2 * rad / m;
        add(f, box(wx, y, 2 * Math.sqrt(Math.max(0.0004, rad * rad - dz * dz)), wd), R - rad + j * 2 * rad / m, R - rad + (j + 1) * 2 * rad / m, col);
      }
    };
    for (const wx of o.wheels) for (const s of [1, -1]) {
      disc(wx, s * (hw - 0.5), 0.8, R, lvl >= 2 ? 9 : lvl >= 1 ? 6 : 3, PUB.tyre);
      if (lvl >= 1) {
        disc(wx, s * (hw - 0.1), 0.05, R * 0.74, lvl >= 2 ? 7 : 4, PUB.rim);
        if (lvl >= 2) disc(wx, s * (hw - 0.07), 0.05, R * 0.3, 3, PUB.hub);
      }
    }
  }
  // raked windscreen: slices that step back with height (smoother than a vertical pane)
  function pubGlass(add, f, o, xb, x1, rf, z0, z1, rk, divider) {
    const lvl = o.lvl, ms = lvl >= 2 ? 7 : lvl >= 1 ? 4 : 1, gh = (z1 - z0) / ms, k = lvl >= 1 ? rk : 0;
    for (let i = 0; i < ms; i++) {
      const a = z0 + i * gh, xf = x1 - k * (i + 1) / ms;
      add(f, capsule(xb, xf, o.W, 0, Math.max(0.3, rf - (x1 - xf))), a, a + gh, lvl >= 1 && i === ms - 1 ? PUB.glassHi : PUB.glass);
      if (divider && lvl >= 1) add(f, box(xf + 0.02, 0, 0.1, 0.1), a, a + gh, PUB.black);
    }
    return x1 - k;
  }

  // wheel-arch aware lower body: dark skirt + green panel between the arches (up to archTop)
  function pubLower(add, f, o, xb, archTop) {
    const { x0, W, wheels } = o, arch = 0.85;
    const rb = o.rear ? 0.7 : 0;
    const archs = wheels.map(w => [w - arch, w + arch]).sort((p, q) => p[0] - q[0]);
    const segs = []; let cur = x0;
    for (const [a, b] of archs) { if (a > cur) segs.push([cur, Math.min(a, xb)]); cur = Math.max(cur, b); }
    if (cur < xb) segs.push([cur, xb]);
    for (const [a, b] of segs) {
      if (b - a < 0.02) continue;
      add(f, capsule(a, b, W, a === x0 ? rb : 0, 0), 0.45, 0.95, PUB.skirt);
      add(f, capsule(a, b, W, a === x0 ? rb : 0, 0), 0.95, archTop, PUB.green);
    }
  }

  // LED destination sign: black panel, text bars on the left, route number (seven-segment) on the right
  function pubSign(add, f, o, xs, z0, z1) {
    const lvl = o.lvl, sw = o.W * 0.8, h = z1 - z0, label = String(o.label || '').toUpperCase().slice(0, 4);
    add(f, box(xs + 0.03, 0, 0.1, sw), z0, z1, PUB.ledBg);
    const zc0 = z0 + h * 0.16, zc1 = z1 - h * 0.16, dh = zc1 - zc0;
    if (lvl < 1) { add(f, box(xs + 0.05, 0, 0.08, sw * 0.7), zc0 + dh * 0.15, zc1 - dh * 0.15, PUB.led); return; }
    const dw = dh * 0.52, adv = dw * 1.32, n = Math.max(1, label.length), nw = n * adv - (adv - dw), yR = sw / 2 - 0.12;
    const yL = -sw / 2 + 0.12, tr = yR - nw - 0.16;
    if (lvl < 2) {
      add(f, box(xs + 0.05, yR - nw / 2, 0.08, nw), zc0, zc1, PUB.led);
      add(f, box(xs + 0.05, (yL + tr) / 2, 0.08, tr - yL), zc0 + dh * 0.3, zc1 - dh * 0.3, PUB.led);
      return;
    }
    // two lines of destination text as word blocks
    const words = [[0, .32], [.38, .2], [.64, .36]], span = tr - yL;
    for (const [rz0, rz1, off] of [[zc0, zc0 + dh * 0.38, 0], [zc1 - dh * 0.38, zc1, 0.06]]) {
      for (const [wa, wb] of words) {
        const a = yL + span * Math.min(1, wa + off), b = yL + span * Math.min(1, wb + off);
        if (b - a > 0.04) add(f, box(xs + 0.05, (a + b) / 2, 0.08, b - a), rz0, rz1, PUB.led);
      }
    }
    const st = Math.max(0.025, dw * 0.2);
    for (let i = 0; i < label.length; i++) {
      const segs = SEG7[label[i]] || 'g', yc = yR - nw + i * adv + dw / 2;
      const seg = { a: [0, dh - st, dw, st], b: [dw - st, dh / 2, st, dh / 2], c: [dw - st, 0, st, dh / 2], d: [0, 0, dw, st], e: [0, 0, st, dh / 2], f: [0, dh / 2, st, dh / 2], g: [0, dh / 2 - st / 2, dw, st] };
      for (const k of segs) { const [u, z, w, hh] = seg[k]; add(f, box(xs + 0.06, yc - dw / 2 + u + w / 2, 0.06, w), zc0 + z, zc0 + z + hh, PUB.led); }
    }
  }

  // "SG♥BUS" lettering, centred on xc, on side s (+1 kerb side, -1 offside)
  function pubDecal(add, f, o, s, xc, z0, h) {
    const hw = o.W / 2, dir = -s, k = h / 0.95, adv = 0.8 * k, chars = ['S', 'G', '*', 'B', 'U', 'S'];
    const total = chars.length * adv - 0.18 * k, y = s * (hw + 0.02);
    let cursor = 0;
    for (const ch of chars) {
      for (const [gu, gz, gw, gh] of PUB_GLYPHS[ch]) {
        const c = cursor + (gu + gw / 2) * k - total / 2;
        add(f, box(xc + dir * c, y, Math.max(0.03, gw * k), 0.05), z0 + gz * k, z0 + (gz + gh) * k, ch === '*' ? PUB.heart : PUB.ink);
      }
      cursor += adv;
    }
    add(f, box(xc, s * (hw + 0.02), total * 0.92, 0.05), z0 - 0.11, z0 - 0.07, PUB.ink);           // "Moving Ahead Together" line
  }
  // operator name as letter ticks (same trick as the NUS subtitle)
  function pubMark(add, f, o, s, xc, z0, h) {
    const op = PUB_OPS[o.op]; if (!op) return;
    const dir = -s, step = 0.085, total = op[0].length * step, hw = o.W / 2;
    let c = 0;
    for (const ch of op[0]) {
      if (ch !== ' ') add(f, box(xc + dir * (c - total / 2), s * (hw + 0.02), 0.05, 0.04), z0, z0 + h, op[1]);
      c += step;
    }
  }
  function pubDoors(add, f, o, doors, hw, z0, glassLo, glassHi, hdr) {
    const lvl = o.lvl; if (lvl < 1) return;
    for (const dx of doors) {
      const dy = hw + 0.055;
      add(f, box(dx, dy, 1.0, 0.06), z0, glassLo, PUB.greenDk);
      add(f, box(dx, dy, 1.0, 0.06), glassLo, glassHi, PUB.door);
      add(f, box(dx, dy + 0.02, 1.0, 0.04), glassHi, hdr, PUB.black);
      if (lvl >= 2) {
        for (const ox of [0, -0.5, 0.5]) add(f, box(dx + ox, dy + 0.02, 0.07, 0.1), z0, hdr, PUB.black);
        add(f, box(dx, dy + 0.03, 0.9, 0.04), glassLo + 0.04, glassLo + 0.1, PUB.silverDk);            // door sill rail
      }
    }
  }
  // wheelchair sticker + plate + badge on the green fascia
  function pubFascia(add, f, o, xs, z0, z1, wcZ) {
    const hw = o.W / 2, lvl = o.lvl;
    for (const s of [1, -1]) {
      add(f, box(xs - 0.1, s * (o.W * 0.3), 0.4, 0.82), z0 + 0.15, z0 + 0.62, PUB.head);               // headlight
      if (lvl >= 1) add(f, box(xs - 0.05, s * (o.W * 0.3), 0.4, 0.74), z0 + 0.62, z0 + 0.68, PUB.drl);
    }
    if (lvl < 1) return;
    add(f, box(xs + 0.03, 0, 0.09, 1.7), z0 + 0.08, z0 + 0.4, PUB.black);                                // lower intake
    add(f, box(xs + 0.03, 0, 0.1, 1.1), z1 - 0.34, z1 - 0.06, PUB.plate);                                // plate
    add(f, box(xs + 0.05, 0, 0.1, 0.98), z1 - 0.3, z1 - 0.1, PUB.black);
    if (lvl >= 2) {
      add(f, box(xs + 0.03, 0, 0.07, 0.5), z0 + 0.55, z0 + 0.72, PUB.silver);                           // badge
      add(f, box(xs + 0.03, hw - 0.4, 0.07, 0.34), wcZ, wcZ + 0.34, PUB.wc);                            // wheelchair sticker
      add(f, box(xs + 0.05, hw - 0.4, 0.07, 0.14), wcZ + 0.06, wcZ + 0.28, PUB.white);
    }
  }

  // Single-deck section. Used for the whole SD bus and for each half of the bendy.
  function pubSD(add, f, o) {
    const C = PUB, lvl = o.lvl, W = o.W, hw = W / 2, { x0, x1, wheels } = o, front = !!o.front, rear = !!o.rear;
    const rb = rear ? 0.7 : 0, rf = front ? 0.9 : 0, nose = front ? 0.85 : 0, xb = x1 - nose, archTop = 1.45;
    const cap = (a, b, z0, z1, col, wd = W) => add(f, capsule(a, b, wd, a === x0 ? rb : 0, b === x1 ? rf : 0), z0, z1, col);
    add(f, capsule(x0 + (rear ? 0.5 : 0), x1 - (front ? 1.1 : 0), W - 0.5, rear ? 0.3 : 0, front ? 0.3 : 0), 0.3, archTop, C.arch);
    pubTyres(add, f, o, 1.2);
    pubLower(add, f, o, xb, archTop);
    cap(x0, xb, archTop, 1.55, C.green);
    cap(x0, x1, 1.55, 1.65, C.silver);                                              // silver belt line under the windows
    // --- side windows 1.65 .. 3.5 ---
    const g0 = rear ? x0 + 0.7 : x0;
    if (rear) cap(x0, x0 + 0.7, 1.65, 3.5, C.green);
    cap(g0, xb, 1.65, 3.5, C.glass);
    if (lvl >= 1) cap(g0, xb, 1.65, 1.92, C.glassHi);                                // seat-back / ledge reflection
    if (lvl >= 1) {
      const px = [];
      for (let x = g0 + 0.5; x < xb - 0.2; x += 1.18) if (!o.doors.some(d => Math.abs(x - d) < 0.68)) px.push(x);
      for (const x of (lvl >= 2 ? px : px.filter((_, i) => i % 2 === 0))) add(f, box(x, 0, 0.1, W + 0.06), 1.65, 3.5, C.pillar);
    }
    cap(x0, xb, 3.5, 3.6, C.green);                                                  // roof header
    // --- front: spoiler, green fascia, windscreen, LED sign ---
    if (front) {
      cap(xb, x1, 0.45, 0.8, C.black);
      cap(xb, x1, 0.8, 1.55, C.green);
      const xt = pubGlass(add, f, o, xb, x1, rf, 1.65, 3.3, 0.3, true);
      add(f, capsule(xb, xt, W, 0, Math.max(0.3, rf - (x1 - xt))), 3.3, 3.6, C.black);
      if (lvl >= 1) for (const s of [1, -1]) add(f, box(xb + 0.05, s * (hw - 0.05), 0.5, 0.12), 1.65, 3.3, C.black);   // A-pillars
      pubSign(add, f, o, xt, 3.34, 3.56);
      pubFascia(add, f, o, x1, 0.8, 1.55, 1.72);
      for (const s of [1, -1]) {                                                     // mirrors
        add(f, box(xb - 0.1, s * (hw + 0.22), 0.14, 0.5), 3.0, 3.1, C.black);
        add(f, box(xb - 0.12, s * (hw + 0.42), 0.2, 0.1), 2.0, 3.1, C.black);
      }
    }
    // --- rear ---
    if (rear) {
      for (const s of [1, -1]) add(f, box(x0 + 0.16, s * 1.45, 0.3, 0.5), 1.3, 2.0, C.tail);
      add(f, box(x0 + 0.04, 0, 0.1, W * 0.6), 2.3, 3.35, C.glass);
      if (lvl >= 1) {
        add(f, box(x0 + 0.05, 0, 0.1, 1.0), 0.95, 1.25, C.plate);
        for (const s of [1, -1]) add(f, box(x0 + 0.85, s * (hw + 0.02), 0.8, 0.05), 0.95, 2.2, C.vent);   // engine bay louvres
      }
      if (lvl >= 2) for (const s of [1, -1]) for (let i = 0; i < 4; i++) add(f, box(x0 + 0.85, s * (hw + 0.04), 0.8, 0.03), 1.05 + i * 0.25, 1.11 + i * 0.25, C.arch);
    }
    // --- doors on the kerb side ---
    pubDoors(add, f, o, o.doors, hw, 0.72, 1.2, 3.42, 3.52);
    // --- roof shell + A/C pods ---
    const N = lvl >= 2 ? 10 : lvl >= 1 ? 7 : 3, rz = 0.3 / N, f1 = t => 1 - Math.sqrt(1 - t * t);
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, z0 = 3.6 + rz * i, dx = 0.55 * f1(t), dy = 0.26 * f1(t), dr = rear ? 0.3 * f1(t) : 0;
      add(f, capsule(x0 + dr, x1 - (front ? dx : 0), W - 2 * dy, rear ? Math.max(0.25, rb - dr) : 0, front ? Math.max(0.3, rf - dx * 0.6) : 0), z0, z0 + rz, C.roof);
    }
    const top = 3.9;
    for (const [a, b, h] of o.pods) {
      add(f, capsule(a, b, W * 0.62, 0.3, 0.3), top, top + h, C.pod);
      if (lvl >= 2) for (const s of [1, -1]) {
        add(f, box((a + b) / 2, s * (W * 0.31 + 0.01), b - a - 0.7, 0.04), top + 0.08, top + 0.15, C.vent);
        add(f, box((a + b) / 2, s * (W * 0.31 + 0.01), b - a - 0.7, 0.04), top + 0.22, top + 0.29, C.vent);
      }
    }
    // --- side graphics & markers ---
    if (lvl >= 2) {
      for (const s of [1, -1]) {
        for (const mx of o.markers) add(f, box(mx, s * (hw + 0.02), 0.14, 0.06), 1.5, 1.6, C.marker);
        for (const xc of (s === 1 ? o.decalL : o.decalR)) pubDecal(add, f, o, s, xc, o.decalZ, 0.4);
        for (const xc of (s === 1 ? o.markL : o.markR)) pubMark(add, f, o, s, xc, 0.78, 0.2);
      }
    }
  }

  // Double-deck section (MAN A95 style): tri-axle, silver trim lines, black upper-deck front, SG♥BUS on the green belt.
  function pubDD(add, f, o) {
    const C = PUB, lvl = o.lvl, W = o.W, hw = W / 2, x0 = -5.9, x1 = 5.9, rb = 0.7, rf = 0.9, nose = 0.9, xb = x1 - nose, archTop = 1.55;
    const oo = Object.assign({ x0, x1, rear: true, front: true }, o);
    const cap = (a, b, z0, z1, col, wd = W) => add(f, capsule(a, b, wd, a === x0 ? rb : 0, b === x1 ? rf : 0), z0, z1, col);
    add(f, capsule(x0 + 0.5, x1 - 1.1, W - 0.5, 0.3, 0.3), 0.3, archTop, C.arch);
    pubTyres(add, f, oo, 1.3);
    pubLower(add, f, oo, xb, archTop);
    cap(x0, xb, archTop, 1.75, C.green);
    cap(x0, x1, 1.75, 1.87, C.silver);
    // lower deck windows 1.87 .. 3.5
    cap(x0, x0 + 0.7, 1.87, 3.5, C.green);
    cap(x0 + 0.7, xb, 1.87, 3.5, C.glass);
    if (lvl >= 1) cap(x0 + 0.7, xb, 1.87, 2.12, C.glassHi);
    pubGlass(add, f, o, xb, x1, rf, 1.87, 3.5, 0.25, true);                          // lower-deck windscreen
    cap(x0, x1, 3.5, 3.6, C.silver);
    // green belt (decal band) 3.6 .. 4.25, black sign band on the nose
    cap(x0, xb, 3.6, 4.25, C.green);
    cap(xb, x1, 3.6, 4.25, C.black);
    cap(x0, x1, 4.25, 4.33, C.silver);
    // upper deck windows 4.33 .. 5.65
    cap(x0, x0 + 0.7, 4.33, 5.65, C.green);
    cap(x0 + 0.7, xb, 4.33, 5.65, C.glass);
    if (lvl >= 1) cap(x0 + 0.7, xb, 4.33, 4.58, C.glassHi);
    pubGlass(add, f, o, xb, x1, rf, 4.33, 5.65, 0.3, true);                          // upper-deck panoramic windscreen
    if (lvl >= 1) {
      const lo = [], up = [];
      for (let x = x0 + 1.2; x < xb - 0.2; x += 1.15) { up.push(x); if (!o.doors.some(d => Math.abs(x - d) < 0.68)) lo.push(x); }
      for (const x of (lvl >= 2 ? lo : lo.filter((_, i) => i % 2 === 0))) add(f, box(x, 0, 0.1, W + 0.06), 1.87, 3.5, C.pillar);
      for (const x of (lvl >= 2 ? up : up.filter((_, i) => i % 2 === 0))) add(f, box(x, 0, 0.1, W + 0.06), 4.33, 5.65, C.pillar);
      for (const s of [1, -1]) add(f, box(xb + 0.05, s * (hw - 0.05), 0.5, 0.12), 1.87, 5.65, C.black);   // A-pillars
    }
    // silver vertical swoosh behind the front face
    if (lvl >= 1) for (const s of [1, -1]) add(f, box(xb + 0.02, s * (hw + 0.015), 0.32, 0.06), 1.0, 5.65, C.silver);
    // front: spoiler, green fascia, LED sign
    cap(xb, x1, 0.45, 0.8, C.black);
    cap(xb, x1, 0.8, 1.75, C.green);
    pubSign(add, f, o, x1, 3.66, 4.2);
    pubFascia(add, f, oo, x1, 0.8, 1.75, 1.95);
    for (const s of [1, -1]) {                                                       // big mirrors
      add(f, box(xb - 0.1, s * (hw + 0.22), 0.14, 0.55), 3.0, 3.1, C.black);
      add(f, box(xb - 0.12, s * (hw + 0.45), 0.2, 0.1), 2.0, 3.1, C.black);
    }
    // rear
    for (const s of [1, -1]) add(f, box(x0 + 0.16, s * 1.5, 0.3, 0.5), 1.3, 2.0, C.tail);
    add(f, box(x0 + 0.04, 0, 0.1, W * 0.6), 2.3, 3.4, C.glass);
    add(f, box(x0 + 0.04, 0, 0.1, W * 0.6), 4.55, 5.55, C.glass);
    if (lvl >= 1) {
      add(f, box(x0 + 0.05, 0, 0.1, 1.0), 0.95, 1.25, C.plate);
      for (const s of [1, -1]) {
        add(f, box(x0 + 0.85, s * (hw + 0.02), 0.8, 0.05), 0.95, 3.0, C.vent);       // engine bay louvres
        if (lvl >= 2) for (let i = 0; i < 7; i++) add(f, box(x0 + 0.85, s * (hw + 0.04), 0.8, 0.03), 1.05 + i * 0.28, 1.11 + i * 0.28, C.arch);
      }
    }
    pubDoors(add, f, o, o.doors, hw, 0.72, 1.3, 3.42, 3.52);
    // roof shell: green, black dome over the front (upper deck panoramic cap)
    add(f, capsule(x0, xb, W, rb, 0), 5.65, 5.75, C.green);
    add(f, capsule(xb, x1, W, 0, rf), 5.65, 5.75, C.black);
    const N = lvl >= 2 ? 10 : lvl >= 1 ? 7 : 3, rz = 0.3 / N, f1 = t => 1 - Math.sqrt(1 - t * t), cut = x1 - 2.0;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, z0 = 5.75 + rz * i, dx = 0.55 * f1(t), dy = 0.26 * f1(t), dr = 0.3 * f1(t), wl = W - 2 * dy;
      add(f, capsule(x0 + dr, cut, wl, Math.max(0.25, rb - dr), 0), z0, z0 + rz, C.roof);
      add(f, capsule(cut, x1 - dx, wl, 0, Math.max(0.3, rf - dx * 0.6)), z0, z0 + rz, C.black);
    }
    const top = 6.05;
    add(f, capsule(x0 + 0.8, x0 + 3.9, W * 0.6, 0.3, 0.3), top, top + 0.28, C.pod);                  // rear A/C unit
    if (lvl >= 2) for (const s of [1, -1]) add(f, box(x0 + 2.35, s * (W * 0.3 + 0.01), 2.4, 0.04), top + 0.1, top + 0.2, C.vent);
    if (lvl >= 2) {
      for (const s of [1, -1]) {
        for (const mx of [3.9, -0.9, -5.4]) add(f, box(mx, s * (hw + 0.02), 0.14, 0.06), 1.6, 1.7, C.marker);
        for (const xc of (s === 1 ? o.decalL : o.decalR)) pubDecal(add, f, o, s, xc, 3.72, 0.42);
        for (const xc of (s === 1 ? o.markL : o.markR)) pubMark(add, f, o, s, xc, 1.25, 0.22);
      }
    }
  }

  // Bendy: dark ribbed bellows (accordion) bridging the two sections, with a roof turntable cover
  function pubJoint(add, f, o) {
    const W = o.W, lvl = o.lvl;
    add(f, capsule(-0.9, 0.9, W * 0.9, 0.2, 0.2), 0.7, 3.62, PUB.joint);
    if (lvl >= 1) {
      for (let i = 0; i < 6; i++) {
        const x = -0.72 + i * 0.29, wide = i % 2 === 0;
        add(f, box(x, 0, 0.13, W * (wide ? 0.97 : 0.92)), 0.72, 3.6, wide ? PUB.ribHi : PUB.rib);
      }
    }
    add(f, box(0, 0, 1.9, W * 0.84), 3.62, 3.72, PUB.rib);
    if (lvl >= 1) add(f, box(0, 0, 1.2, W * 0.5), 3.72, 3.78, PUB.glassHi);
  }

  function busParts(b, k, out, detail, hi) {
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
    if (publicBus) {
      CAP_N = hi ? 8 : detail ? 5 : 3;
      const base = { lvl: hi ? 2 : detail ? 1 : 0, label: b.label, op: b.operator };
      if (b.type === 'DD') {
        pubDD(add, main, Object.assign({ W: 4.0, wheels: [2.7, -2.6, -4.3], doors: [4.35, -0.05], decalL: [-1.0], decalR: [-1.0], markL: [1.2], markR: [0.0] }, base));
      } else if (b.type === 'BD') {
        const trail = b.trail ?? b.heading;
        const BW = 3.9;
        pubSD(add, main, Object.assign({ W: BW, x0: -1.4, x1: 8.4, front: true, rear: false, wheels: [5.6, 0.4], doors: [7.05, 2.9], pods: [[0.4, 4.4, 0.34]], markers: [4.2, -0.9], decalL: [], decalR: [3.4], decalZ: 0.85, markL: [], markR: [1.5] }, base));
        const pivot = framePoint(main, -2.1, k);
        const mid = busFrame(pivot.lat, pivot.lng, lerpAngle(trail, b.heading, 0.5));
        pubJoint(add, mid, Object.assign({ W: BW }, base));
        const back = busFrame(pivot.lat, pivot.lng, trail);
        pubSD(add, back, Object.assign({ W: BW, x0: -7.2, x1: -0.7, front: false, rear: true, wheels: [-4.6], doors: [-2.5], pods: [[-6.4, -2.7, 0.34]], markers: [-6.2], decalL: [], decalR: [-2.0], decalZ: 0.85, markL: [], markR: [] }, base));
      } else {
        pubSD(add, main, Object.assign({ W: 3.9, x0: -5.5, x1: 5.5, front: true, rear: true, wheels: [2.5, -3.1], doors: [4.0, 0.6], pods: [[-2.2, 2.4, 0.32]], markers: [-4.6, 1.5], decalL: [-1.15], decalR: [-0.9], decalZ: 0.85, markL: [], markR: [0.95] }, base));
      }
      CAP_N = 3;
    } else if (b.type === 'DD') {
      busSection(add, main, { detail, x0: -5.8, x1: 5.8, W, body, pod, dd: true, front: true, rear: true, wheels: [3.7, -2.3, -4.1] });
    } else if (b.type === 'BD') {
      const trail = b.trail ?? b.heading;
      busSection(add, main, { detail, x0: -1.4, x1: 8.4, W, body, pod, dd: false, front: true, rear: false, wheels: [6.0, 0.4] });
      const pivot = framePoint(main, -2.1, k);
      const mid = busFrame(pivot.lat, pivot.lng, lerpAngle(trail, b.heading, 0.5));
      add(mid, capsule(-0.9, 0.9, W * 0.9, 0.3, 0.3), 0.7, 4.4, LIVERY.joint);
      const back = busFrame(pivot.lat, pivot.lng, trail);
      busSection(add, back, { detail, x0: -7.2, x1: -0.7, W, body, pod, dd: false, front: false, rear: true, wheels: [-4.6] });
    } else if (b.opCls === 'op-ntu' || b.opCls === 'op-nus') {
      campusBus(add, main, { kind: b.opCls === 'op-nus' ? 'nus' : 'ntu', lvl: hi ? 2 : detail ? 1 : 0 });
    } else {
      busSection(add, main, { detail, x0: -5.5, x1: 5.5, W, body, pod, campus, dd: false, front: true, rear: true, wheels: [3.4, -3.2] });
    }
  }

  const MESH = { ok: true, gl: null, prog: null, loc: null, meshes: {}, textures: new Map(), signs: new Map(), list: [], k: 1, failed: false };
  const ATLAS = { size: 1024, left: [0, 0, 1024, 256], right: [0, 256, 1024, 256], roof: [0, 512, 1024, 128], front: [0, 704, 256, 256], rear: [256, 704, 256, 256], under: [528, 720, 32, 32] };
  const SHAPES = {
    SD: { x0: -6, x1: 6, W: 2.55, H: 2.85, z0: 0.3, front: true, rear: true, rake: 0.34, wheels: [3.3, -2.6], doors: [[4.3, 5.5], [-0.9, 0.5]], bands: [[0.95, 2.3]], pods: [[-2.6, 1.9, 1.7, 0.26]] },
    DD: { x0: -6.2, x1: 6.2, W: 2.55, H: 4.1, z0: 0.3, front: true, rear: true, rake: 0.2, wheels: [3.5, -2.4, -3.8], doors: [[4.5, 5.7], [-0.7, 0.7]], bands: [[0.95, 2.0], [2.55, 3.6]], pods: [] },
    BDf: { x0: -1.2, x1: 8.4, W: 2.55, H: 2.85, z0: 0.3, front: true, rear: false, rake: 0.34, wheels: [5.7, 0.1], doors: [[6.7, 7.9], [2.3, 3.7]], bands: [[0.95, 2.3]], pods: [[1.2, 5.2, 1.7, 0.26]] },
    BDr: { x0: -7.6, x1: -0.7, W: 2.55, H: 2.85, z0: 0.3, front: false, rear: true, rake: 0, wheels: [-4.9], doors: [[-3.4, -2.0]], bands: [[0.95, 2.3]], pods: [[-6.4, -2.6, 1.7, 0.26]] },
    EV: { x0: -6, x1: 6, W: 2.55, H: 2.95, z0: 0.3, front: true, rear: true, rake: 0.3, wheels: [3.3, -2.9], doors: [[4.3, 5.5], [-0.8, 0.6]], bands: [[0.95, 2.35]], pods: [[-5.2, -0.4, 1.9, 0.3], [0.2, 4.6, 1.9, 0.3]] },
  };
  const LIVERIES = {
    pub: { body: '#8FD42A', roof: '#8FD42A', pod: '#7FC522', stripe: '#D5DADE', style: 'pub' },
    ntu: { body: '#1F56D8', roof: '#1A3FB0', pod: '#16348F', stripe: '#3FC1F0', style: 'ntu', accent: '#E0263C' },
    nus: { body: '#F28A1C', roof: '#2458C9', pod: '#1B449C', stripe: '#F28A1C', style: 'nus', accent: '#2458C9' },
  };
  const WHEEL_R = 0.48, WHEEL_W = 0.3;

  function sstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function axisSamples(h, r, inner) {
    const out = [];
    for (const deg of [45, 30, 15]) out.push(-(h - r) - r * Math.tan(toRad(deg)));
    for (let i = 0; i <= inner; i++) out.push(-(h - r) + (2 * (h - r) * i) / inner);
    for (const deg of [15, 30, 45]) out.push((h - r) + r * Math.tan(toRad(deg)));
    return out;
  }

  function buildBody(s, r, plain) {
    const hx = (s.x1 - s.x0) / 2, cx = (s.x0 + s.x1) / 2, hy = s.W / 2, hz = s.H / 2, cz = s.z0 + hz;
    const half = [hx, hy, hz];
    const samp = [axisSamples(hx, r, plain ? 2 : Math.max(6, Math.round(hx * 1.6))), axisSamples(hy, r, 2), axisSamples(hz, r, plain ? 2 : 4)];
    const pos = [], nrm = [], uv = [], idx = [];
    const region = (name, u, v) => { const [rx, ry, rw, rh] = ATLAS[name]; const pad = 1.5; return [(rx + pad + u * (rw - 2 * pad)) / ATLAS.size, (ry + pad + v * (rh - 2 * pad)) / ATLAS.size]; };
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      for (const sign of [1, -1]) {
        const base = pos.length / 3, nb = samp[b].length, nc = samp[c].length;
        for (let i = 0; i < nb; i++) for (let j = 0; j < nc; j++) {
          const p = [0, 0, 0];
          p[a] = sign * half[a]; p[b] = samp[b][i]; p[c] = samp[c][j];
          const d = [0, 0, 0];
          let len = 0;
          for (let t = 0; t < 3; t++) { const q = Math.max(-(half[t] - r), Math.min(half[t] - r, p[t])); d[t] = p[t] - q; len += d[t] * d[t]; }
          len = Math.sqrt(len);
          const n = [d[0] / len, d[1] / len, d[2] / len];
          pos.push(p[0] - d[0] + n[0] * r, p[1] - d[1] + n[1] * r, p[2] - d[2] + n[2] * r);
          nrm.push(n[0], n[1], n[2]);
          const ux = (p[0] + hx) / (2 * hx), uy = (p[1] + hy) / (2 * hy), uz = 1 - (p[2] + hz) / (2 * hz);
          let t;
          if (a === 0) t = sign > 0 ? region('front', uy, uz) : region('rear', 1 - uy, uz);
          else if (a === 1) t = region(sign > 0 ? 'left' : 'right', ux, uz);
          else t = sign > 0 ? region('roof', ux, uy) : region('under', 0.5, 0.5);
          uv.push(t[0], t[1]);
        }
        for (let i = 0; i < nb - 1; i++) for (let j = 0; j < nc - 1; j++) {
          const v0 = base + i * nc + j, v1 = v0 + nc, v2 = v1 + 1, v3 = v0 + 1;
          idx.push(v0, v1, v2, v0, v2, v3);
        }
      }
    }
    const count = pos.length / 3;
    if (!plain) {
      const top = s.z0 + s.H, waist = s.z0 + 1.0;
      for (let v = 0; v < count; v++) {
        let x = pos[v * 3] + cx, y = pos[v * 3 + 1], z = pos[v * 3 + 2] + cz;
        const side = (y / hy) * (y / hy);
        if (s.front) {
          const f = sstep(s.x1 - 1.5, s.x1, x);
          x -= s.rake * f * Math.min(1, Math.max(0, (z - waist) / (top - waist)));
          x -= 0.22 * f * side;
          y *= 1 - 0.035 * f;
        }
        if (s.rear) {
          const f = sstep(s.x0 + 1.2, s.x0, x);
          x += 0.1 * f * side;
          y *= 1 - 0.02 * f;
        }
        const crown = sstep(top - 0.5, top, z);
        z += 0.05 * crown * (1 - side);
        pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      }
      const acc = new Map(), key = v => Math.round(pos[v * 3] * 500) + ',' + Math.round(pos[v * 3 + 1] * 500) + ',' + Math.round(pos[v * 3 + 2] * 500);
      for (let t = 0; t < idx.length; t += 3) {
        const [i0, i1, i2] = [idx[t], idx[t + 1], idx[t + 2]];
        const ax = pos[i1 * 3] - pos[i0 * 3], ay = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], az = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
        const bx = pos[i2 * 3] - pos[i0 * 3], by = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], bz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        if (nx * nrm[i0 * 3] + ny * nrm[i0 * 3 + 1] + nz * nrm[i0 * 3 + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
        for (const i of [i0, i1, i2]) {
          const k = key(i);
          let e = acc.get(k);
          if (!e) acc.set(k, e = [0, 0, 0]);
          e[0] += nx; e[1] += ny; e[2] += nz;
        }
      }
      for (let v = 0; v < count; v++) {
        const e = acc.get(key(v)), l = Math.hypot(e[0], e[1], e[2]) || 1;
        nrm[v * 3] = e[0] / l; nrm[v * 3 + 1] = e[1] / l; nrm[v * 3 + 2] = e[2] / l;
      }
    }
    return packMesh(pos, nrm, uv, idx);
  }

  function buildWheel() {
    const pos = [], nrm = [], uv = [], idx = [], N = 20;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, cxs = Math.cos(a), sn = Math.sin(a);
      for (const y of [1, -1]) { pos.push(cxs, y, sn); nrm.push(cxs, 0, sn); uv.push(0, 0); }
    }
    for (let i = 0; i < N; i++) { const v = i * 2; idx.push(v, v + 1, v + 3, v, v + 3, v + 2); }
    for (const y of [1, -1]) {
      const c = pos.length / 3;
      pos.push(0, y, 0); nrm.push(0, y, 0); uv.push(0, 0);
      for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; pos.push(Math.cos(a), y, Math.sin(a)); nrm.push(0, y, 0); uv.push(0, 0); }
      for (let i = 0; i < N; i++) idx.push(c, c + 1 + i, c + 2 + i);
    }
    return packMesh(pos, nrm, uv, idx);
  }

  function buildQuad(axis) {
    const pos = axis === 'x' ? [0, -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1] : [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
    const nrm = axis === 'x' ? [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0] : [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    return packMesh(pos, nrm, axis === 'x' ? [0, 1, 1, 1, 1, 0, 0, 0] : [0, 0, 1, 0, 1, 1, 0, 1], [0, 1, 2, 0, 2, 3]);
  }

  function packMesh(pos, nrm, uv, idx) {
    const n = pos.length / 3, data = new Float32Array(n * 8);
    for (let v = 0; v < n; v++) data.set([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2], uv[v * 2], uv[v * 2 + 1]], v * 8);
    return { data, idx: new Uint16Array(idx), count: idx.length };
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const ch = sft => { const v = (n >> sft) & 255; return Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)))); };
    return '#' + [16, 8, 0].map(sft => ch(sft).toString(16).padStart(2, '0')).join('');
  }

  function paintAtlas(shapeName, liv) {
    const s = SHAPES[shapeName], c = document.createElement('canvas');
    c.width = c.height = ATLAS.size;
    const g = c.getContext('2d');
    const L = s.x1 - s.x0, H = s.H, style = liv.style;
    const glassFill = (x, y, w, h) => {
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, '#10161B'); gr.addColorStop(0.55, '#1C262E'); gr.addColorStop(1, '#2A3842');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    };
    const rrect = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

    const side = (name, isLeft) => {
      const [rx, ry, rw, rh] = ATLAS[name];
      const X = x => rx + ((x - s.x0) / L) * rw, Y = z => ry + (1 - z / H) * rh, PX = m => (m / L) * rw, PY = m => (m / H) * rh;
      g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
      g.fillStyle = liv.body; g.fillRect(rx, ry, rw, rh);
      if (style === 'ntu') {
        const gr = g.createLinearGradient(rx, 0, rx + rw, 0);
        gr.addColorStop(0, '#2FA6E8'); gr.addColorStop(0.45, liv.body); gr.addColorStop(1, '#1B43B8');
        g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
        g.globalAlpha = 0.35; g.fillStyle = '#8FE0FF';
        for (const [a, b2, w2] of [[0.4, 2.6, 0.9], [1.8, 3.6, 0.5], [3.3, 4.6, 0.35]]) { g.beginPath(); g.moveTo(X(s.x0 + a), Y(0)); g.lineTo(X(s.x0 + a + w2), Y(0)); g.lineTo(X(s.x0 + b2 + w2), Y(H)); g.lineTo(X(s.x0 + b2), Y(H)); g.closePath(); g.fill(); }
        g.globalAlpha = 1;
        g.fillStyle = liv.accent; g.beginPath(); g.moveTo(X(s.x1 - 1.5), Y(0)); g.lineTo(X(s.x1), Y(0)); g.lineTo(X(s.x1), Y(0.95)); g.closePath(); g.fill();
      }
      if (style === 'nus') { g.fillStyle = liv.roof; g.beginPath(); g.moveTo(X(s.x0), Y(H)); g.lineTo(X(s.x1), Y(H)); g.lineTo(X(s.x1), Y(H - 0.5)); g.lineTo(X(s.x1 - 2.6), Y(H - 0.28)); g.lineTo(X(s.x0 + 2.4), Y(H - 0.28)); g.lineTo(X(s.x0), Y(H - 0.5)); g.closePath(); g.fill(); }
      const sh = g.createLinearGradient(0, ry, 0, ry + rh);
      sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
      g.fillStyle = sh; g.fillRect(rx, ry, rw, rh);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(rx, Y(0.5), rw, 2);
      s.bands.forEach(([lo, hi], bi) => {
        const xa = s.rear ? s.x0 + 0.55 : s.x0 - 0.2, xb = s.front ? s.x1 + 0.2 : s.x1 + 0.2;
        g.fillStyle = liv.stripe; g.fillRect(X(xa), Y(lo) , PX(xb - xa), PY(0.07));
        g.save(); rrect(X(xa), Y(hi), PX(xb - xa), PY(hi - lo), PY(0.12)); g.clip();
        glassFill(X(xa), Y(hi), PX(xb - xa), PY(hi - lo));
        g.fillStyle = 'rgba(255,255,255,0.07)';
        for (let x = s.x0 + 1; x < s.x1; x += 2.9) { g.beginPath(); g.moveTo(X(x), Y(lo)); g.lineTo(X(x + 0.5), Y(lo)); g.lineTo(X(x + 1.3), Y(hi)); g.lineTo(X(x + 0.8), Y(hi)); g.closePath(); g.fill(); }
        g.fillStyle = '#0A0E11';
        for (let x = xa + 1.45; x < s.x1 - 0.6; x += 1.45) g.fillRect(X(x) - 1.5, Y(hi), 3, PY(hi - lo));
        g.restore();
        if (s.front && style === 'pub' && bi === s.bands.length - 1 && s.bands.length > 1) { g.fillStyle = '#15191C'; g.fillRect(X(s.x1 - 1.5), Y(H), PX(1.7), PY(H - s.bands[0][1] - 0.1)); glassFill(X(s.x1 - 1.4), Y(hi), PX(1.6), PY(hi - lo)); }
      });
      if (s.front && style !== 'pub') { g.fillStyle = '#15191C'; g.fillRect(X(s.x1 - 0.55), Y(s.bands[0][1] + 0.3), PX(0.8), PY(s.bands[0][1] + 0.3 - 0.9)); }
      if (isLeft) for (const [a, b2] of s.doors) {
        const top = s.bands[0][1], x = X(a), w = PX(b2 - a), y = Y(top), h = PY(top - 0.1);
        glassFill(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.35, y + h); g.lineTo(x + w, y); g.lineTo(x + w * 0.65, y); g.closePath(); g.fill();
        g.strokeStyle = '#AEB5BB'; g.lineWidth = 2.5; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
        g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
      }
      if (!isLeft && s.rear) { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 6; i++) g.fillRect(X(s.x0 + 0.5), Y(0.85 - i * 0.09), PX(1.1), 2); }
      for (const wx of s.wheels) { g.fillStyle = '#0B0C0E'; g.beginPath(); g.ellipse(X(wx), Y(WHEEL_R - s.z0), PX(0.64), PY(0.64), 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#FFB020'; for (let x = s.x0 + 1.5; x < s.x1 - 1; x += 3.2) g.fillRect(X(x), Y(0.72), PX(0.12), PY(0.06));
      g.restore();
    };
    side('left', true); side('right', false);

    {
      const [rx, ry, rw, rh] = ATLAS.roof;
      g.fillStyle = liv.roof; g.fillRect(rx, ry, rw, rh);
      const X = x => rx + ((x - s.x0) / L) * rw;
      if (style === 'pub' && s.bands.length > 1) { g.fillStyle = '#15191C'; g.fillRect(X(s.x1 - 2.2), ry, rw, rh); }
      if (style === 'nus') { g.fillStyle = liv.body; g.fillRect(X(s.x0 + 2.4), ry + rh * 0.2, (2.4 / L) * rw, rh * 0.6); }
      g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1.5;
      for (let x = s.x0 + 1.5; x < s.x1; x += 1.5) { g.beginPath(); g.moveTo(X(x), ry); g.lineTo(X(x), ry + rh); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (const hx of [s.x0 + L * 0.2, s.x0 + L * 0.82]) g.fillRect(X(hx), ry + rh * 0.36, (0.7 / L) * rw, rh * 0.28);
      const sh = g.createLinearGradient(0, ry, 0, ry + rh);
      sh.addColorStop(0, 'rgba(0,0,0,0.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.1)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.fillStyle = sh; g.fillRect(rx, ry, rw, rh);
    }

    const endFace = (name, isFront) => {
      const [rx, ry, rw, rh] = ATLAS[name], W = s.W;
      const X = y => rx + ((y + W / 2) / W) * rw, Y = z => ry + (1 - z / H) * rh, PX = m => (m / W) * rw, PY = m => (m / H) * rh;
      g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
      g.fillStyle = liv.body; g.fillRect(rx, ry, rw, rh);
      if (style === 'nus') { g.fillStyle = liv.roof; g.fillRect(rx, ry, rw, PY(0.3)); }
      if (!(isFront ? s.front : s.rear)) { g.fillStyle = '#2B2E32'; g.fillRect(rx, ry, rw, rh); g.restore(); return; }
      const lo = s.bands[0][0], hi = s.bands[0][1], dd = s.bands.length > 1;
      if (isFront) {
        const maskTop = dd ? H - 0.12 : H - 0.14, maskLo = style === 'pub' ? lo - 0.25 : 0.12;
        g.fillStyle = '#121518'; rrect(X(-W / 2 + 0.07), Y(maskTop), PX(W - 0.14), PY(maskTop - maskLo), PX(0.16)); g.fill();
        const ws = (zlo, zhi) => {
          g.save(); rrect(X(-W / 2 + 0.16), Y(zhi), PX(W - 0.32), PY(zhi - zlo), PX(0.12)); g.clip();
          const gr = g.createLinearGradient(0, Y(zhi), 0, Y(zlo));
          gr.addColorStop(0, '#141C22'); gr.addColorStop(1, '#3A4B57');
          g.fillStyle = gr; g.fillRect(rx, Y(zhi), rw, PY(zhi - zlo));
          g.fillStyle = 'rgba(255,255,255,0.09)'; g.beginPath(); g.moveTo(X(-0.9), Y(zlo)); g.lineTo(X(-0.3), Y(zlo)); g.lineTo(X(0.5), Y(zhi)); g.lineTo(X(-0.1), Y(zhi)); g.closePath(); g.fill();
          g.restore();
        };
        ws(lo - 0.05, dd ? hi : hi - 0.15);
        if (dd) ws(s.bands[1][0], s.bands[1][1] + 0.1);
        g.strokeStyle = '#06080A'; g.lineWidth = 2;
        for (const sx of [-0.55, 0.45]) { g.beginPath(); g.moveTo(X(sx), Y(lo)); g.lineTo(X(sx + 0.55), Y(lo + 0.5)); g.stroke(); }
        if (style === 'pub') { g.fillStyle = liv.stripe; g.fillRect(rx, Y(lo - 0.25), rw, PY(0.05)); }
        if (style === 'ntu') { g.fillStyle = liv.accent; g.fillRect(rx, Y(0.42), rw, PY(0.42)); g.fillStyle = '#121518'; rrect(X(-0.8), Y(0.4), PX(1.6), PY(0.3), 4); g.fill(); }
        if (style === 'nus') { g.fillStyle = liv.body; g.fillRect(rx, Y(0.3), rw, PY(0.3)); }
        for (const sy of [-1, 1]) {
          g.fillStyle = '#F4F7FA'; rrect(X(sy * 0.86 - 0.24), Y(0.62), PX(0.48), PY(0.2), 3); g.fill();
          g.fillStyle = '#FFB020'; g.fillRect(X(sy * 1.06 - 0.05), Y(0.6), PX(0.1), PY(0.16));
        }
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(rx, Y(0.2), rw, PY(0.2));
      } else {
        const wlo = dd ? s.bands[1][0] : lo + 0.5, whi = dd ? s.bands[1][1] : hi;
        g.save(); rrect(X(-W / 2 + 0.3), Y(whi), PX(W - 0.6), PY(whi - wlo), PX(0.1)); g.clip(); glassFill(rx, Y(whi), rw, PY(whi - wlo)); g.restore();
        g.fillStyle = 'rgba(0,0,0,0.25)'; rrect(X(-0.85), Y(lo + 0.3), PX(1.7), PY(lo - 0.05), 4); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 5; i++) g.fillRect(X(-0.7), Y(0.9 - i * 0.12), PX(1.4), 2);
        for (const sy of [-1, 1]) {
          g.fillStyle = '#E5332A'; rrect(X(sy * 1.04 - 0.1), Y(1.25), PX(0.2), PY(0.4), 3); g.fill();
          g.fillStyle = '#FFB020'; rrect(X(sy * 1.04 - 0.1), Y(0.82), PX(0.2), PY(0.2), 3); g.fill();
          g.fillStyle = '#F4F7FA'; rrect(X(sy * 1.04 - 0.1), Y(0.6), PX(0.2), PY(0.12), 2); g.fill();
        }
        g.fillStyle = '#101316'; rrect(X(0.2), Y(H - 0.2), PX(0.85), PY(0.3), 3); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(rx, Y(0.2), rw, PY(0.2));
      }
      g.restore();
    };
    endFace('front', true); endFace('rear', false);
    { const [rx, ry, rw, rh] = ATLAS.under; g.fillStyle = '#17181B'; g.fillRect(rx - 8, ry - 8, rw + 16, rh + 16); }
    return c;
  }

  function paintSign(text, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#07090A'; g.fillRect(0, 0, 256, 64);
    let size = 52;
    g.font = `700 ${size}px "Barlow Condensed", Arial, sans-serif`;
    while (size > 18 && g.measureText(text).width > 228) { size -= 3; g.font = `700 ${size}px "Barlow Condensed", Arial, sans-serif`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 6;
    g.fillText(text, 128, 35);
    return c;
  }

  const MESH_VS = `
    attribute vec3 a_pos; attribute vec3 a_nrm; attribute vec2 a_uv;
    uniform mat4 u_mvp; varying vec3 v_nrm; varying vec2 v_uv;
    void main() { v_nrm = a_nrm; v_uv = a_uv; gl_Position = u_mvp * vec4(a_pos, 1.0); }`;
  const MESH_FS = `
    precision mediump float;
    uniform sampler2D u_tex; uniform vec4 u_color; uniform float u_mode; uniform vec3 u_light; uniform vec3 u_amb;
    varying vec3 v_nrm; varying vec2 v_uv;
    void main() {
      if (u_mode > 1.5 && u_mode < 2.5) {
        vec2 p = abs(v_uv * 2.0 - 1.0);
        float d = length(max(p - vec2(0.62, 0.45), 0.0));
        gl_FragColor = vec4(0.0, 0.0, 0.0, u_color.a * (1.0 - smoothstep(0.0, 0.5, d)));
        return;
      }
      vec4 base = u_mode > 0.5 ? texture2D(u_tex, v_uv) : u_color;
      if (u_mode > 2.5) { gl_FragColor = vec4(base.rgb, 1.0); return; }
      vec3 n = normalize(v_nrm);
      float dif = max(dot(n, u_light), 0.0);
      float sky = n.z * 0.5 + 0.5;
      vec3 lit = base.rgb * (u_amb.x + u_amb.y * sky + u_amb.z * dif);
      float gloss = pow(max(dot(n, normalize(u_light + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * 0.16;
      gl_FragColor = vec4(lit + gloss, 1.0);
    }`;

  function meshInit(gl) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, MESH_VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, MESH_FS));
    gl.bindAttribLocation(prog, 0, 'a_pos'); gl.bindAttribLocation(prog, 1, 'a_nrm'); gl.bindAttribLocation(prog, 2, 'a_uv');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    MESH.gl = gl; MESH.prog = prog;
    MESH.loc = {};
    for (const u of ['u_mvp', 'u_tex', 'u_color', 'u_mode', 'u_light', 'u_amb']) MESH.loc[u] = gl.getUniformLocation(prog, u);
    const upload = m => {
      m.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo); gl.bufferData(gl.ARRAY_BUFFER, m.data, gl.STATIC_DRAW);
      m.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
      return m;
    };
    if (gl.bindVertexArray) gl.bindVertexArray(null);
    for (const name of Object.keys(SHAPES)) MESH.meshes[name] = upload(buildBody(SHAPES[name], 0.2, false));
    MESH.meshes.box = upload(buildBody({ x0: -1, x1: 1, W: 2, H: 2, z0: -1 }, 0.28, true));
    MESH.meshes.wheel = upload(buildWheel());
    MESH.meshes.sign = upload(buildQuad('x'));
    MESH.meshes.ground = upload(buildQuad('z'));
  }

  function meshTexture(gl, map, key, paint, max) {
    let t = map.get(key);
    if (t) { map.delete(key); map.set(key, t); return t; }
    const canvas = paint();
    t = gl.createTexture();
    const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), pre = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pre);
    map.set(key, t);
    if (map.size > max) { const old = map.keys().next().value; gl.deleteTexture(map.get(old)); map.delete(old); }
    return t;
  }

  function busLivery(b) {
    if (b.opCls === 'op-ntu') return ['ntu', LIVERIES.ntu];
    if (b.opCls === 'op-nus') return ['nus', LIVERIES.nus];
    if (!b.campus && b.opCls !== 'op-private') return ['pub', LIVERIES.pub];
    return ['c' + b.color, { body: b.color, roof: b.color, pod: shade(b.color, -0.15), stripe: '#D5DADE', style: 'priv' }];
  }

  function hexRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
  }

  function meshRender(gl, args) {
    const main = args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix || args;
    if (!main || main.length !== 16 || !MESH.list.length) return;
    if (!MESH.prog) meshInit(gl);
    const loc = MESH.loc, k = MESH.k, light = isLight();
    gl.useProgram(MESH.prog);
    if (gl.bindVertexArray) gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(loc.u_tex, 0);
    gl.uniform3f(loc.u_amb, light ? 0.5 : 0.4, light ? 0.22 : 0.18, light ? 0.5 : 0.42);
    for (let i = 0; i < 3; i++) gl.enableVertexAttribArray(i);
    let bound = null;
    const mvp = new Float32Array(16), mm = new Float64Array(16);
    const sun = [0.36, 0.48, 0.8];
    const draw = (mesh, fr, t, sc, mode, color, tex) => {
      if (bound !== mesh) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
        bound = mesh;
      }
      const s = fr.s;
      mm[0] = s * sc[0] * fr.sin; mm[1] = -s * sc[0] * fr.cos; mm[2] = 0; mm[3] = 0;
      mm[4] = -s * sc[1] * fr.cos; mm[5] = -s * sc[1] * fr.sin; mm[6] = 0; mm[7] = 0;
      mm[8] = 0; mm[9] = 0; mm[10] = s * sc[2]; mm[11] = 0;
      mm[12] = fr.ox + s * (t[0] * fr.sin - t[1] * fr.cos); mm[13] = fr.oy + s * (-t[0] * fr.cos - t[1] * fr.sin); mm[14] = s * t[2]; mm[15] = 1;
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) mvp[c * 4 + r] = main[r] * mm[c * 4] + main[4 + r] * mm[c * 4 + 1] + main[8 + r] * mm[c * 4 + 2] + main[12 + r] * mm[c * 4 + 3];
      gl.uniformMatrix4fv(loc.u_mvp, false, mvp);
      gl.uniform1f(loc.u_mode, mode);
      gl.uniform4fv(loc.u_color, color || [1, 1, 1, 1]);
      gl.uniform3f(loc.u_light, sun[0] * fr.sin + sun[1] * fr.cos, -sun[0] * fr.cos + sun[1] * fr.sin, sun[2]);
      if (tex) gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    };
    const frameAt = (lat, lng, heading) => {
      const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      return { ox: mc.x, oy: mc.y, s: mc.meterInMercatorCoordinateUnits() * k, sin: Math.sin(toRad(heading)), cos: Math.cos(toRad(heading)), lat, lng, heading };
    };
    const offset = (fr, x) => ({ lat: fr.lat + (x * k * fr.cos) / 110540, lng: fr.lng + (x * k * fr.sin) / (111320 * Math.cos(toRad(fr.lat))) });
    const jobs = [];
    for (const b of MESH.list) {
      const [lk, liv] = busLivery(b), fr = frameAt(b.cur.lat, b.cur.lng, b.heading);
      const campus = lk === 'ntu' || lk === 'nus';
      if (b.type === 'BD' && !campus) {
        const trail = b.trail ?? b.heading, pv = offset(fr, -1.9);
        jobs.push({ b, fr, shape: 'BDf', lk, liv, sign: true });
        jobs.push({ b, fr: frameAt(pv.lat, pv.lng, lerpAngle(trail, b.heading, 0.5)), joint: true });
        jobs.push({ b, fr: frameAt(pv.lat, pv.lng, trail), shape: 'BDr', lk, liv });
      } else jobs.push({ b, fr, shape: campus ? 'EV' : b.type === 'DD' ? 'DD' : 'SD', lk, liv, sign: true });
    }
    gl.depthMask(false);
    for (const j of jobs) {
      if (j.joint) continue;
      const s = SHAPES[j.shape], L = s.x1 - s.x0;
      draw(MESH.meshes.ground, j.fr, [(s.x0 + s.x1) / 2 - 0.25, -0.2, 0.03], [L / 2 + 1.1, s.W / 2 + 0.95, 1], 2, [0, 0, 0, light ? 0.3 : 0.42]);
    }
    gl.depthMask(true);
    const tyre = [0.07, 0.07, 0.08, 1], hub = [0.62, 0.64, 0.66, 1], dark = [0.09, 0.1, 0.11, 1], rib = [0.2, 0.21, 0.23, 1];
    for (const j of jobs) {
      if (j.joint) {
        draw(MESH.meshes.box, j.fr, [0, 0, 1.72], [0.75, 1.2, 1.36], 0, rib);
        for (const x of [-0.45, -0.15, 0.15, 0.45]) draw(MESH.meshes.box, j.fr, [x, 0, 1.72], [0.06, 1.25, 1.4], 0, dark);
        continue;
      }
      const s = SHAPES[j.shape];
      const tex = meshTexture(gl, MESH.textures, j.shape + '|' + j.lk, () => paintAtlas(j.shape, j.liv), 24);
      bound = null;
      draw(MESH.meshes[j.shape], j.fr, [0, 0, 0], [1, 1, 1], 1, null, tex);
      for (const wx of s.wheels) for (const sy of [1, -1]) {
        const y = sy * (s.W / 2 - WHEEL_W / 2 + 0.05);
        draw(MESH.meshes.wheel, j.fr, [wx, y, WHEEL_R], [WHEEL_R, WHEEL_W / 2, WHEEL_R], 0, tyre);
        draw(MESH.meshes.wheel, j.fr, [wx, y + sy * 0.02, WHEEL_R], [WHEEL_R * 0.56, WHEEL_W / 2, WHEEL_R * 0.56], 0, hub);
      }
      const top = s.z0 + s.H, podCol = hexRgba(j.liv.pod, 1);
      for (const [a, c, w, h] of s.pods) draw(MESH.meshes.box, j.fr, [(a + c) / 2, 0, top + h / 2 - 0.04], [(c - a) / 2, w / 2, h / 2 + 0.04], 0, podCol);
      if (s.front) {
        for (const sy of [1, -1]) {
          draw(MESH.meshes.box, j.fr, [s.x1 - 0.42, sy * (s.W / 2 + 0.2), s.z0 + 1.75], [0.07, 0.1, 0.22], 0, dark);
          draw(MESH.meshes.box, j.fr, [s.x1 - 0.5, sy * (s.W / 2 + 0.08), s.z0 + 1.95], [0.03, 0.14, 0.03], 0, dark);
        }
        if (j.sign) {
          const dd = s.bands.length > 1, zc = dd ? s.z0 + (s.bands[0][1] + s.bands[1][0]) / 2 : top - 0.42;
          const waist = s.z0 + 1.0, lean = s.rake * Math.min(1, Math.max(0, (zc - 0.18 - waist) / (top - waist)));
          const label = String(j.b.campus ? (j.b.label || j.b.svc) : j.b.label || '');
          const col = j.lk === 'ntu' ? '#8CFFC0' : j.lk === 'nus' ? '#FFD23F' : '#FF9A1F';
          const st = meshTexture(gl, MESH.signs, label + '|' + col, () => paintSign(label, col), 96);
          draw(MESH.meshes.sign, j.fr, [s.x1 - lean + 0.035, 0, zc], [1, 0.8, 0.2], 3, null, st);
        }
      }
    }
    for (let i = 1; i < 3; i++) gl.disableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  function meshLayer() {
    return {
      id: 'sb-bus-mesh', type: 'custom', renderingMode: '3d',
      render(gl, args) {
        if (!MESH.ok) return;
        try { meshRender(gl, args); } catch (e) {
          MESH.ok = false; MESH.list = [];
          console.error('3D bus meshes unavailable, using block models', e);
          M.dirty = true; startLoop();
        }
      },
      onRemove() { MESH.prog = null; MESH.textures.clear(); MESH.signs.clear(); MESH.meshes = {}; },
    };
  }

  function meshBusAt(pt) {
    if (!MESH.ok || !MESH.list.length) return null;
    let best = null, bestD = Math.max(16, BUS_PX * 0.5) ** 2;
    for (const b of MESH.list) {
      const p = M.map.project([b.cur.lng, b.cur.lat]), d = (p.x - pt.x) ** 2 + (p.y - 6 - pt.y) ** 2;
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  function drawBuses() {
    const map = M.map;
    if (!map || !M.ready || !map.getSource('sb-bus-parts')) return;
    const zoom = map.getZoom();
    const parts = [], pts = [], meshList = [];
    MESH.list = [];
    if (zoom >= BUS_MIN_ZOOM - 1) {
      const res = 78271.517 * Math.cos(toRad(map.getCenter().lat)) / Math.pow(2, zoom);
      const k = Math.min(40, Math.max(1.2, BUS_PX * res / 11));
      const detail = zoom >= 16, hi = zoom >= 18;
      const vb = map.getBounds(), pad = 0.004;
      const w = vb.getWest() - pad, e = vb.getEast() + pad, so = vb.getSouth() - pad, n = vb.getNorth() + pad;
      const useMesh = MESH.ok && !!map.getLayer('sb-bus-mesh');
      if (useMesh) { MESH.list = meshList; MESH.k = Math.min(40, Math.max(1, BUS_PX * res / 12)); }
      for (const b of M.buses.values()) {
        if (b.cur.lng < w || b.cur.lng > e || b.cur.lat < so || b.cur.lat > n) continue;
        if (useMesh) meshList.push(b); else busParts(b, k, parts, detail, hi);
        pts.push({ type: 'Feature', properties: { id: b.id, img: `sbl|${b.label}|${b.color}|${b.fg}`, sort: -b.cur.lat }, geometry: { type: 'Point', coordinates: [b.cur.lng, b.cur.lat] } });
      }
    }
    if (parts.length || M.partsShown) map.getSource('sb-bus-parts').setData({ type: 'FeatureCollection', features: parts });
    M.partsShown = parts.length > 0;
    map.triggerRepaint();
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
    const hit = meshBusAt(pt);
    if (hit) return openBus(hit.id);
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
      map.getCanvas().style.cursor = (map.queryRenderedFeatures(e.point, { layers }).length || meshBusAt(e.point)) ? 'pointer' : '';
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
    document.body.classList.toggle('m3d-tab', isMap);   // lets CSS drop the generic bottom padding on the map tab
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

  window.map3d = { onTab, openStop, openBus, closeSheet, locate: () => locate(true), toggleFull, viewRoute, _state: M, _mesh: MESH, _roads: { buildRoads, roadSnap, roadRoute } };
})();