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
const CAMPAIGN_STEP_TRANSITION_MS = 380;
const CAMPAIGN_WIZARD_MIN_HEIGHT = 580;
const CAMPAIGN_REVIEW_DELAY_MS = 2000;
const CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT = "philip@litassy.com";
const DEFAULT_CAMPAIGN_NAME = "Untitled campaign";
const CAMPAIGN_NAME_MAX_LENGTH = 64;
const CAMPAIGN_FIELD_ERRORS = {
  senderEmail: "Choose a sender email",
  senderDomain: "Authenticate your sending domain",
  senderName: "Enter a sender name",
  recipients: "Choose an audience",
  subject: "Enter a subject",
  designTemplate: "Choose a design template"
};
const CAMPAIGN_STEPS = [
  { id: "campaign", title: "Campaign", level: "settings" },
  { id: "sender", title: "Sender", level: "settings" },
  { id: "recipients", title: "Recipients", level: "settings" },
  { id: "subject", title: "Subject", level: "campaign" },
  { id: "design", title: "Design", level: "campaign" },
  { id: "review", title: "Review", level: "review" },
  { id: "schedule", title: "Schedule", level: "review" }
];
const CAMPAIGN_LEVEL_ORDER = ["settings", "campaign", "review"];
const CAMPAIGN_TYPE_DEFAULT = "regular";
const CAMPAIGN_SEQUENCE_DEFAULT_DELAY = 2;
const CAMPAIGN_SEQUENCE_DELAYS = [
  { value: 0, label: "Immediately" },
  { value: 1, label: "1 day later" },
  { value: 2, label: "2 days later" },
  { value: 3, label: "3 days later" },
  { value: 5, label: "5 days later" },
  { value: 7, label: "7 days later" },
  { value: 14, label: "14 days later" },
  { value: 30, label: "30 days later" }
];
const CAMPAIGN_SETTINGS_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "campaign");
const CAMPAIGN_SENDER_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "sender");
const CAMPAIGN_RECIPIENTS_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "recipients");
const CAMPAIGN_SUBJECT_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "subject");
const CAMPAIGN_DESIGN_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "design");
const CAMPAIGN_REVIEW_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "review");
const CAMPAIGN_SCHEDULE_STEP_INDEX = CAMPAIGN_STEPS.findIndex((step) => step.id === "schedule");
const CAMPAIGN_REVIEW_SCHEDULE_LABELS = {
  "send-now": "Send now",
  "schedule-later": "Schedule",
  "send-batches": "Send now"
};
const CAMPAIGN_REVIEW_SCHEDULE_DEFAULT = "send-now";

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
  const stepId = CAMPAIGN_STEPS[stepIndex]?.id;

  switch (stepId) {
    case "sender": {
      const emailAddress = getCampaignSenderEmailAddress();
      const hasValidEmail = Boolean(emailAddress && CAMPAIGN_SENDERS[emailAddress]);
      if (!hasValidEmail) {
        errors.push({
          stepIndex,
          field: campaignSenderEmailField,
          message: CAMPAIGN_FIELD_ERRORS.senderEmail
        });
      } else if (!isCampaignSenderEmailAuthorized(emailAddress)) {
        errors.push({
          stepIndex,
          field: campaignSenderEmailField,
          message: CAMPAIGN_FIELD_ERRORS.senderDomain
        });
      }

      const hasName = Boolean(String(campaignSenderName?.value || "").trim());
      if (!hasName) {
        errors.push({
          stepIndex,
          field: campaignSenderName,
          message: CAMPAIGN_FIELD_ERRORS.senderName
        });
      }
      break;
    }
    case "recipients": {
      if (!getSelectedAudienceValues().length) {
        errors.push({
          stepIndex,
          field: startCampaignAudienceField,
          message: CAMPAIGN_FIELD_ERRORS.recipients
        });
      }
      break;
    }
    case "subject": {
      if (!String(campaignSubjectLine?.value || "").trim()) {
        errors.push({
          stepIndex,
          field: campaignSubjectLine,
          message: CAMPAIGN_FIELD_ERRORS.subject
        });
      }
      break;
    }
    case "design": {
      if (!getCampaignDesignSelection()) {
        errors.push({
          stepIndex,
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

function getCampaignErrorsBeforeLevel(level) {
  const targetOrder = CAMPAIGN_LEVEL_ORDER.indexOf(level);
  const errors = [];
  CAMPAIGN_STEPS.forEach((step, stepIndex) => {
    const stepOrder = CAMPAIGN_LEVEL_ORDER.indexOf(step.level);
    if (stepOrder < 0 || stepOrder >= targetOrder) return;
    errors.push(...getCampaignStepErrors(stepIndex));
  });
  return errors;
}

function getCampaignWizardErrors() {
  const errors = getCampaignErrorsBeforeLevel("review");
  if (!isDripCampaign()) return errors;

  const nonEmailErrors = errors.filter((error) => {
    const stepId = CAMPAIGN_STEPS[error.stepIndex]?.id;
    return stepId !== "subject" && stepId !== "design";
  });

  return [...nonEmailErrors, ...getCampaignSequenceValidationErrors()];
}

function showCampaignValidationErrors(errors) {
  campaignReviewValidated = true;
  clearAllCampaignFieldErrors();
  errors.forEach((error) => setCampaignFieldError(error.field, error.message));
  syncCampaignStepErrorChrome();
  if (isDripCampaign()) renderSequenceList();
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

function getCampaignStepTab(stepId) {
  return campaignWizardModal?.querySelector(`.campaign-step-tab[data-campaign-step="${stepId}"]`) || null;
}

function syncCampaignStepErrorChrome() {
  CAMPAIGN_STEPS.forEach((step, index) => {
    const tab = getCampaignStepTab(step.id);
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

  if (!startCampaignModalApi.isOpen()) return;

  if (activeCampaignStepIndex === CAMPAIGN_SETTINGS_STEP_INDEX) {
    focusCampaignSettingsName();
    return;
  }

  syncCampaignSubjectStepFocus({ focusTab });
}

function focusCampaignSettingsName() {
  if (!campaignSettingsName) return;

  window.requestAnimationFrame(() => {
    campaignSettingsName.focus({ preventScroll: true });
  });
}

const campaignSenderModalForm = document.getElementById("campaignSenderModalForm");
const campaignSenderEmailField = document.getElementById("campaignSenderEmailField");
const campaignSenderEmailSelect = document.getElementById("campaignSenderEmailSelect");
const campaignSenderName = document.getElementById("campaignSenderName");
const campaignSenderAuthDivider = document.getElementById("campaignSenderAuthDivider");
const campaignSenderAuthNotice = document.getElementById("campaignSenderAuthNotice");
const startCampaignModal = document.getElementById("startCampaignModal");
const campaignWizardModal = startCampaignModal?.querySelector(".campaign-wizard-modal");
const campaignTitleGroup = document.getElementById("campaignTitleGroup");
const settingsTitleGroup = document.getElementById("settingsTitleGroup");
const reviewTitleGroup = document.getElementById("reviewTitleGroup");
const campaignStepLevel = document.getElementById("campaignStepLevel");
const campaignReviewChrome = document.getElementById("campaignReviewChrome");
const startCampaignModalForm = document.getElementById("startCampaignModalForm");
const startCampaignOption = document.getElementById("startCampaignOption");
const campaignSettingsStepTabs = document.getElementById("campaignSettingsStepTabs");
const campaignStepTabs = document.getElementById("campaignStepTabs");
const campaignReviewStepTabs = document.getElementById("campaignReviewStepTabs");
const campaignSettingsModalForm = document.getElementById("campaignSettingsModalForm");
const campaignTypeOptions = document.getElementById("campaignTypeOptions");
const campaignSettingsName = document.getElementById("campaignSettingsName");
const campaignStepBody = document.getElementById("campaignStepBody");
const campaignStepViewport = document.getElementById("campaignStepViewport");
const campaignStepPanels = Array.from(campaignStepViewport?.querySelectorAll(".campaign-step-panel") || []);
const campaignSequencePanel = document.getElementById("campaignSequencePanel");
const campaignSequenceTitle = document.getElementById("campaignSequenceTitle");
const campaignSequenceList = document.getElementById("campaignSequenceList");
const campaignSequenceAddBtn = document.getElementById("campaignSequenceAddBtn");
const campaignReviewSequenceField = document.getElementById("campaignReviewSequenceField");
const campaignReviewSequence = document.getElementById("campaignReviewSequence");
const campaignStepBack = document.getElementById("campaignStepBack");
const campaignStepContinue = document.getElementById("campaignStepContinue");
const campaignStepContinueLabel = campaignStepContinue?.querySelector(".campaign-continue-label");
const startCampaignAudienceField = document.getElementById("startCampaignAudienceField");
const startCampaignAudienceSelect = document.getElementById("startCampaignAudienceSelect");
const startCampaignPreview = document.getElementById("startCampaignPreview");
const startCampaignRecipientCount = document.getElementById("startCampaignRecipientCount");
const startCampaignRemainingCount = document.getElementById("startCampaignRemainingCount");
const startCampaignProgress = document.getElementById("startCampaignProgress");
const startCampaignProgressFill = document.getElementById("startCampaignProgressFill");
const startCampaignProgressOver = document.getElementById("startCampaignProgressOver");
const campaignSubjectModalForm = document.getElementById("campaignSubjectModalForm");
const campaignSubjectLine = document.getElementById("campaignSubjectLine");
const campaignPreviewText = document.getElementById("campaignPreviewText");
const campaignDesignModalForm = document.getElementById("campaignDesignModalForm");
const campaignDesignTemplateField = document.getElementById("campaignDesignTemplateField");
const campaignDesignTemplateSelect = document.getElementById("campaignDesignTemplateSelect");
const campaignDesignPreview = document.getElementById("campaignDesignPreview");
const campaignDesignPreviewEmpty = document.getElementById("campaignDesignPreviewEmpty");
const campaignDesignPreviewContent = document.getElementById("campaignDesignPreviewContent");
const campaignDesignPreviewImage = document.getElementById("campaignDesignPreviewImage");
const campaignDesignPreviewUnavailable = document.getElementById("campaignDesignPreviewUnavailable");
const reviewCampaignModalForm = document.getElementById("reviewCampaignModalForm");
const scheduleCampaignModalForm = document.getElementById("scheduleCampaignModalForm");
const campaignScheduleOptions = document.getElementById("campaignScheduleOptions");

const campaignReviewName = document.getElementById("campaignReviewName");
const campaignReviewNameRow = campaignReviewName?.closest(".campaign-review-name");
const campaignReviewNameInput = document.getElementById("campaignReviewNameInput");
const campaignReviewRenameBtn = document.getElementById("campaignReviewRenameBtn");
const campaignReviewRenameConfirm = document.getElementById("campaignReviewRenameConfirm");
const campaignReviewNameCount = document.getElementById("campaignReviewNameCount");
const campaignReviewSubject = document.getElementById("campaignReviewSubject");
const campaignReviewPreview = document.getElementById("campaignReviewPreview");
const campaignReviewPreviewRow = document.getElementById("campaignReviewPreviewField");
const campaignReviewDesign = document.getElementById("campaignReviewDesign");
const campaignReviewRecipients = document.getElementById("campaignReviewRecipients");
const campaignReviewTestEmail = document.getElementById("campaignReviewTestEmail");
const campaignReviewSendTest = document.getElementById("campaignReviewSendTest");
const campaignReviewSendLabel = campaignReviewSendTest?.querySelector(".campaign-review-send-label");

let campaignSenderEmailApi = null;
let campaignSenderDraft = null;
let campaignName = DEFAULT_CAMPAIGN_NAME;
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
let campaignReviewTestTimeoutId = null;
let campaignReviewNameBeforeRename = DEFAULT_CAMPAIGN_NAME;
let lastStepByLevel = {
  settings: 0,
  campaign: CAMPAIGN_SUBJECT_STEP_INDEX,
  review: CAMPAIGN_REVIEW_STEP_INDEX
};
let campaignSequenceEmails = [];
let activeSequenceEmailIndex = 0;
let nextSequenceEmailId = 1;

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

function syncCampaignStepContinueEnabled() {
  if (!campaignStepContinue) return;
  campaignStepContinue.disabled = Boolean(campaignReviewPending);
}

function syncCampaignSenderContinue() {
  syncCampaignStepContinueEnabled();
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
  syncCampaignStepContinueEnabled();
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
  syncCampaignStepContinueEnabled();
}

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
  syncCampaignStepContinueEnabled();
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

  if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id === "design") {
    syncCampaignStepHeight();
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
  closeCampaignLevelDropdown();
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

function syncCampaignSettingsName() {
  if (!campaignSettingsName) return;
  campaignSettingsName.value = isUntitledCampaignName(campaignName)
    ? ""
    : clampCampaignName(campaignName);
}

function syncCampaignNameChrome() {
  syncCampaignSettingsName();
}

function resetCampaignName() {
  campaignName = DEFAULT_CAMPAIGN_NAME;
  syncCampaignNameChrome();
}

function closeCampaignLevelDropdown() {
  campaignStepLevel?.removeAttribute("open");
}

function closeOpenCampaignDropdown() {
  if (campaignStepLevel?.open) {
    closeCampaignLevelDropdown();
    return true;
  }
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

function getCampaignStepLevel(index = activeCampaignStepIndex) {
  return CAMPAIGN_STEPS[index]?.level || "settings";
}

function isCampaignReviewLevel(index = activeCampaignStepIndex) {
  return getCampaignStepLevel(index) === "review";
}

function getFirstCampaignStepIndex(level) {
  return CAMPAIGN_STEPS.findIndex((step) => step.level === level);
}

function rememberCampaignLevelStep(index) {
  const level = getCampaignStepLevel(index);
  if (!level) return;
  lastStepByLevel[level] = index;
}

function getCampaignLevelTitleId(level) {
  if (level === "review") return "reviewCampaignModalTitle";
  if (level === "settings") return "settingsCampaignModalTitle";
  return "startCampaignModalTitle";
}

function syncCampaignHeaderLevel(index = activeCampaignStepIndex) {
  const level = getCampaignStepLevel(index);

  campaignWizardModal?.classList.toggle("is-settings-level", level === "settings");
  campaignWizardModal?.classList.toggle("is-campaign-level", level === "campaign");
  campaignWizardModal?.classList.toggle("is-review-level", level === "review");

  if (settingsTitleGroup) settingsTitleGroup.hidden = level !== "settings";
  if (campaignTitleGroup) campaignTitleGroup.hidden = level !== "campaign";
  if (reviewTitleGroup) reviewTitleGroup.hidden = level !== "review";
  if (campaignSettingsStepTabs) campaignSettingsStepTabs.hidden = level !== "settings";
  if (campaignStepTabs) campaignStepTabs.hidden = level !== "campaign";
  if (campaignReviewStepTabs) campaignReviewStepTabs.hidden = level !== "review";
  if (campaignReviewChrome) campaignReviewChrome.hidden = level !== "review";
  syncDripSequenceChrome();

  campaignStepLevel?.querySelectorAll("[data-campaign-level]").forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.campaignLevel === level));
  });

  campaignWizardModal?.setAttribute("aria-labelledby", getCampaignLevelTitleId(level));
}

function getCampaignStepPanel(index) {
  const step = CAMPAIGN_STEPS[index];
  if (!step) return null;
  return campaignStepPanels.find((panel) => panel.dataset.campaignStep === step.id) || null;
}

function getCampaignWizardChromeHeight() {
  if (!campaignWizardModal) return 0;

  const modalStyles = getComputedStyle(campaignWizardModal);
  let chromeHeight = (parseFloat(modalStyles.paddingTop) || 0)
    + (parseFloat(modalStyles.paddingBottom) || 0);

  Array.from(campaignWizardModal.children).forEach((child) => {
    if (child === campaignStepBody || child === campaignStepViewport || child === campaignSequenceTitle) return;
    if (child.hidden || child.hasAttribute("hidden")) return;

    const styles = getComputedStyle(child);
    if (styles.display === "none" || styles.visibility === "hidden") return;

    chromeHeight += child.getBoundingClientRect().height;
    chromeHeight += (parseFloat(styles.marginTop) || 0) + (parseFloat(styles.marginBottom) || 0);
  });

  return chromeHeight;
}

function getCampaignStepViewportMinHeight() {
  return Math.max(0, CAMPAIGN_WIZARD_MIN_HEIGHT - getCampaignWizardChromeHeight());
}

function getCampaignStepViewportMaxHeight() {
  if (!campaignWizardModal) return Infinity;

  const styles = getComputedStyle(campaignWizardModal);
  const minHeight = parseFloat(styles.minHeight);
  const maxHeight = parseFloat(styles.maxHeight);
  const modalHeightLimit = Number.isFinite(maxHeight)
    ? Math.max(Number.isFinite(minHeight) ? minHeight : 0, maxHeight)
    : Infinity;

  return Number.isFinite(modalHeightLimit)
    ? Math.max(0, modalHeightLimit - getCampaignWizardChromeHeight())
    : Infinity;
}

function getCampaignStepHeightTarget() {
  if (isDripSequenceActive()) return campaignStepViewport || campaignStepBody;
  return campaignStepBody || campaignStepViewport;
}

function getCampaignStepViewportHeight(panel) {
  return Math.min(
    Math.max(
      getCampaignStepNaturalHeight(panel),
      getCampaignStepViewportMinHeight()
    ),
    getCampaignStepViewportMaxHeight()
  );
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

  // Use the content box only. scrollHeight includes absolutely positioned
  // combobox menus and inflates the Recipients step while Send to is open.
  const height = Math.ceil(panel.getBoundingClientRect().height);

  panel.style.height = previousHeight;
  panel.style.minHeight = previousMinHeight;
  panel.style.maxHeight = previousMaxHeight;
  panel.style.overflow = previousOverflow;

  measuringCampaignStepHeight = false;
  return height;
}

function getCampaignStepContinueLabel(index = activeCampaignStepIndex) {
  const stepId = CAMPAIGN_STEPS[index]?.id;

  if (stepId === "design" && campaignReviewPending) return "Reviewing";
  if (stepId === "design") return "Review";
  if (stepId === "review") return "Schedule";
  if (stepId === "schedule") {
    return CAMPAIGN_REVIEW_SCHEDULE_LABELS[getCampaignReviewScheduleValue()]
      || CAMPAIGN_REVIEW_SCHEDULE_LABELS[CAMPAIGN_REVIEW_SCHEDULE_DEFAULT];
  }

  return "Next";
}

function syncCampaignStepFooter(index = activeCampaignStepIndex) {
  const panel = getCampaignStepPanel(index);

  if (campaignStepContinue && panel?.id) {
    campaignStepContinue.setAttribute("form", panel.id);
  }

  if (campaignStepBack) {
    campaignStepBack.textContent = index <= 0 ? "Cancel" : "Back";
  }

  campaignStepContinue?.classList.toggle("is-loading", Boolean(campaignReviewPending));
  if (campaignStepContinue) {
    campaignStepContinue.disabled = Boolean(campaignReviewPending);
    campaignStepContinue.setAttribute("aria-busy", String(Boolean(campaignReviewPending)));
  }

  if (campaignStepContinueLabel) {
    campaignStepContinueLabel.textContent = getCampaignStepContinueLabel(index);
  }
}

function updateCampaignStepChrome(index) {
  const activeStep = CAMPAIGN_STEPS[index];
  if (!activeStep) return;

  campaignWizardModal?.querySelectorAll(".campaign-step-tab").forEach((tab) => {
    const isActive = tab.dataset.campaignStep === activeStep.id;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  syncCampaignHeaderLevel(index);
  if (activeStep.id === "campaign") syncCampaignSettingsName();
  syncCampaignStepFooter(index);
}

function syncCampaignStepHeight({ immediate = false } = {}) {
  const heightTarget = getCampaignStepHeightTarget();
  if (!heightTarget || !startCampaignModalApi?.isVisible()) return;
  if (measuringCampaignStepHeight) return;

  const activePanel = getCampaignStepPanel(activeCampaignStepIndex);
  if (!activePanel) return;

  const nextHeight = getCampaignStepViewportHeight(activePanel);
  const currentHeight = Math.round(heightTarget.getBoundingClientRect().height);
  if (!immediate && Math.abs(currentHeight - nextHeight) < 1) return;

  if (immediate) heightTarget.style.transition = "none";
  heightTarget.style.height = `${nextHeight}px`;

  if (isDripSequenceActive()) {
    campaignWizardModal?.style.setProperty("--campaign-step-viewport-height", `${nextHeight}px`);
  } else {
    campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");
  }

  if (immediate) {
    heightTarget.offsetHeight;
    heightTarget.style.transition = "";
  }
}

function setCampaignStepPanelState(panel, isActive) {
  if (!panel) return;

  panel.classList.toggle("is-active", isActive);
  panel.classList.remove("is-entering", "is-leaving");
  panel.style.transform = "";
  panel.style.transition = "";
  panel.style.opacity = "";
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
  rememberCampaignLevelStep(nextIndex);
  campaignStepPanels.forEach((panel) => {
    setCampaignStepPanelState(panel, panel === getCampaignStepPanel(nextIndex));
  });
  updateCampaignStepChrome(nextIndex);

  const heightTarget = getCampaignStepHeightTarget();
  if (heightTarget && !syncHeight) heightTarget.style.height = "";
  if (syncHeight) syncCampaignStepHeight({ immediate: true });
  syncCampaignStepPostNavigation({ focusTab });
}

function focusCampaignStepTab() {
  const step = CAMPAIGN_STEPS[activeCampaignStepIndex];
  const activeTab = step ? getCampaignStepTab(step.id) : null;
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

  if (isCampaignReviewRenaming()) commitCampaignReviewRename();
  if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id === "campaign") {
    commitCampaignSettingsName();
  }
  if (isDripCampaign() && CAMPAIGN_STEPS[activeCampaignStepIndex]?.level === "campaign") {
    commitActiveSequenceEmailFields();
  }
  closeCampaignDropdowns();
  closeCampaignLevelDropdown();

  const outgoingIndex = activeCampaignStepIndex;
  const outgoingPanel = getCampaignStepPanel(outgoingIndex);
  const incomingPanel = getCampaignStepPanel(index);
  if (!outgoingPanel || !incomingPanel) return;

  if (document.body.classList.contains("reduce-motion")) {
    setCampaignStepImmediate(index, { syncHeight: true, focusTab });
    return;
  }

  const direction = index > outgoingIndex ? 1 : -1;

  campaignStepAnimating = true;
  activeCampaignStepIndex = index;
  rememberCampaignLevelStep(index);
  updateCampaignStepChrome(index);

  if (isDripSequenceActive() && campaignStepViewport) {
    const lockedHeight = Math.round(campaignStepViewport.getBoundingClientRect().height)
      || getCampaignStepViewportMinHeight();
    campaignStepViewport.style.height = `${lockedHeight}px`;
    campaignWizardModal?.style.setProperty("--campaign-step-viewport-height", `${lockedHeight}px`);
    if (campaignStepBody) campaignStepBody.style.height = "";
  }

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
  outgoingPanel.style.opacity = "1";
  incomingPanel.style.opacity = "0";
  outgoingPanel.offsetWidth;
  incomingPanel.offsetWidth;
  outgoingPanel.style.transition = "";
  incomingPanel.style.transition = "";

  const nextHeight = isDripSequenceActive()
    ? getCampaignStepViewportMinHeight()
    : getCampaignStepViewportHeight(incomingPanel);

  window.requestAnimationFrame(() => {
    if (!campaignStepAnimating || !startCampaignModalApi.isVisible()) return;
    outgoingPanel.style.transform = `translateX(${-direction * 100}%)`;
    incomingPanel.style.transform = "translateX(0)";
    outgoingPanel.style.opacity = "0";
    incomingPanel.style.opacity = "1";
    const heightTarget = getCampaignStepHeightTarget();
    if (heightTarget) heightTarget.style.height = `${nextHeight}px`;
    if (isDripSequenceActive()) {
      campaignWizardModal?.style.setProperty("--campaign-step-viewport-height", `${nextHeight}px`);
    }
  });

  campaignStepTransitionTimeoutId = window.setTimeout(() => {
    finishCampaignStepTransition(incomingPanel, outgoingPanel, focusTab);
  }, CAMPAIGN_STEP_TRANSITION_MS);
}

function resetCampaignWizard() {
  cancelCampaignReviewPending();
  campaignReviewValidated = false;
  closeCampaignDropdowns();
  closeCampaignLevelDropdown();
  clearAllCampaignFieldErrors();
  syncCampaignStepErrorChrome();
  resetCampaignName();
  lastStepByLevel = {
    settings: 0,
    campaign: CAMPAIGN_SUBJECT_STEP_INDEX,
    review: CAMPAIGN_REVIEW_STEP_INDEX
  };
  setCampaignStepImmediate(0);
  resetCampaignSettingsModal();
  resetCampaignSenderModal();
  resetStartCampaignModal();
  resetCampaignSubjectModal();
  resetCampaignDesignModal();
  resetCampaignSequence();
  resetReviewCampaignModal();
  campaignSenderDraft = null;
  startCampaignDraft = null;
  campaignReviewDraft = null;
}

function setCampaignReviewLoading(isLoading) {
  campaignReviewPending = isLoading;
  syncCampaignStepFooter();
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

function formatCampaignReviewMore(primary, extraCount) {
  if (!extraCount) return primary;
  return `${primary} · +${extraCount} more`;
}

function collectCampaignReviewDraft() {
  const audience = buildCampaignAudiencePreview(getSelectedAudienceValues());

  if (isDripCampaign()) {
    commitActiveSequenceEmailFields();
    const emails = campaignSequenceEmails;
    const first = emails[0] || {};
    const extraCount = Math.max(0, emails.length - 1);
    const firstDesignTitle = CAMPAIGN_DESIGN_TEMPLATES[first.designTemplate] || "";
    const mixedDesigns = emails.some((email) => email.designTemplate !== first.designTemplate);

    return {
      campaignName,
      campaignType: "drip",
      contactCount: audience?.contactCount || 0,
      emailCount: emails.length,
      subjectLine: formatCampaignReviewMore(first.subjectLine || "", extraCount),
      previewText: extraCount ? "" : String(first.previewText || "").trim(),
      designTitle: mixedDesigns
        ? formatCampaignReviewMore(firstDesignTitle, extraCount)
        : firstDesignTitle
    };
  }

  const subject = getCampaignSubjectSelection();
  const design = getCampaignDesignSelection();

  return {
    campaignName,
    campaignType: "regular",
    contactCount: audience?.contactCount || 0,
    subjectLine: subject?.subjectLine || "",
    previewText: subject?.previewText || "",
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
  const isDripReview = draft.campaignType === "drip";
  if (campaignReviewSequenceField) campaignReviewSequenceField.hidden = !isDripReview;
  if (campaignReviewSequence) {
    const count = draft.emailCount || campaignSequenceEmails.length || 0;
    campaignReviewSequence.textContent = `${count} ${count === 1 ? "email" : "emails"}`;
  }
  if (campaignReviewSubject) campaignReviewSubject.textContent = draft.subjectLine || "";
  const previewText = String(draft.previewText || "").trim();
  if (campaignReviewPreview) campaignReviewPreview.textContent = previewText;
  if (campaignReviewPreviewRow) campaignReviewPreviewRow.hidden = !previewText;
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

function getCampaignTypeValue() {
  const selected = campaignTypeOptions?.querySelector("input[name='campaignType']:checked");
  return selected?.value || CAMPAIGN_TYPE_DEFAULT;
}

function isDripCampaign() {
  return getCampaignTypeValue() === "drip";
}

function isDripSequenceActive() {
  return isDripCampaign() && getCampaignStepLevel() === "campaign";
}

function getCampaignSequenceDelayLabel(delayDays) {
  if (delayDays == null) return "Start";
  return CAMPAIGN_SEQUENCE_DELAYS.find((option) => option.value === delayDays)?.label
    || CAMPAIGN_SEQUENCE_DELAYS.find((option) => option.value === CAMPAIGN_SEQUENCE_DEFAULT_DELAY)?.label
    || "2 days later";
}

function createSequenceEmail(overrides = {}) {
  return {
    id: `seq-${nextSequenceEmailId++}`,
    subjectLine: "",
    previewText: "",
    designTemplate: "",
    delayDays: CAMPAIGN_SEQUENCE_DEFAULT_DELAY,
    expanded: true,
    ...overrides
  };
}

function getActiveSequenceEmail() {
  return campaignSequenceEmails[activeSequenceEmailIndex] || null;
}

function commitActiveSequenceEmailFields() {
  const email = getActiveSequenceEmail();
  if (!email) return email;

  email.subjectLine = String(campaignSubjectLine?.value || "").trim();
  email.previewText = String(campaignPreviewText?.value || "").trim();
  email.designTemplate = String(getCampaignDesignTemplateId() || "").trim();
  return email;
}

function applySequenceEmailToForm(email) {
  if (campaignSubjectLine) campaignSubjectLine.value = email?.subjectLine || "";
  if (campaignPreviewText) campaignPreviewText.value = email?.previewText || "";
  campaignDesignTemplateApi?.reset(email?.designTemplate || "");
  syncCampaignSubjectContinue();
  syncCampaignDesignContinue();
}

function sequenceEmailHasError(email) {
  return !String(email?.subjectLine || "").trim() || !String(email?.designTemplate || "").trim();
}

function ensureCampaignSequenceEmails() {
  if (campaignSequenceEmails.length) return;

  campaignSequenceEmails = [
    createSequenceEmail({
      subjectLine: String(campaignSubjectLine?.value || "").trim(),
      previewText: String(campaignPreviewText?.value || "").trim(),
      designTemplate: String(getCampaignDesignTemplateId() || "").trim(),
      delayDays: null
    })
  ];
  activeSequenceEmailIndex = 0;
}

function discardCampaignSequenceEmails() {
  if (!campaignSequenceEmails.length) return;

  commitActiveSequenceEmailFields();
  applySequenceEmailToForm(campaignSequenceEmails[0]);
  campaignSequenceEmails = [];
  activeSequenceEmailIndex = 0;
}

function resetCampaignSequence() {
  campaignSequenceEmails = [];
  activeSequenceEmailIndex = 0;
  nextSequenceEmailId = 1;
  if (campaignSequenceList) campaignSequenceList.replaceChildren();
}

function shouldReduceCampaignSequenceMotion() {
  return document.body.classList.contains("reduce-motion")
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getCampaignSequenceViewTransitionName(type, emailId) {
  return `campaign-sequence-${type}-${emailId}`;
}

function createCampaignSequenceTransitionStyle({ fadeNames = [], blurNames = [] } = {}) {
  const style = document.createElement("style");
  style.dataset.campaignSequenceTransition = "";
  const rules = [];

  fadeNames.forEach((name) => {
    const escapedName = CSS.escape(name);
    rules.push(
      `html.is-campaign-sequence-transitioning::view-transition-old(${escapedName}){animation:campaign-sequence-opacity-out 130ms ease-out both!important}`,
      `html.is-campaign-sequence-transitioning::view-transition-new(${escapedName}){animation:campaign-sequence-opacity-in 180ms ease-out both!important}`
    );
  });

  blurNames.forEach((name) => {
    const escapedName = CSS.escape(name);
    rules.push(
      `html.is-campaign-sequence-transitioning::view-transition-old(${escapedName}){animation:campaign-sequence-blur-out 130ms ease-out both!important}`,
      `html.is-campaign-sequence-transitioning::view-transition-new(${escapedName}){animation:campaign-sequence-blur-in 180ms ease-out both!important}`
    );
  });

  style.textContent = rules.join("");
  document.head.appendChild(style);
  return style;
}

function updateCampaignSequenceWithTransition(update, { fadeNames = [], blurNames = [] } = {}) {
  const canTransition = typeof document.startViewTransition === "function"
    && !shouldReduceCampaignSequenceMotion();

  if (!canTransition) {
    update();
    return;
  }

  document.documentElement.classList.add("is-campaign-sequence-transitioning");
  const transitionStyle = createCampaignSequenceTransitionStyle({ fadeNames, blurNames });
  let transition;
  try {
    transition = document.startViewTransition(update);
  } catch {
    document.documentElement.classList.remove("is-campaign-sequence-transitioning");
    transitionStyle.remove();
    update();
    return;
  }

  transition.finished
    .catch(() => {})
    .finally(() => {
      document.documentElement.classList.remove("is-campaign-sequence-transitioning");
      transitionStyle.remove();
    });
}

function renderSequenceList() {
  if (!campaignSequenceList) return;

  campaignSequenceList.replaceChildren();
  if (!isDripCampaign()) return;

  campaignSequenceEmails.forEach((email, index) => {
    const connector = document.createElement("p");
    connector.className = "campaign-sequence-connector";
    connector.dataset.sequenceEmailId = email.id;
    connector.style.viewTransitionName = getCampaignSequenceViewTransitionName("connector", email.id);
    connector.textContent = index === 0 ? "Start" : getCampaignSequenceDelayLabel(email.delayDays);
    campaignSequenceList.appendChild(connector);

    const item = document.createElement("div");
    item.className = "campaign-sequence-item";
    item.dataset.sequenceIndex = String(index);
    item.dataset.sequenceEmailId = email.id;
    item.style.viewTransitionName = getCampaignSequenceViewTransitionName("item", email.id);
    const isExpanded = email.expanded !== false;
    if (index === activeSequenceEmailIndex) item.classList.add("is-selected");
    if (isExpanded) item.classList.add("is-expanded");
    if (campaignReviewValidated && sequenceEmailHasError(email)) item.classList.add("is-error");

    const summary = document.createElement("button");
    summary.className = "campaign-sequence-item-summary";
    summary.type = "button";
    summary.setAttribute("aria-pressed", String(index === activeSequenceEmailIndex));
    summary.setAttribute("aria-label", `Select email ${index + 1}`);

    const icon = document.createElement("img");
    icon.className = "campaign-sequence-item-icon";
    icon.src = "../../assets/icons/mail.svg";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "campaign-sequence-item-text";

    const title = document.createElement("span");
    title.className = "campaign-sequence-item-title";
    title.textContent = `Email #${index + 1}`;

    const subtitle = document.createElement("span");
    subtitle.className = "campaign-sequence-item-subtitle";
    const subjectLine = String(email.subjectLine || "").trim();
    if (subjectLine) {
      subtitle.textContent = subjectLine;
    } else {
      subtitle.textContent = "Add a subject";
      subtitle.classList.add("is-placeholder");
    }

    text.append(title, subtitle);

    const toggle = document.createElement("button");
    toggle.className = "campaign-sequence-item-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", isExpanded ? `Collapse email ${index + 1}` : `Expand email ${index + 1}`);
    toggle.setAttribute("aria-expanded", String(isExpanded));
    const chevron = document.createElement("img");
    chevron.src = "../../assets/icons/chevron.svg";
    chevron.alt = "";
    chevron.setAttribute("aria-hidden", "true");
    toggle.appendChild(chevron);
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSequenceEmailExpanded(index);
    });

    summary.append(icon, text);

    const header = document.createElement("div");
    header.className = "campaign-sequence-item-header";
    header.addEventListener("click", (event) => {
      if (event.target.closest(".campaign-sequence-item-toggle, .campaign-sequence-item-delete")) {
        return;
      }
      selectSequenceEmail(index);
    });
    header.appendChild(summary);

    if (isExpanded && index > 0) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "campaign-sequence-item-delete";
      deleteBtn.type = "button";
      deleteBtn.setAttribute("aria-label", `Delete email ${index + 1}`);
      const deleteIcon = document.createElement("img");
      deleteIcon.src = "../../assets/icons/delete.svg";
      deleteIcon.alt = "";
      deleteIcon.setAttribute("aria-hidden", "true");
      deleteBtn.appendChild(deleteIcon);
      deleteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSequenceEmail(index);
      });
      header.appendChild(deleteBtn);
    }

    header.appendChild(toggle);
    item.appendChild(header);

    if (isExpanded) {
      const isFirstEmail = index === 0;
      const detail = document.createElement("div");
      detail.className = "campaign-sequence-item-detail";
      detail.style.viewTransitionName = getCampaignSequenceViewTransitionName("detail", email.id);

      const when = document.createElement("label");
      when.className = "campaign-sequence-when";

      const whenLabel = document.createElement("span");
      whenLabel.className = "campaign-sequence-when-label";
      whenLabel.textContent = "When";

      const delayField = document.createElement("div");
      delayField.className = "campaign-sequence-delay-field";

      const delaySelect = document.createElement("select");
      delaySelect.className = "campaign-sequence-delay-select";
      delaySelect.setAttribute("aria-label", `When to send email ${index + 1}`);

      if (isFirstEmail) {
        const optionEl = document.createElement("option");
        optionEl.value = "0";
        optionEl.textContent = "Immediately";
        optionEl.selected = true;
        optionEl.disabled = true;
        delaySelect.appendChild(optionEl);
        delaySelect.value = "0";
        delaySelect.disabled = true;
      } else {
        CAMPAIGN_SEQUENCE_DELAYS.forEach((option) => {
          const optionEl = document.createElement("option");
          optionEl.value = String(option.value);
          optionEl.textContent = option.label;
          delaySelect.appendChild(optionEl);
        });
        delaySelect.value = String(
          CAMPAIGN_SEQUENCE_DELAYS.some((option) => option.value === email.delayDays)
            ? email.delayDays
            : CAMPAIGN_SEQUENCE_DEFAULT_DELAY
        );
        delaySelect.addEventListener("change", () => {
          updateSequenceEmailDelay(index, Number(delaySelect.value));
        });
      }

      const delayChevron = document.createElement("img");
      delayChevron.className = "campaign-sequence-delay-chevron";
      delayChevron.src = "../../assets/icons/chevron.svg";
      delayChevron.alt = "";
      delayChevron.setAttribute("aria-hidden", "true");

      delayField.append(delaySelect, delayChevron);
      when.append(whenLabel, delayField);
      detail.appendChild(when);
      item.appendChild(detail);
    }

    campaignSequenceList.appendChild(item);
  });
}

function refreshCampaignSequenceList(transitionOptions = {}) {
  updateCampaignSequenceWithTransition(() => {
    if (campaignReviewValidated) {
      showCampaignValidationErrors(getCampaignStepErrors(activeCampaignStepIndex));
      return;
    }

    renderSequenceList();
    syncCampaignStepHeight();
  }, transitionOptions);
}

function selectSequenceEmail(index) {
  if (!Number.isInteger(index) || index < 0 || index >= campaignSequenceEmails.length) return;
  if (index === activeSequenceEmailIndex) return;

  commitActiveSequenceEmailFields();
  activeSequenceEmailIndex = index;
  applySequenceEmailToForm(campaignSequenceEmails[index]);
  refreshCampaignSequenceList();
}

function toggleSequenceEmailExpanded(index) {
  if (!Number.isInteger(index) || index < 0 || index >= campaignSequenceEmails.length) return;

  const email = campaignSequenceEmails[index];
  if (!email) return;

  if (index !== activeSequenceEmailIndex) {
    commitActiveSequenceEmailFields();
    activeSequenceEmailIndex = index;
    applySequenceEmailToForm(email);
  }

  email.expanded = !(email.expanded !== false);
  refreshCampaignSequenceList({
    fadeNames: [getCampaignSequenceViewTransitionName("detail", email.id)]
  });
}

function addSequenceEmail() {
  if (!isDripCampaign()) return;

  ensureCampaignSequenceEmails();
  commitActiveSequenceEmailFields();
  const email = createSequenceEmail({
    delayDays: CAMPAIGN_SEQUENCE_DEFAULT_DELAY
  });
  campaignSequenceEmails.push(email);

  activeSequenceEmailIndex = campaignSequenceEmails.length - 1;
  applySequenceEmailToForm(email);
  const blurNames = [
    getCampaignSequenceViewTransitionName("connector", email.id),
    getCampaignSequenceViewTransitionName("item", email.id),
    getCampaignSequenceViewTransitionName("detail", email.id)
  ];
  updateCampaignSequenceWithTransition(() => {
    renderSequenceList();
    syncCampaignStepHeight();
  }, { blurNames });
}

function deleteSequenceEmail(index) {
  if (index <= 0 || campaignSequenceEmails.length <= 1) return;

  commitActiveSequenceEmailFields();
  const deletedEmailId = campaignSequenceEmails[index].id;
  campaignSequenceEmails.splice(index, 1);
  campaignSequenceEmails[0].delayDays = null;

  activeSequenceEmailIndex = Math.min(index, campaignSequenceEmails.length - 1);
  applySequenceEmailToForm(campaignSequenceEmails[activeSequenceEmailIndex]);
  const blurNames = [
    getCampaignSequenceViewTransitionName("connector", deletedEmailId),
    getCampaignSequenceViewTransitionName("item", deletedEmailId),
    getCampaignSequenceViewTransitionName("detail", deletedEmailId)
  ];
  const fadeNames = [
    getCampaignSequenceViewTransitionName(
      "detail",
      campaignSequenceEmails[activeSequenceEmailIndex].id
    )
  ];
  updateCampaignSequenceWithTransition(() => {
    renderSequenceList();
    syncCampaignStepHeight();
  }, { fadeNames, blurNames });
}

function updateSequenceEmailDelay(index, delayDays) {
  const email = campaignSequenceEmails[index];
  if (!email || index === 0) return;

  email.delayDays = CAMPAIGN_SEQUENCE_DELAYS.some((option) => option.value === delayDays)
    ? delayDays
    : CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  renderSequenceList();
  syncCampaignStepHeight();
}

function syncDripSequenceChrome() {
  const active = isDripSequenceActive();
  campaignWizardModal?.classList.toggle("is-drip-sequence", active);

  if (campaignSequencePanel) campaignSequencePanel.hidden = !active;
  if (campaignSequenceTitle) campaignSequenceTitle.hidden = !active;

  if (!active) {
    campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");
    if (campaignStepViewport) campaignStepViewport.style.height = "";
  }

  if (active) {
    if (campaignStepBody) campaignStepBody.style.height = "";
    ensureCampaignSequenceEmails();
    renderSequenceList();
    return;
  }

  if (campaignSequenceList && !isDripCampaign()) {
    campaignSequenceList.replaceChildren();
  }
}

function handleCampaignTypeChange() {
  syncCampaignTypeOptionChrome();

  if (isDripCampaign()) {
    ensureCampaignSequenceEmails();
    renderSequenceList();
  } else {
    discardCampaignSequenceEmails();
  }

  syncDripSequenceChrome();
  syncCampaignStepHeight();
}

function getCampaignSequenceValidationErrors() {
  if (!isDripCampaign()) return [];

  commitActiveSequenceEmailFields();

  const errors = [];
  campaignSequenceEmails.forEach((email, emailIndex) => {
    if (!String(email.subjectLine || "").trim()) {
      errors.push({
        stepIndex: CAMPAIGN_SUBJECT_STEP_INDEX,
        field: campaignSubjectLine,
        message: CAMPAIGN_FIELD_ERRORS.subject,
        emailIndex
      });
    }

    if (!String(email.designTemplate || "").trim()) {
      errors.push({
        stepIndex: CAMPAIGN_DESIGN_STEP_INDEX,
        field: campaignDesignTemplateField,
        message: CAMPAIGN_FIELD_ERRORS.designTemplate,
        emailIndex
      });
    }
  });

  return errors;
}

function syncCampaignTypeOptionChrome() {
  campaignTypeOptions?.querySelectorAll(".proto-modal-check").forEach((option) => {
    const input = option.querySelector("input[type='radio']");
    option.classList.toggle("is-checked", Boolean(input?.checked));
  });
}

function resetCampaignTypeSelection() {
  const regular = document.getElementById("campaignTypeRegular");
  if (regular) regular.checked = true;
  const drip = document.getElementById("campaignTypeDrip");
  if (drip) drip.checked = false;
  resetCampaignSequence();
  syncCampaignTypeOptionChrome();
  syncDripSequenceChrome();
}

function commitCampaignSettingsName() {
  campaignName = normalizeCampaignName(campaignSettingsName?.value);
  syncCampaignNameChrome();
  if (window.cstCampaignDraft) window.cstCampaignDraft.campaignName = campaignName;
}

function resetCampaignSettingsModal() {
  resetCampaignTypeSelection();
  syncCampaignSettingsName();
}

function getCampaignReviewScheduleValue() {
  const selected = campaignScheduleOptions?.querySelector("input[name='campaignSchedule']:checked");
  return selected?.value || CAMPAIGN_REVIEW_SCHEDULE_DEFAULT;
}

function syncCampaignScheduleOptionChrome() {
  campaignScheduleOptions?.querySelectorAll(".proto-modal-check").forEach((option) => {
    const input = option.querySelector("input[type='radio']");
    option.classList.toggle("is-checked", Boolean(input?.checked));
  });
}

function syncCampaignReviewConfirmLabel() {
  if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id !== "schedule") return;
  syncCampaignStepFooter();
}

function resetCampaignReviewScheduleSelection() {
  const sendNow = document.getElementById("campaignScheduleSendNow");
  if (sendNow) sendNow.checked = true;
  syncCampaignScheduleOptionChrome();
  syncCampaignReviewConfirmLabel();
}

function resetReviewCampaignModal() {
  cancelCampaignReviewRename();
  resetCampaignReviewTestSend();
  resetCampaignReviewScheduleSelection();
  if (campaignReviewTestEmail) campaignReviewTestEmail.value = CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT;
}

function handleCampaignReviewScheduleAction(_action) {
  closeStartCampaignModal();
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

function enterCampaignReview() {
  const sender = getCampaignSenderSelection();
  const audience = buildCampaignAudiencePreview(getSelectedAudienceValues());
  if (!sender || !audience) return;

  const campaignType = getCampaignTypeValue();
  if (campaignType === "drip") {
    commitActiveSequenceEmailFields();
    if (
      !campaignSequenceEmails.length
      || campaignSequenceEmails.some((email) => sequenceEmailHasError(email))
    ) {
      return;
    }
  } else {
    const subject = getCampaignSubjectSelection();
    const design = getCampaignDesignSelection();
    if (!subject || !design) return;
  }

  const subject = getCampaignSubjectSelection();
  const design = getCampaignDesignSelection();

  campaignSenderDraft = sender;
  window.cstCampaignSender = { ...sender };
  window.cstCampaignDraft = {
    ...audience,
    campaignName,
    campaignType,
    sender,
    ...(subject || {}),
    design: design || null,
    emails: campaignType === "drip"
      ? campaignSequenceEmails.map((email) => ({ ...email }))
      : undefined
  };
  campaignReviewDraft = collectCampaignReviewDraft();
  renderCampaignReviewModal();
  goToCampaignStep(CAMPAIGN_REVIEW_STEP_INDEX);
}

function requestCampaignReview() {
  if (campaignReviewPending) return;
  if (isCampaignReviewLevel()) {
    goToCampaignStep(CAMPAIGN_REVIEW_STEP_INDEX);
    return;
  }

  setCampaignReviewLoading(true);
  campaignReviewTimeoutId = window.setTimeout(() => {
    campaignReviewTimeoutId = null;
    setCampaignReviewLoading(false);

    const validationErrors = getCampaignWizardErrors();
    if (validationErrors.length) {
      revealCampaignWizardErrors(validationErrors);
      return;
    }

    enterCampaignReview();
  }, CAMPAIGN_REVIEW_DELAY_MS);
}

function goToCampaignLevel(level) {
  closeCampaignLevelDropdown();
  if (!CAMPAIGN_LEVEL_ORDER.includes(level)) return;
  if (getCampaignStepLevel() === level) return;

  const currentOrder = CAMPAIGN_LEVEL_ORDER.indexOf(getCampaignStepLevel());
  const nextOrder = CAMPAIGN_LEVEL_ORDER.indexOf(level);

  if (level === "review") {
    requestCampaignReview();
    return;
  }

  if (nextOrder > currentOrder) {
    const errors = getCampaignErrorsBeforeLevel(level);
    if (errors.length) {
      revealCampaignWizardErrors(errors);
      return;
    }
  }

  const fallback = getFirstCampaignStepIndex(level);
  goToCampaignStep(lastStepByLevel[level] ?? fallback, { focusTab: true });
}

function getFirstCampaignWizardError(errors) {
  if (!errors.length) return null;

  const settingsError = errors
    .filter((error) => !Number.isInteger(error.emailIndex))
    .reduce((best, error) => (!best || error.stepIndex < best.stepIndex ? error : best), null);
  if (settingsError) return settingsError;

  return errors.slice().sort((left, right) => {
    const emailDelta = (left.emailIndex ?? 0) - (right.emailIndex ?? 0);
    if (emailDelta) return emailDelta;
    return left.stepIndex - right.stepIndex;
  })[0] || null;
}

function revealCampaignWizardErrors(errors) {
  const firstError = getFirstCampaignWizardError(errors);
  if (Number.isInteger(firstError?.emailIndex) && isDripCampaign()) {
    selectSequenceEmail(firstError.emailIndex);
  }

  showCampaignValidationErrors(errors);

  const firstStepIndex = firstError?.stepIndex ?? errors.reduce(
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
    closeCampaignLevelDropdown();
  },
  onClose() {
    resetCampaignWizard();
  },
  shouldCloseOnEscape() {
    if (isCampaignReviewRenaming()) {
      cancelCampaignReviewRename();
      return false;
    }
    return !closeOpenCampaignDropdown();
  },
  getFocusElement() {
    if (activeCampaignStepIndex === CAMPAIGN_SETTINGS_STEP_INDEX && campaignSettingsName) {
      return campaignSettingsName;
    }
    return startCampaignModal?.querySelector(".proto-modal-close");
  },
  onOpened() {
    syncCampaignStepHeight({ immediate: true });
    if (activeCampaignStepIndex === CAMPAIGN_SETTINGS_STEP_INDEX) {
      focusCampaignSettingsName();
    }
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
function syncActiveSequenceEmailPreview() {
  if (!isDripCampaign() || !getActiveSequenceEmail()) return;
  commitActiveSequenceEmailFields();
  renderSequenceList();
}

campaignSubjectLine?.addEventListener("input", () => {
  clearCampaignFieldError(campaignSubjectLine);
  syncCampaignSubjectContinue();
  syncActiveSequenceEmailPreview();
});
campaignPreviewText?.addEventListener("input", () => {
  syncCampaignSubjectContinue();
  syncActiveSequenceEmailPreview();
});

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
  syncActiveSequenceEmailPreview();
});

campaignDesignPreviewImage?.addEventListener("load", () => {
  if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id === "design") {
    syncCampaignStepHeight();
  }
});

startCampaignOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openStartCampaignModal(startCampaignOption);
});

function handleCampaignStepTabClick(event) {
  const tab = event.target.closest(".campaign-step-tab");
  if (!tab || campaignReviewPending) return;

  const stepIndex = CAMPAIGN_STEPS.findIndex((step) => step.id === tab.dataset.campaignStep);
  goToCampaignStep(stepIndex);
}

campaignSettingsStepTabs?.addEventListener("click", handleCampaignStepTabClick);
campaignStepTabs?.addEventListener("click", handleCampaignStepTabClick);
campaignReviewStepTabs?.addEventListener("click", handleCampaignStepTabClick);

startCampaignModal?.addEventListener("click", (event) => {
  const backButton = event.target.closest(".campaign-step-back");
  if (!backButton) return;

  event.preventDefault();
  if (campaignReviewPending) return;
  if (activeCampaignStepIndex <= 0) {
    closeStartCampaignModal();
    return;
  }
  goToCampaignStep(activeCampaignStepIndex - 1);
});

campaignSettingsModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  commitCampaignSettingsName();
  if (window.cstCampaignDraft) {
    window.cstCampaignDraft.campaignType = getCampaignTypeValue();
    window.cstCampaignDraft.campaignName = campaignName;
  } else {
    window.cstCampaignDraft = {
      campaignName,
      campaignType: getCampaignTypeValue()
    };
  }
  goToCampaignStep(CAMPAIGN_SENDER_STEP_INDEX, { focusTab: true });
});

campaignTypeOptions?.addEventListener("change", handleCampaignTypeChange);

campaignSequenceAddBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  addSequenceEmail();
});

campaignSettingsName?.addEventListener("input", () => {
  campaignName = normalizeCampaignName(campaignSettingsName.value);
  if (window.cstCampaignDraft) window.cstCampaignDraft.campaignName = campaignName;
  syncCampaignReviewNameChrome(campaignName);
});

campaignSenderModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const sender = getCampaignSenderSelection();
  if (sender) {
    campaignSenderDraft = sender;
    window.cstCampaignSender = { ...sender };
  }
  goToCampaignStep(CAMPAIGN_RECIPIENTS_STEP_INDEX, { focusTab: true });
});

startCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const draft = buildCampaignAudiencePreview(getSelectedAudienceValues());
  if (draft) {
    window.cstCampaignDraft = {
      ...draft,
      campaignName,
      campaignType: getCampaignTypeValue(),
      sender: campaignSenderDraft ? { ...campaignSenderDraft } : null
    };
  }
  goToCampaignStep(CAMPAIGN_SUBJECT_STEP_INDEX, { focusTab: true });
});

campaignSubjectModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isDripCampaign()) commitActiveSequenceEmailFields();

  const subject = getCampaignSubjectSelection();
  if (subject) {
    window.cstCampaignDraft = {
      ...(window.cstCampaignDraft || {}),
      campaignName,
      campaignType: getCampaignTypeValue(),
      sender: campaignSenderDraft ? { ...campaignSenderDraft } : window.cstCampaignDraft?.sender || null,
      ...subject
    };
  }
  goToCampaignStep(CAMPAIGN_DESIGN_STEP_INDEX, { focusTab: true });
});

campaignDesignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isDripCampaign()) commitActiveSequenceEmailFields();
  requestCampaignReview();
});

campaignStepLevel?.querySelector("[role='menu']")?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-campaign-level]");
  if (!option) return;
  event.preventDefault();
  goToCampaignLevel(option.dataset.campaignLevel);
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

reviewCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  goToCampaignStep(CAMPAIGN_SCHEDULE_STEP_INDEX);
});

scheduleCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCampaignReviewScheduleAction(getCampaignReviewScheduleValue());
});

campaignScheduleOptions?.addEventListener("change", () => {
  syncCampaignScheduleOptionChrome();
  syncCampaignReviewConfirmLabel();
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
