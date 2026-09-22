/* Share territories dialog.
   Builds a public link that carries the whole current query and renders the
   1200×630 meta image (og:image size) that link would unfurl with. The map in
   the image comes from the crossroad tile pipeline, so a shared search looks
   like the simplified map the splash tiles already show. */

const TERRITORY_SHARE_PUBLIC_BASE_URL = "https://wefranch.com/territories";
const TERRITORY_SHARE_COPIED_RESET_MS = 2000;

const TERRITORY_SHARE_IMAGE_WIDTH = 1200;
const TERRITORY_SHARE_IMAGE_HEIGHT = 630;
const TERRITORY_SHARE_IMAGE_PADDING = 72;
const TERRITORY_SHARE_MAP_SHIFT = 80;
const TERRITORY_SHARE_PANEL_WIDTH = 560 + TERRITORY_SHARE_MAP_SHIFT;
const TERRITORY_SHARE_PANEL_FADE = 100 + TERRITORY_SHARE_MAP_SHIFT;
const TERRITORY_SHARE_TEXT_WIDTH = 470 + TERRITORY_SHARE_MAP_SHIFT;
// A brand name stays on one line. The extra room is the still-white start of
// the map fade, so a name like "SYNERGY HomeCare" does not wrap early and pull
// the rest of the headline down to a smaller size.
const TERRITORY_SHARE_BRAND_TEXT_WIDTH = TERRITORY_SHARE_TEXT_WIDTH + 80;
// The snapshot stays framed for the strip before the shift. Drawing it further
// right, rather than narrowing the frame, is what opens the extra text room.
// The continental default was tuned for a short splash tile. On this tall
// strip it leaves the country low, under a band of empty map, so the story
// image frames the matched territories instead. Insets keep them out of the
// left fade and the 80px that the shift clips off the right.
const TERRITORY_SHARE_MAP_SIZE = {
  width: TERRITORY_SHARE_IMAGE_WIDTH - (TERRITORY_SHARE_PANEL_WIDTH - TERRITORY_SHARE_MAP_SHIFT),
  height: TERRITORY_SHARE_IMAGE_HEIGHT,
  scale: 2,
  attribution: false,
  fitFeatures: true,
  boundsPadding: 0.16,
  minZoom: 2.1,
  zoomOut: 0,
  insets: { left: 148, right: 116, top: 44, bottom: 56 }
};
// Queries outside the story rules drop the headline and let the map fill the
// frame. Padding and a lower zoom floor keep every territory inside the picture.
const TERRITORY_SHARE_MAP_FULL_SIZE = {
  width: TERRITORY_SHARE_IMAGE_WIDTH,
  height: TERRITORY_SHARE_IMAGE_HEIGHT,
  scale: 2,
  attribution: false,
  fitFeatures: true,
  boundsPadding: 0.42,
  minZoom: 2.1,
  zoomOut: 0.35
};
const TERRITORY_SHARE_COUNT_SIZE = 120;
const TERRITORY_SHARE_COUNT_LABEL_SIZE = 42;
const TERRITORY_SHARE_COUNTS_BASELINE = TERRITORY_SHARE_IMAGE_HEIGHT - TERRITORY_SHARE_IMAGE_PADDING;
const TERRITORY_SHARE_COUNTS_TOP = TERRITORY_SHARE_COUNTS_BASELINE - TERRITORY_SHARE_COUNT_SIZE;
const TERRITORY_SHARE_HEADLINE_SIZES = [56, 48, 42, 36];
const TERRITORY_SHARE_HEADLINE_MAX_LINES = 5;
// Measured to the ink of the title, so the gap stays 70px whether the headline
// is one line or several.
const TERRITORY_SHARE_HEADLINE_GAP = 70;
const TERRITORY_SHARE_LOGO_SIZE = 96;
const TERRITORY_SHARE_LOGO_RADIUS = 24;
const TERRITORY_SHARE_LOGO_GAP = 10;
const TERRITORY_SHARE_LOGO_STACK_SIZE = 72;
const TERRITORY_SHARE_LOGO_STACK_RADIUS = 18;
const TERRITORY_SHARE_LOGO_STACK_OVERLAP = 22;
const TERRITORY_SHARE_LOGO_STACK_OUTLINE = 2;
const TERRITORY_SHARE_LOGO_MAX_VISIBLE = 2;
const TERRITORY_SHARE_MARK_SIZE = 56;
const TERRITORY_SHARE_MARK_INSET = 70;
// The sidebar summary ends with a filter tally when the query is deeper than
// its copy can name. That reads as list chrome in a headline, and the link
// carries those filters anyway.
const TERRITORY_SHARE_FILTER_TALLY = /\s+with \d+ more filters? applied$/i;

const territoryShareModalOverlay = document.getElementById("territoryShareModal");
const territoryShareCanvas = document.getElementById("territoryShareCanvas");
const territoryShareUrlInput = document.getElementById("territoryShareUrl");
const territoryShareSubmitBtn = document.getElementById("territoryShareCopy");
const territoryShareCopyButtons = [
  document.getElementById("territoryShareCopyInline"),
  territoryShareSubmitBtn
].filter(Boolean);
const territoryShareDownloadBtn = document.getElementById("territoryShareDownload");

let territoryShareRenderToken = 0;
const territoryShareCopiedTimers = new Map();

/* Public link ----------------------------------------------------------- */

// Query strings stay readable: the delimiters below are legal in a query and
// only get percent-encoded by encodeURIComponent, so we put them back.
function encodeTerritoryShareValue(value) {
  return encodeURIComponent(String(value))
    .replace(/%2C/g, ",")
    .replace(/%3A/g, ":")
    .replace(/%40/g, "@");
}

function joinTerritoryShareValues(included = [], excluded = []) {
  return [...included, ...excluded.map((value) => `-${value}`)].join(",");
}

function serializeTerritoryShareLocationSearch(location) {
  if (!location?.stateCode) return "";

  const fields = [
    location.label || "",
    location.stateCode,
    location.geoLevel || "",
    location.geoKey || "",
    location.coordinates ? Number(location.coordinates.longitude).toFixed(5) : "",
    location.coordinates ? Number(location.coordinates.latitude).toFixed(5) : ""
  ];

  return `${location.excluded ? "-" : ""}${fields.join(":")}`;
}

function buildTerritoryShareParams(filters = {}) {
  const params = [];
  const append = (key, value) => {
    if (value === "" || value == null) return;
    params.push(`${key}=${encodeTerritoryShareValue(value)}`);
  };

  append("state", joinTerritoryShareValues(filters.locations, filters.locationsExcluded));
  append("category", joinTerritoryShareValues(filters.categories, filters.categoriesExcluded));
  append("brand", joinTerritoryShareValues(filters.franchises, filters.franchisesExcluded));
  append("status", (filters.statuses || []).join(","));
  append("level", (filters.geoLevels || []).join(","));
  (filters.locationSearches || []).forEach((location) => {
    append("near", serializeTerritoryShareLocationSearch(location));
  });
  if (filters.investment) {
    append("investment", `${filters.investment.min ?? 0}-${filters.investment.max ?? ""}`);
  }
  if (filters.rating?.min) append("rating", filters.rating.min);
  if (filters.radius?.enabled) append("radius", filters.radius.miles);
  if (filters.viewport) {
    const { west, south, east, north } = filters.viewport;
    append("map", [west, south, east, north].map((value) => Number(value).toFixed(4)).join(","));
  }

  return params;
}

function buildTerritoryShareUrl() {
  const filters = window.territoryFilters?.getCurrentPresetFilters?.() || {};
  const params = buildTerritoryShareParams(filters);
  return params.length
    ? `${TERRITORY_SHARE_PUBLIC_BASE_URL}?${params.join("&")}`
    : TERRITORY_SHARE_PUBLIC_BASE_URL;
}

/* Current query summary ------------------------------------------------- */

function getTerritoryShareRecords() {
  return window.territoryMapFilters?.getMatchingRecords?.() || [];
}

function getTerritoryShareCounts(records) {
  const byStatus = { available: 0, established: 0, sold: 0 };

  records.forEach((record) => {
    if (typeof byStatus[record.status] === "number") byStatus[record.status] += 1;
  });

  return { total: records.length, ...byStatus };
}

function getTerritoryShareBrands(records) {
  const territoriesByBrand = new Map();
  records.forEach((record) => {
    territoriesByBrand.set(record.brandId, (territoriesByBrand.get(record.brandId) || 0) + 1);
  });

  const brands = window.territoryBrands || [];
  return [...territoriesByBrand.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([brandId]) => brands.find((brand) => brand.id === brandId))
    .filter(Boolean);
}

function formatTerritoryShareNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getTerritoryShareHeadline() {
  const summary = window.territoryBrandPanel?.formatAlertName?.() || "";
  return summary.replace(TERRITORY_SHARE_FILTER_TALLY, "") || "Territories";
}

// The summary names the franchise ("…territories from Lawn Pride"). Once that
// name leads the headline, the same words in the line below are a repeat.
function stripTerritoryShareBrandPhrase(summary, brandName) {
  const name = String(brandName || "").trim();
  if (!name) return summary;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return summary
    .replace(new RegExp(`\\s+from\\s+${escaped}\\b`, "i"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// A single-brand search leads with the brand, so the summary drops to a second
// block and the brand carries the heavier weight.
function buildTerritoryShareHeadlineBlocks(brands) {
  const summary = getTerritoryShareHeadline();
  if (brands.length !== 1) return [{ text: summary, weight: 400 }];

  const remainder = stripTerritoryShareBrandPhrase(summary, brands[0].brand);
  const blocks = [{ text: brands[0].brand, weight: 800 }];
  if (remainder && remainder.toLowerCase() !== brands[0].brand.toLowerCase()) {
    blocks.push({ text: remainder, weight: 400 });
  }
  return blocks;
}

// A search for one brand should read as that brand. Pastel is a stand-in for
// telling several brands apart, so a single brand uses its own accent instead.
function getTerritoryShareMapTheme(brands, filters) {
  const included = Array.isArray(filters.franchises) ? filters.franchises.filter(Boolean) : [];
  const singleBrand = brands.length === 1 || (!brands.length && included.length === 1);
  return singleBrand ? { colorMode: "accent" } : null;
}

// The story layout is the focused query: a location and a category, or one
// franchise without a category. Anything else is still shareable, as a map.
function isTerritoryShareStoryQuery(filters = {}) {
  const franchises = Array.isArray(filters.franchises) ? filters.franchises.filter(Boolean) : [];
  const categories = Array.isArray(filters.categories) ? filters.categories.filter(Boolean) : [];
  const categoriesExcluded = Array.isArray(filters.categoriesExcluded)
    ? filters.categoriesExcluded.filter(Boolean)
    : [];
  const hasLocation = (filters.locations || []).some(Boolean)
    || (filters.locationSearches || []).some((location) => location && !location.excluded);
  const categoryUsed = categories.length > 0 || categoriesExcluded.length > 0;

  if (franchises.length > 1) return false;
  if (franchises.length === 1) return !categoryUsed;
  return hasLocation && categories.length > 0;
}

function collectTerritoryShareSnapshot() {
  const records = getTerritoryShareRecords();
  const brands = getTerritoryShareBrands(records);
  const filters = window.territoryFilters?.getCurrentPresetFilters?.() || {};
  const story = isTerritoryShareStoryQuery(filters);
  const preview = window.territoryCrossroad?.buildQueryPreview?.(
    filters,
    story ? TERRITORY_SHARE_MAP_SIZE : TERRITORY_SHARE_MAP_FULL_SIZE,
    getTerritoryShareMapTheme(brands, filters)
  );

  return {
    story,
    headlineBlocks: buildTerritoryShareHeadlineBlocks(brands),
    // The map draws what the query matches, so fall back to the query's own
    // counts rather than captioning a full map with a zero.
    counts: records.length || !preview?.counts
      ? getTerritoryShareCounts(records)
      : preview.counts,
    brands,
    preview
  };
}

/* Meta image ------------------------------------------------------------ */

function loadTerritoryShareImage(src, { crossOrigin = false } = {}) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    if (crossOrigin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// The mark ships without a fill so it inherits currentColor in the UI. The
// canvas has no inheritance, so paint it on the root element instead.
async function loadTerritoryShareBrandMark() {
  try {
    const response = await fetch(window.resolvePublicAssetUrl("../../assets/logo-wefranch-alt.svg"));
    const markup = (await response.text()).replace("<svg", "<svg fill=\"#000000\"");
    return await loadTerritoryShareImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
    );
  } catch (error) {
    return null;
  }
}

function loadTerritoryShareAssets(snapshot) {
  const preview = snapshot.preview || {};

  return Promise.all([
    loadTerritoryShareImage(preview.baseMapUrl, { crossOrigin: true }),
    loadTerritoryShareImage(preview.fillUrl),
    loadTerritoryShareImage(preview.bordersUrl),
    loadTerritoryShareBrandMark(),
    Promise.all(
      snapshot.brands
        .slice(0, TERRITORY_SHARE_LOGO_MAX_VISIBLE)
        .map((brand) => loadTerritoryShareImage(brand.logo))
    )
  ]).then(([baseMap, fill, borders, brandMark, brandLogos]) => ({
    baseMap,
    fill,
    borders,
    brandMark,
    brandLogos
  }));
}

function setTerritoryShareFont(context, weight, size) {
  context.font = `${weight} ${size}px "Poppins", system-ui, sans-serif`;
}

function traceTerritoryShareRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, radius);
    return;
  }

  const limit = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + limit, y);
  context.arcTo(x + width, y, x + width, y + height, limit);
  context.arcTo(x + width, y + height, x, y + height, limit);
  context.arcTo(x, y + height, x, y, limit);
  context.arcTo(x, y, x + width, y, limit);
  context.closePath();
}

function truncateTerritoryShareText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated.trimEnd()}…`;
}

function wrapTerritoryShareText(context, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  return lines;
}

// Each block keeps its own weight and starts on a new line, so a brand name
// reads as its own line above the summary it belongs to.
function wrapTerritoryShareBlocks(context, blocks, size, maxWidth, maxLines) {
  const lines = [];

  blocks.forEach((block) => {
    setTerritoryShareFont(context, block.weight, size);
    wrapTerritoryShareText(context, block.text, maxWidth).forEach((text) => {
      lines.push({ text, weight: block.weight });
    });
  });

  if (lines.length <= maxLines) return { lines, overflowed: false };

  const visible = lines.slice(0, maxLines);
  const last = visible[maxLines - 1];
  setTerritoryShareFont(context, last.weight, size);
  visible[maxLines - 1] = {
    ...last,
    text: truncateTerritoryShareText(
      context,
      `${last.text} ${lines[maxLines].text.split(" ")[0]}`,
      maxWidth
    )
  };

  return { lines: visible, overflowed: true };
}

// Every layer shares one projection, so the same cover crop keeps the base map,
// fills, and borders aligned.
function drawTerritoryShareMap(context, assets, { fullWidth = false } = {}) {
  const stripX = fullWidth ? 0 : TERRITORY_SHARE_PANEL_WIDTH - TERRITORY_SHARE_MAP_SHIFT;
  const stripWidth = TERRITORY_SHARE_IMAGE_WIDTH - stripX;
  const shift = fullWidth ? 0 : TERRITORY_SHARE_MAP_SHIFT;
  const layers = [assets.baseMap, assets.fill, assets.borders].filter(Boolean);
  const reference = layers[0];

  if (!reference) {
    const fallback = context.createLinearGradient(stripX, 0, TERRITORY_SHARE_IMAGE_WIDTH, TERRITORY_SHARE_IMAGE_HEIGHT);
    fallback.addColorStop(0, "#f4f2fb");
    fallback.addColorStop(1, "#e7e3f6");
    context.fillStyle = fallback;
    context.fillRect(stripX, 0, stripWidth, TERRITORY_SHARE_IMAGE_HEIGHT);
    return;
  }

  const scale = Math.max(
    stripWidth / reference.naturalWidth,
    TERRITORY_SHARE_IMAGE_HEIGHT / reference.naturalHeight
  );
  const width = reference.naturalWidth * scale;
  const height = reference.naturalHeight * scale;
  const x = stripX + (stripWidth - width) / 2 + shift;
  const y = (TERRITORY_SHARE_IMAGE_HEIGHT - height) / 2;

  context.save();
  context.beginPath();
  context.rect(stripX, 0, stripWidth, TERRITORY_SHARE_IMAGE_HEIGHT);
  context.clip();
  layers.forEach((layer) => context.drawImage(layer, x, y, width, height));
  context.restore();
}

// A long fade instead of a hard seam, so the copy panel reads as one surface
// with the map rather than a pasted-on box.
function drawTerritorySharePanel(context) {
  const gradient = context.createLinearGradient(
    TERRITORY_SHARE_PANEL_WIDTH,
    0,
    TERRITORY_SHARE_PANEL_WIDTH + TERRITORY_SHARE_PANEL_FADE,
    0
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, TERRITORY_SHARE_PANEL_WIDTH, TERRITORY_SHARE_IMAGE_HEIGHT);
  context.fillStyle = gradient;
  context.fillRect(TERRITORY_SHARE_PANEL_WIDTH, 0, TERRITORY_SHARE_PANEL_FADE, TERRITORY_SHARE_IMAGE_HEIGHT);
}

function drawTerritoryShareMark(context, assets) {
  if (!assets.brandMark) return;

  const size = TERRITORY_SHARE_MARK_SIZE;
  context.drawImage(
    assets.brandMark,
    TERRITORY_SHARE_IMAGE_WIDTH - TERRITORY_SHARE_MARK_INSET - size,
    TERRITORY_SHARE_IMAGE_HEIGHT - TERRITORY_SHARE_MARK_INSET - size,
    size,
    size
  );
}

function drawTerritoryShareBrandLogo(context, logo, x, y, { size, radius, stacked = false } = {}) {
  const outline = TERRITORY_SHARE_LOGO_STACK_OUTLINE;

  // The ring is drawn first so a logo stacked on top cuts a clean edge into
  // the one beneath it.
  if (stacked) {
    traceTerritoryShareRoundedRect(
      context,
      x - outline,
      y - outline,
      size + outline * 2,
      size + outline * 2,
      radius + outline
    );
    context.fillStyle = "#ffffff";
    context.fill();
  }

  context.save();
  traceTerritoryShareRoundedRect(context, x, y, size, size, radius);
  context.fillStyle = "#ffffff";
  context.fill();
  context.clip();

  // Cover the container: logos read as the tile itself, with no white margin.
  if (logo) {
    const scale = Math.max(size / logo.naturalWidth, size / logo.naturalHeight);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    context.drawImage(logo, x + (size - width) / 2, y + (size - height) / 2, width, height);
  }
  context.restore();

  if (stacked) return;

  traceTerritoryShareRoundedRect(context, x + 0.5, y + 0.5, size - 1, size - 1, radius - 0.5);
  context.strokeStyle = "#e7e7e7";
  context.lineWidth = 1;
  context.stroke();
}

// One brand needs no caption — its name leads the headline. Several brands keep
// a count, since no single name can stand for the search.
function withTerritoryShareMapText(context, onMap, draw) {
  if (!onMap) {
    draw();
    return;
  }

  context.save();
  context.shadowColor = "rgba(255, 255, 255, 0.95)";
  context.shadowBlur = 18;
  draw();
  context.restore();
}

function drawTerritoryShareBrandRow(context, snapshot, assets, y, { onMap = false } = {}) {
  if (!snapshot.brands.length) return y;

  const stacked = snapshot.brands.length > 1;
  const size = stacked ? TERRITORY_SHARE_LOGO_STACK_SIZE : TERRITORY_SHARE_LOGO_SIZE;
  const radius = stacked ? TERRITORY_SHARE_LOGO_STACK_RADIUS : TERRITORY_SHARE_LOGO_RADIUS;
  const step = stacked
    ? size - TERRITORY_SHARE_LOGO_STACK_OVERLAP
    : size + TERRITORY_SHARE_LOGO_GAP;
  let x = TERRITORY_SHARE_IMAGE_PADDING;

  assets.brandLogos.forEach((logo, index) => {
    drawTerritoryShareBrandLogo(context, logo, x + index * step, y, { size, radius, stacked });
  });

  if (snapshot.brands.length === 1) return y + size;

  x += (assets.brandLogos.length - 1) * step + size + 16;

  setTerritoryShareFont(context, 500, 22);
  context.fillStyle = "#111111";
  context.textBaseline = "middle";
  withTerritoryShareMapText(context, onMap, () => {
    context.fillText(
      truncateTerritoryShareText(
        context,
        `${formatTerritoryShareNumber(snapshot.brands.length)} franchises`,
        TERRITORY_SHARE_IMAGE_PADDING + TERRITORY_SHARE_TEXT_WIDTH - x
      ),
      x,
      y + size / 2
    );
  });
  context.textBaseline = "alphabetic";

  return y + size;
}

function getTerritoryShareBrandBlock(blocks) {
  return blocks.find((block) => block.weight === 800) || null;
}

// Long names scale down on their own line instead of wrapping. Wrapping was
// what pushed the shared headline size down for some brands and not others.
function fitTerritoryShareSingleLineSize(context, text, weight, size, maxWidth) {
  let fitted = size;
  setTerritoryShareFont(context, weight, fitted);

  while (fitted > 32 && context.measureText(text).width > maxWidth) {
    fitted -= 2;
    setTerritoryShareFont(context, weight, fitted);
  }

  return fitted;
}

// Top-aligned under the brand row. spaceTop is the top edge of the title, so
// short and long headlines start in the same place.
function drawTerritoryShareHeadline(context, snapshot, spaceTop, spaceBottom) {
  const space = Math.max(0, spaceBottom - spaceTop);
  const brandBlock = getTerritoryShareBrandBlock(snapshot.headlineBlocks);
  const summaryBlocks = brandBlock
    ? snapshot.headlineBlocks.filter((block) => block !== brandBlock)
    : snapshot.headlineBlocks;
  let chosen = null;

  // The brand always occupies one line. Step the summary down until it fits in
  // the lines that remain, so every brand shares the same summary size.
  TERRITORY_SHARE_HEADLINE_SIZES.some((size) => {
    const lineHeight = Math.round(size * 1.16);
    const brandLines = brandBlock ? 1 : 0;
    const maxLines = Math.max(1, Math.min(
      TERRITORY_SHARE_HEADLINE_MAX_LINES - brandLines,
      Math.floor(space / lineHeight) - brandLines
    ));

    if (!summaryBlocks.length) {
      chosen = { size, lineHeight, lines: [] };
      return true;
    }

    const wrapped = wrapTerritoryShareBlocks(
      context,
      summaryBlocks,
      size,
      TERRITORY_SHARE_TEXT_WIDTH,
      maxLines
    );
    chosen = { size, lineHeight, lines: wrapped.lines };
    return !wrapped.overflowed;
  });
  if (!chosen) return;

  const lines = [];
  if (brandBlock) {
    lines.push({
      text: brandBlock.text,
      weight: brandBlock.weight,
      size: fitTerritoryShareSingleLineSize(
        context,
        brandBlock.text,
        brandBlock.weight,
        chosen.size,
        TERRITORY_SHARE_BRAND_TEXT_WIDTH
      )
    });
  }
  chosen.lines.forEach((line) => {
    lines.push({ text: line.text, weight: line.weight, size: chosen.size });
  });

  if (!lines.length) return;

  context.fillStyle = "#050505";
  const first = lines[0];
  setTerritoryShareFont(context, first.weight, first.size);
  const ascent = context.measureText(first.text).actualBoundingBoxAscent || first.size;
  const firstBaseline = spaceTop + ascent;

  lines.forEach((line, index) => {
    setTerritoryShareFont(context, line.weight, line.size);
    context.fillText(
      line.text,
      TERRITORY_SHARE_IMAGE_PADDING,
      firstBaseline + index * chosen.lineHeight
    );
  });
}

function drawTerritoryShareCounts(context, snapshot, { onMap = false } = {}) {
  const total = formatTerritoryShareNumber(snapshot.counts.total);

  setTerritoryShareFont(context, 800, TERRITORY_SHARE_COUNT_SIZE);
  const totalWidth = context.measureText(total).width;
  context.fillStyle = "#050505";
  withTerritoryShareMapText(context, onMap, () => {
    context.fillText(total, TERRITORY_SHARE_IMAGE_PADDING, TERRITORY_SHARE_COUNTS_BASELINE);
  });

  setTerritoryShareFont(context, 400, TERRITORY_SHARE_COUNT_LABEL_SIZE);
  context.fillStyle = "#050505";
  withTerritoryShareMapText(context, onMap, () => {
    context.fillText(
      snapshot.counts.total === 1 ? "territory" : "territories",
      TERRITORY_SHARE_IMAGE_PADDING + totalWidth + 16,
      TERRITORY_SHARE_COUNTS_BASELINE
    );
  });
}

async function renderTerritoryShareImage() {
  const context = territoryShareCanvas?.getContext("2d");
  if (!context) return;

  const token = ++territoryShareRenderToken;
  const snapshot = collectTerritoryShareSnapshot();
  const [assets] = await Promise.all([
    loadTerritoryShareAssets(snapshot),
    document.fonts?.load?.("800 120px Poppins"),
    document.fonts?.ready
  ]);
  if (token !== territoryShareRenderToken) return;

  context.clearRect(0, 0, TERRITORY_SHARE_IMAGE_WIDTH, TERRITORY_SHARE_IMAGE_HEIGHT);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, TERRITORY_SHARE_IMAGE_WIDTH, TERRITORY_SHARE_IMAGE_HEIGHT);

  const fullMap = !snapshot.story;

  drawTerritoryShareMap(context, assets, { fullWidth: fullMap });
  if (!fullMap) drawTerritorySharePanel(context);
  drawTerritoryShareMark(context, assets);

  const brandRowBottom = drawTerritoryShareBrandRow(
    context,
    snapshot,
    assets,
    TERRITORY_SHARE_IMAGE_PADDING,
    { onMap: fullMap }
  );
  if (!fullMap) {
    drawTerritoryShareHeadline(
      context,
      snapshot,
      brandRowBottom + TERRITORY_SHARE_HEADLINE_GAP,
      TERRITORY_SHARE_COUNTS_TOP - 28
    );
  }
  drawTerritoryShareCounts(context, snapshot, { onMap: fullMap });
}

function buildTerritoryShareImageName() {
  const slug = getTerritoryShareHeadline()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `wefranch-${slug || "territories"}.png`;
}

function downloadTerritoryShareImage() {
  territoryShareCanvas?.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTerritoryShareImageName();
    link.click();
    // Revoking in the same task can cancel the download before it starts.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, "image/png");
}

/* Copy link ------------------------------------------------------------- */

function setTerritoryShareCopyLabel(button, label) {
  const target = button.querySelector("span") || button;
  target.textContent = label;
}

function resetTerritoryShareCopyButtons() {
  territoryShareCopyButtons.forEach((button) => {
    const timer = territoryShareCopiedTimers.get(button);
    if (timer) window.clearTimeout(timer);
    territoryShareCopiedTimers.delete(button);
    button.classList.remove("is-copied");
    setTerritoryShareCopyLabel(button, button.dataset.copyLabel || "Copy link");
  });
}

function markTerritoryShareCopied(button) {
  const timer = territoryShareCopiedTimers.get(button);
  if (timer) window.clearTimeout(timer);

  button.classList.add("is-copied");
  setTerritoryShareCopyLabel(button, button.dataset.copiedLabel || "Copied");

  territoryShareCopiedTimers.set(button, window.setTimeout(() => {
    territoryShareCopiedTimers.delete(button);
    button.classList.remove("is-copied");
    setTerritoryShareCopyLabel(button, button.dataset.copyLabel || "Copy link");
  }, TERRITORY_SHARE_COPIED_RESET_MS));
}

async function copyTerritoryShareUrl(button) {
  const url = territoryShareUrlInput?.value || "";
  if (!url) return;

  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  markTerritoryShareCopied(button);
}

/* Dialog --------------------------------------------------------------- */

const territoryShareModalApi = window.createProtoModal({
  overlay: territoryShareModalOverlay,
  onClose: resetTerritoryShareCopyButtons
});

function syncTerritoryShareAvailability() {
  const button = document.getElementById("territoryShareBtn");
  if (!button) return;

  button.disabled = false;
  button.removeAttribute("title");
}

function openTerritoryShareModal(trigger = null) {
  if (!territoryShareModalOverlay) return;

  resetTerritoryShareCopyButtons();
  if (territoryShareUrlInput) {
    territoryShareUrlInput.value = buildTerritoryShareUrl();
    territoryShareUrlInput.scrollLeft = 0;
  }
  renderTerritoryShareImage();

  territoryShareModalApi.open(trigger, { focus: territoryShareSubmitBtn });
}

// A normal scroll gesture moves the link sideways. The field stays one line,
// so there is no vertical overflow to scroll.
territoryShareUrlInput?.addEventListener("wheel", (event) => {
  if (territoryShareUrlInput.scrollWidth <= territoryShareUrlInput.clientWidth) return;

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;

  territoryShareUrlInput.scrollLeft += delta;
  event.preventDefault();
}, { passive: false });

document.getElementById("territoryShareBtn")?.addEventListener("click", (event) => {
  openTerritoryShareModal(event.currentTarget);
});

territoryShareCopyButtons.forEach((button) => {
  button.addEventListener("click", () => copyTerritoryShareUrl(button));
});

territoryShareDownloadBtn?.addEventListener("click", downloadTerritoryShareImage);

// Readonly links are for copying, not editing: a click should hand over the
// whole URL rather than drop a caret inside it.
territoryShareUrlInput?.addEventListener("focus", () => {
  territoryShareUrlInput.select();
});

window.territoryShareModal = {
  open: openTerritoryShareModal,
  close: () => territoryShareModalApi.close(),
  syncAvailability: syncTerritoryShareAvailability
};

syncTerritoryShareAvailability();
