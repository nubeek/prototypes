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
    ownerMatchesOwnerFilter(owner) &&
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

  return ownerLocationData.units.map((unit, unitIndex) => ({
    ownerIndex: owner.originalIndex,
    unitIndex,
    name: unit.name,
    email: unit.email,
    phone: unit.phone,
    location: unit.label || "",
    franchises: [unit.franchise || primaryFranchise]
  }));
}

function unitRowMatchesFilters(row) {
  if (excludedLocationLabels.includes(row.location)) return false;
  if (selectedLocationLabels.length && !selectedLocationLabels.includes(row.location)) return false;
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
      closeLabel: "Close raw data",
      linksToDetail: true
    });
  }

  return "";
}

const RAW_SIDEBAR_COLUMN_WIDTHS = {
  index: "4%",
  name: "24%",
  email: "24%",
  phone: "18%",
  location: "18%",
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
  return `
    <tr class="raw-data-row" data-owner-index="${row.ownerIndex}" data-raw-row-index="${row.rowIndex}">
      <td class="raw-index-cell">${rowIndex + 1}</td>
      <td>
        <div class="raw-name-cell">
          <span class="ui-avatar raw-avatar" aria-hidden="true">${getInitials(row.name)}</span>
          <span class="raw-name">${row.name}</span>
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
  const unitsTableMarkup = getRawTableMarkup(getScopedOwnerUnitRows(ownerIndex), {
    emptyMessage: "No units match the current filters.",
    rowMarkup: getRawUnitRowMarkup,
    pageType: "units"
  });

  ownerDetailsPanel.innerHTML = `
    <article class="owner-raw-panel">
      ${getRawSidebarHeader(owner)}
      <div class="owner-raw-table-wrap">
        <section class="owner-raw-section" aria-labelledby="ownerRawContactsTitle">
          <h2 class="owner-raw-section-title" id="ownerRawContactsTitle">Contacts</h2>
          ${contactsTableMarkup}
        </section>
        <section class="owner-raw-section" aria-labelledby="ownerRawUnitsTitle">
          <h2 class="owner-raw-section-title" id="ownerRawUnitsTitle">Units</h2>
          ${unitsTableMarkup}
        </section>
      </div>
    </article>
  `;
  ownerDetailsPanel.scrollTop = resetPagination ? 0 : previousScrollTop;
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

  syncModeColumn();
  syncSortHeaders();
  syncToolbarTabState(getCurrentPanelMode());
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
