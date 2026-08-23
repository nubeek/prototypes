// Saved searches shown as tiles on the splash screen. Each entry stores the
// same values the filter panel holds, so opening a tile is identical to the
// user re-applying that query by hand.
//
// filters:
//   search        free-text query (matches the toolbar search field)
//   locations     location labels, e.g. "Omaha, Nebraska"
//   categories    category names
//   franchises    franchise/brand names
//   franchisees   franchisee indexes (matches the Franchisees filter)
//   owners        legacy alias for franchisees
//   units         { min, max } unit count range; omit a bound to keep the default
//   contacts      { min, max } contact count range
// scope: "private" | "team" | "public" — used by the splash category tabs.
// Bundled (hardcoded) queries are always public so they show under Public
// after a localStorage clear. User-created views keep the chosen visibility.
// snapshot: pre-rendered map image. Regenerate with:
//   node _prototypes/cst/scripts/generate-splash-snapshots.js
// view: which table the search opens in ("franchisees" | "candidates" | "locations")
// ownerCount / unitCount: metrics captured when the search was saved. Splash
//   tiles recompute from the loaded roster, so these are informational only.

const CST_SAVED_SEARCHES_STORAGE_KEY = "cst.savedSearches.v1";
const CST_DELETED_SAVED_SEARCHES_STORAGE_KEY = "cst.deletedSavedSearches.v1";
const CST_SAVED_SEARCH_SCOPES = new Set(["private", "team", "public"]);

function normalizeStoredCstSavedSearch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const id = String(value.id || "").trim();
  const title = String(value.title || "").trim();
  const scope = String(value.scope || "").trim().toLowerCase();
  if (!id || !title || !CST_SAVED_SEARCH_SCOPES.has(scope)) return null;

  const savedSearch = {
    id,
    title,
    description: String(value.description || "").trim(),
    scope,
    view: ({
      owners: "franchisees",
      userProfiles: "candidates"
    })[String(value.view || "franchisees").trim()] || String(value.view || "franchisees").trim() || "franchisees",
    filters: value.filters && typeof value.filters === "object" && !Array.isArray(value.filters)
      ? value.filters
      : {}
  };
  const ownerCount = Number(value.ownerCount);
  const unitCount = Number(value.unitCount);

  if (Number.isFinite(ownerCount)) savedSearch.ownerCount = ownerCount;
  if (Number.isFinite(unitCount)) savedSearch.unitCount = unitCount;
  if (value.createdAt) savedSearch.createdAt = String(value.createdAt);
  if (value.snapshot) savedSearch.snapshot = String(value.snapshot);
  if (value.alerts?.enabled) {
    savedSearch.alerts = {
      enabled: true,
      notifyAdded: Boolean(value.alerts.notifyAdded),
      notifyModified: Boolean(value.alerts.notifyModified)
    };
  }

  return savedSearch;
}

function readStoredCstSavedSearches() {
  try {
    const storedValue = window.localStorage?.getItem(CST_SAVED_SEARCHES_STORAGE_KEY);
    if (!storedValue) return [];

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue.map(normalizeStoredCstSavedSearch).filter(Boolean)
      : [];
  } catch (error) {
    console.warn("Unable to read saved CST searches.", error);
    return [];
  }
}

function writeStoredCstSavedSearches(savedSearches) {
  try {
    window.localStorage?.setItem(CST_SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(savedSearches));
    return true;
  } catch (error) {
    console.warn("Unable to save the CST search.", error);
    return false;
  }
}

function readDeletedCstSavedSearchIds() {
  try {
    const storedValue = window.localStorage?.getItem(CST_DELETED_SAVED_SEARCHES_STORAGE_KEY);
    if (!storedValue) return [];

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? [...new Set(parsedValue.map(String).filter(Boolean))]
      : [];
  } catch (error) {
    console.warn("Unable to read deleted CST searches.", error);
    return [];
  }
}

function writeDeletedCstSavedSearchIds(searchIds) {
  try {
    window.localStorage?.setItem(
      CST_DELETED_SAVED_SEARCHES_STORAGE_KEY,
      JSON.stringify([...new Set(searchIds.map(String).filter(Boolean))])
    );
    return true;
  } catch (error) {
    console.warn("Unable to delete the CST search.", error);
    return false;
  }
}

function createCstSavedSearchId(title) {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "view";
  const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `saved-${slug}-${uniquePart}`;
}

const CST_SAVED_SEARCH_MIDWEST_STATES = [
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Michigan",
  "Minnesota",
  "Missouri",
  "Nebraska",
  "Ohio",
  "Wisconsin"
];

const CST_SAVED_SEARCH_SOUTHEAST_STATES = [
  "Alabama",
  "Florida",
  "Georgia",
  "Kentucky",
  "North Carolina",
  "South Carolina",
  "Tennessee"
];

const CST_BUNDLED_SAVED_SEARCHES = [
  {
    id: "texas-restaurant-groups",
    title: "Texas Restaurant Groups",
    scope: "public",
    view: "franchisees",
    ownerCount: 24,
    snapshot: "assets/snapshots/texas-restaurant-groups.jpg",
    filters: {
      locations: ["Texas"],
      categories: ["Food and Beverage"]
    }
  },
  {
    id: "midwest-operator-groups",
    title: "Midwest Operator Groups",
    scope: "public",
    view: "franchisees",
    ownerCount: 51,
    snapshot: "assets/snapshots/midwest-operator-groups.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_MIDWEST_STATES
    }
  },
  {
    id: "southeast-groups-at-scale",
    title: "Southeast Groups at Scale",
    scope: "public",
    view: "franchisees",
    ownerCount: 21,
    snapshot: "assets/snapshots/southeast-groups-at-scale.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_SOUTHEAST_STATES,
      units: { min: 100 }
    }
  },
  {
    id: "popeyes-operators",
    title: "Popeyes Operators",
    scope: "public",
    view: "franchisees",
    ownerCount: 17,
    snapshot: "assets/snapshots/popeyes-operators.jpg",
    filters: {
      franchises: ["Popeyes Louisiana Kitchen"]
    }
  },
  {
    id: "coffee-and-bakery-brands",
    title: "Coffee and Bakery Brands",
    scope: "public",
    view: "franchisees",
    ownerCount: 19,
    snapshot: "assets/snapshots/coffee-and-bakery-brands.jpg",
    filters: {
      franchises: ["Dunkin'", "Panera Bread", "Tim Hortons"]
    }
  },
  {
    id: "fitness-groups",
    title: "Fitness Groups",
    scope: "public",
    view: "franchisees",
    ownerCount: 8,
    snapshot: "assets/snapshots/fitness-groups.jpg",
    filters: {
      categories: ["Fitness"]
    }
  },
  {
    id: "wellness-operators",
    title: "Wellness Operators",
    scope: "public",
    view: "franchisees",
    ownerCount: 10,
    snapshot: "assets/snapshots/wellness-operators.jpg",
    filters: {
      categories: ["Health & Wellness"]
    }
  },
  {
    id: "national-scale-groups",
    title: "200+ Unit Groups",
    scope: "public",
    view: "franchisees",
    ownerCount: 9,
    snapshot: "assets/snapshots/national-scale-groups.jpg",
    filters: {
      units: { min: 200 }
    }
  },
  {
    id: "california-midsize-groups",
    title: "California Mid-Size Groups",
    scope: "public",
    view: "franchisees",
    ownerCount: 15,
    snapshot: "assets/snapshots/california-midsize-groups.jpg",
    filters: {
      locations: ["California"],
      units: { min: 50 }
    }
  }
];

const storedCstSavedSearches = readStoredCstSavedSearches();
const deletedCstSavedSearchIds = new Set(readDeletedCstSavedSearchIds());
const bundledCstSavedSearchIds = new Set(CST_BUNDLED_SAVED_SEARCHES.map((savedSearch) => savedSearch.id));
const storedCstSavedSearchById = new Map(
  storedCstSavedSearches.map((savedSearch) => [savedSearch.id, savedSearch])
);

window.cstSavedSearchesData = [
  ...storedCstSavedSearches.filter((savedSearch) => !bundledCstSavedSearchIds.has(savedSearch.id)),
  ...CST_BUNDLED_SAVED_SEARCHES
    .filter((savedSearch) => !deletedCstSavedSearchIds.has(savedSearch.id))
    .map((savedSearch) => storedCstSavedSearchById.get(savedSearch.id) || savedSearch)
];

window.cstSavedSearchStore = {
  isBundled(searchId) {
    return bundledCstSavedSearchIds.has(searchId);
  },
  canEdit(searchId) {
    return Boolean(searchId) && !bundledCstSavedSearchIds.has(searchId);
  },
  create(value) {
    const title = String(value?.title || "").trim();
    const savedSearch = normalizeStoredCstSavedSearch({
      ...value,
      id: createCstSavedSearchId(title),
      title,
      createdAt: new Date().toISOString()
    });
    if (!savedSearch) return null;

    const nextStoredSearches = [
      savedSearch,
      ...readStoredCstSavedSearches().filter((entry) => entry.id !== savedSearch.id)
    ];
    if (!writeStoredCstSavedSearches(nextStoredSearches)) return null;

    const currentSearches = Array.isArray(window.cstSavedSearchesData)
      ? window.cstSavedSearchesData
      : [];
    window.cstSavedSearchesData = [
      savedSearch,
      ...currentSearches.filter((entry) => entry.id !== savedSearch.id)
    ];
    window.dispatchEvent(new CustomEvent("cst:saved-searches-changed", {
      detail: { savedSearch }
    }));

    return savedSearch;
  },

  update(searchId, value) {
    const currentSearches = Array.isArray(window.cstSavedSearchesData)
      ? window.cstSavedSearchesData
      : [];
    const currentSearch = currentSearches.find((entry) => entry.id === searchId);
    if (!currentSearch) return null;

    const savedSearch = normalizeStoredCstSavedSearch({
      ...currentSearch,
      ...value,
      id: currentSearch.id
    });
    if (!savedSearch) return null;

    const storedSearches = readStoredCstSavedSearches();
    const storedIndex = storedSearches.findIndex((entry) => entry.id === searchId);
    const nextStoredSearches = storedSearches.slice();
    if (storedIndex === -1) {
      nextStoredSearches.push(savedSearch);
    } else {
      nextStoredSearches[storedIndex] = savedSearch;
    }
    if (!writeStoredCstSavedSearches(nextStoredSearches)) return null;

    window.cstSavedSearchesData = currentSearches.map((entry) => (
      entry.id === searchId ? savedSearch : entry
    ));
    window.dispatchEvent(new CustomEvent("cst:saved-searches-changed", {
      detail: { savedSearch, type: "update" }
    }));

    return savedSearch;
  },

  remove(searchId) {
    const currentSearches = Array.isArray(window.cstSavedSearchesData)
      ? window.cstSavedSearchesData
      : [];
    const savedSearch = currentSearches.find((entry) => entry.id === searchId);
    if (!savedSearch) return null;

    if (bundledCstSavedSearchIds.has(searchId)) {
      const deletedIds = readDeletedCstSavedSearchIds();
      if (!writeDeletedCstSavedSearchIds([...deletedIds, searchId])) return null;
    }

    const nextStoredSearches = readStoredCstSavedSearches().filter(
      (entry) => entry.id !== searchId
    );
    if (!writeStoredCstSavedSearches(nextStoredSearches)) return null;

    window.cstSavedSearchesData = currentSearches.filter((entry) => entry.id !== searchId);
    window.dispatchEvent(new CustomEvent("cst:saved-searches-changed", {
      detail: { savedSearch, type: "remove" }
    }));

    return savedSearch;
  }
};
