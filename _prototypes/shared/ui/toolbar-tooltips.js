/* Hover labels for icon-only toolbar buttons. Set data-tooltip on the
   control. A visible text label suppresses the tip, so below 980px — where
   those labels are hidden — the same buttons pick the tip up.
   Quick search adds data-tooltip-shortcut ("⌘K" / "Ctrl+K") at bind time. */
(function () {
  const TOOLBAR_CONTROL_SELECTOR = ".header .toolbar-btn, .header .toolbar-split__search, .header .cst-splash-new-search__trigger";

  let tooltip = null;
  let current = null;

  function getTooltip() {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "filter-combobox-floating-tooltip is-toolbar-tooltip";
      tooltip.setAttribute("role", "tooltip");
    }

    return tooltip;
  }

  function isShown(element) {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function hasVisibleLabel(control) {
    for (const node of control.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
      if (!(node instanceof HTMLElement)) continue;
      if (node.tagName === "IMG") continue;
      if (node.classList.contains("toolbar-chevron")) continue;
      if (node.getAttribute("aria-hidden") === "true") continue;
      if (!isShown(node)) continue;
      if (node.textContent.trim()) return true;
    }

    return false;
  }

  function getToolbarTooltipControl(node) {
    if (!(node instanceof Element)) return null;

    const control = node.closest(TOOLBAR_CONTROL_SELECTOR);
    if (!control || control.closest(".ui-menu, .toolbar-tab-dropdown")) return null;
    if (!control.dataset.tooltip) return null;
    if (control.hidden || control.closest("[hidden]")) return null;
    if (!control.getClientRects().length) return null;
    if (control.closest("details[open], .toolbar-tab-item.is-open")) return null;
    if (hasVisibleLabel(control)) return null;

    return control;
  }

  function tooltipTextFor(control) {
    const label = control.dataset.tooltip.trim();
    const shortcut = control.dataset.tooltipShortcut?.trim();
    if (!label) return "";
    return shortcut ? `${label} (${shortcut})` : label;
  }

  function positionToolbarTooltip(control, el) {
    window.fitTooltipToContent?.(el);

    const targetRect = control.getBoundingClientRect();
    const tooltipRect = el.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    // The toolbar sits under the site header, so tips open downward.
    let top = targetRect.bottom + gap;
    if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - gap);
    }

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function hideToolbarTooltip() {
    current = null;
    tooltip?.classList.remove("is-visible");
  }

  function showToolbarTooltip(control) {
    const text = tooltipTextFor(control);
    if (!text) return;

    current = control;
    const el = getTooltip();
    el.textContent = text;

    if (!el.isConnected) document.body.append(el);

    el.classList.remove("is-visible");
    el.style.left = "0px";
    el.style.top = "0px";
    positionToolbarTooltip(control, el);
    el.classList.add("is-visible");
  }

  document.addEventListener("mouseover", (event) => {
    const control = getToolbarTooltipControl(event.target);
    if (control === current) return;
    if (!control) {
      if (current && !current.contains(event.target)) hideToolbarTooltip();
      return;
    }
    showToolbarTooltip(control);
  });

  document.addEventListener("mouseout", (event) => {
    if (!current) return;
    const control = getToolbarTooltipControl(event.target);
    if (control !== current) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && current.contains(relatedTarget)) return;

    hideToolbarTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const control = getToolbarTooltipControl(event.target);
    if (!control) return;
    showToolbarTooltip(control);
  });

  document.addEventListener("focusout", (event) => {
    if (!current) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && current.contains(relatedTarget)) return;
    hideToolbarTooltip();
  });

  document.addEventListener("pointerdown", (event) => {
    const control = getToolbarTooltipControl(event.target);
    if (control && control === current) hideToolbarTooltip();
  });

  document.addEventListener("scroll", hideToolbarTooltip, true);
  window.addEventListener("resize", hideToolbarTooltip);

  document.querySelectorAll(".header").forEach((header) => {
    const observer = new MutationObserver(() => {
      if (current && !getToolbarTooltipControl(current)) hideToolbarTooltip();
    });
    observer.observe(header, {
      attributes: true,
      attributeFilter: ["class", "open", "hidden"],
      subtree: true
    });
  });
})();
