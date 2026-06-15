const ONE_PAGER_MAP_TOUR_START_CAMERA = {
  center: [-73.95, 40.72],
  zoom: 3.1,
  bearing: 0,
  pitch: 0
};
const ONE_PAGER_MAP_TOUR_END_CAMERA = {
  center: [-108.5, 32.78],
  zoom: ONE_PAGER_MAP_TOUR_START_CAMERA.zoom,
  bearing: 0,
  pitch: 0
};
const ONE_PAGER_MARKET_FILTER_CITIES = [
  "Denver, Colorado",
  "Nashville, Tennessee",
  "Phoenix, Arizona"
];
const ONE_PAGER_MARKET_FILTER_EXCLUDED_FRANCHISES = [
  "Anytime Fitness",
  "Crunch Fitness"
];
const ONE_PAGER_MARKET_FILTER_FINAL_RADIUS_MILES = 250;
const ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS = 900;
const ONE_PAGER_MARKET_FILTER_FADE_OUT_MS = 220;
const ONE_PAGER_MARKET_FILTER_FADE_IN_MS = 260;
const ONE_PAGER_MARKET_FILTER_LAYOUT_SWAP_DELAY_MS = 80;
const ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS =
  ONE_PAGER_MARKET_FILTER_FADE_OUT_MS +
  ONE_PAGER_MARKET_FILTER_LAYOUT_SWAP_DELAY_MS +
  ONE_PAGER_MARKET_FILTER_FADE_IN_MS +
  500;
const ONE_PAGER_MARKET_FILTER_CITY_STEP_DELAY_MS = 1500;
const ONE_PAGER_MARKET_FILTER_FRANCHISE_STEP_DELAY_MS = 700;
const ONE_PAGER_RADIUS_REFRESH_INTERVAL_MS = 80;
const PANEL_LAYOUT_TRANSITION_RESIZE_MS = 540;
const RADIUS_CIRCLE_FILL_OPACITY = 0.12;
const RADIUS_CIRCLE_LINE_OPACITY = 0.55;

let onePagerMapTourTimeout = null;
let onePagerMapTourReleaseTimeout = null;
let onePagerMapTourActive = false;
let onePagerMapTourRunId = 0;
let onePagerMapTourState = null;
let onePagerMarketFilterAnimationFrame = null;
let onePagerRadiusAnimationState = null;
let onePagerMarketFilterRunId = 0;
const onePagerMarketFilterTimeouts = new Set();
let panelLayoutResizeFrame = null;
let panelLayoutTransitionCleanup = null;
let onePagerRadiusSpotlightLabel = null;
let radiusCirclesVisible = false;

function getOnePagerRadiusSpotlightCenter() {
  if (!isOnePagerPresentation || !onePagerRadiusSpotlightLabel) return null;
  return getMapFilterLocationCenter(onePagerRadiusSpotlightLabel);
}

function scheduleOwnersMapResize() {
  if (!ownersMap || ownersMapResizeFrame !== null) return;

  ownersMapResizeFrame = requestAnimationFrame(() => {
    ownersMapResizeFrame = null;
    resizeOwnersMap();
  });
}

function ensureOwnersMapResizeObserver() {
  if (ownersMapResizeObserver || typeof ResizeObserver !== "function") return;

  const ownersMapContainer = document.getElementById("ownersMap");
  if (!ownersMapContainer) return;

  ownersMapResizeObserver = new ResizeObserver(() => {
    scheduleOwnersMapResize();
  });
  ownersMapResizeObserver.observe(ownersMapContainer);
}

function usesReducedMotion() {
  return reduceMotionEnabled;
}

function getMotionDelay(delay) {
  return usesReducedMotion() ? 0 : delay;
}

function getMapFilterLocationCenter(locationLabel) {
  if (!locationLabel) return null;

  const locationCenters = [];

  if (typeof OWNER_LOCATION_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_LOCATION_CENTERS);
  }

  if (typeof OWNER_HEADQUARTERS_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_HEADQUARTERS_CENTERS);
  }

  return locationCenters.find((location) => location.label === locationLabel) || null;
}

function getLocationDistanceMiles(location, center) {
  const latitudeDelta = (location.lat - center.lat) * Math.PI / 180;
  const longitudeDelta = (location.lng - center.lng) * Math.PI / 180;
  const locationLatitude = location.lat * Math.PI / 180;
  const centerLatitude = center.lat * Math.PI / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(locationLatitude) * Math.cos(centerLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 3958.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getSelectedRadiusCenters() {
  return selectedLocationLabels
    .map((label) => getMapFilterLocationCenter(label))
    .filter(Boolean);
}

function isRadiusFilterActive() {
  return radiusFilterEnabled && getSelectedRadiusCenters().length > 0;
}

function locationWithinSelectedRadius(location) {
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return false;

  return getSelectedRadiusCenters().some(
    (center) => getLocationDistanceMiles(location, center) <= selectedRadiusMiles
  );
}

function rowMatchesLocationFilter(row) {
  if (excludedLocationLabels.includes(row.location)) return false;

  if (isRadiusFilterActive()) {
    if (typeof row?.lat === "number" && typeof row?.lng === "number") {
      return locationWithinSelectedRadius(row);
    }
    return true;
  }

  if (selectedLocationLabels.length && !selectedLocationLabels.includes(row.location)) {
    return false;
  }

  return true;
}

function mapLocationMatchesSelectedFilter(location) {
  if (excludedLocationLabels.includes(location.label)) return false;

  if (isRadiusFilterActive()) {
    if (getOnePagerRadiusSpotlightCenter()) return true;
    return locationWithinSelectedRadius(location);
  }

  if (!selectedLocationLabels.length) return true;
  if (!selectedLocationLabels.includes(location.label)) return false;

  const selectedMapLocationCenter = getMapFilterLocationCenter(location.label);
  if (!selectedMapLocationCenter) return true;

  return getLocationDistanceMiles(location, selectedMapLocationCenter) <= MAP_LOCATION_FILTER_RADIUS_MILES;
}

function getMapPointFeatures(ownerIndex = activeMapOwnerIndex) {
  const radiusSpotlightCenter = getOnePagerRadiusSpotlightCenter();

  const selectedMapOwnerIndexes = selectedOwnerIndexes.length
    ? new Set(selectedOwnerIndexes.map(Number))
    : null;
  const excludedMapOwnerIndexes = excludedOwnerIndexes.length
    ? new Set(excludedOwnerIndexes.map(Number))
    : null;
  const filteredMapOwnerIndexes = ownerIndex === null
    ? new Set(getFilteredOwners().map((owner) => owner.originalIndex))
    : null;

  return (window.ownerLocationsData || [])
    .flatMap((owner, index) => {
      if (ownerIndex !== null && index !== ownerIndex) return [];
      if (filteredMapOwnerIndexes && !filteredMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && selectedMapOwnerIndexes?.size && !selectedMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && excludedMapOwnerIndexes?.has(index)) return [];

      return owner.locations
        .filter((location) => mapLocationMatchesSelectedFilter(location))
        .map((location) => ({
          type: "Feature",
          properties: {
            ownerIndex: index,
            ownerName: owner.ownerName,
            locationLabel: location.label,
            color: owner.color,
            isOutsideSpotlightRadius: Boolean(
              radiusSpotlightCenter &&
              getLocationDistanceMiles(location, radiusSpotlightCenter) > selectedRadiusMiles
            )
          },
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat]
          }
        }));
    });
}

function getMapPointFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: getMapPointFeatures()
  };
}

function getOwnerMapPointFeatureCollection(ownerIndex) {
  return {
    type: "FeatureCollection",
    features: getMapPointFeatures(ownerIndex)
  };
}

function createRadiusCircleFeature(center, radiusMiles, pointCount = 96) {
  const earthRadiusMiles = 3958.8;
  const centerLatitude = (center.lat * Math.PI) / 180;
  const centerLongitude = (center.lng * Math.PI) / 180;
  const angularDistance = radiusMiles / earthRadiusMiles;
  const ring = [];

  for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
    const bearing = (pointIndex / pointCount) * 2 * Math.PI;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
      Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLongitude = centerLongitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
      Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(pointLatitude)
    );

    ring.push([(pointLongitude * 180) / Math.PI, (pointLatitude * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    properties: { label: center.label },
    geometry: { type: "Polygon", coordinates: [ring] }
  };
}

function getRadiusCircleFeatureCollection() {
  if (!isRadiusFilterActive()) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: getSelectedRadiusCenters().map(
      (center) => createRadiusCircleFeature(center, selectedRadiusMiles)
    )
  };
}

function getVisibleMapCoordinates() {
  const coordinates = getMapPointFeatures().map((feature) => feature.geometry.coordinates);

  if (isRadiusFilterActive()) {
    getRadiusCircleFeatureCollection().features.forEach((feature) => {
      coordinates.push(...feature.geometry.coordinates[0]);
    });
  }

  return coordinates;
}

function fitOwnersMapToVisibleLocations({ durationMs = 1200, padding = MAP_FIT_PADDING, maxZoom = 9 } = {}) {
  if (!ownersMap || !window.mapboxgl) return;
  if (onePagerMapTourActive) return;
  if (!ownersMap.loaded()) {
    ownersMap.once("idle", () => fitOwnersMapToVisibleLocations());
    return;
  }

  const coordinates = getVisibleMapCoordinates();
  if (!coordinates.length) return;

  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate);
  });

  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    bounds.extend([lng - 0.35, lat - 0.35]);
    bounds.extend([lng + 0.35, lat + 0.35]);
  }

  ownersMap.fitBounds(bounds, {
    padding,
    duration: durationMs,
    maxZoom
  });
}

function fitMapToCoordinates(mapInstance, coordinates, padding = MAP_FIT_PADDING) {
  if (!mapInstance || !window.mapboxgl || !coordinates.length) return;

  const bounds = getMapBoundsForCoordinates(coordinates);

  mapInstance.fitBounds(bounds, {
    padding,
    duration: 420,
    maxZoom: 8.6
  });
}

function getMapBoundsForCoordinates(coordinates) {
  if (!window.mapboxgl || !coordinates.length) return null;

  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate);
  });

  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    bounds.extend([lng - 0.35, lat - 0.35]);
    bounds.extend([lng + 0.35, lat + 0.35]);
  }

  return bounds;
}

function syncMapLocationFilter() {
  syncOwnerMapHeader();

  if (!ownersMap?.getSource("owner-points")) return;
  ownersMap.getSource("owner-points").setData(getMapPointFeatureCollection());
  ownersMap.getSource("radius-circles")?.setData(getRadiusCircleFeatureCollection());

  if (ownersMap.getLayer("radius-circles-fill") && ownersMap.getLayer("radius-circles-outline")) {
    const shouldShowRadiusCircles = isRadiusFilterActive();
    if (shouldShowRadiusCircles !== radiusCirclesVisible) {
      ownersMap.setPaintProperty("radius-circles-fill", "fill-opacity", shouldShowRadiusCircles ? RADIUS_CIRCLE_FILL_OPACITY : 0);
      ownersMap.setPaintProperty("radius-circles-outline", "line-opacity", shouldShowRadiusCircles ? RADIUS_CIRCLE_LINE_OPACITY : 0);
      radiusCirclesVisible = shouldShowRadiusCircles;
    }
  }

  fitOwnersMapToVisibleLocations();
}

function getActiveSidebarOwnerIndex() {
  if (!card?.classList.contains("is-map-open")) return null;

  const mode = getCurrentPanelMode();
  if (mode === "raw") return activeRawOwnerIndex;
  if (mode === "org") return activeOrgOwnerIndex;
  if (mode === "details") return activeDetailOwnerIndex;
  return activeMapOwnerIndex;
}

function clearSidebarOwnerState() {
  activeMapOwnerIndex = null;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  globalRawDataViewOpen = false;
}

function resetPanelModeAfterClose(closingMode) {
  if (closingMode === "map" || !mapPanel || usesReducedMotion()) {
    setPanelMode("map");
    return;
  }

  const resetMode = (event) => {
    if (event && (event.target !== mapPanel || event.propertyName !== "transform")) return;

    mapPanel.removeEventListener("transitionend", resetMode);
    mapPanel.removeEventListener("transitioncancel", resetMode);

    if (!card?.classList.contains("is-map-open")) {
      setPanelMode("map");
    }
  };

  mapPanel.addEventListener("transitionend", resetMode);
  mapPanel.addEventListener("transitioncancel", resetMode);
}

function openSidebar(mode, ownerIndex = null, { scrollTable = false } = {}) {
  const owner = ownerIndex !== null
    ? owners.find((item) => item.originalIndex === ownerIndex)
    : null;
  if (mode === "details" && !owner) return;

  clearSidebarOwnerState();

  if (mode === "raw") {
    globalRawDataViewOpen = true;
    activeRawOwnerIndex = owner ? ownerIndex : null;
    openMapPanel("raw", { scrollTable: false });
    renderRawDataSidebar(activeRawOwnerIndex);
  } else if (mode === "org") {
    const hasOrgChart = owner ? Boolean(getOwnerOrgChart(ownerIndex)?.nodes?.length) : false;
    activeOrgOwnerIndex = hasOrgChart ? ownerIndex : null;
    if (hasOrgChart) {
      renderOwnerOrgChart(ownerIndex);
    } else {
      renderDefaultOrgChartState();
    }
    openMapPanel("org", { scrollTable });
  } else if (mode === "details") {
    activeDetailOwnerIndex = ownerIndex;
    renderOwnerDetails(owner);
    openMapPanel("details");
    initializeOwnerDetailsMap(ownerIndex);
  } else {
    activeMapOwnerIndex = owner ? ownerIndex : null;
    openMapPanel("map", { scrollTable });
  }

  syncMapLocationFilter();
  renderActiveTable();
  syncToolbarTabState(getCurrentPanelMode());
}

function closeSidebar() {
  const closingMode = getCurrentPanelMode();

  lockedToolbarMode = null;
  clearSidebarOwnerState();
  card?.classList.remove("is-map-open");
  mapToggle?.setAttribute("aria-expanded", "false");
  resetPanelModeAfterClose(closingMode);
  renderActiveTable();
  syncToolbarTabState(closingMode);
}

function handleToolbarTabClick(mode) {
  const isPanelOpen = card?.classList.contains("is-map-open");
  const currentMode = getCurrentPanelMode();

  if (isPanelOpen && currentMode === mode) {
    if (lockedToolbarMode === mode) {
      closeSidebar();
    } else {
      lockedToolbarMode = mode;
      syncToolbarTabState(currentMode);
    }
    return;
  }

  let carriedOwnerIndex = isPanelOpen ? getActiveSidebarOwnerIndex() : null;
  if (mode === "raw" && carriedOwnerIndex !== null) {
    const owner = owners.find((item) => item.originalIndex === carriedOwnerIndex);
    if (!isRawDataAvailable(owner)) {
      carriedOwnerIndex = null;
    }
  }

  lockedToolbarMode = mode;
  openSidebar(mode, carriedOwnerIndex);
}

function handleSidebarClose() {
  const currentMode = getCurrentPanelMode();

  if (lockedToolbarMode === currentMode) {
    openSidebar(currentMode, null);
    return;
  }

  closeSidebar();
}

function toggleRowSidebarView(mode, ownerIndex, { scrollTable = false } = {}) {
  const isOpenForOwner =
    card?.classList.contains("is-map-open") &&
    getCurrentPanelMode() === mode &&
    getActiveSidebarOwnerIndex() === ownerIndex;

  if (isOpenForOwner) {
    if (lockedToolbarMode === mode) {
      openSidebar(mode, null);
    } else {
      closeSidebar();
    }
    return;
  }

  if (lockedToolbarMode !== mode) {
    lockedToolbarMode = null;
  }
  openSidebar(mode, ownerIndex, { scrollTable });
}

function openOwnerDetailsFromHeader(ownerIndex) {
  lockedToolbarMode = null;
  openSidebar("details", ownerIndex);
}

function setPanelMode(mode) {
  if (!mapPanel || !ownerDetailsPanel) return;

  const usesDetailsPanel = mode === "details" || mode === "org" || mode === "raw";
  mapPanel.classList.toggle("is-details-mode", usesDetailsPanel);
  mapPanel.classList.toggle("is-org-mode", mode === "org");
  mapPanel.classList.toggle("is-raw-mode", mode === "raw");
  ownerDetailsPanel.hidden = !usesDetailsPanel;
  syncOwnerMapHeader(mode);
  syncToolbarTabState(mode);
}

function resizeOwnersMapDuringPanelLayoutTransition({ fitAfter = true } = {}) {
  if (!ownersMap) return;

  if (panelLayoutResizeFrame !== null) {
    window.cancelAnimationFrame(panelLayoutResizeFrame);
    panelLayoutResizeFrame = null;
  }

  const startTime = window.performance.now();
  const duration = getMotionDelay(PANEL_LAYOUT_TRANSITION_RESIZE_MS);

  const resizeTick = (now) => {
    resizeOwnersMap();

    if (now - startTime < duration) {
      panelLayoutResizeFrame = window.requestAnimationFrame(resizeTick);
      return;
    }

    panelLayoutResizeFrame = null;
    resizeOwnersMap();
    if (fitAfter && getCurrentPanelMode() === "map") {
      fitOwnersMapToVisibleLocations({ durationMs: 520 });
    }
  };

  panelLayoutResizeFrame = window.requestAnimationFrame(resizeTick);
}

function setPanelLayout(layout) {
  if (!card || !PANEL_LAYOUT_CLASSES[layout]) return;
  const isLayoutChange = currentPanelLayout !== layout;
  if (isLayoutChange) {
    card.classList.add("is-layout-switching");
  }

  currentPanelLayout = layout;
  Object.entries(PANEL_LAYOUT_CLASSES).forEach(([key, className]) => {
    card.classList.toggle(className, key === layout);
  });

  document.querySelectorAll(".toolbar-tab-layout-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === layout);
  });

  persistViewSettings();

  if (!card.classList.contains("is-map-open")) {
    card.classList.remove("is-layout-switching");
    panelLayoutTransitionCleanup?.();
    panelLayoutTransitionCleanup = null;
    return;
  }

  scheduleOwnersMapResize();
  syncStickyNameColumnDivider();

  if (isLayoutChange) {
    panelLayoutTransitionCleanup?.();
    resizeOwnersMapDuringPanelLayoutTransition();
    let isFinished = false;
    let fallbackTimeoutId = null;

    const cleanupLayoutSwitch = () => {
      mapPanel?.removeEventListener("transitionend", onLayoutTransitionEnd);
      mapPanel?.removeEventListener("transitioncancel", onLayoutTransitionEnd);
      window.clearTimeout(fallbackTimeoutId);
      if (panelLayoutTransitionCleanup === cleanupLayoutSwitch) {
        panelLayoutTransitionCleanup = null;
      }
    };
    const finishLayoutSwitch = () => {
      if (isFinished) return;
      isFinished = true;
      card.classList.remove("is-layout-switching");
      cleanupLayoutSwitch();
    };
    const onLayoutTransitionEnd = (event) => {
      if (event.target !== mapPanel || (event.propertyName !== "width" && event.propertyName !== "padding-left")) return;
      finishLayoutSwitch();
    };

    mapPanel?.addEventListener("transitionend", onLayoutTransitionEnd);
    mapPanel?.addEventListener("transitioncancel", onLayoutTransitionEnd);
    fallbackTimeoutId = window.setTimeout(finishLayoutSwitch, getMotionDelay(PANEL_LAYOUT_TRANSITION_RESIZE_MS + 80));
    panelLayoutTransitionCleanup = cleanupLayoutSwitch;
  }
}

function getCurrentPanelMode() {
  if (mapPanel?.classList.contains("is-raw-mode")) return "raw";
  if (mapPanel?.classList.contains("is-org-mode")) return "org";
  if (mapPanel?.classList.contains("is-details-mode")) return "details";
  return "map";
}

function syncToolbarTabButton(button, isOpen, isLocked) {
  if (!button) return;

  button.classList.toggle("is-expanded", isOpen);
  button.classList.toggle("is-active", isOpen && isLocked);
  button.setAttribute("aria-pressed", String(isOpen && isLocked));
}

function syncToolbarTabState(mode = getCurrentPanelMode()) {
  const isFilterOpen = card?.classList.contains("is-filter-open");
  const isPanelOpen = Boolean(card?.classList.contains("is-map-open"));

  filterToggle?.classList.toggle("is-active", Boolean(isFilterOpen));
  syncToolbarTabButton(mapToggle, isPanelOpen && mode === "map", lockedToolbarMode === "map");
  syncToolbarTabButton(orgChartToggle, isPanelOpen && mode === "org", lockedToolbarMode === "org");
  syncToolbarTabButton(contactsToggle, isPanelOpen && mode === "raw", lockedToolbarMode === "raw");
  closeToolbarTabDropdowns();
  syncOwnerHeaderViewState();
  persistViewSettings();
}

function closeToolbarTabDropdowns(exceptItem = null) {
  toolbarTabItems.forEach((item) => {
    if (item !== exceptItem) {
      clearToolbarTabOpenTimeout(item);
      clearToolbarTabCloseTimeout(item);
      item.classList.remove("is-open");
    }
  });
}

function clearToolbarTabOpenTimeout(item) {
  const timeoutId = toolbarTabOpenTimeoutByItem.get(item);
  if (typeof timeoutId === "number") {
    window.clearTimeout(timeoutId);
    toolbarTabOpenTimeoutByItem.delete(item);
  }
}

function clearToolbarTabCloseTimeout(item) {
  const timeoutId = toolbarTabCloseTimeoutByItem.get(item);
  if (typeof timeoutId === "number") {
    window.clearTimeout(timeoutId);
    toolbarTabCloseTimeoutByItem.delete(item);
  }
}

function scheduleToolbarTabDropdownOpen(item, delayMs = TOOLBAR_TAB_DROPDOWN_OPEN_DELAY_MS) {
  const tabButton = item.querySelector(".segmented-control-btn");
  clearToolbarTabCloseTimeout(item);
  clearToolbarTabOpenTimeout(item);
  if (!tabButton?.classList.contains("is-expanded")) return;
  if (item.classList.contains("is-open")) return;

  const timeoutId = window.setTimeout(() => {
    toolbarTabOpenTimeoutByItem.delete(item);
    closeToolbarTabDropdowns(item);
    if (tabButton.classList.contains("is-expanded") && item.matches(":hover")) {
      item.classList.add("is-open");
    }
  }, delayMs);
  toolbarTabOpenTimeoutByItem.set(item, timeoutId);
}

let panelTableScrollObserver = null;
let panelTableWidthCleanup = null;

function scrollTableToActionColumns(source = "unknown") {
  if (!tableWrap) return;
  const tableEl = tableWrap.querySelector("table");

  if (panelTableWidthCleanup) {
    panelTableWidthCleanup();
    panelTableWidthCleanup = null;
  }
  if (panelTableScrollObserver) {
    panelTableScrollObserver.disconnect();
    panelTableScrollObserver = null;
  }

  const initialWrapperWidth = tableWrap.clientWidth;
  const panelWidth = mapPanel?.getBoundingClientRect().width || 0;
  const targetTableWidth = Math.max(920, initialWrapperWidth - panelWidth);

  const stickScroll = () => {
    const maxScrollLeft = tableWrap.scrollWidth - tableWrap.clientWidth;
    if (maxScrollLeft <= 0) return;
    const previousScrollBehavior = tableWrap.style.scrollBehavior;
    tableWrap.style.scrollBehavior = "auto";
    tableWrap.scrollLeft = maxScrollLeft;
    tableWrap.style.scrollBehavior = previousScrollBehavior;
  };

  if (!tableEl || initialWrapperWidth <= 920) {
    stickScroll();
    if (usesReducedMotion()) {
      requestAnimationFrame(stickScroll);
      return;
    }
    if (typeof ResizeObserver === "function") {
      panelTableScrollObserver = new ResizeObserver(() => stickScroll());
      panelTableScrollObserver.observe(tableWrap);
      const stop = (event) => {
        if (event.target !== tableWrap || event.propertyName !== "margin-right") return;
        tableWrap.removeEventListener("transitionend", stop);
        tableWrap.removeEventListener("transitioncancel", stop);
        if (panelTableScrollObserver) {
          panelTableScrollObserver.disconnect();
          panelTableScrollObserver = null;
        }
        stickScroll();
      };
      tableWrap.addEventListener("transitionend", stop);
      tableWrap.addEventListener("transitioncancel", stop);
    }
    return;
  }

  if (usesReducedMotion()) {
    stickScroll();
    requestAnimationFrame(stickScroll);
    return;
  }

  // Lock the table at the wrapper's current width so overflow appears from
  // the very first frame of the panel transition, then animate the table
  // width back down to its natural size in lockstep with the margin.
  tableEl.style.transition = "none";
  tableEl.style.width = `${initialWrapperWidth}px`;
  void tableEl.offsetWidth;
  tableEl.style.transition = "width 280ms ease";

  requestAnimationFrame(() => {
    tableEl.style.width = `${targetTableWidth}px`;
  });

  if (typeof ResizeObserver === "function") {
    panelTableScrollObserver = new ResizeObserver(() => stickScroll());
    panelTableScrollObserver.observe(tableWrap);
    panelTableScrollObserver.observe(tableEl);
  }

  const cleanup = () => {
    tableEl.style.transition = "";
    tableEl.style.width = "";
    if (panelTableScrollObserver) {
      panelTableScrollObserver.disconnect();
      panelTableScrollObserver = null;
    }
    tableEl.removeEventListener("transitionend", onTableTransitionEnd);
    tableEl.removeEventListener("transitioncancel", onTableTransitionEnd);
    panelTableWidthCleanup = null;
  };

  const onTableTransitionEnd = (event) => {
    if (event.target !== tableEl || event.propertyName !== "width") return;
    cleanup();
  };
  tableEl.addEventListener("transitionend", onTableTransitionEnd);
  tableEl.addEventListener("transitioncancel", onTableTransitionEnd);
  panelTableWidthCleanup = cleanup;
}

function openMapPanel(mode = "map", { scrollTable = false } = {}) {
  if (!card || !mapToggle) return;

  const wasPanelOpen = card.classList.contains("is-map-open");

  card.classList.add("is-map-open");
  mapToggle.setAttribute("aria-expanded", String(mode === "map"));
  setPanelMode(mode);

  // Only scroll the table to expose the action columns when the caller
  // explicitly opts in (in-row contacts/locations buttons). Other entry
  // points (toolbar buttons, init, owner-detail links, etc.) must leave
  // the horizontal scroll position untouched.
  if (scrollTable && !wasPanelOpen && !globalRawDataViewOpen && (mode === "map" || mode === "org")) {
    scrollTableToActionColumns(`openMapPanel:${mode}`);
  }

  if (mode === "map") {
    initializeOwnersMap();
    window.setTimeout(() => {
      resizeOwnersMap();
      fitOwnersMapToVisibleLocations();
    }, getMotionDelay(280));
  }
}

function finalizeOnePagerMapTour(tourRunId) {
  const state = onePagerMapTourState;
  if (!state || state.paused || state.runId !== tourRunId || tourRunId !== onePagerMapTourRunId) return;

  onePagerMapTourState = null;
  onePagerMapTourActive = false;
  window.clearTimeout(onePagerMapTourReleaseTimeout);
  onePagerMapTourReleaseTimeout = null;
  fitOwnersMapToVisibleLocations({
    durationMs: 2400,
    padding: 10,
    maxZoom: 8.2
  });
}

function startOnePagerMapTourMotion(state) {
  if (!ownersMap || state.runId !== onePagerMapTourRunId) return;

  const duration = Math.max(0, state.remainingMoveMs);
  state.phase = "moving";
  state.startedAt = performance.now();
  state.remainingMoveMs = duration;

  ownersMap.stop();
  if (duration <= 0) {
    finalizeOnePagerMapTour(state.runId);
    return;
  }

  ownersMap.easeTo({
    ...ONE_PAGER_MAP_TOUR_END_CAMERA,
    duration,
    easing: (progress) => 0.5 - Math.cos(progress * Math.PI) / 2,
    essential: true
  });

  ownersMap.once("moveend", () => finalizeOnePagerMapTour(state.runId));
  onePagerMapTourReleaseTimeout = window.setTimeout(
    () => finalizeOnePagerMapTour(state.runId),
    duration + 240
  );
}

function scheduleOnePagerMapTourDelay(state) {
  if (state.runId !== onePagerMapTourRunId) return;

  state.phase = "waiting";
  state.startedAt = performance.now();
  onePagerMapTourTimeout = window.setTimeout(() => {
    onePagerMapTourTimeout = null;
    if (state.paused || state.runId !== onePagerMapTourRunId) return;
    startOnePagerMapTourMotion(state);
  }, Math.max(0, state.remainingDelayMs));
}

function runOnePagerMapCoastToCoastTour({ durationMs = 12000, startDelayMs = 520, holdMs = 700 } = {}) {
  if (!isOnePagerPresentation) return;

  cancelOnePagerMapTour();
  onePagerMapTourActive = true;
  const tourRunId = ++onePagerMapTourRunId;

  if (!ownersMap) {
    initializeOwnersMap();
  }

  if (!ownersMap) {
    onePagerMapTourTimeout = window.setTimeout(() => {
      runOnePagerMapCoastToCoastTour({ durationMs, startDelayMs, holdMs });
    }, 100);
    return;
  }

  resizeOwnersMap();
  ownersMap.stop();
  ownersMap.jumpTo(ONE_PAGER_MAP_TOUR_START_CAMERA);

  const playTour = () => {
    if (tourRunId !== onePagerMapTourRunId) return;

    resizeOwnersMap();
    ownersMap.stop();
    ownersMap.jumpTo(ONE_PAGER_MAP_TOUR_START_CAMERA);

    onePagerMapTourState = {
      runId: tourRunId,
      phase: "waiting",
      paused: false,
      remainingDelayMs: getMotionDelay(startDelayMs + holdMs),
      remainingMoveMs: getMotionDelay(durationMs),
      startedAt: performance.now()
    };

    if (window.isOnePagerPresentationPaused?.()) {
      onePagerMapTourState.paused = true;
      return;
    }

    scheduleOnePagerMapTourDelay(onePagerMapTourState);
  };

  if (!ownersMap.loaded()) {
    ownersMap.once("idle", playTour);
    return;
  }

  playTour();
}

function cancelOnePagerMapTour() {
  window.clearTimeout(onePagerMapTourTimeout);
  window.clearTimeout(onePagerMapTourReleaseTimeout);
  onePagerMapTourTimeout = null;
  onePagerMapTourReleaseTimeout = null;
  onePagerMapTourActive = false;
  onePagerMapTourState = null;
  onePagerMapTourRunId += 1;
  ownersMap?.stop();
}

function setOnePagerMapTourPaused(isPaused) {
  const state = onePagerMapTourState;
  if (!state || state.paused === isPaused) return;

  state.paused = isPaused;

  if (isPaused) {
    if (state.phase === "waiting" && onePagerMapTourTimeout !== null) {
      window.clearTimeout(onePagerMapTourTimeout);
      onePagerMapTourTimeout = null;
      state.remainingDelayMs = Math.max(0, state.remainingDelayMs - (performance.now() - state.startedAt));
      return;
    }

    if (state.phase === "moving") {
      window.clearTimeout(onePagerMapTourReleaseTimeout);
      onePagerMapTourReleaseTimeout = null;
      state.remainingMoveMs = Math.max(0, state.remainingMoveMs - (performance.now() - state.startedAt));
      ownersMap?.stop();
    }
    return;
  }

  if (state.phase === "waiting") {
    scheduleOnePagerMapTourDelay(state);
    return;
  }

  if (state.phase === "moving") {
    startOnePagerMapTourMotion(state);
  }
}

window.runOnePagerMapCoastToCoastTour = runOnePagerMapCoastToCoastTour;

function queueOnePagerMarketFilterTimeout(callback, delayMs) {
  const timer = {
    callback,
    remainingMs: getMotionDelay(delayMs),
    startedAt: null,
    timeoutId: null
  };

  onePagerMarketFilterTimeouts.add(timer);
  if (!window.isOnePagerPresentationPaused?.()) {
    scheduleOnePagerMarketFilterTimeout(timer);
  }
}

function scheduleOnePagerMarketFilterTimeout(timer) {
  timer.startedAt = performance.now();
  timer.timeoutId = window.setTimeout(() => {
    onePagerMarketFilterTimeouts.delete(timer);
    timer.timeoutId = null;
    timer.callback();
  }, Math.max(0, timer.remainingMs));
}

function setOnePagerMarketFilterTimeoutsPaused(isPaused) {
  const now = performance.now();

  onePagerMarketFilterTimeouts.forEach((timer) => {
    if (isPaused) {
      if (timer.timeoutId === null) return;
      window.clearTimeout(timer.timeoutId);
      timer.timeoutId = null;
      timer.remainingMs = Math.max(0, timer.remainingMs - (now - timer.startedAt));
      return;
    }

    if (timer.timeoutId !== null) return;
    scheduleOnePagerMarketFilterTimeout(timer);
  });
}

function cancelOnePagerMarketFilterStory() {
  onePagerMarketFilterRunId += 1;
  onePagerMarketFilterTimeouts.forEach((timer) => {
    window.clearTimeout(timer.timeoutId);
  });
  onePagerMarketFilterTimeouts.clear();
  onePagerRadiusSpotlightLabel = null;
  setOnePagerMapPanelCrossfadeHidden(false);

  if (onePagerMarketFilterAnimationFrame !== null) {
    window.cancelAnimationFrame(onePagerMarketFilterAnimationFrame);
    onePagerMarketFilterAnimationFrame = null;
  }
  onePagerRadiusAnimationState = null;
}

function setOnePagerMapPanelCrossfadeHidden(isHidden) {
  card?.classList.toggle("is-one-pager-map-crossfade-hidden", Boolean(isHidden));
}

function expandLocationFilterSection() {
  const locationSection = locationFilterSelect?.closest(".filter-section");
  if (!locationSection) return;

  locationSection.classList.remove("filter-section-collapsed");
  locationSection.querySelector(".filter-section-title")?.setAttribute("aria-expanded", "true");
}

function setOnePagerLocationFilterCities(cities) {
  if (!locationFilterSelect) return;

  const availableCities = new Set(
    Array.from(locationFilterSelect.options).map((option) => option.value)
  );
  setFilterSelectValues(
    locationFilterSelect,
    cities.filter((city) => availableCities.has(city))
  );
  locationFilterSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

function expandFranchiseFilterSection() {
  const franchiseSection = franchiseFilterSelect?.closest(".filter-section");
  if (!franchiseSection) return;

  franchiseSection.classList.remove("filter-section-collapsed");
  franchiseSection.querySelector(".filter-section-title")?.setAttribute("aria-expanded", "true");
}

function setOnePagerExcludedFranchiseFilters(franchises) {
  if (!franchiseFilterSelect) return;

  const availableFranchises = new Set(
    Array.from(franchiseFilterSelect.options).map((option) => option.value)
  );
  const nextExcludedValues = franchises.filter((franchise) => availableFranchises.has(franchise));

  selectedFranchiseIndexes = [];
  excludedFranchiseIndexes = nextExcludedValues;
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, selectedFranchiseIndexes, excludedFranchiseIndexes);
  syncFilterComboboxes();
  franchiseFilterSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

function addOnePagerExcludedFranchiseFilter(franchise) {
  const nextExcludedValues = excludedFranchiseIndexes.includes(franchise)
    ? excludedFranchiseIndexes
    : [...excludedFranchiseIndexes, franchise];
  setOnePagerExcludedFranchiseFilters(nextExcludedValues);
}

function runOnePagerRadiusAnimationFrame(state) {
  const step = (now) => {
    if (state !== onePagerRadiusAnimationState || state.runId !== onePagerMarketFilterRunId) return;

    const progress = state.duration > 0
      ? Math.min(1, (now - state.startedAt) / state.duration)
      : 1;
    const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
    const shouldRefresh = progress >= 1 || (now - state.lastRefreshAt >= ONE_PAGER_RADIUS_REFRESH_INTERVAL_MS);
    setRadiusValue(state.startMiles + (state.distance * easedProgress), {
      refresh: shouldRefresh,
      preservePrecision: true
    });
    if (shouldRefresh) {
      state.lastRefreshAt = now;
    }

    if (progress < 1) {
      onePagerMarketFilterAnimationFrame = window.requestAnimationFrame(step);
      return;
    }

    setRadiusValue(state.targetMiles, { refresh: true });
    onePagerMarketFilterAnimationFrame = null;
    onePagerRadiusAnimationState = null;
  };

  onePagerMarketFilterAnimationFrame = window.requestAnimationFrame(step);
}

function animateOnePagerRadiusTo(targetMiles, durationMs, runId) {
  const startMiles = selectedRadiusMiles;
  const distance = targetMiles - startMiles;
  const duration = getMotionDelay(durationMs);

  if (!duration || !distance) {
    setRadiusValue(targetMiles, { refresh: true });
    return;
  }

  onePagerRadiusAnimationState = {
    runId,
    targetMiles,
    startMiles,
    distance,
    duration,
    remainingMs: duration,
    startedAt: window.performance.now(),
    lastRefreshAt: window.performance.now() - ONE_PAGER_RADIUS_REFRESH_INTERVAL_MS
  };

  if (window.isOnePagerPresentationPaused?.()) return;

  runOnePagerRadiusAnimationFrame(onePagerRadiusAnimationState);
}

function setOnePagerRadiusAnimationPaused(isPaused) {
  const state = onePagerRadiusAnimationState;
  if (!state) return;

  if (isPaused) {
    if (onePagerMarketFilterAnimationFrame !== null) {
      window.cancelAnimationFrame(onePagerMarketFilterAnimationFrame);
      onePagerMarketFilterAnimationFrame = null;
    }
    state.remainingMs = Math.max(0, state.duration - (performance.now() - state.startedAt));
    return;
  }

  state.startMiles = selectedRadiusMiles;
  state.distance = state.targetMiles - state.startMiles;
  state.duration = state.remainingMs;
  state.startedAt = performance.now();
  state.lastRefreshAt = state.startedAt - ONE_PAGER_RADIUS_REFRESH_INTERVAL_MS;

  if (state.duration <= 0 || !state.distance) {
    setRadiusValue(state.targetMiles, { refresh: true });
    onePagerRadiusAnimationState = null;
    return;
  }

  runOnePagerRadiusAnimationFrame(state);
}

function runOnePagerMarketFilterStory() {
  if (!isOnePagerPresentation) return;

  cancelOnePagerMarketFilterStory();
  cancelOnePagerMapTour();
  const runId = ++onePagerMarketFilterRunId;

  lockedToolbarMode = "map";
  openSidebar("map", null);
  setOnePagerMapPanelCrossfadeHidden(true);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    setPanelLayout("full");
    setFilterPanelOpen(true);
    expandLocationFilterSection();
    setOnePagerExcludedFranchiseFilters([]);
    setOnePagerLocationFilterCities([]);
    setRadiusFilterEnabled(false, { refresh: false });
    setRadiusValue(0, { refresh: false });
  }, ONE_PAGER_MARKET_FILTER_FADE_OUT_MS);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    resizeOwnersMap();
    fitOwnersMapToVisibleLocations({ durationMs: 0 });
    setOnePagerMapPanelCrossfadeHidden(false);
  }, ONE_PAGER_MARKET_FILTER_FADE_OUT_MS + ONE_PAGER_MARKET_FILTER_LAYOUT_SWAP_DELAY_MS);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    setRadiusFilterEnabled(true, { refresh: false });
    setRadiusValue(0, { refresh: true });
    animateOnePagerRadiusTo(
      ONE_PAGER_MARKET_FILTER_FINAL_RADIUS_MILES,
      ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS,
      runId
    );
  }, ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    onePagerRadiusSpotlightLabel = ONE_PAGER_MARKET_FILTER_CITIES[0];
    setOnePagerLocationFilterCities([ONE_PAGER_MARKET_FILTER_CITIES[0]]);
  }, ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS + ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS + 150);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    onePagerRadiusSpotlightLabel = null;
    setOnePagerLocationFilterCities([
      ONE_PAGER_MARKET_FILTER_CITIES[0],
      ONE_PAGER_MARKET_FILTER_CITIES[1]
    ]);
  }, ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS + ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS + 150 + ONE_PAGER_MARKET_FILTER_CITY_STEP_DELAY_MS);

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    onePagerRadiusSpotlightLabel = null;
    setOnePagerLocationFilterCities([
      ONE_PAGER_MARKET_FILTER_CITIES[0],
      ONE_PAGER_MARKET_FILTER_CITIES[1],
      ONE_PAGER_MARKET_FILTER_CITIES[2]
    ]);
  }, ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS + ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS + 150 + (ONE_PAGER_MARKET_FILTER_CITY_STEP_DELAY_MS * 2));

  const franchisesStartDelay =
    ONE_PAGER_MARKET_FILTER_ACTION_DELAY_MS +
    ONE_PAGER_MARKET_FILTER_RADIUS_DURATION_MS +
    150 +
    (ONE_PAGER_MARKET_FILTER_CITY_STEP_DELAY_MS * 2) +
    ONE_PAGER_MARKET_FILTER_FRANCHISE_STEP_DELAY_MS;

  queueOnePagerMarketFilterTimeout(() => {
    if (runId !== onePagerMarketFilterRunId) return;
    expandFranchiseFilterSection();
  }, franchisesStartDelay);

  ONE_PAGER_MARKET_FILTER_EXCLUDED_FRANCHISES.forEach((franchise, index) => {
    queueOnePagerMarketFilterTimeout(() => {
      if (runId !== onePagerMarketFilterRunId) return;
      addOnePagerExcludedFranchiseFilter(franchise);
    }, franchisesStartDelay + ((index + 1) * ONE_PAGER_MARKET_FILTER_CITY_STEP_DELAY_MS));
  });
}

function resetOnePagerMarketFilterStory() {
  if (!isOnePagerPresentation) return;

  cancelOnePagerMarketFilterStory();
  onePagerRadiusSpotlightLabel = null;
  clearAllFilterSelections();
  setPanelLayout("split");
  setFilterPanelOpen(false);
  lockedToolbarMode = "map";
  openSidebar("map", null);
}

window.cancelOnePagerMarketFilterStory = cancelOnePagerMarketFilterStory;
window.runOnePagerMarketFilterStory = runOnePagerMarketFilterStory;
window.resetOnePagerMarketFilterStory = resetOnePagerMarketFilterStory;
window.addOnePagerPresentationPauseHandler?.((isPaused) => {
  setOnePagerMapTourPaused(isPaused);
  setOnePagerMarketFilterTimeoutsPaused(isPaused);
  setOnePagerRadiusAnimationPaused(isPaused);
});

function getOnePagerMapCameraState() {
  if (!ownersMap) return null;
  const center = ownersMap.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: ownersMap.getZoom(),
    isMoving: ownersMap.isMoving()
  };
}

window.getOnePagerMapCameraState = getOnePagerMapCameraState;

function initializeOwnersMap() {
  if (ownersMapInitialized || !window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  ownersMapInitialized = true;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  ownersMap = new mapboxgl.Map({
    container: "ownersMap",
    style: MAPBOX_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: 3.1,
    attributionControl: false,
    logoPosition: "bottom-right",
    preserveDrawingBuffer: true
  });
  ensureOwnersMapResizeObserver();

  ownersMap.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-left");

  ownersMap.on("load", () => {
    ownersMap.addSource("radius-circles", {
      type: "geojson",
      data: getRadiusCircleFeatureCollection()
    });

    ownersMap.addLayer({
      id: "radius-circles-fill",
      type: "fill",
      source: "radius-circles",
      paint: {
        "fill-color": "#7a63dd",
        "fill-opacity": 0
      }
    });

    ownersMap.setPaintProperty("radius-circles-fill", "fill-opacity-transition", {
      duration: 360,
      delay: 0
    });

    ownersMap.addLayer({
      id: "radius-circles-outline",
      type: "line",
      source: "radius-circles",
      paint: {
        "line-color": "#7a63dd",
        "line-width": 1.5,
        "line-opacity": 0
      }
    });

    ownersMap.setPaintProperty("radius-circles-outline", "line-opacity-transition", {
      duration: 360,
      delay: 0
    });

    ownersMap.addSource("owner-points", {
      type: "geojson",
      data: getMapPointFeatureCollection()
    });

    ownersMap.addLayer({
      id: "owner-points",
      type: "circle",
      source: "owner-points",
      paint: {
        "circle-radius": 4.5,
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "case",
          ["boolean", ["get", "isOutsideSpotlightRadius"], false],
          0.16,
          0.78
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    ownersMap.setPaintProperty("owner-points", "circle-opacity-transition", {
      duration: 260,
      delay: 0
    });

    fitOwnersMapToVisibleLocations();
  });
}

function resizeOwnersMap() {
  if (ownersMap) {
    ownersMap.resize();
  }
}
