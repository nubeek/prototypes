/* Distinguish a normal refresh from a hard refresh (bypass cache).
   Run inline in <head> before app scripts so persisted state can be skipped.

   Chromium reports a soft reload as deliveryType "cache" on the navigation entry.
   A hard reload re-fetches the document (deliveryType "" and a large transferSize). */
(function () {
  function getNavigationEntry() {
    return performance.getEntriesByType("navigation")[0] || null;
  }

  function isHardReloadNavigation(nav) {
    if (!nav || nav.type !== "reload") return false;

    if (nav.deliveryType === "cache") return false;
    if (nav.deliveryType) return true;

    // Fallback for browsers without deliveryType on navigation entries.
    if (nav.transferSize > 0 && nav.transferSize < 1000) return false;
    if (nav.transferSize > 1000) return true;

    return false;
  }

  const navigationEntry = getNavigationEntry();
  const navigationType = navigationEntry?.type || "";
  const isReload = navigationType === "reload";
  const isHardReload = isHardReloadNavigation(navigationEntry);

  window.WefranchReload = {
    navigationType,
    isReload,
    isSoftReload: isReload && !isHardReload,
    isHardReload
  };
})();
