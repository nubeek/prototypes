(function () {
  const TABS = ["overview", "templates", "settings"];
  const SORT_KEYS = new Set(["name", "type", "recipients", "startAt", "endAt", "openRate", "replyRate", "status"]);
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const scheduleFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const tabButtons = Array.from(document.querySelectorAll("[data-campaign-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-campaign-panel]"));
  const searchForm = document.getElementById("campaignSearch");
  const searchInput = document.getElementById("campaignSearchInput");
  const searchClear = document.getElementById("campaignSearchClear");
  const newCampaignBtn = document.getElementById("newCampaignBtn");
  const emptyCreateBtn = document.getElementById("campaignEmptyCreate");
  const metricsOpens = document.getElementById("campaignMetricOpens");
  const metricsConverts = document.getElementById("campaignMetricConverts");
  const metricsOpensTrend = document.getElementById("campaignMetricOpensTrend");
  const metricsConvertsTrend = document.getElementById("campaignMetricConvertsTrend");
  const table = document.getElementById("campaignsTable");
  const tableBody = document.getElementById("campaignsTableBody");
  const tableWrap = document.getElementById("campaignsTableWrap");
  const emptyAll = document.getElementById("campaignsEmptyAll");
  const emptySearch = document.getElementById("campaignsEmptySearch");
  const overviewPanel = document.querySelector('[data-campaign-panel="overview"]');
  const renameForm = document.getElementById("renameCampaignForm");
  const renameInput = document.getElementById("renameCampaignName");
  const renameModal = document.getElementById("renameCampaignModal");

  let sortKey = "startAt";
  let sortDirection = "descending";
  let pinnedId = null;
  let renameId = null;
  const selectedIds = new Set();

  const renameModalApi = window.createProtoModal?.({
    overlay: renameModal,
    getFocusElement() {
      return renameInput;
    }
  });

  const deleteConfirm = window.createProtoConfirmModal?.();

  function store() {
    return window.WefranchCampaignsStore;
  }

  function activeTab() {
    const hash = window.location.hash.replace("#", "");
    return TABS.includes(hash) ? hash : "overview";
  }

  function syncTabs() {
    const tab = activeTab();
    tabButtons.forEach((button) => {
      const selected = button.dataset.campaignTab === tab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.campaignPanel !== tab;
    });
    if (tab === "overview") renderOverview();
  }

  function queryText() {
    return String(searchInput?.value || "").trim().toLowerCase();
  }

  function syncSearchChrome() {
    const hasQuery = Boolean(queryText());
    searchForm?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  }

  function rate(part, whole) {
    const sent = Number(whole) || 0;
    if (sent <= 0) return null;
    return (Number(part) || 0) / sent;
  }

  function sortValue(campaign, key) {
    if (key === "name") return campaign.name.toLowerCase();
    if (key === "type") return campaign.type === "sequence" ? campaign.emailCount : 0;
    if (key === "recipients") return campaign.recipientCount;
    if (key === "startAt") return campaign.startAt ? Date.parse(campaign.startAt) : null;
    if (key === "endAt") return campaign.endAt ? Date.parse(campaign.endAt) : null;
    if (key === "openRate") return rate(campaign.opens, campaign.sentCount);
    if (key === "replyRate") return rate(campaign.replies, campaign.sentCount);
    if (key === "status") return campaign.status;
    return "";
  }

  function compareCampaigns(left, right) {
    const leftValue = sortValue(left, sortKey);
    const rightValue = sortValue(right, sortKey);
    const direction = sortDirection === "ascending" ? 1 : -1;
    const leftMissing = leftValue == null || leftValue === "";
    const rightMissing = rightValue == null || rightValue === "";
    if (leftMissing && rightMissing) return left.name.localeCompare(right.name);
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (leftValue === rightValue) return left.name.localeCompare(right.name);
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  }

  function visibleCampaigns(campaigns) {
    const query = queryText();
    const filtered = query
      ? campaigns.filter((campaign) => campaign.name.toLowerCase().includes(query))
      : campaigns.slice();
    const sorted = filtered.sort(compareCampaigns);
    if (!pinnedId) return sorted;
    const pinned = sorted.find((campaign) => campaign.id === pinnedId);
    if (!pinned) return sorted;
    return [pinned, ...sorted.filter((campaign) => campaign.id !== pinnedId)];
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  function activityDate(campaign) {
    const value = campaign.endAt || campaign.startAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function sumInMonth(campaigns, field, key) {
    return campaigns.reduce((total, campaign) => {
      const date = activityDate(campaign);
      if (!date || monthKey(date) !== key) return total;
      return total + (Number(campaign[field]) || 0);
    }, 0);
  }

  function trendRatio(current, previous) {
    if (!previous) return current ? 1 : 0;
    return (current - previous) / previous;
  }

  function renderTrend(element, ratio) {
    if (!element) return;
    const percent = Math.round(ratio * 100);
    const up = percent >= 0;
    element.classList.toggle("is-down", !up);
    element.replaceChildren();

    const arrow = document.createElement("img");
    arrow.src = "../../assets/icons/chevron.svg";
    arrow.alt = "";
    arrow.className = up ? "campaigns-trend__arrow is-up" : "campaigns-trend__arrow";
    element.append(arrow);

    const label = document.createElement("span");
    label.textContent = `${up ? "+" : ""}${percent}% vs last month`;
    element.append(label);
  }

  function renderMetrics(campaigns) {
    const now = new Date();
    const thisKey = monthKey(now);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = monthKey(lastMonth);
    const opens = campaigns.reduce((total, campaign) => total + campaign.opens, 0);
    const converts = campaigns.reduce((total, campaign) => total + campaign.converts, 0);
    if (metricsOpens) metricsOpens.textContent = opens.toLocaleString("en-US");
    if (metricsConverts) metricsConverts.textContent = converts.toLocaleString("en-US");
    renderTrend(metricsOpensTrend, trendRatio(
      sumInMonth(campaigns, "opens", thisKey),
      sumInMonth(campaigns, "opens", lastKey)
    ));
    renderTrend(metricsConvertsTrend, trendRatio(
      sumInMonth(campaigns, "converts", thisKey),
      sumInMonth(campaigns, "converts", lastKey)
    ));
  }

  function dash() {
    const span = document.createElement("span");
    span.className = "dataset-empty-value";
    span.textContent = "–";
    return span;
  }

  function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return dateFormat.format(date);
  }

  function formatSchedule(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return scheduleFormat.format(date);
  }

  function remainingMs(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    return time - Date.now();
  }

  function formatRelative(value) {
    const remaining = remainingMs(value);
    const minutes = remaining == null ? 0 : Math.round(remaining / 60000);
    if (minutes < 1) return "in under 1 minute";
    if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? "" : "s"}`;
  }

  function formatImminent(remaining) {
    if (remaining < 60 * 1000) return "Starting in under 1 minute";
    const minutes = Math.floor(remaining / 60000);
    return `Starting in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  function formatRate(value) {
    if (value == null) return null;
    return `${Math.round(value * 100)}%`;
  }

  function typeLabel(campaign) {
    if (campaign.type === "sequence") return "Sequence";
    return "Single email";
  }

  function menuItem(action, label) {
    const button = document.createElement("button");
    button.className = "ui-menu-item";
    button.type = "button";
    button.role = "menuitem";
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function bindTooltip(trigger) {
    window.bindActionTooltip?.(trigger, {
      tooltipClass: "campaigns-tooltip"
    });
  }

  function sendingDots() {
    const dots = document.createElement("span");
    dots.className = "campaign-status__dots";
    dots.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement("span");
      dot.textContent = ".";
      dots.append(dot);
    }
    return dots;
  }

  function renderStatus(campaign) {
    const cell = document.createElement("div");
    cell.className = `campaign-status campaign-status--${campaign.status}`;

    if (campaign.status === "sending") {
      const sent = campaign.sentCount;
      const total = Math.max(campaign.recipientCount, 0);
      const ratio = total > 0 ? Math.max(0, Math.min(sent / total, 1)) : 0;
      const exact = `${sent.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`;
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.append("Sending", sendingDots());
      const line = document.createElement("span");
      line.className = "campaign-status__line";
      const track = document.createElement("span");
      track.className = "campaign-status__track";
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(sent));
      track.setAttribute("aria-label", exact);
      const fill = document.createElement("span");
      fill.className = "campaign-status__fill";
      fill.style.width = `${ratio * 100}%`;
      track.append(fill);
      const count = document.createElement("span");
      count.className = "campaign-status__count";
      const percent = document.createElement("span");
      percent.className = "campaign-status__percent";
      percent.textContent = `${Math.round(ratio * 100)}%`;
      const detail = document.createElement("span");
      detail.className = "campaign-status__exact";
      detail.textContent = exact;
      count.append(percent, detail);
      line.append(track, count);
      cell.append(label, line);
      return cell;
    }

    if (campaign.status === "scheduled") {
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Scheduled";
      const line = document.createElement("span");
      line.className = "campaign-status__line";
      const date = document.createElement("span");
      date.className = "campaign-status__meta";
      const remaining = remainingMs(campaign.startAt);
      if (remaining != null && remaining < 60 * 60 * 1000) {
        date.textContent = formatImminent(remaining);
        line.append(date);
      } else {
        date.textContent = formatSchedule(campaign.startAt);
        const relative = formatRelative(campaign.startAt);
        const when = document.createElement("button");
        when.className = "campaign-status__info";
        when.type = "button";
        when.dataset.tooltip = relative;
        when.setAttribute("aria-label", `Starts ${relative}`);
        const icon = document.createElement("img");
        icon.src = "../../assets/icons/info.svg";
        icon.alt = "";
        when.append(icon);
        line.append(date, when);
        bindTooltip(when);
      }
      cell.append(label, line);
      return cell;
    }

    if (campaign.status === "completed") {
      const icon = document.createElement("img");
      icon.className = "campaign-status__check";
      icon.src = "../../assets/icons/check.svg";
      icon.alt = "";
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Completed";
      cell.append(icon, label);
      return cell;
    }

    const label = document.createElement("span");
    label.className = "campaign-status__label";
    if (campaign.status === "paused") label.textContent = "Paused";
    else label.textContent = "Draft";
    cell.append(label);
    return cell;
  }

  function renderSelectCell(campaign, rowNumber) {
    const cell = document.createElement("td");
    cell.className = "location-number-cell";
    const label = document.createElement("label");
    label.className = "location-row-select";
    label.setAttribute("aria-label", `Select ${campaign.name}`);
    const input = document.createElement("input");
    input.className = "location-row-checkbox";
    input.type = "checkbox";
    input.checked = selectedIds.has(campaign.id);
    const number = document.createElement("span");
    number.className = "location-row-number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(rowNumber);
    const visual = document.createElement("span");
    visual.className = "location-row-checkbox-visual";
    visual.setAttribute("aria-hidden", "true");
    label.append(input, number, visual);
    cell.append(label);
    return cell;
  }

  function renderRow(campaign, rowNumber) {
    const row = document.createElement("tr");
    row.className = [
      campaign.id === pinnedId ? "is-new" : "",
      selectedIds.has(campaign.id) ? "is-checked" : ""
    ].filter(Boolean).join(" ");
    row.dataset.campaignId = campaign.id;

    const selectCell = renderSelectCell(campaign, rowNumber);
    const nameCell = document.createElement("td");
    const name = document.createElement("div");
    name.className = "campaign-name";
    const title = document.createElement("span");
    title.className = "campaign-name__title";
    title.textContent = campaign.name;
    const senderLine = document.createElement("span");
    senderLine.className = "campaign-name__sender";
    const senderText = campaign.sender?.name || campaign.sender?.email || "";
    if (senderText) senderLine.textContent = senderText;
    else senderLine.append(dash());
    name.append(title, senderLine);
    nameCell.append(name);

    const typeCell = document.createElement("td");
    typeCell.textContent = typeLabel(campaign);

    const recipientsCell = document.createElement("td");
    recipientsCell.textContent = campaign.recipientCount.toLocaleString("en-US");

    const startCell = document.createElement("td");
    const startLabel = formatDate(campaign.startAt);
    if (startLabel) startCell.textContent = startLabel;
    else startCell.append(dash());

    const endCell = document.createElement("td");
    const endLabel = formatDate(campaign.endAt);
    if (endLabel) endCell.textContent = endLabel;
    else endCell.append(dash());

    const openCell = document.createElement("td");
    const openLabel = formatRate(rate(campaign.opens, campaign.sentCount));
    if (openLabel) openCell.textContent = openLabel;
    else openCell.append(dash());

    const replyCell = document.createElement("td");
    const replyLabel = formatRate(rate(campaign.replies, campaign.sentCount));
    if (replyLabel) replyCell.textContent = replyLabel;
    else replyCell.append(dash());

    const statusCell = document.createElement("td");
    statusCell.append(renderStatus(campaign));

    const menuCell = document.createElement("td");
    menuCell.className = "campaigns-menu-cell";
    const details = document.createElement("details");
    details.className = "toolbar-dropdown campaigns-row-menu";
    const summary = document.createElement("summary");
    summary.className = "ui-control ui-button ui-button-ghost ui-icon-button";
    summary.setAttribute("aria-label", `Actions for ${campaign.name}`);
    const more = document.createElement("img");
    more.src = "../../assets/icons/more.svg";
    more.alt = "";
    summary.append(more);
    const menu = document.createElement("div");
    menu.className = "ui-menu toolbar-dropdown-menu";
    menu.role = "menu";
    menu.append(
      menuItem("report", "View report"),
      menuItem("duplicate", "Duplicate"),
      ...(campaign.status === "sending" ? [menuItem("pause", "Pause")] : []),
      ...(campaign.status === "paused" ? [menuItem("resume", "Resume")] : []),
      menuItem("rename", "Rename"),
      menuItem("delete", "Delete")
    );
    details.append(summary, menu);
    menuCell.append(details);

    row.append(selectCell, nameCell, typeCell, recipientsCell, startCell, endCell, openCell, replyCell, statusCell, menuCell);
    return row;
  }

  function visibleRows() {
    return Array.from(tableBody?.querySelectorAll("tr[data-campaign-id]") || []);
  }

  function syncSelectAll() {
    const selectAll = table?.querySelector(".location-select-all");
    const checkbox = selectAll?.querySelector(".location-select-all-checkbox");
    if (!(selectAll instanceof HTMLLabelElement) || !(checkbox instanceof HTMLInputElement)) return;
    const rows = visibleRows();
    const selectedCount = rows.filter((row) => selectedIds.has(row.dataset.campaignId)).length;
    const allSelected = rows.length > 0 && selectedCount === rows.length;
    const partiallySelected = selectedCount > 0 && selectedCount < rows.length;
    checkbox.checked = allSelected;
    checkbox.indeterminate = partiallySelected;
    selectAll.classList.toggle("is-indeterminate", partiallySelected);
  }

  function setVisibleRowsChecked(checked) {
    visibleRows().forEach((row) => {
      const id = row.dataset.campaignId;
      if (!id) return;
      if (checked) selectedIds.add(id);
      else selectedIds.delete(id);
      row.classList.toggle("is-checked", checked);
      const checkbox = row.querySelector(".location-row-checkbox");
      if (checkbox instanceof HTMLInputElement) checkbox.checked = checked;
    });
    syncSelectAll();
  }

  function pruneSelection(campaigns) {
    const ids = new Set(campaigns.map((campaign) => campaign.id));
    selectedIds.forEach((id) => {
      if (!ids.has(id)) selectedIds.delete(id);
    });
  }

  function syncSortHeaders() {
    table?.querySelectorAll(".sortable-header").forEach((header) => {
      const active = header.dataset.sortKey === sortKey;
      header.setAttribute("aria-sort", active ? sortDirection : "none");
    });
  }

  function renderOverview() {
    const campaigns = store()?.list?.() || [];
    pruneSelection(campaigns);
    renderMetrics(campaigns);
    syncSearchChrome();
    const rows = visibleCampaigns(campaigns);
    const hasCampaigns = campaigns.length > 0;
    const hasRows = rows.length > 0;

    if (emptyAll) emptyAll.hidden = hasCampaigns;
    if (overviewPanel) overviewPanel.classList.toggle("is-empty", !hasCampaigns);
    if (tableWrap) tableWrap.hidden = !hasCampaigns;
    if (emptySearch) emptySearch.hidden = !hasCampaigns || hasRows;
    if (tableBody) {
      tableBody.replaceChildren();
      if (hasRows) rows.forEach((campaign, index) => tableBody.append(renderRow(campaign, index + 1)));
    }
    syncSelectAll();
    syncSortHeaders();
    syncTableScrollChrome();
  }

  function syncTableScrollChrome() {
    if (!tableWrap) return;
    const hasVerticalOverflow = tableWrap.scrollHeight > tableWrap.clientHeight + 1;
    const hasTopOverlap = tableWrap.scrollTop > 0;
    tableWrap.classList.toggle("is-header-row-overlap", hasVerticalOverflow && hasTopOverlap);
  }

  function openWizard(trigger) {
    const base = window.wefranchCampaignAudience || {};
    window.WefranchCampaignWizard?.open({
      trigger,
      getAudienceOptions: () => base.getAudienceOptions?.() || [],
      getAudiencePreview: (values) => base.getAudiencePreview?.(values) || null,
      getDefaultAudienceValues: () => base.getDefaultAudienceValues?.() ?? "",
      onAudienceChange: base.onAudienceChange,
      onComplete(draft) {
        const record = store()?.create?.(draft);
        pinnedId = record?.id || null;
        if (searchInput) searchInput.value = "";
        const scheduled = (record?.status || draft?.status) === "scheduled";
        const name = record?.name || draft?.name || "Campaign";
        window.WefranchToast?.show({
          message: scheduled ? `${name} scheduled.` : `${name} is sending.`
        });
        if (window.location.hash !== "#overview") {
          window.location.hash = "overview";
        }
        renderOverview();
      }
    });
  }

  function closeMenus(except) {
    document.querySelectorAll(".campaigns-row-menu[open]").forEach((menu) => {
      if (menu !== except) menu.open = false;
    });
  }

  function openRename(campaign, trigger) {
    renameId = campaign.id;
    if (renameInput) {
      window.WefranchFieldErrors?.clear(renameInput);
      renameInput.value = campaign.name === "Untitled campaign" ? "" : campaign.name;
    }
    renameModalApi?.open(trigger);
  }

  function toast(message) {
    window.WefranchToast?.show({ message });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.campaignTab;
      if (!TABS.includes(tab)) return;
      if (window.location.hash === `#${tab}`) syncTabs();
      else window.location.hash = tab;
    });
  });

  window.addEventListener("hashchange", syncTabs);

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  searchInput?.addEventListener("input", () => {
    pinnedId = null;
    renderOverview();
  });
  searchClear?.addEventListener("click", (event) => {
    event.preventDefault();
    if (searchInput) searchInput.value = "";
    pinnedId = null;
    searchInput?.focus();
    renderOverview();
  });

  newCampaignBtn?.addEventListener("click", () => openWizard(newCampaignBtn));
  emptyCreateBtn?.addEventListener("click", () => openWizard(emptyCreateBtn));

  table?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const header = event.target.closest(".sortable-header");
    if (!header) return;
    event.preventDefault();
    header.click();
  });

  table?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("location-row-checkbox")) return;
    if (input.classList.contains("location-select-all-checkbox")) {
      setVisibleRowsChecked(input.checked);
      return;
    }
    const row = input.closest("tr[data-campaign-id]");
    const id = row?.dataset.campaignId;
    if (!row || !id) return;
    if (input.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    row.classList.toggle("is-checked", input.checked);
    syncSelectAll();
  });

  table?.addEventListener("click", (event) => {
    if (event.target.closest(".location-row-select")) return;
    const header = event.target.closest(".sortable-header");
    if (header && SORT_KEYS.has(header.dataset.sortKey)) {
      pinnedId = null;
      const key = header.dataset.sortKey;
      if (sortKey === key) {
        sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
      } else {
        sortKey = key;
        sortDirection = key === "name" || key === "status" || key === "type" ? "ascending" : "descending";
      }
      renderOverview();
      return;
    }

    const action = event.target.closest("[data-action]");
    const row = event.target.closest("tr[data-campaign-id]");
    if (!action || !row) return;
    event.preventDefault();
    const campaign = store()?.get?.(row.dataset.campaignId);
    if (!campaign) return;
    closeMenus();

    if (action.dataset.action === "report") {
      toast("Campaign reports are coming soon.");
      return;
    }
    if (action.dataset.action === "duplicate") {
      const copy = store()?.duplicate?.(campaign.id);
      pinnedId = copy?.id || null;
      toast(`${copy?.name || "Campaign"} saved as a draft.`);
      renderOverview();
      return;
    }
    if (action.dataset.action === "pause") {
      store()?.update?.(campaign.id, { status: "paused" });
      toast(`${campaign.name} paused.`);
      return;
    }
    if (action.dataset.action === "resume") {
      store()?.update?.(campaign.id, { status: "sending" });
      toast(`${campaign.name} resumed.`);
      return;
    }
    if (action.dataset.action === "rename") {
      openRename(campaign, action);
      return;
    }
    if (action.dataset.action === "delete") {
      deleteConfirm?.open({
        title: "Delete campaign?",
        message: `Delete ${campaign.name}?\nThis can't be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        trigger: action,
        onConfirm() {
          store()?.remove?.(campaign.id);
          if (pinnedId === campaign.id) pinnedId = null;
          toast(`${campaign.name} deleted.`);
        }
      });
    }
  });

  table?.addEventListener("toggle", (event) => {
    const menu = event.target;
    if (!(menu instanceof HTMLDetailsElement) || !menu.open) return;
    closeMenus(menu);
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest(".campaigns-row-menu")) return;
    closeMenus();
  });

  renameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = String(renameInput?.value || "").trim();
    if (!name) {
      window.WefranchFieldErrors?.set(renameInput, "Enter a campaign name");
      renameInput?.focus();
      return;
    }
    window.WefranchFieldErrors?.clear(renameInput);
    const updated = store()?.update?.(renameId, { name: name.slice(0, 64) });
    renameModalApi?.close();
    if (updated) toast(`Renamed to ${updated.name}.`);
  });

  renameInput?.addEventListener("input", () => {
    window.WefranchFieldErrors?.clear(renameInput);
  });

  window.addEventListener("wefranch:campaigns-change", () => {
    if (activeTab() === "overview") renderOverview();
  });

  tableWrap?.addEventListener("scroll", syncTableScrollChrome, { passive: true });
  window.addEventListener("resize", syncTableScrollChrome);

  syncTabs();
})();
