const PROSPECT_CONTACT_ACTION_SELECTOR =
  ".prospect-dataset-row .contact-hide-results-action, .prospect-dataset-row .contact-add-lead-action";
const CONTACT_EMAIL_COPY_SELECTOR = ".contact-email-copy";
const COPY_EMAIL_TOOLTIP = "Copy email";
const COPIED_EMAIL_TOOLTIP = "Copied";

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

function positionFloatingTooltip(target, tooltipText) {
  if (!tooltipText) return;

  const tooltip = getContactActionFloatingTooltip();
  tooltip.textContent = tooltipText;

  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  tooltip.classList.add("is-visible");
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

function positionContactActionFloatingTooltip(target) {
  positionFloatingTooltip(target, target.dataset.tooltip);
}

function getContactEmailTooltipText(emailElement) {
  return emailElement.dataset.tooltipState === "copied" ? COPIED_EMAIL_TOOLTIP : COPY_EMAIL_TOOLTIP;
}

function positionContactEmailFloatingTooltip(emailElement) {
  positionFloatingTooltip(emailElement, getContactEmailTooltipText(emailElement));
}

function showContactActionFloatingTooltip(target) {
  if (!(target instanceof Element)) return;
  contactActionFloatingTooltipTarget = target;
  positionContactActionFloatingTooltip(target);
}

function showContactEmailFloatingTooltip(emailElement) {
  if (!(emailElement instanceof Element)) return;
  contactActionFloatingTooltipTarget = emailElement;
  positionContactEmailFloatingTooltip(emailElement);
}

function hideContactActionFloatingTooltip() {
  contactActionFloatingTooltipTarget = null;
  contactActionFloatingTooltip?.classList.remove("is-visible");
}

function getProspectContactActionButton(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(PROSPECT_CONTACT_ACTION_SELECTOR);
}

function getContactEmailCopyElement(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(CONTACT_EMAIL_COPY_SELECTOR);
}

function resetContactEmailTooltipState(emailElement) {
  delete emailElement.dataset.tooltipState;
}

async function copyContactEmail(emailElement) {
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

function initContactEmailCopyTooltips() {
  if (!tableBody) return;

  tableBody.addEventListener("mouseover", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement === contactActionFloatingTooltipTarget) return;
    showContactEmailFloatingTooltip(emailElement);
  });

  tableBody.addEventListener("mouseout", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetContactEmailTooltipState(emailElement);
    hideContactActionFloatingTooltip();
  });

  tableBody.addEventListener("focusin", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement) return;
    showContactEmailFloatingTooltip(emailElement);
  });

  tableBody.addEventListener("focusout", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetContactEmailTooltipState(emailElement);
    hideContactActionFloatingTooltip();
  });

  tableBody.addEventListener("click", async (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    await copyContactEmail(emailElement);
    showContactEmailFloatingTooltip(emailElement);
  });

  tableWrap?.addEventListener("scroll", hideContactActionFloatingTooltip, { passive: true });
  window.addEventListener("resize", hideContactActionFloatingTooltip);
}

initProspectContactActionTooltips();
initContactEmailCopyTooltips();
