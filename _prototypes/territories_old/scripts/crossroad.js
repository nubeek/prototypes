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

// Territory preview overlays for splash preset cards: solid fills plus crisp
// borders (blended territories are intentionally disabled for previews).
const CROSSROAD_BLEND_EXCLUDED_STATES = new Set(["AK", "HI"]);
const CROSSROAD_BORDER_OPACITY = 0.7;
const CROSSROAD_PREVIEW_STYLES = {
  state: { borderWidth: 3.5 },
  county: { borderWidth: 1.5 },
  geo: { borderWidth: 1 }
};

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
  return Boolean(stateCode && CROSSROAD_BLEND_EXCLUDED_STATES.has(stateCode));
}

function buildFillDataUrl(geoIndex, matchedFeatures, previewLevel = "state", view = CROSSROAD_DEFAULT_VIEW) {
  const projection = createSnapshotProjection(view);
  const { project, canvasWidth, canvasHeight, view: snapshotView } = projection;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = canvasWidth;
  fillCanvas.height = canvasHeight;
  const fillContext = fillCanvas.getContext("2d");

  let drewAny = false;

  matchedFeatures.forEach(({ feature, colors }) => {
    if (shouldExcludeCrossroadFeature(feature, previewLevel)) return;
    if (!feature?.geometry || !colors.length) return;

    fillContext.beginPath();
    traceGeometry(fillContext, feature.geometry, project);

    if (colors.length === 1) {
      fillContext.fillStyle = colors[0];
    } else {
      const { west, east } = getGeometryLngBounds(feature.geometry);
      const startX = project(west, snapshotView.center[1])[0];
      const endX = project(east, snapshotView.center[1])[0];
      const gradient = fillContext.createLinearGradient(startX, 0, endX, 0);
      colors.forEach((color, index) => {
        gradient.addColorStop(colors.length > 1 ? index / (colors.length - 1) : 0, color);
      });
      fillContext.fillStyle = gradient;
    }

    fillContext.fill("evenodd");
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

// Draws matched territory outlines as crisp brand-colored strokes on a transparent
// layer so borders read clearly on top of the solid fills.
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
  context.globalAlpha = CROSSROAD_BORDER_OPACITY;

  let drewAny = false;

  matchedFeatures.forEach(({ feature, colors }) => {
    if (shouldExcludeCrossroadFeature(feature, previewLevel)) return;
    const color = colors[0];
    if (!feature?.geometry || !color) return;

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

function getCrossroadGeoLevelFilters(filters = {}) {
  if (Array.isArray(filters.geoLevels)) {
    return filters.geoLevels.filter(Boolean);
  }

  if (filters.geoLevel && filters.geoLevel !== "all types") {
    return [filters.geoLevel];
  }

  return [];
}

function presetMatchesRecord(record, filters = {}) {
  const categories = filters.categories || [];
  const statuses = filters.statuses || [];
  const franchises = filters.franchises || [];
  const locations = filters.locations || [];
  const locationsExcluded = filters.locationsExcluded || [];
  const geoLevels = getCrossroadGeoLevelFilters(filters);
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
    color: brand.color,
    category: brand.category || "",
    state: territory.state,
    geoKey: territory.geoKey || null,
    fips: territory.fips || null,
    geoType: territory.geoType || null,
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
  const geoLevels = getCrossroadGeoLevelFilters(filters);
  if (geoLevels.length === 1) {
    const geoLevelFilter = geoLevels[0];
    return geoLevelFilter === "region" ? "state" : "geo";
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
    const entry = matchedFeatures.get(key) || { feature, colors: [] };
    if (record.color && !entry.colors.includes(record.color)) {
      entry.colors.push(record.color);
    }
    matchedFeatures.set(key, entry);
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
    <div class="target-card-title">${escapeHtml(preset.title)}</div>
    <div class="target-map">${baseImg}${fillImg}${bordersImg}</div>
    <div class="target-field target-prospects">
      <span class="target-label">Territories</span>
      <div class="target-prospects-row">
        <span class="target-number">${totalLabel}</span>
        <img class="target-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
      </div>
      <p class="target-status-breakdown">${escapeHtml(breakdownLabel)}</p>
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
  shell?.classList.remove("is-crossroad-fullscreen", "is-crossroad-hiding-workspace");
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
  // Leaving splash: expand sections that have applied filters (e.g. Territory
  // status "Available"), while keeping untouched sections collapsed.
  window.territoryFilters?.syncFilterSectionExpansion?.();
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
    return window.territoryDataCache.load();
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

  return { statesGeojson, countiesGeojson, geoFeaturesGeojson, brands };
}

function revealTerritoryCrossroadEnter(crossroad) {
  if (!crossroad) return;

  crossroad.classList.remove("is-preparing-enter");
  playTerritoryCrossroadEnterAnimation(crossroad);
}

let crossroadPresetRenderVersion = 0;

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
  bindNewSearchTile();

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

  if (shouldRevealOnLoad) {
    revealTerritoryCrossroadEnter(crossroad);
  } else if (crossroad) {
    crossroad.classList.remove("is-preparing-enter");
  }

  if (!window.__territoryMapStarted && (window.territoryFilters?.getAppliedFilterCount?.() || 0) > 0) {
    startTerritoryMapFromFilters();
  }
}

window.addEventListener("territorydatasetchange", () => {
  if (!window.__territoryMapStarted) {
    renderCrossroadPresetTiles();
  }
});

initTerritoryCrossroad();
