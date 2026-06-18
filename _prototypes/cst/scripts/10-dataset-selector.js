const DATASET_SELECTOR_PLACEHOLDER = "Select dataset...";

function getDatasetSelectorOptions() {
  return [...DATASET_SELECTOR_VIEWS].map((viewKey) => ({
    viewKey,
    label: TABLE_VIEW_OPTIONS[viewKey]?.label || viewKey
  }));
}

function initDatasetSelector() {
  if (!datasetSelector || !datasetSelectorField || !datasetSelectorInput || !datasetSelectorClear || !datasetSelectorOptions) {
    return null;
  }

  const menu = document.getElementById("datasetSelectorMenu");
  const allOptions = getDatasetSelectorOptions();
  let isOpen = false;
  let searchQuery = "";
  let activeOptionIndex = -1;
  let renderedOptions = [];

  function setActiveOption(index) {
    const optionButtons = Array.from(datasetSelectorOptions.querySelectorAll(".dataset-selector-option"));
    if (!optionButtons.length) {
      activeOptionIndex = -1;
      datasetSelectorInput.removeAttribute("aria-activedescendant");
      return;
    }

    activeOptionIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeOptionIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive) {
        datasetSelectorInput.setAttribute("aria-activedescendant", optionButton.id);
        optionButton.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function syncInputDisplay() {
    const isDatasetView = isDatasetSelectorView();

    datasetSelector.setAttribute("data-dataset-active", String(isDatasetView));
    datasetSelectorField.classList.toggle("has-selection", isDatasetView);
    datasetSelectorClear.hidden = !isDatasetView;

    if (!isOpen) {
      if (isDatasetView) {
        datasetSelectorInput.value = TABLE_VIEW_OPTIONS[currentTableView]?.label || "";
        datasetSelectorInput.placeholder = "";
      } else {
        datasetSelectorInput.value = "";
        datasetSelectorInput.placeholder = DATASET_SELECTOR_PLACEHOLDER;
      }
    }

    datasetSelectorOptions.querySelectorAll(".dataset-selector-option").forEach((option) => {
      const isSelected = option.dataset.tableView === currentTableView;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
  }

  function renderOptions() {
    const normalizedQuery = normalizeComboboxText(searchQuery);
    renderedOptions = allOptions.filter((option) => (
      normalizeComboboxText(option.label).includes(normalizedQuery)
    ));

    datasetSelectorOptions.innerHTML = "";

    if (!renderedOptions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "dataset-selector-empty";
      emptyState.textContent = "No results found";
      datasetSelectorOptions.append(emptyState);
      activeOptionIndex = -1;
      datasetSelectorInput.removeAttribute("aria-activedescendant");
      return;
    }

    renderedOptions.forEach((option, index) => {
      const optionButton = document.createElement("button");
      const optionLabel = document.createElement("span");
      const optionCheck = document.createElement("img");
      const isSelected = option.viewKey === currentTableView;

      optionButton.type = "button";
      optionButton.className = "ui-menu-item toolbar-dropdown-option dataset-selector-option";
      optionButton.id = `datasetSelectorOption-${index}`;
      optionButton.dataset.tableView = option.viewKey;
      optionButton.setAttribute("role", "option");
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", String(isSelected));

      optionLabel.className = "toolbar-dropdown-label";
      optionLabel.textContent = option.label;

      optionCheck.className = "dataset-selector-option-check";
      optionCheck.src = "assets/check.svg";
      optionCheck.alt = "";
      optionCheck.setAttribute("aria-hidden", "true");

      optionButton.append(optionLabel, optionCheck);

      optionButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      optionButton.addEventListener("click", () => {
        setMainTableView(option.viewKey);
        close({ restoreDisplay: true });
        datasetSelectorInput.blur();
      });

      datasetSelectorOptions.append(optionButton);
    });

    if (activeOptionIndex >= renderedOptions.length) {
      activeOptionIndex = -1;
    }

    if (activeOptionIndex >= 0) {
      setActiveOption(activeOptionIndex);
    } else {
      datasetSelectorInput.removeAttribute("aria-activedescendant");
    }
  }

  function open({ selectInputText = false } = {}) {
    isOpen = true;
    searchQuery = "";
    datasetSelectorInput.value = "";
    datasetSelectorField.classList.add("is-open");
    datasetSelectorInput.setAttribute("aria-expanded", "true");
    renderOptions();

    if (selectInputText) {
      datasetSelectorInput.focus({ preventScroll: true });
    }
  }

  function close({ restoreDisplay = true } = {}) {
    if (!isOpen) return;

    isOpen = false;
    searchQuery = "";
    activeOptionIndex = -1;
    datasetSelectorField.classList.remove("is-open");
    datasetSelectorInput.setAttribute("aria-expanded", "false");
    datasetSelectorInput.removeAttribute("aria-activedescendant");

    if (restoreDisplay) {
      syncInputDisplay();
    }
  }

  function sync() {
    syncInputDisplay();
    if (isOpen) {
      renderOptions();
    }
  }

  datasetSelectorInput.addEventListener("focus", () => {
    open({ selectInputText: true });
  });

  datasetSelectorInput.addEventListener("input", () => {
    searchQuery = datasetSelectorInput.value;

    if (!isOpen) {
      isOpen = true;
      datasetSelectorField.classList.add("is-open");
      datasetSelectorInput.setAttribute("aria-expanded", "true");
    }

    renderOptions();
  });

  datasetSelectorInput.addEventListener("keydown", (event) => {
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
      setMainTableView(renderedOptions[activeOptionIndex].viewKey);
      close({ restoreDisplay: true });
      datasetSelectorInput.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreDisplay: true });
      datasetSelectorInput.blur();
    }
  });

  datasetSelectorInput.addEventListener("blur", () => {
    window.setTimeout(() => close({ restoreDisplay: true }), 100);
  });

  datasetSelectorClear.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  datasetSelectorClear.addEventListener("click", () => {
    setMainTableView("owners");
    close({ restoreDisplay: true });
    datasetSelectorInput.blur();
  });

  datasetSelectorField.addEventListener("mousedown", (event) => {
    if (
      event.target === datasetSelectorInput ||
      menu?.contains(event.target) ||
      datasetSelectorClear.contains(event.target)
    ) {
      return;
    }

    const wasOpen = isOpen;
    event.preventDefault();
    datasetSelectorInput.focus({ preventScroll: true });

    if (wasOpen) {
      close({ restoreDisplay: true });
    } else {
      open({ selectInputText: true });
    }
  });

  datasetSelectorApi = { close, sync };
  syncInputDisplay();

  return datasetSelectorApi;
}
