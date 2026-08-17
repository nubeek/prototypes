(function () {
  const ANALYSIS_SIZE = 64;
  const EDGE_BAND_PX = 3;
  const LIGHT_CHANNEL_MIN = 214;
  const MAX_CHANNEL_DELTA = 22;
  const LIGHT_RATIO = 0.52;
  const TRANSPARENT_ALPHA = 24;
  const LIGHT_CLASS = "has-light-edge";
  const DARK_CLASS = "has-dark-edge";
  const STYLE_ID = "thumbnail-edge-border-style";

  const CONTAINER_SELECTOR = [
    ".ui-tile",
    ".franchise-logo",
    ".target-franchise-logo",
    ".owner-detail-logo",
    ".owner-profile-logo",
    ".logo",
    ".cst-splash__search-suggestion-icon.has-logo",
    ".territory-crossroad__search-suggestion-icon.has-logo"
  ].join(", ");

  const IMAGE_SELECTOR = [
    ".ui-tile img",
    ".franchise-logo img",
    ".target-franchise-logo img",
    ".owner-detail-logo img",
    ".owner-profile-logo img",
    ".logo img",
    ".cst-splash__search-suggestion-icon.has-logo img",
    ".territory-crossroad__search-suggestion-icon.has-logo img",
    "img.territory-brand-item__logo",
    "img.territory-info-card__logo",
    "img.territory-area-card__logo",
    "img.territory-map-tooltip-logo",
    "img.request-info-territory-logo",
    "img[data-thumbnail-edge]"
  ].join(", ");

  const FALLBACK_SELECTOR = [
    ".owner-logo-fallback",
    ".franchise-logo-fallback",
    ".owner-detail-franchise-logo-fallback",
    ".owner-profile-logo-fallback",
    ".target-franchise-logo-fallback",
    ".territory-crossroad__search-suggestion-logo-fallback",
    ".cst-splash__search-suggestion-logo-fallback"
  ].join(", ");

  const decisionCache = new Map();
  const pendingImages = new WeakSet();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let observer = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .has-dark-edge {
        border-color: transparent !important;
      }

      .has-light-edge {
        border-color: var(--color-border, #e7e7e7);
      }

      .target-franchise-logo.has-light-edge,
      .cst-splash__search-suggestion-icon.has-logo.has-light-edge,
      .territory-crossroad__search-suggestion-icon.has-logo.has-light-edge {
        border: 1px solid var(--color-border, #e7e7e7);
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function isThumbnailImage(image) {
    return image instanceof HTMLImageElement && Boolean(
      image.matches(IMAGE_SELECTOR) || image.closest(CONTAINER_SELECTOR)
    );
  }

  function getThumbnailTarget(image) {
    if (image.matches("img.territory-brand-item__logo, img.territory-info-card__logo, img.territory-area-card__logo, img.territory-map-tooltip-logo, img.request-info-territory-logo, img[data-thumbnail-edge]")) {
      return image;
    }

    return image.closest(CONTAINER_SELECTOR) || image;
  }

  function isImageUsable(image) {
    return Boolean(
      image
      && image.complete
      && image.naturalWidth > 0
      && image.naturalHeight > 0
      && getComputedStyle(image).display !== "none"
    );
  }

  function parseCssColor(value) {
    if (!value || value === "transparent") {
      return { r: 255, g: 255, b: 255, a: 0 };
    }

    const match = value.match(/rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
    if (!match) return null;

    const alpha = match[4] === undefined
      ? 255
      : match[4].endsWith("%")
        ? (parseFloat(match[4]) / 100) * 255
        : parseFloat(match[4]) * 255;

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: alpha
    };
  }

  function isLightNeutral(red, green, blue, alpha) {
    if (alpha < TRANSPARENT_ALPHA) return true;
    if (red < LIGHT_CHANNEL_MIN || green < LIGHT_CHANNEL_MIN || blue < LIGHT_CHANNEL_MIN) {
      return false;
    }

    return (Math.max(red, green, blue) - Math.min(red, green, blue)) <= MAX_CHANNEL_DELTA;
  }

  function isInsideRoundedRect(x, y, width, height, radius) {
    const cornerRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if (x >= cornerRadius && x < width - cornerRadius) return true;
    if (y >= cornerRadius && y < height - cornerRadius) return true;

    const centerX = x < cornerRadius ? cornerRadius : width - cornerRadius;
    const centerY = y < cornerRadius ? cornerRadius : height - cornerRadius;
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    return (deltaX * deltaX) + (deltaY * deltaY) <= cornerRadius * cornerRadius;
  }

  function drawFittedImage(image, objectFit) {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const imageRatio = sourceWidth / sourceHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceDrawWidth = sourceWidth;
    let sourceDrawHeight = sourceHeight;
    let destX = 0;
    let destY = 0;
    let destWidth = ANALYSIS_SIZE;
    let destHeight = ANALYSIS_SIZE;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);

    if (objectFit === "cover") {
      if (imageRatio > 1) {
        sourceDrawWidth = sourceHeight;
        sourceX = (sourceWidth - sourceDrawWidth) / 2;
      } else if (imageRatio < 1) {
        sourceDrawHeight = sourceWidth;
        sourceY = (sourceHeight - sourceDrawHeight) / 2;
      }
    } else if (imageRatio > 1) {
      destHeight = ANALYSIS_SIZE / imageRatio;
      destY = (ANALYSIS_SIZE - destHeight) / 2;
    } else if (imageRatio < 1) {
      destWidth = ANALYSIS_SIZE * imageRatio;
      destX = (ANALYSIS_SIZE - destWidth) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceDrawWidth,
      sourceDrawHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );
  }

  function analyzeImageEdge(image, target) {
    if (!context) return null;

    const styles = getComputedStyle(target);
    const imageStyles = getComputedStyle(image);
    const displaySize = Math.max(
      Math.min(target.clientWidth || 0, target.clientHeight || 0),
      1
    );
    const radius = parseFloat(styles.borderTopLeftRadius) || 0;
    const analysisRadius = radius * (ANALYSIS_SIZE / displaySize);
    const innerSize = ANALYSIS_SIZE - EDGE_BAND_PX * 2;
    const innerRadius = Math.max(0, analysisRadius - EDGE_BAND_PX);

    canvas.width = ANALYSIS_SIZE;
    canvas.height = ANALYSIS_SIZE;

    try {
      drawFittedImage(image, imageStyles.objectFit || "contain");
      const pixels = context.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;
      let edgeCount = 0;
      let lightCount = 0;

      for (let y = 0; y < ANALYSIS_SIZE; y += 1) {
        for (let x = 0; x < ANALYSIS_SIZE; x += 1) {
          if (!isInsideRoundedRect(x, y, ANALYSIS_SIZE, ANALYSIS_SIZE, analysisRadius)) {
            continue;
          }

          if (isInsideRoundedRect(
            x - EDGE_BAND_PX,
            y - EDGE_BAND_PX,
            innerSize,
            innerSize,
            innerRadius
          )) {
            continue;
          }

          const index = (y * ANALYSIS_SIZE + x) * 4;
          edgeCount += 1;
          if (isLightNeutral(pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3])) {
            lightCount += 1;
          }
        }
      }

      if (!edgeCount) return null;
      return (lightCount / edgeCount) >= LIGHT_RATIO;
    } catch (error) {
      return null;
    }
  }

  function setEdgeClass(target, needsBorder) {
    target.classList.toggle(LIGHT_CLASS, needsBorder);
    target.classList.toggle(DARK_CLASS, !needsBorder);
    target.dataset.thumbnailEdge = needsBorder ? "light" : "dark";
  }

  function applyFallback(target) {
    const probe = target.querySelector(FALLBACK_SELECTOR) || target;
    const styles = getComputedStyle(probe);

    if (styles.backgroundImage && styles.backgroundImage !== "none") {
      setEdgeClass(target, false);
      return;
    }

    const color = parseCssColor(styles.backgroundColor);
    setEdgeClass(target, color ? isLightNeutral(color.r, color.g, color.b, color.a) : true);
  }

  function applyDecision(target, image) {
    const cacheKey = image.currentSrc || image.src;
    if (cacheKey && decisionCache.has(cacheKey)) {
      setEdgeClass(target, decisionCache.get(cacheKey));
      return;
    }

    const needsBorder = analyzeImageEdge(image, target);
    if (needsBorder === null) {
      applyFallback(target);
      return;
    }

    if (cacheKey) {
      decisionCache.set(cacheKey, needsBorder);
    }

    setEdgeClass(target, needsBorder);
  }

  function applyToImage(image) {
    if (!isThumbnailImage(image)) return;

    const target = getThumbnailTarget(image);
    if (!target) return;

    if (isImageUsable(image)) {
      applyDecision(target, image);
      return;
    }

    if (image.complete) {
      applyFallback(target);
      return;
    }

    if (pendingImages.has(image)) return;

    pendingImages.add(image);
    image.addEventListener("load", () => {
      pendingImages.delete(image);
      applyDecision(target, image);
    }, { once: true });
    image.addEventListener("error", () => {
      pendingImages.delete(image);
      applyFallback(target);
    }, { once: true });
  }

  function apply(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll(IMAGE_SELECTOR).forEach(applyToImage);
  }

  function observeMutations() {
    if (observer || typeof MutationObserver !== "function") return;

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
          applyToImage(mutation.target);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLImageElement) {
            applyToImage(node);
          }
          node.querySelectorAll?.(IMAGE_SELECTOR).forEach(applyToImage);
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
  }

  function start() {
    ensureStyles();
    observeMutations();
    apply();
  }

  window.ThumbnailEdgeBorder = {
    needsBorder(image, target) {
      if (!(image instanceof HTMLImageElement)) return null;
      return analyzeImageEdge(image, target || getThumbnailTarget(image));
    },
    apply,
    applyToImage
  };

  ensureStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
