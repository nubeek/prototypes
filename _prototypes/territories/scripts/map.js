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
// Search this area is limited to a regional viewport. Wider than this and the
// visible map would swallow most territories, so the pill becomes a zoom hint.
const TERRITORY_MAP_SEARCH_MAX_SPAN_MILES = window.CST_ENV?.MAP_SEARCH_MAX_SPAN_MILES ?? 1000;
const TERRITORY_MAP_SEARCH_FIT_SPAN_MILES = TERRITORY_MAP_SEARCH_MAX_SPAN_MILES * 0.92;
const TERRITORY_MAP_RESET_LABEL = "Reset map view";
const TERRITORY_MAP_SEARCH_AREA_LABEL = "Search this area";
const TERRITORY_MAP_SEARCH_TOO_LARGE_LABEL = "Area too large to search - zoom in";
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
const TERRITORY_INFO_CARD_MAX_VIEWPORT_RATIO = 0.5;
const TERRITORY_INFO_CARD_SLIDE_MS = 340;
const TERRITORY_SHAPE_FOCUS_BREAKPOINT = 761;
const TERRITORY_STATES_URL = "data/us-states.geojson";
const TERRITORY_COUNTIES_URL = "data/us-counties.geojson";
const TERRITORY_REAL_GEOMETRY_URL = "data/real/geometry.geojson";
const TERRITORY_MACRODATA_URL = "data/state-macrodata.json";
const territoryDataCachePromises = new Map();
const TERRITORY_FILL_OPACITY = 0.15;
const TERRITORY_FILL_HOVER_OPACITY = 0.3;
const TERRITORY_PASTEL_FILL_OPACITY = 0.1;
const TERRITORY_PASTEL_FILL_OPACITY_MID = 0.2;
const TERRITORY_PASTEL_FILL_OPACITY_HIGH = 0.25;
const TERRITORY_PASTEL_FILL_HOVER_OPACITY = 0.3;
const TERRITORY_PASTEL_FILL_HOVER_OPACITY_MID = 0.4;
const TERRITORY_PASTEL_FILL_HOVER_OPACITY_HIGH = 0.45;
// Pastel still paints at most 5 stacked fills. These thresholds use the full
// matching occupant count so denser territories read stronger.
const TERRITORY_PASTEL_FILL_OCCUPANCY_MID_MIN = 6;
const TERRITORY_PASTEL_FILL_OCCUPANCY_HIGH_MIN = 20;
const TERRITORY_FILL_SELECTED_OPACITY = 0.65;
const TERRITORY_HATCH_FILL_OPACITY = 0.4;
const TERRITORY_HATCH_FILL_HOVER_OPACITY = 0.65;
const TERRITORY_HATCH_LINE_PX = 2;
const TERRITORY_HATCH_GAP_PX = 2;
const TERRITORY_HATCH_PIXEL_RATIO = 2;
const TERRITORY_LINE_OPACITY = 0.5;
const TERRITORY_LINE_SELECTED_OPACITY = 0.8;
const TERRITORY_PASTEL_LINE_OPACITY = 0.4;
const TERRITORY_PASTEL_LINE_OPACITY_MID = 0.5;
const TERRITORY_PASTEL_LINE_OPACITY_HIGH = 0.6;
const TERRITORY_PASTEL_LINE_HOVER_OPACITY = 0.8;
const TERRITORY_PASTEL_LINE_SELECTED_OPACITY = 0.85;
const TERRITORY_WHITE_LINE_OPACITY = 0.88;
const TERRITORY_WHITE_LINE_SELECTED_OPACITY = 1;
const TERRITORY_LINE_WIDTH = 2;
// Shared (multi-brand) territories are painted by stacking each brand's own
// fill/hatch layers, up to TERRITORY_SHAPE_MAX_VISIBLE occupants. The
// consolidated shared source only carries an invisible hit layer so hover
// and click treat the whole territory as one target.
const TERRITORY_SHARED_ALL_SOURCE_ID = "territories-shared-all";
const TERRITORY_SHARED_ALL_HIT_LAYER_ID = "territories-shared-all-hit";
const TERRITORY_SHAPE_MAX_VISIBLE = 5;
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
const TERRITORY_DENSITY_HIGH_COLOR = "#81599a";
const TERRITORY_PASTEL_COLORS = [
  "#F7D06A",
  "#F9A474",
  "#D8A0F9",
  "#8CCD6C",
  "#8DACF5"
];
const TERRITORY_DENSITY_FILL_OPACITY_MIN = 0.05;
const TERRITORY_DENSITY_FILL_OPACITY_MAX = 0.72;
const TERRITORY_DENSITY_LINE_OPACITY_MIN = 0.2;
const TERRITORY_DENSITY_LINE_OPACITY_MAX = 0.8;
const TERRITORY_DENSITY_OPACITY_CURVE = 0.7;
const TERRITORY_DENSITY_FILL_OPACITY_EXPRESSION = ["get", "fillOpacity"];
const TERRITORY_DENSITY_LINE_OPACITY_EXPRESSION = ["get", "lineOpacity"];
const TERRITORY_DENSITY_FILL_HOVER_OPACITY_EXPRESSION = [
  "min",
  1,
  ["+", TERRITORY_DENSITY_FILL_OPACITY_EXPRESSION, 0.2]
];
const TERRITORY_DENSITY_LINE_HOVER_OPACITY_EXPRESSION = [
  "min",
  1,
  ["+", TERRITORY_DENSITY_LINE_OPACITY_EXPRESSION, 0.15]
];
const TERRITORY_AREA_CONTEXT_OPACITY = 0.15;
const TERRITORY_AREA_CONTEXT_HOVER_OPACITY = 0.3;
const TERRITORY_AREA_CONTEXT_LINE_OPACITY = 0.25;
const TERRITORY_AREA_CONTEXT_LINE_HOVER_OPACITY = 0.4;
const TERRITORY_BRAND_AREA_CONTEXT_FILL_OPACITY = 0.03;
const TERRITORY_BRAND_AREA_CONTEXT_LINE_OPACITY = 0.08;
const TERRITORY_AREA_CONTEXT_FILL_COLOR = "#b4b4b8";
const TERRITORY_AREA_CONTEXT_LINE_COLOR = "#8d8d93";
const TERRITORY_CONTEXT_HATCH_IMAGE_ID = "territory-hatch-context";
const TERRITORY_AREA_FOCUS_OPACITY = 0.5;
const TERRITORY_AREA_FOCUS_LINE_OPACITY = 0.65;
const TERRITORY_DENSITY_SOURCE_ID = "territories-density";
const TERRITORY_DENSITY_FILL_LAYER_ID = "territories-density-fill";
const TERRITORY_DENSITY_LINE_LAYER_ID = "territories-density-line";
const TERRITORY_AREA_FOCUS_FILL_LAYER_ID = "territories-area-focus-fill";
const TERRITORY_AREA_FOCUS_LINE_LAYER_ID = "territories-area-focus-line";
const TERRITORY_RADIUS_SOURCE_ID = "territory-radius-circles";
const TERRITORY_RADIUS_FILL_LAYER_ID = "territory-radius-circles-fill";
const TERRITORY_RADIUS_OUTLINE_LAYER_ID = "territory-radius-circles-outline";
// Parts of territories outside the active radius fade to this absolute opacity
// for both fill and stroke.
const TERRITORY_RADIUS_OUTSIDE_OPACITY = 0.1;
const TERRITORY_RADIUS_OUTSIDE_GEOKEY_SUFFIX = "__radius_outside";
const TERRITORY_LOCATION_POINT_FOCUS_MILES = 50;
const TERRITORY_REVEAL_DURATION_MS = 1500;
const TERRITORY_REVEAL_FADE_MS = 220;
const TERRITORY_REVEAL_MIN_MILES = 14;
// Start state polygons during the second half of the city / county / CBSA sweep
// so they still come late, but not as a separate final beat.
const TERRITORY_REVEAL_STATE_OVERLAP = 0.55;
const TERRITORY_LOCATION_SHAPE_GEO_TYPES = new Set(["place", "district", "cbsa"]);
const TERRITORY_EARTH_RADIUS_MILES = 3958.8;
const TERRITORY_FILL_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_FILL_SELECTED_OPACITY,
  ["boolean", ["feature-state", "hover"], false],
  TERRITORY_FILL_HOVER_OPACITY,
  TERRITORY_FILL_OPACITY
];
const TERRITORY_PASTEL_FILL_OCCUPANCY_BUCKET_EXPRESSION = [
  "coalesce",
  ["feature-state", "occupancyBucket"],
  1
];
const TERRITORY_PASTEL_FILL_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_FILL_SELECTED_OPACITY,
  ["boolean", ["feature-state", "hover"], false],
  [
    "match",
    TERRITORY_PASTEL_FILL_OCCUPANCY_BUCKET_EXPRESSION,
    2,
    TERRITORY_PASTEL_FILL_HOVER_OPACITY_MID,
    3,
    TERRITORY_PASTEL_FILL_HOVER_OPACITY_HIGH,
    TERRITORY_PASTEL_FILL_HOVER_OPACITY
  ],
  [
    "match",
    TERRITORY_PASTEL_FILL_OCCUPANCY_BUCKET_EXPRESSION,
    2,
    TERRITORY_PASTEL_FILL_OPACITY_MID,
    3,
    TERRITORY_PASTEL_FILL_OPACITY_HIGH,
    TERRITORY_PASTEL_FILL_OPACITY
  ]
];
const TERRITORY_HATCH_FILL_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_FILL_SELECTED_OPACITY,
  ["boolean", ["feature-state", "hover"], false],
  TERRITORY_HATCH_FILL_HOVER_OPACITY,
  TERRITORY_HATCH_FILL_OPACITY
];
const TERRITORY_LINE_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_LINE_SELECTED_OPACITY,
  TERRITORY_LINE_OPACITY
];
const TERRITORY_PASTEL_LINE_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_PASTEL_LINE_SELECTED_OPACITY,
  ["boolean", ["feature-state", "hover"], false],
  TERRITORY_PASTEL_LINE_HOVER_OPACITY,
  [
    "match",
    TERRITORY_PASTEL_FILL_OCCUPANCY_BUCKET_EXPRESSION,
    2,
    TERRITORY_PASTEL_LINE_OPACITY_MID,
    3,
    TERRITORY_PASTEL_LINE_OPACITY_HIGH,
    TERRITORY_PASTEL_LINE_OPACITY
  ]
];
const TERRITORY_WHITE_LINE_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  TERRITORY_WHITE_LINE_SELECTED_OPACITY,
  TERRITORY_WHITE_LINE_OPACITY
];

function withTerritoryRadiusOutsideOpacity(baseOpacity) {
  return [
    "case",
    ["==", ["get", "radiusZone"], "outside"],
    TERRITORY_RADIUS_OUTSIDE_OPACITY,
    baseOpacity
  ];
}

function withTerritoryRevealOpacity(baseOpacity) {
  if (!territoryRevealActive) return baseOpacity;
  return [
    "*",
    [
      "case",
      ["boolean", ["feature-state", "reveal"], false],
      1,
      0
    ],
    baseOpacity
  ];
}

function withTerritoryContextHiddenOpacity(baseOpacity) {
  return [
    "case",
    ["boolean", ["feature-state", "contextHidden"], false],
    0,
    baseOpacity
  ];
}

function withTerritoryLayerOpacity(baseOpacity) {
  return withTerritoryRevealOpacity(
    withTerritoryRadiusOutsideOpacity(withTerritoryContextHiddenOpacity(baseOpacity))
  );
}

function prefersTerritoryReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
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
const territoryLayerFilterSignatures = new Map();
// Set only once the consolidated shared hit layer exists; null means shared
// territories have no dedicated hit target yet.
let territorySharedConsolidated = null;
let territoryBaseHoverLayerIds = [];
const TERRITORY_WHITE_BORDER_COLOR = "#ffffff";
let territoryBordersEnabled = true;
let territoryBorderColorMode = "default";
let territoryDensityEnabled = true;
let territoryPastelColorsEnabled = false;
const territoryPastelColorByBrandId = new Map();
let territoryDensitySignature = null;
let territoryDensityDataStale = true;
let territoryBrandLogosEnabled = false;
let territoryBrands = [];
let territoryBrandsById = new Map();
let territoryRegistry = [];
let territoryStateOccupancy = new Map();
let territoryStatesByCode = new Map();
const territoryStateBoundsByCode = new Map();
let territoryCountiesByFips = new Map();
let territoryGeoFeaturesByKey = new Map();
let territoryGeoLevel = "state";
let territoryStateMacrodata = new Map();
let territoryLastMatchingRecords = null;
let territoryRenderedRecords = null;
let territoryOccupantsByGeoKey = new Map();
const territoryPastelOccupancyState = new Map();
const territoryContextHiddenState = new Map();
let territoryRadiusFilter = {
  enabled: false,
  overlay: false,
  miles: 300,
  centers: []
};
let territorySkipNextFilterFit = false;
let territorySearchAreaInFlight = false;
let territoryViewportFramed = false;
let territoryRevealActive = false;
let territoryPendingRevealCenter = null;
let territoryPendingRevealRecords = null;
let territoryPendingRevealFromMapCenter = false;
let territoryRevealWhenListEnters = null;
let territoryRevealAfterOverlay = null;
let territoryRevealRaf = 0;
const territoryBrandBaseCollections = new Map();
let territoryRadiusFadeVisibleGeoKeys = new Set();
let territoryRadiusFadeSignature = "";
let selectedTerritoryKey = null;
let compareTerritoryKey = null;
let selectedTerritoryFeatureStates = [];
let territoryInfoDismissedKey = null;
let territoryInfoHideTimer = null;
let territoryInfoCardResizeCleanup = null;
let territoryAreaCardGeoKey = null;
let territoryDetailReturnGeoKey = null;
let territoryIntersectionIndex = new Map();
let territoryIntersectionScope = new Map();
const territoryIntersectionCache = new Map();
let territoryGeolocateControl = null;
let territoryMapHasLoaded = false;
let territoryGeolocationPending = false;
let territoryPendingFocusStateCode = null;
let territoryPendingFocusCoordinates = null;
let territoryPendingFocusSkipReveal = false;
let territoryPendingGeolocationCoordinates = null;
let territoryFilterFitRevision = 0;
let territoryInitialRevealCompleted = false;
let territoryFilteredRevealPending = false;
let territoryFilteredRevealArmed = false;
let territoryFilteredRevealToken = 0;
let territoryFilteredRevealTimer = 0;
let territoryFilteredRevealSettleTimer = 0;
let territoryResultsLoadingActive = false;
let territoryResultsCommit = null;
let territoryRevealCommitToken = 0;
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

function formatTerritoryGeoTypeLabel(geoType) {
  const normalized = normalizeTerritoryGeoType(geoType);
  return TERRITORY_GEO_TYPE_LABELS[normalized]
    || normalized.replace(/^\w/, (character) => character.toUpperCase());
}

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

const TERRITORY_MAP_LOADING_FADE_MS = window.WefranchMapPills?.FADE_MS ?? 240;
const TERRITORY_FILTERED_REVEAL_SETTLE_MS = 250;
const TERRITORY_FILTERED_REVEAL_TIMEOUT_MS = 5000;
const TERRITORY_MAP_PILL_CROSSFADE_MS = window.WefranchMapPills?.CROSSFADE_MS ?? 180;
const TERRITORY_MAP_VIEW_RESET_ZOOM_TOLERANCE = 0.05;
const TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE = 0.05;
let territoryBusyHeldForReveal = false;
let territoryMapBusyPills = null;
let territoryMapResetPills = null;
let territoryMapResizeObserver = null;
let territoryMapResizeFrame = null;
let territoryMapPanelAnimateRevision = 0;
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

function scheduleTerritoryMapResize() {
  if (!window.territoryMap || territoryMapResizeFrame !== null) return;

  territoryMapResizeFrame = window.requestAnimationFrame(() => {
    territoryMapResizeFrame = null;
    window.territoryMap?.resize?.();
  });
}

function ensureTerritoryMapResizeObserver() {
  if (territoryMapResizeObserver || typeof ResizeObserver !== "function") return;

  const mapContainer = document.getElementById("territoryMap");
  if (!mapContainer) return;

  territoryMapResizeObserver = new ResizeObserver(() => {
    scheduleTerritoryMapResize();
  });
  territoryMapResizeObserver.observe(mapContainer);
}

function setTerritoryMapPanelOpen(isOpen, { persist = true, animate = true } = {}) {
  const shell = document.querySelector(".territory-shell");
  const panel = document.getElementById("territoryMapPanel");
  const toggle = document.getElementById("territoryMapToggle");
  if (!shell || !panel || !toggle) return Promise.resolve();

  const nextOpen = Boolean(isOpen) && !isTerritoryCrossroadOpen();
  const changed = shell.classList.contains("is-map-panel-open") !== nextOpen;
  const shouldAnimate = changed
    && animate
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (shouldAnimate) {
    territoryMapPanelAnimateRevision += 1;
    shell.classList.add("is-map-panel-animating");
  } else if (changed) {
    territoryMapPanelAnimateRevision += 1;
    shell.classList.remove("is-map-panel-animating");
  }

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

  if (!shouldAnimate) {
    window.territoryMap?.resize?.();
    territoryMapPanelLayoutPromise = Promise.resolve();
    scheduleFilterFitAfterOpen();
    return territoryMapPanelLayoutPromise;
  }

  const animateRevision = territoryMapPanelAnimateRevision;
  territoryMapPanelLayoutPromise = new Promise((resolve) => {
    let settled = false;
    let fallbackTimer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      panel.removeEventListener("transitionend", handleTransitionEnd);
      panel.removeEventListener("transitioncancel", finish);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (animateRevision === territoryMapPanelAnimateRevision) {
        shell.classList.remove("is-map-panel-animating");
      }
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

function getTerritoryMapLoadingElement() {
  return document.getElementById("territoryMapLoading");
}

function getTerritoryMapResetElement() {
  return document.getElementById("territoryMapReset");
}

function getTerritoryMapBusyPills() {
  if (!territoryMapBusyPills) {
    territoryMapBusyPills = window.WefranchMapPills?.createBusyController?.(
      getTerritoryMapBusyElement()
    );
  }

  return territoryMapBusyPills;
}

function getTerritoryMapResetPills() {
  if (!territoryMapResetPills) {
    territoryMapResetPills = window.WefranchMapPills?.createResetController?.(
      getTerritoryMapResetElement(),
      { getMapContainer: getTerritoryMapContainerElement }
    );
  }

  return territoryMapResetPills;
}

function syncTerritoryMapResetPosition() {
  getTerritoryMapResetPills()?.syncPosition?.();
}

function bindTerritoryMapResetPositionSync() {
  getTerritoryMapResetPills()?.bindPositionSync?.();
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
  if (window.territoryFilters?.hasImplicitAreaSearch?.()) return false;

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

function isTerritoryMapResetVisible() {
  return Boolean(getTerritoryMapResetPills()?.isVisible?.());
}

function isTerritoryMapBusyVisible() {
  return Boolean(getTerritoryMapBusyPills()?.isVisible?.());
}

function showTerritoryMapReset({ crossfade = false } = {}) {
  getTerritoryMapResetPills()?.show?.({ crossfade });
}

function hideTerritoryMapReset({ immediate = false, crossfade = false } = {}) {
  getTerritoryMapResetPills()?.hide?.({ immediate, crossfade });
}

function isTerritoryMapInspectionOpen() {
  return Boolean(selectedTerritoryKey || compareTerritoryKey || territoryAreaCardGeoKey);
}

function isTerritoryMapSearchAreaMode() {
  return !isTerritoryMapInspectionOpen();
}

function getTerritoryMapViewportSpanMiles() {
  const bounds = getTerritoryMapViewportBounds();
  if (!bounds) return Infinity;

  const midLat = (bounds.south + bounds.north) / 2;
  const midLng = (bounds.west + bounds.east) / 2;

  return Math.max(
    getLngLatDistanceMiles([bounds.west, midLat], [bounds.east, midLat]),
    getLngLatDistanceMiles([midLng, bounds.south], [midLng, bounds.north])
  );
}

function isTerritoryMapSearchAreaTooLarge() {
  return getTerritoryMapViewportSpanMiles() > TERRITORY_MAP_SEARCH_MAX_SPAN_MILES;
}

function getTerritoryMapSearchableZoom(territoryMap) {
  const currentZoom = territoryMap?.getZoom?.();
  const currentSpan = getTerritoryMapViewportSpanMiles();
  if (!Number.isFinite(currentZoom) || !Number.isFinite(currentSpan) || currentSpan <= 0) {
    return null;
  }
  if (currentSpan <= TERRITORY_MAP_SEARCH_MAX_SPAN_MILES) {
    return currentZoom;
  }

  return currentZoom + Math.log2(currentSpan / TERRITORY_MAP_SEARCH_FIT_SPAN_MILES);
}

function zoomTerritoryMapToSearchableArea() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !isTerritoryMapSearchAreaTooLarge()) return;

  const center = territoryMap.getCenter();
  const zoom = getTerritoryMapSearchableZoom(territoryMap);
  if (!center || !Number.isFinite(zoom)) return;

  territoryMap.flyTo({
    center: [center.lng, center.lat],
    zoom,
    duration: TERRITORY_FOCUS_DURATION,
    curve: TERRITORY_FOCUS_FLY_CURVE,
    essential: true
  });
  territoryMap.once("moveend", () => {
    updateTerritoryMapResetVisibility();
  });
}

function syncTerritoryMapResetLabel() {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl) return;

  const isSearchArea = isTerritoryMapSearchAreaMode();
  const isTooLarge = isSearchArea && isTerritoryMapSearchAreaTooLarge();
  const label = isTooLarge
    ? TERRITORY_MAP_SEARCH_TOO_LARGE_LABEL
    : isSearchArea
      ? TERRITORY_MAP_SEARCH_AREA_LABEL
      : TERRITORY_MAP_RESET_LABEL;
  const labelEl = resetEl.querySelector(".map-pill-reset__label");

  resetEl.classList.toggle("is-search-area", isSearchArea && !isTooLarge);
  resetEl.classList.toggle("is-area-too-large", isTooLarge);
  if (labelEl) {
    labelEl.textContent = label;
  } else {
    resetEl.textContent = label;
  }
  resetEl.setAttribute("aria-label", label);
}

function shouldTerritoryMapResetShow() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || typeof territoryMap.isStyleLoaded !== "function") return false;

  return isTerritoryMapPanelOpen()
    && !isTerritoryCrossroadOpen()
    && !isTerritoryMapLoadingVisible()
    && territoryMap.isStyleLoaded()
    && !territorySearchAreaInFlight
    && (isTerritoryMapInspectionOpen() || !isTerritoryMapAtDefaultView(territoryMap));
}

function updateTerritoryMapResetVisibility() {
  syncTerritoryMapResetLabel();

  if (isTerritoryMapBusyVisible()) return;

  if (shouldTerritoryMapResetShow()) {
    showTerritoryMapReset({ crossfade: isTerritoryMapBusyVisible() });
    return;
  }

  // Leave Search this area up until Updating territories can crossfade in.
  if (territorySearchAreaInFlight && isTerritoryMapResetVisible() && !isTerritoryMapBusyVisible()) {
    return;
  }

  hideTerritoryMapReset({
    immediate: isTerritoryCrossroadOpen(),
    crossfade: isTerritoryMapBusyVisible()
  });
}

function flyTerritoryMapToQueryView(territoryMap) {
  const queryView = territoryFilterDefaultView;
  if (!queryView?.center || !Number.isFinite(queryView.zoom)) return false;

  territoryMap.flyTo({
    center: queryView.center,
    zoom: queryView.zoom,
    duration: TERRITORY_FOCUS_DURATION,
    curve: TERRITORY_FOCUS_FLY_CURVE,
    essential: true
  });
  territoryMap.once("moveend", () => {
    updateTerritoryMapResetVisibility();
  });
  return true;
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

  flyTerritoryMapToQueryView(territoryMap);
}

async function searchTerritoryMapThisArea() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || territorySearchAreaInFlight) return;
  if (isTerritoryMapSearchAreaTooLarge()) {
    updateTerritoryMapResetVisibility();
    return;
  }

  const anchor = resolveTerritorySearchAreaAnchor(territoryMap);
  if (!anchor) {
    updateTerritoryMapResetVisibility();
    return;
  }

  const { longitude: lng, latitude: lat, stateCode } = anchor;
  territorySearchAreaInFlight = true;

  try {
    const result = await window.territoryLocationSearch?.resolveFromCoordinates?.(lng, lat, stateCode)
      || window.territoryLocationSearch?.fromCoordinates?.(
        lng,
        lat,
        stateCode,
        stateCode
          ? `Map area, ${window.territoryLocationSearch?.getStateLabel?.(stateCode) || stateCode}`
          : null
      );

    if (!result?.stateCode) {
      updateTerritoryMapResetVisibility();
      return;
    }

    territorySkipNextFilterFit = true;
    window.territoryFilters?.applySearchThisArea?.(result);
    captureTerritoryFilterDefaultViewFromMap(territoryMap);
    updateTerritoryMapResetVisibility();
  } finally {
    territorySearchAreaInFlight = false;
  }
}

function handleTerritoryMapResetClick() {
  if (isTerritoryMapSearchAreaMode()) {
    if (isTerritoryMapSearchAreaTooLarge()) {
      zoomTerritoryMapToSearchableArea();
      return;
    }
    void searchTerritoryMapThisArea();
    return;
  }

  resetTerritoryMapView();
}

function bindTerritoryMapResetControl(territoryMap) {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl) return;

  bindTerritoryMapResetPositionSync();
  resetEl.addEventListener("click", handleTerritoryMapResetClick);
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

function getTerritoryMapBusyElement() {
  return document.getElementById("territoryMapBusy");
}

function setTerritoryMapBusy(isBusy, { crossfade = false } = {}) {
  const busyPills = getTerritoryMapBusyPills();
  if (!busyPills) return;

  if (isBusy) {
    const swap = crossfade || isTerritoryMapResetVisible();
    if (swap) hideTerritoryMapReset({ crossfade: true });
    busyPills.setBusy(true, { crossfade: swap });
    return;
  }

  busyPills.setBusy(false, { crossfade });
}

function showTerritoryListLoading() {
  const loadingEl = getTerritoryMapLoadingElement();
  if (loadingEl) {
    loadingEl.hidden = false;
    loadingEl.classList.remove("is-hiding");
    loadingEl.setAttribute("aria-busy", "true");
  }

  setTerritoryMapBusy(true);
  updateTerritoryMapResetVisibility();
}

// Held while a filter pass is running so the list and the map both read as
// loading, and so the reveal animations only start once results are committed.
function beginTerritoryResultsLoading() {
  territoryResultsLoadingActive = true;
  showTerritoryListLoading();
}

function endTerritoryResultsLoading() {
  if (!territoryResultsLoadingActive) return;
  territoryResultsLoadingActive = false;

  // The initial reveal waits for the map to go idle before uncovering the list.
  if (!territoryInitialRevealCompleted) return;

  territoryFilteredRevealArmed = false;
  startTerritoryMapFilteredReveal();
}

function prepareTerritoryMapForFilterReveal() {
  const loadingEl = getTerritoryMapLoadingElement();
  loadingEl?.classList.remove("is-map-revealed");
  showTerritoryListLoading();
}

function isTerritoryMapPlottingSettled(territoryMap) {
  if (!territoryMap) return true;
  if (territoryMap.isMoving?.()) return false;
  if (typeof territoryMap.loaded === "function") return territoryMap.loaded();
  return Boolean(territoryMap.areTilesLoaded?.());
}

// Waits for the map to finish plotting the committed results before hiding
// Updating territories, so the pill stays up until the shapes are on screen.
function startTerritoryMapFilteredReveal() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) {
    hideTerritoryMapLoading();
    return;
  }

  territoryFilteredRevealPending = true;
  const revealToken = ++territoryFilteredRevealToken;

  const finish = () => {
    if (revealToken !== territoryFilteredRevealToken) return;
    // Retires the pending "idle" listener along with the timers.
    territoryFilteredRevealToken += 1;
    territoryFilteredRevealPending = false;
    window.clearTimeout(territoryFilteredRevealSettleTimer);
    window.clearTimeout(territoryFilteredRevealTimer);
    revealTerritoryMapBase();
    hideTerritoryMapLoading();
  };

  territoryMap.once("idle", finish);

  // A pass that leaves the map untouched renders nothing and so never fires
  // "idle". Once the new filters have had a moment to register, an already
  // settled map counts as revealed.
  territoryFilteredRevealSettleTimer = window.setTimeout(() => {
    if (revealToken !== territoryFilteredRevealToken) return;
    if (!isTerritoryMapPlottingSettled(territoryMap)) return;
    finish();
  }, TERRITORY_FILTERED_REVEAL_SETTLE_MS);

  territoryFilteredRevealTimer = window.setTimeout(finish, TERRITORY_FILTERED_REVEAL_TIMEOUT_MS);
}

// Armed before a filter pass so the reveal plays against the committed results
// rather than whatever the map happened to be showing when it was requested.
function scheduleTerritoryMapFilteredReveal(territoryMap) {
  if (!territoryMap) return;

  prepareTerritoryMapForFilterReveal();
  territoryFilteredRevealArmed = true;

  // Nothing is loading, so there is no commit to wait for.
  if (!territoryResultsLoadingActive) {
    territoryFilteredRevealArmed = false;
    startTerritoryMapFilteredReveal();
  }
}

function hideTerritoryRecords() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  territoryPendingRevealCenter = null;
  territoryPendingRevealRecords = null;
  territoryPendingRevealFromMapCenter = false;
  territoryRevealWhenListEnters = null;
  if (territoryRevealActive) finishTerritoryReveal();
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

function isTerritoryMapCoveredByLoading() {
  const loadingEl = getTerritoryMapLoadingElement();
  return Boolean(
    loadingEl
    && !loadingEl.hidden
    && !loadingEl.classList.contains("is-map-revealed")
    && !loadingEl.classList.contains("is-hiding")
  );
}

function revealTerritoryMapBase() {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl) return;
  loadingEl.classList.add("is-map-revealed");
  const pendingReveal = territoryRevealAfterOverlay;
  territoryRevealAfterOverlay = null;
  pendingReveal?.();
}

function hideTerritoryMapLoading(onHidden) {
  const loadingEl = getTerritoryMapLoadingElement();

  if (loadingEl && !loadingEl.hidden) {
    loadingEl.classList.add("is-hiding");
    loadingEl.setAttribute("aria-busy", "false");
  }

  const resetWillShow = shouldTerritoryMapResetShow();
  const crossfade = isTerritoryMapBusyVisible() && resetWillShow;
  const holdBusyForReveal = isTerritoryMapBusyVisible() && (
    territoryRevealActive
    || Boolean(territoryRevealWhenListEnters)
    || Boolean(territoryPendingRevealCenter || territoryPendingRevealRecords)
  );
  if (holdBusyForReveal) {
    territoryBusyHeldForReveal = true;
  } else {
    setTerritoryMapBusy(false, { crossfade });
    if (crossfade) {
      showTerritoryMapReset({ crossfade: true });
    }
  }

  if (!loadingEl || loadingEl.hidden) {
    if (!crossfade) updateTerritoryMapResetVisibility();
    window.territoryBrandPanel?.notifyLoadingHidden?.();
    onHidden?.();
    return;
  }

  window.setTimeout(() => {
    loadingEl.hidden = true;
    loadingEl.classList.remove("is-hiding");
    updateTerritoryMapResetVisibility();
    window.territoryBrandPanel?.notifyLoadingHidden?.();
    onHidden?.();
  }, crossfade ? TERRITORY_MAP_PILL_CROSSFADE_MS : TERRITORY_MAP_LOADING_FADE_MS);
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
      title.className = "map-point-tooltip-title territory-map-tooltip-name";
      title.textContent = territoryName;
      tooltip.append(title);
    }

    if (statusSummary) {
      const statusLine = document.createElement("div");
      statusLine.className = "map-point-tooltip-detail territory-map-tooltip-status";
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
      territory.className = "map-point-tooltip-detail territory-map-tooltip-name";
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
      statusLine.className = "map-point-tooltip-detail territory-map-tooltip-status";
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
    window.fitTooltipToContent?.(tooltip);
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

function syncTerritoryInfoBackButton({ deferMs = 0 } = {}) {
  const backButton = document.getElementById("territoryInfoBack");
  if (!backButton) return;

  const shouldShow = Boolean(territoryDetailReturnGeoKey);
  backButton.hidden = !shouldShow;

  window.clearTimeout(syncTerritoryInfoBackButton.deferTimer);
  if (!shouldShow || deferMs <= 0) {
    backButton.toggleAttribute("inert", !shouldShow);
    return;
  }

  backButton.toggleAttribute("inert", true);
  syncTerritoryInfoBackButton.deferTimer = window.setTimeout(() => {
    backButton.toggleAttribute("inert", !territoryDetailReturnGeoKey);
  }, deferMs);
}

function clearTerritoryDetailReturn() {
  territoryDetailReturnGeoKey = null;
  syncTerritoryInfoBackButton();
}

function captureTerritoryInfoCardHeight(card) {
  if (!card || card.hidden || !card.classList.contains("is-visible")) return null;
  return card.getBoundingClientRect().height;
}

function beginTerritoryInfoCardResize(card) {
  const fromHeight = captureTerritoryInfoCardHeight(card);
  if (fromHeight != null) {
    card.style.height = `${fromHeight}px`;
  }
  return fromHeight;
}

function clearTerritoryInfoCardHeight(card) {
  territoryInfoCardResizeCleanup?.();
  territoryInfoCardResizeCleanup = null;
  if (!card) return;
  card.classList.remove("is-resizing");
  card.style.height = "";
}

function getTerritoryMapViewportHeight() {
  return document.querySelector(".territory-map-frame")?.clientHeight
    || document.getElementById("territoryMap")?.clientHeight
    || window.innerHeight;
}

function getTerritoryInfoCardFallbackHeight() {
  return Math.round(getTerritoryMapViewportHeight() * TERRITORY_INFO_CARD_MAX_VIEWPORT_RATIO);
}

function getTerritoryInfoCardMaxHeight(card) {
  const maxHeight = parseFloat(getComputedStyle(card).maxHeight);
  const viewportMax = getTerritoryInfoCardFallbackHeight();
  if (Number.isFinite(maxHeight) && maxHeight > 0) {
    return Math.min(maxHeight, viewportMax);
  }
  return viewportMax;
}

function getVisibleTerritoryInfoPane(card) {
  if (!card || card.id === "territoryInfoCardCompare") return card;
  return card.classList.contains("is-detail")
    ? getTerritoryInfoDetailPane()
    : getTerritoryAreaCardElement();
}

function measureTerritoryInfoPaneHeight(pane) {
  let height = 0;
  for (const child of pane.children) {
    const styles = getComputedStyle(child);
    const blockHeight = child.classList.contains("territory-info-card__scroll")
      ? child.scrollHeight
      : child.offsetHeight;
    height += blockHeight
      + (parseFloat(styles.marginTop) || 0)
      + (parseFloat(styles.marginBottom) || 0);
  }
  return height;
}

function measureTerritoryInfoCardHeight(card) {
  const maxHeight = getTerritoryInfoCardMaxHeight(card);
  const pane = getVisibleTerritoryInfoPane(card);
  const measureTarget = pane || card;
  const isNestedPane = measureTarget !== card;
  const previousCardHeight = card.style.height;
  const previousPaneHeight = isNestedPane ? measureTarget.style.height : "";
  const previousPaneMinHeight = isNestedPane ? measureTarget.style.minHeight : "";
  const previousPaneOverflow = isNestedPane ? measureTarget.style.overflow : "";
  const previousPaneVisibility = isNestedPane ? measureTarget.style.visibility : "";

  card.style.height = "auto";
  if (isNestedPane) {
    measureTarget.style.height = "auto";
    measureTarget.style.minHeight = "auto";
    measureTarget.style.overflow = "visible";
    measureTarget.style.visibility = "visible";
  }

  const styles = getComputedStyle(card);
  const borders = (parseFloat(styles.borderTopWidth) || 0)
    + (parseFloat(styles.borderBottomWidth) || 0);
  const contentHeight = measureTerritoryInfoPaneHeight(measureTarget);

  card.style.height = previousCardHeight;
  if (isNestedPane) {
    measureTarget.style.height = previousPaneHeight;
    measureTarget.style.minHeight = previousPaneMinHeight;
    measureTarget.style.overflow = previousPaneOverflow;
    measureTarget.style.visibility = previousPaneVisibility;
  }

  return Math.min(Math.ceil(contentHeight + borders), maxHeight);
}

function syncTerritoryInfoCardHeight(card, { fromHeight = null, animate = false } = {}) {
  territoryInfoCardResizeCleanup?.();
  territoryInfoCardResizeCleanup = null;

  if (!card || card.hidden) return;

  const toHeight = measureTerritoryInfoCardHeight(card);
  if (toHeight <= 0) return;

  const shouldAnimate = Boolean(
    animate
    && fromHeight != null
    && !prefersTerritoryReducedMotion()
    && Math.abs(toHeight - fromHeight) >= 0.5
  );

  card.classList.remove("is-resizing");

  if (!shouldAnimate) {
    card.style.height = `${toHeight}px`;
    return;
  }

  card.style.height = `${fromHeight}px`;
  void card.offsetHeight;
  card.classList.add("is-resizing");
  card.style.height = `${toHeight}px`;

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    card.removeEventListener("transitionend", onEnd);
    window.clearTimeout(timeoutId);
    if (territoryInfoCardResizeCleanup === cleanup) {
      territoryInfoCardResizeCleanup = null;
    }
    card.classList.remove("is-resizing");
    card.style.height = `${toHeight}px`;
  };
  const onEnd = (event) => {
    if (event.target === card && event.propertyName === "height") settle();
  };
  const cleanup = () => {
    settled = true;
    card.removeEventListener("transitionend", onEnd);
    window.clearTimeout(timeoutId);
  };
  const timeoutId = window.setTimeout(settle, TERRITORY_INFO_CARD_SLIDE_MS + 40);
  card.addEventListener("transitionend", onEnd);
  territoryInfoCardResizeCleanup = cleanup;
}

function setTerritoryCardPane(pane, { animate = false } = {}) {
  const card = getTerritoryInfoCardElement();
  const areaPane = getTerritoryAreaCardElement();
  const detailPane = getTerritoryInfoDetailPane();
  const track = getTerritoryInfoTrackElement();
  if (!card) return;

  const showDetail = pane === "detail";
  const paneChanges = card.classList.contains("is-detail") !== showDetail;
  const fromHeight = paneChanges ? beginTerritoryInfoCardResize(card) : null;
  const reduceMotion = prefersTerritoryReducedMotion();
  const shouldAnimate = Boolean(animate && !reduceMotion && track);
  const isCardVisible = !card.hidden;

  if (!shouldAnimate) {
    card.classList.add("is-jumping");
  } else {
    card.classList.remove("is-jumping");
  }

  card.classList.toggle("is-detail", showDetail);
  syncTerritoryAreaMapHighlight();
  if (!showDetail) {
    fitTerritoryAreaTitle();
  }
  if (!shouldAnimate) {
    // Reading offsetWidth flushes the pending style change so the pane swap does
    // not animate, but it forces a full document reflow. A hidden card has no
    // transition to suppress, so the reflow is pure cost.
    if (isCardVisible) void card.offsetWidth;
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

  if (card.classList.contains("is-visible")) {
    syncTerritoryInfoCardHeight(card, {
      fromHeight,
      animate: paneChanges && fromHeight != null
    });
  }

  const finish = () => {
    // Measuring an off-screen card only reads stale zeroes; showTerritoryAreaCard
    // and showTerritoryInfoCards re-measure once the card becomes visible.
    if (card.hidden) return;

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

  if (stack.hidden && primaryCard.hidden && !stack.classList.contains("is-visible")) {
    territoryAreaCardGeoKey = null;
    syncTerritoryAreaMapHighlight();
    clearTerritoryDetailReturn();
    return;
  }

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
  updateTerritoryMapResetVisibility();

  const finishHide = () => {
    stack.hidden = true;
    primaryCard.hidden = true;
    if (compareCard) compareCard.hidden = true;
    clearTerritoryInfoCardHeight(primaryCard);
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
  document.getElementById(getTerritoryInfoFieldId("territoryInfoStatus", { compare })).textContent =
    formatTerritoryStatus(record.status);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoGeoLevel", { compare })).textContent =
    formatTerritoryGeoTypeLabel(record.geoType);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoInvestment", { compare })).textContent =
    formatTerritoryInfoValue(brand?.initialInvestment, territoryCurrencyFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoPopulation", { compare })).textContent =
    formatTerritoryInfoValue(macrodata?.population, territoryCompactNumberFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoMedianIncome", { compare })).textContent =
    formatTerritoryInfoValue(macrodata?.medianHouseholdIncome, territoryCurrencyFormatter);
  document.getElementById(getTerritoryInfoFieldId("territoryInfoMarketGrowth", { compare })).textContent =
    formatTerritoryMarketGrowth(macrodata?.marketGrowthPercent);

  const requestButton = document.getElementById(getTerritoryInfoFieldId("territoryInfoRequest", { compare }));
  if (requestButton) {
    requestButton.dataset.brandId = record.brandId || "";
    requestButton.dataset.geoKey = record.geoKey || record.state || "";
  }

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
  const animateToDetail = !cameFromArea
    && shellVisible
    && !primaryCard.classList.contains("is-detail");

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
  syncTerritoryInfoBackButton({
    deferMs: cameFromArea ? TERRITORY_INFO_CARD_SLIDE_MS + 40 : 0
  });
  stack.hidden = false;
  updateTerritoryMapResetVisibility();
  window.requestAnimationFrame(() => {
    stack.classList.add("is-visible");
    primaryCard.classList.add("is-visible");
    if (!shellVisible) {
      syncTerritoryInfoCardHeight(primaryCard);
    }
    syncTerritoryInfoCardScrollOverflow(detailPane || primaryCard);
    if (isCompare && compareCard) {
      compareCard.classList.add("is-visible");
      syncTerritoryInfoCardHeight(compareCard);
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
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
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
      heading.textContent = `${TERRITORY_GEO_TYPE_LABELS[geoType] || geoType} (${groupRecords.length})`;
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
  if (!stack || !primaryCard || !areaCard) return false;

  const wasVisible = primaryCard.classList.contains("is-visible");
  const switchingPane = primaryCard.classList.contains("is-detail");
  const fromHeight = switchingPane ? null : beginTerritoryInfoCardResize(primaryCard);
  if (!populateTerritoryAreaCard(geoKey, properties)) {
    if (fromHeight != null) primaryCard.style.height = "";
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
  if (!switchingPane) {
    syncTerritoryInfoCardHeight(primaryCard, {
      fromHeight,
      animate: wasVisible
    });
  }
  updateTerritoryMapResetVisibility();
  window.requestAnimationFrame(() => {
    stack.classList.add("is-visible");
    primaryCard.classList.add("is-visible");
    fitTerritoryAreaTitle();
    if (!wasVisible) {
      syncTerritoryInfoCardHeight(primaryCard);
    }
    syncTerritoryInfoCardScrollOverflow(areaCard);
  });
  return true;
}

function returnToTerritoryAreaCard() {
  const geoKey = territoryDetailReturnGeoKey;
  if (!geoKey) return;

  selectedTerritoryKey = null;
  compareTerritoryKey = null;
  territoryInfoDismissedKey = null;

  if (!populateTerritoryAreaCard(geoKey)) {
    clearTerritoryDetailReturn();
    hideTerritoryInfoCard();
    return;
  }

  territoryAreaCardGeoKey = geoKey;
  setTerritoryCardPane("area", { animate: true });
  clearTerritoryDetailReturn();
  syncSelectedTerritoryMap({ refreshMapView: false, skipInfoCard: true });
  updateTerritoryMapResetVisibility();

  window.requestAnimationFrame(() => {
    focusTerritoryMapOnState(window.territoryMap, geoKey, { reserveInfoCard: true });
  });
}

function hideTerritoryAreaCard({ immediate = false } = {}) {
  const stack = getTerritoryInfoStackElement();
  const primaryCard = getTerritoryInfoCardElement();
  if (!stack || !primaryCard || !territoryAreaCardGeoKey) {
    territoryAreaCardGeoKey = null;
    syncTerritoryAreaMapHighlight();
    return;
  }

  if (primaryCard.classList.contains("is-detail") || primaryCard.hidden) {
    territoryAreaCardGeoKey = null;
    syncTerritoryAreaMapHighlight();
    return;
  }

  territoryAreaCardGeoKey = null;
  syncTerritoryAreaMapHighlight();
  primaryCard.classList.remove("is-visible");
  stack.classList.remove("is-visible");
  updateTerritoryMapResetVisibility();

  const finishHide = () => {
    primaryCard.hidden = true;
    stack.hidden = true;
    setTerritoryCardPane("area", { animate: false });
    clearTerritoryInfoCardHeight(primaryCard);
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
      if (primaryBack.hasAttribute("inert")) return;
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
      const primaryCard = getTerritoryInfoCardElement();
      const compareCard = getTerritoryInfoCardElement({ compare: true });
      fitTerritoryAreaTitle();
      if (primaryCard && !primaryCard.hidden && primaryCard.classList.contains("is-visible")) {
        syncTerritoryInfoCardHeight(primaryCard);
      }
      if (compareCard && !compareCard.hidden && compareCard.classList.contains("is-visible")) {
        syncTerritoryInfoCardHeight(compareCard);
      }
      syncTerritoryInfoCardScrollOverflow(getTerritoryInfoDetailPane() || primaryCard);
      syncTerritoryInfoCardScrollOverflow(compareCard);
      syncTerritoryInfoCardScrollOverflow(getTerritoryAreaCardElement());
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

// Only hover uses this, so pairing every visible territory against every other
// one up front burned seconds on wide searches. The candidate set is captured
// here and each geoKey is resolved the first time it is actually hovered.
function setTerritoryIntersectionScope(matchingRecords) {
  const territoriesByGeoKey = new Map();

  matchingRecords.forEach((record) => {
    const geoKey = record.geoKey || record.state;
    if (!geoKey || !record.geometry || territoriesByGeoKey.has(geoKey)) return;
    territoriesByGeoKey.set(geoKey, record);
  });

  territoryIntersectionScope = territoriesByGeoKey;
  territoryIntersectionIndex = new Map();
}

function getTerritoryIntersectionsForGeoKey(geoKey) {
  const cached = territoryIntersectionIndex.get(geoKey);
  if (cached) return cached;

  const territory = territoryIntersectionScope.get(geoKey);
  if (!territory) return [];

  const rank = getTerritoryGeoTypeRank(territory.geoType);
  const largerIntersections = [];

  territoryIntersectionScope.forEach((candidate, candidateGeoKey) => {
    if (candidateGeoKey === geoKey) return;
    if (getTerritoryGeoTypeRank(candidate.geoType) >= rank) return;
    if (!territoryBoundsIntersect(territory.geometryBounds, candidate.geometryBounds)) return;
    if (!doTerritoryGeometriesIntersect(territory, candidate)) return;

    largerIntersections.push(candidateGeoKey);
  });

  territoryIntersectionIndex.set(geoKey, largerIntersections);
  return largerIntersections;
}

function getTerritoryRecordsForHover(geoKey) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  const includedGeoKeys = new Set([
    geoKey,
    ...getTerritoryIntersectionsForGeoKey(geoKey)
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
    // The registry precomputes bounds; only state fallbacks need measuring.
    const geometryBounds = record.geometryBounds
      || getGeometryBounds(territoryStatesByCode.get(record.state)?.geometry);
    if (!geometryBounds) return;

    hasBounds = true;
    if (geometryBounds.west < west) west = geometryBounds.west;
    if (geometryBounds.east > east) east = geometryBounds.east;
    if (geometryBounds.south < south) south = geometryBounds.south;
    if (geometryBounds.north > north) north = geometryBounds.north;
  });

  buildTerritoryRadiusCircleCollection().features.forEach((feature) => {
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

  buildTerritoryRadiusCircleCollection().features.forEach((feature) => {
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

function mergeFocusBounds(target, bounds) {
  if (!bounds) return target;

  if (!target) {
    return {
      west: bounds.west,
      east: bounds.east,
      south: bounds.south,
      north: bounds.north
    };
  }

  if (bounds.west < target.west) target.west = bounds.west;
  if (bounds.east > target.east) target.east = bounds.east;
  if (bounds.south < target.south) target.south = bounds.south;
  if (bounds.north > target.north) target.north = bounds.north;
  return target;
}

function getLocationSearchFocusBounds() {
  const searches = (window.territoryFilters?.getState?.()?.locationSearches || [])
    .filter((location) => !location.excluded);
  if (!searches.length) return null;

  let bounds = null;
  searches.forEach((location) => {
    const target = resolveLocationMatchTarget(location);
    if (!target) return;

    if (target.kind === "point") {
      bounds = mergeFocusBounds(
        bounds,
        getTerritoryMapSearchBounds(
          target.longitude,
          target.latitude,
          TERRITORY_LOCATION_POINT_FOCUS_MILES
        )
      );
      return;
    }

    if (target.kind === "geometry") {
      bounds = mergeFocusBounds(bounds, target.bounds);
      return;
    }

    if (target.kind === "state") {
      const stateFeature = territoryStatesByCode.get(target.stateCode);
      bounds = mergeFocusBounds(bounds, getGeometryBounds(stateFeature?.geometry));
    }
  });

  return bounds;
}

function getTerritoryFilterFocusBounds(matchingRecords) {
  // City / radius searches should frame the search circles, not giant CBSA
  // polygons that would keep the camera at a continent overview.
  const radiusBounds = getTerritoryRadiusBounds();
  if (radiusBounds) return radiusBounds;

  const locationBounds = getLocationSearchFocusBounds();
  if (locationBounds) return locationBounds;

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
    playPendingTerritoryReveal();
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

    if (territorySkipNextFilterFit) {
      territorySkipNextFilterFit = false;
      if (!territoryMap.isMoving?.()) {
        captureTerritoryFilterDefaultViewFromMap(territoryMap);
      }
      updateTerritoryMapResetVisibility();
      return;
    }

    if (window.territoryFilters?.hasImplicitAreaSearch?.()) {
      const implicitBounds = window.territoryFilters.getImplicitViewportBounds?.();
      const locationBounds = implicitBounds || getLocationSearchFocusBounds();
      if (!territoryViewportFramed && locationBounds && window.mapboxgl) {
        territoryViewportFramed = true;
        focusTerritoryMapOnBounds(
          territoryMap,
          new mapboxgl.LngLatBounds(
            [locationBounds.west, locationBounds.south],
            [locationBounds.east, locationBounds.north]
          )
        );
        territoryMap.once("moveend", () => {
          captureTerritoryFilterDefaultViewFromMap(territoryMap);
          if (!implicitBounds) {
            window.territoryFilters?.captureViewportFromMap?.();
          }
          playPendingTerritoryReveal();
          updateTerritoryMapResetVisibility();
        });
        return;
      }

      if (!territoryMap.isMoving?.()) {
        captureTerritoryFilterDefaultViewFromMap(territoryMap);
      }
      updateTerritoryMapResetVisibility();
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
    ? getTerritoryInfoCardFallbackHeight() + 24
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

// Pastel paints each brand on its own source, and shared territories sit under
// an invisible hit layer. Hover every occupant so the whole shape lifts like
// the single density fill / stroke.
function setPastelTerritoryHover(territoryMap, geoKey, featureId) {
  if (!territoryMap || !geoKey) return [];

  const hoverId = featureId ?? geoKey;
  const occupantIds = getShapeOccupants(getVisibleOccupantsForState(geoKey));
  const featureStates = [];

  occupantIds.forEach((brandId) => {
    const source = `territories-${brandId}`;
    if (!territoryMap.getSource(source)) return;

    const featureState = { source, id: hoverId };
    territoryMap.setFeatureState(featureState, { hover: true });
    featureStates.push(featureState);
  });

  return featureStates;
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

  if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId) && territoryBordersEnabled) {
    territoryMap.setLayoutProperty(geoLayers.lineLayerId, "visibility", "visible");
  }

  territoryMap.setFeatureState(featureState, { hover: true });

  return { featureState, layerFilters };
}

function clearBrandTerritoryHoverHighlight(territoryMap, highlight) {
  if (!territoryMap || !highlight) return;

  territoryMap.setFeatureState(highlight.featureState, { hover: false });
  highlight.layerFilters.forEach(({ layerId, originalFilter }) => {
    if (territoryMap.getLayer(layerId)) {
      territoryMap.setFilter(layerId, originalFilter);
    }
  });
}

function bindTerritoryHoverInteractions(territoryMap, interactiveLayerIds, clickLayerIds = interactiveLayerIds) {
  if (!interactiveLayerIds.length && !clickLayerIds.length) return;

  territoryBaseHoverLayerIds = interactiveLayerIds.slice();

  const tooltip = createTerritoryTooltipController(territoryMap);
  let hoveredFeatureKey = null;
  let hoveredFeatureStates = [];
  let hoveredBrandHighlight = null;

  const clearHoveredFeatureState = () => {
    if (hoveredBrandHighlight) {
      clearBrandTerritoryHoverHighlight(territoryMap, hoveredBrandHighlight);
      hoveredBrandHighlight = null;
    }

    hoveredFeatureStates.forEach((featureState) => {
      territoryMap.setFeatureState(featureState, { hover: false });
    });
    hoveredFeatureStates = [];

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

    if (stateCode && territoryPastelColorsEnabled) {
      const featureId = feature.id ?? stateCode;
      const nextKey = `pastel-${stateCode}-${featureId}`;
      if (hoveredFeatureKey === nextKey) return;

      clearHoveredFeatureState();
      hoveredFeatureStates = setPastelTerritoryHover(territoryMap, stateCode, featureId);
      if (hoveredFeatureStates.length) {
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
    hoveredFeatureStates = [nextState];
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
    if (territoryRevealActive) {
      clearHover();
      return;
    }

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

  // Mapbox "mouseleave" without a layer id never fires when the pointer leaves
  // the canvas. State polygons fill the view, so mousemove also never sees an
  // empty hit — hide on the real canvas-leave events instead.
  territoryMap.on("mouseout", clearHover);
  territoryMap.getCanvas().addEventListener("pointerleave", clearHover);

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

    const areaRecords = getTerritoryRecordsForHover(geoKey);
    if (areaRecords.length === 1) {
      const [record] = areaRecords;
      window.territoryMapSelection?.select?.(record.brandId, record.geoKey || record.state);
      return;
    }

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

function buildTerritoryRadiusCircleCollection() {
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

function isTerritoryRadiusOverlayVisible() {
  return Boolean(
    territoryRadiusFilter.enabled
    && territoryRadiusFilter.overlay
    && !selectedTerritoryKey
    && !compareTerritoryKey
  );
}

function getTerritoryRadiusFeatureCollection() {
  if (!isTerritoryRadiusOverlayVisible()) {
    return { type: "FeatureCollection", features: [] };
  }

  return buildTerritoryRadiusCircleCollection();
}

function syncTerritoryRadiusOverlay() {
  const territoryMap = window.territoryMap;
  const visibility = isTerritoryRadiusOverlayVisible() ? "visible" : "none";

  territoryMap?.getSource(TERRITORY_RADIUS_SOURCE_ID)
    ?.setData(getTerritoryRadiusFeatureCollection());

  [TERRITORY_RADIUS_FILL_LAYER_ID, TERRITORY_RADIUS_OUTLINE_LAYER_ID].forEach((layerId) => {
    if (territoryMap?.getLayer(layerId)) {
      territoryMap.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
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

function setTerritoryRadiusFilter({
  enabled = false,
  overlay = false,
  miles = 300,
  centers = []
} = {}) {
  const numericMiles = Number(miles);
  territoryRadiusFilter = {
    enabled: Boolean(enabled),
    overlay: Boolean(overlay),
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

  syncTerritoryRadiusOverlay();
  syncTerritoryRadiusOutsideFade(window.territoryMap);
}

function isTerritoryRadiusFadeActive() {
  return Boolean(
    !selectedTerritoryKey
    && !compareTerritoryKey
    && territoryRadiusFilter.enabled
    && territoryRadiusFilter.overlay
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

  // setData clears feature-state, including pastel occupancy buckets.
  territoryPastelOccupancyState.clear();
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

  syncPastelFillOccupancyStates(territoryMap, territoryOccupantsByGeoKey);
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

function clampColorChannel(value) {
  return Math.min(1, Math.max(0, value));
}

function hexToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = ((blue - red) / delta) + 2;
    else hue = ((red - green) / delta) + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { h: hue, s: saturation, l: lightness };
}

function hslToHex({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - (chroma / 2);
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = secondary;
  } else if (hue < 120) {
    red = secondary;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = secondary;
  } else if (hue < 240) {
    green = secondary;
    blue = chroma;
  } else if (hue < 300) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const toHex = (channel) => Math.round((channel + match) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

// Pastel fills are light by design. Borders keep the same hue with a
// modest saturation/lightness nudge so they read without going neon.
function getPastelLineColor(color) {
  const hsl = hexToHsl(parseHexColor(color));
  return hslToHex({
    h: hsl.h,
    s: clampColorChannel(Math.min(0.78, hsl.s * 1.04)),
    l: clampColorChannel(Math.max(0.54, Math.min(0.66, hsl.l * 0.86)))
  });
}

function hueDistance(left, right) {
  const delta = Math.abs(left - right) % 360;
  return Math.min(delta, 360 - delta);
}

function rgbDistance(left, right) {
  const red = left.r - right.r;
  const green = left.g - right.g;
  const blue = left.b - right.b;
  return (red * red) + (green * green) + (blue * blue);
}

function getNearestPastelColor(color) {
  const source = parseHexColor(color);
  const sourceHsl = hexToHsl(source);

  // Near-gray and near-black hues are unstable, so fall back to RGB distance.
  const useHue = sourceHsl.s >= 0.12 && sourceHsl.l >= 0.08;
  let bestColor = TERRITORY_PASTEL_COLORS[0];
  let bestDistance = Infinity;

  TERRITORY_PASTEL_COLORS.forEach((pastel) => {
    const pastelRgb = parseHexColor(pastel);
    const distance = useHue
      ? hueDistance(sourceHsl.h, hexToHsl(pastelRgb).h)
      : rgbDistance(source, pastelRgb);
    if (distance < bestDistance) {
      bestColor = pastel;
      bestDistance = distance;
    }
  });

  return bestColor;
}

function assignTerritoryPastelColors(brands) {
  (brands || []).forEach((brand) => {
    if (!brand?.id) return;
    territoryPastelColorByBrandId.set(brand.id, getNearestPastelColor(brand.color));
  });
}

function getTerritoryBrandPaintColor(brand) {
  if (!brand) return null;
  if (territoryPastelColorsEnabled) {
    if (!territoryPastelColorByBrandId.has(brand.id)) {
      assignTerritoryPastelColors([brand]);
    }
    return territoryPastelColorByBrandId.get(brand.id) || brand.color;
  }
  return brand.color;
}

function getBrandFillColorExpression(brand) {
  const activeColor = territoryPastelColorsEnabled
    ? getTerritoryBrandPaintColor(brand)
    : ["get", "color"];
  return withTerritoryAreaFocusColor(activeColor, TERRITORY_AREA_CONTEXT_FILL_COLOR);
}

function getTerritoryBrandLineColor(brand) {
  if (territoryBorderColorMode === "white") return TERRITORY_WHITE_BORDER_COLOR;
  const paintColor = getTerritoryBrandPaintColor(brand);
  if (!paintColor) return null;
  return territoryPastelColorsEnabled ? getPastelLineColor(paintColor) : paintColor;
}

function getBrandLineColorExpression(brand) {
  let activeColor = ["get", "color"];
  if (territoryBorderColorMode === "white") {
    activeColor = TERRITORY_WHITE_BORDER_COLOR;
  } else if (territoryPastelColorsEnabled) {
    activeColor = getTerritoryBrandLineColor(brand);
  }
  return withTerritoryAreaFocusColor(activeColor, TERRITORY_AREA_CONTEXT_LINE_COLOR);
}

function getTerritoryAreaFocusMatchExpression() {
  const geoKey = getTerritoryAreaMapHighlightGeoKey();
  if (!geoKey) return null;

  return [
    "==",
    ["coalesce", ["get", "sourceGeoKey"], ["get", "geoKey"]],
    geoKey
  ];
}

function withTerritoryAreaFocusColor(activeColor, contextColor) {
  const match = getTerritoryAreaFocusMatchExpression();
  if (!match) return activeColor;

  return [
    "case",
    match,
    activeColor,
    contextColor
  ];
}

function withTerritoryAreaFocusOpacity(activeOpacity, contextOpacity) {
  const match = getTerritoryAreaFocusMatchExpression();
  if (!match) return activeOpacity;

  return [
    "case",
    match,
    activeOpacity,
    contextOpacity
  ];
}

function getTerritoryFillOpacityExpression() {
  const base = territoryPastelColorsEnabled
    ? TERRITORY_PASTEL_FILL_OPACITY_EXPRESSION
    : TERRITORY_FILL_OPACITY_EXPRESSION;
  return withTerritoryAreaFocusOpacity(base, TERRITORY_BRAND_AREA_CONTEXT_FILL_OPACITY);
}

function getTerritoryHatchOpacityExpression() {
  return withTerritoryAreaFocusOpacity(
    TERRITORY_HATCH_FILL_OPACITY_EXPRESSION,
    TERRITORY_BRAND_AREA_CONTEXT_FILL_OPACITY
  );
}

function getTerritoryLineOpacityExpression() {
  let base = TERRITORY_LINE_OPACITY_EXPRESSION;
  if (territoryBorderColorMode === "white") {
    base = TERRITORY_WHITE_LINE_OPACITY_EXPRESSION;
  } else if (territoryPastelColorsEnabled) {
    base = TERRITORY_PASTEL_LINE_OPACITY_EXPRESSION;
  }
  return withTerritoryAreaFocusOpacity(base, TERRITORY_BRAND_AREA_CONTEXT_LINE_OPACITY);
}

function getTerritoryColorMode() {
  if (territoryPastelColorsEnabled) return "pastel";
  if (territoryDensityEnabled) return "density";
  return "accent";
}

function getTerritoryFocusLineColor() {
  return territoryBorderColorMode === "white"
    ? TERRITORY_WHITE_BORDER_COLOR
    : TERRITORY_DENSITY_HIGH_COLOR;
}

function getBrandHatchPatternExpression(brand) {
  return withTerritoryAreaFocusColor(
    `territory-hatch-${brand.id}`,
    TERRITORY_CONTEXT_HATCH_IMAGE_ID
  );
}

function ensureTerritoryContextHatchImage(territoryMap) {
  if (!territoryMap || territoryMap.hasImage(TERRITORY_CONTEXT_HATCH_IMAGE_ID)) return;

  territoryMap.addImage(
    TERRITORY_CONTEXT_HATCH_IMAGE_ID,
    createDiagonalHatchImage(TERRITORY_AREA_CONTEXT_LINE_COLOR),
    { pixelRatio: TERRITORY_HATCH_PIXEL_RATIO }
  );
}

function ensureBrandHatchImage(territoryMap, brand) {
  const imageId = `territory-hatch-${brand.id}`;
  const hatchColor = getTerritoryBrandPaintColor(brand) || brand.color;
  const hatchImage = createDiagonalHatchImage(hatchColor);

  ensureTerritoryContextHatchImage(territoryMap);

  if (territoryMap.hasImage(imageId)) {
    territoryMap.updateImage(imageId, hatchImage);
    return imageId;
  }

  territoryMap.addImage(
    imageId,
    hatchImage,
    { pixelRatio: TERRITORY_HATCH_PIXEL_RATIO }
  );

  return imageId;
}

function syncTerritoryBrandPaintColors() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  if (territoryPastelColorsEnabled) {
    assignTerritoryPastelColors(territoryBrands);
  }

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    const fillColor = getBrandFillColorExpression(brand);
    const lineColor = getBrandLineColorExpression(brand);
    const hatchPattern = getBrandHatchPatternExpression(brand);
    const colorTransition = { duration: 0, delay: 0 };
    layerIds.geoLayers.forEach((geoLayers) => {
      if (geoLayers.fillLayerId && territoryMap.getLayer(geoLayers.fillLayerId)) {
        territoryMap.setPaintProperty(geoLayers.fillLayerId, "fill-color-transition", colorTransition);
        territoryMap.setPaintProperty(geoLayers.fillLayerId, "fill-color", fillColor);
      }
      if (geoLayers.hatchLayerId && territoryMap.getLayer(geoLayers.hatchLayerId)) {
        territoryMap.setPaintProperty(geoLayers.hatchLayerId, "fill-pattern", hatchPattern);
      }
      if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId)) {
        territoryMap.setPaintProperty(geoLayers.lineLayerId, "line-color-transition", colorTransition);
        territoryMap.setPaintProperty(geoLayers.lineLayerId, "line-opacity-transition", colorTransition);
        territoryMap.setPaintProperty(geoLayers.lineLayerId, "line-color", lineColor);
        territoryMap.setPaintProperty(
          geoLayers.lineLayerId,
          "line-opacity",
          withTerritoryLayerOpacity(getTerritoryLineOpacityExpression())
        );
      }
    });
    ensureBrandHatchImage(territoryMap, brand);
  });
}

// Shared territories stack occupant fills and borders in occupancy order.
// Only the first N brands are painted so overlapping shapes stay readable.
function getShapeOccupants(visibleOccupants) {
  if (!visibleOccupants?.length) return [];
  return visibleOccupants.slice(0, TERRITORY_SHAPE_MAX_VISIBLE);
}

function getPastelFillOccupancyBucket(occupantCount) {
  if (occupantCount >= TERRITORY_PASTEL_FILL_OCCUPANCY_HIGH_MIN) return 3;
  if (occupantCount >= TERRITORY_PASTEL_FILL_OCCUPANCY_MID_MIN) return 2;
  return 1;
}

// Splash card overlays use these with an explicit theme so they match the map
// without depending on the live map flags being initialized yet.
function getTerritoryPreviewBrandFillColor(brand, colorMode) {
  if (!brand?.color) return null;
  return colorMode === "pastel" ? getNearestPastelColor(brand.color) : brand.color;
}

function getTerritoryPreviewBrandLineColor(brand, colorMode, borderColor) {
  if (borderColor === "white") return TERRITORY_WHITE_BORDER_COLOR;
  const fillColor = getTerritoryPreviewBrandFillColor(brand, colorMode);
  if (!fillColor) return colorMode === "density" ? TERRITORY_DENSITY_HIGH_COLOR : null;
  return colorMode === "pastel" ? getPastelLineColor(fillColor) : fillColor;
}

function getTerritoryPreviewFillOpacity(colorMode, occupantCount) {
  if (colorMode === "pastel") {
    const bucket = getPastelFillOccupancyBucket(occupantCount);
    if (bucket >= 3) return TERRITORY_PASTEL_FILL_OPACITY_HIGH;
    if (bucket >= 2) return TERRITORY_PASTEL_FILL_OPACITY_MID;
    return TERRITORY_FILL_OPACITY;
  }
  if (colorMode === "accent") return TERRITORY_FILL_OPACITY;
  return null;
}

function getTerritoryPreviewLineOpacity(colorMode, borderColor) {
  if (borderColor === "white") return TERRITORY_WHITE_LINE_OPACITY;
  if (colorMode === "pastel") return TERRITORY_PASTEL_LINE_OPACITY;
  if (colorMode === "accent") return TERRITORY_LINE_OPACITY;
  return null;
}

function syncPastelFillOccupancyStates(territoryMap, occupantsByGeoKey) {
  if (!territoryMap || !territoryPastelColorsEnabled || !occupantsByGeoKey?.size) return;

  occupantsByGeoKey.forEach((occupants, geoKey) => {
    const bucket = getPastelFillOccupancyBucket(occupants.length);
    getShapeOccupants(occupants).forEach((brandId) => {
      const sourceId = `territories-${brandId}`;
      if (!territoryMap.getSource(sourceId)) return;

      const stateKey = `${sourceId}:${geoKey}`;
      if (territoryPastelOccupancyState.get(stateKey) === bucket) return;

      try {
        territoryMap.setFeatureState({ source: sourceId, id: geoKey }, { occupancyBucket: bucket });
        territoryPastelOccupancyState.set(stateKey, bucket);
      } catch (error) {
        // The feature may not exist on this source.
      }
    });
  });
}

function getLogoOccupants(visibleOccupants) {
  if (!visibleOccupants?.length) return [];
  return visibleOccupants.slice(0, TERRITORY_LOGO_MAX_VISIBLE);
}

function appendGeoKeyForBrand(geoKeysByBrand, brandId, geoKey) {
  const geoKeys = geoKeysByBrand.get(brandId);
  if (geoKeys) {
    geoKeys.push(geoKey);
    return;
  }
  geoKeysByBrand.set(brandId, [geoKey]);
}

// Everything the render pass needs about which territories are visible, derived
// in a single walk of the matching records. Doing it per brand meant rescanning
// the whole registry once for the fills and again for the logos.
function buildTerritoryVisibilityIndex(matchingRecords) {
  const brandIdsByGeoKey = new Map();

  matchingRecords.forEach((record) => {
    const geoKey = record.geoKey || record.state;
    if (!geoKey) return;

    const brandIds = brandIdsByGeoKey.get(geoKey);
    if (brandIds) {
      brandIds.add(record.brandId);
    } else {
      brandIdsByGeoKey.set(geoKey, new Set([record.brandId]));
    }
  });

  // Dataset occupancy order decides which brands get a painted shape and
  // which get a logo slot. Lists and density still see every occupant.
  const occupantsByGeoKey = new Map();
  const geoKeysByBrand = new Map();
  const logoGeoKeysByBrand = new Map();

  brandIdsByGeoKey.forEach((brandIds, geoKey) => {
    const occupancy = territoryStateOccupancy.get(geoKey);
    const occupants = occupancy
      ? occupancy.filter((occupantId) => brandIds.has(occupantId))
      : [...brandIds];

    occupantsByGeoKey.set(geoKey, occupants);

    getShapeOccupants(occupants).forEach((brandId) => {
      appendGeoKeyForBrand(geoKeysByBrand, brandId, geoKey);
    });
    getLogoOccupants(occupants).forEach((brandId) => {
      appendGeoKeyForBrand(logoGeoKeysByBrand, brandId, geoKey);
    });
  });

  return {
    geoKeysByBrand,
    occupantsByGeoKey,
    logoGeoKeysByBrand,
    visibleGeoKeys: new Set(brandIdsByGeoKey.keys())
  };
}

function getVisibleSharedOccupantCount(stateCode) {
  const matchingRecords = territoryRenderedRecords
    || territoryLastMatchingRecords
    || (territoryHoldInitialRender ? [] : territoryRegistry);
  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const occupants = territoryStateOccupancy.get(stateCode) || [];

  return occupants.filter((occupantId) => matchingKeys.has(`${occupantId}:${stateCode}`)).length;
}

function getTerritoryDensityCountRange(counts) {
  if (!counts.length) return { minCount: 0, maxCount: 0 };

  return counts.reduce((range, count) => ({
    minCount: Math.min(range.minCount, count),
    maxCount: Math.max(range.maxCount, count)
  }), { minCount: counts[0], maxCount: counts[0] });
}

function getTerritoryDensityAdjustedRatio(count, minCount, maxCount) {
  const normalized = (count - minCount) / (maxCount - minCount || 1);
  return Math.pow(Math.max(0, Math.min(1, normalized)), TERRITORY_DENSITY_OPACITY_CURVE);
}

function getTerritoryDensityOpacities(count, minCount, maxCount) {
  const adjusted = getTerritoryDensityAdjustedRatio(count, minCount, maxCount);

  return {
    fillOpacity: TERRITORY_DENSITY_FILL_OPACITY_MIN
      + adjusted * (TERRITORY_DENSITY_FILL_OPACITY_MAX - TERRITORY_DENSITY_FILL_OPACITY_MIN),
    lineOpacity: TERRITORY_DENSITY_LINE_OPACITY_MIN
      + adjusted * (TERRITORY_DENSITY_LINE_OPACITY_MAX - TERRITORY_DENSITY_LINE_OPACITY_MIN)
  };
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

  const entries = [...entriesByGeoKey.values()].map((entry) => ({
    ...entry,
    brandCount: entry.brandIds.size
  }));
  const { minCount, maxCount } = getTerritoryDensityCountRange(
    entries.map((entry) => entry.brandCount)
  );

  return {
    type: "FeatureCollection",
    features: entries.map((entry) => {
      const opacities = getTerritoryDensityOpacities(entry.brandCount, minCount, maxCount);

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
          brandCount: entry.brandCount,
          fillOpacity: opacities.fillOpacity,
          lineOpacity: opacities.lineOpacity
        }
      };
    })
  };
}

function updateTerritoryDensityData(territoryMap, matchingRecords, visibleGeoKeys) {
  // Handing Mapbox a new density collection re-tiles every polygon in the
  // result set, so skip it while the layer is hidden and whenever the visible
  // territories and their brand counts have not moved.
  if (!territoryDensityEnabled) {
    territoryDensityDataStale = true;
    return;
  }

  const collection = buildTerritoryDensityFeatureCollection(matchingRecords);
  const signature = collection.features
    .map((feature) => `${feature.properties.geoKey}:${feature.properties.brandCount}`)
    .join(",")
    + (isTerritoryRadiusFadeActive() ? `::${territoryRadiusFadeSignature}` : "");

  if (!territoryDensityDataStale && signature === territoryDensitySignature) return;

  const fadedCollection = splitTerritoryFeatureCollectionByRadius(
    collection,
    visibleGeoKeys,
    "geoKey"
  );
  territoryMap.getSource(TERRITORY_DENSITY_SOURCE_ID)?.setData(fadedCollection);
  territoryDensitySignature = signature;
  territoryDensityDataStale = false;
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

// Every setFilter makes Mapbox re-evaluate the layer's tiles, and a wide search
// touches hundreds of layers. Most brands keep the same visible territories
// across a refresh, so their filters are compared by signature and left alone.
function setCachedTerritoryLayerFilter(territoryMap, layerId, filter, signature) {
  if (!layerId || territoryLayerFilterSignatures.get(layerId) === signature) return;
  if (!territoryMap.getLayer(layerId)) return;

  territoryMap.setFilter(layerId, filter);
  territoryLayerFilterSignatures.set(layerId, signature);
}

function renderTerritoryRecords(matchingRecords) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  clearSidebarTerritoryHover();
  territoryRenderedRecords = matchingRecords;

  syncTerritoryRadiusOverlay();

  const visibility = buildTerritoryVisibilityIndex(matchingRecords);
  const visibleOccupantsByState = visibility.occupantsByGeoKey;
  territoryOccupantsByGeoKey = visibleOccupantsByState;
  syncTerritoryRadiusOutsideFade(territoryMap, matchingRecords);
  updateTerritoryDensityData(territoryMap, matchingRecords, visibility.visibleGeoKeys);

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    const visibleGeoKeys = expandGeoKeysForRadiusFade(visibility.geoKeysByBrand.get(brand.id) || []);
    const geoKeyFilter = buildGeoKeyVisibilityFilter(visibleGeoKeys);
    const geoKeySignature = visibleGeoKeys.join(",");
    const logoGeoKeys = visibility.logoGeoKeysByBrand.get(brand.id) || [];
    const logoFilter = buildGeoKeyVisibilityFilter(logoGeoKeys);

    layerIds.geoLayers.forEach((geoLayers, geoType) => {
      const geoTypeFilter = ["==", ["get", "geoType"], geoType];
      const signature = `${geoType}|${geoKeySignature}`;

      setCachedTerritoryLayerFilter(
        territoryMap,
        geoLayers.fillLayerId,
        combineTerritoryFilters(geoKeyFilter, geoTypeFilter, TERRITORY_STATUS_NON_ESTABLISHED_FILTER),
        signature
      );
      setCachedTerritoryLayerFilter(
        territoryMap,
        geoLayers.hatchLayerId,
        combineTerritoryFilters(geoKeyFilter, geoTypeFilter, TERRITORY_STATUS_ESTABLISHED_FILTER),
        signature
      );
      setCachedTerritoryLayerFilter(
        territoryMap,
        geoLayers.lineLayerId,
        combineTerritoryFilters(geoKeyFilter, geoTypeFilter),
        signature
      );
    });

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      setCachedTerritoryLayerFilter(
        territoryMap,
        layerIds.logoLayerId,
        logoFilter,
        `logo|${logoGeoKeys.join(",")}`
      );
      updateBrandLogoOffsets(territoryMap, brand.id, visibleOccupantsByState);
    }
  });

  updateConsolidatedSharedTerritories(territoryMap, visibleOccupantsByState);
  syncPastelFillOccupancyStates(territoryMap, visibleOccupantsByState);
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

function getVisibleTerritoryRecords(matchingRecords, selectedRecords) {
  // Keep the current filters while the area card is still live. Narrowing to
  // the selected record retiles leftover faded territories at default paint.
  if (selectedRecords.length && territoryAreaCardGeoKey) {
    return matchingRecords;
  }
  return selectedRecords.length ? selectedRecords : matchingRecords;
}

function getTerritoryIsolatedBrandIds() {
  if (!territoryAreaCardGeoKey) return null;
  const selectedRecords = getSelectedTerritoryRecords();
  if (!selectedRecords.length) return null;
  return new Set(selectedRecords.map((record) => record.brandId));
}

function syncTerritorySelectionLayerVisibility() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  // Isolation is paint-only. Layout visibility stays with the normal
  // density / border / logo settings so hidden layers do not rematerialize
  // at default opacity when returning to the area card.
  const showFills = !territoryDensityEnabled;
  const showLines = territoryBordersEnabled && !territoryDensityEnabled;
  const showLogos = territoryBrandLogosEnabled;

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    layerIds.geoLayers.forEach((geoLayers) => {
      if (geoLayers.fillLayerId && territoryMap.getLayer(geoLayers.fillLayerId)) {
        territoryMap.setLayoutProperty(
          geoLayers.fillLayerId,
          "visibility",
          showFills ? "visible" : "none"
        );
      }
      if (geoLayers.hatchLayerId && territoryMap.getLayer(geoLayers.hatchLayerId)) {
        territoryMap.setLayoutProperty(
          geoLayers.hatchLayerId,
          "visibility",
          showFills ? "visible" : "none"
        );
      }
      if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId)) {
        territoryMap.setLayoutProperty(
          geoLayers.lineLayerId,
          "visibility",
          showLines ? "visible" : "none"
        );
      }
    });

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      territoryMap.setLayoutProperty(
        layerIds.logoLayerId,
        "visibility",
        showLogos ? "visible" : "none"
      );
    }
  });
}

function setTerritoryContextHiddenState(territoryMap, brandId, geoKey, hidden) {
  const stateKey = `${brandId}\0${geoKey}`;
  if (territoryContextHiddenState.get(stateKey) === hidden) return;

  try {
    territoryMap.setFeatureState(
      { source: `territories-${brandId}`, id: geoKey },
      { contextHidden: hidden }
    );
    if (territoryMap.getSource(`territories-${brandId}-logos`)) {
      territoryMap.setFeatureState(
        { source: `territories-${brandId}-logos`, id: geoKey },
        { contextHidden: hidden }
      );
    }
    territoryContextHiddenState.set(stateKey, hidden);
  } catch (error) {
    // The feature may not exist on this source.
  }
}

function syncTerritoryContextHiddenStates() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const isolatedBrandIds = getTerritoryIsolatedBrandIds();
  const highlightGeoKey = getTerritoryAreaMapHighlightGeoKey();
  const hideOthers = Boolean(isolatedBrandIds && highlightGeoKey);
  const nextHidden = new Set();
  const records = territoryLastMatchingRecords || territoryRegistry;

  records.forEach((record) => {
    const geoKey = record.geoKey || record.state;
    const brandId = record.brandId;
    if (!geoKey || !brandId) return;

    const hidden = hideOthers && (geoKey !== highlightGeoKey || !isolatedBrandIds.has(brandId));
    if (hidden) nextHidden.add(`${brandId}\0${geoKey}`);
    setTerritoryContextHiddenState(territoryMap, brandId, geoKey, hidden);
  });

  territoryContextHiddenState.forEach((hidden, stateKey) => {
    if (!hidden || nextHidden.has(stateKey)) return;
    const separator = stateKey.indexOf("\0");
    if (separator < 0) return;
    setTerritoryContextHiddenState(
      territoryMap,
      stateKey.slice(0, separator),
      stateKey.slice(separator + 1),
      false
    );
  });
}

function getTerritoryOpacityTransition() {
  return territoryRevealActive
    ? { duration: TERRITORY_REVEAL_FADE_MS, delay: 0 }
    : { duration: 0, delay: 0 };
}

function getTerritoryAreaMapHighlightGeoKey() {
  const card = getTerritoryInfoCardElement();
  // Keep faded context paint while the area card key is still live. Clearing it
  // on selectedTerritoryKey / is-detail updates cached tiles to full opacity
  // before setFilter finishes hiding those territories.
  if (!territoryAreaCardGeoKey || !card || card.hidden) {
    return null;
  }

  return territoryAreaCardGeoKey;
}

function isTerritoryDetailMapHighlightActive() {
  return Boolean(selectedTerritoryKey || compareTerritoryKey);
}

function getDensityFillColorExpression() {
  return TERRITORY_DENSITY_HIGH_COLOR;
}

function getDensityFillOpacityExpression() {
  if (isTerritoryDetailMapHighlightActive()) {
    return withTerritoryLayerOpacity(
      withTerritoryAreaFocusOpacity(TERRITORY_FILL_SELECTED_OPACITY, 0)
    );
  }

  if (getTerritoryAreaMapHighlightGeoKey()) {
    return withTerritoryLayerOpacity([
      "case",
      ["boolean", ["feature-state", "hover"], false],
      TERRITORY_AREA_CONTEXT_HOVER_OPACITY,
      TERRITORY_AREA_CONTEXT_OPACITY
    ]);
  }

  return withTerritoryLayerOpacity([
    "case",
    ["boolean", ["feature-state", "hover"], false],
    TERRITORY_DENSITY_FILL_HOVER_OPACITY_EXPRESSION,
    TERRITORY_DENSITY_FILL_OPACITY_EXPRESSION
  ]);
}

function getDensityLineColorExpression() {
  return territoryBorderColorMode === "white"
    ? TERRITORY_WHITE_BORDER_COLOR
    : TERRITORY_DENSITY_HIGH_COLOR;
}

function getDensityLineOpacityExpression() {
  if (territoryBorderColorMode === "white") {
    if (isTerritoryDetailMapHighlightActive()) {
      return withTerritoryLayerOpacity(
        withTerritoryAreaFocusOpacity(TERRITORY_WHITE_LINE_SELECTED_OPACITY, 0)
      );
    }

    if (getTerritoryAreaMapHighlightGeoKey()) {
      return withTerritoryLayerOpacity([
        "case",
        ["boolean", ["feature-state", "hover"], false],
        TERRITORY_WHITE_LINE_SELECTED_OPACITY,
        TERRITORY_WHITE_LINE_OPACITY
      ]);
    }

    return withTerritoryLayerOpacity(TERRITORY_WHITE_LINE_OPACITY_EXPRESSION);
  }

  if (isTerritoryDetailMapHighlightActive()) {
    return withTerritoryLayerOpacity(
      withTerritoryAreaFocusOpacity(TERRITORY_LINE_SELECTED_OPACITY, 0)
    );
  }

  if (getTerritoryAreaMapHighlightGeoKey()) {
    return withTerritoryLayerOpacity([
      "case",
      ["boolean", ["feature-state", "hover"], false],
      TERRITORY_AREA_CONTEXT_LINE_HOVER_OPACITY,
      TERRITORY_AREA_CONTEXT_LINE_OPACITY
    ]);
  }

  return withTerritoryLayerOpacity([
    "case",
    ["boolean", ["feature-state", "hover"], false],
    TERRITORY_DENSITY_LINE_HOVER_OPACITY_EXPRESSION,
    TERRITORY_DENSITY_LINE_OPACITY_EXPRESSION
  ]);
}

function syncTerritoryLayerOpacities() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const transition = getTerritoryOpacityTransition();

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    layerIds.geoLayers.forEach((geoLayers) => {
      if (geoLayers.fillLayerId && territoryMap.getLayer(geoLayers.fillLayerId)) {
        territoryMap.setPaintProperty(geoLayers.fillLayerId, "fill-opacity-transition", transition);
        territoryMap.setPaintProperty(
          geoLayers.fillLayerId,
          "fill-opacity",
          territoryDensityEnabled ? 0 : withTerritoryLayerOpacity(getTerritoryFillOpacityExpression())
        );
      }

      if (geoLayers.hatchLayerId && territoryMap.getLayer(geoLayers.hatchLayerId)) {
        territoryMap.setPaintProperty(geoLayers.hatchLayerId, "fill-opacity-transition", transition);
        territoryMap.setPaintProperty(
          geoLayers.hatchLayerId,
          "fill-opacity",
          territoryDensityEnabled ? 0 : withTerritoryLayerOpacity(getTerritoryHatchOpacityExpression())
        );
      }

      if (geoLayers.lineLayerId && territoryMap.getLayer(geoLayers.lineLayerId)) {
        territoryMap.setPaintProperty(geoLayers.lineLayerId, "line-opacity-transition", transition);
        territoryMap.setPaintProperty(
          geoLayers.lineLayerId,
          "line-opacity",
          withTerritoryLayerOpacity(getTerritoryLineOpacityExpression())
        );
      }
    });

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      territoryMap.setPaintProperty(
        layerIds.logoLayerId,
        "icon-opacity",
        withTerritoryLayerOpacity(
          withTerritoryAreaFocusOpacity(1, TERRITORY_BRAND_AREA_CONTEXT_LINE_OPACITY)
        )
      );
      territoryMap.setPaintProperty(layerIds.logoLayerId, "icon-opacity-transition", transition);
    }
  });

  if (territoryMap.getLayer(TERRITORY_DENSITY_FILL_LAYER_ID)) {
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_FILL_LAYER_ID,
      "fill-color",
      getDensityFillColorExpression()
    );
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_FILL_LAYER_ID,
      "fill-opacity",
      getDensityFillOpacityExpression()
    );
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_FILL_LAYER_ID,
      "fill-opacity-transition",
      transition
    );
  }

  if (territoryMap.getLayer(TERRITORY_AREA_FOCUS_LINE_LAYER_ID)) {
    territoryMap.setPaintProperty(
      TERRITORY_AREA_FOCUS_LINE_LAYER_ID,
      "line-color",
      getTerritoryFocusLineColor()
    );
  }

  if (territoryMap.getLayer(TERRITORY_DENSITY_LINE_LAYER_ID)) {
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_LINE_LAYER_ID,
      "line-color",
      getDensityLineColorExpression()
    );
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_LINE_LAYER_ID,
      "line-opacity",
      getDensityLineOpacityExpression()
    );
    territoryMap.setPaintProperty(
      TERRITORY_DENSITY_LINE_LAYER_ID,
      "line-opacity-transition",
      transition
    );
  }

  syncTerritorySelectionLayerVisibility();
  syncTerritoryContextHiddenStates();
}

function syncTerritoryAreaMapHighlight() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || typeof territoryMap.getLayer !== "function") return;

  const geoKey = getTerritoryAreaMapHighlightGeoKey();
  const filter = geoKey
    ? [
      "==",
      ["coalesce", ["get", "sourceGeoKey"], ["get", "geoKey"]],
      geoKey
    ]
    : ["==", ["get", "geoKey"], ""];
  const fillVisibility = territoryDensityEnabled && geoKey ? "visible" : "none";
  const lineVisibility = territoryDensityEnabled && territoryBordersEnabled && geoKey
    ? "visible"
    : "none";

  if (territoryMap.getLayer(TERRITORY_AREA_FOCUS_FILL_LAYER_ID)) {
    territoryMap.setFilter(TERRITORY_AREA_FOCUS_FILL_LAYER_ID, filter);
    territoryMap.setLayoutProperty(
      TERRITORY_AREA_FOCUS_FILL_LAYER_ID,
      "visibility",
      fillVisibility
    );
  }

  if (territoryMap.getLayer(TERRITORY_AREA_FOCUS_LINE_LAYER_ID)) {
    territoryMap.setFilter(TERRITORY_AREA_FOCUS_LINE_LAYER_ID, filter);
    territoryMap.setLayoutProperty(
      TERRITORY_AREA_FOCUS_LINE_LAYER_ID,
      "visibility",
      lineVisibility
    );
  }

  syncTerritoryBrandPaintColors();
  syncTerritoryLayerOpacities();
}

function getTerritoryFeatureStateId(record) {
  return getTerritoryPromoteId() === "state"
    ? record.state
    : (record.geoKey || record.state);
}

function setTerritoryFeatureRevealState(sourceId, id, revealed) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || id == null || !territoryMap.getSource(sourceId)) return;

  try {
    territoryMap.setFeatureState({ source: sourceId, id }, { reveal: revealed });
  } catch (error) {
    // The feature may not exist on this source.
  }
}

function setTerritoryRecordRevealState(record, revealed) {
  const featureId = getTerritoryFeatureStateId(record);
  const geoKey = record.geoKey || record.state;
  setTerritoryFeatureRevealState(`territories-${record.brandId}`, featureId, revealed);
  setTerritoryFeatureRevealState(`territories-${record.brandId}-logos`, featureId, revealed);
  setTerritoryFeatureRevealState(TERRITORY_DENSITY_SOURCE_ID, geoKey, revealed);

  if (isTerritoryRadiusFadeActive() && geoKey) {
    setTerritoryFeatureRevealState(
      `territories-${record.brandId}`,
      getRadiusOutsideGeoKey(featureId),
      revealed
    );
    setTerritoryFeatureRevealState(
      TERRITORY_DENSITY_SOURCE_ID,
      getRadiusOutsideGeoKey(geoKey),
      revealed
    );
  }
}

function getRecordRevealDistanceMiles(record, center) {
  const point = Array.isArray(record.center) && record.center.length >= 2
    ? record.center
    : record.geometryBounds
      ? [
          (record.geometryBounds.west + record.geometryBounds.east) / 2,
          (record.geometryBounds.south + record.geometryBounds.north) / 2
        ]
      : null;

  if (!point) return 0;
  return getLngLatDistanceMiles(center, point);
}

function easeOutReveal(value) {
  return 1 - ((1 - value) ** 2.25);
}

function cancelTerritoryRevealAnimation() {
  if (!territoryRevealRaf) return;
  window.cancelAnimationFrame(territoryRevealRaf);
  territoryRevealRaf = 0;
}

function finishTerritoryReveal() {
  cancelTerritoryRevealAnimation();
  territoryRevealActive = false;
  syncTerritoryLayerOpacities();
  if (!territoryBusyHeldForReveal) return;

  territoryBusyHeldForReveal = false;
  const resetWillShow = shouldTerritoryMapResetShow();
  const crossfade = isTerritoryMapBusyVisible() && resetWillShow;
  setTerritoryMapBusy(false, { crossfade });
  if (crossfade) {
    showTerritoryMapReset({ crossfade: true });
  } else {
    updateTerritoryMapResetVisibility();
  }
}

function isTerritoryStateLevelRecord(record) {
  return normalizeTerritoryGeoType(record?.geoType) === "region";
}

function startTerritoryRadialReveal(center, records) {
  cancelTerritoryRevealAnimation();

  if (!records.length) {
    finishTerritoryReveal();
    return;
  }

  const items = records.map((record) => ({
    record,
    distance: getRecordRevealDistanceMiles(record, center),
    isStateLevel: isTerritoryStateLevelRecord(record)
  }));
  const localMaxDistance = items.reduce((maxDistance, item) => (
    item.isStateLevel ? maxDistance : Math.max(maxDistance, item.distance)
  ), 0);

  // Keep the radial sweep, but hold state polygons until the last stretch of
  // the city / county / CBSA reveal so the two waves overlap.
  if (localMaxDistance > 0) {
    const stateOffset = localMaxDistance * (1 - TERRITORY_REVEAL_STATE_OVERLAP);
    items.forEach((item) => {
      if (item.isStateLevel) item.distance += stateOffset;
    });
  }

  items.sort((left, right) => (
    left.distance - right.distance
    || Number(left.isStateLevel) - Number(right.isStateLevel)
  ));

  const maxDistance = Math.max(items[items.length - 1].distance, TERRITORY_REVEAL_MIN_MILES);
  const startedAt = performance.now();
  let nextIndex = 0;

  const frame = (now) => {
    const progress = easeOutReveal(Math.min(1, (now - startedAt) / TERRITORY_REVEAL_DURATION_MS));
    const radius = progress * maxDistance;

    while (nextIndex < items.length && items[nextIndex].distance <= radius) {
      setTerritoryRecordRevealState(items[nextIndex].record, true);
      nextIndex += 1;
    }

    if (progress < 1) {
      territoryRevealRaf = window.requestAnimationFrame(frame);
      return;
    }

    finishTerritoryReveal();
  };

  territoryRevealRaf = window.requestAnimationFrame(frame);
}

function getTerritoryMapRevealCenter() {
  const center = window.territoryMap?.getCenter?.();
  if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) return null;
  return [center.lng, center.lat];
}

function armTerritoryLocationReveal(longitude, latitude, { fromMapCenter = false } = {}) {
  const lng = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;

  cancelTerritoryRevealAnimation();
  territoryPendingRevealCenter = [lng, lat];
  territoryPendingRevealFromMapCenter = fromMapCenter;
  return true;
}

function armTerritoryMapCenterReveal() {
  const center = getTerritoryMapRevealCenter();
  if (!center) return false;
  return armTerritoryLocationReveal(center[0], center[1], { fromMapCenter: true });
}

function getTerritoryStateCenter(stateCode) {
  const feature = territoryStatesByCode.get(stateCode);
  if (!feature?.geometry) return null;

  const centroid = getTerritoryCentroid(feature.geometry);
  if (!Array.isArray(centroid) || centroid.length < 2) return null;
  if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;

  return centroid;
}

function armTerritoryStateReveal(stateCode) {
  const center = getTerritoryStateCenter(stateCode);
  if (!center) return false;

  return armTerritoryLocationReveal(center[0], center[1]);
}

function armTerritoryStatesReveal(stateCodes) {
  const codes = [...new Set((stateCodes || []).filter(Boolean))];
  if (!codes.length) return false;
  if (codes.length === 1) return armTerritoryStateReveal(codes[0]);

  const centers = codes.map(getTerritoryStateCenter).filter(Boolean);
  if (!centers.length) return false;

  const longitude = centers.reduce((sum, center) => sum + center[0], 0) / centers.length;
  const latitude = centers.reduce((sum, center) => sum + center[1], 0) / centers.length;
  return armTerritoryLocationReveal(longitude, latitude);
}

function whenTerritoryMapReadyForReveal(territoryMap, callback) {
  const start = () => {
    if (!territoryMap) {
      callback();
      return;
    }

    if (!territoryMap.isMoving?.() && territoryMap.areTilesLoaded?.()) {
      callback();
      return;
    }

    territoryMap.once("idle", callback);
  };

  if (isTerritoryMapCoveredByLoading()) {
    territoryRevealAfterOverlay = start;
    return;
  }

  start();
}

function playTerritoryRevealAfterFocus(territoryMap) {
  const isMoving = Boolean(territoryMap?.isMoving?.());
  const finish = () => {
    if (territoryMap) {
      captureTerritoryFilterDefaultViewFromMap(territoryMap);
    }
    playPendingTerritoryReveal();
    updateTerritoryMapResetVisibility();
  };

  if (isMoving) {
    territoryMap.once("moveend", finish);
    return;
  }

  finish();
}

function notifyTerritoryListEnterStarted() {
  const start = territoryRevealWhenListEnters;
  territoryRevealWhenListEnters = null;
  start?.();
}

function getTerritoryRecordIdentity(record) {
  return `${record.brandId}:${record.geoKey || record.state}`;
}

function playPendingTerritoryReveal(records = territoryPendingRevealRecords || territoryLastMatchingRecords || []) {
  if (territoryPendingRevealFromMapCenter) {
    const mapCenter = getTerritoryMapRevealCenter();
    if (mapCenter) territoryPendingRevealCenter = mapCenter;
  }

  const center = territoryPendingRevealCenter;
  if (!center) return;

  if (prefersTerritoryReducedMotion()) {
    territoryPendingRevealCenter = null;
    territoryPendingRevealRecords = null;
    territoryPendingRevealFromMapCenter = false;
    if (territoryRevealActive) finishTerritoryReveal();
    return;
  }

  territoryPendingRevealCenter = null;
  territoryPendingRevealFromMapCenter = false;
  const pendingRecords = records.length ? records : (territoryPendingRevealRecords || []);
  territoryPendingRevealRecords = null;

  // The sweep waits for the list and for Mapbox to ingest the new density
  // features. setData clears feature-state, so starting earlier makes the
  // hide/reveal updates no-ops and the polygons just appear when tiles land.
  const revealToken = ++territoryRevealCommitToken;
  const start = () => {
    if (revealToken !== territoryRevealCommitToken) return;
    const playRecords = pendingRecords.length ? pendingRecords : (territoryLastMatchingRecords || []);
    territoryRevealActive = true;
    syncTerritoryLayerOpacities();
    playRecords.forEach((record) => setTerritoryRecordRevealState(record, false));

    const beginSweep = () => {
      if (revealToken !== territoryRevealCommitToken) return;
      territoryRevealWhenListEnters = null;
      startTerritoryRadialReveal(center, playRecords);
    };

    // Hold the sweep until the list enter starts so both panels animate together.
    if (window.territoryBrandPanel?.isEnterPending?.()) {
      territoryRevealWhenListEnters = beginSweep;
      return;
    }

    beginSweep();
  };

  const afterCommit = () => {
    if (revealToken !== territoryRevealCommitToken) return;
    whenTerritoryMapReadyForReveal(window.territoryMap, start);
  };

  const commit = territoryResultsCommit;
  if (!commit) {
    afterCommit();
    return;
  }

  commit.then(afterCommit);
}

function applyTerritoryFilters(matchingRecords, { isCancelled } = {}) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  const previousKeys = new Set((territoryLastMatchingRecords || []).map(getTerritoryRecordIdentity));
  const hasAddedRecords = matchingRecords.some(
    (record) => !previousKeys.has(getTerritoryRecordIdentity(record))
  );
  if (
    !territoryPendingRevealCenter
    && hasAddedRecords
    && !prefersTerritoryReducedMotion()
  ) {
    armTerritoryMapCenterReveal();
  }
  const shouldReveal = Boolean(territoryPendingRevealCenter) && !prefersTerritoryReducedMotion();

  clearTerritoryMapHover?.();
  hideTerritoryAreaCard({ immediate: true });
  territoryLastMatchingRecords = matchingRecords;
  territoryHoldInitialRender = false;
  setTerritoryIntersectionScope(matchingRecords);

  if (shouldReveal) {
    cancelTerritoryRevealAnimation();
  }

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
  const visibleRecords = getVisibleTerritoryRecords(matchingRecords, selectedRecords);
  renderTerritoryRecords(visibleRecords);
  window.territoryFilters?.updateSummary?.(matchingRecords.length, territoryRegistry.length);

  // The list builds itself in slices, so callers get a promise for the moment
  // the rendered results are actually on screen.
  const listCommit = Promise.resolve(
    window.territoryBrandPanel?.update?.(territoryBrands, matchingRecords, { isCancelled })
  );
  territoryResultsCommit = listCommit;
  listCommit.then(() => {
    if (territoryResultsCommit === listCommit) territoryResultsCommit = null;
  });

  showTerritoryInfoCards(selectedRecords[0] || null, selectedRecords[1] || null);

  if (shouldReveal) {
    const addedRecords = visibleRecords.filter(
      (record) => !previousKeys.has(getTerritoryRecordIdentity(record))
    );
    const keptRecords = visibleRecords.filter(
      (record) => previousKeys.has(getTerritoryRecordIdentity(record))
    );
    // setData wipes density feature-state, so restore already-drawn territories
    // before the reveal gate turns on. Only the newly added shapes hide.
    keptRecords.forEach((record) => setTerritoryRecordRevealState(record, true));
    addedRecords.forEach((record) => setTerritoryRecordRevealState(record, false));
    if (addedRecords.length) {
      territoryRevealActive = true;
      territoryPendingRevealRecords = addedRecords;
      syncTerritoryLayerOpacities();
      if (territoryViewportFramed && !territoryMap.isMoving?.()) {
        playPendingTerritoryReveal(addedRecords);
      }
    } else {
      territoryPendingRevealCenter = null;
      territoryPendingRevealRecords = null;
      territoryPendingRevealFromMapCenter = false;
      if (territoryRevealActive) finishTerritoryReveal();
    }
  } else if (territoryPendingRevealCenter && prefersTerritoryReducedMotion()) {
    territoryPendingRevealCenter = null;
    territoryPendingRevealRecords = null;
    territoryPendingRevealFromMapCenter = false;
  }

  if (!selectedTerritoryKey) {
    scheduleTerritoryMapViewForFilters(territoryMap, matchingRecords);
  } else if (selectedRecords.length > 1) {
    focusTerritoryMapOnSelectedRecords(territoryMap, selectedRecords);
  }

  return listCommit;
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

function collectGeometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

// Census MultiPolygons include the Farallon Islands as part of San Francisco
// and California. They are an uninhabited refuge ~27 miles offshore, and
// simplification turns the city piece into a large hoverable ocean blob.
const TERRITORY_EXCLUDED_ISLAND_BOUNDS = [
  { west: -123.20, east: -122.90, south: 37.62, north: 37.85 }
];

function polygonBoundsAreInsideBox(rings, box) {
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

function stripExcludedTerritoryIslandPolygons(geometry) {
  const polygons = collectGeometryPolygons(geometry);
  if (polygons.length < 2) return geometry;

  const kept = polygons.filter((rings) => (
    !TERRITORY_EXCLUDED_ISLAND_BOUNDS.some((box) => polygonBoundsAreInsideBox(rings, box))
  ));
  if (kept.length === polygons.length || !kept.length) return geometry;

  return kept.length === 1
    ? { type: "Polygon", coordinates: kept[0] }
    : { type: "MultiPolygon", coordinates: kept };
}

function sanitizeTerritoryFeature(feature) {
  if (!feature?.geometry) return feature;

  const geometry = stripExcludedTerritoryIslandPolygons(feature.geometry);
  return geometry === feature.geometry ? feature : { ...feature, geometry };
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

function getTerritoryStateBounds(stateCode, feature = territoryStatesByCode.get(stateCode)) {
  if (!stateCode || !feature) return null;
  if (territoryStateBoundsByCode.has(stateCode)) {
    return territoryStateBoundsByCode.get(stateCode);
  }

  const bounds = getGeometryBounds(feature.geometry);
  territoryStateBoundsByCode.set(stateCode, bounds);
  return bounds;
}

function getStateCodeForCoordinates(longitude, latitude) {
  const point = [longitude, latitude];

  for (const [stateCode, stateFeature] of territoryStatesByCode) {
    const bounds = getTerritoryStateBounds(stateCode, stateFeature);
    if (bounds && !pointIsInsideBounds(longitude, latitude, bounds)) continue;

    const polygons = collectGeometryPolygons(stateFeature.geometry);
    if (polygons.some((rings) => pointIsInsideGeometryPolygon(point, rings))) {
      return stateCode;
    }
  }

  return null;
}

function boundsOverlap(left, right) {
  return Boolean(
    left
    && right
    && left.west <= right.east
    && left.east >= right.west
    && left.south <= right.north
    && left.north >= right.south
  );
}

function getTerritoryViewportLandSamplePoints(bounds, center) {
  const points = [];
  const width = bounds.east - bounds.west;
  const height = bounds.north - bounds.south;
  const rings = [0.18, 0.36, 0.58, 0.8];
  const directions = 12;

  rings.forEach((radius) => {
    for (let index = 0; index < directions; index += 1) {
      const angle = (index / directions) * Math.PI * 2;
      const longitude = center[0] + (Math.cos(angle) * (width / 2) * radius);
      const latitude = center[1] + (Math.sin(angle) * (height / 2) * radius);
      if (pointIsInsideBounds(longitude, latitude, bounds)) {
        points.push([longitude, latitude]);
      }
    }
  });

  for (let row = 1; row <= 3; row += 1) {
    for (let column = 1; column <= 3; column += 1) {
      points.push([
        bounds.west + ((width * column) / 4),
        bounds.south + ((height * row) / 4)
      ]);
    }
  }

  return points;
}

function getNearestStateVertex(feature, target, viewportBounds = null) {
  const polygons = collectGeometryPolygons(feature?.geometry);
  let bestPoint = null;
  let bestDistance = Infinity;

  polygons.forEach((rings) => {
    const ring = rings[0];
    if (!ring?.length) return;

    const step = Math.max(1, Math.ceil(ring.length / 64));
    for (let index = 0; index < ring.length; index += step) {
      const [longitude, latitude] = ring[index];
      if (viewportBounds && !pointIsInsideBounds(longitude, latitude, viewportBounds)) {
        continue;
      }

      const distance = getLngLatDistanceMiles(target, [longitude, latitude]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPoint = [longitude, latitude];
      }
    }
  });

  return bestPoint ? { point: bestPoint, distance: bestDistance } : null;
}

function resolveTerritorySearchAreaAnchor(territoryMap) {
  const center = territoryMap?.getCenter?.();
  if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) {
    return null;
  }

  const target = [center.lng, center.lat];
  const centerStateCode = getStateCodeForCoordinates(center.lng, center.lat);
  if (centerStateCode) {
    return {
      longitude: center.lng,
      latitude: center.lat,
      stateCode: centerStateCode
    };
  }

  const viewportBounds = getTerritoryMapViewportBounds();
  if (viewportBounds) {
    for (const [longitude, latitude] of getTerritoryViewportLandSamplePoints(viewportBounds, target)) {
      const stateCode = getStateCodeForCoordinates(longitude, latitude);
      if (!stateCode) continue;
      return { longitude, latitude, stateCode };
    }

    let bestInView = null;
    territoryStatesByCode.forEach((feature, stateCode) => {
      const stateBounds = getTerritoryStateBounds(stateCode, feature);
      if (!boundsOverlap(viewportBounds, stateBounds)) return;

      const nearest = getNearestStateVertex(feature, target, viewportBounds)
        || getNearestStateVertex(feature, target);
      if (!nearest) return;
      if (!bestInView || nearest.distance < bestInView.distance) {
        bestInView = { stateCode, ...nearest };
      }
    });

    if (bestInView) {
      return {
        longitude: bestInView.point[0],
        latitude: bestInView.point[1],
        stateCode: bestInView.stateCode
      };
    }
  }

  let nearestLand = null;
  territoryStatesByCode.forEach((feature, stateCode) => {
    const nearest = getNearestStateVertex(feature, target);
    if (!nearest) return;
    if (!nearestLand || nearest.distance < nearestLand.distance) {
      nearestLand = { stateCode, ...nearest };
    }
  });

  if (!nearestLand) {
    return { longitude: center.lng, latitude: center.lat, stateCode: null };
  }

  return {
    longitude: nearestLand.point[0],
    latitude: nearestLand.point[1],
    stateCode: nearestLand.stateCode
  };
}

function pointIsInsideGeometry(point, geometry) {
  return collectGeometryPolygons(geometry).some((rings) => (
    pointIsInsideGeometryPolygon(point, rings)
  ));
}

function pointIsInsideBounds(longitude, latitude, bounds) {
  return Boolean(
    bounds
    && longitude >= bounds.west
    && longitude <= bounds.east
    && latitude >= bounds.south
    && latitude <= bounds.north
  );
}

function territoryBoundsContainBounds(outer, inner) {
  if (!outer || !inner) return false;
  return outer.west <= inner.west
    && outer.east >= inner.east
    && outer.south <= inner.south
    && outer.north >= inner.north;
}

// Liang-Barsky: clips the segment against each edge of the rectangle and
// reports whether anything survives.
function segmentIntersectsBounds(ax, ay, bx, by, bounds) {
  const dx = bx - ax;
  const dy = by - ay;
  let entry = 0;
  let exit = 1;

  const clip = (edge, distance) => {
    if (edge === 0) return distance >= 0;

    const crossing = distance / edge;
    if (edge < 0) {
      if (crossing > exit) return false;
      if (crossing > entry) entry = crossing;
    } else {
      if (crossing < entry) return false;
      if (crossing < exit) exit = crossing;
    }
    return true;
  };

  return clip(-dx, ax - bounds.west)
    && clip(dx, bounds.east - ax)
    && clip(-dy, ay - bounds.south)
    && clip(dy, bounds.north - ay);
}

// Stands in for turf.booleanIntersects when the other shape is a lat/lng
// rectangle, which is the hot path for viewport searches. turf allocates
// feature wrappers and walks every segment pair; this exits on the first hit.
function geometryIntersectsBounds(geometry, bounds) {
  if (!geometry || !bounds) return false;

  const polygons = collectGeometryPolygons(geometry);
  const corners = [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north]
  ];

  for (const rings of polygons) {
    for (const ring of rings) {
      for (let index = 0; index < ring.length; index += 1) {
        const [longitude, latitude] = ring[index];
        if (pointIsInsideBounds(longitude, latitude, bounds)) return true;
      }
    }

    // The rectangle may also sit wholly inside the polygon, or cross it without
    // either shape putting a vertex inside the other.
    if (corners.some((corner) => pointIsInsideGeometryPolygon(corner, rings))) return true;

    for (const ring of rings) {
      for (let index = 1; index < ring.length; index += 1) {
        const [ax, ay] = ring[index - 1];
        const [bx, by] = ring[index];
        if (segmentIntersectsBounds(ax, ay, bx, by, bounds)) return true;
      }
    }
  }

  return false;
}

function getSquaredDistanceFromOriginToSegment(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSquared = (dx * dx) + (dy * dy);

  if (lengthSquared === 0) {
    return (from[0] * from[0]) + (from[1] * from[1]);
  }

  const projection = Math.max(
    0,
    Math.min(1, -((from[0] * dx) + (from[1] * dy)) / lengthSquared)
  );
  const closestX = from[0] + (projection * dx);
  const closestY = from[1] + (projection * dy);

  return (closestX * closestX) + (closestY * closestY);
}

// Same idea as geometryIntersectsBounds, for the radius filter. Coordinates are
// flattened to miles around the circle centre so the test is plain arithmetic.
function geometryIntersectsCircle(geometry, center, radiusMiles) {
  if (!geometry || !Array.isArray(center) || center.length < 2 || !(radiusMiles > 0)) {
    return false;
  }

  const polygons = collectGeometryPolygons(geometry);
  if (!polygons.length) return false;

  const milesPerDegreeLatitude = (TERRITORY_EARTH_RADIUS_MILES * Math.PI) / 180;
  const milesPerDegreeLongitude = milesPerDegreeLatitude
    * Math.max(0.01, Math.cos((center[1] * Math.PI) / 180));
  const radiusSquared = radiusMiles * radiusMiles;

  for (const rings of polygons) {
    if (pointIsInsideGeometryPolygon(center, rings)) return true;

    for (const ring of rings) {
      let previous = null;

      for (let index = 0; index < ring.length; index += 1) {
        const point = [
          (ring[index][0] - center[0]) * milesPerDegreeLongitude,
          (ring[index][1] - center[1]) * milesPerDegreeLatitude
        ];

        if ((point[0] * point[0]) + (point[1] * point[1]) <= radiusSquared) return true;
        if (previous && getSquaredDistanceFromOriginToSegment(previous, point) <= radiusSquared) {
          return true;
        }

        previous = point;
      }
    }
  }

  return false;
}

function doRawGeometriesIntersect(leftGeometry, rightGeometry) {
  if (!leftGeometry || !rightGeometry || typeof turf === "undefined") return false;

  try {
    return Boolean(
      turf.booleanIntersects(
        turf.feature(leftGeometry),
        turf.feature(rightGeometry)
      )
    );
  } catch (error) {
    return false;
  }
}

function getLngLatDistanceMiles(from, to) {
  const latitudeDelta = ((to[1] - from[1]) * Math.PI) / 180;
  const longitudeDelta = ((to[0] - from[0]) * Math.PI) / 180;
  const fromLatitude = (from[1] * Math.PI) / 180;
  const toLatitude = (to[1] * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude)
      * Math.cos(toLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = Math.min(1, Math.max(0, haversine));

  return TERRITORY_EARTH_RADIUS_MILES * 2 * Math.atan2(
    Math.sqrt(normalizedHaversine),
    Math.sqrt(1 - normalizedHaversine)
  );
}

function getLocationSearchCoordinates(location) {
  const longitude = Number(location?.coordinates?.longitude);
  const latitude = Number(location?.coordinates?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
}

function isStateOnlyLocationSearch(location) {
  return location?.geoLevel === "region"
    && Boolean(location.stateCode)
    && !location.geoKey
    && !getLocationSearchCoordinates(location);
}

function findContainingGeoFeature(longitude, latitude, geoType) {
  const wantedType = normalizeTerritoryGeoType(geoType);
  if (!wantedType) return null;

  const point = [longitude, latitude];
  let bestFeature = null;
  let bestArea = Infinity;

  const considerFeature = (feature, featureType = normalizeTerritoryGeoType(feature?.properties?.geoType)) => {
    if (!feature?.geometry || featureType !== wantedType) return;

    const bounds = getGeometryBounds(feature.geometry);
    if (!pointIsInsideBounds(longitude, latitude, bounds)) return;
    if (!pointIsInsideGeometry(point, feature.geometry)) return;

    const area = (bounds.east - bounds.west) * (bounds.north - bounds.south);
    if (area >= bestArea) return;

    bestFeature = feature;
    bestArea = area;
  };

  territoryGeoFeaturesByKey.forEach((feature) => considerFeature(feature));

  if (wantedType === "district") {
    territoryCountiesByFips.forEach((feature) => considerFeature(feature, "district"));
  }

  if (wantedType === "region") {
    territoryStatesByCode.forEach((feature) => considerFeature(feature, "region"));
  }

  return bestFeature;
}

function resolveLocationMatchTarget(location) {
  if (!location) return null;

  if (isStateOnlyLocationSearch(location)) {
    return { kind: "state", stateCode: location.stateCode };
  }

  if (location.geoKey) {
    const feature = getTerritoryFeatureByGeoKey(location.geoKey);
    if (feature?.geometry) {
      return {
        kind: "geometry",
        geometry: feature.geometry,
        bounds: getGeometryBounds(feature.geometry)
      };
    }
  }

  const coordinates = getLocationSearchCoordinates(location);
  if (coordinates) {
    const geoType = normalizeTerritoryGeoType(location.geoLevel);
    if (TERRITORY_LOCATION_SHAPE_GEO_TYPES.has(geoType)) {
      const containing = findContainingGeoFeature(
        coordinates.longitude,
        coordinates.latitude,
        geoType
      );
      if (containing?.geometry) {
        return {
          kind: "geometry",
          geometry: containing.geometry,
          bounds: getGeometryBounds(containing.geometry)
        };
      }
    }

    return {
      kind: "point",
      longitude: coordinates.longitude,
      latitude: coordinates.latitude
    };
  }

  if (location.stateCode) {
    return { kind: "state", stateCode: location.stateCode };
  }

  return null;
}

function recordMatchesLocationTarget(record, target, cache) {
  if (!record || !target) return false;

  if (target.kind === "state") {
    return record.state === target.stateCode;
  }

  const geoKey = record.geoKey || record.state || "";
  const targetKey = target.kind === "point"
    ? `${target.longitude},${target.latitude}`
    : `${target.bounds?.west},${target.bounds?.south},${target.bounds?.east},${target.bounds?.north}`;
  const cacheKey = `${target.kind}:${targetKey}:${geoKey}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  let matches = false;

  if (target.kind === "point" && record.geometry) {
    if (
      !record.geometryBounds
      || pointIsInsideBounds(target.longitude, target.latitude, record.geometryBounds)
    ) {
      matches = pointIsInsideGeometry(
        [target.longitude, target.latitude],
        record.geometry
      );
    }
  } else if (target.kind === "geometry" && record.geometry) {
    if (
      !record.geometryBounds
      || !target.bounds
      || territoryBoundsIntersect(record.geometryBounds, target.bounds)
    ) {
      matches = doRawGeometriesIntersect(record.geometry, target.geometry);
    }
  }

  cache?.set(cacheKey, matches);
  return matches;
}

function createBoundsPolygon(bounds) {
  return {
    type: "Polygon",
    coordinates: [[
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south]
    ]]
  };
}

function createViewportMatchContext(bounds) {
  const west = Number(bounds?.west);
  const east = Number(bounds?.east);
  const south = Number(bounds?.south);
  const north = Number(bounds?.north);
  if (![west, east, south, north].every(Number.isFinite) || !(east > west) || !(north > south)) {
    return null;
  }

  const normalized = { west, east, south, north };
  return {
    bounds: normalized,
    geometry: createBoundsPolygon(normalized),
    cache: new Map()
  };
}

function recordIntersectsViewport(record, viewportContext) {
  if (!record || !viewportContext?.bounds) return false;

  const geoKey = record.geoKey || record.state || "";
  const cached = viewportContext.cache.get(geoKey);
  if (cached !== undefined) return cached;

  const bounds = viewportContext.bounds;
  let matches = false;

  if (record.geometry) {
    if (!record.geometryBounds) {
      matches = geometryIntersectsBounds(record.geometry, bounds);
    } else if (territoryBoundsIntersect(record.geometryBounds, bounds)) {
      // A wide viewport swallows most territories whole, so the cheap
      // containment check answers the majority of records outright.
      matches = territoryBoundsContainBounds(bounds, record.geometryBounds)
        || geometryIntersectsBounds(record.geometry, bounds);
    }
  } else if (Array.isArray(record.center) && record.center.length >= 2) {
    matches = pointIsInsideBounds(record.center[0], record.center[1], bounds);
  }

  viewportContext.cache.set(geoKey, matches);
  return matches;
}

function createRadiusMatchContext(centers = [], miles) {
  const numericMiles = Number(miles);

  return {
    miles: Number.isFinite(numericMiles) ? numericMiles : 0,
    cache: new Map(),
    circles: (Array.isArray(centers) ? centers : []).flatMap(({ center, state }) => {
      if (!Array.isArray(center) || center.length < 2) return [];
      const feature = createTerritoryRadiusCircleFeature(center, numericMiles, state);
      return [{
        center,
        geometry: feature.geometry,
        bounds: getGeometryBounds(feature.geometry)
      }];
    })
  };
}

function recordIntersectsRadius(record, radiusContext) {
  if (!record || !radiusContext?.circles?.length) return false;

  const geoKey = record.geoKey || record.state || "";
  const cached = radiusContext.cache.get(geoKey);
  if (cached !== undefined) return cached;

  let matches = false;

  for (const circle of radiusContext.circles) {
    if (record.geometry) {
      if (
        record.geometryBounds
        && circle.bounds
        && !territoryBoundsIntersect(record.geometryBounds, circle.bounds)
      ) {
        continue;
      }

      if (geometryIntersectsCircle(record.geometry, circle.center, radiusContext.miles)) {
        matches = true;
        break;
      }

      continue;
    }

    if (
      Array.isArray(record.center)
      && record.center.length >= 2
      && getLngLatDistanceMiles(record.center, circle.center) <= radiusContext.miles
    ) {
      matches = true;
      break;
    }
  }

  radiusContext.cache.set(geoKey, matches);
  return matches;
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

function buildConsolidatedSharedHitCollection(entries, occupantsByGeoKey) {
  const features = [];

  entries.forEach((entry) => {
    const occupants = occupantsByGeoKey.get(entry.geoKey) || [];
    if (occupants.length < 2) return;

    features.push({
      type: "Feature",
      id: entry.geoKey,
      geometry: entry.geometry,
      properties: {
        geoKey: entry.geoKey,
        state: entry.state,
        stateName: entry.name,
        geoType: entry.geoType,
        geoRank: getTerritoryGeoTypeRank(entry.geoType)
      }
    });
  });

  return { type: "FeatureCollection", features };
}

function setTerritoryLayerFilter(territoryMap, layerId, filter) {
  if (!territoryMap.getLayer(layerId)) return;
  territoryMap.setFilter(layerId, filter);
}

function addConsolidatedSharedTerritoryLayers(territoryMap, entries, occupantsByGeoKey, beforeLayerId) {
  territoryMap.addSource(TERRITORY_SHARED_ALL_SOURCE_ID, {
    type: "geojson",
    data: buildConsolidatedSharedHitCollection(entries, occupantsByGeoKey),
    promoteId: "geoKey",
    maxzoom: TERRITORY_SOURCE_MAX_ZOOM
  });

  // Invisible, but it sits above the stacked brand fills so hovering or clicking
  // a shared territory resolves to the territory rather than one of its brands.
  territoryMap.addLayer({
    id: TERRITORY_SHARED_ALL_HIT_LAYER_ID,
    type: "fill",
    source: TERRITORY_SHARED_ALL_SOURCE_ID,
    filter: buildGeoKeyVisibilityFilter([]),
    paint: {
      "fill-color": "#000000",
      "fill-opacity": 0
    }
  }, beforeLayerId || undefined);

  territorySharedConsolidated = {
    entries,
    signature: null,
    visibleGeoKeys: []
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

  // Only the set of shared territories decides the hit geometry, so it only
  // needs rebuilding when that set (or the radius clip) changes.
  const signature = signatureParts.join("|");
  const nextSignature = isTerritoryRadiusFadeActive()
    ? `${signature}::${territoryRadiusFadeSignature}`
    : signature;
  if (nextSignature !== territorySharedConsolidated.signature) {
    const collection = buildConsolidatedSharedHitCollection(
      territorySharedConsolidated.entries,
      occupantsByGeoKey
    );

    territoryMap.getSource(TERRITORY_SHARED_ALL_SOURCE_ID)?.setData(
      splitTerritoryFeatureCollectionByRadius(collection, new Set(visibleGeoKeys), "geoKey")
    );
    territorySharedConsolidated.signature = nextSignature;
  }

  territorySharedConsolidated.visibleGeoKeys = visibleGeoKeys;

  // Density colors the whole map on its own, so the shared hit target only
  // applies while the stacked brand fills are the ones being shown.
  setTerritoryLayerFilter(
    territoryMap,
    TERRITORY_SHARED_ALL_HIT_LAYER_ID,
    buildGeoKeyVisibilityFilter(territoryDensityEnabled ? [] : visibleGeoKeys)
  );
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
      "fill-color": getDensityFillColorExpression(),
      "fill-opacity": getDensityFillOpacityExpression()
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
      "line-color": getDensityLineColorExpression(),
      "line-opacity": getDensityLineOpacityExpression(),
      "line-width": TERRITORY_LINE_WIDTH
    }
  }, beforeLayerId || undefined);

  territoryMap.addLayer({
    id: TERRITORY_AREA_FOCUS_FILL_LAYER_ID,
    type: "fill",
    source: TERRITORY_DENSITY_SOURCE_ID,
    filter: ["==", ["get", "geoKey"], ""],
    layout: {
      visibility: "none"
    },
    paint: {
      "fill-color": TERRITORY_DENSITY_HIGH_COLOR,
      "fill-opacity": TERRITORY_AREA_FOCUS_OPACITY
    }
  }, beforeLayerId || undefined);

  territoryMap.addLayer({
    id: TERRITORY_AREA_FOCUS_LINE_LAYER_ID,
    type: "line",
    source: TERRITORY_DENSITY_SOURCE_ID,
    filter: ["==", ["get", "geoKey"], ""],
    layout: {
      visibility: "none",
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": getTerritoryFocusLineColor(),
      "line-opacity": TERRITORY_AREA_FOCUS_LINE_OPACITY,
      "line-width": TERRITORY_LINE_WIDTH
    }
  }, beforeLayerId || undefined);
}

function addSharedTerritoryLayers(territoryMap, sharedGeoKeys, geoOccupancy, geoIndex, beforeLayerId) {
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
    beforeLayerId
  );
}

function addBrandTerritoryLayers(territoryMap, brand, featureCollection, logoFeatureCollection, logoMeta, excludeFilter) {
  const sourceId = `territories-${brand.id}`;
  const logoLayerId = `${sourceId}-logo`;
  ensureBrandHatchImage(territoryMap, brand);

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
        "fill-color": getBrandFillColorExpression(brand),
        "fill-opacity": territoryDensityEnabled
          ? 0
          : withTerritoryLayerOpacity(getTerritoryFillOpacityExpression())
      }
    };
    const hatchLayer = {
      id: hatchLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-pattern": getBrandHatchPatternExpression(brand),
        "fill-opacity": territoryDensityEnabled
          ? 0
          : withTerritoryLayerOpacity(getTerritoryHatchOpacityExpression())
      }
    };
    const lineLayer = {
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": getBrandLineColorExpression(brand),
        "line-opacity": withTerritoryLayerOpacity(getTerritoryLineOpacityExpression()),
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
        },
        paint: {
          "icon-opacity": withTerritoryLayerOpacity(
            withTerritoryAreaFocusOpacity(1, TERRITORY_BRAND_AREA_CONTEXT_LINE_OPACITY)
          )
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
      statesGeojson.features.map((feature) => [feature.properties.code, sanitizeTerritoryFeature(feature)])
    );
    const countiesByFips = countiesGeojson
      ? new Map(countiesGeojson.features.map((feature) => [
        feature.properties.fips,
        sanitizeTerritoryFeature(feature)
      ]))
      : new Map();
    const geoFeaturesByKey = geoFeaturesGeojson
      ? new Map(geoFeaturesGeojson.features.map((feature) => [
        feature.properties.geoKey,
        sanitizeTerritoryFeature(feature)
      ]))
      : new Map();
    const geoIndex = { statesByCode, countiesByFips, geoFeaturesByKey };

    territoryIntersectionCache.clear();
    territoryIntersectionIndex = new Map();
    territoryIntersectionScope = new Map();
    territoryLayerFilterSignatures.clear();
    territoryStateBoundsByCode.clear();
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
      const { longitude, latitude, radiusMiles, skipReveal = false } = territoryPendingFocusCoordinates;
      territoryPendingFocusCoordinates = null;
      focusTerritoryCoordinates(longitude, latitude, radiusMiles, { skipReveal });
    } else if (territoryPendingFocusStateCode) {
      const stateCode = territoryPendingFocusStateCode;
      const skipReveal = territoryPendingFocusSkipReveal;
      territoryPendingFocusStateCode = null;
      territoryPendingFocusSkipReveal = false;
      focusTerritoryState(stateCode, { skipReveal });
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
      ensureTerritoryMapResizeObserver();
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

  if (territoryMap.getLayer(TERRITORY_AREA_FOCUS_LINE_LAYER_ID)) {
    territoryMap.setLayoutProperty(
      TERRITORY_AREA_FOCUS_LINE_LAYER_ID,
      "visibility",
      territoryBordersEnabled
        && territoryDensityEnabled
        && getTerritoryAreaMapHighlightGeoKey()
        ? "visible"
        : "none"
    );
  }

  syncTerritorySelectionLayerVisibility();
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

  syncTerritoryAreaMapHighlight();

  if (territoryMap.getLayer(TERRITORY_DENSITY_FILL_LAYER_ID)) {
    territoryMap.setLayoutProperty(
      TERRITORY_DENSITY_FILL_LAYER_ID,
      "visibility",
      territoryDensityEnabled ? "visible" : "none"
    );
  }

  if (territorySharedConsolidated && territoryRegistry.length) {
    const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
    const visibility = buildTerritoryVisibilityIndex(matchingRecords);
    updateConsolidatedSharedTerritories(territoryMap, visibility.occupantsByGeoKey);
  }

  syncTerritoryBorderVisibility();

  if (reapplyFilters && territoryRegistry.length) {
    applyTerritoryFilters(territoryLastMatchingRecords || territoryRegistry);
  }
}

function setTerritoryColorMode(mode, { reapplyFilters = true } = {}) {
  const nextMode = mode === "accent" || mode === "pastel" ? mode : "density";
  territoryDensityEnabled = nextMode === "density";
  territoryPastelColorsEnabled = nextMode === "pastel";
  if (territoryPastelColorsEnabled) {
    assignTerritoryPastelColors(territoryBrands);
  }
  syncTerritoryBrandPaintColors();
  syncTerritoryVisualizationLayers({ reapplyFilters });
}

function setTerritoryDensityEnabled(isEnabled, { reapplyFilters = true } = {}) {
  if (isEnabled) {
    setTerritoryColorMode("density", { reapplyFilters });
    return;
  }
  if (getTerritoryColorMode() === "density") {
    setTerritoryColorMode("accent", { reapplyFilters });
  }
}

function getTerritoryDensityEnabled() {
  return territoryDensityEnabled;
}

function setTerritoryPastelColorsEnabled(isEnabled, { reapplyFilters = true } = {}) {
  if (isEnabled) {
    setTerritoryColorMode("pastel", { reapplyFilters });
    return;
  }
  if (getTerritoryColorMode() === "pastel") {
    setTerritoryColorMode("accent", { reapplyFilters });
  }
}

function getTerritoryPastelColorsEnabled() {
  return territoryPastelColorsEnabled;
}

function setTerritoryBorderColorMode(mode) {
  territoryBorderColorMode = mode === "white" ? "white" : "default";
  syncTerritoryBrandPaintColors();
  syncTerritoryLayerOpacities();
}

function getTerritoryBorderColorMode() {
  return territoryBorderColorMode;
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
  syncTerritorySelectionLayerVisibility();
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
  const visibleRecords = getVisibleTerritoryRecords(matchingRecords, selectedRecords);
  syncTerritorySelectionLayerVisibility();
  if (selectedRecords.length && territoryAreaCardGeoKey) {
    syncTerritoryLayerOpacities();
  }
  renderTerritoryRecords(visibleRecords);
  if (selectedRecords.length) {
    setSelectedTerritoryFeatureStates(selectedRecords);
  }
  window.territoryBrandPanel?.setSelectedTerritory?.(selectedTerritoryKey, compareTerritoryKey);
  if (!skipInfoCard) {
    showTerritoryInfoCards(selectedRecords[0] || null, selectedRecords[1] || null);
  } else {
    syncTerritoryLayerOpacities();
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
  if (selectedRecords.length && !territoryDetailReturnGeoKey) {
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

function finishTerritoryMapFocus(territoryMap, { skipReveal = false } = {}) {
  const finish = () => {
    if (territoryMap) {
      captureTerritoryFilterDefaultViewFromMap(territoryMap);
      if (!skipReveal) {
        window.territoryFilters?.captureViewportFromMap?.();
      }
    }
    if (!skipReveal) {
      playPendingTerritoryReveal();
    }
    updateTerritoryMapResetVisibility();
  };

  if (territoryMap?.isMoving?.()) {
    territoryMap.once("moveend", finish);
    return;
  }

  finish();
}

function focusTerritoryState(stateCode, { skipReveal = false } = {}) {
  if (!stateCode) return false;

  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryStatesByCode.has(stateCode)) {
    territoryPendingFocusStateCode = stateCode;
    territoryPendingFocusCoordinates = null;
    territoryPendingFocusSkipReveal = skipReveal;
    return true;
  }

  territoryPendingFocusStateCode = null;
  territoryPendingFocusCoordinates = null;
  territoryPendingFocusSkipReveal = false;
  if (!skipReveal && !territoryPendingRevealCenter) {
    armTerritoryStateReveal(stateCode);
  }
  territoryViewportFramed = true;
  focusTerritoryMapOnState(territoryMap, stateCode);
  finishTerritoryMapFocus(territoryMap, { skipReveal });
  return true;
}

function getTerritoryMapViewportBounds() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || typeof territoryMap.getBounds !== "function") return null;

  const bounds = territoryMap.getBounds();
  if (!bounds) return null;

  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  if (![west, east, south, north].every(Number.isFinite) || !(east > west) || !(north > south)) {
    return null;
  }

  return { west, east, south, north };
}

function getTerritoryMapSearchBounds(longitude, latitude, radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES) {
  const sharedBounds = window.WefranchRadiusControl?.getCoordinateRadiusBounds?.(
    longitude,
    latitude,
    radiusMiles
  );
  if (sharedBounds) return sharedBounds;

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

function focusTerritoryMapOnSearchArea(
  longitude,
  latitude,
  radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES,
  { skipReveal = false } = {}
) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !window.mapboxgl) return;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  const { west, east, south, north } = getTerritoryMapSearchBounds(longitude, latitude, radiusMiles);
  territoryViewportFramed = true;
  focusTerritoryMapOnBounds(
    territoryMap,
    new mapboxgl.LngLatBounds([west, south], [east, north])
  );
  territoryMap.once("moveend", () => {
    captureTerritoryFilterDefaultViewFromMap(territoryMap);
    if (!skipReveal) {
      window.territoryFilters?.captureViewportFromMap?.();
      playPendingTerritoryReveal();
    }
    updateTerritoryMapResetVisibility();
  });
}

function focusTerritoryCoordinates(
  longitude,
  latitude,
  radiusMiles = TERRITORY_MAP_SEARCH_RADIUS_MILES,
  { skipReveal = false } = {}
) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;

  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryMapHasLoaded) {
    territoryPendingFocusCoordinates = { longitude, latitude, radiusMiles, skipReveal };
    territoryPendingFocusStateCode = null;
    return true;
  }

  territoryPendingFocusCoordinates = null;
  territoryPendingFocusStateCode = null;
  territoryPendingFocusSkipReveal = false;
  focusTerritoryMapOnSearchArea(longitude, latitude, radiusMiles, { skipReveal });
  return true;
}

window.territoryMapControls = {
  setTerritoryBordersVisible,
  getTerritoryBordersVisible,
  setTerritoryBorderColorMode,
  getTerritoryBorderColorMode,
  setTerritoryColorMode,
  getTerritoryColorMode,
  setTerritoryDensityEnabled,
  getTerritoryDensityEnabled,
  setTerritoryPastelColorsEnabled,
  getTerritoryPastelColorsEnabled,
  getTerritoryBrandPaintColor,
  getTerritoryPreviewBrandFillColor,
  getTerritoryPreviewBrandLineColor,
  getTerritoryPreviewFillOpacity,
  getTerritoryPreviewLineOpacity,
  getTerritoryShapeMaxVisible: () => TERRITORY_SHAPE_MAX_VISIBLE,
  setTerritoryBrandLogosVisible,
  getTerritoryBrandLogosVisible,
  setTerritoryRadiusFilter,
  triggerTerritoryGeolocation,
  focusTerritoryState,
  focusTerritoryCoordinates,
  getStateCodeForCoordinates,
  getViewportBounds: getTerritoryMapViewportBounds,
  getSearchViewportBounds: getTerritoryMapSearchBounds,
  armLocationReveal: armTerritoryLocationReveal,
  armStateReveal: armTerritoryStateReveal,
  armStatesReveal: armTerritoryStatesReveal,
  skipNextFilterFit: () => {
    territorySkipNextFilterFit = true;
  },
  markViewportFramed: () => {
    territoryViewportFramed = true;
  },
  markViewportUnframed: () => {
    territoryViewportFramed = false;
  },
  updateResetVisibility: updateTerritoryMapResetVisibility,
  clearHover: () => clearTerritoryMapHover?.(),
  beginResultsLoading: beginTerritoryResultsLoading,
  endResultsLoading: endTerritoryResultsLoading,
  notifyListEnterStarted: notifyTerritoryListEnterStarted
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
  getTerritoryRegistry: () => territoryRegistry,
  resolveLocationTarget: resolveLocationMatchTarget,
  recordMatchesLocationTarget,
  createRadiusMatchContext,
  recordIntersectsRadius,
  createViewportMatchContext,
  recordIntersectsViewport
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
