const TERRITORY_LOCATION_MAPBOX_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
const TERRITORY_GEOCODING_TYPES = "address,place,district,region";
const TERRITORY_ALLOWED_MAPBOX_PLACE_TYPES = new Set([
  "address",
  "place",
  "district",
  "region"
]);
const TERRITORY_CBSA_INDEX_URL = "data/real/cbsa-index.json";
const TERRITORY_GEOCODING_DEBOUNCE_MS = 250;
const TERRITORY_GEOCODING_LIMIT = 3;
const TERRITORY_GEOCODING_FETCH_LIMIT = 10;

const TERRITORY_US_STATE_OPTIONS = [
  { code: "AL", label: "Alabama" },
  { code: "AK", label: "Alaska" },
  { code: "AZ", label: "Arizona" },
  { code: "AR", label: "Arkansas" },
  { code: "CA", label: "California" },
  { code: "CO", label: "Colorado" },
  { code: "CT", label: "Connecticut" },
  { code: "DE", label: "Delaware" },
  { code: "FL", label: "Florida" },
  { code: "GA", label: "Georgia" },
  { code: "HI", label: "Hawaii" },
  { code: "ID", label: "Idaho" },
  { code: "IL", label: "Illinois" },
  { code: "IN", label: "Indiana" },
  { code: "IA", label: "Iowa" },
  { code: "KS", label: "Kansas" },
  { code: "KY", label: "Kentucky" },
  { code: "LA", label: "Louisiana" },
  { code: "ME", label: "Maine" },
  { code: "MD", label: "Maryland" },
  { code: "MA", label: "Massachusetts" },
  { code: "MI", label: "Michigan" },
  { code: "MN", label: "Minnesota" },
  { code: "MS", label: "Mississippi" },
  { code: "MO", label: "Missouri" },
  { code: "MT", label: "Montana" },
  { code: "NE", label: "Nebraska" },
  { code: "NV", label: "Nevada" },
  { code: "NH", label: "New Hampshire" },
  { code: "NJ", label: "New Jersey" },
  { code: "NM", label: "New Mexico" },
  { code: "NY", label: "New York" },
  { code: "NC", label: "North Carolina" },
  { code: "ND", label: "North Dakota" },
  { code: "OH", label: "Ohio" },
  { code: "OK", label: "Oklahoma" },
  { code: "OR", label: "Oregon" },
  { code: "PA", label: "Pennsylvania" },
  { code: "RI", label: "Rhode Island" },
  { code: "SC", label: "South Carolina" },
  { code: "SD", label: "South Dakota" },
  { code: "TN", label: "Tennessee" },
  { code: "TX", label: "Texas" },
  { code: "UT", label: "Utah" },
  { code: "VT", label: "Vermont" },
  { code: "VA", label: "Virginia" },
  { code: "WA", label: "Washington" },
  { code: "WV", label: "West Virginia" },
  { code: "WI", label: "Wisconsin" },
  { code: "WY", label: "Wyoming" }
];

function normalizeTerritoryLocationQuery(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,]/g, "");
}

function getTerritoryStateLabel(stateCode) {
  return TERRITORY_US_STATE_OPTIONS.find(({ code }) => code === stateCode)?.label || stateCode;
}

function resolveTerritoryStateQuery(query) {
  const normalizedQuery = normalizeTerritoryLocationQuery(query);
  if (!normalizedQuery) return null;

  const exactMatch = TERRITORY_US_STATE_OPTIONS.find(({ code, label }) => (
    normalizeTerritoryLocationQuery(code) === normalizedQuery
    || normalizeTerritoryLocationQuery(label) === normalizedQuery
  ));
  if (exactMatch) return exactMatch;

  const prefixMatches = TERRITORY_US_STATE_OPTIONS.filter(({ label }) => (
    normalizeTerritoryLocationQuery(label).startsWith(normalizedQuery)
  ));
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function getPrimaryMapboxPlaceType(feature) {
  const placeTypes = Array.isArray(feature?.place_type) ? feature.place_type : [];
  return placeTypes.find((type) => TERRITORY_ALLOWED_MAPBOX_PLACE_TYPES.has(type)) || placeTypes[0] || "";
}

function isAllowedMapboxGeocodingFeature(feature) {
  return TERRITORY_ALLOWED_MAPBOX_PLACE_TYPES.has(getPrimaryMapboxPlaceType(feature));
}

function createTerritoryLocationResult({
  label,
  stateCode,
  coordinates = null,
  geoLevel = null,
  geoKey = null,
  suggestionLabel = null
}) {
  if (!label || !stateCode) return null;

  return {
    label,
    stateCode,
    coordinates,
    geoLevel,
    geoKey,
    suggestionLabel: suggestionLabel || label,
    placeTypes: geoLevel ? [geoLevel] : []
  };
}

function getTerritoryLocationSuggestionLabel(item) {
  return item?.suggestionLabel || item?.label || "";
}

function createTerritoryStateLocationResult(stateCode) {
  const label = getTerritoryStateLabel(stateCode);
  if (!stateCode || !label) return null;

  const suggestionLabel = `${label}, United States`;
  return createTerritoryLocationResult({
    label,
    suggestionLabel,
    stateCode,
    geoLevel: "region"
  });
}

function searchTerritoryStateSuggestions(query, limit = TERRITORY_GEOCODING_LIMIT) {
  const normalizedQuery = normalizeTerritoryLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  return TERRITORY_US_STATE_OPTIONS
    .filter(({ code, label }) => (
      normalizeTerritoryLocationQuery(label).includes(normalizedQuery)
      || normalizeTerritoryLocationQuery(code).startsWith(normalizedQuery)
    ))
    .slice(0, limit)
    .map(({ code }) => createTerritoryStateLocationResult(code))
    .filter(Boolean);
}

let territoryCbsaIndexPromise = null;

function loadTerritoryCbsaIndex() {
  if (!territoryCbsaIndexPromise) {
    territoryCbsaIndexPromise = fetch(TERRITORY_CBSA_INDEX_URL)
      .then((response) => (response.ok ? response.json() : []))
      .catch(() => []);
  }

  return territoryCbsaIndexPromise;
}

function searchTerritoryCbsaSuggestions(query, limit = TERRITORY_GEOCODING_LIMIT) {
  const normalizedQuery = normalizeTerritoryLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  return loadTerritoryCbsaIndex().then((index) => (
    (Array.isArray(index) ? index : [])
      .filter(({ label }) => normalizeTerritoryLocationQuery(label).includes(normalizedQuery))
      .slice(0, limit)
      .map(({ label, stateCode, coordinates, geoKey }) => createTerritoryLocationResult({
        label,
        stateCode,
        coordinates,
        geoLevel: "cbsa",
        geoKey
      }))
      .filter(Boolean)
  ));
}

function getTerritoryLocationResultDedupeKey(item) {
  if (
    item?.stateCode
    && (item.geoLevel === "region" || !item.geoLevel)
    && !item.geoKey
    && !item.coordinates
  ) {
    return `region:${item.stateCode}`;
  }

  return [
    item.geoLevel || "unknown",
    item.geoKey || item.label,
    item.stateCode
  ].join(":");
}

function dedupeTerritoryLocationResults(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getTerritoryLocationResultDedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeTerritoryLocationSuggestions({
  stateMatches = [],
  mapboxMatches = [],
  cbsaMatches = [],
  limit = TERRITORY_GEOCODING_LIMIT
} = {}) {
  return dedupeTerritoryLocationResults([
    ...stateMatches,
    ...mapboxMatches,
    ...cbsaMatches
  ]).slice(0, limit);
}

function resolveTerritoryCbsaQueryFromIndex(index, query) {
  const normalizedQuery = normalizeTerritoryLocationQuery(query);
  if (!normalizedQuery) return null;

  const exactMatch = (Array.isArray(index) ? index : []).find(({ label }) => (
    normalizeTerritoryLocationQuery(label) === normalizedQuery
  ));
  if (exactMatch) {
    return createTerritoryLocationResult({
      label: exactMatch.label,
      stateCode: exactMatch.stateCode,
      coordinates: exactMatch.coordinates,
      geoLevel: "cbsa",
      geoKey: exactMatch.geoKey
    });
  }

  const prefixMatches = (Array.isArray(index) ? index : []).filter(({ label }) => (
    normalizeTerritoryLocationQuery(label).startsWith(normalizedQuery)
  ));
  if (prefixMatches.length === 1) {
    const [match] = prefixMatches;
    return createTerritoryLocationResult({
      label: match.label,
      stateCode: match.stateCode,
      coordinates: match.coordinates,
      geoLevel: "cbsa",
      geoKey: match.geoKey
    });
  }

  return null;
}

function getStateCodeFromMapboxFeature(feature) {
  const shortCode = feature?.properties?.short_code || feature?.short_code;
  if (shortCode) {
    const parts = String(shortCode).split("-");
    const regionCode = parts[parts.length - 1];
    if (regionCode?.length === 2) return regionCode.toUpperCase();
  }

  const regionContext = (feature?.context || []).find((entry) => (
    String(entry?.id || "").startsWith("region")
  ));
  const regionShortCode = regionContext?.short_code;
  if (regionShortCode) {
    const parts = String(regionShortCode).split("-");
    const regionCode = parts[parts.length - 1];
    if (regionCode?.length === 2) return regionCode.toUpperCase();
  }

  return null;
}

function parseMapboxGeocodingFeature(feature) {
  if (!isAllowedMapboxGeocodingFeature(feature)) return null;

  const [longitude, latitude] = feature?.center || [];
  const stateCode = getStateCodeFromMapboxFeature(feature);
  if (!stateCode) return null;

  const geoLevel = getPrimaryMapboxPlaceType(feature);
  if (geoLevel === "region") {
    return createTerritoryStateLocationResult(stateCode);
  }

  return createTerritoryLocationResult({
    label: feature.place_name || feature.text || "",
    stateCode,
    coordinates: Number.isFinite(longitude) && Number.isFinite(latitude)
      ? { longitude, latitude }
      : null,
    geoLevel
  });
}

async function fetchTerritoryMapboxPlaceSuggestions(query, { signal, autocomplete = true } = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!TERRITORY_LOCATION_MAPBOX_TOKEN || !trimmedQuery) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json`);
  url.searchParams.set("access_token", TERRITORY_LOCATION_MAPBOX_TOKEN);
  url.searchParams.set("autocomplete", autocomplete ? "true" : "false");
  url.searchParams.set("country", "US");
  url.searchParams.set("types", TERRITORY_GEOCODING_TYPES);
  url.searchParams.set("limit", String(TERRITORY_GEOCODING_FETCH_LIMIT));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed (${response.status})`);
  }

  const payload = await response.json();
  return (payload.features || [])
    .map(parseMapboxGeocodingFeature)
    .filter(Boolean);
}

async function fetchTerritoryGeocodingSuggestions(query, { signal, autocomplete = true, limit = TERRITORY_GEOCODING_LIMIT } = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const [mapboxMatches, cbsaMatches] = await Promise.all([
    fetchTerritoryMapboxPlaceSuggestions(trimmedQuery, { signal, autocomplete }),
    searchTerritoryCbsaSuggestions(trimmedQuery, limit)
  ]);

  return mergeTerritoryLocationSuggestions({
    stateMatches: searchTerritoryStateSuggestions(trimmedQuery, limit),
    mapboxMatches,
    cbsaMatches,
    limit
  });
}

function toTerritoryLocationResultFromState(stateMatch) {
  return createTerritoryStateLocationResult(stateMatch.code);
}

function createTerritoryLocationResultFromStateCode(stateCode) {
  return createTerritoryStateLocationResult(stateCode);
}

async function reverseGeocodeTerritoryCoordinates(longitude, latitude, { types = "address" } = {}) {
  if (!TERRITORY_LOCATION_MAPBOX_TOKEN) return null;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
  );
  url.searchParams.set("access_token", TERRITORY_LOCATION_MAPBOX_TOKEN);
  url.searchParams.set("country", "US");
  url.searchParams.set("types", types);
  url.searchParams.set("limit", "1");

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = await response.json();
  const [feature] = payload.features || [];
  return feature ? parseMapboxGeocodingFeature(feature) : null;
}

async function resolveTerritoryLocationFromCoordinates(longitude, latitude, stateCode = null) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const resolvedStateCode = stateCode
    || window.territoryMapControls?.getStateCodeForCoordinates?.(longitude, latitude);

  const geocoded = await reverseGeocodeTerritoryCoordinates(longitude, latitude, { types: "address" })
    || await reverseGeocodeTerritoryCoordinates(longitude, latitude, { types: "place" })
    || await reverseGeocodeTerritoryCoordinates(longitude, latitude, { types: "region" });

  if (geocoded?.label && (geocoded.stateCode || resolvedStateCode)) {
    return createTerritoryLocationResult({
      label: geocoded.label,
      stateCode: geocoded.stateCode || resolvedStateCode,
      coordinates: geocoded.coordinates || { longitude, latitude },
      geoLevel: geocoded.geoLevel === "place" || geocoded.geoLevel === "region"
        ? geocoded.geoLevel
        : "address"
    });
  }

  if (!resolvedStateCode) return null;

  return createTerritoryLocationResult({
    label: `Map area, ${getTerritoryStateLabel(resolvedStateCode)}`,
    stateCode: resolvedStateCode,
    coordinates: { longitude, latitude },
    geoLevel: "address"
  });
}

function createTerritoryLocationResultFromCoordinates(longitude, latitude, stateCode, label) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !stateCode || !label) return null;

  return createTerritoryLocationResult({
    label,
    stateCode,
    coordinates: { longitude, latitude },
    geoLevel: "address"
  });
}

async function resolveTerritoryLocationSearch(query, selectedResult = null) {
  if (selectedResult?.stateCode) return selectedResult;

  const stateMatch = resolveTerritoryStateQuery(query);
  if (stateMatch) return toTerritoryLocationResultFromState(stateMatch);

  const cbsaIndex = await loadTerritoryCbsaIndex();
  const cbsaMatch = resolveTerritoryCbsaQueryFromIndex(cbsaIndex, query);
  if (cbsaMatch) return cbsaMatch;

  if (!TERRITORY_LOCATION_MAPBOX_TOKEN || !String(query || "").trim()) return null;

  const [geocodedMatch] = await fetchTerritoryMapboxPlaceSuggestions(query, { autocomplete: false });
  return geocodedMatch || null;
}

function bindTerritoryLocationSearch({
  root,
  field,
  form,
  input,
  menu,
  suggestions,
  clearButton,
  locateButton,
  feedback,
  onSubmit,
  onInclude,
  onExclude,
  onClear,
  isSelected,
  variant = "splash",
  emptyMessage = "Enter a street, city, county, CBSA, or state to begin.",
  noMatchMessage = "Choose a matching U.S. location from the suggestions.",
  suggestionPrefix = "territoryLocationSuggestion"
} = {}) {
  if (!input || !suggestions) return null;

  const isFilterVariant = variant === "filter";
  const fieldElement = field || form?.closest(".filter-select-field") || null;
  const menuElement = menu || fieldElement?.querySelector(".filter-combobox-menu") || null;
  const scopeElement = root || fieldElement || form;
  let optionTooltip = null;
  let optionTooltipTarget = null;

  let debounceTimer = null;
  let fetchController = null;
  let activeSuggestionIndex = -1;
  let renderedSuggestions = [];
  let selectedSuggestion = null;
  let isSubmitting = false;

  const ui = isFilterVariant
    ? {
        option: "filter-combobox-option",
        optionLabel: "filter-combobox-option-label",
        optionActions: "filter-combobox-option-actions",
        optionAction: "filter-combobox-option-action",
        empty: "filter-combobox-empty"
      }
    : {
        heading: "territory-location-search__suggestion-heading",
        option: "territory-location-search__suggestion",
        optionIcon: "territory-location-search__suggestion-icon",
        optionLabel: "territory-location-search__suggestion-label",
        optionAction: "territory-location-search__suggestion-action",
        optionActionKey: "territory-location-search__suggestion-key",
        empty: "territory-location-search__suggestion-status"
      };

  function setFeedback(message = "") {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function setSuggestionsOpen(isOpen) {
    input.setAttribute("aria-expanded", String(isOpen));

    if (isFilterVariant) {
      fieldElement?.classList.toggle("is-open", isOpen);
      if (menuElement) {
        menuElement.setAttribute("aria-hidden", String(!isOpen));
      }
      return;
    }

    suggestions.setAttribute("aria-hidden", String(!isOpen));
    form?.classList.toggle("is-suggestions-open", isOpen);
  }

  function closeSuggestions() {
    hideOptionTooltip();
    activeSuggestionIndex = -1;
    renderedSuggestions = [];
    suggestions.replaceChildren();
    input.removeAttribute("aria-activedescendant");
    setSuggestionsOpen(false);
  }

  function appendSuggestionHeading() {
    if (!ui.heading) return;

    const heading = document.createElement("div");
    heading.className = ui.heading;
    heading.textContent = "Locations";
    suggestions.append(heading);
  }

  function getOptionTooltip() {
    if (!optionTooltip) {
      optionTooltip = document.createElement("div");
      optionTooltip.className = "filter-combobox-floating-tooltip";
    }

    return optionTooltip;
  }

  function positionOptionTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = getOptionTooltip();
    tooltip.textContent = tooltipText;

    if (!tooltip.isConnected) {
      document.body.append(tooltip);
    }

    window.fitTooltipToContent?.(tooltip);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showOptionTooltip(event) {
    optionTooltipTarget = event.currentTarget;
    positionOptionTooltip(optionTooltipTarget);
    getOptionTooltip().classList.add("is-visible");
  }

  function hideOptionTooltip() {
    optionTooltipTarget = null;
    optionTooltip?.classList.remove("is-visible");
  }

  function syncSearchActions() {
    const hasInputValue = input.value.trim().length > 0;
    const hasSelection = Boolean(fieldElement?.classList.contains("has-selection"));

    if (clearButton) {
      clearButton.hidden = isFilterVariant ? !hasSelection : (!hasInputValue && !hasSelection);
    }

    if (locateButton) {
      locateButton.hidden = hasInputValue || hasSelection;
    }
  }

  function renderSuggestionStatus(message) {
    renderedSuggestions = [];
    activeSuggestionIndex = -1;
    suggestions.replaceChildren();
    appendSuggestionHeading();

    const status = document.createElement(isFilterVariant ? "div" : "div");
    status.className = ui.empty;
    status.textContent = message;
    suggestions.append(status);
    setSuggestionsOpen(true);
  }

  function renderSuggestions(items) {
    const visibleItems = items.filter((item) => !isSelected?.(item));
    renderedSuggestions = visibleItems;
    activeSuggestionIndex = visibleItems.length ? 0 : -1;
    suggestions.replaceChildren();

    if (!visibleItems.length) {
      renderSuggestionStatus("No matching locations.");
      return;
    }

    appendSuggestionHeading();

    visibleItems.forEach((item, index) => {
      const optionElement = document.createElement(isFilterVariant ? "div" : "button");
      const label = document.createElement("span");

      if (!isFilterVariant) {
        optionElement.type = "button";
      }

      optionElement.className = ui.option;
      optionElement.id = `${suggestionPrefix}-${index}`;
      optionElement.setAttribute("role", "option");
      optionElement.setAttribute("aria-selected", "false");
      optionElement.setAttribute("aria-label", `Select ${getTerritoryLocationSuggestionLabel(item)}`);

      if (isFilterVariant) {
        label.className = ui.optionLabel;
        label.textContent = getTerritoryLocationSuggestionLabel(item);

        const optionActions = document.createElement("span");
        const includeAction = document.createElement("button");
        const excludeAction = document.createElement("button");

        optionActions.className = ui.optionActions;
        includeAction.className = `${ui.optionAction} is-include`;
        includeAction.type = "button";
        includeAction.tabIndex = -1;
        includeAction.setAttribute("aria-label", `Include ${getTerritoryLocationSuggestionLabel(item)} in results`);
        includeAction.dataset.tooltip = "Include\nin results";
        excludeAction.className = `${ui.optionAction} is-exclude`;
        excludeAction.type = "button";
        excludeAction.tabIndex = -1;
        excludeAction.setAttribute("aria-label", `Exclude ${getTerritoryLocationSuggestionLabel(item)} from results`);
        excludeAction.dataset.tooltip = "Exclude\nfrom results";

        [includeAction, excludeAction].forEach((actionButton) => {
          actionButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          actionButton.addEventListener("mouseenter", showOptionTooltip);
          actionButton.addEventListener("mouseleave", hideOptionTooltip);
          actionButton.addEventListener("focus", showOptionTooltip);
          actionButton.addEventListener("blur", hideOptionTooltip);
          actionButton.addEventListener("click", hideOptionTooltip);
        });

        includeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          void handleInclude(item);
        });
        excludeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          void handleExclude(item);
        });

        optionActions.append(includeAction, excludeAction);
        optionElement.append(label, optionActions);
      } else {
        const icon = document.createElement("span");
        const action = document.createElement("span");
        const actionLabel = document.createElement("span");
        const actionKey = document.createElement("img");

        icon.className = ui.optionIcon;
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = `
          <svg viewBox="0 0 16 20" focusable="false">
            <path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/>
          </svg>
        `;

        label.className = ui.optionLabel;
        label.textContent = getTerritoryLocationSuggestionLabel(item);

        action.className = ui.optionAction;
        action.setAttribute("aria-hidden", "true");
        actionLabel.textContent = "Select";
        actionKey.className = ui.optionActionKey;
        actionKey.src = resolvePublicAssetUrl("../../assets/icons/enter.svg");
        actionKey.alt = "";
        action.append(actionLabel, actionKey);
        optionElement.append(icon, label, action);
      }

      optionElement.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      optionElement.addEventListener("mouseenter", () => {
        activeSuggestionIndex = index;
        syncActiveSuggestion();
      });
      optionElement.addEventListener("click", () => {
        if (isFilterVariant) {
          void handleInclude(item);
          return;
        }

        selectSuggestion(item, { submit: true });
      });
      suggestions.append(optionElement);
    });

    setSuggestionsOpen(true);
    syncActiveSuggestion();
  }

  function syncActiveSuggestion() {
    suggestions.querySelectorAll(`.${ui.option}`).forEach((button, index) => {
      const isActive = index === activeSuggestionIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const activeButton = suggestions.querySelector(`.${ui.option}.is-active`);
    if (activeButton) {
      input.setAttribute("aria-activedescendant", activeButton.id);
      activeButton.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  async function submitLocationSearch(forcedResult = null) {
    if (isSubmitting) return null;
    isSubmitting = true;

    try {
      const query = input.value;
      if (!query.trim()) {
        setFeedback(emptyMessage);
        input.focus();
        return null;
      }

      const result = await resolveTerritoryLocationSearch(query, forcedResult || selectedSuggestion);
      if (!result) {
        setFeedback(noMatchMessage);
        input.focus();
        return null;
      }

      setFeedback();
      input.value = result.label;
      syncSearchActions();
      selectedSuggestion = result;
      closeSuggestions();
      await onSubmit?.(result);
      return result;
    } finally {
      isSubmitting = false;
    }
  }

  function selectSuggestion(item, { submit = false } = {}) {
    selectedSuggestion = item;
    input.value = item.label;
    syncSearchActions();
    closeSuggestions();
    setFeedback();

    if (submit) {
      void submitLocationSearch(item);
    }
  }

  async function handleInclude(item) {
    selectedSuggestion = item;
    input.value = "";
    syncSearchActions();
    closeSuggestions();
    setFeedback();
    await (onInclude || onSubmit)?.(item);
  }

  async function handleExclude(item) {
    selectedSuggestion = null;
    input.value = "";
    syncSearchActions();
    closeSuggestions();
    setFeedback();
    await onExclude?.(item);
  }

  async function requestSuggestions(query) {
    fetchController?.abort();
    fetchController = new AbortController();

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      closeSuggestions();
      return;
    }

    renderSuggestionStatus("Searching…");

    try {
      const items = await fetchTerritoryGeocodingSuggestions(trimmedQuery, {
        signal: fetchController.signal
      });
      if (input.value.trim() !== trimmedQuery) return;
      renderSuggestions(items);
    } catch (error) {
      if (error?.name === "AbortError") return;
      closeSuggestions();
    }
  }

  function scheduleSuggestions(query) {
    window.clearTimeout(debounceTimer);
    selectedSuggestion = null;

    if (!query.trim()) {
      closeSuggestions();
      setFeedback();
      return;
    }

    debounceTimer = window.setTimeout(() => {
      void requestSuggestions(query);
    }, TERRITORY_GEOCODING_DEBOUNCE_MS);
  }

  input.addEventListener("input", () => {
    if (selectedSuggestion && input.value !== selectedSuggestion.label) {
      selectedSuggestion = null;
    }
    setFeedback();
    syncSearchActions();
    scheduleSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (renderedSuggestions.length) {
      setSuggestionsOpen(true);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, renderedSuggestions.length - 1);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "ArrowUp") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0 && renderedSuggestions.length) {
        event.preventDefault();
        if (isFilterVariant) {
          void handleInclude(renderedSuggestions[activeSuggestionIndex]);
        } else {
          selectSuggestion(renderedSuggestions[activeSuggestionIndex], { submit: true });
        }
        return;
      }

      if (isFilterVariant) {
        event.preventDefault();
        void submitLocationSearch();
      }
    }

    if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!scopeElement?.contains(document.activeElement)) {
        closeSuggestions();
      }
    }, 0);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLocationSearch();
  });

  document.addEventListener("mousedown", (event) => {
    if (!scopeElement?.contains(event.target)) {
      closeSuggestions();
    }
  });

  clearButton?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  clearButton?.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    fetchController?.abort();
    selectedSuggestion = null;
    input.value = "";
    closeSuggestions();
    setFeedback();
    syncSearchActions();
    onClear?.();
    input.focus();
  });

  locateButton?.addEventListener("click", () => {
    closeSuggestions();
    setFeedback();

    if (!navigator.geolocation) {
      setFeedback("Location access is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        const stateCode = window.territoryMapControls?.getStateCodeForCoordinates?.(longitude, latitude);
        const result = await window.territoryLocationSearch?.resolveFromCoordinates?.(
          longitude,
          latitude,
          stateCode
        );

        if (!result?.stateCode) {
          setFeedback("Could not determine your location.");
          return;
        }

        selectedSuggestion = result;
        input.value = result.label;
        syncSearchActions();
        await onSubmit?.(result);
      },
      () => {
        setFeedback("Could not access your location.");
      },
      { enableHighAccuracy: true }
    );
  });

  syncSearchActions();

  return {
    setHasSelection(hasSelection = false) {
      fieldElement?.classList.toggle("has-selection", Boolean(hasSelection));
      syncSearchActions();
    },
    setValue(value = "", { suggestion = null } = {}) {
      selectedSuggestion = suggestion;
      input.value = value;
      syncSearchActions();
      closeSuggestions();
      setFeedback();
    },
    reset() {
      selectedSuggestion = null;
      input.value = "";
      closeSuggestions();
      setFeedback();
      syncSearchActions();
    },
    closeSuggestions
  };
}

window.territoryLocationSearch = {
  US_STATE_OPTIONS: TERRITORY_US_STATE_OPTIONS,
  normalizeQuery: normalizeTerritoryLocationQuery,
  resolveStateQuery: resolveTerritoryStateQuery,
  getStateLabel: getTerritoryStateLabel,
  fetchSuggestions: fetchTerritoryGeocodingSuggestions,
  resolveSearch: resolveTerritoryLocationSearch,
  resolveFromCoordinates: resolveTerritoryLocationFromCoordinates,
  reverseGeocode: reverseGeocodeTerritoryCoordinates,
  fromStateCode: createTerritoryLocationResultFromStateCode,
  fromCoordinates: createTerritoryLocationResultFromCoordinates,
  bind: bindTerritoryLocationSearch
};
