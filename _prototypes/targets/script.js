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
let sortState = {
  key: "locations",
  direction: "descending"
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

  if (isContactsMode && sortState.key === "modified") {
    sortState.key = nextModeKey;
    sortState.direction = getInitialSortDirection(nextModeKey);
  }

  if (!isContactsMode && !isCombinedMode && sortState.key === "contacts") {
    sortState.key = nextModeKey;
    sortState.direction = getInitialSortDirection(nextModeKey);
  }
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

function getInitialSortDirection(sortKey) {
  if (sortKey === "modified" || sortKey === "contacts" || sortKey === "locations" || sortKey === "franchise") {
    return "descending";
  }

  return "ascending";
}

function getContactsModeSortPriority(owner, sortKey) {
  if (!showsContactUpdates()) return 0;
  if (sortKey === "contacts") return owner.addedContacts > 0 ? 0 : 1;
  return 0;
}

function compareLocationsForCurrentCycle(a, b) {
  const aHasLocationChange = a.addedLocations > 0;
  const bHasLocationChange = b.addedLocations > 0;

  // Initial/default locations sort: pure highest-to-lowest count.
  if (!locationSortCycleActive && sortState.direction === "descending") {
    const defaultComparison = b.locations - a.locations;
    if (defaultComparison !== 0) return defaultComparison;
    return a.originalIndex - b.originalIndex;
  }

  if (sortState.direction === "ascending") {
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

function sortOwners() {
  if (!sortState.key) {
    displayedOwners = [...owners].sort((a, b) => a.originalIndex - b.originalIndex);
    return;
  }

  const direction = sortState.direction === "ascending" ? 1 : -1;

  displayedOwners = [...owners].sort((a, b) => {
    if (sortState.key === "ownerName") {
      const groupComparison = getNameSortGroup(a) - getNameSortGroup(b);

      if (groupComparison !== 0) {
        return groupComparison * direction;
      }

      const nameComparison = collator.compare(a.ownerName, b.ownerName);

      if (nameComparison !== 0) {
        return nameComparison * direction;
      }

      return a.originalIndex - b.originalIndex;
    }

    if (sortState.key === "franchise") {
      const franchiseCountComparison = getFranchiseCount(a) - getFranchiseCount(b);

      if (franchiseCountComparison !== 0) {
        return franchiseCountComparison * direction;
      }

      const franchiseNameComparison = collator.compare(a.franchise, b.franchise);

      if (franchiseNameComparison !== 0) {
        return franchiseNameComparison * direction;
      }

      return a.originalIndex - b.originalIndex;
    }

    if (sortState.key === "locations" && showsContactUpdates()) {
      return compareLocationsForCurrentCycle(a, b);
    }

    const priorityComparison =
      getContactsModeSortPriority(a, sortState.key) - getContactsModeSortPriority(b, sortState.key);

    if (priorityComparison !== 0) {
      return priorityComparison;
    }

    const valueA = getSortValue(a, sortState.key);
    const valueB = getSortValue(b, sortState.key);

    let comparison;

    if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else {
      comparison = collator.compare(String(valueA), String(valueB));
    }

    if (comparison === 0) {
      return a.originalIndex - b.originalIndex;
    }

    return comparison * direction;
  });
}

function syncSortHeaders() {
  sortHeaders.forEach((header) => {
    const isActive = header.dataset.sortKey === sortState.key;
    header.setAttribute("aria-sort", isActive ? sortState.direction : "none");
  });
}

function updateHeaderState() {
  const updatedCount = owners.filter((owner) => ownerHasVisibleChange(owner)).length;
  const totalCount = owners.length;
  const hasUpdates = updatedCount > 0;

  subtitle.textContent = hasUpdates
    ? `${updatedCount} of ${totalCount} records updated`
    : `${totalCount} records up to date`;

  subtitle.classList.toggle("is-resolved", !hasUpdates);
  changeNav.hidden = !hasUpdates;
  markRead.hidden = !hasUpdates;
  pager.hidden = !hasUpdates;
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
  header.addEventListener("click", () => {
    const { sortKey } = header.dataset;

    if (sortState.key === sortKey) {
      if (sortKey === "locations" && showsContactUpdates()) {
        locationSortCycleActive = true;
      }
      sortState.direction = sortState.direction === "ascending" ? "descending" : "ascending";
    } else {
      sortState.key = sortKey;
      sortState.direction = getInitialSortDirection(sortKey);
      locationSortCycleActive = sortKey === "locations" ? false : locationSortCycleActive;
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

syncModeColumn();
applySort();

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

prev.addEventListener("click", () => advanceChangeRow(-1));
next.addEventListener("click", () => advanceChangeRow(1));

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") advanceChangeRow(-1);
  if (event.key === "ArrowRight") advanceChangeRow(1);
});
