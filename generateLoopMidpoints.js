const fs = require("fs");

let routes = require("./dist/bus-routes.json");
let stops = require("./dist/stops.json");
let services = require("./dist/bus-services.json");

// Handle LTA "value" wrapper if present
if (routes.value) routes = routes.value;
if (stops.value) stops = stops.value;
if (services.value) services = services.value;

// If routes is a flat array, convert to grouped object: { "119": { "1": [...], "2": [...] } }
if (Array.isArray(routes)) {
  const grouped = {};
  for (const r of routes) {
    if (!grouped[r.ServiceNo]) grouped[r.ServiceNo] = {};
    if (!grouped[r.ServiceNo][r.Direction]) grouped[r.ServiceNo][r.Direction] = [];
    grouped[r.ServiceNo][r.Direction].push(r);
  }
  routes = grouped;
}

// Create a lookup map for bus stops for performance
const stopMap = {};
for (const stop of stops) {
  stopMap[stop.BusStopCode] = stop;
}

const result = {};

// Use Object.values because 'services' is an object, not an array
for (const svc of Object.values(services)) {
  const { ServiceNo, OriginCode, DestinationCode, LoopDesc } = svc;

  // Only process loop services (where start and end are the same)
  if (OriginCode !== DestinationCode) continue;
  // Skip if no LoopDesc is provided
  if (!LoopDesc) continue;

  // Loop services typically operate on Direction 1
  const serviceRoutes = routes[ServiceNo] ? routes[ServiceNo]["1"] : null;
  if (!serviceRoutes) continue;

  let midpoint = null;
  let stnMatch = null;
  let firstMatch = null;

  for (const stop of serviceRoutes) {
    const stopInfo = stopMap[stop.BusStopCode];
    if (!stopInfo) continue;

    if (stopInfo.RoadName === LoopDesc) {
      const entry = {
        BusStopCode: stop.BusStopCode,
        RoadName: stopInfo.RoadName,
        Description: stopInfo.Description,
        StopSequence: stop.StopSequence
      };

      if (!firstMatch) firstMatch = entry;

      if (/int/i.test(stopInfo.Description)) {
        midpoint = entry; // keep overwriting — last Int on the road wins
      } else if (/stn|terminal/i.test(stopInfo.Description)) {
        if (!midpoint) stnMatch = entry; // only use Stn if no Int found yet
      }
    }
  }

  midpoint = midpoint || stnMatch || firstMatch;

  if (midpoint) {
    result[ServiceNo] = midpoint;
  }
}

// Hardcoded entries for services that can't be auto-detected, or with wrong prioritisation of Int/Stn/Ter
// Purpose is to provide better directions/contexts for loop services
const hardcoded = {
  "230": {
    "BusStopCode": "52389",
    "RoadName": "Lor 8 Toa Payoh",
    "Description": "Blk 227",
    "StopSequence": 14
  },
  "230M": {
    "BusStopCode": "52561",
    "RoadName": "Kim Keat Ave",
    "Description": "Blk 269A",
    "StopSequence": 7
  },
  "381": {
    "BusStopCode": "65561",
    "RoadName": "Punggol East",
    "Description": "Blk 659A",
    "StopSequence": 14
  },
  "386": {
    "BusStopCode": "65269",
    "RoadName": "Punggol Ctrl",
    "Description": "Blk 162B",
    "StopSequence": 12
  },
  "805": {
    "BusStopCode": "59751",
    "RoadName": "Yishun Ave 1",
    "Description": "Opp The Shaughnessy",
    "StopSequence": 9
  },
  "983": {
    "BusStopCode": "44031",
    "RoadName": "Upp Bt Timah Rd",
    "Description": "Aft Bt Panjang Stn",
    "StopSequence": 16
  }
};

Object.assign(result, hardcoded);

// Output the results to a file
fs.writeFileSync("./public/assets/loop-midpoints.json", JSON.stringify(result, null, 2));
console.log("Midpoints generated successfully in ./public/assets/loop-midpoints.json");