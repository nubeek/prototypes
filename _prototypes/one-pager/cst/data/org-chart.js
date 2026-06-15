const ORG_FIRST_NAMES = [
  "Michael",
  "Scott",
  "Christopher",
  "David",
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
  "Megan",
  "Kevin"
];

const ORG_LAST_NAMES = [
  "Fisch",
  "Wolff",
  "Disanto",
  "Maue",
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
  "Coleman",
  "Griffin"
];

const ORG_TITLES = [
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

function getOrgPersonName(ownerIndex, personIndex) {
  const firstName = ORG_FIRST_NAMES[(ownerIndex * 3 + personIndex) % ORG_FIRST_NAMES.length];
  const lastName = ORG_LAST_NAMES[(ownerIndex * 5 + personIndex) % ORG_LAST_NAMES.length];
  return `${firstName} ${lastName}`;
}

function getOrgTitle(ownerIndex, personIndex) {
  return ORG_TITLES[(ownerIndex + personIndex) % ORG_TITLES.length];
}

function createOrgNode(id, name, title, reportsTo, options = {}) {
  return {
    id,
    name,
    title,
    reportsTo,
    ...options
  };
}

function getTopManagementCount(contactCount, ownerIndex) {
  if (contactCount >= 14) return 3;
  if (contactCount >= 8) return 2;
  return 1 + (ownerIndex % 2);
}

function getOwnerOrgContactCount(owner) {
  const contactCount = Number(owner.contactCount);
  if (Number.isFinite(contactCount)) return contactCount;

  if (Array.isArray(owner.contacts)) return owner.contacts.length;

  const legacyContactCount = Number(owner.contacts);
  return Number.isFinite(legacyContactCount) ? legacyContactCount : 1;
}

const UNITED_FP_SCOTT_REPORTS = [
  ["united-res", "B. Christopher DiSantis", "Managing Director at Resources Group", {
    reportCount: 46,
    email: "cdisantis@american-securities.com",
    phone: "(212) 476-8094",
    location: "-"
  }],
  ["united-finance", "David Maue", "Managing Director & COO at Firm Operations", {
    reportCount: 8,
    email: "dmaue@american-securities.com",
    phone: "(212) 476-8074",
    location: "-"
  }],
  ["united-investments", "Aaron Maeng", "Senior Associate at Investment Team", {
    email: "amaeng@american-securities.com",
    phone: "-",
    location: "299 Park Ave, New York, New York, 10171, United States"
  }],
  ["united-adam-caplan", "Adam Caplan", "Senior Associate - Investments"],
  ["united-adam-fields", "Adam Fields", "Senior Associate - Investments"],
  ["united-ben-dickson", "Ben Dickson", "Managing Director - Investments"],
  ["united-brett-roston", "Brett Roston", "Vice President - Investments"],
  ["united-brian-olshanski", "Brian Olshanski", "Senior Associate - Investments"],
  ["united-bruno-camargo", "Bruno Camargo", "Senior Associate - Investments"],
  ["united-connor-wentzell", "Connor Wentzell", "Principal - Investment Team"],
  ["united-craig-sturken", "Craig Sturken", "Vice President - Investments"],
  ["united-darius-vahabzadeh", "Darius Vahabzadeh", "Associate - Investments"],
  ["united-david-horing", "David Horing", "Managing Director - Investments"],
  ["united-david-musicant", "David Musicant", "Managing Director - Investments"],
  ["united-david-portnoy", "David Portnoy", "Principal - Investment Team"],
  ["united-eric-pawela", "Eric Pawela", "Vice President - Investments"],
  ["united-garrick-lombardi", "Garrick Lombardi", "Associate - Investments"],
  ["united-jack-baldwin", "Jack Baldwin", "Associate - Investments"],
  ["united-jack-reinhart", "Jack Reinhart", "Senior Associate - Investments"],
  ["united-james-carmichael", "James Carmichael", "Managing Director - Investments"],
  ["united-katie-jacoby", "Katie Jacoby", "Senior Associate - Investments"],
  ["united-kevin-gotthall", "Kevin Gotthall", "Vice President - Investments"],
  ["united-kevin-penn", "Kevin Penn", "Managing Director - Investments"],
  ["united-kevin-zhou", "Kevin Zhou", "Principal - Investment Team"],
  ["united-lily-deng", "Lily Deng", "Associate - Investments"],
  ["united-mark-lovett", "Mark Lovett", "Managing Director - Investments"],
  ["united-matthew-fishman", "Matthew Fishman", "Managing Director - Investments"],
  ["united-matthew-tucker", "Matthew Tucker", "Associate - Investments"],
  ["united-michael-sand", "Michael Sand", "Managing Director - Investments"],
  ["united-michelle-liu", "Michelle Liu", "Associate - Investments"],
  ["united-natasha-kingshott", "Natasha Kingshott", "Principal - Investment Team"],
  ["united-nick-martin", "Nick Martin", "Vice President - Investments"],
  ["united-nick-schipp", "Nick Schipp", "Associate - Investments"],
  ["united-nikhil-naik", "Nikhil Naik", "Associate - Investments"],
  ["united-noah-scherz", "Noah Scherz", "Principal - Investment Team"],
  ["united-robert-beck", "Robert Beck", "Associate - Investments"],
  ["united-samuel-jong", "Samuel Jong", "Vice President - Investments"],
  ["united-sankalp-panigrahi", "Sankalp Panigrahi", "Associate - Investments"],
  ["united-sidd-bhatt", "Sidd Bhatt", "Vice President - Investments"],
  ["united-will-chan", "Will Chan", "Vice President - Investments"],
  ["united-william-messick", "William Messick", "Associate - Investments"],
  ["united-william-ross", "William Ross", "Associate - Investments"]
];

function getUnitedFpOrgChart(owner) {
  const nodes = [
    createOrgNode("united-ceo", "Michael Fisch", "Founder & CEO", null),
    createOrgNode("united-president", "Scott Wolff", "President & Managing Director", "united-ceo"),
    ...UNITED_FP_SCOTT_REPORTS.map(([id, name, title, options]) => (
      createOrgNode(id, name, title, "united-president", options)
    ))
  ];

  return {
    ownerName: owner.ownerName,
    nodes
  };
}

function getGeneratedOrgChart(owner, ownerIndex) {
  const contactCount = Math.max(1, getOwnerOrgContactCount(owner));
  const topManagementCount = Math.min(contactCount, getTopManagementCount(contactCount, ownerIndex));
  const nodes = [];

  for (let topIndex = 0; topIndex < topManagementCount; topIndex += 1) {
    const isPrimaryContact = topIndex === 0;

    nodes.push(createOrgNode(
      `owner-${ownerIndex}-top-${topIndex}`,
      isPrimaryContact ? owner.contactName : getOrgPersonName(ownerIndex, topIndex),
      topIndex === 0 ? "Chief Executive Officer" : ORG_TITLES[topIndex - 1],
      null
    ));
  }

  for (let personIndex = topManagementCount; personIndex < contactCount; personIndex += 1) {
    const managerIndex = Math.max(0, Math.floor((personIndex - 1) / 3));
    const manager = nodes[managerIndex] || nodes[0];

    nodes.push(createOrgNode(
      `owner-${ownerIndex}-person-${personIndex}`,
      getOrgPersonName(ownerIndex, personIndex + 2),
      getOrgTitle(ownerIndex, personIndex),
      manager.id
    ));
  }

  return {
    ownerName: owner.ownerName,
    nodes
  };
}

window.ownerOrgChartData = (window.ownersData || []).map((owner, ownerIndex) => {
  if (owner.ownerName === "United FP") {
    return getUnitedFpOrgChart(owner);
  }

  return getGeneratedOrgChart(owner, ownerIndex);
});
