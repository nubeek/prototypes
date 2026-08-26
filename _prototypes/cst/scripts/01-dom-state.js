const tableBody = document.getElementById("franchiseesTableBody");
const tableWrap = document.getElementById("tableWrap");
const tableEmptyState = document.getElementById("tableEmptyState");
const tableEmptyStateClear = document.getElementById("tableEmptyStateClear");
const tableHeadingTitle = document.getElementById("tableHeadingTitle");
const tableHeadingInfo = document.getElementById("tableHeadingInfo");
const tableHeadingSummary = document.getElementById("tableHeadingSummary");
const card = document.querySelector(".card");
const filterToggle = document.getElementById("filterToggle");
const readerBackBtn = document.getElementById("readerBackBtn");
const readerEditQueryBtn = document.getElementById("readerEditQueryBtn");
const readerEditQueryLabel = document.getElementById("readerEditQueryLabel");
const readerEditQueryCount = document.getElementById("readerEditQueryCount");
const filterToggleLabel = document.getElementById("filterToggleLabel");
const toolbarSearchInput = document.getElementById("toolbarSearchInput");
const toolbarSearchClear = document.getElementById("toolbarSearchClear");
const filterPanel = document.getElementById("filterPanel");
const filterSummary = document.getElementById("filterSummary");
const clearAllFilters = document.getElementById("clearAllFilters");
const locationFilterSelect = document.getElementById("locationFilterSelect");
const locationFilterSearchField = document.getElementById("locationFilterSearchField");
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
const netWorthMinRange = document.getElementById("netWorthMinRange");
const netWorthMaxRange = document.getElementById("netWorthMaxRange");
const netWorthMinInput = document.getElementById("netWorthMinInput");
const netWorthMaxInput = document.getElementById("netWorthMaxInput");
const netWorthRangeFill = document.getElementById("netWorthRangeFill");
const radiusToggle = document.getElementById("radiusToggle");
const radiusFilterSection = document.getElementById("radiusFilterSection");
const searchWithinLocation = document.getElementById("searchWithinLocation");
const radiusControl = document.getElementById("radiusControl");
const radiusRange = document.getElementById("radiusRange");
const radiusRangeFill = document.getElementById("radiusRangeFill");
const radiusValueLabel = document.getElementById("radiusValueLabel");
const radiusValueDisplay = document.getElementById("radiusValueDisplay");
const radiusValueInput = document.getElementById("radiusValueInput");
const radiusValueEdit = document.getElementById("radiusValueEdit");
const mapToggle = document.getElementById("mapToggle");
const orgChartToggle = document.getElementById("orgChartToggle");
const contactsToggle = document.getElementById("contactsToggle");
const toolbarTabItems = Array.from(document.querySelectorAll(".toolbar-tabs .toolbar-tab-item"));
const mapPanel = document.getElementById("mapPanel");
const ownerMapHeader = document.getElementById("ownerMapHeader");
const ownerDetailsPanel = document.getElementById("ownerDetailsPanel");
const profileModal = document.getElementById("profileModal");
const profileModalContent = document.getElementById("profileModalContent");
const createTargetOption = document.getElementById("createTargetOption");
const readerViewSettingsBtn = document.getElementById("readerViewSettingsBtn");
const createTargetModal = document.getElementById("createTargetModal");
const createTargetForm = document.getElementById("createTargetForm");
const createTargetModalTitle = document.getElementById("createTargetModalTitle");
const createTargetTitleInput = document.getElementById("createTargetTitle");
const createTargetDescriptionInput = document.getElementById("createTargetDescription");
const createTargetVisibilitySelect = document.getElementById("createTargetVisibility");
const createTargetAlerts = document.getElementById("createTargetAlerts");
const createTargetAlertsRow = document.getElementById("createTargetAlertsRow");
const createTargetAlertsDetails = document.getElementById("createTargetAlertsDetails");
const createTargetAlertsHelper = document.getElementById("createTargetAlertsHelper");
const createTargetAlertsToggle = document.getElementById("createTargetAlertsToggle");
const createTargetAlertsPanel = document.getElementById("createTargetAlertsPanel");
const createTargetNotifyCheckboxes = Array.from(
  document.querySelectorAll("#createTargetAlertsPanel .save-view-notify-checkbox")
);
const createTargetNotifyAdded = createTargetForm?.elements.namedItem("notifyAdded");
const createTargetNotifyModified = createTargetForm?.elements.namedItem("notifyModified");
const deleteSavedViewBtn = document.getElementById("deleteSavedView");
const saveLeadModal = document.getElementById("saveLeadModal");
const saveLeadModalForm = document.getElementById("saveLeadModalForm");
const saveLeadContactName = document.getElementById("saveLeadContactName");
const saveLeadContactEmail = document.getElementById("saveLeadContactEmail");
const saveLeadListSelector = document.getElementById("saveLeadListSelector");
const saveLeadListSelectorField = document.getElementById("saveLeadListSelectorField");
const saveLeadListInput = document.getElementById("saveLeadListInput");
const saveLeadListClear = document.getElementById("saveLeadListClear");
const saveLeadListOptions = document.getElementById("saveLeadListOptions");
const saveLeadNote = document.querySelector(".save-lead-note");
const saveLeadNoteToggle = document.getElementById("saveLeadNoteToggle");
const saveLeadNoteField = document.getElementById("saveLeadNoteField");
let saveLeadListSelectorApi = null;
const toolbarDropdowns = Array.from(document.querySelectorAll(".toolbar-dropdown"));
const toolbarDropdown = document.getElementById("toolbarMenuDropdown") || toolbarDropdowns[0];
const datasetSelector = document.getElementById("datasetSelector");
const datasetSelectorTrigger = document.getElementById("datasetSelectorTrigger");
const datasetSelectorLabel = document.getElementById("datasetSelectorLabel");
const datasetSelectorOptions = document.getElementById("datasetSelectorOptions");
const toolbarView = document.getElementById("toolbarView");
const toolbarViewButtons = Array.from(document.querySelectorAll(".toolbar-view-btn[data-table-view]"));
let datasetSelectorApi = null;
const toolbarSettingsSubmenu = document.querySelector('[data-toolbar-submenu="settings"]');
const toolbarSettingsSubmenuTrigger = document.getElementById("toolbarSettingsSubmenuTrigger");
const toolbarDatasetSubmenu = document.querySelector('[data-toolbar-submenu="dataset"]');
const toolbarDatasetSubmenuTrigger = datasetSelectorTrigger;
const toolbarCampaignsSubmenu = document.querySelector('[data-toolbar-submenu="campaigns"]');
const toolbarCampaignsSubmenuTrigger = document.getElementById("campaignsSubmenuTrigger");
const reduceMotionToggleOption = document.getElementById("reduceMotionToggleOption");
const takeScreenshotOption = document.getElementById("takeScreenshotOption");
const resetViewOption = document.getElementById("resetViewOption");
const sortHeaders = Array.from(document.querySelectorAll(".sortable-header"));
const ownerColumnHeader = document.getElementById("ownerColumnHeader");
const contactColumnHeader = document.getElementById("contactColumnHeader");
const franchiseColumnHeader = document.getElementById("franchiseColumnHeader");
const combinedContactsHeader = document.getElementById("combinedContactsHeader");
const locationsColumnHeader = document.getElementById("locationsColumnHeader");
const categoryColumnHeader = document.getElementById("categoryColumnHeader");
const organizationColumnHeader = document.getElementById("organizationColumnHeader");
const locationNumberColumnHeader = document.getElementById("locationNumberColumnHeader");
const franchiseesTable = tableBody?.closest("table");
const ownerTableHeaders = [
  locationNumberColumnHeader,
  ownerColumnHeader,
  contactColumnHeader,
  franchiseColumnHeader,
  combinedContactsHeader,
  locationsColumnHeader,
  categoryColumnHeader,
  organizationColumnHeader
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
const netWorthFilterDefaults = {
  min: 0,
  max: 1000000000
};
const activeIconColor = "#7a63dd";
const inactiveIconColor = "rgba(122, 99, 221, 0.15)";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const TOOLBAR_TAB_DROPDOWN_OPEN_DELAY_MS = 800;
const TOOLBAR_TAB_DROPDOWN_CLOSE_DELAY_MS = 800;
const MAPBOX_ACCESS_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN
  || "pk.eyJ1IjoibnViZWVrIiwiYSI6ImNtcDQ5bHZ1ODA3OGYycXF6czNpNzl0a2kifQ.PRQujjMXkroy4irt3-Az1Q";
const HAS_MAPBOX_ACCESS_TOKEN = Boolean(MAPBOX_ACCESS_TOKEN);
const MAPBOX_STYLE = window.CST_ENV?.MAPBOX_STYLE || "mapbox://styles/nubeek/cka7zizn720s71iogpmkvmw5z";
const MAP_INITIAL_CENTER = [-98.5795, 39.8283];
const MAP_FIT_PADDING = 32;
const MAP_FOCUS_DURATION = 1000;
const MAP_FOCUS_FLY_CURVE = 1.62;
const MAP_POINT_RADIUS = 3;
const MAP_POINT_RADIUS_MAX = 8;
const MAP_POINT_HOVER_SCALE = 2;
const MAP_POINT_ZOOM_MIN = 1;
const MAP_POINT_ZOOM_MAX = 10;
const MAP_POINT_OPACITY = 0.78;
const MAP_POINT_DIM_COLOR = "#c8c8c8";
const MAP_POINT_DIM_OPACITY = 0.38;
const MAP_REVEAL_DURATION_MS = 1500;
const MAP_REVEAL_FADE_MS = 180;
const MAP_POINT_FADE_MS = 280;
const MAP_REVEAL_MIN_MILES = 14;
const MAP_LOCATION_FILTER_RADIUS_MILES = 50;
const RADIUS_FILTER_DEFAULTS = { min: 25, max: 1000, step: 25, value: 300 };
// Keyed per data source: saved unit and contact ranges from one roster act as an
// unwanted filter on the other.
const VIEW_SETTINGS_STORAGE_KEY = window.cstDataSource === "dump"
  ? "cst.viewSettings.v1.dump"
  : "cst.viewSettings.v1";
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

function getOwnerNetWorth(owner) {
  const units = getOwnerUnitCount(owner);
  const maxUnits = Math.max(unitsFilterDefaults?.max || 0, 1);
  const t = Math.min(1, Math.max(0, units / maxUnits));
  return Math.round((t ** 0.65) * netWorthFilterDefaults.max);
}

function getOwnerFranchiseeRating(owner) {
  const explicitRating = Number(owner.franchiseeRating);
  if (Number.isFinite(explicitRating)) return explicitRating;

  const ratingSteps = [4.2, 3.1, 4.8, 2.4, 3.7, 4.0, 2.9, 3.5];
  return ratingSteps[owner.originalIndex % ratingSteps.length];
}

const TABLE_VIEW_ALIASES = {
  owners: "franchisees",
  userProfiles: "candidates"
};

function normalizeTableView(view) {
  const key = String(view || "").trim();
  return TABLE_VIEW_ALIASES[key] || key || "franchisees";
}

let currentTableView = "franchisees";
let displayedFranchisees = [...owners];
let displayedLocations = [];
const selectedLocationRowIds = new Set();
const selectedFranchiseeIndexes = new Set();
const LOCATION_TABLE_PAGE_SIZE = 100;
let locationsVisibleCount = LOCATION_TABLE_PAGE_SIZE;
let searchQuery = "";
const ownerSearchIndexById = new Map();
let selectedLocationLabels = [];
let excludedLocationLabels = [];
let selectedLocationSearches = [];
let excludedLocationSearches = [];
let filterLocationSearchControl = null;
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
let selectedNetWorthMin = netWorthFilterDefaults.min;
let selectedNetWorthMax = netWorthFilterDefaults.max;
let selectedFranchiseeRatingMin = 0;
let userLocationCenter = null;
let radiusFilterEnabled = false;
let selectedRadiusMiles = RADIUS_FILTER_DEFAULTS.value;
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
// the hide-panel option, while the sidebar X only clears the selected franchisee.
let lockedToolbarMode = null;
let currentPanelLayout = "right";
let lastProfileModalTrigger = null;
let lastCreateTargetTrigger = null;
// Owner-level lead/hide state keyed by owner.originalIndex, representing the
// owner's main contact. Additional org-chart contacts are tracked per node in
// the keyed sets below.
const savedLeadOwnerIndexes = new Set();
const hiddenContactOwnerIndexes = new Set();
const savedLeadContactKeys = new Set();
const hiddenContactKeys = new Set();
const savedLeadProspectRowKeys = new Set();
const hiddenProspectRowKeys = new Set();
let ownersMapResizeObserver = null;
let ownersMapResizeFrame = null;
let ownersMapPointHover = null;
let ownersMapBusyPills = null;
let ownersMapResetPills = null;
let ownersMapQueryView = null;
let ownersMapCaptureQueryViewOnSettle = false;
let ownersMapRevealActive = false;
let ownersMapRevealRaf = 0;
let ownersMapRevealToken = 0;
let ownersMapRevealPending = false;
let ownersMapBusyHeldForReveal = false;
let ownersMapRevealScheduleFrame = null;
let ownersMapPendingRevealCollection = null;
let ownersMapPendingPointTransition = "radial";
let ownersMapPendingLocationFocus = null;
let ownersMapRevealWhenTableEnters = null;
let screenshotInProgress = false;
let screenshotToastTimeout;
let viewSettingsReadyToPersist = false;
let isRestoringViewSettings = false;
// Reader mode simplifies the UI when a saved search is opened for viewing:
// the filter sidebar collapses and non-essential toolbar controls hide,
// since most people opening a saved search want the results, not the query
// builder. It's exited by clicking "Edit query" (the repurposed filter toggle).
let readerModeActive = false;
let readerModeSavedSearchTitle = null;
let activeSavedSearchId = null;
const toolbarTabOpenTimeoutByItem = new WeakMap();
const toolbarTabCloseTimeoutByItem = new WeakMap();
const PANEL_LAYOUT_CLASSES = {
  right: "is-panel-right",
  split: "is-panel-split",
  bottom: "is-panel-bottom",
  full: "is-panel-full"
};
const orgCollapsedNodeIdsByOwner = new Map();
const tableSortStates = {
  franchisees: {
    columns: [{ key: "locations", direction: "descending" }]
  },
  locations: {
    columns: [{ key: "contactName", direction: "descending" }]
  },
  candidates: {
    columns: [{ key: "contactName", direction: "descending" }]
  },
  searchers: {
    columns: [{ key: "contactName", direction: "descending" }]
  },
  athletes: {
    columns: [{ key: "contactName", direction: "descending" }]
  }
};
let sortState = {
  columns: tableSortStates.franchisees.columns.map((column) => ({ ...column }))
};
const columnWidths = {
  owner: "31%",
  contact: "31%",
  contacts: "12%",
  locations: "12%",
  franchise: "110px"
};
const defaultFilterSectionStates = filterPanel
  ? Array.from(filterPanel.querySelectorAll(".filter-section")).map((section) => (
    section.classList.contains("filter-section-collapsed")
  ))
  : [];
