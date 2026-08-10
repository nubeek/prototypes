#!/usr/bin/env node
/**
 * Generates county-level brand data for the Large dataset.
 * Preserves the US franchise territory narrative:
 *   - More concentration in the East than West
 *   - South > North (TX, FL, GA, Carolinas boosted)
 *   - Western exceptions: CA, AZ, CO
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DEFAULT_DIR = path.join(DATA_DIR, "default");
const LARGE_DIR = path.join(DATA_DIR, "large");
const COUNTIES_RAW_SOURCE = path.join(DATA_DIR, "us-counties.geojson");
const COUNTIES_NORMALIZED_TARGET = path.join(DATA_DIR, "us-counties.geojson");
const COUNTY_MULTIPLIER = 15;

const STATE_FIPS_TO_CODE = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY"
};

const SOUTH_GROWTH_STATES = new Set(["TX", "FL", "GA", "NC", "SC"]);
const WESTERN_EXCEPTIONS = new Set(["CA", "AZ", "CO"]);
const LOW_DENSITY_WEST = new Set(["MT", "WY", "ND", "SD", "ID", "NV", "UT", "NE", "KS", "NM"]);
const EXCLUDED_STATES = new Set(["AK", "HI"]);

const DEFAULT_BRAND_FILES = [
  "planet-fitness.json",
  "subway.json",
  "chick-fil-a.json",
  "dunkin.json",
  "mcdonalds.json",
  "burger-king.json",
  "popeyes.json",
  "7eleven.json",
  "remax.json",
  "dominos.json",
  "ups.json",
  "wendys.json"
];

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getGeometryCentroid(geometry) {
  const ring = geometry.type === "Polygon"
    ? geometry.coordinates[0]
    : geometry.coordinates[0]?.[0];
  if (!ring?.length) return null;

  let lonSum = 0;
  let latSum = 0;
  const count = ring.length - 1;
  for (let index = 0; index < count; index += 1) {
    lonSum += ring[index][0];
    latSum += ring[index][1];
  }

  return [lonSum / count, latSum / count];
}

function getCountyWeight(county, stateCode, centroid) {
  const [lon, lat] = centroid;
  let weight = 1;

  if (WESTERN_EXCEPTIONS.has(stateCode)) {
    weight *= 3.2;
  } else if (lon > -90) {
    weight *= 2.6;
  } else if (lon > -100) {
    weight *= 2.1;
  } else if (lon > -110) {
    weight *= 1.3;
  } else {
    weight *= 0.35;
  }

  if (lat < 33) weight *= 1.7;
  else if (lat < 37) weight *= 1.4;
  else if (lat < 40) weight *= 1.0;
  else weight *= 0.55;

  if (SOUTH_GROWTH_STATES.has(stateCode)) weight *= 2.2;
  if (LOW_DENSITY_WEST.has(stateCode)) weight *= 0.3;

  const area = county.censusArea || county.properties?.censusArea || county.properties?.CENSUSAREA || 0;
  if (area > 3000) weight *= 0.4;
  else if (area > 1500) weight *= 0.65;

  return weight;
}

// County borders are only ever drawn at national-to-metro zooms, where 5
// decimals (~1m) is already far below one pixel. Trimming the source precision
// cuts the payload the map has to parse and re-tile while panning and zooming.
function roundGeometryCoordinates(coordinates) {
  if (typeof coordinates[0] === "number") {
    return [
      Math.round(coordinates[0] * 1e4) / 1e4,
      Math.round(coordinates[1] * 1e4) / 1e4
    ];
  }

  return coordinates.map(roundGeometryCoordinates);
}

function normalizeCountyGeojson(sourcePath, targetPath) {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const features = source.features.map((feature) => {
    const props = feature.properties || {};
    const stateFips = props.STATE || props.stateFips;
    const stateCode = props.state || STATE_FIPS_TO_CODE[stateFips];
    const fips = String(feature.id || props.fips).padStart(5, "0");
    const countyName = props.NAME || props.countyName;
    const lsad = props.LSAD || "County";
    const displayName = props.name || (lsad === "County"
      ? `${countyName} County`
      : `${countyName} ${lsad}`);

    return {
      type: "Feature",
      id: fips,
      properties: {
        fips,
        stateFips,
        state: stateCode,
        name: displayName,
        countyName,
        censusArea: props.CENSUSAREA || props.censusArea || 0
      },
      geometry: {
        type: feature.geometry.type,
        coordinates: roundGeometryCoordinates(feature.geometry.coordinates)
      }
    };
  }).filter((feature) => feature.properties.state && !EXCLUDED_STATES.has(feature.properties.state));

  const normalized = {
    type: "FeatureCollection",
    features
  };

  fs.writeFileSync(targetPath, JSON.stringify(normalized));
  return normalized;
}

function buildCountyCatalog(countiesGeojson) {
  return countiesGeojson.features.map((feature) => {
    const stateCode = feature.properties.state;
    const centroid = getGeometryCentroid(feature.geometry);
    const weight = getCountyWeight(
      { censusArea: feature.properties.censusArea },
      stateCode,
      centroid
    );

    return {
      fips: feature.properties.fips,
      state: stateCode,
      name: feature.properties.name,
      weight,
      centroid
    };
  });
}

function pickWeightedCounties(catalog, count, random) {
  const pool = catalog.map((county) => ({ ...county }));
  const selected = [];

  for (let index = 0; index < count && pool.length; index += 1) {
    const totalWeight = pool.reduce((sum, county) => sum + county.weight, 0);
    let threshold = random() * totalWeight;

    let pickIndex = 0;
    for (let poolIndex = 0; poolIndex < pool.length; poolIndex += 1) {
      threshold -= pool[poolIndex].weight;
      if (threshold <= 0) {
        pickIndex = poolIndex;
        break;
      }
    }

    selected.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }

  return selected;
}

function getStatusPool(defaultTerritories, random) {
  const statuses = defaultTerritories.map((territory) => territory.status);
  return () => statuses[Math.floor(random() * statuses.length)];
}

function getInvestmentValue(brand, random) {
  const base = typeof brand.initialInvestment === "number"
    ? brand.initialInvestment
    : 1000000;
  const variance = 0.12 + random() * 0.18;
  const direction = random() > 0.5 ? 1 : -1;
  return Math.round(base * (1 + direction * variance));
}

function buildLargeBrandFile(brand, catalog) {
  const random = mulberry32(hashString(brand.id));
  const targetCount = Math.max(
    Math.round(brand.territories.length * COUNTY_MULTIPLIER),
    80
  );
  const nextStatus = getStatusPool(brand.territories, random);
  const selectedCounties = pickWeightedCounties(catalog, targetCount, random);

  const territories = selectedCounties.map((county) => ({
    state: county.state,
    fips: county.fips,
    name: county.name,
    status: nextStatus(),
    initialInvestment: getInvestmentValue(brand, random)
  }));

  return {
    id: brand.id,
    brand: brand.brand,
    category: brand.category,
    color: brand.color,
    logo: brand.logo,
    country: brand.country,
    level: "county",
    initialInvestment: brand.initialInvestment,
    franchiseeRating: brand.franchiseeRating,
    profileUrl: brand.profileUrl,
    territories
  };
}

function summarizeDistribution(brandFiles) {
  const countsByState = new Map();
  let total = 0;

  brandFiles.forEach((brand) => {
    brand.territories.forEach((territory) => {
      total += 1;
      countsByState.set(territory.state, (countsByState.get(territory.state) || 0) + 1);
    });
  });

  const sortedStates = [...countsByState.entries()].sort((left, right) => right[1] - left[1]);
  return { total, topStates: sortedStates.slice(0, 10) };
}

function main() {
  if (!fs.existsSync(COUNTIES_RAW_SOURCE)) {
    console.error(`Missing county source file: ${COUNTIES_RAW_SOURCE}`);
    console.error("Download geojson-counties-fips.json into data/us-counties.geojson first.");
    process.exit(1);
  }

  fs.mkdirSync(LARGE_DIR, { recursive: true });

  const countiesGeojson = normalizeCountyGeojson(COUNTIES_RAW_SOURCE, COUNTIES_NORMALIZED_TARGET);
  const catalog = buildCountyCatalog(countiesGeojson);

  const generatedBrands = DEFAULT_BRAND_FILES.map((fileName) => {
    const brand = JSON.parse(fs.readFileSync(path.join(DEFAULT_DIR, fileName), "utf8"));
    const largeBrand = buildLargeBrandFile(brand, catalog);
    const outputPath = path.join(LARGE_DIR, fileName);
    fs.writeFileSync(outputPath, `${JSON.stringify(largeBrand, null, 2)}\n`);
    console.log(`${brand.id}: ${largeBrand.territories.length} counties`);
    return largeBrand;
  });

  const summary = summarizeDistribution(generatedBrands);
  console.log(`\nGenerated ${summary.total} county territories across ${generatedBrands.length} brands.`);
  console.log("Top states by territory count:");
  summary.topStates.forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });
}

main();
