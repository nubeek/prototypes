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
const filterComboboxes = new Map();
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

function getCurrentTerritorySettings() {
  const shell = document.querySelector(".territory-shell");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);
  const ratingRange = getTerritoryFilterRangeValues(ratingSection);

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
        min: Math.min(ratingRange.min, ratingRange.max),
        max: Math.max(ratingRange.min, ratingRange.max)
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
      const chip = document.createElement("span");
      const chipLabel = document.createElement("span");
      const chipRemove = document.createElement("button");

      chip.className = "filter-combobox-chip";
      chip.classList.toggle("is-excluded", excluded);
      if (onRecenter) {
        chip.classList.add("is-recenterable");
      }

      if (onToggleExclude) {
        const chipToggle = document.createElement("button");
        chipToggle.className = "filter-combobox-chip-toggle";
        chipToggle.type = "button";
        chipToggle.setAttribute("aria-pressed", String(excluded));
        chipToggle.setAttribute(
          "aria-label",
          excluded ? `Include ${label} in results` : `Exclude ${label} from results`
        );
        chipToggle.dataset.tooltip = excluded ? "Include\nin results" : "Exclude\nfrom results";
        chipToggle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chipToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          onToggleExclude();
        });
        chip.append(chipToggle);
      }

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = label;
      if (onRecenter) {
        chipLabel.setAttribute("role", "button");
        chipLabel.tabIndex = 0;
        chipLabel.setAttribute("aria-label", `Recenter map on ${label}`);
        const handleRecenter = (event) => {
          event.stopPropagation();
          onRecenter();
        };
        chipLabel.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chipLabel.addEventListener("click", handleRecenter);
        chipLabel.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          handleRecenter(event);
        });
      }

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${label}`);
      chipRemove.textContent = "x";
      chipRemove.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        onRemove();
      });

      chip.append(chipLabel, chipRemove);
      chip.dataset.key = key;
      chipsContainer.append(chip);
    });
  }

  const hasSelection = chipEntries.length > 0;
  field?.classList.toggle("has-selection", hasSelection);
  filterLocationSearchControl?.setHasSelection?.(hasSelection);

  if (input) {
    input.placeholder = hasSelection ? "" : "Search by location";
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

function syncLocationFilterAfterRemoval() {
  syncFilterLocationSearchUI();
  if (!hasAppliedLocationFilters()) {
    returnToSplashAfterLocationCleared();
    return;
  }

  refreshTerritoryFilters();
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

function setFilterSelectIncludedExcludedValues(select, includedValues = [], excludedValues = []) {
  if (!select) return;

  const includedValueSet = new Set(includedValues.map(String));
  const excludedValueSet = new Set(excludedValues.map(String));

  Array.from(select.options).forEach((option) => {
    const isIncluded = includedValueSet.has(option.value);
    const isExcluded = excludedValueSet.has(option.value);
    option.selected = Boolean(option.value) && (isIncluded || isExcluded);

    if (isExcluded) {
      option.dataset.exclude = "true";
    } else {
      delete option.dataset.exclude;
    }
  });
}

function isCurrencyNumberInput(input) {
  return input?.classList.contains("filter-number-input--currency");
}

function parseCurrencyInputValue(value) {
  if (value == null || value === "") {
    return NaN;
  }

  const normalized = String(value).replace(/[^\d]/g, "");
  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

function formatCurrencyInputValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function getFilterNumberInputValue(input) {
  if (!input) {
    return 0;
  }

  if (isCurrencyNumberInput(input)) {
    const parsed = parseCurrencyInputValue(input.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setFilterNumberInputDisplay(input, value) {
  if (!input) {
    return;
  }

  if (isCurrencyNumberInput(input)) {
    input.value = formatCurrencyInputValue(value);
    return;
  }

  input.value = String(value);
}

function setTerritoryFilterRangeValues(section, min, max) {
  const track = section?.querySelector(".filter-range-slider");
  const minRange = track?.querySelector(".range-input-min");
  const maxRange = track?.querySelector(".range-input-max");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  if (!track || !minRange || !maxRange) return;

  const clamp = (value, floor, ceiling) => Math.min(ceiling, Math.max(floor, value));
  const rangeMin = Number(minRange.min);
  const rangeMax = Number(maxRange.max);
  const minValue = clamp(Number(min), rangeMin, rangeMax);
  const maxValue = clamp(Number(max), rangeMin, rangeMax);

  minRange.value = String(minValue);
  maxRange.value = String(maxValue);
  setFilterNumberInputDisplay(numberInputs[0], minValue);
  setFilterNumberInputDisplay(numberInputs[1], maxValue);
  syncRangeTrack(track);
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
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
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

  if (ratingSection) {
    const ratingTrack = ratingSection.querySelector(".filter-range-slider");
    const ratingMinRange = ratingTrack?.querySelector(".range-input-min");
    const ratingMaxRange = ratingTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      ratingSection,
      filters.rating?.min ?? Number(ratingMinRange?.min ?? 0),
      filters.rating?.max ?? Number(ratingMaxRange?.max ?? 0)
    );
  }

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

function normalizeComboboxText(value) {
  return value.trim().toLocaleLowerCase();
}

function getComboboxPlaceholder(select) {
  const placeholderOption = Array.from(select.options).find((option) => option.value === "");
  const placeholderText = placeholderOption?.textContent?.trim();

  if (placeholderText) {
    return placeholderText.replace(/\.\.\.$/, "");
  }

  return select.getAttribute("aria-label") || "Select option";
}

function getComboboxOptions(select) {
  return Array.from(select.options)
    .filter((option) => option.value !== "")
    .map((option) => ({
      label: option.textContent.trim(),
      value: option.value
    }));
}

function getFilterSelectValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected)
    .map((option) => option.value);
}

function getFilterSelectIncludedValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected && option.dataset.exclude !== "true")
    .map((option) => option.value);
}

function getFilterSelectExcludedValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected && option.dataset.exclude === "true")
    .map((option) => option.value);
}

function setFilterSelectValues(select, values) {
  if (!select) return;

  const selectedValueSet = new Set(values.map(String));
  Array.from(select.options).forEach((option) => {
    option.selected = Boolean(option.value) && selectedValueSet.has(option.value);
    if (!option.selected) {
      delete option.dataset.exclude;
    }
  });
}

function enhanceFilterCombobox(select, { allowExclude = false } = {}) {
  const field = select.closest(".filter-select-field");
  if (!field) return null;
  if (filterComboboxes.has(select)) return filterComboboxes.get(select);

  const placeholder = getComboboxPlaceholder(select);
  const control = document.createElement("div");
  const chips = document.createElement("div");
  const input = document.createElement("input");
  const clearButton = document.createElement("button");
  const menu = document.createElement("div");
  const menuList = document.createElement("div");
  const chevron = field.querySelector("img");
  const menuId = `${select.id || "filter"}ComboboxOptions`;
  let isOpen = false;
  let searchQuery = "";
  let activeOptionIndex = -1;
  let renderedOptions = [];
  let optionTooltip = null;
  let optionTooltipTarget = null;

  select.classList.add("filter-native-select");
  select.multiple = true;
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  control.className = "filter-combobox-control";
  control.setAttribute("role", "presentation");

  chips.className = "filter-combobox-chips";

  input.className = "filter-combobox-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = placeholder;
  input.setAttribute("aria-label", select.getAttribute("aria-label") || placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", menuId);

  clearButton.className = "filter-combobox-clear";
  clearButton.type = "button";
  clearButton.setAttribute("aria-label", `Clear ${placeholder}`);
  clearButton.hidden = true;
  clearButton.textContent = "x";

  menu.className = "filter-combobox-menu";
  menu.id = menuId;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", select.getAttribute("aria-label") || placeholder);
  menuList.className = "filter-combobox-options";

  control.append(chips, input);
  field.insertBefore(control, chevron || null);
  field.insertBefore(clearButton, chevron || null);
  menu.append(menuList);
  field.append(menu);

  function getOptionTooltip() {
    if (!optionTooltip) {
      optionTooltip = document.createElement("div");
      optionTooltip.className = "filter-combobox-floating-tooltip";
    }

    return optionTooltip;
  }

  function positionOptionTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = getOptionTooltip();
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

  function showOptionTooltip(event) {
    optionTooltipTarget = event.currentTarget;
    positionOptionTooltip(optionTooltipTarget);
    getOptionTooltip().classList.add("is-visible");
  }

  function hideOptionTooltip() {
    optionTooltipTarget = null;
    optionTooltip?.classList.remove("is-visible");
  }

  function getSelectedOptions() {
    const selectedValues = new Set(getFilterSelectValues(select));
    return getComboboxOptions(select).filter((option) => selectedValues.has(option.value));
  }

  function setActiveOption(index) {
    const optionButtons = Array.from(menuList.querySelectorAll(".filter-combobox-option"));
    if (!optionButtons.length) {
      activeOptionIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }

    activeOptionIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeOptionIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive) {
        input.setAttribute("aria-activedescendant", optionButton.id);
        optionButton.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function dispatchComboboxChange() {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function isValueExcluded(value) {
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    return option?.dataset.exclude === "true";
  }

  function setOptionExcluded(value, excluded) {
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    if (!option) return;

    if (excluded) {
      option.dataset.exclude = "true";
    } else {
      delete option.dataset.exclude;
    }
  }

  function syncComboboxDisplay() {
    const selectedOptions = getSelectedOptions();
    chips.innerHTML = "";

    selectedOptions.forEach((option) => {
      const excluded = allowExclude && isValueExcluded(option.value);
      const chip = document.createElement("span");
      const chipLabel = document.createElement("span");
      const chipRemove = document.createElement("button");

      chip.className = "filter-combobox-chip";
      chip.classList.toggle("is-excluded", excluded);

      if (allowExclude) {
        const chipToggle = document.createElement("button");
        chipToggle.className = "filter-combobox-chip-toggle";
        chipToggle.type = "button";
        chipToggle.setAttribute("aria-pressed", String(excluded));
        chipToggle.setAttribute(
          "aria-label",
          excluded ? `Include ${option.label} in results` : `Exclude ${option.label} from results`
        );
        chipToggle.dataset.tooltip = excluded ? "Include\nin results" : "Exclude\nfrom results";
        chipToggle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chipToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          setOptionExcluded(option.value, !excluded);
          syncComboboxDisplay();
          renderComboboxOptions();
          dispatchComboboxChange();
        });
        chip.append(chipToggle);
      }

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = option.label;

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${option.label}`);
      chipRemove.textContent = "x";
      chipRemove.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        const nextValues = getFilterSelectValues(select).filter((value) => value !== option.value);
        setSelectedValues(nextValues);
        input.focus({ preventScroll: true });
      });

      chip.append(chipLabel, chipRemove);
      chips.append(chip);
    });

    input.placeholder = selectedOptions.length ? "" : placeholder;
    field.classList.toggle("has-selection", selectedOptions.length > 0);
    clearButton.hidden = !selectedOptions.length;
  }

  function closeCombobox({ restoreDisplay = true } = {}) {
    if (!isOpen) return;

    hideOptionTooltip();
    isOpen = false;
    searchQuery = "";
    input.value = "";
    renderedOptions = [];
    activeOptionIndex = -1;
    field.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    menuList.innerHTML = "";

    if (restoreDisplay) {
      syncComboboxDisplay();
    }
  }

  function setSelectedValues(values, { dispatch = true } = {}) {
    setFilterSelectValues(select, values);
    syncComboboxDisplay();

    if (isOpen) {
      renderComboboxOptions();
    }

    if (dispatch) {
      dispatchComboboxChange();
    }
  }

  function selectComboboxOption(value, { excluded = false } = {}) {
    const currentValues = getFilterSelectValues(select);
    if (currentValues.includes(value)) return;

    searchQuery = "";
    input.value = "";
    setFilterSelectValues(select, [...currentValues, value]);
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    renderComboboxOptions();
    dispatchComboboxChange();
    input.focus({ preventScroll: true });
  }

  function renderComboboxOptions() {
    const normalizedQuery = normalizeComboboxText(searchQuery);
    const selectedValues = new Set(getFilterSelectValues(select));

    hideOptionTooltip();
    renderedOptions = getComboboxOptions(select).filter((option) => (
      !selectedValues.has(option.value) &&
      normalizeComboboxText(option.label).includes(normalizedQuery)
    ));

    menuList.innerHTML = "";

    if (!renderedOptions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "filter-combobox-empty";
      emptyState.textContent = "No results found";
      menuList.append(emptyState);
      setActiveOption(-1);
      return;
    }

    renderedOptions.forEach((option, index) => {
      const optionButton = document.createElement(allowExclude ? "div" : "button");
      const optionLabel = document.createElement("span");
      optionButton.className = "filter-combobox-option";
      if (!allowExclude) {
        optionButton.type = "button";
      }
      optionButton.id = `${menuId}-${index}`;
      optionButton.dataset.value = option.value;
      optionButton.setAttribute("role", "option");
      optionButton.setAttribute("aria-selected", "false");
      optionLabel.className = "filter-combobox-option-label";
      optionLabel.textContent = option.label;
      optionButton.append(optionLabel);

      if (allowExclude) {
        const optionActions = document.createElement("span");
        const includeAction = document.createElement("button");
        const excludeAction = document.createElement("button");

        optionActions.className = "filter-combobox-option-actions";
        includeAction.className = "filter-combobox-option-action is-include";
        includeAction.type = "button";
        includeAction.tabIndex = -1;
        includeAction.setAttribute("aria-label", `Include ${option.label} in results`);
        includeAction.dataset.tooltip = "Include\nin results";
        excludeAction.className = "filter-combobox-option-action is-exclude";
        excludeAction.type = "button";
        excludeAction.tabIndex = -1;
        excludeAction.setAttribute("aria-label", `Exclude ${option.label} from results`);
        excludeAction.dataset.tooltip = "Exclude\nfrom results";

        [includeAction, excludeAction].forEach((actionButton) => {
          actionButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          actionButton.addEventListener("mouseenter", showOptionTooltip);
          actionButton.addEventListener("mouseleave", hideOptionTooltip);
          actionButton.addEventListener("focus", showOptionTooltip);
          actionButton.addEventListener("blur", hideOptionTooltip);
          actionButton.addEventListener("click", hideOptionTooltip);
        });

        includeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          selectComboboxOption(option.value);
        });
        excludeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          selectComboboxOption(option.value, { excluded: true });
        });

        optionActions.append(includeAction, excludeAction);
        optionButton.append(optionActions);
      }

      optionButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      optionButton.addEventListener("click", () => {
        selectComboboxOption(option.value);
        input.focus({ preventScroll: true });
      });

      menuList.append(optionButton);
    });

    if (activeOptionIndex >= renderedOptions.length) {
      activeOptionIndex = -1;
    }

    if (activeOptionIndex >= 0) {
      setActiveOption(activeOptionIndex);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function openCombobox({ selectInputText = false } = {}) {
    if (select.disabled) return;

    isOpen = true;
    searchQuery = "";
    field.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
    syncComboboxDisplay();
    renderComboboxOptions();

    if (selectInputText) {
      input.focus({ preventScroll: true });
    }
  }

  function syncDisabledState() {
    const isDisabled = select.disabled;
    input.disabled = isDisabled;
    field.classList.toggle("is-disabled", isDisabled);

    if (isDisabled) {
      closeCombobox();
    }
  }

  input.addEventListener("focus", () => {
    openCombobox({ selectInputText: true });
  });

  input.addEventListener("input", () => {
    searchQuery = input.value;

    if (!isOpen) {
      isOpen = true;
      field.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
    }

    renderComboboxOptions();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && input.value === "") {
      const currentValues = getFilterSelectValues(select);
      if (currentValues.length) {
        event.preventDefault();
        setSelectedValues(currentValues.slice(0, -1));
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openCombobox();
        if (renderedOptions.length) {
          setActiveOption(event.key === "ArrowDown" ? 0 : renderedOptions.length - 1);
        }
        return;
      }
      setActiveOption(activeOptionIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || activeOptionIndex < 0) return;
      event.preventDefault();
      selectComboboxOption(renderedOptions[activeOptionIndex].value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCombobox();
      input.blur();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => closeCombobox(), 100);
  });

  clearButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  clearButton.addEventListener("click", () => {
    setSelectedValues([]);
    input.focus({ preventScroll: true });
  });

  menuList.addEventListener("scroll", hideOptionTooltip);
  window.addEventListener("resize", hideOptionTooltip);

  field.addEventListener("mousedown", (event) => {
    const section = field.closest(".filter-section");
    if (section?.classList.contains("filter-section-collapsed")) {
      event.preventDefault();
      return;
    }

    if (event.target === input || menu.contains(event.target) || clearButton.contains(event.target)) return;
    if (select.disabled) return;

    const wasOpen = isOpen;
    event.preventDefault();
    input.focus({ preventScroll: true });

    if (wasOpen) {
      closeCombobox();
    } else {
      openCombobox({ selectInputText: true });
    }
  });

  select.addEventListener("change", () => {
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
  });

  const comboboxApi = {
    close: closeCombobox,
    sync() {
      syncDisabledState();
      syncComboboxDisplay();
      if (isOpen) {
        renderComboboxOptions();
      }
    }
  };

  filterComboboxes.set(select, comboboxApi);
  comboboxApi.sync();
  return comboboxApi;
}

function syncFilterComboboxes() {
  filterComboboxes.forEach((combobox) => {
    combobox.sync();
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

function buildInvestmentHistogramCounts(values, rangeMin, rangeMax, binCount) {
  const counts = Array(binCount).fill(0);
  const rangeSize = rangeMax - rangeMin;

  if (rangeSize <= 0) {
    return counts;
  }

  values.forEach((value) => {
    const clamped = Math.min(rangeMax, Math.max(rangeMin, value));
    const ratio = (clamped - rangeMin) / rangeSize;
    const index = Math.min(binCount - 1, Math.floor(ratio * binCount));
    counts[index] += 1;
  });

  return counts;
}

function syncInvestmentHistogramRange(track) {
  const section = track.closest(".filter-section--investment");
  const histogramBars = section?.querySelectorAll(".filter-range-histogram-bar");
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");

  if (!histogramBars?.length || !minRange || !maxRange) {
    return;
  }

  const rangeMin = Number(minRange.min);
  const rangeMax = Number(maxRange.max);
  const minValue = Math.min(Number(minRange.value), Number(maxRange.value));
  const maxValue = Math.max(Number(minRange.value), Number(maxRange.value));
  const rangeSize = rangeMax - rangeMin;
  const binSize = rangeSize / INVESTMENT_HISTOGRAM_BINS;

  histogramBars.forEach((bar, index) => {
    const barMin = rangeMin + (index * binSize);
    const barMax = rangeMin + ((index + 1) * binSize);
    const inRange = barMax > minValue && barMin < maxValue;
    bar.classList.toggle("is-in-range", inRange);
  });
}

function renderInvestmentHistogram(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const section = getInvestmentFilterSection();
  const histogramBars = section?.querySelector(".filter-range-histogram-bars");
  const track = section?.querySelector(".filter-range-slider");

  if (!section || !histogramBars || !track) {
    return;
  }

  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const rangeMin = Number(minRange?.min ?? 0);
  const rangeMax = Number(maxRange?.max ?? 0);
  const values = registry.map((record) => normalizeInvestmentValue(record.initialInvestment));
  const counts = buildInvestmentHistogramCounts(values, rangeMin, rangeMax, INVESTMENT_HISTOGRAM_BINS);
  const peak = Math.max(...counts, 1);

  histogramBars.replaceChildren();
  counts.forEach((count) => {
    const bar = document.createElement("span");
    bar.className = "filter-range-histogram-bar";
    bar.style.height = count
      ? `${Math.max(14, Math.round((count / peak) * 100))}%`
      : "8%";
    histogramBars.append(bar);
  });

  syncInvestmentHistogramRange(track);
}

function syncRangeTrack(track) {
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const fill = track.querySelector(".range-fill");
  const section = track.closest(".filter-section");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  const minInput = numberInputs[0];
  const maxInput = numberInputs[1];
  if (!minRange || !maxRange) return;

  const min = Number(minRange.min);
  const max = Number(maxRange.max);
  const rangeSize = max - min;
  let minValue = Number(minRange.value);
  let maxValue = Number(maxRange.value);

  if (minValue > maxValue) {
    if (document.activeElement === maxRange || document.activeElement === maxInput) {
      minValue = maxValue;
    } else {
      maxValue = minValue;
    }
  }

  minRange.value = String(minValue);
  maxRange.value = String(maxValue);
  if (minInput && document.activeElement !== minInput) {
    setFilterNumberInputDisplay(minInput, minValue);
  }
  if (maxInput && document.activeElement !== maxInput) {
    setFilterNumberInputDisplay(maxInput, maxValue);
  }

  if (fill && rangeSize > 0) {
    const minPercent = ((minValue - min) / rangeSize) * 100;
    const maxPercent = ((maxValue - min) / rangeSize) * 100;
    fill.style.left = `${minPercent}%`;
    fill.style.right = `${100 - maxPercent}%`;
  }

  if (track.classList.contains("filter-range-slider--histogram")) {
    syncInvestmentHistogramRange(track);
  }
}

function bindRangeTrack(track) {
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const section = track.closest(".filter-section");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  const minInput = numberInputs[0];
  const maxInput = numberInputs[1];
  const syncFromNumberInput = (numberInput, rangeInput) => {
    const rangeMin = Number(rangeInput.min);
    const rangeMax = Number(rangeInput.max);
    let value = getFilterNumberInputValue(numberInput);

    if (!Number.isFinite(value)) {
      value = Number(rangeInput.value);
    }

    value = Math.min(rangeMax, Math.max(rangeMin, value));
    rangeInput.value = String(value);
    syncRangeTrack(track);
  };

  const bindNumberInput = (numberInput, rangeInput) => {
    if (isCurrencyNumberInput(numberInput)) {
      numberInput.addEventListener("focus", () => {
        const value = getFilterNumberInputValue(numberInput);
        numberInput.value = Number.isFinite(value) ? String(value) : "";
      });

      numberInput.addEventListener("blur", () => {
        syncFromNumberInput(numberInput, rangeInput);
        setFilterNumberInputDisplay(numberInput, getFilterNumberInputValue(numberInput));
      });

      numberInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          numberInput.blur();
        }
      });
    }

    numberInput.addEventListener("change", () => syncFromNumberInput(numberInput, rangeInput));
  };

  minRange?.addEventListener("input", () => syncRangeTrack(track));
  maxRange?.addEventListener("input", () => syncRangeTrack(track));
  if (minInput) bindNumberInput(minInput, minRange);
  if (maxInput) bindNumberInput(maxInput, maxRange);
  syncRangeTrack(track);
}

function toggleFilterSectionCollapsed(section) {
  const title = section.querySelector(".filter-section-title");
  const toggle = section.querySelector(".filter-section-toggle");
  const isCollapsed = section.classList.toggle("filter-section-collapsed");
  const isExpanded = !isCollapsed;

  title?.setAttribute("aria-expanded", String(isExpanded));
  toggle?.setAttribute("aria-expanded", String(isExpanded));

  if (isCollapsed) {
    section.querySelectorAll(".filter-field-select").forEach((select) => {
      filterComboboxes.get(select)?.close();
    });
  }

  persistTerritorySettings();
}

let filterSectionClearTooltip = null;

function getFilterSectionClearTooltip() {
  if (!filterSectionClearTooltip) {
    filterSectionClearTooltip = document.createElement("div");
    filterSectionClearTooltip.className = "filter-combobox-floating-tooltip";
  }

  return filterSectionClearTooltip;
}

function positionFilterSectionClearTooltip(target) {
  const tooltipText = target.dataset.tooltip;
  if (!tooltipText) return;

  const tooltip = getFilterSectionClearTooltip();
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

function showFilterSectionClearTooltip(event) {
  positionFilterSectionClearTooltip(event.currentTarget);
  getFilterSectionClearTooltip().classList.add("is-visible");
}

function hideFilterSectionClearTooltip() {
  filterSectionClearTooltip?.classList.remove("is-visible");
}

function bindFilterSectionClearTooltip(button) {
  button.addEventListener("mouseenter", showFilterSectionClearTooltip);
  button.addEventListener("mouseleave", hideFilterSectionClearTooltip);
  button.addEventListener("focus", showFilterSectionClearTooltip);
  button.addEventListener("blur", hideFilterSectionClearTooltip);
  button.addEventListener("click", hideFilterSectionClearTooltip);
}

function enhanceFilterSectionHeaders() {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return;

  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const title = section.querySelector(":scope > .filter-section-title");
    if (!title || section.querySelector(".filter-section-header")) return;

    const label = title.querySelector("span")?.textContent?.trim() || "filters";
    const chevron = title.querySelector("img");
    const header = document.createElement("div");
    header.className = "filter-section-header";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "ui-control ui-button-ghost filter-section-clear";
    clearButton.setAttribute("aria-label", "Clear filter");
    clearButton.dataset.tooltip = "Clear filter";
    clearButton.hidden = true;

    const clearIcon = document.createElement("img");
    clearIcon.src = "assets/remove.svg";
    clearIcon.alt = "";
    clearIcon.setAttribute("aria-hidden", "true");
    clearButton.append(clearIcon);
    bindFilterSectionClearTooltip(clearButton);

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "ui-control ui-button-ghost filter-section-toggle";
    toggleButton.setAttribute("aria-label", `Toggle ${label}`);
    toggleButton.setAttribute("aria-expanded", title.getAttribute("aria-expanded") || "false");
    if (chevron) toggleButton.appendChild(chevron);

    const labelNode = title.querySelector("span");
    title.replaceChildren(labelNode || document.createTextNode(label));

    section.insertBefore(header, title);
    header.append(title, clearButton, toggleButton);

    clearButton.addEventListener("click", (event) => {
      event.stopPropagation();
      clearFilterSection(section);
    });
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
    returnToSplashAfterLocationCleared();
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
  } else if (section.querySelector("[aria-label='Franchisee rating range']")) {
    const track = section.querySelector(".filter-range-slider");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      section,
      Number(minRange?.min ?? 0),
      Number(maxRange?.max ?? 0)
    );
  } else {
    return;
  }

  syncFilterComboboxes();
  syncFilterSectionExpansion();
  refreshTerritoryFilters();
}

function updateFilterSectionClearButtons() {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return;

  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const clearButton = section.querySelector(".filter-section-clear");
    if (!clearButton) return;
    const shouldShow = filterSectionHasAppliedFilters(section);
    clearButton.hidden = !shouldShow;
    if (!shouldShow) hideFilterSectionClearTooltip();
  });
}

function initTerritoryFilters() {
  const shell = document.querySelector(".territory-shell");
  const filterPanel = document.querySelector(".territory-filter-panel");
  const filterToggle = document.getElementById("territoryFilterToggle");

  enhanceFilterSectionHeaders();
  restoreSavedTerritorySettings();

  filterPanel?.querySelectorAll(".filter-section").forEach((section) => {
    const title = section.querySelector(".filter-section-title");
    const toggle = section.querySelector(".filter-section-toggle");
    const isExpanded = !section.classList.contains("filter-section-collapsed");
    title?.setAttribute("aria-expanded", String(isExpanded));
    toggle?.setAttribute("aria-expanded", String(isExpanded));
  });

  filterPanel?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target.closest(".filter-section-clear")) return;

    const title = event.target.closest(".filter-section-title");
    const toggle = event.target.closest(".filter-section-toggle");
    if (!title && !toggle) return;
    if (!filterPanel.contains(title || toggle)) return;

    const section = (title || toggle)?.closest(".filter-section");
    if (!section) return;

    toggleFilterSectionCollapsed(section);
  });

  document.querySelectorAll(".filter-field-select").forEach((select) => {
    const allowExclude = select.id === "categoryFilterSelect"
      || select.id === "franchiseFilterSelect";
    enhanceFilterCombobox(select, { allowExclude });
  });

  document.querySelectorAll(".territory-filter-checkbox").forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });

  document.querySelectorAll(".filter-range-slider").forEach(bindRangeTrack);

  filterToggle?.addEventListener("click", () => {
    const isOpen = !shell?.classList.contains("is-filter-open");
    setFilterPanelOpen(isOpen);

    if (!isOpen) {
      filterComboboxes.forEach((combobox) => combobox.close());
    }

    persistTerritorySettings();

    window.setTimeout(() => {
      window.territoryMap?.resize?.();
    }, 280);
  });

  document.addEventListener("mousedown", (event) => {
    filterComboboxes.forEach((combobox, select) => {
      const field = select.closest(".filter-select-field");
      if (!field?.contains(event.target)) {
        combobox.close();
      }
    });
  });

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
      returnToSplashAfterLocationCleared();
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
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");

  return hasAppliedLocationFilters()
    || getFilterSelectIncludedValues(categoryFilterSelect).length > 0
    || getFilterSelectExcludedValues(categoryFilterSelect).length > 0
    || getFilterSelectIncludedValues(franchiseFilterSelect).length > 0
    || getFilterSelectExcludedValues(franchiseFilterSelect).length > 0
    || getTerritoryGeoLevelFilters().length > 0
    || Boolean(searchInput?.value.trim())
    || territoryRangeFilterIsActive(investmentSection)
    || territoryRangeFilterIsActive(ratingSection);
}

function getAppliedTerritoryFilterCount() {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
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
  const selectedRatingCount = territoryRangeFilterIsActive(ratingSection) ? 1 : 0;
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
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
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

  if (ratingSection) {
    const ratingTrack = ratingSection.querySelector(".filter-range-slider");
    const ratingMinRange = ratingTrack?.querySelector(".range-input-min");
    const ratingMaxRange = ratingTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      ratingSection,
      Number(ratingMinRange?.min ?? 0),
      Number(ratingMaxRange?.max ?? 0)
    );
  }

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
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);
  const ratingRange = getTerritoryFilterRangeValues(ratingSection);
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
    ratingMin: Math.min(ratingRange.min, ratingRange.max),
    ratingMax: Math.max(ratingRange.min, ratingRange.max),
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

  if (record.franchiseeRating < filters.ratingMin || record.franchiseeRating > filters.ratingMax) {
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
  filterSummary.innerHTML = `Showing ${visibleRange} of ${totalCount} records<span class="filter-summary-sort">sorted by relevancy</span>`;
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

  categoryFilterSelect?.addEventListener("change", refreshTerritoryFilters);
  franchiseFilterSelect?.addEventListener("change", refreshTerritoryFilters);

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

  if (section.querySelector("[aria-label='Franchisee rating range']")) {
    return territoryRangeFilterIsActive(section);
  }

  return false;
}

function isTerritoryCrossroadOpen() {
  return Boolean(document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open"));
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
    const shouldExpand = splashState
      ? isLocationSection
      : hasAppliedFilters
        ? filterSectionHasAppliedFilters(section)
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
