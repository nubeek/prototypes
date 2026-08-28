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
  const HEIGHT_TRANSITION_MS = 300;
  const stack = [];
  const MODAL_PANEL_SELECTOR = ".proto-modal, .profile-modal, .target-modal";
  const MODAL_FIELD_SELECTOR = ".proto-modal-field, .target-modal-field";
  const MODAL_FIELD_CONTROL_SELECTOR = [
    "input",
    "textarea",
    "select",
    "button",
    "a",
    ".filter-select-field",
    ".filter-combobox-control",
    ".filter-combobox-menu",
    ".filter-combobox-clear",
    ".proto-modal-control",
    ".target-modal-control",
    ".proto-modal-select-field",
    ".target-modal-select-field",
    ".request-info-territory-field"
  ].join(", ");

  function isModalFieldControl(node) {
    return Boolean(node.closest?.(MODAL_FIELD_CONTROL_SELECTOR));
  }

  function shouldIgnoreModalFieldLabelMouseDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (!target.closest(MODAL_PANEL_SELECTOR)) return false;
    if (target.closest(".filter-check")) return false;
    if (isModalFieldControl(target)) return false;

    const field = target.closest(MODAL_FIELD_SELECTOR);
    if (!field) return false;

    return target === field
      || field.matches("label")
      || Boolean(target.closest(`${MODAL_FIELD_SELECTOR} > label`));
  }

  function ignoreModalFieldLabelPointer(event) {
    if (!shouldIgnoreModalFieldLabelMouseDown(event)) return;
    event.preventDefault();
  }

  document.addEventListener("mousedown", ignoreModalFieldLabelPointer, true);
  document.addEventListener("click", ignoreModalFieldLabelPointer, true);

  function shouldReduceModalMotion() {
    return document.body.classList.contains("reduce-motion");
  }

  function getModalPanel(overlay) {
    return overlay?.querySelector(".proto-modal, .profile-modal, .target-modal");
  }

  function measureModalNaturalHeight(panel) {
    if (!panel) return 0;

    const inlineHeight = panel.style.height;
    const inlineOverflow = panel.style.overflow;
    panel.style.height = "auto";
    panel.style.overflow = "visible";
    const height = Math.ceil(panel.getBoundingClientRect().height);
    panel.style.height = inlineHeight;
    panel.style.overflow = inlineOverflow;
    return height;
  }

  function createProtoModalHeightAnimator(overlay) {
    const panel = getModalPanel(overlay);
    if (!panel) {
      return {
        start() {},
        stop() {},
        reset() {},
        sync() {}
      };
    }

    let active = false;
    let lastKnownHeight = 0;
    let rafId = null;
    let finishTimeoutId = null;
    let animating = false;

    function clearScheduledSync() {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    function clearFinishTimeout() {
      if (!finishTimeoutId) return;
      window.clearTimeout(finishTimeoutId);
      finishTimeoutId = null;
    }

    function resetPanelHeightStyles() {
      panel.classList.remove("is-resizing");
      panel.style.height = "";
      panel.style.overflow = "";
    }

    function finishHeightAnimation(shouldResync = true) {
      clearFinishTimeout();
      panel.removeEventListener("transitionend", onHeightTransitionEnd);
      animating = false;

      if (active) {
        resetPanelHeightStyles();
        lastKnownHeight = measureModalNaturalHeight(panel);
        if (shouldResync) scheduleHeightSync();
        return;
      }

      resetPanelHeightStyles();
    }

    function onHeightTransitionEnd(event) {
      if (event.target !== panel || event.propertyName !== "height") return;
      finishHeightAnimation();
    }

    function animateHeightChange(nextHeight) {
      if (!active) return;

      const roundedNext = Math.round(nextHeight);
      const roundedLast = Math.round(lastKnownHeight || panel.offsetHeight);
      if (Math.abs(roundedLast - roundedNext) < 1) {
        lastKnownHeight = roundedNext;
        return;
      }

      if (shouldReduceModalMotion()) {
        lastKnownHeight = roundedNext;
        resetPanelHeightStyles();
        return;
      }

      if (animating) {
        finishHeightAnimation(false);
      }

      animating = true;
      panel.classList.add("is-resizing");
      panel.style.overflow = "hidden";
      panel.style.height = `${roundedLast}px`;

      window.requestAnimationFrame(() => {
        if (!active || !animating) return;
        panel.style.height = `${roundedNext}px`;
      });

      panel.addEventListener("transitionend", onHeightTransitionEnd);
      finishTimeoutId = window.setTimeout(finishHeightAnimation, HEIGHT_TRANSITION_MS + 40);
    }

    function scheduleHeightSync() {
      if (!active || animating) return;

      clearScheduledSync();
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!active || !overlay.classList.contains("is-open")) return;

        const nextHeight = measureModalNaturalHeight(panel);
        animateHeightChange(nextHeight);
      });
    }

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(() => {
        scheduleHeightSync();
      });
      resizeObserver.observe(panel);
    }

    const mutationObserver = new MutationObserver(() => {
      scheduleHeightSync();
    });
    mutationObserver.observe(panel, {
      attributes: true,
      attributeFilter: ["hidden", "open"],
      childList: true,
      subtree: true,
      characterData: true
    });

    return {
      start() {
        active = true;
        animating = false;
        clearScheduledSync();
        clearFinishTimeout();
        resetPanelHeightStyles();
        lastKnownHeight = measureModalNaturalHeight(panel);
      },
      stop() {
        active = false;
        clearScheduledSync();
        finishHeightAnimation();
        resetPanelHeightStyles();
      },
      reset() {
        this.stop();
      },
      sync() {
        scheduleHeightSync();
      }
    };
  }

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
    const heightAnimator = overlay ? createProtoModalHeightAnimator(overlay) : null;

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
          heightAnimator?.start();
          const focusElement = openOptions.focus
            ?? (typeof options.getFocusElement === "function" ? options.getFocusElement() : null);
          focusElement?.focus?.({ preventScroll: true });
          options.onOpened?.(openOptions);
        });
      },
      close() {
        if (!overlay || overlay.hidden) return;

        options.onBeforeClose?.();
        heightAnimator?.stop();
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
  window.PROTO_MODAL_HEIGHT_TRANSITION_MS = HEIGHT_TRANSITION_MS;
  window.createProtoModal = createProtoModal;
})();
