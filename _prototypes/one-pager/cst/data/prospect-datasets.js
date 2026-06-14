const PROSPECT_DATASET_SIZE = 150;

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

const USER_PROFILE_FRANCHISES = [
  { franchise: "OrangeTheory Fitness", category: "Fitness" },
  { franchise: "Crumbl Cookies", category: "Food and Beverage" },
  { franchise: "The Learning Experience", category: "Education & Children" },
  { franchise: "Drybar", category: "Health and Beauty" },
  { franchise: "Ace Handyman Services", category: "Home and Building Services" },
  { franchise: "StretchLab", category: "Fitness" },
  { franchise: "Mathnasium", category: "Children Programs" },
  { franchise: "MaidPro", category: "Professional Business Services" },
  { franchise: "", category: "Retail Products and Services" },
  { franchise: "", category: "Food and Beverage" }
];

const SEARCHER_CATEGORIES = [
  "Food and Beverage",
  "Fitness",
  "Health and Beauty",
  "Home and Building Services",
  "Education & Children",
  "Retail Products and Services",
  "Professional Business Services",
  "Children Programs"
];

const ATHLETE_FRANCHISE_PROFILES = [
  {
    name: "Junior Bridgeman",
    location: "Louisville, Kentucky",
    franchise: "Wendy's, Chili's",
    institution: "Bridgeman Foods",
    category: "Food and Beverage"
  },
  {
    name: "Shaquille O'Neal",
    location: "Atlanta, Georgia",
    franchise: "Papa John's, Five Guys, Krispy Kreme",
    institution: "Shaq Ventures",
    category: "Food and Beverage"
  },
  {
    name: "Drew Brees",
    location: "New Orleans, Louisiana",
    franchise: "Jimmy John's, Dunkin'",
    institution: "Brees Dream Foundation",
    category: "Food and Beverage"
  },
  {
    name: "LeBron James",
    location: "Los Angeles, California",
    franchise: "Blaze Pizza",
    institution: "LRMR Ventures",
    category: "Food and Beverage"
  },
  {
    name: "Jamal Mashburn",
    location: "Lexington, Kentucky",
    franchise: "Outback Steakhouse, Papa John's, Dunkin'",
    institution: "Mashburn Family Office",
    category: "Food and Beverage"
  },
  {
    name: "Phil Mickelson",
    location: "San Diego, California",
    franchise: "Five Guys",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Ray Mickens",
    location: "Dallas, Texas",
    franchise: "Smoothie King, Starbucks, Qdoba",
    institution: "M2 Concepts",
    category: "Food and Beverage"
  },
  {
    name: "Bryan Scott",
    location: "Atlanta, Georgia",
    franchise: "Title Boxing Club",
    institution: "",
    category: "Fitness"
  },
  {
    name: "Hank Aaron",
    location: "Atlanta, Georgia",
    franchise: "Popeyes Louisiana Kitchen",
    institution: "755 Restaurant Corporation",
    category: "Food and Beverage"
  },
  {
    name: "Everette Brown",
    location: "Charlotte, North Carolina",
    franchise: "Tropical Smoothie Cafe",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Cameron Thomas",
    location: "Carlsbad, California",
    franchise: "Aussie Pet Mobile",
    institution: "Thomas Brothers Franchise Group",
    category: "Retail Products and Services"
  },
  {
    name: "Zachary Thomas",
    location: "Del Mar, California",
    franchise: "Aussie Pet Mobile",
    institution: "Thomas Brothers Franchise Group",
    category: "Retail Products and Services"
  },
  {
    name: "Peyton Manning",
    location: "Denver, Colorado",
    franchise: "Papa John's",
    institution: "Manning Ventures",
    category: "Food and Beverage"
  },
  {
    name: "Tony McGee",
    location: "Cincinnati, Ohio",
    franchise: "Dunkin'",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Marcus Burley",
    location: "Richmond, Virginia",
    franchise: "Tropical Smoothie Cafe",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Donnell Thompson",
    location: "Raleigh, North Carolina",
    franchise: "Popeyes Louisiana Kitchen",
    institution: "Thompson Hospitality Group",
    category: "Food and Beverage"
  },
  {
    name: "Keith Smith",
    location: "Detroit, Michigan",
    franchise: "Mathnasium",
    institution: "",
    category: "Children Programs"
  },
  {
    name: "Billy Bajema",
    location: "Oklahoma City, Oklahoma",
    franchise: "Blaze Pizza",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Brooklynn Lorenzen",
    location: "Salt Lake City, Utah",
    franchise: "Smoothie King",
    institution: "",
    category: "Food and Beverage"
  },
  {
    name: "Kris Brown",
    location: "Omaha, Nebraska",
    franchise: "Dunkin'",
    institution: "",
    category: "Food and Beverage"
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
    category: franchiseProfile.category
  };
}

function createUserProfiles() {
  return Array.from({ length: PROSPECT_DATASET_SIZE }, (_, index) => {
    const name = getProspectName(index);
    const franchiseProfile = USER_PROFILE_FRANCHISES[index % USER_PROFILE_FRANCHISES.length];
    const franchise = franchiseProfile.franchise;

    return {
      id: `user-profile-${prospectSlug(name)}-${index + 1}`,
      name,
      location: PROSPECT_LOCATIONS[(index * 5) % PROSPECT_LOCATIONS.length],
      email: getProspectEmail(name, index, franchise, { preferFranchiseDomain: Boolean(franchise) }),
      phone: getProspectPhone(index + 3),
      franchise,
      institution: "",
      category: franchiseProfile.category
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
      category: SEARCHER_CATEGORIES[index % SEARCHER_CATEGORIES.length]
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
      category: profile.category
    };
  });
}

window.prospectDatasetsData = {
  userProfiles: {
    label: "User profiles",
    rows: createUserProfiles()
  },
  searchers: {
    label: "Searchers",
    rows: createSearchers()
  },
  athletes: {
    label: "Athletes",
    rows: createAthletes()
  }
};
