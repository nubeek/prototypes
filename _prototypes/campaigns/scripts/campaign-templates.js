/* Templates tab: "Your templates" and "Basic templates" card grids, filtered
   by the toolbar search. Cards follow the Prospects splash tiles. */
(function () {
  const { formatDate } = window.WefranchCampaignFormat;

  const panel = document.getElementById("campaignsPanelTemplates");
  const searchForm = document.getElementById("templateSearch");
  const searchInput = document.getElementById("templateSearchInput");
  const searchClear = document.getElementById("templateSearchClear");
  const gallery = document.getElementById("campaignTemplates");
  const emptySearch = document.getElementById("templatesEmptySearch");
  const emptySearchMessage = document.getElementById("templatesEmptySearchMessage");

  function data() {
    return window.wefranchCampaignTemplates || { yours: [], basic: [] };
  }

  function sources() {
    const { yours = [], basic = [] } = data();
    return {
      yours: [...yours].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
      basic
    };
  }

  function findTemplate(id) {
    const { yours = [], basic = [] } = data();
    return [...yours, ...basic].find((template) => template.id === id) || null;
  }

  function queryText() {
    return String(searchInput?.value || "").trim().toLowerCase();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderCard(template) {
    const card = element("button", "template-card");
    card.type = "button";
    card.dataset.templateId = template.id;

    const preview = element("span", "template-card__preview");
    const sheet = element("img", "template-card__sheet");
    sheet.src = template.image;
    sheet.alt = "";
    sheet.loading = "lazy";
    sheet.decoding = "async";
    preview.append(sheet);

    const created = formatDate(template.createdAt);
    const field = element("span", "template-card__field");
    const copy = element("span", "template-card__copy");
    const chevron = element("span", "template-card__chevron");
    chevron.setAttribute("aria-hidden", "true");
    const chevronIcon = element("img");
    chevronIcon.src = "../../assets/icons/chevron.svg";
    chevronIcon.alt = "";
    chevron.append(chevronIcon);
    copy.append(element("span", "template-card__label", "Date created"), element("span", "template-card__value", created || "–"));
    field.append(copy, chevron);

    card.append(preview, element("span", "template-card__title", template.name), field);
    card.setAttribute("aria-label", created ? `${template.name}, created ${created}` : template.name);
    return card;
  }

  function render() {
    if (!gallery) return;
    const query = queryText();
    const groups = sources();
    let total = 0;

    gallery.querySelectorAll("[data-template-section]").forEach((section) => {
      const key = section.dataset.templateSection;
      const grid = section.querySelector("[data-template-grid]");
      const matches = (groups[key] || []).filter((template) => !query || template.name.toLowerCase().includes(query));
      total += matches.length;
      section.hidden = !matches.length;
      grid?.replaceChildren(...matches.map(renderCard));
    });

    const isEmpty = total === 0;
    gallery.hidden = isEmpty;
    panel?.classList.toggle("is-empty", isEmpty);
    if (emptySearch) emptySearch.hidden = !isEmpty;
    if (emptySearchMessage) {
      emptySearchMessage.textContent = query ? "No templates match your search." : "No templates yet.";
    }
  }

  function syncSearchChrome() {
    const hasQuery = Boolean(queryText());
    searchForm?.classList.toggle("is-active-search", hasQuery);
    if (searchClear) searchClear.hidden = !hasQuery;
  }

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  searchInput?.addEventListener("input", () => {
    syncSearchChrome();
    render();
  });
  searchClear?.addEventListener("click", (event) => {
    event.preventDefault();
    if (searchInput) searchInput.value = "";
    syncSearchChrome();
    render();
    searchInput?.focus();
  });

  gallery?.addEventListener("click", (event) => {
    const card = event.target instanceof Element ? event.target.closest(".template-card") : null;
    const template = card && findTemplate(card.dataset.templateId);
    if (!template) return;
    window.WefranchToast?.show({ message: `Editing ${template.name} is coming soon.` });
  });

  render();
})();
