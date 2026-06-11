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
      label: "Show owner contacts",
      title: "Contacts",
      icon: "assets/contacts.svg",
      iconClass: "segmented-control-btn-divider-left",
      disabled: rawDataDisabled
    }
  ];

  return `
    <div class="owner-detail-header-actions segmented-control" aria-label="Owner views">
      ${buttons.map((button) => {
        const isActive = isOwnerHeaderViewActive(button.view, ownerIndex);
        const contactsIconClass = button.view === "raw" ? " contacts-toggle-icon" : "";
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
            <img class="toolbar-asset-icon${contactsIconClass}${imageClass}" src="${button.icon}" alt="" aria-hidden="true">
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

function getOwnerMainContactNodeId(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return null;

  const rows = getOwnerRawRows(ownerIndex);
  if (!rows.length) return null;

  const matchingRow = rows.find((row) => row.name === owner.contactName) || rows[0];
  return matchingRow ? matchingRow.nodeId : null;
}

function getContactStateKey(ownerIndex, nodeId) {
  return `${ownerIndex}:${nodeId}`;
}

function resolveContactNodeId(ownerIndex, nodeId) {
  return nodeId != null && nodeId !== "" ? nodeId : getOwnerMainContactNodeId(ownerIndex);
}

// The owner's main contact shares state with the owner-level lead/hide sets so
// the owners table and contacts table stay in sync. Any other contact uses a
// per-node key.
function isOwnerMainContactNode(ownerIndex, nodeId) {
  const resolved = resolveContactNodeId(ownerIndex, nodeId);
  return resolved != null && getOwnerMainContactNodeId(ownerIndex) === resolved;
}

function isContactLeadSaved(ownerIndex, nodeId) {
  if (!Number.isFinite(ownerIndex)) return false;
  if (isOwnerMainContactNode(ownerIndex, nodeId)) {
    return savedLeadOwnerIndexes.has(ownerIndex);
  }
  return savedLeadContactKeys.has(getContactStateKey(ownerIndex, resolveContactNodeId(ownerIndex, nodeId)));
}

function setContactLeadSaved(ownerIndex, nodeId, value) {
  if (!Number.isFinite(ownerIndex)) return;
  if (isOwnerMainContactNode(ownerIndex, nodeId)) {
    if (value) savedLeadOwnerIndexes.add(ownerIndex);
    else savedLeadOwnerIndexes.delete(ownerIndex);
    return;
  }
  const key = getContactStateKey(ownerIndex, resolveContactNodeId(ownerIndex, nodeId));
  if (value) savedLeadContactKeys.add(key);
  else savedLeadContactKeys.delete(key);
}

function toggleContactLeadSaved(ownerIndex, nodeId) {
  const next = !isContactLeadSaved(ownerIndex, nodeId);
  setContactLeadSaved(ownerIndex, nodeId, next);
  return next;
}

function isContactHidden(ownerIndex, nodeId) {
  if (!Number.isFinite(ownerIndex)) return false;
  if (isOwnerMainContactNode(ownerIndex, nodeId)) {
    return hiddenContactOwnerIndexes.has(ownerIndex);
  }
  return hiddenContactKeys.has(getContactStateKey(ownerIndex, resolveContactNodeId(ownerIndex, nodeId)));
}

function setContactHidden(ownerIndex, nodeId, value) {
  if (!Number.isFinite(ownerIndex)) return;
  if (isOwnerMainContactNode(ownerIndex, nodeId)) {
    if (value) hiddenContactOwnerIndexes.add(ownerIndex);
    else hiddenContactOwnerIndexes.delete(ownerIndex);
    return;
  }
  const key = getContactStateKey(ownerIndex, resolveContactNodeId(ownerIndex, nodeId));
  if (value) hiddenContactKeys.add(key);
  else hiddenContactKeys.delete(key);
}

function toggleContactHidden(ownerIndex, nodeId) {
  const next = !isContactHidden(ownerIndex, nodeId);
  setContactHidden(ownerIndex, nodeId, next);
  return next;
}

function getPersonProfileFromRawRow(ownerIndex, rowIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const row = getOwnerRawRows(ownerIndex)[rowIndex];
  if (!owner || !row) return null;

  return {
    ownerIndex,
    nodeId: row.nodeId,
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
    nodeId: null,
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
    nodeId: matchingRow?.nodeId ?? null,
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
  const isLeadSaved = Number.isFinite(profile.ownerIndex) && isContactLeadSaved(profile.ownerIndex, profile.nodeId);
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
      <button class="ui-control ui-button ui-button-primary profile-modal-primary ${isLeadSaved ? "is-saved" : ""}" type="button">${primaryActionLabel}</button>
      <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button">Close</button>
    </div>
  `;
}

const PROFILE_MODAL_CLOSE_DURATION_MS = 320;
let profileModalCloseTimeoutId = null;

function finalizePersonProfileClose() {
  if (!profileModal) return;

  profileModal.classList.remove("is-open", "is-closing");
  profileModal.hidden = true;
  delete profileModal.dataset.ownerIndex;
  delete profileModal.dataset.nodeId;
  if (profileModalContent) profileModalContent.innerHTML = "";
  profileModalCloseTimeoutId = null;

  if (lastProfileModalTrigger instanceof HTMLElement) {
    lastProfileModalTrigger.focus({ preventScroll: true });
  }
  lastProfileModalTrigger = null;
}

function openPersonProfile(profile, trigger = null) {
  if (!profile || !profileModal) return;

  if (profileModalCloseTimeoutId) {
    window.clearTimeout(profileModalCloseTimeoutId);
    profileModalCloseTimeoutId = null;
  }
  profileModal.classList.remove("is-closing");
  lastProfileModalTrigger = trigger;
  if (Number.isFinite(profile.ownerIndex)) {
    profileModal.dataset.ownerIndex = String(profile.ownerIndex);
  } else {
    delete profileModal.dataset.ownerIndex;
  }
  if (profile.nodeId != null) {
    profileModal.dataset.nodeId = String(profile.nodeId);
  } else {
    delete profileModal.dataset.nodeId;
  }
  renderPersonProfile(profile);
  profileModal.hidden = false;
  profileModal.classList.remove("is-open");
  window.requestAnimationFrame(() => {
    if (!profileModal || profileModal.hidden) return;
    profileModal.classList.add("is-open");
  });
  profileModal.querySelector(".profile-modal-close")?.focus();
}

function closePersonProfile() {
  if (!profileModal || profileModal.hidden) return;

  if (profileModalCloseTimeoutId) {
    window.clearTimeout(profileModalCloseTimeoutId);
  }
  profileModal.classList.remove("is-open");
  profileModal.classList.add("is-closing");
  profileModalCloseTimeoutId = window.setTimeout(finalizePersonProfileClose, PROFILE_MODAL_CLOSE_DURATION_MS);
}
