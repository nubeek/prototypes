/* Distinguish a normal refresh from a hard refresh (bypass cache).
   Run inline in <head> before app scripts so persisted state can be skipped.

   A hard reload re-fetches every resource the page loads, so none of them can be
   served from the cache. A normal reload only revalidates, which leaves the
   subresources coming from the cache. The document on its own cannot answer
   this: an app that rewrites its URL with query params has no cache entry under
   that URL, so its document always looks freshly fetched. */
(function () {
  function getNavigationEntry() {
    return performance.getEntriesByType("navigation")[0] || null;
  }

  function hasCachedResource() {
    return performance
      .getEntriesByType("resource")
      .some((entry) => entry.deliveryType === "cache");
  }

  function isHardReloadNavigation(nav) {
    if (!nav || nav.type !== "reload") return false;

    if (nav.deliveryType === "cache") return false;
    // A revalidated document only transfers response headers.
    if (nav.transferSize > 0 && nav.transferSize < 1000) return false;

    return !hasCachedResource();
  }

  const navigationEntry = getNavigationEntry();
  const navigationType = navigationEntry?.type || "";
  const isReload = navigationType === "reload";
  let hardReload = null;

  // Resolved on first read, not now: this script runs before the page has
  // loaded the resources the answer depends on.
  function isHardReload() {
    if (hardReload === null) {
      hardReload = isHardReloadNavigation(navigationEntry);
    }

    return hardReload;
  }

  window.WefranchReload = {
    navigationType,
    isReload,
    get isSoftReload() {
      return isReload && !isHardReload();
    },
    get isHardReload() {
      return isHardReload();
    }
  };
})();
