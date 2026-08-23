#!/usr/bin/env node
/**
 * Turns a raw CST API dump into the browser-loadable data/real/owners.js.
 *
 * Usage:
 *   node scripts/build-cst-data.js [dumpDir]
 *
 * Reads owners_table.json plus the per-owner org_chart.json and units_map.json
 * folders and writes a file that mirrors the API's own field names. Mapping
 * those records onto the prototype's owner shape stays entirely in
 * data/real/overlay.js, so this script can be re-pointed at a fresh dump
 * without touching the prototype.
 *
 * Defaults to the dump committed under data/real/_source.
 */

const fs = require("fs");
const path = require("path");

const CST_DIR = path.resolve(__dirname, "..");
const OUT_FILE = path.join(CST_DIR, "data", "real", "owners.js");
const DUMP_DIR = path.resolve(process.argv[2] || path.join(CST_DIR, "data", "real", "_source"));

// Every owner the dump carries a detail folder for. Pass a comma-separated list
// of public ids as the second argument to build a smaller subset.
function resolveOwnerPublicIds(ownersTable) {
  const requested = process.argv[3];
  if (requested) return requested.split(",").map((id) => id.trim()).filter(Boolean);

  const manifestPath = path.join(DUMP_DIR, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.owner_public_ids?.length) return manifest.owner_public_ids;
  }

  return (ownersTable.results || []).map((record) => record.public_id);
}

const COORDINATE_PRECISION = 5;

// Every brand in the dump is a North American chain, but a handful of units
// carry coordinates that land elsewhere (one in western China, one on the
// antimeridian). Left in, two bad points stretch the map's auto-fit across the
// globe. They are dropped from the plottable set while unitsCount keeps
// reporting what CST said, and the build logs the difference.
const PLOTTABLE_BOUNDS = { south: 14, north: 72, west: -170, east: -52 };

function isPlottableCoordinate(lat, lng) {
  return lat >= PLOTTABLE_BOUNDS.south && lat <= PLOTTABLE_BOUNDS.north
    && lng >= PLOTTABLE_BOUNDS.west && lng <= PLOTTABLE_BOUNDS.east;
}

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(DUMP_DIR, ...segments), "utf8"));
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(COORDINATE_PRECISION));
}

function pickConcepts(concepts) {
  return (concepts || []).map((concept) => ({
    name: concept.name,
    publicId: concept.public_id,
    slug: concept.slug
  }));
}

function pickContact(contact) {
  if (!contact) return null;

  return {
    name: contact.name || "",
    title: contact.org_title || "",
    email: contact.email || "",
    phone: contact.phone || "",
    linkedinUrl: contact.linkedin_link || "",
    orgKey: contact.org_key || ""
  };
}

function pickOrgNodes(nodes) {
  return (nodes || []).map((node) => ({
    key: node.org_key || String(node.id),
    name: node.name || "",
    title: node.org_title || "",
    children: pickOrgNodes(node.children)
  }));
}

function countOrgNodes(nodes) {
  return (nodes || []).reduce((total, node) => total + 1 + countOrgNodes(node.children), 0);
}

// Units arrive as a GeoJSON FeatureCollection carrying nothing but an id, so
// they collapse to [lat, lng, cstUnitId] triples.
function pickUnits(unitsMap) {
  return (unitsMap.features || [])
    .map((feature) => {
      const [longitude, latitude] = feature.geometry?.coordinates || [];
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (!isPlottableCoordinate(latitude, longitude)) return null;
      return [roundCoordinate(latitude), roundCoordinate(longitude), feature.properties?.id ?? null];
    })
    .filter(Boolean);
}

function buildOwner(record) {
  const orgChartFile = readJson("owners", record.public_id, "org_chart.json");
  const unitsMapFile = readJson("owners", record.public_id, "units_map.json");
  const orgChart = pickOrgNodes(orgChartFile.org_chart);
  const units = pickUnits(unitsMapFile);

  return {
    publicId: record.public_id,
    name: record.name,
    groupCode: record.group_code || "",
    website: record.website || "",
    linkedinUrl: record.linkedin_link || "",
    contactsCount: record.contacts_count ?? null,
    unitsCount: record.units_count ?? null,
    contact: pickContact(record.contact),
    concepts: pickConcepts(record.concepts),
    orgChart,
    // Kept separate from unitsCount: the map endpoint can return fewer points
    // than the owner's reported unit total.
    mappedUnitCount: units.length,
    orgChartPeopleCount: countOrgNodes(orgChart),
    units
  };
}

// JSON.stringify puts every coordinate on its own line, which makes the units
// block unreadable. Only unit triples match this shape.
function collapseUnitTriples(json) {
  return json.replace(
    /\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(\d+|null)\s*\]/g,
    "[$1, $2, $3]"
  );
}

function main() {
  if (!fs.existsSync(DUMP_DIR)) {
    console.error(`CST dump not found at ${DUMP_DIR}`);
    console.error("Pass the dump directory as the first argument.");
    process.exit(1);
  }

  const ownersTable = readJson("owners_table.json");
  const recordsByPublicId = new Map(
    (ownersTable.results || []).map((record) => [record.public_id, record])
  );

  const owners = resolveOwnerPublicIds(ownersTable).map((publicId) => {
    const record = recordsByPublicId.get(publicId);
    if (!record) throw new Error(`${publicId} is not in owners_table.json`);
    return buildOwner(record);
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: path.basename(DUMP_DIR),
    ownersTableTotal: ownersTable.total ?? null,
    ownersTablePage: ownersTable.results?.length ?? null,
    owners
  };

  const body = collapseUnitTriples(JSON.stringify(payload, null, 2));
  const file = `// Generated by scripts/build-cst-data.js - do not edit by hand.
// Field names follow the CST API; data/real/overlay.js maps them onto the
// prototype's owner shape.
window.cstDumpData = ${body};
`;

  fs.writeFileSync(OUT_FILE, file);

  const total = (key) => owners.reduce((sum, owner) => sum + (owner[key] || 0), 0);
  const countMismatches = owners.filter((owner) => owner.unitsCount !== owner.mappedUnitCount);

  console.log(`Wrote ${path.relative(CST_DIR, OUT_FILE)} from ${DUMP_DIR}`);
  console.log(`owners_table.json: ${payload.ownersTablePage} of ${payload.ownersTableTotal} owners`);
  console.log(`owners written: ${owners.length}`);
  console.log(`units: ${total("mappedUnitCount")} mapped, ${total("unitsCount")} reported`);
  console.log(`org chart people: ${total("orgChartPeopleCount")}`);
  console.log(`single-concept owners: ${owners.filter((owner) => owner.concepts.length === 1).length}`);
  if (countMismatches.length) {
    console.log(
      "unplottable coordinates dropped: "
      + countMismatches
        .map((owner) => `${owner.name} (${owner.unitsCount - owner.mappedUnitCount})`)
        .join(", ")
    );
  }
}

main();
