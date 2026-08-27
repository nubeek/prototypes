const START_CAMPAIGN_AUDIENCE_CURRENT = "current";
const START_CAMPAIGN_RECIPIENT_LIMIT = 500;
const CAMPAIGN_SENDERS = {
  "philip.litassy@wefanch.com": "Philip Litassy",
  "gregory.ugwi@wefranch.com": "Gregory Ugwi"
};

const campaignSenderModal = document.getElementById("campaignSenderModal");
const campaignSenderModalForm = document.getElementById("campaignSenderModalForm");
const campaignSenderEmailField = document.getElementById("campaignSenderEmailField");
const campaignSenderEmailSelect = document.getElementById("campaignSenderEmailSelect");
const campaignSenderName = document.getElementById("campaignSenderName");
const campaignSenderContinue = document.getElementById("campaignSenderContinue");
const startCampaignModal = document.getElementById("startCampaignModal");
const startCampaignModalForm = document.getElementById("startCampaignModalForm");
const startCampaignOption = document.getElementById("startCampaignOption");
const startCampaignAudienceField = document.getElementById("startCampaignAudienceField");
const startCampaignAudienceSelect = document.getElementById("startCampaignAudienceSelect");
const startCampaignPreview = document.getElementById("startCampaignPreview");
const startCampaignRecipientCount = document.getElementById("startCampaignRecipientCount");
const startCampaignRemainingCount = document.getElementById("startCampaignRemainingCount");
const startCampaignProgress = document.getElementById("startCampaignProgress");
const startCampaignProgressFill = document.getElementById("startCampaignProgressFill");
const startCampaignProgressOver = document.getElementById("startCampaignProgressOver");
const startCampaignContinue = document.getElementById("startCampaignContinue");

let campaignSenderEmailApi = null;
let campaignSenderDraft = null;
let shouldOpenStartCampaignAfterSender = false;
let startCampaignAudienceApi = null;
let startCampaignDraft = null;

function closeCampaignSenderDropdown() {
  campaignSenderEmailApi?.close();
}

function isCampaignSenderDropdownOpen() {
  return Boolean(campaignSenderEmailField?.classList.contains("is-open"));
}

function getCampaignSenderSelection() {
  const emailAddress = campaignSenderEmailApi?.getValue()
    || window.WefranchFilterCombobox.getValue(campaignSenderEmailSelect);
  const name = String(campaignSenderName?.value || "").trim();

  if (!CAMPAIGN_SENDERS[emailAddress] || !name) return null;
  return { emailAddress, name };
}

function syncCampaignSenderContinue() {
  if (!campaignSenderContinue) return;
  campaignSenderContinue.disabled = !getCampaignSenderSelection();
}

function syncCampaignSenderName() {
  if (!campaignSenderName) return;

  const emailAddress = campaignSenderEmailApi?.getValue()
    || window.WefranchFilterCombobox.getValue(campaignSenderEmailSelect);
  campaignSenderName.value = CAMPAIGN_SENDERS[emailAddress] || "";
  syncCampaignSenderContinue();
}

function resetCampaignSenderModal() {
  closeCampaignSenderDropdown();
  campaignSenderEmailApi?.reset("");
  if (campaignSenderName) campaignSenderName.value = "";
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

function syncStartCampaignContinue(canContinue) {
  if (!startCampaignContinue) return;
  startCampaignContinue.disabled = !canContinue;
}

function syncStartCampaignAudienceState() {
  syncStartCampaignAudienceOptions();

  const selectedValues = getSelectedAudienceValues();
  const preview = buildCampaignAudiencePreview(selectedValues);

  startCampaignDraft = preview;
  renderStartCampaignPreview(preview);
  syncStartCampaignContinue(Boolean(preview));
}

function resetStartCampaignModal() {
  closeStartCampaignDropdowns();
  syncStartCampaignAudienceOptions();
  startCampaignAudienceApi?.reset("");
  startCampaignDraft = null;
  syncStartCampaignAudienceState();
}

const startCampaignModalApi = window.createProtoModal({
  overlay: startCampaignModal,
  closeSelectors: ".proto-modal-close, .proto-modal-cancel",
  onBeforeClose() {
    closeStartCampaignDropdowns();
  },
  onClose() {
    resetStartCampaignModal();
  },
  shouldCloseOnEscape() {
    if (isStartCampaignDropdownOpen()) {
      closeStartCampaignDropdowns();
      return false;
    }
    return true;
  },
  getFocusElement() {
    return startCampaignModal?.querySelector(".proto-modal-close");
  }
});

function closeStartCampaignModal() {
  startCampaignModalApi.close();
}

function openStartCampaignModal(trigger = null) {
  if (!startCampaignModal) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");
  resetStartCampaignModal();
  startCampaignModalApi.open(trigger);
}

const campaignSenderModalApi = window.createProtoModal({
  overlay: campaignSenderModal,
  closeSelectors: ".proto-modal-close, .proto-modal-cancel",
  onBeforeClose() {
    closeCampaignSenderDropdown();
  },
  onClose() {
    const shouldContinue = shouldOpenStartCampaignAfterSender;
    shouldOpenStartCampaignAfterSender = false;
    resetCampaignSenderModal();

    if (shouldContinue) {
      openStartCampaignModal(startCampaignOption);
    }
  },
  shouldCloseOnEscape() {
    if (isCampaignSenderDropdownOpen()) {
      closeCampaignSenderDropdown();
      return false;
    }
    return true;
  },
  getFocusElement() {
    return document.getElementById("campaignSenderEmailInput")
      || campaignSenderModal?.querySelector(".proto-modal-close");
  }
});

function closeCampaignSenderModal() {
  campaignSenderModalApi.close();
}

function openCampaignSenderModal(trigger = null) {
  if (!campaignSenderModal) return;

  document.getElementById("outreachBtn")?.removeAttribute("open");
  campaignSenderDraft = null;
  window.cstCampaignSender = null;
  shouldOpenStartCampaignAfterSender = false;
  resetCampaignSenderModal();
  campaignSenderModalApi.open(trigger);
}

campaignSenderEmailApi = window.WefranchFilterCombobox.enhance(campaignSenderEmailSelect, {
  singleSelect: true,
  clearable: true,
  searchable: false
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

startCampaignOption?.addEventListener("click", (event) => {
  event.preventDefault();
  openCampaignSenderModal(startCampaignOption);
});

campaignSenderModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const sender = getCampaignSenderSelection();
  if (!sender) return;

  campaignSenderDraft = sender;
  window.cstCampaignSender = { ...sender };
  shouldOpenStartCampaignAfterSender = true;
  closeCampaignSenderModal();
});

startCampaignModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (startCampaignContinue?.disabled) return;

  const draft = buildCampaignAudiencePreview(getSelectedAudienceValues());
  if (!draft) return;

  window.cstCampaignDraft = {
    ...draft,
    sender: campaignSenderDraft ? { ...campaignSenderDraft } : null
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

window.cstCampaignSenderModal = {
  close: closeCampaignSenderModal,
  isVisible: () => campaignSenderModalApi.isVisible(),
  open: openCampaignSenderModal
};
