function getFranchiseSlug(franchiseName) {
  return franchiseName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const franchiseLogoFileOverrides = {
  "Anytime Fitness": "anytime-fitness.png",
  "F45 Training": "f45-training.svg",
  "OrangeTheory Fitness": "orangetheory.jpg",
  "Crumbl Cookies": "crumbl-cookies.png",
  "The Learning Experience": "the-learning-experience.png",
  "Drybar": "drybar.png",
  "Ace Handyman Services": "ace-handyman-services.png",
  "StretchLab": "stretchlab.png",
  "Mathnasium": "mathnasium.png",
  "MaidPro": "maidpro.png",
  "Wendy's": "wendys.jpg",
  "Chili's": "chilis.png",
  "Papa John's": "papa-johns.png",
  "Five Guys": "five-guys.png",
  "Krispy Kreme": "krispy-kreme.png",
  "Jimmy John's": "jimmy-johns.png",
  "Dunkin'": "dunkin.jpg",
  "Blaze Pizza": "blaze-pizza.png",
  "Outback Steakhouse": "outback-steakhouse.png",
  "Smoothie King": "smoothie-king.png",
  "Starbucks": "starbucks.png",
  "Qdoba": "qdoba.png",
  "Title Boxing Club": "title-boxing-club.png",
  "Popeyes Louisiana Kitchen": "popeyes-louisiana-kitchen.jpg",
  "Tropical Smoothie Cafe": "tropical-smoothie-cafe.png",
  "Aussie Pet Mobile": "aussie-pet-mobile.png",
  "Planet Fitness": "planet-fitness.jpg",
  "Snap Fitness": "snap-fitness.jpg",
  "Gold's Gym": "golds-gym.jpg",
  "Crunch Fitness": "crunch-fitness.jpg",
  "Club Pilates": "club-pilates.jpg",
  "Pure Barre": "pure-barre.jpg",
  "Workout Anytime": "workout-anytime.jpg"
};

function getFranchiseLogoSrc(franchiseName) {
  const logoFileName = franchiseLogoFileOverrides[franchiseName] || `${getFranchiseSlug(franchiseName)}.jpg`;
  return `../../assets/logos/franchises/${logoFileName}`;
}

function getFranchiseInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getTargetFranchises(target) {
  if (!Array.isArray(target.franchises)) return [];
  return [...new Set(target.franchises.map((franchise) => String(franchise).trim()).filter(Boolean))];
}

function getTargetFranchiseLogosMarkup(franchises) {
  if (!franchises.length) {
    return `<span class="target-franchises-empty">—</span>`;
  }

  return `
    <div class="target-franchise-logos" role="list" aria-label="${franchises.join(", ")}">
      ${franchises.map((franchise) => `
        <span class="target-franchise-logo" role="listitem" data-tooltip="${franchise}">
          <span class="target-franchise-logo-fallback">${getFranchiseInitials(franchise)}</span>
          <img
            src="${getFranchiseLogoSrc(franchise)}"
            alt=""
            onerror="this.style.display='none';this.previousElementSibling.style.display='inline-flex';"
          >
        </span>
      `).join("")}
    </div>
  `;
}
