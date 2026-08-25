/* Saved territory searches ("Saved" tab on the crossroad splash screen) --
   Unlike CST's saved views, a territory search has no description or
   team/private visibility: user-created searches live in Saved, and
   pre-built presets live in Featured.

   filters: same shape as a crossroad preset's `filters` (see datasets.js) --
   locations/locationsExcluded, locationSearches (chips with coordinates,
   geoKey, label; used for locate-me / city / search-this-area), viewport
   {west,east,south,north} for implicit area searches, categories/categoriesExcluded,
   franchises/franchisesExcluded, statuses, geoLevels arrays, investment
   {min, max}, rating {min}, radius {enabled, miles}. Only keys that differ
   from the defaults are stored.
   datasetId: which dataset (default/large/real) the search applies to,
   since presets and brand ids differ between datasets.
   alerts: { enabled, notifyAvailable, notifyStatus, notifyBrands } or null,
   matching the territory-specific alert types (new territories available,
   status changes, new matching brands) instead of CST's alert types.
*/

const TERRITORY_SAVED_SEARCHES_STORAGE_KEY = "wefranch-territories-list-saved-searches.v1";

function createTerritorySavedSearchId() {
  return `search-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStoredTerritorySavedSearches() {
  try {
    const raw = window.localStorage?.getItem(TERRITORY_SAVED_SEARCHES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Unable to read saved territory searches.", error);
    return [];
  }
}

function writeStoredTerritorySavedSearches(searches) {
  try {
    window.localStorage?.setItem(TERRITORY_SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(searches));
  } catch (error) {
    console.warn("Unable to save territory searches.", error);
  }
}

function getActiveTerritoryDatasetId() {
  return window.territoryDatasets?.getActive?.()?.id || "real";
}

function normalizeStoredTerritorySavedSearch(entry) {
  if (!entry?.title) return null;

  return {
    id: entry.id || createTerritorySavedSearchId(),
    datasetId: entry.datasetId || getActiveTerritoryDatasetId(),
    title: entry.title,
    filters: entry.filters && typeof entry.filters === "object" ? entry.filters : {},
    alerts: entry.alerts?.enabled ? {
      enabled: true,
      notifyAvailable: Boolean(entry.alerts.notifyAvailable),
      notifyStatus: Boolean(entry.alerts.notifyStatus),
      notifyBrands: Boolean(entry.alerts.notifyBrands)
    } : null,
    createdAt: entry.createdAt || new Date().toISOString()
  };
}

let territorySavedSearches = readStoredTerritorySavedSearches()
  .map(normalizeStoredTerritorySavedSearch)
  .filter(Boolean);

function persistTerritorySavedSearches() {
  writeStoredTerritorySavedSearches(territorySavedSearches);
  window.dispatchEvent(new CustomEvent("territory:saved-searches-changed"));
}

function getTerritorySavedSearches(datasetId = null) {
  return territorySavedSearches
    .filter((search) => !datasetId || search.datasetId === datasetId)
    .map((search) => ({ ...search }));
}

function getTerritorySavedSearchById(id) {
  const search = territorySavedSearches.find((entry) => entry.id === id);
  return search ? { ...search } : null;
}

function createTerritorySavedSearch(details = {}) {
  const search = normalizeStoredTerritorySavedSearch({
    ...details,
    id: createTerritorySavedSearchId(),
    datasetId: details.datasetId || getActiveTerritoryDatasetId(),
    createdAt: new Date().toISOString()
  });
  if (!search) return null;

  territorySavedSearches = [search, ...territorySavedSearches];
  persistTerritorySavedSearches();
  return { ...search };
}

// Editing a saved search only updates its title/alerts, matching CST: the
// filters snapshot stays as it was when the search was first saved.
function updateTerritorySavedSearch(id, updates = {}) {
  const index = territorySavedSearches.findIndex((entry) => entry.id === id);
  if (index === -1) return null;

  const current = territorySavedSearches[index];
  const merged = normalizeStoredTerritorySavedSearch({
    ...current,
    title: updates.title !== undefined ? updates.title : current.title,
    alerts: updates.alerts !== undefined ? updates.alerts : current.alerts
  });
  if (!merged) return null;

  territorySavedSearches = [
    ...territorySavedSearches.slice(0, index),
    merged,
    ...territorySavedSearches.slice(index + 1)
  ];
  persistTerritorySavedSearches();
  return { ...merged };
}

function removeTerritorySavedSearch(id) {
  const search = territorySavedSearches.find((entry) => entry.id === id);
  if (!search) return null;

  territorySavedSearches = territorySavedSearches.filter((entry) => entry.id !== id);
  persistTerritorySavedSearches();
  return { ...search };
}

window.territorySavedSearchStore = {
  getAll: getTerritorySavedSearches,
  getById: getTerritorySavedSearchById,
  create: createTerritorySavedSearch,
  update: updateTerritorySavedSearch,
  remove: removeTerritorySavedSearch
};
