(function () {
  const DEFAULT_HIDE_DELAY_MS = 300;

  function positionActionTooltip(trigger, tooltip) {
    window.fitTooltipToContent?.(tooltip);

    const targetRect = trigger.getBoundingClientRect();
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

  function bindActionTooltip(trigger, options = {}) {
    if (!trigger) return;

    const {
      templateId = trigger.dataset.tooltipTemplate,
      tooltipText = trigger.dataset.tooltip,
      tooltipClass = "",
      hideDelayMs = DEFAULT_HIDE_DELAY_MS,
      onlyBelowWidth
    } = options;

    if (!templateId && !tooltipText) return;

    let tooltip = null;
    let hideTimeoutId = null;
    let isVisible = false;

    const shouldShow = () => !onlyBelowWidth || window.innerWidth <= onlyBelowWidth;

    const getTooltip = () => {
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = `filter-combobox-floating-tooltip is-action-tooltip${tooltipClass ? ` ${tooltipClass}` : ""}`;
        tooltip.setAttribute("role", "tooltip");
      }

      return tooltip;
    };

    const setTooltipContent = (el) => {
      if (templateId) {
        const template = document.getElementById(templateId);
        if (!template) return false;

        el.replaceChildren(...template.content.cloneNode(true).childNodes);
        return true;
      }

      if (tooltipText) {
        el.textContent = tooltipText;
        return true;
      }

      return false;
    };

    const clearHideTimeout = () => {
      if (!hideTimeoutId) return;
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    };

    const hideTooltip = () => {
      clearHideTimeout();
      isVisible = false;
      tooltip?.classList.remove("is-visible");
    };

    const showTooltipNow = () => {
      if (trigger.hidden || !shouldShow()) return;

      clearHideTimeout();

      const el = getTooltip();
      if (!setTooltipContent(el)) return;

      if (!el.isConnected) {
        document.body.append(el);
      }

      el.style.left = "0px";
      el.style.top = "0px";
      el.classList.add("is-visible");
      isVisible = true;
      positionActionTooltip(trigger, el);
    };

    const scheduleHideTooltip = () => {
      clearHideTimeout();
      hideTimeoutId = window.setTimeout(hideTooltip, hideDelayMs);
    };

    const isTooltipNode = (node) => (
      node instanceof Node && tooltip?.contains(node)
    );

    const isTriggerNode = (node) => (
      node instanceof Node && (trigger === node || trigger.contains(node))
    );

    const handlePointerLeave = (event) => {
      const relatedTarget = event.relatedTarget;
      if (isTooltipNode(relatedTarget) || isTriggerNode(relatedTarget)) return;
      scheduleHideTooltip();
    };

    trigger.addEventListener("mouseenter", showTooltipNow);
    trigger.addEventListener("mouseleave", handlePointerLeave);
    trigger.addEventListener("focus", showTooltipNow);
    trigger.addEventListener("blur", handlePointerLeave);

    getTooltip().addEventListener("mouseenter", clearHideTimeout);
    getTooltip().addEventListener("mouseleave", handlePointerLeave);
    getTooltip().addEventListener("focusin", clearHideTimeout);
    getTooltip().addEventListener("focusout", handlePointerLeave);

    window.addEventListener("resize", hideTooltip);
    document.addEventListener("scroll", hideTooltip, true);
  }

  window.bindActionTooltip = bindActionTooltip;
})();
