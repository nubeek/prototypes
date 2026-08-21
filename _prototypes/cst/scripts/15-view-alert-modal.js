const VIEW_ALERT_MODAL_CLOSE_DURATION_MS = 320;

let viewAlertModalCloseTimeoutId = null;
let lastViewAlertModalTrigger = null;
let viewAlertModalConfirmHandler = null;
let viewAlertModalCancelHandler = null;

const viewAlertModalElement = document.getElementById("viewAlertModal");
const viewAlertModalForm = document.getElementById("viewAlertModalForm");
const viewAlertNotifyCheckboxes = Array.from(
  document.querySelectorAll(".view-alert-notify-checkbox")
);
const viewAlertNotifyAdded = viewAlertModalForm?.elements.namedItem("notifyAdded");
const viewAlertNotifyModified = viewAlertModalForm?.elements.namedItem("notifyModified");

function syncViewAlertCheckbox(checkbox) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", Boolean(checkbox?.checked));
}

function syncViewAlertCheckboxes() {
  viewAlertNotifyCheckboxes.forEach(syncViewAlertCheckbox);
}

function setViewAlertModalValues(settings = null) {
  const hasSavedSettings = Boolean(settings?.enabled);

  if (viewAlertNotifyAdded instanceof HTMLInputElement) {
    viewAlertNotifyAdded.checked = hasSavedSettings
      ? Boolean(settings.notifyAdded)
      : true;
  }
  if (viewAlertNotifyModified instanceof HTMLInputElement) {
    viewAlertNotifyModified.checked = hasSavedSettings
      ? Boolean(settings.notifyModified)
      : true;
  }
  syncViewAlertCheckboxes();
}

function finalizeViewAlertModalClose() {
  if (!viewAlertModalElement) return;

  viewAlertModalElement.classList.remove("is-open", "is-closing");
  viewAlertModalElement.hidden = true;
  viewAlertModalForm?.reset();
  syncViewAlertCheckboxes();
  viewAlertModalCloseTimeoutId = null;
  viewAlertModalConfirmHandler = null;
  viewAlertModalCancelHandler = null;

  if (lastViewAlertModalTrigger instanceof HTMLElement) {
    lastViewAlertModalTrigger.focus({ preventScroll: true });
  }
  lastViewAlertModalTrigger = null;
}

function closeViewAlertModal({ confirmed = false } = {}) {
  if (!viewAlertModalElement || viewAlertModalElement.hidden) return;

  if (viewAlertModalCloseTimeoutId) {
    window.clearTimeout(viewAlertModalCloseTimeoutId);
  }

  const cancelHandler = viewAlertModalCancelHandler;
  viewAlertModalCancelHandler = null;
  if (!confirmed) cancelHandler?.();

  viewAlertModalElement.classList.remove("is-open");
  viewAlertModalElement.classList.add("is-closing");
  viewAlertModalCloseTimeoutId = window.setTimeout(
    finalizeViewAlertModalClose,
    VIEW_ALERT_MODAL_CLOSE_DURATION_MS
  );
}

function openViewAlertModal(trigger = null, {
  settings = null,
  onConfirm = null,
  onCancel = null
} = {}) {
  if (!viewAlertModalElement) return;

  if (viewAlertModalCloseTimeoutId) {
    window.clearTimeout(viewAlertModalCloseTimeoutId);
    viewAlertModalCloseTimeoutId = null;
  }

  lastViewAlertModalTrigger = trigger;
  viewAlertModalConfirmHandler = typeof onConfirm === "function" ? onConfirm : null;
  viewAlertModalCancelHandler = typeof onCancel === "function" ? onCancel : null;
  viewAlertModalForm?.reset();
  setViewAlertModalValues(settings);

  viewAlertModalElement.classList.remove("is-closing");
  viewAlertModalElement.hidden = false;
  viewAlertModalElement.classList.remove("is-open");

  window.requestAnimationFrame(() => {
    if (!viewAlertModalElement || viewAlertModalElement.hidden) return;
    viewAlertModalElement.classList.add("is-open");
    if (viewAlertNotifyAdded instanceof HTMLInputElement) {
      viewAlertNotifyAdded.focus({ preventScroll: true });
    }
  });
}

viewAlertNotifyCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => syncViewAlertCheckbox(checkbox));
});

if (viewAlertModalElement) {
  viewAlertModalElement.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const closeControl = event.target.closest(".view-alert-modal-close, .view-alert-modal-cancel");
    if (closeControl || event.target === viewAlertModalElement) {
      closeViewAlertModal();
    }
  });

  viewAlertModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const settings = {
      enabled: true,
      notifyAdded: Boolean(viewAlertNotifyAdded?.checked),
      notifyModified: Boolean(viewAlertNotifyModified?.checked)
    };
    const confirmHandler = viewAlertModalConfirmHandler;
    confirmHandler?.(settings);
    closeViewAlertModal({ confirmed: true });
  });
}

window.cstViewAlertModal = {
  open: openViewAlertModal,
  close: closeViewAlertModal
};
