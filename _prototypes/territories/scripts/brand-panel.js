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

function getBrandPanelSortCenter() {
  const center = window.territoryMap?.getCenter?.();
  const longitude = Number(center?.lng);
  const latitude = Number(center?.lat);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return [longitude, latitude];
}

function getBrandPanelDistanceMiles([fromLongitude, fromLatitude], [toLongitude, toLatitude]) {
  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const fromLatitudeRadians = (fromLatitude * Math.PI) / 180;
  const toLatitudeRadians = (toLatitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitudeRadians)
      * Math.cos(toLatitudeRadians)
      * Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = Math.min(1, Math.max(0, haversine));

  return 3958.8 * 2 * Math.atan2(
    Math.sqrt(normalizedHaversine),
    Math.sqrt(1 - normalizedHaversine)
  );
}

function getTerritoryDistanceToCenter(territory, center) {
  if (!center || !Array.isArray(territory?.center) || territory.center.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  return getBrandPanelDistanceMiles(center, territory.center);
}

function getBrandClosestDistanceToCenter(territories, center) {
  let closest = Number.POSITIVE_INFINITY;

  territories.forEach((territory) => {
    const distance = getTerritoryDistanceToCenter(territory, center);
    if (distance < closest) closest = distance;
  });

  return closest;
}

function compareTerritoriesByProximityThenStatusThenName(center) {
  return (left, right) => {
    const distanceDiff = getTerritoryDistanceToCenter(left, center)
      - getTerritoryDistanceToCenter(right, center);
    if (distanceDiff !== 0) return distanceDiff;
    return compareTerritoriesByStatusThenName(left, right);
  };
}

const TERRITORY_BRAND_SORT_MODES = {
  proximity: "proximity",
  alphabetical: "alphabetical",
  count: "count"
};
const TERRITORY_BRAND_SORT_LABELS = {
  proximity: "Nearest first",
  alphabetical: "Name A–Z",
  count: "Most territories"
};

let selectedBrandPanelSort = TERRITORY_BRAND_SORT_MODES.proximity;
let lastBrandPanelUpdate = { brands: [], matchingRecords: [] };

function compareBrandsByName(left, right) {
  return territoryNameCollator.compare(left.brand.brand || "", right.brand.brand || "");
}

function compareBrandsByProximityThenCount(left, right) {
  const distanceDiff = left.distance - right.distance;
  if (distanceDiff !== 0) return distanceDiff;

  const countDiff = right.count - left.count;
  if (countDiff !== 0) return countDiff;

  return compareBrandsByName(left, right);
}

function compareBrandsByCountThenName(left, right) {
  const countDiff = right.count - left.count;
  if (countDiff !== 0) return countDiff;
  return compareBrandsByName(left, right);
}

function getVisibleBrandsSorted(brands, territoriesByBrand, { sort = selectedBrandPanelSort, center = null } = {}) {
  const entries = brands
    .filter((brand) => territoriesByBrand.has(brand.id))
    .map((brand) => {
      const territories = territoriesByBrand.get(brand.id) || [];
      return {
        brand,
        count: territories.length,
        distance: sort === TERRITORY_BRAND_SORT_MODES.proximity
          ? getBrandClosestDistanceToCenter(territories, center)
          : Number.POSITIVE_INFINITY
      };
    });

  if (sort === TERRITORY_BRAND_SORT_MODES.alphabetical) {
    entries.sort(compareBrandsByName);
  } else if (sort === TERRITORY_BRAND_SORT_MODES.count) {
    entries.sort(compareBrandsByCountThenName);
  } else {
    entries.sort(compareBrandsByProximityThenCount);
  }

  return entries.map((entry) => entry.brand);
}

function getTerritoryCompare(sort, center) {
  if (sort === TERRITORY_BRAND_SORT_MODES.alphabetical) {
    return (left, right) => territoryNameCollator.compare(
      getTerritorySortName(left),
      getTerritorySortName(right)
    );
  }

  if (sort === TERRITORY_BRAND_SORT_MODES.proximity && center) {
    return compareTerritoriesByProximityThenStatusThenName(center);
  }

  return compareTerritoriesByStatusThenName;
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
const BRAND_ITEM_TOGGLE_MS = 320;

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

  const motionQuery = { matches: prefersReducedTerritoryMotion() };
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
  { syncExpandToggle = true, deferHide = false } = {}
) {
  toggle.setAttribute("aria-expanded", String(expanded));
  expandToggle.setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    territoryList.hidden = false;
  } else if (!deferHide) {
    territoryList.hidden = true;
  }

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
  filterIcon.src = "../../assets/icons/filter-single.svg";
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
  chevron.src = "../../assets/icons/chevron.svg";
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
    const territoryShape = createTerritoryShape(territory.geometry, densityStyle?.color || window.territoryMapControls?.getTerritoryBrandPaintColor?.(brand) || brand.color, {
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
    territoryInfoIcon.src = "../../assets/icons/info-filled.svg";
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

let brandItemToggleToken = 0;
let brandItemExpandOrigin = null;

function prefersReducedTerritoryMotion() {
  return Boolean(
    window.wefranchReduceMotion?.isEnabled?.()
    || document.documentElement.classList.contains("is-reduce-motion")
    || document.body.classList.contains("reduce-motion")
    || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

function getTerritoryBrandPanelScroll() {
  return document.querySelector(".territory-brand-panel__scroll");
}

function resetTerritoryBrandListCollapseStyles(territoryList) {
  territoryList.classList.remove("is-collapsing");
  territoryList.style.removeProperty("height");
}

function stopTerritoryBrandItemToggleAnimation(exceptList = null) {
  brandItemToggleToken += 1;
  document.querySelectorAll(".territory-brand-territories.is-collapsing").forEach((list) => {
    resetTerritoryBrandListCollapseStyles(list);
    if (list !== exceptList) {
      list.hidden = true;
    }
  });
}

function easeTerritoryBrandToggle(progress) {
  return progress * progress * (3 - 2 * progress);
}

function animateTerritoryBrandToggleFrame(token, durationMs, render) {
  if (durationMs <= 0) {
    render(1);
    return;
  }

  const startedAt = performance.now();
  const step = (now) => {
    if (token !== brandItemToggleToken) return;
    const progress = Math.min(1, (now - startedAt) / durationMs);
    render(easeTerritoryBrandToggle(progress));
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function rememberTerritoryBrandExpandOrigin(item) {
  if (brandItemExpandOrigin?.item === item) return;

  brandItemExpandOrigin = {
    item,
    scrollTop: getTerritoryBrandPanelScroll()?.scrollTop ?? 0
  };
}

function scrollTerritoryBrandItemToTop(item) {
  const header = item.querySelector(".territory-brand-item__header");
  const scrollParent = getTerritoryBrandPanelScroll();
  if (!header || !scrollParent) return;

  const token = ++brandItemToggleToken;
  const durationMs = prefersReducedTerritoryMotion() ? 0 : BRAND_ITEM_TOGGLE_MS;

  requestAnimationFrame(() => {
    if (token !== brandItemToggleToken) return;

    const startTop = scrollParent.scrollTop;
    const endTop = startTop
      + (header.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top);

    animateTerritoryBrandToggleFrame(token, durationMs, (eased) => {
      scrollParent.scrollTop = startTop + (endTop - startTop) * eased;
    });
  });
}

function collapseTerritoryBrandItem(item, territoryList) {
  const scrollParent = getTerritoryBrandPanelScroll();
  const startHeight = territoryList.getBoundingClientRect().height;
  const startScroll = scrollParent?.scrollTop ?? 0;
  const endScroll = brandItemExpandOrigin?.item === item
    ? brandItemExpandOrigin.scrollTop
    : startScroll;
  const token = ++brandItemToggleToken;
  const durationMs = prefersReducedTerritoryMotion() ? 0 : BRAND_ITEM_TOGGLE_MS;

  if (brandItemExpandOrigin?.item === item) {
    brandItemExpandOrigin = null;
  }

  if (durationMs <= 0 || startHeight < 1) {
    resetTerritoryBrandListCollapseStyles(territoryList);
    territoryList.hidden = true;
    if (scrollParent) scrollParent.scrollTop = endScroll;
    return;
  }

  territoryList.classList.add("is-collapsing");
  territoryList.style.height = `${startHeight}px`;

  animateTerritoryBrandToggleFrame(token, durationMs, (eased) => {
    territoryList.style.height = `${startHeight * (1 - eased)}px`;
    if (scrollParent) {
      scrollParent.scrollTop = startScroll + (endScroll - startScroll) * eased;
    }
    if (eased < 1) return;

    territoryList.hidden = true;
    resetTerritoryBrandListCollapseStyles(territoryList);
  });
}

function toggleTerritoryBrandItemFromElement(element) {
  const item = element.closest(".territory-brand-item");
  const toggle = item?.querySelector(".territory-brand-item__toggle");
  const expandToggle = item?.querySelector(".territory-brand-item__expand");
  const territoryList = item?.querySelector(".territory-brand-territories");
  if (!item || !toggle || !expandToggle || !territoryList) return;

  const collapsing = territoryList.classList.contains("is-collapsing");
  const shouldExpand = collapsing || toggle.getAttribute("aria-expanded") !== "true";

  stopTerritoryBrandItemToggleAnimation(shouldExpand ? territoryList : null);

  if (shouldExpand) {
    rememberTerritoryBrandExpandOrigin(item);
    setTerritoryBrandItemExpanded(
      toggle,
      expandToggle,
      territoryList,
      item.dataset.brandId,
      true
    );
    scrollTerritoryBrandItemToTop(item);
    return;
  }

  setTerritoryBrandItemExpanded(
    toggle,
    expandToggle,
    territoryList,
    item.dataset.brandId,
    false,
    { deferHide: true }
  );
  collapseTerritoryBrandItem(item, territoryList);
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
    icon.src = allCollapsed ? "../../assets/icons/expand.svg" : "../../assets/icons/collapse.svg";
  }
}

function setAllTerritoryBrandRowsExpanded(expanded) {
  stopTerritoryBrandItemToggleAnimation();
  brandItemExpandOrigin = null;
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

function closeTerritoryBrandSortDropdown() {
  document.getElementById("territoryBrandSort")?.removeAttribute("open");
}

function syncTerritoryBrandSortUI() {
  const dropdown = document.getElementById("territoryBrandSort");
  const summary = dropdown?.querySelector("summary");
  const sortLabel = TERRITORY_BRAND_SORT_LABELS[selectedBrandPanelSort] || TERRITORY_BRAND_SORT_LABELS.proximity;

  summary?.setAttribute("aria-label", `Sort by ${sortLabel}`);
  dropdown?.querySelectorAll("[data-sort]").forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.sort === selectedBrandPanelSort));
  });
}

function setTerritoryBrandPanelSort(sort) {
  const nextSort = TERRITORY_BRAND_SORT_MODES[sort] || TERRITORY_BRAND_SORT_MODES.proximity;
  closeTerritoryBrandSortDropdown();
  if (nextSort === selectedBrandPanelSort) return;

  selectedBrandPanelSort = nextSort;
  syncTerritoryBrandSortUI();
  updateTerritoryBrandPanel(lastBrandPanelUpdate.brands, lastBrandPanelUpdate.matchingRecords);
}

function initTerritoryBrandSort() {
  const dropdown = document.getElementById("territoryBrandSort");
  if (!dropdown) return;

  dropdown.addEventListener("toggle", () => {
    if (!dropdown.open) return;
    document.getElementById("territoryMenuDropdown")?.removeAttribute("open");
  });

  dropdown.querySelectorAll("[data-sort]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      setTerritoryBrandPanelSort(option.dataset.sort);
    });
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.open || dropdown.contains(event.target)) return;
    closeTerritoryBrandSortDropdown();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dropdown.open) {
      closeTerritoryBrandSortDropdown();
    }
  });

  syncTerritoryBrandSortUI();
}

function initTerritoryBrandPanel() {
  const expandToggle = document.getElementById("territoryBrandExpandToggle");
  const list = document.getElementById("territoryBrandList");

  if (expandToggle) {
    bindBrandPanelFloatingTooltip(expandToggle);
  }

  if (list) {
    bindTerritoryBrandListDelegates(list);
  }

  expandToggle?.addEventListener("click", () => {
    setAllTerritoryBrandRowsExpanded(areAllTerritoryBrandRowsCollapsed());
  });

  initTerritoryBrandSort();
  document.querySelector(".territory-brand-panel__scroll")?.addEventListener("scroll", () => {
    hideBrandPanelFloatingTooltip();
    closeTerritoryBrandSortDropdown();
  });
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
  isStale,
  sortCenter
) {
  const fragment = document.createDocumentFragment();
  let sliceStartedAt = performance.now();
  const compareTerritories = getTerritoryCompare(selectedBrandPanelSort, sortCenter);

  for (const brand of visibleBrands) {
    const territories = (territoriesByBrand.get(brand.id) || [])
      .slice()
      .sort(compareTerritories);

    fragment.append(createTerritoryBrandItem(brand, territories, densityStyle));

    if (performance.now() - sliceStartedAt < BRAND_LIST_BUILD_SLICE_MS) continue;

    await yieldToTerritoryBrandListFrame();
    if (isStale()) return null;
    sliceStartedAt = performance.now();
  }

  return fragment;
}

const TERRITORY_BRAND_SUMMARY_MAX_CONCEPTS = 3;
const TERRITORY_BRAND_SUMMARY_NAMED_LIMIT = 2;
const TERRITORY_BRAND_SUMMARY_STATUS_LABELS = {
  available: "available",
  established: "for sale",
  sold: "sold"
};
const TERRITORY_BRAND_SUMMARY_PRIORITY = [
  "status",
  "category",
  "location",
  "franchise",
  "investment",
  "rating",
  "geoLevel"
];

function formatSummaryNameList(names) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function formatSummaryCompactInvestment(value) {
  if (!Number.isFinite(value)) return "";

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const text = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(/\.0$/, "");
    return `$${text}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1000)}K`;
  }

  return `$${Math.round(value)}`;
}

function getSummarySelectLabels(selectId, values, formatValue) {
  if (!values?.length) return [];

  const select = document.getElementById(selectId);
  const valueSet = new Set(values.map(String));
  if (!select) {
    return values.map((value) => formatValue?.(value) || value);
  }

  const labels = Array.from(select.options)
    .filter((option) => option.value && valueSet.has(option.value))
    .map((option) => option.textContent.trim())
    .filter(Boolean);

  return labels.length
    ? labels
    : values.map((value) => formatValue?.(value) || value);
}

function getSummaryRangeDefaults(ariaLabel) {
  const section = document
    .querySelector(`.filter-section .filter-range-slider[aria-label='${ariaLabel}']`)
    ?.closest(".filter-section");
  const minRange = section?.querySelector(".range-input-min");
  const maxRange = section?.querySelector(".range-input-max");

  return {
    min: Number(minRange?.min ?? Number.NaN),
    max: Number(maxRange?.max ?? Number.NaN)
  };
}

function isSummaryRangeActive(valueMin, valueMax, defaults) {
  if (!Number.isFinite(valueMin) || !Number.isFinite(valueMax)) return false;
  if (!Number.isFinite(defaults.min) || !Number.isFinite(defaults.max)) return false;
  return valueMin !== defaults.min || valueMax !== defaults.max;
}

function formatSummaryRangePhrase(valueMin, valueMax, defaults, { compactValue, under, over, between, at }) {
  const minChanged = valueMin !== defaults.min;
  const maxChanged = valueMax !== defaults.max;

  if (minChanged && maxChanged && valueMin === valueMax) {
    return `${at} ${compactValue(valueMin)}`;
  }
  if (minChanged && maxChanged) {
    return `${between} ${compactValue(valueMin)} and ${compactValue(valueMax)}`;
  }
  if (maxChanged) {
    return `${under} ${compactValue(valueMax)}`;
  }
  if (minChanged) {
    return `${over} ${compactValue(valueMin)}`;
  }

  return "";
}

function isSummaryStateLocation(location) {
  return Boolean(location?.stateCode)
    && !location.geoKey
    && !location.coordinates
    && (location.geoLevel === "region" || !location.geoLevel);
}

function formatSummaryLocationLabel(location) {
  const raw = String(location?.label || "").replace(/, United States$/i, "").trim();
  if (!raw) return "";
  if (/^Map area\b/i.test(raw)) return "this map area";

  if (isSummaryStateLocation(location) || location.geoLevel === "region") {
    return raw;
  }

  if (location.geoLevel === "address") {
    return raw.split(",")[0].trim();
  }

  const stateCode = String(location.stateCode || "").trim().toUpperCase();
  if (stateCode && /,\s*[^,]+$/.test(raw)) {
    const head = raw.replace(/,\s*[^,]+$/, "").trim();
    if (head) return `${head}, ${stateCode}`;
  }

  return raw;
}

function buildNamedOrCountedPhrase(names, { named, counted }) {
  if (names.length >= TERRITORY_BRAND_SUMMARY_NAMED_LIMIT + 1) {
    return counted(names.length);
  }

  return named(formatSummaryNameList(names));
}

function buildExclusionPhrase(names, countedNoun) {
  if (!names.length) return "";
  if (names.length >= TERRITORY_BRAND_SUMMARY_NAMED_LIMIT + 1) {
    return `excluding ${names.length} ${countedNoun}`;
  }

  return `excluding ${formatSummaryNameList(names)}`;
}

function buildStatusSummaryConcept(filters) {
  const labels = (filters.statuses || [])
    .map((status) => TERRITORY_BRAND_SUMMARY_STATUS_LABELS[status] || String(status || "").toLowerCase())
    .filter(Boolean);
  if (!labels.length) return null;

  return {
    id: "status",
    modifier: formatSummaryNameList(labels)
  };
}

function buildCategorySummaryConcept(filters) {
  const formatCategory = (value) => window.territoryCategories?.formatLabel?.(value) || value;
  const included = getSummarySelectLabels(
    "categoryFilterSelect",
    filters.categories?.included || [],
    formatCategory
  );
  const excluded = getSummarySelectLabels(
    "categoryFilterSelect",
    filters.categories?.excluded || [],
    formatCategory
  );

  if (included.length) {
    if (included.length >= TERRITORY_BRAND_SUMMARY_NAMED_LIMIT + 1) {
      return { id: "category", phrase: `across ${included.length} categories` };
    }

    return { id: "category", modifier: formatSummaryNameList(included) };
  }

  if (!excluded.length) return null;

  return {
    id: "category",
    phrase: buildExclusionPhrase(excluded, "categories")
  };
}

function buildLocationSummaryConcept(filters) {
  const searches = filters.locationSearches || [];
  if (!searches.length) return null;

  const included = searches.filter((location) => !location.excluded);
  const excluded = searches.filter((location) => location.excluded);
  const includedLabels = included.map(formatSummaryLocationLabel).filter(Boolean);
  const excludedLabels = excluded.map(formatSummaryLocationLabel).filter(Boolean);
  const radiusMiles = Number(filters.radius?.miles);
  const radiusEnabled = Boolean(filters.radius?.enabled) && Number.isFinite(radiusMiles);

  if (includedLabels.length) {
    return {
      id: "location",
      phrase: buildNamedOrCountedPhrase(includedLabels, {
        named: (list) => {
          if (radiusEnabled) return `within ${radiusMiles} miles of ${list}`;
          if (included.every(isSummaryStateLocation)) return `in ${list}`;
          return `near ${list}`;
        },
        counted: (count) => `across ${count} locations`
      })
    };
  }

  if (!excludedLabels.length) return null;

  return {
    id: "location",
    phrase: buildExclusionPhrase(excludedLabels, "locations")
  };
}

function buildFranchiseSummaryConcept(filters) {
  const included = getSummarySelectLabels("franchiseFilterSelect", filters.franchises?.included || []);
  const excluded = getSummarySelectLabels("franchiseFilterSelect", filters.franchises?.excluded || []);

  if (included.length) {
    return {
      id: "franchise",
      phrase: buildNamedOrCountedPhrase(included, {
        named: (list) => `from ${list}`,
        counted: (count) => `from ${count} franchises`
      })
    };
  }

  if (!excluded.length) return null;

  return {
    id: "franchise",
    phrase: buildExclusionPhrase(excluded, "franchises")
  };
}

function buildInvestmentSummaryConcept(filters) {
  const defaults = getSummaryRangeDefaults("Initial investment range");
  if (!isSummaryRangeActive(filters.investmentMin, filters.investmentMax, defaults)) {
    return null;
  }

  const phrase = formatSummaryRangePhrase(
    filters.investmentMin,
    filters.investmentMax,
    defaults,
    {
      compactValue: formatSummaryCompactInvestment,
      under: "under",
      over: "over",
      between: "between",
      at: "at"
    }
  );
  if (!phrase) return null;

  return { id: "investment", phrase };
}

function buildRatingSummaryConcept(filters) {
  const min = Number(filters.ratingMin);
  if (!Number.isFinite(min) || min <= 0) return null;

  return { id: "rating", phrase: `rated ${min.toFixed(1)}+` };
}

function buildGeoLevelSummaryConcept(filters) {
  const labels = (filters.geoLevels || [])
    .map((geoLevel) => {
      const label = TERRITORY_PANEL_GEO_LEVEL_LABELS[geoLevel] || geoLevel;
      return label === "CBSA" ? "CBSA" : String(label || "").toLowerCase();
    })
    .filter(Boolean);
  if (!labels.length) return null;

  if (labels.length >= TERRITORY_BRAND_SUMMARY_NAMED_LIMIT + 1) {
    return { id: "geoLevel", phrase: `across ${labels.length} geographic levels` };
  }

  const named = formatSummaryNameList(labels);
  const plural = labels.length > 1;
  return {
    id: "geoLevel",
    phrase: `at the ${named} ${plural ? "levels" : "level"}`
  };
}

function collectTerritoryBrandSummaryConcepts(filters) {
  const builders = {
    status: buildStatusSummaryConcept,
    category: buildCategorySummaryConcept,
    location: buildLocationSummaryConcept,
    franchise: buildFranchiseSummaryConcept,
    investment: buildInvestmentSummaryConcept,
    rating: buildRatingSummaryConcept,
    geoLevel: buildGeoLevelSummaryConcept
  };

  return TERRITORY_BRAND_SUMMARY_PRIORITY
    .map((id) => builders[id](filters))
    .filter(Boolean);
}

function joinSummaryPhrases(phrases) {
  const combined = [];

  phrases.forEach((phrase) => {
    const acrossMatch = /^across (.+)$/.exec(phrase);
    const last = combined[combined.length - 1];
    const lastAcross = last ? /^across (.+)$/.exec(last) : null;
    if (acrossMatch && lastAcross) {
      combined[combined.length - 1] = `across ${lastAcross[1]} and ${acrossMatch[1]}`;
      return;
    }

    combined.push(phrase);
  });

  return combined.join(" ");
}

function getTerritoryBrandSummaryParts() {
  const filters = window.territoryFilters?.getState?.() || {};
  const concepts = collectTerritoryBrandSummaryConcepts(filters);
  const visible = concepts.slice(0, TERRITORY_BRAND_SUMMARY_MAX_CONCEPTS);
  const overflowCount = concepts.length - visible.length;
  const byId = Object.fromEntries(visible.map((concept) => [concept.id, concept]));

  return {
    statusModifier: byId.status?.modifier || "",
    categoryModifier: byId.category?.modifier || "",
    phrases: [
      byId.location?.phrase,
      byId.franchise?.phrase,
      byId.investment?.phrase,
      byId.rating?.phrase,
      byId.geoLevel?.phrase,
      byId.category?.phrase
    ].filter(Boolean),
    overflowCount
  };
}

function formatTerritoryBrandSummaryCopy({
  noun,
  includeCount = false,
  count = 0,
  includeStatus = true
} = {}) {
  const { statusModifier, categoryModifier, phrases, overflowCount } = getTerritoryBrandSummaryParts();
  const modifiers = [
    includeStatus ? statusModifier : "",
    categoryModifier
  ].filter(Boolean);
  const parts = [];

  if (includeCount) parts.push(`Showing ${count}`);
  if (modifiers.length) parts.push(modifiers.join(" "));
  parts.push(noun);
  if (phrases.length) parts.push(joinSummaryPhrases(phrases));
  if (overflowCount > 0) {
    parts.push(`with ${overflowCount} more filter${overflowCount === 1 ? "" : "s"} applied`);
  }

  return parts.join(" ");
}

function formatTerritoryBrandSummary(count) {
  const noun = count === 1 ? "territory" : "territories";
  return `${formatTerritoryBrandSummaryCopy({ noun, includeCount: true, count })}.`;
}

function formatTerritoryBrandAlertName() {
  const label = formatTerritoryBrandSummaryCopy({ noun: "territories", includeStatus: true });
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Territories";
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

  lastBrandPanelUpdate = { brands, matchingRecords };
  const sortCenter = selectedBrandPanelSort === TERRITORY_BRAND_SORT_MODES.proximity
    ? getBrandPanelSortCenter()
    : null;
  const visibleBrands = getVisibleBrandsSorted(brands, territoriesByBrand, {
    sort: selectedBrandPanelSort,
    center: sortCenter
  });
  const densityStyle = window.territoryMapControls?.getTerritoryDensityEnabled?.()
    ? TERRITORY_PANEL_DENSITY_STYLE
    : null;

  summary.textContent = formatTerritoryBrandSummary(matchingRecords.length);

  const content = await buildTerritoryBrandListContent(
    visibleBrands,
    territoriesByBrand,
    densityStyle,
    isStale,
    sortCenter
  );
  if (!content || isStale()) return;

  stopTerritoryBrandItemToggleAnimation();
  brandItemExpandOrigin = null;
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

// Header "Settings" (edit) is disabled for now — private searches opened from
// the crossroad are treated as new queries. activeTerritorySavedSearch remains
// available if edit-from-header is re-enabled later.
let activeTerritorySavedSearch = null;
let isActiveTerritorySavedSearchDirty = false;

function syncTerritorySavedSearchHeading() {
  const titleElement = document.getElementById("territoryBrandPanelTitle");
  const saveButton = document.getElementById("territorySaveSearch");
  const settingsButton = document.getElementById("territorySavedSearchSettings");
  const showSettings = Boolean(activeTerritorySavedSearch) && !isActiveTerritorySavedSearchDirty;
  const isCrossroadOpen = document.querySelector(".territory-shell")?.classList.contains("is-crossroad-open");
  const crossroadChoice = window.territoryCrossroadChoice;
  const breadcrumbSavedSearch = !isCrossroadOpen && (
    activeTerritorySavedSearch
    || (crossroadChoice?.savedSearchId ? crossroadChoice : null)
  );

  if (titleElement) {
    titleElement.textContent = activeTerritorySavedSearch?.title || "Territories";
  }
  if (saveButton) saveButton.hidden = showSettings;
  if (settingsButton) settingsButton.hidden = !showSettings;

  const breadcrumbItems = [
    { label: "Territories" }
  ];

  if (breadcrumbSavedSearch?.title) {
    breadcrumbItems[0].onClick = () => window.showTerritoryCrossroad?.({ animate: true });
    breadcrumbItems.push({ label: breadcrumbSavedSearch.title });
  }

  window.wefranchSiteHeader?.setBreadcrumb(breadcrumbItems);
}

function setActiveTerritorySavedSearch(savedSearch) {
  activeTerritorySavedSearch = savedSearch
    ? { id: savedSearch.id, title: savedSearch.title || "" }
    : null;
  isActiveTerritorySavedSearchDirty = false;
  syncTerritorySavedSearchHeading();
}

function setTerritorySavedSearchDirty(isDirty) {
  isActiveTerritorySavedSearchDirty = Boolean(isDirty);
  syncTerritorySavedSearchHeading();
}

function getActiveTerritorySavedSearch() {
  return activeTerritorySavedSearch ? { ...activeTerritorySavedSearch } : null;
}

function closeTerritoryBrandPanel() {
  territoryBrandListBuildToken += 1;
  stopTerritoryBrandItemToggleAnimation();
  brandItemExpandOrigin = null;
  cancelTerritoryBrandListEnterAnimation();
  document.getElementById("territoryBrandList")?.replaceChildren();
  const summary = document.getElementById("territoryBrandSummary");
  if (summary) {
    summary.textContent = "Showing 0 territories";
  }
  setActiveTerritorySavedSearch(null);
  syncTerritoryBrandPanelExpandToggle();
}

window.territoryBrandPanel = {
  update: updateTerritoryBrandPanel,
  setSelectedTerritory,
  close: closeTerritoryBrandPanel,
  notifyLoadingHidden: notifyTerritoryBrandListLoadingHidden,
  isEnterPending: isTerritoryBrandListEnterPending,
  createShape: createTerritoryShape,
  formatAlertName: formatTerritoryBrandAlertName,
  setActiveSavedSearch: setActiveTerritorySavedSearch,
  getActiveSavedSearch: getActiveTerritorySavedSearch,
  setSavedSearchDirty: setTerritorySavedSearchDirty
};

initTerritoryBrandPanel();
