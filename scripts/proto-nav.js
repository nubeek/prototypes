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

  if (window.__wefranchProtoNav) {
    return;
  }

  const REDUCE_MOTION_STORAGE_KEY = "wefranch:reduce-motion";
  const REDUCE_MOTION_STYLE_ID = "wefranch-reduce-motion-style";
  const REDUCE_MOTION_STYLES = `
html.is-reduce-motion,
html.is-reduce-motion body {
  scroll-behavior: auto !important;
}
html.is-reduce-motion *:not(.mapboxgl-map):not(.mapboxgl-map *),
html.is-reduce-motion *:not(.mapboxgl-map):not(.mapboxgl-map *)::before,
html.is-reduce-motion *:not(.mapboxgl-map):not(.mapboxgl-map *)::after {
  animation: none !important;
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition: none !important;
  transition-duration: 0.01ms !important;
  transition-delay: 0ms !important;
  scroll-behavior: auto !important;
}
`;

  const readReduceMotionEnabled = () => {
    try {
      return window.localStorage?.getItem(REDUCE_MOTION_STORAGE_KEY) === "1";
    } catch (error) {
      return false;
    }
  };

  const writeReduceMotionEnabled = (enabled) => {
    try {
      window.localStorage?.setItem(REDUCE_MOTION_STORAGE_KEY, enabled ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const installReduceMotionStyles = (doc) => {
    if (!doc || doc.getElementById(REDUCE_MOTION_STYLE_ID)) {
      return;
    }

    const style = doc.createElement("style");
    style.id = REDUCE_MOTION_STYLE_ID;
    style.textContent = REDUCE_MOTION_STYLES;
    (doc.head || doc.documentElement).appendChild(style);
  };

  const applyReduceMotionToDocument = (doc, enabled) => {
    if (!doc) {
      return;
    }

    installReduceMotionStyles(doc);
    doc.documentElement.classList.toggle("is-reduce-motion", enabled);
    if (doc.body) {
      doc.body.classList.toggle("reduce-motion", enabled);
    }

    if (!enabled) {
      return;
    }

    doc.getAnimations?.().forEach((animation) => {
      try {
        if (animation.playState === "running") {
          animation.pause();
        }
      } catch (error) {
        // The animated element may have been removed while motion was reduced.
      }
    });
  };

  const bootReduceMotion = () => {
    applyReduceMotionToDocument(document, readReduceMotionEnabled());
    window.wefranchReduceMotion = {
      isEnabled: readReduceMotionEnabled,
      setEnabled: (enabled) => {
        const next = Boolean(enabled);
        writeReduceMotionEnabled(next);
        applyReduceMotionToDocument(document, next);
        return next;
      },
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        applyReduceMotionToDocument(document, readReduceMotionEnabled());
      }, { once: true });
    }
  };

  bootReduceMotion();

  if (isPresentationEmbed) {
    return;
  }

  window.__wefranchProtoNav = true;

  const isToggleShortcut = (event) => {
    const hasModifier = event.metaKey || event.ctrlKey;
    const isSlash = event.key === "/" || event.key === "?" || event.code === "Slash";
    return hasModifier && isSlash && !event.altKey;
  };

  const isScreenshotShortcut = (event) => {
    const hasModifier = event.metaKey || event.ctrlKey;
    const isP = event.key === "P" || event.key === "p" || event.code === "KeyP";
    return hasModifier && event.shiftKey && isP && !event.altKey;
  };

  const isRecordShortcut = (event) => {
    const hasModifier = event.metaKey || event.ctrlKey;
    const isO = event.key === "O" || event.key === "o" || event.code === "KeyO";
    return hasModifier && event.shiftKey && isO && !event.altKey;
  };

  if (isInsideProtoNavShell()) {
    window.addEventListener("keydown", (event) => {
      if (isRecordShortcut(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          if (typeof window.parent.__wefranchToggleRecording === "function") {
            window.parent.__wefranchToggleRecording();
            return;
          }
        } catch (error) {
          // Fall through to postMessage if the parent helper is unavailable.
        }
      }

      if (!isToggleShortcut(event) && !isScreenshotShortcut(event) && !isRecordShortcut(event) && event.key !== "Escape") {
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
        shiftKey: event.shiftKey,
      }, window.location.origin);
    }, true);
    return;
  }

  const STORAGE_KEY = "wefranch:proto-nav-open";
  const SITE_HEADER_STORAGE_KEY = "wefranch:site-header-visible";
  const SITE_HEADER_SETTING_ID = "site-header";
  const REDUCE_MOTION_SETTING_ID = "reduce-motion";
  const GENERAL_SETTING_ID = "general";
  const SCREENSHOT_SETTING_ID = "screenshot";
  const SCREENSHOT_TAKE_SETTING_ID = "take-screenshot";
  const SCREENSHOT_BACKGROUND_SETTING_ID = "screenshot-background";
  const SCREENSHOT_BACKGROUND_STORAGE_KEY = "wefranch:screenshot-background";
  const SCREENSHOT_TRANSPARENT_SETTING_ID = "screenshot-transparent";
  const SCREENSHOT_TRANSPARENT_STORAGE_KEY = "wefranch:screenshot-transparent";
  const SCREENSHOT_SCRIPT_ID = "wefranch-prototype-screenshot";
  const RECORDING_SETTING_ID = "recording";
  const RECORDING_TOGGLE_SETTING_ID = "toggle-recording";
  const RECORDING_SCRIPT_ID = "wefranch-prototype-recorder";
  const SHELL_STATE = { wefranchProtoNavShell: true };
  const NAV_SCRIPT_SRC = document.currentScript?.src || "";
  const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  const PROTOTYPES_PREFIX = "/_prototypes";
  const ITEMS = [
    { id: "home", label: "Home", icon: "home.svg", href: "/_prototypes/" },
    { id: "prospects", label: "Prospects", icon: "nav-prospects.svg", href: "/_prototypes/cst/" },
    { id: "territories", label: "Territories", icon: "territories.svg", href: "/_prototypes/territories/" },
    { id: "financial-modeling", label: "Financial Modeling", icon: "financial-modeling.svg", href: "/_prototypes/financial-modeling/" },
  ];
  const HOME_PAGES = [
    { id: "prospects", label: "Prospects", href: "/_prototypes/cst/" },
    { id: "territories", label: "Territories", href: "/_prototypes/territories/" },
    { id: "financial-modeling", label: "Financial Modeling", href: "/_prototypes/financial-modeling/" },
    { id: "targets", label: "Targets", href: "/_prototypes/targets/" },
    { id: "one-pager", label: "One Pager", href: "/_prototypes/one-pager/" },
    { id: "logos", label: "Logo Collection", href: "/logos/" },
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
  transition: width 240ms cubic-bezier(0.22, 1, 0.36, 1), margin-left 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.proto-nav.has-settings { --proto-nav-width-base: 377px; --proto-nav-width: var(--proto-nav-width-base); }
.proto-nav.has-settings.is-showing-size { --proto-nav-width: calc(var(--proto-nav-width-base) + var(--proto-nav-size-width, 0px)); }
.proto-nav.is-live-size,
.proto-nav.is-live-size .proto-nav__bar,
.proto-nav.is-live-size .proto-nav__size { transition: none; }
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
  transition: width 240ms cubic-bezier(0.22, 1, 0.36, 1);
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
  flex: 0 0 var(--proto-nav-cell-width);
  width: var(--proto-nav-cell-width);
  height: var(--proto-nav-cell-height);
  border: 0;
  border-radius: 28px;
  background: transparent;
  color: #111;
  text-decoration: none;
  font: inherit;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}
.proto-nav__icon {
  display: block;
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.42;
  transition: opacity 180ms ease;
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
  background: rgba(255, 255, 255, 0.85);
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
.proto-nav__divider {
  flex: 0 0 auto;
  width: 1px;
  height: 18px;
  margin: 0 10px;
  background: rgba(17, 17, 17, 0.12);
  pointer-events: none;
}
.proto-nav__divider[hidden],
.proto-nav__settings[hidden],
.proto-nav__screenshot[hidden] { display: none; }
.proto-nav__item.proto-nav__settings,
.proto-nav__item.proto-nav__screenshot {
  flex: 0 0 48px;
  width: 48px;
}
.proto-nav__size {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 0;
  min-width: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  white-space: nowrap;
  transition: width 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.proto-nav.is-showing-size .proto-nav__size {
  width: var(--proto-nav-size-width, 0px);
  opacity: 1;
}
.proto-nav__size-label {
  flex: 0 0 auto;
  padding: 0 10px 0 0;
  color: #111;
  font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.proto-nav.is-settings-open .proto-nav__settings .proto-nav__icon { opacity: 1; }
.proto-nav__screenshot .proto-nav__icon,
.proto-nav__screenshot-swap {
  grid-area: 1 / 1;
  transition:
    opacity 400ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.proto-nav__screenshot .proto-nav__icon {
  transform: scale(1);
}
.proto-nav__screenshot.is-busy .proto-nav__icon {
  opacity: 0;
  transform: scale(0.25);
}
.proto-nav__screenshot-swap {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  opacity: 0;
  transform: scale(0.25);
  pointer-events: none;
}
.proto-nav__screenshot.is-busy .proto-nav__screenshot-swap {
  opacity: 1;
  transform: scale(1);
}
.proto-nav__screenshot-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(17, 17, 17, 0.16);
  border-top-color: #111;
  border-radius: 50%;
}
.proto-nav__screenshot.is-busy .proto-nav__screenshot-spinner {
  animation: proto-nav-spin 720ms linear infinite;
}
.proto-nav__item.proto-nav__screenshot:disabled { opacity: 0.45; cursor: default; }
.proto-nav__item.proto-nav__screenshot.is-busy:disabled { opacity: 1; }
.proto-nav__settings-menu {
  position: absolute;
  top: auto;
  right: 6px;
  bottom: calc(100% + 6px);
  left: auto;
  width: max-content;
  min-width: 200px;
  margin: 0;
  padding: 10px 0;
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
  overflow: visible;
  z-index: 2;
  font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 160ms ease, bottom 160ms ease, visibility 0s linear 160ms;
}
.proto-nav.is-settings-open .proto-nav__settings-menu {
  bottom: calc(100% + 16px);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 160ms ease, bottom 160ms ease, visibility 0s;
}
.proto-nav__settings-divider {
  height: 0;
  border-top: 1px solid #ececf0;
  margin: 10px 16px;
}
.proto-nav__settings-switch {
  width: 22px;
  height: 16px;
  border-radius: 999px;
  background: #b8b8b8;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  flex: 0 0 auto;
}
.proto-nav__settings-switch::before {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
  transform: translateX(0);
}
.proto-nav__settings-item[aria-checked="true"] .proto-nav__settings-switch { background: #7a63dd; }
.proto-nav__settings-item[aria-checked="true"] .proto-nav__settings-switch::before { transform: translateX(6px); }
.proto-nav__settings-item-icon {
  width: 18px;
  height: 18px;
  display: block;
  flex: 0 0 auto;
  opacity: 0.8;
}
.proto-nav__settings-item:disabled { opacity: 0.45; cursor: default; }
.proto-nav__settings-item.is-end .proto-nav__menu-label { flex: 1 1 auto; }
.proto-nav__settings-chevron {
  width: 11px;
  height: 6px;
  display: block;
  flex: 0 0 auto;
  opacity: 0.6;
  transform: rotate(-90deg);
}
.proto-nav__settings-radio {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #f4f4f4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.proto-nav__settings-radio::before {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #111;
  opacity: 0;
}
.proto-nav__settings-item[aria-checked="true"] .proto-nav__settings-radio {
  background: #fff;
  box-shadow: inset 0 0 0 1px #e1e1e1;
}
.proto-nav__settings-item[aria-checked="true"] .proto-nav__settings-radio::before { opacity: 1; }
.proto-nav__settings-submenu { position: relative; }
.proto-nav__settings-submenu::before {
  content: "";
  position: absolute;
  top: 0;
  right: 100%;
  bottom: 0;
  width: 8px;
}
.proto-nav__settings-submenu-menu {
  position: absolute;
  right: calc(100% + 4px);
  bottom: -10px;
  width: max-content;
  min-width: 196px;
  margin: 0;
  padding: 10px 0;
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
  display: none;
  z-index: 3;
  overflow: hidden;
}
.proto-nav__settings-submenu.is-open > .proto-nav__settings-submenu-menu,
.proto-nav__settings-submenu:hover > .proto-nav__settings-submenu-menu { display: block; }
.proto-screenshot-toast {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 2147483647;
  transform: translate(-50%, 8px);
  opacity: 0;
  pointer-events: none;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(17, 17, 17, 0.92);
  color: #fff;
  font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  transition: opacity 160ms ease, transform 160ms ease;
}
.proto-screenshot-toast.is-visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
.proto-screenshot-toast.is-error { background: rgba(145, 29, 29, 0.94); }
.proto-recorder {
  --proto-nav-width: 377px;
  --proto-nav-height: 60px;
  --proto-nav-inset: 48px;
  --proto-recorder-gap: 12px;
  position: fixed;
  left: 50%;
  bottom: var(--proto-nav-inset);
  z-index: 2147483001;
  box-sizing: border-box;
  display: none;
  align-items: center;
  height: var(--proto-nav-height);
  margin: 0;
  padding: 0 16px 0 20px;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background-color: rgba(244, 244, 244, 0.8);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 8px 20px rgba(17, 17, 17, 0.03);
  transform: translateX(-50%);
  pointer-events: auto;
  opacity: 1;
  font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition:
    left 240ms cubic-bezier(0.22, 1, 0.36, 1),
    bottom 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    width 320ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease;
}
.proto-recorder.is-visible { display: flex; }
.proto-recorder.is-nav-open {
  left: calc(50% + (var(--proto-nav-width) / 2) + var(--proto-recorder-gap));
  bottom: var(--proto-nav-inset);
  transform: none;
}
.proto-recorder.is-saved { padding: 0 22px; }
.proto-recorder.is-leaving { opacity: 0; pointer-events: none; }
.proto-recorder__live {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
  flex: 0 0 auto;
  opacity: 1;
  transition: opacity 180ms ease;
}
.proto-recorder.is-saved .proto-recorder__live {
  position: absolute;
  left: 20px;
  opacity: 0;
  pointer-events: none;
}
.proto-recorder__saved {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #111;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}
.proto-recorder.is-saved .proto-recorder__saved { opacity: 1; }
.proto-recorder__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e23b3b;
  flex: 0 0 auto;
  animation: proto-recorder-pulse 1.2s ease-in-out infinite;
}
.proto-recorder__time {
  flex: 0 0 auto;
  color: #111;
  font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.proto-recorder__stop {
  width: 34px;
  height: 34px;
  margin-left: -6px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  color: #111;
  cursor: pointer;
  display: grid;
  place-items: center;
  appearance: none;
  -webkit-appearance: none;
}
.proto-recorder__stop::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: currentColor;
}
.proto-recorder__stop:hover { background: rgba(17, 17, 17, 0.06); }
.proto-recorder__stop:focus-visible {
  outline: 2px solid #8065e8;
  outline-offset: 2px;
}
@keyframes proto-recorder-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}
.proto-screenshot-preview {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483646;
  display: block;
  max-height: 150px;
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  border-width: 2px;
  border-style: solid;
  border-color: #fff;
  border-radius: 4px;
  box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.08);
  object-fit: contain;
  pointer-events: none;
  opacity: 0;
  transform: translateX(0);
}
.proto-screenshot-preview.is-visible {
  opacity: 1;
  animation: proto-screenshot-preview-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.proto-screenshot-preview.is-leaving {
  opacity: 1;
  animation: proto-screenshot-preview-slide 300ms cubic-bezier(0.55, 0, 1, 1) both;
}
@keyframes proto-screenshot-preview-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes proto-screenshot-preview-slide {
  from { transform: translateX(0); }
  to { transform: translateX(calc(100% + 32px)); }
}
html.is-proto-nav-shell,
html.is-proto-nav-shell body {
  overflow: hidden !important;
  height: 100% !important;
}
html.is-proto-nav-shell {
  background: #fff;
}
html.is-proto-recording-lock,
html.is-proto-recording-lock body {
  width: var(--proto-record-lock-w) !important;
  height: var(--proto-record-lock-h) !important;
  min-height: var(--proto-record-lock-h) !important;
  overflow: hidden !important;
}
html.is-proto-recording-lock body,
iframe[data-proto-nav-shell].is-recording-locked {
  isolation: isolate;
  transform-style: flat;
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
.proto-nav-page-loading {
  position: fixed;
  inset: 0;
  z-index: 2147482985;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 0;
  padding: 48px 12px;
  background: #fff;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 240ms ease, visibility 240ms ease;
}
.proto-nav-page-loading.is-visible {
  opacity: 1;
  visibility: visible;
}
.proto-nav-page-loading__spinner {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 3px solid #e4e4e4;
  border-top-color: #111;
  border-radius: 50%;
  animation: proto-nav-spin 720ms linear infinite;
}
.proto-nav-page-loading__label {
  margin: 0;
  color: #ababab;
  font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.35;
  text-align: center;
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
  .proto-nav,
  .proto-nav__bar,
  .proto-nav__size { transition: none; }
  .proto-nav.is-open { bottom: var(--proto-nav-inset); }
  .proto-nav__indicator { transition: none; }
  .proto-nav__menu,
  .proto-nav.is-home-open .proto-nav__menu,
  .proto-nav__settings-menu,
  .proto-nav.is-settings-open .proto-nav__settings-menu { transition: none; }
  iframe[data-proto-nav-shell],
  .proto-nav-page-loading,
  .proto-screenshot-preview { transition: none; }
  .proto-nav-page-loading__spinner { animation: none; border-color: #111; }
  .proto-screenshot-preview.is-visible,
  .proto-screenshot-preview.is-leaving { animation: none; }
  .proto-screenshot-preview.is-visible { opacity: 1; }
  .proto-nav__screenshot-spinner { animation: none; }
  .proto-nav__screenshot .proto-nav__icon,
  .proto-nav__screenshot-swap { transition: none; }
  .proto-recorder,
  .proto-recorder__live,
  .proto-recorder__saved { transition: none; }
  .proto-recorder__dot { animation: none; }
}
@keyframes proto-nav-spin {
  to { transform: rotate(360deg); }
}
`;

  const getSiteRoot = () => {
    const scriptSrc = NAV_SCRIPT_SRC
      || document.querySelector('script[src*="proto-nav.js"]')?.src
      || "";

    if (scriptSrc) {
      const scriptPath = new URL(scriptSrc, window.location.href).pathname;
      const scriptsIndex = scriptPath.lastIndexOf("/scripts/");
      if (scriptsIndex !== -1) {
        return scriptPath.slice(0, scriptsIndex);
      }
    }

    const { pathname } = window.location;
    const markerIndex = pathname.indexOf(PROTOTYPES_PREFIX);
    if (markerIndex !== -1) {
      return pathname.slice(0, markerIndex);
    }

    return "";
  };

  const isPublishedLayout = () => {
    if (window.location.pathname.includes(PROTOTYPES_PREFIX)) {
      return false;
    }

    return !LOCAL_HOSTNAMES.has(window.location.hostname);
  };

  const rewritePublicPath = (absolutePath) => {
    if (!isPublishedLayout() || !absolutePath.startsWith(PROTOTYPES_PREFIX)) {
      return absolutePath;
    }

    const rest = absolutePath.slice(PROTOTYPES_PREFIX.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  };

  const resolveUrl = (absolutePath) => `${getSiteRoot()}${rewritePublicPath(absolutePath)}`;

  const normalizePath = (value) => value.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";

  const matchActiveId = (pathname) => {
    if (/\/logos(?:\/|$)/.test(pathname)) return "logos";
    if (/\/one-pager(?:\/|$)/.test(pathname)) return "one-pager";
    if (/\/financial-modeling(?:\/|$)/.test(pathname)) return "financial-modeling";
    if (/\/territories(?:\/|$)/.test(pathname)) return "territories";
    if (/\/targets(?:\/|$)/.test(pathname)) return "targets";
    if (/\/cst(?:\/|$)/.test(pathname)) return "prospects";
    if (
      /\/_prototypes\/?(?:index\.html)?$/.test(pathname) ||
      normalizePath(pathname) === normalizePath(getSiteRoot())
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

  const installMonoFont = () => {
    if (document.getElementById("wefranch-roboto-mono")) {
      return;
    }

    const head = document.head || document.documentElement;
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://fonts.googleapis.com";
      head.appendChild(preconnect);

      const gstatic = document.createElement("link");
      gstatic.rel = "preconnect";
      gstatic.href = "https://fonts.gstatic.com";
      gstatic.crossOrigin = "anonymous";
      head.appendChild(gstatic);
    }

    const font = document.createElement("link");
    font.id = "wefranch-roboto-mono";
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap";
    head.appendChild(font);
  };

  const installStyles = () => {
    installMonoFont();
    if (document.getElementById("proto-nav-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "proto-nav-style";
    style.textContent = STYLES;
    (document.head || document.documentElement).appendChild(style);
  };

  const prefersReducedMotion = () => (
    readReduceMotionEnabled()
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const INDICATOR_MS = 240;
  const SIZE_TRANSITION_MS = 240;

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

  const dismissOverlayMenusFromShell = () => {
    closeHomeMenu();
    closeSettingsMenu();
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

      if (enabled && !shellDismissBound) {
        frameDocument.addEventListener("mousedown", dismissOverlayMenusFromShell);
        shellDismissBound = true;
      } else if (!enabled && shellDismissBound) {
        frameDocument.removeEventListener("mousedown", dismissOverlayMenusFromShell);
        shellDismissBound = false;
      }
    } catch (error) {
      // Ignore cross-origin frame access.
    }
  };

  const syncShellMenuDismiss = () => {
    bindShellMenuDismiss(isHomeMenuOpen() || isSettingsMenuOpen());
  };

  const getSettingsApi = () => {
    try {
      if (shellFrame?.contentWindow) {
        return shellFrame.contentWindow.wefranchPrototypeSettings || null;
      }
    } catch (error) {
      return null;
    }

    return window.wefranchPrototypeSettings || null;
  };

  const isSiteHeaderVisible = () => {
    try {
      return window.localStorage?.getItem(SITE_HEADER_STORAGE_KEY) !== "0";
    } catch (error) {
      return true;
    }
  };

  const writeSiteHeaderVisible = (visible) => {
    try {
      window.localStorage?.setItem(SITE_HEADER_STORAGE_KEY, visible ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const applySiteHeaderVisibleToDocument = (doc, visible) => {
    if (!doc) {
      return;
    }

    doc.documentElement.classList.toggle("is-site-header-hidden", !visible);
    const header = doc.querySelector(".site-header");
    if (!header) {
      return;
    }

    header.toggleAttribute("inert", !visible);
    header.setAttribute("aria-hidden", String(!visible));
  };

  const isScreenshotBackgroundEnabled = () => {
    try {
      return window.localStorage?.getItem(SCREENSHOT_BACKGROUND_STORAGE_KEY) === "1";
    } catch (error) {
      return false;
    }
  };

  const writeScreenshotBackgroundEnabled = (enabled) => {
    try {
      window.localStorage?.setItem(SCREENSHOT_BACKGROUND_STORAGE_KEY, enabled ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const isScreenshotTransparentEnabled = () => {
    try {
      return window.localStorage?.getItem(SCREENSHOT_TRANSPARENT_STORAGE_KEY) === "1";
    } catch (error) {
      return false;
    }
  };

  const writeScreenshotTransparentEnabled = (enabled) => {
    try {
      window.localStorage?.setItem(SCREENSHOT_TRANSPARENT_STORAGE_KEY, enabled ? "1" : "0");
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const applySiteHeaderVisible = (visible) => {
    writeSiteHeaderVisible(visible);
    applySiteHeaderVisibleToDocument(document, visible);

    try {
      const frameWindow = shellFrame?.contentWindow;
      if (frameWindow?.wefranchSiteHeader?.setVisible) {
        frameWindow.wefranchSiteHeader.setVisible(visible);
        return;
      }

      applySiteHeaderVisibleToDocument(shellFrame?.contentDocument, visible);
    } catch (error) {
      // Ignore cross-origin frame access.
    }
  };

  const applyReduceMotion = (enabled) => {
    const next = Boolean(enabled);
    writeReduceMotionEnabled(next);
    applyReduceMotionToDocument(document, next);

    try {
      const frameWindow = shellFrame?.contentWindow;
      if (frameWindow?.wefranchReduceMotion?.setEnabled) {
        frameWindow.wefranchReduceMotion.setEnabled(next);
      } else {
        applyReduceMotionToDocument(shellFrame?.contentDocument, next);
      }

      frameWindow?.dispatchEvent(new CustomEvent("wefranch:reduce-motion-change", {
        detail: { enabled: next },
      }));
    } catch (error) {
      // Ignore cross-origin frame access.
    }

    window.wefranchReduceMotion = {
      isEnabled: readReduceMotionEnabled,
      setEnabled: applyReduceMotion,
    };
    window.dispatchEvent(new CustomEvent("wefranch:reduce-motion-change", {
      detail: { enabled: next },
    }));

    return next;
  };

  const getScreenshotViewportLabel = () => {
    const targetWindow = getScreenshotTargetWindow();
    const width = Math.round(targetWindow.innerWidth || 0);
    const height = Math.round(targetWindow.innerHeight || 0);
    return `${width} x ${height}px`;
  };

  const hideViewportSize = () => {
    window.clearTimeout(sizeHideTimer);
    window.clearTimeout(sizeRevealTimer);
    sizeHideTimer = 0;
    sizeRevealTimer = 0;
    if (!nav) {
      return;
    }

    nav.classList.remove("is-live-size");
    nav.classList.remove("is-showing-size");
    nav.style.removeProperty("--proto-nav-size-width");
    syncRecorderChip();
  };

  const measureSizeWidth = () => {
    if (!sizeWrap) {
      return 0;
    }

    const { style } = sizeWrap;
    const previousWidth = style.width;
    const previousTransition = style.transition;
    const previousOverflow = style.overflow;
    style.transition = "none";
    style.overflow = "visible";
    style.width = "max-content";
    const width = Math.ceil(sizeWrap.getBoundingClientRect().width);
    style.width = previousWidth;
    style.overflow = previousOverflow;
    style.transition = previousTransition;
    return width;
  };

  const showViewportSize = () => {
    if (!isOpen || !nav || !sizeWrap || !sizeLabel) {
      return;
    }

    sizeLabel.textContent = getScreenshotViewportLabel();
    const alreadyShowing = nav.classList.contains("is-showing-size");
    const extra = measureSizeWidth();
    if (extra > 0) {
      nav.style.setProperty("--proto-nav-size-width", `${extra}px`);
    }

    if (!alreadyShowing) {
      nav.getBoundingClientRect();
    }

    nav.classList.add("is-showing-size");

    if (alreadyShowing) {
      if (!sizeRevealTimer) {
        nav.classList.add("is-live-size");
      }
    } else {
      window.clearTimeout(sizeRevealTimer);
      sizeRevealTimer = window.setTimeout(() => {
        sizeRevealTimer = 0;
        if (nav?.classList.contains("is-showing-size")) {
          nav.classList.add("is-live-size");
        }
      }, SIZE_TRANSITION_MS);
    }

    window.clearTimeout(sizeHideTimer);
    sizeHideTimer = window.setTimeout(hideViewportSize, 1200);
    syncRecorderChip();
  };

  const getScreenshotTargetWindow = () => {
    try {
      return shellFrame?.contentWindow || window;
    } catch (error) {
      return window;
    }
  };

  const ensureScreenshotToast = () => {
    let toast = document.querySelector("[data-proto-screenshot-toast]");
    if (toast) {
      return toast;
    }

    toast = document.createElement("div");
    toast.className = "proto-screenshot-toast";
    toast.setAttribute("data-proto-screenshot-toast", "");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.documentElement.appendChild(toast);
    return toast;
  };

  const showScreenshotToast = (message, isError = false, durationMs = 2200) => {
    const toast = ensureScreenshotToast();
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    window.clearTimeout(screenshotToastTimeout);
    screenshotToastTimeout = 0;
    if (durationMs > 0) {
      screenshotToastTimeout = window.setTimeout(() => {
        toast.classList.remove("is-visible");
      }, durationMs);
    }
  };

  const removeScreenshotPreview = () => {
    window.clearTimeout(screenshotPreviewTimeout);
    screenshotPreviewTimeout = 0;
    document.querySelector("[data-proto-screenshot-preview]")?.remove();
  };

  const showScreenshotPreview = (dataUrl) => {
    if (!dataUrl) {
      return;
    }

    removeScreenshotPreview();

    const preview = document.createElement("img");
    preview.className = "proto-screenshot-preview";
    preview.setAttribute("data-proto-screenshot-preview", "");
    preview.alt = "";
    preview.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(preview);

    const startExit = () => {
      if (!preview.isConnected) {
        return;
      }

      if (prefersReducedMotion()) {
        preview.remove();
        return;
      }

      preview.classList.remove("is-visible");
      preview.classList.add("is-leaving");
      preview.addEventListener("animationend", () => preview.remove(), { once: true });
    };

    preview.addEventListener("load", () => {
      preview.getBoundingClientRect();
      preview.classList.add("is-visible");
      screenshotPreviewTimeout = window.setTimeout(
        startExit,
        prefersReducedMotion() ? 1500 : 1740
      );
    }, { once: true });
    preview.addEventListener("error", () => preview.remove(), { once: true });
    preview.src = dataUrl;
  };

  const loadScreenshotModule = () => {
    if (window.wefranchPrototypeScreenshot?.take) {
      return Promise.resolve(window.wefranchPrototypeScreenshot);
    }

    if (screenshotModuleLoader) {
      return screenshotModuleLoader;
    }

    screenshotModuleLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = SCREENSHOT_SCRIPT_ID;
      script.src = resolveUrl("/scripts/prototype-screenshot.js");
      script.async = true;
      script.addEventListener("load", () => {
        if (window.wefranchPrototypeScreenshot?.take) {
          resolve(window.wefranchPrototypeScreenshot);
          return;
        }

        screenshotModuleLoader = null;
        reject(new Error("Screenshot feature did not initialize."));
      }, { once: true });
      script.addEventListener("error", () => {
        screenshotModuleLoader = null;
        script.remove();
        reject(new Error("Failed to load the screenshot feature."));
      }, { once: true });
      document.head.appendChild(script);
    });

    return screenshotModuleLoader;
  };

  const takePrototypeScreenshot = async () => {
    if (screenshotInProgress) {
      return;
    }

    screenshotInProgress = true;
    syncScreenshotControl();

    try {
      const screenshot = await loadScreenshotModule();
      const result = await screenshot.take({
        targetWindow: getScreenshotTargetWindow(),
        background: isScreenshotBackgroundEnabled(),
        transparent: isScreenshotBackgroundEnabled() && isScreenshotTransparentEnabled(),
      });
      showScreenshotPreview(result?.dataUrl);
    } catch (error) {
      console.error("Take screenshot failed:", error);
      showScreenshotToast(
        error?.message?.startsWith("Open the prototype")
          ? error.message
          : "Screenshot failed",
        true
      );
    } finally {
      screenshotInProgress = false;
      syncScreenshotControl();
      if (isSettingsMenuOpen()) {
        renderSettingsItems();
      }
    }
  };

  const formatRecordingTime = (elapsedMs) => {
    const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${minutes}:${pad(seconds)}`;
  };

  const isRecording = () => Boolean(recorderHandle) || recordingStarting;

  const getRecordingMediaWindow = () => {
    try {
      const frameWindow = shellFrame?.contentWindow;
      if (frameWindow?.navigator?.userActivation?.isActive) {
        return frameWindow;
      }
    } catch (error) {
      // Ignore cross-origin frame access.
    }

    return window;
  };

  const getAvailableViewport = () => ({
    width: Math.round(window.visualViewport?.width || window.innerWidth || 0),
    height: Math.round(window.visualViewport?.height || window.innerHeight || 0),
  });

  const fitRecordingSurface = () => {
    if (!recordingSurfaceLock) {
      return;
    }

    const { width, height, element, isShell } = recordingSurfaceLock;
    if (!isShell || !element) {
      return;
    }

    const available = getAvailableViewport();
    const scale = Math.min(available.width / width, available.height / height, 1) || 1;
    const left = Math.max(0, Math.round((available.width - width * scale) / 2));
    element.style.setProperty("width", `${width}px`, "important");
    element.style.setProperty("height", `${height}px`, "important");
    element.style.setProperty("inset", "auto", "important");
    element.style.setProperty("top", "0px", "important");
    element.style.setProperty("left", `${left}px`, "important");
    element.style.setProperty("right", "auto", "important");
    element.style.setProperty("bottom", "auto", "important");
    element.style.setProperty("transform", `scale(${scale})`, "important");
    element.style.setProperty("transform-origin", "top left", "important");
  };

  const lockRecordingSurface = () => {
    if (recordingSurfaceLock) {
      return recordingSurfaceLock;
    }

    const targetWindow = getScreenshotTargetWindow();
    const width = Math.round(targetWindow.innerWidth || 0);
    const height = Math.round(targetWindow.innerHeight || 0);
    const isShell = Boolean(shellFrame);
    const element = shellFrame || document.body || document.documentElement;
    if (width < 2 || height < 2) {
      recordingSurfaceLock = { width, height, element, isShell: false, previous: {} };
      return recordingSurfaceLock;
    }
    const previous = {};

    if (isShell && shellFrame) {
      const { style } = shellFrame;
      previous.width = style.width;
      previous.height = style.height;
      previous.inset = style.inset;
      previous.top = style.top;
      previous.left = style.left;
      previous.right = style.right;
      previous.bottom = style.bottom;
      previous.transform = style.transform;
      previous.transformOrigin = style.transformOrigin;
      shellFrame.classList.add("is-recording-locked");
    } else {
      document.documentElement.style.setProperty("--proto-record-lock-w", `${width}px`);
      document.documentElement.style.setProperty("--proto-record-lock-h", `${height}px`);
      document.documentElement.classList.add("is-proto-recording-lock");
    }

    recordingSurfaceLock = { width, height, element, isShell, previous };
    fitRecordingSurface();
    window.addEventListener("resize", fitRecordingSurface);
    window.visualViewport?.addEventListener("resize", fitRecordingSurface);
    return recordingSurfaceLock;
  };

  const unlockRecordingSurface = () => {
    if (!recordingSurfaceLock) {
      return;
    }

    const { element, isShell, previous } = recordingSurfaceLock;
    window.removeEventListener("resize", fitRecordingSurface);
    window.visualViewport?.removeEventListener("resize", fitRecordingSurface);

    if (isShell && element) {
      const { style } = element;
      ["width", "height", "inset", "top", "left", "right", "bottom", "transform", "transformOrigin"].forEach((name) => {
        const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        style.removeProperty(cssName);
        if (previous[name]) {
          style.setProperty(cssName, previous[name]);
        }
      });
      element.classList.remove("is-recording-locked");
    } else {
      document.documentElement.classList.remove("is-proto-recording-lock");
      document.documentElement.style.removeProperty("--proto-record-lock-w");
      document.documentElement.style.removeProperty("--proto-record-lock-h");
    }

    recordingSurfaceLock = null;
  };

  const ensureRecorderChip = () => {
    if (recorderChip) {
      return recorderChip;
    }

    recorderChip = document.createElement("div");
    recorderChip.className = "proto-recorder";
    recorderChip.setAttribute("data-proto-recorder", "");
    recorderChip.setAttribute("role", "status");
    recorderChip.setAttribute("aria-live", "polite");

    const live = document.createElement("span");
    live.className = "proto-recorder__live";

    const dot = document.createElement("span");
    dot.className = "proto-recorder__dot";
    dot.setAttribute("aria-hidden", "true");

    recorderTimeLabel = document.createElement("span");
    recorderTimeLabel.className = "proto-recorder__time";
    recorderTimeLabel.textContent = "0:00";

    const stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.className = "proto-recorder__stop";
    stopButton.setAttribute("aria-label", "Stop recording");
    stopButton.title = "Stop recording";
    stopButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void stopRecording();
    });

    recorderStopButton = stopButton;
    live.append(dot, recorderTimeLabel, stopButton);

    recorderSavedLabel = document.createElement("span");
    recorderSavedLabel.className = "proto-recorder__saved";
    recorderSavedLabel.textContent = "Recording saved";

    recorderChip.append(live, recorderSavedLabel);
    document.documentElement.appendChild(recorderChip);
    return recorderChip;
  };

  const syncRecorderChip = () => {
    if (!recorderChip) {
      return;
    }

    const navOpen = Boolean(isOpen && nav && !nav.classList.contains("is-leaving"));
    recorderChip.classList.toggle("is-visible", (isRecording() && !recordingStarting) || recordingSaved);
    recorderChip.classList.toggle("is-nav-open", navOpen);
    if (navOpen) {
      const width = Math.round(nav.getBoundingClientRect().width);
      if (width > 0) {
        recorderChip.style.setProperty("--proto-nav-width", `${width}px`);
      }
    }
    if (recorderChip) {
      recorderChip.setAttribute(
        "aria-label",
        recordingSaved ? "Recording saved" : `Recording ${recorderTimeLabel?.textContent || "0:00"}`
      );
    }
  };

  const resetRecorderChipLayout = () => {
    window.clearTimeout(recorderSavedTimeout);
    window.clearTimeout(recorderHideTimeout);
    recorderSavedTimeout = 0;
    recorderHideTimeout = 0;
    recordingSaved = false;
    if (!recorderChip) {
      return;
    }

    recorderChip.classList.remove("is-saved");
    recorderChip.classList.remove("is-leaving");
    recorderChip.style.removeProperty("width");
  };

  const showRecorderChip = () => {
    installStyles();
    ensureRecorderChip();
    resetRecorderChipLayout();
    if (recorderTimeLabel) {
      recorderTimeLabel.textContent = "0:00";
    }
    syncRecorderChip();
  };

  const hideRecorderChip = ({ animate = false } = {}) => {
    if (!recorderChip) {
      return;
    }

    window.clearTimeout(recorderSavedTimeout);
    window.clearTimeout(recorderHideTimeout);
    recorderSavedTimeout = 0;
    recorderHideTimeout = 0;
    recordingSaved = false;

    const finish = () => {
      recorderHideTimeout = 0;
      recorderChip.classList.remove("is-visible");
      recorderChip.classList.remove("is-saved");
      recorderChip.classList.remove("is-leaving");
      recorderChip.style.removeProperty("width");
      recorderChip.removeAttribute("aria-label");
    };

    if (!animate || prefersReducedMotion() || !recorderChip.classList.contains("is-visible")) {
      finish();
      return;
    }

    recorderChip.classList.add("is-leaving");
    recorderHideTimeout = window.setTimeout(finish, 200);
  };

  const showRecorderSaved = () => {
    installStyles();
    ensureRecorderChip();
    window.clearTimeout(recorderSavedTimeout);
    recordingSaved = true;
    recorderChip.classList.remove("is-leaving");
    recorderChip.classList.add("is-visible");
    recorderChip.setAttribute("aria-label", "Recording saved");

    const fromWidth = Math.round(recorderChip.getBoundingClientRect().width);
    recorderChip.style.width = `${fromWidth}px`;
    recorderChip.classList.add("is-saved");
    const savedWidth = Math.ceil(recorderSavedLabel.getBoundingClientRect().width);
    const toWidth = savedWidth + 44;
    recorderChip.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      if (!recordingSaved || !recorderChip) {
        return;
      }

      recorderChip.style.width = `${toWidth}px`;
    });

    syncRecorderChip();
    recorderSavedTimeout = window.setTimeout(() => {
      hideRecorderChip({ animate: true });
    }, 2200);
  };

  const loadRecorderModule = () => {
    if (window.wefranchPrototypeRecorder?.start) {
      return Promise.resolve(window.wefranchPrototypeRecorder);
    }

    if (recorderModuleLoader) {
      return recorderModuleLoader;
    }

    recorderModuleLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = RECORDING_SCRIPT_ID;
      script.src = resolveUrl("/scripts/prototype-recorder.js");
      script.async = true;
      script.addEventListener("load", () => {
        if (window.wefranchPrototypeRecorder?.start) {
          resolve(window.wefranchPrototypeRecorder);
          return;
        }

        recorderModuleLoader = null;
        reject(new Error("Recording feature did not initialize."));
      }, { once: true });
      script.addEventListener("error", () => {
        recorderModuleLoader = null;
        script.remove();
        reject(new Error("Failed to load the recording feature."));
      }, { once: true });
      document.head.appendChild(script);
    });

    return recorderModuleLoader;
  };

  const handleRecordingEnded = (result) => {
    recorderHandle = null;
    recordingStarting = false;
    unlockRecordingSurface();
    if (isSettingsMenuOpen()) {
      renderSettingsItems();
    }

    if (result?.blob?.size) {
      showRecorderSaved();
    } else {
      hideRecorderChip();
    }
  };

  const handleRecordingError = (error) => {
    recorderHandle = null;
    recordingStarting = false;
    unlockRecordingSurface();
    hideRecorderChip();
    if (isSettingsMenuOpen()) {
      renderSettingsItems();
    }

    const message = error?.message || "Recording failed";
    if (message === "Recording cancelled") {
      showScreenshotToast(message);
      return;
    }

    console.error("Recording failed:", error);
    showScreenshotToast(
      message.startsWith("Open the prototype") || message.startsWith("Recording is not")
        ? message
        : "Recording failed",
      true
    );
  };

  const stopRecording = () => {
    if (!recorderHandle) {
      return Promise.resolve();
    }

    const handle = recorderHandle;
    return Promise.resolve(handle.stop()).catch(handleRecordingError);
  };

  const toggleRecording = async () => {
    if (recorderHandle) {
      await stopRecording();
      return;
    }

    if (recordingStarting) {
      return;
    }

    recordingStarting = true;
    if (isSettingsMenuOpen()) {
      renderSettingsItems();
    }

    try {
      const recorder = await loadRecorderModule();
      const surface = lockRecordingSurface();
      recorderHandle = await recorder.start({
        mediaWindow: getRecordingMediaWindow(),
        targetWindow: getScreenshotTargetWindow(),
        captureElement: surface.element,
        onTick: (elapsedMs) => {
          if (recorderTimeLabel) {
            recorderTimeLabel.textContent = formatRecordingTime(elapsedMs);
          }
          syncRecorderChip();
        },
        onStatus: (status) => {
          if (status === "captured") {
            unlockRecordingSurface();
          }
        },
        onEnded: handleRecordingEnded,
      });
      recordingStarting = false;
      showRecorderChip();
      if (isSettingsMenuOpen()) {
        renderSettingsItems();
      }
    } catch (error) {
      handleRecordingError(error);
    }
  };

  window.__wefranchToggleRecording = () => {
    void toggleRecording();
  };

  const getGlobalSettingsItems = () => [
    {
      id: GENERAL_SETTING_ID,
      type: "submenu",
      label: "General",
      items: [
        {
          id: SITE_HEADER_SETTING_ID,
          type: "toggle",
          label: "Site Header",
          checked: isSiteHeaderVisible(),
        },
        {
          id: REDUCE_MOTION_SETTING_ID,
          type: "toggle",
          label: "Reduce motion",
          checked: readReduceMotionEnabled(),
        },
      ],
    },
    { type: "divider" },
    {
      id: SCREENSHOT_SETTING_ID,
      type: "submenu",
      label: "Screenshot",
      items: [
        {
          id: SCREENSHOT_TAKE_SETTING_ID,
          type: "action",
          label: "Take screenshot",
          icon: resolveUrl("/assets/icons/screenshot.svg"),
          disabled: screenshotInProgress,
        },
        { type: "divider" },
        {
          id: SCREENSHOT_BACKGROUND_SETTING_ID,
          type: "toggle",
          label: "Background",
          checked: isScreenshotBackgroundEnabled(),
          align: "end",
        },
        ...(isScreenshotBackgroundEnabled()
          ? [{
              id: SCREENSHOT_TRANSPARENT_SETTING_ID,
              type: "toggle",
              label: "Transparent",
              checked: isScreenshotTransparentEnabled(),
              align: "end",
            }]
          : []),
      ],
    },
    { type: "divider" },
    {
      id: RECORDING_SETTING_ID,
      type: "submenu",
      label: "Recording",
      items: [
        {
          id: RECORDING_TOGGLE_SETTING_ID,
          type: "action",
          label: isRecording() ? "Stop recording" : "Start recording",
          disabled: recordingStarting,
        },
      ],
    },
  ];

  const getSettingsItems = () => {
    const pageItems = getSettingsApi()?.getItems?.() || [];
    if (!pageItems.length) {
      return getGlobalSettingsItems();
    }

    return [...getGlobalSettingsItems(), { type: "divider" }, ...pageItems];
  };

  const performSetting = (id) => {
    if (id === SITE_HEADER_SETTING_ID) {
      const next = !isSiteHeaderVisible();
      applySiteHeaderVisible(next);
      return { checked: next };
    }

    if (id === REDUCE_MOTION_SETTING_ID) {
      const next = !readReduceMotionEnabled();
      applyReduceMotion(next);
      return { checked: next };
    }

    if (id === SCREENSHOT_TAKE_SETTING_ID) {
      void takePrototypeScreenshot();
      return { close: true };
    }

    if (id === SCREENSHOT_BACKGROUND_SETTING_ID) {
      const next = !isScreenshotBackgroundEnabled();
      writeScreenshotBackgroundEnabled(next);
      return { checked: next, refresh: true };
    }

    if (id === SCREENSHOT_TRANSPARENT_SETTING_ID) {
      const next = !isScreenshotTransparentEnabled();
      writeScreenshotTransparentEnabled(next);
      return { checked: next };
    }

    if (id === RECORDING_TOGGLE_SETTING_ID) {
      void toggleRecording();
      return { close: true };
    }

    return getSettingsApi()?.perform?.(id);
  };

  const isSettingsMenuOpen = () => Boolean(nav?.classList.contains("is-settings-open"));

  const createSettingsDivider = () => {
    const divider = document.createElement("div");
    divider.className = "proto-nav__settings-divider";
    divider.setAttribute("aria-hidden", "true");
    return divider;
  };

  const createSettingsLabel = (text) => {
    const label = document.createElement("span");
    label.className = "proto-nav__menu-label";
    label.textContent = text;
    return label;
  };

  const bindSettingsSubmenu = (wrap) => {
    const trigger = wrap.querySelector("[data-settings-type='submenu']");

    wrap.addEventListener("mouseenter", () => {
      window.clearTimeout(settingsSubmenuHideTimer);
      closeSettingsSubmenus(wrap);
      wrap.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
    });

    wrap.addEventListener("mouseleave", () => {
      settingsSubmenuHideTimer = window.setTimeout(() => {
        wrap.classList.remove("is-open");
        trigger?.setAttribute("aria-expanded", "false");
      }, 300);
    });
  };

  const createSettingsItem = (item) => {
    if (item.type === "divider") {
      return createSettingsDivider();
    }

    if (item.type === "submenu") {
      const wrap = document.createElement("div");
      wrap.className = "proto-nav__settings-submenu";
      wrap.dataset.submenuId = item.id;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "proto-nav__menu-item proto-nav__settings-item is-end";
      trigger.dataset.settingsId = item.id;
      trigger.dataset.settingsType = "submenu";
      trigger.setAttribute("role", "menuitem");
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");

      const chevron = document.createElement("img");
      chevron.className = "proto-nav__settings-chevron";
      chevron.src = resolveUrl("/assets/icons/chevron.svg");
      chevron.alt = "";
      chevron.setAttribute("aria-hidden", "true");
      trigger.append(createSettingsLabel(item.label), chevron);

      const nested = document.createElement("div");
      nested.className = "proto-nav__settings-submenu-menu";
      nested.setAttribute("role", "menu");
      nested.setAttribute("aria-label", item.label);
      (item.items || []).forEach((child) => nested.appendChild(createSettingsItem(child)));

      wrap.append(trigger, nested);
      bindSettingsSubmenu(wrap);
      return wrap;
    }

    const option = document.createElement("button");
    option.type = "button";
    option.className = "proto-nav__menu-item proto-nav__settings-item";
    option.dataset.settingsId = item.id;
    if (item.align === "end") {
      option.classList.add("is-end");
    }

    const label = createSettingsLabel(item.label);

    if (item.type === "toggle") {
      option.setAttribute("role", "menuitemcheckbox");
      option.setAttribute("aria-checked", String(Boolean(item.checked)));
      const toggle = document.createElement("span");
      toggle.className = "proto-nav__settings-switch";
      toggle.setAttribute("aria-hidden", "true");
      if (item.align === "end") {
        option.append(label, toggle);
      } else {
        option.append(toggle, label);
      }
      return option;
    }

    if (item.type === "radio") {
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", String(Boolean(item.checked)));
      const radio = document.createElement("span");
      radio.className = "proto-nav__settings-radio";
      radio.setAttribute("aria-hidden", "true");
      option.append(radio, label);
      return option;
    }

    option.setAttribute("role", "menuitem");
    if (item.disabled) {
      option.disabled = true;
    }

    if (item.icon) {
      const icon = document.createElement("img");
      icon.className = "proto-nav__settings-item-icon";
      icon.src = item.icon;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      option.appendChild(icon);
    }

    option.appendChild(label);
    return option;
  };

  const closeSettingsSubmenus = (except = null) => {
    settingsMenu?.querySelectorAll(".proto-nav__settings-submenu").forEach((submenu) => {
      if (submenu === except) {
        return;
      }

      submenu.classList.remove("is-open");
      submenu.querySelector("[data-settings-type='submenu']")?.setAttribute("aria-expanded", "false");
    });
  };

  const renderSettingsItems = ({ restoreSubmenuId = null } = {}) => {
    if (!settingsMenu) {
      return;
    }

    settingsMenu.replaceChildren();
    getSettingsItems().forEach((item) => settingsMenu.appendChild(createSettingsItem(item)));

    if (restoreSubmenuId) {
      const submenu = settingsMenu.querySelector(`[data-submenu-id="${restoreSubmenuId}"]`);
      const trigger = submenu?.querySelector("[data-settings-type='submenu']");
      submenu?.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
    }
  };

  const closeSettingsMenu = () => {
    const wasOpen = isSettingsMenuOpen();
    window.clearTimeout(settingsSubmenuHideTimer);
    closeSettingsSubmenus();
    nav?.classList.remove("is-settings-open");
    settingsButton?.classList.remove("is-active");
    settingsButton?.setAttribute("aria-expanded", "false");

    if (wasOpen) {
      syncShellMenuDismiss();
    }

    return wasOpen;
  };

  const openSettingsMenu = () => {
    const show = () => {
      renderSettingsItems();
      if (!settingsMenu?.childElementCount) {
        return false;
      }

      nav?.classList.add("is-settings-open", "has-settings");
      settingsButton?.classList.add("is-active");
      settingsButton?.setAttribute("aria-expanded", "true");
      syncShellMenuDismiss();
      return true;
    };

    if (show()) {
      return;
    }

    window.setTimeout(show, 120);
  };

  const syncSettingsControl = (host = nav) => {
    host?.classList.add("has-settings");

    if (settingsDivider) {
      settingsDivider.hidden = false;
    }

    if (settingsButton) {
      settingsButton.hidden = false;
    }

    if (screenshotButton) {
      screenshotButton.hidden = false;
    }

    syncScreenshotControl();
  };

  const syncScreenshotControl = () => {
    if (!screenshotButton) {
      return;
    }

    screenshotButton.disabled = screenshotInProgress;
    screenshotButton.classList.toggle("is-busy", screenshotInProgress);
    screenshotButton.setAttribute("aria-busy", String(screenshotInProgress));
    screenshotButton.setAttribute(
      "aria-label",
      screenshotInProgress ? "Taking screenshot" : "Take screenshot"
    );
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
    closeSettingsMenu();
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
    syncSettingsControl();
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
    frame.allow = "geolocation; clipboard-write; fullscreen; display-capture";
    frame.classList.add("is-fading");
    frame.style.opacity = "0";
    return frame;
  };

  const createShellLoader = () => {
    const loader = document.createElement("div");
    loader.className = "proto-nav-page-loading";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.setAttribute("aria-label", "Loading page");
    loader.setAttribute("aria-busy", "false");

    const spinner = document.createElement("div");
    spinner.className = "proto-nav-page-loading__spinner";
    spinner.setAttribute("aria-hidden", "true");

    const label = document.createElement("p");
    label.className = "proto-nav-page-loading__label";
    label.textContent = "Loading...";

    loader.append(spinner, label);
    return loader;
  };

  const setShellLoaderVisible = (visible) => {
    if (!shellLoader) {
      if (!visible) {
        return;
      }

      shellLoader = createShellLoader();
      document.documentElement.appendChild(shellLoader);
    }

    shellLoader.classList.toggle("is-visible", visible);
    shellLoader.setAttribute("aria-busy", visible ? "true" : "false");
  };

  const syncDocumentTitle = () => {
    try {
      const frameTitle = shellFrame?.contentDocument?.title?.trim();
      if (!frameTitle) {
        return;
      }

      document.title = frameTitle;
      shellFrame.title = frameTitle;
    } catch (error) {
      // Ignore cross-origin frame access.
    }
  };

  const whenShellFrameDocumentReady = (frame) => new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearInterval(pollTimer);
      frame.removeEventListener("load", finish);
      resolve();
    };

    const isDocumentReady = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || doc.URL === "about:blank" || doc.URL === "about:srcdoc") {
          return false;
        }

        return doc.readyState === "interactive" || doc.readyState === "complete";
      } catch (error) {
        return false;
      }
    };

    frame.addEventListener("load", finish);
    const pollTimer = window.setInterval(() => {
      if (isDocumentReady()) {
        finish();
      }
    }, 32);
  });

  const loadShellFrame = async (frame, url) => {
    const ready = whenShellFrameDocumentReady(frame);
    frame.src = url;
    await ready;
  };

  const showInShell = async (url, { push = true } = {}) => {
    const nextUrl = new URL(url, window.location.href).href;

    if (isNavigating) {
      pendingUrl = { url: nextUrl, push };
      return;
    }

    isNavigating = true;

    try {
      setShellLoaderVisible(true);

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
        shellDismissBound = false;
        syncShellMenuDismiss();
      }

      applySiteHeaderVisible(isSiteHeaderVisible());
      applyReduceMotion(readReduceMotionEnabled());
      syncDocumentTitle();

      if (push && window.location.href !== nextUrl) {
        history.pushState(SHELL_STATE, "", nextUrl);
      }

      await fadeTo(shellFrame, false);
    } finally {
      if (!pendingUrl) {
        setShellLoaderVisible(false);
      }

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
    icon.src = resolveUrl(`/assets/icons/${item.icon}`);
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

    const checkSrc = resolveUrl("/assets/icons/check.svg");

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
    syncSettingsControl();
    showInShell(href);
  };

  const renderNav = () => {
    const pageId = matchActiveId(window.location.pathname);
    const activeId = getBarActiveId(pageId);
    const activeIndex = ITEMS.findIndex((item) => item.id === activeId);
    const nextNav = document.createElement("nav");
    nextNav.className = isOpen ? "proto-nav is-open has-settings" : "proto-nav has-settings";
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
          syncShellMenuDismiss();
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

    settingsDivider = document.createElement("span");
    settingsDivider.className = "proto-nav__divider";
    settingsDivider.setAttribute("aria-hidden", "true");
    bar.appendChild(settingsDivider);

    settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "proto-nav__item proto-nav__settings";
    settingsButton.setAttribute("aria-label", "Settings");
    settingsButton.setAttribute("aria-haspopup", "menu");
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.setAttribute("aria-controls", "proto-nav-settings-menu");
    settingsButton.title = "Settings";
    settingsButton.dataset.protoSettings = "";
    settingsButton.appendChild(createNavIcon({ icon: "settings.svg" }));
    settingsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isSettingsMenuOpen()) {
        closeSettingsMenu();
        return;
      }

      closeHomeMenu();
      openSettingsMenu();
    });
    bar.appendChild(settingsButton);

    screenshotButton = document.createElement("button");
    screenshotButton.type = "button";
    screenshotButton.className = "proto-nav__item proto-nav__screenshot";
    screenshotButton.setAttribute("aria-label", "Take screenshot");
    screenshotButton.dataset.protoScreenshot = "";
    screenshotButton.appendChild(createNavIcon({ icon: "screenshot.svg" }));
    const screenshotSwap = document.createElement("span");
    screenshotSwap.className = "proto-nav__screenshot-swap";
    screenshotSwap.setAttribute("aria-hidden", "true");
    const screenshotSpinner = document.createElement("span");
    screenshotSpinner.className = "proto-nav__screenshot-spinner";
    screenshotSwap.appendChild(screenshotSpinner);
    screenshotButton.appendChild(screenshotSwap);
    screenshotButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeHomeMenu();
      closeSettingsMenu();
      void takePrototypeScreenshot();
    });
    bar.appendChild(screenshotButton);
    syncScreenshotControl();

    sizeWrap = document.createElement("div");
    sizeWrap.className = "proto-nav__size";
    sizeWrap.setAttribute("aria-hidden", "true");

    const sizeDivider = document.createElement("span");
    sizeDivider.className = "proto-nav__divider";
    sizeDivider.setAttribute("aria-hidden", "true");

    sizeLabel = document.createElement("span");
    sizeLabel.className = "proto-nav__size-label";
    sizeLabel.textContent = getScreenshotViewportLabel();

    sizeWrap.append(sizeDivider, sizeLabel);
    bar.appendChild(sizeWrap);

    settingsMenu = document.createElement("div");
    settingsMenu.id = "proto-nav-settings-menu";
    settingsMenu.className = "ui-menu proto-nav__settings-menu";
    settingsMenu.setAttribute("role", "menu");
    settingsMenu.setAttribute("aria-label", "Prototype settings");

    moveIndicator(activeIndex, { animate: false });
    nextNav.append(bar, homeMenu, settingsMenu);
    syncSettingsControl(nextNav);

    nextNav.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      const setting = event.target.closest("[data-settings-id]");
      if (setting) {
        event.preventDefault();

        if (setting.dataset.settingsType === "submenu") {
          const submenu = setting.closest(".proto-nav__settings-submenu");
          const shouldOpen = !submenu?.classList.contains("is-open");
          closeSettingsSubmenus(shouldOpen ? submenu : null);
          submenu?.classList.toggle("is-open", shouldOpen);
          setting.setAttribute("aria-expanded", String(shouldOpen));
          return;
        }

        const openSubmenuId = setting.closest(".proto-nav__settings-submenu")?.dataset.submenuId || null;
        const result = performSetting(setting.dataset.settingsId);

        if (result?.refresh) {
          window.clearTimeout(settingsSubmenuHideTimer);
          renderSettingsItems({ restoreSubmenuId: openSubmenuId });
          return;
        }

        if (setting.getAttribute("role") === "menuitemcheckbox") {
          setting.setAttribute("aria-checked", String(Boolean(result?.checked)));
          return;
        }

        if (result?.close !== false) {
          closeSettingsMenu();
        }
        return;
      }

      const option = event.target.closest("[data-nav-page]");
      if (option) {
        event.preventDefault();

        if (option.dataset.navPage === matchActiveId(window.location.pathname)) {
          closeHomeMenu();
          closeSettingsMenu();
          return;
        }

        closeHomeMenu({ restore: false });
        closeSettingsMenu();
        activatePage(option.dataset.navPage, option.href);
        return;
      }

      const link = event.target.closest(".proto-nav__item");
      if (!link) {
        return;
      }

      if (
        link.closest(".proto-nav__home")
        || link.hasAttribute("data-proto-settings")
        || link.hasAttribute("data-proto-screenshot")
      ) {
        return;
      }

      if (link.getAttribute("aria-current") === "page") {
        event.preventDefault();
        closeHomeMenu();
        closeSettingsMenu();
        return;
      }

      event.preventDefault();
      closeHomeMenu({ restore: false });
      closeSettingsMenu();
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
  let settingsDivider = null;
  let settingsButton = null;
  let screenshotButton = null;
  let sizeWrap = null;
  let sizeLabel = null;
  let sizeHideTimer = 0;
  let sizeRevealTimer = 0;
  let viewportResizeRaf = 0;
  let settingsMenu = null;
  let settingsSubmenuHideTimer = 0;
  let screenshotModuleLoader = null;
  let screenshotInProgress = false;
  let screenshotToastTimeout = 0;
  let screenshotPreviewTimeout = 0;
  let recorderChip = null;
  let recorderTimeLabel = null;
  let recorderStopButton = null;
  let recorderSavedLabel = null;
  let recorderModuleLoader = null;
  let recorderHandle = null;
  let recordingStarting = false;
  let recordingSaved = false;
  let recorderSavedTimeout = 0;
  let recorderHideTimeout = 0;
  let recordingSurfaceLock = null;
  let shellFrame = null;
  let shellLoader = null;
  let shellDismissBound = false;
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
      closeSettingsMenu();
      hideViewportSize();
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

    syncRecorderChip();
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

    if (isScreenshotShortcut(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      mountNav();
      void takePrototypeScreenshot();
      return;
    }

    if (isRecordShortcut(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void toggleRecording();
      return;
    }

    if (event.key === "Escape" && isSettingsMenuOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSettingsMenu();
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

    if (isScreenshotShortcut(event.data)) {
      mountNav();
      void takePrototypeScreenshot();
      return;
    }

    if (isRecordShortcut(event.data)) {
      void toggleRecording();
      return;
    }

    if (event.data.key === "Escape" && isSettingsMenuOpen()) {
      closeSettingsMenu();
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

  const handleViewportResize = () => {
    if (viewportResizeRaf) {
      return;
    }

    viewportResizeRaf = window.requestAnimationFrame(() => {
      viewportResizeRaf = 0;
      if (isOpen) {
        showViewportSize();
      }
    });
  };

  window.addEventListener("resize", handleViewportResize);
  window.visualViewport?.addEventListener("resize", handleViewportResize);

  document.addEventListener("mousedown", (event) => {
    const inHome = homeDropdown?.contains(event.target) || homeMenu?.contains(event.target);
    const inSettings = settingsButton?.contains(event.target) || settingsMenu?.contains(event.target);

    if (isHomeMenuOpen() && !inHome) {
      closeHomeMenu();
    }

    if (isSettingsMenuOpen() && !inSettings) {
      closeSettingsMenu();
    }
  });

  window.addEventListener("wefranch:prototype-settings-ready", () => {
    if (isSettingsMenuOpen()) {
      renderSettingsItems();
    }
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
