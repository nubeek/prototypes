(function (root) {
  const MAPBOX_TOKEN = root.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
  const GEOCODING_TYPES = "address,place,district,region";
  const ALLOWED_TYPES = new Set(["address", "place", "district", "region"]);
  const DEBOUNCE_MS = 250;
  const SUGGESTION_LIMIT = 5;
  const FETCH_LIMIT = 10;
  const COUNTRY_SUFFIX = /,\s*(United States|Canada|Mexico)$/i;

  function getAccessToken() {
    return root.CST_ENV?.MAPBOX_ACCESS_TOKEN || MAPBOX_TOKEN || "";
  }

  function normalizeQuery(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase()
      .replace(/[.,]/g, "");
  }

  function stripCountrySuffix(value) {
    return String(value || "").trim().replace(COUNTRY_SUFFIX, "").trim();
  }

  function toCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  }

  function normalizePlace(place) {
    if (!place) return null;
    if (typeof place === "string") return fromLabel(place);

    const label = stripCountrySuffix(place.label || place.suggestionLabel || place.location || "");
    if (!label) return null;

    const coordinates = toCoordinates(
      place.coordinates?.latitude ?? place.latitude ?? place.lat,
      place.coordinates?.longitude ?? place.longitude ?? place.lng
    );

    return {
      label,
      suggestionLabel: stripCountrySuffix(place.suggestionLabel || label),
      stateCode: String(place.stateCode || place.state || "").trim().toUpperCase(),
      coordinates,
      geoLevel: String(place.geoLevel || "").trim(),
      geoKey: String(place.geoKey || "").trim()
    };
  }

  function fromLabel(label) {
    const trimmed = stripCountrySuffix(label);
    if (!trimmed) return null;
    return {
      label: trimmed,
      suggestionLabel: trimmed,
      stateCode: "",
      coordinates: null,
      geoLevel: "",
      geoKey: ""
    };
  }

  function fromRecord(record) {
    if (!record || typeof record !== "object") return null;
    const fromPlace = normalizePlace(record.locationPlace);
    if (fromPlace) return fromPlace;

    const coordinates = toCoordinates(
      record.lat ?? record.latitude ?? record.coordinates?.latitude,
      record.lng ?? record.longitude ?? record.coordinates?.longitude
    );
    const label = stripCountrySuffix(record.location || record.label || "");
    if (coordinates) {
      return normalizePlace({
        label: label || "Selected location",
        coordinates,
        geoLevel: record.geoLevel || "address",
        stateCode: record.stateCode || record.state || ""
      });
    }

    return fromLabel(label);
  }

  function toStoredPlace(place) {
    const normalized = normalizePlace(place);
    if (!normalized) return null;
    if (!normalized.coordinates && !normalized.geoLevel && !normalized.stateCode) return null;

    const stored = {
      label: normalized.label,
      stateCode: normalized.stateCode || "",
      coordinates: normalized.coordinates,
      geoLevel: normalized.geoLevel || ""
    };
    if (normalized.geoKey) stored.geoKey = normalized.geoKey;
    return stored;
  }

  function getPlaceKey(place) {
    const normalized = normalizePlace(place);
    if (!normalized) return "";
    if (normalized.geoKey) return `${normalized.geoLevel || "place"}:${normalized.geoKey}`;
    if (normalized.coordinates) {
      return [
        normalized.stateCode || "",
        normalized.coordinates.longitude.toFixed(5),
        normalized.coordinates.latitude.toFixed(5)
      ].join(":");
    }
    return ["label", normalized.stateCode || "", normalizeQuery(normalized.label)].join(":");
  }

  function getPrimaryPlaceType(feature) {
    const types = Array.isArray(feature?.place_type) ? feature.place_type : [];
    return types.find((type) => ALLOWED_TYPES.has(type)) || types[0] || "";
  }

  function getStateCodeFromFeature(feature) {
    const shortCode = feature?.properties?.short_code || feature?.short_code;
    if (shortCode) {
      const parts = String(shortCode).split("-");
      return (parts[parts.length - 1] || "").toUpperCase();
    }

    const regionContext = (feature?.context || []).find((entry) => (
      String(entry?.id || "").startsWith("region")
    ));
    const regionShortCode = regionContext?.short_code;
    if (regionShortCode) {
      const parts = String(regionShortCode).split("-");
      return (parts[parts.length - 1] || "").toUpperCase();
    }

    return "";
  }

  function parseMapboxFeature(feature) {
    const geoLevel = getPrimaryPlaceType(feature);
    if (!ALLOWED_TYPES.has(geoLevel)) return null;

    const [longitude, latitude] = feature?.center || [];
    return normalizePlace({
      label: feature.place_name || feature.text || "",
      stateCode: getStateCodeFromFeature(feature),
      coordinates: toCoordinates(latitude, longitude),
      geoLevel
    });
  }

  async function fetchSuggestions(query, { signal } = {}) {
    const trimmed = String(query || "").trim();
    const token = getAccessToken();
    if (!token || trimmed.length < 2) return [];

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("country", "US,CA,MX");
    url.searchParams.set("types", GEOCODING_TYPES);
    url.searchParams.set("limit", String(FETCH_LIMIT));

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Mapbox geocoding failed (${response.status})`);
    }

    const payload = await response.json();
    const seen = new Set();
    return (payload.features || [])
      .map(parseMapboxFeature)
      .filter((item) => {
        const key = getPlaceKey(item);
        if (!item || !key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, SUGGESTION_LIMIT);
  }

  function setupModalTrailing(field) {
    const chevron = field.querySelector(":scope > img");
    if (!field.closest(".proto-modal-field, .target-modal-field") || !chevron) return null;

    const chevronSrc = chevron.getAttribute("src") || "";
    const clearIconSrc = chevronSrc.replace(/chevron\.svg(?:\?.*)?$/, "remove.svg");
    if (clearIconSrc === chevronSrc) return null;

    let clearButton = field.querySelector(".filter-combobox-clear");
    if (!clearButton) {
      clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "filter-combobox-clear";
      clearButton.hidden = true;
    }

    clearButton.classList.add("filter-combobox-clear--header-match");
    if (!clearButton.querySelector("img")) {
      const clearIcon = document.createElement("img");
      clearIcon.src = clearIconSrc;
      clearIcon.alt = "";
      clearIcon.setAttribute("aria-hidden", "true");
      clearButton.append(clearIcon);
    }

    const chevronSlot = document.createElement("span");
    chevronSlot.className = "filter-combobox-chevron";
    chevronSlot.setAttribute("aria-hidden", "true");
    chevronSlot.append(chevron);

    const trailing = document.createElement("div");
    trailing.className = "filter-combobox-trailing";
    trailing.append(clearButton, chevronSlot);
    field.classList.add("has-modal-trailing");
    field.append(trailing);
    return clearButton;
  }

  function bindField(field, { placeholder = "Select", onChange } = {}) {
    if (!field) return null;

    const input = field.querySelector("input");
    const chips = field.querySelector(".filter-combobox-chips");
    const control = field.querySelector(".filter-combobox-control");
    const menu = field.querySelector(".filter-combobox-menu");
    const suggestions = field.querySelector(".filter-combobox-options")
      || field.querySelector("[role='listbox']");
    if (!input || !suggestions) return null;

    field.classList.add("is-single-select", "filter-location-search-field");
    const clearButton = setupModalTrailing(field)
      || field.querySelector(".filter-combobox-clear");

    let selectedPlace = null;
    let committedPlace = null;
    let searchQuery = "";
    let debounceTimer = null;
    let fetchController = null;
    let activeIndex = -1;
    let rendered = [];
    let destroyed = false;

    function isOpen() {
      return field.classList.contains("is-open");
    }

    function syncClear() {
      if (!clearButton) return;
      clearButton.hidden = !committedPlace;
      clearButton.setAttribute("aria-label", `Clear ${placeholder}`);
    }

    function syncDisplay() {
      chips?.replaceChildren();
      if (isOpen()) {
        input.value = searchQuery;
        input.placeholder = placeholder;
      } else if (committedPlace) {
        input.value = committedPlace.label;
        input.placeholder = "";
      } else {
        input.value = "";
        input.placeholder = placeholder;
      }
      field.classList.toggle("has-selection", Boolean(committedPlace));
      syncClear();
    }

    function setSuggestionsOpen(open) {
      field.classList.toggle("is-open", open);
      input.setAttribute("aria-expanded", String(open));
      if (menu) menu.setAttribute("aria-hidden", String(!open));
      if (!open) input.removeAttribute("aria-activedescendant");
      if (open) window.WefranchFilterCombobox?.fitOpenMenus?.();
    }

    function closeSuggestions() {
      activeIndex = -1;
      rendered = [];
      suggestions.replaceChildren();
      setSuggestionsOpen(false);
    }

    function setActiveOption(index) {
      activeIndex = index;
      Array.from(suggestions.querySelectorAll("[role='option']")).forEach((option, optionIndex) => {
        const isActive = optionIndex === index;
        option.setAttribute("aria-selected", String(isActive));
        option.classList.toggle("is-active", isActive);
        if (isActive) input.setAttribute("aria-activedescendant", option.id);
      });
    }

    function renderStatus(message) {
      rendered = [];
      activeIndex = -1;
      suggestions.replaceChildren();
      const status = document.createElement("div");
      status.className = "filter-combobox-empty";
      status.textContent = message;
      suggestions.append(status);
      setSuggestionsOpen(true);
    }

    function selectPlace(place, { dispatch = true } = {}) {
      const next = normalizePlace(place);
      selectedPlace = next;
      committedPlace = next;
      searchQuery = "";
      closeSuggestions();
      syncDisplay();
      if (dispatch) onChange?.(next);
    }

    function setValue(place, { dispatch = false } = {}) {
      const next = normalizePlace(place);
      selectedPlace = next;
      committedPlace = next;
      searchQuery = "";
      closeSuggestions();
      syncDisplay();
      if (dispatch) onChange?.(next);
    }

    function renderSuggestions(items) {
      rendered = items;
      suggestions.replaceChildren();

      if (!items.length) {
        renderStatus("No matching locations.");
        return;
      }

      items.forEach((item, index) => {
        const option = document.createElement("button");
        const label = document.createElement("span");
        option.type = "button";
        option.className = "filter-combobox-option";
        option.id = `${input.id || "locationSearch"}-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.setAttribute("aria-label", `Select ${item.suggestionLabel || item.label}`);
        label.className = "filter-combobox-option-label";
        label.textContent = item.suggestionLabel || item.label;
        option.append(label);
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        option.addEventListener("click", () => {
          selectPlace(item);
        });
        suggestions.append(option);
      });

      setSuggestionsOpen(true);
      setActiveOption(0);
    }

    async function search(query) {
      const trimmed = String(query || "").trim();
      if (trimmed.length < 2) {
        if (!getAccessToken()) {
          renderStatus("Location search is unavailable.");
          return;
        }
        renderStatus("Enter a street, city, or state to begin.");
        return;
      }

      fetchController?.abort();
      fetchController = new AbortController();
      renderStatus("Searching…");

      try {
        const items = await fetchSuggestions(trimmed, { signal: fetchController.signal });
        if (destroyed) return;
        renderSuggestions(items);
      } catch (error) {
        if (error?.name === "AbortError" || destroyed) return;
        renderStatus("Unable to search locations.");
      }
    }

    function scheduleSearch(query) {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void search(query);
      }, DEBOUNCE_MS);
    }

    function restoreCommitted() {
      selectedPlace = committedPlace;
      searchQuery = "";
      closeSuggestions();
      syncDisplay();
    }

    function clearValue({ dispatch = true } = {}) {
      selectedPlace = null;
      committedPlace = null;
      searchQuery = "";
      closeSuggestions();
      syncDisplay();
      if (dispatch) onChange?.(null);
    }

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.placeholder = placeholder;

    input.addEventListener("input", () => {
      selectedPlace = null;
      searchQuery = input.value;
      scheduleSearch(searchQuery);
    });

    input.addEventListener("focus", () => {
      if (committedPlace && input.value === committedPlace.label && !searchQuery) {
        input.select();
        return;
      }
      if (searchQuery.trim().length >= 2 || !committedPlace) {
        scheduleSearch(searchQuery || input.value);
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        if (!rendered.length) return;
        event.preventDefault();
        setActiveOption(Math.min(rendered.length - 1, activeIndex + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        if (!rendered.length) return;
        event.preventDefault();
        setActiveOption(Math.max(0, activeIndex - 1));
        return;
      }
      if (event.key === "Enter") {
        if (!isOpen() || activeIndex < 0 || !rendered[activeIndex]) return;
        event.preventDefault();
        selectPlace(rendered[activeIndex]);
        return;
      }
      if (event.key === "Escape") {
        if (!isOpen()) return;
        event.preventDefault();
        restoreCommitted();
      }
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (destroyed || field.contains(document.activeElement)) return;
        restoreCommitted();
      }, 120);
    });

    clearButton?.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    clearButton?.addEventListener("click", () => {
      clearValue();
      input.focus();
    });

    function handleOutside(event) {
      if (!field.contains(event.target)) restoreCommitted();
    }

    document.addEventListener("mousedown", handleOutside);

    control?.addEventListener("mousedown", (event) => {
      if (clearButton?.contains(event.target) || event.target === input) return;
      event.preventDefault();
      input.focus();
    });

    syncDisplay();

    return {
      getValue() {
        return committedPlace;
      },
      setValue,
      clear: clearValue,
      isOpen,
      close() {
        restoreCommitted();
      },
      destroy() {
        destroyed = true;
        window.clearTimeout(debounceTimer);
        fetchController?.abort();
        document.removeEventListener("mousedown", handleOutside);
        closeSuggestions();
      }
    };
  }

  root.WefranchLocationSearch = {
    fetchSuggestions,
    normalizePlace,
    fromLabel,
    fromRecord,
    toStoredPlace,
    getPlaceKey,
    bindField
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
