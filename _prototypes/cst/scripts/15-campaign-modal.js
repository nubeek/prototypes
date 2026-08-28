const START_CAMPAIGN_AUDIENCE_CURRENT = "current";
const START_CAMPAIGN_RECIPIENT_LIMIT = 500;
const CAMPAIGN_SENDERS = {
  "philip.litassy@wefanch.com": "Philip Litassy",
  "gregory.ugwi@wefranch.com": "Gregory Ugwi",
  "philiplitassy@gmail.com": "Philip Litassy"
};
const CAMPAIGN_UNAUTHENTICATED_SENDERS = new Set([
  "philiplitassy@gmail.com"
]);
const CAMPAIGN_DESIGN_TEMPLATES = {
  introduction: "Introduction",
  "territory-opportunity": "Territory opportunity",
  "market-update": "Market update",
  "follow-up": "Follow-up",
  "event-invitation": "Event invitation"
};
const CAMPAIGN_DESIGN_PREVIEW_TEMPLATE_ID = "introduction";
const CAMPAIGN_STEP_TRANSITION_MS = 340;
const CAMPAIGN_STEPS = [
  { id: "sender", title: "Sender" },
  { id: "recipients", title: "Recipients" },
  { id: "subject", title: "Subject" },
  { id: "design", title: "Design" }
];

const campaignSenderModalForm = document.getElementById("campaignSenderModalForm");
const campaignSenderEmailField = document.getElementById("campaignSenderEmailField");
const campaignSenderEmailSelect = document.getElementById("campaignSenderEmailSelect");
const campaignSenderName = document.getElementById("campaignSenderName");
const campaignSenderContinue = document.getElementById("campaignSenderContinue");
const campaignSenderAuthDivider = document.getElementById("campaignSenderAuthDivider");
const campaignSenderAuthNotice = document.getElementById("campaignSenderAuthNotice");
const startCampaignModal = document.getElementById("startCampaignModal");
const startCampaignModalTitle = document.getElementById("startCampaignModalTitle");
const startCampaignModalForm = document.getElementById("startCampaignModalForm");
const startCampaignOption = document.getElementById("startCampaignOption");
const campaignStepTabs = document.getElementById("campaignStepTabs");
const campaignStepViewport = document.getElementById("campaignStepViewport");
const campaignStepPanels = Array.from(document.querySelectorAll(".campaign-step-panel"));
const startCampaignAudienceField = document.getElementById("startCampaignAudienceField");
const startCampaignAudienceSelect = document.getElementById("startCampaignAudienceSelect");
const startCampaignPreview = document.getElementById("startCampaignPreview");
const startCampaignRecipientCount = document.getElementById("startCampaignRecipientCount");
const startCampaignRemainingCount = document.getElementById("startCampaignRemainingCount");
const startCampaignProgress = document.getElementById("startCampaignProgress");
const startCampaignProgressFill = document.getElementById("startCampaignProgressFill");
const startCampaignProgressOver = document.getElementById("startCampaignProgressOver");
const startCampaignContinue = document.getElementById("startCampaignContinue");
const campaignSubjectModalForm = document.getElementById("campaignSubjectModalForm");
const campaignSubjectLine = document.getElementById("campaignSubjectLine");
const campaignPreviewText = document.getElementById("campaignPreviewText");
const campaignSubjectContinue = document.getElementById("campaignSubjectContinue");
const campaignDesignModalForm = document.getElementById("campaignDesignModalForm");
const campaignDesignTemplateField = document.getElementById("campaignDesignTemplateField");
const campaignDesignTemplateSelect = document.getElementById("campaignDesignTemplateSelect");
const campaignDesignContinue = document.getElementById("campaignDesignContinue");
const campaignDesignPreview = document.getElementById("campaignDesignPreview");
const campaignDesignPreviewEmpty = document.getElementById("campaignDesignPreviewEmpty");
const campaignDesignPreviewContent = document.getElementById("campaignDesignPreviewContent");
const campaignDesignPreviewImage = document.getElementById("campaignDesignPreviewImage");
const campaignDesignPreviewUnavailable = document.getElementById("campaignDesignPreviewUnavailable");

let campaignSenderEmailApi = null;
let campaignSenderDraft = null;
let startCampaignAudienceApi = null;
let startCampaignDraft = null;
let campaignDesignTemplateApi = null;
let activeCampaignStepIndex = 0;
let campaignStepTransitionTimeoutId = null;
let campaignStepAnimating = false;
let pendingCampaignStepIndex = null;
let measuringCampaignStepHeight = false;

function closeCampaignSenderDropdown() {
  campaignSenderEmailApi?.close();
}

function isCampaignSenderDropdownOpen() {
  return Boolean(campaignSenderEmailField?.classList.contains("is-open"));
}

function getCampaignSenderEmailAddress() {
  return campaignSenderEmailApi?.getValue()
    || window.WefranchFilterCombobox.getValue(campaignSenderEmailSelect);
}

function syncCampaignSenderAuthNotice() {
  const emailAddress = String(getCampaignSenderEmailAddress() || "").trim();
  const showNotice = CAMPAIGN_UNAUTHENTICATED_SENDERS.has(emailAddress);

  if (campaignSenderAuthDivider) {
    campaignSenderAuthDivider.hidden = !showNotice;
    campaignSenderAuthDivider.setAttribute("aria-hidden", String(!showNotice));
  }

  if (campaignSenderAuthNotice) campaignSenderAuthNotice.hidden = !showNotice;
}

function syncCampaignSenderName() {
  syncCampaignSenderAuthNotice();

  if (!campaignSenderName) {
    syncCampaignSenderContinue();
    return;
  }

  const emailAddress = getCampaignSenderEmailAddress();
  campaignSenderName.value = CAMPAIGN_SENDERS[emailAddress] || "";
  syncCampaignSenderContinue();
}

function getCampaignSenderSelection() {
  const emailAddress = getCampaignSenderEmailAddress();
  const name = String(campaignSenderName?.value || "").trim();

  if (!CAMPAIGN_SENDERS[emailAddress] || !name) return null;
  return { emailAddress, name };
}

function syncCampaignSenderContinue() {
  if (!campaignSenderContinue) return;
  campaignSenderContinue.disabled = false;
}

function resetCampaignSenderModal() {
  closeCampaignSenderDropdown();
  campaignSenderEmailApi?.reset("");
  if (campaignSenderName) campaignSenderName.value = "";
  syncCampaignSenderAuthNotice();
  syncCampaignSenderContinue();
}

function closeStartCampaignDropdowns() {
  startCampaignAudienceApi?.close();
}

function isStartCampaignDropdownOpen() {
  return Boolean(startCampaignAudienceField?.classList.contains("is-open"));
}

function formatStartCampaignCount(count, singular, plural) {
  const value = Number(count) || 0;
  return `${value.toLocaleString("en-US")} ${value === 1 ? singular : plural}`;
}

function formatStartCampaignRemainingLabel(recipientCount) {
  const overCount = Math.max(recipientCount - START_CAMPAIGN_RECIPIENT_LIMIT, 0);
  if (overCount > 0) {
    return `-${formatStartCampaignCount(overCount, "email", "emails")} over limit`;
  }

  return formatStartCampaignCount(
    Math.max(START_CAMPAIGN_RECIPIENT_LIMIT - recipientCount, 0),
    "remaining email",
    "remaining emails"
  );
}

function setStartCampaignProgressWidths(withinRatio, overRatio) {
  if (startCampaignProgressFill) {
    startCampaignProgressFill.style.width = `${Math.max(withinRatio, 0) * 100}%`;
  }
  if (startCampaignProgressOver) {
    startCampaignProgressOver.style.width = `${Math.max(overRatio, 0) * 100}%`;
  }
}

function getCurrentSearchAudience() {
  const savedTitle = readerModeActive ? readerModeSavedSearchTitle : null;
  const title = String(
    savedTitle
    || getSuggestedSavedViewTitle?.()
    || getSavedViewEntityTitle?.()
    || "Current search"
  ).trim();
  const matchedOwners = typeof getFilteredFranchisees === "function"
    ? getFilteredFranchisees()
    : [];
  const contactCount = matchedOwners.reduce((total, owner) => (
    total + (typeof getOwnerContactCount === "function" ? getOwnerContactCount(owner) : 0)
  ), 0);

  return {
    audience: START_CAMPAIGN_AUDIENCE_CURRENT,
    savedSearchId: activeSavedSearchId || null,
    title,
    contactCount
  };
}

function getUserSavedSearches() {
  const searches = window.cstSplash?.getSavedSearches?.()
    || (Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : []);
  const userSearches = [];
  const sharedSearches = [];

  searches.forEach((search) => {
    if (window.cstSavedSearchStore?.canEdit?.(search.id)) {
      userSearches.push(search);
    } else {
      sharedSearches.push(search);
    }
  });

  return [...userSearches, ...sharedSearches];
}

function getCurrentSearchOptionLabel() {
  const { contactCount } = getCurrentSearchAudience();
  return `Current search (${contactCount.toLocaleString("en-US")})`;
}

function getStartCampaignAudienceOptions() {
  const savedSearchOptions = getUserSavedSearches().map((search) => {
    const matches = window.cstSplash?.getMatchCounts?.(search) || {};
    const contactCount = Number.isFinite(matches.contactCount) ? matches.contactCount : 0;

    return {
      label: `${search.title} (${contactCount.toLocaleString("en-US")})`,
      value: search.id
    };
  });

  return [
    {
      label: getCurrentSearchOptionLabel(),
      value: START_CAMPAIGN_AUDIENCE_CURRENT
    },
    ...(savedSearchOptions.length ? [{ divider: true }, ...savedSearchOptions] : [])
  ];
}

function syncStartCampaignAudienceOptions() {
  if (!startCampaignAudienceSelect) return;

  const options = getStartCampaignAudienceOptions();

  if (startCampaignAudienceApi) {
    startCampaignAudienceApi.setOptions(options, {
      placeholder: "Select query, group or individual contacts"
    });
    return;
  }

  window.WefranchFilterCombobox.setOptions(startCampaignAudienceSelect, options, {
    placeholder: "Select query, group or individual contacts"
  });
}

function getSelectedAudienceValues() {
  return window.WefranchFilterCombobox.getValues(startCampaignAudienceSelect);
}

function getSavedSearchAudience(searchIds) {
  const ids = [...new Set(
    (Array.isArray(searchIds) ? searchIds : [searchIds]).filter(Boolean)
  )];
  const savedSearches = ids.map((searchId) => (
    getSavedSearchById?.(searchId)
    || getUserSavedSearches().find((search) => search.id === searchId)
    || null
  )).filter(Boolean);
  if (!savedSearches.length) return null;

  const selections = savedSearches.map((savedSearch) => {
    const matches = window.cstSplash?.getMatchCounts?.(savedSearch) || {};
    return {
      id: savedSearch.id,
      title: savedSearch.title,
      contactCount: Number.isFinite(matches.contactCount) ? matches.contactCount : 0
    };
  });

  return {
    savedSearchId: selections[0].id,
    savedSearchIds: selections.map((selection) => selection.id),
    title: selections.map((selection) => selection.title).join(", "),
    titles: selections.map((selection) => selection.title),
    contactCount: selections.reduce((total, selection) => total + selection.contactCount, 0)
  };
}

function buildCampaignAudiencePreview(selectedValues) {
  if (!selectedValues.length) return null;

  let contactCount = 0;
  const titles = [];
  const savedSearchIds = [];
  let includesCurrent = false;

  selectedValues.forEach((value) => {
    if (value === START_CAMPAIGN_AUDIENCE_CURRENT) {
      const currentSearch = getCurrentSearchAudience();
      includesCurrent = true;
      contactCount += currentSearch.contactCount;
      titles.push("Current search");
      return;
    }

    const savedSearch = getSavedSearchAudience([value]);
    if (!savedSearch) return;

    contactCount += savedSearch.contactCount;
    titles.push(savedSearch.titles[0]);
    savedSearchIds.push(value);
  });

  if (!titles.length) return null;

  return {
    audience: includesCurrent
      ? (savedSearchIds.length ? "mixed" : START_CAMPAIGN_AUDIENCE_CURRENT)
      : "saved",
    savedSearchId: savedSearchIds[0] || null,
    savedSearchIds,
    includesCurrent,
    title: titles.join(", "),
    titles,
    contactCount
  };
}

function resetStartCampaignPreview() {
  startCampaignPreview?.removeAttribute("hidden");
  if (startCampaignRecipientCount) startCampaignRecipientCount.textContent = "0 recipients";
  if (startCampaignRemainingCount) {
    startCampaignRemainingCount.textContent = formatStartCampaignRemainingLabel(0);
    startCampaignRemainingCount.classList.remove("is-over-limit");
  }
  if (startCampaignProgress) {
    startCampaignProgress.classList.remove("is-over-limit");
    startCampaignProgress.setAttribute("aria-valuenow", "0");
    startCampaignProgress.setAttribute(
      "aria-valuetext",
      `0 recipients, ${formatStartCampaignRemainingLabel(0)}`
    );
  }
  setStartCampaignProgressWidths(0, 0);
}

function renderStartCampaignPreview(preview) {
  if (!preview) {
    resetStartCampaignPreview();
    return;
  }

  const recipientCount = Math.max(0, Math.round(Number(preview.contactCount) || 0));
  const overCount = Math.max(recipientCount - START_CAMPAIGN_RECIPIENT_LIMIT, 0);
  const isOverLimit = overCount > 0;
  const remainingLabel = formatStartCampaignRemainingLabel(recipientCount);
  const scale = isOverLimit ? recipientCount : START_CAMPAIGN_RECIPIENT_LIMIT;
  const withinRatio = scale ? Math.min(recipientCount, START_CAMPAIGN_RECIPIENT_LIMIT) / scale : 0;
  const overRatio = scale ? overCount / scale : 0;

  if (startCampaignRecipientCount) {
    startCampaignRecipientCount.textContent = formatStartCampaignCount(
      recipientCount,
      "recipient",
      "recipients"
    );
  }
  if (startCampaignRemainingCount) {
    startCampaignRemainingCount.textContent = remainingLabel;
    startCampaignRemainingCount.classList.toggle("is-over-limit", isOverLimit);
  }
  if (startCampaignProgress) {
    startCampaignProgress.classList.toggle("is-over-limit", isOverLimit);
    startCampaignProgress.setAttribute("aria-valuenow", String(recipientCount));
    startCampaignProgress.setAttribute("aria-valuetext", `${recipientCount} recipients, ${remainingLabel}`);
  }
  setStartCampaignProgressWidths(withinRatio, overRatio);
  startCampaignPreview?.removeAttribute("hidden");
}

function syncStartCampaignContinue() {
  if (!startCampaignContinue) return;
  startCampaignContinue.disabled = false;
}

function syncStartCampaignAudienceState() {
  syncStartCampaignAudienceOptions();

  const selectedValues = getSelectedAudienceValues();
  const preview = buildCampaignAudiencePreview(selectedValues);

  startCampaignDraft = preview;
  renderStartCampaignPreview(preview);
  syncStartCampaignContinue();
}

function resetStartCampaignModal() {
  closeStartCampaignDropdowns();
  syncStartCampaignAudienceOptions();
  startCampaignAudienceApi?.reset("");
  startCampaignDraft = null;
  syncStartCampaignAudienceState();
}

function getCampaignSubjectSelection() {
  const subjectLine = String(campaignSubjectLine?.value || "").trim();
  const previewText = String(campaignPreviewText?.value || "").trim();

  if (!subjectLine) return null;
  return { subjectLine, previewText };
}

function syncCampaignSubjectContinue() {
  if (!campaignSubjectContinue) return;
  campaignSubjectContinue.disabled = false;
}

function resetCampaignSubjectModal() {
  if (campaignSubjectLine) campaignSubjectLine.value = "";
  if (campaignPreviewText) campaignPreviewText.value = "";
  syncCampaignSubjectContinue();
}

function closeCampaignDesignDropdown() {
  campaignDesignTemplateApi?.close();
}

function isCampaignDesignDropdownOpen() {
  return Boolean(campaignDesignTemplateField?.classList.contains("is-open"));
}

function getCampaignDesignTemplateId() {
  return campaignDesignTemplateApi?.getValue()
    || window.WefranchFilterCombobox.getValue(campaignDesignTemplateSelect);
}

function getCampaignDesignSelection() {
  const templateId = String(getCampaignDesignTemplateId() || "").trim();
  const title = CAMPAIGN_DESIGN_TEMPLATES[templateId];

  if (!title) return null;
  return { templateId, title };
}

function syncCampaignDesignContinue() {
  if (!campaignDesignContinue) return;
  campaignDesignContinue.disabled = !getCampaignDesignSelection();
  syncCampaignDesignPreview();
}

function syncCampaignDesignPreview() {
  const selection = getCampaignDesignSelection();
  const hasTemplate = Boolean(selection);
  const showIntroductionPreview = selection?.templateId === CAMPAIGN_DESIGN_PREVIEW_TEMPLATE_ID;

  campaignDesignPreview?.classList.toggle("is-empty", !hasTemplate);
  campaignDesignPreview?.classList.toggle("has-preview-image", showIntroductionPreview);
  campaignDesignPreview?.classList.toggle("has-preview-unavailable", hasTemplate && !showIntroductionPreview);

  if (campaignDesignPreviewEmpty) {
    campaignDesignPreviewEmpty.hidden = hasTemplate;
  }

  if (campaignDesignPreviewContent) {
    campaignDesignPreviewContent.hidden = !hasTemplate;
  }

  if (campaignDesignPreviewImage) {
    campaignDesignPreviewImage.hidden = !showIntroductionPreview;
  }

  if (campaignDesignPreviewUnavailable) {
    campaignDesignPreviewUnavailable.hidden = !hasTemplate || showIntroductionPreview;
  }

  if (hasTemplate && campaignDesignPreview) {
    campaignDesignPreview.scrollTop = 0;
  }
}

function resetCampaignDesignModal() {
  closeCampaignDesignDropdown();
  campaignDesignTemplateApi?.reset("");
  syncCampaignDesignContinue();
}

function closeCampaignDropdowns() {
  closeCampaignSenderDropdown();
  closeStartCampaignDropdowns();
  closeCampaignDesignDropdown();
}

function closeOpenCampaignDropdown() {
  if (isCampaignSenderDropdownOpen()) {
    closeCampaignSenderDropdown();
    return true;
  }
  if (isStartCampaignDropdownOpen()) {
    closeStartCampaignDropdowns();
    return true;
  }
  if (isCampaignDesignDropdownOpen()) {
    closeCampaignDesignDropdown();
    return true;
  }
  return false;
}

function getCampaignStepPanel(index) {
  const step = CAMPAIGN_STEPS[index];
  if (!step) return null;
  return campaignStepPanels.find((panel) => panel.dataset.campaignStep === step.id) || null;
}

function getCampaignStepNaturalHeight(panel) {
  if (!panel) return 0;

  measuringCampaignStepHeight = true;

  const previousHeight = panel.style.height;
  const previousMinHeight = panel.style.minHeight;
  const previousMaxHeight = panel.style.maxHeight;
  const previousOverflow = panel.style.overflow;

  panel.style.height = "auto";
  panel.style.minHeight = "0";
  panel.style.maxHeight = "none";
  panel.style.overflow = "visible";

  const height = Math.max(
    Math.ceil(panel.getBoundingClientRect().height),
    Math.ceil(panel.scrollHeight)
  );

  panel.style.height = previousHeight;
  panel.style.minHeight = previousMinHeight;
  panel.style.maxHeight = previousMaxHeight;
  panel.style.overflow = previousOverflow;

  measuringCampaignStepHeight = false;
  return height;
}

function updateCampaignStepChrome(index) {
  const activeStep = CAMPAIGN_STEPS[index];
  if (!activeStep) return;

  if (startCampaignModalTitle) startCampaignModalTitle.textContent = activeStep.title;

  campaignStepTabs?.querySelectorAll(".campaign-step-tab").forEach((tab) => {
    const isActive = tab.dataset.campaignStep === activeStep.id;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function syncCampaignStepHeight({ immediate = false } = {}) {
  if (!campaignStepViewport || !startCampaignModalApi?.isVisible()) return;
  if (measuringCampaignStepHeight) return;

  const activePanel = getCampaignStepPanel(activeCampaignStepIndex);
  if (!activePanel) return;

  const nextHeight = getCampaignStepNaturalHeight(activePanel);
  const currentHeight = Math.round(campaignStepViewport.getBoundingClientRect().height);
  if (!immediate && Math.abs(currentHeight - nextHeight) < 1) return;

  if (immediate) campaignStepViewport.style.transition = "none";
  campaignStepViewport.style.height = `${nextHeight}px`;

  if (immediate) {
    campaignStepViewport.offsetHeight;
    campaignStepViewport.style.transition = "";
  }
}

function setCampaignStepPanelState(panel, isActive) {
  if (!panel) return;

  panel.classList.toggle("is-active", isActive);
  panel.classList.remove("is-entering", "is-leaving");
  panel.style.transform = "";
  panel.style.transition = "";
  panel.inert = !isActive;

  if (isActive) {
    panel.removeAttribute("aria-hidden");
  } else {
    panel.setAttribute("aria-hidden", "true");
  }
}

function setCampaignStepImmediate(index, { syncHeight = false } = {}) {
  const nextIndex = Math.max(0, Math.min(index, CAMPAIGN_STEPS.length - 1));

  if (campaignStepTransitionTimeoutId) {
    window.clearTimeout(campaignStepTransitionTimeoutId);
    campaignStepTransitionTimeoutId = null;
  }

  campaignStepAnimating = false;
  pendingCampaignStepIndex = null;
  activeCampaignStepIndex = nextIndex;
  campaignStepPanels.forEach((panel) => {
    setCampaignStepPanelState(panel, panel === getCampaignStepPanel(nextIndex));
  });
  updateCampaignStepChrome(nextIndex);

  if (campaignStepViewport && !syncHeight) campaignStepViewport.style.height = "";
  if (syncHeight) syncCampaignStepHeight({ immediate: true });
}

function focusCampaignStepTab() {
  const step = CAMPAIGN_STEPS[activeCampaignStepIndex];
  const activeTab = step
    ? campaignStepTabs?.querySelector(`[data-campaign-step="${step.id}"]`)
    : null;
  activeTab?.focus?.({ preventScroll: true });
}

function finishCampaignStepTransition(incomingPanel, outgoingPanel, focusTab) {
  setCampaignStepPanelState(outgoingPanel, false);
  setCampaignStepPanelState(incomingPanel, true);
  campaignStepAnimating = false;
  campaignStepTransitionTimeoutId = null;
  syncCampaignStepHeight();

  if (focusTab && startCampaignModalApi.isOpen()) {
    focusCampaignStepTab();
  }

  const queuedIndex = pendingCampaignStepIndex;
  pendingCampaignStepIndex = null;
  if (queuedIndex !== null && queuedIndex !== activeCampaignStepIndex) {
    goToCampaignStep(queuedIndex);
  }
}

function goToCampaignStep(index, { focusTab = false } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= CAMPAIGN_STEPS.length) return;
  if (index === activeCampaignStepIndex) return;

  if (campaignStepAnimating) {
    pendingCampaignStepIndex = index;
    return;
  }

  closeCampaignDropdowns();

  const outgoingIndex = activeCampaignStepIndex;
  const outgoingPanel = getCampaignStepPanel(outgoingIndex);
  const incomingPanel = getCampaignStepPanel(index);
  if (!outgoingPanel || !incomingPanel) return;

  if (document.body.classList.contains("reduce-motion")) {
    setCampaignStepImmediate(index, { syncHeight: true });
    if (focusTab) focusCampaignStepTab();
    return;
  }

  const direction = index > outgoingIndex ? 1 : -1;
  const nextHeight = getCampaignStepNaturalHeight(incomingPanel);

  campaignStepAnimating = true;
  activeCampaignStepIndex = index;
  updateCampaignStepChrome(index);

  outgoingPanel.classList.remove("is-active", "is-entering");
  outgoingPanel.classList.add("is-leaving");
  outgoingPanel.setAttribute("aria-hidden", "true");
  outgoingPanel.inert = true;

  incomingPanel.classList.remove("is-active", "is-leaving");
  incomingPanel.classList.add("is-entering");
  incomingPanel.removeAttribute("aria-hidden");
  incomingPanel.inert = false;

  outgoingPanel.style.transition = "none";
  incomingPanel.style.transition = "none";
  outgoingPanel.style.transform = "translateX(0)";
  incomingPanel.style.transform = `translateX(${direction * 100}%)`;
  outgoingPanel.offsetWidth;
  incomingPanel.offsetWidth;
  outgoingPanel.style.transition = "";
  incomingPanel.style.transition = "";

  window.requestAnimationFrame(() => {
    if (!campaignStepAnimating || !startCampaignModalApi.isVisible()) return;
    outgoingPanel.style.transform = `translateX(${-direction * 100}%)`;
    incomingPanel.style.transform = "translateX(0)";
    if (campaignStepViewport) campaignStepViewport.style.height = `${nextHeight}px`;
  });

  campaignStepTransitionTimeoutId = window.setTimeout(() => {
    finishCampaignStepTransition(incomingPanel, outgoingPanel, focusTab);
  }, CAMPAIGN_STEP_TRANSITION_MS);
}

function resetCampaignWizard() {
  closeCampaignDropdowns();
  setCampaignStepImmediate(0);
  resetCampaignSenderModal();
  resetStartCampaignModal();
  resetCampaignSubjectModal();
  resetCampaignDesignModal();
  campaignSenderDraft = null;
  startCampaignDraft = null;
}

const startCampaignModalApi = window.createProtoModal({
  overlay: startCampaignModal,
  disableHeightAnimation: true,
  closeSelectors: ".proto-modal-close",
  onBeforeClose() {
    closeCampaignDropdowns();
  },
  onClose() {
    resetCampaignWizard();
  },
  shouldCloseOnEscape() {
    return !closeOpenCampaignDropdown();
  },
  getFocusElement() {
    return startCampaignModal?.querySelector(".proto-modal-close");
  },
  onOpened() {
    syncCampaignStepHeight({ immediate: true });
  }
});

function closeStartCampaignModal() {
  startCampaignModalApi.close();
}

function openStartCampaignModal(trigger = null) {
  if (!startCampaignModal) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");
  campaignSenderDraft = null;
  window.cstCampaignSender = null;
  window.cstCampaignDraft = null;
  resetCampaignWizard();
  startCampaignModalApi.open(trigger);
}

if (typeof ResizeObserver === "function") {
  const campaignStepResizeObserver = new ResizeObserver(() => {
    if (measuringCampaignStepHeight || campaignStepAnimating) return;
    syncCampaignStepHeight();
  });
  campaignStepPanels.forEach((panel) => {
    const body = panel.querySelector(".proto-modal-body");
    if (!body) {
      campaignStepResizeObserver.observe(panel);
      return;
    }
    Array.from(body.children).forEach((child) => campaignStepResizeObserver.observe(child));
  });
}

campaignSenderEmailApi = window.WefranchFilterCombobox.enhance(campaignSenderEmailSelect, {
  singleSelect: true,
  clearable: true,
  searchable: false,
  menuActions: [
    {
      label: "Add new sender",
      icon: "assets/add.svg",
      onClick() {}
    }
  ]
});

syncStartCampaignAudienceOptions();

startCampaignAudienceApi = window.WefranchFilterCombobox.enhance(startCampaignAudienceSelect, {
  singleSelect: false,
  clearable: true,
  searchable: true
});

startCampaignAudienceSelect?.addEventListener("change", () => {
  syncStartCampaignAudienceState();
});

campaignSenderEmailSelect?.addEventListener("change", syncCampaignSenderName);
campaignSenderName?.addEventListener("input", syncCampaignSenderContinue);
campaignSubjectLine?.addEventListener("input", syncCampaignSubjectContinue);
campaignPreviewText?.addEventListener("input", syncCampaignSubjectContinue);

campaignDesignTemplateApi = window.WefranchFilterCombobox.enhance(campaignDesignTemplateSelect, {
  singleSelect: true,
  clearable: true,
  searchable: false,
  menuActions: [
    {
      label: "Create from scratch",
      icon: "assets/add.svg",
      onClick() {}
    }
  ]
});

campaignDesignTemplateSelect?.addEventListener("change", syncCampaignDesignContinue);

startCampaignOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openStartCampaignModal(startCampaignOption);
});

campaignStepTabs?.addEventListener("click", (event) => {
  const tab = event.target.closest(".campaign-step-tab");
  if (!tab) return;

  const stepIndex = CAMPAIGN_STEPS.findIndex((step) => step.id === tab.dataset.campaignStep);
  goToCampaignStep(stepIndex);
});

startCampaignModal?.addEventListener("click", (event) => {
  const backButton = event.target.closest(".campaign-step-back");
  if (!backButton) return;

  event.preventDefault();
  goToCampaignStep(activeCampaignStepIndex - 1);
});

campaignSenderModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const sender = getCampaignSenderSelection();
  if (sender) {
    campaignSenderDraft = sender;
    window.cstCampaignSender = { ...sender };
  }
  goToCampaignStep(1, { focusTab: true });
});

startCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const draft = buildCampaignAudiencePreview(getSelectedAudienceValues());
  if (draft) {
    window.cstCampaignDraft = {
      ...draft,
      sender: campaignSenderDraft ? { ...campaignSenderDraft } : null
    };
  }
  goToCampaignStep(2, { focusTab: true });
});

campaignSubjectModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const subject = getCampaignSubjectSelection();
  if (subject) {
    window.cstCampaignDraft = {
      ...(window.cstCampaignDraft || {}),
      sender: campaignSenderDraft ? { ...campaignSenderDraft } : window.cstCampaignDraft?.sender || null,
      ...subject
    };
  }
  goToCampaignStep(3, { focusTab: true });
});

campaignDesignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (campaignDesignContinue?.disabled) return;

  const design = getCampaignDesignSelection();
  if (!design) return;

  window.cstCampaignDraft = {
    ...(window.cstCampaignDraft || {}),
    sender: campaignSenderDraft ? { ...campaignSenderDraft } : window.cstCampaignDraft?.sender || null,
    design
  };
  closeStartCampaignModal();
});

window.addEventListener("cst:saved-searches-changed", () => {
  if (!startCampaignModalApi.isVisible()) return;
  syncStartCampaignAudienceState();
});

window.cstStartCampaignModal = {
  close: closeStartCampaignModal,
  isVisible: () => startCampaignModalApi.isVisible(),
  open: openStartCampaignModal
};
