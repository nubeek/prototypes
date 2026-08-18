(function () {
  const RADIUS_SLIDER_INPUT_STEP = 1;
  const RADIUS_SLIDER_ANIMATION_MS = 320;
  const LOCATION_VIEWPORT_RADIUS_MILES = 50;
  const MILES_PER_LATITUDE_DEGREE = 69;
  let radiusSliderAnimationFrame = null;

  function getCoordinateRadiusBounds(longitude, latitude, radiusMiles = LOCATION_VIEWPORT_RADIUS_MILES) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(radiusMiles)) {
      return null;
    }

    const latDelta = radiusMiles / MILES_PER_LATITUDE_DEGREE;
    const lngDelta = radiusMiles / (
      MILES_PER_LATITUDE_DEGREE * Math.cos((latitude * Math.PI) / 180)
    );

    return {
      west: longitude - lngDelta,
      east: longitude + lngDelta,
      south: latitude - latDelta,
      north: latitude + latDelta
    };
  }

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

  function easeOutCubic(progress) {
    return 1 - ((1 - progress) ** 3);
  }

  function cancelRadiusSliderAnimation() {
    if (radiusSliderAnimationFrame === null) {
      return;
    }

    cancelAnimationFrame(radiusSliderAnimationFrame);
    radiusSliderAnimationFrame = null;
  }

  function animateRadiusSliderTo({
    fromValue,
    toValue,
    syncControls,
    duration = RADIUS_SLIDER_ANIMATION_MS
  }) {
    cancelRadiusSliderAnimation();

    const startValue = Number(fromValue);
    const endValue = Number(toValue);

    if (
      !Number.isFinite(startValue)
      || !Number.isFinite(endValue)
      || startValue === endValue
      || typeof syncControls !== "function"
    ) {
      syncControls?.();
      return;
    }

    // Seed the start position immediately so the first paint never overshoots.
    // Use the rAF timestamp as t0 — performance.now() can be slightly ahead of
    // the first frame time, which produced negative progress / wiggle.
    let startedAt = null;
    syncControls({
      sliderValue: startValue
    });

    function step(now) {
      if (startedAt === null) {
        startedAt = now;
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const currentValue = startValue + ((endValue - startValue) * easeOutCubic(progress));

      syncControls({
        sliderValue: currentValue
      });

      if (progress < 1) {
        radiusSliderAnimationFrame = requestAnimationFrame(step);
        return;
      }

      radiusSliderAnimationFrame = null;
      syncControls();
    }

    radiusSliderAnimationFrame = requestAnimationFrame(step);
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

      cancelRadiusSliderAnimation();
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

      let animateFromValue = null;

      if (shouldCommit) {
        const previousValue = getSelectedMiles();
        const nextValue = clampRadiusValue(radiusValueInput.value, defaults);
        const didChange = nextValue !== previousValue;
        setSelectedMiles(nextValue);
        onValueCommit?.(nextValue, { didChange });

        if (didChange) {
          animateFromValue = previousValue;
        }
      }

      isEditing = false;
      radiusValueEdit?.setAttribute("hidden", "");

      if (animateFromValue !== null) {
        animateRadiusSliderTo({
          fromValue: animateFromValue,
          toValue: getSelectedMiles(),
          syncControls: (options = {}) => syncControls({ isEditing: false, ...options })
        });
        return;
      }

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
      cancelRadiusSliderAnimation();
      const rawValue = Number(radiusRange.value);
      const previewValue = clampRadiusValue(rawValue, defaults);
      syncControls({
        sliderValue: rawValue,
        previewMiles: previewValue
      });
    });

    radiusRange.addEventListener("change", () => {
      cancelRadiusSliderAnimation();
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
    LOCATION_VIEWPORT_RADIUS_MILES,
    MILES_PER_LATITUDE_DEGREE,
    getCoordinateRadiusBounds,
    clampRadiusValue,
    formatRadiusMiles,
    getRadiusFillPercent,
    syncRadiusControlElements,
    initRadiusValueEditor,
    initRadiusRangeSlider,
    cancelRadiusSliderAnimation,
    animateRadiusSliderTo
  };
})();
