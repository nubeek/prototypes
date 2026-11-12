function getEmailDomain(email) {
  return email.split("@")[1] || "";
}

function getOwnerWebsite(owner) {
  if (owner.website) return owner.website;

  const domain = getEmailDomain(owner.email);
  return domain ? `www.${domain}` : "";
}

function getOwnerWebsiteLabel(owner) {
  const website = getOwnerWebsite(owner);
  if (!website) return "";
  return website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function getOwnerWebsiteUrl(owner) {
  if (owner.websiteUrl) return owner.websiteUrl;

  const website = getOwnerWebsite(owner);
  return website ? `https://${website}` : "#";
}

function getOwnerLinkedinUrl(owner) {
  if (owner.linkedinUrl) return owner.linkedinUrl;

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

function getVisibleOwnerFranchises(owner) {
  const franchises = getOwnerFranchises(owner);
  if (!hideOtherFranchisesIsActive() && !hideOtherCategoriesIsActive()) return franchises;
  return franchises.filter((franchise) => franchiseMatchesVisibleBrandScope(franchise));
}

function getFranchiseSlug(franchiseName) {
  return window.WefranchFilterCombobox.getFranchiseSlug(franchiseName);
}

function getFranchiseLogoSrc(franchiseName) {
  return window.WefranchFilterCombobox.getFranchiseLogoSrc(franchiseName);
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
    return currentMode === "org" && activeOrgOwnerIndex === ownerIndex && orgPanelView !== "contacts";
  }

  if (view === "org-contacts") {
    return currentMode === "org" && activeOrgOwnerIndex === ownerIndex && orgPanelView === "contacts";
  }

  if (view === "raw") {
    return globalRawDataViewOpen && activeRawOwnerIndex === ownerIndex;
  }

  return false;
}

function getOwnerHeaderViewControls(owner, { views } = {}) {
  const ownerIndex = owner.originalIndex;
  const rawDataDisabled = !isRawDataAvailable(owner);
  const buttons = [
    {
      view: "details",
      label: "Show franchisee details",
      title: "Details",
      icon: "../../assets/icons/about.svg",
      imageClass: "about-toggle-icon"
    },
    {
      view: "map",
      label: "Show franchisee map",
      title: "Map",
      icon: "../../assets/icons/map.svg"
    },
    {
      view: "org",
      label: "Show franchisee organization chart",
      title: "Org chart",
      icon: "../../assets/icons/orgchart.svg"
    },
    {
      view: "org-contacts",
      label: "Show franchisee contacts",
      title: "Contacts",
      icon: "../../assets/icons/contacts.svg",
      imageClass: "contacts-toggle-icon"
    },
    {
      view: "raw",
      label: "Show franchisee contacts",
      title: "Contacts",
      icon: "../../assets/icons/contacts.svg",
      imageClass: "contacts-toggle-icon",
      disabled: rawDataDisabled
    }
  ].filter((button) => (views || ["details", "map", "org", "raw"]).includes(button.view));

  return `
    <div class="owner-detail-header-actions segmented-control" aria-label="Franchisee views">
      ${buttons.map((button, index) => {
        const isActive = isOwnerHeaderViewActive(button.view, ownerIndex);
        const imageClass = button.imageClass ? ` ${button.imageClass}` : "";
        const dividerClass = index > 0 ? " segmented-control-btn-divider-left" : "";
        return `
          <button
            class="ui-control ui-button ui-button-ghost ui-icon-button circle-btn segmented-control-btn owner-header-view-btn${dividerClass} ${isActive ? "is-active" : ""}"
            type="button"
            data-owner-header-view="${button.view}"
            data-owner-index="${ownerIndex}"
            aria-label="${button.label}"
            title="${button.title}"
            aria-pressed="${String(isActive)}"
            ${button.disabled ? "disabled aria-disabled=\"true\"" : ""}
          >
            <img class="toolbar-asset-icon${imageClass}" src="${button.icon}" alt="" aria-hidden="true">
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
  if (isOwnerHeaderViewActive(view, ownerIndex)) return;

  if (view === "org-contacts" || (view === "org" && getCurrentPanelMode() === "org" && activeOrgOwnerIndex === ownerIndex)) {
    orgPanelView = view === "org-contacts" ? "contacts" : "chart";
    renderOwnerOrgChart(ownerIndex);
    syncOwnerHeaderViewState();
    return;
  }

  if (!["details", "org", "raw"].includes(view)) return;

  if (view === "org" || view === "raw") {
    lockedToolbarMode = view;
  } else if (lockedToolbarMode !== "org" && lockedToolbarMode !== "raw") {
    lockedToolbarMode = "map";
  }
  openSidebar(view, ownerIndex);
}

function getOwnerHeader(owner, { className = "", closeLabel = "Close franchisee panel", linksToDetail = false, views } = {}) {
  const logoMarkup = window.WefranchFranchiseeLogo.getOwnerDetailLogoMarkup(owner);
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
      ${window.WefranchFranchiseeLogo.getOwnerDetailLogoMarkup(owner)}
      <h2>${owner.ownerName}</h2>
    `;

  return `
    <header class="owner-detail-header ${className}">
      ${identityMarkup}
      ${getOwnerHeaderViewControls(owner, { views })}
      <button class="ui-control ui-close-button owner-detail-close" type="button" aria-label="${closeLabel}">
        <img src="../../assets/icons/close.svg" alt="" aria-hidden="true">
      </button>
    </header>
  `;
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
    franchises: getVisibleOwnerFranchises(owner),
    // A node that states its location, even as unknown, is trusted over the
    // one inferred from the owner's footprint.
    location: node.location !== undefined
      ? node.location
      : getProfileLocation(owner, getRawDataLocation(ownerIndex, rowIndex), rowIndex),
    email: node.email || getRawDataEmail(node.name, owner),
    phone: node.phone || getRawDataPhone(ownerIndex, rowIndex)
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
// the franchisees table and contacts table stay in sync. Any other contact uses a
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
  if (!profileModalContent || !profileModalActions) return;
  const isLeadSaved = Number.isFinite(profile.ownerIndex) && isContactLeadSaved(profile.ownerIndex, profile.nodeId);
  const primaryActionLabel = isLeadSaved ? "Remove from leads" : "Save as lead";

  profileModalContent.innerHTML = `
    <div class="profile-modal-hero">
      ${window.getPersonAvatarMarkup({
        className: "profile-avatar",
        name: profile.name,
        ownerName: profile.ownerName
      })}
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
        <strong class="${profile.location ? "" : "dataset-empty-value"}">${profile.location || "–"}</strong>
      </div>
    </div>
  `;

  profileModalActions.innerHTML = `
    <button class="ui-control ui-button ui-button-primary profile-modal-primary ${isLeadSaved ? "is-saved" : ""}" type="button">${primaryActionLabel}</button>
    <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button">Close</button>
  `;
}

const profileModalApi = window.createProtoModal({
  overlay: profileModal,
  closeSelectors: ".profile-modal-close, .profile-modal-secondary",
  onClose() {
    if (!profileModal) return;
    delete profileModal.dataset.ownerIndex;
    delete profileModal.dataset.nodeId;
    if (profileModalContent) profileModalContent.innerHTML = "";
    if (profileModalActions) profileModalActions.innerHTML = "";
  }
});

function openPersonProfile(profile, trigger = null) {
  if (!profile || !profileModal) return;

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
  profileModalApi.open(trigger, {
    focus: profileModal.querySelector(".profile-modal-close")
  });
}

function closePersonProfile() {
  profileModalApi.close();
}
