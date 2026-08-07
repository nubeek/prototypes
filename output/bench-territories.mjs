import { chromium } from "playwright";

const URL = "http://localhost:3000/_prototypes/territories/";
const DATASET = process.argv[2] || "large";
const HIDE_LOGOS = process.argv.includes("--no-logos");
const HIDE_BORDERS = process.argv.includes("--no-borders");
const BARE = process.argv.includes("--bare");
const finalZoomArg = process.argv.find((arg) => arg.startsWith("--final-zoom="));
const FINAL_ZOOM = finalZoomArg ? Number(finalZoomArg.slice("--final-zoom=".length)) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const problems = [];
page.on("console", (message) => {
  const type = message.type();
  if (type === "error" || type === "warning") {
    problems.push(`${type}: ${message.text()}`.slice(0, 300));
  }
});
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

await page.addInitScript((datasetId) => {
  window.localStorage.setItem("wefranch-territories-dataset", datasetId);
  window.sessionStorage.setItem("wefranch-territories-skip-crossroad", "true");
  window.sessionStorage.setItem("wefranch:prototype-access", "granted");
}, DATASET);

const startedAt = Date.now();
await page.goto(URL, { waitUntil: "domcontentloaded" });

await page.waitForFunction(() => {
  if (!window.startTerritoryMap) return false;
  window.startTerritoryMap();
  return true;
}, null, { timeout: 30000 });

await page.waitForFunction(
  () => Array.isArray(window.territoryBrands) && window.territoryBrands.length > 0,
  null,
  { timeout: 60000 }
);
await page.waitForFunction(() => window.territoryMap?.isStyleLoaded?.() === true, null, { timeout: 60000 });
await page.waitForTimeout(2500);

const loadMs = Date.now() - startedAt;

if (HIDE_LOGOS) {
  await page.evaluate(() => window.territoryMapControls.setTerritoryBrandLogosVisible(false));
}
if (HIDE_BORDERS) {
  await page.evaluate(() => window.territoryMapControls.setTerritoryBordersVisible(false));
}
const hideArg = process.argv.find((arg) => arg.startsWith("--hide="));
if (hideArg) {
  const suffixes = hideArg.slice("--hide=".length).split(",");
  const hidden = await page.evaluate((layerSuffixes) => {
    const matched = window.territoryMap.getStyle().layers
      .filter((layer) => layer.id.startsWith("territor"))
      .filter((layer) => layerSuffixes.some((suffix) => layer.id.includes(suffix)));
    matched.forEach((layer) => window.territoryMap.setLayoutProperty(layer.id, "visibility", "none"));
    return matched.length;
  }, suffixes);
  console.log(`hid ${hidden} layers matching ${suffixes.join(",")}`);
}

if (BARE) {
  // Floor measurement: base map style only, every territory layer hidden.
  await page.evaluate(() => {
    window.territoryMap.getStyle().layers
      .filter((layer) => layer.id.startsWith("territor"))
      .forEach((layer) => window.territoryMap.setLayoutProperty(layer.id, "visibility", "none"));
  });
}
await page.waitForTimeout(800);

const style = await page.evaluate(() => {
  const styleSpec = window.territoryMap.getStyle();
  const territorySources = Object.keys(styleSpec.sources).filter((id) => id.startsWith("territor"));
  const territoryLayers = styleSpec.layers.filter((layer) => layer.id.startsWith("territor"));
  const counts = {};
  territoryLayers.forEach((layer) => {
    counts[layer.type] = (counts[layer.type] || 0) + 1;
  });

  return {
    territorySources: territorySources.length,
    territoryLayers: territoryLayers.length,
    layersByType: counts,
    imageSources: Object.values(styleSpec.sources).filter((source) => source.type === "image").length,
    brands: window.territoryBrands.length
  };
});

// Drive the same zoom range a user scrolls through and record frame times.
const zoom = await page.evaluate(async (finalZoom) => {
  const map = window.territoryMap;
  const frames = [];
  let lastFrameAt = performance.now();
  let running = true;

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    frames.push(now - lastFrameAt);
    lastFrameAt = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const flyAndWait = (zoomLevel) => new Promise((resolve) => {
    map.once("moveend", resolve);
    map.easeTo({ zoom: zoomLevel, duration: 1400 });
  });

  for (const zoomLevel of [3.4, 6, 4, 7.5, 5, 4.6]) {
    await flyAndWait(zoomLevel);
    await settle(120);
  }

  map.setCenter([-84.4, 33.6]);
  if (finalZoom) {
    map.setZoom(finalZoom);
  }
  await settle(1500);

  running = false;
  await settle(50);

  const sorted = [...frames].sort((left, right) => left - right);
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
  const total = frames.reduce((sum, value) => sum + value, 0);

  return {
    frameCount: frames.length,
    avgFrameMs: total / frames.length,
    medianFrameMs: percentile(0.5),
    p95FrameMs: percentile(0.95),
    worstFrameMs: sorted[sorted.length - 1],
    longFrames: frames.filter((value) => value > 100).length,
    approxFps: 1000 / (total / frames.length)
  };
}, FINAL_ZOOM);

const round = (value) => Math.round(value * 10) / 10;

const modeLabel = `${HIDE_LOGOS ? " (no logos)" : ""}${HIDE_BORDERS ? " (no borders)" : ""}${BARE ? " (bare basemap)" : ""}${hideArg ? ` (${hideArg})` : ""}`;
console.log(`\n=== dataset: ${DATASET}${modeLabel} ===`);
console.log(`load to interactive: ${loadMs} ms   brands: ${style.brands}`);
console.log(`territory sources: ${style.territorySources}   territory layers: ${style.territoryLayers}   image sources: ${style.imageSources}`);
console.log(`layers by type: ${JSON.stringify(style.layersByType)}`);
console.log(`avg frame: ${round(zoom.avgFrameMs)} ms (~${round(zoom.approxFps)} fps)`);
console.log(`median: ${round(zoom.medianFrameMs)} ms   p95: ${round(zoom.p95FrameMs)} ms   worst: ${round(zoom.worstFrameMs)} ms`);
console.log(`frames over 100ms: ${zoom.longFrames} / ${zoom.frameCount}`);

const uniqueProblems = [...new Set(problems)];
console.log(`console errors/warnings: ${uniqueProblems.length}`);
uniqueProblems.slice(0, 12).forEach((problem) => console.log(`  - ${problem}`));

const suffix = `${HIDE_LOGOS ? "-no-logos" : ""}${HIDE_BORDERS ? "-no-borders" : ""}${BARE ? "-bare" : ""}${FINAL_ZOOM ? `-z${FINAL_ZOOM}` : ""}`;
await page.screenshot({ path: `output/territories-${DATASET}${suffix}.png` });
await browser.close();
