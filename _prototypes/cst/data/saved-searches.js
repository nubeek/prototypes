// Saved searches shown as tiles on the splash screen. Each entry stores the
// same values the filter panel holds, so opening a tile is identical to the
// user re-applying that query by hand.
//
// filters:
//   search        free-text query (matches the toolbar search field)
//   locations     location labels, e.g. "Omaha, Nebraska"
//   categories    category names
//   franchises    franchise/brand names
//   owners        owner indexes (matches the Owners filter)
//   units         { min, max } unit count range; omit a bound to keep the default
//   contacts      { min, max } contact count range
// scope: "private" | "team" | "public" — used by the splash category tabs
// snapshot: pre-rendered map image. Regenerate with:
//   node _prototypes/cst/scripts/generate-splash-snapshots.js
// view: which table the search opens in ("owners" | "locations")
// ownerCount / unitCount: splash tile metrics; keep in sync when filters change

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
    view: String(value.view || "owners").trim() || "owners",
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

const CST_SAVED_SEARCH_MIDWEST_LOCATIONS = [
  "Omaha, Nebraska",
  "Lincoln, Nebraska",
  "Minneapolis, Minnesota",
  "Madison, Wisconsin",
  "Peoria, Illinois",
  "St. Louis, Missouri",
  "Kansas City, Missouri",
  "Wichita, Kansas",
  "Fargo, North Dakota"
];

const CST_SAVED_SEARCH_SOUTHEAST_LOCATIONS = [
  "Atlanta, Georgia",
  "Macon, Georgia",
  "Charlotte, North Carolina",
  "Greensboro, North Carolina",
  "Asheville, North Carolina",
  "Columbia, South Carolina",
  "Nashville, Tennessee",
  "Memphis, Tennessee",
  "Birmingham, Alabama",
  "Montgomery, Alabama",
  "Orlando, Florida",
  "Ocala, Florida",
  "Louisville, Kentucky"
];

const CST_SAVED_SEARCH_NORTH_AMERICA_LOCATIONS = [
  "Toronto, Ontario",
  "Ottawa, Ontario",
  "Montreal, Quebec",
  "Quebec City, Quebec",
  "Vancouver, British Columbia",
  "Calgary, Alberta",
  "Edmonton, Alberta",
  "Winnipeg, Manitoba",
  "Mexico City, Mexico",
  "Monterrey, Nuevo Leon",
  "Guadalajara, Jalisco",
  "Tijuana, Baja California",
  "Queretaro, Queretaro",
  "Puebla, Puebla",
  "Hermosillo, Sonora",
  "Chihuahua, Chihuahua",
  "Oaxaca, Oaxaca"
];

const CST_BUNDLED_SAVED_SEARCHES = [
  {
    id: "planet-fitness-at-scale",
    title: "Planet Fitness at scale",
    scope: "team",
    ownerCount: 6,
    snapshot: "assets/snapshots/planet-fitness-at-scale.jpg",
    filters: {
      franchises: ["Planet Fitness"],
      units: { min: 100 }
    }
  },
  {
    id: "midwest-operator-groups",
    title: "Midwest operator groups",
    scope: "private",
    ownerCount: 15,
    snapshot: "assets/snapshots/midwest-operator-groups.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_MIDWEST_LOCATIONS
    }
  },
  {
    id: "southeast-expansion",
    title: "Southeast expansion targets",
    scope: "team",
    ownerCount: 11,
    snapshot: "assets/snapshots/southeast-expansion.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_SOUTHEAST_LOCATIONS
    }
  },
  {
    id: "boutique-studio-operators",
    title: "Boutique studio operators",
    scope: "private",
    ownerCount: 7,
    snapshot: "assets/snapshots/boutique-studio-operators.jpg",
    filters: {
      franchises: ["Club Pilates", "F45 Training", "Orangetheory", "Anytime Fitness"]
    }
  },
  {
    id: "deep-contact-rosters",
    title: "Deep contact rosters",
    scope: "team",
    ownerCount: 9,
    snapshot: "assets/snapshots/deep-contact-rosters.jpg",
    filters: {
      contacts: { min: 9 }
    }
  },
  {
    id: "canada-and-mexico-units",
    title: "Canada & Mexico units",
    scope: "private",
    ownerCount: 11,
    unitCount: 739,
    snapshot: "assets/snapshots/canada-and-mexico-units.jpg",
    view: "locations",
    filters: {
      locations: CST_SAVED_SEARCH_NORTH_AMERICA_LOCATIONS
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
