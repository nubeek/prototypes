(function () {
  const filterComboboxes = new Map();

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
      .filter((option) => option.dataset.comboboxDivider === "true" || option.value !== "")
      .map((option) => ({
        label: option.textContent.trim(),
        value: option.value,
        divider: option.dataset.comboboxDivider === "true"
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

  function renderFilterChip({
    label,
    excluded = false,
    allowToggle = false,
    chipClickable = false,
    onToggleExclude,
    onRemove,
    onRecenter,
    datasetKey
  } = {}) {
    const chip = document.createElement("span");
    const chipLabel = document.createElement("span");
    const chipRemove = document.createElement("button");

    chip.className = "filter-combobox-chip";
    chip.classList.toggle("is-excluded", excluded);

    if (onRecenter) {
      chip.classList.add("is-recenterable");
    }

    if (allowToggle && chipClickable) {
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");
      chip.setAttribute("aria-pressed", String(excluded));
      chip.setAttribute(
        "aria-label",
        excluded ? `Include ${label} in results` : `Exclude ${label} from results`
      );
      chip.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        onToggleExclude?.();
      });
      chip.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        event.stopPropagation();
        onToggleExclude?.();
      });
    }

    if (allowToggle) {
      const chipToggle = document.createElement("button");
      chipToggle.className = "filter-combobox-chip-toggle";
      chipToggle.type = "button";
      chipToggle.setAttribute("aria-pressed", String(excluded));
      chipToggle.setAttribute(
        "aria-label",
        excluded ? `Include ${label} in results` : `Exclude ${label} from results`
      );
      chipToggle.dataset.tooltip = excluded ? "Include\nin results" : "Exclude\nfrom results";
      chipToggle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        onToggleExclude?.();
      });
      chip.append(chipToggle);
    }

    chipLabel.className = "filter-combobox-chip-label";
    chipLabel.textContent = label;

    if (onRecenter) {
      chipLabel.setAttribute("role", "button");
      chipLabel.tabIndex = 0;
      chipLabel.setAttribute("aria-label", `Recenter map on ${label}`);
      const handleRecenter = (event) => {
        event.stopPropagation();
        onRecenter();
      };
      chipLabel.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      chipLabel.addEventListener("click", handleRecenter);
      chipLabel.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleRecenter(event);
      });
    }

    chipRemove.className = "filter-combobox-chip-remove";
    chipRemove.type = "button";
    chipRemove.setAttribute("aria-label", `Remove ${label}`);
    chipRemove.textContent = "×";
    chipRemove.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    if (onRemove) {
      chipRemove.addEventListener("click", (event) => {
        event.stopPropagation();
        onRemove();
      });
      chip.append(chipLabel, chipRemove);
    } else {
      chip.append(chipLabel);
    }

    if (datasetKey) {
      chip.dataset.key = datasetKey;
    }

    return chip;
  }

  function setComboboxOptions(select, options, { placeholder } = {}) {
    if (!select) return;

    const selectedValues = new Set(getFilterSelectValues(select));
    const placeholderText = placeholder || getComboboxPlaceholder(select);

    select.replaceChildren();

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholderText.endsWith("...")
      ? placeholderText
      : `${placeholderText}...`;
    select.append(placeholderOption);

    options.forEach((item) => {
      if (item.divider) {
        const dividerOption = document.createElement("option");
        dividerOption.disabled = true;
        dividerOption.dataset.comboboxDivider = "true";
        dividerOption.textContent = "";
        select.append(dividerOption);
        return;
      }

      const { label, value } = item;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = selectedValues.has(value);
      select.append(option);
    });
  }

  function getFilterSelectValue(select) {
    return getFilterSelectValues(select)[0] || "";
  }

  function setFilterSelectValue(select, value, { dispatch = true } = {}) {
    setFilterSelectValues(select, value ? [value] : []);
    if (dispatch) {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function enhanceFilterCombobox(select, {
    allowExclude = false,
    singleSelect = false,
    clearable = true,
    searchable = true,
    removableChips = null,
    closeOnSelect = null,
    onOpen = null,
    menuActions = null
  } = {}) {
    const field = select.closest(".filter-select-field");
    if (!field) return null;
    if (filterComboboxes.has(select)) return filterComboboxes.get(select);

    const canRemoveChips = removableChips ?? clearable;
    const shouldCloseOnSelect = closeOnSelect ?? singleSelect;
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
    let suppressOpenOnFocus = false;

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
    input.readOnly = !searchable;
    input.placeholder = placeholder;
    if (select.dataset.inputId) {
      input.id = select.dataset.inputId;
    }
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

    field.classList.toggle("is-not-clearable", !clearable);
    field.classList.toggle("is-single-select", singleSelect);

    control.append(chips, input);
    field.insertBefore(control, chevron || null);
    field.insertBefore(clearButton, chevron || null);
    menu.append(menuList);
    field.append(menu);

    const resolvedMenuActions = Array.isArray(menuActions) ? menuActions : [];

    if (resolvedMenuActions.length) {
      const menuFooter = document.createElement("div");
      menuFooter.className = "filter-combobox-menu-footer";

      const divider = document.createElement("div");
      divider.className = "filter-combobox-divider";
      divider.setAttribute("role", "separator");
      menuFooter.append(divider);

      resolvedMenuActions.forEach((action) => {
        const actionButton = document.createElement("button");
        actionButton.type = "button";
        actionButton.className = "filter-combobox-menu-action";

        if (action.icon) {
          const actionIcon = document.createElement("span");
          actionIcon.className = "filter-combobox-menu-action-icon";
          actionIcon.setAttribute("aria-hidden", "true");
          actionIcon.style.backgroundImage = `url("${action.icon}")`;

          const actionLabel = document.createElement("span");
          actionLabel.className = "filter-combobox-menu-action-label";
          actionLabel.textContent = action.label;
          actionButton.append(actionIcon, actionLabel);
        } else {
          actionButton.textContent = action.label;
        }

        actionButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        actionButton.addEventListener("click", () => {
          action.onClick?.();
          closeCombobox();
        });
        menuFooter.append(actionButton);
      });

      menu.append(menuFooter);
    }

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

      window.fitTooltipToContent?.(tooltip);

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
      positionOptionTooltip(event.currentTarget);
      getOptionTooltip().classList.add("is-visible");
    }

    function hideOptionTooltip() {
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
      suppressOpenOnFocus = true;
      input.focus({ preventScroll: true });
      suppressOpenOnFocus = false;
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
      const hasSelection = selectedOptions.length > 0;
      chips.innerHTML = "";

      if (singleSelect) {
        const selectedOption = selectedOptions[0] || null;

        if (isOpen && searchable) {
          input.value = searchQuery;
          input.placeholder = placeholder;
        } else if (selectedOption) {
          input.value = selectedOption.label;
          input.placeholder = "";
        } else {
          input.value = "";
          input.placeholder = placeholder;
        }

        field.classList.toggle("has-selection", hasSelection);
        clearButton.hidden = !clearable || !hasSelection;
        return;
      }

      selectedOptions.forEach((option) => {
        const excluded = allowExclude && isValueExcluded(option.value);
        chips.append(renderFilterChip({
          label: option.label,
          excluded,
          allowToggle: allowExclude,
          chipClickable: allowExclude,
          onToggleExclude: () => setValueExcluded(option.value, !excluded),
          onRemove: canRemoveChips ? () => removeSelectedValue(option.value) : null
        }));
      });

      input.placeholder = hasSelection ? "" : placeholder;
      field.classList.toggle("has-selection", hasSelection);
      clearButton.hidden = !clearable || !hasSelection;
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
      if (!singleSelect && currentValues.includes(value)) return;

      searchQuery = "";
      input.value = "";
      setFilterSelectValues(select, singleSelect ? [value] : [...currentValues, value]);
      setOptionExcluded(value, excluded);
      syncComboboxDisplay();
      if (isOpen) {
        renderComboboxOptions();
      }
      dispatchComboboxChange();

      if (shouldCloseOnSelect) {
        closeCombobox();
        input.blur();
        return;
      }

      input.focus({ preventScroll: true });
    }

    function shouldRenderComboboxOption(option, selectedValues, normalizedQuery) {
      if (option.divider) return false;

      const matchesQuery = normalizeComboboxText(option.label).includes(normalizedQuery);
      if (singleSelect) return matchesQuery;
      return !selectedValues.has(option.value) && matchesQuery;
    }

    function renderComboboxOptions() {
      const normalizedQuery = normalizeComboboxText(searchQuery);
      const selectedValues = new Set(getFilterSelectValues(select));
      const allOptions = getComboboxOptions(select);

      hideOptionTooltip();
      renderedOptions = allOptions.filter((option) => (
        shouldRenderComboboxOption(option, selectedValues, normalizedQuery)
      ));

      const visibleOptions = [];
      allOptions.forEach((option, index) => {
        if (option.divider) {
          const hasSelectableBefore = allOptions
            .slice(0, index)
            .some((candidate) => shouldRenderComboboxOption(candidate, selectedValues, normalizedQuery));
          const hasSelectableAfter = allOptions
            .slice(index + 1)
            .some((candidate) => shouldRenderComboboxOption(candidate, selectedValues, normalizedQuery));
          if (hasSelectableBefore && hasSelectableAfter) {
            visibleOptions.push(option);
          }
          return;
        }

        if (shouldRenderComboboxOption(option, selectedValues, normalizedQuery)) {
          visibleOptions.push(option);
        }
      });

      menuList.innerHTML = "";

      if (!visibleOptions.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "filter-combobox-empty";
        emptyState.textContent = "No results found";
        menuList.append(emptyState);
        setActiveOption(-1);
        return;
      }

      visibleOptions.forEach((option, index) => {
        if (option.divider) {
          const divider = document.createElement("div");
          divider.className = "filter-combobox-divider";
          divider.setAttribute("role", "separator");
          menuList.append(divider);
          return;
        }

        const optionButton = document.createElement(allowExclude ? "div" : "button");
        const optionLabel = document.createElement("span");
        optionButton.className = "filter-combobox-option";
        if (!allowExclude) {
          optionButton.type = "button";
        }
        optionButton.id = `${menuId}-${index}`;
        optionButton.dataset.value = option.value;
        optionButton.setAttribute("role", "option");
        const isSelected = selectedValues.has(option.value);
        optionButton.classList.toggle("is-selected", isSelected);
        optionButton.setAttribute("aria-selected", String(isSelected));
        optionLabel.className = "filter-combobox-option-label";
        optionLabel.textContent = option.label;

        if (singleSelect) {
          const optionCheck = document.createElement("span");
          optionCheck.className = "filter-combobox-option-check";
          optionCheck.setAttribute("aria-hidden", "true");
          optionButton.append(optionCheck, optionLabel);
        } else {
          optionButton.append(optionLabel);
        }

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

    function openCombobox({ selectInputText = searchable } = {}) {
      if (select.disabled) return;

      onOpen?.();
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

    input.addEventListener("mousedown", () => {
      if (singleSelect || isOpen || select.disabled) return;

      openCombobox({ selectInputText: searchable });
    });

    input.addEventListener("focus", () => {
      if (singleSelect || suppressOpenOnFocus || isOpen) return;

      openCombobox({ selectInputText: searchable });
    });

    input.addEventListener("input", () => {
      if (!searchable) return;

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
        if (!canRemoveChips) return;

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
      if (!clearable) return;

      setSelectedValues([]);
      input.focus({ preventScroll: true });
    });

    menuList.addEventListener("scroll", hideOptionTooltip);
    window.addEventListener("resize", hideOptionTooltip);

    if (singleSelect) {
      control.addEventListener("mousedown", (event) => {
        if (select.disabled || clearButton.contains(event.target)) return;

        event.preventDefault();

        if (isOpen) {
          closeCombobox();
          input.blur();
          return;
        }

        openCombobox({ selectInputText: searchable });
        input.focus({ preventScroll: true });
      });
    }

    field.addEventListener("mousedown", (event) => {
      if (singleSelect) return;

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
      getValue: () => getFilterSelectValue(select),
      setValue(value, options = {}) {
        setFilterSelectValue(select, value, options);
        syncComboboxDisplay();
        if (isOpen) {
          renderComboboxOptions();
        }
      },
      reset(value = "") {
        closeCombobox({ restoreDisplay: false });
        setFilterSelectValues(select, value ? [value] : []);
        syncComboboxDisplay();
      },
      setOptions(options, optionsConfig = {}) {
        setComboboxOptions(select, options, optionsConfig);
        syncComboboxDisplay();
        if (isOpen) {
          renderComboboxOptions();
        }
      },
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

  function closeComboboxesInSection(section) {
    section?.querySelectorAll(".filter-field-select").forEach((select) => {
      filterComboboxes.get(select)?.close();
    });
  }

  function bindComboboxOutsideClick(onOutside) {
    document.addEventListener("mousedown", (event) => {
      filterComboboxes.forEach((combobox, select) => {
        const field = select.closest(".filter-select-field");
        if (!field?.contains(event.target)) {
          combobox.close();
        }
      });

      onOutside?.(event);
    });
  }

  window.WefranchFilterCombobox = {
    enhance: enhanceFilterCombobox,
    getOptions: getComboboxOptions,
    getValue: getFilterSelectValue,
    getValues: getFilterSelectValues,
    getIncludedValues: getFilterSelectIncludedValues,
    getExcludedValues: getFilterSelectExcludedValues,
    setValue: setFilterSelectValue,
    setValues: setFilterSelectValues,
    setOptions: setComboboxOptions,
    setIncludedExcludedValues: setFilterSelectIncludedExcludedValues,
    syncAll: syncFilterComboboxes,
    getCombobox: (select) => filterComboboxes.get(select),
    closeComboboxesInSection,
    bindOutsideClick: bindComboboxOutsideClick,
    renderChip: renderFilterChip,
    normalizeText: normalizeComboboxText
  };

  window.normalizeComboboxText = normalizeComboboxText;
})();
