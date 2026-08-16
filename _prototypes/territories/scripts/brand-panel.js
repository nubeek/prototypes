function formatTerritoryCount(count) {
  return `${count} ${count === 1 ? "territory" : "territories"}`;
}

const TERRITORY_STATUS_SORT_ORDER = {
  available: 0,
  established: 1,
  sold: 2
};

// Passing options to localeCompare builds a collator per call, which dominated
// list rendering once a search returned thousands of rows. One shared collator
// plus a memoised sort key keeps the comparison to a string compare.
const territoryNameCollator = new Intl.Collator(undefined, { sensitivity: "base" });

function getTerritorySortName(territory) {
  if (territory.panelSortName === undefined) {
    territory.panelSortName = String(territory.name || territory.state || "");
  }
  return territory.panelSortName;
}

function compareTerritoriesByStatusThenName(left, right) {
  const statusDiff = (TERRITORY_STATUS_SORT_ORDER[left.status] ?? 99)
    - (TERRITORY_STATUS_SORT_ORDER[right.status] ?? 99);
  if (statusDiff !== 0) return statusDiff;

  return territoryNameCollator.compare(
    getTerritorySortName(left),
    getTerritorySortName(right)
  );
}

function formatTerritoryPanelStatus(status) {
  return String(status || "").replace(/^\w/, (character) => character.toUpperCase());
}

const TERRITORY_PANEL_GEO_LEVEL_LABELS = {
  region: "State",
  state: "State",
  cbsa: "CBSA",
  district: "County",
  place: "City",
  address: "Street"
};

function formatTerritoryPanelGeoLevel(geoType) {
  const normalizedGeoType = String(geoType || "state").toLowerCase();
  if (TERRITORY_PANEL_GEO_LEVEL_LABELS[normalizedGeoType]) {
    return TERRITORY_PANEL_GEO_LEVEL_LABELS[normalizedGeoType];
  }
  return normalizedGeoType.replace(/^\w/, (character) => character.toUpperCase());
}

const TERRITORY_SHAPE_SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TERRITORY_SHAPE_WIDTH = 34;
const TERRITORY_SHAPE_HEIGHT = 24;
const TERRITORY_SHAPE_PADDING = 2;
// The thumbnail is 34x24px, so past this many points per ring the extra
// vertices cost projection time without changing a single pixel.
const TERRITORY_SHAPE_MAX_RING_POINTS = 96;
const TERRITORY_PANEL_DENSITY_MID_COLOR = "#a98abc";
const TERRITORY_PANEL_DENSITY_MID_OPACITY = 0.51;
const BRAND_LIST_ENTER_DURATION_MS = 280;
const BRAND_LIST_ENTER_MAX_MS = 2000;
const BRAND_LIST_ENTER_MIN_STAGGER_MS = 14;
const BRAND_LIST_ENTER_MAX_STAGGER_MS = 48;
const BRAND_LIST_ENTER_MAX_TARGETS = 120;
const BRAND_LIST_ENTER_WAIT_MS = 50;
const BRAND_LIST_BUILD_SLICE_MS = 8;

function getTerritoryShapePolygons(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function projectTerritoryShapeLatitude(latitude) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (clamped * Math.PI) / 180;
  return Math.log(Math.tan((Math.PI / 4) + (radians / 2)));
}

const territoryShapePathCache = new Map();
const territoryShapeElementCache = new Map();
const territoryShapeHatchPatternIds = new Map();
let territoryShapeDefs = null;

const TERRITORY_PANEL_DENSITY_STYLE = {
  color: TERRITORY_PANEL_DENSITY_MID_COLOR,
  fillOpacity: TERRITORY_PANEL_DENSITY_MID_OPACITY
};

// Hatch patterns live in one shared defs block so identical thumbnails can be
// cloned instead of each row carrying its own <pattern>.
function getTerritoryShapeHatchPatternId(color, fillOpacity) {
  const cacheKey = `${color}|${fillOpacity}`;
  const existingId = territoryShapeHatchPatternIds.get(cacheKey);
  if (existingId) return existingId;

  if (!territoryShapeDefs) {
    territoryShapeDefs = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "svg");
    territoryShapeDefs.setAttribute("aria-hidden", "true");
    territoryShapeDefs.setAttribute("width", "0");
    territoryShapeDefs.setAttribute("height", "0");
    territoryShapeDefs.style.position = "absolute";
    territoryShapeDefs.append(
      document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "defs")
    );
    document.body.append(territoryShapeDefs);
  }

  const patternId = `territory-shape-hatch-${territoryShapeHatchPatternIds.size + 1}`;
  const pattern = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "pattern");
  const stripe = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "rect");

  pattern.setAttribute("id", patternId);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "4");
  pattern.setAttribute("height", "4");
  pattern.setAttribute("patternTransform", "rotate(45)");
  stripe.setAttribute("width", "2");
  stripe.setAttribute("height", "4");
  stripe.setAttribute("fill", color);
  pattern.append(stripe);
  territoryShapeDefs.firstElementChild.append(pattern);
  territoryShapeHatchPatternIds.set(cacheKey, patternId);

  return patternId;
}

function sampleTerritoryShapeRing(ring) {
  if (ring.length <= TERRITORY_SHAPE_MAX_RING_POINTS) return ring;

  const step = Math.ceil(ring.length / TERRITORY_SHAPE_MAX_RING_POINTS);
  const sampled = [];
  for (let index = 0; index < ring.length - 1; index += step) {
    sampled.push(ring[index]);
  }
  sampled.push(ring[ring.length - 1]);

  return sampled;
}

function buildTerritoryShapePathData(geometry) {
  const polygons = getTerritoryShapePolygons(geometry);
  if (!polygons.length) return null;

  const referenceLongitude = polygons[0]?.[0]?.[0]?.[0] ?? 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const projectedPolygons = polygons.map((rings) => rings.map((ring) => (
    sampleTerritoryShapeRing(ring).map(([longitude, latitude]) => {
      let wrappedLongitude = longitude;
      while (wrappedLongitude - referenceLongitude > 180) wrappedLongitude -= 360;
      while (wrappedLongitude - referenceLongitude < -180) wrappedLongitude += 360;

      const x = (wrappedLongitude * Math.PI) / 180;
      const y = projectTerritoryShapeLatitude(latitude);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      return [x, y];
    })
  )));

  const shapeWidth = maxX - minX;
  const shapeHeight = maxY - minY;
  if (!shapeWidth || !shapeHeight) return null;

  const availableWidth = TERRITORY_SHAPE_WIDTH - (TERRITORY_SHAPE_PADDING * 2);
  const availableHeight = TERRITORY_SHAPE_HEIGHT - (TERRITORY_SHAPE_PADDING * 2);
  const scale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight);
  const offsetX = (TERRITORY_SHAPE_WIDTH - (shapeWidth * scale)) / 2;
  const offsetY = (TERRITORY_SHAPE_HEIGHT - (shapeHeight * scale)) / 2;

  return projectedPolygons.map((rings) => (
    rings.map((ring) => (
      ring.map(([x, y], index) => {
        const projectedX = offsetX + ((x - minX) * scale);
        const projectedY = offsetY + ((maxY - y) * scale);
        return `${index ? "L" : "M"}${projectedX.toFixed(2)} ${projectedY.toFixed(2)}`;
      }).join(" ") + " Z"
    )).join(" ")
  )).join(" ");
}

function getTerritoryShapePathData(geometry, cacheKey) {
  if (!cacheKey) return buildTerritoryShapePathData(geometry);

  if (territoryShapePathCache.has(cacheKey)) {
    return territoryShapePathCache.get(cacheKey);
  }

  const pathData = buildTerritoryShapePathData(geometry);
  territoryShapePathCache.set(cacheKey, pathData);
  return pathData;
}

function buildTerritoryShapeElement(pathData, color, status, fillOpacity) {
  const svg = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "svg");
  const path = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "path");
  const isEstablished = status === "established";

  svg.classList.add("territory-brand-territory__shape");
  svg.setAttribute("viewBox", `0 0 ${TERRITORY_SHAPE_WIDTH} ${TERRITORY_SHAPE_HEIGHT}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  path.setAttribute("d", pathData);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  path.setAttribute("fill-rule", "evenodd");

  const resolvedOpacity = fillOpacity ?? (isEstablished ? 0.55 : 0.25);
  path.setAttribute("fill-opacity", String(resolvedOpacity));
  path.setAttribute(
    "fill",
    isEstablished
      ? `url(#${getTerritoryShapeHatchPatternId(color, resolvedOpacity)})`
      : color
  );

  svg.append(path);
  return svg;
}

// The same geometry shows up once per brand holding that territory, so both the
// projected path and the finished node are cached and handed out as clones.
function createTerritoryShape(geometry, color, { status, fillOpacity, cacheKey } = {}) {
  const pathData = getTerritoryShapePathData(geometry, cacheKey);
  if (!pathData) return null;

  if (!cacheKey) {
    return buildTerritoryShapeElement(pathData, color, status, fillOpacity);
  }

  const elementKey = `${cacheKey}|${color}|${status || ""}|${fillOpacity ?? ""}`;
  let template = territoryShapeElementCache.get(elementKey);
  if (!template) {
    template = buildTerritoryShapeElement(pathData, color, status, fillOpacity);
    territoryShapeElementCache.set(elementKey, template);
  }

  return template.cloneNode(true);
}

const collapsedTerritoryBrandIds = new Set();
let brandPanelFloatingTooltip = null;

function getBrandPanelFloatingTooltip() {
  if (!brandPanelFloatingTooltip) {
    brandPanelFloatingTooltip = document.createElement("div");
    brandPanelFloatingTooltip.className = "filter-combobox-floating-tooltip";
  }

  return brandPanelFloatingTooltip;
}

function positionBrandPanelFloatingTooltip(target) {
  const tooltipText = target.dataset.tooltip;
  if (!tooltipText) return;

  const tooltip = getBrandPanelFloatingTooltip();
  tooltip.textContent = tooltipText;

    if (!tooltip.isConnected) {
      document.body.append(tooltip);
    }

    window.fitTooltipToContent?.(tooltip);

    const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 8;
  const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  const left = Math.min(
    Math.max(viewportPadding, centeredLeft),
    window.innerWidth - tooltipRect.width - viewportPadding
  );
  const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showBrandPanelFloatingTooltip(event) {
  positionBrandPanelFloatingTooltip(event.currentTarget);
  getBrandPanelFloatingTooltip().classList.add("is-visible");
}

function hideBrandPanelFloatingTooltip() {
  brandPanelFloatingTooltip?.classList.remove("is-visible");
}

function bindBrandPanelFloatingTooltip(button) {
  button.addEventListener("mouseenter", showBrandPanelFloatingTooltip);
  button.addEventListener("mouseleave", hideBrandPanelFloatingTooltip);
  button.addEventListener("focus", showBrandPanelFloatingTooltip);
  button.addEventListener("blur", hideBrandPanelFloatingTooltip);
  button.addEventListener("click", hideBrandPanelFloatingTooltip);
}
let selectedBrandPanelTerritoryKey = null;
let selectedBrandPanelCompareKey = null;
let territoryBrandListBuildToken = 0;
let brandListEnterAnimationToken = 0;
let brandListEnterFinishTimer = null;
let brandListEnterWaitTimer = null;
let brandListEnterPendingList = null;
let brandListEnterArmed = false;
let brandListEnterActiveTargets = [];

function isTerritoryBrandListLoadingVisible() {
  const loadingEl = document.getElementById("territoryMapLoading");
  return Boolean(loadingEl && !loadingEl.hidden);
}

// Only the rows near the top of the scroll container are ever seen entering, so
// collection stops at the animation cap. Staggering all 6k+ rows of a wide search
// would mutate inline styles on every one of them and pull the whole list into
// the render tree, which is exactly the cost content-visibility avoids.
function collectTerritoryBrandListEnterTargets(list) {
  const targets = [];

  for (const item of list.querySelectorAll(".territory-brand-item")) {
    const header = item.querySelector(".territory-brand-item__header");
    if (header) {
      targets.push(header);
    }

    const territoryList = item.querySelector(".territory-brand-territories");
    if (!territoryList?.hidden) {
      for (const target of territoryList.children) {
        targets.push(target);
        if (targets.length >= BRAND_LIST_ENTER_MAX_TARGETS) return targets;
      }
    }

    const brandDivider = item.querySelector(".territory-brand-item__divider");
    if (brandDivider) {
      targets.push(brandDivider);
    }

    if (targets.length >= BRAND_LIST_ENTER_MAX_TARGETS) return targets;
  }

  return targets;
}

function finishTerritoryBrandListEnterAnimation(list, targets = brandListEnterActiveTargets) {
  if (brandListEnterFinishTimer) {
    window.clearTimeout(brandListEnterFinishTimer);
    brandListEnterFinishTimer = null;
  }

  list?.classList.remove("is-entering", "is-entering-active");
  targets.forEach((target) => {
    target.classList.remove("territory-brand-list__animate-item");
    target.style.removeProperty("--enter-index");
    target.style.removeProperty("--enter-stagger");
  });
  brandListEnterActiveTargets = [];
}

function cancelTerritoryBrandListEnterAnimation(list = brandListEnterPendingList) {
  brandListEnterAnimationToken += 1;
  brandListEnterPendingList = null;
  brandListEnterArmed = false;

  if (brandListEnterWaitTimer) {
    window.clearTimeout(brandListEnterWaitTimer);
    brandListEnterWaitTimer = null;
  }

  finishTerritoryBrandListEnterAnimation(list, brandListEnterActiveTargets);
}

function isTerritoryBrandListEnterPending() {
  return Boolean(brandListEnterPendingList) || brandListEnterArmed;
}

function startTerritoryBrandListEnterWithMap() {
  brandListEnterArmed = false;
  window.territoryMapControls?.notifyListEnterStarted?.();
}

function playTerritoryBrandListEnterAnimation(list, token = brandListEnterAnimationToken) {
  if (!list || token !== brandListEnterAnimationToken) return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const targets = collectTerritoryBrandListEnterTargets(list);
  brandListEnterArmed = true;
  if (!targets.length) {
    startTerritoryBrandListEnterWithMap();
    return;
  }

  finishTerritoryBrandListEnterAnimation(list, brandListEnterActiveTargets);
  brandListEnterActiveTargets = targets;

  const animatedTargetCount = Math.min(targets.length, BRAND_LIST_ENTER_MAX_TARGETS);
  const staggerMs = Math.min(
    BRAND_LIST_ENTER_MAX_STAGGER_MS,
    Math.max(
      BRAND_LIST_ENTER_MIN_STAGGER_MS,
      BRAND_LIST_ENTER_MAX_MS / Math.max(animatedTargetCount, 1)
    )
  );

  targets.forEach((target, index) => {
    const enterIndex = Math.min(index, animatedTargetCount - 1);
    target.classList.add("territory-brand-list__animate-item");
    target.style.setProperty("--enter-index", String(enterIndex));
    target.style.setProperty("--enter-stagger", `${staggerMs}ms`);
  });

  list.classList.remove("is-entering-active");
  list.classList.add("is-entering");

  if (motionQuery.matches) {
    list.classList.add("is-entering-active");
    startTerritoryBrandListEnterWithMap();
    brandListEnterFinishTimer = window.setTimeout(
      () => finishTerritoryBrandListEnterAnimation(list, targets),
      0
    );
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (token !== brandListEnterAnimationToken) return;
      list.classList.add("is-entering-active");
      startTerritoryBrandListEnterWithMap();
    });
  });

  const totalMs = BRAND_LIST_ENTER_DURATION_MS + Math.max(0, animatedTargetCount - 1) * staggerMs;
  brandListEnterFinishTimer = window.setTimeout(
    () => finishTerritoryBrandListEnterAnimation(list, targets),
    totalMs + 40
  );
}

function scheduleTerritoryBrandListEnterAnimation(list) {
  cancelTerritoryBrandListEnterAnimation(list);

  const token = ++brandListEnterAnimationToken;
  brandListEnterPendingList = list;

  const tryPlay = () => {
    brandListEnterWaitTimer = null;
    if (token !== brandListEnterAnimationToken || brandListEnterPendingList !== list) return;

    if (isTerritoryBrandListLoadingVisible()) {
      brandListEnterWaitTimer = window.setTimeout(tryPlay, BRAND_LIST_ENTER_WAIT_MS);
      return;
    }

    brandListEnterPendingList = null;
    playTerritoryBrandListEnterAnimation(list, token);
  };

  tryPlay();
}

function notifyTerritoryBrandListLoadingHidden() {
  if (!brandListEnterPendingList) return;

  if (brandListEnterWaitTimer) {
    window.clearTimeout(brandListEnterWaitTimer);
    brandListEnterWaitTimer = null;
  }

  if (isTerritoryBrandListLoadingVisible()) return;

  const list = brandListEnterPendingList;
  const token = brandListEnterAnimationToken;
  brandListEnterPendingList = null;
  playTerritoryBrandListEnterAnimation(list, token);
}

function setTerritoryBrandItemExpanded(
  toggle,
  expandToggle,
  territoryList,
  brandId,
  expanded,
  { syncExpandToggle = true } = {}
) {
  toggle.setAttribute("aria-expanded", String(expanded));
  expandToggle.setAttribute("aria-expanded", String(expanded));
  territoryList.hidden = !expanded;

  if (brandId) {
    if (expanded) {
      collapsedTerritoryBrandIds.delete(brandId);
    } else {
      collapsedTerritoryBrandIds.add(brandId);
    }
  }

  if (syncExpandToggle) {
    syncTerritoryBrandPanelExpandToggle();
  }
}

function createTerritoryBrandItem(brand, territories, densityStyle) {
  const item = document.createElement("li");
  const header = document.createElement("div");
  const toggle = document.createElement("button");
  const filterButton = document.createElement("button");
  const filterIcon = document.createElement("img");
  const expandToggle = document.createElement("button");
  const logo = document.createElement("img");
  const details = document.createElement("div");
  const name = document.createElement("span");
  const count = document.createElement("span");
  const chevron = document.createElement("img");
  const territoryList = document.createElement("ul");
  const territoryListId = `territoryBrandTerritories-${brand.id}`;
  const isExpanded = !collapsedTerritoryBrandIds.has(brand.id);

  item.className = "territory-brand-item";
  item.dataset.brandId = brand.id;

  header.className = "territory-brand-item__header";

  toggle.className = "ui-control ui-button-ghost territory-brand-item__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", String(isExpanded));
  toggle.setAttribute("aria-controls", territoryListId);

  filterButton.className = "ui-control ui-button-ghost territory-brand-item__filter";
  filterButton.type = "button";
  filterButton.setAttribute("aria-label", `Add ${brand.brand} to Franchise filter`);
  filterButton.dataset.tooltip = "Add to\nFranchise filter";

  filterIcon.className = "territory-brand-item__filter-icon";
  filterIcon.src = "assets/filter-single.svg";
  filterIcon.alt = "";
  filterIcon.setAttribute("aria-hidden", "true");

  expandToggle.className = "ui-control ui-button-ghost territory-brand-item__expand";
  expandToggle.type = "button";
  expandToggle.setAttribute("aria-expanded", String(isExpanded));
  expandToggle.setAttribute("aria-controls", territoryListId);
  expandToggle.setAttribute("aria-label", `Toggle ${brand.brand} territories`);

  logo.className = "territory-brand-item__logo";
  logo.src = brand.logo;
  logo.alt = "";
  logo.loading = "lazy";
  logo.decoding = "async";
  logo.setAttribute("aria-hidden", "true");

  details.className = "territory-brand-item__details";

  name.className = "territory-brand-item__name";
  name.textContent = brand.brand;

  count.className = "territory-brand-item__count";
  count.textContent = formatTerritoryCount(territories.length);

  chevron.className = "territory-brand-item__chevron";
  chevron.src = "assets/chevron.svg";
  chevron.alt = "";
  chevron.setAttribute("aria-hidden", "true");

  territoryList.className = "territory-brand-territories";
  territoryList.id = territoryListId;
  territoryList.hidden = !isExpanded;

  territories.forEach((territory, index) => {
    const territoryItem = document.createElement("li");
    const territoryRow = document.createElement("div");
    const territoryButton = document.createElement("button");
    const territoryLabel = document.createElement("span");
    const territoryMeta = document.createElement("div");
    const territoryGeoLevel = document.createElement("span");
    const territoryStatus = document.createElement("span");
    const territoryInfoButton = document.createElement("button");
    const territoryInfoIcon = document.createElement("img");
    const territoryGeoKey = territory.geoKey || territory.state;
    const territoryShape = createTerritoryShape(territory.geometry, densityStyle?.color || brand.color, {
      status: territory.status,
      fillOpacity: densityStyle?.fillOpacity,
      cacheKey: territoryGeoKey
    });
    const territoryKey = `${territory.brandId}:${territoryGeoKey}`;
    const isSelected = territoryKey === selectedBrandPanelTerritoryKey;
    const isCompare = territoryKey === selectedBrandPanelCompareKey;

    territoryItem.className = "territory-brand-territory";
    territoryRow.className = "territory-brand-territory__row";
    territoryRow.classList.toggle("is-selected", isSelected);
    territoryRow.classList.toggle("is-compare", isCompare && !isSelected);
    territoryRow.dataset.brandId = territory.brandId;
    territoryRow.dataset.geoKey = territoryGeoKey;
    territoryButton.className = "ui-control territory-brand-territory__button";
    territoryButton.classList.toggle("is-selected", isSelected);
    territoryButton.classList.toggle("is-compare", isCompare);
    territoryButton.type = "button";
    territoryButton.dataset.territoryKey = territoryKey;
    territoryButton.setAttribute("aria-pressed", String(isSelected || isCompare));
    territoryLabel.className = "territory-brand-territory__label";
    territoryLabel.textContent = territory.name || territory.state;
    territoryMeta.className = "territory-brand-territory__meta";
    territoryGeoLevel.className = "territory-brand-territory__geo-level";
    territoryGeoLevel.textContent = formatTerritoryPanelGeoLevel(territory.geoType);
    territoryStatus.className = "territory-brand-territory__status";
    territoryStatus.textContent = formatTerritoryPanelStatus(territory.status);
    territoryInfoButton.className = "ui-control territory-brand-territory__info";
    territoryInfoButton.type = "button";
    territoryInfoButton.setAttribute("aria-label", "Request information");
    territoryInfoIcon.className = "territory-brand-territory__info-icon";
    territoryInfoIcon.src = "assets/info.svg";
    territoryInfoIcon.alt = "";
    territoryInfoIcon.loading = "lazy";
    territoryInfoIcon.decoding = "async";
    territoryInfoIcon.setAttribute("aria-hidden", "true");

    if (territoryShape) {
      territoryButton.append(territoryShape);
    }
    territoryButton.append(territoryLabel);
    territoryInfoButton.append(territoryInfoIcon);
    territoryMeta.append(territoryGeoLevel, territoryStatus, territoryInfoButton);
    territoryRow.append(territoryButton, territoryMeta);

    territoryItem.append(territoryRow);
    territoryList.append(territoryItem);

    if (index < territories.length - 1) {
      const territoryDivider = document.createElement("li");
      territoryDivider.className = "territory-brand-territory-divider";
      territoryDivider.setAttribute("aria-hidden", "true");
      territoryList.append(territoryDivider);
    }
  });

  details.append(name, count);
  filterButton.append(filterIcon);
  expandToggle.append(chevron);
  toggle.append(logo, details);
  header.append(toggle, filterButton, expandToggle);

  const brandDivider = document.createElement("div");
  brandDivider.className = "territory-brand-item__divider";
  brandDivider.setAttribute("aria-hidden", "true");

  item.append(header, territoryList, brandDivider);

  return item;
}

function toggleTerritoryBrandItemFromElement(element) {
  const item = element.closest(".territory-brand-item");
  const toggle = item?.querySelector(".territory-brand-item__toggle");
  const expandToggle = item?.querySelector(".territory-brand-item__expand");
  const territoryList = item?.querySelector(".territory-brand-territories");
  if (!item || !toggle || !expandToggle || !territoryList) return;

  setTerritoryBrandItemExpanded(
    toggle,
    expandToggle,
    territoryList,
    item.dataset.brandId,
    toggle.getAttribute("aria-expanded") !== "true"
  );
}

// One listener per event type on the list root. Binding them per row meant tens
// of thousands of listeners were attached and thrown away on every refresh.
function bindTerritoryBrandListDelegates(list) {
  list.addEventListener("click", (event) => {
    const infoButton = event.target.closest(".territory-brand-territory__info");
    if (infoButton) {
      const row = infoButton.closest(".territory-brand-territory__row");
      event.stopPropagation();
      window.territoryMapSelection?.select?.(row?.dataset.brandId, row?.dataset.geoKey);
      return;
    }

    const territoryButton = event.target.closest(".territory-brand-territory__button");
    if (territoryButton) {
      const row = territoryButton.closest(".territory-brand-territory__row");
      window.territoryMapSelection?.toggle?.(row?.dataset.brandId, row?.dataset.geoKey, {
        compare: Boolean(event.metaKey || event.ctrlKey)
      });
      return;
    }

    const filterButton = event.target.closest(".territory-brand-item__filter");
    if (filterButton) {
      event.stopPropagation();
      hideBrandPanelFloatingTooltip();
      window.territoryFilters?.addFranchise?.(
        filterButton.closest(".territory-brand-item")?.dataset.brandId
      );
      return;
    }

    const brandToggle = event.target.closest(
      ".territory-brand-item__toggle, .territory-brand-item__expand"
    );
    if (brandToggle) {
      toggleTerritoryBrandItemFromElement(brandToggle);
    }
  });

  list.addEventListener("mouseover", (event) => {
    const filterButton = event.target.closest(".territory-brand-item__filter");
    if (filterButton && !filterButton.contains(event.relatedTarget)) {
      positionBrandPanelFloatingTooltip(filterButton);
      getBrandPanelFloatingTooltip().classList.add("is-visible");
    }

    const row = event.target.closest(".territory-brand-territory__row");
    if (!row || row.contains(event.relatedTarget)) return;

    window.territoryMapHover?.set?.(row.dataset.brandId, row.dataset.geoKey);
  });

  list.addEventListener("mouseout", (event) => {
    if (event.target.closest(".territory-brand-item__filter")) {
      hideBrandPanelFloatingTooltip();
    }

    const row = event.target.closest(".territory-brand-territory__row");
    if (!row || row.contains(event.relatedTarget)) return;

    window.territoryMapHover?.clear?.();
  });

  list.addEventListener("focusin", (event) => {
    if (event.target.closest(".territory-brand-item__filter")) {
      positionBrandPanelFloatingTooltip(event.target.closest(".territory-brand-item__filter"));
      getBrandPanelFloatingTooltip().classList.add("is-visible");
    }

    const row = event.target.closest(".territory-brand-territory__row");
    if (!row) return;

    window.territoryMapHover?.set?.(row.dataset.brandId, row.dataset.geoKey);
  });

  list.addEventListener("focusout", (event) => {
    if (event.target.closest(".territory-brand-item__filter")) {
      hideBrandPanelFloatingTooltip();
    }

    if (event.target.closest(".territory-brand-territory__row")) {
      window.territoryMapHover?.clear?.();
    }
  });
}

function getTerritoryBrandListItems() {
  return Array.from(document.querySelectorAll(".territory-brand-item"));
}

function areAllTerritoryBrandRowsCollapsed() {
  const items = getTerritoryBrandListItems();
  if (!items.length) return true;

  return items.every((item) => {
    const toggle = item.querySelector(".territory-brand-item__toggle");
    return toggle?.getAttribute("aria-expanded") !== "true";
  });
}

function syncTerritoryBrandPanelExpandToggle() {
  const button = document.getElementById("territoryBrandExpandToggle");
  if (!button) return;

  const icon = button.querySelector("img");
  const items = getTerritoryBrandListItems();
  const allCollapsed = areAllTerritoryBrandRowsCollapsed();
  const label = allCollapsed ? "Expand all rows" : "Collapse all rows";

  button.hidden = items.length === 0;
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;

  if (icon) {
    icon.src = allCollapsed ? "assets/expand.svg" : "assets/collapse.svg";
  }
}

function setAllTerritoryBrandRowsExpanded(expanded) {
  getTerritoryBrandListItems().forEach((item) => {
    const brandId = item.dataset.brandId;
    const toggle = item.querySelector(".territory-brand-item__toggle");
    const expandToggle = item.querySelector(".territory-brand-item__expand");
    const territoryList = item.querySelector(".territory-brand-territories");
    if (!toggle || !expandToggle || !territoryList) return;

    setTerritoryBrandItemExpanded(toggle, expandToggle, territoryList, brandId, expanded, {
      syncExpandToggle: false
    });
  });

  syncTerritoryBrandPanelExpandToggle();
}

function initTerritoryBrandPanel() {
  const alertToggle = document.getElementById("territorySaveSearch");
  const expandToggle = document.getElementById("territoryBrandExpandToggle");
  const list = document.getElementById("territoryBrandList");

  if (alertToggle) {
    bindBrandPanelFloatingTooltip(alertToggle);
  }

  if (expandToggle) {
    bindBrandPanelFloatingTooltip(expandToggle);
  }

  if (list) {
    bindTerritoryBrandListDelegates(list);
  }

  expandToggle?.addEventListener("click", () => {
    setAllTerritoryBrandRowsExpanded(areAllTerritoryBrandRowsCollapsed());
  });

  document.querySelector(".territory-brand-panel__scroll")?.addEventListener("scroll", hideBrandPanelFloatingTooltip);
  window.addEventListener("resize", hideBrandPanelFloatingTooltip);
}

function yieldToTerritoryBrandListFrame() {
  return new Promise((resolve) => {
    // A timeout rather than rAF: the list is built detached and invisible, so
    // there is nothing to sync with paint, and timeouts keep running when the
    // tab is in the background.
    window.setTimeout(resolve, 0);
  });
}

// Building thousands of rows in one go froze the tab for about a second. The
// work is sliced across tasks into a detached fragment, then swapped in once, so
// the page stays responsive and the layout cost is paid a single time.
async function buildTerritoryBrandListContent(
  visibleBrands,
  territoriesByBrand,
  densityStyle,
  isStale
) {
  const fragment = document.createDocumentFragment();
  let sliceStartedAt = performance.now();

  for (const brand of visibleBrands) {
    const territories = (territoriesByBrand.get(brand.id) || [])
      .slice()
      .sort(compareTerritoriesByStatusThenName);

    fragment.append(createTerritoryBrandItem(brand, territories, densityStyle));

    if (performance.now() - sliceStartedAt < BRAND_LIST_BUILD_SLICE_MS) continue;

    await yieldToTerritoryBrandListFrame();
    if (isStale()) return null;
    sliceStartedAt = performance.now();
  }

  return fragment;
}

async function updateTerritoryBrandPanel(brands = [], matchingRecords = [], { isCancelled } = {}) {
  const summary = document.getElementById("territoryBrandSummary");
  const list = document.getElementById("territoryBrandList");
  if (!summary || !list) return;

  const token = ++territoryBrandListBuildToken;
  const isStale = () => token !== territoryBrandListBuildToken || Boolean(isCancelled?.());

  selectedBrandPanelTerritoryKey = window.territoryMapSelection?.getSelectedKey?.() || null;
  selectedBrandPanelCompareKey = window.territoryMapSelection?.getCompareKey?.() || null;

  const territoriesByBrand = new Map();
  matchingRecords.forEach((record) => {
    const territories = territoriesByBrand.get(record.brandId);
    if (territories) {
      territories.push(record);
    } else {
      territoriesByBrand.set(record.brandId, [record]);
    }
  });

  const visibleBrands = brands.filter((brand) => territoriesByBrand.has(brand.id));
  const densityStyle = window.territoryMapControls?.getTerritoryDensityEnabled?.()
    ? TERRITORY_PANEL_DENSITY_STYLE
    : null;

  summary.textContent = `Showing ${matchingRecords.length} territories`;

  const content = await buildTerritoryBrandListContent(
    visibleBrands,
    territoriesByBrand,
    densityStyle,
    isStale
  );
  if (!content || isStale()) return;

  list.replaceChildren(content);
  syncTerritoryBrandPanelExpandToggle();

  if (matchingRecords.length > 0) {
    scheduleTerritoryBrandListEnterAnimation(list);
  } else {
    cancelTerritoryBrandListEnterAnimation(list);
  }
}

function setSelectedTerritory(territoryKey, compareKey = null) {
  const list = document.getElementById("territoryBrandList");
  // Only the rows losing or gaining selection need touching; sweeping every row
  // was a full-list walk on each click.
  const affectedKeys = new Set([
    selectedBrandPanelTerritoryKey,
    selectedBrandPanelCompareKey,
    territoryKey,
    compareKey
  ].filter(Boolean));

  selectedBrandPanelTerritoryKey = territoryKey || null;
  selectedBrandPanelCompareKey = compareKey || null;
  if (!list) return;

  affectedKeys.forEach((key) => {
    const button = list.querySelector(
      `.territory-brand-territory__button[data-territory-key="${CSS.escape(key)}"]`
    );
    if (!button) return;

    const isSelected = key === selectedBrandPanelTerritoryKey;
    const isCompare = key === selectedBrandPanelCompareKey;
    const row = button.closest(".territory-brand-territory__row");
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-compare", isCompare);
    button.setAttribute("aria-pressed", String(isSelected || isCompare));
    row?.classList.toggle("is-selected", isSelected);
    row?.classList.toggle("is-compare", isCompare && !isSelected);
  });
}

function closeTerritoryBrandPanel() {
  territoryBrandListBuildToken += 1;
  cancelTerritoryBrandListEnterAnimation();
  document.getElementById("territoryBrandList")?.replaceChildren();
  const summary = document.getElementById("territoryBrandSummary");
  if (summary) {
    summary.textContent = "Showing 0 territories";
  }
  syncTerritoryBrandPanelExpandToggle();
}

window.territoryBrandPanel = {
  update: updateTerritoryBrandPanel,
  setSelectedTerritory,
  close: closeTerritoryBrandPanel,
  notifyLoadingHidden: notifyTerritoryBrandListLoadingHidden,
  isEnterPending: isTerritoryBrandListEnterPending,
  createShape: createTerritoryShape
};

initTerritoryBrandPanel();
