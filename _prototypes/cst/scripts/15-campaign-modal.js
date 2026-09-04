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
const CAMPAIGN_REVIEW_TEST_EMAIL_DEFAULT = "you@wefranch.com";
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
const CAMPAIGN_SEQUENCE_DOT_PARALLAX = 0.4;
const CAMPAIGN_SEQUENCE_TRIGGER_TIME = "time";
const CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT = "engagement";
const CAMPAIGN_SEQUENCE_TRIGGERS = [
  { value: CAMPAIGN_SEQUENCE_TRIGGER_TIME, label: "Time-based" },
  { value: CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT, label: "Engagement-based" }
];
const CAMPAIGN_SEQUENCE_DELAYS = [
  { value: 0, label: "Immediately" },
  { value: 1, label: "1 day later" },
  { value: 2, label: "2 days later" },
  { value: 3, label: "3 days later" },
  { value: 7, label: "1 week later" },
  { value: 14, label: "2 weeks later" }
];
const CAMPAIGN_SEQUENCE_WAIT_WINDOWS = [
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 7, label: "1 week" },
  { value: 14, label: "2 weeks" }
];
const CAMPAIGN_SEQUENCE_ENGAGEMENT_EVENTS = [
  { value: "opens", label: "Opens previous email", negative: false },
  { value: "does-not-open", label: "Doesn't open previous email", negative: true },
  { value: "clicks", label: "Clicks a link in previous email", negative: false },
  { value: "does-not-click", label: "Doesn't click a link in previous email", negative: true }
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
  "schedule-later": "Schedule"
};
const CAMPAIGN_REVIEW_SCHEDULE_DEFAULT = "send-now";
const CAMPAIGN_SCHEDULE_DEFAULT_HOUR = "09";
const CAMPAIGN_SCHEDULE_DEFAULT_MINUTE = "00";
const CAMPAIGN_SCHEDULE_MINUTE_STEP = 15;

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
const campaignLevelTitle = document.getElementById("startCampaignModalTitle");
const campaignLevelMenuLabel = campaignStepLevel?.querySelector(
  "[data-campaign-level='campaign'] .toolbar-dropdown-label"
);
const campaignReviewChrome = document.getElementById("campaignReviewChrome");
const startCampaignModalForm = document.getElementById("startCampaignModalForm");
const startCampaignOption = document.getElementById("startCampaignOption");
const campaignSettingsStepTabs = document.getElementById("campaignSettingsStepTabs");
const campaignStepTabs = document.getElementById("campaignStepTabs");
const campaignReviewStepTabs = document.getElementById("campaignReviewStepTabs");
const campaignSettingsModalForm = document.getElementById("campaignSettingsModalForm");
const campaignSettingsName = document.getElementById("campaignSettingsName");
const campaignStepBody = document.getElementById("campaignStepBody");
const campaignStepViewport = document.getElementById("campaignStepViewport");
const campaignStepPanels = Array.from(campaignStepViewport?.querySelectorAll(".campaign-step-panel") || []);
const campaignSequencePanel = document.getElementById("campaignSequencePanel");
const campaignEmailPanelTitle = document.getElementById("campaignEmailPanelTitle");
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
const campaignSubjectModeText = document.getElementById("campaignSubjectModeText");
const campaignTypeSwitchLink = document.getElementById("campaignTypeSwitchLink");
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
const campaignScheduleLaterFields = document.getElementById("campaignScheduleLaterFields");
const campaignScheduleDate = document.getElementById("campaignScheduleDate");
const campaignScheduleHourSelect = document.getElementById("campaignScheduleHourSelect");
const campaignScheduleMinuteSelect = document.getElementById("campaignScheduleMinuteSelect");

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
let campaignType = CAMPAIGN_TYPE_DEFAULT;
let startCampaignAudienceApi = null;
let startCampaignDraft = null;
let campaignDesignTemplateApi = null;
let campaignScheduleHourApi = null;
let campaignScheduleMinuteApi = null;
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
let emailPanelCollapsed = false;
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
  closeCampaignTypeSwitchConfirm();
  campaignScheduleHourApi?.close();
  campaignScheduleMinuteApi?.close();
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
    if (child === campaignStepBody || child === campaignStepViewport || child === campaignEmailPanelTitle) return;
    if (child === campaignReviewChrome) {
      if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id !== "review") return;
      const inner = child.querySelector(".campaign-review-chrome-inner");
      const collapsed = child.classList.contains("is-collapsed");
      chromeHeight += collapsed
        ? (inner?.scrollHeight || 0)
        : child.getBoundingClientRect().height;
      const reviewStyles = getComputedStyle(child);
      chromeHeight += (parseFloat(reviewStyles.marginTop) || 0)
        + (parseFloat(reviewStyles.marginBottom) || 0);
      return;
    }
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
  const isDripSequence = isDripCampaign() && getCampaignStepLevel(index) === "campaign";

  if ((isDripSequence || stepId === "design") && campaignReviewPending) return "Reviewing";
  if (isDripSequence || stepId === "design") return "Review";
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

function shouldShowCampaignReviewChrome(index = activeCampaignStepIndex) {
  return CAMPAIGN_STEPS[index]?.id === "review";
}

function setCampaignReviewChromeVisible(visible, { immediate = false } = {}) {
  if (!campaignReviewChrome) return;

  if (immediate) campaignReviewChrome.style.transition = "none";
  campaignReviewChrome.classList.toggle("is-collapsed", !visible);
  campaignReviewChrome.inert = !visible;
  campaignReviewChrome.setAttribute("aria-hidden", String(!visible));
  if (immediate) {
    campaignReviewChrome.offsetHeight;
    campaignReviewChrome.style.transition = "";
  }
}

function syncCampaignStepHeight({ immediate = false } = {}) {
  const heightTarget = getCampaignStepHeightTarget();
  if (!heightTarget || !startCampaignModalApi?.isVisible()) return;
  if (measuringCampaignStepHeight) return;

  // Sequence is a fixed 580px card. Don't size the sidebar from content or it
  // will stretch the modal. The list and form bodies scroll inside the card.
  if (isDripSequenceActive()) {
    heightTarget.style.height = "";
    campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");
    return;
  }

  const activePanel = getCampaignStepPanel(activeCampaignStepIndex);
  if (!activePanel) return;

  const nextHeight = getCampaignStepViewportHeight(activePanel);
  const currentHeight = Math.round(heightTarget.getBoundingClientRect().height);
  // Flex can report the right used height while style.height is still empty.
  // Percentage children (the viewport/panels) then resolve to 0 until we write px.
  if (!immediate && heightTarget.style.height && Math.abs(currentHeight - nextHeight) < 1) return;

  if (immediate) heightTarget.style.transition = "none";
  heightTarget.style.height = `${nextHeight}px`;
  campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");

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
  setCampaignReviewChromeVisible(shouldShowCampaignReviewChrome(nextIndex), { immediate: true });

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
  // Subject and Design live in the sidebar, so stepping into either has to open it.
  if (isDripCampaign() && CAMPAIGN_STEPS[index]?.level === "campaign") {
    setEmailPanelCollapsed(false);
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
    campaignStepViewport.style.height = "";
    campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");
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
    ? null
    : getCampaignStepViewportHeight(incomingPanel);

  window.requestAnimationFrame(() => {
    if (!campaignStepAnimating || !startCampaignModalApi.isVisible()) return;
    outgoingPanel.style.transform = `translateX(${-direction * 100}%)`;
    incomingPanel.style.transform = "translateX(0)";
    outgoingPanel.style.opacity = "0";
    incomingPanel.style.opacity = "1";
    const heightTarget = getCampaignStepHeightTarget();
    setCampaignReviewChromeVisible(shouldShowCampaignReviewChrome());
    if (heightTarget && nextHeight !== null) heightTarget.style.height = `${nextHeight}px`;
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
  return campaignType === "drip" ? "drip" : CAMPAIGN_TYPE_DEFAULT;
}

function isDripCampaign() {
  return getCampaignTypeValue() === "drip";
}

function isDripSequenceActive() {
  return isDripCampaign() && getCampaignStepLevel() === "campaign";
}

function getCampaignSequenceOption(options, value, fallbackValue) {
  return options.find((option) => String(option.value) === String(value))
    || options.find((option) => String(option.value) === String(fallbackValue))
    || options[0]
    || null;
}

function getCampaignSequenceDelayLabel(delayDays) {
  if (delayDays == null) return "On campaign start";
  return getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_DELAYS,
    delayDays,
    CAMPAIGN_SEQUENCE_DEFAULT_DELAY
  )?.label || "2 days later";
}

function getCampaignSequenceWaitLabel(waitDays) {
  return getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_WAIT_WINDOWS,
    waitDays,
    CAMPAIGN_SEQUENCE_DEFAULT_DELAY
  )?.label || "2 days";
}

function getSequenceTriggerType(email, index = 0) {
  if (index === 0) return CAMPAIGN_SEQUENCE_TRIGGER_TIME;
  return email?.triggerType === CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT
    ? CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT
    : CAMPAIGN_SEQUENCE_TRIGGER_TIME;
}

function getSequenceEngagementEvent(email) {
  return getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_ENGAGEMENT_EVENTS,
    email?.engagementEvent,
    "opens"
  );
}

function getCampaignSequenceConnectorLabel(email, index) {
  if (index === 0) return "On campaign start";
  if (getSequenceTriggerType(email, index) === CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT) {
    const event = getSequenceEngagementEvent(email);
    if (event?.negative) {
      return `${event.label} after ${getCampaignSequenceWaitLabel(email.engagementWaitDays)}`;
    }
    return event?.label || CAMPAIGN_SEQUENCE_ENGAGEMENT_EVENTS[0].label;
  }
  return getCampaignSequenceDelayLabel(email?.delayDays);
}

function fillCampaignSequenceSelect(select, options, selectedValue) {
  const selected = getCampaignSequenceOption(options, selectedValue, options[0]?.value);
  options.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = String(option.value);
    optionEl.textContent = option.label;
    if (selected && String(option.value) === String(selected.value)) optionEl.selected = true;
    select.appendChild(optionEl);
  });
  if (selected) select.value = String(selected.value);
}

function createCampaignSequenceSelectField({
  label,
  ariaLabel,
  options,
  value,
  disabled = false,
  onChange
}) {
  const field = document.createElement("label");
  field.className = "campaign-sequence-field";

  const labelEl = document.createElement("span");
  labelEl.className = "campaign-sequence-field-label";
  labelEl.textContent = label;

  const control = document.createElement("div");
  control.className = "campaign-sequence-delay-field";

  const select = document.createElement("select");
  select.className = "campaign-sequence-delay-select";
  select.setAttribute("aria-label", ariaLabel);
  fillCampaignSequenceSelect(select, options, value);
  if (disabled) {
    select.disabled = true;
  } else if (typeof onChange === "function") {
    select.addEventListener("change", () => onChange(select.value));
  }

  const chevron = document.createElement("img");
  chevron.className = "campaign-sequence-delay-chevron";
  chevron.src = "../../assets/icons/chevron.svg";
  chevron.alt = "";
  chevron.setAttribute("aria-hidden", "true");

  control.append(select, chevron);
  field.append(labelEl, control);
  return field;
}

function createSequenceEmail(overrides = {}) {
  return {
    id: `seq-${nextSequenceEmailId++}`,
    subjectLine: "",
    previewText: "",
    designTemplate: "",
    triggerType: CAMPAIGN_SEQUENCE_TRIGGER_TIME,
    delayDays: CAMPAIGN_SEQUENCE_DEFAULT_DELAY,
    engagementEvent: "opens",
    engagementWaitDays: CAMPAIGN_SEQUENCE_DEFAULT_DELAY,
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
  emailPanelCollapsed = false;
}

function resetCampaignSequence() {
  campaignSequenceEmails = [];
  activeSequenceEmailIndex = 0;
  emailPanelCollapsed = false;
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

function getCampaignSequenceTransitionSelector(pseudo) {
  return `html.is-campaign-sequence-transitioning .campaign-sequence-panel::${pseudo}`;
}

function createCampaignSequenceTransitionStyle({ fadeNames = [], blurNames = [], slideNames = [] } = {}) {
  const style = document.createElement("style");
  style.dataset.campaignSequenceTransition = "";
  const rules = [];

  fadeNames.forEach((name) => {
    const escapedName = CSS.escape(name);
    rules.push(
      `${getCampaignSequenceTransitionSelector(`view-transition-old(${escapedName})`)}{animation:campaign-sequence-opacity-out 130ms ease-out both!important}`,
      `${getCampaignSequenceTransitionSelector(`view-transition-new(${escapedName})`)}{animation:campaign-sequence-opacity-in 180ms ease-out both!important}`
    );
  });

  blurNames.forEach((name) => {
    const escapedName = CSS.escape(name);
    rules.push(
      `${getCampaignSequenceTransitionSelector(`view-transition-old(${escapedName})`)}{animation:campaign-sequence-blur-out 130ms ease-out both!important}`,
      `${getCampaignSequenceTransitionSelector(`view-transition-new(${escapedName})`)}{animation:campaign-sequence-blur-in 180ms ease-out both!important}`
    );
  });

  slideNames.forEach((name) => {
    const escapedName = CSS.escape(name);
    rules.push(
      `${getCampaignSequenceTransitionSelector(`view-transition-new(${escapedName})`)}{animation:campaign-sequence-slide-in 250ms cubic-bezier(0.4, 0, 0.2, 1) both!important}`
    );
  });

  style.textContent = rules.join("");
  document.head.appendChild(style);
  return style;
}

function getCampaignSequenceTransitionRoot() {
  if (campaignSequencePanel && typeof campaignSequencePanel.startViewTransition === "function") {
    return campaignSequencePanel;
  }
  return null;
}

function syncCampaignSequenceDotParallax() {
  if (!campaignSequencePanel) return;

  if (!isDripSequenceActive() || shouldReduceCampaignSequenceMotion()) {
    campaignSequencePanel.style.removeProperty("--campaign-sequence-dot-offset");
    return;
  }

  const offset = Math.round(-campaignSequencePanel.scrollTop * CAMPAIGN_SEQUENCE_DOT_PARALLAX);
  campaignSequencePanel.style.setProperty("--campaign-sequence-dot-offset", `${offset}px`);
}

function revealCampaignSequenceEnd() {
  if (!campaignSequencePanel) return;
  campaignSequencePanel.scrollTop = campaignSequencePanel.scrollHeight;
}

function scrollCampaignSequenceEmailToTop(index) {
  if (!campaignSequencePanel || !campaignSequenceList) return;
  if (!Number.isInteger(index) || index < 0) return;

  const scroll = () => {
    const item = campaignSequenceList.querySelector(
      `.campaign-sequence-item[data-sequence-index="${index}"]`
    );
    if (!item) return;

    const connector = item.previousElementSibling;
    const target = connector?.classList.contains("campaign-sequence-connector") ? connector : item;
    const panel = campaignSequencePanel;
    const nextScrollTop = panel.scrollTop + target.getBoundingClientRect().top - panel.getBoundingClientRect().top;

    panel.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: shouldReduceCampaignSequenceMotion() ? "auto" : "smooth"
    });
  };

  requestAnimationFrame(scroll);
}

function updateCampaignSequenceWithTransition(update, { fadeNames = [], blurNames = [], slideNames = [] } = {}) {
  const transitionRoot = getCampaignSequenceTransitionRoot();
  const canTransition = Boolean(transitionRoot) && !shouldReduceCampaignSequenceMotion();

  if (!canTransition) {
    update();
    return;
  }

  document.documentElement.classList.add("is-campaign-sequence-transitioning");
  const transitionStyle = createCampaignSequenceTransitionStyle({ fadeNames, blurNames, slideNames });
  let transition;
  try {
    transition = transitionRoot.startViewTransition(update);
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

function applySequenceItemSubtitle(subtitle, email) {
  const subjectLine = String(email?.subjectLine || "").trim();
  subtitle.textContent = subjectLine || "Add a subject";
  subtitle.classList.toggle("is-placeholder", !subjectLine);
}

function renderSequenceList() {
  if (!campaignSequenceList) return;

  syncCampaignEmailPanelTitle();
  campaignSequenceList.replaceChildren();
  if (!isDripCampaign()) return;

  campaignSequenceEmails.forEach((email, index) => {
    const connector = document.createElement("p");
    connector.className = "campaign-sequence-connector";
    connector.dataset.sequenceEmailId = email.id;
    connector.style.viewTransitionName = getCampaignSequenceViewTransitionName("connector", email.id);
    connector.textContent = getCampaignSequenceConnectorLabel(email, index);
    campaignSequenceList.appendChild(connector);

    const item = document.createElement("div");
    item.className = "campaign-sequence-item";
    item.dataset.sequenceIndex = String(index);
    item.dataset.sequenceEmailId = email.id;
    item.style.viewTransitionName = getCampaignSequenceViewTransitionName("item", email.id);
    const isExpanded = email.expanded !== false;
    const isSelected = isSequenceEmailSelected(index);
    if (isSelected) item.classList.add("is-selected");
    if (isExpanded) item.classList.add("is-expanded");
    if (campaignReviewValidated && sequenceEmailHasError(email)) item.classList.add("is-error");

    const summary = document.createElement("button");
    summary.className = "campaign-sequence-item-summary";
    summary.type = "button";
    summary.setAttribute("aria-pressed", String(isSelected));
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
    applySequenceItemSubtitle(subtitle, email);

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

    item.addEventListener("click", (event) => {
      if (
        event.target.closest(
          ".campaign-sequence-item-toggle, .campaign-sequence-item-delete, .campaign-sequence-item-detail"
        )
      ) {
        return;
      }
      if (isSequenceEmailSelected(index)) {
        setEmailPanelCollapsed(true);
        return;
      }
      selectSequenceEmail(index);
    });

    const header = document.createElement("div");
    header.className = "campaign-sequence-item-header";
    header.appendChild(summary);

    if (index > 0) {
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
      const triggerType = getSequenceTriggerType(email, index);

      detail.appendChild(createCampaignSequenceSelectField({
        label: "Trigger",
        ariaLabel: `Trigger for email ${index + 1}`,
        options: isFirstEmail
          ? CAMPAIGN_SEQUENCE_TRIGGERS.filter((option) => option.value === CAMPAIGN_SEQUENCE_TRIGGER_TIME)
          : CAMPAIGN_SEQUENCE_TRIGGERS,
        value: triggerType,
        disabled: isFirstEmail,
        onChange: (value) => updateSequenceEmailTrigger(index, value)
      }));

      if (triggerType === CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT) {
        const engagement = getSequenceEngagementEvent(email);
        detail.appendChild(createCampaignSequenceSelectField({
          label: "If recipient",
          ariaLabel: `Engagement trigger for email ${index + 1}`,
          options: CAMPAIGN_SEQUENCE_ENGAGEMENT_EVENTS,
          value: engagement.value,
          onChange: (value) => updateSequenceEmailEngagement(index, value)
        }));

        if (engagement.negative) {
          detail.appendChild(createCampaignSequenceSelectField({
            label: "After",
            ariaLabel: `Wait window for email ${index + 1}`,
            options: CAMPAIGN_SEQUENCE_WAIT_WINDOWS,
            value: email.engagementWaitDays,
            onChange: (value) => updateSequenceEmailEngagementWait(index, Number(value))
          }));
        }
      } else {
        detail.appendChild(createCampaignSequenceSelectField({
          label: "When",
          ariaLabel: `When to send email ${index + 1}`,
          options: isFirstEmail ? [{ value: 0, label: "Immediately" }] : CAMPAIGN_SEQUENCE_DELAYS,
          value: isFirstEmail ? 0 : email.delayDays,
          disabled: isFirstEmail,
          onChange: (value) => updateSequenceEmailDelay(index, Number(value))
        }));
      }

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

  const sameEmail = index === activeSequenceEmailIndex;
  if (sameEmail && !emailPanelCollapsed) return;

  if (!sameEmail) {
    commitActiveSequenceEmailFields();
    activeSequenceEmailIndex = index;
    applySequenceEmailToForm(campaignSequenceEmails[index]);
    syncCampaignEmailPanelTitle();
  }

  // Reopening the sidebar animates the modal width, so let setEmailPanelCollapsed
  // patch the cards in place instead of running a view transition over it.
  if (emailPanelCollapsed) {
    setEmailPanelCollapsed(false);
    scrollCampaignSequenceEmailToTop(index);
    return;
  }

  refreshCampaignSequenceList();
  scrollCampaignSequenceEmailToTop(index);
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

  // A new email always opens the sidebar. When that means resizing the modal,
  // skip the view transition so it doesn't snapshot over the resize.
  const reopening = emailPanelCollapsed;
  emailPanelCollapsed = false;
  syncEmailPanelChrome();

  const update = () => {
    renderSequenceList();
    syncCampaignStepHeight();
    revealCampaignSequenceEnd();
  };

  if (reopening) {
    update();
    return;
  }

  updateCampaignSequenceWithTransition(update, {
    slideNames: [
      getCampaignSequenceViewTransitionName("connector", email.id),
      getCampaignSequenceViewTransitionName("item", email.id),
      getCampaignSequenceViewTransitionName("detail", email.id)
    ]
  });
}

function deleteSequenceEmail(index) {
  if (index <= 0 || campaignSequenceEmails.length <= 1) return;

  commitActiveSequenceEmailFields();
  const deletedEmailId = campaignSequenceEmails[index].id;
  campaignSequenceEmails.splice(index, 1);
  campaignSequenceEmails[0].delayDays = null;
  campaignSequenceEmails[0].triggerType = CAMPAIGN_SEQUENCE_TRIGGER_TIME;

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

function refreshSequenceEmailFields() {
  renderSequenceList();
  syncCampaignStepHeight();
}

function updateSequenceEmailDelay(index, delayDays) {
  const email = campaignSequenceEmails[index];
  if (!email || index === 0) return;

  email.triggerType = CAMPAIGN_SEQUENCE_TRIGGER_TIME;
  email.delayDays = getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_DELAYS,
    delayDays,
    CAMPAIGN_SEQUENCE_DEFAULT_DELAY
  )?.value ?? CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  refreshSequenceEmailFields();
}

function updateSequenceEmailTrigger(index, triggerType) {
  const email = campaignSequenceEmails[index];
  if (!email || index === 0) return;

  email.triggerType = triggerType === CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT
    ? CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT
    : CAMPAIGN_SEQUENCE_TRIGGER_TIME;

  if (email.triggerType === CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT) {
    email.engagementEvent = getSequenceEngagementEvent(email).value;
    email.engagementWaitDays = getCampaignSequenceOption(
      CAMPAIGN_SEQUENCE_WAIT_WINDOWS,
      email.engagementWaitDays,
      CAMPAIGN_SEQUENCE_DEFAULT_DELAY
    )?.value ?? CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  } else {
    email.delayDays = getCampaignSequenceOption(
      CAMPAIGN_SEQUENCE_DELAYS,
      email.delayDays,
      CAMPAIGN_SEQUENCE_DEFAULT_DELAY
    )?.value ?? CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  }

  refreshSequenceEmailFields();
}

function updateSequenceEmailEngagement(index, engagementEvent) {
  const email = campaignSequenceEmails[index];
  if (!email || index === 0) return;

  email.triggerType = CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT;
  email.engagementEvent = getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_ENGAGEMENT_EVENTS,
    engagementEvent,
    "opens"
  )?.value || "opens";
  if (getSequenceEngagementEvent(email).negative) {
    email.engagementWaitDays = getCampaignSequenceOption(
      CAMPAIGN_SEQUENCE_WAIT_WINDOWS,
      email.engagementWaitDays,
      CAMPAIGN_SEQUENCE_DEFAULT_DELAY
    )?.value ?? CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  }
  refreshSequenceEmailFields();
}

function updateSequenceEmailEngagementWait(index, waitDays) {
  const email = campaignSequenceEmails[index];
  if (!email || index === 0) return;

  email.triggerType = CAMPAIGN_SEQUENCE_TRIGGER_ENGAGEMENT;
  email.engagementWaitDays = getCampaignSequenceOption(
    CAMPAIGN_SEQUENCE_WAIT_WINDOWS,
    waitDays,
    CAMPAIGN_SEQUENCE_DEFAULT_DELAY
  )?.value ?? CAMPAIGN_SEQUENCE_DEFAULT_DELAY;
  refreshSequenceEmailFields();
}

function syncCampaignLevelLabels() {
  const label = isDripCampaign() ? "Sequence" : "Email";
  if (campaignLevelTitle) campaignLevelTitle.textContent = label;
  if (campaignLevelMenuLabel) campaignLevelMenuLabel.textContent = label;
}

function syncCampaignSubjectModeSubtitle() {
  const drip = isDripCampaign();
  if (campaignSubjectModeText) {
    campaignSubjectModeText.textContent = drip
      ? "Set up an email sequence, or"
      : "Set up a single email, or";
  }
  if (campaignTypeSwitchLink) {
    campaignTypeSwitchLink.textContent = drip
      ? "switch to a single email"
      : "switch to an email sequence";
  }
}

function setCampaignType(value) {
  campaignType = value === "drip" ? "drip" : CAMPAIGN_TYPE_DEFAULT;
  handleCampaignTypeChange();
}

function requestSwitchToSingleEmail() {
  commitActiveSequenceEmailFields();
  if (campaignSequenceEmails.length > 1) {
    openCampaignTypeSwitchConfirm();
    return;
  }
  setCampaignType("regular");
}

const campaignTypeSwitchConfirmApi = campaignWizardModal && window.createProtoConfirmModal
  ? window.createProtoConfirmModal({
      host: campaignWizardModal,
      onOpen() {
        campaignTypeSwitchLink?.setAttribute("aria-expanded", "true");
      },
      onClose() {
        campaignTypeSwitchLink?.setAttribute("aria-expanded", "false");
      }
    })
  : null;

function openCampaignTypeSwitchConfirm() {
  campaignTypeSwitchConfirmApi?.open({
    title: "Switch to a single email?",
    messageHtml: "Switching to a single email keeps your first email and discards the rest of the sequence. <strong>This can't be undone.</strong>",
    cancelLabel: "Cancel",
    confirmLabel: "Switch",
    confirmPlacement: "start",
    confirmVariant: "secondary",
    cancelVariant: "primary",
    trigger: campaignTypeSwitchLink,
    onConfirm() {
      setCampaignType("regular");
    }
  });
}

function closeCampaignTypeSwitchConfirm() {
  if (!campaignTypeSwitchConfirmApi?.isVisible()) return false;
  if (campaignTypeSwitchConfirmApi.isOpen()) {
    campaignTypeSwitchConfirmApi.close();
  }
  return true;
}

const campaignDiscardConfirmApi = campaignWizardModal && window.createProtoConfirmModal
  ? window.createProtoConfirmModal({
      host: campaignWizardModal
    })
  : null;

function shouldConfirmCampaignDiscard() {
  return activeCampaignStepIndex > CAMPAIGN_SETTINGS_STEP_INDEX;
}

function openCampaignDiscardConfirm() {
  closeCampaignTypeSwitchConfirm();
  campaignDiscardConfirmApi?.open({
    title: "Discard changes?",
    message: "Are you sure you want to leave?\nChanges you made will not be saved.",
    confirmLabel: "Discard",
    cancelLabel: "Cancel",
    confirmPlacement: "start",
    confirmVariant: "secondary",
    cancelVariant: "primary",
    trigger: startCampaignModal?.querySelector(".proto-modal-close"),
    onConfirm() {
      closeStartCampaignModal({ force: true });
    }
  });
}

function closeCampaignDiscardConfirm() {
  if (!campaignDiscardConfirmApi?.isVisible()) return false;
  if (campaignDiscardConfirmApi.isOpen()) {
    campaignDiscardConfirmApi.close();
  }
  return true;
}

function syncCampaignEmailPanelTitle() {
  if (!campaignEmailPanelTitle) return;
  campaignEmailPanelTitle.textContent = `Email #${activeSequenceEmailIndex + 1}`;
}

function isSequenceEmailSelected(index) {
  return !emailPanelCollapsed && index === activeSequenceEmailIndex;
}

function syncEmailPanelChrome() {
  const collapsed = emailPanelCollapsed && isDripSequenceActive();
  campaignWizardModal?.classList.toggle("is-email-panel-collapsed", collapsed);
  if (campaignStepViewport) campaignStepViewport.inert = collapsed;
  if (campaignStepTabs) campaignStepTabs.inert = collapsed;
}

/* Selection and subject changes are applied to the existing cards rather than
   re-rendering, so the card's own transitions survive and, when the sidebar is
   opening or closing, nothing competes with the modal resize. */
function syncSequenceItemChrome() {
  campaignSequenceList?.querySelectorAll(".campaign-sequence-item").forEach((item) => {
    const index = Number(item.dataset.sequenceIndex);
    const email = campaignSequenceEmails[index];
    if (!email) return;

    const selected = isSequenceEmailSelected(index);
    item.classList.toggle("is-selected", selected);
    item.querySelector(".campaign-sequence-item-summary")
      ?.setAttribute("aria-pressed", String(selected));

    // Keep the card in sync while typing so a fixed subject/design drops the
    // error outline immediately, including the selected purple ring.
    const hasError = Boolean(campaignReviewValidated && sequenceEmailHasError(email));
    item.classList.toggle("is-error", hasError);
    if (!hasError) item.classList.remove("is-error");

    const subtitle = item.querySelector(".campaign-sequence-item-subtitle");
    if (subtitle) applySequenceItemSubtitle(subtitle, email);
  });
}

function setEmailPanelCollapsed(collapsed) {
  if (emailPanelCollapsed === collapsed) return;

  if (collapsed) commitActiveSequenceEmailFields();
  emailPanelCollapsed = collapsed;
  syncEmailPanelChrome();
  syncSequenceItemChrome();
  syncCampaignStepHeight();
}

function syncDripSequenceChrome() {
  const active = isDripSequenceActive();
  campaignWizardModal?.classList.toggle("is-drip-sequence", active);
  syncCampaignLevelLabels();
  syncCampaignSubjectModeSubtitle();
  syncCampaignEmailPanelTitle();
  syncEmailPanelChrome();

  if (campaignSequencePanel) campaignSequencePanel.hidden = !active;
  if (campaignEmailPanelTitle) campaignEmailPanelTitle.hidden = !active;

  if (!active) {
    campaignWizardModal?.style.removeProperty("--campaign-step-viewport-height");
    if (campaignStepViewport) campaignStepViewport.style.height = "";
  }

  if (active) {
    if (campaignStepBody) campaignStepBody.style.height = "";
    ensureCampaignSequenceEmails();
    renderSequenceList();
    syncCampaignSequenceDotParallax();
    return;
  }

  syncCampaignSequenceDotParallax();

  if (campaignSequenceList && !isDripCampaign()) {
    campaignSequenceList.replaceChildren();
  }
}

function handleCampaignTypeChange() {
  closeCampaignTypeSwitchConfirm();

  if (isDripCampaign()) {
    ensureCampaignSequenceEmails();
    renderSequenceList();
  } else {
    discardCampaignSequenceEmails();
  }

  syncDripSequenceChrome();
  syncCampaignStepHeight({ immediate: !isDripSequenceActive() });
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

function resetCampaignTypeSelection() {
  campaignType = CAMPAIGN_TYPE_DEFAULT;
  resetCampaignSequence();
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

function formatCampaignScheduleDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultCampaignScheduleDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatCampaignScheduleDate(date);
}

function fillCampaignScheduleTimeSelect(select, { max, step, selected }) {
  if (!select) return;

  select.replaceChildren();
  for (let value = 0; value < max; value += step) {
    const option = document.createElement("option");
    const label = String(value).padStart(2, "0");
    option.value = label;
    option.textContent = label;
    option.selected = label === selected;
    select.appendChild(option);
  }
}

function resetCampaignScheduleLaterValues() {
  if (campaignScheduleDate) {
    const today = formatCampaignScheduleDate(new Date());
    campaignScheduleDate.min = today;
    campaignScheduleDate.value = getDefaultCampaignScheduleDate();
  }
  campaignScheduleHourApi?.reset(CAMPAIGN_SCHEDULE_DEFAULT_HOUR);
  campaignScheduleMinuteApi?.reset(CAMPAIGN_SCHEDULE_DEFAULT_MINUTE);
}

function syncCampaignScheduleLaterFields() {
  const showLater = getCampaignReviewScheduleValue() === "schedule-later";
  if (campaignScheduleLaterFields) campaignScheduleLaterFields.hidden = !showLater;
  if (!showLater) {
    campaignScheduleHourApi?.close();
    campaignScheduleMinuteApi?.close();
  }
  if (CAMPAIGN_STEPS[activeCampaignStepIndex]?.id === "schedule") {
    syncCampaignStepHeight();
  }
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
  resetCampaignScheduleLaterValues();
  syncCampaignScheduleOptionChrome();
  syncCampaignScheduleLaterFields();
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
    if (closeCampaignTypeSwitchConfirm()) return false;
    if (closeCampaignDiscardConfirm()) return false;
    if (closeOpenCampaignDropdown()) return false;
    if (shouldConfirmCampaignDiscard()) {
      openCampaignDiscardConfirm();
      return false;
    }
    return true;
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

function closeStartCampaignModal({ force = false } = {}) {
  if (!force && shouldConfirmCampaignDiscard()) {
    openCampaignDiscardConfirm();
    return;
  }
  closeCampaignDiscardConfirm();
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
  syncSequenceItemChrome();
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

startCampaignModal?.querySelector(".proto-modal-close")?.addEventListener("click", (event) => {
  if (!shouldConfirmCampaignDiscard()) return;
  event.preventDefault();
  event.stopPropagation();
  openCampaignDiscardConfirm();
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
  if (isDripSequenceActive()) {
    goToCampaignStep(CAMPAIGN_RECIPIENTS_STEP_INDEX);
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

campaignTypeSwitchLink?.addEventListener("click", (event) => {
  event.preventDefault();
  if (isDripCampaign()) {
    requestSwitchToSingleEmail();
    return;
  }
  setCampaignType("drip");
});

campaignSequencePanel?.addEventListener("scroll", syncCampaignSequenceDotParallax, { passive: true });

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
  if (isDripCampaign()) {
    commitActiveSequenceEmailFields();
    requestCampaignReview();
    return;
  }

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

fillCampaignScheduleTimeSelect(campaignScheduleHourSelect, {
  max: 24,
  step: 1,
  selected: CAMPAIGN_SCHEDULE_DEFAULT_HOUR
});
fillCampaignScheduleTimeSelect(campaignScheduleMinuteSelect, {
  max: 60,
  step: CAMPAIGN_SCHEDULE_MINUTE_STEP,
  selected: CAMPAIGN_SCHEDULE_DEFAULT_MINUTE
});

campaignScheduleHourApi = window.WefranchFilterCombobox.enhance(campaignScheduleHourSelect, {
  singleSelect: true,
  clearable: false,
  searchable: false
});
campaignScheduleMinuteApi = window.WefranchFilterCombobox.enhance(campaignScheduleMinuteSelect, {
  singleSelect: true,
  clearable: false,
  searchable: false
});
resetCampaignScheduleLaterValues();

campaignScheduleOptions?.addEventListener("change", () => {
  syncCampaignScheduleOptionChrome();
  syncCampaignScheduleLaterFields();
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
