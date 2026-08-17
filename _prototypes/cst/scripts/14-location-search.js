const CST_LOCATION_MAPBOX_TOKEN = (typeof MAPBOX_ACCESS_TOKEN === "string" && MAPBOX_ACCESS_TOKEN)
  || window.CST_ENV?.MAPBOX_ACCESS_TOKEN
  || "";
const CST_GEOCODING_TYPES = "address,place,district,region";
const CST_ALLOWED_MAPBOX_PLACE_TYPES = new Set([
  "address",
  "place",
  "district",
  "region"
]);
const CST_GEOCODING_DEBOUNCE_MS = 250;
const CST_GEOCODING_LIMIT = 5;
const CST_GEOCODING_FETCH_LIMIT = 10;
const CST_LOCATION_AUTO_RADIUS_MILES = {
  address: 25,
  place: 50
};

const CST_US_STATE_OPTIONS = [
  { code: "AL", label: "Alabama" },
  { code: "AK", label: "Alaska" },
  { code: "AZ", label: "Arizona" },
  { code: "AR", label: "Arkansas" },
  { code: "CA", label: "California" },
  { code: "CO", label: "Colorado" },
  { code: "CT", label: "Connecticut" },
  { code: "DE", label: "Delaware" },
  { code: "FL", label: "Florida" },
  { code: "GA", label: "Georgia" },
  { code: "HI", label: "Hawaii" },
  { code: "ID", label: "Idaho" },
  { code: "IL", label: "Illinois" },
  { code: "IN", label: "Indiana" },
  { code: "IA", label: "Iowa" },
  { code: "KS", label: "Kansas" },
  { code: "KY", label: "Kentucky" },
  { code: "LA", label: "Louisiana" },
  { code: "ME", label: "Maine" },
  { code: "MD", label: "Maryland" },
  { code: "MA", label: "Massachusetts" },
  { code: "MI", label: "Michigan" },
  { code: "MN", label: "Minnesota" },
  { code: "MS", label: "Mississippi" },
  { code: "MO", label: "Missouri" },
  { code: "MT", label: "Montana" },
  { code: "NE", label: "Nebraska" },
  { code: "NV", label: "Nevada" },
  { code: "NH", label: "New Hampshire" },
  { code: "NJ", label: "New Jersey" },
  { code: "NM", label: "New Mexico" },
  { code: "NY", label: "New York" },
  { code: "NC", label: "North Carolina" },
  { code: "ND", label: "North Dakota" },
  { code: "OH", label: "Ohio" },
  { code: "OK", label: "Oklahoma" },
  { code: "OR", label: "Oregon" },
  { code: "PA", label: "Pennsylvania" },
  { code: "RI", label: "Rhode Island" },
  { code: "SC", label: "South Carolina" },
  { code: "SD", label: "South Dakota" },
  { code: "TN", label: "Tennessee" },
  { code: "TX", label: "Texas" },
  { code: "UT", label: "Utah" },
  { code: "VT", label: "Vermont" },
  { code: "VA", label: "Virginia" },
  { code: "WA", label: "Washington" },
  { code: "WV", label: "West Virginia" },
  { code: "WI", label: "Wisconsin" },
  { code: "WY", label: "Wyoming" }
];

const CST_CA_PROVINCE_OPTIONS = [
  { code: "AB", label: "Alberta" },
  { code: "BC", label: "British Columbia" },
  { code: "MB", label: "Manitoba" },
  { code: "NB", label: "New Brunswick" },
  { code: "NL", label: "Newfoundland and Labrador" },
  { code: "NS", label: "Nova Scotia" },
  { code: "NT", label: "Northwest Territories" },
  { code: "NU", label: "Nunavut" },
  { code: "ON", label: "Ontario" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "QC", label: "Quebec" },
  { code: "SK", label: "Saskatchewan" },
  { code: "YT", label: "Yukon" }
];

const CST_MX_STATE_OPTIONS = [
  { code: "AGU", label: "Aguascalientes" },
  { code: "BCN", label: "Baja California" },
  { code: "BCS", label: "Baja California Sur" },
  { code: "CAM", label: "Campeche" },
  { code: "CHP", label: "Chiapas" },
  { code: "CHH", label: "Chihuahua" },
  { code: "CMX", label: "Mexico City" },
  { code: "COA", label: "Coahuila" },
  { code: "COL", label: "Colima" },
  { code: "DUR", label: "Durango" },
  { code: "GUA", label: "Guanajuato" },
  { code: "GRO", label: "Guerrero" },
  { code: "HID", label: "Hidalgo" },
  { code: "JAL", label: "Jalisco" },
  { code: "MEX", label: "Mexico" },
  { code: "MIC", label: "Michoacan" },
  { code: "MOR", label: "Morelos" },
  { code: "NAY", label: "Nayarit" },
  { code: "NLE", label: "Nuevo Leon" },
  { code: "OAX", label: "Oaxaca" },
  { code: "PUE", label: "Puebla" },
  { code: "QUE", label: "Queretaro" },
  { code: "ROO", label: "Quintana Roo" },
  { code: "SLP", label: "San Luis Potosi" },
  { code: "SIN", label: "Sinaloa" },
  { code: "SON", label: "Sonora" },
  { code: "TAB", label: "Tabasco" },
  { code: "TAM", label: "Tamaulipas" },
  { code: "TLA", label: "Tlaxcala" },
  { code: "VER", label: "Veracruz" },
  { code: "YUC", label: "Yucatan" },
  { code: "ZAC", label: "Zacatecas" }
];

const CST_REGION_OPTIONS = [
  ...CST_US_STATE_OPTIONS,
  ...CST_CA_PROVINCE_OPTIONS,
  ...CST_MX_STATE_OPTIONS
];

const CST_REGION_CENTERS = {
  AL: { latitude: 32.7794, longitude: -86.8287 },
  AK: { latitude: 64.0685, longitude: -152.2782 },
  AZ: { latitude: 34.2744, longitude: -111.6602 },
  AR: { latitude: 34.8938, longitude: -92.4426 },
  CA: { latitude: 37.1841, longitude: -119.4696 },
  CO: { latitude: 38.9972, longitude: -105.5478 },
  CT: { latitude: 41.6219, longitude: -72.7273 },
  DE: { latitude: 38.9896, longitude: -75.505 },
  FL: { latitude: 28.6305, longitude: -82.4497 },
  GA: { latitude: 32.6415, longitude: -83.4426 },
  HI: { latitude: 20.2927, longitude: -156.3737 },
  ID: { latitude: 44.3509, longitude: -114.613 },
  IL: { latitude: 40.0417, longitude: -89.1965 },
  IN: { latitude: 39.8942, longitude: -86.2816 },
  IA: { latitude: 42.0751, longitude: -93.496 },
  KS: { latitude: 38.4937, longitude: -98.3804 },
  KY: { latitude: 37.5347, longitude: -85.3021 },
  LA: { latitude: 31.0689, longitude: -91.9968 },
  ME: { latitude: 45.3695, longitude: -69.2428 },
  MD: { latitude: 39.055, longitude: -76.7909 },
  MA: { latitude: 42.2596, longitude: -71.8083 },
  MI: { latitude: 44.3467, longitude: -85.4102 },
  MN: { latitude: 46.2807, longitude: -94.3053 },
  MS: { latitude: 32.7364, longitude: -89.6678 },
  MO: { latitude: 38.3566, longitude: -92.458 },
  MT: { latitude: 47.0527, longitude: -109.6333 },
  NE: { latitude: 41.5378, longitude: -99.7951 },
  NV: { latitude: 39.3289, longitude: -116.6312 },
  NH: { latitude: 43.6805, longitude: -71.5811 },
  NJ: { latitude: 40.1907, longitude: -74.6728 },
  NM: { latitude: 34.4071, longitude: -106.1126 },
  NY: { latitude: 42.9538, longitude: -75.5268 },
  NC: { latitude: 35.5557, longitude: -79.3877 },
  ND: { latitude: 47.4501, longitude: -100.4659 },
  OH: { latitude: 40.2862, longitude: -82.7937 },
  OK: { latitude: 35.5889, longitude: -97.4943 },
  OR: { latitude: 43.9336, longitude: -120.5583 },
  PA: { latitude: 40.8781, longitude: -77.7996 },
  RI: { latitude: 41.6762, longitude: -71.5562 },
  SC: { latitude: 33.9169, longitude: -80.8964 },
  SD: { latitude: 44.4443, longitude: -100.2263 },
  TN: { latitude: 35.858, longitude: -86.3505 },
  TX: { latitude: 31.4757, longitude: -99.3312 },
  UT: { latitude: 39.3055, longitude: -111.6703 },
  VT: { latitude: 44.0687, longitude: -72.6658 },
  VA: { latitude: 37.5215, longitude: -78.8537 },
  WA: { latitude: 47.3826, longitude: -120.4472 },
  WV: { latitude: 38.6409, longitude: -80.6227 },
  WI: { latitude: 44.6243, longitude: -89.9941 },
  WY: { latitude: 42.9957, longitude: -107.5512 },
  AB: { latitude: 53.9333, longitude: -116.5765 },
  BC: { latitude: 53.7267, longitude: -127.6476 },
  MB: { latitude: 53.7609, longitude: -98.8139 },
  NB: { latitude: 46.5653, longitude: -66.4619 },
  NL: { latitude: 53.1355, longitude: -57.6604 },
  NS: { latitude: 44.682, longitude: -63.7443 },
  NT: { latitude: 64.8255, longitude: -124.8457 },
  NU: { latitude: 70.2998, longitude: -83.1076 },
  ON: { latitude: 51.2538, longitude: -85.3232 },
  PE: { latitude: 46.5107, longitude: -63.4168 },
  QC: { latitude: 52.9399, longitude: -73.5491 },
  SK: { latitude: 52.9399, longitude: -106.4509 },
  YT: { latitude: 64.2823, longitude: -135 },
  AGU: { latitude: 21.8853, longitude: -102.2916 },
  BCN: { latitude: 30.8406, longitude: -115.2838 },
  BCS: { latitude: 26.0444, longitude: -111.6661 },
  CAM: { latitude: 19.8301, longitude: -90.5349 },
  CHP: { latitude: 16.7569, longitude: -93.1292 },
  CHH: { latitude: 28.635, longitude: -106.0889 },
  CMX: { latitude: 19.4326, longitude: -99.1332 },
  COA: { latitude: 27.0587, longitude: -101.7068 },
  COL: { latitude: 19.2452, longitude: -103.7243 },
  DUR: { latitude: 24.5593, longitude: -104.6588 },
  GUA: { latitude: 21.019, longitude: -101.2574 },
  GRO: { latitude: 17.4392, longitude: -99.5451 },
  HID: { latitude: 20.0911, longitude: -98.7624 },
  JAL: { latitude: 20.6595, longitude: -103.3494 },
  MEX: { latitude: 19.4969, longitude: -99.7233 },
  MIC: { latitude: 19.5665, longitude: -101.7068 },
  MOR: { latitude: 18.6813, longitude: -99.1013 },
  NAY: { latitude: 21.7514, longitude: -104.8455 },
  NLE: { latitude: 25.5922, longitude: -99.9962 },
  OAX: { latitude: 17.0732, longitude: -96.7266 },
  PUE: { latitude: 19.0413, longitude: -98.2062 },
  QUE: { latitude: 20.5888, longitude: -100.3899 },
  ROO: { latitude: 19.1817, longitude: -88.4791 },
  SLP: { latitude: 22.1565, longitude: -100.9855 },
  SIN: { latitude: 25.1721, longitude: -107.4795 },
  SON: { latitude: 29.2972, longitude: -110.3309 },
  TAB: { latitude: 17.8409, longitude: -92.6189 },
  TAM: { latitude: 24.2669, longitude: -98.8363 },
  TLA: { latitude: 19.3182, longitude: -98.2375 },
  VER: { latitude: 19.1738, longitude: -96.1342 },
  YUC: { latitude: 20.7099, longitude: -89.0943 },
  ZAC: { latitude: 22.7709, longitude: -102.5832 }
};

const CST_REGION_BOUNDS = {
  AL: [-88.47, 30.14, -84.89, 35.01],
  AK: [-179.15, 51.21, -129.99, 71.35],
  AZ: [-114.82, 31.33, -109.05, 37.0],
  AR: [-94.62, 33.0, -89.64, 36.5],
  CA: [-124.41, 32.53, -114.13, 42.01],
  CO: [-109.06, 36.99, -102.04, 41.0],
  CT: [-73.73, 40.98, -71.79, 42.05],
  DE: [-75.79, 38.45, -75.05, 39.84],
  FL: [-87.63, 24.52, -80.03, 31.0],
  GA: [-85.61, 30.36, -80.84, 35.0],
  HI: [-160.25, 18.91, -154.81, 22.24],
  ID: [-117.24, 41.99, -111.04, 49.0],
  IL: [-91.51, 36.97, -87.02, 42.51],
  IN: [-88.1, 37.77, -84.78, 41.76],
  IA: [-96.64, 40.38, -90.14, 43.5],
  KS: [-102.05, 36.99, -94.59, 40.0],
  KY: [-89.57, 36.5, -81.96, 39.15],
  LA: [-94.04, 28.93, -88.82, 33.02],
  ME: [-71.08, 42.98, -66.95, 47.46],
  MD: [-79.49, 37.91, -75.05, 39.72],
  MA: [-73.51, 41.24, -69.93, 42.89],
  MI: [-90.42, 41.7, -82.12, 48.19],
  MN: [-97.24, 43.5, -89.53, 49.38],
  MS: [-91.66, 30.17, -88.1, 35.0],
  MO: [-95.77, 35.99, -89.1, 40.61],
  MT: [-116.05, 44.36, -104.04, 49.0],
  NE: [-104.05, 39.99, -95.31, 43.0],
  NV: [-120.01, 35.0, -114.04, 42.0],
  NH: [-72.56, 42.7, -70.7, 45.31],
  NJ: [-75.56, 38.93, -73.89, 41.36],
  NM: [-109.05, 31.33, -103.0, 37.0],
  NY: [-79.76, 40.5, -71.86, 45.02],
  NC: [-84.32, 33.84, -75.46, 36.59],
  ND: [-104.05, 45.94, -96.55, 49.0],
  OH: [-84.82, 38.4, -80.52, 42.0],
  OK: [-103.0, 33.62, -94.43, 37.0],
  OR: [-124.57, 41.99, -116.46, 46.29],
  PA: [-80.52, 39.72, -74.69, 42.27],
  RI: [-71.86, 41.15, -71.12, 42.02],
  SC: [-83.35, 32.05, -78.54, 35.22],
  SD: [-104.06, 42.48, -96.44, 45.94],
  TN: [-90.31, 34.98, -81.65, 36.68],
  TX: [-106.65, 25.84, -93.51, 36.5],
  UT: [-114.05, 36.99, -109.04, 42.0],
  VT: [-73.44, 42.73, -71.46, 45.02],
  VA: [-83.68, 36.54, -75.24, 39.47],
  WA: [-124.76, 45.54, -116.92, 49.0],
  WV: [-82.64, 37.2, -77.72, 40.64],
  WI: [-92.89, 42.49, -86.25, 47.08],
  WY: [-111.06, 40.99, -104.05, 45.01],
  AB: [-120.0, 48.99, -110.0, 60.0],
  BC: [-139.06, 48.3, -114.03, 60.0],
  MB: [-102.0, 48.99, -88.97, 60.0],
  NB: [-69.06, 44.59, -63.77, 48.07],
  NL: [-67.82, 46.61, -52.62, 60.37],
  NS: [-66.39, 43.39, -59.68, 47.03],
  NT: [-136.5, 60.0, -102.0, 78.8],
  NU: [-120.8, 51.6, -61.2, 83.1],
  ON: [-95.16, 41.68, -74.34, 56.86],
  PE: [-64.42, 45.95, -61.97, 47.06],
  QC: [-79.76, 44.99, -57.1, 62.58],
  SK: [-110.0, 49.0, -101.36, 60.0],
  YT: [-141.0, 60.0, -123.8, 69.65],
  AGU: [-102.95, 21.46, -101.78, 22.5],
  BCN: [-118.41, 28.0, -112.79, 32.72],
  BCS: [-115.22, 22.87, -109.21, 28.0],
  CAM: [-92.47, 17.82, -89.12, 20.85],
  CHP: [-94.14, 14.53, -90.37, 17.98],
  CHH: [-109.07, 25.58, -103.31, 31.78],
  CMX: [-99.37, 19.05, -98.94, 19.59],
  COA: [-103.96, 24.54, -99.84, 29.88],
  COL: [-104.78, 18.68, -103.49, 19.52],
  DUR: [-107.21, 22.34, -102.47, 26.85],
  GUA: [-102.18, 19.91, -99.67, 21.84],
  GRO: [-102.18, 16.32, -98.0, 18.89],
  HID: [-99.86, 19.6, -97.98, 21.4],
  JAL: [-105.7, 18.92, -101.51, 22.75],
  MEX: [-100.61, 18.37, -98.6, 20.12],
  MIC: [-103.74, 17.91, -100.08, 20.39],
  MOR: [-99.49, 18.33, -98.63, 19.13],
  NAY: [-106.69, 20.6, -103.72, 23.08],
  NLE: [-101.2, 23.16, -98.85, 27.81],
  OAX: [-98.55, 15.65, -93.87, 18.67],
  PUE: [-98.65, 17.86, -96.72, 20.84],
  QUE: [-100.6, 20.01, -99.04, 21.67],
  ROO: [-89.3, 17.89, -86.71, 21.6],
  SLP: [-102.3, 21.16, -98.33, 24.49],
  SIN: [-109.45, 22.47, -105.39, 26.93],
  SON: [-115.05, 26.3, -108.4, 32.48],
  TAB: [-94.14, 17.25, -90.99, 18.65],
  TAM: [-99.9, 22.21, -97.14, 27.67],
  TLA: [-98.74, 19.11, -97.63, 19.73],
  VER: [-98.67, 17.14, -93.61, 22.47],
  YUC: [-90.4, 19.55, -87.53, 21.63],
  ZAC: [-104.35, 21.04, -101.48, 25.12]
};

function getCstRegionCenter(regionCode) {
  const center = CST_REGION_CENTERS[String(regionCode || "").toUpperCase()];
  if (!center) return null;
  return { longitude: center.longitude, latitude: center.latitude };
}

function getCstRegionBounds(regionCode) {
  const bounds = CST_REGION_BOUNDS[String(regionCode || "").toUpperCase()];
  if (!Array.isArray(bounds) || bounds.length !== 4) return null;
  return bounds;
}

function isCstRegionSearch(location) {
  return Boolean(location?.stateCode)
    && (location.geoLevel === "region" || !location.geoLevel)
    && !location.geoKey
    && !location.coordinates;
}

function normalizeCstLocationQuery(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,]/g, "");
}

function stripCstLocationCountrySuffix(label) {
  return String(label || "")
    .replace(/,\s*(United States|USA|Canada|Mexico)\s*$/i, "")
    .trim();
}

function getCstRegionLabel(regionCode) {
  return CST_REGION_OPTIONS.find(({ code }) => code === regionCode)?.label || regionCode;
}

function getCstRegionCountry(regionCode) {
  if (CST_US_STATE_OPTIONS.some(({ code }) => code === regionCode)) return "United States";
  if (CST_CA_PROVINCE_OPTIONS.some(({ code }) => code === regionCode)) return "Canada";
  if (CST_MX_STATE_OPTIONS.some(({ code }) => code === regionCode)) return "Mexico";
  return "";
}

function getCstLocationSuggestionLabel(item) {
  return item?.suggestionLabel || item?.label || "";
}

function getCstRegionCodeFromLabel(label) {
  const normalizedLabel = normalizeCstLocationQuery(label);
  if (!normalizedLabel) return "";

  return CST_REGION_OPTIONS.find(({ code, label: regionLabel }) => (
    normalizeCstLocationQuery(code) === normalizedLabel
    || normalizeCstLocationQuery(regionLabel) === normalizedLabel
  ))?.code || "";
}

function resolveCstRegionQuery(query) {
  const normalizedQuery = normalizeCstLocationQuery(query);
  if (!normalizedQuery) return null;

  const exactMatch = CST_REGION_OPTIONS.find(({ code, label }) => (
    normalizeCstLocationQuery(code) === normalizedQuery
    || normalizeCstLocationQuery(label) === normalizedQuery
  ));
  if (exactMatch) return exactMatch;

  const prefixMatches = CST_REGION_OPTIONS.filter(({ label }) => (
    normalizeCstLocationQuery(label).startsWith(normalizedQuery)
  ));
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function getPrimaryMapboxPlaceType(feature) {
  const placeTypes = Array.isArray(feature?.place_type) ? feature.place_type : [];
  return placeTypes.find((type) => CST_ALLOWED_MAPBOX_PLACE_TYPES.has(type)) || placeTypes[0] || "";
}

function isAllowedMapboxGeocodingFeature(feature) {
  return CST_ALLOWED_MAPBOX_PLACE_TYPES.has(getPrimaryMapboxPlaceType(feature));
}

function createCstLocationResult({
  label,
  stateCode,
  coordinates = null,
  geoLevel = null,
  geoKey = null,
  suggestionLabel = null
} = {}) {
  const resolvedLabel = stripCstLocationCountrySuffix(label);
  const resolvedStateCode = stateCode || getCstRegionCodeFromLabel(resolvedLabel);
  if (!resolvedLabel) return null;

  const resolvedCoordinates = geoLevel === "region"
    ? (coordinates || null)
    : (coordinates || getCstRegionCenter(resolvedStateCode));

  return {
    label: resolvedLabel,
    suggestionLabel: suggestionLabel || resolvedLabel,
    stateCode: resolvedStateCode || "",
    coordinates: resolvedCoordinates,
    geoLevel,
    geoKey,
    placeTypes: geoLevel ? [geoLevel] : []
  };
}

function createCstRegionLocationResult(stateCode) {
  const label = getCstRegionLabel(stateCode);
  if (!stateCode || !label) return null;

  const country = getCstRegionCountry(stateCode);
  return createCstLocationResult({
    label,
    suggestionLabel: country ? `${label}, ${country}` : label,
    stateCode,
    geoLevel: "region"
  });
}

function searchCstRegionSuggestions(query, limit = CST_GEOCODING_LIMIT) {
  const normalizedQuery = normalizeCstLocationQuery(query);
  if (normalizedQuery.length < 2) return [];

  return CST_REGION_OPTIONS
    .filter(({ code, label }) => (
      normalizeCstLocationQuery(label).includes(normalizedQuery)
      || normalizeCstLocationQuery(code).startsWith(normalizedQuery)
    ))
    .slice(0, limit)
    .map(({ code }) => createCstRegionLocationResult(code))
    .filter(Boolean);
}

function getLocationSearchKey(location) {
  if (!location?.label && !location?.stateCode) return "";
  if (location.geoKey) return `${location.geoLevel || "location"}:${location.geoKey}`;
  if (location.geoLevel === "region" && location.stateCode) {
    return `region:${location.stateCode}`;
  }
  if (location.coordinates) {
    return [
      location.stateCode || "",
      Number(location.coordinates.longitude).toFixed(5),
      Number(location.coordinates.latitude).toFixed(5)
    ].join(":");
  }

  return [
    location.geoLevel || "label",
    location.stateCode || "",
    normalizeCstLocationQuery(location.label)
  ].join(":");
}

function dedupeCstLocationResults(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getLocationSearchKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStateCodeFromMapboxFeature(feature) {
  const shortCode = feature?.properties?.short_code || feature?.short_code;
  if (shortCode) {
    const parts = String(shortCode).split("-");
    const regionCode = parts[parts.length - 1];
    if (regionCode) return regionCode.toUpperCase();
  }

  const regionContext = (feature?.context || []).find((entry) => (
    String(entry?.id || "").startsWith("region")
  ));
  const regionShortCode = regionContext?.short_code;
  if (regionShortCode) {
    const parts = String(regionShortCode).split("-");
    const regionCode = parts[parts.length - 1];
    if (regionCode) return regionCode.toUpperCase();
  }

  const regionText = regionContext?.text || "";
  return getCstRegionCodeFromLabel(regionText);
}

function parseMapboxGeocodingFeature(feature) {
  if (!isAllowedMapboxGeocodingFeature(feature)) return null;

  const [longitude, latitude] = feature?.center || [];
  const geoLevel = getPrimaryMapboxPlaceType(feature);
  const stateCode = getStateCodeFromMapboxFeature(feature);

  if (geoLevel === "region") {
    return createCstRegionLocationResult(stateCode);
  }

  return createCstLocationResult({
    label: feature.place_name || feature.text || "",
    stateCode,
    coordinates: Number.isFinite(longitude) && Number.isFinite(latitude)
      ? { longitude, latitude }
      : null,
    geoLevel
  });
}

async function fetchCstMapboxPlaceSuggestions(query, { signal, autocomplete = true } = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!CST_LOCATION_MAPBOX_TOKEN || !trimmedQuery) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json`);
  url.searchParams.set("access_token", CST_LOCATION_MAPBOX_TOKEN);
  url.searchParams.set("autocomplete", autocomplete ? "true" : "false");
  url.searchParams.set("country", "US,CA,MX");
  url.searchParams.set("types", CST_GEOCODING_TYPES);
  url.searchParams.set("limit", String(CST_GEOCODING_FETCH_LIMIT));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed (${response.status})`);
  }

  const payload = await response.json();
  return (payload.features || [])
    .map(parseMapboxGeocodingFeature)
    .filter(Boolean);
}

async function fetchCstGeocodingSuggestions(query, { signal, autocomplete = true } = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const regionMatches = searchCstRegionSuggestions(trimmedQuery, CST_GEOCODING_LIMIT);
  let mapboxMatches = [];

  try {
    mapboxMatches = await fetchCstMapboxPlaceSuggestions(trimmedQuery, { signal, autocomplete });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    mapboxMatches = [];
  }

  return dedupeCstLocationResults([
    ...regionMatches,
    ...mapboxMatches
  ]).slice(0, CST_GEOCODING_LIMIT);
}

async function reverseGeocodeCstCoordinates(longitude, latitude, { types = "address" } = {}) {
  if (!CST_LOCATION_MAPBOX_TOKEN) return null;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
  );
  url.searchParams.set("access_token", CST_LOCATION_MAPBOX_TOKEN);
  url.searchParams.set("country", "US,CA,MX");
  url.searchParams.set("types", types);
  url.searchParams.set("limit", "1");

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = await response.json();
  const [feature] = payload.features || [];
  return feature ? parseMapboxGeocodingFeature(feature) : null;
}

async function resolveCstLocationFromCoordinates(longitude, latitude, stateCode = null) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const geocoded = await reverseGeocodeCstCoordinates(longitude, latitude, { types: "address" })
    || await reverseGeocodeCstCoordinates(longitude, latitude, { types: "place" });

  if (!geocoded?.label) {
    return createCstLocationResult({
      label: "My location",
      stateCode,
      coordinates: { longitude, latitude },
      geoLevel: "address"
    });
  }

  return createCstLocationResult({
    label: geocoded.label,
    stateCode: geocoded.stateCode || stateCode,
    coordinates: { longitude, latitude },
    geoLevel: geocoded.geoLevel === "place" ? "place" : "address"
  });
}

function createCstLocationResultFromRegionCode(stateCode, label = getCstRegionLabel(stateCode)) {
  return createCstRegionLocationResult(stateCode) || createCstLocationResult({
    label,
    stateCode,
    geoLevel: "region"
  });
}

function createCstLocationResultFromLabel(label) {
  const trimmedLabel = stripCstLocationCountrySuffix(label);
  if (!trimmedLabel) return null;

  const regionMatch = resolveCstRegionQuery(trimmedLabel);
  if (regionMatch && normalizeCstLocationQuery(regionMatch.label) === normalizeCstLocationQuery(trimmedLabel)) {
    return createCstLocationResultFromRegionCode(regionMatch.code, regionMatch.label);
  }

  const [, regionName] = trimmedLabel.split(",").map((part) => part.trim());
  const regionCode = getCstRegionCodeFromLabel(regionName || "");
  const knownCenter = typeof getOwnerLocationCenterByLabel === "function"
    ? getOwnerLocationCenterByLabel(trimmedLabel)
    : null;

  return createCstLocationResult({
    label: trimmedLabel,
    stateCode: regionCode,
    coordinates: knownCenter
      ? { longitude: knownCenter.lng, latitude: knownCenter.lat }
      : null,
    geoLevel: regionCode && regionName ? "place" : (regionCode ? "region" : "place")
  });
}

async function resolveCstLocationSearch(query, selectedResult = null) {
  if (selectedResult?.label) return selectedResult;

  const regionMatch = resolveCstRegionQuery(query);
  if (regionMatch) return createCstLocationResultFromRegionCode(regionMatch.code, regionMatch.label);

  const fromLabel = createCstLocationResultFromLabel(query);
  if (fromLabel && !CST_LOCATION_MAPBOX_TOKEN) return fromLabel;

  if (!CST_LOCATION_MAPBOX_TOKEN || !String(query || "").trim()) return fromLabel;

  const [geocodedMatch] = await fetchCstMapboxPlaceSuggestions(query, { autocomplete: false });
  return geocodedMatch || fromLabel;
}

function shouldAutoEnableRadiusForLocation(result) {
  return Object.prototype.hasOwnProperty.call(CST_LOCATION_AUTO_RADIUS_MILES, result?.geoLevel || "");
}

function getAutoRadiusMilesForLocation(result) {
  return CST_LOCATION_AUTO_RADIUS_MILES[result?.geoLevel] || null;
}

function getLocationRecordCoordinates(location) {
  const latitude = Number(location?.lat ?? location?.coordinates?.latitude);
  const longitude = Number(location?.lng ?? location?.coordinates?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function getLocationRecordRegionCode(location) {
  if (location?.stateCode) {
    const fromStateCode = getCstRegionCodeFromLabel(location.stateCode) || String(location.stateCode).toUpperCase();
    if (CST_REGION_CENTERS[fromStateCode] || CST_REGION_BOUNDS[fromStateCode]) return fromStateCode;
  }

  if (location?.state) {
    const fromState = getCstRegionCodeFromLabel(location.state) || String(location.state).toUpperCase();
    if (CST_REGION_CENTERS[fromState] || CST_REGION_BOUNDS[fromState]) return fromState;
  }

  const locationLabel = stripCstLocationCountrySuffix(location?.label || location?.location || "");
  const parts = locationLabel.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return getCstRegionCodeFromLabel(parts[parts.length - 1]);
  }

  return getCstRegionCodeFromLabel(locationLabel);
}

function locationRecordMatchesRegionLabel(location, regionCode, searchLabel = "") {
  const locationLabel = stripCstLocationCountrySuffix(location?.label || location?.location || "");
  const normalizedLocation = normalizeCstLocationQuery(locationLabel);
  const regionLabel = normalizeCstLocationQuery(getCstRegionLabel(regionCode) || searchLabel);
  const normalizedRegionCode = normalizeCstLocationQuery(regionCode);

  return Boolean(normalizedLocation && regionLabel && (
    normalizedLocation.endsWith(` ${regionLabel}`)
    || normalizedLocation === regionLabel
    || (normalizedRegionCode && normalizedLocation.endsWith(` ${normalizedRegionCode}`))
  ));
}

function locationRecordIsInRegion(location, regionCode) {
  if (!regionCode) return false;

  const coordinates = getLocationRecordCoordinates(location);
  const bounds = getCstRegionBounds(regionCode);
  if (coordinates && bounds) {
    const [west, south, east, north] = bounds;
    return coordinates.longitude >= west
      && coordinates.longitude <= east
      && coordinates.latitude >= south
      && coordinates.latitude <= north;
  }

  const locationRegionCode = getLocationRecordRegionCode(location);
  if (locationRegionCode) return locationRegionCode === regionCode;

  return locationRecordMatchesRegionLabel(location, regionCode);
}

function locationRecordMatchesSearch(location, search) {
  if (!search) return false;

  const locationLabel = stripCstLocationCountrySuffix(location?.label || location?.location || "");
  const searchLabel = stripCstLocationCountrySuffix(search.label);
  const normalizedLocation = normalizeCstLocationQuery(locationLabel);
  const normalizedSearch = normalizeCstLocationQuery(searchLabel);

  if (search.geoLevel === "region" && search.stateCode) {
    return locationRecordIsInRegion(location, search.stateCode);
  }

  if (normalizedLocation && normalizedLocation === normalizedSearch) return true;

  if (search.geoLevel === "place" || search.geoLevel === "district") {
    const [searchCity, searchRegion] = searchLabel.split(",").map((part) => part.trim());
    const [locationCity, locationRegion] = locationLabel.split(",").map((part) => part.trim());
    if (
      searchCity
      && locationCity
      && normalizeCstLocationQuery(searchCity) === normalizeCstLocationQuery(locationCity)
    ) {
      if (!searchRegion || !locationRegion) return true;
      return normalizeCstLocationQuery(searchRegion) === normalizeCstLocationQuery(locationRegion)
        || normalizeCstLocationQuery(getCstRegionLabel(search.stateCode)) === normalizeCstLocationQuery(locationRegion);
    }
  }

  return false;
}

function bindCstLocationSearch({
  root,
  field,
  form,
  input,
  menu,
  suggestions,
  clearButton,
  feedback,
  onSubmit,
  onInclude,
  onExclude,
  onClear,
  variant = "splash",
  emptyMessage = "Enter a street, city, or state to begin.",
  noMatchMessage = "Choose a matching location from the suggestions.",
  suggestionPrefix = "cstLocationSuggestion"
} = {}) {
  if (!input || !suggestions) return null;

  const isFilterVariant = variant === "filter";
  const fieldElement = field || form?.closest(".filter-select-field") || null;
  const menuElement = menu || fieldElement?.querySelector(".filter-combobox-menu") || null;
  const scopeElement = root || fieldElement || form;
  let optionTooltip = null;
  let optionTooltipTarget = null;

  let debounceTimer = null;
  let fetchController = null;
  let activeSuggestionIndex = -1;
  let renderedSuggestions = [];
  let selectedSuggestion = null;
  let isSubmitting = false;

  const ui = isFilterVariant
    ? {
        option: "filter-combobox-option",
        optionLabel: "filter-combobox-option-label",
        optionActions: "filter-combobox-option-actions",
        optionAction: "filter-combobox-option-action",
        empty: "filter-combobox-empty"
      }
    : {
        heading: "cst-splash__search-suggestion-heading",
        option: "cst-splash__search-suggestion",
        optionIcon: "cst-splash__search-suggestion-icon",
        optionLabel: "cst-splash__search-suggestion-label",
        optionAction: "cst-splash__search-suggestion-action",
        optionActionKey: "cst-splash__search-suggestion-key",
        empty: "cst-splash__search-suggestion-status"
      };

  function setFeedback(message = "") {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function setSuggestionsOpen(isOpen) {
    input.setAttribute("aria-expanded", String(isOpen));

    if (isFilterVariant) {
      fieldElement?.classList.toggle("is-open", isOpen);
      if (menuElement) {
        menuElement.setAttribute("aria-hidden", String(!isOpen));
      }
      return;
    }

    suggestions.setAttribute("aria-hidden", String(!isOpen));
    form?.classList.toggle("is-suggestions-open", isOpen);
  }

  function closeSuggestions() {
    hideOptionTooltip();
    activeSuggestionIndex = -1;
    renderedSuggestions = [];
    suggestions.replaceChildren();
    input.removeAttribute("aria-activedescendant");
    setSuggestionsOpen(false);
  }

  function getOptionTooltip() {
    if (!optionTooltip) {
      optionTooltip = document.createElement("div");
      optionTooltip.className = "filter-combobox-floating-tooltip";
    }

    return optionTooltip;
  }

  function positionOptionTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = getOptionTooltip();
    tooltip.textContent = tooltipText;

    if (!tooltip.isConnected) {
      document.body.append(tooltip);
    }

    window.fitTooltipToContent?.(tooltip);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showOptionTooltip(event) {
    optionTooltipTarget = event.currentTarget;
    positionOptionTooltip(optionTooltipTarget);
    getOptionTooltip().classList.add("is-visible");
  }

  function hideOptionTooltip() {
    optionTooltipTarget = null;
    optionTooltip?.classList.remove("is-visible");
  }

  function syncSearchActions() {
    const hasInputValue = input.value.trim().length > 0;
    const hasSelection = Boolean(fieldElement?.classList.contains("has-selection"));

    if (clearButton) {
      clearButton.hidden = isFilterVariant ? !hasSelection : (!hasInputValue && !hasSelection);
    }
  }

  function renderSuggestionStatus(message) {
    renderedSuggestions = [];
    activeSuggestionIndex = -1;
    suggestions.replaceChildren();

    const status = document.createElement("div");
    status.className = ui.empty;
    status.textContent = message;
    suggestions.append(status);
    setSuggestionsOpen(true);
  }

  function renderSuggestions(items) {
    renderedSuggestions = items;
    activeSuggestionIndex = items.length ? 0 : -1;
    suggestions.replaceChildren();

    if (!items.length) {
      renderSuggestionStatus("No matching locations.");
      return;
    }

    items.forEach((item, index) => {
      const optionElement = document.createElement(isFilterVariant ? "div" : "button");
      const label = document.createElement("span");

      if (!isFilterVariant) {
        optionElement.type = "button";
      }

      optionElement.className = ui.option;
      optionElement.id = `${suggestionPrefix}-${index}`;
      optionElement.setAttribute("role", "option");
      optionElement.setAttribute("aria-selected", "false");
      optionElement.setAttribute("aria-label", `Select ${getCstLocationSuggestionLabel(item)}`);

      if (isFilterVariant) {
        label.className = ui.optionLabel;
        label.textContent = getCstLocationSuggestionLabel(item);

        const optionActions = document.createElement("span");
        const includeAction = document.createElement("button");
        const excludeAction = document.createElement("button");

        optionActions.className = ui.optionActions;
        includeAction.className = `${ui.optionAction} is-include`;
        includeAction.type = "button";
        includeAction.tabIndex = -1;
        includeAction.setAttribute("aria-label", `Include ${getCstLocationSuggestionLabel(item)} in results`);
        includeAction.dataset.tooltip = "Include\nin results";
        excludeAction.className = `${ui.optionAction} is-exclude`;
        excludeAction.type = "button";
        excludeAction.tabIndex = -1;
        excludeAction.setAttribute("aria-label", `Exclude ${getCstLocationSuggestionLabel(item)} from results`);
        excludeAction.dataset.tooltip = "Exclude\nfrom results";

        [includeAction, excludeAction].forEach((actionButton) => {
          actionButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          actionButton.addEventListener("mouseenter", showOptionTooltip);
          actionButton.addEventListener("mouseleave", hideOptionTooltip);
          actionButton.addEventListener("focus", showOptionTooltip);
          actionButton.addEventListener("blur", hideOptionTooltip);
          actionButton.addEventListener("click", hideOptionTooltip);
        });

        includeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          void handleInclude(item);
        });
        excludeAction.addEventListener("click", (event) => {
          event.stopPropagation();
          void handleExclude(item);
        });

        optionActions.append(includeAction, excludeAction);
        optionElement.append(label, optionActions);
      } else {
        const icon = document.createElement("span");
        const action = document.createElement("span");
        const actionLabel = document.createElement("span");
        const actionKey = document.createElement("img");

        icon.className = ui.optionIcon;
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = `
          <svg viewBox="0 0 16 20" focusable="false">
            <path d="M8 0a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11.1A3.1 3.1 0 1 1 8 4.9a3.1 3.1 0 0 1 0 6.2Z"/>
          </svg>
        `;

        label.className = ui.optionLabel;
        label.textContent = getCstLocationSuggestionLabel(item);

        action.className = ui.optionAction;
        action.setAttribute("aria-hidden", "true");
        actionLabel.textContent = "Select";
        actionKey.className = ui.optionActionKey;
        actionKey.src = "assets/enter.svg";
        actionKey.alt = "";
        action.append(actionLabel, actionKey);
        optionElement.append(icon, label, action);
      }

      optionElement.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      optionElement.addEventListener("mouseenter", () => {
        activeSuggestionIndex = index;
        syncActiveSuggestion();
      });
      optionElement.addEventListener("click", () => {
        if (isFilterVariant) {
          void handleInclude(item);
          return;
        }

        selectSuggestion(item, { submit: true });
      });
      suggestions.append(optionElement);
    });

    setSuggestionsOpen(true);
    syncActiveSuggestion();
  }

  function syncActiveSuggestion() {
    suggestions.querySelectorAll(`.${ui.option}`).forEach((button, index) => {
      const isActive = index === activeSuggestionIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const activeButton = suggestions.querySelector(`.${ui.option}.is-active`);
    if (activeButton) {
      input.setAttribute("aria-activedescendant", activeButton.id);
      activeButton.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  async function submitLocationSearch(forcedResult = null) {
    if (isSubmitting) return null;
    isSubmitting = true;

    try {
      const query = input.value;
      if (!query.trim()) {
        setFeedback(emptyMessage);
        input.focus();
        return null;
      }

      const result = await resolveCstLocationSearch(query, forcedResult || selectedSuggestion);
      if (!result) {
        setFeedback(noMatchMessage);
        input.focus();
        return null;
      }

      setFeedback();
      input.value = isFilterVariant ? "" : result.label;
      syncSearchActions();
      selectedSuggestion = result;
      closeSuggestions();
      await onSubmit?.(result);
      return result;
    } finally {
      isSubmitting = false;
    }
  }

  function selectSuggestion(item, { submit = false } = {}) {
    selectedSuggestion = item;
    input.value = item.label;
    syncSearchActions();
    closeSuggestions();
    setFeedback();

    if (submit) {
      void submitLocationSearch(item);
    }
  }

  async function handleInclude(item) {
    selectedSuggestion = item;
    input.value = "";
    syncSearchActions();
    closeSuggestions();
    setFeedback();
    await (onInclude || onSubmit)?.(item);
  }

  async function handleExclude(item) {
    selectedSuggestion = null;
    input.value = "";
    syncSearchActions();
    closeSuggestions();
    setFeedback();
    await onExclude?.(item);
  }

  async function requestSuggestions(query) {
    fetchController?.abort();
    fetchController = new AbortController();

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      closeSuggestions();
      return;
    }

    renderSuggestionStatus("Searching…");

    try {
      const items = await fetchCstGeocodingSuggestions(trimmedQuery, {
        signal: fetchController.signal
      });
      if (input.value.trim() !== trimmedQuery) return;
      renderSuggestions(items);
    } catch (error) {
      if (error?.name === "AbortError") return;
      closeSuggestions();
    }
  }

  function scheduleSuggestions(query) {
    window.clearTimeout(debounceTimer);
    selectedSuggestion = null;

    if (!query.trim()) {
      closeSuggestions();
      setFeedback();
      return;
    }

    debounceTimer = window.setTimeout(() => {
      void requestSuggestions(query);
    }, CST_GEOCODING_DEBOUNCE_MS);
  }

  input.addEventListener("input", () => {
    if (selectedSuggestion && input.value !== selectedSuggestion.label) {
      selectedSuggestion = null;
    }
    setFeedback();
    syncSearchActions();
    scheduleSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (renderedSuggestions.length) {
      setSuggestionsOpen(true);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, renderedSuggestions.length - 1);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "ArrowUp") {
      if (!renderedSuggestions.length) return;
      event.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      syncActiveSuggestion();
      return;
    }

    if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0 && renderedSuggestions.length) {
        event.preventDefault();
        if (isFilterVariant) {
          void handleInclude(renderedSuggestions[activeSuggestionIndex]);
        } else {
          selectSuggestion(renderedSuggestions[activeSuggestionIndex], { submit: true });
        }
        return;
      }

      event.preventDefault();
      void submitLocationSearch();
    }

    if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!scopeElement?.contains(document.activeElement)) {
        closeSuggestions();
      }
    }, 0);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLocationSearch();
  });

  document.addEventListener("mousedown", (event) => {
    if (!scopeElement?.contains(event.target)) {
      closeSuggestions();
    }
  });

  clearButton?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  clearButton?.addEventListener("click", () => {
    window.clearTimeout(debounceTimer);
    fetchController?.abort();
    selectedSuggestion = null;
    input.value = "";
    closeSuggestions();
    setFeedback();
    syncSearchActions();
    onClear?.();
    input.focus();
  });

  syncSearchActions();

  return {
    setHasSelection(hasSelection = false) {
      fieldElement?.classList.toggle("has-selection", Boolean(hasSelection));
      syncSearchActions();
    },
    setValue(value = "", { suggestion = null } = {}) {
      selectedSuggestion = suggestion;
      input.value = value;
      syncSearchActions();
      closeSuggestions();
      setFeedback();
    },
    reset() {
      selectedSuggestion = null;
      input.value = "";
      closeSuggestions();
      setFeedback();
      syncSearchActions();
    },
    closeSuggestions
  };
}

window.cstLocationSearch = {
  REGION_OPTIONS: CST_REGION_OPTIONS,
  US_STATE_OPTIONS: CST_US_STATE_OPTIONS,
  normalizeQuery: normalizeCstLocationQuery,
  stripCountrySuffix: stripCstLocationCountrySuffix,
  resolveRegionQuery: resolveCstRegionQuery,
  getRegionLabel: getCstRegionLabel,
  getSuggestionLabel: getCstLocationSuggestionLabel,
  getRegionCodeFromLabel: getCstRegionCodeFromLabel,
  getRegionCenter: getCstRegionCenter,
  getRegionBounds: getCstRegionBounds,
  isRegionSearch: isCstRegionSearch,
  locationIsInRegion: locationRecordIsInRegion,
  getSearchKey: getLocationSearchKey,
  fetchSuggestions: fetchCstGeocodingSuggestions,
  resolveSearch: resolveCstLocationSearch,
  resolveFromCoordinates: resolveCstLocationFromCoordinates,
  reverseGeocode: reverseGeocodeCstCoordinates,
  fromRegionCode: createCstLocationResultFromRegionCode,
  fromLabel: createCstLocationResultFromLabel,
  matchesLocation: locationRecordMatchesSearch,
  shouldAutoEnableRadius: shouldAutoEnableRadiusForLocation,
  getAutoRadiusMiles: getAutoRadiusMilesForLocation,
  bind: bindCstLocationSearch
};
