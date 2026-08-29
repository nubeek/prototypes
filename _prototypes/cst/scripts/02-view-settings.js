const savedViewSettings = window.WefranchReload?.isHardReload ? null : readSavedViewSettings();
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

// Range sliders are bounded by the loaded roster, so a saved range only means
// the same thing while those bounds hold. When the roster changes, a range that
// spanned the old one was never a filter and must not become one.
function getRestoredRange(saved, defaults) {
  const bounds = saved?.bounds;
  if (!saved || !bounds) return defaults;

  const min = Number.isFinite(Number(saved.min)) ? Number(saved.min) : defaults.min;
  const max = Number.isFinite(Number(saved.max)) ? Number(saved.max) : defaults.max;
  if (bounds.min === defaults.min && bounds.max === defaults.max) return { min, max };
  if (min <= bounds.min && max >= bounds.max) return defaults;

  return {
    min: Math.max(min, defaults.min),
    max: Math.min(max, defaults.max)
  };
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
    savedSearchId: activeSavedSearchId,
    readerMode: readerModeActive,
    startScreen: Boolean(card?.classList.contains("is-splash-open")),
    tableView: currentTableView,
    filters: {
      open: Boolean(card?.classList.contains("is-filter-open")),
      sections: getFilterSectionSettings(),
      search: searchQuery,
      locations: {
        included: selectedLocationLabels,
        excluded: excludedLocationLabels
      },
      locationSearches: selectedLocationSearches.map((location) => ({ ...location })),
      locationSearchesExcluded: excludedLocationSearches.map((location) => ({ ...location })),
      categories: {
        included: selectedCategoryValues,
        excluded: excludedCategoryValues
      },
      franchisees: {
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
        max: selectedUnitsMax,
        bounds: unitsFilterDefaults
      },
      contacts: {
        min: selectedContactsMin,
        max: selectedContactsMax,
        bounds: contactsFilterDefaults
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
    let isCollapsed = typeof savedCollapsed === "boolean" ? savedCollapsed : fallbackCollapsed;
    if (section.id === "franchiseeRatingFilterSection") {
      isCollapsed = !franchiseeRatingFilterIsActive();
    }
    window.WefranchFilterSections.setSectionExpanded(section, !isCollapsed);
  });
}

function restoreSavedOptionSettings(settings) {
  reduceMotionEnabled = Boolean(window.wefranchReduceMotion?.isEnabled?.() || document.body.classList.contains("reduce-motion"));
  syncReduceMotionToggleOption();
  syncReduceMotionStateClass();
  refreshOwnersMapPointData();
}

function syncToolbarSearchInput() {
  if (!toolbarSearchInput) return;

  toolbarSearchInput.value = searchQuery;
  toolbarSearchInput
    .closest(".toolbar-search-btn")
    ?.classList.toggle("is-active-search", Boolean(searchQuery));

  if (toolbarSearchClear) {
    toolbarSearchClear.hidden = !searchQuery;
  }
}

function restoreSavedFilterSelections(settings) {
  const filters = settings?.filters || {};

  searchQuery = String(filters.search || "").trim().toLocaleLowerCase();
  syncToolbarSearchInput();

  setLocationFilterSelections(
    filters.locations?.included,
    filters.locations?.excluded,
    filters.locationSearches,
    filters.locationSearchesExcluded
  );

  selectedCategoryValues = getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included);
  excludedCategoryValues = getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded);
  setFilterSelectIncludedExcludedValues(categoryFilterSelect, selectedCategoryValues, excludedCategoryValues);

  selectedOwnerIndexes = getValidSavedSelectValues(ownerFilterSelect, (filters.franchisees || filters.owners)?.included);
  excludedOwnerIndexes = getValidSavedSelectValues(ownerFilterSelect, (filters.franchisees || filters.owners)?.excluded);
  setFilterSelectIncludedExcludedValues(ownerFilterSelect, selectedOwnerIndexes, excludedOwnerIndexes);

  selectedFranchiseIndexes = getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included);
  excludedFranchiseIndexes = getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded);
  setFilterSelectIncludedExcludedValues(franchiseFilterSelect, selectedFranchiseIndexes, excludedFranchiseIndexes);

  const savedStatuses = Array.isArray(filters.statuses) ? filters.statuses : [];
  statusFilterInputs.forEach((checkbox, index) => {
    checkbox.checked = Boolean(savedStatuses[index]);
  });

  const savedUnits = getRestoredRange(filters.units, unitsFilterDefaults);
  setUnitsFilterRange(savedUnits.min, savedUnits.max);
  const savedContacts = getRestoredRange(filters.contacts, contactsFilterDefaults);
  setContactsFilterRange(savedContacts.min, savedContacts.max);
  setNetWorthFilterRange(
    filters.netWorth?.min ?? netWorthFilterDefaults.min,
    filters.netWorth?.max ?? netWorthFilterDefaults.max
  );
  setFranchiseeRatingMin(filters.rating?.min);
  const savedUserLocation = filters.userLocation;
  userLocationCenter = Number.isFinite(Number(savedUserLocation?.lat))
    && Number.isFinite(Number(savedUserLocation?.lng))
    ? {
        lat: Number(savedUserLocation.lat),
        lng: Number(savedUserLocation.lng),
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
  syncRadiusFilterControls();
  restoreFilterSectionState(filters.sections);
  syncFilterComboboxes();
  syncStatusFilterStates();
  syncOwnerExcludeState();
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

function getSavedSearchById(searchId) {
  if (!searchId) return null;

  const searches = Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : [];
  return searches.find((entry) => entry.id === searchId) || null;
}

function clearCstUrlQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("search");
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    console.warn("Unable to clear saved search URL.", error);
  }
}

function shouldResetCstToSplashOnLoad() {
  return Boolean(window.WefranchReload?.isHardReload);
}

// A normal reload resumes the previous session, so the start screen only comes
// back when that session was sitting on it.
function shouldOpenCstSplashOnLoad() {
  if (typeof savedViewSettings?.startScreen === "boolean") {
    return savedViewSettings.startScreen;
  }

  // Sessions stored before the start-screen flag existed only recorded filters.
  return getAppliedFilterCount() === 0;
}

function getCstSavedSearchUrlState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const searchId = params.get("search");
    if (!searchId) return null;

    return {
      searchId,
      mode: params.get("mode") === "edit" ? "edit" : "read"
    };
  } catch (_error) {
    return null;
  }
}

function syncCstSavedSearchUrl({ searchId = activeSavedSearchId, mode = readerModeActive ? "read" : "edit" } = {}) {
  try {
    const url = new URL(window.location.href);

    if (searchId) {
      url.searchParams.set("search", searchId);
      url.searchParams.set("mode", mode);
    } else {
      url.searchParams.delete("search");
      url.searchParams.delete("mode");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    console.warn("Unable to sync saved search URL.", error);
  }
}

function clearCstSavedSearchSession({ persist = true } = {}) {
  activeSavedSearchId = null;
  readerModeSavedSearchTitle = null;
  syncCstSavedSearchUrl({ searchId: null });

  if (readerModeActive) {
    setReaderMode(false, { persist: false });
  }

  if (persist) {
    persistViewSettings();
  }
}

function persistSavedSearchSession() {
  syncCstSavedSearchUrl();
  persistViewSettings();
}

function setReaderMode(isActive, { title = null, savedSearchId = undefined, persist = true } = {}) {
  if (!card) return;

  if (savedSearchId !== undefined) {
    activeSavedSearchId = savedSearchId || null;
  }

  readerModeActive = Boolean(isActive);
  readerModeSavedSearchTitle = readerModeActive ? (title || getSavedSearchById(activeSavedSearchId)?.title || null) : null;
  card.classList.toggle("is-reader-mode", readerModeActive);
  card.classList.toggle(
    "is-owned-saved-search",
    readerModeActive && Boolean(window.cstSavedSearchStore?.canEdit?.(activeSavedSearchId))
  );

  if (readerModeActive) {
    setFilterPanelOpen(false);
    datasetSelectorApi?.close();
    if (typeof closeToolbarDropdowns === "function") {
      closeToolbarDropdowns();
    }
  }
  if (filterPanel) {
    filterPanel.inert = readerModeActive;
  }

  updateTableHeading();
  window.syncSiteHeaderBreadcrumb?.();

  if (persist) {
    persistSavedSearchSession();
  }
}

function exitReaderMode({ expandSection = null } = {}) {
  if (!readerModeActive) return;
  setReaderMode(false, { persist: false });
  setFilterPanelOpen(true);

  if (expandSection) {
    expandCstFilterSectionOnly?.(expandSection);
  } else {
    expandCstSplashFilterSections?.();
  }

  persistSavedSearchSession();
}

function restoreSavedPanelSettings(settings) {
  const savedLayout = PANEL_LAYOUT_CLASSES[settings?.panelLayout] ? settings.panelLayout : "right";
  setPanelLayout(savedLayout);
  const filtersOpen = settings?.filters?.open;
  setFilterPanelOpen(typeof filtersOpen === "boolean" ? filtersOpen : true);

  const savedMode = PERSISTABLE_PANEL_MODES.has(settings?.panelMode) ? settings.panelMode : null;

  if (settings?.panelOpen === false || !savedMode) {
    closeSidebar();
    return;
  }

  lockedToolbarMode = savedMode;
  if (card?.classList.contains("is-splash-open")) return;
  openSidebar(savedMode, savedMode === "map" ? null : getPrimarySelectedOwnerIndex());
}

function restoreSavedViewSettings() {
  isRestoringViewSettings = true;

  try {
    if (savedViewSettings) {
      // Keep the saved-search session until splash restore applies read/edit
      // mode. Persisting here with empty session fields would drop the id and
      // force the next load into a filter-only edit workspace.
      activeSavedSearchId = savedViewSettings.savedSearchId || null;
      setMainTableView(savedViewSettings.tableView);
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
    reduceMotionEnabled = Boolean(window.wefranchReduceMotion?.isEnabled?.() || document.body.classList.contains("reduce-motion"));
    sortState = {
      columns: [{ key: "locations", direction: "descending" }]
    };
    lockedToolbarMode = null;
    clearSidebarOwnerState();
    clearCstSavedSearchSession({ persist: false });

    syncReduceMotionToggleOption();
    syncReduceMotionStateClass();
    refreshOwnersMapPointData();
    clearAllFilterSelections();
    restoreFilterSectionState({});
    setPanelLayout("right");
    setFilterPanelOpen(true);
    closeSidebar();
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
