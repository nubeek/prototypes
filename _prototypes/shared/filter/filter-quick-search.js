(function () {
  const suggestionClosers = new WeakMap();
  const DEFAULT_MIN_CHARS = 2;
  const DEFAULT_DEBOUNCE_MS = 250;
  const LOCATION_ICON = `<svg viewBox="0 0 16 20" focusable="false"><path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/></svg>`;
  const TAG_ICON = `<svg viewBox="0 0 16 16" focusable="false"><path d="M7.2.8 15 8.6a1.4 1.4 0 0 1 0 2l-4.4 4.4a1.4 1.4 0 0 1-2 0L.8 7.2V.8h6.4Zm-3 3.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"/></svg>`;
  const BUILDING_ICON = `<svg viewBox="0 0 16 16" focusable="false"><path d="M2 15V1h8v4h4v10H2Zm2-2h2V11H4v2Zm0-4h2V7H4v2Zm0-4h2V3H4v2Zm4 8h2V11H8v2Zm0-4h2V7H8v2Zm0-4h2V3H8v2Zm4 8h2V7h-2v6Z"/></svg>`;
  const PERSON_ICON = `<svg viewBox="0 0 16 16" focusable="false"><path d="M8 8a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 8Zm0 1.6c-3.2 0-6.4 1.6-6.4 4V15h12.8v-1.4c0-2.4-3.2-4-6.4-4Z"/></svg>`;
  const FLAG_ICON = `<svg viewBox="0 0 16 16" focusable="false"><path d="M3 1.2v13.6h1.6V9.4h8.2L10.6 6l2.2-3.4H4.6V1.2H3Z"/></svg>`;

  function createDefaultSuggestionIcon(item) {
    const icon = document.createElement("span");
    icon.className = "filter-search-suggestion-icon";
    icon.setAttribute("aria-hidden", "true");

    if (item?.logoSrc || item?.logoFallback) {
      icon.classList.add("has-logo");

      const fallback = document.createElement("span");
      fallback.className = "filter-search-suggestion-logo-fallback";
      fallback.textContent = item.logoFallback || "";
      icon.append(fallback);

      if (!item.logoSrc) {
        icon.classList.add("is-logo-missing");
        return icon;
      }

      const image = document.createElement("img");
      image.src = item.logoSrc;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.remove();
        icon.classList.add("is-logo-missing");
      });
      icon.append(image);
      return icon;
    }

    const glyph = {
      category: TAG_ICON,
      company: BUILDING_ICON,
      franchisee: PERSON_ICON,
      brand: PERSON_ICON,
      franchise: PERSON_ICON,
      stage: FLAG_ICON
    }[item?.type] || LOCATION_ICON;

    icon.classList.add("is-glyph");
    icon.innerHTML = glyph;
    return icon;
  }

  function addSelectValues(select, values) {
    const combobox = window.WefranchFilterCombobox;
    if (!select || !combobox || !values?.length) return false;

    const nextIncluded = new Set(combobox.getIncludedValues(select).map(String));
    const nextExcluded = new Set(combobox.getExcludedValues(select).map(String));
    let changed = false;

    values.forEach((value) => {
      const text = String(value || "").trim();
      if (!text) return;

      if (nextExcluded.has(text)) {
        nextExcluded.delete(text);
        nextIncluded.add(text);
        changed = true;
        return;
      }

      if (!nextIncluded.has(text)) {
        nextIncluded.add(text);
        changed = true;
      }
    });

    if (!changed) return false;

    combobox.setIncludedExcludedValues(select, [...nextIncluded], [...nextExcluded]);
    combobox.getCombobox(select)?.sync();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function expandSection(target) {
    const section = target instanceof Element
      ? target.closest(".filter-section")
      : null;
    const panel = section?.closest(".filter-panel");
    if (!section || !panel) return;

    window.WefranchFilterSections?.applyExpansion?.(panel, {
      mode: "preserve",
      shouldExpand: (candidate) => candidate === section
    });
    window.WefranchFilterSections?.scrollExpandedSectionIntoView?.(panel, section);
  }

  function create(options = {}) {
    const root = options.root;
    const input = options.input;
    const clearButton = options.clearButton;
    const menu = options.menu;
    const menuList = options.menuList || options.menu;
    const getSuggestions = options.getSuggestions;
    const renderIcon = options.renderIcon || createDefaultSuggestionIcon;
    const onSelect = options.onSelect;
    const minChars = Number.isFinite(options.minChars) ? options.minChars : DEFAULT_MIN_CHARS;
    const debounceMs = Number.isFinite(options.debounceMs) ? options.debounceMs : DEFAULT_DEBOUNCE_MS;
    const emptyMessage = options.emptyMessage || "No matches found";
    const suggestionPrefix = options.suggestionPrefix || "filterQuickSearchSuggestion";

    if (!root || !input || !menuList || typeof getSuggestions !== "function") {
      return { reset() {} };
    }

    const panel = root.closest(".filter-panel");
    let activeSuggestionIndex = -1;
    let renderedSuggestions = [];
    let debounceTimer = 0;
    let fetchController = null;

    function setSuggestionsOpen(isOpen) {
      input.setAttribute("aria-expanded", String(isOpen));
      menu?.setAttribute("aria-hidden", String(!isOpen));
      menuList.setAttribute("aria-hidden", String(!isOpen));
      root.classList.toggle("is-suggestions-open", isOpen);
      panel?.classList.toggle("is-quick-search-open", isOpen);
      if (isOpen) window.WefranchFilterCombobox?.fitOpenMenus?.();
    }

    function closeSuggestions() {
      activeSuggestionIndex = -1;
      renderedSuggestions = [];
      menuList.replaceChildren();
      input.removeAttribute("aria-activedescendant");
      setSuggestionsOpen(false);
    }

    function syncActiveSuggestion() {
      menuList.querySelectorAll(".filter-search-suggestion").forEach((button, index) => {
        const isActive = index === activeSuggestionIndex;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));

        if (isActive) {
          input.setAttribute("aria-activedescendant", button.id);
          button.scrollIntoView({ block: "nearest" });
        }
      });

      if (activeSuggestionIndex === -1) {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function appendHeading(label) {
      const heading = document.createElement("div");
      heading.className = "filter-search-suggestion-heading";
      heading.textContent = label;
      menuList.append(heading);
    }

    function appendStatus(message) {
      const status = document.createElement("div");
      status.className = "filter-search-suggestion-status";
      status.textContent = message;
      menuList.append(status);
    }

    function appendSuggestionButton(item, index) {
      const button = document.createElement("button");
      const label = document.createElement("span");

      button.type = "button";
      button.className = "filter-search-suggestion";
      button.id = `${suggestionPrefix}-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.setAttribute("aria-label", `Add ${item.label} filter`);

      label.className = "filter-search-suggestion-label";
      label.textContent = item.label;

      button.append(renderIcon(item), label);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("mouseenter", () => {
        activeSuggestionIndex = index;
        syncActiveSuggestion();
      });
      button.addEventListener("click", () => selectSuggestion(item));
      menuList.append(button);
    }

    function renderSuggestions(items) {
      renderedSuggestions = items;
      activeSuggestionIndex = items.length ? 0 : -1;
      menuList.replaceChildren();

      if (!items.length) {
        appendHeading("Suggestions");
        appendStatus(emptyMessage);
        setSuggestionsOpen(true);
        return;
      }

      let currentGroup = "";
      items.forEach((item, index) => {
        if (item.group && item.group !== currentGroup) {
          currentGroup = item.group;
          appendHeading(currentGroup);
        }
        appendSuggestionButton(item, index);
      });

      setSuggestionsOpen(true);
      syncActiveSuggestion();
    }

    function syncClearButton() {
      if (clearButton) {
        clearButton.hidden = !input.value.trim();
      }
    }

    function selectSuggestion(item) {
      closeSuggestions();
      input.value = "";
      syncClearButton();
      onSelect?.(item);
      input.focus({ preventScroll: true });
    }

    function renderSearchingSuggestions() {
      menuList.replaceChildren();
      appendHeading("Suggestions");
      appendStatus("Searching…");
      setSuggestionsOpen(true);
    }

    async function requestSuggestions(query) {
      fetchController?.abort();
      fetchController = new AbortController();

      const trimmedQuery = query.trim();
      if (trimmedQuery.length < minChars) {
        closeSuggestions();
        return;
      }

      renderSearchingSuggestions();

      try {
        const items = await getSuggestions(trimmedQuery, { signal: fetchController.signal }) || [];
        if (input.value.trim() !== trimmedQuery || document.activeElement !== input) return;
        renderSuggestions(items);
      } catch (error) {
        if (error?.name === "AbortError") return;
        renderSuggestions([]);
      }
    }

    function scheduleSuggestions(query) {
      window.clearTimeout(debounceTimer);

      if (!query.trim()) {
        fetchController?.abort();
        closeSuggestions();
        return;
      }

      debounceTimer = window.setTimeout(() => {
        void requestSuggestions(query);
      }, debounceMs);
    }

    function reset() {
      window.clearTimeout(debounceTimer);
      fetchController?.abort();
      input.value = "";
      closeSuggestions();
      syncClearButton();
    }

    input.addEventListener("input", () => {
      syncClearButton();
      scheduleSuggestions(input.value);
    });

    input.addEventListener("focus", () => {
      if (renderedSuggestions.length) {
        setSuggestionsOpen(true);
      } else if (input.value.trim().length >= minChars) {
        scheduleSuggestions(input.value);
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && renderedSuggestions.length) {
        event.preventDefault();
        activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, renderedSuggestions.length - 1);
        syncActiveSuggestion();
        return;
      }

      if (event.key === "ArrowUp" && renderedSuggestions.length) {
        event.preventDefault();
        activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
        syncActiveSuggestion();
        return;
      }

      if (event.key === "Enter") {
        if (activeSuggestionIndex >= 0 && renderedSuggestions[activeSuggestionIndex]) {
          event.preventDefault();
          selectSuggestion(renderedSuggestions[activeSuggestionIndex]);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
        input.blur();
      }
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!root.contains(document.activeElement)) {
          fetchController?.abort();
          closeSuggestions();
        }
      }, 0);
    });

    root.addEventListener("submit", (event) => {
      event.preventDefault();

      if (activeSuggestionIndex >= 0 && renderedSuggestions[activeSuggestionIndex]) {
        selectSuggestion(renderedSuggestions[activeSuggestionIndex]);
      }
    });

    clearButton?.addEventListener("mousedown", (event) => event.preventDefault());
    clearButton?.addEventListener("click", () => {
      reset();
      input.focus({ preventScroll: true });
    });

    document.addEventListener("mousedown", (event) => {
      if (!root.contains(event.target)) {
        closeSuggestions();
      }
    });

    syncClearButton();
    suggestionClosers.set(input, closeSuggestions);

    return { reset };
  }

  function isApplePlatform() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  }

  function isQuickSearchShortcut(event) {
    if (event.repeat || event.altKey || event.shiftKey) return false;
    const isK = event.key === "k" || event.key === "K" || event.code === "KeyK";
    if (!isK) return false;
    return event.metaKey || event.ctrlKey;
  }

  function isQuickSearchShortcutBlocked() {
    return Boolean(document.querySelector(
      ".proto-modal-overlay:not([hidden]), .profile-modal-overlay:not([hidden])"
    ));
  }

  function appendShortcutKey(shortcut, label, className) {
    const key = document.createElement("span");
    key.className = className
      ? `filter-search-shortcut-key ${className}`
      : "filter-search-shortcut-key";
    key.textContent = label;
    shortcut.append(key);
  }

  function ensureQuickSearchShortcut(input) {
    const root = input?.closest(".filter-search");
    if (!root || root.querySelector(".filter-search-shortcut")) return;

    const shortcut = document.createElement("span");
    shortcut.className = "filter-search-shortcut";
    shortcut.setAttribute("aria-hidden", "true");

    if (isApplePlatform()) {
      appendShortcutKey(shortcut, "⌘", "filter-search-shortcut-command");
    } else {
      appendShortcutKey(shortcut, "Ctrl", "filter-search-shortcut-key--text");
    }
    appendShortcutKey(shortcut, "K");

    const clearButton = root.querySelector(".filter-search-clear");
    if (clearButton) {
      clearButton.before(shortcut);
    } else {
      input.after(shortcut);
    }

    shortcut.addEventListener("mousedown", (event) => {
      event.preventDefault();
      input.focus({ preventScroll: true });
    });
  }

  function annotateQuickSearchShortcut(options = {}) {
    const shortcutLabel = isApplePlatform() ? "⌘K" : "Ctrl+K";
    const keyshortcuts = isApplePlatform() ? "Meta+K" : "Control+K";
    const input = options.input || document.getElementById("filterQuickSearchInput");

    if (input) {
      input.setAttribute("aria-keyshortcuts", keyshortcuts);
      input.title = `Quick search (${shortcutLabel})`;
      ensureQuickSearchShortcut(input);
    }

    if (options.trigger) {
      options.trigger.setAttribute("aria-keyshortcuts", keyshortcuts);
      options.trigger.title = `Quick search (${shortcutLabel})`;
    }
  }

  let focusRequest = 0;

  function getQuickSearchInput(options = {}) {
    return options.input || document.getElementById("filterQuickSearchInput");
  }

  function isQuickSearchFocused(options = {}) {
    const input = getQuickSearchInput(options);
    const root = input?.closest(".filter-search");
    return Boolean(root?.contains(document.activeElement));
  }

  function openFilterQuickSearch(options = {}) {
    const input = getQuickSearchInput(options);
    if (!input) return;

    const request = ++focusRequest;
    options.onBeforeOpen?.();

    if (!options.isPanelOpen?.()) {
      options.setPanelOpen?.(true);
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (request !== focusRequest) return;
        input.focus({ preventScroll: true });
      });
    });
  }

  function closeFilterQuickSearch(options = {}) {
    focusRequest += 1;
    const input = getQuickSearchInput(options);
    suggestionClosers.get(input)?.();
    const root = input?.closest(".filter-search");
    const active = document.activeElement;
    if (root?.contains(active) && typeof active.blur === "function") {
      active.blur();
      return;
    }
    input?.blur();
  }

  function bindQuickSearchShortcut(options = {}) {
    annotateQuickSearchShortcut(options);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isQuickSearchFocused(options)) {
        event.preventDefault();
        event.stopPropagation();
        closeFilterQuickSearch(options);
        return;
      }

      if (!isQuickSearchShortcut(event)) return;
      event.preventDefault();
      if (isQuickSearchFocused(options)) {
        closeFilterQuickSearch(options);
        return;
      }
      if (isQuickSearchShortcutBlocked()) return;
      openFilterQuickSearch(options);
    }, true);
  }

  function bindToolbarQuickSearchLauncher(options = {}) {
    const trigger = options.trigger;

    bindQuickSearchShortcut(options);

    if (!trigger) return { focus: () => openFilterQuickSearch(options) };

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      trigger.blur();
      openFilterQuickSearch(options);
    });

    return { focus: () => openFilterQuickSearch(options) };
  }

  window.WefranchFilterQuickSearch = {
    create,
    addSelectValues,
    expandSection,
    openFilterQuickSearch,
    bindToolbarQuickSearchLauncher
  };
})();
