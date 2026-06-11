function getEmailDomain(email) {
  return email.split("@")[1] || "";
}

function getOwnerWebsite(owner) {
  const domain = getEmailDomain(owner.email);
  return domain ? `www.${domain}` : "";
}

function getOwnerWebsiteUrl(owner) {
  const website = getOwnerWebsite(owner);
  return website ? `https://${website}` : "#";
}

function getOwnerLinkedinUrl(owner) {
  return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(owner.ownerName)}`;
}

function getOwnerFranchises(owner) {
  if (Array.isArray(owner.franchises)) {
    return [...new Set(owner.franchises.map((franchise) => String(franchise).trim()).filter(Boolean))];
  }

  const franchises = String(owner.franchise || "")
    .split(",")
    .map((franchise) => franchise.trim())
    .filter(Boolean);

  return [...new Set(franchises)];
}

function getFranchiseSlug(franchiseName) {
  return franchiseName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const franchiseLogoFileOverrides = {
  "Anytime Fitness": "anytime_fitness.svg",
  "F45 Training": "f45_training.svg"
};

function getFranchiseLogoSrc(franchiseName) {
  const logoFileName = franchiseLogoFileOverrides[franchiseName] || `${getFranchiseSlug(franchiseName)}.jpg`;
  return `assets/franchises/${logoFileName}`;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isOwnerHeaderViewActive(view, ownerIndex) {
  const currentMode = getCurrentPanelMode();

  if (view === "details") {
    return currentMode === "details" && activeDetailOwnerIndex === ownerIndex;
  }

  if (view === "map") {
    return currentMode === "map" && activeMapOwnerIndex === ownerIndex;
  }

  if (view === "org") {
    return currentMode === "org" && activeOrgOwnerIndex === ownerIndex;
  }

  if (view === "raw") {
    return globalRawDataViewOpen && activeRawOwnerIndex === ownerIndex;
  }

  return false;
}

function getOwnerHeaderViewControls(owner) {
  const ownerIndex = owner.originalIndex;
  const rawDataDisabled = !isRawDataAvailable(owner);
  const buttons = [
    {
      view: "details",
      label: "Show owner details",
      title: "Details",
      icon: "assets/about.svg",
      iconClass: "",
      imageClass: "about-toggle-icon"
    },
    {
      view: "map",
      label: "Show owner map",
      title: "Map",
      icon: "assets/map.svg",
      iconClass: "segmented-control-btn-divider-left"
    },
    {
      view: "org",
      label: "Show owner organization chart",
      title: "Org chart",
      icon: "assets/orgchart.svg",
      iconClass: "segmented-control-btn-divider-left"
    },
    {
      view: "raw",
      label: "Show owner raw data",
      title: "Raw data",
      icon: "assets/table.svg",
      iconClass: "segmented-control-btn-divider-left",
      disabled: rawDataDisabled
    }
  ];

  return `
    <div class="owner-detail-header-actions segmented-control" aria-label="Owner views">
      ${buttons.map((button) => {
        const isActive = isOwnerHeaderViewActive(button.view, ownerIndex);
        const rawIconClass = button.view === "raw" ? " raw-data-toggle-icon" : "";
        const imageClass = button.imageClass ? ` ${button.imageClass}` : "";
        return `
          <button
            class="ui-control ui-button ui-button-ghost ui-icon-button circle-btn segmented-control-btn owner-header-view-btn ${button.iconClass} ${isActive ? "is-active" : ""}"
            type="button"
            data-owner-header-view="${button.view}"
            data-owner-index="${ownerIndex}"
            aria-label="${button.label}"
            title="${button.title}"
            aria-pressed="${String(isActive)}"
            ${button.disabled ? "disabled aria-disabled=\"true\"" : ""}
          >
            <img class="toolbar-asset-icon${rawIconClass}${imageClass}" src="${button.icon}" alt="" aria-hidden="true">
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function syncOwnerHeaderViewState() {
  const headerButtons = Array.from(document.querySelectorAll(".owner-header-view-btn"));

  headerButtons.forEach((button) => {
    const ownerIndex = Number(button.dataset.ownerIndex);
    const view = button.dataset.ownerHeaderView;
    const isActive = !Number.isNaN(ownerIndex) && isOwnerHeaderViewActive(view, ownerIndex);

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function handleOwnerHeaderViewButton(button) {
  const ownerIndex = Number(button.dataset.ownerIndex);
  const view = button.dataset.ownerHeaderView;
  if (Number.isNaN(ownerIndex) || button.disabled) return;
  if (!["details", "map", "org", "raw"].includes(view)) return;
  if (isOwnerHeaderViewActive(view, ownerIndex)) return;

  if (lockedToolbarMode !== view) {
    lockedToolbarMode = null;
  }
  openSidebar(view, ownerIndex);
}

function getOwnerHeader(owner, { className = "", closeLabel = "Close owner panel", linksToDetail = false } = {}) {
  const logoMarkup = `
    <span class="owner-detail-logo" aria-hidden="true">
      <span>${getInitials(owner.ownerName)}</span>
      <img src="${owner.logoSrc}" alt="" onerror="this.style.display='none'">
    </span>
  `;
  const titleMarkup = `<span>${owner.ownerName}</span>`;
  const identityMarkup = linksToDetail
    ? `
      <button
        class="ui-control owner-header-owner-action owner-header-logo-action"
        type="button"
        data-owner-index="${owner.originalIndex}"
        aria-label="Open ${owner.ownerName} details"
      >
        ${logoMarkup}
      </button>
      <h2>
        <button
          class="ui-control owner-header-owner-action owner-header-name-action"
          type="button"
          data-owner-index="${owner.originalIndex}"
        >
          ${titleMarkup}
        </button>
      </h2>
    `
    : `
      <div class="owner-detail-logo" aria-hidden="true">
        <span>${getInitials(owner.ownerName)}</span>
        <img src="${owner.logoSrc}" alt="" onerror="this.style.display='none'">
      </div>
      <h2>${owner.ownerName}</h2>
    `;

  return `
    <header class="owner-detail-header ${className}">
      ${identityMarkup}
      ${getOwnerHeaderViewControls(owner)}
      <button class="ui-control ui-close-button owner-detail-close" type="button" aria-label="${closeLabel}">
        <img src="assets/close.svg" alt="" aria-hidden="true">
      </button>
    </header>
  `;
}

function syncOwnerMapHeader(mode = getCurrentPanelMode()) {
  if (!ownerMapHeader || !mapPanel) return;

  const owner = activeMapOwnerIndex !== null
    ? owners.find((item) => item.originalIndex === activeMapOwnerIndex)
    : null;
  const shouldShowHeader = mode === "map" && Boolean(owner);

  ownerMapHeader.hidden = !shouldShowHeader;
  mapPanel.classList.toggle("is-owner-map-filtered", shouldShowHeader);
  ownerMapHeader.innerHTML = shouldShowHeader
    ? getOwnerHeader(owner, {
        className: "owner-map-heading",
        closeLabel: "Clear owner map filter",
        linksToDetail: true
      })
    : "";
}

function isRawDataAvailable(owner) {
  return getOwnerRawRows(owner?.originalIndex).length > 0;
}

function getRawDataEmail(name, owner) {
  const domain = getEmailDomain(owner.email) || "example.com";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");

  return `${slug}@${domain}`;
}

function getRawDataPhone(ownerIndex, rowIndex) {
  const areaCodes = ["207", "773", "704", "980", "312", "646"];
  const areaCode = areaCodes[(ownerIndex + rowIndex) % areaCodes.length];
  const prefix = String(555 + ((ownerIndex * 17 + rowIndex * 29) % 350)).padStart(3, "0");
  const line = String(1000 + ((ownerIndex * 137 + rowIndex * 419) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getRawDataLocation(ownerIndex, rowIndex) {
  const locations = [
    "Charlotte, North Carolina",
    "Atlanta, Georgia",
    "Dallas, Texas",
    "Denver, Colorado",
    "Nashville, Tennessee",
    "Orlando, Florida"
  ];

  return locations[(ownerIndex + rowIndex) % locations.length];
}

function getProfileLocation(owner, fallbackLocation, rowIndex = 0) {
  const ownerLocations = window.ownerLocationsData?.[owner.originalIndex]?.locations || [];
  const locationLabels = [
    ...new Set(ownerLocations.map((location) => location.label).filter(Boolean))
  ];

  if (!locationLabels.length) return fallbackLocation;

  return locationLabels[(owner.originalIndex + rowIndex) % locationLabels.length];
}

function getOrgNodeDisplayTitle(node) {
  const title = typeof node?.title === "string" ? node.title.trim() : "";
  return title || "Prospect";
}

function getProfileTitle(owner, node) {
  return getOrgNodeDisplayTitle(node);
}

function getOwnerRawRows(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChart(ownerIndex);
  if (!owner || !orgChart?.nodes?.length) return [];

  return orgChart.nodes.map((node, rowIndex) => ({
    ownerIndex: owner.originalIndex,
    nodeId: node.id,
    rowIndex,
    name: node.name,
    title: getProfileTitle(owner, node),
    ownerNames: [owner.ownerName],
    franchises: getOwnerFranchises(owner),
    location: getProfileLocation(owner, getRawDataLocation(ownerIndex, rowIndex), rowIndex),
    email: getRawDataEmail(node.name, owner),
    phone: getRawDataPhone(ownerIndex, rowIndex)
  }));
}

function getPersonProfileFromRawRow(ownerIndex, rowIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const row = getOwnerRawRows(ownerIndex)[rowIndex];
  if (!owner || !row) return null;

  return {
    ownerIndex,
    name: row.name,
    ownerName: owner.ownerName,
    title: row.title,
    email: row.email,
    phone: row.phone,
    location: row.location
  };
}

function getPersonProfileFromUnitRow(ownerIndex, unitIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const row = getOwnerUnitRows(ownerIndex).find((unitRow) => unitRow.unitIndex === unitIndex);
  if (!owner || !row) return null;

  return {
    ownerIndex,
    name: row.name,
    ownerName: owner.ownerName,
    title: "Operator",
    email: row.email,
    phone: row.phone,
    location: row.location
  };
}

function getPersonProfileFromOrgNode(ownerIndex, nodeId) {
  const rows = getOwnerRawRows(ownerIndex);
  const rowIndex = rows.findIndex((row) => row.nodeId === nodeId);
  return rowIndex >= 0 ? getPersonProfileFromRawRow(ownerIndex, rowIndex) : null;
}

function getPersonProfileFromOwnerContact(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return null;

  const rows = getOwnerRawRows(ownerIndex);
  const matchingRow = rows.find((row) => row.name === owner.contactName) || rows[0] || null;

  return {
    ownerIndex,
    name: owner.contactName || matchingRow?.name || owner.ownerName,
    ownerName: owner.ownerName,
    title: matchingRow?.title || "Prospect",
    email: owner.email || matchingRow?.email || "",
    phone: matchingRow?.phone || getRawDataPhone(ownerIndex, 0),
    location: matchingRow?.location || getProfileLocation(owner, getRawDataLocation(ownerIndex, 0), 0)
  };
}

function renderPersonProfile(profile) {
  if (!profileModalContent) return;
  const isLeadSaved = Number.isFinite(profile.ownerIndex) && savedLeadOwnerIndexes.has(profile.ownerIndex);
  const primaryActionLabel = isLeadSaved ? "Remove from leads" : "Save as lead";

  profileModalContent.innerHTML = `
    <div class="profile-modal-hero">
      <span class="profile-avatar" aria-hidden="true">${getInitials(profile.name)}</span>
      <h2 id="profileModalName">${profile.name}</h2>
      <p>${profile.ownerName}</p>
    </div>

    <div class="profile-modal-fields">
      <div class="profile-modal-field profile-modal-field-full">
        <span>Title</span>
        <strong>${profile.title}</strong>
      </div>
      <div class="profile-modal-field profile-modal-field-full">
        <span>Email</span>
        <a class="ui-link ui-ellipsis" href="mailto:${profile.email}">${profile.email}</a>
      </div>
      <div class="profile-modal-field">
        <span>Phone number</span>
        <strong>${profile.phone}</strong>
      </div>
      <div class="profile-modal-field">
        <span>Location</span>
        <strong>${profile.location}</strong>
      </div>
    </div>

    <div class="profile-modal-actions">
      <button class="ui-control ui-button ui-button-primary profile-modal-primary" type="button">${primaryActionLabel}</button>
      <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button">Close</button>
    </div>
  `;
}

function openPersonProfile(profile, trigger = null) {
  if (!profile || !profileModal) return;

  lastProfileModalTrigger = trigger;
  if (Number.isFinite(profile.ownerIndex)) {
    profileModal.dataset.ownerIndex = String(profile.ownerIndex);
  } else {
    delete profileModal.dataset.ownerIndex;
  }
  renderPersonProfile(profile);
  profileModal.hidden = false;
  profileModal.classList.add("is-open");
  profileModal.querySelector(".profile-modal-close")?.focus();
}

function closePersonProfile() {
  if (!profileModal || profileModal.hidden) return;

  profileModal.classList.remove("is-open");
  profileModal.hidden = true;
  delete profileModal.dataset.ownerIndex;
  if (profileModalContent) profileModalContent.innerHTML = "";

  if (lastProfileModalTrigger instanceof HTMLElement) {
    lastProfileModalTrigger.focus({ preventScroll: true });
  }
  lastProfileModalTrigger = null;
}
