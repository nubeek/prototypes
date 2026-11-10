/**
 * Maps raw CST records (window.cstDumpData) onto the shapes the prototype
 * renders: window.ownersData, window.ownerLocationsData and
 * window.ownerOrgChartData.
 *
 * CST data is the default. Load the prototype with ?data=seed to fall back to
 * the hand-seeded roster in data/default/owners.js, which is kept for comparison
 * and as the source of the owner logos reused below.
 *
 * What CST does not supply, and how that is handled here:
 *   - Owner logos: reused from a seeded owner of the same name, otherwise the
 *     table falls back to initials.
 *   - Industry: no such field, so the brands present in the dump are mapped onto
 *     shared category IDs. Unmapped concepts stay categoryId null and flagged
 *     for review instead of becoming Other.
 *   - Unit addresses: coordinates only. Labels come from the reverse-geocode
 *     cache in data/real/place-labels.js.
 *   - Unit brand: the map endpoint has no concept on a point. Multi-brand
 *     owners therefore cycle their concept list across units so map dots can
 *     be coloured by franchise. That assignment is ours, not CST's.
 *   - Contact details below the primary contact: not in the dump at all.
 *   - Reporting lines: many charts are a flat list of titles, and some people
 *     sit beside a tree with no manager. assumeOrgHierarchy fills those gaps
 *     from job titles. A chart that already has one leader is kept as recorded.
 */
(function () {
  const SEED_DATA_SOURCE = "seed";
  const DUMP_DATA_SOURCE = "dump";
  // Our classification, not CST's. Concept names map to shared category IDs.
  const CONCEPTS_BY_CATEGORY = {
    fitness: ["Planet Fitness", "Club Pilates Franchise", "Crunch", "Orangetheory"],
    "health-wellness": ["European Wax Center", "Massage Envy", "Phenix Salon Suites"],
    "youth-enrichment": ["Snapology"],
    "food-beverage": [
      "Popeyes Louisiana Kitchen", "Dunkin'", "Burger King", "Denny's",
      "Pizza Hut Traditional", "Applebee's", "Panera Bread", "IHOP",
      "Jimmy John's", "Taco Bell Traditional", "Buffalo Wild Wings",
      "Jersey Mike's", "Captain D's", "Slim Chicken's", "Five Guys",
      "Dave's Hot Chicken", "Tropical Smoothie Cafe", "Tim Hortons",
      "Firehouse Subs", "McDonald's", "Subway"
    ]
  };

  const CATEGORY_BY_CONCEPT = Object.entries(CONCEPTS_BY_CATEGORY)
    .reduce((result, [category, concepts]) => {
      concepts.forEach((concept) => { result[concept] = category; });
      return result;
    }, {});
  window.cstCategoryByConcept = CATEGORY_BY_CONCEPT;

  function getDataSource() {
    const requested = new URLSearchParams(window.location.search).get("data")
      || window.CST_DATA_SOURCE
      || DUMP_DATA_SOURCE;

    return String(requested).trim().toLowerCase() === SEED_DATA_SOURCE
      ? SEED_DATA_SOURCE
      : DUMP_DATA_SOURCE;
  }

  function normalizeOwnerName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getOwnerLogoSrc(name, seedLogo) {
    if (seedLogo) return seedLogo;
    return window.resolveFranchiseeLogoSrc?.(name) || "";
  }

  function getDisplayWebsite(url) {
    return String(url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }

  // Must stay identical to the key scripts/geocode-cst-places.js writes.
  function getLocationCellKey(lat, lng) {
    return `${lat.toFixed(1)},${lng.toFixed(1)}`;
  }

  // Lower band is more senior. Function is used to tuck a specialist under the
  // one person who already leads that work, instead of hanging everyone off
  // the top of the company.
  function classifyOrgTitle(title) {
    const norm = String(title || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9+ ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const has = (pattern) => pattern.test(norm);
    const empty = !norm;
    let fn = "general";

    if (!empty) {
      if (has(/\b(assistant|chief of staff)\b/)) fn = "admin";
      else if (has(/\b(legal|counsel|attorney|lawyer)\b/)) fn = "legal";
      else if (has(/\b(people|human resource|\bhr\b|talent|recruit)/)) fn = "people";
      else if (has(/\b(finance|financial|cfo|account|payroll|controller|payable)/)) fn = "finance";
      else if (has(/\b(purchas|procurement|supply)/)) fn = "supply";
      else if (has(/\b(information technology|\bit\b|technology|digital)\b/) || has(/\bcto\b/)) fn = "technology";
      else if (has(/\b(real estate|construction|facilities)\b/) || (has(/\bdevelopment\b/) && !has(/\b(leadership|training|culture|talent|people|human)\b/))) fn = "development";
      else if (has(/\b(marketing|commercial|revenue|sales|brand)\b/)) fn = "commercial";
      else if (has(/\b(operat|coach|catering|field)/) || has(/\bmarket\b/)) fn = "ops";
    }

    let band = 16;
    let sub = 10;
    if (empty) {
      band = 15;
      sub = 50;
    } else if (has(/\bfounder\b/) && has(/\bchair/)) {
      band = 0; sub = 0; fn = "governance";
    } else if (has(/\bexecutive chair/)) {
      band = 0; sub = 1; fn = "governance";
    } else if (has(/\b(co founder|cofounder)\b/) && has(/\b(co ceo|ceo|chief executive)\b/)) {
      band = 0; sub = 2; fn = "executive";
    } else if (has(/\bfounder\b/) && has(/\b(ceo|chief executive|president)\b/)) {
      band = 0; sub = 1; fn = "executive";
    } else if (has(/\b(co founder|cofounder|founder)\b/)) {
      band = 0; sub = 3; fn = "governance";
    } else if (has(/\b(chairman|chairwoman|chairperson)\b/) || norm === "chair") {
      band = 0; sub = 4; fn = "governance";
    } else if (has(/\bowner\b/)) {
      band = 0; sub = 5; fn = "governance";
    } else if (has(/\bboard\b/)) {
      band = 1; sub = 0; fn = "governance";
    } else if (has(/\b(chief executive|co ceo)\b/) || has(/\bceo\b/)) {
      band = 2; sub = has(/\bco ceo\b/) ? 1 : 0; fn = "executive";
    } else if (has(/\bfranchisee\b/)) {
      band = 2; sub = 5; fn = "governance";
    } else if (has(/\bpresident\b/) && !has(/\bvice\b/)) {
      band = 3; sub = has(/\bbrand\b/) ? 2 : 0; fn = has(/\boperat/) ? "ops" : "executive";
    } else if (has(/\bcoo\b/) || has(/\bchief operating\b/)) {
      band = 4; sub = 0; fn = "ops";
    } else if (has(/\bcfo\b/) || has(/\bchief financial\b/)) {
      band = 4; sub = 1; fn = "finance";
    } else if (has(/\bclo\b/) || has(/\bchief legal\b/) || has(/\bgeneral counsel\b/)) {
      band = 4; sub = 2; fn = "legal";
    } else if (has(/\bchief people\b/) || has(/\bchief human\b/)) {
      band = 4; sub = 3; fn = "people";
    } else if (has(/\bchief (commercial|revenue|marketing)\b/)) {
      band = 4; sub = 4; fn = "commercial";
    } else if (has(/\bchief development\b/)) {
      band = 4; sub = 4; fn = "development";
    } else if (has(/\bcto\b/) || has(/\bchief technology\b/)) {
      band = 4; sub = 5; fn = "technology";
    } else if (has(/\bchief \b/)) {
      band = 4; sub = 6; if (fn === "general") fn = "executive";
    } else if (has(/\bmanaging partner\b/)) {
      band = 3; sub = 4; if (fn === "general") fn = "executive";
    } else if (has(/\bmanaging director\b/)) {
      band = 5; sub = 0; if (fn === "general") fn = "ops";
    } else if (has(/\bpartner\b/)) {
      band = 5; sub = 2; if (fn === "general") fn = "executive";
    } else if (has(/\bexecutive vice\b/) || has(/\bevp\b/)) {
      band = 6; sub = 0;
    } else if (has(/\bsenior vice\b/) || has(/\bsvp\b/)) {
      band = 7; sub = 0;
    } else if (has(/\bvice president\b/) || has(/\bvp\b/)) {
      band = 8; sub = 0;
    } else if (has(/\bhead\b/) && has(/\bassistant\b/)) {
      band = 9; sub = 5; fn = "admin";
    } else if (has(/\b(senior director|sr director|head of)\b/)) {
      band = 9; sub = 0;
    } else if (has(/\bdirector\b/)) {
      band = 10; sub = 0;
    } else if (has(/\bcontroller\b/)) {
      band = 11; sub = 0; fn = "finance";
    } else if (norm === "accountant") {
      band = 11; sub = 1; fn = "finance";
    } else if (has(/\b(manager|coach)\b/)) {
      band = 12; sub = 0;
    } else if (has(/\baccountant\b/)) {
      band = 13; sub = 0; fn = "finance";
    } else if (has(/\b(assistant|buyer|analyst|coordinator|specialist|associate)\b/)) {
      band = 14; sub = 0;
    } else {
      band = 13;
    }

    return { band, sub, fn };
  }

  function isMoreSeniorOrgRank(left, right) {
    return left.band < right.band || (left.band === right.band && left.sub < right.sub);
  }

  function compareOrgRank(left, right) {
    return left.band - right.band || left.sub - right.sub || left.index - right.index;
  }

  function mostSeniorOrgPerson(people) {
    return people.slice().sort(compareOrgRank)[0];
  }

  function nearestOrgPerson(people) {
    return people.slice().sort((left, right) => right.band - left.band || right.sub - left.sub || left.index - right.index)[0];
  }

  function uniqueNearestOrgPerson(people) {
    if (!people.length) return null;
    const closest = nearestOrgPerson(people);
    const tied = people.filter((person) => person.band === closest.band && person.sub === closest.sub);
    return tied.length === 1 ? closest : null;
  }

  function countOrgTree(nodes) {
    return (nodes || []).reduce((total, node) => total + 1 + countOrgTree(node.children), 0);
  }

  function scoreOrgNodes(nodes) {
    return nodes.map((node, index) => ({
      node,
      index,
      ...classifyOrgTitle(node.title)
    }));
  }

  // Used when nobody has a manager yet. Same-function work nests (a payroll
  // manager under the accountant, a market coach under the managing director).
  // Everyone else reports to the operating lead, or to the chair when the
  // company has no chief executive.
  function pickOrgManager(person, candidates) {
    const seniors = candidates.filter((item) => item !== person && isMoreSeniorOrgRank(item, person));
    if (!seniors.length) return null;

    if (!["general", "governance", "admin", "executive"].includes(person.fn)) {
      const lead = uniqueNearestOrgPerson(seniors.filter((item) => item.fn === person.fn));
      if (lead) return lead;
    }

    if (person.fn === "admin") {
      const executives = seniors.filter((item) => item.fn === "executive" || (item.fn === "ops" && item.band <= 4));
      return executives.length ? mostSeniorOrgPerson(executives) : mostSeniorOrgPerson(seniors);
    }

    const operating = seniors.filter((item) => item.fn === "executive" || (item.fn === "ops" && item.band <= 4));
    if (operating.length && person.fn !== "governance") return mostSeniorOrgPerson(operating);

    const governance = seniors.filter((item) => item.fn === "governance");
    if (governance.length && (person.fn === "executive" || person.fn === "ops")) return nearestOrgPerson(governance);
    if (person.fn === "governance" && governance.length) return mostSeniorOrgPerson(governance);

    const leaders = seniors.filter((item) => item.band <= 10);
    if (leaders.length) return nearestOrgPerson(leaders);
    const managers = seniors.filter((item) => item.band <= 12);
    if (managers.length) return nearestOrgPerson(managers);
    return mostSeniorOrgPerson(seniors);
  }

  function linkFlatOrgChart(nodes, preferredKey) {
    const scored = scoreOrgNodes(nodes);
    scored.forEach((person) => {
      person.manager = pickOrgManager(person, scored);
    });

    const roots = scored.filter((person) => !person.manager);
    if (roots.length > 1) {
      const preferred = (person) => person.node.key === preferredKey ? 0 : 1;
      const lead = roots.slice().sort((left, right) => (
        left.band - right.band || left.sub - right.sub || preferred(left) - preferred(right) || left.index - right.index
      ))[0];
      roots.forEach((person) => {
        if (person !== lead) person.manager = lead;
      });
    }

    const built = new Set();
    function build(person) {
      if (built.has(person)) return { ...person.node, children: [] };
      built.add(person);
      const children = scored
        .filter((item) => item.manager === person)
        .sort(compareOrgRank);
      return {
        ...person.node,
        children: children.map(build)
      };
    }

    return scored.filter((person) => !person.manager).map(build);
  }

  // A chart that already has managers keeps those links. People left beside
  // the tree are attached to its leader. A disconnected founder, owner, or
  // chair is placed above that leader. A board seat is not.
  function linkDisconnectedOrgRoots(nodes, preferredKey) {
    const scored = scoreOrgNodes(nodes).map((person) => ({
      ...person,
      size: countOrgTree([person.node])
    }));
    const withChildren = scored.filter((person) => person.size > 1);
    const pool = withChildren.length ? withChildren : scored;
    const preferred = (person) => person.node.key === preferredKey ? 0 : 1;
    const anchor = pool.slice().sort((left, right) => (
      left.band - right.band
      || left.sub - right.sub
      || right.size - left.size
      || preferred(left) - preferred(right)
      || left.index - right.index
    ))[0];
    const promoter = scored
      .filter((person) => person !== anchor && person.band < anchor.band && person.band <= 0)
      .sort(compareOrgRank)[0];
    const root = promoter || anchor;
    const attached = (promoter
      ? [anchor, ...scored.filter((person) => person !== anchor && person !== promoter)]
      : scored.filter((person) => person !== anchor)
    ).sort(compareOrgRank);

    return [{
      ...root.node,
      children: [...(root.node.children || []), ...attached.map((person) => person.node)]
    }];
  }

  function assumeOrgHierarchy(nodes, preferredKey) {
    if (!nodes || nodes.length <= 1) return nodes || [];
    const flat = nodes.every((node) => !node.children || node.children.length === 0);
    return flat ? linkFlatOrgChart(nodes, preferredKey) : linkDisconnectedOrgRoots(nodes, preferredKey);
  }

  function flattenOrgChart(nodes, publicId, reportsTo, flattened) {
    (nodes || []).forEach((node) => {
      const id = `${publicId}-${node.key}`;
      flattened.push({
        id,
        name: node.name,
        title: node.title,
        reportsTo,
        ...(node.email ? { email: node.email } : {}),
        ...(node.phone ? { phone: node.phone } : {})
      });
      flattenOrgChart(node.children, publicId, id, flattened);
    });

    return flattened;
  }

  // CST only ships an email and phone for the group's primary contact. Everyone
  // else keeps those keys absent so the existing generated fallbacks apply.
  //
  // Location is different: CST places nobody, and the prototype would otherwise
  // hand each person a real city drawn from the owner's unit footprint. Real
  // place names make an invented posting look verified, so it is declared
  // unknown instead.
  function buildOrgNodes(dumpOwner) {
    const contact = dumpOwner.contact;
    const primaryNodeId = contact?.orgKey ? `${dumpOwner.publicId}-${contact.orgKey}` : null;
    const orgChart = assumeOrgHierarchy(dumpOwner.orgChart, contact?.orgKey || "");

    return flattenOrgChart(orgChart, dumpOwner.publicId, null, []).map((node) => {
      const isPrimary = Boolean(contact) && (node.id === primaryNodeId || node.name === contact.name);
      const located = { ...node, location: "" };
      if (!isPrimary) return located;

      return {
        ...located,
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone ? { phone: contact.phone } : {})
      };
    });
  }

  function buildContacts(orgNodes) {
    const contacts = orgNodes.map((node) => ({
      id: node.id,
      name: node.name,
      title: node.title || "Contact",
      email: node.email || "",
      phone: node.phone || "",
      generated: false
    }));
    const primaryIndex = contacts.findIndex((contact) => contact.email);
    if (primaryIndex <= 0) return contacts;

    return [contacts[primaryIndex], ...contacts.filter((_, index) => index !== primaryIndex)];
  }

  function buildUnits(dumpOwner, franchises, categoryId) {
    const locations = window.cstDumpLocations || {};

    return (dumpOwner.units || []).map(([lat, lng, cstUnitId, unitLabel], unitIndex) => {
      // CST points have no concept. Cycle the owner's brands so each unit can
      // hold one franchise colour on the map. Owner-level filters still read
      // the full `franchises` list.
      const franchise = franchises.length
        ? franchises[unitIndex % franchises.length]
        : "";
      const color = typeof getFranchiseAccentColor === "function"
        ? getFranchiseAccentColor(franchise)
        : undefined;

      return {
        id: `${dumpOwner.publicId}-unit-${cstUnitId ?? unitIndex}`,
        cstUnitId,
        // No unit-level contact or address exists in the dump.
        name: "",
        email: "",
        phone: "",
        franchise,
        franchises,
        color,
        categoryId,
        lat,
        lng,
        label: unitLabel || locations[getLocationCellKey(lat, lng)] || ""
      };
    });
  }

  function buildOwner(dumpOwner, seedLogosByName) {
    const franchises = (dumpOwner.concepts || []).map((concept) => concept.name).filter(Boolean);
    const resolved = franchises.map((franchise) => {
      const categoryId = CATEGORY_BY_CONCEPT[franchise] || null;
      return {
        franchise,
        categoryId,
        unresolved: !categoryId
      };
    });
    const categoryIds = [...new Set(resolved.map((item) => item.categoryId).filter(Boolean))];
    const unresolvedConcepts = resolved.filter((item) => item.unresolved).map((item) => item.franchise);
    const categoryId = categoryIds[0] || null;
    const categoryNeedsReview = unresolvedConcepts.length > 0;
    const orgNodes = buildOrgNodes(dumpOwner);
    const contacts = buildContacts(orgNodes);
    const unitCount = Number.isFinite(dumpOwner.unitsCount)
      ? dumpOwner.unitsCount
      : (dumpOwner.units || []).length;
    const units = buildUnits(dumpOwner, franchises, categoryId);
    const seedLogo = seedLogosByName.get(normalizeOwnerName(dumpOwner.name));

    return {
      owner: {
        ownerName: dumpOwner.name,
        cstPublicId: dumpOwner.publicId,
        cstGroupCode: dumpOwner.groupCode,
        cstSource: DUMP_DATA_SOURCE,
        contactName: dumpOwner.contact?.name || dumpOwner.name,
        email: dumpOwner.contact?.email || "",
        contacts,
        contactCount: Number.isFinite(dumpOwner.contactsCount)
          ? dumpOwner.contactsCount
          : contacts.length,
        unitCount,
        locations: unitCount,
        units,
        categoryId,
        categoryIds,
        ...(categoryNeedsReview
          ? { categoryOriginal: unresolvedConcepts.join(", "), categoryNeedsReview: true }
          : {}),
        franchise: franchises.join(", "),
        franchises,
        logoSrc: getOwnerLogoSrc(dumpOwner.name, seedLogo),
        logoAlt: `${dumpOwner.name} logo`,
        website: getDisplayWebsite(dumpOwner.website),
        websiteUrl: dumpOwner.website || "",
        linkedinUrl: dumpOwner.linkedinUrl || "",
        hasWebsite: Boolean(dumpOwner.website),
        hasLinkedin: Boolean(dumpOwner.linkedinUrl)
      },
      locationData: {
        ownerName: dumpOwner.name,
        locations: units,
        units
      },
      orgChart: {
        ownerName: dumpOwner.name,
        nodes: orgNodes
      }
    };
  }

  function replaceRoster(dumpData) {
    const seedLogosByName = new Map(
      (window.ownersData || [])
        .filter((owner) => owner.logoSrc)
        .map((owner) => [normalizeOwnerName(owner.ownerName), owner.logoSrc])
    );
    const built = (dumpData.owners || []).map((dumpOwner) => buildOwner(dumpOwner, seedLogosByName));

    window.ownersData = built.map((entry) => entry.owner);
    window.ownerLocationsData = built.map((entry) => entry.locationData);
    window.ownerOrgChartData = built.map((entry) => entry.orgChart);

    const unresolvedConcepts = [...new Set(
      built.flatMap((entry) => (
        entry.owner.categoryNeedsReview
          ? String(entry.owner.categoryOriginal || "").split(", ").filter(Boolean)
          : []
      ))
    )].sort((left, right) => left.localeCompare(right));

    return {
      ownerCount: built.length,
      unitCount: built.reduce((total, entry) => total + entry.locationData.units.length, 0),
      reusedLogoCount: built.filter((entry) => (
        seedLogosByName.has(normalizeOwnerName(entry.owner.ownerName))
      )).length,
      multiBrandOwnerCount: built.filter((entry) => entry.owner.franchises.length > 1).length,
      brandCount: new Set(built.flatMap((entry) => entry.owner.franchises)).size,
      labelledUnitCount: built.reduce((total, entry) => (
        total + entry.locationData.units.filter((unit) => unit.label).length
      ), 0),
      reviewOwnerCount: built.filter((entry) => entry.owner.categoryNeedsReview).length,
      unresolvedConceptCount: unresolvedConcepts.length,
      unresolvedConcepts
    };
  }

  function registerDumpFranchiseProfiles(dumpData) {
    if (typeof registerFranchiseWefranchProfile !== "function") return;

    (dumpData.owners || []).forEach((owner) => {
      (owner.concepts || []).forEach((concept) => {
        registerFranchiseWefranchProfile(concept.name, concept.publicId, concept.slug);
      });
    });
  }

  const dataSource = getDataSource();
  window.cstDataSource = dataSource;

  const dumpData = window.cstDumpData;
  if (dumpData?.owners?.length) {
    registerDumpFranchiseProfiles(dumpData);
  }

  if (dataSource !== DUMP_DATA_SOURCE) return;

  if (!dumpData?.owners?.length) {
    console.warn("[cst] window.cstDumpData is empty, falling back to seeded owners. Run scripts/build-cst-data.js.");
    window.cstDataSource = SEED_DATA_SOURCE;
    return;
  }

  const stats = replaceRoster(dumpData);

  window.cstDumpOverlay = { dataSource, generatedAt: dumpData.generatedAt, ...stats };
  if (stats.unresolvedConceptCount) {
    console.warn(
      `[cst] ${stats.unresolvedConceptCount} dump concepts need category review`,
      stats.unresolvedConcepts
    );
  }
}());
