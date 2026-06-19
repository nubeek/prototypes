const PROSPECT_CONTACT_ACTION_SELECTOR =
  ".prospect-dataset-row .contact-hide-results-action, .prospect-dataset-row .contact-add-lead-action";

let contactActionFloatingTooltip = null;
let contactActionFloatingTooltipTarget = null;

function getContactActionFloatingTooltip() {
  if (!contactActionFloatingTooltip) {
    contactActionFloatingTooltip = document.createElement("div");
    contactActionFloatingTooltip.className = "filter-combobox-floating-tooltip contact-action-floating-tooltip";
    contactActionFloatingTooltip.setAttribute("role", "tooltip");
  }

  return contactActionFloatingTooltip;
}

function positionContactActionFloatingTooltip(target) {
  const tooltipText = target.dataset.tooltip;
  if (!tooltipText) return;

  const tooltip = getContactActionFloatingTooltip();
  tooltip.textContent = tooltipText;

  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  tooltip.classList.add("is-visible");

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

function showContactActionFloatingTooltip(target) {
  if (!(target instanceof Element)) return;
  contactActionFloatingTooltipTarget = target;
  positionContactActionFloatingTooltip(target);
}

function hideContactActionFloatingTooltip() {
  contactActionFloatingTooltipTarget = null;
  contactActionFloatingTooltip?.classList.remove("is-visible");
}

function getProspectContactActionButton(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(PROSPECT_CONTACT_ACTION_SELECTOR);
}

function initProspectContactActionTooltips() {
  if (!tableBody) return;

  tableBody.addEventListener("mouseover", (event) => {
    const button = getProspectContactActionButton(event.target);
    if (!button || button === contactActionFloatingTooltipTarget) return;
    showContactActionFloatingTooltip(button);
  });

  tableBody.addEventListener("mouseout", (event) => {
    const button = getProspectContactActionButton(event.target);
    if (!button || button !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;

    hideContactActionFloatingTooltip();
  });

  tableBody.addEventListener("focusin", (event) => {
    const button = getProspectContactActionButton(event.target);
    if (!button) return;
    showContactActionFloatingTooltip(button);
  });

  tableBody.addEventListener("focusout", (event) => {
    const button = getProspectContactActionButton(event.target);
    if (!button || button !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;

    hideContactActionFloatingTooltip();
  });

  tableBody.addEventListener("click", (event) => {
    if (getProspectContactActionButton(event.target)) {
      hideContactActionFloatingTooltip();
    }
  });

  tableWrap?.addEventListener("scroll", hideContactActionFloatingTooltip, { passive: true });
  window.addEventListener("resize", hideContactActionFloatingTooltip);
}

initProspectContactActionTooltips();
