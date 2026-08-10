(function () {
  const RADIUS_SLIDER_INPUT_STEP = 1;

  function clampRadiusValue(value, defaults) {
    const numericValue = Number(value);
    const fallback = defaults.value;
    const roundedValue = Number.isFinite(numericValue)
      ? Math.round(numericValue / defaults.step) * defaults.step
      : fallback;

    return Math.min(
      defaults.max,
      Math.max(defaults.min, roundedValue)
    );
  }

  function getRadiusFillPercent(value, defaults) {
    const rangeSize = defaults.max - defaults.min;
    return rangeSize ? ((value - defaults.min) / rangeSize) * 100 : 0;
  }

  function formatRadiusMiles(value, { roundDisplay = false } = {}) {
    const numericValue = Number(value);
    const displayValue = roundDisplay ? Math.round(numericValue) : numericValue;
    return `${displayValue} mi`;
  }

  function syncRadiusControlElements({
    defaults,
    selectedMiles,
    radiusRange,
    radiusRangeFill,
    radiusValueLabel,
    radiusValueDisplay,
    radiusValueInput,
    sliderValue,
    previewMiles,
    isEditing,
    roundDisplay = false
  }) {
    const displayMiles = previewMiles ?? selectedMiles;

    if (radiusRange) {
      radiusRange.min = String(defaults.min);
      radiusRange.max = String(defaults.max);
      radiusRange.step = String(RADIUS_SLIDER_INPUT_STEP);
      radiusRange.value = String(sliderValue ?? displayMiles);
    }

    if (radiusRangeFill) {
      const fillValue = sliderValue ?? displayMiles;
      radiusRangeFill.style.right = `${100 - getRadiusFillPercent(fillValue, defaults)}%`;
    }

    if (radiusValueLabel) {
      radiusValueLabel.classList.toggle("is-editing", Boolean(isEditing));
    }

    if (radiusValueDisplay && !isEditing) {
      radiusValueDisplay.textContent = formatRadiusMiles(displayMiles, { roundDisplay });
    }

    if (radiusValueInput && !isEditing) {
      const numericValue = Number(selectedMiles);
      radiusValueInput.value = Number.isFinite(numericValue)
        ? String(roundDisplay ? Math.round(numericValue) : numericValue)
        : "";
    }
  }

  function initRadiusValueEditor({
    defaults,
    radiusValueLabel,
    radiusValueDisplay,
    radiusValueInput,
    radiusValueEdit,
    getSelectedMiles,
    setSelectedMiles,
    syncControls,
    onValueCommit,
    roundDisplay = false
  }) {
    if (!radiusValueLabel || !radiusValueDisplay || !radiusValueInput) {
      return;
    }

    let isEditing = false;

    function startEditing() {
      if (isEditing) {
        return;
      }

      isEditing = true;
      radiusValueEdit?.removeAttribute("hidden");
      const currentValue = getSelectedMiles();
      radiusValueInput.value = String(
        roundDisplay ? Math.round(currentValue) : currentValue
      );
      syncControls({ isEditing: true });
      radiusValueInput.focus();
      radiusValueInput.select();
    }

    function stopEditing(shouldCommit) {
      if (!isEditing) {
        return;
      }

      if (shouldCommit) {
        const nextValue = clampRadiusValue(radiusValueInput.value, defaults);
        const didChange = nextValue !== getSelectedMiles();
        setSelectedMiles(nextValue);
        onValueCommit?.(nextValue, { didChange });
      }

      isEditing = false;
      radiusValueEdit?.setAttribute("hidden", "");
      syncControls({ isEditing: false });
    }

    radiusValueDisplay.addEventListener("click", (event) => {
      event.preventDefault();
      startEditing();
    });

    radiusValueDisplay.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startEditing();
      }
    });

    radiusValueInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        stopEditing(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        stopEditing(false);
      }
    });

    radiusValueInput.addEventListener("blur", () => {
      stopEditing(true);
    });
  }

  function initRadiusRangeSlider({
    defaults,
    radiusRange,
    getSelectedMiles,
    setSelectedMiles,
    syncControls,
    onValueCommit
  }) {
    if (!radiusRange) {
      return;
    }

    radiusRange.addEventListener("input", () => {
      const rawValue = Number(radiusRange.value);
      const previewValue = clampRadiusValue(rawValue, defaults);
      syncControls({
        sliderValue: rawValue,
        previewMiles: previewValue
      });
    });

    radiusRange.addEventListener("change", () => {
      const nextValue = clampRadiusValue(radiusRange.value, defaults);
      const didChange = nextValue !== getSelectedMiles();
      setSelectedMiles(nextValue);
      syncControls();

      if (didChange) {
        onValueCommit?.(nextValue, { didChange: true });
      }
    });
  }

  window.WefranchRadiusControl = {
    RADIUS_SLIDER_INPUT_STEP,
    clampRadiusValue,
    formatRadiusMiles,
    getRadiusFillPercent,
    syncRadiusControlElements,
    initRadiusValueEditor,
    initRadiusRangeSlider
  };
})();
