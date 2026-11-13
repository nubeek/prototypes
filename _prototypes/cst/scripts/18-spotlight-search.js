const CST_SPOTLIGHT_LEAVE_DURATION_MS = 160;
const CST_SPOTLIGHT_DATASET_VIEWS = ["franchisees", "candidates"];

const cstSpotlight = document.getElementById("cstSpotlight");
const cstSpotlightInput = document.getElementById("cstSpotlightSearchInput");
const cstSpotlightDatasets = document.getElementById("cstSpotlightDatasets");
let cstSpotlightController = null;
let cstSpotlightReturnFocus = null;
let cstSpotlightHideTimer = 0;
let cstSpotlightDatasetScope = "";
let cstSpotlightDatasetsHideTimer = 0;
let cstSpotlightDatasetsShowTimer = 0;
let cstSpotlightDatasetsFrame = 0;
const CST_SPOTLIGHT_DATASETS_MOTION_MS = 240;
const CST_SPOTLIGHT_DATASETS_SHOW_DELAY_MS = 350;

function setCstSpotlightFeedback(message = "") {
  const feedback = document.getElementById("cstSpotlightFeedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.hidden = !message;
}

function isCstSpotlightOpen() {
  return Boolean(cstSpotlight && !cstSpotlight.hidden && cstSpotlight.classList.contains("is-open"));
}

function getCstSpotlightDatasetScope() {
  return cstSpotlightDatasetScope;
}

function spotlightSupportsDatasetSwitch() {
  return CST_SPOTLIGHT_DATASET_VIEWS.includes(currentTableView);
}

function revealCstSpotlightDatasets(frame) {
  cstSpotlightDatasets.hidden = false;
  cstSpotlightDatasets.setAttribute("aria-hidden", "false");
  // Let the collapsed state paint so the expand transition can run.
  void cstSpotlightDatasets.offsetWidth;
  requestAnimationFrame(() => {
    if (frame !== cstSpotlightDatasetsFrame || cstSpotlightDatasets.hidden) return;
    cstSpotlightDatasets.classList.add("is-shown");
  });
}

function setCstSpotlightDatasetsShown(show) {
  if (!cstSpotlightDatasets) return;

  const supported = spotlightSupportsDatasetSwitch();

  if (!supported || !show) {
    window.clearTimeout(cstSpotlightDatasetsShowTimer);
    cstSpotlightDatasetsShowTimer = 0;
    window.clearTimeout(cstSpotlightDatasetsHideTimer);
    cstSpotlightDatasetsFrame += 1;

    cstSpotlightDatasets.classList.remove("is-shown");
    cstSpotlightDatasets.setAttribute("aria-hidden", "true");

    if (!supported) {
      cstSpotlightDatasets.hidden = true;
      return;
    }

    cstSpotlightDatasetsHideTimer = window.setTimeout(() => {
      if (!cstSpotlightDatasets.classList.contains("is-shown")) {
        cstSpotlightDatasets.hidden = true;
      }
    }, getMotionDelay(CST_SPOTLIGHT_DATASETS_MOTION_MS));
    return;
  }

  const alreadyVisible = !cstSpotlightDatasets.hidden && cstSpotlightDatasets.classList.contains("is-shown");
  if (alreadyVisible || cstSpotlightDatasetsShowTimer) return;

  window.clearTimeout(cstSpotlightDatasetsHideTimer);
  const frame = ++cstSpotlightDatasetsFrame;
  cstSpotlightDatasetsShowTimer = window.setTimeout(() => {
    cstSpotlightDatasetsShowTimer = 0;
    if (frame !== cstSpotlightDatasetsFrame) return;
    revealCstSpotlightDatasets(frame);
  }, CST_SPOTLIGHT_DATASETS_SHOW_DELAY_MS);
}

function syncCstSpotlightDatasetSwitch() {
  const supported = spotlightSupportsDatasetSwitch();
  const showTabs = supported && cstQueryMatchesPeopleInBothDatasets(cstSpotlightInput?.value || "");

  if (!cstSpotlightDatasets) return;

  if (!supported || !showTabs) {
    const scopeDrifted = Boolean(cstSpotlightDatasetScope) && cstSpotlightDatasetScope !== currentTableView;
    cstSpotlightDatasetScope = supported ? currentTableView : "";
    setCstSpotlightDatasetsShown(false);
    // A pill may have been previewing the other dataset. Once the tabs go
    // away, suggestions follow the dataset that is actually open.
    if (scopeDrifted) cstSpotlightController?.refresh?.();
    return;
  }

  if (!CST_SPOTLIGHT_DATASET_VIEWS.includes(cstSpotlightDatasetScope)) {
    cstSpotlightDatasetScope = currentTableView;
  }

  cstSpotlightDatasets.querySelectorAll("[data-dataset]").forEach((button) => {
    const active = button.dataset.dataset === cstSpotlightDatasetScope;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  setCstSpotlightDatasetsShown(true);
}

function selectCstSpotlightDataset(view) {
  if (!CST_SPOTLIGHT_DATASET_VIEWS.includes(view) || view === cstSpotlightDatasetScope) return;

  cstSpotlightDatasetScope = view;
  syncCstSpotlightDatasetSwitch();
  cstSpotlightController?.refresh?.();
  cstSpotlightInput?.focus({ preventScroll: true });
}

function openCstSpotlight() {
  if (!cstSpotlight || !cstSpotlightController || isCstSpotlightOpen()) return;

  window.clearTimeout(cstSpotlightHideTimer);
  cstSpotlightReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  closeToolbarDropdowns();
  closeToolbarTabDropdowns();
  cstSpotlightController.reset();
  cstSpotlightDatasetScope = spotlightSupportsDatasetSwitch() ? currentTableView : "";
  syncCstSpotlightDatasetSwitch();

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
  const scope = cstSpotlightDatasetScope;
  const switchingDataset = Boolean(scope && scope !== currentTableView);
  rememberCstRecentSearch(item);
  closeCstSpotlight({ restoreFocus: false });

  // Adding a filter leaves a saved search. Exit read mode so the new value
  // can land in the sidebar, but keep the search itself.
  if (readerModeActive) {
    exitReaderMode();
  }

  // A pick from the other dataset pill starts a fresh query in that dataset.
  if (switchingDataset) {
    clearCstSavedSearchSession({ persist: false });
    setFilterPanelOpen(true);
    applyCstSplashQuery(filters || {}, { view: scope });
    revealCstAppliedFilter(item);
    return;
  }

  if (item?.type === "text") {
    setFilterPanelOpen(true);
    setSearchQuery(item.label || filters?.search, { refresh: true, excluded: [] });
    revealCstAppliedFilter(item);
    return;
  }

  // Prospect people share the Contacts name filter with the sidebar field.
  if (item?.type === "person" && isProspectTableView(item.view)) {
    setFilterPanelOpen(true);
    addContactName(item.filters?.contactNames?.[0] || item.label);
    revealCstAppliedFilter(item);
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
    getIdleSuggestions: () => getCstRecentSearchSuggestions({ view: getCstSearchDatasetView() }),
    onSearch: runCstSpotlightSearch,
    onLocate() {
      closeCstSpotlight({ restoreFocus: false });
      if (readerModeActive) exitReaderMode();
      locateUserFromFilters();
    },
    onEscape() {
      closeCstSpotlight();
      return true;
    },
    onQueryChange() {
      syncCstSpotlightDatasetSwitch();
    }
  });

  cstSpotlightDatasets?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dataset]");
    if (!button || !cstSpotlightDatasets.contains(button)) return;
    event.preventDefault();
    selectCstSpotlightDataset(button.dataset.dataset);
  });

  cstSpotlightDatasets?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const buttons = [...cstSpotlightDatasets.querySelectorAll("[data-dataset]")];
    const currentIndex = buttons.findIndex((button) => button.dataset.dataset === cstSpotlightDatasetScope);
    if (currentIndex === -1) return;
    const nextIndex = event.key === "ArrowRight"
      ? Math.min(currentIndex + 1, buttons.length - 1)
      : Math.max(currentIndex - 1, 0);
    event.preventDefault();
    selectCstSpotlightDataset(buttons[nextIndex].dataset.dataset);
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
