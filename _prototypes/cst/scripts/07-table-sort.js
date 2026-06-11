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

function getFranchiseLogosColumn(owner) {
  const franchises = getOwnerFranchises(owner);

  if (!franchises.length) {
    return `<span class="franchise-text">${owner.franchise}</span>`;
  }

  return `
    <div class="franchise-logos" role="list" aria-label="${franchises.join(", ")}">
      ${franchises.map((franchise) => `
        <span
          class="ui-tile franchise-logo"
          role="listitem"
          aria-label="${franchise}"
          data-tooltip="${franchise}"
        >
          <span class="franchise-logo-fallback">${getInitials(franchise)}</span>
          <img
            src="${getFranchiseLogoSrc(franchise)}"
            alt=""
            onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
          >
        </span>
      `).join("")}
    </div>
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

function renderOwners(rows) {
  restoreOwnersTableView({ clearRaw: false, clearGlobalRaw: false });
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

  const visibleCount = displayedOwners.length;
  const totalCount = owners.length;
  const visibleRange = visibleCount > 0 ? `1-${visibleCount}` : "0";
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

function applySort() {
  sortOwners();
  renderOwners(displayedOwners);
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

