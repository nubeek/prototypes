const TERRITORY_MAP_STYLE = window.CST_ENV?.MAPBOX_STYLE || "mapbox://styles/nubeek/cka7zizn720s71iogpmkvmw5z";
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
const TERRITORY_FOCUS_PADDING = 100;
const TERRITORY_FOCUS_MAX_ZOOM = 5.00;
const TERRITORY_FOCUS_DURATION = 1000;
const TERRITORY_FOCUS_FLY_CURVE = 1.62;
const TERRITORY_STATES_URL = "data/us-states.geojson";
const TERRITORY_BRAND_FILES = [
  "planet-fitness.json",
  "subway.json",
  "chick-fil-a.json",
  "dunkin.json",
  "mcdonalds.json",
  "burger-king.json",
  "7eleven.json",
  "remax.json",
  "dominos.json",
  "ups.json"
];
const TERRITORY_FILL_OPACITY = 0.15;
const TERRITORY_FILL_HOVER_OPACITY = 0.3;
const TERRITORY_LINE_OPACITY = 0.5;
const TERRITORY_LINE_WIDTH = 2;
const TERRITORY_SHARED_FILL_OPACITY = 0.28;
const TERRITORY_SHARED_OUTLINE_STEPS = 24;
const TERRITORY_SHARED_IMAGE_BASE_WIDTH = 1024;
const TERRITORY_SHARED_IMAGE_MAX_DIM = 1600;
const TERRITORY_LOGO_MIN_SIZE = 24;
const TERRITORY_LOGO_MAX_SIZE = 42;
const TERRITORY_LOGO_SHARED_GAP = 4;
const TERRITORY_LOGO_CORNER_RADIUS_RATIO = 10 / 42;
const TERRITORY_LOGO_BORDER_COLOR = "#e7e7e7";
const TERRITORY_LOGO_ZOOM_MIN = 3;
const TERRITORY_LOGO_ZOOM_MAX = 8;
const TERRITORY_BLEND_PX_PER_DEGREE = 44;
// Blur is defined as a geographic distance (degrees of longitude) rather than a
// fixed pixel radius, so the color intensity of the blend stays consistent
// regardless of how large the rendered bounding box is (i.e. whether or not
// far-flung territories like Alaska/Hawaii are visible).
const TERRITORY_BLEND_BLUR_DEGREES = 1.15;
const TERRITORY_BLEND_MAX_DIM = 4096;
const TERRITORY_BLEND_OPACITY = 0.45;
const TERRITORY_BLEND_HOVER_OPACITY = 0.3;
const TERRITORY_BLEND_SOURCE_ID = "territories-blend";
const TERRITORY_BLEND_LAYER_ID = "territories-blend-layer";
const TERRITORY_BLEND_RENDER_DELAY = 120;
const TERRITORY_BLEND_CLIP_TO_LAND = true;
const TERRITORY_FILL_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  TERRITORY_FILL_HOVER_OPACITY,
  TERRITORY_FILL_OPACITY
];
const TERRITORY_BLEND_FILL_OPACITY_EXPRESSION = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  TERRITORY_BLEND_HOVER_OPACITY,
  0
];
const brandLogoMetaById = new Map();
const territoryLineLayerIds = [];
const territoryBrandLayerIds = new Map();
const territoryBrandLogoInfo = new Map();
const territorySharedLayerIdsByState = new Map();
let territoryBordersEnabled = true;
let territoryBlendEnabled = false;
let territoryBrandLogosEnabled = true;
let territoryBrands = [];
let territoryBrandsById = new Map();
let territoryRegistry = [];
let territoryStateOccupancy = new Map();
let territorySharedStates = [];
let territoryStatesByCode = new Map();
let territoryLastMatchingRecords = null;
let territoryBlendRenderTimer = null;
let territoryBlendBeforeLayerId = null;
// While true, freshly added territory layers are filtered to render nothing so
// the map can show as an empty (but zoomed) base while data streams in. The
// real filters applied on data-ready reveal every territory at once.
let territoryHoldInitialRender = true;
const TERRITORY_HOLD_FILTER = ["==", ["get", "state"], "__territory_hold__"];
let clearTerritoryMapHover = null;
let hoveredSharedBlendStateCode = null;

const TERRITORY_STATUS_LABELS = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold"
};

function formatTerritoryStatus(status) {
  return TERRITORY_STATUS_LABELS[status] || status.replace(/^\w/, (char) => char.toUpperCase());
}

const TERRITORY_MAP_LOADING_FADE_MS = 240;
const TERRITORY_MAP_RESET_FADE_MS = 240;
const TERRITORY_MAP_VIEW_RESET_ZOOM_TOLERANCE = 0.05;
const TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE = 0.05;
const TERRITORY_MAP_RESET_TOP_OFFSET = 32;
let territoryMapResetHideTimer = null;
let territoryMapResetPositionObserver = null;

function getTerritoryMapContainerElement() {
  return document.getElementById("territoryMap");
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

function isTerritoryMapAtDefaultView(territoryMap) {
  if (!territoryMap) return true;

  const center = territoryMap.getCenter();
  const zoom = territoryMap.getZoom();

  return Math.abs(zoom - TERRITORY_MAP_ZOOM) < TERRITORY_MAP_VIEW_RESET_ZOOM_TOLERANCE
    && Math.abs(center.lng - TERRITORY_MAP_CENTER[0]) < TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE
    && Math.abs(center.lat - TERRITORY_MAP_CENTER[1]) < TERRITORY_MAP_VIEW_RESET_CENTER_TOLERANCE;
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

function hideTerritoryMapReset() {
  const resetEl = getTerritoryMapResetElement();
  if (!resetEl || resetEl.hidden || !resetEl.classList.contains("is-visible")) {
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
  if (!territoryMap) return;

  const shouldShow = !isTerritoryMapLoadingVisible()
    && territoryMap.isStyleLoaded()
    && !isTerritoryMapAtDefaultView(territoryMap);

  if (shouldShow) {
    showTerritoryMapReset();
  } else {
    hideTerritoryMapReset();
  }
}

function resetTerritoryMapView() {
  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  territoryMap.flyTo({
    center: TERRITORY_MAP_CENTER,
    zoom: TERRITORY_MAP_ZOOM,
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

function revealTerritoryMapBase() {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl) return;
  loadingEl.classList.add("is-map-revealed");
}

function hideTerritoryMapLoading(onHidden) {
  const loadingEl = getTerritoryMapLoadingElement();
  if (!loadingEl || loadingEl.hidden) {
    onHidden?.();
    return;
  }

  loadingEl.classList.add("is-hiding");
  loadingEl.setAttribute("aria-busy", "false");

  window.setTimeout(() => {
    loadingEl.hidden = true;
    loadingEl.classList.remove("is-hiding");
    updateTerritoryMapResetVisibility();
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

  const renderSharedTerritoryTooltipContent = (tooltip, stateCode, properties) => {
    const brands = getVisibleOccupantBrandsForState(stateCode);
    if (!brands.length) return false;

    const territoryName = properties.stateName
      || territoryStatesByCode.get(stateCode)?.properties?.name
      || stateCode;
    const records = getTerritoryRecordsForState(stateCode);
    const statuses = [...new Set(records.map((record) => formatTerritoryStatus(record.status)).filter(Boolean))];

    const logosRow = document.createElement("div");
    logosRow.className = "territory-map-tooltip-logos";

    brands.forEach((brandInfo) => {
      if (!brandInfo.logo) return;

      const logoEl = document.createElement("img");
      logoEl.className = "territory-map-tooltip-logo";
      logoEl.src = brandInfo.logo;
      logoEl.alt = `${brandInfo.brand} logo`;
      logosRow.append(logoEl);
    });

    if (logosRow.childElementCount) {
      tooltip.append(logosRow);
    }

    const title = document.createElement("div");
    title.className = "map-point-tooltip-title";
    title.textContent = brands.map((brandInfo) => brandInfo.brand).join(", ");
    tooltip.append(title);

    if (territoryName) {
      const territory = document.createElement("div");
      territory.className = "map-point-tooltip-detail";
      territory.textContent = territoryName;
      tooltip.append(territory);
    }

    if (statuses.length && (brands.length || territoryName)) {
      const divider = document.createElement("div");
      divider.className = "map-point-tooltip-divider";
      divider.setAttribute("aria-hidden", "true");
      tooltip.append(divider);
    }

    if (statuses.length) {
      const statusLine = document.createElement("div");
      statusLine.className = "map-point-tooltip-detail";
      statusLine.textContent = statuses.join(", ");
      tooltip.append(statusLine);
    }

    return true;
  };

  const renderTooltipContent = (feature) => {
    const tooltip = getTooltip();
    const properties = feature.properties || {};
    const stateCode = getStateCodeFromMapFeature(feature);

    tooltip.replaceChildren();

    if (stateCode && isSharedTerritoryState(stateCode)) {
      renderSharedTerritoryTooltipContent(tooltip, stateCode, properties);
      return;
    }

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

function getStateCodeFromMapFeature(feature) {
  const stateFromProperties = feature.properties?.state;
  if (stateFromProperties) return stateFromProperties;

  const layerId = feature.layer?.id || "";
  const sharedMatch = layerId.match(/^territories-shared-([A-Z]{2})-/);
  return sharedMatch?.[1] || null;
}

function getTerritoryRecordsForState(stateCode) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  return matchingRecords.filter((record) => record.state === stateCode);
}

function getVisibleOccupantsForState(stateCode) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
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

function focusTerritoryMapOnState(territoryMap, stateCode) {
  if (!territoryMap || !stateCode || !window.mapboxgl) return;

  const stateFeature = territoryStatesByCode.get(stateCode);
  if (!stateFeature?.geometry) return;

  const geometryBounds = getGeometryBounds(stateFeature.geometry);
  if (!geometryBounds) return;

  const { west, east, south, north } = geometryBounds;
  const bounds = new mapboxgl.LngLatBounds([west, south], [east, north]);
  const currentZoom = territoryMap.getZoom();
  const camera = territoryMap.cameraForBounds(bounds, {
    padding: TERRITORY_FOCUS_PADDING,
    maxZoom: TERRITORY_FOCUS_MAX_ZOOM
  });

  if (!camera) return;

  let targetZoom = Math.min(camera.zoom, TERRITORY_FOCUS_MAX_ZOOM);

  if (currentZoom <= TERRITORY_FOCUS_MAX_ZOOM) {
    targetZoom = Math.max(targetZoom, currentZoom);
  }

  territoryMap.flyTo({
    center: camera.center,
    zoom: targetZoom,
    duration: TERRITORY_FOCUS_DURATION,
    curve: TERRITORY_FOCUS_FLY_CURVE,
    essential: true
  });
}

function clearSharedTerritoryBlendHover(territoryMap) {
  if (!hoveredSharedBlendStateCode || !territoryMap) return;

  const layerIds = territorySharedLayerIdsByState.get(hoveredSharedBlendStateCode);
  if (layerIds?.fillLayerId && territoryMap.getLayer(layerIds.fillLayerId)) {
    territoryMap.setLayoutProperty(layerIds.fillLayerId, "visibility", "none");
  }

  hoveredSharedBlendStateCode = null;
}

function setSharedTerritoryBlendHover(territoryMap, stateCode) {
  const layerIds = territorySharedLayerIdsByState.get(stateCode);
  if (!layerIds?.fillLayerId || !territoryMap.getLayer(layerIds.fillLayerId)) return false;

  if (hoveredSharedBlendStateCode === stateCode) return true;

  clearSharedTerritoryBlendHover(territoryMap);
  territoryMap.setPaintProperty(layerIds.fillLayerId, "raster-opacity", TERRITORY_BLEND_HOVER_OPACITY);
  territoryMap.setLayoutProperty(layerIds.fillLayerId, "visibility", "visible");
  hoveredSharedBlendStateCode = stateCode;
  return true;
}

function bindTerritoryHoverInteractions(territoryMap, interactiveLayerIds, clickLayerIds = interactiveLayerIds) {
  if (!interactiveLayerIds.length && !clickLayerIds.length) return;

  const tooltip = createTerritoryTooltipController(territoryMap);
  let hoveredFeatureKey = null;
  let hoveredFeatureState = null;

  const clearHoveredFeatureState = () => {
    if (hoveredFeatureState) {
      territoryMap.setFeatureState(hoveredFeatureState, { hover: false });
      hoveredFeatureState = null;
    }

    clearSharedTerritoryBlendHover(territoryMap);
  };

  const setHoveredFeatureState = (feature) => {
    const stateCode = getStateCodeFromMapFeature(feature);

    if (stateCode && isSharedTerritoryState(stateCode) && territoryBlendEnabled) {
      const nextKey = `shared-blend-${stateCode}`;
      if (hoveredFeatureKey === nextKey) return;

      clearHoveredFeatureState();
      if (setSharedTerritoryBlendHover(territoryMap, stateCode)) {
        hoveredFeatureKey = nextKey;
      }
      return;
    }

    const brandId = feature.properties?.brandId;
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
    const features = territoryMap.queryRenderedFeatures(event.point, { layers: interactiveLayerIds });
    const feature = features[0];

    if (!feature) {
      clearHover();
      return;
    }

    territoryMap.getCanvas().style.cursor = "pointer";
    setHoveredFeatureState(feature);
    tooltip.show(feature, event.lngLat);
  });

  territoryMap.on("mouseleave", clearHover);

  if (!clickLayerIds.length) return;

  territoryMap.on("click", (event) => {
    const features = territoryMap.queryRenderedFeatures(event.point, { layers: clickLayerIds });
    const feature = features[0];
    if (!feature) return;

    const stateCode = getStateCodeFromMapFeature(feature);
    if (stateCode) {
      focusTerritoryMapOnState(territoryMap, stateCode);
    }
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

function getTerritoryInvestment(brand, territory) {
  return territory.initialInvestment || brand.initialInvestment || { min: 0, max: 0 };
}

function getTerritoryProperties(brand, territory) {
  const investment = getTerritoryInvestment(brand, territory);

  return {
    brandId: brand.id,
    brand: brand.brand,
    category: brand.category || "",
    color: brand.color,
    logo: brand.logo || "",
    status: territory.status,
    state: territory.state,
    stateName: territory.name,
    franchiseeRating: brand.franchiseeRating ?? 0,
    investmentMin: investment.min,
    investmentMax: investment.max
  };
}

function buildTerritoryRegistry(brands) {
  return brands.flatMap((brand) => brand.territories.map((territory) => ({
    brandId: brand.id,
    brand: brand.brand,
    category: brand.category || "",
    franchiseeRating: brand.franchiseeRating ?? 0,
    state: territory.state,
    name: territory.name,
    status: territory.status,
    initialInvestment: getTerritoryInvestment(brand, territory)
  })));
}

function territoryRecordKey(record) {
  return `${record.brandId}:${record.state}`;
}

function buildStateVisibilityFilter(states) {
  if (!states.length) {
    return ["==", ["get", "state"], ""];
  }

  return ["in", ["get", "state"], ["literal", states]];
}

function getVisibleStatesForBrand(matchingKeys, brandId) {
  const visibleStates = [];

  territoryRegistry.forEach((record) => {
    if (record.brandId !== brandId) return;
    if (!matchingKeys.has(territoryRecordKey(record))) return;

    const occupants = territoryStateOccupancy.get(record.state) || [];
    const visibleOccupants = occupants.filter((occupantId) => (
      matchingKeys.has(`${occupantId}:${record.state}`)
    ));

    if (visibleOccupants.length >= 2) return;

    visibleStates.push(record.state);
  });

  return visibleStates;
}

function getVisibleLogoStatesForBrand(matchingKeys, brandId) {
  const visibleStates = [];

  territoryRegistry.forEach((record) => {
    if (record.brandId !== brandId) return;
    if (!matchingKeys.has(territoryRecordKey(record))) return;

    visibleStates.push(record.state);
  });

  return visibleStates;
}

function getVisibleSharedOccupantCount(stateCode) {
  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
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

function updateBrandLogoOffsets(territoryMap, brandId, visibleOccupantsByState) {
  const logoInfo = territoryBrandLogoInfo.get(brandId);
  if (!logoInfo) return;

  let hasChanged = false;

  logoInfo.collection.features.forEach((feature) => {
    const stateCode = feature.properties.state;
    const visibleOccupants = visibleOccupantsByState.get(stateCode) || [];
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

function updateSharedTerritoryGradient(territoryMap, stateCode, visibleOccupants) {
  const layerIds = territorySharedLayerIdsByState.get(stateCode);
  if (!layerIds) return;

  const nextKey = visibleOccupants.join(",");
  if (layerIds.currentKey === nextKey) return;

  const colors = getOccupantColors(visibleOccupants, territoryBrandsById);
  if (colors.length < 2) return;

  const images = buildSharedTerritoryGradientImages(layerIds.geometry, colors);
  const outlineCollection = buildSharedTerritoryOutlineFeatureCollection(layerIds.geometry, colors);
  if (!images) return;

  territoryMap.getSource(layerIds.fillSourceId)?.updateImage({
    url: images.fillDataUrl,
    coordinates: images.coordinates
  });
  territoryMap.getSource(layerIds.strokeSourceId)?.setData(outlineCollection);

  layerIds.currentKey = nextKey;
}

function applyTerritoryFilters(matchingRecords) {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length) return;

  territoryLastMatchingRecords = matchingRecords;

  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const visibleOccupantsByState = buildVisibleOccupantsByState(matchingKeys);

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds) return;

    const visibleStates = getVisibleStatesForBrand(matchingKeys, brand.id);
    const fillFilter = buildStateVisibilityFilter(visibleStates);
    const logoFilter = buildStateVisibilityFilter(getVisibleLogoStatesForBrand(matchingKeys, brand.id));

    [layerIds.fillLayerId, layerIds.lineLayerId].forEach((layerId) => {
      if (!layerId || !territoryMap.getLayer(layerId)) return;
      territoryMap.setFilter(layerId, fillFilter);
    });

    if (layerIds.logoLayerId && territoryMap.getLayer(layerIds.logoLayerId)) {
      territoryMap.setFilter(layerIds.logoLayerId, logoFilter);
      updateBrandLogoOffsets(territoryMap, brand.id, visibleOccupantsByState);
    }
  });

  territorySharedStates.forEach((stateCode) => {
    const layerIds = territorySharedLayerIdsByState.get(stateCode);
    if (!layerIds) return;

    const visibleOccupants = visibleOccupantsByState.get(stateCode) || [];
    const isVisible = visibleOccupants.length >= 2;

    if (isVisible) {
      updateSharedTerritoryGradient(territoryMap, stateCode, visibleOccupants);
    }

    if (layerIds.fillLayerId && territoryMap.getLayer(layerIds.fillLayerId)) {
      const hoverVisible = territoryBlendEnabled && hoveredSharedBlendStateCode === stateCode;
      const fillVisible = (isVisible && !territoryBlendEnabled) || hoverVisible;
      if (hoverVisible) {
        territoryMap.setPaintProperty(layerIds.fillLayerId, "raster-opacity", TERRITORY_BLEND_HOVER_OPACITY);
      }
      territoryMap.setLayoutProperty(layerIds.fillLayerId, "visibility", fillVisible ? "visible" : "none");
    }

    if (layerIds.strokeLayerId && territoryMap.getLayer(layerIds.strokeLayerId)) {
      const strokeVisible = isVisible && territoryBordersEnabled;
      territoryMap.setLayoutProperty(layerIds.strokeLayerId, "visibility", strokeVisible ? "visible" : "none");
    }

    if (layerIds.hitLayerId && territoryMap.getLayer(layerIds.hitLayerId)) {
      territoryMap.setLayoutProperty(layerIds.hitLayerId, "visibility", isVisible ? "visible" : "none");
    }
  });

  window.territoryFilters?.updateSummary?.(matchingRecords.length, territoryRegistry.length);

  if (territoryBlendEnabled) {
    scheduleTerritoryBlendRender();
  }
}

async function fetchTerritoryJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

function buildBrandFeatureCollection(brand, statesByCode) {
  const features = [];

  brand.territories.forEach((territory) => {
    const stateFeature = statesByCode.get(territory.state);
    if (!stateFeature) return;

    features.push({
      type: "Feature",
      id: territory.state,
      geometry: stateFeature.geometry,
      properties: getTerritoryProperties(brand, territory)
    });
  });

  return { type: "FeatureCollection", features };
}

function computeLogoOffset(visibleOccupants, brandId, imageWidth) {
  if (!visibleOccupants || visibleOccupants.length < 2) return [0, 0];

  const index = visibleOccupants.indexOf(brandId);
  if (index < 0) return [0, 0];

  const slot = TERRITORY_LOGO_MIN_SIZE + TERRITORY_LOGO_SHARED_GAP;
  const offsetPixels = (index - (visibleOccupants.length - 1) / 2) * slot;
  const offsetIcon = (offsetPixels * imageWidth) / TERRITORY_LOGO_MIN_SIZE;

  return [offsetIcon, 0];
}

function buildBrandLogoFeatureCollection(brand, statesByCode, stateOccupancy, imageWidth) {
  const features = [];

  brand.territories.forEach((territory) => {
    const stateFeature = statesByCode.get(territory.state);
    if (!stateFeature) return;

    const centroid = getTerritoryCentroid(stateFeature.geometry);
    if (!centroid) return;

    features.push({
      type: "Feature",
      id: territory.state,
      geometry: {
        type: "Point",
        coordinates: centroid
      },
      properties: {
        ...getTerritoryProperties(brand, territory),
        iconOffset: computeLogoOffset(stateOccupancy.get(territory.state), brand.id, imageWidth)
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
  const width = sourceImage.width;
  const height = sourceImage.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
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
    imageWidth: image.width,
    iconSize: buildTerritoryLogoIconSizeExpression(image.width)
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

function mercatorY(lat) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function inverseMercatorY(y) {
  return ((2 * Math.atan(Math.exp(y))) - (Math.PI / 2)) * (180 / Math.PI);
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
// round end-caps double-blend at partial opacity. Instead we quantize the
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

function buildSharedTerritoryGradientImages(geometry, colors) {
  const bounds = getGeometryBounds(geometry);
  if (!bounds) return null;

  const { west, east, south, north, polygons } = bounds;

  const mercNorth = mercatorY(north);
  const mercSouth = mercatorY(south);
  const lngSpan = east - west;
  const xSpanMerc = (lngSpan * Math.PI) / 180;
  const ySpanMerc = mercNorth - mercSouth;

  let width = TERRITORY_SHARED_IMAGE_BASE_WIDTH;
  let height = Math.round(width * (ySpanMerc / xSpanMerc));

  if (height > TERRITORY_SHARED_IMAGE_MAX_DIM) {
    width = Math.round(width * (TERRITORY_SHARED_IMAGE_MAX_DIM / height));
    height = TERRITORY_SHARED_IMAGE_MAX_DIM;
  }
  if (width > TERRITORY_SHARED_IMAGE_MAX_DIM) {
    height = Math.round(height * (TERRITORY_SHARED_IMAGE_MAX_DIM / width));
    width = TERRITORY_SHARED_IMAGE_MAX_DIM;
  }

  width = Math.max(2, width);
  height = Math.max(2, height);

  const projectX = (lng) => ((lng - west) / lngSpan) * width;
  const projectY = (lat) => ((mercNorth - mercatorY(lat)) / ySpanMerc) * height;

  const tracePath = (context) => {
    context.beginPath();
    polygons.forEach((rings) => rings.forEach((ring) => {
      ring.forEach(([lng, lat], index) => {
        const x = projectX(lng);
        const y = projectY(lat);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
    }));
  };

  const gradient = (context, opacity) => {
    const grad = context.createLinearGradient(0, 0, width, 0);
    const stopCount = colors.length;

    colors.forEach((color, index) => {
      const stop = stopCount > 1 ? index / (stopCount - 1) : 0;
      grad.addColorStop(stop, hexToRgba(color, opacity));
    });

    return grad;
  };

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = width;
  fillCanvas.height = height;
  const fillContext = fillCanvas.getContext("2d");
  tracePath(fillContext);
  fillContext.fillStyle = gradient(fillContext, TERRITORY_SHARED_FILL_OPACITY);
  fillContext.fill("evenodd");

  const coordinates = [
    [west, inverseMercatorY(mercNorth)],
    [east, inverseMercatorY(mercNorth)],
    [east, inverseMercatorY(mercSouth)],
    [west, inverseMercatorY(mercSouth)]
  ];

  return {
    coordinates,
    fillDataUrl: fillCanvas.toDataURL("image/png")
  };
}

function getOccupantColors(occupants, brandsById) {
  return occupants
    .map((occupantId) => brandsById.get(occupantId)?.color)
    .filter(Boolean);
}

function collectBlendStateEntries(matchingRecords) {
  const matchingKeys = new Set(matchingRecords.map(territoryRecordKey));
  const entries = [];

  territoryStateOccupancy.forEach((occupants, stateCode) => {
    const visibleOccupants = occupants.filter((occupantId) => (
      matchingKeys.has(`${occupantId}:${stateCode}`)
    ));
    if (!visibleOccupants.length) return;

    const stateFeature = territoryStatesByCode.get(stateCode);
    if (!stateFeature) return;

    const colors = getOccupantColors(visibleOccupants, territoryBrandsById);
    if (!colors.length) return;

    const bounds = getGeometryBounds(stateFeature.geometry);
    if (!bounds) return;

    entries.push({ geometry: stateFeature.geometry, bounds, colors });
  });

  return entries;
}

function traceGeometryOnContext(context, geometry, projectX, projectY) {
  const polygons = collectGeometryPolygons(geometry);

  polygons.forEach((rings) => rings.forEach((ring) => {
    ring.forEach(([lng, lat], index) => {
      const x = projectX(lng);
      const y = projectY(lat);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }));
}

// Clips the blurred blend so it stops sharply at the coastline. We build an
// opaque mask of every US state polygon, then keep only blend pixels that fall
// on land via a single destination-in composite.
function clipBlendToLandMask(blurContext, width, height, projectX, projectY) {
  if (!territoryStatesByCode.size) return;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext("2d");
  maskContext.fillStyle = "#000";

  territoryStatesByCode.forEach((stateFeature) => {
    if (!stateFeature?.geometry) return;
    maskContext.beginPath();
    traceGeometryOnContext(maskContext, stateFeature.geometry, projectX, projectY);
    maskContext.fill("evenodd");
  });

  const previousComposite = blurContext.globalCompositeOperation;
  blurContext.filter = "none";
  blurContext.globalCompositeOperation = "destination-in";
  blurContext.drawImage(maskCanvas, 0, 0);
  blurContext.globalCompositeOperation = previousComposite;
}

// Unwraps longitudes that cross the antimeridian. Every US state sits in the
// western hemisphere except Alaska's Aleutian Islands, which wrap past +180.
// Shifting those positive longitudes by -360 keeps Alaska contiguous so it does
// not balloon the blend bounding box to a full ~360 degrees wide.
function normalizeBlendLng(lng) {
  return lng > 0 ? lng - 360 : lng;
}

function computeNormalizedBlendBounds(entries) {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  entries.forEach(({ geometry }) => {
    collectGeometryPolygons(geometry).forEach((rings) => rings.forEach((ring) => {
      ring.forEach(([lng, lat]) => {
        const normalizedLng = normalizeBlendLng(lng);
        if (normalizedLng < west) west = normalizedLng;
        if (normalizedLng > east) east = normalizedLng;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      });
    }));
  });

  return { west, east, south, north };
}

function buildTerritoryBlendImage(entries) {
  const degToMercX = (lng) => (lng * Math.PI) / 180;

  const { west, east, south, north } = computeNormalizedBlendBounds(entries);

  if (!(east > west) || !(north > south)) return null;

  let mercWest = degToMercX(west);
  let mercEast = degToMercX(east);
  let mercNorth = mercatorY(north);
  let mercSouth = mercatorY(south);

  let scale = ((east - west) * TERRITORY_BLEND_PX_PER_DEGREE) / (mercEast - mercWest);
  const rawWidth = (mercEast - mercWest) * scale;
  const rawHeight = (mercNorth - mercSouth) * scale;
  const largestDim = Math.max(rawWidth, rawHeight);

  if (largestDim > TERRITORY_BLEND_MAX_DIM) {
    scale *= TERRITORY_BLEND_MAX_DIM / largestDim;
  }

  // Convert the geographic blur distance into pixels for the current scale so a
  // downscaled (clamped) canvas keeps the same relative softness and intensity.
  const pxPerDegree = (scale * Math.PI) / 180;
  const blurPx = TERRITORY_BLEND_BLUR_DEGREES * pxPerDegree;

  const padMerc = (blurPx * 2.5) / scale;
  mercWest -= padMerc;
  mercEast += padMerc;
  mercNorth += padMerc;
  mercSouth -= padMerc;

  const width = Math.max(2, Math.round((mercEast - mercWest) * scale));
  const height = Math.max(2, Math.round((mercNorth - mercSouth) * scale));

  const projectX = (lng) => (degToMercX(normalizeBlendLng(lng)) - mercWest) * scale;
  const projectY = (lat) => (mercNorth - mercatorY(lat)) * scale;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorContext = colorCanvas.getContext("2d");

  entries.forEach(({ geometry, bounds, colors }) => {
    colorContext.beginPath();
    traceGeometryOnContext(colorContext, geometry, projectX, projectY);

    if (colors.length === 1) {
      colorContext.fillStyle = colors[0];
    } else {
      const gradient = colorContext.createLinearGradient(
        projectX(bounds.west), 0,
        projectX(bounds.east), 0
      );
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      colorContext.fillStyle = gradient;
    }

    colorContext.fill("evenodd");
  });

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurContext = blurCanvas.getContext("2d");
  blurContext.filter = `blur(${blurPx}px)`;
  blurContext.drawImage(colorCanvas, 0, 0);

  if (TERRITORY_BLEND_CLIP_TO_LAND) {
    clipBlendToLandMask(blurContext, width, height, projectX, projectY);
  }

  const mercToLng = (merc) => (merc * 180) / Math.PI;
  const coordinates = [
    [mercToLng(mercWest), inverseMercatorY(mercNorth)],
    [mercToLng(mercEast), inverseMercatorY(mercNorth)],
    [mercToLng(mercEast), inverseMercatorY(mercSouth)],
    [mercToLng(mercWest), inverseMercatorY(mercSouth)]
  ];

  return {
    coordinates,
    dataUrl: blurCanvas.toDataURL("image/png")
  };
}

function renderTerritoryBlendImage() {
  const territoryMap = window.territoryMap;
  if (!territoryMap || !territoryBrands.length || !territoryBlendEnabled) return;

  const matchingRecords = territoryLastMatchingRecords || territoryRegistry;
  const entries = collectBlendStateEntries(matchingRecords);
  const existingLayer = territoryMap.getLayer(TERRITORY_BLEND_LAYER_ID);

  if (!entries.length) {
    if (existingLayer) {
      territoryMap.setLayoutProperty(TERRITORY_BLEND_LAYER_ID, "visibility", "none");
    }
    return;
  }

  const image = buildTerritoryBlendImage(entries);
  if (!image) return;

  const existingSource = territoryMap.getSource(TERRITORY_BLEND_SOURCE_ID);

  if (existingSource) {
    existingSource.updateImage({
      url: image.dataUrl,
      coordinates: image.coordinates
    });
  } else {
    territoryMap.addSource(TERRITORY_BLEND_SOURCE_ID, {
      type: "image",
      url: image.dataUrl,
      coordinates: image.coordinates
    });

    territoryMap.addLayer({
      id: TERRITORY_BLEND_LAYER_ID,
      type: "raster",
      source: TERRITORY_BLEND_SOURCE_ID,
      paint: {
        "raster-opacity": TERRITORY_BLEND_OPACITY,
        "raster-fade-duration": 0,
        "raster-resampling": "linear"
      }
    }, territoryBlendBeforeLayerId || undefined);
  }

  territoryMap.setLayoutProperty(TERRITORY_BLEND_LAYER_ID, "visibility", "visible");
}

function scheduleTerritoryBlendRender() {
  if (territoryBlendRenderTimer) {
    window.clearTimeout(territoryBlendRenderTimer);
  }

  territoryBlendRenderTimer = window.setTimeout(() => {
    territoryBlendRenderTimer = null;
    renderTerritoryBlendImage();
  }, TERRITORY_BLEND_RENDER_DELAY);
}

function addSharedTerritoryLayers(territoryMap, sharedStates, stateOccupancy, brandsById, statesByCode, beforeLayerId) {
  sharedStates.forEach((stateCode) => {
    const occupants = stateOccupancy.get(stateCode);
    if (!occupants || occupants.length < 2) return;

    const stateFeature = statesByCode.get(stateCode);
    if (!stateFeature) return;

    const colors = getOccupantColors(occupants, brandsById);
    if (colors.length < 2) return;

    const images = buildSharedTerritoryGradientImages(stateFeature.geometry, colors);
    const outlineCollection = buildSharedTerritoryOutlineFeatureCollection(stateFeature.geometry, colors);
    if (!images) return;

    const baseId = `territories-shared-${stateCode}`;
    const fillSourceId = `${baseId}-fill`;
    const fillLayerId = `${fillSourceId}-layer`;
    const strokeSourceId = `${baseId}-stroke`;
    const strokeLayerId = `${strokeSourceId}-layer`;
    const hitSourceId = `${baseId}-hit`;
    const hitLayerId = `${hitSourceId}-layer`;

    territoryMap.addSource(fillSourceId, {
      type: "image",
      url: images.fillDataUrl,
      coordinates: images.coordinates
    });

    territoryMap.addLayer({
      id: fillLayerId,
      type: "raster",
      source: fillSourceId,
      paint: {
        "raster-opacity": 1,
        "raster-fade-duration": 0,
        "raster-resampling": "linear"
      }
    }, beforeLayerId || undefined);

    territoryMap.addSource(strokeSourceId, {
      type: "geojson",
      data: outlineCollection
    });

    territoryMap.addLayer({
      id: strokeLayerId,
      type: "line",
      source: strokeSourceId,
      paint: {
        "line-color": ["get", "color"],
        "line-opacity": TERRITORY_LINE_OPACITY,
        "line-width": TERRITORY_LINE_WIDTH
      },
      layout: {
        "line-join": "round",
        "line-cap": "round"
      }
    }, beforeLayerId || undefined);

    territoryMap.addSource(hitSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          id: stateCode,
          geometry: stateFeature.geometry,
          properties: {
            state: stateCode,
            stateName: stateFeature.properties.name
          }
        }]
      },
      promoteId: "state"
    });

    territoryMap.addLayer({
      id: hitLayerId,
      type: "fill",
      source: hitSourceId,
      paint: {
        "fill-color": "#000000",
        "fill-opacity": 0
      }
    }, beforeLayerId || undefined);

    territoryLineLayerIds.push(strokeLayerId);
    territorySharedLayerIdsByState.set(stateCode, {
      fillLayerId,
      fillSourceId,
      strokeLayerId,
      strokeSourceId,
      hitLayerId,
      hitSourceId,
      geometry: stateFeature.geometry,
      currentKey: occupants.join(",")
    });

    if (!territoryBordersEnabled) {
      territoryMap.setLayoutProperty(strokeLayerId, "visibility", "none");
    }
  });
}

function addBrandTerritoryLayers(territoryMap, brand, featureCollection, logoFeatureCollection, logoMeta, excludeFilter) {
  const sourceId = `territories-${brand.id}`;
  const fillLayerId = `${sourceId}-fill`;
  const logoLayerId = `${sourceId}-logo`;

  territoryMap.addSource(sourceId, {
    type: "geojson",
    data: featureCollection,
    promoteId: "state"
  });

  const fillLayer = {
    id: fillLayerId,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": territoryBlendEnabled
        ? TERRITORY_BLEND_FILL_OPACITY_EXPRESSION
        : TERRITORY_FILL_OPACITY_EXPRESSION
    }
  };

  const lineLayerId = `${sourceId}-line`;
  const lineLayer = {
    id: lineLayerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": ["get", "color"],
      "line-opacity": TERRITORY_LINE_OPACITY,
      "line-width": TERRITORY_LINE_WIDTH
    }
  };

  if (excludeFilter) {
    fillLayer.filter = excludeFilter;
    lineLayer.filter = excludeFilter;
  }

  territoryMap.addLayer(fillLayer);
  territoryMap.addLayer(lineLayer);

  territoryLineLayerIds.push(lineLayerId);

  if (!territoryBordersEnabled) {
    territoryMap.setLayoutProperty(lineLayerId, "visibility", "none");
  }

  const layerIds = [fillLayerId];

  if (logoMeta && logoFeatureCollection.features.length) {
    const logoSourceId = `${sourceId}-logos`;

    territoryMap.addSource(logoSourceId, {
      type: "geojson",
      data: logoFeatureCollection,
      promoteId: "state"
    });

    territoryBrandLogoInfo.set(brand.id, {
      sourceId: logoSourceId,
      imageWidth: logoMeta.imageWidth,
      collection: logoFeatureCollection
    });

    territoryMap.addLayer({
      id: logoLayerId,
      type: "symbol",
      source: logoSourceId,
      layout: {
        "icon-image": logoMeta.imageId,
        "icon-size": logoMeta.iconSize,
        "icon-offset": ["coalesce", ["get", "iconOffset"], ["literal", [0, 0]]],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      }
    });

    if (!territoryBrandLogosEnabled) {
      territoryMap.setLayoutProperty(logoLayerId, "visibility", "none");
    }

    layerIds.push(logoLayerId);
  }

  territoryBrandLayerIds.set(brand.id, {
    fillLayerId,
    lineLayerId,
    logoLayerId: logoMeta && logoFeatureCollection.features.length ? logoLayerId : null
  });

  if (territoryHoldInitialRender) {
    [fillLayerId, lineLayerId, logoLayerId].forEach((layerId) => {
      if (layerId && territoryMap.getLayer(layerId)) {
        territoryMap.setFilter(layerId, TERRITORY_HOLD_FILTER);
      }
    });
  }

  return layerIds;
}

async function loadTerritoryData(territoryMap) {
  try {
    const [statesGeojson, ...brands] = await Promise.all([
      fetchTerritoryJson(TERRITORY_STATES_URL),
      ...TERRITORY_BRAND_FILES.map((file) => fetchTerritoryJson(`data/${file}`))
    ]);

    const statesByCode = new Map(
      statesGeojson.features.map((feature) => [feature.properties.code, feature])
    );

    const stateOccupancy = new Map();
    brands.forEach((brand) => {
      brand.territories.forEach((territory) => {
        if (!stateOccupancy.has(territory.state)) {
          stateOccupancy.set(territory.state, []);
        }
        stateOccupancy.get(territory.state).push(brand.id);
      });
    });

    const sharedStates = [...stateOccupancy.entries()]
      .filter(([, occupants]) => occupants.length > 1)
      .map(([stateCode]) => stateCode);

    const excludeFilter = sharedStates.length
      ? ["!", ["in", ["get", "state"], ["literal", sharedStates]]]
      : null;

    const brandsById = new Map(brands.map((brand) => [brand.id, brand]));

    const interactiveLayerIds = [];
    let firstLogoLayerId = null;

    for (const brand of brands) {
      const featureCollection = buildBrandFeatureCollection(brand, statesByCode);
      const logoMeta = await loadBrandLogoImage(territoryMap, brand);
      const logoFeatureCollection = buildBrandLogoFeatureCollection(
        brand,
        statesByCode,
        stateOccupancy,
        logoMeta?.imageWidth || TERRITORY_LOGO_MIN_SIZE
      );
      interactiveLayerIds.push(
        ...addBrandTerritoryLayers(
          territoryMap,
          brand,
          featureCollection,
          logoFeatureCollection,
          logoMeta,
          excludeFilter
        )
      );

      if (!firstLogoLayerId) {
        const logoLayerId = `territories-${brand.id}-logo`;
        if (territoryMap.getLayer(logoLayerId)) {
          firstLogoLayerId = logoLayerId;
        }
      }
    }

    addSharedTerritoryLayers(
      territoryMap,
      sharedStates,
      stateOccupancy,
      brandsById,
      statesByCode,
      firstLogoLayerId
    );

    const sharedHitLayerIds = sharedStates
      .map((stateCode) => territorySharedLayerIdsByState.get(stateCode)?.hitLayerId)
      .filter(Boolean);

    const hoverLayerIds = [...interactiveLayerIds, ...sharedHitLayerIds];

    bindTerritoryHoverInteractions(
      territoryMap,
      hoverLayerIds,
      hoverLayerIds
    );

    territoryBrands = brands;
    territoryBrandsById = brandsById;
    territoryRegistry = buildTerritoryRegistry(brands);
    territoryStateOccupancy = stateOccupancy;
    territorySharedStates = sharedStates;
    territoryStatesByCode = statesByCode;
    territoryBlendBeforeLayerId = brands.length ? `territories-${brands[0].id}-fill` : null;
    window.territoryBrands = brands;

    // Releasing the hold before the filter pass lets applyTerritoryFilters
    // swap the hold filters for the real ones, revealing every territory in a
    // single frame instead of streaming them in brand by brand.
    territoryHoldInitialRender = false;
    window.territoryFilters?.onDataReady?.(brands, territoryRegistry);
    hideTerritoryMapLoading();
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

  const territoryMap = new mapboxgl.Map({
    container: "territoryMap",
    style: TERRITORY_MAP_STYLE,
    center: TERRITORY_MAP_CENTER,
    zoom: TERRITORY_MAP_ZOOM,
    projection: "mercator",
    logoPosition: "bottom-left",
    attributionControl: false,
    preserveDrawingBuffer: true
  });

  territoryMap.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    fitBoundsOptions: {
      zoom: TERRITORY_GEOLOCATE_ZOOM,
      maxZoom: TERRITORY_GEOLOCATE_ZOOM
    },
    trackUserLocation: false,
    showUserHeading: false
  }), "bottom-right");

  territoryMap.addControl(new mapboxgl.NavigationControl({
    visualizePitch: false
  }), "bottom-right");

  territoryMap.on("load", () => {
    revealTerritoryMapBase();
    bindTerritoryMapResetControl(territoryMap);
    loadTerritoryData(territoryMap);
  });

  window.territoryMap = territoryMap;
}

function setTerritoryBordersVisible(isVisible) {
  territoryBordersEnabled = isVisible;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  territoryLineLayerIds.forEach((layerId) => {
    if (!territoryMap.getLayer(layerId)) return;

    const isSharedStroke = territorySharedStates.some((stateCode) => (
      territorySharedLayerIdsByState.get(stateCode)?.strokeLayerId === layerId
    ));
    if (isSharedStroke) return;

    territoryMap.setLayoutProperty(layerId, "visibility", isVisible ? "visible" : "none");
  });

  territorySharedStates.forEach((stateCode) => {
    const layerIds = territorySharedLayerIdsByState.get(stateCode);
    if (!layerIds?.strokeLayerId || !territoryMap.getLayer(layerIds.strokeLayerId)) return;

    const sharedVisible = getVisibleSharedOccupantCount(stateCode) >= 2;
    territoryMap.setLayoutProperty(
      layerIds.strokeLayerId,
      "visibility",
      isVisible && sharedVisible ? "visible" : "none"
    );
  });
}

function getTerritoryBordersVisible() {
  return territoryBordersEnabled;
}

function setTerritoryBlendEnabled(isEnabled) {
  territoryBlendEnabled = isEnabled;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  if (!isEnabled) {
    clearSharedTerritoryBlendHover(territoryMap);
  }

  territoryBrands.forEach((brand) => {
    const layerIds = territoryBrandLayerIds.get(brand.id);
    if (!layerIds?.fillLayerId || !territoryMap.getLayer(layerIds.fillLayerId)) return;

    territoryMap.setPaintProperty(
      layerIds.fillLayerId,
      "fill-opacity",
      isEnabled ? TERRITORY_BLEND_FILL_OPACITY_EXPRESSION : TERRITORY_FILL_OPACITY_EXPRESSION
    );
  });

  if (!isEnabled && territoryMap.getLayer(TERRITORY_BLEND_LAYER_ID)) {
    territoryMap.setLayoutProperty(TERRITORY_BLEND_LAYER_ID, "visibility", "none");
  }

  // Re-apply the current filter state so shared-state gradient rasters swap
  // in/out correctly and the blend image re-renders for the visible records.
  if (territoryRegistry.length) {
    applyTerritoryFilters(territoryLastMatchingRecords || territoryRegistry);
  }
}

function getTerritoryBlendEnabled() {
  return territoryBlendEnabled;
}

function setTerritoryBrandLogosVisible(isVisible) {
  territoryBrandLogosEnabled = isVisible;

  const territoryMap = window.territoryMap;
  if (!territoryMap) return;

  territoryBrandLayerIds.forEach((layerIds) => {
    if (!layerIds.logoLayerId || !territoryMap.getLayer(layerIds.logoLayerId)) return;
    territoryMap.setLayoutProperty(layerIds.logoLayerId, "visibility", isVisible ? "visible" : "none");
  });
}

function getTerritoryBrandLogosVisible() {
  return territoryBrandLogosEnabled;
}

window.territoryMapControls = {
  setTerritoryBordersVisible,
  getTerritoryBordersVisible,
  setTerritoryBlendEnabled,
  getTerritoryBlendEnabled,
  setTerritoryBrandLogosVisible,
  getTerritoryBrandLogosVisible
};

window.territoryMapFilters = {
  applyTerritoryFilters,
  getTerritoryRegistry: () => territoryRegistry
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

if (!document.querySelector("[data-territory-crossroad]")) {
  startTerritoryMap();
}
