# 🚌 ShiokBus

> **Ride comfortable, every time.**

A mobile-first Singapore bus app with real-time arrivals, full route exploration, private bus services, and a unique **sun seat recommendation** — so you always know which side of the bus to sit on to stay in the shade.

**Live at → [shiokbus.web.app](https://shiokbus.web.app)**

---

## Video Demo


https://github.com/user-attachments/assets/9861230e-5e1a-4d0f-86ac-603cab2c63d3


---

## Features

### Real-time arrivals
- Live arrival times for all LTA public bus services with passenger load indicators (seats available / standing / limited) and bus type icons (single deck, double deck, bendy)
- Per-stop arrival rows within route view — expand any stop while browsing a route to see live arrivals without leaving the page
- 2-hour rain forecast badge on stop cards, sourced from data.gov.sg, showing current weather conditions near each stop

### Private & scheduled bus services
Coverage beyond LTA's public network — fully integrated alongside public buses with the same UI:

| Network | Type | Services |
| :--- | :--- | :--- |
| **PBS** (Private Bus Services) | Scheduled timetable | 550, 555, 560, 565, 593, 722, 728, 736, 740, 742, 753, 762, 767, 776, LCS2 and more |
| **Sentosa Island Buses** | Frequency-based | Bus A (Beach Station loop), Bus B (Sentosa Cove loop), Bus D (on-demand Fri/Sat/Sun evenings) |
| **NTU Campus Rider** | Live (ETAs + bus positions) | Blue, Brown, Green, Grey, Red |
| **NUS Internal Shuttles** | Live (ETAs + bus positions) | A1, A2, D1, D2, K, P, R1, R2 |

Scheduled services show synthesised arrival times computed from timetable data. Frequency-based services (Sentosa buses) compute upcoming arrivals from headway and per-stop travel offsets, including buses already mid-route. 

### NTU Campus Rider shuttles
The five NTU campus loops (Blue, Brown, Green, Grey, Red) sit alongside public buses in search, stop view, route view and favourites.

- **Live ETAs** — next two buses per route at every stop, on stop cards and inside expanded stops in the route view
- **Crowd levels** — each ETA carries the same seats / standing / limited icon and colours as public buses
- **Live map** — a **Live** button on each NTU route opens a map with the loop drawn along the road, one marker per active bus (colour ring = crowd level), refreshed every 15 s while the map is open
- **Tap a stop for arrivals** — every stop on the live map opens a popup with the next two buses for each NTU route calling there, plus public bus arrivals when the stop is a real LTA stop
- **Timetable awareness** — first/last bus from NTU's term timetable; when there is no ETA the card says why ("First bus 07:30", "Service ended · last bus 23:00", "No service today") instead of showing a blank. Green runs on weekdays only and Brown covers weekends and public holidays
- **Loop-aware planning** — NTU routes show as `first ↻ last`, and in *Where to sit?* you can board anywhere and alight at any other stop on the loop, including stops before the board stop (the bus simply keeps circling)
- **NTU styling** — pills use the route colour with an NTU-orange ring; operator shown as *NTU (ComfortDelGro)*, category as *Campus Rider*

### NUS Internal Shuttles
The eight NUS campus routes (A1, A2, D1, D2, K, P, R1, R2) are integrated the same way as NTU's, so they appear in search, stop view, route view and favourites next to public buses.

- **Live ETAs** — up to three upcoming buses per route at every stop, on stop cards and inside expanded stops in the route view
- **Crowd levels** — each ETA carries the same seats / standing / limited icon and colours as public buses
- **Live map** — a **Live** button on each NUS route opens a map with the route drawn along the road and one marker per active bus (colour ring = crowd level, arrow = heading, tooltip shows passengers / capacity), refreshed every 15 s while the map is open
- **Tap a stop for arrivals** — every stop on the live map opens a popup with arrivals for all NUS routes calling at that stop, plus public bus arrivals at stops shared with LTA
- **Timetable awareness** — first/last bus from NUS's published timetable; when there is no ETA the card says why ("First bus 07:15", "Service ended · last bus 23:00", "No service today"). K does not run on Sundays, and P, R1 and R2 are weekdays only
- **Loops and point-to-point routes** — A1, A2, D1, D2, K and P are loops (`first ↻ last`, with loop-mode planning in *Where to sit?*); R1 and R2 are one-way routes (`first → last`) and are planned like ordinary linear routes
- **NUS styling** — pills use each route's official colour with a matching text colour (dark text on the yellow A2 and grey P)

### Sun Seat Recommendation
The unique proposition of this project. Two modes:

**Live Arrivals View** — for the next arriving bus, calculates which side of the bus faces the sun and recommends left or right. Takes into account bus type (upper deck of a double-decker gets a separate recommendation).

**Plan Trip (route sun analysis)** — select a boarding and alighting stop on the route map. The app scores every road segment along your journey by `perpendicular_sun_component × altitude_factor × segment_distance`, then recommends the consistently shadier side for the full trip. The route map is colour-coded from shade (blue) through mild to strong sun (red/orange). A live sun marker and direction ray are drawn on the map.

For night rides or when the sun is below 3° altitude the app returns "any seat is fine."

### Route explorer
- Full stop-by-stop route view with expandable per-stop arrivals, first/last bus timings, and service frequency formatted by time-of-day
- Direction tabs for services with two directions; loop services show their midpoint via label
- Dual-loop services (e.g. 291, 293, 358, 359, 812) correctly labelled per visit — outbound and inbound legs distinguished at each stop
- Road-snapped route geometry via OSRM, colour-coded by sun exposure per segment
- Operator colour coding: SBS Transit (purple), SMRT (red), Tower Transit Singapore (green), Go-Ahead Singapore (gold), unknown private operators (navy)

### Stop search & discovery
- Unified search across stop names, road names, and stop codes
- **Near Me** — GPS-based discovery of the nearest bus stops with walking distance
- **Popular Interchanges** quick-access grid (12 major interchanges)
- MRT line pills on stop and route cards — visually flags MRT-adjacent stops with colour-coded line badges (NS, EW, NE, CC, DT, TE, JR, CR, LRT)

### Interactive MRT network map
Full Singapore MRT/LRT network map overlay with pinch-to-zoom and scroll-to-zoom. Tap any station hotspot to instantly jump to that interchange's bus arrivals.

### Journey planner
- Point-to-point routing via OneMap API with multiple itinerary options
- Each bus leg in the itinerary shows a sun seat pill — which side to sit on for that specific leg's geometry and current sun position
- Save frequently used origin–destination pairs as favourite plans

### Favourites
- Star stops, services, and planned routes — synced to your account via Firestore
- Drag-and-drop reordering within each favourites section (stops, services, plans), persisted per user
- Tap any favourite card to jump directly to that stop, route, or plan

### Train service alerts
- Live LTA train disruption alerts polled every minute
- Sticky banner at the top of the app when any MRT line is disrupted
- Inline alert cards shown on relevant stop cards (e.g. an NSL disruption shows on stops near NSL stations)
- Full alert modal with per-line breakdown and affected station details
- Toggle the banner on/off in Settings

### Settings
- Light and dark themes, persisted to localStorage; map tiles switch automatically
- Configurable default landing tab (Stop or Service)
- Google Sign-In for cross-device favourites sync
- Toggle train disruption banner visibility

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Fonts | Barlow Condensed + Barlow (Google Fonts) |
| Maps | Leaflet.js + OneMap tiles + OSRM road geometry |
| Backend Proxy | Cloudflare Workers |
| Static Data Storage | Cloudflare R2 |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Firestore (per-user favourites & order) |
| Hosting | Firebase Hosting |
| Public bus data | LTA DataMall API |
| NTU shuttle data | NTU Omnibus (unofficial, undocumented — see [NTU caveats](#caveats)) |
| NUS shuttle data | NUS shuttle ETA and bus-tracking feeds (unofficial — see [NUS caveats](#caveats-1)) |
| Journey planning | OneMap Routing API |
| Rain forecast | data.gov.sg 2-hour forecast API |
| Road geometry | OSRM public routing API |

---

## Architecture

```
Browser (index.html served from Firebase Hosting)
    │
    ├── Static data (stops, routes, services, MRT stations)
    │       └──► Cloudflare Worker ──► Cloudflare R2
    │               (nightly cron syncs full LTA dataset)
    │
    ├── Real-time arrivals
    │       └──► Cloudflare Worker ──► LTA DataMall BusArrival v3
    │
    ├── Journey planning
    │       └──► Cloudflare Worker ──► OneMap Routing API
    │               (OneMap token cached in-worker, refreshed every ~3 days)
    │
    ├── Train service alerts
    │       └──► Cloudflare Worker ──► LTA DataMall TrainServiceAlerts
    │
    ├── Rain forecast ──────────────────► data.gov.sg (direct from browser)
    │
    ├── Road geometry ──────────────────► OSRM public API (direct from browser)
    │
    ├── Private bus timetables ─────────► ./assets/ (pbs-services.json,
    │                                       sentosa-services.json)
    │
    ├── NTU campus shuttles
    │       ├── routes, stops, timetable ─► ./assets/ntu-shuttle.json, ntu-paths.json
    │       └── live ETAs + bus positions ► Cloudflare Worker ──► NTU Omnibus (unofficial)
    │               (stop/route allowlist, 30 s edge cache, anonymous session handled in-worker)
    │
    ├── NUS campus shuttles
    │       ├── routes, stops, timetable ─► ./assets/nus-shuttle.json, nus-paths.json
    │       └── live ETAs + bus positions ► Cloudflare Worker ──► NUS shuttle feeds (unofficial)
    │               (one ETA call per stop returns every route calling there)
    │
    └── Auth + Favourites ──────────────► Firebase Auth + Firestore
```

### Cloudflare Worker security
- **CORS origin check** — only `shiokbus.web.app` and `shiokbus.firebaseapp.com` are allowed; preflight OPTIONS requests are validated before any other processing
- **LTA API key** — stored only in Worker environment variables, never exposed to the browser
- **Rate limiting** — 30 requests per minute per IP, counted in Workers KV (`RATE_LIMIT_KV`)
- **Input validation** — service numbers, stop codes and NTU stop/route pairs are validated before anything is forwarded upstream
- **Static file allowlist** — `endpoint=static` only serves named data files, so sync state in R2 is not readable

> The origin check is a CORS control for browsers, not authentication: a non-browser client can omit the `Origin` header. The rate limit and input validation are what protect the upstream APIs.

### Worker endpoints

| Mode | Endpoint param | Description |
| :--- | :--- | :--- |
| Static | `static` | Streams a file directly from R2 (stops, services, routes, MRT stations) |
| Route | `route` | Filters `bus-routes.json` by service number; result cached 5 hours in-worker |
| Arrivals | `BusArrival` | Live pass-through to LTA DataMall BusArrival v3 |
| Journey | `onemap` | Proxies OneMap routing API with cached auth token |
| Alerts | `TrainServiceAlerts` | Live pass-through to LTA DataMall train alerts |
| NTU ETAs | `NtuShuttle` | Next two ETAs for one NTU stop and route (`BusStopCode` = NTU stop name, `RouteCode` = Blue/Brown/Green/Grey/Red); only allowlisted pairs reach NTU; cached 30 s |
| NTU buses | `NtuBuses` | Active buses on an NTU route (`RouteCode`) with position and crowd level; polled by the live map and crowd icons |
| NUS ETAs | `NusShuttle` | Live ETAs for one NUS stop (`BusStopName` = NUS stop name, e.g. `KRB`); the response lists every NUS route calling there with up to three ETAs in seconds |
| NUS buses | `NusBuses` | Active buses on an NUS route (`RouteCode` = A1/A2/D1/D2/K/P/R1/R2) with position, heading, crowd level and load; polled by the live map and crowd icons |

### R2 data sync (cron Worker)
Runs nightly across four staggered cron triggers (02:00–02:45 SGT). Each trigger fetches up to 30 pages (500 records each) and stores progress in R2, allowing the full LTA dataset to be accumulated across multiple runs without hitting Worker CPU limits.

| Cron (UTC) | SGT | Dataset |
| :--- | :--- | :--- |
| `0 18 * * *` | 02:00 | `bus-routes.json` |
| `15 18 * * *` | 02:15 | `bus-routes.json` (continuation if needed) |
| `30 18 * * *` | 02:30 | `bus-services.json` |
| `45 18 * * *` | 02:45 | `stops.json` |

### Private service architecture
Private services (PBS, Sentosa) are loaded from local JSON assets at startup and injected into the same `ALL_SERVICES` map as LTA data. A `PRIVATE_STOP_INDEX` is built at inject time mapping each bus stop code to all private service stop entries that call there — enabling O(1) lookup when expanding a stop in the route view, regardless of how many services share that stop.

Two arrival synthesis modes:
- **Scheduled** (`DepartureTimes` present) — per-stop `Timings` objects map each departure to its arrival time at that stop; upcoming arrivals within a ±2–45 minute window are shown
- **Frequency-based** (`DepartureTimes` empty) — headway and `StopOffsetMins` per stop compute the next three arrivals from the current time and operating hours. The synthesiser walks back enough intervals to include buses already en route, so mid-route stops correctly show the approaching bus rather than only the next departure from origin

---

## Campus Shuttle Integration

Campus shuttles are not in LTA DataMall, so NTU and NUS are each integrated as their own source and made to look like any other service in the app.

- Routes, stops, colours and timetables are generated into a static JSON file (`ntu-shuttle.json`, `nus-shuttle.json`) and merged into `ALL_SERVICES` at startup
- Code both campuses need lives in `scripts/campus.js` (timetable status, crowd ranking, request caching, stop cards and rows, live map base, bus markers, stop popup). `ntu.js` and `nus.js` hold only what is specific to each upstream. All three load before `app.js`, and services are treated through flags (`_isNtu`, `_isNus`)
- Live ETAs and bus positions go through the Cloudflare Worker, never straight from the browser
- A stop shared with public buses keeps its real LTA code and gets campus cards appended; campus-only stops get a synthetic code (`NTU-…`, `NUS-<n>`) and skip LTA. Live lookups use the campus **stop name**, never the code
- The **Live** button opens a shared map modal; tapping a stop opens a popup with campus arrivals, plus public bus arrivals at stops shared with LTA
- Crowd uses the same levels as public buses (`SEA`, `SDA`, `LSD`) and never blocks an ETA

| | NTU | NUS |
| :--- | :--- | :--- |
| Routes | Blue, Brown, Green, Grey, Red (all loops) | A1, A2, D1, D2, K, P (loops), R1, R2 (one-way) |
| Client script | `scripts/ntu.js` (on `campus.js`) | `scripts/nus.js` (on `campus.js`) |
| ETA lookup | One call per stop and route | One call per stop, covers every route there |
| Worker endpoints | `NtuShuttle`, `NtuBuses` | `NusShuttle`, `NusBuses` |
| Bus markers | No vehicle id, matched by distance | Per-bus id, with heading arrows |

### NTU

- **Data** — `assets/ntu-shuttle.json` (routes, stops, first/last bus) and optional `assets/ntu-paths.json` (road polylines for the live map; falls back to straight lines). Generated from NTU's own pickup-point responses so the app data and the Worker's `NTU_PAIRS` allowlist cannot drift apart. See [`scripts/ntu/README.md`](scripts/ntu/README.md)
- **Client** — `ntu.js` queries NTU's feeds and maps ETAs onto routes; stop cards, route rows, timetable status, live map and popup come from `campus.js`. `app.js` calls into it by name and switches the Board/Alight planner into loop mode
- **Worker** — `NtuShuttle` only accepts allowlisted `(stop, route)` pairs, caches 30 s, and performs the same anonymous session handshake as NTU's own app. If NTU's app version changes it returns 503 until `NTU_MODULE_VERSION` and `NTU_API_VERSION` are updated (copy them from the `ActionGetETAAndNextETA_FMS` request in DevTools)
- **Requests** — ETAs cached 20 s per stop and route, bus positions 10 s; the live map polls every 15 s only while open and visible, and greys out markers after 90 s without fresh data
- **Crowd** — estimated: each active bus is snapped to its nearest stop on the loop and ranked by stops to go, so it is approximate where the loop doubles back

#### Caveats
- The NTU endpoint is **undocumented and unofficial**, and ShiokBus is not affiliated with or endorsed by NTU or ComfortDelGro
- Please do not shorten the cache times or remove the allowlist
- Grey has no term timetable data, so it shows no first/last bus times

### NUS

- **Data** — `assets/nus-shuttle.json` (routes, stops, colours, first/last bus) and optional `assets/nus-paths.json` (road polylines; falls back to straight lines, closed for loops). Generated by `build_nus_assets.py`. Each stop has an `NusStopName` (the lookup key, e.g. `KRB`) and a display `Description`
- **Client** — `nus.js` is the counterpart of `ntu.js`, built on the same `campus.js` helpers. Loops show `first ↻ last` and R1/R2 show `first → last` and are planned as ordinary linear routes
- **Worker** — `NusShuttle` returns every NUS route at a stop with up to three ETAs in seconds; `NusBuses` returns the active buses on a route (position, heading, crowd, passengers / capacity)
- **Requests** — ETAs cached 20 s per stop, so a stop served by A1 + D1 + R1 costs one request. Minutes are computed at render time from the feed's own timestamp (falling back to the response time if that looks wrong), so cached responses never show stale times. Positions are cached 10 s and polled every 15 s while the live map is open
- **Stop popup** — lists every NUS route calling at the stop (not just the one being viewed), with the next two ETAs and crowd bars, then public bus arrivals at stops with a real LTA code
- **Crowd** — estimated the same way as NTU, except that on R1/R2 a bus that has already passed the stop is dropped

#### Caveats
- The NUS feeds are **unofficial and undocumented**, and ShiokBus is not affiliated with or endorsed by NUS
- K has no Sunday service, and P, R1 and R2 are weekdays only, so they show "No service today" outside those days

---

## Design considerations

### General

**No build step.** Vanilla HTML, CSS and JavaScript served as static files keeps the project easy to run and change: a local HTTP server is all that is needed. The cost is large hand-maintained files, which is why newer, self-contained features (NTU, NUS) go in their own script.

**The Worker is a thin, strict proxy.** API keys stay server-side. The Worker never takes a hostname or URL from the client; service numbers, stop codes, NTU stop/route pairs and static file names are validated or allowlisted before anything is fetched.

**Cache at every layer.** Slow-changing data comes from R2 (synced nightly) and is cached in the Worker for hours. Live data is cached for seconds at the edge and again in the browser. This keeps the app fast and the upstream APIs lightly loaded.

**One service model.** Private, NTU and NUS services are merged into the same `ALL_SERVICES` map as LTA services, so search, route view, favourites and the sun planner work on them without special screens. Source-specific behaviour hangs off flags (`_isPrivate`, `_isScheduled`, `_isNtu`, `_isNus`) rather than separate code paths.

**Sun maths runs in the browser.** The seat recommendation needs only the time, the route geometry and the sun's position, so no server round-trip is needed and nothing about the user's trip leaves the device.

**Optional layers fail soft.** Crowd levels, road-following paths and stop coordinates are enhancements. If any are missing, the feature degrades (neutral icon, straight lines, "not enough location data") instead of breaking the page.

### NTU-specific

**Treat an unofficial upstream politely.** The integration only works through an undocumented service, so it is built to be a good citizen: an allowlist of the 56 valid stop and route pairs, a 30 s shared cache, short-lived error caching, an honest `User-Agent`, and low per-user rate limits. It reproduces the anonymous session that every visitor to NTU's own app gets, and nothing more.

**Fail visibly, not silently.** A version change returns a specific 503 and a clear message rather than empty data, and the UI says when live times are unavailable or why a route has no ETA.

**Generated data, single source.** The app's route data and the Worker allowlist are produced by the same script from the same input, so a renamed stop cannot be present in one and missing from the other. Stop names must match NTU's exactly because they are the lookup key.

**Display labels are mapped, data is not renamed.** Values such as `Operator: 'NTU'` and `Category: 'CAMPUS'` stay as they are because logic matches on them; "NTU (ComfortDelGro)" and "Campus Rider" are applied only when rendering.

**Loops are circular, not linear.** A shuttle that keeps circling has no "after" or "before": any other stop is reachable. The planner therefore treats NTU routes as cycles. A trip from stop 12 to stop 3 rides 12, 13, 1, 2, 3, the sun calculation includes the closing leg (last stop back to the first), and elapsed time keeps counting across the wrap so the sun position is right for the later part of the ride.

**Say when a number is an estimate.** The crowd level for NTU is inferred from bus positions, so the code and these docs describe it as approximate, and it is never allowed to block the ETA.

**Do not guess times.** Where NTU gives no live ETA the app does not fall back to a made-up schedule estimate; it shows the timetable status instead.

### NUS-specific

**One request per stop, not per route.** NUS's ETA feed answers per stop and lists every route there, so the client asks once and slices the answer per route. A busy stop costs the same as a quiet one, and the stop popup and stop cards share the same cached response.

**Seconds in, minutes out, computed late.** The feed returns seconds from its own timestamp. Minutes are computed at render time from that base rather than stored, so a cached response never shows stale times, and a skewed device clock is ignored in favour of the arrival time of the response.

**Not every route is a loop.** R1 and R2 are one-way, so the code checks `_isLoop` rather than assuming circular routes: loop routes wrap around for crowd ranking, labels (`↻` vs `→`) and planning, while R1 and R2 drop buses that have already passed the stop.

**Shared code, per-campus data layer.** Everything the two campuses do the same way (live map, bus markers, stop popup, cards, timetable status, crowd ranking) lives once in `campus.js` and one set of `campus-*` styles, so a fix applies to both. Only how each upstream is queried and parsed stays in `ntu.js` / `nus.js`.

**Same rules as NTU for estimates and missing data.** Crowd on an ETA is labelled as approximate and never blocks the ETA, and a route with no live ETA shows its timetable status instead of a guessed time.

---

## Sun seat algorithm

Computed entirely client-side in two modes:

**Live arrivals (single bus):**
1. Take the GPS coordinates of the next arriving bus and the one behind it
2. Derive the bus's current bearing
3. Compute the sun's azimuth for Singapore at the current time using the USNO solar position algorithm
4. Calculate which side of the bus the sun is on; recommend the opposite side

**Plan Trip (full journey):**
1. Fetch road-snapped geometry for the journey segment via OSRM
2. For each road segment compute bearing, length, and the sun's perpendicular component relative to the bus
3. Score each segment: `perpendicular_component × sin(altitude) × distance_metres`
4. Sum scores per side; recommend the side with the lower cumulative score
5. Colour-code the route polyline from blue (full shade) through amber to red (direct sun)
6. Draw a live sun marker and bearing ray on the map

For night rides or sun altitude below 3°, the recommendation is suppressed.

---

## Project structure

```
shiokbus/
├── firebase.json               # Firebase Hosting config (serves public/)
├── dist/                       # Data synced from LTA (stops, routes, services, MRT stations)
├── public/                     # Deployed site
│   ├── index.html              # HTML structure and entry point
│   ├── styles.css              # All application styles
│   ├── assets/
│   │   ├── pbs-services.json       # PBS timetable data (hand-curated)
│   │   ├── sentosa-services.json   # Sentosa bus service data
│   │   ├── ntu-shuttle.json        # NTU routes, stops, timetable (generated)
│   │   ├── ntu-paths.json          # NTU road-following route polylines (generated)
│   │   ├── nus-shuttle.json        # NUS routes, stops, timetable (generated)
│   │   ├── nus-paths.json          # NUS road-following route polylines
│   │   ├── loop-midpoints.json     # Loop service via-stop overrides
│   │   ├── loop-desc-clear.json    # Services to suppress loop labels for
│   │   ├── dual-loops.json         # Dual-loop service metadata (291, 293, 358, 359, 812)
│   │   ├── leaflet.css
│   │   ├── mrt-map.png             # MRT network map image
│   │   └── shiokbus-logo-*.png
│   └── scripts/
│       ├── app.js              # Main application logic (~5000 lines)
│       ├── campus.js           # Shared NTU/NUS shuttle helpers (cards, live map, stop popup, crowd)
│       ├── ntu.js              # NTU shuttle upstream: ETAs and bus positions
│       ├── nus.js              # NUS shuttle upstream: ETAs and bus positions
│       ├── firebase.js         # Firebase auth + Firestore (ES module)
│       └── leaflet.js          # Leaflet (self-hosted)
├── worker/                     # Cloudflare Worker (proxy + cron R2 sync)  *
└── scripts/                    # Data tooling: LTA fetch, NTU and NUS asset builds   *
    ├── ntu/                    #   NTU build scripts and data (see its README)
    └── nus/                    #   NUS asset build script (build_nus_assets.py)
```

\* Listed in `.gitignore`, so these folders are not tracked in this repository.

---

## Local development

1. Serve from a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
2. Add `http://localhost:8000` to the `ALLOWED_ORIGINS` array in `worker.js`
3. No build step required

---

## Cloudflare Worker setup

### Environment variables

| Variable | Description |
| :--- | :--- |
| `LTA_KEY` | LTA DataMall API key |
| `ONEMAP_EMAIL` | OneMap account email (for token auth) |
| `ONEMAP_PASSWORD` | OneMap account password (for token auth) |
| `NTU_MODULE_VERSION` | NTU Omnibus `moduleVersion` (copied from DevTools; update when NTU redeploys) |
| `NTU_API_VERSION` | NTU Omnibus `apiVersion` for the ETA action (same) |

### Bindings

| Binding | Type | Description |
| :--- | :--- | :--- |
| `BUS_BUCKET` | R2 Bucket | Stores static bus data JSON files and sync state |
| `RATE_LIMIT_KV` | KV Namespace | Per-IP request counters for rate limiting |

### Cron triggers
Four triggers are required — see the R2 data sync table above.

---

## Firebase setup

1. Create a Firebase project and enable **Google Sign-In** under Authentication
2. Enable **Firestore** — favourites stored at `users/{uid}/favourites/{key}`, order at `users/{uid}/favOrder/{type}`
3. Add your deployment domain to Firebase Authentication → Authorised Domains

---

## Data sources

| Data | Source |
| :--- | :--- |
| Public bus stops, services, routes | [LTA DataMall](https://datamall.lta.gov.sg) |
| Real-time bus arrivals | LTA DataMall BusArrival v3 |
| Train service alerts | LTA DataMall TrainServiceAlerts |
| Journey planning | [OneMap Routing API](https://www.onemap.gov.sg) |
| Road-snapped geometry | [OSRM](http://project-osrm.org) |
| Rain forecast | [data.gov.sg](https://data.gov.sg) 2-hour forecast |
| PBS timetables | City Bus, MyBus, Diamond Coach, Ren Quan operator PDFs (hand-curated) |
| Sentosa bus schedules | [Sentosa](https://www.sentosa.com.sg/en/getting-around/) |
| NTU shuttle routes, stops, timetable, live ETAs and bus positions | NTU Omnibus (unofficial; not affiliated with or endorsed by NTU) |
| NUS shuttle routes, stops, timetable, live ETAs and bus positions | NUS's published timetable and unofficial shuttle ETA / bus-tracking feeds (not affiliated with or endorsed by NUS) |

---

## Acknowledgements

- [LTA DataMall](https://datamall.lta.gov.sg) for Singapore public bus data
- [Leaflet.js](https://leafletjs.com) for maps
- [OSRM](http://project-osrm.org) for road-snapped routing geometry
- [OneMap](https://www.onemap.gov.sg) for map tiles and journey planning
- [Barlow](https://fonts.google.com/specimen/Barlow) font by Jeremy Tribby
- [LTAIdentity](https://github.com/jglim/IdentityFont) font by JinGen Lim

*Built with ❤ for Singapore commuters who are tired of sitting in the sun.*
