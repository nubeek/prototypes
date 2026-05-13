const tableBody = document.getElementById("ownersTableBody");
const markRead = document.getElementById("markRead");
const position = document.getElementById("changePosition");
const prev = document.getElementById("prevChange");
const next = document.getElementById("nextChange");
const tableWrap = document.getElementById("tableWrap");
const card = document.querySelector(".card");
const filterToggle = document.getElementById("filterToggle");
const filterToggleLabel = document.getElementById("filterToggleLabel");
const filterPanel = document.getElementById("filterPanel");
const filterSummary = document.getElementById("filterSummary");
const clearAllFilters = document.getElementById("clearAllFilters");
const locationFilterSelect = document.getElementById("locationFilterSelect");
const categoryFilterSelect = document.getElementById("categoryFilterSelect");
const categoryFilterExclude = document.getElementById("categoryFilterExclude");
const ownerFilterSelect = document.getElementById("ownerFilterSelect");
const ownerFilterExclude = document.getElementById("ownerFilterExclude");
const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
const franchiseFilterExclude = document.getElementById("franchiseFilterExclude");
const statusFilterInputs = Array.from(document.querySelectorAll(".status-filter-input"));
const mapToggle = document.getElementById("mapToggle");
const orgChartToggle = document.getElementById("orgChartToggle");
const rawDataToggle = document.getElementById("rawDataToggle");
const mapPanel = document.getElementById("mapPanel");
const ownerMapHeader = document.getElementById("ownerMapHeader");
const ownerDetailsPanel = document.getElementById("ownerDetailsPanel");
const profileModal = document.getElementById("profileModal");
const profileModalContent = document.getElementById("profileModalContent");
const toolbarDropdown = document.querySelector(".toolbar-dropdown");
const updatesToggleOption = document.getElementById("updatesToggleOption");
const modifiedColumnToggleOption = document.getElementById("modifiedColumnToggleOption");
const reduceMotionToggleOption = document.getElementById("reduceMotionToggleOption");
const subtitle = document.querySelector(".subtitle-count");
const changeNav = document.querySelector(".change-nav");
const pager = document.querySelector(".pager");
const sortHeaders = Array.from(document.querySelectorAll(".sortable-header"));
const ownerColumnHeader = document.getElementById("ownerColumnHeader");
const contactColumnHeader = document.getElementById("contactColumnHeader");
const franchiseColumnHeader = document.getElementById("franchiseColumnHeader");
const modeColumnHeader = document.getElementById("modeColumnHeader");
const modeColumnLabel = document.getElementById("modeColumnLabel");
const combinedContactsHeader = document.getElementById("combinedContactsHeader");
const locationsColumnHeader = document.getElementById("locationsColumnHeader");
const ownersTable = tableBody?.closest("table");
const ownerTableHeaders = [
  ownerColumnHeader,
  contactColumnHeader,
  franchiseColumnHeader,
  modeColumnHeader,
  combinedContactsHeader,
  locationsColumnHeader
].filter(Boolean);
const defaultHeaderState = ownerTableHeaders.map((header) => ({
  header,
  className: header.className,
  datasetSortKey: header.dataset.sortKey,
  hidden: header.hidden,
  html: header.innerHTML,
  styleWidth: header.style.width,
  ariaSort: header.getAttribute("aria-sort")
}));
const owners = (window.ownersData || []).map((owner, index) => ({
  ...owner,
  originalIndex: index
}));
const activeIconColor = "#7a63dd";
const inactiveIconColor = "rgba(122, 99, 221, 0.15)";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const ACTIVE_HIGHLIGHT_FADE_MS = 220;
const MAPBOX_ACCESS_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
const HAS_MAPBOX_ACCESS_TOKEN = Boolean(MAPBOX_ACCESS_TOKEN);
const MAPBOX_STYLE = "mapbox://styles/wefranch/clvdsc4cp011f01ocbwpn0fi0";
const MAP_INITIAL_CENTER = [-98.5795, 39.8283];
const MAP_FIT_PADDING = 32;

let changedRows = [];
let activeIndex = 0;
let changeNavEngaged = false;
let displayedOwners = [...owners];
let selectedLocationLabel = "";
let selectedCategoryIndex = "";
let selectedOwnerIndex = "";
let selectedFranchiseIndex = "";
let ownerFilterExcludesSelection = false;
let categoryFilterExcludesSelection = false;
let franchiseFilterExcludesSelection = false;
let activeHighlightTimeout;
let updatesEnabled = false;
let modifiedColumnVisible = false;
let reduceMotionEnabled = false;
let ownersMap;
let ownersMapInitialized = false;
let ownerDetailsMap;
let ownerDetailsMapOwnerIndex = null;
let activeMapOwnerIndex = null;
let activeDetailOwnerIndex = null;
let activeOrgOwnerIndex = null;
let activeRawOwnerIndex = null;
let globalRawDataViewOpen = false;
let anchoredToolbarMode = null;
let anchoredToolbarOwnerIndex = null;
let lastProfileModalTrigger = null;
let ownersMapResizeObserver = null;
let ownersMapResizeFrame = null;
const orgCollapsedNodeIdsByOwner = new Map();
let sortState = {
  key: "locations",
  direction: "descending"
};
let locationSortCycleActive = false;
const columnWidths = {
  owner: "24%",
  contact: "24%",
  franchise: "16%",
  mode: "12%",
  contacts: "12%",
  locations: "12%"
};
const columnWidthsWithoutModified = {
  owner: "27%",
  contact: "27%",
  franchise: "20%",
  contacts: "13%",
  locations: "13%"
};

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

function setChangePositionLabel(text) {
  if (position) position.textContent = text;
}

function usesReducedMotion() {
  return reduceMotionEnabled;
}

function getMotionDelay(delay) {
  return usesReducedMotion() ? 0 : delay;
}

function getMapPointFeatures(ownerIndex = activeMapOwnerIndex) {
  const selectedMapOwnerIndex = selectedOwnerIndex && !ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null;
  const excludedMapOwnerIndex = selectedOwnerIndex && ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null;
  const filteredMapOwnerIndexes = ownerIndex === null
    ? new Set(getFilteredOwners().map((owner) => owner.originalIndex))
    : null;

  return (window.ownerLocationsData || [])
    .flatMap((owner, index) => {
      if (ownerIndex !== null && index !== ownerIndex) return [];
      if (filteredMapOwnerIndexes && !filteredMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && selectedMapOwnerIndex !== null && index !== selectedMapOwnerIndex) return [];
      if (ownerIndex === null && excludedMapOwnerIndex !== null && index === excludedMapOwnerIndex) return [];

      return owner.locations
        .filter((location) => !selectedLocationLabel || location.label === selectedLocationLabel)
        .map((location) => ({
          type: "Feature",
          properties: {
            ownerIndex: index,
            ownerName: owner.ownerName,
            locationLabel: location.label,
            color: owner.color
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

function getVisibleMapCoordinates() {
  return getMapPointFeatures().map((feature) => feature.geometry.coordinates);
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

function syncMapLocationFilter() {
  syncOwnerMapHeader();

  if (!ownersMap?.getSource("owner-points")) return;
  ownersMap.getSource("owner-points").setData(getMapPointFeatureCollection());
  fitOwnersMapToVisibleLocations();
}

function restoreAnchoredToolbarMode() {
  if (!anchoredToolbarMode) return false;

  if (anchoredToolbarMode === "raw") {
    renderGlobalRawDataTable();
    return true;
  }

  activeMapOwnerIndex = null;
  activeDetailOwnerIndex = null;
  activeRawOwnerIndex = null;
  globalRawDataViewOpen = false;

  if (anchoredToolbarMode === "org") {
    activeOrgOwnerIndex = anchoredToolbarOwnerIndex;
    syncMapLocationFilter();

    if (anchoredToolbarOwnerIndex !== null) {
      renderOwnerOrgChart(anchoredToolbarOwnerIndex);
    } else {
      renderDefaultOrgChartState();
    }

    openMapPanel("org");
  } else {
    activeOrgOwnerIndex = null;
    openMapPanel("map");
    syncMapLocationFilter();
  }

  renderOwners(displayedOwners);
  refreshChangedRows();
  return true;
}

function closeMapPanel() {
  if (!card || !mapToggle) return false;

  if (restoreAnchoredToolbarMode()) return true;

  activeMapOwnerIndex = null;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  card.classList.remove("is-map-open");
  mapToggle.setAttribute("aria-expanded", "false");
  setPanelMode("map");
  return false;
}

function handleLocationFilterClick(ownerIndex) {
  const wasActive = activeMapOwnerIndex === ownerIndex;

  if (wasActive && card?.classList.contains("is-map-open")) {
    if (closeMapPanel()) return;
    syncMapLocationFilter();
    renderOwners(displayedOwners);
    refreshChangedRows();
    return;
  }

  activeMapOwnerIndex = ownerIndex;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  openMapPanel("map", { scrollTable: true });
  syncMapLocationFilter();
  renderOwners(displayedOwners);
  refreshChangedRows();
}

function clearOwnerMapFilter() {
  if (activeMapOwnerIndex === null) return;

  activeMapOwnerIndex = null;
  syncMapLocationFilter();
  resizeOwnersMap();
  renderOwners(displayedOwners);
  refreshChangedRows();
}

function openOwnerDetailsFromHeader(ownerIndex) {
  anchoredToolbarMode = null;
  anchoredToolbarOwnerIndex = null;
  activeMapOwnerIndex = null;
  openOwnerDetails(ownerIndex);
}

function setPanelMode(mode) {
  if (!mapPanel || !ownerDetailsPanel) return;

  const usesDetailsPanel = mode === "details" || mode === "org";
  mapPanel.classList.toggle("is-details-mode", usesDetailsPanel);
  mapPanel.classList.toggle("is-org-mode", mode === "org");
  ownerDetailsPanel.hidden = !usesDetailsPanel;
  syncOwnerMapHeader(mode);
  syncToolbarTabState(mode);
}

function getCurrentPanelMode() {
  if (mapPanel?.classList.contains("is-org-mode")) return "org";
  if (mapPanel?.classList.contains("is-details-mode")) return "details";
  return "map";
}

function syncToolbarTabState(mode = "map") {
  const isFilterOpen = card?.classList.contains("is-filter-open");
  const isPanelOpen = card?.classList.contains("is-map-open");
  const mapActive = isPanelOpen && mode === "map";
  const orgActive = isPanelOpen && mode === "org";
  const rawActive = globalRawDataViewOpen;
  filterToggle?.classList.toggle("is-active", Boolean(isFilterOpen));
  mapToggle?.classList.toggle("is-active", Boolean(mapActive));
  mapToggle?.setAttribute("aria-pressed", String(Boolean(mapActive)));
  orgChartToggle?.classList.toggle("is-active", Boolean(orgActive));
  orgChartToggle?.setAttribute("aria-pressed", String(Boolean(orgActive)));
  rawDataToggle?.classList.toggle("is-active", Boolean(rawActive));
  rawDataToggle?.setAttribute("aria-pressed", String(Boolean(rawActive)));
  syncOwnerHeaderViewState();
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
    logoPosition: "bottom-right"
  });
  ensureOwnersMapResizeObserver();

  ownersMap.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-left");

  ownersMap.on("load", () => {
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
        "circle-opacity": 0.78,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    fitOwnersMapToVisibleLocations();
  });
}

function resizeOwnersMap() {
  if (ownersMap) {
    ownersMap.resize();
  }
}

function getEmailDomain(email) {
  return email.split("@")[1] || "";
}

function getOwnerWebsite(owner) {
  const domain = getEmailDomain(owner.email);
  return domain ? `www.${domain}` : "";
}

function getOwnerWebsiteUrl(owner) {
  const website = getOwnerWebsite(owner);
  return website ? `https://${website}` : "#";
}

function getOwnerLinkedinUrl(owner) {
  return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(owner.ownerName)}`;
}

function getOwnerFranchises(owner) {
  const franchises = String(owner.franchise || "")
    .split(",")
    .map((franchise) => franchise.trim())
    .filter(Boolean);

  return [...new Set(franchises)];
}

function getFranchiseSlug(franchiseName) {
  return franchiseName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getFranchiseLogoSrc(franchiseName) {
  return `assets/franchises/${getFranchiseSlug(franchiseName)}.jpg`;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isOwnerHeaderViewActive(view, ownerIndex) {
  const currentMode = getCurrentPanelMode();

  if (view === "map") {
    return currentMode === "map" && activeMapOwnerIndex === ownerIndex;
  }

  if (view === "org") {
    return currentMode === "org" && activeOrgOwnerIndex === ownerIndex;
  }

  return globalRawDataViewOpen && activeRawOwnerIndex === ownerIndex;
}

function getOwnerHeaderViewControls(owner) {
  const ownerIndex = owner.originalIndex;
  const rawDataDisabled = !isRawDataAvailable(owner);
  const buttons = [
    {
      view: "map",
      label: "Show owner map",
      title: "Map",
      icon: "assets/map.svg",
      iconClass: ""
    },
    {
      view: "org",
      label: "Show owner organization chart",
      title: "Org chart",
      icon: "assets/orgchart.svg",
      iconClass: "segmented-control-btn-divider-left"
    },
    {
      view: "raw",
      label: "Show owner raw data",
      title: "Raw data",
      icon: "assets/table.svg",
      iconClass: "segmented-control-btn-divider-left",
      disabled: rawDataDisabled
    }
  ];

  return `
    <div class="owner-detail-header-actions segmented-control" aria-label="Owner views">
      ${buttons.map((button) => {
        const isActive = isOwnerHeaderViewActive(button.view, ownerIndex);
        const rawIconClass = button.view === "raw" ? " raw-data-toggle-icon" : "";
        return `
          <button
            class="circle-btn segmented-control-btn owner-header-view-btn ${button.iconClass} ${isActive ? "is-active" : ""}"
            type="button"
            data-owner-header-view="${button.view}"
            data-owner-index="${ownerIndex}"
            aria-label="${button.label}"
            title="${button.title}"
            aria-pressed="${String(isActive)}"
            ${button.disabled ? "disabled aria-disabled=\"true\"" : ""}
          >
            <img class="toolbar-asset-icon${rawIconClass}" src="${button.icon}" alt="" aria-hidden="true">
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function syncOwnerHeaderViewState() {
  const headerButtons = Array.from(document.querySelectorAll(".owner-header-view-btn"));

  headerButtons.forEach((button) => {
    const ownerIndex = Number(button.dataset.ownerIndex);
    const view = button.dataset.ownerHeaderView;
    const isActive = !Number.isNaN(ownerIndex) && isOwnerHeaderViewActive(view, ownerIndex);

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function showOwnerMapView(ownerIndex) {
  activeMapOwnerIndex = ownerIndex;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  anchoredToolbarMode = null;
  anchoredToolbarOwnerIndex = null;
  globalRawDataViewOpen = false;

  openMapPanel("map");
  syncMapLocationFilter();
  renderOwners(displayedOwners);
  refreshChangedRows();
  syncOwnerHeaderViewState();
}

function showOwnerDetailView(ownerIndex) {
  anchoredToolbarMode = null;
  anchoredToolbarOwnerIndex = null;
  globalRawDataViewOpen = false;
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  openOwnerDetails(ownerIndex);
}

function handleOwnerHeaderViewButton(button) {
  const ownerIndex = Number(button.dataset.ownerIndex);
  const view = button.dataset.ownerHeaderView;
  if (Number.isNaN(ownerIndex) || button.disabled) return;
  if (isOwnerHeaderViewActive(view, ownerIndex)) {
    if (view === "raw") {
      closeOwnerRawData(ownerIndex);
      syncOwnerHeaderViewState();
    } else if (view === "map" || view === "org") {
      showOwnerDetailView(ownerIndex);
    }
    return;
  }

  if (view === "map") {
    showOwnerMapView(ownerIndex);
    return;
  }

  if (view === "org") {
    anchoredToolbarMode = null;
    anchoredToolbarOwnerIndex = null;
    globalRawDataViewOpen = false;
    activeRawOwnerIndex = null;
    openOwnerOrgChart(ownerIndex);
    syncOwnerHeaderViewState();
    return;
  }

  if (view === "raw") {
    anchoredToolbarMode = null;
    anchoredToolbarOwnerIndex = null;
    openOwnerRawData(ownerIndex);
    syncOwnerHeaderViewState();
  }
}

function getOwnerHeader(owner, { className = "", closeLabel = "Close owner panel", linksToDetail = false } = {}) {
  const logoMarkup = `
    <span class="owner-detail-logo" aria-hidden="true">
      <span>${getInitials(owner.ownerName)}</span>
      <img src="${owner.logoSrc}" alt="" onerror="this.style.display='none'">
    </span>
  `;
  const titleMarkup = `<span>${owner.ownerName}</span>`;
  const identityMarkup = linksToDetail
    ? `
      <button
        class="owner-header-owner-action owner-header-logo-action"
        type="button"
        data-owner-index="${owner.originalIndex}"
        aria-label="Open ${owner.ownerName} details"
      >
        ${logoMarkup}
      </button>
      <h2>
        <button
          class="owner-header-owner-action owner-header-name-action"
          type="button"
          data-owner-index="${owner.originalIndex}"
        >
          ${titleMarkup}
        </button>
      </h2>
    `
    : `
      <div class="owner-detail-logo" aria-hidden="true">
        <span>${getInitials(owner.ownerName)}</span>
        <img src="${owner.logoSrc}" alt="" onerror="this.style.display='none'">
      </div>
      <h2>${owner.ownerName}</h2>
    `;

  return `
    <header class="owner-detail-header ${className}">
      ${identityMarkup}
      ${getOwnerHeaderViewControls(owner)}
      <button class="owner-detail-close" type="button" aria-label="${closeLabel}">
        <img src="assets/close.svg" alt="" aria-hidden="true">
      </button>
    </header>
  `;
}

function syncOwnerMapHeader(mode = getCurrentPanelMode()) {
  if (!ownerMapHeader || !mapPanel) return;

  const owner = activeMapOwnerIndex !== null
    ? owners.find((item) => item.originalIndex === activeMapOwnerIndex)
    : null;
  const shouldShowHeader = mode === "map" && Boolean(owner);

  ownerMapHeader.hidden = !shouldShowHeader;
  mapPanel.classList.toggle("is-owner-map-filtered", shouldShowHeader);
  ownerMapHeader.innerHTML = shouldShowHeader
    ? getOwnerHeader(owner, {
        className: "owner-map-heading",
        closeLabel: "Clear owner map filter",
        linksToDetail: true
      })
    : "";
}

function isRawDataAvailable(owner) {
  return getOwnerRawRows(owner?.originalIndex).length > 0;
}

function getRawDataEmail(name, owner) {
  const domain = getEmailDomain(owner.email) || "example.com";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");

  return `${slug}@${domain}`;
}

function getRawDataPhone(ownerIndex, rowIndex) {
  const areaCodes = ["207", "773", "704", "980", "312", "646"];
  const areaCode = areaCodes[(ownerIndex + rowIndex) % areaCodes.length];
  const prefix = String(555 + ((ownerIndex * 17 + rowIndex * 29) % 350)).padStart(3, "0");
  const line = String(1000 + ((ownerIndex * 137 + rowIndex * 419) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getRawDataLocation(ownerIndex, rowIndex) {
  const locations = [
    "Charlotte, North Carolina",
    "Atlanta, Georgia",
    "Dallas, Texas",
    "Denver, Colorado",
    "Nashville, Tennessee",
    "Orlando, Florida"
  ];

  return locations[(ownerIndex + rowIndex) % locations.length];
}

function getProfileLocation(owner, fallbackLocation) {
  const ownerLocations = window.ownerLocationsData?.[owner.originalIndex]?.locations || [];
  const locationLabels = [
    ...new Set(ownerLocations.map((location) => location.label).filter(Boolean))
  ];

  return locationLabels.length ? locationLabels.slice(0, 4).join(", ") : fallbackLocation;
}

function getProfileTitle(owner, node) {
  return node.name === owner.contactName ? "Franchisee" : node.title;
}

function getOwnerRawRows(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChart(ownerIndex);
  if (!owner || !orgChart?.nodes?.length) return [];

  return orgChart.nodes.map((node, rowIndex) => ({
    ownerIndex: owner.originalIndex,
    nodeId: node.id,
    rowIndex,
    name: node.name,
    title: getProfileTitle(owner, node),
    ownerNames: [owner.ownerName],
    franchises: getOwnerFranchises(owner),
    location: getProfileLocation(owner, getRawDataLocation(ownerIndex, rowIndex)),
    email: getRawDataEmail(node.name, owner),
    phone: getRawDataPhone(ownerIndex, rowIndex)
  }));
}

function getPersonProfileFromRawRow(ownerIndex, rowIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const row = getOwnerRawRows(ownerIndex)[rowIndex];
  if (!owner || !row) return null;

  return {
    name: row.name,
    ownerName: owner.ownerName,
    title: row.title,
    email: row.email,
    phone: row.phone,
    location: row.location
  };
}

function getPersonProfileFromOrgNode(ownerIndex, nodeId) {
  const rows = getOwnerRawRows(ownerIndex);
  const rowIndex = rows.findIndex((row) => row.nodeId === nodeId);
  return rowIndex >= 0 ? getPersonProfileFromRawRow(ownerIndex, rowIndex) : null;
}

function renderPersonProfile(profile) {
  if (!profileModalContent) return;

  profileModalContent.innerHTML = `
    <div class="profile-modal-hero">
      <span class="profile-avatar" aria-hidden="true">${getInitials(profile.name)}</span>
      <h2 id="profileModalName">${profile.name}</h2>
      <p>${profile.ownerName}</p>
    </div>

    <div class="profile-modal-fields">
      <div class="profile-modal-field profile-modal-field-full">
        <span>Title</span>
        <strong>${profile.title}</strong>
      </div>
      <div class="profile-modal-field profile-modal-field-full">
        <span>Email</span>
        <a href="mailto:${profile.email}">${profile.email}</a>
      </div>
      <div class="profile-modal-field">
        <span>Phone number</span>
        <strong>${profile.phone}</strong>
      </div>
      <div class="profile-modal-field">
        <span>Location</span>
        <strong>${profile.location}</strong>
      </div>
    </div>

    <div class="profile-modal-actions">
      <button class="profile-modal-primary" type="button">Save as lead</button>
      <button class="profile-modal-secondary" type="button">Close</button>
    </div>
  `;
}

function openPersonProfile(profile, trigger = null) {
  if (!profile || !profileModal) return;

  lastProfileModalTrigger = trigger;
  renderPersonProfile(profile);
  profileModal.hidden = false;
  profileModal.classList.add("is-open");
  profileModal.querySelector(".profile-modal-close")?.focus();
}

function closePersonProfile() {
  if (!profileModal || profileModal.hidden) return;

  profileModal.classList.remove("is-open");
  profileModal.hidden = true;
  if (profileModalContent) profileModalContent.innerHTML = "";

  if (lastProfileModalTrigger instanceof HTMLElement) {
    lastProfileModalTrigger.focus({ preventScroll: true });
  }
  lastProfileModalTrigger = null;
}

function ownerMatchesOwnerFilter(owner) {
  if (!selectedOwnerIndex) return true;

  const ownerIndex = Number(selectedOwnerIndex);
  return ownerFilterExcludesSelection
    ? owner.originalIndex !== ownerIndex
    : owner.originalIndex === ownerIndex;
}

function getRawDataOwnerScope() {
  return owners.filter((owner) => (
    ownerMatchesOwnerFilter(owner) &&
    ownerMatchesFranchiseFilter(owner)
  ));
}

function getAllOwnerRawRows() {
  return getRawDataOwnerScope()
    .flatMap((owner) => getOwnerRawRows(owner.originalIndex))
    .filter((row) => rawRowMatchesFilters(row));
}

function setRawTableHeaders({ includeOwner = false } = {}) {
  if (!ownersTable || !tableWrap || ownerTableHeaders.length < 6) return;

  const rawHeaders = includeOwner
    ? [
        { html: `<span class="th-content raw-index-heading" aria-hidden="true">&nbsp;</span>`, width: "4%" },
        { html: `<span class="th-content">Name</span>`, width: "21%" },
        { html: `<span class="th-content">E-mail</span>`, width: "20%" },
        { html: `<span class="th-content">Phone number</span>`, width: "18%" },
        { html: `<span class="th-content">Location</span>`, width: "19%" },
        { html: `<span class="th-content">Franchise</span>`, width: "18%" }
      ]
    : [
        { html: `<span class="th-content raw-index-heading" aria-hidden="true">&nbsp;</span>`, width: "4%" },
        { html: `<span class="th-content">Name</span>`, width: "22%" },
        { html: `<span class="th-content">E-mail</span>`, width: "20%" },
        { html: `<span class="th-content">Phone number</span>`, width: "18%" },
        { html: `<span class="th-content">Location</span>`, width: "20%" },
        { html: `<span class="th-content">Franchise</span>`, width: "16%" }
      ];

  ownersTable.classList.add("raw-data-table");
  tableWrap.classList.add("is-raw-data-view");

  ownerTableHeaders.forEach((header, index) => {
    const rawHeader = rawHeaders[index];
    header.hidden = !rawHeader;
    header.classList.remove("sortable-header", "right");
    header.removeAttribute("aria-sort");
    header.removeAttribute("data-sort-key");

    if (rawHeader) {
      header.innerHTML = rawHeader.html;
      header.style.width = rawHeader.width;
    }
  });
}

function restoreOwnersTableView({ clearRaw = true, clearGlobalRaw = true } = {}) {
  if (clearRaw) {
    activeRawOwnerIndex = null;
  }

  if (clearGlobalRaw) {
    globalRawDataViewOpen = false;
  }

  ownersTable?.classList.remove("raw-data-table");
  tableWrap?.classList.remove("is-raw-data-view");

  defaultHeaderState.forEach((state) => {
    state.header.className = state.className;
    state.header.hidden = state.hidden;
    state.header.innerHTML = state.html;
    state.header.style.width = state.styleWidth;

    if (state.datasetSortKey) {
      state.header.dataset.sortKey = state.datasetSortKey;
    } else {
      state.header.removeAttribute("data-sort-key");
    }

    if (state.ariaSort) {
      state.header.setAttribute("aria-sort", state.ariaSort);
    } else {
      state.header.removeAttribute("aria-sort");
    }
  });

  syncModeColumn();
  syncSortHeaders();
  syncToolbarTabState(getCurrentPanelMode());
}

function renderRawOwnerTable(ownerIndex) {
  if (!tableBody) return;

  const rows = getOwnerRawRows(ownerIndex);
  activeRawOwnerIndex = ownerIndex;
  globalRawDataViewOpen = false;
  setRawTableHeaders();

  tableBody.innerHTML = rows
    .map((row, rowIndex) => `
      <tr class="raw-data-row" data-owner-index="${row.ownerIndex}" data-raw-row-index="${row.rowIndex}">
        <td class="raw-index-cell">${rowIndex + 1}</td>
        <td>
          <div class="raw-name-cell">
            <span class="raw-avatar" aria-hidden="true">${getInitials(row.name)}</span>
            <span class="raw-name">${row.name}</span>
          </div>
        </td>
        <td><span class="raw-email">${row.email}</span></td>
        <td><span class="raw-phone">${row.phone}</span></td>
        <td><span class="raw-location">${row.location}</span></td>
        <td><span class="raw-franchise">${row.franchises.join(", ")}</span></td>
      </tr>
    `)
    .join("");

  tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  syncStickyNameColumnDivider();
}

function renderGlobalRawDataTable({ keepPanelOpen = false, activeOwnerIndex = null } = {}) {
  if (!tableBody) return;

  const panelMode = getCurrentPanelMode();
  const shouldKeepPanelOpen = keepPanelOpen || (
    card?.classList.contains("is-map-open") &&
    (panelMode === "map" || panelMode === "org")
  );

  globalRawDataViewOpen = true;
  activeRawOwnerIndex = activeOwnerIndex;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = panelMode === "org" ? activeOwnerIndex : null;
  activeMapOwnerIndex = panelMode === "map" ? activeOwnerIndex : null;

  if (!shouldKeepPanelOpen) {
    card?.classList.remove("is-map-open");
    mapToggle?.setAttribute("aria-expanded", "false");
    setPanelMode("map");
  }

  syncMapLocationFilter();
  setRawTableHeaders({ includeOwner: true });

  tableBody.innerHTML = getAllOwnerRawRows()
    .map((row, rowIndex) => `
      <tr class="raw-data-row" data-owner-index="${row.ownerIndex}" data-raw-row-index="${row.rowIndex}">
        <td class="raw-index-cell">${rowIndex + 1}</td>
        <td>
          <div class="raw-name-cell">
            <span class="raw-avatar" aria-hidden="true">${getInitials(row.name)}</span>
            <span class="raw-name">${row.name}</span>
          </div>
        </td>
        <td><span class="raw-email">${row.email}</span></td>
        <td><span class="raw-phone">${row.phone}</span></td>
        <td><span class="raw-location">${row.location}</span></td>
        <td><span class="raw-franchise">${row.franchises.join(", ")}</span></td>
      </tr>
    `)
    .join("");

  tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  refreshChangedRows();
  syncStickyNameColumnDivider();
  syncToolbarTabState(getCurrentPanelMode());
}

function refreshFilteredViews() {
  if (globalRawDataViewOpen) {
    sortOwners();
    renderGlobalRawDataTable();
    updateFilterSummary();
    return;
  }

  applySort();
}

function refitOpenMapToVisibleLocations() {
  const mapModeOpen =
    card?.classList.contains("is-map-open") &&
    !mapPanel?.classList.contains("is-details-mode") &&
    !mapPanel?.classList.contains("is-org-mode");
  if (!mapModeOpen) return;
  resizeOwnersMap();
  fitOwnersMapToVisibleLocations();
}

function openOwnerRawData(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!isRawDataAvailable(owner)) return;

  renderGlobalRawDataTable({ keepPanelOpen: true, activeOwnerIndex: ownerIndex });
}

function closeOwnerRawData(ownerIndex) {
  const panelMode = getCurrentPanelMode();

  globalRawDataViewOpen = false;
  activeRawOwnerIndex = null;
  activeMapOwnerIndex = panelMode === "map" ? ownerIndex : null;
  activeDetailOwnerIndex = panelMode === "details" ? ownerIndex : null;
  activeOrgOwnerIndex = panelMode === "org" ? ownerIndex : null;

  applySort();
}

function syncOwnerHeaderScrollState() {
  if (!ownerDetailsPanel) return;

  ownerDetailsPanel.classList.toggle("is-scrolled", ownerDetailsPanel.scrollTop > 0);
}

function renderOwnerDetails(owner) {
  if (!ownerDetailsPanel) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  const website = getOwnerWebsite(owner);
  const franchises = getOwnerFranchises(owner);
  const franchiseMarkup = franchises
    .map(
      (franchise) => `
        <div class="owner-detail-franchise">
          <span class="owner-detail-franchise-logo">
            <span class="owner-detail-franchise-logo-fallback">${getInitials(franchise)}</span>
            <img
              src="${getFranchiseLogoSrc(franchise)}"
              alt="${franchise} logo"
              onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
            >
          </span>
          <span>${franchise}</span>
        </div>
      `
    )
    .join("");

  ownerDetailsPanel.innerHTML = `
    <article class="owner-detail-card">
      ${getOwnerHeader(owner, { closeLabel: "Close owner details" })}

      <section class="owner-detail-section owner-detail-contact">
        <h3>Contact</h3>
        <p>${owner.contactName}</p>
        <span class="owner-detail-email">${owner.email}</span>
      </section>

      <section class="owner-detail-section">
        <h3>Website</h3>
        <a href="${getOwnerWebsiteUrl(owner)}" target="_blank" rel="noreferrer">${website}</a>

        <h3 class="owner-detail-subtitle">Linkedin</h3>
        <a href="${getOwnerLinkedinUrl(owner)}" target="_blank" rel="noreferrer">${owner.ownerName}</a>
      </section>

      <section class="owner-detail-section">
        <h3>Franchises</h3>
        <div class="owner-detail-franchises">${franchiseMarkup}</div>
      </section>

      <section class="owner-detail-section owner-detail-location-section">
        <div class="owner-detail-locations-header">
          <div>
            <h3>Locations</h3>
            <p>${owner.locations}</p>
          </div>
          <button class="owner-detail-map-link" type="button" data-owner-index="${owner.originalIndex}">
            Filter in Map
          </button>
        </div>
        <div class="owner-detail-map" id="ownerDetailsMap"></div>
      </section>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function getOwnerOrgChart(ownerIndex) {
  return (window.ownerOrgChartData || [])[ownerIndex] || null;
}

function getOrgReports(nodes, parentId) {
  return nodes.filter((node) => node.reportsTo === parentId);
}

function getOrgDirectReportCount(nodes, nodeId) {
  return getOrgReports(nodes, nodeId).length;
}

function getOrgCollapsedSet(ownerIndex) {
  if (!orgCollapsedNodeIdsByOwner.has(ownerIndex)) {
    orgCollapsedNodeIdsByOwner.set(ownerIndex, new Set());
  }

  return orgCollapsedNodeIdsByOwner.get(ownerIndex);
}

function isOrgNodeCollapsed(ownerIndex, nodeId) {
  return getOrgCollapsedSet(ownerIndex).has(nodeId);
}

function getOrgExpandableSiblingIds(nodes, nodeId) {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return [];

  return nodes
    .filter((item) => item.reportsTo === node.reportsTo && getOrgDirectReportCount(nodes, item.id) > 0)
    .map((item) => item.id);
}

function normalizeOrgExpandedSiblings(ownerIndex, nodes) {
  const collapsedSet = getOrgCollapsedSet(ownerIndex);
  const expandedNodeIdByParent = new Map();

  nodes.forEach((node) => {
    if (getOrgDirectReportCount(nodes, node.id) === 0 || collapsedSet.has(node.id)) return;

    const parentId = node.reportsTo || "__root__";
    if (expandedNodeIdByParent.has(parentId)) {
      collapsedSet.add(node.id);
      return;
    }

    expandedNodeIdByParent.set(parentId, node.id);
  });
}

function isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes) {
  const expandedSibling = nodes.find((item) => (
    item.reportsTo === node.reportsTo &&
    getOrgDirectReportCount(nodes, item.id) > 0 &&
    !isOrgNodeCollapsed(ownerIndex, item.id)
  ));

  return Boolean(expandedSibling && expandedSibling.id !== node.id);
}

function toggleOrgNodeCollapsed(ownerIndex, nodeId, nodes = []) {
  const collapsedSet = getOrgCollapsedSet(ownerIndex);
  const changedNodeIds = new Set([nodeId]);

  if (collapsedSet.has(nodeId)) {
    getOrgExpandableSiblingIds(nodes, nodeId).forEach((siblingId) => {
      if (siblingId !== nodeId) {
        collapsedSet.add(siblingId);
        changedNodeIds.add(siblingId);
      }
    });

    collapsedSet.delete(nodeId);
  } else {
    collapsedSet.add(nodeId);
  }

  return [...changedNodeIds];
}

function syncOrgInactiveCards(ownerIndex, nodes) {
  if (!ownerDetailsPanel) return;

  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerDetailsPanel
    .querySelectorAll(`[data-owner-index="${escapedOwnerIndex}"][data-org-card-id]`)
    .forEach((card) => {
      if (!(card instanceof HTMLElement)) return;

      const node = nodes.find((item) => item.id === card.dataset.orgCardId);
      if (!node) return;

      card.classList.toggle("is-inactive-branch", isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes));
    });
}

function syncOrgCollapsedUi(ownerIndex, nodeId) {
  if (!ownerDetailsPanel) return;

  const isCollapsed = isOrgNodeCollapsed(ownerIndex, nodeId);
  const escapedNodeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(nodeId) : nodeId;
  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerDetailsPanel
    .querySelectorAll(`[data-owner-index="${escapedOwnerIndex}"][data-org-node-id="${escapedNodeId}"]`)
    .forEach((toggleButton) => {
      if (!(toggleButton instanceof HTMLElement)) return;
      toggleButton.classList.toggle("is-collapsed", isCollapsed);
      toggleButton.classList.toggle("is-expanded", !isCollapsed);
      toggleButton.setAttribute("aria-expanded", String(!isCollapsed));

      if (toggleButton.classList.contains("org-collapse-button")) {
        toggleButton.innerHTML = `
          ${isCollapsed ? "Expand" : "Collapse"}
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        `;
      }
    });

  const section = ownerDetailsPanel.querySelector(`.org-report-section[data-org-node-id="${escapedNodeId}"]`);
  if (!section) return;

  section.classList.toggle("is-collapsed", isCollapsed);

  const content = section.querySelector(".org-report-section-content");
  if (content) {
    content.classList.toggle("is-collapsed", isCollapsed);
    content.classList.toggle("is-expanded", !isCollapsed);
  }
}

function getOrgCard(node, type = "default", nodes = [], ownerIndex = null) {
  const directReportCount = getOrgDirectReportCount(nodes, node.id);
  const isCollapsed = ownerIndex !== null && isOrgNodeCollapsed(ownerIndex, node.id);
  const isInactiveBranch = ownerIndex !== null && isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes);

  return `
    <article
      class="org-person-card org-person-card-${type} ${isInactiveBranch ? "is-inactive-branch" : ""}"
      data-owner-index="${ownerIndex}"
      data-org-card-id="${node.id}"
      role="button"
      tabindex="0"
      aria-label="Open ${node.name} profile"
    >
      <div class="org-person-avatar" aria-hidden="true">${getInitials(node.name)}</div>
      <h3>${node.name}</h3>
      <p>${node.title}</p>
      ${directReportCount > 0 ? `
        <button
          class="org-report-count org-report-count-${type} ${isCollapsed ? "is-collapsed" : "is-expanded"}"
          type="button"
          data-org-node-id="${node.id}"
          data-owner-index="${ownerIndex}"
          aria-expanded="${String(!isCollapsed)}"
          aria-label="${isCollapsed ? "Expand" : "Collapse"} reports for ${node.name}"
        >
          ${directReportCount}
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        </button>
      ` : ""}
    </article>
  `;
}

function getOrgBranchHeader(node, ownerIndex) {
  const isCollapsed = isOrgNodeCollapsed(ownerIndex, node.id);

  return `
    <div class="org-branch-header">
      <div class="org-branch-person">
        <span class="org-branch-avatar" aria-hidden="true">${getInitials(node.name)}</span>
        <span>${node.name}</span>
      </div>
      <button
        class="org-collapse-button ${isCollapsed ? "is-collapsed" : "is-expanded"}"
        type="button"
        data-org-node-id="${node.id}"
        data-owner-index="${ownerIndex}"
        aria-expanded="${String(!isCollapsed)}"
        aria-label="${isCollapsed ? "Expand" : "Collapse"} reports for ${node.name}"
      >
        ${isCollapsed ? "Expand" : "Collapse"}
        <img src="assets/chevron.svg" alt="" aria-hidden="true">
      </button>
    </div>
  `;
}

function getOrgTreeSection(parentNode, nodes, ownerIndex, depth = 0) {
  const directReports = getOrgReports(nodes, parentNode.id);
  if (!directReports.length) return "";

  const cardType = depth === 0 ? "primary" : "child";
  const isCollapsed = isOrgNodeCollapsed(ownerIndex, parentNode.id);

  return `
    <section class="org-report-section ${depth > 0 ? "org-report-section-nested" : ""} ${isCollapsed ? "is-collapsed" : ""}" data-org-node-id="${parentNode.id}">
      <span class="org-vertical-line" aria-hidden="true"></span>
      ${getOrgBranchHeader(parentNode, ownerIndex)}
      <div class="org-report-section-content ${isCollapsed ? "is-collapsed" : "is-expanded"}">
        <div class="org-node-row org-node-row-children">
        ${directReports.map((node) => getOrgCard(node, cardType, nodes, ownerIndex)).join("")}
        </div>
        ${directReports.map((node) => getOrgTreeSection(node, nodes, ownerIndex, depth + 1)).join("")}
      </div>
    </section>
  `;
}

function renderOwnerOrgChart(ownerIndex) {
  if (!ownerDetailsPanel) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChart(ownerIndex);
  if (!owner || !orgChart?.nodes?.length) return;

  const nodes = orgChart.nodes;
  normalizeOrgExpandedSiblings(ownerIndex, nodes);
  const rootNodes = getOrgReports(nodes, null);

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel">
      ${getOwnerHeader(owner, {
        className: "owner-org-header",
        closeLabel: "Close organization chart",
        linksToDetail: true
      })}

      <div class="owner-org-chart" aria-label="${owner.ownerName} organization chart">
        <div class="org-node-row org-node-row-roots">
          ${rootNodes.map((node) => getOrgCard(node, "root", nodes, ownerIndex)).join("")}
        </div>

        ${rootNodes.map((node) => getOrgTreeSection(node, nodes, ownerIndex)).join("")}
      </div>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function renderDefaultOrgChartState() {
  if (!ownerDetailsPanel) return;

  const selectableOwners = displayedOwners.length ? displayedOwners : owners;
  const canUseSelectedOwner = Boolean(selectedOwnerIndex) && !ownerFilterExcludesSelection;
  const selectedValue = canUseSelectedOwner ? selectedOwnerIndex : "";
  const options = selectableOwners
    .map((owner) => {
      const value = String(owner.originalIndex);
      const isSelected = value === selectedValue ? " selected" : "";
      return `<option value="${value}"${isSelected}>${owner.ownerName}</option>`;
    })
    .join("");

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel owner-org-panel-empty">
      <div class="owner-org-selector">
        <label for="orgOwnerPicker">
          <span>Select owner</span>
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        </label>
        <select id="orgOwnerPicker" aria-label="Select owner for organization chart">
          <option value="">Select owner</option>
          ${options}
        </select>
      </div>
      <p class="owner-org-empty-message">
        Select an
        <button type="button" class="owner-org-inline-trigger" data-open-org-owner-picker>owner</button><br>
        to load their organization chart.
      </p>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function openToolbarOrgChart() {
  const selectedOwner = selectedOwnerIndex && !ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null;
  const ownerIndexToOpen = activeOrgOwnerIndex ?? activeDetailOwnerIndex ?? selectedOwner;

  if (ownerIndexToOpen !== null && !Number.isNaN(ownerIndexToOpen)) {
    openOwnerOrgChart(ownerIndexToOpen);
    return;
  }

  activeMapOwnerIndex = null;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  openMapPanel("org");
  renderDefaultOrgChartState();
  renderOwners(displayedOwners);
  refreshChangedRows();
}

function syncOpenOrgPanelWithSelection() {
  const isOrgPanelOpen = card?.classList.contains("is-map-open") && mapPanel?.classList.contains("is-org-mode");
  if (!isOrgPanelOpen) return;

  const selectedOwner = selectedOwnerIndex && !ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null;
  if (selectedOwner !== null && !Number.isNaN(selectedOwner)) {
    if (activeOrgOwnerIndex !== selectedOwner) {
      openOwnerOrgChart(selectedOwner);
    }
    return;
  }

  if (activeOrgOwnerIndex === null) {
    renderDefaultOrgChartState();
  }
}

function openOwnerOrgChart(ownerIndex, { scrollTable = false, updateAnchoredOwner = true } = {}) {
  const shouldKeepRawTable = globalRawDataViewOpen;

  if (activeOrgOwnerIndex === ownerIndex) {
    if (anchoredToolbarMode === "org") {
      if (updateAnchoredOwner) {
        anchoredToolbarOwnerIndex = ownerIndex;
      }
      renderOwnerOrgChart(ownerIndex);
      openMapPanel("org", { scrollTable });
      if (shouldKeepRawTable) {
        renderGlobalRawDataTable({ keepPanelOpen: true });
      } else {
        renderOwners(displayedOwners);
        refreshChangedRows();
      }
      return;
    }

    if (closeMapPanel()) return;
    syncMapLocationFilter();
    if (shouldKeepRawTable) {
      renderGlobalRawDataTable();
    } else {
      renderOwners(displayedOwners);
      refreshChangedRows();
    }
    return;
  }

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return;

  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = ownerIndex;
  if (anchoredToolbarMode === "org" && updateAnchoredOwner) {
    anchoredToolbarOwnerIndex = ownerIndex;
  }
  activeDetailOwnerIndex = null;
  activeRawOwnerIndex = null;
  syncMapLocationFilter();
  renderOwnerOrgChart(ownerIndex);
  openMapPanel("org", { scrollTable });
  if (shouldKeepRawTable) {
    renderGlobalRawDataTable({ keepPanelOpen: true });
  } else {
    renderOwners(displayedOwners);
    refreshChangedRows();
  }
}

function initializeOwnerDetailsMap(ownerIndex) {
  if (!window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  const mapContainer = document.getElementById("ownerDetailsMap");
  if (!mapContainer) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  ownerDetailsMapOwnerIndex = ownerIndex;
  const coordinates = getMapPointFeatures(ownerIndex).map((feature) => feature.geometry.coordinates);
  const bounds = getMapBoundsForCoordinates(coordinates);
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  ownerDetailsMap = new mapboxgl.Map({
    container: mapContainer,
    style: MAPBOX_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: 3,
    bounds: bounds || undefined,
    fitBoundsOptions: {
      padding: 30,
      maxZoom: 8.6
    },
    attributionControl: false,
    logoPosition: "bottom-right",
    interactive: false
  });

  ownerDetailsMap.on("load", () => {
    ownerDetailsMap.addSource("owner-detail-points", {
      type: "geojson",
      data: getOwnerMapPointFeatureCollection(ownerIndex)
    });

    ownerDetailsMap.addLayer({
      id: "owner-detail-points",
      type: "circle",
      source: "owner-detail-points",
      paint: {
        "circle-radius": 4.5,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.88,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });
  });
}

function openOwnerDetails(ownerIndex) {
  const isSameOwnerDetailsOpen =
    activeDetailOwnerIndex === ownerIndex &&
    card?.classList.contains("is-map-open") &&
    mapPanel?.classList.contains("is-details-mode");

  if (isSameOwnerDetailsOpen) {
    if (closeMapPanel()) return;
    renderOwners(displayedOwners);
    refreshChangedRows();
    return;
  }

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return;

  activeDetailOwnerIndex = ownerIndex;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  renderOwnerDetails(owner);
  openMapPanel("details");
  initializeOwnerDetailsMap(ownerIndex);
  renderOwners(displayedOwners);
  refreshChangedRows();
}

function getOwnerIcon(type, enabled) {
  const color = enabled ? activeIconColor : inactiveIconColor;

  if (type === "web") {
    return `
      <svg class="icon icon-web" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path fill="${color}" d="M10,11.28h-4.01c.38,1.6,1.06,3.11,2,4.45.94-1.34,1.62-2.85,2-4.45ZM4.35,4.72c.35-1.67.99-3.27,1.88-4.72C3.75.58,1.69,2.33.67,4.72h3.67ZM5.6,8c0,.55.04,1.1.1,1.64h4.6c.07-.54.1-1.09.1-1.64,0-.55-.04-1.1-.1-1.64h-4.6c-.07.54-.1,1.09-.1,1.64ZM11.65,4.72h3.67c-1.02-2.39-3.08-4.13-5.56-4.72.89,1.45,1.53,3.04,1.88,4.72ZM6,4.72h4.01c-.38-1.6-1.06-3.11-2-4.45-.94,1.34-1.62,2.85-2,4.45ZM11.65,11.28c-.35,1.67-.99,3.27-1.88,4.72,2.47-.58,4.54-2.33,5.56-4.72h-3.67ZM11.91,6.36c.06.55.09,1.09.09,1.64,0,.55-.03,1.1-.09,1.64h3.93c.22-1.08.22-2.2,0-3.28h-3.93ZM4.35,11.28H.67c1.02,2.39,3.08,4.13,5.56,4.72-.89-1.45-1.53-3.04-1.88-4.72ZM4.09,9.64c-.06-.55-.09-1.09-.09-1.64,0-.55.03-1.1.09-1.64H.16c-.22,1.08-.22,2.2,0,3.28h3.93Z"/>
      </svg>
    `;
  }

  return `
    <svg class="icon icon-linkedin" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fill="${color}" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0ZM6.78,13h-1.78v-5.98h1.78v5.98ZM5.92,6.2c-.59,0-1.07-.4-1.07-.99s.48-1.08,1.07-1.08,1,.48,1,1.08-.41.99-1,.99ZM13.51,13h-1.85v-2.91c0-.69-.01-1.59-.96-1.59s-1.11.76-1.11,1.54v2.96h-1.85v-5.98h1.78v.82h.03c.25-.47.85-.97,1.76-.97,1.87,0,2.22,1.24,2.22,2.85v3.28Z"/>
    </svg>
  `;
}

function getAddedBadge(count) {
  return count > 0 ? `<span class="added-count">+${count}</span>` : "";
}

function showsContactUpdates() {
  return updatesEnabled;
}

function ownerHasContactUpdate(owner) {
  return owner.addedContacts > 0 || owner.addedLocations > 0;
}

function getContactsColumn(owner) {
  return `
    <button
      class="contacts-action ${activeOrgOwnerIndex === owner.originalIndex ? "is-active" : ""}"
      type="button"
      data-owner-index="${owner.originalIndex}"
      aria-pressed="${activeOrgOwnerIndex === owner.originalIndex}"
      aria-label="Show ${owner.ownerName} organization chart"
    >
      <span>${owner.contacts}</span>
      ${showsContactUpdates() ? getAddedBadge(owner.addedContacts) : ""}
      <img class="contact-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
    </button>
  `;
}

function formatModifiedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
}

function getModeColumn(owner) {
  return `<span class="modified-date">${formatModifiedDate(owner.modified)}</span>`;
}

function ownerHasVisibleChange(owner) {
  if (!updatesEnabled) return false;
  return owner.changed || ownerHasContactUpdate(owner);
}

function syncUpdatesToggleOption() {
  if (!updatesToggleOption) return;
  updatesToggleOption.setAttribute("aria-checked", String(updatesEnabled));
}

function syncUpdatesStateClass() {
  if (!card) return;
  card.classList.toggle("updates-disabled", !updatesEnabled);
}

function syncModifiedColumnToggleOption() {
  if (!modifiedColumnToggleOption) return;
  modifiedColumnToggleOption.setAttribute("aria-checked", String(modifiedColumnVisible));
}

function syncReduceMotionToggleOption() {
  if (!reduceMotionToggleOption) return;
  reduceMotionToggleOption.setAttribute("aria-checked", String(reduceMotionEnabled));
}

function syncReduceMotionStateClass() {
  document.body.classList.toggle("reduce-motion", reduceMotionEnabled);
}

function syncColumnWidths() {
  const widths = modifiedColumnVisible ? columnWidths : columnWidthsWithoutModified;

  ownerColumnHeader.style.width = widths.owner;
  contactColumnHeader.style.width = widths.contact;
  franchiseColumnHeader.style.width = widths.franchise;
  locationsColumnHeader.style.width = widths.locations;

  if (modifiedColumnVisible) {
    modeColumnHeader.style.width = widths.mode;
  }

  if (combinedContactsHeader) {
    combinedContactsHeader.style.width = widths.contacts;
  }
}

function syncModeColumn() {
  modeColumnHeader.dataset.sortKey = "modified";
  const currentModeColumnLabel = document.getElementById("modeColumnLabel") || modeColumnLabel;
  currentModeColumnLabel.textContent = "Modified";
  modeColumnHeader.classList.toggle("right", modifiedColumnVisible);
  modeColumnHeader.hidden = !modifiedColumnVisible;
  combinedContactsHeader.hidden = false;
  syncColumnWidths();
  syncModifiedColumnToggleOption();
}

function renderOwners(rows) {
  restoreOwnersTableView();

  tableBody.innerHTML = rows
    .map(
      (owner) => `
        <tr
          class="${ownerHasVisibleChange(owner) ? "changed" : ""} ${activeDetailOwnerIndex === owner.originalIndex || activeOrgOwnerIndex === owner.originalIndex || activeRawOwnerIndex === owner.originalIndex ? "is-selected" : ""}"
          data-owner-index="${owner.originalIndex}"
        >
          <td>
            <div class="name-cell">
              <div class="logo">
                <img src="${owner.logoSrc}" alt="${owner.logoAlt}">
              </div>
              <div class="owner-meta">
                <div class="owner-name">${owner.ownerName}</div>
                <div class="icons">
                  ${getOwnerIcon("web", owner.hasWebsite)}
                  ${getOwnerIcon("linkedin", owner.hasLinkedin)}
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="contact-name">${owner.contactName}</span>
            <span class="email">${owner.email}</span>
          </td>
          <td><span class="franchise-text">${owner.franchise}</span></td>
          ${modifiedColumnVisible ? `<td class="modified-cell">${getModeColumn(owner)}</td>` : ""}
          <td class="contacts-mode-cell">${getContactsColumn(owner)}</td>
          <td>
            <button
              class="locations ${activeMapOwnerIndex === owner.originalIndex ? "is-active" : ""}"
              type="button"
              data-owner-index="${owner.originalIndex}"
              aria-pressed="${activeMapOwnerIndex === owner.originalIndex}"
              aria-label="Show ${owner.ownerName} locations on the map"
            >
              <span>${owner.locations}</span>
              ${showsContactUpdates() ? getAddedBadge(owner.addedLocations) : ""}
              <img class="location-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

function getSortValue(owner, key) {
  if (key === "modified") return new Date(owner.modified).getTime();
  if (key === "contacts") return owner.contacts;
  if (key === "locations") return owner.locations;
  if (key === "franchise") return getFranchiseCount(owner);
  return owner[key] || "";
}

function getFranchiseCount(owner) {
  return owner.franchise
    .split(",")
    .map((franchise) => franchise.trim())
    .filter(Boolean).length;
}

function getNameSortGroup(owner) {
  if (owner.hasWebsite && owner.hasLinkedin) return 0;
  if (owner.hasWebsite && !owner.hasLinkedin) return 1;
  if (!owner.hasWebsite && owner.hasLinkedin) return 2;
  return 3;
}

function getInitialSortDirection(sortKey) {
  if (sortKey === "modified" || sortKey === "contacts" || sortKey === "locations" || sortKey === "franchise") {
    return "descending";
  }

  return "ascending";
}

function getContactsModeSortPriority(owner, sortKey) {
  if (sortKey === "contacts") return owner.addedContacts > 0 ? 0 : 1;
  return 0;
}

function compareLocationsForCurrentCycle(a, b) {
  const aHasLocationChange = a.addedLocations > 0;
  const bHasLocationChange = b.addedLocations > 0;

  // Initial/default locations sort: pure highest-to-lowest count.
  if (!locationSortCycleActive && sortState.direction === "descending") {
    const defaultComparison = b.locations - a.locations;
    if (defaultComparison !== 0) return defaultComparison;
    return a.originalIndex - b.originalIndex;
  }

  if (sortState.direction === "ascending") {
    // First click from default: unchanged rows first, then lowest counts.
    if (aHasLocationChange !== bHasLocationChange) {
      return aHasLocationChange ? 1 : -1;
    }
    const ascendingComparison = a.locations - b.locations;
    if (ascendingComparison !== 0) return ascendingComparison;
    return a.originalIndex - b.originalIndex;
  }

  // Next click: changed rows first (low-to-high), unchanged rows high-to-low.
  if (aHasLocationChange !== bHasLocationChange) {
    return aHasLocationChange ? -1 : 1;
  }

  const mixedComparison = aHasLocationChange
    ? a.locations - b.locations
    : b.locations - a.locations;

  if (mixedComparison !== 0) return mixedComparison;
  return a.originalIndex - b.originalIndex;
}

function ownerHasLocationLabel(owner, locationLabel) {
  if (!locationLabel) return true;

  const ownerLocations = window.ownerLocationsData?.[owner.originalIndex]?.locations || [];
  return ownerLocations.some((location) => location.label === locationLabel);
}

function ownerMatchesFranchiseFilter(owner) {
  if (!selectedFranchiseIndex) return true;

  const ownerFranchises = getOwnerFranchises(owner);
  const hasFranchise = ownerFranchises.includes(selectedFranchiseIndex);
  return franchiseFilterExcludesSelection ? !hasFranchise : hasFranchise;
}

function rawRowMatchesFilters(row) {
  if (selectedLocationLabel && row.location !== selectedLocationLabel) return false;
  if (!selectedFranchiseIndex) return true;

  const hasFranchise = row.franchises.includes(selectedFranchiseIndex);
  return franchiseFilterExcludesSelection ? !hasFranchise : hasFranchise;
}

function getFilteredOwners() {
  return owners.filter((owner) => {
    if (!ownerHasLocationLabel(owner, selectedLocationLabel)) return false;
    if (!ownerMatchesFranchiseFilter(owner)) return false;
    return ownerMatchesOwnerFilter(owner);
  });
}

function sortOwners() {
  const filteredOwners = getFilteredOwners();

  if (!sortState.key) {
    displayedOwners = filteredOwners.sort((a, b) => a.originalIndex - b.originalIndex);
    return;
  }

  const direction = sortState.direction === "ascending" ? 1 : -1;

  displayedOwners = filteredOwners.sort((a, b) => {
    if (sortState.key === "ownerName") {
      const groupComparison = getNameSortGroup(a) - getNameSortGroup(b);

      if (groupComparison !== 0) {
        return groupComparison * direction;
      }

      const nameComparison = collator.compare(a.ownerName, b.ownerName);

      if (nameComparison !== 0) {
        return nameComparison * direction;
      }

      return a.originalIndex - b.originalIndex;
    }

    if (sortState.key === "franchise") {
      const franchiseCountComparison = getFranchiseCount(a) - getFranchiseCount(b);

      if (franchiseCountComparison !== 0) {
        return franchiseCountComparison * direction;
      }

      const franchiseNameComparison = collator.compare(a.franchise, b.franchise);

      if (franchiseNameComparison !== 0) {
        return franchiseNameComparison * direction;
      }

      return a.originalIndex - b.originalIndex;
    }

    if (sortState.key === "locations") {
      return compareLocationsForCurrentCycle(a, b);
    }

    const priorityComparison =
      getContactsModeSortPriority(a, sortState.key) - getContactsModeSortPriority(b, sortState.key);

    if (priorityComparison !== 0) {
      return priorityComparison;
    }

    const valueA = getSortValue(a, sortState.key);
    const valueB = getSortValue(b, sortState.key);

    let comparison;

    if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else {
      comparison = collator.compare(String(valueA), String(valueB));
    }

    if (comparison === 0) {
      return a.originalIndex - b.originalIndex;
    }

    return comparison * direction;
  });
}

function updateFilterSummary() {
  if (!filterSummary) return;

  const visibleCount = displayedOwners.length;
  const totalCount = owners.length;
  const visibleRange = visibleCount > 0 ? `1-${visibleCount}` : "0";
  filterSummary.textContent = `Showing ${visibleRange} of ${totalCount} franchisees sorted by relevancy`;
  updateClearFiltersButton();
}

function getAppliedFilterCount() {
  const selectedFilterCount = [
    selectedLocationLabel,
    selectedCategoryIndex,
    selectedOwnerIndex,
    selectedFranchiseIndex
  ].filter(Boolean).length;
  const selectedStatusCount = statusFilterInputs.filter((checkbox) => checkbox.checked).length;

  return selectedFilterCount + selectedStatusCount;
}

function updateClearFiltersButton() {
  const appliedFilterCount = getAppliedFilterCount();
  const hasAppliedFilters = appliedFilterCount > 0;

  if (clearAllFilters) {
    clearAllFilters.textContent = hasAppliedFilters
      ? `Clear all (${appliedFilterCount})`
      : "Clear all";
    clearAllFilters.setAttribute(
      "aria-label",
      hasAppliedFilters
        ? `Clear all filters (${appliedFilterCount} applied)`
        : "Clear all filters"
    );
  }

  if (filterToggleLabel) {
    filterToggleLabel.textContent = hasAppliedFilters
      ? `Filters (${appliedFilterCount})`
      : "Filters";
  }
}

function syncSortHeaders() {
  sortHeaders.forEach((header) => {
    const isActive = header.dataset.sortKey === sortState.key;
    header.setAttribute("aria-sort", isActive ? sortState.direction : "none");
  });
}

function updateHeaderState() {
  const updatedCount = owners.filter((owner) => ownerHasVisibleChange(owner)).length;
  const totalCount = owners.length;
  const hasUpdates = updatedCount > 0;

  if (subtitle) {
    subtitle.textContent = hasUpdates
      ? `${updatedCount} of ${totalCount} records updated`
      : `${totalCount} records up to date`;

    subtitle.classList.toggle("is-resolved", !hasUpdates);
  }

  if (changeNav) changeNav.hidden = !hasUpdates;
  if (markRead) markRead.hidden = !hasUpdates;
  if (pager) pager.hidden = !hasUpdates;
}

function applySort() {
  changeNavEngaged = false;
  clearTimeout(activeHighlightTimeout);
  sortOwners();
  renderOwners(displayedOwners);
  refreshChangedRows();
  syncSortHeaders();
  updateFilterSummary();
  updateHeaderState();

  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
  }
}

function refreshChangedRows() {
  changedRows = Array.from(document.querySelectorAll("tr.changed"));
  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
    return;
  }
  if (changeNavEngaged) {
    activeIndex = Math.min(activeIndex, changedRows.length - 1);
    setChangePositionLabel(`${activeIndex + 1} / ${changedRows.length}`);
  } else {
    setChangePositionLabel(`0 / ${changedRows.length}`);
  }
}

function syncStickyNameColumnDivider() {
  if (!tableWrap) return;
  const hasHorizontalOverflow = tableWrap.scrollWidth > tableWrap.clientWidth;
  const hasLeftOverlap = tableWrap.scrollLeft > 0;
  const hasVerticalOverflow = tableWrap.scrollHeight > tableWrap.clientHeight;
  const hasTopOverlap = tableWrap.scrollTop > 0;
  tableWrap.classList.toggle("is-name-column-overlap", hasHorizontalOverflow && hasLeftOverlap);
  tableWrap.classList.toggle("is-header-row-overlap", hasVerticalOverflow && hasTopOverlap);
}

function advanceChangeRow(delta) {
  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
    return;
  }

  if (!changeNavEngaged) {
    changeNavEngaged = true;
    activeIndex = delta > 0 ? 0 : changedRows.length - 1;
  } else {
    activeIndex = (activeIndex + delta + changedRows.length) % changedRows.length;
  }

  changedRows.forEach((row) => {
    row.classList.remove("is-active");
  });

  const activeRow = changedRows[activeIndex];
  activeRow.classList.add("is-active");
  clearTimeout(activeHighlightTimeout);
  activeHighlightTimeout = setTimeout(() => {
    activeRow.classList.remove("is-active");
  }, getMotionDelay(ACTIVE_HIGHLIGHT_FADE_MS));

  setChangePositionLabel(`${activeIndex + 1} / ${changedRows.length}`);

  const wrapRect = tableWrap.getBoundingClientRect();
  const rowRect = activeRow.getBoundingClientRect();
  const offset = rowRect.top - wrapRect.top + tableWrap.scrollTop;
  const target = offset - tableWrap.clientHeight / 2 + activeRow.offsetHeight / 2;

  tableWrap.scrollTo({
    top: target,
    behavior: usesReducedMotion() ? "auto" : "smooth"
  });
}

sortHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    if (activeRawOwnerIndex !== null || globalRawDataViewOpen) {
      if (anchoredToolbarMode === "raw" && globalRawDataViewOpen) {
        sortOwners();
        renderGlobalRawDataTable();
        updateFilterSummary();
        tableWrap.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      applySort();
      tableWrap.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const { sortKey } = header.dataset;
    if (!sortKey) return;

    if (sortState.key === sortKey) {
      if (sortKey === "locations") {
        locationSortCycleActive = true;
      }
      sortState.direction = sortState.direction === "ascending" ? "descending" : "ascending";
    } else {
      sortState.key = sortKey;
      sortState.direction = getInitialSortDirection(sortKey);
      locationSortCycleActive = sortKey === "locations" ? false : locationSortCycleActive;
    }

    applySort();
    tableWrap.scrollTo({ top: 0, behavior: "auto" });
  });
});

syncModeColumn();
syncUpdatesToggleOption();
syncUpdatesStateClass();
syncModifiedColumnToggleOption();
syncReduceMotionToggleOption();
syncReduceMotionStateClass();
syncToolbarTabState("map");
applySort();
openMapPanel("map");

if (markRead) {
  markRead.addEventListener("click", () => {
    owners.forEach((owner) => {
      owner.addedContacts = 0;
      owner.addedLocations = 0;
      owner.changed = false;
    });
    applySort();
  });
}

if (prev) prev.addEventListener("click", () => advanceChangeRow(-1));
if (next) next.addEventListener("click", () => advanceChangeRow(1));

if (tableBody) {
  tableBody.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const locationButton = event.target.closest(".locations");
    if (locationButton) {
      event.stopPropagation();
      handleLocationFilterClick(Number(locationButton.dataset.ownerIndex));
      return;
    }

    const contactsButton = event.target.closest(".contacts-action");
    if (contactsButton) {
      event.stopPropagation();
      openOwnerOrgChart(Number(contactsButton.dataset.ownerIndex), { scrollTable: true });
      return;
    }

    const rawRow = event.target.closest(".raw-data-row[data-owner-index][data-raw-row-index]");
    if (rawRow) {
      const ownerIndex = Number(rawRow.dataset.ownerIndex);
      const rowIndex = Number(rawRow.dataset.rawRowIndex);
      openPersonProfile(getPersonProfileFromRawRow(ownerIndex, rowIndex), rawRow);
      return;
    }

    const row = event.target.closest("tr[data-owner-index]");
    if (!row) return;

    openOwnerDetails(Number(row.dataset.ownerIndex));
  });
}

if (filterPanel) {
  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const title = section.querySelector(".filter-section-title");
    title?.setAttribute("aria-expanded", String(!section.classList.contains("filter-section-collapsed")));
  });

  filterPanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const title = event.target.closest(".filter-section-title");
    if (!title || !filterPanel.contains(title)) return;

    const section = title.closest(".filter-section");
    if (!section) return;

    const isCollapsed = section.classList.toggle("filter-section-collapsed");
    title.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

function setFilterCheckboxState(checkbox, isChecked) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", isChecked);
}

function syncStatusFilterStates() {
  statusFilterInputs.forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });
  updateClearFiltersButton();
}

function clearAllFilterSelections() {
  selectedLocationLabel = "";
  selectedCategoryIndex = "";
  selectedOwnerIndex = "";
  selectedFranchiseIndex = "";
  ownerFilterExcludesSelection = false;
  categoryFilterExcludesSelection = false;
  franchiseFilterExcludesSelection = false;
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;

  if (locationFilterSelect) locationFilterSelect.value = "";
  if (categoryFilterSelect) categoryFilterSelect.value = "";
  if (ownerFilterSelect) ownerFilterSelect.value = "";
  if (franchiseFilterSelect) franchiseFilterSelect.value = "";

  statusFilterInputs.forEach((checkbox) => {
    checkbox.checked = false;
  });

  syncStatusFilterStates();
  syncOwnerExcludeState();
  syncPassiveExcludeState(categoryFilterExclude, false, false);
  syncPassiveExcludeState(franchiseFilterExclude, false, false);
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function syncOwnerExcludeState() {
  if (!ownerFilterExclude) return;

  const hasOwnerSelection = Boolean(selectedOwnerIndex);
  const label = ownerFilterExclude.closest(".filter-check");
  ownerFilterExclude.disabled = !hasOwnerSelection;
  ownerFilterExclude.checked = hasOwnerSelection && ownerFilterExcludesSelection;
  label?.classList.toggle("filter-check-muted", !hasOwnerSelection);
  setFilterCheckboxState(ownerFilterExclude, ownerFilterExclude.checked);
}

function syncPassiveExcludeState(checkbox, hasSelection, excludesSelection) {
  if (!checkbox) return;

  const label = checkbox.closest(".filter-check");
  checkbox.disabled = !hasSelection;
  checkbox.checked = hasSelection && excludesSelection;
  label?.classList.toggle("filter-check-muted", !hasSelection);
  setFilterCheckboxState(checkbox, checkbox.checked);
}

if (locationFilterSelect) {
  const locationSource = typeof OWNER_LOCATION_CENTERS !== "undefined"
    ? OWNER_LOCATION_CENTERS
    : (window.ownerLocationsData || []).flatMap((owner) => owner.locations);
  const locationLabels = [
    ...new Set(locationSource.map((location) => location.label).filter(Boolean))
  ].sort((a, b) => collator.compare(a, b));

  locationLabels.forEach((locationLabel) => {
    const option = document.createElement("option");
    option.value = locationLabel;
    option.textContent = locationLabel;
    locationFilterSelect.append(option);
  });

  locationFilterSelect.addEventListener("change", () => {
    selectedLocationLabel = locationFilterSelect.value;
    activeMapOwnerIndex = null;
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
}

if (ownerFilterSelect) {
  owners.forEach((owner) => {
    const option = document.createElement("option");
    option.value = String(owner.originalIndex);
    option.textContent = owner.ownerName;
    ownerFilterSelect.append(option);
  });

  ownerFilterSelect.addEventListener("change", () => {
    selectedOwnerIndex = ownerFilterSelect.value;
    ownerFilterExcludesSelection = ownerFilterExcludesSelection && Boolean(selectedOwnerIndex);
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncOwnerExcludeState();
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
}

if (categoryFilterSelect) {
  owners.forEach((owner) => {
    const option = document.createElement("option");
    option.value = String(owner.originalIndex);
    option.textContent = owner.ownerName;
    categoryFilterSelect.append(option);
  });

  categoryFilterSelect.addEventListener("change", () => {
    selectedCategoryIndex = categoryFilterSelect.value;
    categoryFilterExcludesSelection = categoryFilterExcludesSelection && Boolean(selectedCategoryIndex);
    syncPassiveExcludeState(categoryFilterExclude, Boolean(selectedCategoryIndex), categoryFilterExcludesSelection);
    updateClearFiltersButton();
  });
}

if (categoryFilterExclude) {
  syncPassiveExcludeState(categoryFilterExclude, Boolean(selectedCategoryIndex), categoryFilterExcludesSelection);

  categoryFilterExclude.addEventListener("change", () => {
    categoryFilterExcludesSelection = categoryFilterExclude.checked;
    setFilterCheckboxState(categoryFilterExclude, categoryFilterExclude.checked);
    updateClearFiltersButton();
  });
}

statusFilterInputs.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    setFilterCheckboxState(checkbox, checkbox.checked);
    updateClearFiltersButton();
  });
});

syncStatusFilterStates();

if (clearAllFilters) {
  clearAllFilters.addEventListener("click", clearAllFilterSelections);
}

if (ownerFilterExclude) {
  syncOwnerExcludeState();

  ownerFilterExclude.addEventListener("change", () => {
    ownerFilterExcludesSelection = ownerFilterExclude.checked;
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    setFilterCheckboxState(ownerFilterExclude, ownerFilterExclude.checked);
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
}

if (franchiseFilterSelect) {
  const franchiseNames = [
    ...new Set(owners.flatMap((owner) => getOwnerFranchises(owner)))
  ].sort((a, b) => collator.compare(a, b));

  franchiseNames.forEach((franchiseName) => {
    const option = document.createElement("option");
    option.value = franchiseName;
    option.textContent = franchiseName;
    franchiseFilterSelect.append(option);
  });

  franchiseFilterSelect.addEventListener("change", () => {
    selectedFranchiseIndex = franchiseFilterSelect.value;
    franchiseFilterExcludesSelection = franchiseFilterExcludesSelection && Boolean(selectedFranchiseIndex);
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncPassiveExcludeState(franchiseFilterExclude, Boolean(selectedFranchiseIndex), franchiseFilterExcludesSelection);
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
}

if (franchiseFilterExclude) {
  syncPassiveExcludeState(franchiseFilterExclude, Boolean(selectedFranchiseIndex), franchiseFilterExcludesSelection);

  franchiseFilterExclude.addEventListener("change", () => {
    franchiseFilterExcludesSelection = franchiseFilterExclude.checked;
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    setFilterCheckboxState(franchiseFilterExclude, franchiseFilterExclude.checked);
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
}

if (filterToggle && card) {
  filterToggle.addEventListener("click", () => {
    const isOpen = card.classList.toggle("is-filter-open");
    filterToggle.setAttribute("aria-expanded", String(isOpen));
    syncToolbarTabState(getCurrentPanelMode());

    if (card.classList.contains("is-map-open") && getCurrentPanelMode() === "map") {
      scheduleOwnersMapResize();
    }
  });
}

if (mapToggle && card) {
  mapToggle.addEventListener("click", () => {
    const mapModeOpen =
      card.classList.contains("is-map-open") &&
      !mapPanel?.classList.contains("is-details-mode") &&
      !mapPanel?.classList.contains("is-org-mode");

    if (mapModeOpen && globalRawDataViewOpen) {
      card.classList.remove("is-map-open");
      mapToggle.setAttribute("aria-expanded", "false");
      setPanelMode("map");
      syncToolbarTabState(getCurrentPanelMode());
      return;
    }

    if (globalRawDataViewOpen) {
      anchoredToolbarMode = "raw";
      anchoredToolbarOwnerIndex = null;
      activeMapOwnerIndex = null;
      activeDetailOwnerIndex = null;
      activeOrgOwnerIndex = null;
      activeRawOwnerIndex = null;
      openMapPanel("map");
      syncMapLocationFilter();
      renderGlobalRawDataTable({ keepPanelOpen: true });
      return;
    }

    if (anchoredToolbarMode === "map") {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
      if (
        card.classList.contains("is-map-open") &&
        !globalRawDataViewOpen &&
        !mapPanel?.classList.contains("is-details-mode") &&
        !mapPanel?.classList.contains("is-org-mode")
      ) {
        if (closeMapPanel()) return;
        renderOwners(displayedOwners);
        refreshChangedRows();
        return;
      }

      syncToolbarTabState(getCurrentPanelMode());
      return;
    }

    if (anchoredToolbarMode) {
      anchoredToolbarMode = "map";
      anchoredToolbarOwnerIndex = null;
      activeMapOwnerIndex = null;
      activeDetailOwnerIndex = null;
      activeOrgOwnerIndex = null;
      activeRawOwnerIndex = null;
      globalRawDataViewOpen = false;
      openMapPanel("map");
      syncMapLocationFilter();
      renderOwners(displayedOwners);
      refreshChangedRows();
      return;
    }

    if (globalRawDataViewOpen) {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
      applySort();
      tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    const detailsModeOpen = card.classList.contains("is-map-open") && mapPanel?.classList.contains("is-details-mode");

    if (detailsModeOpen) {
      anchoredToolbarMode = "map";
      anchoredToolbarOwnerIndex = null;
      activeDetailOwnerIndex = null;
      activeOrgOwnerIndex = null;
      openMapPanel("map");
      if (!globalRawDataViewOpen) {
        renderOwners(displayedOwners);
        refreshChangedRows();
      }
      return;
    }

    const isOpen = card.classList.toggle("is-map-open");
    mapToggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      anchoredToolbarMode = "map";
      anchoredToolbarOwnerIndex = null;
      setPanelMode("map");
      initializeOwnersMap();
      window.setTimeout(() => {
        resizeOwnersMap();
        fitOwnersMapToVisibleLocations();
      }, getMotionDelay(280));
    } else {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
      setPanelMode("map");
    }
  });
}

if (rawDataToggle) {
  rawDataToggle.addEventListener("click", () => {
    if (anchoredToolbarMode === "raw") {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
      if (globalRawDataViewOpen) {
        applySort();
        tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      syncToolbarTabState(getCurrentPanelMode());
      return;
    }

    if (anchoredToolbarMode) {
      anchoredToolbarMode = "raw";
      anchoredToolbarOwnerIndex = null;
      renderGlobalRawDataTable();
      return;
    }

    if (globalRawDataViewOpen) {
      applySort();
      tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    anchoredToolbarMode = "raw";
    anchoredToolbarOwnerIndex = null;
    renderGlobalRawDataTable();
  });
}

if (orgChartToggle && card) {
  orgChartToggle.addEventListener("click", () => {
    const orgChartOpen = card.classList.contains("is-map-open") && mapPanel?.classList.contains("is-org-mode");

    if (orgChartOpen && globalRawDataViewOpen) {
      card.classList.remove("is-map-open");
      mapToggle?.setAttribute("aria-expanded", "false");
      setPanelMode("map");
      syncToolbarTabState(getCurrentPanelMode());
      return;
    }

    if (globalRawDataViewOpen) {
      anchoredToolbarMode = "raw";
      anchoredToolbarOwnerIndex = null;
      activeMapOwnerIndex = null;
      activeDetailOwnerIndex = null;
      activeOrgOwnerIndex = null;
      activeRawOwnerIndex = null;
      openToolbarOrgChart();
      renderGlobalRawDataTable({ keepPanelOpen: true });
      return;
    }

    if (anchoredToolbarMode === "org") {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
      if (card.classList.contains("is-map-open") && mapPanel?.classList.contains("is-org-mode")) {
        if (closeMapPanel()) return;
        renderOwners(displayedOwners);
        refreshChangedRows();
        return;
      }

      syncToolbarTabState(getCurrentPanelMode());
      return;
    }

    if (anchoredToolbarMode) {
      anchoredToolbarMode = "org";
      anchoredToolbarOwnerIndex = activeOrgOwnerIndex ?? activeDetailOwnerIndex ?? (
        selectedOwnerIndex && !ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null
      );
      openToolbarOrgChart();
      return;
    }

    if (orgChartOpen) {
      if (closeMapPanel()) return;
      renderOwners(displayedOwners);
      refreshChangedRows();
      return;
    }

    anchoredToolbarMode = "org";
    anchoredToolbarOwnerIndex = activeOrgOwnerIndex ?? activeDetailOwnerIndex ?? (
      selectedOwnerIndex && !ownerFilterExcludesSelection ? Number(selectedOwnerIndex) : null
    );
    openToolbarOrgChart();
  });
}

if (mapPanel && ownerMapHeader) {
  mapPanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const viewButton = event.target.closest(".owner-header-view-btn");
    if (viewButton && ownerMapHeader.contains(viewButton)) {
      handleOwnerHeaderViewButton(viewButton);
      return;
    }

    const ownerAction = event.target.closest(".owner-header-owner-action");
    if (ownerAction && ownerMapHeader.contains(ownerAction)) {
      openOwnerDetailsFromHeader(Number(ownerAction.dataset.ownerIndex));
      return;
    }

    const closeButton = event.target.closest(".owner-detail-close");
    if (!closeButton || !ownerMapHeader.contains(closeButton)) return;

    clearOwnerMapFilter();
  });
}

if (ownerDetailsPanel) {
  ownerDetailsPanel.addEventListener("scroll", syncOwnerHeaderScrollState);
  ownerDetailsPanel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "orgOwnerPicker") return;

    const shouldReturnToEmptyOrgChart = anchoredToolbarMode === "org";
    if (shouldReturnToEmptyOrgChart) {
      anchoredToolbarOwnerIndex = null;
    } else {
      anchoredToolbarMode = null;
      anchoredToolbarOwnerIndex = null;
    }

    if (target.value) {
      openOwnerOrgChart(Number(target.value), {
        updateAnchoredOwner: !shouldReturnToEmptyOrgChart
      });
      return;
    }

    activeOrgOwnerIndex = null;
    renderDefaultOrgChartState();
    if (globalRawDataViewOpen) {
      renderGlobalRawDataTable({ keepPanelOpen: true });
    } else {
      renderOwners(displayedOwners);
      refreshChangedRows();
    }
  });

  ownerDetailsPanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const openOwnerPickerTrigger = event.target.closest("[data-open-org-owner-picker]");
    if (openOwnerPickerTrigger) {
      const ownerPicker = ownerDetailsPanel.querySelector("#orgOwnerPicker");
      if (ownerPicker instanceof HTMLSelectElement) {
        ownerPicker.focus();
        if (typeof ownerPicker.showPicker === "function") {
          ownerPicker.showPicker();
        } else {
          ownerPicker.click();
        }
      }
      return;
    }

    const viewButton = event.target.closest(".owner-header-view-btn");
    if (viewButton) {
      handleOwnerHeaderViewButton(viewButton);
      return;
    }

    const ownerAction = event.target.closest(".owner-header-owner-action");
    if (ownerAction) {
      openOwnerDetailsFromHeader(Number(ownerAction.dataset.ownerIndex));
      return;
    }

    const closeButton = event.target.closest(".owner-detail-close");
    if (closeButton && card && mapToggle) {
      const isOrgMode = mapPanel?.classList.contains("is-org-mode");
      if (isOrgMode) {
        activeOrgOwnerIndex = null;
        if (anchoredToolbarMode === "org") {
          anchoredToolbarOwnerIndex = null;
        }
        renderDefaultOrgChartState();
        if (globalRawDataViewOpen) {
          renderGlobalRawDataTable({ keepPanelOpen: true });
        } else {
          renderOwners(displayedOwners);
          refreshChangedRows();
        }
        return;
      }

      if (closeMapPanel()) return;
      renderOwners(displayedOwners);
      refreshChangedRows();
      return;
    }

    const mapLink = event.target.closest(".owner-detail-map-link");
    if (mapLink) {
      showOwnerMapView(Number(mapLink.dataset.ownerIndex));
      return;
    }

    const orgCountToggle = event.target.closest(".org-report-count");
    if (orgCountToggle) {
      const ownerIndex = Number(orgCountToggle.dataset.ownerIndex);
      const nodeId = orgCountToggle.dataset.orgNodeId;
      if (!Number.isNaN(ownerIndex) && nodeId) {
        const orgChart = getOwnerOrgChart(ownerIndex);
        const changedNodeIds = toggleOrgNodeCollapsed(ownerIndex, nodeId, orgChart?.nodes || []);
        changedNodeIds.forEach((changedNodeId) => syncOrgCollapsedUi(ownerIndex, changedNodeId));
        syncOrgInactiveCards(ownerIndex, orgChart?.nodes || []);
      }
      return;
    }

    const orgHeaderToggle = event.target.closest(".org-collapse-button");
    if (orgHeaderToggle) {
      const ownerIndex = Number(orgHeaderToggle.dataset.ownerIndex);
      const nodeId = orgHeaderToggle.dataset.orgNodeId;
      if (!Number.isNaN(ownerIndex) && nodeId) {
        const orgChart = getOwnerOrgChart(ownerIndex);
        const changedNodeIds = toggleOrgNodeCollapsed(ownerIndex, nodeId, orgChart?.nodes || []);
        changedNodeIds.forEach((changedNodeId) => syncOrgCollapsedUi(ownerIndex, changedNodeId));
        syncOrgInactiveCards(ownerIndex, orgChart?.nodes || []);
      }
      return;
    }

    const orgPersonCard = event.target.closest(".org-person-card[data-owner-index][data-org-card-id]");
    if (orgPersonCard) {
      const ownerIndex = Number(orgPersonCard.dataset.ownerIndex);
      const nodeId = orgPersonCard.dataset.orgCardId;
      if (!Number.isNaN(ownerIndex) && nodeId) {
        openPersonProfile(getPersonProfileFromOrgNode(ownerIndex, nodeId), orgPersonCard);
      }
    }
  });

  ownerDetailsPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!(event.target instanceof Element)) return;

    const orgPersonCard = event.target.closest(".org-person-card[data-owner-index][data-org-card-id]");
    if (!orgPersonCard || event.target.closest(".org-report-count")) return;

    event.preventDefault();
    const ownerIndex = Number(orgPersonCard.dataset.ownerIndex);
    const nodeId = orgPersonCard.dataset.orgCardId;
    if (!Number.isNaN(ownerIndex) && nodeId) {
      openPersonProfile(getPersonProfileFromOrgNode(ownerIndex, nodeId), orgPersonCard);
    }
  });
}

if (updatesToggleOption) {
  updatesToggleOption.addEventListener("click", () => {
    updatesEnabled = !updatesEnabled;
    syncUpdatesToggleOption();
    syncUpdatesStateClass();
    applySort();
  });
}

if (modifiedColumnToggleOption) {
  modifiedColumnToggleOption.addEventListener("click", () => {
    modifiedColumnVisible = !modifiedColumnVisible;

    if (!modifiedColumnVisible && sortState.key === "modified") {
      sortState = {
        key: "locations",
        direction: "descending"
      };
      locationSortCycleActive = false;
    }

    syncModeColumn();
    applySort();
  });
}

if (reduceMotionToggleOption) {
  reduceMotionToggleOption.addEventListener("click", () => {
    reduceMotionEnabled = !reduceMotionEnabled;
    syncReduceMotionToggleOption();
    syncReduceMotionStateClass();
  });
}

if (toolbarDropdown) {
  document.addEventListener("click", (event) => {
    if (!toolbarDropdown.open || toolbarDropdown.contains(event.target)) return;
    toolbarDropdown.removeAttribute("open");
  });
}

if (tableWrap) {
  tableWrap.addEventListener("scroll", syncStickyNameColumnDivider, { passive: true });
  window.addEventListener("resize", syncStickyNameColumnDivider);
  syncStickyNameColumnDivider();
}

if (profileModal) {
  profileModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const closeControl = event.target.closest(".profile-modal-close, .profile-modal-secondary");
    if (closeControl || event.target === profileModal) {
      closePersonProfile();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && profileModal && !profileModal.hidden) {
    closePersonProfile();
    return;
  }
  if (event.key === "Escape" && toolbarDropdown?.hasAttribute("open")) {
    toolbarDropdown.removeAttribute("open");
  }
  if (event.key === "ArrowLeft") advanceChangeRow(-1);
  if (event.key === "ArrowRight") advanceChangeRow(1);
});
