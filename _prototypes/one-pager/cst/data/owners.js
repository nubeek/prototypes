const ownerSeedRows = [
  {
    ownerName: "Planet Fitness Corporate",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 281,
    logoFilename: "planet-fitness-corporate",
    webEnabled: true,
    linkedinEnabled: false
  },
  {
    ownerName: "Argonne Capital",
    primaryContact: { name: "Michael A. Klump", email: "-" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 14,
    unitCount: 209,
    logoFilename: "argonne-capital",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "United FP",
    primaryContact: { name: "Michael Fisch", email: "(212) 476 - 8051", phone: "+1 (212) 476-8051" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 107,
    unitCount: 196,
    logoFilename: "united-fp",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Trilantic Capital Management",
    primaryContact: { name: "Danny James", email: "daniel.james@trilanticpartners.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 41,
    unitCount: 189,
    logoFilename: "trilantic-capital-management",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Olympus Partners",
    primaryContact: { name: "Rob Morris", email: "LinkedIn" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 26,
    unitCount: 179,
    logoFilename: "olympus-partners",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Towerbrook",
    primaryContact: { name: "Neal Moszkowski", email: "-" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 149,
    unitCount: 139,
    logoFilename: "towerbrook",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Black Duck Partners",
    primaryContact: { name: "Mike Dobrynio", email: "mdobrynio@yahoo.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 18,
    unitCount: 134,
    logoFilename: "black-duck-partners",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Baseline Mayfair",
    primaryContact: { name: "Scott Majkrzak", email: "LinkedIn" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 4,
    unitCount: 130,
    logoFilename: "baseline-mayfair",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Pinnacle",
    primaryContact: { name: "Michael Chae", email: "-" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 203,
    unitCount: 108,
    logoFilename: "pinnacle",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Brick",
    primaryContact: { name: "Lynne Brick", email: "LinkedIn" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 16,
    unitCount: 99,
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Grand Fitness",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 98,
    logoAsset: "grand-fitness-partners.png",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "York Capital Mgmt",
    primaryContact: { name: "Zalmie Jacobs", email: "-" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 13,
    unitCount: 97,
    logoFilename: "york-capital-management",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "SBJ",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: 18,
    unitCount: 88,
    logoFilename: "sbj",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Easy Mile Fitness",
    primaryContact: { name: "Peter Amato", email: "peter@easymilefitness.com" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 9,
    unitCount: 74,
    logoFilename: "easy-mile-fitness",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Epicfitness",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 69,
    logoFilename: "epic-fitness",
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Morgan Stanley",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 57,
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Clancy/Hamilton",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 56,
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Sanders/Evans",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 53,
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Fitness Para Todos",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 49,
    webEnabled: true,
    linkedinEnabled: true
  },
  {
    ownerName: "Kueber",
    primaryContact: null,
    franchiseNames: ["Planet Fitness"],
    contactCount: null,
    unitCount: 47,
    webEnabled: false,
    linkedinEnabled: true
  },
  {
    ownerName: "Flynn Fitness",
    primaryContact: { name: "Stanley DeMartinis Jr.", email: "LinkedIn" },
    franchiseNames: ["Planet Fitness"],
    contactCount: 8,
    unitCount: 43,
    logoFilename: "flynn-fitness",
    webEnabled: true,
    linkedinEnabled: true
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
  const hasPrimaryContact = Boolean(owner.primaryContact?.name);
  const contactTarget = Number.isFinite(Number(owner.contactCount))
    ? Math.max(Number(owner.contactCount), 0)
    : 0;
  const contacts = hasPrimaryContact
    ? [{
      id: `${getOwnerSlug(owner.ownerName)}-primary-contact`,
      name: owner.primaryContact.name,
      title: owner.primaryContact.title || "Primary Contact",
      email: owner.primaryContact.email || "",
      phone: owner.primaryContact.phone || getGeneratedPhone(ownerIndex, 0),
      generated: false
    }]
    : [];

  for (let contactIndex = contacts.length; contacts.length < contactTarget; contactIndex += 1) {
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
  const hasPrimaryContact = Boolean(owner.primaryContact?.name);
  const primaryContact = hasPrimaryContact ? contacts.find((contact) => !contact.generated) || contacts[0] : null;
  const contactCount = Number.isFinite(Number(owner.contactCount)) ? Number(owner.contactCount) : null;
  const unitCount = owner.unitCount || 0;
  const franchises = mergeUniqueStrings(owner.franchiseNames || []);
  const category = owner.category || "Fitness";
  const logoAsset = owner.logoAsset || (owner.logoFilename ? `${owner.logoFilename}.jpg` : "");

  return {
    ...owner,
    contacts,
    contactCount,
    unitCount,
    locations: unitCount,
    units: [],
    category,
    categories: [category],
    contactName: primaryContact?.name || "-",
    email: primaryContact?.email || "-",
    hasPrimaryContact,
    franchise: franchises.join(", "),
    franchises,
    logoSrc: logoAsset ? `../../../assets/logos/franchisees/${logoAsset}` : "",
    logoAlt: `${owner.ownerName} logo`,
    hasWebsite: owner.webEnabled,
    hasLinkedin: owner.linkedinEnabled
  };
});
