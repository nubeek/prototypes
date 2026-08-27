const SAVE_LEAD_NOTE_LINE_HEIGHT = 24;
const CRM_LEAD_LISTS = [
  "Denver territory prospects",
  "High priority outreach",
  "Multi-unit operators",
  "Q2 pipeline",
  "West coast expansion"
];

let pendingSaveLeadOwnerIndex = null;
let pendingSaveLeadNodeId = null;
let pendingSaveLeadProspectRowKey = null;

function getSaveLeadListOptions() {
  return CRM_LEAD_LISTS.map((label) => ({ label, value: label }));
}

function initSaveLeadListSelect() {
  if (!saveLeadListSelect) return null;

  window.WefranchFilterCombobox.setOptions(saveLeadListSelect, getSaveLeadListOptions(), {
    placeholder: "Select"
  });

  return window.WefranchFilterCombobox.enhance(saveLeadListSelect, {
    singleSelect: true,
    clearable: true,
    searchable: true
  });
}

saveLeadListApi = initSaveLeadListSelect();

function getSaveLeadContact(ownerIndex, nodeId, prospectRowKey = null) {
  if (prospectRowKey) {
    const row = getProspectRowByStateKey(prospectRowKey);
    if (!row) return null;
    return { name: row.name, email: row.email, phone: row.phone || "" };
  }

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  if (!owner) return null;

  if (nodeId) {
    const row = getOwnerRawRows(ownerIndex).find((item) => item.nodeId === nodeId);
    if (row) {
      return { name: row.name, email: row.email, phone: row.phone || "" };
    }
  }

  const profile = getPersonProfileFromOwnerContact(ownerIndex);
  if (profile) {
    return { name: profile.name, email: profile.email, phone: profile.phone || "" };
  }

  return {
    name: owner.contactName || owner.ownerName,
    email: owner.email || "",
    phone: owner.phone || ""
  };
}

function splitSaveLeadName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return { firstName: "", surname: "" };

  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed, surname: "" };

  return {
    firstName: trimmed.slice(0, spaceIndex),
    surname: trimmed.slice(spaceIndex + 1).trim()
  };
}

function resetSaveLeadNoteHeight() {
  if (saveLeadNote) {
    saveLeadNote.style.height = `${SAVE_LEAD_NOTE_LINE_HEIGHT}px`;
  }
  if (saveLeadNoteField) {
    saveLeadNoteField.style.height = `${SAVE_LEAD_NOTE_LINE_HEIGHT}px`;
  }
}

function syncSaveLeadNoteHeight() {
  if (!saveLeadNoteField || !saveLeadNote || saveLeadNoteField.hidden) return;

  saveLeadNoteField.style.height = "auto";
  const nextHeight = Math.max(SAVE_LEAD_NOTE_LINE_HEIGHT, saveLeadNoteField.scrollHeight);
  saveLeadNote.style.height = `${nextHeight}px`;
  saveLeadNoteField.style.height = `${nextHeight}px`;
}

function collapseSaveLeadContactFields() {
  saveLeadContact?.classList.remove("is-editing", "is-expanding");
  saveLeadContactFields?.setAttribute("hidden", "");
  saveLeadContactSummary?.removeAttribute("hidden");
  saveLeadEditDetails?.setAttribute("aria-expanded", "false");
  if (saveLeadContact) {
    saveLeadContact.style.height = "";
  }
}

function expandSaveLeadContactFields() {
  if (!saveLeadContact || !saveLeadContactFields || !saveLeadContactSummary) return;
  if (saveLeadContact.classList.contains("is-editing")) return;

  const skipMotion = document.body.classList.contains("reduce-motion");
  const startHeight = saveLeadContact.offsetHeight;
  saveLeadContactSummary.setAttribute("hidden", "");
  saveLeadContactFields.removeAttribute("hidden");
  saveLeadContact.classList.add("is-editing");
  saveLeadEditDetails?.setAttribute("aria-expanded", "true");

  if (skipMotion) {
    saveLeadFirstName?.focus({ preventScroll: true });
    return;
  }

  const endHeight = saveLeadContact.scrollHeight;
  saveLeadContact.classList.add("is-expanding");
  saveLeadContact.style.height = `${startHeight}px`;

  window.requestAnimationFrame(() => {
    if (!saveLeadContact.classList.contains("is-editing")) return;
    saveLeadContact.style.height = `${endHeight}px`;
  });

  const finishExpand = (event) => {
    if (event && event.propertyName !== "height") return;
    saveLeadContact.removeEventListener("transitionend", finishExpand);
    window.clearTimeout(finishExpand.timeoutId);
    saveLeadContact.classList.remove("is-expanding");
    if (saveLeadContact.classList.contains("is-editing")) {
      saveLeadContact.style.height = "";
      saveLeadFirstName?.focus({ preventScroll: true });
    }
  };
  finishExpand.timeoutId = window.setTimeout(finishExpand, 280);
  saveLeadContact.addEventListener("transitionend", finishExpand);
}

function resetSaveLeadModalForm() {
  if (!saveLeadModalForm) return;

  saveLeadModalForm.reset();
  saveLeadListApi?.reset();
  collapseSaveLeadContactFields();
  saveLeadNoteField?.setAttribute("hidden", "");
  saveLeadNoteToggle?.removeAttribute("hidden");
  if (saveLeadNoteField) saveLeadNoteField.value = "";
  resetSaveLeadNoteHeight();
}

function renderSaveLeadContact(contact) {
  const name = contact?.name || "";
  const email = contact?.email || "";
  const phone = contact?.phone || "";
  const { firstName, surname } = splitSaveLeadName(name);

  if (saveLeadContactName) saveLeadContactName.textContent = name;
  if (saveLeadContactEmail) saveLeadContactEmail.textContent = email;
  if (saveLeadFirstName) saveLeadFirstName.value = firstName;
  if (saveLeadSurname) saveLeadSurname.value = surname;
  if (saveLeadEmail) saveLeadEmail.value = email;
  if (saveLeadPhone) saveLeadPhone.value = phone;
}

const saveLeadModalApi = window.createProtoModal({
  overlay: saveLeadModal,
  closeSelectors: ".save-lead-modal-close, .save-lead-modal-cancel",
  onBeforeClose() {
    saveLeadListApi?.close();
  },
  onClose() {
    saveLeadListApi?.close();
    resetSaveLeadModalForm();
    pendingSaveLeadOwnerIndex = null;
    pendingSaveLeadNodeId = null;
    pendingSaveLeadProspectRowKey = null;
  },
  shouldCloseOnEscape() {
    if (saveLeadListField?.classList.contains("is-open")) {
      saveLeadListApi?.close();
      return false;
    }
    return true;
  }
});

function closeSaveLeadModal() {
  saveLeadModalApi.close();
}

function revealSaveLeadModal(trigger) {
  saveLeadModalApi.open(trigger, {
    focus: saveLeadModal?.querySelector(".save-lead-modal-close")
  });
}

function openSaveLeadModal(ownerIndex, nodeId = null, trigger = null, prospectRowKey = null) {
  if (!saveLeadModal) return;

  if (prospectRowKey) {
    const row = getProspectRowByStateKey(prospectRowKey);
    if (!row || isProspectRowLeadSaved(row)) return;

    const contact = getSaveLeadContact(null, null, prospectRowKey);
    if (!contact) return;

    pendingSaveLeadOwnerIndex = null;
    pendingSaveLeadNodeId = null;
    pendingSaveLeadProspectRowKey = prospectRowKey;
    resetSaveLeadModalForm();
    renderSaveLeadContact(contact);
    revealSaveLeadModal(trigger);
    return;
  }

  if (!Number.isFinite(ownerIndex)) return;
  if (isContactLeadSaved(ownerIndex, nodeId)) return;

  const contact = getSaveLeadContact(ownerIndex, nodeId);
  if (!contact) return;

  pendingSaveLeadOwnerIndex = ownerIndex;
  pendingSaveLeadNodeId = nodeId;
  pendingSaveLeadProspectRowKey = null;
  resetSaveLeadModalForm();
  renderSaveLeadContact(contact);
  revealSaveLeadModal(trigger);
}

function syncOwnerDetailLeadButton(ownerIndex) {
  const button = ownerDetailsPanel?.querySelector(".owner-detail-contact-lead-action");
  if (!button || Number(button.dataset.ownerIndex) !== ownerIndex) return;

  const owner = owners.find((item) => item.originalIndex === ownerIndex);
  const hasSavedLead = isContactLeadSaved(ownerIndex, null);
  button.classList.toggle("is-saved", hasSavedLead);
  button.textContent = hasSavedLead ? "Remove from leads" : "Save as lead";
  if (owner) {
    button.setAttribute(
      "aria-label",
      hasSavedLead
        ? `Remove ${owner.contactName} from leads`
        : `Save ${owner.contactName} as a lead`
    );
  }
}

function handleSaveLeadAction(trigger, ownerIndex, nodeId = null, prospectRowKey = null) {
  if (prospectRowKey) {
    const row = getProspectRowByStateKey(prospectRowKey);
    if (!row) return;

    if (trigger?.classList.contains("is-saved") || isProspectRowLeadSaved(row)) {
      setProspectRowLeadSaved(row, false);
      refreshContactStateViews();
      return;
    }

    openSaveLeadModal(null, null, trigger, prospectRowKey);
    return;
  }

  if (!Number.isFinite(ownerIndex)) return;

  if (trigger?.classList.contains("is-saved") || isContactLeadSaved(ownerIndex, nodeId)) {
    setContactLeadSaved(ownerIndex, nodeId, false);
    refreshContactStateViews();
    syncOwnerDetailLeadButton(ownerIndex);
    return;
  }

  openSaveLeadModal(ownerIndex, nodeId, trigger);
}

function confirmSaveLeadFromModal() {
  if (pendingSaveLeadProspectRowKey) {
    const row = getProspectRowByStateKey(pendingSaveLeadProspectRowKey);
    if (!row) return;

    setProspectRowLeadSaved(row, true);
    refreshContactStateViews();
    closeSaveLeadModal();
    return;
  }

  if (!Number.isFinite(pendingSaveLeadOwnerIndex)) return;

  setContactLeadSaved(pendingSaveLeadOwnerIndex, pendingSaveLeadNodeId, true);
  refreshContactStateViews();
  syncOwnerDetailLeadButton(pendingSaveLeadOwnerIndex);
  closeSaveLeadModal();
}

function toggleSaveLeadNoteField() {
  if (!saveLeadNoteField || !saveLeadNoteToggle || !saveLeadNoteField.hidden) return;

  saveLeadNoteToggle.setAttribute("hidden", "");
  saveLeadNoteField.removeAttribute("hidden");
  resetSaveLeadNoteHeight();
  saveLeadNoteField.focus({ preventScroll: true });
}

if (saveLeadNoteField) {
  saveLeadNoteField.addEventListener("input", syncSaveLeadNoteHeight);
}
