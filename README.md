# 🚌 Shiok Bus

> **Ride comfortable, every time.**

A mobile-first Singapore bus app with real-time arrivals, full route exploration, and a unique **sun seat recommendation** — so you always know which side of the bus to sit on to stay in the shade.

**Live at → [shiokbus.web.app](https://shiokbus.web.app)**

## Features

*   **Real-time bus arrivals** — Live arrival times with passenger load indicators (seats available / standing / limited)
*   **Bus service route explorer** — Full stop-by-stop route view with expandable per-stop arrivals, first/last bus timings, and service frequency by time-of-day
*   **☀ Sun seat recommendation** — The USP. Tells you which side of the bus to sit on based on the route geometry and the sun's current position
*   **Near Me** — GPS-based discovery of the 10 nearest bus stops with walking distance and time
*   **Plan Trip** — Select a boarding and alighting stop on the route map for a journey-specific sun analysis, and save your frequently used routes for quick access.
*   **Interactive route map** — Road-snapped route geometry colour-coded by sun exposure (shade → mild → moderate → strong)
*   **Favourites** — Star stops, services, and planned trips; synced to your account via Firestore, allowing you to quickly revisit your common routes without re-entering details.
*   **Light & dark themes** — Persisted to localStorage; map tiles switch accordingly
*   **Operator colour coding** — SBS Transit (purple), SMRT (red), Tower Transit (green), Go-Ahead (gold)

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Vanilla HTML / CSS / JavaScript (single file) |
| Fonts | Barlow Condensed + Barlow (Google Fonts) |
| Maps | Leaflet.js + OneMap tiles + OSRM road geometry |
| Backend Proxy | Cloudflare Workers |
| Static Data Storage | Cloudflare R2 (for static JSON data) |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Firestore (per-user favourites) |
| App Security | Firebase App Check + reCAPTCHA v3 |
| Hosting | Cloudflare R2 (for `index.html` and static assets) |
| Data Source | LTA DataMall API |

## Architecture

    Browser (index.html served from Cloudflare R2)
        │
        ├── Static data (stops, routes, services, MRT stations) ──► Cloudflare Worker ──► Cloudflare R2 (daily cron sync from LTA)
        │
        ├── Real-time arrivals (LTA DataMall BusArrival v3 API) ──► Cloudflare Worker ──► LTA DataMall API
        │
        ├── Journey Planning (OneMap API) ───────────────────────► Cloudflare Worker ──► OneMap API
        │
        ├── Auth + Favourites ───────────────────────────────────► Firebase Auth + Firestore
        │
        └── Road geometry (route map) ───────────────────────────► OSRM public routing API (direct from browser)

### Cloudflare Worker Security

*   **CORS origin check** — only `shiokbus.web.app` and `shiokbus.firebaseapp.com` (and localhost for dev) are allowed
*   **App Check token required** — every request to the Worker must carry a valid Firebase reCAPTCHA v3 token
*   **LTA API key** — stored only in Worker environment variables, never exposed to the browser
*   **Non-blocking rate tracking** — per-IP request counting via KV (fire-and-forget, no latency impact)

### R2 Data Sync (Cron Worker)

Runs every 24 hours and fetches the full LTA dataset, storing three files in R2:

*   `bus-routes.json` — all route stop sequences
*   `bus-services.json` — operator, category, frequency data per service
*   `stops.json` — all bus stop coordinates, names, and road names
*   `mrt-stations.json` — MRT station data for pill rendering

## Sun Seat Algorithm

The sun seat recommendation is computed entirely client-side:

1.  **Bearing** — calculate the compass bearing between each consecutive stop pair along the route
2.  **Solar position** — compute the sun's azimuth and altitude for the current time at Singapore's coordinates using the USNO solar position algorithm
3.  **Relative angle** — determine the angle between the sun's azimuth and the bus's bearing to identify which side of the bus the sun shines through
4.  **Weighted scoring** — each segment is scored by `perpendicular_component × altitude_factor × distance`, giving more weight to longer segments with high, direct sun
5.  **Recommendation** — the side with the lower cumulative sun score is recommended as the shaded side

For night rides or when the sun is below 3° altitude, the app correctly returns "any seat is fine."

## Project Structure

    shiokbus/
    ├── index.html          # Entire frontend (HTML + CSS + JS, single file)
    └── worker.js           # Cloudflare Worker (proxy + cron sync)
    

## Local Development

1.  Serve `index.html` from a local server (e.g. `python3 -m http.server 8000`)
2.  The Worker's `ALLOWED_ORIGINS` already includes `http://localhost:8000` and `http://127.0.0.1:8000`
3.  No build step required — it's plain HTML/JS

## Cloudflare Worker Setup

### Environment Variables

Set these in your Worker's Settings → Variables:

| Variable | Description |
| :--- | :--- |
| `LTA_KEY` | Your LTA DataMall API key |
| `FIREBASE_PROJECT_ID` | Firebase project ID (e.g. `shiokbus`) |
| `FIREBASE_APP_ID` | Firebase Web App ID |

### Bindings

| Binding | Type | Description |
| :--- | :--- | :--- |
| `BUS_BUCKET` | R2 Bucket | Stores static bus data JSON files |
| `RATE_LIMITER` | KV Namespace | Used for non-blocking rate tracking |

### Cron Trigger

Set a cron trigger of `0 0 * * *` (daily at midnight) to keep the R2 data fresh.

## Firebase Setup

1.  Create a Firebase project and enable **Google Sign-In** under Authentication
2.  Enable **Firestore** — favourites are stored at `users/{uid}/favourites/{key}`
3.  Enable **App Check** with reCAPTCHA v3 — register your web app and add the site key to `index.html`
4.  Add your deployment domain to Firebase Authentication → Authorised Domains

## Data Source

Bus data is sourced from the **[LTA DataMall API](https://www.mytransport.sg/content/mytransport/home/dataMall.html)**. You will need a free API key from LTA to run your own instance.

## Acknowledgements

*   [LTA DataMall](https://www.mytransport.sg/content/mytransport/home/dataMall.html) for Singapore bus data
*   [Leaflet.js](https://leafletjs.com/) for maps
*   [OSRM](http://project-osrm.org/) for road-snapped routing geometry
*   [OneMap](https://www.onemap.gov.sg/) for map tiles and journey planning API
*   [Barlow](https://fonts.google.com/specimen/Barlow) font by Jeremy Tribby

_Built with ❤ for Singapore commuters who are tired of sitting in the sun._
