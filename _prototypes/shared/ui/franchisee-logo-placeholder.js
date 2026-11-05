(function () {
  const PLACEHOLDER_CLASS = "is-franchisee-placeholder";
  const VISIBLE_CLASS = "is-visible";
  const IMG_ERROR_HANDLER = "this.style.display='none';this.previousElementSibling?.classList.add('is-visible');";

  function getFranchiseeLogoFallbackMarkup({ visible = false } = {}) {
    const visibility = visible ? ` ${VISIBLE_CLASS}` : "";
    return `<span class="owner-logo-fallback ${PLACEHOLDER_CLASS}${visibility}" aria-hidden="true"></span>`;
  }

  function getOwnerDetailLogoMarkup(owner) {
    const hasLogo = Boolean(owner?.logoSrc);
    const placeholder = getFranchiseeLogoFallbackMarkup({ visible: !hasLogo });
    const imageMarkup = hasLogo
      ? `<img src="${owner.logoSrc}" alt="" onerror="${IMG_ERROR_HANDLER}">`
      : "";
    const containerClass = hasLogo ? "owner-detail-logo" : "owner-detail-logo is-franchisee-placeholder";

    return `<span class="${containerClass}" aria-hidden="true">${placeholder}${imageMarkup}</span>`;
  }

  window.WefranchFranchiseeLogo = {
    PLACEHOLDER_CLASS,
    VISIBLE_CLASS,
    IMG_ERROR_HANDLER,
    getFranchiseeLogoFallbackMarkup,
    getOwnerDetailLogoMarkup,
    applySplashFallback(fallback, item) {
      const usePlaceholder = item?.type === "franchisee" && !item?.logoSrc;
      fallback.className = usePlaceholder
        ? "cst-splash__search-suggestion-logo-fallback is-franchisee-placeholder is-visible"
        : "cst-splash__search-suggestion-logo-fallback";
      fallback.textContent = usePlaceholder ? "" : (item?.logoFallback || "");
    },
    markSplashIconMissing(icon, item) {
      if (item?.type === "franchisee") {
        icon.classList.add("is-franchisee-logo-missing");
      }
    }
  };
}());
