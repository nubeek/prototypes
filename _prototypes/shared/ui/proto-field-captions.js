/* Field captions are never mouse focus targets.
   Clicking "Phone number", "Location", and other labels must not focus the
   associated control or blur the one that already has focus. Load this on
   every prototype that renders .proto-modal-field / .profile-modal-field /
   .target-modal-field. */
(function () {
  if (window.__wefranchFieldCaptions) return;
  window.__wefranchFieldCaptions = true;

  const FIELD_SELECTOR = ".proto-modal-field, .profile-modal-field, .target-modal-field";
  const CONTROL_SELECTOR = [
    "input",
    "textarea",
    "select",
    "button",
    "a",
    ".filter-select-field",
    ".filter-combobox-control",
    ".filter-combobox-menu",
    ".filter-combobox-clear",
    ".proto-modal-control",
    ".target-modal-control",
    ".proto-modal-select-field",
    ".target-modal-select-field",
    ".proto-modal-check-group",
    ".proto-modal-check",
    ".ui-check",
    ".request-info-territory-field",
    ".contact-email-copy"
  ].join(", ");

  function isFieldControl(node) {
    return Boolean(node.closest?.(CONTROL_SELECTOR));
  }

  function shouldIgnoreFieldCaptionPointer(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest(".access-gate, .proto-modal-check, .ui-check, .filter-check")) return false;
    if (isFieldControl(target)) return false;

    const field = target.closest(FIELD_SELECTOR);
    if (!field) return false;

    return target === field
      || field.matches("label")
      || Boolean(target.closest(`${FIELD_SELECTOR} > label, ${FIELD_SELECTOR} > span`));
  }

  let restoreNode = null;
  let restoreTimer = 0;

  function scheduleFocusRestore(node) {
    if (!node || node === document.body || node === document.documentElement) return;
    if (!isFieldControl(node) && !node.closest?.(FIELD_SELECTOR)) return;

    restoreNode = node;
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(() => {
      if (restoreNode && document.activeElement !== restoreNode) {
        restoreNode.focus({ preventScroll: true });
      }
      restoreNode = null;
    }, 0);
  }

  function ignoreFieldCaptionPointer(event) {
    if (!shouldIgnoreFieldCaptionPointer(event)) return;
    event.preventDefault();
    scheduleFocusRestore(restoreNode || document.activeElement);
  }

  document.addEventListener("mousedown", ignoreFieldCaptionPointer, true);
  document.addEventListener("click", ignoreFieldCaptionPointer, true);
})();
