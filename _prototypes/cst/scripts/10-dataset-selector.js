const DATASET_SELECTOR_PLACEHOLDER = "Select dataset";

function getDatasetSelectorOptions() {
  return [...DATASET_SELECTOR_VIEWS].map((viewKey) => ({
    viewKey,
    label: TABLE_VIEW_OPTIONS[viewKey]?.label || viewKey
  }));
}

function initDatasetSelector() {
  if (!datasetSelector || !datasetSelectorTrigger || !datasetSelectorOptions) {
    return null;
  }

  function syncDisplay() {
    const isDatasetView = isDatasetSelectorView();
    const selectedLabel = isDatasetView
      ? (TABLE_VIEW_OPTIONS[currentTableView]?.label || DATASET_SELECTOR_PLACEHOLDER)
      : DATASET_SELECTOR_PLACEHOLDER;

    datasetSelector.setAttribute("data-dataset-active", String(isDatasetView));
    datasetSelectorTrigger.setAttribute("data-dataset-active", String(isDatasetView));

    if (datasetSelectorLabel) {
      datasetSelectorLabel.textContent = selectedLabel;
    }

    datasetSelectorOptions.querySelectorAll(".dataset-selector-option").forEach((option) => {
      const isSelected = option.dataset.tableView === currentTableView;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-checked", String(isSelected));
    });
  }

  function renderOptions() {
    datasetSelectorOptions.innerHTML = "";

    getDatasetSelectorOptions().forEach((option, index) => {
      const optionButton = document.createElement("button");
      const optionLabel = document.createElement("span");
      const optionCheck = document.createElement("img");
      const isSelected = option.viewKey === currentTableView;

      optionButton.type = "button";
      optionButton.className = "ui-menu-item toolbar-dropdown-option dataset-selector-option";
      optionButton.id = `datasetSelectorOption-${index}`;
      optionButton.dataset.tableView = option.viewKey;
      optionButton.setAttribute("role", "menuitemradio");
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-checked", String(isSelected));

      optionLabel.className = "toolbar-dropdown-label";
      optionLabel.textContent = option.label;

      optionCheck.className = "dataset-selector-option-check";
      optionCheck.src = "assets/check.svg";
      optionCheck.alt = "";
      optionCheck.setAttribute("aria-hidden", "true");

      optionButton.append(optionLabel, optionCheck);

      optionButton.addEventListener("click", () => {
        setMainTableView(option.viewKey);
        if (typeof dismissOpenCstSplash === "function") {
          dismissOpenCstSplash();
        }
        close();
      });

      datasetSelectorOptions.append(optionButton);
    });
  }

  function close() {
    datasetSelector.classList.remove("is-open");
    datasetSelectorTrigger.setAttribute("aria-expanded", "false");
    if (toolbarDropdown?.contains(datasetSelector)) {
      toolbarDropdown.removeAttribute("open");
    }
  }

  function sync() {
    syncDisplay();
  }

  renderOptions();
  datasetSelectorApi = { close, sync };
  syncDisplay();

  return datasetSelectorApi;
}
