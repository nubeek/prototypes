// Headshots in assets/headshots/<franchisee>/<person>.png.
// The folder is the franchisee name, and the file is the person's name.
// Path is relative to both _prototypes/cst/ and _prototypes/leads/.
(function () {
  const HEADSHOT_DIR = "../../assets/headshots/";
  const HEADSHOT_FILES = {
  "argonne-capital": {
    "ben-ghriskey": "ben-ghriskey.png",
    "ben-nemo": "ben-nemo.png",
    "bill-weimar": "bill-weimar.png",
    "cindy-andersen": "cindy-andersen.png",
    "doug-shaw": "doug-shaw.png",
    "drew-frank": "drew-frank.png",
    "gordon-wyche": "gordon-wyche.png",
    "karl-f-jaeger": "karl-f-jaeger.png",
    "kelly-c-baltes": "kelly-c-baltes.png",
    "lawrence-bowers": "lawrence-bowers.png",
    "lyssa-hoganson": "lyssa-hoganson.png",
    "michael-a-klump": "michael-a-klump.png",
    "mike-wood": "mike-wood.png",
    "mitchell-brister": "mitchell-brister.png",
    "mo-bazian": "mo-bazian.png",
    "patrick-anderson": "patrick-anderson.png"
  },
  "dhanani-group": {
    "amin-dhanani": "amin-dhanani.png",
    "bill-ahrens": "bill-ahrens.png",
    "chad-magner": "chad-magner.png",
    "nicole-kress": "nicole-kress.png",
    "scott-owen": "scott-owen.png",
    "shoukat-dhanani": "shoukat-dhanani.png",
    "usman-dhanani": "usman-dhanani.png"
  },
  "flynn-group": {
    "aaron-kirkman": "aaron-kirkman.png",
    "ashley-fenn": "ashley-fenn.png",
    "billy-strunk": "billy-strunk.png",
    "brad-pettinger": "brad-pettinger.png",
    "dan-krebsbach": "dan-krebsbach.png",
    "dan-rieger": "dan-rieger.png",
    "david-lombardy": "david-lombardy.png",
    "eric-contizano": "eric-contizano.png",
    "greg-flynn": "greg-flynn.png",
    "jacqueline-lee": "jacqueline-lee.png",
    "jeff-baranco": "jeff-baranco.png",
    "jeremy-biser": "jeremy-biser.png",
    "jimmy-veazey": "jimmy-veazey.png",
    "john-roe": "john-roe.png",
    "jp-wiedemer": "jp-wiedemer.png",
    "kelly-cook": "kelly-cook.png",
    "lauren-leahy": "lauren-leahy.png",
    "lorin-cortina": "lorin-cortina.png",
    "mark-romano": "mark-romano.png",
    "patrick-eulberg": "patrick-eulberg.png",
    "rasheeda-clark": "rasheeda-clark.png",
    "richard-wallis": "richard-wallis.png",
    "ron-bellamy": "ron-bellamy.png"
  },
  "gps-hospitality": {
    "amelia-mcdonald": "amelia-mcdonald.png",
    "angie-occhipinti": "angie-occhipinti.png",
    "beth-fisher": "beth-fisher.png",
    "bobby-garner": "bobby-garner.png",
    "brian-arnold": "brian-arnold.png",
    "bryan-rohr": "bryan-rohr.png",
    "carmen-gianguzzo": "carmen-gianguzzo.png",
    "chantell-bernard": "chantell-bernard.png",
    "charles-colbert": "charles-colbert.png",
    "christy-wasdin": "christy-wasdin.png",
    "elizabeth-boggs": "elizabeth-boggs.png",
    "gary-thomas": "gary-thomas.png",
    "greg-comer": "greg-comer.png",
    "jen-forbes": "jen-forbes.png",
    "jessica-sommerfeldt": "jessica-sommerfeldt.png",
    "jim-barlow": "jim-barlow.png",
    "joe-waller": "joe-waller.png",
    "julie-henshaw": "julie-henshaw.png",
    "kevin-ray": "kevin-ray.png",
    "lisa-grier": "lisa-grier.png",
    "michael-lippert": "michael-lippert.png",
    "mike-kovac": "mike-kovac.png",
    "nick-myhre": "nick-myhre.png",
    "reid-neumann": "reid-neumann.png",
    "roger-wood": "roger-wood.png",
    "sally-detter": "sally-detter.png",
    "scott-jasinski": "scott-jasinski.png",
    "sheila-washington": "sheila-washington.png",
    "shelly-mckinnon": "shelly-mckinnon.png",
    "stephanie-skidmore": "stephanie-skidmore.png",
    "tiffany-howard": "tiffany-howard.png",
    "todd-bennett": "todd-bennett.png",
    "todd-jackson": "todd-jackson.png",
    "tom-bradley": "tom-bradley.png",
    "tom-garrett": "tom-garrett.png",
    "tom-wilson": "tom-wilson.png",
    "trish-farley": "trish-farley.png",
    "troy-theriot": "troy-theriot.png",
    "vickie-volan": "vickie-volan.png",
    "wendell-jones": "wendell-jones.png"
  },
  "k-mac-enterprises-inc": {
    "jason-miller": "jason-miller.png",
    "matthew-parry": "matthew-parry.png",
    "theresa-estep": "theresa-estep.png"
  },
  "pacific-bells-llc": {
    "maggie-georgilas": "maggie-georgilas.png",
    "scott-shepherd": "scott-shepherd.png",
    "tom-cook": "tom-cook.png"
  },
  "pilot-travel-centers": {
    "andy-lupo": "andy-lupo.png",
    "eva-rigamonti": "eva-rigamonti.png",
    "jamie-landis": "jamie-landis.png",
    "jeremy-osterstock": "jeremy-osterstock.png",
    "jesus-guerra": "jesus-guerra.png",
    "julius-cox": "julius-cox.png",
    "sean-marrero": "sean-marrero.png",
    "wendy-hamilton": "wendy-hamilton.png"
  },
  "sun-holdings": {
    "anthony-schlemmer": "anthony-schlemmer.png",
    "christian-morath": "christian-morath.png",
    "david-fabian": "david-fabian.png",
    "dionna-jeffrey": "dionna-jeffrey.png",
    "guillermo-perales": "guillermo-perales.png",
    "jimmy-dang": "jimmy-dang.png",
    "justin-hart": "justin-hart.png",
    "karen-cundiff": "karen-cundiff.png",
    "laura-mcland": "laura-mcland.png",
    "louis-quartochi": "louis-quartochi.png",
    "mike-zmudosky": "mike-zmudosky.png",
    "robert-sanders": "robert-sanders.png",
    "rodney-conant": "rodney-conant.png"
  },
  "team-lyders": {
    "jini-foust": "jini-foust.png"
  }
};
  const FOLDER_ALIASES = {
    "love-s-travel-stops": "loves-travel-stops",
    "loves-travel-stops-and-country-stores": "loves-travel-stops",
    "pilot-travel-centers-llc": "pilot-travel-centers"
  };
  const LEGAL_SUFFIX = /-(inc|llc|l-l-c|l-p|corp|corporation|co)$/;

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resolveFolder(ownerName) {
    let slug = slugify(ownerName);
    const seen = new Set();

    while (slug && !seen.has(slug)) {
      seen.add(slug);
      if (HEADSHOT_FILES[slug]) return slug;
      if (FOLDER_ALIASES[slug] && HEADSHOT_FILES[FOLDER_ALIASES[slug]]) return FOLDER_ALIASES[slug];
      if (!LEGAL_SUFFIX.test(slug)) break;
      slug = slug.replace(LEGAL_SUFFIX, "");
    }

    return "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInitials(name) {
    const initials = String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return initials || "?";
  }

  window.resolvePersonHeadshotSrc = function resolvePersonHeadshotSrc(ownerName, personName) {
    const folder = resolveFolder(ownerName);
    if (!folder) return "";
    const file = HEADSHOT_FILES[folder][slugify(personName)];
    return file ? `${HEADSHOT_DIR}${folder}/${file}` : "";
  };

  window.getPersonAvatarMarkup = function getPersonAvatarMarkup({ className, name, ownerName, tag = "span" } = {}) {
    const safeTag = tag === "div" ? "div" : "span";
    const src = window.resolvePersonHeadshotSrc(ownerName, name);
    if (!src) {
      return `<${safeTag} class="${className}" aria-hidden="true">${escapeHtml(getInitials(name))}</${safeTag}>`;
    }

    return `<${safeTag} class="${className} has-headshot" aria-hidden="true"><img src="${escapeHtml(src)}" alt=""></${safeTag}>`;
  };
}());
