(function () {
  const FADE_MS = 240;
  const CROSSFADE_MS = 180;
  const RESET_TOP_OFFSET = 32;
  const BUSY_TOP_OFFSET = 32;

  function clearTimer(timerRef) {
    if (timerRef.id == null) return;
    window.clearTimeout(timerRef.id);
    timerRef.id = null;
  }

  function createBusyController(busyEl, { getTopOffset } = {}) {
    const hideTimer = { id: null };

    function isVisible() {
      return Boolean(busyEl && !busyEl.hidden && busyEl.classList.contains("is-visible"));
    }

    function syncTopOffset() {
      if (!busyEl) return;
      const offset = typeof getTopOffset === "function" ? getTopOffset() : BUSY_TOP_OFFSET;
      busyEl.style.paddingTop = `${Number.isFinite(offset) ? offset : BUSY_TOP_OFFSET}px`;
    }

    function setBusy(isBusy, { crossfade = false } = {}) {
      if (!busyEl) return;

      clearTimer(hideTimer);

      if (isBusy) {
        syncTopOffset();
        if (busyEl.classList.contains("is-visible")) return;

        busyEl.hidden = false;
        busyEl.classList.remove("is-visible");
        busyEl.classList.toggle("is-crossfade", crossfade);
        void busyEl.offsetWidth;
        busyEl.classList.add("is-visible");
        return;
      }

      if (busyEl.hidden && !busyEl.classList.contains("is-visible")) return;

      busyEl.classList.toggle("is-crossfade", crossfade);
      busyEl.classList.remove("is-visible");

      hideTimer.id = window.setTimeout(() => {
        if (!busyEl.classList.contains("is-visible")) {
          busyEl.hidden = true;
          busyEl.classList.remove("is-crossfade");
        }
        hideTimer.id = null;
      }, crossfade ? CROSSFADE_MS : FADE_MS);
    }

    return { setBusy, isVisible, syncTopOffset };
  }

  function createResetController(resetEl, {
    getMapContainer,
    topOffset = RESET_TOP_OFFSET,
    getTopOffset
  } = {}) {
    const hideTimer = { id: null };
    let positionObserver = null;

    function isVisible() {
      return Boolean(
        resetEl
        && !resetEl.hidden
        && resetEl.classList.contains("is-visible")
        && !resetEl.classList.contains("is-hiding")
      );
    }

    function resolveTopOffset() {
      if (typeof getTopOffset === "function") {
        const offset = getTopOffset();
        if (Number.isFinite(offset)) return offset;
      }
      return topOffset;
    }

    function syncPosition() {
      if (!resetEl) return;
      const mapContainer = typeof getMapContainer === "function" ? getMapContainer() : getMapContainer;
      if (!mapContainer) return;

      const rect = mapContainer.getBoundingClientRect();
      resetEl.style.top = `${rect.top + resolveTopOffset()}px`;
      resetEl.style.left = `${rect.left + (rect.width / 2)}px`;
    }

    function bindPositionSync() {
      syncPosition();
      window.addEventListener("resize", syncPosition);

      const mapContainer = typeof getMapContainer === "function" ? getMapContainer() : getMapContainer;
      if (!mapContainer || typeof ResizeObserver === "undefined") return;

      positionObserver?.disconnect();
      positionObserver = new ResizeObserver(syncPosition);
      positionObserver.observe(mapContainer);
    }

    function show({ crossfade = false } = {}) {
      if (!resetEl) return;

      clearTimer(hideTimer);

      if (resetEl.classList.contains("is-visible") && !resetEl.classList.contains("is-hiding")) {
        return;
      }

      resetEl.hidden = false;
      syncPosition();
      resetEl.classList.remove("is-hiding", "is-visible");
      resetEl.classList.toggle("is-crossfade", crossfade);
      void resetEl.offsetWidth;
      resetEl.classList.add("is-visible");
    }

    function hide({ immediate = false, crossfade = false } = {}) {
      if (!resetEl) return;

      if (immediate) {
        clearTimer(hideTimer);
        resetEl.hidden = true;
        resetEl.classList.remove("is-visible", "is-hiding", "is-crossfade");
        return;
      }

      if (resetEl.hidden || !resetEl.classList.contains("is-visible")) {
        return;
      }

      resetEl.classList.toggle("is-crossfade", crossfade);
      resetEl.classList.remove("is-visible");
      resetEl.classList.add("is-hiding");

      hideTimer.id = window.setTimeout(() => {
        resetEl.hidden = true;
        resetEl.classList.remove("is-hiding", "is-crossfade");
        hideTimer.id = null;
      }, crossfade ? CROSSFADE_MS : FADE_MS);
    }

    return {
      show,
      hide,
      isVisible,
      syncPosition,
      bindPositionSync
    };
  }

  window.WefranchMapPills = {
    FADE_MS,
    CROSSFADE_MS,
    RESET_TOP_OFFSET,
    BUSY_TOP_OFFSET,
    createBusyController,
    createResetController
  };
})();
