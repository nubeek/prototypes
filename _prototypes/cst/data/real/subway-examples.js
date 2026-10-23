/**
 * Example Subway franchisees for the prototype.
 *
 * Contact names and titles come from that export. Pilot, KK, and Love's use
 * published Subway counts. Jones Petroleum uses the streets on its site that
 * match profiles.csv. The other owners are regional samples of unused stores
 * from that file, so each row's map pin count matches its unit count.
 *
 * Sources for the published counts:
 *   Pilot, 235 — Franchise Times Multi-Brand 50, 2021
 *   Love's, 229 — Franchise Times Multi-Brand 50, 2021
 *   KK Corporation, 150 — Houston and San Antonio sample. kkcorp.com now says 100+.
 *   Jones Petroleum streets — jonespetroleum.com/locations
 */
(function () {
  const dump = window.cstDumpData;
  if (!dump || !Array.isArray(dump.owners)) return;

  const sampled = window.subwayExampleUnits || { pilot: [], kk: [] };
  const more = window.subwayExampleUnitsMore || {};

  const subway = {
    name: "Subway",
    publicId: "dnw8",
    slug: "subway"
  };

  function person(name, title, email) {
    return {
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      title: title || "",
      // A dash keeps the contacts table from inventing an address or number
      // when the export did not include one.
      email: email || "–",
      phone: "–",
      children: []
    };
  }

  dump.owners.push(
    {
      publicId: "swplt",
      name: "Pilot Travel Centers",
      groupCode: "Pilot Travel Centers LLC",
      website: "https://pilotcompany.com/",
      linkedinUrl: "https://www.linkedin.com/company/pilot-flying-j/",
      contactsCount: 8,
      unitsCount: sampled.pilot.length,
      contact: {
        name: "Sean Marrero",
        title: "President, Retail",
        email: "",
        phone: "",
        linkedinUrl: "",
        orgKey: "sean-marrero"
      },
      concepts: [subway],
      orgChart: [
        person("Sean Marrero", "President, Retail"),
        person("Andy Lupo", "Executive Vice President, Chief Commercial Officer"),
        person("Eva Rigamonti", "Executive Vice President, Chief Legal Officer"),
        person("Jamie Landis", "Senior Vice President, Business Planning and Execution"),
        person("Jeremy Osterstock", "Executive Vice President, Chief Financial Officer"),
        person("Jesús Guerra", "President, Energy"),
        person("Julius Cox", "Executive Vice President, Chief People and Administrative Officer"),
        person("Wendy Hamilton", "Senior Director, Chief of Staff")
      ],
      units: sampled.pilot
    },
    {
      publicId: "swkkc",
      name: "KK Corporation",
      groupCode: "KK Corporation",
      website: "https://kkcorp.com/",
      linkedinUrl: "https://www.linkedin.com/company/kkcorp/",
      contactsCount: 10,
      unitsCount: sampled.kk.length,
      contact: {
        name: "Keshuv Aggarwal",
        title: "President",
        email: "",
        // Published KK Management office line, not a personal number.
        phone: "281-933-9696",
        linkedinUrl: "https://www.linkedin.com/in/keshuv-kash-aggarwal-3a80b739",
        orgKey: "keshuv-aggarwal"
      },
      concepts: [subway],
      // Leadership grid on https://kkcorp.com/. The page lists titles, not reporting lines.
      orgChart: [
        person("Renu Aggarwal", "Founder & Chairwoman"),
        person("Bharat Aggarwal", "Chairman"),
        person("Keshuv Aggarwal", "President"),
        person("Kashika Annie Kumar", "Chief Legal Officer"),
        person("Sunny Patel", "Managing Director"),
        person("Ruhee Aggarwal", "Cultural Director"),
        person("Manish Goel", "Accountant"),
        person("Hiral Parikh", "Accounting Manager"),
        person("Francisco Garcia", "Payroll Manager"),
        person("Miriam Salgado", "Market Coach")
      ],
      units: sampled.kk
    },
    {
      publicId: "swjns",
      name: "Jones Petroleum",
      groupCode: "Jones Petroleum Company, Inc.",
      website: "https://jonespetroleum.com/",
      linkedinUrl: "https://www.linkedin.com/company/jones-petroleum-co/",
      contactsCount: 4,
      unitsCount: 7,
      contact: {
        name: "Natalie Jones",
        title: "Vice President - C-Store and QSR Division",
        email: "",
        phone: "",
        linkedinUrl: "https://www.linkedin.com/in/natalie-jones-85b0436/",
        orgKey: "natalie-jones"
      },
      concepts: [subway],
      orgChart: [
        person("Natalie Jones", "Vice President - C-Store and QSR Division"),
        person("Burt Jones", "Owner"),
        person("Brooks Jones", "Legal Research Assistant"),
        person("Laura Jones", "Marketing / Speciality Buyer")
      ],
      // [lat, lng, store id, label]. Labels are the profiles.csv city, which
      // is more specific than the shared 11km place-label cell.
      units: [
        [33.18187, -84.36353, 40057226, "Williamson, Georgia"],
        [33.2602, -84.098, 40057086, "Jackson, Georgia"],
        [33.38417, -83.90356, 40057112, "Jackson, Georgia"],
        [34.1726, -83.29184, 40056718, "Danielsville, Georgia"],
        [31.9351, -83.74478, 40056934, "Cordele, Georgia"],
        [33.98579, -83.42091, 40056951, "Athens, Georgia"],
        [33.52868, -84.6623, 40057334, "Palmetto, Georgia"]
      ]
    }
  );

  function exampleOwner({ publicId, name, groupCode, website, linkedinUrl, contact, people, units }) {
    return {
      publicId,
      name,
      groupCode: groupCode || name,
      website: website || "",
      linkedinUrl: linkedinUrl || "",
      contactsCount: people.length,
      unitsCount: units.length,
      contact,
      concepts: [subway],
      orgChart: people,
      units
    };
  }

  dump.owners.push(
    exampleOwner({
      publicId: "swlvs",
      name: "Love's Travel Stops",
      groupCode: "Love's Travel Stops & Country Stores, Inc.",
      website: "https://www.loves.com/",
      contact: {
        name: "Gillian Goodman",
        title: "–",
        email: "gillian.goodman@loves.com",
        phone: "",
        linkedinUrl: "",
        orgKey: "gillian-goodman"
      },
      people: [
        person("Gillian Goodman", "–", "gillian.goodman@loves.com"),
        person("Joe Cotton", "–", "joe.cotton@loves.com")
      ],
      units: more.loves || []
    }),
    exampleOwner({
      publicId: "swpmg",
      name: "PMG Travel Plaza",
      groupCode: "PMG Travel Plaza LLC",
      website: "https://petromg.com/",
      linkedinUrl: "https://www.linkedin.com/company/petroleum-marketing-group-e&c-enterprises-inc./",
      contact: {
        name: "Andre LeBlanc",
        title: "Vice President of Operations",
        email: "aleblanc@petromg.com",
        phone: "",
        linkedinUrl: "",
        orgKey: "andre-leblanc"
      },
      people: [
        person("Andre LeBlanc", "Vice President of Operations", "aleblanc@petromg.com"),
        person("Abdolhossein Ejtemai", "CEO"),
        person("Zahid Pervaiz", "CFO"),
        person("Anoush Daniel Rashidi", "VP of Operations"),
        person("Jim Deakin", "VP of Northeast Wholesale Operation"),
        person("Jeff Bucaro", "VP of Assets and Real Estate"),
        person("Barry Kamrad", "VP of Information Technology")
      ],
      units: more.pmg || []
    }),
    exampleOwner({
      publicId: "swvic",
      name: "Victory Marketing",
      groupCode: "Victory Marketing LLC",
      website: "https://www.sprintmart.com/",
      contact: {
        name: "Joe C Morris Jr",
        title: "–",
        email: "jmorris@sprintmart.com",
        phone: "",
        linkedinUrl: "",
        orgKey: "joe-c-morris-jr"
      },
      people: [
        person("Joe C Morris Jr", "–", "jmorris@sprintmart.com"),
        person("Yu Xiaohao", "–")
      ],
      units: more.ta || []
    }),
    exampleOwner({
      publicId: "swcmp",
      name: "Compass Group USA",
      groupCode: "Compass Group USA, Inc.",
      website: "https://www.compass-usa.com/",
      contact: {
        name: "Patrick Sevy",
        title: "",
        email: "patrick.sevy@cafebonappetit.com",
        phone: "",
        linkedinUrl: "https://www.linkedin.com/in/patrick-sevy-500164128/",
        orgKey: "patrick-sevy"
      },
      people: [
        person("Patrick Sevy", "–", "patrick.sevy@cafebonappetit.com"),
        person("Erika Ruiz", "–"),
        person("Sandi Hinman-Trussel", "–")
      ],
      units: more.compass || []
    }),
    exampleOwner({
      publicId: "swsdx",
      name: "Sodexo Operations",
      groupCode: "Sodexo Operations, LLC",
      website: "https://www.sodexo.com/",
      contact: {
        name: "Ronald Guillory",
        title: "President & Chief Operating Officer",
        email: "ronald.guillory@sodexo.com",
        phone: "",
        linkedinUrl: "https://www.linkedin.com/in/ronald-j-guillory-mba-med-b94a1a54/",
        orgKey: "ronald-guillory"
      },
      people: [
        person("Ronald Guillory", "President & Chief Operating Officer", "ronald.guillory@sodexo.com"),
        // The export stored the company name in this row. The address belongs to Miguel Ruvalcaba.
        person("Miguel Ruvalcaba", "–", "miguel.ruvalcaba@sodexo.com")
      ],
      units: more.sodexo || []
    })
  );
}());
