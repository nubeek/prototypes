/* Shared prototype toast.
   window.WefranchToast.show({
     message: "Lead added to your Leads.",
     action: { label: "View lead", href: "../leads/?lead=…" },
     duration: 5000
   });
   Action href is optional; omit it or pass onClick for a button. */
(function () {
  const DEFAULT_DURATION_MS = 5000;
  const HIDE_MS = 280;
  let host = null;
  let toastEl = null;
  let hideTimer = null;
  let hideFinishTimer = null;
  let remainingMs = DEFAULT_DURATION_MS;
  let hideStartedAt = 0;
  let paused = false;
  let lastPointerX = null;
  let lastPointerY = null;
  let pointerTrackingBound = false;

  function bindPointerTracking() {
    if (pointerTrackingBound) return;
    pointerTrackingBound = true;
    document.addEventListener("pointermove", (event) => {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    }, { passive: true });
  }

  function isPointerOverToast(toast) {
    if (!toast?.isConnected) return false;
    if (toast.matches(":hover")) return true;
    if (lastPointerX == null || lastPointerY == null) return false;
    const hit = document.elementFromPoint(lastPointerX, lastPointerY);
    return hit === toast || toast.contains(hit);
  }

  function syncPointerPause(toast) {
    if (isPointerOverToast(toast)) pauseHide();
  }

  function shouldReduceMotion() {
    return document.body.classList.contains("reduce-motion")
      || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function clearTimers() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (hideFinishTimer) {
      window.clearTimeout(hideFinishTimer);
      hideFinishTimer = null;
    }
  }

  function ensureHost() {
    if (host?.isConnected) return host;
    host = document.createElement("div");
    host.className = "proto-toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");
    document.body.append(host);
    return host;
  }

  function finishHide(toast) {
    if (toastEl !== toast) return;
    toast.removeEventListener("transitionend", toast.protoToastHideFinish);
    toast.remove();
    if (toastEl === toast) toastEl = null;
  }

  function hide(immediate = false) {
    const toast = toastEl;
    if (!toast) return;

    clearTimers();
    paused = false;
    remainingMs = 0;

    if (immediate || shouldReduceMotion() || !toast.classList.contains("is-visible")) {
      finishHide(toast);
      return;
    }

    const finish = (event) => {
      if (event && event.propertyName && event.propertyName !== "opacity") return;
      finishHide(toast);
    };
    toast.protoToastHideFinish = finish;
    toast.addEventListener("transitionend", finish);
    toast.classList.remove("is-visible");
    toast.classList.add("is-hiding");
    hideFinishTimer = window.setTimeout(() => finishHide(toast), HIDE_MS + 40);
  }

  function scheduleHide() {
    clearTimers();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return;
    hideStartedAt = Date.now();
    hideTimer = window.setTimeout(() => hide(), remainingMs);
  }

  function pauseHide() {
    if (paused) return;

    if (hideTimer) {
      paused = true;
      remainingMs = Math.max(0, remainingMs - (Date.now() - hideStartedAt));
      window.clearTimeout(hideTimer);
      hideTimer = null;
      return;
    }

    if (hideFinishTimer && toastEl) {
      paused = true;
      window.clearTimeout(hideFinishTimer);
      hideFinishTimer = null;
      toastEl.removeEventListener("transitionend", toastEl.protoToastHideFinish);
      toastEl.classList.remove("is-hiding");
      toastEl.classList.add("is-visible");
      remainingMs = HIDE_MS;
    }
  }

  function resumeHide() {
    if (!paused) return;
    paused = false;
    if (remainingMs <= 0) {
      hide();
      return;
    }
    scheduleHide();
  }

  function createAction(action) {
    if (!action?.label) return null;

    const isLink = Boolean(action.href);
    const node = document.createElement(isLink ? "a" : "button");
    node.className = "ui-link proto-toast__action";
    node.textContent = action.label;
    if (isLink) {
      node.href = action.href;
    } else {
      node.type = "button";
      if (typeof action.onClick === "function") {
        node.addEventListener("click", action.onClick);
      }
    }
    return node;
  }

  function show(options = {}) {
    const message = options.message == null ? "" : String(options.message);
    const duration = options.duration == null ? DEFAULT_DURATION_MS : Number(options.duration);
    bindPointerTracking();
    ensureHost();
    hide(true);

    const toast = document.createElement("div");
    toast.className = "proto-toast";

    const messageEl = document.createElement("span");
    messageEl.className = "proto-toast__message";
    messageEl.textContent = message;
    toast.append(messageEl);

    const actionEl = createAction(options.action);
    if (actionEl) {
      toast.append(" ");
      toast.append(actionEl);
    }

    toast.addEventListener("pointerenter", pauseHide);
    toast.addEventListener("pointerleave", resumeHide);
    toast.addEventListener("focusin", pauseHide);
    toast.addEventListener("focusout", (event) => {
      if (toast.contains(event.relatedTarget)) return;
      resumeHide();
    });

    host.replaceChildren(toast);
    toastEl = toast;
    remainingMs = Number.isFinite(duration) ? duration : 0;
    paused = false;

    window.requestAnimationFrame(() => {
      if (toastEl !== toast) return;
      toast.classList.add("is-visible");
      window.requestAnimationFrame(() => {
        if (toastEl !== toast) return;
        syncPointerPause(toast);
      });
    });

    if (remainingMs > 0) scheduleHide();
    return toast;
  }

  window.WefranchToast = { show, hide };
})();
