function getFranchiseSlug(franchiseName) {
  return franchiseName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const franchiseLogoFileOverrides = {
  "Anytime Fitness": "anytime_fitness.svg",
  "F45 Training": "f45_training.svg",
  "OrangeTheory Fitness": "orangetheory.jpg",
  "Crumbl Cookies": "crumbl_cookies.png",
  "The Learning Experience": "the_learning_experience.png",
  "Drybar": "drybar.png",
  "Ace Handyman Services": "ace_handyman_services.png",
  "StretchLab": "stretchlab.png",
  "Mathnasium": "mathnasium.png",
  "MaidPro": "maidpro.png",
  "Wendy's": "wendys.png",
  "Chili's": "chilis.png",
  "Papa John's": "papa_johns.png",
  "Five Guys": "five_guys.png",
  "Krispy Kreme": "krispy_kreme.png",
  "Jimmy John's": "jimmy_johns.png",
  "Dunkin'": "dunkin.png",
  "Blaze Pizza": "blaze_pizza.png",
  "Outback Steakhouse": "outback_steakhouse.png",
  "Smoothie King": "smoothie_king.png",
  "Starbucks": "starbucks.png",
  "Qdoba": "qdoba.png",
  "Title Boxing Club": "title_boxing_club.png",
  "Popeyes Louisiana Kitchen": "popeyes_louisiana_kitchen.png",
  "Tropical Smoothie Cafe": "tropical_smoothie_cafe.png",
  "Aussie Pet Mobile": "aussie_pet_mobile.png",
  "Planet Fitness": "planet_fitness.jpg",
  "Snap Fitness": "snap_fitness.jpg",
  "Gold's Gym": "golds_gym.jpg",
  "Crunch Fitness": "crunch_fitness.jpg",
  "Club Pilates": "club_pilates.jpg",
  "Pure Barre": "pure_barre.jpg",
  "Workout Anytime": "workout_anytime.jpg"
};

function getFranchiseLogoSrc(franchiseName) {
  const logoFileName = franchiseLogoFileOverrides[franchiseName] || `${getFranchiseSlug(franchiseName)}.jpg`;
  return `assets/franchises/${logoFileName}`;
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
