(() => {
  const GROUPS = [
    {
      label: "Prospects",
      pages: [
        { slug: "getting-started", label: "Getting started" },
      ],
    },
    {
      label: "Email Campaigns",
      pages: [
        { slug: "email-campaigns", label: "Creating & sending campaign" },
        { slug: "setup-domain", label: "Sending domain setup" },
      ],
    },
    {
      label: "Franchise Concepts",
      pages: [
        { slug: "add-territories", label: "Adding territories" },
      ],
    },
  ];

  const host = document.querySelector("[data-doc-sidebar]");
  if (!host) {
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
  icon.src = "../../../../assets/icons/search.svg";
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

  GROUPS.forEach((group) => {
    const section = document.createElement("div");
    section.className = "doc-sidebar-group";

    const heading = document.createElement("h2");
    heading.className = "doc-sidebar-category";
    heading.textContent = group.label;

    const list = document.createElement("ul");
    list.className = "doc-sidebar-list";

    group.pages.forEach((page) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "doc-sidebar-link";
      link.href = `../${page.slug}/`;
      link.textContent = page.label;
      if (page.slug === current) {
        link.setAttribute("aria-current", "page");
      }
      item.append(link);
      list.append(item);
    });

    section.append(heading, list);
    nav.append(section);
  });

  host.replaceChildren(search, divider, nav);
})();
