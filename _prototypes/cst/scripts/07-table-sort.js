function getOwnerIcon(type, enabled, href, ownerName, tooltipText) {
  const color = enabled ? activeIconColor : inactiveIconColor;
  const iconLabel = type === "web" ? "website" : "LinkedIn";
  const iconMarkup = type === "web"
    ? `
      <svg class="icon icon-web" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path fill="${color}" d="M10,11.28h-4.01c.38,1.6,1.06,3.11,2,4.45.94-1.34,1.62-2.85,2-4.45ZM4.35,4.72c.35-1.67.99-3.27,1.88-4.72C3.75.58,1.69,2.33.67,4.72h3.67ZM5.6,8c0,.55.04,1.1.1,1.64h4.6c.07-.54.1-1.09.1-1.64,0-.55-.04-1.1-.1-1.64h-4.6c-.07.54-.1,1.09-.1,1.64ZM11.65,4.72h3.67c-1.02-2.39-3.08-4.13-5.56-4.72.89,1.45,1.53,3.04,1.88,4.72ZM6,4.72h4.01c-.38-1.6-1.06-3.11-2-4.45-.94,1.34-1.62,2.85-2,4.45ZM11.65,11.28c-.35,1.67-.99,3.27-1.88,4.72,2.47-.58,4.54-2.33,5.56-4.72h-3.67ZM11.91,6.36c.06.55.09,1.09.09,1.64,0,.55-.03,1.1-.09,1.64h3.93c.22-1.08.22-2.2,0-3.28h-3.93ZM4.35,11.28H.67c1.02,2.39,3.08,4.13,5.56,4.72-.89-1.45-1.53-3.04-1.88-4.72ZM4.09,9.64c-.06-.55-.09-1.09-.09-1.64,0-.55.03-1.1.09-1.64H.16c-.22,1.08-.22,2.2,0,3.28h3.93Z"/>
      </svg>
    `
    : `
      <svg class="icon icon-linkedin" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path fill="${color}" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0ZM6.78,13h-1.78v-5.98h1.78v5.98ZM5.92,6.2c-.59,0-1.07-.4-1.07-.99s.48-1.08,1.07-1.08,1,.48,1,1.08-.41.99-1,.99ZM13.51,13h-1.85v-2.91c0-.69-.01-1.59-.96-1.59s-1.11.76-1.11,1.54v2.96h-1.85v-5.98h1.78v.82h.03c.25-.47.85-.97,1.76-.97,1.87,0,2.22,1.24,2.22,2.85v3.28Z"/>
      </svg>
    `;

  if (!enabled) {
    return `<span class="owner-icon-link is-disabled" aria-hidden="true">${iconMarkup}</span>`;
  }

  return `
    <a
      class="owner-icon-link"
      href="${href}"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Open ${iconLabel} for ${ownerName}"
      data-tooltip="${tooltipText}"
    >
      ${iconMarkup}
    </a>
  `;
}

function getOwnerIcons(owner) {
  const website = getOwnerWebsite(owner);
  const websiteUrl = getOwnerWebsiteUrl(owner);
  const linkedinUrl = getOwnerLinkedinUrl(owner);
  const websiteTooltip = owner.hasWebsite ? website.replace(/^www\./, "") : "Website unavailable";
  const linkedinTooltip = owner.hasLinkedin ? owner.ownerName : "LinkedIn unavailable";

  return `
    <div class="icons owner-icons" role="group" aria-label="${owner.ownerName} links">
      ${getOwnerIcon("web", owner.hasWebsite, websiteUrl, owner.ownerName, websiteTooltip)}
      ${getOwnerIcon("linkedin", owner.hasLinkedin, linkedinUrl, owner.ownerName, linkedinTooltip)}
    </div>
  `;
}

function getContactsColumn(owner) {
  return `
    <button
      class="ui-control ui-row-action contacts-action ${activeRawOwnerIndex === owner.originalIndex ? "is-active" : ""}"
      type="button"
      data-owner-index="${owner.originalIndex}"
      aria-pressed="${activeRawOwnerIndex === owner.originalIndex}"
      aria-label="Show ${owner.ownerName} contacts"
    >
      <span>${getOwnerContactCount(owner)}</span>
      <img class="contact-chevron" src="assets/arrows.svg" alt="" aria-hidden="true">
    </button>
  `;
}

function getFranchiseLogosColumn(owner, { showNames = false, containerTag = "div" } = {}) {
  const franchises = getOwnerFranchises(owner);

  if (!franchises.length) {
    return `<span class="franchise-text">${owner.franchise}</span>`;
  }

  return `
    <${containerTag} class="franchise-logos ${showNames ? "franchise-logos-with-names" : ""}" role="list" aria-label="${franchises.join(", ")}">
      ${franchises.map((franchise) => `
        <span class="franchise-item" role="listitem" aria-label="${franchise}">
          <span
            class="ui-tile franchise-logo"
            data-tooltip="${franchise}"
          >
            <span class="franchise-logo-fallback">${getInitials(franchise)}</span>
            <img
              src="${getFranchiseLogoSrc(franchise)}"
              alt=""
              onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
            >
          </span>
          ${showNames ? `<span class="franchise-name">${franchise}</span>` : ""}
        </span>
      `).join("")}
    </${containerTag}>
  `;
}

function getLocationOrganizationColumn(row) {
  const owner = row.owner;

  return `
    <span class="location-organization-cell">
      <span class="ui-tile logo location-organization-logo" aria-hidden="true">
        <span class="owner-logo-fallback">${getInitials(owner.ownerName)}</span>
        <img
          src="${owner.logoSrc}"
          alt=""
          onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
        >
      </span>
      <span class="location-table-value location-table-organization">${owner.ownerName}</span>
    </span>
  `;
}

function getLocationCellProfileAction(row, content, label) {
  return `
    <button
      class="ui-control contact-profile-action location-cell-action"
      type="button"
      data-owner-index="${row.ownerIndex}"
      data-unit-index="${row.unitIndex}"
      aria-label="${label}"
    >
      ${content}
    </button>
  `;
}

function syncReduceMotionToggleOption() {
  if (!reduceMotionToggleOption) return;
  reduceMotionToggleOption.setAttribute("aria-checked", String(reduceMotionEnabled));
}

function syncReduceMotionStateClass() {
  document.body.classList.toggle("reduce-motion", reduceMotionEnabled);
}

function getProjectNamePrefix() {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const projectSegment = pathSegments[pathSegments.length - 2] || "project";
  return projectSegment.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
}

function getScreenshotFileName() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${getProjectNamePrefix()}-viewport-screenshot-${date}-${time}.jpg`;
}

function ensureScreenshotToast() {
  let toast = document.getElementById("screenshotToast");
  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "screenshotToast";
  toast.className = "screenshot-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.append(toast);
  return toast;
}

function showScreenshotToast(message, isError = false) {
  const toast = ensureScreenshotToast();
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");

  if (screenshotToastTimeout) {
    clearTimeout(screenshotToastTimeout);
  }

  screenshotToastTimeout = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function downloadCanvasAsJpeg(canvas, fileName) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas export failed."));
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          const downloadLink = document.createElement("a");
          downloadLink.href = objectUrl;
          downloadLink.download = fileName;
          document.body.append(downloadLink);
          downloadLink.click();
          downloadLink.remove();
          URL.revokeObjectURL(objectUrl);
          resolve();
        },
        "image/jpeg",
        0.92
      );
    } catch (error) {
      reject(error);
    }
  });
}

function shouldIgnoreInSafeScreenshot(element) {
  if (element instanceof HTMLCanvasElement) return true;
  if (!element.classList) return false;
  if (element.classList.contains("mapboxgl-canvas")) return true;
  if (element.classList.contains("mapboxgl-canvas-container")) return true;
  return Boolean(element.closest?.(".mapboxgl-map"));
}

async function takeViewportScreenshot() {
  if (screenshotInProgress) return;

  if (typeof window.html2canvas !== "function") {
    console.error("Take screenshot failed: html2canvas is unavailable.");
    showScreenshotToast("Screenshot failed", true);
    return;
  }

  screenshotInProgress = true;
  if (takeScreenshotOption) {
    takeScreenshotOption.disabled = true;
  }

  if (toolbarDropdown?.open) {
    toolbarDropdown.removeAttribute("open");
  }

  await new Promise((resolve) => requestAnimationFrame(resolve));
  const fileName = getScreenshotFileName();

  try {
    if (window.location.protocol === "file:") {
      showScreenshotToast("Open via localhost for full screenshot", true);
      console.warn("Full screenshots require opening the prototype through a local server, not file://.");
      return;
    }

    const baseOptions = {
      backgroundColor: "#ffffff",
      useCORS: true,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    let canvas = await window.html2canvas(document.body, baseOptions);
    let usedSafeFallback = false;
    try {
      await downloadCanvasAsJpeg(canvas, fileName);
    } catch (exportError) {
      // Map tiles/cross-origin canvases can taint captures. Retry excluding all canvases/map layers.
      canvas = await window.html2canvas(document.body, {
        ...baseOptions,
        ignoreElements: shouldIgnoreInSafeScreenshot
      });
      usedSafeFallback = true;
      await downloadCanvasAsJpeg(canvas, fileName);
    }
    showScreenshotToast(usedSafeFallback ? "Screenshot saved (map excluded)" : "Screenshot saved");
  } catch (error) {
    console.error("Take screenshot failed:", error);
    showScreenshotToast("Screenshot failed", true);
  } finally {
    screenshotInProgress = false;
    if (takeScreenshotOption) {
      takeScreenshotOption.disabled = false;
    }
  }
}

function syncColumnWidths() {
  ownerColumnHeader.style.width = columnWidths.owner;
  contactColumnHeader.style.width = columnWidths.contact;
  franchiseColumnHeader.style.width = columnWidths.franchise;
  locationsColumnHeader.style.width = columnWidths.locations;

  if (combinedContactsHeader) {
    combinedContactsHeader.style.width = columnWidths.contacts;
  }
}

const prospectDatasetTableOptions = Object.entries(window.prospectDatasetsData || {}).reduce(
  (options, [view, dataset]) => ({
    ...options,
    [view]: {
      label: dataset.label || view,
      icon: "assets/dataset.svg?v=2"
    }
  }),
  {}
);
const TABLE_VIEW_OPTIONS = {
  owners: {
    label: "Owners",
    icon: "assets/owners.svg"
  },
  locations: {
    label: "Locations",
    icon: "assets/dataset.svg?v=2"
  },
  ...prospectDatasetTableOptions
};
const DATASET_TABLE_VIEWS = new Set(["locations", ...Object.keys(prospectDatasetTableOptions)]);

function isDatasetTableView(tableView = currentTableView) {
  return DATASET_TABLE_VIEWS.has(tableView);
}

const LOCATION_TABLE_HEADERS = [
  { header: locationNumberColumnHeader, label: "", sortKey: "", width: "64px" },
  { header: ownerColumnHeader, label: "Name", sortKey: "contactName", width: "220px" },
  { header: contactColumnHeader, label: "Location", sortKey: "location", width: "220px" },
  { header: combinedContactsHeader, label: "Contact email", sortKey: "email", width: "220px" },
  { header: locationsColumnHeader, label: "Phone", sortKey: "phone", width: "220px" },
  { header: franchiseColumnHeader, label: "Franchise", sortKey: "franchise", width: "220px" },
  { header: organizationColumnHeader, label: "Institution", sortKey: "ownerName", width: "220px" },
  { header: categoryColumnHeader, label: "Category", sortKey: "category", width: "200px" }
].filter((config) => config.header);

function getLocationSelectionState(rows = displayedLocations) {
  const selectedCount = rows.reduce((count, row) => (
    selectedLocationRowIds.has(row.id) ? count + 1 : count
  ), 0);
  const totalCount = rows.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const partiallySelected = selectedCount > 0 && selectedCount < totalCount;

  return {
    totalCount,
    selectedCount,
    allSelected,
    partiallySelected
  };
}

function getLocationSelectAllHeaderMarkup(rows = displayedLocations) {
  const { allSelected } = getLocationSelectionState(rows);

  return `
    <label class="location-row-select location-select-all" aria-label="Select all location rows">
      <input
        class="location-row-checkbox location-select-all-checkbox"
        type="checkbox"
        ${allSelected ? "checked" : ""}
      >
      <span class="location-row-checkbox-visual" aria-hidden="true"></span>
    </label>
  `;
}

function syncLocationHeaderCheckboxState(rows = displayedLocations) {
  const selectAllLabel = locationNumberColumnHeader?.querySelector(".location-select-all");
  const selectAllCheckbox = locationNumberColumnHeader?.querySelector(".location-select-all-checkbox");
  if (!(selectAllLabel instanceof HTMLLabelElement) || !(selectAllCheckbox instanceof HTMLInputElement)) return;

  const { allSelected, partiallySelected } = getLocationSelectionState(rows);
  selectAllCheckbox.checked = allSelected;
  selectAllCheckbox.indeterminate = partiallySelected;
  selectAllLabel.classList.toggle("is-indeterminate", partiallySelected);
}

function getSortableHeaderMarkup(label) {
  return `<span class="th-content">${label} <img class="th-chevron" src="assets/chevron.svg" alt="" aria-hidden="true"></span>`;
}

function setMainTableHeader(header, { label, sortKey, width }) {
  header.hidden = false;
  header.style.width = width;

  if (sortKey) {
    header.className = "sortable-header";
    header.dataset.sortKey = sortKey;
    header.setAttribute("aria-sort", "none");
    header.innerHTML = getSortableHeaderMarkup(label);
  } else {
    header.className = "location-number-header";
    header.removeAttribute("data-sort-key");
    header.removeAttribute("aria-sort");
    header.innerHTML = getLocationSelectAllHeaderMarkup();
  }
}

function syncLocationTableView() {
  restoreOwnersTableView({ clearRaw: false, clearGlobalRaw: false });
  ownersTable?.classList.add("locations-table");
  tableWrap?.classList.add("is-locations-view");
  LOCATION_TABLE_HEADERS.forEach((config) => setMainTableHeader(config.header, config));
}

function syncOwnersTableView() {
  restoreOwnersTableView({ clearRaw: false, clearGlobalRaw: false });
  ownersTable?.classList.remove("locations-table");
  tableWrap?.classList.remove("is-locations-view");
}

function syncTableSwitcherState() {
  const tableView = TABLE_VIEW_OPTIONS[currentTableView] || TABLE_VIEW_OPTIONS.owners;
  const isDatasetView = isDatasetTableView();
  if (tableSwitcherIcon) {
    tableSwitcherIcon.src = tableView.icon;
  }
  if (tableSwitcherLabel) {
    tableSwitcherLabel.textContent = tableView.label;
  }
  tableSwitcherOptions.forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.tableView === currentTableView));
  });
  tableDatasetsSubmenuTrigger?.setAttribute(
    "data-dataset-connected",
    String(isDatasetView)
  );
  tableSwitcherDropdown?.setAttribute("data-dataset-active", String(isDatasetView));
}

function setMainTableView(nextView) {
  if (!TABLE_VIEW_OPTIONS[nextView] || nextView === currentTableView) {
    tableSwitcherDropdown?.removeAttribute("open");
    return;
  }

  tableSortStates[currentTableView] = { ...sortState };
  currentTableView = nextView;
  sortState = { ...tableSortStates[currentTableView] };
  if (isDatasetTableView()) {
    locationsVisibleCount = LOCATION_TABLE_PAGE_SIZE;
  }
  syncTableSwitcherState();
  applySort();
  tableWrap?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  tableSwitcherDropdown?.removeAttribute("open");
}

function renderOwners(rows) {
  syncOwnersTableView();
  const isEmpty = rows.length === 0;

  tableWrap?.classList.toggle("is-empty", isEmpty);
  if (tableEmptyState) {
    tableEmptyState.hidden = !isEmpty;
  }

  tableBody.innerHTML = rows
    .map(
      (owner) => {
        const hasSavedLead = savedLeadOwnerIndexes.has(owner.originalIndex);
        const isContactHidden = hiddenContactOwnerIndexes.has(owner.originalIndex);

        return `
        <tr
          class="${activeDetailOwnerIndex === owner.originalIndex || activeOrgOwnerIndex === owner.originalIndex || activeMapOwnerIndex === owner.originalIndex || activeRawOwnerIndex === owner.originalIndex ? "is-selected" : ""}"
          data-owner-index="${owner.originalIndex}"
        >
          <td>
            <div class="name-cell">
              <div class="ui-tile logo">
                <span class="owner-logo-fallback">${getInitials(owner.ownerName)}</span>
                <img
                  src="${owner.logoSrc}"
                  alt="${owner.logoAlt}"
                  onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
                >
              </div>
              <div class="owner-meta">
                <div class="owner-name">${owner.ownerName}</div>
                ${getOwnerIcons(owner)}
              </div>
            </div>
          </td>
          <td class="contact-cell">
            <div class="contact-cell-action ${hasSavedLead ? "is-lead-saved" : ""} ${isContactHidden ? "is-contact-hidden" : ""}">
              <button
                class="ui-control contact-profile-action"
                type="button"
                data-owner-index="${owner.originalIndex}"
                aria-label="Open profile for ${owner.contactName}"
              >
                <span class="contact-profile-text">
                  <span class="contact-name">${owner.contactName}</span>
                  <span class="ui-link ui-ellipsis email">${owner.email}</span>
                </span>
              </button>
              <div class="contact-row-actions">
                <button
                  class="ui-control contact-hide-results-action ${isContactHidden ? "is-hidden" : ""}"
                  type="button"
                  data-owner-index="${owner.originalIndex}"
                  aria-label="${isContactHidden ? `Show ${owner.contactName} in results` : `Hide ${owner.contactName} from results`}"
                  data-tooltip="${isContactHidden ? "Show in results" : "Hide from results"}"
                ></button>
                <button
                  class="ui-control contact-add-lead-action ${hasSavedLead ? "is-saved" : ""}"
                  type="button"
                  data-owner-index="${owner.originalIndex}"
                  aria-label="${hasSavedLead ? `Remove ${owner.contactName} from leads` : `Save ${owner.contactName} as a lead`}"
                  data-tooltip="${hasSavedLead ? "Remove from leads" : "Save as lead"}"
                ></button>
              </div>
            </div>
          </td>
          <td class="contacts-mode-cell">${getContactsColumn(owner)}</td>
          <td class="units-mode-cell">
            <button
              class="ui-control ui-row-action locations ${activeMapOwnerIndex === owner.originalIndex ? "is-active" : ""}"
              type="button"
              data-owner-index="${owner.originalIndex}"
              aria-pressed="${activeMapOwnerIndex === owner.originalIndex}"
              aria-label="Show ${owner.ownerName} locations on the map"
            >
              <span>${getOwnerUnitCount(owner)}</span>
              <img class="location-chevron" src="assets/arrows.svg" alt="" aria-hidden="true">
            </button>
          </td>
          <td>${getFranchiseLogosColumn(owner)}</td>
        </tr>
      `;
      }
    )
    .join("");
}

function getOwnerLocationRows(owner) {
  const ownerLocationData = window.ownerLocationsData?.[owner.originalIndex];
  const ownerUnits = Array.isArray(ownerLocationData?.units) ? ownerLocationData.units : [];
  const ownerFranchises = getOwnerFranchises(owner);
  const fallbackFranchise = ownerFranchises[0] || "Franchise";
  const fallbackCategory = owner.category || "Fitness";

  return ownerUnits.map((unit, unitIndex) => {
    const franchise = unit.franchise || fallbackFranchise;
    const category = unit.category || fallbackCategory;
    return {
      id: unit.id || `${owner.originalIndex}-${unitIndex}`,
      owner,
      ownerIndex: owner.originalIndex,
      unitIndex,
      sourceView: "locations",
      isProspectDataset: false,
      name: unit.name || "",
      email: unit.email || "",
      phone: unit.phone || "",
      location: unit.label || [unit.city, unit.state].filter(Boolean).join(", "),
      institution: owner.ownerName,
      address: unit.address || "",
      city: unit.city || "",
      state: unit.state || "",
      category,
      categories: [category],
      franchise,
      franchises: [franchise]
    };
  });
}

function getDatasetValueList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDatasetCellValue(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function getProspectDatasetRows(tableView = currentTableView) {
  const dataset = window.prospectDatasetsData?.[tableView];
  const rows = Array.isArray(dataset?.rows) ? dataset.rows : [];

  return rows.map((row, rowIndex) => {
    const franchise = normalizeDatasetCellValue(row.franchise);
    const category = normalizeDatasetCellValue(row.category);

    return {
      id: normalizeDatasetCellValue(row.id) || `${tableView}-${rowIndex}`,
      sourceView: tableView,
      isProspectDataset: true,
      rowIndex,
      name: normalizeDatasetCellValue(row.name),
      email: normalizeDatasetCellValue(row.email),
      phone: normalizeDatasetCellValue(row.phone),
      location: normalizeDatasetCellValue(row.location),
      franchise,
      institution: normalizeDatasetCellValue(row.institution),
      category,
      categories: category ? [category] : [],
      franchises: getDatasetValueList(row.franchise)
    };
  });
}

function getLocationSearchIndex(row) {
  return [
    row.location,
    row.address,
    row.city,
    row.state,
    row.name,
    row.email,
    row.phone,
    row.category,
    row.franchise,
    row.institution,
    row.owner?.ownerName,
    row.owner?.contactName,
    row.owner?.email,
    row.owner?.franchise
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim().toLocaleLowerCase())
    .filter(Boolean)
    .join(" ");
}

function locationRowMatchesSearchQuery(row) {
  if (!searchQuery) return true;
  return getLocationSearchIndex(row).includes(searchQuery);
}

function ownerMatchesLocationTableFilters(owner) {
  if (!ownerMatchesOwnerFilter(owner)) return false;
  if (!ownerMatchesUnitsFilter(owner)) return false;
  if (!ownerMatchesContactsFilter(owner)) return false;
  return true;
}

function getAllLocationRows() {
  if (currentTableView !== "locations") {
    return getProspectDatasetRows(currentTableView);
  }

  return owners.flatMap((owner) => getOwnerLocationRows(owner));
}

function getFilteredLocationRows() {
  if (currentTableView !== "locations") {
    return getProspectDatasetRows(currentTableView)
      .filter((row) => unitRowMatchesFilters(row))
      .filter((row) => locationRowMatchesSearchQuery(row));
  }

  return owners
    .filter(ownerMatchesLocationTableFilters)
    .flatMap((owner) => getOwnerLocationRows(owner))
    .filter((row) => unitRowMatchesFilters(row))
    .filter((row) => locationRowMatchesSearchQuery(row));
}

function getLocationSortValue(row, key) {
  if (key === "ownerName") return row.institution || row.owner?.ownerName || "";
  if (key === "contactName") return row.name;
  if (key === "email") return row.email;
  if (key === "franchise") return row.franchise;
  if (key === "category") return row.category;
  if (key === "phone") return row.phone;
  return row.location;
}

function getLocationRowOrder(row) {
  if (Number.isFinite(row.ownerIndex) && Number.isFinite(row.unitIndex)) {
    return row.ownerIndex * 100000 + row.unitIndex;
  }

  return Number.isFinite(row.rowIndex) ? row.rowIndex : 0;
}

function sortLocations() {
  const filteredLocations = getFilteredLocationRows();

  if (!sortState.key) {
    displayedLocations = filteredLocations.sort((a, b) => (
      getLocationRowOrder(a) - getLocationRowOrder(b)
    ));
    return;
  }

  const direction = sortState.direction === "ascending" ? 1 : -1;
  displayedLocations = filteredLocations.sort((a, b) => {
    const valueA = getLocationSortValue(a, sortState.key);
    const valueB = getLocationSortValue(b, sortState.key);
    const comparison = collator.compare(String(valueA), String(valueB));

    if (comparison === 0) {
      return getLocationRowOrder(a) - getLocationRowOrder(b);
    }

    return comparison * direction;
  });
}

function getLocationVisibleCount(totalRows) {
  if (!totalRows) {
    return 0;
  }

  locationsVisibleCount = Math.min(
    Math.max(locationsVisibleCount, LOCATION_TABLE_PAGE_SIZE),
    totalRows
  );

  return locationsVisibleCount;
}

function getLocationPaginationMarkup(totalRows) {
  const visibleCount = getLocationVisibleCount(totalRows);
  const remaining = totalRows - visibleCount;
  if (remaining <= 0) return "";

  const nextBatch = Math.min(LOCATION_TABLE_PAGE_SIZE, remaining);

  return `
    <tr class="location-pagination-row" data-location-load-more tabindex="0" role="button" aria-label="Load ${nextBatch.toLocaleString()} more records">
      <td class="location-pagination-cell" colspan="${LOCATION_TABLE_HEADERS.length}">
        <span class="location-pagination">
          <span class="location-pagination-status">Viewing ${visibleCount.toLocaleString()} of ${totalRows.toLocaleString()} records</span>
          <span class="location-pagination-separator" aria-hidden="true">&ndash;</span>
          <span class="location-pagination-action">Load ${nextBatch.toLocaleString()} more</span>
        </span>
      </td>
    </tr>
  `;
}

function scrollToLocationRow(rowIndex) {
  if (!tableWrap) return;

  const row = tableBody?.querySelector(`tr[data-location-row-index="${rowIndex}"]`);
  if (!(row instanceof HTMLTableRowElement)) return;

  const headerHeight = ownersTable?.querySelector("thead")?.offsetHeight || 0;
  const scrollTop = Math.max(row.offsetTop - headerHeight, 0);
  tableWrap.scrollTo({
    top: scrollTop,
    behavior: reduceMotionEnabled ? "auto" : "smooth"
  });
}

function loadMoreLocationRows() {
  if (locationsVisibleCount >= displayedLocations.length) return;

  const firstNewRowIndex = locationsVisibleCount;
  locationsVisibleCount = Math.min(
    locationsVisibleCount + LOCATION_TABLE_PAGE_SIZE,
    displayedLocations.length
  );
  renderLocations(displayedLocations);
  syncSortHeaders();
  updateFilterSummary();
  requestAnimationFrame(() => scrollToLocationRow(firstNewRowIndex));
}

function getDatasetCellValueMarkup(value, className = "") {
  const normalizedValue = normalizeDatasetCellValue(value);
  const missingClass = normalizedValue ? "" : " dataset-empty-value";
  const classAttribute = `location-table-value${className ? ` ${className}` : ""}${missingClass}`;

  return `<span class="${classAttribute}">${normalizedValue || "-"}</span>`;
}

function getLocationRowAttributeMarkup(row, pageRowIndex) {
  const attributes = [
    `data-location-row-id="${row.id}"`,
    `data-location-row-index="${pageRowIndex}"`
  ];

  if (Number.isFinite(row.ownerIndex) && Number.isFinite(row.unitIndex)) {
    attributes.push(`data-owner-index="${row.ownerIndex}"`);
    attributes.push(`data-unit-index="${row.unitIndex}"`);
  }

  return attributes.join(" ");
}

function getDatasetNameCellMarkup(row) {
  if (row.isProspectDataset) {
    return getDatasetCellValueMarkup(row.name, "location-table-contact-name");
  }

  return `
    <button
      class="ui-control contact-profile-action location-contact-action"
      type="button"
      data-owner-index="${row.ownerIndex}"
      data-unit-index="${row.unitIndex}"
      aria-label="Open profile for ${row.name}"
    >
      <span class="location-table-value location-table-contact-name">${row.name}</span>
    </button>
  `;
}

function getDatasetFranchiseCellMarkup(row) {
  if (row.isProspectDataset) {
    if (!row.franchises.length) {
      return getDatasetCellValueMarkup("");
    }

    const showNames = row.franchises.length === 1;
    return `
      <span class="dataset-franchise-cell">
        ${getFranchiseLogosColumn(
          { franchises: row.franchises, franchise: row.franchise },
          { showNames, containerTag: "span" }
        )}
      </span>
    `;
  }

  return getLocationCellProfileAction(
    row,
    getFranchiseLogosColumn(
      { ...row.owner, franchises: row.franchises, franchise: row.franchise },
      { showNames: true, containerTag: "span" }
    ),
    `Open profile for ${row.name} from ${row.franchise}`
  );
}

function getDatasetInstitutionCellMarkup(row) {
  if (row.isProspectDataset) {
    return getDatasetCellValueMarkup(row.institution);
  }

  return getLocationCellProfileAction(
    row,
    getLocationOrganizationColumn(row),
    `Open profile for ${row.name} at ${row.owner.ownerName}`
  );
}

function renderLocations(rows) {
  syncLocationTableView();
  const isEmpty = rows.length === 0;
  const visibleCount = getLocationVisibleCount(rows.length);
  const pageRows = rows.slice(0, visibleCount);

  tableWrap?.classList.toggle("is-empty", isEmpty);
  if (tableEmptyState) {
    tableEmptyState.hidden = !isEmpty;
  }

  tableBody.innerHTML = pageRows
    .map((row, pageRowIndex) => {
      const rowNumber = pageRowIndex + 1;
      const isSelected = selectedLocationRowIds.has(row.id);

      return `
        <tr class="${row.isProspectDataset ? "prospect-dataset-row" : ""} ${isSelected ? "is-checked" : ""}" ${getLocationRowAttributeMarkup(row, pageRowIndex)}>
          <td class="location-number-cell">
            <label class="location-row-select" aria-label="Select location row ${rowNumber}">
              <input
                class="location-row-checkbox"
                type="checkbox"
                data-location-row-id="${row.id}"
                ${isSelected ? "checked" : ""}
              >
              <span class="location-row-number" aria-hidden="true">${rowNumber}</span>
              <span class="location-row-checkbox-visual" aria-hidden="true"></span>
            </label>
          </td>
          <td>
            ${getDatasetNameCellMarkup(row)}
          </td>
          <td>
            ${getDatasetCellValueMarkup(row.location)}
          </td>
          <td>${getDatasetCellValueMarkup(row.email, "location-table-email")}</td>
          <td>${getDatasetCellValueMarkup(row.phone, "location-table-phone")}</td>
          <td class="location-inner-hover-cell">
            ${getDatasetFranchiseCellMarkup(row)}
          </td>
          <td class="location-inner-hover-cell">
            ${getDatasetInstitutionCellMarkup(row)}
          </td>
          <td>${getDatasetCellValueMarkup(row.category)}</td>
        </tr>
      `;
    })
    .join("") + getLocationPaginationMarkup(rows.length);

  syncLocationHeaderCheckboxState(rows);
}

function getSortValue(owner, key) {
  if (key === "contacts") return getOwnerContactCount(owner);
  if (key === "locations") return getOwnerUnitCount(owner);
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
  if (sortKey === "contacts" || sortKey === "locations" || sortKey === "franchise") {
    return "descending";
  }

  return "ascending";
}

function ownerHasLocationLabel(owner, locationLabels = selectedLocationLabels) {
  if (!locationLabels.length) return true;

  const ownerLocations = window.ownerLocationsData?.[owner.originalIndex]?.locations || [];
  return ownerLocations.some((location) => locationLabels.includes(location.label));
}

function ownerExcludesLocationLabel(owner, locationLabels = excludedLocationLabels) {
  if (!locationLabels.length) return false;

  const ownerLocations = window.ownerLocationsData?.[owner.originalIndex]?.locations || [];
  return ownerLocations.some((location) => locationLabels.includes(location.label));
}

function getOwnerCategories(owner) {
  if (Array.isArray(owner.categories) && owner.categories.length) {
    return [...new Set(owner.categories.map((value) => String(value).trim()).filter(Boolean))];
  }

  if (typeof owner.category === "string" && owner.category.trim()) {
    return [owner.category.trim()];
  }

  const unitCategories = (window.ownerLocationsData?.[owner.originalIndex]?.units || [])
    .map((unit) => unit.category)
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  if (unitCategories.length) {
    return [...new Set(unitCategories)];
  }

  return ["Fitness"];
}

function ownerMatchesCategoryFilter(owner) {
  const ownerCategories = getOwnerCategories(owner);
  if (ownerCategories.some((category) => excludedCategoryValues.includes(category))) return false;
  if (!selectedCategoryValues.length) return true;
  return ownerCategories.some((category) => selectedCategoryValues.includes(category));
}

function ownerMatchesFranchiseFilter(owner) {
  const ownerFranchises = getOwnerFranchises(owner);
  const hasExcludedFranchise = ownerFranchises.some((franchiseName) => (
    excludedFranchiseIndexes.includes(franchiseName)
  ));
  if (hasExcludedFranchise) return false;
  if (!selectedFranchiseIndexes.length) return true;

  return ownerFranchises.some((franchiseName) => selectedFranchiseIndexes.includes(franchiseName));
}

function unitsFilterIsActive() {
  return selectedUnitsMin !== unitsFilterDefaults.min || selectedUnitsMax !== unitsFilterDefaults.max;
}

function ownerMatchesUnitsFilter(owner) {
  const units = getOwnerUnitCount(owner);
  return Number.isFinite(units) && units >= selectedUnitsMin && units <= selectedUnitsMax;
}

function contactsFilterIsActive() {
  return selectedContactsMin !== contactsFilterDefaults.min || selectedContactsMax !== contactsFilterDefaults.max;
}

function ownerMatchesContactsFilter(owner) {
  const contacts = getOwnerContactCount(owner);
  return Number.isFinite(contacts) && contacts >= selectedContactsMin && contacts <= selectedContactsMax;
}

function getOwnerSearchIndex(owner) {
  const cachedValue = ownerSearchIndexById.get(owner.originalIndex);
  if (cachedValue) return cachedValue;

  const locationData = window.ownerLocationsData?.[owner.originalIndex];
  const locations = Array.isArray(locationData?.locations) ? locationData.locations : [];
  const units = Array.isArray(locationData?.units) ? locationData.units : [];
  const searchTokens = [
    owner.ownerName,
    owner.contactName,
    owner.email,
    owner.franchise,
    owner.category,
    ...(Array.isArray(owner.categories) ? owner.categories : []),
    ...locations.flatMap((location) => [location.label, location.city, location.state, location.address]),
    ...units.flatMap((unit) => [
      unit.name,
      unit.label,
      unit.city,
      unit.state,
      unit.address,
      unit.category,
      unit.franchise,
      unit.email,
      unit.phone
    ])
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim().toLocaleLowerCase())
    .filter(Boolean);
  const indexedText = searchTokens.join(" ");
  ownerSearchIndexById.set(owner.originalIndex, indexedText);
  return indexedText;
}

function ownerMatchesSearchQuery(owner) {
  if (!searchQuery) return true;
  return getOwnerSearchIndex(owner).includes(searchQuery);
}

function rawRowMatchesFilters(row) {
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

function getFilteredOwners() {
  return owners.filter((owner) => {
    if (!ownerMatchesSearchQuery(owner)) return false;
    if (!ownerHasLocationLabel(owner)) return false;
    if (ownerExcludesLocationLabel(owner)) return false;
    if (!ownerMatchesCategoryFilter(owner)) return false;
    if (!ownerMatchesFranchiseFilter(owner)) return false;
    if (!ownerMatchesUnitsFilter(owner)) return false;
    if (!ownerMatchesContactsFilter(owner)) return false;
    return ownerMatchesOwnerFilter(owner);
  });
}

function sortOwners() {
  const filteredOwners = getFilteredOwners();

  if (!sortState.key) {
    displayedOwners = filteredOwners.sort((a, b) => a.originalIndex - b.originalIndex);
    return;
  }

  const direction = sortState.direction === "ascending" ? 1 : -1;

  displayedOwners = filteredOwners.sort((a, b) => {
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

function updateFilterSummary() {
  if (!filterSummary) return;

  const visibleCount = isDatasetTableView()
    ? getLocationVisibleCount(displayedLocations.length)
    : displayedOwners.length;
  const visibleRange = visibleCount > 0 ? `1-${visibleCount}` : "0";
  const totalCount = isDatasetTableView() ? getAllLocationRows().length : owners.length;
  filterSummary.textContent = `Showing ${visibleRange} of ${totalCount} records sorted by relevancy`;
  updateClearFiltersButton();
}

function getAppliedFilterCount() {
  const selectedFilterCount =
    selectedLocationLabels.length +
    excludedLocationLabels.length +
    selectedCategoryValues.length +
    excludedCategoryValues.length +
    selectedOwnerIndexes.length +
    excludedOwnerIndexes.length +
    selectedFranchiseIndexes.length +
    excludedFranchiseIndexes.length;
  const selectedStatusCount = statusFilterInputs.filter((checkbox) => checkbox.checked).length;
  const selectedSearchCount = searchQuery ? 1 : 0;
  const selectedUnitsCount = unitsFilterIsActive() ? 1 : 0;
  const selectedContactsCount = contactsFilterIsActive() ? 1 : 0;

  return selectedFilterCount + selectedStatusCount + selectedSearchCount + selectedUnitsCount + selectedContactsCount;
}

function updateClearFiltersButton() {
  const appliedFilterCount = getAppliedFilterCount();
  const hasAppliedFilters = appliedFilterCount > 0;

  if (clearAllFilters) {
    clearAllFilters.textContent = hasAppliedFilters
      ? `Clear all (${appliedFilterCount})`
      : "Clear all";
    clearAllFilters.setAttribute(
      "aria-label",
      hasAppliedFilters
        ? `Clear all filters (${appliedFilterCount} applied)`
        : "Clear all filters"
    );
  }

  if (filterToggleLabel) {
    filterToggleLabel.textContent = hasAppliedFilters
      ? `Filters (${appliedFilterCount})`
      : "Filters";
  }

  persistViewSettings();
}

function syncSortHeaders() {
  sortHeaders.forEach((header) => {
    const isActive = header.dataset.sortKey === sortState.key;
    header.setAttribute("aria-sort", isActive ? sortState.direction : "none");
  });
}

function renderActiveTable() {
  if (isDatasetTableView()) {
    renderLocations(displayedLocations);
  } else {
    renderOwners(displayedOwners);
  }
}

function applySort() {
  tableSortStates[currentTableView] = { ...sortState };
  if (isDatasetTableView()) {
    sortLocations();
    renderLocations(displayedLocations);
  } else {
    sortOwners();
    renderOwners(displayedOwners);
  }
  syncTableSwitcherState();
  syncSortHeaders();
  updateFilterSummary();
}

function syncStickyNameColumnDivider() {
  if (!tableWrap) return;
  const hasHorizontalOverflow = tableWrap.scrollWidth > tableWrap.clientWidth;
  const hasLeftOverlap = tableWrap.scrollLeft > 0;
  const hasVerticalOverflow = tableWrap.scrollHeight > tableWrap.clientHeight;
  const hasTopOverlap = tableWrap.scrollTop > 0;
  tableWrap.classList.toggle("is-name-column-overlap", hasHorizontalOverflow && hasLeftOverlap);
  tableWrap.classList.toggle("is-header-row-overlap", hasVerticalOverflow && hasTopOverlap);
}

