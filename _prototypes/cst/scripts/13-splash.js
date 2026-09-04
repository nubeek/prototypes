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
const CST_SPLASH_MIN_ZOOM = 1;
const CST_SPLASH_MAX_ZOOM = 9;
const CST_SPLASH_MAX_PREVIEW_POINTS = 1400;
const CST_SPLASH_POINT_RADIUS = 3;
const CST_SPLASH_POINT_OPACITY = 0.78;
const CST_SPLASH_ENTER_STAGGER_MS = 65;
const CST_SPLASH_ENTER_DURATION_MS = 320;
const CST_SPLASH_LEAVE_DURATION_MS = 300;
const CST_SPLASH_WORKSPACE_HIDE_MS = 240;
const CST_SPLASH_SUGGESTION_GROUPS = ["Categories", "Franchises", "Franchisees", "Locations"];
const CST_SPLASH_SUGGESTION_GROUP_LIMIT = 3;
const CST_SPLASH_SAVED_INSERT_SHIFT_DURATION_MS = 680;
const CST_SPLASH_SAVED_INSERT_SHIFT_EASING = "cubic-bezier(0.05, 0.95, 0.12, 1)";
const CST_SPLASH_SAVED_INSERT_REVEAL_MS = 200;
const CST_SPLASH_SAVED_INSERT_BLUR_PX = 4;
const CST_SPLASH_SAVED_DELETE_FADE_MS = 500;
const CST_SPLASH_SAVED_DELETE_BLUR_MS = 400;
const CST_SPLASH_SAVED_DELETE_BLUR_PX = 12;
const CST_SPLASH_SAVED_DELETE_SHIFT_DURATION_MS = 680;
const CST_SPLASH_SAVED_DELETE_SHIFT_EASING = "cubic-bezier(0.05, 0.95, 0.12, 1)";
const CST_SPLASH_SAVED_SCOPES = new Set(["all", "private", "team", "public"]);
const CST_SPLASH_SAVED_EMPTY_MESSAGES = {
  all: "No saved searches match your search.",
  private: "You haven't saved any private searches.",
  team: "You haven't saved any team searches.",
  public: "You haven't saved any public searches."
};

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

function computeCstSplashZoom(west, south, east, north, width = CST_SPLASH_SNAPSHOT_WIDTH, height = CST_SPLASH_SNAPSHOT_HEIGHT) {
  const worldSize = 512;
  const lngFraction = Math.max((east - west) / 360, 0.0001);
  const latFraction = Math.max(
    (cstSplashLatitudeRadians(north) - cstSplashLatitudeRadians(south)) / Math.PI,
    0.0001
  );
  const lngZoom = Math.log2(width / worldSize / lngFraction);
  const latZoom = Math.log2(height / worldSize / latFraction);

  return Math.max(
    CST_SPLASH_MIN_ZOOM,
    Math.min(CST_SPLASH_MAX_ZOOM, Math.min(lngZoom, latZoom))
  );
}

// Same source as the live query map: region boxes when the query is states
// only, otherwise the pins getMapPointFeatures() would draw.
function getCstSplashRegionFitBounds() {
  if (typeof isRadiusFilterActive === "function" && isRadiusFilterActive()) return null;

  const regionSearches = selectedLocationSearches.filter((search) => isRegionOnlyLocationSearch(search));
  if (!regionSearches.length || userLocationCenter) return null;
  if (selectedLocationSearches.some((search) => search && !isRegionOnlyLocationSearch(search))) return null;

  const boundsList = regionSearches
    .map((search) => window.cstLocationSearch?.getRegionBounds?.(search.stateCode))
    .filter((bounds) => Array.isArray(bounds) && bounds.length === 4);
  if (!boundsList.length) return null;

  return boundsList.reduce((union, [west, south, east, north]) => ({
    west: Math.min(union.west, west),
    south: Math.min(union.south, south),
    east: Math.max(union.east, east),
    north: Math.max(union.north, north)
  }), {
    west: boundsList[0][0],
    south: boundsList[0][1],
    east: boundsList[0][2],
    north: boundsList[0][3]
  });
}

function getCstSplashBoundsFromCoordinates(coordinates) {
  let west = coordinates[0][0];
  let east = coordinates[0][0];
  let south = coordinates[0][1];
  let north = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  });

  if (coordinates.length === 1) {
    west -= 0.35;
    east += 0.35;
    south -= 0.35;
    north += 0.35;
  }

  return { west, south, east, north };
}

function computeCstSplashViewFromBounds({ west, south, east, north }) {
  const insetWidth = Math.max(CST_SPLASH_SNAPSHOT_WIDTH - MAP_FIT_PADDING * 2, 1);
  const insetHeight = Math.max(CST_SPLASH_SNAPSHOT_HEIGHT - MAP_FIT_PADDING * 2, 1);

  return {
    center: [(west + east) / 2, (south + north) / 2],
    zoom: computeCstSplashZoom(west, south, east, north, insetWidth, insetHeight)
  };
}

function getCstSplashMapPoints() {
  return getMapPointFeatures(null).map((feature) => ({
    color: feature.properties.color,
    franchise: feature.properties.franchise,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0]
  }));
}

function computeCstSplashView(points) {
  const regionBounds = getCstSplashRegionFitBounds();
  if (regionBounds) return computeCstSplashViewFromBounds(regionBounds);

  const coordinates = (points || [])
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map((point) => [point.lng, point.lat]);

  if (typeof getRadiusCircleFeatureCollection === "function") {
    getRadiusCircleFeatureCollection().features.forEach((feature) => {
      const ring = feature?.geometry?.coordinates?.[0];
      if (Array.isArray(ring)) coordinates.push(...ring);
    });
  }

  if (!coordinates.length) return CST_SPLASH_DEFAULT_VIEW;

  return computeCstSplashViewFromBounds(getCstSplashBoundsFromCoordinates(coordinates));
}

/* Snapshot generation (used only with ?generateSnapshots=1) ------------ */

function buildCstSplashBaseMapUrl(view = CST_SPLASH_DEFAULT_VIEW) {
  if (!HAS_MAPBOX_ACCESS_TOKEN) return "";

  const [lng, lat] = view.center;
  const dimensions = `${CST_SPLASH_SNAPSHOT_WIDTH}x${CST_SPLASH_SNAPSHOT_HEIGHT}@${CST_SPLASH_SNAPSHOT_SCALE}x`;
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    attribution: "false",
    logo: "false"
  });

  return `https://api.mapbox.com/styles/v1/${CST_SPLASH_MAPBOX_STYLE}/static/`
    + `${lng},${lat},${view.zoom.toFixed(2)},0/${dimensions}?${params.toString()}`;
}

function getCstSplashPreviewPoints(units) {
  if (units.length <= CST_SPLASH_MAX_PREVIEW_POINTS) return units;

  const stride = Math.ceil(units.length / CST_SPLASH_MAX_PREVIEW_POINTS);
  return units.filter((_unit, index) => index % stride === 0);
}

// Draws the matching units as franchise-colored dots, same palette and
// white-stroked look the interactive franchisees map uses.
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

let cstSplashSavedActiveScope = "all";
let cstSplashSavedSearchTerm = "";

function setCstSplashSavedScope(scope, { render = true } = {}) {
  cstSplashSavedActiveScope = CST_SPLASH_SAVED_SCOPES.has(scope) ? scope : "all";

  document.querySelectorAll(".cst-splash__saved .scope-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.scope === cstSplashSavedActiveScope);
  });

  if (render) {
    applyCstSplashSavedVisibility();
  }
}

function resetCstSplashSavedSearchFilter() {
  const searchInput = document.getElementById("cstSplashSavedSearch");
  const searchClear = document.getElementById("cstSplashSavedSearchClear");

  cstSplashSavedSearchTerm = "";
  if (searchInput) {
    searchInput.value = "";
    searchInput.closest(".scope-search")?.classList.remove("is-active-search");
  }
  if (searchClear) {
    searchClear.hidden = true;
  }
}

function getCstSplashScopeGrid(scope) {
  return document.querySelector(`[data-splash-grid="${scope}"]`);
}

function renderCstSplashSavedEmptyState(activeScope) {
  const emptyState = document.getElementById("cstSplashSavedEmpty");
  if (!emptyState) return;

  const message = CST_SPLASH_SAVED_EMPTY_MESSAGES[activeScope]
    || CST_SPLASH_SAVED_EMPTY_MESSAGES.all;
  const showNewSearchAction = activeScope === "private" || activeScope === "team";

  emptyState.replaceChildren();
  const messageEl = document.createElement("p");
  messageEl.className = "cst-splash__saved-empty-message";
  messageEl.textContent = message;
  emptyState.append(messageEl);

  if (showNewSearchAction) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "cst-splash__saved-empty-action ui-text-button";
    action.dataset.cstSplashNewSearch = "true";
    action.textContent = "Start new search";
    emptyState.append(action);
  }
}

function openCstSplashNewFranchiseesQuery() {
  clearCstSavedSearchSession({ persist: false });
  dismissCstSplash({ refresh: false });
  applyCstSplashQuery({}, { view: "franchisees" });
}

function applyCstSplashSavedVisibility() {
  const stack = document.getElementById("cstSplashScopeStack");
  const emptyState = document.getElementById("cstSplashSavedEmpty");
  if (!stack) return;

  const term = cstSplashSavedSearchTerm.trim().toLowerCase();
  const activeScope = cstSplashSavedActiveScope;
  let totalVisible = 0;

  stack.querySelectorAll(".cst-splash__scope-section").forEach((section) => {
    const sectionScope = section.dataset.splashScope;
    const heading = section.querySelector(".cst-splash__scope-heading");
    let sectionVisible = 0;

    section.querySelectorAll("[data-saved-search-id]").forEach((tile) => {
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
    renderCstSplashSavedEmptyState(activeScope);
    emptyState.hidden = totalVisible > 0;
  }
}

function serializeCstSavedLocationSearch(search) {
  if (!search || typeof search !== "object") return null;

  const serializedSearch = {
    label: String(search.label || "").trim(),
    stateCode: String(search.stateCode || "").trim()
  };
  const longitude = Number(search.coordinates?.longitude);
  const latitude = Number(search.coordinates?.latitude);

  if (!serializedSearch.label) return null;
  if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
    serializedSearch.coordinates = { longitude, latitude };
  }
  if (search.geoLevel) serializedSearch.geoLevel = String(search.geoLevel);
  if (search.geoKey) serializedSearch.geoKey = String(search.geoKey);

  return serializedSearch;
}

function getCurrentCstSavedSearchFilters() {
  return {
    search: searchQuery,
    locations: [...selectedLocationLabels],
    locationsExcluded: [...excludedLocationLabels],
    locationSearches: selectedLocationSearches.map(serializeCstSavedLocationSearch).filter(Boolean),
    locationSearchesExcluded: excludedLocationSearches.map(serializeCstSavedLocationSearch).filter(Boolean),
    categories: [...selectedCategoryValues],
    categoriesExcluded: [...excludedCategoryValues],
    franchisees: [...selectedOwnerIndexes],
    franchiseesExcluded: [...excludedOwnerIndexes],
    franchises: [...selectedFranchiseIndexes],
    franchisesExcluded: [...excludedFranchiseIndexes],
    statuses: statusFilterInputs.map((checkbox) => checkbox.checked),
    units: {
      min: selectedUnitsMin,
      max: selectedUnitsMax
    },
    contacts: {
      min: selectedContactsMin,
      max: selectedContactsMax
    },
    netWorth: {
      min: selectedNetWorthMin,
      max: selectedNetWorthMax
    },
    rating: {
      min: getFranchiseeRatingMin()
    },
    radius: {
      enabled: radiusFilterEnabled,
      miles: selectedRadiusMiles
    },
    userLocation: userLocationCenter
      ? {
          lat: userLocationCenter.lat,
          lng: userLocationCenter.lng,
          label: userLocationCenter.label || "My location"
        }
      : null
  };
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
    selectedRadiusMiles,
    selectedCategoryValues,
    selectedContactsMax,
    selectedContactsMin,
    selectedFranchiseIndexes,
    selectedLocationLabels,
    selectedLocationSearches,
    selectedOwnerIndexes,
    selectedNetWorthMax,
    selectedNetWorthMin,
    selectedFranchiseeRatingMin,
    selectedUnitsMax,
    selectedUnitsMin,
    statusSelections: statusFilterInputs.map((checkbox) => checkbox.checked),
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
    selectedFranchiseeRatingMin = restore.selectedFranchiseeRatingMin;
    userLocationCenter = restore.userLocationCenter;
    radiusFilterEnabled = restore.radiusFilterEnabled;
    selectedRadiusMiles = restore.selectedRadiusMiles;
    statusFilterInputs.forEach((checkbox, index) => {
      checkbox.checked = restore.statusSelections[index];
    });
  }
}

function applyCstSplashFilterState(filters = {}) {
  const units = normalizeCstSplashRange(filters.units, unitsFilterDefaults);
  const contacts = normalizeCstSplashRange(filters.contacts, contactsFilterDefaults);
  const netWorth = normalizeCstSplashRange(filters.netWorth, netWorthFilterDefaults);
  const includedLocationSearches = Array.isArray(filters.locationSearches)
    ? filters.locationSearches
    : [];
  const nextExcludedLocationSearches = Array.isArray(filters.locationSearchesExcluded)
    ? filters.locationSearchesExcluded
    : [];

  searchQuery = String(filters.search || "").trim().toLocaleLowerCase();
  selectedLocationLabels = getSavedStringArray(filters.locations);
  excludedLocationLabels = getSavedStringArray(filters.locationsExcluded);
  selectedLocationSearches = includedLocationSearches
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  if (!selectedLocationSearches.length && selectedLocationLabels.length) {
    selectedLocationSearches = selectedLocationLabels
      .map((label) => window.cstLocationSearch?.fromLabel?.(label))
      .filter(Boolean);
  }
  excludedLocationSearches = nextExcludedLocationSearches
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  if (!excludedLocationSearches.length && excludedLocationLabels.length) {
    excludedLocationSearches = excludedLocationLabels
      .map((label) => window.cstLocationSearch?.fromLabel?.(label))
      .filter(Boolean);
  }
  selectedCategoryValues = getSavedStringArray(filters.categories);
  excludedCategoryValues = getSavedStringArray(filters.categoriesExcluded);
  selectedOwnerIndexes = getSavedStringArray(filters.franchisees || filters.owners);
  excludedOwnerIndexes = getSavedStringArray(filters.franchiseesExcluded || filters.ownersExcluded);
  selectedFranchiseIndexes = getSavedStringArray(filters.franchises);
  excludedFranchiseIndexes = getSavedStringArray(filters.franchisesExcluded);
  selectedUnitsMin = units.min;
  selectedUnitsMax = units.max;
  selectedContactsMin = contacts.min;
  selectedContactsMax = contacts.max;
  selectedNetWorthMin = netWorth.min;
  selectedNetWorthMax = netWorth.max;
  selectedFranchiseeRatingMin = normalizeFranchiseeRatingMin(filters.rating?.min);
  const savedUserLocation = filters.userLocation;
  const savedLatitude = Number(savedUserLocation?.lat);
  const savedLongitude = Number(savedUserLocation?.lng);
  userLocationCenter = Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude)
    ? {
        lat: savedLatitude,
        lng: savedLongitude,
        label: String(savedUserLocation.label || "").trim() || "My location"
      }
    : null;
  radiusFilterEnabled = Boolean(filters.radius?.enabled);
  const savedRadiusMiles = Number(filters.radius?.miles);
  selectedRadiusMiles = Number.isFinite(savedRadiusMiles)
    ? Math.min(
        RADIUS_FILTER_DEFAULTS.max,
        Math.max(RADIUS_FILTER_DEFAULTS.min, Math.round(savedRadiusMiles))
      )
    : RADIUS_FILTER_DEFAULTS.value;
  const savedStatuses = Array.isArray(filters.statuses) ? filters.statuses : [];
  statusFilterInputs.forEach((checkbox, index) => {
    checkbox.checked = Boolean(savedStatuses[index]);
  });
}

function toCstSplashUnitRow(unit) {
  return {
    categories: [unit.category],
    category: unit.category,
    color: unit.color,
    franchise: unit.franchise,
    // A unit can carry several brands, and unit.franchise is only their display
    // form, so filtering has to read the list.
    franchises: Array.isArray(unit.franchises) && unit.franchises.length
      ? unit.franchises
      : [unit.franchise].filter(Boolean),
    lat: unit.lat,
    lng: unit.lng,
    location: unit.label
  };
}

function getCstSplashContactCount(owners) {
  return owners.reduce((total, owner) => total + getOwnerContactCount(owner), 0);
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
    label: "Contacts",
    value: matches.contactCount ?? 0
  };
}

function getCstSplashDatasetLabel(savedSearch) {
  const view = normalizeTableView(savedSearch?.view);
  return getSavedViewEntityTitle(view);
}

function isCstSplashSnapshotGenerateMode() {
  try {
    return new URLSearchParams(window.location.search).has("generateSnapshots");
  } catch (_error) {
    return false;
  }
}

function getCstSplashSnapshotUrl(savedSearch) {
  return savedSearch.snapshot || "";
}

const cstSplashMatchCountCache = new Map();
const cstSplashDynamicPreviewCache = new Map();

function getCstSplashMatchCounts(filters, { needsUnitCount = true } = {}) {
  return withCstSplashFilterScope(filters, () => {
    const matchedOwners = getFilteredFranchisees();
    let unitCount = 0;

    if (needsUnitCount) {
      matchedOwners.forEach((owner) => {
        const units = window.ownerLocationsData?.[owner.originalIndex]?.units || [];
        units.forEach((unit) => {
          if (unitRowMatchesFilters(toCstSplashUnitRow(unit))) {
            unitCount += 1;
          }
        });
      });
    }

    return {
      contactCount: getCstSplashContactCount(matchedOwners),
      ownerCount: matchedOwners.length,
      unitCount
    };
  });
}

// Counts are always recomputed from the loaded roster. A saved search stores the
// figures it was created with, but those describe whichever roster was loaded at
// the time and become wrong the moment the data behind them changes.
function getCachedCstSplashMatchCounts(savedSearch) {
  const cacheKey = savedSearch.id;
  const cached = cstSplashMatchCountCache.get(cacheKey);
  if (cached) return cached;

  const matches = getCstSplashMatchCounts(savedSearch.filters || {}, {
    needsUnitCount: savedSearch.view === "locations"
  });
  cstSplashMatchCountCache.set(cacheKey, matches);
  return matches;
}

function getCstSplashDynamicPreview(savedSearch) {
  const cachedPreview = cstSplashDynamicPreviewCache.get(savedSearch.id);
  if (cachedPreview) return cachedPreview;

  const preview = withCstSplashFilterScope(savedSearch.filters || {}, () => {
    const points = getCstSplashMapPoints();
    const view = computeCstSplashView(points);
    let pointsUrl = "";

    try {
      pointsUrl = buildCstSplashPointsDataUrl(points, view);
    } catch (error) {
      console.warn("Unable to render the saved search preview.", error);
    }

    return {
      baseMapUrl: buildCstSplashBaseMapUrl(view),
      pointsUrl
    };
  });
  cstSplashDynamicPreviewCache.set(savedSearch.id, preview);

  return preview;
}

function isCstUserCreatedSavedSearch(savedSearch) {
  return Boolean(window.cstSavedSearchStore?.canEdit?.(savedSearch?.id));
}

function bindCstSplashMapSkeleton(tile) {
  const map = tile.querySelector(".target-map");
  if (!map) return;

  const images = [...map.querySelectorAll("img")];
  if (!images.length || isCstSplashSnapshotGenerateMode()) {
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

function bindCstSplashTileSettings(tile, savedSearch) {
  const settingsControl = tile.querySelector(".target-settings");
  if (!settingsControl) return;

  const openSavedSearchSettings = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const latestSearch = getCstSplashSavedSearches().find((entry) => entry.id === savedSearch.id)
      || savedSearch;
    window.openCreateTargetModal?.(settingsControl, { savedSearch: latestSearch });
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

function createCstSplashTile(savedSearch, { snapshotUrl, baseMapUrl, metric, pointsUrl } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "target-card cst-splash__tile";
  tile.dataset.savedSearchId = savedSearch.id;
  tile.dataset.title = savedSearch.title;

  const valueLabel = formatCstSplashCount(metric.value);
  const datasetLabel = getCstSplashDatasetLabel(savedSearch);
  tile.setAttribute(
    "aria-label",
    `Open saved search ${savedSearch.title}: ${valueLabel} ${metric.label.toLowerCase()} in ${datasetLabel}`
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
  const canEditFromSplash = isCstUserCreatedSavedSearch(savedSearch);
  const tileActionsMarkup = canEditFromSplash
    ? `
        <span class="target-card-actions">
          <span class="target-settings" role="button" tabindex="0" aria-label="Edit search settings">
            <img src="../../assets/icons/settings.svg" alt="">
          </span>
          <span class="target-chevron" aria-hidden="true">
            <img src="../../assets/icons/chevron.svg" alt="">
          </span>
        </span>
      `
    : `
        <span class="target-chevron" aria-hidden="true">
          <img src="../../assets/icons/chevron.svg" alt="">
        </span>
      `;

  const hasMapImage = Boolean(snapshotImage || baseImage || pointsImage);
  const mapLoadingClass = hasMapImage && !isCstSplashSnapshotGenerateMode() ? " is-loading" : "";

  tile.innerHTML = `
    <div class="target-map${mapLoadingClass}">
      ${snapshotImage}${baseImage}${pointsImage}
      <span class="cst-splash__dataset-tag">${escapeCstSplashHtml(datasetLabel)}</span>
    </div>
    <div class="target-card-title">${escapeCstSplashHtml(savedSearch.title)}</div>
    <div class="target-field target-prospects">
      <span class="target-label">${escapeCstSplashHtml(metric.label)}</span>
      <div class="target-prospects-row">
        <span class="target-number">${valueLabel}</span>
        ${tileActionsMarkup}
      </div>
    </div>
  `;

  tile.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".target-settings")) {
      return;
    }

    openCstSplashSavedSearch(savedSearch);
  });

  if (canEditFromSplash) {
    bindCstSplashTileSettings(tile, savedSearch);
  }

  bindCstSplashMapSkeleton(tile);

  return tile;
}

function createRenderedCstSplashTile(savedSearch) {
  const matches = getCachedCstSplashMatchCounts(savedSearch);
  const snapshotUrl = getCstSplashSnapshotUrl(savedSearch);
  const preview = snapshotUrl ? {} : getCstSplashDynamicPreview(savedSearch);

  return createCstSplashTile(savedSearch, {
    ...preview,
    snapshotUrl,
    metric: getCstSplashTileMetric(savedSearch, matches)
  });
}

function renderCstSplashGenerateTiles() {
  getCstSplashSavedSearches().forEach((savedSearch) => {
    const tileData = withCstSplashFilterScope(savedSearch.filters || {}, () => {
      const points = getCstSplashMapPoints();
      const matchedOwners = getFilteredFranchisees();
      return {
        metric: getCstSplashTileMetric(savedSearch, {
          contactCount: getCstSplashContactCount(matchedOwners),
          ownerCount: matchedOwners.length,
          unitCount: points.length,
          units: points
        }),
        points,
        view: computeCstSplashView(points)
      };
    });

    let pointsUrl = "";
    try {
      pointsUrl = buildCstSplashPointsDataUrl(tileData.points, tileData.view);
    } catch (error) {
      console.warn("Unable to render the saved search preview.", error);
    }

    getCstSplashScopeGrid(savedSearch.scope)?.append(createCstSplashTile(savedSearch, {
      baseMapUrl: buildCstSplashBaseMapUrl(tileData.view),
      metric: tileData.metric,
      pointsUrl
    }));
  });
}

function renderCstSplashTiles({ excludedSearchId = null } = {}) {
  const stack = document.getElementById("cstSplashScopeStack");
  if (!stack) return;

  stack.querySelectorAll("[data-splash-grid]").forEach((grid) => {
    grid.replaceChildren();
  });

  if (isCstSplashSnapshotGenerateMode()) {
    renderCstSplashGenerateTiles();
    applyCstSplashSavedVisibility();
    return;
  }

  getCstSplashSavedSearches()
    .filter((savedSearch) => savedSearch.id !== excludedSearchId)
    .forEach((savedSearch) => {
      getCstSplashScopeGrid(savedSearch.scope)?.append(createRenderedCstSplashTile(savedSearch));
    });

  applyCstSplashSavedVisibility();
}

function animateCstSplashSavedSearchInsertion(savedSearch) {
  const grid = getCstSplashScopeGrid(savedSearch.scope);
  if (!grid) return;

  const savedScroll = document.getElementById("cstSplash");
  savedScroll?.scrollTo({ top: 0, behavior: "auto" });

  const previousPositions = new Map(
    Array.from(grid.children).map((tile) => [
      tile.dataset.savedSearchId,
      tile.getBoundingClientRect()
    ])
  );
  const newTile = createRenderedCstSplashTile(savedSearch);
  newTile.style.pointerEvents = "none";
  grid.prepend(newTile);
  applyCstSplashSavedVisibility();

  const shouldReduceMotion = usesReducedMotion()
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (shouldReduceMotion) {
    newTile.style.removeProperty("pointer-events");
    return;
  }

  newTile.style.opacity = "0";
  newTile.style.filter = `blur(${CST_SPLASH_SAVED_INSERT_BLUR_PX}px)`;

  const existingTiles = Array.from(grid.children).filter((tile) => tile !== newTile);

  animateCstSplashSavedSearchShift(
    existingTiles,
    previousPositions,
    CST_SPLASH_SAVED_INSERT_SHIFT_DURATION_MS,
    CST_SPLASH_SAVED_INSERT_SHIFT_EASING
  ).finally(() => {
    const revealAnimation = newTile.animate([
      { opacity: 0, filter: `blur(${CST_SPLASH_SAVED_INSERT_BLUR_PX}px)` },
      { opacity: 1, filter: "blur(0px)" }
    ], {
      duration: CST_SPLASH_SAVED_INSERT_REVEAL_MS,
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

function animateCstSplashSavedSearchShift(
  remainingTiles,
  previousPositions,
  duration = CST_SPLASH_SAVED_INSERT_SHIFT_DURATION_MS,
  easing = CST_SPLASH_SAVED_INSERT_SHIFT_EASING
) {
  const animations = [];

  remainingTiles.forEach((tile) => {
    const previousPosition = previousPositions.get(tile.dataset.savedSearchId);
    if (!previousPosition) return;

    const nextPosition = tile.getBoundingClientRect();
    const deltaX = previousPosition.left - nextPosition.left;
    const deltaY = previousPosition.top - nextPosition.top;
    if (!deltaX && !deltaY) return;

    animations.push(tile.animate([
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration,
      easing
    }));
  });

  return Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
}

function captureCstSplashOtherSectionPositions(currentSection) {
  if (cstSplashSavedActiveScope !== "all" || !currentSection) return new Map();

  return new Map(
    Array.from(document.querySelectorAll("#cstSplashScopeStack .cst-splash__scope-section"))
      .filter((section) => section !== currentSection && !section.hidden)
      .map((section) => [section, section.getBoundingClientRect()])
  );
}

function animateCstSplashSectionShift(
  previousPositions,
  duration = CST_SPLASH_SAVED_DELETE_SHIFT_DURATION_MS,
  easing = CST_SPLASH_SAVED_DELETE_SHIFT_EASING
) {
  const animations = [];

  previousPositions.forEach((previousPosition, section) => {
    if (section.hidden) return;

    const nextPosition = section.getBoundingClientRect();
    const deltaX = previousPosition.left - nextPosition.left;
    const deltaY = previousPosition.top - nextPosition.top;
    if (!deltaX && !deltaY) return;

    animations.push(section.animate([
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], { duration, easing }));
  });

  return Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
}

function animateCstSplashSavedSearchDeletion(savedSearchId) {
  const removedTile = document.querySelector(
    `#cstSplashScopeStack [data-saved-search-id="${CSS.escape(savedSearchId)}"]`
  );
  const grid = removedTile?.closest("[data-splash-grid]");
  if (!grid || !removedTile) return;

  const savedScroll = document.getElementById("cstSplash");
  savedScroll?.scrollTo({ top: 0, behavior: "auto" });

  const shouldReduceMotion = usesReducedMotion()
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (shouldReduceMotion) {
    removedTile.remove();
    applyCstSplashSavedVisibility();
    return;
  }

  removedTile.style.pointerEvents = "none";

  const blurCompleteOffset = CST_SPLASH_SAVED_DELETE_BLUR_MS / CST_SPLASH_SAVED_DELETE_FADE_MS;
  const removalAnimation = removedTile.animate([
    { opacity: 1, filter: "blur(0px)", offset: 0 },
    {
      opacity: 1,
      filter: `blur(${CST_SPLASH_SAVED_DELETE_BLUR_PX}px)`,
      offset: blurCompleteOffset
    },
    {
      opacity: 0,
      filter: `blur(${CST_SPLASH_SAVED_DELETE_BLUR_PX}px)`,
      offset: 1
    }
  ], {
    duration: CST_SPLASH_SAVED_DELETE_FADE_MS,
    easing: "ease",
    fill: "forwards"
  });

  removalAnimation.finished
    .catch(() => {})
    .finally(() => {
      const remainingTiles = Array.from(grid.children).filter((tile) => tile !== removedTile);
      const previousPositions = new Map(
        remainingTiles.map((tile) => [
          tile.dataset.savedSearchId,
          tile.getBoundingClientRect()
        ])
      );
      const previousSectionPositions = captureCstSplashOtherSectionPositions(
        grid.closest(".cst-splash__scope-section")
      );

      removedTile.remove();
      applyCstSplashSavedVisibility();

      animateCstSplashSavedSearchShift(
        remainingTiles,
        previousPositions,
        CST_SPLASH_SAVED_DELETE_SHIFT_DURATION_MS,
        CST_SPLASH_SAVED_DELETE_SHIFT_EASING
      );
      animateCstSplashSectionShift(
        previousSectionPositions,
        CST_SPLASH_SAVED_DELETE_SHIFT_DURATION_MS,
        CST_SPLASH_SAVED_DELETE_SHIFT_EASING
      );
    });
}

function saveCurrentCstView({
  title,
  description = "",
  visibility = "private",
  alerts = null
} = {}) {
  const filters = getCurrentCstSavedSearchFilters();
  const matches = getCstSplashMatchCounts(filters);
  const savedSearch = window.cstSavedSearchStore?.create?.({
    title,
    description,
    scope: visibility,
    alerts,
    view: currentTableView,
    filters,
    ownerCount: matches.ownerCount,
    unitCount: matches.unitCount
  });
  if (!savedSearch) return null;

  cstSplashMatchCountCache.set(savedSearch.id, matches);

  return savedSearch;
}

function updateCstSavedView(searchId, {
  title,
  description = "",
  visibility = "private",
  alerts = null
} = {}) {
  if (!window.cstSavedSearchStore?.canEdit?.(searchId)) return null;

  const savedSearch = window.cstSavedSearchStore?.update?.(searchId, {
    title,
    description,
    scope: visibility,
    alerts
  });
  if (!savedSearch) return null;

  renderCstSplashTiles();
  if (isCstSplashOpen()) {
    setCstSplashSavedScope(savedSearch.scope);
  }
  return savedSearch;
}

function deleteCstSavedView(searchId) {
  if (!window.cstSavedSearchStore?.canEdit?.(searchId)) return null;

  const searches = getCstSplashSavedSearches();
  const savedSearch = searches.find((entry) => entry.id === searchId);
  if (!savedSearch) return null;

  const scopeIndex = searches
    .filter((entry) => entry.scope === savedSearch.scope)
    .findIndex((entry) => entry.id === searchId);
  const removedSearch = window.cstSavedSearchStore?.remove?.(searchId);
  if (!removedSearch) return null;

  cstSplashMatchCountCache.delete(searchId);
  cstSplashDynamicPreviewCache.delete(searchId);

  return {
    savedSearch: removedSearch,
    scopeIndex: Math.max(0, scopeIndex)
  };
}

function revealNewCstSplashSavedSearch(savedSearch) {
  if (!savedSearch) return;

  resetCstSplashSavedSearchFilter();
  setCstSplashSavedScope(savedSearch.scope, { render: false });
  renderCstSplashTiles({ excludedSearchId: savedSearch.id });
  showCstSplash({ animate: false });

  whenCstSplashVisible(() => {
    animateCstSplashSavedSearchInsertion(savedSearch);
    const newTile = document.querySelector(
      `#cstSplashScopeStack [data-saved-search-id="${CSS.escape(savedSearch.id)}"]`
    );
    newTile?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function cstSplashScopeContainsSavedSearch(scope, savedSearch) {
  return scope === "all" || scope === savedSearch?.scope;
}

function revealDeletedCstSplashSavedSearch({ savedSearch, scopeIndex = 0 } = {}) {
  if (!savedSearch) return;

  resetCstSplashSavedSearchFilter();
  if (!cstSplashScopeContainsSavedSearch(cstSplashSavedActiveScope, savedSearch)) {
    setCstSplashSavedScope(savedSearch.scope, { render: false });
  }

  const existingTile = document.querySelector(
    `#cstSplashScopeStack [data-saved-search-id="${CSS.escape(savedSearch.id)}"]`
  );

  if (!existingTile) {
    renderCstSplashTiles();
    const grid = getCstSplashScopeGrid(savedSearch.scope);
    if (grid) {
      const removedTile = createRenderedCstSplashTile(savedSearch);
      grid.insertBefore(removedTile, grid.children[Math.max(0, scopeIndex)] || null);
    }
  }

  applyCstSplashSavedVisibility();
  showCstSplash({ animate: false });

  whenCstSplashVisible(() => {
    animateCstSplashSavedSearchDeletion(savedSearch.id);
  });
}

/* Applying a query ------------------------------------------------------ */

function isCstLocationFilterSection(section) {
  return section.dataset.filterSection === "location"
    || Boolean(section.querySelector("#locationFilterSearchField"));
}

function resetCstFilterSectionsToDefault() {
  if (!filterPanel) return;

  window.WefranchFilterSections.applyExpansion(filterPanel, {
    mode: "reset",
    shouldExpand: isCstLocationFilterSection
  });

  if (viewSettingsReadyToPersist && !isRestoringViewSettings) {
    persistViewSettings();
  }
}

function expandCstSplashFilterSections() {
  if (!filterPanel) return;

  const activeSections = new Set();
  const markActive = (element, isActive) => {
    if (!isActive) return;
    const section = element?.closest(".filter-section");
    if (section) activeSections.add(section);
  };

  markActive(locationFilterSearchField, true);
  markActive(categoryFilterSelect, selectedCategoryValues.length || excludedCategoryValues.length);
  markActive(ownerFilterSelect, selectedOwnerIndexes.length || excludedOwnerIndexes.length);
  markActive(franchiseFilterSelect, selectedFranchiseIndexes.length || excludedFranchiseIndexes.length);
  markActive(unitsMinRange, unitsFilterIsActive());
  markActive(contactsMinRange, contactsFilterIsActive());
  markActive(netWorthMinRange, netWorthFilterIsActive());
  markActive(document.getElementById("franchiseeRatingFilterSection"), franchiseeRatingFilterIsActive());

  window.WefranchFilterSections.applyExpansion(filterPanel, {
    mode: "preserve",
    shouldExpand: (section) => isCstLocationFilterSection(section) || activeSections.has(section)
  });
}

function expandCstFilterSectionOnly(sectionKey) {
  if (!filterPanel || !sectionKey) return;

  window.WefranchFilterSections.applyExpansion(filterPanel, {
    mode: "reset",
    shouldExpand: (section) => section.dataset.filterSection === sectionKey
  });

  if (viewSettingsReadyToPersist && !isRestoringViewSettings) {
    persistViewSettings();
  }
}

function applyCstSplashQuery(filters = {}, { view = "franchisees" } = {}) {
  view = normalizeTableView(view);
  resetCstFilterSelections({ refresh: false });
  applyCstSplashFilterState(filters);
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;

  syncFilterLocationSearchUI();
  setFilterSelectIncludedExcludedValues(categoryFilterSelect, selectedCategoryValues, excludedCategoryValues);
  setFilterSelectIncludedExcludedValues(ownerFilterSelect, selectedOwnerIndexes, excludedOwnerIndexes);
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, selectedFranchiseIndexes, excludedFranchiseIndexes);
  syncFilterComboboxes();

  const autoRadiusSearch = (Array.isArray(filters.locationSearches) ? filters.locationSearches : []).find((search) => (
    window.cstLocationSearch?.shouldAutoEnableRadius?.(search)
  ));
  const hasSavedRadiusState = filters.radius && typeof filters.radius === "object";
  if (!hasSavedRadiusState && autoRadiusSearch) {
    applyAutoRadiusForLocationResult(autoRadiusSearch);
  }

  syncStatusFilterStates();
  syncUnitsFilterControls();
  syncContactsFilterControls();
  syncNetWorthFilterControls();
  setFranchiseeRatingMin(selectedFranchiseeRatingMin);
  syncRadiusFilterControls();
  syncToolbarSearchInput();
  expandCstSplashFilterSections();

  if (view !== currentTableView) {
    setMainTableView(view);
  }
  refreshFilteredViews();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function openCstSplashSavedSearch(savedSearch) {
  dismissCstSplash({ refresh: false });
  // Enter read mode before applying filters so a slow location query cannot
  // leave the workspace looking like edit mode, and so a later apply error
  // cannot skip read mode entirely.
  setReaderMode(true, { title: savedSearch.title, savedSearchId: savedSearch.id });
  applyCstSplashQuery(savedSearch.filters || {}, { view: normalizeTableView(savedSearch.view) });
}

function restoreCstSavedSearchSession() {
  const urlState = getCstSavedSearchUrlState();
  const storedSearchId = savedViewSettings?.savedSearchId ?? null;
  const searchId = urlState?.searchId ?? storedSearchId;
  if (!searchId) return;

  const savedSearch = getSavedSearchById(searchId);
  if (!savedSearch) {
    clearCstSavedSearchSession({ persist: false });
    return;
  }

  activeSavedSearchId = searchId;

  const mode = urlState?.mode ?? (savedViewSettings?.readerMode === false ? "edit" : "read");

  isRestoringViewSettings = true;

  try {
    if (urlState && getAppliedFilterCount() === 0) {
      applyCstSplashQuery(savedSearch.filters || {}, { view: normalizeTableView(savedSearch.view) });
    }

    if (mode === "read") {
      setReaderMode(true, { title: savedSearch.title, persist: false });
    } else {
      setReaderMode(false, { persist: false });
      setFilterPanelOpen(true);
    }

    if (!urlState) {
      syncCstSavedSearchUrl({ searchId, mode });
    }
  } finally {
    isRestoringViewSettings = false;
    viewSettingsReadyToPersist = true;
    persistViewSettings();
  }
}

/* Show & hide ----------------------------------------------------------- */

function getCstSplashElement() {
  return document.getElementById("cstSplash");
}

function isCstSplashFullyVisible(splash = getCstSplashElement()) {
  if (!splash || splash.hidden) return false;

  const style = getComputedStyle(splash);
  return style.visibility === "visible"
    && Number.parseFloat(style.opacity) >= 0.99;
}

function whenCstSplashVisible(callback) {
  const splash = getCstSplashElement();
  if (!splash) {
    callback();
    return;
  }

  if (
    isCstSplashFullyVisible(splash)
    || usesReducedMotion()
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    callback();
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    splash.removeEventListener("transitionend", onTransitionEnd);
    callback();
  };

  const onTransitionEnd = (event) => {
    if (event.target !== splash || event.propertyName !== "opacity") return;
    finish();
  };

  splash.addEventListener("transitionend", onTransitionEnd);

  const pollVisibility = () => {
    if (finished) return;
    if (isCstSplashFullyVisible(splash)) {
      finish();
      return;
    }
    requestAnimationFrame(pollVisibility);
  };

  requestAnimationFrame(pollVisibility);
}

function isCstSplashOpen() {
  return Boolean(card?.classList.contains("is-splash-open"));
}

function getCstSplashToolbarHeader() {
  return document.querySelector(".header");
}

function syncCstSplashToolbarDivider(active = isCstSplashOpen()) {
  const header = getCstSplashToolbarHeader();
  const splash = getCstSplashElement();
  if (!header) return;

  header.classList.toggle(
    "is-scrolled",
    Boolean(active && splash && !splash.hidden && splash.scrollTop > 0)
  );
}

function bindCstSplashToolbarDivider() {
  const splash = getCstSplashElement();
  if (!splash) return;

  splash.addEventListener("scroll", () => syncCstSplashToolbarDivider(), { passive: true });
  syncCstSplashToolbarDivider();
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
    updateOwnersMapResetVisibility?.();
    return;
  }

  if (!isSplashOpen && !card.classList.contains("is-map-open")) {
    openMapPanel("map");
  }
}

function returnToCstSplash() {
  showCstSplash({ animate: true });
  updateClearFiltersButton();
}

function showCstSplash({ animate = false } = {}) {
  const splash = getCstSplashElement();
  if (!splash) return;

  cstSplashSearchController?.reset();
  hideCstTableLoading?.({ immediate: true });
  cancelCstTableEnterAnimation?.();
  card?.classList.remove("is-splash-hiding-workspace");
  syncCstSplashMapPanelForSplash(true);
  resetCstFilterSectionsToDefault();
  clearCstSavedSearchSession({ persist: false });
  setFilterPanelOpen(false);
  setCstSplashWorkspaceInert(true);
  card?.classList.add("is-splash-open");
  window.syncSiteHeaderBreadcrumb?.();
  splash.hidden = false;
  splash.classList.remove("is-leaving", "is-entering", "is-entering-active", "is-preparing-enter");
  syncCstSplashToolbarViewState();
  syncCstSplashToolbarDivider(true);
  persistViewSettings();

  if (animate) {
    playCstSplashEnterAnimation(splash);
    return;
  }

  requestAnimationFrame(() => focusCstSplashSearchInput());
}

function revealCstSplashWorkspace() {
  card?.classList.remove("is-splash-hiding-workspace");
  tryStartCstMatchedReveal?.();
}

function dismissCstSplash({ refresh = true } = {}) {
  const splash = getCstSplashElement();

  if (isCstSplashOpen()) {
    resetCstFilterSectionsToDefault();
  }
  card?.classList.remove("is-splash-open");
  window.syncSiteHeaderBreadcrumb?.();
  card?.classList.add("is-splash-hiding-workspace");
  syncCstSplashToolbarDivider(false);
  setCstSplashWorkspaceInert(false);
  setFilterPanelOpen(true);
  syncCstSplashMapPanelForSplash(false);
  syncToolbarViewState();
  beginCstResultsLoading?.();
  persistViewSettings();

  if (!splash || splash.hidden) {
    revealCstSplashWorkspace();
    if (refresh) refreshFilteredViews();
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

  if (refresh) refreshFilteredViews();
}

function hideCstSplashImmediately() {
  const splash = getCstSplashElement();
  card?.classList.remove("is-splash-open", "is-splash-hiding-workspace");
  window.syncSiteHeaderBreadcrumb?.();
  syncCstSplashToolbarDivider(false);
  cancelCstTableEnterAnimation?.();
  setCstSplashWorkspaceInert(false);
  syncToolbarViewState();
  persistViewSettings();

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

function normalizeCstSplashSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCstSplashCategoryMatchIndex(label, query) {
  const normalizedLabel = normalizeCstSplashSearchText(label);
  const normalizedQuery = normalizeCstSplashSearchText(query);
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

function isExactCstSplashSuggestion(item, query) {
  return normalizeCstSplashSearchText(item?.label) === normalizeCstSplashSearchText(query);
}

function getCstSplashCategoryPool() {
  const names = new Set();

  Array.from(categoryFilterSelect?.options || []).forEach((option) => {
    if (option.value) names.add(option.value);
  });

  owners.forEach((owner) => {
    getOwnerCategories(owner).forEach((category) => names.add(category));
  });

  return [...names].sort((left, right) => left.localeCompare(right));
}

function getCstSplashLocalSuggestionPool() {
  const brandNames = [...new Set(owners.flatMap((owner) => getOwnerFranchises(owner)))];

  return [
    ...owners.map((owner) => ({
      filters: { franchisees: [String(owner.originalIndex)] },
      group: "Franchisees",
      label: owner.ownerName,
      logoFallback: getInitials(owner.ownerName),
      logoSrc: owner.logoSrc,
      type: "franchisee"
    })),
    ...brandNames.map((brandName) => ({
      filters: { franchises: [brandName] },
      group: "Franchises",
      label: brandName,
      logoFallback: getInitials(brandName),
      logoSrc: getFranchiseLogoSrc(brandName),
      type: "brand"
    })),
    ...getCstSplashCategoryPool().map((categoryName) => ({
      filters: { categories: [categoryName] },
      group: "Categories",
      label: categoryName,
      type: "category"
    }))
  ];
}

function getCstSplashLocalSuggestions(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) return [];

  const matchesByGroup = new Map();

  getCstSplashLocalSuggestionPool().forEach((item) => {
    const matchIndex = item.type === "category"
      ? getCstSplashCategoryMatchIndex(item.label, query)
      : item.label.toLocaleLowerCase().indexOf(normalizedQuery);
    if (matchIndex === -1) return;

    const groupMatches = matchesByGroup.get(item.group) || [];
    groupMatches.push({ ...item, matchIndex });
    matchesByGroup.set(item.group, groupMatches);
  });

  return CST_SPLASH_SUGGESTION_GROUPS
    .filter((group) => group !== "Locations")
    .flatMap((group) => (
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

  let locationResults = [];
  try {
    locationResults = await window.cstLocationSearch?.fetchSuggestions?.(query, {
      signal,
      limit: CST_SPLASH_SUGGESTION_GROUP_LIMIT
    }) || [];
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    locationResults = [];
  }

  const locationSuggestions = locationResults
    .map(toCstSplashLocationSuggestion)
    .filter(Boolean)
    .slice(0, CST_SPLASH_SUGGESTION_GROUP_LIMIT);

  return [...localSuggestions, ...locationSuggestions];
}

const CST_SPLASH_SUGGESTION_ICON_SRCS = {
  category: "assets/categories.png"
};

const CST_SPLASH_SUGGESTION_ICONS = {
  location: `<svg viewBox="0 0 16 20" focusable="false"><path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/></svg>`
};

function createCstSplashSuggestionIcon(item) {
  const icon = document.createElement("span");
  icon.className = "cst-splash__search-suggestion-icon";
  icon.setAttribute("aria-hidden", "true");

  if (item.logoSrc || item.logoFallback) {
    icon.classList.add("has-logo");

    const fallback = document.createElement("span");
    fallback.className = "cst-splash__search-suggestion-logo-fallback";
    fallback.textContent = item.logoFallback || "";
    icon.append(fallback);

    if (!item.logoSrc) {
      icon.classList.add("is-logo-missing");
      return icon;
    }

    const image = document.createElement("img");
    image.src = item.logoSrc;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.remove();
      icon.classList.add("is-logo-missing");
    });
    icon.append(image);
    return icon;
  }

  const assetSrc = CST_SPLASH_SUGGESTION_ICON_SRCS[item.type];
  if (assetSrc) {
    icon.classList.add("is-category");
    icon.style.setProperty("--suggestion-icon", `url("${assetSrc}")`);
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
    actionKey.src = "../../assets/icons/enter.svg";
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
      status.textContent = "No franchisees, brands, categories, or locations match.";
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
    clearCstSavedSearchSession({ persist: false });
    dismissCstSplash({ refresh: false });
    applyCstSplashQuery(item.filters);
  }

  async function submitFreeTextSearch() {
    const query = input.value.trim();
    if (!query) {
      setCstSplashSearchFeedback("Enter a franchisee, brand, category, or location to begin.");
      input.focus();
      return;
    }

    const localSuggestions = getCstSplashLocalSuggestions(query);
    const exactLocalMatch = localSuggestions.find((item) => isExactCstSplashSuggestion(item, query));
    if (exactLocalMatch) {
      selectSuggestion(exactLocalMatch);
      return;
    }

    const locationResult = await window.cstLocationSearch?.resolveSearch?.(query);
    if (locationResult) {
      selectSuggestion(toCstSplashLocationSuggestion(locationResult));
      return;
    }

    if (localSuggestions[0]) {
      selectSuggestion(localSuggestions[0]);
      return;
    }

    closeSuggestions();
    setCstSplashSearchFeedback();
    clearCstSavedSearchSession({ persist: false });
    dismissCstSplash({ refresh: false });
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

  bindCstSplashSearchFloatingTooltip(clearButton);
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

function bindCstSplashSavedEmptyActions() {
  const emptyState = document.getElementById("cstSplashSavedEmpty");
  if (!emptyState) return;

  emptyState.addEventListener("click", (event) => {
    if (!event.target.closest("[data-cst-splash-new-search]")) return;
    event.preventDefault();
    openCstSplashNewFranchiseesQuery();
  });
}

function bindCstSplashSavedTabs() {
  const tabs = Array.from(document.querySelectorAll(".cst-splash__saved .scope-tab"));
  const searchInput = document.getElementById("cstSplashSavedSearch");
  const searchClear = document.getElementById("cstSplashSavedSearchClear");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setCstSplashSavedScope(tab.dataset.scope || "all");
    });
  });

  if (searchInput) {
    const searchField = searchInput.closest(".scope-search");

    searchInput.addEventListener("input", () => {
      cstSplashSavedSearchTerm = searchInput.value;
      searchField?.classList.toggle("is-active-search", Boolean(cstSplashSavedSearchTerm.trim()));
      if (searchClear) {
        searchClear.hidden = !cstSplashSavedSearchTerm.trim();
      }
      applyCstSplashSavedVisibility();
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

function bindCstSplashEntryPoints() {
  readerBackBtn?.addEventListener("click", () => {
    showCstSplash({ animate: true });
  });

  // Reaching for a workspace control in the toolbar means the user is done with
  // the splash, so it steps aside instead of hiding whatever they just opened.
  toolbarSearchInput?.addEventListener("input", dismissOpenCstSplash);
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
      if (viewKey !== "franchisees" && viewKey !== "candidates") return;

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
  if (!splash) {
    window.wefranchPageLoading?.done();
    return;
  }

  try {
    bindCstSplashSearch();
    bindCstSplashSavedTabs();
    bindCstSplashSavedEmptyActions();
    bindCstSplashEntryPoints();
    bindCstSplashToolbarDivider();

    if (isCstSplashSnapshotGenerateMode()) {
      splash.classList.add("is-snapshot-export");
      renderCstSplashTiles();
      showCstSplash({ animate: false });
      return;
    }

    renderCstSplashTiles();
    if (shouldResetCstToSplashOnLoad()) {
      clearCstUrlQueryParams();
      clearCstSavedSearchSession({ persist: false });
      showCstSplash({ animate: true });
      return;
    }

    // A saved search addressed in the URL is an explicit request for that query,
    // so it outranks whatever the stored session was looking at. Read it before
    // restoring, which writes the active search back into the URL.
    const hasUrlSavedSearch = Boolean(getCstSavedSearchUrlState());
    restoreCstSavedSearchSession();

    if (hasUrlSavedSearch || !shouldOpenCstSplashOnLoad()) {
      hideCstSplashImmediately();
      return;
    }

    showCstSplash({ animate: true });
  } finally {
    window.wefranchPageLoading?.done();
  }
}

window.cstSplash = {
  deleteSavedView: deleteCstSavedView,
  dismiss: dismissCstSplash,
  getMatchCounts: getCachedCstSplashMatchCounts,
  getSavedSearches: getCstSplashSavedSearches,
  revealDeletedSearch: revealDeletedCstSplashSavedSearch,
  revealSavedSearch: revealNewCstSplashSavedSearch,
  saveCurrentView: saveCurrentCstView,
  show: showCstSplash,
  updateSavedView: updateCstSavedView
};

initCstSplash();
