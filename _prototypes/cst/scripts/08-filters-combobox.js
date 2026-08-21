function setFilterCheckboxState(checkbox, isChecked) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", isChecked);
}

function getFranchiseeRatingRadios() {
  return Array.from(document.querySelectorAll("#filterPanel .filter-rating-radio"));
}

function normalizeFranchiseeRatingMin(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return [1, 2, 3, 4].reduce((closest, option) => (
    Math.abs(option - numeric) < Math.abs(closest - numeric) ? option : closest
  ));
}

function getFranchiseeRatingMin() {
  return normalizeFranchiseeRatingMin(selectedFranchiseeRatingMin);
}

function franchiseeRatingFilterIsActive() {
  return getFranchiseeRatingMin() > 0;
}

function setFranchiseeRatingMin(value, { refresh = false } = {}) {
  const nextValue = normalizeFranchiseeRatingMin(value);
  selectedFranchiseeRatingMin = nextValue;
  getFranchiseeRatingRadios().forEach((radio) => {
    radio.checked = Number(radio.value) === nextValue;
    setFilterCheckboxState(radio, radio.checked);
  });

  if (refresh) {
    updateClearFiltersButton();
    refreshRangeFilterResults();
  } else {
    updateClearFiltersButton();
  }
}

const {
  isCurrencyNumberInput,
  formatCurrencyInputValue,
  getFilterNumberInputValue,
  clampRangeValue,
  getNormalizedRange,
  syncRangeFilterControls: syncSharedRangeFilterControls,
  renderHistogram: renderSharedFilterHistogram
} = window.WefranchFilterRange;

const {
  enhance: enhanceFilterCombobox,
  getValues: getFilterSelectValues,
  getIncludedValues: getFilterSelectIncludedValues,
  getExcludedValues: getFilterSelectExcludedValues,
  setValues: setFilterSelectValues,
  syncAll: syncFilterComboboxes,
  renderChip: renderFilterChip
} = window.WefranchFilterCombobox;

function syncRangeFilterControls(config) {
  syncSharedRangeFilterControls({
    ...config,
    onSync: updateClearFiltersButton
  });
}

function syncStatusFilterStates() {
  statusFilterInputs.forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });
  updateClearFiltersButton();
}

function refreshRangeFilterResults() {
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}


function syncUnitsFilterControls() {
  syncRangeFilterControls({
    defaults: unitsFilterDefaults,
    fill: unitsRangeFill,
    max: selectedUnitsMax,
    maxInput: unitsMaxInput,
    maxRange: unitsMaxRange,
    min: selectedUnitsMin,
    minInput: unitsMinInput,
    minRange: unitsMinRange
  });
}

function setUnitsFilterRange(minValue, maxValue, { changed = "min", refresh = false } = {}) {
  const { nextMax, nextMin } = getNormalizedRange({
    changed,
    defaults: unitsFilterDefaults,
    maxValue,
    minValue
  });

  const didChange = nextMin !== selectedUnitsMin || nextMax !== selectedUnitsMax;
  selectedUnitsMin = nextMin;
  selectedUnitsMax = nextMax;
  syncUnitsFilterControls();

  if (refresh && didChange) {
    refreshRangeFilterResults();
  }
}

function syncContactsFilterControls() {
  syncRangeFilterControls({
    defaults: contactsFilterDefaults,
    fill: contactsRangeFill,
    max: selectedContactsMax,
    maxInput: contactsMaxInput,
    maxRange: contactsMaxRange,
    min: selectedContactsMin,
    minInput: contactsMinInput,
    minRange: contactsMinRange
  });
}

function setContactsFilterRange(minValue, maxValue, { changed = "min", refresh = false } = {}) {
  const { nextMax, nextMin } = getNormalizedRange({
    changed,
    defaults: contactsFilterDefaults,
    maxValue,
    minValue
  });

  const didChange = nextMin !== selectedContactsMin || nextMax !== selectedContactsMax;
  selectedContactsMin = nextMin;
  selectedContactsMax = nextMax;
  syncContactsFilterControls();

  if (refresh && didChange) {
    refreshRangeFilterResults();
  }
}

function syncNetWorthFilterControls() {
  syncRangeFilterControls({
    defaults: netWorthFilterDefaults,
    fill: netWorthRangeFill,
    max: selectedNetWorthMax,
    maxInput: netWorthMaxInput,
    maxRange: netWorthMaxRange,
    min: selectedNetWorthMin,
    minInput: netWorthMinInput,
    minRange: netWorthMinRange
  });
}

function setNetWorthFilterRange(minValue, maxValue, { changed = "min", refresh = false } = {}) {
  const { nextMax, nextMin } = getNormalizedRange({
    changed,
    defaults: netWorthFilterDefaults,
    maxValue,
    minValue
  });

  const didChange = nextMin !== selectedNetWorthMin || nextMax !== selectedNetWorthMax;
  selectedNetWorthMin = nextMin;
  selectedNetWorthMax = nextMax;
  syncNetWorthFilterControls();

  if (refresh && didChange) {
    refreshRangeFilterResults();
  }
}

function hasIncludedLocationSelection() {
  return selectedLocationSearches.length > 0
    || selectedLocationLabels.length > 0
    || Boolean(userLocationCenter);
}

function syncRadiusFilterControls(options = {}) {
  syncRadiusFilterVisibility();

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

function syncRadiusFilterVisibility() {
  if (!radiusFilterSection) return;

  const shouldShow = hasIncludedLocationSelection();
  radiusFilterSection.classList.toggle("is-visible", shouldShow);
  radiusFilterSection.setAttribute("aria-hidden", String(!shouldShow));

  if (!shouldShow) {
    radiusFilterEnabled = false;
  }
}

function setRadiusFilterEnabled(enabled, { refresh = false } = {}) {
  radiusFilterEnabled = Boolean(enabled);
  syncRadiusFilterControls();

  if (refresh) {
    refreshRangeFilterResults();
  }
}

function setRadiusValue(value, { refresh = false } = {}) {
  const nextValue = window.WefranchRadiusControl?.clampRadiusValue(value, RADIUS_FILTER_DEFAULTS)
    ?? RADIUS_FILTER_DEFAULTS.value;
  const didChange = nextValue !== selectedRadiusMiles;
  selectedRadiusMiles = nextValue;
  syncRadiusFilterControls();

  if (refresh && didChange && radiusFilterEnabled) {
    refreshRangeFilterResults();
  }
}

function initRadiusFilterControls() {
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
        refreshRangeFilterResults();
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
        refreshRangeFilterResults();
      }
    }
  });
}

function normalizeSavedLocationSearch(savedSearch) {
  if (!savedSearch) return null;

  if (typeof savedSearch === "string") {
    return window.cstLocationSearch?.fromLabel?.(savedSearch) || null;
  }

  const coordinates = savedSearch.coordinates;
  const longitude = Number(coordinates?.longitude);
  const latitude = Number(coordinates?.latitude);
  const label = String(savedSearch.label || "").trim();
  if (!label) return null;

  return {
    label,
    stateCode: savedSearch.stateCode ? String(savedSearch.stateCode) : "",
    coordinates: Number.isFinite(longitude) && Number.isFinite(latitude)
      ? { longitude, latitude }
      : null,
    geoLevel: savedSearch.geoLevel ? String(savedSearch.geoLevel) : null,
    geoKey: savedSearch.geoKey ? String(savedSearch.geoKey) : null
  };
}

function getCstLocationSearchKey(location) {
  return window.cstLocationSearch?.getSearchKey?.(location) || "";
}

function getLocationFilterSelectionCount() {
  return selectedLocationSearches.length
    + excludedLocationSearches.length
    + selectedLocationLabels.length
    + excludedLocationLabels.length;
}

function hasAppliedLocationFilters() {
  return getLocationFilterSelectionCount() > 0 || Boolean(userLocationCenter) || radiusFilterEnabled;
}

function refreshLocationFilterResults() {
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function applyAutoRadiusForLocationResult(result) {
  const miles = window.cstLocationSearch?.getAutoRadiusMiles?.(result);
  if (!Number.isFinite(miles)) return false;

  radiusFilterEnabled = true;
  selectedRadiusMiles = window.WefranchRadiusControl?.clampRadiusValue(miles, RADIUS_FILTER_DEFAULTS)
    ?? miles;
  syncRadiusFilterControls();
  return true;
}

function syncFilterLocationSearchUI() {
  const chipsContainer = document.getElementById("locationFilterSearchChips");
  const field = locationFilterSearchField;
  const input = document.getElementById("locationFilterSearchInput");
  const chipEntries = [];
  const seen = new Set();

  function addChip(search, { excluded = false } = {}) {
    const key = `${excluded ? "exclude" : "include"}:${getCstLocationSearchKey(search) || search.label}`;
    if (!search?.label || seen.has(key)) return;
    seen.add(key);
    chipEntries.push({
      key,
      label: search.label,
      excluded,
      onRecenter: excluded ? null : () => focusOwnersMapOnLocationSearch(search),
      onToggleExclude: excluded
        ? () => applyLocationInclude(search)
        : () => applyLocationExclude(search),
      onRemove: () => removeLocationFilterSearch(search, { excluded })
    });
  }

  selectedLocationSearches.forEach((search) => addChip(search));
  selectedLocationLabels.forEach((label) => {
    if (selectedLocationSearches.some((search) => search.label === label)) return;
    addChip(window.cstLocationSearch?.fromLabel?.(label) || { label });
  });
  excludedLocationSearches.forEach((search) => addChip(search, { excluded: true }));
  excludedLocationLabels.forEach((label) => {
    if (excludedLocationSearches.some((search) => search.label === label)) return;
    addChip(window.cstLocationSearch?.fromLabel?.(label) || { label }, { excluded: true });
  });

  if (chipsContainer) {
    chipsContainer.replaceChildren();

    chipEntries.forEach(({ key, label, excluded, onRemove, onToggleExclude, onRecenter }) => {
      chipsContainer.append(renderFilterChip({
        label,
        excluded,
        allowToggle: true,
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
  updateFilterSectionClearButtons();
}

function removeLocationFilterSearch(search, { excluded = false } = {}) {
  const searchKey = getCstLocationSearchKey(search);

  if (excluded) {
    excludedLocationSearches = excludedLocationSearches.filter(
      (candidate) => getCstLocationSearchKey(candidate) !== searchKey
    );
    excludedLocationLabels = excludedLocationLabels.filter((label) => label !== search.label);
  } else {
    selectedLocationSearches = selectedLocationSearches.filter(
      (candidate) => getCstLocationSearchKey(candidate) !== searchKey
    );
    selectedLocationLabels = selectedLocationLabels.filter((label) => label !== search.label);
  }

  syncFilterLocationSearchUI();
  refreshLocationFilterResults();
}

function applyLocationSearchSelection(result, { excluded = false, replace = false, autoRadius = false } = {}) {
  const nextLocation = normalizeSavedLocationSearch(result);
  if (!nextLocation) return false;

  const nextLocationKey = getCstLocationSearchKey(nextLocation);

  if (excluded) {
    selectedLocationSearches = selectedLocationSearches.filter(
      (location) => getCstLocationSearchKey(location) !== nextLocationKey
    );
    selectedLocationLabels = selectedLocationLabels.filter((label) => label !== nextLocation.label);
    excludedLocationSearches = replace
      ? [nextLocation]
      : [
          ...excludedLocationSearches.filter(
            (location) => getCstLocationSearchKey(location) !== nextLocationKey
          ),
          nextLocation
        ];
    if (!excludedLocationLabels.includes(nextLocation.label)) {
      excludedLocationLabels = [...excludedLocationLabels, nextLocation.label];
    }
  } else {
    excludedLocationSearches = excludedLocationSearches.filter(
      (location) => getCstLocationSearchKey(location) !== nextLocationKey
    );
    excludedLocationLabels = excludedLocationLabels.filter((label) => label !== nextLocation.label);
    selectedLocationSearches = replace
      ? [nextLocation]
      : [
          ...selectedLocationSearches.filter(
            (location) => getCstLocationSearchKey(location) !== nextLocationKey
          ),
          nextLocation
        ];
    if (!selectedLocationLabels.includes(nextLocation.label)) {
      selectedLocationLabels = [...selectedLocationLabels, nextLocation.label];
    }
  }

  if (!excluded && autoRadius) {
    applyAutoRadiusForLocationResult(nextLocation);
  }

  syncFilterLocationSearchUI();
  return true;
}

function applyLocationInclude(result) {
  applyLocationSearchSelection(result, {
    autoRadius: window.cstLocationSearch?.shouldAutoEnableRadius?.(result)
  });
  refreshLocationFilterResults();
}

function applyLocationExclude(result) {
  applyLocationSearchSelection(result, { excluded: true });
  refreshLocationFilterResults();
}

function clearLocationFilterState() {
  selectedLocationLabels = [];
  excludedLocationLabels = [];
  selectedLocationSearches = [];
  excludedLocationSearches = [];
  userLocationCenter = null;
  radiusFilterEnabled = false;
  selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
  syncFilterLocationSearchUI();
  syncRadiusFilterControls();
}

function setLocationFilterSelections(included = [], excluded = [], searches = [], excludedSearches = []) {
  const includedSearches = (Array.isArray(searches) ? searches : [])
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  const nextExcludedSearches = (Array.isArray(excludedSearches) ? excludedSearches : [])
    .map(normalizeSavedLocationSearch)
    .filter(Boolean);
  const includedLabels = [...new Set([
    ...includedSearches.map((search) => search.label),
    ...getSavedStringArray(included)
  ])];
  const excludedLabels = [...new Set([
    ...nextExcludedSearches.map((search) => search.label),
    ...getSavedStringArray(excluded)
  ])];

  selectedLocationSearches = includedSearches.length
    ? includedSearches
    : includedLabels.map((label) => window.cstLocationSearch?.fromLabel?.(label)).filter(Boolean);
  excludedLocationSearches = nextExcludedSearches.length
    ? nextExcludedSearches
    : excludedLabels.map((label) => window.cstLocationSearch?.fromLabel?.(label)).filter(Boolean);
  selectedLocationLabels = includedLabels;
  excludedLocationLabels = excludedLabels;
  syncFilterLocationSearchUI();
}

function resetCstFilterSelections({ refresh = true } = {}) {
  selectedLocationLabels = [];
  excludedLocationLabels = [];
  selectedLocationSearches = [];
  excludedLocationSearches = [];
  selectedCategoryValues = [];
  excludedCategoryValues = [];
  selectedOwnerIndexes = [];
  excludedOwnerIndexes = [];
  selectedFranchiseIndexes = [];
  excludedFranchiseIndexes = [];
  searchQuery = "";
  selectedUnitsMin = unitsFilterDefaults.min;
  selectedUnitsMax = unitsFilterDefaults.max;
  selectedContactsMin = contactsFilterDefaults.min;
  selectedContactsMax = contactsFilterDefaults.max;
  selectedNetWorthMin = netWorthFilterDefaults.min;
  selectedNetWorthMax = netWorthFilterDefaults.max;
  setFranchiseeRatingMin(0);
  userLocationCenter = null;
  radiusFilterEnabled = false;
  selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;

  setFilterSelectValues(categoryFilterSelect, []);
  setFilterSelectValues(ownerFilterSelect, []);
  setFilterSelectValues(franchiseFilterSelect, []);
  if (toolbarSearchInput) {
    toolbarSearchInput.value = "";
    toolbarSearchInput.closest(".toolbar-search-btn")?.classList.remove("is-active-search");
    if (toolbarSearchClear) {
      toolbarSearchClear.hidden = true;
    }
  }
  syncFilterComboboxes();
  syncFilterLocationSearchUI();

  statusFilterInputs.forEach((checkbox) => {
    checkbox.checked = false;
  });

  syncStatusFilterStates();
  syncUnitsFilterControls();
  syncContactsFilterControls();
  syncNetWorthFilterControls();
  syncRadiusFilterControls();
  syncMapLocationFilter();

  if (refresh) {
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  }
}

function clearAllFilterSelections() {
  clearCstSavedSearchSession({ persist: false });
  resetCstFilterSelections({ refresh: true });
  returnToCstSplash?.();
}

const FILTER_HISTOGRAM_BINS = 24;

function getFilterSectionKey(section) {
  return section?.dataset.filterSection || "";
}

function filterSectionHasAppliedFilters(section) {
  if (!section) return false;

  switch (getFilterSectionKey(section)) {
    case "location":
      return hasAppliedLocationFilters();
    case "category":
      return selectedCategoryValues.length > 0 || excludedCategoryValues.length > 0;
    case "owners":
      return selectedOwnerIndexes.length > 0 || excludedOwnerIndexes.length > 0;
    case "franchise":
      return selectedFranchiseIndexes.length > 0 || excludedFranchiseIndexes.length > 0;
    case "units":
      return unitsFilterIsActive();
    case "contacts":
      return contactsFilterIsActive();
    case "status":
      return statusFilterInputs.some((checkbox) => checkbox.checked);
    case "net-worth":
      return netWorthFilterIsActive();
    case "rating":
      return franchiseeRatingFilterIsActive();
    default:
      return false;
  }
}

function updateFilterSectionClearButtons() {
  window.WefranchFilterSections.updateClearButtons(filterPanel, filterSectionHasAppliedFilters);
}

function refreshAfterSectionClear() {
  syncFilterComboboxes();
  syncStatusFilterStates();
  syncUnitsFilterControls();
  syncContactsFilterControls();
  syncNetWorthFilterControls();
  syncRadiusFilterControls();
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function clearFilterSection(section) {
  if (!section || !filterSectionHasAppliedFilters(section)) return;

  switch (getFilterSectionKey(section)) {
    case "location":
      clearLocationFilterState();
      break;
    case "category":
      selectedCategoryValues = [];
      excludedCategoryValues = [];
      setFilterSelectValues(categoryFilterSelect, []);
      break;
    case "owners":
      selectedOwnerIndexes = [];
      excludedOwnerIndexes = [];
      setFilterSelectValues(ownerFilterSelect, []);
      syncOwnerExcludeState?.();
      break;
    case "franchise":
      selectedFranchiseIndexes = [];
      excludedFranchiseIndexes = [];
      setFilterSelectValues(franchiseFilterSelect, []);
      break;
    case "units":
      selectedUnitsMin = unitsFilterDefaults.min;
      selectedUnitsMax = unitsFilterDefaults.max;
      break;
    case "contacts":
      selectedContactsMin = contactsFilterDefaults.min;
      selectedContactsMax = contactsFilterDefaults.max;
      break;
    case "status":
      statusFilterInputs.forEach((checkbox) => {
        checkbox.checked = false;
      });
      break;
    case "net-worth":
      selectedNetWorthMin = netWorthFilterDefaults.min;
      selectedNetWorthMax = netWorthFilterDefaults.max;
      break;
    case "rating":
      setFranchiseeRatingMin(0);
      break;
    default:
      return;
  }

  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  refreshAfterSectionClear();
}

function getFilterHistogramValues(section) {
  switch (getFilterSectionKey(section)) {
    case "units":
      return owners.map((owner) => getOwnerUnitCount(owner)).filter(Number.isFinite);
    case "contacts":
      return owners.map((owner) => getOwnerContactCount(owner)).filter(Number.isFinite);
    case "net-worth":
      return owners.map((owner) => getOwnerNetWorth(owner)).filter(Number.isFinite);
    default:
      return [];
  }
}

function renderFilterHistogram(section) {
  renderSharedFilterHistogram({
    section,
    values: getFilterHistogramValues(section),
    binCount: FILTER_HISTOGRAM_BINS
  });
}

function renderFilterHistograms() {
  filterPanel?.querySelectorAll(".filter-section").forEach((section) => {
    renderFilterHistogram(section);
  });
}
