(() => {
  const openModal = (overlayId) => {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  };

  const closeModal = (overlay) => {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.classList.add("is-closing");
    overlay.addEventListener(
      "transitionend",
      () => {
        overlay.classList.remove("is-closing");
        overlay.hidden = true;
      },
      { once: true }
    );
  };

  document.querySelectorAll("[data-open-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => openModal(trigger.dataset.openModal));
  });

  document.querySelectorAll(".profile-modal-overlay").forEach((overlay) => {
    overlay.querySelectorAll(".profile-modal-close, .target-modal-cancel").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(overlay));
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay);
    });
  });

  const toastToggle = document.getElementById("dsToastToggle");
  const toast = document.getElementById("dsLiveToast");
  if (toastToggle && toast) {
    toastToggle.addEventListener("click", () => {
      toast.classList.toggle("is-visible");
      toast.classList.toggle("is-error");
      toast.textContent = toast.classList.contains("is-error")
        ? "Something went wrong."
        : "Screenshot saved.";
    });
  }
})();
