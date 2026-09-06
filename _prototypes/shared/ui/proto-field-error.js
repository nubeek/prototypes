/* Shared prototype field errors.
   Use WefranchFieldErrors.set / clear instead of reportValidity() or native
   bubbles. Forms that validate should set novalidate. Load this on every
   page that shows proto/profile/target field errors.

   Markup: append .proto-modal-field-message.is-error inside
   .proto-modal-field / .profile-modal-field / .target-modal-field. */
(function () {
  const FIELD_SELECTOR = ".proto-modal-field, .profile-modal-field, .target-modal-field";
  const MESSAGE_CLASS = "proto-modal-field-message";
  const SET_EVENT = "proto-field-error";
  const CLEAR_EVENT = "proto-field-error-cleared";

  function getField(element) {
    if (!(element instanceof Element)) return null;
    if (element.matches(FIELD_SELECTOR)) return element;
    return element.closest(FIELD_SELECTOR);
  }

  function getMessageEl(field) {
    return field.querySelector(`:scope > .${MESSAGE_CLASS}`);
  }

  function getFieldControls(field) {
    return [...field.querySelectorAll("input, textarea, select")].filter((control) => {
      return control.type !== "hidden" && !control.disabled;
    });
  }

  function getMessageId(field, control) {
    const base = control?.id || field.id;
    return base ? `${base}-error` : "";
  }

  function describeControls(field, messageEl) {
    const messageId = messageEl.id;
    getFieldControls(field).forEach((control) => {
      control.setAttribute("aria-invalid", "true");
      if (!messageId) return;

      const describedBy = new Set(String(control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      describedBy.add(messageId);
      control.setAttribute("aria-describedby", [...describedBy].join(" "));
    });
  }

  function undescribeControls(field, messageId) {
    getFieldControls(field).forEach((control) => {
      control.removeAttribute("aria-invalid");
      if (!messageId) return;

      const describedBy = String(control.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== messageId);
      if (describedBy.length) control.setAttribute("aria-describedby", describedBy.join(" "));
      else control.removeAttribute("aria-describedby");
    });
  }

  function dispatchFieldEvent(field, name, detail) {
    field.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      detail
    }));
  }

  function set(fieldOrControl, message) {
    const field = getField(fieldOrControl);
    if (!field || !message) return null;

    field.classList.add("is-error");

    const control = getFieldControls(field)[0] || null;
    let messageEl = getMessageEl(field);
    if (!messageEl) {
      messageEl = document.createElement("p");
      messageEl.className = `${MESSAGE_CLASS} is-error`;
      messageEl.setAttribute("role", "alert");
      const messageId = getMessageId(field, control);
      if (messageId) messageEl.id = messageId;
      field.append(messageEl);
    }

    messageEl.textContent = message;
    describeControls(field, messageEl);
    dispatchFieldEvent(field, SET_EVENT, { message });
    return field;
  }

  function clear(fieldOrControl, { silent = false } = {}) {
    const field = getField(fieldOrControl);
    if (!field?.classList.contains("is-error")) return null;

    const messageEl = getMessageEl(field);
    const messageId = messageEl?.id || "";
    field.classList.remove("is-error");
    messageEl?.remove();
    undescribeControls(field, messageId);
    if (!silent) dispatchFieldEvent(field, CLEAR_EVENT, {});
    return field;
  }

  function clearAll(root, options) {
    const scope = root instanceof Element ? root : document;
    scope.querySelectorAll(`${FIELD_SELECTOR}.is-error`).forEach((field) => {
      clear(field, options);
    });
  }

  function isFieldControl(node) {
    return node instanceof HTMLInputElement
      || node instanceof HTMLTextAreaElement
      || node instanceof HTMLSelectElement;
  }

  function handleFieldEdit(event) {
    if (!isFieldControl(event.target)) return;
    clear(event.target);
  }

  document.addEventListener("input", handleFieldEdit, true);
  document.addEventListener("change", handleFieldEdit, true);

  window.WefranchFieldErrors = {
    getField,
    set,
    clear,
    clearAll
  };
})();
