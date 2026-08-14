const TERRITORY_DATASET_STORAGE_KEY = "wefranch-territories-list-dataset";
const TERRITORY_SKIP_CROSSROAD_KEY = "wefranch-territories-list-skip-crossroad";
const TERRITORY_DEFAULT_DATASET_ID = "default";
const TERRITORY_POPULAR_SEARCH_GEO_LEVELS = ["cbsa", "district", "place"];

const TERRITORY_DATASETS = {
  default: {
    id: "default",
    label: "Default",
    brandFiles: [
      "default/planet-fitness.json",
      "default/subway.json",
      "default/chick-fil-a.json",
      "default/dunkin.json",
      "default/mcdonalds.json",
      "default/burger-king.json",
      "default/popeyes.json",
      "default/7eleven.json",
      "default/remax.json",
      "default/dominos.json",
      "default/ups.json",
      "default/wendys.json"
    ],
    presets: [
      {
        id: "qsr",
        title: "QSR Territories",
        filters: { categories: ["Food & Beverage"], statuses: ["available"] }
      },
      {
        id: "fitness",
        title: "Fitness Franchises",
        filters: { categories: ["Health & Fitness"], statuses: ["available"] }
      },
      {
        id: "low-investment",
        title: "Low Initial Investment",
        filters: {
          locationsExcluded: ["AK"],
          investment: { min: 0, max: 500000 }
        }
      },
      {
        id: "chick-fil-a-southeast",
        title: "Chick-fil-A South-East",
        filters: {
          locations: ["GA", "IN", "KY", "NY", "NC", "VA"],
          franchises: ["chick-fil-a"],
          statuses: ["available", "established", "sold"]
        }
      },
      {
        id: "burgers-and-fries",
        title: "Burgers & Fries",
        filters: {
          categories: ["Food & Beverage"],
          franchises: ["mcdonalds", "burger-king", "wendys"],
          statuses: ["available", "established", "sold"]
        }
      }
    ]
  },
  large: {
    id: "large",
    label: "Large",
    brandFiles: [
      "large/planet-fitness.json",
      "large/subway.json",
      "large/chick-fil-a.json",
      "large/dunkin.json",
      "large/mcdonalds.json",
      "large/burger-king.json",
      "large/popeyes.json",
      "large/7eleven.json",
      "large/remax.json",
      "large/dominos.json",
      "large/ups.json",
      "large/wendys.json"
    ],
    presets: [
      {
        id: "qsr",
        title: "QSR Territories",
        filters: { categories: ["Food & Beverage"], statuses: ["available"] }
      },
      {
        id: "southeast-growth",
        title: "Southeast Growth Markets",
        filters: {
          locations: ["TX", "FL", "GA", "NC", "SC"],
          statuses: ["available"]
        }
      },
      {
        id: "fitness",
        title: "Fitness Franchises",
        filters: { categories: ["Health & Fitness"], statuses: ["available"] }
      },
      {
        id: "western-metros",
        title: "Western Metro Markets",
        filters: {
          locations: ["CA", "AZ", "CO"],
          statuses: ["available"]
        }
      }
    ]
  },
  real: {
    id: "real",
    label: "Real",
    autoFitMap: false,
    mapView: {
      center: [-97.5795, 38.8283],
      zoom: 3.4
    },
    brandFiles: [
      "real/aire-serv.json",
      "real/area-2-farms.json",
      "real/bay-area-kids-rentals.json",
      "real/black-sheep-coffee.json",
      "real/college-hunks-hauling-junk-and-moving.json",
      "real/dryer-vent-wizard.json",
      "real/five-star-painting.json",
      "real/glass-doctor.json",
      "real/housemaster.json",
      "real/jantize-america.json",
      "real/junk-king.json",
      "real/lawn-pride.json",
      "real/liftology.json",
      "real/luxe-pet-care.json",
      "real/manna-coffee.json",
      "real/modo-yoga-international.json",
      "real/molly-maid.json",
      "real/mosquito-joe.json",
      "real/mr-appliance.json",
      "real/mr-electric.json",
      "real/mr-handyman.json",
      "real/mr-rooter.json",
      "real/pepitos-paletas.json",
      "real/pizza-factory.json",
      "real/precision-door-service.json",
      "real/primrose-schools.json",
      "real/rainbow-intl-restoration.json",
      "real/real-property-management.json",
      "real/see-and-be-kitchen.json",
      "real/shelfgenie.json",
      "real/speed-queen-laundry.json",
      "real/synergy-homecare.json",
      "real/the-grounds-guys.json",
      "real/tommy-pollina-landscape-co.json",
      "real/tony-romas.json",
      "real/tony-romas-bones-burgers.json",
      "real/tradewell.json",
      "real/window-genie.json",
      "real/wonder-family.json"
    ],
    presets: [
      {
        id: "home-services",
        title: "Available Home Services",
        filters: {
          categories: ["Home & Services"],
          statuses: ["available"],
          geoLevels: [...TERRITORY_POPULAR_SEARCH_GEO_LEVELS]
        }
      },
      {
        id: "southeast-available",
        title: "South-East of the US",
        filters: {
          locations: ["FL", "GA", "AL", "SC", "NC", "TN", "KY", "VA", "MS", "LA"],
          statuses: ["available"],
          geoLevels: [...TERRITORY_POPULAR_SEARCH_GEO_LEVELS]
        }
      },
      {
        id: "california-home-services",
        title: "Home Services in CA",
        filters: {
          locations: ["CA"],
          categories: ["Home & Services"],
          statuses: ["available"]
        }
      },
      {
        id: "cleaning-maintenance",
        title: "Cleaning & Maintenance Available",
        filters: {
          categories: ["Cleaning and Maintenance"],
          statuses: ["available"],
          geoLevels: [...TERRITORY_POPULAR_SEARCH_GEO_LEVELS]
        }
      },
      {
        id: "texas-florida",
        title: "Texas & Florida Growth Markets",
        filters: {
          locations: ["TX", "FL"],
          statuses: ["available"],
          geoLevels: [...TERRITORY_POPULAR_SEARCH_GEO_LEVELS]
        }
      },
      {
        id: "low-investment",
        title: "Under $150k Initial Investment",
        filters: {
          statuses: ["available"],
          geoLevels: [...TERRITORY_POPULAR_SEARCH_GEO_LEVELS],
          investment: { min: 0, max: 150000 }
        }
      }
    ]
  }
};

const TERRITORY_DATASET_ORDER = ["default", "large", "real"];

function getStoredTerritoryDatasetId() {
  try {
    return window.localStorage?.getItem(TERRITORY_DATASET_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to read the selected territory dataset.", error);
    return null;
  }
}

function persistTerritoryDatasetId(datasetId) {
  try {
    window.localStorage?.setItem(TERRITORY_DATASET_STORAGE_KEY, datasetId);
  } catch (error) {
    console.warn("Unable to save the selected territory dataset.", error);
  }
}

function getActiveTerritoryDataset() {
  const storedDatasetId = getStoredTerritoryDatasetId();
  return TERRITORY_DATASETS[storedDatasetId] || TERRITORY_DATASETS[TERRITORY_DEFAULT_DATASET_ID];
}

function setActiveTerritoryDataset(datasetId) {
  const nextDataset = TERRITORY_DATASETS[datasetId];
  const currentDataset = getActiveTerritoryDataset();
  if (!nextDataset || nextDataset.id === currentDataset.id) {
    return currentDataset;
  }

  persistTerritoryDatasetId(nextDataset.id);

  if (window.__territoryMapStarted) {
    try {
      window.sessionStorage?.setItem(TERRITORY_SKIP_CROSSROAD_KEY, "true");
    } catch (error) {
      console.warn("Unable to preserve the territory map view during dataset switching.", error);
    }
    window.location.reload();
    return nextDataset;
  }

  window.dispatchEvent(new CustomEvent("territorydatasetchange", {
    detail: { dataset: nextDataset }
  }));
  return nextDataset;
}

window.territoryDatasets = {
  all: TERRITORY_DATASETS,
  order: TERRITORY_DATASET_ORDER,
  getActive: getActiveTerritoryDataset,
  setActive: setActiveTerritoryDataset
};
