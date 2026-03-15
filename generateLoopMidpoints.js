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

  // Find all stops on the loop road
  const roadStops = serviceRoutes.filter(stop => {
    const stopInfo = stopMap[stop.BusStopCode];
    return stopInfo && stopInfo.RoadName === LoopDesc;
  });

  if (roadStops.length === 0) continue;

  // Pick the middle stop on the road
  const midIndex = Math.floor(roadStops.length / 2);
  const midStop = roadStops[midIndex];
  const midStopInfo = stopMap[midStop.BusStopCode];

  // Check middle ±1 stops for a more meaningful name, in priority order
  const window = roadStops.slice(Math.max(0, midIndex - 1), midIndex + 2);
  const intMatch = window.find(s => /int/i.test(stopMap[s.BusStopCode]?.Description));
  const terMatch = window.find(s => /ter/i.test(stopMap[s.BusStopCode]?.Description));
  const stnMatch = window.find(s => /stn/i.test(stopMap[s.BusStopCode]?.Description));
  const ctrMatch = window.find(s => /ctr/i.test(stopMap[s.BusStopCode]?.Description));
  const zooMatch = window.find(s => /zoo/i.test(stopMap[s.BusStopCode]?.Description));
  const best = intMatch || terMatch || stnMatch || ctrMatch || zooMatch;
  const chosen = best ? stopMap[best.BusStopCode] : midStopInfo;
  const chosenStop = best || midStop;

  const midpoint = {
    BusStopCode: chosenStop.BusStopCode,
    RoadName: chosen.RoadName,
    Description: chosen.Description,
    StopSequence: chosenStop.StopSequence
  };

  result[ServiceNo] = midpoint;
}

// Hardcoded entries for services that can't be auto-detected, or with wrong prioritisation of Int/Stn/Ter
// Purpose is to provide better directions/contexts for loop services
const hardcoded = {
  "92": {
    "BusStopCode": "18281",
    "RoadName": "Science Pk Dr",
    "Description": "Opp Normanton Pk/R'ford",
    "StopSequence": 12
  },
  "191": {
    "BusStopCode": "18201",
    "RoadName": "Mediacorp Campus",
    "Description": "Blk 227",
    "StopSequence": 11
  },
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
  "400": {
    "BusStopCode": "03421",
    "RoadName": "Marina Coastal Dr",
    "Description": "Marina Bay Cruise Ctr",
    "StopSequence": 14
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

const entries = Object.entries(result).sort(([a], [b]) => {
  const numA = parseInt(a), numB = parseInt(b);
  if (numA !== numB) return numA - numB;
  const aSuffix = a.replace(/^\d+/, '').toLowerCase();
  const bSuffix = b.replace(/^\d+/, '').toLowerCase();
  if (aSuffix === '' && bSuffix !== '') return -1;
  if (aSuffix !== '' && bSuffix === '') return 1;
  return aSuffix.localeCompare(bSuffix);
});

const jsonLines = ['{\n'];
entries.forEach(([key, value], i) => {
  const comma = i < entries.length - 1 ? ',' : '';
  jsonLines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')}${comma}\n`);
});
jsonLines.push('}');

fs.writeFileSync("./public/assets/loop-midpoints.json", jsonLines.join(''));
console.log("Midpoints generated successfully in ./public/assets/loop-midpoints.json");

// Generate a list of services that have LoopDesc but are not true loops (mostly errors with short working trips in LTA datamall)
const LOOP_DESC_KEEP = new Set(['18M', '92B', '184', '195', '230', '240M', '268', '307A', '912A', '912B', '913M']); // services with actual loops
const loopDescClear = [];
for (const svc of Object.values(services)) {
  const { ServiceNo, OriginCode, DestinationCode, LoopDesc } = svc;
  if (OriginCode !== DestinationCode && LoopDesc && !LOOP_DESC_KEEP.has(ServiceNo)) {
    loopDescClear.push(ServiceNo);
  }
}

fs.writeFileSync("./public/assets/loop-desc-clear.json", JSON.stringify(loopDescClear, null, 2));
console.log("Loop desc clear list generated in ./public/assets/loop-desc-clear.json");

