const SAVE_LEAD_LIST_PLACEHOLDER = "Select...";
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

function initSaveLeadListSelector() {
  if (!saveLeadListSelector || !saveLeadListSelectorField || !saveLeadListInput || !saveLeadListClear || !saveLeadListOptions) {
    return null;
  }

  const menu = document.getElementById("saveLeadListMenu");
  const allOptions = getSaveLeadListOptions();
  let isOpen = false;
  let searchQuery = "";
  let activeOptionIndex = -1;
  let renderedOptions = [];
  let selectedListValue = "";

  function setSelectedListValue(value) {
    selectedListValue = value;
    saveLeadListInput.dataset.value = value;
  }

  function setActiveOption(index) {
    const optionButtons = Array.from(saveLeadListOptions.querySelectorAll(".dropdown-option"));
    if (!optionButtons.length) {
      activeOptionIndex = -1;
      saveLeadListInput.removeAttribute("aria-activedescendant");
      return;
    }

    activeOptionIndex = (index + optionButtons.length) % optionButtons.length;
    optionButtons.forEach((optionButton, optionIndex) => {
      const isActive = optionIndex === activeOptionIndex;
      optionButton.classList.toggle("is-active", isActive);
      if (isActive) {
        saveLeadListInput.setAttribute("aria-activedescendant", optionButton.id);
        optionButton.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function syncInputDisplay() {
    const hasSelection = Boolean(selectedListValue);

    saveLeadListSelector.setAttribute("data-list-active", String(hasSelection));
    saveLeadListSelectorField.classList.toggle("has-selection", hasSelection);
    saveLeadListClear.hidden = !hasSelection;

    if (!isOpen) {
      if (hasSelection) {
        saveLeadListInput.value = selectedListValue;
        saveLeadListInput.placeholder = "";
      } else {
        saveLeadListInput.value = "";
        saveLeadListInput.placeholder = SAVE_LEAD_LIST_PLACEHOLDER;
      }
    }

    saveLeadListOptions.querySelectorAll(".dropdown-option").forEach((option) => {
      const isSelected = option.dataset.listValue === selectedListValue;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
  }

  function renderOptions() {
    const normalizedQuery = normalizeComboboxText(searchQuery);
    renderedOptions = allOptions.filter((option) => (
      normalizeComboboxText(option.label).includes(normalizedQuery)
    ));

    saveLeadListOptions.innerHTML = "";

    if (!renderedOptions.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "dropdown-empty";
      emptyState.textContent = "No results found";
      saveLeadListOptions.append(emptyState);
      activeOptionIndex = -1;
      saveLeadListInput.removeAttribute("aria-activedescendant");
      return;
    }

    renderedOptions.forEach((option, index) => {
      const optionButton = document.createElement("button");
      const optionLabel = document.createElement("span");
      const optionCheck = document.createElement("img");
      const isSelected = option.value === selectedListValue;

      optionButton.type = "button";
      optionButton.className = "ui-menu-item toolbar-dropdown-option dropdown-option";
      optionButton.id = `saveLeadListOption-${index}`;
      optionButton.dataset.listValue = option.value;
      optionButton.setAttribute("role", "option");
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", String(isSelected));

      optionLabel.className = "toolbar-dropdown-label";
      optionLabel.textContent = option.label;

      optionCheck.className = "dropdown-option-check";
      optionCheck.src = "assets/check.svg";
      optionCheck.alt = "";
      optionCheck.setAttribute("aria-hidden", "true");

      optionButton.append(optionLabel, optionCheck);

      optionButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      optionButton.addEventListener("click", () => {
        setSelectedListValue(option.value);
        close({ restoreDisplay: true });
        saveLeadListInput.blur();
      });

      saveLeadListOptions.append(optionButton);
    });

    if (activeOptionIndex >= renderedOptions.length) {
      activeOptionIndex = -1;
    }

    if (activeOptionIndex >= 0) {
      setActiveOption(activeOptionIndex);
    } else {
      saveLeadListInput.removeAttribute("aria-activedescendant");
    }
  }

  function open({ selectInputText = false } = {}) {
    isOpen = true;
    searchQuery = "";
    saveLeadListInput.value = "";
    saveLeadListSelectorField.classList.add("is-open");
    saveLeadListInput.setAttribute("aria-expanded", "true");
    renderOptions();

    if (selectInputText) {
      saveLeadListInput.focus({ preventScroll: true });
    }
  }

  function close({ restoreDisplay = true } = {}) {
    if (!isOpen) return;

    isOpen = false;
    searchQuery = "";
    activeOptionIndex = -1;
    saveLeadListSelectorField.classList.remove("is-open");
    saveLeadListInput.setAttribute("aria-expanded", "false");
    saveLeadListInput.removeAttribute("aria-activedescendant");

    if (restoreDisplay) {
      syncInputDisplay();
    }
  }

  function reset() {
    close({ restoreDisplay: false });
    setSelectedListValue("");
    syncInputDisplay();
  }

  saveLeadListInput.addEventListener("focus", () => {
    open({ selectInputText: true });
  });

  saveLeadListInput.addEventListener("input", () => {
    searchQuery = saveLeadListInput.value;

    if (!isOpen) {
      isOpen = true;
      saveLeadListSelectorField.classList.add("is-open");
      saveLeadListInput.setAttribute("aria-expanded", "true");
    }

    renderOptions();
  });

  saveLeadListInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
        if (renderedOptions.length) {
          setActiveOption(event.key === "ArrowDown" ? 0 : renderedOptions.length - 1);
        }
        return;
      }
      setActiveOption(activeOptionIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || activeOptionIndex < 0) return;
      event.preventDefault();
      setSelectedListValue(renderedOptions[activeOptionIndex].value);
      close({ restoreDisplay: true });
      saveLeadListInput.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreDisplay: true });
      saveLeadListInput.blur();
    }
  });

  saveLeadListInput.addEventListener("blur", () => {
    window.setTimeout(() => close({ restoreDisplay: true }), 100);
  });

  saveLeadListClear.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  saveLeadListClear.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedListValue("");
    syncInputDisplay();
    close({ restoreDisplay: true });
  });

  saveLeadListSelectorField.addEventListener("mousedown", (event) => {
    if (
      event.target === saveLeadListInput ||
      menu?.contains(event.target) ||
      saveLeadListClear.contains(event.target)
    ) {
      return;
    }

    const wasOpen = isOpen;
    event.preventDefault();
    saveLeadListInput.focus({ preventScroll: true });

    if (wasOpen) {
      close({ restoreDisplay: true });
    } else {
      open({ selectInputText: true });
    }
  });

  syncInputDisplay();

  return { close, reset, getValue: () => selectedListValue };
}

saveLeadListSelectorApi = initSaveLeadListSelector();

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
  saveLeadListSelectorApi?.reset();
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
    saveLeadListSelectorApi?.close();
  },
  onClose() {
    saveLeadListSelectorApi?.close();
    resetSaveLeadModalForm();
    pendingSaveLeadOwnerIndex = null;
    pendingSaveLeadNodeId = null;
    pendingSaveLeadProspectRowKey = null;
  },
  shouldCloseOnEscape() {
    if (saveLeadListSelectorField?.classList.contains("is-open")) {
      saveLeadListSelectorApi?.close();
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
