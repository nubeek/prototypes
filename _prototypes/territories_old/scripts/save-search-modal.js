const SAVE_SEARCH_MODAL_CLOSE_DURATION_MS = 320;

let saveSearchModalCloseTimeoutId = null;
let lastSaveSearchModalTrigger = null;

const saveSearchModal = document.getElementById("saveSearchModal");
const saveSearchModalForm = document.getElementById("saveSearchModalForm");
const saveSearchFormView = document.getElementById("saveSearchFormView");
const saveSearchSuccessView = document.getElementById("saveSearchSuccessView");
const saveSearchAlertName = document.getElementById("saveSearchAlertName");
const saveSearchNotifyCheckboxes = Array.from(
  document.querySelectorAll(".save-search-notify-checkbox")
);

function syncSaveSearchCheckbox(checkbox) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", Boolean(checkbox?.checked));
}

function syncSaveSearchCheckboxes() {
  saveSearchNotifyCheckboxes.forEach(syncSaveSearchCheckbox);
}

function getSelectOptionLabels(select, values) {
  if (!select || !values?.length) return [];

  const valueSet = new Set(values.map(String));
  return Array.from(select.options)
    .filter((option) => option.value && valueSet.has(option.value))
    .map((option) => option.textContent.trim())
    .filter(Boolean);
}

function formatCompactInvestment(value) {
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

function getInvestmentDefaultMax() {
  const investmentSection = document
    .querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const maxRange = investmentSection?.querySelector(".range-input-max");
  return Number(maxRange?.max ?? 5_500_000);
}

function buildSaveSearchAlertName(snapshot) {
  const hasNarrowInvestment = snapshot.investmentMax < snapshot.investmentDefaultMax;
  const singleLocation = snapshot.locationLabels.length === 1
    ? snapshot.locationLabels[0]
    : "";
  const shortLocations = snapshot.locationLabels.length > 1 && snapshot.locationLabels.length <= 3
    ? snapshot.locationLabels.join(", ")
    : "";
  const locationPart = singleLocation || shortLocations;

  if (locationPart && hasNarrowInvestment) {
    let topic = "";

    if (snapshot.brandLabels.length === 1) {
      topic = snapshot.brandLabels[0];
    } else if (snapshot.categoryLabels.includes("Food & Beverage")) {
      topic = "QSR";
    } else if (snapshot.categoryLabels[0]) {
      topic = snapshot.categoryLabels[0];
    } else if (snapshot.brandLabels.length) {
      topic = snapshot.brandLabels.slice(0, 2).join(" / ");
    } else {
      topic = "territories";
    }

    return `${locationPart} ${topic} under ${formatCompactInvestment(snapshot.investmentMax)}`;
  }

  const parts = [...snapshot.categoryLabels, ...snapshot.brandLabels];
  if (parts.length) {
    return parts.join(" • ");
  }

  if (snapshot.locationLabels.length) {
    return snapshot.locationLabels.join(" • ");
  }

  if (hasNarrowInvestment) {
    return `Territories under ${formatCompactInvestment(snapshot.investmentMax)}`;
  }

  return "Territory search";
}

function getSaveSearchSnapshot() {
  const filters = window.territoryFilters?.getState?.() || {
    locations: { included: [] },
    categories: { included: [] },
    franchises: { included: [] },
    statuses: [],
    investmentMax: getInvestmentDefaultMax()
  };

  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const investmentDefaultMax = getInvestmentDefaultMax();

  return {
    categoryLabels: getSelectOptionLabels(categoryFilterSelect, filters.categories?.included || []),
    brandLabels: getSelectOptionLabels(franchiseFilterSelect, filters.franchises?.included || []),
    locationLabels: getSelectOptionLabels(locationFilterSelect, filters.locations?.included || []),
    statuses: filters.statuses || [],
    investmentMax: Number.isFinite(filters.investmentMax)
      ? filters.investmentMax
      : investmentDefaultMax,
    investmentDefaultMax
  };
}

function showSaveSearchFormView() {
  saveSearchFormView?.removeAttribute("hidden");
  saveSearchSuccessView?.setAttribute("hidden", "");
  saveSearchModal
    ?.querySelector(".save-search-modal")
    ?.setAttribute("aria-labelledby", "saveSearchModalTitle");
}

function showSaveSearchSuccessView() {
  saveSearchFormView?.setAttribute("hidden", "");
  saveSearchSuccessView?.removeAttribute("hidden");
  saveSearchModal
    ?.querySelector(".save-search-modal")
    ?.setAttribute("aria-labelledby", "saveSearchSuccessTitle");
  saveSearchModal
    ?.querySelector(".save-search-success__done")
    ?.focus({ preventScroll: true });
}

function resetSaveSearchModalForm() {
  if (!saveSearchModalForm) return;

  saveSearchModalForm.reset();
  syncSaveSearchCheckboxes();
  showSaveSearchFormView();
}

function finalizeSaveSearchModalClose() {
  if (!saveSearchModal) return;

  saveSearchModal.classList.remove("is-open", "is-closing");
  saveSearchModal.hidden = true;
  resetSaveSearchModalForm();
  saveSearchModalCloseTimeoutId = null;

  if (lastSaveSearchModalTrigger instanceof HTMLElement) {
    lastSaveSearchModalTrigger.focus({ preventScroll: true });
  }
  lastSaveSearchModalTrigger = null;
}

function closeSaveSearchModal() {
  if (!saveSearchModal || saveSearchModal.hidden) return;

  if (saveSearchModalCloseTimeoutId) {
    window.clearTimeout(saveSearchModalCloseTimeoutId);
  }

  saveSearchModal.classList.remove("is-open");
  saveSearchModal.classList.add("is-closing");
  saveSearchModalCloseTimeoutId = window.setTimeout(
    finalizeSaveSearchModalClose,
    SAVE_SEARCH_MODAL_CLOSE_DURATION_MS
  );
}

function openSaveSearchModal(trigger = null) {
  if (!saveSearchModal) return;

  if (saveSearchModalCloseTimeoutId) {
    window.clearTimeout(saveSearchModalCloseTimeoutId);
    saveSearchModalCloseTimeoutId = null;
  }

  lastSaveSearchModalTrigger = trigger;
  resetSaveSearchModalForm();

  if (saveSearchAlertName) {
    saveSearchAlertName.value = buildSaveSearchAlertName(getSaveSearchSnapshot());
  }

  saveSearchModal.classList.remove("is-closing");
  saveSearchModal.hidden = false;
  saveSearchModal.classList.remove("is-open");

  window.requestAnimationFrame(() => {
    if (!saveSearchModal || saveSearchModal.hidden) return;
    saveSearchModal.classList.add("is-open");
    saveSearchAlertName?.focus({ preventScroll: true });
    saveSearchAlertName?.select?.();
  });
}

function confirmSaveSearchFromModal() {
  showSaveSearchSuccessView();
}

document.getElementById("territorySaveSearch")?.addEventListener("click", (event) => {
  openSaveSearchModal(event.currentTarget);
});

saveSearchNotifyCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => syncSaveSearchCheckbox(checkbox));
});

if (saveSearchModal) {
  saveSearchModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const doneButton = event.target.closest(".save-search-success__done");
    if (doneButton) {
      closeSaveSearchModal();
      return;
    }

    const closeControl = event.target.closest(".save-search-modal-close, .save-search-modal-cancel");
    if (closeControl || event.target === saveSearchModal) {
      closeSaveSearchModal();
    }
  });

  saveSearchModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmSaveSearchFromModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !saveSearchModal || saveSearchModal.hidden) return;
  closeSaveSearchModal();
});

window.territorySaveSearchModal = {
  open: openSaveSearchModal,
  close: closeSaveSearchModal
};
