const START_CAMPAIGN_AUDIENCE_CURRENT = "current";
const START_CAMPAIGN_AUDIENCE_SAVED = "saved";
const START_CAMPAIGN_AUDIENCE_OPTIONS = [
  { label: "Current search", value: START_CAMPAIGN_AUDIENCE_CURRENT },
  { label: "Saved searches", value: START_CAMPAIGN_AUDIENCE_SAVED }
];

const startCampaignModal = document.getElementById("startCampaignModal");
const startCampaignModalForm = document.getElementById("startCampaignModalForm");
const startCampaignOption = document.getElementById("startCampaignOption");
const startCampaignAudience = document.getElementById("startCampaignAudience");
const startCampaignAudienceField = document.getElementById("startCampaignAudienceField");
const startCampaignAudienceInput = document.getElementById("startCampaignAudienceInput");
const startCampaignAudienceOptions = document.getElementById("startCampaignAudienceOptions");
const startCampaignSavedSearch = document.getElementById("startCampaignSavedSearch");
const startCampaignSavedSearchSelector = document.getElementById("startCampaignSavedSearchSelector");
const startCampaignSavedSearchField = document.getElementById("startCampaignSavedSearchField");
const startCampaignSavedSearchInput = document.getElementById("startCampaignSavedSearchInput");
const startCampaignSavedSearchClear = document.getElementById("startCampaignSavedSearchClear");
const startCampaignSavedSearchOptions = document.getElementById("startCampaignSavedSearchOptions");
const startCampaignPreview = document.getElementById("startCampaignPreview");
const startCampaignPreviewTitle = document.getElementById("startCampaignPreviewTitle");
const startCampaignPreviewCount = document.getElementById("startCampaignPreviewCount");
const startCampaignContinue = document.getElementById("startCampaignContinue");

let startCampaignAudienceApi = null;
let startCampaignSavedSearchApi = null;
let startCampaignDraft = null;

function closeStartCampaignDropdowns() {
  startCampaignAudienceApi?.close();
  startCampaignSavedSearchApi?.close();
}

function isStartCampaignDropdownOpen() {
  return Boolean(
    startCampaignAudienceField?.classList.contains("is-open")
    || startCampaignSavedSearchField?.classList.contains("is-open")
  );
}

function initStartCampaignDropdown({
  field,
  input,
  clearButton = null,
  optionsContainer,
  getOptions,
  placeholder = "Select...",
  searchable = true,
  clearable = true,
  optionIdPrefix,
  emptyText = "No results found",
  onOpen = null,
  onChange = null
}) {
  if (!field || !input || !optionsContainer) return null;

  const menu = field.querySelector(".dropdown-menu");
  let isOpen = false;
  let searchQuery = "";
  let activeOptionIndex = -1;
  let renderedOptions = [];
  let selectedValue = "";

  function normalizeQuery(value) {
    return (window.normalizeComboboxText || ((text) => String(text || "").trim().toLocaleLowerCase()))(value);
  }

  function getSelectedOption() {
    return getOptions().find((option) => option.value === selectedValue) || null;
  }

  function syncInputDisplay() {
    const selectedOption = getSelectedOption();
    const hasSelection = Boolean(selectedOption);

    input.dataset.value = selectedValue;
    field.classList.toggle("has-selection", hasSelection);
    if (clearButton) {
      clearButton.hidden = !clearable || !hasSelection;
    }

    if (selectedOption) {
      input.value = selectedOption.label;
      input.placeholder = "";
    } else {
      input.value = "";
      input.placeholder = placeholder;
    }
  }

  function setActiveOption(index) {
    const optionButtons = Array.from(optionsContainer.querySelectorAll(".dropdown-option"));
    if (!optionButtons.length) {
      activeOptionIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }

    activeOptionIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeOptionIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive) {
        input.setAttribute("aria-activedescendant", optionButton.id);
        optionButton.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function selectValue(value) {
    selectedValue = value;
    syncInputDisplay();
    onChange?.(selectedValue);
  }

  function renderOptions() {
    const allOptions = getOptions();
    const normalizedQuery = searchable ? normalizeQuery(searchQuery) : "";
    renderedOptions = allOptions.filter((option) => (
      !normalizedQuery || normalizeQuery(option.label).includes(normalizedQuery)
    ));

    optionsContainer.replaceChildren();

    if (!renderedOptions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "dropdown-empty";
      emptyState.textContent = allOptions.length ? emptyText : "No saved searches";
      optionsContainer.append(emptyState);
      activeOptionIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }

    renderedOptions.forEach((option, index) => {
      const optionButton = document.createElement("button");
      const optionLabel = document.createElement("span");
      const optionCheck = document.createElement("img");
      const isSelected = option.value === selectedValue;

      optionButton.type = "button";
      optionButton.className = "ui-menu-item toolbar-dropdown-option dropdown-option";
      optionButton.id = `${optionIdPrefix}-${index}`;
      optionButton.dataset.value = option.value;
      optionButton.setAttribute("role", "option");
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", String(isSelected));

      optionLabel.className = "toolbar-dropdown-label";
      optionLabel.textContent = option.label;

      optionCheck.className = "dropdown-option-check";
      optionCheck.src = "assets/check.svg";
      optionCheck.alt = "";
      optionCheck.setAttribute("aria-hidden", "true");

      optionButton.append(optionLabel, optionCheck);
      optionButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      optionButton.addEventListener("click", () => {
        selectValue(option.value);
        close({ restoreDisplay: true });
        input.blur();
      });

      optionsContainer.append(optionButton);
    });

    if (activeOptionIndex >= renderedOptions.length) {
      activeOptionIndex = -1;
    }

    if (activeOptionIndex >= 0) {
      setActiveOption(activeOptionIndex);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function open() {
    if (isOpen) return;

    isOpen = true;
    searchQuery = "";
    onOpen?.();
    field.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");

    if (searchable) {
      input.value = "";
    }

    renderOptions();
    input.focus({ preventScroll: true });
  }

  function close({ restoreDisplay = true } = {}) {
    if (!isOpen) return;

    isOpen = false;
    searchQuery = "";
    activeOptionIndex = -1;
    field.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");

    if (restoreDisplay) {
      syncInputDisplay();
    }
  }

  function reset(value = "") {
    close({ restoreDisplay: false });
    selectedValue = value;
    syncInputDisplay();
  }

  input.readOnly = !searchable;

  input.addEventListener("focus", () => {
    if (!searchable) return;
    open();
  });

  input.addEventListener("mousedown", (event) => {
    if (searchable) return;

    event.preventDefault();
    if (isOpen) {
      close({ restoreDisplay: true });
      input.blur();
      return;
    }

    open();
  });

  if (searchable) {
    input.addEventListener("input", () => {
      searchQuery = input.value;
      if (!isOpen) {
        open();
        return;
      }
      renderOptions();
    });
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
        if (renderedOptions.length) {
          setActiveOption(event.key === "ArrowDown" ? 0 : renderedOptions.length - 1);
        }
        return;
      }
      setActiveOption(activeOptionIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || activeOptionIndex < 0) return;
      event.preventDefault();
      selectValue(renderedOptions[activeOptionIndex].value);
      close({ restoreDisplay: true });
      input.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreDisplay: true });
      input.blur();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => close({ restoreDisplay: true }), 100);
  });

  if (clearButton) {
    clearButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    clearButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectValue("");
      close({ restoreDisplay: true });
    });
  }

  field.addEventListener("mousedown", (event) => {
    if (
      event.target === input
      || menu?.contains(event.target)
      || clearButton?.contains(event.target)
    ) {
      return;
    }

    const wasOpen = isOpen;
    event.preventDefault();

    if (wasOpen) {
      close({ restoreDisplay: true });
      input.blur();
    } else {
      open();
    }
  });

  syncInputDisplay();

  return {
    close,
    reset,
    getValue: () => selectedValue,
    setValue(value) {
      selectedValue = value;
      syncInputDisplay();
    },
    refresh: syncInputDisplay
  };
}

function formatStartCampaignContactCount(count) {
  const value = Number(count) || 0;
  return `${value.toLocaleString("en-US")} ${value === 1 ? "contact" : "contacts"}`;
}

function getCurrentSearchAudience() {
  const savedTitle = readerModeActive ? readerModeSavedSearchTitle : null;
  const title = String(
    savedTitle
    || getSuggestedSavedViewTitle?.()
    || getSavedViewEntityTitle?.()
    || "Current search"
  ).trim();
  const matchedOwners = typeof getFilteredFranchisees === "function"
    ? getFilteredFranchisees()
    : [];
  const contactCount = matchedOwners.reduce((total, owner) => (
    total + (typeof getOwnerContactCount === "function" ? getOwnerContactCount(owner) : 0)
  ), 0);

  return {
    audience: START_CAMPAIGN_AUDIENCE_CURRENT,
    savedSearchId: activeSavedSearchId || null,
    title,
    contactCount
  };
}

function getUserSavedSearches() {
  const searches = window.cstSplash?.getSavedSearches?.()
    || (Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : []);
  const userSearches = [];
  const sharedSearches = [];

  searches.forEach((search) => {
    if (window.cstSavedSearchStore?.canEdit?.(search.id)) {
      userSearches.push(search);
    } else {
      sharedSearches.push(search);
    }
  });

  return [...userSearches, ...sharedSearches];
}

function getSavedSearchAudience(searchId) {
  const savedSearch = getSavedSearchById?.(searchId)
    || getUserSavedSearches().find((search) => search.id === searchId)
    || null;
  if (!savedSearch) return null;

  const matches = window.cstSplash?.getMatchCounts?.(savedSearch) || {};

  return {
    audience: START_CAMPAIGN_AUDIENCE_SAVED,
    savedSearchId: savedSearch.id,
    title: savedSearch.title,
    contactCount: Number.isFinite(matches.contactCount) ? matches.contactCount : 0
  };
}

function hideStartCampaignPreview() {
  startCampaignPreview?.setAttribute("hidden", "");
  if (startCampaignPreviewTitle) startCampaignPreviewTitle.textContent = "";
  if (startCampaignPreviewCount) startCampaignPreviewCount.textContent = "";
}

function renderStartCampaignPreview(preview) {
  if (!preview?.title) {
    hideStartCampaignPreview();
    return;
  }

  if (startCampaignPreviewTitle) startCampaignPreviewTitle.textContent = preview.title;
  if (startCampaignPreviewCount) {
    startCampaignPreviewCount.textContent = formatStartCampaignContactCount(preview.contactCount);
  }
  startCampaignPreview?.removeAttribute("hidden");
}

function syncStartCampaignContinue(canContinue) {
  if (!startCampaignContinue) return;
  startCampaignContinue.disabled = !canContinue;
}

function syncStartCampaignAudienceState() {
  const audience = startCampaignAudienceApi?.getValue() || START_CAMPAIGN_AUDIENCE_CURRENT;
  const isSaved = audience === START_CAMPAIGN_AUDIENCE_SAVED;

  if (isSaved) {
    startCampaignSavedSearch?.removeAttribute("hidden");
    const savedSearchId = startCampaignSavedSearchApi?.getValue() || "";
    const preview = savedSearchId ? getSavedSearchAudience(savedSearchId) : null;
    startCampaignDraft = preview;
    renderStartCampaignPreview(preview);
    syncStartCampaignContinue(Boolean(preview));
    return;
  }

  startCampaignSavedSearch?.setAttribute("hidden", "");
  startCampaignSavedSearchApi?.reset("");
  startCampaignDraft = getCurrentSearchAudience();
  renderStartCampaignPreview(startCampaignDraft);
  syncStartCampaignContinue(true);
}

function resetStartCampaignModal() {
  closeStartCampaignDropdowns();
  startCampaignAudienceApi?.reset(START_CAMPAIGN_AUDIENCE_CURRENT);
  startCampaignSavedSearchApi?.reset("");
  startCampaignDraft = null;
  syncStartCampaignAudienceState();
}

const startCampaignModalApi = window.createProtoModal({
  overlay: startCampaignModal,
  closeSelectors: ".proto-modal-close, .proto-modal-cancel",
  onBeforeClose() {
    closeStartCampaignDropdowns();
  },
  onClose() {
    resetStartCampaignModal();
  },
  shouldCloseOnEscape() {
    if (isStartCampaignDropdownOpen()) {
      closeStartCampaignDropdowns();
      return false;
    }
    return true;
  },
  getFocusElement() {
    return startCampaignModal?.querySelector(".proto-modal-close");
  }
});

function closeStartCampaignModal() {
  startCampaignModalApi.close();
}

function openStartCampaignModal(trigger = null) {
  if (!startCampaignModal) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");
  resetStartCampaignModal();
  startCampaignModalApi.open(trigger);
}

startCampaignAudienceApi = initStartCampaignDropdown({
  field: startCampaignAudienceField,
  input: startCampaignAudienceInput,
  optionsContainer: startCampaignAudienceOptions,
  getOptions: () => START_CAMPAIGN_AUDIENCE_OPTIONS,
  placeholder: "Select...",
  searchable: false,
  clearable: false,
  optionIdPrefix: "startCampaignAudienceOption",
  onOpen() {
    startCampaignSavedSearchApi?.close();
  },
  onChange() {
    syncStartCampaignAudienceState();
  }
});

startCampaignSavedSearchApi = initStartCampaignDropdown({
  field: startCampaignSavedSearchField,
  input: startCampaignSavedSearchInput,
  clearButton: startCampaignSavedSearchClear,
  optionsContainer: startCampaignSavedSearchOptions,
  getOptions: () => getUserSavedSearches().map((search) => ({
    label: search.title,
    value: search.id
  })),
  placeholder: "Select...",
  searchable: true,
  clearable: true,
  optionIdPrefix: "startCampaignSavedSearchOption",
  emptyText: "No saved searches",
  onOpen() {
    startCampaignAudienceApi?.close();
  },
  onChange() {
    syncStartCampaignAudienceState();
  }
});

startCampaignOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openStartCampaignModal(startCampaignOption);
});

startCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (startCampaignContinue?.disabled) return;

  const audience = startCampaignAudienceApi?.getValue() || START_CAMPAIGN_AUDIENCE_CURRENT;
  const draft = audience === START_CAMPAIGN_AUDIENCE_SAVED
    ? getSavedSearchAudience(startCampaignSavedSearchApi?.getValue())
    : getCurrentSearchAudience();

  if (!draft) return;

  window.cstCampaignDraft = draft;
  closeStartCampaignModal();
});

window.addEventListener("cst:saved-searches-changed", () => {
  if (!startCampaignModalApi.isVisible()) return;
  startCampaignSavedSearchApi?.refresh();
  syncStartCampaignAudienceState();
});

window.cstStartCampaignModal = {
  close: closeStartCampaignModal,
  isVisible: () => startCampaignModalApi.isVisible(),
  open: openStartCampaignModal
};
