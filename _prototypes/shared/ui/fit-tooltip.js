(function () {
  function measureLongestContentWidth(tooltip) {
    const range = document.createRange();
    let longest = 0;

    const walker = document.createTreeWalker(tooltip, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue && node.nodeValue.trim()) {
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        for (let index = 0; index < rects.length; index += 1) {
          longest = Math.max(longest, rects[index].width);
        }
      }
      node = walker.nextNode();
    }

    if (typeof range.detach === "function") {
      range.detach();
    }

    tooltip.querySelectorAll("img, svg").forEach((media) => {
      longest = Math.max(longest, media.getBoundingClientRect().width);
    });

    return Math.ceil(longest);
  }

  function getElementTextBoundingRect(element) {
    if (!(element instanceof Element)) return null;

    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = range.getClientRects();
    if (typeof range.detach === "function") {
      range.detach();
    }

    if (rects.length) {
      let left = rects[0].left;
      let top = rects[0].top;
      let right = rects[0].right;
      let bottom = rects[0].bottom;

      for (let index = 1; index < rects.length; index += 1) {
        const rect = rects[index];
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
      }

      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    }

    return element.getBoundingClientRect();
  }

  function fitTooltipToContent(tooltip) {
    if (!tooltip) return;

    tooltip.style.width = "";

    const style = getComputedStyle(tooltip);
    const maxWidth = parseFloat(style.maxWidth);
    const extra =
      (parseFloat(style.paddingLeft) || 0)
      + (parseFloat(style.paddingRight) || 0)
      + (parseFloat(style.borderLeftWidth) || 0)
      + (parseFloat(style.borderRightWidth) || 0);

    if (Number.isFinite(maxWidth) && tooltip.offsetWidth > maxWidth) {
      tooltip.style.width = `${maxWidth}px`;
    }

    for (let pass = 0; pass < 2; pass += 1) {
      const lineWidth = measureLongestContentWidth(tooltip);
      if (!lineWidth) {
        tooltip.style.width = "";
        return;
      }

      const nextWidth = lineWidth + extra;
      const capped = Number.isFinite(maxWidth) ? Math.min(maxWidth, nextWidth) : nextWidth;
      tooltip.style.width = `${Math.ceil(capped)}px`;
    }
  }

  window.fitTooltipToContent = fitTooltipToContent;
  window.getElementTextBoundingRect = getElementTextBoundingRect;
})();
