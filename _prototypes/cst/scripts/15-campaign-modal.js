const START_CAMPAIGN_AUDIENCE_CURRENT = "current";
const START_CAMPAIGN_RECIPIENT_LIMIT = 1000;
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
const CAMPAIGN_REVIEW_DELAY_MS = 2000;
const CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT = "philip@litassy.com";
const DEFAULT_CAMPAIGN_NAME = "Untitled campaign";
const CAMPAIGN_NAME_MAX_LENGTH = 64;
const CAMPAIGN_FIELD_ERRORS = {
  senderEmail: "Select an email address",
  senderDomain: "Your domain isn't authenticated for sending.",
  senderName: "Enter a sender name",
  recipients: "Select at least one audience",
  subject: "Enter a subject line",
  designTemplate: "Select a design template"
};
const CAMPAIGN_STEPS = [
  { id: "sender", title: "Sender" },
  { id: "recipients", title: "Recipients" },
  { id: "subject", title: "Subject" },
  { id: "design", title: "Design" }
];

function getCampaignFieldWrapper(element) {
  return element?.closest?.(".proto-modal-field") || null;
}

function setCampaignFieldError(fieldElement, message) {
  const field = getCampaignFieldWrapper(fieldElement);
  if (!field) return;

  field.classList.add("is-error");

  let messageEl = field.querySelector(".proto-modal-field-message");
  if (!messageEl) {
    messageEl = document.createElement("p");
    messageEl.className = "proto-modal-field-message is-error";
    messageEl.setAttribute("role", "alert");
    field.appendChild(messageEl);
  }

  messageEl.textContent = message;
}

function clearCampaignFieldError(fieldElement) {
  const field = getCampaignFieldWrapper(fieldElement);
  if (!field) return;

  field.classList.remove("is-error");
  field.querySelector(".proto-modal-field-message")?.remove();
  syncCampaignStepErrorChrome();
}

function clearAllCampaignFieldErrors() {
  campaignWizardModal?.querySelectorAll(".proto-modal-field.is-error").forEach((field) => {
    field.classList.remove("is-error");
    field.querySelector(".proto-modal-field-message")?.remove();
  });
}

function getCampaignStepErrors(stepIndex) {
  const errors = [];

  switch (stepIndex) {
    case 0: {
      const emailAddress = getCampaignSenderEmailAddress();
      const hasValidEmail = Boolean(emailAddress && CAMPAIGN_SENDERS[emailAddress]);
      if (!hasValidEmail) {
        errors.push({
          stepIndex: 0,
          field: campaignSenderEmailField,
          message: CAMPAIGN_FIELD_ERRORS.senderEmail
        });
      } else if (!isCampaignSenderEmailAuthorized(emailAddress)) {
        errors.push({
          stepIndex: 0,
          field: campaignSenderEmailField,
          message: CAMPAIGN_FIELD_ERRORS.senderDomain
        });
      }

      const hasName = Boolean(String(campaignSenderName?.value || "").trim());
      if (!hasName) {
        errors.push({
          stepIndex: 0,
          field: campaignSenderName,
          message: CAMPAIGN_FIELD_ERRORS.senderName
        });
      }
      break;
    }
    case 1: {
      if (!getSelectedAudienceValues().length) {
        errors.push({
          stepIndex: 1,
          field: startCampaignAudienceField,
          message: CAMPAIGN_FIELD_ERRORS.recipients
        });
      }
      break;
    }
    case 2: {
      if (!String(campaignSubjectLine?.value || "").trim()) {
        errors.push({
          stepIndex: 2,
          field: campaignSubjectLine,
          message: CAMPAIGN_FIELD_ERRORS.subject
        });
      }
      break;
    }
    case 3: {
      if (!getCampaignDesignSelection()) {
        errors.push({
          stepIndex: 3,
          field: campaignDesignTemplateField,
          message: CAMPAIGN_FIELD_ERRORS.designTemplate
        });
      }
      break;
    }
    default:
      break;
  }

  return errors;
}

function getCampaignWizardErrors() {
  const errors = [];
  for (let stepIndex = 0; stepIndex < CAMPAIGN_STEPS.length; stepIndex += 1) {
    errors.push(...getCampaignStepErrors(stepIndex));
  }
  return errors;
}

function showCampaignValidationErrors(errors) {
  campaignReviewValidated = true;
  clearAllCampaignFieldErrors();
  errors.forEach((error) => setCampaignFieldError(error.field, error.message));
  syncCampaignStepErrorChrome();
  syncCampaignStepHeight();
}

function focusCampaignFieldControl(fieldElement) {
  if (!fieldElement) return;

  if (typeof fieldElement.focus === "function" && fieldElement.matches?.("input, textarea")) {
    fieldElement.focus({ preventScroll: true });
    return;
  }

  const control = fieldElement.querySelector?.("input:not(.filter-combobox-input), textarea");
  control?.focus?.({ preventScroll: true });
}

function syncCampaignStepErrorChrome() {
  CAMPAIGN_STEPS.forEach((step, index) => {
    const tab = campaignStepTabs?.querySelector(`[data-campaign-step="${step.id}"]`);
    if (!tab) return;
    tab.classList.toggle(
      "is-error",
      Boolean(campaignReviewValidated && getCampaignStepErrors(index).length)
    );
  });
}

function syncCampaignStepPostNavigation({ focusTab = false } = {}) {
  if (campaignReviewValidated) {
    const error = getCampaignStepErrors(activeCampaignStepIndex)[0];
    if (error) {
      focusCampaignFieldControl(error.field);
      return;
    }
  }

  syncCampaignSubjectStepFocus({ focusTab });
}

const campaignSenderModalForm = document.getElementById("campaignSenderModalForm");
const campaignSenderEmailField = document.getElementById("campaignSenderEmailField");
const campaignSenderEmailSelect = document.getElementById("campaignSenderEmailSelect");
const campaignSenderName = document.getElementById("campaignSenderName");
const campaignSenderContinue = document.getElementById("campaignSenderContinue");
const campaignSenderAuthDivider = document.getElementById("campaignSenderAuthDivider");
const campaignSenderAuthNotice = document.getElementById("campaignSenderAuthNotice");
const startCampaignModal = document.getElementById("startCampaignModal");
const startCampaignModalTitle = document.getElementById("startCampaignModalTitle");
const campaignWizardModal = startCampaignModal?.querySelector(".campaign-wizard-modal");
const campaignNameInput = document.getElementById("campaignNameInput");
const campaignRenameBtn = document.getElementById("campaignRenameBtn");
const campaignRenameConfirm = document.getElementById("campaignRenameConfirm");
const campaignNameCount = document.getElementById("campaignNameCount");
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
const reviewCampaignModal = document.getElementById("reviewCampaignModal");
const reviewCampaignModalForm = document.getElementById("reviewCampaignModalForm");
const campaignReviewName = document.getElementById("campaignReviewName");
const campaignReviewNameRow = campaignReviewName?.closest(".campaign-review-name");
const campaignReviewNameInput = document.getElementById("campaignReviewNameInput");
const campaignReviewRenameBtn = document.getElementById("campaignReviewRenameBtn");
const campaignReviewRenameConfirm = document.getElementById("campaignReviewRenameConfirm");
const campaignReviewNameCount = document.getElementById("campaignReviewNameCount");
const campaignReviewSubject = document.getElementById("campaignReviewSubject");
const campaignReviewDesign = document.getElementById("campaignReviewDesign");
const campaignReviewRecipients = document.getElementById("campaignReviewRecipients");
const campaignReviewTestEmail = document.getElementById("campaignReviewTestEmail");
const campaignReviewSendTest = document.getElementById("campaignReviewSendTest");
const campaignReviewSendLabel = campaignReviewSendTest?.querySelector(".campaign-review-send-label");
const campaignReviewSchedule = document.getElementById("campaignReviewSchedule");
const campaignReviewScheduleBtn = document.getElementById("campaignReviewScheduleBtn");
const campaignReviewScheduleMenu = document.getElementById("campaignReviewScheduleMenu");

let campaignSenderEmailApi = null;
let campaignSenderDraft = null;
let campaignName = DEFAULT_CAMPAIGN_NAME;
let campaignNameBeforeRename = DEFAULT_CAMPAIGN_NAME;
let startCampaignAudienceApi = null;
let startCampaignDraft = null;
let campaignDesignTemplateApi = null;
let activeCampaignStepIndex = 0;
let campaignStepTransitionTimeoutId = null;
let campaignStepAnimating = false;
let pendingCampaignStepIndex = null;
let measuringCampaignStepHeight = false;
let campaignReviewPending = false;
let campaignReviewValidated = false;
let campaignReviewTimeoutId = null;
let campaignReviewDraft = null;
let pendingCampaignReviewOpen = false;
let campaignReviewTestTimeoutId = null;
let campaignReviewNameBeforeRename = DEFAULT_CAMPAIGN_NAME;

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

function getAuthorizedCampaignSenderEmails() {
  return Object.keys(CAMPAIGN_SENDERS).filter(
    (emailAddress) => !CAMPAIGN_UNAUTHENTICATED_SENDERS.has(emailAddress)
  );
}

function getDefaultCampaignSenderEmail() {
  return getAuthorizedCampaignSenderEmails()[0] || "";
}

function isCampaignSenderEmailAuthorized(emailAddress) {
  const address = String(emailAddress || "").trim();
  return Boolean(address)
    && CAMPAIGN_SENDERS[address]
    && !CAMPAIGN_UNAUTHENTICATED_SENDERS.has(address);
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

  if (!isCampaignSenderEmailAuthorized(emailAddress) || !name) return null;
  return { emailAddress, name };
}

function syncCampaignSenderContinue() {
  if (!campaignSenderContinue) return;
  campaignSenderContinue.disabled = false;
}

function resetCampaignSenderModal() {
  closeCampaignSenderDropdown();
  const defaultEmail = getDefaultCampaignSenderEmail();
  campaignSenderEmailApi?.reset(defaultEmail);
  if (campaignSenderName) {
    campaignSenderName.value = CAMPAIGN_SENDERS[defaultEmail] || "";
  }
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
  startCampaignAudienceApi?.reset(START_CAMPAIGN_AUDIENCE_CURRENT);
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

const CAMPAIGN_SUBJECT_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "subject");

function focusCampaignSubjectLineIfEmpty() {
  if (!campaignSubjectLine || String(campaignSubjectLine.value || "").trim()) return;

  window.requestAnimationFrame(() => {
    campaignSubjectLine.focus({ preventScroll: true });
  });
}

function syncCampaignSubjectStepFocus({ focusTab = false } = {}) {
  if (!startCampaignModalApi.isOpen()) return;

  if (
    activeCampaignStepIndex === CAMPAIGN_SUBJECT_STEP_INDEX
    && !String(campaignSubjectLine?.value || "").trim()
  ) {
    focusCampaignSubjectLineIfEmpty();
    return;
  }

  if (focusTab) focusCampaignStepTab();
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
  campaignDesignContinue.disabled = false;
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

function clampCampaignName(value) {
  return String(value || "").slice(0, CAMPAIGN_NAME_MAX_LENGTH);
}

function normalizeCampaignName(value) {
  const name = clampCampaignName(value).trim();
  return name || DEFAULT_CAMPAIGN_NAME;
}

function isUntitledCampaignName(value) {
  const trimmed = clampCampaignName(value).trim();
  return !trimmed || trimmed === DEFAULT_CAMPAIGN_NAME;
}

function formatCampaignNameCount(length) {
  return `(${length} / ${CAMPAIGN_NAME_MAX_LENGTH})`;
}

function syncCampaignNameCount() {
  if (!campaignNameCount) return;

  const length = clampCampaignName(campaignNameInput?.value).length;
  campaignNameCount.textContent = formatCampaignNameCount(length);
}

function isCampaignRenaming() {
  return Boolean(campaignWizardModal?.classList.contains("is-renaming"));
}

function setCampaignRenaming(isRenaming) {
  campaignWizardModal?.classList.toggle("is-renaming", isRenaming);
  if (startCampaignModalTitle) startCampaignModalTitle.hidden = isRenaming;
  if (campaignNameInput) campaignNameInput.hidden = !isRenaming;
  if (campaignRenameBtn) campaignRenameBtn.hidden = isRenaming;
  if (campaignRenameConfirm) campaignRenameConfirm.hidden = !isRenaming;
  if (campaignNameCount) campaignNameCount.hidden = !isRenaming;
  if (isRenaming) syncCampaignNameCount();
}

function syncCampaignNameChrome() {
  if (startCampaignModalTitle) startCampaignModalTitle.textContent = campaignName;
  if (campaignNameInput) campaignNameInput.value = clampCampaignName(campaignName);
}

function startCampaignRename() {
  campaignNameBeforeRename = campaignName;
  if (campaignNameInput) campaignNameInput.value = clampCampaignName(campaignName);
  setCampaignRenaming(true);
  window.requestAnimationFrame(() => {
    campaignNameInput?.focus({ preventScroll: true });
    campaignNameInput?.select();
  });
}

function commitCampaignRename() {
  if (!isCampaignRenaming()) return;

  campaignName = normalizeCampaignName(campaignNameInput?.value);
  syncCampaignNameChrome();
  setCampaignRenaming(false);

  if (window.cstCampaignDraft) {
    window.cstCampaignDraft.campaignName = campaignName;
  }

  campaignRenameBtn?.focus({ preventScroll: true });
}

function cancelCampaignRename() {
  if (!isCampaignRenaming()) return;

  campaignName = campaignNameBeforeRename;
  syncCampaignNameChrome();
  setCampaignRenaming(false);
  campaignRenameBtn?.focus({ preventScroll: true });
}

function resetCampaignName() {
  campaignName = DEFAULT_CAMPAIGN_NAME;
  campaignNameBeforeRename = DEFAULT_CAMPAIGN_NAME;
  syncCampaignNameChrome();
  setCampaignRenaming(false);
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

function setCampaignStepImmediate(index, { syncHeight = false, focusTab = false } = {}) {
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
  syncCampaignStepPostNavigation({ focusTab });
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

  syncCampaignStepPostNavigation({ focusTab });

  const queuedIndex = pendingCampaignStepIndex;
  pendingCampaignStepIndex = null;
  if (queuedIndex !== null && queuedIndex !== activeCampaignStepIndex) {
    goToCampaignStep(queuedIndex);
  }
}

function goToCampaignStep(index, { focusTab = false } = {}) {
  if (campaignReviewPending) return;
  if (!Number.isInteger(index) || index < 0 || index >= CAMPAIGN_STEPS.length) return;
  if (index === activeCampaignStepIndex) return;

  if (campaignStepAnimating) {
    pendingCampaignStepIndex = index;
    return;
  }

  if (isCampaignRenaming()) commitCampaignRename();
  closeCampaignDropdowns();

  const outgoingIndex = activeCampaignStepIndex;
  const outgoingPanel = getCampaignStepPanel(outgoingIndex);
  const incomingPanel = getCampaignStepPanel(index);
  if (!outgoingPanel || !incomingPanel) return;

  if (document.body.classList.contains("reduce-motion")) {
    setCampaignStepImmediate(index, { syncHeight: true, focusTab });
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
  cancelCampaignReviewPending();
  campaignReviewValidated = false;
  closeCampaignDropdowns();
  clearAllCampaignFieldErrors();
  syncCampaignStepErrorChrome();
  resetCampaignName();
  setCampaignStepImmediate(0);
  resetCampaignSenderModal();
  resetStartCampaignModal();
  resetCampaignSubjectModal();
  resetCampaignDesignModal();
  campaignSenderDraft = null;
  startCampaignDraft = null;
}

function setCampaignReviewLoading(isLoading) {
  campaignReviewPending = isLoading;
  campaignDesignContinue?.classList.toggle("is-loading", isLoading);
  if (campaignDesignContinue) {
    campaignDesignContinue.disabled = isLoading;
    campaignDesignContinue.setAttribute("aria-busy", String(isLoading));
    const label = campaignDesignContinue.querySelector(".campaign-continue-label");
    if (label) label.textContent = isLoading ? "Reviewing" : "Review";
  }
}

function cancelCampaignReviewPending() {
  if (campaignReviewTimeoutId) {
    window.clearTimeout(campaignReviewTimeoutId);
    campaignReviewTimeoutId = null;
  }
  setCampaignReviewLoading(false);
}

function formatCampaignReviewRecipients(count) {
  const value = Math.max(0, Math.round(Number(count) || 0));
  return value.toLocaleString("en-US");
}

function collectCampaignReviewDraft() {
  const audience = buildCampaignAudiencePreview(getSelectedAudienceValues());
  const subject = getCampaignSubjectSelection();
  const design = getCampaignDesignSelection();

  return {
    campaignName,
    contactCount: audience?.contactCount || 0,
    subjectLine: subject?.subjectLine || "",
    designTitle: design?.title || ""
  };
}

function syncCampaignReviewNameCount() {
  if (!campaignReviewNameCount) return;

  const length = clampCampaignName(campaignReviewNameInput?.value).length;
  campaignReviewNameCount.textContent = formatCampaignNameCount(length);
}

function syncCampaignReviewNameChrome(name = campaignReviewDraft?.campaignName || campaignName) {
  const displayName = normalizeCampaignName(name);
  const untitled = isUntitledCampaignName(name);

  if (campaignReviewName) {
    campaignReviewName.textContent = displayName;
    campaignReviewName.classList.toggle("is-untitled", untitled);
  }
}

function renderCampaignReviewModal() {
  const draft = campaignReviewDraft || collectCampaignReviewDraft();
  const name = draft.campaignName || DEFAULT_CAMPAIGN_NAME;

  syncCampaignReviewNameChrome(name);
  if (campaignReviewNameInput) {
    campaignReviewNameInput.value = isUntitledCampaignName(name) ? "" : clampCampaignName(name);
  }
  if (campaignReviewSubject) campaignReviewSubject.textContent = draft.subjectLine || "";
  if (campaignReviewDesign) campaignReviewDesign.textContent = draft.designTitle || "";
  if (campaignReviewRecipients) {
    campaignReviewRecipients.textContent = formatCampaignReviewRecipients(draft.contactCount);
  }
  if (campaignReviewTestEmail) campaignReviewTestEmail.value = CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT;
  setCampaignReviewRenaming(false);
  resetCampaignReviewTestSend();
}

function isCampaignReviewRenaming() {
  return Boolean(campaignReviewNameRow?.classList.contains("is-renaming"));
}

function setCampaignReviewRenaming(isRenaming) {
  campaignReviewNameRow?.classList.toggle("is-renaming", isRenaming);
  if (campaignReviewName) campaignReviewName.hidden = isRenaming;
  if (campaignReviewNameInput) campaignReviewNameInput.hidden = !isRenaming;
  if (campaignReviewRenameBtn) campaignReviewRenameBtn.hidden = isRenaming;
  if (campaignReviewRenameConfirm) campaignReviewRenameConfirm.hidden = !isRenaming;
  if (campaignReviewNameCount) campaignReviewNameCount.hidden = !isRenaming;
  if (isRenaming) syncCampaignReviewNameCount();
}

function startCampaignReviewRename() {
  const currentName = campaignReviewDraft?.campaignName || campaignName;
  campaignReviewNameBeforeRename = currentName;
  if (campaignReviewNameInput) {
    campaignReviewNameInput.value = isUntitledCampaignName(currentName)
      ? ""
      : clampCampaignName(currentName);
  }
  setCampaignReviewRenaming(true);
  window.requestAnimationFrame(() => {
    campaignReviewNameInput?.focus({ preventScroll: true });
    campaignReviewNameInput?.select();
  });
}

function commitCampaignReviewRename() {
  if (!isCampaignReviewRenaming()) return;

  const nextName = normalizeCampaignName(campaignReviewNameInput?.value);
  campaignName = nextName;
  if (campaignReviewDraft) campaignReviewDraft.campaignName = nextName;
  if (window.cstCampaignDraft) window.cstCampaignDraft.campaignName = nextName;
  syncCampaignReviewNameChrome(nextName);
  if (campaignReviewNameInput) {
    campaignReviewNameInput.value = isUntitledCampaignName(nextName) ? "" : clampCampaignName(nextName);
  }
  syncCampaignNameChrome();
  setCampaignReviewRenaming(false);
  campaignReviewRenameBtn?.focus({ preventScroll: true });
}

function cancelCampaignReviewRename() {
  if (!isCampaignReviewRenaming()) return;

  if (campaignReviewNameInput) {
    campaignReviewNameInput.value = clampCampaignName(campaignReviewNameBeforeRename);
  }
  setCampaignReviewRenaming(false);
  campaignReviewRenameBtn?.focus({ preventScroll: true });
}

function resetCampaignReviewTestSend() {
  if (campaignReviewTestTimeoutId) {
    window.clearTimeout(campaignReviewTestTimeoutId);
    campaignReviewTestTimeoutId = null;
  }
  if (campaignReviewSendLabel) campaignReviewSendLabel.textContent = "Send";
  if (campaignReviewSendTest) campaignReviewSendTest.disabled = false;
  if (campaignReviewTestEmail) clearCampaignReviewTestError();
}

function resetReviewCampaignModal() {
  cancelCampaignReviewRename();
  closeCampaignReviewScheduleMenu();
  resetCampaignReviewTestSend();
  if (campaignReviewTestEmail) campaignReviewTestEmail.value = CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT;
}

function isCampaignReviewScheduleMenuOpen() {
  return Boolean(campaignReviewSchedule?.classList.contains("is-open"));
}

function setCampaignReviewScheduleMenuOpen(isOpen) {
  campaignReviewSchedule?.classList.toggle("is-open", isOpen);
  if (campaignReviewScheduleBtn) {
    campaignReviewScheduleBtn.setAttribute("aria-expanded", String(isOpen));
  }
  if (campaignReviewScheduleMenu) {
    campaignReviewScheduleMenu.setAttribute("aria-hidden", String(!isOpen));
  }
}

function closeCampaignReviewScheduleMenu() {
  if (!isCampaignReviewScheduleMenuOpen()) return;
  setCampaignReviewScheduleMenuOpen(false);
}

function toggleCampaignReviewScheduleMenu() {
  setCampaignReviewScheduleMenuOpen(!isCampaignReviewScheduleMenuOpen());
}

function handleCampaignReviewScheduleAction(_action) {
  closeCampaignReviewScheduleMenu();
  closeReviewCampaignModal();
}

function getCampaignReviewTestField() {
  return campaignReviewTestEmail?.closest(".proto-modal-field") || null;
}

function clearCampaignReviewTestError() {
  const field = getCampaignReviewTestField();
  if (!field) return;
  field.classList.remove("is-error");
  field.querySelector(".proto-modal-field-message")?.remove();
}

function setCampaignReviewTestError(message) {
  const field = getCampaignReviewTestField();
  if (!field) return;

  field.classList.add("is-error");
  let messageEl = field.querySelector(".proto-modal-field-message");
  if (!messageEl) {
    messageEl = document.createElement("p");
    messageEl.className = "proto-modal-field-message is-error";
    messageEl.setAttribute("role", "alert");
    field.appendChild(messageEl);
  }
  messageEl.textContent = message;
}

function isValidCampaignTestEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function sendCampaignReviewTestEmail() {
  if (!campaignReviewSendTest || campaignReviewSendTest.disabled) return;

  const emailAddress = String(campaignReviewTestEmail?.value || "").trim();
  if (!isValidCampaignTestEmail(emailAddress)) {
    setCampaignReviewTestError("Enter a valid email address");
    campaignReviewTestEmail?.focus({ preventScroll: true });
    return;
  }

  clearCampaignReviewTestError();
  campaignReviewSendTest.disabled = true;
  if (campaignReviewSendLabel) campaignReviewSendLabel.textContent = "Sending";

  campaignReviewTestTimeoutId = window.setTimeout(() => {
    if (campaignReviewSendLabel) campaignReviewSendLabel.textContent = "Sent";
    campaignReviewTestTimeoutId = window.setTimeout(() => {
      campaignReviewTestTimeoutId = null;
      if (campaignReviewSendLabel) campaignReviewSendLabel.textContent = "Send";
      if (campaignReviewSendTest) campaignReviewSendTest.disabled = false;
    }, 1400);
  }, 800);
}

function openCampaignReviewFromWizard() {
  const sender = getCampaignSenderSelection();
  const audience = buildCampaignAudiencePreview(getSelectedAudienceValues());
  const subject = getCampaignSubjectSelection();
  const design = getCampaignDesignSelection();
  if (!sender || !audience || !subject || !design) return;

  campaignSenderDraft = sender;
  window.cstCampaignSender = { ...sender };
  window.cstCampaignDraft = {
    ...audience,
    campaignName,
    sender,
    ...subject,
    design
  };
  campaignReviewDraft = collectCampaignReviewDraft();
  pendingCampaignReviewOpen = true;
  closeStartCampaignModal();
}

function revealCampaignWizardErrors(errors) {
  showCampaignValidationErrors(errors);

  const firstStepIndex = errors.reduce(
    (lowest, error) => Math.min(lowest, error.stepIndex),
    CAMPAIGN_STEPS.length
  );

  if (!Number.isInteger(firstStepIndex) || firstStepIndex >= CAMPAIGN_STEPS.length) return;

  if (firstStepIndex === activeCampaignStepIndex) {
    syncCampaignStepPostNavigation();
    return;
  }

  goToCampaignStep(firstStepIndex);
}

const startCampaignModalApi = window.createProtoModal({
  overlay: startCampaignModal,
  disableHeightAnimation: true,
  closeSelectors: ".proto-modal-close",
  onBeforeClose() {
    closeCampaignDropdowns();
  },
  onClose() {
    const shouldOpenReview = pendingCampaignReviewOpen;
    pendingCampaignReviewOpen = false;
    resetCampaignWizard();
    if (shouldOpenReview) reviewCampaignModalApi.open();
  },
  shouldCloseOnEscape() {
    if (isCampaignRenaming()) {
      cancelCampaignRename();
      return false;
    }
    return !closeOpenCampaignDropdown();
  },
  getFocusElement() {
    return startCampaignModal?.querySelector(".proto-modal-close");
  },
  onOpened() {
    syncCampaignStepHeight({ immediate: true });
  }
});

const reviewCampaignModalApi = window.createProtoModal({
  overlay: reviewCampaignModal,
  closeSelectors: ".proto-modal-close",
  onOpen() {
    renderCampaignReviewModal();
  },
  onClose() {
    resetReviewCampaignModal();
    campaignReviewDraft = null;
  },
  shouldCloseOnEscape() {
    if (isCampaignReviewRenaming()) {
      cancelCampaignReviewRename();
      return false;
    }
    if (isCampaignReviewScheduleMenuOpen()) {
      closeCampaignReviewScheduleMenu();
      return false;
    }
    return true;
  },
  getFocusElement() {
    return reviewCampaignModal?.querySelector(".proto-modal-close");
  }
});

function closeStartCampaignModal() {
  startCampaignModalApi.close();
}

function closeReviewCampaignModal() {
  reviewCampaignModalApi.close();
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
      icon: "../../assets/icons/add.svg",
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
  clearCampaignFieldError(startCampaignAudienceField);
  syncStartCampaignAudienceState();
});

campaignSenderEmailSelect?.addEventListener("change", () => {
  clearCampaignFieldError(campaignSenderEmailField);
  syncCampaignSenderName();
});
campaignSenderName?.addEventListener("input", () => {
  clearCampaignFieldError(campaignSenderName);
  syncCampaignSenderContinue();
});
campaignSubjectLine?.addEventListener("input", () => {
  clearCampaignFieldError(campaignSubjectLine);
  syncCampaignSubjectContinue();
});
campaignPreviewText?.addEventListener("input", syncCampaignSubjectContinue);

campaignDesignTemplateApi = window.WefranchFilterCombobox.enhance(campaignDesignTemplateSelect, {
  singleSelect: true,
  clearable: true,
  searchable: false,
  menuActions: [
    {
      label: "Create from scratch",
      icon: "../../assets/icons/add.svg",
      onClick() {}
    }
  ]
});

campaignDesignTemplateSelect?.addEventListener("change", () => {
  clearCampaignFieldError(campaignDesignTemplateField);
  syncCampaignDesignContinue();
});

startCampaignOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openStartCampaignModal(startCampaignOption);
});

startCampaignModalTitle?.addEventListener("click", () => {
  startCampaignRename();
});

startCampaignModalTitle?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  startCampaignRename();
});

campaignRenameBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  startCampaignRename();
});

campaignRenameConfirm?.addEventListener("click", (event) => {
  event.preventDefault();
  commitCampaignRename();
});

campaignNameInput?.addEventListener("input", syncCampaignNameCount);

campaignNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    commitCampaignRename();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    cancelCampaignRename();
  }
});

campaignStepTabs?.addEventListener("click", (event) => {
  const tab = event.target.closest(".campaign-step-tab");
  if (!tab || campaignReviewPending) return;

  const stepIndex = CAMPAIGN_STEPS.findIndex((step) => step.id === tab.dataset.campaignStep);
  goToCampaignStep(stepIndex);
});

startCampaignModal?.addEventListener("click", (event) => {
  const backButton = event.target.closest(".campaign-step-back");
  if (!backButton) return;

  event.preventDefault();
  if (campaignReviewPending) return;
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
      campaignName,
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
      campaignName,
      sender: campaignSenderDraft ? { ...campaignSenderDraft } : window.cstCampaignDraft?.sender || null,
      ...subject
    };
  }
  goToCampaignStep(3, { focusTab: true });
});

campaignDesignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (campaignReviewPending) return;

  setCampaignReviewLoading(true);
  campaignReviewTimeoutId = window.setTimeout(() => {
    campaignReviewTimeoutId = null;
    setCampaignReviewLoading(false);

    const validationErrors = getCampaignWizardErrors();
    if (validationErrors.length) {
      revealCampaignWizardErrors(validationErrors);
      return;
    }

    openCampaignReviewFromWizard();
  }, CAMPAIGN_REVIEW_DELAY_MS);
});

campaignReviewName?.addEventListener("click", () => {
  startCampaignReviewRename();
});

campaignReviewName?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  startCampaignReviewRename();
});

campaignReviewRenameBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  startCampaignReviewRename();
});

campaignReviewRenameConfirm?.addEventListener("click", (event) => {
  event.preventDefault();
  commitCampaignReviewRename();
});

campaignReviewNameInput?.addEventListener("input", syncCampaignReviewNameCount);

campaignReviewNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    commitCampaignReviewRename();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    cancelCampaignReviewRename();
  }
});

campaignReviewTestEmail?.addEventListener("input", clearCampaignReviewTestError);

campaignReviewTestEmail?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  sendCampaignReviewTestEmail();
});

campaignReviewSendTest?.addEventListener("click", (event) => {
  event.preventDefault();
  sendCampaignReviewTestEmail();
});

campaignReviewScheduleBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleCampaignReviewScheduleMenu();
});

campaignReviewScheduleMenu?.addEventListener("click", (event) => {
  const option = event.target.closest(".campaign-review-schedule-option");
  if (!option) return;

  event.preventDefault();
  handleCampaignReviewScheduleAction(option.dataset.scheduleAction);
});

document.addEventListener("mousedown", (event) => {
  if (!isCampaignReviewScheduleMenuOpen()) return;
  if (campaignReviewSchedule?.contains(event.target)) return;
  closeCampaignReviewScheduleMenu();
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

window.cstReviewCampaignModal = {
  close: closeReviewCampaignModal,
  isVisible: () => reviewCampaignModalApi.isVisible(),
  open: () => reviewCampaignModalApi.open()
};
