(() => {
  const groups = window.WefranchDocGroups;
  const host = document.querySelector("[data-doc-sidebar]");
  if (!host || !Array.isArray(groups)) {
    return;
  }

  const current = host.getAttribute("data-doc-current");

  const search = document.createElement("form");
  search.className = "doc-sidebar-search";
  search.setAttribute("role", "search");
  search.autocomplete = "off";
  search.noValidate = true;
  search.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const icon = document.createElement("img");
  icon.className = "doc-sidebar-search-icon";
  icon.src = "../../../../../assets/icons/search.svg";
  icon.alt = "";
  icon.width = 16;
  icon.height = 16;
  icon.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.className = "doc-sidebar-search-input";
  input.type = "search";
  input.placeholder = "What are you searching for?";
  input.setAttribute("aria-label", "What are you searching for?");
  input.autocomplete = "off";
  input.spellcheck = false;

  search.append(icon, input);

  const divider = document.createElement("hr");
  divider.className = "doc-sidebar-divider";

  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Documents");

  groups.forEach((group, index) => {
    const section = document.createElement("div");
    section.className = "doc-sidebar-group";

    const listId = `doc-sidebar-group-${index + 1}`;
    const heading = document.createElement("h2");
    heading.className = "doc-sidebar-category";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "doc-sidebar-category-toggle";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", listId);

    const label = document.createElement("span");
    label.textContent = group.label;

    const chevron = document.createElement("span");
    chevron.className = "doc-sidebar-category-chevron";
    chevron.setAttribute("aria-hidden", "true");

    const chevronIcon = document.createElement("img");
    chevronIcon.src = "../../../../../assets/icons/chevron.svg";
    chevronIcon.alt = "";
    chevronIcon.width = 12;
    chevronIcon.height = 12;
    chevron.append(chevronIcon);

    toggle.append(label, chevron);
    heading.append(toggle);

    const list = document.createElement("ul");
    list.className = "doc-sidebar-list";
    list.id = listId;

    group.pages.forEach((page) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "doc-sidebar-link";
      link.href = `../../${group.slug}/${page.slug}/`;
      link.textContent = page.label;
      if (page.slug === current) {
        link.setAttribute("aria-current", "page");
      }
      item.append(link);
      list.append(item);
    });

    toggle.addEventListener("click", () => {
      const collapsed = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      list.hidden = collapsed;
    });

    section.append(heading, list);
    nav.append(section);
  });

  host.replaceChildren(search, divider, nav);
})();
