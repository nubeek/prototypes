(function () {
  const TABS = ["campaigns", "direct-emails", "templates", "settings"];
  const LIST_PANEL = "overview";
  const LIST_VIEWS = {
    campaigns: {
      source: "campaign",
      noun: { one: "campaign", other: "campaigns" },
      label: "campaigns",
      nameHeader: "Campaign name",
      searchLabel: "Search campaigns"
    },
    "direct-emails": {
      source: "direct",
      noun: { one: "email", other: "emails" },
      label: "direct emails",
      nameHeader: "Subject",
      searchLabel: "Search direct emails"
    }
  };
  const SORT_KEYS = new Set(["name", "type", "recipients", "startAt", "endAt", "openRate", "clickRate", "status"]);
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
  const templateSearchForm = document.getElementById("templateSearch");
  const templateSearchInput = document.getElementById("templateSearchInput");
  const templateSearchClear = document.getElementById("templateSearchClear");
  const newCampaignBtn = document.getElementById("newCampaignBtn");
  const emptyCreateBtn = document.getElementById("campaignEmptyCreate");
  const metricsOpenRate = document.getElementById("campaignMetricOpenRate");
  const metricsClickRate = document.getElementById("campaignMetricClickRate");
  const metricsOpenRateTrend = document.getElementById("campaignMetricOpenRateTrend");
  const metricsClickRateTrend = document.getElementById("campaignMetricClickRateTrend");
  const metricsDomainHealth = document.getElementById("campaignMetricDomainHealth");
  const metricsDomainHealthLabel = document.getElementById("campaignMetricDomainHealthLabel");
  const page = document.querySelector(".campaigns-page");
  const content = document.querySelector(".campaigns-content");
  const tabs = document.querySelector(".campaigns-tabs");
  const toolbar = document.querySelector(".campaigns-toolbar");
  const table = document.getElementById("campaignsTable");
  const tableBody = document.getElementById("campaignsTableBody");
  const tableWrap = document.getElementById("campaignsTableWrap");
  const emptyAll = document.getElementById("campaignsEmptyAll");
  const emptyDirect = document.getElementById("campaignsEmptyDirect");
  const emptySearch = document.getElementById("campaignsEmptySearch");
  const emptySearchMessage = document.getElementById("campaignsEmptySearchMessage");
  const nameHeader = document.getElementById("campaignsNameHeader");
  const overviewPanel = document.querySelector(`[data-campaign-panel="${LIST_PANEL}"]`);
  const renameForm = document.getElementById("renameCampaignForm");
  const renameInput = document.getElementById("renameCampaignName");
  const renameModal = document.getElementById("renameCampaignModal");
  const selectionActions = document.getElementById("campaignSelectionActions");

  let sortKey = "startAt";
  let sortDirection = "descending";
  let pinnedId = null;
  let renameId = null;
  let listTab = null;
  let scrollEaseFrame = 0;
  const selectedIds = new Set();
  const selectionNoun = { ...LIST_VIEWS.campaigns.noun };

  const renameModalApi = window.createProtoModal?.({
    overlay: renameModal,
    getFocusElement() {
      return renameInput;
    }
  });

  const deleteConfirm = window.createProtoConfirmModal?.();

  const selection = window.createToolbarSelection?.({
    container: selectionActions,
    noun: selectionNoun,
    getSelectedCount: () => selectedIds.size,
    onBeforeDelete() {
      closeRowMenu();
    },
    onDelete() {
      const ids = [...selectedIds];
      const onlyName = ids.length === 1 ? store()?.get?.(ids[0])?.name : "";
      selectedIds.clear();
      if (ids.includes(pinnedId)) pinnedId = null;
      const removed = store()?.removeMany?.(ids) || 0;
      if (!removed) {
        renderOverview();
        return;
      }
      toast(removed === 1 && onlyName ? `${onlyName} deleted.` : `${removed} ${selectionNoun.other} deleted.`);
    }
  });

  function store() {
    return window.WefranchCampaignsStore;
  }

  function activeTab() {
    const hash = window.location.hash.replace("#", "");
    return TABS.includes(hash) ? hash : "campaigns";
  }

  function activeView() {
    return LIST_VIEWS[listTab] || LIST_VIEWS.campaigns;
  }

  function isDirectView() {
    return activeView().source === "direct";
  }

  function applyListView(tab) {
    if (listTab === tab) return;
    const switching = listTab !== null;
    listTab = tab;
    const view = activeView();
    if (switching) {
      selectedIds.clear();
      pinnedId = null;
      if (searchInput) searchInput.value = "";
    }
    Object.assign(selectionNoun, view.noun);
    if (nameHeader) nameHeader.textContent = view.nameHeader;
    if (searchInput) {
      searchInput.placeholder = view.searchLabel;
      searchInput.setAttribute("aria-label", view.searchLabel);
    }
    if (emptySearchMessage) emptySearchMessage.textContent = `No ${view.label} match your search.`;
    table?.querySelector(".location-select-all")?.setAttribute("aria-label", `Select all ${view.label}`);
    if (newCampaignBtn) newCampaignBtn.hidden = isDirectView();
    const tabButton = tabButtons.find((button) => button.dataset.campaignTab === tab);
    if (overviewPanel && tabButton) overviewPanel.setAttribute("aria-labelledby", tabButton.id);
  }

  function prefersReducedMotion() {
    return document.documentElement.classList.contains("is-reduce-motion")
      || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function clearPanelHold() {
    document.querySelectorAll(".campaigns-panel").forEach((panel) => {
      panel.style.flexGrow = "";
      panel.style.height = "";
    });
  }

  // Pin the page at its current height so a shorter panel can't clamp scrollTop
  // before easeScrollIntoRange gets to animate it. The visible panel is later
  // locked to its natural height so the extra space stays below it.
  function holdScrollHeight() {
    cancelAnimationFrame(scrollEaseFrame);
    scrollEaseFrame = 0;
    clearPanelHold();
    if (!page || !content) return 0;
    if (page.scrollTop <= 0) {
      content.style.minHeight = "";
      return 0;
    }
    const height = content.offsetHeight;
    content.style.minHeight = `${height}px`;
    return height;
  }

  function releaseScrollHeight() {
    if (content) content.style.minHeight = "";
    clearPanelHold();
    syncTableScrollChrome();
  }

  function easeScrollIntoRange(fromTop, heldHeight) {
    if (!page || !content || !heldHeight) return;
    content.style.minHeight = "";
    const panel = document.querySelector(".campaigns-panel:not([hidden])");
    const naturalPanelHeight = panel?.offsetHeight || 0;
    const maxTop = Math.max(0, page.scrollHeight - page.clientHeight);
    if (fromTop <= maxTop || prefersReducedMotion()) {
      releaseScrollHeight();
      return;
    }
    content.style.minHeight = `${heldHeight}px`;
    if (panel && naturalPanelHeight) {
      panel.style.flexGrow = "0";
      panel.style.height = `${naturalPanelHeight}px`;
    }
    page.scrollTop = fromTop;
    const distance = fromTop - maxTop;
    const duration = Math.min(520, Math.max(280, distance * 0.6));
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      page.scrollTop = fromTop - distance * easeOutCubic(progress);
      if (progress < 1) {
        scrollEaseFrame = requestAnimationFrame(step);
        return;
      }
      scrollEaseFrame = 0;
      releaseScrollHeight();
    };
    scrollEaseFrame = requestAnimationFrame(step);
  }

  function syncTabs() {
    const fromTop = page?.scrollTop || 0;
    const heldHeight = holdScrollHeight();
    const tab = activeTab();
    const isList = Boolean(LIST_VIEWS[tab]);
    const panelName = isList ? LIST_PANEL : tab;
    tabButtons.forEach((button) => {
      const selected = button.dataset.campaignTab === tab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.campaignPanel !== panelName;
    });
    if (isList) {
      applyListView(tab);
      renderOverview();
    } else {
      closeRowMenu();
      renderMetrics(store()?.list?.() || []);
    }
    easeScrollIntoRange(fromTop, heldHeight);
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
    if (key === "clickRate") return rate(campaign.clicks, campaign.sentCount);
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

    const badge = document.createElement("span");
    badge.className = "campaigns-trend__badge";

    const arrow = document.createElement("img");
    arrow.src = "../../assets/icons/chevron.svg";
    arrow.alt = "";
    arrow.className = up ? "campaigns-trend__arrow is-up" : "campaigns-trend__arrow";
    badge.append(arrow);

    const value = document.createElement("span");
    value.textContent = `${up ? "+" : ""}${percent}%`;
    badge.append(value);

    const period = document.createElement("span");
    period.className = "campaigns-trend__period";
    period.textContent = "vs last month";
    element.append(badge, period);
  }

  /* Bands follow the common 0-100 domain/sender health scale (Mailgun, Validity
     Sender Score, EmailElement): 85+ Excellent, 70-84 Good, 50-69 Fair,
     30-49 Poor, under 30 Critical. */
  const DOMAIN_HEALTH_LEVELS = [
    { min: 85, key: "excellent", label: "Excellent" },
    { min: 70, key: "good", label: "Good" },
    { min: 50, key: "fair", label: "Fair" },
    { min: 30, key: "poor", label: "Poor" },
    { min: 0, key: "critical", label: "Critical" }
  ];

  function renderDomainHealth() {
    if (!metricsDomainHealth || !metricsDomainHealthLabel) return;
    const score = parseFloat(metricsDomainHealth.textContent);
    if (!Number.isFinite(score)) return;
    const level = DOMAIN_HEALTH_LEVELS.find((item) => score >= item.min) || DOMAIN_HEALTH_LEVELS.at(-1);
    metricsDomainHealthLabel.textContent = level.label;
    metricsDomainHealthLabel.dataset.health = level.key;
  }

  function renderMetrics(campaigns) {
    const now = new Date();
    const thisKey = monthKey(now);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = monthKey(lastMonth);
    const total = (field) => campaigns.reduce((sum, campaign) => sum + (Number(campaign[field]) || 0), 0);
    const monthRate = (field, key) => rate(sumInMonth(campaigns, field, key), sumInMonth(campaigns, "sentCount", key)) || 0;
    const setRate = (element, part) => {
      if (!element) return;
      const value = rate(total(part), total("sentCount"));
      element.textContent = value === null ? "–" : formatRate(value);
    };
    setRate(metricsOpenRate, "opens");
    setRate(metricsClickRate, "clicks");
    renderTrend(metricsOpenRateTrend, trendRatio(monthRate("opens", thisKey), monthRate("opens", lastKey)));
    renderTrend(metricsClickRateTrend, trendRatio(monthRate("clicks", thisKey), monthRate("clicks", lastKey)));
    renderDomainHealth();
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

  function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, "0");
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
    return `${minutes}:${paddedSeconds}`;
  }

  function presentCampaign(campaign) {
    const snapshot = store()?.deliverySnapshot?.(campaign);
    if (!snapshot) return campaign;
    return {
      ...campaign,
      status: snapshot.status,
      sentCount: snapshot.sentCount,
      endAt: snapshot.endAt,
      delivery: snapshot
    };
  }

  function deliverySignature(campaign) {
    const delivery = campaign.delivery;
    if (!delivery) return "";
    const remaining = delivery.remainingMs == null ? "" : Math.ceil(delivery.remainingMs / 1000);
    const next = delivery.nextBatchMs == null ? "" : Math.ceil(delivery.nextBatchMs / 1000);
    return [delivery.status, delivery.sentCount, remaining, next, delivery.endAt || ""].join("|");
  }

  function formatRate(value) {
    if (value == null) return null;
    return `${Math.round(value * 100)}%`;
  }

  function typeLabel(campaign) {
    if (campaign.type === "sequence") return "Sequence";
    if (campaign.source === "direct") return "Direct";
    return "Single";
  }

  const ROW_MENU_OFFSET = 2;
  const ROW_MENU_VIEWPORT_PADDING = 8;
  const ROW_MENU_ITEM_SELECTOR = "[data-action]:not(:disabled)";
  const iconSrc = (name) => `../../assets/icons/${name}`;

  let rowMenu = null;
  let rowMenuTrigger = null;
  let rowMenuCampaignId = null;

  function menuItem(action, label, icon) {
    const button = document.createElement("button");
    button.className = "ui-menu-item toolbar-dropdown-option toolbar-dropdown-action";
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = action;
    const image = document.createElement("img");
    image.className = "toolbar-dropdown-icon";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.src = iconSrc(icon);
    const text = document.createElement("span");
    text.className = "toolbar-dropdown-label";
    text.textContent = label;
    button.append(image, text);
    return button;
  }

  function menuDivider() {
    const divider = document.createElement("div");
    divider.className = "toolbar-dropdown-divider";
    divider.setAttribute("role", "separator");
    return divider;
  }

  function getRowMenu() {
    if (!rowMenu) {
      rowMenu = document.createElement("div");
      rowMenu.id = "campaignsRowMenu";
      rowMenu.className = "ui-menu ui-dropdown-menu ui-dropdown-menu--down ui-more-menu";
      rowMenu.setAttribute("role", "menu");
      rowMenu.addEventListener("click", handleRowMenuClick);
      rowMenu.addEventListener("keydown", handleRowMenuKeydown);
      document.body.append(rowMenu);
    }
    return rowMenu;
  }

  function syncRowMenu(campaign) {
    const menu = getRowMenu();
    menu.setAttribute("aria-label", `Actions for ${campaign.name}`);
    if (campaign.source === "direct") {
      const status = presentCampaign(campaign).status;
      menu.replaceChildren(
        menuItem("report", "View report", "table.svg"),
        ...(status === "sending" || status === "scheduled" ? [menuItem("pause", "Pause", "pause.svg")] : []),
        ...(status === "paused" ? [menuItem("resume", "Resume", "reload.svg")] : []),
        menuDivider(),
        menuItem("delete", "Delete", "delete.svg")
      );
      return;
    }
    menu.replaceChildren(
      menuItem("report", "View report", "table.svg"),
      menuItem("duplicate", "Duplicate", "copy.svg"),
      ...(campaign.status === "sending" ? [menuItem("pause", "Pause", "pause.svg")] : []),
      ...(campaign.status === "paused" ? [menuItem("resume", "Resume", "reload.svg")] : []),
      menuItem("rename", "Rename", "notes.svg"),
      menuDivider(),
      menuItem("delete", "Delete", "delete.svg")
    );
  }

  function positionRowMenu(trigger) {
    const menu = rowMenu;
    const triggerRect = trigger.getBoundingClientRect();
    const travel = parseFloat(getComputedStyle(menu).getPropertyValue("--dropdown-reveal-travel")) || 0;
    const padding = ROW_MENU_VIEWPORT_PADDING;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const belowTop = triggerRect.bottom + ROW_MENU_OFFSET;
    const aboveTop = triggerRect.top - ROW_MENU_OFFSET - height;
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

  function getRowMenuItems() {
    return rowMenu ? [...rowMenu.querySelectorAll(ROW_MENU_ITEM_SELECTOR)] : [];
  }

  function focusRowMenuItem(index) {
    const items = getRowMenuItems();
    if (!items.length) return;
    items[(index + items.length) % items.length].focus({ preventScroll: true });
  }

  function openRowMenu(trigger, { focusFirstItem = false } = {}) {
    const campaign = store()?.get?.(trigger.dataset.campaignId);
    if (!campaign) return;

    closeRowMenu();
    const menu = getRowMenu();
    syncRowMenu(campaign);
    rowMenuTrigger = trigger;
    rowMenuCampaignId = campaign.id;
    trigger.setAttribute("aria-expanded", "true");
    positionRowMenu(trigger);
    menu.classList.add("is-open");
    if (focusFirstItem) focusRowMenuItem(0);
  }

  function closeRowMenu({ restoreFocus = false } = {}) {
    const trigger = rowMenuTrigger;
    if (!trigger) return;

    rowMenuTrigger = null;
    rowMenuCampaignId = null;
    rowMenu?.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function toggleRowMenu(trigger, options) {
    if (rowMenuTrigger === trigger) {
      closeRowMenu();
      return;
    }
    openRowMenu(trigger, options);
  }

  function handleRowMenuClick(event) {
    const item = event.target.closest(ROW_MENU_ITEM_SELECTOR);
    const trigger = rowMenuTrigger;
    const campaignId = rowMenuCampaignId;
    if (!item || !campaignId) return;

    const action = item.dataset.action;
    closeRowMenu({ restoreFocus: event.detail === 0 });
    const campaign = store()?.get?.(campaignId);
    if (!campaign) return;
    runCampaignAction(campaign, action, trigger);
  }

  function handleRowMenuKeydown(event) {
    const items = getRowMenuItems();
    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      focusRowMenuItem(currentIndex === -1 ? (step > 0 ? 0 : -1) : currentIndex + step);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusRowMenuItem(event.key === "Home" ? 0 : -1);
    } else if (event.key === "Tab") {
      event.preventDefault();
      closeRowMenu({ restoreFocus: true });
    }
  }

  function runCampaignAction(campaign, action, trigger) {
    const isDirect = campaign.source === "direct";
    if (action === "report") {
      toast(isDirect ? "Email reports are coming soon." : "Campaign reports are coming soon.");
      return;
    }
    if (action === "duplicate") {
      const copy = store()?.duplicate?.(campaign.id);
      pinnedId = copy?.id || null;
      toast(`${copy?.name || "Campaign"} saved as a draft.`);
      renderOverview();
      return;
    }
    if (action === "pause") {
      const paused = store()?.pause?.(campaign.id);
      if (paused) toast(`${paused.name} paused.`);
      return;
    }
    if (action === "resume") {
      const resumed = store()?.resume?.(campaign.id);
      if (resumed) toast(`${resumed.name} resumed.`);
      return;
    }
    if (action === "rename") {
      openRename(campaign, trigger);
      return;
    }
    if (action === "delete") {
      deleteConfirm?.open({
        title: isDirect ? "Delete email?" : "Delete campaign?",
        message: `Delete ${campaign.name}?\nThis can't be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        trigger,
        onConfirm() {
          store()?.remove?.(campaign.id);
          if (pinnedId === campaign.id) pinnedId = null;
          toast(`${campaign.name} deleted.`);
        }
      });
    }
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

  function appendSendingProgress(cell, sent, total) {
    const ratio = total > 0 ? Math.max(0, Math.min(sent / total, 1)) : 0;
    const exact = `${sent.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`;
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
    cell.append(line);
  }

  function appendNextBatch(cell, nextBatchMs) {
    if (nextBatchMs == null) return;
    const next = document.createElement("span");
    next.className = "campaign-status__next";
    next.textContent = `Next batch in ${formatClock(nextBatchMs)}`;
    cell.append(next);
  }

  function renderStatus(campaign) {
    const cell = document.createElement("div");
    cell.className = `campaign-status campaign-status--${campaign.status}`;
    const delivery = campaign.delivery || null;

    if (campaign.status === "sending") {
      const sent = campaign.sentCount;
      const total = Math.max(campaign.recipientCount, 0);
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.append("Sending", sendingDots());
      cell.append(label);
      appendSendingProgress(cell, sent, total);
      appendNextBatch(cell, delivery?.nextBatchMs);
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
      const countdown = delivery?.remainingMs;
      const remaining = countdown == null ? remainingMs(campaign.startAt) : countdown;
      if (countdown != null) {
        date.textContent = `Starting in ${formatClock(countdown)}`;
        line.append(date);
      } else if (remaining != null && remaining < 60 * 60 * 1000) {
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

    if (campaign.status === "paused") {
      const holding = Boolean(delivery && (delivery.remainingMs != null || delivery.sentCount > 0 || delivery.nextBatchMs != null));
      cell.classList.toggle("is-holding", holding);
      const hold = document.createElement("span");
      hold.className = "campaign-status__hold";
      const icon = document.createElement("img");
      icon.className = "campaign-status__pause";
      icon.src = "../../assets/icons/pause.svg";
      icon.alt = "";
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Paused";
      hold.append(icon, label);
      cell.append(hold);
      if (delivery?.remainingMs != null) {
        const date = document.createElement("span");
        date.className = "campaign-status__meta";
        date.textContent = `Starting in ${formatClock(delivery.remainingMs)}`;
        cell.append(date);
      } else if (delivery && (delivery.sentCount > 0 || delivery.nextBatchMs != null)) {
        appendSendingProgress(cell, campaign.sentCount, Math.max(campaign.recipientCount, 0));
        appendNextBatch(cell, delivery.nextBatchMs);
      }
      return cell;
    }

    const label = document.createElement("span");
    label.className = "campaign-status__label";
    label.textContent = "Draft";
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
    row.dataset.delivery = deliverySignature(campaign);

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

    const clickCell = document.createElement("td");
    const clickLabel = formatRate(rate(campaign.clicks, campaign.sentCount));
    if (clickLabel) clickCell.textContent = clickLabel;
    else clickCell.append(dash());

    const statusCell = document.createElement("td");
    statusCell.className = "campaigns-status-cell";
    statusCell.append(renderStatus(campaign));

    const menuCell = document.createElement("td");
    menuCell.className = "campaigns-menu-cell";
    const more = document.createElement("button");
    more.type = "button";
    more.className = "ui-control ui-more-button";
    more.dataset.campaignId = campaign.id;
    more.setAttribute("aria-label", `Actions for ${campaign.name}`);
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-expanded", "false");
    more.setAttribute("aria-controls", "campaignsRowMenu");
    menuCell.append(more);

    row.append(selectCell, nameCell, typeCell, recipientsCell, startCell, endCell, openCell, clickCell, statusCell, menuCell);
    return row;
  }

  function visibleRows() {
    return Array.from(tableBody?.querySelectorAll("tr[data-campaign-id]") || []);
  }

  function syncSelectAll() {
    selection?.sync();
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
    closeRowMenu();
    const allCampaigns = (store()?.list?.() || []).map(presentCampaign);
    const source = activeView().source;
    const campaigns = allCampaigns.filter((campaign) => campaign.source === source);
    pruneSelection(campaigns);
    renderMetrics(allCampaigns);
    syncSearchChrome();
    const rows = visibleCampaigns(campaigns);
    const hasCampaigns = campaigns.length > 0;
    const hasRows = rows.length > 0;

    if (emptyAll) emptyAll.hidden = hasCampaigns || isDirectView();
    if (emptyDirect) emptyDirect.hidden = hasCampaigns || !isDirectView();
    if (overviewPanel) overviewPanel.classList.toggle("is-empty", !hasCampaigns);
    if (tableWrap) tableWrap.hidden = !hasCampaigns;
    if (emptySearch) emptySearch.hidden = !hasCampaigns || hasRows;
    if (tableBody) {
      tableBody.replaceChildren();
      if (hasRows) rows.forEach((campaign, index) => tableBody.append(renderRow(campaign, index + 1)));
    }
    syncSelectAll();
    syncSortHeaders();
    syncStickyOffsets();
    syncTableScrollChrome();
  }

  function syncStickyOffsets() {
    if (!page || !tabs) return;
    page.style.setProperty("--campaigns-tabs-height", `${tabs.offsetHeight}px`);
    if (toolbar && overviewPanel && !overviewPanel.hidden) {
      page.style.setProperty("--campaigns-toolbar-height", `${toolbar.offsetHeight}px`);
    }
  }

  function syncTableScrollChrome() {
    if (!tableWrap || !page) return;
    const thead = table?.querySelector("thead");
    if (!thead || tableWrap.hidden) {
      tableWrap.classList.remove("is-header-row-overlap", "is-status-column-overlap");
      return;
    }
    const hasRightOverlap = page.scrollWidth > page.clientWidth + 1
      && page.scrollLeft + page.clientWidth < page.scrollWidth - 1;
    tableWrap.classList.toggle("is-status-column-overlap", hasRightOverlap);
    const hasVerticalOverflow = page.scrollHeight > page.clientHeight + 1;
    const hasTopOverlap = tableWrap.getBoundingClientRect().top < thead.getBoundingClientRect().top - 1;
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
      onSaveDraft(draft, options = {}) {
        const existingId = options?.id;
        const record = existingId
          ? (store()?.update?.(existingId, draft) || store()?.create?.(draft))
          : store()?.create?.(draft);
        if (options?.notify === false) return record;
        pinnedId = record?.id || null;
        if (searchInput) searchInput.value = "";
        const name = record?.name || draft?.name || "Campaign";
        window.WefranchToast?.show({
          message: `${name} saved as a draft.`
        });
        if (activeTab() !== "campaigns") window.location.hash = "campaigns";
        renderOverview();
        return record;
      },
      onComplete(draft) {
        const record = store()?.create?.(draft);
        pinnedId = record?.id || null;
        if (searchInput) searchInput.value = "";
        const scheduled = (record?.status || draft?.status) === "scheduled";
        const name = record?.name || draft?.name || "Campaign";
        window.WefranchToast?.show({
          message: scheduled ? `${name} scheduled.` : `${name} is sending.`
        });
        if (activeTab() !== "campaigns") window.location.hash = "campaigns";
        renderOverview();
      }
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

  function syncTemplateSearchChrome() {
    const hasQuery = Boolean(String(templateSearchInput?.value || "").trim());
    templateSearchForm?.classList.toggle("is-active-search", hasQuery);
    if (templateSearchClear) templateSearchClear.hidden = !hasQuery;
  }

  templateSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  templateSearchInput?.addEventListener("input", syncTemplateSearchChrome);
  templateSearchClear?.addEventListener("click", (event) => {
    event.preventDefault();
    if (templateSearchInput) templateSearchInput.value = "";
    syncTemplateSearchChrome();
    templateSearchInput?.focus();
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
  });

  table?.addEventListener("click", (event) => {
    const trigger = event.target.closest(".ui-more-button");
    if (!trigger) return;
    event.stopPropagation();
    toggleRowMenu(trigger, { focusFirstItem: event.detail === 0 });
  });

  table?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    const trigger = event.target.closest(".ui-more-button");
    if (!trigger) return;
    event.preventDefault();
    openRowMenu(trigger, { focusFirstItem: true });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!rowMenuTrigger || !(event.target instanceof Node)) return;
    if (rowMenu?.contains(event.target) || rowMenuTrigger.contains(event.target)) return;
    closeRowMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !rowMenuTrigger) return;
    event.preventDefault();
    closeRowMenu({ restoreFocus: true });
  });

  page?.addEventListener("scroll", () => closeRowMenu(), { passive: true });
  window.addEventListener("resize", () => closeRowMenu());

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

  function consumeDraftHighlight() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("draft");
    if (!id) return;
    if (store()?.get?.(id)) pinnedId = id;
    params.delete("draft");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }

  function syncLiveDelivery() {
    if (!tableBody || !LIST_VIEWS[activeTab()]) return;
    let structureChanged = false;
    tableBody.querySelectorAll("tr[data-campaign-id]").forEach((row) => {
      const stored = store()?.get?.(row.dataset.campaignId);
      if (!stored) return;
      const campaign = presentCampaign(stored);
      const signature = deliverySignature(campaign);
      if (!signature || row.dataset.delivery === signature) return;
      const previous = (row.dataset.delivery || "").split("|");
      const next = signature.split("|");
      row.dataset.delivery = signature;
      if (!previous[0] || previous[0] !== next[0] || previous[1] !== next[1] || previous[4] !== next[4]) {
        structureChanged = Boolean(previous[0]);
        if (!previous[0]) {
          const cell = row.querySelector(".campaigns-status-cell");
          if (cell) cell.replaceChildren(renderStatus(campaign));
        }
        return;
      }
      const clock = row.querySelector(".campaign-status__meta, .campaign-status__next");
      const delivery = campaign.delivery;
      if (!clock || !delivery) return;
      if (delivery.remainingMs != null) clock.textContent = `Starting in ${formatClock(delivery.remainingMs)}`;
      else if (delivery.nextBatchMs != null) clock.textContent = `Next batch in ${formatClock(delivery.nextBatchMs)}`;
    });
    if (structureChanged) renderOverview();
  }

  window.addEventListener("wefranch:campaigns-change", () => {
    if (LIST_VIEWS[activeTab()]) renderOverview();
    else renderMetrics((store()?.list?.() || []).map(presentCampaign));
  });
  window.setInterval(syncLiveDelivery, 1000);

  page?.addEventListener("scroll", syncTableScrollChrome, { passive: true });
  window.addEventListener("resize", () => {
    syncStickyOffsets();
    syncTableScrollChrome();
  });
  document.fonts?.ready?.then(() => {
    syncStickyOffsets();
    syncTableScrollChrome();
  });
  syncStickyOffsets();

  consumeDraftHighlight();
  syncTabs();
})();
