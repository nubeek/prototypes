(() => {
  let active = false;

  const marker = (text) => {
    const span = document.createElement("span");
    span.className = "doc-source-marker";
    span.textContent = text;
    return span;
  };

  const collapseSpace = (text) => text.replace(/\s+/g, " ");

  const trimEdges = (container) => {
    const nodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (!nodes.length) return;
    nodes[0].textContent = nodes[0].textContent.replace(/^\s+/, "");
    nodes[nodes.length - 1].textContent = nodes[nodes.length - 1].textContent.replace(/\s+$/, "");
  };

  const fillInline = (container, node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        container.append(collapseSpace(child.textContent));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const tag = child.tagName;
      if (tag === "STRONG" || tag === "B") {
        const strong = document.createElement("strong");
        strong.append(marker("**"));
        fillInline(strong, child);
        strong.append(marker("**"));
        container.append(strong);
        continue;
      }
      if (tag === "EM" || tag === "I") {
        const em = document.createElement("em");
        em.append(marker("*"));
        fillInline(em, child);
        em.append(marker("*"));
        container.append(em);
        continue;
      }
      if (tag === "A") {
        const href = child.getAttribute("href") || "";
        container.append(marker("["));
        fillInline(container, child);
        container.append(marker("]("));
        const link = document.createElement("a");
        link.className = "ui-link doc-source-link";
        link.href = href;
        link.textContent = href;
        container.append(link);
        container.append(marker(")"));
        continue;
      }
      if (tag === "IMG") {
        container.append(imageLine(child));
        continue;
      }
      fillInline(container, child);
    }
  };

  const inlineLine = (element, className) => {
    const line = document.createElement("p");
    line.className = className;
    fillInline(line, element);
    trimEdges(line);
    return line;
  };

  const imageLine = (img) => {
    const alt = (img.getAttribute("alt") || "").replace(/\]/g, "\\]");
    const src = img.getAttribute("src") || "";
    const line = document.createElement("p");
    line.className = "doc-source-line doc-source-image";
    line.append(marker("!["));
    line.append(alt);
    line.append(marker("]("));
    const link = document.createElement("a");
    link.className = "ui-link doc-source-link";
    link.href = src;
    link.textContent = src;
    line.append(link);
    line.append(marker(")"));
    return line;
  };

  const appendBlock = (root, element) => {
    const tag = element.tagName;
    if (tag === "H1" || tag === "H2" || tag === "H3") {
      const level = Number(tag.slice(1));
      const line = document.createElement("p");
      line.className = `doc-source-line doc-source-h${level}`;
      line.append(marker(`${"#".repeat(level)} `));
      line.append(collapseSpace(element.textContent).trim());
      root.append(line);
      return;
    }
    if (tag === "P") {
      const line = inlineLine(element, "doc-source-line");
      if (line.textContent.trim()) root.append(line);
      return;
    }
    if (tag === "UL" || tag === "OL") {
      const list = document.createElement("div");
      list.className = "doc-source-list";
      const items = [...element.children].filter((child) => child.tagName === "LI");
      items.forEach((item, index) => {
        const bullet = tag === "OL" ? `${index + 1}. ` : "- ";
        const line = inlineLine(item, `doc-source-line doc-source-item doc-source-item--${tag === "OL" ? "ordered" : "bullet"}`);
        line.prepend(marker(bullet));
        line.style.paddingLeft = `${bullet.length}ch`;
        line.style.textIndent = `-${bullet.length}ch`;
        list.append(line);
      });
      if (list.childElementCount) root.append(list);
      return;
    }
    if (tag === "FIGURE") {
      element.querySelectorAll("img").forEach((img) => root.append(imageLine(img)));
      return;
    }
    if (tag === "IMG") {
      root.append(imageLine(element));
    }
  };

  const buildSource = (article) => {
    const root = document.createElement("div");
    root.className = "doc-source";
    root.setAttribute("aria-label", "Article markdown");

    const body = article.querySelector(".doc-body");
    body?.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) appendBlock(root, child);
    });
    return root;
  };

  const syncButton = (article) => {
    const button = article.querySelector(".doc-markdown");
    if (!button) return;
    const label = active ? "Switch to article" : "Switch to markdown";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(active));
    button.dataset.tooltip = label;
    button.classList.toggle("is-active", active);
  };

  const sync = () => {
    const article = document.querySelector("article.doc");
    if (!article) return;
    article.classList.toggle("is-markdown", active);
    syncButton(article);
    article.querySelector(".doc-source")?.remove();
    if (!active) return;
    const source = buildSource(article);
    const body = article.querySelector(".doc-body");
    if (body) body.before(source);
    else article.append(source);
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".doc-markdown");
    if (!button || !button.closest("article.doc")) return;
    active = !active;
    sync();
  });

  window.WefranchDocMarkdown = { sync };
})();
