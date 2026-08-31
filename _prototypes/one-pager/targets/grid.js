const targets = window.targetsData || [];
const grid = document.getElementById("targetsGrid");
const emptyState = document.getElementById("targetsEmpty");
const tabs = Array.from(document.querySelectorAll(".grid-tab"));
const searchInput = document.getElementById("targetSearch");
const searchClear = document.getElementById("targetSearchClear");
const TARGET_HREF = "list.html";
const ACTIVE_TARGET_STORAGE_KEY = "wefranch:active-target";
const ONE_PAGER_CARD_STAGGER_MS = 120;
const isOnePagerTargetsPresentation = document.body.classList.contains("one-pager-targets-presentation");

// Step 4 presentation labels — applied here so the grid stays correct even if targets.js is cached.
const ONE_PAGER_PRESENTATION_TARGET_OVERRIDES = {
  "co-tn-az-top-fitness-mumbos": {
    name: "Midwest Planet Fitness MUMBOs",
    location: "Midwest",
    type: "Multi-unit, multi-brand owners"
  },
  "massage-envy": {
    name: "West Virginia MUMBOS",
    location: "West Virginia, United States",
    type: "-",
    prospects: 74,
    added: 12
  },
  "phenix-salon-suites": {
    name: "Oklahoma MUMBOS",
    location: "Oklahoma, United States",
    type: "-",
    prospects: 122,
    added: 23
  },
  "brea-ca": {
    name: "Pennsylvania MUMBOS",
    location: "Pennsylvania, United States",
    type: "-",
    prospects: 781,
    added: 61
  },
  "tropical-smoothie-cafe": {
    name: "Florida MUMBOS",
    location: "Florida, United States",
    type: "Multi-Brand Operator",
    prospects: 298,
    added: 80
  },
  "crumbl": {
    name: "Jacksonville",
    location: "Jacksonville, Florida, United States",
    type: "-",
    prospects: 889,
    added: 207
  },
  "tn-texas-non-coffee-qsrs": {
    name: "Louisiana MUMBOS",
    location: "Louisiana, United States",
    type: "-",
    prospects: 116,
    added: 29
  },
  "planet-fitness-mega-operators": {
    name: "Arkansas MUMBOS",
    location: "Arkansas, United States",
    type: "-",
    prospects: 88,
    added: 17
  },
  "athlete-franchise-owners": {
    name: "Virginia MUMBOS",
    location: "Virginia, United States",
    type: "-",
    prospects: 456,
    added: 113
  }
};

let activeScope = "all";
let searchTerm = "";
let onePagerPresentationPaused = false;
const onePagerPausedAnimations = new Set();

function syncOnePagerDocumentAnimations(isPaused) {
  if (typeof document.getAnimations !== "function") return;

  if (isPaused) {
    document.getAnimations({ subtree: true }).forEach((animation) => {
      if (animation.playState === "running" || animation.playState === "pending") {
        animation.pause();
        onePagerPausedAnimations.add(animation);
      }
    });
    return;
  }

  onePagerPausedAnimations.forEach((animation) => {
    if (animation.playState === "paused") {
      animation.play();
    }
  });
  onePagerPausedAnimations.clear();
}

function setOnePagerPresentationPaused(isPaused) {
  const nextPaused = Boolean(isPaused);
  if (nextPaused === onePagerPresentationPaused) return;

  onePagerPresentationPaused = nextPaused;
  document.body.classList.toggle("is-one-pager-paused", nextPaused);
  syncOnePagerDocumentAnimations(nextPaused);
}

function getTargetForDisplay(target) {
  if (!isOnePagerTargetsPresentation) return target;

  const overrides = ONE_PAGER_PRESENTATION_TARGET_OVERRIDES[target.slug];
  return overrides ? { ...target, ...overrides } : target;
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

      <div class="target-field">
        <span class="target-label">Location</span>
        <span class="target-value">${target.location}</span>
      </div>

      <div class="target-field">
        <span class="target-label">Type</span>
        <span class="target-value">${target.type}</span>
      </div>

      <div class="target-field target-prospects">
        <span class="target-label">Prospects</span>
        <div class="target-prospects-row">
          <span class="target-number">${target.prospects.toLocaleString("en")}</span>
          ${getAddedBadge(target.added)}
          <img class="target-chevron" src="../../../assets/icons/chevron.svg" alt="" aria-hidden="true">
        </div>
      </div>
    </a>
  `;
}

function getVisibleTargets() {
  const term = searchTerm.trim().toLowerCase();

  return targets
    .map(getTargetForDisplay)
    .filter((target) => {
    const matchesScope = activeScope === "all" || target.scope === activeScope;
    const matchesSearch =
      !term ||
      target.name.toLowerCase().includes(term) ||
      target.location.toLowerCase().includes(term) ||
      target.type.toLowerCase().includes(term);

    return matchesScope && matchesSearch;
  });
}

function render() {
  const visible = getVisibleTargets();
  grid.innerHTML = visible.map(targetCard).join("");
  emptyState.hidden = visible.length > 0;
  syncOnePagerCardOrder();
}

function syncOnePagerCardOrder() {
  grid?.querySelectorAll(".target-card").forEach((card, index) => {
    card.style.setProperty("--one-pager-card-index", index);
    card.style.setProperty("--one-pager-card-delay", `${index * ONE_PAGER_CARD_STAGGER_MS}ms`);
  });
}

function runOnePagerTargetsListingIntro() {
  document.body.classList.remove("is-one-pager-targets-opening-detail");
  document.body.classList.add("is-one-pager-targets-intro");

  grid?.querySelectorAll(".target-card").forEach((card) => {
    card.classList.remove("is-one-pager-opening");
  });

  window.requestAnimationFrame(() => {
    document.body.classList.add("is-one-pager-targets-ready");
  });
}

function runOnePagerTargetsOpenAnimation(targetSlug) {
  const card = Array.from(grid?.querySelectorAll(".target-card") || [])
    .find((targetCardElement) => targetCardElement.dataset.targetSlug === targetSlug);
  if (!card) return false;

  try {
    sessionStorage.setItem(ACTIVE_TARGET_STORAGE_KEY, targetSlug);
  } catch (error) {
    // Static prototype still works if session storage is unavailable.
  }

  document.body.classList.add("is-one-pager-targets-opening-detail");
  card.classList.add("is-one-pager-opening");
  return true;
}

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

render();

window.runOnePagerTargetsListingIntro = runOnePagerTargetsListingIntro;
window.runOnePagerTargetsOpenAnimation = runOnePagerTargetsOpenAnimation;
window.setOnePagerPresentationPaused = setOnePagerPresentationPaused;

if (document.body.classList.contains("one-pager-targets-presentation")) {
  runOnePagerTargetsListingIntro();
}
