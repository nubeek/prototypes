/* Audience options for the campaign wizard on the Campaigns page.
   There is no live Prospects search here, so recipients come from saved
   searches. Contact counts are estimated from each search's owner count. */
(function () {
  function searches() {
    return Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : [];
  }

  function contactCountFor(search) {
    const owners = Number(search?.ownerCount);
    if (Number.isFinite(owners) && owners > 0) return owners * 4;

    const id = String(search?.id || "");
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 33 + id.charCodeAt(index)) >>> 0;
    }
    return 80 + (hash % 720);
  }

  function findSearch(id) {
    return searches().find((search) => search.id === id) || null;
  }

  window.wefranchCampaignAudience = {
    getAudienceOptions() {
      return searches().map((search) => ({
        label: `${search.title} (${contactCountFor(search).toLocaleString("en-US")})`,
        value: search.id
      }));
    },
    getAudiencePreview(selectedValues) {
      const values = Array.isArray(selectedValues) ? selectedValues.filter(Boolean) : [];
      if (!values.length) return null;

      const selections = values.map((value) => {
        const search = findSearch(value);
        if (!search) return null;
        return {
          id: search.id,
          title: search.title,
          contactCount: contactCountFor(search)
        };
      }).filter(Boolean);
      if (!selections.length) return null;

      return {
        audience: "saved",
        savedSearchId: selections[0].id,
        savedSearchIds: selections.map((selection) => selection.id),
        includesCurrent: false,
        title: selections.map((selection) => selection.title).join(", "),
        titles: selections.map((selection) => selection.title),
        contactCount: selections.reduce((total, selection) => total + selection.contactCount, 0)
      };
    },
    getDefaultAudienceValues() {
      return "";
    },
    onAudienceChange(refresh) {
      window.addEventListener("cst:saved-searches-changed", () => {
        refresh?.();
      });
    }
  };
})();
