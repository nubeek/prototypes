// Franchisee marks in assets/logos/franchisees/. New marks are PNGs; a few seed
// marks are still JPG. The lookup picks the real extension so a page does not
// request a .jpg that was saved as .png.
// Path is relative to both _prototypes/cst/ and _prototypes/territories/.
(function () {
  const LOGO_DIR = "../../assets/logos/franchisees/";
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
    "kidscorp.jpg",
    "k-mac-enterprises-inc.png",
    "l5-fitness.jpg",
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
    "spartan-fitness-holdings.jpg",
    "spin-the-planet.png",
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
    "srg-plk-opco-llc": "srg-plk.png",
    "svkids-corp": "kidscorp.jpg"
  };
  const OWNER_LOGO_LEGAL_SUFFIX = /-(inc|llc|l-l-c|l-p|corp|corporation)$/;

  function getOwnerLogoSlug(name) {
    return String(name || "owner")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

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

  window.resolveFranchiseeLogoSrc = function resolveFranchiseeLogoSrc(name) {
    const file = resolveOwnerLogoFile(getOwnerLogoSlug(name));
    return file ? `${LOGO_DIR}${file}` : "";
  };
}());
