#!/usr/bin/env node
/**
 * Converts the production territory export into the lightweight "Real" demo
 * dataset. Raw exports stay in data/real/_source/ and are intentionally ignored
 * by git; generated JSON, GeoJSON, and normalized logo assets are committed.
 */

const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const TERRITORIES_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(TERRITORIES_DIR, "data");
const REAL_DIR = path.join(DATA_DIR, "real");
const SOURCE_DIR = path.join(REAL_DIR, "_source");
const SOURCE_LOGO_DIR = path.join(SOURCE_DIR, "logo");
const TARGET_LOGO_DIR = path.join(TERRITORIES_DIR, "assets", "logos");
const LOGO_CDN = "https://storage.googleapis.com/wefranch-files/media/images";
const EXCLUDED_GEO_TYPES = new Set(["custom"]);
const EXCLUDED_BRAND_SLUGS = new Set([
  "chick-fil-a-inc",
  "chirp-photos-labs",
  "firm-lab",
  "wefranch"
]);
const SIMPLIFY_TOLERANCE = 0.002;
const COORDINATE_PRECISION = 4;

const SOURCE_FILES = [
  "franchise_concept.csv",
  "territories_conceptterritory (filtered).csv",
  "territories_conceptterritorystatus.csv",
  "territories_conceptterritoryversion.csv"
];

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

const FALLBACK_COLORS = [
  "#2563EB", "#0F766E", "#7C3AED", "#C2410C", "#BE123C", "#0369A1",
  "#4D7C0F", "#A21CAF", "#B45309", "#4338CA", "#047857", "#B91C1C"
];

function normalizeText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLogoKey(fileName) {
  return path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[_-]/g, "");
}

async function findExistingLogoFile(brandId) {
  const entries = await fsp.readdir(TARGET_LOGO_DIR, { withFileTypes: true });
  const targetKey = normalizeLogoKey(brandId);
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (normalizeLogoKey(entry.name) === targetKey) {
      return entry.name;
    }
  }
  return null;
}

function parseNumber(value) {
  const normalized = normalizeText(value).replace(/[$,\s]/g, "");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function deriveInvestment(concept) {
  const minimum = parseNumber(concept.startup_cost_estimate);
  const maximum = parseNumber(concept.startup_cost_estimate_max);
  const license = parseNumber(concept.license_price_amount);

  if (minimum !== null && maximum !== null) {
    return Math.round((minimum + maximum) / 2);
  }
  return Math.round(minimum ?? maximum ?? license ?? 0);
}

function deriveCategory(concept) {
  const haystack = [
    concept.name,
    concept.single_line_description,
    concept.description
  ].join(" ").toLowerCase();

  const matches = (pattern) => pattern.test(haystack);

  if (matches(/\b(restaurant|coffee|pizza|food|beverage|bakery|kitchen|paleta|burger|yoga cafe)\b/)) {
    return "Food & Beverage";
  }
  if (matches(/\b(yoga|fitness|gym|health|homecare|home care|wellness|pet care)\b/)) {
    return "Health & Fitness";
  }
  if (matches(/\b(plumb|electric|handyman|appliance|painting|lawn|landscape|maid|clean|restoration|roof|door|window|mosquito|property|moving|junk|vent|inspection|glass|home service|grounds|hvac)\b/)) {
    return "Home & Services";
  }
  if (matches(/\b(retail|store|shop|rental|laundry|franchise products)\b/)) {
    return "Retail";
  }
  return "Services";
}

async function ensureSourceLayout() {
  await fsp.mkdir(SOURCE_DIR, { recursive: true });

  for (const name of SOURCE_FILES) {
    const source = path.join(REAL_DIR, name);
    const target = path.join(SOURCE_DIR, name);
    const sourceExists = await fileExists(source);
    const targetExists = await fileExists(target);

    if (sourceExists && !targetExists) {
      await fsp.rename(source, target);
    } else if (sourceExists && targetExists) {
      throw new Error(`Both source locations exist for ${name}; remove one before generating.`);
    }
  }

  const oldLogoDir = path.join(REAL_DIR, "logo");
  if (await fileExists(oldLogoDir)) {
    if (await fileExists(SOURCE_LOGO_DIR)) {
      throw new Error("Both data/real/logo and data/real/_source/logo exist; remove one before generating.");
    }
    await fsp.rename(oldLogoDir, SOURCE_LOGO_DIR);
  }

  for (const name of SOURCE_FILES) {
    const file = path.join(SOURCE_DIR, name);
    if (!(await fileExists(file))) {
      throw new Error(`Missing raw source: ${file}`);
    }
  }
}

async function fileExists(file) {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

async function* readCsv(file) {
  const stream = fs.createReadStream(file);
  stream.setEncoding("utf8");

  let headers = null;
  let row = [];
  let field = "";
  let inQuotes = false;
  let quotePending = false;

  const emitRow = () => {
    row.push(field);
    field = "";
    const values = row;
    row = [];

    if (!headers) {
      headers = values;
      return null;
    }

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  };

  for await (const chunk of stream) {
    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index];

      if (quotePending) {
        if (character === "\"") {
          field += "\"";
          quotePending = false;
          continue;
        }
        quotePending = false;
        inQuotes = false;
      }

      if (inQuotes) {
        if (character === "\"") {
          quotePending = true;
        } else {
          field += character;
        }
        continue;
      }

      if (character === "\"") {
        inQuotes = true;
      } else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\n") {
        const record = emitRow();
        if (record) yield record;
      } else if (character !== "\r") {
        field += character;
      }
    }
  }

  if (quotePending) {
    inQuotes = false;
  }
  if (inQuotes) {
    throw new Error(`Unterminated CSV field in ${file}`);
  }
  if (field || row.length) {
    const record = emitRow();
    if (record) yield record;
  }
}

async function readCsvTable(file) {
  const rows = [];
  for await (const row of readCsv(file)) rows.push(row);
  return rows;
}

function skipWhitespace(text, cursor) {
  while (cursor.index < text.length && /\s/.test(text[cursor.index])) cursor.index += 1;
}

function parseWktGroup(text, cursor) {
  skipWhitespace(text, cursor);
  if (text[cursor.index] !== "(") throw new Error(`Expected "(" at WKT offset ${cursor.index}`);
  cursor.index += 1;
  skipWhitespace(text, cursor);

  if (text[cursor.index] === "(") {
    const groups = [];
    while (cursor.index < text.length) {
      groups.push(parseWktGroup(text, cursor));
      skipWhitespace(text, cursor);
      if (text[cursor.index] === ",") {
        cursor.index += 1;
        continue;
      }
      if (text[cursor.index] === ")") {
        cursor.index += 1;
        return groups;
      }
      throw new Error(`Unexpected WKT group token at offset ${cursor.index}`);
    }
  }

  const coordinates = [];
  let coordinateStart = cursor.index;

  while (cursor.index < text.length) {
    const character = text[cursor.index];
    if (character === "," || character === ")") {
      const values = text.slice(coordinateStart, cursor.index).trim().split(/\s+/).map(Number);
      if (values.length < 2 || !values.every(Number.isFinite)) {
        throw new Error(`Invalid WKT coordinate at offset ${coordinateStart}`);
      }
      coordinates.push([values[0], values[1]]);
      cursor.index += 1;
      if (character === ")") return coordinates;
      coordinateStart = cursor.index;
    } else {
      cursor.index += 1;
    }
  }

  throw new Error("Unexpected end of WKT geometry");
}

function parseWkt(wkt) {
  const normalized = normalizeText(wkt).replace(/^SRID=\d+;/i, "");
  const typeMatch = normalized.match(/^([A-Z]+)\s*/i);
  if (!typeMatch) throw new Error("Missing WKT geometry type");

  const type = typeMatch[1].toUpperCase();
  const cursor = { index: normalized.indexOf("(", typeMatch[0].length) };
  if (cursor.index < 0) throw new Error(`Empty ${type} geometry`);
  const coordinates = parseWktGroup(normalized, cursor);

  if (type === "MULTIPOLYGON") return { type: "MultiPolygon", coordinates };
  if (type === "POLYGON") return { type: "Polygon", coordinates };
  throw new Error(`Unsupported WKT geometry type: ${type}`);
}

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

// Farallon Islands are legally San Francisco / California, but nobody will
// look for franchise territories on that uninhabited offshore refuge.
const EXCLUDED_ISLAND_BOUNDS = [
  { west: -123.20, east: -122.90, south: 37.62, north: 37.85 }
];

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

function deriveState(geoType, geoId, name) {
  if (geoType === "place" || geoType === "district") {
    return STATE_FIPS_TO_CODE[String(geoId).padStart(2, "0").slice(0, 2)] || "";
  }
  if (geoType === "region") {
    return STATE_FIPS_TO_CODE[String(geoId).padStart(2, "0")] || "";
  }

  const stateMatch = String(name).match(/,\s*([A-Z]{2})(?:-[A-Z]{2})?(?:\b|$)/);
  return stateMatch?.[1] || "";
}

function normalizeStatus(territory, customStatuses) {
  if (normalizeText(territory.franchisee_id)) return "established";
  if (normalizeText(territory.status).toLowerCase() === "sold out") return "sold";

  if (normalizeText(territory.status).toLowerCase() === "custom") {
    const customStatus = customStatuses.get(territory.custom_status_id)?.name || "";
    if (/sold/i.test(customStatus)) return "sold";
  }
  return "available";
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fallbackColor(value) {
  return FALLBACK_COLORS[hashString(value) % FALLBACK_COLORS.length];
}

function readBmpPixels(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString("ascii", 0, 2) !== "BM") return [];

  const pixelOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bitsPerPixel = buffer.readUInt16LE(28);
  if (![24, 32].includes(bitsPerPixel) || width <= 0 || height <= 0) return [];

  const bytesPerPixel = bitsPerPixel / 8;
  const rowStride = Math.ceil((width * bytesPerPixel) / 4) * 4;
  const pixels = [];

  for (let y = 0; y < height; y += 1) {
    const sourceY = rawHeight > 0 ? height - 1 - y : y;
    for (let x = 0; x < width; x += 1) {
      const offset = pixelOffset + sourceY * rowStride + x * bytesPerPixel;
      const blue = buffer[offset];
      const green = buffer[offset + 1];
      const red = buffer[offset + 2];
      const alpha = bitsPerPixel === 32 ? buffer[offset + 3] : 255;
      if (alpha > 32) pixels.push([red, green, blue]);
    }
  }
  return pixels;
}

function deriveLogoColor(logoFile, brandId) {
  const temporaryBmp = path.join(os.tmpdir(), `territory-logo-${process.pid}-${hashString(logoFile)}.bmp`);
  const conversion = spawnSync("/usr/bin/sips", [
    "-Z", "64",
    "-s", "format", "bmp",
    logoFile,
    "--out", temporaryBmp
  ], { stdio: "ignore" });

  if (conversion.status !== 0 || !fs.existsSync(temporaryBmp)) return fallbackColor(brandId);

  try {
    const buckets = new Map();
    for (const [red, green, blue] of readBmpPixels(temporaryBmp)) {
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum ? (maximum - minimum) / maximum : 0;
      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      if (luminance > 0.94 || luminance < 0.08 || saturation < 0.18) continue;

      const key = `${Math.round(red / 32)},${Math.round(green / 32)},${Math.round(blue / 32)}`;
      const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0, saturation: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.saturation += saturation;
      buckets.set(key, bucket);
    }

    const winner = [...buckets.values()].sort((left, right) => {
      const leftScore = left.count * (0.5 + left.saturation / left.count) ** 2;
      const rightScore = right.count * (0.5 + right.saturation / right.count) ** 2;
      return rightScore - leftScore;
    })[0];

    if (!winner) return fallbackColor(brandId);
    const channels = [winner.red, winner.green, winner.blue].map((sum) => (
      Math.round(sum / winner.count).toString(16).padStart(2, "0")
    ));
    return `#${channels.join("").toUpperCase()}`;
  } finally {
    fs.rmSync(temporaryBmp, { force: true });
  }
}

function normalizedLogoExtension(file, contentType = "") {
  const sourceExtension = path.extname(file).toLowerCase();
  if (sourceExtension === ".jpeg" || sourceExtension === ".jpg" || contentType.includes("jpeg")) return ".jpg";
  if (sourceExtension === ".webp" || contentType.includes("webp")) return ".webp";
  return ".png";
}

async function resolveLogo(concept, brandId) {
  const existingLogoFile = await findExistingLogoFile(brandId);
  if (existingLogoFile) {
    const existingPath = path.join(TARGET_LOGO_DIR, existingLogoFile);
    return {
      file: existingPath,
      publicPath: `assets/logos/${existingLogoFile}`
    };
  }

  const logoPath = normalizeText(concept.logo_image);
  if (!logoPath) return null;

  const basename = path.basename(logoPath);
  const localFile = path.join(SOURCE_LOGO_DIR, basename);
  let bytes;
  let extension;

  if (await fileExists(localFile)) {
    bytes = await fsp.readFile(localFile);
    extension = normalizedLogoExtension(localFile);
  } else {
    const response = await fetch(`${LOGO_CDN}/${encodeURIComponent(basename)}`);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      console.warn(`Logo unavailable for ${concept.name}: ${basename} (${response.status})`);
      return null;
    }
    bytes = Buffer.from(await response.arrayBuffer());
    extension = normalizedLogoExtension(basename, contentType);
  }

  const targetFile = path.join(TARGET_LOGO_DIR, `${brandId}${extension}`);
  await fsp.writeFile(targetFile, bytes);
  return {
    file: targetFile,
    publicPath: `assets/logos/${path.basename(targetFile)}`
  };
}

function territorySort(left, right) {
  return left.geoType.localeCompare(right.geoType)
    || left.state.localeCompare(right.state)
    || left.name.localeCompare(right.name)
    || left.geoKey.localeCompare(right.geoKey);
}

async function removeOldGeneratedFiles() {
  const entries = await fsp.readdir(REAL_DIR, { withFileTypes: true });
  const logoPathsToRemove = new Set();

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map(async (entry) => {
      const filePath = path.join(REAL_DIR, entry.name);
      const brand = JSON.parse(await fsp.readFile(filePath, "utf8"));
      if (brand.logo?.startsWith("assets/logos/")) {
        logoPathsToRemove.add(path.join(TERRITORIES_DIR, brand.logo));
      }
      await fsp.rm(filePath);
    }));

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".geojson"))
    .map((entry) => fsp.rm(path.join(REAL_DIR, entry.name))));

  await Promise.all([...logoPathsToRemove].map((logoPath) => fsp.rm(logoPath, { force: true })));
}

async function generate() {
  await ensureSourceLayout();
  await removeOldGeneratedFiles();

  const versions = new Map(
    (await readCsvTable(path.join(SOURCE_DIR, "territories_conceptterritoryversion.csv")))
      .filter((row) => row.name === "current")
      .map((row) => [row.id, row.concept_id])
  );
  const concepts = new Map(
    (await readCsvTable(path.join(SOURCE_DIR, "franchise_concept.csv")))
      .map((row) => [row.id, row])
  );
  const customStatuses = new Map(
    (await readCsvTable(path.join(SOURCE_DIR, "territories_conceptterritorystatus.csv")))
      .map((row) => [row.id, row])
  );

  const brandTerritories = new Map();
  const geometryFeatures = new Map();
  let sourceRowCount = 0;
  let excludedRowCount = 0;
  let skippedRowCount = 0;

  const territoryFile = path.join(SOURCE_DIR, "territories_conceptterritory (filtered).csv");
  for await (const territory of readCsv(territoryFile)) {
    sourceRowCount += 1;
    const geoType = normalizeText(territory.geo_type).toLowerCase();
    if (EXCLUDED_GEO_TYPES.has(geoType)) {
      excludedRowCount += 1;
      continue;
    }

    const conceptId = versions.get(territory.version_id);
    const concept = concepts.get(conceptId);
    const geoId = normalizeText(territory.geo_id);
    const state = deriveState(geoType, geoId, territory.name);
    if (!concept || !geoType || !geoId || !state) {
      skippedRowCount += 1;
      continue;
    }

    const geoKey = `${geoType}:${geoId}`;
    if (normalizeText(territory.geometry) && !geometryFeatures.has(geoKey)) {
      const geometry = simplifyGeometry(parseWkt(territory.geometry));
      geometryFeatures.set(geoKey, {
        type: "Feature",
        id: geoKey,
        properties: {
          geoKey,
          geoType,
          geoId,
          state,
          name: normalizeText(territory.name)
        },
        geometry
      });
    }

    if (!brandTerritories.has(conceptId)) brandTerritories.set(conceptId, []);
    brandTerritories.get(conceptId).push({
      geoKey,
      geoType,
      state,
      name: normalizeText(territory.name),
      status: normalizeStatus(territory, customStatuses)
    });
  }

  const missingGeometryKeys = new Set();
  const brandEntries = [...brandTerritories.entries()]
    .map(([conceptId, territories]) => {
      const filteredTerritories = territories.filter((territory) => {
        if (geometryFeatures.has(territory.geoKey)) return true;
        missingGeometryKeys.add(territory.geoKey);
        return false;
      });
      return [conceptId, filteredTerritories];
    })
    .filter(([, territories]) => territories.length)
    .sort((left, right) => concepts.get(left[0]).name.localeCompare(concepts.get(right[0]).name));

  const usedBrandIds = new Set();
  const generatedBrands = [];

  for (const [conceptId, territories] of brandEntries) {
    const concept = concepts.get(conceptId);
    const baseId = slugify(concept.slug || concept.name) || `concept-${conceptId}`;
    if (EXCLUDED_BRAND_SLUGS.has(baseId)) continue;
    const brandId = usedBrandIds.has(baseId) ? `${baseId}-${conceptId}` : baseId;
    usedBrandIds.add(brandId);

    const logo = await resolveLogo(concept, brandId);
    const brand = {
      id: brandId,
      brand: normalizeText(concept.name),
      category: deriveCategory(concept),
      color: logo ? deriveLogoColor(logo.file, brandId) : fallbackColor(brandId),
      logo: logo?.publicPath || "",
      country: "US",
      level: "geo",
      initialInvestment: deriveInvestment(concept),
      franchiseeRating: 0,
      profileUrl: normalizeText(concept.wefranch_url),
      territories: territories.sort(territorySort)
    };

    await fsp.writeFile(
      path.join(REAL_DIR, `${brandId}.json`),
      `${JSON.stringify(brand, null, 2)}\n`
    );
    generatedBrands.push(brand);
  }

  const geometryCollection = {
    type: "FeatureCollection",
    features: [...geometryFeatures.values()].sort((left, right) => (
      left.properties.geoKey.localeCompare(right.properties.geoKey)
    ))
  };
  await fsp.writeFile(path.join(REAL_DIR, "geometry.geojson"), JSON.stringify(geometryCollection));

  const territoryCount = generatedBrands.reduce((sum, brand) => sum + brand.territories.length, 0);
  const categoryCounts = generatedBrands.reduce((counts, brand) => {
    counts[brand.category] = (counts[brand.category] || 0) + 1;
    return counts;
  }, {});
  const statusCounts = generatedBrands.flatMap((brand) => brand.territories).reduce((counts, territory) => {
    counts[territory.status] = (counts[territory.status] || 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    sourceRows: sourceRowCount,
    excludedRows: excludedRowCount,
    skippedRows: skippedRowCount,
    brands: generatedBrands.length,
    territories: territoryCount,
    geometries: geometryFeatures.size,
    missingGeometryKeys: [...missingGeometryKeys],
    categories: categoryCounts,
    statuses: statusCounts,
    brandFiles: generatedBrands.map((brand) => `real/${brand.id}.json`)
  }, null, 2));
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
