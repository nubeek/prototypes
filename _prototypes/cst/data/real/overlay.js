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
 *     the category names the filter already offers. That mapping is ours.
 *   - Unit addresses: coordinates only. Labels come from the reverse-geocode
 *     cache in data/real/place-labels.js.
 *   - Unit brand: the map endpoint has no concept on a point. Multi-brand
 *     owners therefore cycle their concept list across units so map dots can
 *     be coloured by franchise. That assignment is ours, not CST's.
 *   - Contact details below the primary contact: not in the dump at all.
 */
(function () {
  const SEED_DATA_SOURCE = "seed";
  const DUMP_DATA_SOURCE = "dump";
  const UNKNOWN_CATEGORY = "Other";

  // Our classification, not CST's. Categories match the fixed list the filter in
  // scripts/09-bootstrap.js builds, so dump owners stay filterable.
  const CONCEPTS_BY_CATEGORY = {
    Fitness: ["Planet Fitness", "Club Pilates Franchise", "Crunch", "Orangetheory"],
    "Health & Wellness": ["European Wax Center", "Massage Envy", "Phenix Salon Suites"],
    "Food and Beverage": [
      "Popeyes Louisiana Kitchen", "Dunkin'", "Burger King", "Denny's",
      "Pizza Hut Traditional", "Applebee's", "Panera Bread", "IHOP",
      "Jimmy John's", "Taco Bell Traditional", "Buffalo Wild Wings",
      "Jersey Mike's", "Captain D's", "Slim Chicken's", "Five Guys",
      "Dave's Hot Chicken", "Tropical Smoothie Cafe", "Tim Hortons",
      "Firehouse Subs", "McDonald's"
    ]
  };

  const CATEGORY_BY_CONCEPT = Object.entries(CONCEPTS_BY_CATEGORY)
    .reduce((result, [category, concepts]) => {
      concepts.forEach((concept) => { result[concept] = category; });
      return result;
    }, {});

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

  function getOwnerLogoSlug(name) {
    return String(name || "owner")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Filenames in assets/logos/. New owner marks are PNGs; a few seed marks
  // are still JPG. The lookup below picks the real extension so the table
  // does not request a .jpg that was saved as .png.
  const OWNER_LOGO_FILES = [
    "aligned-fitness-holdings.png",
    "ambrosia-qsr.png",
    "american-west.png",
    "applegreen.png",
    "aramark-services-inc.png",
    "argonne-capital.jpg",
    "artemis-wax.png",
    "atticus-franchise-group.png",
    "aurify-kingstar.png",
    "b-and-g-food-enterprises-llc.png",
    "bandon-holdings.png",
    "baseline-mayfair.jpg",
    "black-duck-partners.jpg",
    "bluemont-group-llc.png",
    "chaac-foods-restaurants.png",
    "chenega-corporation.png",
    "chunara-group-of-companies.png",
    "continental-superior-management-group.png",
    "cr-fitness-holdings.png",
    "denco-enterprises-inc.png",
    "devs-foods.png",
    "dhanani-group.png",
    "doherty-enterprises.png",
    "dyne-hospitality-group.png",
    "easy-mile-fitness.jpg",
    "epic-fitness.jpg",
    "excel-fitness-holdings.png",
    "fitness-ventures-llc.png",
    "flynn-group.jpg",
    "gps-hospitality.png",
    "grand-fitness-partners.png",
    "hamra-enterprises.png",
    "international-restaurant-management-group.png",
    "janjer-enterprises-inc.png",
    "k-mac-enterprises-inc.png",
    "mbn-brands.png",
    "national-fitness-partners.png",
    "north-american-wax-company.png",
    "ohana-growth-partners.jpg",
    "olympus-partners.jpg",
    "omega-fitness.png",
    "pacific-bells.png",
    "pcrk-group.png",
    "pinnacle.jpg",
    "planet-fitness-corporate.jpg",
    "premium-loaves.png",
    "princess-street-partners.png",
    "quality-brand-group.png",
    "rackson-restaurants-llc.png",
    "riser-fitness.png",
    "romulus-restaurants-l-l-c.png",
    "sailormen.png",
    "sbj.jpg",
    "srg-plk.png",
    "sizzling-platter.png",
    "southpaw.png",
    "sscp-management.png",
    "sun-holdings.png",
    "sunshine-restaurant-partners.png",
    "ta-operating-llc.png",
    "taymax-group.png",
    "team-lyders.png",
    "team-schostak-family-restaurants.png",
    "the-phoenix-organization.png",
    "the-rose-group.png",
    "the-wolak-group.png",
    "tomey-group-llc.png",
    "towerbrook.jpg",
    "trilantic-capital-management.jpg",
    "united-fp.jpg",
    "wks-restaurant-group.png",
    "york-capital-management.jpg"
  ];
  const OWNER_LOGO_FILE_BY_SLUG = Object.fromEntries(
    OWNER_LOGO_FILES.map((file) => [file.replace(/\.[^.]+$/, ""), file])
  );
  // Shortened filenames that do not survive suffix/prefix matching.
  const OWNER_LOGO_ALIASES = {
    "american-west-restaurant-group": "american-west.png",
    "continental-superior-management-groups-l-p": "continental-superior-management-group.png",
    "srg-plk-opco-llc": "srg-plk.png"
  };
  const OWNER_LOGO_LEGAL_SUFFIX = /-(inc|llc|l-l-c|l-p|corp|corporation)$/;

  function resolveOwnerLogoFile(slug) {
    if (OWNER_LOGO_ALIASES[slug]) return OWNER_LOGO_ALIASES[slug];
    if (OWNER_LOGO_FILE_BY_SLUG[slug]) return OWNER_LOGO_FILE_BY_SLUG[slug];

    let stripped = slug;
    while (OWNER_LOGO_LEGAL_SUFFIX.test(stripped)) {
      stripped = stripped.replace(OWNER_LOGO_LEGAL_SUFFIX, "");
      if (OWNER_LOGO_FILE_BY_SLUG[stripped]) return OWNER_LOGO_FILE_BY_SLUG[stripped];
    }

    return Object.entries(OWNER_LOGO_FILE_BY_SLUG)
      .filter(([stem]) => slug.startsWith(`${stem}-`) || stem.startsWith(`${slug}-`))
      .sort((left, right) => right[0].length - left[0].length)[0]?.[1]
      || null;
  }

  function getOwnerLogoSrc(name, seedLogo) {
    if (seedLogo) return seedLogo;
    const slug = getOwnerLogoSlug(name);
    const file = resolveOwnerLogoFile(slug);
    // Missing marks default to .png so a newly dropped file is requested
    // under the name the overlay already uses in the table.
    return `assets/logos/${file || `${slug}.png`}`;
  }

  function getDisplayWebsite(url) {
    return String(url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }

  // Must stay identical to the key scripts/geocode-cst-places.js writes.
  function getLocationCellKey(lat, lng) {
    return `${lat.toFixed(1)},${lng.toFixed(1)}`;
  }

  function flattenOrgChart(nodes, publicId, reportsTo, flattened) {
    (nodes || []).forEach((node) => {
      const id = `${publicId}-${node.key}`;
      flattened.push({ id, name: node.name, title: node.title, reportsTo });
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

    return flattenOrgChart(dumpOwner.orgChart, dumpOwner.publicId, null, []).map((node) => {
      const isPrimary = Boolean(contact) && (node.id === primaryNodeId || node.name === contact.name);
      const located = { ...node, location: "" };
      if (!isPrimary) return located;

      return { ...located, email: contact.email || "", phone: contact.phone || "" };
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

  function buildUnits(dumpOwner, franchises, category) {
    const locations = window.cstDumpLocations || {};

    return (dumpOwner.units || []).map(([lat, lng, cstUnitId], unitIndex) => {
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
        category,
        lat,
        lng,
        label: locations[getLocationCellKey(lat, lng)] || ""
      };
    });
  }

  function buildOwner(dumpOwner, seedLogosByName) {
    const franchises = (dumpOwner.concepts || []).map((concept) => concept.name).filter(Boolean);
    const categories = [...new Set(
      franchises.map((franchise) => CATEGORY_BY_CONCEPT[franchise] || UNKNOWN_CATEGORY)
    )];
    const category = categories[0] || UNKNOWN_CATEGORY;
    const orgNodes = buildOrgNodes(dumpOwner);
    const contacts = buildContacts(orgNodes);
    const unitCount = Number.isFinite(dumpOwner.unitsCount)
      ? dumpOwner.unitsCount
      : (dumpOwner.units || []).length;
    const units = buildUnits(dumpOwner, franchises, category);
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
        category,
        categories,
        franchise: franchises.join(", "),
        franchises,
        // Unmatched owners point at a logo that does not exist, which is what
        // triggers the initials fallback baked into the table markup.
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
      ), 0)
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
  console.info(
    `[cst] CST roster: ${stats.ownerCount} owners, ${stats.unitCount} units, `
    + `${stats.labelledUnitCount} units with a location label, `
    + `${stats.multiBrandOwnerCount} multi-brand owners, ${stats.reusedLogoCount} logos reused`
  );
}());
