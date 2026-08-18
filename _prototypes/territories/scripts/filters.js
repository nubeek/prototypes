const TERRITORY_SETTINGS_STORAGE_KEY = "wefranch-territories-list-settings";
const TERRITORY_SETTINGS_VERSION = 2;
const INVESTMENT_HISTOGRAM_BINS = 24;
const DEFAULT_TERRITORY_STATUSES = ["available"];
const TERRITORY_GEO_LEVEL_FILTER_VALUES = new Set([
  "region",
  "cbsa",
  "district",
  "place"
]);
const RADIUS_FILTER_DEFAULTS = {
  min: 10,
  max: 500,
  step: 10,
  value: 50
};
const LOCATION_AUTO_RADIUS_MILES = {
  address: 10,
  place: 30
};
const LOCATION_VIEWPORT_RADIUS_MILES = 50;
const TERRITORY_FILTER_COALESCE_MS = 60;
const TERRITORY_FILTER_SLICE_BUDGET_MS = 12;
const TERRITORY_FILTER_SLICE_CHECK_MASK = 255;
const {
  enhance: enhanceFilterCombobox,
  getOptions: getComboboxOptions,
  getValues: getFilterSelectValues,
  getIncludedValues: getFilterSelectIncludedValues,
  getExcludedValues: getFilterSelectExcludedValues,
  setValues: setFilterSelectValues,
  setIncludedExcludedValues: setFilterSelectIncludedExcludedValues,
  syncAll: syncFilterComboboxes,
  renderChip: renderFilterChip
} = window.WefranchFilterCombobox;

const {
  isCurrencyNumberInput,
  parseCurrencyInputValue,
  formatCurrencyInputValue,
  getFilterNumberInputValue,
  setFilterNumberInputDisplay,
  syncRangeTrack,
  bindRangeTrack: bindSharedRangeTrack,
  renderHistogram: renderSharedFilterHistogram,
  setSectionRangeValues
} = window.WefranchFilterRange;

let territoryFilterRunToken = 0;
let territoryFilterCoalesceTimer = 0;
let territorySettingsReadyToPersist = false;
let isRestoringTerritorySettings = false;
let radiusFilterEnabled = false;
let selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
let selectedLocationSearches = [];
let implicitViewportBounds = null;
let filterLocationSearchControl = null;
const savedTerritorySettings = readSavedTerritorySettings();

function setTerritoryStatusFilters(statuses) {
  const statusSet = new Set(getSavedStringArray(statuses));
  Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value)
    .forEach((checkbox) => {
      checkbox.checked = statusSet.has(checkbox.value);
      setFilterCheckboxState(checkbox, checkbox.checked);
    });
}

function getTerritoryGeoLevelCheckboxes() {
  return Array.from(document.querySelectorAll(".territory-geo-level-checkbox"));
}

function normalizeTerritoryGeoLevelFilters(values) {
  const requestedValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? [values]
      : [];

  return [...new Set(
    requestedValues
      .map(String)
      .filter((value) => TERRITORY_GEO_LEVEL_FILTER_VALUES.has(value))
  )];
}

function getTerritoryGeoLevelFilters() {
  return getTerritoryGeoLevelCheckboxes()
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
}

function setTerritoryGeoLevelFilters(values) {
  const selectedValues = new Set(normalizeTerritoryGeoLevelFilters(values));

  getTerritoryGeoLevelCheckboxes().forEach((checkbox) => {
    checkbox.checked = selectedValues.has(checkbox.value);
    setFilterCheckboxState(checkbox, checkbox.checked);
  });
}

function syncGeoLevelFilterVisibility(brands = window.territoryBrands || []) {
  const section = document.getElementById("geoLevelFilterSection");
  if (!section) return;

  const visible = brands.some((brand) => brand.level === "geo");
  section.hidden = !visible;

  if (!visible) {
    setTerritoryGeoLevelFilters([]);
  }
}

function readSavedTerritorySettings() {
  try {
    const savedValue = window.localStorage?.getItem(TERRITORY_SETTINGS_STORAGE_KEY);
    if (!savedValue) return null;
    const parsedValue = JSON.parse(savedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
  } catch (error) {
    console.warn("Unable to read saved territory settings.", error);
    return null;
  }
}

function writeSavedTerritorySettings(settings) {
  try {
    window.localStorage?.setItem(TERRITORY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Unable to save territory settings.", error);
  }
}

function persistTerritorySettings() {
  if (!territorySettingsReadyToPersist || isRestoringTerritorySettings) return;
  writeSavedTerritorySettings(getCurrentTerritorySettings());
}

function getSavedStringArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function getFilterSectionStorageKey(section, index) {
  const label = section.querySelector(".filter-section-title span")?.textContent?.trim();
  return label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `section-${index}`;
}

function getFilterSectionSettings() {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return {};

  return Array.from(filterPanel.querySelectorAll(".filter-section"))
    .reduce((settings, section, index) => {
      settings[getFilterSectionStorageKey(section, index)] = section.classList.contains("filter-section-collapsed");
      return settings;
    }, {});
}

function getFranchiseeRatingRadios() {
  return Array.from(document.querySelectorAll(".territory-rating-radio"));
}

function normalizeFranchiseeRatingMin(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return [1, 2, 3, 4].reduce((closest, option) => (
    Math.abs(option - numeric) < Math.abs(closest - numeric) ? option : closest
  ));
}

function getFranchiseeRatingMin() {
  const selected = document.querySelector(".territory-rating-radio:checked");
  return normalizeFranchiseeRatingMin(selected?.value ?? 0);
}

function franchiseeRatingFilterIsActive() {
  return getFranchiseeRatingMin() > 0;
}

function getCurrentTerritorySettings() {
  const shell = document.querySelector(".territory-shell");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);

  return {
    version: TERRITORY_SETTINGS_VERSION,
    filters: {
      open: Boolean(shell?.classList.contains("is-filter-open")),
      sections: getFilterSectionSettings(),
      locations: {
        included: getLocationIncludedStates(),
        excluded: getLocationExcludedStates()
      },
      locationSearch: getIncludedLocationSearches()[0] || selectedLocationSearches[0] || null,
      locationSearches: selectedLocationSearches.map((location) => ({ ...location })),
      radius: {
        enabled: radiusFilterEnabled,
        miles: selectedRadiusMiles
      },
      categories: {
        included: getFilterSelectIncludedValues(categoryFilterSelect),
        excluded: getFilterSelectExcludedValues(categoryFilterSelect)
      },
      franchises: {
        included: getFilterSelectIncludedValues(franchiseFilterSelect),
        excluded: getFilterSelectExcludedValues(franchiseFilterSelect)
      },
      statuses: statusCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value),
      geoLevels: getTerritoryGeoLevelFilters(),
      investment: {
        min: Math.min(investmentRange.min, investmentRange.max),
        max: Math.max(investmentRange.min, investmentRange.max)
      },
      rating: {
        min: getFranchiseeRatingMin(),
        max: 5
      },
      search: searchInput?.value.trim() || ""
    },
    settings: {
      mapPanelOpen: Boolean(shell?.classList.contains("is-map-panel-open")),
      brandLogos: document.getElementById("territoryBrandLogosToggleOption")?.getAttribute("aria-checked") === "true",
      borders: document.getElementById("territoryBordersToggleOption")?.getAttribute("aria-checked") === "true",
      density: document.getElementById("territoryDensityToggleOption")?.getAttribute("aria-checked") === "true"
    }
  };
}

function normalizeSavedLocationSearch(savedSearch) {
  if (!savedSearch?.stateCode) return null;

  const coordinates = savedSearch.coordinates;
  const longitude = Number(coordinates?.longitude);
  const latitude = Number(coordinates?.latitude);

  return {
    label: String(savedSearch.label || window.territoryLocationSearch?.getStateLabel?.(savedSearch.stateCode) || savedSearch.stateCode),
    stateCode: String(savedSearch.stateCode),
    coordinates: Number.isFinite(longitude) && Number.isFinite(latitude)
      ? { longitude, latitude }
      : null,
    geoLevel: savedSearch.geoLevel ? String(savedSearch.geoLevel) : null,
    geoKey: savedSearch.geoKey ? String(savedSearch.geoKey) : null,
    excluded: Boolean(savedSearch.excluded)
  };
}

function getLocationSearchKey(location) {
  if (!location?.stateCode) return "";
  if (isStateOnlyLocationSearch(location)) return `region:${location.stateCode}`;
  if (location.geoKey) return `${location.geoLevel || "location"}:${location.geoKey}`;
  if (location.coordinates) {
    return [
      location.stateCode,
      Number(location.coordinates.longitude).toFixed(5),
      Number(location.coordinates.latitude).toFixed(5)
    ].join(":");
  }

  return [
    location.geoLevel || "region",
    location.stateCode,
    String(location.label || "").trim().toLocaleLowerCase()
  ].join(":");
}

function isStateOnlyLocationSearch(location) {
  return Boolean(location?.stateCode)
    && !location.geoKey
    && !location.coordinates
    && (location.geoLevel === "region" || !location.geoLevel);
}

function createStateLocationSearch(stateCode, { excluded = false } = {}) {
  const code = String(stateCode || "");
  if (!code) return null;

  return {
    label: window.territoryLocationSearch?.getStateLabel?.(code) || code,
    stateCode: code,
    coordinates: null,
    geoLevel: "region",
    geoKey: null,
    excluded
  };
}

function toLocationSearch(result, { excluded = false } = {}) {
  if (!result?.stateCode) return null;

  return {
    label: result.label,
    stateCode: result.stateCode,
    coordinates: result.coordinates || null,
    geoLevel: result.geoLevel || null,
    geoKey: result.geoKey || null,
    excluded
  };
}

function getIncludedLocationSearches() {
  return selectedLocationSearches.filter((location) => !location.excluded);
}

function getExcludedLocationSearches() {
  return selectedLocationSearches.filter((location) => location.excluded);
}

function getLocationIncludedStates() {
  return getIncludedLocationSearches()
    .filter(isStateOnlyLocationSearch)
    .map((location) => location.stateCode);
}

function getLocationExcludedStates() {
  return getExcludedLocationSearches()
    .filter(isStateOnlyLocationSearch)
    .map((location) => location.stateCode);
}

function upsertLocationSearch(nextLocation) {
  const nextKey = getLocationSearchKey(nextLocation);
  if (!nextKey) return false;

  selectedLocationSearches = [
    ...selectedLocationSearches.filter((location) => getLocationSearchKey(location) !== nextKey),
    nextLocation
  ];
  return true;
}

function syncLocationSearchViewport() {
  if (radiusFilterEnabled || !hasImplicitAreaSearch()) {
    clearImplicitViewportBounds();
    return;
  }

  syncImplicitViewportBounds({ framed: false });
}

function getSavedLocationSearches(filters) {
  const savedSearches = Array.isArray(filters?.locationSearches)
    ? filters.locationSearches
    : filters?.locationSearch
      ? [filters.locationSearch]
      : [];
  const seen = new Set();

  return savedSearches
    .map(normalizeSavedLocationSearch)
    .filter((location) => {
      if (!location) return false;
      const key = getLocationSearchKey(location);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function hydrateLocationSearches(filters) {
  const searches = getSavedLocationSearches(filters);
  const savedLocations = getSavedLocationFilters(filters);
  const seen = new Set(searches.map((location) => getLocationSearchKey(location)));

  const mergeStates = (stateCodes, excluded) => {
    stateCodes.forEach((stateCode) => {
      const location = createStateLocationSearch(stateCode, { excluded });
      if (!location) return;

      const key = getLocationSearchKey(location);
      if (seen.has(key)) return;

      searches.push(location);
      seen.add(key);
    });
  };

  mergeStates(savedLocations.included, false);
  mergeStates(savedLocations.excluded, true);
  return searches;
}

function getLocationFilterLabels() {
  return getIncludedLocationSearches().map((location) => location.label);
}

function hasIncludedLocationSelection() {
  return getIncludedLocationSearches().length > 0;
}

function hasAppliedLocationFilters() {
  return selectedLocationSearches.length > 0;
}

function hasAppliedCategoryOrFranchiseFilters() {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");

  return getFilterSelectIncludedValues(categoryFilterSelect).length > 0
    || getFilterSelectExcludedValues(categoryFilterSelect).length > 0
    || getFilterSelectIncludedValues(franchiseFilterSelect).length > 0
    || getFilterSelectExcludedValues(franchiseFilterSelect).length > 0;
}

function hasPrimaryTerritoryFilters() {
  return hasAppliedLocationFilters() || hasAppliedCategoryOrFranchiseFilters();
}

function syncFilterLocationSearchUI() {
  const chipsContainer = document.getElementById("locationFilterSearchChips");
  const field = document.getElementById("locationFilterSearchField");
  const input = document.getElementById("locationFilterSearchInput");
  const chipEntries = [];

  selectedLocationSearches.forEach((location) => {
    const locationKey = getLocationSearchKey(location);
    const excluded = Boolean(location.excluded);
    chipEntries.push({
      key: locationKey,
      label: location.label,
      excluded,
      onRecenter: excluded ? null : () => recenterTerritoryMapToLocation(location),
      onToggleExclude: () => toggleLocationSearchExcluded(locationKey),
      onRemove: () => {
        selectedLocationSearches = selectedLocationSearches.filter(
          (candidate) => getLocationSearchKey(candidate) !== locationKey
        );
        syncLocationFilterAfterRemoval();
      }
    });
  });

  if (chipsContainer) {
    chipsContainer.replaceChildren();

    chipEntries.forEach(({ key, label, excluded, onRemove, onToggleExclude, onRecenter }) => {
      chipsContainer.append(renderFilterChip({
        label,
        excluded,
        allowToggle: Boolean(onToggleExclude),
        chipClickable: false,
        onToggleExclude,
        onRemove,
        onRecenter,
        datasetKey: key
      }));
    });
  }

  const hasSelection = chipEntries.length > 0;
  field?.classList.toggle("has-selection", hasSelection);
  filterLocationSearchControl?.setHasSelection?.(hasSelection);

  if (input) {
    input.placeholder = hasSelection ? "" : "Select location";
  }

  filterLocationSearchControl?.setValue("");

  syncRadiusFilterControls();
}

function syncRadiusFilterVisibility() {
  const section = document.getElementById("radiusFilterSection");
  if (!section) return;

  const shouldShow = hasIncludedLocationSelection();
  section.classList.toggle("is-visible", shouldShow);
  section.setAttribute("aria-hidden", String(!shouldShow));

  if (!shouldShow) {
    radiusFilterEnabled = false;
  }
}

function ensureTerritoryMapStartedFromLocationFilter() {
  if (!window.__territoryMapStarted) {
    window.startTerritoryMapFromFilters?.();
  } else {
    const wasCrossroadOpen = isTerritoryCrossroadOpen();
    window.dismissTerritoryCrossroad?.();
    if (wasCrossroadOpen) {
      syncFilterSectionExpansion();
    }
  }
}

function shouldAutoEnableRadiusForLocation(result) {
  return Object.prototype.hasOwnProperty.call(LOCATION_AUTO_RADIUS_MILES, result?.geoLevel || "");
}

function applyAutoRadiusForLocationResult(result) {
  const miles = LOCATION_AUTO_RADIUS_MILES[result?.geoLevel];
  if (!miles) return false;

  radiusFilterEnabled = true;
  selectedRadiusMiles = clampRadiusValue(miles);
  syncRadiusFilterControls();
  return true;
}

function applyLocationSearchSelection(result, { autoRadius = false, replace = true, excluded = false } = {}) {
  const nextLocation = toLocationSearch(result, { excluded });
  if (!nextLocation) return false;

  if (replace) {
    selectedLocationSearches = [nextLocation];
  } else if (!upsertLocationSearch(nextLocation)) {
    return false;
  }

  if (autoRadius && !excluded) {
    applyAutoRadiusForLocationResult(result);
  } else if (replace) {
    radiusFilterEnabled = false;
  }

  if (!excluded) {
    if (nextLocation.coordinates) {
      window.territoryMapControls?.armLocationReveal?.(
        nextLocation.coordinates.longitude,
        nextLocation.coordinates.latitude
      );
    } else if (nextLocation.stateCode) {
      window.territoryMapControls?.armStateReveal?.(nextLocation.stateCode);
    }
  }

  syncLocationSearchViewport();
  syncFilterLocationSearchUI();
  return true;
}

function applyLocationInclude(result) {
  if (!result?.stateCode) return;

  ensureTerritoryMapStartedFromLocationFilter();
  applyLocationSearchSelection(result, {
    autoRadius: false,
    replace: false,
    excluded: false
  });
  const hasMultipleSearchAreas = getIncludedLocationSearches().length > 1
    || (radiusFilterEnabled && getTerritoryRadiusCentersForFilter().length > 1);
  if (!hasMultipleSearchAreas) {
    focusTerritoryLocationSearchResult(result);
    window.territoryMapControls?.skipNextFilterFit?.();
  }
  refreshTerritoryFilters();
}

function applyLocationExclude(result) {
  if (!result?.stateCode) return;

  ensureTerritoryMapStartedFromLocationFilter();
  applyLocationSearchSelection(result, {
    autoRadius: false,
    replace: false,
    excluded: true
  });
  refreshTerritoryFilters();
}

function toggleLocationSearchExcluded(locationKey) {
  const location = selectedLocationSearches.find(
    (candidate) => getLocationSearchKey(candidate) === locationKey
  );
  if (!location) return;

  applyLocationSearchSelection(location, {
    autoRadius: false,
    replace: false,
    excluded: !location.excluded
  });
  refreshTerritoryFilters();
}

function clearLocationFilterState() {
  selectedLocationSearches = [];
  clearImplicitViewportBounds();
  syncFilterLocationSearchUI();
}

function returnToTerritorySplash() {
  window.territoryMapFilters?.hideTerritoryRecords?.();
  window.territoryMapSelection?.clear?.();
  window.territoryBrandPanel?.close?.();

  if (window.__territoryMapStarted) {
    window.showTerritoryCrossroadAfterClearAll?.();
  } else {
    window.showTerritoryCrossroad?.({ animate: true });
  }

  syncFilterSectionExpansion();
  updateClearFiltersButton();
  updateFilterSectionClearButtons();
  persistTerritorySettings();
}

function returnToSplashAfterLocationCleared() {
  if (isTerritoryCrossroadOpen()) {
    syncTerritoryRadiusMap();
    refreshTerritoryFilters();
    return;
  }

  resetRadiusFilter();
  syncTerritoryRadiusMap();
  returnToTerritorySplash();
}

function syncAfterPrimaryFilterChange({ syncExpansion = false, keepLocationFilterActive = false } = {}) {
  if (hasPrimaryTerritoryFilters()) {
    if (syncExpansion) {
      syncFilterSectionExpansion();
    }
    refreshTerritoryFilters();
    return;
  }

  if (keepLocationFilterActive) {
    if (syncExpansion) {
      syncFilterSectionExpansion();
    }
    ensureLocationFilterSectionExpanded();
    syncTerritoryRadiusMap();
    refreshTerritoryFilters();
    updateClearFiltersButton();
    updateFilterSectionClearButtons();
    persistTerritorySettings();
    document.getElementById("locationFilterSearchInput")?.focus({ preventScroll: true });
    return;
  }

  returnToSplashAfterLocationCleared();
}

function syncLocationFilterAfterRemoval() {
  syncFilterLocationSearchUI();
  syncAfterPrimaryFilterChange({ syncExpansion: true, keepLocationFilterActive: true });
}

function setSelectedLocationSearch(result, { refresh = true } = {}) {
  selectedLocationSearches = result?.stateCode
    ? [toLocationSearch(result, { excluded: false })].filter(Boolean)
    : [];
  syncLocationSearchViewport();
  syncFilterLocationSearchUI();

  if (refresh) {
    refreshTerritoryFilters();
  }
}

function setLocationStateFilters(includedStates = [], excludedStates = [], { refresh = true } = {}) {
  selectedLocationSearches = [
    ...getSavedStringArray(includedStates).map((stateCode) => (
      createStateLocationSearch(stateCode, { excluded: false })
    )),
    ...getSavedStringArray(excludedStates).map((stateCode) => (
      createStateLocationSearch(stateCode, { excluded: true })
    ))
  ].filter(Boolean);
  clearImplicitViewportBounds();
  const includedStateCodes = getLocationIncludedStates();
  if (includedStateCodes.length) {
    window.territoryMapControls?.armStatesReveal?.(includedStateCodes);
  }
  syncFilterLocationSearchUI();

  if (refresh) {
    refreshTerritoryFilters();
  }
}

function focusTerritoryLocationSearchResult(result) {
  if (!result) return;

  // Multiple location pins / radius circles are framed together by the filter
  // camera. Only fly to a single search area when this is the sole center.
  const hasMultipleSearchAreas = getIncludedLocationSearches().length > 1
    || (radiusFilterEnabled && getTerritoryRadiusCentersForFilter().length > 1);
  if (hasMultipleSearchAreas) {
    return;
  }

  recenterTerritoryMapToLocation(result);
}

function recenterTerritoryMapToLocation(location) {
  if (!location) return;

  ensureTerritoryMapStartedFromLocationFilter();

  if (location.coordinates) {
    const radiusMiles = radiusFilterEnabled
      ? selectedRadiusMiles
      : LOCATION_VIEWPORT_RADIUS_MILES;
    window.territoryMapControls?.focusTerritoryCoordinates?.(
      location.coordinates.longitude,
      location.coordinates.latitude,
      radiusMiles,
      { skipReveal: true }
    );
    return;
  }

  if (location.stateCode) {
    window.territoryMapControls?.focusTerritoryState?.(location.stateCode, { skipReveal: true });
  }
}

function getCoordinateLocationCenters() {
  return getIncludedLocationSearches()
    .filter((location) => location.coordinates)
    .map((location) => ({
      state: location.stateCode,
      center: [
        location.coordinates.longitude,
        location.coordinates.latitude
      ]
    }));
}

function hasImplicitAreaSearch() {
  return !radiusFilterEnabled && getCoordinateLocationCenters().length > 0;
}

function normalizeViewportBounds(bounds) {
  const west = Number(bounds?.west);
  const east = Number(bounds?.east);
  const south = Number(bounds?.south);
  const north = Number(bounds?.north);
  if (![west, east, south, north].every(Number.isFinite)) return null;
  if (!(east > west) || !(north > south)) return null;
  return { west, east, south, north };
}

function viewportBoundsEqual(left, right) {
  if (!left || !right) return false;
  const epsilon = 1e-6;
  return Math.abs(left.west - right.west) < epsilon
    && Math.abs(left.east - right.east) < epsilon
    && Math.abs(left.south - right.south) < epsilon
    && Math.abs(left.north - right.north) < epsilon;
}

function mergeViewportBounds(target, bounds) {
  const nextBounds = normalizeViewportBounds(bounds);
  if (!nextBounds) return target;
  if (!target) return nextBounds;

  return {
    west: Math.min(target.west, nextBounds.west),
    east: Math.max(target.east, nextBounds.east),
    south: Math.min(target.south, nextBounds.south),
    north: Math.max(target.north, nextBounds.north)
  };
}

function deriveViewportBoundsFromLocation(location) {
  const longitude = Number(location?.coordinates?.longitude);
  const latitude = Number(location?.coordinates?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  return normalizeViewportBounds(
    window.territoryMapControls?.getSearchViewportBounds?.(
      longitude,
      latitude,
      LOCATION_VIEWPORT_RADIUS_MILES
    )
  );
}

function deriveViewportBoundsFromLocationSearches() {
  return getIncludedLocationSearches().reduce(
    (bounds, location) => mergeViewportBounds(bounds, deriveViewportBoundsFromLocation(location)),
    null
  );
}

function clearImplicitViewportBounds() {
  implicitViewportBounds = null;
  window.territoryMapControls?.markViewportUnframed?.();
}

function setImplicitViewportBounds(bounds, { framed = false } = {}) {
  implicitViewportBounds = normalizeViewportBounds(bounds);
  if (framed) {
    window.territoryMapControls?.markViewportFramed?.();
  } else {
    window.territoryMapControls?.markViewportUnframed?.();
  }
  return implicitViewportBounds;
}

function syncImplicitViewportBounds({ preferMap = false, framed = false } = {}) {
  if (!hasImplicitAreaSearch()) {
    clearImplicitViewportBounds();
    return null;
  }

  const mapBounds = preferMap
    ? window.territoryMapControls?.getViewportBounds?.()
    : null;
  const nextBounds = normalizeViewportBounds(mapBounds)
    || deriveViewportBoundsFromLocationSearches()
    || implicitViewportBounds
    || window.territoryMapControls?.getViewportBounds?.();

  return setImplicitViewportBounds(nextBounds, { framed });
}

function getImplicitViewportBounds() {
  if (!hasImplicitAreaSearch()) return null;
  return implicitViewportBounds
    || window.territoryMapControls?.getViewportBounds?.()
    || deriveViewportBoundsFromLocationSearches();
}

function captureViewportFromMap() {
  if (!hasImplicitAreaSearch()) return false;

  const bounds = normalizeViewportBounds(window.territoryMapControls?.getViewportBounds?.());
  if (!bounds || viewportBoundsEqual(implicitViewportBounds, bounds)) return false;

  implicitViewportBounds = bounds;
  window.territoryMapControls?.markViewportFramed?.();
  window.territoryMapControls?.skipNextFilterFit?.();
  refreshTerritoryFilters();
  return true;
}

function getTerritoryRadiusCentersForFilter(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const includedSearches = getIncludedLocationSearches();
  const searchCenters = includedSearches
    .filter((location) => location.coordinates)
    .map((location) => ({
      state: location.stateCode,
      center: [
        location.coordinates.longitude,
        location.coordinates.latitude
      ]
    }));
  const stateCodes = [...new Set(
    includedSearches
      .filter((location) => !location.coordinates)
      .map((location) => location.stateCode)
  )];

  return [...searchCenters, ...getTerritoryRadiusCenters(stateCodes, registry)];
}

function getSavedLocationFilters(filters) {
  const locations = filters?.locations;

  if (Array.isArray(locations)) {
    return {
      included: getSavedStringArray(locations),
      excluded: []
    };
  }

  return {
    included: getSavedStringArray(locations?.included),
    excluded: getSavedStringArray(locations?.excluded)
  };
}

function getValidSavedSelectValues(select, values) {
  if (!select) return [];
  const validValues = new Set(
    Array.from(select.options)
      .map((option) => option.value)
      .filter(Boolean)
  );

  return getSavedStringArray(values).filter((value) => validValues.has(value));
}

function setTerritoryFilterRangeValues(section, min, max) {
  setSectionRangeValues(section, min, max);
}

function restoreFilterSectionState(sectionSettings = {}) {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return;

  Array.from(filterPanel.querySelectorAll(".filter-section")).forEach((section, index) => {
    const savedCollapsed = sectionSettings[getFilterSectionStorageKey(section, index)];
    if (typeof savedCollapsed !== "boolean") return;
    section.classList.toggle("filter-section-collapsed", savedCollapsed);
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(!savedCollapsed));
    section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", String(!savedCollapsed));
  });
}

function setFilterPanelOpen(isOpen) {
  const shell = document.querySelector(".territory-shell");
  const filterPanel = document.querySelector(".territory-filter-panel");
  const filterToggle = document.getElementById("territoryFilterToggle");
  if (!shell || !filterToggle) return;

  shell.classList.toggle("is-filter-open", Boolean(isOpen));
  filterToggle.classList.toggle("is-active", Boolean(isOpen));
  filterToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  filterPanel?.setAttribute("aria-hidden", String(!isOpen));
}

function setMapPanelOpenState(isOpen) {
  const shell = document.querySelector(".territory-shell");
  const mapPanel = document.getElementById("territoryMapPanel");
  const mapToggle = document.getElementById("territoryMapToggle");
  if (!shell || !mapPanel || !mapToggle) return;

  const nextOpen = Boolean(isOpen) && !isTerritoryCrossroadOpen();
  shell.classList.toggle("is-map-panel-open", nextOpen);
  mapPanel.setAttribute("aria-hidden", String(!nextOpen));
  mapToggle.classList.toggle("is-active", nextOpen);
  mapToggle.setAttribute("aria-expanded", String(nextOpen));
  mapToggle.disabled = isTerritoryCrossroadOpen();
}

function restoreSavedFilterSelections(settings) {
  const filters = settings?.filters || {};
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const savedStatuses = Array.isArray(filters.statuses)
    ? getSavedStringArray(filters.statuses)
    : DEFAULT_TERRITORY_STATUSES;

  selectedLocationSearches = hydrateLocationSearches(filters);
  syncFilterLocationSearchUI();
  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included),
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included),
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded)
  );

  setTerritoryStatusFilters(savedStatuses);
  setTerritoryGeoLevelFilters(filters.geoLevels ?? filters.geoLevel);
  radiusFilterEnabled = Boolean(filters.radius?.enabled);
  selectedRadiusMiles = clampRadiusValue(filters.radius?.miles);
  syncRadiusFilterControls();

  if (investmentSection) {
    const investmentTrack = investmentSection.querySelector(".filter-range-slider");
    const investmentMinRange = investmentTrack?.querySelector(".range-input-min");
    const investmentMaxRange = investmentTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      investmentSection,
      filters.investment?.min ?? Number(investmentMinRange?.min ?? 0),
      filters.investment?.max ?? Number(investmentMaxRange?.max ?? 0)
    );
  }

  setFranchiseeRatingMin(filters.rating?.min);

  if (searchInput && typeof filters.search === "string") {
    searchInput.value = filters.search;
    const searchField = searchInput.closest(".toolbar-search-btn");
    const searchClear = document.getElementById("territorySearchClear");
    const hasQuery = filters.search.length > 0;
    searchField?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  }

  restoreFilterSectionState(filters.sections);
  syncFilterComboboxes();

  if (radiusFilterEnabled) {
    clearImplicitViewportBounds();
  } else {
    syncImplicitViewportBounds({ framed: false });
  }
}

function restoreSelectFiltersFromSaved(settings) {
  if (!settings) return;

  const filters = settings.filters || {};
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");

  selectedLocationSearches = hydrateLocationSearches(filters);
  syncFilterLocationSearchUI();

  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included),
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included),
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded)
  );

  syncFilterComboboxes();
}

function applySavedMapSettings(settings = savedTerritorySettings) {
  const mapSettings = settings?.settings;
  if (!mapSettings) return;

  const usesCurrentVisualizationDefaults = settings?.version >= TERRITORY_SETTINGS_VERSION;
  window.territoryMapControls?.setTerritoryBrandLogosVisible?.(
    usesCurrentVisualizationDefaults ? Boolean(mapSettings.brandLogos) : false
  );
  window.territoryMapControls?.setTerritoryBordersVisible?.(mapSettings.borders !== false);
  window.territoryMapControls?.setTerritoryDensityEnabled?.(
    usesCurrentVisualizationDefaults ? mapSettings.density !== false : true,
    { reapplyFilters: false }
  );
}

function restoreSavedTerritorySettings() {
  isRestoringTerritorySettings = true;

  try {
    if (!savedTerritorySettings) return;

    if (typeof savedTerritorySettings.filters?.open === "boolean") {
      const shouldOpen = savedTerritorySettings.filters.open && !isTerritoryCrossroadOpen();
      setFilterPanelOpen(shouldOpen);
    } else if (isTerritoryCrossroadOpen()) {
      setFilterPanelOpen(false);
    }

    if (typeof savedTerritorySettings.settings?.mapPanelOpen === "boolean") {
      setMapPanelOpenState(savedTerritorySettings.settings.mapPanelOpen);
    } else if (!isTerritoryCrossroadOpen()) {
      setMapPanelOpenState(true);
    }

    restoreFilterSectionState(savedTerritorySettings.filters?.sections);
  } finally {
    isRestoringTerritorySettings = false;
  }
}

function setFilterCheckboxState(checkbox, isChecked) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", isChecked);
}

function setFranchiseeRatingMin(value) {
  const nextValue = String(normalizeFranchiseeRatingMin(value));
  getFranchiseeRatingRadios().forEach((radio) => {
    radio.checked = radio.value === nextValue;
    setFilterCheckboxState(radio, radio.checked);
  });
}

function clampRadiusValue(value) {
  return window.WefranchRadiusControl?.clampRadiusValue(value, RADIUS_FILTER_DEFAULTS)
    ?? RADIUS_FILTER_DEFAULTS.value;
}

function syncRadiusFilterControls(options = {}) {
  syncRadiusFilterVisibility();

  const radiusToggle = document.getElementById("radiusToggle");
  const radiusControl = document.getElementById("radiusControl");
  const radiusRange = document.getElementById("radiusRange");
  const radiusRangeFill = document.getElementById("radiusRangeFill");
  const radiusValueLabel = document.getElementById("radiusValueLabel");
  const radiusValueDisplay = document.getElementById("radiusValueDisplay");
  const radiusValueInput = document.getElementById("radiusValueInput");

  if (radiusToggle) {
    radiusToggle.checked = radiusFilterEnabled;
    setFilterCheckboxState(radiusToggle, radiusFilterEnabled);
  }

  if (radiusControl) {
    radiusControl.hidden = !radiusFilterEnabled;
  }

  window.WefranchRadiusControl?.syncRadiusControlElements({
    defaults: RADIUS_FILTER_DEFAULTS,
    selectedMiles: selectedRadiusMiles,
    radiusRange,
    radiusRangeFill,
    radiusValueLabel,
    radiusValueDisplay,
    radiusValueInput,
    sliderValue: options.sliderValue,
    previewMiles: options.previewMiles,
    isEditing: options.isEditing
  });
}

function initRadiusFilterControls() {
  const radiusRange = document.getElementById("radiusRange");
  const radiusValueLabel = document.getElementById("radiusValueLabel");
  const radiusValueDisplay = document.getElementById("radiusValueDisplay");
  const radiusValueInput = document.getElementById("radiusValueInput");
  const radiusValueEdit = document.getElementById("radiusValueEdit");

  window.WefranchRadiusControl?.initRadiusRangeSlider({
    defaults: RADIUS_FILTER_DEFAULTS,
    radiusRange,
    getSelectedMiles: () => selectedRadiusMiles,
    setSelectedMiles: (nextValue) => {
      selectedRadiusMiles = nextValue;
    },
    syncControls: syncRadiusFilterControls,
    onValueCommit: (_nextValue, { didChange } = {}) => {
      if (didChange && radiusFilterEnabled) {
        refreshTerritoryFilters();
      }
    }
  });

  window.WefranchRadiusControl?.initRadiusValueEditor({
    defaults: RADIUS_FILTER_DEFAULTS,
    radiusValueLabel,
    radiusValueDisplay,
    radiusValueInput,
    radiusValueEdit,
    getSelectedMiles: () => selectedRadiusMiles,
    setSelectedMiles: (nextValue) => {
      selectedRadiusMiles = nextValue;
    },
    syncControls: syncRadiusFilterControls,
    onValueCommit: (_nextValue, { didChange } = {}) => {
      if (didChange && radiusFilterEnabled) {
        refreshTerritoryFilters();
      }
    }
  });
}

function resetRadiusFilter() {
  radiusFilterEnabled = false;
  selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
  clearImplicitViewportBounds();
  syncRadiusFilterControls();
}

function getTerritoryRadiusCenters(
  stateCodes,
  registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []
) {
  const requestedStates = new Set(stateCodes);
  const centersByState = new Map();

  registry.forEach((record) => {
    if (
      !requestedStates.has(record.state)
      || centersByState.has(record.state)
      || !Array.isArray(record.center)
      || record.center.length < 2
    ) {
      return;
    }

    centersByState.set(record.state, record.center);
  });

  return Array.from(centersByState, ([state, center]) => ({ state, center }));
}

function getCoordinateDistanceMiles([fromLongitude, fromLatitude], [toLongitude, toLatitude]) {
  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const fromLatitudeRadians = (fromLatitude * Math.PI) / 180;
  const toLatitudeRadians = (toLatitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitudeRadians)
      * Math.cos(toLatitudeRadians)
      * Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = Math.min(1, Math.max(0, haversine));

  return 3958.8 * 2 * Math.atan2(
    Math.sqrt(normalizedHaversine),
    Math.sqrt(1 - normalizedHaversine)
  );
}

function syncTerritoryRadiusMap() {
  const explicitCenters = getTerritoryRadiusCentersForFilter();

  if (radiusFilterEnabled && explicitCenters.length > 0) {
    window.territoryMapControls?.setTerritoryRadiusFilter?.({
      enabled: true,
      overlay: true,
      miles: selectedRadiusMiles,
      centers: explicitCenters
    });
    return;
  }

  window.territoryMapControls?.setTerritoryRadiusFilter?.({
    enabled: false,
    overlay: false,
    miles: selectedRadiusMiles,
    centers: []
  });
}

function getInvestmentFilterSection() {
  return document.querySelector(".filter-section--investment");
}

function normalizeInvestmentValue(value) {
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

function renderInvestmentHistogram(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const section = getInvestmentFilterSection();
  if (!section) return;

  renderSharedFilterHistogram({
    section,
    values: registry.map((record) => normalizeInvestmentValue(record.initialInvestment)),
    binCount: INVESTMENT_HISTOGRAM_BINS
  });
}

function bindRangeTrack(track) {
  bindSharedRangeTrack(track, {
    onChange: () => refreshTerritoryFilters()
  });
}

function clearFilterSection(section) {
  if (!section || !filterSectionHasAppliedFilters(section)) return;

  const locationFilterSearch = section.querySelector("#locationFilterSearchField");
  const categoryFilterSelect = section.querySelector("#categoryFilterSelect");
  const franchiseFilterSelect = section.querySelector("#franchiseFilterSelect");
  const statusCheckboxes = Array.from(section.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);

  if (locationFilterSearch) {
    clearLocationFilterState();
    syncAfterPrimaryFilterChange({ syncExpansion: true, keepLocationFilterActive: true });
    return;
  } else if (categoryFilterSelect) {
    setFilterSelectIncludedExcludedValues(categoryFilterSelect, [], []);
  } else if (franchiseFilterSelect) {
    setFilterSelectIncludedExcludedValues(franchiseFilterSelect, [], []);
  } else if (statusCheckboxes.length) {
    statusCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
      setFilterCheckboxState(checkbox, false);
    });
  } else if (section.querySelector(".territory-geo-level-checkbox")) {
    setTerritoryGeoLevelFilters([]);
  } else if (section.querySelector("[aria-label='Initial investment range']")) {
    const track = section.querySelector(".filter-range-slider");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      section,
      Number(minRange?.min ?? 0),
      Number(maxRange?.max ?? 0)
    );
  } else if (section.querySelector(".territory-rating-radio")) {
    setFranchiseeRatingMin(0);
  } else {
    return;
  }

  syncFilterComboboxes();
  syncAfterPrimaryFilterChange({ syncExpansion: true });
}

function updateFilterSectionClearButtons() {
  window.WefranchFilterSections.updateClearButtons(
    document.querySelector(".territory-filter-panel"),
    filterSectionHasAppliedFilters
  );
}

function initTerritoryFilters() {
  const shell = document.querySelector(".territory-shell");
  const filterPanel = document.querySelector(".territory-filter-panel");
  const filterToggle = document.getElementById("territoryFilterToggle");

  window.WefranchFilterSections.enhanceHeaders(filterPanel, {
    iconSrc: "../shared/filter/assets/remove.svg",
    onClear: clearFilterSection
  });
  restoreSavedTerritorySettings();
  window.WefranchFilterSections.bindCollapseToggle(filterPanel, {
    onToggle: () => persistTerritorySettings()
  });

  document.querySelectorAll(".filter-field-select").forEach((select) => {
    const allowExclude = select.id === "categoryFilterSelect"
      || select.id === "franchiseFilterSelect";
    enhanceFilterCombobox(select, { allowExclude });
  });

  document.querySelectorAll(".territory-filter-checkbox").forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });
  getFranchiseeRatingRadios().forEach((radio) => {
    setFilterCheckboxState(radio, radio.checked);
  });

  document.querySelectorAll(".filter-range-slider").forEach(bindRangeTrack);

  filterToggle?.addEventListener("click", () => {
    const isOpen = !shell?.classList.contains("is-filter-open");
    setFilterPanelOpen(isOpen);

    if (!isOpen) {
      document.querySelectorAll(".filter-field-select").forEach((select) => {
        window.WefranchFilterCombobox.getCombobox(select)?.close();
      });
    }

    persistTerritorySettings();

    window.setTimeout(() => {
      window.territoryMap?.resize?.();
    }, 280);
  });

  window.WefranchFilterCombobox.bindOutsideClick();

  const clearAllFilters = document.getElementById("clearAllFilters");
  clearAllFilters?.addEventListener("click", clearAllFilterSelections);

  const searchWithinLocation = document.getElementById("searchWithinLocation");
  searchWithinLocation?.addEventListener("click", () => {
    if (!window.__territoryMapStarted) {
      window.startTerritoryMapFromFilters?.();
    } else {
      const wasCrossroadOpen = isTerritoryCrossroadOpen();
      window.dismissTerritoryCrossroad?.();
      if (wasCrossroadOpen) {
        syncFilterSectionExpansion();
      }
    }
    window.territoryMapControls?.triggerTerritoryGeolocation?.();
  });

  filterLocationSearchControl = window.territoryLocationSearch?.bind({
    variant: "filter",
    field: document.getElementById("locationFilterSearchField"),
    menu: document.getElementById("locationFilterSearchMenu"),
    input: document.getElementById("locationFilterSearchInput"),
    suggestions: document.getElementById("locationFilterSearchSuggestions"),
    clearButton: document.getElementById("locationFilterSearchClear"),
    feedback: document.getElementById("locationFilterSearchFeedback"),
    suggestionPrefix: "locationFilterSearchSuggestion",
    onInclude: applyLocationInclude,
    onExclude: applyLocationExclude,
    isSelected: (item) => selectedLocationSearches.some(
      (location) => getLocationSearchKey(location) === getLocationSearchKey(item)
    ),
    onClear: () => {
      clearLocationFilterState();
      syncAfterPrimaryFilterChange({ syncExpansion: true, keepLocationFilterActive: true });
    }
  });

  const radiusToggle = document.getElementById("radiusToggle");

  radiusToggle?.addEventListener("change", () => {
    radiusFilterEnabled = radiusToggle.checked;
    syncRadiusFilterControls();
    if (radiusFilterEnabled) {
      clearImplicitViewportBounds();
    } else {
      syncImplicitViewportBounds({ preferMap: true, framed: true });
      window.territoryMapControls?.skipNextFilterFit?.();
    }
    refreshTerritoryFilters();
  });

  initRadiusFilterControls();

  initTerritorySearch();
  initTerritoryToolbarMenu();

  if (savedTerritorySettings) {
    isRestoringTerritorySettings = true;
    try {
      restoreSavedFilterSelections(savedTerritorySettings);
    } finally {
      isRestoringTerritorySettings = false;
    }
  } else {
    setTerritoryStatusFilters(DEFAULT_TERRITORY_STATUSES);
  }

  syncRadiusFilterControls();
  bindTerritoryFilterControls();
  syncFilterSectionExpansion();
  updateClearFiltersButton();
}

function initTerritoryToolbarMenu() {
  const toolbarDropdown = document.getElementById("territoryMenuDropdown");
  const territoryBrandLogosToggle = document.getElementById("territoryBrandLogosToggleOption");
  const territoryBordersToggle = document.getElementById("territoryBordersToggleOption");
  const territoryDensityToggle = document.getElementById("territoryDensityToggleOption");
  const toolbarDropdowns = toolbarDropdown ? [toolbarDropdown] : [];
  const savedSettings = savedTerritorySettings?.settings;
  const usesCurrentVisualizationDefaults = savedTerritorySettings?.version >= TERRITORY_SETTINGS_VERSION;
  let territoryBrandLogosEnabled = usesCurrentVisualizationDefaults
    ? Boolean(savedSettings?.brandLogos)
    : window.territoryMapControls?.getTerritoryBrandLogosVisible?.() ?? false;
  let territoryBordersEnabled = savedSettings?.borders ?? window.territoryMapControls?.getTerritoryBordersVisible?.() ?? true;
  let territoryDensityEnabled = usesCurrentVisualizationDefaults
    ? savedSettings?.density !== false
    : window.territoryMapControls?.getTerritoryDensityEnabled?.() ?? true;

  const closeToolbarDropdowns = (exceptDropdown = null) => {
    toolbarDropdowns.forEach((dropdown) => {
      if (dropdown === exceptDropdown) return;
      dropdown.removeAttribute("open");
    });
  };

  const syncTerritoryBrandLogosToggle = () => {
    territoryBrandLogosToggle?.setAttribute("aria-checked", String(territoryBrandLogosEnabled));
  };

  const syncTerritoryBordersToggle = () => {
    territoryBordersToggle?.setAttribute("aria-checked", String(territoryBordersEnabled));
  };

  const syncTerritoryDensityToggle = () => {
    territoryDensityToggle?.setAttribute("aria-checked", String(territoryDensityEnabled));
  };

  toolbarDropdown?.addEventListener("toggle", () => {
    if (toolbarDropdown.open) {
      document.getElementById("territoryBrandSort")?.removeAttribute("open");
    }
  });

  territoryBrandLogosToggle?.addEventListener("click", () => {
    territoryBrandLogosEnabled = !territoryBrandLogosEnabled;
    syncTerritoryBrandLogosToggle();
    window.territoryMapControls?.setTerritoryBrandLogosVisible?.(territoryBrandLogosEnabled);
    persistTerritorySettings();
  });

  territoryBordersToggle?.addEventListener("click", () => {
    territoryBordersEnabled = !territoryBordersEnabled;
    syncTerritoryBordersToggle();
    window.territoryMapControls?.setTerritoryBordersVisible?.(territoryBordersEnabled);
    persistTerritorySettings();
  });

  territoryDensityToggle?.addEventListener("click", () => {
    territoryDensityEnabled = !territoryDensityEnabled;
    syncTerritoryDensityToggle();
    window.territoryMapControls?.setTerritoryDensityEnabled?.(territoryDensityEnabled);
    persistTerritorySettings();
  });

  if (toolbarDropdowns.length) {
    document.addEventListener("click", (event) => {
      const openDropdown = toolbarDropdowns.find((dropdown) => dropdown.open);
      if (!openDropdown) return;

      if (openDropdown.contains(event.target)) {
        closeToolbarDropdowns(openDropdown);
        return;
      }

      closeToolbarDropdowns();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
        closeToolbarDropdowns();
      }
    });
  }

  syncTerritoryBrandLogosToggle();
  syncTerritoryBordersToggle();
  syncTerritoryDensityToggle();
}

function initTerritorySearch() {
  const searchInput = document.getElementById("territorySearchInput");
  const searchClear = document.getElementById("territorySearchClear");
  if (!searchInput) return;

  const searchField = searchInput.closest(".toolbar-search-btn");

  const syncSearchState = () => {
    const hasQuery = searchInput.value.trim().length > 0;
    searchField?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  };

  searchInput.addEventListener("input", () => {
    syncSearchState();
    refreshTerritoryFilters();
    persistTerritorySettings();
  });

  searchClear?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  searchClear?.addEventListener("click", () => {
    searchInput.value = "";
    syncSearchState();
    refreshTerritoryFilters();
    persistTerritorySettings();
    searchInput.focus();
  });

  if (typeof savedTerritorySettings?.filters?.search === "string") {
    searchInput.value = savedTerritorySettings.filters.search;
  }

  syncSearchState();
}

function getTerritoryFilterRangeValues(section) {
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);

  return {
    min: getFilterNumberInputValue(numberInputs[0]),
    max: getFilterNumberInputValue(numberInputs[1])
  };
}

function getTerritoryRangeFilterDefaults(section) {
  const track = section?.querySelector(".filter-range-slider");
  const minRange = track?.querySelector(".range-input-min");
  const maxRange = track?.querySelector(".range-input-max");

  return {
    min: Number(minRange?.min ?? 0),
    max: Number(maxRange?.max ?? 0)
  };
}

function territoryRangeFilterIsActive(section) {
  const defaults = getTerritoryRangeFilterDefaults(section);
  const values = getTerritoryFilterRangeValues(section);

  return values.min !== defaults.min || values.max !== defaults.max;
}

function hasNarrowingTerritoryFilters() {
  const searchInput = document.getElementById("territorySearchInput");
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");

  return hasAppliedLocationFilters()
    || hasAppliedCategoryOrFranchiseFilters()
    || getTerritoryGeoLevelFilters().length > 0
    || Boolean(searchInput?.value.trim())
    || territoryRangeFilterIsActive(investmentSection)
    || franchiseeRatingFilterIsActive();
}

function getAppliedTerritoryFilterCount() {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");

  const selectedLocationCount = selectedLocationSearches.length;
  const selectedFilterCount =
    selectedLocationCount +
    getFilterSelectIncludedValues(categoryFilterSelect).length +
    getFilterSelectExcludedValues(categoryFilterSelect).length +
    getFilterSelectIncludedValues(franchiseFilterSelect).length +
    getFilterSelectExcludedValues(franchiseFilterSelect).length;
  const selectedStatusCount = statusCheckboxes.filter((checkbox) => checkbox.checked).length;
  const selectedSearchCount = searchInput?.value.trim() ? 1 : 0;
  const selectedInvestmentCount = territoryRangeFilterIsActive(investmentSection) ? 1 : 0;
  const selectedRatingCount = franchiseeRatingFilterIsActive() ? 1 : 0;
  const selectedGeoLevelCount = getTerritoryGeoLevelFilters().length;

  return selectedFilterCount + selectedStatusCount + selectedSearchCount + selectedInvestmentCount + selectedRatingCount + selectedGeoLevelCount;
}

function updateClearFiltersButton() {
  const clearAllFilters = document.getElementById("clearAllFilters");
  if (!clearAllFilters) return;

  const appliedFilterCount = getAppliedTerritoryFilterCount();
  const hasAppliedFilters = appliedFilterCount > 0;

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

function resetFilterSelections({ refreshMap = true, statuses = DEFAULT_TERRITORY_STATUSES } = {}) {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const searchClear = document.getElementById("territorySearchClear");
  const searchField = searchInput?.closest(".toolbar-search-btn");

  clearLocationFilterState();
  resetRadiusFilter();
  syncTerritoryRadiusMap();
  setFilterSelectIncludedExcludedValues(categoryFilterSelect, [], []);
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, [], []);
  syncFilterComboboxes();

  setTerritoryStatusFilters(statuses);
  setTerritoryGeoLevelFilters([]);

  if (investmentSection) {
    const investmentTrack = investmentSection.querySelector(".filter-range-slider");
    const investmentMinRange = investmentTrack?.querySelector(".range-input-min");
    const investmentMaxRange = investmentTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      investmentSection,
      Number(investmentMinRange?.min ?? 0),
      Number(investmentMaxRange?.max ?? 0)
    );
  }

  setFranchiseeRatingMin(0);

  if (searchInput) {
    searchInput.value = "";
    searchField?.classList.remove("is-active-search");
    if (searchClear) searchClear.hidden = true;
  }

  syncFilterSectionExpansion();
  if (refreshMap) {
    refreshTerritoryFilters();
  }
}

function clearAllFilterSelections() {
  resetFilterSelections({ refreshMap: false, statuses: [] });
  returnToTerritorySplash();
}

function getTerritoryFilterState() {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);
  const ratingMin = getFranchiseeRatingMin();
  const radiusCenters = getTerritoryRadiusCentersForFilter();

  return {
    locationSearch: getIncludedLocationSearches()[0] || selectedLocationSearches[0] || null,
    locationSearches: selectedLocationSearches.map((location) => ({ ...location })),
    locations: {
      included: getLocationIncludedStates(),
      excluded: getLocationExcludedStates()
    },
    radius: {
      enabled: radiusFilterEnabled,
      miles: selectedRadiusMiles,
      centers: radiusCenters
    },
    categories: {
      included: getFilterSelectIncludedValues(categoryFilterSelect),
      excluded: getFilterSelectExcludedValues(categoryFilterSelect)
    },
    franchises: {
      included: getFilterSelectIncludedValues(franchiseFilterSelect),
      excluded: getFilterSelectExcludedValues(franchiseFilterSelect)
    },
    statuses: statusCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value),
    geoLevels: getTerritoryGeoLevelFilters(),
    investmentMin: Math.min(investmentRange.min, investmentRange.max),
    investmentMax: Math.max(investmentRange.min, investmentRange.max),
    ratingMin,
    ratingMax: 5,
    search: searchInput?.value.trim().toLocaleLowerCase() || ""
  };
}

function resolveLocationMatchTargets(locationSearches = []) {
  return locationSearches
    .map((location) => {
      if (window.territoryMapFilters?.resolveLocationTarget) {
        return window.territoryMapFilters.resolveLocationTarget(location);
      }

      return location?.stateCode
        ? { kind: "state", stateCode: location.stateCode }
        : null;
    })
    .filter(Boolean);
}

function recordMatchesLocationTarget(record, target, cache) {
  if (window.territoryMapFilters?.recordMatchesLocationTarget) {
    return window.territoryMapFilters.recordMatchesLocationTarget(record, target, cache);
  }

  return target?.kind === "state" && record.state === target.stateCode;
}

function territoryMatchesFilters(record, filters, context) {
  if (context.excludedTargets.some((target) => (
    recordMatchesLocationTarget(record, target, context.locationCache)
  ))) {
    return false;
  }

  if (context.viewportContext) {
    if (!window.territoryMapFilters?.recordIntersectsViewport?.(record, context.viewportContext)) {
      return false;
    }
  } else if (context.radiusContext) {
    if (!window.territoryMapFilters?.recordIntersectsRadius?.(record, context.radiusContext)) {
      return false;
    }
  } else if (context.radiusIsActive) {
    if (
      !Array.isArray(record.center)
      || !filters.radius.centers.some(
        ({ center }) => getCoordinateDistanceMiles(record.center, center) <= filters.radius.miles
      )
    ) {
      return false;
    }
  } else if (context.hasLocationConstraint) {
    const matchesLocation = context.locationTargets.some((target) => (
      recordMatchesLocationTarget(record, target, context.locationCache)
    ));

    if (!matchesLocation) {
      return false;
    }
  }

  if (context.includedCategories && !context.includedCategories.has(record.category)) {
    return false;
  }

  if (context.excludedCategories.has(record.category)) {
    return false;
  }

  if (context.includedFranchises && !context.includedFranchises.has(record.brandId)) {
    return false;
  }

  if (context.excludedFranchises.has(record.brandId)) {
    return false;
  }

  if (context.statuses && !context.statuses.has(record.status)) {
    return false;
  }

  if (context.geoLevels && !context.geoLevels.has(record.geoType)) {
    return false;
  }

  if (record.initialInvestment < filters.investmentMin || record.initialInvestment > filters.investmentMax) {
    return false;
  }

  if (filters.ratingMin > 0 && record.franchiseeRating < filters.ratingMin) {
    return false;
  }

  if (filters.search) {
    if (record.searchHaystack === undefined) {
      record.searchHaystack = `${record.brand} ${record.name} ${record.state}`.toLocaleLowerCase();
    }
    if (!record.searchHaystack.includes(filters.search)) {
      return false;
    }
  }

  return true;
}

function getActiveLocationRadius(filters) {
  if (filters.radius.enabled && filters.radius.centers.length > 0) {
    return {
      centers: filters.radius.centers,
      miles: filters.radius.miles
    };
  }

  return null;
}

function applySearchThisArea(result) {
  if (!applyLocationSearchSelection(result, { autoRadius: false, replace: true })) {
    return false;
  }

  syncImplicitViewportBounds({ preferMap: true, framed: true });
  refreshTerritoryFilters();
  return true;
}

function createTerritoryMatchContext(filters) {
  const activeRadius = getActiveLocationRadius(filters);
  const viewportBounds = activeRadius ? null : getImplicitViewportBounds();
  const includedSearches = (filters.locationSearches || []).filter((location) => !location.excluded);
  const excludedSearches = (filters.locationSearches || []).filter((location) => location.excluded);
  const locationTargets = resolveLocationMatchTargets(includedSearches);
  const excludedTargets = resolveLocationMatchTargets(excludedSearches);

  return {
    excludedTargets,
    locationTargets,
    locationCache: new Map(),
    hasLocationConstraint: locationTargets.length > 0,
    radiusIsActive: Boolean(activeRadius),
    includedCategories: filters.categories.included.length
      ? new Set(filters.categories.included)
      : null,
    excludedCategories: new Set(filters.categories.excluded),
    includedFranchises: filters.franchises.included.length
      ? new Set(filters.franchises.included)
      : null,
    excludedFranchises: new Set(filters.franchises.excluded),
    statuses: filters.statuses.length ? new Set(filters.statuses) : null,
    geoLevels: filters.geoLevels.length ? new Set(filters.geoLevels) : null,
    radiusContext: activeRadius
      ? window.territoryMapFilters?.createRadiusMatchContext?.(
          activeRadius.centers,
          activeRadius.miles
        )
      : null,
    viewportContext: viewportBounds
      ? window.territoryMapFilters?.createViewportMatchContext?.(viewportBounds)
      : null
  };
}

function getFilteredTerritoryRecords(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const filters = getTerritoryFilterState();
  const context = createTerritoryMatchContext(filters);

  return registry.filter((record) => territoryMatchesFilters(record, filters, context));
}

function yieldToTerritoryFilterFrame() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// Matching 15k records against viewport geometry can take far longer than one
// frame, so the scan runs in time-sliced chunks and bails out as soon as a newer
// filter run supersedes it.
async function collectFilteredTerritoryRecords(registry, isCancelled) {
  const filters = getTerritoryFilterState();
  const context = createTerritoryMatchContext(filters);
  const matchingRecords = [];
  const total = registry.length;
  let index = 0;
  let deadline = performance.now() + TERRITORY_FILTER_SLICE_BUDGET_MS;

  while (index < total) {
    const record = registry[index];
    index += 1;

    if (territoryMatchesFilters(record, filters, context)) {
      matchingRecords.push(record);
    }

    if ((index & TERRITORY_FILTER_SLICE_CHECK_MASK) === 0 && performance.now() >= deadline) {
      await yieldToTerritoryFilterFrame();
      if (isCancelled()) return null;
      deadline = performance.now() + TERRITORY_FILTER_SLICE_BUDGET_MS;
    }
  }

  return matchingRecords;
}

function maybeStartTerritoryMapFromFilters() {
  if (isRestoringTerritorySettings) return;
  if (getAppliedTerritoryFilterCount() <= 0) return;

  if (!window.__territoryMapStarted) {
    window.startTerritoryMapFromFilters?.();
    return;
  }

  const wasCrossroadOpen = isTerritoryCrossroadOpen();
  window.dismissTerritoryCrossroad?.();
  if (wasCrossroadOpen) {
    syncFilterSectionExpansion();
  }
}

function cancelPendingTerritoryFilterRun() {
  if (territoryFilterCoalesceTimer) {
    clearTimeout(territoryFilterCoalesceTimer);
    territoryFilterCoalesceTimer = 0;
  }
}

async function runTerritoryFilterPipeline(token) {
  const isCancelled = () => token !== territoryFilterRunToken;
  const registry = window.territoryMapFilters?.getTerritoryRegistry?.() || [];

  try {
    const matchingRecords = await collectFilteredTerritoryRecords(registry, isCancelled);
    if (matchingRecords === null || isCancelled()) return;

    await window.territoryMapFilters?.applyTerritoryFilters?.(matchingRecords, {
      isCancelled
    });
  } finally {
    if (!isCancelled()) {
      window.territoryMapControls?.endResultsLoading?.();
    }
  }
}

function scheduleTerritoryFilterRun({ immediate = false } = {}) {
  territoryFilterRunToken += 1;
  const token = territoryFilterRunToken;

  cancelPendingTerritoryFilterRun();
  window.territoryMapControls?.beginResultsLoading?.();

  if (immediate) {
    return runTerritoryFilterPipeline(token);
  }

  return new Promise((resolve) => {
    territoryFilterCoalesceTimer = setTimeout(() => {
      territoryFilterCoalesceTimer = 0;
      resolve(runTerritoryFilterPipeline(token));
    }, TERRITORY_FILTER_COALESCE_MS);
  });
}

function refreshTerritoryFilters({ immediate = false } = {}) {
  maybeStartTerritoryMapFromFilters();

  syncTerritoryRadiusMap();
  updateClearFiltersButton();
  updateFilterSectionClearButtons();
  persistTerritorySettings();

  return scheduleTerritoryFilterRun({ immediate });
}

function updateTerritoryFilterSummary(visibleCount, totalCount) {
  const filterSummary = document.getElementById("territoryFilterSummary");
  if (!filterSummary) return;

  const visibleRange = visibleCount > 0 ? `1-${visibleCount}` : "0";
  filterSummary.innerHTML = `Showing ${visibleRange} of ${totalCount} records <span class="filter-summary-sort">sorted by relevancy</span>`;
}

function clearTerritoryDatasetFilterOptions() {
  ["categoryFilterSelect", "franchiseFilterSelect"].forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    Array.from(select.options).forEach((option) => {
      if (option.value) {
        option.remove();
      } else {
        option.selected = true;
      }
    });
  });
}

function syncCategoryFilterLabels(categoryFilterSelect) {
  if (!categoryFilterSelect) return;

  Array.from(categoryFilterSelect.options).forEach((option) => {
    if (!option.value) return;
    option.textContent = window.territoryCategories?.formatLabel?.(option.value) || option.value;
  });
}

function populateTerritoryFilterOptions(brands) {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");

  if (categoryFilterSelect) {
    const existingCategories = new Set(
      Array.from(categoryFilterSelect.options).map((option) => option.value)
    );
    const categories = [...new Set(brands.map((brand) => brand.category).filter(Boolean))].sort();
    categories.forEach((category) => {
      if (existingCategories.has(category)) return;

      const option = document.createElement("option");
      option.value = category;
      option.textContent = window.territoryCategories?.formatLabel?.(category) || category;
      categoryFilterSelect.append(option);
    });
    syncCategoryFilterLabels(categoryFilterSelect);
    categoryFilterSelect.disabled = getComboboxOptions(categoryFilterSelect).length === 0;
  }

  if (franchiseFilterSelect) {
    const existingFranchises = new Set(
      Array.from(franchiseFilterSelect.options).map((option) => option.value)
    );
    brands.forEach((brand) => {
      if (existingFranchises.has(brand.id)) return;

      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.brand;
      franchiseFilterSelect.append(option);
    });
    franchiseFilterSelect.disabled = getComboboxOptions(franchiseFilterSelect).length === 0;
  }

  syncFilterComboboxes();
}

function hydrateTerritoryFilterOptions(brands, { replace = false } = {}) {
  if (replace) {
    clearTerritoryDatasetFilterOptions();
  }
  populateTerritoryFilterOptions(brands);
  syncGeoLevelFilterVisibility(brands);

  if (savedTerritorySettings && !window.__territoryMapStarted) {
    restoreSelectFiltersFromSaved(savedTerritorySettings);
  }
}

let territoryFilterControlsBound = false;

function bindTerritoryFilterControls() {
  if (territoryFilterControlsBound) return;
  territoryFilterControlsBound = true;
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const rangeSections = Array.from(document.querySelectorAll(".filter-range-slider"))
    .map((track) => track.closest(".filter-section"))
    .filter(Boolean);

  categoryFilterSelect?.addEventListener("change", syncAfterPrimaryFilterChange);
  franchiseFilterSelect?.addEventListener("change", syncAfterPrimaryFilterChange);

  statusCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setFilterCheckboxState(checkbox, checkbox.checked);
      refreshTerritoryFilters();
    });
  });

  getTerritoryGeoLevelCheckboxes().forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setFilterCheckboxState(checkbox, checkbox.checked);
      refreshTerritoryFilters();
    });
  });

  getFranchiseeRatingRadios().forEach((radio) => {
    radio.addEventListener("change", () => {
      setFranchiseeRatingMin(radio.value);
      refreshTerritoryFilters();
    });
  });

  rangeSections.forEach((section) => {
    const track = section.querySelector(".filter-range-slider");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");
    const numberInputs = Array.from(section.querySelectorAll(".filter-number-input"));

    minRange?.addEventListener("input", () => {
      syncRangeTrack(track);
      refreshTerritoryFilters();
    });
    maxRange?.addEventListener("input", () => {
      syncRangeTrack(track);
      refreshTerritoryFilters();
    });
    numberInputs[0]?.addEventListener("change", refreshTerritoryFilters);
    numberInputs[1]?.addEventListener("change", refreshTerritoryFilters);
  });
}

function filterSectionHasAppliedFilters(section) {
  if (!section) return false;

  const locationFilterSearch = section.querySelector("#locationFilterSearchField");
  if (locationFilterSearch) {
    return hasAppliedLocationFilters();
  }

  const categoryFilterSelect = section.querySelector("#categoryFilterSelect");
  if (categoryFilterSelect) {
    return getFilterSelectIncludedValues(categoryFilterSelect).length > 0
      || getFilterSelectExcludedValues(categoryFilterSelect).length > 0;
  }

  const franchiseFilterSelect = section.querySelector("#franchiseFilterSelect");
  if (franchiseFilterSelect) {
    return getFilterSelectIncludedValues(franchiseFilterSelect).length > 0
      || getFilterSelectExcludedValues(franchiseFilterSelect).length > 0;
  }

  const statusCheckboxes = Array.from(section.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  if (statusCheckboxes.length) {
    return statusCheckboxes.some((checkbox) => checkbox.checked);
  }

  if (section.querySelector(".territory-geo-level-checkbox")) {
    return getTerritoryGeoLevelFilters().length > 0;
  }

  if (section.querySelector("[aria-label='Initial investment range']")) {
    return territoryRangeFilterIsActive(section);
  }

  if (section.querySelector(".territory-rating-radio")) {
    return franchiseeRatingFilterIsActive();
  }

  return false;
}

function isTerritoryCrossroadOpen() {
  return Boolean(document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open"));
}

function ensureLocationFilterSectionExpanded() {
  const section = document.getElementById("locationFilterSearchField")?.closest(".filter-section");
  if (!section) return;

  section.classList.remove("filter-section-collapsed");
  section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", "true");
  section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", "true");
}

function syncFilterSectionExpansion() {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return;

  // Splash / clear-all: only Location stays open, even when the default
  // Territory status ("Available") is applied. Once a search starts and the
  // map opens, expand every section that currently has filters applied.
  const splashState = isTerritoryCrossroadOpen();
  const hasAppliedFilters = getAppliedTerritoryFilterCount() > 0;

  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const isLocationSection = Boolean(section.querySelector("#locationFilterSearchField"));
    const isCurrentlyExpanded = !section.classList.contains("filter-section-collapsed");
    const hasSectionFilters = filterSectionHasAppliedFilters(section);
    const shouldExpand = splashState
      ? isLocationSection
      : hasSectionFilters
        ? true
        : hasAppliedFilters
          ? isCurrentlyExpanded
          : isLocationSection;

    section.classList.toggle("filter-section-collapsed", !shouldExpand);
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(shouldExpand));
    section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", String(shouldExpand));
  });

  updateFilterSectionClearButtons();
}

function applyCrossroadPresetSelections(preset = {}) {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const statuses = Array.isArray(preset.statuses)
    ? preset.statuses
    : DEFAULT_TERRITORY_STATUSES;

  setLocationStateFilters(preset.locations, preset.locationsExcluded, { refresh: false });
  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, preset.categories),
    getValidSavedSelectValues(categoryFilterSelect, preset.categoriesExcluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, preset.franchises),
    getValidSavedSelectValues(franchiseFilterSelect, preset.franchisesExcluded)
  );

  setTerritoryStatusFilters(statuses);
  setTerritoryGeoLevelFilters(preset.geoLevels ?? preset.geoLevel);
  radiusFilterEnabled = Boolean(preset.radius?.enabled);
  selectedRadiusMiles = clampRadiusValue(preset.radius?.miles);
  syncRadiusFilterControls();

  if (investmentSection) {
    const investmentTrack = investmentSection.querySelector(".filter-range-slider");
    const investmentMinRange = investmentTrack?.querySelector(".range-input-min");
    const investmentMaxRange = investmentTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      investmentSection,
      preset.investment?.min ?? Number(investmentMinRange?.min ?? 0),
      preset.investment?.max ?? Number(investmentMaxRange?.max ?? 0)
    );
  }

  setFranchiseeRatingMin(preset.rating?.min);

  syncFilterComboboxes();
  syncFilterSectionExpansion();
}

function setTerritoryLocationFilter(stateCode) {
  const result = window.territoryLocationSearch?.fromStateCode?.(stateCode);
  if (!result) return false;

  setSelectedLocationSearch(result);
  return true;
}

function setTerritoryLocationSearch(result) {
  if (!result?.stateCode) return false;
  setSelectedLocationSearch(result);
  focusTerritoryLocationSearchResult(result);
  return true;
}

function addTerritoryFranchiseFilter(brandId) {
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  if (!franchiseFilterSelect) return false;

  const validBrandIds = getValidSavedSelectValues(franchiseFilterSelect, [brandId]);
  if (!validBrandIds.length) return false;

  const value = validBrandIds[0];
  const currentValues = getFilterSelectValues(franchiseFilterSelect);
  const matchingOption = Array.from(franchiseFilterSelect.options).find((option) => option.value === value);

  if (currentValues.includes(value)) {
    if (matchingOption?.dataset.exclude === "true") {
      delete matchingOption.dataset.exclude;
      syncFilterComboboxes();
      refreshTerritoryFilters();
    }
    return true;
  }

  setFilterSelectValues(franchiseFilterSelect, [...currentValues, value]);
  syncFilterComboboxes();
  refreshTerritoryFilters();
  return true;
}

function initTerritoryFilterData(brands, registry) {
  populateTerritoryFilterOptions(brands);
  syncGeoLevelFilterVisibility(brands);
  renderInvestmentHistogram(registry);

  const crossroadChoice = window.territoryCrossroadChoice;

  isRestoringTerritorySettings = true;
  try {
    // A crossroad selection takes priority over any persisted filter state:
    // a preset applies its saved filters, while a fresh "new search" starts
    // clean. Filter-driven starts keep sidebar selections and only hydrate
    // category/franchise options once brand data is available.
    if (crossroadChoice?.type === "preset") {
      applyCrossroadPresetSelections(crossroadChoice.filters || {});
    } else if (crossroadChoice?.type === "new") {
      applyCrossroadPresetSelections(crossroadChoice.filters || {});
      if (crossroadChoice.locationSearch) {
        applyLocationSearchSelection(crossroadChoice.locationSearch, {
          autoRadius: false
        });
      }
    } else if (crossroadChoice?.type === "filters") {
      // Sidebar selections were made before the map existed; keep them as-is.
    } else if (savedTerritorySettings) {
      restoreSavedFilterSelections(savedTerritorySettings);
    }
  } finally {
    isRestoringTerritorySettings = false;
  }

  bindTerritoryFilterControls();
  applySavedMapSettings();
  refreshTerritoryFilters({ immediate: true });
  territorySettingsReadyToPersist = true;
  persistTerritorySettings();
}

window.territoryFilters = {
  getFilterSelectIncludedValues,
  getFilterSelectExcludedValues,
  getState: getTerritoryFilterState,
  setPanelOpen: setFilterPanelOpen,
  syncFilterComboboxes,
  syncFilterSectionExpansion,
  hydrateOptions: hydrateTerritoryFilterOptions,
  getAppliedFilterCount: getAppliedTerritoryFilterCount,
  hasNarrowingFilters: hasNarrowingTerritoryFilters,
  resetFilterSelections,
  applyCrossroadPreset: applyCrossroadPresetSelections,
  applyLocationSearchSelection,
  applySearchThisArea,
  hasImplicitAreaSearch,
  getImplicitViewportBounds,
  captureViewportFromMap,
  applyLocationInclude,
  applyLocationExclude,
  isFilterDataReady: () => territorySettingsReadyToPersist,
  shouldAutoEnableRadiusForLocation,
  setLocation: setTerritoryLocationFilter,
  setLocationSearch: setTerritoryLocationSearch,
  getLocationLabels: getLocationFilterLabels,
  addFranchise: addTerritoryFranchiseFilter,
  onDataReady: initTerritoryFilterData,
  updateSummary: updateTerritoryFilterSummary,
  refresh: refreshTerritoryFilters,
  persistSettings: persistTerritorySettings
};

initTerritoryFilters();
