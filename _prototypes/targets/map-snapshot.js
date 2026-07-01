(function () {
  const MAPBOX_ACCESS_TOKEN = window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
  const MAPBOX_STYLE = "nubeek/cka7zizn720s71iogpmkvmw5z";
  const DEFAULT_WIDTH = 640;
  const DEFAULT_HEIGHT = 320;
  const MAX_DOTS = 56;
  const MIN_DOTS = 40;
  const BBOX_PADDING = 0.12;
  const MAP_PADDING_PX = 8;
  const DOT_FILL_OPACITY = 0.78;
  const DOT_STROKE_WIDTH = 1;
  const DOT_STROKE_COLOR = "ffffff";
  const DOT_RADIUS_PX = 5;
  const MAX_STATIC_URL_LENGTH = 8000;

  function hashSeed(value) {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function createSeededRandom(seed) {
    let state = seed >>> 0;

    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function encodeSignedNumber(number) {
    let value = number << 1;

    if (number < 0) {
      value = ~value;
    }

    let output = "";

    while (value >= 0x20) {
      output += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }

    output += String.fromCharCode(value + 63);
    return output;
  }

  function encodePolyline(coordinates) {
    let output = "";
    let previousLat = 0;
    let previousLng = 0;

    coordinates.forEach(([lat, lng]) => {
      const latE5 = Math.round(lat * 1e5);
      const lngE5 = Math.round(lng * 1e5);

      output += encodeSignedNumber(latE5 - previousLat);
      output += encodeSignedNumber(lngE5 - previousLng);
      previousLat = latE5;
      previousLng = lngE5;
    });

    return encodeURIComponent(output);
  }

  function normalizeLocationLabel(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "");
  }

  function resolveStateName(token) {
    const normalized = normalizeLocationLabel(token);
    if (!normalized) return null;

    return window.TARGET_STATE_ALIASES?.[normalized] || null;
  }

  function parseLocationStates(locationText) {
    const normalizedLocation = normalizeLocationLabel(locationText);

    if (window.TARGET_MAP_NATIONWIDE_LABELS?.has(normalizedLocation)) {
      return [];
    }

    const tokens = String(locationText || "")
      .split(/[,/&]+|\band\b/gi)
      .map((token) => token.trim())
      .filter(Boolean);

    const matchedStates = new Set();

    tokens.forEach((token) => {
      const stateName = resolveStateName(token);
      if (stateName) {
        matchedStates.add(stateName);
      }
    });

    if (!matchedStates.size) {
      Object.keys(window.TARGET_STATE_BOUNDS || {}).forEach((stateName) => {
        if (normalizedLocation.includes(normalizeLocationLabel(stateName))) {
          matchedStates.add(stateName);
        }
      });
    }

    return Array.from(matchedStates);
  }

  function getStateBounds(stateName) {
    return window.TARGET_STATE_BOUNDS?.[stateName] || null;
  }

  function unionBounds(boundsList) {
    if (!boundsList.length) {
      return [...window.TARGET_MAP_NATIONWIDE_BOUNDS];
    }

    return boundsList.reduce(
      (accumulator, bounds) => [
        Math.min(accumulator[0], bounds[0]),
        Math.min(accumulator[1], bounds[1]),
        Math.max(accumulator[2], bounds[2]),
        Math.max(accumulator[3], bounds[3])
      ],
      boundsList[0]
    );
  }

  function padBounds(bounds, padding = BBOX_PADDING) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const lonSpan = maxLon - minLon;
    const latSpan = maxLat - minLat;

    return [
      minLon - lonSpan * padding,
      minLat - latSpan * padding,
      maxLon + lonSpan * padding,
      maxLat + latSpan * padding
    ];
  }

  function getLocationForMap(target) {
    return target.mapLocation || target.location;
  }

  function getBoundsSpan(bounds) {
    return Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
  }

  function getDotPolygonSegments(bounds) {
    const span = getBoundsSpan(bounds);

    if (span > 20) return 6;
    if (span > 12) return 8;
    return 10;
  }

  function getTargetBounds(target) {
    const stateNames = parseLocationStates(getLocationForMap(target));
    const stateBounds = stateNames
      .map(getStateBounds)
      .filter(Boolean);

    return padBounds(unionBounds(stateBounds));
  }

  function pickStateBoundsForPoint(stateNames, random) {
    if (!stateNames.length) {
      return window.TARGET_MAP_NATIONWIDE_BOUNDS;
    }

    const stateName = stateNames[Math.floor(random() * stateNames.length)];
    return getStateBounds(stateName) || window.TARGET_MAP_NATIONWIDE_BOUNDS;
  }

  function randomPointInBounds(bounds, random) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const inset = 0.05;
    const lonSpan = maxLon - minLon;
    const latSpan = maxLat - minLat;

    return {
      lat: minLat + latSpan * (inset + random() * (1 - inset * 2)),
      lng: minLon + lonSpan * (inset + random() * (1 - inset * 2))
    };
  }

  function randomPointOnLand(bounds, random, maxAttempts = 60) {
    let fallback = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const point = randomPointInBounds(bounds, random);
      fallback = point;

      if (typeof window.isOnNorthAmericaLand !== "function" || window.isOnNorthAmericaLand(point)) {
        return point;
      }
    }

    return fallback;
  }

  function getDotRadiusDeg(bounds, width, height) {
    const lonSpan = bounds[2] - bounds[0];
    const latSpan = bounds[3] - bounds[1];
    const degreesPerPixel = Math.max(lonSpan / width, latSpan / height);

    return degreesPerPixel * DOT_RADIUS_PX;
  }

  function createDotPolygon(lat, lng, radiusDeg, segments = 10) {
    const coordinates = [];

    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const latOffset = Math.cos(angle) * radiusDeg;
      const lngOffset = Math.sin(angle) * radiusDeg / Math.max(Math.cos((lat * Math.PI) / 180), 0.35);

      coordinates.push([lat + latOffset, lng + lngOffset]);
    }

    return coordinates;
  }

  function stripHash(color) {
    return String(color || "").replace(/^#/, "");
  }

  function createDotOverlay(point, color, bounds, width, height, segments = 10) {
    const fillColor = stripHash(color);
    const polyline = encodePolyline(createDotPolygon(
      point.lat,
      point.lng,
      getDotRadiusDeg(bounds, width, height),
      segments
    ));
    return `path-${DOT_STROKE_WIDTH}+${DOT_STROKE_COLOR}-1+${fillColor}-${DOT_FILL_OPACITY}(${polyline})`;
  }

  function buildTargetMapSnapshotUrl(target, bounds, points, options = {}) {
    const width = options.width || DEFAULT_WIDTH;
    const height = options.height || DEFAULT_HEIGHT;
    const segments = options.segments ?? getDotPolygonSegments(bounds);
    const overlays = points
      .map((point) => createDotOverlay(point, point.color, bounds, width, height, segments))
      .join(",");
    const bbox = `[${bounds.map((value) => value.toFixed(4)).join(",")}]`;
    const overlaySegment = overlays ? `${overlays}/` : "";
    const params = new URLSearchParams({
      padding: String(options.padding ?? MAP_PADDING_PX),
      access_token: MAPBOX_ACCESS_TOKEN
    });

    return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/${overlaySegment}${bbox}/${width}x${height}@2x?${params.toString()}`;
  }

  function generateTargetPoints(target, dotCountOverride) {
    const stateNames = parseLocationStates(getLocationForMap(target));
    const dotCount = dotCountOverride ?? Math.min(Math.max(MIN_DOTS, target.prospects || MIN_DOTS), MAX_DOTS);
    const random = createSeededRandom(hashSeed(target.slug || target.name || "target"));
    const colors = window.TARGET_MAP_DOT_COLORS || ["#8772df"];
    const points = [];

    for (let index = 0; index < dotCount; index += 1) {
      const bounds = pickStateBoundsForPoint(stateNames, random);
      const point = randomPointOnLand(bounds, random);

      points.push({
        ...point,
        color: colors[index % colors.length]
      });
    }

    return points;
  }

  function getTargetMapSnapshotUrl(target, options = {}) {
    if (!MAPBOX_ACCESS_TOKEN) return "";

    const bounds = getTargetBounds(target);
    const maxDots = Math.min(Math.max(MIN_DOTS, target.prospects || MIN_DOTS), MAX_DOTS);
    let dotCount = maxDots;
    let url = "";

    do {
      const points = generateTargetPoints(target, dotCount);
      url = buildTargetMapSnapshotUrl(target, bounds, points, options);

      if (url.length <= MAX_STATIC_URL_LENGTH || dotCount <= MIN_DOTS) {
        break;
      }

      dotCount -= 4;
    } while (dotCount >= MIN_DOTS);

    return url;
  }

  window.getTargetMapSnapshotUrl = getTargetMapSnapshotUrl;
})();
