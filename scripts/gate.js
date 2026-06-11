(() => {
  const PASSWORD = "Showmethemoney$1";
  const STORAGE_KEY = "wefranch:prototype-access";
  const ACCESS_GRANTED_CLASS = "access-granted";

  const readStoredAccess = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  };

  const bootstrapAccess = readStoredAccess();

  if (bootstrapAccess === "granted") {
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
  }

  // Remove the password that the GET submission appends to the URL so it does
  // not linger in the address bar or browser history after unlocking.
  const stripCredentialsFromUrl = () => {
    try {
      const url = new URL(window.location.href);

      if (!url.searchParams.has("password")) {
        return;
      }

      url.searchParams.delete("password");
      const search = url.searchParams.toString();
      const cleaned = url.pathname + (search ? `?${search}` : "") + url.hash;
      window.history.replaceState(null, "", cleaned);
    } catch (error) {
      // Leave the URL untouched if the History API is unavailable.
    }
  };

  const unlock = () => {
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
    document.body.classList.remove("access-locked");
    stripCredentialsFromUrl();
  };

  const initGate = () => {
    const storedAccess = readStoredAccess();

    if (storedAccess === "granted") {
      unlock();
      return;
    }

    const form = document.querySelector("[data-access-form]");
    const input = document.querySelector("[data-access-password]");
    const error = document.querySelector("[data-access-error]");

    if (!form || !input) {
      unlock();
      return;
    }

    // Submit via GET so the gate works on static file servers (which reject
    // POST) and simply reloads the current page, where stored access unlocks
    // it without showing the form again.
    form.setAttribute("method", "get");

    input.focus();

    form.addEventListener("submit", (event) => {
      const passwordMatches = input.value === PASSWORD;

      if (!passwordMatches) {
        event.preventDefault();
        input.select();
        if (error) {
          error.hidden = false;
        }
        return;
      }

      // Persist access before navigation so the reloaded page unlocks, then
      // let the form submit normally. The real submission is what prompts
      // every browser (Chrome, Edge, Firefox, Safari) to offer saving the
      // password to its password manager.
      try {
        sessionStorage.setItem(STORAGE_KEY, "granted");
      } catch (storageError) {
        // Continue submitting if storage is unavailable for this context.
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGate, { once: true });
  } else {
    initGate();
  }
})();
