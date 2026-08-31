function openUnfilteredDatasetView() {
  clearCstSavedSearchSession({ persist: false });
  resetCstFilterSelections({ refresh: true });
  resetCstFilterSectionsToDefault?.();
  setFilterPanelOpen(true);
  persistViewSettings();
  window.syncSiteHeaderBreadcrumb?.();
}

function syncSiteHeaderBreadcrumb() {
  const headerApi = window.wefranchSiteHeader;
  if (!headerApi) return;

  const items = [
    { label: "Prospects" }
  ];

  if (!isCstSplashOpen()) {
    items[0].onClick = () => returnToCstSplash();
    items.push({
      label: TABLE_VIEW_OPTIONS[currentTableView]?.label || "Results",
      onClick: () => openUnfilteredDatasetView()
    });

    if (readerModeActive && readerModeSavedSearchTitle) {
      items.push({ label: readerModeSavedSearchTitle });
    }
  }

  headerApi.setBreadcrumb(items);
}

syncSiteHeaderBreadcrumb();
