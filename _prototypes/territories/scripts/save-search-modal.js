const SAVE_SEARCH_MODAL_CLOSE_DURATION_MS = 320;
const DEFAULT_SAVE_SEARCH_ALERTS = {
  enabled: true,
  notifyAvailable: true,
  notifyStatus: true,
  notifyBrands: true
};

let saveSearchModalCloseTimeoutId = null;
let lastSaveSearchModalTrigger = null;
let pendingSaveSearchAlerts = null;
let editingSavedSearchId = null;

const saveSearchModal = document.getElementById("saveSearchModal");
const saveSearchModalForm = document.getElementById("saveSearchModalForm");
const saveSearchModalTitle = document.getElementById("saveSearchModalTitle");
const saveSearchTitleInput = document.getElementById("saveSearchTitle");
const saveSearchAlerts = document.getElementById("saveSearchAlerts");
const saveSearchAlertsRow = document.getElementById("saveSearchAlertsRow");
const saveSearchAlertsToggle = document.getElementById("saveSearchAlertsToggle");
const saveSearchAlertsHelper = document.getElementById("saveSearchAlertsHelper");
const saveSearchAlertsPanel = document.getElementById("saveSearchAlertsPanel");
const saveSearchNotifyCheckboxes = Array.from(
  document.querySelectorAll("#saveSearchAlertsPanel .save-search-notify-checkbox")
);
const saveSearchNotifyAvailable = saveSearchModalForm?.elements.namedItem("notifyAvailable");
const saveSearchNotifyStatus = saveSearchModalForm?.elements.namedItem("notifyStatus");
const saveSearchNotifyBrands = saveSearchModalForm?.elements.namedItem("notifyBrands");
const deleteSavedSearchBtn = document.getElementById("deleteSavedSearch");

function normalizeSaveSearchAlerts(alerts) {
  if (!alerts?.enabled) return null;

  return {
    enabled: true,
    notifyAvailable: Boolean(alerts.notifyAvailable),
    notifyStatus: Boolean(alerts.notifyStatus),
    notifyBrands: Boolean(alerts.notifyBrands)
  };
}

function readSaveSearchAlertsFromForm() {
  return {
    enabled: true,
    notifyAvailable: Boolean(saveSearchNotifyAvailable?.checked),
    notifyStatus: Boolean(saveSearchNotifyStatus?.checked),
    notifyBrands: Boolean(saveSearchNotifyBrands?.checked)
  };
}

function syncSaveSearchAlertCheckbox(checkbox) {
  checkbox?.closest(".filter-check")?.classList.toggle("is-checked", Boolean(checkbox?.checked));
}

function applySaveSearchAlertCheckboxes(settings) {
  const source = settings || DEFAULT_SAVE_SEARCH_ALERTS;

  if (saveSearchNotifyAvailable instanceof HTMLInputElement) {
    saveSearchNotifyAvailable.checked = Boolean(source.notifyAvailable);
  }
  if (saveSearchNotifyStatus instanceof HTMLInputElement) {
    saveSearchNotifyStatus.checked = Boolean(source.notifyStatus);
  }
  if (saveSearchNotifyBrands instanceof HTMLInputElement) {
    saveSearchNotifyBrands.checked = Boolean(source.notifyBrands);
  }
  saveSearchNotifyCheckboxes.forEach(syncSaveSearchAlertCheckbox);
}

function syncSaveSearchAlertsState() {
  const isEnabled = Boolean(pendingSaveSearchAlerts?.enabled);

  saveSearchAlerts?.classList.toggle("is-open", isEnabled);
  saveSearchAlertsRow?.classList.toggle("is-enabled", isEnabled);
  saveSearchAlertsToggle?.setAttribute("aria-checked", String(isEnabled));
  saveSearchAlertsToggle?.setAttribute("aria-expanded", String(isEnabled));
  saveSearchAlertsToggle?.setAttribute(
    "aria-label",
    isEnabled ? "Disable alerts" : "Enable alerts"
  );
  if (saveSearchAlertsHelper) {
    saveSearchAlertsHelper.textContent = isEnabled
      ? "Notify me when"
      : "Notify me when results change";
  }

  if (saveSearchAlertsPanel) {
    saveSearchAlertsPanel.inert = !isEnabled;
    saveSearchAlertsPanel.setAttribute("aria-hidden", String(!isEnabled));
  }
}

function setSaveSearchAlerts(alerts) {
  pendingSaveSearchAlerts = normalizeSaveSearchAlerts(alerts);
  applySaveSearchAlertCheckboxes(pendingSaveSearchAlerts || DEFAULT_SAVE_SEARCH_ALERTS);
  syncSaveSearchAlertsState();
}

function toggleSaveSearchAlerts() {
  pendingSaveSearchAlerts = pendingSaveSearchAlerts?.enabled
    ? null
    : readSaveSearchAlertsFromForm();
  syncSaveSearchAlertsState();
}

function buildSuggestedSaveSearchTitle() {
  return window.territoryBrandPanel?.formatAlertName?.() || "Territories";
}

function resetSaveSearchModalForm() {
  if (!saveSearchModalForm) return;

  saveSearchModalForm.reset();
  saveSearchTitleInput?.setCustomValidity("");
}

function finalizeSaveSearchModalClose() {
  if (!saveSearchModal) return;

  saveSearchModal.classList.remove("is-open", "is-closing");
  saveSearchModal.hidden = true;
  resetSaveSearchModalForm();
  saveSearchModalCloseTimeoutId = null;
  editingSavedSearchId = null;
  if (deleteSavedSearchBtn) deleteSavedSearchBtn.hidden = true;
  setSaveSearchAlerts(null);

  if (lastSaveSearchModalTrigger instanceof HTMLElement) {
    if (lastSaveSearchModalTrigger.classList.contains("target-settings")) {
      lastSaveSearchModalTrigger.blur();
      lastSaveSearchModalTrigger.closest(".target-card")?.blur();
    } else {
      lastSaveSearchModalTrigger.focus({ preventScroll: true });
    }
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

function openSaveSearchModal(trigger = null, { savedSearch = null } = {}) {
  if (!saveSearchModal) return;

  if (saveSearchModalCloseTimeoutId) {
    window.clearTimeout(saveSearchModalCloseTimeoutId);
    saveSearchModalCloseTimeoutId = null;
  }

  lastSaveSearchModalTrigger = trigger;
  editingSavedSearchId = savedSearch?.id || null;
  resetSaveSearchModalForm();
  setSaveSearchAlerts(savedSearch?.alerts);

  if (saveSearchModalTitle) {
    saveSearchModalTitle.textContent = editingSavedSearchId ? "Edit search" : "Save search";
  }
  if (deleteSavedSearchBtn) {
    deleteSavedSearchBtn.hidden = !editingSavedSearchId;
  }
  saveSearchModal.querySelector(".save-search-modal-close")?.setAttribute(
    "aria-label",
    editingSavedSearchId ? "Close edit search" : "Close save search"
  );
  if (saveSearchTitleInput) {
    saveSearchTitleInput.value = savedSearch?.title || buildSuggestedSaveSearchTitle();
  }

  saveSearchModal.classList.remove("is-closing");
  saveSearchModal.hidden = false;
  saveSearchModal.classList.remove("is-open");

  window.requestAnimationFrame(() => {
    if (!saveSearchModal || saveSearchModal.hidden) return;
    saveSearchModal.classList.add("is-open");
    saveSearchTitleInput?.focus({ preventScroll: true });
    saveSearchTitleInput?.select?.();
  });
}

document.getElementById("territorySaveSearch")?.addEventListener("click", (event) => {
  openSaveSearchModal(event.currentTarget);
});

saveSearchAlertsRow?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("#saveSearchAlertsPanel")) return;

  toggleSaveSearchAlerts();
});

saveSearchNotifyCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    syncSaveSearchAlertCheckbox(checkbox);
    if (!pendingSaveSearchAlerts?.enabled) return;
    pendingSaveSearchAlerts = readSaveSearchAlertsFromForm();
  });
});

if (saveSearchModal) {
  saveSearchModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const closeControl = event.target.closest(".save-search-modal-close, .save-search-modal-cancel");
    if (closeControl || event.target === saveSearchModal) {
      closeSaveSearchModal();
    }
  });

  saveSearchModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(saveSearchModalForm);
    const title = String(formData.get("title") || "").trim();
    saveSearchTitleInput?.setCustomValidity(title ? "" : "Enter a title.");
    if (!saveSearchModalForm.reportValidity()) return;

    const alerts = pendingSaveSearchAlerts ? { ...pendingSaveSearchAlerts } : null;
    const wasEditing = Boolean(editingSavedSearchId);

    const savedSearch = wasEditing
      ? window.territorySavedSearchStore?.update?.(editingSavedSearchId, { title, alerts })
      : window.territorySavedSearchStore?.create?.({
        title,
        filters: window.territoryFilters?.getCurrentPresetFilters?.() || {},
        alerts
      });

    if (!savedSearch) {
      saveSearchTitleInput?.setCustomValidity(
        wasEditing
          ? "This search could not be updated. Please try again."
          : "This search could not be saved. Please try again."
      );
      saveSearchModalForm.reportValidity();
      return;
    }

    closeSaveSearchModal();

    if (wasEditing) {
      return;
    }

    window.setTimeout(() => {
      window.territoryCrossroad?.revealSavedSearch?.(savedSearch);
    }, SAVE_SEARCH_MODAL_CLOSE_DURATION_MS);
  });

  deleteSavedSearchBtn?.addEventListener("click", () => {
    if (!editingSavedSearchId) return;

    const deletedSearch = window.territoryCrossroad?.deleteSavedSearch?.(editingSavedSearchId);
    if (!deletedSearch) {
      saveSearchTitleInput?.setCustomValidity("This search could not be deleted. Please try again.");
      saveSearchModalForm?.reportValidity();
      return;
    }

    closeSaveSearchModal();
    window.setTimeout(() => {
      window.territoryCrossroad?.revealDeletedSearch?.(deletedSearch);
    }, SAVE_SEARCH_MODAL_CLOSE_DURATION_MS);
  });
}

saveSearchTitleInput?.addEventListener("input", () => {
  saveSearchTitleInput.setCustomValidity("");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !saveSearchModal || saveSearchModal.hidden) return;
  closeSaveSearchModal();
});

window.territorySaveSearchModal = {
  open: openSaveSearchModal,
  close: closeSaveSearchModal
};
