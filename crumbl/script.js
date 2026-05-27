const adoptionSegments = [
  { label: "Innovators", percent: 2.5, endPosition: 17.3 },
  { label: "Early\nAdopters", percent: 13.5, endPosition: 30.3 },
  { label: "Early\nMajority", percent: 34, endPosition: 49.8 },
  { label: "Late\nMajority", percent: 34, endPosition: 68.7 },
  { label: "Laggards", percent: 16, endPosition: 100 },
];

const curveShape = {
  width: 1000,
  baseline: 360,
  linePath:
    "M 0 338 C 128 331, 224 298, 303 200 C 384 101, 437 45, 500 45 C 563 45, 616 101, 687 200 C 780 329, 872 342, 1000 338",
};

const curveState = {
  activeSegmentIndex: null,
  hoveredSegmentIndex: null,
  records: [],
  shape: curveShape,
};

const curveDataUrl = "data/crumbl.json?v=2";
const curveGranularities = {
  year: { stepMonths: 12 },
  quarter: { stepMonths: 3 },
  month: { stepMonths: 1 },
};

const openedDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatPercent = (value) => {
  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(1)}%`;
};

const parseOpenedDate = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatOpenedDate = (value) => {
  const parsedDate = parseOpenedDate(value);

  if (!parsedDate) {
    return "-";
  }

  return openedDateFormatter.format(parsedDate);
};

const toSafeUrl = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch (error) {
    return null;
  }

  return null;
};

const toGoogleMapsUrl = (addressValue) => {
  if (typeof addressValue !== "string") {
    return null;
  }

  const address = addressValue.trim();

  if (!address) {
    return null;
  }

  const query = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

const getContactIcon = (type, href, label) => {
  const iconLabel = type === "web" ? "website" : "LinkedIn";
  const iconMarkup =
    type === "web"
      ? `
        <svg class="contact-icon contact-icon--web" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M10,11.28h-4.01c.38,1.6,1.06,3.11,2,4.45.94-1.34,1.62-2.85,2-4.45ZM4.35,4.72c.35-1.67.99-3.27,1.88-4.72C3.75.58,1.69,2.33.67,4.72h3.67ZM5.6,8c0,.55.04,1.1.1,1.64h4.6c.07-.54.1-1.09.1-1.64,0-.55-.04-1.1-.1-1.64h-4.6c-.07.54-.1,1.09-.1,1.64ZM11.65,4.72h3.67c-1.02-2.39-3.08-4.13-5.56-4.72.89,1.45,1.53,3.04,1.88,4.72ZM6,4.72h4.01c-.38-1.6-1.06-3.11-2-4.45-.94,1.34-1.62,2.85-2,4.45ZM11.65,11.28c-.35,1.67-.99,3.27-1.88,4.72,2.47-.58,4.54-2.33,5.56-4.72h-3.67ZM11.91,6.36c.06.55.09,1.09.09,1.64,0,.55-.03,1.1-.09,1.64h3.93c.22-1.08.22-2.2,0-3.28h-3.93ZM4.35,11.28H.67c1.02,2.39,3.08,4.13,5.56,4.72-.89-1.45-1.53-3.04-1.88-4.72ZM4.09,9.64c-.06-.55-.09-1.09-.09-1.64,0-.55.03-1.1.09-1.64H.16c-.22,1.08-.22,2.2,0,3.28h3.93Z"></path>
        </svg>
      `
      : `
        <svg class="contact-icon contact-icon--linkedin" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
          <path fill="currentColor" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0ZM6.78,13h-1.78v-5.98h1.78v5.98ZM5.92,6.2c-.59,0-1.07-.4-1.07-.99s.48-1.08,1.07-1.08,1,.48,1,1.08-.41.99-1,.99ZM13.51,13h-1.85v-2.91c0-.69-.01-1.59-.96-1.59s-1.11.76-1.11,1.54v2.96h-1.85v-5.98h1.78v.82h.03c.25-.47.85-.97,1.76-.97,1.87,0,2.22,1.24,2.22,2.85v3.28Z"></path>
        </svg>
      `;

  if (!href) {
    return `
      <span class="contact-icon-link is-disabled" aria-label="${iconLabel} unavailable">
        ${iconMarkup}
      </span>
    `;
  }

  return `
    <a
      class="contact-icon-link"
      href="${escapeHtml(href)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open ${iconLabel} for ${escapeHtml(label)}"
    >
      ${iconMarkup}
    </a>
  `;
};

const getContactIcons = (store) => {
  const label = store.owner_name || store.storefront_name || store.street || "store";
  const websiteUrl = toSafeUrl(store.url);
  const linkedinUrl = toSafeUrl(store.owner_linkedin);

  return `
    <div class="raw-contact-icons" role="group" aria-label="Contact links for ${escapeHtml(label)}">
      ${getContactIcon("web", websiteUrl, label)}
      ${getContactIcon("linkedin", linkedinUrl, label)}
    </div>
  `;
};

const getBucketStart = (date, granularity) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  if (granularity === "year") {
    return new Date(Date.UTC(year, 0, 1));
  }

  if (granularity === "quarter") {
    return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
  }

  if (granularity === "month") {
    return new Date(Date.UTC(year, month, 1));
  }

  return new Date(Date.UTC(year, 0, 1));
};

const advanceBucket = (date, granularity) => {
  const next = new Date(date);
  const config = curveGranularities[granularity] || curveGranularities.year;

  if (config.stepMonths) {
    next.setUTCMonth(next.getUTCMonth() + config.stepMonths);
  }

  return next;
};

const getUniqueOpeningDates = (records) => {
  const datesByStore = new Map();

  records.forEach((record) => {
    if (!record.id || !record.date_opened || datesByStore.has(record.id)) {
      return;
    }

    const openedDate = parseOpenedDate(record.date_opened);

    if (openedDate) {
      datesByStore.set(record.id, openedDate);
    }
  });

  return Array.from(datesByStore.values()).sort((a, b) => a - b);
};

const buildOpeningBuckets = (dates, granularity) => {
  if (!dates.length) {
    return [];
  }

  const counts = new Map();

  dates.forEach((date) => {
    const bucket = getBucketStart(date, granularity).getTime();
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  });

  const firstBucket = getBucketStart(dates[0], granularity);
  const lastBucket = getBucketStart(dates[dates.length - 1], granularity);
  const buckets = [];

  for (
    let bucket = firstBucket;
    bucket <= lastBucket;
    bucket = advanceBucket(bucket, granularity)
  ) {
    const timestamp = bucket.getTime();
    buckets.push({
      timestamp,
      count: counts.get(timestamp) || 0,
    });
  }

  return buckets;
};

const pointsToSmoothPath = (points) => {
  if (!points.length) {
    return curveShape.linePath;
  }

  if (points.length === 1) {
    const point = points[0];
    return `M 0 ${point.y.toFixed(2)} L ${curveShape.width} ${point.y.toFixed(2)}`;
  }

  const tension = 0.18;
  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;
    const controlOne = {
      x: current.x + (next.x - previous.x) * tension,
      y: current.y + (next.y - previous.y) * tension,
    };
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) * tension,
      y: next.y - (afterNext.y - current.y) * tension,
    };

    commands.push(
      `C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)}, ${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
    );
  }

  return commands.join(" ");
};

const buildCurveFromOpenings = (records, granularity) => {
  const dates = getUniqueOpeningDates(records);
  const buckets = buildOpeningBuckets(dates, granularity);

  if (buckets.length < 2) {
    return curveShape;
  }

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count));
  const zeroLine = 338;
  const topLine = 45;
  const points = buckets.map((bucket, index) => {
    const x = (index / (buckets.length - 1)) * curveShape.width;
    const y = zeroLine - (bucket.count / maxCount) * (zeroLine - topLine);

    return { x, y };
  });

  return {
    ...curveShape,
    linePath: pointsToSmoothPath(points),
  };
};

const buildCurvePath = ({ width, baseline, linePath }) => {
  return {
    linePath,
    areaPath: `${linePath} L ${width} ${baseline} L 0 ${baseline} Z`,
  };
};

const getSegmentStartPosition = (segments, index) => {
  return index === 0 ? 0 : segments[index - 1].endPosition;
};

const getSegmentEndPercent = (segments, index) => {
  return segments
    .slice(0, index + 1)
    .reduce((total, segment) => total + segment.percent, 0);
};

const getSegmentAriaLabel = (segment) => {
  return `${segment.label.replace(/\s+/g, " ")} stores`;
};

const createSegmentControl = (segment, index, type, isActive, isHovered) => {
  const control = document.createElement("button");
  const text = document.createElement("span");

  control.type = "button";
  control.className = `curve-segment-control curve-${type}`;
  control.dataset.segmentIndex = String(index);
  control.dataset.hovered = String(isHovered);
  control.setAttribute("aria-pressed", String(isActive));
  control.setAttribute("aria-label", `Filter ${getSegmentAriaLabel(segment)}`);
  text.className = "curve-segment-control__text";
  text.textContent = type === "label" ? segment.label : formatPercent(segment.percent);
  control.append(text);
  return control;
};

const createHitAreaControl = (segment, index) => {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "curve-hit-area";
  control.dataset.segmentIndex = String(index);
  control.tabIndex = -1;
  control.setAttribute("aria-hidden", "true");
  control.setAttribute("aria-label", `Filter ${getSegmentAriaLabel(segment)}`);
  return control;
};

const createDivider = (position) => {
  const divider = document.createElement("span");
  divider.className = "curve-rule";
  divider.style.setProperty("--x", `${position}%`);
  return divider;
};

const getSegmentTriggerFromTarget = (target) => {
  if (target instanceof Element) {
    return target.closest("[data-segment-index]");
  }

  if (target instanceof Node && target.parentElement instanceof Element) {
    return target.parentElement.closest("[data-segment-index]");
  }

  return null;
};

const renderAdoptionCurve = (
  segments,
  shape = curveShape,
  activeSegmentIndex = null,
  hoveredSegmentIndex = null
) => {
  const labels = document.getElementById("curveLabels");
  const percentages = document.getElementById("curvePercentages");
  const rules = document.getElementById("curveRules");
  const hitAreas = document.getElementById("curveHitAreas");
  const area = document.getElementById("curveArea");
  const line = document.getElementById("curveLine");
  const activeArea = document.getElementById("activeCurveArea");
  const activeLine = document.getElementById("activeCurveLine");
  const activeClip = document.getElementById("activeCurveClipRect");
  const visualization = document.querySelector(".curve-visualization");

  if (
    !labels ||
    !percentages ||
    !rules ||
    !hitAreas ||
    !area ||
    !line ||
    !activeArea ||
    !activeLine ||
    !activeClip ||
    !visualization
  ) {
    return;
  }

  const boundaries = segments.map((segment) => segment.endPosition);
  const columns = boundaries
    .map((boundary, index) => `${boundary - (boundaries[index - 1] || 0)}fr`)
    .join(" ");
  const { linePath, areaPath } = buildCurvePath(shape);

  labels.replaceChildren();
  percentages.replaceChildren();
  rules.replaceChildren();
  hitAreas.replaceChildren();
  visualization.style.setProperty("--segment-columns", columns);
  const highlightSegmentIndex =
    hoveredSegmentIndex === null ? activeSegmentIndex : hoveredSegmentIndex;
  visualization.classList.toggle("curve-visualization--filtered", activeSegmentIndex !== null);
  visualization.classList.toggle(
    "curve-visualization--hovered",
    hoveredSegmentIndex !== null
  );
  area.setAttribute("d", areaPath);
  line.setAttribute("d", linePath);
  activeArea.setAttribute("d", areaPath);
  activeLine.setAttribute("d", linePath);

  segments.forEach((segment, index) => {
    const isActive = activeSegmentIndex === index;
    const isHovered = hoveredSegmentIndex === index;
    labels.append(createSegmentControl(segment, index, "label", isActive, isHovered));
    percentages.append(createSegmentControl(segment, index, "percent", isActive, isHovered));
    hitAreas.append(createHitAreaControl(segment, index));

    if (index < segments.length - 1) {
      rules.append(createDivider(boundaries[index]));
    }
  });

  if (highlightSegmentIndex === null) {
    activeClip.setAttribute("x", "0");
    activeClip.setAttribute("width", "0");
    return;
  }

  const activeSegment = segments[highlightSegmentIndex];
  const startPosition = getSegmentStartPosition(segments, highlightSegmentIndex);
  const clipX = (startPosition / 100) * shape.width;
  const clipWidth = ((activeSegment.endPosition - startPosition) / 100) * shape.width;
  activeClip.setAttribute("x", String(clipX));
  activeClip.setAttribute("width", String(clipWidth));
};

const getUniqueStores = (records) => {
  const storesById = new Map();

  records.forEach((record) => {
    if (!record || !record.id || storesById.has(record.id)) {
      return;
    }

    storesById.set(record.id, record);
  });

  return Array.from(storesById.values());
};

const getStoresWithSegments = (records, segments) => {
  const stores = getUniqueStores(records)
    .map((store) => ({
      ...store,
      openedDate: parseOpenedDate(store.date_opened),
      segmentIndex: null,
    }))
    .sort((a, b) => {
      if (!a.openedDate && !b.openedDate) {
        return String(a.street || "").localeCompare(String(b.street || ""));
      }

      if (!a.openedDate) {
        return 1;
      }

      if (!b.openedDate) {
        return -1;
      }

      return a.openedDate - b.openedDate;
    });

  const datedStores = stores.filter((store) => store.openedDate);
  const totalDatedStores = datedStores.length;

  datedStores.forEach((store, index) => {
    const cumulativePosition = ((index + 1) / totalDatedStores) * 100;
    store.segmentIndex = segments.findIndex(
      (_segment, segmentIndex) => cumulativePosition <= getSegmentEndPercent(segments, segmentIndex)
    );
  });

  return stores;
};

const renderStoresTable = (records, activeSegmentIndex = null) => {
  const tableBody = document.getElementById("storesTableBody");
  const storesSummary = document.getElementById("storesSummary");

  if (!tableBody) {
    return;
  }

  const allStores = getStoresWithSegments(records, adoptionSegments);
  const stores = allStores
    .filter((store) => {
      return activeSegmentIndex === null || store.segmentIndex === activeSegmentIndex;
    })
    .sort((a, b) => {
      const aHasOwner = Boolean(a.owner_name);
      const bHasOwner = Boolean(b.owner_name);

      if (aHasOwner !== bHasOwner) {
        return aHasOwner ? -1 : 1;
      }

      if (!a.openedDate && !b.openedDate) {
        return String(a.street || "").localeCompare(String(b.street || ""));
      }

      if (!a.openedDate) {
        return 1;
      }

      if (!b.openedDate) {
        return -1;
      }

      return a.openedDate - b.openedDate;
    });

  if (storesSummary) {
    const totalStores = allStores.length;
    const visibleStores = stores.length;
    storesSummary.textContent =
      activeSegmentIndex === null
        ? `${totalStores.toLocaleString()} stores`
        : `${visibleStores.toLocaleString()} of ${totalStores.toLocaleString()} stores`;
  }

  if (!stores.length) {
    tableBody.innerHTML = `
      <tr>
        <td class="raw-empty-cell" colspan="5">No stores found for this adoption category.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = stores
    .map((store, index) => {
      const ownerName = escapeHtml(store.owner_name || "-");
      const location = escapeHtml(store.street || "-");
      const opened = escapeHtml(formatOpenedDate(store.date_opened));
      const mapsUrl = toGoogleMapsUrl(store.street);
      const locationMarkup =
        store.street && mapsUrl
          ? `<a class="raw-location raw-location-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${location}</a>`
          : `<span class="raw-location">${location}</span>`;
      const contactMarkup = getContactIcons(store);

      return `
        <tr>
          <td class="raw-index-cell">${index + 1}</td>
          <td><span class="raw-phone">${ownerName}</span></td>
          <td>${contactMarkup}</td>
          <td><span class="raw-phone">${opened}</span></td>
          <td>${locationMarkup}</td>
        </tr>
      `;
    })
    .join("");
};

const loadCrumblData = async () => {
  const response = await fetch(curveDataUrl);

  if (!response.ok) {
    throw new Error(`Unable to load ${curveDataUrl}`);
  }

  return response.json();
};

const scrollPageToTop = () => {
  const curvePanel = document.querySelector(".curve-panel");

  if (curvePanel instanceof HTMLElement) {
    curvePanel.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

const initAdoptionCurve = async () => {
  const granularitySelect = document.getElementById("curveGranularity");
  const visualization = document.querySelector(".curve-visualization");
  const curveHeading = document.querySelector(".curve-heading");

  const renderCurrentState = () => {
    renderAdoptionCurve(
      adoptionSegments,
      curveState.shape,
      curveState.activeSegmentIndex,
      curveState.hoveredSegmentIndex
    );
    renderStoresTable(curveState.records, curveState.activeSegmentIndex);
  };

  renderAdoptionCurve(adoptionSegments);

  curveHeading?.addEventListener("click", scrollPageToTop);

  visualization?.addEventListener("click", (event) => {
    const trigger = getSegmentTriggerFromTarget(event.target);

    if (!trigger) {
      return;
    }

    const nextSegmentIndex = Number(trigger.dataset.segmentIndex);
    curveState.activeSegmentIndex =
      curveState.activeSegmentIndex === nextSegmentIndex ? null : nextSegmentIndex;
    renderCurrentState();
  });

  const applyHoveredSegment = (nextHoveredSegmentIndex) => {
    if (curveState.hoveredSegmentIndex === nextHoveredSegmentIndex) {
      return;
    }

    curveState.hoveredSegmentIndex = nextHoveredSegmentIndex;
    renderCurrentState();
  };

  visualization?.addEventListener("mouseover", (event) => {
    const trigger = getSegmentTriggerFromTarget(event.target);
    applyHoveredSegment(trigger ? Number(trigger.dataset.segmentIndex) : null);
  });

  visualization?.addEventListener("mouseout", (event) => {
    if (!(event.currentTarget instanceof Element)) {
      return;
    }

    const nextTarget = event.relatedTarget;

    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      applyHoveredSegment(null);
    }
  });

  visualization?.addEventListener("focusin", (event) => {
    const trigger = getSegmentTriggerFromTarget(event.target);
    applyHoveredSegment(trigger ? Number(trigger.dataset.segmentIndex) : null);
  });

  visualization?.addEventListener("focusout", (event) => {
    if (!(event.currentTarget instanceof Element)) {
      return;
    }

    const nextTarget = event.relatedTarget;

    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      applyHoveredSegment(null);
    }
  });

  try {
    const records = await loadCrumblData();
    curveState.records = records;

    const renderForGranularity = () => {
      const granularity = granularitySelect?.value || "year";
      const shape = buildCurveFromOpenings(records, granularity);
      curveState.shape = shape;
      renderCurrentState();
    };

    granularitySelect?.addEventListener("change", renderForGranularity);
    renderForGranularity();
  } catch (error) {
    console.warn(error);
  }
};

initAdoptionCurve();
