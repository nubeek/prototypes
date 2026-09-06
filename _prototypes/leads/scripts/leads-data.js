(function () {
  const store = window.WefranchLeadsStore;
  const LEAD_LISTS = store?.LEAD_LISTS || [];
  const LEAD_STAGES = store?.LEAD_STAGES || ["New"];

  const card = document.querySelector(".card");
  const filterPanel = document.getElementById("filterPanel");
  const filterToggle = document.getElementById("filterToggle");
  const filterToggleLabel = document.getElementById("filterToggleLabel");
  const filterSummary = document.getElementById("filterSummary");
  const clearAllFilters = document.getElementById("clearAllFilters");
  const stageFilterGroup = document.getElementById("stageFilterGroup");
  const listFilterSelect = document.getElementById("listFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const datesAddedFromField = document.getElementById("datesAddedFromField");
  const datesAddedToField = document.getElementById("datesAddedToField");
  const filterDate = window.WefranchFilterDate;
  const filterCombobox = window.WefranchFilterCombobox;
  const tableWrap = document.getElementById("tableWrap");
  const tableBody = document.getElementById("leadsTableBody");
  const tableEmptyState = document.getElementById("tableEmptyState");
  const tableEmptyStateMessage = document.getElementById("tableEmptyStateMessage");
  const tableEmptyStateAction = document.getElementById("tableEmptyStateAction");
  const tableEmptyStateClear = document.getElementById("tableEmptyStateClear");
  const tableHeadingSummary = document.getElementById("tableHeadingSummary");
  const toolbarSearchInput = document.getElementById("toolbarSearchInput");
  const toolbarSearchClear = document.getElementById("toolbarSearchClear");

  let searchQuery = "";
  let selectedStages = [];
  let selectedLists = [];
  let excludedLists = [];
  let selectedFranchises = [];
  let excludedFranchises = [];
  let datesAddedFrom = "";
  let datesAddedTo = "";
  let sortKey = "addedAt";
  let sortDirection = "descending";
  let selectedLeadId = null;
  const selectedLeadIds = new Set();

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInitials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function formatLeadDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function getAllLeads() {
    return store?.getAll?.() || [];
  }

  function getLead(id) {
    return store?.getById?.(id) || null;
  }

  function getSourceLabel(lead) {
    return store?.getSourceLabel?.(lead) || (lead?.source === "cst" ? "Prospects" : "Manual");
  }

  function getSourceHref(lead) {
    return store?.getSourceHref?.(lead) || "";
  }

  function splitFranchiseValues(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function joinFranchiseValues(values) {
    return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item || "").trim()).filter(Boolean))]
      .join(", ");
  }

  function getFranchiseOptions(leads = getAllLeads(), extraValues = []) {
    return [...new Set([
      ...leads.flatMap((lead) => splitFranchiseValues(lead.franchise)),
      ...splitFranchiseValues(Array.isArray(extraValues) ? extraValues.join(", ") : extraValues)
    ])].sort((left, right) => (
      left.localeCompare(right, undefined, { sensitivity: "base" })
    ));
  }

  function getLeadDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function datesAddedFilterIsActive() {
    return Boolean(datesAddedFrom || datesAddedTo);
  }

  function getAppliedFilterCount() {
    return selectedStages.length
      + selectedLists.length
      + excludedLists.length
      + selectedFranchises.length
      + excludedFranchises.length
      + (datesAddedFilterIsActive() ? 1 : 0);
  }

  function leadMatchesListFilter(lead) {
    if (excludedLists.includes(lead.list)) return false;
    if (!selectedLists.length) return true;
    return selectedLists.includes(lead.list);
  }

  function leadMatchesFranchiseFilter(lead) {
    const franchises = splitFranchiseValues(lead.franchise);
    if (franchises.some((franchise) => excludedFranchises.includes(franchise))) return false;
    if (!selectedFranchises.length) return true;
    return franchises.some((franchise) => selectedFranchises.includes(franchise));
  }

  function leadMatchesDatesAddedFilter(lead) {
    if (!datesAddedFilterIsActive()) return true;

    const leadDate = getLeadDateKey(lead.addedAt);
    if (!leadDate) return false;
    if (datesAddedFrom && leadDate < datesAddedFrom) return false;
    if (datesAddedTo && leadDate > datesAddedTo) return false;
    return true;
  }

  function leadMatchesFilters(lead) {
    if (selectedStages.length && !selectedStages.includes(lead.stage)) return false;
    if (!leadMatchesListFilter(lead)) return false;
    if (!leadMatchesFranchiseFilter(lead)) return false;
    if (!leadMatchesDatesAddedFilter(lead)) return false;

    if (!searchQuery) return true;

    const haystack = [
      lead.name,
      lead.firstName,
      lead.surname,
      lead.email,
      lead.phone,
      lead.franchise,
      lead.ownerName,
      lead.location,
      lead.locationPlace?.label,
      lead.locationPlace?.stateCode,
      lead.website,
      lead.linkedin,
      window.WefranchCategories.getRecordLabel(lead),
      lead.categoryId,
      lead.list,
      lead.stage,
      lead.note,
      getSourceLabel(lead)
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(searchQuery);
  }

  function getVisibleLeads() {
    const leads = getAllLeads().filter(leadMatchesFilters);
    const direction = sortDirection === "ascending" ? 1 : -1;

    return leads.sort((left, right) => {
      const leftValue = sortKey === "addedAt" ? Date.parse(left.addedAt) || 0 : String(left[sortKey] || "").toLocaleLowerCase();
      const rightValue = sortKey === "addedAt" ? Date.parse(right.addedAt) || 0 : String(right[sortKey] || "").toLocaleLowerCase();

      if (leftValue < rightValue) return -1 * direction;
      if (leftValue > rightValue) return 1 * direction;
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    });
  }

  function getSelectMarkup(id, field, value, options, placeholder) {
    const displayValue = String(value || "").trim() || placeholder;
    const isStage = field === "stage";
    const optionMarkup = [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...options.map((option) => `
        <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>
      `)
    ].join("");

    return `
      <div class="filter-select-field table-select-field${isStage ? " table-stage-field" : ""}"${isStage && value ? ` data-stage="${escapeHtml(value)}"` : ""}>
        <span class="table-select-value${value ? "" : " is-placeholder"}" aria-hidden="true">${escapeHtml(displayValue)}</span>
        <select class="ui-select filter-field-select table-select" data-lead-id="${escapeHtml(id)}" data-lead-field="${field}" aria-label="${escapeHtml(field)}">
          ${optionMarkup}
        </select>
        ${isStage
          ? `<span class="table-stage-chevron" aria-hidden="true"></span>`
          : `<img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">`}
      </div>
    `;
  }

  function getEmptyValueMarkup(value, className = "") {
    const text = String(value || "").trim();
    const classes = ["lead-cell-text", className].filter(Boolean).join(" ");
    if (text) return `<span class="${classes}" title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
    return `<span class="${classes} dataset-empty-value">–</span>`;
  }

  function getFranchiseCellMarkup(value) {
    const franchises = splitFranchiseValues(value);
    if (!franchises.length) return getEmptyValueMarkup("");

    const [first, ...rest] = franchises;
    const title = franchises.join(", ");
    if (!rest.length) {
      return `<span class="lead-cell-text" title="${escapeHtml(title)}">${escapeHtml(first)}</span>`;
    }

    return `
      <span class="lead-franchise-stack" title="${escapeHtml(title)}">
        <span class="lead-franchise-label">${escapeHtml(first)}</span>
        <span class="lead-franchise-more">+${rest.length}</span>
      </span>
    `;
  }

  function getEmailCellMarkup(value) {
    const email = String(value || "").trim();
    if (!email) return getEmptyValueMarkup("");
    return `<span class="ui-link ui-ellipsis email contact-email-copy" tabindex="0" role="button" title="${escapeHtml(email)}">${escapeHtml(email)}</span>`;
  }

  function getAddLeadRowMarkup() {
    return `
      <tr class="leads-add-row">
        <td class="location-number-cell">
          <button class="leads-add-row-button" type="button" aria-label="Add lead">
            <span class="leads-add-row-icon" aria-hidden="true"></span>
          </button>
        </td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `;
  }

  function getRowSelectionState(leads = getVisibleLeads()) {
    const selectedCount = leads.reduce((count, lead) => (
      selectedLeadIds.has(lead.id) ? count + 1 : count
    ), 0);
    const totalCount = leads.length;

    return {
      totalCount,
      selectedCount,
      allSelected: totalCount > 0 && selectedCount === totalCount,
      partiallySelected: selectedCount > 0 && selectedCount < totalCount
    };
  }

  function syncSelectAllHeader(leads = getVisibleLeads()) {
    const selectAllLabel = document.querySelector("#leadSelectColumnHeader .location-select-all");
    const selectAllCheckbox = document.querySelector("#leadSelectColumnHeader .location-select-all-checkbox");
    if (!(selectAllLabel instanceof HTMLLabelElement) || !(selectAllCheckbox instanceof HTMLInputElement)) return;

    const { allSelected, partiallySelected } = getRowSelectionState(leads);
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = partiallySelected;
    selectAllLabel.classList.toggle("is-indeterminate", partiallySelected);
  }

  function getRowSelectCellMarkup(lead, rowNumber, isChecked) {
    return `
      <td class="location-number-cell">
        <label class="location-row-select" aria-label="Select lead row ${rowNumber}">
          <input
            class="location-row-checkbox"
            type="checkbox"
            data-lead-id="${escapeHtml(lead.id)}"
            ${isChecked ? "checked" : ""}
          >
          <span class="location-row-number" aria-hidden="true">${rowNumber}</span>
          <span class="location-row-checkbox-visual" aria-hidden="true"></span>
        </label>
      </td>
    `;
  }

  function setLeadChecked(id, isChecked) {
    if (!id) return;
    if (isChecked) selectedLeadIds.add(id);
    else selectedLeadIds.delete(id);

    const row = tableBody?.querySelector(`tr[data-lead-id="${CSS.escape(id)}"]`);
    const checkbox = row?.querySelector(".location-row-checkbox");
    row?.classList.toggle("is-checked", Boolean(isChecked));
    if (checkbox instanceof HTMLInputElement) checkbox.checked = Boolean(isChecked);
    syncSelectAllHeader();
  }

  function setVisibleLeadsChecked(isChecked) {
    getVisibleLeads().forEach((lead) => {
      if (isChecked) selectedLeadIds.add(lead.id);
      else selectedLeadIds.delete(lead.id);
    });

    tableBody?.querySelectorAll("tr[data-lead-id]").forEach((row) => {
      const checkbox = row.querySelector(".location-row-checkbox");
      if (checkbox instanceof HTMLInputElement) checkbox.checked = Boolean(isChecked);
      row.classList.toggle("is-checked", Boolean(isChecked));
    });
    syncSelectAllHeader();
  }

  function getLeadRowMarkup(lead, rowIndex) {
    const isSelected = selectedLeadId === lead.id;
    const isChecked = selectedLeadIds.has(lead.id);
    const rowNumber = rowIndex + 1;

    return `
      <tr class="${[isSelected ? "is-selected" : "", isChecked ? "is-checked" : ""].filter(Boolean).join(" ")}" data-lead-id="${escapeHtml(lead.id)}">
        ${getRowSelectCellMarkup(lead, rowNumber, isChecked)}
        <td class="contact-cell">
          <div class="contact-cell-action">
            <button
              class="ui-control contact-profile-action"
              type="button"
              data-lead-id="${escapeHtml(lead.id)}"
              aria-label="Open profile for ${escapeHtml(lead.name)}"
            >
              <span class="name-cell">
                <span class="ui-avatar raw-avatar" aria-hidden="true">${escapeHtml(getInitials(lead.name) || "?")}</span>
                <span class="owner-meta">
                  <span class="contact-name">${escapeHtml(lead.name)}</span>
                </span>
              </span>
            </button>
          </div>
        </td>
        <td class="lead-email-cell">${getEmailCellMarkup(lead.email)}</td>
        <td>${getEmptyValueMarkup(lead.phone)}</td>
        <td class="lead-franchise-cell">${getFranchiseCellMarkup(lead.franchise)}</td>
        <td class="lead-select-cell">${getSelectMarkup(lead.id, "list", lead.list, LEAD_LISTS, "Select")}</td>
        <td class="lead-select-cell">${getSelectMarkup(lead.id, "stage", lead.stage, LEAD_STAGES, "Select")}</td>
        <td>${getEmptyValueMarkup(formatLeadDate(lead.addedAt))}</td>
      </tr>
    `;
  }

  function syncSortHeaders() {
    document.querySelectorAll(".sortable-header").forEach((header) => {
      if (header.dataset.sortKey === sortKey) {
        header.setAttribute("aria-sort", sortDirection);
        header.dataset.sortDirection = sortDirection;
        return;
      }

      header.setAttribute("aria-sort", "none");
      delete header.dataset.sortDirection;
    });
  }

  function syncEmptyState(visibleCount, totalCount) {
    const isEmpty = visibleCount === 0;
    tableWrap?.classList.toggle("is-empty", isEmpty);
    if (!tableEmptyState) return;

    tableEmptyState.hidden = !isEmpty;
    if (!isEmpty) return;

    const hasFilters = Boolean(searchQuery) || getAppliedFilterCount() > 0;
    if (totalCount === 0) {
      if (tableEmptyStateMessage) {
        tableEmptyStateMessage.textContent = "No leads yet. Save a contact as a lead from Prospects to see them here.";
      }
      if (tableEmptyStateAction) tableEmptyStateAction.hidden = false;
      if (tableEmptyStateClear) tableEmptyStateClear.hidden = true;
      return;
    }

    if (tableEmptyStateMessage) {
      tableEmptyStateMessage.textContent = "We couldn't find anything matching your search.";
    }
    if (tableEmptyStateAction) tableEmptyStateAction.hidden = true;
    if (tableEmptyStateClear) tableEmptyStateClear.hidden = !hasFilters;
  }

  function syncSummaries(visibleCount, totalCount) {
    const appliedCount = getAppliedFilterCount();
    if (filterSummary) {
      filterSummary.textContent = `Showing ${visibleCount} of ${totalCount} records`;
    }
    if (tableHeadingSummary) {
      tableHeadingSummary.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "lead" : "leads"}.`;
    }
    if (clearAllFilters) {
      clearAllFilters.textContent = `Clear all (${appliedCount})`;
    }
    if (filterToggleLabel) {
      filterToggleLabel.textContent = appliedCount ? `Filters (${appliedCount})` : "Filters";
    }
    window.WefranchFilterSections?.updateClearButtons?.(filterPanel, (section) => {
      const key = section.dataset.filterSection;
      if (key === "stage") return selectedStages.length > 0;
      if (key === "list") return selectedLists.length > 0 || excludedLists.length > 0;
      if (key === "franchise") return selectedFranchises.length > 0 || excludedFranchises.length > 0;
      if (key === "dates") return datesAddedFilterIsActive();
      return false;
    });
  }

  function getCheckedValues(group) {
    return Array.from(group?.querySelectorAll("input[type='checkbox']:checked") || [])
      .map((input) => input.value)
      .filter(Boolean);
  }

  function toSelectOptions(values) {
    return values.map((value) => ({ label: value, value }));
  }

  function renderCheckGroup(group, options, selectedValues) {
    if (!group) return;

    group.innerHTML = options.map((option) => `
      <label class="filter-check ${selectedValues.includes(option) ? "is-checked" : ""}">
        <input type="checkbox" value="${escapeHtml(option)}" ${selectedValues.includes(option) ? "checked" : ""}>
        <span class="filter-checkbox" aria-hidden="true"></span>
        <span>${escapeHtml(option)}</span>
      </label>
    `).join("");
  }

  function readComboboxFilters() {
    selectedLists = filterCombobox?.getIncludedValues?.(listFilterSelect) || [];
    excludedLists = filterCombobox?.getExcludedValues?.(listFilterSelect) || [];
    selectedFranchises = filterCombobox?.getIncludedValues?.(franchiseFilterSelect) || [];
    excludedFranchises = filterCombobox?.getExcludedValues?.(franchiseFilterSelect) || [];
  }

  function readDateFilters() {
    datesAddedFrom = filterDate?.getValue?.(datesAddedFromField) || "";
    datesAddedTo = filterDate?.getValue?.(datesAddedToField) || "";
  }

  function writeDateFilters() {
    filterDate?.setValue?.(datesAddedFromField, datesAddedFrom);
    filterDate?.setValue?.(datesAddedToField, datesAddedTo);
  }

  function applyDateInput(which) {
    readDateFilters();
    if (datesAddedFrom && datesAddedTo && datesAddedFrom > datesAddedTo) {
      if (which === "from") datesAddedTo = datesAddedFrom;
      else datesAddedFrom = datesAddedTo;
    }
    writeDateFilters();
    renderTable();
  }

  function clearDateFilters() {
    datesAddedFrom = "";
    datesAddedTo = "";
    writeDateFilters();
  }

  function initDateFilters() {
    filterDate?.enhance?.(datesAddedFromField, {
      onChange() {
        applyDateInput("from");
      }
    });
    filterDate?.enhance?.(datesAddedToField, {
      onChange() {
        applyDateInput("to");
      }
    });
  }

  function syncFilterInputsFromState() {
    selectedStages = getCheckedValues(stageFilterGroup);
    readComboboxFilters();
    readDateFilters();
  }

  function pruneFranchiseSelections() {
    const validFranchises = new Set(getFranchiseOptions());
    selectedFranchises = selectedFranchises.filter((value) => validFranchises.has(value));
    excludedFranchises = excludedFranchises.filter((value) => validFranchises.has(value));
  }

  function syncFranchiseFilterOptions() {
    if (!franchiseFilterSelect || !filterCombobox) return;

    filterCombobox.setOptions(franchiseFilterSelect, toSelectOptions(getFranchiseOptions()), {
      placeholder: "Select franchise"
    });
    filterCombobox.setIncludedExcludedValues(
      franchiseFilterSelect,
      selectedFranchises,
      excludedFranchises
    );
    filterCombobox.getCombobox(franchiseFilterSelect)?.sync();
  }

  function syncListFilterValues() {
    if (!listFilterSelect || !filterCombobox) return;

    filterCombobox.setIncludedExcludedValues(listFilterSelect, selectedLists, excludedLists);
    filterCombobox.getCombobox(listFilterSelect)?.sync();
  }

  function clearCombobox(select) {
    filterCombobox?.setValues?.(select, []);
    filterCombobox?.getCombobox?.(select)?.sync();
  }

  function renderFilters() {
    renderCheckGroup(stageFilterGroup, LEAD_STAGES, selectedStages);
    syncListFilterValues();
    syncFranchiseFilterOptions();
    writeDateFilters();
  }

  function initFilterComboboxes() {
    if (!filterCombobox) return;

    if (listFilterSelect) {
      filterCombobox.setOptions(listFilterSelect, toSelectOptions(LEAD_LISTS), {
        placeholder: "Select list"
      });
      filterCombobox.enhance(listFilterSelect, { allowExclude: true });
      listFilterSelect.addEventListener("change", () => {
        readComboboxFilters();
        renderTable();
      });
    }

    if (franchiseFilterSelect) {
      filterCombobox.setOptions(franchiseFilterSelect, toSelectOptions(getFranchiseOptions()), {
        placeholder: "Select franchise"
      });
      filterCombobox.enhance(franchiseFilterSelect, { allowExclude: true });
      franchiseFilterSelect.addEventListener("change", () => {
        readComboboxFilters();
        renderTable();
      });
    }
  }

  function renderTable() {
    const allLeads = getAllLeads();
    const visibleLeads = getVisibleLeads();

    if (tableBody) {
      tableBody.innerHTML = `${visibleLeads.map(getLeadRowMarkup).join("")}${getAddLeadRowMarkup()}`;
    }

    syncSortHeaders();
    syncSelectAllHeader(visibleLeads);
    syncEmptyState(visibleLeads.length, allLeads.length);
    syncSummaries(visibleLeads.length, allLeads.length);
    window.WefranchLeadModals?.syncLeadDetail?.();
  }

  function refresh({ persistFilters = true } = {}) {
    if (persistFilters) syncFilterInputsFromState();
    pruneFranchiseSelections();
    renderFilters();
    renderTable();
  }

  function setSearchQuery(value) {
    searchQuery = String(value || "").trim().toLocaleLowerCase();
    const searchField = toolbarSearchInput?.closest(".toolbar-search-btn");
    searchField?.classList.toggle("is-active-search", Boolean(searchQuery));
    if (toolbarSearchClear) toolbarSearchClear.hidden = !searchQuery;
    renderTable();
  }

  function setSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
    } else {
      sortKey = key;
      sortDirection = key === "name" || key === "email" || key === "franchise" || key === "list" || key === "stage" || key === "phone"
        ? "ascending"
        : "descending";
    }
    renderTable();
  }

  function setSelectedLead(id) {
    selectedLeadId = id || null;
    tableBody?.querySelectorAll("tr[data-lead-id]").forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.leadId === selectedLeadId);
    });
  }

  function updateLead(id, changes) {
    const existing = getLead(id);
    if (!existing) return null;

    const next = store.upsert({ ...existing, ...changes, id });
    refresh();
    return next;
  }

  function removeLead(id) {
    if (!id) return false;
    const removed = store.remove(id);
    if (selectedLeadId === id) selectedLeadId = null;
    selectedLeadIds.delete(id);
    refresh();
    return removed;
  }

  function addLead(record) {
    const next = store.upsert(record);
    refresh();
    return next;
  }

  function clearFilters() {
    selectedStages = [];
    selectedLists = [];
    excludedLists = [];
    selectedFranchises = [];
    excludedFranchises = [];
    clearCombobox(listFilterSelect);
    clearCombobox(franchiseFilterSelect);
    clearDateFilters();
    if (toolbarSearchInput) {
      toolbarSearchInput.value = "";
    }
    searchQuery = "";
    toolbarSearchInput?.closest(".toolbar-search-btn")?.classList.remove("is-active-search");
    if (toolbarSearchClear) toolbarSearchClear.hidden = true;
    renderFilters();
    renderTable();
  }

  function clearSectionFilters(section) {
    const key = section?.dataset.filterSection;
    if (key === "stage") selectedStages = [];
    if (key === "list") {
      selectedLists = [];
      excludedLists = [];
      clearCombobox(listFilterSelect);
    }
    if (key === "franchise") {
      selectedFranchises = [];
      excludedFranchises = [];
      clearCombobox(franchiseFilterSelect);
    }
    if (key === "dates") clearDateFilters();
    renderFilters();
    renderTable();
  }

  function setFilterPanelOpen(isOpen) {
    if (!card || !filterToggle) return;
    card.classList.toggle("is-filter-open", Boolean(isOpen));
    filterToggle.classList.toggle("is-active", Boolean(isOpen));
    filterToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  }

  window.WefranchLeadsPage = {
    LEAD_LISTS,
    LEAD_STAGES,
    getAllLeads,
    getVisibleLeads,
    getLead,
    refresh,
    renderFilters,
    setSearchQuery,
    setSort,
    setSelectedLead,
    setLeadChecked,
    setVisibleLeadsChecked,
    updateLead,
    removeLead,
    addLead,
    clearFilters,
    clearSectionFilters,
    setFilterPanelOpen,
    getInitials,
    formatLeadDate,
    getSourceLabel,
    getSourceHref,
    escapeHtml,
    getSelectMarkup,
    splitFranchiseValues,
    joinFranchiseValues,
    getFranchiseOptions
  };

  initFilterComboboxes();
  initDateFilters();
  renderFilters();
  renderTable();
})();
