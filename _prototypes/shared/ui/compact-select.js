/* Shared compact native dropdown.
   Markup and classes live in compact-select.css. Load this when creating
   the control in JS. Pages that already render the markup do not need it. */
(function () {
  const CHEVRON_SRC = "../../assets/icons/chevron.svg";

  function normalizeOption(option) {
    if (option && typeof option === "object") {
      return {
        value: String(option.value),
        label: option.label == null ? String(option.value) : String(option.label)
      };
    }
    return { value: String(option), label: String(option) };
  }

  function getSelect(root) {
    return root instanceof Element
      ? root.querySelector("select.compact-select__native, select.table-select")
      : null;
  }

  function getValueEl(root) {
    return root instanceof Element
      ? root.querySelector(".compact-select__value, .table-select-value")
      : null;
  }

  function selectedLabel(select, placeholder) {
    const option = select?.selectedOptions?.[0];
    const label = String(option?.textContent || "").trim();
    if (label) return label;
    return String(placeholder || "");
  }

  function sync(root, placeholder) {
    const select = getSelect(root);
    const valueEl = getValueEl(root);
    if (!select || !valueEl) return root;

    const label = selectedLabel(select, placeholder);
    valueEl.textContent = label;
    valueEl.classList.toggle("is-placeholder", !select.value);
    return root;
  }

  function fill(select, options, selectedValue) {
    if (!(select instanceof HTMLSelectElement)) return select;

    const normalized = options.map(normalizeOption);
    const selected = selectedValue == null ? "" : String(selectedValue);
    const hasSelected = normalized.some((option) => option.value === selected);

    select.replaceChildren();
    normalized.forEach((option, index) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      if ((hasSelected && option.value === selected) || (!hasSelected && index === 0)) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });
    if (hasSelected) select.value = selected;
    return select;
  }

  function create({
    options = [],
    value,
    placeholder = "",
    ariaLabel,
    ariaLabelledBy,
    disabled = false,
    fill: fillWidth = false,
    chevronSrc = CHEVRON_SRC,
    onChange
  } = {}) {
    const root = document.createElement("div");
    root.className = fillWidth ? "compact-select compact-select--fill" : "compact-select";

    const valueEl = document.createElement("span");
    valueEl.className = "compact-select__value";
    valueEl.setAttribute("aria-hidden", "true");

    const select = document.createElement("select");
    select.className = "compact-select__native";
    if (ariaLabel) select.setAttribute("aria-label", ariaLabel);
    if (ariaLabelledBy) select.setAttribute("aria-labelledby", ariaLabelledBy);
    fill(select, options, value);
    if (disabled) select.disabled = true;
    select.addEventListener("change", () => {
      sync(root, placeholder);
      if (typeof onChange === "function") onChange(select.value);
    });

    const chevron = document.createElement("img");
    chevron.src = chevronSrc;
    chevron.alt = "";
    chevron.setAttribute("aria-hidden", "true");

    root.append(valueEl, select, chevron);
    sync(root, placeholder);
    return root;
  }

  window.WefranchCompactSelect = { create, fill, sync, getSelect };
})();
