// ── MRT INTERACTIVE SVG MAP ──
let _mrtOpen = false;
let _mrt = { zoom: 1, x: 0, y: 0 };
let _mrtDragged = false;

const MRT_PNG_COORDS = {
  'NS1': [17.762, 54.382], // Jurong East
  'NS2': [18.232, 48.279], // Bukit Batok
  'NS3': [18.075, 43.584], // Bukit Gombak
  'NS4': [17.71, 38.303], // Choa Chu Kang
  'NS5': [17.606, 32.942], // Yew Tee
  'NS7': [17.606, 27.778], // Kranji
  'NS8': [20.579, 22.144], // Marsiling
  'NS9': [27.465, 20.736], // Woodlands
  'NS10': [32.003, 20.736], // Admiralty
  'NS11': [36.072, 20.579], // Sembawang
  'NS12': [39.984, 20.579], // Canberra
  'NS13': [44.366, 21.831], // Yishun
  'NS14': [46.87, 24.804], // Khatib
  'NS15': [47.364, 27.924], // Yio Chu Kang
  'NS16': [46.87, 31.064], // Ang Mo Kio
  'NS17': [47.183, 34.507], // Bishan
  'NS18': [47.496, 36.854], // Braddell
  'NS19': [47.496, 39.671], // Toa Payoh
  'NS20': [45.931, 43.271], // Novena
  'NS21': [43.584, 45.775], // Newton
  'NS22': [40.297, 50.313], // Orchard
  'NS23': [42.645, 53.756], // Somerset
  'NS24': [47.694, 57.908], // Dhoby Ghaut
  'NS25': [53.599, 64.71], // City Hall
  'NS26': [53.46, 67.628], // Raffles Place
  'NS27': [53.599, 72.379], // Marina Bay
  'NS28': [56.919, 74.547], // Marina South Pier
  'EW1': [85.211, 34.507], // Pasir Ris
  'EW2': [85.211, 37.167], // Tampines
  'EW3': [85.211, 39.984], // Simei
  'EW4': [84.272, 41.862], // Tanah Merah
  'EW5': [78.013, 41.862], // Bedok
  'EW6': [74.413, 44.21], // Kembangan
  'EW7': [71.283, 47.027], // Eunos
  'EW8': [68.437, 50.305], // Paya Lebar
  'EW9': [64.896, 52.869], // Aljunied
  'EW10': [63.187, 54.823], // Kallang
  'EW11': [61.233, 57.265], // Lavender
  'EW12': [59.035, 59.585], // Bugis
  'EW13': [54.029, 64.713], // City Hall
  'EW14': [53.785, 67.766], // Raffles Place
  'EW15': [44.505, 69.109], // Tanjong Pagar
  'EW16': [41.575, 64.713], // Outram Park
  'EW17': [37.912, 62.637], // Tiong Bahru
  'EW18': [35.592, 60.44], // Redhill
  'EW19': [33.639, 58.242], // Queenstown
  'EW20': [31.441, 56.41], // Commonwealth
  'EW21': [28.51, 54.335], // Buona Vista
  'EW22': [25.458, 54.457], // Dover
  'EW23': [22.283, 54.335], // Clementi
  'EW24': [18.132, 54.335], // Jurong East
  'EW25': [14.225, 54.457], // Chinese Garden
  'EW26': [10.317, 54.579], // Lakeside
  'EW27': [7.753, 51.038], // Boon Lay
  'EW28': [7.998, 48.107], // Pioneer
  'EW29': [8.12, 46.032], // Joo Koon
  'EW30': [8.12, 42.857], // Gul Circle
  'EW31': [8.12, 40.415], // Tuas Crescent
  'EW32': [7.875, 37.607], // Tuas West Road
  'EW33': [7.998, 34.676], // Tuas Link
  'CG1': [89.316, 45.421], // Expo
  'CG2': [92.735, 45.299], // Changi Airport
  'NE1': [39.988, 72.772], // HarbourFront
  'NE3': [41.941, 64.591], // Outram Park
  'NE4': [44.628, 62.271], // Chinatown
  'NE5': [46.337, 60.562], // Clarke Quay
  'NE6': [48.657, 57.875], // Dhoby Ghaut
  'NE7': [50.855, 51.404], // Little India
  'NE8': [50.855, 48.352], // Farrer Park
  'NE9': [51.099, 45.665], // Boon Keng
  'NE10': [52.686, 42.613], // Potong Pasir
  'NE11': [55.25, 39.927], // Woodleigh
  'NE12': [58.059, 36.874], // Serangoon
  'NE13': [60.256, 34.432], // Kovan
  'NE14': [61.844, 32.601], // Hougang
  'NE15': [64.164, 30.525], // Buangkok
  'NE16': [66.361, 28.571], // Sengkang
  'NE17': [70.635, 24.054], // Punggol
  'NE18': [72.466, 22.344], // Punggol Coast
  'CC1': [46.825, 57.753], // Dhoby Ghaut
  'CC2': [53.785, 60.44], // Bras Basah
  'CC3': [58.181, 64.957], // Esplanade
  'CC4': [64.774, 66.3], // Promenade
  'CC5': [67.216, 63.004], // Nicoll Highway
  'CC6': [68.437, 60.195], // Stadium
  'CC7': [69.048, 57.021], // Mountbatten
  'CC8': [68.926, 54.09], // Dakota
  'CC9': [68.071, 50.427], // Paya Lebar
  'CC10': [66.728, 45.91], // MacPherson
  'CC11': [64.652, 42.369], // Tai Seng
  'CC12': [61.966, 39.805], // Bartley
  'CC13': [57.204, 36.874], // Serangoon
  'CC14': [53.175, 35.165], // Lorong Chuan
  'CC15': [46.947, 34.432], // Bishan
  'CC16': [42.308, 35.531], // Marymount
  'CC17': [38.4, 37.729], // Caldecott
  'CC19': [32.784, 42.735], // Botanic Gardens
  'CC20': [30.342, 46.642], // Farrer Road
  'CC21': [28.388, 50.061], // Holland Village
  'CC22': [29.121, 54.335], // Buona Vista
  'CC23': [28.51, 57.143], // one-north
  'CC24': [28.999, 60.073], // Kent Ridge
  'CC25': [30.098, 63.248], // Haw Par Villa
  'CC26': [31.685, 65.568], // Pasir Panjang
  'CC27': [33.516, 67.888], // Labrador Park
  'CC28': [35.592, 70.208], // Telok Blangah
  'CC29': [39.255, 72.527], // HarbourFront
  'CC30': [44.379, 73.817], // Keppel
  'CC31': [47.781, 74.112], // Cantonment
  'CC32': [51.331, 73.817], // Prince Edward Road
  'CE1': [60.745, 70.085], // Bayfront
  'CE2': [54.884, 72.283], // Marina Bay
  'DT1': [25.214, 30.525], // Bukit Panjang
  'DT2': [25.214, 32.967], // Cashew
  'DT3': [25.214, 34.31], // Hillview
  'DT4': [25.214, 36.142], // Hume
  'DT5': [25.214, 37.363], // Beauty World
  'DT6': [25.336, 38.95], // King Albert Park
  'DT7': [25.336, 40.781], // Sixth Avenue
  'DT8': [27.9, 42.735], // Tan Kah Kee
  'DT9': [32.173, 42.857], // Botanic Gardens
  'DT10': [38.523, 42.857], // Stevens
  'DT11': [44.628, 45.91], // Newton
  'DT12': [49.512, 51.526], // Little India
  'DT13': [53.419, 54.457], // Rochor
  'DT14': [58.181, 59.707], // Bugis
  'DT15': [63.431, 66.422], // Promenade
  'DT16': [59.646, 69.841], // Bayfront
  'DT17': [56.471, 70.818], // Downtown
  'DT18': [50.733, 67.643], // Telok Ayer
  'DT19': [45.36, 62.027], // Chinatown
  'DT20': [44.261, 58.852], // Fort Canning
  'DT21': [55.128, 57.875], // Bencoolen
  'DT22': [57.57, 55.556], // Jalan Besar
  'DT23': [59.524, 52.625], // Bendemeer
  'DT24': [61.844, 50.305], // Geylang Bahru
  'DT25': [64.53, 47.985], // Mattar
  'DT26': [65.873, 45.788], // MacPherson
  'DT27': [68.926, 43.712], // Ubi
  'DT28': [71.49, 41.026], // Kaki Bukit
  'DT29': [72.955, 38.95], // Bedok North
  'DT30': [77.839, 37.973], // Bedok Reservoir
  'DT31': [81.868, 38.217], // Tampines West
  'DT32': [86.508, 37.973], // Tampines
  'DT33': [89.194, 40.171], // Tampines East
  'DT34': [90.049, 42.125], // Upper Changi
  'DT35': [89.805, 45.177], // Expo
  'TE1': [24.603, 18.071], // Woodlands North
  'TE2': [27.9, 21.001], // Woodlands
  'TE3': [29.853, 22.833], // Woodlands South
  'TE4': [31.441, 24.664], // Springleaf
  'TE5': [33.394, 26.74], // Lentor
  'TE6': [35.592, 28.571], // Mayflower
  'TE7': [37.302, 30.891], // Bright Hill
  'TE8': [38.156, 34.31], // Upper Thomson
  'TE9': [39.133, 37.729], // Caldecott
  'TE11': [39.011, 43.101], // Stevens
  'TE12': [38.889, 45.788], // Napier
  'TE13': [38.4, 48.352], // Orchard Boulevard
  'TE14': [39.011, 50.549], // Orchard
  'TE15': [38.645, 53.48], // Great World
  'TE16': [38.767, 56.41], // Havelock
  'TE17': [43.162, 64.957], // Outram Park
  'TE18': [45.849, 66.667], // Maxwell
  'TE19': [50.366, 71.306], // Shenton Way
  'TE20': [55.739, 72.283], // Marina Bay
  'TE22': [67.338, 69.841], // Gardens by the Bay
  'TE23': [72.589, 65.079], // Tanjong Rhu
  'TE24': [74.664, 63.004], // Katong Park
  'TE25': [76.374, 61.416], // Tanjong Katong
  'TE26': [78.327, 59.585], // Marine Parade
  'TE27': [80.159, 57.631], // Marine Terrace
  'TE28': [81.38, 55.8], // Siglap
  'TE29': [83.455, 53.968], // Bayshore
  'BP1': [19.109, 38.706], // Choa Chu Kang
  'BP2': [19.475, 36.386], // South View
  'BP3': [19.231, 34.432], // Keat Hong
  'BP4': [19.231, 32.112], // Teck Whye
  'BP5': [21.306, 29.792], // Phoenix
  'BP6': [24.481, 29.915], // Bukit Panjang
  'BP7': [25.58, 27.473], // Petir
  'BP8': [26.068, 26.129], // Pending
  'BP9': [26.19, 24.542], // Bangkit
  'BP10': [24.603, 22.833], // Fajar
  'BP11': [22.772, 24.542], // Segar
  'BP12': [22.894, 26.007], // Jelapang
  'BP13': [22.894, 27.473], // Senja
  'STC': [65.385, 28.571], // Sengkang
  'SE1': [70.024, 30.769], // Compassvale
  'SE2': [71.245, 31.99], // Rumbia
  'SE3': [71.734, 33.822], // Bakau
  'SE4': [69.292, 33.822], // Kangkar
  'SE5': [67.46, 32.479], // Ranggung
  'SW1': [64.408, 25.153], // Cheng Lim
  'SW2': [63.797, 24.298], // Farmway
  'SW3': [62.576, 22.955], // Kupang
  'SW4': [61.111, 22.833], // Thanggam
  'SW5': [59.89, 23.932], // Fernvale
  'SW6': [60.379, 25.031], // Layar
  'SW7': [61.355, 26.007], // Tongkang
  'SW8': [62.576, 27.106], // Renjong
  'PTC': [71.612, 23.81], // Punggol
  'PE1': [72.344, 26.374], // Cove
  'PE2': [73.321, 27.839], // Meridian
  'PE3': [74.42, 29.06], // Coral Edge
  'PE4': [76.618, 29.06], // Riviera
  'PE5': [77.106, 27.717], // Kadaloor
  'PE6': [75.763, 26.374], // Oasis
  'PE7': [74.298, 24.908], // Damai
  'PW1': [69.658, 20.147], // Sam Kee
  'PW3': [67.582, 18.315], // Punggol Point
  'PW4': [65.507, 18.193], // Samudera
  'PW5': [65.14, 19.78], // Nibong
  'PW6': [66.117, 20.879], // Sumang
  'PW7': [67.216, 21.856], // Soo Teck
};

// Stations that share the same physical location (deduplicate hotspots)
const MRT_PNG_DEDUPE = {
  'EW24': 'NS1', 'TE2': 'NS9', 'CC15': 'NS17',
  'DT11': 'NS21', 'TE11': 'NS21', 'TE14': 'NS22',
  'NE6': 'NS24', 'CC1': 'NS24',
  'EW13': 'NS25', 'EW14': 'NS26', 'CE2': 'NS27', 'TE20': 'NS27',
  'DT35': 'CG1', 'EW8': 'CC9', 'DT26': 'CC10',
  'EW12': 'DT14', 'DT15': 'CC4',
  'NE3': 'EW16', 'TE17': 'EW16',
  'CC22': 'EW21', 'NE1': 'CC29',
  'NE4': 'DT19', 'NE7': 'DT12',
  'NE12': 'CC13', 'CC17': 'TE9',
  'CC19': 'DT9', 'CE1': 'DT16',
  'DT10': 'TE11',
  'DT32': 'EW2',
  'BP1': 'NS4', 'BP6': 'DT1',
  'STC': 'NE16', 'PTC': 'NE17',
};

function _buildMrtHotspots() {
  const container = document.getElementById('mrt-hotspots');
  if (!container || container.dataset.built) return;
  container.dataset.built = '1';
  container.style.pointerEvents = 'auto';

  // Build name lookup
  const nameMap = {};
  if (typeof MRT_CODE_LOOKUP !== 'undefined') {
    Object.entries(MRT_CODE_LOOKUP).forEach(([code, info]) => { nameMap[code] = info.name; });
  }

  // Group codes by canonical station (for tooltip showing all codes)
  const placed = new Set();

  Object.entries(MRT_PNG_COORDS).forEach(([code, [px, py]]) => {
    // Skip if this is a duplicate location
    if (MRT_PNG_DEDUPE[code]) return;
    if (placed.has(code)) return;
    placed.add(code);

    const name = nameMap[code] || code;

    const btn = document.createElement('button');
    btn.style.cssText = `
      position:absolute;
      left:${px}%;
      top:${py}%;
      transform:translate(-50%,-50%);
      width:22px;
      height:22px;
      border-radius:50%;
      background:transparent;
      border:none;
      cursor:pointer;
      padding:0;
      -webkit-tap-highlight-color:rgba(0,0,0,0);
      z-index:10;
    `;
    btn.title = name;
    btn.setAttribute('aria-label', name);
    btn.setAttribute('data-stn', code);

    // Invisible but shows ripple on tap
    btn.addEventListener('click', (e) => {
      if (_mrtDragged) return;
      _mrtStationTap(name);
    });

    // Visual feedback: brief highlight ring on hover/touch
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,255,255,0.18)';
      btn.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.boxShadow = 'none';
    });

    container.appendChild(btn);
  });
}

// ── SHARED MRT NAME NORMALISATION ──
// Single source of truth — used by mrtPills, alertsForStopName, mrtPillsForName, _mrtNormalizeKey
function _expandMrtAbbreviations(core) {
  return core
    .replace(/\blor\b/g, 'lorong')
    .replace(/\bave\b/g, 'avenue')
    .replace(/\bpk\b/g, 'park')
    .replace(/\brd\b/g, 'road')
    .replace(/\bst\b/g, 'street')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\bblvd\b/g, 'boulevard')
    .replace(/\bcres\b/g, 'crescent')
    .replace(/\bresvr\b/g, 'reservoir')
    .replace(/\bctrl\b/g, 'central')
    .replace(/\bpl\b/g, 'place')
    .replace(/\bbt\b/g, 'bukit')
    .replace(/\bgdns\b/g, 'gardens')
    .replace(/\bgdn\b/g, 'garden')
    .replace(/\bupp\b/g, 'upper')
    .replace(/\bs'goon\b/g, 'serangoon')
    .replace(/\btg\b/g, 'tanjong')
    .replace(/\bjln\b/g, 'jalan')
    .replace(/\bsth\b/g, 'south')
    .replace(/\bnth\b/g, 'north')
    .replace(/\bpde\b/g, 'parade')
    .replace(/\bpt\b/g, 'point')
    .replace(/\bterr\b/g, 'terrace')
    .replace(/\bc'wealth\b/g, 'commonwealth')
    .replace(/\bw'lands\b/g, 'woodlands')
    .replace(/\blk\b/g, 'link')
    .replace(/\bholland v\b/g, 'holland village');
}

// Strip directional/positional prefixes and station-type suffixes, then expand abbreviations.
// Pass stripSuffixes=true (default) for MRT lookup; false to keep just abbreviation expansion.
// Strips positional prefixes (Opp, Bef, Aft, Blk) and bus-stop suffixes
// (Stn/Ctrl/Int/Ter/Ctr) from a stop name to extract the core MRT station
// name. Used to match bus stops to their adjacent MRT stations so we can
// render the coloured line pills. e.g. "Opp Tampines MRT Stn" → "Tampines".
function normalizeMrtStopName(name, stripSuffixes = true) {
  let core = name;
  if (stripSuffixes) {
    core = core
      .replace(/^(Bef|Aft|Opp|Fr)\s+/i, '')
      .replace(/^(Lot|Blk)\s+[\w]+\s*\/\s*/i, '')
      .replace(/\/.*$/i, '')
      .replace(/\s+Lrt\b.*/i, '')
      .replace(/\s+Stn\b.*/i, '')
      .replace(/\s+Exit\s+\w+/i, '')
      .replace(/\s+Ctrl\b.*/i, '')
      .replace(/\s+Int\b.*/i, '')
      .trim();
  }
  return _expandMrtAbbreviations(core.toLowerCase().trim());
}

function _mrtNormalizeKey(name) {
  return normalizeMrtStopName(name, false);
}

function _mrtStationTap(name) {
  closeMrtMap();
  switchTab('stop');

  const key = _mrtNormalizeKey(name);
  const input = document.getElementById('stopInput');

  // Try to find bus stops whose description normalizes to this MRT station key
  if (ALL_STOPS) {
    const matches = ALL_STOPS.filter(s => normalizeMrtStopName(s.Description) === key);

    if (matches.length > 0) {
      unifiedMatches = matches;
      unifiedHighlight = -1;
      if (input) input.value = name;
      document.getElementById('quickChips').style.display = 'none';
      document.getElementById('nearbySection').style.display = 'none';
      const box = document.getElementById('unifiedResults');
      if (box) {
        box.className = 'stop-name-results open';
        renderUnifiedResults();
      }
      if (input) input.focus();
      return;
    }
  }

  // Fallback: no stops loaded yet or no match — search by name
  if (input) {
    input.value = name;
    onUnifiedInput();
    input.focus();
  }
}

function toggleMrtMap() { _mrtOpen ? closeMrtMap() : openMrtMap(); }

function openMrtMap() {
  _mrtOpen = true;
  document.getElementById('mrt-map-panel').style.maxHeight = '9999px';
  document.getElementById('mrt-map-btn').style.borderColor = 'var(--cyan)';
  document.getElementById('mrt-map-btn').style.color = 'var(--cyan)';
  _mrt = { zoom: 1, x: 0, y: 0 };
  setTimeout(() => { _buildMrtHotspots(); _mrtApply(); }, 50);
}

function closeMrtMap() {
  _mrtOpen = false;
  document.getElementById('mrt-map-panel').style.maxHeight = '0';
  document.getElementById('mrt-map-btn').style.borderColor = '';
  document.getElementById('mrt-map-btn').style.color = '';
}

function _mrtApply() {
  const inner = document.getElementById('mrt-map-inner');
  const wrap = document.getElementById('mrt-map-zoom-wrap');
  if (!inner || !wrap) return;
  const ww = wrap.clientWidth, wh = wrap.clientHeight;
  const maxX = Math.max(0, (ww * _mrt.zoom - ww) / 2);
  const maxY = Math.max(0, (wh * _mrt.zoom - wh) / 2);
  _mrt.x = Math.max(-maxX, Math.min(maxX, _mrt.x));
  _mrt.y = Math.max(-maxY, Math.min(maxY, _mrt.y));
  inner.style.transformOrigin = 'center center';
  inner.style.transform = `scale(${_mrt.zoom}) translate(${_mrt.x / _mrt.zoom}px, ${_mrt.y / _mrt.zoom}px)`;
}

(function () {
  function init() {
    const wrap = document.getElementById('mrt-map-zoom-wrap');
    if (!wrap) return;

    let lastDist = 0;
    let dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
    let isDragging = false;
    let dragMoved = false;

    function getTouchDist(e) {
      const t = e.touches;
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    wrap.addEventListener('touchstart', e => {
      _mrtDragged = false;
      dragMoved = false;
      if (e.touches.length === 2) {
        lastDist = getTouchDist(e);
        isDragging = false;
      } else if (e.touches.length === 1) {
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        panStartX = _mrt.x; panStartY = _mrt.y;
        isDragging = true;
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        _mrtDragged = true;
        const dist = getTouchDist(e);
        if (lastDist > 0) _mrt.zoom = Math.max(1, Math.min(8, _mrt.zoom * dist / lastDist));
        lastDist = dist;
        _mrtApply();
      } else if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - dragStartX;
        const dy = e.touches[0].clientY - dragStartY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          _mrtDragged = true;
          if (_mrt.zoom > 1) {
            e.preventDefault();
            _mrt.x = panStartX + dx;
            _mrt.y = panStartY + dy;
            _mrtApply();
          }
        }
      }
    }, { passive: false });

    wrap.addEventListener('touchend', e => {
      if (e.touches.length < 2) lastDist = 0;
      if (e.touches.length === 0) isDragging = false;
      setTimeout(() => { _mrtDragged = false; }, 100);
    }, { passive: true });

    let mouseDown = false, mouseSX = 0, mouseSY = 0, mousePX = 0, mousePY = 0;
    wrap.addEventListener('mousedown', e => {
      mouseDown = true; _mrtDragged = false;
      mouseSX = e.clientX; mouseSY = e.clientY;
      mousePX = _mrt.x; mousePY = _mrt.y;
      wrap.style.cursor = 'grabbing';
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      const dx = e.clientX - mouseSX, dy = e.clientY - mouseSY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _mrtDragged = true;
      _mrt.x = mousePX + dx; _mrt.y = mousePY + dy;
      _mrtApply();
    });
    window.addEventListener('mouseup', () => {
      mouseDown = false;
      wrap.style.cursor = 'grab';
      setTimeout(() => { _mrtDragged = false; }, 50);
    });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      _mrt.zoom = Math.max(1, Math.min(8, _mrt.zoom * (e.deltaY < 0 ? 1.12 : 0.88)));
      _mrtApply();
    }, { passive: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// ── STATE ──
const PROXY_URL = 'https://lta-proxy-worker.shiokbus.workers.dev';
// App Check removed — CORS origin check in worker is sufficient protection
async function getProxyHeaders() {
  return {};
}
let SUN_AZ = 180, SUN_ALT = 45;
let ALL_STOPS = null;
let ALL_SERVICES = null; // cache of BusServices keyed by "ServiceNo-Direction"
let PRIVATE_SERVICES = null;
let PRIVATE_STOP_INDEX = {}; // BusStopCode → [stopEntry, ...]
let userLat = null, userLng = null;

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  // Clear caches on first load of a new tab, but not on refresh
  if (!sessionStorage.getItem('shiokbus_session_started')) {
    sessionStorage.setItem('shiokbus_session_started', '1');
    localStorage.removeItem('shiokbus_services');
    localStorage.removeItem('shiokbus_stops');
  }

  // Restore cached stops from localStorage
  const cachedSvcs = localStorage.getItem('shiokbus_services');
  if (cachedSvcs) { try { ALL_SERVICES = indexServices(JSON.parse(cachedSvcs)); } catch(e) {} }
  try {
    const cached = localStorage.getItem('shiokbus_stops');
    if (cached) ALL_STOPS = JSON.parse(cached);
  } catch(e) {}
  // Preload services silently for instant dropdown, then populate the browse list
  if (ALL_SERVICES) renderServiceBrowseList();
  const svcPreload = ALL_SERVICES ? Promise.resolve(ALL_SERVICES) : fetchAllServices().catch(() => {});
  const stopsPreload = ALL_STOPS ? Promise.resolve(ALL_STOPS) : fetchAllStops().catch(() => {});
  Promise.resolve(svcPreload).then(() => renderServiceBrowseList());
  Promise.resolve(stopsPreload).then(() => renderServiceBrowseList());
  fetchPBSServices().then(() => renderServiceBrowseList()).catch(() => {});
  loadMrtData().then(() => {
    startTrainAlertPolling();
    // Re-render stop title pills if a stop is currently displayed
    const titleEl = document.querySelector('[id^="stop-title-"]');
    if (titleEl) {
      const code = titleEl.id.replace('stop-title-', '');
      const stopInfo = ALL_STOPS?.find(s => s.BusStopCode === code);
      const name = stopInfo?.Description || '';
      if (name) {
        titleEl.innerHTML = stopLabel(name, true);
        // Inject warning button after title if disrupted
        const alerts = alertsForStopName(name);
        if (alerts.length) {
          const existing = titleEl.parentNode.querySelector('.train-warn-btn');
          if (!existing) {
            const btn = document.createElement('button');
            btn.className = 'train-warn-btn';
            btn.onclick = openTrainAlertModal;
            btn.title = `Train disruption on ${alerts.map(a => a.Line).join(', ')}`;
            btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:20px;padding:0;line-height:1;flex-shrink:0';
            btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            titleEl.insertAdjacentElement('afterend', btn);
          }
        }
      }
    }
    // Re-render route stop names with MRT pills if route is displayed
    document.querySelectorAll('[data-stop-name]').forEach(el => {
      const name = el.getAttribute('data-stop-name');
      if (name) el.innerHTML = stopLabel(name, true);
    });
    // Inject warning buttons into route stop rows for disrupted MRT lines
    if (TRAIN_ALERTS.length) {
      document.querySelectorAll('[data-stop-name]').forEach(el => {
        const name = el.getAttribute('data-stop-name');
        const as = alertsForStopName(name);
        if (!as.length) return;
        const row = el.closest('.route-stop-card');
        if (!row || row.querySelector('.route-warn-btn')) return;
        const favBtn = row.querySelector('.fav-btn');
        if (!favBtn) return;
        const btn = document.createElement('button');
        btn.className = 'route-warn-btn';
        btn.onclick = e => { e.stopPropagation(); openTrainAlertModal(); };
        btn.title = `Train disruption on ${as.map(a => a.Line).join(', ')}`;
        btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;padding:0;line-height:1;flex-shrink:0';
        btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        favBtn.insertAdjacentElement('beforebegin', btn);
      });
    }
    // Re-render nearby stop names
    document.querySelectorAll('[data-nearby-name]').forEach(el => {
      const name = el.getAttribute('data-nearby-name');
      if (name) el.innerHTML = stopLabel(name);
    });
  }).catch(() => {});

  let defaultTab = localStorage.getItem('shiokbus_default_tab') || 'service';
  if (!['service', 'stop', 'plan', 'favs'].includes(defaultTab)) defaultTab = 'service';
  renderSettingsAlerts();
  switchTab(defaultTab);
  fetchRainForecast();
  setInterval(fetchRainForecast, 5 * 60 * 1000);
  calcSun(); setInterval(calcSun, 60000);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(window._sunInterval);
  } else {
    window._sunInterval = setInterval(calcSun, 60000);
  }
});

// ── SUN POSITION ──
// getSunAtTime: returns {az, alt} for a given Date at Singapore coords.
// Replace this function body with an API call when ready.
// Computes the sun's azimuth (compass bearing, 0–360°) and altitude (degrees above
// horizon) for Singapore at a given moment. Uses the standard solar position
// equations — day-of-year for declination, hour angle for local solar time.
// Singapore's longitude (103.82°E) shifts UTC by ~6.9 hours, not the standard +8,
// so we use the fractional offset rather than assuming the timezone exactly.
// Returns { az, alt } — az=180 means sun is due south, alt<3 means it's effectively
// below the horizon (pre-dawn / post-dusk) and seat recommendations are suppressed.
function getSunAtTime(date) {
  const LAT = 1.3521 * Math.PI / 180, LNG = 103.8198;
  const doy = Math.floor((date - new Date(date.getFullYear(),0,0)) / 86400000);
  const decl = 23.45 * Math.PI/180 * Math.sin(2*Math.PI*(284+doy)/365);
  const utcH = date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600;
  const lst = utcH + (LNG-120)/15 + 8;
  const ha = (lst-12)*15*Math.PI/180;
  const sinAlt = Math.sin(LAT)*Math.sin(decl) + Math.cos(LAT)*Math.cos(decl)*Math.cos(ha);
  const alt = Math.asin(Math.max(-1,Math.min(1,sinAlt))) * 180/Math.PI;
  const cosAz = (Math.sin(decl)-Math.sin(LAT)*sinAlt) / (Math.cos(LAT)*Math.cos(Math.asin(sinAlt)));
  let az = Math.acos(Math.max(-1,Math.min(1,cosAz))) * 180/Math.PI;
  if (Math.sin(ha)>0) az = 360-az;
  return { az: isNaN(az) ? 180 : az, alt };
}

function calcSun() {
  const { az, alt } = getSunAtTime(new Date());
  SUN_AZ = az; SUN_ALT = alt;
}

function card(az) { return ['N','NE','E','SE','S','SW','W','NW'][Math.round(az/45)%8]; }

// ── SEARCH MODE ──
let currentTab = 'service';
let lastStopCode = null; // tracks the actual stop code regardless of input display text
const HISTORY_KEY_SERVICES  = 'shiokbus_history_services';
const HISTORY_KEY_STOPS     = 'shiokbus_history_stops';
const HISTORY_STORE_MAX     = 10; // max items kept in localStorage per type
const HISTORY_DISPLAY_MAX   = 5;  // max items shown in dropdown
const _LEGACY_HISTORY_KEY   = 'shiokbus_commute_history';

// One-time migration: move legacy unified history into separate stores
(function _migrateHistory() {
  try {
    const raw = localStorage.getItem(_LEGACY_HISTORY_KEY);
    if (!raw) return;
    const old = JSON.parse(raw);
    if (!Array.isArray(old) || !old.length) { localStorage.removeItem(_LEGACY_HISTORY_KEY); return; }
    const svcs  = old.filter(h => h.type === 'service').slice(0, HISTORY_STORE_MAX);
    const stops = old.filter(h => h.type === 'stop').slice(0, HISTORY_STORE_MAX);
    if (svcs.length)  localStorage.setItem(HISTORY_KEY_SERVICES, JSON.stringify(svcs));
    if (stops.length) localStorage.setItem(HISTORY_KEY_STOPS,    JSON.stringify(stops));
    localStorage.removeItem(_LEGACY_HISTORY_KEY);
  } catch(e) {}
})();

function _loadHistory(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    return [];
  }
}

function _saveHistory(key, items) {
  // Enforce storage cap and purge excess
  const capped = items.slice(0, HISTORY_STORE_MAX);
  try { localStorage.setItem(key, JSON.stringify(capped)); } catch(e) {}
}

function _historyKey(item) {
  return item?.type === 'service' ? HISTORY_KEY_SERVICES : HISTORY_KEY_STOPS;
}

function loadCommuteHistory() {
  // Returns combined history (services then stops) for backwards-compat callers
  return [
    ..._loadHistory(HISTORY_KEY_SERVICES),
    ..._loadHistory(HISTORY_KEY_STOPS)
  ];
}

function addCommuteHistory(item) {
  if (!item?.type || !item?.key) return;
  const key = _historyKey(item);
  const current = _loadHistory(key);
  // Deduplicate by item key, newest first, then cap at HISTORY_STORE_MAX
  const next = [
    { ...item, ts: Date.now() },
    ...current.filter(h => h.key !== item.key)
  ].slice(0, HISTORY_STORE_MAX);
  _saveHistory(key, next);
}

function removeCommuteHistory(itemKey) {
  // Remove from whichever store contains the key
  [HISTORY_KEY_SERVICES, HISTORY_KEY_STOPS].forEach(storeKey => {
    const items = _loadHistory(storeKey);
    const filtered = items.filter(h => h.key !== itemKey);
    if (filtered.length !== items.length) _saveHistory(storeKey, filtered);
  });
}

function serviceHistorySub(svc) {
  const svcNorm = normalizeServiceNo(svc);
  const info1 = ALL_SERVICES?.[svcNorm + '-1'] || null;
  const info2 = ALL_SERVICES?.[svcNorm + '-2'] || null;
  if (!info1) return '';
  const orig = info1.OriginCode ? (stopName(info1.OriginCode) || info1.OriginCode) : '';
  const dest = info1.DestinationCode ? (stopName(info1.DestinationCode) || info1.DestinationCode) : '';
  const isLoop = info1 && !info2 && (info1.OriginCode === info1.DestinationCode || !!info1.LoopDesc);
  const isBidi = !!info2;
  const isDualLoop = (svc in DUAL_LOOP_SVCS) || (isBidi && info1 && info2
    && info1.OriginCode && info1.OriginCode === info1.DestinationCode
    && info2.OriginCode && info2.OriginCode === info2.DestinationCode
    && info1.OriginCode === info2.OriginCode);
  const midpoint = LOOP_SVC_MIDPOINTS[svc];
  const loopDesc = midpoint
    ? (/int|stn|hub|ter|ctr|zoo|wetland reserve/i.test(midpoint.Description) ? midpoint.Description : midpoint.RoadName)
    : (info1?.LoopDesc || '');
  const isPrivate = !!(info1?._isPrivate || info2?._isPrivate);
  if (isPrivate) {
    const origDesc = info1?.OriginDesc || orig;
    const destDesc = info1?.DestinationDesc || dest;
    return isBidi ? `${origDesc} ↔ ${destDesc}` : `${origDesc} → ${destDesc}`;
  }
  if (!orig) return '';
  if (isDualLoop) {
    const dualData = DUAL_LOOP_SVCS[svc] || {};
    const loop1 = dualData.dir1 || info1.LoopDesc || '';
    const loop2 = dualData.dir2 || info2?.LoopDesc || '';
    const loops = [loop1, loop2].filter(Boolean).join(' / ');
    return loops ? `${orig} ↻ via ${loops}` : `${orig} ↻`;
  }
  if (isBidi) return `${orig} ↔ ${dest}`;
  if (isLoop) return loopDesc ? `${orig} ↻ via ${loopDesc}` : `${orig} ↻`;
  return `${orig} → ${dest}`;
}

function rememberStopHistory(code) {
  const stop = ALL_STOPS?.find(s => s.BusStopCode === code);
  addCommuteHistory({
    type: 'stop',
    key: 'stop_' + code,
    id: code,
    name: stop?.Description || 'Bus Stop ' + code,
    sub: [stop?.RoadName].filter(Boolean).join(' · ')
  });
}

function rememberServiceHistory(svc) {
  addCommuteHistory({
    type: 'service',
    key: 'svc_' + svc,
    id: svc,
    name: 'Service ' + formatSvcNo(svc),
    sub: serviceHistorySub(svc)
  });
}

function recentHistory(type) {
  const key = type === 'service' ? HISTORY_KEY_SERVICES : HISTORY_KEY_STOPS;
  return _loadHistory(key).slice(0, HISTORY_DISPLAY_MAX);
}

function showRecentServices() {
  const input = document.getElementById('serviceInput');
  const dd = document.getElementById('svc-dropdown');
  if (!input || !dd || input.value.trim()) return;
  const recent = recentHistory('service');
  if (!recent.length) { dd.className = 'stop-name-results'; return; }
  dd.innerHTML = `<div class="recent-drop-header">Recently searched</div>` + recent.map(h => {
    const opCls = ALL_SERVICES ? buildServiceRowInner(h.id).opCls : '';
    return `
    <div class="svc-drop-item recent-drop-item" style="display:flex;align-items:center" onclick="selectService('${String(h.id).replace(/'/g, "\\'")}')">
      <span class="svc-drop-num ${opCls}">${formatSvcNo(h.id)}</span>
      <span class="svc-drop-cat" style="flex:1">${escapeHtml(h.sub || serviceHistorySub(h.id) || 'Service ' + formatSvcNo(h.id))}</span>
      <button class="recent-remove-btn" onclick="event.stopPropagation();removeCommuteHistory('${String(h.key).replace(/'/g, "\\'")}');showRecentServices()" title="Remove"><i class="fa-solid fa-xmark"></i></button>
    </div>`
    }).join('');
  dd.className = 'stop-name-results open';
}

function showRecentStops() {
  const input = document.getElementById('stopInput');
  const box = document.getElementById('unifiedResults');
  if (!input || !box || input.value.trim()) return;
  const recent = recentHistory('stop');
  if (!recent.length) { closeUnified(); return; }
  box.className = 'stop-name-results open';
  box.innerHTML = `<div class="recent-drop-header">Recently searched</div>` + recent.map(h => `
  <div class="sn-item recent-drop-item" style="display:flex;align-items:center" onclick="selectRecentStop('${String(h.id).replace(/'/g, "\\'")}','${String(h.name || '').replace(/'/g, "\\'")}')">
    <div class="sn-code">${escapeHtml(h.id || '')}</div>
    <div class="sn-info" style="flex:1">
      <div class="sn-name">${escapeHtml(h.name || 'Bus Stop ' + h.id)}</div>
      ${h.sub ? `<div class="sn-road">${escapeHtml(h.sub)}</div>` : ''}
    </div>
    <button class="recent-remove-btn" onclick="event.stopPropagation();removeCommuteHistory('${String(h.key).replace(/'/g, "\\'")}');showRecentStops()" title="Remove"><i class="fa-solid fa-xmark"></i></button>
  </div>`).join('');
}

function selectRecentStop(code, name) {
  const input = document.getElementById('stopInput');
  if (input) input.value = name || code;
  lastStopCode = code;
  closeUnified();
  document.getElementById('quickChips').style.display = 'none';
  document.getElementById('nearbySection').style.display = 'none';
  doSearch();
}

function switchTab(tab) {
  currentTab = tab;
  ['stop','service','plan'].forEach(t => {
    const mode = document.getElementById('mode-'+t);
    const tabBtn = document.getElementById('tab-'+t);
    if (mode) mode.style.display = t===tab ? 'block' : 'none';
    if (tabBtn) tabBtn.classList.toggle('active', t===tab);
  });
  if (tab === 'service' && ALL_SERVICES) {
    const browseList = document.getElementById('svc-browse-list');
    if (browseList && !browseList.children.length) renderServiceBrowseList();
  }
  const resultsService = document.getElementById('results-service');
  const resultsStop = document.getElementById('results-stop');
  if (resultsService) resultsService.style.display = tab==='service' ? 'block' : 'none';
  if (resultsStop) resultsStop.style.display = tab==='stop' ? 'block' : 'none';
  if (tab === 'service') {
    setServiceBrowseVisible(!resultsService || !resultsService.innerHTML.trim());
  }
  updateTrainAlertBanner();
  const favMode = document.getElementById('mode-favs');
  const favTab = document.getElementById('tab-favs');
  if (favMode) favMode.style.display = tab==='favs' ? 'block' : 'none';
  if (favTab) favTab.classList.toggle('active', tab==='favs');
  closeUnified();
}

// ── STOP CODE SEARCH ──
function quickLoad(code) { switchTab('stop'); document.getElementById('stopInput').value = code; lastStopCode = code; document.getElementById('nearbySection').style.display = 'none'; closeUnified(); doSearch(); }

// Builds the inner markup (badge + route description) for a single service row.
// Shared by the live search dropdown and the persistent "All Services" browse list.
function buildServiceRowInner(svc) {
  const info1 = ALL_SERVICES[svc + '-1'] || null;
  const info2 = ALL_SERVICES[svc + '-2'] || null;
  const op = (info1?.Operator || info2?.Operator || '').toUpperCase();
  const opCls = opClass(op, !!(info1?._isPrivate||info2?._isPrivate));
  const orig = info1?.OriginCode ? (stopName(info1.OriginCode) || info1.OriginCode) : '';
  const dest = info1?.DestinationCode ? (stopName(info1.DestinationCode) || info1.DestinationCode) : '';
  const isLoop = info1 && !info2 && (info1.OriginCode === info1.DestinationCode || !!info1.LoopDesc);
  const isBidi = !!info2;
  // Dual-loop: two directions both starting and ending at the same terminal
  // Prefer build-time set; fall back to runtime detection
  const isDualLoop = (svc in DUAL_LOOP_SVCS) || (isBidi && info1 && info2
    && info1.OriginCode && info1.OriginCode === info1.DestinationCode
    && info2.OriginCode && info2.OriginCode === info2.DestinationCode
    && info1.OriginCode === info2.OriginCode);
  const midpoint = LOOP_SVC_MIDPOINTS[svc];
  const loopDesc = midpoint ? (/int|stn|hub|ter|ctr|zoo|wetland reserve/i.test(midpoint.Description) ? midpoint.Description : midpoint.RoadName)
: (info1?.LoopDesc || '');
  const isPrivate = !!(info1?._isPrivate || info2?._isPrivate);
  let route = '';
  if (isPrivate) {
    const origDesc = info1?.OriginDesc || orig;
    const destDesc = info1?.DestinationDesc || dest;
    route = isBidi ? `${origDesc} ↔ ${destDesc}` : `${origDesc} → ${destDesc}`;
  } else if (orig) {
    if (isDualLoop) {
      const dualData = DUAL_LOOP_SVCS[svc] || {};
      const loop1 = dualData.dir1 || info1.LoopDesc || '';
      const loop2 = dualData.dir2 || info2?.LoopDesc || '';
      const loops = [loop1, loop2].filter(Boolean).join(' / ');
      route = loops ? `${orig} ↻ via ${loops}` : `${orig} ↻`;
    } else if (isBidi) route = `${orig} ↔ ${dest}`;
    else if (isLoop) route = loopDesc ? `${orig} ↻ via ${loopDesc}` : `${orig} ↻`;
    else route = `${orig} → ${dest}`;
  }
  const pbsBadge = isPrivate ? `<span style="font-size:9px;background:#1A2C5B20;color:#1A2C5B;border:1px solid #1A2C5B40;border-radius:4px;padding:1px 4px;margin-left:4px;font-weight:700;flex-shrink:0">Private</span>` : '';
  return { opCls, route, pbsBadge };
}

function allServiceNumbersSorted() {
  if (!ALL_SERVICES) return [];
  const seen = new Set();
  const list = [];
  Object.keys(ALL_SERVICES).forEach(k => {
    const svcNo = k.split('-')[0];
    if (!seen.has(svcNo) && !EXCLUDED_SERVICES.has(svcNo.replace(/^0+/, '').toUpperCase())) {
      seen.add(svcNo);
      list.push(svcNo);
    }
  });
  list.sort((a, b) => {
    const aNum = parseInt(a), bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b); // e.g. "950" before "950e"
    }
    return a.localeCompare(b);
  });
  return list;
}

// Renders the always-visible, ascending-order, colour-coded list of every
// bus service below the service search bar. Pass a filter string to narrow
// the list down to services whose number starts with it (used while typing
// in the search bar); omit it (or pass '') to show every service.
function renderServiceBrowseList(filter) {
  const box = document.getElementById('svc-browse-list');
  if (!box) return;
  if (!ALL_SERVICES) {
    box.innerHTML = `<div class="svc-browse-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading services…</div>`;
    return;
  }
  let svcNos = allServiceNumbersSorted();
  const val = (filter || '').trim().toUpperCase();
  if (val) svcNos = svcNos.filter(svcNo => svcNo.toUpperCase().startsWith(val));

  const header = document.querySelector('.svc-browse-title');
  if (header) header.textContent = val ? `${svcNos.length} service${svcNos.length === 1 ? '' : 's'} found` : 'All Services';

  if (!svcNos.length) {
    box.innerHTML = `<div class="svc-browse-empty">No services found.</div>`;
    return;
  }
  box.innerHTML = svcNos.map(svc => {
    const { opCls, route, pbsBadge } = buildServiceRowInner(svc);
    return `<div class="svc-browse-item" onclick="selectService('${svc}')">
      <span class="svc-drop-num ${opCls}">${formatSvcNo(svc)}</span>
      <span class="svc-drop-cat" style="display:flex;align-items:center;gap:0">${route}</span>
    </div>`;
  }).join('');
}

function onServiceInput() {
  const val = document.getElementById('serviceInput').value.trim().toUpperCase().replace(/^(\d+)E$/, '$1e');
  closeServiceDropdown();
  renderServiceBrowseList(val);
}

function selectService(svc) {
  document.getElementById('serviceInput').value = svc;
  closeServiceDropdown();
  renderServiceBrowseList();
  doServiceSearch();
}

function closeServiceDropdown() {
  document.getElementById('svc-dropdown').className = 'stop-name-results';
}

document.addEventListener('click', e => {
  if (!e.target.closest('#mode-service')) closeServiceDropdown();
});

async function doSearch() {
  const raw = document.getElementById('stopInput').value.trim();
  // Use lastStopCode if input matches the display name we set (i.e. not a raw code typed by user)
  const digits = raw.replace(/\D/g,'');
  const code = (lastStopCode && raw !== digits) ? lastStopCode : digits;
  if (!code) return;
  lastStopCode = code;
  closeUnified();
  document.getElementById('quickChips').style.display = 'none';
  document.getElementById('results-stop').style.display = 'block';
  document.getElementById('results-stop').innerHTML =
    `<div class="loading-state"><div class="bus-loader"><i class="fa-solid fa-bus"></i></div><div class="loading-txt">Fetching arrivals…</div></div>`;
  try {
    const data = await fetchLTA(code);
    const privateAtStop = getPrivateServicesForStop(code);
    if (privateAtStop.length && (!data.Services || !data.Services.length)) {
      data.Services = [];
    }
    render(code, data);
    rememberStopHistory(code);
    updateFavButtons();
    if (!ALL_STOPS?.find(s => s.BusStopCode === code)) {
      fetchAllStops().then(() => {
        const desc = ALL_STOPS?.find(s => s.BusStopCode === code)?.Description;
        if (desc) {
          const el = document.getElementById('stop-title-' + code);
          if (el) el.textContent = desc;
        }
      }).catch(() => {});
    }
  } catch(e) {
    document.getElementById('results-stop').innerHTML = `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`;
  }
}

// ── BUS SERVICE SEARCH ──
let routeData = null; // { directions: [{dir, stops}], currentDir: 0 }
let _currentRouteData = null; // stored for addSvcFavFromRoute
let tripMap = null;        // Leaflet map for plan trip tab
let planStops = [];        // stops array for current route/dir
let planStopMap = {};      // stopMap for current route/dir
let planSunAnalysis = null;// sun analysis for current route/dir
let planBoardIdx = -1;
let planAlightIdx = -1;

const EXCLUDED_SERVICES = new Set(['382']); // ServiceNo values normalized to uppercase
const SVC_DISPLAY_UPPER_E = new Set(['850e', '868e', '951e', '982e']);
function padCode(c) { return String(c).padStart(5, '0'); }

function formatSvcNo(svc) {
  return SVC_DISPLAY_UPPER_E.has((svc||'').toLowerCase()) ? svc.slice(0,-1) + 'E' : svc;
}
// Resolve operator CSS class, respecting private services' actual operator
function opClass(op, isPrivate) {
  const u = (op||'').toUpperCase();
  if (u === 'TTS') return 'op-tts';
  if (u === 'SBST' || u === 'SBS' || u.includes('SBS')) return 'op-sbs';
  if (u === 'GAS') return 'op-gas';
  if (u === 'SMRT') return 'op-smrt';
  if (u.includes('TONG TAR')) return 'op-tts';
  return isPrivate ? 'op-private' : 'op-smrt';
}

function setServiceBrowseVisible(visible) {
  const header = document.querySelector('.svc-browse-header');
  const list = document.getElementById('svc-browse-list');
  if (header) header.style.display = visible ? '' : 'none';
  if (list) list.style.display = visible ? '' : 'none';
}

async function doServiceSearch() {
  closeServiceDropdown();
  const svc = document.getElementById('serviceInput').value.trim().toUpperCase().replace(/^(\d+)E$/, '$1e');
  if (!svc) return;
  if (EXCLUDED_SERVICES.has(svc.replace(/^0+/, '').toUpperCase())) {
    setServiceBrowseVisible(false);
    document.getElementById('results-service').style.display = 'block';
    document.getElementById('results-service').innerHTML = `<div class="error-card" style="text-align:center"><i class="fa-solid fa-triangle-exclamation"></i> No route found for service <strong>${svc}</strong>.</div>`;
    return;
  }

  setServiceBrowseVisible(false);
  document.getElementById('results-service').style.display = 'block';
  document.getElementById('results-service').innerHTML =
    `<div class="loading-state"><div class="bus-loader"><i class="fa-solid fa-bus"></i></div><div class="loading-txt">Fetching route for ${svc}…</div></div>`;

  try {
    // Fetch route, stop names, and service metadata all in parallel
    const [routes, stops, svcMap] = await Promise.all([
      fetchBusRoute(svc),
      fetchAllStops().catch(() => ALL_STOPS || null),
      fetchAllServices().catch(() => ALL_SERVICES || null)
    ]);

    if (!routes || routes.length === 0) {
      document.getElementById('results-service').innerHTML = `<div class="error-card" style="text-align:center"><i class="fa-solid fa-triangle-exclamation"></i> No route found for service <strong>${svc}</strong>.</div>`;
      return;
    }

    // Group by Direction
    const byDir = {};
    routes.forEach(r => {
      if (!byDir[r.Direction]) byDir[r.Direction] = [];
      byDir[r.Direction].push(r);
    });
    const directions = Object.keys(byDir).map(d => ({
      dir: d,
      stops: byDir[d].sort((a,b) => a.StopSequence - b.StopSequence)
    }));

    // Ensure private services are injected into svcMap before rendering
    // (race condition: fetchAllServices may resolve before fetchPrivateServices)
    if (PRIVATE_SERVICES && svcMap) injectPrivateIntoServices();
    routeData = { svc, directions, currentDir: 0, svcMap };
    renderRoute(routeData, stops);
    rememberServiceHistory(svc);
    updateFavButtons();
  } catch(e) {
    document.getElementById('results-service').innerHTML = `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`;
  }
}

// Cache routes.json in memory (it's ~8MB, only load once per session)
let ALL_ROUTES = null; // only populated as a side-effect of route lookups, used for fallback dest name
let TRAIN_ALERTS = []; // cached train service alerts from LTA
let trainAlertsPollTimer = null;
let alertBannerEnabled = true; // in-memory only, resets each session

// Fetches the full stop sequence for a service from the Cloudflare Worker,
// which in turn reads from R2 (pre-synced from LTA daily). For private services
// the route is assembled directly from PRIVATE_SERVICES without a network call.
// The result is cached in ALL_ROUTES so subsequent expansions of the same
// service's stops don't re-fetch.
async function fetchBusRoute(svc) {
  const svcNorm = svc.replace(/^0+/, '').toUpperCase();

  // Check if this is a private service — serve from local PRIVATE_SERVICES instead of worker
  if (PRIVATE_SERVICES) {
    const pbsKey = Object.keys(PRIVATE_SERVICES).find(k =>
      k.toUpperCase() === svcNorm ||
      PRIVATE_SERVICES[k].ServiceNo.toUpperCase().replace(/\s+/g,'') === svcNorm ||
      PRIVATE_SERVICES[k].ServiceNo.toUpperCase().replace(/[^A-Z0-9]/g,'') === svcNorm.replace(/[^A-Z0-9]/g,'')
    );
    if (pbsKey) {
      const pbsSvc = PRIVATE_SERVICES[pbsKey];
      const stops = [];
      for (const [dirKey, dir] of Object.entries(pbsSvc.Directions)) {
        for (const stop of dir.Stops) {
          stops.push({
            ServiceNo: pbsSvc.ServiceNo,
            Operator: pbsSvc.Operator,
            Direction: parseInt(dirKey),
            StopSequence: stop.StopSequence,
            BusStopCode: stop.BusStopCode || '',
            Distance: 0,
            WD_FirstBus: (() => { const t = Object.values(stop.Timings||{}); return t.length ? t[0].replace(':','') : '-'; })(),
            WD_LastBus: (() => { const t = Object.values(stop.Timings||{}); return t.length ? t[t.length-1].replace(':','') : '-'; })(),
            SAT_FirstBus: '-', SAT_LastBus: '-',
            SUN_FirstBus: '-', SUN_LastBus: '-',
            _pbsStop: stop,
          });
        }
      }
      if (!ALL_ROUTES) ALL_ROUTES = [];
      ALL_ROUTES = ALL_ROUTES.filter(s => s.ServiceNo.replace(/^0+/,'').toUpperCase() !== svcNorm);
      ALL_ROUTES.push(...stops);
      return stops;
    }
  }

  // Fetch only this service's stops from the worker — no full file download
  const res = await fetch(`${PROXY_URL}?endpoint=route&service=${encodeURIComponent(svcNorm)}`, { headers: await getProxyHeaders() });
  if (!res.ok) throw new Error('Failed to load route. Check your Worker URL.');
  const stops = await res.json();
  // Cache in ALL_ROUTES for fallback dest name lookups
  if (!ALL_ROUTES) ALL_ROUTES = [];
  // Remove any previously cached stops for this service then add fresh ones
  ALL_ROUTES = ALL_ROUTES.filter(s => s.ServiceNo.replace(/^0+/,'').toUpperCase() !== svcNorm);
  ALL_ROUTES.push(...stops);
  return stops;
}

// ── ROUTE SUN ANALYSIS ──
// AVG_SPEED_MPS: ~18 km/h in Singapore traffic = 5 m/s
const AVG_SPEED_MPS = 5;

// Returns the initial compass bearing (0–360°) from point A to point B using
// the forward azimuth formula. 0° = north, 90° = east, 180° = south, 270° = west.
function bearingBetween(lat1, lng1, lat2, lng2) {
  const φ1 = lat1*Math.PI/180, φ2 = lat2*Math.PI/180;
  const dλ = (lng2-lng1)*Math.PI/180;
  const y = Math.sin(dλ)*Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(dλ);
  let b = Math.atan2(y,x)*180/Math.PI;
  return (b+360)%360;
}

// Haversine distance between two lat/lng coordinates, in metres.
// Accurate enough for the short inter-stop distances we're dealing with.
function distMetres(lat1,lng1,lat2,lng2) {
  const R=6371000, φ1=lat1*Math.PI/180, φ2=lat2*Math.PI/180;
  const dφ=(lat2-lat1)*Math.PI/180, dλ=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// The core seat recommendation engine. Walks every consecutive stop pair along
// the route, computes the road bearing between them, then works out the sun's
// position at the estimated time the bus will be on that segment (accounting for
// travel time so far). For each segment it calculates how much direct sunlight
// hits the left vs right window — the perpendicular component of the sun relative
// to the bus heading, weighted by altitude (a low sun is less intense) and segment
// length. Whichever side accumulates less weighted exposure over the full journey
// is the recommended side. Returns null if no stop coordinates are available.
function computeRouteSeating(stops, stopMap) {
  // Build segments with lat/lng, bearing, distance, estimated time offset
  const segments = [];
  let elapsed = 0; // seconds from now
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stopMap[String(stops[i].BusStopCode).padStart(5,'0')];
    const b = stopMap[String(stops[i+1].BusStopCode).padStart(5,'0')];
    if (!a?.Latitude || !b?.Latitude) continue;
    const lat1=parseFloat(a.Latitude), lng1=parseFloat(a.Longitude);
    const lat2=parseFloat(b.Latitude), lng2=parseFloat(b.Longitude);
    const dist = distMetres(lat1,lng1,lat2,lng2);
    const bear = bearingBetween(lat1,lng1,lat2,lng2);
    const segTime = dist / AVG_SPEED_MPS; // seconds
    const midTime = elapsed + segTime/2;
    // Sun position at mid-segment time
    const t = new Date(Date.now() + midTime*1000);
    const sun = getSunAtTime(t);
    segments.push({ bear, dist, sun, elapsed, segTime, lat1,lng1,lat2,lng2 });
    elapsed += segTime;
  }

  if (!segments.length) return null;

  // Tally weighted sun exposure per side
  let leftSun=0, rightSun=0, totalDist=0;
  const segResults = segments.map(seg => {
    const { bear, dist, sun } = seg;
    if (sun.alt < 3) return { ...seg, side:'any', score:0, exposure:'none' };
    const rel = (sun.az - bear + 360) % 360;
    const sunOnRight = rel < 180;
    const perp = Math.abs(Math.sin(rel*Math.PI/180));
    const altF = Math.sin(Math.abs(sun.alt)*Math.PI/180);
    const score = perp * altF;
    const exposure = score>.65?'high':score>.3?'medium':'low';
    if (sunOnRight) rightSun += score * dist;
    else leftSun += score * dist;
    totalDist += dist;
    return { ...seg, side: sunOnRight?'right':'left', score, exposure };
  });

  // Overall recommendation
  const leftPct  = Math.round(leftSun  / (totalDist||1) * 100);
  const rightPct = Math.round(rightSun / (totalDist||1) * 100);
  const recSide = leftPct <= rightPct ? 'left' : 'right';
  const sunSide = recSide === 'left' ? 'right' : 'left';
  const avoidPct = Math.max(leftPct, rightPct);
  const totalMins = Math.round(elapsed/60);

  return { recSide, sunSide, leftPct, rightPct, avoidPct, totalMins, segResults };
}

function buildRouteSeatingPanel(analysis) {
  if (!analysis) return '';
  const { recSide, sunSide, avoidPct, totalMins, segResults } = analysis;

  // Mini route strip — each segment coloured by sun exposure
  const stripSegs = segResults.map(seg => {
    if (seg.side==='any' || seg.exposure==='none') return `<div class="rsp-seg rsp-any" style="flex:${Math.round(seg.dist)}"></div>`;
    const sunIsOnRecSide = seg.side === analysis.recSide;
    return `<div class="rsp-seg" style="flex:${Math.round(seg.dist)};background:${sunIsOnRecSide?'#FF880050':'#00E07A30'}"></div>`;
  }).join('');

  const oppSide = recSide === 'left' ? 'right' : 'left';
  const shade = avoidPct > 60 ? 'most of' : avoidPct > 30 ? 'part of' : 'a bit of';
  const timeStr = totalMins > 0 ? `~${totalMins} min ride` : 'this ride';

  let headline, sub, emoji;
  if (avoidPct < 10) {
    emoji = '<i class="fa-solid fa-glasses"></i>';
    headline = `Any seat is fine`;
    sub = `The sun is low or behind the bus — no direct glare expected during this ride.`;
  } else {
    emoji = recSide === 'left' ? '<i class="fa-solid fa-arrow-left"></i>' : '<i class="fa-solid fa-arrow-right"></i>';
    headline = `Sit on the <strong>${recSide} side</strong> of the bus`;
    sub = `The sun will shine through the <strong style="color:#FFD000">${oppSide} windows</strong> for ${shade} the ${timeStr}. The ${recSide} side stays shaded.`;
  }

  return `
  <div class="rsp-card">
    <div class="rsp-title"><i class="fa-solid fa-sun"></i> Best Seat for This Journey</div>
    <div class="rsp-banner">
      <div class="rsp-emoji">${emoji}</div>
      <div>
        <div class="rsp-rec">${headline}</div>
        <div class="rsp-sub" style="margin-top:4px;line-height:1.5">${sub}</div>
      </div>
    </div>
    <div style="margin-bottom:6px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Sun exposure along the route</div>
    <div class="rsp-strip-wrap">
      <div class="rsp-strip-label">Boarding</div>
      <div class="rsp-strip">${stripSegs}</div>
      <div class="rsp-strip-label">Alighting</div>
    </div>
    <div class="rsp-legend">
      <div class="rsp-leg-item"><div class="rsp-leg-dot" style="background:#00E07A50;border:1px solid #00E07A80"></div>Shaded stretch</div>
      <div class="rsp-leg-item"><div class="rsp-leg-dot" style="background:#FF880050;border:1px solid #FF888890"></div>Sunny stretch</div>
    </div>
  </div>`;
}

function formatFreq(freq) {
  if (!freq || freq === '-' || freq === '0') return null;
  // Reject zero-range values like "0-0", "00-00"
  if (/^0+[-–]0+$/.test(freq.trim())) return null;
  // Collapse "15-15" or "15–15" to just "15"
  const rangeMatch = freq.trim().match(/^(\d+)[-–](\d+)$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1]), hi = parseInt(rangeMatch[2]);
    return (lo === hi ? `${lo}` : `${lo}-${hi}`) + ' min';
  }
  return freq + ' min';
}

function renderRoute(rd, allStops) {
  const dir = rd.directions[rd.currentDir];
  const stopMap = {};
  if (allStops) allStops.forEach(s => stopMap[padCode(s.BusStopCode)] = s);

  const firstStop = dir.stops[0];
  const lastStop = dir.stops[dir.stops.length - 1];
  const fromName = stopMap[padCode(firstStop?.BusStopCode)]?.Description || firstStop?.BusStopCode || '—';
  const toName = stopMap[padCode(lastStop?.BusStopCode)]?.Description || lastStop?.BusStopCode || '—';

  // Look up service metadata for this direction
  const svcNormKey = normalizeServiceNo(rd.svc.toUpperCase());
  const svcInfo = rd.svcMap
    ? rd.svcMap[svcNormKey + '-' + dir.dir] || null
    : null;

  const category = svcInfo?.Category || null;
  const operator = svcInfo?.Operator || null;
  const _midpoint = LOOP_SVC_MIDPOINTS?.[rd.svc];
  const loopDesc = (_midpoint
    ? (/int|stn|hub|ter|ctr|zoo|wetland reserve/i.test(_midpoint.Description) ? _midpoint.Description : _midpoint.RoadName)
    : null)
    || svcInfo?.LoopDesc || null;
  const amPeak   = formatFreq(svcInfo?.AM_Peak_Freq);
  const amOff    = formatFreq(svcInfo?.AM_Offpeak_Freq);
  const pmPeak   = formatFreq(svcInfo?.PM_Peak_Freq);
  const pmOff    = formatFreq(svcInfo?.PM_Offpeak_Freq);

  const opLabel = operator === 'SBST' ? 'SBS Transit' : operator === 'SMRT' ? 'SMRT Buses' : operator === 'TTS' ? 'Tower Transit' : operator === 'GAS' ? 'Go-Ahead' : operator || '';
  const catColor = 'var(--white)';
  const catLabel = category === 'CITY_LINK' ? 'CITY DIRECT' : category;
  function opToColor(op, isPrivate) {
    const u = (op||'').toUpperCase();
    if (u === 'TTS') return '#1A6B2A';
    if (u === 'SBST' || u === 'SBS' || u.includes('SBS')) return '#5B2D8E';
    if (u === 'GAS') return '#9A7000';
    if (u === 'SMRT') return '#D7181C';
    if (u.includes('TONG TAR')) return '#1A6B2A';
    return isPrivate ? '#1A2C5B' : '#D7181C';
  }
  const opBg = opToColor(operator, !!(rd.svcMap?.[svcNormKey + '-1']?._isPrivate || rd.svcMap?.[svcNormKey + '-2']?._isPrivate));

  const freqPills = [
    amPeak ? `<span class="svc-freq-pill"><span class="svc-freq-pill-label">AM</span>${amPeak}</span>` : '',
    amOff  ? `<span class="svc-freq-pill"><span class="svc-freq-pill-label">Off-peak</span>${amOff}</span>` : '',
    pmPeak ? `<span class="svc-freq-pill"><span class="svc-freq-pill-label">PM</span>${pmPeak}</span>` : '',
    pmOff  ? `<span class="svc-freq-pill"><span class="svc-freq-pill-label">Eve</span>${pmOff}</span>` : '',
  ].filter(Boolean).join('');

  // Compute sun seating recommendation for the whole route
  const routeSunAnalysis = computeRouteSeating(dir.stops, stopMap);
  const routeSunPanel = buildRouteSeatingPanel(routeSunAnalysis);

  // Store for addSvcFavFromRoute
  _currentRouteData = { rd, stopMap, isLoop: rd.directions.length === 1, loopDesc };

  let html = `
    <div class="route-sticky-header">
    <div class="route-hero" style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;white-space:nowrap">
        <div style="display:inline-flex;align-items:center;gap:6px;background:${opBg};color:#fff;padding:6px 16px;border-radius:12px;flex-shrink:0"><span class="stop-title" style="font-size:inherit">${formatSvcNo(rd.svc)}</span></div>
        ${freqPills}
        ${rd.svcMap?.[svcNormKey + '-1']?._isScheduled ? `<span style="margin-left:auto;font-size:9px;color:var(--muted);white-space:normal;text-align:right;line-height:1.3;max-width:200px;flex-shrink:0"><i class="fa-solid fa-triangle-exclamation"></i> Timings for this service are estimated based on schedules and may not be fully accurate.</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${category ? `<span style="color:${catColor};font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px;flex-shrink:0">${catLabel}</span>` : ''}
        ${category && opLabel ? `<span style="color:var(--card-border);flex-shrink:0">·</span>` : ''}
        ${opLabel ? `<span style="color:var(--muted);font-size:11px;flex-shrink:0">${opLabel}</span>` : ''}
        <div style="flex:1"></div>
        <button onclick="toggleJourneyDetails()" id="journey-details-btn" style="padding:4px 10px;border:1.5px solid var(--card-border);border-radius:8px;background:none;color:var(--muted);font-family:'LTAIdentity',sans-serif;font-weight:600;font-size:11px;cursor:pointer;letter-spacing:.5px;transition:all .2s;white-space:nowrap;flex-shrink:0"><i class="fa-solid fa-circle-info"></i> Where to sit? ›</button>
        <button id="svc-fav-btn-${rd.svc}" onclick="addSvcFavFromRoute('${rd.svc}')" style="background:none;border:1.5px solid var(--card-border);border-radius:8px;padding:4px 10px;font-size:18px;cursor:pointer;line-height:1;transition:all .2s;flex-shrink:0;color:${(window._favs||{})['svc_'+rd.svc]?'var(--yellow)':'var(--muted)'}" title="Favourite this service">${(window._favs||{})['svc_'+rd.svc]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
      </div>
    </div>
    <div id="journey-details-here"></div>
    <div class="dir-toggle">`;

  const isLoop = rd.directions.length === 1;
  // Dual-loop: LTA DataMall stores both loops as a single Direction 1.
  // Prefer build-time set; fall back to runtime detection (for future-proofing if LTA ever adds Dir2).
  const isDualLoop = (rd.svc in DUAL_LOOP_SVCS) || (rd.directions.length > 1 && rd.directions.every(d => {
    const first = d.stops[0]?.BusStopCode;
    const last = d.stops[d.stops.length - 1]?.BusStopCode;
    return first && last && String(first) === String(last);
  }));
  rd.directions.forEach((d, i) => {
    const dFirst = stopMap[padCode(d.stops[0]?.BusStopCode)]?.Description || d.stops[0]?._pbsStop?.Description || d.stops[0]?.BusStopCode || '?';
    const dLast = stopMap[padCode(d.stops[d.stops.length-1]?.BusStopCode)]?.Description || d.stops[d.stops.length-1]?._pbsStop?.Description || d.stops[d.stops.length-1]?.BusStopCode || '?';
    let label;
    if (isDualLoop) {
      const dualData = DUAL_LOOP_SVCS[rd.svc] || {};
      if (rd.directions.length === 1) {
        // Single direction containing both loops — show both loop descs on one button
        const loops = [dualData.dir1, dualData.dir2].filter(Boolean).join(' / ')
          || loopDesc || '';
        label = '<div class="dir-btn-dest">' + dFirst + ' ↻</div>'
          + (loops ? '<div class="dir-btn-loop">via ' + loops + '</div>' : '');
      } else {
        // Rare case: LTA splits into two directions — show per-direction label
        const dirLoopDesc = (i === 0 ? dualData.dir1 : dualData.dir2)
          || rd.svcMap?.[normalizeServiceNo(rd.svc.toUpperCase()) + '-' + (i + 1)]?.LoopDesc || '';
        label = '<div class="dir-btn-dest">' + dFirst + ' ↻</div>'
          + (dirLoopDesc ? '<div class="dir-btn-loop">via ' + dirLoopDesc + '</div>' : '');
      }
    } else {
      const loopLine = (isLoop && loopDesc) ? '<div class="dir-btn-loop">via ' + loopDesc + '</div>' : '';
      label = isLoop
        ? '<div class="dir-btn-dest">' + dFirst + ' → ' + dLast + '</div>' + loopLine
        : '<div class="dir-btn-dest">' + dFirst + ' → ' + dLast + '</div>';
    }
    html += '<button class="dir-btn' + (i===rd.currentDir?' active':'') + '" onclick="switchDir(' + i + ')">' + label + '</button>';
  });

  html += `</div>`; // close dir-toggle

  html += `</div>`; // close route-sticky-header
  html += `<div class="stops-scroll-wrap"><div>`; // start scrollable stops

  dir.stops.forEach((s, i) => {
    const info = stopMap[padCode(s.BusStopCode)];
    const name = info?.Description || s._pbsStop?.Description || s.BusStopCode || '—';
    const road = info?.RoadName || s._pbsStop?.RoadName || '';
    const displayCode = s.BusStopCode || '-';
    // For PBS stops without a bus stop code, use a synthetic key so IDs remain unique/valid
    const stopKey = s.BusStopCode || ('pbs-seq-' + s.StopSequence);
    const dist = s.Distance ? (s.Distance >= 1 ? s.Distance.toFixed(1)+'km' : Math.round(s.Distance*1000)+'m') : '';
    const isFirst = i === 0, isLast = i === dir.stops.length - 1;
    const wdFirst = s.WD_FirstBus && s.WD_FirstBus !== '-' ? s.WD_FirstBus : null;
    const wdLast  = s.WD_LastBus  && s.WD_LastBus  !== '-' ? s.WD_LastBus  : null;
    const satFirst= s.SAT_FirstBus && s.SAT_FirstBus !== '-' ? s.SAT_FirstBus : null;
    const satLast = s.SAT_LastBus  && s.SAT_LastBus  !== '-' ? s.SAT_LastBus  : null;
    const sunFirst= s.SUN_FirstBus && s.SUN_FirstBus !== '-' ? s.SUN_FirstBus : null;
    const sunLast = s.SUN_LastBus  && s.SUN_LastBus  !== '-' ? s.SUN_LastBus  : null;
    const fmtTime = t => t ? t.slice(0,2)+':'+t.slice(2) : '—';
    const timingRows = (wdFirst||satFirst||sunFirst) ? `
      <div class="rs-timing-grid">
        <div class="rs-timing-head"></div><div class="rs-timing-head">First</div><div class="rs-timing-head">Last</div>
        <div class="rs-timing-day">Weekday</div><div class="rs-timing-val">${fmtTime(wdFirst)}</div><div class="rs-timing-val">${fmtTime(wdLast)}</div>
        ${satFirst ? `<div class="rs-timing-day">Saturday</div><div class="rs-timing-val">${fmtTime(satFirst)}</div><div class="rs-timing-val">${fmtTime(satLast)}</div>` : ''}
        ${sunFirst ? `<div class="rs-timing-day">Sunday</div><div class="rs-timing-val">${fmtTime(sunFirst)}</div><div class="rs-timing-val">${fmtTime(sunLast)}</div>` : ''}
      </div>` : '';
    html += `
      <div class="route-stop-item">
        <div class="route-line">
          <div class="route-dot" style="${isFirst?'margin-top:20px':''}"></div>
          ${dist ? `<div class="route-dist-side">${dist}</div>` : ''}
          ${!isLast ? '<div class="route-connector"></div>' : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div class="route-stop-card" onclick="toggleRouteStop('rs-${stopKey}-${i}', '${stopKey}', this)">
            <div class="route-seq">${s.StopSequence}</div>
            <div class="route-stop-info">
              <div class="route-stop-name" data-stop-name="${name}">${stopLabel(name)}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:2px">
                <span class="route-stop-code" style="margin:0">${displayCode}${road?' · '+road:''}</span>
                <div style="display:flex;align-items:center;gap:3px;flex-shrink:0">
                  ${mrtPills(name, true)}
                  ${(() => { const as = alertsForStopName(name); return as.length ? `<button onclick="event.stopPropagation();openTrainAlertModal()" title="Train disruption on ${as.map(a=>a.Line).join(', ')}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0;line-height:1;flex-shrink:0"><i class="fa-solid fa-triangle-exclamation"></i></button>` : ''; })()}
                  ${/Changi Airport Ter | Seletar Airport/i.test(name) ? '<span style="transform:rotate(-90deg)"><i class="fa-solid fa-plane"></i></span>' : ''}
                  ${/S'pore Zoo/i.test(name) ? '<i class="fa-solid fa-paw"></i>' : ''}
                  ${/Bird Paradise/i.test(name) ? '<i class="fa-solid fa-dove"></i>' : ''}
                  ${/Marina Bay Cruise Ctr/i.test(name) ? '<i class="fa-solid fa-ship"></i>' : ''}
                  ${/Natl Stadium/i.test(name) ? '<i class="fa-solid fa-stadium"></i>' : ''}
                  </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <button class="view-btn" title="View bus stop location on map" data-key="stop_${s.BusStopCode}" onclick="event.stopPropagation();viewStopOnMap('${s.BusStopCode}','${name.replace(/'/g,'')}','${(road||'').replace(/'/g,'')}')" style="font-size:16px;color:var(--muted)">${(window._favs||{})['stop_'+s.BusStopCode]?'<i class="fa-solid fa-location-dot"></i>':'<i class="fa-solid fa-location-dot"></i>'}</button>
              <button class="fav-btn" title="Add bus stop to favourites" data-key="stop_${s.BusStopCode}" onclick="event.stopPropagation();addStopFav('${s.BusStopCode}','${name.replace(/'/g,'')}','${(road||'').replace(/'/g,'')}')" style="font-size:16px;color:var(--muted)">${(window._favs||{})['stop_'+s.BusStopCode]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
              <div class="rs-chevron">›</div>
            </div>
          </div>
          <div class="rs-expand" id="rs-${stopKey}-${i}">
            <div class="rs-expand-inner">
              ${(timingRows || s._pbsStop) ? `<div class="rs-actions" style="display:flex;align-items:center;justify-content:space-between;gap:6px">${timingRows ? `<button class="rs-action-btn" style="color:var(--cyan);background:#00C8E015;border-color:#00C8E030" onclick="toggleRouteTiming('rtp-${stopKey}-${i}', this)"><i class="fa-regular fa-clock"></i> First / Last</button>` : '<div></div>'}<button class="rs-action-btn" style="color:var(--muted)" onclick="event.stopPropagation();loadArrivalsInRoute('${stopKey}', '${s.StopSequence}')">↻ Refresh</button></div>` : ''}
              <div class="rs-arrivals" id="ra-${stopKey}-${i}">
                <div class="rs-arrivals-placeholder">Loading…</div>
              </div>
              ${timingRows ? `<div class="rs-timing-panel" id="rtp-${stopKey}-${i}" style="display:none">${timingRows}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  });

  html += `</div></div>`; // close inner div and stops-scroll-wrap
  // Store for plan trip use
  planStops = dir.stops;
  planStopMap = stopMap;
  planSunAnalysis = routeSunAnalysis;
  planBoardIdx = -1; planAlightIdx = -1;

  const tabsHtml = `
    <div id="journey-details-wrap" style="display:none;margin-bottom:12px;border:1.5px solid var(--card-border);border-radius:16px;overflow:visible">
      <div id="jp-sun" style="display:none">${routeSunPanel}</div>
      <div id="jp-plan" style="display:block">
        <div class="plan-trip-wrap">
          <div style="display:flex;gap:10px">
            <div class="plan-stop-group" style="flex:1;min-width:0">
              <div class="plan-stop-label"><i class="fa-solid fa-circle-dot" style="color:var(--green)"></i> Board at</div>
              <div class="plan-stop-input-wrap">
                <input class="plan-stop-input" id="plan-board-input" placeholder="Search stop name…" oninput="filterPlanStops('board');updatePlanClearBtn('board')" onfocus="openPlanDrop('board')" onblur="closePlanDropDelay('board')" autocomplete="off"/>
                <button class="plan-stop-clear" id="plan-board-clear" onmousedown="event.preventDefault();clearPlanStop('board')"><i class="fa-solid fa-xmark" style="color:#fff"></i></button>
                <div class="plan-stop-dropdown" id="plan-board-drop"></div>
              </div>
            </div>
            <div class="plan-stop-group" style="flex:1;min-width:0">
              <div class="plan-stop-label"><i class="fa-solid fa-circle-dot" style="color:var(--red)"></i> Alight at</div>
              <div class="plan-stop-input-wrap">
                <input class="plan-stop-input" id="plan-alight-input" placeholder="Search stop name…" oninput="filterPlanStops('alight');updatePlanClearBtn('alight')" onfocus="openPlanDrop('alight')" onblur="closePlanDropDelay('alight')" autocomplete="off"/>
                <button class="plan-stop-clear" id="plan-alight-clear" onmousedown="event.preventDefault();clearPlanStop('alight')"><i class="fa-solid fa-xmark" style="color:#fff"></i></button>
                <div class="plan-stop-dropdown" id="plan-alight-drop"></div>
              </div>
            </div>
          </div>
          <div id="plan-trip-result"></div>
        </div>
      </div>
    </div>`;

  document.getElementById('results-service').innerHTML = html;
  const detailsSlot = document.getElementById('journey-details-here');
  if (detailsSlot) detailsSlot.outerHTML = tabsHtml;

  // Inject train alerts for any affected stations in this route
  const routeAlertSet = new Map();
  dir.stops.forEach(s => {
    const name = stopMap[s.BusStopCode]?.Description || '';
    alertsForStopName(name).forEach(a => routeAlertSet.set(a.Line, a));
  });
  const routeAlerts = [...routeAlertSet.values()];
  if (routeAlerts.length) {
    const alertHtml = routeAlerts.map(renderInlineAlert).join('');
    const firstCard = document.querySelector('#results-service .route-card-outer');
    if (firstCard) firstCard.insertAdjacentHTML('afterbegin', alertHtml);
  }
  updateTrainAlertBanner();

  // Reset board/alight selection when route re-renders
  populatePlanDropdowns();
}

function toggleJourneyDetails() {
  const wrap = document.getElementById('journey-details-wrap');
  const btn  = document.getElementById('journey-details-btn');
  if (!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  if (btn) {
    btn.style.color = isOpen ? 'var(--muted)' : 'var(--white)';
    btn.style.borderColor = isOpen ? 'var(--card-border)' : 'var(--cyan)';
    btn.innerHTML = isOpen ? '<i class="fa-solid fa-circle-info"></i> Where to sit? ›' : '<i class="fa-solid fa-circle-info"></i> Where to sit? ∨';
  }
}

function populatePlanDropdowns() {
  // Pre-build option list for both dropdowns
  renderPlanDrop('board', '');
  renderPlanDrop('alight', '');
}

function renderPlanDrop(which, query) {
  const drop = document.getElementById(`plan-${which}-drop`);
  const q = query.toLowerCase().trim();
  const minIdx = (which === 'alight' && planBoardIdx >= 0) ? planBoardIdx + 1 : 0;
  const filtered = planStops.map((s, i) => ({ s, i })).filter(({ s, i }) => {
    if (i < minIdx) return false;
    const info = s.BusStopCode ? planStopMap[padCode(s.BusStopCode)] : null;
    const name = (info?.Description || s._pbsStop?.Description || String(s.BusStopCode ?? '') || '').toLowerCase();
    const road = (info?.RoadName   || s._pbsStop?.RoadName    || '').toLowerCase();
    const code = String(s.BusStopCode ?? '').toLowerCase();
    return !q || name.includes(q) || road.includes(q) || code.includes(q);
  }).slice(0, 200);

  drop.innerHTML = filtered.map(({ s, i }) => {
    const info = s.BusStopCode ? planStopMap[padCode(s.BusStopCode)] : null;
    const name = info?.Description || s._pbsStop?.Description || s.BusStopCode || '—';
    const road = info?.RoadName    || s._pbsStop?.RoadName    || '';
    const code = s.BusStopCode || '-';
    return `<div class="plan-drop-item" data-which="${which}" data-idx="${i}" data-name="${name.replace(/"/g, '&quot;')}">
      <span class="plan-drop-seq">${s.StopSequence}</span>
      <div><div class="plan-drop-name">${name}</div><div class="plan-drop-code">${code}${road ? ' · ' + road : ''}</div></div>
    </div>`;
  }).join('');

  drop.querySelectorAll('.plan-drop-item').forEach(el => {
    el.addEventListener('mousedown', () => {
      selectPlanStop(el.dataset.which, parseInt(el.dataset.idx), el.dataset.name);
    });
  });
}

function filterPlanStops(which) {
  const q = document.getElementById(`plan-${which}-input`).value;
  renderPlanDrop(which, q);
  document.getElementById(`plan-${which}-drop`).classList.add('open');
}

function openPlanDrop(which) {
  renderPlanDrop(which, document.getElementById(`plan-${which}-input`).value);
  document.getElementById(`plan-${which}-drop`).classList.add('open');
}

function closePlanDropDelay(which) {
  setTimeout(() => document.getElementById(`plan-${which}-drop`).classList.remove('open'), 200);
}

function selectPlanStop(which, idx, name) {
  document.getElementById(`plan-${which}-input`).value = name;
  document.getElementById(`plan-${which}-drop`).classList.remove('open');
  if (which === 'board') {
    planBoardIdx = idx;
    // Reset alight if it's now before board
    if (planAlightIdx >= 0 && planAlightIdx <= planBoardIdx) {
      planAlightIdx = -1;
      document.getElementById('plan-alight-input').value = '';
    }
    renderPlanDrop('alight', document.getElementById('plan-alight-input').value);
  } else planAlightIdx = idx;
  updatePlanClearBtn('board'); updatePlanClearBtn('alight');
  if (planBoardIdx >= 0 && planAlightIdx >= 0) runPlanTrip();
}

function clearPlanStop(which) {
  const input = document.getElementById('plan-' + which + '-input');
  input.value = '';
  if (which === 'board') { planBoardIdx = -1; }
  else { planAlightIdx = -1; }
  updatePlanClearBtn(which);
  document.getElementById('plan-trip-result').innerHTML = '';
  input.focus();
}

function updatePlanClearBtn(which) {
  const input = document.getElementById('plan-' + which + '-input');
  const btn = document.getElementById('plan-' + which + '-clear');
  if (!btn) return;
  btn.classList.toggle('visible', input.value.length > 0);
  btn.style.color = '#fff';
}

function runPlanTrip() {
  if (planBoardIdx < 0 || planAlightIdx < 0) return;
  if (planAlightIdx <= planBoardIdx) {
    toast('<i class="fa-solid fa-triangle-exclamation"></i> Alighting stop must be after boarding stop.');
    return;
  }
  const sliced = planStops.slice(planBoardIdx, planAlightIdx + 1);
  const boardElapsed = planSunAnalysis?.segResults?.slice(0, planBoardIdx).reduce((a, s) => a + s.segTime, 0) || 0;
  const analysis = computeRouteSeatingSlice(sliced, planStopMap, boardElapsed);
  renderPlanTripResult(analysis, sliced, planBoardIdx, planAlightIdx);
}

function renderPlanTripResult(analysis, sliced, boardIdx, alightIdx) {
  const container = document.getElementById('plan-trip-result');
  if (!analysis) { container.innerHTML = '<div class="rs-arrivals-placeholder">Not enough location data for this segment.</div>'; return; }

  const { recSide, sunSide, avoidPct, totalMins } = analysis;
  const noSun = avoidPct < 10;
  const emoji = noSun ? '<i class="fa-solid fa-glasses"></i>' : recSide === 'left' ? '<i class="fa-solid fa-arrow-left"></i>' : '<i class="fa-solid fa-arrow-right"></i>';
  const intensity = avoidPct > 60 ? 'strongly' : avoidPct > 30 ? 'moderately' : 'slightly';
  const isSunny = avoidPct > 40;

  const segResults = planSunAnalysis?.segResults?.slice(boardIdx, alightIdx) || [];
  const stripHtml = segResults.map((seg, i) => {
    if (!seg || seg.exposure === 'none' || seg.side === 'any')
      return `<div class="trip-seg" style="flex:${Math.round(seg?.dist||1)};background:#FFFFFF10"></div>`;
    const score = seg.score || 0;
    const lerpHex = (a, b, t) => {
      const c = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
      const [ar,ag,ab] = c(a), [br,bg,bb] = c(b);
      const r = Math.round(ar+(br-ar)*t), g = Math.round(ag+(bg-ag)*t), bv = Math.round(ab+(bb-ab)*t);
      return '#' + [r,g,bv].map(v=>v.toString(16).padStart(2,'0')).join('');
    };
    const baseColor = score < 0.5 ? lerpHex('#FFD000','#FF8800', score/0.5) : lerpHex('#FF8800','#FF3333',(score-0.5)/0.5);
    return `<div class="trip-seg" style="flex:${Math.round(seg.dist)};background:${baseColor}80"></div>`;
  }).join('');

  const boardStop = planStops[boardIdx];
  const alightStop = planStops[alightIdx];
  const boardName = planStopMap[boardStop.BusStopCode]?.Description || boardStop._pbsStop?.Description || boardStop.Description || boardStop.BusStopCode;
  const alightName = planStopMap[alightStop.BusStopCode]?.Description || alightStop._pbsStop?.Description || alightStop.Description || alightStop.BusStopCode;

  container.innerHTML = `
    <div class="trip-result-card${isSunny?' sunny':''}">
      <div class="trip-result-map-wrap" style="position:relative"><div id="trip-map"></div>
        <div class="map-legend-inline" id="map-legend-box">
          <div onclick="toggleMapLegend()" style="font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span>Sun Intensity</span><span id="map-legend-chevron" style="font-size:10px;transition:transform .2s">▾</span>
          </div>
          <div id="map-legend-items" style="margin-top:3px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:80px;height:4px;border-radius:2px;flex-shrink:0;background:linear-gradient(to right,#4A6090,#FFD000,#FF8800,#FF3333)"></div>
            </div>
            <div style="display:flex;justify-content:space-between;width:80px;margin-top:2px">
              <span class="map-legend-item-label">No sun</span>
              <span class="map-legend-item-label">Strong</span>
            </div>
          </div>
        </div>
      </div>
      <div class="trip-rec-row">
        <div class="trip-rec-emoji">${emoji}</div>
        <div>
          <div class="trip-rec-side${isSunny?' sunny':''}">${noSun ? 'Any seat is fine' : `Sit on the <strong>${recSide.toUpperCase()} side</strong>`}</div>
          <div class="trip-rec-detail">
            ${noSun ? 'No direct sun expected — sit anywhere you like.' : `Sun hits the ${sunSide} windows ${intensity}`}<br>
            ~${totalMins} min · ${sliced.length - 1} stops
          </div>
        </div>
      </div>
      <div class="trip-seg-strip">${stripHtml}</div>
      <div class="trip-stops-row">
        <span><i class="fa-solid fa-circle-dot" style="color:var(--green)"></i> ${boardName}</span>
        <span><i class="fa-solid fa-circle-dot" style="color:var(--red)"></i> ${alightName}</span>
      </div>
    </div>`;

  // Init trip map
  setTimeout(() => initTripMap(sliced, boardIdx, alightIdx), 50);
}

function initTripMap(sliced, boardIdx, alightIdx) {
  if (tripMap) { tripMap.remove(); tripMap = null; }
  function stopLatLng(s) {
    const info = s.BusStopCode ? planStopMap[s.BusStopCode] : null;
    if (info?.Latitude) return [parseFloat(info.Latitude), parseFloat(info.Longitude)];
    const pb = s._pbsStop;
    if (pb?.Latitude) return [parseFloat(pb.Latitude), parseFloat(pb.Longitude)];
    if (s.Latitude) return [parseFloat(s.Latitude), parseFloat(s.Longitude)];
    return null;
  }
  const stopCoords = sliced.map(stopLatLng);
  const validCoords = stopCoords.filter(Boolean);
  if (validCoords.length < 2) return;

  tripMap = L.map('trip-map', { zoomControl: false, attributionControl: false });
  L.tileLayer(document.body.classList.contains('light') ? 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png' : 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.onemap.gov.sg" target="_blank">OneMap</a> &copy; Singapore Land Authority' }).addTo(tripMap);

  const segResults = planSunAnalysis?.segResults?.slice(boardIdx, alightIdx) || [];
  const isLight = document.body.classList.contains('light');

  // Map a segment's raw score (0–1) to a hex color by lerping through
  // the intensity ramp: no-sun → mild (#FFD000) → moderate (#FF8800) → strong (#FF3333)
  function scoreToColor(score) {
    if (score <= 0) return isLight ? '#4A6090' : '#8899BB';
    const lerpHex = (a, b, t) => {
      const c = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
      const [ar,ag,ab] = c(a), [br,bg,bb] = c(b);
      const r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg-ag)*t), bv = Math.round(ab + (bb-ab)*t);
      return '#' + [r,g,bv].map(v=>v.toString(16).padStart(2,'0')).join('');
    };
    if (score < 0.5) return lerpHex('#FFD000', '#FF8800', score / 0.5);
    return lerpHex('#FF8800', '#FF3333', (score - 0.5) / 0.5);
  }

  function segScore(i) {
    const seg = segResults[i];
    if (!seg || seg.exposure === 'none' || seg.side === 'any') return 0;
    return seg.score || 0;
  }

  // Returns a smoothly interpolated color at the midpoint between seg i and i+1
  function segColor(i) {
    const s0 = segScore(i);
    const s1 = segScore(Math.min(i + 1, segResults.length - 1));
    return scoreToColor((s0 + s1) / 2);
  }
  // Draw stop markers immediately
  sliced.forEach((s, i) => {
    const coords = stopLatLng(s);
    if (!coords) return;
    const isBoard = i === 0, isAlight = i === sliced.length - 1;
    const color = isBoard ? '#00E07A' : isAlight ? '#FF3333' : '#FFFEF580';
    L.circleMarker(coords, {
      radius: isBoard || isAlight ? 9 : 4,
      fillColor: color, color: '#000', weight: 1.5, fillOpacity: 1, zIndexOffset: 100
    }).addTo(tripMap);
  });

  tripMap.fitBounds(validCoords, { padding: [48, 48] });
  tripMap.whenReady(() => {
    setTimeout(() => updateSunDirectionOnTripMap(), 300);
  });

  // Fetch road-snapped geometry from OSRM in chunks of 25 waypoints
  (async () => {
    const pairs = stopCoords.map((c, i) => ({ c, i })).filter(x => x.c);
    const CHUNK = 25;
    for (let start = 0; start < pairs.length - 1; start += CHUNK - 1) {
      const chunk = pairs.slice(start, start + CHUNK);
      if (chunk.length < 2) break;
      const coordStr = chunk.map(p => `${p.c[1]},${p.c[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&geometries=geojson&annotations=false&steps=true`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.[0]?.legs) throw new Error('no route');
        data.routes[0].legs.forEach((leg, j) => {
          const color = segColor(chunk[j].i);
          const legCoords = leg.steps.flatMap(step =>
            step.geometry.coordinates.map(([lng, lat]) => [lat, lng])
          );
          if (legCoords.length >= 2) {
            if (tripMap) L.polyline(legCoords, { color, weight: 5, opacity: 0.9 }).addTo(tripMap);
          } else {
            const a = chunk[j].c, b = chunk[j + 1].c;
            if (tripMap) L.polyline([a, b], { color, weight: 5, opacity: 0.7, dashArray: '6 4' }).addTo(tripMap);
          }
        });
      } catch {
        chunk.slice(0, -1).forEach((a, j) => {
          const b = chunk[j + 1];
          const color = segColor(a.i);
          if (tripMap) L.polyline([a.c, b.c], { color, weight: 5, opacity: 0.7, dashArray: '6 4' }).addTo(tripMap);
        });
      }
    }
  })();
}

function toggleMapLegend() {
  const items = document.getElementById('map-legend-items');
  const chevron = document.getElementById('map-legend-chevron');
  if (!items) return;
  const collapsed = items.style.display === 'none';
  items.style.display = collapsed ? 'block' : 'none';
  chevron.style.transform = collapsed ? '' : 'rotate(-90deg)';
}

// Draws a live sun position indicator on the trip map — a circular marker
// at the edge of the map bounds showing where the sun currently is, with a
// dashed ray pointing toward the route centre. Updates in real time as the
// sun moves (called on a 60-second interval while the map is open).
function updateSunDirectionOnTripMap() {
  if (!tripMap) return;
  if (tripMap._sunMarker) { tripMap.removeLayer(tripMap._sunMarker); delete tripMap._sunMarker; }
  if (tripMap._sunRay) { tripMap.removeLayer(tripMap._sunRay); delete tripMap._sunRay; }

  const sun = getSunAtTime(new Date());
  if (sun.alt < 3) return;

  // Sun azimuth: direction sun is coming FROM (opposite of where it shines TO)
  const az = sun.az; // degrees clockwise from north
  const rad = az * Math.PI / 180;
  // Direction vector FROM sun toward center (sun shines in this direction)
  const dLat = -Math.cos(rad); // negative = sun is in opposite direction
  const dLng = -Math.sin(rad);

  const bounds = tripMap.getBounds();
  const north = bounds.getNorth(), south = bounds.getSouth();
  const east = bounds.getEast(), west = bounds.getWest();
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;
  const latSpan = (north - south) * 0.4;
  const lngSpan = (east - west) * 0.4;

  // Place sun at map edge in the direction it's coming FROM
  const fromRad = (az) * Math.PI / 180;
  const fromLat = centerLat + Math.cos(fromRad) * latSpan;
  const fromLng = centerLng + Math.sin(fromRad) * lngSpan;

  const sunSvg = `<svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="trip-sun-icon" style="filter:drop-shadow(0 0 6px rgba(255,210,0,1))">
    <circle cx="18" cy="18" r="7" fill="#FFD000"/>
    <line x1="18" y1="2" x2="18" y2="8" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="18" y1="28" x2="18" y2="34" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="2" y1="18" x2="8" y2="18" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="28" y1="18" x2="34" y2="18" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="5.5" y1="5.5" x2="9.8" y2="9.8" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="26.2" y1="26.2" x2="30.5" y2="30.5" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="30.5" y1="5.5" x2="26.2" y2="9.8" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="9.8" y1="26.2" x2="5.5" y2="30.5" stroke="#FFD000" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;

  const sunIcon = L.divIcon({ html: sunSvg, className: '', iconAnchor: [16, 16] });
  const marker = L.marker([fromLat, fromLng], { icon: sunIcon, interactive: false, zIndexOffset: 500 });
  marker.addTo(tripMap);
  tripMap._sunMarker = marker;

  // Draw dashed ray from sun toward center of route
  const ray = L.polyline([[fromLat, fromLng], [centerLat, centerLng]], {
    color: '#FFD000', weight: 1.5, opacity: 0.4, dashArray: '6 7'
  });
  ray.addTo(tripMap);
  tripMap._sunRay = ray;
}

function computeRouteSeatingSlice(stops, stopMap, startElapsed) {
  const segments = [];
  let elapsed = startElapsed;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stopMap[String(stops[i].BusStopCode).padStart(5,'0')]   || stops[i]._pbsStop;
    const b = stopMap[String(stops[i+1].BusStopCode).padStart(5,'0')] || stops[i+1]._pbsStop;
    if (!a?.Latitude || !b?.Latitude) continue;
    const lat1=parseFloat(a.Latitude), lng1=parseFloat(a.Longitude);
    const lat2=parseFloat(b.Latitude), lng2=parseFloat(b.Longitude);
    const dist = distMetres(lat1,lng1,lat2,lng2);
    const bear = bearingBetween(lat1,lng1,lat2,lng2);
    const segTime = dist / AVG_SPEED_MPS;
    const t = new Date(Date.now() + (elapsed + segTime/2)*1000);
    const sun = getSunAtTime(t);
    segments.push({ bear, dist, sun, segTime });
    elapsed += segTime;
  }
  if (!segments.length) return null;
  let leftSun=0, rightSun=0, totalDist=0;
  segments.forEach(seg => {
    if (seg.sun.alt < 3) return;
    const rel = (seg.sun.az - seg.bear + 360) % 360;
    const sunOnRight = rel < 180;
    const score = Math.abs(Math.sin(rel*Math.PI/180)) * Math.sin(Math.abs(seg.sun.alt)*Math.PI/180);
    if (sunOnRight) rightSun += score * seg.dist;
    else leftSun += score * seg.dist;
    totalDist += seg.dist;
  });
  const totalMins = Math.round(segments.reduce((a,s)=>a+s.segTime,0)/60);
  const leftPct = Math.round(leftSun/(totalDist||1)*100);
  const rightPct = Math.round(rightSun/(totalDist||1)*100);
  const recSide = leftPct <= rightPct ? 'left' : 'right';
  const sunSide = recSide === 'left' ? 'right' : 'left';
  const avoidPct = Math.max(leftPct, rightPct);
  return { recSide, sunSide, avoidPct, totalMins };
}

function switchDir(i) {
  if (!routeData) return Promise.resolve();
  routeData.currentDir = i;
  return fetchAllStops()
    .then(stops => renderRoute(routeData, stops))
    .catch(() => renderRoute(routeData, ALL_STOPS || null));
}

// ── UNIFIED STOP SEARCH ──
let unifiedTimer = null;
let unifiedMatches = [];
let unifiedHighlight = -1;

function onUnifiedInput() {
  clearTimeout(unifiedTimer);
  unifiedTimer = setTimeout(runUnifiedSearch, 150);
}

function runUnifiedSearch() {
  const raw = document.getElementById('stopInput').value.trim();
  const box = document.getElementById('unifiedResults');
  if (!raw) { showRecentStops(); return; }

  // Pure digits → code search
  const isCode = /^\d+$/.test(raw);

  if (!ALL_STOPS) {
    // Load stops in background, show loading state
    box.className = 'stop-name-results open';
    box.innerHTML = '<div class="sn-empty">Loading stop database…</div>';
    fetchAllStops().then(() => runUnifiedSearch()).catch(() => {});
    return;
  }

  const q = raw.toLowerCase();
  const words = q.split(/\s+/);
  unifiedMatches = ALL_STOPS.filter(s => {
    if (isCode) return s.BusStopCode.startsWith(raw);
    const haystack = (s.Description + ' ' + s.RoadName + ' ' + String(s.BusStopCode ?? '')).toLowerCase();
    return words.every(w => haystack.includes(w));
  }).slice(0, 10);

  if (!unifiedMatches.length) {
    box.className = 'stop-name-results open';
    box.innerHTML = `<div class="sn-empty">No stops found for "<strong>${raw}</strong>"</div>`;
    unifiedHighlight = -1;
    return;
  }

  unifiedHighlight = -1;
  box.className = 'stop-name-results open';
  renderUnifiedResults();

  // If exact 5-digit code match, auto-load immediately
  if (isCode && raw.length === 5 && unifiedMatches.length === 1 && unifiedMatches[0].BusStopCode === raw) {
    selectUnifiedStop(0);
  }
}

function renderUnifiedResults() {
  const box = document.getElementById('unifiedResults');
  box.innerHTML = unifiedMatches.map((s, i) => `
    <div class="sn-item${i===unifiedHighlight?' highlighted':''}" onclick="selectUnifiedStop(${i})">
      <div class="sn-code">${s.BusStopCode}</div>
      <div class="sn-info">
        <div class="sn-name">${stopLabel(s.Description, true)}</div>
        <div class="sn-road">${s.RoadName}</div>
      </div>
    </div>`).join('');
}

function selectUnifiedStop(i) {
  const s = unifiedMatches[i];
  if (!s) return;
  document.getElementById('stopInput').value = s.Description;
  lastStopCode = s.BusStopCode;
  closeUnified();
  document.getElementById('quickChips').style.display = 'none';
  document.getElementById('nearbySection').style.display = 'none';
  document.getElementById('results-stop').innerHTML =
    `<div class="loading-state"><div class="bus-loader"><i class="fa-solid fa-bus"></i></div><div class="loading-txt">Fetching arrivals…</div></div>`;
  fetchLTA(s.BusStopCode).then(data => {
    render(s.BusStopCode, data);
    rememberStopHistory(s.BusStopCode);
    updateFavButtons();
  }).catch(e => {
    document.getElementById('results-stop').innerHTML = `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`;
  });
}

function moveUnified(dir) {
  unifiedHighlight = Math.max(-1, Math.min(unifiedMatches.length-1, unifiedHighlight + dir));
  renderUnifiedResults();
}

function closeUnified() {
  const box = document.getElementById('unifiedResults');
  if (box) { box.className = 'stop-name-results'; box.innerHTML = ''; }
  unifiedHighlight = -1;
}

function clearStopSearch() {
  document.getElementById('stopInput').value = '';
  lastStopCode = null;
  closeUnified();
  document.getElementById('results-stop').innerHTML = '';
  document.getElementById('quickChips').style.display = 'block';
  document.getElementById('nearbySection').style.display = 'none';
}

function clearServiceSearch() {
  document.getElementById('serviceInput').value = '';
  document.getElementById('results-service').innerHTML = '';
  setServiceBrowseVisible(true);
}


// ── LTA FETCH ──
// Fetches live bus arrival times from LTA DataMall v3 via the Cloudflare Worker
// proxy (which holds the API key so it never touches the browser). The proxy
// also handles CORS. We pass an empty headers object — App Check was removed
// since the worker's CORS origin check is sufficient for our threat model.
async function fetchLTA(code) {
  const url = PROXY_URL + '?endpoint=BusArrival&BusStopCode=' + code;
  let res;
  try { res = await fetch(url, { headers: await getProxyHeaders() }); } catch(e) {
    throw new Error('LTA DataMall for bus arrivals is currently unavailable. Please try again shortly.');
  }
  if (!res.ok) throw new Error('LTA DataMall for bus arrivals is currently unavailable. Please try again shortly.');
  let json;
  try { json = await res.json(); } catch(e) {
    throw new Error('LTA DataMall for bus arrivals is currently unavailable. Please try again shortly.');
  }
  if (json.error) throw new Error('LTA DataMall for bus arrivals is currently unavailable. Please try again shortly.');
  if (!json.Services) throw new Error('LTA DataMall for bus arrivals is currently unavailable. Please try again shortly.');
  return { Services: json.Services };
}

// ── FETCH ALL BUS STOPS (paginated, cached) ──
function setNearMeSub(text) {
  const el = document.getElementById('nearMeSub');
  if (el) el.textContent = text;
}

async function fetchAllStops() {
  if (ALL_STOPS) return ALL_STOPS;
  try {
    const cached = localStorage.getItem('shiokbus_stops');
    if (cached) { ALL_STOPS = JSON.parse(cached); return ALL_STOPS; }
  } catch(e) {}
  setNearMeSub('Loading stop database…');
  const res = await fetch(`${PROXY_URL}?endpoint=static&file=stops.json`, { headers: await getProxyHeaders() });
  if (!res.ok) throw new Error('Failed to load stops.');
  ALL_STOPS = await res.json();
  try { localStorage.setItem('shiokbus_stops', JSON.stringify(ALL_STOPS)); } catch(e) {}
  if (PRIVATE_SERVICES) injectPrivateIntoStops();
  setNearMeSub(`${ALL_STOPS.length.toLocaleString()} stops loaded`);
  return ALL_STOPS;
}

// ── FETCH ALL BUS SERVICES (paginated, cached) ──
// Hardcoded double-loop destination → label map
// Key: "ServiceNo:DestinationCode", Value: short label shown under bus icon
const DOUBLE_LOOP_LABELS = {
  '291:75121': 'St 81',   // Tampines St 81 loop
  '291:76199': 'St 91',   // Tampines St 91 loop
  '293:76051': 'St 71',   // Tampines St 71 loop
  '293:76199': 'St 91',   // Tampines St 91 loop
  '358:77199': 'Dr 10',   // Pasir Ris Dr 10 loop
  '358:78101': 'Dr 4',    // Pasir Ris Dr 4 loop
  '359:77199': 'St 71',   // Pasir Ris St 71 loop
  '359:77171': 'St 72',   // Pasir Ris St 72 loop
  '812:59072': 'Ave 4',   // Yishun Ave 4 loop
  '812:59073': 'Ave 5',   // Yishun Ave 5 loop
};
const DOUBLE_LOOP_SERVICES = new Set(['291','293','358','359','812']);

// ── LOOP SERVICE DESTINATION LABELS ──
// For loop services (same origin + destination), the bus pill shows:
//   - outbound leg (seq <= mid): from=terminal,  to=loopDesc
//   - inbound leg  (seq >  mid): from=loopDesc,  to=terminal
// mid = max StopSequence of stops sharing the prefix of the middle stop in route.

let LOOP_SVC_MIDPOINTS= {};

// Fetch the external JSON file
fetch('./assets/loop-midpoints.json')
  .then(response => response.json())
  .then(data => {
    LOOP_SVC_MIDPOINTS = data;
  })
  .catch(err => {
    console.error("Failed to load loop midpoints:", err);
    toast('<i class="fa-solid fa-triangle-exclamation"></i> Loop route data failed to load — some service labels may be incorrect.');
  });

let LOOPDESC_CLEAR = new Set();

fetch('./assets/loop-desc-clear.json')
  .then(r => r.json())
  .then(data => { LOOPDESC_CLEAR = new Set(data); })
  .catch(err => {
    console.error('Failed to load loop-desc-clear:', err);
    toast('<i class="fa-solid fa-triangle-exclamation"></i> Loop descriptor data failed to load — some service labels may be incorrect.');
  });

// Dual-loop services (e.g. 358): two directions both looping from the same terminal,
// each with its own LoopDesc. Loaded from build-time generated dual-loops.json.
// Format: { "291": { dir1: "Tampines St 81", dir2: "Tampines St 32" }, ... }
let DUAL_LOOP_SVCS = {};

fetch('./assets/dual-loops.json')
  .then(r => r.json())
  .then(data => { DUAL_LOOP_SVCS = data; })
  .catch(() => {}); // non-critical — falls back to runtime detection

// Cache: serviceNo -> { stopCode: StopSequence, _midSeq: number }
const _loopSeqCache = {};

// For loop services (same origin and destination, e.g. 972 Bt Panjang ↻),
// the bus pill needs to show whether this particular bus is heading outbound
// (toward the loop turnaround) or inbound (back to the terminal).
// We determine this by comparing the current stop's sequence number against
// the midpoint sequence stored in loop-midpoints.json. If the route hasn't
// been fetched yet, we kick off a background fetch and return an outbound
// guess in the meantime — the DOM is patched once the fetch resolves.
function getLoopDestLabel(serviceNo, currentStopCode) {
  const info = LOOP_SVC_MIDPOINTS[serviceNo];
  if (!info) return { from: null, to: null };

  // Support both old format ({terminalCode, loopDesc, mid}) and new format ({BusStopCode, Description, StopSequence})
  const mid = info.mid != null ? info.mid : info.StopSequence;
  // loopLabel = the waypoint road name (e.g. "Bencoolen St", "Temasek Ave")
  const loopLabel = info.loopDesc || (/int|stn|hub|ter|ctr|zoo|wetland reserve/i.test(info.Description) ? info.Description : null) || info.RoadName || '';
  // homeName = the scheduled terminal from ALL_SERVICES (e.g. "Bt Panjang Int" for 972)
  const svcData = ALL_SERVICES?.[normalizeServiceNo(serviceNo) + '-1'];
  const homeCode = svcData?.OriginCode;
  const homeName = (homeCode ? stopName(homeCode) : null) || loopLabel;
  const outbound = { from: homeName,  to: loopLabel };
  const inbound  = { from: loopLabel, to: homeName  };

  const loopStopCode = info.BusStopCode;

  // If the current stop IS the midpoint, always show it on top
  if (currentStopCode === loopStopCode) {
    return { from: loopLabel, to: homeName };
  }

  // Check static mid first (synchronous, no fetch needed)
  const cached = _loopSeqCache[serviceNo];
  if (cached) {
    const seq = cached[currentStopCode];
    return (seq != null && seq > mid) ? inbound : outbound;
  }

  // Fetch route once to get stop sequences, then re-render
  if (!_loopSeqCache[serviceNo + '_pending']) {
    _loopSeqCache[serviceNo + '_pending'] = true;
    fetchBusRoute(serviceNo).then(stops => {
    const map = {};
    stops.forEach(s => {
      const prev = map[s.BusStopCode];
      // For the terminal stop, use MIN sequence (it's stop 1 on outbound, not inbound)
      // For all other stops, use MAX sequence (inbound leg takes priority)
      if (s.BusStopCode === homeCode) {
        if (prev == null || s.StopSequence < prev) map[s.BusStopCode] = s.StopSequence;
      } else {
        if (prev == null || s.StopSequence > prev) map[s.BusStopCode] = s.StopSequence;
      }
    });
      _loopSeqCache[serviceNo] = map;
      delete _loopSeqCache[serviceNo + '_pending'];
      const seq = map[currentStopCode];
      const labels = (seq != null && seq > mid) ? inbound : outbound;

      document.querySelectorAll('.bus-num-col').forEach(col => {
        const numEl = col.querySelector('.bus-num');
        if (!numEl) return;
        const norm = t => t.trim().replace(/^0+/, '').toUpperCase();
        if (norm(numEl.textContent) !== norm(serviceNo)) return;
        const fromEl = col.querySelector('.bus-num-from');
        const toEl   = col.querySelector('.bus-num-to');
        if (fromEl) fromEl.textContent = labels.from || '';
        if (toEl)   toEl.textContent   = labels.to   || '';
      });
    }).catch(() => { delete _loopSeqCache[serviceNo + '_pending']; });
  }

  return outbound; // best guess while fetch is in-flight
}

function getDualLoopDestLabel(serviceNo, currentStopCode) {
  // Dual-loop: Terminal → West Loop turnaround → Terminal → East Loop turnaround → Terminal
  // Segments:
  //   1: Terminal → West turnaround  (outbound west)
  //   2: West turnaround → Terminal  (inbound west / same road as outbound east start)
  //   3: Terminal → East turnaround  (outbound east)
  //   4: East turnaround → Terminal  (inbound east)
  const dualData = DUAL_LOOP_SVCS[serviceNo];
  if (!dualData) return { from: null, to: null };

  const svcData = ALL_SERVICES?.[normalizeServiceNo(serviceNo) + '-1'];
  const homeCode = svcData?.OriginCode;
  const homeName = homeCode ? stopName(homeCode) : serviceNo;
  const loop1Label = dualData.dir1 || '';
  const loop2Label = dualData.dir2 || '';

  // At the terminal stop itself — show both loop labels on separate lines
  if (homeCode && currentStopCode === homeCode) {
    const bothLoops = [loop1Label, loop2Label].filter(Boolean).join('\n');
    return { from: homeName, to: bothLoops };
  }

  const cacheKey = 'dual_' + serviceNo;
  const cached = _loopSeqCache[cacheKey];

  function labelFromSeq(seq, seqMap) {
    // seqMap has special keys: _term1 (first terminal seq=1), _term2 (mid terminal return), _term3 (last)
    // _loop1 = turnaround stop seq for west loop
    // _loop2 = turnaround stop seq for east loop
    const term2 = seqMap._term2; // sequence where bus returns to terminal between loops
    const loop1 = seqMap._loop1;
    const loop2 = seqMap._loop2;
    if (!term2) return { from: homeName, to: loop1Label || loop2Label };
    if (seq <= loop1)       return { from: homeName,    to: loop1Label }; // outbound west
    if (seq <= term2)       return { from: loop1Label,  to: homeName   }; // inbound west
    if (seq <= loop2)       return { from: homeName,    to: loop2Label }; // outbound east
    return                         { from: loop2Label,  to: homeName   }; // inbound east
  }

  if (cached) {
    const seq = cached[currentStopCode];
    if (seq != null) return labelFromSeq(seq, cached);
    return { from: homeName, to: loop1Label };
  }

  // Fetch route once to map stop codes to sequences
  if (!_loopSeqCache[cacheKey + '_pending']) {
    _loopSeqCache[cacheKey + '_pending'] = true;
    fetchBusRoute(serviceNo).then(stops => {
      const map = {};
      // Build sequence map: for stops appearing multiple times, use MAX seq
      // (except terminal — use MIN so stop #1 shows as outbound)
      stops.forEach(s => {
        const prev = map[s.BusStopCode];
        if (s.BusStopCode === homeCode) {
          if (prev == null || s.StopSequence < prev) map[s.BusStopCode] = s.StopSequence;
        } else {
          if (prev == null || s.StopSequence > prev) map[s.BusStopCode] = s.StopSequence;
        }
      });

      // Find the terminal's appearances (sorted ascending)
      const termSeqs = stops
        .filter(s => s.BusStopCode === homeCode)
        .map(s => s.StopSequence)
        .sort((a, b) => a - b);
      // termSeqs[0]=1 (start), termSeqs[1]=mid-return, termSeqs[2]=end
      map._term2 = termSeqs[1] || null;

      // West loop turnaround: use loop-midpoints.json StopSequence if available
      // (more accurate than max-seq, as it points to the actual road midpoint)
      const midpointInfo = LOOP_SVC_MIDPOINTS[serviceNo + 'West'];
      if (midpointInfo?.StopSequence) {
        map._loop1 = midpointInfo.StopSequence;
      } else {
        // Fallback: midpoint of west loop stop range
        const westStops = stops.filter(s =>
          s.StopSequence > (termSeqs[0] || 0) &&
          s.StopSequence < (termSeqs[1] || Infinity) &&
          s.BusStopCode !== homeCode
        );
        const wMid = Math.floor(westStops.length / 2);
        map._loop1 = westStops[wMid]?.StopSequence ?? null;
      }

      // East loop turnaround: use loop-midpoints.json "358E" entry if available
      const eastMidpointInfo = LOOP_SVC_MIDPOINTS[serviceNo + 'East'];
      if (eastMidpointInfo?.StopSequence) {
        map._loop2 = eastMidpointInfo.StopSequence;
        // Also use the stored _term2 from the east loop entry for accuracy
        if (eastMidpointInfo._term2) map._term2 = eastMidpointInfo._term2;
      } else {
        // Fallback: midpoint of east loop stop range
        const eastStops = stops.filter(s =>
          s.StopSequence > (termSeqs[1] || 0) &&
          s.StopSequence < (termSeqs[2] || Infinity) &&
          s.BusStopCode !== homeCode
        );
        const eMid = Math.floor(eastStops.length / 2);
        map._loop2 = eastStops[eMid]?.StopSequence ?? null;
      }

      _loopSeqCache[cacheKey] = map;
      delete _loopSeqCache[cacheKey + '_pending'];

      // Re-render all visible pills for this service
      document.querySelectorAll('.bus-num-col').forEach(col => {
        const numEl = col.querySelector('.bus-num');
        if (!numEl) return;
        const norm = t => t.trim().replace(/^0+/, '').toUpperCase();
        if (norm(numEl.textContent) !== norm(serviceNo)) return;
        // Get the stop code this card is for
        const card = col.closest('.bus-card');
        if (!card) return;
        const stopCode = card.dataset.stopCode;
        if (!stopCode) return;
        const seq = map[stopCode];
        const labels = seq != null ? labelFromSeq(seq, map) : { from: homeName, to: loop1Label };
        const fromEl = col.querySelector('.bus-num-from');
        const toEl   = col.querySelector('.bus-num-to');
        if (fromEl) fromEl.textContent = labels.from || '';
        if (toEl)   toEl.textContent   = labels.to   || '';
      });
    }).catch(() => { delete _loopSeqCache[cacheKey + '_pending']; });
  }

  return { from: homeName, to: [loop1Label, loop2Label].filter(Boolean).join('\n') }; // best guess while fetch is in-flight
}

// LTA stores services like "NR1", "518e", "10e" inconsistently across datasets.
// This normalises the trailing E suffix to lowercase so lookups match regardless
// of whether the user typed "10E" or "10e" or "10e" came from the API.
function normalizeServiceNo(svc) {
  // Normalize trailing E to lowercase to match user input normalization
  return String(svc).replace(/^(\d+)E$/, '$1e');
}

// Transforms the flat LTA bus services array into a lookup map keyed by
// "ServiceNo-Direction" (e.g. "123-1", "123-2"). This avoids an O(n) scan
// every time we need to look up a service's metadata during rendering.
// Also applies manual LoopDesc overrides for services where LTA's data is
// wrong or missing, and clears LoopDesc for services that LTA incorrectly
// marks as loops.
function indexServices(raw) {
  if (!Array.isArray(raw)) return raw; // already indexed
  const map = {};
  raw.forEach(s => {
    if (s.ServiceNo != null && s.Direction != null && !EXCLUDED_SERVICES.has(String(s.ServiceNo).toUpperCase()))
      map[normalizeServiceNo(s.ServiceNo) + '-' + s.Direction] = s;
  });

  // Hardcoded LoopDesc overrides for services missing them in the source data, or inaccurate ones
  const LOOPDESC_OVERRIDES = {
    '92-1':   'Science Pk Dr',
    '146-1':  "Hougang St 21",
    '230M-1': 'Kim Keat Ave',
    '299-1':  'Tampines St 96',
    '456-1':  'Thomson Rd',
    '805-1':  'Yishun Ave 1',
  };
  for (const [key, loopDesc] of Object.entries(LOOPDESC_OVERRIDES)) {
    if (map[key]) map[key] = { ...map[key], LoopDesc: loopDesc };
  }

  // Clear LoopDesc for services which have a LoopDesc but are actually not a loop
  for (const key of [...LOOPDESC_CLEAR].map(s => s + '-1')) {
    if (map[key]) map[key] = { ...map[key], LoopDesc: '' };
  }

  return map;
}

// Loads private bus service data from local JSON assets — PBS timetables
// (hand-curated from operator PDFs) and Sentosa island bus schedules.
// Both datasets are merged into a single PRIVATE_SERVICES object and then
// injected into ALL_SERVICES and ALL_STOPS so the rest of the app can treat
// them identically to LTA public services. If either file is missing the app
// degrades gracefully and just shows public services only.
async function fetchPBSServices() {
  if (PRIVATE_SERVICES) return PRIVATE_SERVICES;
  try {
    const [resPBS, resSentosa] = await Promise.all([
      fetch('./assets/pbs-services.json'),
      fetch('./assets/sentosa-services.json').catch(() => null)
    ]);
    if (!resPBS.ok) return null;
    PRIVATE_SERVICES = await resPBS.json();
    // Merge Sentosa services into PRIVATE_SERVICES so they go through the same pipeline
    if (resSentosa?.ok) {
      const sentosaData = await resSentosa.json();
      Object.values(sentosaData).forEach(svc => { svc._isSentosa = true; });
      Object.assign(PRIVATE_SERVICES, sentosaData);
    }
    if (ALL_SERVICES) injectPrivateIntoServices();
    if (ALL_STOPS) injectPrivateIntoStops();
    return PRIVATE_SERVICES;
  } catch(e) {
    console.error('Failed to load private services:', e);
    return null;
  }
}

// Merges private services into ALL_SERVICES so they appear in search results
// and route lookups alongside LTA public services. Also rebuilds PRIVATE_STOP_INDEX
// — a map from BusStopCode to every private service stop entry at that code.
// This index is what makes expanding a shared stop like Beach Station (14539)
// show *all* services calling there in O(1) rather than scanning every service.
// TTS and Tong Tar Transport get their own operator colour; everything else
// gets the generic "private" navy treatment.
function injectPrivateIntoServices() {
  if (!PRIVATE_SERVICES || !ALL_SERVICES) return;
  PRIVATE_STOP_INDEX = {}; // rebuild index on each injection
  for (const [key, svc] of Object.entries(PRIVATE_SERVICES)) {
    for (const [dirKey, dir] of Object.entries(svc.Directions)) {
      const serviceKey = normalizeServiceNo(svc.ServiceNo.toUpperCase()) + '-' + dirKey;
      ALL_SERVICES[serviceKey] = {
        ServiceNo: svc.ServiceNo,
        Operator: svc.Operator,
        Direction: parseInt(dirKey),
        Category: svc.Category || 'SHUTTLE',
        OriginCode: dir.OriginCode || '',
        OriginDesc: dir.OriginDesc || '',
        DestinationCode: dir.DestinationCode || '',
        DestinationDesc: dir.DestinationDesc || '',
        AM_Peak_Freq: '-', AM_Offpeak_Freq: '-', PM_Peak_Freq: '-', PM_Offpeak_Freq: '-',
        LoopDesc: svc.LoopDesc || dir.LoopDesc || '',
        Fare: svc.Fare,
        OperatingHours: dir.OperatingHours,
        _isPrivate: !['TTS','TONG TAR TRANSPORT'].includes((svc.Operator||'').toUpperCase()),
        _isScheduled: true,
      };
      // Index stops by BusStopCode for O(1) lookup in buildPBSArrivalRows
      for (const stop of dir.Stops) {
        // Attach _pbsStop so buildSinglePrivateRow can access Timings/StopOffsetMins
        if (!stop._pbsStop) stop._pbsStop = stop;
        // Attach service metadata needed for row rendering
        if (!stop.ServiceNo) stop.ServiceNo = svc.ServiceNo;
        if (!stop.Operator) stop.Operator = svc.Operator;
        if (!stop.Direction) stop.Direction = parseInt(dirKey);
        if (stop.BusStopCode) {
          if (!PRIVATE_STOP_INDEX[stop.BusStopCode]) PRIVATE_STOP_INDEX[stop.BusStopCode] = [];
          const already = PRIVATE_STOP_INDEX[stop.BusStopCode].some(
            e => e.ServiceNo === stop.ServiceNo && e.Direction === stop.Direction
          );
          if (!already) PRIVATE_STOP_INDEX[stop.BusStopCode].push(stop);
        }
      }
    }
  }
}

// Adds private service stops that aren't in LTA's stop database into ALL_STOPS.
// This lets stop search, nearby, and the plan-trip dropdown find them without
// any private-specific code paths — they just look like regular stops with a
// _isPrivate flag. Stops that already exist in ALL_STOPS (shared with public
// services, like Beach Station 14539) are skipped to avoid duplicates.
function injectPrivateIntoStops() {
  if (!PRIVATE_SERVICES || !ALL_STOPS) return;
  const existingCodes = new Set(ALL_STOPS.map(s => s.BusStopCode));
  const toAdd = [];
  for (const svc of Object.values(PRIVATE_SERVICES)) {
    for (const dir of Object.values(svc.Directions)) {
      for (const stop of dir.Stops) {
        if (!stop.BusStopCode || existingCodes.has(stop.BusStopCode)) continue;
        existingCodes.add(stop.BusStopCode);
        toAdd.push({
          BusStopCode: stop.BusStopCode,
          RoadName: stop.RoadName || '',
          Description: stop.Description || '',
          Latitude: stop.Latitude || 0,
          Longitude: stop.Longitude || 0,
          _isPrivate: true,
        });
      }
    }
  }
  if (toAdd.length) ALL_STOPS = ALL_STOPS.concat(toAdd);
}

async function fetchAllServices() {
  if (ALL_SERVICES) return ALL_SERVICES;
  try {
    const cached = localStorage.getItem('shiokbus_services');
    if (cached) { ALL_SERVICES = indexServices(JSON.parse(cached)); return ALL_SERVICES; }
  } catch(e) {}
  const res = await fetch(`${PROXY_URL}?endpoint=static&file=bus-services.json`, { headers: await getProxyHeaders() });
  if (!res.ok) throw new Error('Failed to load services.');
  const raw = await res.json();
  try { localStorage.setItem('shiokbus_services', JSON.stringify(raw)); } catch(e) {}
  ALL_SERVICES = indexServices(raw);
  if (PRIVATE_SERVICES) injectPrivateIntoServices();
  return ALL_SERVICES;
}

// ── NEAR ME ──
// Uses the browser Geolocation API to find the user's position, then sorts
// ALL_STOPS by haversine distance and renders the nearest ones. We request
// high accuracy and keep a generous 10-second timeout — GPS can be slow
// indoors or when the device has just woken up. Walking time is estimated
// at 80m/min (a comfortable walking pace on Singapore footpaths).
async function findNearby() {
  const btn = document.getElementById('nearMeBtn');
  const sub = document.getElementById('nearMeSub');

  // Get GPS
  if (!navigator.geolocation) {
    toast('<i class="fa-solid fa-circle-xmark"></i> Geolocation not supported by your browser');
    return;
  }

  btn.classList.add('loading');
  if (sub) sub.textContent = 'Getting your location…';

  let pos;
  try {
    pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    );
  } catch(e) {
    btn.classList.remove('loading');
    
    toast('<i class="fa-solid fa-circle-xmark"></i> Location access denied. Allow location in your browser settings.');
    return;
  }

  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;
  if (sub) sub.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;

  // Fetch/use cached stop list
  let stops;
  try {
    stops = await fetchAllStops();
  } catch(e) {
    btn.classList.remove('loading');
    
    toast('<i class="fa-solid fa-circle-xmark"></i> ' + e.message);
    return;
  }

  // Compute distances and sort
  const withDist = stops.map(s => ({
    ...s,
    dist: haversine(userLat, userLng, parseFloat(s.Latitude), parseFloat(s.Longitude))
  }));
  withDist.sort((a,b) => a.dist - b.dist);
  const top10 = withDist.slice(0, 10);

  btn.classList.remove('loading');
  if (sub) sub.textContent = `${stops.length.toLocaleString()} stops searched`;

  renderNearby(top10);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // metres
  const φ1 = lat1*Math.PI/180, φ2 = lat2*Math.PI/180;
  const dφ = (lat2-lat1)*Math.PI/180;
  const dλ = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderNearby(stops) {
  document.getElementById('quickChips').style.display = 'none';
  document.getElementById('nearbySection').style.display = 'block';
  document.getElementById('nearbySubtitle').textContent =
    `10 closest stops · your location updated now`;

  let html = '';
  stops.forEach((s, i) => {
    const dist = Math.round(s.dist);
    const walkMins = Math.ceil(dist / 80); // ~80m per min walking
    const distLabel = dist >= 1000 ? (dist/1000).toFixed(1)+'km' : dist+'m';
    html += `
      <div class="nearby-stop" style="animation-delay:${i*0.05}s" onclick="quickLoad('${s.BusStopCode}')">
        <div class="nearby-rank">${i+1}</div>
        <div class="nearby-stop-info">
          <div class="nearby-stop-name">${stopLabel(s.Description)}</div>
          <div class="nearby-stop-code">${s.BusStopCode} · ${s.RoadName}</div>
        </div>
        <div class="nearby-dist">
          <div class="nearby-dist-m">${distLabel}</div>
          <div class="nearby-dist-lbl">away</div>
          <div class="nearby-walk">~${walkMins} min walk</div>
        </div>
        <button class="fav-btn" data-key="stop_${s.BusStopCode}" onclick="event.stopPropagation();addStopFav('${s.BusStopCode}','${s.Description}','${s.RoadName}')" style="font-size:18px;flex-shrink:0;color:${(window._favs||{})['stop_'+s.BusStopCode]?'var(--yellow)':'var(--muted)'}">${(window._favs||{})['stop_'+s.BusStopCode]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
      </div>`;
  });

  document.getElementById('nearbyList').innerHTML = html;
}

function clearNearby() {
  document.getElementById('nearbySection').style.display = 'none';
  // Only show interchanges if no stop has been searched yet
  const results = document.getElementById('results-stop');
  if (!results.innerHTML.trim()) {
    document.getElementById('quickChips').style.display = 'block';
  }
  
}

// ── PRIVATE STOP VIEW HELPERS ──
function getPrivateServicesForStop(code) {
  if (!PRIVATE_SERVICES) return [];
  const results = [];
  for (const [svcKey, privateSvc] of Object.entries(PRIVATE_SERVICES)) {
    if (!isServiceOperatingToday(privateSvc.ServiceNo)) continue;
    for (const [dirKey, dir] of Object.entries(privateSvc.Directions)) {
      const match = dir.Stops.find(s => s.BusStopCode && String(s.BusStopCode) === String(code));
      if (match) results.push({ svcKey, privateSvc, dirKey, dir, stop: match });
    }
  }
  return results;
}

// ── PUBLIC HOLIDAY & WEEKEND SERVICE EXCLUSIONS ──────────────────────────────
// PBS services and certain LTA-operated services (LCS1, LCS2) do not run on
// weekends or public holidays. PUBLIC_HOLIDAYS lists all Singapore public
// holidays for the current year — update this set annually.
const PUBLIC_HOLIDAYS = new Set([
  '2026-01-01', '2026-02-17', '2026-02-18',
  '2026-03-21', '2026-04-03', '2026-05-01',
  '2026-05-27', '2026-05-31', '2026-06-01',
  '2026-08-09', '2026-08-10', '2026-11-08',
  '2026-11-09', '2026-12-25'
]);

// LTA-operated services that follow the same weekday-only rule as PBS.
const WEEKDAY_ONLY_SERVICES = new Set(['LCS1', 'LCS2']);

function isTodayPublicHoliday() {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return PUBLIC_HOLIDAYS.has(today);
}

function isTodayWeekend() {
  const dow = new Date().getDay(); // 0 = Sun, 6 = Sat
  return dow === 0 || dow === 6;
}

// Returns false if the service should not operate today (weekend or public holiday).
// Applies to all PBS (PRIVATE_SERVICES) entries and explicitly listed LTA services.
function isServiceOperatingToday(serviceNo) {
  if (!serviceNo) return true;
  const svc = serviceNo.toUpperCase().replace(/\s+/g, '');
  const match = PRIVATE_SERVICES && (
    PRIVATE_SERVICES[svc] ||
    Object.values(PRIVATE_SERVICES).find(p =>
      p.ServiceNo.toUpperCase().replace(/\s+/g, '') === svc
    )
  );
  const isPBS = !!match && !match._isSentosa;   // ← this line
  const isWeekdayOnly = WEEKDAY_ONLY_SERVICES.has(svc);
  if (isPBS || isWeekdayOnly) {
    if (isTodayWeekend() || isTodayPublicHoliday()) return false;
  }
  return true;
}

// ── OPERATING HOURS CHECKER ──────────────────────────────────────────────────
// Returns true if the service is currently operating based on its OperatingHours string.
// Handles day-of-week restrictions and time windows.
// Parses a human-readable operating hours string like "Daily 7:00am – 12:10am"
// or "Fri/Sat/Sun & PH, 6:00pm – 9:00pm" and checks whether the service is
// currently running. Handles day-of-week restrictions, time windows that cross
// midnight, and one-off single-trip services. The dayOnly flag is used when
// the caller wants to gate on day-of-week only (e.g. PBS timetable rendering)
// and handles the time filtering itself via the Timings data.
function isServiceOperatingNow(operatingHours, dayOnly = false) {
  if (!operatingHours) return true; // no restriction — assume always on

  const now = new Date();
  const dow = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const h = operatingHours;

  // ── Day-of-week detection ────────────────────────────────────────────────
  const isWeekday  = dow >= 1 && dow <= 5; // Mon–Fri
  const isSat      = dow === 6;
  const isSun      = dow === 0;
  const isWeekend  = isSat || isSun;

  if (/fri.*sat.*sun/i.test(h)) {
    if (dow !== 5 && dow !== 6 && dow !== 0) return false;
  } else if (/mon.*fri|weekday/i.test(h)) {
    if (!isWeekday) return false;
  } else if (/sat.*sun|weekend/i.test(h)) {
    if (!isWeekend) return false;
  }

  // If dayOnly, skip time window check — caller handles timing via Timings filter
  if (dayOnly) return true;

  // ── Time window detection ────────────────────────────────────────────────
  const timeRange = h.match(/(\d+)(?::(\d+))?\s*(am|pm)\s*[-–to]+\s*(\d+)(?::(\d+))?\s*(am|pm)/i);
  if (timeRange) {
    const toMins = (hh, mm, ampm) => {
      let hrs = parseInt(hh);
      const mins = parseInt(mm || 0);
      if (ampm.toLowerCase() === 'pm' && hrs !== 12) hrs += 12;
      if (ampm.toLowerCase() === 'am' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    const startMins = toMins(timeRange[1], timeRange[2], timeRange[3]);
    let   endMins   = toMins(timeRange[4], timeRange[5], timeRange[6]);
    if (endMins < startMins) endMins += 24 * 60; // past-midnight end
    const nowAdj = nowMins < startMins ? nowMins + 24 * 60 : nowMins;
    // Allow showing 45 min before service starts so commuters can plan ahead
    if (nowAdj < startMins - 45 || nowAdj > endMins) return false;
  }

  // "One trip at X.XXam/pm" — only show within 30 min before departure
  const oneTrip = h.match(/one trip at (\d+)(?:[.:](\d+))?\s*(am|pm)/i);
  if (oneTrip) {
    const toMins = (hh, mm, ampm) => {
      let hrs = parseInt(hh);
      const mins = parseInt(mm || 0);
      if (ampm.toLowerCase() === 'pm' && hrs !== 12) hrs += 12;
      if (ampm.toLowerCase() === 'am' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    const tripMins = toMins(oneTrip[1], oneTrip[2], oneTrip[3]);
    // Show only 45 min before until 10 min after trip time
    if (nowMins < tripMins - 45 || nowMins > tripMins + 10) return false;
  }

  return true;
}

// Computes estimated arrival times for frequency-based private services
// (Sentosa buses, etc.) that don't have fixed timetables. Treats the service
// as running at perfectly even headways from the start of its operating day,
// then finds all buses that are currently en route or about to depart within
// the next 45 minutes. Walks backward from the current cycle position far
// enough to catch buses that left the origin several intervals ago but haven't
// reached this stop yet — important for stops with high StopOffsetMins.
// Computes estimated arrival times for frequency-based private services
// (Sentosa buses, etc.) that don't have fixed timetables. Treats the service
// as running at perfectly even headways from the start of its operating day,
// then finds all buses that are currently en route or about to depart within
// the next 45 minutes. Walks backward from the current cycle position far
// enough to catch buses that left the origin several intervals ago but haven't
// reached this stop yet — important for stops with high StopOffsetMins.
function synthesisePrivateArrivals(privateSvc, dir, stopOffset = 0) {

  const freq = dir.Frequency || privateSvc.Frequency || '';
  const hours = dir.OperatingHours || privateSvc.OperatingHours || '';
  // Check day-of-week and time window before doing anything else
  if (!isServiceOperatingNow(hours)) return null;
  const freqMatch = freq.match(/(\d+)(?:[-–](\d+))?/);
  if (!freqMatch) return null;
  const freqMin = parseInt(freqMatch[1]);
  const freqMax = freqMatch[2] ? parseInt(freqMatch[2]) : freqMin;
  const interval = Math.round((freqMin + freqMax) / 2);
  const hoursMatch = hours.match(/(\d+)(?::(\d+))?\s*(am|pm)\s*[-–]\s*(\d+)(?::(\d+))?\s*(am|pm)/i);
  let startMins = 7 * 60, endMins = 24 * 60 + 10;
  if (hoursMatch) {
    const toMins = (h, m, ampm) => {
      let hrs = parseInt(h); const mins = parseInt(m || 0);
      if (ampm.toLowerCase() === 'pm' && hrs !== 12) hrs += 12;
      if (ampm.toLowerCase() === 'am' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    startMins = toMins(hoursMatch[1], hoursMatch[2], hoursMatch[3]);
    endMins   = toMins(hoursMatch[4], hoursMatch[5], hoursMatch[6]);
    if (endMins < startMins) endMins += 24 * 60;
  }
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowAdj = nowMins < startMins ? nowMins + 24 * 60 : nowMins;
  if (nowAdj > endMins) return null;
  // Allow showing up to 45 min before service starts
  if (nowAdj < startMins - 45) return null;
  const elapsed = (nowAdj - startMins) % interval;
  // Walk back far enough to catch buses already en route to this stop.
  // Uses the same logic as buildSinglePrivateRow so both views show identical times.
  const upcoming = [];
  let originDiff = -elapsed;
  while ((originDiff - interval) + stopOffset >= -2) originDiff -= interval;
  while (upcoming.length < 3) {
    const diffMins = originDiff + stopOffset;
    if (diffMins > 45) break;
    if (diffMins >= -2) {
      const arrMins = (nowMins + diffMins + 24 * 60) % (24 * 60);
      const hhmm = String(Math.floor(arrMins / 60)).padStart(2,'0') + ':' + String(arrMins % 60).padStart(2,'0');
      upcoming.push({ diff: diffMins, hhmm });
    }
    originDiff += interval;
  }
  return upcoming.length ? upcoming : null;
}

function buildPrivateStopCard(privateSvc, dir, arrivals, stopCode, cardIndex) {
  const svcNo = privateSvc.ServiceNo;
  const opCls = opClass(privateSvc.Operator, false);
  // Detect loop: origin === destination
  const isLoop = dir.OriginCode && dir.OriginCode === dir.DestinationCode;
  const loopDesc = privateSvc.LoopDesc || dir.LoopDesc || '';
  // Top label: origin name; bottom label: loopDesc (for loops) or destination name
  const originName = dir.OriginDesc || '';
  const bottomName = isLoop ? loopDesc : (dir.DestinationDesc || '');
  const [first, ...rest] = arrivals;
  const label = first.diff <= 0 ? 'ARR' : String(first.diff);
  const unit  = first.diff <= 0 ? '' : 'min';
  const nextPills = rest.map(a =>
    `<div class="next-pill"><span>${a.diff <= 0 ? 'ARR' : a.diff + ' min'}</span></div>`
  ).join('');
  return `
  <div class="bus-card" style="animation-delay:${cardIndex * 0.09}s">
    <div class="card-top">
      <div class="bus-num-col ${opCls}" onclick="goToService('${svcNo}', '${stopCode}')" style="position:relative">
        ${originName ? `<div class="bus-num-from">${originName}</div>` : ''}
        <div class="bus-num">${formatSvcNo(svcNo)}</div>
        ${bottomName ? `<div class="bus-num-to">${bottomName}</div>` : ''}
      </div>
      <div class="card-middle">
        <div class="arrival-row">
          <div class="first-timing">
            <div class="mins-big">${label}</div>
            <div class="mins-unit">${unit}</div>
          </div>
          ${nextPills}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px"><i class="fa-solid fa-triangle-exclamation"></i> Estimated from schedule</div>
      </div>
      <div class="card-right">
        <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">
          <button class="sun-toggle-btn fav-btn" data-key="svc_${svcNo}" onclick="event.stopPropagation();addSvcFavSmart('${svcNo}')" style="background:none;justify-content:center;font-size:16px;color:${(window._favs||{})['svc_'+svcNo]?'var(--yellow)':'var(--muted)'}">${(window._favs||{})['svc_'+svcNo]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function dualLoopVisitLabel(serviceNo, visitNumber) {
  // Returns a short label like "Dr 10" or "Dr 4" for dual-loop buses based on VisitNumber
  // VisitNumber "1" = first loop (west/dir1), "2" = second loop (east/dir2)
  const dualData = DUAL_LOOP_SVCS[normalizeServiceNo(serviceNo.replace(/^0+/,'').toUpperCase())];
  if (!dualData) return null;
  const loopDesc = visitNumber === '2' ? dualData.dir2 : dualData.dir1;
  if (!loopDesc) return null;
  // Extract last 2 words for a compact label e.g. "Pasir Ris Dr 10" → "Dr 10"
  const words = loopDesc.trim().split(/\s+/);
  return words.slice(-2).join(' ');
}

// Renders the full stop arrivals view for a given bus stop code. Takes the
// raw LTA BusArrival API response and builds the bus cards — one per service,
// showing the next three arrival times with load indicators and bus type icons.
// Also prepends any private service cards (PBS, Sentosa) and injects inline
// MRT disruption alerts for services on affected lines. This is the heaviest
// render function in the app; it runs every time the user searches a stop or
// hits Refresh.
function render(code, data) {
  window._lastRenderCode = code;
  const svcs = data.Services || [];
  const stopInfo = ALL_STOPS?.find(s=>s.BusStopCode===code);
  const name = stopInfo?.Description || 'Bus Stop ' + code;
  const road = stopInfo?.RoadName || '';

  if (!svcs.length) {
    document.getElementById('results-stop').innerHTML =
      `<div class="error-card">No bus services found for stop ${code}.</div>`;
    return;
  }

  svcs.sort((a,b) => parseInt(a.ServiceNo) - parseInt(b.ServiceNo) || a.ServiceNo.localeCompare(b.ServiceNo));

  const loadLabels = {SEA:'Seats Avail',SDA:'Standing',LSD:'Crowded'};
  let html = `
    <div class="stop-hero">
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="stop-title" id="stop-title-${code}" style="flex:1;min-width:0">${stopLabel(name, true)}</div>
          <button class="fav-btn" data-key="stop_${code}" title="Favourite this stop" onclick="addStopFav('${code}','${name.replace(/'/g,'')}','${(road||'').replace(/'/g,'')}')\" style="font-size:20px;color:${(window._favs||{})['stop_'+code]?'var(--yellow)':'var(--muted)'}\">${(window._favs||{})['stop_'+code]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
        </div>
        ${road ? `<div class="stop-road-block">(${road})</div>` : ''}
        ${(() => { const si = ALL_STOPS?.find(s=>s.BusStopCode===code); const lat = parseFloat(si?.Latitude), lng = parseFloat(si?.Longitude); const fc = getRainForCoords(lat, lng); return rainBadgeHtml(fc); })()}
      </div>
    </div>
    <div class="refresh-row">
      <div class="results-label">${svcs.length} services</div>
      <button class="refresh-btn" onclick="doSearch()">↻ Refresh</button>
    </div>`;

  svcs.forEach((s,i) => {
    const nb=s.NextBus, nb2=s.NextBus2, nb3=s.NextBus3;
    if (!nb.EstimatedArrival) return; // no bus data at all — skip card
    const m1=minsFrom(nb.EstimatedArrival);
    const m2=nb2.EstimatedArrival ? minsFrom(nb2.EstimatedArrival) : null;
    const m3=nb3.EstimatedArrival ? minsFrom(nb3.EstimatedArrival) : null;
    const arrCls = '';
    const label = m1<=0?'ARR':`${m1}`, unit = m1<=0?'':'min';
    const rec = seatRec(nb.Latitude,nb.Longitude,nb2?.Latitude,nb2?.Longitude);
    const loadColor = {SEA:'var(--green)', SDA:'#FF8C00', LSD:'#FF3333'};
    const _isDualForPill = normalizeServiceNo((s?.ServiceNo||'').replace(/^0+/,'').toUpperCase()) in DUAL_LOOP_SVCS;
    const nextPills = [[m2,nb2],[m3,nb3]].filter(([m])=>m!==null).map(([m,nb]) => {
      const visitLbl = _isDualForPill ? dualLoopVisitLabel(s.ServiceNo, nb.VisitNumber) : null;
      return `<div class="next-pill"><span>${m<=0?'ARR':m+' min'}</span>${busTypeIcon(nb.Type,true,loadColor[nb.Load]||'var(--muted)')}${visitLbl ? `<span style="font-size:8px;color:var(--white);font-weight:700;letter-spacing:.3px">${visitLbl}</span>` : ''}</div>`;
    }).join('');
    const op = (s.Operator||'').toUpperCase();
    const svcKey1 = normalizeServiceNo(s.ServiceNo.replace(/^0+/,'').toUpperCase()) + '-1';
    const svcKey2 = normalizeServiceNo(s.ServiceNo.replace(/^0+/,'').toUpperCase()) + '-2';
    const info1 = ALL_SERVICES?.[svcKey1] || null;
    const info2 = ALL_SERVICES?.[svcKey2] || null;
    const opCls = opClass(op, !!(info1?._isPrivate||info2?._isPrivate));
    // Use origin/destination directly from the live arrival data (per-bus, correct direction)
    // For loop services, getLoopDestLabel returns { from, to } labels.
    // For normal services, use live arrival origin/destination.
    const svcNormKey = normalizeServiceNo(s.ServiceNo.replace(/^0+/, '').toUpperCase());
    const isDualLoopSvc = svcNormKey in DUAL_LOOP_SVCS;
    const isLoopSvc  = !isDualLoopSvc && (svcNormKey in LOOP_SVC_MIDPOINTS);
    let originName, destName;
    if (isDualLoopSvc) {
      const loopLabels = getDualLoopDestLabel(svcNormKey, code);
      originName = loopLabels.from;
      destName   = loopLabels.to;
    } else if (isLoopSvc) {
      const loopLabels = getLoopDestLabel(svcNormKey, code);
      originName = loopLabels.from;
      destName   = loopLabels.to;
    } else {
      // Use scheduled terminals from ALL_SERVICES to avoid confusing short-working origins
      const svcD1 = ALL_SERVICES?.[svcNormKey + '-1'];
      const svcD2 = ALL_SERVICES?.[svcNormKey + '-2'];
      const liveDestCode = nb.DestinationCode;
      let svcInfo;
      if (svcD1 && svcD2) {
        svcInfo = (svcD1.DestinationCode === liveDestCode) ? svcD1 : svcD2;
      } else if (svcD1 && svcD1.OriginCode === svcD1.DestinationCode) {
        // Loop service missing from LOOP_SVC_MIDPOINTS — just show terminal on both
        originName = stopName(svcD1.OriginCode);
        destName   = stopName(svcD1.DestinationCode);
      } else {
        svcInfo = svcD1 || svcD2;
      }
      if (svcInfo) {
        originName = stopName(svcInfo.OriginCode);
        destName   = stopName(svcInfo.DestinationCode);
      } else if (!originName) {
        originName = stopName(nb.OriginCode);
        destName   = stopName(nb.DestinationCode);
      }
    }
    html += `
    <div class="bus-card" data-stop-code="${code}" style="animation-delay:${i*.09}s">
      <div class="card-top">
        <div class="bus-num-col ${opCls}" onclick="goToService('${s.ServiceNo}', '${code}')" style="position:relative">

          ${originName ? `<div class="bus-num-from">${originName}</div>` : ''}
          <div class="bus-num">${formatSvcNo(s.ServiceNo)}</div>
          ${destName ? `<div class="bus-num-to">${destName}</div>` : ''}
        </div>
        <div class="card-middle" onclick="togglePanel(${i})">
          <div class="arrival-row">
            <div class="first-timing">
              <div class="mins-big ${arrCls}">${label}</div>
              <div class="mins-unit">${unit}</div>
            </div>
            ${nextPills}
          </div>
          ${!_isDualForPill ? `
            <div class="bus-type-tag">${busTypeIcon(nb.Type, false, loadColor[nb.Load]||'var(--muted)')}</div>
          ` : `
            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin-top:3px;opacity:.8">
              <div>${busTypeIcon(nb.Type, false, loadColor[nb.Load]||'var(--muted)')}</div>
              ${dualLoopVisitLabel(s.ServiceNo, nb.VisitNumber) ? `<span style="font-size:8px;color:var(--white);font-weight:700;letter-spacing:.3px">${dualLoopVisitLabel(s.ServiceNo, nb.VisitNumber)}</span>` : ''}
            </div>
          `}
        </div>
        <div class="card-right">
          <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">
            <button class="sun-toggle-btn fav-btn" data-key="svc_${s.ServiceNo}" onclick="event.stopPropagation();addSvcFavSmart('${s.ServiceNo}')" style="justify-content:center;font-size:16px;color:${(window._favs||{})['svc_'+s.ServiceNo]?'var(--yellow)':'var(--muted)'}">${(window._favs||{})['svc_'+s.ServiceNo]?'<i class="fa-solid fa-star"></i>':'<i class="fa-regular fa-star"></i>'}</button>
            <div class="sun-toggle-btn" style="color:var(--cyan);background:none;border-color:transparent;justify-content:center" onclick="toggleStopTiming(${i},'${s.ServiceNo}','${code}')"><i class="fa-regular fa-clock"></i></div>
          </div>
        </div>
      </div>
      <div class="sun-panel" id="sp${i}">
        <div class="sun-inner">${buildPanel(rec, nb.Type==='DD')}</div>
      </div>
      <div class="stop-timing-panel" id="stp${i}" style="display:none">
        <div class="stop-timing-inner" id="sti${i}">
          <div class="rs-arrivals-placeholder">Loading…</div>
        </div>
      </div>
    </div>`;
  });

  const privateAtStop = getPrivateServicesForStop(code);
  let privateHtml = '';
  let privateCount = 0;
  privateAtStop.forEach(({ privateSvc, dir, stop: matchedStop }) => {
    const arrivals = synthesisePrivateArrivals(privateSvc, dir, matchedStop?.StopOffsetMins ?? 0);
    if (!arrivals) return;
    privateHtml += buildPrivateStopCard(privateSvc, dir, arrivals, code, svcs.length + privateCount);
    privateCount++;
  });
  if (privateCount) {
    html = html.replace(`${svcs.length} services`, `${svcs.length + privateCount} services`);
    html += privateHtml;
  }

  document.getElementById('results-stop').innerHTML = html;

  // Inject train alert warning button if this stop's MRT lines are disrupted
  // (only needed when MRT_LOOKUP is already populated; else loadMrtData().then() handles it)
  if (Object.keys(MRT_LOOKUP).length && TRAIN_ALERTS.length) {
    const titleEl = document.querySelector('[id^="stop-title-"]');
    if (titleEl) {
      const alerts = alertsForStopName(name);
      if (alerts.length && !titleEl.parentNode.querySelector('.train-warn-btn')) {
        const btn = document.createElement('button');
        btn.className = 'train-warn-btn';
        btn.onclick = openTrainAlertModal;
        btn.title = `Train disruption on ${alerts.map(a => a.Line).join(', ')}`;
        btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:20px;padding:0;line-height:1;flex-shrink:0';
        btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        titleEl.insertAdjacentElement('afterend', btn);
      }
    }
  }
}

function busTypeIcon(type, small=false, color='var(--muted)') {
  const c = color;
  if (type === 'DD') {
    const [w,h] = small ? [26,14] : [38,20];
    return `<svg width="${w}" height="${h}" viewBox="0 0 38 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="34" height="17" rx="2" fill="none" stroke="${c}" stroke-width="1.2"/>
    <line x1="1" y1="9" x2="35" y2="9" stroke="${c}" stroke-width="1"/>
    <rect x="4" y="2.5" width="5" height="5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="11" y="2.5" width="5" height="5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="18" y="2.5" width="5" height="5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="25" y="2.5" width="5" height="5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="4" y="10.5" width="5" height="4.5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="11" y="10.5" width="5" height="4.5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="18" y="10.5" width="5" height="4.5" rx="1" fill="${c}" opacity=".4"/>
    <rect x="26" y="10.5" width="4" height="4.5" rx="1" fill="none" stroke="${c}" stroke-width=".8" opacity=".6"/>
    <circle cx="8" cy="19" r="2" fill="${c}" opacity=".7"/>
    <circle cx="28" cy="19" r="2" fill="${c}" opacity=".7"/>
  </svg>`;
  }
  if (type === 'BD') {
    const [w,h] = small ? [36,12] : [52,18];
    return `<svg width="${w}" height="${h}" viewBox="0 0 52 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="22" height="13" rx="2" fill="none" stroke="${c}" stroke-width="1.2"/>
    <rect x="27" y="2" width="22" height="13" rx="2" fill="none" stroke="${c}" stroke-width="1.2"/>
    <rect x="22" y="4" width="6" height="9" rx="1" fill="none" stroke="${c}" stroke-width=".9" stroke-dasharray="2 1.5" opacity=".7"/>
    <rect x="3.5" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="10" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="16.5" y="4" width="4" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="29" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="36" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="43" y="4" width="4" height="7" rx="1" fill="${c}" opacity=".4"/>
    <circle cx="7" cy="17" r="2" fill="${c}" opacity=".7"/>
    <circle cx="19" cy="17" r="2" fill="${c}" opacity=".7"/>
    <circle cx="33" cy="17" r="2" fill="${c}" opacity=".7"/>
    <circle cx="45" cy="17" r="2" fill="${c}" opacity=".7"/>
  </svg>`;
  }
  // SD
  const [w,h] = small ? [24,12] : [36,18];
  return `<svg width="${w}" height="${h}" viewBox="0 0 36 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="33" height="13" rx="2" fill="none" stroke="${c}" stroke-width="1.2"/>
    <rect x="3.5" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="10.5" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="17.5" y="4" width="5" height="7" rx="1" fill="${c}" opacity=".4"/>
    <rect x="25" y="4" width="4" height="7" rx="1" fill="none" stroke="${c}" stroke-width=".8" opacity=".6"/>
    <circle cx="8" cy="17" r="2" fill="${c}" opacity=".7"/>
    <circle cx="27" cy="17" r="2" fill="${c}" opacity=".7"/>
  </svg>`;
}

async function goToService(svc, stopCode) {
  switchTab('service');
  document.getElementById('serviceInput').value = svc;
  await doServiceSearch();

  if (stopCode && routeData) {
    const paddedCode = String(stopCode).padStart(5, '0');
    const normalize = c => String(c).padStart(5, '0');

    // Find which direction contains this stop
    const dirIdx = routeData.directions.findIndex(d =>
      d.stops.some(s => normalize(s.BusStopCode) === paddedCode)
    );

    // If stop is in a different direction, switch to it and wait for re-render
    if (dirIdx !== -1 && dirIdx !== routeData.currentDir) {
      await switchDir(dirIdx);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    // Now find and open the stop
    const stopItems = document.querySelectorAll(`[id^="rs-${paddedCode}-"]`).length
      ? document.querySelectorAll(`[id^="rs-${paddedCode}-"]`)
      : document.querySelectorAll(`[id^="rs-${stopCode}-"]`);

    if (stopItems.length) {
      const panel = stopItems[0];
      const card = panel.closest('.route-stop-item')?.querySelector('.route-stop-card');
      if (!panel.classList.contains('open')) {
        panel.classList.add('open');
        card?.querySelector('.rs-chevron')?.classList.add('rotated');
        loadArrivalsInRoute(paddedCode || stopCode);
      }
      const stopEl = panel.closest('.route-stop-item');
      if (stopEl) {
        setTimeout(() => {
          const stickyHeader = document.querySelector('.route-sticky-header');
          const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
          const stopTop = stopEl.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: stopTop - headerHeight - 8, behavior: 'smooth' });
        }, 400);
      }
    }
  }
}

function togglePanel(i) {
  document.getElementById(`sp${i}`).classList.toggle('open');
  // Close timing panel if open
  const tp = document.getElementById(`stp${i}`);
  if (tp) tp.style.display = 'none';
}

async function toggleStopTiming(i, svcNo, stopCode) {
  // Close sun panel if open
  document.getElementById(`sp${i}`)?.classList.remove('open');
  const panel = document.getElementById(`stp${i}`);
  const inner = document.getElementById(`sti${i}`);
  if (!panel || !inner) return;
  if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  // Try to get timing from routes cache
  const fmtTime = t => (t && t !== '-') ? t.slice(0,2)+':'+t.slice(2) : null;
  try {
    if (!ALL_ROUTES) {
      inner.innerHTML = '<div class="rs-arrivals-placeholder">Loading route data…</div>';
      await fetchBusRoute(svcNo); // triggers ALL_ROUTES load
    }
    const svcNorm = svcNo.replace(/^0+/,'').toUpperCase();
    const stopData = ALL_ROUTES.find(s =>
      s.ServiceNo.replace(/^0+/,'').toUpperCase() === svcNorm && s.BusStopCode === stopCode
    );
    if (!stopData) { inner.innerHTML = '<div class="rs-arrivals-placeholder">No timing data for this stop</div>'; return; }

    const wd1 = fmtTime(stopData.WD_FirstBus), wd2 = fmtTime(stopData.WD_LastBus);
    const sa1 = fmtTime(stopData.SAT_FirstBus), sa2 = fmtTime(stopData.SAT_LastBus);
    const su1 = fmtTime(stopData.SUN_FirstBus), su2 = fmtTime(stopData.SUN_LastBus);

    if (!wd1 && !sa1 && !su1) { inner.innerHTML = '<div class="rs-arrivals-placeholder">No timing data</div>'; return; }

    inner.innerHTML = `
      <div class="rs-timing-grid">
        <div class="rs-timing-head"></div><div class="rs-timing-head">First</div><div class="rs-timing-head">Last</div>
        ${wd1 ? `<div class="rs-timing-day">Weekday</div><div class="rs-timing-val">${wd1}</div><div class="rs-timing-val">${wd2||'—'}</div>` : ''}
        ${sa1 ? `<div class="rs-timing-day">Saturday</div><div class="rs-timing-val">${sa1}</div><div class="rs-timing-val">${sa2||'—'}</div>` : ''}
        ${su1 ? `<div class="rs-timing-day">Sunday</div><div class="rs-timing-val">${su1}</div><div class="rs-timing-val">${su2||'—'}</div>` : ''}
      </div>`;
  } catch(e) {
    inner.innerHTML = `<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`;
  }
}

// ── ROUTE STOP EXPAND ──
function toggleRouteTiming(id, btn) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  btn.style.background = isOpen ? '#00C8E015' : '#00C8E030';
  btn.style.borderColor = isOpen ? '#00C8E030' : '#00C8E060';
}

function toggleRouteStop(id, code, cardEl) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    cardEl.querySelector('.rs-chevron')?.classList.remove('rotated');
  } else {
    panel.classList.add('open');
    cardEl.querySelector('.rs-chevron')?.classList.add('rotated');
    // Extract stop sequence from synthetic key for null-code PBS stops
    const seq = code?.startsWith('pbs-seq-') ? parseInt(code.split('-')[2]) : undefined;
    loadArrivalsInRoute(code, seq);
  }
}

// Build PBS static arrival rows for a given stop code in the current route direction.
// Returns an HTML string of rs-arrival-row(s), or '' if not applicable.
function buildPBSArrivalRows(code, stopSeq) {
  if (!PRIVATE_SERVICES) return '';

  // Collect ALL private service stop entries that match this stop code
  // (not just the current route — a stop may be served by multiple private services)
  const matchingEntries = [];

  // First: check current route for null-code stop matching by sequence
  if (routeData) {
    const dir = routeData.directions[routeData.currentDir];
    if (dir) {
      const nullEntry = dir.stops.find(s => s._pbsStop &&
        !s.BusStopCode && stopSeq != null && s.StopSequence === stopSeq);
      if (nullEntry && isServiceOperatingToday(nullEntry.ServiceNo)) matchingEntries.push(nullEntry);
    }
  }

  // O(1) lookup via precomputed index for stops with this bus stop code
  if (code && !code.startsWith('pbs-seq-')) {
    for (const stop of (PRIVATE_STOP_INDEX[code] || [])) {
      if (!isServiceOperatingToday(stop.ServiceNo)) continue;
      const alreadyAdded = matchingEntries.some(e =>
        e.ServiceNo === stop.ServiceNo && e.Direction === stop.Direction
      );
      if (!alreadyAdded) matchingEntries.push(stop);
    }
  }

  if (!matchingEntries.length) return '';

  // Build a row for each matching service and concatenate
  return matchingEntries.map(stopEntry => buildSinglePrivateRow(code, stopEntry)).join('');
}

function _privateTimeCell(diff, hhmm) {
  const label = diff <= 0 ? 'Arr' : `${diff} min`;
  const arriving = diff <= 1;
  return `<div class="rs-time-cell">
    <span class="rs-time-main${arriving ? ' arriving' : ''}">${label}</span>
    <div class="rs-time-meta"><span style="font-size:9px;color:var(--muted);font-family:'LTAIdentity',sans-serif;white-space:nowrap">${hhmm} Scheduled</span></div>
  </div>`;
}

function buildSinglePrivateRow(code, stopEntry) {

  // Frequency-based service (no DepartureTimes) — show info card instead of arrival rows
  const pbsKey = Object.keys(PRIVATE_SERVICES).find(k =>
    PRIVATE_SERVICES[k].ServiceNo === stopEntry.ServiceNo ||
    PRIVATE_SERVICES[k].ServiceNo.toUpperCase().replace(/\s+/g,'') === stopEntry.ServiceNo.toUpperCase().replace(/\s+/g,'')
  );
  const pbsSvcMeta = pbsKey ? PRIVATE_SERVICES[pbsKey] : null;
  const dirMeta = pbsSvcMeta?.Directions?.[String(stopEntry.Direction || 1)];
  const isFreqBased = !dirMeta?.DepartureTimes?.length;

  // Check operating hours before rendering anything
  // For scheduled (DepartureTimes) services, only check day-of-week — Timings filter handles the 45-min window
  const hours = dirMeta?.OperatingHours || pbsSvcMeta?.OperatingHours || '';
  if (!isServiceOperatingNow(hours, !isFreqBased)) return '';

  if (isFreqBased) {
    const freq = dirMeta?.Frequency || pbsSvcMeta?.Frequency || '';
    const hours = dirMeta?.OperatingHours || pbsSvcMeta?.OperatingHours || '';

    // Parse frequency: use the average (or max) of the range as spacing
    const freqMatch = freq.match(/(\d+)(?:[-–](\d+))?/);
    if (!freqMatch) return '';
    const freqMin = parseInt(freqMatch[1]);
    const freqMax = freqMatch[2] ? parseInt(freqMatch[2]) : freqMin;
    const interval = Math.round((freqMin + freqMax) / 2); // average interval in minutes

    // Parse operating hours to get start/end window: e.g. "Daily 7:00am – 12:10am"
    const hoursMatch = hours.match(/(\d+)(?::(\d+))?\s*(am|pm)\s*[-–]\s*(\d+)(?::(\d+))?\s*(am|pm)/i);
    let startMins = 7 * 60, endMins = 24 * 60 + 10; // fallback: 7am–12:10am
    if (hoursMatch) {
      const toMins = (h, m, ampm) => {
        let hrs = parseInt(h);
        const mins = parseInt(m || 0);
        if (ampm.toLowerCase() === 'pm' && hrs !== 12) hrs += 12;
        if (ampm.toLowerCase() === 'am' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };
      startMins = toMins(hoursMatch[1], hoursMatch[2], hoursMatch[3]);
      endMins   = toMins(hoursMatch[4], hoursMatch[5], hoursMatch[6]);
      // Handle past-midnight end (e.g. 12:10am = 10 mins past midnight = 1450 mins from day start if > start)
      if (endMins < startMins) endMins += 24 * 60;
    }

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Check if currently within operating hours
    const nowAdj = nowMins < startMins ? nowMins + 24 * 60 : nowMins;
    if (nowAdj > endMins) return ''; // outside operating hours — show nothing

    // Stop travel offset — how many minutes after origin departure this stop is reached
    const stopOffset = stopEntry._pbsStop?.StopOffsetMins ?? 0;

    // Phase buses evenly from the origin: find how far into the current interval cycle we are
    // Then subtract stop offset so we see when the bus *arrives here*, not when it left origin
    const elapsed = (nowAdj - startMins) % interval;
    // Walk back far enough to catch all buses already en route to this stop
    // A bus that left k intervals ago can still be within the -2 min window if:
    //   -elapsed - (k-1)*interval + stopOffset >= -2
    const upcoming = [];
    let originDiff = -elapsed;
    while ((originDiff - interval) + stopOffset >= -2) originDiff -= interval;
    while (upcoming.length < 3) {
      const diffMins = originDiff + stopOffset;
      if (diffMins > 45) break;
      if (diffMins >= -2) {
        const arrMins = (nowMins + diffMins + 24 * 60) % (24 * 60);
        const hhmm = `${String(Math.floor(arrMins / 60)).padStart(2,'0')}:${String(arrMins % 60).padStart(2,'0')}`;
        upcoming.push({ diff: diffMins, t: hhmm });
      }
      originDiff += interval;
    }

    if (!upcoming.length) return '';

    const svcNo = stopEntry.ServiceNo;
    const destDesc = (() => {
      if (!pbsKey) return '';
      const dirKey = String(stopEntry.Direction || 1);
      return PRIVATE_SERVICES[pbsKey]?.Directions?.[dirKey]?.DestinationDesc || '';
    })();

    const cells = [0, 1, 2].map(i =>
      upcoming[i]
        ? _privateTimeCell(upcoming[i].diff, upcoming[i].t)
        : '<div class="rs-time-cell"><span class="rs-time-next">—</span></div>'
    ).join('');

    const destLabel = destDesc
      ? `<div class="rs-dest-label">${destDesc}</div>`
      : '';

    return `<div class="rs-arrival-row">
      <div class="rs-svc-col ${opClass(stopEntry.Operator, true)}" onclick="goToService('${svcNo}', '${code}')">${formatSvcNo(svcNo)}${destLabel}</div>
      ${cells}
    </div>`;
  }
  const pbsStop = stopEntry._pbsStop;
  const timings = pbsStop.Timings; // { "07:00": "07:03", "07:30": "07:33", ... }
  if (!timings || !Object.keys(timings).length) return '';

  // Compute upcoming scheduled arrivals (next 3) relative to now
  const now = new Date();
  const todayMins = now.getHours() * 60 + now.getMinutes();

  function hhmmmToMins(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  function minsUntil(hhmm) {
    return hhmmmToMins(hhmm) - todayMins;
  }

  // Get all scheduled arrival times for this stop, sorted
  const upcoming = Object.values(timings)
    .map(t => ({ t, diff: minsUntil(t) }))
    .filter(x => x.diff > -2 && x.diff <= 45) // match LTA convention: -2 min to 45 min window
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

  if (!upcoming.length) return '';

  const svcNo = stopEntry.ServiceNo;
  const destDesc = (() => {
    // Find destination description from PRIVATE_SERVICES
    const pbsKey = Object.keys(PRIVATE_SERVICES).find(k =>
      PRIVATE_SERVICES[k].ServiceNo === svcNo ||
      PRIVATE_SERVICES[k].ServiceNo.toUpperCase().replace(/\s+/g,'') === svcNo.toUpperCase().replace(/\s+/g,'')
    );
    if (!pbsKey) return '';
    const pbsSvc = PRIVATE_SERVICES[pbsKey];
    const dirKey = String(stopEntry.Direction || 1);
    return pbsSvc.Directions?.[dirKey]?.DestinationDesc || '';
  })();

  // Pad to 3 cells
  const cells = [0, 1, 2].map(i =>
    upcoming[i]
      ? _privateTimeCell(upcoming[i].diff, upcoming[i].t)
      : '<div class="rs-time-cell"><span class="rs-time-next">—</span></div>'
  ).join('');

  const destLabel = destDesc
    ? `<div class="rs-dest-label">${destDesc}</div>`
    : '';

  return `<div class="rs-arrival-row">
    <div class="rs-svc-col ${opClass(stopEntry.Operator, true)}" onclick="goToService('${svcNo}', '${code}')">${formatSvcNo(svcNo)}${destLabel}</div>
    ${cells}
  </div>`;
}

async function loadArrivalsInRoute(code, stopSeq) {
  // Find all arrival containers for this stop code
  const containers = document.querySelectorAll(`[id^="ra-${code}-"]`);
  containers.forEach(c => c.innerHTML = '<div class="rs-arrivals-placeholder">Loading…</div>');

  // Check if this stop belongs to a PBS route — if so, build static rows immediately
  const pbsHtml = buildPBSArrivalRows(code, stopSeq);

  // If no real bus stop code, skip LTA fetch — only PBS static data available
  const isNullCode = !code || code.startsWith('pbs-seq-');
  if (isNullCode) {
    containers.forEach(c => c.innerHTML = pbsHtml || '<div class="rs-arrivals-placeholder">No live data</div>');
    return;
  }

  try {
    const data = await fetchLTA(code);
    const svcs = data.Services || [];
    svcs.sort((a,b) => parseInt(a.ServiceNo)-parseInt(b.ServiceNo)||a.ServiceNo.localeCompare(b.ServiceNo));
    const loadColors = {SEA:'var(--green)',SDA:'#FF8C00',LSD:'#FF3333'};

    function fmtMin(m) { return m <= 0 ? 'Arr' : m + ' min'; }
    function timeCell(m, nb, loopLabel) {
      if (m === null || !nb?.EstimatedArrival) return '<div class="rs-time-cell"><span class="rs-time-next">—</span></div>';
      const lc = loadColors[nb.Load] || 'var(--muted)';
      const icon = busTypeIcon(nb.Type, true, lc);
      const loopTag = loopLabel ? `<div class="rs-loop-label">↻ ${loopLabel}</div>` : '';
      return `<div class="rs-time-cell">
        <span class="rs-time-main${m<=1?' arriving':''}">${fmtMin(m)}</span>
        <div class="rs-time-meta">${icon}</div>
        ${loopTag}
      </div>`;
    }

    // Collect all private service numbers already rendered, to avoid duplicates in live rows
    const renderedPrivateSvcNos = new Set(
      pbsHtml && code && !code.startsWith('pbs-seq-')
        ? (PRIVATE_STOP_INDEX[code] || []).map(s => s.ServiceNo)
        : []
    );

    let liveHtml = '';
    svcs.forEach(s => {
      // Skip if this service is already rendered via private static rows
      if (renderedPrivateSvcNos.has(s.ServiceNo)) return;
      const nb = s.NextBus, nb2 = s.NextBus2, nb3 = s.NextBus3;
      if (!nb?.EstimatedArrival) return;
      const m1 = minsFrom(nb.EstimatedArrival);
      const m2 = nb2?.EstimatedArrival ? minsFrom(nb2.EstimatedArrival) : null;
      const m3 = nb3?.EstimatedArrival ? minsFrom(nb3.EstimatedArrival) : null;
      const op = (s.Operator||'').toUpperCase();
      const info1 = ALL_SERVICES?.[normalizeServiceNo(s.ServiceNo.replace(/^0+/,'').toUpperCase()) + '-1'] || null;
      const info2 = ALL_SERVICES?.[normalizeServiceNo(s.ServiceNo.replace(/^0+/,'').toUpperCase()) + '-2'] || null;
      const opCls = opClass(op, !!(info1?._isPrivate||info2?._isPrivate));
      const liveDestCode = nb.DestinationCode;
      let destName = stopName(liveDestCode);
      if (!destName && (info1 || info2)) {
        if (info2 && info2.OriginCode && info2.OriginCode === liveDestCode) {
          destName = stopName(info2.DestinationCode);
        } else if (info1 && info1.OriginCode && info1.OriginCode === liveDestCode) {
          destName = stopName(info1.DestinationCode);
        } else {
          destName = stopName(info1?.DestinationCode) || stopName(info2?.DestinationCode);
        }
      }
      const destLabel = destName ? `<div class="rs-dest-label">${destName}</div>` : '';

      const svcNorm = normalizeServiceNo(s.ServiceNo.replace(/^0+/, '').toUpperCase());
      const isDoubleLoop = svcNorm in DUAL_LOOP_SVCS;
      const isOverlappedStop = (() => {
        if (!routeData) return false;
        const dir = routeData.directions?.[routeData.currentDir];
        if (!dir || !code) return false;
        const target = padCode(code);
        let seen = 0;
        for (const st of dir.stops || []) {
          if (!st?.BusStopCode) continue;
          if (padCode(st.BusStopCode) === target) seen++;
          if (seen > 1) return true;
        }
        return false;
      })();
      function getLoopLabel(busNb) {
        if (!isDoubleLoop || !isOverlappedStop || !busNb) return null;
        return dualLoopVisitLabel(s.ServiceNo, String(busNb.VisitNumber || '1'));
      }
      liveHtml += `<div class="rs-arrival-row">
        <div class="rs-svc-col ${opCls}" onclick="goToService('${s.ServiceNo}', '${code}')">${formatSvcNo(s.ServiceNo)}${destLabel}</div>
        ${timeCell(m1, nb, getLoopLabel(nb))}
        ${timeCell(m2, nb2, getLoopLabel(nb2))}
        ${timeCell(m3, nb3, getLoopLabel(nb3))}
      </div>`;
    });

    const combined = pbsHtml + liveHtml;
    containers.forEach(c => c.innerHTML = combined || '<div class="rs-arrivals-placeholder">No live data</div>');
  } catch(e) {
    // If LTA fetch fails but we have PBS static data, still show it
    if (pbsHtml) {
      containers.forEach(c => c.innerHTML = pbsHtml);
    } else {
      containers.forEach(c => c.innerHTML = `<div class="rs-arrivals-placeholder" style="color:#FF9999"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`);
    }
  }
}

// ── SEAT REC ──
function seatRec(lat1,lng1,lat2,lng2) {
  const φ1=parseFloat(lat1)*Math.PI/180, φ2=parseFloat(lat2)*Math.PI/180;
  const dλ=(parseFloat(lng2)-parseFloat(lng1))*Math.PI/180;
  const y=Math.sin(dλ)*Math.cos(φ2);
  const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(dλ);
  let bear=Math.atan2(y,x)*180/Math.PI; if(bear<0) bear+=360;
  if(SUN_ALT<5) return {side:'any',bear,intensity:'none'};
  const rel=(SUN_AZ-bear+360)%360;
  const goodSide=rel<180?'left':'right', sunSide=rel<180?'right':'left';
  const perp=Math.abs(Math.sin(rel*Math.PI/180));
  const altF=Math.sin(Math.abs(SUN_ALT)*Math.PI/180);
  const score=perp*altF;
  const intensity=score>.65?'high':score>.3?'medium':'low';
  return {side:goodSide,sunSide,bear,intensity,rel,score};
}

// ── BUS DIAGRAM ──
function buildPanel(rec, isDD) {
  const rows = isDD ? 7 : 4;
  let seats = '';
  for(let r=0;r<rows;r++) {
    const lc=(rec.side==='left'||rec.side==='any')?'rec':(rec.intensity==='high'?'very-hot':'hot');
    const rc=(rec.side==='right'||rec.side==='any')?'rec':(rec.intensity==='high'?'very-hot':'hot');
    seats += `<div class="seat-row-d">
      <div class="seat-pair"><div class="s ${lc}"></div><div class="s ${lc}"></div></div>
      <div class="bus-aisle"></div>
      <div class="seat-pair"><div class="s ${rc}"></div><div class="s ${rc}"></div></div>
    </div>`;
  }
  const busDir=card(rec.bear), sunDir=card(SUN_AZ);
  let bannerClass='good', emoji='', msg='';
  if(rec.side==='any') {
    bannerClass='any'; emoji='<i class="fa-solid fa-glasses"></i>';
    msg=`Sun is low on the horizon — <span class="rec-strong">any seat is comfortable</span> right now.`;
  } else {
    emoji=rec.side==='left'?'<i class="fa-solid fa-arrow-left"></i>':'<i class="fa-solid fa-arrow-right"></i>';
    const oppSide = rec.side === 'left' ? 'right' : 'left';
    const howMuch = rec.intensity==='high' ? 'directly' : 'partially';
    msg=`Sit on the <span class="rec-strong">${rec.side} side</span> — the sun is ${howMuch} shining through the <span class="rec-dir">${oppSide} windows</span> right now.`;
    bannerClass=rec.intensity==='high'?'hot':'good';
  }
  return `
    <div class="panel-title"><i class="fa-solid fa-sun"></i> Sun-Smart Seating</div>
    <div class="diagram-wrap">
      <div class="bus-map"><div class="bus-shell">
        <div class="bus-windshield">
          <div class="ws-light"></div>
          <div style="font-size:9px;color:var(--muted);letter-spacing:1px">▲ ${busDir}</div>
          <div class="ws-light"></div>
        </div>
        ${seats}
      </div></div>
      <div class="diagram-legend">
        <div class="leg-row"><div class="leg-swatch" style="background:var(--green)"></div>Shaded side</div>
        <div class="leg-row"><div class="leg-swatch" style="background:#FF222730;border:1px solid #FF222270"></div>Sunny side</div>
        <div style="margin-top:10px;font-size:11px;color:var(--muted);line-height:1.8">
          <i class="fa-solid fa-bus"></i> Bus going<br><strong style="color:var(--white)">${busDir}</strong><br><br>
          <i class="fa-solid fa-sun"></i> Sun is in the<br><strong style="color:var(--yellow)">${sunDir}</strong><br>
          <span style="color:var(--muted)">${SUN_ALT.toFixed(0)}° above horizon</span>
        </div>
      </div>
    </div>
    <div class="rec-banner ${bannerClass}">
      <div class="rec-emoji">${emoji}</div>
      <div>${msg}</div>
    </div>`;
}

// ── FAVOURITES ──
window._favs = {};
window._currentUser = null;

// Fav order storage (per section)
let FAV_ORDER = { service: [], stop: [], plan: [] };

function saveFavOrder() {
  if (!window._currentUser || !window._fbDb || !window._fbDoc || !window._fbSetDoc) return;
  try {
    const ref = window._fbDoc(window._fbDb, 'users', window._currentUser.uid, 'preferences', 'favOrder');
    window._fbSetDoc(ref, FAV_ORDER, { merge: false });
  } catch(e) {}
}

async function loadFavOrder() {
  if (!window._currentUser || !window._fbDb || !window._fbDoc || !window._fbGetDoc) return;
  try {
    const ref = window._fbDoc(window._fbDb, 'users', window._currentUser.uid, 'preferences', 'favOrder');
    const snap = await window._fbGetDoc(ref);
    if (snap.exists()) FAV_ORDER = { service: [], stop: [], plan: [], ...snap.data() };
  } catch(e) {}
}

function applyFavOrder(keys, type) {
  const order = FAV_ORDER[type] || [];
  const ordered = order.filter(k => keys.includes(k));
  const rest = keys.filter(k => !ordered.includes(k));
  return [...ordered, ...rest];
}

function renderFavourites() {
  const svcGrid = document.getElementById('fav-grid-services');
  const stopGrid = document.getElementById('fav-grid-stops');
  if (!svcGrid || !stopGrid) return;
  const favs = window._favs || {};

  const services = applyFavOrder(Object.keys(favs).filter(k => favs[k].type === 'service'), 'service');
  const stops = applyFavOrder(Object.keys(favs).filter(k => favs[k].type === 'stop'), 'stop');
  const plans = applyFavOrder(Object.keys(favs).filter(k => favs[k].type === 'plan'), 'plan');

  const renderCard = key => {
    const f = favs[key];
    const icon = f.type === 'stop' ? '<i class="fa-solid fa-sign-hanging"></i>' : f.type === 'plan' ? '<i class="fa-solid fa-map-location-dot"></i>' : '<i class="fa-solid fa-bus"></i>';
    let sub = f.sub || '';
    if (f.type === 'service' && ALL_SERVICES) {
      const svc = f.id;
      const svcNorm = normalizeServiceNo(svc);
      const info1 = ALL_SERVICES[svcNorm + '-1'] || null;
      const info2 = ALL_SERVICES[svcNorm + '-2'] || null;
      if (info1) {
        const sn = c => ALL_STOPS?.find(s => s.BusStopCode === c)?.Description || c || '';
        const orig = sn(info1.OriginCode), dest = sn(info1.DestinationCode);
        const loopD = info1.LoopDesc || '';
        const isLoop = info1 && !info2 && (info1.OriginCode === info1.DestinationCode || !!info1.LoopDesc);
        if (isLoop) sub = loopD ? orig + ' ↻ via ' + loopD : orig + ' ↻';
        else if (info2) sub = orig + ' ↔ ' + dest;
        else sub = orig + ' → ' + dest;
      }
    }
    return `<div class="fav-card" data-key="${key}" draggable="true">
      <div class="fav-card-type">${icon} ${f.type}</div>
      <div class="fav-card-name">${escapeHtml(f.name)}</div>
      ${sub ? `<div class="fav-card-sub">${escapeHtml(sub)}</div>` : ''}
      <div class="fav-remove" data-remove="${key}"><i class="fa-solid fa-xmark"></i></div>
    </div>`;
  };

  svcGrid.innerHTML = services.length ? services.map(renderCard).join('') : '<div class="fav-empty">No favourite services yet.</div>';
  const planGrid = document.getElementById('fav-grid-plans');
  if (planGrid) planGrid.innerHTML = plans.length ? plans.map(renderCard).join('') : '<div class="fav-empty">No favourite plans yet.</div>';
  stopGrid.innerHTML = stops.length ? stops.map(renderCard).join('') : '<div class="fav-empty">No favourite stops yet.</div>';

  // Wire up clicks and drag-reorder for each grid
  [
    { el: svcGrid, type: 'service', keys: services },
    { el: stopGrid, type: 'stop', keys: stops },
    { el: planGrid, type: 'plan', keys: plans },
  ].forEach(({ el, type, keys }) => {
    if (!el) return;
    attachFavGridHandlers(el, type, keys);
  });
}

function attachFavGridHandlers(grid, type, keys) {
  let dragSrc = null;
  let longPressTimer = null;
  let isDragging = false;
  let touchDragEl = null;
  let touchClone = null;
  let touchOver = null;

  grid.querySelectorAll('.fav-card').forEach(card => {
    // Remove button
    const removeBtn = card.querySelector('[data-remove]');
    if (removeBtn) {
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        promptRemoveFav(removeBtn.dataset.remove);
      });
    }

    // ── DESKTOP DRAG ──
    card.addEventListener('dragstart', e => {
      dragSrc = card;
      isDragging = true;
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      grid.querySelectorAll('.fav-card').forEach(c => c.classList.remove('drag-over'));
      isDragging = false;
      dragSrc = null;
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (card !== dragSrc) {
        grid.querySelectorAll('.fav-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrc && dragSrc !== card) {
        reorderFavs(grid, type, dragSrc.dataset.key, card.dataset.key);
      }
    });

    // ── TOUCH LONG-PRESS + DRAG ──
    card.addEventListener('touchstart', e => {
      isDragging = false;
      longPressTimer = setTimeout(() => {
        isDragging = true;
        touchDragEl = card;
        card.classList.add('long-press-ready');
        navigator.vibrate?.(40);
        // Create floating clone
        const rect = card.getBoundingClientRect();
        touchClone = card.cloneNode(true);
        touchClone.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;opacity:.85;z-index:9999;pointer-events:none;border-radius:12px;transform:scale(1.05);transition:none;box-shadow:0 8px 24px #0008`;
        document.body.appendChild(touchClone);
        card.style.opacity = '.3';
      }, 400);
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!isDragging || !touchClone) {
        clearTimeout(longPressTimer);
        return;
      }
      e.preventDefault();
      const t = e.touches[0];
      const rect = touchClone.getBoundingClientRect();
      touchClone.style.top = (t.clientY - rect.height / 2) + 'px';
      touchClone.style.left = (t.clientX - rect.width / 2) + 'px';
      // Find card under finger
      touchClone.style.display = 'none';
      const el = document.elementFromPoint(t.clientX, t.clientY);
      touchClone.style.display = '';
      const overCard = el?.closest('.fav-card');
      grid.querySelectorAll('.fav-card').forEach(c => c.classList.remove('drag-over'));
      if (overCard && overCard !== touchDragEl) {
        overCard.classList.add('drag-over');
        touchOver = overCard;
      } else {
        touchOver = null;
      }
    }, { passive: false });

    card.addEventListener('touchend', e => {
      clearTimeout(longPressTimer);
      card.classList.remove('long-press-ready');
      if (touchClone) { touchClone.remove(); touchClone = null; }
      if (touchDragEl) touchDragEl.style.opacity = '';
      grid.querySelectorAll('.fav-card').forEach(c => c.classList.remove('drag-over', 'long-press-ready'));
      if (isDragging && touchOver && touchOver !== touchDragEl) {
        reorderFavs(grid, type, touchDragEl.dataset.key, touchOver.dataset.key);
      } else if (!isDragging) {
        // Normal tap → card click
        const key = card.dataset.key;
        if (key) favCardClick(key);
      }
      isDragging = false;
      touchDragEl = null;
      touchOver = null;
    });

    card.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      card.classList.remove('long-press-ready');
      if (touchClone) { touchClone.remove(); touchClone = null; }
      if (touchDragEl) touchDragEl.style.opacity = '';
      grid.querySelectorAll('.fav-card').forEach(c => c.classList.remove('drag-over', 'long-press-ready'));
      isDragging = false; touchDragEl = null; touchOver = null;
    });

    // Desktop click (only if not a drag)
    card.addEventListener('click', e => {
      if (e.target.closest('[data-remove]')) return;
      if (!isDragging) favCardClick(card.dataset.key);
    });
  });
}

function reorderFavs(grid, type, srcKey, targetKey) {
  const order = [...grid.querySelectorAll('.fav-card')].map(c => c.dataset.key);
  const srcIdx = order.indexOf(srcKey);
  const tgtIdx = order.indexOf(targetKey);
  if (srcIdx === -1 || tgtIdx === -1) return;
  order.splice(srcIdx, 1);
  order.splice(tgtIdx, 0, srcKey);
  FAV_ORDER[type] = order;
  saveFavOrder();
  renderFavourites();
}

function planStopClick(name) {
  if (!name || !ALL_STOPS) return;
  const norm = s => (s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const match = ALL_STOPS.find(s => norm(s.Description) === norm(name));
  if (match) {
    quickLoad(match.BusStopCode);
  } else {
    switchTab('stop');
    document.getElementById('stopInput').value = name;
    doSearch();
  }
}

// Delegated click for plan stop links
document.addEventListener('click', e => {
  const link = e.target.closest('.plan-stop-link');
  if (link) {
    e.stopPropagation();
    planStopClick(link.dataset.stopName);
  }
});

function addPlanFav() {
  if (!window._currentUser) { toast('Sign in to save favourite plans'); return; }
  const fromName = document.getElementById('planFromInput').value.trim();
  const toName = document.getElementById('planToInput').value.trim();
  if (!fromName || !toName) return;
  const key = 'plan_' + (planFromCode||'') + '_' + (planToCode||'');
  const data = {
    type: 'plan',
    name: fromName + ' → ' + toName,
    sub: fromName + ' → ' + toName,
    fromName, toName,
    fromCode: planFromCode,
    toCode: planToCode,
  };
  const isSaved = !!(window._favs && window._favs[key]);
  window.toggleFav(key, data).then(() => {
    const btn = document.getElementById('plan-fav-btn');
    if (!btn) return;
    const nowSaved = !isSaved;
    btn.style.color = nowSaved ? 'var(--yellow)' : 'var(--muted)';
    btn.innerHTML = nowSaved ? '<i class="fa-solid fa-star"></i> Saved' : '<i class="fa-regular fa-star"></i> Save route';
  });
}

function favCardClick(key) {
  const f = (window._favs || {})[key];
  if (!f) return;
  if (f.type === 'stop') {
    quickLoad(f.id);
  } else if (f.type === 'plan') {
    switchTab('plan');
    document.getElementById('planFromInput').value = f.fromName;
    document.getElementById('planToInput').value = f.toName;
    planFromCode = f.fromCode;
    planToCode = f.toCode;
    doPlanSearch();
  } else {
    switchTab('service');
    document.getElementById('serviceInput').value = f.id;
    doServiceSearch();
  }
}

function updateFavButtons() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const key = btn.dataset.key;
    const isFav = !!(window._favs && window._favs[key]);
    btn.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    btn.style.setProperty('color', isFav ? 'var(--yellow)' : 'var(--muted)', 'important');
  });
  document.querySelectorAll('[id^="svc-fav-btn-"]').forEach(btn => {
    const svc = btn.id.replace('svc-fav-btn-', '');
    const isFav = !!(window._favs && window._favs['svc_' + svc]);
    btn.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    btn.style.setProperty('color', isFav ? 'var(--yellow)' : 'var(--muted)', 'important');
  });
}

// ── FAV HELPER ──
function addSvcFavSmart(svc) {
  // Use ALL_SERVICES to determine route type, ALL_STOPS for stop names
  const svcNorm = normalizeServiceNo(svc);
  const info1 = ALL_SERVICES && (ALL_SERVICES[svcNorm + '-1'] || null);
  const info2 = ALL_SERVICES && (ALL_SERVICES[svcNorm + '-2'] || null);

  if (!info1) { addSvcFav(svc, ''); return; }

  const stopName = c => ALL_STOPS?.find(s => s.BusStopCode === c)?.Description || c || '';
  const orig = stopName(info1.OriginCode);
  const dest = stopName(info1.DestinationCode);
  const loopD = info1.LoopDesc || '';
  const isLoop = info1 && !info2 && (info1.OriginCode === info1.DestinationCode || !!info1.LoopDesc);
  const isBidir = !!info2;

  let sub = '';
  if (isLoop) sub = loopD ? orig + ' ↻ via ' + loopD : orig + ' ↻';
  else if (isBidir) sub = orig + ' ↔ ' + dest;
  else sub = orig + ' → ' + dest;

  addSvcFav(svc, sub);
}

function addSvcFavFromRoute(svc) {
  if (!_currentRouteData) { addSvcFav(svc, ''); return; }
  const { rd, stopMap, isLoop, loopDesc } = _currentRouteData;
  const dirs = rd.directions;
  const firstName = c => stopMap[c]?.Description || '';
  const first0 = firstName(dirs[0]?.stops[0]?.BusStopCode);
  const last0  = firstName(dirs[0]?.stops[dirs[0].stops.length - 1]?.BusStopCode);
  const isActualLoop = isLoop || first0 === last0;
  let sub = '';
  if (isActualLoop) {
    sub = loopDesc ? first0 + ' ↻ via ' + loopDesc : first0 + ' ↻';
  } else if (dirs.length >= 2) {
    sub = first0 + ' ↔ ' + last0;
  } else {
    sub = first0 + ' → ' + last0;
  }
  addSvcFav(svc, sub);
}

function addSvcFav(svc, sub) {
  const key = 'svc_' + svc;
  if (window._favs && window._favs[key]) {
    promptRemoveFav(key);
  } else {
    toggleFav(key, {type:'service', id:svc, name:svc, sub: sub || ''});
  }
}

function addStopFav(code, name, road) {
  if (window._favs && window._favs['stop_'+code]) {
    promptRemoveFav('stop_'+code);
  } else {
    toggleFav('stop_'+code, {type:'stop', id:code, name:name, sub:road||''});
  }
}

function viewStopOnMap(code) {
  const stop = (ALL_STOPS || []).find(s => s.BusStopCode === code);
  if (!stop) return;

  const lat = parseFloat(stop.Latitude);
  const lng = parseFloat(stop.Longitude);
  const name = stop.Description || code;
  const road = stop.RoadName || '';

  document.getElementById('stop-map-modal').style.display = 'flex';

  if (window._stopMap) {
    window._stopMap.remove();
    window._stopMap = null;
  }

  const isLight = document.body.classList.contains('light');
  const tileUrl = isLight ? 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png':'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png';

  window._stopMap = L.map('stop-map-container', { zoomControl: true, attributionControl: false });
  L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(window._stopMap);
  window._stopMap.setView([lat, lng], 17);

  const markerIcon = L.divIcon({
    html: `<div style="background:var(--cyan);width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px #0008"></div>`,
    className: '',
    iconAnchor: [7, 7]
  });

  L.marker([lat, lng], { icon: markerIcon })
    .addTo(window._stopMap)
    .bindPopup(`<strong>${name}</strong><br>${road}`)
    .openPopup();
}

function closeStopMapModal() {
  document.getElementById('stop-map-modal').style.display = 'none';
  if (window._stopMap) {
    window._stopMap.remove();
    window._stopMap = null;
  }
}

// ── REMOVE FAV MODAL ──
let _pendingRemoveKey = null;

function promptRemoveFav(key) {
  const f = (window._favs || {})[key];
  if (!f) return;
  _pendingRemoveKey = key;
  document.getElementById('fav-modal-name').textContent = f.name;
  document.getElementById('fav-remove-modal').style.display = 'flex';
}

function closeSignOutModal() {
  document.getElementById('signout-modal').style.display = 'none';
}
async function confirmSignOut() {
  closeSignOutModal();
  await window._fbSignOut(window._fbAuth);
  toast('Signed out');
}

function closeFavModal() {
  document.getElementById('fav-remove-modal').style.display = 'none';
  _pendingRemoveKey = null;
}

async function confirmRemoveFav() {
  if (!_pendingRemoveKey) return;
  await toggleFav(_pendingRemoveKey, null);
  closeFavModal();
}

// ── HELPERS ──
function stopName(stopCode) {
  if (!stopCode || !ALL_STOPS) return null;
  const padded = String(stopCode).padStart(5, '0');
  return ALL_STOPS.find(st => st.BusStopCode === padded || st.BusStopCode === String(stopCode))?.Description || null;
}
// ── MRT STATION PILLS ──
let MRT_LOOKUP = {};
let MRT_CODE_LOOKUP = {}; // stn_code -> { name, codes: [all codes for this station] }

async function loadMrtData() {
  try {
    const res = await fetch(`${PROXY_URL}?endpoint=static&file=mrt-stations.json`, { headers: await getProxyHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    data.forEach(({ stn_code, mrt_station, mrt_line }) => {
      const key = mrt_station.toLowerCase();
      if (!MRT_LOOKUP[key]) MRT_LOOKUP[key] = [];
      MRT_LOOKUP[key].push({ stn_code, mrt_line });
      // Build reverse lookup
      MRT_CODE_LOOKUP[stn_code] = { name: mrt_station, nameKey: key };
    });
    // Now attach all codes for each station
    Object.entries(MRT_LOOKUP).forEach(([key, entries]) => {
      entries.forEach(({ stn_code }) => {
        if (MRT_CODE_LOOKUP[stn_code]) MRT_CODE_LOOKUP[stn_code].codes = entries.map(e => e.stn_code);
      });
    });
  } catch(e) {}
}

// Format a station code or "CODE1|CODE2" group into "Name (CODE1 | CODE2)"
function stationLabel(codeOrGroup) {
  const codes = codeOrGroup.split('|').map(c => c.trim());
  const info = MRT_CODE_LOOKUP[codes[0]];
  const name = info ? info.name : null;
  const codeStr = codes.join(' | ');
  return name ? `${name} (${codeStr})` : codeStr;
}

// Format a comma-separated list of station codes into labelled names
function formatStationList(raw) {
  if (!raw) return '';
  return raw.split(',').map(s => stationLabel(s.trim())).join(', ');
}

function mrtLineColor(line) {
  if (line === 'East West Line' || line === 'Changi Airport Branch Line') return '#009645';
  if (line === 'North South Line') return '#D42E12';
  if (line === 'North East Line') return '#7B2D8B';
  if (line === 'Circle Line' || line === 'Circle Line Extension') return '#FA9E0D';
  if (line === 'Downtown Line') return '#005EC4';
  if (line === 'Thomson-East Coast Line') return '#9D5B25';
  return '#4A4A4A'; // all LRT lines
}

function mrtPills(name, small = false) {
  if (!name || !Object.keys(MRT_LOOKUP).length) return '';
  // Only attempt MRT lookup if the stop name explicitly references a station
  if (!/\b(Stn|Lrt|Int)\b/i.test(name)) return '';
  const core = normalizeMrtStopName(name);

  const matches = MRT_LOOKUP[core];
  if (matches && matches.length) {
    return matches.map(({ stn_code, mrt_line }) => {
      const c = mrtLineColor(mrt_line);
      const s = small
        ? `display:inline-block;vertical-align:middle;background:${c};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:11px;letter-spacing:.3px;padding:1px 5px;border-radius:3px;line-height:1.4;flex-shrink:0`
        : `display:inline-block;vertical-align:middle;margin-left:5px;background:${c};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:14px;letter-spacing:.5px;padding:3px 8px;border-radius:4px;line-height:1.4;flex-shrink:0`;
      return `<span style="${s}">${stn_code}</span>`;
    }).join('');
  }

  // LRT fallback: if the stop name explicitly says "Lrt", show a line pill based on known LRT stations
  if (/\bLrt\b/i.test(name)) {
    const lrtMap = {
      'punggol': { abbr: 'PGL', color: '#748477' },
      'sengkang': { abbr: 'SKL', color: '#748477' },
    };
    const lrtLine = lrtMap[core];
    if (lrtLine) {
      const s = small
        ? `display:inline-block;vertical-align:middle;background:${lrtLine.color};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:11px;letter-spacing:.3px;padding:1px 5px;border-radius:3px;line-height:1.4;flex-shrink:0`
        : `display:inline-block;vertical-align:middle;margin-left:5px;background:${lrtLine.color};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:14px;letter-spacing:.5px;padding:3px 8px;border-radius:4px;line-height:1.4;flex-shrink:0`;
      return `<span style="${s}">${lrtLine.abbr}</span>`;
    }
  }
  // Fuzzy fallback
  const fuzzyKey = Object.keys(MRT_LOOKUP).find(k => k.length >= 5 && core === k);
  if (!fuzzyKey) return '';
  return MRT_LOOKUP[fuzzyKey].map(({ stn_code, mrt_line }) => {
    const c = mrtLineColor(mrt_line);
    const s = small
      ? `display:inline-block;vertical-align:middle;background:${c};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:11px;letter-spacing:.3px;padding:1px 5px;border-radius:3px;line-height:1.4;flex-shrink:0`
      : `display:inline-block;vertical-align:middle;margin-left:5px;background:${c};color:#fff;font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:14px;letter-spacing:.5px;padding:3px 8px;border-radius:4px;line-height:1.4;flex-shrink:0`;
    return `<span style="${s}">${stn_code}</span>`;
  }).join('');
}

function stopLabel(name, showPills = false) {
  if (!name) return name;
  let label = name;
  const pills = mrtPills(name);
  if (/\bInt\b/.test(name)) label += ' <i class="fa-solid fa-bus" style="margin-left:3px;opacity:.85;font-size:11px"></i>';
  else if ((/\bStn\b/.test(name) || /\bLrt\b/.test(name)) && pills) label += ' <i class="fa-solid fa-train-subway" style="margin-left:3px;opacity:.85;font-size:11px"></i>';
  if (showPills) label += pills;
  return label;
}
// Restore saved theme
try { if (localStorage.getItem('shiokbus_theme') === 'light') { document.body.classList.add('light'); document.getElementById('themeToggle').innerHTML = '<i class="fa-solid fa-moon"></i> Dark'; } } catch(e) {}
// Restore alert banner setting
try { if (localStorage.getItem('shiokbus_alert_banner') === 'off') alertBannerEnabled = false; } catch(e) {}
// ── HTML ESCAPING ──
// Sanitise any external-origin string before injecting into innerHTML.
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function minsFrom(iso) {
  const d = Math.floor((new Date(iso) - Date.now()) / 60000);
  return d < -1 ? -1 : d; // -1 = already departed, 0 = arriving/just arrived, >0 = minutes away
}
function toast(msg, duration=2800) {
  const t=document.createElement('div');
  t.className='toast'; t.innerHTML=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),duration);
}
// ── JOURNEY PLANNER ──
let planFromCode = null, planToCode = null;
let planFromHighlight = -1, planToHighlight = -1;

function showPlanNearMe(which) {
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  const el = document.getElementById(resultsId);
  el.innerHTML = `<div class="plan-near-me-item" id="plan-near-me-${which}"><i class="fa-solid fa-location-dot"></i> Near me</div>`;
  el.style.display = 'block';
  document.getElementById(`plan-near-me-${which}`)?.addEventListener('mousedown', e => {
    e.preventDefault();
    selectGlobalNearestStop(which);
  });
}

function onPlanFocus(which) {
  const inputId = which === 'from' ? 'planFromInput' : 'planToInput';
  const val = document.getElementById(inputId).value.trim();
  if (!val) showPlanNearMe(which);
}

function onPlanBlur(which) {
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  setTimeout(() => { document.getElementById(resultsId).style.display = 'none'; }, 200);
}

function selectGlobalNearestStop(which) {
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  const nearEl = document.getElementById(`plan-near-me-${which}`);
  if (nearEl) nearEl.innerHTML = '<i class="fa-solid fa-location-dot"></i> Locating…';

  const resolve = (lat, lng) => {
    if (!ALL_STOPS) { toast('Stop data not loaded yet'); return; }
    let nearest = null, minDist = Infinity;
    ALL_STOPS.forEach(s => {
      const d = haversine(lat, lng, parseFloat(s.Latitude), parseFloat(s.Longitude));
      if (d < minDist) { minDist = d; nearest = s; }
    });
    if (!nearest) return;
    selectGlobalPlanStop(which, nearest.BusStopCode, nearest.Description || nearest.BusStopCode);
    document.getElementById(resultsId).style.display = 'none';
  };

  if (userLat && userLng) {
    resolve(userLat, userLng);
  } else {
    navigator.geolocation.getCurrentPosition(
      pos => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(userLat, userLng); },
      () => toast('Could not get your location'),
      { timeout: 8000 }
    );
  }
}

function onPlanInput(which) {
  const inputId = which === 'from' ? 'planFromInput' : 'planToInput';
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  const val = document.getElementById(inputId).value.trim();
  if (which === 'from') { planFromCode = null; planFromHighlight = -1; }
  else { planToCode = null; planToHighlight = -1; }
  if (!val || !ALL_STOPS) {
    if (!val) showPlanNearMe(which);
    else document.getElementById(resultsId).style.display = 'none';
    return;
  }
  const isCode = /^\d+$/.test(val);
  let matches;
  if (isCode) {
    matches = ALL_STOPS.filter(s => s.BusStopCode.startsWith(val)).slice(0, 8);
  } else {
    const q = val.toLowerCase();
    matches = ALL_STOPS.filter(s =>
      s.Description?.toLowerCase().includes(q) || s.RoadName?.toLowerCase().includes(q)
    ).slice(0, 8);
  }
  if (!matches.length) { document.getElementById(resultsId).style.display = 'none'; return; }
  document.getElementById(resultsId).innerHTML = matches.map((s, i) =>
    `<div class="unified-item" data-idx="${i}" onmousedown="selectGlobalPlanStop('${which}','${s.BusStopCode}','${s.Description?.replace(/'/g,"\\'")||''}')">
      <span class="unified-code">${s.BusStopCode}</span>
      <div><div class="unified-name">${s.Description || ''}</div><div class="unified-road">${s.RoadName || ''}</div></div>
    </div>`
  ).join('');
  document.getElementById(resultsId).style.display = 'block';
}

function onPlanKey(e, which) {
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  const items = document.getElementById(resultsId).querySelectorAll('.unified-item');
  let hi = which === 'from' ? planFromHighlight : planToHighlight;
  if (e.key === 'ArrowDown') hi = Math.min(hi+1, items.length-1);
  else if (e.key === 'ArrowUp') hi = Math.max(hi-1, -1);
  else if (e.key === 'Enter' && hi >= 0) { items[hi]?.dispatchEvent(new MouseEvent('mousedown')); return; }
  else if (e.key === 'Escape') { document.getElementById(resultsId).style.display = 'none'; return; }
  else return;
  if (which === 'from') planFromHighlight = hi; else planToHighlight = hi;
  items.forEach((el, i) => el.classList.toggle('highlighted', i === hi));
}

function selectGlobalPlanStop(which, code, name) {
  const inputId = which === 'from' ? 'planFromInput' : 'planToInput';
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  document.getElementById(inputId).value = name || code;
  document.getElementById(resultsId).style.display = 'none';
  if (which === 'from') planFromCode = code;
  else planToCode = code;
}

function clearPlanInput(which) {
  const inputId = which === 'from' ? 'planFromInput' : 'planToInput';
  const resultsId = which === 'from' ? 'planFromResults' : 'planToResults';
  document.getElementById(inputId).value = '';
  document.getElementById(resultsId).style.display = 'none';
  if (which === 'from') planFromCode = null;
  else planToCode = null;
}

// Calls the OneMap routing API (via proxy) to get up to 3 transit itineraries
// between two stops. OneMap handles transfers, MRT legs, and walking segments.
// We pass today's date and current time so the results reflect live timetables.
// Each bus leg in the result also gets a sun seat pill computed client-side
// from the leg's geometry and the sun's position at the estimated travel time.
async function doPlanSearch() {
  if (!planFromCode || !planToCode) { toast('<i class="fa-solid fa-triangle-exclamation"></i> Please select both a From and To stop'); return; }
  if (planFromCode === planToCode) { toast('<i class="fa-solid fa-triangle-exclamation"></i> From and To stops are the same'); return; }
  const fromStop = ALL_STOPS?.find(s => s.BusStopCode === planFromCode);
  const toStop = ALL_STOPS?.find(s => s.BusStopCode === planToCode);
  if (!fromStop || !toStop) { toast('<i class="fa-solid fa-triangle-exclamation"></i> Stop coordinates not found. Try again shortly.'); return; }
  const resultsEl = document.getElementById('plan-results');
  resultsEl.innerHTML = `<div class="loading-state"><div class="bus-loader"><i class="fa-solid fa-bus"></i></div><div class="loading-txt">Finding routes…</div></div>`;
  try {
    const onemapParams = `start=${fromStop.Latitude},${fromStop.Longitude}&end=${toStop.Latitude},${toStop.Longitude}&routeType=pt&date=${getTodayStr()}&time=${getTimeStr()}&mode=TRANSIT&maxWalkDistance=500&numItineraries=3`;
    const url = `${PROXY_URL}?endpoint=onemap&${onemapParams}`;
    const res = await fetch(url, { headers: await getProxyHeaders() });
    if (!res.ok) throw new Error('OneMap API error ' + res.status);
    const data = await res.json();
    const itineraries = data.plan?.itineraries;
    if (!itineraries?.length) { resultsEl.innerHTML = `<div class="error-card">No routes found between these stops.</div>`; return; }
    window._lastPlanItineraries = itineraries;
    renderPlanResults(itineraries);
  } catch(e) {
    resultsEl.innerHTML = `<div class="error-card"><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</div>`;
  }
}

function getTodayStr() {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
}

function getTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
}

// ── TRAIN SERVICE ALERTS ──
async function fetchTrainAlerts() {
  try {
    const res = await fetch(`${PROXY_URL}?endpoint=TrainServiceAlerts`, { headers: await getProxyHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const alerts = (data.value || []).filter(a => a.Status === 2);
    TRAIN_ALERTS = alerts;
    updateTrainAlertBanner();
    updateAllInlineAlerts();
  } catch(e) {}
}

function startTrainAlertPolling() {
  fetchTrainAlerts();
  if (trainAlertsPollTimer) clearInterval(trainAlertsPollTimer);
  trainAlertsPollTimer = setInterval(fetchTrainAlerts, 2 * 60 * 1000);
}

// Get the set of line abbrs currently visible to the user
function getVisibleMrtLines() {
  const lines = new Set();
  // From MRT pills in the DOM
  document.querySelectorAll('.mrt-line-pill, [data-mrt-line]').forEach(el => {
    const line = el.dataset.mrtLine || el.textContent.trim();
    if (line) lines.add(line);
  });
  // From planStops if plan tab is active
  if (planStops?.length) {
    planStops.forEach(s => {
      const info = planStopMap?.[s.BusStopCode];
      if (info?.Description) {
        const pills = mrtPillsForName(info.Description);
        pills.forEach(l => lines.add(l));
      }
    });
  }
  return lines;
}

// Extract MRT line abbrs from a stop name via MRT_LOOKUP (mirrors mrtPills stripping logic)
// Returns alerts where this stop's station codes are in the affected Stations list
function alertsForStopName(name) {
  if (!TRAIN_ALERTS.length || !name) return [];
  if (!Object.keys(MRT_LOOKUP).length) return [];
  const core = normalizeMrtStopName(name);
  const matches = MRT_LOOKUP[core] || MRT_LOOKUP[Object.keys(MRT_LOOKUP).find(k => k.length >= 5 && core === k)] || [];
  if (!matches.length) return [];
  const stnCodes = matches.map(m => m.stn_code.toUpperCase());
  return TRAIN_ALERTS.filter(a => {
    if (!a.Stations) return false;
    const affected = a.Stations.split(',').map(s => s.trim().toUpperCase());
    return stnCodes.some(c => affected.includes(c));
  });
}

function mrtPillsForName(name) {
  if (!name || !Object.keys(MRT_LOOKUP).length) return [];
  if (!/\b(Stn|Lrt|Int)\b/i.test(name)) return [];
  const core = normalizeMrtStopName(name);
  const matches = MRT_LOOKUP[core] || MRT_LOOKUP[Object.keys(MRT_LOOKUP).find(k => k.length >= 5 && core === k)] || [];
  return [...new Set(matches.map(({ stn_code }) => mrtLineName(stn_code)?.abbr).filter(Boolean))];
}

function alertsForLines(lines) {
  if (!lines?.size) return TRAIN_ALERTS;
  return TRAIN_ALERTS.filter(a => lines.has(a.Line));
}

function renderSettingsAlerts() {
  const enabled = alertBannerEnabled;
  const el = document.getElementById('settings-alert-banner');
  if (!el) return;
  el.innerHTML = [
    { id: true,  label: '<i class="fa-solid fa-bell"></i> Enabled' },
    { id: false, label: '<i class="fa-solid fa-bell-slash"></i> Disabled' },
  ].map(t => `<div class="settings-tab-opt ${enabled === t.id ? 'active' : ''}" onclick="setAlertBanner(${t.id})">
    <span>${t.label}</span>
    <span class="check"><i class="fa-solid fa-check"></i></span>
  </div>`).join('');
}

function setAlertBanner(enabled) {
  alertBannerEnabled = enabled;
  try { localStorage.setItem('shiokbus_alert_banner', enabled ? 'on' : 'off'); } catch(e) {}
  if (!enabled) document.getElementById('train-alert-banner')?.classList.remove('visible');
  else updateTrainAlertBanner();
  renderSettingsAlerts();
  toast(enabled ? '<i class="fa-solid fa-bell"></i> Train alerts enabled' : '<i class="fa-solid fa-bell-slash"></i> Train alerts disabled');
}

function updateTrainAlertBanner() {
  if (!alertBannerEnabled) return;
  const banner = document.getElementById('train-alert-banner');
  const titleEl = document.getElementById('train-alert-banner-title');
  const msgEl = document.getElementById('train-alert-banner-msg');
  if (!banner) return;
  const visible = getVisibleMrtLines();
  const relevant = visible.size ? alertsForLines(visible) : TRAIN_ALERTS;
  if (!relevant.length) {
    banner.classList.remove('visible');
    return;
  }
  const lines = [...new Set(relevant.map(a => a.Line))].join(', ');
  titleEl.textContent = `Train Disruption: ${lines}`;
  const msg = relevant[0]?.Message?.Content || '';
  msgEl.textContent = msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
  banner.classList.add('visible');
}

function updateAllInlineAlerts() {
  // Re-render any existing inline alert containers
  document.querySelectorAll('[data-train-alert-for]').forEach(el => {
    const line = el.dataset.trainAlertFor;
    const alert = TRAIN_ALERTS.find(a => a.Line === line);
    el.innerHTML = alert ? renderInlineAlert(alert) : '';
    el.style.display = alert ? '' : 'none';
  });
}

function renderInlineAlert(alert) {
  if (!alert) return '';
  const lineInfo = mrtLineName(alert.Stations?.split(',')[0]?.trim() || '');
  const color = lineInfo?.color || '#B8000A';
  const stations = alert.Stations || '';
  const direction = escapeHtml(alert.Direction || '');
  const freebus = alert.FreePublicBus || '';
  const shuttle = alert.FreeMRTShuttle || '';
  const msg = escapeHtml(alert.Message?.Content || '');
  const date = alert.Message?.CreatedDate ? new Date(alert.Message.CreatedDate).toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' }) : '';
  return `<div class="train-alert-inline">
    <div class="tai-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <div class="tai-body">
      <div class="tai-title"><span class="tai-pill" style="background:${color}">${escapeHtml(alert.Line)}</span> Service Disruption</div>
      ${direction ? `<div class="tai-detail"><b>Direction:</b> ${direction}</div>` : ''}
      ${stations ? `<div class="tai-detail"><b>Affected:</b> ${formatStationList(stations)}</div>` : ''}
      ${freebus ? `<div class="tai-detail"><b>Free bus:</b> ${formatStationList(freebus)}</div>` : ''}
      ${shuttle ? `<div class="tai-detail"><b>Free shuttle:</b> ${formatStationList(shuttle)}</div>` : ''}
      ${msg ? `<div class="tai-detail" style="margin-top:4px">${msg}${date ? ` <span style="opacity:.6">(${date})</span>` : ''}</div>` : ''}
    </div>
  </div>`;
}

function openTrainAlertModal() {
  const modal = document.getElementById('train-alert-modal');
  const content = document.getElementById('train-alert-modal-content');
  if (!modal || !content) return;
  if (!TRAIN_ALERTS.length) {
    content.innerHTML = '<p style="color:var(--muted);font-size:13px">No active train disruptions.</p>';
  } else {
    content.innerHTML = TRAIN_ALERTS.map(a => {
      const lineInfo = mrtLineName(a.Stations?.split(',')[0]?.trim() || '');
      const color = lineInfo?.color || '#B8000A';
      const msg = escapeHtml(a.Message?.Content || '');
      const date = a.Message?.CreatedDate ? new Date(a.Message.CreatedDate).toLocaleString('en-SG') : '';
      return `<div class="tam-alert">
        <div class="tam-alert-line"><span style="background:${color};padding:2px 8px;border-radius:4px;color:#fff;font-size:12px">${escapeHtml(a.Line)}</span> Service Disruption</div>
        ${a.Direction ? `<div class="tam-alert-row">Direction: <span>${escapeHtml(a.Direction)}</span></div>` : ''}
        ${a.Stations ? `<div class="tam-alert-row">Affected stations: <span>${formatStationList(a.Stations)}</span></div>` : ''}
        ${a.FreePublicBus ? `<div class="tam-alert-row"><i class="fa-solid fa-bus"></i> Free bus at: <span>${formatStationList(a.FreePublicBus)}</span></div>` : ''}
        ${a.FreeMRTShuttle ? `<div class="tam-alert-row"><i class="fa-solid fa-train-subway"></i> Free shuttle at: <span>${formatStationList(a.FreeMRTShuttle)}</span></div>` : ''}
        ${msg ? `<div class="tam-alert-msg">${msg}${date ? `<br><span style="opacity:.5;font-size:10px">${date}</span>` : ''}</div>` : ''}
      </div>`;
    }).join('');
  }
  modal.classList.add('visible');
}

function closeTrainAlertModal() {
  document.getElementById('train-alert-modal')?.classList.remove('visible');
}

function mrtLineName(code) {
  const c = (code || '').toUpperCase();
  if (c.startsWith('NS')) return { name: 'North South Line', abbr: 'NSL', color: '#D42E12' };
  if (c.startsWith('EW') || c.startsWith('CG')) return { name: 'East West Line', abbr: 'EWL', color: '#009645' };
  if (c.startsWith('NE')) return { name: 'North East Line', abbr: 'NEL', color: '#7B2D8B' };
  if (c.startsWith('CC') || c.startsWith('CE')) return { name: 'Circle Line', abbr: 'CCL', color: '#FA9E0D' };
  if (c.startsWith('DT')) return { name: 'Downtown Line', abbr: 'DTL', color: '#005EC4' };
  if (c.startsWith('TE')) return { name: 'Thomson-East Coast Line', abbr: 'TEL', color: '#9D5B25' };
  if (c.startsWith('BP')) return { name: 'Bukit Panjang LRT', abbr: 'BPL', color: '#748477' };
  if (c.startsWith('SE') || c.startsWith('SW') || c.startsWith('STC')) return { name: 'Sengkang LRT', abbr: 'SKL', color: '#748477' };
  if (c.startsWith('PE') || c.startsWith('PW') || c.startsWith('PTC')) return { name: 'Punggol LRT', abbr: 'PGL', color: '#748477' };
  return { name: code, abbr: code, color: '#4A4A4A' };
}

function getBusLegInfo(svc) {
  let badgeColor = '#D7181C';
  if (ALL_SERVICES) {
    const info = ALL_SERVICES[normalizeServiceNo(svc.toUpperCase()) + '-1'] || null;
    if (info?.Operator) {
      const op = info.Operator.toUpperCase();
      if (op === 'TTS') badgeColor = '#1A6B2A';
      else if (op === 'SBST' || op.includes('SBS')) badgeColor = '#5B2D8E';
      else if (op === 'GAS') badgeColor = '#9A7000';
    }
  }
  return { badgeColor };
}

function formatMins(m) {
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), rem = m % 60;
  if (rem === 0) return h === 1 ? '1 hour' : h + ' hours';
  return h + ' hr ' + rem + ' min';
}

async function renderPlanResults(itineraries) {
  const resultsEl = document.getElementById('plan-results');
  const fromName = document.getElementById('planFromInput').value.trim();
  const toName = document.getElementById('planToInput').value.trim();
  const planFavKey = 'plan_' + (planFromCode||'') + '_' + (planToCode||'');
  const isSaved = !!(window._favs && window._favs[planFavKey]);
  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px">
    <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase;flex-shrink:0">${itineraries.length} route${itineraries.length>1?'s':''} found</div>
    <button onclick="addPlanFav()" id="plan-fav-btn" style="background:none;border:1.5px solid var(--card-border);border-radius:20px;padding:4px 12px;font-size:12px;cursor:pointer;color:${isSaved?'var(--yellow)':'var(--muted)'};font-family:'LTAIdentity',sans-serif;font-weight:700;letter-spacing:.5px;transition:all .2s;white-space:nowrap;flex-shrink:0">
      ${isSaved ? '<i class="fa-solid fa-star"></i> Saved' : '<i class="fa-regular fa-star"></i> Save route'}
    </button>
  </div>`;
  itineraries.forEach((itin, idx) => {
    const totalMins = Math.round(itin.duration / 60);
    const walkMins = Math.round(itin.walkTime / 60);
    const transitLegs = itin.legs.filter(l => l.mode === 'BUS' || l.mode === 'SUBWAY' || l.mode === 'TRAM');
    const transfers = Math.max(0, transitLegs.length - 1);
    let legHtml = '';
    let busLegIdx = 0;
    itin.legs.forEach(leg => {
      if (leg.mode === 'WALK') {
        const wm = Math.round(leg.duration / 60);
        if (wm > 0) legHtml += `<div class="plan-leg plan-leg-walk" style="display:flex;align-items:center;gap:8px"><i class="fa-solid fa-person-walking"></i> <span class="plan-walk-pill">Walk</span> <span class="plan-leg-meta">${formatMins(wm)}</span></div>`;
      } else if (leg.mode === 'BUS') {
        const svc = leg.routeShortName || leg.route || '?';
        const legMins = Math.round(leg.duration / 60);
        const sunHtml = getPlanSunPill(leg);
        const { badgeColor } = getBusLegInfo(svc);
        const arrivalId = `plan-arrival-${idx}-${busLegIdx}`;
        busLegIdx++;
        legHtml += `
          <div class="plan-leg plan-leg-bus">
            <div style="display:flex;align-items:center;gap:8px">
              <i class="fa-solid fa-bus"></i> <div class="plan-bus-badge" style="background:${badgeColor}">${formatSvcNo(svc)}</div>
              <div class="plan-leg-meta">${formatMins(legMins)}</div>
              <div style="flex:1"></div>
              ${sunHtml}
            </div>
            <div class="plan-leg-stops" style="padding-left:24px"><span class="plan-stop-link" data-stop-name="${leg.from?.name||''}">${leg.from?.name||''}</span> → <span class="plan-stop-link" data-stop-name="${leg.to?.name||''}">${leg.to?.name||''}</span></div>
            <div id="${arrivalId}" style="padding-left:24px;margin-top:5px;font-size:12px;color:var(--muted)"><i class="fa-solid fa-spinner fa-spin"></i> Fetching arrival…</div>
          </div>`;
      } else if (leg.mode === 'SUBWAY' || leg.mode === 'TRAM') {
        const code = leg.routeShortName || leg.route || '?';
        const legMins = Math.round(leg.duration / 60);
        const { name: lineName, color: lineColor, abbr } = mrtLineName(code);
        const fromCode = leg.from?.stopCode;
        const toCode = leg.to?.stopCode;
        const stationPill = (c) => {
          if (!c) return '';
          const upper = c.toUpperCase();
          const isMrt = /^(NS|EW|CG|NE|CC|CE|DT|TE|BP|SE|SW|PE|PW)\d/.test(upper) || /^(STC|PTC)$/.test(upper);
          if (!isMrt) return '';
          return `<span class="mrt-line-pill" style="background:${lineColor}">${c}</span>`;
        };
        legHtml += `<div class="plan-leg plan-leg-mrt">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-train-subway"></i> <div class="plan-bus-badge" style="background:${lineColor}">${lineName}</div>
            <span class="plan-leg-meta">${formatMins(legMins)}</span>
          </div>
          <div class="plan-leg-stops" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-left:24px">
            <span>${leg.from?.name||''}</span>${stationPill(fromCode)}
            <span>→</span>
            <span>${leg.to?.name||''}</span>${stationPill(toCode)}
          </div>
          ${(() => {
            const legAffected = new Map();
            [fromCode, toCode].forEach(c => {
              if (!c) return;
              TRAIN_ALERTS.forEach(a => {
                if (!a.Stations) return;
                const affected = a.Stations.split(',').map(s => s.trim().toUpperCase());
                if (affected.includes(c.toUpperCase())) legAffected.set(a.Line, a);
              });
            });
            return [...legAffected.values()].map(renderInlineAlert).join('');
          })()}
        </div>`;
      }
    });
    // Build route summary pills
    const summaryParts = [];
    itin.legs.forEach(leg => {
      if (leg.mode === 'WALK') {
        const wm = Math.round(leg.duration / 60);
        if (wm > 0) summaryParts.push(`<span class="plan-summary-walk"><i class="fa-solid fa-person-walking"></i></span>`);
      } else if (leg.mode === 'BUS') {
        const svc = leg.routeShortName || leg.route || '?';
        const { badgeColor } = getBusLegInfo(svc);
        summaryParts.push(`<span class="plan-summary-bus" style="background:${badgeColor}">${svc}</span>`);
      } else if (leg.mode === 'SUBWAY' || leg.mode === 'TRAM') {
        const code = leg.routeShortName || leg.route || '?';
        const { color: lineColor, abbr } = mrtLineName(code);
        summaryParts.push(`<span class="plan-summary-mrt" style="background:${lineColor}">${abbr || code}</span>`);
      }
    });
    const summaryHtml = summaryParts.join('<span class="plan-summary-arrow">›</span>');

    // Check if any MRT leg uses affected stations
    const itinAlerts = new Map();
    itin.legs.forEach(leg => {
      if (leg.mode !== 'SUBWAY' && leg.mode !== 'TRAM') return;
      [leg.from?.stopCode, leg.to?.stopCode].forEach(code => {
        if (!code) return;
        TRAIN_ALERTS.forEach(a => {
          if (!a.Stations) return;
          const affected = a.Stations.split(',').map(s => s.trim().toUpperCase());
          if (affected.includes(code.toUpperCase())) itinAlerts.set(a.Line, a);
        });
      });
    });
    const itinWarnHtml = itinAlerts.size
      ? `<button onclick="event.stopPropagation();openTrainAlertModal()" title="Train disruption: ${[...itinAlerts.keys()].join(', ')}" style="background:none;border:none;cursor:pointer;font-size:18px;padding:0;line-height:1;flex-shrink:0"><i class="fa-solid fa-triangle-exclamation"></i></button>`
      : '';

    html += `
      <div class="plan-card" onclick="togglePlanCard(${idx})">
        <div class="plan-card-header">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1">
              <div class="plan-total-time">${formatMins(totalMins)}</div>
              <div class="plan-route-summary" style="margin-top:0">${summaryHtml}</div>
            </div>
            ${itinWarnHtml}
            <div style="font-size:18px;color:#999;transition:transform .2s" id="plan-chevron-${idx}">›</div>
        </div>
        <div class="plan-card-legs" id="plan-legs-${idx}" style="display:none">${legHtml}</div>
      </div>`;
  });
  resultsEl.innerHTML = html;
  togglePlanCard(0);

  // Fetch live arrivals for all bus legs in parallel
  const fetches = [];
  itineraries.forEach((itin, idx) => {
    let busLegIdx = 0;
    itin.legs.forEach(leg => {
      if (leg.mode !== 'BUS') return;
      const svc = leg.routeShortName || leg.route || '?';
      const boardCode = leg.from?.stopCode || '';
      const arrivalId = `plan-arrival-${idx}-${busLegIdx}`;
      busLegIdx++;
      if (!boardCode) {
        const el = document.getElementById(arrivalId);
        if (el) el.textContent = '';
        return;
      }
      fetches.push(
        fetchLTA(boardCode).then(data => {
          const el = document.getElementById(arrivalId);
          if (!el) return;
          const match = data.Services?.find(s => s.ServiceNo === svc);
          if (!match || !match.NextBus?.EstimatedArrival) {
            el.innerHTML = '<span style="font-size:11px;color:var(--muted)"><i class="fa-solid fa-triangle-exclamation"></i> No data</span>';
            return;
          }
          const nb1 = match.NextBus, nb2 = match.NextBus2, nb3 = match.NextBus3;
          const loadColor = { SEA: 'var(--green)', SDA: '#FF8C00', LSD: '#FF3333' };
          function timing(nb) {
            if (!nb?.EstimatedArrival) return '';
            const m = minsFrom(nb.EstimatedArrival);
            const label = m <= 0 ? 'ARR' : `${m}`;
            const unit = m <= 0 ? '' : 'min';
            const col = loadColor[nb.Load] || 'var(--muted)';
            return `<div style="display:flex;align-items:center;gap:4px;min-width:40px">
              <div style="font-family:'LTAIdentity',sans-serif;font-weight:700;font-size:13px;line-height:1;color:var(--muted)">${label}<span style="font-size:10px;font-weight:500;margin-left:1px">${unit}</span></div>
              ${busTypeIcon(nb.Type, true, col)}
            </div>`;
          }
          el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:2px 0 0">
            ${timing(nb1)}${timing(nb2)}${timing(nb3)}
          </div>`;
        }).catch(() => {
          const el = document.getElementById(arrivalId);
          if (el) el.textContent = '';
        })
      );
    });
  });
  await Promise.allSettled(fetches);
}

function togglePlanCard(idx) {
  const legs = document.getElementById('plan-legs-' + idx);
  const chevron = document.getElementById('plan-chevron-' + idx);
  if (!legs) return;
  const open = legs.style.display === 'none';
  legs.style.display = open ? 'block' : 'none';
  if (chevron) chevron.style.transform = open ? 'rotate(90deg)' : '';
}

function getPlanSunPill(leg) {
  const fromLat = leg.from?.lat, fromLng = leg.from?.lon;
  const toLat = leg.to?.lat, toLng = leg.to?.lon;
  if (!fromLat || !toLat) return '';
  const bear = bearingBetween(fromLat, fromLng, toLat, toLng);
  const sun = getSunAtTime(new Date());
  if (sun.alt < 3) return `<div class="plan-sun-pill" style="background:#1E3560;color:var(--muted)"><i class="fa-solid fa-glasses"></i> Any seat</div>`;
  const rel = (sun.az - bear + 360) % 360;
  const perp = Math.abs(Math.sin(rel*Math.PI/180));
  const altF = Math.sin(Math.abs(sun.alt)*Math.PI/180);
  const score = perp * altF;
  if (score < 0.1) return `<div class="plan-sun-pill" style="background:#1E3560;color:var(--muted)"><i class="fa-solid fa-glasses"></i> Any seat</div>`;
  const recSide = rel < 180 ? 'left' : 'right';
  return `<div class="plan-sun-pill"><i class="fa-solid fa-sun"></i> Sit ${recSide}</div>`;
}

// ── SETTINGS DRAWER ──
function openSettings() {
  renderSettingsAccount();
  renderSettingsDefaultTab();
  renderSettingsTheme();
  renderSettingsAlerts();
  document.getElementById('settings-overlay').style.display = 'block';
  requestAnimationFrame(() => {
    document.getElementById('settings-drawer').style.transform = 'translateX(0)';
  });
}

function closeSettings() {
  document.getElementById('settings-drawer').style.transform = 'translateX(100%)';
  setTimeout(() => {
    document.getElementById('settings-overlay').style.display = 'none';
  }, 300);
}

function renderSettingsAccount() {
  const el = document.getElementById('settings-account-content');
  if (!el) return;
  if (window._currentUser) {
    const u = window._currentUser;
    el.innerHTML = `
      <div class="settings-account-row">
        <img src="${u.photoURL||''}" style="width:42px;height:42px;border-radius:50%;flex-shrink:0" onerror="this.style.display='none'">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--white)">${u.displayName||'User'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${u.email||''}</div>
        </div>
      </div>
      <button class="settings-signout-btn" onclick="settingsSignOut()">Sign out</button>`;
  } else {
    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;padding-top:4px">Sign in to save favourites and routes across devices.</div>
      <button class="settings-signin-btn" onclick="settingsSignIn()"><i class="fa-solid fa-user"></i> Sign in with Google</button>`;
  }
}

function renderSettingsDefaultTab() {
  const saved = localStorage.getItem('shiokbus_default_tab') || 'service';
  const tabs = [
    { id: 'service', label: '<i class="fa-solid fa-bus"></i> Bus Service' },
    { id: 'stop',    label: '<i class="fa-solid fa-magnifying-glass"></i> Bus Stop' },
    { id: 'plan',    label: '<i class="fa-solid fa-map-location-dot"></i> Plan' },
    { id: 'favs',    label: '<i class="fa-solid fa-star"></i> Favourites', requiresAuth: true },
  ];
  const el = document.getElementById('settings-default-tab');
  if (!el) return;
  el.innerHTML = tabs
    .filter(t => !t.requiresAuth || window._currentUser)
    .map(t => `<div class="settings-tab-opt ${saved === t.id ? 'active' : ''}" onclick="setDefaultTab('${t.id}')">
      <span>${t.label}</span>
      <span class="check"><i class="fa-solid fa-check"></i></span>
    </div>`).join('');
}

function renderSettingsTheme() {
  const isLight = document.body.classList.contains('light');
  const el = document.getElementById('settings-theme-opts');
  if (!el) return;
  el.innerHTML = [
    { id: 'dark',  label: '<i class="fa-solid fa-moon"></i> Dark' },
    { id: 'light', label: '<i class="fa-solid fa-sun"></i> Light' },
  ].map(t => `<div class="settings-tab-opt ${(!isLight && t.id==='dark') || (isLight && t.id==='light') ? 'active' : ''}" onclick="setTheme('${t.id}')">
    <span>${t.label}</span>
    <span class="check"><i class="fa-solid fa-check"></i></span>
  </div>`).join('');
}

function saveUiPreferences(partial) {
  if (!window._currentUser || !window._fbDb || !window._fbDoc || !window._fbSetDoc) return;
  try {
    const ref = window._fbDoc(window._fbDb, 'users', window._currentUser.uid, 'preferences', 'ui');
    window._fbSetDoc(ref, partial, { merge: true });
  } catch (e) {}
}

function applyThemeOnly(theme) {
  const isLight = document.body.classList.contains('light');
  if (theme === 'light' && !isLight) {
    document.body.classList.add('light');
    updateMapTiles();
  } else if (theme === 'dark' && isLight) {
    document.body.classList.remove('light');
    updateMapTiles();
  }
}

function setTheme(theme, opts = {}) {
  const { saveRemote = true, showToast = true } = opts;
  const wasLight = document.body.classList.contains('light');
  applyThemeOnly(theme);
  const isLightNow = document.body.classList.contains('light');
  const changed = wasLight !== isLightNow;
  try { localStorage.setItem('shiokbus_theme', theme); } catch(e) {}
  if (saveRemote) saveUiPreferences({ theme });
  renderSettingsTheme();
  if (showToast && changed) {
    toast(theme === 'light' ? '<i class="fa-solid fa-sun"></i> Light mode enabled' : '<i class="fa-solid fa-moon"></i> Dark mode enabled');
  }
}

function setDefaultTab(tab) {
  try { localStorage.setItem('shiokbus_default_tab', tab); } catch(e) {}
  saveUiPreferences({ defaultTab: tab });
  renderSettingsDefaultTab();
  toast('<i class="fa-solid fa-check"></i> Default tab saved');
}

async function loadUiPreferences() {
  if (!window._currentUser || !window._fbDb || !window._fbDoc || !window._fbGetDoc) return;
  try {
    const ref = window._fbDoc(window._fbDb, 'users', window._currentUser.uid, 'preferences', 'ui');
    const snap = await window._fbGetDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() || {};

    if (data.theme === 'light' || data.theme === 'dark') {
      setTheme(data.theme, { saveRemote: false, showToast: false });
    }

    const allowedTabs = new Set(window._currentUser ? ['service', 'stop', 'plan', 'favs'] : ['service', 'stop', 'plan']);
    if (typeof data.defaultTab === 'string' && allowedTabs.has(data.defaultTab)) {
      try { localStorage.setItem('shiokbus_default_tab', data.defaultTab); } catch(e) {}
      switchTab(data.defaultTab);
    }

    renderSettingsDefaultTab();
  } catch (e) {}
}

window.loadUiPreferences = loadUiPreferences;

async function settingsSignIn() {
  closeSettings();
  await authAction();
}

async function settingsSignOut() {
  closeSettings();
  document.getElementById('signout-modal').style.display = 'flex';
}

function updateMapTiles() {
  const isLight = document.body.classList.contains('light');
  const tileUrl = isLight
    ? 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'
    : 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.onemap.gov.sg" target="_blank">OneMap</a> &copy; Singapore Land Authority';
  [tripMap].forEach(map => {
    if (!map) return;
    map.eachLayer(l => { if (l._url) map.removeLayer(l); });
    L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map);
  });
  // Redraw polylines so no-sun color updates immediately
  if (tripMap && planBoardIdx >= 0 && planAlightIdx >= 0) {
    const sliced = planStops.slice(planBoardIdx, planAlightIdx + 1);
    initTripMap(sliced, planBoardIdx, planAlightIdx);
  }
}

// ── RAIN FORECAST ──
let _rainData = {};

async function fetchRainForecast() {
  try {
    const res = await fetch('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast');
    const data = await res.json();
    _rainData = {};
    const forecasts = data.items?.[0]?.forecasts || [];
    forecasts.forEach(f => {
      _rainData[f.area.toLowerCase()] = f.forecast;
    });
  } catch(e) {}
}

// Looks up the 2-hour rain forecast for a pair of coordinates by finding the
// nearest NEA forecast area. The forecast areas are polygons stored as bounding
// boxes; we just check which one the stop falls inside. Falls back to the
// closest centroid if no polygon matches (e.g. offshore stops like Sentosa).
function getRainForCoords(lat, lng) {
  if (!lat || !lng || !Object.keys(_rainData).length) return null;
  // Map coordinates to NEA planning area using rough bounding boxes
  // Key areas mapped by lat/lng centroids — expand as needed
  const areas = [
    { area: 'ang mo kio',        lat: 1.3691, lng: 103.8454 },
    { area: 'bedok',             lat: 1.3236, lng: 103.9273 },
    { area: 'bishan',            lat: 1.3526, lng: 103.8352 },
    { area: 'boon lay',          lat: 1.3388, lng: 103.7066 },
    { area: 'bukit batok',       lat: 1.3590, lng: 103.7637 },
    { area: 'bukit merah',       lat: 1.2819, lng: 103.8239 },
    { area: 'bukit panjang',     lat: 1.3774, lng: 103.7719 },
    { area: 'bukit timah',       lat: 1.3294, lng: 103.8021 },
    { area: 'central water catchment', lat: 1.4050, lng: 103.8116 },
    { area: 'changi',            lat: 1.3644, lng: 103.9915 },
    { area: 'choa chu kang',     lat: 1.3840, lng: 103.7470 },
    { area: 'clementi',          lat: 1.3162, lng: 103.7649 },
    { area: 'city',              lat: 1.2897, lng: 103.8501 },
    { area: 'geylang',           lat: 1.3201, lng: 103.8918 },
    { area: 'hougang',           lat: 1.3612, lng: 103.8863 },
    { area: 'jurong east',       lat: 1.3329, lng: 103.7436 },
    { area: 'jurong island',     lat: 1.2650, lng: 103.7100 },
    { area: 'jurong west',       lat: 1.3404, lng: 103.7090 },
    { area: 'kallang',           lat: 1.3100, lng: 103.8714 },
    { area: 'lim chu kang',      lat: 1.4362, lng: 103.7179 },
    { area: 'mandai',            lat: 1.4197, lng: 103.8198 },
    { area: 'marine parade',     lat: 1.3020, lng: 103.9070 },
    { area: 'novena',            lat: 1.3204, lng: 103.8438 },
    { area: 'pasir ris',         lat: 1.3721, lng: 103.9474 },
    { area: 'paya lebar',        lat: 1.3180, lng: 103.8930 },
    { area: 'pioneer',           lat: 1.3157, lng: 103.6969 },
    { area: 'pulau tekong',      lat: 1.4046, lng: 104.0530 },
    { area: 'pulau ubin',        lat: 1.4050, lng: 103.9600 },
    { area: 'punggol',           lat: 1.3984, lng: 103.9072 },
    { area: 'queenstown',        lat: 1.2942, lng: 103.7861 },
    { area: 'seletar',           lat: 1.4044, lng: 103.8696 },
    { area: 'sembawang',         lat: 1.4491, lng: 103.8185 },
    { area: 'sengkang',          lat: 1.3868, lng: 103.8914 },
    { area: 'sentosa',           lat: 1.2494, lng: 103.8303 },
    { area: 'serangoon',         lat: 1.3554, lng: 103.8679 },
    { area: 'southern islands',  lat: 1.2056, lng: 103.8420 },
    { area: 'sungei kadut',      lat: 1.4138, lng: 103.7584 },
    { area: 'tampines',          lat: 1.3496, lng: 103.9568 },
    { area: 'tanglin',           lat: 1.3063, lng: 103.8132 },
    { area: 'tengah',            lat: 1.3740, lng: 103.7237 },
    { area: 'toa payoh',         lat: 1.3343, lng: 103.8563 },
    { area: 'tuas',              lat: 1.2966, lng: 103.6357 },
    { area: 'western islands',   lat: 1.2050, lng: 103.7400 },
    { area: 'western water catchment', lat: 1.4050, lng: 103.6900 },
    { area: 'woodlands',         lat: 1.4382, lng: 103.7890 },
    { area: 'yishun',            lat: 1.4304, lng: 103.8354 },
  ];
  // Find closest area centroid
  let closest = null, minDist = Infinity;
  areas.forEach(a => {
    const d = Math.hypot(lat - a.lat, lng - a.lng);
    if (d < minDist) { minDist = d; closest = a.area; }
  });
  return closest ? (_rainData[closest] || null) : null;
}

function rainBadgeHtml(forecast) {
  if (!forecast) return '';
  const f = forecast.toLowerCase();
  if (f.includes('fair') || f.includes('partly cloudy') || f.includes('cloudy')) return '';
  if (f.includes('thunder') || f.includes('shower') || f.includes('rain') ||
      f.includes('drizzle') || f.includes('mist') || f.includes('fog')) {
    return `<div class="rain-badge"><i class="fa-solid fa-cloud-rain"></i> ${forecast}</div>`;
  }
  return '';
}