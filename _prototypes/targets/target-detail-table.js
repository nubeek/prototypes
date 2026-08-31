const tableBody = document.getElementById("ownersTableBody");
const tableWrap = document.getElementById("tableWrap");
const ownerOrgChartWrap = document.getElementById("ownerOrgChartWrap");
const targetDetailCard = document.querySelector(".target-detail-card");
const contactDetailPanel = document.getElementById("contactDetailPanel");
const subtitle = document.querySelector(".subtitle-count");
const changeNav = document.querySelector(".change-nav");
const sortHeaders = Array.from(document.querySelectorAll(".sortable-header"));
const toolbarDropdowns = Array.from(document.querySelectorAll(".toolbar-dropdown"));
const targetToolbarMenuDropdown = document.getElementById("targetToolbarMenuDropdown");
const changesToggleOption = document.getElementById("changesToggleOption");
const changesToggleIcon = document.getElementById("changesToggleIcon");
const changesToggleLabel = document.getElementById("changesToggleLabel");

const activeIconColor = "#7a63dd";
const inactiveIconColor = "rgba(122, 99, 221, 0.15)";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const TARGET_OWNER_LIMIT = 20;
const activeTarget = window.activeTarget || null;
const targetDataOptions = window.targetDataOptions || {};
const useOwnerImageLogos = targetDataOptions.useImageLogos !== false;
const useFranchiseImageLogos = targetDataOptions.useFranchiseLogos !== false;
const logoInitialLength = targetDataOptions.logoInitialLength || 2;
const ORG_OPENING_INITIAL_DELAY_MS = 520;
const ORG_OPENING_LEVEL_DELAY_MS = 520;
const ORG_OPENING_FINISH_DELAY_MS = 760;
const ORG_OPENING_ROOT_REVEAL_DELAY_MS = 120;
const ORG_OPENING_SCROLL_OFFSET_PX = 20;
const ORG_OPENING_SCROLL_DURATION_MS = 620;

const franchiseLogoFileOverrides = {
  "Anytime Fitness": "anytime-fitness.png",
  "F45 Training": "f45-training.svg",
  "OrangeTheory Fitness": "orangetheory.jpg",
  "Crumbl Cookies": "crumbl-cookies.png",
  "The Learning Experience": "the-learning-experience.png",
  "Drybar": "drybar.png",
  "Ace Handyman Services": "ace-handyman-services.png",
  "StretchLab": "stretchlab.png",
  "Mathnasium": "mathnasium.png",
  "MaidPro": "maidpro.png",
  "Wendy's": "wendys.jpg",
  "Chili's": "chilis.png",
  "Papa John's": "papa-johns.png",
  "Five Guys": "five-guys.png",
  "Krispy Kreme": "krispy-kreme.png",
  "Jimmy John's": "jimmy-johns.png",
  "Dunkin'": "dunkin.jpg",
  "Blaze Pizza": "blaze-pizza.png",
  "Outback Steakhouse": "outback-steakhouse.png",
  "Smoothie King": "smoothie-king.png",
  "Starbucks": "starbucks.png",
  "Qdoba": "qdoba.png",
  "Title Boxing Club": "title-boxing-club.png",
  "Popeyes Louisiana Kitchen": "popeyes-louisiana-kitchen.jpg",
  "Tropical Smoothie Cafe": "tropical-smoothie-cafe.png",
  "Aussie Pet Mobile": "aussie-pet-mobile.png"
};

let sortState = {
  columns: [{ key: "unitCount", direction: "descending" }]
};
const savedLeadOwnerIndexes = new Set();

function getInitials(name, maxLetters = 2) {
  const cleanName = String(name || "");
  const words = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxLetters);

  if (maxLetters <= 1) {
    const firstLetter = cleanName.match(/[A-Za-z0-9]/)?.[0] || "";
    return firstLetter.toUpperCase();
  }

  return words
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getFranchiseSlug(franchiseName) {
  return String(franchiseName || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFranchiseLogoSrc(franchiseName) {
  const logoFileName = franchiseLogoFileOverrides[franchiseName] || `${getFranchiseSlug(franchiseName)}.jpg`;
  return `../../assets/logos/franchises/${logoFileName}`;
}

function getOwnerFranchises(owner) {
  if (Array.isArray(owner.franchises)) {
    return [...new Set(owner.franchises.map((franchise) => String(franchise).trim()).filter(Boolean))];
  }

  return [...new Set(
    String(owner.franchise || "")
      .split(",")
      .map((franchise) => franchise.trim())
      .filter(Boolean)
  )];
}

function getOwnerContactCount(owner) {
  const contactCount = Number(owner.contactCount);
  if (Number.isFinite(contactCount)) return contactCount;
  if (Array.isArray(owner.contacts)) return owner.contacts.length;

  const legacyCount = Number(owner.contacts);
  return Number.isFinite(legacyCount) ? legacyCount : 0;
}

function getOwnerUnitCount(owner) {
  const unitCount = Number(owner.unitCount);
  if (Number.isFinite(unitCount)) return unitCount;

  const locationCount = Number(owner.locations);
  if (Number.isFinite(locationCount)) return locationCount;

  return Array.isArray(owner.units) ? owner.units.length : 0;
}

function normalizeOwner(owner, sourceIndex) {
  const franchises = getOwnerFranchises(owner);
  const contactCount = getOwnerContactCount(owner);
  const unitCount = getOwnerUnitCount(owner);
  const logoAsset = owner.logoAsset || (owner.logoFilename ? `${owner.logoFilename}.jpg` : "");
  const logoPath = owner.logoSrc ?? (logoAsset ? `../../assets/logos/franchisees/${String(logoAsset).replaceAll("_", "-")}` : "");
  const logoSrc = useOwnerImageLogos ? logoPath : "";

  return {
    ...owner,
    sourceIndex,
    contactCount,
    unitCount,
    locations: unitCount,
    franchises,
    franchise: franchises.join(", "),
    contactName: owner.contactName || owner.primaryContact?.name || "",
    email: owner.email || owner.primaryContact?.email || "",
    logoSrc,
    logoAlt: owner.logoAlt || `${owner.ownerName} logo`,
    hasWebsite: Boolean(owner.hasWebsite ?? owner.webEnabled),
    hasLinkedin: Boolean(owner.hasLinkedin ?? owner.linkedinEnabled)
  };
}

const owners = (window.ownersData || [])
  .map(normalizeOwner)
  .sort((a, b) => {
    const unitComparison = b.unitCount - a.unitCount;
    return unitComparison || a.sourceIndex - b.sourceIndex;
  })
  .slice(0, TARGET_OWNER_LIMIT)
  .map((owner, originalIndex) => ({ ...owner, originalIndex }));

let displayedOwners = [...owners];
let activeDetailOwnerIndex = null;
let activeDetailMode = null;
let activeOrgChartOwnerIndex = null;
let activeContactProfile = null;
let orgOpeningAnimationToken = 0;
let detailScrollAnimationFrame = null;
let orgOpeningScrollFrame = null;
const orgCollapsedNodeIdsByOwner = new Map();

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

function getFranchiseLogosColumn(owner) {
  if (!owner.franchises.length) {
    return `<span class="franchise-text">${owner.franchise}</span>`;
  }

  return `
    <div class="franchise-logos" role="list" aria-label="${owner.franchises.join(", ")}">
      ${owner.franchises.map((franchise) => `
        <span class="franchise-item" role="listitem" aria-label="${franchise}">
          <span class="franchise-logo" data-tooltip="${franchise}" tabindex="0">
            <span class="franchise-logo-fallback${useFranchiseImageLogos ? "" : " is-visible"}">${getInitials(franchise, logoInitialLength)}</span>
            ${useFranchiseImageLogos ? `
              <img
                src="${getFranchiseLogoSrc(franchise)}"
                alt=""
                onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
              >
            ` : ""}
          </span>
        </span>
      `).join("")}
    </div>
  `;
}

function getOwnerDataIndex(owner) {
  return Number.isFinite(owner?.sourceIndex) ? owner.sourceIndex : owner?.originalIndex;
}

function getEmailDomain(email) {
  return String(email || "").split("@")[1] || "";
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

function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

function animateDetailPanelScrollToTop(panel, duration = 280) {
  if (!panel) return;

  if (detailScrollAnimationFrame !== null) {
    cancelAnimationFrame(detailScrollAnimationFrame);
    detailScrollAnimationFrame = null;
  }

  const startTop = panel.scrollTop;
  if (startTop <= 0) return;

  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);
    panel.scrollTop = Math.round(startTop * (1 - easedProgress));

    if (progress < 1) {
      detailScrollAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    panel.scrollTop = 0;
    detailScrollAnimationFrame = null;
  }

  detailScrollAnimationFrame = requestAnimationFrame(tick);
}

function getOwnerIndustry(owner) {
  const ownerIndustry = String(owner?.industry || "").trim();
  if (ownerIndustry) return ownerIndustry;

  const targetIndustry = String(activeTarget?.industry || "").trim();
  if (targetIndustry) return targetIndustry;

  const targetType = String(activeTarget?.type || "").trim();
  if (targetType) {
    return targetType
      .replace(/\s+Franchise\s+Operators$/i, "")
      .replace(/\s+Operators$/i, "")
      .trim();
  }

  return "Franchise owner";
}

function getRawDataPhone(ownerIndex, rowIndex = 0) {
  const areaCodes = ["207", "773", "704", "980", "312", "646"];
  const areaCode = areaCodes[(ownerIndex + rowIndex) % areaCodes.length];
  const prefix = String(555 + ((ownerIndex * 17 + rowIndex * 29) % 350)).padStart(3, "0");
  const line = String(1000 + ((ownerIndex * 137 + rowIndex * 419) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getProfileLocation(owner, dataIndex) {
  const ownerLocations = window.ownerLocationsData?.[dataIndex]?.locations || [];
  const locationLabels = [
    ...new Set(ownerLocations.map((location) => location.label).filter(Boolean))
  ];

  if (locationLabels.length) {
    return locationLabels[dataIndex % locationLabels.length];
  }

  return owner.location || owner.contactLocation || "United States";
}

function getOwnerPrimaryContact(owner) {
  if (!Array.isArray(owner.contacts)) return null;

  return owner.contacts.find((contact) => contact.name === owner.contactName) || owner.contacts[0] || null;
}

function getPersonProfileFromOwnerContact(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return null;

  const dataIndex = getOwnerDataIndex(owner);
  const primaryContact = getOwnerPrimaryContact(owner);
  const orgChart = window.ownerOrgChartData?.[dataIndex];
  const orgNode = orgChart?.nodes?.find((node) => node.name === owner.contactName) || orgChart?.nodes?.[0] || null;

  return {
    ownerIndex: owner.originalIndex,
    name: owner.contactName || primaryContact?.name || owner.ownerName,
    ownerName: owner.ownerName,
    title: orgNode?.title || primaryContact?.title || "Primary Contact",
    email: owner.email || primaryContact?.email || "",
    phone: primaryContact?.phone || getRawDataPhone(dataIndex, 0),
    location: getProfileLocation(owner, dataIndex)
  };
}

function getOwnerOrgChart(owner) {
  if (!owner) return null;
  return window.ownerOrgChartData?.[getOwnerDataIndex(owner)] || null;
}

function getOwnerOrgChartByIndex(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  return getOwnerOrgChart(owner);
}

function getOrgReports(nodes, parentId) {
  return nodes.filter((node) => node.reportsTo === parentId);
}

function getOrgDirectReportCount(nodes, nodeId) {
  return getOrgReports(nodes, nodeId).length;
}

function getOrgNodeDisplayTitle(node) {
  const title = typeof node?.title === "string" ? node.title.trim() : "";
  return title || "Prospect";
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
  if (!ownerOrgChartWrap) return;

  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerOrgChartWrap
    .querySelectorAll(`[data-owner-index="${escapedOwnerIndex}"][data-org-card-id]`)
    .forEach((card) => {
      if (!(card instanceof HTMLElement)) return;

      const node = nodes.find((item) => item.id === card.dataset.orgCardId);
      if (!node) return;

      card.classList.toggle("is-inactive-branch", isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes));
    });
}

function syncOrgCollapsedUi(ownerIndex, nodeId) {
  if (!ownerOrgChartWrap) return;

  const isCollapsed = isOrgNodeCollapsed(ownerIndex, nodeId);
  const escapedNodeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(nodeId) : nodeId;
  const escapedOwnerIndex = String(ownerIndex).replace(/"/g, '\\"');

  ownerOrgChartWrap
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

  const section = ownerOrgChartWrap.querySelector(`.org-report-section[data-org-node-id="${escapedNodeId}"]`);
  if (!section) return;

  section.classList.toggle("is-collapsed", isCollapsed);

  const content = section.querySelector(".org-report-section-content");
  if (content) {
    content.classList.toggle("is-collapsed", isCollapsed);
    content.classList.toggle("is-expanded", !isCollapsed);
  }
}

function getOrgCard(node, type = "default", nodes = [], ownerIndex = null, rowIndex = 0) {
  const directReportCount = getOrgDirectReportCount(nodes, node.id);
  const isCollapsed = ownerIndex !== null && isOrgNodeCollapsed(ownerIndex, node.id);
  const isInactiveBranch = ownerIndex !== null && isOrgNodeInactiveInSiblingGroup(ownerIndex, node, nodes);

  return `
    <article
      class="org-person-card org-person-card-${type} ${isInactiveBranch ? "is-inactive-branch" : ""}"
      data-owner-index="${ownerIndex}"
      data-org-card-id="${node.id}"
      style="--org-card-index: ${rowIndex};"
      role="button"
      tabindex="0"
      aria-label="Open ${node.name} profile"
    >
      <div class="org-person-avatar" aria-hidden="true">${getInitials(node.name)}</div>
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
        <span class="org-branch-avatar" aria-hidden="true">${getInitials(node.name)}</span>
        <span>${node.name}</span>
      </div>
      <button
        class="ui-control org-collapse-button ${isCollapsed ? "is-collapsed" : "is-expanded"}"
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
  const openDepth = depth + 1;

  return `
    <section class="org-report-section ${depth > 0 ? "org-report-section-nested" : ""} ${isCollapsed ? "is-collapsed" : ""}" data-org-node-id="${parentNode.id}" data-org-open-depth="${openDepth}">
      <span class="org-vertical-line" aria-hidden="true"></span>
      ${getOrgBranchHeader(parentNode, ownerIndex)}
      <div class="org-report-section-content ${isCollapsed ? "is-collapsed" : "is-expanded"}">
        <div class="org-node-row org-node-row-children" data-org-open-depth="${openDepth}">
        ${directReports.map((node, rowIndex) => getOrgCard(node, cardType, nodes, ownerIndex, rowIndex)).join("")}
        </div>
        ${directReports.map((node) => getOrgTreeSection(node, nodes, ownerIndex, depth + 1)).join("")}
      </div>
    </section>
  `;
}

function prefersReducedOrgMotion() {
  return Boolean(
    window.wefranchReduceMotion?.isEnabled?.()
    || document.documentElement.classList.contains("is-reduce-motion")
    || document.body.classList.contains("reduce-motion")
    || (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
}

function getDirectOrgSectionCards(section) {
  const content = section.querySelector(".org-report-section-content");
  if (!content) return [];

  const row = Array.from(content.children).find((child) => child.classList?.contains("org-node-row-children"));
  if (!row) return [];

  return Array.from(row.children).filter((child) => child.classList?.contains("org-person-card"));
}

function getOrgNodeToggleButtons(nodeId) {
  if (!ownerOrgChartWrap || !nodeId) return [];

  const escapedNodeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(nodeId) : nodeId;
  return Array.from(ownerOrgChartWrap.querySelectorAll(
    `.org-report-count[data-org-node-id="${escapedNodeId}"], .org-collapse-button[data-org-node-id="${escapedNodeId}"]`
  ));
}

function setOrgOpeningPending(section, isPending) {
  const nodeId = section.dataset.orgNodeId;
  if (!nodeId) return;

  getOrgNodeToggleButtons(nodeId).forEach((toggleButton) => {
    toggleButton.classList.toggle("is-opening-pending", isPending);
  });

  const card = ownerOrgChartWrap?.querySelector(`[data-org-card-id="${nodeId}"]`);
  const row = card?.closest(".org-node-row");
  if (!row) return;

  row.querySelectorAll(".org-person-card.is-inactive-branch").forEach((inactiveCard) => {
    inactiveCard.classList.toggle("is-opening-inactive-pending", isPending);
  });
}

function clearOrgOpeningAnimationState(scope = ownerOrgChartWrap) {
  if (!scope) return;

  const temporaryClassSelector = ".is-opening, .is-opening-hidden, .is-opening-card-hidden, .is-opening-card-visible, .is-opening-pending, .is-opening-inactive-pending";
  const elements = [
    ...(scope.matches?.(temporaryClassSelector) ? [scope] : []),
    ...scope.querySelectorAll(temporaryClassSelector)
  ];

  elements.forEach((element) => {
    element.classList.remove(
      "is-opening",
      "is-opening-hidden",
      "is-opening-card-hidden",
      "is-opening-card-visible",
      "is-opening-pending",
      "is-opening-inactive-pending"
    );
  });
}

function cancelOrgOpeningAnimation() {
  orgOpeningAnimationToken += 1;
  if (orgOpeningScrollFrame !== null) {
    window.cancelAnimationFrame(orgOpeningScrollFrame);
    orgOpeningScrollFrame = null;
  }
  clearOrgOpeningAnimationState();
}

function animateOrgOpeningScrollTo(targetScrollTop, animationToken) {
  if (!ownerOrgChartWrap) return;

  const startTop = ownerOrgChartWrap.scrollTop;
  const endTop = Math.max(0, targetScrollTop);
  const distance = endTop - startTop;
  if (Math.abs(distance) < 1) return;

  if (orgOpeningScrollFrame !== null) {
    window.cancelAnimationFrame(orgOpeningScrollFrame);
    orgOpeningScrollFrame = null;
  }

  const startTime = performance.now();
  const easeInOutCubic = (value) => (
    value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2
  );

  const step = (now) => {
    if (!ownerOrgChartWrap || animationToken !== orgOpeningAnimationToken) {
      orgOpeningScrollFrame = null;
      return;
    }

    const progress = Math.min((now - startTime) / ORG_OPENING_SCROLL_DURATION_MS, 1);
    ownerOrgChartWrap.scrollTop = startTop + (distance * easeInOutCubic(progress));

    if (progress < 1) {
      orgOpeningScrollFrame = window.requestAnimationFrame(step);
      return;
    }

    orgOpeningScrollFrame = null;
  };

  orgOpeningScrollFrame = window.requestAnimationFrame(step);
}

function scrollOrgOpeningToSection(section, animationToken) {
  if (!ownerOrgChartWrap || !section) return;

  const wrapRect = ownerOrgChartWrap.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  const targetScrollTop = ownerOrgChartWrap.scrollTop + (sectionRect.top - wrapRect.top) - ORG_OPENING_SCROLL_OFFSET_PX;
  animateOrgOpeningScrollTo(targetScrollTop, animationToken);
}

function animateOwnerOrgChartOpening() {
  if (!ownerOrgChartWrap || prefersReducedOrgMotion()) return;

  const chart = ownerOrgChartWrap.querySelector(".owner-org-chart");
  if (!chart) return;
  const rootCards = Array.from(chart.querySelectorAll(".org-node-row-roots > .org-person-card"));

  const sections = Array.from(chart.querySelectorAll(".org-report-section:not(.is-collapsed)"))
    .filter((section) => !section.closest(".org-report-section.is-collapsed"));
  if (!sections.length && !rootCards.length) return;

  orgOpeningAnimationToken += 1;
  const animationToken = orgOpeningAnimationToken;
  const depths = [...new Set(sections.map((section) => Number(section.dataset.orgOpenDepth)).filter(Number.isFinite))]
    .sort((a, b) => a - b);

  chart.classList.add("is-opening");

  rootCards.forEach((card, rowIndex) => {
    card.style.setProperty("--org-card-index", rowIndex);
    card.classList.add("is-opening-card-hidden");
  });

  window.setTimeout(() => {
    if (animationToken !== orgOpeningAnimationToken) return;

    rootCards.forEach((card) => {
      card.classList.remove("is-opening-card-hidden");
      card.classList.add("is-opening-card-visible");
    });
  }, ORG_OPENING_ROOT_REVEAL_DELAY_MS);

  sections.forEach((section) => {
    section.classList.add("is-opening-hidden");
    setOrgOpeningPending(section, true);

    getDirectOrgSectionCards(section).forEach((card, rowIndex) => {
      card.style.setProperty("--org-card-index", rowIndex);
      card.classList.add("is-opening-card-hidden");
    });
  });

  depths.forEach((depth, depthIndex) => {
    window.setTimeout(() => {
      if (animationToken !== orgOpeningAnimationToken) return;

      const depthSections = sections.filter((section) => Number(section.dataset.orgOpenDepth) === depth);

      depthSections.forEach((section) => {
          section.classList.remove("is-opening-hidden");
          setOrgOpeningPending(section, false);

          getDirectOrgSectionCards(section).forEach((card) => {
            card.classList.remove("is-opening-card-hidden");
            card.classList.add("is-opening-card-visible");
          });
        });

      const firstDepthSection = depthSections[0];
      if (firstDepthSection) {
        window.setTimeout(() => {
          if (animationToken !== orgOpeningAnimationToken) return;
          scrollOrgOpeningToSection(firstDepthSection, animationToken);
        }, 120);
      }
    }, ORG_OPENING_INITIAL_DELAY_MS + (depthIndex * ORG_OPENING_LEVEL_DELAY_MS));
  });

  window.setTimeout(() => {
    if (animationToken !== orgOpeningAnimationToken) return;
    clearOrgOpeningAnimationState(chart);
  }, ORG_OPENING_INITIAL_DELAY_MS + (depths.length * ORG_OPENING_LEVEL_DELAY_MS) + ORG_OPENING_FINISH_DELAY_MS);
}

function getOrgNodeEmail(node, owner) {
  const slug = String(node?.name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(".");
  const domain = getEmailDomain(owner?.email) || "example.com";
  return slug ? `${slug}@${domain}` : (owner?.email || "");
}

function getPersonProfileFromOrgNode(ownerIndex, nodeId) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChartByIndex(ownerIndex);
  const node = orgChart?.nodes?.find((item) => item.id === nodeId);
  if (!owner || !node) return null;

  const dataIndex = getOwnerDataIndex(owner);
  const rowIndex = orgChart.nodes.indexOf(node);

  return {
    ownerIndex: owner.originalIndex,
    name: node.name,
    ownerName: owner.ownerName,
    title: getOrgNodeDisplayTitle(node),
    email: getOrgNodeEmail(node, owner),
    phone: getRawDataPhone(dataIndex, rowIndex),
    location: getProfileLocation(owner, dataIndex)
  };
}

function renderOwnerOrgChart(ownerIndex) {
  if (!ownerOrgChartWrap) return;

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const orgChart = getOwnerOrgChartByIndex(ownerIndex);
  const nodes = orgChart?.nodes || [];
  if (!owner) return;

  if (!nodes.length) {
    ownerOrgChartWrap.innerHTML = `
      <section class="owner-org-panel owner-org-panel-empty">
        <div class="owner-empty-content">
          <p class="owner-org-empty-message">No org chart is available for ${owner.ownerName}.</p>
        </div>
      </section>
    `;
    ownerOrgChartWrap.scrollTop = 0;
    return;
  }

  normalizeOrgExpandedSiblings(ownerIndex, nodes);
  const rootNodes = getOrgReports(nodes, null);

  ownerOrgChartWrap.innerHTML = `
    <section class="owner-org-panel" aria-label="${owner.ownerName} organization chart">
      <div class="owner-org-chart">
        <div class="org-node-row org-node-row-roots">
          ${rootNodes.map((node, rowIndex) => getOrgCard(node, "root", nodes, ownerIndex, rowIndex)).join("")}
        </div>
        ${rootNodes.map((node) => getOrgTreeSection(node, nodes, ownerIndex)).join("")}
      </div>
    </section>
  `;

  ownerOrgChartWrap.scrollTop = 0;
  animateOwnerOrgChartOpening();
}

function syncLeftPanelHeader() {
  const title = document.querySelector(".target-detail-table-panel .title-block h1");
  if (!subtitle || !title) return;

  if (Number.isFinite(activeOrgChartOwnerIndex)) {
    const owner = owners.find((item) => item.originalIndex === activeOrgChartOwnerIndex);
    title.textContent = "Org. Chart";
    subtitle.textContent = owner?.ownerName || "Owner";
    return;
  }

  title.textContent = "Owners";
  subtitle.textContent = `${owners.length} records`;
}

function openOwnerOrgChart(ownerIndex) {
  if (!ownerOrgChartWrap || !tableWrap) return;

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return;

  activeOrgChartOwnerIndex = ownerIndex;
  tableWrap.hidden = true;
  renderOwnerOrgChart(ownerIndex);
  ownerOrgChartWrap.hidden = false;
  syncLeftPanelHeader();
  renderActiveDetail();
}

function openOrgPersonProfile(ownerIndex, nodeId) {
  const profile = getPersonProfileFromOrgNode(ownerIndex, nodeId);
  if (!profile || !contactDetailPanel || !targetDetailCard) return;

  activeDetailOwnerIndex = ownerIndex;
  activeDetailMode = "contact";
  activeContactProfile = profile;
  renderContactDetail(profile);
  contactDetailPanel.hidden = false;
  targetDetailCard.classList.add("has-contact-detail");
  syncActiveDetailRow();
}

function closeOwnerOrgChart() {
  if (!ownerOrgChartWrap || !tableWrap) return;

  const previousOwnerIndex = activeOrgChartOwnerIndex;
  cancelOrgOpeningAnimation();
  activeOrgChartOwnerIndex = null;
  ownerOrgChartWrap.hidden = true;
  ownerOrgChartWrap.innerHTML = "";
  tableWrap.hidden = false;
  syncLeftPanelHeader();

  if (activeDetailOwnerIndex === previousOwnerIndex && activeDetailMode === "owner") {
    renderActiveDetail();
  }
}

function toggleOwnerOrgChart(ownerIndex) {
  if (activeOrgChartOwnerIndex === ownerIndex) {
    closeOwnerOrgChart();
    return;
  }

  openOwnerOrgChart(ownerIndex);
}

function getProfileEmailMarkup(email) {
  if (!email) return `<strong>Not available</strong>`;

  return `<a class="ui-link ui-ellipsis" href="mailto:${email}">${email}</a>`;
}

function getLinkFieldMarkup(label, href, text, enabled = true) {
  const value = enabled && href && text
    ? `<a class="ui-link ui-ellipsis" href="${href}" target="_blank" rel="noreferrer">${text}</a>`
    : `<strong>Not available</strong>`;

  return `
    <div class="profile-modal-field profile-modal-field-full">
      <span>${label}</span>
      ${value}
    </div>
  `;
}

function renderContactDetail(profile) {
  if (!contactDetailPanel || !profile) return;

  const isLeadSaved = savedLeadOwnerIndexes.has(profile.ownerIndex);
  const primaryActionLabel = isLeadSaved ? "Remove from leads" : "Save as lead";

  contactDetailPanel.dataset.ownerIndex = String(profile.ownerIndex);
  contactDetailPanel.dataset.detailMode = "contact";
  contactDetailPanel.innerHTML = `
    <div class="profile-modal-content">
      <div class="profile-modal-hero">
        <span class="profile-avatar" aria-hidden="true">${getInitials(profile.name)}</span>
        <h2 id="contactDetailName">${profile.name}</h2>
        <p>${profile.ownerName}</p>
      </div>

      <div class="profile-modal-fields">
        <div class="profile-modal-field profile-modal-field-full">
          <span>Title</span>
          <strong>${profile.title}</strong>
        </div>
        <div class="profile-modal-field profile-modal-field-full">
          <span>Email</span>
          ${getProfileEmailMarkup(profile.email)}
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
    </div>
  `;
}

function getOwnerProfileLogoMarkup(owner) {
  const fallback = `<span class="owner-profile-logo-fallback${owner.logoSrc ? "" : " is-visible"}">${getInitials(owner.ownerName, logoInitialLength)}</span>`;
  const image = owner.logoSrc
    ? `
      <img
        src="${owner.logoSrc}"
        alt="${owner.logoAlt}"
        onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
      >
    `
    : "";

  return `
    <span class="owner-profile-logo" aria-hidden="true">
      ${fallback}
      ${image}
    </span>
  `;
}

function renderOwnerDetail(owner) {
  if (!contactDetailPanel || !owner) return;

  const contactProfile = getPersonProfileFromOwnerContact(owner.originalIndex);
  const website = getOwnerWebsite(owner);
  const isOrgChartOpen = activeOrgChartOwnerIndex === owner.originalIndex;
  const orgChartActionLabel = isOrgChartOpen ? "Close Org. Chart" : "Open Org. Chart";

  contactDetailPanel.dataset.ownerIndex = String(owner.originalIndex);
  contactDetailPanel.dataset.detailMode = "owner";
  contactDetailPanel.innerHTML = `
    <div class="profile-modal-content owner-profile-content">
      <div class="profile-modal-hero owner-profile-hero">
        ${getOwnerProfileLogoMarkup(owner)}
        <h2 id="contactDetailName">${owner.ownerName}</h2>
        <p>${getOwnerIndustry(owner)}</p>
      </div>

      <div class="profile-modal-fields owner-profile-fields">
        <div class="profile-modal-field profile-modal-field-full">
          <span>Main contact</span>
          <strong>${owner.contactName || "Not available"}</strong>
          ${getProfileEmailMarkup(owner.email)}
        </div>
        ${getLinkFieldMarkup("Website", getOwnerWebsiteUrl(owner), website, owner.hasWebsite)}
        ${getLinkFieldMarkup("LinkedIn", getOwnerLinkedinUrl(owner), "Open LinkedIn", owner.hasLinkedin)}
        <div class="profile-modal-field">
          <span>Contacts</span>
          <strong>${owner.contactCount}</strong>
        </div>
        <div class="profile-modal-field">
          <span>Units</span>
          <strong>${owner.unitCount}</strong>
        </div>
        <div class="profile-modal-field">
          <span>Phone number</span>
          <strong>${contactProfile?.phone || "Not available"}</strong>
        </div>
        <div class="profile-modal-field">
          <span>Location</span>
          <strong>${contactProfile?.location || "United States"}</strong>
        </div>
      </div>

      <div class="owner-profile-franchises" aria-label="Franchises">
        <span>Franchises</span>
        ${getFranchiseLogosColumn(owner)}
      </div>

      <div class="profile-modal-actions">
        <button class="ui-control ui-button ui-button-primary owner-org-chart-toggle ${isOrgChartOpen ? "is-active" : ""}" type="button">
          <img src="../../assets/icons/orgchart.svg" alt="" aria-hidden="true">
          ${orgChartActionLabel}
        </button>
        <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button">Close</button>
      </div>
    </div>
  `;
}

function renderActiveDetail() {
  if (!Number.isFinite(activeDetailOwnerIndex)) return;

  if (activeDetailMode === "contact") {
    renderContactDetail(activeContactProfile || getPersonProfileFromOwnerContact(activeDetailOwnerIndex));
    return;
  }

  const owner = owners.find((item) => item.originalIndex === activeDetailOwnerIndex);
  renderOwnerDetail(owner);
}

function syncActiveDetailRow() {
  if (!tableBody) return;

  tableBody.querySelectorAll("tr[data-owner-index]").forEach((row) => {
    const ownerIndex = Number(row.dataset.ownerIndex);
    row.classList.toggle("is-selected", ownerIndex === activeDetailOwnerIndex);
  });
}

function openContactDetail(ownerIndex) {
  const profile = getPersonProfileFromOwnerContact(ownerIndex);
  if (!profile || !contactDetailPanel || !targetDetailCard) return;

  activeDetailOwnerIndex = ownerIndex;
  activeDetailMode = "contact";
  activeContactProfile = profile;
  renderContactDetail(profile);
  contactDetailPanel.hidden = false;
  targetDetailCard.classList.add("has-contact-detail");
  syncActiveDetailRow();
}

function openOwnerDetail(ownerIndex) {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner || !contactDetailPanel || !targetDetailCard) return;

  const previousOwnerIndex = activeDetailOwnerIndex;
  activeDetailOwnerIndex = ownerIndex;
  activeDetailMode = "owner";
  activeContactProfile = null;
  renderOwnerDetail(owner);
  contactDetailPanel.hidden = false;
  targetDetailCard.classList.add("has-contact-detail");
  if (previousOwnerIndex !== ownerIndex) {
    animateDetailPanelScrollToTop(contactDetailPanel);
  }
  syncActiveDetailRow();
}

function closeDetailPanel() {
  if (!contactDetailPanel || !targetDetailCard) return;

  activeDetailOwnerIndex = null;
  activeDetailMode = null;
  activeContactProfile = null;
  contactDetailPanel.hidden = true;
  contactDetailPanel.innerHTML = "";
  delete contactDetailPanel.dataset.ownerIndex;
  delete contactDetailPanel.dataset.detailMode;
  targetDetailCard.classList.remove("has-contact-detail");
  if (Number.isFinite(activeOrgChartOwnerIndex)) {
    closeOwnerOrgChart();
  }
  syncActiveDetailRow();
}

function getContactColumn(owner) {
  const isLeadSaved = savedLeadOwnerIndexes.has(owner.originalIndex);
  const leadTooltip = isLeadSaved ? "Remove from leads" : "Save as lead";
  const contactDetail = owner.email
    ? `<span class="ui-link ui-ellipsis email contact-email-copy" tabindex="0" role="button">${owner.email}</span>`
    : `<span class="email">${owner.contactDetail || "Public profile"}</span>`;

  return `
    <div class="contact-cell-action ${isLeadSaved ? "is-lead-saved" : ""}">
      <button
        class="ui-control contact-profile-action"
        type="button"
        data-owner-index="${owner.originalIndex}"
        aria-label="Open profile for ${owner.contactName}"
      >
        <span class="contact-name">${owner.contactName}</span>
        ${contactDetail}
      </button>
      <div class="contact-row-actions">
        <button
          class="contact-add-lead-action ${isLeadSaved ? "is-saved" : ""}"
          type="button"
          data-owner-index="${owner.originalIndex}"
          data-tooltip="${leadTooltip}"
          aria-label="${leadTooltip} for ${owner.contactName}"
        ></button>
      </div>
    </div>
  `;
}

function renderOwners(rows) {
  if (!tableBody) return;

  tableBody.innerHTML = rows
    .map((owner) => `
      <tr class="${activeDetailOwnerIndex === owner.originalIndex ? "is-selected" : ""}" data-owner-index="${owner.originalIndex}">
        <td>
          <div class="name-cell">
            <div class="logo">
              <span class="owner-logo-fallback${owner.logoSrc ? "" : " is-visible"}">${getInitials(owner.ownerName, logoInitialLength)}</span>
              ${owner.logoSrc ? `
                <img
                  src="${owner.logoSrc}"
                  alt="${owner.logoAlt}"
                  onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
                >
              ` : ""}
            </div>
            <div class="owner-meta">
              <div class="owner-name">${owner.ownerName}</div>
              <div class="icons">
                ${getOwnerIcon("web", owner.hasWebsite)}
                ${getOwnerIcon("linkedin", owner.hasLinkedin)}
              </div>
            </div>
          </div>
        </td>
        <td class="contact-cell">${getContactColumn(owner)}</td>
        <td>
          <span class="numeric-cell">${owner.contactCount}</span>
        </td>
        <td>
          <span class="numeric-cell">${owner.unitCount}</span>
        </td>
        <td>${getFranchiseLogosColumn(owner)}</td>
      </tr>
    `)
    .join("");
}

function getSortValue(owner, key) {
  if (key === "contactCount") return owner.contactCount;
  if (key === "unitCount") return owner.unitCount;
  if (key === "franchise") return owner.franchises.length;
  return owner[key] || "";
}

const NUMERIC_SORT_KEYS = new Set(["contactCount", "unitCount", "franchise"]);

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

function compareOwnersByColumn(a, b, column) {
  const valueA = getSortValue(a, column.key);
  const valueB = getSortValue(b, column.key);
  const direction = getSortDirectionMultiplier(column.key, column.direction);
  let comparison;

  if (column.key === "franchise") {
    comparison = valueA - valueB || collator.compare(a.franchise, b.franchise);
  } else if (typeof valueA === "number" && typeof valueB === "number") {
    comparison = valueA - valueB;
  } else {
    comparison = collator.compare(String(valueA), String(valueB));
  }

  return comparison * direction;
}

function sortOwners() {
  if (!sortState.columns.length) {
    displayedOwners = [...owners].sort((a, b) => a.originalIndex - b.originalIndex);
    return;
  }

  displayedOwners = [...owners].sort((a, b) => {
    for (const column of sortState.columns) {
      const comparison = compareOwnersByColumn(a, b, column);
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

function applySort() {
  sortOwners();
  renderOwners(displayedOwners);
  syncSortHeaders();
  syncActiveDetailRow();
  syncLeftPanelHeader();
}

function syncTargetHeader() {
  if (!activeTarget) return;

  const title = activeTarget.detailTitle || activeTarget.name;
  const titleElement = document.querySelector(".target-detail-title");
  const descriptionElement = document.querySelector(".target-detail-description");
  const metaElement = document.querySelector(".target-detail-meta");

  document.title = title;

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (descriptionElement && activeTarget.description) {
    descriptionElement.textContent = activeTarget.description;
  }

  if (metaElement) {
    const publisher = activeTarget.publishedBy || "Gregory Ugwi";
    const publishedAt = activeTarget.publishedAt || "14 Jun 2026";
    metaElement.innerHTML = `Published by <span>${publisher}</span> · ${publishedAt}`;
  }
}

function closeToolbarDropdowns(exceptDropdown = null) {
  toolbarDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) return;
    dropdown.removeAttribute("open");
  });
}

if (changeNav) changeNav.hidden = true;
if (changesToggleOption) changesToggleOption.hidden = true;
if (changesToggleIcon) changesToggleIcon.src = "../../assets/icons/unhide.svg";
if (changesToggleLabel) changesToggleLabel.textContent = "No changes";

sortHeaders.forEach((header) => {
  header.addEventListener("click", (event) => {
    const { sortKey } = header.dataset;

    cycleSortState(sortKey, { additive: event.metaKey || event.ctrlKey });

    applySort();
    tableWrap?.scrollTo({ top: 0, behavior: "auto" });
  });
});

tableBody?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const contactProfileButton = event.target.closest(".contact-profile-action");
  if (contactProfileButton) {
    event.preventDefault();
    event.stopPropagation();

    const ownerIndex = Number(contactProfileButton.dataset.ownerIndex);
    if (Number.isFinite(ownerIndex)) openContactDetail(ownerIndex);
    return;
  }

  const leadButton = event.target.closest(".contact-add-lead-action");
  if (leadButton) {
    event.preventDefault();
    event.stopPropagation();

    const ownerIndex = Number(leadButton.dataset.ownerIndex);
    if (!Number.isFinite(ownerIndex)) return;

    if (savedLeadOwnerIndexes.has(ownerIndex)) {
      savedLeadOwnerIndexes.delete(ownerIndex);
    } else {
      savedLeadOwnerIndexes.add(ownerIndex);
    }

    renderOwners(displayedOwners);
    if (activeDetailOwnerIndex === ownerIndex) {
      renderActiveDetail();
    }
    return;
  }

  if (event.target.closest(".contact-cell")) return;

  const row = event.target.closest("tr[data-owner-index]");
  const ownerIndex = Number(row?.dataset.ownerIndex);
  if (Number.isFinite(ownerIndex)) openOwnerDetail(ownerIndex);
});

contactDetailPanel?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const orgChartButton = event.target.closest(".owner-org-chart-toggle");
  if (orgChartButton) {
    const ownerIndex = Number(contactDetailPanel.dataset.ownerIndex);
    if (Number.isFinite(ownerIndex)) toggleOwnerOrgChart(ownerIndex);
    return;
  }

  const saveLeadButton = event.target.closest(".profile-modal-primary");
  if (saveLeadButton) {
    const ownerIndex = Number(contactDetailPanel.dataset.ownerIndex);
    if (!Number.isFinite(ownerIndex)) return;

    if (savedLeadOwnerIndexes.has(ownerIndex)) {
      savedLeadOwnerIndexes.delete(ownerIndex);
    } else {
      savedLeadOwnerIndexes.add(ownerIndex);
    }

    renderOwners(displayedOwners);
    renderActiveDetail();
    return;
  }

  if (event.target.closest(".profile-modal-secondary")) {
    closeDetailPanel();
  }
});

function handleOrgCollapseToggle(toggleButton) {
  cancelOrgOpeningAnimation();

  const ownerIndex = Number(toggleButton.dataset.ownerIndex);
  const nodeId = toggleButton.dataset.orgNodeId;
  if (Number.isNaN(ownerIndex) || !nodeId) return;

  const nodes = getOwnerOrgChartByIndex(ownerIndex)?.nodes || [];
  const changedNodeIds = toggleOrgNodeCollapsed(ownerIndex, nodeId, nodes);
  changedNodeIds.forEach((changedNodeId) => syncOrgCollapsedUi(ownerIndex, changedNodeId));
  syncOrgInactiveCards(ownerIndex, nodes);
}

ownerOrgChartWrap?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const orgCountToggle = event.target.closest(".org-report-count");
  if (orgCountToggle) {
    event.preventDefault();
    handleOrgCollapseToggle(orgCountToggle);
    return;
  }

  const orgHeaderToggle = event.target.closest(".org-collapse-button");
  if (orgHeaderToggle) {
    event.preventDefault();
    handleOrgCollapseToggle(orgHeaderToggle);
    return;
  }

  const orgPersonCard = event.target.closest(".org-person-card[data-owner-index][data-org-card-id]");
  if (orgPersonCard) {
    const ownerIndex = Number(orgPersonCard.dataset.ownerIndex);
    const nodeId = orgPersonCard.dataset.orgCardId;
    if (Number.isFinite(ownerIndex) && nodeId) openOrgPersonProfile(ownerIndex, nodeId);
  }
});

ownerOrgChartWrap?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (!(event.target instanceof Element)) return;

  const orgPersonCard = event.target.closest(".org-person-card[data-owner-index][data-org-card-id]");
  if (!orgPersonCard || event.target.closest(".org-report-count")) return;

  event.preventDefault();
  const ownerIndex = Number(orgPersonCard.dataset.ownerIndex);
  const nodeId = orgPersonCard.dataset.orgCardId;
  if (Number.isFinite(ownerIndex) && nodeId) openOrgPersonProfile(ownerIndex, nodeId);
});

if (targetToolbarMenuDropdown) {
  targetToolbarMenuDropdown.addEventListener("toggle", () => {
    if (targetToolbarMenuDropdown.open) closeToolbarDropdowns(targetToolbarMenuDropdown);
  });
}

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
  if (event.key === "Escape" && contactDetailPanel && !contactDetailPanel.hidden) {
    closeDetailPanel();
    return;
  }

  if (event.key === "Escape") closeToolbarDropdowns();
});

syncTargetHeader();
applySort();
