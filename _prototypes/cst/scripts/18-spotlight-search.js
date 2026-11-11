const CST_SPOTLIGHT_LEAVE_DURATION_MS = 160;

const cstSpotlight = document.getElementById("cstSpotlight");
const cstSpotlightInput = document.getElementById("cstSpotlightSearchInput");
let cstSpotlightController = null;
let cstSpotlightReturnFocus = null;
let cstSpotlightHideTimer = 0;

function setCstSpotlightFeedback(message = "") {
  const feedback = document.getElementById("cstSpotlightFeedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.hidden = !message;
}

function isCstSpotlightOpen() {
  return Boolean(cstSpotlight && !cstSpotlight.hidden && cstSpotlight.classList.contains("is-open"));
}

function openCstSpotlight() {
  if (!cstSpotlight || !cstSpotlightController || isCstSpotlightOpen()) return;

  window.clearTimeout(cstSpotlightHideTimer);
  cstSpotlightReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  closeToolbarDropdowns();
  closeToolbarTabDropdowns();
  cstSpotlightController.reset();

  cstSpotlight.hidden = false;
  cstSpotlightController.focus();
  cstSpotlightController.showIdleSuggestions();
  requestAnimationFrame(() => cstSpotlight.classList.add("is-open"));
}

function closeCstSpotlight({ restoreFocus = true } = {}) {
  if (!cstSpotlight || cstSpotlight.hidden) return;

  cstSpotlight.classList.remove("is-open");
  window.clearTimeout(cstSpotlightHideTimer);
  hideCstSplashSearchFloatingTooltip();

  // Focus stays in the input until the fade ends; blurring it early would
  // collapse the suggestion list mid-fade.
  cstSpotlightHideTimer = window.setTimeout(() => {
    cstSpotlight.hidden = true;
    cstSpotlightController?.reset();

    const returnTarget = cstSpotlightReturnFocus;
    cstSpotlightReturnFocus = null;
    if (restoreFocus && returnTarget?.isConnected) {
      returnTarget.focus({ preventScroll: true });
    } else if (cstSpotlight.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, getMotionDelay(CST_SPOTLIGHT_LEAVE_DURATION_MS));
}

// Called by the toolbar search button and Cmd+K. Returns true when the
// spotlight handled the request, so the filter sidebar search stays closed.
function handleCstSpotlightOpenRequest() {
  if (isCstSplashOpen()) {
    focusCstSplashSearchInput();
    return true;
  }

  if (isCstSpotlightOpen()) {
    closeCstSpotlight();
  } else {
    openCstSpotlight();
  }
  return true;
}

function runCstSpotlightSearch(filters, item) {
  rememberCstRecentSearch(item);
  closeCstSpotlight({ restoreFocus: false });

  // Adding a filter leaves a saved search. Exit read mode so the new value
  // can land in the sidebar, but keep the search itself.
  if (readerModeActive) {
    exitReaderMode();
  }

  if (item?.type === "text") {
    setFilterPanelOpen(true);
    setSearchQuery(item.label || filters?.search, { refresh: true, excluded: [] });
    return;
  }

  applyCstQuickSearchSuggestion(item);
  persistViewSettings();
}

function bindCstSpotlight() {
  if (!cstSpotlight) return;

  cstSpotlightController = createCstSearchField({
    form: document.getElementById("cstSpotlightSearch"),
    input: cstSpotlightInput,
    suggestions: document.getElementById("cstSpotlightSearchSuggestions"),
    clearButton: document.getElementById("cstSpotlightSearchClear"),
    locateButton: document.getElementById("cstSpotlightLocate"),
    suggestionIdPrefix: "cstSpotlightSearchSuggestion",
    setFeedback: setCstSpotlightFeedback,
    getIdleSuggestions: getCstRecentSearchSuggestions,
    onSearch: runCstSpotlightSearch,
    onLocate() {
      closeCstSpotlight({ restoreFocus: false });
      if (readerModeActive) exitReaderMode();
      locateUserFromFilters();
    },
    onEscape() {
      closeCstSpotlight();
      return true;
    }
  });

  const panel = cstSpotlight.querySelector(".cst-spotlight__panel");

  // Clicks on the panel chrome (headings, padding) keep focus in the input.
  panel?.addEventListener("mousedown", (event) => {
    if (event.target !== cstSpotlightInput) event.preventDefault();
  });

  document.addEventListener("mousedown", (event) => {
    if (!isCstSpotlightOpen()) return;
    if (panel?.contains(event.target) || toolbarSearchBtn?.contains(event.target)) return;
    closeCstSpotlight({ restoreFocus: false });
  });

  cstSpotlight.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !cstSpotlight.contains(event.relatedTarget)) {
      closeCstSpotlight({ restoreFocus: false });
    }
  });

}

window.cstSpotlightSearch = {
  close: closeCstSpotlight,
  handleOpenRequest: handleCstSpotlightOpenRequest,
  open: openCstSpotlight
};

bindCstSpotlight();
