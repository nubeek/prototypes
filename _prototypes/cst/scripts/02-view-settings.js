const savedViewSettings = readSavedViewSettings();
function readSavedViewSettings() {
  try {
    const savedValue = window.localStorage?.getItem(VIEW_SETTINGS_STORAGE_KEY);
    if (!savedValue) return null;
    const parsedValue = JSON.parse(savedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
  } catch (error) {
    console.warn("Unable to read saved CST view settings.", error);
    return null;
  }
}

function writeSavedViewSettings(settings) {
  try {
    window.localStorage?.setItem(VIEW_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Unable to save CST view settings.", error);
  }
}

function removeSavedViewSettings() {
  try {
    window.localStorage?.removeItem(VIEW_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to reset CST view settings.", error);
  }
}

function getSavedStringArray(value) {
  return Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : [];
}

function getFilterSectionStorageKey(section, index) {
  const label = section.querySelector(".filter-section-title span")?.textContent?.trim();
  return label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `section-${index}`;
}

function getFilterSectionSettings() {
  if (!filterPanel) return {};

  return Array.from(filterPanel.querySelectorAll(".filter-section"))
    .reduce((settings, section, index) => {
      settings[getFilterSectionStorageKey(section, index)] = section.classList.contains("filter-section-collapsed");
      return settings;
    }, {});
}

function getCurrentViewSettings() {
  return {
    version: 1,
    panelOpen: Boolean(lockedToolbarMode),
    panelMode: lockedToolbarMode,
    panelLayout: currentPanelLayout,
    updatesEnabled,
    modifiedColumnVisible,
    reduceMotionEnabled,
    filters: {
      open: Boolean(card?.classList.contains("is-filter-open")),
      sections: getFilterSectionSettings(),
      locations: {
        included: selectedLocationLabels,
        excluded: excludedLocationLabels
      },
      categories: {
        included: selectedCategoryValues,
        excluded: excludedCategoryValues
      },
      owners: {
        included: selectedOwnerIndexes,
        excluded: excludedOwnerIndexes
      },
      franchises: {
        included: selectedFranchiseIndexes,
        excluded: excludedFranchiseIndexes
      },
      statuses: statusFilterInputs.map((checkbox) => checkbox.checked),
      units: {
        min: selectedUnitsMin,
        max: selectedUnitsMax
      },
      contacts: {
        min: selectedContactsMin,
        max: selectedContactsMax
      }
    }
  };
}

function persistViewSettings() {
  if (!viewSettingsReadyToPersist || isRestoringViewSettings) return;
  writeSavedViewSettings(getCurrentViewSettings());
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

function restoreFilterSectionState(sectionSettings = {}) {
  if (!filterPanel) return;

  Array.from(filterPanel.querySelectorAll(".filter-section")).forEach((section, index) => {
    const savedCollapsed = sectionSettings[getFilterSectionStorageKey(section, index)];
    const fallbackCollapsed = defaultFilterSectionStates[index] ?? section.classList.contains("filter-section-collapsed");
    const isCollapsed = typeof savedCollapsed === "boolean" ? savedCollapsed : fallbackCollapsed;
    section.classList.toggle("filter-section-collapsed", isCollapsed);
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

function restoreSavedOptionSettings(settings) {
  updatesEnabled = Boolean(settings?.updatesEnabled);
  modifiedColumnVisible = Boolean(settings?.modifiedColumnVisible);
  reduceMotionEnabled = Boolean(settings?.reduceMotionEnabled);
  syncModeColumn();
  syncUpdatesToggleOption();
  syncUpdatesStateClass();
  syncModifiedColumnToggleOption();
  syncReduceMotionToggleOption();
  syncReduceMotionStateClass();
}

function restoreSavedFilterSelections(settings) {
  const filters = settings?.filters || {};

  selectedLocationLabels = getValidSavedSelectValues(locationFilterSelect, filters.locations?.included);
  excludedLocationLabels = getValidSavedSelectValues(locationFilterSelect, filters.locations?.excluded);
  setFilterSelectIncludedExcludedValues(locationFilterSelect, selectedLocationLabels, excludedLocationLabels);

  selectedCategoryValues = getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included);
  excludedCategoryValues = getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded);
  setFilterSelectIncludedExcludedValues(categoryFilterSelect, selectedCategoryValues, excludedCategoryValues);

  selectedOwnerIndexes = getValidSavedSelectValues(ownerFilterSelect, filters.owners?.included);
  excludedOwnerIndexes = getValidSavedSelectValues(ownerFilterSelect, filters.owners?.excluded);
  setFilterSelectIncludedExcludedValues(ownerFilterSelect, selectedOwnerIndexes, excludedOwnerIndexes);

  selectedFranchiseIndexes = getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included);
  excludedFranchiseIndexes = getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded);
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, selectedFranchiseIndexes, excludedFranchiseIndexes);

  const savedStatuses = Array.isArray(filters.statuses) ? filters.statuses : [];
  statusFilterInputs.forEach((checkbox, index) => {
    checkbox.checked = Boolean(savedStatuses[index]);
  });

  setUnitsFilterRange(
    filters.units?.min ?? unitsFilterDefaults.min,
    filters.units?.max ?? unitsFilterDefaults.max
  );
  setContactsFilterRange(
    filters.contacts?.min ?? contactsFilterDefaults.min,
    filters.contacts?.max ?? contactsFilterDefaults.max
  );
  restoreFilterSectionState(filters.sections);
  syncFilterComboboxes();
  syncStatusFilterStates();
  syncOwnerExcludeState();
  syncMapLocationFilter();
  refreshFilteredViews();
}

function setFilterPanelOpen(isOpen) {
  if (!card || !filterToggle) return;

  card.classList.toggle("is-filter-open", Boolean(isOpen));
  filterToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  syncToolbarTabState(getCurrentPanelMode());

  if (card.classList.contains("is-map-open") && getCurrentPanelMode() === "map") {
    scheduleOwnersMapResize();
  }
}

function restoreSavedPanelSettings(settings) {
  const savedLayout = PANEL_LAYOUT_CLASSES[settings?.panelLayout] ? settings.panelLayout : "right";
  setPanelLayout(savedLayout);
  setFilterPanelOpen(Boolean(settings?.filters?.open));

  const savedMode = PERSISTABLE_PANEL_MODES.has(settings?.panelMode) ? settings.panelMode : null;

  if (settings?.panelOpen === false || !savedMode) {
    closeSidebar();
    return;
  }

  lockedToolbarMode = savedMode;
  openSidebar(savedMode, savedMode === "map" ? null : getPrimarySelectedOwnerIndex());
}

function restoreSavedViewSettings() {
  isRestoringViewSettings = true;

  try {
    if (savedViewSettings) {
      restoreSavedOptionSettings(savedViewSettings);
      restoreSavedFilterSelections(savedViewSettings);
      restoreSavedPanelSettings(savedViewSettings);
    }
  } finally {
    isRestoringViewSettings = false;
    viewSettingsReadyToPersist = true;
    persistViewSettings();
  }
}

function resetViewSettings() {
  isRestoringViewSettings = true;

  try {
    removeSavedViewSettings();
    updatesEnabled = false;
    modifiedColumnVisible = false;
    reduceMotionEnabled = false;
    sortState = {
      key: "locations",
      direction: "descending"
    };
    locationSortCycleActive = false;
    lockedToolbarMode = "map";
    clearSidebarOwnerState();

    syncModeColumn();
    syncUpdatesToggleOption();
    syncUpdatesStateClass();
    syncModifiedColumnToggleOption();
    syncReduceMotionToggleOption();
    syncReduceMotionStateClass();
    clearAllFilterSelections();
    restoreFilterSectionState({});
    setPanelLayout("right");
    setFilterPanelOpen(false);
    openMapPanel("map");
    syncMapLocationFilter();
    applySort();
    toolbarDropdown?.removeAttribute("open");
    closeToolbarTabDropdowns();
  } finally {
    isRestoringViewSettings = false;
    viewSettingsReadyToPersist = true;
    persistViewSettings();
  }

  showScreenshotToast("View reset");
}
