(() => {
  const GATE_SCRIPT_SRC = document.currentScript?.src || "";
  const PASSWORD = "Showmethemoney$1";
  const STORAGE_KEY = "wefranch:prototype-access";
  const REMEMBERED_PASSWORD_KEY = "wefranch:prototype-remembered-password";
  const ACCESS_GRANTED_CLASS = "access-granted";
  const ACCESS_RESOLVING_CLASS = "access-resolving";

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

  const persistGrantedAccess = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "granted");
    } catch (storageError) {
      // Continue and unlock even if session storage is unavailable.
    }
  };

  const finishResolving = () => {
    document.documentElement.classList.remove(ACCESS_RESOLVING_CLASS);
  };

  const installBootstrapStyles = () => {
    if (document.getElementById("access-gate-bootstrap-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "access-gate-bootstrap-style";
    style.textContent = [
      "html.access-resolving .access-gate__panel{opacity:0;pointer-events:none}",
      "html.access-granted .access-gate{display:none!important}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  };

  const bootstrapStoredAccess = readStoredAccess();
  const bootstrapRememberedPassword = readRememberedPassword();

  installBootstrapStyles();

  if (bootstrapStoredAccess === "granted" || bootstrapRememberedPassword === PASSWORD) {
    if (bootstrapRememberedPassword === PASSWORD && bootstrapStoredAccess !== "granted") {
      persistGrantedAccess();
    }
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
  } else {
    document.documentElement.classList.add(ACCESS_RESOLVING_CLASS);
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
      url.searchParams.delete("accessKey");
      const search = url.searchParams.toString();
      const cleaned = url.pathname + (search ? `?${search}` : "") + url.hash;
      window.history.replaceState(null, "", cleaned);
    } catch (error) {
      // Leave the URL untouched if the History API is unavailable.
    }
  };

  const unlock = () => {
    document.documentElement.classList.add(ACCESS_GRANTED_CLASS);
    finishResolving();
    document.body?.classList.remove("access-locked");
    stripCredentialsFromUrl();
  };

  const suppressBrowserPasswordUI = (form, input) => {
    form.setAttribute("autocomplete", "off");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-form-type", "other");
    input.removeAttribute("autofocus");
    input.setAttribute("readonly", "readonly");
    input.setAttribute("type", "text");
    input.setAttribute("name", "accessKey");

    form.querySelectorAll('input[autocomplete="username"]').forEach((username) => {
      username.remove();
    });

    const enableTyping = () => {
      input.removeAttribute("readonly");
    };

    input.addEventListener("pointerdown", enableTyping);
    input.addEventListener("keydown", enableTyping);
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

  const ensurePasswordVisibilityControl = (input) => {
    const existingField = input.closest("[data-access-field]");

    if (existingField) {
      return existingField.querySelector("[data-access-visibility]");
    }

    const field = document.createElement("div");
    field.className = "access-gate__field";
    field.setAttribute("data-access-field", "");
    input.parentNode.insertBefore(field, input);
    field.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "access-gate__visibility";
    toggle.setAttribute("data-access-visibility", "");
    toggle.hidden = true;
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");

    const icon = document.createElement("span");
    icon.className = "access-gate__visibility-icon";
    icon.setAttribute("aria-hidden", "true");
    toggle.append(icon);
    field.append(toggle);

    return toggle;
  };

  const initGate = () => {
    const storedAccess = readStoredAccess();
    const rememberedPassword = readRememberedPassword();

    if (rememberedPassword === PASSWORD) {
      persistGrantedAccess();
      unlock();
      return;
    }

    if (storedAccess === "granted") {
      unlock();
      return;
    }

    const gate = document.querySelector("[data-access-gate]");
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
    suppressBrowserPasswordUI(form, input);

    const rememberControl = ensureRememberPasswordControl(form);
    const rememberInput = rememberControl.querySelector("[data-access-remember]");
    const visibilityToggle = ensurePasswordVisibilityControl(input);
    let userEditedPassword = false;
    let passwordRevealed = false;

    const syncPasswordVisibility = () => {
      const hasPassword = Boolean(input.value);
      const isFocused = document.activeElement === input;

      visibilityToggle.hidden = !hasPassword && !isFocused;

      if (!hasPassword && passwordRevealed) {
        passwordRevealed = false;
      }

      input.classList.toggle("is-revealed", passwordRevealed);
      visibilityToggle.classList.toggle("is-revealed", passwordRevealed);
      visibilityToggle.setAttribute("aria-pressed", passwordRevealed ? "true" : "false");
      visibilityToggle.setAttribute("aria-label", passwordRevealed ? "Hide password" : "Show password");
    };

    visibilityToggle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });

    visibilityToggle.addEventListener("click", () => {
      if (!input.value) {
        return;
      }

      passwordRevealed = !passwordRevealed;
      syncPasswordVisibility();
    });

    if (rememberInput) {
      rememberInput.addEventListener("change", () => {
        rememberControl.classList.toggle("is-checked", rememberInput.checked);
      });
    }

    const revealPasswordForm = () => {
      if (rememberedPassword && !input.value) {
        input.value = rememberedPassword;
      }

      finishResolving();
      gate?.removeAttribute("aria-busy");
      syncPasswordVisibility();
      input.focus();
    };

    const unlockFromSavedPassword = () => {
      persistGrantedAccess();
      unlock();
    };

    const tryUnlockFromField = () => {
      if (userEditedPassword || input.value !== PASSWORD) {
        return false;
      }

      unlockFromSavedPassword();
      return true;
    };

    input.addEventListener("focus", syncPasswordVisibility);
    input.addEventListener("blur", syncPasswordVisibility);
    input.addEventListener("keydown", () => {
      userEditedPassword = true;
    });
    input.addEventListener("paste", () => {
      userEditedPassword = true;
    });
    input.addEventListener("input", () => {
      syncPasswordVisibility();
      tryUnlockFromField();
    });

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

      persistGrantedAccess();
    });

    gate?.setAttribute("aria-busy", "true");

    if (input.value === PASSWORD) {
      unlockFromSavedPassword();
      return;
    }

    revealPasswordForm();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGate, { once: true });
  } else {
    initGate();
  }

  const bootProtoNav = () => {
    if (!GATE_SCRIPT_SRC || document.querySelector("script[data-proto-nav-script]")) {
      return;
    }

    const navScript = document.createElement("script");
    navScript.src = new URL("proto-nav.js", GATE_SCRIPT_SRC).href;
    navScript.setAttribute("data-proto-nav-script", "");
    document.head.appendChild(navScript);
  };

  bootProtoNav();
})();
