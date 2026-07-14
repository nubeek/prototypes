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

function getMapFilterLocationCenter(locationLabel) {
  if (!locationLabel) return null;

  const locationCenters = [];

  if (typeof OWNER_LOCATION_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_LOCATION_CENTERS);
  }

  if (typeof OWNER_HEADQUARTERS_CENTERS !== "undefined") {
    locationCenters.push(...OWNER_HEADQUARTERS_CENTERS);
  }

  return locationCenters.find((location) => location.label === locationLabel) || null;
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

function getSelectedRadiusCenters() {
  return selectedLocationLabels
    .map((label) => getMapFilterLocationCenter(label))
    .filter(Boolean);
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

function rowMatchesLocationFilter(row) {
  if (excludedLocationLabels.includes(row.location)) return false;

  if (isRadiusFilterActive()) {
    if (typeof row?.lat === "number" && typeof row?.lng === "number") {
      return locationWithinSelectedRadius(row);
    }
    return true;
  }

  if (selectedLocationLabels.length && !selectedLocationLabels.includes(row.location)) {
    return false;
  }

  return true;
}

function mapLocationMatchesSelectedFilter(location) {
  if (excludedLocationLabels.includes(location.label)) return false;

  if (isRadiusFilterActive()) {
    return locationWithinSelectedRadius(location);
  }

  if (!selectedLocationLabels.length) return true;
  if (!selectedLocationLabels.includes(location.label)) return false;

  const selectedMapLocationCenter = getMapFilterLocationCenter(location.label);
  if (!selectedMapLocationCenter) return true;

  return getLocationDistanceMiles(location, selectedMapLocationCenter) <= MAP_LOCATION_FILTER_RADIUS_MILES;
}

function getMapPointFeatures(ownerIndex = activeMapOwnerIndex) {
  const selectedMapOwnerIndexes = selectedOwnerIndexes.length
    ? new Set(selectedOwnerIndexes.map(Number))
    : null;
  const excludedMapOwnerIndexes = excludedOwnerIndexes.length
    ? new Set(excludedOwnerIndexes.map(Number))
    : null;
  const filteredMapOwnerIndexes = ownerIndex === null
    ? new Set(getFilteredOwners().map((owner) => owner.originalIndex))
    : null;

  return (window.ownerLocationsData || [])
    .flatMap((owner, index) => {
      if (ownerIndex !== null && index !== ownerIndex) return [];
      if (filteredMapOwnerIndexes && !filteredMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && selectedMapOwnerIndexes?.size && !selectedMapOwnerIndexes.has(index)) return [];
      if (ownerIndex === null && excludedMapOwnerIndexes?.has(index)) return [];

      return owner.locations
        .filter((location) => mapLocationMatchesSelectedFilter(location))
        .map((location, locationIndex) => ({
          type: "Feature",
          properties: {
            featureId: `${index}-${locationIndex}-${location.lng}-${location.lat}`,
            ownerIndex: index,
            ownerName: owner.ownerName,
            locationLabel: location.label,
            franchise: location.franchise || "",
            color: owner.color
          },
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat]
          }
        }));
    });
}

function getMapPointRadiusAtZoom(zoom) {
  const clampedZoom = Math.min(
    MAP_POINT_ZOOM_MAX,
    Math.max(MAP_POINT_ZOOM_MIN, zoom)
  );
  const zoomProgress = (clampedZoom - MAP_POINT_ZOOM_MIN) /
    (MAP_POINT_ZOOM_MAX - MAP_POINT_ZOOM_MIN);

  return MAP_POINT_RADIUS +
    (MAP_POINT_RADIUS_MAX - MAP_POINT_RADIUS) * zoomProgress;
}

function getCircleOverlapCenterDistance(radius, overlapRatio) {
  let minimumDistanceRatio = 0;
  let maximumDistanceRatio = 2;

  for (let iteration = 0; iteration < 24; iteration += 1) {
    const distanceRatio = (minimumDistanceRatio + maximumDistanceRatio) / 2;
    const overlapAreaRatio = (
      2 * Math.acos(distanceRatio / 2) -
      0.5 * distanceRatio * Math.sqrt(4 - distanceRatio ** 2)
    ) / Math.PI;

    if (overlapAreaRatio > overlapRatio) {
      minimumDistanceRatio = distanceRatio;
    } else {
      maximumDistanceRatio = distanceRatio;
    }
  }

  return radius * ((minimumDistanceRatio + maximumDistanceRatio) / 2);
}

function buildMapPointClusterFeature(features, pointIndexes, clusterCoordinates, clusterRootKey) {
  if (pointIndexes.length === 1) {
    const feature = features[pointIndexes[0]];
    return {
      ...feature,
      properties: {
        ...feature.properties,
        isCluster: false
      }
    };
  }

  const colorCounts = pointIndexes.reduce((counts, pointIndex) => {
    const color = features[pointIndex].properties.color;
    counts.set(color, (counts.get(color) || 0) + 1);
    return counts;
  }, new Map());
  const clusterColor = Array.from(colorCounts.entries()).reduce(
    (dominant, entry) => entry[1] > dominant[1] ? entry : dominant
  )[0];
  const clusterMemberCoordinates = pointIndexes.map(
    (pointIndex) => features[pointIndex].geometry.coordinates
  );
  const clusterMemberFeatureIds = pointIndexes.map(
    (pointIndex) => features[pointIndex].properties.featureId
  );

  return {
    type: "Feature",
    properties: {
      featureId: `cluster-${clusterRootKey}-${pointIndexes.length}`,
      isCluster: true,
      clusterCount: pointIndexes.length,
      color: clusterColor,
      clusterMemberCoordinates: JSON.stringify(clusterMemberCoordinates),
      clusterMemberFeatureIds: JSON.stringify(clusterMemberFeatureIds)
    },
    geometry: {
      type: "Point",
      coordinates: clusterCoordinates
    }
  };
}

function getCoincidentCoordinateKey(coordinates) {
  return `${coordinates[0]}:${coordinates[1]}`;
}

function getCoincidentMapPointFeatureCollection() {
  const features = getMapPointFeatures();
  const pointIndexesByCoordinate = new Map();

  features.forEach((feature, pointIndex) => {
    const coordinateKey = getCoincidentCoordinateKey(feature.geometry.coordinates);
    const pointIndexes = pointIndexesByCoordinate.get(coordinateKey) || [];
    pointIndexes.push(pointIndex);
    pointIndexesByCoordinate.set(coordinateKey, pointIndexes);
  });

  const clusteredFeatures = Array.from(pointIndexesByCoordinate.entries()).map(
    ([coordinateKey, pointIndexes]) => buildMapPointClusterFeature(
      features,
      pointIndexes,
      features[pointIndexes[0]].geometry.coordinates,
      `coincident-${coordinateKey}`
    )
  );

  return {
    type: "FeatureCollection",
    features: clusteredFeatures
  };
}

function getClusteredMapPointFeatureCollection(mapInstance = ownersMap) {
  const features = getMapPointFeatures();
  if (!mapInstance || features.length < 2) {
    return { type: "FeatureCollection", features };
  }

  const pointRadius = getMapPointRadiusAtZoom(mapInstance.getZoom());
  const clusterDistance = getCircleOverlapCenterDistance(
    pointRadius,
    getMapClusteringOverlapRatio()
  );
  const clusterDistanceSquared = clusterDistance ** 2;
  const projectedPoints = features.map((feature) => (
    mapInstance.project(feature.geometry.coordinates)
  ));
  const parents = features.map((_, index) => index);
  const grid = new Map();

  const getRoot = (index) => {
    let root = index;
    while (parents[root] !== root) {
      root = parents[root];
    }

    while (parents[index] !== index) {
      const parent = parents[index];
      parents[index] = root;
      index = parent;
    }

    return root;
  };

  const joinGroups = (firstIndex, secondIndex) => {
    const firstRoot = getRoot(firstIndex);
    const secondRoot = getRoot(secondIndex);
    if (firstRoot !== secondRoot) {
      parents[secondRoot] = firstRoot;
    }
  };

  projectedPoints.forEach((point, pointIndex) => {
    const cellX = Math.floor(point.x / clusterDistance);
    const cellY = Math.floor(point.y / clusterDistance);

    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        const nearbyPointIndexes = grid.get(`${cellX + xOffset}:${cellY + yOffset}`) || [];

        nearbyPointIndexes.forEach((nearbyPointIndex) => {
          const nearbyPoint = projectedPoints[nearbyPointIndex];
          const xDistance = point.x - nearbyPoint.x;
          const yDistance = point.y - nearbyPoint.y;

          if (xDistance ** 2 + yDistance ** 2 < clusterDistanceSquared) {
            joinGroups(pointIndex, nearbyPointIndex);
          }
        });
      }
    }

    const cellKey = `${cellX}:${cellY}`;
    const cellPointIndexes = grid.get(cellKey) || [];
    cellPointIndexes.push(pointIndex);
    grid.set(cellKey, cellPointIndexes);
  });

  const pointIndexesByRoot = new Map();
  features.forEach((_, pointIndex) => {
    const root = getRoot(pointIndex);
    const pointIndexes = pointIndexesByRoot.get(root) || [];
    pointIndexes.push(pointIndex);
    pointIndexesByRoot.set(root, pointIndexes);
  });

  const clusteredFeatures = Array.from(pointIndexesByRoot.entries()).map(([root, pointIndexes]) => {
    const center = pointIndexes.reduce(
      (total, pointIndex) => ({
        x: total.x + projectedPoints[pointIndex].x,
        y: total.y + projectedPoints[pointIndex].y
      }),
      { x: 0, y: 0 }
    );
    const clusterCenter = mapInstance.unproject([
      center.x / pointIndexes.length,
      center.y / pointIndexes.length
    ]);

    return buildMapPointClusterFeature(
      features,
      pointIndexes,
      [clusterCenter.lng, clusterCenter.lat],
      root
    );
  });

  return {
    type: "FeatureCollection",
    features: clusteredFeatures
  };
}

function getOwnersMapPointFeatureCollection(mapInstance = ownersMap) {
  if (!mapClusteringEnabled) {
    return getCoincidentMapPointFeatureCollection();
  }

  return getClusteredMapPointFeatureCollection(mapInstance);
}

function rememberOwnersMapStablePointData(collection) {
  ownersMapStablePointCollection = collection;
  ownersMapStablePointZoom = ownersMap?.getZoom() ?? null;
}

function setOwnersMapStablePointData(collection) {
  ownersMap?.getSource("owner-points")?.setData(collection);
  rememberOwnersMapStablePointData(collection);
}

function refreshOwnersMapPointData() {
  if (!ownersMap?.getSource("owner-points")) return;

  pendingOwnersMapClusterExpansion = null;
  ownersMapSpiderExpansionActive = false;
  stopOwnersMapPointExpansion();
  clearOwnersMapSpiderLines();
  ownersMapPointHover?.clearHover();
  setOwnersMapStablePointData(getOwnersMapPointFeatureCollection());
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

function getVisibleMapCoordinates() {
  const coordinates = getMapPointFeatures().map((feature) => feature.geometry.coordinates);

  if (isRadiusFilterActive()) {
    getRadiusCircleFeatureCollection().features.forEach((feature) => {
      coordinates.push(...feature.geometry.coordinates[0]);
    });
  }

  return coordinates;
}

function fitOwnersMapToVisibleLocations() {
  if (!ownersMap || !window.mapboxgl) return;
  if (!ownersMap.loaded()) {
    ownersMap.once("idle", () => fitOwnersMapToVisibleLocations());
    return;
  }

  const coordinates = getVisibleMapCoordinates();
  if (!coordinates.length) return;

  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate);
  });

  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    bounds.extend([lng - 0.35, lat - 0.35]);
    bounds.extend([lng + 0.35, lat + 0.35]);
  }

  ownersMap.fitBounds(bounds, {
    padding: MAP_FIT_PADDING,
    duration: 420,
    maxZoom: 9
  });
}

function fitMapToCoordinates(mapInstance, coordinates, padding = MAP_FIT_PADDING) {
  if (!mapInstance || !window.mapboxgl || !coordinates.length) return;

  const bounds = getMapBoundsForCoordinates(coordinates);

  mapInstance.fitBounds(bounds, {
    padding,
    duration: 420,
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
    ["case", ["==", ["get", "isSpiderfied"], true], 9, MAP_POINT_RADIUS],
    MAP_POINT_ZOOM_MAX,
    ["case", ["==", ["get", "isSpiderfied"], true], 9, MAP_POINT_RADIUS_MAX],
    22,
    ["case", ["==", ["get", "isSpiderfied"], true], 9, MAP_POINT_RADIUS_MAX]
  ];
}

function getMapPointHoverCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    MAP_POINT_ZOOM_MIN,
    ["case", ["==", ["get", "isSpiderfied"], true], 12, MAP_POINT_RADIUS * MAP_POINT_HOVER_SCALE],
    MAP_POINT_ZOOM_MAX,
    ["case", ["==", ["get", "isSpiderfied"], true], 12, MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE],
    22,
    ["case", ["==", ["get", "isSpiderfied"], true], 12, MAP_POINT_RADIUS_MAX * MAP_POINT_HOVER_SCALE]
  ];
}

function getMapClusterCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["get", "clusterCount"],
    2,
    12,
    25,
    15,
    100,
    18,
    500,
    22
  ];
}

function getMapClusterHoverCircleRadiusExpression() {
  return [
    "interpolate",
    ["linear"],
    ["get", "clusterCount"],
    2,
    14,
    25,
    17,
    100,
    21,
    500,
    25
  ];
}

function getMapClusterBaseLayerFilter(featureId = null) {
  if (!featureId) {
    return ["==", ["get", "isCluster"], true];
  }

  return [
    "all",
    ["==", ["get", "isCluster"], true],
    ["!=", ["get", "featureId"], featureId]
  ];
}

function getMapClusterHoverLayerFilter(featureId = null) {
  if (!featureId) {
    return ["==", ["get", "featureId"], ""];
  }

  return [
    "all",
    ["==", ["get", "isCluster"], true],
    ["==", ["get", "featureId"], featureId]
  ];
}

function getMapClusterCountLayerFilter(featureId = null) {
  if (!featureId) {
    return ["==", ["get", "isCluster"], true];
  }

  return [
    "all",
    ["==", ["get", "isCluster"], true],
    ["!=", ["get", "featureId"], featureId]
  ];
}

function getMapClusterCountHoverLayerFilter(featureId = null) {
  return getMapClusterHoverLayerFilter(featureId);
}

function getMapClusterCountLayerLayout() {
  return {
    "text-field": ["to-string", ["get", "clusterCount"]],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-size": 11,
    "text-allow-overlap": true,
    "text-ignore-placement": true
  };
}

function getMapClusterCountLayerPaint() {
  return {
    "text-color": "#ffffff",
    "text-opacity": ["coalesce", ["get", "expansionOpacity"], 1]
  };
}

function getClusterMemberCoordinates(clusterFeature) {
  const rawCoordinates = clusterFeature?.properties?.clusterMemberCoordinates;
  if (!rawCoordinates) return [];

  try {
    const coordinates = JSON.parse(rawCoordinates);
    return Array.isArray(coordinates) ? coordinates : [];
  } catch (error) {
    return [];
  }
}

function getClusterMemberFeatureIds(clusterFeature) {
  const rawFeatureIds = clusterFeature?.properties?.clusterMemberFeatureIds;
  if (!rawFeatureIds) return [];

  try {
    const featureIds = JSON.parse(rawFeatureIds);
    return Array.isArray(featureIds) ? featureIds : [];
  } catch (error) {
    return [];
  }
}

function stopOwnersMapPointExpansion() {
  if (ownersMapPointExpansionFrame === null) return;

  cancelAnimationFrame(ownersMapPointExpansionFrame);
  ownersMapPointExpansionFrame = null;
}

function getEmptyMapFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function setOwnersMapSpiderLines(features = []) {
  ownersMap?.getSource("owner-point-spider-lines")?.setData({
    type: "FeatureCollection",
    features
  });
}

function clearOwnersMapSpiderLines() {
  setOwnersMapSpiderLines();
}

function collapseOwnersMapSpiderExpansion() {
  if (!ownersMapSpiderExpansionActive) return;

  ownersMapSpiderExpansionActive = false;
  stopOwnersMapPointExpansion();
  clearOwnersMapSpiderLines();
  ownersMapPointHover?.clearHover();
  setOwnersMapStablePointData(getOwnersMapPointFeatureCollection());
}

function getMapFeatureMemberIds(feature) {
  if (feature?.properties?.isCluster) {
    return getClusterMemberFeatureIds(feature);
  }

  const featureId = feature?.properties?.featureId;
  return featureId ? [featureId] : [];
}

function getStableMapFeatureHash(value) {
  let hash = 2166136261;
  const text = String(value);

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getSpiderfyLayoutEntries(features, originPoint) {
  const sortedFeatures = [...features].sort((firstFeature, secondFeature) => (
    getStableMapFeatureHash(firstFeature.properties.featureId) -
    getStableMapFeatureHash(secondFeature.properties.featureId)
  ));

  return sortedFeatures.map((feature, featureIndex) => {
    const ringIndex = Math.floor(featureIndex / 12);
    const ringStartIndex = ringIndex * 12;
    const ringItemCount = Math.min(12, sortedFeatures.length - ringStartIndex);
    const ringPosition = featureIndex - ringStartIndex;
    const hashRatio = getStableMapFeatureHash(feature.properties.featureId) / 0xffffffff;
    const angleJitter = (hashRatio - 0.5) * 0.16;
    const radiusJitter = (hashRatio - 0.5) * 12;
    const angle = (
      -Math.PI / 2 +
      ((ringPosition / ringItemCount) * Math.PI * 2) +
      angleJitter
    );
    const radius = (
      MAP_CLUSTER_SPIDERFY_RADIUS_PX +
      (ringIndex * MAP_CLUSTER_SPIDERFY_RING_GAP_PX) +
      radiusJitter
    );

    return {
      feature,
      targetPoint: {
        x: originPoint.x + (Math.cos(angle) * radius),
        y: originPoint.y + (Math.sin(angle) * radius)
      }
    };
  });
}

function getSpiderLineFeature(pointFeature, centerCoordinates, pointCoordinates, opacity = 1) {
  return {
    type: "Feature",
    properties: {
      featureId: `spider-line-${pointFeature.properties.featureId}`,
      expansionOpacity: opacity
    },
    geometry: {
      type: "LineString",
      coordinates: [centerCoordinates, pointCoordinates]
    }
  };
}

function animateOwnersMapClusterSpiderfy(expansion, targetCollection) {
  const pointSource = ownersMap?.getSource("owner-points");
  const lineSource = ownersMap?.getSource("owner-point-spider-lines");
  if (!pointSource || !lineSource) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  const memberFeatures = getMapPointFeatures().filter(
    (feature) => expansion.memberFeatureIds.has(feature.properties.featureId)
  );
  if (memberFeatures.length < 2) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  stopOwnersMapPointExpansion();
  ownersMapSpiderExpansionActive = true;

  const originPoint = ownersMap.project(expansion.originCoordinates);
  const layoutEntries = getSpiderfyLayoutEntries(memberFeatures, originPoint);
  const retainedFeatures = targetCollection.features.filter(
    (feature) => !getMapFeatureMemberIds(feature).some(
      (featureId) => expansion.memberFeatureIds.has(featureId)
    )
  );

  const getSpiderFrameData = (positionProgress, opacity) => {
    const spiderFeatures = [];
    const spiderLines = [];

    layoutEntries.forEach(({ feature, targetPoint }) => {
      const currentPoint = {
        x: originPoint.x + ((targetPoint.x - originPoint.x) * positionProgress),
        y: originPoint.y + ((targetPoint.y - originPoint.y) * positionProgress)
      };
      const currentLngLat = ownersMap.unproject([currentPoint.x, currentPoint.y]);
      const currentCoordinates = [currentLngLat.lng, currentLngLat.lat];
      const spiderFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          isCluster: false,
          isSpiderfied: true,
          expansionOpacity: opacity
        },
        geometry: {
          ...feature.geometry,
          coordinates: currentCoordinates
        }
      };

      spiderFeatures.push(spiderFeature);
      spiderLines.push(getSpiderLineFeature(
        spiderFeature,
        expansion.originCoordinates,
        currentCoordinates,
        opacity
      ));
    });

    return { spiderFeatures, spiderLines };
  };

  const setFinalSpiderData = () => {
    const { spiderFeatures, spiderLines } = getSpiderFrameData(1, 1);
    const finalSpiderFeatures = spiderFeatures.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        expansionOpacity: 1
      }
    }));

    pointSource.setData({
      type: "FeatureCollection",
      features: [...retainedFeatures, ...finalSpiderFeatures]
    });
    lineSource.setData({
      type: "FeatureCollection",
      features: spiderLines
    });
    rememberOwnersMapStablePointData(targetCollection);
  };

  if (usesReducedMotion()) {
    setFinalSpiderData();
    return;
  }

  const startedAt = performance.now();
  const renderSpiderFrame = (timestamp) => {
    if (!ownersMapSpiderExpansionActive || !ownersMap?.getSource("owner-points")) {
      ownersMapPointExpansionFrame = null;
      return;
    }

    const progress = Math.min(
      1,
      (timestamp - startedAt) / MAP_CLUSTER_EXPANSION_DURATION_MS
    );
    const easedProgress = 1 - ((1 - progress) ** 3);
    const expansionOpacity = Math.min(1, progress * 2.5);
    const { spiderFeatures, spiderLines } = getSpiderFrameData(
      easedProgress,
      expansionOpacity
    );
    const frameFeatures = [...retainedFeatures, ...spiderFeatures];

    if (progress < 1) {
      frameFeatures.push({
        type: "Feature",
        properties: {
          ...expansion.originProperties,
          featureId: `expansion-origin-${expansion.originProperties.featureId}`,
          expansionOpacity: 1 - progress
        },
        geometry: {
          type: "Point",
          coordinates: expansion.originCoordinates
        }
      });
    }

    pointSource.setData({
      type: "FeatureCollection",
      features: frameFeatures
    });
    lineSource.setData({
      type: "FeatureCollection",
      features: spiderLines
    });

    if (progress < 1) {
      ownersMapPointExpansionFrame = requestAnimationFrame(renderSpiderFrame);
      return;
    }

    ownersMapPointExpansionFrame = null;
    setFinalSpiderData();
  };

  ownersMapPointExpansionFrame = requestAnimationFrame(renderSpiderFrame);
}

function animateOwnersMapClusterExpansion(expansion) {
  const source = ownersMap?.getSource("owner-points");
  if (!source) return;

  stopOwnersMapPointExpansion();

  const targetCollection = getOwnersMapPointFeatureCollection();
  const originPoint = ownersMap.project(expansion.originCoordinates);
  const animatedTargets = new Map();

  targetCollection.features.forEach((feature, featureIndex) => {
    const belongsToExpandedCluster = getMapFeatureMemberIds(feature).some(
      (featureId) => expansion.memberFeatureIds.has(featureId)
    );
    if (!belongsToExpandedCluster) return;

    animatedTargets.set(featureIndex, ownersMap.project(feature.geometry.coordinates));
  });

  const hasVisibleSeparation = Array.from(animatedTargets.values()).some(
    (targetPoint) => Math.hypot(
      targetPoint.x - originPoint.x,
      targetPoint.y - originPoint.y
    ) > 0.5
  );

  if (!animatedTargets.size) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  const unresolvedCluster = targetCollection.features.find((feature) => {
    if (!feature.properties?.isCluster) return false;

    const memberFeatureIds = getClusterMemberFeatureIds(feature);
    return (
      memberFeatureIds.length === expansion.memberFeatureIds.size &&
      memberFeatureIds.every((featureId) => expansion.memberFeatureIds.has(featureId))
    );
  });

  if (
    unresolvedCluster &&
    (
      !mapClusteringEnabled ||
      ownersMap.getZoom() >= MAP_CLUSTER_MAX_ZOOM - 0.01
    )
  ) {
    animateOwnersMapClusterSpiderfy(expansion, targetCollection);
    return;
  }

  if (!hasVisibleSeparation) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  if (usesReducedMotion()) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  const startedAt = performance.now();
  const renderExpansionFrame = (timestamp) => {
    if (!ownersMap?.getSource("owner-points")) {
      ownersMapPointExpansionFrame = null;
      return;
    }

    const progress = Math.min(
      1,
      (timestamp - startedAt) / MAP_CLUSTER_EXPANSION_DURATION_MS
    );
    const easedProgress = 1 - ((1 - progress) ** 3);
    const expansionOpacity = Math.min(1, progress * 2.5);
    const animatedFeatures = targetCollection.features.map((feature, featureIndex) => {
      const targetPoint = animatedTargets.get(featureIndex);
      if (!targetPoint) return feature;

      const currentPoint = {
        x: originPoint.x + ((targetPoint.x - originPoint.x) * easedProgress),
        y: originPoint.y + ((targetPoint.y - originPoint.y) * easedProgress)
      };
      const currentCoordinates = ownersMap.unproject([currentPoint.x, currentPoint.y]);

      return {
        ...feature,
        properties: {
          ...feature.properties,
          expansionOpacity
        },
        geometry: {
          ...feature.geometry,
          coordinates: [currentCoordinates.lng, currentCoordinates.lat]
        }
      };
    });

    if (progress < 1) {
      animatedFeatures.push({
        type: "Feature",
        properties: {
          ...expansion.originProperties,
          featureId: `expansion-origin-${expansion.originProperties.featureId}`,
          expansionOpacity: 1 - progress
        },
        geometry: {
          type: "Point",
          coordinates: expansion.originCoordinates
        }
      });
    }

    source.setData({
      type: "FeatureCollection",
      features: animatedFeatures
    });

    if (progress < 1) {
      ownersMapPointExpansionFrame = requestAnimationFrame(renderExpansionFrame);
      return;
    }

    ownersMapPointExpansionFrame = null;
    setOwnersMapStablePointData(targetCollection);
  };

  ownersMapPointExpansionFrame = requestAnimationFrame(renderExpansionFrame);
}

function animateOwnersMapZoomClusterTransition(
  startCollection,
  targetCollection,
  isZoomingIn
) {
  const source = ownersMap?.getSource("owner-points");
  if (!source || usesReducedMotion()) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  const startFeatureByMemberId = new Map();
  const targetFeatureByMemberId = new Map();

  startCollection.features.forEach((feature) => {
    getMapFeatureMemberIds(feature).forEach((memberId) => {
      startFeatureByMemberId.set(memberId, feature);
    });
  });
  targetCollection.features.forEach((feature) => {
    getMapFeatureMemberIds(feature).forEach((memberId) => {
      targetFeatureByMemberId.set(memberId, feature);
    });
  });

  const getScreenDistance = (firstCoordinates, secondCoordinates) => {
    const firstPoint = ownersMap.project(firstCoordinates);
    const secondPoint = ownersMap.project(secondCoordinates);
    return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
  };
  const isChangedFeature = (startFeature, targetFeature) => (
    startFeature.properties?.featureId !== targetFeature.properties?.featureId ||
    getScreenDistance(
      startFeature.geometry.coordinates,
      targetFeature.geometry.coordinates
    ) > 0.5
  );
  const transitionEntries = [];
  const affectedTargetIds = new Set();

  if (isZoomingIn) {
    targetCollection.features.forEach((targetFeature, targetIndex) => {
      const memberId = getMapFeatureMemberIds(targetFeature)[0];
      const startFeature = startFeatureByMemberId.get(memberId);
      if (!startFeature || !isChangedFeature(startFeature, targetFeature)) return;

      transitionEntries.push({
        startFeature,
        targetFeature,
        targetIndex
      });
      affectedTargetIds.add(targetFeature.properties.featureId);
    });
  } else {
    startCollection.features.forEach((startFeature, startIndex) => {
      const memberId = getMapFeatureMemberIds(startFeature)[0];
      const targetFeature = targetFeatureByMemberId.get(memberId);
      if (!targetFeature || !isChangedFeature(startFeature, targetFeature)) return;

      transitionEntries.push({
        startFeature,
        targetFeature,
        startIndex
      });
      affectedTargetIds.add(targetFeature.properties.featureId);
    });
  }

  if (!transitionEntries.length) {
    setOwnersMapStablePointData(targetCollection);
    return;
  }

  const transitionEntryByTargetIndex = new Map(
    transitionEntries
      .filter((entry) => Number.isInteger(entry.targetIndex))
      .map((entry) => [entry.targetIndex, entry])
  );
  stopOwnersMapPointExpansion();
  const startedAt = performance.now();
  let previousFrameTimestamp = null;
  const renderZoomTransitionFrame = (timestamp) => {
    if (!ownersMap?.getSource("owner-points")) {
      ownersMapPointExpansionFrame = null;
      return;
    }

    const progress = Math.min(
      1,
      (timestamp - startedAt) / MAP_ZOOM_CLUSTER_TRANSITION_DURATION_MS
    );
    if (
      progress < 1 &&
      previousFrameTimestamp !== null &&
      timestamp - previousFrameTimestamp < MAP_ZOOM_CLUSTER_TRANSITION_FRAME_INTERVAL_MS
    ) {
      ownersMapPointExpansionFrame = requestAnimationFrame(renderZoomTransitionFrame);
      return;
    }

    previousFrameTimestamp = timestamp;
    const easedProgress = 1 - ((1 - progress) ** 3);
    const frameFeatures = targetCollection.features.map((feature, featureIndex) => {
      if (isZoomingIn) {
        const entry = transitionEntryByTargetIndex.get(featureIndex);
        if (!entry) return feature;

        const startPoint = ownersMap.project(entry.startFeature.geometry.coordinates);
        const targetPoint = ownersMap.project(feature.geometry.coordinates);
        const currentPoint = {
          x: startPoint.x + ((targetPoint.x - startPoint.x) * easedProgress),
          y: startPoint.y + ((targetPoint.y - startPoint.y) * easedProgress)
        };
        const currentLngLat = ownersMap.unproject([currentPoint.x, currentPoint.y]);

        return {
          ...feature,
          properties: {
            ...feature.properties,
            expansionOpacity: progress
          },
          geometry: {
            ...feature.geometry,
            coordinates: [currentLngLat.lng, currentLngLat.lat]
          }
        };
      }

      if (!affectedTargetIds.has(feature.properties.featureId)) return feature;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          expansionOpacity: progress
        }
      };
    });

    if (isZoomingIn) {
      const renderedStartFeatureIds = new Set();
      transitionEntries.forEach(({ startFeature }, entryIndex) => {
        const featureId = startFeature.properties.featureId;
        if (renderedStartFeatureIds.has(featureId)) return;
        renderedStartFeatureIds.add(featureId);

        frameFeatures.push({
          ...startFeature,
          properties: {
            ...startFeature.properties,
            featureId: `zoom-expansion-origin-${entryIndex}-${featureId}`,
            expansionOpacity: 1 - progress
          }
        });
      });
    } else {
      transitionEntries.forEach(({ startFeature, targetFeature, startIndex }) => {
        const startPoint = ownersMap.project(startFeature.geometry.coordinates);
        const targetPoint = ownersMap.project(targetFeature.geometry.coordinates);
        const currentPoint = {
          x: startPoint.x + ((targetPoint.x - startPoint.x) * easedProgress),
          y: startPoint.y + ((targetPoint.y - startPoint.y) * easedProgress)
        };
        const currentLngLat = ownersMap.unproject([currentPoint.x, currentPoint.y]);

        frameFeatures.push({
          ...startFeature,
          properties: {
            ...startFeature.properties,
            featureId: `zoom-collapse-origin-${startIndex}-${startFeature.properties.featureId}`,
            expansionOpacity: 1 - progress
          },
          geometry: {
            ...startFeature.geometry,
            coordinates: [currentLngLat.lng, currentLngLat.lat]
          }
        });
      });
    }

    source.setData({
      type: "FeatureCollection",
      features: frameFeatures
    });

    if (progress < 1) {
      ownersMapPointExpansionFrame = requestAnimationFrame(renderZoomTransitionFrame);
      return;
    }

    ownersMapPointExpansionFrame = null;
    setOwnersMapStablePointData(targetCollection);
  };

  ownersMapPointExpansionFrame = requestAnimationFrame(renderZoomTransitionFrame);
}

function zoomOwnersMapToCluster(clusterFeature) {
  const coordinates = getClusterMemberCoordinates(clusterFeature);
  const memberFeatureIds = getClusterMemberFeatureIds(clusterFeature);
  if (!coordinates.length || !memberFeatureIds.length || !ownersMap || !window.mapboxgl) return;

  const bounds = getMapBoundsForCoordinates(coordinates);
  const expansion = {
    originCoordinates: [...clusterFeature.geometry.coordinates],
    originProperties: { ...clusterFeature.properties },
    memberFeatureIds: new Set(memberFeatureIds)
  };

  if (ownersMapPointClusterFrame !== null) {
    cancelAnimationFrame(ownersMapPointClusterFrame);
    ownersMapPointClusterFrame = null;
  }
  collapseOwnersMapSpiderExpansion();
  stopOwnersMapPointExpansion();
  ownersMapPointHover?.clearHover();

  if (ownersMap.getZoom() >= MAP_CLUSTER_MAX_ZOOM - 0.01) {
    pendingOwnersMapClusterExpansion = null;
    animateOwnersMapClusterExpansion(expansion);
    return;
  }

  pendingOwnersMapClusterExpansion = expansion;

  ownersMap.fitBounds(bounds, {
    padding: MAP_FIT_PADDING,
    duration: MAP_CLUSTER_ZOOM_DURATION_MS,
    maxZoom: MAP_CLUSTER_MAX_ZOOM
  });
}

function getMapPointHoverLayerFilter(featureId = null) {
  if (!featureId) {
    return [
      "all",
      ["!=", ["get", "isCluster"], true],
      ["==", ["get", "featureId"], ""]
    ];
  }

  return [
    "all",
    ["!=", ["get", "isCluster"], true],
    ["==", ["get", "featureId"], featureId]
  ];
}

function getMapPointBaseLayerFilter(featureId = null) {
  if (!featureId) {
    return ["!=", ["get", "isCluster"], true];
  }

  return [
    "all",
    ["!=", ["get", "isCluster"], true],
    ["!=", ["get", "featureId"], featureId]
  ];
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

    if (properties.isCluster) {
      const clusterCount = Number(properties.clusterCount) || 0;
      const title = document.createElement("div");
      title.className = "map-point-tooltip-title";
      title.textContent = clusterCount === 1 ? "1 location" : `${clusterCount} locations`;
      tooltip.append(title);

      const action = document.createElement("div");
      action.className = "map-point-tooltip-detail";
      action.textContent = mapClusteringEnabled ? "Click to zoom in" : "Click to expand";
      tooltip.append(action);
      return;
    }

    const ownerName = properties.ownerName || "";
    const locationLabel = properties.locationLabel || "";
    const franchise = properties.franchise || "";

    if (ownerName) {
      const title = document.createElement("div");
      title.className = "map-point-tooltip-title";
      title.textContent = ownerName;
      tooltip.append(title);
    }

    if (ownerName && (locationLabel || franchise)) {
      const divider = document.createElement("div");
      divider.className = "map-point-tooltip-divider";
      divider.setAttribute("aria-hidden", "true");
      tooltip.append(divider);
    }

    if (locationLabel) {
      const location = document.createElement("div");
      location.className = "map-point-tooltip-detail";
      location.textContent = locationLabel;
      tooltip.append(location);
    }

    if (franchise) {
      const franchiseLine = document.createElement("div");
      franchiseLine.className = "map-point-tooltip-detail";
      franchiseLine.textContent = franchise;
      tooltip.append(franchiseLine);
    }
  };

  const positionTooltip = () => {
    if (!activeCoordinates || !isVisible) return;

    const tooltip = getTooltip();
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
  let hoveredClusterId = null;
  const tooltip = createMapPointTooltipController(mapInstance);
  const pointBaseLayerId = "owner-points";
  const pointHoverLayerId = "owner-points-hover";
  const clusterBaseLayerId = "owner-point-clusters";
  const clusterHoverLayerId = "owner-point-clusters-hover";
  const clusterCountLayerId = "owner-point-cluster-counts";
  const clusterCountHoverLayerId = "owner-point-cluster-counts-hover";

  const syncHoverLayers = () => {
    mapInstance.setFilter(pointHoverLayerId, getMapPointHoverLayerFilter(hoveredPointId));
    mapInstance.setFilter(pointBaseLayerId, getMapPointBaseLayerFilter(hoveredPointId));
    mapInstance.setFilter(clusterHoverLayerId, getMapClusterHoverLayerFilter(hoveredClusterId));
    mapInstance.setFilter(clusterBaseLayerId, getMapClusterBaseLayerFilter(hoveredClusterId));
    mapInstance.setFilter(clusterCountLayerId, getMapClusterCountLayerFilter(hoveredClusterId));
    mapInstance.setFilter(clusterCountHoverLayerId, getMapClusterCountHoverLayerFilter(hoveredClusterId));
  };

  const clearHover = () => {
    if (hoveredPointId === null && hoveredClusterId === null) return;

    hoveredPointId = null;
    hoveredClusterId = null;
    syncHoverLayers();
    tooltip.hide();
  };

  const setPointHover = (feature) => {
    const featureId = feature?.properties?.featureId;
    if (!featureId || feature.properties?.isCluster) return;

    if (hoveredPointId === featureId && !hoveredClusterId) {
      tooltip.show(feature);
      return;
    }

    hoveredPointId = featureId;
    hoveredClusterId = null;
    syncHoverLayers();
    tooltip.show(feature);
  };

  const setClusterHover = (feature) => {
    const featureId = feature?.properties?.featureId;
    if (!featureId || !feature.properties?.isCluster) return;

    if (hoveredClusterId === featureId && !hoveredPointId) {
      tooltip.show(feature);
      return;
    }

    hoveredClusterId = featureId;
    hoveredPointId = null;
    syncHoverLayers();
    tooltip.show(feature);
  };

  const bind = () => {
    tooltip.bind();

    mapInstance.on("mousemove", (event) => {
      const clusterFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: [
          clusterCountHoverLayerId,
          clusterHoverLayerId,
          clusterCountLayerId,
          clusterBaseLayerId
        ]
      });

      if (clusterFeatures.length) {
        mapInstance.getCanvas().style.cursor = "pointer";
        setClusterHover(clusterFeatures[0]);
        return;
      }

      const pointFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: [pointHoverLayerId, pointBaseLayerId]
      });

      if (!pointFeatures.length) {
        clearHover();
        mapInstance.getCanvas().style.cursor = "";
        return;
      }

      mapInstance.getCanvas().style.cursor = "pointer";
      setPointHover(pointFeatures[0]);
    });

    mapInstance.on("click", (event) => {
      const clusterFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: [
          clusterCountHoverLayerId,
          clusterHoverLayerId,
          clusterCountLayerId,
          clusterBaseLayerId
        ]
      });

      if (clusterFeatures.length) {
        zoomOwnersMapToCluster(clusterFeatures[0]);
        return;
      }

      if (!ownersMapSpiderExpansionActive) return;

      const pointFeatures = mapInstance.queryRenderedFeatures(event.point, {
        layers: [pointHoverLayerId, pointBaseLayerId]
      });
      const clickedSpiderPoint = pointFeatures.some(
        (feature) => feature.properties?.isSpiderfied
      );
      if (!clickedSpiderPoint) {
        collapseOwnersMapSpiderExpansion();
      }
    });

    mapInstance.on("mouseleave", () => {
      clearHover();
      mapInstance.getCanvas().style.cursor = "";
    });
  };

  return { bind, clearHover };
}

function syncMapLocationFilter() {
  syncOwnerMapHeader();

  if (!ownersMap?.getSource("owner-points")) return;
  pendingOwnersMapClusterExpansion = null;
  ownersMapSpiderExpansionActive = false;
  stopOwnersMapPointExpansion();
  clearOwnersMapSpiderLines();
  ownersMapPointHover?.clearHover();
  setOwnersMapStablePointData(getOwnersMapPointFeatureCollection());
  ownersMap.getSource("radius-circles")?.setData(getRadiusCircleFeatureCollection());
  fitOwnersMapToVisibleLocations();
}

function scheduleOwnersMapPointClusterSync() {
  if (!ownersMap?.getSource("owner-points") || ownersMapPointClusterFrame !== null) return;

  ownersMapPointClusterFrame = requestAnimationFrame(() => {
    ownersMapPointClusterFrame = null;
    ownersMapPointHover?.clearHover();

    const pendingExpansion = pendingOwnersMapClusterExpansion;
    pendingOwnersMapClusterExpansion = null;
    if (pendingExpansion) {
      animateOwnersMapClusterExpansion(pendingExpansion);
      return;
    }

    if (!mapClusteringEnabled) return;

    stopOwnersMapPointExpansion();
    ownersMapSpiderExpansionActive = false;
    clearOwnersMapSpiderLines();
    const targetCollection = getOwnersMapPointFeatureCollection();
    const previousCollection = ownersMapStablePointCollection;
    const previousZoom = ownersMapStablePointZoom;
    const currentZoom = ownersMap.getZoom();
    const zoomChanged = (
      previousCollection &&
      Number.isFinite(previousZoom) &&
      Math.abs(currentZoom - previousZoom) > 0.01
    );

    if (zoomChanged) {
      animateOwnersMapZoomClusterTransition(
        previousCollection,
        targetCollection,
        currentZoom > previousZoom
      );
      return;
    }

    setOwnersMapStablePointData(targetCollection);
  });
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

  syncMapLocationFilter();
  renderActiveTable();
  syncToolbarTabState(getCurrentPanelMode());
}

function closeSidebar() {
  const closingMode = getCurrentPanelMode();

  lockedToolbarMode = null;
  clearSidebarOwnerState();
  card?.classList.remove("is-map-open");
  mapToggle?.setAttribute("aria-expanded", "false");
  resetPanelModeAfterClose(closingMode);
  renderActiveTable();
  syncToolbarTabState(closingMode);
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
  syncOwnerMapHeader(mode);
  syncToolbarTabState(mode);
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
    initializeOwnersMap();
    window.setTimeout(() => {
      resizeOwnersMap();
      fitOwnersMapToVisibleLocations();
    }, getMotionDelay(280));
  }
}

function initializeOwnersMap() {
  if (ownersMapInitialized || !window.mapboxgl || !HAS_MAPBOX_ACCESS_TOKEN) return;

  ownersMapInitialized = true;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  ownersMap = new mapboxgl.Map({
    container: "ownersMap",
    style: MAPBOX_STYLE,
    center: MAP_INITIAL_CENTER,
    zoom: 3.1,
    attributionControl: false,
    logoPosition: "bottom-right",
    preserveDrawingBuffer: true
  });
  ensureOwnersMapResizeObserver();

  ownersMap.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-left");

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

    const initialPointCollection = getOwnersMapPointFeatureCollection();
    ownersMap.addSource("owner-points", {
      type: "geojson",
      data: initialPointCollection,
      promoteId: "featureId"
    });
    rememberOwnersMapStablePointData(initialPointCollection);

    ownersMap.addSource("owner-point-spider-lines", {
      type: "geojson",
      data: getEmptyMapFeatureCollection()
    });

    ownersMap.addLayer({
      id: "owner-point-spider-lines",
      type: "line",
      source: "owner-point-spider-lines",
      paint: {
        "line-color": "#7f8793",
        "line-width": 1,
        "line-opacity": [
          "*",
          0.42,
          ["coalesce", ["get", "expansionOpacity"], 1]
        ]
      }
    });

    ownersMap.addLayer({
      id: "owner-points",
      type: "circle",
      source: "owner-points",
      filter: getMapPointBaseLayerFilter(),
      paint: {
        "circle-radius": getMapPointBaseCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "*",
          0.78,
          ["coalesce", ["get", "expansionOpacity"], 1]
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    ownersMap.addLayer({
      id: "owner-point-clusters",
      type: "circle",
      source: "owner-points",
      filter: getMapClusterBaseLayerFilter(),
      paint: {
        "circle-radius": getMapClusterCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "*",
          0.92,
          ["coalesce", ["get", "expansionOpacity"], 1]
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5
      }
    });

    ownersMap.addLayer({
      id: "owner-point-cluster-counts",
      type: "symbol",
      source: "owner-points",
      filter: getMapClusterCountLayerFilter(),
      layout: getMapClusterCountLayerLayout(),
      paint: getMapClusterCountLayerPaint()
    });

    ownersMap.addLayer({
      id: "owner-points-hover",
      type: "circle",
      source: "owner-points",
      filter: getMapPointHoverLayerFilter(),
      paint: {
        "circle-radius": getMapPointHoverCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "*",
          0.78,
          ["coalesce", ["get", "expansionOpacity"], 1]
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1
      }
    });

    ownersMap.addLayer({
      id: "owner-point-clusters-hover",
      type: "circle",
      source: "owner-points",
      filter: getMapClusterHoverLayerFilter(),
      paint: {
        "circle-radius": getMapClusterHoverCircleRadiusExpression(),
        "circle-radius-transition": { duration: 180, delay: 0 },
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "*",
          0.92,
          ["coalesce", ["get", "expansionOpacity"], 1]
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5
      }
    });

    ownersMap.addLayer({
      id: "owner-point-cluster-counts-hover",
      type: "symbol",
      source: "owner-points",
      filter: getMapClusterCountHoverLayerFilter(),
      layout: getMapClusterCountLayerLayout(),
      paint: getMapClusterCountLayerPaint()
    });

    ownersMapPointHover = createOwnersMapInteractionController(ownersMap);
    ownersMapPointHover.bind();
    ownersMap.on("movestart", collapseOwnersMapSpiderExpansion);
    ownersMap.on("moveend", scheduleOwnersMapPointClusterSync);

    fitOwnersMapToVisibleLocations();
  });
}

function resizeOwnersMap() {
  if (ownersMap) {
    ownersMap.resize();
  }
}
