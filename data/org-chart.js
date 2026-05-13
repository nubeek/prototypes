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

function createOrgNode(id, name, title, reportsTo) {
  return {
    id,
    name,
    title,
    reportsTo
  };
}

function getTopManagementCount(contactCount, ownerIndex) {
  if (contactCount >= 14) return 3;
  if (contactCount >= 8) return 2;
  return 1 + (ownerIndex % 2);
}

function getUnitedFpOrgChart(owner) {
  const contactCount = Math.max(1, owner.contacts || 1);
  const nodes = [
    createOrgNode("united-ceo", "Michael Fisch", "Founder & CEO", null),
    createOrgNode("united-president", "Scott Wolff", "President & Managing Director", "united-ceo"),
    createOrgNode("united-res", "B. Christopher Disanto", "Managing Director - Restaurant Operations", "united-president"),
    createOrgNode("united-finance", "David Maue", "Managing Director & Chief Financial Officer", "united-president"),
    createOrgNode("united-investments", "Aaron Maeng", "Managing Director - Investments", "united-president"),
    createOrgNode("united-associate-1", "Adam Caplan", "Senior Associate - Investments", "united-investments"),
    createOrgNode("united-associate-2", "Adam Fields", "Senior Associate - Investments", "united-investments"),
    createOrgNode("united-director", "Benjamin Dickson", "Managing Director - Investments", "united-investments"),
    createOrgNode("united-ops-1", "Amanda Bennett", "Director of Franchise Operations", "united-res"),
    createOrgNode("united-ops-2", "Brian Carter", "Regional Vice President", "united-res"),
    createOrgNode("united-controller", "Nicole Reynolds", "Controller", "united-finance"),
    createOrgNode("united-analyst", "Robert Mitchell", "Financial Planning Lead", "united-finance"),
    createOrgNode("united-market-1", "Emily Morgan", "Market Operations Lead", "united-ops-1"),
    createOrgNode("united-market-2", "Jason Hayes", "Field Operations Manager", "united-ops-2"),
    createOrgNode("united-market-3", "Lauren Cooper", "Area Manager", "united-director")
  ];

  return {
    ownerName: owner.ownerName,
    nodes: nodes.slice(0, contactCount)
  };
}

function getGeneratedOrgChart(owner, ownerIndex) {
  const contactCount = Math.max(1, owner.contacts || 1);
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
  if (owner.ownerName === "United FP" && ownerIndex === 0) {
    return getUnitedFpOrgChart(owner);
  }

  return getGeneratedOrgChart(owner, ownerIndex);
});
