function renderOwnerDetails(owner) {
  if (!ownerDetailsPanel) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  const website = getOwnerWebsite(owner);
  const franchises = getOwnerFranchises(owner);
  const franchiseMarkup = franchises
    .map(
      (franchise) => `
        <div class="owner-detail-franchise">
          <span class="ui-tile owner-detail-franchise-logo">
            <span class="owner-detail-franchise-logo-fallback">${getInitials(franchise)}</span>
            <img
              src="${getFranchiseLogoSrc(franchise)}"
              alt="${franchise} logo"
              onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
            >
          </span>
          <span>${franchise}</span>
        </div>
      `
    )
    .join("");

  ownerDetailsPanel.innerHTML = `
    <article class="owner-detail-card">
      ${getOwnerHeader(owner, { closeLabel: "Close owner details" })}

      <section class="owner-detail-section owner-detail-contact">
        <h3 class="ui-section-title">Contact</h3>
        <p class="ui-body-text">${owner.contactName}</p>
        <span class="ui-link owner-detail-email">${owner.email}</span>
      </section>

      <section class="owner-detail-section">
        <h3 class="ui-section-title">Website</h3>
        <a class="ui-link" href="${getOwnerWebsiteUrl(owner)}" target="_blank" rel="noreferrer">${website}</a>

        <h3 class="ui-section-title owner-detail-subtitle">Linkedin</h3>
        <a class="ui-link" href="${getOwnerLinkedinUrl(owner)}" target="_blank" rel="noreferrer">${owner.ownerName}</a>
      </section>

      <section class="owner-detail-section">
        <h3 class="ui-section-title">Franchises</h3>
        <div class="owner-detail-franchises">${franchiseMarkup}</div>
      </section>

      <section class="owner-detail-section owner-detail-location-section">
        <div class="owner-detail-locations-header">
          <div>
            <h3 class="ui-section-title">Locations</h3>
            <p class="ui-body-text">${getOwnerUnitCount(owner)}</p>
          </div>
          <button class="ui-control ui-text-button owner-detail-map-link" type="button" data-owner-index="${owner.originalIndex}">
            Filter in Map
          </button>
        </div>
        <div class="owner-detail-map" id="ownerDetailsMap"></div>
      </section>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function getOwnerOrgChart(ownerIndex) {
  return (window.ownerOrgChartData || [])[ownerIndex] || null;
}

function getOrgReports(nodes, parentId) {
  return nodes.filter((node) => node.reportsTo === parentId);
}

function getOrgDirectReportCount(nodes, nodeId) {
  return getOrgReports(nodes, nodeId).length;
}

function getOrgCollapsedSet(ownerIndex) {
  if (!orgCollapsedNodeIdsByOwner.has(ownerIndex)) {
    orgCollapsedNodeIdsByOwner.set(ownerIndex, new Set());
  }

  return orgCollapsedNodeIdsByOwner.get(ownerIndex);
}

function isOrgNodeCollapsed(ownerIndex, nodeId) {
  return getOrgCollapsedSet(ownerIndex).has(nodeId);
}

function getOrgExpandableSiblingIds(nodes, nodeId) {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return [];

  return nodes
    .filter((item) => item.reportsTo === node.reportsTo && getOrgDirectReportCount(nodes, item.id) > 0)
    .map((item) => item.id);
}

function normalizeOrgExpandedSiblings(ownerIndex, nodes) {
  const collapsedSet = getOrgCollapsedSet(ownerIndex);
  const expandedNodeIdByParent = new Map();

  nodes.forEach((node) => {
    if (getOrgDirectReportCount(nodes, node.id) === 0 || collapsedSet.has(node.id)) return;

    const parentId = node.reportsTo || "__root__";
    if (expandedNodeIdByParent.has(parentId)) {
      collapsedSet.add(node.id);
      return;
    }

    expandedNodeIdByParent.set(parentId, node.id);
  });
}

function isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes) {
  const expandedSibling = nodes.find((item) => (
    item.reportsTo === node.reportsTo &&
    getOrgDirectReportCount(nodes, item.id) > 0 &&
    !isOrgNodeCollapsed(ownerIndex, item.id)
  ));

  return Boolean(expandedSibling && expandedSibling.id !== node.id);
}

function toggleOrgNodeCollapsed(ownerIndex, nodeId, nodes = []) {
  const collapsedSet = getOrgCollapsedSet(ownerIndex);
  const changedNodeIds = new Set([nodeId]);

  if (collapsedSet.has(nodeId)) {
    getOrgExpandableSiblingIds(nodes, nodeId).forEach((siblingId) => {
      if (siblingId !== nodeId) {
        collapsedSet.add(siblingId);
        changedNodeIds.add(siblingId);
      }
    });

    collapsedSet.delete(nodeId);
  } else {
    collapsedSet.add(nodeId);
  }

  return [...changedNodeIds];
}

function syncOrgInactiveCards(ownerIndex, nodes) {
  if (!ownerDetailsPanel) return;

  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerDetailsPanel
    .querySelectorAll(`[data-owner-index="${escapedOwnerIndex}"][data-org-card-id]`)
    .forEach((card) => {
      if (!(card instanceof HTMLElement)) return;

      const node = nodes.find((item) => item.id === card.dataset.orgCardId);
      if (!node) return;

      card.classList.toggle("is-inactive-branch", isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes));
    });
}

function syncOrgCollapsedUi(ownerIndex, nodeId) {
  if (!ownerDetailsPanel) return;

  const isCollapsed = isOrgNodeCollapsed(ownerIndex, nodeId);
  const escapedNodeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(nodeId) : nodeId;
  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerDetailsPanel
    .querySelectorAll(`[data-owner-index="${escapedOwnerIndex}"][data-org-node-id="${escapedNodeId}"]`)
    .forEach((toggleButton) => {
      if (!(toggleButton instanceof HTMLElement)) return;
      toggleButton.classList.toggle("is-collapsed", isCollapsed);
      toggleButton.classList.toggle("is-expanded", !isCollapsed);
      toggleButton.setAttribute("aria-expanded", String(!isCollapsed));

      if (toggleButton.classList.contains("org-collapse-button")) {
        toggleButton.innerHTML = `
          ${isCollapsed ? "Expand" : "Collapse"}
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        `;
      }
    });

  const section = ownerDetailsPanel.querySelector(`.org-report-section[data-org-node-id="${escapedNodeId}"]`);
  if (!section) return;

  section.classList.toggle("is-collapsed", isCollapsed);

  const content = section.querySelector(".org-report-section-content");
  if (content) {
    content.classList.toggle("is-collapsed", isCollapsed);
    content.classList.toggle("is-expanded", !isCollapsed);
  }
}

function getOrgCard(node, type = "default", nodes = [], ownerIndex = null) {
  const directReportCount = getOrgDirectReportCount(nodes, node.id);
  const isCollapsed = ownerIndex !== null && isOrgNodeCollapsed(ownerIndex, node.id);
  const isInactiveBranch = ownerIndex !== null && isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes);

  return `
    <article
      class="org-person-card org-person-card-${type} ${isInactiveBranch ? "is-inactive-branch" : ""}"
      data-owner-index="${ownerIndex}"
      data-org-card-id="${node.id}"
      role="button"
      tabindex="0"
      aria-label="Open ${node.name} profile"
    >
      <div class="ui-avatar org-person-avatar" aria-hidden="true">${getInitials(node.name)}</div>
      <h3>${node.name}</h3>
      <p>${getOrgNodeDisplayTitle(node)}</p>
      ${directReportCount > 0 ? `
        <button
          class="ui-control org-report-count org-report-count-${type} ${isCollapsed ? "is-collapsed" : "is-expanded"}"
          type="button"
          data-org-node-id="${node.id}"
          data-owner-index="${ownerIndex}"
          aria-expanded="${String(!isCollapsed)}"
          aria-label="${isCollapsed ? "Expand" : "Collapse"} reports for ${node.name}"
        >
          ${directReportCount}
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        </button>
      ` : ""}
    </article>
  `;
}

function getOrgBranchHeader(node, ownerIndex) {
  const isCollapsed = isOrgNodeCollapsed(ownerIndex, node.id);

  return `
    <div class="org-branch-header">
      <div class="org-branch-person">
        <span class="ui-avatar org-branch-avatar" aria-hidden="true">${getInitials(node.name)}</span>
        <span>${node.name}</span>
      </div>
      <button
        class="ui-control ui-text-button org-collapse-button ${isCollapsed ? "is-collapsed" : "is-expanded"}"
        type="button"
        data-org-node-id="${node.id}"
        data-owner-index="${ownerIndex}"
        aria-expanded="${String(!isCollapsed)}"
        aria-label="${isCollapsed ? "Expand" : "Collapse"} reports for ${node.name}"
      >
        ${isCollapsed ? "Expand" : "Collapse"}
        <img src="assets/chevron.svg" alt="" aria-hidden="true">
      </button>
    </div>
  `;
}

function getOrgTreeSection(parentNode, nodes, ownerIndex, depth = 0) {
  const directReports = getOrgReports(nodes, parentNode.id);
  if (!directReports.length) return "";

  const cardType = depth === 0 ? "primary" : "child";
  const isCollapsed = isOrgNodeCollapsed(ownerIndex, parentNode.id);

  return `
    <section class="org-report-section ${depth > 0 ? "org-report-section-nested" : ""} ${isCollapsed ? "is-collapsed" : ""}" data-org-node-id="${parentNode.id}">
      <span class="org-vertical-line" aria-hidden="true"></span>
      ${getOrgBranchHeader(parentNode, ownerIndex)}
      <div class="org-report-section-content ${isCollapsed ? "is-collapsed" : "is-expanded"}">
        <div class="org-node-row org-node-row-children">
        ${directReports.map((node) => getOrgCard(node, cardType, nodes, ownerIndex)).join("")}
        </div>
        ${directReports.map((node) => getOrgTreeSection(node, nodes, ownerIndex, depth + 1)).join("")}
      </div>
    </section>
  `;
}

function renderOwnerOrgChart(ownerIndex) {
  if (!ownerDetailsPanel) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChart(ownerIndex);
  if (!owner || !orgChart?.nodes?.length) return;

  const nodes = orgChart.nodes;
  normalizeOrgExpandedSiblings(ownerIndex, nodes);
  const rootNodes = getOrgReports(nodes, null);

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel">
      ${getOwnerHeader(owner, {
        className: "owner-org-header",
        closeLabel: "Close organization chart",
        linksToDetail: true
      })}

      <div class="owner-org-chart" aria-label="${owner.ownerName} organization chart">
        <div class="org-node-row org-node-row-roots">
          ${rootNodes.map((node) => getOrgCard(node, "root", nodes, ownerIndex)).join("")}
        </div>

        ${rootNodes.map((node) => getOrgTreeSection(node, nodes, ownerIndex)).join("")}
      </div>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function renderDefaultOrgChartState() {
  if (!ownerDetailsPanel) return;

  const selectableOwners = displayedOwners.length ? displayedOwners : owners;
  const selectedOwnerIndex = getPrimarySelectedOwnerIndex();
  const selectedValue = selectedOwnerIndex !== null ? String(selectedOwnerIndex) : "";
  const options = selectableOwners
    .map((owner) => {
      const value = String(owner.originalIndex);
      const isSelected = value === selectedValue ? " selected" : "";
      return `<option value="${value}"${isSelected}>${owner.ownerName}</option>`;
    })
    .join("");

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel owner-org-panel-empty">
      <div class="owner-org-selector">
        <label for="orgOwnerPicker">
          <span>Select owner</span>
          <img src="assets/chevron.svg" alt="" aria-hidden="true">
        </label>
        <select id="orgOwnerPicker" aria-label="Select owner for organization chart">
          <option value="">Select owner</option>
          ${options}
        </select>
      </div>
      <p class="owner-org-empty-message">
        Select an
        <button type="button" class="ui-control ui-text-button owner-org-inline-trigger" data-open-org-owner-picker>owner</button><br>
        to load their organization chart.
      </p>
    </article>
  `;

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function syncOpenOrgPanelWithSelection() {
  const isOrgPanelOpen = card?.classList.contains("is-map-open") && mapPanel?.classList.contains("is-org-mode");
  if (!isOrgPanelOpen) return;

  const selectedOwner = getPrimarySelectedOwnerIndex();
  if (selectedOwner !== null && !Number.isNaN(selectedOwner)) {
    if (activeOrgOwnerIndex !== selectedOwner) {
      openSidebar("org", selectedOwner);
    }
    return;
  }

  if (activeOrgOwnerIndex === null) {
    renderDefaultOrgChartState();
  }
}

function initializeOwnerDetailsMap(ownerIndex) {
  if (!window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  const mapContainer = document.getElementById("ownerDetailsMap");
  if (!mapContainer) return;

  if (ownerDetailsMap) {
    ownerDetailsMap.remove();
    ownerDetailsMap = null;
  }

  ownerDetailsMapOwnerIndex = ownerIndex;
  const coordinates = getMapPointFeatures(ownerIndex).map((feature) => feature.geometry.coordinates);
  const bounds = getMapBoundsForCoordinates(coordinates);
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  ownerDetailsMap = new mapboxgl.Map({
    container: mapContainer,
    style: MAPBOX_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: 3,
    bounds: bounds || undefined,
    fitBoundsOptions: {
      padding: 30,
      maxZoom: 8.6
    },
    attributionControl: false,
    logoPosition: "bottom-right",
    interactive: false,
    preserveDrawingBuffer: true
  });

  ownerDetailsMap.on("load", () => {
    ownerDetailsMap.addSource("owner-detail-points", {
      type: "geojson",
      data: getOwnerMapPointFeatureCollection(ownerIndex)
    });

    ownerDetailsMap.addLayer({
      id: "owner-detail-points",
      type: "circle",
      source: "owner-detail-points",
      paint: {
        "circle-radius": 4.5,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.88,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });
  });
}

