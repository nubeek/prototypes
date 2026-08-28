(() => {
  if (window.wefranchSiteHeader) {
    return;
  }

  const getBreadcrumb = () => document.querySelector("[data-site-breadcrumb]");

  const createBreadcrumbItem = (item, isCurrent) => {
    const label = String(item?.label || "").trim();
    let element;

    if (isCurrent) {
      element = document.createElement("span");
      element.className = "breadcrumb-current";
      element.setAttribute("aria-current", "page");
    } else if (item?.href) {
      element = document.createElement("a");
      element.className = "breadcrumb-link";
      element.href = item.href;
    } else if (typeof item?.onClick === "function") {
      element = document.createElement("button");
      element.className = "breadcrumb-link";
      element.type = "button";
      element.addEventListener("click", item.onClick);
    } else {
      element = document.createElement("span");
    }

    element.textContent = label;
    return element;
  };

  const setBreadcrumb = (items) => {
    const breadcrumb = getBreadcrumb();
    const validItems = Array.isArray(items)
      ? items.filter((item) => String(item?.label || "").trim())
      : [];

    if (!breadcrumb || !validItems.length) {
      return false;
    }

    const fragment = document.createDocumentFragment();
    validItems.forEach((item, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = "/";
        fragment.appendChild(separator);
      }

      fragment.appendChild(createBreadcrumbItem(item, index === validItems.length - 1));
    });

    breadcrumb.replaceChildren(fragment);
    return true;
  };

  window.wefranchSiteHeader = {
    setBreadcrumb,
  };
})();
