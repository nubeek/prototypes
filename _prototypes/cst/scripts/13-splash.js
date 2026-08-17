/* Splash start screen -----------------------------------------------------
   Mirrors the territories crossroad: a start screen that covers the workspace
   with one search field plus saved-search tiles. A tile carries the same
   filter values the filter panel holds, so opening one re-runs that query.

   Map tiles use committed JPEG snapshots (assets/snapshots/). The live
   Mapbox + canvas renderer only runs with ?generateSnapshots=1 so
   scripts/generate-splash-snapshots.js can photograph them.
*/

// Static Images API needs the bare "user/style" id, not the mapbox:// URL the
// interactive map uses.
const CST_SPLASH_MAPBOX_STYLE = String(MAPBOX_STYLE || "").replace("mapbox://styles/", "")
  || "nubeek/cka7zizn720s71iogpmkvmw5z";
const CST_SPLASH_SNAPSHOT_WIDTH = 640;
const CST_SPLASH_SNAPSHOT_HEIGHT = 320;
const CST_SPLASH_SNAPSHOT_SCALE = 2;
const CST_SPLASH_DEFAULT_VIEW = { center: [-98.5795, 39.8283], zoom: 2.1 };
const CST_SPLASH_MIN_ZOOM = 2;
const CST_SPLASH_MAX_ZOOM = 6.5;
const CST_SPLASH_FIT_PADDING = 0.18;
const CST_SPLASH_ZOOM_OUT = 0.2;
// Framing ignores the outermost units so a handful of strays can't zoom the
// whole preview out.
const CST_SPLASH_OUTLIER_RATIO = 0.03;
const CST_SPLASH_MAX_PREVIEW_POINTS = 1400;
const CST_SPLASH_POINT_RADIUS = 3;
const CST_SPLASH_POINT_OPACITY = 0.78;
const CST_SPLASH_ENTER_STAGGER_MS = 65;
const CST_SPLASH_ENTER_DURATION_MS = 320;
const CST_SPLASH_LEAVE_DURATION_MS = 300;
const CST_SPLASH_WORKSPACE_HIDE_MS = 240;
const CST_SPLASH_SUGGESTION_GROUP_LIMIT = 3;
const CST_SPLASH_SUGGESTION_LIMIT = 9;

/* Web Mercator projection (matches Mapbox center/zoom rendering) --------- */

function cstSplashNormalizedX(lng) {
  return (lng + 180) / 360;
}

function cstSplashNormalizedY(lat) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function createCstSplashProjection(view = CST_SPLASH_DEFAULT_VIEW) {
  const canvasWidth = CST_SPLASH_SNAPSHOT_WIDTH * CST_SPLASH_SNAPSHOT_SCALE;
  const canvasHeight = CST_SPLASH_SNAPSHOT_HEIGHT * CST_SPLASH_SNAPSHOT_SCALE;
  const worldSize = 512 * Math.pow(2, view.zoom) * CST_SPLASH_SNAPSHOT_SCALE;
  const centerX = cstSplashNormalizedX(view.center[0]) * worldSize;
  const centerY = cstSplashNormalizedY(view.center[1]) * worldSize;

  return {
    canvasHeight,
    canvasWidth,
    project: (lng, lat) => [
      cstSplashNormalizedX(lng) * worldSize - centerX + canvasWidth / 2,
      cstSplashNormalizedY(lat) * worldSize - centerY + canvasHeight / 2
    ]
  };
}

function cstSplashLatitudeRadians(lat) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radians = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radians, Math.PI), -Math.PI) / 2;
}

function computeCstSplashZoom(west, south, east, north) {
  const worldSize = 512;
  const lngFraction = Math.max((east - west) / 360, 0.0001);
  const latFraction = Math.max(
    (cstSplashLatitudeRadians(north) - cstSplashLatitudeRadians(south)) / Math.PI,
    0.0001
  );
  const lngZoom = Math.log2(CST_SPLASH_SNAPSHOT_WIDTH / worldSize / lngFraction);
  const latZoom = Math.log2(CST_SPLASH_SNAPSHOT_HEIGHT / worldSize / latFraction);

  return Math.max(
    CST_SPLASH_MIN_ZOOM,
    Math.min(CST_SPLASH_MAX_ZOOM, Math.min(lngZoom, latZoom))
  );
}

function getCstSplashTrimmedBound(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * ratio))
  );
  return sorted[index];
}

function computeCstSplashView(units) {
  const latitudes = units.map((unit) => unit.lat).filter(Number.isFinite);
  const longitudes = units.map((unit) => unit.lng).filter(Number.isFinite);
  if (!latitudes.length || !longitudes.length) return CST_SPLASH_DEFAULT_VIEW;

  const south = getCstSplashTrimmedBound(latitudes, CST_SPLASH_OUTLIER_RATIO);
  const north = getCstSplashTrimmedBound(latitudes, 1 - CST_SPLASH_OUTLIER_RATIO);
  const west = getCstSplashTrimmedBound(longitudes, CST_SPLASH_OUTLIER_RATIO);
  const east = getCstSplashTrimmedBound(longitudes, 1 - CST_SPLASH_OUTLIER_RATIO);

  const lngSpan = Math.max(east - west, 0.5);
  const latSpan = Math.max(north - south, 0.5);
  const paddedWest = west - lngSpan * CST_SPLASH_FIT_PADDING;
  const paddedEast = east + lngSpan * CST_SPLASH_FIT_PADDING;
  const paddedSouth = south - latSpan * CST_SPLASH_FIT_PADDING;
  const paddedNorth = north + latSpan * CST_SPLASH_FIT_PADDING;

  return {
    center: [(paddedWest + paddedEast) / 2, (paddedSouth + paddedNorth) / 2],
    zoom: Math.max(
      CST_SPLASH_MIN_ZOOM,
      computeCstSplashZoom(paddedWest, paddedSouth, paddedEast, paddedNorth) - CST_SPLASH_ZOOM_OUT
    )
  };
}

/* Snapshot generation (used only with ?generateSnapshots=1) ------------ */

function buildCstSplashBaseMapUrl(view = CST_SPLASH_DEFAULT_VIEW) {
  if (!HAS_MAPBOX_ACCESS_TOKEN) return "";

  const [lng, lat] = view.center;
  const dimensions = `${CST_SPLASH_SNAPSHOT_WIDTH}x${CST_SPLASH_SNAPSHOT_HEIGHT}@${CST_SPLASH_SNAPSHOT_SCALE}x`;
  const params = new URLSearchParams({ access_token: MAPBOX_ACCESS_TOKEN });

  return `https://api.mapbox.com/styles/v1/${CST_SPLASH_MAPBOX_STYLE}/static/`
    + `${lng},${lat},${view.zoom.toFixed(2)},0/${dimensions}?${params.toString()}`;
}

function getCstSplashPreviewPoints(units) {
  if (units.length <= CST_SPLASH_MAX_PREVIEW_POINTS) return units;

  const stride = Math.ceil(units.length / CST_SPLASH_MAX_PREVIEW_POINTS);
  return units.filter((_unit, index) => index % stride === 0);
}

// Draws the matching units as franchise-colored dots, same palette and
// white-stroked look the interactive owners map uses.
function buildCstSplashPointsDataUrl(units, view) {
  const points = getCstSplashPreviewPoints(units).filter(
    (unit) => Number.isFinite(unit.lat) && Number.isFinite(unit.lng)
  );
  if (!points.length) return "";

  const { canvasHeight, canvasWidth, project } = createCstSplashProjection(view);
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) return "";

  const radius = CST_SPLASH_POINT_RADIUS * CST_SPLASH_SNAPSHOT_SCALE;
  context.lineWidth = CST_SPLASH_SNAPSHOT_SCALE;
  context.strokeStyle = "#ffffff";
  context.globalAlpha = CST_SPLASH_POINT_OPACITY;

  points.forEach((unit) => {
    const [x, y] = project(unit.lng, unit.lat);
    if (x < -radius || y < -radius || x > canvasWidth + radius || y > canvasHeight + radius) return;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = unit.color || "#7a63dd";
    context.fill();
    context.stroke();
  });

  return canvas.toDataURL("image/png");
}

/* Saved search matching ------------------------------------------------- */

function getCstSplashSavedSearches() {
  return Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : [];
}

function normalizeCstSplashRange(range, defaults) {
  return {
    max: Number.isFinite(Number(range?.max)) ? Number(range.max) : defaults.max,
    min: Number.isFinite(Number(range?.min)) ? Number(range.min) : defaults.min
  };
}

// Runs `read` with the filter state a saved search would produce, then puts the
// live state back. Reusing the app's own predicates keeps tile counts identical
// to what the table shows once the search is opened.
function withCstSplashFilterScope(filters, read) {
  const restore = {
    excludedCategoryValues,
    excludedFranchiseIndexes,
    excludedLocationLabels,
    excludedLocationSearches,
    excludedOwnerIndexes,
    radiusFilterEnabled,
    searchQuery,
    selectedCategoryValues,
    selectedContactsMax,
    selectedContactsMin,
    selectedFranchiseIndexes,
    selectedLocationLabels,
    selectedLocationSearches,
    selectedOwnerIndexes,
    selectedNetWorthMax,
    selectedNetWorthMin,
    selectedUnitsMax,
    selectedUnitsMin,
    userLocationCenter
  };

  applyCstSplashFilterState(filters);

  try {
    return read();
  } finally {
    searchQuery = restore.searchQuery;
    selectedLocationLabels = restore.selectedLocationLabels;
    excludedLocationLabels = restore.excludedLocationLabels;
    selectedLocationSearches = restore.selectedLocationSearches;
    excludedLocationSearches = restore.excludedLocationSearches;
    selectedCategoryValues = restore.selectedCategoryValues;
    excludedCategoryValues = restore.excludedCategoryValues;
    selectedOwnerIndexes = restore.selectedOwnerIndexes;
    excludedOwnerIndexes = restore.excludedOwnerIndexes;
    selectedFranchiseIndexes = restore.selectedFranchiseIndexes;
    excludedFranchiseIndexes = restore.excludedFranchiseIndexes;
    selectedUnitsMin = restore.selectedUnitsMin;
    selectedUnitsMax = restore.selectedUnitsMax;
    selectedContactsMin = restore.selectedContactsMin;
    selectedContactsMax = restore.selectedContactsMax;
    selectedNetWorthMin = restore.selectedNetWorthMin;
    selectedNetWorthMax = restore.selectedNetWorthMax;
    userLocationCenter = restore.userLocationCenter;
    radiusFilterEnabled = restore.radiusFilterEnabled;
  }
}

function applyCstSplashFilterState(filters = {}) {
  const units = normalizeCstSplashRange(filters.units, unitsFilterDefaults);
  const contacts = normalizeCstSplashRange(filters.contacts, contactsFilterDefaults);
  const netWorth = normalizeCstSplashRange(filters.netWorth, netWorthFilterDefaults);

  searchQuery = String(filters.search || "").trim().toLocaleLowerCase();
  selectedLocationLabels = [...(filters.locations || [])];
  excludedLocationLabels = [...(filters.locationsExcluded || [])];
  selectedLocationSearches = (filters.locationSearches || [])
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  if (!selectedLocationSearches.length && selectedLocationLabels.length) {
    selectedLocationSearches = selectedLocationLabels
      .map((label) => window.cstLocationSearch?.fromLabel?.(label))
      .filter(Boolean);
  }
  excludedLocationSearches = (filters.locationSearchesExcluded || [])
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  if (!excludedLocationSearches.length && excludedLocationLabels.length) {
    excludedLocationSearches = excludedLocationLabels
      .map((label) => window.cstLocationSearch?.fromLabel?.(label))
      .filter(Boolean);
  }
  selectedCategoryValues = [...(filters.categories || [])];
  excludedCategoryValues = [...(filters.categoriesExcluded || [])];
  selectedOwnerIndexes = (filters.owners || []).map(String);
  excludedOwnerIndexes = [];
  selectedFranchiseIndexes = [...(filters.franchises || [])];
  excludedFranchiseIndexes = [];
  selectedUnitsMin = units.min;
  selectedUnitsMax = units.max;
  selectedContactsMin = contacts.min;
  selectedContactsMax = contacts.max;
  selectedNetWorthMin = netWorth.min;
  selectedNetWorthMax = netWorth.max;
  userLocationCenter = null;
  radiusFilterEnabled = false;
}

function toCstSplashUnitRow(unit) {
  return {
    categories: [unit.category],
    category: unit.category,
    color: unit.color,
    franchise: unit.franchise,
    franchises: [unit.franchise],
    lat: unit.lat,
    lng: unit.lng,
    location: unit.label
  };
}

function getCstSplashMatches(filters) {
  return withCstSplashFilterScope(filters, () => {
    const matchedOwners = getFilteredOwners();
    const matchedUnits = matchedOwners
      .flatMap((owner) => window.ownerLocationsData?.[owner.originalIndex]?.units || [])
      .map(toCstSplashUnitRow)
      .filter((row) => unitRowMatchesFilters(row));

    return {
      contactCount: matchedOwners.reduce((total, owner) => total + getOwnerContactCount(owner), 0),
      ownerCount: matchedOwners.length,
      units: matchedUnits
    };
  });
}

/* Tiles ----------------------------------------------------------------- */

function escapeCstSplashHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function formatCstSplashCount(value) {
  return Number.isFinite(value) ? value.toLocaleString("en-US") : "—";
}

function getCstSplashTileMetric(savedSearch, matches) {
  if (savedSearch.view === "locations") {
    return {
      label: "Units",
      value: matches.unitCount ?? matches.units?.length ?? 0
    };
  }

  return {
    label: "Prospects",
    value: matches.ownerCount
  };
}

function isCstSplashSnapshotGenerateMode() {
  try {
    return new URLSearchParams(window.location.search).has("generateSnapshots");
  } catch (_error) {
    return false;
  }
}

function getCstSplashSnapshotUrl(savedSearch) {
  return savedSearch.snapshot || `assets/snapshots/${savedSearch.id}.jpg`;
}

function getCstSplashMatchCounts(filters) {
  return withCstSplashFilterScope(filters, () => {
    const matchedOwners = getFilteredOwners();
    let unitCount = 0;

    matchedOwners.forEach((owner) => {
      const units = window.ownerLocationsData?.[owner.originalIndex]?.units || [];
      units.forEach((unit) => {
        if (unitRowMatchesFilters(toCstSplashUnitRow(unit))) {
          unitCount += 1;
        }
      });
    });

    return {
      ownerCount: matchedOwners.length,
      unitCount
    };
  });
}

function createCstSplashTile(savedSearch, { snapshotUrl, baseMapUrl, metric, pointsUrl } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "target-card cst-splash__tile";
  tile.dataset.savedSearchId = savedSearch.id;

  const valueLabel = formatCstSplashCount(metric.value);
  tile.setAttribute(
    "aria-label",
    `Open saved search ${savedSearch.title}: ${valueLabel} ${metric.label.toLowerCase()}`
  );

  const snapshotImage = snapshotUrl
    ? `<img class="target-map-img" src="${escapeCstSplashHtml(snapshotUrl)}" alt="" loading="lazy">`
    : "";
  const baseImage = !snapshotUrl && baseMapUrl
    ? `<img class="target-map-img" src="${escapeCstSplashHtml(baseMapUrl)}" alt="" loading="lazy">`
    : "";
  const pointsImage = !snapshotUrl && pointsUrl
    ? `<img class="target-map-points" src="${escapeCstSplashHtml(pointsUrl)}" alt="" aria-hidden="true">`
    : "";

  tile.innerHTML = `
    <div class="target-card-title">${escapeCstSplashHtml(savedSearch.title)}</div>
    <div class="target-map">${snapshotImage}${baseImage}${pointsImage}</div>
    <div class="target-field target-prospects">
      <span class="target-label">${escapeCstSplashHtml(metric.label)}</span>
      <div class="target-prospects-row">
        <span class="target-number">${valueLabel}</span>
        <img class="target-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
      </div>
    </div>
  `;

  tile.addEventListener("click", () => {
    openCstSplashSavedSearch(savedSearch);
  });

  return tile;
}

function renderCstSplashGenerateTiles() {
  getCstSplashSavedSearches().forEach((savedSearch) => {
    const matches = getCstSplashMatches(savedSearch.filters || {});
    const view = computeCstSplashView(matches.units);

    let pointsUrl = "";
    try {
      pointsUrl = buildCstSplashPointsDataUrl(matches.units, view);
    } catch (error) {
      console.warn("Unable to render the saved search preview.", error);
    }

    document.getElementById("cstSplashGrid")?.append(createCstSplashTile(savedSearch, {
      baseMapUrl: buildCstSplashBaseMapUrl(view),
      metric: getCstSplashTileMetric(savedSearch, matches),
      pointsUrl
    }));
  });
}

function renderCstSplashTiles() {
  const grid = document.getElementById("cstSplashGrid");
  if (!grid) return;

  grid.replaceChildren();

  if (isCstSplashSnapshotGenerateMode()) {
    renderCstSplashGenerateTiles();
    return;
  }

  getCstSplashSavedSearches().forEach((savedSearch) => {
    const matches = getCstSplashMatchCounts(savedSearch.filters || {});

    grid.append(createCstSplashTile(savedSearch, {
      snapshotUrl: getCstSplashSnapshotUrl(savedSearch),
      metric: getCstSplashTileMetric(savedSearch, matches)
    }));
  });
}

/* Applying a query ------------------------------------------------------ */

function expandCstSplashFilterSections() {
  const activeSections = new Set();
  const markActive = (element, isActive) => {
    if (!isActive) return;
    const section = element?.closest(".filter-section");
    if (section) activeSections.add(section);
  };

  markActive(locationFilterSearchField, hasAppliedLocationFilters());
  markActive(categoryFilterSelect, selectedCategoryValues.length || excludedCategoryValues.length);
  markActive(ownerFilterSelect, selectedOwnerIndexes.length || excludedOwnerIndexes.length);
  markActive(franchiseFilterSelect, selectedFranchiseIndexes.length || excludedFranchiseIndexes.length);
  markActive(unitsMinRange, unitsFilterIsActive());
  markActive(contactsMinRange, contactsFilterIsActive());
  markActive(netWorthMinRange, netWorthFilterIsActive());

  activeSections.forEach((section) => {
    section.classList.remove("filter-section-collapsed");
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", "true");
    section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", "true");
  });
}

function syncCstSplashToolbarSearch() {
  if (!toolbarSearchInput) return;

  toolbarSearchInput.value = searchQuery;
  toolbarSearchInput
    .closest(".toolbar-search-btn")
    ?.classList.toggle("is-active-search", Boolean(searchQuery));

  if (toolbarSearchClear) {
    toolbarSearchClear.hidden = !searchQuery;
  }
}

function applyCstSplashQuery(filters = {}, { view = "owners" } = {}) {
  applyCstSplashFilterState(filters);
  selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;

  syncFilterLocationSearchUI();
  setFilterSelectIncludedExcludedValues(categoryFilterSelect, selectedCategoryValues, excludedCategoryValues);
  setFilterSelectIncludedExcludedValues(ownerFilterSelect, selectedOwnerIndexes, excludedOwnerIndexes);
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, selectedFranchiseIndexes, excludedFranchiseIndexes);
  syncFilterComboboxes();

  const autoRadiusSearch = (filters.locationSearches || []).find((search) => (
    window.cstLocationSearch?.shouldAutoEnableRadius?.(search)
  ));
  if (autoRadiusSearch) {
    applyAutoRadiusForLocationResult(autoRadiusSearch);
  }

  statusFilterInputs.forEach((checkbox) => {
    checkbox.checked = false;
  });
  syncStatusFilterStates();
  syncUnitsFilterControls();
  syncContactsFilterControls();
  syncNetWorthFilterControls();
  syncRadiusFilterControls();
  syncCstSplashToolbarSearch();
  expandCstSplashFilterSections();

  syncMapLocationFilter();

  if (view !== currentTableView) {
    setMainTableView(view);
  } else {
    refreshFilteredViews();
  }

  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function openCstSplashSavedSearch(savedSearch) {
  dismissCstSplash();
  applyCstSplashQuery(savedSearch.filters || {}, { view: savedSearch.view || "owners" });
}

/* Show & hide ----------------------------------------------------------- */

function getCstSplashElement() {
  return document.getElementById("cstSplash");
}

function isCstSplashOpen() {
  return Boolean(card?.classList.contains("is-splash-open"));
}

function canFocusCstSplashSearchInput() {
  if (
    document.body.classList.contains("access-locked")
    && !document.documentElement.classList.contains("access-granted")
  ) {
    return false;
  }

  return isCstSplashOpen();
}

function focusCstSplashSearchInput() {
  if (!canFocusCstSplashSearchInput()) return;
  document.getElementById("cstSplashSearchInput")?.focus({ preventScroll: true });
}

// The splash paints over the workspace, so the table and panels behind it stay
// out of the tab order until it closes.
function setCstSplashWorkspaceInert(isInert) {
  [filterPanel, document.querySelector(".workspace-main")].forEach((element) => {
    if (element) element.inert = isInert;
  });
}

function getCstSplashAnimatedItems(splash) {
  return [
    splash.querySelector(".cst-splash__heading"),
    splash.querySelector(".cst-splash__search"),
    splash.querySelector(".cst-splash__saved")
  ].filter(Boolean);
}

function finishCstSplashEnterAnimation(splash, items) {
  splash.classList.remove("is-entering", "is-entering-active");
  items.forEach((item) => {
    item.classList.remove("cst-splash__animate-item");
    item.style.removeProperty("--enter-index");
  });

  focusCstSplashSearchInput();
}

function playCstSplashEnterAnimation(splash) {
  const items = getCstSplashAnimatedItems(splash);
  items.forEach((item, index) => {
    item.classList.add("cst-splash__animate-item");
    item.style.setProperty("--enter-index", String(index));
  });

  splash.classList.remove("is-entering-active");
  splash.classList.add("is-entering");

  if (usesReducedMotion() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.classList.add("is-entering-active");
    window.setTimeout(() => finishCstSplashEnterAnimation(splash, items), 0);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => splash.classList.add("is-entering-active"));
  });

  const totalMs = CST_SPLASH_ENTER_DURATION_MS
    + Math.max(0, items.length - 1) * CST_SPLASH_ENTER_STAGGER_MS;
  window.setTimeout(() => finishCstSplashEnterAnimation(splash, items), totalMs + 40);
}

function syncCstSplashToolbarViewState() {
  if (!isCstSplashOpen()) return;

  toolbarViewButtons.forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  });
}

function openCstSplashToolbarView(viewKey) {
  setMainTableView(viewKey);
  dismissCstSplash();
}

function syncCstSplashMapPanelForSplash(isSplashOpen) {
  if (!card || !mapToggle) return;

  if (isSplashOpen && card.classList.contains("is-map-open")) {
    card.classList.remove("is-map-open");
    mapToggle.setAttribute("aria-expanded", "false");
    cancelOwnersMapReveal?.({ hideBusy: true });
    return;
  }

  if (!isSplashOpen && !card.classList.contains("is-map-open")) {
    openMapPanel("map");
  }
}

function showCstSplash({ animate = false } = {}) {
  const splash = getCstSplashElement();
  if (!splash) return;

  cstSplashSearchController?.reset();
  cancelCstTableEnterAnimation?.();
  card?.classList.remove("is-splash-hiding-workspace");
  syncCstSplashMapPanelForSplash(true);
  setFilterPanelOpen(false);
  setCstSplashWorkspaceInert(true);
  card?.classList.add("is-splash-open");
  splash.hidden = false;
  splash.classList.remove("is-leaving", "is-entering", "is-entering-active", "is-preparing-enter");
  syncCstSplashToolbarViewState();

  if (animate) {
    playCstSplashEnterAnimation(splash);
    return;
  }

  requestAnimationFrame(() => focusCstSplashSearchInput());
}

function revealCstSplashWorkspace() {
  card?.classList.remove("is-splash-hiding-workspace");
  scheduleCstTableEnterAnimation?.();
}

function dismissCstSplash() {
  const splash = getCstSplashElement();
  card?.classList.remove("is-splash-open");
  card?.classList.add("is-splash-hiding-workspace");
  setCstSplashWorkspaceInert(false);
  setFilterPanelOpen(true);
  syncCstSplashMapPanelForSplash(false);
  syncToolbarViewState();
  markCstTableEnterPending?.();

  if (!splash || splash.hidden) {
    revealCstSplashWorkspace();
    return;
  }

  splash.classList.remove("is-entering", "is-entering-active", "is-preparing-enter");
  splash.classList.add("is-leaving");

  const leaveDurationMs = getMotionDelay(CST_SPLASH_LEAVE_DURATION_MS);
  const revealDelayMs = Math.max(
    getMotionDelay(CST_SPLASH_WORKSPACE_HIDE_MS),
    leaveDurationMs - getMotionDelay(40)
  );

  window.setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(revealCstSplashWorkspace);
    });
  }, revealDelayMs);

  window.setTimeout(() => {
    if (splash.classList.contains("is-leaving")) {
      splash.hidden = true;
    }
  }, leaveDurationMs);
}

function hideCstSplashImmediately() {
  const splash = getCstSplashElement();
  card?.classList.remove("is-splash-open", "is-splash-hiding-workspace");
  cancelCstTableEnterAnimation?.();
  setCstSplashWorkspaceInert(false);
  syncToolbarViewState();

  if (!splash) return;

  splash.classList.remove("is-preparing-enter", "is-entering", "is-entering-active", "is-leaving");
  splash.hidden = true;
}

/* Search --------------------------------------------------------------- */

function setCstSplashSearchFeedback(message = "") {
  const feedback = document.getElementById("cstSplashSearchFeedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.hidden = !message;
}

function getCstSplashLocalSuggestionPool() {
  const brandNames = [...new Set(owners.flatMap((owner) => getOwnerFranchises(owner)))];

  return [
    ...owners.map((owner) => ({
      filters: { owners: [String(owner.originalIndex)] },
      group: "Operators",
      label: owner.ownerName,
      logoFallback: getInitials(owner.ownerName),
      logoSrc: owner.logoSrc,
      type: "operator"
    })),
    ...brandNames.map((brandName) => ({
      filters: { franchises: [brandName] },
      group: "Brands",
      label: brandName,
      logoFallback: getInitials(brandName),
      logoSrc: getFranchiseLogoSrc(brandName),
      type: "brand"
    }))
  ];
}

function getCstSplashLocalSuggestions(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) return [];

  const matchesByGroup = new Map();

  getCstSplashLocalSuggestionPool().forEach((item) => {
    const matchIndex = item.label.toLocaleLowerCase().indexOf(normalizedQuery);
    if (matchIndex === -1) return;

    const groupMatches = matchesByGroup.get(item.group) || [];
    groupMatches.push({ ...item, matchIndex });
    matchesByGroup.set(item.group, groupMatches);
  });

  return ["Operators", "Brands"].flatMap((group) => (
    (matchesByGroup.get(group) || [])
      .sort((a, b) => a.matchIndex - b.matchIndex || a.label.localeCompare(b.label))
      .slice(0, CST_SPLASH_SUGGESTION_GROUP_LIMIT)
  ));
}

function toCstSplashLocationSuggestion(result) {
  if (!result?.label) return null;

  return {
    filters: {
      locationSearches: [result],
      locations: [result.label]
    },
    group: "Locations",
    label: result.suggestionLabel || result.label,
    locationResult: result,
    type: "location"
  };
}

async function getCstSplashSuggestions(query, { signal } = {}) {
  const localSuggestions = getCstSplashLocalSuggestions(query);
  const remainingSlots = Math.max(0, CST_SPLASH_SUGGESTION_LIMIT - localSuggestions.length);
  if (!remainingSlots) return localSuggestions;

  let locationResults = [];
  try {
    locationResults = await window.cstLocationSearch?.fetchSuggestions?.(query, { signal }) || [];
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    locationResults = [];
  }

  const locationSuggestions = locationResults
    .map(toCstSplashLocationSuggestion)
    .filter(Boolean)
    .slice(0, Math.min(CST_SPLASH_SUGGESTION_GROUP_LIMIT, remainingSlots));

  return [...localSuggestions, ...locationSuggestions].slice(0, CST_SPLASH_SUGGESTION_LIMIT);
}

const CST_SPLASH_SUGGESTION_ICONS = {
  location: `<svg viewBox="0 0 16 20" focusable="false"><path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/></svg>`
};

function createCstSplashSuggestionIcon(item) {
  const icon = document.createElement("span");
  icon.className = "cst-splash__search-suggestion-icon";
  icon.setAttribute("aria-hidden", "true");

  if (item.logoSrc) {
    icon.classList.add("has-logo");

    const fallback = document.createElement("span");
    fallback.className = "cst-splash__search-suggestion-logo-fallback";
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

  icon.innerHTML = CST_SPLASH_SUGGESTION_ICONS[item.type] || CST_SPLASH_SUGGESTION_ICONS.location;
  return icon;
}

let cstSplashSearchController = null;

let cstSplashSearchFloatingTooltip = null;

function getCstSplashSearchFloatingTooltip() {
  if (!cstSplashSearchFloatingTooltip) {
    cstSplashSearchFloatingTooltip = document.createElement("div");
    cstSplashSearchFloatingTooltip.className = "filter-combobox-floating-tooltip";
  }

  return cstSplashSearchFloatingTooltip;
}

function positionCstSplashSearchFloatingTooltip(target) {
  const tooltipText = target.dataset.tooltip;
  if (!tooltipText) return;

  const tooltip = getCstSplashSearchFloatingTooltip();
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

function showCstSplashSearchFloatingTooltip(event) {
  positionCstSplashSearchFloatingTooltip(event.currentTarget);
  getCstSplashSearchFloatingTooltip().classList.add("is-visible");
}

function hideCstSplashSearchFloatingTooltip() {
  cstSplashSearchFloatingTooltip?.classList.remove("is-visible");
}

function bindCstSplashSearchFloatingTooltip(button) {
  if (!button?.dataset.tooltip) return;

  button.addEventListener("mouseenter", showCstSplashSearchFloatingTooltip);
  button.addEventListener("mouseleave", hideCstSplashSearchFloatingTooltip);
  button.addEventListener("focus", showCstSplashSearchFloatingTooltip);
  button.addEventListener("blur", hideCstSplashSearchFloatingTooltip);
  button.addEventListener("click", hideCstSplashSearchFloatingTooltip);
}

function bindCstSplashSearch() {
  const form = document.getElementById("cstSplashSearch");
  const input = document.getElementById("cstSplashSearchInput");
  const suggestions = document.getElementById("cstSplashSearchSuggestions");
  const clearButton = document.getElementById("cstSplashSearchClear");
  const locateButton = document.getElementById("cstSplashLocate");
  if (!form || !input || !suggestions) return;

  let activeSuggestionIndex = -1;
  let renderedSuggestions = [];
  let debounceTimer = null;
  let fetchController = null;

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

  function syncActiveSuggestion() {
    suggestions.querySelectorAll(".cst-splash__search-suggestion").forEach((button, index) => {
      const isActive = index === activeSuggestionIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));

      if (isActive) {
        input.setAttribute("aria-activedescendant", button.id);
        button.scrollIntoView({ block: "nearest" });
      }
    });

    if (activeSuggestionIndex === -1) {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function appendSuggestionHeading(label) {
    const heading = document.createElement("div");
    heading.className = "cst-splash__search-suggestion-heading";
    heading.textContent = label;
    suggestions.append(heading);
  }

  function appendSuggestionButton(item, index) {
    const button = document.createElement("button");
    const icon = createCstSplashSuggestionIcon(item);
    const label = document.createElement("span");
    const action = document.createElement("span");
    const actionLabel = document.createElement("span");
    const actionKey = document.createElement("img");

    button.type = "button";
    button.className = "cst-splash__search-suggestion";
    button.id = `cstSplashSearchSuggestion-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.setAttribute("aria-label", `Select ${item.label}`);

    label.className = "cst-splash__search-suggestion-label";
    label.textContent = item.label;

    action.className = "cst-splash__search-suggestion-action";
    action.setAttribute("aria-hidden", "true");
    actionLabel.textContent = "Select";
    actionKey.className = "cst-splash__search-suggestion-key";
    actionKey.src = "assets/enter.svg";
    actionKey.alt = "";
    action.append(actionLabel, actionKey);

    button.append(icon, label, action);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("mouseenter", () => {
      activeSuggestionIndex = index;
      syncActiveSuggestion();
    });
    button.addEventListener("click", () => selectSuggestion(item));
    suggestions.append(button);
  }

  function renderSuggestions(items) {
    renderedSuggestions = items;
    activeSuggestionIndex = items.length ? 0 : -1;
    suggestions.replaceChildren();

    if (!items.length) {
      appendSuggestionHeading("Suggestions");
      const status = document.createElement("div");
      status.className = "cst-splash__search-suggestion-status";
      status.textContent = "No operators, brands, or locations match.";
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

  function syncSearchActions() {
    const hasQuery = input.value.trim().length > 0;
    if (clearButton) clearButton.hidden = !hasQuery;
    if (locateButton) locateButton.hidden = hasQuery;
  }

  function selectSuggestion(item) {
    input.value = item.label;
    syncSearchActions();
    closeSuggestions();
    setCstSplashSearchFeedback();
    dismissCstSplash();
    applyCstSplashQuery(item.filters);
  }

  async function submitFreeTextSearch() {
    const query = input.value.trim();
    if (!query) {
      setCstSplashSearchFeedback("Enter an operator, brand, or location to begin.");
      input.focus();
      return;
    }

    const localMatch = getCstSplashLocalSuggestions(query)[0];
    if (localMatch && localMatch.label.toLocaleLowerCase() === query.toLocaleLowerCase()) {
      selectSuggestion(localMatch);
      return;
    }

    const locationResult = await window.cstLocationSearch?.resolveSearch?.(query);
    if (locationResult) {
      selectSuggestion(toCstSplashLocationSuggestion(locationResult));
      return;
    }

    if (localMatch) {
      selectSuggestion(localMatch);
      return;
    }

    closeSuggestions();
    setCstSplashSearchFeedback();
    dismissCstSplash();
    applyCstSplashQuery({ search: query });
  }

  function renderSearchingSuggestions(query) {
    const localSuggestions = getCstSplashLocalSuggestions(query);
    if (localSuggestions.length) {
      renderSuggestions(localSuggestions);
      appendSuggestionHeading("Locations");
      const status = document.createElement("div");
      status.className = "cst-splash__search-suggestion-status";
      status.textContent = "Searching…";
      suggestions.append(status);
      return;
    }

    suggestions.replaceChildren();
    appendSuggestionHeading("Locations");
    const status = document.createElement("div");
    status.className = "cst-splash__search-suggestion-status";
    status.textContent = "Searching…";
    suggestions.append(status);
    setSuggestionsOpen(true);
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
      const items = await getCstSplashSuggestions(trimmedQuery, { signal: fetchController.signal });
      if (input.value.trim() !== trimmedQuery) return;
      renderSuggestions(items);
    } catch (error) {
      if (error?.name === "AbortError") return;
      renderSuggestions(getCstSplashLocalSuggestions(trimmedQuery));
    }
  }

  function scheduleSuggestions(query) {
    window.clearTimeout(debounceTimer);

    if (!query.trim()) {
      fetchController?.abort();
      closeSuggestions();
      return;
    }

    debounceTimer = window.setTimeout(() => {
      void requestSuggestions(query);
    }, 250);
  }

  input.addEventListener("input", () => {
    setCstSplashSearchFeedback();
    syncSearchActions();
    scheduleSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (renderedSuggestions.length) {
      setSuggestionsOpen(true);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && renderedSuggestions.length) {
      event.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, renderedSuggestions.length - 1);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "ArrowUp" && renderedSuggestions.length) {
      event.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      syncActiveSuggestion();
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

    if (activeSuggestionIndex >= 0 && renderedSuggestions[activeSuggestionIndex]) {
      selectSuggestion(renderedSuggestions[activeSuggestionIndex]);
      return;
    }

    void submitFreeTextSearch();
  });

  clearButton?.addEventListener("mousedown", (event) => event.preventDefault());
  clearButton?.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    fetchController?.abort();
    input.value = "";
    closeSuggestions();
    setCstSplashSearchFeedback();
    syncSearchActions();
    input.focus();
  });

  locateButton?.addEventListener("click", () => {
    closeSuggestions();
    setCstSplashSearchFeedback();

    if (!navigator.geolocation) {
      setCstSplashSearchFeedback("Location access is unavailable in this browser.");
      return;
    }

    locateUserFromFilters();
  });

  document.addEventListener("mousedown", (event) => {
    if (!form.contains(event.target)) {
      closeSuggestions();
    }
  });

  syncSearchActions();

  bindCstSplashSearchFloatingTooltip(locateButton);

  cstSplashSearchController = {
    reset() {
      window.clearTimeout(debounceTimer);
      fetchController?.abort();
      input.value = "";
      closeSuggestions();
      setCstSplashSearchFeedback();
      syncSearchActions();
    }
  };
}

function bindCstSplashSavedToggle() {
  const toggle = document.getElementById("cstSplashSavedToggle");
  const content = document.getElementById("cstSplashSavedContent");
  if (!toggle || !content) return;

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    content.hidden = isExpanded;
  });
}

function bindCstSplashEntryPoints() {
  // Clearing every filter has nothing left to show, so it returns to the
  // splash the same way the territories prototype does.
  clearAllFilters?.addEventListener("click", () => {
    showCstSplash({ animate: true });
  });

  // Reaching for a workspace control in the toolbar means the user is done with
  // the splash, so it steps aside instead of hiding whatever they just opened.
  toolbarSearchInput?.addEventListener("input", dismissOpenCstSplash);
  datasetSelectorInput?.addEventListener("focus", dismissOpenCstSplash);
  [
    mapToggle,
    orgChartToggle,
    contactsToggle,
    searchWithinLocation
  ].forEach((control) => control?.addEventListener("click", dismissOpenCstSplash));

  toolbarViewButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      if (!isCstSplashOpen()) return;

      const viewKey = button.dataset.tableView;
      if (viewKey !== "owners" && viewKey !== "userProfiles") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openCstSplashToolbarView(viewKey);
    }, true);
  });
}

function dismissOpenCstSplash() {
  if (!isCstSplashOpen()) return;
  dismissCstSplash();
}

function initCstSplash() {
  const splash = getCstSplashElement();
  if (!splash) return;

  bindCstSplashSearch();
  bindCstSplashSavedToggle();
  bindCstSplashEntryPoints();

  if (isCstSplashSnapshotGenerateMode()) {
    splash.classList.add("is-snapshot-export");
    renderCstSplashTiles();
    showCstSplash({ animate: false });
    return;
  }

  renderCstSplashTiles();

  // A restored session already has a query applied, so skip the start screen.
  if (getAppliedFilterCount() > 0) {
    hideCstSplashImmediately();
    return;
  }

  showCstSplash({ animate: true });
}

window.cstSplash = {
  dismiss: dismissCstSplash,
  show: showCstSplash
};

initCstSplash();
