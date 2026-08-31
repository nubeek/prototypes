#!/usr/bin/env node
/**
 * Pulls a map-dot accent colour from each franchise logo and writes
 * data/franchise-brands.js.
 *
 * Usage:
 *   node scripts/generate-franchise-accent-colors.js
 *
 * The extraction is the same sips-to-BMP bucket used by
 * _prototypes/territories/scripts/generate-real-dataset.js: drop near-white,
 * near-black and grey pixels, then take the most saturated remaining bucket.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const vm = require("vm");

const CST_DIR = path.resolve(__dirname, "..");
const LOGO_DIR = path.resolve(CST_DIR, "../../assets/logos/franchises");
const OUT_FILE = path.join(CST_DIR, "data", "franchise-brands.js");
const FALLBACK_COLOR = "#7A63DD";

const FRANCHISE_LOGO_FILE_OVERRIDES = {
  "Club Pilates Franchise": "club-pilates.jpg",
  "Crunch": "crunch-fitness.jpg",
  "Anytime Fitness": "anytime-fitness.png",
  "F45 Training": "f45-training.svg",
  "OrangeTheory Fitness": "orangetheory.jpg",
  "Crumbl Cookies": "crumbl-cookies.png",
  "The Learning Experience": "the-learning-experience.png",
  "Drybar": "drybar.png",
  "Ace Handyman Services": "ace-handyman-services.png",
  "StretchLab": "stretchlab.png",
  "Mathnasium": "mathnasium.png",
  "MaidPro": "maidpro.png",
  "Wendy's": "wendys.jpg",
  "Chili's": "chilis.png",
  "Papa John's": "papa-johns.png",
  "Five Guys": "five-guys.png",
  "Krispy Kreme": "krispy-kreme.png",
  "Jimmy John's": "jimmy-johns.png",
  "Dunkin'": "dunkin.jpg",
  "Blaze Pizza": "blaze-pizza.png",
  "Outback Steakhouse": "outback-steakhouse.png",
  "Smoothie King": "smoothie-king.png",
  "Starbucks": "starbucks.png",
  "Qdoba": "qdoba.png",
  "Title Boxing Club": "title-boxing-club.png",
  "Popeyes Louisiana Kitchen": "popeyes-louisiana-kitchen.jpg",
  "Tropical Smoothie Cafe": "tropical-smoothie-cafe.png",
  "Aussie Pet Mobile": "aussie-pet-mobile.png",
  "Burger King": "burger-king.jpg",
  "Captain D's": "captain-ds.png",
  "Pizza Hut Traditional": "pizza-hut-traditional.png",
  "Taco Bell Traditional": "taco-bell.png",
  "Applebee's": "applebees.png",
  "Buffalo Wild Wings": "buffalo-wild-wings.png",
  "Dave's Hot Chicken": "daves-hot-chicken.png",
  "Denny's": "dennys.png",
  "European Wax Center": "european-wax-center.png",
  "Firehouse Subs": "firehouse-subs.png",
  "IHOP": "ihop.png",
  "Jersey Mike's": "jersey-mikes.png",
  "Massage Envy": "massage-envy.png",
  "Panera Bread": "panera-bread.png",
  "Phenix Salon Suites": "phenix-salon-suites.png",
  "Slim Chicken's": "slim-chickens.png",
  "Tim Hortons": "tim-hortons.png"
};

function getFranchiseSlug(franchiseName) {
  return String(franchiseName)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function deriveLogoColor(logoFile) {
  const temporaryBmp = path.join(
    os.tmpdir(),
    `cst-franchise-logo-${process.pid}-${hashString(logoFile)}.bmp`
  );
  const conversion = spawnSync("/usr/bin/sips", [
    "-Z", "64",
    "-s", "format", "bmp",
    logoFile,
    "--out", temporaryBmp
  ], { stdio: "ignore" });

  if (conversion.status !== 0 || !fs.existsSync(temporaryBmp)) return null;

  try {
    const buckets = new Map();
    for (const [red, green, blue] of readBmpPixels(temporaryBmp)) {
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum ? (maximum - minimum) / maximum : 0;
      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      if (luminance > 0.94 || luminance < 0.12 || saturation < 0.18) continue;

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

    if (!winner) {
      // Monochrome marks (Phenix Salon Suites) have no hue to keep.
      // Use charcoal so the map dots stay visible and match the logo.
      return "#111111";
    }
    const channels = [winner.red, winner.green, winner.blue].map((sum) => (
      Math.round(sum / winner.count).toString(16).padStart(2, "0")
    ));
    return `#${channels.join("").toUpperCase()}`;
  } finally {
    fs.rmSync(temporaryBmp, { force: true });
  }
}

function resolveLogoFile(franchiseName) {
  const override = FRANCHISE_LOGO_FILE_OVERRIDES[franchiseName];
  if (override && fs.existsSync(path.join(LOGO_DIR, override))) {
    return path.join(LOGO_DIR, override);
  }

  const slug = getFranchiseSlug(franchiseName);
  const stems = [slug];
  if (slug.endsWith("-traditional")) stems.push(slug.replace(/-traditional$/, ""));
  if (slug.endsWith("-franchise")) stems.push(slug.replace(/-franchise$/, ""));
  if (slug.endsWith("-fitness")) stems.push(slug.replace(/-fitness$/, ""));
  else stems.push(`${slug}-fitness`);

  for (const stem of stems) {
    for (const extension of [".png", ".jpg", ".svg", ".jpeg"]) {
      const file = path.join(LOGO_DIR, `${stem}${extension}`);
      if (fs.existsSync(file)) return file;
    }
  }

  return null;
}

function loadScript(relativePath, extra = {}) {
  const context = { window: {}, console, ...extra };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(CST_DIR, relativePath), "utf8"), context);
  return context;
}

function collectBrandNames() {
  const names = new Set();
  const dump = loadScript("data/real/owners.js");
  for (const owner of dump.window.cstDumpData.owners || []) {
    for (const concept of owner.concepts || []) {
      if (concept.name) names.add(concept.name);
    }
  }

  const seed = loadScript("data/default/owners.js");
  for (const owner of seed.window.ownersData || []) {
    for (const franchise of owner.franchises || []) names.add(franchise);
  }

  [
    "Planet Fitness", "Snap Fitness", "Crunch Fitness", "Gold's Gym",
    "Orangetheory", "OrangeTheory Fitness", "Club Pilates", "F45 Training",
    "Anytime Fitness"
  ].forEach((name) => names.add(name));

  return [...names].sort((left, right) => left.localeCompare(right));
}

function quoteKey(name) {
  return `"${name.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function writePalette(entries) {
  const lines = entries.map(({ name, color }) => `  ${quoteKey(name)}: "${color}"`);
  const source = `// Accent colour per franchise brand, used to colour unit points on the map.
// Shared: both the seeded roster and the CST adapter assign colours from here.
// Generated by scripts/generate-franchise-accent-colors.js from ../../assets/logos/franchises.

const FRANCHISE_ACCENT_COLORS = Object.freeze({
${lines.join(",\n")}
});
const FRANCHISE_ACCENT_COLOR_FALLBACK = "${FALLBACK_COLOR}";

function getFranchiseAccentColor(franchiseName) {
  return FRANCHISE_ACCENT_COLORS[franchiseName] || FRANCHISE_ACCENT_COLOR_FALLBACK;
}
`;
  fs.writeFileSync(OUT_FILE, source);
}

const brands = collectBrandNames();
const entries = [];
const missing = [];

for (const name of brands) {
  const logoFile = resolveLogoFile(name);
  const color = logoFile ? deriveLogoColor(logoFile) : null;
  if (!color) {
    missing.push({ name, logoFile: logoFile ? path.basename(logoFile) : null });
    continue;
  }
  entries.push({ name, color, file: path.basename(logoFile) });
}

writePalette(entries);

console.log(`Wrote ${entries.length} accent colours to ${path.relative(CST_DIR, OUT_FILE)}`);
for (const entry of entries) {
  console.log(`  ${entry.color}  ${entry.name}  (${entry.file})`);
}
if (missing.length) {
  console.log(`\nSkipped ${missing.length} brands with no usable logo colour:`);
  for (const entry of missing) {
    console.log(`  ${entry.name}${entry.logoFile ? ` (${entry.logoFile})` : ""}`);
  }
}
