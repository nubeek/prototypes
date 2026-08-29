(() => {
  if (window.wefranchSiteHeader) {
    return;
  }

  const VISIBILITY_STORAGE_KEY = "wefranch:site-header-visible";

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

  const readVisible = () => {
    try {
      return window.localStorage?.getItem(VISIBILITY_STORAGE_KEY) !== "0";
    } catch (error) {
      return true;
    }
  };

  const writeVisible = (visible) => {
    try {
      window.localStorage?.setItem(VISIBILITY_STORAGE_KEY, visible ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const applyVisible = (visible) => {
    document.documentElement.classList.toggle("is-site-header-hidden", !visible);
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    header.toggleAttribute("inert", !visible);
    header.setAttribute("aria-hidden", String(!visible));
  };

  const setVisible = (visible) => {
    const next = Boolean(visible);
    writeVisible(next);
    applyVisible(next);
    return next;
  };

  applyVisible(readVisible());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyVisible(readVisible());
    }, { once: true });
  }

  window.wefranchSiteHeader = {
    setBreadcrumb,
    isVisible: readVisible,
    setVisible,
  };
})();
