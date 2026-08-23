(function () {
  const DEFAULT_HISTOGRAM_BINS = 24;

  function isCurrencyNumberInput(input) {
    return input?.classList.contains("filter-number-input--currency");
  }

  function parseCurrencyInputValue(value) {
    if (value == null || value === "") return NaN;
    const normalized = String(value).replace(/[^\d]/g, "");
    if (!normalized) return NaN;
    return Number(normalized);
  }

  function formatCurrencyInputValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "";
    return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function getFilterNumberInputValue(input) {
    if (!input) return 0;
    if (isCurrencyNumberInput(input)) {
      const parsed = parseCurrencyInputValue(input.value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(input.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setFilterNumberInputDisplay(input, value) {
    if (!input) return;

    if (isCurrencyNumberInput(input)) {
      input.value = formatCurrencyInputValue(value);
      return;
    }

    input.value = String(value);
  }

  function clampRangeValue(value, defaults) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return defaults.min;
    return Math.min(defaults.max, Math.max(defaults.min, Math.round(numericValue)));
  }

  function getNormalizedRange({ changed, defaults, maxValue, minValue }) {
    let nextMin = clampRangeValue(minValue, defaults);
    let nextMax = clampRangeValue(maxValue, defaults);

    if (nextMin > nextMax) {
      if (changed === "max") {
        nextMin = nextMax;
      } else {
        nextMax = nextMin;
      }
    }

    return { nextMax, nextMin };
  }

  function buildHistogramCounts(values, rangeMin, rangeMax, binCount = DEFAULT_HISTOGRAM_BINS) {
    const counts = Array(binCount).fill(0);
    const rangeSize = rangeMax - rangeMin;

    if (rangeSize <= 0) {
      return counts;
    }

    values.forEach((value) => {
      const clamped = Math.min(rangeMax, Math.max(rangeMin, value));
      const ratio = (clamped - rangeMin) / rangeSize;
      const index = Math.min(binCount - 1, Math.floor(ratio * binCount));
      counts[index] += 1;
    });

    return counts;
  }

  function syncHistogramRange(track, binCount = DEFAULT_HISTOGRAM_BINS) {
    const section = track?.closest(".filter-section");
    const histogramBars = section?.querySelectorAll(".filter-range-histogram-bar");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");

    if (!histogramBars?.length || !minRange || !maxRange) {
      return;
    }

    const rangeMin = Number(minRange.min);
    const rangeMax = Number(maxRange.max);
    const minValue = Math.min(Number(minRange.value), Number(maxRange.value));
    const maxValue = Math.max(Number(minRange.value), Number(maxRange.value));
    const rangeSize = rangeMax - rangeMin;
    const binSize = rangeSize / binCount;

    histogramBars.forEach((bar, index) => {
      const barMin = rangeMin + (index * binSize);
      const barMax = rangeMin + ((index + 1) * binSize);
      const inRange = rangeSize > 0 && barMax > minValue && barMin < maxValue;
      bar.classList.toggle("is-in-range", inRange);
    });
  }

  function renderHistogram({
    section,
    values,
    binCount = DEFAULT_HISTOGRAM_BINS
  }) {
    const histogramBars = section?.querySelector(".filter-range-histogram-bars");
    const track = section?.querySelector(".filter-range-slider--histogram");

    if (!section || !histogramBars || !track) {
      return;
    }

    histogramBars.closest(".filter-range-histogram")
      ?.style.setProperty("--histogram-bins", String(binCount));

    const minRange = track.querySelector(".range-input-min");
    const maxRange = track.querySelector(".range-input-max");
    const rangeMin = Number(minRange?.min ?? 0);
    const rangeMax = Number(maxRange?.max ?? 0);
    const counts = buildHistogramCounts(values, rangeMin, rangeMax, binCount);
    const peak = Math.max(...counts, 1);

    histogramBars.replaceChildren();
    counts.forEach((count) => {
      const bar = document.createElement("span");
      bar.className = "filter-range-histogram-bar";
      bar.style.height = count
        ? `${Math.max(14, Math.round((count / peak) * 100))}%`
        : "8%";
      histogramBars.append(bar);
    });

    syncHistogramRange(track, binCount);
  }

  function syncRangeTrack(track, { onSync } = {}) {
    const minRange = track.querySelector(".range-input-min");
    const maxRange = track.querySelector(".range-input-max");
    const fill = track.querySelector(".range-fill");
    const section = track.closest(".filter-section");
    const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
    const minInput = numberInputs[0];
    const maxInput = numberInputs[1];

    if (!minRange || !maxRange) return;

    const min = Number(minRange.min);
    const max = Number(maxRange.max);
    const rangeSize = max - min;
    let minValue = Number(minRange.value);
    let maxValue = Number(maxRange.value);

    if (minValue > maxValue) {
      if (document.activeElement === maxRange || document.activeElement === maxInput) {
        minValue = maxValue;
      } else {
        maxValue = minValue;
      }
    }

    minRange.value = String(minValue);
    maxRange.value = String(maxValue);

    if (minInput && document.activeElement !== minInput) {
      setFilterNumberInputDisplay(minInput, minValue);
    }
    if (maxInput && document.activeElement !== maxInput) {
      setFilterNumberInputDisplay(maxInput, maxValue);
    }

    if (fill && rangeSize > 0) {
      const minPercent = ((minValue - min) / rangeSize) * 100;
      const maxPercent = ((maxValue - min) / rangeSize) * 100;
      fill.style.left = `${minPercent}%`;
      fill.style.right = `${100 - maxPercent}%`;
    }

    if (track.classList.contains("filter-range-slider--histogram")) {
      syncHistogramRange(track);
    }

    onSync?.({ minValue, maxValue, track, section });
  }

  function bindRangeTrack(track, { onChange } = {}) {
    const minRange = track.querySelector(".range-input-min");
    const maxRange = track.querySelector(".range-input-max");
    const section = track.closest(".filter-section");
    const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);
    const minInput = numberInputs[0];
    const maxInput = numberInputs[1];

    if (!minRange || !maxRange) {
      return;
    }

    const syncFromNumberInput = (numberInput, rangeInput) => {
      const rangeMin = Number(rangeInput.min);
      const rangeMax = Number(rangeInput.max);
      let value = getFilterNumberInputValue(numberInput);

      if (!Number.isFinite(value)) {
        value = Number(rangeInput.value);
      }

      value = Math.min(rangeMax, Math.max(rangeMin, value));
      rangeInput.value = String(value);
      syncRangeTrack(track, { onSync: onChange });
    };

    const bindNumberInput = (numberInput, rangeInput) => {
      if (isCurrencyNumberInput(numberInput)) {
        numberInput.addEventListener("focus", () => {
          const value = getFilterNumberInputValue(numberInput);
          numberInput.value = Number.isFinite(value) ? String(value) : "";
        });

        numberInput.addEventListener("blur", () => {
          syncFromNumberInput(numberInput, rangeInput);
          setFilterNumberInputDisplay(numberInput, getFilterNumberInputValue(numberInput));
        });

        numberInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            numberInput.blur();
          }
        });
      }

      numberInput.addEventListener("change", () => syncFromNumberInput(numberInput, rangeInput));
    };

    const previewRange = () => {
      syncRangeTrack(track);
    };

    const commitRange = () => {
      syncRangeTrack(track, { onSync: onChange });
    };

    minRange?.addEventListener("input", previewRange);
    maxRange?.addEventListener("input", previewRange);
    minRange?.addEventListener("change", commitRange);
    maxRange?.addEventListener("change", commitRange);
    if (minInput) bindNumberInput(minInput, minRange);
    if (maxInput) bindNumberInput(maxInput, maxRange);
    syncRangeTrack(track);
  }

  function syncRangeFilterControls({
    defaults,
    fill,
    max,
    maxInput,
    maxRange,
    min,
    minInput,
    minRange,
    onSync
  }) {
    [minRange, maxRange, minInput, maxInput].filter(Boolean).forEach((input) => {
      input.min = String(defaults.min);
      input.max = String(defaults.max);
    });

    if (minRange) minRange.value = String(min);
    if (maxRange) maxRange.value = String(max);
    if (minInput) {
      minInput.value = isCurrencyNumberInput(minInput)
        ? formatCurrencyInputValue(min)
        : String(min);
    }
    if (maxInput) {
      maxInput.value = isCurrencyNumberInput(maxInput)
        ? formatCurrencyInputValue(max)
        : String(max);
    }

    if (fill) {
      const rangeSize = defaults.max - defaults.min;
      const minPercent = rangeSize
        ? ((min - defaults.min) / rangeSize) * 100
        : 0;
      const maxPercent = rangeSize
        ? ((max - defaults.min) / rangeSize) * 100
        : 100;

      fill.style.left = `${minPercent}%`;
      fill.style.right = `${100 - maxPercent}%`;
    }

    const histogramTrack = minRange?.closest(".filter-range-slider--histogram");
    if (histogramTrack) {
      syncHistogramRange(histogramTrack);
    }

    onSync?.();
  }

  function setSectionRangeValues(section, min, max) {
    const track = section?.querySelector(".filter-range-slider");
    const minRange = track?.querySelector(".range-input-min");
    const maxRange = track?.querySelector(".range-input-max");
    const numberInputs = Array.from(section?.querySelectorAll(".filter-number-input") || []);

    if (!track || !minRange || !maxRange) return;

    const clamp = (value, floor, ceiling) => Math.min(ceiling, Math.max(floor, value));
    const rangeMin = Number(minRange.min);
    const rangeMax = Number(maxRange.max);
    const minValue = clamp(Number(min), rangeMin, rangeMax);
    const maxValue = clamp(Number(max), rangeMin, rangeMax);

    minRange.value = String(minValue);
    maxRange.value = String(maxValue);
    setFilterNumberInputDisplay(numberInputs[0], minValue);
    setFilterNumberInputDisplay(numberInputs[1], maxValue);
    syncRangeTrack(track);
  }

  window.WefranchFilterRange = {
    DEFAULT_HISTOGRAM_BINS,
    isCurrencyNumberInput,
    parseCurrencyInputValue,
    formatCurrencyInputValue,
    getFilterNumberInputValue,
    setFilterNumberInputDisplay,
    clampRangeValue,
    getNormalizedRange,
    buildHistogramCounts,
    syncHistogramRange,
    renderHistogram,
    syncRangeTrack,
    bindRangeTrack,
    syncRangeFilterControls,
    setSectionRangeValues
  };
})();
