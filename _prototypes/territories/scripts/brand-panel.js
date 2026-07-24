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

function createTerritoryShape(geometry, color, { status } = {}) {
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
    path.setAttribute("fill-opacity", "0.55");
  } else {
    path.setAttribute("fill", color);
    path.setAttribute("fill-opacity", "0.25");
  }

  svg.append(path);
  return svg;
}

const collapsedTerritoryBrandIds = new Set();
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

function createTerritoryBrandItem(brand, territories) {
  const item = document.createElement("li");
  const toggle = document.createElement("button");
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

  toggle.className = "ui-control ui-button-ghost territory-brand-item__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", String(isExpanded));
  toggle.setAttribute("aria-controls", territoryListId);

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
    const territoryShape = createTerritoryShape(territory.geometry, brand.color, {
      status: territory.status
    });
    const territoryKey = `${territory.brandId}:${territory.state}`;
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
      window.territoryMapSelection?.toggle?.(territory.brandId, territory.state, {
        compare: Boolean(event.metaKey || event.ctrlKey)
      });
    });
    territoryButton.addEventListener("mouseenter", () => {
      window.territoryMapHover?.set?.(territory.brandId, territory.state);
    });
    territoryButton.addEventListener("mouseleave", () => {
      window.territoryMapHover?.clear?.();
    });
    territoryButton.addEventListener("focus", () => {
      window.territoryMapHover?.set?.(territory.brandId, territory.state);
    });
    territoryButton.addEventListener("blur", () => {
      window.territoryMapHover?.clear?.();
    });

    territoryItem.append(territoryButton);
    territoryList.append(territoryItem);
  });

  details.append(name, count);
  toggle.append(logo, details, chevron);
  item.append(toggle, territoryList);

  toggle.addEventListener("click", () => {
    const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    territoryList.hidden = !nextExpanded;

    if (nextExpanded) {
      collapsedTerritoryBrandIds.delete(brand.id);
    } else {
      collapsedTerritoryBrandIds.add(brand.id);
    }

    syncTerritoryBrandPanelExpandToggle();
  });

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
    const territoryList = item.querySelector(".territory-brand-territories");
    if (!toggle || !territoryList) return;

    toggle.setAttribute("aria-expanded", String(expanded));
    territoryList.hidden = !expanded;

    if (brandId) {
      if (expanded) {
        collapsedTerritoryBrandIds.delete(brandId);
      } else {
        collapsedTerritoryBrandIds.add(brandId);
      }
    }
  });

  syncTerritoryBrandPanelExpandToggle();
}

function initTerritoryBrandPanel() {
  const expandToggle = document.getElementById("territoryBrandExpandToggle");
  expandToggle?.addEventListener("click", () => {
    setAllTerritoryBrandRowsExpanded(areAllTerritoryBrandRowsCollapsed());
  });
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

  summary.textContent = `Showing ${visibleBrands.length} franchise brands sorted by relevancy`;
  list.replaceChildren(
    ...visibleBrands.map((brand) => (
      createTerritoryBrandItem(brand, territoriesByBrand.get(brand.id) || [])
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
