function setFilterCheckboxState(checkbox, isChecked) {
  const label = checkbox?.closest(".filter-check");
  label?.classList.toggle("is-checked", isChecked);
}

function syncStatusFilterStates() {
  statusFilterInputs.forEach((checkbox) => {
    setFilterCheckboxState(checkbox, checkbox.checked);
  });
  updateClearFiltersButton();
}

function clampRangeValue(value, defaults) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return defaults.min;
  return Math.min(defaults.max, Math.max(defaults.min, Math.round(numericValue)));
}

function syncRangeFilterControls({ defaults, fill, max, maxInput, maxRange, min, minInput, minRange }) {
  [minRange, maxRange, minInput, maxInput].filter(Boolean).forEach((input) => {
    input.min = String(defaults.min);
    input.max = String(defaults.max);
  });

  if (minRange) minRange.value = String(min);
  if (maxRange) maxRange.value = String(max);
  if (minInput) minInput.value = String(min);
  if (maxInput) maxInput.value = String(max);

  if (fill) {
    const rangeSize = defaults.max - defaults.min;
    const minPercent = rangeSize
      ? ((min - defaults.min) / rangeSize) * 100
      : 0;
    const maxPercent = rangeSize
      ? ((max - defaults.min) / rangeSize) * 100
      : 100;

    fill.style.left = `${minPercent}%`;
    fill.style.right = `${100 - maxPercent}%`;
  }

  updateClearFiltersButton();
}

function refreshRangeFilterResults() {
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
}

function getNormalizedRange({ changed, defaults, maxValue, minValue }) {
  let nextMin = clampRangeValue(minValue, defaults);
  let nextMax = clampRangeValue(maxValue, defaults);

  if (nextMin > nextMax) {
    if (changed === "max") {
      nextMin = nextMax;
    } else {
      nextMax = nextMin;
    }
  }

  return { nextMax, nextMin };
}

function syncUnitsFilterControls() {
  syncRangeFilterControls({
    defaults: unitsFilterDefaults,
    fill: unitsRangeFill,
    max: selectedUnitsMax,
    maxInput: unitsMaxInput,
    maxRange: unitsMaxRange,
    min: selectedUnitsMin,
    minInput: unitsMinInput,
    minRange: unitsMinRange
  });
}

function setUnitsFilterRange(minValue, maxValue, { changed = "min", refresh = false } = {}) {
  const { nextMax, nextMin } = getNormalizedRange({
    changed,
    defaults: unitsFilterDefaults,
    maxValue,
    minValue
  });

  const didChange = nextMin !== selectedUnitsMin || nextMax !== selectedUnitsMax;
  selectedUnitsMin = nextMin;
  selectedUnitsMax = nextMax;
  syncUnitsFilterControls();

  if (refresh && didChange) {
    refreshRangeFilterResults();
  }
}

function syncContactsFilterControls() {
  syncRangeFilterControls({
    defaults: contactsFilterDefaults,
    fill: contactsRangeFill,
    max: selectedContactsMax,
    maxInput: contactsMaxInput,
    maxRange: contactsMaxRange,
    min: selectedContactsMin,
    minInput: contactsMinInput,
    minRange: contactsMinRange
  });
}

function setContactsFilterRange(minValue, maxValue, { changed = "min", refresh = false } = {}) {
  const { nextMax, nextMin } = getNormalizedRange({
    changed,
    defaults: contactsFilterDefaults,
    maxValue,
    minValue
  });

  const didChange = nextMin !== selectedContactsMin || nextMax !== selectedContactsMax;
  selectedContactsMin = nextMin;
  selectedContactsMax = nextMax;
  syncContactsFilterControls();

  if (refresh && didChange) {
    refreshRangeFilterResults();
  }
}

function clearAllFilterSelections() {
  selectedLocationLabels = [];
  excludedLocationLabels = [];
  selectedCategoryValues = [];
  excludedCategoryValues = [];
  selectedOwnerIndexes = [];
  excludedOwnerIndexes = [];
  selectedFranchiseIndexes = [];
  excludedFranchiseIndexes = [];
  searchQuery = "";
  selectedUnitsMin = unitsFilterDefaults.min;
  selectedUnitsMax = unitsFilterDefaults.max;
  selectedContactsMin = contactsFilterDefaults.min;
  selectedContactsMax = contactsFilterDefaults.max;
  activeMapOwnerIndex = null;
  activeOrgOwnerIndex = null;

  setFilterSelectValues(locationFilterSelect, []);
  setFilterSelectValues(categoryFilterSelect, []);
  setFilterSelectValues(ownerFilterSelect, []);
  setFilterSelectValues(franchiseFilterSelect, []);
  if (toolbarSearchInput) {
    toolbarSearchInput.value = "";
    toolbarSearchInput.closest(".toolbar-search-btn")?.classList.remove("is-active-search");
    if (toolbarSearchClear) {
      toolbarSearchClear.hidden = true;
    }
  }
  syncFilterComboboxes();

  statusFilterInputs.forEach((checkbox) => {
    checkbox.checked = false;
  });

  syncStatusFilterStates();
  syncUnitsFilterControls();
  syncContactsFilterControls();
  syncMapLocationFilter();
  refreshFilteredViews();
  refitOpenMapToVisibleLocations();
  syncOpenOrgPanelWithSelection();
  tableWrap?.scrollTo({ top: 0, behavior: "auto" });
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
  clearButton.textContent = "×";

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

  function removeSelectedValue(value) {
    const nextValues = getFilterSelectValues(select).filter((selectedValue) => selectedValue !== value);
    setSelectedValues(nextValues);
    input.focus({ preventScroll: true });
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

  function setValueExcluded(value, excluded) {
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
    dispatchComboboxChange();
    input.focus({ preventScroll: true });
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
        chip.tabIndex = 0;
        chip.setAttribute("role", "button");
        chip.setAttribute("aria-pressed", String(excluded));
        chip.setAttribute(
          "aria-label",
          excluded ? `Include ${option.label} in results` : `Exclude ${option.label} from results`
        );
        chip.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          setValueExcluded(option.value, !excluded);
        });
        chip.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          event.stopPropagation();
          setValueExcluded(option.value, !excluded);
        });

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
          setValueExcluded(option.value, !excluded);
        });
        chip.append(chipToggle);
      }

      chipLabel.className = "filter-combobox-chip-label";
      chipLabel.textContent = option.label;

      chipRemove.className = "filter-combobox-chip-remove";
      chipRemove.type = "button";
      chipRemove.setAttribute("aria-label", `Remove ${option.label}`);
      chipRemove.textContent = "×";
      chipRemove.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        removeSelectedValue(option.value);
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

  function selectComboboxOption(value, { excluded = false } = {}) {
    const currentValues = getFilterSelectValues(select);
    if (currentValues.includes(value)) return;

    searchQuery = "";
    input.value = "";
    setFilterSelectValues(select, [...currentValues, value]);
    setOptionExcluded(value, excluded);
    syncComboboxDisplay();
    if (isOpen) {
      renderComboboxOptions();
    }
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
