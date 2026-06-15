(() => {
  const CST_SOURCE = "cst/index.html?presentation=one-pager&v=target-modal-step";
  const TARGET_SLUG = "co-tn-az-top-fitness-mumbos";
  const TARGETS_LIST_SOURCE = "targets/index.html?presentation=one-pager&v=targets-list-step";
  const TARGETS_DETAIL_SOURCE = `targets/list.html?target=${TARGET_SLUG}&presentation=one-pager&v=targets-detail-step`;
  const CST_VIEW_SETTINGS_KEY = "cst.viewSettings.v1";
  const ACCESS_STORAGE_KEY = "wefranch:prototype-access";
  const PRESENTATION_LOADING_FADE_MS = 320;
  const STEP_COPY_SWITCH_MS = 240;
  const STAGE_SWAP_FADE_MS = 700;
  const STAGE_UI_SWAP_FADE_MS = 260;
  const CST_MAP_OPEN_DELAY_MS = 1200;
  const CST_ROWS_SCROLL_DELAY_MS = 200;
  const CST_ROWS_SCROLL_DURATION_MS = 60000;
  const CST_MAP_TOUR_DURATION_MS = 12000;
  const AUTO_STEP_DURATION_MS = 15000;
  const TARGET_MODAL_OPEN_DELAY_MS = 400;
  const CST_STEP_FADE_OUT_DELAY_MS = 12400;
  const TARGET_DETAIL_OPEN_DELAY_MS = 2000;
  const TARGET_OPEN_CARD_ANIMATION_MS = 1300;
  const TARGET_DETAIL_INTRO_SETTLE_MS = 1400;
  const TARGETS_STEP_INDEX = 3;
  const OWNER_STORY_STEP_INDEX = 4;
  const REQUEST_DEMO_STEP_INDEX = 5;
  const REQUEST_DEMO_ENTRANCE_DELAY_MS = 400;
  const TARGET_TITLE = "CO, TN & AZ Top Fitness MUMBOs";
  const TARGET_DESCRIPTION = "Prospective fitness franchise owners with strong multi-unit potential across Colorado, Tennessee, and Arizona";
  const TARGET_MARKET_CITIES = [
    "Denver, Colorado",
    "Nashville, Tennessee",
    "Phoenix, Arizona"
  ];

  /**
   * Each step provides the header copy plus an idempotent `apply` function
   * that drives the embedded CST window into the state for that step. The
   * CST prototype exposes its controls as globals on the iframe window, so
   * steps can call them directly and reuse the CST's own transitions.
   */
  const STEPS = [
    {
      title: "How Wefranch solved the problem",
      description: "All <strong>200,000 Contacts</strong> are structured into a single <strong>Owners table</strong> \u2014 every owner with their contacts, units and franchises in one place.",
      apply() {
        clearTargetStepAnimation();
        ensureCstFrame((cst) => {
          if (!hasRunInitialCstIntro) return;
          revealStage();
          revealCstPresentation(cst);
          cst.closeCreateTargetModal?.();
          cst.resetOnePagerMarketFilterStory?.();
        });
      }
    },
    {
      title: "Find MUMBOs in any major market",
      description: "Search for potential franchisees by brand, location, background, and exclude specific brands or categories.",
      apply() {
        clearInitialCstIntroTimers();
        clearTargetStepAnimation();
        ensureCstFrame((cst) => {
          revealStage();
          revealCstPresentation(cst);
          cst.closeCreateTargetModal?.();
          cst.runOnePagerMarketFilterStory?.();
        });
      }
    },
    {
      title: "Turn searches into targets",
      description: "Save any search as a target so your team can revisit it and work through the right contacts anytime.",
      apply() {
        clearInitialCstIntroTimers();
        ensureCstFrame((cst) => {
          revealStage();
          revealCstPresentation(cst);
          keepCstMarketFilterState(cst);
          openAndFillCreateTargetModal(cst);
          queueTargetStepTimeout(hideStage, CST_STEP_FADE_OUT_DELAY_MS);
        });
      }
    },
    {
      title: "Browse public and saved targets",
      description: "Revisit targets created by you or your team, or explore publicly available targets created by Wefranch or other franchisors.",
      apply() {
        runTargetsPresentationStep();
      }
    },
    {
      title: "Explore individual MUMBOs",
      description: "View each owner's org chart to find the right people to contact when the primary decision-maker doesn't respond.",

      apply() {
        runOwnerStoryStep();
      }
    },
    {
      title: "Get in touch",
      description: "Pricing starts at <a href=\"https://wefranch.com/pricing\" target=\"_blank\" rel=\"noopener noreferrer\"><strong>$750/month</strong></a>, billed annually.<br><br>For access, onboarding, or questions, contact us directly at <a href=\"mailto:gregory.ugwi@wefranch.com\"><strong>gregory.ugwi@wefranch.com</strong></a> or <a href=\"mailto:mariyam@wefranch.com\"><strong>mariyam@wefranch.com</strong></a>",
      apply() {
        runRequestDemoStep();
      }
    }
  ];

  const presentation = document.querySelector(".presentation");
  const stage = document.getElementById("stage");
  const stageFrame = document.getElementById("stageFrame");
  const cstFrame = document.getElementById("cstFrame");
  const stepTitle = document.getElementById("stepTitle");
  const stepDescription = document.getElementById("stepDescription");
  const prevStepBtn = document.getElementById("prevStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const replayPresentationBtn = document.getElementById("replayPresentationBtn");
  const stagePauseBtn = document.getElementById("stagePauseBtn");
  const pauseBtnLabelWrap = stagePauseBtn.querySelector(".pause-btn__label-wrap");
  const pauseBtnLabelPause = stagePauseBtn.querySelector(".pause-btn__label-pause");
  const pauseBtnLabelPlay = stagePauseBtn.querySelector(".pause-btn__label-play");
  const stepCopy = document.getElementById("stepCopy");
  const presentationLoading = document.getElementById("presentationLoading");

  let cstWindow = null;
  let activeFrameSource = "";
  let currentStepIndex = 0;
  let copySwitchTimeout = null;
  let requestDemoEntranceTimeout = null;
  let hasRunInitialCstIntro = false;
  let stepTimerFrame = null;
  let stepTimerStartedAt = null;
  let pausedStepProgress = 0;
  let pauseBtnLabelWidths = null;
  let isPresentationPaused = false;
  const presentationTimeouts = new Set();
  const TIMER_GROUP_INITIAL_CST_INTRO = "initial-cst-intro";
  const TIMER_GROUP_TARGET_STEP = "target-step";

  function showPresentationLoading() {
    if (!presentationLoading) return;
    presentationLoading.hidden = false;
    presentationLoading.classList.remove("is-hiding");
    presentationLoading.setAttribute("aria-busy", "true");
    document.body.classList.add("is-presentation-loading");
  }

  function hidePresentationLoading(onHidden) {
    if (!presentationLoading) {
      onHidden?.();
      return;
    }

    presentationLoading.classList.add("is-hiding");
    presentationLoading.setAttribute("aria-busy", "false");

    window.setTimeout(() => {
      presentationLoading.hidden = true;
      presentationLoading.classList.remove("is-hiding");
      document.body.classList.remove("is-presentation-loading");
      onHidden?.();
    }, PRESENTATION_LOADING_FADE_MS);
  }

  function preloadInitialSteps(cst) {
    return Promise.all([
      new Promise((resolve) => {
        if (typeof cst.prepareOnePagerInitialSteps === "function") {
          cst.prepareOnePagerInitialSteps(resolve);
          return;
        }
        resolve();
      }),
      document.fonts?.ready ?? Promise.resolve()
    ]);
  }

  function revealStage() {
    stage.classList.remove("is-frame-slid-down");
    stage.classList.add("is-revealed");
  }

  function hideStage() {
    clearStagePauseState();
    stage.classList.remove("is-frame-slid-down");
    stage.classList.remove("is-revealed");
  }

  function slideDownStageFrame() {
    clearStagePauseState();
    revealStage();
    stage.classList.add("is-frame-slid-down");
  }

  function loadFrame(source, onLoad) {
    const frameDocument = cstFrame.contentWindow?.document;
    const isCurrentFrameReady =
      activeFrameSource === source &&
      frameDocument &&
      frameDocument.readyState !== "loading";

    if (isCurrentFrameReady) {
      onLoad(cstFrame.contentWindow);
      return;
    }

    cstFrame.addEventListener("load", () => {
      activeFrameSource = source;
      onLoad(cstFrame.contentWindow);
    }, { once: true });
    cstFrame.src = source;
  }

  function attachFrameKeydown(frameWindow) {
    frameWindow.document.addEventListener("keydown", handleStepKeydown);
  }

  function syncFramePauseState(frameWindow = cstFrame.contentWindow) {
    frameWindow?.setOnePagerPresentationPaused?.(isPresentationPaused);
  }

  function ensureCstFrame(onReady) {
    const finish = (frameWindow) => {
      cstWindow = frameWindow;
      attachFrameKeydown(frameWindow);
      syncFramePauseState(frameWindow);
      onReady(frameWindow);
    };

    clearSavedCstViewSettings();
    loadFrame(CST_SOURCE, finish);
  }

  function loadTargetsFrame(source, onReady) {
    cstWindow = null;
    loadFrame(source, (frameWindow) => {
      attachFrameKeydown(frameWindow);
      syncFramePauseState(frameWindow);
      onReady(frameWindow);
    });
  }

  function isCstPanelOpen(cst, mode = null) {
    const card = cst.document.querySelector(".card");
    if (!card?.classList.contains("is-map-open")) return false;
    return mode === null || cst.getCurrentPanelMode() === mode;
  }

  function revealCstPresentation(cst) {
    if (typeof cst.revealOnePagerPresentation === "function") {
      cst.revealOnePagerPresentation();
      return;
    }
    cst.document.documentElement.classList.add("is-one-pager-cst-revealed");
  }

  function openCstMap(cst) {
    if (!isCstPanelOpen(cst, "map")) {
      cst.handleToolbarTabClick("map");
    }
  }

  function scrollCstRowsToBottom(cst) {
    cst.scrollOnePagerRowsToBottom?.({ durationMs: CST_ROWS_SCROLL_DURATION_MS });
  }

  function startCstMapTour(cst) {
    cst.runOnePagerMapCoastToCoastTour?.({
      durationMs: CST_MAP_TOUR_DURATION_MS,
      startDelayMs: 0,
      holdMs: 0
    });
  }

  function setCstFieldValue(field, value) {
    if (!field || !("value" in field)) return;

    field.value = value;
    const FieldEvent = field.ownerDocument.defaultView?.Event || Event;
    field.dispatchEvent(new FieldEvent("input", { bubbles: true }));
    field.dispatchEvent(new FieldEvent("change", { bubbles: true }));
  }

  function schedulePresentationTimeout(timer) {
    timer.startedAt = performance.now();
    timer.timeoutId = window.setTimeout(() => {
      presentationTimeouts.delete(timer);
      timer.timeoutId = null;
      timer.callback();
    }, Math.max(0, timer.remainingMs));
  }

  function queuePresentationTimeout(callback, delayMs, group) {
    const timer = {
      callback,
      group,
      remainingMs: delayMs,
      startedAt: null,
      timeoutId: null
    };

    presentationTimeouts.add(timer);
    if (!isPresentationPaused) {
      schedulePresentationTimeout(timer);
    }
    return timer;
  }

  function queueTargetStepTimeout(callback, delayMs) {
    return queuePresentationTimeout(callback, delayMs, TIMER_GROUP_TARGET_STEP);
  }

  function queueInitialCstIntroTimeout(callback, delayMs) {
    return queuePresentationTimeout(callback, delayMs, TIMER_GROUP_INITIAL_CST_INTRO);
  }

  function clearPresentationTimeouts(group) {
    Array.from(presentationTimeouts).forEach((timer) => {
      if (timer.group !== group) return;
      window.clearTimeout(timer.timeoutId);
      presentationTimeouts.delete(timer);
    });
  }

  function pausePresentationTimeouts() {
    const now = performance.now();
    presentationTimeouts.forEach((timer) => {
      if (timer.timeoutId === null) return;
      window.clearTimeout(timer.timeoutId);
      timer.timeoutId = null;
      timer.remainingMs = Math.max(0, timer.remainingMs - (now - timer.startedAt));
    });
  }

  function resumePresentationTimeouts() {
    presentationTimeouts.forEach((timer) => {
      if (timer.timeoutId !== null) return;
      schedulePresentationTimeout(timer);
    });
  }

  function clearTargetStepAnimation() {
    clearPresentationTimeouts(TIMER_GROUP_TARGET_STEP);
    cstFrame.classList.remove("is-ui-hidden");
    stage.classList.remove("is-frame-slid-down");
  }

  function swapTargetsUi(source, onReady) {
    cstFrame.classList.add("is-ui-hidden");
    queueTargetStepTimeout(() => {
      loadTargetsFrame(source, (frameWindow) => {
        onReady(frameWindow);
        // Let the browser paint the loaded frame before fading it in.
        window.requestAnimationFrame(() => {
          cstFrame.classList.remove("is-ui-hidden");
        });
      });
    }, STAGE_UI_SWAP_FADE_MS);
  }

  function typeCstFieldValue(field, value, {
    startDelayMs = 0,
    charDelayMs = 16,
    onComplete = null
  } = {}) {
    setCstFieldValue(field, "");

    Array.from(value).forEach((_, index) => {
      queueTargetStepTimeout(() => {
        setCstFieldValue(field, value.slice(0, index + 1));
      }, startDelayMs + (index * charDelayMs));
    });

    if (typeof onComplete === "function") {
      queueTargetStepTimeout(onComplete, startDelayMs + (Math.max(value.length, 1) * charDelayMs));
    }
  }

  function keepCstMarketFilterState(cst) {
    cst.cancelOnePagerMarketFilterStory?.();
    cst.cancelOnePagerMapTour?.();
    cst.setPanelLayout?.("full");
    cst.setFilterPanelOpen?.(true);
    cst.expandLocationFilterSection?.();
    cst.setRadiusFilterEnabled?.(true, { refresh: false });
    cst.setRadiusValue?.(250, { refresh: true });
    cst.setOnePagerLocationFilterCities?.(TARGET_MARKET_CITIES);
    cst.resizeOwnersMap?.();
    cst.fitOwnersMapToVisibleLocations?.({ durationMs: 0 });
  }

  function openAndFillCreateTargetModal(cst) {
    clearTargetStepAnimation();
    queueTargetStepTimeout(() => {
      cst.openCreateTargetModal?.();
    }, TARGET_MODAL_OPEN_DELAY_MS);

    const titleInput = cst.document.getElementById("createTargetTitle");
    const descriptionInput = cst.document.getElementById("createTargetDescription");
    typeCstFieldValue(titleInput, TARGET_TITLE, {
      startDelayMs: TARGET_MODAL_OPEN_DELAY_MS + 520,
      charDelayMs: 70,
      onComplete: () => {
        titleInput?.blur();
        descriptionInput?.focus();
      }
    });
    typeCstFieldValue(descriptionInput, TARGET_DESCRIPTION, {
      startDelayMs: TARGET_MODAL_OPEN_DELAY_MS + 3200,
      charDelayMs: 48,
      onComplete: () => {
        descriptionInput?.blur();
      }
    });
  }

  function clearInitialCstIntroTimers() {
    clearPresentationTimeouts(TIMER_GROUP_INITIAL_CST_INTRO);
  }

  function runTargetsPresentationStep() {
    clearInitialCstIntroTimers();
    clearTargetStepAnimation();
    cstFrame.contentWindow?.cancelOnePagerOwnerStory?.();

    const loadListing = () => {
      loadTargetsFrame(TARGETS_LIST_SOURCE, (targetWindow) => {
        if (currentStepIndex !== TARGETS_STEP_INDEX) return;
        targetWindow.runOnePagerTargetsListingIntro?.();
        revealStage();

        queueTargetStepTimeout(() => {
          if (currentStepIndex !== TARGETS_STEP_INDEX) return;
          targetWindow.runOnePagerTargetsOpenAnimation?.(TARGET_SLUG);

          queueTargetStepTimeout(() => {
            swapTargetsUi(TARGETS_DETAIL_SOURCE, (detailWindow) => {
              if (currentStepIndex !== TARGETS_STEP_INDEX) return;
              detailWindow.runOnePagerTargetDetailIntro?.();
            });
          }, TARGET_OPEN_CARD_ANIMATION_MS);
        }, TARGET_DETAIL_OPEN_DELAY_MS);
      });
    };

    if (stage.classList.contains("is-revealed")) {
      hideStage();
      queueTargetStepTimeout(loadListing, STAGE_SWAP_FADE_MS);
      return;
    }

    loadListing();
  }

  function runOwnerStoryStep() {
    clearInitialCstIntroTimers();
    clearTargetStepAnimation();

    const runStory = (detailWindow) => {
      if (currentStepIndex !== OWNER_STORY_STEP_INDEX) return;
      revealStage();
      detailWindow.runOnePagerOwnerStory?.();
    };

    const detailFrameWindow = cstFrame.contentWindow;
    const isDetailFrameReady =
      activeFrameSource === TARGETS_DETAIL_SOURCE &&
      typeof detailFrameWindow?.runOnePagerOwnerStory === "function";

    if (isDetailFrameReady) {
      runStory(detailFrameWindow);
      return;
    }

    // Step entered without coming through step 4 (e.g. back/forward); build the
    // detail view first, let its intro settle, then run the owner story.
    const loadDetail = () => {
      loadTargetsFrame(TARGETS_DETAIL_SOURCE, (detailWindow) => {
        if (currentStepIndex !== OWNER_STORY_STEP_INDEX) return;
        detailWindow.runOnePagerTargetDetailIntro?.();
        revealStage();
        queueTargetStepTimeout(() => runStory(detailWindow), TARGET_DETAIL_INTRO_SETTLE_MS);
      });
    };

    if (stage.classList.contains("is-revealed")) {
      hideStage();
      queueTargetStepTimeout(loadDetail, STAGE_SWAP_FADE_MS);
      return;
    }

    loadDetail();
  }

  function runRequestDemoStep() {
    clearInitialCstIntroTimers();
    clearTargetStepAnimation();
    cstFrame.contentWindow?.cancelOnePagerOwnerStory?.();

    const detailFrameWindow = cstFrame.contentWindow;
    const isDetailFrameReady = activeFrameSource === TARGETS_DETAIL_SOURCE && Boolean(detailFrameWindow?.document);

    if (isDetailFrameReady) {
      slideDownStageFrame();
      return;
    }

    const loadDetail = () => {
      loadTargetsFrame(TARGETS_DETAIL_SOURCE, (detailWindow) => {
        if (currentStepIndex !== REQUEST_DEMO_STEP_INDEX) return;
        detailWindow.runOnePagerTargetDetailIntro?.();
        slideDownStageFrame();
      });
    };

    if (stage.classList.contains("is-revealed")) {
      hideStage();
      queueTargetStepTimeout(loadDetail, STAGE_SWAP_FADE_MS);
      return;
    }

    loadDetail();
  }

  function applyStep(step) {
    try {
      step.apply();
    } catch (error) {
      console.warn("Unable to apply presentation step.", error);
    }
  }

  function renderStepCopy(step, { animate = true } = {}) {
    const swapCopy = () => {
      stepTitle.textContent = step.title;
      stepDescription.innerHTML = step.description;
    };

    window.clearTimeout(copySwitchTimeout);

    if (!animate) {
      stepTitle.classList.remove("is-switching");
      stepDescription.classList.remove("is-switching");
      swapCopy();
      return;
    }

    stepTitle.classList.add("is-switching");
    stepDescription.classList.add("is-switching");
    copySwitchTimeout = window.setTimeout(() => {
      swapCopy();
      stepTitle.classList.remove("is-switching");
      stepDescription.classList.remove("is-switching");
    }, STEP_COPY_SWITCH_MS);
  }

  function syncArrowState() {
    prevStepBtn.disabled = currentStepIndex <= 0;
    nextStepBtn.disabled = currentStepIndex >= STEPS.length - 1;
  }

  function syncStepLayoutState() {
    const isRequestDemoStep = currentStepIndex === REQUEST_DEMO_STEP_INDEX;
    presentation.classList.toggle("is-request-demo-step", isRequestDemoStep);
    document.body.classList.toggle("is-request-demo-step-active", isRequestDemoStep);
    stepCopy.classList.remove("is-request-demo-entering");
    window.clearTimeout(requestDemoEntranceTimeout);

    if (!isRequestDemoStep) return;

    requestDemoEntranceTimeout = window.setTimeout(() => {
      if (currentStepIndex !== REQUEST_DEMO_STEP_INDEX) return;
      stepCopy.classList.remove("is-request-demo-entering");
      void stepCopy.offsetWidth;
      stepCopy.classList.add("is-request-demo-entering");
    }, REQUEST_DEMO_ENTRANCE_DELAY_MS);
  }

  function canPauseStage() {
    return stage.classList.contains("is-revealed") &&
      !stage.classList.contains("is-frame-slid-down") &&
      currentStepIndex < STEPS.length - 1;
  }

  function getStepTimerProgress(now = performance.now()) {
    if (stepTimerStartedAt === null) return pausedStepProgress;
    return Math.min((now - stepTimerStartedAt) / AUTO_STEP_DURATION_MS, 1);
  }

  function measurePauseButtonLabelWidths() {
    pauseBtnLabelWidths = {
      pause: pauseBtnLabelPause.scrollWidth,
      play: pauseBtnLabelPlay.scrollWidth,
    };
  }

  function syncPauseButtonUI() {
    const isPaused = stagePauseBtn.classList.contains("is-paused");
    stagePauseBtn.setAttribute("aria-label", isPaused ? "Play presentation" : "Pause presentation");

    if (!pauseBtnLabelWidths) measurePauseButtonLabelWidths();
    pauseBtnLabelWrap.style.width = `${isPaused ? pauseBtnLabelWidths.play : pauseBtnLabelWidths.pause}px`;
  }

  function initPauseButtonSizing() {
    measurePauseButtonLabelWidths();
    syncPauseButtonUI();
  }

  function clearStagePauseState() {
    stagePauseBtn.classList.remove("is-paused");
    syncPauseButtonUI();
    pausedStepProgress = 0;
  }

  function pausePresentation() {
    if (!canPauseStage() || stagePauseBtn.classList.contains("is-paused")) return;

    isPresentationPaused = true;
    pausedStepProgress = getStepTimerProgress();
    window.cancelAnimationFrame(stepTimerFrame);
    stepTimerFrame = null;
    stepTimerStartedAt = null;
    pausePresentationTimeouts();
    syncFramePauseState();
    stagePauseBtn.classList.add("is-paused");
    syncPauseButtonUI();
    setNextStepProgress(pausedStepProgress);
  }

  function resumePresentation() {
    if (!stagePauseBtn.classList.contains("is-paused")) return;

    isPresentationPaused = false;
    stagePauseBtn.classList.remove("is-paused");
    syncPauseButtonUI();
    syncFramePauseState();
    resumePresentationTimeouts();
    startStepTimer({ resumeFromProgress: pausedStepProgress });
  }

  function toggleStagePause() {
    if (stagePauseBtn.classList.contains("is-paused")) resumePresentation();
    else pausePresentation();
  }

  function setNextStepProgress(progress) {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    nextStepBtn.style.setProperty("--step-progress", `${clampedProgress * 100}%`);
  }

  function stopStepTimer({ resetProgress = true } = {}) {
    window.cancelAnimationFrame(stepTimerFrame);
    stepTimerFrame = null;
    stepTimerStartedAt = null;
    nextStepBtn.classList.remove("is-timing");
    if (resetProgress) setNextStepProgress(0);
  }

  function startStepTimer({ resumeFromProgress = 0 } = {}) {
    window.cancelAnimationFrame(stepTimerFrame);
    stepTimerFrame = null;
    stepTimerStartedAt = null;
    nextStepBtn.classList.remove("is-timing");

    if (currentStepIndex >= STEPS.length - 1) {
      if (resumeFromProgress === 0) setNextStepProgress(0);
      return;
    }

    stepTimerStartedAt = performance.now() - resumeFromProgress * AUTO_STEP_DURATION_MS;
    pausedStepProgress = resumeFromProgress;
    nextStepBtn.classList.add("is-timing");
    setNextStepProgress(resumeFromProgress);

    const tick = (now) => {
      const progress = getStepTimerProgress(now);
      setNextStepProgress(progress);

      if (progress >= 1) {
        stopStepTimer();
        stepForward();
        return;
      }

      stepTimerFrame = window.requestAnimationFrame(tick);
    };

    stepTimerFrame = window.requestAnimationFrame(tick);
  }

  function goToStep(stepIndex, { animateCopy = true } = {}) {
    const nextIndex = Math.min(Math.max(stepIndex, 0), STEPS.length - 1);
    const step = STEPS[nextIndex];
    const isInitialRender = !animateCopy;
    if (nextIndex === currentStepIndex && !isInitialRender) return;

    currentStepIndex = nextIndex;
    if (stagePauseBtn.classList.contains("is-paused")) {
      stagePauseBtn.classList.remove("is-paused");
      syncPauseButtonUI();
    }
    if (isPresentationPaused) {
      isPresentationPaused = false;
      syncFramePauseState();
      resumePresentationTimeouts();
    }
    pausedStepProgress = 0;
    renderStepCopy(step, { animate: animateCopy });
    applyStep(step);
    syncArrowState();
    syncStepLayoutState();
    startStepTimer();
  }

  function runInitialCstIntro() {
    if (!cstWindow || hasRunInitialCstIntro) return;
    hasRunInitialCstIntro = true;
    clearInitialCstIntroTimers();

    window.requestAnimationFrame(() => {
      revealCstPresentation(cstWindow);
      cstWindow.setPanelLayout?.("split");
      revealStage();
      startCstMapTour(cstWindow);

      queueInitialCstIntroTimeout(() => {
        openCstMap(cstWindow);
      }, CST_MAP_OPEN_DELAY_MS);
      queueInitialCstIntroTimeout(() => {
        scrollCstRowsToBottom(cstWindow);
      }, CST_ROWS_SCROLL_DELAY_MS);
    });
  }

  function stepForward() {
    goToStep(currentStepIndex + 1);
  }

  function stepBackward() {
    goToStep(currentStepIndex - 1);
  }

  function replayPresentation() {
    stopStepTimer();
    stagePauseBtn.classList.remove("is-paused");
    syncPauseButtonUI();
    pausedStepProgress = 0;
    clearInitialCstIntroTimers();
    clearTargetStepAnimation();
    setNextStepProgress(0);
    hasRunInitialCstIntro = false;
    cstWindow = null;
    activeFrameSource = "";
    cstFrame.removeAttribute("src");
    currentStepIndex = 0;
    renderStepCopy(STEPS[0], { animate: false });
    syncArrowState();
    syncStepLayoutState();
    loadCstFrame();
  }

  function handleStepKeydown(event) {
    if (event.defaultPrevented) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepForward();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepBackward();
    }
  }

  function clearSavedCstViewSettings() {
    try {
      window.localStorage?.removeItem(CST_VIEW_SETTINGS_KEY);
    } catch (error) {
      // The presentation still works; the CST may just restore saved state.
    }
  }

  function loadCstFrame() {
    showPresentationLoading();

    // Start from the CST's default state instead of whatever view settings a
    // previous standalone session persisted.
    ensureCstFrame((cst) => {
      preloadInitialSteps(cst).then(() => {
        hidePresentationLoading(() => {
          goToStep(0, { animateCopy: false });
          runInitialCstIntro();
        });
      });
    });
  }

  function startWhenUnlocked() {
    let granted = null;
    try {
      granted = window.sessionStorage?.getItem(ACCESS_STORAGE_KEY);
    } catch (error) {
      granted = "granted";
    }

    if (granted === "granted" || !document.body.classList.contains("access-locked")) {
      loadCstFrame();
      return;
    }

    // Wait for gate.js to unlock the page before loading the embedded CST so
    // the iframe (which shares the session) skips its own password gate.
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("access-granted")) {
        observer.disconnect();
        loadCstFrame();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  prevStepBtn.addEventListener("click", stepBackward);
  nextStepBtn.addEventListener("click", stepForward);
  replayPresentationBtn.addEventListener("click", replayPresentation);
  stagePauseBtn.addEventListener("click", toggleStagePause);
  document.addEventListener("keydown", handleStepKeydown);

  // Don't leak presentation-driven view settings into the standalone CST.
  window.addEventListener("pagehide", clearSavedCstViewSettings);
  window.addEventListener("pagehide", stopStepTimer);
  window.addEventListener("pagehide", clearTargetStepAnimation);

  showPresentationLoading();
  renderStepCopy(STEPS[0], { animate: false });
  syncArrowState();
  syncStepLayoutState();
  setNextStepProgress(0);
  if (document.fonts?.ready) {
    document.fonts.ready.then(initPauseButtonSizing);
  } else {
    initPauseButtonSizing();
  }
  window.addEventListener("resize", () => {
    measurePauseButtonLabelWidths();
    syncPauseButtonUI();
  });
  startWhenUnlocked();
})();
