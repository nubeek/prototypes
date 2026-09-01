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

  function sectionShouldShowSelectionPreview(section) {
    if (section.querySelector(".filter-range-slider:not(.filter-radius-slider)")) {
      return true;
    }

    return Boolean(section.querySelector(
      ".filter-check:not(.filter-radius-toggle) :is(input[type='checkbox'], input[type='radio'])"
    ));
  }

  function getDefaultSelectionLabel(section) {
    const checkboxLabels = Array.from(
      section.querySelectorAll(".filter-check:not(.filter-radius-toggle) :is(input[type='checkbox'], input[type='radio']):checked")
    ).map((input) => {
      const check = input.closest(".filter-check");
      return check?.querySelector(".filter-rating-label")?.textContent?.trim()
        || check?.querySelector("span:last-child")?.textContent?.trim();
    }).filter(Boolean);

    if (checkboxLabels.length) {
      return checkboxLabels.join(", ");
    }

    const numberInputs = Array.from(section.querySelectorAll(".filter-number-input"));
    if (numberInputs.length < 2) return "";

    const minInput = numberInputs[0];
    const maxInput = numberInputs[1];
    const minText = minInput.value?.trim();
    const maxText = maxInput.value?.trim();
    if (!minText || !maxText) return "";

    const prefix = minInput.classList.contains("filter-number-input--currency") ? "$" : "";
    return `${prefix}${minText} – ${prefix}${maxText}`;
  }

  function renderSelectionPreview(selection, section, label) {
    const filledCount = section
      .querySelector(".filter-check.is-checked .filter-rating-stars")
      ?.querySelectorAll(".filter-rating-star.is-filled").length ?? 0;

    selection.replaceChildren();

    if (filledCount > 0) {
      const stars = document.createElement("span");
      stars.className = "filter-rating-stars";
      stars.setAttribute("aria-hidden", "true");

      for (let index = 0; index < filledCount; index += 1) {
        const star = document.createElement("span");
        star.className = "filter-rating-star is-filled";
        stars.append(star);
      }

      selection.append(stars);
    }

    if (label) {
      const text = document.createElement("span");
      text.className = "filter-section-selection-label";
      text.textContent = label;
      selection.append(text);
    }
  }

  function enhanceHeaders(panel, {
    iconSrc = window.resolvePublicAssetUrl?.("../../assets/icons/remove.svg") || "../../assets/icons/remove.svg",
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
      const wantsSelection = selectionSectionKeys.includes(selectionKey)
        || (!selectionSectionKeys.length && sectionShouldShowSelectionPreview(section));
      if (wantsSelection && !section.querySelector(".filter-section-selection")) {
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

  function isSectionExpanded(section) {
    return Boolean(section && !section.classList.contains("filter-section-collapsed"));
  }

  function setSectionExpanded(section, isExpanded) {
    if (!section) return;

    const nextExpanded = Boolean(isExpanded);
    section.classList.toggle("filter-section-collapsed", !nextExpanded);
    section.querySelector(".filter-section-title")?.setAttribute("aria-expanded", String(nextExpanded));
    section.querySelector(".filter-section-toggle")?.setAttribute("aria-expanded", String(nextExpanded));

    if (!nextExpanded) {
      window.WefranchFilterCombobox?.closeComboboxesInSection?.(section);
    }
  }

  function syncExpandedState(panel) {
    if (!panel) return;

    panel.querySelectorAll(".filter-section").forEach((section) => {
      setSectionExpanded(section, isSectionExpanded(section));
    });
  }

  // Shared rule: changing filter values must never collapse a section.
  // `preserve` only opens matching sections. `reset` is for explicit defaults
  // such as Clear all or returning to the splash/crossroad.
  function applyExpansion(panel, { shouldExpand, mode = "preserve" } = {}) {
    if (!panel || typeof shouldExpand !== "function") return;

    panel.querySelectorAll(".filter-section").forEach((section) => {
      const wantExpand = Boolean(shouldExpand(section));
      if (mode === "preserve") {
        if (wantExpand) setSectionExpanded(section, true);
        return;
      }

      setSectionExpanded(section, wantExpand);
    });
  }

  function scrollExpandedFilterSectionIntoView(panel, section) {
    if (!panel || !section) return;

    const scrollContainer = panel.querySelector(".filter-scroll");
    if (!scrollContainer) return;

    const scrollBehavior = (
      window.wefranchReduceMotion?.isEnabled?.()
      || document.documentElement.classList.contains("is-reduce-motion")
      || document.body.classList.contains("reduce-motion")
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      ? "auto"
      : "smooth";

    window.requestAnimationFrame(() => {
      const padding = 12;
      const actions = panel.querySelector(".filter-actions");
      const obstructionTop = actions?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const headerBottom = scrollContainer
        .querySelector(".filter-header")
        ?.getBoundingClientRect().bottom ?? scrollContainer.getBoundingClientRect().top;
      const sectionRect = section.getBoundingClientRect();
      let targetScrollTop = scrollContainer.scrollTop;

      if (sectionRect.bottom > obstructionTop - padding) {
        targetScrollTop += sectionRect.bottom - (obstructionTop - padding);
      }

      const scrollDelta = targetScrollTop - scrollContainer.scrollTop;
      const adjustedTop = sectionRect.top - scrollDelta;

      if (adjustedTop < headerBottom + padding) {
        targetScrollTop += adjustedTop - (headerBottom + padding);
      }

      targetScrollTop = Math.max(0, targetScrollTop);

      if (targetScrollTop !== scrollContainer.scrollTop) {
        scrollContainer.scrollTo({ top: targetScrollTop, behavior: scrollBehavior });
      }
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

      const isExpanded = !isSectionExpanded(section);
      setSectionExpanded(section, isExpanded);

      if (isExpanded) {
        scrollExpandedFilterSectionIntoView(panel, section);
      }

      onToggle?.(section, { isCollapsed: !isExpanded, isExpanded });
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

      if (selection) {
        const label = typeof getSelectionLabel === "function"
          ? getSelectionLabel(section)
          : getDefaultSelectionLabel(section);
        renderSelectionPreview(selection, section, label);
        selection.hidden = !hasFilters || !label;
      }

      section.classList.toggle("has-selection", hasFilters);
    });
  }

  window.WefranchFilterSections = {
    enhanceHeaders,
    isSectionExpanded,
    setSectionExpanded,
    applyExpansion,
    syncExpandedState,
    bindCollapseToggle,
    scrollExpandedSectionIntoView: scrollExpandedFilterSectionIntoView,
    updateClearButtons,
    hideClearTooltip
  };
})();
