#!/usr/bin/env node
/**
 * Captures the splash saved-search map tiles as static JPEGs.
 *
 * Requires the prototype server (npx serve) and opens:
 *   /_prototypes/cst/?generateSnapshots=1
 *
 * That query keeps the live Mapbox + canvas renderer so this script can
 * photograph it. The normal splash page then serves these files instead.
 */

const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const CST_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.join(CST_DIR, "assets", "snapshots");
const BASE_URL = process.env.CST_URL || "http://localhost:3000/_prototypes/cst/";
const GENERATE_URL = new URL("?generateSnapshots=1", BASE_URL).toString();
const SNAPSHOT_WIDTH = 640;
const SNAPSHOT_HEIGHT = 320;

async function waitForTileMaps(page) {
  await page.waitForSelector(".cst-splash__tile .target-map-img", { timeout: 60000 });
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll(
      ".cst-splash__tile .target-map-img, .cst-splash__tile .target-map-points"
    )];
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, { timeout: 60000 });
}

async function captureSnapshots() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1600, height: 1200 }
  });

  await context.addInitScript(() => {
    sessionStorage.setItem("wefranch:prototype-access", "granted");
  });

  const page = await context.newPage();
  await page.goto(GENERATE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForTileMaps(page);

  const tiles = page.locator(".cst-splash__tile");
  const count = await tiles.count();
  if (!count) {
    throw new Error("No splash tiles found to snapshot.");
  }

  const written = [];

  for (let index = 0; index < count; index += 1) {
    const tile = tiles.nth(index);
    const id = await tile.getAttribute("data-saved-search-id");
    if (!id) {
      throw new Error(`Splash tile ${index} is missing data-saved-search-id.`);
    }

    const map = tile.locator(".target-map");
    const box = await map.boundingBox();
    if (!box || box.width < SNAPSHOT_WIDTH - 2 || box.height < SNAPSHOT_HEIGHT - 2) {
      throw new Error(`Splash tile "${id}" map is ${box?.width}x${box?.height}, expected ${SNAPSHOT_WIDTH}x${SNAPSHOT_HEIGHT}.`);
    }

    const filePath = path.join(OUT_DIR, `${id}.jpg`);
    await map.screenshot({
      path: filePath,
      type: "jpeg",
      quality: 88,
      animations: "disabled"
    });
    written.push(path.relative(CST_DIR, filePath));
    console.log(`Wrote ${written[written.length - 1]}`);
  }

  await browser.close();
  return written;
}

captureSnapshots()
  .then((written) => {
    console.log(`Captured ${written.length} splash map snapshots.`);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
