(function () {
  let clearTooltip = null;

  function getClearTooltip() {
    if (!clearTooltip) {
      clearTooltip = document.createElement("div");
      clearTooltip.className = "filter-combobox-floating-tooltip";
    }

    return clearTooltip;
  }

  function positionClearTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = getClearTooltip();
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

  function showClearTooltip(event) {
    positionClearTooltip(event.currentTarget);
    getClearTooltip().classList.add("is-visible");
  }

  function hideClearTooltip() {
    clearTooltip?.classList.remove("is-visible");
  }

  function bindClearTooltip(button) {
    button.addEventListener("mouseenter", showClearTooltip);
    button.addEventListener("mouseleave", hideClearTooltip);
    button.addEventListener("focus", showClearTooltip);
    button.addEventListener("blur", hideClearTooltip);
    button.addEventListener("click", hideClearTooltip);
  }

  function enhanceHeaders(panel, {
    iconSrc = "../shared/filter/assets/remove.svg",
    onClear,
    selectionSectionKeys = []
  } = {}) {
    if (!panel) return;

    panel.querySelectorAll(".filter-section").forEach((section) => {
      const title = section.querySelector(":scope > .filter-section-title");
      if (!title || section.querySelector(".filter-section-header")) return;

      const label = title.querySelector("span")?.textContent?.trim() || "filters";
      const chevron = title.querySelector("img");
      const header = document.createElement("div");
      header.className = "filter-section-header";

      const clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "ui-control ui-button-ghost filter-section-clear";
      clearButton.setAttribute("aria-label", `Clear ${label}`);
      clearButton.dataset.tooltip = "Clear filter";
      clearButton.hidden = true;

      const clearIcon = document.createElement("img");
      clearIcon.src = iconSrc;
      clearIcon.alt = "";
      clearIcon.setAttribute("aria-hidden", "true");
      clearButton.append(clearIcon);
      bindClearTooltip(clearButton);

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "ui-control ui-button-ghost filter-section-toggle";
      toggleButton.setAttribute("aria-label", `Toggle ${label}`);
      toggleButton.setAttribute("aria-expanded", title.getAttribute("aria-expanded") || "false");
      if (chevron) toggleButton.appendChild(chevron);

      const labelNode = title.querySelector("span");
      title.replaceChildren(labelNode || document.createTextNode(label));

      section.insertBefore(header, title);
      header.append(title, clearButton, toggleButton);

      const selectionKey = section.dataset.filterSection;
      if (selectionSectionKeys.includes(selectionKey)
        && !section.querySelector(".filter-section-selection")) {
        const selection = document.createElement("div");
        selection.className = "filter-section-selection";
        selection.hidden = true;
        header.after(selection);
      }

      clearButton.addEventListener("click", (event) => {
        event.stopPropagation();
        onClear?.(section);
      });
    });
  }

  function syncExpandedState(panel) {
    if (!panel) return;

    panel.querySelectorAll(".filter-section").forEach((section) => {
      const isExpanded = !section.classList.contains("filter-section-collapsed");
      section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(isExpanded));
      section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", String(isExpanded));
    });
  }

  function bindCollapseToggle(panel, {
    onToggle,
    onClearIgnored = true
  } = {}) {
    if (!panel) return;

    syncExpandedState(panel);

    panel.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      if (onClearIgnored && event.target.closest(".filter-section-clear")) return;

      const title = event.target.closest(".filter-section-title");
      const toggle = event.target.closest(".filter-section-toggle");
      if (!title && !toggle) return;
      if (!panel.contains(title || toggle)) return;

      const section = (title || toggle)?.closest(".filter-section");
      if (!section) return;

      const titleButton = section.querySelector(".filter-section-title");
      const toggleButton = section.querySelector(".filter-section-toggle");
      const isCollapsed = section.classList.toggle("filter-section-collapsed");
      const isExpanded = !isCollapsed;

      titleButton?.setAttribute("aria-expanded", String(isExpanded));
      toggleButton?.setAttribute("aria-expanded", String(isExpanded));

      if (isCollapsed) {
        window.WefranchFilterCombobox?.closeComboboxesInSection?.(section);
      }

      onToggle?.(section, { isCollapsed, isExpanded });
    });
  }

  function updateClearButtons(panel, hasAppliedFilters, {
    getSelectionLabel
  } = {}) {
    if (!panel || typeof hasAppliedFilters !== "function") return;

    panel.querySelectorAll(".filter-section").forEach((section) => {
      const hasFilters = hasAppliedFilters(section);
      const clearButton = section.querySelector(".filter-section-clear");
      const selection = section.querySelector(".filter-section-selection");

      if (clearButton) {
        clearButton.hidden = !hasFilters;
        if (!hasFilters) hideClearTooltip();
      }

      if (selection && typeof getSelectionLabel === "function") {
        const label = getSelectionLabel(section);
        selection.textContent = label;
        selection.hidden = !label;
      }

      section.classList.toggle("has-selection", hasFilters);
    });
  }

  window.WefranchFilterSections = {
    enhanceHeaders,
    syncExpandedState,
    bindCollapseToggle,
    updateClearButtons,
    hideClearTooltip
  };
})();
