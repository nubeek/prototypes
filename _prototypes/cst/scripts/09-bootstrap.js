sortHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const { sortKey } = header.dataset;
    if (!sortKey) return;

    if (sortState.key === sortKey) {
      sortState.direction = sortState.direction === "ascending" ? "descending" : "ascending";
    } else {
      sortState.key = sortKey;
      sortState.direction = getInitialSortDirection(sortKey);
    }

    if (isDatasetTableView()) {
      locationsVisibleCount = LOCATION_TABLE_PAGE_SIZE;
    }
    applySort();
    tableWrap.scrollTo({ top: 0, behavior: "auto" });
  });
});

syncColumnWidths();
syncReduceMotionToggleOption();
syncReduceMotionStateClass();
setPanelLayout("right");
syncToolbarTabState("map");
applySort();
openMapPanel("map");

if (tableBody) {
  tableBody.addEventListener("change", (event) => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains("location-row-checkbox")) return;

    const rowId = checkbox.dataset.locationRowId;
    if (!rowId) return;

    if (checkbox.checked) {
      selectedLocationRowIds.add(rowId);
    } else {
      selectedLocationRowIds.delete(rowId);
    }

    checkbox.closest("tr[data-location-row-id]")?.classList.toggle("is-checked", checkbox.checked);
    syncLocationHeaderCheckboxState(displayedLocations);
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

    const addLeadButton = event.target.closest(".contact-add-lead-action");
    if (addLeadButton) {
      event.stopPropagation();
      const ownerIndex = Number(addLeadButton.dataset.ownerIndex);
      if (!Number.isFinite(ownerIndex)) return;

      if (addLeadButton.classList.contains("is-saved")) {
        savedLeadOwnerIndexes.delete(ownerIndex);
      } else {
        savedLeadOwnerIndexes.add(ownerIndex);
      }
      refreshContactStateViews();
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

if (ownersTable) {
  ownersTable.addEventListener("change", (event) => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains("location-select-all-checkbox")) return;
    if (!isDatasetTableView()) return;

    const shouldSelect = checkbox.checked;
    displayedLocations.forEach((row) => {
      if (shouldSelect) {
        selectedLocationRowIds.add(row.id);
      } else {
        selectedLocationRowIds.delete(row.id);
      }
    });

    renderLocations(displayedLocations);
    syncSortHeaders();
  });
}

if (filterPanel) {
  filterPanel.querySelectorAll(".filter-section").forEach((section) => {
    const title = section.querySelector(".filter-section-title");
    title?.setAttribute("aria-expanded", String(!section.classList.contains("filter-section-collapsed")));
  });

  filterPanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const title = event.target.closest(".filter-section-title");
    if (!title || !filterPanel.contains(title)) return;

    const section = title.closest(".filter-section");
    if (!section) return;

    const isCollapsed = section.classList.toggle("filter-section-collapsed");
    title.setAttribute("aria-expanded", String(!isCollapsed));
    persistViewSettings();

    if (isCollapsed) {
      section.querySelectorAll(".filter-field-select").forEach((select) => {
        filterComboboxes.get(select)?.close();
      });
    }
  });
}
document.addEventListener("mousedown", (event) => {
  filterComboboxes.forEach((combobox, select) => {
    const field = select.closest(".filter-select-field");
    if (!field?.contains(event.target)) {
      combobox.close();
    }
  });
});

if (locationFilterSelect) {
  const locationSource = (window.ownerLocationsData || []).flatMap((owner) => owner.locations);
  const prospectLocationLabels = Object.values(window.prospectDatasetsData || {})
    .flatMap((dataset) => dataset.rows || [])
    .map((row) => row.location)
    .map(normalizeDatasetCellValue)
    .filter(Boolean);
  const locationLabels = [
    ...new Set([
      ...locationSource.map((location) => location.label).filter(Boolean),
      ...prospectLocationLabels
    ])
  ].sort((a, b) => collator.compare(a, b));

  locationLabels.forEach((locationLabel) => {
    const option = document.createElement("option");
    option.value = locationLabel;
    option.textContent = locationLabel;
    locationFilterSelect.append(option);
  });

  locationFilterSelect.addEventListener("change", () => {
    selectedLocationLabels = getFilterSelectIncludedValues(locationFilterSelect);
    excludedLocationLabels = getFilterSelectExcludedValues(locationFilterSelect);
    activeMapOwnerIndex = null;
    syncMapLocationFilter();
    refreshFilteredViews();
    refitOpenMapToVisibleLocations();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });

  enhanceFilterCombobox(locationFilterSelect, { allowExclude: true });
}

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
      "Health and Beauty",
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

syncStatusFilterStates();
syncUnitsFilterControls();
syncContactsFilterControls();

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
      if (Number.isFinite(ownerIndex)) {
        toggleContactLeadSaved(ownerIndex, nodeId);
        refreshContactStateViews();
      }
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
      if (!Number.isFinite(ownerIndex)) return;

      if (savedLeadOwnerIndexes.has(ownerIndex)) {
        savedLeadOwnerIndexes.delete(ownerIndex);
      } else {
        savedLeadOwnerIndexes.add(ownerIndex);
      }

      const owner = owners.find((item) => item.originalIndex === ownerIndex);
      const hasSavedLead = savedLeadOwnerIndexes.has(ownerIndex);
      detailLeadButton.classList.toggle("is-saved", hasSavedLead);
      detailLeadButton.textContent = hasSavedLead ? "Remove from leads" : "Save as lead";
      if (owner) {
        detailLeadButton.setAttribute(
          "aria-label",
          hasSavedLead
            ? `Remove ${owner.contactName} from leads`
            : `Save ${owner.contactName} as a lead`
        );
      }

      refreshContactStateViews();
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
    closeToolbarSettingsSubmenu();
    takeViewportScreenshot();
  });
}

if (resetViewOption) {
  resetViewOption.addEventListener("click", () => {
    closeToolbarSettingsSubmenu();
    resetViewSettings();
  });
}

function setToolbarSettingsSubmenuOpen(isOpen) {
  if (!toolbarSettingsSubmenu || !toolbarSettingsSubmenuTrigger) return;

  toolbarSettingsSubmenu.classList.toggle("is-open", isOpen);
  toolbarSettingsSubmenuTrigger.setAttribute("aria-expanded", String(isOpen));
}

function closeToolbarSettingsSubmenu() {
  setToolbarSettingsSubmenuOpen(false);
}

function closeToolbarDropdowns(exceptDropdown = null) {
  toolbarDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) return;
    dropdown.removeAttribute("open");
  });
}

if (toolbarSettingsSubmenu && toolbarSettingsSubmenuTrigger) {
  toolbarSettingsSubmenuTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setToolbarSettingsSubmenuOpen(true);
  });

  toolbarSettingsSubmenu.addEventListener("mouseenter", () => {
    setToolbarSettingsSubmenuOpen(true);
  });

  toolbarSettingsSubmenu.addEventListener("mouseleave", closeToolbarSettingsSubmenu);

  toolbarSettingsSubmenu.addEventListener("focusin", () => {
    setToolbarSettingsSubmenuOpen(true);
  });

  toolbarSettingsSubmenu.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && toolbarSettingsSubmenu.contains(event.relatedTarget)) return;
    closeToolbarSettingsSubmenu();
  });
}

if (toolbarDropdowns.length) {
  document.addEventListener("click", (event) => {
    const openDropdown = toolbarDropdowns.find((dropdown) => dropdown.open);
    if (!openDropdown) return;

    if (openDropdown.contains(event.target)) {
      closeToolbarDropdowns(openDropdown);
      if (openDropdown === toolbarDropdown && !toolbarSettingsSubmenu?.contains(event.target)) {
        closeToolbarSettingsSubmenu();
      }
      return;
    }

    closeToolbarSettingsSubmenu();
    closeToolbarDropdowns();
  });
}

if (tableSwitcherDropdown) {
  tableSwitcherDropdown.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const option = event.target.closest(".table-switcher-option[data-table-view]");
    if (!option) return;

    event.preventDefault();
    setMainTableView(option.dataset.tableView);
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

if (profileModal) {
  profileModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const saveLeadButton = event.target.closest(".profile-modal-primary");
    if (saveLeadButton) {
      const ownerIndex = Number(profileModal.dataset.ownerIndex);
      if (Number.isFinite(ownerIndex)) {
        const nodeId = profileModal.dataset.nodeId ?? null;
        toggleContactLeadSaved(ownerIndex, nodeId);
        closePersonProfile();
        refreshContactStateViews();
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
  if (event.key === "Escape" && profileModal && !profileModal.hidden) {
    closePersonProfile();
    return;
  }
  if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
    closeToolbarSettingsSubmenu();
    closeToolbarDropdowns();
  }
  if (event.key === "Escape") {
    closeToolbarTabDropdowns();
  }
});
