(() => {
  const groups = window.WefranchDocGroups;
  const current = document.querySelector("[data-doc-current]")?.getAttribute("data-doc-current");
  if (!Array.isArray(groups) || !current) {
    return;
  }

  let categoryLabel = "";
  let pageLabel = "";

  groups.some((group) => {
    const page = group.pages.find((entry) => entry.slug === current);
    if (!page) {
      return false;
    }

    categoryLabel = group.label;
    pageLabel = page.label;
    return true;
  });

  if (!categoryLabel || !pageLabel) {
    return;
  }

  window.wefranchSiteHeader?.setBreadcrumb([
    { label: "Docs", href: "../../" },
    { label: categoryLabel },
    { label: pageLabel },
  ]);
})();
