const TERRITORY_MAP_STYLE = window.CST_ENV?.MAPBOX_STYLE || "mapbox://styles/nubeek/cka7zizn720s71iogpmkvmw5z";
const TERRITORY_MAP_STYLE_BROKEN_LAYER_IDS = new Set(["hillshade"]);
// The Wefranch base style still references a deprecated hillshade source layer on
// composite; Mapbox GL v3 rejects the style before the map can load without this.
async function loadTerritoryMapStyle(accessToken) {
  const stylePath = TERRITORY_MAP_STYLE.replace(/^mapbox:\/\/styles\//, "");
  const url = `https://api.mapbox.com/styles/v1/${stylePath}?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to load map style (${response.status})`);
  }

  const style = await response.json();
  style.layers = style.layers.filter((layer) => !TERRITORY_MAP_STYLE_BROKEN_LAYER_IDS.has(layer.id));
  return style;
}
const TERRITORY_MAP_CENTER = [-97.5795, 38.8283];
const TERRITORY_MAP_ZOOM = 3.4;
// Set to false (or CST_ENV.MOCK_USER_LOCATION = false) to use the browser's real GPS.
const TERRITORY_MOCK_USER_LOCATION = window.CST_ENV?.MOCK_USER_LOCATION ?? true;
const TERRITORY_MOCK_USER_COORDS = window.CST_ENV?.MOCK_USER_COORDS ?? {
  longitude: -73.986472,
  latitude: 40.703875,
  accuracy: 25
};
const TERRITORY_GEOLOCATE_ZOOM = window.CST_ENV?.GEOLOCATE_ZOOM ?? 6.5;
const TERRITORY_MAP_SEARCH_RADIUS_MILES = window.CST_ENV?.MAP_SEARCH_RADIUS_MILES ?? 50;
const TERRITORY_MILES_PER_LATITUDE_DEGREE = 69;
const TERRITORY_FOCUS_PADDING = 100;
const TERRITORY_FOCUS_MAX_ZOOM = 5.00;
// Filter / reset framing may zoom in past the US overview clamp so city and
// radius searches land like the detail-shape focus.
const TERRITORY_FILTER_FOCUS_MAX_ZOOM = 10;
// Filter / reset framing uses slightly tighter air than brand-shape focus so
// city + radius searches fill the map panel the way the detail view does.
const TERRITORY_FILTER_FOCUS_PADDING_LARGE = 100;
const TERRITORY_FILTER_FOCUS_PADDING_SMALL = 72;
const TERRITORY_FOCUS_DURATION = 1000;
const TERRITORY_FOCUS_FLY_CURVE = 1.62;
// Shape-fit focus for a selected territory / brand marker: padding frames the
// geometry instead of clamping to a fixed zoom. Larger viewports get more air.
const TERRITORY_SHAPE_FOCUS_PADDING_LARGE = 180;
const TERRITORY_SHAPE_FOCUS_PADDING_SMALL = 120;
// When the detail card is open, keep equal air above the shape and above the
// card's top edge (bottom inset = card overlay + this edge padding). Mapbox GL
// v3 averages asymmetric padding, so selection focus also passes an offset.
const TERRITORY_SELECTION_FOCUS_EDGE_LARGE = 100;
const TERRITORY_SELECTION_FOCUS_EDGE_SMALL = 64;
// Used only if the detail card has not laid out yet when measuring inset.
const TERRITORY_INFO_CARD_FALLBACK_HEIGHT = 420;
const TERRITORY_INFO_CARD_SLIDE_MS = 340;
const TERRITORY_SHAPE_FOCUS_BREAKPOINT = 761;
const TERRITORY_STATES_URL = "data/us-states.geojson";
const TERRITORY_COUNTIES_URL = "data/us-counties.geojson";
const TERRITORY_REAL_GEOMETRY_URL = "data/real/geometry.geojson";
const TERRITORY_MACRODATA_URL = "data/state-macrodata.json";
const territoryDataCachePromises = new Map();
const TERRITORY_FILL_OPACITY = 0.15;
const TERRITORY_FILL_HOVER_OPACITY = 0.3;
const TERRITORY_HATCH_FILL_OPACITY = 0.4;
const TERRITORY_HATCH_FILL_HOVER_OPACITY = 0.65;
const TERRITORY_HATCH_LINE_PX = 2;
const TERRITORY_HATCH_GAP_PX = 2;
const TERRITORY_HATCH_PIXEL_RATIO = 2;
const TERRITORY_LINE_OPACITY = 0.5;
const TERRITORY_LINE_WIDTH = 2;
const TERRITORY_SHARED_FILL_OPACITY = 0.28;
const TERRITORY_SHARED_OUTLINE_STEPS = 24;
// Shared (multi-brand) territories stack per-brand fill/hatch layers when brand
// territories are visible. The consolidated shared sources remain for hit testing
// infrastructure but stay hidden in that mode.
const TERRITORY_SHARED_PATTERN_WIDTH_BY_LEVEL = { state: 384, county: 96, geo: 96 };
const TERRITORY_SHARED_PATTERN_HEIGHT = 8;
const TERRITORY_SHARED_PATTERN_PIXEL_RATIO = 2;
const TERRITORY_SHARED_ALL_SOURCE_ID = "territories-shared-all";
const TERRITORY_SHARED_ALL_FILL_LAYER_ID = "territories-shared-all-fill";
const TERRITORY_SHARED_ALL_HIT_LAYER_ID = "territories-shared-all-hit";
const TERRITORY_SHARED_ALL_STROKE_SOURCE_ID = "territories-shared-all-stroke";
const TERRITORY_SHARED_ALL_STROKE_LAYER_ID = "territories-shared-all-stroke-layer";
// Territory outlines carry no detail worth re-tiling past this zoom, so let
// Mapbox overzoom the cached tiles rather than rebuilding them on every step in.
const TERRITORY_SOURCE_MAX_ZOOM = 10;
const TERRITORY_LOGO_MIN_SIZE = 24;
const TERRITORY_LOGO_MAX_SIZE = 42;
const TERRITORY_LOGO_SHARED_GAP = 4;
const TERRITORY_LOGO_MAX_VISIBLE = 4;
// Keep map logo textures small and uniform. Large source images inflate
// icon-offset values (offset × imageWidth), which Mapbox can distort into
// stretched blobs when several brands share one territory.
const TERRITORY_LOGO_TEXTURE_SIZE = 64;
const TERRITORY_LOGO_CORNER_RADIUS_RATIO = 10 / 42;
const TERRITORY_LOGO_BORDER_COLOR = "#e7e7e7";
const TERRITORY_LOGO_ZOOM_MIN = 3;
const TERRITORY_LOGO_ZOOM_MAX = 8;
// County/geo logos only appear once the viewport is tight enough that full
// brand marks stay readable.
const TERRITORY_COUNTY_LOGO_MIN_ZOOM = 8;
// State-level territories are large enough for logos at mid zoom.
const TERRITORY_STATE_LOGO_MIN_ZOOM = 5;
const TERRITORY_DENSITY_LOW_COLOR = "#d1bbde";
const TERRITORY_DENSITY_HIGH_COLOR = "#81599a";
const TERRITORY_DENSITY_HOVER_LOW_COLOR = "#b99aca";
const TERRITORY_DENSITY_HOVER_HIGH_COLOR = "#69457f";
const TERRITORY_DENSITY_LOW_OPACITY = 0.3;
const TERRITORY_DENSITY_HIGH_OPACITY = 0.72;
const TERRITORY_DENSITY_HOVER_LOW_OPACITY = 0.48;
const TERRITORY_DENSITY_HOVER_HIGH_OPACITY = 0.86;
const TERRITORY_DENSITY_SOURCE_ID = "territories-density";
const TERRITORY_DENSITY_FILL_LAYER_ID = "territories-density-fill";
const TERRITORY_DENSITY_LINE_LAYER_ID = "territories-density-line";
const TERRITORY_RADIUS_SOURCE_ID = "territory-radius-circles";
const TERRITORY_RADIUS_FILL_LAYER_ID = "territory-radius-circles-fill";
const TERRITORY_RADIUS_OUTLINE_LAYER_ID = "territory-radius-circles-outline";
// Parts of territories outside the active radius fade to this absolute opacity
// for both fill and stroke.
const TERRITORY_RADIUS_OUTSIDE_OPACITY = 0.1;
const TERRITORY_RADIUS_OUTSIDE_GEOKEY_SUFFIX = "__radius_outside";
const TERRITORY_FILL_OPACITY_EXPRESSION = [
  "case",
  [
    "any",
    ["boolean", ["feature-state", "hover"], false],
    ["boolean", ["feature-state", "selected"], false]
  ],
  TERRITORY_FILL_HOVER_OPACITY,
  TERRITORY_FILL_OPACITY
];
const TERRITORY_HATCH_FILL_OPACITY_EXPRESSION = [
  "case",
  [
    "any",
    ["boolean", ["feature-state", "hover"], false],
    ["boolean", ["feature-state", "selected"], false]
  ],
  TERRITORY_HATCH_FILL_HOVER_OPACITY,
  TERRITORY_HATCH_FILL_OPACITY
];

function withTerritoryRadiusOutsideOpacity(baseOpacity) {
  return [
    "case",
    ["==", ["get", "radiusZone"], "outside"],
    TERRITORY_RADIUS_OUTSIDE_OPACITY,
    baseOpacity
  ];
}
const TERRITORY_STATUS_ESTABLISHED_FILTER = ["==", ["get", "status"], "established"];
const TERRITORY_STATUS_NON_ESTABLISHED_FILTER = ["!=", ["get", "status"], "established"];
const TERRITORY_GEO_TYPE_RENDER_ORDER = ["region", "cbsa", "district", "place", "address"];
const TERRITORY_GEO_TYPE_RANK = {
  region: 0,
  state: 0,
  cbsa: 1,
  district: 2,
  county: 2,
  place: 3,
  address: 4
};
const TERRITORY_GEO_TYPE_LABELS = {
  region: "State",
  cbsa: "CBSA",
  district: "County",
  place: "City",
  address: "Street"
};
const brandLogoMetaById = new Map();
const territoryLineLayerIds = [];
const territoryBrandLayerIds = new Map();
const territoryBrandLogoInfo = new Map();
const territorySharedPatternIdsByColors = new Map();
// Set only while shared territories are rendered through the consolidated
// sources; null means the per-territory raster path is in use.
let territorySharedConsolidated = null;
let territoryBaseHoverLayerIds = [];
let territoryBordersEnabled = true;
let territoryDensityEnabled = true;
let territoryBrandLogosEnabled = false;
let territoryBrands = [];
let territoryBrandsById = new Map();
let territoryRegistry = [];
let territoryStateOccupancy = new Map();
let territoryStatesByCode = new Map();
let territoryCountiesByFips = new Map();
let territoryGeoFeaturesByKey = new Map();
let territoryGeoLevel = "state";
let territoryStateMacrodata = new Map();
let territoryLastMatchingRecords = null;
let territoryRenderedRecords = null;
let territoryRadiusFilter = {
  enabled: false,
  miles: 300,
  centers: []
};
const territoryBrandBaseCollections = new Map();
let territoryRadiusFadeVisibleGeoKeys = new Set();
let territoryRadiusFadeSignature = "";
let selectedTerritoryKey = null;
let compareTerritoryKey = null;
let selectedTerritoryFeatureStates = [];
let territoryInfoDismissedKey = null;
let territoryInfoHideTimer = null;
let territoryAreaCardGeoKey = null;
let territoryDetailReturnGeoKey = null;
let territoryIntersectionIndex = new Map();
const territoryIntersectionCache = new Map();
let territoryGeolocateControl = null;
let territoryMapHasLoaded = false;
let territoryGeolocationPending = false;
let territoryPendingFocusStateCode = null;
let territoryPendingFocusCoordinates = null;
let territoryPendingGeolocationCoordinates = null;
let territoryFilterFitRevision = 0;
let territoryInitialRevealCompleted = false;
// Sources and layers cache every territory, but nothing may render until the
// current UI filter state has been applied. This prevents an unfiltered frame
// from appearing while saved or preset selections are being restored.
let territoryHoldInitialRender = true;
const TERRITORY_HOLD_FILTER = ["==", ["get", "state"], "__territory_hold__"];
let clearTerritoryMapHover = null;
let hoveredDensityGeoKey = null;
let sidebarHoveredTerritoryState = null;

const TERRITORY_STATUS_LABELS = {
  available: "Available",
  established: "For Sale",
  sold: "Sold"
};

function formatTerritoryStatus(status) {
  return TERRITORY_STATUS_LABELS[status] || status.replace(/^\w/, (char) => char.toUpperCase());
}

function normalizeTerritoryGeoType(geoType, brandLevel = "") {
  const normalized = String(geoType || "").toLowerCase();
  if (normalized === "state") return "region";
  if (normalized === "county") return "district";
  if (TERRITORY_GEO_TYPE_RANK[normalized] != null) return normalized;
  if (brandLevel === "county") return "district";
  if (brandLevel === "geo") return "place";
  return "region";
}

function getTerritoryGeoTypeRank(geoType) {
  return TERRITORY_GEO_TYPE_RANK[normalizeTerritoryGeoType(geoType)] ?? 0;
}

function formatTerritoryMapLabel(name, stateCode) {
  const trimmed = String(name || "").trim();
  const state = String(stateCode || "").trim().toUpperCase();
  if (!trimmed) return state;

  if (state && new RegExp(`,\\s*${state}$`, "i").test(trimmed)) {
    return trimmed.replace(new RegExp(`,\\s*${state}$`, "i"), `, ${state}`);
  }

  // "Allegany County, New York" → "Allegany County, NY"
  if (state && /,\s*[^,]+$/.test(trimmed)) {
    return trimmed.replace(/,\s*[^,]+$/, `, ${state}`);
  }

  return state ? `${trimmed}, ${state}` : trimmed;
}

function formatTerritoryStatusSummary(records) {
  const counts = new Map();

  records.forEach((record) => {
    const label = formatTerritoryStatus(record.status);
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const order = ["Available", "For Sale", "Sold"];

  return [...counts.entries()]
    .sort((a, b) => {
      const indexA = order.indexOf(a[0]);
      const indexB = order.indexOf(b[0]);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    })
    .map(([label, count]) => `${label} (${count})`)
    .join(", ");
}

function resolveTerritoryTooltipName(geoKey, properties = {}) {
  const records = getTerritoryRecordsForState(geoKey);
  const recordName = records.find((record) => record.name)?.name;
  const featureName = territoryGeoLevel === "geo"
    ? territoryGeoFeaturesByKey.get(geoKey)?.properties?.name
    : territoryGeoLevel === "county"
      ? territoryCountiesByFips.get(geoKey)?.properties?.name
      : territoryStatesByCode.get(geoKey)?.properties?.name;
  const stateCode = records[0]?.state || properties.state || (
    territoryGeoLevel === "state" ? geoKey : ""
  );

  return formatTerritoryMapLabel(
    recordName || properties.stateName || featureName || geoKey,
    stateCode
  );
}

const TERRITORY_MAP_LOADING_FADE_MS = 240;
const TERRITORY_MAP_RESET_FADE_MS = 240;
const TERRITORY_MAP_VIEW_RESET_ZOOM_TOLERANCE = 0.05;
const TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE = 0.05;
const TERRITORY_MAP_RESET_TOP_OFFSET = 32;
let territoryMapResetHideTimer = null;
let territoryMapResetPositionObserver = null;
let territoryFilterDefaultView = {
  center: [...TERRITORY_MAP_CENTER],
  zoom: TERRITORY_MAP_ZOOM
};

function getTerritoryMapContainerElement() {
  return document.querySelector(".territory-map-frame") || document.getElementById("territoryMap");
}

let territoryMapPanelLayoutPromise = Promise.resolve();

function isTerritoryMapPanelOpen() {
  return document.querySelector(".territory-shell")?.classList.contains("is-map-panel-open") ?? false;
}

function syncTerritoryMapToggleAvailability() {
  const toggle = document.getElementById("territoryMapToggle");
  if (!toggle) return;

  const crossroadOpen = isTerritoryCrossroadOpen();
  toggle.disabled = crossroadOpen;

  if (crossroadOpen && isTerritoryMapPanelOpen()) {
    setTerritoryMapPanelOpen(false, { persist: false, animate: false });
  }
}

function setTerritoryMapPanelOpen(isOpen, { persist = true, animate = true } = {}) {
  const shell = document.querySelector(".territory-shell");
  const panel = document.getElementById("territoryMapPanel");
  const toggle = document.getElementById("territoryMapToggle");
  if (!shell || !panel || !toggle) return Promise.resolve();

  const nextOpen = Boolean(isOpen) && !isTerritoryCrossroadOpen();
  const changed = shell.classList.contains("is-map-panel-open") !== nextOpen;
  shell.classList.toggle("is-map-panel-open", nextOpen);
  panel.setAttribute("aria-hidden", String(!nextOpen));
  toggle.classList.toggle("is-active", nextOpen);
  toggle.setAttribute("aria-expanded", String(nextOpen));

  updateTerritoryMapResetVisibility();

  if (persist) {
    window.territoryFilters?.persistSettings?.();
  }

  if (!nextOpen) {
    hideTerritoryInfoCard({ immediate: true });
  } else if (!selectedTerritoryKey && !compareTerritoryKey) {
    hideTerritoryInfoCard({ immediate: true });
    const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
    if (matchingRecords.length) {
      renderTerritoryRecords(matchingRecords);
    }
  }

  const scheduleFilterFitAfterOpen = () => {
    // Territory selection opens the panel and frames its own shape; don't fight it.
    if (!nextOpen || !changed || selectedTerritoryKey) return;
    const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
    if (!matchingRecords?.length) return;
    scheduleTerritoryMapViewForFilters(window.territoryMap, matchingRecords);
  };

  if (!changed || !animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.territoryMap?.resize?.();
    territoryMapPanelLayoutPromise = Promise.resolve();
    scheduleFilterFitAfterOpen();
    return territoryMapPanelLayoutPromise;
  }

  territoryMapPanelLayoutPromise = new Promise((resolve) => {
    let settled = false;
    let fallbackTimer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      panel.removeEventListener("transitionend", handleTransitionEnd);
      panel.removeEventListener("transitioncancel", finish);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.territoryMap?.resize?.();
      syncTerritoryMapResetPosition();
      updateTerritoryMapResetVisibility();
      resolve();
      scheduleFilterFitAfterOpen();
    };
    const handleTransitionEnd = (event) => {
      if (event.target !== panel || !["flex-basis", "width", "min-width"].includes(event.propertyName)) return;
      finish();
    };

    fallbackTimer = window.setTimeout(finish, 320);
    panel.addEventListener("transitionend", handleTransitionEnd);
    panel.addEventListener("transitioncancel", finish);
  });

  return territoryMapPanelLayoutPromise;
}

function whenTerritoryMapPanelLayoutSettled() {
  return territoryMapPanelLayoutPromise;
}

function initTerritoryMapPanelToggle() {
  const toggle = document.getElementById("territoryMapToggle");
  if (!toggle) return;

  syncTerritoryMapToggleAvailability();
  toggle.addEventListener("click", () => {
    if (isTerritoryCrossroadOpen()) return;
    setTerritoryMapPanelOpen(!isTerritoryMapPanelOpen());
  });
}

function syncTerritoryMapResetPosition() {
  const resetEl = getTerritoryMapResetElement();
  const mapContainer = getTerritoryMapContainerElement();
  if (!resetEl || !mapContainer) return;

  const rect = mapContainer.getBoundingClientRect();
  resetEl.style.top = `${rect.top + TERRITORY_MAP_RESET_TOP_OFFSET}px`;
  resetEl.style.left = `${rect.left + (rect.width / 2)}px`;
}

function bindTerritoryMapResetPositionSync() {
  syncTerritoryMapResetPosition();

  window.addEventListener("resize", syncTerritoryMapResetPosition);

  const mapContainer = getTerritoryMapContainerElement();
  if (!mapContainer || typeof ResizeObserver === "undefined") return;

  territoryMapResetPositionObserver?.disconnect();
  territoryMapResetPositionObserver = new ResizeObserver(syncTerritoryMapResetPosition);
  territoryMapResetPositionObserver.observe(mapContainer);
}

function getTerritoryMapLoadingElement() {
  return document.getElementById("territoryMapLoading");
}

function getTerritoryMapResetElement() {
  return document.getElementById("territoryMapReset");
}

function isTerritoryMapLoadingVisible() {
  const loadingEl = getTerritoryMapLoadingElement();
  return Boolean(loadingEl && !loadingEl.hidden && !loadingEl.classList.contains("is-hiding"));
}

function isTerritoryCrossroadOpen() {
  return document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open") ?? false;
}

function normalizeTerritoryMapCenter(center) {
  if (Array.isArray(center)) return [center[0], center[1]];
  return [center.lng, center.lat];
}

function getTerritoryDatasetDefaultView() {
  const mapView = window.territoryDatasets?.getActive?.()?.mapView;
  return {
    center: mapView?.center ? [...mapView.center] : [...TERRITORY_MAP_CENTER],
    zoom: mapView?.zoom ?? TERRITORY_MAP_ZOOM
  };
}

function setTerritoryFilterDefaultView(center, zoom) {
  territoryFilterDefaultView = {
    center: normalizeTerritoryMapCenter(center),
    zoom
  };
}

function captureTerritoryFilterDefaultViewFromMap(territoryMap) {
  if (!territoryMap) return;

  const center = territoryMap.getCenter();
  setTerritoryFilterDefaultView(center, territoryMap.getZoom());
}

function shouldAutoFitMapToMatchingRecords(matchingRecords) {
  if (!matchingRecords.length) return false;

  const activeDataset = window.territoryDatasets?.getActive?.();
  if (activeDataset?.autoFitMap === false) {
    return window.territoryFilters?.hasNarrowingFilters?.() ?? false;
  }

  const appliedFilterCount = window.territoryFilters?.getAppliedFilterCount?.() ?? 0;
  if (appliedFilterCount > 0) return true;

  return territoryRegistry.length > 0 && matchingRecords.length < territoryRegistry.length;
}

function getTerritoryFilterFocusPadding(territoryMap) {
  const container = territoryMap?.getContainer();
  const width = container?.clientWidth || window.innerWidth;
  const height = container?.clientHeight || window.innerHeight;
  const preferred = width >= TERRITORY_SHAPE_FOCUS_BREAKPOINT
    ? TERRITORY_FILTER_FOCUS_PADDING_LARGE
    : TERRITORY_FILTER_FOCUS_PADDING_SMALL;
  const maxPadding = Math.floor(Math.min(width, height) / 2) - 24;

  return Math.max(24, Math.min(preferred, maxPadding));
}

function getTerritoryRecordsFilterCamera(territoryMap, matchingRecords) {
  if (!territoryMap || !matchingRecords.length || !window.mapboxgl) return null;

  const recordBounds = getTerritoryFilterFocusBounds(matchingRecords);
  if (!recordBounds) return null;

  const { west, east, south, north } = recordBounds;
  const spanLng = east - west;
  const spanLat = north - south;
  // Only inflate near-degenerate bounds; radius circles already have real size.
  const padLng = spanLng < 0.05 ? 0.05 : 0;
  const padLat = spanLat < 0.05 ? 0.05 : 0;
  const bounds = new mapboxgl.LngLatBounds(
    [west - padLng, south - padLat],
    [east + padLng, north + padLat]
  );
  const camera = territoryMap.cameraForBounds(bounds, {
    padding: getTerritoryFilterFocusPadding(territoryMap),
    maxZoom: TERRITORY_FILTER_FOCUS_MAX_ZOOM
  });

  if (!camera) return null;

  return {
    center: camera.center,
    zoom: Math.min(camera.zoom, TERRITORY_FILTER_FOCUS_MAX_ZOOM)
  };
}

function isTerritoryMapAtDefaultView(territoryMap) {
  if (!territoryMap) return true;

  const center = territoryMap.getCenter();
  const zoom = territoryMap.getZoom();
  const [defaultLng, defaultLat] = territoryFilterDefaultView.center;

  return Math.abs(zoom - territoryFilterDefaultView.zoom) < TERRITORY_MAP_VIEW_RESET_ZOOM_TOLERANCE
    && Math.abs(center.lng - defaultLng) < TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE
    && Math.abs(center.lat - defaultLat) < TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE;
}

function showTerritoryMapReset() {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl) return;

  if (territoryMapResetHideTimer) {
    window.clearTimeout(territoryMapResetHideTimer);
    territoryMapResetHideTimer = null;
  }

  if (resetEl.classList.contains("is-visible") && !resetEl.classList.contains("is-hiding")) {
    return;
  }

  resetEl.hidden = false;
  syncTerritoryMapResetPosition();
  resetEl.classList.remove("is-hiding", "is-visible");
  void resetEl.offsetWidth;
  resetEl.classList.add("is-visible");
}

function hideTerritoryMapReset({ immediate = false } = {}) {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl) {
    return;
  }

  if (immediate) {
    if (territoryMapResetHideTimer) {
      window.clearTimeout(territoryMapResetHideTimer);
      territoryMapResetHideTimer = null;
    }
    resetEl.hidden = true;
    resetEl.classList.remove("is-visible", "is-hiding");
    return;
  }

  if (resetEl.hidden || !resetEl.classList.contains("is-visible")) {
    return;
  }

  resetEl.classList.remove("is-visible");
  resetEl.classList.add("is-hiding");

  territoryMapResetHideTimer = window.setTimeout(() => {
    resetEl.hidden = true;
    resetEl.classList.remove("is-hiding");
    territoryMapResetHideTimer = null;
  }, TERRITORY_MAP_RESET_FADE_MS);
}

function updateTerritoryMapResetVisibility() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || typeof territoryMap.isStyleLoaded !== "function") return;

  const crossroadOpen = isTerritoryCrossroadOpen();
  const shouldShow = isTerritoryMapPanelOpen()
    && !crossroadOpen
    && !isTerritoryMapLoadingVisible()
    && territoryMap.isStyleLoaded()
    && !isTerritoryMapAtDefaultView(territoryMap);

  if (shouldShow) {
    showTerritoryMapReset();
  } else {
    hideTerritoryMapReset({ immediate: crossroadOpen });
  }
}

function resetTerritoryMapView() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  hideTerritoryAreaCard({ immediate: true });
  clearSelectedTerritory({ refreshMapView: false });

  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  if (shouldAutoFitMapToMatchingRecords(matchingRecords)) {
    focusTerritoryMapOnRecords(territoryMap, matchingRecords);
    return;
  }

  const defaultView = getTerritoryDatasetDefaultView();
  setTerritoryFilterDefaultView(defaultView.center, defaultView.zoom);
  territoryMap.flyTo({
    center: defaultView.center,
    zoom: defaultView.zoom,
    duration: TERRITORY_FOCUS_DURATION,
    curve: TERRITORY_FOCUS_FLY_CURVE,
    essential: true
  });
}

function bindTerritoryMapResetControl(territoryMap) {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl) return;

  bindTerritoryMapResetPositionSync();
  resetEl.addEventListener("click", resetTerritoryMapView);
  resetEl.addEventListener("mouseenter", () => {
    clearTerritoryMapHover?.();
  });
  territoryMap.on("moveend", updateTerritoryMapResetVisibility);
}

function scheduleInitialTerritoryMapReveal(territoryMap) {
  if (!territoryMap || territoryInitialRevealCompleted) return;

  territoryMap.once("idle", () => {
    if (territoryInitialRevealCompleted) return;
    territoryInitialRevealCompleted = true;
    revealTerritoryMapBase();
    hideTerritoryMapLoading();
  });
}

function prepareTerritoryMapForFilterReveal() {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl) return;

  loadingEl.hidden = false;
  loadingEl.classList.remove("is-hiding", "is-map-revealed");
  loadingEl.setAttribute("aria-busy", "true");
  updateTerritoryMapResetVisibility();
}

function scheduleTerritoryMapFilteredReveal(territoryMap) {
  if (!territoryMap) return;

  prepareTerritoryMapForFilterReveal();

  territoryMap.once("idle", () => {
    revealTerritoryMapBase();
    hideTerritoryMapLoading();
  });
}

function hideTerritoryRecords() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  clearTerritoryMapHover?.();
  territoryLastMatchingRecords = [];
  territoryRenderedRecords = [];
  const defaultView = getTerritoryDatasetDefaultView();
  setTerritoryFilterDefaultView(defaultView.center, defaultView.zoom);
  renderTerritoryRecords([]);
  window.territoryFilters?.updateSummary?.(0, territoryRegistry.length);
  window.territoryBrandPanel?.update?.(territoryBrands, []);
  hideTerritoryInfoCard({ immediate: true });
}

function revealTerritoryMapBase() {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl) return;
  loadingEl.classList.add("is-map-revealed");
}

function hideTerritoryMapLoading(onHidden) {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl || loadingEl.hidden) {
    window.territoryBrandPanel?.notifyLoadingHidden?.();
    onHidden?.();
    return;
  }

  loadingEl.classList.add("is-hiding");
  loadingEl.setAttribute("aria-busy", "false");

  window.setTimeout(() => {
    loadingEl.hidden = true;
    loadingEl.classList.remove("is-hiding");
    updateTerritoryMapResetVisibility();
    window.territoryBrandPanel?.notifyLoadingHidden?.();
    onHidden?.();
  }, TERRITORY_MAP_LOADING_FADE_MS);
}

function renderTerritoryMapError(message) {
  const mapContainer = document.getElementById("territoryMap");
  if (!mapContainer) return;

  hideTerritoryMapLoading();

  const error = document.createElement("div");
  error.className = "territory-map-error";
  error.textContent = message;
  mapContainer.append(error);
}

function createTerritoryTooltipController(mapInstance) {
  let tooltipEl = null;
  let activeCoordinates = null;
  let isVisible = false;

  const getTooltip = () => {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "map-point-floating-tooltip territory-map-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      document.body.append(tooltipEl);
    }

    return tooltipEl;
  };

  const renderTerritoryTooltipContent = (tooltip, geoKey, properties) => {
    const records = getTerritoryRecordsForHover(geoKey);
    if (!records.length && !properties.stateName && !geoKey) return false;

    const territoryName = resolveTerritoryTooltipName(geoKey, properties);
    const statusSummary = formatTerritoryStatusSummary(
      records.length
        ? records
        : [{ status: properties.status }].filter((record) => record.status)
    );

    if (territoryName) {
      const title = document.createElement("div");
      title.className = "map-point-tooltip-title";
      title.textContent = territoryName;
      tooltip.append(title);
    }

    if (statusSummary) {
      const statusLine = document.createElement("div");
      statusLine.className = "map-point-tooltip-detail";
      statusLine.textContent = statusSummary;
      tooltip.append(statusLine);
    }

    return Boolean(territoryName || statusSummary);
  };

  const renderBrandMarkerTooltipContent = (tooltip, properties) => {
    const brand = properties.brand || "";
    const territoryName = properties.stateName || properties.state || "";
    const status = formatTerritoryStatus(properties.status || "");
    const logo = properties.logo || "";

    if (logo) {
      const logoEl = document.createElement("img");
      logoEl.className = "territory-map-tooltip-logo";
      logoEl.src = logo;
      logoEl.alt = brand ? `${brand} logo` : "";
      tooltip.append(logoEl);
    }

    if (brand) {
      const title = document.createElement("div");
      title.className = "map-point-tooltip-title";
      title.textContent = brand;
      tooltip.append(title);
    }

    if (territoryName) {
      const territory = document.createElement("div");
      territory.className = "map-point-tooltip-detail";
      territory.textContent = territoryName;
      tooltip.append(territory);
    }

    if (status && (brand || territoryName)) {
      const divider = document.createElement("div");
      divider.className = "map-point-tooltip-divider";
      divider.setAttribute("aria-hidden", "true");
      tooltip.append(divider);
    }

    if (status) {
      const statusLine = document.createElement("div");
      statusLine.className = "map-point-tooltip-detail";
      statusLine.textContent = status;
      tooltip.append(statusLine);
    }
  };

  const renderTooltipContent = (feature) => {
    const tooltip = getTooltip();
    const properties = feature.properties || {};
    const geoKey = getStateCodeFromMapFeature(feature);

    tooltip.replaceChildren();

    if (isTerritoryMarkerFeature(feature)) {
      renderBrandMarkerTooltipContent(tooltip, properties);
      return;
    }

    if (geoKey) {
      renderTerritoryTooltipContent(tooltip, geoKey, properties);
    }
  };

  const positionTooltip = () => {
    if (!activeCoordinates || !isVisible) return;

    const tooltip = getTooltip();
    const projected = mapInstance.project(activeCoordinates);
    const containerRect = mapInstance.getContainer().getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = containerRect.left + projected.x;
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft - (tooltipRect.width / 2)),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(
      viewportPadding,
      containerRect.top + projected.y - tooltipRect.height - 14
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const show = (feature, coordinates) => {
    if (!feature || !coordinates) return;

    activeCoordinates = coordinates;
    renderTooltipContent(feature);

    const tooltip = getTooltip();
    isVisible = true;
    tooltip.classList.add("is-visible");
    positionTooltip();
  };

  const hide = () => {
    isVisible = false;
    activeCoordinates = null;
    tooltipEl?.classList.remove("is-visible");
  };

  const bind = () => {
    mapInstance.on("move", positionTooltip);
    mapInstance.on("zoom", positionTooltip);
  };

  return { bind, show, hide };
}

const territoryCompactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});
const territoryCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function getTerritoryInfoStackElement() {
  return document.getElementById("territoryInfoStack");
}

function getTerritoryInfoCardElement({ compare = false } = {}) {
  return document.getElementById(compare ? "territoryInfoCardCompare" : "territoryInfoCard");
}

function getTerritoryAreaCardElement() {
  return document.getElementById("territoryAreaCard");
}

function getTerritoryInfoDetailPane() {
  return document.getElementById("territoryInfoDetail");
}

function getTerritoryInfoTrackElement() {
  return document.getElementById("territoryInfoTrack");
}

function getTerritoryInfoFieldId(baseId, { compare = false } = {}) {
  return compare ? `${baseId}Compare` : baseId;
}

function syncTerritoryInfoBackButton() {
  const backButton = document.getElementById("territoryInfoBack");
  if (!backButton) return;
  backButton.hidden = !territoryDetailReturnGeoKey;
}

function clearTerritoryDetailReturn() {
  territoryDetailReturnGeoKey = null;
  syncTerritoryInfoBackButton();
}

function setTerritoryCardPane(pane, { animate = false } = {}) {
  const card = getTerritoryInfoCardElement();
  const areaPane = getTerritoryAreaCardElement();
  const detailPane = getTerritoryInfoDetailPane();
  const track = getTerritoryInfoTrackElement();
  if (!card) return;

  const showDetail = pane === "detail";
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const shouldAnimate = Boolean(animate && !reduceMotion && track);

  if (!shouldAnimate) {
    card.classList.add("is-jumping");
  } else {
    card.classList.remove("is-jumping");
  }

  card.classList.toggle("is-detail", showDetail);
  if (!shouldAnimate) {
    void card.offsetWidth;
    card.classList.remove("is-jumping");
  }

  card.setAttribute("aria-labelledby", showDetail ? "territoryInfoBrand" : "territoryAreaTitle");

  const closeButton = document.getElementById("territoryInfoClose");
  if (closeButton) {
    closeButton.setAttribute(
      "aria-label",
      showDetail ? "Close territory details" : "Close territory brands"
    );
  }

  if (areaPane) {
    areaPane.setAttribute("aria-hidden", String(showDetail));
    areaPane.toggleAttribute("inert", showDetail);
  }
  if (detailPane) {
    detailPane.setAttribute("aria-hidden", String(!showDetail));
    detailPane.toggleAttribute("inert", !showDetail);
  }

  const finish = () => {
    if (showDetail) {
      syncTerritoryInfoCardScrollOverflow(detailPane || card);
    } else {
      fitTerritoryAreaTitle();
      syncTerritoryInfoCardScrollOverflow(areaPane || card);
    }
  };

  if (!shouldAnimate) {
    finish();
    return;
  }

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    track.removeEventListener("transitionend", onTrackEnd);
    finish();
  };
  const onTrackEnd = (event) => {
    if (event.target === track && event.propertyName === "transform") {
      settle();
    }
  };

  track.addEventListener("transitionend", onTrackEnd);
  window.setTimeout(settle, TERRITORY_INFO_CARD_SLIDE_MS + 40);
}

function hideTerritoryInfoCard({ immediate = false } = {}) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  const compareCard = getTerritoryInfoCardElement({ compare: true });
  if (!stack || !primaryCard) return;

  if (territoryInfoHideTimer) {
    window.clearTimeout(territoryInfoHideTimer);
    territoryInfoHideTimer = null;
  }

  stack.classList.remove("is-visible", "is-compare");
  primaryCard.classList.remove("is-visible");
  compareCard?.classList.remove("is-visible");
  territoryAreaCardGeoKey = null;
  clearTerritoryDetailReturn();
  setTerritoryCardPane("area", { animate: false });

  const finishHide = () => {
    stack.hidden = true;
    primaryCard.hidden = true;
    if (compareCard) compareCard.hidden = true;
  };

  if (immediate) {
    finishHide();
    return;
  }

  territoryInfoHideTimer = window.setTimeout(() => {
    if (!stack.classList.contains("is-visible")) {
      finishHide();
    }
    territoryInfoHideTimer = null;
  }, 180);
}

function formatTerritoryInfoValue(value, formatter, prefix = "") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";
  return `${prefix}${formatter.format(numericValue)}`;
}

function formatTerritoryMarketGrowth(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";
  const absolute = Math.abs(numericValue).toFixed(1);
  if (numericValue > 0) return `+${absolute}%`;
  if (numericValue < 0) return `-${absolute}%`;
  return `${absolute}%`;
}

function updateTerritoryInfoCardScrollOverflow(host) {
  if (!host) return;

  const scrollRegion = host.querySelector(".territory-info-card__scroll");
  const overflowCard = host.closest(".territory-info-card") || host;
  if (!scrollRegion) {
    overflowCard.classList.remove("has-scroll-overflow");
    return;
  }

  if (host.id === "territoryAreaCard") return;

  const canScroll = scrollRegion.scrollHeight > scrollRegion.clientHeight + 1;
  overflowCard.classList.toggle("has-scroll-overflow", canScroll);
}

function syncTerritoryInfoCardScrollOverflow(card) {
  if (!card) return;

  updateTerritoryInfoCardScrollOverflow(card);
  window.requestAnimationFrame(() => {
    updateTerritoryInfoCardScrollOverflow(card);
  });
}

function populateTerritoryInfoCard(record, { compare = false } = {}) {
  if (!record) return;

  const brand = territoryBrandsById.get(record.brandId);
  const macrodata = territoryStateMacrodata.get(record.state);
  const brandName = brand?.brand || record.brand || "";
  const stateName = record.name || macrodata?.name || record.state;
  const card = getTerritoryInfoCardElement({ compare });

  const logo = document.getElementById(getTerritoryInfoFieldId("territoryInfoLogo", { compare }));
  if (logo) {
    logo.src = brand?.logo || "";
    logo.alt = brandName ? `${brandName} logo` : "";
  }

  document.getElementById(getTerritoryInfoFieldId("territoryInfoBrand", { compare })).textContent = brandName;
  document.getElementById(getTerritoryInfoFieldId("territoryInfoState", { compare })).textContent = stateName;
  document.getElementById(getTerritoryInfoFieldId("territoryInfoInvestment", { compare })).textContent =
    formatTerritoryInfoValue(record.initialInvestment, territoryCurrencyFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoPopulation", { compare })).textContent =
    formatTerritoryInfoValue(macrodata?.population, territoryCompactNumberFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoMedianIncome", { compare })).textContent =
    formatTerritoryInfoValue(macrodata?.medianHouseholdIncome, territoryCurrencyFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoMarketGrowth", { compare })).textContent =
    formatTerritoryMarketGrowth(macrodata?.marketGrowthPercent);

  const profileLink = document.getElementById(getTerritoryInfoFieldId("territoryInfoProfile", { compare }));
  const profileUrl = typeof brand?.profileUrl === "string" ? brand.profileUrl.trim() : "";
  if (profileLink) {
    if (profileUrl) {
      profileLink.href = profileUrl;
      profileLink.removeAttribute("aria-disabled");
      profileLink.classList.remove("is-disabled");
      profileLink.tabIndex = 0;
    } else {
      profileLink.href = "#";
      profileLink.setAttribute("aria-disabled", "true");
      profileLink.classList.add("is-disabled");
      profileLink.tabIndex = -1;
    }
  }

  syncTerritoryInfoCardScrollOverflow(compare ? card : (getTerritoryInfoDetailPane() || card));
}

function showTerritoryInfoCards(primaryRecord, compareRecord = null) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  const compareCard = getTerritoryInfoCardElement({ compare: true });
  const detailPane = getTerritoryInfoDetailPane();

  if (!stack || !primaryCard || !primaryRecord) {
    hideTerritoryInfoCard();
    return;
  }

  const recordKey = territoryRecordKey(primaryRecord);
  if (territoryInfoDismissedKey === recordKey) {
    hideTerritoryInfoCard();
    return;
  }

  if (territoryInfoHideTimer) {
    window.clearTimeout(territoryInfoHideTimer);
    territoryInfoHideTimer = null;
  }

  populateTerritoryInfoCard(primaryRecord);

  const cameFromArea = Boolean(territoryDetailReturnGeoKey);
  const shellVisible = !primaryCard.hidden && primaryCard.classList.contains("is-visible");
  const animateToDetail = cameFromArea && shellVisible && !primaryCard.classList.contains("is-detail");

  if (!cameFromArea) {
    territoryAreaCardGeoKey = null;
  }

  primaryCard.hidden = false;

  const isCompare = Boolean(compareRecord);
  stack.classList.toggle("is-compare", isCompare);

  if (isCompare && compareCard) {
    populateTerritoryInfoCard(compareRecord, { compare: true });
    compareCard.hidden = false;
  } else if (compareCard) {
    compareCard.hidden = true;
    compareCard.classList.remove("is-visible");
  }

  setTerritoryCardPane("detail", { animate: animateToDetail });
  syncTerritoryInfoBackButton();
  stack.hidden = false;
  window.requestAnimationFrame(() => {
    stack.classList.add("is-visible");
    primaryCard.classList.add("is-visible");
    syncTerritoryInfoCardScrollOverflow(detailPane || primaryCard);
    if (isCompare && compareCard) {
      compareCard.classList.add("is-visible");
      syncTerritoryInfoCardScrollOverflow(compareCard);
    }
  });
}

function showTerritoryInfoCard(record) {
  showTerritoryInfoCards(record, null);
}

function createTerritoryAreaBrandRow(record) {
  const brand = territoryBrandsById.get(record.brandId);
  const button = document.createElement("button");
  const logo = document.createElement("img");
  const identity = document.createElement("span");
  const name = document.createElement("span");
  const status = document.createElement("span");
  const chevron = document.createElement("img");
  const geoKey = record.geoKey || record.state;

  button.className = "ui-control territory-area-card__brand";
  button.type = "button";
  button.setAttribute(
    "aria-label",
    `Open ${brand?.brand || record.brand || "brand"} details for ${record.name || record.state}`
  );

  logo.className = "territory-area-card__logo";
  logo.src = brand?.logo || "";
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");

  identity.className = "territory-area-card__identity";
  name.className = "territory-area-card__name";
  name.textContent = brand?.brand || record.brand || "";
  status.className = "territory-area-card__status";
  status.textContent = formatTerritoryStatus(record.status);

  chevron.className = "territory-area-card__chevron";
  chevron.src = "assets/chevron.svg";
  chevron.alt = "";
  chevron.setAttribute("aria-hidden", "true");

  identity.append(name, status);
  button.append(logo, identity, chevron);
  button.addEventListener("click", () => {
    window.territoryMapSelection?.select?.(record.brandId, geoKey, { returnToAreaCard: true });
  });

  return button;
}

function populateTerritoryAreaCard(geoKey, properties = {}) {
  const records = getTerritoryRecordsForHover(geoKey);
  const title = document.getElementById("territoryAreaTitle");
  const shapeHost = document.getElementById("territoryAreaShape");
  const groups = document.getElementById("territoryAreaGroups");
  if (!records.length || !title || !groups) return false;

  const directRecord = records.find((record) => (record.geoKey || record.state) === geoKey);
  title.textContent = resolveTerritoryTooltipName(geoKey, {
    stateName: properties.stateName || directRecord?.name,
    state: properties.state || directRecord?.state
  });

  if (shapeHost) {
    const shapeRecord = (directRecord?.geometry ? directRecord : null)
      || records.find((record) => record.geometry);
    const shape = shapeRecord?.geometry
      ? window.territoryBrandPanel?.createShape?.(
        shapeRecord.geometry,
        TERRITORY_DENSITY_HIGH_COLOR,
        { fillOpacity: 0.4 }
      )
      : null;

    shapeHost.replaceChildren();
    if (shape) {
      shapeHost.hidden = false;
      shapeHost.append(shape);
    } else {
      shapeHost.hidden = true;
    }
  }

  const recordsByGeoType = records.reduce((groupsByType, record) => {
    const geoType = normalizeTerritoryGeoType(record.geoType);
    if (!groupsByType.has(geoType)) groupsByType.set(geoType, []);
    groupsByType.get(geoType).push(record);
    return groupsByType;
  }, new Map());

  const groupElements = [...recordsByGeoType.entries()]
    .sort(([left], [right]) => getTerritoryGeoTypeRank(right) - getTerritoryGeoTypeRank(left))
    .map(([geoType, groupRecords]) => {
      const section = document.createElement("section");
      const heading = document.createElement("h4");
      const list = document.createElement("div");

      section.className = "territory-area-card__group";
      heading.className = "territory-area-card__group-title";
      heading.textContent = TERRITORY_GEO_TYPE_LABELS[geoType] || geoType;
      list.className = "territory-area-card__brands";

      groupRecords
        .slice()
        .sort((left, right) => String(left.brand || "").localeCompare(String(right.brand || "")))
        .forEach((record) => list.append(createTerritoryAreaBrandRow(record)));

      section.append(heading, list);
      return section;
    });

  groups.replaceChildren(...groupElements);
  fitTerritoryAreaTitle();
  return true;
}

function fitTerritoryAreaTitle() {
  const title = document.getElementById("territoryAreaTitle");
  if (!title || !title.offsetParent) return;

  title.classList.remove("is-compact");
  title.classList.toggle("is-compact", title.scrollWidth > title.clientWidth + 1);
}

function showTerritoryAreaCard(geoKey, properties = {}, { animate = false } = {}) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  const areaCard = getTerritoryAreaCardElement();
  if (!stack || !primaryCard || !areaCard || !populateTerritoryAreaCard(geoKey, properties)) {
    return false;
  }

  if (territoryInfoHideTimer) {
    window.clearTimeout(territoryInfoHideTimer);
    territoryInfoHideTimer = null;
  }

  const compareCard = getTerritoryInfoCardElement({ compare: true });
  compareCard?.classList.remove("is-visible");
  if (compareCard) compareCard.hidden = true;

  territoryAreaCardGeoKey = geoKey;
  stack.classList.remove("is-compare");
  stack.hidden = false;
  primaryCard.hidden = false;
  setTerritoryCardPane("area", { animate });
  window.requestAnimationFrame(() => {
    stack.classList.add("is-visible");
    primaryCard.classList.add("is-visible");
    fitTerritoryAreaTitle();
    syncTerritoryInfoCardScrollOverflow(areaCard);
  });
  return true;
}

function returnToTerritoryAreaCard() {
  const geoKey = territoryDetailReturnGeoKey;
  if (!geoKey) return;

  clearTerritoryDetailReturn();
  selectedTerritoryKey = null;
  compareTerritoryKey = null;
  territoryInfoDismissedKey = null;
  syncSelectedTerritoryMap({ refreshMapView: false, skipInfoCard: true });

  if (!populateTerritoryAreaCard(geoKey)) {
    hideTerritoryInfoCard();
    return;
  }

  territoryAreaCardGeoKey = geoKey;
  setTerritoryCardPane("area", { animate: true });

  window.requestAnimationFrame(() => {
    focusTerritoryMapOnState(window.territoryMap, geoKey, { reserveInfoCard: true });
  });
}

function hideTerritoryAreaCard({ immediate = false } = {}) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  if (!stack || !primaryCard || !territoryAreaCardGeoKey) {
    territoryAreaCardGeoKey = null;
    return;
  }

  if (primaryCard.classList.contains("is-detail") || primaryCard.hidden) {
    territoryAreaCardGeoKey = null;
    return;
  }

  territoryAreaCardGeoKey = null;
  primaryCard.classList.remove("is-visible");
  stack.classList.remove("is-visible");

  const finishHide = () => {
    primaryCard.hidden = true;
    stack.hidden = true;
    setTerritoryCardPane("area", { animate: false });
  };

  if (immediate) {
    finishHide();
  } else {
    window.setTimeout(() => {
      if (!primaryCard.classList.contains("is-visible")) finishHide();
    }, 180);
  }
}

function bindTerritoryInfoCard() {
  const primaryClose = document.getElementById("territoryInfoClose");
  const primaryBack = document.getElementById("territoryInfoBack");
  const compareClose = document.getElementById("territoryInfoCloseCompare");
  const primaryCard = getTerritoryInfoCardElement();
  const compareCard = getTerritoryInfoCardElement({ compare: true });
  const areaCard = getTerritoryAreaCardElement();
  const detailPane = getTerritoryInfoDetailPane();

  if (primaryBack && primaryBack.dataset.bound !== "true") {
    primaryBack.dataset.bound = "true";
    primaryBack.addEventListener("click", () => {
      returnToTerritoryAreaCard();
    });
  }

  if (primaryClose && primaryClose.dataset.bound !== "true") {
    primaryClose.dataset.bound = "true";
    primaryClose.addEventListener("click", () => {
      resetTerritoryMapView();
    });
  }

  if (compareClose && compareClose.dataset.bound !== "true") {
    compareClose.dataset.bound = "true";
    compareClose.addEventListener("click", () => {
      clearCompareTerritory();
    });
  }

  [detailPane, compareCard, areaCard].forEach((card) => {
    const scrollRegion = card?.querySelector(".territory-info-card__scroll");
    if (!scrollRegion || scrollRegion.dataset.overflowBound === "true") return;

    scrollRegion.dataset.overflowBound = "true";
    scrollRegion.addEventListener("scroll", () => {
      updateTerritoryInfoCardScrollOverflow(card);
    }, { passive: true });
  });

  [primaryCard, compareCard].forEach((card) => {
    const profileLink = card?.querySelector(".territory-info-card__action[href]");
    if (!profileLink || profileLink.dataset.profileBound === "true") return;

    profileLink.dataset.profileBound = "true";
    profileLink.addEventListener("click", (event) => {
      if (profileLink.getAttribute("aria-disabled") === "true" || profileLink.classList.contains("is-disabled")) {
        event.preventDefault();
      }
    });
  });

  if (!bindTerritoryInfoCard.resizeBound) {
    bindTerritoryInfoCard.resizeBound = true;
    window.addEventListener("resize", () => {
      syncTerritoryInfoCardScrollOverflow(getTerritoryInfoDetailPane() || getTerritoryInfoCardElement());
      syncTerritoryInfoCardScrollOverflow(getTerritoryInfoCardElement({ compare: true }));
      syncTerritoryInfoCardScrollOverflow(getTerritoryAreaCardElement());
      fitTerritoryAreaTitle();
    });
  }
}

function getStateCodeFromMapFeature(feature) {
  return feature.properties?.geoKey || feature.properties?.state || null;
}

function getTerritoryRecordsForState(geoKey) {
  const matchingRecords = territoryRenderedRecords || territoryLastMatchingRecords || territoryRegistry;
  return matchingRecords.filter((record) => (record.geoKey || record.state) === geoKey);
}

function territoryBoundsIntersect(left, right) {
  if (!left || !right) return false;
  return !(
    left.east < right.west
    || left.west > right.east
    || left.north < right.south
    || left.south > right.north
  );
}

function doTerritoryGeometriesIntersect(left, right) {
  const leftKey = left.geoKey || left.state;
  const rightKey = right.geoKey || right.state;
  const cacheKey = [leftKey, rightKey].sort().join("|");
  if (territoryIntersectionCache.has(cacheKey)) {
    return territoryIntersectionCache.get(cacheKey);
  }

  let intersects = false;
  if (territoryBoundsIntersect(left.geometryBounds, right.geometryBounds)) {
    try {
      intersects = Boolean(
        window.turf?.booleanIntersects?.(
          window.turf.feature(left.geometry),
          window.turf.feature(right.geometry)
        )
      );
    } catch (error) {
      console.warn("Unable to compare territory intersection", leftKey, rightKey, error);
    }
  }

  territoryIntersectionCache.set(cacheKey, intersects);
  return intersects;
}

function rebuildTerritoryIntersectionIndex(matchingRecords) {
  const territoriesByGeoKey = new Map();

  matchingRecords.forEach((record) => {
    const geoKey = record.geoKey || record.state;
    if (!geoKey || !record.geometry || territoriesByGeoKey.has(geoKey)) return;
    territoriesByGeoKey.set(geoKey, record);
  });

  const territories = [...territoriesByGeoKey.values()];
  const nextIndex = new Map();

  territories.forEach((territory) => {
    const geoKey = territory.geoKey || territory.state;
    const rank = getTerritoryGeoTypeRank(territory.geoType);
    const largerIntersections = territories
      .filter((candidate) => (
        getTerritoryGeoTypeRank(candidate.geoType) < rank
        && doTerritoryGeometriesIntersect(territory, candidate)
      ))
      .map((candidate) => candidate.geoKey || candidate.state);

    nextIndex.set(geoKey, largerIntersections);
  });

  territoryIntersectionIndex = nextIndex;
}

function getTerritoryRecordsForHover(geoKey) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  const includedGeoKeys = new Set([
    geoKey,
    ...(territoryIntersectionIndex.get(geoKey) || [])
  ]);

  return matchingRecords.filter((record) => (
    includedGeoKeys.has(record.geoKey || record.state)
  ));
}

function getVisibleOccupantsForState(stateCode) {
  const matchingRecords = territoryRenderedRecords || territoryLastMatchingRecords || territoryRegistry;
  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const occupants = territoryStateOccupancy.get(stateCode) || [];

  return occupants.filter((occupantId) => matchingKeys.has(`${occupantId}:${stateCode}`));
}

function getVisibleOccupantBrandsForState(stateCode) {
  return getVisibleOccupantsForState(stateCode)
    .map((occupantId) => territoryBrandsById.get(occupantId))
    .filter(Boolean);
}

function isSharedTerritoryState(stateCode) {
  return Boolean(stateCode) && getVisibleSharedOccupantCount(stateCode) >= 2;
}

function getTerritoryMapFlyTargetZoom(
  territoryMap,
  camera,
  { allowZoomOut = true, clampMaxZoom = true } = {}
) {
  let targetZoom = clampMaxZoom
    ? Math.min(camera.zoom, TERRITORY_FOCUS_MAX_ZOOM)
    : camera.zoom;

  if (!allowZoomOut) {
    const currentZoom = territoryMap.getZoom();
    const zoomCeiling = clampMaxZoom ? TERRITORY_FOCUS_MAX_ZOOM : Infinity;
    if (currentZoom <= zoomCeiling) {
      targetZoom = Math.max(targetZoom, currentZoom);
    }
  }

  return targetZoom;
}

function flyTerritoryMapToCamera(
  territoryMap,
  camera,
  { allowZoomOut = true, clampMaxZoom = true, offset = null } = {}
) {
  if (!territoryMap || !camera) return;

  const targetZoom = getTerritoryMapFlyTargetZoom(territoryMap, camera, {
    allowZoomOut,
    clampMaxZoom
  });

  territoryMap.flyTo({
    center: camera.center,
    zoom: targetZoom,
    duration: TERRITORY_FOCUS_DURATION,
    curve: TERRITORY_FOCUS_FLY_CURVE,
    ...(offset ? { offset } : {}),
    essential: true
  });
}

function getMatchingRecordsBounds(matchingRecords) {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  let hasBounds = false;

  matchingRecords.forEach((record) => {
    const geometry = record.geometry || territoryStatesByCode.get(record.state)?.geometry;
    if (!geometry) return;

    const geometryBounds = getGeometryBounds(geometry);
    if (!geometryBounds) return;

    hasBounds = true;
    if (geometryBounds.west < west) west = geometryBounds.west;
    if (geometryBounds.east > east) east = geometryBounds.east;
    if (geometryBounds.south < south) south = geometryBounds.south;
    if (geometryBounds.north > north) north = geometryBounds.north;
  });

  getTerritoryRadiusFeatureCollection().features.forEach((feature) => {
    const circleBounds = getGeometryBounds(feature.geometry);
    if (!circleBounds) return;

    hasBounds = true;
    if (circleBounds.west < west) west = circleBounds.west;
    if (circleBounds.east > east) east = circleBounds.east;
    if (circleBounds.south < south) south = circleBounds.south;
    if (circleBounds.north > north) north = circleBounds.north;
  });

  if (!hasBounds) return null;

  return { west, east, south, north };
}

function getTerritoryRadiusBounds() {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  let hasBounds = false;

  getTerritoryRadiusFeatureCollection().features.forEach((feature) => {
    const circleBounds = getGeometryBounds(feature.geometry);
    if (!circleBounds) return;

    hasBounds = true;
    if (circleBounds.west < west) west = circleBounds.west;
    if (circleBounds.east > east) east = circleBounds.east;
    if (circleBounds.south < south) south = circleBounds.south;
    if (circleBounds.north > north) north = circleBounds.north;
  });

  if (!hasBounds) return null;

  return { west, east, south, north };
}

function getTerritoryFilterFocusBounds(matchingRecords) {
  // City / radius searches should frame the search circles, not giant CBSA
  // polygons that would keep the camera at a continent overview.
  const radiusBounds = getTerritoryRadiusBounds();
  if (radiusBounds) return radiusBounds;

  return getMatchingRecordsBounds(matchingRecords);
}

function focusTerritoryMapOnRecords(territoryMap, matchingRecords) {
  const camera = getTerritoryRecordsFilterCamera(territoryMap, matchingRecords);
  if (!camera) return;

  const targetZoom = getTerritoryMapFlyTargetZoom(territoryMap, camera, {
    allowZoomOut: true,
    clampMaxZoom: false
  });
  setTerritoryFilterDefaultView(camera.center, targetZoom);
  flyTerritoryMapToCamera(territoryMap, camera, {
    allowZoomOut: true,
    clampMaxZoom: false
  });

  territoryMap.once("moveend", () => {
    captureTerritoryFilterDefaultViewFromMap(territoryMap);
    updateTerritoryMapResetVisibility();
  });
}

function isTerritoryMapReadyToFit(territoryMap) {
  const container = territoryMap?.getContainer();
  const width = container?.clientWidth || 0;
  const height = container?.clientHeight || 0;
  return width > 0 && height > 0 && Boolean(territoryMap.isStyleLoaded?.());
}

function scheduleTerritoryMapViewForFilters(territoryMap, matchingRecords) {
  if (!territoryMap || territoryHoldInitialRender) return;

  territoryFilterFitRevision += 1;
  const fitRevision = territoryFilterFitRevision;

  const applyFilterView = () => {
    if (fitRevision !== territoryFilterFitRevision) return;

    territoryMap.resize();
    if (!isTerritoryMapReadyToFit(territoryMap)) {
      if (!isTerritoryMapPanelOpen()) return;

      const retryFit = () => {
        if (fitRevision !== territoryFilterFitRevision) return;
        whenTerritoryMapPanelLayoutSettled().then(() => {
          window.requestAnimationFrame(applyFilterView);
        });
      };

      territoryMap.once("idle", retryFit);
      window.setTimeout(retryFit, 80);
      return;
    }

    if (shouldAutoFitMapToMatchingRecords(matchingRecords)) {
      focusTerritoryMapOnRecords(territoryMap, matchingRecords);
      return;
    }

    const defaultView = getTerritoryDatasetDefaultView();
    setTerritoryFilterDefaultView(defaultView.center, defaultView.zoom);

    if (!isTerritoryMapAtDefaultView(territoryMap)) {
      territoryMap.flyTo({
        center: defaultView.center,
        zoom: defaultView.zoom,
        duration: TERRITORY_FOCUS_DURATION,
        curve: TERRITORY_FOCUS_FLY_CURVE,
        essential: true
      });

      territoryMap.once("moveend", () => {
        updateTerritoryMapResetVisibility();
      });
    }
  };

  whenTerritoryMapPanelLayoutSettled().then(() => {
    window.requestAnimationFrame(applyFilterView);
  });
}

function getTerritoryShapeFocusPadding(territoryMap) {
  const container = territoryMap?.getContainer();
  const width = container?.clientWidth || window.innerWidth;
  const height = container?.clientHeight || window.innerHeight;
  const preferred = width >= TERRITORY_SHAPE_FOCUS_BREAKPOINT
    ? TERRITORY_SHAPE_FOCUS_PADDING_LARGE
    : TERRITORY_SHAPE_FOCUS_PADDING_SMALL;
  // Leave enough room for cameraForBounds when the map pane is narrow.
  const maxPadding = Math.floor(Math.min(width, height) / 2) - 24;

  return Math.max(24, Math.min(preferred, maxPadding));
}

function getTerritoryInfoOverlayInset(territoryMap, { allowFallback = false } = {}) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  const compareCard = getTerritoryInfoCardElement({ compare: true });
  const fallbackInset = allowFallback
    ? TERRITORY_INFO_CARD_FALLBACK_HEIGHT + 24
    : 0;
  const visibleCards = [primaryCard, compareCard].filter((card) => (
    card && !card.hidden
  ));

  if (!territoryMap || !stack || stack.hidden || !visibleCards.length) {
    return fallbackInset;
  }

  // Use layout sizes (not getBoundingClientRect) so the card's enter transform
  // does not under-count the overlay while it animates in.
  const bottomGap = Number.parseFloat(window.getComputedStyle(stack).bottom) || 24;
  const cardHeight = Math.max(...visibleCards.map((card) => card.offsetHeight || 0));

  if (!cardHeight) return fallbackInset;

  return Math.round(bottomGap + cardHeight);
}

function getTerritorySelectionShapeFocusOptions(territoryMap) {
  const container = territoryMap?.getContainer();
  const width = container?.clientWidth || window.innerWidth;
  const height = container?.clientHeight || window.innerHeight;
  const isLarge = width >= TERRITORY_SHAPE_FOCUS_BREAKPOINT;
  const edge = isLarge
    ? TERRITORY_SELECTION_FOCUS_EDGE_LARGE
    : TERRITORY_SELECTION_FOCUS_EDGE_SMALL;
  const side = isLarge
    ? TERRITORY_SHAPE_FOCUS_PADDING_LARGE
    : TERRITORY_SHAPE_FOCUS_PADDING_SMALL;
  const overlayInset = getTerritoryInfoOverlayInset(territoryMap, { allowFallback: true });

  const top = Math.max(24, Math.min(edge, Math.floor(height / 2) - 24));
  const bottom = Math.max(
    top,
    Math.min(overlayInset + edge, height - top - 48)
  );
  const horizontal = Math.max(24, Math.min(side, Math.floor(width / 2) - 24));

  // Mapbox GL v3 averages asymmetric padding when fitting bounds, so top/bottom
  // alone will not lift the shape above the detail card. Convert the asymmetry
  // into a screen-space offset. Negative Y shifts the camera center south so the
  // fitted geometry sits higher (above the bottom overlay).
  return {
    padding: {
      top,
      right: horizontal,
      bottom,
      left: horizontal
    },
    offset: [0, (top - bottom) / 2]
  };
}

function getTerritoryFeatureByGeoKey(geoKey) {
  if (!geoKey) return null;

  if (territoryGeoLevel === "geo") {
    return territoryGeoFeaturesByKey.get(geoKey)
      || territoryCountiesByFips.get(geoKey)
      || territoryStatesByCode.get(geoKey)
      || null;
  }

  if (territoryGeoLevel === "county") {
    return territoryCountiesByFips.get(geoKey)
      || territoryGeoFeaturesByKey.get(geoKey)
      || territoryStatesByCode.get(geoKey)
      || null;
  }

  return territoryStatesByCode.get(geoKey)
    || territoryGeoFeaturesByKey.get(geoKey)
    || territoryCountiesByFips.get(geoKey)
    || null;
}

function focusTerritoryMapOnBounds(territoryMap, bounds, { reserveInfoCard = false } = {}) {
  if (!territoryMap || !bounds || !window.mapboxgl) return;

  const focusOptions = reserveInfoCard
    ? getTerritorySelectionShapeFocusOptions(territoryMap)
    : { padding: getTerritoryShapeFocusPadding(territoryMap) };

  const camera = territoryMap.cameraForBounds(bounds, focusOptions);
  // Offset is already baked into camera.center by cameraForBounds.
  flyTerritoryMapToCamera(territoryMap, camera, {
    allowZoomOut: true,
    clampMaxZoom: false
  });
}

function focusTerritoryMapOnSelectedRecords(territoryMap, records) {
  if (!territoryMap || !records.length || !window.mapboxgl) return;

  if (records.length === 1) {
    const record = records[0];
    const bounds = record.geometryBounds || getGeometryBounds(record.geometry);
    if (bounds) {
      focusTerritoryMapOnBounds(
        territoryMap,
        new mapboxgl.LngLatBounds([bounds.west, bounds.south], [bounds.east, bounds.north]),
        { reserveInfoCard: true }
      );
      return;
    }

    focusTerritoryMapOnState(territoryMap, record.geoKey || record.state, {
      reserveInfoCard: true
    });
    return;
  }

  const recordBounds = getMatchingRecordsBounds(records);
  if (!recordBounds) return;

  const { west, east, south, north } = recordBounds;
  focusTerritoryMapOnBounds(
    territoryMap,
    new mapboxgl.LngLatBounds([west, south], [east, north]),
    { reserveInfoCard: true }
  );
}

function focusTerritoryMapOnState(territoryMap, stateCode, { reserveInfoCard = false } = {}) {
  if (!territoryMap || !stateCode || !window.mapboxgl) return;

  const stateFeature = getTerritoryFeatureByGeoKey(stateCode);
  if (!stateFeature?.geometry) return;

  const geometryBounds = getGeometryBounds(stateFeature.geometry);
  if (!geometryBounds) return;

  const { west, east, south, north } = geometryBounds;
  focusTerritoryMapOnBounds(
    territoryMap,
    new mapboxgl.LngLatBounds([west, south], [east, north]),
    { reserveInfoCard }
  );
}

function clearTerritoryDensityHover(territoryMap) {
  if (!hoveredDensityGeoKey || !territoryMap?.getSource(TERRITORY_DENSITY_SOURCE_ID)) return;

  territoryMap.setFeatureState({
    source: TERRITORY_DENSITY_SOURCE_ID,
    id: hoveredDensityGeoKey
  }, { hover: false });
  hoveredDensityGeoKey = null;
}

function setTerritoryDensityHover(territoryMap, geoKey) {
  if (!territoryDensityEnabled || !geoKey || !territoryMap?.getSource(TERRITORY_DENSITY_SOURCE_ID)) {
    return false;
  }
  if (hoveredDensityGeoKey === geoKey) return true;

  clearTerritoryDensityHover(territoryMap);
  territoryMap.setFeatureState({
    source: TERRITORY_DENSITY_SOURCE_ID,
    id: geoKey
  }, { hover: true });
  hoveredDensityGeoKey = geoKey;
  return true;
}

function hideSharedTerritoryStroke(territoryMap, geoKey) {
  if (!territorySharedConsolidated || !territoryBordersEnabled) return null;
  if (!territorySharedConsolidated.visibleGeoKeys.includes(geoKey)) return null;

  territorySharedConsolidated.hiddenStrokeGeoKey = geoKey;
  setTerritoryLayerFilter(
    territoryMap,
    TERRITORY_SHARED_ALL_STROKE_LAYER_ID,
    buildConsolidatedSharedStrokeFilter(territorySharedConsolidated.visibleGeoKeys, geoKey)
  );

  return { geoKey };
}

function restoreSharedTerritoryStroke(territoryMap, sharedStroke) {
  if (!territorySharedConsolidated || !sharedStroke) return;
  if (territorySharedConsolidated.hiddenStrokeGeoKey !== sharedStroke.geoKey) return;

  territorySharedConsolidated.hiddenStrokeGeoKey = null;
  setTerritoryLayerFilter(
    territoryMap,
    TERRITORY_SHARED_ALL_STROKE_LAYER_ID,
    buildConsolidatedSharedStrokeFilter(territorySharedConsolidated.visibleGeoKeys, null)
  );
}

function isTerritoryMarkerFeature(feature) {
  const layerId = feature?.layer?.id || "";
  return layerId.endsWith("-logo");
}

function isTerritoryDensityHoverFeature(feature) {
  const layerId = feature?.layer?.id || "";
  return layerId === TERRITORY_DENSITY_FILL_LAYER_ID
    || layerId === TERRITORY_DENSITY_LINE_LAYER_ID;
}

function getTerritoryHoverLayerIds(territoryMap = window.territoryMap) {
  if (!territoryMap) return territoryBaseHoverLayerIds;

  const densityLayerIds = territoryDensityEnabled
    ? [TERRITORY_DENSITY_FILL_LAYER_ID, TERRITORY_DENSITY_LINE_LAYER_ID]
      .filter((layerId) => territoryMap.getLayer(layerId))
    : [];

  return [...densityLayerIds, ...territoryBaseHoverLayerIds];
}

function pickTerritoryHoverFeature(features) {
  if (!features.length) return null;

  const candidates = territoryDensityEnabled
    ? features.filter(isTerritoryDensityHoverFeature)
    : features;
  if (!candidates.length) return null;

  const highestGeoRank = Math.max(
    ...candidates.map((feature) => (
      Number(feature.properties?.geoRank)
      || getTerritoryGeoTypeRank(feature.properties?.geoType)
    ))
  );
  const smallestTerritoryFeatures = candidates.filter((feature) => {
    const rank = Number(feature.properties?.geoRank)
      || getTerritoryGeoTypeRank(feature.properties?.geoType);
    return rank === highestGeoRank;
  });

  return smallestTerritoryFeatures.find(isTerritoryMarkerFeature)
    || smallestTerritoryFeatures.find(isTerritoryDensityHoverFeature)
    || smallestTerritoryFeatures[0];
}

// Temporarily include a (possibly shared) state in a brand's fill/hatch/line
// filters and mark it hovered so that brand's color paints the territory.
function applyBrandTerritoryHoverHighlight(territoryMap, brandId, geoKey) {
  if (territoryDensityEnabled) return null;

  const layerIds = territoryBrandLayerIds.get(brandId);
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  const record = matchingRecords.find((candidate) => (
    candidate.brandId === brandId
    && (candidate.geoKey || candidate.state) === geoKey
  ));
  const geoLayers = layerIds?.geoLayers?.get(normalizeTerritoryGeoType(record?.geoType));
  if (!territoryMap || !geoLayers?.fillLayerId || !territoryMap.getLayer(geoLayers.fillLayerId)) {
    return null;
  }

  const featureState = {
    source: `territories-${brandId}`,
    id: geoKey
  };
  const geoKeyFilter = ["==", ["get", "geoKey"], geoKey];
  const hoverTargets = [
    {
      layerId: geoLayers.fillLayerId,
      statusFilter: TERRITORY_STATUS_NON_ESTABLISHED_FILTER
    },
    {
      layerId: geoLayers.hatchLayerId,
      statusFilter: TERRITORY_STATUS_ESTABLISHED_FILTER
    },
    {
      layerId: geoLayers.lineLayerId,
      statusFilter: null
    }
  ].filter((target) => target.layerId && territoryMap.getLayer(target.layerId));

  const layerFilters = hoverTargets.map(({ layerId, statusFilter }) => {
    const originalFilter = territoryMap.getFilter(layerId);
    const stateStatusFilter = combineTerritoryFilters(geoKeyFilter, statusFilter);
    const hoverFilter = originalFilter
      ? ["any", originalFilter, stateStatusFilter]
      : stateStatusFilter;

    territoryMap.setFilter(layerId, hoverFilter);
    return { layerId, originalFilter };
  });

  // Hide the shared multi-color outline so the brand border reads clearly.
  const sharedStroke = hideSharedTerritoryStroke(territoryMap, geoKey);

  if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId) && territoryBordersEnabled) {
    territoryMap.setLayoutProperty(geoLayers.lineLayerId, "visibility", "visible");
  }

  territoryMap.setFeatureState(featureState, { hover: true });

  return { featureState, layerFilters, sharedStroke };
}

function clearBrandTerritoryHoverHighlight(territoryMap, highlight) {
  if (!territoryMap || !highlight) return;

  territoryMap.setFeatureState(highlight.featureState, { hover: false });
  highlight.layerFilters.forEach(({ layerId, originalFilter }) => {
    if (territoryMap.getLayer(layerId)) {
      territoryMap.setFilter(layerId, originalFilter);
    }
  });

  restoreSharedTerritoryStroke(territoryMap, highlight.sharedStroke);
}

function bindTerritoryHoverInteractions(territoryMap, interactiveLayerIds, clickLayerIds = interactiveLayerIds) {
  if (!interactiveLayerIds.length && !clickLayerIds.length) return;

  territoryBaseHoverLayerIds = interactiveLayerIds.slice();

  const tooltip = createTerritoryTooltipController(territoryMap);
  let hoveredFeatureKey = null;
  let hoveredFeatureState = null;
  let hoveredBrandHighlight = null;

  const clearHoveredFeatureState = () => {
    if (hoveredBrandHighlight) {
      clearBrandTerritoryHoverHighlight(territoryMap, hoveredBrandHighlight);
      hoveredBrandHighlight = null;
    }

    if (hoveredFeatureState) {
      territoryMap.setFeatureState(hoveredFeatureState, { hover: false });
      hoveredFeatureState = null;
    }

    clearTerritoryDensityHover(territoryMap);
  };

  const setHoveredFeatureState = (feature) => {
    const stateCode = getStateCodeFromMapFeature(feature);
    const brandId = feature.properties?.brandId;

    if (stateCode && territoryDensityEnabled) {
      const nextKey = `density-${stateCode}`;
      if (hoveredFeatureKey === nextKey) return;

      clearHoveredFeatureState();
      if (setTerritoryDensityHover(territoryMap, stateCode)) {
        hoveredFeatureKey = nextKey;
      }
      return;
    }

    // Marker over a shared territory → paint that brand's color on the state.
    if (
      stateCode
      && brandId
      && isTerritoryMarkerFeature(feature)
      && isSharedTerritoryState(stateCode)
      && !territoryDensityEnabled
    ) {
      const nextKey = `marker-brand-${brandId}-${stateCode}`;
      if (hoveredFeatureKey === nextKey) return;

      clearHoveredFeatureState();
      hoveredBrandHighlight = applyBrandTerritoryHoverHighlight(territoryMap, brandId, stateCode);
      if (hoveredBrandHighlight) {
        hoveredFeatureKey = nextKey;
      }
      return;
    }

    const id = feature.id ?? feature.properties?.state;
    const source = brandId ? `territories-${brandId}` : (feature.source || feature.layer?.source);

    if (source == null || id == null) return;

    const nextState = { source, id };
    const nextKey = `${source}-${id}`;

    if (hoveredFeatureKey === nextKey) return;

    clearHoveredFeatureState();
    territoryMap.setFeatureState(nextState, { hover: true });
    hoveredFeatureState = nextState;
    hoveredFeatureKey = nextKey;
  };

  const clearHover = () => {
    hoveredFeatureKey = null;
    clearHoveredFeatureState();
    territoryMap.getCanvas().style.cursor = "";
    tooltip.hide();
  };

  clearTerritoryMapHover = clearHover;

  tooltip.bind();

  territoryMap.on("mousemove", (event) => {
    const hoverLayerIds = getTerritoryHoverLayerIds(territoryMap);
    const features = territoryMap.queryRenderedFeatures(event.point, { layers: hoverLayerIds });
    // Prefer density fills, then brand markers, then the topmost territory layer.
    const feature = pickTerritoryHoverFeature(features);

    if (!feature) {
      clearHover();
      return;
    }

    territoryMap.getCanvas().style.cursor = "pointer";
    setHoveredFeatureState(feature);
    tooltip.show(feature, event.lngLat);
  });

  territoryMap.on("mouseleave", clearHover);

  const crossroad = document.getElementById("territoryCrossroad");
  crossroad?.addEventListener("pointerenter", clearHover);

  if (!clickLayerIds.length) return;

  territoryMap.on("click", (event) => {
    const hoverLayerIds = getTerritoryHoverLayerIds(territoryMap);
    const features = territoryMap.queryRenderedFeatures(event.point, { layers: hoverLayerIds });
    if (!features.length) return;

    const markerFeature = features.find(isTerritoryMarkerFeature);
    if (markerFeature) {
      const stateCode = getStateCodeFromMapFeature(markerFeature);
      const brandId = markerFeature.properties?.brandId;
      if (!stateCode || !brandId) return;

      window.territoryMapSelection?.toggle?.(brandId, stateCode, {
        compare: Boolean(event.originalEvent.metaKey || event.originalEvent.ctrlKey)
      });
      return;
    }

    const feature = pickTerritoryHoverFeature(features) || features[0];
    const geoKey = getStateCodeFromMapFeature(feature);
    if (!geoKey) return;

    if (selectedTerritoryKey || compareTerritoryKey) {
      clearSelectedTerritory({ refreshMapView: false });
    }
    if (!showTerritoryAreaCard(geoKey, feature.properties || {})) {
      focusTerritoryMapOnState(territoryMap, geoKey);
      return;
    }

    window.requestAnimationFrame(() => {
      focusTerritoryMapOnState(territoryMap, geoKey, { reserveInfoCard: true });
    });
  });
}

function ringSignedArea(ring) {
  let area = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x0, y0] = ring[index];
    const [x1, y1] = ring[index + 1];
    area += (x0 * y1) - (x1 * y0);
  }

  return area / 2;
}

function getRingCentroid(ring) {
  let area = 0;
  let x = 0;
  let y = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x0, y0] = ring[index];
    const [x1, y1] = ring[index + 1];
    const cross = (x0 * y1) - (x1 * y0);
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }

  area *= 0.5;

  if (area === 0) {
    const coordinates = ring.slice(0, -1);
    const count = coordinates.length;

    if (!count) return null;

    return [
      coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / count,
      coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / count
    ];
  }

  return [x / (6 * area), y / (6 * area)];
}

function getTerritoryCentroid(geometry) {
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];

  if (!polygons.length) return null;

  let largestRing = polygons[0][0];
  let largestArea = Math.abs(ringSignedArea(largestRing));

  polygons.forEach((polygon) => {
    const ring = polygon[0];
    const area = Math.abs(ringSignedArea(ring));

    if (area > largestArea) {
      largestArea = area;
      largestRing = ring;
    }
  });

  return getRingCentroid(largestRing);
}

function createTerritoryRadiusCircleFeature(center, radiusMiles, stateCode, pointCount = 96) {
  const earthRadiusMiles = 3958.8;
  const centerLongitude = (center[0] * Math.PI) / 180;
  const centerLatitude = (center[1] * Math.PI) / 180;
  const angularDistance = radiusMiles / earthRadiusMiles;
  const ring = [];

  for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
    const bearing = (pointIndex / pointCount) * 2 * Math.PI;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance)
      + Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLongitude = centerLongitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
      Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(pointLatitude)
    );

    ring.push([(pointLongitude * 180) / Math.PI, (pointLatitude * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    properties: { state: stateCode },
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    }
  };
}

function getTerritoryRadiusFeatureCollection() {
  // Hide the radius overlay while inspecting a selected territory.
  if (selectedTerritoryKey || compareTerritoryKey) {
    return { type: "FeatureCollection", features: [] };
  }

  if (!territoryRadiusFilter.enabled || !territoryRadiusFilter.centers.length) {
    return { type: "FeatureCollection", features: [] };
  }

  const features = territoryRadiusFilter.centers.flatMap(({ state, center }) => {
    if (!Array.isArray(center) || center.length < 2) return [];

    return [
      createTerritoryRadiusCircleFeature(
        center,
        territoryRadiusFilter.miles,
        state
      )
    ];
  });

  return { type: "FeatureCollection", features };
}

function syncTerritoryRadiusOverlay() {
  window.territoryMap
    ?.getSource(TERRITORY_RADIUS_SOURCE_ID)
    ?.setData(getTerritoryRadiusFeatureCollection());
}

function ensureTerritoryRadiusLayers(territoryMap) {
  if (!territoryMap || territoryMap.getSource(TERRITORY_RADIUS_SOURCE_ID)) return;

  territoryMap.addSource(TERRITORY_RADIUS_SOURCE_ID, {
    type: "geojson",
    data: getTerritoryRadiusFeatureCollection()
  });

  territoryMap.addLayer({
    id: TERRITORY_RADIUS_FILL_LAYER_ID,
    type: "fill",
    source: TERRITORY_RADIUS_SOURCE_ID,
    paint: {
      "fill-color": "#7a63dd",
      "fill-opacity": 0.12
    }
  });

  territoryMap.addLayer({
    id: TERRITORY_RADIUS_OUTLINE_LAYER_ID,
    type: "line",
    source: TERRITORY_RADIUS_SOURCE_ID,
    paint: {
      "line-color": "#7a63dd",
      "line-width": 1.5,
      "line-opacity": 0.55
    }
  });
}

function setTerritoryRadiusFilter({ enabled = false, miles = 300, centers = [] } = {}) {
  const numericMiles = Number(miles);
  territoryRadiusFilter = {
    enabled: Boolean(enabled),
    miles: Number.isFinite(numericMiles) ? numericMiles : 300,
    centers: centers
      .map(({ state, center }) => ({
        state: String(state || ""),
        center: Array.isArray(center) && center.length >= 2
          ? [Number(center[0]), Number(center[1])]
          : null
      }))
      .filter(({ state, center }) => state && center && center.every(Number.isFinite))
  };

  window.territoryMap
    ?.getSource(TERRITORY_RADIUS_SOURCE_ID)
    ?.setData(getTerritoryRadiusFeatureCollection());

  syncTerritoryRadiusOutsideFade(window.territoryMap);
}

function isTerritoryRadiusFadeActive() {
  return Boolean(
    !selectedTerritoryKey
    && !compareTerritoryKey
    && territoryRadiusFilter.enabled
    && territoryRadiusFilter.centers.length
    && typeof turf !== "undefined"
  );
}

function getRadiusOutsideGeoKey(geoKey) {
  return `${geoKey}${TERRITORY_RADIUS_OUTSIDE_GEOKEY_SUFFIX}`;
}

function expandGeoKeysForRadiusFade(geoKeys) {
  if (!isTerritoryRadiusFadeActive()) return geoKeys;
  return geoKeys.flatMap((geoKey) => [geoKey, getRadiusOutsideGeoKey(geoKey)]);
}

function getTerritoryRadiusFadeSignature(visibleGeoKeys = []) {
  if (!isTerritoryRadiusFadeActive()) return "";

  const centersKey = territoryRadiusFilter.centers
    .map(({ state, center }) => `${state}:${center[0].toFixed(4)},${center[1].toFixed(4)}`)
    .join("|");
  const geoKeysKey = [...visibleGeoKeys].sort().join(",");
  return `${territoryRadiusFilter.miles}::${centersKey}::${geoKeysKey}`;
}

function getTerritoryRadiusMaskFeature() {
  if (!isTerritoryRadiusFadeActive()) return null;

  const circles = territoryRadiusFilter.centers.flatMap(({ state, center }) => {
    if (!Array.isArray(center) || center.length < 2) return [];
    return [createTerritoryRadiusCircleFeature(center, territoryRadiusFilter.miles, state)];
  });

  if (!circles.length) return null;
  if (circles.length === 1) return circles[0];

  return circles.reduce((unionFeature, circle) => {
    try {
      return turf.union(unionFeature, circle) || unionFeature;
    } catch (error) {
      return unionFeature;
    }
  });
}

function cloneTerritoryFeatureWithZone(feature, geometry, zone, promoteIdProperty) {
  const baseGeoKey = feature.properties.geoKey || feature.properties.state || feature.id;
  const properties = {
    ...feature.properties,
    radiusZone: zone,
    sourceGeoKey: feature.properties.sourceGeoKey || baseGeoKey
  };

  if (zone === "outside") {
    const outsideGeoKey = getRadiusOutsideGeoKey(baseGeoKey);
    properties.geoKey = outsideGeoKey;
    if (promoteIdProperty === "state") {
      properties.state = outsideGeoKey;
    }
  }

  return {
    type: "Feature",
    id: zone === "outside"
      ? getRadiusOutsideGeoKey(baseGeoKey)
      : (feature.id ?? baseGeoKey),
    geometry,
    properties
  };
}

function normalizeTerritoryClipGeometry(geometry) {
  if (!geometry) return null;

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return geometry;
  }

  if (geometry.type !== "GeometryCollection" || !Array.isArray(geometry.geometries)) {
    return null;
  }

  const polygons = geometry.geometries.filter(
    (part) => part?.type === "Polygon" || part?.type === "MultiPolygon"
  );
  if (!polygons.length) return null;
  if (polygons.length === 1) return polygons[0];

  return {
    type: "MultiPolygon",
    coordinates: polygons.flatMap((part) => (
      part.type === "Polygon" ? [part.coordinates] : part.coordinates
    ))
  };
}

function splitTerritoryFeatureByRadiusMask(feature, mask, promoteIdProperty = "geoKey") {
  if (!feature?.geometry || !mask || typeof turf === "undefined") {
    return [feature];
  }

  const input = turf.feature(feature.geometry, feature.properties || {});
  let insideGeometry = null;
  let outsideGeometry = null;

  try {
    const inside = turf.intersect(input, mask);
    insideGeometry = normalizeTerritoryClipGeometry(inside?.geometry || null);
  } catch (error) {
    insideGeometry = null;
  }

  try {
    const outside = turf.difference(input, mask);
    outsideGeometry = normalizeTerritoryClipGeometry(outside?.geometry || null);
  } catch (error) {
    outsideGeometry = null;
  }

  const parts = [];
  if (insideGeometry) {
    parts.push(cloneTerritoryFeatureWithZone(feature, insideGeometry, "inside", promoteIdProperty));
  }
  if (outsideGeometry) {
    parts.push(cloneTerritoryFeatureWithZone(feature, outsideGeometry, "outside", promoteIdProperty));
  }

  if (!parts.length) {
    const baseGeoKey = feature.properties.geoKey || feature.properties.state || feature.id;
    return [{
      ...feature,
      properties: {
        ...feature.properties,
        radiusZone: "outside",
        sourceGeoKey: feature.properties.sourceGeoKey || baseGeoKey,
        geoKey: getRadiusOutsideGeoKey(baseGeoKey)
      }
    }];
  }

  return parts;
}

function splitTerritoryFeatureCollectionByRadius(collection, visibleGeoKeys, promoteIdProperty = "geoKey") {
  if (!collection?.features?.length) {
    return collection || { type: "FeatureCollection", features: [] };
  }

  if (!isTerritoryRadiusFadeActive() || !visibleGeoKeys?.size) {
    return collection;
  }

  const mask = getTerritoryRadiusMaskFeature();
  if (!mask) return collection;

  const features = collection.features.flatMap((feature) => {
    const geoKey = feature.properties?.geoKey || feature.properties?.state || feature.id;
    if (!visibleGeoKeys.has(geoKey)) {
      return [feature];
    }
    return splitTerritoryFeatureByRadiusMask(feature, mask, promoteIdProperty);
  });

  return { type: "FeatureCollection", features };
}

function syncTerritoryBrandRadiusFadeData(territoryMap, visibleGeoKeys) {
  if (!territoryMap) return;

  const promoteIdProperty = getTerritoryPromoteId();

  territoryBrandBaseCollections.forEach((baseCollection, brandId) => {
    const source = territoryMap.getSource(`territories-${brandId}`);
    if (!source) return;

    const nextCollection = isTerritoryRadiusFadeActive()
      ? splitTerritoryFeatureCollectionByRadius(baseCollection, visibleGeoKeys, promoteIdProperty)
      : baseCollection;

    source.setData(nextCollection);
  });
}

function syncTerritoryRadiusOutsideFade(territoryMap, matchingRecords = territoryRenderedRecords) {
  if (!territoryMap) return;

  const visibleGeoKeys = new Set(
    (matchingRecords || [])
      .map((record) => record.geoKey || record.state)
      .filter(Boolean)
  );
  const signature = getTerritoryRadiusFadeSignature(visibleGeoKeys);

  if (signature === territoryRadiusFadeSignature) {
    return;
  }

  territoryRadiusFadeSignature = signature;
  territoryRadiusFadeVisibleGeoKeys = visibleGeoKeys;

  syncTerritoryBrandRadiusFadeData(territoryMap, visibleGeoKeys);

  // Force shared sources to rebuild with the new radius clip on next update.
  if (territorySharedConsolidated) {
    territorySharedConsolidated.signature = null;
  }
}

function isCountyLevelBrand(brand) {
  return brand?.level === "county";
}

function isGeoLevelBrand(brand) {
  return brand?.level === "geo";
}

function getTerritoryGeoType(brand, territory) {
  return normalizeTerritoryGeoType(territory?.geoType, brand?.level);
}

function getTerritoryGeoKey(brand, territory) {
  if (isGeoLevelBrand(brand) && territory.geoKey) {
    return territory.geoKey;
  }

  if (isCountyLevelBrand(brand) && territory.fips) {
    return territory.fips;
  }

  return territory.state;
}

function getTerritoryPromoteId() {
  return territoryGeoLevel === "state" ? "state" : "geoKey";
}

function resolveTerritoryFeatureRecord(brand, territory, geoIndex) {
  if (isGeoLevelBrand(brand)) {
    return geoIndex.geoFeaturesByKey.get(territory.geoKey) || null;
  }

  if (isCountyLevelBrand(brand)) {
    return geoIndex.countiesByFips.get(territory.fips) || null;
  }

  return geoIndex.statesByCode.get(territory.state) || null;
}

function resolveSharedTerritoryFeatureRecord(geoKey, geoIndex) {
  if (territoryGeoLevel === "geo") {
    return geoIndex.geoFeaturesByKey.get(geoKey) || null;
  }

  if (territoryGeoLevel === "county") {
    return geoIndex.countiesByFips.get(geoKey) || null;
  }

  return geoIndex.statesByCode.get(geoKey) || null;
}

function getTerritoryInvestment(brand, territory) {
  return territory.initialInvestment || brand.initialInvestment || { min: 0, max: 0 };
}

function getTerritoryProperties(brand, territory) {
  const investment = getTerritoryInvestment(brand, territory);
  const geoKey = getTerritoryGeoKey(brand, territory);
  const geoType = getTerritoryGeoType(brand, territory);

  return {
    brandId: brand.id,
    brand: brand.brand,
    category: brand.category || "",
    color: brand.color,
    logo: brand.logo || "",
    status: territory.status,
    state: territory.state,
    geoKey,
    geoType,
    geoRank: getTerritoryGeoTypeRank(geoType),
    stateName: territory.name,
    franchiseeRating: brand.franchiseeRating ?? 0,
    investmentMin: investment.min,
    investmentMax: investment.max
  };
}

function buildTerritoryRegistry(brands, geoIndex) {
  return brands.flatMap((brand) => brand.territories.map((territory) => {
    const featureRecord = resolveTerritoryFeatureRecord(brand, territory, geoIndex);
    const geometry = featureRecord?.geometry || null;
    const geometryBounds = geometry ? getGeometryBounds(geometry) : null;
    const geoKey = getTerritoryGeoKey(brand, territory);

    return {
      brandId: brand.id,
      brand: brand.brand,
      category: brand.category || "",
      franchiseeRating: brand.franchiseeRating ?? 0,
      state: territory.state,
      geoKey,
      geoType: getTerritoryGeoType(brand, territory),
      name: territory.name,
      status: territory.status,
      initialInvestment: getTerritoryInvestment(brand, territory),
      geometry,
      geometryBounds,
      center: geometry ? getTerritoryCentroid(geometry) : null
    };
  }));
}

function territoryRecordKey(record) {
  return `${record.brandId}:${record.geoKey || record.state}`;
}

function buildGeoKeyVisibilityFilter(geoKeys) {
  if (!geoKeys.length) {
    return ["==", ["get", "geoKey"], ""];
  }

  return ["in", ["get", "geoKey"], ["literal", geoKeys]];
}

function combineTerritoryFilters(...filters) {
  const parts = filters.filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return ["all", ...parts];
}

function createDiagonalHatchImage(color, {
  linePx = TERRITORY_HATCH_LINE_PX,
  gapPx = TERRITORY_HATCH_GAP_PX,
  pixelRatio = TERRITORY_HATCH_PIXEL_RATIO
} = {}) {
  const period = (linePx + gapPx) * pixelRatio;
  const lineWidth = linePx * pixelRatio;
  const { r, g, b } = parseHexColor(color);
  const data = new Uint8Array(period * period * 4);

  for (let y = 0; y < period; y += 1) {
    for (let x = 0; x < period; x += 1) {
      // Screen y grows downward, so x + y keeps ↗ diagonals (bottom-left to top-right).
      const band = (x + y) % period;
      if (band >= lineWidth) continue;

      const index = ((y * period) + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }

  return {
    width: period,
    height: period,
    data
  };
}

function ensureBrandHatchImage(territoryMap, brand) {
  const imageId = `territory-hatch-${brand.id}`;
  if (territoryMap.hasImage(imageId)) return imageId;

  territoryMap.addImage(
    imageId,
    createDiagonalHatchImage(brand.color),
    { pixelRatio: TERRITORY_HATCH_PIXEL_RATIO }
  );

  return imageId;
}

function getVisibleStatesForBrand(matchingKeys, brandId) {
  const visibleGeoKeys = [];

  territoryRegistry.forEach((record) => {
    if (record.brandId !== brandId) return;
    if (!matchingKeys.has(territoryRecordKey(record))) return;

    const geoKey = record.geoKey || record.state;
    const occupants = territoryStateOccupancy.get(geoKey) || [];
    const visibleOccupants = occupants.filter((occupantId) => (
      matchingKeys.has(`${occupantId}:${geoKey}`)
    ));

    if (visibleOccupants.length >= 2) return;

    visibleGeoKeys.push(geoKey);
  });

  return visibleGeoKeys;
}

function getLogoOccupants(visibleOccupants) {
  if (!visibleOccupants?.length) return [];
  return visibleOccupants.slice(0, TERRITORY_LOGO_MAX_VISIBLE);
}

function getVisibleLogoStatesForBrand(matchingKeys, brandId) {
  const visibleGeoKeys = [];

  territoryRegistry.forEach((record) => {
    if (record.brandId !== brandId) return;
    if (!matchingKeys.has(territoryRecordKey(record))) return;

    const geoKey = record.geoKey || record.state;
    const occupants = territoryStateOccupancy.get(geoKey) || [];
    const visibleOccupants = getLogoOccupants(
      occupants.filter((occupantId) => matchingKeys.has(`${occupantId}:${geoKey}`))
    );
    if (!visibleOccupants.includes(brandId)) return;

    visibleGeoKeys.push(geoKey);
  });

  return visibleGeoKeys;
}

function getVisibleSharedOccupantCount(stateCode) {
  const matchingRecords = territoryRenderedRecords
    || territoryLastMatchingRecords
    || (territoryHoldInitialRender ? [] : territoryRegistry);
  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const occupants = territoryStateOccupancy.get(stateCode) || [];

  return occupants.filter((occupantId) => matchingKeys.has(`${occupantId}:${stateCode}`)).length;
}

function buildVisibleOccupantsByState(matchingKeys) {
  const visibleOccupantsByState = new Map();

  territoryStateOccupancy.forEach((occupants, stateCode) => {
    const visibleOccupants = occupants.filter((occupantId) => (
      matchingKeys.has(`${occupantId}:${stateCode}`)
    ));
    visibleOccupantsByState.set(stateCode, visibleOccupants);
  });

  return visibleOccupantsByState;
}

function buildTerritoryDensityFeatureCollection(matchingRecords) {
  const entriesByGeoKey = new Map();

  matchingRecords.forEach((record) => {
    const geoKey = record.geoKey || record.state;
    if (!geoKey || !record.geometry) return;

    if (!entriesByGeoKey.has(geoKey)) {
      entriesByGeoKey.set(geoKey, {
        geoKey,
        state: record.state,
        name: record.name,
        geoType: normalizeTerritoryGeoType(record.geoType),
        geometry: record.geometry,
        brandIds: new Set()
      });
    }

    entriesByGeoKey.get(geoKey).brandIds.add(record.brandId);
  });

  const entries = [...entriesByGeoKey.values()];
  const counts = entries.map((entry) => entry.brandIds.size).filter((count) => count > 0);
  const lowestCount = counts.length ? Math.min(...counts) : 0;
  const highestCount = counts.length ? Math.max(...counts) : 0;
  const countRange = highestCount - lowestCount;

  return {
    type: "FeatureCollection",
    features: entries.map((entry) => {
      const count = entry.brandIds.size;
      const densityRatio = countRange > 0 ? (count - lowestCount) / countRange : 0;

      return {
        type: "Feature",
        id: entry.geoKey,
        geometry: entry.geometry,
        properties: {
          geoKey: entry.geoKey,
          state: entry.state,
          stateName: entry.name,
          geoType: entry.geoType,
          geoRank: getTerritoryGeoTypeRank(entry.geoType),
          brandCount: count,
          densityRatio
        }
      };
    })
  };
}

function updateTerritoryDensityData(territoryMap, matchingRecords) {
  const collection = buildTerritoryDensityFeatureCollection(matchingRecords);
  const visibleGeoKeys = new Set(
    matchingRecords.map((record) => record.geoKey || record.state).filter(Boolean)
  );
  const fadedCollection = splitTerritoryFeatureCollectionByRadius(
    collection,
    visibleGeoKeys,
    "geoKey"
  );
  territoryMap.getSource(TERRITORY_DENSITY_SOURCE_ID)?.setData(fadedCollection);
}

function updateBrandLogoOffsets(territoryMap, brandId, visibleOccupantsByState) {
  const logoInfo = territoryBrandLogoInfo.get(brandId);
  if (!logoInfo) return;

  let hasChanged = false;

  logoInfo.collection.features.forEach((feature) => {
    const geoKey = feature.properties.geoKey || feature.properties.state;
    const visibleOccupants = getLogoOccupants(visibleOccupantsByState.get(geoKey) || []);
    const nextOffset = computeLogoOffset(visibleOccupants, brandId, logoInfo.imageWidth);
    const currentOffset = feature.properties.iconOffset || [0, 0];

    if (currentOffset[0] !== nextOffset[0] || currentOffset[1] !== nextOffset[1]) {
      feature.properties.iconOffset = nextOffset;
      hasChanged = true;
    }
  });

  if (hasChanged) {
    territoryMap.getSource(logoInfo.sourceId)?.setData(logoInfo.collection);
  }
}

function renderTerritoryRecords(matchingRecords) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  clearSidebarTerritoryHover();
  territoryRenderedRecords = matchingRecords;

  syncTerritoryRadiusOverlay();

  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const visibleOccupantsByState = buildVisibleOccupantsByState(matchingKeys);
  syncTerritoryRadiusOutsideFade(territoryMap, matchingRecords);
  updateTerritoryDensityData(territoryMap, matchingRecords);

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    const visibleGeoKeys = expandGeoKeysForRadiusFade(getVisibleStatesForBrand(matchingKeys, brand.id));
    const geoKeyFilter = buildGeoKeyVisibilityFilter(visibleGeoKeys);
    const logoFilter = buildGeoKeyVisibilityFilter(getVisibleLogoStatesForBrand(matchingKeys, brand.id));

    layerIds.geoLayers.forEach((geoLayers, geoType) => {
      const geoTypeFilter = ["==", ["get", "geoType"], geoType];
      const solidFilter = combineTerritoryFilters(
        geoKeyFilter,
        geoTypeFilter,
        TERRITORY_STATUS_NON_ESTABLISHED_FILTER
      );
      const hatchFilter = combineTerritoryFilters(
        geoKeyFilter,
        geoTypeFilter,
        TERRITORY_STATUS_ESTABLISHED_FILTER
      );
      const lineFilter = combineTerritoryFilters(geoKeyFilter, geoTypeFilter);

      if (geoLayers.fillLayerId && territoryMap.getLayer(geoLayers.fillLayerId)) {
        territoryMap.setFilter(geoLayers.fillLayerId, solidFilter);
      }
      if (geoLayers.hatchLayerId && territoryMap.getLayer(geoLayers.hatchLayerId)) {
        territoryMap.setFilter(geoLayers.hatchLayerId, hatchFilter);
      }
      if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId)) {
        territoryMap.setFilter(geoLayers.lineLayerId, lineFilter);
      }
    });

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      territoryMap.setFilter(layerIds.logoLayerId, logoFilter);
    }

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      updateBrandLogoOffsets(territoryMap, brand.id, visibleOccupantsByState);
    }
  });

  updateConsolidatedSharedTerritories(territoryMap, visibleOccupantsByState);
}

function getSelectedTerritoryRecords(matchingRecords = territoryLastMatchingRecords || territoryRegistry) {
  const records = [];

  if (selectedTerritoryKey) {
    const primaryRecord = matchingRecords.find((record) => territoryRecordKey(record) === selectedTerritoryKey);
    if (primaryRecord) records.push(primaryRecord);
  }

  if (compareTerritoryKey && compareTerritoryKey !== selectedTerritoryKey) {
    const compareRecord = matchingRecords.find((record) => territoryRecordKey(record) === compareTerritoryKey);
    if (compareRecord) records.push(compareRecord);
  }

  return records;
}

function applyTerritoryFilters(matchingRecords) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  clearTerritoryMapHover?.();
  hideTerritoryAreaCard({ immediate: true });
  territoryLastMatchingRecords = matchingRecords;
  territoryHoldInitialRender = false;
  rebuildTerritoryIntersectionIndex(matchingRecords);

  if (selectedTerritoryKey) {
    const primaryStillVisible = matchingRecords.some(
      (record) => territoryRecordKey(record) === selectedTerritoryKey
    );
    if (!primaryStillVisible) {
      selectedTerritoryKey = null;
      compareTerritoryKey = null;
      territoryInfoDismissedKey = null;
      clearSelectedTerritoryFeatureStates();
    }
  }

  if (compareTerritoryKey) {
    const compareStillVisible = matchingRecords.some(
      (record) => territoryRecordKey(record) === compareTerritoryKey
    );
    if (!compareStillVisible || compareTerritoryKey === selectedTerritoryKey) {
      compareTerritoryKey = null;
    }
  }

  const selectedRecords = getSelectedTerritoryRecords(matchingRecords);
  renderTerritoryRecords(selectedRecords.length ? selectedRecords : matchingRecords);
  window.territoryFilters?.updateSummary?.(matchingRecords.length, territoryRegistry.length);
  window.territoryBrandPanel?.update?.(territoryBrands, matchingRecords);
  showTerritoryInfoCards(selectedRecords[0] || null, selectedRecords[1] || null);

  if (!selectedTerritoryKey) {
    scheduleTerritoryMapViewForFilters(territoryMap, matchingRecords);
  } else if (selectedRecords.length > 1) {
    focusTerritoryMapOnSelectedRecords(territoryMap, selectedRecords);
  }
}

async function fetchTerritoryJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

function loadTerritoryDataBundle() {
  const activeDataset = window.territoryDatasets.getActive();
  const datasetId = activeDataset.id;
  const cachedRequest = territoryDataCachePromises.get(datasetId);
  if (cachedRequest) {
    return cachedRequest;
  }

  const dataRequest = Promise.all([
    fetchTerritoryJson(TERRITORY_STATES_URL),
    fetchTerritoryJson(TERRITORY_MACRODATA_URL),
    ...activeDataset.brandFiles.map((file) => fetchTerritoryJson(`data/${file}`))
  ]).then(async ([statesGeojson, macrodata, ...brands]) => {
    const needsCounties = brands.some((brand) => isCountyLevelBrand(brand));
    const needsGeoFeatures = brands.some((brand) => isGeoLevelBrand(brand));
    const [countiesGeojson, geoFeaturesGeojson] = await Promise.all([
      needsCounties ? fetchTerritoryJson(TERRITORY_COUNTIES_URL) : null,
      needsGeoFeatures ? fetchTerritoryJson(TERRITORY_REAL_GEOMETRY_URL) : null
    ]);

    return {
      statesGeojson,
      countiesGeojson,
      geoFeaturesGeojson,
      macrodata,
      brands
    };
  });

  const cachedDataRequest = dataRequest.catch((error) => {
    territoryDataCachePromises.delete(datasetId);
    throw error;
  });
  territoryDataCachePromises.set(datasetId, cachedDataRequest);

  return cachedDataRequest;
}

window.territoryDataCache = {
  load: loadTerritoryDataBundle
};

function buildBrandFeatureCollection(brand, geoIndex) {
  const features = [];

  brand.territories.forEach((territory) => {
    const featureRecord = resolveTerritoryFeatureRecord(brand, territory, geoIndex);
    if (!featureRecord) return;

    const geoKey = getTerritoryGeoKey(brand, territory);

    features.push({
      type: "Feature",
      id: geoKey,
      geometry: featureRecord.geometry,
      properties: getTerritoryProperties(brand, territory)
    });
  });

  return { type: "FeatureCollection", features };
}

function pixelsToIconOffset(offsetPixels, imageWidth, displaySize = TERRITORY_LOGO_MIN_SIZE) {
  return (offsetPixels * imageWidth) / displaySize;
}

// Layout slots for shared-territory markers (centered on the territory centroid):
// 2 → one row; 3 → two on top, one centered below; 4 → 2×2 grid.
function getLogoLayoutSlot(count, index) {
  if (count <= 1 || index < 0) return [0, 0];

  if (count === 2) {
    return [[-0.5, 0], [0.5, 0]][index] || [0, 0];
  }

  if (count === 3) {
    return [[-0.5, -0.5], [0.5, -0.5], [0, 0.5]][index] || [0, 0];
  }

  return [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]][index] || [0, 0];
}

function computeMarkerOffset(visibleOccupants, brandId, imageWidth, displaySize, gap) {
  const occupants = getLogoOccupants(visibleOccupants);
  if (occupants.length < 2) return [0, 0];

  const index = occupants.indexOf(brandId);
  if (index < 0) return [0, 0];

  const slot = displaySize + gap;
  const [slotX, slotY] = getLogoLayoutSlot(occupants.length, index);

  return [
    pixelsToIconOffset(slotX * slot, imageWidth, displaySize),
    pixelsToIconOffset(slotY * slot, imageWidth, displaySize)
  ];
}

function computeLogoOffset(visibleOccupants, brandId, imageWidth) {
  return computeMarkerOffset(
    visibleOccupants,
    brandId,
    imageWidth,
    TERRITORY_LOGO_MIN_SIZE,
    TERRITORY_LOGO_SHARED_GAP
  );
}

function buildBrandLogoFeatureCollection(brand, geoIndex, geoOccupancy, imageWidth) {
  const features = [];

  brand.territories.forEach((territory) => {
    const featureRecord = resolveTerritoryFeatureRecord(brand, territory, geoIndex);
    if (!featureRecord) return;

    const centroid = getTerritoryCentroid(featureRecord.geometry);
    if (!centroid) return;

    const geoKey = getTerritoryGeoKey(brand, territory);
    const logoOccupants = getLogoOccupants(geoOccupancy.get(geoKey));

    features.push({
      type: "Feature",
      id: geoKey,
      geometry: {
        type: "Point",
        coordinates: centroid
      },
      properties: {
        ...getTerritoryProperties(brand, territory),
        iconOffset: computeLogoOffset(logoOccupants, brand.id, imageWidth)
      }
    });
  });

  return { type: "FeatureCollection", features };
}

function roundLogoRectPath(context, width, height, radius) {
  const cornerRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(cornerRadius, 0);
  context.lineTo(width - cornerRadius, 0);
  context.quadraticCurveTo(width, 0, width, cornerRadius);
  context.lineTo(width, height - cornerRadius);
  context.quadraticCurveTo(width, height, width - cornerRadius, height);
  context.lineTo(cornerRadius, height);
  context.quadraticCurveTo(0, height, 0, height - cornerRadius);
  context.lineTo(0, cornerRadius);
  context.quadraticCurveTo(0, 0, cornerRadius, 0);
  context.closePath();
}

function createRoundedLogoImage(sourceImage) {
  const width = TERRITORY_LOGO_TEXTURE_SIZE;
  const height = TERRITORY_LOGO_TEXTURE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const radius = Math.round(Math.min(width, height) * TERRITORY_LOGO_CORNER_RADIUS_RATIO);

  context.save();
  roundLogoRectPath(context, width, height, radius);
  context.clip();
  context.drawImage(sourceImage, 0, 0, width, height);
  context.restore();

  context.beginPath();
  roundLogoRectPath(context, width - 1, height - 1, radius);
  context.strokeStyle = TERRITORY_LOGO_BORDER_COLOR;
  context.lineWidth = 1;
  context.stroke();

  return context.getImageData(0, 0, width, height);
}

function getTerritoryLogoMinZoom() {
  return territoryGeoLevel === "state"
    ? TERRITORY_STATE_LOGO_MIN_ZOOM
    : TERRITORY_COUNTY_LOGO_MIN_ZOOM;
}

function buildTerritoryLogoIconSizeExpression(imageWidth) {
  const sizeAt = (pixels) => pixels / imageWidth;

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    sizeAt(TERRITORY_LOGO_MIN_SIZE),
    TERRITORY_LOGO_ZOOM_MIN,
    sizeAt(TERRITORY_LOGO_MIN_SIZE),
    TERRITORY_LOGO_ZOOM_MAX,
    sizeAt(TERRITORY_LOGO_MAX_SIZE),
    22,
    sizeAt(TERRITORY_LOGO_MAX_SIZE)
  ];
}

async function loadBrandLogoImage(territoryMap, brand) {
  const imageId = `territory-logo-${brand.id}`;

  if (!brand.logo) return null;

  if (brandLogoMetaById.has(brand.id)) {
    return brandLogoMetaById.get(brand.id);
  }

  const image = await new Promise((resolve, reject) => {
    territoryMap.loadImage(brand.logo, (error, loadedImage) => {
      if (error) reject(error);
      else resolve(loadedImage);
    });
  });

  if (!territoryMap.hasImage(imageId)) {
    territoryMap.addImage(imageId, createRoundedLogoImage(image));
  }

  const logoMeta = {
    imageId,
    imageWidth: TERRITORY_LOGO_TEXTURE_SIZE,
    iconSize: buildTerritoryLogoIconSizeExpression(TERRITORY_LOGO_TEXTURE_SIZE)
  };

  brandLogoMetaById.set(brand.id, logoMeta);
  return logoMeta;
}

function hexToRgba(hex, alpha) {
  let value = String(hex || "").replace("#", "");
  if (value.length === 3) {
    value = value.split("").map((char) => char + char).join("");
  }
  const red = parseInt(value.substring(0, 2), 16) || 0;
  const green = parseInt(value.substring(2, 4), 16) || 0;
  const blue = parseInt(value.substring(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function collectGeometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function getGeometryBounds(geometry) {
  const polygons = collectGeometryPolygons(geometry);
  if (!polygons.length) return null;

  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  polygons.forEach((rings) => rings.forEach((ring) => ring.forEach(([lng, lat]) => {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  })));

  if (!(east > west) || !(north > south)) return null;

  return { west, east, south, north, polygons };
}

function pointIsInsideGeometryRing([longitude, latitude], ring) {
  let isInside = false;

  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; previousIndex = currentIndex++) {
    const [currentLongitude, currentLatitude] = ring[currentIndex];
    const [previousLongitude, previousLatitude] = ring[previousIndex];
    const crossesLatitude = (currentLatitude > latitude) !== (previousLatitude > latitude);
    const crossingLongitude = (
      ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
      (previousLatitude - currentLatitude)
    ) + currentLongitude;

    if (crossesLatitude && longitude < crossingLongitude) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function pointIsInsideGeometryPolygon(point, rings) {
  if (!rings.length || !pointIsInsideGeometryRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointIsInsideGeometryRing(point, hole));
}

function getStateCodeForCoordinates(longitude, latitude) {
  const point = [longitude, latitude];

  for (const [stateCode, stateFeature] of territoryStatesByCode) {
    const polygons = collectGeometryPolygons(stateFeature.geometry);
    if (polygons.some((rings) => pointIsInsideGeometryPolygon(point, rings))) {
      return stateCode;
    }
  }

  return null;
}

function applyTerritoryGeolocationCoordinates(coords) {
  const longitude = Number(coords?.longitude);
  const latitude = Number(coords?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return Promise.resolve(false);

  if (!territoryStatesByCode.size) {
    territoryPendingGeolocationCoordinates = { longitude, latitude };
    return Promise.resolve(false);
  }

  territoryPendingGeolocationCoordinates = null;
  const stateCode = getStateCodeForCoordinates(longitude, latitude);
  if (!stateCode) return Promise.resolve(false);

  territoryPendingFocusStateCode = null;

  return window.territoryLocationSearch?.resolveFromCoordinates?.(longitude, latitude, stateCode)
    .then((result) => {
      if (!result?.stateCode) return false;

      if (window.territoryCrossroadChoice?.type === "new") {
        window.territoryCrossroadChoice.locationSearch = result;
      }

      if (window.territoryFilters?.isFilterDataReady?.()) {
        window.territoryFilters?.applyLocationInclude?.(result);
      }

      return true;
    });
}

function parseHexColor(hex) {
  let value = String(hex || "").replace("#", "");
  if (value.length === 3) {
    value = value.split("").map((char) => char + char).join("");
  }

  return {
    r: parseInt(value.substring(0, 2), 16) || 0,
    g: parseInt(value.substring(2, 4), 16) || 0,
    b: parseInt(value.substring(4, 6), 16) || 0
  };
}

function lerpHexColor(colorA, colorB, t) {
  const start = parseHexColor(colorA);
  const end = parseHexColor(colorB);
  const ratio = Math.min(1, Math.max(0, t));
  const r = Math.round(start.r + ((end.r - start.r) * ratio));
  const g = Math.round(start.g + ((end.g - start.g) * ratio));
  const b = Math.round(start.b + ((end.b - start.b) * ratio));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lerpColorList(colors, t) {
  if (!colors.length) return "#000000";
  if (colors.length === 1) return colors[0];

  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));

  return lerpHexColor(colors[index], colors[index + 1], scaled - index);
}

// Builds the outline for a shared (multi-brand) territory as continuous
// polylines rather than one feature per edge. Coloring the border west->east to
// match the fill gradient requires per-position color, but emitting a separate
// 2-point line per edge makes the outline look blurry and incomplete when zoomed
// out: each tiny feature is simplified/dropped independently and the overlapping
// round end-caps compound at partial opacity. Instead we quantize the
// gradient into a limited number of longitude buckets and merge consecutive
// same-bucket edges into a single connected LineString, so each run renders as a
// crisp, gap-free line with proper joins while still approximating the gradient.
function buildSharedTerritoryOutlineFeatureCollection(geometry, colors) {
  const bounds = getGeometryBounds(geometry);
  if (!bounds) return { type: "FeatureCollection", features: [] };

  const { west, east, polygons } = bounds;
  const lngSpan = east - west;
  const features = [];

  const bucketForLng = (lng) => {
    const t = lngSpan > 0 ? (lng - west) / lngSpan : 0.5;
    return Math.min(
      TERRITORY_SHARED_OUTLINE_STEPS - 1,
      Math.max(0, Math.floor(t * TERRITORY_SHARED_OUTLINE_STEPS))
    );
  };
  const colorForBucket = (bucket) => lerpColorList(
    colors,
    (bucket + 0.5) / TERRITORY_SHARED_OUTLINE_STEPS
  );

  polygons.forEach((rings) => rings.forEach((ring) => {
    if (ring.length < 2) return;

    let runCoordinates = [ring[0]];
    let runBucket = bucketForLng((ring[0][0] + ring[1][0]) / 2);

    const flushRun = () => {
      if (runCoordinates.length < 2) return;
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: runCoordinates },
        properties: { color: colorForBucket(runBucket) }
      });
    };

    for (let index = 1; index < ring.length; index += 1) {
      const previous = ring[index - 1];
      const current = ring[index];
      const bucket = bucketForLng((previous[0] + current[0]) / 2);

      if (bucket === runBucket) {
        runCoordinates.push(current);
      } else {
        // The old run already ends at `previous`; start the new run there too so
        // the runs share a vertex and leave no visible gap at the color change.
        flushRun();
        runCoordinates = [previous, current];
        runBucket = bucket;
      }
    }

    flushRun();
  }));

  return { type: "FeatureCollection", features };
}

function getOccupantColors(occupants, brandsById) {
  return occupants
    .map((occupantId) => brandsById.get(occupantId)?.color)
    .filter(Boolean);
}

function getSharedGradientPatternWidth() {
  return TERRITORY_SHARED_PATTERN_WIDTH_BY_LEVEL[territoryGeoLevel]
    || TERRITORY_SHARED_PATTERN_WIDTH_BY_LEVEL.state;
}

function createSharedGradientPatternImage(colors) {
  const width = getSharedGradientPatternWidth() * TERRITORY_SHARED_PATTERN_PIXEL_RATIO;
  const height = TERRITORY_SHARED_PATTERN_HEIGHT * TERRITORY_SHARED_PATTERN_PIXEL_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  // Fill patterns repeat, so a one-way ramp would leave a hard seam wherever it
  // wraps. Mirroring the ramp (A→B→A) keeps the wrap invisible on territories
  // wider than the pattern while still reading as a mix of the brand colors.
  const stops = colors.length > 1
    ? [...colors, ...colors.slice(0, -1).reverse()]
    : [colors[0], colors[0]];
  const gradient = context.createLinearGradient(0, 0, width, 0);
  stops.forEach((color, index) => {
    gradient.addColorStop(index / (stops.length - 1), hexToRgba(color, TERRITORY_SHARED_FILL_OPACITY));
  });

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  return context.getImageData(0, 0, width, height);
}

function ensureSharedGradientPatternImage(territoryMap, colors) {
  const patternKey = `${getSharedGradientPatternWidth()}:${colors.join(",")}`;
  const cachedPatternId = territorySharedPatternIdsByColors.get(patternKey);
  if (cachedPatternId) return cachedPatternId;

  const patternId = `territory-shared-pattern-${territorySharedPatternIdsByColors.size}`;
  territoryMap.addImage(patternId, createSharedGradientPatternImage(colors), {
    pixelRatio: TERRITORY_SHARED_PATTERN_PIXEL_RATIO
  });
  territorySharedPatternIdsByColors.set(patternKey, patternId);

  return patternId;
}

function buildConsolidatedSharedCollections(territoryMap, entries, occupantsByGeoKey, brandsById) {
  const fillFeatures = [];
  const strokeFeatures = [];

  entries.forEach((entry) => {
    const occupants = occupantsByGeoKey.get(entry.geoKey) || [];
    if (occupants.length < 2) return;

    const colors = getOccupantColors(occupants, brandsById);
    if (colors.length < 2) return;

    fillFeatures.push({
      type: "Feature",
      id: entry.geoKey,
      geometry: entry.geometry,
      properties: {
        geoKey: entry.geoKey,
        state: entry.state,
        stateName: entry.name,
        geoType: entry.geoType,
        geoRank: getTerritoryGeoTypeRank(entry.geoType),
        pattern: ensureSharedGradientPatternImage(territoryMap, colors)
      }
    });

    buildSharedTerritoryOutlineFeatureCollection(entry.geometry, colors).features.forEach((feature) => {
      feature.properties.geoKey = entry.geoKey;
      strokeFeatures.push(feature);
    });
  });

  return {
    fill: { type: "FeatureCollection", features: fillFeatures },
    stroke: { type: "FeatureCollection", features: strokeFeatures }
  };
}

function buildConsolidatedSharedStrokeFilter(visibleGeoKeys, hiddenGeoKey) {
  const visibilityFilter = buildGeoKeyVisibilityFilter(visibleGeoKeys);
  if (!hiddenGeoKey) return visibilityFilter;

  return ["all", visibilityFilter, ["!=", ["get", "geoKey"], hiddenGeoKey]];
}

function setTerritoryLayerFilter(territoryMap, layerId, filter) {
  if (!territoryMap.getLayer(layerId)) return;
  territoryMap.setFilter(layerId, filter);
}

function addConsolidatedSharedTerritoryLayers(territoryMap, entries, occupantsByGeoKey, brandsById, beforeLayerId) {
  const collections = buildConsolidatedSharedCollections(territoryMap, entries, occupantsByGeoKey, brandsById);
  const emptyFilter = buildGeoKeyVisibilityFilter([]);

  territoryMap.addSource(TERRITORY_SHARED_ALL_SOURCE_ID, {
    type: "geojson",
    data: collections.fill,
    promoteId: "geoKey",
    maxzoom: TERRITORY_SOURCE_MAX_ZOOM
  });

  territoryMap.addSource(TERRITORY_SHARED_ALL_STROKE_SOURCE_ID, {
    type: "geojson",
    data: collections.stroke,
    maxzoom: TERRITORY_SOURCE_MAX_ZOOM
  });

  territoryMap.addLayer({
    id: TERRITORY_SHARED_ALL_FILL_LAYER_ID,
    type: "fill",
    source: TERRITORY_SHARED_ALL_SOURCE_ID,
    filter: emptyFilter,
    paint: {
      "fill-pattern": ["get", "pattern"],
      "fill-opacity": withTerritoryRadiusOutsideOpacity(1)
    }
  }, beforeLayerId || undefined);

  territoryMap.addLayer({
    id: TERRITORY_SHARED_ALL_STROKE_LAYER_ID,
    type: "line",
    source: TERRITORY_SHARED_ALL_STROKE_SOURCE_ID,
    filter: emptyFilter,
    layout: {
      visibility: territoryBordersEnabled && !territoryDensityEnabled ? "visible" : "none",
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": ["get", "color"],
      "line-opacity": withTerritoryRadiusOutsideOpacity(TERRITORY_LINE_OPACITY),
      "line-width": TERRITORY_LINE_WIDTH
    }
  }, beforeLayerId || undefined);

  // Shares the fill source so hit testing costs no extra tile work.
  territoryMap.addLayer({
    id: TERRITORY_SHARED_ALL_HIT_LAYER_ID,
    type: "fill",
    source: TERRITORY_SHARED_ALL_SOURCE_ID,
    filter: emptyFilter,
    paint: {
      "fill-color": "#000000",
      "fill-opacity": 0
    }
  }, beforeLayerId || undefined);

  territoryLineLayerIds.push(TERRITORY_SHARED_ALL_STROKE_LAYER_ID);
  territorySharedConsolidated = {
    entries,
    brandsById,
    signature: null,
    visibleGeoKeys: [],
    hiddenStrokeGeoKey: null
  };

  return [TERRITORY_SHARED_ALL_HIT_LAYER_ID];
}

function updateConsolidatedSharedTerritories(territoryMap, occupantsByGeoKey) {
  if (!territorySharedConsolidated) return;

  const visibleGeoKeys = [];
  const signatureParts = [];

  territorySharedConsolidated.entries.forEach((entry) => {
    const occupants = occupantsByGeoKey.get(entry.geoKey) || [];
    if (occupants.length < 2) return;

    visibleGeoKeys.push(entry.geoKey);
    signatureParts.push(`${entry.geoKey}:${occupants.join("+")}`);
  });

  // Which brands share a territory decides its gradient, so the geometry only
  // needs rebuilding when that set changes for at least one territory.
  const signature = signatureParts.join("|");
  const radiusFadeActive = isTerritoryRadiusFadeActive();
  const nextSignature = radiusFadeActive
    ? `${signature}::${territoryRadiusFadeSignature}`
    : signature;
  if (nextSignature !== territorySharedConsolidated.signature) {
    const collections = buildConsolidatedSharedCollections(
      territoryMap,
      territorySharedConsolidated.entries,
      occupantsByGeoKey,
      territorySharedConsolidated.brandsById
    );
    const fadeKeys = new Set(visibleGeoKeys);
    const fadedFill = splitTerritoryFeatureCollectionByRadius(collections.fill, fadeKeys, "geoKey");
    const strokeFromFill = {
      type: "FeatureCollection",
      features: fadedFill.features.flatMap((feature) => {
        const sourceGeoKey = feature.properties.sourceGeoKey
          || String(feature.properties.geoKey || "").replace(TERRITORY_RADIUS_OUTSIDE_GEOKEY_SUFFIX, "");
        const colors = getOccupantColors(
          occupantsByGeoKey.get(sourceGeoKey) || [],
          territorySharedConsolidated.brandsById
        );
        if (colors.length < 2) return [];

        return buildSharedTerritoryOutlineFeatureCollection(feature.geometry, colors).features.map(
          (strokeFeature) => ({
            ...strokeFeature,
            properties: {
              ...strokeFeature.properties,
              geoKey: feature.properties.geoKey,
              sourceGeoKey,
              radiusZone: feature.properties.radiusZone || "inside"
            }
          })
        );
      })
    };

    territoryMap.getSource(TERRITORY_SHARED_ALL_SOURCE_ID)?.setData(fadedFill);
    territoryMap.getSource(TERRITORY_SHARED_ALL_STROKE_SOURCE_ID)?.setData(
      radiusFadeActive ? strokeFromFill : collections.stroke
    );
    territorySharedConsolidated.signature = nextSignature;
  }

  territorySharedConsolidated.visibleGeoKeys = visibleGeoKeys;
  territorySharedConsolidated.hiddenStrokeGeoKey = null;

  // Brand territories stack per-brand layers for shared geo keys; keep the
  // consolidated gradient sources hidden so they never paint over the stack.
  const hiddenSharedFilter = buildGeoKeyVisibilityFilter([]);
  const sharedHitFilter = territoryDensityEnabled
    ? hiddenSharedFilter
    : buildGeoKeyVisibilityFilter(visibleGeoKeys);

  setTerritoryLayerFilter(territoryMap, TERRITORY_SHARED_ALL_FILL_LAYER_ID, hiddenSharedFilter);
  setTerritoryLayerFilter(territoryMap, TERRITORY_SHARED_ALL_HIT_LAYER_ID, sharedHitFilter);
  setTerritoryLayerFilter(territoryMap, TERRITORY_SHARED_ALL_STROKE_LAYER_ID, hiddenSharedFilter);
}

function addTerritoryDensityLayers(territoryMap, beforeLayerId) {
  territoryMap.addSource(TERRITORY_DENSITY_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    promoteId: "geoKey",
    maxzoom: TERRITORY_SOURCE_MAX_ZOOM
  });

  territoryMap.addLayer({
    id: TERRITORY_DENSITY_FILL_LAYER_ID,
    type: "fill",
    source: TERRITORY_DENSITY_SOURCE_ID,
    layout: {
      visibility: territoryDensityEnabled ? "visible" : "none",
      "fill-sort-key": ["get", "geoRank"]
    },
    paint: {
      "fill-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        [
          "interpolate",
          ["linear"],
          ["get", "densityRatio"],
          0,
          TERRITORY_DENSITY_HOVER_LOW_COLOR,
          1,
          TERRITORY_DENSITY_HOVER_HIGH_COLOR
        ],
        [
          "interpolate",
          ["linear"],
          ["get", "densityRatio"],
          0,
          TERRITORY_DENSITY_LOW_COLOR,
          1,
          TERRITORY_DENSITY_HIGH_COLOR
        ]
      ],
      "fill-opacity": withTerritoryRadiusOutsideOpacity([
        "case",
        ["boolean", ["feature-state", "hover"], false],
        [
          "interpolate",
          ["linear"],
          ["get", "densityRatio"],
          0,
          TERRITORY_DENSITY_HOVER_LOW_OPACITY,
          1,
          TERRITORY_DENSITY_HOVER_HIGH_OPACITY
        ],
        [
          "interpolate",
          ["linear"],
          ["get", "densityRatio"],
          0,
          TERRITORY_DENSITY_LOW_OPACITY,
          1,
          TERRITORY_DENSITY_HIGH_OPACITY
        ]
      ])
    }
  }, beforeLayerId || undefined);

  territoryMap.addLayer({
    id: TERRITORY_DENSITY_LINE_LAYER_ID,
    type: "line",
    source: TERRITORY_DENSITY_SOURCE_ID,
    layout: {
      visibility: territoryDensityEnabled && territoryBordersEnabled ? "visible" : "none",
      "line-join": "round",
      "line-cap": "round",
      "line-sort-key": ["get", "geoRank"]
    },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        TERRITORY_DENSITY_HOVER_HIGH_COLOR,
        TERRITORY_DENSITY_HIGH_COLOR
      ],
      "line-opacity": withTerritoryRadiusOutsideOpacity([
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.68,
        0.42
      ]),
      "line-width": TERRITORY_LINE_WIDTH
    }
  }, beforeLayerId || undefined);
}

function addSharedTerritoryLayers(territoryMap, sharedGeoKeys, geoOccupancy, brandsById, geoIndex, beforeLayerId) {
  const entries = sharedGeoKeys.map((geoKey) => {
    const featureRecord = resolveSharedTerritoryFeatureRecord(geoKey, geoIndex);
    if (!featureRecord) return null;

    return {
      geoKey,
      state: featureRecord.properties.state || geoKey,
      name: featureRecord.properties.name,
      geoType: normalizeTerritoryGeoType(
        featureRecord.properties.geoType || String(geoKey).split(":")[0]
      ),
      geometry: featureRecord.geometry
    };
  }).filter(Boolean);

  return addConsolidatedSharedTerritoryLayers(
    territoryMap,
    entries,
    geoOccupancy,
    brandsById,
    beforeLayerId
  );
}

function addBrandTerritoryLayers(territoryMap, brand, featureCollection, logoFeatureCollection, logoMeta, excludeFilter) {
  const sourceId = `territories-${brand.id}`;
  const logoLayerId = `${sourceId}-logo`;
  const hatchImageId = ensureBrandHatchImage(territoryMap, brand);

  territoryMap.addSource(sourceId, {
    type: "geojson",
    data: featureCollection,
    promoteId: getTerritoryPromoteId(),
    maxzoom: TERRITORY_SOURCE_MAX_ZOOM
  });

  territoryBrandBaseCollections.set(brand.id, featureCollection);

  const geoTypes = [...new Set(
    featureCollection.features.map((feature) => normalizeTerritoryGeoType(feature.properties?.geoType))
  )].sort((left, right) => (
    getTerritoryGeoTypeRank(left) - getTerritoryGeoTypeRank(right)
  ));
  const geoLayers = new Map();
  const layerIds = [];

  geoTypes.forEach((geoType) => {
    const layerPrefix = `${sourceId}-${geoType}`;
    const fillLayerId = `${layerPrefix}-fill`;
    const hatchLayerId = `${layerPrefix}-hatch`;
    const lineLayerId = `${layerPrefix}-line`;
    const geoTypeFilter = ["==", ["get", "geoType"], geoType];
    const fillLayer = {
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": territoryDensityEnabled
          ? 0
          : withTerritoryRadiusOutsideOpacity(TERRITORY_FILL_OPACITY_EXPRESSION)
      }
    };
    const hatchLayer = {
      id: hatchLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-pattern": hatchImageId,
        "fill-opacity": territoryDensityEnabled
          ? 0
          : withTerritoryRadiusOutsideOpacity(TERRITORY_HATCH_FILL_OPACITY_EXPRESSION)
      }
    };
    const lineLayer = {
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": ["get", "color"],
        "line-opacity": withTerritoryRadiusOutsideOpacity(TERRITORY_LINE_OPACITY),
        "line-width": TERRITORY_LINE_WIDTH
      }
    };

    if (territoryHoldInitialRender) {
      fillLayer.filter = TERRITORY_HOLD_FILTER;
      hatchLayer.filter = TERRITORY_HOLD_FILTER;
      lineLayer.filter = TERRITORY_HOLD_FILTER;
    } else {
      fillLayer.filter = combineTerritoryFilters(
        excludeFilter,
        geoTypeFilter,
        TERRITORY_STATUS_NON_ESTABLISHED_FILTER
      );
      hatchLayer.filter = combineTerritoryFilters(
        excludeFilter,
        geoTypeFilter,
        TERRITORY_STATUS_ESTABLISHED_FILTER
      );
      lineLayer.filter = combineTerritoryFilters(excludeFilter, geoTypeFilter);
    }

    territoryMap.addLayer(fillLayer);
    territoryMap.addLayer(hatchLayer);
    territoryMap.addLayer(lineLayer);
    territoryLineLayerIds.push(lineLayerId);

    if (!territoryBordersEnabled || territoryDensityEnabled) {
      territoryMap.setLayoutProperty(lineLayerId, "visibility", "none");
    }

    geoLayers.set(geoType, { fillLayerId, hatchLayerId, lineLayerId });
    layerIds.push(fillLayerId, hatchLayerId, lineLayerId);
  });

  let activeLogoLayerId = null;

  if (logoFeatureCollection.features.length) {
    const logoSourceId = `${sourceId}-logos`;
    const logoMinZoom = getTerritoryLogoMinZoom();

    territoryMap.addSource(logoSourceId, {
      type: "geojson",
      data: logoFeatureCollection,
      promoteId: getTerritoryPromoteId(),
      maxzoom: TERRITORY_SOURCE_MAX_ZOOM
    });

    territoryBrandLogoInfo.set(brand.id, {
      sourceId: logoSourceId,
      imageWidth: logoMeta?.imageWidth || TERRITORY_LOGO_TEXTURE_SIZE,
      collection: logoFeatureCollection
    });

    if (logoMeta) {
      const logoLayer = {
        id: logoLayerId,
        type: "symbol",
        source: logoSourceId,
        minzoom: logoMinZoom,
        layout: {
          "icon-image": logoMeta.imageId,
          "icon-size": logoMeta.iconSize,
          "icon-offset": ["coalesce", ["get", "iconOffset"], ["literal", [0, 0]]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true
        }
      };

      if (territoryHoldInitialRender) {
        logoLayer.filter = TERRITORY_HOLD_FILTER;
      }

      territoryMap.addLayer(logoLayer);
      activeLogoLayerId = logoLayerId;
      layerIds.push(logoLayerId);

      if (!territoryBrandLogosEnabled) {
        territoryMap.setLayoutProperty(logoLayerId, "visibility", "none");
      }
    }
  }

  territoryBrandLayerIds.set(brand.id, {
    geoLayers,
    logoLayerId: activeLogoLayerId
  });

  return layerIds;
}

function reorderBrandTerritoryLayers(territoryMap, brands) {
  TERRITORY_GEO_TYPE_RENDER_ORDER.forEach((geoType) => {
    brands.forEach((brand) => {
      const geoLayers = territoryBrandLayerIds.get(brand.id)?.geoLayers?.get(geoType);
      if (!geoLayers) return;
      [geoLayers.fillLayerId, geoLayers.hatchLayerId, geoLayers.lineLayerId].forEach((layerId) => {
        if (territoryMap.getLayer(layerId)) territoryMap.moveLayer(layerId);
      });
    });
  });

  brands.forEach((brand) => {
    const logoLayerId = territoryBrandLayerIds.get(brand.id)?.logoLayerId;
    if (logoLayerId && territoryMap.getLayer(logoLayerId)) {
      territoryMap.moveLayer(logoLayerId);
    }
  });
}

function getFirstBrandTerritoryLayerId(territoryMap, brands) {
  for (const geoType of TERRITORY_GEO_TYPE_RENDER_ORDER) {
    for (const brand of brands) {
      const fillLayerId = territoryBrandLayerIds.get(brand.id)?.geoLayers?.get(geoType)?.fillLayerId;
      if (fillLayerId && territoryMap.getLayer(fillLayerId)) return fillLayerId;
    }
  }
  return null;
}

async function loadTerritoryData(territoryMap) {
  try {
    const {
      statesGeojson,
      countiesGeojson,
      geoFeaturesGeojson,
      macrodata,
      brands
    } = await loadTerritoryDataBundle();

    const statesByCode = new Map(
      statesGeojson.features.map((feature) => [feature.properties.code, feature])
    );
    const countiesByFips = countiesGeojson
      ? new Map(countiesGeojson.features.map((feature) => [feature.properties.fips, feature]))
      : new Map();
    const geoFeaturesByKey = geoFeaturesGeojson
      ? new Map(geoFeaturesGeojson.features.map((feature) => [feature.properties.geoKey, feature]))
      : new Map();
    const geoIndex = { statesByCode, countiesByFips, geoFeaturesByKey };

    territoryIntersectionCache.clear();
    territoryIntersectionIndex = new Map();
    territoryStatesByCode = statesByCode;
    territoryCountiesByFips = countiesByFips;
    territoryGeoFeaturesByKey = geoFeaturesByKey;
    territoryGeoLevel = brands.some((brand) => isGeoLevelBrand(brand))
      ? "geo"
      : brands.some((brand) => isCountyLevelBrand(brand))
        ? "county"
        : "state";
    ensureTerritoryRadiusLayers(territoryMap);

    const geoOccupancy = new Map();
    brands.forEach((brand) => {
      brand.territories.forEach((territory) => {
        const geoKey = getTerritoryGeoKey(brand, territory);
        if (!geoOccupancy.has(geoKey)) {
          geoOccupancy.set(geoKey, []);
        }
        geoOccupancy.get(geoKey).push(brand.id);
      });
    });

    const sharedGeoKeys = [...geoOccupancy.entries()]
      .filter(([, occupants]) => occupants.length > 1)
      .map(([geoKey]) => geoKey);

    const brandsById = new Map(brands.map((brand) => [brand.id, brand]));

    const interactiveLayerIds = [];
    let firstLogoLayerId = null;

    for (const brand of brands) {
      const featureCollection = buildBrandFeatureCollection(brand, geoIndex);
      const logoMeta = await loadBrandLogoImage(territoryMap, brand);
      const logoFeatureCollection = buildBrandLogoFeatureCollection(
        brand,
        geoIndex,
        geoOccupancy,
        logoMeta?.imageWidth || TERRITORY_LOGO_TEXTURE_SIZE
      );
      interactiveLayerIds.push(
        ...addBrandTerritoryLayers(
          territoryMap,
          brand,
          featureCollection,
          logoFeatureCollection,
          logoMeta,
          null
        )
      );

      if (!firstLogoLayerId) {
        const logoLayerId = `territories-${brand.id}-logo`;
        if (territoryMap.getLayer(logoLayerId)) {
          firstLogoLayerId = logoLayerId;
        }
      }
    }

    reorderBrandTerritoryLayers(territoryMap, brands);

    const sharedHitLayerIds = addSharedTerritoryLayers(
      territoryMap,
      sharedGeoKeys,
      geoOccupancy,
      brandsById,
      geoIndex,
      firstLogoLayerId
    );

    const hoverLayerIds = [...interactiveLayerIds, ...sharedHitLayerIds];

    bindTerritoryHoverInteractions(
      territoryMap,
      hoverLayerIds,
      hoverLayerIds
    );

    territoryBrands = brands;
    territoryBrandsById = brandsById;
    territoryRegistry = buildTerritoryRegistry(brands, geoIndex);
    territoryStateOccupancy = geoOccupancy;
    territoryStatesByCode = statesByCode;
    territoryStateMacrodata = new Map(Object.entries(macrodata.states || {}));
    addTerritoryDensityLayers(
      territoryMap,
      getFirstBrandTerritoryLayerId(territoryMap, brands)
    );
    window.territoryBrands = brands;

    // onDataReady restores the selected filter state and performs the only
    // initial visibility commit. Until that synchronous pass, cached sources
    // remain hidden behind their hold filters/layout.
    window.territoryFilters?.onDataReady?.(brands, territoryRegistry);

    if (territoryPendingGeolocationCoordinates) {
      void applyTerritoryGeolocationCoordinates(territoryPendingGeolocationCoordinates);
    }

    if (territoryPendingFocusCoordinates) {
      const { longitude, latitude, radiusMiles } = territoryPendingFocusCoordinates;
      territoryPendingFocusCoordinates = null;
      focusTerritoryCoordinates(longitude, latitude, radiusMiles);
    } else if (territoryPendingFocusStateCode) {
      const stateCode = territoryPendingFocusStateCode;
      territoryPendingFocusStateCode = null;
      focusTerritoryMapOnState(territoryMap, stateCode);
    }

    scheduleInitialTerritoryMapReveal(territoryMap);
  } catch (error) {
    console.error(error);
    renderTerritoryMapError("Territory data could not be loaded.");
  }
}

function installTerritoryMockGeolocation() {
  if (!TERRITORY_MOCK_USER_LOCATION || !navigator.geolocation) return;

  const createMockPosition = () => ({
    coords: {
      latitude: TERRITORY_MOCK_USER_COORDS.latitude,
      longitude: TERRITORY_MOCK_USER_COORDS.longitude,
      accuracy: TERRITORY_MOCK_USER_COORDS.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  });

  const geolocation = navigator.geolocation;

  geolocation.getCurrentPosition = (success) => {
    window.setTimeout(() => success(createMockPosition()), 0);
  };

  geolocation.watchPosition = (success) => {
    const watchId = window.setTimeout(() => success(createMockPosition()), 0);
    return watchId;
  };

  geolocation.clearWatch = (watchId) => {
    window.clearTimeout(watchId);
  };
}

function initializeTerritoryMap() {
  installTerritoryMockGeolocation();
  bindTerritoryInfoCard();
  territoryMapHasLoaded = false;

  if (!window.mapboxgl) {
    renderTerritoryMapError("Mapbox GL could not be loaded.");
    return;
  }

  const accessToken = window.CST_ENV?.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    renderTerritoryMapError("Mapbox access token is missing.");
    return;
  }

  mapboxgl.accessToken = accessToken;

  void loadTerritoryMapStyle(accessToken)
    .catch((error) => {
      console.warn("Unable to patch the territory map style; using the raw style URL.", error);
      return TERRITORY_MAP_STYLE;
    })
    .then((style) => {
      const territoryMap = new mapboxgl.Map({
        container: "territoryMap",
        style,
        center: TERRITORY_MAP_CENTER,
        zoom: TERRITORY_MAP_ZOOM,
        projection: "mercator",
        logoPosition: "bottom-left",
        attributionControl: false,
        preserveDrawingBuffer: true
      });

      territoryGeolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        fitBoundsOptions: {
          zoom: TERRITORY_GEOLOCATE_ZOOM,
          maxZoom: TERRITORY_GEOLOCATE_ZOOM
        },
        trackUserLocation: false,
        showUserHeading: false
      });
      territoryGeolocateControl.on("geolocate", (event) => {
        void applyTerritoryGeolocationCoordinates(event.coords);
      });
      territoryMap.addControl(territoryGeolocateControl, "bottom-right");

      territoryMap.addControl(new mapboxgl.NavigationControl({
        visualizePitch: false
      }), "bottom-right");

      territoryMap.on("load", () => {
        territoryMapHasLoaded = true;
        bindTerritoryMapResetControl(territoryMap);
        loadTerritoryData(territoryMap);

        if (territoryGeolocationPending) {
          territoryGeolocationPending = false;
          territoryGeolocateControl?.trigger?.();
        }
      });

      window.territoryMap = territoryMap;
    });
}

function syncTerritoryBorderVisibility() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const accentVisibility = territoryBordersEnabled && !territoryDensityEnabled
    ? "visible"
    : "none";
  territoryLineLayerIds.forEach((layerId) => {
    if (!territoryMap.getLayer(layerId)) return;
    territoryMap.setLayoutProperty(layerId, "visibility", accentVisibility);
  });

  if (territoryMap.getLayer(TERRITORY_DENSITY_LINE_LAYER_ID)) {
    territoryMap.setLayoutProperty(
      TERRITORY_DENSITY_LINE_LAYER_ID,
      "visibility",
      territoryBordersEnabled && territoryDensityEnabled ? "visible" : "none"
    );
  }
}

function setTerritoryBordersVisible(isVisible) {
  territoryBordersEnabled = isVisible;
  syncTerritoryBorderVisibility();
}

function getTerritoryBordersVisible() {
  return territoryBordersEnabled;
}

function syncTerritoryVisualizationLayers({ reapplyFilters = true } = {}) {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  clearTerritoryMapHover?.();
  clearSidebarTerritoryHover();

  if (!territoryDensityEnabled) {
    clearTerritoryDensityHover(territoryMap);
  }

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    layerIds.geoLayers.forEach((geoLayers) => {
      if (geoLayers.fillLayerId && territoryMap.getLayer(geoLayers.fillLayerId)) {
        territoryMap.setPaintProperty(
          geoLayers.fillLayerId,
          "fill-opacity",
          territoryDensityEnabled
            ? 0
            : withTerritoryRadiusOutsideOpacity(TERRITORY_FILL_OPACITY_EXPRESSION)
        );
      }

      if (geoLayers.hatchLayerId && territoryMap.getLayer(geoLayers.hatchLayerId)) {
        territoryMap.setPaintProperty(
          geoLayers.hatchLayerId,
          "fill-opacity",
          territoryDensityEnabled
            ? 0
            : withTerritoryRadiusOutsideOpacity(TERRITORY_HATCH_FILL_OPACITY_EXPRESSION)
        );
      }
    });
  });

  if (territoryMap.getLayer(TERRITORY_DENSITY_FILL_LAYER_ID)) {
    territoryMap.setLayoutProperty(
      TERRITORY_DENSITY_FILL_LAYER_ID,
      "visibility",
      territoryDensityEnabled ? "visible" : "none"
    );
  }

  if (territorySharedConsolidated && territoryRegistry.length) {
    const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
    const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
    const visibleOccupantsByState = buildVisibleOccupantsByState(matchingKeys);
    updateConsolidatedSharedTerritories(territoryMap, visibleOccupantsByState);
  }

  syncTerritoryBorderVisibility();

  if (reapplyFilters && territoryRegistry.length) {
    applyTerritoryFilters(territoryLastMatchingRecords || territoryRegistry);
  }
}

function setTerritoryDensityEnabled(isEnabled, { reapplyFilters = true } = {}) {
  territoryDensityEnabled = Boolean(isEnabled);
  syncTerritoryVisualizationLayers({ reapplyFilters });
}

function getTerritoryDensityEnabled() {
  return territoryDensityEnabled;
}

function setTerritoryBrandLogosVisible(isVisible) {
  territoryBrandLogosEnabled = isVisible;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const visibility = isVisible ? "visible" : "none";

  territoryBrandLayerIds.forEach((layerIds) => {
    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      territoryMap.setLayoutProperty(layerIds.logoLayerId, "visibility", visibility);
    }
  });
}

function getTerritoryBrandLogosVisible() {
  return territoryBrandLogosEnabled;
}

function clearSidebarTerritoryHover() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !sidebarHoveredTerritoryState) return;

  if (sidebarHoveredTerritoryState.density) {
    clearTerritoryDensityHover(territoryMap);
  } else {
    clearBrandTerritoryHoverHighlight(territoryMap, sidebarHoveredTerritoryState);
  }
  sidebarHoveredTerritoryState = null;
}

function setSidebarTerritoryHover(brandId, stateCode) {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const hoverKey = territoryDensityEnabled ? `density:${stateCode}` : `${brandId}:${stateCode}`;
  if (sidebarHoveredTerritoryState?.key === hoverKey) return;

  clearTerritoryMapHover?.();
  clearSidebarTerritoryHover();

  if (territoryDensityEnabled) {
    if (setTerritoryDensityHover(territoryMap, stateCode)) {
      sidebarHoveredTerritoryState = { key: hoverKey, density: true };
    }
    return;
  }

  const highlight = applyBrandTerritoryHoverHighlight(territoryMap, brandId, stateCode);
  if (!highlight) return;

  sidebarHoveredTerritoryState = {
    key: hoverKey,
    ...highlight
  };
}

function clearSelectedTerritoryFeatureStates() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !selectedTerritoryFeatureStates.length) return;

  selectedTerritoryFeatureStates.forEach((featureState) => {
    territoryMap.setFeatureState(featureState, { selected: false });
  });
  selectedTerritoryFeatureStates = [];
}

function setSelectedTerritoryFeatureStates(records) {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  clearSelectedTerritoryFeatureStates();

  records.forEach((record) => {
    if (!record) return;

    const featureState = {
      source: `territories-${record.brandId}`,
      id: record.geoKey || record.state
    };
    territoryMap.setFeatureState(featureState, { selected: true });
    selectedTerritoryFeatureStates.push(featureState);
  });
}

function syncSelectedTerritoryMap({ refreshMapView = true, skipInfoCard = false } = {}) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;

  if (selectedTerritoryKey) {
    const primaryStillVisible = matchingRecords.some(
      (record) => territoryRecordKey(record) === selectedTerritoryKey
    );
    if (!primaryStillVisible) {
      selectedTerritoryKey = null;
      compareTerritoryKey = null;
    }
  }

  if (compareTerritoryKey) {
    const compareStillVisible = matchingRecords.some(
      (record) => territoryRecordKey(record) === compareTerritoryKey
    );
    if (!compareStillVisible || compareTerritoryKey === selectedTerritoryKey) {
      compareTerritoryKey = null;
    }
  }

  const selectedRecords = getSelectedTerritoryRecords(matchingRecords);

  clearTerritoryMapHover?.();
  clearSelectedTerritoryFeatureStates();
  renderTerritoryRecords(selectedRecords.length ? selectedRecords : matchingRecords);
  setSelectedTerritoryFeatureStates(selectedRecords);
  window.territoryBrandPanel?.setSelectedTerritory?.(selectedTerritoryKey, compareTerritoryKey);
  if (!skipInfoCard) {
    showTerritoryInfoCards(selectedRecords[0] || null, selectedRecords[1] || null);
  }

  if (!selectedTerritoryKey && refreshMapView) {
    scheduleTerritoryMapViewForFilters(window.territoryMap, matchingRecords);
  }

  return selectedRecords[0] || null;
}

function toggleSelectedTerritory(brandId, stateCode, { compare = false } = {}) {
  clearTerritoryDetailReturn();
  const nextKey = `${brandId}:${stateCode}`;

  if (compare) {
    if (!selectedTerritoryKey) {
      selectedTerritoryKey = nextKey;
      compareTerritoryKey = null;
    } else if (nextKey === compareTerritoryKey) {
      compareTerritoryKey = null;
    } else if (nextKey !== selectedTerritoryKey) {
      compareTerritoryKey = nextKey;
    }
  } else if (selectedTerritoryKey === nextKey && !compareTerritoryKey) {
    selectedTerritoryKey = null;
    compareTerritoryKey = null;
  } else {
    selectedTerritoryKey = nextKey;
    compareTerritoryKey = null;
  }

  applySelectedTerritorySelection();
}

function selectTerritory(brandId, stateCode, { returnToAreaCard = false } = {}) {
  territoryDetailReturnGeoKey = returnToAreaCard && territoryAreaCardGeoKey
    ? territoryAreaCardGeoKey
    : null;
  selectedTerritoryKey = `${brandId}:${stateCode}`;
  compareTerritoryKey = null;
  applySelectedTerritorySelection();
}

function applySelectedTerritorySelection() {
  territoryInfoDismissedKey = null;
  const hasSelection = Boolean(selectedTerritoryKey || compareTerritoryKey);

  syncSelectedTerritoryMap({ refreshMapView: false });

  const mapPanelReady = hasSelection
    ? setTerritoryMapPanelOpen(true)
    : whenTerritoryMapPanelLayoutSettled();

  const selectedRecords = getSelectedTerritoryRecords();
  if (selectedRecords.length) {
    mapPanelReady.then(() => {
      scheduleTerritorySelectionMapFocus(selectedRecords);
    });
  }
}

function scheduleTerritorySelectionMapFocus(selectedRecords, attempt = 0) {
  window.requestAnimationFrame(() => {
    const card = getTerritoryInfoCardElement();
    const stack = getTerritoryInfoStackElement();
    const cardReady = Boolean(
      stack
      && !stack.hidden
      && card
      && !card.hidden
      && card.offsetHeight > 0
    );

    // Wait until the detail card has layout height so bottom inset is accurate.
    if (!cardReady && attempt < 8) {
      scheduleTerritorySelectionMapFocus(selectedRecords, attempt + 1);
      return;
    }

    focusTerritoryMapOnSelectedRecords(window.territoryMap, selectedRecords);
  });
}

function clearCompareTerritory() {
  if (!compareTerritoryKey) return;
  compareTerritoryKey = null;
  syncSelectedTerritoryMap({ refreshMapView: false });

  const selectedRecords = getSelectedTerritoryRecords();
  if (selectedRecords.length === 1) {
    scheduleTerritorySelectionMapFocus(selectedRecords);
  }
}

function clearSelectedTerritory({ refreshMapView = true, closeMapPanel = false } = {}) {
  if (!selectedTerritoryKey && !compareTerritoryKey) return;
  selectedTerritoryKey = null;
  compareTerritoryKey = null;
  territoryInfoDismissedKey = null;
  syncSelectedTerritoryMap({ refreshMapView });

  if (closeMapPanel) {
    hideTerritoryInfoCard({ immediate: true });
    setTerritoryMapPanelOpen(false);
  }
}

function triggerTerritoryGeolocation() {
  if (!territoryMapHasLoaded) {
    territoryGeolocationPending = true;
    return true;
  }

  return territoryGeolocateControl?.trigger?.() ?? false;
}

function focusTerritoryState(stateCode) {
  if (!stateCode) return false;

  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryStatesByCode.has(stateCode)) {
    territoryPendingFocusStateCode = stateCode;
    territoryPendingFocusCoordinates = null;
    return true;
  }

  territoryPendingFocusStateCode = null;
  territoryPendingFocusCoordinates = null;
  focusTerritoryMapOnState(territoryMap, stateCode);
  return true;
}

function getTerritoryMapSearchBounds(longitude, latitude, radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES) {
  const latDelta = radiusMiles / TERRITORY_MILES_PER_LATITUDE_DEGREE;
  const lngDelta = radiusMiles / (
    TERRITORY_MILES_PER_LATITUDE_DEGREE * Math.cos((latitude * Math.PI) / 180)
  );

  return {
    west: longitude - lngDelta,
    east: longitude + lngDelta,
    south: latitude - latDelta,
    north: latitude + latDelta
  };
}

function focusTerritoryMapOnSearchArea(longitude, latitude, radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !window.mapboxgl) return;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const { west, east, south, north } = getTerritoryMapSearchBounds(longitude, latitude, radiusMiles);
  focusTerritoryMapOnBounds(
    territoryMap,
    new mapboxgl.LngLatBounds([west, south], [east, north])
  );
}

function focusTerritoryCoordinates(longitude, latitude, radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;

  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryMapHasLoaded) {
    territoryPendingFocusCoordinates = { longitude, latitude, radiusMiles };
    territoryPendingFocusStateCode = null;
    return true;
  }

  territoryPendingFocusCoordinates = null;
  territoryPendingFocusStateCode = null;
  focusTerritoryMapOnSearchArea(longitude, latitude, radiusMiles);
  return true;
}

window.territoryMapControls = {
  setTerritoryBordersVisible,
  getTerritoryBordersVisible,
  setTerritoryDensityEnabled,
  getTerritoryDensityEnabled,
  setTerritoryBrandLogosVisible,
  getTerritoryBrandLogosVisible,
  setTerritoryRadiusFilter,
  triggerTerritoryGeolocation,
  focusTerritoryState,
  focusTerritoryCoordinates,
  getStateCodeForCoordinates,
  updateResetVisibility: updateTerritoryMapResetVisibility,
  clearHover: () => clearTerritoryMapHover?.()
};

window.territoryMapPanel = {
  isOpen: isTerritoryMapPanelOpen,
  setOpen: setTerritoryMapPanelOpen,
  whenLayoutSettled: whenTerritoryMapPanelLayoutSettled,
  syncToggleAvailability: syncTerritoryMapToggleAvailability
};

window.territoryMapFilters = {
  applyTerritoryFilters,
  hideTerritoryRecords,
  scheduleFilteredReveal: scheduleTerritoryMapFilteredReveal,
  getTerritoryRegistry: () => territoryRegistry
};

window.territoryMapSelection = {
  toggle: toggleSelectedTerritory,
  select: selectTerritory,
  clear: clearSelectedTerritory,
  clearCompare: clearCompareTerritory,
  getSelectedKey: () => selectedTerritoryKey,
  getCompareKey: () => compareTerritoryKey
};

window.territoryMapHover = {
  set: setSidebarTerritoryHover,
  clear: clearSidebarTerritoryHover
};

// The map is heavy to spin up, so we hold off until the user picks a starting
// point from the crossroad screen (a fresh search or a saved preset). The
// crossroad calls window.startTerritoryMap() once a choice is made. When the
// crossroad markup is absent we fall back to auto-initializing immediately.
function startTerritoryMap() {
  if (window.__territoryMapStarted) return;
  window.__territoryMapStarted = true;
  initializeTerritoryMap();
}

window.startTerritoryMap = startTerritoryMap;

initTerritoryMapPanelToggle();

if (!document.querySelector("[data-territory-crossroad]")) {
  startTerritoryMap();
}
