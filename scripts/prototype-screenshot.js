(() => {
  if (window.wefranchPrototypeScreenshot) {
    return;
  }

  const RENDERER_SRC = "https://unpkg.com/modern-screenshot@4.7.0/dist/index.js";
  const RENDERER_SCRIPT_ID = "wefranch-modern-screenshot";
  const CAPTURE_STYLE_ID = "wefranch-screenshot-capture-style";
  const BACKGROUND_COLOR = "#f6f6f7";
  const BACKGROUND_MARGIN = 100;
  const BACKGROUND_RADIUS = 16;
  const BACKGROUND_SHADOW = {
    offsetX: 0,
    offsetY: 10,
    blur: 42,
    color: "rgba(0, 0, 0, 0.06)",
  };
  let rendererLoader = null;

  const nextPaint = (targetWindow) => new Promise((resolve) => {
    targetWindow.requestAnimationFrame(() => targetWindow.requestAnimationFrame(resolve));
  });

  const withTimeout = (promise, timeoutMs) => Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);

  const loadRenderer = () => {
    if (window.modernScreenshot?.domToPng) {
      return Promise.resolve(window.modernScreenshot);
    }

    if (rendererLoader) {
      return rendererLoader;
    }

    rendererLoader = new Promise((resolve, reject) => {
      const existing = document.getElementById(RENDERER_SCRIPT_ID);
      const script = existing || document.createElement("script");

      const handleLoad = () => {
        if (window.modernScreenshot?.domToPng) {
          resolve(window.modernScreenshot);
          return;
        }

        rendererLoader = null;
        reject(new Error("Screenshot renderer did not initialize."));
      };

      const handleError = () => {
        rendererLoader = null;
        reject(new Error("Failed to load the screenshot renderer."));
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existing) {
        script.id = RENDERER_SCRIPT_ID;
        script.src = RENDERER_SRC;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }
    });

    return rendererLoader;
  };

  const waitForAssets = async (targetWindow) => {
    const { document: targetDocument } = targetWindow;
    const pending = [];

    if (targetDocument.fonts?.ready) {
      pending.push(targetDocument.fonts.ready.catch(() => undefined));
    }

    targetDocument.querySelectorAll("img").forEach((image) => {
      if (!image.complete && typeof image.decode === "function") {
        pending.push(image.decode().catch(() => undefined));
      }
    });

    await withTimeout(Promise.allSettled(pending), 4000);
  };

  const pauseAnimations = (targetDocument) => {
    const paused = [];

    targetDocument.getAnimations?.().forEach((animation) => {
      if (animation.playState !== "running") {
        return;
      }

      const target = animation.effect?.target;
      if (target?.closest?.("[data-proto-nav], [data-proto-screenshot-toast], [data-proto-screenshot-preview], [data-proto-recorder]")) {
        return;
      }

      animation.pause();
      paused.push(animation);
    });

    return () => {
      paused.forEach((animation) => {
        try {
          animation.play();
        } catch (error) {
          // The animated element may have been removed while the image rendered.
        }
      });
    };
  };

  const normalizeEmptyPlaceholders = (targetWindow) => {
    const controls = [];

    targetWindow.document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((control) => {
      if (control.value || !control.placeholder.trim()) {
        return;
      }

      const placeholderStyle = targetWindow.getComputedStyle(control, "::placeholder");
      const selection = {
        start: control.selectionStart,
        end: control.selectionEnd,
        direction: control.selectionDirection,
      };

      controls.push({
        control,
        color: control.style.getPropertyValue("color"),
        colorPriority: control.style.getPropertyPriority("color"),
        selection,
      });

      control.value = control.placeholder;
      control.style.setProperty("color", placeholderStyle.color, "important");
    });

    return () => {
      controls.forEach(({ control, color, colorPriority, selection }) => {
        control.value = "";

        if (color) {
          control.style.setProperty("color", color, colorPriority);
        } else {
          control.style.removeProperty("color");
        }

        if (selection.start !== null && selection.end !== null) {
          try {
            control.setSelectionRange(selection.start, selection.end, selection.direction || "none");
          } catch (error) {
            // Selection ranges are unavailable for some input types.
          }
        }
      });
    };
  };

  const installCaptureStyles = (targetDocument) => {
    const style = targetDocument.createElement("style");
    style.id = CAPTURE_STYLE_ID;
    style.textContent = [
      "* { scrollbar-width: none !important; }",
      "*::-webkit-scrollbar { display: none !important; }",
      "* { caret-color: transparent !important; }",
    ].join("\n");
    (targetDocument.head || targetDocument.documentElement).appendChild(style);
    return () => style.remove();
  };

  const CSS_MASK_URL_PATTERN = /url\(\s*(['"]?)(.*?)\1\s*\)/i;
  const CSS_MASK_ATTR = {
    "": "data-proto-ss-mask",
    "::before": "data-proto-ss-mask-before",
    "::after": "data-proto-ss-mask-after",
  };

  const parseCssMaskUrl = (value) => {
    const match = String(value || "").match(CSS_MASK_URL_PATTERN);
    const url = match?.[2]?.trim();
    return url || null;
  };

  const decodeSvgDataUri = (url) => {
    const comma = url.indexOf(",");
    if (comma === -1) return "";
    const data = url.slice(comma + 1);
    return /;base64/i.test(url.slice(0, comma))
      ? window.atob(data)
      : decodeURIComponent(data);
  };

  const colorizeSvgMarkup = (markup, color) => {
    let svg = String(markup || "").replace(/<\?xml[\s\S]*?\?>/i, "").trim();
    if (!svg) return "";

    svg = svg.replace(/fill:\s*(?!none\b)(?!transparent\b)[^;}]+/gi, `fill: ${color}`);
    svg = svg.replace(/\bfill=(['"])(?!none\b)(?!transparent\b)[^'"]*\1/gi, `fill="${color}"`);
    svg = svg.replace(/currentColor/g, color);

    if (!/\bfill=/i.test(svg) && !/fill\s*:/i.test(svg)) {
      svg = svg.replace(/<svg\b([^>]*)>/i, `<svg$1 fill="${color}">`);
    }

    if (!/\sxmlns=/i.test(svg)) {
      svg = svg.replace(/<svg\b/i, `<svg xmlns="http://www.w3.org/2000/svg"`);
    }

    return svg;
  };

  const svgToDataUri = (markup) => {
    const base64 = window.btoa(unescape(encodeURIComponent(markup)));
    return `data:image/svg+xml;base64,${base64}`;
  };

  const rasterizeMaskImage = (source, color) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = Math.max(1, image.naturalWidth || image.width || 64);
      const height = Math.max(1, image.naturalHeight || image.height || 64);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to rasterize a CSS mask."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Unable to load a CSS mask image."));
    image.src = source;
  });

  const colorizeMaskSource = async (url, color, cache) => {
    const cacheKey = `${url}\n${color}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const pending = (async () => {
      if (url.startsWith("data:image/svg+xml")) {
        const colored = colorizeSvgMarkup(decodeSvgDataUri(url), color);
        return colored ? svgToDataUri(colored) : rasterizeMaskImage(url, color);
      }

      if (url.startsWith("data:")) {
        return rasterizeMaskImage(url, color);
      }

      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        throw new Error(`Unable to fetch CSS mask (${response.status}).`);
      }

      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();
      const isSvg = contentType.includes("svg")
        || /\.svg(?:\?|#|$)/i.test(url)
        || /^\s*<svg/i.test(body);

      if (isSvg) {
        const colored = colorizeSvgMarkup(body, color);
        if (colored) return svgToDataUri(colored);
      }

      return rasterizeMaskImage(url, color);
    })().catch(() => null);

    cache.set(cacheKey, pending);
    return pending;
  };

  const materializeCssMasks = async (targetWindow) => {
    const { document: targetDocument } = targetWindow;
    const assigned = [];
    const inserted = [];
    const rules = [];
    const cache = new Map();
    let nextId = 0;

    const isIgnored = (element) => element.closest(
      "[data-proto-nav], [data-proto-screenshot-toast], [data-proto-screenshot-preview], [data-proto-recorder]"
    );

    const process = async (element, pseudo = null) => {
      try {
        const style = pseudo
          ? targetWindow.getComputedStyle(element, pseudo)
          : targetWindow.getComputedStyle(element);

        if (pseudo) {
          const content = style.content;
          if (!content || content === "none") return;
        }

        const maskImage = style.webkitMaskImage || style.maskImage;
        if (!maskImage || maskImage === "none" || !/url\(/i.test(maskImage)) return;

        const rawUrl = parseCssMaskUrl(maskImage);
        if (!rawUrl) return;

        const color = style.backgroundColor;
        if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return;

        const absoluteUrl = rawUrl.startsWith("data:")
          ? rawUrl
          : new URL(rawUrl, targetDocument.baseURI).href;
        const dataUri = await colorizeMaskSource(absoluteUrl, color, cache);
        if (!dataUri) return;

        const attr = CSS_MASK_ATTR[pseudo || ""];
        const id = String(++nextId);
        assigned.push({ element, attr, previous: element.getAttribute(attr) });
        element.setAttribute(attr, id);

        const image = targetDocument.createElement("img");
        image.src = dataUri;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.setAttribute("data-proto-ss-mask-img", id);
        const width = Number.parseFloat(style.width) || 16;
        const height = Number.parseFloat(style.height) || 16;
        image.width = Math.max(1, Math.round(width));
        image.height = Math.max(1, Math.round(height));
        image.style.cssText = [
          "display:block",
          "flex:0 0 auto",
          "border:0",
          "pointer-events:none",
          `width:${width}px`,
          `height:${height}px`,
          style.transform && style.transform !== "none" ? `transform:${style.transform}` : ""
        ].filter(Boolean).join(";");

        if (pseudo === "::before") {
          element.insertBefore(image, element.firstChild);
        } else {
          element.append(image);
        }
        inserted.push(image);

        if (pseudo) {
          rules.push(
            `[${attr}="${id}"]${pseudo}{content:none!important;display:none!important;}`
          );
        } else {
          rules.push(
            `[${attr}="${id}"]{-webkit-mask:none!important;mask:none!important;` +
            `-webkit-mask-image:none!important;mask-image:none!important;}`
          );
        }
      } catch (error) {
        // Leave this mask as-is rather than failing the whole capture.
      }
    };

    for (const element of targetDocument.querySelectorAll("body *")) {
      if (isIgnored(element)) continue;

      const style = targetWindow.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;

      await process(element);
      await process(element, "::before");
      await process(element, "::after");
    }

    if (!inserted.length && !rules.length) {
      return () => undefined;
    }

    const style = targetDocument.createElement("style");
    style.setAttribute("data-proto-ss-mask-style", "");
    style.textContent = rules.join("\n");
    (targetDocument.head || targetDocument.documentElement).appendChild(style);

    await Promise.all(inserted.map((image) => (
      typeof image.decode === "function"
        ? image.decode().catch(() => undefined)
        : Promise.resolve()
    )));

    return () => {
      style.remove();
      inserted.forEach((image) => image.remove());
      assigned.reverse().forEach(({ element, attr, previous }) => {
        if (previous === null) {
          element.removeAttribute(attr);
        } else {
          element.setAttribute(attr, previous);
        }
      });
    };
  };

  const normalizeAssetUrls = (targetDocument) => {
    const attributes = [];

    const setAbsoluteAttribute = (element, name, value) => {
      attributes.push({
        element,
        name,
        value: element.getAttribute(name),
      });
      element.setAttribute(name, value);
    };

    targetDocument.querySelectorAll("img[src], input[type='image'][src]").forEach((image) => {
      const absoluteSrc = image.currentSrc || image.src;
      if (absoluteSrc) {
        setAbsoluteAttribute(image, "src", absoluteSrc);
      }

      if (image.hasAttribute("srcset")) {
        attributes.push({
          element: image,
          name: "srcset",
          value: image.getAttribute("srcset"),
        });
        image.removeAttribute("srcset");
      }
    });

    targetDocument.querySelectorAll("video[poster], source[src]").forEach((media) => {
      const name = media.matches("video") ? "poster" : "src";
      const absoluteUrl = media[name];
      if (absoluteUrl) {
        setAbsoluteAttribute(media, name, absoluteUrl);
      }
    });

    targetDocument.querySelectorAll("svg image[href]").forEach((image) => {
      const href = image.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("data:")) {
        return;
      }

      setAbsoluteAttribute(image, "href", new URL(href, targetDocument.baseURI).href);
    });

    return () => {
      attributes.reverse().forEach(({ element, name, value }) => {
        if (value === null) {
          element.removeAttribute(name);
        } else {
          element.setAttribute(name, value);
        }
      });
    };
  };

  const copyComputedStyle = (source, target, targetWindow) => {
    const computed = targetWindow.getComputedStyle(source);

    for (let index = 0; index < computed.length; index += 1) {
      const property = computed[index];
      target.style.setProperty(property, computed.getPropertyValue(property));
    }
  };

  const isVisibleFrame = (frame, targetWindow) => {
    const rect = frame.getBoundingClientRect();
    const style = targetWindow.getComputedStyle(frame);
    return rect.width > 0
      && rect.height > 0
      && style.display !== "none"
      && style.visibility !== "hidden";
  };

  const preparePinnedElements = (targetWindow) => {
    const records = [];
    const pinned = [];

    if (!targetWindow.scrollX && !targetWindow.scrollY) {
      return {
        apply: () => undefined,
        restore: () => undefined,
      };
    }

    targetWindow.document.querySelectorAll("body *").forEach((element) => {
      if (
        element.closest("[data-proto-nav], [data-proto-screenshot-toast], [data-proto-screenshot-preview], [data-proto-recorder]")
        || pinned.some(({ element: parent }) => parent.contains(element))
      ) {
        return;
      }

      const style = targetWindow.getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (
        rect.width <= 0
        || rect.height <= 0
        || rect.right <= 0
        || rect.bottom <= 0
        || rect.left >= targetWindow.innerWidth
        || rect.top >= targetWindow.innerHeight
      ) {
        return;
      }

      const id = String(records.length);
      records.push({
        element,
        id,
        position: style.position,
        previousId: element.getAttribute("data-proto-screenshot-pinned"),
        rect,
      });
      pinned.push({ element });
      element.setAttribute("data-proto-screenshot-pinned", id);
    });

    return {
      apply: (root) => {
        records.forEach(({ id, position, rect }) => {
          const clone = root.querySelector(`[data-proto-screenshot-pinned="${id}"]`);
          if (!clone) {
            return;
          }

          if (position === "sticky") {
            const spacer = root.ownerDocument.createElement("div");
            spacer.setAttribute("aria-hidden", "true");
            spacer.style.setProperty("display", "block");
            spacer.style.setProperty("flex", `0 0 ${rect.height}px`);
            spacer.style.setProperty("width", `${rect.width}px`);
            spacer.style.setProperty("height", `${rect.height}px`);
            clone.parentNode?.insertBefore(spacer, clone);
          }

          clone.style.setProperty("position", "fixed", "important");
          clone.style.setProperty("top", `${targetWindow.scrollY + rect.top}px`, "important");
          clone.style.setProperty("right", "auto", "important");
          clone.style.setProperty("bottom", "auto", "important");
          clone.style.setProperty("left", `${targetWindow.scrollX + rect.left}px`, "important");
          clone.style.setProperty("width", `${rect.width}px`, "important");
          clone.style.setProperty("height", `${rect.height}px`, "important");
          clone.style.setProperty("margin", "0", "important");
          clone.style.setProperty("box-sizing", "border-box", "important");
          clone.removeAttribute("data-proto-screenshot-pinned");
        });
      },
      restore: () => {
        records.forEach(({ element, previousId }) => {
          if (previousId === null) {
            element.removeAttribute("data-proto-screenshot-pinned");
          } else {
            element.setAttribute("data-proto-screenshot-pinned", previousId);
          }
        });
      },
    };
  };

  const shouldIncludeNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    if (node.matches(
      "[data-proto-nav], [data-proto-screenshot-toast], [data-proto-screenshot-preview], [data-proto-recorder], [data-proto-screenshot-ignore-frame], [hidden], [inert]"
    )) {
      return false;
    }

    return !node.closest("[data-proto-nav], [data-proto-screenshot-toast], [data-proto-screenshot-preview], [data-proto-recorder]");
  };

  const captureWindow = async (renderer, targetWindow, format = "png", scale = 1) => {
    const targetDocument = targetWindow.document;
    const root = targetDocument.documentElement;

    if (!root || !targetWindow.innerWidth || !targetWindow.innerHeight) {
      throw new Error("The screenshot target is not ready.");
    }

    const resumeAnimations = pauseAnimations(targetDocument);
    const restorePlaceholders = normalizeEmptyPlaceholders(targetWindow);
    const removeCaptureStyles = installCaptureStyles(targetDocument);
    const restoreAssetUrls = normalizeAssetUrls(targetDocument);
    let restoreCssMasks = () => undefined;
    try {
      restoreCssMasks = await materializeCssMasks(targetWindow);
    } catch (error) {
      console.warn("CSS masks could not be prepared for screenshot.", error);
    }
    const pinnedElements = preparePinnedElements(targetWindow);
    const replacedFrames = [];
    const ignoredFrames = [];

    try {
      await waitForAssets(targetWindow);
      await nextPaint(targetWindow);

      for (const frame of Array.from(targetDocument.querySelectorAll("iframe"))) {
        if (!isVisibleFrame(frame, targetWindow)) {
          frame.setAttribute("data-proto-screenshot-ignore-frame", "");
          ignoredFrames.push(frame);
          continue;
        }

        try {
          const childWindow = frame.contentWindow;
          if (!childWindow?.document?.documentElement) {
            continue;
          }

          const frameImageUrl = await captureWindow(renderer, childWindow, "png", scale);
          const frameImage = targetDocument.createElement("img");
          frameImage.src = frameImageUrl;
          frameImage.alt = "";
          frameImage.setAttribute("aria-hidden", "true");
          copyComputedStyle(frame, frameImage, targetWindow);
          frameImage.style.setProperty("object-fit", "fill");
          frame.replaceWith(frameImage);

          if (typeof frameImage.decode === "function") {
            await frameImage.decode();
          }

          replacedFrames.push({ frame, frameImage });
        } catch (error) {
          frame.setAttribute("data-proto-screenshot-ignore-frame", "");
          ignoredFrames.push(frame);
          console.warn("A nested frame could not be captured.", error);
        }
      }

      const options = {
        width: targetWindow.innerWidth,
        height: targetWindow.innerHeight,
        scale,
        backgroundColor: "#ffffff",
        style: {
          width: `${targetWindow.innerWidth}px`,
          height: `${targetWindow.innerHeight}px`,
          overflow: "hidden",
        },
        features: {
          copyScrollbar: false,
          restoreScrollPosition: true,
        },
        fetch: {
          requestInit: {
            cache: "force-cache",
          },
        },
        fetchFn: async (url) => {
          if (String(url).startsWith("#") || String(url).startsWith("%23")) {
            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
          }

          return false;
        },
        filter: shouldIncludeNode,
        onCloneNode: pinnedElements.apply,
      };

      if (format === "png") {
        return await renderer.domToPng(root, options);
      }

      return await renderer.domToJpeg(root, {
        ...options,
        quality: 0.92,
      });
    } finally {
      replacedFrames.reverse().forEach(({ frame, frameImage }) => {
        frameImage.replaceWith(frame);
      });
      ignoredFrames.forEach((frame) => {
        frame.removeAttribute("data-proto-screenshot-ignore-frame");
      });
      pinnedElements.restore();
      restoreCssMasks();
      restoreAssetUrls();
      removeCaptureStyles();
      restorePlaceholders();
      resumeAnimations();
    }
  };

  const getFileName = (targetWindow, scale = 1) => {
    const pathSegments = targetWindow.location.pathname.split("/").filter(Boolean);
    const prototypesIndex = pathSegments.lastIndexOf("_prototypes");
    let projectName = pathSegments[prototypesIndex + 1] || "prototypes";

    if (projectName.includes(".")) {
      projectName = pathSegments[Math.max(prototypesIndex, pathSegments.length - 2)] || "prototypes";
    }

    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeProjectName = projectName.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    const scaleSuffix = scale >= 2 ? "@2x" : "";
    return `${safeProjectName}-viewport-screenshot-${date}-${time}${scaleSuffix}.png`;
  };

  const render = async (targetWindow = window, { scale = 1 } = {}) => {
    const renderer = await loadRenderer();
    return captureWindow(renderer, targetWindow, "png", scale);
  };

  const traceRoundedRect = (context, x, y, width, height, radius) => {
    const nextRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, width, height, nextRadius);
      return;
    }

    context.moveTo(x + nextRadius, y);
    context.arcTo(x + width, y, x + width, y + height, nextRadius);
    context.arcTo(x + width, y + height, x, y + height, nextRadius);
    context.arcTo(x, y + height, x, y, nextRadius);
    context.arcTo(x, y, x + width, y, nextRadius);
    context.closePath();
  };

  const createRoundedScreenshot = (image, scale = 1) => {
    const card = document.createElement("canvas");
    card.width = image.naturalWidth;
    card.height = image.naturalHeight;
    const context = card.getContext("2d");
    if (!context) {
      return null;
    }

    traceRoundedRect(context, 0, 0, card.width, card.height, BACKGROUND_RADIUS * scale);
    context.clip();
    context.drawImage(image, 0, 0);
    return card;
  };

  const composeBackground = (dataUrl, { transparent = false, scale = 1 } = {}) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const margin = BACKGROUND_MARGIN * scale;
      canvas.width = image.naturalWidth + margin * 2;
      canvas.height = image.naturalHeight + margin * 2;
      const context = canvas.getContext("2d");
      const card = createRoundedScreenshot(image, scale);
      if (!context || !card) {
        reject(new Error("Failed to compose the screenshot background."));
        return;
      }

      if (!transparent) {
        context.fillStyle = BACKGROUND_COLOR;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.shadowOffsetX = BACKGROUND_SHADOW.offsetX * scale;
      context.shadowOffsetY = BACKGROUND_SHADOW.offsetY * scale;
      context.shadowBlur = BACKGROUND_SHADOW.blur * scale;
      context.shadowColor = BACKGROUND_SHADOW.color;
      context.drawImage(card, margin, margin);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      reject(new Error("Failed to compose the screenshot background."));
    };
    image.src = dataUrl;
  });

  const take = async ({
    targetWindow = window,
    fileName,
    background = false,
    transparent = false,
    scale = 1,
  } = {}) => {
    if (targetWindow.location.protocol === "file:") {
      throw new Error("Open the prototype through localhost to take a screenshot.");
    }

    const captureScale = scale >= 2 ? 2 : 1;
    let dataUrl = await render(targetWindow, { scale: captureScale });
    if (background) {
      dataUrl = await composeBackground(dataUrl, { transparent, scale: captureScale });
    }

    fileName = fileName || getFileName(targetWindow, captureScale);

    const download = document.createElement("a");
    download.href = dataUrl;
    download.download = fileName;
    download.hidden = true;
    document.documentElement.appendChild(download);
    download.click();
    download.remove();
    return { fileName, dataUrl };
  };

  window.wefranchPrototypeScreenshot = {
    render,
    take,
  };
})();
