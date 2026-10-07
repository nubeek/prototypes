(() => {
  const WORDS_PER_MINUTE = 200;

  const minutesToRead = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  };

  const sync = () => {
    const article = document.querySelector("article.doc");
    const body = article?.querySelector(".doc-body");
    const meta = article?.querySelector(".doc-meta");
    const button = meta?.querySelector(".doc-markdown");
    if (!body || !button) return;

    let time = meta.querySelector(".doc-reading-time");
    if (!time) {
      time = document.createElement("p");
      time.className = "doc-reading-time";
      const divider = document.createElement("span");
      divider.className = "doc-meta-divider";
      divider.setAttribute("aria-hidden", "true");
      button.before(time, divider);
    }

    const minutes = minutesToRead(body.textContent);
    time.textContent = `${minutes} min. read`;
  };

  sync();
  window.WefranchDocReadingTime = { sync };
})();
