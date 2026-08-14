// Saved searches shown as tiles on the splash screen. Each entry stores the
// same values the filter panel holds, so opening a tile is identical to the
// user re-applying that query by hand.
//
// filters:
//   search        free-text query (matches the toolbar search field)
//   locations     location labels, e.g. "Omaha, Nebraska"
//   categories    category names
//   franchises    franchise/brand names
//   owners        owner indexes (matches the Owners filter)
//   units         { min, max } unit count range; omit a bound to keep the default
//   contacts      { min, max } contact count range
// snapshot: pre-rendered map image. Regenerate with:
//   node _prototypes/cst/scripts/generate-splash-snapshots.js
// view: which table the search opens in ("owners" | "locations")

const CST_SAVED_SEARCH_MIDWEST_LOCATIONS = [
  "Omaha, Nebraska",
  "Lincoln, Nebraska",
  "Minneapolis, Minnesota",
  "Madison, Wisconsin",
  "Peoria, Illinois",
  "St. Louis, Missouri",
  "Kansas City, Missouri",
  "Wichita, Kansas",
  "Fargo, North Dakota"
];

const CST_SAVED_SEARCH_SOUTHEAST_LOCATIONS = [
  "Atlanta, Georgia",
  "Macon, Georgia",
  "Charlotte, North Carolina",
  "Greensboro, North Carolina",
  "Asheville, North Carolina",
  "Columbia, South Carolina",
  "Nashville, Tennessee",
  "Memphis, Tennessee",
  "Birmingham, Alabama",
  "Montgomery, Alabama",
  "Orlando, Florida",
  "Ocala, Florida",
  "Louisville, Kentucky"
];

const CST_SAVED_SEARCH_NORTH_AMERICA_LOCATIONS = [
  "Toronto, Ontario",
  "Ottawa, Ontario",
  "Montreal, Quebec",
  "Quebec City, Quebec",
  "Vancouver, British Columbia",
  "Calgary, Alberta",
  "Edmonton, Alberta",
  "Winnipeg, Manitoba",
  "Mexico City, Mexico",
  "Monterrey, Nuevo Leon",
  "Guadalajara, Jalisco",
  "Tijuana, Baja California",
  "Queretaro, Queretaro",
  "Puebla, Puebla",
  "Hermosillo, Sonora",
  "Chihuahua, Chihuahua",
  "Oaxaca, Oaxaca"
];

window.cstSavedSearchesData = [
  {
    id: "planet-fitness-at-scale",
    title: "Planet Fitness at scale",
    snapshot: "assets/snapshots/planet-fitness-at-scale.jpg",
    filters: {
      franchises: ["Planet Fitness"],
      units: { min: 100 }
    }
  },
  {
    id: "midwest-operator-groups",
    title: "Midwest operator groups",
    snapshot: "assets/snapshots/midwest-operator-groups.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_MIDWEST_LOCATIONS
    }
  },
  {
    id: "southeast-expansion",
    title: "Southeast expansion targets",
    snapshot: "assets/snapshots/southeast-expansion.jpg",
    filters: {
      locations: CST_SAVED_SEARCH_SOUTHEAST_LOCATIONS
    }
  },
  {
    id: "boutique-studio-operators",
    title: "Boutique studio operators",
    snapshot: "assets/snapshots/boutique-studio-operators.jpg",
    filters: {
      franchises: ["Club Pilates", "F45 Training", "Orangetheory", "Anytime Fitness"]
    }
  },
  {
    id: "deep-contact-rosters",
    title: "Deep contact rosters",
    snapshot: "assets/snapshots/deep-contact-rosters.jpg",
    filters: {
      contacts: { min: 9 }
    }
  },
  {
    id: "canada-and-mexico-units",
    title: "Canada & Mexico units",
    snapshot: "assets/snapshots/canada-and-mexico-units.jpg",
    view: "locations",
    filters: {
      locations: CST_SAVED_SEARCH_NORTH_AMERICA_LOCATIONS
    }
  }
];
