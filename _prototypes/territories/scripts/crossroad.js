const CROSSROAD_STATES_URL = "data/us-states.geojson";
const CROSSROAD_COUNTIES_URL = "data/us-counties.geojson";
const CROSSROAD_GEO_FEATURES_URL = "data/real/geometry.geojson";

// Mapbox Static Images API — same style/token the interactive territory map and
// the targets grid snapshots use, so the tile preview looks like the real map.
const CROSSROAD_MAPBOX_STYLE = "nubeek/cka7zizn720s71iogpmkvmw5z";
const CROSSROAD_MAPBOX_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
// Framed to match the interactive map's default view (same center) but zoomed a
// little further out so the whole country sits comfortably inside the tile.
const CROSSROAD_DEFAULT_VIEW = {
  center: [-97.5795, 38.8283],
  zoom: 2.45
};
const CROSSROAD_SNAPSHOT_WIDTH = 640;
const CROSSROAD_SNAPSHOT_HEIGHT = 320;
const CROSSROAD_SNAPSHOT_SCALE = 2;
const CROSSROAD_REGIONAL_PADDING = 0.22;
const CROSSROAD_REGIONAL_ZOOM_OUT = 0.2;
const CROSSROAD_MAX_REGIONAL_LOCATION_COUNT = 35;
const CROSSROAD_MIN_REGIONAL_ZOOM = 3;
const CROSSROAD_MAX_REGIONAL_ZOOM = 6.5;
const CROSSROAD_SEARCH_SUGGESTION_GROUP_LIMIT = 3;
const CROSSROAD_SEARCH_SUGGESTION_LIMIT = 9;

let crossroadTerritoryBrands = [];

// Territory preview overlays for splash preset cards: density fills plus crisp
// borders.
const CROSSROAD_PREVIEW_EXCLUDED_STATES = new Set(["AK", "HI"]);
const CROSSROAD_PREVIEW_STYLES = {
  state: { borderWidth: 3.5 },
  county: { borderWidth: 1.5 },
  geo: { borderWidth: 1 }
};
const CROSSROAD_DENSITY_LOW_COLOR = "#d1bbde";
const CROSSROAD_DENSITY_HIGH_COLOR = "#81599a";
const CROSSROAD_DENSITY_LOW_OPACITY = 0.3;
const CROSSROAD_DENSITY_HIGH_OPACITY = 0.72;
const CROSSROAD_DENSITY_BORDER_COLOR = CROSSROAD_DENSITY_HIGH_COLOR;
const CROSSROAD_DENSITY_BORDER_OPACITY = 0.42;

/* Web Mercator projection (matches Mapbox center/zoom rendering) --------- */

function mercatorNormalizedX(lng) {
  return (lng + 180) / 360;
}

function mercatorNormalizedY(lat) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function createSnapshotProjection(view = CROSSROAD_DEFAULT_VIEW) {
  const canvasWidth = CROSSROAD_SNAPSHOT_WIDTH * CROSSROAD_SNAPSHOT_SCALE;
  const canvasHeight = CROSSROAD_SNAPSHOT_HEIGHT * CROSSROAD_SNAPSHOT_SCALE;
  const worldSize = 512 * Math.pow(2, view.zoom) * CROSSROAD_SNAPSHOT_SCALE;
  const centerX = mercatorNormalizedX(view.center[0]) * worldSize;
  const centerY = mercatorNormalizedY(view.center[1]) * worldSize;

  const project = (lng, lat) => [
    mercatorNormalizedX(lng) * worldSize - centerX + canvasWidth / 2,
    mercatorNormalizedY(lat) * worldSize - centerY + canvasHeight / 2
  ];

  return {
    project,
    canvasWidth,
    canvasHeight,
    pixelsPerDegree: worldSize / 360,
    view
  };
}

/* Geometry helpers ------------------------------------------------------ */

function crossroadCollectPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function getCrossroadGeometryBounds(geometry) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  crossroadCollectPolygons(geometry).forEach((rings) => rings.forEach((ring) => {
    ring.forEach(([lng, lat]) => {
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    });
  }));

  if (!Number.isFinite(west)) return null;

  return { west, south, east, north };
}

function mergeBounds(left, right) {
  if (!left) return right;
  if (!right) return left;

  return {
    west: Math.min(left.west, right.west),
    south: Math.min(left.south, right.south),
    east: Math.max(left.east, right.east),
    north: Math.max(left.north, right.north)
  };
}

function getMatchedFeaturesBounds(matchedFeatures) {
  let bounds = null;

  matchedFeatures.forEach(({ feature }) => {
    if (!feature?.geometry) return;
    bounds = mergeBounds(bounds, getCrossroadGeometryBounds(feature.geometry));
  });

  return bounds;
}

function getLocationFilterBounds(locations, geoIndex) {
  let bounds = null;

  locations.forEach((code) => {
    const feature = geoIndex.statesByCode.get(code);
    if (!feature?.geometry) return;
    bounds = mergeBounds(bounds, getCrossroadGeometryBounds(feature.geometry));
  });

  return bounds;
}

function latRad(lat) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
}

function computeZoomForBounds(west, south, east, north) {
  const WORLD_SIZE = 512;
  const width = CROSSROAD_SNAPSHOT_WIDTH;
  const height = CROSSROAD_SNAPSHOT_HEIGHT;
  const lngFraction = Math.max((east - west) / 360, 0.0001);
  const latFraction = Math.max((latRad(north) - latRad(south)) / Math.PI, 0.0001);
  const lngZoom = Math.log2(width / WORLD_SIZE / lngFraction);
  const latZoom = Math.log2(height / WORLD_SIZE / latFraction);
  const zoom = Math.min(lngZoom, latZoom);

  return Math.max(
    CROSSROAD_MIN_REGIONAL_ZOOM,
    Math.min(CROSSROAD_MAX_REGIONAL_ZOOM, zoom)
  );
}

function computeRegionalSnapshotView(bounds, padding = CROSSROAD_REGIONAL_PADDING) {
  const lngSpan = Math.max(bounds.east - bounds.west, 0.5);
  const latSpan = Math.max(bounds.north - bounds.south, 0.5);
  const padLng = lngSpan * padding;
  const padLat = latSpan * padding;

  const west = bounds.west - padLng;
  const east = bounds.east + padLng;
  const south = bounds.south - padLat;
  const north = bounds.north + padLat;

  return {
    center: [(west + east) / 2, (south + north) / 2],
    zoom: Math.max(
      CROSSROAD_MIN_REGIONAL_ZOOM,
      computeZoomForBounds(west, south, east, north) - CROSSROAD_REGIONAL_ZOOM_OUT
    )
  };
}

function hasRegionalLocationFilter(filters = {}) {
  const locations = filters.locations || [];
  return locations.length > 0 && locations.length <= CROSSROAD_MAX_REGIONAL_LOCATION_COUNT;
}

function resolveCrossroadSnapshotView(filters = {}, matchedFeatures, geoIndex) {
  if (!hasRegionalLocationFilter(filters)) {
    return CROSSROAD_DEFAULT_VIEW;
  }

  const bounds = getMatchedFeaturesBounds(matchedFeatures)
    || getLocationFilterBounds(filters.locations, geoIndex);

  if (!bounds) {
    return CROSSROAD_DEFAULT_VIEW;
  }

  return computeRegionalSnapshotView(bounds);
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

/* Base map + territory overlay ----------------------------------------- */

function buildBaseMapUrl(view = CROSSROAD_DEFAULT_VIEW) {
  if (!CROSSROAD_MAPBOX_TOKEN) return "";

  const [lng, lat] = view.center;
  const dimensions = `${CROSSROAD_SNAPSHOT_WIDTH}x${CROSSROAD_SNAPSHOT_HEIGHT}@${CROSSROAD_SNAPSHOT_SCALE}x`;
  const params = new URLSearchParams({ access_token: CROSSROAD_MAPBOX_TOKEN });

  return `https://api.mapbox.com/styles/v1/${CROSSROAD_MAPBOX_STYLE}/static/`
    + `${lng},${lat},${view.zoom},0/${dimensions}?${params.toString()}`;
}

function getCrossroadPreviewStyle(previewLevel = "state") {
  if (previewLevel === "county") return CROSSROAD_PREVIEW_STYLES.county;
  if (previewLevel === "state") return CROSSROAD_PREVIEW_STYLES.state;
  return CROSSROAD_PREVIEW_STYLES.geo;
}

function shouldExcludeCrossroadFeature(feature, previewLevel = "state") {
  const stateCode = previewLevel === "state"
    ? feature?.properties?.code
    : feature?.properties?.state;
  return Boolean(stateCode && CROSSROAD_PREVIEW_EXCLUDED_STATES.has(stateCode));
}

function parseCrossroadHexColor(color) {
  let value = String(color || "").replace("#", "");
  if (value.length === 3) {
    value = value.split("").map((character) => character + character).join("");
  }

  return {
    red: parseInt(value.slice(0, 2), 16) || 0,
    green: parseInt(value.slice(2, 4), 16) || 0,
    blue: parseInt(value.slice(4, 6), 16) || 0
  };
}

function interpolateCrossroadColor(startColor, endColor, ratio) {
  const start = parseCrossroadHexColor(startColor);
  const end = parseCrossroadHexColor(endColor);
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const toChannel = (startValue, endValue) => (
    Math.round(startValue + ((endValue - startValue) * clampedRatio))
      .toString(16)
      .padStart(2, "0")
  );

  return `#${toChannel(start.red, end.red)}${toChannel(start.green, end.green)}${toChannel(start.blue, end.blue)}`;
}

function interpolateCrossroadValue(start, end, ratio) {
  return start + ((end - start) * Math.min(1, Math.max(0, ratio)));
}

function buildFillDataUrl(geoIndex, matchedFeatures, previewLevel = "state", view = CROSSROAD_DEFAULT_VIEW) {
  const projection = createSnapshotProjection(view);
  const { project, canvasWidth, canvasHeight } = projection;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = canvasWidth;
  fillCanvas.height = canvasHeight;
  const fillContext = fillCanvas.getContext("2d");

  let drewAny = false;

  matchedFeatures.forEach(({ feature, densityColor, densityOpacity }) => {
    if (shouldExcludeCrossroadFeature(feature, previewLevel)) return;
    if (!feature?.geometry || !densityColor) return;

    fillContext.beginPath();
    traceGeometry(fillContext, feature.geometry, project);
    fillContext.fillStyle = densityColor;
    fillContext.globalAlpha = densityOpacity;
    fillContext.fill("evenodd");
    fillContext.globalAlpha = 1;
    drewAny = true;
  });

  if (!drewAny) return "";

  // Clip fills to the coastline so color stops sharply at land edges.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = canvasWidth;
  maskCanvas.height = canvasHeight;
  const maskContext = maskCanvas.getContext("2d");
  maskContext.fillStyle = "#000";
  geoIndex.statesByCode.forEach((feature) => {
    if (!feature?.geometry) return;
    maskContext.beginPath();
    traceGeometry(maskContext, feature.geometry, project);
    maskContext.fill("evenodd");
  });

  fillContext.globalCompositeOperation = "destination-in";
  fillContext.drawImage(maskCanvas, 0, 0);
  fillContext.globalCompositeOperation = "source-over";

  return fillCanvas.toDataURL("image/png");
}

// Draws matched territory outlines as crisp density-colored strokes on a
// transparent layer so borders read clearly on top of the solid fills.
function buildBordersDataUrl(matchedFeatures, previewLevel = "state", view = CROSSROAD_DEFAULT_VIEW) {
  const { borderWidth } = getCrossroadPreviewStyle(previewLevel);
  const { project, canvasWidth, canvasHeight } = createSnapshotProjection(view);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = borderWidth;
  context.globalAlpha = CROSSROAD_DENSITY_BORDER_OPACITY;

  let drewAny = false;

  matchedFeatures.forEach(({ feature }) => {
    if (shouldExcludeCrossroadFeature(feature, previewLevel)) return;
    if (!feature?.geometry) return;

    context.beginPath();
    traceGeometry(context, feature.geometry, project);
    context.strokeStyle = CROSSROAD_DENSITY_BORDER_COLOR;
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
  const geoLevels = Array.isArray(filters.geoLevels)
    ? filters.geoLevels
    : filters.geoLevel && filters.geoLevel !== "all types"
      ? [filters.geoLevel]
      : [];
  const investment = filters.investment;

  if (categories.length && !categories.includes(record.category)) return false;
  if (statuses.length && !statuses.includes(record.status)) return false;
  if (franchises.length && !franchises.includes(record.brandId)) return false;
  if (locations.length && !locations.includes(record.state)) return false;
  if (locationsExcluded.length && locationsExcluded.includes(record.state)) return false;
  if (geoLevels.length && !geoLevels.includes(record.geoType)) return false;

  if (investment) {
    const value = normalizeCrossroadInvestmentValue(record.initialInvestment);
    const min = investment.min ?? 0;
    const max = investment.max ?? Infinity;
    if (value < min || value > max) return false;
  }

  return true;
}

function getCrossroadTerritoryInvestment(brand, territory) {
  if (territory != null && territory.initialInvestment != null) {
    return normalizeCrossroadInvestmentValue(territory.initialInvestment);
  }

  if (brand != null && brand.initialInvestment != null) {
    return normalizeCrossroadInvestmentValue(brand.initialInvestment);
  }

  return 0;
}

function buildCrossroadRecords(brands) {
  return brands.flatMap((brand) => (brand.territories || []).map((territory) => ({
    brandId: brand.id,
    brandLevel: brand.level || "state",
    category: brand.category || "",
    state: territory.state,
    geoKey: territory.geoKey || null,
    fips: territory.fips || null,
    geoType: territory.geoType || (brand.level === "county" ? "district" : brand.level === "geo" ? "place" : "region"),
    status: territory.status,
    initialInvestment: getCrossroadTerritoryInvestment(brand, territory)
  })));
}

function isCrossroadGeoLevelBrand(brand) {
  return brand?.level === "geo";
}

function isCrossroadCountyLevelBrand(brand) {
  return brand?.level === "county";
}

function buildCrossroadGeoIndex(statesGeojson, countiesGeojson, geoFeaturesGeojson) {
  return {
    statesByCode: new Map(
      (statesGeojson?.features || []).map((feature) => [feature.properties?.code, feature])
    ),
    countiesByFips: new Map(
      (countiesGeojson?.features || []).map((feature) => [feature.properties?.fips, feature])
    ),
    geoFeaturesByKey: new Map(
      (geoFeaturesGeojson?.features || []).map((feature) => [feature.properties?.geoKey, feature])
    )
  };
}

function resolveCrossroadFeature(record, geoIndex) {
  if (record.brandLevel === "geo" && record.geoKey) {
    return geoIndex.geoFeaturesByKey.get(record.geoKey) || null;
  }

  if (record.brandLevel === "county" && record.fips) {
    return geoIndex.countiesByFips.get(record.fips) || null;
  }

  return geoIndex.statesByCode.get(record.state) || null;
}

function getCrossroadFeatureKey(record) {
  if (record.brandLevel === "geo" && record.geoKey) return record.geoKey;
  if (record.brandLevel === "county" && record.fips) return record.fips;
  return record.state;
}

function resolveCrossroadPreviewLevel(filters, records) {
  const geoLevelFilters = Array.isArray(filters.geoLevels)
    ? filters.geoLevels
    : filters.geoLevel && filters.geoLevel !== "all types"
      ? [filters.geoLevel]
      : [];
  if (geoLevelFilters.length) {
    return geoLevelFilters.every((level) => level === "state" || level === "region")
      ? "state"
      : "geo";
  }

  const matching = records.filter((record) => presetMatchesRecord(record, filters));
  if (!matching.length) return "state";

  const brandLevels = [...new Set(matching.map((record) => record.brandLevel))];
  if (brandLevels.length === 1) {
    if (brandLevels[0] === "geo") return "geo";
    if (brandLevels[0] === "county") return "county";
    return "state";
  }

  const geoTypes = [...new Set(matching.map((record) => record.geoType).filter(Boolean))];
  if (geoTypes.length === 1 && geoTypes[0] !== "state") {
    return geoTypes[0] === "county" ? "county" : "geo";
  }

  return "state";
}

function resolveCrossroadPreviewFeature(record, geoIndex, previewLevel) {
  if (previewLevel === "state") {
    return geoIndex.statesByCode.get(record.state) || null;
  }

  return resolveCrossroadFeature(record, geoIndex);
}

function getCrossroadPreviewFeatureKey(record, previewLevel) {
  if (previewLevel === "state") return record.state;
  return getCrossroadFeatureKey(record);
}

function buildPresetMatchedFeatures(records, filters, geoIndex, previewLevel) {
  const matchedFeatures = new Map();

  records.forEach((record) => {
    if (!presetMatchesRecord(record, filters)) return;

    const feature = resolveCrossroadPreviewFeature(record, geoIndex, previewLevel);
    if (!feature?.geometry) return;

    const key = getCrossroadPreviewFeatureKey(record, previewLevel);
    const entry = matchedFeatures.get(key) || { feature, brandIds: new Set() };
    entry.brandIds.add(record.brandId);
    matchedFeatures.set(key, entry);
  });

  const entries = [...matchedFeatures.values()];
  const counts = entries.map((entry) => entry.brandIds.size);
  const lowestCount = counts.length ? Math.min(...counts) : 0;
  const highestCount = counts.length ? Math.max(...counts) : 0;
  const countRange = highestCount - lowestCount;

  entries.forEach((entry) => {
    const densityRatio = countRange > 0
      ? (entry.brandIds.size - lowestCount) / countRange
      : 0;
    entry.densityColor = interpolateCrossroadColor(
      CROSSROAD_DENSITY_LOW_COLOR,
      CROSSROAD_DENSITY_HIGH_COLOR,
      densityRatio
    );
    entry.densityOpacity = interpolateCrossroadValue(
      CROSSROAD_DENSITY_LOW_OPACITY,
      CROSSROAD_DENSITY_HIGH_OPACITY,
      densityRatio
    );
  });

  return matchedFeatures;
}

function computePresetStatusCounts(records, filters = {}) {
  const { statuses, ...filtersWithoutStatus } = filters;
  const matching = records.filter((record) => presetMatchesRecord(record, filtersWithoutStatus));

  return {
    total: matching.length,
    available: matching.filter((record) => record.status === "available").length,
    established: matching.filter((record) => record.status === "established").length,
    sold: matching.filter((record) => record.status === "sold").length
  };
}

function formatPresetCount(value) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "—";
}

function formatPresetStatusBreakdown(counts = {}) {
  return [
    `${formatPresetCount(counts.available)} Available`,
    `${formatPresetCount(counts.established)} For Sale`,
    `${formatPresetCount(counts.sold)} Sold`
  ].join(" · ");
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

function createPresetTile(preset, { baseMapUrl, fillUrl, bordersUrl, counts } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "target-card territory-crossroad__tile territory-crossroad__tile--preset";
  tile.dataset.presetId = preset.id;
  tile.dataset.scope = preset.scope || "private";
  tile.dataset.title = preset.title || "";

  const statusCounts = counts || {};
  const totalLabel = formatPresetCount(statusCounts.total);
  const breakdownLabel = formatPresetStatusBreakdown(statusCounts);
  tile.setAttribute(
    "aria-label",
    `Open ${preset.title} preset: ${totalLabel} territories (${breakdownLabel.replace(/ · /g, ", ")})`
  );

  const baseImg = baseMapUrl
    ? `<img class="target-map-img" src="${escapeHtml(baseMapUrl)}" alt="" loading="lazy">`
    : "";
  const fillImg = fillUrl
    ? `<img class="target-map-fill" src="${escapeHtml(fillUrl)}" alt="" aria-hidden="true">`
    : "";
  const bordersImg = bordersUrl
    ? `<img class="target-map-borders" src="${escapeHtml(bordersUrl)}" alt="" aria-hidden="true">`
    : "";

  tile.innerHTML = `
    <div class="target-map">${baseImg}${fillImg}${bordersImg}</div>
    <div class="target-card-title">${escapeHtml(preset.title)}</div>
    <div class="target-field target-prospects">
      <span class="target-label">Territories</span>
      <div class="target-prospects-row">
        <span class="target-number">${totalLabel}</span>
        <span class="target-chevron" aria-hidden="true">
          <img src="assets/chevron.svg" alt="">
        </span>
      </div>
    </div>
  `;

  return tile;
}

const CROSSROAD_WORKSPACE_HIDE_MS = 240;
const CROSSROAD_ENTER_STAGGER_MS = 65;
const CROSSROAD_ENTER_DURATION_MS = 320;

function canFocusTerritoryCrossroadSearchInput() {
  if (
    document.body.classList.contains("access-locked")
    && !document.documentElement.classList.contains("access-granted")
  ) {
    return false;
  }

  const crossroad = document.getElementById("territoryCrossroad");
  return Boolean(
    crossroad
    && !crossroad.hidden
    && document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open")
  );
}

function focusTerritoryCrossroadSearchInput() {
  if (!canFocusTerritoryCrossroadSearchInput()) return;
  document.getElementById("territoryCrossroadSearchInput")?.focus({ preventScroll: true });
}

function finishTerritoryCrossroadEnterAnimation(crossroad, items, { focusSearchOnComplete = false } = {}) {
  crossroad?.classList.remove("is-entering", "is-entering-active");
  items.forEach((item) => {
    item.classList.remove("territory-crossroad__animate-item");
    item.style.removeProperty("--enter-index");
  });

  if (focusSearchOnComplete) {
    focusTerritoryCrossroadSearchInput();
  }
}

function playTerritoryCrossroadEnterAnimation(crossroad, { focusSearchOnComplete = false } = {}) {
  if (!crossroad) return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = [
    crossroad.querySelector(".territory-crossroad__heading"),
    crossroad.querySelector(".territory-crossroad__search"),
    crossroad.querySelector(".territory-crossroad__popular")
  ].filter(Boolean);

  items.forEach((item, index) => {
    item.classList.add("territory-crossroad__animate-item");
    item.style.setProperty("--enter-index", String(index));
  });

  crossroad.classList.remove("is-entering-active");
  crossroad.classList.add("is-entering");

  if (motionQuery.matches) {
    crossroad.classList.add("is-entering-active");
    window.setTimeout(
      () => finishTerritoryCrossroadEnterAnimation(crossroad, items, { focusSearchOnComplete }),
      0
    );
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      crossroad.classList.add("is-entering-active");
    });
  });

  const totalMs = CROSSROAD_ENTER_DURATION_MS + Math.max(0, items.length - 1) * CROSSROAD_ENTER_STAGGER_MS;
  window.setTimeout(
    () => finishTerritoryCrossroadEnterAnimation(crossroad, items, { focusSearchOnComplete }),
    totalMs + 40
  );
}

function dismissTerritoryCrossroad() {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");

  window.territoryFilters?.setPanelOpen?.(true);
  shell?.classList.remove("is-crossroad-open", "is-crossroad-fullscreen", "is-crossroad-hiding-workspace");
  window.territoryMapPanel?.setOpen?.(true, { persist: false });
  window.territoryMapPanel?.syncToggleAvailability?.();
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

function resetTerritoryCrossroadSearch() {
  const input = document.getElementById("territoryCrossroadSearchInput");
  if (input) input.value = "";
  window.resetCrossroadLocationSuggestions?.();
  setCrossroadSearchFeedback();
}

function showTerritoryCrossroad({ animate = false } = {}) {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");

  if (!crossroad) return;

  window.territoryFilters?.setPanelOpen?.(false);
  resetTerritoryCrossroadSearch();
  window.territoryMapControls?.clearHover?.();
  crossroad.hidden = false;
  crossroad.classList.remove("is-leaving", "is-entering", "is-entering-active", "is-preparing-enter");
  shell?.classList.remove("is-crossroad-fullscreen", "is-crossroad-hiding-workspace");
  shell?.classList.add("is-crossroad-open");
  window.territoryCrossroadChoice = null;
  window.territoryMapPanel?.syncToggleAvailability?.();
  window.territoryMapControls?.updateResetVisibility?.();

  if (animate) {
    playTerritoryCrossroadEnterAnimation(crossroad, { focusSearchOnComplete: true });
  } else {
    requestAnimationFrame(() => {
      focusTerritoryCrossroadSearchInput();
    });
  }
}

function showTerritoryCrossroadAfterClearAll() {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");
  window.territoryFilters?.setPanelOpen?.(false);
  resetTerritoryCrossroadSearch();
  if (!shell || !crossroad) {
    showTerritoryCrossroad({ animate: true });
    return;
  }

  crossroad.hidden = true;
  crossroad.classList.remove("is-leaving", "is-entering", "is-entering-active");
  window.territoryCrossroadChoice = null;
  window.territoryMapControls?.clearHover?.();

  shell.classList.add("is-crossroad-hiding-workspace", "is-crossroad-open", "is-crossroad-fullscreen");
  window.territoryMapPanel?.syncToggleAvailability?.();
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
  window.territoryMapControls?.beginResultsLoading?.();
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
      if (choice.filters && Object.keys(choice.filters).length) {
        window.territoryFilters?.applyCrossroadPreset?.(choice.filters);
      }
      if (choice.locationSearch) {
        window.territoryFilters?.applyLocationSearchSelection?.(choice.locationSearch, {
          autoRadius: false
        });
      }
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
  // Leaving splash: keep only Location expanded, even when default filters apply.
  window.territoryFilters?.syncFilterSectionExpansion?.({ expandAppliedFilters: true });
  beginTerritoryMapLoad();
}

window.startTerritoryMapFromFilters = startTerritoryMapFromFilters;

function normalizeCrossroadLocationQuery(value) {
  return window.territoryLocationSearch?.normalizeQuery?.(value) || "";
}

function getCrossroadLocationOptions() {
  return window.territoryLocationSearch?.US_STATE_OPTIONS?.map(({ code, label }) => ({
    code,
    label
  })) || [];
}

function resolveCrossroadLocation(query) {
  return window.territoryLocationSearch?.resolveStateQuery?.(query);
}

async function fetchCrossroadLocationSuggestions(query, options = {}) {
  return window.territoryLocationSearch?.fetchSuggestions?.(query, options) || [];
}

function toCrossroadLocationResultFromState(stateMatch) {
  return window.territoryLocationSearch?.fromStateCode?.(stateMatch.code, stateMatch.label);
}

async function resolveCrossroadLocationSearch(query, selectedResult = null) {
  return window.territoryLocationSearch?.resolveSearch?.(query, selectedResult);
}

function focusCrossroadLocationResult(result) {
  if (!result) return;

  if (result.coordinates) {
    window.territoryMapControls?.focusTerritoryCoordinates?.(
      result.coordinates.longitude,
      result.coordinates.latitude
    );
    return;
  }

  if (result.stateCode) {
    window.territoryMapControls?.focusTerritoryState?.(result.stateCode);
  }
}

function startCrossroadLocationSearch(result) {
  if (!result?.coordinates && !result?.stateCode) return;

  chooseCrossroadOption({
    type: "new",
    filters: {},
    locationSearch: result
  });
  focusCrossroadLocationResult(result);
}

function setCrossroadSearchFeedback(message = "") {
  const feedback = document.getElementById("territoryCrossroadSearchFeedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.hidden = !message;
}

function getCrossroadBrandInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCrossroadBrandSuggestions(query) {
  const normalizedQuery = normalizeCrossroadLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  return crossroadTerritoryBrands
    .map((brand) => ({
      brandId: brand.id,
      filters: { franchises: [brand.id] },
      group: "Brands",
      label: brand.brand,
      logoFallback: getCrossroadBrandInitials(brand.brand),
      logoSrc: brand.logo || "",
      type: "brand"
    }))
    .map((item) => ({
      ...item,
      matchIndex: normalizeCrossroadLocationQuery(item.label).indexOf(normalizedQuery)
    }))
    .filter((item) => item.matchIndex !== -1)
    .sort((left, right) => left.matchIndex - right.matchIndex || left.label.localeCompare(right.label))
    .slice(0, CROSSROAD_SEARCH_SUGGESTION_GROUP_LIMIT);
}

function toCrossroadLocationSuggestion(result) {
  if (!result?.label) return null;

  return {
    group: "Locations",
    label: result.label,
    suggestionLabel: result.suggestionLabel || result.label,
    locationResult: result,
    type: "location"
  };
}

async function getCrossroadSearchSuggestions(query, { signal } = {}) {
  const brandSuggestions = getCrossroadBrandSuggestions(query);
  const remainingSlots = Math.max(0, CROSSROAD_SEARCH_SUGGESTION_LIMIT - brandSuggestions.length);
  if (!remainingSlots) return brandSuggestions;

  let locationResults = [];
  try {
    locationResults = await fetchCrossroadLocationSuggestions(query, { signal });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    locationResults = [];
  }

  const locationSuggestions = locationResults
    .map(toCrossroadLocationSuggestion)
    .filter(Boolean)
    .slice(0, Math.min(CROSSROAD_SEARCH_SUGGESTION_GROUP_LIMIT, remainingSlots));

  return [...brandSuggestions, ...locationSuggestions].slice(0, CROSSROAD_SEARCH_SUGGESTION_LIMIT);
}

const CROSSROAD_SEARCH_SUGGESTION_ICONS = {
  location: `<svg viewBox="0 0 16 20" focusable="false"><path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/></svg>`
};

function createCrossroadSuggestionIcon(item) {
  const icon = document.createElement("span");
  icon.className = "territory-crossroad__search-suggestion-icon";
  icon.setAttribute("aria-hidden", "true");

  if (item.logoSrc) {
    icon.classList.add("has-logo");

    const fallback = document.createElement("span");
    fallback.className = "territory-crossroad__search-suggestion-logo-fallback";
    fallback.textContent = item.logoFallback || "";

    const image = document.createElement("img");
    image.src = item.logoSrc;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.remove();
      icon.classList.add("is-logo-missing");
    });

    icon.append(fallback, image);
    return icon;
  }

  icon.innerHTML = CROSSROAD_SEARCH_SUGGESTION_ICONS[item.type] || CROSSROAD_SEARCH_SUGGESTION_ICONS.location;
  return icon;
}

function startCrossroadBrandSearch(item) {
  if (!item?.brandId) return;

  chooseCrossroadOption({
    type: "new",
    filters: item.filters || { franchises: [item.brandId] }
  });
}

let crossroadSearchFloatingTooltip = null;

function getCrossroadSearchFloatingTooltip() {
  if (!crossroadSearchFloatingTooltip) {
    crossroadSearchFloatingTooltip = document.createElement("div");
    crossroadSearchFloatingTooltip.className = "filter-combobox-floating-tooltip";
  }

  return crossroadSearchFloatingTooltip;
}

function positionCrossroadSearchFloatingTooltip(target) {
  const tooltipText = target.dataset.tooltip;
  if (!tooltipText) return;

  const tooltip = getCrossroadSearchFloatingTooltip();
  tooltip.textContent = tooltipText;

  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  window.fitTooltipToContent?.(tooltip);

  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 8;
  const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  const left = Math.min(
    Math.max(viewportPadding, centeredLeft),
    window.innerWidth - tooltipRect.width - viewportPadding
  );
  const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showCrossroadSearchFloatingTooltip(event) {
  positionCrossroadSearchFloatingTooltip(event.currentTarget);
  getCrossroadSearchFloatingTooltip().classList.add("is-visible");
}

function hideCrossroadSearchFloatingTooltip() {
  crossroadSearchFloatingTooltip?.classList.remove("is-visible");
}

function bindCrossroadSearchFloatingTooltip(button) {
  if (!button?.dataset.tooltip) return;

  button.addEventListener("mouseenter", showCrossroadSearchFloatingTooltip);
  button.addEventListener("mouseleave", hideCrossroadSearchFloatingTooltip);
  button.addEventListener("focus", showCrossroadSearchFloatingTooltip);
  button.addEventListener("blur", hideCrossroadSearchFloatingTooltip);
  button.addEventListener("click", hideCrossroadSearchFloatingTooltip);
}

function bindCrossroadLocationSearch() {
  const form = document.getElementById("territoryCrossroadSearch");
  const input = document.getElementById("territoryCrossroadSearchInput");
  const suggestions = document.getElementById("territoryCrossroadSearchSuggestions");
  const clearButton = document.getElementById("territoryCrossroadSearchClear");
  const locateButton = document.getElementById("territoryCrossroadLocate");
  if (!form || !input || !suggestions) return;

  let debounceTimer = null;
  let fetchController = null;
  let activeSuggestionIndex = -1;
  let renderedSuggestions = [];
  let selectedSuggestion = null;
  let isSubmitting = false;

  function setSuggestionsOpen(isOpen) {
    input.setAttribute("aria-expanded", String(isOpen));
    suggestions.setAttribute("aria-hidden", String(!isOpen));
    form.classList.toggle("is-suggestions-open", isOpen);
  }

  function closeSuggestions() {
    activeSuggestionIndex = -1;
    renderedSuggestions = [];
    suggestions.replaceChildren();
    input.removeAttribute("aria-activedescendant");
    setSuggestionsOpen(false);
  }

  function appendSuggestionHeading(label) {
    const heading = document.createElement("div");
    heading.className = "territory-crossroad__search-suggestion-heading";
    heading.textContent = label;
    suggestions.append(heading);
  }

  function syncSearchActions() {
    const hasQuery = input.value.trim().length > 0;
    if (clearButton) clearButton.hidden = !hasQuery;
    if (locateButton) locateButton.hidden = hasQuery;
  }

  function appendSuggestionButton(item, index) {
    const button = document.createElement("button");
    const icon = createCrossroadSuggestionIcon(item);
    const label = document.createElement("span");
    const action = document.createElement("span");
    const actionLabel = document.createElement("span");
    const actionKey = document.createElement("img");

    button.type = "button";
    button.className = "territory-crossroad__search-suggestion";
    button.id = `territoryCrossroadSearchSuggestion-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    const displayedLabel = item.suggestionLabel || item.label;
    button.setAttribute("aria-label", `Select ${displayedLabel}`);

    label.className = "territory-crossroad__search-suggestion-label";
    label.textContent = displayedLabel;

    action.className = "territory-crossroad__search-suggestion-action";
    action.setAttribute("aria-hidden", "true");
    actionLabel.textContent = "Select";
    actionKey.className = "territory-crossroad__search-suggestion-key";
    actionKey.src = "assets/enter.svg";
    actionKey.alt = "";
    action.append(actionLabel, actionKey);

    button.append(icon, label, action);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("mouseenter", () => {
      activeSuggestionIndex = index;
      syncActiveSuggestion();
    });
    button.addEventListener("click", () => {
      selectSuggestion(item, { submit: true });
    });
    suggestions.append(button);
  }

  function renderSuggestions(items) {
    renderedSuggestions = items;
    activeSuggestionIndex = items.length ? 0 : -1;
    suggestions.replaceChildren();

    if (!items.length) {
      appendSuggestionHeading("Suggestions");
      const status = document.createElement("div");
      status.className = "territory-crossroad__search-suggestion-status";
      status.textContent = "No brands or locations match.";
      suggestions.append(status);
      setSuggestionsOpen(true);
      return;
    }

    let currentGroup = "";
    items.forEach((item, index) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        appendSuggestionHeading(currentGroup);
      }
      appendSuggestionButton(item, index);
    });

    setSuggestionsOpen(true);
    syncActiveSuggestion();
  }

  function renderSearchingSuggestions(query) {
    const brandSuggestions = getCrossroadBrandSuggestions(query);
    if (brandSuggestions.length) {
      renderSuggestions(brandSuggestions);
      appendSuggestionHeading("Locations");
      const status = document.createElement("div");
      status.className = "territory-crossroad__search-suggestion-status";
      status.textContent = "Searching…";
      suggestions.append(status);
      return;
    }

    suggestions.replaceChildren();
    appendSuggestionHeading("Locations");
    const status = document.createElement("div");
    status.className = "territory-crossroad__search-suggestion-status";
    status.textContent = "Searching…";
    suggestions.append(status);
    setSuggestionsOpen(true);
  }

  function syncActiveSuggestion() {
    suggestions.querySelectorAll(".territory-crossroad__search-suggestion").forEach((button, index) => {
      const isActive = index === activeSuggestionIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const activeButton = suggestions.querySelector(".territory-crossroad__search-suggestion.is-active");
    if (activeButton) {
      input.setAttribute("aria-activedescendant", activeButton.id);
      activeButton.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function selectSuggestion(item, { submit = false } = {}) {
    selectedSuggestion = item;
    input.value = item.label;
    syncSearchActions();
    closeSuggestions();
    setCrossroadSearchFeedback();

    if (!submit) return;

    if (item.type === "brand") {
      startCrossroadBrandSearch(item);
      return;
    }

    void submitCrossroadLocationSearch(item.locationResult || item);
  }

  async function requestSuggestions(query) {
    fetchController?.abort();
    fetchController = new AbortController();

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      closeSuggestions();
      return;
    }

    renderSearchingSuggestions(trimmedQuery);

    try {
      const items = await getCrossroadSearchSuggestions(trimmedQuery, {
        signal: fetchController.signal
      });
      if (input.value.trim() !== trimmedQuery) return;
      renderSuggestions(items);
    } catch (error) {
      if (error?.name === "AbortError") return;
      closeSuggestions();
    }
  }

  function scheduleSuggestions(query) {
    window.clearTimeout(debounceTimer);
    selectedSuggestion = null;

    if (!query.trim()) {
      closeSuggestions();
      setCrossroadSearchFeedback();
      return;
    }

    debounceTimer = window.setTimeout(() => {
      void requestSuggestions(query);
    }, 250);
  }

  async function submitCrossroadLocationSearch(forcedResult = null) {
    if (isSubmitting) return;
    isSubmitting = true;

    try {
      const query = input.value;
      if (!query.trim()) {
        setCrossroadSearchFeedback("Enter a brand, city, county, CBSA, or state to begin.");
        input.focus();
        return;
      }

      const locationResult = forcedResult?.locationResult || forcedResult;
      const result = await resolveCrossroadLocationSearch(query, locationResult || selectedSuggestion?.locationResult);
      if (!result) {
        setCrossroadSearchFeedback("Choose a matching brand or U.S. location from the suggestions.");
        input.focus();
        return;
      }

      setCrossroadSearchFeedback();
      input.value = result.label;
      syncSearchActions();
      selectedSuggestion = toCrossroadLocationSuggestion(result);
      closeSuggestions();
      startCrossroadLocationSearch(result);
    } finally {
      isSubmitting = false;
    }
  }

  async function submitCrossroadSearch() {
    const query = input.value.trim();
    if (!query) {
      setCrossroadSearchFeedback("Enter a brand, city, county, CBSA, or state to begin.");
      input.focus();
      return;
    }

    const brandMatch = getCrossroadBrandSuggestions(query)[0];
    if (brandMatch && normalizeCrossroadLocationQuery(brandMatch.label) === normalizeCrossroadLocationQuery(query)) {
      selectSuggestion(brandMatch, { submit: true });
      return;
    }

    const locationResult = await resolveCrossroadLocationSearch(query);
    if (locationResult) {
      selectSuggestion(toCrossroadLocationSuggestion(locationResult), { submit: true });
      return;
    }

    if (brandMatch) {
      selectSuggestion(brandMatch, { submit: true });
      return;
    }

    setCrossroadSearchFeedback("Choose a matching brand or U.S. location from the suggestions.");
    input.focus();
  }

  input.addEventListener("input", () => {
    if (selectedSuggestion && input.value !== selectedSuggestion.label) {
      selectedSuggestion = null;
    }
    setCrossroadSearchFeedback();
    syncSearchActions();
    scheduleSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (renderedSuggestions.length) {
      setSuggestionsOpen(true);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, renderedSuggestions.length - 1);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "ArrowUp") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(renderedSuggestions[activeSuggestionIndex], { submit: true });
      return;
    }

    if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!form.contains(document.activeElement)) {
        closeSuggestions();
      }
    }, 0);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitCrossroadSearch();
  });

  document.addEventListener("mousedown", (event) => {
    if (!form.contains(event.target)) {
      closeSuggestions();
    }
  });

  clearButton?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  clearButton?.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    fetchController?.abort();
    selectedSuggestion = null;
    input.value = "";
    closeSuggestions();
    setCrossroadSearchFeedback();
    syncSearchActions();
    input.focus();
  });

  locateButton?.addEventListener("click", () => {
    closeSuggestions();
    setCrossroadSearchFeedback();

    if (!navigator.geolocation) {
      setCrossroadSearchFeedback("Location access is unavailable in this browser.");
      return;
    }

    chooseCrossroadOption({ type: "new", filters: {} });
    window.territoryMapControls?.triggerTerritoryGeolocation?.();
  });

  syncSearchActions();

  bindCrossroadSearchFloatingTooltip(clearButton);
  bindCrossroadSearchFloatingTooltip(locateButton);

  window.resetCrossroadLocationSuggestions = () => {
    selectedSuggestion = null;
    closeSuggestions();
    syncSearchActions();
  };
}

function bindCrossroadPresetTabs() {
  const tabs = Array.from(document.querySelectorAll(".territory-crossroad__popular .scope-tab"));
  const searchInput = document.getElementById("territoryCrossroadPresetSearch");
  const searchClear = document.getElementById("territoryCrossroadPresetSearchClear");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((other) => other.classList.toggle("is-active", other === tab));
      crossroadPresetActiveScope = tab.dataset.scope || "all";
      applyCrossroadPresetVisibility();
    });
  });

  if (searchInput) {
    const searchField = searchInput.closest(".scope-search");

    searchInput.addEventListener("input", () => {
      crossroadPresetSearchTerm = searchInput.value;
      searchField?.classList.toggle("is-active-search", Boolean(crossroadPresetSearchTerm.trim()));
      if (searchClear) {
        searchClear.hidden = !crossroadPresetSearchTerm.trim();
      }
      applyCrossroadPresetVisibility();
    });

    if (searchClear) {
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.focus();
      });
    }
  }
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
    const data = await window.territoryDataCache.load();
    crossroadTerritoryBrands = data?.brands || [];
    return data;
  }

  const activeDataset = window.territoryDatasets.getActive();
  const [statesGeojson, ...brands] = await Promise.all([
    fetchCrossroadJson(CROSSROAD_STATES_URL),
    ...activeDataset.brandFiles.map((file) => fetchCrossroadJson(`data/${file}`))
  ]);
  const needsCounties = brands.some(isCrossroadCountyLevelBrand);
  const needsGeoFeatures = brands.some(isCrossroadGeoLevelBrand);
  const [countiesGeojson, geoFeaturesGeojson] = await Promise.all([
    needsCounties ? fetchCrossroadJson(CROSSROAD_COUNTIES_URL) : null,
    needsGeoFeatures ? fetchCrossroadJson(CROSSROAD_GEO_FEATURES_URL) : null
  ]);

  crossroadTerritoryBrands = brands;
  return { statesGeojson, countiesGeojson, geoFeaturesGeojson, brands };
}

function revealTerritoryCrossroadEnter(crossroad) {
  if (!crossroad) return;

  crossroad.classList.remove("is-preparing-enter");
  playTerritoryCrossroadEnterAnimation(crossroad, { focusSearchOnComplete: true });
}

let crossroadPresetRenderVersion = 0;
let crossroadPresetActiveScope = "all";
let crossroadPresetSearchTerm = "";

function applyCrossroadPresetVisibility() {
  const grid = document.getElementById("territoryCrossroadGrid");
  const emptyState = document.getElementById("territoryCrossroadPopularEmpty");
  if (!grid) return;

  const term = crossroadPresetSearchTerm.trim().toLowerCase();
  let visibleCount = 0;

  grid.querySelectorAll("[data-preset-id]").forEach((tile) => {
    const scope = tile.dataset.scope || "private";
    const title = (tile.dataset.title || "").toLowerCase();
    const matchesScope = crossroadPresetActiveScope === "all" || scope === crossroadPresetActiveScope;
    const matchesSearch = !term || title.includes(term);
    const isVisible = matchesScope && matchesSearch;

    tile.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
}

function clearCrossroadPresetTiles(grid) {
  grid.querySelectorAll("[data-preset-id]").forEach((tile) => tile.remove());
}

async function renderCrossroadPresetTiles() {
  const grid = document.getElementById("territoryCrossroadGrid");
  if (!grid) return;

  const renderVersion = ++crossroadPresetRenderVersion;
  const activeDataset = window.territoryDatasets.getActive();
  const presets = activeDataset.presets || [];
  clearCrossroadPresetTiles(grid);

  try {
    const { statesGeojson, countiesGeojson, geoFeaturesGeojson, brands } = await loadCrossroadTerritoryData();
    if (
      renderVersion !== crossroadPresetRenderVersion
      || activeDataset.id !== window.territoryDatasets.getActive().id
    ) {
      return;
    }

    const geoIndex = buildCrossroadGeoIndex(statesGeojson, countiesGeojson, geoFeaturesGeojson);
    const records = buildCrossroadRecords(brands);

    window.territoryFilters?.hydrateOptions?.(brands, { replace: true });

    presets.forEach((preset) => {
      const filters = preset.filters || {};
      const previewLevel = resolveCrossroadPreviewLevel(filters, records);
      const matchedFeatures = buildPresetMatchedFeatures(
        records,
        filters,
        geoIndex,
        previewLevel
      );
      const snapshotView = resolveCrossroadSnapshotView(filters, matchedFeatures, geoIndex);
      const baseMapUrl = buildBaseMapUrl(snapshotView);

      let fillUrl = "";
      let bordersUrl = "";
      try {
        fillUrl = buildFillDataUrl(geoIndex, matchedFeatures, previewLevel, snapshotView);
        bordersUrl = buildBordersDataUrl(matchedFeatures, previewLevel, snapshotView);
      } catch (error) {
        console.warn("Unable to render territory preview.", error);
      }

      const tile = createPresetTile(preset, {
        baseMapUrl,
        fillUrl,
        bordersUrl,
        counts: computePresetStatusCounts(records, filters)
      });
      bindPresetTile(tile, preset);
      grid.append(tile);
    });
  } catch (error) {
    if (
      renderVersion !== crossroadPresetRenderVersion
      || activeDataset.id !== window.territoryDatasets.getActive().id
    ) {
      return;
    }

    console.warn("Unable to build territory crossroad previews.", error);
    presets.forEach((preset) => {
      const tile = createPresetTile(preset);
      bindPresetTile(tile, preset);
      grid.append(tile);
    });
  }

  applyCrossroadPresetVisibility();
}

function consumeTerritorySkipCrossroad() {
  try {
    const shouldSkip = window.sessionStorage?.getItem(TERRITORY_SKIP_CROSSROAD_KEY) === "true";
    window.sessionStorage?.removeItem(TERRITORY_SKIP_CROSSROAD_KEY);
    return shouldSkip;
  } catch (error) {
    console.warn("Unable to restore the territory map view after switching datasets.", error);
    return false;
  }
}

async function initTerritoryCrossroad() {
  bindCrossroadLocationSearch();
  bindCrossroadPresetTabs();

  const grid = document.getElementById("territoryCrossroadGrid");
  const crossroad = document.getElementById("territoryCrossroad");
  if (!grid) return;

  const shouldSkipCrossroad = consumeTerritorySkipCrossroad();
  const shouldRevealOnLoad = Boolean(
    !shouldSkipCrossroad
    &&
    crossroad
    && !crossroad.hidden
    && document.querySelector(".territory-shell.is-crossroad-open")
    && !window.__territoryMapStarted
  );

  if (shouldRevealOnLoad) {
    crossroad.classList.add("is-preparing-enter");
  }

  await renderCrossroadPresetTiles();

  if (shouldSkipCrossroad && !window.__territoryMapStarted) {
    chooseCrossroadOption({ type: "new", filters: {} });
    return;
  }

  if (window.WefranchReload?.isHardReload) {
    resetTerritoryCrossroadSearch?.();
    if (shouldRevealOnLoad) {
      revealTerritoryCrossroadEnter(crossroad);
    } else if (crossroad) {
      crossroad.classList.remove("is-preparing-enter");
    }
    return;
  }

  if (shouldRevealOnLoad) {
    revealTerritoryCrossroadEnter(crossroad);
  } else if (crossroad) {
    crossroad.classList.remove("is-preparing-enter");
  }

  if (!window.__territoryMapStarted && window.territoryFilters?.hasNarrowingFilters?.()) {
    startTerritoryMapFromFilters();
  }
}

window.addEventListener("territorydatasetchange", () => {
  if (!window.__territoryMapStarted) {
    renderCrossroadPresetTiles();
  }
});

initTerritoryCrossroad();
