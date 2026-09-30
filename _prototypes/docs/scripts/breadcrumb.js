(() => {
  const groups = window.WefranchDocGroups;
  if (!Array.isArray(groups)) {
    return;
  }

  const sync = (current) => {
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
      { label: "Docs", href: "../../../" },
      { label: categoryLabel, href: "../" },
      { label: pageLabel },
    ]);
  };

  window.WefranchDocBreadcrumb = { sync };

  const current = document.querySelector("[data-doc-current]")?.getAttribute("data-doc-current");
  if (current) {
    sync(current);
  }
})();
