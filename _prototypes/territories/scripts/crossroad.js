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
const CROSSROAD_MAX_LOCAL_ZOOM = 9;
const CROSSROAD_SEARCH_SUGGESTION_GROUP_LIMIT = 3;
const CROSSROAD_SEARCH_SUGGESTION_LIMIT = 9;

let crossroadTerritoryBrands = [];

// Territory preview overlays for splash preset cards. Fills and borders follow
// the live Colors / Borders theme so we don't bake every combination ahead of time.
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
const CROSSROAD_ACCENT_FILL_OPACITY = 0.42;
const CROSSROAD_PASTEL_FILL_OPACITY = 0.38;
const CROSSROAD_PASTEL_FILL_OPACITY_MID = 0.48;
const CROSSROAD_PASTEL_FILL_OPACITY_HIGH = 0.58;
const CROSSROAD_PASTEL_WHITE_FILL_OPACITY = 0.5;
const CROSSROAD_PASTEL_WHITE_FILL_OPACITY_MID = 0.4;
const CROSSROAD_PASTEL_WHITE_FILL_OPACITY_HIGH = 0.3;
const CROSSROAD_ACCENT_LINE_OPACITY = 0.72;
const CROSSROAD_PASTEL_LINE_OPACITY = 0.8;
const CROSSROAD_WHITE_LINE_OPACITY = 0.88;
const CROSSROAD_WHITE_BORDER_COLOR = "#ffffff";
const CROSSROAD_DEFAULT_THEME = {
  colorMode: "pastel",
  borders: true,
  borderColor: "default"
};
const CROSSROAD_SHAPE_MAX_VISIBLE = 5;

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

const CROSSROAD_EXCLUDED_ISLAND_BOUNDS = [
  { west: -123.20, east: -122.90, south: 37.62, north: 37.85 }
];

function crossroadPolygonBoundsAreInsideBox(rings, box) {
  const outer = rings?.[0];
  if (!outer?.length) return false;

  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  outer.forEach(([lng, lat]) => {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  });

  return west >= box.west && east <= box.east && south >= box.south && north <= box.north;
}

function stripCrossroadExcludedIslandPolygons(geometry) {
  const polygons = crossroadCollectPolygons(geometry);
  if (polygons.length < 2) return geometry;

  const kept = polygons.filter((rings) => (
    !CROSSROAD_EXCLUDED_ISLAND_BOUNDS.some((box) => (
      crossroadPolygonBoundsAreInsideBox(rings, box)
    ))
  ));
  if (kept.length === polygons.length || !kept.length) return geometry;

  return kept.length === 1
    ? { type: "Polygon", coordinates: kept[0] }
    : { type: "MultiPolygon", coordinates: kept };
}

function sanitizeCrossroadFeature(feature) {
  if (!feature?.geometry) return feature;

  const geometry = stripCrossroadExcludedIslandPolygons(feature.geometry);
  return geometry === feature.geometry ? feature : { ...feature, geometry };
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

function computeRegionalSnapshotView(bounds, padding = CROSSROAD_REGIONAL_PADDING, { maxZoom = CROSSROAD_MAX_REGIONAL_ZOOM } = {}) {
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
      Math.min(maxZoom, computeZoomForBounds(west, south, east, north) - CROSSROAD_REGIONAL_ZOOM_OUT)
    )
  };
}

function getCrossroadLocationSearches(filters = {}) {
  return window.territoryFilters?.hydrateLocationSearches?.(filters) || [];
}

function deriveCrossroadSearchBounds(searches = [], miles = 50) {
  return searches.reduce((bounds, location) => {
    if (location?.excluded || !location?.coordinates) return bounds;
    const nextBounds = window.territoryMapControls?.getSearchViewportBounds?.(
      location.coordinates.longitude,
      location.coordinates.latitude,
      miles
    );
    return mergeBounds(bounds, nextBounds);
  }, null);
}

function getCrossroadViewportBounds(filters = {}) {
  if (filters.radius?.enabled) return null;

  const savedViewport = window.territoryFilters?.normalizeViewportBounds?.(filters.viewport);
  if (savedViewport) return savedViewport;

  const includedSearches = getCrossroadLocationSearches(filters).filter((location) => !location.excluded);
  return deriveCrossroadSearchBounds(includedSearches);
}

function getCrossroadRadiusBounds(filters = {}) {
  if (!filters.radius?.enabled) return null;

  const includedSearches = getCrossroadLocationSearches(filters).filter((location) => !location.excluded);
  return deriveCrossroadSearchBounds(includedSearches, Number(filters.radius.miles) || 50);
}

function hasRegionalLocationFilter(filters = {}) {
  if (getCrossroadViewportBounds(filters) || getCrossroadRadiusBounds(filters)) return true;

  const locations = filters.locations || [];
  return locations.length > 0 && locations.length <= CROSSROAD_MAX_REGIONAL_LOCATION_COUNT;
}

function resolveCrossroadSnapshotView(filters = {}, matchedFeatures, geoIndex) {
  const localBounds = getCrossroadViewportBounds(filters) || getCrossroadRadiusBounds(filters);
  if (localBounds) {
    return computeRegionalSnapshotView(localBounds, CROSSROAD_REGIONAL_PADDING, {
      maxZoom: CROSSROAD_MAX_LOCAL_ZOOM
    });
  }

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

function getCrossroadTheme() {
  const theme = window.territoryFilters?.getVisualizationTheme?.();
  if (!theme) return { ...CROSSROAD_DEFAULT_THEME };

  return {
    colorMode: theme.colorMode === "accent" || theme.colorMode === "pastel"
      ? theme.colorMode
      : "density",
    borders: theme.borders !== false,
    borderColor: theme.borderColor === "white" ? "white" : "default"
  };
}

function getCrossroadBrand(brandId) {
  if (!brandId) return null;
  return crossroadTerritoryBrands.find((brand) => brand.id === brandId) || null;
}

function getCrossroadShapeMaxVisible() {
  return window.territoryMapControls?.getTerritoryShapeMaxVisible?.() || CROSSROAD_SHAPE_MAX_VISIBLE;
}

function getCrossroadShapeOccupants(brandIds) {
  if (!brandIds?.size) return [];

  const ordered = [];
  const seen = new Set();
  const maxVisible = getCrossroadShapeMaxVisible();

  crossroadTerritoryBrands.forEach((brand) => {
    if (!brandIds.has(brand.id) || seen.has(brand.id)) return;
    seen.add(brand.id);
    ordered.push(brand.id);
  });

  brandIds.forEach((brandId) => {
    if (seen.has(brandId)) return;
    seen.add(brandId);
    ordered.push(brandId);
  });

  return ordered.slice(0, maxVisible);
}

function getCrossroadPreviewFillColor(brand, colorMode) {
  return window.territoryMapControls?.getTerritoryPreviewBrandFillColor?.(brand, colorMode)
    || brand?.color
    || null;
}

function getCrossroadPreviewLineColor(brand, colorMode, borderColor) {
  if (borderColor === "white") return CROSSROAD_WHITE_BORDER_COLOR;
  return window.territoryMapControls?.getTerritoryPreviewBrandLineColor?.(brand, colorMode, borderColor)
    || brand?.color
    || CROSSROAD_DENSITY_BORDER_COLOR;
}

function getCrossroadPreviewFillOpacity(colorMode, occupantCount, borderColor) {
  // Splash cards are tiny, so these stay stronger than the live map's 0.15 fills.
  if (colorMode === "pastel") {
    if (borderColor === "white") {
      if (occupantCount >= 3) return CROSSROAD_PASTEL_WHITE_FILL_OPACITY_HIGH;
      if (occupantCount >= 2) return CROSSROAD_PASTEL_WHITE_FILL_OPACITY_MID;
      return CROSSROAD_PASTEL_WHITE_FILL_OPACITY;
    }
    if (occupantCount >= 20) return CROSSROAD_PASTEL_FILL_OPACITY_HIGH;
    if (occupantCount >= 6) return CROSSROAD_PASTEL_FILL_OPACITY_MID;
    return CROSSROAD_PASTEL_FILL_OPACITY;
  }
  return CROSSROAD_ACCENT_FILL_OPACITY;
}

function getCrossroadPreviewLineOpacity(colorMode, borderColor) {
  const opacity = window.territoryMapControls?.getTerritoryPreviewLineOpacity?.(colorMode, borderColor);
  if (Number.isFinite(opacity)) return opacity;
  if (borderColor === "white") return CROSSROAD_WHITE_LINE_OPACITY;
  if (colorMode === "pastel") return CROSSROAD_PASTEL_LINE_OPACITY;
  if (colorMode === "accent") return CROSSROAD_ACCENT_LINE_OPACITY;
  return CROSSROAD_DENSITY_BORDER_OPACITY;
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

function buildFillDataUrl(
  geoIndex,
  matchedFeatures,
  previewLevel = "state",
  view = CROSSROAD_DEFAULT_VIEW,
  theme = CROSSROAD_DEFAULT_THEME
) {
  const projection = createSnapshotProjection(view);
  const { project, canvasWidth, canvasHeight } = projection;
  const colorMode = theme.colorMode || "density";

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = canvasWidth;
  fillCanvas.height = canvasHeight;
  const fillContext = fillCanvas.getContext("2d");

  let drewAny = false;

  matchedFeatures.forEach((entry) => {
    const { feature } = entry;
    const entryLevel = entry.previewLevel || previewLevel;
    if (shouldExcludeCrossroadFeature(feature, entryLevel)) return;
    if (!feature?.geometry) return;

    if (colorMode === "density") {
      if (!entry.densityColor) return;
      fillContext.beginPath();
      traceGeometry(fillContext, feature.geometry, project);
      fillContext.fillStyle = entry.densityColor;
      fillContext.globalAlpha = entry.densityOpacity;
      fillContext.fill("evenodd");
      fillContext.globalAlpha = 1;
      drewAny = true;
      return;
    }

    const occupantCount = entry.brandIds?.size || 0;
    const fillOpacity = getCrossroadPreviewFillOpacity(
      colorMode,
      occupantCount,
      theme.borderColor
    );
    getCrossroadShapeOccupants(entry.brandIds).forEach((brandId) => {
      const fillColor = getCrossroadPreviewFillColor(getCrossroadBrand(brandId), colorMode);
      if (!fillColor) return;

      fillContext.beginPath();
      traceGeometry(fillContext, feature.geometry, project);
      fillContext.fillStyle = fillColor;
      fillContext.globalAlpha = fillOpacity;
      fillContext.fill("evenodd");
      fillContext.globalAlpha = 1;
      drewAny = true;
    });
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

// Draws matched territory outlines on a transparent layer so borders stay
// crisp on top of the fills. Color follows the live Borders / Colors theme.
function buildBordersDataUrl(
  matchedFeatures,
  previewLevel = "state",
  view = CROSSROAD_DEFAULT_VIEW,
  theme = CROSSROAD_DEFAULT_THEME
) {
  if (theme.borders === false) return "";

  const { project, canvasWidth, canvasHeight } = createSnapshotProjection(view);
  const colorMode = theme.colorMode || "density";
  const borderColor = theme.borderColor || "default";

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  context.lineJoin = "round";
  context.lineCap = "round";

  let drewAny = false;

  matchedFeatures.forEach((entry) => {
    const { feature } = entry;
    const entryLevel = entry.previewLevel || previewLevel;
    if (shouldExcludeCrossroadFeature(feature, entryLevel)) return;
    if (!feature?.geometry) return;

    let strokeStyle = CROSSROAD_DENSITY_BORDER_COLOR;
    let strokeOpacity = CROSSROAD_DENSITY_BORDER_OPACITY;

    if (borderColor === "white") {
      strokeStyle = CROSSROAD_WHITE_BORDER_COLOR;
      strokeOpacity = getCrossroadPreviewLineOpacity(colorMode, borderColor);
    } else if (colorMode !== "density") {
      const topBrand = getCrossroadBrand(getCrossroadShapeOccupants(entry.brandIds)[0]);
      strokeStyle = getCrossroadPreviewLineColor(topBrand, colorMode, borderColor);
      strokeOpacity = getCrossroadPreviewLineOpacity(colorMode, borderColor);
    }

    context.lineWidth = getCrossroadPreviewStyle(entryLevel).borderWidth;
    context.globalAlpha = strokeOpacity;
    context.beginPath();
    traceGeometry(context, feature.geometry, project);
    context.strokeStyle = strokeStyle;
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

function withCrossroadRecordGeometry(record, geoIndex) {
  if (!geoIndex || record.geometry) return record;

  const feature = resolveCrossroadFeature(record, geoIndex);
  if (!feature?.geometry) return record;

  record.geometry = feature.geometry;
  record.geometryBounds = getCrossroadGeometryBounds(feature.geometry);
  return record;
}

function createCrossroadMatchContext(filters = {}, geoIndex = null) {
  const searches = getCrossroadLocationSearches(filters);
  const includedSearches = searches.filter((location) => !location.excluded);
  const excludedSearches = searches.filter((location) => location.excluded);
  const resolveTarget = (location) => {
    if (window.territoryMapFilters?.resolveLocationTarget) {
      return window.territoryMapFilters.resolveLocationTarget(location);
    }

    return location?.stateCode
      ? { kind: "state", stateCode: location.stateCode }
      : null;
  };
  const locationTargets = includedSearches.map(resolveTarget).filter(Boolean);
  const excludedTargets = excludedSearches.map(resolveTarget).filter(Boolean);
  const radiusCenters = includedSearches
    .filter((location) => location.coordinates)
    .map((location) => ({
      state: location.stateCode,
      center: [location.coordinates.longitude, location.coordinates.latitude]
    }));
  const radiusEnabled = Boolean(filters.radius?.enabled) && radiusCenters.length > 0;
  const viewport = radiusEnabled ? null : getCrossroadViewportBounds(filters);

  return {
    geoIndex,
    excludedTargets,
    locationTargets,
    locationCache: new Map(),
    hasLocationConstraint: locationTargets.length > 0,
    viewportContext: viewport
      ? window.territoryMapFilters?.createViewportMatchContext?.(viewport)
      : null,
    radiusContext: radiusEnabled
      ? window.territoryMapFilters?.createRadiusMatchContext?.(
          radiusCenters,
          filters.radius.miles
        )
      : null
  };
}

function recordMatchesCrossroadLocation(record, target, context) {
  if (!target) return false;
  if (target.kind === "state") return record.state === target.stateCode;

  const geoRecord = withCrossroadRecordGeometry(record, context.geoIndex);
  return Boolean(
    window.territoryMapFilters?.recordMatchesLocationTarget?.(
      geoRecord,
      target,
      context.locationCache
    )
  );
}

function presetMatchesRecord(record, filters = {}, context = null) {
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
  const matchContext = context || createCrossroadMatchContext(filters, null);

  if (categories.length && !categories.includes(record.category)) return false;
  if (statuses.length && !statuses.includes(record.status)) return false;
  if (franchises.length && !franchises.includes(record.brandId)) return false;
  if (geoLevels.length && !geoLevels.includes(record.geoType)) return false;

  if (matchContext.excludedTargets.some((target) => (
    recordMatchesCrossroadLocation(record, target, matchContext)
  ))) {
    return false;
  }

  if (matchContext.viewportContext) {
    const geoRecord = withCrossroadRecordGeometry(record, matchContext.geoIndex);
    if (!window.territoryMapFilters?.recordIntersectsViewport?.(geoRecord, matchContext.viewportContext)) {
      return false;
    }
  } else if (matchContext.radiusContext) {
    const geoRecord = withCrossroadRecordGeometry(record, matchContext.geoIndex);
    if (!window.territoryMapFilters?.recordIntersectsRadius?.(geoRecord, matchContext.radiusContext)) {
      return false;
    }
  } else if (matchContext.hasLocationConstraint) {
    const matchesLocation = matchContext.locationTargets.some((target) => (
      recordMatchesCrossroadLocation(record, target, matchContext)
    ));
    if (!matchesLocation) return false;
  } else {
    if (locations.length && !locations.includes(record.state)) return false;
    if (locationsExcluded.length && locationsExcluded.includes(record.state)) return false;
  }

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
      (statesGeojson?.features || []).map((feature) => [
        feature.properties?.code,
        sanitizeCrossroadFeature(feature)
      ])
    ),
    countiesByFips: new Map(
      (countiesGeojson?.features || []).map((feature) => [
        feature.properties?.fips,
        sanitizeCrossroadFeature(feature)
      ])
    ),
    geoFeaturesByKey: new Map(
      (geoFeaturesGeojson?.features || []).map((feature) => [
        feature.properties?.geoKey,
        sanitizeCrossroadFeature(feature)
      ])
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

function resolveCrossroadPreviewLevel(filters, records, geoIndex) {
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

  const context = createCrossroadMatchContext(filters, geoIndex);
  const matching = records.filter((record) => presetMatchesRecord(record, filters, context));
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

function isCrossroadStateLevelRecord(record) {
  const geoType = String(record?.geoType || "").toLowerCase();
  if (geoType === "region" || geoType === "state") return true;
  if (record?.brandLevel === "county" || record?.brandLevel === "geo") return false;
  return !record?.geoKey && !record?.fips;
}

function getCrossroadRecordShapeLevel(record) {
  const geoType = String(record?.geoType || "").toLowerCase();
  if (record?.brandLevel === "county" || geoType === "district" || geoType === "county") {
    return "county";
  }
  if (record?.brandLevel === "geo" || record?.geoKey) return "geo";
  return "state";
}

function buildPresetMatchedFeatures(records, filters, geoIndex, previewLevel, { excludeStateLevel = false } = {}) {
  const matchedFeatures = new Map();
  const context = createCrossroadMatchContext(filters, geoIndex);

  records.forEach((record) => {
    if (!presetMatchesRecord(record, filters, context)) return;
    if (excludeStateLevel && isCrossroadStateLevelRecord(record)) return;

    const shapeLevel = excludeStateLevel
      ? getCrossroadRecordShapeLevel(record)
      : previewLevel;
    const feature = excludeStateLevel
      ? resolveCrossroadFeature(record, geoIndex)
      : resolveCrossroadPreviewFeature(record, geoIndex, previewLevel);
    if (!feature?.geometry) return;

    const key = excludeStateLevel
      ? getCrossroadFeatureKey(record)
      : getCrossroadPreviewFeatureKey(record, previewLevel);
    const entry = matchedFeatures.get(key) || { feature, brandIds: new Set(), previewLevel: shapeLevel };
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

function computePresetStatusCounts(records, filters = {}, geoIndex = null) {
  const { statuses, ...filtersWithoutStatus } = filters;
  const context = createCrossroadMatchContext(filtersWithoutStatus, geoIndex);
  const matching = records.filter((record) => presetMatchesRecord(record, filtersWithoutStatus, context));

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

function bindCrossroadMapSkeleton(tile) {
  const map = tile.querySelector(".target-map");
  if (!map) return;

  const images = [...map.querySelectorAll("img")];
  if (!images.length) {
    map.classList.remove("is-loading");
    return;
  }

  let pending = images.filter((image) => !image.complete).length;
  if (!pending) {
    map.classList.remove("is-loading");
    return;
  }

  const settle = () => {
    pending -= 1;
    if (pending > 0) return;
    map.classList.remove("is-loading");
  };

  images.forEach((image) => {
    if (image.complete) return;
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });
  });
}

function createPresetTile(preset, { baseMapUrl, fillUrl, bordersUrl, counts, kind = "preset", colorMode = "pastel" } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "target-card territory-crossroad__tile territory-crossroad__tile--preset";
  if (kind === "saved") {
    tile.dataset.savedSearchId = preset.id;
  } else {
    tile.dataset.presetId = preset.id;
  }
  tile.dataset.kind = kind;
  tile.dataset.listScope = kind === "saved" ? "saved" : "featured";
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
  const tileActionsMarkup = kind === "saved"
    ? `
        <span class="target-card-actions">
          <span class="target-settings" role="button" tabindex="0" aria-label="Edit search settings">
            <img src="assets/settings.svg" alt="">
          </span>
          <span class="target-chevron" aria-hidden="true">
            <img src="assets/chevron.svg" alt="">
          </span>
        </span>
      `
    : `
        <span class="target-chevron" aria-hidden="true">
          <img src="assets/chevron.svg" alt="">
        </span>
      `;

  const hasMapImage = Boolean(baseImg || fillImg || bordersImg);
  const mapLoadingClass = hasMapImage ? " is-loading" : "";

  tile.innerHTML = `
    <div class="target-map${mapLoadingClass}" data-color-mode="${escapeHtml(colorMode)}">${baseImg}${fillImg}${bordersImg}</div>
    <div class="target-card-title">${escapeHtml(preset.title)}</div>
    <div class="target-field target-prospects">
      <span class="target-label">Territories</span>
      <div class="target-prospects-row">
        <span class="target-number">${totalLabel}</span>
        ${tileActionsMarkup}
      </div>
    </div>
  `;

  bindCrossroadMapSkeleton(tile);

  return tile;
}

// Cached from the last successful renderCrossroadPresetTiles() call so a
// single new tile (e.g. a just-saved search) can be built for the insertion
// animation without re-fetching/re-indexing all territory data. Matched
// preview geometry is also cached so a theme change can rebuild overlays
// without rematching every search.
let lastCrossroadRecords = null;
let lastCrossroadGeoIndex = null;
const crossroadTilePreviewCache = new Map();

function getCrossroadTileCacheKey(entry, kind) {
  return `${kind}:${entry.id}`;
}

function cacheCrossroadTilePreview(entry, kind, preview) {
  if (!entry?.id) return;
  crossroadTilePreviewCache.set(getCrossroadTileCacheKey(entry, kind), preview);
}

function buildCrossroadTilePreview(entry, records, geoIndex) {
  const filters = entry.filters || {};
  const previewLevel = resolveCrossroadPreviewLevel(filters, records, geoIndex);
  const matchedFeatures = buildPresetMatchedFeatures(records, filters, geoIndex, previewLevel);
  const brandMatchedFeatures = buildPresetMatchedFeatures(
    records,
    filters,
    geoIndex,
    previewLevel,
    { excludeStateLevel: true }
  );
  const snapshotView = resolveCrossroadSnapshotView(filters, matchedFeatures, geoIndex);

  return {
    previewLevel,
    matchedFeatures,
    brandMatchedFeatures,
    snapshotView,
    counts: computePresetStatusCounts(records, filters, geoIndex)
  };
}

function getCrossroadThemeMatchedFeatures(preview, theme) {
  if (theme.colorMode === "density") {
    return {
      features: preview.matchedFeatures,
      previewLevel: preview.previewLevel
    };
  }

  return {
    features: preview.brandMatchedFeatures || preview.matchedFeatures,
    previewLevel: "geo"
  };
}

function buildCrossroadPreviewOverlayUrls(preview, geoIndex = lastCrossroadGeoIndex) {
  const theme = getCrossroadTheme();
  const { features, previewLevel } = getCrossroadThemeMatchedFeatures(preview, theme);
  const baseMapUrl = buildBaseMapUrl(preview.snapshotView);
  let fillUrl = "";
  let bordersUrl = "";

  try {
    fillUrl = buildFillDataUrl(
      geoIndex,
      features,
      previewLevel,
      preview.snapshotView,
      theme
    );
    bordersUrl = buildBordersDataUrl(
      features,
      previewLevel,
      preview.snapshotView,
      theme
    );
  } catch (error) {
    console.warn("Unable to render territory preview.", error);
  }

  return {
    baseMapUrl,
    fillUrl,
    bordersUrl,
    colorMode: theme.colorMode
  };
}

function syncCrossroadTileOverlayImage(map, className, url) {
  let image = map.querySelector(`.${className}`);
  if (!url) {
    image?.remove();
    return;
  }

  if (!image) {
    image = document.createElement("img");
    image.className = className;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    map.append(image);
  }

  if (image.src !== url) {
    image.src = url;
  }
}

function syncCrossroadTileMapImages(tile, { fillUrl = "", bordersUrl = "", colorMode = "pastel" } = {}) {
  const map = tile.querySelector(".target-map");
  if (!map) return;

  map.dataset.colorMode = colorMode;
  syncCrossroadTileOverlayImage(map, "target-map-fill", fillUrl);
  syncCrossroadTileOverlayImage(map, "target-map-borders", bordersUrl);
}

function refreshCrossroadThemePreviews() {
  const geoIndex = lastCrossroadGeoIndex;
  if (!geoIndex || !crossroadTilePreviewCache.size) return;

  document.querySelectorAll("[data-preset-id], [data-saved-search-id]").forEach((tile) => {
    const kind = tile.dataset.kind || (tile.dataset.savedSearchId ? "saved" : "preset");
    const id = tile.dataset.savedSearchId || tile.dataset.presetId;
    const preview = crossroadTilePreviewCache.get(`${kind}:${id}`);
    if (!preview) return;

    syncCrossroadTileMapImages(tile, buildCrossroadPreviewOverlayUrls(preview, geoIndex));
  });
}

// Shared by bundled presets and user-saved searches: both carry the same
// `{ id, title, filters }` shape, so the same matching/preview pipeline
// renders either kind of tile.
function buildCrossroadTile(entry, records, geoIndex, kind = "preset") {
  const preview = buildCrossroadTilePreview(entry, records, geoIndex);
  cacheCrossroadTilePreview(entry, kind, preview);

  return createPresetTile(entry, {
    ...buildCrossroadPreviewOverlayUrls(preview, geoIndex),
    counts: preview.counts,
    kind
  });
}

function buildCrossroadTileFromCache(entry, kind) {
  if (lastCrossroadRecords && lastCrossroadGeoIndex) {
    return buildCrossroadTile(entry, lastCrossroadRecords, lastCrossroadGeoIndex, kind);
  }
  return createPresetTile(entry, { kind });
}

const CROSSROAD_WORKSPACE_HIDE_MS = 240;
const CROSSROAD_ENTER_STAGGER_MS = 65;
const CROSSROAD_ENTER_DURATION_MS = 320;
const CROSSROAD_LEAVE_DURATION_MS = 300;
const CROSSROAD_SAVED_INSERT_SHIFT_DURATION_MS = 680;
const CROSSROAD_SAVED_INSERT_SHIFT_EASING = "cubic-bezier(0.05, 0.95, 0.12, 1)";
const CROSSROAD_SAVED_INSERT_REVEAL_MS = 200;
const CROSSROAD_SAVED_INSERT_BLUR_PX = 4;
const CROSSROAD_SAVED_DELETE_FADE_MS = 500;
const CROSSROAD_SAVED_DELETE_BLUR_MS = 400;
const CROSSROAD_SAVED_DELETE_BLUR_PX = 12;
const CROSSROAD_SAVED_DELETE_SHIFT_DURATION_MS = 680;
const CROSSROAD_SAVED_DELETE_SHIFT_EASING = "cubic-bezier(0.05, 0.95, 0.12, 1)";

function isTerritoryCrossroadOpen() {
  const crossroad = document.getElementById("territoryCrossroad");
  return Boolean(
    crossroad
    && !crossroad.hidden
    && document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open")
  );
}

function isTerritoryCrossroadSearchOffscreen(isOpen = isTerritoryCrossroadOpen()) {
  const crossroad = document.getElementById("territoryCrossroad");
  const search = document.getElementById("territoryCrossroadSearch");
  if (!isOpen || !crossroad || !search) return false;

  const rootRect = crossroad.getBoundingClientRect();
  const searchRect = search.getBoundingClientRect();
  return searchRect.bottom <= rootRect.top + 1;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.body.classList.contains("reduce-motion");
}

function syncTerritoryCrossroadToolbar(active = null) {
  const shell = document.querySelector(".territory-shell");
  const header = document.querySelector(".territory-toolbar.header, .header");
  const crossroad = document.getElementById("territoryCrossroad");
  const newSearchButton = document.getElementById("territoryCrossroadNewSearch");
  const isOpen = Boolean(active ?? isTerritoryCrossroadOpen());
  const isOffscreen = isTerritoryCrossroadSearchOffscreen(isOpen);

  header?.classList.toggle(
    "is-scrolled",
    Boolean(isOpen && crossroad && !crossroad.hidden && crossroad.scrollTop > 0)
  );
  shell?.classList.toggle("is-crossroad-search-offscreen", isOffscreen);

  if (newSearchButton) {
    newSearchButton.tabIndex = isOffscreen ? 0 : -1;
    newSearchButton.setAttribute("aria-hidden", isOffscreen ? "false" : "true");
  }
}

function returnToTerritoryCrossroadSearch() {
  const crossroad = document.getElementById("territoryCrossroad");
  if (!crossroad || !isTerritoryCrossroadOpen()) return;

  const focusInput = () => focusTerritoryCrossroadSearchInput();

  if (crossroad.scrollTop <= 0 || prefersReducedMotion()) {
    crossroad.scrollTop = 0;
    focusInput();
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    crossroad.removeEventListener("scrollend", finish);
    window.clearTimeout(fallbackTimer);
    focusInput();
  };

  const fallbackTimer = window.setTimeout(finish, 700);
  crossroad.addEventListener("scrollend", finish, { once: true });
  crossroad.scrollTo({ top: 0, behavior: "smooth" });
}

function bindTerritoryCrossroadToolbar() {
  const crossroad = document.getElementById("territoryCrossroad");
  const newSearchButton = document.getElementById("territoryCrossroadNewSearch");
  if (!crossroad) return;

  crossroad.addEventListener("scroll", () => syncTerritoryCrossroadToolbar(), { passive: true });
  window.addEventListener("resize", () => syncTerritoryCrossroadToolbar());
  newSearchButton?.addEventListener("click", () => returnToTerritoryCrossroadSearch());
  syncTerritoryCrossroadToolbar();
}

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

function setTerritoryCrossroadWorkspaceInert(isInert) {
  [
    document.getElementById("territoryFilterPanel"),
    document.querySelector(".territory-workspace-main")
  ].forEach((element) => {
    if (element) element.inert = isInert;
  });
}

function dismissTerritoryCrossroad() {
  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");

  window.territoryFilters?.syncFilterSectionExpansion?.();
  shell?.classList.remove("is-crossroad-open", "is-crossroad-fullscreen", "is-crossroad-hiding-workspace");
  window.territoryFilters?.setPanelOpen?.(true);
  window.territoryFilters?.syncToggleAvailability?.();
  syncTerritoryCrossroadToolbar(false);
  setTerritoryCrossroadWorkspaceInert(false);
  window.territoryMapPanel?.setOpen?.(true, { persist: false });
  window.territoryMapPanel?.syncToggleAvailability?.();
  window.territoryMapControls?.updateResetVisibility?.();

  if (!crossroad || crossroad.hidden) return;

  crossroad.classList.remove("is-entering", "is-entering-active", "is-preparing-enter");
  crossroad.classList.add("is-leaving");

  window.setTimeout(() => {
    if (crossroad.classList.contains("is-leaving")) {
      crossroad.hidden = true;
    }
  }, CROSSROAD_LEAVE_DURATION_MS);
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

  resetTerritoryCrossroadSearch();
  window.territoryMapControls?.clearHover?.();
  shell?.classList.remove("is-crossroad-hiding-workspace");
  window.territoryFilters?.syncFilterSectionExpansion?.();
  setTerritoryCrossroadWorkspaceInert(true);
  crossroad.hidden = false;
  crossroad.classList.remove("is-leaving", "is-entering", "is-entering-active", "is-preparing-enter");
  shell?.classList.remove("is-crossroad-fullscreen");
  shell?.classList.add("is-crossroad-open");
  window.territoryFilters?.setPanelOpen?.(false);
  window.territoryFilters?.syncToggleAvailability?.();
  syncTerritoryCrossroadToolbar(true);
  window.territoryCrossroadChoice = null;
  window.territoryMapPanel?.syncToggleAvailability?.();
  window.territoryMapControls?.updateResetVisibility?.();

  if (animate) {
    playTerritoryCrossroadEnterAnimation(crossroad, { focusSearchOnComplete: true });
    return;
  }

  requestAnimationFrame(() => {
    focusTerritoryCrossroadSearchInput();
  });
}

function showTerritoryCrossroadAfterClearAll({ onReveal = null } = {}) {
  if (typeof onReveal === "function") {
    onReveal();
    return;
  }

  showTerritoryCrossroad({ animate: true });
}

window.showTerritoryCrossroad = showTerritoryCrossroad;
window.showTerritoryCrossroadAfterClearAll = showTerritoryCrossroadAfterClearAll;
window.dismissTerritoryCrossroad = dismissTerritoryCrossroad;

function beginTerritoryMapLoad() {
  window.territoryMapControls?.beginResultsLoading?.();
  window.startTerritoryMap?.();
}

function chooseCrossroadOption(choice) {
  window.territoryBrandPanel?.setActiveSavedSearch?.(null);

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

function normalizeCrossroadSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCrossroadCategoryMatchIndex(label, query) {
  const normalizedLabel = normalizeCrossroadSearchText(label);
  const normalizedQuery = normalizeCrossroadSearchText(query);
  if (!normalizedQuery) return -1;

  const index = normalizedLabel.indexOf(normalizedQuery);
  if (index !== -1) return index;

  const tokens = normalizedQuery.split(/\s+/).filter((token) => (
    token.length > 1 && token !== "and" && token !== "or"
  ));
  if (tokens.length < 2) return -1;
  if (!tokens.every((token) => normalizedLabel.includes(token))) return -1;
  return normalizedLabel.indexOf(tokens[0]) + 1000;
}

function isExactCrossroadSuggestion(item, query) {
  return normalizeCrossroadSearchText(item?.label) === normalizeCrossroadSearchText(query);
}

function getCrossroadCategoryLabel(value) {
  return window.territoryCategories?.formatLabel?.(value) || value;
}

function getCrossroadLocalSuggestions(query) {
  return [
    ...getCrossroadBrandSuggestions(query),
    ...getCrossroadCategorySuggestions(query)
  ];
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

function getCrossroadCategorySuggestions(query) {
  const normalizedQuery = normalizeCrossroadLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  const groups = new Map();

  crossroadTerritoryBrands.forEach((brand) => {
    const value = String(brand.category || "").trim();
    if (!value) return;

    const label = getCrossroadCategoryLabel(value);
    const group = groups.get(label) || {
      filters: { categories: [] },
      group: "Categories",
      label,
      type: "category",
      values: []
    };

    if (!group.values.includes(value)) {
      group.values.push(value);
      group.filters.categories.push(value);
    }

    groups.set(label, group);
  });

  return [...groups.values()]
    .map((item) => ({
      ...item,
      matchIndex: getCrossroadCategoryMatchIndex(`${item.label} ${item.values.join(" ")}`, query)
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
  const localSuggestions = getCrossroadLocalSuggestions(query);
  const remainingSlots = Math.max(0, CROSSROAD_SEARCH_SUGGESTION_LIMIT - localSuggestions.length);
  if (!remainingSlots) return localSuggestions;

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

  return [...localSuggestions, ...locationSuggestions].slice(0, CROSSROAD_SEARCH_SUGGESTION_LIMIT);
}

const CROSSROAD_SEARCH_SUGGESTION_ICON_SRCS = {
  category: "assets/categories.png"
};

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

  const assetSrc = CROSSROAD_SEARCH_SUGGESTION_ICON_SRCS[item.type];
  if (assetSrc) {
    icon.classList.add("is-category");
    icon.style.setProperty("--suggestion-icon", `url("${assetSrc}")`);
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

function startCrossroadCategorySearch(item) {
  if (!item?.filters?.categories?.length) return;

  chooseCrossroadOption({
    type: "new",
    filters: item.filters
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
      status.textContent = "No brands, categories, or locations match.";
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
    const localSuggestions = getCrossroadLocalSuggestions(query);
    if (localSuggestions.length) {
      renderSuggestions(localSuggestions);
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

    if (item.type === "category") {
      startCrossroadCategorySearch(item);
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
        setCrossroadSearchFeedback("Enter a brand, category, city, county, CBSA, or state to begin.");
        input.focus();
        return;
      }

      const locationResult = forcedResult?.locationResult || forcedResult;
      const result = await resolveCrossroadLocationSearch(query, locationResult || selectedSuggestion?.locationResult);
      if (!result) {
        setCrossroadSearchFeedback("Choose a matching brand, category, or U.S. location from the suggestions.");
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
      setCrossroadSearchFeedback("Enter a brand, category, city, county, CBSA, or state to begin.");
      input.focus();
      return;
    }

    const localSuggestions = getCrossroadLocalSuggestions(query);
    const exactLocalMatch = localSuggestions.find((item) => isExactCrossroadSuggestion(item, query));
    if (exactLocalMatch) {
      selectSuggestion(exactLocalMatch, { submit: true });
      return;
    }

    const locationResult = await resolveCrossroadLocationSearch(query);
    if (locationResult) {
      selectSuggestion(toCrossroadLocationSuggestion(locationResult), { submit: true });
      return;
    }

    if (localSuggestions[0]) {
      selectSuggestion(localSuggestions[0], { submit: true });
      return;
    }

    setCrossroadSearchFeedback("Choose a matching brand, category, or U.S. location from the suggestions.");
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

function setCrossroadPresetActiveScope(scope) {
  const tabs = Array.from(document.querySelectorAll(".territory-crossroad__popular .scope-tab"));
  const nextScope = tabs.some((tab) => (tab.dataset.scope || "all") === scope)
    ? scope
    : "all";

  crossroadPresetActiveScope = nextScope;
  tabs.forEach((tab) => tab.classList.toggle("is-active", (tab.dataset.scope || "all") === nextScope));
}

function resetCrossroadPresetSearchFilter() {
  const searchInput = document.getElementById("territoryCrossroadPresetSearch");
  const searchClear = document.getElementById("territoryCrossroadPresetSearchClear");
  const searchField = searchInput?.closest(".scope-search");

  if (searchInput) searchInput.value = "";
  crossroadPresetSearchTerm = "";
  searchField?.classList.remove("is-active-search");
  if (searchClear) searchClear.hidden = true;
}

function bindCrossroadPresetTabs() {
  const tabs = Array.from(document.querySelectorAll(".territory-crossroad__popular .scope-tab"));
  const searchInput = document.getElementById("territoryCrossroadPresetSearch");
  const searchClear = document.getElementById("territoryCrossroadPresetSearchClear");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setCrossroadPresetActiveScope(tab.dataset.scope || "all");
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

function bindCrossroadTile(tile, entry, kind = "preset") {
  tile.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".target-settings")) {
      return;
    }

    chooseCrossroadOption({
      type: "preset",
      presetId: entry.id,
      filters: entry.filters || {},
      savedSearchId: kind === "saved" ? entry.id : null,
      title: entry.title || ""
    });
  });

  if (kind !== "saved") return;

  const settingsControl = tile.querySelector(".target-settings");
  if (!settingsControl) return;

  const openSavedSearchSettings = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const savedSearch = window.territorySavedSearchStore?.getById?.(entry.id);
    if (!savedSearch) return;

    window.territorySaveSearchModal?.open?.(settingsControl, { savedSearch });
  };

  settingsControl.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  settingsControl.addEventListener("click", openSavedSearchSettings);
  settingsControl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    openSavedSearchSettings(event);
  });
}

function getCrossroadSavedSearches() {
  const datasetId = window.territoryDatasets?.getActive?.()?.id;
  return window.territorySavedSearchStore?.getAll?.(datasetId) || [];
}

function getCrossroadScopeGrid(scope) {
  return document.querySelector(`[data-crossroad-grid="${scope}"]`);
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

  setTerritoryCrossroadWorkspaceInert(true);
  window.territoryFilters?.setPanelOpen?.(false);
  crossroad.classList.remove("is-preparing-enter");
  playTerritoryCrossroadEnterAnimation(crossroad, { focusSearchOnComplete: true });
}

let crossroadPresetRenderVersion = 0;
let crossroadPresetActiveScope = "all";
let crossroadPresetSearchTerm = "";

const CROSSROAD_PRESET_EMPTY_MESSAGES = {
  all: "No popular searches match your search.",
  featured: "No popular searches match your search.",
  saved: "You haven't saved any searches."
};

function applyCrossroadPresetVisibility() {
  const stack = document.getElementById("territoryCrossroadScopeStack");
  const emptyState = document.getElementById("territoryCrossroadPopularEmpty");
  if (!stack) return;

  const term = crossroadPresetSearchTerm.trim().toLowerCase();
  const activeScope = crossroadPresetActiveScope;
  let totalVisible = 0;

  stack.querySelectorAll(".territory-crossroad__scope-section").forEach((section) => {
    const sectionScope = section.dataset.crossroadScope;
    const heading = section.querySelector(".territory-crossroad__scope-heading");
    let sectionVisible = 0;

    section.querySelectorAll("[data-preset-id], [data-saved-search-id]").forEach((tile) => {
      const title = (tile.dataset.title || "").toLowerCase();
      const matchesSearch = !term || title.includes(term);
      tile.hidden = !matchesSearch;
      if (matchesSearch) sectionVisible += 1;
    });

    if (activeScope === "all") {
      section.hidden = sectionVisible === 0;
      if (heading) heading.hidden = section.hidden;
      if (!section.hidden) totalVisible += sectionVisible;
      return;
    }

    if (activeScope === sectionScope) {
      section.hidden = false;
      if (heading) heading.hidden = sectionVisible === 0;
      totalVisible += sectionVisible;
      return;
    }

    section.hidden = true;
    if (heading) heading.hidden = true;
  });

  if (emptyState) {
    emptyState.textContent = CROSSROAD_PRESET_EMPTY_MESSAGES[activeScope]
      || CROSSROAD_PRESET_EMPTY_MESSAGES.all;
    emptyState.hidden = totalVisible > 0;
  }
}

function clearCrossroadScopeGrids() {
  document.querySelectorAll("[data-crossroad-grid]").forEach((grid) => {
    grid.querySelectorAll("[data-preset-id], [data-saved-search-id]").forEach((tile) => tile.remove());
  });
}

async function renderCrossroadPresetTiles({ excludeSavedSearchId = null } = {}) {
  const featuredGrid = getCrossroadScopeGrid("featured");
  const savedGrid = getCrossroadScopeGrid("saved");
  if (!featuredGrid || !savedGrid) return;

  const renderVersion = ++crossroadPresetRenderVersion;
  const activeDataset = window.territoryDatasets.getActive();
  const presets = activeDataset.presets || [];
  const savedSearches = getCrossroadSavedSearches()
    .filter((search) => search.id !== excludeSavedSearchId);
  crossroadTilePreviewCache.clear();
  clearCrossroadScopeGrids();

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
    lastCrossroadRecords = records;
    lastCrossroadGeoIndex = geoIndex;

    window.territoryFilters?.hydrateOptions?.(brands, { replace: true });

    savedSearches.forEach((savedSearch) => {
      const tile = buildCrossroadTile(savedSearch, records, geoIndex, "saved");
      bindCrossroadTile(tile, savedSearch, "saved");
      savedGrid.append(tile);
    });

    presets.forEach((preset) => {
      const tile = buildCrossroadTile(preset, records, geoIndex, "preset");
      bindCrossroadTile(tile, preset, "preset");
      featuredGrid.append(tile);
    });
  } catch (error) {
    if (
      renderVersion !== crossroadPresetRenderVersion
      || activeDataset.id !== window.territoryDatasets.getActive().id
    ) {
      return;
    }

    console.warn("Unable to build territory crossroad previews.", error);
    savedSearches.forEach((savedSearch) => {
      const tile = buildCrossroadTileFromCache(savedSearch, "saved");
      bindCrossroadTile(tile, savedSearch, "saved");
      savedGrid.append(tile);
    });
    presets.forEach((preset) => {
      const tile = buildCrossroadTileFromCache(preset, "preset");
      bindCrossroadTile(tile, preset, "preset");
      featuredGrid.append(tile);
    });
  }

  applyCrossroadPresetVisibility();
}

/* Saving a search: animate it into the Saved tab ---------------------- */

function animateCrossroadSavedSearchShift(
  tiles,
  previousPositions,
  duration = CROSSROAD_SAVED_INSERT_SHIFT_DURATION_MS,
  easing = CROSSROAD_SAVED_INSERT_SHIFT_EASING
) {
  const animations = [];

  tiles.forEach((tile) => {
    const key = tile.dataset.savedSearchId || tile.dataset.presetId;
    const previousPosition = previousPositions.get(key);
    if (!previousPosition) return;

    const nextPosition = tile.getBoundingClientRect();
    const deltaX = previousPosition.left - nextPosition.left;
    const deltaY = previousPosition.top - nextPosition.top;
    if (!deltaX && !deltaY) return;

    animations.push(tile.animate([
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], { duration, easing }));
  });

  return Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
}

function animateCrossroadSavedSearchInsertion(savedSearch) {
  const grid = getCrossroadScopeGrid("saved");
  if (!grid || !savedSearch) return;

  const savedScroll = document.getElementById("territoryCrossroad");
  savedScroll?.scrollTo({ top: 0, behavior: "auto" });

  const visibleTiles = Array.from(grid.children).filter((tile) => !tile.hidden);
  const previousPositions = new Map(
    visibleTiles.map((tile) => [
      tile.dataset.savedSearchId || tile.dataset.presetId,
      tile.getBoundingClientRect()
    ])
  );

  const newTile = buildCrossroadTileFromCache(savedSearch, "saved");
  bindCrossroadTile(newTile, savedSearch, "saved");
  newTile.style.pointerEvents = "none";
  grid.prepend(newTile);
  applyCrossroadPresetVisibility();

  const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (shouldReduceMotion) {
    newTile.style.removeProperty("pointer-events");
    return;
  }

  newTile.style.opacity = "0";
  newTile.style.filter = `blur(${CROSSROAD_SAVED_INSERT_BLUR_PX}px)`;

  const existingTiles = visibleTiles.filter((tile) => tile !== newTile);

  animateCrossroadSavedSearchShift(existingTiles, previousPositions).finally(() => {
    const revealAnimation = newTile.animate([
      { opacity: 0, filter: `blur(${CROSSROAD_SAVED_INSERT_BLUR_PX}px)` },
      { opacity: 1, filter: "blur(0px)" }
    ], {
      duration: CROSSROAD_SAVED_INSERT_REVEAL_MS,
      easing: "ease-out",
      fill: "forwards"
    });

    revealAnimation.finished
      .catch(() => {})
      .finally(() => {
        newTile.style.removeProperty("opacity");
        newTile.style.removeProperty("filter");
        newTile.style.removeProperty("pointer-events");
      });
  });
}

async function prepareTerritorySavedSearchReveal(savedSearch) {
  resetCrossroadPresetSearchFilter();
  setCrossroadPresetActiveScope("saved");
  await renderCrossroadPresetTiles({ excludeSavedSearchId: savedSearch.id });
  showTerritoryCrossroad({ animate: false });

  requestAnimationFrame(() => {
    animateCrossroadSavedSearchInsertion(savedSearch);
  });
}

function animateCrossroadSavedSearchDeletion(savedSearchId) {
  const grid = getCrossroadScopeGrid("saved");
  const removedTile = grid?.querySelector(`[data-saved-search-id="${CSS.escape(savedSearchId)}"]`);
  if (!grid || !removedTile) return;

  const savedScroll = document.getElementById("territoryCrossroad");
  savedScroll?.scrollTo({ top: 0, behavior: "auto" });

  const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (shouldReduceMotion) {
    removedTile.remove();
    applyCrossroadPresetVisibility();
    return;
  }

  removedTile.style.pointerEvents = "none";

  const blurCompleteOffset = CROSSROAD_SAVED_DELETE_BLUR_MS / CROSSROAD_SAVED_DELETE_FADE_MS;
  const removalAnimation = removedTile.animate([
    { opacity: 1, filter: "blur(0px)", offset: 0 },
    {
      opacity: 1,
      filter: `blur(${CROSSROAD_SAVED_DELETE_BLUR_PX}px)`,
      offset: blurCompleteOffset
    },
    {
      opacity: 0,
      filter: `blur(${CROSSROAD_SAVED_DELETE_BLUR_PX}px)`,
      offset: 1
    }
  ], {
    duration: CROSSROAD_SAVED_DELETE_FADE_MS,
    easing: "ease",
    fill: "forwards"
  });

  removalAnimation.finished
    .catch(() => {})
    .finally(() => {
      const remainingTiles = Array.from(grid.children).filter((tile) => tile !== removedTile);
      const previousPositions = new Map(
        remainingTiles.map((tile) => [
          tile.dataset.savedSearchId || tile.dataset.presetId,
          tile.getBoundingClientRect()
        ])
      );

      removedTile.remove();
      applyCrossroadPresetVisibility();

      animateCrossroadSavedSearchShift(
        remainingTiles,
        previousPositions,
        CROSSROAD_SAVED_DELETE_SHIFT_DURATION_MS,
        CROSSROAD_SAVED_DELETE_SHIFT_EASING
      );
    });
}

function deleteTerritorySavedSearch(searchId) {
  const searches = getCrossroadSavedSearches();
  const savedSearch = searches.find((entry) => entry.id === searchId);
  if (!savedSearch) return null;

  const scopeIndex = searches.findIndex((entry) => entry.id === searchId);
  const removedSearch = window.territorySavedSearchStore?.remove?.(searchId);
  if (!removedSearch) return null;

  return {
    savedSearch: removedSearch,
    scopeIndex: Math.max(0, scopeIndex)
  };
}

async function prepareTerritorySavedSearchDeletionReveal({ savedSearch, scopeIndex = 0 } = {}) {
  resetCrossroadPresetSearchFilter();
  setCrossroadPresetActiveScope("saved");
  await renderCrossroadPresetTiles();

  const grid = getCrossroadScopeGrid("saved");
  if (grid && savedSearch) {
    const removedTile = buildCrossroadTileFromCache(savedSearch, "saved");
    bindCrossroadTile(removedTile, savedSearch, "saved");
    grid.insertBefore(removedTile, grid.children[Math.max(0, scopeIndex)] || null);
    applyCrossroadPresetVisibility();
  }
  showTerritoryCrossroad({ animate: false });

  requestAnimationFrame(() => {
    animateCrossroadSavedSearchDeletion(savedSearch.id);
  });
}

function revealDeletedTerritorySavedSearch({ savedSearch, scopeIndex = 0 } = {}) {
  if (!savedSearch) return;

  window.territoryMapFilters?.hideTerritoryRecords?.();
  window.territoryMapSelection?.clear?.();
  window.territoryBrandPanel?.close?.();

  const shell = document.querySelector(".territory-shell");
  const crossroad = document.getElementById("territoryCrossroad");
  const alreadyOnSplash = Boolean(
    crossroad && !crossroad.hidden && shell?.classList.contains("is-crossroad-open")
  );

  if (window.__territoryMapStarted && !alreadyOnSplash) {
    showTerritoryCrossroadAfterClearAll({
      onReveal: () => prepareTerritorySavedSearchDeletionReveal({ savedSearch, scopeIndex })
    });
  } else {
    prepareTerritorySavedSearchDeletionReveal({ savedSearch, scopeIndex });
  }
}

// Called after "Save search" persists a new search: brings the user back to
// the crossroad splash screen, switches to the Saved tab, and animates the
// new tile into the grid (same FLIP insert/shift technique CST uses for its
// saved-search splash).
function revealTerritorySavedSearch(savedSearch) {
  if (!savedSearch) return;

  window.territoryMapFilters?.hideTerritoryRecords?.();
  window.territoryMapSelection?.clear?.();
  window.territoryBrandPanel?.close?.();

  if (window.__territoryMapStarted) {
    showTerritoryCrossroadAfterClearAll({
      onReveal: () => prepareTerritorySavedSearchReveal(savedSearch)
    });
  } else {
    prepareTerritorySavedSearchReveal(savedSearch);
  }
}

window.territoryCrossroad = {
  deleteSavedSearch: deleteTerritorySavedSearch,
  revealSavedSearch: revealTerritorySavedSearch,
  revealDeletedSearch: revealDeletedTerritorySavedSearch,
  refreshThemePreviews: refreshCrossroadThemePreviews
};

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
  bindTerritoryCrossroadToolbar();

  const featuredGrid = getCrossroadScopeGrid("featured");
  const crossroad = document.getElementById("territoryCrossroad");
  if (!featuredGrid) return;

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

window.addEventListener("territory:saved-searches-changed", () => {
  if (!window.__territoryMapStarted) {
    renderCrossroadPresetTiles();
  }
});

window.addEventListener("territory:theme-changed", () => {
  refreshCrossroadThemePreviews();
});

initTerritoryCrossroad();
