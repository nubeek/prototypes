const adoptionSegments = [
  { label: "Innovators", percent: 2.5, endPosition: 17.3 },
  { label: "Early\nAdopters", percent: 13.5, endPosition: 30.3 },
  { label: "Early\nMajority", percent: 34, endPosition: 49.8 },
  { label: "Late\nMajority", percent: 34, endPosition: 68.7 },
  { label: "Laggards", percent: 16, endPosition: 100 },
];
const chasmSegmentIndex = 1;

const curveShape = {
  width: 1000,
  baseline: 360,
  linePath:
    "M 0 338 C 128 331, 224 298, 303 200 C 384 101, 437 45, 500 45 C 563 45, 616 101, 687 200 C 780 329, 872 342, 1000 338",
};

const curveState = {
  activeSegmentIndex: null,
  hoveredSegmentIndex: null,
  dataset: null,
  shape: curveShape,
};

const curveDataUrl = "data/crumbl.json?v=10";
const segmentThumbnailHardCap = 220;
const segmentFillStaggerMs = 320;
const curveRevealDurationMs = 1200;
const lockedStoresVisibleCount = 5;
const lockedStoresMaxRows = 15;

const formatPercent = (value) => {
  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(1)}%`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

const getAvatarImageUrl = (item) =>
  toSafeUrl(
    item.imageUrl ||
      item.owner_thumbnail ||
      item.profile_picture ||
      item.owner_profile_picture ||
      item.owner_image_url ||
      item.owner_image ||
      item.thumbnail_url ||
      item.photo_url ||
      item.image_url ||
      item.image
  );

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

const sanitizePositiveInteger = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
};

const sanitizeCurveBucket = (bucket, index) => {
  if (!bucket || typeof bucket !== "object") {
    return null;
  }

  return {
    timestamp: Number.isFinite(bucket.timestamp) ? bucket.timestamp : index,
    count: sanitizePositiveInteger(bucket.count),
  };
};

const sanitizeThumbnail = (thumbnail) => {
  if (!thumbnail || typeof thumbnail !== "object") {
    return null;
  }

  const imageUrl = toSafeUrl(thumbnail.imageUrl);

  if (!imageUrl) {
    return null;
  }

  return { imageUrl };
};

const sanitizeStoreRow = (row) => {
  if (!row || typeof row !== "object") {
    return null;
  }

  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "-";
  const address =
    typeof row.address === "string" && row.address.trim() ? row.address.trim() : null;
  const openedLabel =
    typeof row.openedLabel === "string" && row.openedLabel.trim()
      ? row.openedLabel.trim()
      : "-";

  return {
    name,
    address,
    openedLabel,
    openedTimestamp: Number.isFinite(row.openedTimestamp) ? row.openedTimestamp : null,
    imageUrl: toSafeUrl(row.imageUrl),
    websiteUrl: toSafeUrl(row.websiteUrl),
    linkedinUrl: toSafeUrl(row.linkedinUrl),
    hasEmail: Boolean(row.hasEmail),
  };
};

const createEmptySegmentDataset = () => ({
  storeCount: 0,
  hiddenThumbnailCount: 0,
  yearRange: null,
  thumbnails: [],
  rows: [],
});

const sanitizeYearRange = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const startYear = Number.isInteger(value.startYear) ? value.startYear : null;
  const endYear = Number.isInteger(value.endYear) ? value.endYear : null;

  if (startYear === null || endYear === null) {
    return null;
  }

  return { startYear, endYear };
};

const formatSegmentYearRange = (yearRange, fallbackPercent) => {
  if (!yearRange) {
    return formatPercent(fallbackPercent);
  }

  if (yearRange.startYear === yearRange.endYear) {
    return String(yearRange.startYear);
  }

  return `${yearRange.startYear}-${yearRange.endYear}`;
};

const getDefaultCurveDataset = () => ({
  totalStores: 0,
  curveBuckets: [],
  segments: adoptionSegments.map(() => createEmptySegmentDataset()),
});

const sortCompactRows = (a, b) => {
  const aHasImage = hasAvatarImage(a);
  const bHasImage = hasAvatarImage(b);

  if (aHasImage !== bHasImage) {
    return aHasImage ? -1 : 1;
  }

  if (a.openedTimestamp !== null && b.openedTimestamp !== null) {
    if (a.openedTimestamp !== b.openedTimestamp) {
      return a.openedTimestamp - b.openedTimestamp;
    }
  } else if (a.openedTimestamp !== null) {
    return -1;
  } else if (b.openedTimestamp !== null) {
    return 1;
  }

  const contactRank = getContactRank(b) - getContactRank(a);
  if (contactRank !== 0) {
    return contactRank;
  }

  const addressCompare = String(a.address || "").localeCompare(String(b.address || ""));
  if (addressCompare !== 0) {
    return addressCompare;
  }

  return String(a.name || "").localeCompare(String(b.name || ""));
};

const getContactIcon = (type, href, label, isAvailable = true) => {
  const iconLabels = {
    web: "website",
    linkedin: "LinkedIn",
    email: "email",
  };
  const iconLabel = iconLabels[type] || "contact";
  const iconMarkup =
    type === "web"
      ? `
        <svg class="contact-icon contact-icon--web" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M10,11.28h-4.01c.38,1.6,1.06,3.11,2,4.45.94-1.34,1.62-2.85,2-4.45ZM4.35,4.72c.35-1.67.99-3.27,1.88-4.72C3.75.58,1.69,2.33.67,4.72h3.67ZM5.6,8c0,.55.04,1.1.1,1.64h4.6c.07-.54.1-1.09.1-1.64,0-.55-.04-1.1-.1-1.64h-4.6c-.07.54-.1,1.09-.1,1.64ZM11.65,4.72h3.67c-1.02-2.39-3.08-4.13-5.56-4.72.89,1.45,1.53,3.04,1.88,4.72ZM6,4.72h4.01c-.38-1.6-1.06-3.11-2-4.45-.94,1.34-1.62,2.85-2,4.45ZM11.65,11.28c-.35,1.67-.99,3.27-1.88,4.72,2.47-.58,4.54-2.33,5.56-4.72h-3.67ZM11.91,6.36c.06.55.09,1.09.09,1.64,0,.55-.03,1.1-.09,1.64h3.93c.22-1.08.22-2.2,0-3.28h-3.93ZM4.35,11.28H.67c1.02,2.39,3.08,4.13,5.56,4.72-.89-1.45-1.53-3.04-1.88-4.72ZM4.09,9.64c-.06-.55-.09-1.09-.09-1.64,0-.55.03-1.1.09-1.64H.16c-.22,1.08-.22,2.2,0,3.28h3.93Z"></path>
        </svg>
      `
      : type === "email"
      ? `
        <span class="contact-icon contact-icon--email" aria-hidden="true"></span>
      `
      : `
        <svg class="contact-icon contact-icon--linkedin" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
          <path fill="currentColor" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0ZM6.78,13h-1.78v-5.98h1.78v5.98ZM5.92,6.2c-.59,0-1.07-.4-1.07-.99s.48-1.08,1.07-1.08,1,.48,1,1.08-.41.99-1,.99ZM13.51,13h-1.85v-2.91c0-.69-.01-1.59-.96-1.59s-1.11.76-1.11,1.54v2.96h-1.85v-5.98h1.78v.82h.03c.25-.47.85-.97,1.76-.97,1.87,0,2.22,1.24,2.22,2.85v3.28Z"></path>
        </svg>
      `;

  if (type === "email") {
    if (!isAvailable) {
      return `
        <span class="contact-icon-link is-disabled" aria-label="${iconLabel} unavailable">
          ${iconMarkup}
        </span>
      `;
    }

    return `
      <button
        class="contact-icon-link contact-icon-link--button"
        type="button"
        data-scroll-to-demo
        aria-label="Request a demo for ${escapeHtml(label)}"
      >
        ${iconMarkup}
      </button>
    `;
  }

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

const getContactRank = (store) => {
  const hasWebsite = Boolean(store.websiteUrl);
  const hasLinkedin = Boolean(store.linkedinUrl);
  const hasEmail = Boolean(store.hasEmail);

  return [hasWebsite, hasLinkedin, hasEmail].filter(Boolean).length;
};

const getContactIcons = (store) => {
  const label = store.name || store.address || "store";
  const websiteUrl = store.websiteUrl || null;
  const linkedinUrl = store.linkedinUrl || null;
  const hasEmail = Boolean(store.hasEmail);

  return `
    <div class="raw-contact-icons" role="group" aria-label="Contact links for ${escapeHtml(label)}">
      ${getContactIcon("web", websiteUrl, label)}
      ${getContactIcon("linkedin", linkedinUrl, label)}
      ${getContactIcon("email", null, label, hasEmail)}
    </div>
  `;
};

const getStoreNameMarkup = (store) => {
  const displayName = escapeHtml(store.name || "-");
  const imageUrl = getAvatarImageUrl(store);
  const imageMarkup = imageUrl
    ? `
      <img
        class="raw-name-thumbnail"
        src="${escapeHtml(imageUrl)}"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
      >
    `
    : "";

  return `
    <span class="raw-name">
      ${imageMarkup}
      <span class="raw-phone">${displayName}</span>
    </span>
  `;
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

const buildCurveFromBuckets = (buckets) => {
  if (buckets.length < 2) {
    return curveShape;
  }

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count));
  if (!maxCount) {
    return curveShape;
  }

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

const getSegmentAriaLabel = (segment) => {
  return `${segment.label.replace(/\s+/g, " ")} stores`;
};

const createSegmentControl = (segment, index, type, isActive, isHovered) => {
  const control = document.createElement("button");
  const text = document.createElement("span");
  const secondaryText = formatSegmentYearRange(segment.yearRange, segment.percent);

  control.type = "button";
  control.className = `curve-segment-control curve-${type}`;
  control.dataset.segmentIndex = String(index);
  control.dataset.hovered = String(isHovered);
  control.setAttribute("aria-pressed", String(isActive));
  control.setAttribute("aria-label", `Filter ${getSegmentAriaLabel(segment)}`);
  text.className = "curve-segment-control__text";
  text.textContent = type === "label" ? segment.label : secondaryText;
  control.append(text);
  return control;
};

const getRenderableSegments = (dataset) => {
  return adoptionSegments.map((segment, index) => ({
    ...segment,
    yearRange: dataset?.segments?.[index]?.yearRange || null,
  }));
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
    "curve-visualization--chasm-hidden",
    activeSegmentIndex === chasmSegmentIndex
  );
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

const hasAvatarImage = (store) => Boolean(getAvatarImageUrl(store));

const createSegmentThumbnail = (store, index) => {
  const avatar = document.createElement("span");
  const face = document.createElement("span");
  const imageUrl = getAvatarImageUrl(store);

  avatar.className = "curve-segment-thumbnail";
  avatar.style.setProperty("--thumbnail-index", String(index));
  face.className = "curve-segment-thumbnail__face";

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    face.append(image);
  }

  avatar.append(face);
  return avatar;
};

const createOverflowBadge = (count, index) => {
  const badge = document.createElement("span");
  const face = document.createElement("span");
  badge.className = "curve-segment-thumbnail curve-segment-thumbnail--overflow";
  badge.style.setProperty("--thumbnail-index", String(index));
  face.className = "curve-segment-thumbnail__face";
  face.textContent = `+${count.toLocaleString()}`;
  badge.append(face);
  return badge;
};

const thumbnailPseudoRandom = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const buildBottomUpShuffledDropOrder = (positions, rowSpacing, seedOffset = 4201) => {
  const count = positions.length;
  const order = new Array(count);

  if (!count) {
    return order;
  }

  const safeRowSpacing = rowSpacing > 0 ? rowSpacing : 1;
  const indexed = positions.map((pos, i) => ({
    i,
    row: Math.round(pos.y / safeRowSpacing),
    rand: thumbnailPseudoRandom(i + seedOffset),
  }));

  indexed.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.rand - b.rand;
  });

  indexed.forEach((entry, rank) => {
    order[entry.i] = rank;
  });

  return order;
};

const curveSampleCache = { source: null, samples: null, baselineY: 0, peakHeight: 0 };

const getCurveLineSamples = () => {
  const curveLine = document.getElementById("curveLine");
  if (!curveLine) return null;
  const pathD = curveLine.getAttribute("d");
  if (!pathD) return null;
  if (curveSampleCache.source === pathD && curveSampleCache.samples) {
    return curveSampleCache;
  }
  let totalLength = 0;
  try {
    totalLength = curveLine.getTotalLength();
  } catch (error) {
    return null;
  }
  if (!totalLength) return null;
  const sampleCount = 320;
  const samples = new Array(sampleCount + 1);
  let baselineY = 0;
  let minY = Infinity;
  for (let i = 0; i <= sampleCount; i++) {
    const pt = curveLine.getPointAtLength((i / sampleCount) * totalLength);
    samples[i] = { x: pt.x, y: pt.y };
    if (pt.y > baselineY) baselineY = pt.y;
    if (pt.y < minY) minY = pt.y;
  }
  samples.sort((a, b) => a.x - b.x);
  curveSampleCache.source = pathD;
  curveSampleCache.samples = samples;
  curveSampleCache.baselineY = baselineY;
  curveSampleCache.peakHeight = Math.max(1, baselineY - minY);
  return curveSampleCache;
};

const getCurveHeightAtXPercent = (xPercent, viewBoxWidth = 1000) => {
  const cache = getCurveLineSamples();
  if (!cache) return 0;
  const targetX = (xPercent / 100) * viewBoxWidth;
  const { samples, baselineY } = cache;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].x <= targetX) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.x - a.x;
  const t = span > 0 ? (targetX - a.x) / span : 0;
  const y = a.y + (b.y - a.y) * t;
  return Math.max(0, baselineY - y);
};

const curveWeightShapingExponent = 0.55;

const computeSegmentColumnWeights = (segStartPct, segEndPct, numCols) => {
  const cache = getCurveLineSamples();
  if (!cache || numCols <= 0) {
    return new Array(numCols).fill(1);
  }
  const peak = cache.peakHeight;
  const weights = new Array(numCols);
  for (let c = 0; c < numCols; c++) {
    const relativeX = numCols === 1 ? 0.5 : (c + 0.5) / numCols;
    const absoluteXPct = segStartPct + relativeX * (segEndPct - segStartPct);
    const height = getCurveHeightAtXPercent(absoluteXPct);
    const rawWeight = peak > 0 ? Math.max(0, height / peak) : 0;
    weights[c] = Math.pow(rawWeight, curveWeightShapingExponent);
  }
  return weights;
};

const distributeBallsByColumnWeights = (totalCount, weights, perColMax) => {
  const cols = weights.length;
  const allocation = new Array(cols).fill(0);
  if (totalCount <= 0 || cols === 0) return allocation;
  const capLeft = perColMax ? perColMax.slice() : null;
  let remaining = totalCount;
  for (let pass = 0; pass < 6 && remaining > 0; pass++) {
    let weightSum = 0;
    for (let c = 0; c < cols; c++) {
      if (!capLeft || capLeft[c] > 0) weightSum += weights[c];
    }
    if (weightSum <= 0) {
      for (let c = 0; c < cols && remaining > 0; c++) {
        if (capLeft && capLeft[c] <= 0) continue;
        allocation[c]++;
        if (capLeft) capLeft[c]--;
        remaining--;
      }
      continue;
    }
    const fractions = [];
    let placedThisPass = 0;
    for (let c = 0; c < cols; c++) {
      if (capLeft && capLeft[c] <= 0) continue;
      const exact = (weights[c] / weightSum) * remaining;
      const whole = Math.floor(exact);
      const limit = capLeft ? Math.min(whole, capLeft[c]) : whole;
      allocation[c] += limit;
      if (capLeft) capLeft[c] -= limit;
      placedThisPass += limit;
      fractions.push({ i: c, frac: exact - whole });
    }
    remaining -= placedThisPass;
    fractions.sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < fractions.length && remaining > 0; k++) {
      const idx = fractions[k].i;
      if (capLeft && capLeft[idx] <= 0) continue;
      allocation[idx]++;
      if (capLeft) capLeft[idx]--;
      remaining--;
    }
  }
  return allocation;
};

const computeMarblePilePositions = (count, widthPx, ballSize, columnWeights) => {
  if (count <= 0 || widthPx <= 0) {
    return { positions: [], cols: 0, colSpacing: 0, rowSpacing: 0 };
  }

  const overlap = ballSize * 0.28;
  const colSpacing = Math.max(1, ballSize - overlap);
  const rowSpacing = colSpacing * 0.82;
  const maxCols = Math.max(1, Math.floor((widthPx - ballSize) / colSpacing) + 1);
  const cols = Math.min(maxCols, Math.max(1, count));

  let weights = columnWeights;
  if (!weights || weights.length !== cols) {
    weights = new Array(cols).fill(1);
  }
  if (weights.every((w) => w <= 0)) {
    weights = weights.map(() => 1);
  }

  const ballsPerColumn = distributeBallsByColumnWeights(count, weights);
  const maxBallsInAnyColumn = ballsPerColumn.reduce((m, n) => Math.max(m, n), 0);

  const rowSpan = (cols - 1) * colSpacing;
  const rowStartX = (widthPx - rowSpan) / 2;

  const positions = [];
  let placed = 0;

  for (let row = 0; row < maxBallsInAnyColumn; row++) {
    for (let col = 0; col < cols; col++) {
      if (row >= ballsPerColumn[col]) continue;
      const seed = placed + 1;
      const baseX = rowStartX + col * colSpacing;
      const baseY = row * rowSpacing + ballSize / 2;

      const jitterX = (thumbnailPseudoRandom(seed) - 0.5) * colSpacing * 0.5;
      const jitterY = (thumbnailPseudoRandom(seed + 1009) - 0.5) * rowSpacing * 0.4;
      const rotation = (thumbnailPseudoRandom(seed + 2017) - 0.5) * 32;

      positions.push({
        x: baseX + jitterX,
        y: Math.max(0, baseY + jitterY),
        rotation,
      });
      placed++;
    }
  }

  return { positions, cols, colSpacing, rowSpacing };
};

let lastRenderedSegmentKey = null;
let curveRevealFrame = null;
let hasPlayedCurveReveal = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setCurveRevealProgress = (progress, shape = curveShape) => {
  const revealClip = document.getElementById("curveRevealClipRect");

  if (!revealClip) {
    return;
  }

  const safeProgress = clamp(progress, 0, 1);
  revealClip.setAttribute("x", "0");
  revealClip.setAttribute("width", String(shape.width * safeProgress));
};

const animateCurveReveal = (shape = curveShape) => {
  if (hasPlayedCurveReveal) {
    setCurveRevealProgress(1, shape);
    return;
  }

  hasPlayedCurveReveal = true;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    setCurveRevealProgress(1, shape);
    return;
  }

  if (curveRevealFrame !== null) {
    window.cancelAnimationFrame(curveRevealFrame);
  }

  const startTime = performance.now();
  const easing = (value) => 1 - Math.pow(1 - value, 3);

  const frame = (now) => {
    const elapsed = now - startTime;
    const progress = clamp(elapsed / curveRevealDurationMs, 0, 1);
    setCurveRevealProgress(easing(progress), shape);

    if (progress < 1) {
      curveRevealFrame = window.requestAnimationFrame(frame);
      return;
    }

    curveRevealFrame = null;
  };

  setCurveRevealProgress(0, shape);
  curveRevealFrame = window.requestAnimationFrame(frame);
};

const renderSegmentThumbnails = (dataset, activeSegmentIndex = null, options = {}) => {
  const container = document.getElementById("curveSegmentThumbnails");

  if (!container) {
    return;
  }

  const segmentData =
    activeSegmentIndex === null ? null : dataset?.segments?.[activeSegmentIndex] || null;
  const segmentSignature =
    dataset?.segments
      ?.map(
        (segment) =>
          `${segment?.thumbnails?.length || 0}:${segment?.hiddenThumbnailCount || 0}`
      )
      .join("|") || "";
  const key = `${activeSegmentIndex}::${dataset?.totalStores || 0}::${segmentSignature}`;
  if (!options.force && lastRenderedSegmentKey === key) {
    return;
  }
  lastRenderedSegmentKey = key;

  container.replaceChildren();
  container.classList.remove("is-visible");

  if (activeSegmentIndex === null) {
    container.style.setProperty("--thumbnail-left", "0%");
    container.style.setProperty("--thumbnail-width", "100%");

    const containerStyles = getComputedStyle(container);
    const ballSize = parseFloat(containerStyles.getPropertyValue("--thumbnail-size")) || 24;
    const stage = container.parentElement;
    const stageHeight = stage?.clientHeight || 200;
    const maxPileHeight = Math.max(ballSize * 2.5, stageHeight * 0.88);
    const totalContainerWidth = Math.max(ballSize, container.clientWidth);

    let tallestPile = 0;

    adoptionSegments.forEach((segment, segmentIndex) => {
      const currentSegmentData = dataset?.segments?.[segmentIndex] || null;
      if (!currentSegmentData) {
        return;
      }

      const imageBackedStores = currentSegmentData.thumbnails || [];
      const hiddenNonImageCount = currentSegmentData.hiddenThumbnailCount || 0;
      if (!imageBackedStores.length && hiddenNonImageCount === 0) {
        return;
      }

      const startPosition = getSegmentStartPosition(adoptionSegments, segmentIndex);
      const segmentWidth = segment.endPosition - startPosition;
      const segmentWidthPx = Math.max(ballSize, totalContainerWidth * (segmentWidth / 100));
      const overlap = ballSize * 0.28;
      const colSpacing = Math.max(1, ballSize - overlap);
      const rowSpacing = colSpacing * 0.82;
      const colsForSegment = Math.max(
        1,
        Math.floor((segmentWidthPx - ballSize) / colSpacing) + 1
      );
      const rowsForStage = Math.max(
        1,
        Math.floor((maxPileHeight - ballSize) / rowSpacing) + 1
      );
      const segmentEnd = startPosition + segmentWidth;
      const columnWeights = computeSegmentColumnWeights(
        startPosition,
        segmentEnd,
        colsForSegment
      );
      const columnFitMax = columnWeights.map((weight) =>
        Math.max(1, Math.ceil(weight * rowsForStage))
      );
      const curveFitCap = columnFitMax.reduce((sum, value) => sum + value, 0);
      const segmentCap = Math.min(segmentThumbnailHardCap, curveFitCap);
      const needsOverflowBadge =
        hiddenNonImageCount > 0 || imageBackedStores.length > segmentCap;
      const visibleImageCap = needsOverflowBadge
        ? Math.max(0, segmentCap - 1)
        : segmentCap;
      const visibleStores = imageBackedStores.slice(0, visibleImageCap);
      const overflowCount =
        hiddenNonImageCount + Math.max(0, imageBackedStores.length - visibleStores.length);

      const { positions } = computeMarblePilePositions(
        visibleStores.length,
        segmentWidthPx,
        ballSize,
        columnWeights
      );
      const pileHeight = positions.reduce(
        (max, pos) => Math.max(max, pos.y + ballSize / 2),
        ballSize
      );
      const badgeY = overflowCount > 0 ? pileHeight + ballSize * 0.45 : 0;
      const totalHeight = overflowCount > 0 ? badgeY + ballSize * 0.6 : pileHeight;
      tallestPile = Math.max(tallestPile, totalHeight);

      const layer = document.createElement("div");
      layer.className = "curve-segment-thumbnail-layer";
      layer.style.setProperty("--thumbnail-left", `${startPosition}%`);
      layer.style.setProperty("--thumbnail-width", `${segmentWidth}%`);
      layer.style.setProperty("--thumbnail-pile-height", `${totalHeight}px`);

      const stack = document.createElement("div");
      stack.className = "curve-segment-thumbnail-stack";
      const dropOrder = buildBottomUpShuffledDropOrder(positions, rowSpacing);
      const pileStores = visibleStores.slice().reverse();

      pileStores.forEach((store, index) => {
        const ball = createSegmentThumbnail(store, dropOrder[index]);
        const pos = positions[index];
        ball.style.setProperty("--thumbnail-x", `${pos.x}px`);
        ball.style.setProperty("--thumbnail-y", `${pos.y}px`);
        ball.style.setProperty("--thumbnail-rotation", `${pos.rotation}deg`);
        ball.style.setProperty(
          "--thumbnail-segment-delay",
          `${segmentIndex * segmentFillStaggerMs}ms`
        );
        stack.append(ball);
      });

      if (overflowCount > 0) {
        const overflowBadge = createOverflowBadge(overflowCount, visibleStores.length);
        overflowBadge.style.setProperty("--thumbnail-x", `${segmentWidthPx / 2}px`);
        overflowBadge.style.setProperty("--thumbnail-y", `${badgeY}px`);
        overflowBadge.style.setProperty("--thumbnail-rotation", "0deg");
        overflowBadge.style.setProperty(
          "--thumbnail-segment-delay",
          `${segmentIndex * segmentFillStaggerMs}ms`
        );
        stack.append(overflowBadge);
      }

      layer.append(stack);
      container.append(layer);
    });

    if (!container.children.length) {
      container.style.removeProperty("--thumbnail-pile-height");
      return;
    }

    container.style.setProperty("--thumbnail-pile-height", `${tallestPile}px`);
    container.classList.add("is-visible");
    return;
  }

  if (!segmentData) {
    container.style.removeProperty("--thumbnail-left");
    container.style.removeProperty("--thumbnail-width");
    container.style.removeProperty("--thumbnail-pile-height");
    return;
  }

  const activeSegment = adoptionSegments[activeSegmentIndex];
  const startPosition = getSegmentStartPosition(adoptionSegments, activeSegmentIndex);
  const segmentWidth = activeSegment.endPosition - startPosition;
  const imageBackedStores = segmentData.thumbnails || [];
  const hiddenNonImageCount = segmentData.hiddenThumbnailCount || 0;

  if (!imageBackedStores.length && hiddenNonImageCount === 0) {
    return;
  }

  container.style.setProperty("--thumbnail-left", `${startPosition}%`);
  container.style.setProperty("--thumbnail-width", `${segmentWidth}%`);

  const containerStyles = getComputedStyle(container);
  const ballSize =
    parseFloat(containerStyles.getPropertyValue("--thumbnail-size")) || 24;
  const containerWidth = Math.max(ballSize, container.clientWidth);
  const stage = container.parentElement;
  const stageHeight = stage?.clientHeight || 200;
  const maxPileHeight = Math.max(ballSize * 2.5, stageHeight * 0.88);

  const overlap = ballSize * 0.28;
  const colSpacing = Math.max(1, ballSize - overlap);
  const rowSpacing = colSpacing * 0.82;
  const colsForSegment = Math.max(
    1,
    Math.floor((containerWidth - ballSize) / colSpacing) + 1
  );
  const rowsForStage = Math.max(
    1,
    Math.floor((maxPileHeight - ballSize) / rowSpacing) + 1
  );

  const segmentEnd = startPosition + segmentWidth;
  const columnWeights = computeSegmentColumnWeights(
    startPosition,
    segmentEnd,
    colsForSegment
  );
  const columnFitMax = columnWeights.map((w) =>
    Math.max(1, Math.ceil(w * rowsForStage))
  );
  const curveFitCap = columnFitMax.reduce((a, b) => a + b, 0);
  const segmentCap = Math.min(segmentThumbnailHardCap, curveFitCap);

  const needsOverflowBadge =
    hiddenNonImageCount > 0 || imageBackedStores.length > segmentCap;
  const visibleImageCap = needsOverflowBadge
    ? Math.max(0, segmentCap - 1)
    : segmentCap;
  const visibleStores = imageBackedStores.slice(0, visibleImageCap);

  const overflowCount =
    hiddenNonImageCount + Math.max(0, imageBackedStores.length - visibleStores.length);

  const { positions } = computeMarblePilePositions(
    visibleStores.length,
    containerWidth,
    ballSize,
    columnWeights
  );
  const pileHeight = positions.reduce(
    (max, pos) => Math.max(max, pos.y + ballSize / 2),
    ballSize
  );

  const badgeY = overflowCount > 0 ? pileHeight + ballSize * 0.45 : 0;
  const totalContainerHeight =
    overflowCount > 0 ? badgeY + ballSize * 0.6 : pileHeight;

  container.style.setProperty(
    "--thumbnail-pile-height",
    `${totalContainerHeight}px`
  );

  const stack = document.createElement("div");
  stack.className = "curve-segment-thumbnail-stack";

  const dropOrder = buildBottomUpShuffledDropOrder(positions, rowSpacing);

  const pileStores = visibleStores.slice().reverse();

  pileStores.forEach((store, index) => {
    const ball = createSegmentThumbnail(store, dropOrder[index]);
    const pos = positions[index];
    ball.style.setProperty("--thumbnail-x", `${pos.x}px`);
    ball.style.setProperty("--thumbnail-y", `${pos.y}px`);
    ball.style.setProperty("--thumbnail-rotation", `${pos.rotation}deg`);
    ball.style.setProperty("--thumbnail-segment-delay", "0ms");
    stack.append(ball);
  });

  if (overflowCount > 0) {
    const overflowBadge = createOverflowBadge(overflowCount, visibleStores.length);
    overflowBadge.style.setProperty("--thumbnail-x", `${containerWidth / 2}px`);
    overflowBadge.style.setProperty("--thumbnail-y", `${badgeY}px`);
    overflowBadge.style.setProperty("--thumbnail-rotation", "0deg");
    overflowBadge.style.setProperty("--thumbnail-segment-delay", "0ms");
    stack.append(overflowBadge);
  }

  container.append(stack);
  container.classList.add("is-visible");
};

const lockedPlaceholderNames = [
  "Verified operator",
  "Portfolio operator",
  "Multi-unit owner",
  "Regional franchisee",
  "Growth-stage operator",
];

const lockedPlaceholderAddresses = [
  "Full address available with access",
  "Market location available with access",
  "Verified contact details available with access",
  "Territory information available with access",
  "Operator profile available with access",
];

const buildMockRowPools = (dataset) => {
  const avatars = [];
  const websites = [];
  const linkedins = [];
  const openedRows = [];

  dataset?.segments?.forEach((segment) => {
    segment?.thumbnails?.forEach((thumbnail) => {
      if (thumbnail?.imageUrl) {
        avatars.push(thumbnail.imageUrl);
      }
    });

    segment?.rows?.forEach((row) => {
      if (row?.imageUrl) {
        avatars.push(row.imageUrl);
      }
      if (row?.websiteUrl) {
        websites.push(row.websiteUrl);
      }
      if (row?.linkedinUrl) {
        linkedins.push(row.linkedinUrl);
      }
      if (row?.openedLabel) {
        openedRows.push({
          openedLabel: row.openedLabel,
          openedTimestamp: row.openedTimestamp,
        });
      }
    });
  });

  openedRows.sort((a, b) => (a.openedTimestamp || 0) - (b.openedTimestamp || 0));

  return { avatars, websites, linkedins, openedRows };
};

const pickDeterministicPoolValue = (values, index, seedOffset) => {
  if (!values.length) {
    return null;
  }

  const randomValue = thumbnailPseudoRandom(index + seedOffset);
  const poolIndex = Math.floor(randomValue * values.length) % values.length;
  return values[poolIndex];
};

const createMockStoreRow = (index, pools) => {
  const latestOpenedRow = pools.openedRows[pools.openedRows.length - 1] || null;

  return {
    name: lockedPlaceholderNames[index % lockedPlaceholderNames.length],
    address: lockedPlaceholderAddresses[index % lockedPlaceholderAddresses.length],
    openedLabel: latestOpenedRow?.openedLabel || "Dec 14, 2023",
    openedTimestamp: latestOpenedRow?.openedTimestamp || null,
    imageUrl: pickDeterministicPoolValue(pools.avatars, index, 101),
    websiteUrl:
      pickDeterministicPoolValue(pools.websites, index, 211) || "https://crumblcookies.com/",
    linkedinUrl:
      pickDeterministicPoolValue(pools.linkedins, index, 307) || "https://www.linkedin.com/",
    hasEmail: true,
  };
};

const getDisplayStores = (dataset, activeSegmentIndex = null) => {
  if (!dataset) {
    return { totalStores: 0, visibleStores: 0, rows: [] };
  }

  const totalStores = dataset.totalStores || 0;
  const visibleStores =
    activeSegmentIndex === null
      ? totalStores
      : dataset.segments[activeSegmentIndex]?.storeCount || 0;
  const baseRows =
    activeSegmentIndex === null
      ? dataset.segments.flatMap((segment) => segment.rows).sort(sortCompactRows)
      : [...(dataset.segments[activeSegmentIndex]?.rows || [])];
  const rows = baseRows.slice(0, lockedStoresMaxRows).map((row) => ({ ...row }));
  const hiddenStoreCount = Math.max(0, visibleStores - rows.length);
  const placeholderCount = Math.min(lockedStoresMaxRows - rows.length, hiddenStoreCount);
  const placeholderOffset = rows.length;
  const mockRowPools = buildMockRowPools(dataset);

  for (let index = 0; index < placeholderCount; index += 1) {
    rows.push(createMockStoreRow(placeholderOffset + index, mockRowPools));
  }

  return { totalStores, visibleStores, rows };
};

const renderStoresTable = (dataset, activeSegmentIndex = null) => {
  const tableBody = document.getElementById("storesTableBody");
  const storesSummary = document.getElementById("storesSummary");

  if (!tableBody) {
    return;
  }

  const { totalStores, visibleStores, rows } = getDisplayStores(dataset, activeSegmentIndex);

  if (storesSummary) {
    storesSummary.textContent =
      activeSegmentIndex === null
        ? `${totalStores.toLocaleString()} stores`
        : `${visibleStores.toLocaleString()} of ${totalStores.toLocaleString()} stores`;
  }

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td class="raw-empty-cell" colspan="5">No stores found for this adoption category.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows
    .map((store, index) => {
      const location = escapeHtml(store.address || "-");
      const opened = escapeHtml(store.openedLabel || "-");
      const mapsUrl = toGoogleMapsUrl(store.address);
      const locationMarkup =
        store.address && mapsUrl
          ? `<a class="raw-location raw-location-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${location}</a>`
          : `<span class="raw-location">${location}</span>`;
      const contactMarkup = getContactIcons(store);
      const nameMarkup = getStoreNameMarkup(store);
      const lockedClass = index >= lockedStoresVisibleCount ? " class=\"is-locked\"" : "";

      return `
        <tr${lockedClass}>
          <td class="raw-index-cell">${index + 1}</td>
          <td>${nameMarkup}</td>
          <td>${contactMarkup}</td>
          <td><span class="raw-phone">${opened}</span></td>
          <td>${locationMarkup}</td>
        </tr>
      `;
    })
    .join("");

  updateStoresUpsell();
};

const updateStoresUpsell = () => {
  const wrap = document.querySelector(".stores-table-wrap");
  const upsell = document.getElementById("storesUpsell");
  const tableBody = document.getElementById("storesTableBody");

  if (!wrap || !upsell || !tableBody) {
    return;
  }

  const firstLockedRow = tableBody.querySelector("tr.is-locked");

  if (!firstLockedRow) {
    upsell.hidden = true;
    return;
  }

  const wrapRect = wrap.getBoundingClientRect();
  const rowRect = firstLockedRow.getBoundingClientRect();
  upsell.style.top = `${rowRect.top - wrapRect.top + wrap.scrollTop}px`;
  upsell.hidden = false;
};

const loadCrumblData = async () => {
  const response = await fetch(curveDataUrl);

  if (!response.ok) {
    throw new Error(`Unable to load ${curveDataUrl}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload !== "object") {
    return getDefaultCurveDataset();
  }

  const segments = adoptionSegments.map((_, index) => {
    const rawSegment = Array.isArray(payload.segments) ? payload.segments[index] : null;

    if (!rawSegment || typeof rawSegment !== "object") {
      return createEmptySegmentDataset();
    }

    const rows = (Array.isArray(rawSegment.rows) ? rawSegment.rows : [])
      .map(sanitizeStoreRow)
      .filter(Boolean)
      .slice(0, lockedStoresVisibleCount);

    return {
      storeCount: Math.max(sanitizePositiveInteger(rawSegment.storeCount), rows.length),
      hiddenThumbnailCount: sanitizePositiveInteger(rawSegment.hiddenThumbnailCount),
      yearRange: sanitizeYearRange(rawSegment.yearRange),
      thumbnails: (Array.isArray(rawSegment.thumbnails) ? rawSegment.thumbnails : [])
        .map(sanitizeThumbnail)
        .filter(Boolean),
      rows,
    };
  });

  const curveBuckets = (Array.isArray(payload.curveBuckets) ? payload.curveBuckets : [])
    .map((bucket, index) => sanitizeCurveBucket(bucket, index))
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
  const totalStores = Math.max(
    sanitizePositiveInteger(payload.totalStores),
    segments.reduce((total, segment) => total + segment.storeCount, 0)
  );

  return {
    totalStores,
    curveBuckets,
    segments,
  };
};

const scrollPageToTop = () => {
  const curvePanel = document.querySelector(".curve-panel");

  if (curvePanel instanceof HTMLElement) {
    curvePanel.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

const scrollToDemoRequest = () => {
  const curvePanel = document.querySelector(".curve-panel");
  const upsell = document.getElementById("storesUpsell");
  const fallbackTarget = document.querySelector(".stores-table-wrap");
  const target =
    upsell instanceof HTMLElement && !upsell.hidden ? upsell : fallbackTarget;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (curvePanel instanceof HTMLElement) {
    const panelRect = curvePanel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = targetRect.top - panelRect.top + curvePanel.scrollTop - 20;
    curvePanel.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const initAdoptionCurve = async () => {
  const visualization = document.querySelector(".curve-visualization");
  const curveHeading = document.querySelector(".curve-heading");

  const renderCurrentState = () => {
    const renderableSegments = getRenderableSegments(curveState.dataset);
    renderAdoptionCurve(
      renderableSegments,
      curveState.shape,
      curveState.activeSegmentIndex,
      curveState.hoveredSegmentIndex
    );
    renderSegmentThumbnails(curveState.dataset, curveState.activeSegmentIndex);
    renderStoresTable(curveState.dataset, curveState.activeSegmentIndex);
  };

  renderAdoptionCurve(getRenderableSegments(curveState.dataset));

  curveHeading?.addEventListener("click", scrollPageToTop);

  document.addEventListener("click", (event) => {
    const trigger =
      event.target instanceof Element ? event.target.closest("[data-scroll-to-demo]") : null;

    if (!trigger) {
      return;
    }

    event.preventDefault();
    scrollToDemoRequest();
  });

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

  let resizeTimer;
  window.addEventListener("resize", () => {
    updateStoresUpsell();

    if (curveState.activeSegmentIndex === null) {
      return;
    }
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      renderSegmentThumbnails(curveState.dataset, curveState.activeSegmentIndex, { force: true });
    }, 200);
  });

  try {
    const dataset = await loadCrumblData();
    curveState.dataset = dataset;

    curveState.shape = buildCurveFromBuckets(dataset.curveBuckets);
    lastRenderedSegmentKey = null;
    renderCurrentState();
    animateCurveReveal(curveState.shape);
  } catch (error) {
    console.warn(error);
  }
};

initAdoptionCurve();
