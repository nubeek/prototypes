const SEND_MESSAGE_TRANSITION_MS = 300;
const SEND_MESSAGE_EXPAND_MS = 420;
const SEND_MESSAGE_SEND_DELAY_MS = 1000;
const SEND_MESSAGE_FIELD_ERRORS = {
  sender: "Choose a sender email",
  senderDomain: "Authenticate your sending domain",
  recipients: "Add at least one recipient",
  subject: "Enter a subject",
  template: "Choose a template"
};

const sendMessageOption = document.getElementById("sendMessageOption");
const sendMessageOptionLabel = sendMessageOption?.querySelector(".toolbar-dropdown-label");
const sendMessageCard = document.getElementById("sendMessageCard");
const sendMessageClose = document.getElementById("sendMessageClose");
const sendMessageForm = document.getElementById("sendMessageForm");
const sendMessageFromField = document.getElementById("sendMessageFromField");
const sendMessageFromSelect = document.getElementById("sendMessageFromSelect");
const sendMessageRecipientsField = document.getElementById("sendMessageRecipientsField");
const sendMessageRecipientsSelect = document.getElementById("sendMessageRecipientsSelect");
const sendMessageRecipientsLabel = document.getElementById("sendMessageRecipientsLabel");
const sendMessageTemplateField = document.getElementById("sendMessageTemplateField");
const sendMessageTemplateSelect = document.getElementById("sendMessageTemplateSelect");
const sendMessageSubject = document.getElementById("sendMessageSubject");
const sendMessageBodyField = document.getElementById("sendMessageBodyField");
const sendMessageTemplateOptions = document.getElementById("sendMessageTemplateOptions");
const sendMessageTemplatePreview = document.getElementById("sendMessageTemplatePreview");
const sendMessageTemplatePreviewFrame = document.getElementById("sendMessageTemplatePreviewFrame");
const sendMessageTemplateImage = document.getElementById("sendMessageTemplateImage");
const sendMessageTemplateUnavailable = document.getElementById("sendMessageTemplateUnavailable");
const sendMessageSend = document.getElementById("sendMessageSend");
const sendMessageSendLabel = sendMessageSend?.querySelector(".campaign-continue-label");
const sendMessageTemplates = document.getElementById("sendMessageTemplates");
const sendMessageUndo = document.getElementById("sendMessageUndo");
const sendMessageDone = document.getElementById("sendMessageDone");

let sendMessageFromApi = null;
let sendMessageRecipientsApi = null;
let sendMessageTemplateApi = null;
let sendMessageCloseTimeoutId = null;
let sendMessageExpandFrame = 0;
let sendMessageExpandTimer = null;
let sendMessageExpandFrameId = 0;
let sendMessageExpandEnd = null;
let sendMessageSendTimeoutId = null;
let sendMessageTemplatePickerOpen = false;
let sendMessageTemplateActiveIndex = -1;
let sendMessagePending = false;
let sendMessageSelectionKey = "";
let sendMessageContactRecipients = [];
let sendMessageRecipientOrder = [];

function isSendMessageOpen() {
  return Boolean(sendMessageCard && !sendMessageCard.hidden && !sendMessageCard.classList.contains("is-closing"));
}

function getSendMessageSenderOptions() {
  return getCampaignSenderEmailOptions();
}

function syncSendMessageSenderOptions() {
  sendMessageFromApi?.setOptions(getSendMessageSenderOptions(), { placeholder: "Select sender" });
}

function selectSendMessageSender(emailAddress) {
  syncSendMessageSenderOptions();
  sendMessageFromApi?.setValue(emailAddress);
  window.WefranchFieldErrors?.clear(sendMessageFromField);
}

function openSendMessageSenderSetup(trigger) {
  openAddCampaignSenderSetupModal(trigger, {
    emailAddress: sendMessageFromApi?.getValue() || "",
    onSave: selectSendMessageSender
  });
}

function decorateSendMessageSenderDomainError(messageEl) {
  const action = document.createElement("button");
  action.type = "button";
  action.className = "ui-control send-message-error-action";
  action.textContent = "Authenticate";
  action.addEventListener("click", () => openSendMessageSenderSetup(action));
  messageEl.replaceChildren(action, " your sending domain");
}

function getSendMessageRecipientCandidates() {
  if (isDatasetTableView()) {
    return getFilteredLocationRows().map((row) => ({
      email: row.email,
      name: row.name,
      organization: row.institution
    }));
  }

  return getFilteredFranchisees()
    .filter((owner) => !hiddenContactOwnerIndexes.has(owner.originalIndex))
    .map((owner) => ({
      email: owner.email,
      name: owner.contactName,
      organization: owner.ownerName
    }));
}

function getSelectedSendMessageLocationRows() {
  const rowsById = new Map(displayedLocations.map((row) => [row.id, row]));
  const rows = [];

  selectedLocationRowIds.forEach((rowId) => {
    const row = rowsById.get(rowId);
    if (row) rows.push(row);
  });

  return rows;
}

function getSelectedSendMessageOwners() {
  const ownersByIndex = new Map(displayedFranchisees.map((owner) => [owner.originalIndex, owner]));
  const owners = [];

  selectedFranchiseeIndexes.forEach((ownerIndex) => {
    const owner = ownersByIndex.get(ownerIndex);
    if (owner) owners.push(owner);
  });

  return owners;
}

function getActiveSendMessageSelection() {
  if (isDatasetTableView()) {
    const rows = getSelectedSendMessageLocationRows();
    return {
      count: rows.length,
      key: `dataset:${rows.map((row) => row.id).sort().join("\u0001")}`,
      recipients: rows.map((row) => ({
        email: row.email,
        name: row.name,
        organization: row.institution
      }))
    };
  }

  const selectedOwners = getSelectedSendMessageOwners();
  return {
    count: selectedOwners.length,
    key: `franchisees:${selectedOwners.map((owner) => owner.originalIndex).sort((a, b) => a - b).join("\u0001")}`,
    recipients: selectedOwners.map((owner) => ({
      email: owner.email,
      name: owner.contactName,
      organization: owner.ownerName
    }))
  };
}

function getSendMessageSelectionEmails(recipients) {
  const seenEmails = new Set();
  const emails = [];

  recipients.forEach((recipient) => {
    const email = String(recipient.email || "").trim().toLowerCase();
    if (!email || seenEmails.has(email)) return;
    seenEmails.add(email);
    emails.push(email);
  });

  return emails;
}

function getSendMessageRecipientOptions() {
  const seenEmails = new Set();
  const options = [];

  const addRecipient = (recipient) => {
    const email = String(recipient.email || "").trim().toLowerCase();
    const name = String(recipient.name || "").trim();
    if (!email || seenEmails.has(email)) return;

    seenEmails.add(email);
    options.push({
      label: name || email,
      value: email,
      meta: [recipient.organization, email].filter(Boolean).join(" · ")
    });
  };

  getSendMessageRecipientCandidates().forEach(addRecipient);
  getActiveSendMessageSelection().recipients.forEach(addRecipient);
  sendMessageContactRecipients.forEach(addRecipient);
  return orderSendMessageRecipientOptions(options);
}

function commitSendMessageRecipientOrder(emails) {
  const emailSet = new Set(emails);
  const nextOrder = [];
  const seen = new Set();

  sendMessageRecipientOrder.forEach((email) => {
    if (!emailSet.has(email) || seen.has(email)) return;
    seen.add(email);
    nextOrder.push(email);
  });

  emails.forEach((email) => {
    if (!email || seen.has(email)) return;
    seen.add(email);
    nextOrder.push(email);
  });

  sendMessageRecipientOrder = nextOrder;
  return nextOrder;
}

function orderSendMessageRecipientOptions(options) {
  if (!sendMessageRecipientOrder.length) return options;

  const optionsByValue = new Map(options.map((option) => [option.value, option]));
  const orderedOptions = [];
  const usedValues = new Set();

  sendMessageRecipientOrder.forEach((email) => {
    const option = optionsByValue.get(email);
    if (!option || usedValues.has(email)) return;
    usedValues.add(email);
    orderedOptions.push(option);
  });

  options.forEach((option) => {
    if (usedValues.has(option.value)) return;
    orderedOptions.push(option);
  });

  return orderedOptions;
}

function syncSendMessageRecipientOptionOrder() {
  if (!sendMessageRecipientsSelect || !sendMessageRecipientOrder.length) return;

  const options = Array.from(sendMessageRecipientsSelect.options);
  const placeholder = options.find((option) => option.value === "");
  const optionsByValue = new Map(
    options.filter((option) => option.value).map((option) => [option.value, option])
  );
  const orderedOptions = [];
  const usedValues = new Set();

  sendMessageRecipientOrder.forEach((email) => {
    const option = optionsByValue.get(email);
    if (!option || usedValues.has(email)) return;
    usedValues.add(email);
    orderedOptions.push(option);
  });

  options.forEach((option) => {
    if (!option.value || usedValues.has(option.value)) return;
    orderedOptions.push(option);
  });

  const fragment = document.createDocumentFragment();
  if (placeholder) fragment.append(placeholder);
  orderedOptions.forEach((option) => fragment.append(option));
  sendMessageRecipientsSelect.append(fragment);
}

function syncSendMessageRecipientCountLabel() {
  const recipientCount = window.WefranchFilterCombobox.getValues(sendMessageRecipientsSelect).length;
  const label = `To (${recipientCount.toLocaleString("en-US")})`;
  if (sendMessageRecipientsLabel) sendMessageRecipientsLabel.textContent = label;
  sendMessageRecipientsSelect?.setAttribute("aria-label", label);
  return recipientCount;
}

function applySelectedSendMessageRecipients(recipients) {
  if (!sendMessageRecipientsSelect || !sendMessageRecipientsApi) return;

  const emails = commitSendMessageRecipientOrder(getSendMessageSelectionEmails(recipients));
  const optionValues = new Set(Array.from(sendMessageRecipientsSelect.options, (option) => option.value));
  if (emails.some((email) => !optionValues.has(email))) {
    sendMessageRecipientsApi.setOptions(getSendMessageRecipientOptions(), { placeholder: "Add recipient" });
  }

  window.WefranchFilterCombobox.setValues(sendMessageRecipientsSelect, emails);
  sendMessageRecipientsSelect.dispatchEvent(new Event("change", { bubbles: true }));
  if (emails.length) window.WefranchFieldErrors?.clear(sendMessageRecipientsField);
}

function syncSendMessageSelection({ applyRecipients = false } = {}) {
  const selection = getActiveSendMessageSelection();
  if (sendMessageOption) sendMessageOption.hidden = selection.count === 0;
  if (sendMessageOptionLabel) {
    sendMessageOptionLabel.textContent = selection.count
      ? `Send a message (${selection.count.toLocaleString("en-US")})...`
      : "Send a message...";
  }

  const selectionChanged = selection.key !== sendMessageSelectionKey;
  sendMessageSelectionKey = selection.key;
  if (applyRecipients || (selectionChanged && isSendMessageOpen())) {
    applySelectedSendMessageRecipients(selection.recipients);
  }
}

function getSendMessageTemplateOptions() {
  return Object.entries(CAMPAIGN_DESIGN_TEMPLATES).map(([value, label]) => ({ label, value }));
}

function getSendMessageTemplateId() {
  const templateId = sendMessageTemplateApi?.getValue() || "";
  return CAMPAIGN_DESIGN_TEMPLATES[templateId] ? templateId : "";
}

function closeSendMessageDropdowns() {
  sendMessageFromApi?.close();
  sendMessageRecipientsApi?.close();
  sendMessageTemplateApi?.close();
  closeSendMessageTemplatePicker();
}

function isSendMessageDropdownOpen() {
  return sendMessageTemplatePickerOpen
    || Boolean(sendMessageCard?.querySelector(".filter-select-field.is-open"));
}

function getSendMessageTemplateInput() {
  return sendMessageTemplateField?.querySelector(".filter-combobox-input") || null;
}

function getSendMessageTemplateOptionButtons() {
  return Array.from(sendMessageTemplateOptions?.querySelectorAll(".filter-combobox-option, .filter-combobox-menu-action") || []);
}

function isSendMessageCreateTemplateAction(button) {
  return button?.dataset.action === "create-template";
}

function setSendMessageTemplateActiveOption(index) {
  const buttons = getSendMessageTemplateOptionButtons();
  const input = getSendMessageTemplateInput();
  sendMessageTemplateActiveIndex = buttons.length && index >= 0
    ? (index + buttons.length) % buttons.length
    : -1;

  buttons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === sendMessageTemplateActiveIndex;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      input?.setAttribute("aria-activedescendant", button.id);
      button.scrollIntoView({ block: "nearest" });
    }
  });
  if (sendMessageTemplateActiveIndex < 0) input?.removeAttribute("aria-activedescendant");
}

function renderSendMessageTemplateOptions() {
  if (!sendMessageTemplateOptions) return;

  const selectedId = getSendMessageTemplateId();
  const templates = getSendMessageTemplateOptions();
  const list = document.createElement("div");
  list.className = "send-message-template-options-list proto-scrollbar";

  const action = document.createElement("button");
  const icon = document.createElement("span");
  const actionLabel = document.createElement("span");
  action.type = "button";
  action.tabIndex = -1;
  action.id = "sendMessageTemplateOption-create";
  action.className = "filter-combobox-menu-action";
  action.dataset.action = "create-template";
  action.setAttribute("role", "option");
  action.setAttribute("aria-selected", "false");
  icon.className = "filter-combobox-menu-action-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.style.backgroundImage = 'url("../../assets/icons/add.svg")';
  actionLabel.className = "filter-combobox-menu-action-label";
  actionLabel.textContent = "Create new template";
  action.append(icon, actionLabel);
  list.append(action);

  if (templates.length) {
    const divider = document.createElement("div");
    divider.className = "filter-combobox-divider";
    divider.setAttribute("role", "separator");
    list.append(divider);
  }

  templates.forEach(({ label, value }) => {
    const button = document.createElement("button");
    const check = document.createElement("span");
    const text = document.createElement("span");
    const isSelected = value === selectedId;

    button.type = "button";
    button.tabIndex = -1;
    button.id = `sendMessageTemplateOption-${value}`;
    button.className = "filter-combobox-option";
    button.classList.toggle("is-selected", isSelected);
    button.dataset.value = value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isSelected));
    check.className = "filter-combobox-option-check";
    check.setAttribute("aria-hidden", "true");
    text.className = "filter-combobox-option-label";
    text.textContent = label;
    button.append(check, text);
    list.append(button);
  });

  sendMessageTemplateOptions.replaceChildren(list);
}

function setSendMessageTemplatePickerOpen(isOpen) {
  if (sendMessageTemplatePickerOpen === isOpen) return;

  sendMessageTemplatePickerOpen = isOpen;
  sendMessageTemplateField?.classList.toggle("is-picker-open", isOpen);
  getSendMessageTemplateInput()?.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    sendMessageFromApi?.close();
    sendMessageRecipientsApi?.close();
    renderSendMessageTemplateOptions();
    const selectedIndex = getSendMessageTemplateOptions()
      .findIndex((option) => option.value === getSendMessageTemplateId());
    // The create action is the first row, so saved templates start at index 1.
    setSendMessageTemplateActiveOption(selectedIndex < 0 ? -1 : selectedIndex + 1);
  } else {
    setSendMessageTemplateActiveOption(-1);
  }

  syncSendMessageTemplate();
}

function openSendMessageTemplatePicker() {
  setSendMessageTemplatePickerOpen(true);
}

function closeSendMessageTemplatePicker() {
  setSendMessageTemplatePickerOpen(false);
}

function selectSendMessageTemplate(templateId) {
  if (!CAMPAIGN_DESIGN_TEMPLATES[templateId]) return;

  sendMessageTemplatePickerOpen = false;
  sendMessageTemplateField?.classList.remove("is-picker-open");
  getSendMessageTemplateInput()?.setAttribute("aria-expanded", "false");
  setSendMessageTemplateActiveOption(-1);
  sendMessageTemplateApi?.setValue(templateId);
}

function setSendMessageBodyRevealed(isRevealed) {
  if (!sendMessageBodyField) return;
  sendMessageBodyField.inert = !isRevealed;
  sendMessageBodyField.setAttribute("aria-hidden", isRevealed ? "false" : "true");
}

function hideSendMessageBodyContent() {
  if (sendMessageTemplateOptions) sendMessageTemplateOptions.hidden = true;
  if (sendMessageTemplatePreview) sendMessageTemplatePreview.hidden = true;
  setSendMessageBodyRevealed(false);
}

function invalidateSendMessageExpand() {
  sendMessageExpandFrame += 1;
  window.clearTimeout(sendMessageExpandTimer);
  sendMessageExpandTimer = null;
  if (sendMessageExpandFrameId) {
    window.cancelAnimationFrame(sendMessageExpandFrameId);
    sendMessageExpandFrameId = 0;
  }
  if (sendMessageExpandEnd) {
    sendMessageCard?.removeEventListener("transitionend", sendMessageExpandEnd);
    sendMessageExpandEnd = null;
  }
}

function finishSendMessageExpandLayout() {
  if (!sendMessageCard) return;
  sendMessageCard.classList.remove("is-template-animating");
  sendMessageCard.style.height = "";
  sendMessageCard.style.transition = "";
  if (sendMessageBodyField) sendMessageBodyField.style.transition = "";
}

function animateSendMessageCard(isExpanded) {
  const card = sendMessageCard;
  if (!card) return;

  invalidateSendMessageExpand();

  const reducedMotion = document.body.classList.contains("reduce-motion");
  if (!isSendMessageOpen() || reducedMotion) {
    card.classList.toggle("is-expanded", isExpanded);
    finishSendMessageExpandLayout();
    if (!isExpanded) hideSendMessageBodyContent();
    else setSendMessageBodyRevealed(true);
    return;
  }

  const frame = sendMessageExpandFrame;
  const startHeight = card.getBoundingClientRect().height;

  card.style.transition = "none";
  if (sendMessageBodyField) sendMessageBodyField.style.transition = "none";
  card.classList.remove("is-template-animating");
  card.classList.toggle("is-expanded", isExpanded);
  card.style.height = "";
  const endHeight = card.getBoundingClientRect().height;

  if (Math.abs(endHeight - startHeight) < 1) {
    if (sendMessageBodyField) sendMessageBodyField.style.transition = "";
    finishSendMessageExpandLayout();
    if (!isExpanded) hideSendMessageBodyContent();
    else setSendMessageBodyRevealed(true);
    return;
  }

  // Lock the starting height while transitions are off so the measurement
  // pass cannot become the animation's from-value.
  card.classList.toggle("is-expanded", !isExpanded);
  card.classList.add("is-template-animating");
  card.style.height = `${startHeight}px`;
  setSendMessageBodyRevealed(true);
  void card.offsetWidth;
  card.style.transition = "";
  if (sendMessageBodyField) sendMessageBodyField.style.transition = "";
  void card.offsetWidth;

  sendMessageExpandFrameId = window.requestAnimationFrame(() => {
    sendMessageExpandFrameId = 0;
    if (frame !== sendMessageExpandFrame) return;
    card.classList.toggle("is-expanded", isExpanded);
    card.style.height = `${endHeight}px`;
  });

  const settle = () => {
    if (frame !== sendMessageExpandFrame) return;
    invalidateSendMessageExpand();
    finishSendMessageExpandLayout();
    if (!card.classList.contains("is-expanded")) hideSendMessageBodyContent();
  };

  sendMessageExpandEnd = (event) => {
    if (event.target !== card || event.propertyName !== "height") return;
    settle();
  };
  card.addEventListener("transitionend", sendMessageExpandEnd);
  sendMessageExpandTimer = window.setTimeout(settle, SEND_MESSAGE_EXPAND_MS + 50);
}

function syncSendMessageTemplate() {
  const templateId = getSendMessageTemplateId();
  const hasTemplate = Boolean(templateId);
  const showPreviewImage = templateId === CAMPAIGN_DESIGN_PREVIEW_TEMPLATE_ID;
  const showOptions = sendMessageTemplatePickerOpen;
  const shouldExpand = showOptions || hasTemplate;
  const isExpanded = Boolean(sendMessageCard?.classList.contains("is-expanded"));

  if (hasTemplate) window.WefranchFieldErrors?.clear(sendMessageTemplateField);
  if (sendMessageTemplates) sendMessageTemplates.hidden = !hasTemplate;

  // When collapsing, keep the current content visible until the card closes.
  if (shouldExpand) {
    if (sendMessageTemplateOptions) sendMessageTemplateOptions.hidden = !showOptions;
    if (sendMessageTemplatePreview) {
      const wasHidden = sendMessageTemplatePreview.hidden;
      sendMessageTemplatePreview.hidden = showOptions;
      if (!showOptions && wasHidden && sendMessageTemplatePreviewFrame) {
        sendMessageTemplatePreviewFrame.scrollTop = 0;
      }
    }
    sendMessageTemplatePreviewFrame?.classList.toggle("is-unavailable", !showPreviewImage);
    if (sendMessageTemplateImage) sendMessageTemplateImage.hidden = !showPreviewImage;
    if (sendMessageTemplateUnavailable) sendMessageTemplateUnavailable.hidden = showPreviewImage;
  }

  if (isExpanded === shouldExpand && !sendMessageCard?.classList.contains("is-template-animating")) {
    if (!shouldExpand) hideSendMessageBodyContent();
    return;
  }

  animateSendMessageCard(shouldExpand);
}

function setSendMessagePending(isPending) {
  sendMessagePending = isPending;
  sendMessageSend?.classList.toggle("is-loading", isPending);
  if (sendMessageSend) sendMessageSend.disabled = isPending;
  if (sendMessageSendLabel) sendMessageSendLabel.textContent = isPending ? "Sending..." : "Send";
}

function isSendMessageSent() {
  return Boolean(sendMessageCard?.classList.contains("is-sent"));
}

function setSendMessageSent(isSent) {
  sendMessageCard?.classList.toggle("is-sent", isSent);
  sendMessageCard?.setAttribute("aria-labelledby", isSent ? "sendMessageSentTitle" : "sendMessageTitle");
}

function syncSendMessageExpandedState() {
  const isExpanded = sendMessageTemplatePickerOpen || Boolean(getSendMessageTemplateId());
  sendMessageCard?.classList.toggle("is-expanded", isExpanded);
  if (isExpanded) setSendMessageBodyRevealed(true);
  else hideSendMessageBodyContent();
}

// Animates the card between two layouts that change its height, such as the
// compose form and the sent confirmation.
function animateSendMessageCardLayout(applyChange) {
  const card = sendMessageCard;
  if (!card) return;

  invalidateSendMessageExpand();
  finishSendMessageExpandLayout();

  if (!isSendMessageOpen() || document.body.classList.contains("reduce-motion")) {
    applyChange();
    invalidateSendMessageExpand();
    finishSendMessageExpandLayout();
    syncSendMessageExpandedState();
    return;
  }

  const startHeight = card.getBoundingClientRect().height;
  card.style.transition = "none";
  applyChange();
  // applyChange may start the template expand animation; settle it here so
  // this height transition is the only one running.
  invalidateSendMessageExpand();
  finishSendMessageExpandLayout();
  syncSendMessageExpandedState();
  card.style.transition = "none";
  card.style.height = "";
  const endHeight = card.getBoundingClientRect().height;

  if (Math.abs(endHeight - startHeight) < 1) {
    finishSendMessageExpandLayout();
    return;
  }

  const frame = sendMessageExpandFrame;
  card.style.height = `${startHeight}px`;
  void card.offsetWidth;
  card.style.transition = "";
  void card.offsetWidth;

  sendMessageExpandFrameId = window.requestAnimationFrame(() => {
    sendMessageExpandFrameId = 0;
    if (frame !== sendMessageExpandFrame) return;
    card.style.height = `${endHeight}px`;
  });

  const settle = () => {
    if (frame !== sendMessageExpandFrame) return;
    invalidateSendMessageExpand();
    finishSendMessageExpandLayout();
  };

  sendMessageExpandEnd = (event) => {
    if (event.target !== card || event.propertyName !== "height") return;
    settle();
  };
  card.addEventListener("transitionend", sendMessageExpandEnd);
  sendMessageExpandTimer = window.setTimeout(settle, SEND_MESSAGE_EXPAND_MS + 50);
}

function showSendMessageSent() {
  closeSendMessageDropdowns();
  animateSendMessageCardLayout(() => setSendMessageSent(true));
  sendMessageDone?.focus({ preventScroll: true });
}

function undoSendMessageSent() {
  if (!isSendMessageSent()) return;
  animateSendMessageCardLayout(() => {
    setSendMessageSent(false);
    sendMessageCard.classList.add("is-returning");
  });
  sendMessageSend?.focus({ preventScroll: true });
}

function cancelSendMessagePending() {
  window.clearTimeout(sendMessageSendTimeoutId);
  sendMessageSendTimeoutId = null;
  setSendMessagePending(false);
}

function resetSendMessageForm() {
  cancelSendMessagePending();
  closeSendMessageDropdowns();
  window.WefranchFieldErrors?.clearAll(sendMessageCard, { silent: true });

  sendMessageContactRecipients = [];
  sendMessageRecipientOrder = [];
  syncSendMessageSenderOptions();
  sendMessageFromApi?.reset(getDefaultCampaignSenderEmail());
  sendMessageRecipientsApi?.setOptions(getSendMessageRecipientOptions(), { placeholder: "Add recipient" });
  sendMessageRecipientsApi?.reset("");
  syncSendMessageRecipientCountLabel();
  sendMessageTemplateApi?.setOptions(getSendMessageTemplateOptions(), { placeholder: "Select..." });
  sendMessageTemplateApi?.reset("");

  if (sendMessageSubject) sendMessageSubject.value = "";
  syncSendMessageTemplate();
  setSendMessageSent(false);
  sendMessageCard?.classList.remove("is-returning");
}

function focusSendMessageRecipients() {
  window.requestAnimationFrame(() => {
    sendMessageRecipientsField?.querySelector(".filter-combobox-input")?.focus({ preventScroll: true });
  });
}

function addSendMessageContactRecipient(contact) {
  sendMessageContactRecipients.push(contact);
  const currentRecipients = window.WefranchFilterCombobox
    .getValues(sendMessageRecipientsSelect)
    .map((email) => ({ email }));
  applySelectedSendMessageRecipients([...currentRecipients, contact]);
}

function applyOpenSendMessageRecipients(contact) {
  if (contact) {
    syncSendMessageSelection();
    addSendMessageContactRecipient(contact);
  } else {
    syncSendMessageSelection({ applyRecipients: true });
  }
}

function openSendMessageCard({ contact = null } = {}) {
  if (!sendMessageCard) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");

  if (isSendMessageOpen()) {
    if (isSendMessageSent()) {
      animateSendMessageCardLayout(() => {
        resetSendMessageForm();
        applyOpenSendMessageRecipients(contact);
      });
    } else if (contact) {
      addSendMessageContactRecipient(contact);
    }
    focusSendMessageRecipients();
    return;
  }

  window.clearTimeout(sendMessageCloseTimeoutId);
  resetSendMessageForm();
  applyOpenSendMessageRecipients(contact);
  sendMessageCard.classList.remove("is-closing");
  sendMessageCard.hidden = false;
  void sendMessageCard.offsetWidth;
  sendMessageCard.classList.add("is-open");
  focusSendMessageRecipients();
}

function closeSendMessageCard() {
  if (!isSendMessageOpen()) return;

  cancelSendMessagePending();
  closeSendMessageDropdowns();
  invalidateSendMessageExpand();
  if (sendMessageCard.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  sendMessageCard.classList.remove("is-open");
  sendMessageCard.classList.add("is-closing");
  window.clearTimeout(sendMessageCloseTimeoutId);
  sendMessageCloseTimeoutId = window.setTimeout(() => {
    sendMessageCard.classList.remove("is-closing");
    sendMessageCard.hidden = true;
    resetSendMessageForm();
  }, SEND_MESSAGE_TRANSITION_MS);
}

function getSendMessageErrors() {
  const errors = [];
  const senderEmail = sendMessageFromApi?.getValue() || "";
  const recipients = window.WefranchFilterCombobox.getValues(sendMessageRecipientsSelect);
  const subject = String(sendMessageSubject?.value || "").trim();

  if (!senderEmail || !CAMPAIGN_SENDERS[senderEmail]) {
    errors.push({ field: sendMessageFromField, message: SEND_MESSAGE_FIELD_ERRORS.sender });
  } else if (!isCampaignSenderEmailAuthorized(senderEmail)) {
    errors.push({ field: sendMessageFromField, message: SEND_MESSAGE_FIELD_ERRORS.senderDomain });
  }
  if (!recipients.length) {
    errors.push({ field: sendMessageRecipientsField, message: SEND_MESSAGE_FIELD_ERRORS.recipients });
  }
  if (!subject) {
    errors.push({ field: sendMessageSubject, message: SEND_MESSAGE_FIELD_ERRORS.subject });
  }
  if (!getSendMessageTemplateId()) {
    errors.push({ field: sendMessageTemplateField, message: SEND_MESSAGE_FIELD_ERRORS.template });
  }

  return errors;
}

function focusSendMessageControl(element) {
  const control = element?.matches?.("input, textarea, [contenteditable]")
    ? element
    : element?.querySelector?.(".filter-combobox-input, [contenteditable]");
  control?.focus({ preventScroll: true });
}

function submitSendMessage() {
  if (sendMessagePending) return;

  closeSendMessageDropdowns();
  window.WefranchFieldErrors?.clearAll(sendMessageCard, { silent: true });

  const errors = getSendMessageErrors();
  if (errors.length) {
    errors.forEach((error) => window.WefranchFieldErrors?.set(error.field, error.message));
    focusSendMessageControl(errors[0].field);
    return;
  }

  setSendMessagePending(true);
  sendMessageSendTimeoutId = window.setTimeout(() => {
    sendMessageSendTimeoutId = null;
    setSendMessagePending(false);
    showSendMessageSent();
  }, SEND_MESSAGE_SEND_DELAY_MS);
}

sendMessageFromApi = window.WefranchFilterCombobox.enhance(sendMessageFromSelect, {
  singleSelect: true,
  clearable: false,
  searchable: false,
  optionRemove: true,
  onRemoveOption(emailAddress) {
    removeCampaignSender(emailAddress);
  },
  menuActions: [
    {
      label: "Add new sender",
      icon: "../../assets/icons/add.svg",
      onClick() {
        openAddCampaignSenderModal(sendMessageFromField, { onSave: selectSendMessageSender });
      }
    }
  ]
});

document.addEventListener("campaign-sender-verified", (event) => {
  if (sendMessageFromApi?.getValue() !== event.detail?.email) return;
  window.WefranchFieldErrors?.clear(sendMessageFromField);
});

document.addEventListener("campaign-senders-change", () => {
  if (!sendMessageFromApi) return;
  syncSendMessageSenderOptions();
  if (CAMPAIGN_SENDERS[sendMessageFromApi.getValue()]) return;
  sendMessageFromApi.setValue(getDefaultCampaignSenderEmail());
  window.WefranchFieldErrors?.clear(sendMessageFromField);
});

sendMessageFromField?.closest(".proto-modal-field")?.addEventListener("proto-field-error", (event) => {
  if (event.detail?.message !== SEND_MESSAGE_FIELD_ERRORS.senderDomain) return;
  const messageEl = event.currentTarget.querySelector(":scope > .proto-modal-field-message");
  if (messageEl) decorateSendMessageSenderDomainError(messageEl);
});

sendMessageRecipientsApi = window.WefranchFilterCombobox.enhance(sendMessageRecipientsSelect, {
  singleSelect: false,
  clearable: true,
  searchable: true,
  openOnQuery: true
});

const sendMessageRecipientsControl = sendMessageRecipientsField?.querySelector(".filter-combobox-control");
sendMessageRecipientsControl?.classList.add("proto-scrollbar");
sendMessageRecipientsField?.querySelector(".filter-combobox-clear")?.setAttribute("tabindex", "-1");

sendMessageRecipientsField?.addEventListener("focusin", () => {
  sendMessageRecipientsApi?.setOptions(getSendMessageRecipientOptions(), { placeholder: "Add recipient" });
});

let sendMessageRecipientCount = 0;
sendMessageRecipientsSelect?.addEventListener("change", () => {
  commitSendMessageRecipientOrder(window.WefranchFilterCombobox.getValues(sendMessageRecipientsSelect));
  syncSendMessageRecipientOptionOrder();
  sendMessageRecipientsApi?.sync();

  const recipientCount = syncSendMessageRecipientCountLabel();
  if (recipientCount > sendMessageRecipientCount && sendMessageRecipientsControl) {
    sendMessageRecipientsControl.scrollTop = sendMessageRecipientsControl.scrollHeight;
  }
  sendMessageRecipientCount = recipientCount;
});

sendMessageTemplateApi = window.WefranchFilterCombobox.enhance(sendMessageTemplateSelect, {
  singleSelect: true,
  clearable: true,
  searchable: false
});

getSendMessageTemplateInput()?.setAttribute("aria-controls", "sendMessageTemplateOptions");

sendMessageTemplateSelect?.addEventListener("change", () => {
  if (sendMessageTemplatePickerOpen) renderSendMessageTemplateOptions();
  syncSendMessageTemplate();
});

// Capture so the shared combobox never opens its floating menu for this field.
sendMessageTemplateField?.addEventListener("mousedown", (event) => {
  if (event.target.closest(".filter-combobox-clear")) return;

  event.preventDefault();
  event.stopPropagation();
  getSendMessageTemplateInput()?.focus({ preventScroll: true });
  setSendMessageTemplatePickerOpen(!sendMessageTemplatePickerOpen);
}, true);

// Open the list before the shared clear handler empties the value, so the
// card stays expanded and swaps the preview for the options.
sendMessageTemplateField?.addEventListener("click", (event) => {
  if (!event.target.closest(".filter-combobox-clear")) return;
  if (getSendMessageTemplateId()) openSendMessageTemplatePicker();
}, true);

sendMessageTemplateField?.addEventListener("keydown", (event) => {
  if (event.target.closest(".filter-combobox-clear")) return;

  const isOpen = sendMessageTemplatePickerOpen;
  let handled = true;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const step = event.key === "ArrowDown" ? 1 : -1;
    if (!isOpen) {
      openSendMessageTemplatePicker();
      if (sendMessageTemplateActiveIndex < 0) {
        const openedCount = getSendMessageTemplateOptionButtons().length;
        setSendMessageTemplateActiveOption(step > 0 ? 0 : openedCount - 1);
      }
    } else {
      const count = getSendMessageTemplateOptionButtons().length;
      const current = sendMessageTemplateActiveIndex < 0 && step < 0
        ? 0
        : sendMessageTemplateActiveIndex;
      const next = count ? (current + step + count) % count : -1;
      setSendMessageTemplateActiveOption(next);
    }
  } else if (event.key === "Enter" || event.key === " ") {
    const activeButton = getSendMessageTemplateOptionButtons()[sendMessageTemplateActiveIndex];
    if (isOpen && isSendMessageCreateTemplateAction(activeButton)) {
      handled = true;
    } else if (isOpen && activeButton) selectSendMessageTemplate(activeButton.dataset.value);
    else if (!isOpen) openSendMessageTemplatePicker();
    else closeSendMessageTemplatePicker();
  } else if (event.key === "Escape" && isOpen) {
    closeSendMessageTemplatePicker();
  } else {
    handled = false;
  }

  if (!handled) return;
  event.preventDefault();
  event.stopPropagation();
}, true);

sendMessageTemplateField?.addEventListener("focusout", (event) => {
  if (sendMessageTemplateField.contains(event.relatedTarget)) return;
  if (sendMessageTemplateOptions?.contains(event.relatedTarget)) return;
  closeSendMessageTemplatePicker();
});

sendMessageTemplateOptions?.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

sendMessageTemplateOptions?.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-combobox-option, .filter-combobox-menu-action");
  if (!button || isSendMessageCreateTemplateAction(button)) return;
  selectSendMessageTemplate(button.dataset.value);
  getSendMessageTemplateInput()?.focus({ preventScroll: true });
});

sendMessageTemplateOptions?.addEventListener("mousemove", (event) => {
  const button = event.target.closest(".filter-combobox-option, .filter-combobox-menu-action");
  if (!button) return;
  const index = getSendMessageTemplateOptionButtons().indexOf(button);
  if (index !== sendMessageTemplateActiveIndex) setSendMessageTemplateActiveOption(index);
});

document.addEventListener("mousedown", (event) => {
  if (!sendMessageTemplatePickerOpen) return;
  if (sendMessageTemplateField?.contains(event.target)) return;
  if (sendMessageTemplateOptions?.contains(event.target)) return;
  closeSendMessageTemplatePicker();
});

sendMessageOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openSendMessageCard();
});

sendMessageClose?.addEventListener("click", closeSendMessageCard);
sendMessageDone?.addEventListener("click", closeSendMessageCard);
sendMessageUndo?.addEventListener("click", undoSendMessageSent);

sendMessageForm?.addEventListener("animationend", (event) => {
  if (event.target === sendMessageForm) sendMessageCard?.classList.remove("is-returning");
});

sendMessageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSendMessage();
});

sendMessageSubject?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submitSendMessage();
});

sendMessageCard?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || isSendMessageDropdownOpen()) return;
  event.preventDefault();
  closeSendMessageCard();
});

syncSendMessageSelection();
