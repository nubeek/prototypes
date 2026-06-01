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
  records: [],
  shape: curveShape,
};

const curveDataUrl = "data/crumbl.json?v=5";
const curveGranularities = {
  year: { stepMonths: 12 },
  quarter: { stepMonths: 3 },
  month: { stepMonths: 1 },
};
const segmentThumbnailHardCap = 220;
const lockedStoresVisibleCount = 5;
const lockedStoresMaxRows = 15;

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

const getAvatarLabel = (store) =>
  store.owner_name || store.storefront_name || store.city || store.street || "Crumbl operator";

const getAvatarInitials = (value) => {
  const words = String(value || "")
    .trim()
    .split(/[\s,./&-]+/)
    .filter(Boolean);

  if (!words.length) {
    return "C";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const getAvatarImageUrl = (store) =>
  toSafeUrl(
    store.owner_thumbnail ||
      store.profile_picture ||
      store.owner_profile_picture ||
      store.owner_image_url ||
      store.owner_image ||
      store.thumbnail_url ||
      store.photo_url ||
      store.image_url ||
      store.image
  );

const formatOpenedDate = (value) => {
  const parsedDate = parseOpenedDate(value);

  if (!parsedDate) {
    return "-";
  }

  return openedDateFormatter.format(parsedDate);
};

const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
};

const normalizeCrumblRecord = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const nestedInstitution =
    record.institution && typeof record.institution === "object"
      ? record.institution
      : null;
  const nestedRootProfile =
    nestedInstitution?.root_profile && typeof nestedInstitution.root_profile === "object"
      ? nestedInstitution.root_profile
      : null;
  const nestedLocation =
    record.location && typeof record.location === "object" ? record.location : null;
  const nestedCoordinates =
    nestedLocation?.coordinates && typeof nestedLocation.coordinates === "object"
      ? nestedLocation.coordinates
      : null;
  const nestedRootProfileName = pickFirstNonEmptyString(nestedRootProfile?.name);
  const ownerName = pickFirstNonEmptyString(
    record.owner_name,
    record.root_profile_name,
    nestedRootProfileName
  );
  const rootProfileName = pickFirstNonEmptyString(
    record.root_profile_name,
    nestedRootProfileName,
    record.owner_name
  );

  return {
    ...record,
    id: record.id ?? record.store_id ?? null,
    phone: pickFirstNonEmptyString(record.phone, nestedRootProfile?.phone),
    storefront_name: pickFirstNonEmptyString(record.storefront_name, record.name),
    street: pickFirstNonEmptyString(record.street, nestedLocation?.address),
    city: pickFirstNonEmptyString(record.city, nestedLocation?.city),
    state: pickFirstNonEmptyString(record.state, nestedLocation?.state),
    country: pickFirstNonEmptyString(record.country, nestedLocation?.country),
    latitude: record.latitude ?? nestedCoordinates?.lat ?? null,
    longitude: record.longitude ?? nestedCoordinates?.lng ?? null,
    url: pickFirstNonEmptyString(record.url, nestedInstitution?.website),
    email_address: pickFirstNonEmptyString(record.email_address, record.email),
    owner_name: ownerName,
    owner_email: pickFirstNonEmptyString(
      record.owner_email,
      nestedRootProfile?.email,
      record.email
    ),
    root_profile_name: rootProfileName,
    root_profile_id: record.root_profile_id ?? nestedRootProfile?.id ?? null,
    root_profile_abbreviation: pickFirstNonEmptyString(
      record.root_profile_abbreviation,
      nestedRootProfile?.abbreviation
    ),
    root_profile_org_key: pickFirstNonEmptyString(
      record.root_profile_org_key,
      nestedRootProfile?.org_key
    ),
    root_profile_org_title: pickFirstNonEmptyString(
      record.root_profile_org_title,
      nestedRootProfile?.org_title
    ),
    owner_linkedin: pickFirstNonEmptyString(
      record.owner_linkedin,
      nestedRootProfile?.linkedin_link,
      nestedInstitution?.linkedin_link
    ),
    institution_name: pickFirstNonEmptyString(
      record.institution_name,
      nestedInstitution?.name
    ),
    profile_picture: pickFirstNonEmptyString(
      record.profile_picture,
      nestedRootProfile?.profile_picture
    ),
  };
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
  const hasWebsite = Boolean(toSafeUrl(store.url));
  const hasLinkedin = Boolean(toSafeUrl(store.owner_linkedin));

  if (hasWebsite && hasLinkedin) return 3;
  if (hasWebsite) return 2;
  if (hasLinkedin) return 1;
  return 0;
};

const getContactIcons = (store) => {
  const label = store.owner_name || store.storefront_name || store.street || "store";
  const websiteUrl = toSafeUrl(store.url);
  const linkedinUrl = toSafeUrl(store.owner_linkedin);

  return `
    <div class="raw-contact-icons" role="group" aria-label="Contact links for ${escapeHtml(label)}">
      ${getContactIcon("web", websiteUrl, label)}
      ${getContactIcon("linkedin", linkedinUrl, label)}
      ${getContactIcon("email", null, label)}
    </div>
  `;
};

const getStoreNameMarkup = (store) => {
  const displayName = escapeHtml(
    store.owner_name || store.institution_name || store.storefront_name || "-"
  );
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

const hasAvatarImage = (store) => Boolean(getAvatarImageUrl(store));

const getSegmentThumbnailStores = (stores) => {
  const seenOwnersWithoutImage = new Set();
  const selectedStores = [];

  stores.forEach((store) => {
    if (hasAvatarImage(store)) {
      selectedStores.push(store);
      return;
    }

    const ownerName = String(store.owner_name || "").trim();

    if (ownerName) {
      const ownerKey = ownerName.toLowerCase();
      if (seenOwnersWithoutImage.has(ownerKey)) {
        return;
      }
      seenOwnersWithoutImage.add(ownerKey);
    }

    selectedStores.push(store);
  });

  return selectedStores.sort((a, b) => {
    const aHasImage = hasAvatarImage(a);
    const bHasImage = hasAvatarImage(b);
    const aHasOwner = Boolean(a.owner_name);
    const bHasOwner = Boolean(b.owner_name);

    if (aHasImage !== bHasImage) {
      return aHasImage ? -1 : 1;
    }

    if (aHasOwner !== bHasOwner) {
      return aHasOwner ? -1 : 1;
    }

    return String(getAvatarLabel(a)).localeCompare(String(getAvatarLabel(b)));
  });
};

const createSegmentThumbnail = (store, index) => {
  const avatar = document.createElement("span");
  const face = document.createElement("span");
  const label = getAvatarLabel(store);
  const imageUrl = getAvatarImageUrl(store);

  avatar.className = "curve-segment-thumbnail";
  avatar.style.setProperty("--thumbnail-index", String(index));
  avatar.title = label;
  face.className = "curve-segment-thumbnail__face";

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    face.append(image);
  } else {
    face.textContent = getAvatarInitials(label);
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

const renderSegmentThumbnails = (records, activeSegmentIndex = null, options = {}) => {
  const container = document.getElementById("curveSegmentThumbnails");

  if (!container) {
    return;
  }

  const key = `${activeSegmentIndex}::${records?.length || 0}`;
  if (!options.force && lastRenderedSegmentKey === key) {
    return;
  }
  lastRenderedSegmentKey = key;

  container.replaceChildren();
  container.classList.toggle("is-visible", activeSegmentIndex !== null);

  if (activeSegmentIndex === null || !records.length) {
    container.style.removeProperty("--thumbnail-left");
    container.style.removeProperty("--thumbnail-width");
    container.style.removeProperty("--thumbnail-pile-height");
    return;
  }

  const activeSegment = adoptionSegments[activeSegmentIndex];
  const startPosition = getSegmentStartPosition(adoptionSegments, activeSegmentIndex);
  const segmentWidth = activeSegment.endPosition - startPosition;
  const stores = getStoresWithSegments(records, adoptionSegments).filter(
    (store) => store.segmentIndex === activeSegmentIndex
  );
  const thumbnailStores = getSegmentThumbnailStores(stores);

  if (!thumbnailStores.length) {
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

  const imageBackedStores = thumbnailStores.filter(hasAvatarImage);
  const hiddenNonImageCount = thumbnailStores.length - imageBackedStores.length;
  const needsOverflowBadge =
    hiddenNonImageCount > 0 || imageBackedStores.length > segmentCap;
  const visibleImageCap = needsOverflowBadge
    ? Math.max(0, segmentCap - 1)
    : segmentCap;
  const visibleStores = imageBackedStores.slice(0, visibleImageCap);

  const overflowCount = thumbnailStores.length - visibleStores.length;

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
    stack.append(ball);
  });

  if (overflowCount > 0) {
    const overflowBadge = createOverflowBadge(overflowCount, visibleStores.length);
    overflowBadge.style.setProperty("--thumbnail-x", `${containerWidth / 2}px`);
    overflowBadge.style.setProperty("--thumbnail-y", `${badgeY}px`);
    overflowBadge.style.setProperty("--thumbnail-rotation", "0deg");
    stack.append(overflowBadge);
  }

  container.append(stack);
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
      const aHasImage = hasAvatarImage(a);
      const bHasImage = hasAvatarImage(b);

      if (aHasImage !== bHasImage) {
        return aHasImage ? -1 : 1;
      }

      if (a.openedDate && b.openedDate) {
        if (a.openedDate.getTime() !== b.openedDate.getTime()) {
          return a.openedDate - b.openedDate;
        }
      } else if (a.openedDate) {
        return -1;
      } else if (b.openedDate) {
        return 1;
      }

      const contactRank = getContactRank(b) - getContactRank(a);
      if (contactRank !== 0) {
        return contactRank;
      }

      return String(a.street || "").localeCompare(String(b.street || ""));
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

  const displayStores =
    stores.length > lockedStoresVisibleCount
      ? stores.slice(0, lockedStoresMaxRows)
      : stores;

  tableBody.innerHTML = displayStores
    .map((store, index) => {
      const location = escapeHtml(store.street || "-");
      const opened = escapeHtml(formatOpenedDate(store.date_opened));
      const mapsUrl = toGoogleMapsUrl(store.street);
      const locationMarkup =
        store.street && mapsUrl
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

  const rawRecords = await response.json();

  if (!Array.isArray(rawRecords)) {
    return [];
  }

  return rawRecords
    .map(normalizeCrumblRecord)
    .filter((record) => record && record.id !== null);
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
    renderAdoptionCurve(
      adoptionSegments,
      curveState.shape,
      curveState.activeSegmentIndex,
      curveState.hoveredSegmentIndex
    );
    renderSegmentThumbnails(curveState.records, curveState.activeSegmentIndex);
    renderStoresTable(curveState.records, curveState.activeSegmentIndex);
  };

  renderAdoptionCurve(adoptionSegments);

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
      renderSegmentThumbnails(curveState.records, curveState.activeSegmentIndex, { force: true });
    }, 200);
  });

  try {
    const records = await loadCrumblData();
    curveState.records = records;

    curveState.shape = buildCurveFromOpenings(records, "quarter");
    lastRenderedSegmentKey = null;
    renderCurrentState();
  } catch (error) {
    console.warn(error);
  }
};

initAdoptionCurve();
