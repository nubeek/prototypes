const ownerSeedRows = [
  {
    ownerName: "United FP",
    primaryContact: { name: "Scott Wolff", email: "scottwolff@unitedfp.com" },
    franchiseNames: ["Planet Fitness", "Snap Fitness"],
    contactCount: 15,
    unitCount: 499,
    logoFilename: "united_fp",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Argonne Capital",
    primaryContact: { name: "Mark Rashford", email: "rashford@argonnecapital.com" },
    franchiseNames: ["Planet Fitness", "Snap Fitness"],
    contactCount: 12,
    unitCount: 257,
    logoFilename: "argonne_capital",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Trilantic Capital Management",
    primaryContact: { name: "Cedric Itten", email: "cedricitten@trilantic.com" },
    franchiseNames: ["Planet Fitness", "Snap Fitness"],
    contactCount: 8,
    unitCount: 182,
    logoFilename: "trilantic_capital_management",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "Olympus Partners",
    primaryContact: { name: "Josh Appleseed", email: "josh@olympuspartners.com" },
    franchiseNames: ["Planet Fitness", "Snap Fitness"],
    contactCount: 8,
    unitCount: 97,
    logoFilename: "olympus_partners",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "TowerBrook",
    primaryContact: { name: "Michael Scott", email: "m.scott@towerbrook.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 5,
    unitCount: 82,
    logoFilename: "towerbrook",
    webEnabled: false,
    linkedinEnabled: false
  },
  {
    ownerName: "Planet Fitness Corporate",
    primaryContact: { name: "Chris Rondeau", email: "partners@planetfitness.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 4,
    unitCount: 50,
    logoFilename: "planet_fitness_corporate",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Baseline Mayfair",
    primaryContact: { name: "Rachel Green", email: "r.green@baselinemayfair.com" },
    franchiseNames: ["Crunch Fitness"],
    contactCount: 7,
    unitCount: 76,
    logoFilename: "baseline_mayfair",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "Black Duck Partners",
    primaryContact: { name: "Tom Hardy", email: "tom@blackduckpartners.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 6,
    unitCount: 63,
    logoFilename: "black_duck_partners",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Easy Mile Fitness",
    primaryContact: { name: "Angela Reed", email: "angela@easymilefitness.com" },
    franchiseNames: ["Gold's Gym"],
    contactCount: 3,
    unitCount: 41,
    logoFilename: "easy_mile_fitness",
    webEnabled: false,
    linkedinEnabled: false
  },
  {
    ownerName: "Epic Fitness",
    primaryContact: { name: "Chris Martin", email: "chris@epicfitness.com" },
    franchiseNames: ["Orangetheory"],
    contactCount: 9,
    unitCount: 118,
    logoFilename: "epic_fitness",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "Flynn Fitness",
    primaryContact: { name: "Olivia Stone", email: "olivia@flynnfitness.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 11,
    unitCount: 205,
    logoFilename: "flynn_fitness",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Ohana Growth Partners",
    primaryContact: { name: "Henry Allen", email: "henry@ohanagrowthpartners.com" },
    franchiseNames: ["Snap Fitness", "Planet Fitness"],
    contactCount: 4,
    unitCount: 34,
    logoFilename: "ohana_growth_partners",
    webEnabled: false,
    linkedinEnabled: true
  },
  {
    ownerName: "Pinnacle",
    primaryContact: { name: "Monica Hall", email: "monica@pinnaclefranchise.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 6,
    unitCount: 91,
    logoFilename: "pinnacle",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "SBJ",
    primaryContact: { name: "Ben Carter", email: "ben@sbjoperators.com" },
    franchiseNames: ["Club Pilates"],
    contactCount: 5,
    unitCount: 52,
    logoFilename: "sbj",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "York Capital Management",
    primaryContact: { name: "Evan Wright", email: "evan@yorkcapital.com" },
    franchiseNames: ["F45 Training"],
    contactCount: 2,
    unitCount: 29,
    logoFilename: "york_capital_management",
    webEnabled: false,
    linkedinEnabled: false
  },
  {
    ownerName: "National Fitness Partners",
    primaryContact: { name: "Stephen Kindler Jr.", email: "info@nfpfit.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 12,
    unitCount: 205,
    logoFilename: "argonne_capital",
    logoAsset: "national_fitness_partners.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Public sources describe National Fitness Partners as Argonne-backed and operating 200+ Planet Fitness clubs across 14 states."
    ],
    sourceUrls: ["https://www.nfpfit.com/"]
  },
  {
    ownerName: "Taymax Group",
    primaryContact: { name: "Taymax Leadership Team", email: "info@taymaxgroup.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 10,
    unitCount: 175,
    logoFilename: "trilantic_capital_management",
    logoAsset: "taymax_group.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Franchise Times reports Taymax as one of the largest Planet Fitness franchisees, backed by Trilantic North America."
    ],
    sourceUrls: ["https://www.franchisetimes.com/franchise_times_cover_stories/multi-unit-franchisees-pump-up-planet-fitness/article_ee5ce53d-5368-484f-93f9-f1b183d0aa69.html"]
  },
  {
    ownerName: "Grand Fitness Partners",
    primaryContact: { name: "Wayne Orvis", email: "info@grandfitnesspartners.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 8,
    unitCount: 98,
    logoFilename: "flynn_fitness",
    logoAsset: "grand_fitness_partners.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Franchise Times reports Flynn Group acquired Grand Fitness Partners and its 98 Planet Fitness locations."
    ],
    sourceUrls: ["https://www.franchisetimes.com/fitness-finance/more-consolidation-is-coming-to-franchised-fitness-systems/article_144f8a76-5e3d-41b1-8143-78b3fbce25e2.html"]
  },
  {
    ownerName: "Excel Fitness Holdings",
    primaryContact: { name: "Excel Fitness Leadership Team", email: "info@excelfitness.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 8,
    unitCount: 90,
    logoFilename: "olympus_partners",
    logoAsset: "excel_fitness_holdings.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Industry coverage describes Excel Fitness Holdings as a Planet Fitness franchisee acquired by Olympus Partners with 90+ units."
    ],
    sourceUrls: ["https://joelvanessen.substack.com/p/private-equity-x-franchise-gyms"]
  },
  {
    ownerName: "Fitness Ventures LLC",
    primaryContact: { name: "Brian Hibbard", email: "info@fitnessventuresllc.com" },
    franchiseNames: ["Crunch Fitness"],
    contactCount: 11,
    unitCount: 115,
    logoFilename: "baseline_mayfair",
    logoAsset: "fitness_ventures_llc.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Fitness Ventures describes itself as the largest Crunch Fitness franchise operator, with 115 locations across 30 states and backing from Meaningful Partners."
    ],
    sourceUrls: ["https://fitnessventuresllc.com/"]
  },
  {
    ownerName: "CR Fitness Holdings",
    primaryContact: { name: "Vince Julien", email: "info@crfitnessholdings.com" },
    franchiseNames: ["Crunch Fitness"],
    contactCount: 9,
    unitCount: 90,
    logoFilename: "baseline_mayfair",
    logoAsset: "cr_fitness_holdings.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Business Wire reports CR Fitness Holdings operates nearly 90 Crunch Fitness clubs and has backing from North Castle Partners and Sixth Street."
    ],
    sourceUrls: ["https://www.businesswire.com/news/home/20251023024540/en/Sixth-Street-Makes-Strategic-Growth-Investment-in-the-Nations-Largest-Crunch-Fitness-Franchisee"]
  },
  {
    ownerName: "Riser Fitness",
    primaryContact: { name: "Jeff Nash", email: "info@riserfitness.com" },
    franchiseNames: ["Club Pilates"],
    contactCount: 8,
    unitCount: 110,
    logoFilename: "sbj",
    logoAsset: "riser_fitness.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Franchise Times reports Riser Fitness operates 110+ Club Pilates locations and has growth capital from Fortress Investment Group."
    ],
    sourceUrls: ["https://www.franchisetimes.com/fitness-finance/more-consolidation-is-coming-to-franchised-fitness-systems/article_144f8a76-5e3d-41b1-8143-78b3fbce25e2.html"]
  },
  {
    ownerName: "Aligned Fitness Holdings",
    primaryContact: { name: "Aligned Fitness Leadership Team", email: "info@alignedfitness.com" },
    franchiseNames: ["Club Pilates"],
    contactCount: 6,
    unitCount: 61,
    logoFilename: "sbj",
    logoAsset: "aligned_fitness_holdings.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Athletech News reports Aligned Fitness Holdings is backed by Eagle Merchant Partners and operates 61 Club Pilates studios after recent acquisitions."
    ],
    sourceUrls: ["https://athletechnews.com/aligned-fitness-acquires-club-pilates-studios-in-new-jersey/"]
  },
  {
    ownerName: "Bandon Holdings",
    primaryContact: { name: "Bandon Holdings Leadership Team", email: "info@bandonholdings.com" },
    franchiseNames: ["Anytime Fitness"],
    contactCount: 9,
    unitCount: 213,
    logoFilename: "easy_mile_fitness",
    logoAsset: "bandon_holdings.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Industry coverage describes Bandon Holdings as a large Anytime Fitness franchisee acquired by Sentinel Capital Partners with 213 locations."
    ],
    sourceUrls: ["https://joelvanessen.substack.com/p/private-equity-x-franchise-gyms"]
  },
  {
    ownerName: "Omega Fitness",
    primaryContact: { name: "Omega Fitness Leadership Team", email: "info@omegafitness.com" },
    franchiseNames: ["Anytime Fitness"],
    contactCount: 7,
    unitCount: 120,
    logoFilename: "easy_mile_fitness",
    logoAsset: "omega_fitness.png",
    webEnabled: true,
    linkedinEnabled: true,
    sourceNotes: [
      "Industry coverage reports Rainier-backed Omega Fitness acquired 21 Anytime Fitness locations, growing to roughly 120 clubs."
    ],
    sourceUrls: ["https://joelvanessen.substack.com/p/private-equity-x-franchise-gyms"]
  }
];

const GENERATED_CONTACT_FIRST_NAMES = [
  "Amanda",
  "Brian",
  "Nicole",
  "Robert",
  "Emily",
  "Jason",
  "Lauren",
  "Daniel",
  "Sarah",
  "Matthew",
  "Kelly",
  "Andrew",
  "Rachel",
  "Thomas",
  "Megan"
];

const GENERATED_CONTACT_LAST_NAMES = [
  "Bennett",
  "Carter",
  "Reynolds",
  "Mitchell",
  "Morgan",
  "Hayes",
  "Cooper",
  "Parker",
  "Brooks",
  "Turner",
  "Foster",
  "Harrison",
  "Sullivan",
  "Wallace",
  "Coleman"
];

const GENERATED_CONTACT_TITLES = [
  "Chief Operating Officer",
  "Chief Financial Officer",
  "Chief Development Officer",
  "Managing Director",
  "Regional Vice President",
  "Senior Director of Operations",
  "Director of Franchise Operations",
  "Market Operations Lead",
  "Area Manager",
  "Field Operations Manager"
];

function normalizeOwnerKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getOwnerSlug(value) {
  return String(value || "owner")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function getOwnerDomain(owner) {
  const emailDomain = owner.primaryContact?.email?.split("@")[1];
  return emailDomain || `${getOwnerSlug(owner.ownerName)}.com`;
}

function uniqueBy(items, getKey) {
  const keyedItems = new Map();

  items.forEach((item) => {
    const key = normalizeOwnerKey(getKey(item));
    if (!key || keyedItems.has(key)) return;
    keyedItems.set(key, item);
  });

  return [...keyedItems.values()];
}

function mergeUniqueStrings(...groups) {
  return uniqueBy(groups.flat().filter(Boolean), (value) => value);
}

function getGeneratedPhone(ownerIndex, contactIndex) {
  const areaCodes = ["207", "773", "704", "980", "312", "646", "717", "813"];
  const areaCode = areaCodes[(ownerIndex + contactIndex) % areaCodes.length];
  const prefix = String(555 + ((ownerIndex * 23 + contactIndex * 31) % 350)).padStart(3, "0");
  const line = String(1000 + ((ownerIndex * 167 + contactIndex * 421) % 9000)).padStart(4, "0");

  return `+1 (${areaCode}) ${prefix}-${line}`;
}

function getGeneratedContact(owner, ownerIndex, contactIndex) {
  const firstName = GENERATED_CONTACT_FIRST_NAMES[(ownerIndex * 3 + contactIndex) % GENERATED_CONTACT_FIRST_NAMES.length];
  const lastName = GENERATED_CONTACT_LAST_NAMES[(ownerIndex * 5 + contactIndex) % GENERATED_CONTACT_LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const emailSlug = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");

  return {
    id: `${getOwnerSlug(owner.ownerName)}-contact-${contactIndex + 1}`,
    name,
    title: GENERATED_CONTACT_TITLES[(ownerIndex + contactIndex) % GENERATED_CONTACT_TITLES.length],
    email: `${emailSlug}@${getOwnerDomain(owner)}`,
    phone: getGeneratedPhone(ownerIndex, contactIndex),
    generated: true
  };
}

function getOwnerContacts(owner, ownerIndex) {
  const primaryContact = {
    id: `${getOwnerSlug(owner.ownerName)}-primary-contact`,
    name: owner.primaryContact.name,
    title: owner.primaryContact.title || "Primary Contact",
    email: owner.primaryContact.email,
    phone: owner.primaryContact.phone || getGeneratedPhone(ownerIndex, 0),
    generated: false
  };
  const contactTarget = Math.max(owner.contactCount || 1, 1);
  const contacts = [primaryContact];

  for (let contactIndex = 1; contacts.length < contactTarget; contactIndex += 1) {
    contacts.push(getGeneratedContact(owner, ownerIndex, contactIndex));
  }

  return uniqueBy(contacts, (contact) => contact.email || contact.name);
}

function getDedupedOwnerSeeds(rows) {
  const ownerMap = new Map();

  rows.forEach((row) => {
    const ownerKey = normalizeOwnerKey(row.ownerName);
    const existing = ownerMap.get(ownerKey);

    if (!existing) {
      ownerMap.set(ownerKey, {
        ...row,
        franchiseNames: mergeUniqueStrings(row.franchiseNames || []),
        sourceNotes: uniqueBy(row.sourceNotes || [], (note) => note),
        sourceUrls: uniqueBy(row.sourceUrls || [], (url) => url)
      });
      return;
    }

    ownerMap.set(ownerKey, {
      ...existing,
      contactCount: Math.max(existing.contactCount || 0, row.contactCount || 0),
      unitCount: Math.max(existing.unitCount || 0, row.unitCount || 0),
      webEnabled: Boolean(existing.webEnabled || row.webEnabled),
      linkedinEnabled: Boolean(existing.linkedinEnabled || row.linkedinEnabled),
      franchiseNames: mergeUniqueStrings(existing.franchiseNames || [], row.franchiseNames || []),
      sourceNotes: uniqueBy([...(existing.sourceNotes || []), ...(row.sourceNotes || [])], (note) => note),
      sourceUrls: uniqueBy([...(existing.sourceUrls || []), ...(row.sourceUrls || [])], (url) => url)
    });
  });

  return [...ownerMap.values()];
}

window.ownersData = getDedupedOwnerSeeds(ownerSeedRows).map((owner, index) => {
  const contacts = getOwnerContacts(owner, index);
  const primaryContact = contacts[0];
  const unitCount = owner.unitCount || 0;
  const franchises = mergeUniqueStrings(owner.franchiseNames || []);
  const category = owner.category || "Fitness";

  return {
    ...owner,
    contacts,
    contactCount: Math.max(owner.contactCount || 0, contacts.length),
    unitCount,
    locations: unitCount,
    units: [],
    category,
    categories: [category],
    contactName: primaryContact.name,
    email: primaryContact.email,
    franchise: franchises.join(", "),
    franchises,
    logoSrc: `assets/logos/${owner.logoAsset || `${owner.logoFilename}.jpg`}`,
    logoAlt: `${owner.ownerName} logo`,
    hasWebsite: owner.webEnabled,
    hasLinkedin: owner.linkedinEnabled
  };
});
