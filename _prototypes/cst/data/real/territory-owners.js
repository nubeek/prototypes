// Hand-maintained, unlike data/real/owners.js. Owners of Established
// territories on the Territories map, loaded by both prototypes:
//   - Prospects (CST): appended to window.cstDumpData.owners before
//     data/real/overlay.js maps the roster, so they get a profile and org chart.
//   - Territories: read through window.territoryOwnersByTerritoryKey to fill the
//     Owner section of the territory info card.
// Load after data/real/place-labels.js, which replaces window.cstDumpLocations.
//
// Records use the CST API field names from data/real/owners.js, plus:
//   - locations: franchise locations, which become the owner's unit points and
//     place labels on the Prospects map.
//   - territories: Territories records this owner is shown on, by brand id and
//     geoKey (the keys in territories/data/real/<brand>.json). One owner per
//     territory; an owner with no entry here still appears in Prospects.
//   - research: where the match and the contact details came from. Not rendered.
//
// Source: Snapology franchisee research CSV (2026-09-30), backed by the FDD as
// of 2025-12-31. Every territory match below is unverified against the exact
// territory boundary; see research.matchStatus and research.notes.
//
// Contact emails and phones are only ones published for that franchise
// (research.contactSources). Most are the location inbox, not a personal
// address. Pattern guesses from email-format sites are deliberately not used;
// leave email empty when nothing is published.
const SNAPOLOGY_FDD_URL = "https://pdfindx-51ec5d045801.herokuapp.com/get_pdf/UQhF5hgeUQhF5hgeUQhF5hge";

window.territoryOwnersData = [
  {
    publicId: "snap-az-jteam",
    name: "AZ JTeam Incorporated",
    website: "https://www.snapology.com/arizona-gilbert/",
    contact: {
      name: "",
      title: "",
      email: "gilbert@snapology.com",
      phone: "480-997-1724",
      linkedinUrl: "",
      orgKey: ""
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [],
    locations: [{ label: "Gilbert, Arizona", lat: 33.3528, lng: -111.789 }],
    territories: [{ brandId: "snapology", geoKey: "place:0455000" }],
    research: {
      matchStatus: "nearby_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "FDD confirms Gilbert franchisee. Ownership of the Phoenix territory shown is not established.",
      sources: [SNAPOLOGY_FDD_URL, "https://www.snapology.com/regions/phoenix/"],
      contactSources: {
        email: "https://phoenix.kidsoutandabout.com/content/snapology-gilbert",
        phone: "https://www.snapology.com/regions/phoenix/"
      }
    }
  },
  {
    publicId: "snap-van-der-byl-ventures",
    name: "Van der Byl Ventures, LLC",
    website: "https://www.snapology.com/california-solana-beach/",
    contact: {
      name: "Neil van der Byl",
      title: "Owner and CEO",
      email: "neilv@snapology.com",
      phone: "858-356-4224",
      linkedinUrl: "https://www.linkedin.com/in/neil-van-der-byl-b35b797",
      orgKey: "neil-van-der-byl"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "neil-van-der-byl", name: "Neil van der Byl", title: "Owner and CEO", children: [] }
    ],
    locations: [{ label: "Solana Beach, California", lat: 32.9912, lng: -117.2711 }],
    territories: [{ brandId: "snapology", geoKey: "place:0666000" }],
    research: {
      matchStatus: "regional_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "FDD confirms Solana Beach franchisee. Exact territory match is unverified. Individual role appears in public profile data.",
      sources: [
        SNAPOLOGY_FDD_URL,
        "https://www.linkedin.com/in/neil-van-der-byl-b35b797",
        "https://www.signalhire.com/profiles/neil-van-der-byl%27s-email/3405504"
      ],
      contactSources: {
        email: "https://www.homeschool-life.com/3349/class/instructors?instructorID=66788",
        phone: "https://www.snapology.com/california-solana-beach/blog/a-playdate-that-grownups-kids-will-love-in-solana-beach-ca/",
        locationEmail: "solanabeach@snapology.com"
      }
    }
  },
  {
    publicId: "snap-corben-steam-adventures",
    name: "CorBen STEAM Adventures",
    contact: {
      name: "Steve Kennard",
      title: "President",
      email: "sales.chulavistaeast@snapology.com",
      phone: "619-339-4533",
      linkedinUrl: "",
      orgKey: "steve-kennard"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "steve-kennard", name: "Steve Kennard", title: "President", children: [] }
    ],
    locations: [{ label: "Chula Vista, California", lat: 32.6435, lng: -116.9665 }],
    territories: [],
    research: {
      matchStatus: "regional_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "FDD confirms East Chula Vista franchisee. Individual role is from a 2023 filing. Second San Diego franchisee; the territory card shows Van der Byl Ventures.",
      sources: [SNAPOLOGY_FDD_URL, "https://www.thestarnews.com/wp-content/uploads/2023/06/6-30-23-STAR-legals.pdf"],
      contactSources: {
        email: "https://www.sdstemecosystem.org/partners/partner-detail/696",
        phone: "https://www.sdstemecosystem.org/partners/partner-detail/696"
      }
    }
  },
  {
    publicId: "snap-two-ls-two-rs",
    name: "Two Ls Two Rs, LLC",
    website: "https://www.snapology.com/california-arcadia/",
    contact: {
      name: "Linette Aponte",
      title: "Managing Member",
      email: "",
      phone: "626-629-0129",
      linkedinUrl: "",
      orgKey: "linette-aponte"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "linette-aponte", name: "Linette Aponte", title: "Managing Member", children: [] }
    ],
    locations: [{ label: "Arcadia, California", lat: 34.1397, lng: -118.0353 }],
    territories: [{ brandId: "snapology", geoKey: "place:0644000" }],
    research: {
      matchStatus: "regional_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "FDD confirms Arcadia franchisee. Individual role is from a 2018 filing. Does not establish ownership of all Los Angeles.",
      sources: [SNAPOLOGY_FDD_URL, "https://bhweekly.com/issues/pdf/2018_970.pdf"],
      contactSources: {
        email: "",
        phone: "https://www.snapology.com/california-arcadia/"
      }
    }
  },
  {
    publicId: "snap-dream-island-learning",
    name: "Dream Island Learning, LLC",
    website: "https://www.snapology.com/california-sherman-oaks/",
    contact: {
      name: "",
      title: "",
      email: "",
      phone: "818-351-5727",
      linkedinUrl: "",
      orgKey: ""
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [],
    locations: [{ label: "Sherman Oaks, California", lat: 34.151, lng: -118.449 }],
    territories: [],
    research: {
      matchStatus: "regional_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "FDD confirms Sherman Oaks franchisee. Second Los Angeles franchisee; the territory card shows Two Ls Two Rs.",
      sources: [SNAPOLOGY_FDD_URL],
      contactSources: {
        email: "",
        phone: "https://www.snapology.com/california-sherman-oaks/"
      }
    }
  },
  {
    publicId: "snap-roseville-cem-emir",
    name: "Cem & Emir",
    website: "https://www.snapology.com/california-roseville/",
    contact: {
      name: "Cem",
      title: "Franchisee",
      email: "",
      phone: "916-437-4175",
      linkedinUrl: "",
      orgKey: "cem"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "cem", name: "Cem", title: "Franchisee", children: [] },
      { key: "emir", name: "Emir", title: "Franchisee", children: [] }
    ],
    locations: [{ label: "Roseville, California", lat: 38.7521, lng: -121.288 }],
    territories: [{ brandId: "snapology", geoKey: "place:0664000" }],
    research: {
      matchStatus: "nearby_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "No exact Sacramento owner verified. Roseville appears as signed but not open as of December 31, 2025. Public announcement identifies Cem and Emir; full names not verified.",
      sources: [SNAPOLOGY_FDD_URL, "https://www.linkedin.com/in/jeff-ball-6118b112"],
      contactSources: {
        email: "",
        phone: "https://www.snapology.com/california-roseville/"
      }
    }
  },
  {
    publicId: "snap-sv-kids-corp",
    name: "SVKIDS Corp.",
    website: "https://www.snapology.com/california-los-gatos/",
    linkedinUrl: "https://www.linkedin.com/company/kidscorp/",
    contact: {
      name: "Amita Dhingra",
      title: "Co-owner",
      email: "losgatos@snapology.com",
      phone: "669-221-5359",
      linkedinUrl: "",
      orgKey: "amita-dhingra"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "amita-dhingra", name: "Amita Dhingra", title: "Co-owner", children: [] },
      { key: "vaishali-dubal", name: "Vaishali Dubal", title: "Co-owner", children: [] }
    ],
    locations: [{ label: "Los Gatos, California", lat: 37.2358, lng: -121.9624 }],
    territories: [{ brandId: "snapology", geoKey: "place:0668000" }],
    research: {
      matchStatus: "regional_franchise",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "California corporation Sv Kids Corp (filed 2020-01-24 in San Jose) holds the Snapology of Los Gatos business name. Amita Dhingra and Vaishali Dubal are the officers. The franchise advertises programs in Almaden, Camden, Los Gatos, Saratoga, and Cupertino, which reads as one community service area rather than separate owned territories. Santa Clara, Sunnyvale, and Fremont use different phones and are not tied to this company. Exact San Jose territory boundary is unverified.",
      sources: [
        SNAPOLOGY_FDD_URL,
        "https://www.snapology.com/california-los-gatos/",
        "https://www.snapology.com/california-los-gatos/blog/how-local-company-snapology-rose-during-the-covid-19-pandemic/",
        "https://www.bizprofile.net/ca/san-jose/sv-kids-corp",
        "https://opengovus.com/san-jose-business/4603180000"
      ],
      contactSources: {
        email: "https://www.snapology.com/california-los-gatos/faq-category/field-trips/",
        phone: "https://www.snapology.com/california-los-gatos/"
      }
    }
  },
  {
    publicId: "snap-fremont-chokshi",
    name: "Amishi Chokshi & Rutvik Choksi",
    website: "https://www.snapology.com/california-fremont/",
    contact: {
      name: "Amishi Chokshi",
      title: "Owner",
      email: "fremontca@snapology.com",
      phone: "510-216-3598",
      linkedinUrl: "https://www.linkedin.com/in/amishi-chokshi",
      orgKey: "amishi-chokshi"
    },
    concepts: [{ name: "Snapology" }],
    orgChart: [
      { key: "amishi-chokshi", name: "Amishi Chokshi", title: "Owner", children: [] },
      { key: "rutvik-choksi", name: "Rutvik Choksi", title: "Owner", children: [] }
    ],
    locations: [{ label: "Fremont, California", lat: 37.5485, lng: -121.9886 }],
    territories: [{ brandId: "snapology", geoKey: "place:0626000" }],
    research: {
      matchStatus: "direct_city_match",
      fddAsOf: "2025-12-31",
      researchDate: "2026-09-30",
      notes: "Strongest city-level match. Public profiles identify Fremont ownership. FDD lists Fremont as signed but not open as of December 31, 2025. Territory boundary ownership is not independently verified.",
      sources: [
        SNAPOLOGY_FDD_URL,
        "https://www.linkedin.com/in/amishi-chokshi",
        "https://www.linkedin.com/in/rutvikchoksi"
      ],
      contactSources: {
        email: "https://www.snapology.com/california-fremont/blog/upcoming-fremont-robotics-engineering-classes-camps/",
        phone: "https://www.snapology.com/california-fremont/"
      }
    }
  }
];

(function () {
  const owners = Array.isArray(window.territoryOwnersData) ? window.territoryOwnersData : [];

  function countOrgChart(nodes) {
    return (nodes || []).reduce((total, node) => total + 1 + countOrgChart(node.children), 0);
  }

  // Must match getLocationCellKey in data/real/overlay.js.
  function getLocationCellKey(lat, lng) {
    return `${lat.toFixed(1)},${lng.toFixed(1)}`;
  }

  const records = owners.map((owner) => {
    const locations = (owner.locations || [])
      .filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng));

    return {
      groupCode: owner.name,
      website: "",
      linkedinUrl: "",
      concepts: [],
      orgChart: [],
      territories: [],
      ...owner,
      contactsCount: Number.isFinite(owner.contactsCount)
        ? owner.contactsCount
        : countOrgChart(owner.orgChart),
      unitsCount: locations.length,
      units: locations.map((location, index) => [location.lat, location.lng, `${owner.publicId}-${index}`])
    };
  });

  window.territoryOwnersById = new Map(records.map((owner) => [owner.publicId, owner]));
  window.territoryOwnersByTerritoryKey = new Map(records.flatMap((owner) => (
    owner.territories.map((territory) => [`${territory.brandId}:${territory.geoKey}`, owner])
  )));

  const dumpOwners = window.cstDumpData?.owners;
  if (!Array.isArray(dumpOwners)) return;

  const placeLabels = window.cstDumpLocations || (window.cstDumpLocations = {});
  records.forEach((owner) => {
    (owner.locations || []).forEach((location) => {
      const key = getLocationCellKey(location.lat, location.lng);
      if (!placeLabels[key]) placeLabels[key] = location.label;
    });
  });

  const knownIds = new Set(dumpOwners.map((owner) => owner.publicId));
  records.forEach((owner) => {
    if (!knownIds.has(owner.publicId)) dumpOwners.push(owner);
  });
}());
