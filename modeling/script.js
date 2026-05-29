(function () {
  const solutionEyebrow = document.querySelector(".solution__eyebrow");

  if (solutionEyebrow) {
    solutionEyebrow.addEventListener("click", () => {
      const currentPath = window.location.pathname;
      const nextPage = currentPath.endsWith("index-video.html")
        ? "index.html"
        : "index-video.html";
      window.location.href = nextPage;
    });
  }

  const stage = document.querySelector("[data-stage]");
  if (!stage) return;

  const cards = {
    inputs: stage.querySelector(".stage__shot--inputs"),
    version: stage.querySelector(".stage__shot--version"),
    access: stage.querySelector(".stage__shot--access"),
  };
  const model = stage.querySelector(".stage__shot--model");
  let closeTimer;

  function openDetail(key) {
    clearTimeout(closeTimer);
    stage.classList.remove("is-closing");
    stage.classList.add("is-detail");
    stage.dataset.active = key;
  }

  function closeDetail() {
    if (!stage.classList.contains("is-detail")) return;
    stage.classList.add("is-closing");
    stage.classList.remove("is-detail");
    delete stage.dataset.active;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => stage.classList.remove("is-closing"), 500);
  }

  function toggleDetail(key) {
    if (stage.dataset.active === key) closeDetail();
    else openDetail(key);
  }

  Object.entries(cards).forEach(([key, el]) => {
    if (!el) return;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDetail(key);
    });
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDetail(key);
      }
    });
  });

  // Clicking the (blurred) model dismisses the detail view.
  if (model) model.addEventListener("click", closeDetail);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetail();
  });

  // Toggle the reveal class as the stage enters/leaves the viewport so the
  // staggered animation can replay each time it's scrolled back into view.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        stage.classList.toggle("is-visible", entry.isIntersecting);
        if (!entry.isIntersecting) closeDetail();
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(stage);
})();
