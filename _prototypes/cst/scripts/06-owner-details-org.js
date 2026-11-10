function escapeOwnerInfoText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getOwnerInfoLinkMarkup({ title, label, value, valueClass = "", href, ownerIndex, ariaLabel }) {
  const copy = `
    <span class="map-info-card__link-copy">
      ${title ? `<span class="map-info-card__link-title">${title}</span>` : ""}
      ${label ? `<span class="map-info-card__link-label">${label}</span>` : ""}
      <span class="map-info-card__link-value${valueClass ? ` ${valueClass}` : ""}">${value}</span>
    </span>
    <img class="map-info-card__chevron" src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
  `;

  if (href) {
    return `
      <a class="map-info-card__link" href="${escapeOwnerInfoText(href)}" target="_blank" rel="noreferrer noopener" aria-label="${escapeOwnerInfoText(ariaLabel)}">
        ${copy}
      </a>
    `;
  }

  return `
    <button class="ui-control map-info-card__link" type="button" data-owner-info-contact data-owner-index="${ownerIndex}" aria-label="${escapeOwnerInfoText(ariaLabel)}">
      ${copy}
    </button>
  `;
}

function renderOwnerDetails(owner) {
  if (!ownerInfoCard || !owner) return;

  const websiteLabel = getOwnerWebsiteLabel(owner);
  const websiteUrl = websiteLabel ? getOwnerWebsiteUrl(owner) : "";
  const linkedinUrl = getOwnerLinkedinUrl(owner);
  const contactName = owner.contactName || "–";
  const contactEmail = owner.email || "–";
  const franchises = getVisibleOwnerFranchises(owner);
  const primaryCategory = getOwnerPrimaryCategoryLabel(owner);
  const franchiseMarkup = franchises.length
    ? franchises.map((franchise) => {
      const url = typeof getFranchiseWefranchUrl === "function" ? getFranchiseWefranchUrl(franchise) : "";
      const safeName = escapeOwnerInfoText(franchise);
      const inner = `
        <span class="ui-tile map-info-card__franchise-logo">
          <span class="map-info-card__franchise-fallback">${escapeOwnerInfoText(getInitials(franchise))}</span>
          <img
            src="${escapeOwnerInfoText(getFranchiseLogoSrc(franchise))}"
            alt=""
            onerror="this.style.display='none';this.previousElementSibling.style.display='flex';"
          >
        </span>
        <span class="map-info-card__franchise-name">${safeName}</span>
      `;

      const filterButton = `
        <button
          class="ui-control ui-button-ghost map-info-card__franchise-filter"
          type="button"
          data-franchise="${safeName}"
          aria-label="Add ${safeName} to Brand filter"
          data-tooltip="Add to\nBrand filter"
        >
          <img class="map-info-card__franchise-filter-icon" src="../../assets/icons/filter-single.svg" alt="" aria-hidden="true">
        </button>
      `;
      const main = url
        ? `
          <a
            class="map-info-card__franchise-main franchise-wefranch-link"
            href="${escapeOwnerInfoText(url)}"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open ${safeName} on wefranch"
          >${inner}</a>
        `
        : `<div class="map-info-card__franchise-main">${inner}</div>`;

      return `<div class="map-info-card__franchise">${main}${filterButton}</div>`;
    }).join("")
    : `<p class="dataset-empty-value map-info-card__empty">–</p>`;

  const companyLinks = [
    websiteLabel
      ? getOwnerInfoLinkMarkup({
        label: "Website",
        value: escapeOwnerInfoText(websiteLabel),
        href: websiteUrl,
        ariaLabel: `Open ${websiteLabel}`
      })
      : "",
    linkedinUrl
      ? getOwnerInfoLinkMarkup({
        label: "Linkedin",
        value: escapeOwnerInfoText(owner.ownerName),
        href: linkedinUrl,
        ariaLabel: `Open ${owner.ownerName} on LinkedIn`
      })
      : ""
  ].filter(Boolean).join("");
  const contactCount = getOwnerContactCount(owner);
  const unitCount = getOwnerVisibleUnitCount(owner);
  const brandCount = franchises.length;
  const ownerStats = [
    {
      key: "contacts",
      value: contactCount,
      label: "Contacts",
      ariaLabel: `Open organization chart for ${owner.ownerName}, ${contactCount.toLocaleString("en-US")} contacts`
    },
    {
      key: "units",
      value: unitCount,
      label: "Units",
      ariaLabel: `Show ${owner.ownerName} units on the map, ${unitCount.toLocaleString("en-US")} units`
    },
    {
      key: "brands",
      value: brandCount,
      label: "Brands",
      ariaLabel: `Scroll to ${owner.ownerName} brands, ${brandCount.toLocaleString("en-US")} brands`
    }
  ];

  ownerInfoCard.innerHTML = `
    <button class="ui-control map-info-card__close" type="button" aria-label="Close franchisee details"></button>
    <header class="map-info-card__header">
      ${window.WefranchFranchiseeLogo.getOwnerDetailLogoMarkup(owner)}
      <div class="map-info-card__identity">
        <h2 class="map-info-card__title" id="ownerInfoCardTitle">${escapeOwnerInfoText(owner.ownerName)}</h2>
        ${primaryCategory
          ? `<p class="map-info-card__category">${escapeOwnerInfoText(primaryCategory)}</p>`
          : ""}
      </div>
    </header>
    <div class="map-info-card__stats">
      ${ownerStats.map((stat) => `
        <div class="map-info-card__stat">
          <button
            class="ui-control map-info-card__stat-button"
            type="button"
            data-owner-stat="${stat.key}"
            data-owner-index="${owner.originalIndex}"
            aria-label="${escapeOwnerInfoText(stat.ariaLabel)}"
          >
            <span class="map-info-card__stat-value">${stat.value.toLocaleString("en-US")}</span>
            <span class="map-info-card__stat-label">${stat.label}</span>
          </button>
        </div>
      `).join("")}
    </div>
    <div class="map-info-card__scroll proto-scrollbar">
      <section class="map-info-card__section" aria-labelledby="ownerInfoContactTitle">
        <h3 class="map-info-card__section-title" id="ownerInfoContactTitle">Main contact</h3>
        <div class="map-info-card__links">
          ${getOwnerInfoLinkMarkup({
            title: escapeOwnerInfoText(contactName),
            value: escapeOwnerInfoText(contactEmail),
            valueClass: owner.email ? "" : "dataset-empty-value",
            ownerIndex: owner.originalIndex,
            ariaLabel: `Open ${contactName}`
          })}
        </div>
      </section>
      ${companyLinks ? `
        <section class="map-info-card__section" aria-labelledby="ownerInfoCompanyTitle">
          <h3 class="map-info-card__section-title" id="ownerInfoCompanyTitle">Company</h3>
          <div class="map-info-card__links">${companyLinks}</div>
        </section>
      ` : ""}
      <section class="map-info-card__section" aria-labelledby="ownerInfoFranchisesTitle">
        <h3 class="map-info-card__section-title" id="ownerInfoFranchisesTitle">Franchises</h3>
        <div class="map-info-card__franchises">${franchiseMarkup}</div>
      </section>
    </div>
  `;

  ownerInfoCard.querySelector(".map-info-card__scroll")?.addEventListener("scroll", () => {
    hideTableAnchorTooltip();
  }, { passive: true });
}

function openOwnerOrgChartFromCard(ownerIndex) {
  if (!Number.isFinite(ownerIndex)) return;
  lockedToolbarMode = "org";
  openSidebar("org", ownerIndex);
}

function focusOwnerCardUnits() {
  if (!ownersMap) return;

  if (!ownersMapQueryView) {
    fitOwnersMapToVisibleLocations({ force: true });
    return;
  }

  if (!isOwnersMapAtQueryView()) resetOwnersMapView();
}

function scrollOwnerInfoCardToBrands() {
  const scroll = ownerInfoCard?.querySelector(".map-info-card__scroll");
  const section = ownerInfoCard?.querySelector("#ownerInfoFranchisesTitle")?.closest(".map-info-card__section");
  if (!(scroll instanceof HTMLElement) || !(section instanceof HTMLElement)) return;

  const top = section.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
  scroll.scrollTo({
    top: Math.max(0, top),
    behavior: usesReducedMotion() ? "auto" : "smooth"
  });
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

let orgLevelScrollFrame = 0;

function cancelOrgLevelScroll() {
  if (!orgLevelScrollFrame) return;
  cancelAnimationFrame(orgLevelScrollFrame);
  orgLevelScrollFrame = 0;
}

// Brings a freshly opened branch up under the sticky franchisee header.
// The move starts quickly and eases out as the level arrives.
function scrollOrgPanelToLevel(nodeId) {
  if (!ownerDetailsPanel || !nodeId) return;

  const escapedNodeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(nodeId) : nodeId;
  const section = ownerDetailsPanel.querySelector(`.org-report-section[data-org-node-id="${escapedNodeId}"]`);
  if (!(section instanceof HTMLElement)) return;

  const header = ownerDetailsPanel.querySelector(".owner-detail-header");
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
  const panelTop = ownerDetailsPanel.getBoundingClientRect().top;
  const sectionTop = section.getBoundingClientRect().top;
  // The connector line sits just above the section. Leave it clear of the header.
  const target = Math.max(0, ownerDetailsPanel.scrollTop + sectionTop - panelTop - headerHeight - 16);
  const start = ownerDetailsPanel.scrollTop;
  const distance = target - start;
  if (Math.abs(distance) < 2) return;

  cancelOrgLevelScroll();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    ownerDetailsPanel.scrollTop = target;
    return;
  }

  const duration = 480;
  let startedAt = 0;

  const step = (now) => {
    if (!startedAt) startedAt = now;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    ownerDetailsPanel.scrollTop = start + distance * eased;

    if (progress < 1) {
      orgLevelScrollFrame = requestAnimationFrame(step);
      return;
    }

    orgLevelScrollFrame = 0;
  };

  orgLevelScrollFrame = requestAnimationFrame(step);
}

function revealOrgLevel(ownerIndex, nodeId) {
  const nodes = getOwnerOrgChart(ownerIndex)?.nodes || [];
  const willExpand = isOrgNodeCollapsed(ownerIndex, nodeId);
  const changedNodeIds = toggleOrgNodeCollapsed(ownerIndex, nodeId, nodes);
  changedNodeIds.forEach((changedNodeId) => syncOrgCollapsedUi(ownerIndex, changedNodeId));
  syncOrgInactiveCards(ownerIndex, nodes);
  if (willExpand) scrollOrgPanelToLevel(nodeId);
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
          <img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
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
          <img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
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
        <img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
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

function getOrgContactSelection(ownerIndex) {
  if (!orgContactSelectionByOwner.has(ownerIndex)) {
    orgContactSelectionByOwner.set(ownerIndex, new Set());
  }

  return orgContactSelectionByOwner.get(ownerIndex);
}

function getOrgContactRows(ownerIndex) {
  const rows = getOwnerRawRows(ownerIndex).map((row) => ({
    nodeId: row.nodeId,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    position: row.title || "",
    rowIndex: row.rowIndex
  }));

  const sortKey = orgContactsSort.key;
  if (!sortKey) return rows;

  const direction = orgContactsSort.direction === "ascending" ? 1 : -1;
  return rows.slice().sort((left, right) => {
    const leftValue = String(left[sortKey] || "").trim().toLowerCase();
    const rightValue = String(right[sortKey] || "").trim().toLowerCase();
    if (!leftValue && !rightValue) return left.rowIndex - right.rowIndex;
    if (!leftValue) return 1;
    if (!rightValue) return -1;

    const compared = leftValue.localeCompare(rightValue);
    if (!compared) return left.rowIndex - right.rowIndex;
    return compared * direction;
  });
}

function getOrgContactValueMarkup(value, className = "") {
  const text = String(value ?? "").trim();
  const classes = ["location-table-value", className, text ? "" : "dataset-empty-value"].filter(Boolean).join(" ");
  const title = text ? ` title="${escapeOwnerInfoText(text)}"` : "";
  return `<span class="${classes}"${title}>${text ? escapeOwnerInfoText(text) : "–"}</span>`;
}

function getOrgContactsSortHeader(label, sortKey) {
  const ariaSort = orgContactsSort.key === sortKey ? orgContactsSort.direction : "none";
  return `
    <th class="sortable-header" data-org-contacts-sort="${sortKey}" aria-sort="${ariaSort}">
      ${getSortableHeaderMarkup(label)}
    </th>
  `;
}

function getOrgContactsSelectHeader(rows, ownerIndex) {
  const selected = getOrgContactSelection(ownerIndex);
  const selectedCount = rows.filter((row) => selected.has(row.nodeId)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  return `
    <th class="location-number-header">
      <label class="location-row-select location-select-all ${partiallySelected ? "is-indeterminate" : ""}" aria-label="Select all contacts">
        <input
          class="location-row-checkbox location-select-all-checkbox"
          type="checkbox"
          data-org-contacts-select-all
          ${allSelected ? "checked" : ""}
        >
        <span class="location-row-checkbox-visual" aria-hidden="true"></span>
      </label>
    </th>
  `;
}

function getOrgContactRowMarkup(row, rowNumber, ownerIndex) {
  const isSelected = getOrgContactSelection(ownerIndex).has(row.nodeId);
  const safeId = escapeOwnerInfoText(row.nodeId);
  const safeName = escapeOwnerInfoText(row.name || "contact");

  return `
    <tr class="${isSelected ? "is-checked" : ""}" data-owner-index="${ownerIndex}" data-org-node-id="${safeId}">
      ${getRowSelectCellMarkup({
        rowNumber,
        isSelected,
        ariaLabel: `Select ${safeName}`,
        inputAttributes: `data-org-node-id="${safeId}"`
      })}
      <td>${getOrgContactValueMarkup(row.name, "org-contact-name")}</td>
      <td>${getOrgContactValueMarkup(row.email)}</td>
      <td>${getOrgContactValueMarkup(row.phone)}</td>
      <td>${getOrgContactValueMarkup(row.position)}</td>
    </tr>
  `;
}

function getOrgContactsTableMarkup(ownerIndex) {
  const rows = getOrgContactRows(ownerIndex);

  return `
    <div class="org-contacts-wrap proto-scrollbar">
      <table class="org-contacts-table has-row-select" aria-label="Contacts">
        <colgroup>
          <col class="org-contacts-select-col">
          <col>
          <col>
          <col>
          <col>
        </colgroup>
        <thead>
          <tr>
            ${getOrgContactsSelectHeader(rows, ownerIndex)}
            ${getOrgContactsSortHeader("Name", "name")}
            ${getOrgContactsSortHeader("Email", "email")}
            ${getOrgContactsSortHeader("Phone", "phone")}
            ${getOrgContactsSortHeader("Position", "position")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => getOrgContactRowMarkup(row, index + 1, ownerIndex)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function syncOrgContactsSelectAll(ownerIndex) {
  const rows = getOrgContactRows(ownerIndex);
  const selected = getOrgContactSelection(ownerIndex);
  const selectedCount = rows.filter((row) => selected.has(row.nodeId)).length;
  const input = ownerDetailsPanel?.querySelector("[data-org-contacts-select-all]");
  const label = input?.closest(".location-select-all");
  if (!(input instanceof HTMLInputElement)) return;

  input.checked = rows.length > 0 && selectedCount === rows.length;
  input.indeterminate = selectedCount > 0 && selectedCount < rows.length;
  label?.classList.toggle("is-indeterminate", input.indeterminate);
}

function setOrgContactSelected(nodeId, isSelected, row) {
  const ownerIndex = activeOrgOwnerIndex;
  if (ownerIndex === null || !nodeId) return;

  const selected = getOrgContactSelection(ownerIndex);
  if (isSelected) selected.add(nodeId);
  else selected.delete(nodeId);
  row?.classList.toggle("is-checked", isSelected);
  syncOrgContactsSelectAll(ownerIndex);
}

function setAllOrgContactsSelected(isSelected) {
  const ownerIndex = activeOrgOwnerIndex;
  if (ownerIndex === null || !ownerDetailsPanel) return;

  const selected = getOrgContactSelection(ownerIndex);
  getOrgContactRows(ownerIndex).forEach((row) => {
    if (isSelected) selected.add(row.nodeId);
    else selected.delete(row.nodeId);
  });

  ownerDetailsPanel.querySelectorAll(".org-contacts-table tbody tr[data-org-node-id]").forEach((row) => {
    const input = row.querySelector(".location-row-checkbox");
    const checked = isSelected && selected.has(row.dataset.orgNodeId);
    if (input instanceof HTMLInputElement) input.checked = checked;
    row.classList.toggle("is-checked", checked);
  });
  syncOrgContactsSelectAll(ownerIndex);
}

function cycleOrgContactsSort(sortKey) {
  if (!sortKey) return;

  if (orgContactsSort.key !== sortKey) {
    orgContactsSort = { key: sortKey, direction: "descending" };
  } else if (orgContactsSort.direction === "descending") {
    orgContactsSort = { key: sortKey, direction: "ascending" };
  } else {
    orgContactsSort = { key: "", direction: "descending" };
  }

  if (activeOrgOwnerIndex === null || orgPanelView !== "contacts") return;

  const scrollLeft = ownerDetailsPanel?.querySelector(".org-contacts-wrap")?.scrollLeft || 0;
  renderOwnerOrgChart(activeOrgOwnerIndex);
  const wrap = ownerDetailsPanel?.querySelector(".org-contacts-wrap");
  if (wrap) wrap.scrollLeft = scrollLeft;
}

function renderOwnerOrgChart(ownerIndex) {
  if (!ownerDetailsPanel) return;

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChart(ownerIndex);
  if (!owner || !orgChart?.nodes?.length) return;

  const nodes = orgChart.nodes;
  normalizeOrgExpandedSiblings(ownerIndex, nodes);
  const rootNodes = getOrgReports(nodes, null);
  const contactsView = orgPanelView === "contacts";
  const chartMarkup = `
    <div class="owner-org-chart" aria-label="${owner.ownerName} organization chart">
      <div class="org-node-row org-node-row-roots">
        ${rootNodes.map((node) => getOrgCard(node, "root", nodes, ownerIndex)).join("")}
      </div>

      ${rootNodes.map((node) => getOrgTreeSection(node, nodes, ownerIndex)).join("")}
    </div>
  `;

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel${contactsView ? " is-contacts-view" : ""}">
      ${getOwnerHeader(owner, {
        className: "owner-org-header",
        closeLabel: "Close organization chart",
        linksToDetail: true,
        views: ["org", "org-contacts"]
      })}

      ${contactsView ? getOrgContactsTableMarkup(ownerIndex) : chartMarkup}
    </article>
  `;

  if (contactsView) {
    const wrap = ownerDetailsPanel.querySelector(".org-contacts-wrap");
    wrap?.addEventListener("scroll", () => {
      ownerDetailsPanel.classList.toggle("is-scrolled", wrap.scrollTop > 0);
    }, { passive: true });
    syncOrgContactsSelectAll(ownerIndex);
  }

  ownerDetailsPanel.scrollTop = 0;
  syncOwnerHeaderScrollState();
}

function getOwnerSearchOwners() {
  return displayedFranchisees.length ? displayedFranchisees : owners;
}

function getOwnerSearchFieldMarkup() {
  return `
    <div class="owner-search" data-owner-search>
      <div class="owner-search-field">
        <img class="owner-search-icon" src="../../assets/icons/search.svg" alt="" aria-hidden="true">
        <input
          type="text"
          class="owner-search-input"
          placeholder="Search franchisees..."
          autocomplete="off"
          spellcheck="false"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls="ownerSearchMenu"
          aria-label="Search franchisees"
        >
      </div>
      <div class="owner-search-menu" id="ownerSearchMenu" role="listbox" aria-label="Franchisee search results">
        <div class="owner-search-options"></div>
      </div>
    </div>
  `;
}

function setupOwnerSearchField(mode) {
  const field = ownerDetailsPanel?.querySelector("[data-owner-search]");
  if (!field) return;

  const input = field.querySelector(".owner-search-input");
  const optionsList = field.querySelector(".owner-search-options");
  if (!input || !optionsList) return;

  let renderedOwners = [];
  let activeIndex = -1;
  let isOpen = false;

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    activeIndex = -1;
    field.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    optionsList.innerHTML = "";
  }

  function setActiveOption(index) {
    const optionButtons = Array.from(optionsList.querySelectorAll(".owner-search-option"));
    if (!optionButtons.length) {
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }

    activeIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive) {
        input.setAttribute("aria-activedescendant", optionButton.id);
        optionButton.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function selectOwner(ownerIndex) {
    closeMenu();
    openSidebar(mode, ownerIndex, { scrollTable: true });
  }

  function renderOptions() {
    const query = normalizeComboboxText(input.value);
    renderedOwners = getOwnerSearchOwners().filter((owner) => (
      normalizeComboboxText(owner.ownerName).includes(query)
    ));

    optionsList.innerHTML = "";

    if (!renderedOwners.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "owner-search-empty";
      emptyState.textContent = "No results found";
      optionsList.append(emptyState);
      activeIndex = -1;
      return;
    }

    renderedOwners.forEach((owner, index) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "owner-search-option";
      optionButton.id = `ownerSearchOption-${index}`;
      optionButton.dataset.ownerIndex = String(owner.originalIndex);
      optionButton.setAttribute("role", "option");
      optionButton.setAttribute("aria-selected", "false");
      optionButton.textContent = owner.ownerName;
      optionButton.addEventListener("mousedown", (event) => event.preventDefault());
      optionButton.addEventListener("click", () => selectOwner(owner.originalIndex));
      optionsList.append(optionButton);
    });

    if (activeIndex >= renderedOwners.length) {
      activeIndex = -1;
    }
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    field.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
    renderOptions();
    window.WefranchFilterCombobox?.fitOpenMenus?.();
  }

  input.addEventListener("focus", openMenu);

  input.addEventListener("input", () => {
    if (!isOpen) {
      openMenu();
    } else {
      renderOptions();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        if (renderedOwners.length) {
          setActiveOption(event.key === "ArrowDown" ? 0 : renderedOwners.length - 1);
        }
        return;
      }
      setActiveOption(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || activeIndex < 0) return;
      event.preventDefault();
      selectOwner(renderedOwners[activeIndex].originalIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      input.blur();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(closeMenu, 120);
  });
}

function renderDefaultOrgChartState() {
  if (!ownerDetailsPanel) return;

  ownerDetailsPanel.innerHTML = `
    <article class="owner-org-panel owner-org-panel-empty">
      <div class="owner-empty-content">
        <p class="owner-org-empty-message">
          Select an owner from the table on the left, or search by owner name below to load their organization chart.
        </p>
        ${getOwnerSearchFieldMarkup()}
      </div>
    </article>
  `;

  setupOwnerSearchField("org");
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


