/* Shared prototype dialog helper.
   Use this when adding a form dialog (title + inline close, body, Cancel/Save).

   HTML:
   <div class="proto-modal-overlay" id="exampleModal" hidden>
     <section class="proto-modal proto-modal--form" role="dialog" aria-modal="true" aria-labelledby="exampleModalTitle">
       <form class="proto-modal-form" id="exampleModalForm">
         <div class="proto-modal-header">
           <h2 class="proto-modal-title" id="exampleModalTitle">Title</h2>
           <div class="proto-modal-header-actions">
             <button class="ui-control ui-close-button proto-modal-close" type="button" aria-label="Close">
               <img src="assets/close.svg" alt="" aria-hidden="true">
             </button>
           </div>
         </div>
         <div class="proto-modal-body">
           <!-- unique body -->
         </div>
         <div class="proto-modal-actions">
           <button class="ui-control ui-button proto-modal-cancel" type="button">Cancel</button>
           <button class="ui-control ui-button ui-button-primary proto-modal-save" type="submit">Save</button>
         </div>
       </form>
     </section>
   </div>

   Profile-style cards (centered hero, no header row) still use this helper for
   open/close, but keep an absolutely positioned .profile-modal-close. */
(function () {
  const CLOSE_DURATION_MS = 320;
  const stack = [];

  function removeFromStack(modal) {
    const index = stack.indexOf(modal);
    if (index >= 0) stack.splice(index, 1);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;

    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const modal = stack[index];
      if (!modal.isVisible() || !modal.shouldCloseOnEscape(event)) continue;
      event.preventDefault();
      modal.close();
      return;
    }
  });

  function createProtoModal(options = {}) {
    const overlay = options.overlay;
    const closeSelectors = options.closeSelectors || ".proto-modal-close, .proto-modal-cancel";
    const closeDurationMs = options.closeDurationMs ?? CLOSE_DURATION_MS;
    const shouldCloseOnOverlay = options.shouldCloseOnOverlay !== false;
    const restoreFocus = options.restoreFocus;
    let closeTimeoutId = null;
    let lastTrigger = null;

    const api = {
      open(trigger = null, openOptions = {}) {
        if (!overlay) return;

        if (closeTimeoutId) {
          window.clearTimeout(closeTimeoutId);
          closeTimeoutId = null;
        }

        lastTrigger = trigger;
        options.onOpen?.(openOptions);
        overlay.classList.remove("is-closing");
        overlay.hidden = false;
        overlay.classList.remove("is-open");
        removeFromStack(api);
        stack.push(api);

        window.requestAnimationFrame(() => {
          if (!overlay || overlay.hidden) return;
          overlay.classList.add("is-open");
          const focusElement = openOptions.focus
            ?? (typeof options.getFocusElement === "function" ? options.getFocusElement() : null);
          focusElement?.focus?.({ preventScroll: true });
          options.onOpened?.(openOptions);
        });
      },
      close() {
        if (!overlay || overlay.hidden) return;

        options.onBeforeClose?.();
        if (closeTimeoutId) {
          window.clearTimeout(closeTimeoutId);
        }

        overlay.classList.remove("is-open");
        overlay.classList.add("is-closing");
        closeTimeoutId = window.setTimeout(() => {
          overlay.classList.remove("is-open", "is-closing");
          overlay.hidden = true;
          closeTimeoutId = null;
          removeFromStack(api);
          options.onClose?.();
          if (restoreFocus === false) {
            lastTrigger = null;
            return;
          }
          if (typeof restoreFocus === "function") {
            restoreFocus(lastTrigger);
          } else if (lastTrigger instanceof HTMLElement) {
            lastTrigger.focus({ preventScroll: true });
          }
          lastTrigger = null;
        }, closeDurationMs);
      },
      isVisible() {
        return Boolean(overlay) && !overlay.hidden;
      },
      isOpen() {
        return api.isVisible() && overlay.classList.contains("is-open");
      },
      getTrigger() {
        return lastTrigger;
      },
      shouldCloseOnEscape(event) {
        if (typeof options.shouldCloseOnEscape === "function") {
          return options.shouldCloseOnEscape(event) !== false;
        }
        return options.shouldCloseOnEscape !== false;
      }
    };

    if (!overlay) return api;

    overlay.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const closeControl = event.target.closest(closeSelectors);
      if (closeControl || (shouldCloseOnOverlay && event.target === overlay)) {
        api.close();
      }
    });

    return api;
  }

  window.PROTO_MODAL_CLOSE_DURATION_MS = CLOSE_DURATION_MS;
  window.createProtoModal = createProtoModal;
})();
