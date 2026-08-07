function formatTerritoryCount(count) {
  return `${count} ${count === 1 ? "territory" : "territories"}`;
}

function formatTerritoryPanelStatus(status) {
  return String(status || "").replace(/^\w/, (character) => character.toUpperCase());
}

const TERRITORY_SHAPE_SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TERRITORY_SHAPE_WIDTH = 34;
const TERRITORY_SHAPE_HEIGHT = 24;
const TERRITORY_SHAPE_PADDING = 2;
const TERRITORY_PANEL_DENSITY_MID_COLOR = "#a98abc";
const TERRITORY_PANEL_DENSITY_MID_OPACITY = 0.51;

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

let territoryShapeHatchId = 0;

function buildTerritoryPanelDensityStyles(records) {
  return new Map(
    records.map((record) => [
      record.geoKey || record.state,
      {
        color: TERRITORY_PANEL_DENSITY_MID_COLOR,
        fillOpacity: TERRITORY_PANEL_DENSITY_MID_OPACITY
      }
    ])
  );
}

function createTerritoryShape(geometry, color, { status, fillOpacity } = {}) {
  const polygons = getTerritoryShapePolygons(geometry);
  if (!polygons.length) return null;

  const referenceLongitude = polygons[0]?.[0]?.[0]?.[0] ?? 0;
  const projectCoordinate = ([longitude, latitude]) => {
    let wrappedLongitude = longitude;
    while (wrappedLongitude - referenceLongitude > 180) wrappedLongitude -= 360;
    while (wrappedLongitude - referenceLongitude < -180) wrappedLongitude += 360;
    return [
      (wrappedLongitude * Math.PI) / 180,
      projectTerritoryShapeLatitude(latitude)
    ];
  };
  const projectedPolygons = polygons.map((rings) => (
    rings.map((ring) => ring.map(projectCoordinate))
  ));
  const coordinates = projectedPolygons.flat(2);
  const xValues = coordinates.map(([x]) => x);
  const yValues = coordinates.map(([, y]) => y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const shapeWidth = maxX - minX;
  const shapeHeight = maxY - minY;

  if (!shapeWidth || !shapeHeight) return null;

  const availableWidth = TERRITORY_SHAPE_WIDTH - (TERRITORY_SHAPE_PADDING * 2);
  const availableHeight = TERRITORY_SHAPE_HEIGHT - (TERRITORY_SHAPE_PADDING * 2);
  const scale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight);
  const offsetX = (TERRITORY_SHAPE_WIDTH - (shapeWidth * scale)) / 2;
  const offsetY = (TERRITORY_SHAPE_HEIGHT - (shapeHeight * scale)) / 2;
  const pathData = projectedPolygons.map((rings) => (
    rings.map((ring) => (
      ring.map(([x, y], index) => {
        const projectedX = offsetX + ((x - minX) * scale);
        const projectedY = offsetY + ((maxY - y) * scale);
        return `${index ? "L" : "M"}${projectedX.toFixed(2)} ${projectedY.toFixed(2)}`;
      }).join(" ") + " Z"
    )).join(" ")
  )).join(" ");

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

  if (isEstablished) {
    territoryShapeHatchId += 1;
    const patternId = `territory-shape-hatch-${territoryShapeHatchId}`;
    const defs = document.createElementNS(TERRITORY_SHAPE_SVG_NAMESPACE, "defs");
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
    defs.append(pattern);
    svg.append(defs);
    path.setAttribute("fill", `url(#${patternId})`);
    path.setAttribute("fill-opacity", String(fillOpacity ?? 0.55));
  } else {
    path.setAttribute("fill", color);
    path.setAttribute("fill-opacity", String(fillOpacity ?? 0.25));
  }

  svg.append(path);
  return svg;
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
let territoryBrandPanelLayoutPending = false;
let territoryBrandPanelLayoutPromise = Promise.resolve();

function beginTerritoryBrandPanelLayoutTransition(panel) {
  if (!panel || territoryBrandPanelLayoutPending) {
    return territoryBrandPanelLayoutPromise;
  }

  territoryBrandPanelLayoutPending = true;
  territoryBrandPanelLayoutPromise = new Promise((resolve) => {
    const finishLayout = (event) => {
      if (event?.target !== panel) return;
      if (event && !["flex-basis", "width", "min-width"].includes(event.propertyName)) return;

      panel.removeEventListener("transitionend", finishLayout);
      panel.removeEventListener("transitioncancel", finishLayout);
      window.territoryMap?.resize?.();
      territoryBrandPanelLayoutPending = false;
      resolve();
    };

    panel.addEventListener("transitionend", finishLayout);
    panel.addEventListener("transitioncancel", finishLayout);
  });

  return territoryBrandPanelLayoutPromise;
}

function whenTerritoryBrandPanelLayoutSettled() {
  return territoryBrandPanelLayoutPromise;
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

function createTerritoryBrandItem(brand, territories, densityStylesByGeoKey) {
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

  territories.forEach((territory) => {
    const territoryItem = document.createElement("li");
    const territoryButton = document.createElement("button");
    const territoryLabel = document.createElement("span");
    const territoryStatus = document.createElement("span");
    const territoryGeoKey = territory.geoKey || territory.state;
    const densityStyle = densityStylesByGeoKey.get(territoryGeoKey);
    const territoryShape = createTerritoryShape(territory.geometry, densityStyle?.color || brand.color, {
      status: territory.status,
      fillOpacity: densityStyle?.fillOpacity
    });
    const territoryKey = `${territory.brandId}:${territoryGeoKey}`;
    const isSelected = territoryKey === selectedBrandPanelTerritoryKey;
    const isCompare = territoryKey === selectedBrandPanelCompareKey;

    territoryItem.className = "territory-brand-territory";
    territoryButton.className = "ui-control territory-brand-territory__button";
    territoryButton.classList.toggle("is-selected", isSelected);
    territoryButton.classList.toggle("is-compare", isCompare);
    territoryButton.type = "button";
    territoryButton.dataset.territoryKey = territoryKey;
    territoryButton.setAttribute("aria-pressed", String(isSelected || isCompare));
    territoryLabel.className = "territory-brand-territory__label";
    territoryLabel.textContent = territory.name || territory.state;
    territoryStatus.className = "territory-brand-territory__status";
    territoryStatus.textContent = formatTerritoryPanelStatus(territory.status);

    if (territoryShape) {
      territoryButton.append(territoryShape);
    }
    territoryButton.append(territoryLabel, territoryStatus);

    territoryButton.addEventListener("click", (event) => {
      window.territoryMapSelection?.toggle?.(territory.brandId, territory.geoKey || territory.state, {
        compare: Boolean(event.metaKey || event.ctrlKey)
      });
    });
    territoryButton.addEventListener("mouseenter", () => {
      window.territoryMapHover?.set?.(territory.brandId, territory.geoKey || territory.state);
    });
    territoryButton.addEventListener("mouseleave", () => {
      window.territoryMapHover?.clear?.();
    });
    territoryButton.addEventListener("focus", () => {
      window.territoryMapHover?.set?.(territory.brandId, territory.geoKey || territory.state);
    });
    territoryButton.addEventListener("blur", () => {
      window.territoryMapHover?.clear?.();
    });

    territoryItem.append(territoryButton);
    territoryList.append(territoryItem);
  });

  details.append(name, count);
  filterButton.append(filterIcon);
  expandToggle.append(chevron);
  toggle.append(logo, details);
  header.append(toggle, filterButton, expandToggle);
  item.append(header, territoryList);

  const handleExpandToggle = () => {
    const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
    setTerritoryBrandItemExpanded(toggle, expandToggle, territoryList, brand.id, nextExpanded);
  };

  toggle.addEventListener("click", handleExpandToggle);
  expandToggle.addEventListener("click", handleExpandToggle);

  filterButton.addEventListener("click", (event) => {
    event.stopPropagation();
    window.territoryFilters?.addFranchise?.(brand.id);
  });
  bindBrandPanelFloatingTooltip(filterButton);

  return item;
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
  button.title = label;

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
  const expandToggle = document.getElementById("territoryBrandExpandToggle");
  expandToggle?.addEventListener("click", () => {
    setAllTerritoryBrandRowsExpanded(areAllTerritoryBrandRowsCollapsed());
  });

  document.querySelector(".territory-brand-panel__scroll")?.addEventListener("scroll", hideBrandPanelFloatingTooltip);
  window.addEventListener("resize", hideBrandPanelFloatingTooltip);
}

function updateTerritoryBrandPanel(brands = [], matchingRecords = []) {
  const shell = document.querySelector(".territory-shell");
  const panel = document.getElementById("territoryBrandPanel");
  const summary = document.getElementById("territoryBrandSummary");
  const list = document.getElementById("territoryBrandList");
  if (!shell || !panel || !summary || !list) return;

  selectedBrandPanelTerritoryKey = window.territoryMapSelection?.getSelectedKey?.() || null;
  selectedBrandPanelCompareKey = window.territoryMapSelection?.getCompareKey?.() || null;

  const territoryCountsByBrand = matchingRecords.reduce((counts, record) => {
    counts.set(record.brandId, (counts.get(record.brandId) || 0) + 1);
    return counts;
  }, new Map());
  const territoriesByBrand = matchingRecords.reduce((territories, record) => {
    if (!territories.has(record.brandId)) {
      territories.set(record.brandId, []);
    }
    territories.get(record.brandId).push(record);
    return territories;
  }, new Map());

  const visibleBrands = brands.filter((brand) => territoryCountsByBrand.has(brand.id));
  const densityStylesByGeoKey = window.territoryMapControls?.getTerritoryDensityEnabled?.()
    ? buildTerritoryPanelDensityStyles(matchingRecords)
    : new Map();

  summary.textContent = `Showing ${visibleBrands.length} franchise brands sorted by relevancy`;
  list.replaceChildren(
    ...visibleBrands.map((brand) => (
      createTerritoryBrandItem(brand, territoriesByBrand.get(brand.id) || [], densityStylesByGeoKey)
    ))
  );
  syncTerritoryBrandPanelExpandToggle();

  const wasOpen = shell.classList.contains("is-brand-panel-open");
  shell.classList.add("is-brand-panel-open");
  panel.setAttribute("aria-hidden", "false");

  if (!wasOpen) {
    beginTerritoryBrandPanelLayoutTransition(panel);
  } else if (!territoryBrandPanelLayoutPending) {
    window.territoryMap?.resize?.();
  }
}

function setSelectedTerritory(territoryKey, compareKey = null) {
  selectedBrandPanelTerritoryKey = territoryKey || null;
  selectedBrandPanelCompareKey = compareKey || null;

  document.querySelectorAll(".territory-brand-territory__button").forEach((button) => {
    const key = button.dataset.territoryKey;
    const isSelected = key === selectedBrandPanelTerritoryKey;
    const isCompare = key === selectedBrandPanelCompareKey;
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-compare", isCompare);
    button.setAttribute("aria-pressed", String(isSelected || isCompare));
  });
}

function closeTerritoryBrandPanel() {
  const shell = document.querySelector(".territory-shell");
  shell?.classList.remove("is-brand-panel-open");
  document.getElementById("territoryBrandPanel")?.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    window.territoryMap?.resize?.();
  }, 280);
}

window.territoryBrandPanel = {
  update: updateTerritoryBrandPanel,
  setSelectedTerritory,
  close: closeTerritoryBrandPanel,
  whenLayoutSettled: whenTerritoryBrandPanelLayoutSettled
};

initTerritoryBrandPanel();
