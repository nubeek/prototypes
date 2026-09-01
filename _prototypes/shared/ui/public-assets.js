/* Resolve repo-root asset paths on GitHub project Pages.

   Locally, a page at /_prototypes/territories/ can use ../../assets/... and
   land on /assets/.... The published site lives at /prototypes/territories/,
   so the same relative URL escapes the project and 404s at /assets/....
   HTML is rewritten at deploy time; JS and JSON are not always, so resolve
   here before assigning image srcs or handing URLs to Mapbox. */
(function () {
  function isGitHubProjectPages() {
    return /\.github\.io$/i.test(window.location.hostname);
  }

  function getProjectBasePath() {
    if (!isGitHubProjectPages()) return "";

    const segment = window.location.pathname.split("/").filter(Boolean)[0];
    return segment ? `/${segment}` : "";
  }

  function resolvePublicAssetUrl(url) {
    if (url == null || url === "") return url;

    const value = String(url);
    if (/^(?:data:|blob:)/i.test(value)) return value;

    try {
      const resolved = new URL(value, window.location.href);
      const projectBase = getProjectBasePath();

      if (
        projectBase
        && resolved.origin === window.location.origin
        && resolved.pathname.startsWith("/assets/")
        && !resolved.pathname.startsWith(`${projectBase}/`)
      ) {
        resolved.pathname = projectBase + resolved.pathname;
      }

      return resolved.href;
    } catch (error) {
      return value;
    }
  }

  window.wefranchPublicAssets = {
    resolve: resolvePublicAssetUrl
  };
  window.resolvePublicAssetUrl = resolvePublicAssetUrl;
})();
