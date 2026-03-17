# 🚌 ShiokBus

> **Ride comfortable, every time.**

A mobile-first Singapore bus app with real-time arrivals, full route exploration, private bus services, and a unique **sun seat recommendation** — so you always know which side of the bus to sit on to stay in the shade.

**Live at → [shiokbus.web.app](https://shiokbus.web.app)**

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

Scheduled services show synthesised arrival times computed from timetable data. Frequency-based services (Sentosa buses) compute upcoming arrivals from headway and per-stop travel offsets. All private services are indexed at startup for O(1) stop lookups — expanding a shared stop like Beach Station correctly shows *all* services calling there (e.g. Bus A, Bus B, and Bus 123 together).

### ☀ Sun seat recommendation
The USP. Two modes:

**Live arrivals view** — for the next arriving bus, calculates which side of the bus faces the sun and recommends left or right. Takes into account bus type (upper deck of a double-decker gets a separate recommendation).

**Plan Trip (route sun analysis)** — select a boarding and alighting stop on the route map. The app scores every road segment along your journey by `perpendicular_sun_component × altitude_factor × segment_distance`, then recommends the consistently shadier side for the full trip. The route map is colour-coded from shade (blue) through mild to strong sun (red/orange). A live sun marker and direction ray are drawn on the map.

For night rides or when the sun is below 3° altitude the app returns "any seat is fine."

### Route explorer
- Full stop-by-stop route view with expandable per-stop arrivals, first/last bus timings, and service frequency formatted by time-of-day
- Direction tabs for services with two directions; loop services show their midpoint via label
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
- Each bus leg in the itinerary shows a ☀ sun seat pill — which side to sit on for that specific leg's geometry and current sun position
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
| Frontend | Vanilla HTML / CSS / JavaScript (single file) |
| Fonts | Barlow Condensed + Barlow (Google Fonts) |
| Maps | Leaflet.js + OneMap tiles + OSRM road geometry |
| Backend Proxy | Cloudflare Workers |
| Static Data Storage | Cloudflare R2 |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Firestore (per-user favourites & order) |
| Hosting | Cloudflare R2 |
| Public bus data | LTA DataMall API |
| Journey planning | OneMap Routing API |
| Rain forecast | data.gov.sg 2-hour forecast API |
| Road geometry | OSRM public routing API |

---

## Architecture

```
Browser (index.html served from Cloudflare R2)
    │
    ├── Static data (stops, routes, services, MRT stations)
    │       └──► Cloudflare Worker ──► Cloudflare R2
    │               (daily cron syncs full LTA dataset)
    │
    ├── Real-time arrivals
    │       └──► Cloudflare Worker ──► LTA DataMall BusArrival v3
    │
    ├── Journey planning
    │       └──► Cloudflare Worker ──► OneMap Routing API
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
    └── Auth + Favourites ──────────────► Firebase Auth + Firestore
```

### Cloudflare Worker security
- **CORS origin check** — only `shiokbus.web.app`, `shiokbus.firebaseapp.com`, and localhost are allowed
- **LTA API key** — stored only in Worker environment variables, never exposed to the browser
- **Non-blocking rate tracking** — per-IP request counting via KV (fire-and-forget, no latency impact)

### R2 data sync (cron Worker)
Runs daily at midnight and fetches the full LTA dataset, writing four files to R2:
- `stops.json` — all bus stop coordinates, names, road names
- `bus-services.json` — operator, category, frequency data per service
- `bus-routes.json` — all route stop sequences
- `mrt-stations.json` — MRT station metadata for pill rendering

### Private service architecture
Private services (PBS, Sentosa) are loaded from local JSON assets at startup and injected into the same `ALL_SERVICES` map as LTA data. A `PRIVATE_STOP_INDEX` is built at inject time mapping each bus stop code to all private service stop entries that call there — enabling O(1) lookup when expanding a stop in the route view, regardless of how many services share that stop.

Two arrival synthesis modes:
- **Scheduled** (`DepartureTimes` present) — per-stop `Timings` objects map each departure to its arrival time at that stop; upcoming arrivals within a ±2–45 minute window are shown
- **Frequency-based** (`DepartureTimes` empty) — headway and `StopOffsetMins` per stop compute the next three arrivals from the current time and operating hours

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
├── index.html                  # Entire frontend (HTML + CSS + JS)
├── worker.js                   # Cloudflare Worker (proxy + cron R2 sync)
└── assets/
    ├── pbs-services.json       # PBS timetable data (hand-curated)
    ├── sentosa-services.json   # Sentosa bus service data
    ├── loop-midpoints.json     # Loop service via-stop overrides
    ├── loop-desc-clear.json    # Services to suppress loop labels for
    ├── leaflet.js              # Leaflet (self-hosted)
    ├── leaflet.css
    ├── mrt-map.png             # MRT network map image
    └── shiokbus-logo-dark.png
```

---

## Local development

1. Serve from a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
2. The Worker's `ALLOWED_ORIGINS` already includes `http://localhost:8000`
3. No build step required

---

## Cloudflare Worker setup

### Environment variables

| Variable | Description |
| :--- | :--- |
| `LTA_KEY` | LTA DataMall API key |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_APP_ID` | Firebase Web App ID |

### Bindings

| Binding | Type | Description |
| :--- | :--- |:--- |
| `BUS_BUCKET` | R2 Bucket | Stores static bus data JSON files |
| `RATE_LIMITER` | KV Namespace | Non-blocking per-IP rate tracking |

### Cron trigger
Set `0 0 * * *` (daily midnight SGT) to keep R2 data fresh.

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
| Sentosa bus schedules | [Sentosa](https://www.sentosa.com.sg/en/getting-here-around/getting-around/) |

---

## Acknowledgements

- [LTA DataMall](https://datamall.lta.gov.sg) for Singapore public bus data
- [Leaflet.js](https://leafletjs.com) for maps
- [OSRM](http://project-osrm.org) for road-snapped routing geometry
- [OneMap](https://www.onemap.gov.sg) for map tiles and journey planning
- [Barlow](https://fonts.google.com/specimen/Barlow) font by Jeremy Tribby

*Built with ❤ for Singapore commuters who are tired of sitting in the sun.*
