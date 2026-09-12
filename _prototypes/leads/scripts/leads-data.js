(function () {
  const store = window.WefranchLeadsStore;
  const LEAD_STAGES = store?.LEAD_STAGES || ["New"];
  const COLUMNS_STORAGE_KEY = "wefranch:crm-lead-columns-v2";
  const MAX_VISIBLE_COLUMNS = 7;
  const TABLE_COLUMNS = [
    { key: "name", label: "Name", header: "Name", locked: true, width: "18%" },
    { key: "email", label: "Email", header: "Email", locked: true, width: "20%" },
    { key: "phone", label: "Phone", header: "Phone", width: "13%" },
    { key: "location", label: "Location", header: "Location", width: "16%" },
    { key: "company", label: "Company", header: "Company", width: "15%" },
    { key: "stage", label: "Stage", header: "Stage", width: "12%" },
    { key: "addedAt", label: "Date added", header: "Added", width: "8%" },
    { key: "list", label: "List", header: "List", width: "14%" },
    { key: "category", label: "Category", header: "Category", width: "14%" },
    { key: "website", label: "Website", header: "Website", width: "16%" },
    { key: "linkedin", label: "LinkedIn", header: "LinkedIn", width: "16%" },
    { key: "notes", label: "Notes", header: "Notes", width: "18%" },
    { key: "source", label: "Source", header: "Source", width: "12%" }
  ];
  const DEFAULT_VISIBLE_COLUMNS = TABLE_COLUMNS.slice(0, MAX_VISIBLE_COLUMNS).map((column) => column.key);
  const LOCKED_COLUMN_KEYS = TABLE_COLUMNS.filter((column) => column.locked).map((column) => column.key);

  const card = document.querySelector(".card");
  const filterPanel = document.getElementById("filterPanel");
  const filterToggle = document.getElementById("filterToggle");
  const filterToggleLabel = document.getElementById("filterToggleLabel");
  const filterSummary = document.getElementById("filterSummary");
  const clearAllFilters = document.getElementById("clearAllFilters");
  const stageFilterGroup = document.getElementById("stageFilterGroup");
  const locationFilterSelect = document.getElementById("locationFilterSelect");
  const categoryFilterSelect = document.getElementById("categoryFilterSelect");
  const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
  const companyFilterSelect = document.getElementById("companyFilterSelect");
  const datesAddedFromField = document.getElementById("datesAddedFromField");
  const datesAddedToField = document.getElementById("datesAddedToField");
  const filterDate = window.WefranchFilterDate;
  const filterCombobox = window.WefranchFilterCombobox;
  const tableWrap = document.getElementById("tableWrap");
  const tableHeaderRow = document.getElementById("leadsTableHeaderRow");
  const tableBody = document.getElementById("leadsTableBody");
  const tableEmptyState = document.getElementById("tableEmptyState");
  const tableEmptyStateCopy = document.getElementById("tableEmptyStateCopy");
  const tableEmptyStateMessage = document.getElementById("tableEmptyStateMessage");
  const tableEmptyStateActions = document.getElementById("tableEmptyStateActions");
  const tableEmptyStateClear = document.getElementById("tableEmptyStateClear");
  const tableEmptyStateAddDropdown = document.getElementById("tableEmptyStateAddDropdown");
  const tableHeadingSummary = document.getElementById("tableHeadingSummary");
  const leadListTabs = document.getElementById("leadListTabs");
  const toolbarSearchInput = document.getElementById("toolbarSearchInput");
  const toolbarSearchClear = document.getElementById("toolbarSearchClear");
  const leadSelectionActions = document.getElementById("leadSelectionActions");
  const moveSelectedLeadsDropdown = document.getElementById("moveSelectedLeadsDropdown");
  const moveSelectedLeadsMenu = document.getElementById("moveSelectedLeadsMenu");

  let searchQuery = "";
  let selectedStages = [];
  let selectedLists = [];
  let excludedLists = [];
  let selectedLocations = [];
  let excludedLocations = [];
  let selectedCategories = [];
  let excludedCategories = [];
  let selectedFranchises = [];
  let excludedFranchises = [];
  let selectedCompanies = [];
  let excludedCompanies = [];
  let datesAddedFrom = "";
  let datesAddedTo = "";
  let visibleColumnKeys = readSavedColumns();
  let sortKey = "addedAt";
  let sortDirection = "descending";
  let selectedLeadId = null;
  const selectedLeadIds = new Set();
  let isCreatingList = false;
  let createListDraft = "";

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

  function getKnownColumnKeys() {
    return TABLE_COLUMNS.map((column) => column.key);
  }

  function normalizeColumnKeys(keys) {
    const requested = new Set([
      ...LOCKED_COLUMN_KEYS,
      ...(Array.isArray(keys) ? keys : [])
    ].map((key) => String(key || "").trim()).filter(Boolean));

    return getKnownColumnKeys()
      .filter((key) => requested.has(key))
      .slice(0, MAX_VISIBLE_COLUMNS);
  }

  function readSavedColumns() {
    try {
      const savedValue = window.localStorage?.getItem(COLUMNS_STORAGE_KEY);
      if (!savedValue) return [...DEFAULT_VISIBLE_COLUMNS];

      const parsedValue = JSON.parse(savedValue);
      const next = normalizeColumnKeys(parsedValue);
      return next.length >= LOCKED_COLUMN_KEYS.length ? next : [...DEFAULT_VISIBLE_COLUMNS];
    } catch (error) {
      console.warn("Unable to read saved lead columns.", error);
      return [...DEFAULT_VISIBLE_COLUMNS];
    }
  }

  function writeSavedColumns(keys) {
    try {
      window.localStorage?.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.warn("Unable to save lead columns.", error);
    }
  }

  function parseColumnWidth(width) {
    return Number.parseFloat(width) || 0;
  }

  function getVisibleColumnDefs() {
    const visible = new Set(visibleColumnKeys);
    const columns = TABLE_COLUMNS.filter((column) => visible.has(column.key));
    const totalWidth = columns.reduce((sum, column) => sum + parseColumnWidth(column.width), 0);

    if (!totalWidth) return columns;

    return columns.map((column) => ({
      ...column,
      width: `${(parseColumnWidth(column.width) / totalWidth) * 100}%`
    }));
  }

  function isColumnVisible(key) {
    return visibleColumnKeys.includes(key);
  }

  function getColumnSortValue(lead, key) {
    if (key === "addedAt") return Date.parse(lead.addedAt) || 0;
    if (key === "company") return getCompanyName(lead);
    if (key === "category") return window.WefranchCategories?.getRecordLabel?.(lead) || "";
    if (key === "notes") return lead?.note || "";
    if (key === "source") return getSourceLabel(lead);
    return lead?.[key];
  }

  function getDisplayUrl(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  function getExternalHref(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    return `https://${text}`;
  }

  function setVisibleColumns(keys) {
    visibleColumnKeys = normalizeColumnKeys(keys);
    writeSavedColumns(visibleColumnKeys);

    if (!isColumnVisible(sortKey)) {
      sortKey = isColumnVisible("addedAt") ? "addedAt" : "name";
      sortDirection = sortKey === "addedAt" ? "descending" : "ascending";
    }

    renderTable();
    return [...visibleColumnKeys];
  }

  function normalizeListName(value) {
    return String(value || "").trim();
  }

  function getCatalogLists() {
    return store?.getLists?.() || [];
  }

  function rememberList(name) {
    return store?.rememberList?.(name) || normalizeListName(name);
  }

  function isReservedListName(name) {
    return normalizeListName(name).toLocaleLowerCase() === "all";
  }

  function listNameExists(name, exceptName = "") {
    if (store?.listNameExists) return store.listNameExists(name, exceptName);

    const needle = normalizeListName(name).toLocaleLowerCase();
    const except = normalizeListName(exceptName).toLocaleLowerCase();
    return getKnownLists().some((item) => {
      const value = item.toLocaleLowerCase();
      return value === needle && value !== except;
    });
  }

  function replaceListFilterValue(fromName, toName) {
    const remap = (values) => {
      if (toName == null) return values.filter((item) => item !== fromName);
      return values.map((item) => (item === fromName ? toName : item));
    };

    selectedLists = remap(selectedLists);
    excludedLists = remap(excludedLists);
  }

  function renameList(oldName, newName) {
    const fromName = normalizeListName(oldName);
    const toName = normalizeListName(newName);
    if (!fromName || !toName || isReservedListName(fromName)) return null;
    if (fromName === toName) return toName;
    if (isReservedListName(toName) || listNameExists(toName, fromName)) return null;

    const savedName = store?.renameList?.(fromName, toName);
    if (!savedName) return null;
    replaceListFilterValue(fromName, toName);
    refresh();
    return savedName;
  }

  function removeList(name) {
    const listName = normalizeListName(name);
    if (!listName || isReservedListName(listName)) return false;
    if (!getKnownLists().includes(listName)) return false;

    const deleted = store?.removeList?.(listName);
    if (!deleted) return false;
    replaceListFilterValue(listName, null);
    refresh();
    return true;
  }

  function getKnownLists() {
    if (store?.getKnownLists) return store.getKnownLists();

    const seen = new Set();
    const lists = [];

    [...getCatalogLists(), ...getAllLeads().map((lead) => String(lead.list || "").trim())].forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      lists.push(name);
    });

    return lists;
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

  function getCompanyName(lead) {
    return String(lead?.company || lead?.ownerName || "").trim();
  }

  function getCompanyOptions(leads = getAllLeads(), extraValues = []) {
    return [...new Set([
      ...(store?.getFranchiseeCompanyNames?.() || []),
      ...leads.map((lead) => getCompanyName(lead)),
      ...(Array.isArray(extraValues) ? extraValues : [extraValues])
    ].map((item) => String(item || "").trim()).filter(Boolean))].sort((left, right) => (
      left.localeCompare(right, undefined, { sensitivity: "base" })
    ));
  }

  function getLocationLabel(lead) {
    return String(lead?.locationPlace?.label || lead?.location || "").trim();
  }

  function getLocationOptions(leads = getAllLeads()) {
    return [...new Set(leads.map(getLocationLabel).filter(Boolean))].sort((left, right) => (
      left.localeCompare(right, undefined, { sensitivity: "base" })
    ));
  }

  function getCategoryFilterOptions() {
    return window.WefranchCategories?.getOptions?.() || [];
  }

  function getLeadCategoryId(lead) {
    return window.WefranchCategories?.getRecordId?.(lead) || lead?.categoryId || "";
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
      + selectedLocations.length
      + excludedLocations.length
      + selectedCategories.length
      + excludedCategories.length
      + selectedFranchises.length
      + excludedFranchises.length
      + selectedCompanies.length
      + excludedCompanies.length
      + (datesAddedFilterIsActive() ? 1 : 0);
  }

  function leadMatchesListFilter(lead) {
    if (excludedLists.includes(lead.list)) return false;
    if (!selectedLists.length) return true;
    return selectedLists.includes(lead.list);
  }

  function leadMatchesLocationFilter(lead) {
    const location = getLocationLabel(lead);
    if (location && excludedLocations.includes(location)) return false;
    if (!selectedLocations.length) return true;
    return selectedLocations.includes(location);
  }

  function leadMatchesCategoryFilter(lead) {
    const categoryId = getLeadCategoryId(lead);
    if (categoryId && excludedCategories.includes(categoryId)) return false;
    if (!selectedCategories.length) return true;
    return selectedCategories.includes(categoryId);
  }

  function leadMatchesFranchiseFilter(lead) {
    const franchises = splitFranchiseValues(lead.franchise);
    if (franchises.some((name) => excludedFranchises.includes(name))) return false;
    if (!selectedFranchises.length) return true;
    return franchises.some((name) => selectedFranchises.includes(name));
  }

  function leadMatchesCompanyFilter(lead) {
    const company = getCompanyName(lead);
    if (company && excludedCompanies.includes(company)) return false;
    if (!selectedCompanies.length) return true;
    return selectedCompanies.includes(company);
  }

  function leadMatchesDatesAddedFilter(lead) {
    if (!datesAddedFilterIsActive()) return true;

    const leadDate = getLeadDateKey(lead.addedAt);
    if (!leadDate) return false;
    if (datesAddedFrom && leadDate < datesAddedFrom) return false;
    if (datesAddedTo && leadDate > datesAddedTo) return false;
    return true;
  }

  function leadMatchesNonListFilters(lead) {
    if (selectedStages.length && !selectedStages.includes(lead.stage)) return false;
    if (!leadMatchesLocationFilter(lead)) return false;
    if (!leadMatchesCategoryFilter(lead)) return false;
    if (!leadMatchesFranchiseFilter(lead)) return false;
    if (!leadMatchesCompanyFilter(lead)) return false;
    if (!leadMatchesDatesAddedFilter(lead)) return false;

    if (!searchQuery) return true;

    const haystack = [
      lead.name,
      lead.firstName,
      lead.surname,
      lead.email,
      lead.phone,
      lead.franchise,
      lead.company,
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

  function leadMatchesFilters(lead) {
    if (!leadMatchesListFilter(lead)) return false;
    return leadMatchesNonListFilters(lead);
  }

  function getVisibleLeads() {
    const leads = getAllLeads().filter(leadMatchesFilters);
    const direction = sortDirection === "ascending" ? 1 : -1;

    return leads.sort((left, right) => {
      const leftRaw = getColumnSortValue(left, sortKey);
      const rightRaw = getColumnSortValue(right, sortKey);
      const leftValue = sortKey === "addedAt" ? leftRaw : String(leftRaw || "").toLocaleLowerCase();
      const rightValue = sortKey === "addedAt" ? rightRaw : String(rightRaw || "").toLocaleLowerCase();

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

  function getEmailCellMarkup(value) {
    const email = String(value || "").trim();
    if (!email) return getEmptyValueMarkup("");
    return `<span class="ui-link ui-ellipsis email contact-email-copy" tabindex="0" role="button" title="${escapeHtml(email)}">${escapeHtml(email)}</span>`;
  }

  function getLinkCellMarkup(value, href, displayValue = value) {
    const text = String(displayValue || value || "").trim();
    if (!text) return getEmptyValueMarkup("");
    if (!href) return getEmptyValueMarkup(text);
    return `<a class="ui-link ui-ellipsis" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" title="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
  }

  function getNameCellMarkup(lead) {
    return `
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
    `;
  }

  function getColumnCellMarkup(lead, column) {
    switch (column.key) {
      case "name":
        return `<td class="contact-cell">${getNameCellMarkup(lead)}</td>`;
      case "email":
        return `<td class="lead-email-cell">${getEmailCellMarkup(lead.email)}</td>`;
      case "phone":
        return `<td>${getEmptyValueMarkup(lead.phone)}</td>`;
      case "company":
        return `<td class="lead-company-cell">${getEmptyValueMarkup(getCompanyName(lead))}</td>`;
      case "list":
        return `<td class="lead-select-cell">${getSelectMarkup(lead.id, "list", lead.list, getKnownLists(), "Select")}</td>`;
      case "stage":
        return `<td class="lead-select-cell">${getSelectMarkup(lead.id, "stage", lead.stage, LEAD_STAGES, "Select")}</td>`;
      case "addedAt":
        return `<td>${getEmptyValueMarkup(formatLeadDate(lead.addedAt))}</td>`;
      case "location":
        return `<td>${getEmptyValueMarkup(lead.location)}</td>`;
      case "category":
        return `<td>${getEmptyValueMarkup(window.WefranchCategories?.getRecordLabel?.(lead) || "")}</td>`;
      case "website":
        return `<td class="lead-link-cell">${getLinkCellMarkup(lead.website, getExternalHref(lead.website), getDisplayUrl(lead.website))}</td>`;
      case "linkedin":
        return `<td class="lead-link-cell">${getLinkCellMarkup(lead.linkedin, getExternalHref(lead.linkedin), getDisplayUrl(lead.linkedin))}</td>`;
      case "notes":
        return `<td class="lead-notes-cell">${getEmptyValueMarkup(lead.note, "lead-notes-text")}</td>`;
      case "source": {
        const label = getSourceLabel(lead);
        const href = getSourceHref(lead);
        return `<td class="lead-link-cell">${href ? getLinkCellMarkup(label, href) : getEmptyValueMarkup(label)}</td>`;
      }
      default:
        return `<td>${getEmptyValueMarkup("")}</td>`;
    }
  }

  function getAddLeadRowMarkup() {
    const emptyCells = getVisibleColumnDefs().map(() => "<td></td>").join("");
    return `
      <tr class="leads-add-row">
        <td class="location-number-cell">
          <button class="leads-add-row-button" type="button" aria-label="Add lead">
            <span class="leads-add-row-icon" aria-hidden="true"></span>
          </button>
        </td>
        ${emptyCells}
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
    syncSelectionToolbar();
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
    syncSelectionToolbar();
  }

  function getLeadRowMarkup(lead, rowIndex) {
    const isSelected = selectedLeadId === lead.id;
    const isChecked = selectedLeadIds.has(lead.id);
    const rowNumber = rowIndex + 1;

    return `
      <tr class="${[isSelected ? "is-selected" : "", isChecked ? "is-checked" : ""].filter(Boolean).join(" ")}" data-lead-id="${escapeHtml(lead.id)}">
        ${getRowSelectCellMarkup(lead, rowNumber, isChecked)}
        ${getVisibleColumnDefs().map((column) => getColumnCellMarkup(lead, column)).join("")}
      </tr>
    `;
  }

  function getSelectAllHeaderMarkup() {
    return `
      <th id="leadSelectColumnHeader" class="location-number-header" style="width: 48px">
        <label class="location-row-select location-select-all" aria-label="Select all lead rows">
          <input class="location-row-checkbox location-select-all-checkbox" type="checkbox">
          <span class="location-row-checkbox-visual" aria-hidden="true"></span>
        </label>
      </th>
    `;
  }

  function getColumnHeaderMarkup(column) {
    return `
      <th class="sortable-header" data-sort-key="${escapeHtml(column.key)}" aria-sort="none" style="width: ${escapeHtml(column.width)}">
        <span class="th-content">${escapeHtml(column.header)} <img class="th-chevron" src="../../assets/icons/chevron.svg" alt="" aria-hidden="true"></span>
      </th>
    `;
  }

  function renderTableCols(columns) {
    const table = tableHeaderRow?.closest("table");
    if (!table) return;

    let colgroup = table.querySelector(":scope > colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.prepend(colgroup);
    }

    colgroup.innerHTML = [
      `<col class="lead-select-col">`,
      ...columns.map((column) => `<col style="width: ${escapeHtml(column.width)}">`)
    ].join("");
  }

  function renderTableHeaders() {
    if (!tableHeaderRow) return;
    const columns = getVisibleColumnDefs();
    renderTableCols(columns);
    tableHeaderRow.innerHTML = `${getSelectAllHeaderMarkup()}${columns.map(getColumnHeaderMarkup).join("")}`;
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

  function syncEmptyState(visibleCount) {
    const isEmpty = visibleCount === 0;
    tableWrap?.classList.toggle("is-empty", isEmpty);
    if (!tableEmptyState) return;

    tableEmptyState.hidden = !isEmpty;
    if (!isEmpty) return;

    const hasFilters = Boolean(searchQuery) || getAppliedFilterCount() > 0;
    const isFreshEmpty = !hasFilters;
    if (tableEmptyStateCopy) tableEmptyStateCopy.hidden = !isFreshEmpty;
    if (tableEmptyStateMessage) tableEmptyStateMessage.hidden = isFreshEmpty;
    if (tableEmptyStateActions) tableEmptyStateActions.hidden = !isFreshEmpty;
    if (tableEmptyStateClear) tableEmptyStateClear.hidden = !hasFilters;
    if (!isFreshEmpty) tableEmptyStateAddDropdown?.removeAttribute("open");
  }

  function getActiveListTab() {
    if (excludedLists.length || selectedLists.length > 1) return "";
    if (selectedLists.length === 1) return selectedLists[0];
    return "all";
  }

  function getListTabCount(listName) {
    return getAllLeads().reduce((count, lead) => {
      if (!leadMatchesNonListFilters(lead)) return count;
      if (listName !== "all" && lead.list !== listName) return count;
      return count + 1;
    }, 0);
  }

  function formatLeadCount(count) {
    return `${count} ${count === 1 ? "contact" : "contacts"}`;
  }

  function getListTabMarkup(name, count, isActive) {
    const label = name === "all" ? "All" : name;
    const settingsMarkup = name === "all" ? "" : `
          <button
            class="ui-control list-tab__settings"
            type="button"
            data-list-tab-settings="${escapeHtml(name)}"
            aria-label="List settings for ${escapeHtml(label)}"
          >
            <img class="list-tab__settings-icon" src="../../assets/icons/settings.svg" alt="" aria-hidden="true">
          </button>
    `;
    return `
      <div
        class="list-tab${isActive ? " is-active" : ""}"
        role="tab"
        tabindex="0"
        data-list-tab="${escapeHtml(name)}"
        aria-selected="${isActive ? "true" : "false"}"
        title="${escapeHtml(label)}"
      >
        <span class="list-tab__name">${escapeHtml(label)}</span>
        <span class="list-tab__meta">
          <span class="list-tab__count">${escapeHtml(formatLeadCount(count))}</span>
          ${settingsMarkup}
        </span>
      </div>
    `;
  }

  function canSaveCreateList() {
    return Boolean(normalizeListName(createListDraft));
  }

  function getCreateListActionLabel() {
    return canSaveCreateList() ? "Save" : "Cancel";
  }

  function syncCreateListAction() {
    const button = leadListTabs?.querySelector("[data-list-tab-create-action]");
    if (!(button instanceof HTMLButtonElement)) return;

    const canSave = canSaveCreateList();
    button.textContent = getCreateListActionLabel();
    button.classList.toggle("ui-text-button", canSave);
    button.classList.toggle("list-tab__create-action--cancel", !canSave);
  }

  function getCreateListTabMarkup() {
    const canSave = canSaveCreateList();
    return `
      <div class="list-tab list-tab--create" role="tab">
        <input
          class="list-tab__input"
          id="leadListTabCreateInput"
          type="text"
          maxlength="48"
          placeholder="List name"
          value="${escapeHtml(createListDraft)}"
          aria-label="New list name"
        >
        <span class="list-tab__meta">
          <button
            class="ui-control list-tab__create-action${canSave ? " ui-text-button" : " list-tab__create-action--cancel"}"
            type="button"
            data-list-tab-create-action
          >${getCreateListActionLabel()}</button>
        </span>
      </div>
    `;
  }

  function getListTabDensity(tabCount) {
    if (tabCount <= 3) return "few";
    if (tabCount <= 5) return "medium";
    return "many";
  }

  let createListTooltip = null;
  let createListTooltipTarget = null;

  function getCreateListAddButton(element) {
    if (!(element instanceof Element)) return null;
    return element.closest("[data-list-tab-add]");
  }

  function hideCreateListTooltip() {
    createListTooltipTarget = null;
    createListTooltip?.classList.remove("is-visible");
  }

  function showCreateListTooltip(button) {
    if (!(button instanceof Element)) return;

    createListTooltipTarget = button;
    if (!createListTooltip) {
      createListTooltip = document.createElement("div");
      createListTooltip.className = "filter-combobox-floating-tooltip is-action-tooltip";
      createListTooltip.setAttribute("role", "tooltip");
    }

    createListTooltip.textContent = button.dataset.tooltip || "Create new list";
    if (!createListTooltip.isConnected) document.body.append(createListTooltip);

    createListTooltip.classList.add("is-visible");
    window.fitTooltipToContent?.(createListTooltip);

    const targetRect = button.getBoundingClientRect();
    const tooltipRect = createListTooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);
    createListTooltip.style.left = `${left}px`;
    createListTooltip.style.top = `${top}px`;
  }

  function renderListTabs() {
    if (!leadListTabs) return;
    hideCreateListTooltip();

    const activeTab = getActiveListTab();
    const lists = getKnownLists();
    const tabCount = lists.length + 1;
    leadListTabs.dataset.listDensity = getListTabDensity(tabCount);
    const parts = [getListTabMarkup("all", getListTabCount("all"), activeTab === "all")];

    lists.forEach((name) => {
      parts.push(`<span class="list-tabs__divider" aria-hidden="true"></span>`);
      parts.push(getListTabMarkup(name, getListTabCount(name), activeTab === name));
    });

    if (isCreatingList) {
      parts.push(`<span class="list-tabs__divider" aria-hidden="true"></span>`);
      parts.push(getCreateListTabMarkup());
    } else {
      parts.push(`
        <div class="list-tabs__end">
          <button class="ui-control list-tabs__add" type="button" data-list-tab-add data-tooltip="Create new list" aria-label="Create new list">
            <span class="list-tabs__add-icon" aria-hidden="true"></span>
          </button>
        </div>
      `);
    }

    leadListTabs.innerHTML = parts.join("");
    syncListTabsOverlap();

    if (isCreatingList) {
      const input = document.getElementById("leadListTabCreateInput");
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  function syncListTabsOverlap() {
    if (!leadListTabs) return;
    if (!leadListTabs.querySelector(".list-tabs__end")) {
      leadListTabs.classList.remove("is-add-overlap");
      return;
    }

    const hasOverflow = leadListTabs.scrollWidth - leadListTabs.clientWidth > 1;
    const hasRightOverlap = leadListTabs.scrollLeft + leadListTabs.clientWidth < leadListTabs.scrollWidth - 1;
    leadListTabs.classList.toggle("is-add-overlap", hasOverflow && hasRightOverlap);
  }

  function applyListTab(listName) {
    if (listName === "all") {
      selectedLists = [];
      excludedLists = [];
    } else {
      selectedLists = [listName];
      excludedLists = [];
    }
    isCreatingList = false;
    createListDraft = "";
    renderTable();
  }

  function startCreateList() {
    isCreatingList = true;
    createListDraft = "";
    renderListTabs();
  }

  function cancelCreateList() {
    if (!isCreatingList) return;
    isCreatingList = false;
    createListDraft = "";
    renderListTabs();
  }

  function commitCreateList() {
    const name = String(createListDraft || "").trim();
    if (!name) {
      cancelCreateList();
      return;
    }

    rememberList(name);
    applyListTab(name);
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
      if (key === "location") return selectedLocations.length > 0 || excludedLocations.length > 0;
      if (key === "category") return selectedCategories.length > 0 || excludedCategories.length > 0;
      if (key === "franchise") return selectedFranchises.length > 0 || excludedFranchises.length > 0;
      if (key === "company") return selectedCompanies.length > 0 || excludedCompanies.length > 0;
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
    selectedLocations = filterCombobox?.getIncludedValues?.(locationFilterSelect) || [];
    excludedLocations = filterCombobox?.getExcludedValues?.(locationFilterSelect) || [];
    selectedCategories = filterCombobox?.getIncludedValues?.(categoryFilterSelect) || [];
    excludedCategories = filterCombobox?.getExcludedValues?.(categoryFilterSelect) || [];
    selectedFranchises = filterCombobox?.getIncludedValues?.(franchiseFilterSelect) || [];
    excludedFranchises = filterCombobox?.getExcludedValues?.(franchiseFilterSelect) || [];
    selectedCompanies = filterCombobox?.getIncludedValues?.(companyFilterSelect) || [];
    excludedCompanies = filterCombobox?.getExcludedValues?.(companyFilterSelect) || [];
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

  function pruneSelectedValues(values, validValues) {
    return values.filter((value) => validValues.has(value));
  }

  function pruneCompanySelections() {
    const validCompanies = new Set(getCompanyOptions());
    selectedCompanies = pruneSelectedValues(selectedCompanies, validCompanies);
    excludedCompanies = pruneSelectedValues(excludedCompanies, validCompanies);
  }

  function pruneLocationSelections() {
    const validLocations = new Set(getLocationOptions());
    selectedLocations = pruneSelectedValues(selectedLocations, validLocations);
    excludedLocations = pruneSelectedValues(excludedLocations, validLocations);
  }

  function pruneCategorySelections() {
    const validCategories = new Set(getCategoryFilterOptions().map((option) => option.value));
    selectedCategories = pruneSelectedValues(selectedCategories, validCategories);
    excludedCategories = pruneSelectedValues(excludedCategories, validCategories);
  }

  function pruneFranchiseSelections() {
    const validFranchises = new Set(getFranchiseOptions());
    selectedFranchises = pruneSelectedValues(selectedFranchises, validFranchises);
    excludedFranchises = pruneSelectedValues(excludedFranchises, validFranchises);
  }

  function syncSelectFilterOptions(select, options, included, excluded, placeholder) {
    if (!select || !filterCombobox) return;

    filterCombobox.setOptions(select, options, { placeholder });
    filterCombobox.setIncludedExcludedValues(select, included, excluded);
    filterCombobox.getCombobox(select)?.sync();
  }

  function syncCompanyFilterOptions() {
    syncSelectFilterOptions(
      companyFilterSelect,
      toSelectOptions(getCompanyOptions()),
      selectedCompanies,
      excludedCompanies,
      "Select company"
    );
  }

  function syncLocationFilterOptions() {
    syncSelectFilterOptions(
      locationFilterSelect,
      toSelectOptions(getLocationOptions()),
      selectedLocations,
      excludedLocations,
      "Select location"
    );
  }

  function syncCategoryFilterOptions() {
    syncSelectFilterOptions(
      categoryFilterSelect,
      getCategoryFilterOptions(),
      selectedCategories,
      excludedCategories,
      "Select category"
    );
  }

  function syncFranchiseFilterOptions() {
    syncSelectFilterOptions(
      franchiseFilterSelect,
      toSelectOptions(getFranchiseOptions()),
      selectedFranchises,
      excludedFranchises,
      "Select franchise"
    );
  }

  function clearCombobox(select) {
    filterCombobox?.setValues?.(select, []);
    filterCombobox?.getCombobox?.(select)?.sync();
  }

  function renderFilters() {
    renderCheckGroup(stageFilterGroup, LEAD_STAGES, selectedStages);
    syncLocationFilterOptions();
    syncCategoryFilterOptions();
    syncFranchiseFilterOptions();
    syncCompanyFilterOptions();
    writeDateFilters();
  }

  function enhanceSelectFilter(select, options, placeholder) {
    if (!select || !filterCombobox) return;

    filterCombobox.setOptions(select, options, { placeholder });
    filterCombobox.enhance(select, { allowExclude: true });
    select.addEventListener("change", () => {
      readComboboxFilters();
      renderTable();
    });
  }

  function initFilterComboboxes() {
    enhanceSelectFilter(locationFilterSelect, toSelectOptions(getLocationOptions()), "Select location");
    enhanceSelectFilter(categoryFilterSelect, getCategoryFilterOptions(), "Select category");
    enhanceSelectFilter(franchiseFilterSelect, toSelectOptions(getFranchiseOptions()), "Select franchise");
    enhanceSelectFilter(companyFilterSelect, toSelectOptions(getCompanyOptions()), "Select company");
  }

  function renderTable() {
    const allLeads = getAllLeads();
    const visibleLeads = getVisibleLeads();

    renderTableHeaders();
    if (tableBody) {
      tableBody.innerHTML = `${visibleLeads.map(getLeadRowMarkup).join("")}${getAddLeadRowMarkup()}`;
    }

    pruneSelectedLeadIds();
    syncSortHeaders();
    syncSelectAllHeader(visibleLeads);
    syncEmptyState(visibleLeads.length);
    syncSummaries(visibleLeads.length, allLeads.length);
    syncSelectionToolbar();
    if (!isCreatingList) renderListTabs();
    window.WefranchLeadModals?.syncLeadDetail?.();
  }

  function refresh({ persistFilters = true } = {}) {
    if (persistFilters) syncFilterInputsFromState();
    pruneLocationSelections();
    pruneCategorySelections();
    pruneFranchiseSelections();
    pruneCompanySelections();
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
      sortDirection = key === "addedAt" ? "descending" : "ascending";
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

    if (changes?.list) rememberList(changes.list);
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

  function pruneSelectedLeadIds() {
    const validIds = new Set(getAllLeads().map((lead) => lead.id));
    [...selectedLeadIds].forEach((id) => {
      if (!validIds.has(id)) selectedLeadIds.delete(id);
    });
  }

  function getSelectedLeads() {
    const selected = new Set(selectedLeadIds);
    return getAllLeads().filter((lead) => selected.has(lead.id));
  }

  function getSelectedAssignedLists() {
    const catalog = new Set(getCatalogLists());
    const lists = [];
    const seen = new Set();

    getSelectedLeads().forEach((lead) => {
      const name = normalizeListName(lead.list);
      if (!name || !catalog.has(name) || seen.has(name)) return;
      seen.add(name);
      lists.push(name);
    });

    return lists;
  }

  function getListContactCount(listName) {
    return getAllLeads().reduce((count, lead) => (
      lead.list === listName ? count + 1 : count
    ), 0);
  }

  function syncSelectionToolbar() {
    const hasSelection = selectedLeadIds.size > 0;
    if (leadSelectionActions) leadSelectionActions.hidden = !hasSelection;
    if (!hasSelection) moveSelectedLeadsDropdown?.removeAttribute("open");
    if (hasSelection && moveSelectedLeadsDropdown?.open) renderMoveToMenu();
  }

  function getMoveToMenuMarkup() {
    const selected = getSelectedLeads();
    const assignedLists = getSelectedAssignedLists();
    const destinations = getCatalogLists().filter((name) => (
      selected.some((lead) => lead.list !== name)
    ));

    const destinationMarkup = destinations.map((name) => `
      <button
        class="ui-menu-item toolbar-dropdown-option toolbar-dropdown-action"
        type="button"
        role="menuitem"
        data-move-to-list="${escapeHtml(name)}"
      >
        <span class="toolbar-dropdown-label">${escapeHtml(name)} (${getListContactCount(name)})</span>
      </button>
    `).join("");

    let removeMarkup = "";
    if (assignedLists.length === 1) {
      const name = assignedLists[0];
      removeMarkup = `
        <button
          class="ui-menu-item toolbar-dropdown-option toolbar-dropdown-action"
          type="button"
          role="menuitem"
          data-remove-from-list="${escapeHtml(name)}"
        >
          <span class="toolbar-dropdown-label">Remove from “<span class="toolbar-dropdown-list-name">${escapeHtml(name)}</span>”</span>
        </button>
      `;
    } else if (assignedLists.length > 1) {
      removeMarkup = `
        <button
          class="ui-menu-item toolbar-dropdown-option toolbar-dropdown-action"
          type="button"
          role="menuitem"
          data-remove-from-lists
        >
          <span class="toolbar-dropdown-label">Remove from ${assignedLists.length} lists</span>
        </button>
      `;
    }

    const dividerMarkup = destinationMarkup && removeMarkup
      ? `<div class="toolbar-dropdown-divider" role="separator" aria-hidden="true"></div>`
      : "";

    return `${destinationMarkup}${dividerMarkup}${removeMarkup}`;
  }

  function renderMoveToMenu() {
    if (!moveSelectedLeadsMenu) return;
    moveSelectedLeadsMenu.innerHTML = getMoveToMenuMarkup();
  }

  function removeSelectedLeads() {
    const ids = [...selectedLeadIds];
    if (!ids.length) return 0;

    ids.forEach((id) => {
      store.remove(id);
      selectedLeadIds.delete(id);
      if (selectedLeadId === id) selectedLeadId = null;
    });
    refresh();
    return ids.length;
  }

  function moveSelectedLeadsToList(listName) {
    const name = normalizeListName(listName);
    if (!name) return 0;

    rememberList(name);
    let changed = 0;
    getSelectedLeads().forEach((lead) => {
      if (lead.list === name) return;
      store.upsert({ ...lead, list: name });
      changed += 1;
    });
    if (changed) refresh();
    return changed;
  }

  function removeSelectedLeadsFromList(listName) {
    const name = normalizeListName(listName);
    if (!name) return 0;
    return removeSelectedLeadsFromLists([name]);
  }

  function removeSelectedLeadsFromAssignedLists() {
    return removeSelectedLeadsFromLists(getSelectedAssignedLists());
  }

  function removeSelectedLeadsFromLists(listNames) {
    const names = new Set((Array.isArray(listNames) ? listNames : [listNames])
      .map(normalizeListName)
      .filter(Boolean));
    if (!names.size) return 0;

    let changed = 0;
    getSelectedLeads().forEach((lead) => {
      if (!names.has(lead.list)) return;
      store.upsert({ ...lead, list: "" });
      changed += 1;
    });
    if (changed) refresh();
    return changed;
  }

  function addLead(record) {
    if (record?.list) rememberList(record.list);
    const next = store.upsert(record);
    refresh();
    return next;
  }

  function normalizeCsvHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && inQuotes && next === '"') {
        field += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
        continue;
      }
      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
      }
      field += char;
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => String(cell).trim()));
  }

  function recordFromCsvRow(headers, cells) {
    const values = {};
    headers.forEach((header, index) => {
      const value = String(cells[index] || "").trim();
      if (!value) return;
      if (["name", "full name", "lead name"].includes(header)) values.name = value;
      else if (["first name", "firstname", "first"].includes(header)) values.firstName = value;
      else if (["last name", "lastname", "surname", "last"].includes(header)) values.surname = value;
      else if (["email", "e mail", "e-mail"].includes(header)) values.email = value;
      else if (["phone", "telephone", "mobile"].includes(header)) values.phone = value;
      else if (["company", "organization", "owner", "owner name", "franchisee"].includes(header)) values.company = value;
      else if (["franchise", "franchises", "brand"].includes(header)) values.franchise = value;
      else if (header === "list") values.list = value;
      else if (["stage", "status"].includes(header)) values.stage = value;
      else if (["location", "city"].includes(header)) values.location = value;
      else if (["note", "notes"].includes(header)) values.note = value;
    });

    if (!values.name && (values.firstName || values.surname)) {
      values.name = [values.firstName, values.surname].filter(Boolean).join(" ");
    }

    if (!values.name && !values.email) return null;
    return { ...values, source: "manual" };
  }

  function importCsv(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) return 0;

    const headers = rows[0].map(normalizeCsvHeader);
    const records = rows.slice(1).map((cells) => recordFromCsvRow(headers, cells)).filter(Boolean);
    records.forEach((record) => store.upsert(record));
    if (records.length) refresh();
    return records.length;
  }

  function clearFilters() {
    selectedStages = [];
    selectedLocations = [];
    excludedLocations = [];
    selectedCategories = [];
    excludedCategories = [];
    selectedFranchises = [];
    excludedFranchises = [];
    selectedCompanies = [];
    excludedCompanies = [];
    clearCombobox(locationFilterSelect);
    clearCombobox(categoryFilterSelect);
    clearCombobox(franchiseFilterSelect);
    clearCombobox(companyFilterSelect);
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
    if (key === "location") {
      selectedLocations = [];
      excludedLocations = [];
      clearCombobox(locationFilterSelect);
    }
    if (key === "category") {
      selectedCategories = [];
      excludedCategories = [];
      clearCombobox(categoryFilterSelect);
    }
    if (key === "franchise") {
      selectedFranchises = [];
      excludedFranchises = [];
      clearCombobox(franchiseFilterSelect);
    }
    if (key === "company") {
      selectedCompanies = [];
      excludedCompanies = [];
      clearCombobox(companyFilterSelect);
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

  const editListModal = document.getElementById("editListModal");
  const editListModalForm = document.getElementById("editListModalForm");
  const editListNameInput = document.getElementById("editListName");
  const deleteLeadListBtn = document.getElementById("deleteLeadList");
  let editingListName = "";

  function resetEditListModalForm() {
    editListModalForm?.reset();
    window.WefranchFieldErrors?.clearAll(editListModalForm, { silent: true });
  }

  const editListModalApi = window.createProtoModal?.({
    overlay: editListModal,
    onClose() {
      resetEditListModalForm();
      editingListName = "";
    },
    onOpened() {
      editListNameInput?.select?.();
    }
  });

  function closeEditListModal() {
    editListModalApi?.close();
  }

  function openEditListModal(listName, trigger = null) {
    const name = normalizeListName(listName);
    if (!name || isReservedListName(name) || !editListModal) return;

    editingListName = name;
    resetEditListModalForm();
    if (editListNameInput) editListNameInput.value = name;
    editListModalApi?.open(trigger, { focus: editListNameInput });
  }

  editListModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const nextName = normalizeListName(editListNameInput?.value);
    window.WefranchFieldErrors?.clearAll(editListModalForm, { silent: true });

    if (!nextName) {
      window.WefranchFieldErrors?.set(editListNameInput, "Enter a name.");
      editListNameInput?.focus({ preventScroll: true });
      return;
    }

    if (isReservedListName(nextName)) {
      window.WefranchFieldErrors?.set(editListNameInput, "Choose a different name.");
      editListNameInput?.focus({ preventScroll: true });
      return;
    }

    if (listNameExists(nextName, editingListName)) {
      window.WefranchFieldErrors?.set(editListNameInput, "A list with this name already exists.");
      editListNameInput?.focus({ preventScroll: true });
      return;
    }

    const savedName = renameList(editingListName, nextName);
    if (!savedName) {
      window.WefranchFieldErrors?.set(editListNameInput, "This list could not be updated. Please try again.");
      editListNameInput?.focus({ preventScroll: true });
      return;
    }

    closeEditListModal();
  });

  deleteLeadListBtn?.addEventListener("click", () => {
    if (!editingListName) return;

    const deleted = removeList(editingListName);
    if (!deleted) {
      window.WefranchFieldErrors?.set(editListNameInput, "This list could not be deleted. Please try again.");
      editListNameInput?.focus({ preventScroll: true });
      return;
    }

    closeEditListModal();
  });

  const manageColumnsModal = document.getElementById("manageColumnsModal");
  const manageColumnsModalForm = document.getElementById("manageColumnsModalForm");
  const resetDefaultColumnsBtn = document.getElementById("resetDefaultColumns");

  function getManageColumnInputs() {
    return Array.from(manageColumnsModalForm?.querySelectorAll('input[name="columns"]') || []);
  }

  function getDraftColumnKeys() {
    return getManageColumnInputs()
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function syncManageColumnsLimit() {
    const atLimit = getDraftColumnKeys().length >= MAX_VISIBLE_COLUMNS;

    getManageColumnInputs().forEach((input) => {
      const locked = LOCKED_COLUMN_KEYS.includes(input.value);
      const label = input.closest(".proto-modal-check");
      input.disabled = locked || (atLimit && !input.checked);
      label?.classList.toggle("is-checked", input.checked);
      label?.classList.toggle("is-locked", locked);
    });
  }

  function applyColumnDraft(keys) {
    const selected = new Set(normalizeColumnKeys(keys));
    getManageColumnInputs().forEach((input) => {
      input.checked = selected.has(input.value);
    });
    syncManageColumnsLimit();
  }

  function hideManageColumnTooltips() {
    document.querySelectorAll(".filter-combobox-floating-tooltip.is-action-tooltip").forEach((tooltip) => {
      tooltip.classList.remove("is-visible");
    });
  }

  getManageColumnInputs().forEach((input) => {
    if (!LOCKED_COLUMN_KEYS.includes(input.value)) return;
    window.bindActionTooltip?.(input.closest(".proto-modal-check"), {
      tooltipClass: "is-over-modal",
      hideDelayMs: 0
    });
  });

  const manageColumnsModalApi = window.createProtoModal?.({
    overlay: manageColumnsModal,
    onOpen() {
      applyColumnDraft(visibleColumnKeys);
    },
    onClose() {
      hideManageColumnTooltips();
    }
  });

  function openManageColumns(trigger = null) {
    applyColumnDraft(visibleColumnKeys);
    const focus = manageColumnsModalForm?.querySelector('input[name="columns"]:not(:disabled)');
    manageColumnsModalApi?.open(trigger, { focus });
  }

  function closeManageColumns() {
    manageColumnsModalApi?.close();
  }

  manageColumnsModalForm?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== "columns") return;

    if (input.checked && getDraftColumnKeys().length > MAX_VISIBLE_COLUMNS) {
      input.checked = false;
    }

    syncManageColumnsLimit();
  });

  resetDefaultColumnsBtn?.addEventListener("click", () => {
    applyColumnDraft(DEFAULT_VISIBLE_COLUMNS);
  });

  manageColumnsModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setVisibleColumns(getDraftColumnKeys());
    closeManageColumns();
  });

  window.WefranchLeadsPage = {
    get LEAD_LISTS() {
      return getCatalogLists();
    },
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
    getSelectedLeads,
    renderMoveToMenu,
    moveSelectedLeadsToList,
    removeSelectedLeadsFromList,
    removeSelectedLeadsFromAssignedLists,
    removeSelectedLeads,
    updateLead,
    removeLead,
    addLead,
    importCsv,
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
    getFranchiseOptions,
    getCompanyName,
    getCompanyOptions,
    renameList,
    removeList,
    listNameExists,
    isReservedListName,
    openManageColumns,
    getVisibleColumns: () => [...visibleColumnKeys],
    setVisibleColumns
  };

  leadListTabs?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target.closest("[data-list-tab-add]")) {
      startCreateList();
      return;
    }

    if (event.target.closest("[data-list-tab-create-action]")) {
      event.stopPropagation();
      commitCreateList();
      return;
    }

    const settingsButton = event.target.closest("[data-list-tab-settings]");
    if (settingsButton) {
      event.stopPropagation();
      openEditListModal(settingsButton.dataset.listTabSettings, settingsButton);
      return;
    }

    const tab = event.target.closest("[data-list-tab]");
    if (!tab) return;
    applyListTab(tab.dataset.listTab);
  });

  leadListTabs?.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-list-tab-settings]")) return;

    const tab = event.target.closest("[data-list-tab]");
    if (!tab || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    applyListTab(tab.dataset.listTab);
  });

  leadListTabs?.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "leadListTabCreateInput") return;
    createListDraft = event.target.value;
    syncCreateListAction();
  });

  leadListTabs?.addEventListener("keydown", (event) => {
    if (!isCreatingList) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancelCreateList();
      return;
    }
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "leadListTabCreateInput") return;
    if (event.key === "Enter") {
      event.preventDefault();
      commitCreateList();
    }
  });

  leadListTabs?.addEventListener("focusout", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "leadListTabCreateInput") return;
    const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (leadListTabs.contains(nextTarget)) return;
    window.requestAnimationFrame(() => {
      if (!isCreatingList) return;
      if (String(createListDraft || "").trim()) commitCreateList();
      else cancelCreateList();
    });
  });

  leadListTabs?.addEventListener("mouseover", (event) => {
    const button = getCreateListAddButton(event.target);
    if (!button || button === createListTooltipTarget) return;
    showCreateListTooltip(button);
  });

  leadListTabs?.addEventListener("mouseout", (event) => {
    const button = getCreateListAddButton(event.target);
    if (!button || button !== createListTooltipTarget) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;
    hideCreateListTooltip();
  });

  leadListTabs?.addEventListener("focusin", (event) => {
    const button = getCreateListAddButton(event.target);
    if (!button) return;
    showCreateListTooltip(button);
  });

  leadListTabs?.addEventListener("focusout", (event) => {
    const button = getCreateListAddButton(event.target);
    if (!button || button !== createListTooltipTarget) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && button.contains(relatedTarget)) return;
    hideCreateListTooltip();
  });

  leadListTabs?.addEventListener("scroll", syncListTabsOverlap, { passive: true });
  leadListTabs?.addEventListener("scroll", hideCreateListTooltip, { passive: true });
  if (leadListTabs && typeof ResizeObserver === "function") {
    new ResizeObserver(syncListTabsOverlap).observe(leadListTabs);
  }
  window.addEventListener("resize", () => {
    hideCreateListTooltip();
    syncListTabsOverlap();
  });

  initFilterComboboxes();
  initDateFilters();
  renderFilters();
  renderTable();
})();
