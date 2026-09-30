const TERRITORY_EMAIL_COPY_SELECTOR = ".territory-info-card .contact-email-copy";
const COPY_EMAIL_TOOLTIP = "Copy email";
const COPIED_EMAIL_TOOLTIP = "Copied!";

let territoryEmailTooltip = null;
let territoryEmailTooltipTarget = null;

function getTerritoryEmailTooltip() {
  if (!territoryEmailTooltip) {
    territoryEmailTooltip = document.createElement("div");
    territoryEmailTooltip.className = "filter-combobox-floating-tooltip contact-action-floating-tooltip";
    territoryEmailTooltip.setAttribute("role", "tooltip");
  }

  return territoryEmailTooltip;
}

function getTerritoryEmailCopyElement(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(TERRITORY_EMAIL_COPY_SELECTOR);
}

function getTerritoryEmailTooltipText(emailElement) {
  return emailElement.dataset.tooltipState === "copied" ? COPIED_EMAIL_TOOLTIP : COPY_EMAIL_TOOLTIP;
}

function positionTerritoryEmailTooltip(emailElement) {
  const tooltipText = getTerritoryEmailTooltipText(emailElement);
  const tooltip = getTerritoryEmailTooltip();
  tooltip.textContent = tooltipText;

  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  tooltip.classList.add("is-visible");
  window.fitTooltipToContent?.(tooltip);

  const targetRect = window.getElementTextBoundingRect?.(emailElement) ?? emailElement.getBoundingClientRect();
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

function showTerritoryEmailTooltip(emailElement) {
  if (!(emailElement instanceof Element)) return;
  territoryEmailTooltipTarget = emailElement;
  positionTerritoryEmailTooltip(emailElement);
}

function resetTerritoryEmailTooltipState(emailElement) {
  delete emailElement.dataset.tooltipState;
}

function hideTerritoryEmailTooltip() {
  territoryEmailTooltipTarget = null;
  territoryEmailTooltip?.classList.remove("is-visible");
}

async function copyTerritoryEmail(emailElement) {
  const email = emailElement.textContent.trim();
  if (!email) return false;

  try {
    await navigator.clipboard.writeText(email);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = email;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  emailElement.dataset.tooltipState = "copied";
  return true;
}

function initTerritoryEmailCopy() {
  document.addEventListener("mouseover", (event) => {
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement || emailElement === territoryEmailTooltipTarget) return;
    showTerritoryEmailTooltip(emailElement);
  });

  document.addEventListener("mouseout", (event) => {
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement || emailElement !== territoryEmailTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetTerritoryEmailTooltipState(emailElement);
    hideTerritoryEmailTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement) return;
    showTerritoryEmailTooltip(emailElement);
  });

  document.addEventListener("focusout", (event) => {
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement || emailElement !== territoryEmailTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetTerritoryEmailTooltipState(emailElement);
    hideTerritoryEmailTooltip();
  });

  document.addEventListener("click", async (event) => {
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    event.stopPropagation();

    await copyTerritoryEmail(emailElement);
    showTerritoryEmailTooltip(emailElement);
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const emailElement = getTerritoryEmailCopyElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    await copyTerritoryEmail(emailElement);
    showTerritoryEmailTooltip(emailElement);
  });

  document.addEventListener("scroll", hideTerritoryEmailTooltip, { passive: true, capture: true });
  window.addEventListener("resize", hideTerritoryEmailTooltip);
}

initTerritoryEmailCopy();
