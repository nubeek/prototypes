/* Shared confirmation dialog.
   Nested inside a host (usually a proto-modal) so the overlay covers that
   panel only. Pass no host to cover the viewport like a regular proto-modal.

   const confirm = createProtoConfirmModal({ host: wizardEl });
   confirm.open({
     title: "Switch to a single email?",
     message: "Keeps the first email and discards the rest.",
     messageHtml: "... <strong>This can't be undone.</strong>",
     cancelLabel: "Cancel",
     confirmLabel: "Switch",
     confirmPlacement: "end",
     confirmVariant: "primary",
     cancelVariant: "ghost",
     trigger,
     onConfirm() {},
     onCancel() {}
   });
*/
(function () {
  let confirmId = 0;
  const BUTTON_BASE_CLASS = "ui-control ui-button";

  function setConfirmMessage(bodyEl, options = {}) {
    if (typeof options.messageHtml === "string") {
      bodyEl.innerHTML = options.messageHtml;
      return;
    }
    if (options.message instanceof Node) {
      bodyEl.replaceChildren(options.message);
      return;
    }
    const message = options.message == null ? "" : String(options.message);
    bodyEl.replaceChildren();
    message.split("\n").forEach((line, index) => {
      if (index) bodyEl.append(document.createElement("br"));
      bodyEl.append(line);
    });
  }

  function buttonClassForVariant(variant, fallback) {
    const resolved = variant || fallback;
    if (resolved === "secondary") {
      return `${BUTTON_BASE_CLASS} proto-modal-save ui-button-secondary`;
    }
    if (resolved === "ghost") {
      return `${BUTTON_BASE_CLASS} proto-modal-cancel`;
    }
    return `${BUTTON_BASE_CLASS} proto-modal-save ui-button-primary`;
  }

  function createProtoConfirmModal(options = {}) {
    const host = options.host || document.body;
    const nested = host !== document.body;
    const id = `protoConfirm${++confirmId}`;

    const overlay = document.createElement("div");
    overlay.className = `proto-modal-overlay proto-confirm-overlay${nested ? " is-nested" : ""}`;
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="proto-modal proto-confirm" role="alertdialog" aria-modal="true" aria-labelledby="${id}Title" aria-describedby="${id}Body">
        <h2 class="proto-modal-title proto-confirm-title" id="${id}Title"></h2>
        <p class="proto-modal-subtitle proto-confirm-body" id="${id}Body"></p>
        <div class="proto-modal-actions proto-confirm-actions">
          <button class="ui-control ui-button proto-modal-cancel" type="button" data-proto-confirm-action="cancel">Cancel</button>
          <button class="ui-control ui-button ui-button-primary proto-modal-save" type="button" data-proto-confirm-action="confirm">Confirm</button>
        </div>
      </section>
    `;

    const titleEl = overlay.querySelector(".proto-confirm-title");
    const bodyEl = overlay.querySelector(".proto-confirm-body");
    const actionsEl = overlay.querySelector(".proto-confirm-actions");
    const cancelBtn = overlay.querySelector('[data-proto-confirm-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-proto-confirm-action="confirm"]');
    let onConfirm = null;
    let onCancel = null;
    let confirmed = false;

    host.append(overlay);

    const modal = window.createProtoModal({
      overlay,
      closeSelectors: '[data-proto-confirm-action="cancel"]',
      shouldCloseOnOverlay: options.shouldCloseOnOverlay ?? false,
      disableHeightAnimation: true,
      restoreFocus: options.restoreFocus,
      getFocusElement() {
        return cancelBtn;
      },
      onOpen(openOptions) {
        options.onOpen?.(openOptions);
      },
      onOpened(openOptions) {
        options.onOpened?.(openOptions);
      },
      onClose() {
        const cancel = confirmed ? null : onCancel;
        onConfirm = null;
        onCancel = null;
        confirmed = false;
        options.onClose?.();
        cancel?.();
      }
    });

    confirmBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const confirm = onConfirm;
      confirmed = true;
      onCancel = null;
      modal.close();
      confirm?.();
    });

    return {
      open(openOptions = {}) {
        confirmed = false;
        titleEl.textContent = openOptions.title || "";
        setConfirmMessage(bodyEl, openOptions);
        cancelBtn.textContent = openOptions.cancelLabel || "Cancel";
        confirmBtn.textContent = openOptions.confirmLabel || "Confirm";
        cancelBtn.className = buttonClassForVariant(openOptions.cancelVariant, "ghost");
        confirmBtn.className = buttonClassForVariant(openOptions.confirmVariant, "primary");
        if (openOptions.confirmPlacement === "start") {
          actionsEl.append(confirmBtn, cancelBtn);
        } else {
          actionsEl.append(cancelBtn, confirmBtn);
        }
        onConfirm = typeof openOptions.onConfirm === "function" ? openOptions.onConfirm : null;
        onCancel = typeof openOptions.onCancel === "function" ? openOptions.onCancel : null;
        modal.open(openOptions.trigger);
      },
      close() {
        modal.close();
      },
      isVisible() {
        return modal.isVisible();
      },
      isOpen() {
        return modal.isOpen();
      }
    };
  }

  window.createProtoConfirmModal = createProtoConfirmModal;
})();
