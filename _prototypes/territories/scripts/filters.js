const TERRITORY_SETTINGS_STORAGE_KEY = "wefranch-territories-settings";
const INVESTMENT_HISTOGRAM_BINS = 24;
const filterComboboxes = new Map();
let territorySettingsReadyToPersist = false;
let isRestoringTerritorySettings = false;
const savedTerritorySettings = readSavedTerritorySettings();

function readSavedTerritorySettings() {
  try {
    const savedValue = window.localStorage?.getItem(TERRITORY_SETTINGS_STORAGE_KEY);
    if (!savedValue) return null;
    const parsedValue = JSON.parse(savedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
  } catch (error) {
    console.warn("Unable to read saved territory settings.", error);
    return null;
  }
}

function writeSavedTerritorySettings(settings) {
  try {
    window.localStorage?.setItem(TERRITORY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Unable to save territory settings.", error);
  }
}

function persistTerritorySettings() {
  if (!territorySettingsReadyToPersist || isRestoringTerritorySettings) return;
  writeSavedTerritorySettings(getCurrentTerritorySettings());
}

function getSavedStringArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function getFilterSectionStorageKey(section, index) {
  const label = section.querySelector(".filter-section-title span")?.textContent?.trim();
  return label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `section-${index}`;
}

function getFilterSectionSettings() {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return {};

  return Array.from(filterPanel.querySelectorAll(".filter-section"))
    .reduce((settings, section, index) => {
      settings[getFilterSectionStorageKey(section, index)] = section.classList.contains("filter-section-collapsed");
      return settings;
    }, {});
}

function getCurrentTerritorySettings() {
  const shell = document.querySelector(".territory-shell");
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);
  const ratingRange = getTerritoryFilterRangeValues(ratingSection);

  return {
    version: 1,
    filters: {
      open: Boolean(shell?.classList.contains("is-filter-open")),
      sections: getFilterSectionSettings(),
      locations: getFilterSelectValues(locationFilterSelect),
      categories: {
        included: getFilterSelectIncludedValues(categoryFilterSelect),
        excluded: getFilterSelectExcludedValues(categoryFilterSelect)
      },
      franchises: {
        included: getFilterSelectIncludedValues(franchiseFilterSelect),
        excluded: getFilterSelectExcludedValues(franchiseFilterSelect)
      },
      statuses: statusCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value),
      investment: {
        min: Math.min(investmentRange.min, investmentRange.max),
        max: Math.max(investmentRange.min, investmentRange.max)
      },
      rating: {
        min: Math.min(ratingRange.min, ratingRange.max),
        max: Math.max(ratingRange.min, ratingRange.max)
      },
      search: searchInput?.value.trim() || ""
    },
    settings: {
      brandLogos: document.getElementById("territoryBrandLogosToggleOption")?.getAttribute("aria-checked") === "true",
      borders: document.getElementById("territoryBordersToggleOption")?.getAttribute("aria-checked") === "true",
      blend: document.getElementById("territoryBlendToggleOption")?.getAttribute("aria-checked") === "true"
    }
  };
}

function getValidSavedSelectValues(select, values) {
  if (!select) return [];
  const validValues = new Set(
    Array.from(select.options)
      .map((option) => option.value)
      .filter(Boolean)
  );

  return getSavedStringArray(values).filter((value) => validValues.has(value));
}

function setFilterSelectIncludedExcludedValues(select, includedValues = [], excludedValues = []) {
  if (!select) return;

  const includedValueSet = new Set(includedValues.map(String));
  const excludedValueSet = new Set(excludedValues.map(String));

  Array.from(select.options).forEach((option) => {
    const isIncluded = includedValueSet.has(option.value);
    const isExcluded = excludedValueSet.has(option.value);
    option.selected = Boolean(option.value) && (isIncluded || isExcluded);

    if (isExcluded) {
      option.dataset.exclude = "true";
    } else {
      delete option.dataset.exclude;
    }
  });
}

function isCurrencyNumberInput(input) {
  return input?.classList.contains("filter-number-input--currency");
}

function parseCurrencyInputValue(value) {
  if (value == null || value === "") {
    return NaN;
  }

  const normalized = String(value).replace(/[^\d]/g, "");
  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

function formatCurrencyInputValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function getFilterNumberInputValue(input) {
  if (!input) {
    return 0;
  }

  if (isCurrencyNumberInput(input)) {
    const parsed = parseCurrencyInputValue(input.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setFilterNumberInputDisplay(input, value) {
  if (!input) {
    return;
  }

  if (isCurrencyNumberInput(input)) {
    input.value = formatCurrencyInputValue(value);
    return;
  }

  input.value = String(value);
}

function setTerritoryFilterRangeValues(section, min, max) {
  const track = section?.querySelector(".filter-range-slider");
  const minRange = track?.querySelector(".range-input-min");
  const maxRange = track?.querySelector(".range-input-max");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  if (!track || !minRange || !maxRange) return;

  const clamp = (value, floor, ceiling) => Math.min(ceiling, Math.max(floor, value));
  const rangeMin = Number(minRange.min);
  const rangeMax = Number(maxRange.max);
  const minValue = clamp(Number(min), rangeMin, rangeMax);
  const maxValue = clamp(Number(max), rangeMin, rangeMax);

  minRange.value = String(minValue);
  maxRange.value = String(maxValue);
  setFilterNumberInputDisplay(numberInputs[0], minValue);
  setFilterNumberInputDisplay(numberInputs[1], maxValue);
  syncRangeTrack(track);
}

function restoreFilterSectionState(sectionSettings = {}) {
  const filterPanel = document.querySelector(".territory-filter-panel");
  if (!filterPanel) return;

  Array.from(filterPanel.querySelectorAll(".filter-section")).forEach((section, index) => {
    const savedCollapsed = sectionSettings[getFilterSectionStorageKey(section, index)];
    if (typeof savedCollapsed !== "boolean") return;
    section.classList.toggle("filter-section-collapsed", savedCollapsed);
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(!savedCollapsed));
  });
}

function setFilterPanelOpen(isOpen) {
  const shell = document.querySelector(".territory-shell");
  const filterPanel = document.querySelector(".territory-filter-panel");
  const filterToggle = document.getElementById("territoryFilterToggle");
  if (!shell || !filterToggle) return;

  shell.classList.toggle("is-filter-open", Boolean(isOpen));
  filterToggle.classList.toggle("is-active", Boolean(isOpen));
  filterToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  filterPanel?.setAttribute("aria-hidden", String(!isOpen));
}

function restoreSavedFilterSelections(settings) {
  const filters = settings?.filters || {};
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const savedStatuses = new Set(getSavedStringArray(filters.statuses));

  setFilterSelectValues(
    locationFilterSelect,
    getValidSavedSelectValues(locationFilterSelect, filters.locations)
  );
  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included),
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included),
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded)
  );

  statusCheckboxes.forEach((checkbox) => {
    checkbox.checked = savedStatuses.has(checkbox.value);
    setFilterCheckboxState(checkbox, checkbox.checked);
  });

  if (investmentSection) {
    const investmentTrack = investmentSection.querySelector(".filter-range-slider");
    const investmentMinRange = investmentTrack?.querySelector(".range-input-min");
    const investmentMaxRange = investmentTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      investmentSection,
      filters.investment?.min ?? Number(investmentMinRange?.min ?? 0),
      filters.investment?.max ?? Number(investmentMaxRange?.max ?? 0)
    );
  }

  if (ratingSection) {
    const ratingTrack = ratingSection.querySelector(".filter-range-slider");
    const ratingMinRange = ratingTrack?.querySelector(".range-input-min");
    const ratingMaxRange = ratingTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      ratingSection,
      filters.rating?.min ?? Number(ratingMinRange?.min ?? 0),
      filters.rating?.max ?? Number(ratingMaxRange?.max ?? 0)
    );
  }

  if (searchInput && typeof filters.search === "string") {
    searchInput.value = filters.search;
    const searchField = searchInput.closest(".toolbar-search-btn");
    const searchClear = document.getElementById("territorySearchClear");
    const hasQuery = filters.search.length > 0;
    searchField?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  }

  restoreFilterSectionState(filters.sections);
  syncFilterComboboxes();
}

function restoreSelectFiltersFromSaved(settings) {
  if (!settings) return;

  const filters = settings.filters || {};
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");

  setFilterSelectValues(
    locationFilterSelect,
    getValidSavedSelectValues(locationFilterSelect, filters.locations)
  );
  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.included),
    getValidSavedSelectValues(categoryFilterSelect, filters.categories?.excluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.included),
    getValidSavedSelectValues(franchiseFilterSelect, filters.franchises?.excluded)
  );

  syncFilterComboboxes();
}

function applySavedMapSettings(settings = savedTerritorySettings) {
  const mapSettings = settings?.settings;
  if (!mapSettings) return;

  window.territoryMapControls?.setTerritoryBrandLogosVisible?.(mapSettings.brandLogos !== false);
  window.territoryMapControls?.setTerritoryBordersVisible?.(mapSettings.borders !== false);
  window.territoryMapControls?.setTerritoryBlendEnabled?.(Boolean(mapSettings.blend));
}

function restoreSavedTerritorySettings() {
  isRestoringTerritorySettings = true;

  try {
    if (!savedTerritorySettings) return;

    if (typeof savedTerritorySettings.filters?.open === "boolean") {
      setFilterPanelOpen(savedTerritorySettings.filters.open);
    }

    restoreFilterSectionState(savedTerritorySettings.filters?.sections);
  } finally {
    isRestoringTerritorySettings = false;
  }
}

function setFilterCheckboxState(checkbox, isChecked) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", isChecked);
}

function normalizeComboboxText(value) {
  return value.trim().toLocaleLowerCase();
}

function getComboboxPlaceholder(select) {
  const placeholderOption = Array.from(select.options).find((option) => option.value === "");
  const placeholderText = placeholderOption?.textContent?.trim();

  if (placeholderText) {
    return placeholderText.replace(/\.\.\.$/, "");
  }

  return select.getAttribute("aria-label") || "Select option";
}

function getComboboxOptions(select) {
  return Array.from(select.options)
    .filter((option) => option.value !== "")
    .map((option) => ({
      label: option.textContent.trim(),
      value: option.value
    }));
}

function getFilterSelectValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected)
    .map((option) => option.value);
}

function getFilterSelectIncludedValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected && option.dataset.exclude !== "true")
    .map((option) => option.value);
}

function getFilterSelectExcludedValues(select) {
  if (!select) return [];

  return Array.from(select.options)
    .filter((option) => option.value && option.selected && option.dataset.exclude === "true")
    .map((option) => option.value);
}

function setFilterSelectValues(select, values) {
  if (!select) return;

  const selectedValueSet = new Set(values.map(String));
  Array.from(select.options).forEach((option) => {
    option.selected = Boolean(option.value) && selectedValueSet.has(option.value);
    if (!option.selected) {
      delete option.dataset.exclude;
    }
  });
}

function enhanceFilterCombobox(select, { allowExclude = false } = {}) {
  const field = select.closest(".filter-select-field");
  if (!field) return null;
  if (filterComboboxes.has(select)) return filterComboboxes.get(select);

  const placeholder = getComboboxPlaceholder(select);
  const control = document.createElement("div");
  const chips = document.createElement("div");
  const input = document.createElement("input");
  const clearButton = document.createElement("button");
  const menu = document.createElement("div");
  const menuList = document.createElement("div");
  const chevron = field.querySelector("img");
  const menuId = `${select.id || "filter"}ComboboxOptions`;
  let isOpen = false;
  let searchQuery = "";
  let activeOptionIndex = -1;
  let renderedOptions = [];
  let optionTooltip = null;
  let optionTooltipTarget = null;

  select.classList.add("filter-native-select");
  select.multiple = true;
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  control.className = "filter-combobox-control";
  control.setAttribute("role", "presentation");

  chips.className = "filter-combobox-chips";

  input.className = "filter-combobox-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = placeholder;
  input.setAttribute("aria-label", select.getAttribute("aria-label") || placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", menuId);

  clearButton.className = "filter-combobox-clear";
  clearButton.type = "button";
  clearButton.setAttribute("aria-label", `Clear ${placeholder}`);
  clearButton.hidden = true;
  clearButton.textContent = "x";

  menu.className = "filter-combobox-menu";
  menu.id = menuId;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", select.getAttribute("aria-label") || placeholder);
  menuList.className = "filter-combobox-options";

  control.append(chips, input);
  field.insertBefore(control, chevron || null);
  field.insertBefore(clearButton, chevron || null);
  menu.append(menuList);
  field.append(menu);

  function getOptionTooltip() {
    if (!optionTooltip) {
      optionTooltip = document.createElement("div");
      optionTooltip.className = "filter-combobox-floating-tooltip";
    }

    return optionTooltip;
  }

  function positionOptionTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = getOptionTooltip();
    tooltip.textContent = tooltipText;

    if (!tooltip.isConnected) {
      document.body.append(tooltip);
    }

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showOptionTooltip(event) {
    optionTooltipTarget = event.currentTarget;
    positionOptionTooltip(optionTooltipTarget);
    getOptionTooltip().classList.add("is-visible");
  }

  function hideOptionTooltip() {
    optionTooltipTarget = null;
    optionTooltip?.classList.remove("is-visible");
  }

  function getSelectedOptions() {
    const selectedValues = new Set(getFilterSelectValues(select));
    return getComboboxOptions(select).filter((option) => selectedValues.has(option.value));
  }

  function setActiveOption(index) {
    const optionButtons = Array.from(menuList.querySelectorAll(".filter-combobox-option"));
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

  function dispatchComboboxChange() {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function isValueExcluded(value) {
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    return option?.dataset.exclude === "true";
  }

  function setOptionExcluded(value, excluded) {
    const option = Array.from(select.options).find((candidate) => candidate.value === value);
    if (!option) return;

    if (excluded) {
      option.dataset.exclude = "true";
    } else {
      delete option.dataset.exclude;
    }
  }

  function syncComboboxDisplay() {
    const selectedOptions = getSelectedOptions();
    chips.innerHTML = "";

    selectedOptions.forEach((option) => {
      const excluded = allowExclude && isValueExcluded(option.value);
      const chip = document.createElement("span");
      const chipLabel = document.createElement("span");
      const chipRemove = document.createElement("button");

      chip.className = "filter-combobox-chip";
      chip.classList.toggle("is-excluded", excluded);

      if (allowExclude) {
        const chipToggle = document.createElement("button");
        chipToggle.className = "filter-combobox-chip-toggle";
        chipToggle.type = "button";
        chipToggle.setAttribute("aria-pressed", String(excluded));
        chipToggle.setAttribute(
          "aria-label",
          excluded ? `Include ${option.label} in results` : `Exclude ${option.label} from results`
        );
        chipToggle.dataset.tooltip = excluded ? "Include\nin results" : "Exclude\nfrom results";
        chipToggle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chipToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          setOptionExcluded(option.value, !excluded);
          syncComboboxDisplay();
          renderComboboxOptions();
          dispatchComboboxChange();
        });
        chip.append(chipToggle);
      }

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = option.label;

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${option.label}`);
      chipRemove.textContent = "x";
      chipRemove.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        const nextValues = getFilterSelectValues(select).filter((value) => value !== option.value);
        setSelectedValues(nextValues);
        input.focus({ preventScroll: true });
      });

      chip.append(chipLabel, chipRemove);
      chips.append(chip);
    });

    input.placeholder = selectedOptions.length ? "" : placeholder;
    field.classList.toggle("has-selection", selectedOptions.length > 0);
    clearButton.hidden = !selectedOptions.length;
  }

  function closeCombobox({ restoreDisplay = true } = {}) {
    if (!isOpen) return;

    hideOptionTooltip();
    isOpen = false;
    searchQuery = "";
    input.value = "";
    renderedOptions = [];
    activeOptionIndex = -1;
    field.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    menuList.innerHTML = "";

    if (restoreDisplay) {
      syncComboboxDisplay();
    }
  }

  function setSelectedValues(values, { dispatch = true } = {}) {
    setFilterSelectValues(select, values);
    syncComboboxDisplay();

    if (isOpen) {
      renderComboboxOptions();
    }

    if (dispatch) {
      dispatchComboboxChange();
    }
  }

  function selectComboboxOption(value, { excluded = false } = {}) {
    const currentValues = getFilterSelectValues(select);
    if (currentValues.includes(value)) return;

    searchQuery = "";
    input.value = "";
    setFilterSelectValues(select, [...currentValues, value]);
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    renderComboboxOptions();
    dispatchComboboxChange();
    input.focus({ preventScroll: true });
  }

  function renderComboboxOptions() {
    const normalizedQuery = normalizeComboboxText(searchQuery);
    const selectedValues = new Set(getFilterSelectValues(select));

    hideOptionTooltip();
    renderedOptions = getComboboxOptions(select).filter((option) => (
      !selectedValues.has(option.value) &&
      normalizeComboboxText(option.label).includes(normalizedQuery)
    ));

    menuList.innerHTML = "";

    if (!renderedOptions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "filter-combobox-empty";
      emptyState.textContent = "No results found";
      menuList.append(emptyState);
      setActiveOption(-1);
      return;
    }

    renderedOptions.forEach((option, index) => {
      const optionButton = document.createElement(allowExclude ? "div" : "button");
      const optionLabel = document.createElement("span");
      optionButton.className = "filter-combobox-option";
      if (!allowExclude) {
        optionButton.type = "button";
      }
      optionButton.id = `${menuId}-${index}`;
      optionButton.dataset.value = option.value;
      optionButton.setAttribute("role", "option");
      optionButton.setAttribute("aria-selected", "false");
      optionLabel.className = "filter-combobox-option-label";
      optionLabel.textContent = option.label;
      optionButton.append(optionLabel);

      if (allowExclude) {
        const optionActions = document.createElement("span");
        const includeAction = document.createElement("button");
        const excludeAction = document.createElement("button");

        optionActions.className = "filter-combobox-option-actions";
        includeAction.className = "filter-combobox-option-action is-include";
        includeAction.type = "button";
        includeAction.tabIndex = -1;
        includeAction.setAttribute("aria-label", `Include ${option.label} in results`);
        includeAction.dataset.tooltip = "Include\nin results";
        excludeAction.className = "filter-combobox-option-action is-exclude";
        excludeAction.type = "button";
        excludeAction.tabIndex = -1;
        excludeAction.setAttribute("aria-label", `Exclude ${option.label} from results`);
        excludeAction.dataset.tooltip = "Exclude\nfrom results";

        [includeAction, excludeAction].forEach((actionButton) => {
          actionButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          actionButton.addEventListener("mouseenter", showOptionTooltip);
          actionButton.addEventListener("mouseleave", hideOptionTooltip);
          actionButton.addEventListener("focus", showOptionTooltip);
          actionButton.addEventListener("blur", hideOptionTooltip);
          actionButton.addEventListener("click", hideOptionTooltip);
        });

        includeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          selectComboboxOption(option.value);
        });
        excludeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          selectComboboxOption(option.value, { excluded: true });
        });

        optionActions.append(includeAction, excludeAction);
        optionButton.append(optionActions);
      }

      optionButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      optionButton.addEventListener("click", () => {
        selectComboboxOption(option.value);
        input.focus({ preventScroll: true });
      });

      menuList.append(optionButton);
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

  function openCombobox({ selectInputText = false } = {}) {
    if (select.disabled) return;

    isOpen = true;
    searchQuery = "";
    field.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
    syncComboboxDisplay();
    renderComboboxOptions();

    if (selectInputText) {
      input.focus({ preventScroll: true });
    }
  }

  function syncDisabledState() {
    const isDisabled = select.disabled;
    input.disabled = isDisabled;
    field.classList.toggle("is-disabled", isDisabled);

    if (isDisabled) {
      closeCombobox();
    }
  }

  input.addEventListener("focus", () => {
    openCombobox({ selectInputText: true });
  });

  input.addEventListener("input", () => {
    searchQuery = input.value;

    if (!isOpen) {
      isOpen = true;
      field.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
    }

    renderComboboxOptions();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && input.value === "") {
      const currentValues = getFilterSelectValues(select);
      if (currentValues.length) {
        event.preventDefault();
        setSelectedValues(currentValues.slice(0, -1));
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openCombobox();
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
      selectComboboxOption(renderedOptions[activeOptionIndex].value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCombobox();
      input.blur();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => closeCombobox(), 100);
  });

  clearButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  clearButton.addEventListener("click", () => {
    setSelectedValues([]);
    input.focus({ preventScroll: true });
  });

  menuList.addEventListener("scroll", hideOptionTooltip);
  window.addEventListener("resize", hideOptionTooltip);

  field.addEventListener("mousedown", (event) => {
    const section = field.closest(".filter-section");
    if (section?.classList.contains("filter-section-collapsed")) {
      event.preventDefault();
      return;
    }

    if (event.target === input || menu.contains(event.target) || clearButton.contains(event.target)) return;
    if (select.disabled) return;

    const wasOpen = isOpen;
    event.preventDefault();
    input.focus({ preventScroll: true });

    if (wasOpen) {
      closeCombobox();
    } else {
      openCombobox({ selectInputText: true });
    }
  });

  select.addEventListener("change", () => {
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
  });

  const comboboxApi = {
    close: closeCombobox,
    sync() {
      syncDisabledState();
      syncComboboxDisplay();
      if (isOpen) {
        renderComboboxOptions();
      }
    }
  };

  filterComboboxes.set(select, comboboxApi);
  comboboxApi.sync();
  return comboboxApi;
}

function syncFilterComboboxes() {
  filterComboboxes.forEach((combobox) => {
    combobox.sync();
  });
}

function getInvestmentFilterSection() {
  return document.querySelector(".filter-section--investment");
}

function normalizeInvestmentValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const normalized = Number(value.max ?? value.min);
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return 0;
}

function buildInvestmentHistogramCounts(values, rangeMin, rangeMax, binCount) {
  const counts = Array(binCount).fill(0);
  const rangeSize = rangeMax - rangeMin;

  if (rangeSize <= 0) {
    return counts;
  }

  values.forEach((value) => {
    const clamped = Math.min(rangeMax, Math.max(rangeMin, value));
    const ratio = (clamped - rangeMin) / rangeSize;
    const index = Math.min(binCount - 1, Math.floor(ratio * binCount));
    counts[index] += 1;
  });

  return counts;
}

function syncInvestmentHistogramRange(track) {
  const section = track.closest(".filter-section--investment");
  const histogramBars = section?.querySelectorAll(".filter-range-histogram-bar");
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");

  if (!histogramBars?.length || !minRange || !maxRange) {
    return;
  }

  const rangeMin = Number(minRange.min);
  const rangeMax = Number(maxRange.max);
  const minValue = Math.min(Number(minRange.value), Number(maxRange.value));
  const maxValue = Math.max(Number(minRange.value), Number(maxRange.value));
  const rangeSize = rangeMax - rangeMin;
  const binSize = rangeSize / INVESTMENT_HISTOGRAM_BINS;

  histogramBars.forEach((bar, index) => {
    const barMin = rangeMin + (index * binSize);
    const barMax = rangeMin + ((index + 1) * binSize);
    const inRange = barMax > minValue && barMin < maxValue;
    bar.classList.toggle("is-in-range", inRange);
  });
}

function renderInvestmentHistogram(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const section = getInvestmentFilterSection();
  const histogramBars = section?.querySelector(".filter-range-histogram-bars");
  const track = section?.querySelector(".filter-range-slider");

  if (!section || !histogramBars || !track) {
    return;
  }

  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const rangeMin = Number(minRange?.min ?? 0);
  const rangeMax = Number(maxRange?.max ?? 0);
  const values = registry.map((record) => normalizeInvestmentValue(record.initialInvestment));
  const counts = buildInvestmentHistogramCounts(values, rangeMin, rangeMax, INVESTMENT_HISTOGRAM_BINS);
  const peak = Math.max(...counts, 1);

  histogramBars.replaceChildren();
  counts.forEach((count) => {
    const bar = document.createElement("span");
    bar.className = "filter-range-histogram-bar";
    bar.style.height = count
      ? `${Math.max(14, Math.round((count / peak) * 100))}%`
      : "8%";
    histogramBars.append(bar);
  });

  syncInvestmentHistogramRange(track);
}

function syncRangeTrack(track) {
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const fill = track.querySelector(".range-fill");
  const section = track.closest(".filter-section");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  const minInput = numberInputs[0];
  const maxInput = numberInputs[1];
  if (!minRange || !maxRange) return;

  const min = Number(minRange.min);
  const max = Number(maxRange.max);
  const rangeSize = max - min;
  let minValue = Number(minRange.value);
  let maxValue = Number(maxRange.value);

  if (minValue > maxValue) {
    if (document.activeElement === maxRange || document.activeElement === maxInput) {
      minValue = maxValue;
    } else {
      maxValue = minValue;
    }
  }

  minRange.value = String(minValue);
  maxRange.value = String(maxValue);
  if (minInput && document.activeElement !== minInput) {
    setFilterNumberInputDisplay(minInput, minValue);
  }
  if (maxInput && document.activeElement !== maxInput) {
    setFilterNumberInputDisplay(maxInput, maxValue);
  }

  if (fill && rangeSize > 0) {
    const minPercent = ((minValue - min) / rangeSize) * 100;
    const maxPercent = ((maxValue - min) / rangeSize) * 100;
    fill.style.left = `${minPercent}%`;
    fill.style.right = `${100 - maxPercent}%`;
  }

  if (track.classList.contains("filter-range-slider--histogram")) {
    syncInvestmentHistogramRange(track);
  }
}

function bindRangeTrack(track) {
  const minRange = track.querySelector(".range-input-min");
  const maxRange = track.querySelector(".range-input-max");
  const section = track.closest(".filter-section");
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
  const minInput = numberInputs[0];
  const maxInput = numberInputs[1];
  const syncFromNumberInput = (numberInput, rangeInput) => {
    const rangeMin = Number(rangeInput.min);
    const rangeMax = Number(rangeInput.max);
    let value = getFilterNumberInputValue(numberInput);

    if (!Number.isFinite(value)) {
      value = Number(rangeInput.value);
    }

    value = Math.min(rangeMax, Math.max(rangeMin, value));
    rangeInput.value = String(value);
    syncRangeTrack(track);
  };

  const bindNumberInput = (numberInput, rangeInput) => {
    if (isCurrencyNumberInput(numberInput)) {
      numberInput.addEventListener("focus", () => {
        const value = getFilterNumberInputValue(numberInput);
        numberInput.value = Number.isFinite(value) ? String(value) : "";
      });

      numberInput.addEventListener("blur", () => {
        syncFromNumberInput(numberInput, rangeInput);
        setFilterNumberInputDisplay(numberInput, getFilterNumberInputValue(numberInput));
      });

      numberInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          numberInput.blur();
        }
      });
    }

    numberInput.addEventListener("change", () => syncFromNumberInput(numberInput, rangeInput));
  };

  minRange?.addEventListener("input", () => syncRangeTrack(track));
  maxRange?.addEventListener("input", () => syncRangeTrack(track));
  if (minInput) bindNumberInput(minInput, minRange);
  if (maxInput) bindNumberInput(maxInput, maxRange);
  syncRangeTrack(track);
}

function initTerritoryFilters() {
  const shell = document.querySelector(".territory-shell");
  const filterPanel = document.querySelector(".territory-filter-panel");
  const filterToggle = document.getElementById("territoryFilterToggle");

  restoreSavedTerritorySettings();

  filterPanel?.querySelectorAll(".filter-section").forEach((section) => {
    const title = section.querySelector(".filter-section-title");
    title?.setAttribute("aria-expanded", String(!section.classList.contains("filter-section-collapsed")));
  });

  filterPanel?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const title = event.target.closest(".filter-section-title");
    if (!title || !filterPanel.contains(title)) return;

    const section = title.closest(".filter-section");
    if (!section) return;

    const isCollapsed = section.classList.toggle("filter-section-collapsed");
    title.setAttribute("aria-expanded", String(!isCollapsed));

    if (isCollapsed) {
      section.querySelectorAll(".filter-field-select").forEach((select) => {
        filterComboboxes.get(select)?.close();
      });
    }

    persistTerritorySettings();
  });

  document.querySelectorAll(".filter-field-select").forEach((select) => {
    const allowExclude = select.id === "categoryFilterSelect" || select.id === "franchiseFilterSelect";
    enhanceFilterCombobox(select, { allowExclude });
  });

  document.querySelectorAll(".territory-filter-checkbox").forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });

  document.querySelectorAll(".filter-range-slider").forEach(bindRangeTrack);

  filterToggle?.addEventListener("click", () => {
    const isOpen = !shell?.classList.contains("is-filter-open");
    setFilterPanelOpen(isOpen);

    if (!isOpen) {
      filterComboboxes.forEach((combobox) => combobox.close());
    }

    persistTerritorySettings();

    window.setTimeout(() => {
      window.territoryMap?.resize?.();
    }, 280);
  });

  document.addEventListener("mousedown", (event) => {
    filterComboboxes.forEach((combobox, select) => {
      const field = select.closest(".filter-select-field");
      if (!field?.contains(event.target)) {
        combobox.close();
      }
    });
  });

  const clearAllFilters = document.getElementById("clearAllFilters");
  clearAllFilters?.addEventListener("click", clearAllFilterSelections);

  const searchWithinLocation = document.getElementById("searchWithinLocation");
  searchWithinLocation?.addEventListener("click", () => {
    if (!window.__territoryMapStarted) {
      window.startTerritoryMapFromFilters?.();
    } else {
      window.dismissTerritoryCrossroad?.();
    }
    window.territoryMapControls?.triggerTerritoryGeolocation?.();
  });

  initTerritorySearch();
  initTerritoryToolbarMenu();

  if (savedTerritorySettings) {
    isRestoringTerritorySettings = true;
    try {
      restoreSavedFilterSelections(savedTerritorySettings);
    } finally {
      isRestoringTerritorySettings = false;
    }
  }

  bindTerritoryFilterControls();
  updateClearFiltersButton();
}

function initTerritoryToolbarMenu() {
  const toolbarDropdown = document.getElementById("territoryMenuDropdown");
  const territoryBrandLogosToggle = document.getElementById("territoryBrandLogosToggleOption");
  const territoryBordersToggle = document.getElementById("territoryBordersToggleOption");
  const territoryBlendToggle = document.getElementById("territoryBlendToggleOption");
  const toolbarDropdowns = toolbarDropdown ? [toolbarDropdown] : [];
  const savedSettings = savedTerritorySettings?.settings;
  let territoryBrandLogosEnabled = savedSettings?.brandLogos ?? window.territoryMapControls?.getTerritoryBrandLogosVisible?.() ?? true;
  let territoryBordersEnabled = savedSettings?.borders ?? window.territoryMapControls?.getTerritoryBordersVisible?.() ?? true;
  let territoryBlendEnabled = savedSettings?.blend ?? window.territoryMapControls?.getTerritoryBlendEnabled?.() ?? false;

  const closeToolbarDropdowns = (exceptDropdown = null) => {
    toolbarDropdowns.forEach((dropdown) => {
      if (dropdown === exceptDropdown) return;
      dropdown.removeAttribute("open");
    });
  };

  const syncTerritoryBrandLogosToggle = () => {
    territoryBrandLogosToggle?.setAttribute("aria-checked", String(territoryBrandLogosEnabled));
  };

  const syncTerritoryBordersToggle = () => {
    territoryBordersToggle?.setAttribute("aria-checked", String(territoryBordersEnabled));
  };

  const syncTerritoryBlendToggle = () => {
    territoryBlendToggle?.setAttribute("aria-checked", String(territoryBlendEnabled));
  };

  territoryBrandLogosToggle?.addEventListener("click", () => {
    territoryBrandLogosEnabled = !territoryBrandLogosEnabled;
    syncTerritoryBrandLogosToggle();
    window.territoryMapControls?.setTerritoryBrandLogosVisible?.(territoryBrandLogosEnabled);
    persistTerritorySettings();
  });

  territoryBordersToggle?.addEventListener("click", () => {
    territoryBordersEnabled = !territoryBordersEnabled;
    syncTerritoryBordersToggle();
    window.territoryMapControls?.setTerritoryBordersVisible?.(territoryBordersEnabled);
    persistTerritorySettings();
  });

  territoryBlendToggle?.addEventListener("click", () => {
    territoryBlendEnabled = !territoryBlendEnabled;
    syncTerritoryBlendToggle();
    window.territoryMapControls?.setTerritoryBlendEnabled?.(territoryBlendEnabled);
    persistTerritorySettings();
  });

  if (toolbarDropdowns.length) {
    document.addEventListener("click", (event) => {
      const openDropdown = toolbarDropdowns.find((dropdown) => dropdown.open);
      if (!openDropdown) return;

      if (openDropdown.contains(event.target)) {
        closeToolbarDropdowns(openDropdown);
        return;
      }

      closeToolbarDropdowns();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toolbarDropdowns.some((dropdown) => dropdown.open)) {
        closeToolbarDropdowns();
      }
    });
  }

  syncTerritoryBrandLogosToggle();
  syncTerritoryBordersToggle();
  syncTerritoryBlendToggle();
}

function initTerritorySearch() {
  const searchInput = document.getElementById("territorySearchInput");
  const searchClear = document.getElementById("territorySearchClear");
  if (!searchInput) return;

  const searchField = searchInput.closest(".toolbar-search-btn");

  const syncSearchState = () => {
    const hasQuery = searchInput.value.trim().length > 0;
    searchField?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  };

  searchInput.addEventListener("input", () => {
    syncSearchState();
    refreshTerritoryFilters();
    persistTerritorySettings();
  });

  searchClear?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  searchClear?.addEventListener("click", () => {
    searchInput.value = "";
    syncSearchState();
    refreshTerritoryFilters();
    persistTerritorySettings();
    searchInput.focus();
  });

  if (typeof savedTerritorySettings?.filters?.search === "string") {
    searchInput.value = savedTerritorySettings.filters.search;
  }

  syncSearchState();
}

function getTerritoryFilterRangeValues(section) {
  const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);

  return {
    min: getFilterNumberInputValue(numberInputs[0]),
    max: getFilterNumberInputValue(numberInputs[1])
  };
}

function getTerritoryRangeFilterDefaults(section) {
  const track = section?.querySelector(".filter-range-slider");
  const minRange = track?.querySelector(".range-input-min");
  const maxRange = track?.querySelector(".range-input-max");

  return {
    min: Number(minRange?.min ?? 0),
    max: Number(maxRange?.max ?? 0)
  };
}

function territoryRangeFilterIsActive(section) {
  const defaults = getTerritoryRangeFilterDefaults(section);
  const values = getTerritoryFilterRangeValues(section);

  return values.min !== defaults.min || values.max !== defaults.max;
}

function getAppliedTerritoryFilterCount() {
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");

  const selectedFilterCount =
    getFilterSelectValues(locationFilterSelect).length +
    getFilterSelectIncludedValues(categoryFilterSelect).length +
    getFilterSelectExcludedValues(categoryFilterSelect).length +
    getFilterSelectIncludedValues(franchiseFilterSelect).length +
    getFilterSelectExcludedValues(franchiseFilterSelect).length;
  const selectedStatusCount = statusCheckboxes.filter((checkbox) => checkbox.checked).length;
  const selectedSearchCount = searchInput?.value.trim() ? 1 : 0;
  const selectedInvestmentCount = territoryRangeFilterIsActive(investmentSection) ? 1 : 0;
  const selectedRatingCount = territoryRangeFilterIsActive(ratingSection) ? 1 : 0;

  return selectedFilterCount + selectedStatusCount + selectedSearchCount + selectedInvestmentCount + selectedRatingCount;
}

function updateClearFiltersButton() {
  const clearAllFilters = document.getElementById("clearAllFilters");
  if (!clearAllFilters) return;

  const appliedFilterCount = getAppliedTerritoryFilterCount();
  const hasAppliedFilters = appliedFilterCount > 0;

  clearAllFilters.textContent = hasAppliedFilters
    ? `Clear all (${appliedFilterCount})`
    : "Clear all";
  clearAllFilters.setAttribute(
    "aria-label",
    hasAppliedFilters
      ? `Clear all filters (${appliedFilterCount} applied)`
      : "Clear all filters"
  );
}

function resetFilterSelections() {
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const searchClear = document.getElementById("territorySearchClear");
  const searchField = searchInput?.closest(".toolbar-search-btn");

  setFilterSelectValues(locationFilterSelect, []);
  setFilterSelectValues(categoryFilterSelect, []);
  setFilterSelectValues(franchiseFilterSelect, []);
  syncFilterComboboxes();

  statusCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
    setFilterCheckboxState(checkbox, false);
  });

  if (investmentSection) {
    const investmentTrack = investmentSection.querySelector(".filter-range-slider");
    const investmentMinRange = investmentTrack?.querySelector(".range-input-min");
    const investmentMaxRange = investmentTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      investmentSection,
      Number(investmentMinRange?.min ?? 0),
      Number(investmentMaxRange?.max ?? 0)
    );
  }

  if (ratingSection) {
    const ratingTrack = ratingSection.querySelector(".filter-range-slider");
    const ratingMinRange = ratingTrack?.querySelector(".range-input-min");
    const ratingMaxRange = ratingTrack?.querySelector(".range-input-max");
    setTerritoryFilterRangeValues(
      ratingSection,
      Number(ratingMinRange?.min ?? 0),
      Number(ratingMaxRange?.max ?? 0)
    );
  }

  if (searchInput) {
    searchInput.value = "";
    searchField?.classList.remove("is-active-search");
    if (searchClear) searchClear.hidden = true;
  }

  refreshTerritoryFilters();
}

function clearAllFilterSelections() {
  resetFilterSelections();
  window.territoryMapSelection?.clear?.();
  window.territoryBrandPanel?.close?.();
  window.showTerritoryCrossroad?.();
}

function getTerritoryFilterState() {
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const investmentSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Initial investment range']")
    ?.closest(".filter-section");
  const ratingSection = document.querySelector(".filter-section .filter-range-slider[aria-label='Franchisee rating range']")
    ?.closest(".filter-section");
  const searchInput = document.getElementById("territorySearchInput");
  const investmentRange = getTerritoryFilterRangeValues(investmentSection);
  const ratingRange = getTerritoryFilterRangeValues(ratingSection);

  return {
    locations: getFilterSelectValues(locationFilterSelect),
    categories: {
      included: getFilterSelectIncludedValues(categoryFilterSelect),
      excluded: getFilterSelectExcludedValues(categoryFilterSelect)
    },
    franchises: {
      included: getFilterSelectIncludedValues(franchiseFilterSelect),
      excluded: getFilterSelectExcludedValues(franchiseFilterSelect)
    },
    statuses: statusCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value),
    investmentMin: Math.min(investmentRange.min, investmentRange.max),
    investmentMax: Math.max(investmentRange.min, investmentRange.max),
    ratingMin: Math.min(ratingRange.min, ratingRange.max),
    ratingMax: Math.max(ratingRange.min, ratingRange.max),
    search: searchInput?.value.trim().toLocaleLowerCase() || ""
  };
}

function territoryMatchesFilters(record, filters) {
  if (filters.locations.length && !filters.locations.includes(record.state)) {
    return false;
  }

  if (filters.categories.included.length && !filters.categories.included.includes(record.category)) {
    return false;
  }

  if (filters.categories.excluded.includes(record.category)) {
    return false;
  }

  if (filters.franchises.included.length && !filters.franchises.included.includes(record.brandId)) {
    return false;
  }

  if (filters.franchises.excluded.includes(record.brandId)) {
    return false;
  }

  if (filters.statuses.length && !filters.statuses.includes(record.status)) {
    return false;
  }

  if (record.initialInvestment < filters.investmentMin || record.initialInvestment > filters.investmentMax) {
    return false;
  }

  if (record.franchiseeRating < filters.ratingMin || record.franchiseeRating > filters.ratingMax) {
    return false;
  }

  if (filters.search) {
    const haystack = `${record.brand} ${record.name} ${record.state}`.toLocaleLowerCase();
    if (!haystack.includes(filters.search)) {
      return false;
    }
  }

  return true;
}

function getFilteredTerritoryRecords(registry = window.territoryMapFilters?.getTerritoryRegistry?.() || []) {
  const filters = getTerritoryFilterState();
  return registry.filter((record) => territoryMatchesFilters(record, filters));
}

function maybeStartTerritoryMapFromFilters() {
  if (isRestoringTerritorySettings) return;
  if (getAppliedTerritoryFilterCount() <= 0) return;

  if (!window.__territoryMapStarted) {
    window.startTerritoryMapFromFilters?.();
    return;
  }

  window.dismissTerritoryCrossroad?.();
}

function refreshTerritoryFilters() {
  maybeStartTerritoryMapFromFilters();

  const registry = window.territoryMapFilters?.getTerritoryRegistry?.() || [];
  const matchingRecords = getFilteredTerritoryRecords(registry);
  window.territoryMapFilters?.applyTerritoryFilters?.(matchingRecords);
  updateClearFiltersButton();
  persistTerritorySettings();
}

function updateTerritoryFilterSummary(visibleCount, totalCount) {
  const filterSummary = document.getElementById("territoryFilterSummary");
  if (!filterSummary) return;

  const visibleRange = visibleCount > 0 ? `1-${visibleCount}` : "0";
  filterSummary.textContent = `Showing ${visibleRange} of ${totalCount} records sorted by relevancy`;
}

function populateTerritoryFilterOptions(brands) {
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");

  if (categoryFilterSelect) {
    const existingCategories = new Set(
      Array.from(categoryFilterSelect.options).map((option) => option.value)
    );
    const categories = [...new Set(brands.map((brand) => brand.category).filter(Boolean))].sort();
    categories.forEach((category) => {
      if (existingCategories.has(category)) return;

      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilterSelect.append(option);
    });
    categoryFilterSelect.disabled = false;
  }

  if (franchiseFilterSelect) {
    const existingFranchises = new Set(
      Array.from(franchiseFilterSelect.options).map((option) => option.value)
    );
    brands.forEach((brand) => {
      if (existingFranchises.has(brand.id)) return;

      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.brand;
      franchiseFilterSelect.append(option);
    });
    franchiseFilterSelect.disabled = false;
  }

  syncFilterComboboxes();
}

function hydrateTerritoryFilterOptions(brands) {
  populateTerritoryFilterOptions(brands);

  if (savedTerritorySettings && !window.__territoryMapStarted) {
    restoreSelectFiltersFromSaved(savedTerritorySettings);
  }
}

let territoryFilterControlsBound = false;

function bindTerritoryFilterControls() {
  if (territoryFilterControlsBound) return;
  territoryFilterControlsBound = true;
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const rangeSections = Array.from(document.querySelectorAll(".filter-range-slider"))
    .map((track) => track.closest(".filter-section"))
    .filter(Boolean);

  locationFilterSelect?.addEventListener("change", refreshTerritoryFilters);
  categoryFilterSelect?.addEventListener("change", refreshTerritoryFilters);
  franchiseFilterSelect?.addEventListener("change", refreshTerritoryFilters);

  statusCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setFilterCheckboxState(checkbox, checkbox.checked);
      refreshTerritoryFilters();
    });
  });

  rangeSections.forEach((section) => {
    const track = section.querySelector(".filter-range-slider");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");
    const numberInputs = Array.from(section.querySelectorAll(".filter-number-input"));

    minRange?.addEventListener("input", () => {
      syncRangeTrack(track);
      refreshTerritoryFilters();
    });
    maxRange?.addEventListener("input", () => {
      syncRangeTrack(track);
      refreshTerritoryFilters();
    });
    numberInputs[0]?.addEventListener("change", refreshTerritoryFilters);
    numberInputs[1]?.addEventListener("change", refreshTerritoryFilters);
  });
}

function applyCrossroadPresetSelections(preset = {}) {
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const statusCheckboxes = Array.from(document.querySelectorAll(".territory-filter-checkbox"))
    .filter((checkbox) => checkbox.value);
  const statusSet = new Set(getSavedStringArray(preset.statuses));

  setFilterSelectValues(
    locationFilterSelect,
    getValidSavedSelectValues(locationFilterSelect, preset.locations)
  );
  setFilterSelectIncludedExcludedValues(
    categoryFilterSelect,
    getValidSavedSelectValues(categoryFilterSelect, preset.categories),
    getValidSavedSelectValues(categoryFilterSelect, preset.categoriesExcluded)
  );
  setFilterSelectIncludedExcludedValues(
    franchiseFilterSelect,
    getValidSavedSelectValues(franchiseFilterSelect, preset.franchises),
    getValidSavedSelectValues(franchiseFilterSelect, preset.franchisesExcluded)
  );

  statusCheckboxes.forEach((checkbox) => {
    checkbox.checked = statusSet.has(checkbox.value);
    setFilterCheckboxState(checkbox, checkbox.checked);
  });

  syncFilterComboboxes();
}

function setTerritoryLocationFilter(stateCode) {
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const validStateCodes = getValidSavedSelectValues(locationFilterSelect, [stateCode]);
  if (!validStateCodes.length) return false;

  setFilterSelectValues(locationFilterSelect, validStateCodes);
  syncFilterComboboxes();
  refreshTerritoryFilters();
  return true;
}

function initTerritoryFilterData(brands, registry) {
  populateTerritoryFilterOptions(brands);
  renderInvestmentHistogram(registry);

  const crossroadChoice = window.territoryCrossroadChoice;

  isRestoringTerritorySettings = true;
  try {
    // A crossroad selection takes priority over any persisted filter state:
    // a preset applies its saved filters, while a fresh "new search" starts
    // clean. Filter-driven starts keep sidebar selections and only hydrate
    // category/franchise options once brand data is available.
    if (crossroadChoice?.type === "preset") {
      applyCrossroadPresetSelections(crossroadChoice.filters || {});
    } else if (crossroadChoice?.type === "new") {
      applyCrossroadPresetSelections({});
    } else if (crossroadChoice?.type === "filters") {
      // Sidebar selections were made before the map existed; keep them as-is.
    } else if (savedTerritorySettings) {
      restoreSavedFilterSelections(savedTerritorySettings);
    }
  } finally {
    isRestoringTerritorySettings = false;
  }

  bindTerritoryFilterControls();
  applySavedMapSettings();
  refreshTerritoryFilters();
  territorySettingsReadyToPersist = true;
  persistTerritorySettings();
}

window.territoryFilters = {
  getFilterSelectIncludedValues,
  getFilterSelectExcludedValues,
  syncFilterComboboxes,
  hydrateOptions: hydrateTerritoryFilterOptions,
  getAppliedFilterCount: getAppliedTerritoryFilterCount,
  resetFilterSelections,
  applyCrossroadPreset: applyCrossroadPresetSelections,
  setLocation: setTerritoryLocationFilter,
  onDataReady: initTerritoryFilterData,
  updateSummary: updateTerritoryFilterSummary,
  refresh: refreshTerritoryFilters
};

initTerritoryFilters();
