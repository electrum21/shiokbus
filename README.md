# 🚌 ShiokBus

> **Ride comfortable, every time.**

A mobile-first Singapore bus app with real-time arrivals, full route exploration, private bus services, and a unique **sun seat recommendation** — so you always know which side of the bus to sit on to stay in the shade.

**Live at → [shiokbus.web.app](https://shiokbus.web.app)**

---

## Video Demo



https://github.com/user-attachments/assets/954eecaa-1309-4fc0-8b3e-4fb7d1a1c850



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
| **NTU Campus Rider** | Live (ETAs + bus positions) | Blue, Brown, Green, Grey, Red

Scheduled services show synthesised arrival times computed from timetable data. Frequency-based services (Sentosa buses) compute upcoming arrivals from headway and per-stop travel offsets, including buses already mid-route. 

### NTU Campus Rider shuttles
The five NTU campus loops (Blue, Brown, Green, Grey, Red) sit alongside public buses in search, stop view, route view and favourites.

- **Live ETAs** — next two buses per route at every stop, on stop cards and inside expanded stops in the route view
- **Crowd levels** — each ETA carries the same seats / standing / limited icon and colours as public buses
- **Live map** — a **Live** button on each NTU route opens a map with the loop drawn along the road, one marker per active bus (colour ring = crowd level, arrow = direction of travel), refreshed every 15 s while the map is open
- **Timetable awareness** — first/last bus from NTU's term timetable; when there is no ETA the card says why ("First bus 07:30", "Service ended · last bus 23:00", "No service today") instead of showing a blank. Green runs on weekdays only and Brown covers weekends and public holidays
- **Loop-aware planning** — NTU routes show as `first ↻ last`, and in *Where to sit?* you can board anywhere and alight at any other stop on the loop, including stops before the board stop (the bus simply keeps circling)
- **NTU styling** — pills use the route colour with an NTU-orange ring; operator shown as *NTU (ComfortDelGro)*, category as *Campus Rider*

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
| NTU shuttle data | NTU Omnibus (unofficial, undocumented — see [caveats](#caveats)) |
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

## NTU integration

NTU's shuttles are not in LTA DataMall, so they are integrated as their own source and made to look like any other service in the app.

### How it fits together

```
 build time (your machine)                       run time
 ───────────────────────────                     ──────────────────────────────────────────
 NTU pickup-point responses ─┐                   index.html loads scripts/ntu.js, then app.js
 ntu-stop-coords.csv ────────┼─► build_ntu_assets ─► assets/ntu-shuttle.json ─┐
 (route + stop lists)        │        │                                       ├─► merged into
                             │        └─► NTU_PAIRS allowlist in the Worker   │   PRIVATE_SERVICES
 road geometry ──────────────┴─► build_ntu_paths ──► assets/ntu-paths.json ────┘   → ALL_SERVICES

 Browser ─► Worker ─► NTU Omnibus
            ├─ ?endpoint=NtuShuttle  (ETAs: cached 30 s per stop+route, at the edge)
            └─ ?endpoint=NtuBuses    (bus positions + crowd)
```

### Static data
- **`assets/ntu-shuttle.json`** — one entry per route in the same shape as the other private services (`ServiceNo` e.g. `NTU Blue`, `Operator: NTU`, `Directions['1'].Stops` with coordinates), plus `NtuRoute`, `Color`, and `Schedule` (first/last bus for Mon–Fri, Sat, Sun)
- **`assets/ntu-paths.json`** — one encoded road polyline per route, used to draw the loop on the live map. Optional: without it the map draws straight lines between stops
- **Stop codes** — a stop NTU shares with public buses (e.g. Pioneer Stn Exit B, Hall 4) keeps its real LTA code, so it appears in the normal stop view with NTU cards appended. NTU-only stops get a synthetic `NTU-…` code and no LTA data is requested for them
- **ETA lookups use the NTU stop name, never the code** — that is what NTU's service expects

### Client code (`scripts/ntu.js`)
Everything NTU-specific that is not a styling flag lives here. It is loaded before `app.js` and only defines functions; `app.js` calls into it from a handful of places:

| Function | Used for |
| :--- | :--- |
| `loadNtuServices()` | Fetch `ntu-shuttle.json` (returns `{}` on failure so the rest of the app still works) |
| `ntuResetIndex()` / `ntuIndexStop()` | Build the stop → NTU services index while private services are injected |
| `hasNtu(code)` / `isNtuCode(code)` | "NTU serves this stop" / "NTU-only stop, nothing to ask LTA" |
| `renderNtuStopCards()` | Stop view: one card per NTU route, appended after the public buses |
| `ntuRowsHtml()` | Route view: NTU arrival rows inside an expanded stop |
| `ntuLoopLabel()` | `first ↻ last` label |
| `ntuRouteTimes()` / `ntuStatus()` | First/last bus fields for the route view, and the "why no ETA" message |
| `ntuLiveOpen()` | Live bus map |

`app.js` handles the rest by flag: `_isNtu` services skip LTA arrival logic, `_isScheduled` is false for NTU (its times are live, so the "estimated from schedule" warning is not shown), and `planCircular` switches the Board/Alight planner into loop mode.

### Worker side (`NtuShuttle`)
1. The request must be an exact `(stop, route)` pair from the `NTU_PAIRS` allowlist; anything else is rejected with 400 before NTU is contacted
2. The Worker checks a 30 s per-pair cache (Cloudflare edge cache); on a miss it calls NTU's ETA service
3. NTU's service rejects callers without a session ("Invalid Login"), so the Worker does the same handshake a browser does: one bare request to obtain NTU's anonymous cookies and CSRF token, then the real call with them. The session is kept per isolate for 10 minutes and refreshed once if NTU rejects it
4. The request carries an honest `User-Agent` identifying ShiokBus, and the caller's own traffic is bounded by the cache (about 2 upstream calls per minute per stop at most)
5. Responses are normalised to `{ ETA, NextETA, fetchedAt }` with minutes as numbers (`"Arr"` becomes `0`, idle buses become `null`)
6. Failures are cached briefly (20 s) so a broken upstream is not hammered. If NTU reports its app version has changed, the Worker returns 503 until the version variables are updated

### Client-side request handling
- ETAs are cached 20 s per stop+route, and concurrent requests for the same pair share one in-flight promise
- Failed lookups are never cached on the client, so the next tap retries
- Bus positions use a 10 s client cache, and the live map polls every 15 s only while it is open and the tab is visible. Markers are matched to the previous poll by nearest distance so they glide rather than jump, and are greyed out as "stale" after 90 s without fresh data
- A route with no arrivals (e.g. Green at weekends) hides its row in the route view, but an error always shows, so failures are never silent

### Crowd levels
Crowd uses the same three levels as public buses (`SEA`, `SDA`, `LSD`) and the same bus icon and colours. NTU's ETA call does not say which bus an ETA belongs to, so the crowd shown for a stop is **estimated**: each active bus is snapped to its nearest stop on the loop, ranked by how many stops it is from the target, and the first two take the two ETA slots. This is approximate where a loop doubles back. Crowd data is optional: if the bus feed is unavailable, ETAs still render with a neutral icon.

### Data pipeline and maintenance
Route and stop data is generated, not hand-edited, from NTU's own pickup-point responses so that the app data and the Worker allowlist cannot drift apart. See [`scripts/ntu/README.md`](scripts/ntu/README.md) for the commands. The short version:

1. Save fresh pickup responses for each route
2. Check the draft against them and fill coordinates
3. Run the build, which rewrites `ntu-shuttle.json` and the `NTU_PAIRS` block in the Worker
4. Review the diff and `wrangler deploy`

When live ETAs stop working with a 503 "app version changed", NTU has published a new build. Copy `moduleVersion` and `apiVersion` from the `ActionGetETAAndNextETA_FMS` request (DevTools → Network → Payload) into the `NTU_MODULE_VERSION` and `NTU_API_VERSION` Worker variables.

### Caveats
- The NTU endpoint is **undocumented and unofficial**. It can change or disappear without notice, and ShiokBus is not affiliated with or endorsed by NTU or ComfortDelGro
- The traffic is deliberately small and cached. Please do not shorten the cache times or remove the allowlist
- The Grey route has no term timetable data, so it shows no first/last bus times
- Crowd levels are estimates (see above)

---

## Design considerations

### General

**No build step.** Vanilla HTML, CSS and JavaScript served as static files keeps the project easy to run and change: a local HTTP server is all that is needed. The cost is large hand-maintained files, which is why newer, self-contained features (NTU) go in their own script.

**The Worker is a thin, strict proxy.** API keys stay server-side. The Worker never takes a hostname or URL from the client; service numbers, stop codes, NTU stop/route pairs and static file names are validated or allowlisted before anything is fetched.

**Cache at every layer.** Slow-changing data comes from R2 (synced nightly) and is cached in the Worker for hours. Live data is cached for seconds at the edge and again in the browser. This keeps the app fast and the upstream APIs lightly loaded.

**One service model.** Private and NTU services are merged into the same `ALL_SERVICES` map as LTA services, so search, route view, favourites and the sun planner work on them without special screens. Source-specific behaviour hangs off flags (`_isPrivate`, `_isScheduled`, `_isNtu`) rather than separate code paths.

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
│   │   ├── loop-midpoints.json     # Loop service via-stop overrides
│   │   ├── loop-desc-clear.json    # Services to suppress loop labels for
│   │   ├── dual-loops.json         # Dual-loop service metadata (291, 293, 358, 359, 812)
│   │   ├── leaflet.css
│   │   ├── mrt-map.png             # MRT network map image
│   │   └── shiokbus-logo-*.png
│   └── scripts/
│       ├── app.js              # Main application logic (~5000 lines)
│       ├── ntu.js              # NTU shuttle integration (ETAs, crowd, live map)
│       ├── firebase.js         # Firebase auth + Firestore (ES module)
│       └── leaflet.js          # Leaflet (self-hosted)
├── worker/                     # Cloudflare Worker (proxy + cron R2 sync)  *
└── scripts/                    # Data tooling: LTA fetch, NTU asset build   *
    └── ntu/                    #   NTU build scripts and data (see its README)
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

---

## Acknowledgements

- [LTA DataMall](https://datamall.lta.gov.sg) for Singapore public bus data
- [Leaflet.js](https://leafletjs.com) for maps
- [OSRM](http://project-osrm.org) for road-snapped routing geometry
- [OneMap](https://www.onemap.gov.sg) for map tiles and journey planning
- [Barlow](https://fonts.google.com/specimen/Barlow) font by Jeremy Tribby
- [LTAIdentity](https://github.com/jglim/IdentityFont) font by JinGen Lim

*Built with ❤ for Singapore commuters who are tired of sitting in the sun.*
