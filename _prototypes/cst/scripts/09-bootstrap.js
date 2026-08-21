sortHeaders.forEach((header) => {
  header.addEventListener("click", (event) => {
    const { sortKey } = header.dataset;
    if (!sortKey) return;

    cycleSortState(sortKey, { additive: event.metaKey || event.ctrlKey });

    if (isDatasetTableView()) {
      locationsVisibleCount = LOCATION_TABLE_PAGE_SIZE;
    }
    applySort();
    tableWrap.scrollTo({ top: 0, behavior: "auto" });
  });
});

initDatasetSelector();

if (toolbarView) {
  toolbarView.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(".toolbar-view-btn[data-table-view]");
    if (!button) return;

    event.preventDefault();
    setMainTableView(button.dataset.tableView);
  });
}

syncColumnWidths();
syncReduceMotionToggleOption();
syncReduceMotionStateClass();
setPanelLayout("right");
setFilterPanelOpen(true);
applySort();

if (tableBody) {
  tableBody.addEventListener("change", (event) => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains("location-row-checkbox")) return;

    const rowId = checkbox.dataset.locationRowId;
    if (rowId) {
      if (checkbox.checked) {
        selectedLocationRowIds.add(rowId);
      } else {
        selectedLocationRowIds.delete(rowId);
      }

      checkbox.closest("tr[data-location-row-id]")?.classList.toggle("is-checked", checkbox.checked);
      syncLocationHeaderCheckboxState(displayedLocations);
      return;
    }

    const ownerIndex = Number(checkbox.dataset.ownerIndex);
    if (!Number.isFinite(ownerIndex)) return;

    if (checkbox.checked) {
      selectedFranchiseeIndexes.add(ownerIndex);
    } else {
      selectedFranchiseeIndexes.delete(ownerIndex);
    }

    checkbox.closest("tr[data-owner-index]")?.classList.toggle("is-checked", checkbox.checked);
    syncFranchiseeHeaderCheckboxState(displayedFranchisees);
  });

  tableBody.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const locationRowSelect = event.target.closest(".location-row-select");
    if (locationRowSelect) {
      event.stopPropagation();
      return;
    }

    const locationLoadMoreRow = event.target.closest("[data-location-load-more]");
    if (locationLoadMoreRow) {
      event.stopPropagation();
      loadMoreLocationRows();
      return;
    }

    const locationButton = event.target.closest(".locations");
    if (locationButton) {
      event.stopPropagation();
      toggleRowSidebarView("map", Number(locationButton.dataset.ownerIndex), { scrollTable: true });
      return;
    }

    const contactsButton = event.target.closest(".contacts-action");
    if (contactsButton) {
      event.stopPropagation();
      toggleRowSidebarView("raw", Number(contactsButton.dataset.ownerIndex), { scrollTable: true });
      return;
    }

    const prospectAddLeadButton = event.target.closest(".prospect-add-lead-action");
    if (prospectAddLeadButton) {
      event.stopPropagation();
      const prospectRowKey = prospectAddLeadButton.dataset.prospectRowKey;
      if (!prospectRowKey) return;
      handleSaveLeadAction(prospectAddLeadButton, null, null, prospectRowKey);
      return;
    }

    const prospectHideButton = event.target.closest(".prospect-hide-results-action");
    if (prospectHideButton) {
      event.stopPropagation();
      const prospectRowKey = prospectHideButton.dataset.prospectRowKey;
      const row = prospectRowKey ? getProspectRowByStateKey(prospectRowKey) : null;
      if (!row) return;
      toggleProspectRowHidden(row);
      refreshContactStateViews();
      return;
    }

    const addLeadButton = event.target.closest(".contact-add-lead-action");
    if (addLeadButton) {
      event.stopPropagation();
      const ownerIndex = Number(addLeadButton.dataset.ownerIndex);
      const nodeId = addLeadButton.dataset.nodeId ?? null;
      handleSaveLeadAction(addLeadButton, ownerIndex, nodeId);
      return;
    }

    const hideResultsButton = event.target.closest(".contact-hide-results-action");
    if (hideResultsButton) {
      event.stopPropagation();
      const ownerIndex = Number(hideResultsButton.dataset.ownerIndex);
      if (!Number.isFinite(ownerIndex)) return;

      if (hideResultsButton.classList.contains("is-hidden")) {
        hiddenContactOwnerIndexes.delete(ownerIndex);
      } else {
        hiddenContactOwnerIndexes.add(ownerIndex);
      }
      refreshContactStateViews();
      return;
    }

    const contactProfileButton = event.target.closest(".contact-profile-action");
    if (contactProfileButton) {
      event.stopPropagation();
      const ownerIndex = Number(contactProfileButton.dataset.ownerIndex);
      const unitIndex = Number(contactProfileButton.dataset.unitIndex);
      openPersonProfile(
        Number.isFinite(unitIndex)
          ? getPersonProfileFromUnitRow(ownerIndex, unitIndex)
          : getPersonProfileFromOwnerContact(ownerIndex),
        contactProfileButton
      );
      return;
    }

    const ownerIconLink = event.target.closest(".owner-icon-link");
    if (ownerIconLink) {
      event.stopPropagation();
      return;
    }

    const locationRow = event.target.closest("tr[data-owner-index][data-unit-index]");
    if (currentTableView === "locations" && locationRow) {
      event.stopPropagation();
      const ownerIndex = Number(locationRow.dataset.ownerIndex);
      const unitIndex = Number(locationRow.dataset.unitIndex);
      openPersonProfile(getPersonProfileFromUnitRow(ownerIndex, unitIndex), locationRow);
      return;
    }

    const row = event.target.closest("tr[data-owner-index]");
    if (!row) return;

    const ownerIndex = Number(row.dataset.ownerIndex);
    const owner = owners.find((item) => item.originalIndex === ownerIndex);
    if (!owner) return;

    const rowSidebarMode = lockedToolbarMode === "map" || lockedToolbarMode === "org"
      ? lockedToolbarMode
      : "raw";
    if (rowSidebarMode === "raw" && !isRawDataAvailable(owner)) return;

    toggleRowSidebarView(rowSidebarMode, ownerIndex);
  });

  tableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!(event.target instanceof Element)) return;

    const locationLoadMoreRow = event.target.closest("[data-location-load-more]");
    if (!locationLoadMoreRow) return;

    event.preventDefault();
    loadMoreLocationRows();
  });
}

if (franchiseesTable) {
  franchiseesTable.addEventListener("change", (event) => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains("location-select-all-checkbox")) return;

    const shouldSelect = checkbox.checked;

    if (isDatasetTableView()) {
      displayedLocations.forEach((row) => {
        if (shouldSelect) {
          selectedLocationRowIds.add(row.id);
        } else {
          selectedLocationRowIds.delete(row.id);
        }
      });

      renderLocations(displayedLocations);
      syncSortHeaders();
      return;
    }

    displayedFranchisees.forEach((owner) => {
      if (shouldSelect) {
        selectedFranchiseeIndexes.add(owner.originalIndex);
      } else {
        selectedFranchiseeIndexes.delete(owner.originalIndex);
      }
    });

    renderFranchisees(displayedFranchisees);
    syncSortHeaders();
  });
}

if (filterPanel) {
  window.WefranchFilterSections.enhanceHeaders(filterPanel, {
    iconSrc: "../shared/filter/assets/remove.svg",
    onClear: clearFilterSection
  });
  window.WefranchFilterSections.bindCollapseToggle(filterPanel, {
    onToggle: () => persistViewSettings()
  });
}

window.WefranchFilterCombobox.bindOutsideClick((event) => {
  if (datasetSelectorField && !datasetSelectorField.contains(event.target)) {
    datasetSelectorApi?.close();
  }
});

filterLocationSearchControl = window.cstLocationSearch?.bind({
  variant: "filter",
  field: locationFilterSearchField,
  menu: document.getElementById("locationFilterSearchMenu"),
  input: document.getElementById("locationFilterSearchInput"),
  suggestions: document.getElementById("locationFilterSearchSuggestions"),
  clearButton: document.getElementById("locationFilterSearchClear"),
  feedback: document.getElementById("locationFilterSearchFeedback"),
  suggestionPrefix: "locationFilterSearchSuggestion",
  onInclude: applyLocationInclude,
  onExclude: applyLocationExclude,
  onClear: () => {
    clearLocationFilterState();
    refreshLocationFilterResults();
  }
});
syncFilterLocationSearchUI();

if (ownerFilterSelect) {
  owners.forEach((owner) => {
    const option = document.createElement("option");
    option.value = String(owner.originalIndex);
    option.textContent = owner.ownerName;
    ownerFilterSelect.append(option);
  });

  ownerFilterSelect.addEventListener("change", () => {
    selectedOwnerIndexes = getFilterSelectIncludedValues(ownerFilterSelect);
    excludedOwnerIndexes = getFilterSelectExcludedValues(ownerFilterSelect);
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncOwnerExcludeState();
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });

  enhanceFilterCombobox(ownerFilterSelect, { allowExclude: true });
}

if (categoryFilterSelect) {
  const prospectCategoryNames = Object.values(window.prospectDatasetsData || {})
    .flatMap((dataset) => dataset.rows || [])
    .map((row) => row.category)
    .map(normalizeDatasetCellValue)
    .filter(Boolean);
  const categoryNames = [
    ...new Set([
      "Children Programs",
      "Education & Children",
      "Home and Building Services",
      "Food and Beverage",
      "Retail Products and Services",
      "Professional Business Services",
      "Health & Wellness",
      "Fitness",
      ...prospectCategoryNames
    ])
  ];

  categoryFilterSelect.disabled = false;

  categoryNames.forEach((categoryName) => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    categoryFilterSelect.append(option);
  });

  categoryFilterSelect.addEventListener("change", () => {
    selectedCategoryValues = getFilterSelectIncludedValues(categoryFilterSelect);
    excludedCategoryValues = getFilterSelectExcludedValues(categoryFilterSelect);
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });

  enhanceFilterCombobox(categoryFilterSelect, { allowExclude: true });
}

statusFilterInputs.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    setFilterCheckboxState(checkbox, checkbox.checked);
    updateClearFiltersButton();
  });
});

getFranchiseeRatingRadios().forEach((radio) => {
  radio.addEventListener("change", () => {
    setFranchiseeRatingMin(radio.value, { refresh: true });
  });
});

if (unitsMinRange) {
  unitsMinRange.addEventListener("input", () => {
    setUnitsFilterRange(unitsMinRange.value, selectedUnitsMax, { changed: "min", refresh: true });
  });
}

if (unitsMaxRange) {
  unitsMaxRange.addEventListener("input", () => {
    setUnitsFilterRange(selectedUnitsMin, unitsMaxRange.value, { changed: "max", refresh: true });
  });
}

if (unitsMinInput) {
  unitsMinInput.addEventListener("change", () => {
    setUnitsFilterRange(unitsMinInput.value, selectedUnitsMax, { changed: "min", refresh: true });
  });
}

if (unitsMaxInput) {
  unitsMaxInput.addEventListener("change", () => {
    setUnitsFilterRange(selectedUnitsMin, unitsMaxInput.value, { changed: "max", refresh: true });
  });
}

if (contactsMinRange) {
  contactsMinRange.addEventListener("input", () => {
    setContactsFilterRange(contactsMinRange.value, selectedContactsMax, { changed: "min", refresh: true });
  });
}

if (contactsMaxRange) {
  contactsMaxRange.addEventListener("input", () => {
    setContactsFilterRange(selectedContactsMin, contactsMaxRange.value, { changed: "max", refresh: true });
  });
}

if (contactsMinInput) {
  contactsMinInput.addEventListener("change", () => {
    setContactsFilterRange(contactsMinInput.value, selectedContactsMax, { changed: "min", refresh: true });
  });
}

if (contactsMaxInput) {
  contactsMaxInput.addEventListener("change", () => {
    setContactsFilterRange(selectedContactsMin, contactsMaxInput.value, { changed: "max", refresh: true });
  });
}

if (netWorthMinRange) {
  netWorthMinRange.addEventListener("input", () => {
    setNetWorthFilterRange(netWorthMinRange.value, selectedNetWorthMax, { changed: "min", refresh: true });
  });
}

if (netWorthMaxRange) {
  netWorthMaxRange.addEventListener("input", () => {
    setNetWorthFilterRange(selectedNetWorthMin, netWorthMaxRange.value, { changed: "max", refresh: true });
  });
}

if (netWorthMinInput) {
  netWorthMinInput.addEventListener("change", () => {
    setNetWorthFilterRange(getFilterNumberInputValue(netWorthMinInput), selectedNetWorthMax, { changed: "min", refresh: true });
  });
}

if (netWorthMaxInput) {
  netWorthMaxInput.addEventListener("change", () => {
    setNetWorthFilterRange(selectedNetWorthMin, getFilterNumberInputValue(netWorthMaxInput), { changed: "max", refresh: true });
  });
}

if (radiusToggle) {
  radiusToggle.addEventListener("change", () => {
    setRadiusFilterEnabled(radiusToggle.checked, { refresh: true });
  });
}

initRadiusFilterControls();

syncStatusFilterStates();
syncUnitsFilterControls();
syncContactsFilterControls();
syncNetWorthFilterControls();
setFranchiseeRatingMin(selectedFranchiseeRatingMin);
syncRadiusFilterControls();
renderFilterHistograms();
updateFilterSectionClearButtons();

searchWithinLocation?.addEventListener("click", () => {
  locateUserFromFilters();
});

if (clearAllFilters) {
  clearAllFilters.addEventListener("click", clearAllFilterSelections);
}

if (franchiseFilterSelect) {
  const prospectFranchiseNames = Object.values(window.prospectDatasetsData || {})
    .flatMap((dataset) => dataset.rows || [])
    .flatMap((row) => getDatasetValueList(row.franchise));
  const franchiseNames = [
    ...new Set([
      ...owners.flatMap((owner) => getOwnerFranchises(owner)),
      ...prospectFranchiseNames
    ])
  ].sort((a, b) => collator.compare(a, b));

  franchiseNames.forEach((franchiseName) => {
    const option = document.createElement("option");
    option.value = franchiseName;
    option.textContent = franchiseName;
    franchiseFilterSelect.append(option);
  });

  franchiseFilterSelect.addEventListener("change", () => {
    selectedFranchiseIndexes = getFilterSelectIncludedValues(franchiseFilterSelect);
    excludedFranchiseIndexes = getFilterSelectExcludedValues(franchiseFilterSelect);
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });

  enhanceFilterCombobox(franchiseFilterSelect, { allowExclude: true });
}

restoreSavedViewSettings();

if (filterToggle && card) {
  filterToggle.addEventListener("click", () => {
    setFilterPanelOpen(!card.classList.contains("is-filter-open"));
  });
}

if (readerEditQueryBtn) {
  readerEditQueryBtn.addEventListener("click", () => {
    exitReaderMode();
  });
}

if (tableHeadingSummary) {
  tableHeadingSummary.addEventListener("click", (event) => {
    const filterTrigger = event.target.closest(".table-heading-summary__value[data-filter-section]");
    if (!filterTrigger) return;

    const sectionKey = filterTrigger.dataset.filterSection;
    if (!sectionKey) return;

    if (readerModeActive) {
      exitReaderMode({ expandSection: sectionKey });
      return;
    }

    setFilterPanelOpen(true);
    expandCstFilterSectionOnly?.(sectionKey);
  });
}

if (toolbarSearchInput) {
  const searchField = toolbarSearchInput.closest(".toolbar-search-btn");
  toolbarSearchInput.addEventListener("input", () => {
    searchQuery = toolbarSearchInput.value.trim().toLocaleLowerCase();
    searchField?.classList.toggle("is-active-search", Boolean(searchQuery));
    if (toolbarSearchClear) {
      toolbarSearchClear.hidden = !searchQuery;
    }
    activeMapOwnerIndex = null;
    activeOrgOwnerIndex = null;
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    syncOpenOrgPanelWithSelection();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });

  if (toolbarSearchClear) {
    toolbarSearchClear.addEventListener("click", () => {
      toolbarSearchInput.value = "";
      toolbarSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      toolbarSearchInput.focus();
    });
  }
}

if (mapToggle && card) {
  mapToggle.addEventListener("click", () => handleToolbarTabClick("map"));
}

if (contactsToggle) {
  contactsToggle.addEventListener("click", () => handleToolbarTabClick("raw"));
}

if (orgChartToggle && card) {
  orgChartToggle.addEventListener("click", () => handleToolbarTabClick("org"));
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

    handleSidebarClose();
  });
}

if (ownerDetailsPanel) {
  ownerDetailsPanel.addEventListener("scroll", syncOwnerHeaderScrollState);

  ownerDetailsPanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const viewButton = event.target.closest(".owner-header-view-btn");
    if (viewButton) {
      handleOwnerHeaderViewButton(viewButton);
      return;
    }

    const loadMoreRow = event.target.closest("[data-raw-load-more]");
    if (loadMoreRow) {
      loadMoreRawDataRows(loadMoreRow.dataset.rawLoadMore);
      return;
    }

    const rawLeadButton = event.target.closest(".raw-data-row .contact-add-lead-action");
    if (rawLeadButton) {
      event.stopPropagation();
      const ownerIndex = Number(rawLeadButton.dataset.ownerIndex);
      const nodeId = rawLeadButton.dataset.nodeId ?? null;
      handleSaveLeadAction(rawLeadButton, ownerIndex, nodeId);
      return;
    }

    const rawHideButton = event.target.closest(".raw-data-row .contact-hide-results-action");
    if (rawHideButton) {
      event.stopPropagation();
      const ownerIndex = Number(rawHideButton.dataset.ownerIndex);
      const nodeId = rawHideButton.dataset.nodeId ?? null;
      if (Number.isFinite(ownerIndex)) {
        toggleContactHidden(ownerIndex, nodeId);
        refreshContactStateViews();
      }
      return;
    }

    const rawRow = event.target.closest(".raw-data-row[data-owner-index][data-raw-row-index]");
    if (rawRow) {
      const ownerIndex = Number(rawRow.dataset.ownerIndex);
      const rowIndex = Number(rawRow.dataset.rawRowIndex);
      openPersonProfile(getPersonProfileFromRawRow(ownerIndex, rowIndex), rawRow);
      return;
    }

    const rawUnitRow = event.target.closest(".raw-unit-row[data-owner-index][data-unit-row-index]");
    if (rawUnitRow) {
      const ownerIndex = Number(rawUnitRow.dataset.ownerIndex);
      const unitIndex = Number(rawUnitRow.dataset.unitRowIndex);
      openPersonProfile(getPersonProfileFromUnitRow(ownerIndex, unitIndex), rawUnitRow);
      return;
    }

    const ownerAction = event.target.closest(".owner-header-owner-action");
    if (ownerAction) {
      openOwnerDetailsFromHeader(Number(ownerAction.dataset.ownerIndex));
      return;
    }

    const closeButton = event.target.closest(".owner-detail-close");
    if (closeButton) {
      handleSidebarClose();
      return;
    }

    const mapLink = event.target.closest(".owner-detail-map-link");
    if (mapLink) {
      toggleRowSidebarView("map", Number(mapLink.dataset.ownerIndex));
      return;
    }

    const detailLeadButton = event.target.closest(".owner-detail-contact-lead-action");
    if (detailLeadButton) {
      const ownerIndex = Number(detailLeadButton.dataset.ownerIndex);
      handleSaveLeadAction(detailLeadButton, ownerIndex);
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

    const loadMoreRow = event.target.closest("[data-raw-load-more]");
    if (loadMoreRow) {
      event.preventDefault();
      loadMoreRawDataRows(loadMoreRow.dataset.rawLoadMore);
      return;
    }

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

if (reduceMotionToggleOption) {
  reduceMotionToggleOption.addEventListener("click", () => {
    reduceMotionEnabled = !reduceMotionEnabled;
    syncReduceMotionToggleOption();
    syncReduceMotionStateClass();
    persistViewSettings();
  });
}

if (takeScreenshotOption) {
  takeScreenshotOption.addEventListener("click", () => {
    closeToolbarSubmenus();
    takeViewportScreenshot();
  });
}

if (resetViewOption) {
  resetViewOption.addEventListener("click", () => {
    closeToolbarSubmenus();
    resetViewSettings();
  });
}

const CREATE_TARGET_MODAL_CLOSE_DURATION_MS = 320;
const CREATE_TARGET_ALERT_TOGGLE_DELAY_MS = 180;
let createTargetModalCloseTimeoutId = null;
let createTargetAlertsOpenTimeoutId = null;
let editingSavedSearchId = null;
let pendingCreateTargetAlerts = null;
let createTargetAlertsPreviewEnabled = false;

function normalizeCreateTargetAlerts(alerts) {
  if (!alerts?.enabled) return null;

  return {
    enabled: true,
    notifyAdded: Boolean(alerts.notifyAdded),
    notifyModified: Boolean(alerts.notifyModified)
  };
}

function getCreateTargetAlertsHelperText() {
  if (!pendingCreateTargetAlerts) {
    return "Get notified when this view's data changes";
  }
  if (pendingCreateTargetAlerts.notifyAdded && pendingCreateTargetAlerts.notifyModified) {
    return "New and modified matching data";
  }
  if (pendingCreateTargetAlerts.notifyAdded) {
    return "New matching data";
  }
  if (pendingCreateTargetAlerts.notifyModified) {
    return "Modified matching data";
  }
  return "Alerts on";
}

function syncCreateTargetAlertsState() {
  const isEnabled = Boolean(
    pendingCreateTargetAlerts?.enabled || createTargetAlertsPreviewEnabled
  );
  createTargetAlertsRow?.classList.toggle("is-enabled", isEnabled);
  createTargetAlertsToggle?.setAttribute("aria-checked", String(isEnabled));
  createTargetAlertsToggle?.setAttribute(
    "aria-label",
    isEnabled ? "Disable alerts" : "Enable alerts"
  );
  if (createTargetAlertsHelper) {
    createTargetAlertsHelper.textContent = getCreateTargetAlertsHelperText();
  }
  if (createTargetAlertsEdit) {
    createTargetAlertsEdit.hidden = !(isEnabled && pendingCreateTargetAlerts?.enabled);
  }
}

function openCreateTargetAlertsModal(trigger) {
  window.cstViewAlertModal?.open?.(trigger, {
    settings: pendingCreateTargetAlerts,
    onConfirm(settings) {
      createTargetAlertsPreviewEnabled = false;
      pendingCreateTargetAlerts = normalizeCreateTargetAlerts(settings);
      syncCreateTargetAlertsState();
    },
    onCancel() {
      createTargetAlertsPreviewEnabled = false;
      syncCreateTargetAlertsState();
    }
  });
}

function animateCreateTargetAlertsOn(trigger) {
  if (createTargetAlertsOpenTimeoutId) {
    window.clearTimeout(createTargetAlertsOpenTimeoutId);
  }

  createTargetAlertsPreviewEnabled = true;
  syncCreateTargetAlertsState();
  createTargetAlertsOpenTimeoutId = window.setTimeout(() => {
    createTargetAlertsOpenTimeoutId = null;
    if (!createTargetModal || createTargetModal.hidden || pendingCreateTargetAlerts?.enabled) {
      return;
    }
    openCreateTargetAlertsModal(trigger);
  }, CREATE_TARGET_ALERT_TOGGLE_DELAY_MS);
}

function finalizeCreateTargetModalClose() {
  if (!createTargetModal) return;

  if (createTargetAlertsOpenTimeoutId) {
    window.clearTimeout(createTargetAlertsOpenTimeoutId);
    createTargetAlertsOpenTimeoutId = null;
  }
  createTargetModal.classList.remove("is-open", "is-closing");
  createTargetModal.hidden = true;
  createTargetForm?.reset();
  createTargetModalCloseTimeoutId = null;
  editingSavedSearchId = null;
  pendingCreateTargetAlerts = null;
  createTargetAlertsPreviewEnabled = false;
  syncCreateTargetAlertsState();

  if (lastCreateTargetTrigger instanceof HTMLElement) {
    if (lastCreateTargetTrigger.classList.contains("target-settings")) {
      lastCreateTargetTrigger.blur();
      lastCreateTargetTrigger.closest(".target-card")?.blur();
    } else {
      lastCreateTargetTrigger.focus({ preventScroll: true });
    }
  }
  lastCreateTargetTrigger = null;
}

function openCreateTargetModal(trigger = null, { savedSearch = null } = {}) {
  if (!createTargetModal) return;
  if (savedSearch?.id && !window.cstSavedSearchStore?.canEdit?.(savedSearch.id)) return;

  if (createTargetModalCloseTimeoutId) {
    window.clearTimeout(createTargetModalCloseTimeoutId);
    createTargetModalCloseTimeoutId = null;
  }
  if (createTargetAlertsOpenTimeoutId) {
    window.clearTimeout(createTargetAlertsOpenTimeoutId);
    createTargetAlertsOpenTimeoutId = null;
  }

  lastCreateTargetTrigger = trigger;
  editingSavedSearchId = savedSearch?.id || null;
  pendingCreateTargetAlerts = normalizeCreateTargetAlerts(savedSearch?.alerts);
  createTargetAlertsPreviewEnabled = false;
  createTargetForm?.reset();
  createTargetTitleInput?.setCustomValidity("");
  if (createTargetModalTitle) {
    createTargetModalTitle.textContent = editingSavedSearchId ? "Edit view" : "Save view";
  }
  if (deleteSavedViewBtn) {
    deleteSavedViewBtn.hidden = !editingSavedSearchId;
  }
  createTargetModal.querySelector(".target-modal-close")?.setAttribute(
    "aria-label",
    editingSavedSearchId ? "Close edit view" : "Close save view"
  );

  if (savedSearch) {
    if (createTargetTitleInput) createTargetTitleInput.value = savedSearch.title || "";
    if (createTargetDescriptionInput) {
      createTargetDescriptionInput.value = savedSearch.description || "";
    }
    if (createTargetVisibilitySelect) {
      createTargetVisibilitySelect.value = savedSearch.scope || "private";
    }
  } else if (createTargetTitleInput) {
    createTargetTitleInput.value = getSuggestedSavedViewTitle();
  }
  syncCreateTargetAlertsState();

  createTargetModal.classList.remove("is-closing");
  createTargetModal.hidden = false;
  createTargetModal.classList.remove("is-open");

  window.requestAnimationFrame(() => {
    if (!createTargetModal || createTargetModal.hidden) return;
    createTargetModal.classList.add("is-open");
    createTargetTitleInput?.focus({ preventScroll: true });
  });
}

function closeCreateTargetModal() {
  if (!createTargetModal || createTargetModal.hidden) return;

  if (createTargetAlertsOpenTimeoutId) {
    window.clearTimeout(createTargetAlertsOpenTimeoutId);
    createTargetAlertsOpenTimeoutId = null;
    createTargetAlertsPreviewEnabled = false;
    syncCreateTargetAlertsState();
  }
  if (createTargetModalCloseTimeoutId) {
    window.clearTimeout(createTargetModalCloseTimeoutId);
  }

  createTargetModal.classList.remove("is-open");
  createTargetModal.classList.add("is-closing");
  createTargetModalCloseTimeoutId = window.setTimeout(
    finalizeCreateTargetModalClose,
    CREATE_TARGET_MODAL_CLOSE_DURATION_MS
  );
}

window.openCreateTargetModal = openCreateTargetModal;

if (createTargetOption) {
  createTargetOption.addEventListener("click", (event) => {
    event.preventDefault();
    openCreateTargetModal(createTargetOption);
  });
}

if (readerViewSettingsBtn) {
  readerViewSettingsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const savedSearch = getSavedSearchById(activeSavedSearchId);
    if (!savedSearch || !window.cstSavedSearchStore?.canEdit?.(savedSearch.id)) return;

    openCreateTargetModal(readerViewSettingsBtn, { savedSearch });
  });
}

function toggleCreateTargetAlerts(trigger) {
  if (pendingCreateTargetAlerts?.enabled || createTargetAlertsPreviewEnabled) {
    if (createTargetAlertsOpenTimeoutId) {
      window.clearTimeout(createTargetAlertsOpenTimeoutId);
      createTargetAlertsOpenTimeoutId = null;
    }
    pendingCreateTargetAlerts = null;
    createTargetAlertsPreviewEnabled = false;
    syncCreateTargetAlertsState();
    return;
  }

  animateCreateTargetAlertsOn(trigger);
}

createTargetAlertsRow?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("#createTargetAlertsEdit")) return;

  const trigger = event.target.closest("#createTargetAlertsToggle, #createTargetAlertsDetails") || createTargetAlertsRow;
  toggleCreateTargetAlerts(trigger);
});

createTargetAlertsEdit?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!pendingCreateTargetAlerts?.enabled) return;
  openCreateTargetAlertsModal(createTargetAlertsEdit);
});

if (createTargetModal) {
  createTargetModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const closeControl = event.target.closest(".target-modal-close, .target-modal-cancel");
    if (closeControl || event.target === createTargetModal) {
      closeCreateTargetModal();
    }
  });
}

if (createTargetForm) {
  createTargetForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(createTargetForm);
    const title = String(formData.get("title") || "").trim();
    createTargetTitleInput?.setCustomValidity(title ? "" : "Enter a title.");
    if (!createTargetForm.reportValidity()) return;

    const viewDetails = {
      title,
      description: String(formData.get("description") || "").trim(),
      visibility: String(formData.get("visibility") || "private"),
      alerts: pendingCreateTargetAlerts
        ? { ...pendingCreateTargetAlerts }
        : null
    };
    const savedSearch = editingSavedSearchId
      ? window.cstSplash?.updateSavedView?.(editingSavedSearchId, viewDetails)
      : window.cstSplash?.saveCurrentView?.(viewDetails);
    if (!savedSearch) {
      createTargetTitleInput?.setCustomValidity("This view could not be saved. Please try again.");
      createTargetForm.reportValidity();
      return;
    }

    const wasEditing = Boolean(editingSavedSearchId);
    const wasEditingFromSplash = lastCreateTargetTrigger?.classList?.contains("target-settings");
    closeCreateTargetModal();
    if (wasEditing) {
      if (!wasEditingFromSplash) {
        setReaderMode(true, {
          title: savedSearch.title,
          savedSearchId: savedSearch.id
        });
      }
      return;
    }

    window.setTimeout(() => {
      window.cstSplash?.revealSavedSearch?.(savedSearch);
    }, CREATE_TARGET_MODAL_CLOSE_DURATION_MS);
  });
}

deleteSavedViewBtn?.addEventListener("click", () => {
  if (!editingSavedSearchId) return;

  const deletedSearch = window.cstSplash?.deleteSavedView?.(editingSavedSearchId);
  if (!deletedSearch) {
    createTargetTitleInput?.setCustomValidity("This view could not be deleted. Please try again.");
    createTargetForm?.reportValidity();
    return;
  }

  closeCreateTargetModal();
  window.setTimeout(() => {
    window.cstSplash?.revealDeletedSearch?.(deletedSearch);
  }, CREATE_TARGET_MODAL_CLOSE_DURATION_MS);
});

createTargetTitleInput?.addEventListener("input", () => {
  createTargetTitleInput.setCustomValidity("");
});

function setToolbarSubmenuOpen(submenu, trigger, isOpen) {
  if (!submenu || !trigger) return;

  submenu.classList.toggle("is-open", isOpen);
  trigger.setAttribute("aria-expanded", String(isOpen));
}

function closeToolbarSubmenu(submenu, trigger) {
  setToolbarSubmenuOpen(submenu, trigger, false);
}

function closeToolbarSubmenus() {
  closeToolbarSubmenu(toolbarSettingsSubmenu, toolbarSettingsSubmenuTrigger);
}

function closeToolbarDropdowns(exceptDropdown = null) {
  toolbarDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) return;
    dropdown.removeAttribute("open");
  });
}

function bindToolbarSubmenu(submenu, trigger) {
  if (!submenu || !trigger) return;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setToolbarSubmenuOpen(submenu, trigger, true);
  });

  submenu.addEventListener("mouseenter", () => {
    setToolbarSubmenuOpen(submenu, trigger, true);
  });

  submenu.addEventListener("mouseleave", () => {
    closeToolbarSubmenu(submenu, trigger);
  });

  submenu.addEventListener("focusin", () => {
    setToolbarSubmenuOpen(submenu, trigger, true);
  });

  submenu.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && submenu.contains(event.relatedTarget)) return;
    closeToolbarSubmenu(submenu, trigger);
  });
}

bindToolbarSubmenu(toolbarSettingsSubmenu, toolbarSettingsSubmenuTrigger);

if (toolbarDropdowns.length) {
  document.addEventListener("click", (event) => {
    const openDropdown = toolbarDropdowns.find((dropdown) => dropdown.open);
    if (!openDropdown) return;

    if (openDropdown.contains(event.target)) {
      closeToolbarDropdowns(openDropdown);
      if (
        openDropdown === toolbarDropdown &&
        !toolbarSettingsSubmenu?.contains(event.target)
      ) {
        closeToolbarSubmenus();
      }
      return;
    }

    closeToolbarSubmenus();
    closeToolbarDropdowns();
  });
}

if (toolbarTabItems.length) {
  toolbarTabItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;

      const layoutOption = event.target.closest(".toolbar-tab-layout-option[data-layout]");
      if (layoutOption) {
        event.preventDefault();
        setPanelLayout(layoutOption.dataset.layout);
        return;
      }

      const hidePanelOption = event.target.closest(".toolbar-tab-hide-panel-option");
      if (!hidePanelOption) return;

      event.preventDefault();
      closeToolbarTabDropdowns();
      closeSidebar();
    });

    item.addEventListener("mouseenter", () => {
      scheduleToolbarTabDropdownOpen(item);
    });

    item.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(".segmented-control-btn")) return;
      if (!event.isTrusted) return;

      window.setTimeout(() => {
        if (!item.matches(":hover")) return;
        scheduleToolbarTabDropdownOpen(item);
      }, 0);
    });

    item.addEventListener("mouseleave", () => {
      clearToolbarTabOpenTimeout(item);
      if (!item.classList.contains("is-open")) return;

      clearToolbarTabCloseTimeout(item);
      const timeoutId = window.setTimeout(() => {
        toolbarTabCloseTimeoutByItem.delete(item);
        if (!item.matches(":hover")) {
          item.classList.remove("is-open");
        }
      }, TOOLBAR_TAB_DROPDOWN_CLOSE_DELAY_MS);
      toolbarTabCloseTimeoutByItem.set(item, timeoutId);
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".toolbar-tab-item")) return;
    closeToolbarTabDropdowns();
  });
}

if (tableWrap) {
  tableWrap.addEventListener("scroll", syncStickyNameColumnDivider, { passive: true });
  window.addEventListener("resize", syncStickyNameColumnDivider);
  window.addEventListener("resize", syncOwnerRawTableDividers);
  syncStickyNameColumnDivider();
}

if (saveLeadModal) {
  saveLeadModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const noteToggle = event.target.closest(".save-lead-note-toggle");
    if (noteToggle) {
      toggleSaveLeadNoteField();
      return;
    }

    const closeControl = event.target.closest(".save-lead-modal-close, .save-lead-modal-cancel");
    if (closeControl || event.target === saveLeadModal) {
      saveLeadListSelectorApi?.close();
      closeSaveLeadModal();
    }
  });

  saveLeadModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmSaveLeadFromModal();
  });
}

if (profileModal) {
  profileModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const saveLeadButton = event.target.closest(".profile-modal-primary");
    if (saveLeadButton) {
      const ownerIndex = Number(profileModal.dataset.ownerIndex);
      if (Number.isFinite(ownerIndex)) {
        const nodeId = profileModal.dataset.nodeId ?? null;
        if (saveLeadButton.classList.contains("is-saved")) {
          setContactLeadSaved(ownerIndex, nodeId, false);
          closePersonProfile();
          refreshContactStateViews();
          syncOwnerDetailLeadButton(ownerIndex);
        } else {
          const trigger = lastProfileModalTrigger;
          closePersonProfile();
          openSaveLeadModal(ownerIndex, nodeId, trigger);
        }
      }
      return;
    }

    const closeControl = event.target.closest(".profile-modal-close, .profile-modal-secondary");
    if (closeControl || event.target === profileModal) {
      closePersonProfile();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && viewAlertModal && !viewAlertModal.hidden) {
    window.cstViewAlertModal?.close?.();
    return;
  }
  if (event.key === "Escape" && saveLeadModal && !saveLeadModal.hidden) {
    if (saveLeadListSelectorField?.classList.contains("is-open")) {
      saveLeadListSelectorApi?.close();
      return;
    }
    closeSaveLeadModal();
    return;
  }
  if (event.key === "Escape" && createTargetModal && !createTargetModal.hidden) {
    closeCreateTargetModal();
    return;
  }
  if (event.key === "Escape" && profileModal && !profileModal.hidden) {
    closePersonProfile();
    return;
  }
  if (event.key === "Escape" && datasetSelectorField?.classList.contains("is-open")) {
    datasetSelectorApi?.close();
    datasetSelectorInput?.blur();
    return;
  }
  if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
    closeToolbarSubmenus();
    closeToolbarDropdowns();
  }
  if (event.key === "Escape") {
    closeToolbarTabDropdowns();
  }
});
