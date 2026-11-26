(() => {
  const API_URL = "api.json";

  const select = document.querySelector("[data-logo-collection]");
  const grid = document.querySelector("[data-logo-grid]");
  const searchInput = document.querySelector("[data-logo-search]");
  const searchClear = document.querySelector("[data-logo-search-clear]");
  const empty = document.querySelector("[data-logo-empty]");

  const readCollection = () => {
    const requested = new URLSearchParams(window.location.search).get("collection");
    return requested === "franchises" ? "franchises" : "franchisees";
  };

  const writeCollection = (value) => {
    const url = new URL(window.location.href);
    if (value === "franchisees") {
      url.searchParams.delete("collection");
    } else {
      url.searchParams.set("collection", value);
    }
    window.history.replaceState({}, "", url);
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const normalizeSearch = (value) => String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const altNamesText = (logo) => {
    const names = logo?.alt_names;
    return Array.isArray(names) ? names.join(" ") : "";
  };

  const searchQuery = () => normalizeSearch(searchInput?.value);

  const syncSearchChrome = () => {
    const field = searchInput?.closest(".logo-search");
    const hasQuery = Boolean(searchInput?.value.trim());
    field?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  };

  const applySearch = () => {
    const query = searchQuery();
    let visible = 0;
    grid.querySelectorAll(".logo-card").forEach((card) => {
      const match = !query || String(card.dataset.search || "").includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
    syncSearchChrome();
  };

  let catalog = [];

  const render = (collection) => {
    const items = catalog
      .filter((logo) => logo.collection === collection)
      .map((logo) => {
        const label = logo.name || logo.file;
        const file = logo.file;
        return {
          file,
          label,
          search: normalizeSearch(`${label} ${file} ${altNamesText(logo)}`),
          src: new URL(logo.url, new URL(API_URL, window.location.href)).href
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    grid.classList.remove("is-entering-active");
    grid.classList.add("is-entering");
    grid.innerHTML = items.map((item, index) => `
      <a
        class="logo-card"
        href="${item.src}"
        download="${escapeHtml(item.file)}"
        data-search="${escapeHtml(item.search)}"
        style="--enter-index: ${index}"
        title="Download ${escapeHtml(item.file)}"
      >
        <div class="logo-card-mark">
          <img src="${item.src}" alt="${escapeHtml(item.label)}" />
        </div>
        <p class="logo-card-label">${escapeHtml(item.label)}</p>
        <p class="logo-card-file">${escapeHtml(item.file)}</p>
      </a>
    `).join("");
    applySearch();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        grid.classList.add("is-entering-active");
      });
    });
  };

  if (!select || !grid) {
    return;
  }

  const readSelectedCollection = () => (
    window.WefranchFilterCombobox?.getValue(select) || select.value || "franchisees"
  );

  const initial = readCollection();
  const combobox = window.WefranchFilterCombobox?.enhance(select, {
    singleSelect: true,
    clearable: false,
    searchable: false
  });
  if (combobox) {
    combobox.setValue(initial, { dispatch: false });
  } else {
    select.value = initial;
  }
  window.WefranchFilterCombobox?.bindOutsideClick();

  const showLoadError = () => {
    if (!empty) return;
    empty.hidden = false;
    empty.textContent = "Couldn't load logos.";
  };

  window.wefranchPageLoading?.hold();
  fetch(API_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Logo API responded ${response.status}`);
      }
      return response.json();
    })
    .then((api) => {
      catalog = Array.isArray(api?.logos) ? api.logos : [];
      render(readSelectedCollection());
    })
    .catch(showLoadError)
    .finally(() => {
      window.wefranchPageLoading?.done();
    });

  select.addEventListener("change", () => {
    const collection = readSelectedCollection();
    writeCollection(collection);
    render(collection);
  });

  searchInput?.addEventListener("input", applySearch);

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (searchInput.value) {
      searchInput.value = "";
      applySearch();
      return;
    }
    searchInput.blur();
  });

  searchClear?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!searchInput) return;
    searchInput.value = "";
    applySearch();
    searchInput.focus();
  });
})();
