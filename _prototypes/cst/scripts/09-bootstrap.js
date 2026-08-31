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
      syncOwnersMapRowSelectionHighlight();
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
    syncOwnersMapRowSelectionHighlight();
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

    const franchiseWefranchLink = event.target.closest(".franchise-wefranch-link");
    if (franchiseWefranchLink) {
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
      syncOwnersMapRowSelectionHighlight();
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
    syncOwnersMapRowSelectionHighlight();
  });
}

if (filterPanel) {
  window.WefranchFilterSections.enhanceHeaders(filterPanel, {
    iconSrc: "../../assets/icons/remove.svg",
    onClear: clearFilterSection
  });
  window.WefranchFilterSections.bindCollapseToggle(filterPanel, {
    onToggle: () => persistViewSettings()
  });
}

window.WefranchFilterCombobox.bindOutsideClick();

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
    refreshFilteredViews();
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
      "Food & Beverage",
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
    refreshFilteredViews();
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

if (radiusToggle) {
  radiusToggle.addEventListener("change", () => {
    setRadiusFilterEnabled(radiusToggle.checked, { refresh: true });
  });
}

initRangeFilterControls();
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

if (tableEmptyStateClear) {
  tableEmptyStateClear.addEventListener("click", () => {
    clearCstSavedSearchSession({ persist: false });
    resetCstFilterSelections({ refresh: true });
  });
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
    refreshFilteredViews();
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

function bindTableHeadingFloatingTooltip(trigger, { tooltipClass = "", onlyBelowWidth } = {}) {
  if (!trigger?.dataset.tooltip) return;

  let tooltip = null;

  const shouldShowTooltip = () => (
    !onlyBelowWidth || window.innerWidth <= onlyBelowWidth
  );

  const getTooltip = () => {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = `filter-combobox-floating-tooltip${tooltipClass ? ` ${tooltipClass}` : ""}`;
      tooltip.setAttribute("role", "tooltip");
    }

    return tooltip;
  };

  const hideTooltip = () => {
    tooltip?.classList.remove("is-visible");
  };

  const showTooltip = () => {
    const tooltipText = trigger.dataset.tooltip;
    if (!tooltipText || trigger.hidden || !shouldShowTooltip()) return;

    const el = getTooltip();
    el.textContent = tooltipText;

    if (!el.isConnected) {
      document.body.append(el);
    }

    el.style.left = "0px";
    el.style.top = "0px";
    el.classList.add("is-visible");
    window.fitTooltipToContent?.(el);

    const targetRect = trigger.getBoundingClientRect();
    const tooltipRect = el.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  trigger.addEventListener("mouseenter", showTooltip);
  trigger.addEventListener("mouseleave", hideTooltip);
  trigger.addEventListener("focus", showTooltip);
  trigger.addEventListener("blur", hideTooltip);
  trigger.addEventListener("click", hideTooltip);
  window.addEventListener("resize", hideTooltip);
  tableWrap?.addEventListener("scroll", hideTooltip, { passive: true });
}

bindTableHeadingFloatingTooltip(tableHeadingInfo, { tooltipClass: "table-heading-info-floating-tooltip" });
bindTableHeadingFloatingTooltip(readerEditQueryBtn);
bindTableHeadingFloatingTooltip(readerViewSettingsBtn, { onlyBelowWidth: 1480 });
bindTableHeadingFloatingTooltip(document.getElementById("campaignRenameBtn"), {
  tooltipClass: "is-over-modal"
});

if (tableHeadingSummary) {
  const openSummaryFilter = (filterTrigger) => {
    const sectionKey = filterTrigger.dataset.filterSection;
    if (!sectionKey) return;

    if (readerModeActive) {
      exitReaderMode({ expandSection: sectionKey });
      return;
    }

    setFilterPanelOpen(true);
    expandCstFilterSectionOnly?.(sectionKey);
  };

  tableHeadingSummary.addEventListener("click", (event) => {
    const filterTrigger = event.target.closest(".table-heading-summary__value[data-filter-section]");
    if (!filterTrigger) return;
    openSummaryFilter(filterTrigger);
  });

  tableHeadingSummary.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const filterTrigger = event.target.closest(".table-heading-summary__value[data-filter-section]");
    if (!filterTrigger) return;
    event.preventDefault();
    openSummaryFilter(filterTrigger);
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
    refreshFilteredViews();
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

function getPrototypeSettingsIconUrl(fileName) {
  return new URL(`../../assets/icons/${fileName}`, window.location.href).href;
}

function getPrototypeSettingsItems() {
  return [
    {
      id: "reset-view",
      type: "action",
      label: "Reset view",
      icon: getPrototypeSettingsIconUrl("reset.svg")
    }
  ];
}

function performPrototypeSetting(id) {
  if (id === "reset-view") {
    resetViewSettings();
    return { close: true };
  }

  return null;
}

window.wefranchPrototypeSettings = {
  getItems: getPrototypeSettingsItems,
  perform: performPrototypeSetting
};

window.dispatchEvent(new CustomEvent("wefranch:prototype-settings-ready"));

const DEFAULT_CREATE_TARGET_ALERTS = {
  enabled: true,
  notifyAdded: true,
  notifyModified: true
};
let editingSavedSearchId = null;
let pendingCreateTargetAlerts = null;

function normalizeCreateTargetAlerts(alerts) {
  if (!alerts?.enabled) return null;

  return {
    enabled: true,
    notifyAdded: Boolean(alerts.notifyAdded),
    notifyModified: Boolean(alerts.notifyModified)
  };
}

function readCreateTargetAlertsFromForm() {
  return {
    enabled: true,
    notifyAdded: Boolean(createTargetNotifyAdded?.checked),
    notifyModified: Boolean(createTargetNotifyModified?.checked)
  };
}

function syncCreateTargetAlertCheckbox(checkbox) {
  checkbox?.closest(".filter-check")?.classList.toggle("is-checked", Boolean(checkbox?.checked));
}

function applyCreateTargetAlertCheckboxes(settings) {
  const source = settings || DEFAULT_CREATE_TARGET_ALERTS;

  if (createTargetNotifyAdded instanceof HTMLInputElement) {
    createTargetNotifyAdded.checked = Boolean(source.notifyAdded);
  }
  if (createTargetNotifyModified instanceof HTMLInputElement) {
    createTargetNotifyModified.checked = Boolean(source.notifyModified);
  }
  createTargetNotifyCheckboxes.forEach(syncCreateTargetAlertCheckbox);
}

function syncCreateTargetAlertsState() {
  const isEnabled = Boolean(pendingCreateTargetAlerts?.enabled);

  createTargetAlerts?.classList.toggle("is-open", isEnabled);
  createTargetAlertsRow?.classList.toggle("is-enabled", isEnabled);
  createTargetAlertsToggle?.setAttribute("aria-checked", String(isEnabled));
  createTargetAlertsToggle?.setAttribute("aria-expanded", String(isEnabled));
  createTargetAlertsToggle?.setAttribute(
    "aria-label",
    isEnabled ? "Disable alerts" : "Enable alerts"
  );
  if (createTargetAlertsHelper) {
    createTargetAlertsHelper.textContent = isEnabled
      ? "Notify me when"
      : "Get notified when this view's data changes";
  }

  if (createTargetAlertsPanel) {
    createTargetAlertsPanel.inert = !isEnabled;
    createTargetAlertsPanel.setAttribute("aria-hidden", String(!isEnabled));
  }
}

function setCreateTargetAlerts(alerts) {
  pendingCreateTargetAlerts = normalizeCreateTargetAlerts(alerts);
  applyCreateTargetAlertCheckboxes(pendingCreateTargetAlerts || DEFAULT_CREATE_TARGET_ALERTS);
  syncCreateTargetAlertsState();
}

function toggleCreateTargetAlerts() {
  pendingCreateTargetAlerts = pendingCreateTargetAlerts?.enabled
    ? null
    : readCreateTargetAlertsFromForm();
  syncCreateTargetAlertsState();
}

const createTargetModalApi = window.createProtoModal({
  overlay: createTargetModal,
  closeSelectors: ".target-modal-close, .target-modal-cancel",
  restoreFocus(trigger) {
    if (!(trigger instanceof HTMLElement)) return;
    if (trigger.classList.contains("target-settings")) {
      trigger.blur();
      trigger.closest(".target-card")?.blur();
      return;
    }
    trigger.focus({ preventScroll: true });
  },
  onClose() {
    createTargetForm?.reset();
    editingSavedSearchId = null;
    setCreateTargetAlerts(null);
  }
});

function openCreateTargetModal(trigger = null, { savedSearch = null } = {}) {
  if (!createTargetModal) return;
  if (savedSearch?.id && !window.cstSavedSearchStore?.canEdit?.(savedSearch.id)) return;

  editingSavedSearchId = savedSearch?.id || null;
  createTargetForm?.reset();
  createTargetTitleInput?.setCustomValidity("");
  if (createTargetModalTitle) {
    createTargetModalTitle.textContent = editingSavedSearchId ? "Edit search" : "Save search";
  }
  if (deleteSavedViewBtn) {
    deleteSavedViewBtn.hidden = !editingSavedSearchId;
  }
  createTargetModal.querySelector(".target-modal-close")?.setAttribute(
    "aria-label",
    editingSavedSearchId ? "Close edit search" : "Close save search"
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
  setCreateTargetAlerts(savedSearch?.alerts);

  createTargetModalApi.open(trigger, {
    focus: createTargetTitleInput
  });
}

function closeCreateTargetModal() {
  createTargetModalApi.close();
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

createTargetAlertsRow?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("#createTargetAlertsPanel")) return;

  toggleCreateTargetAlerts();
});

createTargetNotifyCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    syncCreateTargetAlertCheckbox(checkbox);
    if (!pendingCreateTargetAlerts?.enabled) return;
    pendingCreateTargetAlerts = readCreateTargetAlertsFromForm();
  });
});

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
    const wasEditingFromSplash = createTargetModalApi.getTrigger()?.classList?.contains("target-settings");
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
    }, window.PROTO_MODAL_CLOSE_DURATION_MS);
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
    }, window.PROTO_MODAL_CLOSE_DURATION_MS);
});

createTargetTitleInput?.addEventListener("input", () => {
  createTargetTitleInput.setCustomValidity("");
});

const TOOLBAR_SUBMENU_VIEWPORT_GUTTER = 8;
const TOOLBAR_SUBMENU_OVERLAP_PX = 4;

function getToolbarSubmenuMenuWidth(menu) {
  if (menu.offsetWidth) return menu.offsetWidth;

  const { display, visibility, pointerEvents } = menu.style;
  menu.style.display = "block";
  menu.style.visibility = "hidden";
  menu.style.pointerEvents = "none";
  const width = menu.offsetWidth;
  menu.style.display = display;
  menu.style.visibility = visibility;
  menu.style.pointerEvents = pointerEvents;
  return width;
}

function positionToolbarSubmenu(submenu) {
  const menu = submenu?.querySelector(":scope > .toolbar-submenu-menu");
  if (!submenu || !menu) return;

  const submenuRect = submenu.getBoundingClientRect();
  const menuWidth = getToolbarSubmenuMenuWidth(menu);
  const rightEdge = submenuRect.right - TOOLBAR_SUBMENU_OVERLAP_PX + menuWidth;
  const fitsRight = rightEdge <= window.innerWidth - TOOLBAR_SUBMENU_VIEWPORT_GUTTER;

  submenu.classList.toggle("is-submenu-left", !fitsRight);
}

function positionOpenToolbarSubmenus() {
  [toolbarSettingsSubmenu, toolbarDatasetSubmenu, toolbarCampaignsSubmenu].forEach((submenu) => {
    if (submenu?.classList.contains("is-open")) {
      positionToolbarSubmenu(submenu);
    }
  });
}

function setToolbarSubmenuOpen(submenu, trigger, isOpen) {
  if (!submenu || !trigger) return;

  submenu.classList.toggle("is-open", isOpen);
  trigger.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    positionToolbarSubmenu(submenu);
  } else {
    submenu.classList.remove("is-submenu-left");
  }
}

function closeToolbarSubmenu(submenu, trigger) {
  setToolbarSubmenuOpen(submenu, trigger, false);
}

function closeToolbarSubmenus() {
  closeToolbarSubmenu(toolbarSettingsSubmenu, toolbarSettingsSubmenuTrigger);
  closeToolbarSubmenu(toolbarDatasetSubmenu, toolbarDatasetSubmenuTrigger);
  closeToolbarSubmenu(toolbarCampaignsSubmenu, toolbarCampaignsSubmenuTrigger);
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
bindToolbarSubmenu(toolbarDatasetSubmenu, toolbarDatasetSubmenuTrigger);
bindToolbarSubmenu(toolbarCampaignsSubmenu, toolbarCampaignsSubmenuTrigger);
window.addEventListener("resize", positionOpenToolbarSubmenus);

toolbarDropdowns.forEach((dropdown) => {
  dropdown.addEventListener("toggle", () => {
    if (dropdown.open) {
      closeToolbarDropdowns(dropdown);
      dropdown.querySelectorAll(".toolbar-submenu").forEach(positionToolbarSubmenu);
      return;
    }
    closeToolbarSubmenus();
  });
});

if (toolbarDropdowns.length) {
  document.addEventListener("click", (event) => {
    const openDropdown = toolbarDropdowns.find((dropdown) => dropdown.open);
    if (!openDropdown) return;

    if (openDropdown.contains(event.target)) {
      closeToolbarDropdowns(openDropdown);
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

    const editDetails = event.target.closest(".save-lead-edit-details");
    if (editDetails) {
      expandSaveLeadContactFields();
      return;
    }

    const noteToggle = event.target.closest(".save-lead-note-toggle");
    if (noteToggle) {
      toggleSaveLeadNoteField();
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
          const trigger = profileModalApi.getTrigger();
          closePersonProfile();
          openSaveLeadModal(ownerIndex, nodeId, trigger);
        }
      }
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (
    saveLeadModalApi?.isVisible()
    || createTargetModalApi?.isVisible()
    || profileModalApi?.isVisible()
    || window.cstStartCampaignModal?.isVisible?.()
  ) {
    return;
  }
  if (toolbarDropdowns.some((dropdown) => dropdown.open)) {
    closeToolbarSubmenus();
    closeToolbarDropdowns();
  }
  closeToolbarTabDropdowns();
});
