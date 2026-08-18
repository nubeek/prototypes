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

function buildSaveSearchAlertName() {
  return window.territoryBrandPanel?.formatAlertName?.() || "Territories";
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
    saveSearchAlertName.value = buildSaveSearchAlertName();
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
