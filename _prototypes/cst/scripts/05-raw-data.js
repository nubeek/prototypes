function ownerMatchesOwnerFilter(owner) {
  const selectedOwnerIndexSet = new Set(selectedOwnerIndexes.map(Number));
  const excludedOwnerIndexSet = new Set(excludedOwnerIndexes.map(Number));

  if (excludedOwnerIndexSet.has(owner.originalIndex)) return false;
  if (!selectedOwnerIndexSet.size) return true;
  return selectedOwnerIndexSet.has(owner.originalIndex);
}

function syncOwnerExcludeState() {
  updateClearFiltersButton();
}

function getPrimarySelectedOwnerIndex() {
  if (excludedOwnerIndexes.length || !selectedOwnerIndexes.length) return null;

  const ownerIndex = Number(selectedOwnerIndexes[0]);
  return Number.isNaN(ownerIndex) ? null : ownerIndex;
}

function getRawDataOwnerScope() {
  return owners.filter((owner) => (
    ownerMatchesSearchQuery(owner) &&
    ownerMatchesOwnerFilter(owner) &&
    ownerMatchesCategoryFilter(owner) &&
    ownerMatchesFranchiseFilter(owner) &&
    ownerMatchesUnitsFilter(owner) &&
    ownerMatchesContactsFilter(owner)
  ));
}

function getAllOwnerRawRows() {
  return getRawDataOwnerScope()
    .flatMap((owner) => getOwnerRawRows(owner.originalIndex))
    .filter((row) => rawRowMatchesFilters(row));
}

function getScopedOwnerRawRows(ownerIndex = null) {
  if (ownerIndex === null || Number.isNaN(ownerIndex)) {
    return getAllOwnerRawRows();
  }

  const isVisibleOwner = getRawDataOwnerScope().some((owner) => owner.originalIndex === ownerIndex);
  if (!isVisibleOwner) return [];
  return getOwnerRawRows(ownerIndex).filter((row) => rawRowMatchesFilters(row));
}

function getOwnerUnitRows(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const ownerLocationData = window.ownerLocationsData?.[ownerIndex];
  if (!owner || !ownerLocationData?.units?.length) return [];

  const franchises = getOwnerFranchises(owner);
  const primaryFranchise = franchises[0] || "Franchise";
  const ownerCategory = owner.category || "Fitness";

  return ownerLocationData.units.map((unit, unitIndex) => ({
    ownerIndex: owner.originalIndex,
    unitIndex,
    name: unit.name,
    email: unit.email,
    phone: unit.phone,
    location: unit.label || "",
    category: unit.category || ownerCategory,
    categories: [unit.category || ownerCategory],
    franchises: [unit.franchise || primaryFranchise]
  }));
}

function unitRowMatchesFilters(row) {
  if (excludedLocationLabels.includes(row.location)) return false;
  if (selectedLocationLabels.length && !selectedLocationLabels.includes(row.location)) return false;
  const rowCategories = Array.isArray(row.categories) && row.categories.length
    ? row.categories
    : [row.category || "Fitness"];
  if (rowCategories.some((category) => excludedCategoryValues.includes(category))) return false;
  if (selectedCategoryValues.length && !rowCategories.some((category) => selectedCategoryValues.includes(category))) {
    return false;
  }
  if (row.franchises.some((franchiseName) => excludedFranchiseIndexes.includes(franchiseName))) return false;
  if (!selectedFranchiseIndexes.length) return true;

  return row.franchises.some((franchiseName) => selectedFranchiseIndexes.includes(franchiseName));
}

function getAllOwnerUnitRows() {
  return getRawDataOwnerScope()
    .flatMap((owner) => getOwnerUnitRows(owner.originalIndex))
    .filter((row) => unitRowMatchesFilters(row));
}

function getScopedOwnerUnitRows(ownerIndex = null) {
  if (ownerIndex === null || Number.isNaN(ownerIndex)) {
    return getAllOwnerUnitRows();
  }

  const isVisibleOwner = getRawDataOwnerScope().some((owner) => owner.originalIndex === ownerIndex);
  if (!isVisibleOwner) return [];
  return getOwnerUnitRows(ownerIndex).filter((row) => unitRowMatchesFilters(row));
}

function getRawSidebarHeader(owner) {
  if (owner) {
    return getOwnerHeader(owner, {
      className: "owner-raw-heading",
      closeLabel: "Close contacts",
      linksToDetail: true
    });
  }

  return "";
}

const RAW_SIDEBAR_COLUMN_WIDTHS = {
  index: "4%",
  name: "30%",
  email: "22%",
  phone: "16%",
  location: "16%",
  franchise: "12%"
};

function getRawTableHeader(widths = RAW_SIDEBAR_COLUMN_WIDTHS) {
  return `
    <thead>
      <tr>
        <th style="width: ${widths.index}"><span class="th-content raw-index-heading" aria-hidden="true">&nbsp;</span></th>
        <th style="width: ${widths.name}"><span class="th-content">Name</span></th>
        <th style="width: ${widths.email}"><span class="th-content">E-mail</span></th>
        <th style="width: ${widths.phone}"><span class="th-content">Phone number</span></th>
        <th style="width: ${widths.location}"><span class="th-content">Location</span></th>
        <th style="width: ${widths.franchise}"><span class="th-content">Franchise</span></th>
      </tr>
    </thead>
  `;
}

function getRawContactRowMarkup(row, rowIndex) {
  const isLeadSaved = isContactLeadSaved(row.ownerIndex, row.nodeId);
  const isHidden = isContactHidden(row.ownerIndex, row.nodeId);

  return `
    <tr
      class="raw-data-row ${isHidden ? "is-contact-hidden" : ""} ${isLeadSaved ? "is-lead-saved" : ""}"
      data-owner-index="${row.ownerIndex}"
      data-raw-row-index="${row.rowIndex}"
      data-node-id="${row.nodeId}"
    >
      <td class="raw-index-cell">${rowIndex + 1}</td>
      <td>
        <div class="raw-name-cell ${isLeadSaved ? "is-lead-saved" : ""} ${isHidden ? "is-contact-hidden" : ""}">
          <span class="ui-avatar raw-avatar" aria-hidden="true">${getInitials(row.name)}</span>
          <span class="raw-name">${row.name}</span>
          <div class="contact-row-actions raw-row-actions">
            <button
              class="ui-control contact-hide-results-action ${isHidden ? "is-hidden" : ""}"
              type="button"
              data-owner-index="${row.ownerIndex}"
              data-node-id="${row.nodeId}"
              aria-label="${isHidden ? `Show ${row.name} in results` : `Hide ${row.name} from results`}"
              data-tooltip="${isHidden ? "Show in results" : "Hide from results"}"
            ></button>
            <button
              class="ui-control contact-add-lead-action ${isLeadSaved ? "is-saved" : ""}"
              type="button"
              data-owner-index="${row.ownerIndex}"
              data-node-id="${row.nodeId}"
              aria-label="${isLeadSaved ? `Remove ${row.name} from leads` : `Save ${row.name} as a lead`}"
              data-tooltip="${isLeadSaved ? "Remove from leads" : "Save as lead"}"
            ></button>
          </div>
        </div>
      </td>
      <td><span class="ui-link ui-ellipsis raw-email">${row.email}</span></td>
      <td><span class="raw-phone">${row.phone}</span></td>
      <td><span class="raw-location">${row.location}</span></td>
      <td><span class="raw-franchise">${row.franchises.join(", ")}</span></td>
    </tr>
  `;
}

function getRawUnitRowMarkup(row, rowIndex) {
  return `
    <tr class="raw-unit-row" data-owner-index="${row.ownerIndex}" data-unit-row-index="${row.unitIndex}">
      <td class="raw-index-cell">${rowIndex + 1}</td>
      <td><span class="raw-name">${row.name}</span></td>
      <td><span class="ui-link ui-ellipsis raw-email">${row.email}</span></td>
      <td><span class="raw-phone">${row.phone}</span></td>
      <td><span class="raw-location">${row.location}</span></td>
      <td><span class="raw-franchise">${row.franchises.join(", ")}</span></td>
    </tr>
  `;
}

const RAW_DATA_PAGE_SIZE = 100;
const RAW_DATA_TABLE_COLUMN_COUNT = 6;
let rawDataVisibleCounts = {
  contacts: RAW_DATA_PAGE_SIZE,
  units: RAW_DATA_PAGE_SIZE
};

function getRawLoadMoreRowMarkup(pageType, visibleCount, totalRows) {
  const remaining = totalRows - visibleCount;
  if (remaining <= 0) return "";

  const nextBatch = Math.min(RAW_DATA_PAGE_SIZE, remaining);
  return `
    <tr class="owner-raw-load-more-row" data-raw-load-more="${pageType}" tabindex="0" role="button" aria-label="Load ${nextBatch} more records">
      <td class="owner-raw-load-more-cell" colspan="${RAW_DATA_TABLE_COLUMN_COUNT}">
        <span class="owner-raw-load-more">
          <span class="owner-raw-load-more-status">Viewing ${visibleCount.toLocaleString()} of ${totalRows.toLocaleString()} records</span>
          <span class="owner-raw-load-more-separator" aria-hidden="true">&ndash;</span>
          <span class="owner-raw-load-more-action">Load ${nextBatch} more</span>
        </span>
      </td>
    </tr>
  `;
}

function getRawTableMarkup(rows, { emptyMessage, rowMarkup, pageType = null }) {
  if (!rows.length) {
    return `<p class="owner-raw-empty">${emptyMessage}</p>`;
  }

  const totalRows = rows.length;
  let visibleRows = rows;
  let loadMoreRowMarkup = "";

  if (pageType) {
    const visibleCount = Math.min(rawDataVisibleCounts[pageType] || RAW_DATA_PAGE_SIZE, totalRows);
    visibleRows = rows.slice(0, visibleCount);
    loadMoreRowMarkup = getRawLoadMoreRowMarkup(pageType, visibleCount, totalRows);
  }

  return `
    <table class="owner-raw-table raw-data-table">
      ${getRawTableHeader()}
      <tbody>
        ${visibleRows.map(rowMarkup).join("")}
        ${loadMoreRowMarkup}
      </tbody>
    </table>
  `;
}

function syncOwnerRawTableDividers() {
  const rawTableWrap = ownerDetailsPanel?.querySelector(".owner-raw-table-wrap");
  if (!rawTableWrap) return;

  const hasHorizontalOverflow = rawTableWrap.scrollWidth > rawTableWrap.clientWidth;
  const hasLeftOverlap = rawTableWrap.scrollLeft > 0;
  const hasVerticalOverflow = rawTableWrap.scrollHeight > rawTableWrap.clientHeight;
  const hasTopOverlap = rawTableWrap.scrollTop > 0;

  rawTableWrap.classList.toggle("is-name-column-overlap", hasHorizontalOverflow && hasLeftOverlap);
  rawTableWrap.classList.toggle("is-header-row-overlap", hasVerticalOverflow && hasTopOverlap);
}

function renderRawDataSidebar(ownerIndex = null, { resetPagination = true } = {}) {
  if (!ownerDetailsPanel) return;

  if (resetPagination) {
    rawDataVisibleCounts = {
      contacts: RAW_DATA_PAGE_SIZE,
      units: RAW_DATA_PAGE_SIZE
    };
  }

  const previousScrollTop = ownerDetailsPanel.scrollTop;
  const owner = ownerIndex !== null
    ? owners.find((item) => item.originalIndex === ownerIndex) || null
    : null;
  const contactsTableMarkup = getRawTableMarkup(getScopedOwnerRawRows(ownerIndex), {
    emptyMessage: "No contacts match the current filters.",
    rowMarkup: getRawContactRowMarkup,
    pageType: "contacts"
  });

  ownerDetailsPanel.innerHTML = `
    <article class="owner-raw-panel">
      ${getRawSidebarHeader(owner)}
      <div class="owner-raw-table-wrap">
        <section class="owner-raw-section">
          ${contactsTableMarkup}
        </section>
      </div>
    </article>
  `;
  ownerDetailsPanel.scrollTop = resetPagination ? 0 : previousScrollTop;
  ownerDetailsPanel
    .querySelector(".owner-raw-table-wrap")
    ?.addEventListener("scroll", syncOwnerRawTableDividers, { passive: true });
  syncOwnerRawTableDividers();
  syncOwnerHeaderScrollState();
}

function loadMoreRawDataRows(pageType) {
  if (pageType !== "contacts" && pageType !== "units") return;

  rawDataVisibleCounts[pageType] = (rawDataVisibleCounts[pageType] || RAW_DATA_PAGE_SIZE) + RAW_DATA_PAGE_SIZE;
  renderRawDataSidebar(activeRawOwnerIndex, { resetPagination: false });
}

function restoreOwnersTableView({ clearRaw = true, clearGlobalRaw = true } = {}) {
  if (clearRaw) {
    activeRawOwnerIndex = null;
  }

  if (clearGlobalRaw) {
    globalRawDataViewOpen = false;
  }

  ownersTable?.classList.remove("raw-data-table");
  tableWrap?.classList.remove("is-raw-data-view");

  defaultHeaderState.forEach((state) => {
    state.header.className = state.className;
    state.header.hidden = state.hidden;
    state.header.innerHTML = state.html;
    state.header.style.width = state.styleWidth;

    if (state.datasetSortKey) {
      state.header.dataset.sortKey = state.datasetSortKey;
    } else {
      state.header.removeAttribute("data-sort-key");
    }

    if (state.ariaSort) {
      state.header.setAttribute("aria-sort", state.ariaSort);
    } else {
      state.header.removeAttribute("aria-sort");
    }
  });

  syncSortHeaders();
  syncToolbarTabState(getCurrentPanelMode());
}

function refreshContactStateViews() {
  applySort();

  if (globalRawDataViewOpen) {
    renderRawDataSidebar(activeRawOwnerIndex, { resetPagination: false });
  }
}

function refreshFilteredViews() {
  applySort();

  if (globalRawDataViewOpen) {
    const visibleOwnerIndexes = new Set(getRawDataOwnerScope().map((owner) => owner.originalIndex));
    const nextOwnerIndex = visibleOwnerIndexes.has(activeRawOwnerIndex) ? activeRawOwnerIndex : null;
    openSidebar("raw", nextOwnerIndex);
  }
}

function refitOpenMapToVisibleLocations() {
  const mapModeOpen =
    card?.classList.contains("is-map-open") &&
    !mapPanel?.classList.contains("is-details-mode") &&
    !mapPanel?.classList.contains("is-org-mode") &&
    !mapPanel?.classList.contains("is-raw-mode");
  if (!mapModeOpen) return;
  resizeOwnersMap();
  fitOwnersMapToVisibleLocations();
}

function syncOwnerHeaderScrollState() {
  if (!ownerDetailsPanel) return;

  ownerDetailsPanel.classList.toggle("is-scrolled", ownerDetailsPanel.scrollTop > 0);
}
