const targets = window.targetsData || [];
const grid = document.getElementById("targetsGrid");
const emptyState = document.getElementById("targetsEmpty");
const tabs = Array.from(document.querySelectorAll(".grid-tab"));
const searchInput = document.getElementById("targetSearch");
const searchClear = document.getElementById("targetSearchClear");
const TARGET_HREF = "list.html";
const ACTIVE_TARGET_STORAGE_KEY = "wefranch:active-target";

let activeScope = "all";
let searchTerm = "";

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
      target.type.toLowerCase().includes(term);

    return matchesScope && matchesSearch;
  });
}

function render() {
  const visible = getVisibleTargets();
  grid.innerHTML = visible.map(targetCard).join("");
  emptyState.hidden = visible.length > 0;
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
