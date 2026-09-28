(function () {
  const VIEW_ALIASES = {
    owners: "franchisees",
    userProfiles: "candidates"
  };

  function normalizeView(view) {
    const key = String(view || "").trim();
    return VIEW_ALIASES[key] || key || "franchisees";
  }

  function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase();
  }

  function stringList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }
    if (value && typeof value === "object" && Array.isArray(value.included)) {
      return stringList(value.included);
    }
    return [];
  }

  function excludedList(filters, key, excludedKey) {
    const direct = filters?.[excludedKey];
    if (Array.isArray(direct)) return stringList(direct);
    const nested = filters?.[key];
    if (nested && typeof nested === "object" && Array.isArray(nested.excluded)) {
      return stringList(nested.excluded);
    }
    return [];
  }

  function locationLabels(filters, key, excludedKey) {
    const labels = stringList(filters?.[key]);
    const searches = Array.isArray(filters?.[excludedKey ? "locationSearchesExcluded" : "locationSearches"])
      ? filters[excludedKey ? "locationSearchesExcluded" : "locationSearches"]
      : [];
    searches.forEach((search) => {
      const label = String(search?.label || "").trim();
      if (label) labels.push(label);
    });
    return [...new Set(labels)];
  }

  function includedLocations(filters) {
    const labels = stringList(filters?.locations);
    const searches = Array.isArray(filters?.locationSearches) ? filters.locationSearches : [];
    searches.forEach((search) => {
      const label = String(search?.label || "").trim();
      if (label) labels.push(label);
    });
    return [...new Set(labels)];
  }

  function excludedLocations(filters) {
    return locationLabels(filters, "locationsExcluded", "locationsExcluded");
  }

  function categoryIds(filters, key) {
    const values = key === "excluded"
      ? excludedList(filters, "categories", "categoriesExcluded")
      : stringList(filters?.categories);
    return window.WefranchCategories?.resolveFilterValues?.(values, { source: "cst" }) || values;
  }

  function recordCategoryIds(record) {
    return window.WefranchCategories?.getRecordIds?.(record) || [];
  }

  function recordFranchises(record) {
    if (Array.isArray(record?.franchises) && record.franchises.length) {
      return [...new Set(record.franchises.map((name) => String(name || "").trim()).filter(Boolean))];
    }
    return [...new Set(
      String(record?.franchise || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    )];
  }

  function finiteBound(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function matchesRange(value, range) {
    if (!range || typeof range !== "object") return true;
    const count = Number(value);
    if (!Number.isFinite(count)) return false;
    const min = finiteBound(range.min);
    const max = finiteBound(range.max);
    if (min != null && count < min) return false;
    if (max != null && count > max) return false;
    return true;
  }

  function locationLabelMatches(recordLabel, filterLabel) {
    const record = normalizeText(recordLabel);
    const filter = normalizeText(filterLabel);
    if (!record || !filter) return false;
    if (record === filter) return true;
    return record.split(",").pop().trim() === filter;
  }

  function matchesLocationList(labels, filters) {
    const included = includedLocations(filters);
    const excluded = excludedLocations(filters);
    if (excluded.length && labels.some((label) => (
      excluded.some((filterLabel) => locationLabelMatches(label, filterLabel))
    ))) {
      return false;
    }
    if (!included.length) return true;
    return labels.some((label) => (
      included.some((filterLabel) => locationLabelMatches(label, filterLabel))
    ));
  }

  function matchesCategoryList(record, filters) {
    const ids = recordCategoryIds(record);
    const excluded = categoryIds(filters, "excluded");
    const included = categoryIds(filters, "included");
    if (ids.some((id) => excluded.includes(id))) return false;
    if (!included.length) return true;
    return ids.some((id) => included.includes(id));
  }

  function matchesFranchiseList(record, filters) {
    const names = recordFranchises(record);
    const excluded = excludedList(filters, "franchises", "franchisesExcluded");
    const included = stringList(filters?.franchises);
    if (names.some((name) => excluded.includes(name))) return false;
    if (!included.length) return true;
    return names.some((name) => included.includes(name));
  }

  function matchesSearchText(record, filters) {
    const query = normalizeText(filters?.search);
    if (!query) return true;
    const haystack = [
      record?.name,
      record?.ownerName,
      record?.contactName,
      record?.email,
      record?.location,
      record?.label,
      record?.franchise,
      record?.institution,
      window.WefranchCategories?.getRecordLabel?.(record),
      ...recordFranchises(record),
      ...recordCategoryIds(record)
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(query);
  }

  function matchesFranchiseeId(owner, filters) {
    const index = owner?.originalIndex;
    const excluded = excludedList(filters, "franchisees", "franchiseesExcluded")
      .concat(excludedList(filters, "owners", "ownersExcluded"))
      .map(Number);
    const included = stringList(filters?.franchisees || filters?.owners).map(Number);
    if (excluded.includes(index)) return false;
    if (!included.length) return true;
    return included.includes(index);
  }

  function getOwners() {
    return (window.ownersData || []).map((owner, index) => ({
      ...owner,
      originalIndex: index
    }));
  }

  function getOwnerUnits(owner) {
    const locationData = window.ownerLocationsData?.[owner.originalIndex];
    const units = Array.isArray(locationData?.units) ? locationData.units : [];
    return units.map((unit) => ({
      ...unit,
      franchises: Array.isArray(unit.franchises) && unit.franchises.length
        ? unit.franchises
        : [unit.franchise].filter(Boolean),
      location: unit.label || unit.location || ""
    }));
  }

  function getProspectRows(view) {
    const rows = window.prospectDatasetsData?.[view]?.rows;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
      const hydrated = window.WefranchCategories?.hydrateRecord?.(row, { source: "cst" }) || row;
      return {
        ...row,
        sourceView: view,
        categoryId: hydrated.categoryId || null,
        categoryIds: hydrated.categoryId ? [hydrated.categoryId] : [],
        franchises: recordFranchises(row)
      };
    });
  }

  function ownerMatchesFranchiseeSearch(owner, filters) {
    if (!matchesSearchText(owner, filters)) return false;
    if (!matchesLocationList(getOwnerUnits(owner).map((unit) => unit.location), filters)) return false;
    if (!matchesCategoryList(owner, filters)) return false;
    if (!matchesFranchiseList(owner, filters)) return false;
    if (!matchesRange(owner.unitCount, filters?.units)) return false;
    if (!matchesRange(owner.contactCount, filters?.contacts)) return false;
    return matchesFranchiseeId(owner, filters);
  }

  function unitMatchesLocationSearch(unit, filters) {
    if (!matchesSearchText(unit, filters)) return false;
    if (!matchesLocationList([unit.location], filters)) return false;
    if (!matchesCategoryList(unit, filters)) return false;
    return matchesFranchiseList(unit, filters);
  }

  function ownerMatchesLocationsSearch(owner, filters) {
    if (!matchesFranchiseeId(owner, filters)) return false;
    if (!matchesRange(owner.unitCount, filters?.units)) return false;
    if (!matchesRange(owner.contactCount, filters?.contacts)) return false;
    return getOwnerUnits(owner).some((unit) => unitMatchesLocationSearch(unit, filters));
  }

  function prospectRowMatches(row, filters) {
    if (!matchesSearchText(row, filters)) return false;
    if (!matchesLocationList([row.location], filters)) return false;
    if (!matchesCategoryList(row, filters)) return false;
    return matchesFranchiseList(row, filters);
  }

  function leadMatchesSavedSearch(lead, savedSearch) {
    if (!lead || lead.source !== "cst" || !savedSearch) return false;

    const parsed = window.WefranchLeadsStore?.parseSourceId?.(lead.id);
    const view = normalizeView(savedSearch.view);
    const filters = savedSearch.filters || {};

    if (parsed?.kind === "owner") {
      const owner = getOwners().find((item) => item.originalIndex === parsed.ownerIndex);
      if (!owner) return false;
      if (view === "locations") return ownerMatchesLocationsSearch(owner, filters);
      if (view === "franchisees") return ownerMatchesFranchiseeSearch(owner, filters);
      return false;
    }

    if (parsed?.kind === "prospect") {
      const sourceView = String(parsed.prospectRowKey || "").split(":")[0];
      const rowId = String(parsed.prospectRowKey || "").split(":").slice(1).join(":");
      if (normalizeView(sourceView) !== view) return false;
      const row = getProspectRows(view).find((item) => item.id === rowId);
      if (!row) return false;
      return prospectRowMatches(row, filters);
    }

    return false;
  }

  function listSavedSearches() {
    const searches = Array.isArray(window.cstSavedSearchesData) ? window.cstSavedSearchesData : [];
    return searches
      .filter((search) => search?.id && search?.title)
      .slice()
      .sort((left, right) => String(left.title).localeCompare(String(right.title), undefined, { sensitivity: "base" }));
  }

  function getIdsForLead(lead) {
    return listSavedSearches()
      .filter((search) => leadMatchesSavedSearch(lead, search))
      .map((search) => search.id);
  }

  window.WefranchLeadSavedSearches = {
    list: listSavedSearches,
    getIdsForLead,
    leadMatchesSavedSearch
  };
})();
