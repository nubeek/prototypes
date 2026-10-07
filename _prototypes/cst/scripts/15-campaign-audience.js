/* Prospects audience adapter for the shared campaign wizard.
   Current search uses the live filtered roster. Saved searches use the
   splash match cache, the same counts the wizard showed before it moved. */
(function () {
  const CURRENT = "current";

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
      audience: CURRENT,
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

  function contactCountForSavedSearch(search) {
    const matches = window.cstSplash?.getMatchCounts?.(search) || {};
    return Number.isFinite(matches.contactCount) ? matches.contactCount : 0;
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

    const selections = savedSearches.map((savedSearch) => ({
      id: savedSearch.id,
      title: savedSearch.title,
      contactCount: contactCountForSavedSearch(savedSearch)
    }));

    return {
      savedSearchId: selections[0].id,
      savedSearchIds: selections.map((selection) => selection.id),
      title: selections.map((selection) => selection.title).join(", "),
      titles: selections.map((selection) => selection.title),
      contactCount: selections.reduce((total, selection) => total + selection.contactCount, 0)
    };
  }

  function getAudienceOptions() {
    const savedSearchOptions = getUserSavedSearches().map((search) => ({
      label: `${search.title} (${contactCountForSavedSearch(search).toLocaleString("en-US")})`,
      value: search.id
    }));
    const current = getCurrentSearchAudience();

    return [
      {
        label: `Current search (${current.contactCount.toLocaleString("en-US")})`,
        value: CURRENT
      },
      ...(savedSearchOptions.length ? [{ divider: true }, ...savedSearchOptions] : [])
    ];
  }

  function getAudiencePreview(selectedValues) {
    if (!selectedValues?.length) return null;

    let contactCount = 0;
    const titles = [];
    const savedSearchIds = [];
    let includesCurrent = false;

    selectedValues.forEach((value) => {
      if (value === CURRENT) {
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
        ? (savedSearchIds.length ? "mixed" : CURRENT)
        : "saved",
      savedSearchId: savedSearchIds[0] || null,
      savedSearchIds,
      includesCurrent,
      title: titles.join(", "),
      titles,
      contactCount
    };
  }

  window.wefranchCampaignAudience = {
    getAudienceOptions,
    getAudiencePreview,
    getDefaultAudienceValues() {
      return CURRENT;
    },
    onAudienceChange(refresh) {
      window.addEventListener("cst:saved-searches-changed", () => {
        refresh?.();
      });
    },
    onComplete(draft) {
      const record = window.WefranchCampaignsStore?.create?.(draft);
      const name = record?.name || draft?.name || "Campaign";
      const scheduled = (record?.status || draft?.status) === "scheduled";
      window.WefranchToast?.show({
        message: scheduled ? `${name} scheduled.` : `${name} is sending.`,
        action: { label: "View campaigns", href: "../campaigns/" }
      });
    }
  };
})();
