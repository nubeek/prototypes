const CROSSROAD_STATES_URL = "data/us-states.geojson";
const CROSSROAD_BRAND_FILES = [
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
  "ups.json"
];

// Mapbox Static Images API — same style/token the interactive territory map and
// the targets grid snapshots use, so the tile preview looks like the real map.
const CROSSROAD_MAPBOX_STYLE = "nubeek/cka7zizn720s71iogpmkvmw5z";
const CROSSROAD_MAPBOX_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
// Framed to match the interactive map's default view (same center) but zoomed a
// little further out so the whole country sits comfortably inside the tile.
const CROSSROAD_SNAPSHOT_CENTER = [-97.5795, 38.8283];
const CROSSROAD_SNAPSHOT_ZOOM = 2.6;
const CROSSROAD_SNAPSHOT_WIDTH = 640;
const CROSSROAD_SNAPSHOT_HEIGHT = 320;
const CROSSROAD_SNAPSHOT_SCALE = 2;

// Blended-territory preview (mirrors the map's "Blended territories" toggle):
// colored state polygons are blurred into soft blobs and clipped to land.
const CROSSROAD_BLEND_BLUR_DEGREES = 1.15;
const CROSSROAD_BLEND_EXCLUDED_STATES = new Set(["AK", "HI"]);
// Crisp territory outlines drawn on their own layer (mirrors the map's
// "Territory borders" toggle) so they stay sharp over the blurred blend.
const CROSSROAD_BORDER_WIDTH = 3.5;
const CROSSROAD_BORDER_OPACITY = 0.7;

// Each preset is a saved filter recipe surfaced as a browsable tile. Applying a
// preset simply pre-selects these filters once the map data is ready.
const CROSSROAD_PRESETS = [
  {
    id: "qsr",
    title: "QSR Territories",
    filters: { categories: ["Food & Beverage"], statuses: ["available"] }
  },
  {
    id: "fitness",
    title: "Fitness Franchises",
    filters: { categories: ["Health & Fitness"], statuses: ["available"] }
  },
  {
    id: "low-investment",
    title: "Low Initial Investment",
    filters: {
      locationsExcluded: ["AK"],
      investment: { min: 0, max: 500000 }
    }
  },
  {
    id: "chick-fil-a-southeast",
    title: "Chick-fil-A South-East",
    filters: {
      locations: ["GA", "IN", "KY", "NY", "NC", "VA"],
      franchises: ["chick-fil-a"],
      statuses: ["available"]
    }
  },
  {
    id: "burgers-and-fries",
    title: "Burgers & Fries",
    filters: {
      categories: ["Food & Beverage"],
      franchises: ["mcdonalds", "burger-king"],
      statuses: ["available", "sold"]
    }
  }
];

const CROSSROAD_NEW_SEARCH_ICON = `
  <svg class="territory-crossroad__new-icon-svg" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
    <path fill-rule="evenodd" fill="currentColor" d="M35.533,35.619 C35.299,35.855 34.991,35.972 34.684,35.972 C34.376,35.972 34.069,35.855 33.834,35.619 L29.779,31.554 C28.279,32.701 26.412,33.390 24.384,33.390 C19.461,33.390 15.457,29.375 15.457,24.439 C15.457,19.504 19.461,15.488 24.384,15.488 C29.307,15.488 33.311,19.504 33.311,24.439 C33.311,26.473 32.623,28.345 31.479,29.850 L35.533,33.915 C36.003,34.386 36.003,35.149 35.533,35.619 ZM24.384,17.898 C20.787,17.898 17.860,20.832 17.860,24.439 C17.860,28.046 20.787,30.980 24.384,30.980 C27.981,30.980 30.907,28.046 30.907,24.439 C30.907,20.832 27.981,17.898 24.384,17.898 ZM32.109,14.449 C31.445,14.449 30.907,13.909 30.907,13.244 L30.907,4.507 C30.907,4.080 30.715,3.684 30.379,3.422 C30.044,3.160 29.615,3.065 29.201,3.171 L23.010,4.723 L23.010,11.026 C23.010,11.692 22.472,12.231 21.808,12.231 C21.144,12.231 20.606,11.692 20.606,11.026 L20.606,4.723 L12.710,2.743 L12.710,29.604 C12.710,29.636 12.694,29.663 12.692,29.695 C12.685,29.778 12.667,29.855 12.644,29.934 C12.622,30.008 12.602,30.078 12.567,30.145 C12.533,30.213 12.489,30.271 12.442,30.332 C12.393,30.394 12.346,30.452 12.287,30.504 C12.232,30.552 12.171,30.588 12.106,30.626 C12.034,30.669 11.963,30.706 11.882,30.733 C11.853,30.743 11.831,30.765 11.800,30.772 L4.699,32.553 C4.392,32.630 4.082,32.668 3.775,32.668 C2.944,32.668 2.133,32.391 1.458,31.863 C0.535,31.141 0.006,30.053 0.006,28.879 L0.006,5.798 C0.006,4.057 1.183,2.546 2.867,2.124 L11.217,0.031 C11.408,-0.018 11.609,-0.018 11.800,0.031 L21.808,2.540 L28.618,0.833 C29.750,0.547 30.936,0.799 31.858,1.522 C32.781,2.245 33.311,3.333 33.311,4.507 L33.311,13.244 C33.311,13.909 32.773,14.449 32.109,14.449 ZM10.307,2.743 L3.450,4.462 C2.837,4.616 2.410,5.165 2.410,5.798 L2.410,28.879 C2.410,29.306 2.602,29.701 2.938,29.964 C3.275,30.227 3.706,30.318 4.116,30.216 L10.307,28.663 L10.307,2.743 Z"/>
  </svg>
`;

/* Web Mercator projection (matches Mapbox center/zoom rendering) --------- */

function mercatorNormalizedX(lng) {
  return (lng + 180) / 360;
}

function mercatorNormalizedY(lat) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function createSnapshotProjection() {
  const canvasWidth = CROSSROAD_SNAPSHOT_WIDTH * CROSSROAD_SNAPSHOT_SCALE;
  const canvasHeight = CROSSROAD_SNAPSHOT_HEIGHT * CROSSROAD_SNAPSHOT_SCALE;
  const worldSize = 512 * Math.pow(2, CROSSROAD_SNAPSHOT_ZOOM) * CROSSROAD_SNAPSHOT_SCALE;
  const centerX = mercatorNormalizedX(CROSSROAD_SNAPSHOT_CENTER[0]) * worldSize;
  const centerY = mercatorNormalizedY(CROSSROAD_SNAPSHOT_CENTER[1]) * worldSize;

  const project = (lng, lat) => [
    mercatorNormalizedX(lng) * worldSize - centerX + canvasWidth / 2,
    mercatorNormalizedY(lat) * worldSize - centerY + canvasHeight / 2
  ];

  return {
    project,
    canvasWidth,
    canvasHeight,
    pixelsPerDegree: worldSize / 360
  };
}

/* Geometry helpers ------------------------------------------------------ */

function crossroadCollectPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function getGeometryLngBounds(geometry) {
  let west = Infinity;
  let east = -Infinity;

  crossroadCollectPolygons(geometry).forEach((rings) => rings.forEach((ring) => {
    ring.forEach(([lng]) => {
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    });
  }));

  return { west, east };
}

function traceGeometry(context, geometry, project) {
  crossroadCollectPolygons(geometry).forEach((rings) => rings.forEach((ring) => {
    ring.forEach(([lng, lat], index) => {
      const [x, y] = project(lng, lat);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }));
}

/* Base map + blend overlay --------------------------------------------- */

function buildBaseMapUrl() {
  if (!CROSSROAD_MAPBOX_TOKEN) return "";

  const [lng, lat] = CROSSROAD_SNAPSHOT_CENTER;
  const dimensions = `${CROSSROAD_SNAPSHOT_WIDTH}x${CROSSROAD_SNAPSHOT_HEIGHT}@${CROSSROAD_SNAPSHOT_SCALE}x`;
  const params = new URLSearchParams({ access_token: CROSSROAD_MAPBOX_TOKEN });

  return `https://api.mapbox.com/styles/v1/${CROSSROAD_MAPBOX_STYLE}/static/`
    + `${lng},${lat},${CROSSROAD_SNAPSHOT_ZOOM},0/${dimensions}?${params.toString()}`;
}

// Renders the matched territories as soft blurred blobs, clipped to the US land
// mask, and returns a transparent PNG data URL. Kept purely client-side (no
// cross-origin pixels) so exporting the canvas never taints.
function buildBlendDataUrl(statesByCode, matchedColorsByState) {
  const projection = createSnapshotProjection();
  const { project, canvasWidth, canvasHeight, pixelsPerDegree } = projection;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = canvasWidth;
  colorCanvas.height = canvasHeight;
  const colorContext = colorCanvas.getContext("2d");

  let drewAny = false;

  matchedColorsByState.forEach((colors, code) => {
    if (CROSSROAD_BLEND_EXCLUDED_STATES.has(code)) return;
    const feature = statesByCode.get(code);
    if (!feature || !colors.length) return;

    colorContext.beginPath();
    traceGeometry(colorContext, feature.geometry, project);

    if (colors.length === 1) {
      colorContext.fillStyle = colors[0];
    } else {
      const { west, east } = getGeometryLngBounds(feature.geometry);
      const startX = project(west, CROSSROAD_SNAPSHOT_CENTER[1])[0];
      const endX = project(east, CROSSROAD_SNAPSHOT_CENTER[1])[0];
      const gradient = colorContext.createLinearGradient(startX, 0, endX, 0);
      colors.forEach((color, index) => {
        gradient.addColorStop(colors.length > 1 ? index / (colors.length - 1) : 0, color);
      });
      colorContext.fillStyle = gradient;
    }

    colorContext.fill("evenodd");
    drewAny = true;
  });

  if (!drewAny) return "";

  const blurPx = CROSSROAD_BLEND_BLUR_DEGREES * pixelsPerDegree;
  const blendCanvas = document.createElement("canvas");
  blendCanvas.width = canvasWidth;
  blendCanvas.height = canvasHeight;
  const blendContext = blendCanvas.getContext("2d");
  blendContext.filter = `blur(${blurPx}px)`;
  blendContext.drawImage(colorCanvas, 0, 0);
  blendContext.filter = "none";

  // Clip the blur to the coastline so color stops sharply at land edges.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = canvasWidth;
  maskCanvas.height = canvasHeight;
  const maskContext = maskCanvas.getContext("2d");
  maskContext.fillStyle = "#000";
  statesByCode.forEach((feature) => {
    if (!feature?.geometry) return;
    maskContext.beginPath();
    traceGeometry(maskContext, feature.geometry, project);
    maskContext.fill("evenodd");
  });

  blendContext.globalCompositeOperation = "destination-in";
  blendContext.drawImage(maskCanvas, 0, 0);
  blendContext.globalCompositeOperation = "source-over";

  return blendCanvas.toDataURL("image/png");
}

// Draws matched-state outlines as crisp brand-colored strokes on a transparent
// layer so borders read clearly on top of the soft blend.
function buildBordersDataUrl(statesByCode, matchedColorsByState) {
  const { project, canvasWidth, canvasHeight } = createSnapshotProjection();

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = CROSSROAD_BORDER_WIDTH;
  context.globalAlpha = CROSSROAD_BORDER_OPACITY;

  let drewAny = false;

  matchedColorsByState.forEach((colors, code) => {
    if (CROSSROAD_BLEND_EXCLUDED_STATES.has(code)) return;
    const feature = statesByCode.get(code);
    const color = colors[0];
    if (!feature || !color) return;

    context.beginPath();
    traceGeometry(context, feature.geometry, project);
    context.strokeStyle = color;
    context.stroke();
    drewAny = true;
  });

  if (!drewAny) return "";

  return canvas.toDataURL("image/png");
}

/* Presets & matching --------------------------------------------------- */

function normalizeCrossroadInvestmentValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const normalized = Number(value.max ?? value.min);
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return 0;
}

function presetMatchesRecord(record, filters = {}) {
  const categories = filters.categories || [];
  const statuses = filters.statuses || [];
  const franchises = filters.franchises || [];
  const locations = filters.locations || [];
  const locationsExcluded = filters.locationsExcluded || [];
  const investment = filters.investment;

  if (categories.length && !categories.includes(record.category)) return false;
  if (statuses.length && !statuses.includes(record.status)) return false;
  if (franchises.length && !franchises.includes(record.brandId)) return false;
  if (locations.length && !locations.includes(record.state)) return false;
  if (locationsExcluded.length && locationsExcluded.includes(record.state)) return false;

  if (investment) {
    const value = normalizeCrossroadInvestmentValue(record.initialInvestment);
    const min = investment.min ?? 0;
    const max = investment.max ?? Infinity;
    if (value < min || value > max) return false;
  }

  return true;
}

function getCrossroadTerritoryInvestment(brand, territory) {
  return territory.initialInvestment || brand.initialInvestment || 0;
}

function buildCrossroadRecords(brands) {
  return brands.flatMap((brand) => (brand.territories || []).map((territory) => ({
    brandId: brand.id,
    color: brand.color,
    category: brand.category || "",
    state: territory.state,
    status: territory.status,
    initialInvestment: getCrossroadTerritoryInvestment(brand, territory)
  })));
}

function computePresetMatchedColorsByState(records, filters) {
  const matchedColorsByState = new Map();

  records.forEach((record) => {
    if (!presetMatchesRecord(record, filters)) return;

    const existing = matchedColorsByState.get(record.state) || [];
    if (record.color && !existing.includes(record.color)) {
      existing.push(record.color);
    }
    matchedColorsByState.set(record.state, existing);
  });

  return matchedColorsByState;
}

/* Tiles ---------------------------------------------------------------- */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function createPresetTile(preset, { baseMapUrl, blendUrl, bordersUrl, count } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "target-card territory-crossroad__tile territory-crossroad__tile--preset";
  tile.dataset.presetId = preset.id;
  tile.setAttribute("aria-label", `Open ${preset.title} preset`);

  const countLabel = typeof count === "number" ? count.toLocaleString("en-US") : "—";
  const baseImg = baseMapUrl
    ? `<img class="target-map-img" src="${escapeHtml(baseMapUrl)}" alt="" loading="lazy">`
    : "";
  const blendImg = blendUrl
    ? `<img class="target-map-blend" src="${escapeHtml(blendUrl)}" alt="" aria-hidden="true">`
    : "";
  const bordersImg = bordersUrl
    ? `<img class="target-map-borders" src="${escapeHtml(bordersUrl)}" alt="" aria-hidden="true">`
    : "";

  tile.innerHTML = `
    <div class="target-card-title">${escapeHtml(preset.title)}</div>
    <div class="target-map">${baseImg}${blendImg}${bordersImg}</div>
    <div class="target-field target-prospects">
      <span class="target-label">Available territories</span>
      <div class="target-prospects-row">
        <span class="target-number">${countLabel}</span>
        <img class="target-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
      </div>
    </div>
  `;

  return tile;
}

const CROSSROAD_WORKSPACE_HIDE_MS = 240;
const CROSSROAD_ENTER_STAGGER_MS = 65;
const CROSSROAD_ENTER_DURATION_MS = 320;

function playTerritoryCrossroadEnterAnimation(crossroad) {
  if (!crossroad) return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = [
    crossroad.querySelector(".territory-crossroad__heading"),
    ...crossroad.querySelectorAll(".territory-crossroad__grid > *")
  ].filter(Boolean);

  items.forEach((item, index) => {
    item.classList.add("territory-crossroad__animate-item");
    item.style.setProperty("--enter-index", String(index));
  });

  crossroad.classList.remove("is-entering-active");
  crossroad.classList.add("is-entering");

  if (motionQuery.matches) {
    crossroad.classList.add("is-entering-active");
    window.setTimeout(() => {
      crossroad.classList.remove("is-entering", "is-entering-active");
      items.forEach((item) => {
        item.classList.remove("territory-crossroad__animate-item");
        item.style.removeProperty("--enter-index");
      });
    }, 0);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      crossroad.classList.add("is-entering-active");
    });
  });

  const totalMs = CROSSROAD_ENTER_DURATION_MS + Math.max(0, items.length - 1) * CROSSROAD_ENTER_STAGGER_MS;
  window.setTimeout(() => {
    crossroad.classList.remove("is-entering", "is-entering-active");
    items.forEach((item) => {
      item.classList.remove("territory-crossroad__animate-item");
      item.style.removeProperty("--enter-index");
    });
  }, totalMs + 40);
}

function dismissTerritoryCrossroad() {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");

  shell?.classList.remove("is-crossroad-open", "is-crossroad-fullscreen", "is-crossroad-hiding-workspace");
  window.territoryMapControls?.updateResetVisibility?.();

  if (!crossroad || crossroad.hidden) return;

  crossroad.classList.remove("is-entering", "is-entering-active");
  crossroad.classList.add("is-leaving");

  window.setTimeout(() => {
    if (crossroad.classList.contains("is-leaving")) {
      crossroad.hidden = true;
    }
  }, 300);
}

function showTerritoryCrossroad({ animate = false } = {}) {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");

  if (!crossroad) return;

  window.territoryMapControls?.clearHover?.();
  crossroad.hidden = false;
  crossroad.classList.remove("is-leaving", "is-entering", "is-entering-active", "is-preparing-enter");
  shell?.classList.add("is-crossroad-open");
  window.territoryCrossroadChoice = null;
  window.territoryMapControls?.updateResetVisibility?.();

  if (animate) {
    playTerritoryCrossroadEnterAnimation(crossroad);
  }
}

function showTerritoryCrossroadAfterClearAll() {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");
  if (!shell || !crossroad) {
    showTerritoryCrossroad({ animate: true });
    return;
  }

  crossroad.hidden = true;
  crossroad.classList.remove("is-leaving", "is-entering", "is-entering-active");
  window.territoryCrossroadChoice = null;
  window.territoryMapControls?.clearHover?.();

  shell.classList.add("is-crossroad-hiding-workspace", "is-crossroad-open", "is-crossroad-fullscreen");
  window.territoryMapControls?.updateResetVisibility?.();

  window.setTimeout(() => {
    shell.classList.remove("is-crossroad-hiding-workspace");
    showTerritoryCrossroad({ animate: true });
  }, CROSSROAD_WORKSPACE_HIDE_MS);
}

window.showTerritoryCrossroad = showTerritoryCrossroad;
window.showTerritoryCrossroadAfterClearAll = showTerritoryCrossroadAfterClearAll;
window.dismissTerritoryCrossroad = dismissTerritoryCrossroad;

function beginTerritoryMapLoad() {
  const loadingEl = document.getElementById("territoryMapLoading");
  if (loadingEl) {
    loadingEl.hidden = false;
  }

  window.startTerritoryMap?.();
}

function chooseCrossroadOption(choice) {
  if (window.__territoryMapStarted) {
    window.territoryCrossroadChoice = choice;
    window.territoryMapFilters?.hideTerritoryRecords?.();
    dismissTerritoryCrossroad();

    if (choice.type === "preset") {
      window.territoryFilters?.applyCrossroadPreset?.(choice.filters || {});
    } else {
      window.territoryFilters?.resetFilterSelections?.({ refreshMap: false });
    }

    window.territoryFilters?.refresh?.();
    window.territoryMapFilters?.scheduleFilteredReveal?.(window.territoryMap);
    return;
  }

  window.territoryCrossroadChoice = choice;
  dismissTerritoryCrossroad();
  beginTerritoryMapLoad();
}

function startTerritoryMapFromFilters() {
  if (window.__territoryMapStarted) return;
  if (!document.querySelector("[data-territory-crossroad]")) return;

  window.territoryCrossroadChoice = { type: "filters" };
  dismissTerritoryCrossroad();
  beginTerritoryMapLoad();
}

window.startTerritoryMapFromFilters = startTerritoryMapFromFilters;

function bindNewSearchTile() {
  const newTile = document.querySelector("[data-crossroad-new]");
  if (!newTile) return;

  newTile.innerHTML = `
    <span class="territory-crossroad__new-icon">${CROSSROAD_NEW_SEARCH_ICON}</span>
    <span class="territory-crossroad__new-title">New search</span>
    <span class="territory-crossroad__new-subtitle">Click here to begin with a new territory search</span>
  `;

  newTile.addEventListener("click", () => {
    chooseCrossroadOption({ type: "new", filters: {} });
  });
}

function bindPresetTile(tile, preset) {
  tile.addEventListener("click", () => {
    chooseCrossroadOption({ type: "preset", presetId: preset.id, filters: preset.filters });
  });
}

async function fetchCrossroadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

async function loadCrossroadTerritoryData() {
  if (window.territoryDataCache?.load) {
    const { statesGeojson, brands } = await window.territoryDataCache.load();
    return { statesGeojson, brands };
  }

  const [statesGeojson, ...brands] = await Promise.all([
    fetchCrossroadJson(CROSSROAD_STATES_URL),
    ...CROSSROAD_BRAND_FILES.map((file) => fetchCrossroadJson(`data/${file}`))
  ]);

  return { statesGeojson, brands };
}

function revealTerritoryCrossroadEnter(crossroad) {
  if (!crossroad) return;

  crossroad.classList.remove("is-preparing-enter");
  playTerritoryCrossroadEnterAnimation(crossroad);
}

async function initTerritoryCrossroad() {
  bindNewSearchTile();

  const grid = document.getElementById("territoryCrossroadGrid");
  const crossroad = document.getElementById("territoryCrossroad");
  if (!grid) return;

  const shouldRevealOnLoad = Boolean(
    crossroad
    && !crossroad.hidden
    && document.querySelector(".territory-shell.is-crossroad-open")
    && !window.__territoryMapStarted
  );

  if (shouldRevealOnLoad) {
    crossroad.classList.add("is-preparing-enter");
  }

  const tilesByPreset = new Map();

  try {
    const { statesGeojson, brands } = await loadCrossroadTerritoryData();

    const statesByCode = new Map(
      (statesGeojson.features || []).map((feature) => [feature.properties?.code, feature])
    );
    const records = buildCrossroadRecords(brands);
    const baseMapUrl = buildBaseMapUrl();

    window.territoryFilters?.hydrateOptions?.(brands);

    CROSSROAD_PRESETS.forEach((preset) => {
      const matchingRecords = records.filter((record) => presetMatchesRecord(record, preset.filters));
      const matchedColorsByState = computePresetMatchedColorsByState(records, preset.filters);

      let blendUrl = "";
      let bordersUrl = "";
      try {
        blendUrl = buildBlendDataUrl(statesByCode, matchedColorsByState);
        bordersUrl = buildBordersDataUrl(statesByCode, matchedColorsByState);
      } catch (error) {
        console.warn("Unable to render blended territory preview.", error);
      }

      const tile = createPresetTile(preset, {
        baseMapUrl,
        blendUrl,
        bordersUrl,
        count: matchingRecords.length
      });
      bindPresetTile(tile, preset);
      grid.append(tile);
      tilesByPreset.set(preset.id, tile);
    });
  } catch (error) {
    console.warn("Unable to build territory crossroad previews.", error);

    CROSSROAD_PRESETS.forEach((preset) => {
      const tile = createPresetTile(preset);
      bindPresetTile(tile, preset);
      grid.append(tile);
      tilesByPreset.set(preset.id, tile);
    });
  }

  if (shouldRevealOnLoad) {
    revealTerritoryCrossroadEnter(crossroad);
  } else if (crossroad) {
    crossroad.classList.remove("is-preparing-enter");
  }

  if (!window.__territoryMapStarted && (window.territoryFilters?.getAppliedFilterCount?.() || 0) > 0) {
    startTerritoryMapFromFilters();
  }
}

initTerritoryCrossroad();
