const PROSPECT_DATASET_SIZE = 150;
const CANDIDATE_DATASET_SIZE = PROSPECT_DATASET_SIZE + 324;

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "icloud.com",
  "hotmail.com",
  "proton.me",
  "aol.com"
];

const FRANCHISE_EMAIL_DOMAINS = {
  "Ace Handyman Services": "acehandymanservices.com",
  "Aussie Pet Mobile": "aussiepetmobile.com",
  "Blaze Pizza": "blazepizza.com",
  "Chili's": "chilis.com",
  "Crumbl Cookies": "crumbl.com",
  "Drybar": "drybarshops.com",
  "Dunkin'": "dunkindonuts.com",
  "Five Guys": "fiveguys.com",
  "Jimmy John's": "jimmyjohns.com",
  "Krispy Kreme": "krispykreme.com",
  "MaidPro": "maidpro.com",
  "Mathnasium": "mathnasium.com",
  "OrangeTheory Fitness": "orangetheory.com",
  "Outback Steakhouse": "outback.com",
  "Papa John's": "papajohns.com",
  "Popeyes Louisiana Kitchen": "popeyes.com",
  "Qdoba": "qdoba.com",
  "Smoothie King": "smoothieking.com",
  "Starbucks": "starbucks.com",
  "StretchLab": "stretchlab.com",
  "The Learning Experience": "thelearningexperience.com",
  "Title Boxing Club": "titleboxingclub.com",
  "Tropical Smoothie Cafe": "tropicalsmoothiecafe.com",
  "Wendy's": "wendys.com"
};

const PROSPECT_FIRST_NAMES = [
  "Aisha",
  "Alex",
  "Amara",
  "Andre",
  "Anna",
  "Avery",
  "Benjamin",
  "Brianna",
  "Caleb",
  "Camila",
  "Caroline",
  "Claire",
  "Daniel",
  "Devin",
  "Elena",
  "Emily",
  "Ethan",
  "Fatima",
  "Gabriel",
  "Grace",
  "Hannah",
  "Isabel",
  "Jalen",
  "Jordan",
  "Kai",
  "Leah",
  "Luis",
  "Malik",
  "Marcus",
  "Maya",
  "Naomi",
  "Nathan",
  "Nina",
  "Noah",
  "Owen",
  "Priya",
  "Quinn",
  "Ryan",
  "Samira",
  "Sophia",
  "Tessa",
  "Victor",
  "Zoe"
];

const PROSPECT_LAST_NAMES = [
  "Alvarez",
  "Baker",
  "Bennett",
  "Brooks",
  "Carter",
  "Chen",
  "Coleman",
  "Davis",
  "Ellis",
  "Foster",
  "Garcia",
  "Green",
  "Harris",
  "Hill",
  "Johnson",
  "Kim",
  "Kowalski",
  "Lee",
  "Martinez",
  "Morgan",
  "Nguyen",
  "Patel",
  "Price",
  "Reed",
  "Rivera",
  "Ross",
  "Scott",
  "Singh",
  "Thompson",
  "Warren",
  "Williams",
  "Wilson",
  "Young"
];

const PROSPECT_LOCATIONS = [
  "Atlanta, Georgia",
  "Austin, Texas",
  "Baltimore, Maryland",
  "Charlotte, North Carolina",
  "Chicago, Illinois",
  "Columbus, Ohio",
  "Dallas, Texas",
  "Denver, Colorado",
  "Indianapolis, Indiana",
  "Las Vegas, Nevada",
  "Los Angeles, California",
  "Miami, Florida",
  "Nashville, Tennessee",
  "Orlando, Florida",
  "Phoenix, Arizona",
  "Raleigh, North Carolina",
  "Salt Lake City, Utah",
  "San Diego, California",
  "Seattle, Washington",
  "Tampa, Florida"
];

const PROSPECT_LOCATION_COORDINATES = {
  "Atlanta, Georgia": { lat: 33.749, lng: -84.388 },
  "Austin, Texas": { lat: 30.2672, lng: -97.7431 },
  "Baltimore, Maryland": { lat: 39.2904, lng: -76.6122 },
  "Carlsbad, California": { lat: 33.1581, lng: -117.3506 },
  "Charlotte, North Carolina": { lat: 35.2271, lng: -80.8431 },
  "Chicago, Illinois": { lat: 41.8781, lng: -87.6298 },
  "Cincinnati, Ohio": { lat: 39.1031, lng: -84.512 },
  "Columbus, Ohio": { lat: 39.9612, lng: -82.9988 },
  "Dallas, Texas": { lat: 32.7767, lng: -96.797 },
  "Del Mar, California": { lat: 32.9595, lng: -117.2653 },
  "Denver, Colorado": { lat: 39.7392, lng: -104.9903 },
  "Detroit, Michigan": { lat: 42.3314, lng: -83.0458 },
  "Indianapolis, Indiana": { lat: 39.7684, lng: -86.1581 },
  "Las Vegas, Nevada": { lat: 36.1699, lng: -115.1398 },
  "Lexington, Kentucky": { lat: 38.0406, lng: -84.5037 },
  "Los Angeles, California": { lat: 34.0522, lng: -118.2437 },
  "Louisville, Kentucky": { lat: 38.2527, lng: -85.7585 },
  "Miami, Florida": { lat: 25.7617, lng: -80.1918 },
  "Nashville, Tennessee": { lat: 36.1627, lng: -86.7816 },
  "New Orleans, Louisiana": { lat: 29.9511, lng: -90.0715 },
  "Oklahoma City, Oklahoma": { lat: 35.4676, lng: -97.5164 },
  "Omaha, Nebraska": { lat: 41.2565, lng: -95.9345 },
  "Orlando, Florida": { lat: 28.5383, lng: -81.3792 },
  "Phoenix, Arizona": { lat: 33.4484, lng: -112.074 },
  "Raleigh, North Carolina": { lat: 35.7796, lng: -78.6382 },
  "Richmond, Virginia": { lat: 37.5407, lng: -77.436 },
  "Salt Lake City, Utah": { lat: 40.7608, lng: -111.891 },
  "San Diego, California": { lat: 32.7157, lng: -117.1611 },
  "Seattle, Washington": { lat: 47.6062, lng: -122.3321 },
  "Tampa, Florida": { lat: 27.9506, lng: -82.4572 }
};

// Candidates cluster in the Northeast, the Southeast, and California/Nevada,
// with a few elsewhere so the map is not empty outside those regions.
const CANDIDATE_PLACES = {
  northeast: [
    { label: "Boston, Massachusetts", lat: 42.3601, lng: -71.0589 },
    { label: "Cambridge, Massachusetts", lat: 42.3736, lng: -71.1097 },
    { label: "Brookline, Massachusetts", lat: 42.3318, lng: -71.1212 },
    { label: "Worcester, Massachusetts", lat: 42.2626, lng: -71.8023 },
    { label: "Providence, Rhode Island", lat: 41.824, lng: -71.4128 },
    { label: "Hartford, Connecticut", lat: 41.7658, lng: -72.6734 },
    { label: "New Haven, Connecticut", lat: 41.3083, lng: -72.9279 },
    { label: "Stamford, Connecticut", lat: 41.0534, lng: -73.5387 },
    { label: "New York, New York", lat: 40.7128, lng: -74.006 },
    { label: "Brooklyn, New York", lat: 40.6782, lng: -73.9442 },
    { label: "Queens, New York", lat: 40.7282, lng: -73.7949 },
    { label: "White Plains, New York", lat: 41.034, lng: -73.7629 },
    { label: "Jersey City, New Jersey", lat: 40.7178, lng: -74.0431 },
    { label: "Newark, New Jersey", lat: 40.7357, lng: -74.1724 },
    { label: "Hoboken, New Jersey", lat: 40.744, lng: -74.0324 },
    { label: "Princeton, New Jersey", lat: 40.3573, lng: -74.6672 },
    { label: "Philadelphia, Pennsylvania", lat: 39.9526, lng: -75.1652 },
    { label: "Pittsburgh, Pennsylvania", lat: 40.4406, lng: -79.9959 },
    { label: "Baltimore, Maryland", lat: 39.2904, lng: -76.6122 },
    { label: "Bethesda, Maryland", lat: 38.9847, lng: -77.0947 },
    { label: "Arlington, Virginia", lat: 38.8816, lng: -77.091 },
    { label: "Alexandria, Virginia", lat: 38.8048, lng: -77.0469 },
    { label: "Richmond, Virginia", lat: 37.5407, lng: -77.436 },
    { label: "Norfolk, Virginia", lat: 36.8508, lng: -76.2859 }
  ],
  southeast: [
    { label: "Atlanta, Georgia", lat: 33.749, lng: -84.388 },
    { label: "Decatur, Georgia", lat: 33.7748, lng: -84.2963 },
    { label: "Marietta, Georgia", lat: 33.9526, lng: -84.5499 },
    { label: "Savannah, Georgia", lat: 32.0809, lng: -81.0912 },
    { label: "Charlotte, North Carolina", lat: 35.2271, lng: -80.8431 },
    { label: "Raleigh, North Carolina", lat: 35.7796, lng: -78.6382 },
    { label: "Durham, North Carolina", lat: 35.994, lng: -78.8986 },
    { label: "Wilmington, North Carolina", lat: 34.2257, lng: -77.9447 },
    { label: "Charleston, South Carolina", lat: 32.7765, lng: -79.9311 },
    { label: "Columbia, South Carolina", lat: 34.0007, lng: -81.0348 },
    { label: "Greenville, South Carolina", lat: 34.8526, lng: -82.394 },
    { label: "Jacksonville, Florida", lat: 30.3322, lng: -81.6557 },
    { label: "Orlando, Florida", lat: 28.5383, lng: -81.3792 },
    { label: "Tampa, Florida", lat: 27.9506, lng: -82.4572 },
    { label: "St. Petersburg, Florida", lat: 27.7676, lng: -82.6403 },
    { label: "Miami, Florida", lat: 25.7617, lng: -80.1918 },
    { label: "Fort Lauderdale, Florida", lat: 26.1224, lng: -80.1373 },
    { label: "West Palm Beach, Florida", lat: 26.7153, lng: -80.0534 },
    { label: "Nashville, Tennessee", lat: 36.1627, lng: -86.7816 },
    { label: "Memphis, Tennessee", lat: 35.1495, lng: -90.049 },
    { label: "Knoxville, Tennessee", lat: 35.9606, lng: -83.9207 },
    { label: "Birmingham, Alabama", lat: 33.5186, lng: -86.8104 },
    { label: "Louisville, Kentucky", lat: 38.2527, lng: -85.7585 },
    { label: "New Orleans, Louisiana", lat: 29.9511, lng: -90.0715 }
  ],
  californiaNevada: [
    { label: "Los Angeles, California", lat: 34.0522, lng: -118.2437 },
    { label: "Santa Monica, California", lat: 34.0195, lng: -118.4912 },
    { label: "Pasadena, California", lat: 34.1478, lng: -118.1445 },
    { label: "Long Beach, California", lat: 33.7701, lng: -118.1937 },
    { label: "Irvine, California", lat: 33.6846, lng: -117.8265 },
    { label: "San Diego, California", lat: 32.7157, lng: -117.1611 },
    { label: "La Jolla, California", lat: 32.8328, lng: -117.2713 },
    { label: "San Francisco, California", lat: 37.7749, lng: -122.4194 },
    { label: "Oakland, California", lat: 37.8044, lng: -122.2712 },
    { label: "San Jose, California", lat: 37.3382, lng: -121.8863 },
    { label: "Sacramento, California", lat: 38.5816, lng: -121.4944 },
    { label: "Fresno, California", lat: 36.7378, lng: -119.7871 },
    { label: "Las Vegas, Nevada", lat: 36.1699, lng: -115.1398 },
    { label: "Henderson, Nevada", lat: 36.0395, lng: -114.9817 },
    { label: "Reno, Nevada", lat: 39.5296, lng: -119.8138 }
  ],
  elsewhere: [
    { label: "Chicago, Illinois", lat: 41.8781, lng: -87.6298 },
    { label: "Dallas, Texas", lat: 32.7767, lng: -96.797 },
    { label: "Houston, Texas", lat: 29.7604, lng: -95.3698 },
    { label: "Austin, Texas", lat: 30.2672, lng: -97.7431 },
    { label: "Denver, Colorado", lat: 39.7392, lng: -104.9903 },
    { label: "Phoenix, Arizona", lat: 33.4484, lng: -112.074 },
    { label: "Seattle, Washington", lat: 47.6062, lng: -122.3321 },
    { label: "Minneapolis, Minnesota", lat: 44.9778, lng: -93.265 }
  ]
};

function getCandidatePlace(index) {
  const band = index % 10;
  const places = band < 4
    ? CANDIDATE_PLACES.southeast
    : band < 7
      ? CANDIDATE_PLACES.northeast
      : band < 9
        ? CANDIDATE_PLACES.californiaNevada
        : CANDIDATE_PLACES.elsewhere;

  // Step through the whole list, so later cities (New York, Miami, Nashville)
  // are used alongside the first ones.
  return places[(Math.floor(index / 10) * 7) % places.length];
}

const USER_PROFILE_FRANCHISES = [
  { franchise: "OrangeTheory Fitness", categoryId: "fitness" },
  { franchise: "Crumbl Cookies", categoryId: "food-beverage" },
  { franchise: "The Learning Experience", categoryId: "youth-enrichment" },
  { franchise: "Drybar", categoryId: "health-wellness" },
  { franchise: "Ace Handyman Services", categoryId: "home-building-services" },
  { franchise: "StretchLab", categoryId: "fitness" },
  { franchise: "Mathnasium", categoryId: "youth-enrichment" },
  { franchise: "MaidPro", categoryId: "business-services" },
  { franchise: "", categoryId: "retail-consumer-services" },
  { franchise: "", categoryId: "food-beverage" }
];

const SEARCHER_CATEGORIES = [
  "food-beverage",
  "fitness",
  "health-wellness",
  "home-building-services",
  "youth-enrichment",
  "retail-consumer-services",
  "business-services"
];

const ATHLETE_FRANCHISE_PROFILES = [
  {
    name: "Junior Bridgeman",
    location: "Louisville, Kentucky",
    franchise: "Wendy's, Chili's",
    institution: "Bridgeman Foods",
    categoryId: "food-beverage"
  },
  {
    name: "Shaquille O'Neal",
    location: "Atlanta, Georgia",
    franchise: "Papa John's, Five Guys, Krispy Kreme",
    institution: "Shaq Ventures",
    categoryId: "food-beverage"
  },
  {
    name: "Drew Brees",
    location: "New Orleans, Louisiana",
    franchise: "Jimmy John's, Dunkin'",
    institution: "Brees Dream Foundation",
    categoryId: "food-beverage"
  },
  {
    name: "LeBron James",
    location: "Los Angeles, California",
    franchise: "Blaze Pizza",
    institution: "LRMR Ventures",
    categoryId: "food-beverage"
  },
  {
    name: "Jamal Mashburn",
    location: "Lexington, Kentucky",
    franchise: "Outback Steakhouse, Papa John's, Dunkin'",
    institution: "Mashburn Family Office",
    categoryId: "food-beverage"
  },
  {
    name: "Phil Mickelson",
    location: "San Diego, California",
    franchise: "Five Guys",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Ray Mickens",
    location: "Dallas, Texas",
    franchise: "Smoothie King, Starbucks, Qdoba",
    institution: "M2 Concepts",
    categoryId: "food-beverage"
  },
  {
    name: "Bryan Scott",
    location: "Atlanta, Georgia",
    franchise: "Title Boxing Club",
    institution: "",
    categoryId: "fitness"
  },
  {
    name: "Hank Aaron",
    location: "Atlanta, Georgia",
    franchise: "Popeyes Louisiana Kitchen",
    institution: "755 Restaurant Corporation",
    categoryId: "food-beverage"
  },
  {
    name: "Everette Brown",
    location: "Charlotte, North Carolina",
    franchise: "Tropical Smoothie Cafe",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Cameron Thomas",
    location: "Carlsbad, California",
    franchise: "Aussie Pet Mobile",
    institution: "Thomas Brothers Franchise Group",
    categoryId: "retail-consumer-services"
  },
  {
    name: "Zachary Thomas",
    location: "Del Mar, California",
    franchise: "Aussie Pet Mobile",
    institution: "Thomas Brothers Franchise Group",
    categoryId: "retail-consumer-services"
  },
  {
    name: "Peyton Manning",
    location: "Denver, Colorado",
    franchise: "Papa John's",
    institution: "Manning Ventures",
    categoryId: "food-beverage"
  },
  {
    name: "Tony McGee",
    location: "Cincinnati, Ohio",
    franchise: "Dunkin'",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Marcus Burley",
    location: "Richmond, Virginia",
    franchise: "Tropical Smoothie Cafe",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Donnell Thompson",
    location: "Raleigh, North Carolina",
    franchise: "Popeyes Louisiana Kitchen",
    institution: "Thompson Hospitality Group",
    categoryId: "food-beverage"
  },
  {
    name: "Keith Smith",
    location: "Detroit, Michigan",
    franchise: "Mathnasium",
    institution: "",
    categoryId: "youth-enrichment"
  },
  {
    name: "Billy Bajema",
    location: "Oklahoma City, Oklahoma",
    franchise: "Blaze Pizza",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Brooklynn Lorenzen",
    location: "Salt Lake City, Utah",
    franchise: "Smoothie King",
    institution: "",
    categoryId: "food-beverage"
  },
  {
    name: "Kris Brown",
    location: "Omaha, Nebraska",
    franchise: "Dunkin'",
    institution: "",
    categoryId: "food-beverage"
  }
];

const ATHLETE_FIRST_NAMES = [
  "Aaron",
  "Abigail",
  "Ada",
  "Adrian",
  "Aiden",
  "Alana",
  "Alicia",
  "Alyssa",
  "Amari",
  "Anika",
  "Andre",
  "Anthony",
  "Aria",
  "Ashlyn",
  "Ashton",
  "Audra",
  "Beau",
  "Bella",
  "Bennett",
  "Bianca",
  "Blake",
  "Brandon",
  "Brady",
  "Brielle",
  "Brooklyn",
  "Cam",
  "Carson",
  "Celeste",
  "Chloe",
  "Christian",
  "Cierra",
  "Clara",
  "Cody",
  "Connor",
  "Cooper",
  "Damian",
  "Daniela",
  "Darius",
  "Daphne",
  "Daria",
  "Declan",
  "Delaney",
  "Derek",
  "Diana",
  "Dominic",
  "Eden",
  "Elijah",
  "Eli",
  "Elise",
  "Emilia",
  "Eric",
  "Estelle",
  "Eva",
  "Felix",
  "Finn",
  "Fiona",
  "Francesca",
  "Gabrielle",
  "Giselle",
  "Graham",
  "Grant",
  "Greta",
  "Griffin",
  "Harper",
  "Hazel",
  "Henry",
  "Holden",
  "Hugo",
  "Ian",
  "Imani",
  "Iris",
  "Isaiah",
  "Ivy",
  "Jasmine",
  "Jonah",
  "Josiah",
  "Julia",
  "Kaden",
  "Keira",
  "Kellan",
  "Kendall",
  "Kennedy",
  "Kian",
  "Laila",
  "Landon",
  "Lara",
  "Lauren",
  "Levi",
  "Lia",
  "Logan",
  "Luca",
  "Lucia",
  "Maeve",
  "Malcolm",
  "Marco",
  "Mariah",
  "Mason",
  "Mateo",
  "Mia",
  "Micah",
  "Miles",
  "Mila",
  "Nadia",
  "Natalie",
  "Nolan",
  "Nora",
  "Omar",
  "Paige",
  "Parker",
  "Penelope",
  "Rafael",
  "Rashad",
  "Reagan",
  "Reese",
  "Remy",
  "Rowan",
  "Ruby",
  "Sabrina",
  "Sienna",
  "Silas",
  "Simone",
  "Skylar",
  "Sloane",
  "Stella",
  "Tariq",
  "Theo",
  "Tiana",
  "Tristan",
  "Valentina",
  "Vanessa",
  "Vera",
  "Vivian",
  "Wesley",
  "Wyatt",
  "Xavier",
  "Yasmin",
  "Zara",
  "Zuri"
];

const ATHLETE_LAST_NAMES = [
  "Adams",
  "Bailey",
  "Bishop",
  "Cole",
  "Daniels",
  "Fleming",
  "Hayes",
  "Jefferson",
  "Lawson",
  "Marshall",
  "Porter",
  "Reynolds",
  "Simmons",
  "Taylor",
  "Turner",
  "Wallace"
];

function prospectSlug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPrimaryFranchise(franchiseValue) {
  return String(franchiseValue || "")
    .split(",")
    .map((franchise) => franchise.trim())
    .filter(Boolean)[0] || "";
}

function getProspectEmail(name, index, franchise = "", { preferFranchiseDomain = false } = {}) {
  const slug = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
  const primaryFranchise = getPrimaryFranchise(franchise);
  const useFranchiseDomain = preferFranchiseDomain && primaryFranchise && index % 4 !== 1;
  const domain = useFranchiseDomain
    ? FRANCHISE_EMAIL_DOMAINS[primaryFranchise] || PERSONAL_EMAIL_DOMAINS[index % PERSONAL_EMAIL_DOMAINS.length]
    : PERSONAL_EMAIL_DOMAINS[index % PERSONAL_EMAIL_DOMAINS.length];
  const suffix = index % 5 === 0 ? String(20 + index) : "";

  return `${slug}${suffix}@${domain}`;
}

function getProspectPhone(index) {
  const areaCodes = ["212", "305", "312", "404", "512", "602", "704", "818", "919", "980"];
  const areaCode = areaCodes[index % areaCodes.length];
  const prefix = String(555 + ((index * 37) % 300)).padStart(3, "0");
  const line = String(1000 + ((index * 173) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getProspectName(index, offset = 0) {
  const firstName = PROSPECT_FIRST_NAMES[(index + offset) % PROSPECT_FIRST_NAMES.length];
  const lastName = PROSPECT_LAST_NAMES[(index * 7 + offset) % PROSPECT_LAST_NAMES.length];

  return `${firstName} ${lastName}`;
}

function getAthleteName(index) {
  const firstName = ATHLETE_FIRST_NAMES[index % ATHLETE_FIRST_NAMES.length];
  const lastName = ATHLETE_LAST_NAMES[Math.floor(index / ATHLETE_FIRST_NAMES.length) % ATHLETE_LAST_NAMES.length];

  return `${firstName} ${lastName}`;
}

function getSyntheticAthleteProfile(index) {
  const franchiseProfile = ATHLETE_FRANCHISE_PROFILES[index % ATHLETE_FRANCHISE_PROFILES.length];
  const syntheticIndex = index - ATHLETE_FRANCHISE_PROFILES.length;
  const name = getAthleteName(syntheticIndex);

  return {
    name,
    location: PROSPECT_LOCATIONS[(index * 3) % PROSPECT_LOCATIONS.length],
    franchise: franchiseProfile.franchise,
    institution: index % 3 === 0 ? `${name.split(" ").pop()} Sports Ventures` : "",
    categoryId: franchiseProfile.categoryId
  };
}

function createCandidates() {
  return Array.from({ length: CANDIDATE_DATASET_SIZE }, (_, index) => {
    const name = getProspectName(index);
    const franchiseProfile = USER_PROFILE_FRANCHISES[index % USER_PROFILE_FRANCHISES.length];
    const franchise = franchiseProfile.franchise;

    const place = getCandidatePlace(index);

    return {
      id: `candidate-${prospectSlug(name)}-${index + 1}`,
      name,
      location: place.label,
      lat: place.lat,
      lng: place.lng,
      email: getProspectEmail(name, index, franchise, { preferFranchiseDomain: Boolean(franchise) }),
      phone: getProspectPhone(index + 3),
      franchise,
      institution: "",
      categoryId: franchiseProfile.categoryId
    };
  });
}

function createSearchers() {
  return Array.from({ length: PROSPECT_DATASET_SIZE }, (_, index) => {
    const name = getProspectName(index, 11);

    return {
      id: `searcher-${prospectSlug(name)}-${index + 1}`,
      name,
      location: PROSPECT_LOCATIONS[(index * 7 + 2) % PROSPECT_LOCATIONS.length],
      email: getProspectEmail(name, index + 151),
      phone: getProspectPhone(index + 151),
      franchise: "",
      institution: "",
      categoryId: SEARCHER_CATEGORIES[index % SEARCHER_CATEGORIES.length]
    };
  });
}

function createAthletes() {
  return Array.from({ length: PROSPECT_DATASET_SIZE }, (_, index) => {
    const profile = index < ATHLETE_FRANCHISE_PROFILES.length
      ? ATHLETE_FRANCHISE_PROFILES[index]
      : getSyntheticAthleteProfile(index);

    return {
      id: `athlete-${prospectSlug(profile.name)}-${index + 1}`,
      name: profile.name,
      location: profile.location,
      email: getProspectEmail(profile.name, index + 301, profile.franchise, { preferFranchiseDomain: true }),
      phone: getProspectPhone(index + 301),
      franchise: profile.franchise,
      institution: profile.institution,
      categoryId: profile.categoryId
    };
  });
}

// Several people share each city, so each one sits a few miles from the
// center instead of stacking on a single map pin.
function placeProspectRows(rows) {
  return rows.map((row, index) => {
    const center = Number.isFinite(row.lat) && Number.isFinite(row.lng)
      ? { lat: row.lat, lng: row.lng }
      : PROSPECT_LOCATION_COORDINATES[row.location];
    if (!center) return row;

    // Stay within about a mile of the city so people in the same place
    // separate on the map without leaving it.
    const angle = index * 2.39996;
    const distance = 0.006 + (index % 4) * 0.004;
    return {
      ...row,
      lat: Number((center.lat + Math.sin(angle) * distance).toFixed(5)),
      lng: Number((center.lng + Math.cos(angle) * distance * 1.25).toFixed(5))
    };
  });
}

window.prospectDatasetsData = {
  candidates: {
    label: "Candidates",
    roleLabel: "Candidate",
    rows: placeProspectRows(createCandidates())
  },
  searchers: {
    label: "Searchers",
    roleLabel: "Searcher",
    rows: placeProspectRows(createSearchers())
  },
  athletes: {
    label: "Athletes",
    roleLabel: "Athlete",
    rows: placeProspectRows(createAthletes())
  }
};
