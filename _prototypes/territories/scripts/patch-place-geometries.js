#!/usr/bin/env node
/**
 * Adds missing incorporated-place boundaries to data/real/geometry.geojson by
 * fetching them from Census TIGERweb. Used when manually curated brand files
 * reference place geoKeys that are not yet in the generated geometry bundle.
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const TERRITORIES_DIR = path.resolve(__dirname, "..");
const REAL_DIR = path.join(TERRITORIES_DIR, "data", "real");
const GEOMETRY_PATH = path.join(REAL_DIR, "geometry.geojson");
const TIGER_PLACE_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query";
const SIMPLIFY_TOLERANCE = 0.002;
const COORDINATE_PRECISION = 4;

const STATE_FIPS_TO_CODE = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP", "72": "PR", "78": "VI"
};

const STATE_CODE_TO_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

const EXCLUDED_ISLAND_BOUNDS = [
  { west: -123.20, east: -122.90, south: 37.62, north: 37.85 }
];

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points.slice();

  const squaredTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maximumDistance = squaredTolerance;
    let splitIndex = -1;

    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredSegmentDistance(points[index], points[first], points[last]);
      if (distance > maximumDistance) {
        maximumDistance = distance;
        splitIndex = index;
      }
    }

    if (splitIndex >= 0) {
      keep[splitIndex] = 1;
      stack.push([first, splitIndex], [splitIndex, last]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function roundCoordinate(value) {
  const factor = 10 ** COORDINATE_PRECISION;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeRing(points) {
  const rounded = [];
  for (const [longitude, latitude] of points) {
    const point = [roundCoordinate(longitude), roundCoordinate(latitude)];
    const previous = rounded[rounded.length - 1];
    if (!previous || point[0] !== previous[0] || point[1] !== previous[1]) {
      rounded.push(point);
    }
  }

  if (rounded.length && (
    rounded[0][0] !== rounded[rounded.length - 1][0]
    || rounded[0][1] !== rounded[rounded.length - 1][1]
  )) {
    rounded.push([...rounded[0]]);
  }
  return rounded;
}

function simplifyRing(points) {
  const simplified = normalizeRing(simplifyLine(points, SIMPLIFY_TOLERANCE));
  if (simplified.length >= 4) return simplified;
  const fallback = normalizeRing(points);
  return fallback.length >= 4 ? fallback : null;
}

function polygonBoundsAreInsideBox(rings, box) {
  const outer = rings?.[0];
  if (!outer?.length) return false;

  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  for (const [lng, lat] of outer) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }

  return west >= box.west && east <= box.east && south >= box.south && north <= box.north;
}

function dropExcludedIslandPolygons(polygons) {
  if (!Array.isArray(polygons) || polygons.length < 2) return polygons;

  const kept = polygons.filter((rings) => (
    !EXCLUDED_ISLAND_BOUNDS.some((box) => polygonBoundsAreInsideBox(rings, box))
  ));
  return kept.length ? kept : polygons;
}

function simplifyGeometry(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const simplifiedPolygons = dropExcludedIslandPolygons(polygons.map((rings) => {
    const simplifiedRings = rings.map(simplifyRing).filter(Boolean);
    return simplifiedRings.length ? simplifiedRings : null;
  }).filter(Boolean));

  if (simplifiedPolygons.length === 1) {
    return { type: "Polygon", coordinates: simplifiedPolygons[0] || [] };
  }
  return { type: "MultiPolygon", coordinates: simplifiedPolygons };
}

function deriveStateCode(geoId) {
  return STATE_FIPS_TO_CODE[String(geoId).padStart(7, "0").slice(0, 2)] || "";
}

function formatPlaceName(rawName, stateCode) {
  const cleaned = String(rawName || "")
    .replace(/\s+(city|town|village|CDP|borough)$/i, "")
    .trim();
  const stateName = STATE_CODE_TO_NAME[stateCode] || stateCode;
  return `${cleaned}, ${stateName}`;
}

function collectPlaceGeoKeysFromBrandFiles() {
  const geoKeys = new Set();
  const entries = fs.readdirSync(REAL_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "cbsa-index.json") {
      continue;
    }

    const brand = JSON.parse(fs.readFileSync(path.join(REAL_DIR, entry.name), "utf8"));
    for (const territory of brand.territories || []) {
      if (territory.geoType === "place" && territory.geoKey?.startsWith("place:")) {
        geoKeys.add(territory.geoKey);
      }
    }
  }

  return geoKeys;
}

async function fetchPlaceFeatures(geoIds) {
  if (!geoIds.length) return [];

  const where = `GEOID IN (${geoIds.map((id) => `'${id}'`).join(",")})`;
  const url = new URL(TIGER_PLACE_URL);
  url.searchParams.set("where", where);
  url.searchParams.set("outFields", "NAME,GEOID,STATE");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("returnGeometry", "true");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TIGERweb request failed (${response.status})`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || "TIGERweb query failed");
  }

  return payload.features || [];
}

function toGeometryFeature(tigerFeature) {
  const geoId = String(tigerFeature.properties?.GEOID || "");
  const geoKey = `place:${geoId}`;
  const stateCode = deriveStateCode(geoId);
  const name = formatPlaceName(tigerFeature.properties?.NAME, stateCode);
  const geometry = simplifyGeometry(tigerFeature.geometry);

  return {
    type: "Feature",
    id: geoKey,
    properties: {
      geoKey,
      geoType: "place",
      geoId,
      state: stateCode,
      name
    },
    geometry
  };
}

async function main() {
  const requestedGeoKeys = [...collectPlaceGeoKeysFromBrandFiles()];
  const geometryCollection = JSON.parse(await fsp.readFile(GEOMETRY_PATH, "utf8"));
  const existingKeys = new Set(geometryCollection.features.map((feature) => feature.properties.geoKey));
  const missingGeoKeys = requestedGeoKeys.filter((geoKey) => !existingKeys.has(geoKey));

  if (!missingGeoKeys.length) {
    console.log(JSON.stringify({ added: 0, message: "All place geometries already present." }, null, 2));
    return;
  }

  const geoIds = missingGeoKeys.map((geoKey) => geoKey.replace(/^place:/, ""));
  const fetchedFeatures = [];
  const batchSize = 20;

  for (let index = 0; index < geoIds.length; index += batchSize) {
    const batch = geoIds.slice(index, index + batchSize);
    const features = await fetchPlaceFeatures(batch);
    fetchedFeatures.push(...features);
  }

  const fetchedByGeoId = new Map(
    fetchedFeatures.map((feature) => [String(feature.properties?.GEOID), feature])
  );

  const added = [];
  const stillMissing = [];

  for (const geoKey of missingGeoKeys) {
    const geoId = geoKey.replace(/^place:/, "");
    const tigerFeature = fetchedByGeoId.get(geoId);
    if (!tigerFeature?.geometry) {
      stillMissing.push(geoKey);
      continue;
    }

    geometryCollection.features.push(toGeometryFeature(tigerFeature));
    added.push(geoKey);
  }

  geometryCollection.features.sort((left, right) => (
    left.properties.geoKey.localeCompare(right.properties.geoKey)
  ));

  await fsp.writeFile(GEOMETRY_PATH, JSON.stringify(geometryCollection));

  console.log(JSON.stringify({
    requested: missingGeoKeys.length,
    added: added.length,
    addedGeoKeys: added,
    stillMissing
  }, null, 2));

  if (stillMissing.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
