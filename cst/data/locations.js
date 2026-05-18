const OWNER_LOCATION_COLORS = [
  "#8772df",
  "#4385f3",
  "#76af62",
  "#ff696d",
  "#9b90ec",
  "#8ab5f0",
  "#00c69b",
  "#edbd9d",
  "#c3bcf2",
  "#99d3f0",
  "#a3e095",
  "#f5de58"
];

const OWNER_LOCATION_CENTERS = [
  { label: "Charlotte, North Carolina", lat: 35.2271, lng: -80.8431 },
  { label: "Atlanta, Georgia", lat: 33.7490, lng: -84.3880 },
  { label: "Dallas, Texas", lat: 32.7767, lng: -96.7970 },
  { label: "Denver, Colorado", lat: 39.7392, lng: -104.9903 },
  { label: "Peoria, Illinois", lat: 40.6936, lng: -89.5890 },
  { label: "Harrisburg, Pennsylvania", lat: 40.2732, lng: -76.8867 },
  { label: "San Bernardino, California", lat: 34.1083, lng: -117.2898 },
  { label: "College Station, Texas", lat: 30.6279, lng: -96.3344 },
  { label: "Nashville, Tennessee", lat: 36.1627, lng: -86.7816 },
  { label: "Albany, New York", lat: 42.6526, lng: -73.7562 },
  { label: "Phoenix, Arizona", lat: 33.4484, lng: -112.0740 },
  { label: "Orlando, Florida", lat: 28.5383, lng: -81.3792 },
  { label: "Indianapolis, Indiana", lat: 39.7684, lng: -86.1581 },
  { label: "St. Louis, Missouri", lat: 38.6270, lng: -90.1994 },
  { label: "Spokane, Washington", lat: 47.6588, lng: -117.4260 },
  { label: "Hartford, Connecticut", lat: 41.7658, lng: -72.6734 },
  { label: "Oklahoma City, Oklahoma", lat: 35.4676, lng: -97.5164 },
  { label: "Minneapolis, Minnesota", lat: 44.9778, lng: -93.2650 },
  { label: "Austin, Texas", lat: 30.2672, lng: -97.7431 },
  { label: "Sacramento, California", lat: 38.5816, lng: -121.4944 },
  { label: "Ocala, Florida", lat: 29.1872, lng: -82.1401 },
  { label: "Columbus, Ohio", lat: 39.9612, lng: -82.9988 },
  { label: "Memphis, Tennessee", lat: 35.1495, lng: -90.0490 },
  { label: "Las Vegas, Nevada", lat: 36.1699, lng: -115.1398 },
  { label: "Madison, Wisconsin", lat: 43.0731, lng: -89.4012 },
  { label: "Albuquerque, New Mexico", lat: 35.0844, lng: -106.6504 },
  { label: "Eugene, Oregon", lat: 44.0521, lng: -123.0868 },
  { label: "Louisville, Kentucky", lat: 38.2527, lng: -85.7585 },
  { label: "Macon, Georgia", lat: 32.8407, lng: -83.6324 },
  { label: "Boise, Idaho", lat: 43.6150, lng: -116.2023 },
  { label: "Omaha, Nebraska", lat: 41.2565, lng: -95.9345 },
  { label: "Little Rock, Arkansas", lat: 34.7465, lng: -92.2896 },
  { label: "Greensboro, North Carolina", lat: 36.0726, lng: -79.7920 },
  { label: "Wichita, Kansas", lat: 37.6872, lng: -97.3301 },
  { label: "Fargo, North Dakota", lat: 46.8772, lng: -96.7898 },
  { label: "Asheville, North Carolina", lat: 35.5951, lng: -82.5515 },
  { label: "Montgomery, Alabama", lat: 32.3668, lng: -86.3000 },
  { label: "Reno, Nevada", lat: 39.5296, lng: -119.8138 },
  { label: "Rochester, New York", lat: 43.1566, lng: -77.6088 },
  { label: "Fresno, California", lat: 36.7468, lng: -119.7726 },
  { label: "Salt Lake City, Utah", lat: 40.7608, lng: -111.8910 },
  { label: "El Paso, Texas", lat: 31.7619, lng: -106.4850 },
  { label: "Birmingham, Alabama", lat: 33.5207, lng: -86.8025 },
  { label: "Lincoln, Nebraska", lat: 40.8136, lng: -96.7026 },
  { label: "Richmond, Virginia", lat: 37.5407, lng: -77.4360 },
  { label: "Columbia, South Carolina", lat: 34.0007, lng: -81.0348 }
];

const OWNER_HEADQUARTERS_CENTERS = [
  { label: "Oklahoma City, Oklahoma", lat: 35.4676, lng: -97.5164 },
  { label: "Wichita, Kansas", lat: 37.6872, lng: -97.3301 },
  { label: "Kansas City, Missouri", lat: 39.0997, lng: -94.5786 },
  { label: "Omaha, Nebraska", lat: 41.2565, lng: -95.9345 },
  { label: "Lincoln, Nebraska", lat: 40.8136, lng: -96.7026 },
  { label: "St. Louis, Missouri", lat: 38.6270, lng: -90.1994 },
  { label: "Indianapolis, Indiana", lat: 39.7684, lng: -86.1581 },
  { label: "Louisville, Kentucky", lat: 38.2527, lng: -85.7585 },
  { label: "Nashville, Tennessee", lat: 36.1627, lng: -86.7816 },
  { label: "Memphis, Tennessee", lat: 35.1495, lng: -90.0490 },
  { label: "Little Rock, Arkansas", lat: 34.7465, lng: -92.2896 },
  { label: "Denver, Colorado", lat: 39.7392, lng: -104.9903 },
  { label: "Albuquerque, New Mexico", lat: 35.0844, lng: -106.6504 },
  { label: "Salt Lake City, Utah", lat: 40.7608, lng: -111.8910 },
  { label: "Boise, Idaho", lat: 43.6150, lng: -116.2023 },
  { label: "Minneapolis, Minnesota", lat: 44.9778, lng: -93.2650 },
  { label: "Columbus, Ohio", lat: 39.9612, lng: -82.9988 },
  { label: "Birmingham, Alabama", lat: 33.5207, lng: -86.8025 },
  { label: "Macon, Georgia", lat: 32.8407, lng: -83.6324 },
  { label: "Asheville, North Carolina", lat: 35.5951, lng: -82.5515 }
];

function ownerLocationRandom(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function ownerLocationOffset(center, radiusMiles, seed, ownerIndex) {
  const lobe = Math.floor(ownerLocationRandom(seed + 17) * 3);
  const ownerRotation = ownerLocationRandom(ownerIndex + 23) * Math.PI;
  const lobeAngle = ownerRotation + lobe * (Math.PI * 2 / 3);
  const angle = lobeAngle + (ownerLocationRandom(seed + 31) - 0.5) * Math.PI * 0.95;
  const distance = radiusMiles * Math.pow(ownerLocationRandom(seed + 43), 0.72);
  const minorAxisRatio = 0.38 + ownerLocationRandom(ownerIndex + 83) * 0.34;
  const xMiles = Math.cos(angle) * distance;
  const yMiles = Math.sin(angle) * distance * minorAxisRatio;
  const rotatedX = xMiles * Math.cos(ownerRotation) - yMiles * Math.sin(ownerRotation);
  const rotatedY = xMiles * Math.sin(ownerRotation) + yMiles * Math.cos(ownerRotation);
  const lat = center.lat + rotatedY / 69;
  const lng = center.lng + rotatedX / (69 * Math.cos(center.lat * Math.PI / 180));

  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5))
  };
}

function isWithinContinentalUsBounds(location) {
  return location.lat >= 24.5 &&
    location.lat <= 49.5 &&
    location.lng >= -125 &&
    location.lng <= -66.5;
}

function getBoundedOwnerLocation(center, distanceMiles, seed, ownerIndex) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const adjustedDistance = distanceMiles * (1 - attempt * 0.09);
    const location = ownerLocationOffset(center, adjustedDistance, seed + attempt * 997, ownerIndex);

    if (isWithinContinentalUsBounds(location)) {
      return location;
    }
  }

  return ownerLocationOffset(center, distanceMiles * 0.35, seed + 7919, ownerIndex);
}

function getOwnerLocationRadius(locationCount) {
  if (locationCount >= 250) return 1000;
  if (locationCount >= 150) return 750;
  if (locationCount >= 80) return 500;
  if (locationCount >= 50) return 250;
  return 140;
}

function getOwnerHeadquartersCenter(ownerIndex) {
  const centerIndex = (ownerIndex * 7 + Math.floor(ownerLocationRandom(ownerIndex + 1) * 5)) %
    OWNER_HEADQUARTERS_CENTERS.length;
  return OWNER_HEADQUARTERS_CENTERS[centerIndex];
}

function getCloseLocationCount(locationCount, ownerIndex) {
  const closeRatio = 0.25 + ownerLocationRandom(ownerIndex + 211) * 0.15;
  return Math.max(1, Math.round(locationCount * closeRatio));
}

function getLocationDistanceFromHeadquarters(locationCount, locationIndex, closeCount, seed) {
  const maxDistance = getOwnerLocationRadius(locationCount);

  if (locationIndex < closeCount) {
    const closeMax = Math.min(maxDistance * 0.2, locationCount >= 80 ? 36 : 18);
    return 3 + ownerLocationRandom(seed + 113) * closeMax;
  }

  const farRatio = 0.22 + ownerLocationRandom(seed + 127) * 0.78;
  return maxDistance * farRatio;
}

function getOwnerLocations(owner, ownerIndex) {
  const locationCount = owner.locations || 0;
  const headquartersCenter = getOwnerHeadquartersCenter(ownerIndex);
  const closeCount = getCloseLocationCount(locationCount, ownerIndex);

  return Array.from({ length: locationCount }, (_, locationIndex) => {
    const seed = (ownerIndex + 1) * 10000 + locationIndex + 1;
    const distanceFromHeadquarters = getLocationDistanceFromHeadquarters(
      locationCount,
      locationIndex,
      closeCount,
      seed
    );

    return {
      ...getBoundedOwnerLocation(headquartersCenter, distanceFromHeadquarters, seed, ownerIndex),
      label: headquartersCenter.label
    };
  });
}

window.ownerLocationsData = (window.ownersData || []).map((owner, ownerIndex) => ({
  ownerName: owner.ownerName,
  color: OWNER_LOCATION_COLORS[ownerIndex % OWNER_LOCATION_COLORS.length],
  locations: getOwnerLocations(owner, ownerIndex)
}));
