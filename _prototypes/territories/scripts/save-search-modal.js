const DEFAULT_SAVE_SEARCH_ALERTS = {
  enabled: true,
  notifyAvailable: true,
  notifyStatus: true,
  notifyBrands: true
};

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

const saveSearchModalApi = window.createProtoModal({
  overlay: saveSearchModal,
  closeSelectors: ".save-search-modal-close, .save-search-modal-cancel",
  restoreFocus(trigger) {
    if (!(trigger instanceof HTMLElement)) return;
    if (trigger.classList.contains("target-settings")) {
      trigger.blur();
      trigger.closest(".target-card")?.blur();
      return;
    }
    trigger.focus({ preventScroll: true });
  },
  onClose() {
    resetSaveSearchModalForm();
    editingSavedSearchId = null;
    if (deleteSavedSearchBtn) deleteSavedSearchBtn.hidden = true;
    setSaveSearchAlerts(null);
  },
  onOpened() {
    saveSearchTitleInput?.select?.();
  }
});

function closeSaveSearchModal() {
  saveSearchModalApi.close();
}

function openSaveSearchModal(trigger = null, { savedSearch = null } = {}) {
  if (!saveSearchModal) return;

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

  saveSearchModalApi.open(trigger, {
    focus: saveSearchTitleInput
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
    }, window.PROTO_MODAL_CLOSE_DURATION_MS);
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
    }, window.PROTO_MODAL_CLOSE_DURATION_MS);
  });
}

saveSearchTitleInput?.addEventListener("input", () => {
  saveSearchTitleInput.setCustomValidity("");
});

window.territorySaveSearchModal = {
  open: openSaveSearchModal,
  close: closeSaveSearchModal
};
