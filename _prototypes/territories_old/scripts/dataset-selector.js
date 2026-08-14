function initTerritoryDatasetSelector() {
  const selector = document.getElementById("territoryDatasetSelector");
  const field = selector?.querySelector(".dataset-selector-field");
  const button = document.getElementById("territoryDatasetSelectorButton");
  const menu = document.getElementById("territoryDatasetSelectorMenu");
  const optionsContainer = document.getElementById("territoryDatasetSelectorOptions");
  const datasetsApi = window.territoryDatasets;

  if (!selector || !field || !button || !menu || !optionsContainer || !datasetsApi) {
    return;
  }

  let isOpen = false;
  let activeOptionIndex = -1;

  function getOptionButtons() {
    return Array.from(optionsContainer.querySelectorAll(".dataset-selector-option"));
  }

  function setActiveOption(index, { focus = false } = {}) {
    const optionButtons = getOptionButtons();
    if (!optionButtons.length) {
      activeOptionIndex = -1;
      return;
    }

    activeOptionIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeOptionIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive && focus) {
        optionButton.focus({ preventScroll: true });
      }
    });
  }

  function sync() {
    const activeDataset = datasetsApi.getActive();
    button.textContent = activeDataset.label;
    button.setAttribute("aria-label", `Dataset: ${activeDataset.label}`);

    getOptionButtons().forEach((optionButton) => {
      const isSelected = optionButton.dataset.datasetId === activeDataset.id;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", String(isSelected));
    });
  }

  function close({ restoreFocus = false } = {}) {
    if (!isOpen) return;

    isOpen = false;
    activeOptionIndex = -1;
    field.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    getOptionButtons().forEach((optionButton) => optionButton.classList.remove("is-active"));

    if (restoreFocus) {
      button.focus({ preventScroll: true });
    }
  }

  function open() {
    if (isOpen) return;

    isOpen = true;
    field.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    document.getElementById("territoryMenuDropdown")?.removeAttribute("open");

    const selectedIndex = getOptionButtons().findIndex((optionButton) => (
      optionButton.dataset.datasetId === datasetsApi.getActive().id
    ));
    setActiveOption(selectedIndex >= 0 ? selectedIndex : 0);
  }

  function chooseDataset(datasetId) {
    close();
    datasetsApi.setActive(datasetId);
    sync();
    button.focus({ preventScroll: true });
  }

  datasetsApi.order.forEach((datasetId) => {
    const dataset = datasetsApi.all[datasetId];
    if (!dataset) return;

    const optionButton = document.createElement("button");
    const optionLabel = document.createElement("span");
    const optionCheck = document.createElement("img");

    optionButton.type = "button";
    optionButton.className = "ui-menu-item toolbar-dropdown-option dataset-selector-option";
    optionButton.dataset.datasetId = dataset.id;
    optionButton.setAttribute("role", "option");

    optionLabel.className = "toolbar-dropdown-label";
    optionLabel.textContent = dataset.label;

    optionCheck.className = "dataset-selector-option-check";
    optionCheck.src = "../cst/assets/check.svg";
    optionCheck.alt = "";
    optionCheck.setAttribute("aria-hidden", "true");

    optionButton.append(optionLabel, optionCheck);
    optionButton.addEventListener("click", () => chooseDataset(dataset.id));
    optionsContainer.append(optionButton);
  });

  button.addEventListener("click", () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
      const optionButtons = getOptionButtons();
      const startIndex = event.key === "ArrowDown" ? 0 : optionButtons.length - 1;
      setActiveOption(activeOptionIndex >= 0 ? activeOptionIndex : startIndex, { focus: true });
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  optionsContainer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOption(activeOptionIndex + (event.key === "ArrowDown" ? 1 : -1), { focus: true });
    } else if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreFocus: true });
    } else if (event.key === "Tab") {
      close();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!selector.contains(event.target)) {
      close();
    }
  });

  window.addEventListener("territorydatasetchange", sync);
  sync();
}

initTerritoryDatasetSelector();
