(function () {
  const fields = new Map();
  const PART_ORDER = ["day", "month", "year"];
  const PART_MAX = { day: 31, month: 12, year: 99 };

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function toIso(day, month, year2) {
    const dayValue = Number(day);
    const monthValue = Number(month);
    if (!day || !month || year2 === "" || year2 == null) return "";
    if (!Number.isFinite(dayValue) || !Number.isFinite(monthValue)) return "";

    const year = Number(year2) + (Number(year2) < 100 ? 2000 : 0);
    const lastDay = new Date(year, monthValue, 0).getDate();
    if (!Number.isFinite(lastDay) || lastDay < 1) return "";

    const nextDay = Math.min(Math.max(dayValue, 1), lastDay);
    const nextMonth = Math.min(Math.max(monthValue, 1), 12);
    return `${year}-${pad2(nextMonth)}-${pad2(nextDay)}`;
  }

  function fromIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
      return { day: "", month: "", year: "" };
    }

    const [year, month, day] = value.split("-");
    return { day, month, year: year.slice(-2) };
  }

  function getValue(field) {
    return field?.dataset.date || "";
  }

  function setValue(field, value) {
    const api = fields.get(field);
    if (api) {
      api.setValue(value);
      return;
    }

    if (field) field.dataset.date = value || "";
  }

  function enhanceFilterDate(field, { onChange } = {}) {
    if (!field) return null;
    if (fields.has(field)) return fields.get(field);

    const parts = {
      day: field.querySelector('[data-date-part="day"]'),
      month: field.querySelector('[data-date-part="month"]'),
      year: field.querySelector('[data-date-part="year"]'),
    };

    if (!parts.day || !parts.month || !parts.year) return null;

    function getPartDigits(name) {
      return digitsOnly(parts[name].value);
    }

    function setPartDigits(name, value) {
      parts[name].value = value;
    }

    function showPartSelection(input) {
      if (!digitsOnly(input.value)) {
        input.value = input.placeholder;
      }
      input.select();
    }

    function focusPart(name) {
      const input = parts[name];
      if (!input) return;
      input.focus();
      showPartSelection(input);
    }

    function nextPart(name) {
      const index = PART_ORDER.indexOf(name);
      if (index < PART_ORDER.length - 1) {
        focusPart(PART_ORDER[index + 1]);
        return;
      }

      parts[name].blur();
    }

    function previousPart(name) {
      const index = PART_ORDER.indexOf(name);
      if (index > 0) focusPart(PART_ORDER[index - 1]);
    }

    function readParts() {
      return {
        day: getPartDigits("day"),
        month: getPartDigits("month"),
        year: getPartDigits("year"),
      };
    }

    function commit({ silent = false } = {}) {
      const { day, month, year } = readParts();
      const complete = day.length > 0 && month.length > 0 && year.length === 2;
      const iso = complete ? toIso(day, month, year) : "";

      if (iso) {
        const next = fromIso(iso);
        setPartDigits("day", next.day);
        setPartDigits("month", next.month);
        setPartDigits("year", next.year);
      }

      const previous = field.dataset.date || "";
      field.dataset.date = iso;
      if (!silent && previous !== iso) {
        onChange?.(iso);
      }

      return iso;
    }

    function clampPart(name, raw) {
      const digits = digitsOnly(raw).slice(0, 2);
      if (!digits) return "";

      const numeric = Number(digits);
      const max = PART_MAX[name];
      if (digits.length === 2 && numeric > max) return pad2(max);
      if (digits.length === 2 && name !== "year" && numeric < 1) return "01";
      return digits;
    }

    function shouldAdvance(name, digits) {
      if (digits.length >= 2) return true;
      if (digits.length !== 1) return false;
      if (name === "day") return Number(digits) > 3;
      if (name === "month") return Number(digits) > 1;
      return false;
    }

    function handleDigit(name, digit) {
      const input = parts[name];
      const selected = input.selectionStart !== input.selectionEnd
        || (input.selectionStart === 0 && input.selectionEnd === input.value.length);
      const current = selected ? "" : getPartDigits(name);
      let next = clampPart(name, `${current}${digit}`);

      if (shouldAdvance(name, next) && next.length === 1 && name !== "year") {
        next = pad2(next);
      }

      setPartDigits(name, next);

      if (shouldAdvance(name, next)) {
        nextPart(name);
        const { day, month, year } = readParts();
        if (day.length && month.length && year.length === 2) {
          commit();
        }
      }
    }

    function stepPart(name, delta) {
      const current = Number(getPartDigits(name) || (delta > 0 ? 0 : PART_MAX[name] + 1));
      const max = PART_MAX[name];
      const min = name === "year" ? 0 : 1;
      let next = current + delta;
      if (next > max) next = min;
      if (next < min) next = max;
      setPartDigits(name, pad2(next));
      parts[name].select();
      const { day, month, year } = readParts();
      if (day.length && month.length && year.length === 2) {
        commit();
      }
    }

    PART_ORDER.forEach((name) => {
      const input = parts[name];

      input.addEventListener("focus", () => {
        window.requestAnimationFrame(() => showPartSelection(input));
      });

      input.addEventListener("mouseup", (event) => {
        event.preventDefault();
        showPartSelection(input);
      });

      input.addEventListener("keydown", (event) => {
        if (event.key >= "0" && event.key <= "9") {
          event.preventDefault();
          handleDigit(name, event.key);
          return;
        }

        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          if (getPartDigits(name)) {
            setPartDigits(name, "");
            return;
          }
          if (event.key === "Backspace") previousPart(name);
          return;
        }

        if (event.key === "ArrowLeft") {
          if (input.selectionStart === 0 && input.selectionEnd === 0) {
            event.preventDefault();
            previousPart(name);
          }
          return;
        }

        if (event.key === "ArrowRight") {
          if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
            event.preventDefault();
            nextPart(name);
          }
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          stepPart(name, 1);
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          stepPart(name, -1);
          return;
        }

        if (event.key === "Tab") return;

        if (event.key.length === 1) {
          event.preventDefault();
        }
      });

      input.addEventListener("blur", () => {
        if (!getPartDigits(name)) setPartDigits(name, "");

        window.requestAnimationFrame(() => {
          if (field.contains(document.activeElement)) return;

          const { day, month, year } = readParts();
          if (day.length === 1) setPartDigits("day", pad2(day));
          if (month.length === 1) setPartDigits("month", pad2(month));
          commit();
        });
      });
    });

    const api = {
      getValue: () => field.dataset.date || "",
      setValue(value) {
        const next = fromIso(value);
        setPartDigits("day", next.day);
        setPartDigits("month", next.month);
        setPartDigits("year", next.year);
        field.dataset.date = value && next.day ? value : "";
      },
      commit,
    };

    field.addEventListener("mousedown", (event) => {
      if (event.target.closest(".filter-date-part")) return;
      event.preventDefault();
      const empty = PART_ORDER.find((name) => !getPartDigits(name));
      focusPart(empty || "day");
    });

    field.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text") || "";
      const isoMatch = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const displayMatch = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
      if (!isoMatch && !displayMatch) return;

      event.preventDefault();
      const iso = isoMatch
        ? isoMatch[0]
        : toIso(displayMatch[1], displayMatch[2], displayMatch[3].slice(-2));
      api.setValue(iso);
      onChange?.(iso);
    });

    fields.set(field, api);
    field.dataset.date = field.dataset.date || "";
    return api;
  }

  window.WefranchFilterDate = {
    enhance: enhanceFilterDate,
    getValue,
    setValue,
  };
})();
