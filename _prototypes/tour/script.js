const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".site-nav-toggle");
const brandLockup = document.querySelector(".brand-lockup");
const dateBadge = document.querySelector(".date-badge");
const heroVideo = document.querySelector(".hero-media__video");
const playbackControl = document.querySelector(".video-playback-control");
const playbackIcon = document.querySelector(".video-playback-control__icon");
const playbackCurrentTime = document.querySelector(".video-playback-control__time-current");
const playbackTotalTime = document.querySelector(".video-playback-control__time-total");
const muteControl = document.querySelector(".video-mute-control");
const muteLabel = document.querySelector(".video-mute-control__label");
const muteIcon = document.querySelector(".video-mute-control__icon");

const syncHeaderHeight = () => {
  if (!header) {
    return;
  }

  document.documentElement.style.setProperty(
    "--site-header-height",
    `${header.offsetHeight}px`
  );
};

if (header) {
  const syncScrollState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 0);
  };

  syncHeaderHeight();
  syncScrollState();

  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("scroll", syncScrollState, { passive: true });
}

if (header && navToggle) {
  const desktopMediaQuery = window.matchMedia("(min-width: 901px)");

  const setMenuOpen = (shouldOpen) => {
    header.classList.toggle("is-menu-open", shouldOpen);
    navToggle.setAttribute("aria-expanded", String(shouldOpen));
    navToggle.setAttribute("aria-label", shouldOpen ? "Close menu" : "Open menu");

    if (!shouldOpen) {
      syncHeaderHeight();
    }
  };

  navToggle.addEventListener("click", () => {
    setMenuOpen(!header.classList.contains("is-menu-open"));
  });

  document.querySelectorAll(".site-nav span, .signup-pill").forEach((element) => {
    element.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-menu-open")) {
      setMenuOpen(false);
      navToggle.focus();
    }
  });

  desktopMediaQuery.addEventListener("change", (event) => {
    if (event.matches) {
      setMenuOpen(false);
    }
  });
}

if (brandLockup) {
  brandLockup.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

if (dateBadge) {
  dateBadge.addEventListener(
    "animationend",
    (event) => {
      if (event.animationName === "hero-intro-reveal-reverse") {
        dateBadge.classList.add("is-intro-complete");
      }
    },
    { once: true }
  );
}

const statCards = document.querySelectorAll(".hero-stats .stat-card");

if (statCards.length) {
  const statCardsMobileMediaQuery = window.matchMedia("(max-width: 1180px)");
  let areStatCardsInteractive = !statCardsMobileMediaQuery.matches;

  const setExpandedCard = (nextCard) => {
    statCards.forEach((card) => {
      const isExpanded = card === nextCard;
      card.classList.toggle("is-expanded", isExpanded);
      card.setAttribute("aria-expanded", String(isExpanded));
    });
  };

  const applyStatCardMode = () => {
    areStatCardsInteractive = !statCardsMobileMediaQuery.matches;

    if (areStatCardsInteractive) {
      const expandedCard = Array.from(statCards).find((card) => card.classList.contains("is-expanded")) ?? statCards[0];
      setExpandedCard(expandedCard);

      statCards.forEach((card) => {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
      });

      return;
    }

    statCards.forEach((card) => {
      card.classList.add("is-expanded");
      card.setAttribute("aria-expanded", "true");
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
    });
  };

  applyStatCardMode();

  statCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!areStatCardsInteractive) {
        return;
      }

      if (card.classList.contains("is-expanded")) {
        return;
      }

      setExpandedCard(card);
    });

    card.addEventListener("keydown", (event) => {
      if (!areStatCardsInteractive) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();

      if (card.classList.contains("is-expanded")) {
        return;
      }

      setExpandedCard(card);
    });
  });

  statCardsMobileMediaQuery.addEventListener("change", applyStatCardMode);
}

if (
  heroVideo &&
  playbackControl &&
  playbackIcon &&
  playbackCurrentTime &&
  playbackTotalTime &&
  muteControl &&
  muteLabel &&
  muteIcon
) {
  const COLLAPSE_DELAY_MS = 5000;
  let playbackCollapseTimeoutId = null;
  let isPlaybackControlHovered = false;

  const formatTime = (time) => {
    if (!Number.isFinite(time)) {
      return "0:00";
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const syncPlaybackState = () => {
    const isPlaying = !heroVideo.paused && !heroVideo.ended;
    const nextIconSrc = isPlaying ? "assets/pause.svg" : "assets/play.svg";

    playbackIcon.src = nextIconSrc;
    playbackControl.setAttribute("aria-label", isPlaying ? "Pause video" : "Play video");
    playbackCurrentTime.textContent = formatTime(heroVideo.currentTime);
  };

  const setPlaybackControlCollapsed = (shouldCollapse) => {
    playbackControl.classList.toggle("is-collapsed", shouldCollapse);
  };

  const setMuteControlCollapsed = (shouldCollapse) => {
    muteControl.classList.toggle("is-collapsed", shouldCollapse);
  };

  const isVideoPlaying = () => !heroVideo.paused && !heroVideo.ended;

  const clearPlaybackCollapseTimeout = () => {
    if (!playbackCollapseTimeoutId) {
      return;
    }

    window.clearTimeout(playbackCollapseTimeoutId);
    playbackCollapseTimeoutId = null;
  };

  const schedulePlaybackCollapseAfterDelay = () => {
    clearPlaybackCollapseTimeout();

    if (!isVideoPlaying() || isPlaybackControlHovered) {
      return;
    }

    playbackCollapseTimeoutId = window.setTimeout(() => {
      if (isVideoPlaying() && !isPlaybackControlHovered) {
        setPlaybackControlCollapsed(true);
      }
    }, COLLAPSE_DELAY_MS);
  };

  const syncDuration = () => {
    playbackTotalTime.textContent = formatTime(heroVideo.duration);
  };

  const syncMuteState = () => {
    const nextActionLabel = heroVideo.muted ? "Unmute" : "Mute";
    const nextIconSrc = heroVideo.muted ? "assets/volume-off.svg" : "assets/volume-on.svg";

    muteIcon.src = nextIconSrc;
    muteLabel.textContent = nextActionLabel;
    muteControl.setAttribute("aria-label", `${nextActionLabel} video`);
  };

  heroVideo.muted = true;
  heroVideo.loop = true;
  syncPlaybackState();
  setPlaybackControlCollapsed(true);
  setMuteControlCollapsed(true);
  syncDuration();
  syncMuteState();

  heroVideo.play().catch(() => {
    syncPlaybackState();
  });

  playbackControl.addEventListener("click", () => {
    if (heroVideo.paused || heroVideo.ended) {
      heroVideo.currentTime = heroVideo.ended ? 0 : heroVideo.currentTime;
      heroVideo.play().catch(() => {
        syncPlaybackState();
      });
      return;
    }

    heroVideo.pause();
  });

  muteControl.addEventListener("click", () => {
    heroVideo.muted = !heroVideo.muted;
    syncMuteState();
  });

  playbackControl.addEventListener("mouseenter", () => {
    isPlaybackControlHovered = true;
    clearPlaybackCollapseTimeout();
    setPlaybackControlCollapsed(false);
  });

  playbackControl.addEventListener("mouseleave", () => {
    isPlaybackControlHovered = false;
    schedulePlaybackCollapseAfterDelay();
  });

  muteControl.addEventListener("mouseenter", () => {
    setMuteControlCollapsed(false);
  });

  muteControl.addEventListener("mouseleave", () => {
    setMuteControlCollapsed(true);
  });

  heroVideo.addEventListener("play", () => {
    syncPlaybackState();
    setPlaybackControlCollapsed(false);
    schedulePlaybackCollapseAfterDelay();
  });
  heroVideo.addEventListener("pause", () => {
    syncPlaybackState();
    clearPlaybackCollapseTimeout();
    setPlaybackControlCollapsed(false);
    setMuteControlCollapsed(true);
  });
  heroVideo.addEventListener("ended", () => {
    syncPlaybackState();
    clearPlaybackCollapseTimeout();
    setPlaybackControlCollapsed(false);
    setMuteControlCollapsed(true);
  });
  heroVideo.addEventListener("timeupdate", () => {
    playbackCurrentTime.textContent = formatTime(heroVideo.currentTime);
  });
  heroVideo.addEventListener("loadedmetadata", syncDuration);
  heroVideo.addEventListener("durationchange", syncDuration);
  heroVideo.addEventListener("volumechange", syncMuteState);
}

const tourMapHighlights = document.querySelector(".tour-map__highlights");
const tourMapInteractive = document.querySelector(".tour-map__interactive");
const tourMapImage = document.querySelector(".tour-map__image");

const mapStops = [
  {
    id: "san-jose",
    city: "San José",
    date: "Jul 17",
    x: "2.0%",
    y: "45.0%",
    labelX: "40px",
    labelY: "40px",
    labelXMobile: "32px",
    labelYMobile: "-1px",
    state: {
      src: "assets/map/ca-sanjose.svg",
      left: "0%",
      top: "26.8889%",
      width: "15.96%",
      height: "41.7386%",
    },
  },
  {
    id: "indianapolis",
    city: "Indianapolis",
    date: "Aug 18",
    x: "70.4%",
    y: "41%",
    labelX: "40px",
    labelY: "40px",
    labelXMobile: "29px",
    labelYMobile: "20px",
    state: {
      src: "assets/map/in-indianapolis.svg",
      left: "67.096%",
      top: "33.4641%",
      width: "5.72%",
      height: "16.2353%",
    },
  },
  {
    id: "cleveland",
    city: "Cleveland",
    date: "Sep 23",
    x: "77.8%",
    y: "32%",
    labelX: "-230px",
    labelY: "-60px",
    labelXMobile: "-72px",
    labelYMobile: "-24px",
    state: {
      src: "assets/map/oh-cleveland.svg",
      left: "71.92%",
      top: "30.3137%",
      width: "7.856%",
      height: "14.4575%",
    },
  },
  {
    id: "boston",
    city: "Boston",
    date: "Oct 14",
    x: "95.8%",
    y: "22.2%",
    labelX: "-56px",
    labelY: "40px",
    labelXMobile: "-38px",
    labelYMobile: "18px",
    state: {
      src: "assets/map/ma-boston.svg",
      left: "91.504%",
      top: "19.268%",
      width: "5.552%",
      height: "4.9542%",
    },
  },
  {
    id: "new-orleans",
    city: "New Orleans",
    date: "Nov 10",
    x: "63%",
    y: "84%",
    labelX: "40px",
    labelY: "40px",
    labelXMobile: "29px",
    labelYMobile: "21px",
    state: {
      src: "assets/map/la-neworleans.svg",
      left: "56.68%",
      top: "70.4575%",
      width: "10.968%",
      height: "14.7451%",
    },
  },
];

if (tourMapHighlights && tourMapInteractive) {
  const MAP_STOP_SEQUENCE = ["san-jose", "indianapolis", "cleveland", "boston", "new-orleans"];
  const highlightByStopId = new Map();
  const stopButtonByStopId = new Map();
  const createDateWordElements = (dateText) => {
    const nonBreakingSpace = String.fromCharCode(160);
    let sequenceLetterIndex = 0;

    return dateText.split(" ").map((word, wordIndex, words) => {
      const wordElement = document.createElement("span");
      wordElement.className = "tour-map__date-word";

      [...word].forEach((letter) => {
        const letterElement = document.createElement("span");
        letterElement.className = "tour-map__date-letter";
        letterElement.textContent = letter;
        letterElement.style.setProperty("--date-letter-index", String(sequenceLetterIndex));
        sequenceLetterIndex += 1;
        wordElement.append(letterElement);
      });

      if (wordIndex < words.length - 1) {
        wordElement.append(document.createTextNode(nonBreakingSpace));
      }

      return wordElement;
    });
  };

  mapStops.forEach((stop, index) => {
    const fallbackIndex = index;
    const sequenceIndex = MAP_STOP_SEQUENCE.indexOf(stop.id);
    stop.sequenceIndex = sequenceIndex === -1 ? fallbackIndex : sequenceIndex;
  });

  mapStops.forEach((stop) => {
    const highlight = document.createElement("img");
    highlight.className = `tour-map__state-highlight tour-map__state-highlight--${stop.id}`;
    highlight.src = stop.state.src;
    highlight.alt = "";
    highlight.decoding = "async";
    highlight.style.setProperty("--state-left", stop.state.left);
    highlight.style.setProperty("--state-top", stop.state.top);
    highlight.style.setProperty("--state-width", stop.state.width);
    highlight.style.setProperty("--state-height", stop.state.height);
    highlight.style.setProperty("--stop-sequence-index", String(stop.sequenceIndex));

    highlightByStopId.set(stop.id, highlight);
    tourMapHighlights.append(highlight);
  });

  const stopButtons = mapStops.map((stop) => {
    const button = document.createElement("button");
    button.className = `tour-map__stop tour-map__stop--${stop.id}`;
    button.type = "button";
    button.setAttribute("aria-label", `${stop.city}, ${stop.date}. Toggle map highlight.`);
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--map-x", stop.x);
    button.style.setProperty("--map-y", stop.y);
    button.style.setProperty("--label-x", stop.labelX);
    button.style.setProperty("--label-y", stop.labelY);
    button.style.setProperty("--label-x-mobile", stop.labelXMobile);
    button.style.setProperty("--label-y-mobile", stop.labelYMobile);
    button.style.setProperty("--stop-sequence-index", String(stop.sequenceIndex));

    const dot = document.createElement("span");
    dot.className = "tour-map__dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "tour-map__label";
    label.setAttribute("aria-hidden", "true");

    const city = document.createElement("span");
    city.className = "tour-map__city";
    city.textContent = stop.city;

    const date = document.createElement("span");
    date.className = "tour-map__date";
    date.append(...createDateWordElements(stop.date));

    label.append(city, date);
    button.append(dot, label);
    stopButtonByStopId.set(stop.id, button);

    button.addEventListener("click", () => {
      const isActive = !button.classList.contains("is-active");
      const highlight = highlightByStopId.get(stop.id);

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      highlight?.classList.toggle("is-active", isActive);
    });

    return button;
  });

  tourMapInteractive.replaceChildren(...stopButtons);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealMapSequence = () => {
    MAP_STOP_SEQUENCE.forEach((stopId) => {
      highlightByStopId.get(stopId)?.classList.add("is-sequence-visible");
      stopButtonByStopId.get(stopId)?.classList.add("is-sequence-visible");
    });

    tourMapImage?.classList.add("is-sequence-running");
    tourMapHighlights.classList.add("is-sequence-running");
    tourMapInteractive.classList.add("is-sequence-running");
  };

  if (prefersReducedMotion) {
    revealMapSequence();
  } else if ("IntersectionObserver" in window) {
    const mapSequenceObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          revealMapSequence();
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.2,
      }
    );

    mapSequenceObserver.observe(tourMapInteractive);
  } else {
    revealMapSequence();
  }
}

const testimonialsGrid = document.querySelector(".testimonials__grid");
const testimonialsBadge = document.querySelector(".testimonials__badge");
const testimonials = window.testimonialsData || [];

const createTestimonialParagraph = (segments, className) => {
  const paragraph = document.createElement("p");
  paragraph.className = className;

  segments.forEach((segment) => {
    const textNode = document.createTextNode(segment.text);

    if (!segment.strong) {
      paragraph.append(textNode);
      return;
    }

    const strong = document.createElement("strong");
    strong.append(textNode);
    paragraph.append(strong);
  });

  return paragraph;
};

const createTestimonialAuthor = (author) => {
  const footer = document.createElement("footer");
  footer.className = "testimonial-card__author";

  if (author.initials) {
    const avatar = document.createElement("span");
    avatar.className = "testimonial-card__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = author.initials;
    footer.append(avatar);
  }

  const authorText = document.createElement("span");
  const authorName = document.createElement("strong");
  const authorTitle = document.createElement("small");

  authorName.textContent = author.name;
  authorTitle.textContent = author.title;
  authorText.append(authorName, authorTitle);
  footer.append(authorText);

  return footer;
};

const createTestimonialMedia = (media) => {
  const mediaElement = document.createElement("div");
  mediaElement.classList.add("testimonial-card__media", `testimonial-card__media--${media.type}`);
  mediaElement.setAttribute("aria-hidden", "true");

  if (media.type === "photo") {
    mediaElement.style.setProperty("--testimonial-media-image", `url("${media.src}")`);
    return mediaElement;
  }

  const video = document.createElement("video");
  video.className = "testimonial-card__media-video";
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";

  const source = document.createElement("source");
  source.src = media.src;
  source.type = "video/mp4";
  video.append(source);
  mediaElement.append(video);

  return mediaElement;
};

const createTestimonialCard = (testimonial) => {
  const card = document.createElement("article");
  const hasMedia = Boolean(testimonial.media);
  const paragraphClassName =
    testimonial.cardVariant === "post" && hasMedia ? "testimonial-card__p2" : "testimonial-card__p1";

  card.classList.add("testimonial-card", `testimonial-card--${testimonial.cardVariant}`);

  if (hasMedia) {
    card.classList.add("testimonial-card--with-media");
  }

  const contentContainer = hasMedia ? document.createElement("div") : card;

  if (hasMedia) {
    contentContainer.className = "testimonial-card__body";
  }

  const type = document.createElement("p");
  type.className = "testimonial-card__type";
  type.textContent = testimonial.type;
  contentContainer.append(type);

  testimonial.paragraphs.forEach((paragraph) => {
    contentContainer.append(createTestimonialParagraph(paragraph, paragraphClassName));
  });

  const author = createTestimonialAuthor(testimonial.author);

  if (testimonial.cardVariant === "video") {
    contentContainer.append(author);
    card.append(contentContainer, createTestimonialMedia(testimonial.media));
    return card;
  }

  if (hasMedia) {
    card.append(contentContainer, createTestimonialMedia(testimonial.media), author);
    return card;
  }

  card.append(author);
  return card;
};

if (testimonialsGrid && testimonials.length) {
  testimonialsGrid.replaceChildren(...testimonials.map(createTestimonialCard));
}

const testimonialCards = document.querySelectorAll(".testimonial-card");

if (testimonialCards.length) {
  testimonialCards.forEach((card) => {
    card.addEventListener("animationend", (event) => {
      if (event.animationName === "testimonial-card-reveal") {
        card.classList.add("is-revealed");
      }
    });
  });
}

if (testimonialsGrid) {
  const revealTestimonialsBadge = () => {
    if (!testimonialsBadge || testimonialsBadge.classList.contains("is-revealed")) {
      return;
    }

    testimonialsBadge.classList.add("is-visible");
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (testimonialsBadge) {
    testimonialsBadge.addEventListener("animationend", (event) => {
      if (event.animationName === "testimonial-badge-reveal") {
        testimonialsBadge.classList.add("is-revealed");
      }
    });
  }

  const revealTestimonials = () => {
    if (prefersReducedMotion || !testimonialCards.length) {
      testimonialsGrid.classList.add("is-visible");
      revealTestimonialsBadge();
      if (testimonialsBadge) {
        testimonialsBadge.classList.add("is-revealed");
      }
      return;
    }

    let remainingCardAnimations = 0;
    const onCardRevealComplete = (event) => {
      if (event.animationName !== "testimonial-card-reveal") {
        return;
      }

      remainingCardAnimations -= 1;
      event.currentTarget.removeEventListener("animationend", onCardRevealComplete);

      if (remainingCardAnimations <= 0) {
        revealTestimonialsBadge();
      }
    };

    testimonialCards.forEach((card) => {
      if (card.classList.contains("is-revealed")) {
        return;
      }

      remainingCardAnimations += 1;
      card.addEventListener("animationend", onCardRevealComplete);
    });

    testimonialsGrid.classList.add("is-visible");

    if (remainingCardAnimations === 0) {
      revealTestimonialsBadge();
    }
  };

  if ("IntersectionObserver" in window) {
    const testimonialsObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealTestimonials();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -15% 0px",
        threshold: 0.2,
      }
    );

    testimonialsObserver.observe(testimonialsGrid);
  } else {
    revealTestimonials();
  }
}
