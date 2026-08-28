function syncSiteHeaderBreadcrumb() {
  const headerApi = window.wefranchSiteHeader;
  if (!headerApi) return;

  const items = [
    { label: "Wefranch", href: "../" },
    { label: "Prospects" }
  ];

  if (!isCstSplashOpen()) {
    items[1].onClick = () => returnToCstSplash();
    items.push({
      label: TABLE_VIEW_OPTIONS[currentTableView]?.label || "Results"
    });

    if (readerModeActive && readerModeSavedSearchTitle) {
      items.push({ label: readerModeSavedSearchTitle });
    }
  }

  headerApi.setBreadcrumb(items);
}

syncSiteHeaderBreadcrumb();
