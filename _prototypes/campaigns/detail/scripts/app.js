(function () {
  const format = window.WefranchCampaignFormat;
  const recipientsApi = window.WefranchCampaignRecipients;
  format.setIconBase("../../../assets/icons/");

  const PAGE_SIZE = 50;
  const SEGMENT_LABELS = {
    all: "All",
    sent: "Sent",
    delivered: "Delivered",
    bounced: "Bounced",
    opened: "Opened",
    clicked: "Clicked",
    unsubscribed: "Unsubscribed",
    spam: "Marked as spam"
  };
  const METRICS = [
    { key: "recipients", label: "Recipients", segment: "all" },
    { key: "sent", label: "Sent", segment: "sent" },
    { key: "delivered", label: "Delivered", segment: "delivered" },
    { key: "bounced", label: "Bounced", segment: "bounced" },
    { key: "opened", label: "Opened", segment: "opened" },
    { key: "clicked", label: "Clicked", segment: "clicked" },
    { key: "unsubscribed", label: "Unsubscribed", segment: "unsubscribed" },
    { key: "spam", label: "Marked as spam", segment: "spam" }
  ];
  const SIDEBAR_KEY = "wefranch:campaign-detail-sidebar";
  const STATUS_ORDER = ["pending", "bounced", "sent", "delivered", "opened", "clicked", "unsubscribed"];
  const TEMPLATES = {
    introduction: { label: "Introduction", image: "../assets/images/campaign-template.jpg" },
    "territory-opportunity": { label: "Territory opportunity", image: "../assets/images/email-template-1.jpg" },
    "market-update": { label: "Market update", image: "../assets/images/email-template-2.jpg" },
    "follow-up": { label: "Follow-up", image: "../assets/images/email-template-1.jpg" },
    "event-invitation": { label: "Event invitation", image: "../assets/images/email-template-3.jpg" }
  };

  const content = document.getElementById("campaignPageContent");
  const notFound = document.getElementById("campaignNotFound");
  const main = document.getElementById("campaignPageMain");
  const titleEl = document.getElementById("campaignTitle");
  const statusEl = document.getElementById("campaignStatus");
  const sidebar = document.getElementById("campaignSidebar");
  const sidebarToggle = document.getElementById("campaignSidebarToggle");
  const sidebarClose = document.getElementById("campaignSidebarClose");
  const floatingSidebar = window.matchMedia("(max-width: 980px)");
  const fieldsEl = document.getElementById("campaignFields");
  const metricsEl = document.getElementById("campaignMetrics");
  const toolbar = document.getElementById("recipientToolbar");
  const segmentsEl = document.getElementById("recipientSegments");
  const searchForm = document.getElementById("recipientSearch");
  const searchInput = document.getElementById("recipientSearchInput");
  const searchClear = document.getElementById("recipientSearchClear");
  const table = document.getElementById("recipientTable");
  const tableBody = document.getElementById("recipientTableBody");
  const emptyEl = document.getElementById("recipientEmpty");
  const emptyMessage = document.getElementById("recipientEmptyMessage");
  const footer = document.getElementById("recipientFooter");
  const countEl = document.getElementById("recipientCount");
  const showMore = document.getElementById("recipientShowMore");
  const activityLabel = document.getElementById("recipientActivityLabel");
  const emailTabs = document.getElementById("campaignMessageEmails");
  const templateEl = document.getElementById("campaignMessageTemplate");
  const subjectEl = document.getElementById("campaignMessageSubject");
  const previewEl = document.getElementById("campaignMessagePreview");
  const image = document.getElementById("campaignMessageImage");

  const campaignId = new URLSearchParams(window.location.search).get("id") || "";

  let sortKey = "lastActivityAt";
  let sortDirection = "descending";
  let limit = PAGE_SIZE;
  let emailIndex = 0;
  const signatures = {};

  function store() {
    return window.WefranchCampaignsStore;
  }

  function currentCampaign() {
    const stored = campaignId ? store()?.get?.(campaignId) : null;
    return stored ? format.presentCampaign(stored) : null;
  }

  function activeSegment() {
    const hash = window.location.hash.replace("#", "");
    return recipientsApi.SEGMENTS.includes(hash) ? hash : "all";
  }

  function queryText() {
    return String(searchInput?.value || "").trim().toLowerCase();
  }

  function setBreadcrumb(campaign) {
    const items = [{ label: "Campaigns", href: "../" }];
    if (campaign) {
      items.push({ label: format.typeLabel(campaign) }, { label: campaign.name });
    } else {
      items.push({ label: "Not found" });
    }
    window.wefranchSiteHeader?.setBreadcrumb(items);
  }

  function showNotFound() {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    document.title = "Campaign not found";
    setBreadcrumb(null);
  }

  /* Header */

  function renderHeader(campaign) {
    document.title = campaign.name;
    setBreadcrumb(campaign);
    if (titleEl) titleEl.textContent = campaign.name;
    statusEl?.replaceChildren(format.renderStatus(campaign, { progress: "ring" }));
  }

  /* Sidebar: details, metrics, and message */

  function isEditable(campaign) {
    if (campaign.status === "draft" || campaign.status === "scheduled") return true;
    return campaign.status === "paused" && !campaign.sentCount;
  }

  // The wizard step each sidebar field opens at. Type opens on the email step
  // because that's where the single/sequence switch lives.
  const EDIT_STEPS = {
    Type: "subject",
    Sender: "sender",
    Recipients: "recipients",
    "Start date": "schedule",
    Subject: "subject",
    "Preview text": "subject",
    Design: "design"
  };
  const MESSAGE_FIELDS = new Set(["Subject", "Preview text", "Design"]);

  function setFieldEditable(wrap, label, editable) {
    wrap.classList.toggle("is-editable", editable);
    let button = wrap.querySelector(":scope > .campaign-sidebar__edit");
    if (!editable) {
      button?.remove();
      return;
    }
    if (button) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "campaign-sidebar__edit";
    button.dataset.editStep = EDIT_STEPS[label] || "";
    if (MESSAGE_FIELDS.has(label)) button.dataset.editMessage = "";
    button.setAttribute("aria-label", `Edit ${label.toLowerCase()}`);
    const icon = document.createElement("span");
    icon.className = "campaign-sidebar__edit-icon";
    icon.setAttribute("aria-hidden", "true");
    button.append(icon);
    wrap.append(button);
  }

  function field(label, value, { full = true, editable = false } = {}) {
    const wrap = document.createElement("div");
    wrap.className = `campaign-sidebar__field${full ? " is-full" : ""}`;
    const term = document.createElement("dt");
    term.className = "campaign-sidebar__label";
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.className = "campaign-sidebar__value";
    if (value instanceof Node) detail.append(value);
    else if (value) detail.textContent = value;
    else detail.append(format.dash());
    wrap.append(term, detail);
    setFieldEditable(wrap, label, editable);
    return wrap;
  }

  function typeText(campaign) {
    if (campaign.type === "sequence") {
      return `Sequence (${campaign.emailCount} email${campaign.emailCount === 1 ? "" : "s"})`;
    }
    return format.typeLabel(campaign);
  }

  function senderValue(campaign) {
    return campaign.sender?.email || "";
  }

  function recipientsText(campaign) {
    if (campaign.audienceTitle) return campaign.audienceTitle;
    const count = Number(campaign.recipientCount) || 0;
    return `${format.formatCount(count)} recipient${count === 1 ? "" : "s"}`;
  }

  function metricCounts(campaign) {
    const counts = recipientsApi.segmentCounts(campaign);
    return {
      recipients: counts.all,
      sent: counts.sent,
      delivered: counts.delivered,
      bounced: counts.bounced,
      opened: counts.opened,
      clicked: counts.clicked,
      unsubscribed: counts.unsubscribed,
      spam: counts.spam
    };
  }

  // Rates are of all recipients for Sent, of delivered for Unsubscribed and
  // Marked as spam, and of sent for everything else.
  function metricDetail(key, counts) {
    if (key === "recipients") {
      if (!counts.sent) return "Nothing sent yet";
      const remaining = counts.recipients - counts.sent;
      return remaining > 0 ? `${format.formatCount(remaining)} not sent yet` : "All sent";
    }
    if (!counts.sent) return "";
    const [whole, unit] = key === "sent"
      ? [counts.recipients, "recipients"]
      : key === "unsubscribed" || key === "spam"
        ? [counts.delivered, "delivered"]
        : [counts.sent, "sent"];
    const rate = format.formatRate(format.rate(counts[key], whole));
    return rate ? `${rate} of ${unit}` : "";
  }

  function metricCell(metric, counts) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "campaign-sidebar__metric";
    cell.dataset.segment = metric.segment;
    cell.setAttribute("aria-controls", "recipientTableWrap");
    cell.setAttribute("aria-pressed", String(metric.segment === activeSegment()));
    cell.classList.toggle("is-active", metric.segment === activeSegment());
    const label = document.createElement("span");
    label.className = "campaign-sidebar__metric-label";
    label.textContent = metric.label;
    const value = document.createElement("span");
    value.className = "campaign-sidebar__metric-value";
    const showValue = metric.key === "recipients" || counts.sent > 0;
    if (showValue) value.textContent = format.formatCount(counts[metric.key]);
    else value.append(format.dash());
    cell.append(label, value);
    const detailText = metricDetail(metric.key, counts);
    if (detailText) {
      const detail = document.createElement("span");
      detail.className = "campaign-sidebar__metric-detail";
      detail.textContent = detailText;
      cell.append(detail);
    }
    cell.title = `Show ${metric.segment === "all" ? "all" : metric.label.toLowerCase()} recipients`;
    return cell;
  }

  function renderDetails(campaign) {
    const editable = isEditable(campaign);
    fieldsEl?.replaceChildren(
      field("Type", typeText(campaign), { editable }),
      field("Sender", senderValue(campaign), { editable }),
      field("Recipients", recipientsText(campaign), { editable }),
      field("Start date", format.formatDate(campaign.startAt), { full: false, editable }),
      field("End date", format.formatDate(campaign.endAt), { full: false })
    );
    const counts = metricCounts(campaign);
    metricsEl?.replaceChildren(...METRICS.map((metric) => metricCell(metric, counts)));
  }

  function renderEmailTabs(campaign) {
    if (!emailTabs) return;
    const isSequence = campaign.messages.length > 1;
    emailTabs.hidden = !isSequence;
    if (!isSequence) {
      emailTabs.replaceChildren();
      return;
    }
    emailTabs.replaceChildren(...campaign.messages.map((_, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `scope-tab${index === emailIndex ? " is-active" : ""}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(index === emailIndex));
      tab.dataset.emailIndex = String(index);
      tab.textContent = `Email ${index + 1}`;
      return tab;
    }));
  }

  function renderMessage(campaign) {
    emailIndex = Math.min(emailIndex, campaign.messages.length - 1);
    const message = campaign.messages[emailIndex] || {};
    const template = TEMPLATES[message.templateId] || TEMPLATES.introduction;
    renderEmailTabs(campaign);
    if (templateEl) templateEl.textContent = template.label;
    if (subjectEl) subjectEl.textContent = message.subjectLine || campaign.name;
    if (previewEl) {
      if (message.previewText) previewEl.textContent = message.previewText;
      else previewEl.replaceChildren(format.dash());
    }
    if (image && image.getAttribute("src") !== template.image) image.src = template.image;
    if (image) image.alt = `${template.label} email design`;
    const editable = isEditable(campaign);
    [[subjectEl, "Subject"], [previewEl, "Preview text"], [image, "Design"]].forEach(([el, label]) => {
      const wrap = el?.closest(".campaign-sidebar__field");
      if (wrap) setFieldEditable(wrap, label, editable);
    });
  }

  /* Recipients */

  function renderSegments(campaign) {
    const counts = recipientsApi.segmentCounts(campaign);
    const active = activeSegment();
    segmentsEl?.replaceChildren(...recipientsApi.SEGMENTS.map((segment) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `scope-tab campaign-recipients__segment${segment === active ? " is-active" : ""}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(segment === active));
      tab.setAttribute("aria-controls", "recipientTableWrap");
      tab.dataset.segment = segment;
      const label = document.createElement("span");
      label.textContent = SEGMENT_LABELS[segment];
      const count = document.createElement("span");
      count.className = "campaign-recipients__segment-count";
      count.textContent = format.formatCount(counts[segment]);
      tab.append(label, count);
      return tab;
    }));
  }

  // Each tab sorts by the time of its own event. All keeps the latest event.
  const SEGMENT_TIME = {
    sent: "sentAt",
    delivered: "deliveredAt",
    bounced: "bouncedAt",
    opened: "openedAt",
    clicked: "clickedAt",
    unsubscribed: "unsubscribedAt",
    spam: "spamAt"
  };

  function activityTime(recipient) {
    const key = SEGMENT_TIME[activeSegment()];
    return (key && recipient[key]) || recipient.lastActivityAt;
  }

  function sortValue(recipient, key) {
    if (key === "status") return STATUS_ORDER.indexOf(recipient.status);
    if (key === "lastActivityAt") {
      const value = activityTime(recipient);
      return value ? Date.parse(value) : null;
    }
    return String(recipient[key] || "").toLowerCase();
  }

  function compareRecipients(left, right) {
    const leftValue = sortValue(left, sortKey);
    const rightValue = sortValue(right, sortKey);
    const direction = sortDirection === "ascending" ? 1 : -1;
    if (leftValue == null && rightValue == null) return left.name.localeCompare(right.name);
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (leftValue === rightValue) return left.name.localeCompare(right.name);
      return (leftValue - rightValue) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  }

  function visibleRecipients(campaign) {
    const segment = activeSegment();
    const query = queryText();
    return recipientsApi.list(campaign)
      .filter((recipient) => recipientsApi.inSegment(recipient, segment))
      .filter((recipient) => !query || [recipient.name, recipient.email, recipient.company]
        .some((value) => value.toLowerCase().includes(query)))
      .sort(compareRecipients);
  }

  function statusChip(recipient) {
    const chip = document.createElement("span");
    chip.className = `recipient-status recipient-status--${recipient.status}`;
    chip.textContent = recipientsApi.STATUSES[recipient.status] || recipient.status;
    return chip;
  }

  function cell(content, className = "") {
    const td = document.createElement("td");
    if (className) td.className = className;
    if (content instanceof Node) td.append(content);
    else if (content) td.textContent = content;
    else td.append(format.dash());
    return td;
  }

  function renderRow(recipient) {
    const row = document.createElement("tr");
    row.dataset.recipientId = recipient.id;
    row.append(
      cell(recipient.name, "recipient-name"),
      cell(recipient.email, "recipient-email"),
      cell(recipient.company),
      cell(statusChip(recipient)),
      cell(activityTime(recipient) ? format.formatSchedule(activityTime(recipient)) : null, "recipient-activity")
    );
    row.title = recipient.email;
    return row;
  }

  function emptyText(campaign) {
    if (queryText()) return "No recipients match your search.";
    const segment = activeSegment();
    if (segment === "all") return "This campaign has no recipients.";
    if (!campaign.sentCount) return "Nothing has been sent yet.";
    return `No ${SEGMENT_LABELS[segment].toLowerCase()} recipients yet.`;
  }

  function syncSortHeaders() {
    table?.querySelectorAll(".sortable-header").forEach((header) => {
      header.setAttribute("aria-sort", header.dataset.sortKey === sortKey ? sortDirection : "none");
    });
  }

  function renderRecipients(campaign) {
    renderSegments(campaign);
    const segment = activeSegment();
    if (activityLabel) {
      activityLabel.textContent = segment === "all" ? "Last activity" : SEGMENT_LABELS[segment];
    }
    const rows = visibleRecipients(campaign);
    const shown = rows.slice(0, limit);
    tableBody?.replaceChildren(...shown.map(renderRow));
    if (emptyEl) emptyEl.hidden = rows.length > 0;
    if (emptyMessage) emptyMessage.textContent = emptyText(campaign);
    table?.classList.toggle("is-empty", rows.length === 0);
    if (footer) footer.hidden = rows.length === 0;
    if (countEl) {
      countEl.textContent = `Showing ${format.formatCount(shown.length)} of ${format.formatCount(rows.length)}`;
    }
    if (showMore) showMore.hidden = shown.length >= rows.length;
    syncSortHeaders();
    syncActiveMetric();
    signatures.recipients = recipientKey(campaign);
  }

  function syncActiveMetric() {
    const segment = activeSegment();
    metricsEl?.querySelectorAll("[data-segment]").forEach((metric) => {
      const active = metric.dataset.segment === segment;
      metric.classList.toggle("is-active", active);
      metric.setAttribute("aria-pressed", String(active));
    });
  }

  function recipientKey(campaign) {
    const counts = recipientsApi.segmentCounts(campaign);
    return [campaign.startAt, campaign.endAt, ...Object.values(counts)].join("|");
  }

  /* Each part re-renders only when its own inputs change, so the 1s delivery
     tick doesn't rebuild the sidebar and drop focus from its controls. */
  function renderPart(name, key, renderFn, force) {
    if (!force && signatures[name] === key) return;
    signatures[name] = key;
    renderFn();
  }

  function render({ force = false } = {}) {
    const campaign = currentCampaign();
    if (!campaign) {
      showNotFound();
      return;
    }
    if (content) content.hidden = false;
    if (notFound) notFound.hidden = true;
    renderPart("header", JSON.stringify([
      campaign.name, campaign.source, campaign.status, campaign.sentCount, campaign.recipientCount,
      campaign.startAt, format.deliverySignature(campaign)
    ]), () => renderHeader(campaign), force);
    const editable = isEditable(campaign);
    renderPart("details", JSON.stringify([
      campaign.type, campaign.emailCount, campaign.source, campaign.sender, campaign.audienceTitle,
      campaign.recipientCount, campaign.startAt, campaign.endAt, metricCounts(campaign), editable
    ]), () => renderDetails(campaign), force);
    renderPart("message", JSON.stringify([campaign.name, campaign.messages, emailIndex, editable]), () => renderMessage(campaign), force);
    renderPart("recipients", recipientKey(campaign), () => renderRecipients(campaign), force);
  }

  function rerenderRecipients() {
    const campaign = currentCampaign();
    if (campaign) renderRecipients(campaign);
  }

  function syncSearchChrome() {
    const hasQuery = Boolean(queryText());
    searchForm?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  }

  function selectSegment(segment) {
    limit = PAGE_SIZE;
    sortKey = "lastActivityAt";
    sortDirection = "descending";
    const nextHash = segment === "all" ? "" : `#${segment}`;
    if (window.location.hash === nextHash) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    rerenderRecipients();
    segmentsEl?.querySelector(`[data-segment="${segment}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  segmentsEl?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-segment]");
    if (tab) selectSegment(tab.dataset.segment);
  });

  metricsEl?.addEventListener("click", (event) => {
    const metric = event.target.closest("[data-segment]");
    if (metric) selectSegment(metric.dataset.segment);
  });

  segmentsEl?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const tabs = [...segmentsEl.querySelectorAll("[data-segment]")];
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    next.click();
    segmentsEl.querySelector(`[data-segment="${next.dataset.segment}"]`)?.focus();
  });

  window.addEventListener("hashchange", () => {
    limit = PAGE_SIZE;
    sortKey = "lastActivityAt";
    sortDirection = "descending";
    rerenderRecipients();
  });

  searchForm?.addEventListener("submit", (event) => event.preventDefault());
  searchInput?.addEventListener("input", () => {
    limit = PAGE_SIZE;
    syncSearchChrome();
    rerenderRecipients();
  });
  searchClear?.addEventListener("click", (event) => {
    event.preventDefault();
    if (searchInput) searchInput.value = "";
    syncSearchChrome();
    searchInput?.focus();
    rerenderRecipients();
  });

  table?.addEventListener("click", (event) => {
    const header = event.target.closest(".sortable-header");
    if (!header) return;
    const key = header.dataset.sortKey;
    if (sortKey === key) {
      sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
    } else {
      sortKey = key;
      sortDirection = key === "lastActivityAt" || key === "status" ? "descending" : "ascending";
    }
    rerenderRecipients();
  });

  table?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const header = event.target.closest(".sortable-header");
    if (!header) return;
    event.preventDefault();
    header.click();
  });

  showMore?.addEventListener("click", () => {
    limit += PAGE_SIZE;
    rerenderRecipients();
  });

  emailTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-email-index]");
    if (!tab) return;
    emailIndex = Number(tab.dataset.emailIndex) || 0;
    render();
  });

  /* Editing opens the campaign wizard on the matching step, filled in with
     this campaign, and saves back to the same record. */

  function savedSearches() {
    return Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : [];
  }

  function audienceValuesFor(record) {
    const title = String(record.audienceTitle || "");
    if (!title) return [];
    const byTitle = (value) => savedSearches().find((search) => search.title === value)?.id;
    const whole = byTitle(title);
    if (whole) return [whole];
    return title.split(", ").map(byTitle).filter(Boolean);
  }

  // Keeps the campaign's own recipient count while its audience is unchanged,
  // instead of the saved-search estimate.
  function editAudienceAdapter(record, audienceValues) {
    const base = window.wefranchCampaignAudience || {};
    const ownSearchId = audienceValues.length === 1 ? audienceValues[0] : "";
    const ownCount = Number(record.recipientCount) || 0;
    return {
      getAudienceOptions() {
        return (base.getAudienceOptions?.() || []).map((option) => {
          if (!ownSearchId || option.value !== ownSearchId || !ownCount) return option;
          return { ...option, label: `${record.audienceTitle} (${format.formatCount(ownCount)})` };
        });
      },
      getAudiencePreview(values) {
        const preview = base.getAudiencePreview?.(values) || null;
        if (!preview || !ownCount || preview.title !== record.audienceTitle) return preview;
        return { ...preview, contactCount: ownCount };
      },
      getDefaultAudienceValues: () => "",
      onAudienceChange: base.onAudienceChange
    };
  }

  function openEditor(step, trigger, { message = false } = {}) {
    const record = campaignId ? store()?.get?.(campaignId) : null;
    if (!record || !window.WefranchCampaignWizard) return;
    const audienceValues = audienceValuesFor(record);
    window.WefranchCampaignWizard.open({
      trigger,
      step,
      emailIndex: message ? emailIndex : 0,
      campaign: { ...record, audienceValues },
      ...editAudienceAdapter(record, audienceValues),
      onSaveDraft(draft, options = {}) {
        const updated = store()?.update?.(record.id, draft);
        if (options?.notify !== false) {
          window.WefranchToast?.show({ message: `${updated?.name || draft?.name} saved as a draft.` });
        }
        render();
        return updated;
      },
      onComplete(draft) {
        const updated = store()?.update?.(record.id, draft);
        const name = updated?.name || draft?.name || "Campaign";
        const scheduled = (updated?.status || draft?.status) === "scheduled";
        window.WefranchToast?.show({
          message: scheduled ? `${name} scheduled.` : `${name} is sending.`
        });
        render();
      }
    });
  }

  sidebar?.addEventListener("click", (event) => {
    const button = event.target.closest(".campaign-sidebar__edit");
    if (!button) return;
    openEditor(button.dataset.editStep, button, { message: "editMessage" in button.dataset });
  });

  /* Sidebar toggle. The choice is remembered; without one, narrow windows
     start with the sidebar hidden so the table keeps its room. */

  function storedSidebarOpen() {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY);
      if (stored) return stored === "open";
    } catch (error) {
      /* Storage unavailable: fall through to the default. */
    }
    return window.innerWidth >= 1100;
  }

  function setSidebarOpen(open, { persist = true } = {}) {
    content?.classList.toggle("is-sidebar-collapsed", !open);
    if (sidebar) sidebar.inert = !open;
    if (sidebarToggle) {
      const label = open ? "Hide details" : "Show details";
      sidebarToggle.setAttribute("aria-expanded", String(open));
      sidebarToggle.setAttribute("aria-label", label);
      sidebarToggle.title = label;
    }
    if (!persist) return;
    try {
      window.localStorage.setItem(SIDEBAR_KEY, open ? "open" : "closed");
    } catch (error) {
      /* Storage unavailable: the choice lasts until reload. */
    }
  }

  sidebarToggle?.addEventListener("click", () => {
    setSidebarOpen(content?.classList.contains("is-sidebar-collapsed"));
  });

  sidebarClose?.addEventListener("click", () => {
    setSidebarOpen(false);
    sidebarToggle?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || !floatingSidebar.matches) return;
    if (content?.classList.contains("is-sidebar-collapsed")) return;
    if (window.WefranchCampaignWizard?.isVisible?.()) return;
    event.preventDefault();
    setSidebarOpen(false);
    sidebarToggle?.focus();
  });

  /* The table header pins right below the sticky toolbar. Its height also
     insets the empty-state overlay so the message centers under the columns. */
  function syncToolbarHeight() {
    if (!main) return;
    if (toolbar) main.style.setProperty("--recipient-toolbar-height", `${toolbar.offsetHeight}px`);
    const head = table?.tHead;
    if (head) main.style.setProperty("--recipient-thead-height", `${head.offsetHeight}px`);
  }

  if ("ResizeObserver" in window) {
    const stickyObserver = new ResizeObserver(syncToolbarHeight);
    if (toolbar) stickyObserver.observe(toolbar);
    if (table?.tHead) stickyObserver.observe(table.tHead);
  }

  window.addEventListener("wefranch:campaigns-change", () => render());
  window.setInterval(() => render(), 1000);

  setSidebarOpen(storedSidebarOpen(), { persist: false });
  render({ force: true });
  syncToolbarHeight();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => content?.classList.add("is-sidebar-animated"));
  });
  if (recipientsApi.SEGMENTS.includes(window.location.hash.replace("#", ""))) {
    segmentsEl?.scrollIntoView({ block: "nearest" });
  }
})();
