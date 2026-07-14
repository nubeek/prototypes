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
  { label: "Columbia, South Carolina", lat: 34.0007, lng: -81.0348 },
  { label: "Toronto, Ontario", lat: 43.6532, lng: -79.3832 },
  { label: "Vancouver, British Columbia", lat: 49.2827, lng: -123.1207 },
  { label: "Montreal, Quebec", lat: 45.5017, lng: -73.5673 },
  { label: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { label: "Monterrey, Nuevo Leon", lat: 25.6866, lng: -100.3161 },
  { label: "Guadalajara, Jalisco", lat: 20.6597, lng: -103.3496 },
  { label: "Calgary, Alberta", lat: 51.0447, lng: -114.0719 },
  { label: "Edmonton, Alberta", lat: 53.5461, lng: -113.4938 },
  { label: "Winnipeg, Manitoba", lat: 49.8951, lng: -97.1384 },
  { label: "Ottawa, Ontario", lat: 45.4215, lng: -75.6972 },
  { label: "Quebec City, Quebec", lat: 46.8139, lng: -71.2080 },
  { label: "Tijuana, Baja California", lat: 32.5149, lng: -117.0382 },
  { label: "Hermosillo, Sonora", lat: 29.0729, lng: -110.9559 },
  { label: "Chihuahua, Chihuahua", lat: 28.6329, lng: -106.0691 },
  { label: "Queretaro, Queretaro", lat: 20.5888, lng: -100.3899 },
  { label: "Puebla, Puebla", lat: 19.0414, lng: -98.2063 },
  { label: "Oaxaca, Oaxaca", lat: 17.0732, lng: -96.7266 }
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
  { label: "Asheville, North Carolina", lat: 35.5951, lng: -82.5515 },
  { label: "Toronto, Ontario", lat: 43.6532, lng: -79.3832 },
  { label: "Vancouver, British Columbia", lat: 49.2827, lng: -123.1207 },
  { label: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { label: "Monterrey, Nuevo Leon", lat: 25.6866, lng: -100.3161 }
];

const INTERNATIONAL_HEADQUARTERS_LABELS = [
  "Toronto, Ontario",
  "Vancouver, British Columbia",
  "Mexico City, Mexico",
  "Monterrey, Nuevo Leon"
];

const CANADA_HEADQUARTERS_LABELS = [
  "Toronto, Ontario",
  "Vancouver, British Columbia"
];

const MEXICO_HEADQUARTERS_LABELS = [
  "Mexico City, Mexico",
  "Monterrey, Nuevo Leon"
];

const CANADA_SUPPLEMENTAL_LOCATION_LABELS = [
  "Calgary, Alberta",
  "Edmonton, Alberta",
  "Winnipeg, Manitoba",
  "Ottawa, Ontario",
  "Montreal, Quebec",
  "Quebec City, Quebec"
];

const MEXICO_SUPPLEMENTAL_LOCATION_LABELS = [
  "Tijuana, Baja California",
  "Hermosillo, Sonora",
  "Chihuahua, Chihuahua",
  "Queretaro, Queretaro",
  "Puebla, Puebla",
  "Oaxaca, Oaxaca"
];

const ADDITIONAL_INTERNATIONAL_OWNER_CENTER_LABELS = {
  14: "Hermosillo, Sonora",
  22: "Winnipeg, Manitoba"
};

const UNIT_OWNER_FIRST_NAMES = [
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Alex",
  "Jamie",
  "Riley",
  "Cameron",
  "Avery",
  "Quinn",
  "Parker",
  "Reese",
  "Drew",
  "Skyler",
  "Hayden",
  "Rowan"
];

const UNIT_OWNER_LAST_NAMES = [
  "Anderson",
  "Baker",
  "Campbell",
  "Diaz",
  "Edwards",
  "Foster",
  "Garcia",
  "Hughes",
  "Johnson",
  "Kim",
  "Lewis",
  "Morris",
  "Nelson",
  "Patel",
  "Robinson",
  "Stewart"
];

const UNIT_OWNER_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "live.com"
];

// Approximate water masks in Mapbox/GeoJSON coordinate order: [lng, lat].
// Candidate dots keep their original radius, but water/offshore candidates are retried.
const NORTH_AMERICA_WATER_EXCLUSION_POLYGONS = [
  [
    [-133, 60.5],
    [-124.8, 60.5],
    [-124.8, 51.5],
    [-123.2, 49.4],
    [-124.0, 46.0],
    [-124.4, 42.0],
    [-123.4, 38.6],
    [-122.7, 37.0],
    [-121.6, 35.3],
    [-120.0, 34.0],
    [-117.1, 32.5],
    [-114.9, 31.6],
    [-112.7, 29.5],
    [-111.0, 27.3],
    [-110.3, 24.5],
    [-108.0, 22.8],
    [-105.0, 20.3],
    [-101.8, 17.3],
    [-98.7, 15.4],
    [-96.0, 14.0],
    [-133, 14.0]
  ],
  [
    [-98.2, 26.0],
    [-96.0, 27.7],
    [-94.0, 29.0],
    [-91.0, 29.5],
    [-88.6, 29.0],
    [-85.5, 29.8],
    [-82.7, 28.5],
    [-80.4, 25.7],
    [-80.0, 24.0],
    [-83.0, 22.5],
    [-87.0, 21.2],
    [-91.5, 19.0],
    [-95.0, 18.5],
    [-97.5, 20.7],
    [-98.6, 23.7]
  ],
  [
    [-80.4, 25.7],
    [-80.1, 28.8],
    [-81.0, 31.0],
    [-79.4, 33.2],
    [-77.0, 35.4],
    [-75.4, 37.3],
    [-74.5, 39.5],
    [-73.2, 40.7],
    [-70.8, 41.2],
    [-69.5, 43.4],
    [-66.5, 45.0],
    [-62.0, 48.0],
    [-52.0, 50.0],
    [-52.0, 14.0],
    [-80.0, 14.0]
  ],
  [
    [-97.0, 51.0],
    [-92.5, 50.8],
    [-86.0, 51.0],
    [-80.0, 53.5],
    [-78.5, 58.2],
    [-82.5, 61.2],
    [-89.0, 61.0],
    [-95.0, 58.3],
    [-96.8, 54.5]
  ],
  [
    [-92.5, 46.5],
    [-84.3, 46.5],
    [-84.0, 49.2],
    [-90.0, 49.5],
    [-92.5, 48.5]
  ],
  [
    [-88.6, 41.6],
    [-86.0, 41.6],
    [-85.5, 45.9],
    [-87.4, 46.1],
    [-88.6, 44.5]
  ],
  [
    [-84.9, 43.0],
    [-80.0, 43.0],
    [-79.5, 46.3],
    [-82.5, 46.5],
    [-84.9, 45.3]
  ],
  [
    [-83.5, 41.1],
    [-78.5, 41.1],
    [-78.5, 42.6],
    [-82.6, 42.8]
  ],
  [
    [-79.9, 43.1],
    [-78.5, 43.15],
    [-77.0, 43.35],
    [-76.0, 43.75],
    [-76.2, 44.15],
    [-77.8, 44.08],
    [-79.0, 43.78],
    [-79.7, 43.52]
  ]
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

function isWithinNorthAmericaBounds(location) {
  return location.lat >= 14 &&
    location.lat <= 60.5 &&
    location.lng >= -133 &&
    location.lng <= -52;
}

function isPointInCoordinatePolygon(location, polygon) {
  let isInside = false;
  const x = location.lng;
  const y = location.lat;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const [currentX, currentY] = polygon[index];
    const [previousX, previousY] = polygon[previousIndex];
    const crossesLatitude = currentY > y !== previousY > y;
    const intersectionX = ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;

    if (crossesLatitude && x < intersectionX) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function isOnNorthAmericaLand(location) {
  return isWithinNorthAmericaBounds(location) &&
    !NORTH_AMERICA_WATER_EXCLUSION_POLYGONS.some((polygon) => isPointInCoordinatePolygon(location, polygon));
}

function getBoundedOwnerLocation(center, distanceMiles, seed, ownerIndex) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const location = ownerLocationOffset(center, distanceMiles, seed + attempt * 997, ownerIndex);

    if (isOnNorthAmericaLand(location)) {
      return location;
    }
  }

  return center;
}

function getOwnerLocationDistanceMiles(location, center) {
  const latitudeDelta = (location.lat - center.lat) * Math.PI / 180;
  const longitudeDelta = (location.lng - center.lng) * Math.PI / 180;
  const locationLatitude = location.lat * Math.PI / 180;
  const centerLatitude = center.lat * Math.PI / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(locationLatitude) * Math.cos(centerLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 3958.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getNearestOwnerLocationLabel(location) {
  const centers = [...OWNER_LOCATION_CENTERS, ...OWNER_HEADQUARTERS_CENTERS];
  const nearestCenter = centers.reduce((nearest, center) => {
    const distance = getOwnerLocationDistanceMiles(location, center);
    return !nearest || distance < nearest.distance ? { center, distance } : nearest;
  }, null);

  return nearestCenter?.center.label || "";
}

function getOwnerLocationRadius(locationCount) {
  if (locationCount >= 250) return 1000;
  if (locationCount >= 150) return 750;
  if (locationCount >= 80) return 500;
  if (locationCount >= 50) return 250;
  return 140;
}

function getOwnerUnitCount(owner) {
  const unitCount = Number(owner.unitCount);
  if (Number.isFinite(unitCount)) return unitCount;

  const locationCount = Number(owner.locations);
  if (Number.isFinite(locationCount)) return locationCount;

  return Array.isArray(owner.units) ? owner.units.length : 0;
}

function getOwnerUnitDomain(owner) {
  const primaryEmail = owner.email || owner.contacts?.[0]?.email || "";
  return primaryEmail.split("@")[1] || `${String(owner.ownerName || "owner").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

function getOwnerPrimaryFranchise(owner) {
  if (Array.isArray(owner.franchises) && owner.franchises.length) return owner.franchises[0];
  return String(owner.franchise || "Franchise").split(",")[0].trim() || "Franchise";
}

function getOwnerCategory(owner) {
  if (Array.isArray(owner.categories) && owner.categories.length) return owner.categories[0];
  if (typeof owner.category === "string" && owner.category.trim()) return owner.category.trim();
  return "Fitness";
}

function getOwnerUnitPhone(ownerIndex, locationIndex) {
  const areaCodes = ["704", "980", "404", "214", "303", "717", "909", "615", "602", "407"];
  const areaCode = areaCodes[(ownerIndex + locationIndex) % areaCodes.length];
  const prefix = String(555 + ((ownerIndex * 19 + locationIndex * 37) % 350)).padStart(3, "0");
  const line = String(1000 + ((ownerIndex * 173 + locationIndex * 463) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getOwnerUnitSlug(owner, locationIndex) {
  const ownerSlug = String(owner.ownerName || "owner")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `${ownerSlug}.unit.${String(locationIndex + 1).padStart(3, "0")}`;
}

function getOwnerUnitContactName(ownerIndex, locationIndex) {
  const cycleOffset = Math.floor(locationIndex / UNIT_OWNER_FIRST_NAMES.length);
  const firstName = UNIT_OWNER_FIRST_NAMES[(ownerIndex * 5 + locationIndex * 3) % UNIT_OWNER_FIRST_NAMES.length];
  const lastName = UNIT_OWNER_LAST_NAMES[
    (ownerIndex * 7 + locationIndex * 5 + cycleOffset * 3) % UNIT_OWNER_LAST_NAMES.length
  ];
  return `${firstName} ${lastName}`;
}

function getOwnerUnitContactEmail(name, ownerIndex, locationIndex) {
  const slug = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
  const suffix = 10 + ((ownerIndex * 37 + locationIndex * 19) % 90);
  const domain = UNIT_OWNER_EMAIL_DOMAINS[(ownerIndex + locationIndex) % UNIT_OWNER_EMAIL_DOMAINS.length];

  return `${slug}${suffix}@${domain}`;
}

function getOwnerLocationCenterByLabel(label) {
  return OWNER_LOCATION_CENTERS.find((center) => center.label === label) ||
    OWNER_HEADQUARTERS_CENTERS.find((center) => center.label === label) ||
    null;
}

function getOwnerHeadquartersCenter(ownerIndex) {
  const additionalInternationalLabel = ADDITIONAL_INTERNATIONAL_OWNER_CENTER_LABELS[ownerIndex];
  if (additionalInternationalLabel) {
    const additionalInternationalCenter = getOwnerLocationCenterByLabel(additionalInternationalLabel);

    if (additionalInternationalCenter) return additionalInternationalCenter;
  }

  if (ownerIndex % 8 === 2) {
    const internationalLabel = INTERNATIONAL_HEADQUARTERS_LABELS[
      Math.floor(ownerIndex / 8) % INTERNATIONAL_HEADQUARTERS_LABELS.length
    ];
    const internationalCenter = OWNER_HEADQUARTERS_CENTERS.find((center) => center.label === internationalLabel);

    if (internationalCenter) return internationalCenter;
  }

  const centerIndex = (ownerIndex * 7 + Math.floor(ownerLocationRandom(ownerIndex + 1) * 5)) %
    OWNER_HEADQUARTERS_CENTERS.length;
  return OWNER_HEADQUARTERS_CENTERS[centerIndex];
}

function getSupplementalInternationalLocationCenter(headquartersCenter, ownerIndex, locationIndex, seed) {
  let supplementalLabels = null;

  if (
    CANADA_HEADQUARTERS_LABELS.includes(headquartersCenter.label) ||
    CANADA_SUPPLEMENTAL_LOCATION_LABELS.includes(headquartersCenter.label)
  ) {
    supplementalLabels = CANADA_SUPPLEMENTAL_LOCATION_LABELS;
  } else if (
    MEXICO_HEADQUARTERS_LABELS.includes(headquartersCenter.label) ||
    MEXICO_SUPPLEMENTAL_LOCATION_LABELS.includes(headquartersCenter.label)
  ) {
    supplementalLabels = MEXICO_SUPPLEMENTAL_LOCATION_LABELS;
  }

  if (!supplementalLabels || (locationIndex + ownerIndex * 3) % 7 !== 0) return null;

  const centerIndex = (
    Math.floor(ownerLocationRandom(seed + 389) * supplementalLabels.length) +
    ownerIndex +
    locationIndex
  ) % supplementalLabels.length;

  return getOwnerLocationCenterByLabel(supplementalLabels[centerIndex]);
}

function getCloseLocationCount(locationCount, ownerIndex) {
  const closeRatio = 0.25 + ownerLocationRandom(ownerIndex + 211) * 0.15;
  return Math.max(1, Math.round(locationCount * closeRatio));
}

function getLocationDistanceFromHeadquarters(locationCount, locationIndex, closeCount, seed) {
  const maxDistance = getOwnerLocationRadius(locationCount);
  const closeRank = Math.floor(ownerLocationRandom(seed + 97) * locationCount);

  if (closeRank < closeCount) {
    const closeMax = Math.min(maxDistance * 0.2, locationCount >= 80 ? 36 : 18);
    return 3 + ownerLocationRandom(seed + 113) * closeMax;
  }

  const farRatio = 0.22 + ownerLocationRandom(seed + 127) * 0.78;
  return maxDistance * farRatio;
}

function getOwnerLocations(owner, ownerIndex) {
  const locationCount = getOwnerUnitCount(owner);
  const headquartersCenter = getOwnerHeadquartersCenter(ownerIndex);
  const closeCount = getCloseLocationCount(locationCount, ownerIndex);
  const franchiseName = getOwnerPrimaryFranchise(owner);
  const category = getOwnerCategory(owner);

  return Array.from({ length: locationCount }, (_, locationIndex) => {
    const seed = (ownerIndex + 1) * 10000 + locationIndex + 1;
    const distanceFromHeadquarters = getLocationDistanceFromHeadquarters(
      locationCount,
      locationIndex,
      closeCount,
      seed
    );

    const supplementalCenter = getSupplementalInternationalLocationCenter(
      headquartersCenter,
      ownerIndex,
      locationIndex,
      seed
    );
    const locationCenter = supplementalCenter || headquartersCenter;
    const location = getBoundedOwnerLocation(locationCenter, distanceFromHeadquarters, seed, ownerIndex);
    const unitOwnerName = getOwnerUnitContactName(ownerIndex, locationIndex);

    return {
      id: `${getOwnerUnitSlug(owner, locationIndex)}`,
      name: unitOwnerName,
      email: getOwnerUnitContactEmail(unitOwnerName, ownerIndex, locationIndex),
      phone: getOwnerUnitPhone(ownerIndex, locationIndex),
      franchise: franchiseName,
      category,
      ...location,
      label: getNearestOwnerLocationLabel(location)
    };
  });
}

// Manual overrides used to stack extra units on top of an existing one, so we can
// verify map marker clustering behaves correctly at a known, shared coordinate.
const CLUSTER_TEST_EXTRA_UNITS = {
  "Argonne Capital": { count: 8, lat: 35.06089, lng: -120.18006, label: "Fresno, California" },
  "United FP": { count: 6, lat: 33.7512, lng: -84.3925, label: "Atlanta, Georgia" },
  "Flynn Fitness": { count: 5, lat: 32.7791, lng: -96.8012, label: "Dallas, Texas" },
  "Trilantic Capital Management": { count: 7, lat: 42.6561, lng: -73.7518, label: "Albany, New York" },
  "Epic Fitness": { count: 4, lat: 39.7428, lng: -104.9871, label: "Denver, Colorado" },
  "Olympus Partners": { count: 9, lat: 44.9812, lng: -93.2698, label: "Minneapolis, Minnesota" },
  "Black Duck Partners": { count: 6, lat: 28.5412, lng: -81.3845, label: "Orlando, Florida" }
};

function getClusterTestExtraUnits(owner, ownerIndex, existingUnitCount) {
  const config = CLUSTER_TEST_EXTRA_UNITS[owner.ownerName];
  if (!config) return [];

  const franchiseName = getOwnerPrimaryFranchise(owner);
  const category = getOwnerCategory(owner);

  return Array.from({ length: config.count }, (_, extraIndex) => {
    const locationIndex = existingUnitCount + extraIndex;
    const unitOwnerName = getOwnerUnitContactName(ownerIndex, locationIndex);

    return {
      id: `${getOwnerUnitSlug(owner, locationIndex)}`,
      name: unitOwnerName,
      email: getOwnerUnitContactEmail(unitOwnerName, ownerIndex, locationIndex),
      phone: getOwnerUnitPhone(ownerIndex, locationIndex),
      franchise: franchiseName,
      category,
      lat: config.lat,
      lng: config.lng,
      label: config.label
    };
  });
}

window.ownerLocationsData = (window.ownersData || []).map((owner, ownerIndex) => {
  const units = getOwnerLocations(owner, ownerIndex);

  units.push(...getClusterTestExtraUnits(owner, ownerIndex, units.length));

  owner.units = units;

  return {
    ownerName: owner.ownerName,
    color: OWNER_LOCATION_COLORS[ownerIndex % OWNER_LOCATION_COLORS.length],
    locations: units,
    units
  };
});
