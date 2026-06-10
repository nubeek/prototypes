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

  const unlock = () => {
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
    document.body.classList.remove("access-locked");
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

    input.focus();

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const passwordMatches = input.value === PASSWORD;

      if (passwordMatches) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "granted");
        } catch (error) {
          // Continue unlocking if storage is unavailable for this browser context.
        }

        unlock();
        return;
      }

      input.select();
      if (error) {
        error.hidden = false;
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGate, { once: true });
  } else {
    initGate();
  }
})();
