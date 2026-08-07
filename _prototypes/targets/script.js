const tableBody = document.getElementById("ownersTableBody");
const markRead = document.getElementById("markRead");
const position = document.getElementById("changePosition");
const prev = document.getElementById("prevChange");
const next = document.getElementById("nextChange");
const tableWrap = document.getElementById("tableWrap");
const subtitle = document.querySelector(".subtitle-count");
const changeNav = document.querySelector(".change-nav");
const pager = document.querySelector(".pager");
const sortHeaders = Array.from(document.querySelectorAll(".sortable-header"));
const prototypeModeSelect = document.getElementById("prototypeMode");
const toolbarDropdowns = Array.from(document.querySelectorAll(".toolbar-dropdown"));
const targetToolbarMenuDropdown = document.getElementById("targetToolbarMenuDropdown");
const changesToggleOption = document.getElementById("changesToggleOption");
const changesToggleIcon = document.getElementById("changesToggleIcon");
const changesToggleLabel = document.getElementById("changesToggleLabel");
const ownerColumnHeader = document.getElementById("ownerColumnHeader");
const contactColumnHeader = document.getElementById("contactColumnHeader");
const franchiseColumnHeader = document.getElementById("franchiseColumnHeader");
const modeColumnHeader = document.getElementById("modeColumnHeader");
const modeColumnLabel = document.getElementById("modeColumnLabel");
const combinedContactsHeader = document.getElementById("combinedContactsHeader");
const locationsColumnHeader = document.getElementById("locationsColumnHeader");
const owners = (window.ownersData || []).map((owner, index) => ({
  ...owner,
  originalIndex: index
}));
const activeIconColor = "#7a63dd";
const inactiveIconColor = "rgba(122, 99, 221, 0.15)";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const ACTIVE_HIGHLIGHT_FADE_MS = 220;

let changedRows = [];
let activeIndex = 0;
let changeNavEngaged = false;
let displayedOwners = [...owners];
let activeHighlightTimeout;
let prototypeMode = prototypeModeSelect ? prototypeModeSelect.value : "modified";
let changesVisible = false;
let subtitleHovering = false;
let sortState = {
  columns: [{ key: "locations", direction: "descending" }]
};
let locationSortCycleActive = false;
const columnWidths = {
  default: {
    owner: "30%",
    contact: "24%",
    franchise: "15.3333%",
    mode: "15.3333%",
    locations: "15.3333%"
  },
  combined: {
    owner: "24%",
    contact: "24%",
    franchise: "16%",
    mode: "12%",
    contacts: "12%",
    locations: "12%"
  }
};

function setChangePositionLabel(text) {
  if (position) position.textContent = text;
}

function syncChangesVisibilityToggle() {
  document.body.classList.toggle("changes-hidden", !changesVisible);

  if (changesToggleOption) {
    changesToggleOption.setAttribute("aria-checked", String(changesVisible));
  }
  if (changesToggleIcon) {
    changesToggleIcon.src = changesVisible ? "assets/hide.svg" : "assets/unhide.svg";
  }
  if (changesToggleLabel) {
    changesToggleLabel.textContent = changesVisible ? "Hide changes" : "Show changes";
  }
}

function closeToolbarDropdowns(exceptDropdown = null) {
  toolbarDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) return;
    dropdown.removeAttribute("open");
  });
}

function getOwnerIcon(type, enabled) {
  const color = enabled ? activeIconColor : inactiveIconColor;

  if (type === "web") {
    return `
      <svg class="icon icon-web" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path fill="${color}" d="M10,11.28h-4.01c.38,1.6,1.06,3.11,2,4.45.94-1.34,1.62-2.85,2-4.45ZM4.35,4.72c.35-1.67.99-3.27,1.88-4.72C3.75.58,1.69,2.33.67,4.72h3.67ZM5.6,8c0,.55.04,1.1.1,1.64h4.6c.07-.54.1-1.09.1-1.64,0-.55-.04-1.1-.1-1.64h-4.6c-.07.54-.1,1.09-.1,1.64ZM11.65,4.72h3.67c-1.02-2.39-3.08-4.13-5.56-4.72.89,1.45,1.53,3.04,1.88,4.72ZM6,4.72h4.01c-.38-1.6-1.06-3.11-2-4.45-.94,1.34-1.62,2.85-2,4.45ZM11.65,11.28c-.35,1.67-.99,3.27-1.88,4.72,2.47-.58,4.54-2.33,5.56-4.72h-3.67ZM11.91,6.36c.06.55.09,1.09.09,1.64,0,.55-.03,1.1-.09,1.64h3.93c.22-1.08.22-2.2,0-3.28h-3.93ZM4.35,11.28H.67c1.02,2.39,3.08,4.13,5.56,4.72-.89-1.45-1.53-3.04-1.88-4.72ZM4.09,9.64c-.06-.55-.09-1.09-.09-1.64,0-.55.03-1.1.09-1.64H.16c-.22,1.08-.22,2.2,0,3.28h3.93Z"/>
      </svg>
    `;
  }

  return `
    <svg class="icon icon-linkedin" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fill="${color}" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0ZM6.78,13h-1.78v-5.98h1.78v5.98ZM5.92,6.2c-.59,0-1.07-.4-1.07-.99s.48-1.08,1.07-1.08,1,.48,1,1.08-.41.99-1,.99ZM13.51,13h-1.85v-2.91c0-.69-.01-1.59-.96-1.59s-1.11.76-1.11,1.54v2.96h-1.85v-5.98h1.78v.82h.03c.25-.47.85-.97,1.76-.97,1.87,0,2.22,1.24,2.22,2.85v3.28Z"/>
    </svg>
  `;
}

function getAddedBadge(count) {
  return count > 0 ? `<span class="added-count">+${count}</span>` : "";
}

function showsContactUpdates() {
  return prototypeMode === "contacts" || prototypeMode === "combined";
}

function ownerHasContactUpdate(owner) {
  return owner.addedContacts > 0 || owner.addedLocations > 0;
}

function getContactsColumn(owner) {
  return `
    <div class="count-cell contacts-count">
      <span>${owner.contacts}</span>
      ${getAddedBadge(owner.addedContacts)}
    </div>
  `;
}

function getModeColumn(owner) {
  if (prototypeMode === "contacts") {
    return getContactsColumn(owner);
  }

  return `<span class="modified-date">${owner.modified}</span>`;
}

function ownerHasVisibleChange(owner) {
  if (prototypeMode === "contacts") {
    return ownerHasContactUpdate(owner);
  }

  if (prototypeMode === "combined") {
    return owner.changed || ownerHasContactUpdate(owner);
  }

  return owner.changed;
}

function syncColumnWidths() {
  const widths = prototypeMode === "combined" ? columnWidths.combined : columnWidths.default;

  ownerColumnHeader.style.width = widths.owner;
  contactColumnHeader.style.width = widths.contact;
  franchiseColumnHeader.style.width = widths.franchise;
  modeColumnHeader.style.width = widths.mode;
  locationsColumnHeader.style.width = widths.locations;

  if (combinedContactsHeader) {
    combinedContactsHeader.style.width = widths.contacts || "0";
  }
}

function syncModeColumn() {
  const isContactsMode = prototypeMode === "contacts";
  const isCombinedMode = prototypeMode === "combined";
  const nextModeKey = isContactsMode ? "contacts" : "modified";

  modeColumnHeader.dataset.sortKey = nextModeKey;
  modeColumnLabel.textContent = isContactsMode ? "Contacts" : "Modified";
  modeColumnHeader.classList.toggle("right", isContactsMode);
  combinedContactsHeader.hidden = !isCombinedMode;
  syncColumnWidths();

  sortState.columns = sortState.columns.map((column) => {
    if (isContactsMode && column.key === "modified") {
      return { key: nextModeKey, direction: getInitialSortDirection(nextModeKey) };
    }

    if (!isContactsMode && !isCombinedMode && column.key === "contacts") {
      return { key: nextModeKey, direction: getInitialSortDirection(nextModeKey) };
    }

    return column;
  });
}

function renderOwners(rows) {
  tableBody.innerHTML = rows
    .map(
      (owner) => `
        <tr class="${ownerHasVisibleChange(owner) ? "changed" : ""}">
          <td>
            <div class="name-cell">
              <div class="logo">
                <img src="${owner.logoSrc}" alt="${owner.logoAlt}">
              </div>
              <div>
                <div class="owner-name">${owner.ownerName}</div>
                <div class="icons">
                  ${getOwnerIcon("web", owner.hasWebsite)}
                  ${getOwnerIcon("linkedin", owner.hasLinkedin)}
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="contact-name">${owner.contactName}</span>
            <a class="email" href="mailto:${owner.email}">${owner.email}</a>
          </td>
          <td>${owner.franchise}</td>
          <td class="${prototypeMode === "contacts" ? "contacts-mode-cell" : ""}">${getModeColumn(owner)}</td>
          ${
            prototypeMode === "combined"
              ? `<td class="contacts-mode-cell">${getContactsColumn(owner)}</td>`
              : ""
          }
          <td>
            <div class="locations">
              <span>${owner.locations}</span>
              ${showsContactUpdates() ? getAddedBadge(owner.addedLocations) : ""}
              <img class="location-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function getSortValue(owner, key) {
  if (key === "modified") return new Date(owner.modified).getTime();
  if (key === "contacts") return owner.contacts;
  if (key === "locations") return owner.locations;
  if (key === "franchise") return getFranchiseCount(owner);
  return owner[key] || "";
}

function getFranchiseCount(owner) {
  return owner.franchise
    .split(",")
    .map((franchise) => franchise.trim())
    .filter(Boolean).length;
}

function getNameSortGroup(owner) {
  if (owner.hasWebsite && owner.hasLinkedin) return 0;
  if (owner.hasWebsite && !owner.hasLinkedin) return 1;
  if (!owner.hasWebsite && owner.hasLinkedin) return 2;
  return 3;
}

const NUMERIC_SORT_KEYS = new Set(["modified", "contacts", "locations", "contactCount", "unitCount", "franchise"]);

function getInitialSortDirection(sortKey) {
  return "descending";
}

function getSortDirectionMultiplier(sortKey, direction) {
  const isDescending = direction === "descending";
  if (NUMERIC_SORT_KEYS.has(sortKey)) {
    return isDescending ? -1 : 1;
  }

  return isDescending ? 1 : -1;
}

function cycleSortState(sortKey, { additive = false } = {}) {
  const columnIndex = sortState.columns.findIndex((column) => column.key === sortKey);

  if (!additive) {
    if (sortState.columns.length === 1 && columnIndex === 0) {
      const [column] = sortState.columns;
      sortState.columns = column.direction === "descending"
        ? [{ ...column, direction: "ascending" }]
        : [];
    } else {
      sortState.columns = [{ key: sortKey, direction: getInitialSortDirection(sortKey) }];
    }
    return;
  }

  if (columnIndex === -1) {
    sortState.columns.push({ key: sortKey, direction: getInitialSortDirection(sortKey) });
    return;
  }

  const column = sortState.columns[columnIndex];
  if (column.direction === "descending") {
    sortState.columns[columnIndex] = { ...column, direction: "ascending" };
  } else {
    sortState.columns.splice(columnIndex, 1);
  }
}

function getContactsModeSortPriority(owner, sortKey) {
  if (!showsContactUpdates()) return 0;
  if (sortKey === "contacts") return owner.addedContacts > 0 ? 0 : 1;
  return 0;
}

function compareLocationsForCurrentCycle(a, b, direction) {
  const aHasLocationChange = a.addedLocations > 0;
  const bHasLocationChange = b.addedLocations > 0;

  // Initial/default locations sort: pure highest-to-lowest count.
  if (!locationSortCycleActive && direction === "descending") {
    const defaultComparison = b.locations - a.locations;
    if (defaultComparison !== 0) return defaultComparison;
    return a.originalIndex - b.originalIndex;
  }

  if (direction === "ascending") {
    // First click from default: unchanged rows first, then lowest counts.
    if (aHasLocationChange !== bHasLocationChange) {
      return aHasLocationChange ? 1 : -1;
    }
    const ascendingComparison = a.locations - b.locations;
    if (ascendingComparison !== 0) return ascendingComparison;
    return a.originalIndex - b.originalIndex;
  }

  // Next click: changed rows first (low-to-high), unchanged rows high-to-low.
  if (aHasLocationChange !== bHasLocationChange) {
    return aHasLocationChange ? -1 : 1;
  }

  const mixedComparison = aHasLocationChange
    ? a.locations - b.locations
    : b.locations - a.locations;

  if (mixedComparison !== 0) return mixedComparison;
  return a.originalIndex - b.originalIndex;
}

function compareOwnersByColumn(a, b, column, { useLocationCycle = false } = {}) {
  const direction = getSortDirectionMultiplier(column.key, column.direction);

  if (column.key === "ownerName") {
    const groupComparison = getNameSortGroup(a) - getNameSortGroup(b);
    if (groupComparison !== 0) return groupComparison * direction;
    return collator.compare(a.ownerName, b.ownerName) * direction;
  }

  if (column.key === "franchise") {
    const franchiseCountComparison = getFranchiseCount(a) - getFranchiseCount(b);
    if (franchiseCountComparison !== 0) return franchiseCountComparison * direction;
    return collator.compare(a.franchise, b.franchise) * direction;
  }

  if (column.key === "locations" && useLocationCycle) {
    return compareLocationsForCurrentCycle(a, b, column.direction);
  }

  const priorityComparison =
    getContactsModeSortPriority(a, column.key) - getContactsModeSortPriority(b, column.key);
  if (priorityComparison !== 0) return priorityComparison;

  const valueA = getSortValue(a, column.key);
  const valueB = getSortValue(b, column.key);
  const comparison = typeof valueA === "number" && typeof valueB === "number"
    ? valueA - valueB
    : collator.compare(String(valueA), String(valueB));
  return comparison * direction;
}

function sortOwners() {
  if (!sortState.columns.length) {
    displayedOwners = [...owners].sort((a, b) => a.originalIndex - b.originalIndex);
    return;
  }

  const useLocationCycle = sortState.columns.length === 1
    && sortState.columns[0].key === "locations"
    && showsContactUpdates();

  displayedOwners = [...owners].sort((a, b) => {
    for (const column of sortState.columns) {
      const comparison = compareOwnersByColumn(a, b, column, { useLocationCycle });
      if (comparison !== 0) return comparison;
    }

    return a.originalIndex - b.originalIndex;
  });
}

function syncSortHeaders() {
  const showSortPriority = sortState.columns.length > 1;

  sortHeaders.forEach((header) => {
    const content = header.querySelector(".th-content");
    const columnIndex = sortState.columns.findIndex((column) => column.key === header.dataset.sortKey);
    if (columnIndex === -1) {
      header.setAttribute("aria-sort", "none");
      delete header.dataset.sortDirection;
      delete header.dataset.sortPriority;
      if (content) delete content.dataset.sortPriority;
      return;
    }

    const column = sortState.columns[columnIndex];
    header.setAttribute("aria-sort", columnIndex === 0 ? column.direction : "other");
    header.dataset.sortDirection = column.direction;

    if (showSortPriority) {
      header.dataset.sortPriority = String(columnIndex + 1);
      if (content) content.dataset.sortPriority = String(columnIndex + 1);
    } else {
      delete header.dataset.sortPriority;
      if (content) delete content.dataset.sortPriority;
    }
  });
}

function updateHeaderState() {
  const updatedCount = owners.filter((owner) => ownerHasVisibleChange(owner)).length;
  const totalCount = owners.length;
  const hasUpdates = updatedCount > 0;
  const baseLabel = hasUpdates
    ? `${updatedCount} of ${totalCount} records updated`
    : `${totalCount} records up to date`;

  subtitle.textContent = hasUpdates && subtitleHovering
    ? `${baseLabel} - ${changesVisible ? "Hide updates" : "Show updates"}`
    : baseLabel;

  subtitle.classList.toggle("is-resolved", !hasUpdates);
  subtitle.classList.toggle("is-clickable", hasUpdates);
  changeNav.hidden = !hasUpdates || !changesVisible;
  markRead.hidden = !hasUpdates || !changesVisible;
  pager.hidden = !hasUpdates || !changesVisible;
}

function applySort() {
  changeNavEngaged = false;
  clearTimeout(activeHighlightTimeout);
  sortOwners();
  renderOwners(displayedOwners);
  refreshChangedRows();
  syncSortHeaders();
  updateHeaderState();

  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
  }
}

function refreshChangedRows() {
  changedRows = Array.from(document.querySelectorAll("tr.changed"));
  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
    return;
  }
  if (changeNavEngaged) {
    activeIndex = Math.min(activeIndex, changedRows.length - 1);
    setChangePositionLabel(`${activeIndex + 1} / ${changedRows.length}`);
  } else {
    setChangePositionLabel(`0 / ${changedRows.length}`);
  }
}

function advanceChangeRow(delta) {
  if (!changesVisible) {
    setChangePositionLabel("0 / 0");
    return;
  }

  if (!changedRows.length) {
    setChangePositionLabel("0 / 0");
    return;
  }

  if (!changeNavEngaged) {
    changeNavEngaged = true;
    activeIndex = delta > 0 ? 0 : changedRows.length - 1;
  } else {
    activeIndex = (activeIndex + delta + changedRows.length) % changedRows.length;
  }

  changedRows.forEach((row) => {
    row.classList.remove("is-active");
  });

  const activeRow = changedRows[activeIndex];
  activeRow.classList.add("is-active");
  clearTimeout(activeHighlightTimeout);
  activeHighlightTimeout = setTimeout(() => {
    activeRow.classList.remove("is-active");
  }, ACTIVE_HIGHLIGHT_FADE_MS);

  setChangePositionLabel(`${activeIndex + 1} / ${changedRows.length}`);

  const wrapRect = tableWrap.getBoundingClientRect();
  const rowRect = activeRow.getBoundingClientRect();
  const offset = rowRect.top - wrapRect.top + tableWrap.scrollTop;
  const target = offset - tableWrap.clientHeight / 2 + activeRow.offsetHeight / 2;

  tableWrap.scrollTo({
    top: target,
    behavior: "smooth"
  });
}

sortHeaders.forEach((header) => {
  header.addEventListener("click", (event) => {
    const { sortKey } = header.dataset;
    const isAdditiveSort = event.metaKey || event.ctrlKey;
    const wasSingleDescendingLocations = !isAdditiveSort
      && sortState.columns.length === 1
      && sortState.columns[0].key === "locations"
      && sortState.columns[0].direction === "descending"
      && sortKey === "locations";

    cycleSortState(sortKey, { additive: isAdditiveSort });

    if (sortState.columns.length !== 1 || sortState.columns[0].key !== "locations") {
      locationSortCycleActive = false;
    } else if (wasSingleDescendingLocations) {
      locationSortCycleActive = true;
    }

    applySort();
    tableWrap.scrollTo({ top: 0, behavior: "auto" });
  });
});

if (prototypeModeSelect) {
  prototypeModeSelect.addEventListener("change", () => {
    prototypeMode = prototypeModeSelect.value;
    syncModeColumn();
    applySort();
    tableWrap.scrollTo({ top: 0, behavior: "auto" });
  });
}

syncChangesVisibilityToggle();
syncModeColumn();
applySort();

if (subtitle) {
  subtitle.addEventListener("mouseenter", () => {
    subtitleHovering = true;
    updateHeaderState();
  });

  subtitle.addEventListener("mouseleave", () => {
    subtitleHovering = false;
    updateHeaderState();
  });

  subtitle.addEventListener("click", () => {
    const hasUpdates = owners.some((owner) => ownerHasVisibleChange(owner));
    if (!hasUpdates) return;

    changesVisible = !changesVisible;
    syncChangesVisibilityToggle();
    updateHeaderState();
  });
}

markRead.addEventListener("click", () => {
  owners.forEach((owner) => {
    if (showsContactUpdates()) {
      owner.addedContacts = 0;
      owner.addedLocations = 0;
    }

    if (prototypeMode === "modified" || prototypeMode === "combined") {
      owner.changed = false;
    }
  });
  applySort();
});

if (changesToggleOption) {
  changesToggleOption.addEventListener("click", (event) => {
    event.preventDefault();
    changesVisible = !changesVisible;
    syncChangesVisibilityToggle();
    targetToolbarMenuDropdown?.removeAttribute("open");
  });
}

prev.addEventListener("click", () => advanceChangeRow(-1));
next.addEventListener("click", () => advanceChangeRow(1));

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
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
    closeToolbarDropdowns();
    return;
  }
  if (event.key === "ArrowLeft") advanceChangeRow(-1);
  if (event.key === "ArrowRight") advanceChangeRow(1);
});
