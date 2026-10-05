const CONTACT_ACTION_SELECTOR =
  ".contact-hide-results-action, .contact-add-lead-action";
const CONTACT_EMAIL_SEND_SELECTOR = ".contact-email-send";
const SEND_MESSAGE_EMAIL_TOOLTIP = "Send a message";

let contactActionFloatingTooltip = null;
let contactActionFloatingTooltipTarget = null;
let contactEmailTooltip = null;
let contactEmailTooltipTarget = null;

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
  placeFloatingTooltip(tooltip, target);
}

function placeFloatingTooltip(tooltip, target, { anchorToText = false } = {}) {
  if (!tooltip.isConnected) {
    document.body.append(tooltip);
  }

  tooltip.classList.add("is-visible");
  tooltip.style.width = "";

  const targetRect = anchorToText && window.getElementTextBoundingRect
    ? window.getElementTextBoundingRect(target)
    : target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 8;
  const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  const left = Math.min(
    Math.max(viewportPadding, centeredLeft),
    window.innerWidth - tooltipRect.width - viewportPadding
  );
  const top = Math.min(
    Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6),
    window.innerHeight - tooltipRect.height - viewportPadding
  );

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function positionContactActionFloatingTooltip(target) {
  positionFloatingTooltip(target, target.dataset.tooltip);
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

function getContactEmailTooltip() {
  if (!contactEmailTooltip) {
    contactEmailTooltip = document.createElement("div");
    contactEmailTooltip.className = "filter-combobox-floating-tooltip contact-action-floating-tooltip";
    contactEmailTooltip.setAttribute("role", "tooltip");
    contactEmailTooltip.textContent = SEND_MESSAGE_EMAIL_TOOLTIP;
  }

  return contactEmailTooltip;
}

function showContactEmailTooltip(emailElement) {
  if (!(emailElement instanceof Element) || !emailElement.textContent.trim()) return;
  contactEmailTooltipTarget = emailElement;
  placeFloatingTooltip(getContactEmailTooltip(), emailElement, { anchorToText: true });
}

function hideContactEmailTooltip() {
  contactEmailTooltipTarget = null;
  contactEmailTooltip?.classList.remove("is-visible");
}

function getOwnerContactRecipient(ownerIndex, fallbackEmail = "") {
  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  return {
    email: owner?.email || fallbackEmail,
    name: owner?.contactName || "",
    organization: owner?.ownerName || ""
  };
}

function getDatasetRowRecipient(row, fallbackEmail = "") {
  return {
    email: row?.email || fallbackEmail,
    name: row?.name || "",
    organization: row?.institution || row?.owner?.ownerName || ""
  };
}

function getContactEmailRecipient(emailElement) {
  const fallbackEmail = emailElement.textContent.trim();
  const prospectRowKey = emailElement
    .closest(".contact-email-cell")
    ?.querySelector("[data-prospect-row-key]")
    ?.dataset.prospectRowKey;

  if (prospectRowKey) {
    return getDatasetRowRecipient(getProspectRowByStateKey(prospectRowKey), fallbackEmail);
  }

  const ownerIndex = Number(emailElement.closest("[data-owner-index]")?.dataset.ownerIndex);
  return getOwnerContactRecipient(ownerIndex, fallbackEmail);
}

function openContactEmailSendMessage(emailElement) {
  const email = emailElement.textContent.trim();
  if (!email || email === "–") return;
  hideContactEmailTooltip();
  openSendMessageCard({ contact: getContactEmailRecipient(emailElement) });
}

function getContactActionButton(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(CONTACT_ACTION_SELECTOR);
}

function getContactEmailSendElement(element) {
  if (!(element instanceof Element)) return null;
  return element.closest(CONTACT_EMAIL_SEND_SELECTOR);
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function initContactActionTooltips() {
  document.addEventListener("mouseover", (event) => {
    const button = getContactActionButton(event.target);
    if (!button || button === contactActionFloatingTooltipTarget) return;
    showContactActionFloatingTooltip(button);
  });

  document.addEventListener("mouseout", (event) => {
    const button = getContactActionButton(event.target);
    if (!button || button !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;

    hideContactActionFloatingTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const button = getContactActionButton(event.target);
    if (!button) return;
    showContactActionFloatingTooltip(button);
  });

  document.addEventListener("focusout", (event) => {
    const button = getContactActionButton(event.target);
    if (!button || button !== contactActionFloatingTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;

    hideContactActionFloatingTooltip();
  });

  document.addEventListener("click", (event) => {
    if (getContactActionButton(event.target)) {
      hideContactActionFloatingTooltip();
    }
  });

  document.addEventListener("scroll", hideContactActionFloatingTooltip, { passive: true, capture: true });
  window.addEventListener("resize", hideContactActionFloatingTooltip);
}

function initContactEmailSendTooltips() {
  if (!tableBody) return;

  tableBody.addEventListener("mouseover", (event) => {
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement || emailElement === contactEmailTooltipTarget) return;
    showContactEmailTooltip(emailElement);
  });

  tableBody.addEventListener("mouseout", (event) => {
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement || emailElement !== contactEmailTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    hideContactEmailTooltip();
  });

  tableBody.addEventListener("focusin", (event) => {
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement) return;
    showContactEmailTooltip(emailElement);
  });

  tableBody.addEventListener("focusout", (event) => {
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement || emailElement !== contactEmailTooltipTarget) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && emailElement.contains(relatedTarget)) return;

    hideContactEmailTooltip();
  });

  tableBody.addEventListener("click", (event) => {
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openContactEmailSendMessage(emailElement);
  });

  tableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const emailElement = getContactEmailSendElement(event.target);
    if (!emailElement) return;

    event.preventDefault();
    event.stopPropagation();
    openContactEmailSendMessage(emailElement);
  });

  tableWrap?.addEventListener("scroll", hideContactEmailTooltip, { passive: true });
  document.addEventListener("scroll", hideContactEmailTooltip, { passive: true, capture: true });
  window.addEventListener("resize", hideContactEmailTooltip);
}

const CONTACT_MORE_MENU_OFFSET = 2;
const CONTACT_MORE_MENU_VIEWPORT_PADDING = 8;
const CONTACT_MORE_MENU_ITEM_SELECTOR = "[data-contact-more-action]:not(:disabled)";

let contactMoreMenu = null;
let contactMoreMenuTrigger = null;

function createContactMoreMenuItem(action) {
  const item = document.createElement("button");
  item.className = "ui-menu-item toolbar-dropdown-option toolbar-dropdown-action";
  item.type = "button";
  item.setAttribute("role", "menuitem");
  item.dataset.contactMoreAction = action;
  item.innerHTML = '<img class="toolbar-dropdown-icon" alt="" aria-hidden="true"><span class="toolbar-dropdown-label"></span>';
  return item;
}

function getContactMoreMenu() {
  if (!contactMoreMenu) {
    contactMoreMenu = document.createElement("div");
    contactMoreMenu.className = "ui-menu ui-dropdown-menu ui-dropdown-menu--down contact-more-menu";
    contactMoreMenu.setAttribute("role", "menu");

    const divider = document.createElement("div");
    divider.className = "toolbar-dropdown-divider";
    divider.setAttribute("role", "separator");
    contactMoreMenu.append(
      createContactMoreMenuItem("lead"),
      createContactMoreMenuItem("message"),
      createContactMoreMenuItem("copy"),
      divider,
      createContactMoreMenuItem("hide")
    );

    contactMoreMenu.addEventListener("click", handleContactMoreMenuClick);
    contactMoreMenu.addEventListener("keydown", handleContactMoreMenuKeydown);
    document.body.append(contactMoreMenu);
  }

  return contactMoreMenu;
}

function setContactMoreMenuItem(action, { label, icon, disabled = false }) {
  const item = contactMoreMenu.querySelector(`[data-contact-more-action="${action}"]`);
  if (!item) return;
  item.querySelector(".toolbar-dropdown-icon").src = `../../assets/icons/${icon}`;
  item.querySelector(".toolbar-dropdown-label").textContent = label;
  item.disabled = disabled;
}

function getContactMoreContext(trigger) {
  const prospectRowKey = trigger.dataset.prospectRowKey || "";
  if (prospectRowKey) {
    const row = getProspectRowByStateKey(prospectRowKey);
    if (!row) return null;

    return {
      prospectRowKey,
      ownerIndex: null,
      ...getDatasetRowRecipient(row),
      isLeadSaved: isProspectRowLeadSaved(row),
      isHidden: isProspectRowHidden(row)
    };
  }

  const ownerIndex = Number(trigger.dataset.ownerIndex);
  if (!Number.isFinite(ownerIndex)) return null;

  return {
    prospectRowKey: "",
    ownerIndex,
    ...getOwnerContactRecipient(ownerIndex),
    isLeadSaved: isContactLeadSaved(ownerIndex, null),
    isHidden: hiddenContactOwnerIndexes.has(ownerIndex)
  };
}

function syncContactMoreMenu(context) {
  const { email, name } = context;

  contactMoreMenu.setAttribute("aria-label", `Actions for ${name || email || "contact"}`);
  setContactMoreMenuItem("lead", context.isLeadSaved
    ? { label: "Remove from leads", icon: "leads-remove.svg" }
    : { label: "Add to leads", icon: "leads-add.svg" });
  setContactMoreMenuItem("message", { label: "Send message", icon: "mail-send.svg?v=2", disabled: !email });
  setContactMoreMenuItem("copy", { label: "Copy email", icon: "copy.svg", disabled: !email });
  setContactMoreMenuItem("hide", context.isHidden
    ? { label: "Show in results", icon: "unhide.svg" }
    : { label: "Hide from results", icon: "hide.svg" });
}

function positionContactMoreMenu(trigger) {
  const menu = contactMoreMenu;
  const triggerRect = trigger.getBoundingClientRect();
  const travel = parseFloat(getComputedStyle(menu).getPropertyValue("--dropdown-reveal-travel")) || 0;
  const padding = CONTACT_MORE_MENU_VIEWPORT_PADDING;
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const belowTop = triggerRect.bottom + CONTACT_MORE_MENU_OFFSET;
  const aboveTop = triggerRect.top - CONTACT_MORE_MENU_OFFSET - height;
  const opensAbove = belowTop + travel + height > window.innerHeight - padding
    && aboveTop - travel >= padding;
  const left = Math.min(
    Math.max(padding, triggerRect.right - width),
    window.innerWidth - width - padding
  );

  menu.classList.toggle("ui-dropdown-menu--up", opensAbove);
  menu.classList.toggle("ui-dropdown-menu--down", !opensAbove);
  menu.style.left = `${left}px`;
  menu.style.top = `${opensAbove ? aboveTop : belowTop}px`;
}

function getContactMoreMenuItems() {
  return contactMoreMenu ? [...contactMoreMenu.querySelectorAll(CONTACT_MORE_MENU_ITEM_SELECTOR)] : [];
}

function focusContactMoreMenuItem(index) {
  const items = getContactMoreMenuItems();
  if (!items.length) return;
  items[(index + items.length) % items.length].focus({ preventScroll: true });
}

function openContactMoreMenu(trigger, { focusFirstItem = false } = {}) {
  const context = getContactMoreContext(trigger);
  if (!context) return;

  closeContactMoreMenu();
  hideContactEmailTooltip();
  hideContactActionFloatingTooltip();

  const menu = getContactMoreMenu();
  syncContactMoreMenu(context);
  contactMoreMenuTrigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  trigger.closest(".contact-cell-action")?.classList.add("is-menu-open");
  positionContactMoreMenu(trigger);
  menu.classList.add("is-open");

  if (focusFirstItem) focusContactMoreMenuItem(0);
}

function closeContactMoreMenu({ restoreFocus = false } = {}) {
  const trigger = contactMoreMenuTrigger;
  if (!trigger) return;

  contactMoreMenuTrigger = null;
  contactMoreMenu?.classList.remove("is-open");
  trigger.setAttribute("aria-expanded", "false");
  trigger.closest(".contact-cell-action")?.classList.remove("is-menu-open");
  if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
}

function toggleContactMoreMenu(trigger, options) {
  if (contactMoreMenuTrigger === trigger) {
    closeContactMoreMenu();
    return;
  }
  openContactMoreMenu(trigger, options);
}

async function handleContactMoreMenuClick(event) {
  const item = event.target.closest(CONTACT_MORE_MENU_ITEM_SELECTOR);
  const trigger = contactMoreMenuTrigger;
  if (!item || !trigger) return;

  const context = getContactMoreContext(trigger);
  const action = item.dataset.contactMoreAction;
  closeContactMoreMenu({ restoreFocus: event.detail === 0 });
  if (!context) return;

  if (action === "lead") {
    if (context.prospectRowKey) {
      handleSaveLeadAction(trigger, null, null, context.prospectRowKey);
      return;
    }
    handleSaveLeadAction(trigger, context.ownerIndex);
    return;
  }

  if (action === "message") {
    openSendMessageCard({
      contact: {
        email: context.email,
        name: context.name,
        organization: context.organization
      }
    });
    return;
  }

  if (action === "copy") {
    await copyTextToClipboard(context.email);
    window.WefranchToast?.show({ message: "Email copied to clipboard." });
    return;
  }

  if (action === "hide") {
    if (context.prospectRowKey) {
      const row = getProspectRowByStateKey(context.prospectRowKey);
      if (row) toggleProspectRowHidden(row);
      refreshContactStateViews();
      return;
    }

    if (hiddenContactOwnerIndexes.has(context.ownerIndex)) hiddenContactOwnerIndexes.delete(context.ownerIndex);
    else hiddenContactOwnerIndexes.add(context.ownerIndex);
    refreshContactStateViews();
  }
}

function handleContactMoreMenuKeydown(event) {
  const items = getContactMoreMenuItems();
  const currentIndex = items.indexOf(document.activeElement);

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    focusContactMoreMenuItem(currentIndex === -1 ? (step > 0 ? 0 : -1) : currentIndex + step);
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    focusContactMoreMenuItem(event.key === "Home" ? 0 : -1);
  } else if (event.key === "Tab") {
    event.preventDefault();
    closeContactMoreMenu({ restoreFocus: true });
  }
}

function initContactMoreMenu() {
  tableBody?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" || !(event.target instanceof Element)) return;
    const trigger = event.target.closest(".contact-more-action");
    if (!trigger) return;

    event.preventDefault();
    openContactMoreMenu(trigger, { focusFirstItem: true });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!contactMoreMenuTrigger || !(event.target instanceof Node)) return;
    if (contactMoreMenu?.contains(event.target) || contactMoreMenuTrigger.contains(event.target)) return;
    closeContactMoreMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !contactMoreMenuTrigger) return;
    event.preventDefault();
    closeContactMoreMenu({ restoreFocus: true });
  });

  document.addEventListener("scroll", () => closeContactMoreMenu(), { passive: true, capture: true });
  window.addEventListener("resize", () => closeContactMoreMenu());
}

initContactActionTooltips();
initContactEmailSendTooltips();
initContactMoreMenu();
