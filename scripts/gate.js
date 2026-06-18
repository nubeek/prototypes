(() => {
  const PASSWORD = "Showmethemoney$1";
  const STORAGE_KEY = "wefranch:prototype-access";
  const REMEMBERED_PASSWORD_KEY = "wefranch:prototype-remembered-password";
  const ACCESS_GRANTED_CLASS = "access-granted";

  const readStoredAccess = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  };

  const readRememberedPassword = () => {
    try {
      return localStorage.getItem(REMEMBERED_PASSWORD_KEY);
    } catch (error) {
      return null;
    }
  };

  const writeRememberedPassword = (password) => {
    try {
      localStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const clearRememberedPassword = () => {
    try {
      localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
    } catch (error) {
      // Ignore storage failures in restrictive browsing contexts.
    }
  };

  const bootstrapAccess = readStoredAccess();

  if (bootstrapAccess === "granted") {
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
  }

  // Remove the credentials that the GET submission appends to the URL so they
  // do not linger in the address bar or browser history after unlocking.
  const stripCredentialsFromUrl = () => {
    try {
      const url = new URL(window.location.href);

      if (!url.searchParams.has("password") && !url.searchParams.has("username")) {
        return;
      }

      url.searchParams.delete("password");
      url.searchParams.delete("username");
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

  const ensureRememberPasswordControl = (form) => {
    const existingControl = form.querySelector("[data-access-remember-label]");

    if (existingControl) {
      return existingControl;
    }

    const rememberLabel = document.createElement("label");
    rememberLabel.className = "filter-check access-gate__remember";
    rememberLabel.setAttribute("data-access-remember-label", "");

    const rememberInput = document.createElement("input");
    rememberInput.type = "checkbox";
    rememberInput.name = "rememberPassword";
    rememberInput.setAttribute("data-access-remember", "");

    const rememberIcon = document.createElement("span");
    rememberIcon.className = "filter-checkbox";
    rememberIcon.setAttribute("aria-hidden", "true");

    const rememberText = document.createElement("span");
    rememberText.textContent = "Remember password";

    rememberLabel.append(rememberInput, rememberIcon, rememberText);

    const button = form.querySelector(".access-gate__button");
    const error = form.querySelector("[data-access-error]");

    if (button && error) {
      form.insertBefore(rememberLabel, error);
    } else if (button) {
      button.insertAdjacentElement("afterend", rememberLabel);
    } else {
      form.appendChild(rememberLabel);
    }

    return rememberLabel;
  };

  const initGate = () => {
    const storedAccess = readStoredAccess();
    const rememberedPassword = readRememberedPassword();

    if (rememberedPassword === PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "granted");
      } catch (storageError) {
        // Continue and unlock even if session storage is unavailable.
      }
      unlock();
      return;
    }

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

    const rememberControl = ensureRememberPasswordControl(form);
    const rememberInput = rememberControl.querySelector("[data-access-remember]");

    if (rememberedPassword) {
      input.value = rememberedPassword;
    }

    if (rememberInput && rememberedPassword === PASSWORD) {
      rememberInput.checked = true;
      rememberControl.classList.add("is-checked");
    }

    if (rememberInput) {
      rememberInput.addEventListener("change", () => {
        rememberControl.classList.toggle("is-checked", rememberInput.checked);
      });
    }

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

      if (rememberInput && rememberInput.checked) {
        writeRememberedPassword(input.value);
      } else {
        clearRememberedPassword();
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
