function scheduleOwnersMapResize() {
  if (!ownersMap || ownersMapResizeFrame !== null) return;

  ownersMapResizeFrame = requestAnimationFrame(() => {
    ownersMapResizeFrame = null;
    resizeOwnersMap();
  });
}

function ensureOwnersMapResizeObserver() {
  if (ownersMapResizeObserver || typeof ResizeObserver !== "function") return;

  const ownersMapContainer = document.getElementById("ownersMap");
  if (!ownersMapContainer) return;

  ownersMapResizeObserver = new ResizeObserver(() => {
    scheduleOwnersMapResize();
  });
  ownersMapResizeObserver.observe(ownersMapContainer);
}

function usesReducedMotion() {
  return reduceMotionEnabled;
}

function getMotionDelay(delay) {
  return usesReducedMotion() ? 0 : delay;
}

const CST_MAPBOX_GL_SRC = "https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js";
let cstMapboxGlLoader = null;

function ensureCstMapboxGl() {
  if (window.mapboxgl) return Promise.resolve();
  if (cstMapboxGlLoader) return cstMapboxGlLoader;

  cstMapboxGlLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CST_MAPBOX_GL_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Mapbox GL."));
    document.head.append(script);
  });
  return cstMapboxGlLoader;
}

function getLocationSearchCoordinates(search, { allowRegion = false } = {}) {
  if (!search) return null;
  if (!allowRegion && isRegionOnlyLocationSearch(search)) return null;

  const storedLongitude = Number(search?.coordinates?.longitude);
  const storedLatitude = Number(search?.coordinates?.latitude);
  const regionCenter = window.cstLocationSearch?.getRegionCenter?.(search?.stateCode)
    || window.cstLocationSearch?.getRegionCenter?.(
      window.cstLocationSearch?.getRegionCodeFromLabel?.(search?.label)
    );
  const longitude = Number.isFinite(storedLongitude) ? storedLongitude : Number(regionCenter?.longitude);
  const latitude = Number.isFinite(storedLatitude) ? storedLatitude : Number(regionCenter?.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  return {
    label: search.label,
    lat: latitude,
    lng: longitude
  };
}

function getRadiusCenterForSearch(search) {
  return getLocationSearchCoordinates(search, { allowRegion: true });
}

function getMapFilterLocationCenter(locationLabel) {
  if (!locationLabel) return null;

  const searchMatch = [...selectedLocationSearches, ...excludedLocationSearches]
    .find((search) => search.label === locationLabel);
  const searchCenter = getLocationSearchCoordinates(searchMatch);
  if (searchCenter) return searchCenter;

  const locationCenters = [];

  if (typeof OWNER_LOCATION_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_LOCATION_CENTERS);
  }

  if (typeof OWNER_HEADQUARTERS_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_HEADQUARTERS_CENTERS);
  }

  const knownCenter = locationCenters.find((location) => location.label === locationLabel);
  if (knownCenter) return knownCenter;

  const regionCode = window.cstLocationSearch?.getRegionCodeFromLabel?.(locationLabel);
  const regionCenter = window.cstLocationSearch?.getRegionCenter?.(regionCode);
  if (!regionCenter) return null;

  return {
    label: locationLabel,
    lat: regionCenter.latitude,
    lng: regionCenter.longitude
  };
}

function getLocationDistanceMiles(location, center) {
  const latitudeDelta = (location.lat - center.lat) * Math.PI / 180;
  const longitudeDelta = (location.lng - center.lng) * Math.PI / 180;
  const locationLatitude = location.lat * Math.PI / 180;
  const centerLatitude = center.lat * Math.PI / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(locationLatitude) * Math.cos(centerLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 3958.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isRegionOnlyLocationSearch(search) {
  return Boolean(window.cstLocationSearch?.isRegionSearch?.(search) || (
    search?.geoLevel === "region" && search?.stateCode && !search?.geoKey
  ));
}

function getIncludedLocationStateCodes() {
  const regionSearches = [
    ...selectedLocationSearches,
    ...selectedLocationLabels.map((label) => window.cstLocationSearch?.fromLabel?.(label))
  ].filter((search) => isRegionOnlyLocationSearch(search));

  return [...new Set(regionSearches.map((search) => search.stateCode).filter(Boolean))];
}

function locationRecordMatchesStateCap(location, stateCodes = getIncludedLocationStateCodes()) {
  if (!stateCodes.length) return true;
  return stateCodes.some((stateCode) => (
    window.cstLocationSearch?.locationIsInRegion?.(location, stateCode)
  ));
}

function getSelectedRegionFitBounds() {
  if (isRadiusFilterActive()) return null;

  const regionSearches = selectedLocationSearches.filter((search) => isRegionOnlyLocationSearch(search));
  if (!regionSearches.length) return null;
  if (userLocationCenter) return null;
  if (selectedLocationSearches.some((search) => search && !isRegionOnlyLocationSearch(search))) return null;

  const boundsList = regionSearches
    .map((search) => window.cstLocationSearch?.getRegionBounds?.(search.stateCode))
    .filter((bounds) => Array.isArray(bounds) && bounds.length === 4);

  if (!boundsList.length) return null;

  return boundsList.reduce((union, [west, south, east, north]) => {
    union.extend([west, south]);
    union.extend([east, north]);
    return union;
  }, new mapboxgl.LngLatBounds(
    [boundsList[0][0], boundsList[0][1]],
    [boundsList[0][2], boundsList[0][3]]
  ));
}

function getSelectedRadiusCenters() {
  const searchCenters = selectedLocationSearches.map(getRadiusCenterForSearch);
  const labelCenters = selectedLocationLabels.map((label) => {
    const search = selectedLocationSearches.find((item) => item.label === label)
      || window.cstLocationSearch?.fromLabel?.(label);
    return getRadiusCenterForSearch(search) || getMapFilterLocationCenter(label);
  });
  const centers = [
    ...searchCenters,
    ...labelCenters
  ].filter(Boolean);

  if (userLocationCenter) {
    centers.push(userLocationCenter);
  }

  const seen = new Set();
  return centers.filter((center) => {
    const key = `${Number(center.lat).toFixed(5)}:${Number(center.lng).toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function locationRecordMatchesSearchList(location, searches = []) {
  return searches.some((search) => window.cstLocationSearch?.matchesLocation?.(location, search));
}

function locationRecordMatchesSelectedLabels(location, labels = []) {
  const locationLabel = location?.label || location?.location || "";
  if (labels.includes(locationLabel)) return true;

  return labels.some((label) => {
    const search = window.cstLocationSearch?.fromLabel?.(label);
    return Boolean(search && window.cstLocationSearch?.matchesLocation?.(location, search));
  });
}

function isRadiusFilterActive() {
  return radiusFilterEnabled && getSelectedRadiusCenters().length > 0;
}

function locationWithinSelectedRadius(location) {
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return false;

  return getSelectedRadiusCenters().some(
    (center) => getLocationDistanceMiles(location, center) <= selectedRadiusMiles
  );
}

function locationRecordIsInSelectedRegion(location) {
  const stateCodes = getIncludedLocationStateCodes();
  if (!stateCodes.length) return false;
  return locationRecordMatchesStateCap(location, stateCodes);
}

function locationRecordMatchesActiveRadius(location) {
  if (locationRecordIsInSelectedRegion(location)) return true;
  return locationWithinSelectedRadius(location);
}

function locationRecordIsExcluded(location) {
  if (locationRecordMatchesSearchList(location, excludedLocationSearches)) return true;
  if (!excludedLocationLabels.length) return false;
  return locationRecordMatchesSelectedLabels(location, excludedLocationLabels);
}

function locationRecordMatchesIncludedSelection(location) {
  const hasIncludedSearches = selectedLocationSearches.length > 0;
  const hasIncludedLabels = selectedLocationLabels.length > 0;
  if (!hasIncludedSearches && !hasIncludedLabels) return true;

  // Labels are already resolved into selectedLocationSearches by the filter
  // panel and splash restore. Re-parsing every label per unit is redundant.
  if (hasIncludedSearches) {
    return locationRecordMatchesSearchList(location, selectedLocationSearches);
  }

  return locationRecordMatchesSelectedLabels(location, selectedLocationLabels);
}

function rowMatchesLocationFilter(row) {
  const location = {
    label: row.location,
    location: row.location,
    lat: row.lat,
    lng: row.lng,
    state: row.state,
    stateCode: row.stateCode
  };

  if (locationRecordIsExcluded(location)) return false;

  if (isRadiusFilterActive()) {
    return locationRecordMatchesActiveRadius(location);
  }

  if (!locationRecordMatchesIncludedSelection(location)) return false;
  return locationRecordMatchesStateCap(location);
}

function getMapPointFranchise(location) {
  const assigned = String(location.franchise || "").trim();
  if (assigned && !assigned.includes(",")) return assigned;
  if (Array.isArray(location.franchises) && location.franchises.length === 1) {
    return String(location.franchises[0]).trim();
  }
  return assigned.split(",")[0].trim();
}

function mapLocationMatchesSelectedFranchise(location) {
  if (!selectedFranchiseIndexes.length && !excludedFranchiseIndexes.length) return true;

  const franchise = getMapPointFranchise(location);
  if (excludedFranchiseIndexes.includes(franchise)) return false;
  if (!selectedFranchiseIndexes.length) return true;
  return selectedFranchiseIndexes.includes(franchise);
}

function mapLocationMatchesSelectedFilter(location) {
  if (locationRecordIsExcluded(location)) return false;

  if (isRadiusFilterActive()) {
    return locationRecordMatchesActiveRadius(location);
  }

  if (!selectedLocationSearches.length && !selectedLocationLabels.length) return true;
  if (!locationRecordMatchesIncludedSelection(location)) return false;
  if (!locationRecordMatchesStateCap(location)) return false;

  const selectedSearch = selectedLocationSearches.find((search) => (
    window.cstLocationSearch?.matchesLocation?.(location, search)
  ));
  if (selectedSearch?.geoLevel === "region") return true;

  const selectedMapLocationCenter = getLocationSearchCoordinates(selectedSearch)
    || getMapFilterLocationCenter(location.label);
  if (!selectedMapLocationCenter) return true;

  return getLocationDistanceMiles(location, selectedMapLocationCenter) <= MAP_LOCATION_FILTER_RADIUS_MILES;
}

const OWNERS_MAP_CIRCLE_LAYER_IDS = ["owner-points", "owner-points-hover"];
const OWNERS_MAP_LOGO_LAYER_IDS = ["owner-points-logos", "owner-points-logos-hover"];
const MAP_LOGO_IMAGE_PREFIX = "owner-franchise-logo-";
const ownersMapLogoFranchiseByImageId = new Map();
const ownersMapLogoLoads = new Map();

function getMapLogoImageId(franchise) {
  const slug = (typeof getFranchiseSlug === "function"
    ? getFranchiseSlug(franchise || "")
    : "") || "unknown";
  return `${MAP_LOGO_IMAGE_PREFIX}${slug}`;
}

function roundMapLogoPath(context, x, y, size, radius) {
  const cornerRadius = Math.min(radius, size / 2);

  context.beginPath();
  context.moveTo(x + cornerRadius, y);
  context.lineTo(x + size - cornerRadius, y);
  context.quadraticCurveTo(x + size, y, x + size, y + cornerRadius);
  context.lineTo(x + size, y + size - cornerRadius);
  context.quadraticCurveTo(x + size, y + size, x + size - cornerRadius, y + size);
  context.lineTo(x + cornerRadius, y + size);
  context.quadraticCurveTo(x, y + size, x, y + size - cornerRadius);
  context.lineTo(x, y + cornerRadius);
  context.quadraticCurveTo(x, y, x + cornerRadius, y);
  context.closePath();
}

function drawContainedMapLogoImage(context, image, x, y, size) {
  const width = image.width || image.naturalWidth || size;
  const height = image.height || image.naturalHeight || size;
  if (!width || !height) return;

  const scale = Math.min(size / width, size / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  context.drawImage(
    image,
    x + (size - drawWidth) / 2,
    y + (size - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

function createOwnersMapLogoImageData(sourceImage, fallbackColor) {
  const pixelRatio = MAP_LOGO_TEXTURE_PIXEL_RATIO;
  const logoSize = MAP_LOGO_DISPLAY_SIZE * pixelRatio;
  const radius = 8 * pixelRatio;
  const shadowBlur = 6 * pixelRatio;
  const shadowOffsetY = 2 * pixelRatio;
  const padding = Math.ceil(shadowBlur + shadowOffsetY + pixelRatio);
  const textureSize = logoSize + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const x = padding;
  const y = padding;

  context.save();
  context.shadowColor = "rgba(17, 17, 17, 0.22)";
  context.shadowBlur = shadowBlur;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = shadowOffsetY;
  context.fillStyle = sourceImage ? "#ffffff" : (fallbackColor || FRANCHISE_ACCENT_COLOR_FALLBACK);
  roundMapLogoPath(context, x, y, logoSize, radius);
  context.fill();
  context.restore();

  if (sourceImage) {
    context.save();
    roundMapLogoPath(context, x, y, logoSize, radius);
    context.clip();
    drawContainedMapLogoImage(context, sourceImage, x, y, logoSize);
    context.restore();
  }

  context.save();
  context.strokeStyle = "#e7e7e7";
  context.lineWidth = pixelRatio;
  roundMapLogoPath(context, x + 0.5, y + 0.5, logoSize - 1, Math.max(0, radius - 0.5));
  context.stroke();
  context.restore();

  return context.getImageData(0, 0, textureSize, textureSize);
}

function loadOwnersMapLogoBitmap(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load map logo ${src}`));
    image.src = src;
  });
}

function getOwnersMapLogoFallbackColor(franchise) {
  return (typeof getFranchiseAccentColor === "function"
    ? getFranchiseAccentColor(franchise)
    : null) || FRANCHISE_ACCENT_COLOR_FALLBACK;
}

function addOrUpdateOwnersMapLogoImage(imageId, imageData) {
  if (!ownersMap || !imageData) return;

  if (ownersMap.hasImage(imageId)) {
    ownersMap.updateImage(imageId, imageData);
    return;
  }

  ownersMap.addImage(imageId, imageData, { pixelRatio: MAP_LOGO_TEXTURE_PIXEL_RATIO });
}

async function loadOwnersMapFranchiseLogo(franchise, imageId) {
  const fallbackColor = getOwnersMapLogoFallbackColor(franchise);
  const fallbackImage = createOwnersMapLogoImageData(null, fallbackColor);
  addOrUpdateOwnersMapLogoImage(imageId, fallbackImage);

  if (typeof getFranchiseLogoSrc !== "function") return;

  try {
    const image = await loadOwnersMapLogoBitmap(getFranchiseLogoSrc(franchise));
    addOrUpdateOwnersMapLogoImage(imageId, createOwnersMapLogoImageData(image, fallbackColor));
  } catch (_error) {
    addOrUpdateOwnersMapLogoImage(imageId, fallbackImage);
  }
}

function ensureOwnersMapFranchiseLogo(franchise) {
  if (!ownersMap) return Promise.resolve();

  const imageId = getMapLogoImageId(franchise);
  ownersMapLogoFranchiseByImageId.set(imageId, franchise);

  const pending = ownersMapLogoLoads.get(imageId);
  if (pending) return pending;

  const load = loadOwnersMapFranchiseLogo(franchise, imageId);
  ownersMapLogoLoads.set(imageId, load);
  return load;
}

function ensureOwnersMapFranchiseLogos(features) {
  if (!ownersMap) return Promise.resolve();

  const franchises = new Set();
  features.forEach((feature) => {
    const franchise = feature?.properties?.franchise;
    if (franchise) franchises.add(franchise);
  });

  return Promise.all(Array.from(franchises, (franchise) => ensureOwnersMapFranchiseLogo(franchise)));
}

function bindOwnersMapLogoImageFallback() {
  if (!ownersMap) return;

  ownersMap.on("styleimagemissing", (event) => {
    const imageId = event?.id;
    if (!imageId || !imageId.startsWith(MAP_LOGO_IMAGE_PREFIX) || ownersMap.hasImage(imageId)) {
      return;
    }

    const franchise = ownersMapLogoFranchiseByImageId.get(imageId) || "";
    addOrUpdateOwnersMapLogoImage(
      imageId,
      createOwnersMapLogoImageData(null, getOwnersMapLogoFallbackColor(franchise))
    );
    void ensureOwnersMapFranchiseLogo(franchise);
  });
}

let mapPointFeaturesCache = null;

function getMapPointFeatures(ownerIndex = activeMapOwnerIndex) {
  const cacheKey = typeof getCstFilterResultCacheKey === "function"
    ? getCstFilterResultCacheKey(ownerIndex)
    : `${ownerIndex}|${selectedLocationLabels.join("|")}|${selectedFranchiseIndexes.join("|")}|${searchQuery}`;
  if (mapPointFeaturesCache?.key === cacheKey) {
    return mapPointFeaturesCache.features;
  }
  const selectedMapOwnerIndexes = selectedOwnerIndexes.length
    ? new Set(selectedOwnerIndexes.map(Number))
    : null;
  const excludedMapOwnerIndexes = excludedOwnerIndexes.length
    ? new Set(excludedOwnerIndexes.map(Number))
    : null;
  const filteredMapOwnerIndexes = ownerIndex === null
    ? new Set(getFilteredFranchisees().map((owner) => owner.originalIndex))
    : null;

  const features = (window.ownerLocationsData || [])
    .flatMap((owner, index) => {
      if (ownerIndex !== null && index !== ownerIndex) return [];
      if (filteredMapOwnerIndexes && !filteredMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && selectedMapOwnerIndexes?.size && !selectedMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && excludedMapOwnerIndexes?.has(index)) return [];

      return owner.locations
        .filter((location) => (
          mapLocationMatchesSelectedFilter(location)
          && (ownerIndex !== null || mapLocationMatchesSelectedFranchise(location))
        ))
        .map((location, locationIndex) => {
          const franchise = getMapPointFranchise(location);
          const logoImageId = getMapLogoImageId(franchise);
          ownersMapLogoFranchiseByImageId.set(logoImageId, franchise);

          return {
            type: "Feature",
            properties: {
              featureId: `${index}-${locationIndex}-${location.lng}-${location.lat}`,
              ownerIndex: index,
              locationRowId: location.id || `${index}-${locationIndex}`,
              ownerName: owner.ownerName,
              locationLabel: location.label,
              franchise,
              logoImageId,
              color: (typeof getFranchiseAccentColor === "function"
                ? getFranchiseAccentColor(franchise)
                : location.color) || FRANCHISE_ACCENT_COLOR_FALLBACK
            },
            geometry: {
              type: "Point",
              coordinates: [location.lng, location.lat]
            }
          };
        });
    });
  mapPointFeaturesCache = { key: cacheKey, features };
  return features;
}

function getOwnersMapPointFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: getMapPointFeatures()
  };
}

function setOwnersMapPointData(collection) {
  ownersMap?.getSource("owner-points")?.setData(collection);
  void ensureOwnersMapFranchiseLogos(collection?.features || []);
}

function refreshOwnersMapPointData() {
  if (!ownersMap?.getSource("owner-points")) return;

  ownersMapPointHover?.clearHover();
  if (usesReducedMotion()) {
    cancelOwnersMapReveal({ hideBusy: true });
  }
  commitOwnersMapPointCollections();
}

function getOwnerMapPointFeatureCollection(ownerIndex) {
  return {
    type: "FeatureCollection",
    features: getMapPointFeatures(ownerIndex)
  };
}

function createRadiusCircleFeature(center, radiusMiles, pointCount = 96) {
  const earthRadiusMiles = 3958.8;
  const centerLatitude = (center.lat * Math.PI) / 180;
  const centerLongitude = (center.lng * Math.PI) / 180;
  const angularDistance = radiusMiles / earthRadiusMiles;
  const ring = [];

  for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
    const bearing = (pointIndex / pointCount) * 2 * Math.PI;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
      Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLongitude = centerLongitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
      Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(pointLatitude)
    );

    ring.push([(pointLongitude * 180) / Math.PI, (pointLatitude * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    properties: { label: center.label },
    geometry: { type: "Polygon", coordinates: [ring] }
  };
}

function getRadiusCircleFeatureCollection() {
  if (!isRadiusFilterActive()) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: getSelectedRadiusCenters().map(
      (center) => createRadiusCircleFeature(center, selectedRadiusMiles)
    )
  };
}

function getOwnersMapFocusDuration() {
  return usesReducedMotion() ? 0 : MAP_FOCUS_DURATION;
}

function flyMapToBounds(mapInstance, bounds, { padding = MAP_FIT_PADDING, maxZoom = 9 } = {}) {
  if (!mapInstance || !bounds || !window.mapboxgl) return false;

  const camera = mapInstance.cameraForBounds(bounds, { padding, maxZoom });
  if (!camera) {
    mapInstance.fitBounds(bounds, {
      padding,
      duration: getOwnersMapFocusDuration(),
      maxZoom
    });
    return true;
  }

  mapInstance.flyTo({
    center: camera.center,
    zoom: Math.min(camera.zoom, maxZoom),
    duration: getOwnersMapFocusDuration(),
    curve: MAP_FOCUS_FLY_CURVE,
    essential: true
  });
  return true;
}

function getOwnersMapBoundsForLocationSearch(location) {
  if (!location || !window.mapboxgl) return null;

  if (isRegionOnlyLocationSearch(location) && !isRadiusFilterActive()) {
    const regionBounds = window.cstLocationSearch?.getRegionBounds?.(location.stateCode);
    if (Array.isArray(regionBounds) && regionBounds.length === 4) {
      const [west, south, east, north] = regionBounds;
      return new mapboxgl.LngLatBounds([west, south], [east, north]);
    }
  }

  const center = getRadiusCenterForSearch(location)
    || getLocationSearchCoordinates(location)
    || getMapFilterLocationCenter(location.label);
  if (!center) return null;

  const radiusMiles = isRadiusFilterActive()
    ? selectedRadiusMiles
    : (
      window.WefranchRadiusControl?.LOCATION_VIEWPORT_RADIUS_MILES
      ?? MAP_LOCATION_FILTER_RADIUS_MILES
    );
  const searchBounds = window.WefranchRadiusControl?.getCoordinateRadiusBounds?.(
    center.lng,
    center.lat,
    radiusMiles
  );
  if (!searchBounds) return null;

  return new mapboxgl.LngLatBounds(
    [searchBounds.west, searchBounds.south],
    [searchBounds.east, searchBounds.north]
  );
}

function flyOwnersMapToLocationSearch(location) {
  if (!ownersMap) return false;

  const bounds = getOwnersMapBoundsForLocationSearch(location);
  if (!bounds) return false;

  return flyMapToBounds(ownersMap, bounds, {
    padding: MAP_FIT_PADDING,
    maxZoom: 9
  });
}

function applyPendingOwnersMapLocationFocus() {
  const location = ownersMapPendingLocationFocus;
  if (!location || !ownersMap) return false;

  ownersMapPendingLocationFocus = null;
  return flyOwnersMapToLocationSearch(location);
}

function focusOwnersMapOnLocationSearch(location) {
  if (!location) return false;

  ownersMapCaptureQueryViewOnSettle = false;

  if (isOwnersMapPanelVisible() && ownersMap?.loaded()) {
    ownersMapPendingLocationFocus = null;
    return flyOwnersMapToLocationSearch(location);
  }

  ownersMapPendingLocationFocus = location;
  openMapPanel("map");
  return true;
}

function isOwnersMapPanelVisible() {
  return Boolean(
    card?.classList.contains("is-map-open")
    && getCurrentPanelMode() === "map"
    && ownersMap
  );
}

function getOwnersMapBusyTopOffset() {
  const defaultOffset = window.WefranchMapPills?.BUSY_TOP_OFFSET ?? 32;
  if (!ownerMapHeader || ownerMapHeader.hidden) return defaultOffset;
  return Math.round(ownerMapHeader.getBoundingClientRect().height + 16);
}

function getOwnersMapContainerElement() {
  return document.querySelector("#mapPanel .panel-map-container")
    || document.getElementById("ownersMap");
}

function getOwnersMapResetElement() {
  return document.getElementById("ownersMapReset");
}

function getOwnersMapBusyPills() {
  if (!ownersMapBusyPills) {
    ownersMapBusyPills = window.WefranchMapPills?.createBusyController?.(
      document.getElementById("ownersMapBusy"),
      { getTopOffset: getOwnersMapBusyTopOffset }
    );
  }

  return ownersMapBusyPills;
}

function getOwnersMapResetPills() {
  if (!ownersMapResetPills) {
    ownersMapResetPills = window.WefranchMapPills?.createResetController?.(
      getOwnersMapResetElement(),
      {
        getMapContainer: getOwnersMapContainerElement,
        getTopOffset: getOwnersMapBusyTopOffset
      }
    );
  }

  return ownersMapResetPills;
}

function isOwnersMapBusyVisible() {
  return Boolean(getOwnersMapBusyPills()?.isVisible?.());
}

function isOwnersMapResetVisible() {
  return Boolean(getOwnersMapResetPills()?.isVisible?.());
}

function showOwnersMapReset({ crossfade = false } = {}) {
  getOwnersMapResetPills()?.show?.({ crossfade });
}

function hideOwnersMapReset({ immediate = false, crossfade = false } = {}) {
  getOwnersMapResetPills()?.hide?.({ immediate, crossfade });
}

function syncOwnersMapResetPosition() {
  getOwnersMapResetPills()?.syncPosition?.();
}

function normalizeOwnersMapCenter(center) {
  if (!center) return null;
  if (Array.isArray(center) && center.length >= 2) return [Number(center[0]), Number(center[1])];
  const longitude = Number(center.lng ?? center.longitude);
  const latitude = Number(center.lat ?? center.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return [longitude, latitude];
}

function captureOwnersMapQueryView(center, zoom) {
  const nextCenter = normalizeOwnersMapCenter(center);
  const nextZoom = Number(zoom);
  if (!nextCenter || !Number.isFinite(nextZoom)) return;

  ownersMapQueryView = {
    center: nextCenter,
    zoom: nextZoom
  };
}

function captureOwnersMapQueryViewFromMap() {
  if (!ownersMap) return;
  captureOwnersMapQueryView(ownersMap.getCenter(), ownersMap.getZoom());
}

function isOwnersMapAtQueryView() {
  if (!ownersMap || !ownersMapQueryView?.center || !Number.isFinite(ownersMapQueryView.zoom)) {
    return true;
  }

  const center = ownersMap.getCenter();
  const zoom = ownersMap.getZoom();
  const [defaultLng, defaultLat] = ownersMapQueryView.center;

  return Math.abs(zoom - ownersMapQueryView.zoom) < 0.05
    && Math.abs(center.lng - defaultLng) < 0.05
    && Math.abs(center.lat - defaultLat) < 0.05;
}

function shouldOwnersMapResetShow() {
  if (!isOwnersMapPanelVisible() || !ownersMap?.isStyleLoaded?.()) return false;
  if (card?.classList.contains("is-splash-open")) return false;
  return Boolean(ownersMapQueryView) && !isOwnersMapAtQueryView();
}

function updateOwnersMapResetVisibility() {
  if (ownersMapCaptureQueryViewOnSettle && ownersMap && !ownersMap.isMoving?.()) {
    captureOwnersMapQueryViewFromMap();
    ownersMapCaptureQueryViewOnSettle = false;
  }

  syncOwnersMapResetPosition();

  if (isOwnersMapBusyVisible()) return;

  if (shouldOwnersMapResetShow()) {
    showOwnersMapReset({ crossfade: isOwnersMapBusyVisible() });
    return;
  }

  hideOwnersMapReset({
    immediate: !isOwnersMapPanelVisible(),
    crossfade: isOwnersMapBusyVisible()
  });
}

function flyOwnersMapToQueryView() {
  if (!ownersMap || !ownersMapQueryView?.center || !Number.isFinite(ownersMapQueryView.zoom)) {
    return false;
  }

  ownersMap.flyTo({
    center: ownersMapQueryView.center,
    zoom: ownersMapQueryView.zoom,
    duration: getOwnersMapFocusDuration(),
    curve: MAP_FOCUS_FLY_CURVE,
    essential: true
  });

  if (!ownersMap.isMoving?.()) {
    updateOwnersMapResetVisibility();
    return true;
  }

  ownersMap.once("moveend", updateOwnersMapResetVisibility);
  return true;
}

function resetOwnersMapView() {
  if (!ownersMap) return;

  ownersMapPendingLocationFocus = null;
  ownersMapCaptureQueryViewOnSettle = false;
  hideOwnersMapReset();

  if (flyOwnersMapToQueryView()) return;

  fitOwnersMapToVisibleLocations({ force: true });
}

function bindOwnersMapResetControl() {
  const resetEl = getOwnersMapResetElement();
  if (!resetEl || resetEl.dataset.bound === "true") return;

  resetEl.dataset.bound = "true";
  getOwnersMapResetPills()?.bindPositionSync?.();
  resetEl.addEventListener("click", resetOwnersMapView);
}

function isOwnersMapUpdateInFlight() {
  return ownersMapRevealActive
    || ownersMapBusyHeldForReveal
    || isOwnersMapBusyVisible();
}

function setOwnersMapBusy(isBusy) {
  const busyPills = getOwnersMapBusyPills();
  if (!busyPills) return;

  if (isBusy) {
    const swap = isOwnersMapResetVisible();
    if (swap) hideOwnersMapReset({ crossfade: true });
    busyPills.setBusy(true, { crossfade: swap });
    return;
  }

  busyPills.setBusy(false);
  updateOwnersMapResetVisibility();
}

function getOwnersMapRowHighlightIds() {
  if (activeMapOwnerIndex !== null) return null;

  if (typeof isDatasetTableView === "function" && isDatasetTableView()) {
    if (!selectedLocationRowIds.size) return null;
    return {
      property: "locationRowId",
      ids: [...selectedLocationRowIds]
    };
  }

  if (!selectedFranchiseeIndexes.size) return null;
  return {
    property: "ownerIndex",
    ids: [...selectedFranchiseeIndexes]
  };
}

function getOwnersMapPointHighlightExpression(selectedValue, dimmedValue) {
  const highlight = getOwnersMapRowHighlightIds();
  if (!highlight) return selectedValue;

  const isOwnerIndex = highlight.property === "ownerIndex";
  const featureValue = isOwnerIndex
    ? ["to-number", ["get", "ownerIndex"]]
    : ["to-string", ["get", highlight.property]];
  const ids = isOwnerIndex
    ? highlight.ids.map(Number)
    : highlight.ids.map(String);

  return [
    "case",
    ["in", featureValue, ["literal", ids]],
    selectedValue,
    dimmedValue
  ];
}

function getOwnersMapPointColorExpression() {
  return getOwnersMapPointHighlightExpression(["get", "color"], MAP_POINT_DIM_COLOR);
}

function getOwnersMapPointSortKeyExpression() {
  return getOwnersMapPointHighlightExpression(1, 0);
}

function getOwnersMapPointSelectedOpacityExpression() {
  return getOwnersMapPointHighlightExpression(MAP_POINT_OPACITY, MAP_POINT_DIM_OPACITY);
}

function getOwnersMapPointOpacityExpression() {
  const selectedOpacity = getOwnersMapPointSelectedOpacityExpression();
  if (!ownersMapRevealActive) return selectedOpacity;

  return [
    "case",
    ["boolean", ["feature-state", "reveal"], false],
    selectedOpacity,
    0
  ];
}

function getOwnersMapLogoSelectedOpacityExpression() {
  return getOwnersMapPointHighlightExpression(1, MAP_POINT_DIM_OPACITY);
}

function getOwnersMapLogoOpacityExpression() {
  const selectedOpacity = getOwnersMapLogoSelectedOpacityExpression();
  if (!ownersMapRevealActive) return selectedOpacity;

  return [
    "case",
    ["boolean", ["feature-state", "reveal"], false],
    selectedOpacity,
    0
  ];
}

function syncOwnersMapRowSelectionHighlight() {
  if (!ownersMap?.getLayer("owner-points")) return;

  const color = getOwnersMapPointColorExpression();
  const sortKey = getOwnersMapPointSortKeyExpression();
  const transition = {
    duration: usesReducedMotion() ? 0 : 180,
    delay: 0
  };

  OWNERS_MAP_CIRCLE_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "circle-color", color);
    ownersMap.setPaintProperty(layerId, "circle-color-transition", transition);
    ownersMap.setLayoutProperty(layerId, "circle-sort-key", sortKey);
  });

  const logoOpacity = getOwnersMapLogoOpacityExpression();
  OWNERS_MAP_LOGO_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setLayoutProperty(layerId, "symbol-sort-key", sortKey);
    if (ownersMapRevealActive) return;
    ownersMap.setPaintProperty(layerId, "icon-opacity", logoOpacity);
    ownersMap.setPaintProperty(layerId, "icon-opacity-transition", transition);
  });

  if (ownersMapRevealActive) {
    syncOwnersMapPointOpacities();
    return;
  }

  const opacity = getOwnersMapPointOpacityExpression();
  OWNERS_MAP_CIRCLE_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "circle-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-opacity-transition", transition);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity-transition", transition);
  });
}

function getOwnersMapPointOpacityTransition() {
  return ownersMapRevealActive
    ? { duration: MAP_REVEAL_FADE_MS, delay: 0 }
    : { duration: 0, delay: 0 };
}

function syncOwnersMapPointOpacities({ instant = false } = {}) {
  if (!ownersMap?.getLayer("owner-points")) return;

  const opacity = getOwnersMapPointOpacityExpression();
  const logoOpacity = getOwnersMapLogoOpacityExpression();
  const transition = instant
    ? { duration: 0, delay: 0 }
    : getOwnersMapPointOpacityTransition();

  OWNERS_MAP_CIRCLE_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "circle-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-opacity-transition", transition);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity-transition", transition);
  });

  OWNERS_MAP_LOGO_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "icon-opacity", logoOpacity);
    ownersMap.setPaintProperty(layerId, "icon-opacity-transition", transition);
  });
}

function setOwnersMapPointRevealState(featureId, revealed) {
  if (!ownersMap || featureId == null || !ownersMap.getSource("owner-points")) return;

  try {
    ownersMap.setFeatureState({ source: "owner-points", id: featureId }, { reveal: revealed });
  } catch (error) {
    // The feature may not exist on this source yet.
  }
}

function hideRenderedOwnersMapPoints() {
  if (!ownersMap?.getSource("owner-points")) return 0;

  const seen = new Set();
  const features = ownersMap.querySourceFeatures("owner-points") || [];
  features.forEach((feature) => {
    const featureId = feature.id ?? feature.properties?.featureId;
    if (featureId == null || seen.has(featureId)) return;
    seen.add(featureId);
    setOwnersMapPointRevealState(featureId, false);
  });
  return seen.size;
}

function cancelOwnersMapRevealAnimation() {
  if (!ownersMapRevealRaf) return;
  window.cancelAnimationFrame(ownersMapRevealRaf);
  ownersMapRevealRaf = 0;
}

function finishOwnersMapReveal() {
  cancelOwnersMapRevealAnimation();
  ownersMapRevealActive = false;
  syncOwnersMapPointOpacities();

  if (!ownersMapBusyHeldForReveal && !isOwnersMapBusyVisible()) return;

  ownersMapBusyHeldForReveal = false;
  setOwnersMapBusy(false);
}

function cancelOwnersMapReveal({ hideBusy = false } = {}) {
  if (ownersMapRevealScheduleFrame != null) {
    window.cancelAnimationFrame(ownersMapRevealScheduleFrame);
    ownersMapRevealScheduleFrame = null;
  }
  ownersMapPendingRevealCollection = null;
  ownersMapPendingPointTransition = "radial";
  ownersMapRevealWhenTableEnters = null;
  ownersMapRevealToken += 1;
  cancelOwnersMapRevealAnimation();
  ownersMapRevealActive = false;
  ownersMapBusyHeldForReveal = false;
  syncOwnersMapPointOpacities();
  if (hideBusy) setOwnersMapBusy(false);
}

function easeOutOwnersMapReveal(value) {
  return 1 - ((1 - value) ** 2.25);
}

function getOwnersMapRevealCenter() {
  const center = ownersMap?.getCenter?.();
  if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) return null;
  return { lat: center.lat, lng: center.lng };
}

function startOwnersMapRadialReveal(features, token) {
  cancelOwnersMapRevealAnimation();

  const center = getOwnersMapRevealCenter();
  if (!center || !features.length) {
    if (token === ownersMapRevealToken) finishOwnersMapReveal();
    return;
  }

  const items = features.map((feature) => {
    const [lng, lat] = feature.geometry?.coordinates || [];
    return {
      featureId: feature.properties?.featureId,
      distance: Number.isFinite(lng) && Number.isFinite(lat)
        ? getLocationDistanceMiles({ lat, lng }, center)
        : 0
    };
  }).filter((item) => item.featureId != null);

  items.sort((left, right) => left.distance - right.distance);

  const maxDistance = Math.max(
    items[items.length - 1]?.distance || 0,
    MAP_REVEAL_MIN_MILES
  );
  const startedAt = performance.now();
  let nextIndex = 0;

  const frame = (now) => {
    if (token !== ownersMapRevealToken) return;

    const progress = easeOutOwnersMapReveal(Math.min(1, (now - startedAt) / MAP_REVEAL_DURATION_MS));
    const radius = progress * maxDistance;

    while (nextIndex < items.length && items[nextIndex].distance <= radius) {
      setOwnersMapPointRevealState(items[nextIndex].featureId, true);
      nextIndex += 1;
    }

    if (progress < 1) {
      ownersMapRevealRaf = window.requestAnimationFrame(frame);
      return;
    }

    finishOwnersMapReveal();
  };

  ownersMapRevealRaf = window.requestAnimationFrame(frame);
}

function whenOwnersMapCameraSettled(callback) {
  if (!ownersMap?.isMoving?.()) {
    callback();
    return;
  }

  ownersMap.once("moveend", callback);
}

function commitOwnersMapPointCollections(collection = getOwnersMapPointFeatureCollection()) {
  setOwnersMapPointData(collection);
  ownersMap?.getSource("radius-circles")?.setData(getRadiusCircleFeatureCollection());
  return collection;
}

function whenOwnersMapReadyForReveal(callback) {
  if (!ownersMap) {
    callback();
    return;
  }

  let started = false;
  const start = () => {
    if (started) return;
    if (ownersMap.isMoving?.()) {
      ownersMap.once("moveend", () => ownersMap.once("idle", start));
      return;
    }
    if (!ownersMap.areTilesLoaded?.()) {
      ownersMap.once("idle", start);
      return;
    }
    started = true;
    callback();
  };

  window.requestAnimationFrame(start);
  window.setTimeout(() => {
    if (ownersMap?.isMoving?.()) return;
    start();
  }, 2000);
}

function fadeOwnersMapPointLayer(opacity, { instant = false, duration = MAP_POINT_FADE_MS } = {}) {
  if (!ownersMap?.getLayer("owner-points")) return;

  const transition = instant
    ? { duration: 0, delay: 0 }
    : { duration, delay: 0 };
  const logoOpacity = opacity === 0 ? 0 : 1;

  OWNERS_MAP_CIRCLE_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "circle-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-opacity-transition", transition);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity", opacity);
    ownersMap.setPaintProperty(layerId, "circle-stroke-opacity-transition", transition);
  });

  OWNERS_MAP_LOGO_LAYER_IDS.forEach((layerId) => {
    if (!ownersMap.getLayer(layerId)) return;
    ownersMap.setPaintProperty(layerId, "icon-opacity", logoOpacity);
    ownersMap.setPaintProperty(layerId, "icon-opacity-transition", transition);
  });
}

function startOwnersMapFilterReveal(collection = getOwnersMapPointFeatureCollection(), { pointTransition = "radial" } = {}) {
  if (!ownersMap?.getSource("owner-points")) {
    ownersMapRevealPending = true;
    return;
  }

  if (!isOwnersMapPanelVisible()) {
    commitOwnersMapPointCollections(collection);
    ownersMapRevealPending = true;
    return;
  }

  ownersMapPendingRevealCollection = collection;
  ownersMapPendingPointTransition = pointTransition;
  if (pointTransition === "fade") {
    setOwnersMapBusy(true);
  }
  if (ownersMapRevealScheduleFrame != null) return;

  ownersMapRevealScheduleFrame = window.requestAnimationFrame(() => {
    ownersMapRevealScheduleFrame = null;
    const nextCollection = ownersMapPendingRevealCollection;
    const nextTransition = ownersMapPendingPointTransition;
    ownersMapPendingRevealCollection = null;
    ownersMapPendingPointTransition = "radial";
    runOwnersMapFilterReveal(nextCollection, { pointTransition: nextTransition });
  });
}

function fadeInOwnersMapPoints(token) {
  fadeOwnersMapPointLayer(MAP_POINT_OPACITY);
  window.setTimeout(() => {
    if (token !== ownersMapRevealToken) return;
    finishOwnersMapReveal();
  }, MAP_POINT_FADE_MS + 40);
}

function runOwnersMapOwnerFade(collection, token) {
  const features = collection?.features || [];
  ownersMapRevealActive = true;
  ownersMapBusyHeldForReveal = true;
  setOwnersMapBusy(true);

  fadeOwnersMapPointLayer(0);

  window.setTimeout(() => {
    if (token !== ownersMapRevealToken) return;

    fadeOwnersMapPointLayer(0, { instant: true });
    commitOwnersMapPointCollections(collection);

    const afterFocus = () => {
      if (token !== ownersMapRevealToken) return;
      if (!features.length) {
        finishOwnersMapReveal();
        markCstWorkspaceMapReadyToReveal?.();
        return;
      }

      markCstWorkspaceMapReadyToReveal?.(() => fadeInOwnersMapPoints(token));
    };

    fitOwnersMapToVisibleLocations({
      force: true,
      whenSettled: afterFocus
    });
  }, MAP_POINT_FADE_MS);
}

function runOwnersMapFilterReveal(collection = getOwnersMapPointFeatureCollection(), { pointTransition = "radial" } = {}) {
  if (!ownersMap?.getSource("owner-points") || !isOwnersMapPanelVisible()) {
    if (collection) commitOwnersMapPointCollections(collection);
    ownersMapRevealPending = true;
    return;
  }

  const token = ++ownersMapRevealToken;
  ownersMapRevealPending = false;
  cancelOwnersMapRevealAnimation();
  ownersMapPointHover?.clearHover();

  const features = collection?.features || [];
  const shouldFade = pointTransition === "fade" && !usesReducedMotion();
  if (shouldFade) {
    runOwnersMapOwnerFade(collection, token);
    return;
  }

  const shouldReveal = !usesReducedMotion() && features.length > 0;

  setOwnersMapBusy(true);

  if (shouldReveal) {
    ownersMapRevealActive = true;
    ownersMapBusyHeldForReveal = true;
    syncOwnersMapPointOpacities({ instant: true });
    hideRenderedOwnersMapPoints();
  } else if (ownersMapRevealActive) {
    ownersMapRevealActive = false;
    syncOwnersMapPointOpacities({ instant: true });
  }

  commitOwnersMapPointCollections(collection);
  if (shouldReveal) {
    syncOwnersMapPointOpacities();
  }

  const afterFocus = () => {
    if (token !== ownersMapRevealToken) return;
    if (!shouldReveal) {
      ownersMapBusyHeldForReveal = false;
      setOwnersMapBusy(false);
      markCstWorkspaceMapReadyToReveal?.();
      return;
    }

    whenOwnersMapReadyForReveal(() => {
      if (token !== ownersMapRevealToken) return;
      markCstWorkspaceMapReadyToReveal?.(() => startOwnersMapRadialReveal(features, token));
    });
  };

  fitOwnersMapToVisibleLocations({
    force: true,
    whenSettled: afterFocus
  });
}

function getVisibleMapCoordinates() {
  const coordinates = getMapPointFeatures().map((feature) => feature.geometry.coordinates);

  if (isRadiusFilterActive()) {
    getRadiusCircleFeatureCollection().features.forEach((feature) => {
      coordinates.push(...feature.geometry.coordinates[0]);
    });
  }

  return coordinates;
}

function captureOwnersMapQueryViewFromBounds(bounds, { padding = MAP_FIT_PADDING, maxZoom = 9 } = {}) {
  if (!ownersMap || !bounds) {
    ownersMapCaptureQueryViewOnSettle = true;
    return;
  }

  const camera = ownersMap.cameraForBounds(bounds, { padding, maxZoom });
  if (!camera) {
    ownersMapCaptureQueryViewOnSettle = true;
    return;
  }

  captureOwnersMapQueryView(camera.center, Math.min(camera.zoom, maxZoom));
  ownersMapCaptureQueryViewOnSettle = false;
}

function settleOwnersMapFit(didFly, whenSettled) {
  const finish = () => {
    if (ownersMapCaptureQueryViewOnSettle) {
      captureOwnersMapQueryViewFromMap();
      ownersMapCaptureQueryViewOnSettle = false;
    }
    updateOwnersMapResetVisibility();
    whenSettled?.(didFly);
  };

  if (didFly && getOwnersMapFocusDuration() > 0) {
    whenOwnersMapCameraSettled(finish);
    return;
  }

  finish();
}

function fitOwnersMapToVisibleLocations({ force = false, whenSettled } = {}) {
  const runFit = () => {
    if (!ownersMap || !window.mapboxgl) {
      whenSettled?.(false);
      return false;
    }
    if (!force && isOwnersMapUpdateInFlight()) {
      whenSettled?.(false);
      return false;
    }

    if (ownersMapPendingLocationFocus) {
      ownersMapCaptureQueryViewOnSettle = false;
      const didFly = applyPendingOwnersMapLocationFocus();
      settleOwnersMapFit(didFly, whenSettled);
      return didFly;
    }

    const regionBounds = getSelectedRegionFitBounds();
    let didFly = false;

    if (regionBounds) {
      captureOwnersMapQueryViewFromBounds(regionBounds);
      didFly = flyMapToBounds(ownersMap, regionBounds, {
        padding: MAP_FIT_PADDING,
        maxZoom: 9
      });
    } else {
      const coordinates = getVisibleMapCoordinates();
      if (!coordinates.length) {
        whenSettled?.(false);
        return false;
      }

      const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

      coordinates.forEach((coordinate) => {
        bounds.extend(coordinate);
      });

      if (coordinates.length === 1) {
        const [lng, lat] = coordinates[0];
        bounds.extend([lng - 0.35, lat - 0.35]);
        bounds.extend([lng + 0.35, lat + 0.35]);
      }

      captureOwnersMapQueryViewFromBounds(bounds);
      didFly = flyMapToBounds(ownersMap, bounds, {
        padding: MAP_FIT_PADDING,
        maxZoom: 9
      });
    }

    settleOwnersMapFit(didFly, whenSettled);
    return didFly;
  };

  if (!ownersMap) {
    whenSettled?.(false);
    return false;
  }

  if (!ownersMap.loaded()) {
    ownersMap.once("idle", runFit);
    return false;
  }

  return runFit();
}

function fitMapToCoordinates(mapInstance, coordinates, padding = MAP_FIT_PADDING) {
  if (!mapInstance || !window.mapboxgl || !coordinates.length) return;

  if (!bounds) return;

  flyMapToBounds(mapInstance, bounds, {
    padding,
    maxZoom: 8.6
  });
}

function getMapBoundsForCoordinates(coordinates) {
  if (!window.mapboxgl || !coordinates.length) return null;

  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate);
  });

  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    bounds.extend([lng - 0.35, lat - 0.35]);
    bounds.extend([lng + 0.35, lat + 0.35]);
  }

  return bounds;
}

function getMapPointBaseCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    MAP_POINT_ZOOM_MIN,
    MAP_POINT_RADIUS,
    MAP_POINT_ZOOM_MAX,
    MAP_POINT_RADIUS_MAX,
    22,
    MAP_POINT_RADIUS_MAX
  ];
}

function getMapPointHoverCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    MAP_POINT_ZOOM_MIN,
    MAP_POINT_RADIUS * MAP_POINT_HOVER_SCALE,
    MAP_POINT_ZOOM_MAX,
    MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE,
    22,
    MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE
  ];
}

function getMapPointHoverLayerFilter(featureId = null) {
  if (!featureId) {
    return ["==", ["get", "featureId"], ""];
  }

  return ["==", ["get", "featureId"], featureId];
}

function getMapPointBaseLayerFilter(featureId = null) {
  if (!featureId) {
    return true;
  }

  return ["!=", ["get", "featureId"], featureId];
}

function fitMapPointTooltipToContent(tooltip) {
  if (!tooltip) return;

  tooltip.style.width = "max-content";

  const style = getComputedStyle(tooltip);
  const maxWidth = parseFloat(style.maxWidth);
  const horizontalExtra =
    (parseFloat(style.paddingLeft) || 0)
    + (parseFloat(style.paddingRight) || 0)
    + (parseFloat(style.borderLeftWidth) || 0)
    + (parseFloat(style.borderRightWidth) || 0);

  let contentWidth = 0;
  tooltip.querySelectorAll(
    ".map-point-tooltip-header, .map-point-tooltip-detail"
  ).forEach((row) => {
    contentWidth = Math.max(contentWidth, row.scrollWidth);
  });

  if (!contentWidth) {
    tooltip.style.width = "";
    return;
  }

  const needed = contentWidth + horizontalExtra;
  const capped = Number.isFinite(maxWidth) ? Math.min(maxWidth, needed) : needed;
  tooltip.style.width = `${Math.ceil(capped)}px`;
}

function createMapPointTooltipController(mapInstance) {
  let tooltipEl = null;
  let activeCoordinates = null;
  let isVisible = false;

  const getTooltip = () => {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "map-point-floating-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      document.body.append(tooltipEl);
    }

    return tooltipEl;
  };

  const renderTooltipContent = (feature) => {
    const tooltip = getTooltip();
    const properties = feature.properties || {};

    tooltip.replaceChildren();

    const ownerName = properties.ownerName || "";
    const locationLabel = properties.locationLabel || "";
    const franchise = properties.franchise || "";
    const hasHeader = Boolean(franchise);
    const hasBody = Boolean(ownerName || locationLabel);

    if (franchise) {
      const header = document.createElement("div");
      header.className = "map-point-tooltip-header";

      const logoTile = document.createElement("span");
      logoTile.className = "ui-tile franchise-logo map-point-tooltip-franchise-logo";

      const fallback = document.createElement("span");
      fallback.className = "franchise-logo-fallback";
      fallback.textContent = typeof getInitials === "function" ? getInitials(franchise) : franchise.slice(0, 2);

      const logoImg = document.createElement("img");
      logoImg.alt = "";
      if (typeof getFranchiseLogoSrc === "function") {
        logoImg.src = getFranchiseLogoSrc(franchise);
      }
      logoImg.addEventListener("error", () => {
        logoImg.style.display = "none";
        fallback.style.display = "inline-flex";
      });

      logoTile.append(fallback, logoImg);

      const franchiseTitle = document.createElement("div");
      franchiseTitle.className = "map-point-tooltip-title map-point-tooltip-franchise-name";
      franchiseTitle.textContent = franchise;

      header.append(logoTile, franchiseTitle);
      tooltip.append(header);
    }

    if (hasHeader && hasBody) {
      const divider = document.createElement("div");
      divider.className = "map-point-tooltip-divider";
      divider.setAttribute("aria-hidden", "true");
      tooltip.append(divider);
    }

    if (ownerName) {
      const franchisee = document.createElement("div");
      franchisee.className = "map-point-tooltip-detail";
      franchisee.textContent = ownerName;
      tooltip.append(franchisee);
    }

    if (locationLabel) {
      const location = document.createElement("div");
      location.className = "map-point-tooltip-detail";
      location.textContent = locationLabel;
      tooltip.append(location);
    }
  };

  const positionTooltip = () => {
    if (!activeCoordinates || !isVisible) return;

    const tooltip = getTooltip();
    fitMapPointTooltipToContent(tooltip);
    const projected = mapInstance.project(activeCoordinates);
    const containerRect = mapInstance.getContainer().getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = containerRect.left + projected.x;
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft - (tooltipRect.width / 2)),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(
      viewportPadding,
      containerRect.top + projected.y - tooltipRect.height - 14
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const show = (feature) => {
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates) return;

    activeCoordinates = coordinates;
    renderTooltipContent(feature);

    const tooltip = getTooltip();
    isVisible = true;
    tooltip.classList.add("is-visible");
    positionTooltip();
  };

  const hide = () => {
    isVisible = false;
    activeCoordinates = null;
    tooltipEl?.classList.remove("is-visible");
  };

  const bind = () => {
    mapInstance.on("move", positionTooltip);
    mapInstance.on("zoom", positionTooltip);
  };

  return { bind, show, hide };
}

function createOwnersMapInteractionController(mapInstance) {
  let hoveredPointId = null;
  const tooltip = createMapPointTooltipController(mapInstance);
  const pointBaseLayerId = "owner-points";
  const pointHoverLayerId = "owner-points-hover";
  const logoBaseLayerId = "owner-points-logos";
  const logoHoverLayerId = "owner-points-logos-hover";
  const hoverQueryLayers = [
    pointHoverLayerId,
    logoHoverLayerId,
    pointBaseLayerId,
    logoBaseLayerId
  ];

  const syncHoverLayers = () => {
    const hoverFilter = getMapPointHoverLayerFilter(hoveredPointId);
    const baseFilter = getMapPointBaseLayerFilter(hoveredPointId);
    mapInstance.setFilter(pointHoverLayerId, hoverFilter);
    mapInstance.setFilter(pointBaseLayerId, baseFilter);
    if (mapInstance.getLayer(logoHoverLayerId)) {
      mapInstance.setFilter(logoHoverLayerId, hoverFilter);
    }
    if (mapInstance.getLayer(logoBaseLayerId)) {
      mapInstance.setFilter(logoBaseLayerId, baseFilter);
    }
  };

  const clearHover = () => {
    if (hoveredPointId === null) return;

    hoveredPointId = null;
    syncHoverLayers();
    tooltip.hide();
  };

  const setPointHover = (feature) => {
    const featureId = feature?.properties?.featureId;
    if (!featureId) return;

    if (hoveredPointId === featureId) {
      tooltip.show(feature);
      return;
    }

    hoveredPointId = featureId;
    syncHoverLayers();
    tooltip.show(feature);
  };

  const bind = () => {
    tooltip.bind();

    mapInstance.on("mousemove", (event) => {
      if (ownersMapRevealActive) {
        clearHover();
        mapInstance.getCanvas().style.cursor = "";
        return;
      }
      const pointFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: hoverQueryLayers.filter((layerId) => mapInstance.getLayer(layerId))
      });

      if (!pointFeatures.length) {
        clearHover();
        mapInstance.getCanvas().style.cursor = "";
        return;
      }

      mapInstance.getCanvas().style.cursor = "pointer";
      setPointHover(pointFeatures[0]);
    });

    mapInstance.on("mouseleave", () => {
      clearHover();
      mapInstance.getCanvas().style.cursor = "";
    });
  };

  return { bind, clearHover };
}

function syncMapLocationFilter({ pointTransition = "radial" } = {}) {
  syncOwnerMapHeader();

  if (!ownersMap?.getSource("owner-points")) {
    ownersMapRevealPending = true;
    return;
  }

  ownersMapPointHover?.clearHover();
  startOwnersMapFilterReveal(getOwnersMapPointFeatureCollection(), { pointTransition });
  syncOwnersMapRowSelectionHighlight();
}

function getActiveSidebarOwnerIndex() {
  if (!card?.classList.contains("is-map-open")) return null;

  const mode = getCurrentPanelMode();
  if (mode === "raw") return activeRawOwnerIndex;
  if (mode === "org") return activeOrgOwnerIndex;
  if (mode === "details") return activeDetailOwnerIndex;
  return activeMapOwnerIndex;
}

function clearSidebarOwnerState() {
  activeMapOwnerIndex = null;
  activeDetailOwnerIndex = null;
  activeOrgOwnerIndex = null;
  activeRawOwnerIndex = null;
  globalRawDataViewOpen = false;
}

function resetPanelModeAfterClose(closingMode) {
  if (closingMode === "map" || !mapPanel || usesReducedMotion()) {
    setPanelMode("map");
    return;
  }

  const resetMode = (event) => {
    if (event && (event.target !== mapPanel || event.propertyName !== "transform")) return;

    mapPanel.removeEventListener("transitionend", resetMode);
    mapPanel.removeEventListener("transitioncancel", resetMode);

    if (!card?.classList.contains("is-map-open")) {
      setPanelMode("map");
    }
  };

  mapPanel.addEventListener("transitionend", resetMode);
  mapPanel.addEventListener("transitioncancel", resetMode);
}

function openSidebar(mode, ownerIndex = null, { scrollTable = false } = {}) {
  const owner = ownerIndex !== null
    ? owners.find((item) => item.originalIndex === ownerIndex)
    : null;
  if (mode === "details" && !owner) return;

  const wasMapVisible = isOwnersMapPanelVisible();
  clearSidebarOwnerState();

  if (mode === "raw") {
    globalRawDataViewOpen = true;
    activeRawOwnerIndex = owner ? ownerIndex : null;
    openMapPanel("raw", { scrollTable: false });
    renderRawDataSidebar(activeRawOwnerIndex);
  } else if (mode === "org") {
    const hasOrgChart = owner ? Boolean(getOwnerOrgChart(ownerIndex)?.nodes?.length) : false;
    activeOrgOwnerIndex = hasOrgChart ? ownerIndex : null;
    if (hasOrgChart) {
      renderOwnerOrgChart(ownerIndex);
    } else {
      renderDefaultOrgChartState();
    }
    openMapPanel("org", { scrollTable });
  } else if (mode === "details") {
    activeDetailOwnerIndex = ownerIndex;
    renderOwnerDetails(owner);
    openMapPanel("details");
    initializeOwnerDetailsMap(ownerIndex);
  } else {
    activeMapOwnerIndex = owner ? ownerIndex : null;
    openMapPanel("map", { scrollTable });
  }

  const pointTransition = mode === "map" && wasMapVisible ? "fade" : "radial";
  syncMapLocationFilter({ pointTransition });
  renderActiveTable();
  syncToolbarTabState(getCurrentPanelMode());
}

function closeSidebar() {
  const closingMode = getCurrentPanelMode();

  lockedToolbarMode = null;
  clearSidebarOwnerState();
  card?.classList.remove("is-map-open");
  mapToggle?.setAttribute("aria-expanded", "false");
  cancelOwnersMapReveal({ hideBusy: true });
  resetPanelModeAfterClose(closingMode);
  renderActiveTable();
  syncToolbarTabState(closingMode);
  updateOwnersMapResetVisibility();
}

function handleToolbarTabClick(mode) {
  const isPanelOpen = card?.classList.contains("is-map-open");
  const currentMode = getCurrentPanelMode();

  if (isPanelOpen && currentMode === mode) {
    if (lockedToolbarMode === mode) {
      closeSidebar();
    } else {
      lockedToolbarMode = mode;
      syncToolbarTabState(currentMode);
    }
    return;
  }

  let carriedOwnerIndex = isPanelOpen ? getActiveSidebarOwnerIndex() : null;
  if (mode === "raw" && carriedOwnerIndex !== null) {
    const owner = owners.find((item) => item.originalIndex === carriedOwnerIndex);
    if (!isRawDataAvailable(owner)) {
      carriedOwnerIndex = null;
    }
  }

  lockedToolbarMode = mode;
  openSidebar(mode, carriedOwnerIndex);
}

function handleSidebarClose() {
  const currentMode = getCurrentPanelMode();

  if (lockedToolbarMode === currentMode) {
    openSidebar(currentMode, null);
    return;
  }

  closeSidebar();
}

function toggleRowSidebarView(mode, ownerIndex, { scrollTable = false } = {}) {
  const isOpenForOwner =
    card?.classList.contains("is-map-open") &&
    getCurrentPanelMode() === mode &&
    getActiveSidebarOwnerIndex() === ownerIndex;

  if (isOpenForOwner) {
    if (lockedToolbarMode === mode) {
      openSidebar(mode, null);
    } else {
      closeSidebar();
    }
    return;
  }

  if (lockedToolbarMode !== mode) {
    lockedToolbarMode = null;
  }
  openSidebar(mode, ownerIndex, { scrollTable });
}

function openOwnerDetailsFromHeader(ownerIndex) {
  lockedToolbarMode = null;
  openSidebar("details", ownerIndex);
}

function setPanelMode(mode) {
  if (!mapPanel || !ownerDetailsPanel) return;

  const usesDetailsPanel = mode === "details" || mode === "org" || mode === "raw";
  mapPanel.classList.toggle("is-details-mode", usesDetailsPanel);
  mapPanel.classList.toggle("is-org-mode", mode === "org");
  mapPanel.classList.toggle("is-raw-mode", mode === "raw");
  ownerDetailsPanel.hidden = !usesDetailsPanel;
  if (mode !== "map") {
    cancelOwnersMapReveal({ hideBusy: true });
  }
  syncOwnerMapHeader(mode);
  syncToolbarTabState(mode);
  updateOwnersMapResetVisibility();
}

function setPanelLayout(layout) {
  if (!card || !PANEL_LAYOUT_CLASSES[layout]) return;
  const isLayoutChange = currentPanelLayout !== layout;
  if (isLayoutChange) {
    card.classList.add("is-layout-switching");
  }

  currentPanelLayout = layout;
  Object.entries(PANEL_LAYOUT_CLASSES).forEach(([key, className]) => {
    card.classList.toggle(className, key === layout);
  });

  document.querySelectorAll(".toolbar-tab-layout-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === layout);
  });

  persistViewSettings();

  if (!card.classList.contains("is-map-open")) return;

  scheduleOwnersMapResize();
  syncStickyNameColumnDivider();
  if (getCurrentPanelMode() === "map") {
    window.setTimeout(() => fitOwnersMapToVisibleLocations(), getMotionDelay(280));
  }

  if (isLayoutChange) {
    void card.offsetWidth;
    window.requestAnimationFrame(() => {
      card.classList.remove("is-layout-switching");
    });
  }
}

function getCurrentPanelMode() {
  if (mapPanel?.classList.contains("is-raw-mode")) return "raw";
  if (mapPanel?.classList.contains("is-org-mode")) return "org";
  if (mapPanel?.classList.contains("is-details-mode")) return "details";
  return "map";
}

function syncToolbarTabButton(button, isOpen, isLocked) {
  if (!button) return;

  button.classList.toggle("is-expanded", isOpen);
  button.classList.toggle("is-active", isOpen && isLocked);
  button.setAttribute("aria-pressed", String(isOpen && isLocked));
}

function syncToolbarTabState(mode = getCurrentPanelMode()) {
  const isFilterOpen = card?.classList.contains("is-filter-open");
  const isPanelOpen = Boolean(card?.classList.contains("is-map-open"));

  filterToggle?.classList.toggle("is-active", Boolean(isFilterOpen));
  syncToolbarTabButton(mapToggle, isPanelOpen && mode === "map", lockedToolbarMode === "map");
  syncToolbarTabButton(orgChartToggle, isPanelOpen && mode === "org", lockedToolbarMode === "org");
  syncToolbarTabButton(contactsToggle, isPanelOpen && mode === "raw", lockedToolbarMode === "raw");
  closeToolbarTabDropdowns();
  syncOwnerHeaderViewState();
  persistViewSettings();
}

function closeToolbarTabDropdowns(exceptItem = null) {
  toolbarTabItems.forEach((item) => {
    if (item !== exceptItem) {
      clearToolbarTabOpenTimeout(item);
      clearToolbarTabCloseTimeout(item);
      item.classList.remove("is-open");
    }
  });
}

function clearToolbarTabOpenTimeout(item) {
  const timeoutId = toolbarTabOpenTimeoutByItem.get(item);
  if (typeof timeoutId === "number") {
    window.clearTimeout(timeoutId);
    toolbarTabOpenTimeoutByItem.delete(item);
  }
}

function clearToolbarTabCloseTimeout(item) {
  const timeoutId = toolbarTabCloseTimeoutByItem.get(item);
  if (typeof timeoutId === "number") {
    window.clearTimeout(timeoutId);
    toolbarTabCloseTimeoutByItem.delete(item);
  }
}

function scheduleToolbarTabDropdownOpen(item, delayMs = TOOLBAR_TAB_DROPDOWN_OPEN_DELAY_MS) {
  const tabButton = item.querySelector(".segmented-control-btn");
  clearToolbarTabCloseTimeout(item);
  clearToolbarTabOpenTimeout(item);
  if (!tabButton?.classList.contains("is-expanded")) return;
  if (item.classList.contains("is-open")) return;

  const timeoutId = window.setTimeout(() => {
    toolbarTabOpenTimeoutByItem.delete(item);
    closeToolbarTabDropdowns(item);
    if (tabButton.classList.contains("is-expanded") && item.matches(":hover")) {
      item.classList.add("is-open");
    }
  }, delayMs);
  toolbarTabOpenTimeoutByItem.set(item, timeoutId);
}

let panelTableScrollObserver = null;
let panelTableWidthCleanup = null;

function scrollTableToActionColumns(source = "unknown") {
  if (!tableWrap) return;
  const tableEl = tableWrap.querySelector("table");

  if (panelTableWidthCleanup) {
    panelTableWidthCleanup();
    panelTableWidthCleanup = null;
  }
  if (panelTableScrollObserver) {
    panelTableScrollObserver.disconnect();
    panelTableScrollObserver = null;
  }

  const initialWrapperWidth = tableWrap.clientWidth;
  const panelWidth = mapPanel?.getBoundingClientRect().width || 0;
  const targetTableWidth = Math.max(920, initialWrapperWidth - panelWidth);

  const stickScroll = () => {
    const maxScrollLeft = tableWrap.scrollWidth - tableWrap.clientWidth;
    if (maxScrollLeft <= 0) return;
    const previousScrollBehavior = tableWrap.style.scrollBehavior;
    tableWrap.style.scrollBehavior = "auto";
    tableWrap.scrollLeft = maxScrollLeft;
    tableWrap.style.scrollBehavior = previousScrollBehavior;
  };

  if (!tableEl || initialWrapperWidth <= 920) {
    stickScroll();
    if (usesReducedMotion()) {
      requestAnimationFrame(stickScroll);
      return;
    }
    if (typeof ResizeObserver === "function") {
      panelTableScrollObserver = new ResizeObserver(() => stickScroll());
      panelTableScrollObserver.observe(tableWrap);
      const stop = (event) => {
        if (event.target !== tableWrap || event.propertyName !== "margin-right") return;
        tableWrap.removeEventListener("transitionend", stop);
        tableWrap.removeEventListener("transitioncancel", stop);
        if (panelTableScrollObserver) {
          panelTableScrollObserver.disconnect();
          panelTableScrollObserver = null;
        }
        stickScroll();
      };
      tableWrap.addEventListener("transitionend", stop);
      tableWrap.addEventListener("transitioncancel", stop);
    }
    return;
  }

  if (usesReducedMotion()) {
    stickScroll();
    requestAnimationFrame(stickScroll);
    return;
  }

  // Lock the table at the wrapper's current width so overflow appears from
  // the very first frame of the panel transition, then animate the table
  // width back down to its natural size in lockstep with the margin.
  tableEl.style.transition = "none";
  tableEl.style.width = `${initialWrapperWidth}px`;
  void tableEl.offsetWidth;
  tableEl.style.transition = "width 280ms ease";

  requestAnimationFrame(() => {
    tableEl.style.width = `${targetTableWidth}px`;
  });

  if (typeof ResizeObserver === "function") {
    panelTableScrollObserver = new ResizeObserver(() => stickScroll());
    panelTableScrollObserver.observe(tableWrap);
    panelTableScrollObserver.observe(tableEl);
  }

  const cleanup = () => {
    tableEl.style.transition = "";
    tableEl.style.width = "";
    if (panelTableScrollObserver) {
      panelTableScrollObserver.disconnect();
      panelTableScrollObserver = null;
    }
    tableEl.removeEventListener("transitionend", onTableTransitionEnd);
    tableEl.removeEventListener("transitioncancel", onTableTransitionEnd);
    panelTableWidthCleanup = null;
  };

  const onTableTransitionEnd = (event) => {
    if (event.target !== tableEl || event.propertyName !== "width") return;
    cleanup();
  };
  tableEl.addEventListener("transitionend", onTableTransitionEnd);
  tableEl.addEventListener("transitioncancel", onTableTransitionEnd);
  panelTableWidthCleanup = cleanup;
}

function openMapPanel(mode = "map", { scrollTable = false } = {}) {
  if (!card || !mapToggle) return;

  const wasPanelOpen = card.classList.contains("is-map-open");

  card.classList.add("is-map-open");
  mapToggle.setAttribute("aria-expanded", String(mode === "map"));
  setPanelMode(mode);

  // Only scroll the table to expose the action columns when the caller
  // explicitly opts in (in-row contacts/locations buttons). Other entry
  // points (toolbar buttons, init, owner-detail links, etc.) must leave
  // the horizontal scroll position untouched.
  if (scrollTable && !wasPanelOpen && !globalRawDataViewOpen && (mode === "map" || mode === "org")) {
    scrollTableToActionColumns(`openMapPanel:${mode}`);
  }

  if (mode === "map") {
    Promise.resolve(initializeOwnersMap()).then(() => {
      window.setTimeout(() => {
        resizeOwnersMap();
        syncOwnersMapResetPosition();
        if (ownersMap?.getSource("owner-points") && ownersMapRevealPending) {
          startOwnersMapFilterReveal(getOwnersMapPointFeatureCollection());
          return;
        }
        if (isCstTableEnterWaitingForMap?.()) return;
        markCstWorkspaceMapReadyToReveal?.();
        if (!isOwnersMapUpdateInFlight()) {
          fitOwnersMapToVisibleLocations();
        }
      }, getMotionDelay(280));
    }).catch((error) => {
      console.warn("Unable to initialize the owners map.", error);
    });
  }
}

const CST_MOCK_USER_LOCATION = window.CST_ENV?.MOCK_USER_LOCATION ?? true;
const CST_MOCK_USER_COORDS = window.CST_ENV?.MOCK_USER_COORDS ?? {
  longitude: -73.986472,
  latitude: 40.703875,
  accuracy: 25
};
const CST_GEOLOCATE_ZOOM = window.CST_ENV?.GEOLOCATE_ZOOM ?? 6.5;

function installCstMockGeolocation() {
  if (!CST_MOCK_USER_LOCATION || !navigator.geolocation || navigator.geolocation.__cstMocked) return;

  const createMockPosition = () => ({
    coords: {
      latitude: CST_MOCK_USER_COORDS.latitude,
      longitude: CST_MOCK_USER_COORDS.longitude,
      accuracy: CST_MOCK_USER_COORDS.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  });

  const geolocation = navigator.geolocation;
  geolocation.getCurrentPosition = (success) => {
    window.setTimeout(() => success(createMockPosition()), 0);
  };
  geolocation.watchPosition = (success) => {
    return window.setTimeout(() => success(createMockPosition()), 0);
  };
  geolocation.clearWatch = (watchId) => {
    window.clearTimeout(watchId);
  };
  geolocation.__cstMocked = true;
}

async function applyCstGeolocationCoordinates(coords) {
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  const resolved = await window.cstLocationSearch?.resolveFromCoordinates?.(longitude, latitude);
  const label = resolved?.label || "My location";

  userLocationCenter = {
    lat: latitude,
    lng: longitude,
    label
  };

  if (typeof applyLocationSearchSelection === "function") {
    applyLocationSearchSelection({
      ...(resolved || {}),
      label,
      coordinates: { longitude, latitude },
      geoLevel: resolved?.geoLevel || "address"
    }, { replace: false, autoRadius: false });
  }

  return true;
}

function locateUserFromFilters() {
  installCstMockGeolocation();

  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((position) => {
    void (async () => {
      if (!await applyCstGeolocationCoordinates(position.coords)) return;

      if (typeof dismissOpenCstSplash === "function") {
        dismissOpenCstSplash();
      }

      setRadiusFilterEnabled(true, { refresh: true });
      openMapPanel("map");
      updateFilterSectionClearButtons?.();
    })();
  });
}

function initializeOwnersMap() {
  if (card?.classList.contains("is-splash-open")) return Promise.resolve();
  if (ownersMapInitialized || !HAS_MAPBOX_ACCESS_TOKEN) return Promise.resolve();

  return ensureCstMapboxGl().then(() => {
    if (ownersMapInitialized || !window.mapboxgl || card?.classList.contains("is-splash-open")) return;
    createOwnersMap();
  });
}

function createOwnersMap() {
  if (ownersMapInitialized || !window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  installCstMockGeolocation();
  ownersMapInitialized = true;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  setOwnersMapBusy(true);
  ownersMap = new mapboxgl.Map({
    container: "ownersMap",
    style: MAPBOX_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: 3.1,
    projection: "mercator",
    attributionControl: false,
    logoPosition: "bottom-left",
    preserveDrawingBuffer: true
  });
  ensureOwnersMapResizeObserver();
  bindOwnersMapResetControl();
  ownersMap.on("moveend", updateOwnersMapResetVisibility);

  const ownersGeolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    fitBoundsOptions: {
      zoom: CST_GEOLOCATE_ZOOM,
      maxZoom: CST_GEOLOCATE_ZOOM,
      duration: getOwnersMapFocusDuration()
    },
    trackUserLocation: false,
    showUserHeading: false
  });
  ownersGeolocateControl.on("geolocate", (event) => {
    void (async () => {
      if (!await applyCstGeolocationCoordinates(event.coords)) return;
      if (radiusFilterEnabled) {
        refreshRangeFilterResults?.();
      }
      updateFilterSectionClearButtons?.();
    })();
  });
  ownersMap.addControl(ownersGeolocateControl, "bottom-right");

  ownersMap.addControl(new mapboxgl.NavigationControl({
    visualizePitch: false
  }), "bottom-right");

  const ownersMapZoomIn = ownersMap.zoomIn.bind(ownersMap);
  const ownersMapZoomOut = ownersMap.zoomOut.bind(ownersMap);
  ownersMap.zoomIn = (options, eventData) => ownersMapZoomIn({
    duration: getOwnersMapFocusDuration(),
    ...options
  }, eventData);
  ownersMap.zoomOut = (options, eventData) => ownersMapZoomOut({
    duration: getOwnersMapFocusDuration(),
    ...options
  }, eventData);

  ownersMap.on("load", () => {
    ownersMap.addSource("radius-circles", {
      type: "geojson",
      data: getRadiusCircleFeatureCollection()
    });

    ownersMap.addLayer({
      id: "radius-circles-fill",
      type: "fill",
      source: "radius-circles",
      paint: {
        "fill-color": "#7a63dd",
        "fill-opacity": 0.12
      }
    });

    ownersMap.addLayer({
      id: "radius-circles-outline",
      type: "line",
      source: "radius-circles",
      paint: {
        "line-color": "#7a63dd",
        "line-width": 1.5,
        "line-opacity": 0.55
      }
    });

    ownersMap.addSource("owner-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      promoteId: "featureId"
    });

    ownersMap.addLayer({
      id: "owner-points",
      type: "circle",
      source: "owner-points",
      maxzoom: MAP_LOGO_MIN_ZOOM,
      filter: getMapPointBaseLayerFilter(),
      layout: {
        "circle-sort-key": getOwnersMapPointSortKeyExpression()
      },
      paint: {
        "circle-radius": getMapPointBaseCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": getOwnersMapPointColorExpression(),
        "circle-color-transition": { duration: 180, delay: 0 },
        "circle-opacity": getOwnersMapPointOpacityExpression(),
        "circle-opacity-transition": getOwnersMapPointOpacityTransition(),
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": getOwnersMapPointOpacityExpression(),
        "circle-stroke-opacity-transition": getOwnersMapPointOpacityTransition()
      }
    });

    ownersMap.addLayer({
      id: "owner-points-hover",
      type: "circle",
      source: "owner-points",
      maxzoom: MAP_LOGO_MIN_ZOOM,
      filter: getMapPointHoverLayerFilter(),
      layout: {
        "circle-sort-key": getOwnersMapPointSortKeyExpression()
      },
      paint: {
        "circle-radius": getMapPointHoverCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": getOwnersMapPointColorExpression(),
        "circle-color-transition": { duration: 180, delay: 0 },
        "circle-opacity": getOwnersMapPointOpacityExpression(),
        "circle-opacity-transition": getOwnersMapPointOpacityTransition(),
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": getOwnersMapPointOpacityExpression(),
        "circle-stroke-opacity-transition": getOwnersMapPointOpacityTransition()
      }
    });

    ownersMap.addLayer({
      id: "owner-points-logos",
      type: "symbol",
      source: "owner-points",
      minzoom: MAP_LOGO_MIN_ZOOM,
      filter: getMapPointBaseLayerFilter(),
      layout: {
        "icon-image": ["get", "logoImageId"],
        "icon-size": 1,
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-padding": 0,
        "symbol-sort-key": getOwnersMapPointSortKeyExpression()
      },
      paint: {
        "icon-opacity": getOwnersMapLogoOpacityExpression(),
        "icon-opacity-transition": getOwnersMapPointOpacityTransition()
      }
    });

    ownersMap.addLayer({
      id: "owner-points-logos-hover",
      type: "symbol",
      source: "owner-points",
      minzoom: MAP_LOGO_MIN_ZOOM,
      filter: getMapPointHoverLayerFilter(),
      layout: {
        "icon-image": ["get", "logoImageId"],
        "icon-size": MAP_LOGO_HOVER_SCALE,
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-padding": 0,
        "symbol-sort-key": getOwnersMapPointSortKeyExpression()
      },
      paint: {
        "icon-opacity": getOwnersMapLogoOpacityExpression(),
        "icon-opacity-transition": getOwnersMapPointOpacityTransition()
      }
    });

    bindOwnersMapLogoImageFallback();

    ownersMapPointHover = createOwnersMapInteractionController(ownersMap);
    ownersMapPointHover.bind();

    startOwnersMapFilterReveal(getOwnersMapPointFeatureCollection());
  });
}

function resizeOwnersMap() {
  if (ownersMap) {
    ownersMap.resize();
  }
  syncOwnersMapResetPosition();
}
