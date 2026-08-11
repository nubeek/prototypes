const CONTACT_EMAIL_COPY_SELECTOR = ".contact-email-copy";
const COPY_EMAIL_TOOLTIP = "Copy email";
const COPIED_EMAIL_TOOLTIP = "Copied";

let contactEmailFloatingTooltip = null;
let contactEmailFloatingTooltipTarget = null;

function getContactEmailFloatingTooltip() {
  if (!contactEmailFloatingTooltip) {
    contactEmailFloatingTooltip = document.createElement("div");
    contactEmailFloatingTooltip.className = "contact-email-floating-tooltip";
    contactEmailFloatingTooltip.setAttribute("role", "tooltip");
  }

  return contactEmailFloatingTooltip;
}

function getContactEmailTooltipText(emailElement) {
  return emailElement.dataset.tooltipState === "copied" ? COPIED_EMAIL_TOOLTIP : COPY_EMAIL_TOOLTIP;
}

function positionContactEmailFloatingTooltip(emailElement) {
  const tooltipText = getContactEmailTooltipText(emailElement);
  const tooltip = getContactEmailFloatingTooltip();
  tooltip.textContent = tooltipText;

  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  tooltip.classList.add("is-visible");

  const targetRect = emailElement.getBoundingClientRect();
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

function showContactEmailFloatingTooltip(emailElement) {
  if (!(emailElement instanceof Element)) return;
  contactEmailFloatingTooltipTarget = emailElement;
  positionContactEmailFloatingTooltip(emailElement);
}

function hideContactEmailFloatingTooltip() {
  contactEmailFloatingTooltipTarget = null;
  contactEmailFloatingTooltip?.classList.remove("is-visible");
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

function initContactEmailCopyTooltips() {
  if (!tableBody) return;

  tableBody.addEventListener("mouseover", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement === contactEmailFloatingTooltipTarget) return;
    showContactEmailFloatingTooltip(emailElement);
  });

  tableBody.addEventListener("mouseout", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement !== contactEmailFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetContactEmailTooltipState(emailElement);
    hideContactEmailFloatingTooltip();
  });

  tableBody.addEventListener("focusin", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement) return;
    showContactEmailFloatingTooltip(emailElement);
  });

  tableBody.addEventListener("focusout", (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement || emailElement !== contactEmailFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    resetContactEmailTooltipState(emailElement);
    hideContactEmailFloatingTooltip();
  });

  tableBody.addEventListener("click", async (event) => {
    const emailElement = getContactEmailCopyElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    await copyContactEmail(emailElement);
    showContactEmailFloatingTooltip(emailElement);
  }, true);

  tableWrap?.addEventListener("scroll", hideContactEmailFloatingTooltip, { passive: true });
  window.addEventListener("resize", hideContactEmailFloatingTooltip);
}

initContactEmailCopyTooltips();
