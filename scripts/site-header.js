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

  const getMenuButton = () => document.querySelector(".site-header-menu");

  const syncMenuButton = (isOpen) => {
    const button = getMenuButton();
    if (!button) {
      return;
    }

    const open = Boolean(isOpen);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  const toggleQuickMenu = () => {
    if (typeof window.wefranchProtoNav?.toggle === "function") {
      syncMenuButton(window.wefranchProtoNav.toggle());
      return;
    }

    try {
      window.parent.postMessage({
        type: "wefranch:proto-nav-toggle",
      }, window.location.origin);
    } catch (error) {
      // Ignore cross-origin parent access.
    }
  };

  const bindMenuButton = () => {
    const button = getMenuButton();
    if (!button || button.dataset.quickMenuBound === "true") {
      return;
    }

    button.dataset.quickMenuBound = "true";
    button.setAttribute("aria-haspopup", "true");
    syncMenuButton(window.wefranchProtoNav?.isOpen?.() ?? false);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleQuickMenu();
    });
  };

  applyVisible(readVisible());
  bindMenuButton();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyVisible(readVisible());
      bindMenuButton();
    }, { once: true });
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "wefranch:proto-nav-state") {
      return;
    }

    syncMenuButton(event.data.isOpen);
  });

  window.wefranchSiteHeader = {
    setBreadcrumb,
    isVisible: readVisible,
    setVisible,
    syncMenuButton,
  };
})();
