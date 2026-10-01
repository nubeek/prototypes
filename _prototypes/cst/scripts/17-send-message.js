const SEND_MESSAGE_TRANSITION_MS = 300;
const SEND_MESSAGE_SEND_DELAY_MS = 1000;
const SEND_MESSAGE_FIELD_ERRORS = {
  sender: "Choose a sender email",
  recipients: "Add at least one recipient",
  subject: "Enter a subject",
  body: "Write a message, attach an image, or choose a template"
};

const sendMessageOption = document.getElementById("sendMessageOption");
const sendMessageCard = document.getElementById("sendMessageCard");
const sendMessageClose = document.getElementById("sendMessageClose");
const sendMessageForm = document.getElementById("sendMessageForm");
const sendMessageFromField = document.getElementById("sendMessageFromField");
const sendMessageFromSelect = document.getElementById("sendMessageFromSelect");
const sendMessageRecipientsField = document.getElementById("sendMessageRecipientsField");
const sendMessageRecipientsSelect = document.getElementById("sendMessageRecipientsSelect");
const sendMessageTemplateField = document.getElementById("sendMessageTemplateField");
const sendMessageTemplateSelect = document.getElementById("sendMessageTemplateSelect");
const sendMessageSubject = document.getElementById("sendMessageSubject");
const sendMessageBodyField = document.getElementById("sendMessageBodyField");
const sendMessageEditor = document.getElementById("sendMessageEditor");
const sendMessageBody = document.getElementById("sendMessageBody");
const sendMessageTemplatePreview = document.getElementById("sendMessageTemplatePreview");
const sendMessageTemplatePreviewFrame = document.getElementById("sendMessageTemplatePreviewFrame");
const sendMessageTemplateImage = document.getElementById("sendMessageTemplateImage");
const sendMessageTemplateUnavailable = document.getElementById("sendMessageTemplateUnavailable");
const sendMessageSend = document.getElementById("sendMessageSend");
const sendMessageAttach = document.getElementById("sendMessageAttach");
const sendMessageAttachInput = document.getElementById("sendMessageAttachInput");

let sendMessageCaretRange = null;
let sendMessageImageUrls = new Set();
let sendMessageFromApi = null;
let sendMessageRecipientsApi = null;
let sendMessageTemplateApi = null;
let sendMessageCloseTimeoutId = null;
let sendMessageSendTimeoutId = null;
let sendMessagePending = false;

function isSendMessageOpen() {
  return Boolean(sendMessageCard && !sendMessageCard.hidden && !sendMessageCard.classList.contains("is-closing"));
}

function getSendMessageSenderOptions() {
  return getAuthorizedCampaignSenderEmails().map((emailAddress) => ({
    label: emailAddress,
    value: emailAddress
  }));
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

function getSendMessageRecipientOptions() {
  const seenEmails = new Set();

  return getSendMessageRecipientCandidates().flatMap((recipient) => {
    const email = String(recipient.email || "").trim().toLowerCase();
    const name = String(recipient.name || "").trim();
    if (!email || seenEmails.has(email)) return [];

    seenEmails.add(email);
    return [{
      label: name || email,
      value: email,
      meta: [recipient.organization, email].filter(Boolean).join(" · ")
    }];
  });
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
}

function isSendMessageDropdownOpen() {
  return Boolean(sendMessageCard?.querySelector(".filter-select-field.is-open"));
}

function getSendMessageImageFiles(fileList) {
  return Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
}

function getClipboardImageFiles(data) {
  const fromFiles = getSendMessageImageFiles(data?.files);
  if (fromFiles.length) return fromFiles;

  return Array.from(data?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

function isSendMessageFileDrag(event) {
  return !getSendMessageTemplateId() && Array.from(event.dataTransfer?.types || []).includes("Files");
}

function getSendMessageBodyText() {
  return String(sendMessageBody?.innerText || "").replace(/\u00a0/g, " ").trim();
}

function createSendMessageLine() {
  const line = document.createElement("div");
  line.className = "send-message-line";
  line.append(document.createElement("br"));
  return line;
}

function isSendMessageLine(node) {
  return node?.nodeType === Node.ELEMENT_NODE && node.classList.contains("send-message-line");
}

function sendMessageLineIsEmpty(line) {
  return isSendMessageLine(line) && !line.textContent.replace(/\u00a0/g, " ").trim();
}

function hasEditableContentBefore(node) {
  let sibling = node?.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.replace(/\u00a0/g, " ").trim()) return true;
    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName !== "BR" && !sibling.classList.contains("send-message-inline-image")) return true;
    sibling = sibling.previousSibling;
  }
  return false;
}

function hasEditableContentAfter(node) {
  let sibling = node?.nextSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.replace(/\u00a0/g, " ").trim()) return true;
    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName !== "BR" && !sibling.classList.contains("send-message-inline-image")) return true;
    sibling = sibling.nextSibling;
  }
  return false;
}

function ensureSendMessageCaretSlots() {
  if (!sendMessageBody) return;

  const images = [...sendMessageBody.querySelectorAll(":scope > .send-message-inline-image")];
  if (!images.length) {
    if (!sendMessageBody.childNodes.length) sendMessageBody.append(document.createElement("br"));
    return;
  }

  images.forEach((image) => {
    if (hasEditableContentBefore(image)) return;
    const previous = image.previousSibling;
    if (previous?.nodeName === "BR") previous.replaceWith(createSendMessageLine());
    else image.before(createSendMessageLine());
  });
  const lastImage = images[images.length - 1];
  if (hasEditableContentAfter(lastImage)) return;
  const next = lastImage.nextSibling;
  if (next?.nodeName === "BR") next.replaceWith(createSendMessageLine());
  else lastImage.after(createSendMessageLine());
}

function syncSendMessageBodyEmpty() {
  const currentUrls = new Set();
  sendMessageBody?.querySelectorAll(".send-message-inline-image img").forEach((image) => {
    currentUrls.add(image.src);
  });
  sendMessageImageUrls.forEach((url) => {
    if (!currentUrls.has(url) && url.startsWith("blob:")) URL.revokeObjectURL(url);
  });
  sendMessageImageUrls = currentUrls;
  sendMessageBody?.classList.toggle("is-empty", !getSendMessageBodyText() && !currentUrls.size);
}

function getSendMessageCaretRange() {
  const selection = window.getSelection();
  if (selection?.rangeCount && sendMessageBody?.contains(selection.anchorNode)) {
    return selection.getRangeAt(0);
  }
  if (sendMessageCaretRange && sendMessageBody?.contains(sendMessageCaretRange.startContainer)) {
    return sendMessageCaretRange.cloneRange();
  }

  const range = document.createRange();
  if (sendMessageBody) {
    range.selectNodeContents(sendMessageBody);
    range.collapse(false);
  }
  return range;
}

function getSendMessageRangeAtPoint(x, y) {
  const fromPoint = document.caretRangeFromPoint?.(x, y);
  if (fromPoint && sendMessageBody?.contains(fromPoint.startContainer)) return fromPoint;

  const position = document.caretPositionFromPoint?.(x, y);
  if (position && sendMessageBody?.contains(position.offsetNode)) {
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  return getSendMessageCaretRange();
}

function placeSendMessageCaret(node, after) {
  const selection = window.getSelection();
  const range = document.createRange();
  if (after) range.setStartAfter(node);
  else range.setStartBefore(node);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
  sendMessageCaretRange = range.cloneRange();
}

function placeSendMessageCaretAfter(node) {
  placeSendMessageCaret(node, true);
}

function placeSendMessageCaretBefore(node) {
  placeSendMessageCaret(node, false);
}

function insertSendMessageText(text) {
  if (!text || !sendMessageBody) return;

  const range = getSendMessageCaretRange();
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  placeSendMessageCaretAfter(node);
  syncSendMessageBodyEmpty();
}

function insertSendMessageImages(files, range = getSendMessageCaretRange()) {
  const images = getSendMessageImageFiles(files);
  if (!images.length || !sendMessageBody) return;

  sendMessageBody.focus({ preventScroll: true });
  range.deleteContents();

  let lastImage = null;
  images.forEach((file) => {
    const name = file.name || "Attached image";
    const figure = document.createElement("figure");
    figure.className = "send-message-inline-image";
    figure.contentEditable = "false";

    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = name;
    image.draggable = false;

    const removeButton = document.createElement("button");
    removeButton.className = "ui-control send-message-inline-image-remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${name}`);
    removeButton.innerHTML = '<img src="../../assets/icons/remove.svg" alt="" aria-hidden="true">';

    figure.append(image, removeButton);
    range.insertNode(figure);
    range.setStartAfter(figure);
    range.collapse(true);
    lastImage = figure;
  });

  ensureSendMessageCaretSlots();
  const trailingLine = lastImage?.nextElementSibling;
  if (sendMessageLineIsEmpty(trailingLine) && trailingLine.firstChild) {
    placeSendMessageCaretBefore(trailingLine.firstChild);
  } else if (lastImage) {
    placeSendMessageCaretAfter(lastImage);
  }
  syncSendMessageBodyEmpty();
  window.WefranchFieldErrors?.clear(sendMessageBodyField);
  lastImage?.scrollIntoView({ block: "nearest" });
}

function clearSendMessageBody() {
  sendMessageCaretRange = null;
  if (sendMessageAttachInput) sendMessageAttachInput.value = "";
  if (sendMessageBody) sendMessageBody.replaceChildren();
  ensureSendMessageCaretSlots();
  syncSendMessageBodyEmpty();
}

function syncSendMessageTemplate() {
  const templateId = getSendMessageTemplateId();
  const hasTemplate = Boolean(templateId);
  const showPreviewImage = templateId === CAMPAIGN_DESIGN_PREVIEW_TEMPLATE_ID;

  sendMessageCard?.classList.toggle("has-template", hasTemplate);
  if (sendMessageEditor) sendMessageEditor.hidden = hasTemplate;
  if (sendMessageAttach) sendMessageAttach.hidden = hasTemplate;
  if (sendMessageTemplatePreview) sendMessageTemplatePreview.hidden = !hasTemplate;
  sendMessageTemplatePreviewFrame?.classList.toggle("is-unavailable", hasTemplate && !showPreviewImage);
  if (sendMessageTemplateImage) sendMessageTemplateImage.hidden = !showPreviewImage;
  if (sendMessageTemplateUnavailable) {
    sendMessageTemplateUnavailable.hidden = !hasTemplate || showPreviewImage;
  }
  if (hasTemplate && sendMessageTemplatePreviewFrame) {
    sendMessageTemplatePreviewFrame.scrollTop = 0;
  }
  if (hasTemplate) window.WefranchFieldErrors?.clear(sendMessageBodyField);
}

function setSendMessagePending(isPending) {
  sendMessagePending = isPending;
  sendMessageSend?.classList.toggle("is-loading", isPending);
  if (sendMessageSend) sendMessageSend.disabled = isPending;
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

  sendMessageFromApi?.setOptions(getSendMessageSenderOptions(), { placeholder: "Select sender" });
  sendMessageFromApi?.reset(getDefaultCampaignSenderEmail());
  sendMessageRecipientsApi?.setOptions(getSendMessageRecipientOptions(), { placeholder: "Add recipient" });
  sendMessageRecipientsApi?.reset("");
  sendMessageTemplateApi?.setOptions(getSendMessageTemplateOptions(), { placeholder: "Select" });
  sendMessageTemplateApi?.reset("");

  if (sendMessageSubject) sendMessageSubject.value = "";
  clearSendMessageBody();
  syncSendMessageTemplate();
}

function focusSendMessageRecipients() {
  window.requestAnimationFrame(() => {
    sendMessageRecipientsField?.querySelector(".filter-combobox-input")?.focus({ preventScroll: true });
  });
}

function openSendMessageCard() {
  if (!sendMessageCard) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");

  if (isSendMessageOpen()) {
    focusSendMessageRecipients();
    return;
  }

  window.clearTimeout(sendMessageCloseTimeoutId);
  resetSendMessageForm();
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
  const body = getSendMessageBodyText();

  if (!isCampaignSenderEmailAuthorized(senderEmail)) {
    errors.push({ field: sendMessageFromField, message: SEND_MESSAGE_FIELD_ERRORS.sender });
  }
  if (!recipients.length) {
    errors.push({ field: sendMessageRecipientsField, message: SEND_MESSAGE_FIELD_ERRORS.recipients });
  }
  if (!subject) {
    errors.push({ field: sendMessageSubject, message: SEND_MESSAGE_FIELD_ERRORS.subject });
  }
  if (!getSendMessageTemplateId() && !body && !sendMessageImageUrls.size) {
    errors.push({ field: sendMessageBody, message: SEND_MESSAGE_FIELD_ERRORS.body });
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

  const recipientCount = window.WefranchFilterCombobox.getValues(sendMessageRecipientsSelect).length;
  setSendMessagePending(true);
  sendMessageSendTimeoutId = window.setTimeout(() => {
    sendMessageSendTimeoutId = null;
    setSendMessagePending(false);
    closeSendMessageCard();
    window.WefranchToast?.show({
      message: `Message sent to ${recipientCount.toLocaleString("en-US")} ${recipientCount === 1 ? "recipient" : "recipients"}.`
    });
  }, SEND_MESSAGE_SEND_DELAY_MS);
}

sendMessageFromApi = window.WefranchFilterCombobox.enhance(sendMessageFromSelect, {
  singleSelect: true,
  clearable: false,
  searchable: false
});

sendMessageRecipientsApi = window.WefranchFilterCombobox.enhance(sendMessageRecipientsSelect, {
  singleSelect: false,
  clearable: true,
  searchable: true,
  openOnQuery: true
});

const sendMessageRecipientsControl = sendMessageRecipientsField?.querySelector(".filter-combobox-control");
sendMessageRecipientsControl?.classList.add("proto-scrollbar");

sendMessageRecipientsField?.addEventListener("focusin", () => {
  sendMessageRecipientsApi?.setOptions(getSendMessageRecipientOptions(), { placeholder: "Add recipient" });
});

let sendMessageRecipientCount = 0;
sendMessageRecipientsSelect?.addEventListener("change", () => {
  const recipientCount = window.WefranchFilterCombobox.getValues(sendMessageRecipientsSelect).length;
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

sendMessageTemplateSelect?.addEventListener("change", syncSendMessageTemplate);

sendMessageAttach?.addEventListener("click", () => {
  sendMessageAttachInput?.click();
});

sendMessageAttachInput?.addEventListener("change", () => {
  insertSendMessageImages(sendMessageAttachInput.files);
  sendMessageAttachInput.value = "";
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !sendMessageBody?.contains(selection.anchorNode)) return;
  sendMessageCaretRange = selection.getRangeAt(0).cloneRange();
});

sendMessageBody?.addEventListener("focus", ensureSendMessageCaretSlots);

sendMessageBody?.addEventListener("input", () => {
  ensureSendMessageCaretSlots();
  syncSendMessageBodyEmpty();
});

sendMessageBodyField?.addEventListener("mousedown", (event) => {
  if (getSendMessageTemplateId()) return;
  if (event.target !== sendMessageBodyField) return;
  event.preventDefault();
  sendMessageBody?.focus({ preventScroll: true });
});

sendMessageBody?.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".send-message-inline-image-remove");
  if (!removeButton || !sendMessageBody.contains(removeButton)) return;

  event.preventDefault();
  const figure = removeButton.closest(".send-message-inline-image");
  const next = figure?.nextSibling;
  const previous = figure?.previousSibling;
  figure?.remove();
  let line = sendMessageBody.querySelector(".send-message-line");
  while (line) {
    const following = line.nextElementSibling;
    if (sendMessageLineIsEmpty(line) && sendMessageLineIsEmpty(following)) following.remove();
    else line = following;
  }
  ensureSendMessageCaretSlots();
  syncSendMessageBodyEmpty();
  sendMessageBody.focus({ preventScroll: true });
  if (next && sendMessageBody.contains(next)) placeSendMessageCaretBefore(next.nodeType === Node.ELEMENT_NODE ? next.firstChild || next : next);
  else if (previous && sendMessageBody.contains(previous)) placeSendMessageCaretAfter(previous);
});

sendMessageBody?.addEventListener("paste", (event) => {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  const images = getClipboardImageFiles(event.clipboardData);
  if (text) insertSendMessageText(text);
  if (images.length) insertSendMessageImages(images);
});

sendMessageBodyField?.addEventListener("dragover", (event) => {
  if (!isSendMessageFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  sendMessageBodyField.classList.add("is-dragging-image");
});

sendMessageBodyField?.addEventListener("dragleave", (event) => {
  if (sendMessageBodyField.contains(event.relatedTarget)) return;
  sendMessageBodyField.classList.remove("is-dragging-image");
});

sendMessageBodyField?.addEventListener("drop", (event) => {
  sendMessageBodyField.classList.remove("is-dragging-image");
  if (!isSendMessageFileDrag(event)) return;
  event.preventDefault();
  insertSendMessageImages(event.dataTransfer.files, getSendMessageRangeAtPoint(event.clientX, event.clientY));
});

sendMessageOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openSendMessageCard();
});

sendMessageClose?.addEventListener("click", closeSendMessageCard);

sendMessageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSendMessage();
});

sendMessageSubject?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  if (sendMessageEditor && !sendMessageEditor.hidden) {
    sendMessageBody.focus({ preventScroll: true });
    return;
  }
  submitSendMessage();
});

sendMessageCard?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || isSendMessageDropdownOpen()) return;
  event.preventDefault();
  closeSendMessageCard();
});
