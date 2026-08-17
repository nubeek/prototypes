(() => {
  const isPresentationEmbed = new URLSearchParams(window.location.search).has("presentation");
  const isInsideProtoNavShell = () => {
    if (window === window.top) {
      return false;
    }

    try {
      return Boolean(window.parent.document.querySelector("iframe[data-proto-nav-shell]"));
    } catch (error) {
      return false;
    }
  };

  if (window.__wefranchProtoNav || isPresentationEmbed) {
    return;
  }

  window.__wefranchProtoNav = true;

  const isToggleShortcut = (event) => {
    const hasModifier = event.metaKey || event.ctrlKey;
    const isSlash = event.key === "/" || event.key === "?" || event.code === "Slash";
    return hasModifier && isSlash && !event.altKey;
  };

  if (isInsideProtoNavShell()) {
    window.addEventListener("keydown", (event) => {
      if (!isToggleShortcut(event) && event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      window.parent.postMessage({
        type: "wefranch:proto-nav-key",
        key: event.key,
        code: event.code,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      }, window.location.origin);
    }, true);
    return;
  }

  const STORAGE_KEY = "wefranch:proto-nav-open";
  const SHELL_STATE = { wefranchProtoNavShell: true };
  const ITEMS = [
    { id: "home", label: "Home", icon: "home.svg", href: "/_prototypes/" },
    { id: "prospects", label: "Prospects", icon: "prospects.svg", href: "/_prototypes/cst/" },
    { id: "territories", label: "Territories", icon: "territories.svg", href: "/_prototypes/territories/" },
    { id: "financial-modeling", label: "Financial Modeling", icon: "financial-modeling.svg", href: "/_prototypes/financial-modeling/" },
  ];
  const HOME_PAGES = [
    { id: "prospects", label: "Prospects", href: "/_prototypes/cst/" },
    { id: "territories", label: "Territories", href: "/_prototypes/territories/" },
    { id: "financial-modeling", label: "Financial Modeling", href: "/_prototypes/financial-modeling/" },
    { id: "docs", label: "Docs", href: "/_prototypes/docs/" },
    { id: "targets", label: "Targets", href: "/_prototypes/targets/" },
    { id: "one-pager", label: "One Pager", href: "/_prototypes/one-pager/" },
  ];

  const STYLES = `
.proto-nav,
.proto-nav * { box-sizing: border-box; }
.proto-nav {
  --proto-nav-width: 260px;
  --proto-nav-height: 60px;
  --proto-nav-cell-width: 62px;
  --proto-nav-cell-height: 48px;
  --proto-nav-inset: 48px;
  position: fixed;
  left: 50%;
  bottom: calc(-1 * (var(--proto-nav-height) + 8px));
  z-index: 2147483000;
  width: var(--proto-nav-width);
  height: var(--proto-nav-height);
  margin: 0 0 0 calc(var(--proto-nav-width) / -2);
  padding: 0;
  border: 0;
  overflow: visible;
  pointer-events: none;
  visibility: visible;
}
.proto-nav.is-open { pointer-events: auto; }
.proto-nav.is-entering { animation: proto-nav-enter 500ms both; }
.proto-nav.is-leaving { animation: proto-nav-leave 320ms cubic-bezier(0.4, 0, 0.2, 1) both; }
.proto-nav.is-open:not(.is-entering):not(.is-leaving) { bottom: var(--proto-nav-inset); }
.proto-nav__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--proto-nav-width);
  height: var(--proto-nav-height);
  padding: 6px;
  border-radius: 999px;
  background-color: rgba(244, 244, 244, 0.8);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 8px 20px rgba(17, 17, 17, 0.03);
}
.proto-nav__indicator {
  position: absolute;
  top: 6px;
  left: 6px;
  width: var(--proto-nav-cell-width);
  height: var(--proto-nav-cell-height);
  border-radius: 28px;
  background-color: #ffffff;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.02);
  transform: translate3d(0, 0, 0);
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.proto-nav__indicator[hidden] { display: none; }
.proto-nav__item {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: var(--proto-nav-cell-width);
  height: var(--proto-nav-cell-height);
  border: 0;
  border-radius: 28px;
  background: transparent;
  color: #111;
  text-decoration: none;
}
.proto-nav__icon {
  display: block;
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.42;
}
.proto-nav__item.is-active .proto-nav__icon,
.proto-nav__item:hover .proto-nav__icon { opacity: 1; }
.proto-nav__item:focus-visible { outline: 2px solid #8065e8; outline-offset: 2px; }
.proto-nav__home {
  z-index: 1;
  flex: 0 0 var(--proto-nav-cell-width);
  width: var(--proto-nav-cell-width);
  height: var(--proto-nav-cell-height);
}
.proto-nav__home > summary { list-style: none; cursor: pointer; }
.proto-nav__home > summary::-webkit-details-marker { display: none; }
.proto-nav__home[open] .proto-nav__icon { opacity: 1; }
.proto-nav__menu {
  position: absolute;
  top: auto;
  right: 0;
  bottom: calc(100% + 6px);
  left: 0;
  width: max-content;
  min-width: 0;
  margin: 0 auto;
  padding: 10px 0;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  z-index: 2;
  font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 160ms ease, bottom 160ms ease, visibility 0s linear 160ms;
}
.proto-nav.is-home-open .proto-nav__menu {
  bottom: calc(100% + 16px);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 160ms ease, bottom 160ms ease, visibility 0s;
}
.proto-nav__menu-item {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #111;
  font: inherit;
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  text-align: left;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-decoration: none;
}
.proto-nav__menu-item:hover { background: #f4f4f4; }
.proto-nav__menu-item:focus-visible { outline: 2px solid #8065e8; outline-offset: -2px; }
.proto-nav__menu-check {
  display: block;
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  opacity: 0;
}
.proto-nav__menu-item[aria-checked="true"] .proto-nav__menu-check { opacity: 1; }
.proto-nav__menu-item[aria-checked="true"] .proto-nav__menu-label { font-weight: 500; }
.proto-nav__menu-label { flex: 0 0 auto; white-space: nowrap; }
html.is-proto-nav-shell,
html.is-proto-nav-shell body {
  overflow: hidden !important;
  height: 100% !important;
}
html.is-proto-nav-shell {
  background: #fff;
}
iframe[data-proto-nav-shell] {
  position: fixed;
  inset: 0;
  z-index: 2147482990;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
  opacity: 1;
  transition: opacity 320ms ease;
}
iframe[data-proto-nav-shell].is-fading {
  opacity: 0;
}
@keyframes proto-nav-enter {
  0% {
    bottom: calc(-1 * (var(--proto-nav-height) + 8px));
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  82% {
    bottom: calc(var(--proto-nav-inset) + 4px);
    animation-timing-function: cubic-bezier(0.55, 0, 1, 1);
  }
  100% { bottom: var(--proto-nav-inset); }
}
@keyframes proto-nav-leave {
  0% { bottom: var(--proto-nav-inset); }
  100% { bottom: calc(-1 * (var(--proto-nav-height) + 8px)); }
}
@media (prefers-reduced-motion: reduce) {
  .proto-nav.is-entering,
  .proto-nav.is-leaving { animation: none; }
  .proto-nav.is-open { bottom: var(--proto-nav-inset); }
  .proto-nav__indicator { transition: none; }
  .proto-nav__menu,
  .proto-nav.is-home-open .proto-nav__menu { transition: none; }
  iframe[data-proto-nav-shell] { transition: none; }
}
`;

  const getSiteRoot = () => {
    const { pathname } = window.location;
    const markerIndex = pathname.indexOf("/_prototypes");
    if (markerIndex !== -1) {
      return pathname.slice(0, markerIndex);
    }
    return pathname.replace(/\/[^/]*$/, "");
  };

  const resolveUrl = (absolutePath) => `${getSiteRoot()}${absolutePath}`;

  const matchActiveId = (pathname) => {
    if (/\/one-pager(?:\/|$)/.test(pathname)) return "one-pager";
    if (/\/financial-modeling(?:\/|$)/.test(pathname)) return "financial-modeling";
    if (/\/territories(?:\/|$)/.test(pathname)) return "territories";
    if (/\/docs(?:\/|$)/.test(pathname)) return "docs";
    if (/\/targets(?:\/|$)/.test(pathname)) return "targets";
    if (/\/cst(?:\/|$)/.test(pathname)) return "prospects";
    if (
      /\/_prototypes\/?(?:index\.html)?$/.test(pathname) ||
      pathname === "/" ||
      (/\/index\.html$/.test(pathname) && !pathname.includes("/_prototypes/"))
    ) {
      return "home";
    }
    return null;
  };

  const getBarActiveId = (pageId) => {
    if (ITEMS.some((item) => item.id === pageId)) {
      return pageId;
    }

    if (HOME_PAGES.some((item) => item.id === pageId)) {
      return "home";
    }

    return null;
  };

  const readOpenState = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (error) {
      return false;
    }
  };

  const writeOpenState = (isOpen) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const installStyles = () => {
    if (document.getElementById("proto-nav-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "proto-nav-style";
    style.textContent = STYLES;
    (document.head || document.documentElement).appendChild(style);
  };

  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INDICATOR_MS = 240;

  const moveIndicator = (index, { animate = true } = {}) => {
    if (!indicator) {
      return;
    }

    if (index < 0) {
      indicator.hidden = true;
      return;
    }

    indicator.hidden = false;

    if (!animate) {
      indicator.style.transition = "none";
    }

    indicator.style.transform = `translate3d(${index * 62}px, 0, 0)`;

    if (!animate) {
      indicator.getBoundingClientRect();
      indicator.style.transition = "";
    }
  };

  const setActiveItem = (activeItem) => {
    navItems.forEach((item) => {
      const isActive = item === activeItem;
      item.classList.toggle("is-active", isActive);

      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  };

  const dismissHomeMenuFromShell = () => {
    closeHomeMenu();
  };

  const bindShellMenuDismiss = (enabled) => {
    if (!shellFrame) {
      return;
    }

    try {
      const frameDocument = shellFrame.contentDocument;
      if (!frameDocument) {
        return;
      }

      if (enabled) {
        frameDocument.addEventListener("mousedown", dismissHomeMenuFromShell);
      } else {
        frameDocument.removeEventListener("mousedown", dismissHomeMenuFromShell);
      }
    } catch (error) {
      // Ignore cross-origin frame access.
    }
  };

  const isHomeMenuPending = () => Boolean(homeMenuOpenTimer);

  const isHomeMenuOpen = () => Boolean(homeDropdown?.open) || isHomeMenuPending();

  const cancelHomeMenuOpen = () => {
    window.clearTimeout(homeMenuOpenTimer);
    homeMenuOpenTimer = 0;
  };

  const previewHomeSelection = () => {
    navItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === 0);
    });
    moveIndicator(0, { animate: !prefersReducedMotion() });
  };

  const closeHomeMenu = ({ restore = true } = {}) => {
    const wasPending = isHomeMenuPending();
    cancelHomeMenuOpen();

    const wasOpen = Boolean(homeDropdown?.open);
    if (wasOpen) {
      homeDropdown.open = false;
    }

    if (restore && (wasOpen || wasPending)) {
      syncActiveFromLocation({ animate: !prefersReducedMotion() });
    }

    return wasOpen || wasPending;
  };

  const openHomeMenuAfterSlide = () => {
    cancelHomeMenuOpen();
    previewHomeSelection();

    const alreadyOnHome = getBarActiveId(matchActiveId(window.location.pathname)) === "home";
    const delay = prefersReducedMotion() || alreadyOnHome ? 0 : INDICATOR_MS;
    const openMenu = () => {
      homeMenuOpenTimer = 0;
      if (homeDropdown) {
        homeDropdown.open = true;
      }
    };

    if (!delay) {
      openMenu();
      return;
    }

    homeMenuOpenTimer = window.setTimeout(openMenu, delay);
  };

  const syncHomeMenu = (pageId = matchActiveId(window.location.pathname)) => {
    homeMenu?.querySelectorAll("[data-nav-page]").forEach((option) => {
      option.setAttribute("aria-checked", String(option.dataset.navPage === pageId));
    });
  };

  const syncActiveFromLocation = ({ animate = false } = {}) => {
    const pageId = matchActiveId(window.location.pathname);
    const activeId = getBarActiveId(pageId);
    const activeIndex = ITEMS.findIndex((item) => item.id === activeId);
    const activeItem = activeIndex >= 0 ? navItems[activeIndex] : null;
    setActiveItem(activeItem);
    moveIndicator(activeIndex, { animate });
    syncHomeMenu(pageId);
  };

  const PAGE_FADE_MS = 320;

  const wait = (ms) => new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

  const fadeTo = async (element, hidden) => {
    if (!element) {
      return;
    }

    if (prefersReducedMotion()) {
      element.classList.toggle("is-fading", hidden);
      element.style.opacity = hidden ? "0" : "1";
      return;
    }

    element.classList.toggle("is-fading", hidden);
    element.style.opacity = hidden ? "0" : "1";
    await wait(PAGE_FADE_MS);
  };

  const hideHostPage = () => {
    document.documentElement.classList.add("is-proto-nav-shell");

    const hideBody = () => {
      if (!document.body) {
        return;
      }

      document.body.setAttribute("inert", "");
      document.body.setAttribute("aria-hidden", "true");
      document.body.style.setProperty("display", "none", "important");
    };

    if (document.body) {
      hideBody();
      return;
    }

    document.addEventListener("DOMContentLoaded", hideBody, { once: true });
  };

  const fadeOutHostPage = async () => {
    document.documentElement.classList.add("is-proto-nav-shell");

    if (!document.body || prefersReducedMotion()) {
      return;
    }

    document.body.style.transition = `opacity ${PAGE_FADE_MS}ms ease`;
    document.body.getBoundingClientRect();
    document.body.style.opacity = "0";
    await wait(PAGE_FADE_MS);
  };

  const createShellFrame = () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("data-proto-nav-shell", "");
    frame.title = "Prototype";
    frame.allow = "geolocation; clipboard-write; fullscreen";
    frame.classList.add("is-fading");
    frame.style.opacity = "0";
    return frame;
  };

  const loadShellFrame = (frame, url) => new Promise((resolve) => {
    const onLoad = () => {
      frame.removeEventListener("load", onLoad);
      resolve();
    };

    frame.addEventListener("load", onLoad);
    frame.src = url;
  });

  const showInShell = async (url, { push = true } = {}) => {
    const nextUrl = new URL(url, window.location.href).href;

    if (isNavigating) {
      pendingUrl = { url: nextUrl, push };
      return;
    }

    isNavigating = true;

    try {
      if (!shellFrame) {
        await fadeOutHostPage();
        hideHostPage();
        shellFrame = createShellFrame();
        document.documentElement.appendChild(shellFrame);
      } else {
        await fadeTo(shellFrame, true);
      }

      if (shellFrame.src !== nextUrl) {
        await loadShellFrame(shellFrame, nextUrl);
      }

      if (push && window.location.href !== nextUrl) {
        history.pushState(SHELL_STATE, "", nextUrl);
      }

      await fadeTo(shellFrame, false);
    } finally {
      isNavigating = false;

      if (pendingUrl) {
        const next = pendingUrl;
        pendingUrl = null;
        showInShell(next.url, { push: next.push });
      }
    }
  };

  const createNavIcon = (item) => {
    const icon = document.createElement("img");
    icon.className = "proto-nav__icon";
    icon.src = resolveUrl(`/assets/${item.icon}`);
    icon.alt = "";
    icon.decoding = "sync";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  };

  const createHomeMenu = (pageId) => {
    const menu = document.createElement("div");
    menu.className = "ui-menu proto-nav__menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Prototype pages");

    const checkSrc = resolveUrl("/assets/check.svg");

    HOME_PAGES.forEach((page) => {
      const option = document.createElement("a");
      option.className = "ui-menu-item toolbar-dropdown-option proto-nav__menu-item";
      option.href = resolveUrl(page.href);
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", String(page.id === pageId));
      option.dataset.navPage = page.id;

      const check = document.createElement("img");
      check.className = "proto-nav__menu-check";
      check.src = checkSrc;
      check.alt = "";
      check.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "toolbar-dropdown-label proto-nav__menu-label";
      label.textContent = page.label;

      option.append(check, label);
      menu.appendChild(option);
    });

    return menu;
  };

  const activatePage = (pageId, href) => {
    const barActiveId = getBarActiveId(pageId);
    const nextIndex = ITEMS.findIndex((item) => item.id === barActiveId);
    const nextItem = nextIndex >= 0 ? navItems[nextIndex] : null;
    setActiveItem(nextItem);
    moveIndicator(nextIndex, { animate: !prefersReducedMotion() });
    syncHomeMenu(pageId);
    showInShell(href);
  };

  const renderNav = () => {
    const pageId = matchActiveId(window.location.pathname);
    const activeId = getBarActiveId(pageId);
    const activeIndex = ITEMS.findIndex((item) => item.id === activeId);
    const nextNav = document.createElement("nav");
    nextNav.className = isOpen ? "proto-nav is-open" : "proto-nav";
    nextNav.setAttribute("data-proto-nav", "");
    nextNav.setAttribute("aria-label", "Prototype pages");
    nextNav.setAttribute("aria-hidden", isOpen ? "false" : "true");
    nextNav.toggleAttribute("inert", !isOpen);

    const bar = document.createElement("div");
    bar.className = "proto-nav__bar";

    indicator = document.createElement("span");
    indicator.className = "proto-nav__indicator";
    indicator.setAttribute("aria-hidden", "true");
    bar.appendChild(indicator);

    homeMenu = createHomeMenu(pageId);

    navItems = ITEMS.map((item) => {
      if (item.id === "home") {
        homeDropdown = document.createElement("details");
        homeDropdown.className = "toolbar-dropdown proto-nav__home";

        const summary = document.createElement("summary");
        summary.className = "proto-nav__item";
        summary.setAttribute("aria-label", item.label);
        summary.setAttribute("aria-haspopup", "menu");
        summary.setAttribute("aria-expanded", "false");
        summary.title = item.label;
        summary.dataset.navId = item.id;
        summary.appendChild(createNavIcon(item));

        if (item.id === activeId) {
          summary.classList.add("is-active");
          summary.setAttribute("aria-current", "page");
        }

        summary.addEventListener("click", (event) => {
          event.preventDefault();
          if (isHomeMenuOpen()) {
            closeHomeMenu();
            return;
          }

          openHomeMenuAfterSlide();
        });

        homeDropdown.addEventListener("toggle", () => {
          summary.setAttribute("aria-expanded", String(homeDropdown.open));
          nextNav.classList.toggle("is-home-open", homeDropdown.open);
          bindShellMenuDismiss(homeDropdown.open);
        });

        homeDropdown.appendChild(summary);
        bar.appendChild(homeDropdown);
        return summary;
      }

      const link = document.createElement("a");
      link.className = "proto-nav__item";
      link.href = resolveUrl(item.href);
      link.setAttribute("aria-label", item.label);
      link.title = item.label;
      link.dataset.navId = item.id;

      if (item.id === activeId) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }

      link.appendChild(createNavIcon(item));
      bar.appendChild(link);
      return link;
    });

    moveIndicator(activeIndex, { animate: false });
    nextNav.append(bar, homeMenu);

    nextNav.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      const option = event.target.closest("[data-nav-page]");
      if (option) {
        event.preventDefault();

        if (option.dataset.navPage === matchActiveId(window.location.pathname)) {
          closeHomeMenu();
          return;
        }

        closeHomeMenu({ restore: false });
        activatePage(option.dataset.navPage, option.href);
        return;
      }

      const link = event.target.closest(".proto-nav__item");
      if (!link) {
        return;
      }

      if (link.closest(".proto-nav__home")) {
        return;
      }

      if (link.getAttribute("aria-current") === "page") {
        event.preventDefault();
        closeHomeMenu();
        return;
      }

      event.preventDefault();
      closeHomeMenu({ restore: false });
      activatePage(link.dataset.navId, link.href);
    });

    return nextNav;
  };

  let nav = null;
  let navItems = [];
  let indicator = null;
  let homeDropdown = null;
  let homeMenu = null;
  let homeMenuOpenTimer = 0;
  let shellFrame = null;
  let isNavigating = false;
  let pendingUrl = null;
  let isOpen = readOpenState();
  let leaveTimer = 0;

  const syncOpenState = (animate) => {
    if (!nav) {
      return;
    }

    window.clearTimeout(leaveTimer);

    if (!isOpen) {
      closeHomeMenu({ restore: false });
    }

    nav.classList.toggle("is-open", isOpen);
    nav.classList.toggle("is-entering", Boolean(animate && isOpen));
    nav.classList.toggle("is-leaving", Boolean(animate && !isOpen));
    nav.toggleAttribute("inert", !isOpen);
    nav.setAttribute("aria-hidden", isOpen ? "false" : "true");
    writeOpenState(isOpen);

    if (animate && !isOpen) {
      leaveTimer = window.setTimeout(() => nav.classList.remove("is-leaving"), 300);
    }

    if (animate && isOpen) {
      leaveTimer = window.setTimeout(() => nav.classList.remove("is-entering"), 520);
    }
  };

  const mountNav = () => {
    if (nav) {
      return nav;
    }

    const existing = document.querySelector("nav[data-proto-nav]");
    if (existing) {
      nav = existing;
      return nav;
    }

    installStyles();
    nav = renderNav();
    document.documentElement.appendChild(nav);
    syncOpenState(false);
    return nav;
  };

  const toggleNav = () => {
    mountNav();
    isOpen = !isOpen;
    syncOpenState(true);
  };

  window.addEventListener("keydown", (event) => {
    if (isToggleShortcut(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleNav();
      return;
    }

    if (event.key === "Escape" && isHomeMenuOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeHomeMenu();
      return;
    }

    if (event.key === "Escape" && isOpen) {
      isOpen = false;
      syncOpenState(true);
    }
  }, true);

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "wefranch:proto-nav-key") {
      return;
    }

    if (isToggleShortcut(event.data)) {
      toggleNav();
      return;
    }

    if (event.data.key === "Escape" && isHomeMenuOpen()) {
      closeHomeMenu();
      return;
    }

    if (event.data.key === "Escape" && isOpen) {
      isOpen = false;
      syncOpenState(true);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (homeDropdown?.contains(event.target) || homeMenu?.contains(event.target) || !isHomeMenuOpen()) {
      return;
    }

    closeHomeMenu();
  });

  window.addEventListener("popstate", () => {
    if (!shellFrame) {
      return;
    }

    showInShell(window.location.href, { push: false });
    syncActiveFromLocation({ animate: !prefersReducedMotion() });
  });

  installStyles();
  mountNav();
})();
