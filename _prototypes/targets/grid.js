const targets = window.targetsData || [];
const grid = document.getElementById("targetsGrid");
const emptyState = document.getElementById("targetsEmpty");
const tabs = Array.from(document.querySelectorAll(".grid-tab"));
const searchInput = document.getElementById("targetSearch");
const searchClear = document.getElementById("targetSearchClear");
const toolbarDropdowns = Array.from(document.querySelectorAll(".toolbar-dropdown"));
const gridToolbar = document.querySelector(".grid-toolbar");
const gridToolbarSentinel = document.querySelector(".grid-toolbar-sentinel");
const targetGridMenuDropdown = document.getElementById("targetGridMenuDropdown");
const cardViewOptions = Array.from(document.querySelectorAll("[data-card-view]"));
const TARGET_HREF = "list.html";
const ACTIVE_TARGET_STORAGE_KEY = "wefranch:active-target";
const CARD_DETAIL_VIEW_STORAGE_KEY = "wefranch:targets-card-detail-view";
const DEFAULT_CARD_DETAIL_VIEWS = {
  location: true,
  franchises: true,
};

let activeScope = "all";
let searchTerm = "";
let cardDetailViews = { ...DEFAULT_CARD_DETAIL_VIEWS };

function loadCardDetailView() {
  try {
    const storedView = sessionStorage.getItem(CARD_DETAIL_VIEW_STORAGE_KEY);
    if (!storedView) return;

    if (storedView === "location") {
      cardDetailViews = { location: true, franchises: false };
      return;
    }

    if (storedView === "franchises") {
      cardDetailViews = { location: false, franchises: true };
      return;
    }

    const parsed = JSON.parse(storedView);
    if (parsed && typeof parsed === "object") {
      cardDetailViews = {
        location: Boolean(parsed.location),
        franchises: Boolean(parsed.franchises),
      };
    }
  } catch (error) {
    cardDetailViews = { ...DEFAULT_CARD_DETAIL_VIEWS };
  }
}

function saveCardDetailView() {
  try {
    sessionStorage.setItem(CARD_DETAIL_VIEW_STORAGE_KEY, JSON.stringify(cardDetailViews));
  } catch (error) {
    // Static prototype still works if session storage is unavailable.
  }
}

function syncCardDetailViewOptions() {
  cardViewOptions.forEach((option) => {
    const view = option.dataset.cardView;
    option.setAttribute("aria-checked", String(Boolean(cardDetailViews[view])));
  });
}

function toggleCardDetailView(view) {
  if (view !== "location" && view !== "franchises") return;

  cardDetailViews[view] = !cardDetailViews[view];
  saveCardDetailView();
  syncCardDetailViewOptions();
  render();
}

function getCardContextFields(target) {
  if (!cardDetailViews.location) return "";

  return `
    <div class="target-field">
      <span class="target-label">Location</span>
      <span class="target-value">${target.location}</span>
    </div>
  `;
}

function getTargetMapMarkup(target) {
  const franchises = getTargetFranchises(target);
  const franchiseOverlay =
    cardDetailViews.franchises && franchises.length
      ? `<div class="target-map-franchises">${getTargetFranchiseLogosMarkup(franchises)}</div>`
      : "";

  return `
    <div class="target-map">
      <img class="target-map-img" src="${getTargetMapSnapshotUrl(target)}" alt="" loading="lazy">
      ${franchiseOverlay}
    </div>
  `;
}

function getAddedBadge(added) {
  return added > 0 ? `<span class="target-added">+${added.toLocaleString("en")}</span>` : "";
}

function targetCard(target) {
  const hasUpdates = target.added > 0;
  const targetHref = target.slug
    ? `${TARGET_HREF}?target=${encodeURIComponent(target.slug)}`
    : TARGET_HREF;

  return `
    <a class="target-card${hasUpdates ? " has-updates" : ""}" href="${targetHref}" data-target-slug="${target.slug || ""}">
      <div class="target-card-title">${target.name}</div>

      ${getCardContextFields(target)}

      ${getTargetMapMarkup(target)}

      <div class="target-field target-prospects">
        <span class="target-label">Prospects</span>
        <div class="target-prospects-row">
          <span class="target-number">${target.prospects.toLocaleString("en")}</span>
          ${getAddedBadge(target.added)}
          <img class="target-chevron" src="assets/chevron.svg" alt="" aria-hidden="true">
        </div>
      </div>
    </a>
  `;
}

function getVisibleTargets() {
  const term = searchTerm.trim().toLowerCase();

  return targets.filter((target) => {
    const matchesScope = activeScope === "all" || target.scope === activeScope;
    const matchesSearch =
      !term ||
      target.name.toLowerCase().includes(term) ||
      target.location.toLowerCase().includes(term) ||
      target.type.toLowerCase().includes(term) ||
      getTargetFranchises(target).some((franchise) => franchise.toLowerCase().includes(term));

    return matchesScope && matchesSearch;
  });
}

function render() {
  const visible = getVisibleTargets();
  grid.innerHTML = visible.map(targetCard).join("");
  emptyState.hidden = visible.length > 0;
}

loadCardDetailView();
syncCardDetailViewOptions();

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((other) => other.classList.toggle("is-active", other === tab));
    activeScope = tab.dataset.scope;
    render();
  });
});

grid?.addEventListener("click", (event) => {
  const targetLink = event.target.closest(".target-card");
  const targetSlug = targetLink?.dataset.targetSlug;

  if (!targetSlug) return;

  try {
    sessionStorage.setItem(ACTIVE_TARGET_STORAGE_KEY, targetSlug);
  } catch (error) {
    // Static prototype still works if session storage is unavailable.
  }
});

function closeToolbarDropdowns(exceptDropdown = null) {
  toolbarDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) return;
    dropdown.removeAttribute("open");
  });
}

if (targetGridMenuDropdown) {
  targetGridMenuDropdown.addEventListener("toggle", () => {
    if (targetGridMenuDropdown.open) closeToolbarDropdowns(targetGridMenuDropdown);
  });
}

cardViewOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.preventDefault();
    toggleCardDetailView(option.dataset.cardView);
  });
});

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
  if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
    closeToolbarDropdowns();
  }
});

if (searchInput) {
  const searchField = searchInput.closest(".target-search-btn");

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    searchField?.classList.toggle("is-active-search", Boolean(searchTerm.trim()));
    if (searchClear) {
      searchClear.hidden = !searchTerm.trim();
    }
    render();
  });

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.focus();
    });
  }
}

if (gridToolbar && gridToolbarSentinel) {
  const stuckObserver = new IntersectionObserver(
    ([entry]) => {
      gridToolbar.classList.toggle("is-stuck", !entry.isIntersecting);
    },
    { threshold: [0] }
  );
  stuckObserver.observe(gridToolbarSentinel);
}

render();
