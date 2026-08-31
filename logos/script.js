(() => {
  const COLLECTIONS = window.LOGO_COLLECTION || { franchisees: [], franchises: [] };
  const LOGO_ROOT = "../assets/logos";
  const ACRONYMS = new Set([
    "llc", "qsr", "srg", "plk", "pcrk", "sscp", "wks", "gps", "mbn", "ta", "fp", "cr", "ihop", "ups", "sbj"
  ]);
  const LABEL_OVERRIDES = {
    "7eleven": "7-Eleven",
    "b-and-g-food-enterprises-llc": "B&G Food Enterprises LLC",
    "k-mac-enterprises-inc": "K-Mac Enterprises Inc",
    "captain-ds": "Captain D's",
    "chick-fil-a": "Chick-fil-A",
    "chilis": "Chili's",
    "coffee-bean-tea-leaf": "Coffee Bean & Tea Leaf",
    "daves-hot-chicken": "Dave's Hot Chicken",
    "dennys": "Denny's",
    "dunkin": "Dunkin'",
    "f45-training": "F45 Training",
    "golds-gym": "Gold's Gym",
    "i9-sports": "i9 Sports",
    "jersey-mikes": "Jersey Mike's",
    "jimmy-johns": "Jimmy John's",
    "mcdonalds": "McDonald's",
    "papa-johns": "Papa John's",
    "qdoba": "QDOBA",
    "remax": "RE/MAX",
    "romulus-restaurants-l-l-c": "Romulus Restaurants LLC",
    "see-and-be-kitchen": "See & Be Kitchen",
    "tony-romas": "Tony Roma's",
    "tony-romas-bones-burgers": "Tony Roma's Bones & Burgers",
    "wendys": "Wendy's"
  };

  const select = document.querySelector("[data-logo-collection]");
  const grid = document.querySelector("[data-logo-grid]");

  const titleCaseLabel = (file) => {
    const stem = file.replace(/\.[^.]+$/, "");
    if (LABEL_OVERRIDES[stem]) {
      return LABEL_OVERRIDES[stem];
    }

    return stem
      .replace(/-l-l-c$/, "-llc")
      .split("-")
      .filter(Boolean)
      .map((part, index) => {
        if (ACRONYMS.has(part)) {
          return part.toUpperCase();
        }
        if (index > 0 && (part === "and" || part === "of")) {
          return part;
        }
        if (part === "inc") {
          return "Inc";
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  };

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

  const render = (collection) => {
    const files = COLLECTIONS[collection] || [];
    const items = files
      .map((file) => ({
        file,
        label: titleCaseLabel(file),
        src: `${LOGO_ROOT}/${collection}/${encodeURIComponent(file)}`
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    grid.classList.remove("is-entering-active");
    grid.classList.add("is-entering");
    grid.innerHTML = items.map((item, index) => `
      <a
        class="logo-card"
        href="${item.src}"
        download="${escapeHtml(item.file)}"
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
  window.WefranchFilterCombobox?.enhance(select, {
    singleSelect: true,
    clearable: false,
    searchable: false
  });
  window.WefranchFilterCombobox?.setValue(select, initial, { dispatch: false });
  window.WefranchFilterCombobox?.bindOutsideClick();
  render(initial);

  select.addEventListener("change", () => {
    const collection = readSelectedCollection();
    writeCollection(collection);
    render(collection);
  });
})();
