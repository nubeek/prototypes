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

function getLocationSearchCoordinates(search) {
  const storedLongitude = Number(search?.coordinates?.longitude);
  const storedLatitude = Number(search?.coordinates?.latitude);
  const regionCenter = window.cstLocationSearch?.getRegionCenter?.(search?.stateCode)
    || window.cstLocationSearch?.getRegionCenter?.(
      window.cstLocationSearch?.getRegionCodeFromLabel?.(search?.label)
    );
  const longitude = Number.isFinite(storedLongitude) ? storedLongitude : Number(regionCenter?.longitude);
  const latitude = Number.isFinite(storedLatitude) ? storedLatitude : Number(regionCenter?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  return {
    label: search.label,
    lat: latitude,
    lng: longitude
  };
}

function getMapFilterLocationCenter(locationLabel) {
  if (!locationLabel) return null;

  const searchMatch = [...selectedLocationSearches, ...excludedLocationSearches]
    .find((search) => search.label === locationLabel);
  const searchCenter = getLocationSearchCoordinates(searchMatch);
  if (searchCenter) return searchCenter;

  const locationCenters = [];

  if (typeof OWNER_LOCATION_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_LOCATION_CENTERS);
  }

  if (typeof OWNER_HEADQUARTERS_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_HEADQUARTERS_CENTERS);
  }

  const knownCenter = locationCenters.find((location) => location.label === locationLabel);
  if (knownCenter) return knownCenter;

  const regionCode = window.cstLocationSearch?.getRegionCodeFromLabel?.(locationLabel);
  const regionCenter = window.cstLocationSearch?.getRegionCenter?.(regionCode);
  if (!regionCenter) return null;

  return {
    label: locationLabel,
    lat: regionCenter.latitude,
    lng: regionCenter.longitude
  };
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
  const centers = [
    ...selectedLocationSearches.map(getLocationSearchCoordinates),
    ...selectedLocationLabels.map((label) => getMapFilterLocationCenter(label))
  ].filter(Boolean);

  if (userLocationCenter) {
    centers.push(userLocationCenter);
  }

  const seen = new Set();
  return centers.filter((center) => {
    const key = `${Number(center.lat).toFixed(5)}:${Number(center.lng).toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function locationRecordMatchesSearchList(location, searches = []) {
  return searches.some((search) => window.cstLocationSearch?.matchesLocation?.(location, search));
}

function locationRecordMatchesSelectedLabels(location, labels = []) {
  const locationLabel = location?.label || location?.location || "";
  if (labels.includes(locationLabel)) return true;

  return labels.some((label) => {
    const search = window.cstLocationSearch?.fromLabel?.(label);
    return Boolean(search && window.cstLocationSearch?.matchesLocation?.(location, search));
  });
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

function locationRecordIsExcluded(location) {
  if (locationRecordMatchesSearchList(location, excludedLocationSearches)) return true;
  if (!excludedLocationLabels.length) return false;
  return locationRecordMatchesSelectedLabels(location, excludedLocationLabels);
}

function locationRecordMatchesIncludedSelection(location) {
  const hasIncludedSearches = selectedLocationSearches.length > 0;
  const hasIncludedLabels = selectedLocationLabels.length > 0;
  if (!hasIncludedSearches && !hasIncludedLabels) return true;

  return (
    locationRecordMatchesSearchList(location, selectedLocationSearches)
    || locationRecordMatchesSelectedLabels(location, selectedLocationLabels)
  );
}

function rowMatchesLocationFilter(row) {
  const location = {
    label: row.location,
    location: row.location,
    lat: row.lat,
    lng: row.lng
  };

  if (locationRecordIsExcluded(location)) return false;

  if (isRadiusFilterActive()) {
    if (typeof row?.lat === "number" && typeof row?.lng === "number") {
      return locationWithinSelectedRadius(row);
    }
    return true;
  }

  return locationRecordMatchesIncludedSelection(location);
}

function mapLocationMatchesSelectedFilter(location) {
  if (locationRecordIsExcluded(location)) return false;

  if (isRadiusFilterActive()) {
    return locationWithinSelectedRadius(location);
  }

  if (!selectedLocationSearches.length && !selectedLocationLabels.length) return true;
  if (!locationRecordMatchesIncludedSelection(location)) return false;

  const selectedSearch = selectedLocationSearches.find((search) => (
    window.cstLocationSearch?.matchesLocation?.(location, search)
  ));
  if (selectedSearch?.geoLevel === "region") return true;

  const selectedMapLocationCenter = getLocationSearchCoordinates(selectedSearch)
    || getMapFilterLocationCenter(location.label);
  if (!selectedMapLocationCenter) return true;

  return getLocationDistanceMiles(location, selectedMapLocationCenter) <= MAP_LOCATION_FILTER_RADIUS_MILES;
}

function getMapPointFeatures(ownerIndex = activeMapOwnerIndex) {
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
        .map((location, locationIndex) => ({
          type: "Feature",
          properties: {
            featureId: `${index}-${locationIndex}-${location.lng}-${location.lat}`,
            ownerIndex: index,
            ownerName: owner.ownerName,
            locationLabel: location.label,
            franchise: location.franchise || "",
            color: location.color || FRANCHISE_ACCENT_COLOR_FALLBACK
          },
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat]
          }
        }));
    });
}

function getOwnersMapPointFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: getMapPointFeatures()
  };
}

function setOwnersMapPointData(collection) {
  ownersMap?.getSource("owner-points")?.setData(collection);
}

function refreshOwnersMapPointData() {
  if (!ownersMap?.getSource("owner-points")) return;

  ownersMapPointHover?.clearHover();
  setOwnersMapPointData(getOwnersMapPointFeatureCollection());
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

function fitOwnersMapToVisibleLocations() {
  if (!ownersMap || !window.mapboxgl) return;
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
    padding: MAP_FIT_PADDING,
    duration: 420,
    maxZoom: 9
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

function getMapPointBaseCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    MAP_POINT_ZOOM_MIN,
    MAP_POINT_RADIUS,
    MAP_POINT_ZOOM_MAX,
    MAP_POINT_RADIUS_MAX,
    22,
    MAP_POINT_RADIUS_MAX
  ];
}

function getMapPointHoverCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    MAP_POINT_ZOOM_MIN,
    MAP_POINT_RADIUS * MAP_POINT_HOVER_SCALE,
    MAP_POINT_ZOOM_MAX,
    MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE,
    22,
    MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE
  ];
}

function getMapPointHoverLayerFilter(featureId = null) {
  if (!featureId) {
    return ["==", ["get", "featureId"], ""];
  }

  return ["==", ["get", "featureId"], featureId];
}

function getMapPointBaseLayerFilter(featureId = null) {
  if (!featureId) {
    return true;
  }

  return ["!=", ["get", "featureId"], featureId];
}

function createMapPointTooltipController(mapInstance) {
  let tooltipEl = null;
  let activeCoordinates = null;
  let isVisible = false;

  const getTooltip = () => {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "map-point-floating-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      document.body.append(tooltipEl);
    }

    return tooltipEl;
  };

  const renderTooltipContent = (feature) => {
    const tooltip = getTooltip();
    const properties = feature.properties || {};

    tooltip.replaceChildren();

    const ownerName = properties.ownerName || "";
    const locationLabel = properties.locationLabel || "";
    const franchise = properties.franchise || "";

    if (ownerName) {
      const title = document.createElement("div");
      title.className = "map-point-tooltip-title";
      title.textContent = ownerName;
      tooltip.append(title);
    }

    if (ownerName && (locationLabel || franchise)) {
      const divider = document.createElement("div");
      divider.className = "map-point-tooltip-divider";
      divider.setAttribute("aria-hidden", "true");
      tooltip.append(divider);
    }

    if (locationLabel) {
      const location = document.createElement("div");
      location.className = "map-point-tooltip-detail";
      location.textContent = locationLabel;
      tooltip.append(location);
    }

    if (franchise) {
      const franchiseLine = document.createElement("div");
      franchiseLine.className = "map-point-tooltip-detail";
      franchiseLine.textContent = franchise;
      tooltip.append(franchiseLine);
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

  const show = (feature) => {
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates) return;

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

function createOwnersMapInteractionController(mapInstance) {
  let hoveredPointId = null;
  const tooltip = createMapPointTooltipController(mapInstance);
  const pointBaseLayerId = "owner-points";
  const pointHoverLayerId = "owner-points-hover";

  const syncHoverLayers = () => {
    mapInstance.setFilter(pointHoverLayerId, getMapPointHoverLayerFilter(hoveredPointId));
    mapInstance.setFilter(pointBaseLayerId, getMapPointBaseLayerFilter(hoveredPointId));
  };

  const clearHover = () => {
    if (hoveredPointId === null) return;

    hoveredPointId = null;
    syncHoverLayers();
    tooltip.hide();
  };

  const setPointHover = (feature) => {
    const featureId = feature?.properties?.featureId;
    if (!featureId) return;

    if (hoveredPointId === featureId) {
      tooltip.show(feature);
      return;
    }

    hoveredPointId = featureId;
    syncHoverLayers();
    tooltip.show(feature);
  };

  const bind = () => {
    tooltip.bind();

    mapInstance.on("mousemove", (event) => {
      const pointFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: [pointHoverLayerId, pointBaseLayerId]
      });

      if (!pointFeatures.length) {
        clearHover();
        mapInstance.getCanvas().style.cursor = "";
        return;
      }

      mapInstance.getCanvas().style.cursor = "pointer";
      setPointHover(pointFeatures[0]);
    });

    mapInstance.on("mouseleave", () => {
      clearHover();
      mapInstance.getCanvas().style.cursor = "";
    });
  };

  return { bind, clearHover };
}

function syncMapLocationFilter() {
  syncOwnerMapHeader();

  if (!ownersMap?.getSource("owner-points")) return;
  ownersMapPointHover?.clearHover();
  setOwnersMapPointData(getOwnersMapPointFeatureCollection());
  ownersMap.getSource("radius-circles")?.setData(getRadiusCircleFeatureCollection());
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

  if (!card.classList.contains("is-map-open")) return;

  scheduleOwnersMapResize();
  syncStickyNameColumnDivider();
  if (getCurrentPanelMode() === "map") {
    window.setTimeout(() => fitOwnersMapToVisibleLocations(), getMotionDelay(280));
  }

  if (isLayoutChange) {
    void card.offsetWidth;
    window.requestAnimationFrame(() => {
      card.classList.remove("is-layout-switching");
    });
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

const CST_MOCK_USER_LOCATION = window.CST_ENV?.MOCK_USER_LOCATION ?? true;
const CST_MOCK_USER_COORDS = window.CST_ENV?.MOCK_USER_COORDS ?? {
  longitude: -73.986472,
  latitude: 40.703875,
  accuracy: 25
};

function installCstMockGeolocation() {
  if (!CST_MOCK_USER_LOCATION || !navigator.geolocation || navigator.geolocation.__cstMocked) return;

  const createMockPosition = () => ({
    coords: {
      latitude: CST_MOCK_USER_COORDS.latitude,
      longitude: CST_MOCK_USER_COORDS.longitude,
      accuracy: CST_MOCK_USER_COORDS.accuracy,
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
    return window.setTimeout(() => success(createMockPosition()), 0);
  };
  geolocation.clearWatch = (watchId) => {
    window.clearTimeout(watchId);
  };
  geolocation.__cstMocked = true;
}

function locateUserFromFilters() {
  installCstMockGeolocation();

  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    userLocationCenter = {
      lat: latitude,
      lng: longitude,
      label: "My location"
    };

    if (typeof dismissOpenCstSplash === "function") {
      dismissOpenCstSplash();
    }

    setRadiusFilterEnabled(true, { refresh: true });
    openMapPanel("map");
    updateFilterSectionClearButtons?.();
  });
}

function initializeOwnersMap() {
  if (ownersMapInitialized || !window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  installCstMockGeolocation();
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
        "fill-opacity": 0.12
      }
    });

    ownersMap.addLayer({
      id: "radius-circles-outline",
      type: "line",
      source: "radius-circles",
      paint: {
        "line-color": "#7a63dd",
        "line-width": 1.5,
        "line-opacity": 0.55
      }
    });

    const initialPointCollection = getOwnersMapPointFeatureCollection();
    ownersMap.addSource("owner-points", {
      type: "geojson",
      data: initialPointCollection,
      promoteId: "featureId"
    });

    ownersMap.addLayer({
      id: "owner-points",
      type: "circle",
      source: "owner-points",
      filter: getMapPointBaseLayerFilter(),
      paint: {
        "circle-radius": getMapPointBaseCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": 0.78,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    ownersMap.addLayer({
      id: "owner-points-hover",
      type: "circle",
      source: "owner-points",
      filter: getMapPointHoverLayerFilter(),
      paint: {
        "circle-radius": getMapPointHoverCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": 0.78,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    ownersMapPointHover = createOwnersMapInteractionController(ownersMap);
    ownersMapPointHover.bind();

    fitOwnersMapToVisibleLocations();
  });
}

function resizeOwnersMap() {
  if (ownersMap) {
    ownersMap.resize();
  }
}
