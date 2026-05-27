(() => {
  const PASSWORD = "Showmethemoney$1";
  const STORAGE_KEY = "wefranch:prototype-access";

  const unlock = () => {
    document.body.classList.remove("access-locked");
  };

  if (sessionStorage.getItem(STORAGE_KEY) === "granted") {
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

    if (input.value === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "granted");
      unlock();
      return;
    }

    input.select();
    if (error) {
      error.hidden = false;
    }
  });
})();
