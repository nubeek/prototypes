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

function isCurrencyNumberInput(input) {
  return input?.classList.contains("filter-number-input--currency");
}

function parseCurrencyInputValue(value) {
  if (value == null || value === "") return NaN;
  const normalized = String(value).replace(/[^\d]/g, "");
  if (!normalized) return NaN;
  return Number(normalized);
}

function formatCurrencyInputValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function getFilterNumberInputValue(input) {
  if (!input) return 0;
  if (isCurrencyNumberInput(input)) {
    const parsed = parseCurrencyInputValue(input.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampRangeValue(value, defaults) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return defaults.min;
  return Math.min(defaults.max, Math.max(defaults.min, Math.round(numericValue)));
}

function syncRangeFilterControls({ defaults, fill, max, maxInput, maxRange, min, minInput, minRange }) {
  [minRange, maxRange, minInput, maxInput].filter(Boolean).forEach((input) => {
    input.min = String(defaults.min);
    input.max = String(defaults.max);
  });

  if (minRange) minRange.value = String(min);
  if (maxRange) maxRange.value = String(max);
  if (minInput) {
    minInput.value = isCurrencyNumberInput(minInput)
      ? formatCurrencyInputValue(min)
      : String(min);
  }
  if (maxInput) {
    maxInput.value = isCurrencyNumberInput(maxInput)
      ? formatCurrencyInputValue(max)
      : String(max);
  }

  if (fill) {
    const rangeSize = defaults.max - defaults.min;
    const minPercent = rangeSize
      ? ((min - defaults.min) / rangeSize) * 100
      : 0;
    const maxPercent = rangeSize
      ? ((max - defaults.min) / rangeSize) * 100
      : 100;

    fill.style.left = `${minPercent}%`;
    fill.style.right = `${100 - maxPercent}%`;
  }

  const histogramTrack = minRange?.closest(".filter-range-slider--histogram");
  if (histogramTrack) {
    syncFilterHistogramRange(histogramTrack);
  }

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

function getNormalizedRange({ changed, defaults, maxValue, minValue }) {
  let nextMin = clampRangeValue(minValue, defaults);
  let nextMax = clampRangeValue(maxValue, defaults);

  if (nextMin > nextMax) {
    if (changed === "max") {
      nextMin = nextMax;
    } else {
      nextMax = nextMin;
    }
  }

  return { nextMax, nextMin };
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

function syncRadiusFilterControls(options = {}) {
  if (radiusToggle) {
    radiusToggle.checked = radiusFilterEnabled;
    setFilterCheckboxState(radiusToggle, radiusFilterEnabled);
  }

  syncRadiusFilterVisibility();

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
  radiusFilterSection.classList.toggle("is-visible", radiusFilterEnabled);
  radiusFilterSection.setAttribute("aria-hidden", String(!radiusFilterEnabled));
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

    chipEntries.forEach(({ key, label, excluded, onRemove, onToggleExclude }) => {
      const chip = document.createElement("span");
      const chipLabel = document.createElement("span");
      const chipRemove = document.createElement("button");

      chip.className = "filter-combobox-chip";
      chip.classList.toggle("is-excluded", excluded);
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");
      chip.setAttribute("aria-pressed", String(excluded));
      chip.setAttribute(
        "aria-label",
        excluded ? `Include ${label} in results` : `Exclude ${label} from results`
      );
      chip.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        onToggleExclude();
      });
      chip.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onToggleExclude();
      });

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

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = label;

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${label}`);
      chipRemove.textContent = "×";
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
    input.placeholder = hasSelection ? "" : "Select location";
  }

  filterLocationSearchControl?.setValue("");
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

function clearAllFilterSelections() {
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
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
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
    default:
      return false;
  }
}

function getFilterSectionSelectionLabel(section) {
  switch (getFilterSectionKey(section)) {
    case "units":
      return unitsFilterIsActive() ? `${selectedUnitsMin} – ${selectedUnitsMax}` : "";
    case "contacts":
      return contactsFilterIsActive() ? `${selectedContactsMin} – ${selectedContactsMax}` : "";
    case "status":
      return statusFilterInputs
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.closest(".filter-check")?.querySelector("span:last-child")?.textContent?.trim())
        .filter(Boolean)
        .join(", ");
    case "net-worth":
      return netWorthFilterIsActive()
        ? `$${formatCurrencyInputValue(selectedNetWorthMin)} – $${formatCurrencyInputValue(selectedNetWorthMax)}`
        : "";
    default:
      return "";
  }
}

function updateFilterSectionClearButtons() {
  if (!filterPanel) return;

  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const hasFilters = filterSectionHasAppliedFilters(section);
    const clearButton = section.querySelector(".filter-section-clear");
    const selection = section.querySelector(".filter-section-selection");
    if (clearButton) {
      clearButton.hidden = !hasFilters;
    }
    if (selection) {
      const label = getFilterSectionSelectionLabel(section);
      selection.textContent = label;
      selection.hidden = !label;
    }
    section.classList.toggle("has-selection", hasFilters);
  });
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
    default:
      return;
  }

  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  refreshAfterSectionClear();
}

function buildFilterHistogramCounts(values, rangeMin, rangeMax, binCount) {
  const counts = Array(binCount).fill(0);
  const rangeSize = rangeMax - rangeMin;
  if (rangeSize <= 0) return counts;

  values.forEach((value) => {
    const clamped = Math.min(rangeMax, Math.max(rangeMin, value));
    const ratio = (clamped - rangeMin) / rangeSize;
    const index = Math.min(binCount - 1, Math.floor(ratio * binCount));
    counts[index] += 1;
  });

  return counts;
}

function syncFilterHistogramRange(track) {
  const section = track?.closest(".filter-section");
  const histogramBars = section?.querySelectorAll(".filter-range-histogram-bar");
  const minRange = track?.querySelector(".range-input-min");
  const maxRange = track?.querySelector(".range-input-max");
  if (!histogramBars?.length || !minRange || !maxRange) return;

  const rangeMin = Number(minRange.min);
  const rangeMax = Number(maxRange.max);
  const minValue = Math.min(Number(minRange.value), Number(maxRange.value));
  const maxValue = Math.max(Number(minRange.value), Number(maxRange.value));
  const rangeSize = rangeMax - rangeMin;
  const binSize = rangeSize / FILTER_HISTOGRAM_BINS;

  histogramBars.forEach((bar, index) => {
    const barMin = rangeMin + (index * binSize);
    const barMax = rangeMin + ((index + 1) * binSize);
    bar.classList.toggle("is-in-range", rangeSize > 0 && barMax > minValue && barMin < maxValue);
  });
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
  const histogramBars = section?.querySelector(".filter-range-histogram-bars");
  const track = section?.querySelector(".filter-range-slider--histogram");
  if (!section || !histogramBars || !track) return;

  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const rangeMin = Number(minRange?.min ?? 0);
  const rangeMax = Number(maxRange?.max ?? 0);
  const counts = buildFilterHistogramCounts(
    getFilterHistogramValues(section),
    rangeMin,
    rangeMax,
    FILTER_HISTOGRAM_BINS
  );
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

  syncFilterHistogramRange(track);
}

function renderFilterHistograms() {
  filterPanel?.querySelectorAll(".filter-section").forEach((section) => {
    renderFilterHistogram(section);
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
  clearButton.textContent = "×";

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

  function removeSelectedValue(value) {
    const nextValues = getFilterSelectValues(select).filter((selectedValue) => selectedValue !== value);
    setSelectedValues(nextValues);
    input.focus({ preventScroll: true });
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

  function setValueExcluded(value, excluded) {
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
    dispatchComboboxChange();
    input.focus({ preventScroll: true });
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
        chip.tabIndex = 0;
        chip.setAttribute("role", "button");
        chip.setAttribute("aria-pressed", String(excluded));
        chip.setAttribute(
          "aria-label",
          excluded ? `Include ${option.label} in results` : `Exclude ${option.label} from results`
        );
        chip.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          setValueExcluded(option.value, !excluded);
        });
        chip.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          event.stopPropagation();
          setValueExcluded(option.value, !excluded);
        });

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
          setValueExcluded(option.value, !excluded);
        });
        chip.append(chipToggle);
      }

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = option.label;

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${option.label}`);
      chipRemove.textContent = "×";
      chipRemove.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        removeSelectedValue(option.value);
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

  function selectComboboxOption(value, { excluded = false } = {}) {
    const currentValues = getFilterSelectValues(select);
    if (currentValues.includes(value)) return;

    searchQuery = "";
    input.value = "";
    setFilterSelectValues(select, [...currentValues, value]);
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
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
