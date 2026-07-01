// Synced with _prototypes/cst/data/locations.js water exclusion masks.
window.NORTH_AMERICA_WATER_EXCLUSION_POLYGONS = [
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

window.isWithinNorthAmericaBounds = function isWithinNorthAmericaBounds(location) {
  return location.lat >= 14 &&
    location.lat <= 60.5 &&
    location.lng >= -133 &&
    location.lng <= -52;
};

window.isPointInCoordinatePolygon = function isPointInCoordinatePolygon(location, polygon) {
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
};

window.isOnNorthAmericaLand = function isOnNorthAmericaLand(location) {
  return window.isWithinNorthAmericaBounds(location) &&
    !window.NORTH_AMERICA_WATER_EXCLUSION_POLYGONS.some(
      (polygon) => window.isPointInCoordinatePolygon(location, polygon)
    );
};
