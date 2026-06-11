const tableBody = document.getElementById("ownersTableBody");
const markRead = document.getElementById("markRead");
const position = document.getElementById("changePosition");
const prev = document.getElementById("prevChange");
const next = document.getElementById("nextChange");
const tableWrap = document.getElementById("tableWrap");
const tableEmptyState = document.getElementById("tableEmptyState");
const card = document.querySelector(".card");
const filterToggle = document.getElementById("filterToggle");
const filterToggleLabel = document.getElementById("filterToggleLabel");
const filterPanel = document.getElementById("filterPanel");
const filterSummary = document.getElementById("filterSummary");
const clearAllFilters = document.getElementById("clearAllFilters");
const locationFilterSelect = document.getElementById("locationFilterSelect");
const categoryFilterSelect = document.getElementById("categoryFilterSelect");
const ownerFilterSelect = document.getElementById("ownerFilterSelect");
const franchiseFilterSelect = document.getElementById("franchiseFilterSelect");
const statusFilterInputs = Array.from(document.querySelectorAll(".status-filter-input"));
const unitsMinRange = document.getElementById("unitsMinRange");
const unitsMaxRange = document.getElementById("unitsMaxRange");
const unitsMinInput = document.getElementById("unitsMinInput");
const unitsMaxInput = document.getElementById("unitsMaxInput");
const unitsRangeFill = document.getElementById("unitsRangeFill");
const contactsMinRange = document.getElementById("contactsMinRange");
const contactsMaxRange = document.getElementById("contactsMaxRange");
const contactsMinInput = document.getElementById("contactsMinInput");
const contactsMaxInput = document.getElementById("contactsMaxInput");
const contactsRangeFill = document.getElementById("contactsRangeFill");
const mapToggle = document.getElementById("mapToggle");
const orgChartToggle = document.getElementById("orgChartToggle");
const rawDataToggle = document.getElementById("rawDataToggle");
const toolbarTabItems = Array.from(document.querySelectorAll(".toolbar-tabs .toolbar-tab-item"));
const mapPanel = document.getElementById("mapPanel");
const ownerMapHeader = document.getElementById("ownerMapHeader");
const ownerDetailsPanel = document.getElementById("ownerDetailsPanel");
const profileModal = document.getElementById("profileModal");
const profileModalContent = document.getElementById("profileModalContent");
const toolbarDropdown = document.querySelector(".toolbar-dropdown");
const updatesToggleOption = document.getElementById("updatesToggleOption");
const modifiedColumnToggleOption = document.getElementById("modifiedColumnToggleOption");
const reduceMotionToggleOption = document.getElementById("reduceMotionToggleOption");
const takeScreenshotOption = document.getElementById("takeScreenshotOption");
const resetViewOption = document.getElementById("resetViewOption");
const subtitle = document.querySelector(".subtitle-count");
const changeNav = document.querySelector(".change-nav");
const pager = document.querySelector(".pager");
const sortHeaders = Array.from(document.querySelectorAll(".sortable-header"));
const ownerColumnHeader = document.getElementById("ownerColumnHeader");
const contactColumnHeader = document.getElementById("contactColumnHeader");
const franchiseColumnHeader = document.getElementById("franchiseColumnHeader");
const modeColumnHeader = document.getElementById("modeColumnHeader");
const modeColumnLabel = document.getElementById("modeColumnLabel");
const combinedContactsHeader = document.getElementById("combinedContactsHeader");
const locationsColumnHeader = document.getElementById("locationsColumnHeader");
const ownersTable = tableBody?.closest("table");
const ownerTableHeaders = [
  ownerColumnHeader,
  contactColumnHeader,
  franchiseColumnHeader,
  modeColumnHeader,
  combinedContactsHeader,
  locationsColumnHeader
].filter(Boolean);
const defaultHeaderState = ownerTableHeaders.map((header) => ({
  header,
  className: header.className,
  datasetSortKey: header.dataset.sortKey,
  hidden: header.hidden,
  html: header.innerHTML,
  styleWidth: header.style.width,
  ariaSort: header.getAttribute("aria-sort")
}));
const owners = (window.ownersData || []).map((owner, index) => ({
  ...owner,
  originalIndex: index
}));
const unitCounts = owners
  .map((owner) => getOwnerUnitCount(owner))
  .filter(Number.isFinite);
const unitsFilterDefaults = {
  min: unitCounts.length ? Math.min(...unitCounts) : 0,
  max: unitCounts.length ? Math.max(...unitCounts) : 0
};
const contactCounts = owners
  .map((owner) => getOwnerContactCount(owner))
  .filter(Number.isFinite);
const contactsFilterDefaults = {
  min: contactCounts.length ? Math.min(...contactCounts) : 0,
  max: contactCounts.length ? Math.max(...contactCounts) : 0
};
const activeIconColor = "#7a63dd";
const inactiveIconColor = "rgba(122, 99, 221, 0.15)";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const ACTIVE_HIGHLIGHT_FADE_MS = 220;
const TOOLBAR_TAB_DROPDOWN_OPEN_DELAY_MS = 800;
const TOOLBAR_TAB_DROPDOWN_CLOSE_DELAY_MS = 800;
const MAPBOX_ACCESS_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN
  || "pk.eyJ1IjoibnViZWVrIiwiYSI6ImNtcDQ5bHZ1ODA3OGYycXF6czNpNzl0a2kifQ.PRQujjMXkroy4irt3-Az1Q";
const HAS_MAPBOX_ACCESS_TOKEN = Boolean(MAPBOX_ACCESS_TOKEN);
const MAPBOX_STYLE = window.CST_ENV?.MAPBOX_STYLE || "mapbox://styles/nubeek/cka7zizn720s71iogpmkvmw5z";
const MAP_INITIAL_CENTER = [-98.5795, 39.8283];
const MAP_FIT_PADDING = 32;
const MAP_LOCATION_FILTER_RADIUS_MILES = 50;
const VIEW_SETTINGS_STORAGE_KEY = "cst.viewSettings.v1";
const PERSISTABLE_PANEL_MODES = new Set(["map", "org", "raw"]);

function getOwnerContactCount(owner) {
  const contactCount = Number(owner.contactCount);
  if (Number.isFinite(contactCount)) return contactCount;

  if (Array.isArray(owner.contacts)) return owner.contacts.length;

  const legacyContactCount = Number(owner.contacts);
  return Number.isFinite(legacyContactCount) ? legacyContactCount : 0;
}

function getOwnerUnitCount(owner) {
  const unitCount = Number(owner.unitCount);
  if (Number.isFinite(unitCount)) return unitCount;

  const locationCount = Number(owner.locations);
  if (Number.isFinite(locationCount)) return locationCount;

  return Array.isArray(owner.units) ? owner.units.length : 0;
}

let changedRows = [];
let activeIndex = 0;
let changeNavEngaged = false;
let displayedOwners = [...owners];
let selectedLocationLabels = [];
let excludedLocationLabels = [];
let selectedCategoryValues = [];
let excludedCategoryValues = [];
let selectedOwnerIndexes = [];
let excludedOwnerIndexes = [];
let selectedFranchiseIndexes = [];
let excludedFranchiseIndexes = [];
let selectedUnitsMin = unitsFilterDefaults.min;
let selectedUnitsMax = unitsFilterDefaults.max;
let selectedContactsMin = contactsFilterDefaults.min;
let selectedContactsMax = contactsFilterDefaults.max;
let activeHighlightTimeout;
let updatesEnabled = false;
let modifiedColumnVisible = false;
let reduceMotionEnabled = false;
let ownersMap;
let ownersMapInitialized = false;
let ownerDetailsMap;
let ownerDetailsMapOwnerIndex = null;
let activeMapOwnerIndex = null;
let activeDetailOwnerIndex = null;
let activeOrgOwnerIndex = null;
let activeRawOwnerIndex = null;
let globalRawDataViewOpen = false;
// Set only by manual toolbar tab clicks ("map" | "org" | "raw" | null).
// A locked tab is highlighted; closing its sidebar requires the toolbar or
// the hide-panel option, while the sidebar X only clears the selected owner.
let lockedToolbarMode = "map";
let currentPanelLayout = "right";
let lastProfileModalTrigger = null;
const savedLeadOwnerIndexes = new Set();
let ownersMapResizeObserver = null;
let ownersMapResizeFrame = null;
let screenshotInProgress = false;
let screenshotToastTimeout;
let viewSettingsReadyToPersist = false;
let isRestoringViewSettings = false;
const toolbarTabOpenTimeoutByItem = new WeakMap();
const toolbarTabCloseTimeoutByItem = new WeakMap();
const filterComboboxes = new Map();
const PANEL_LAYOUT_CLASSES = {
  right: "is-panel-right",
  split: "is-panel-split",
  bottom: "is-panel-bottom",
  full: "is-panel-full"
};
const orgCollapsedNodeIdsByOwner = new Map();
let sortState = {
  key: "locations",
  direction: "descending"
};
let locationSortCycleActive = false;
const columnWidths = {
  owner: "26%",
  contact: "26%",
  mode: "12%",
  contacts: "12%",
  locations: "12%",
  franchise: "12%"
};
const columnWidthsWithoutModified = {
  owner: "31%",
  contact: "31%",
  contacts: "12%",
  locations: "12%",
  franchise: "12%"
};
const defaultFilterSectionStates = filterPanel
  ? Array.from(filterPanel.querySelectorAll(".filter-section")).map((section) => (
    section.classList.contains("filter-section-collapsed")
  ))
  : [];
