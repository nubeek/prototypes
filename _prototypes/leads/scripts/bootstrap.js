(function () {
  const page = window.WefranchLeadsPage;
  const modals = window.WefranchLeadModals;
  if (!page) return;

  const card = document.querySelector(".card");
  const filterPanel = document.getElementById("filterPanel");
  const filterToggle = document.getElementById("filterToggle");
  const clearAllFilters = document.getElementById("clearAllFilters");
  const tableWrap = document.getElementById("tableWrap");
  const tableBody = document.getElementById("leadsTableBody");
  const leadListTabs = document.getElementById("leadListTabs");
  const tableEmptyStateClear = document.getElementById("tableEmptyStateClear");
  const tableEmptyStateAddDropdown = document.getElementById("tableEmptyStateAddDropdown");
  const tableEmptyStateAddManual = document.getElementById("tableEmptyStateAddManual");
  const tableEmptyStateImportCsv = document.getElementById("tableEmptyStateImportCsv");
  const leadImportCsvInput = document.getElementById("leadImportCsvInput");
  const toolbarSearchBtn = document.getElementById("toolbarSearchBtn");
  const leadsToolbarMenuDropdown = document.getElementById("leadsToolbarMenuDropdown");
  const manageColumnsOption = document.getElementById("manageColumnsOption");
  const deleteSelectedLeadsBtn = document.getElementById("deleteSelectedLeadsBtn");
  const moveSelectedLeadsDropdown = document.getElementById("moveSelectedLeadsDropdown");
  const moveSelectedLeadsMenu = document.getElementById("moveSelectedLeadsMenu");
  const addLeadBtn = document.getElementById("addLeadBtn");
  const leadDetailPanel = document.getElementById("leadDetailPanel");
  const deleteSelectedLeadsConfirmApi = window.createProtoConfirmModal?.();

  window.WefranchFilterCombobox?.bindOutsideClick?.();

  window.WefranchFilterSections?.enhanceHeaders?.(filterPanel, {
    onClear(section) {
      page.clearSectionFilters(section);
    }
  });
  window.WefranchFilterSections?.bindCollapseToggle?.(filterPanel);

  filterToggle?.addEventListener("click", () => {
    page.setFilterPanelOpen(!card?.classList.contains("is-filter-open"));
  });

  clearAllFilters?.addEventListener("click", () => {
    page.clearFilters();
  });

  tableEmptyStateClear?.addEventListener("click", () => {
    page.clearFilters();
  });

  function closeEmptyStateAddDropdown() {
    tableEmptyStateAddDropdown?.removeAttribute("open");
  }

  function closeLeadsToolbarMenuDropdown() {
    leadsToolbarMenuDropdown?.removeAttribute("open");
  }

  function closeMoveSelectedLeadsDropdown() {
    moveSelectedLeadsDropdown?.removeAttribute("open");
  }

  function getDeleteSelectedLeadsCopy(leads) {
    const count = leads.length;
    const noun = count === 1 ? "lead" : "leads";
    return {
      title: "Delete selected leads?",
      messageHtml: `Are you sure you want to delete<br><span class="lead-delete-confirm-count">the ${count} selected ${noun}?</span>`
    };
  }

  tableEmptyStateAddManual?.addEventListener("click", (event) => {
    event.preventDefault();
    closeEmptyStateAddDropdown();
    modals?.openAddLead(tableEmptyStateAddManual);
  });

  tableEmptyStateImportCsv?.addEventListener("click", (event) => {
    event.preventDefault();
    closeEmptyStateAddDropdown();
    if (!leadImportCsvInput) return;
    leadImportCsvInput.value = "";
    leadImportCsvInput.click();
  });

  leadImportCsvInput?.addEventListener("change", async () => {
    const file = leadImportCsvInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      page.importCsv(text);
    } catch (error) {
      console.warn("[leads] CSV import failed", error);
    }

    leadImportCsvInput.value = "";
  });

  manageColumnsOption?.addEventListener("click", (event) => {
    event.preventDefault();
    closeLeadsToolbarMenuDropdown();
    page.openManageColumns?.(manageColumnsOption);
  });

  deleteSelectedLeadsBtn?.addEventListener("click", () => {
    const leads = page.getSelectedLeads?.() || [];
    if (!leads.length) return;

    closeMoveSelectedLeadsDropdown();
    const copy = getDeleteSelectedLeadsCopy(leads);
    deleteSelectedLeadsConfirmApi?.open({
      title: copy.title,
      messageHtml: copy.messageHtml,
      cancelLabel: "Cancel",
      confirmLabel: "Delete",
      trigger: deleteSelectedLeadsBtn,
      onConfirm() {
        page.removeSelectedLeads?.();
      }
    });
  });

  moveSelectedLeadsDropdown?.addEventListener("toggle", () => {
    if (!moveSelectedLeadsDropdown.open) return;
    closeLeadsToolbarMenuDropdown();
    page.renderMoveToMenu?.();
  });

  moveSelectedLeadsMenu?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const moveTo = event.target.closest("[data-move-to-list]");
    if (moveTo) {
      event.preventDefault();
      closeMoveSelectedLeadsDropdown();
      page.moveSelectedLeadsToList?.(moveTo.dataset.moveToList);
      return;
    }

    const removeFromLists = event.target.closest("[data-remove-from-lists]");
    if (removeFromLists) {
      event.preventDefault();
      closeMoveSelectedLeadsDropdown();
      page.removeSelectedLeadsFromAssignedLists?.();
      return;
    }

    const removeFrom = event.target.closest("[data-remove-from-list]");
    if (!removeFrom) return;

    event.preventDefault();
    closeMoveSelectedLeadsDropdown();
    page.removeSelectedLeadsFromList?.(removeFrom.dataset.removeFromList);
  });

  document.addEventListener("click", (event) => {
    if (tableEmptyStateAddDropdown?.open && !tableEmptyStateAddDropdown.contains(event.target)) {
      closeEmptyStateAddDropdown();
    }

    if (leadsToolbarMenuDropdown?.open && !leadsToolbarMenuDropdown.contains(event.target)) {
      closeLeadsToolbarMenuDropdown();
    }

    if (moveSelectedLeadsDropdown?.open && !moveSelectedLeadsDropdown.contains(event.target)) {
      closeMoveSelectedLeadsDropdown();
    }
  });

  window.WefranchFilterQuickSearch?.bindToolbarQuickSearchLauncher({
    trigger: toolbarSearchBtn,
    isPanelOpen: () => Boolean(card?.classList.contains("is-filter-open")),
    setPanelOpen: (isOpen) => page.setFilterPanelOpen(isOpen)
  });

  addLeadBtn?.addEventListener("click", () => {
    modals?.openAddLead(addLeadBtn);
  });

  document.querySelector("#tableWrap thead")?.addEventListener("click", (event) => {
    const header = event.target instanceof Element ? event.target.closest(".sortable-header") : null;
    const key = header?.dataset.sortKey;
    if (key) page.setSort(key);
  });

  filterPanel?.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== "checkbox") return;
    event.target.closest(".filter-check")?.classList.toggle("is-checked", event.target.checked);
    page.refresh();
  });

  async function copyContactEmail(emailElement) {
    const email = emailElement.textContent.trim();
    if (!email) return;

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
  }

  const ROW_DRAG_HOLD_MS = 25;
  let draggedLeadIds = [];
  let rowDragHoldTimer = 0;
  let rowDragPointerDownAt = 0;
  let rowDragDidMove = false;

  function isRowDragIgnoredTarget(target) {
    return target instanceof Element && target.closest("select, .filter-select-field, a, .location-row-select, .contact-email-copy");
  }

  function clearRowDragHold() {
    if (!rowDragHoldTimer) return;
    window.clearTimeout(rowDragHoldTimer);
    rowDragHoldTimer = 0;
  }

  function clearRowDragReady() {
    tableBody?.querySelectorAll("tr.is-drag-ready").forEach((row) => row.classList.remove("is-drag-ready"));
  }

  tableBody?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    if (isRowDragIgnoredTarget(event.target)) return;
    const row = event.target.closest("tr[data-lead-id]");
    if (!row) return;

    rowDragPointerDownAt = Date.now();
    rowDragDidMove = false;
    clearRowDragHold();
    rowDragHoldTimer = window.setTimeout(() => {
      rowDragHoldTimer = 0;
      row.classList.add("is-drag-ready");
    }, ROW_DRAG_HOLD_MS);
  });

  function endRowDragHold() {
    clearRowDragHold();
    if (!rowDragDidMove) clearRowDragReady();
  }

  document.addEventListener("pointerup", endRowDragHold);
  document.addEventListener("pointercancel", endRowDragHold);

  tableBody?.addEventListener("click", (event) => {
    if (rowDragDidMove) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!(event.target instanceof Element)) return;

    const addRow = event.target.closest(".leads-add-row");
    if (addRow) {
      event.preventDefault();
      event.stopPropagation();
      modals?.openAddLead(addRow.querySelector(".leads-add-row-button") || addRow);
      return;
    }

    const emailCopy = event.target.closest(".contact-email-copy");
    if (emailCopy) {
      event.preventDefault();
      event.stopPropagation();
      copyContactEmail(emailCopy);
      return;
    }

    if (event.target.closest(".location-row-select")) {
      event.stopPropagation();
      return;
    }

    if (event.target.closest("select, .filter-select-field, a")) return;

    const profileAction = event.target.closest(".contact-profile-action");
    const row = event.target.closest("tr[data-lead-id]");
    const leadId = profileAction?.dataset.leadId || row?.dataset.leadId;
    if (!leadId) return;

    modals?.openLeadDetail(leadId, profileAction || row);
  });

  tableBody?.addEventListener("dragstart", (event) => {
    const row = event.target instanceof Element ? event.target.closest("tr[data-lead-id]") : null;
    if (!row) return;
    if (isRowDragIgnoredTarget(event.target) || Date.now() - rowDragPointerDownAt < ROW_DRAG_HOLD_MS) {
      event.preventDefault();
      return;
    }

    const leadId = row.dataset.leadId;
    const isPartOfSelection = page.isLeadSelected?.(leadId);
    draggedLeadIds = isPartOfSelection ? page.getSelectedLeadIds?.() ?? [leadId] : [leadId];
    rowDragDidMove = true;
    clearRowDragHold();

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedLeadIds.join(","));

    tableBody.querySelectorAll("tr[data-lead-id]").forEach((nextRow) => {
      nextRow.classList.toggle("is-dragging", draggedLeadIds.includes(nextRow.dataset.leadId));
    });
    syncDisabledListTabs();
  });

  tableBody?.addEventListener("dragend", () => {
    tableBody.querySelectorAll(".is-dragging").forEach((row) => row.classList.remove("is-dragging"));
    clearListTabDropState();
    clearRowDragReady();
    draggedLeadIds = [];
    window.setTimeout(() => {
      rowDragDidMove = false;
    }, 0);
  });

  function listNameForTab(tab) {
    return tab?.dataset.listTab === "all" ? "" : tab?.dataset.listTab || "";
  }

  function draggedLeadsAlreadyInList(listName) {
    if (!draggedLeadIds.length) return false;
    return draggedLeadIds.every((id) => (page.getLead?.(id)?.list || "") === listName);
  }

  function syncDisabledListTabs() {
    leadListTabs?.querySelectorAll(".list-tab[data-list-tab]").forEach((tab) => {
      const disabled = tab.dataset.listTab === "all" || draggedLeadsAlreadyInList(listNameForTab(tab));
      tab.classList.toggle("is-drop-disabled", disabled);
      if (disabled) tab.setAttribute("aria-disabled", "true");
      else tab.removeAttribute("aria-disabled");
    });
  }

  function clearListTabDropTargets() {
    leadListTabs?.querySelectorAll(".list-tab.is-drop-target").forEach((tab) => tab.classList.remove("is-drop-target"));
  }

  function clearListTabDropState() {
    clearListTabDropTargets();
    leadListTabs?.querySelectorAll(".list-tab.is-drop-disabled").forEach((tab) => {
      tab.classList.remove("is-drop-disabled");
      tab.removeAttribute("aria-disabled");
    });
  }

  leadListTabs?.addEventListener("dragover", (event) => {
    const tab = event.target instanceof Element ? event.target.closest(".list-tab[data-list-tab]") : null;
    if (!draggedLeadIds.length) return;
    if (!tab || tab.classList.contains("is-drop-disabled")) {
      clearListTabDropTargets();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearListTabDropTargets();
    tab.classList.add("is-drop-target");
  });

  leadListTabs?.addEventListener("dragleave", (event) => {
    const tab = event.target instanceof Element ? event.target.closest(".list-tab[data-list-tab]") : null;
    const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (tab && !tab.contains(related)) tab.classList.remove("is-drop-target");
  });

  leadListTabs?.addEventListener("drop", (event) => {
    const tab = event.target instanceof Element ? event.target.closest(".list-tab[data-list-tab]") : null;
    clearListTabDropTargets();
    if (!tab || tab.classList.contains("is-drop-disabled") || !draggedLeadIds.length) return;
    event.preventDefault();

    page.moveLeadsToList?.(draggedLeadIds, listNameForTab(tab));
  });

  tableBody?.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.classList.contains("location-row-checkbox")) {
      page.setLeadChecked(target.dataset.leadId, target.checked);
      return;
    }

    applyLeadSelectChange(target);
  });

  function applyLeadSelectChange(target) {
    if (!(target instanceof HTMLSelectElement)) return;

    const leadId = target.dataset.leadId;
    const field = target.dataset.leadField;
    if (!leadId || (field !== "list" && field !== "stage")) return;

    page.updateLead(leadId, { [field]: target.value });
  }

  leadDetailPanel?.addEventListener("change", (event) => {
    applyLeadSelectChange(event.target);
  });

  document.querySelector("#tableWrap thead")?.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!event.target.classList.contains("location-select-all-checkbox")) return;
    page.setVisibleLeadsChecked(event.target.checked);
  });

  tableWrap?.addEventListener("scroll", () => {
    if (!tableWrap) return;
    const hasHorizontalOverflow = tableWrap.scrollWidth > tableWrap.clientWidth;
    const hasLeftOverlap = tableWrap.scrollLeft > 0;
    const hasVerticalOverflow = tableWrap.scrollHeight > tableWrap.clientHeight;
    const hasTopOverlap = tableWrap.scrollTop > 0;
    tableWrap.classList.toggle("is-name-column-overlap", hasHorizontalOverflow && hasLeftOverlap);
    tableWrap.classList.toggle("is-header-row-overlap", hasVerticalOverflow && hasTopOverlap);
  }, { passive: true });

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== storeKey()) return;
    page.refresh({ persistFilters: false });
  });

  function storeKey() {
    return window.WefranchLeadsStore?.STORAGE_KEY || "wefranch:crm-leads";
  }

  const leadFromQuery = new URLSearchParams(window.location.search).get("lead");
  if (leadFromQuery) {
    modals?.openLeadDetail(leadFromQuery);
  }
})();
