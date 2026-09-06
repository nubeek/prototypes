#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const categories = require("./categories.js");

const ROOT = path.resolve(__dirname, "../..");
const TERRITORY_DATA = path.join(ROOT, "territories/data");
const DATASETS = ["default", "large", "real"];
const WRITE_FILES = !process.argv.includes("--report-only");

const report = {
  migrated: [],
  unchanged: [],
  unresolved: [],
  skipped: []
};

function isBrandFile(filePath) {
  if (!filePath.endsWith(".json")) return false;
  if (filePath.includes(`${path.sep}_source${path.sep}`)) return false;
  const name = path.basename(filePath);
  return name !== "geometry.geojson" && !name.startsWith("_");
}

function migrateBrandFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.brand) {
    report.skipped.push(path.relative(ROOT, filePath));
    return;
  }

  const previous = raw.categoryId || raw.category || "";
  const hydrated = categories.hydrateRecord(raw, {
    source: "territories",
    brandId: raw.id
  });
  const stored = { ...hydrated, ...categories.toStoredFields(hydrated) };
  delete stored.category;
  delete stored.categories;
  delete stored.categoryIds;
  if (!stored.categoryNeedsReview) {
    delete stored.categoryOriginal;
    delete stored.categoryNeedsReview;
  }

  if (stored.categoryNeedsReview) {
    report.unresolved.push({
      file: path.relative(ROOT, filePath),
      brand: raw.brand || raw.id,
      original: stored.categoryOriginal || previous
    });
  } else {
    report.migrated.push({
      file: path.relative(ROOT, filePath),
      brand: raw.brand || raw.id,
      from: previous,
      to: stored.categoryId
    });
  }

  if (WRITE_FILES) {
    fs.writeFileSync(filePath, `${JSON.stringify(stored, null, 2)}\n`);
  }
}

function reportCstDumpConcepts() {
  const overlayPath = path.join(ROOT, "cst/data/real/overlay.js");
  const dumpPath = path.join(ROOT, "cst/data/real/owners.js");
  if (!fs.existsSync(overlayPath) || !fs.existsSync(dumpPath)) {
    return { unresolvedConcepts: [], mappedConcepts: [], skipped: true };
  }

  const overlaySource = fs.readFileSync(overlayPath, "utf8");
  const mapMatch = overlaySource.match(/const CONCEPTS_BY_CATEGORY = ({[\s\S]*?});/);
  if (!mapMatch) {
    return { unresolvedConcepts: [], mappedConcepts: [], skipped: true };
  }

  const conceptsByCategory = Function(`"use strict"; return (${mapMatch[1]});`)();
  Object.keys(conceptsByCategory).forEach((id) => categories.requireId(id, "overlay"));
  const mappedConcepts = [...new Set(Object.values(conceptsByCategory).flat())].sort();

  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(dumpPath, "utf8"), sandbox);
  const dump = sandbox.window.cstDumpData || {};
  const conceptNames = [...new Set(
    (dump.owners || []).flatMap((owner) => (owner.concepts || []).map((concept) => concept.name).filter(Boolean))
  )].sort((left, right) => left.localeCompare(right));

  return {
    mappedConcepts,
    unresolvedConcepts: conceptNames.filter((name) => !mappedConcepts.includes(name))
  };
}

DATASETS.forEach((dataset) => {
  const dir = path.join(TERRITORY_DATA, dataset);
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir).forEach((name) => {
    const filePath = path.join(dir, name);
    if (!fs.statSync(filePath).isFile() || !isBrandFile(filePath)) return;
    migrateBrandFile(filePath);
  });
});

const cstDump = reportCstDumpConcepts();

const summary = {
  files: report.migrated.length + report.unresolved.length,
  resolved: report.migrated.length,
  unresolved: report.unresolved.length,
  skipped: report.skipped,
  unresolvedValues: report.unresolved,
  resolvedValues: report.migrated,
  cstDump: {
    mappedConceptCount: cstDump.mappedConcepts?.length || 0,
    unresolvedConceptCount: cstDump.unresolvedConcepts?.length || 0,
    unresolvedConcepts: cstDump.unresolvedConcepts || []
  }
};

console.log(JSON.stringify(summary, null, 2));
