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
  const tableEmptyStateClear = document.getElementById("tableEmptyStateClear");
  const toolbarSearchInput = document.getElementById("toolbarSearchInput");
  const toolbarSearchClear = document.getElementById("toolbarSearchClear");
  const addLeadBtn = document.getElementById("addLeadBtn");
  const leadDetailPanel = document.getElementById("leadDetailPanel");

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

  if (toolbarSearchInput) {
    toolbarSearchInput.addEventListener("input", () => {
      page.setSearchQuery(toolbarSearchInput.value);
    });
  }

  toolbarSearchClear?.addEventListener("click", () => {
    if (!toolbarSearchInput) return;
    toolbarSearchInput.value = "";
    toolbarSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    toolbarSearchInput.focus();
  });

  addLeadBtn?.addEventListener("click", () => {
    modals?.openAddLead(addLeadBtn);
  });

  document.querySelectorAll(".sortable-header").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sortKey;
      if (key) page.setSort(key);
    });
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

  tableBody?.addEventListener("click", (event) => {
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

    if (event.target.closest("select, .filter-select-field")) return;

    const profileAction = event.target.closest(".contact-profile-action");
    const row = event.target.closest("tr[data-lead-id]");
    const leadId = profileAction?.dataset.leadId || row?.dataset.leadId;
    if (!leadId) return;

    modals?.openLeadDetail(leadId, profileAction || row);
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

  document.querySelector("#leadSelectColumnHeader .location-select-all-checkbox")?.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
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
})();
