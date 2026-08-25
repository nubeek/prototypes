const TERRITORY_DATASET_STORAGE_KEY = "wefranch-territories-list-dataset";
const TERRITORY_SKIP_CROSSROAD_KEY = "wefranch-territories-list-skip-crossroad";
const TERRITORY_DEFAULT_DATASET_ID = "real";

const TERRITORY_DATASETS = {
  default: {
    id: "default",
    label: "Example States",
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
        id: "qsr-southeast",
        title: "QSR in the South-East",
        filters: {
          locations: ["FL", "GA", "AL", "SC", "NC", "TN", "KY", "VA", "MS", "LA"],
          categories: ["Food & Beverage"],
          statuses: ["available"]
        }
      },
      {
        id: "fitness-california",
        title: "Fitness in California",
        filters: {
          locations: ["CA"],
          categories: ["Health & Fitness"],
          statuses: ["available"]
        }
      },
      {
        id: "low-investment-midwest",
        title: "Low Investment in the Midwest",
        filters: {
          locations: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
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
        id: "burgers-and-fries-texas",
        title: "Burgers & Fries in Texas",
        filters: {
          locations: ["TX"],
          categories: ["Food & Beverage"],
          franchises: ["mcdonalds", "burger-king", "wendys"],
          statuses: ["available", "established", "sold"]
        }
      }
    ]
  },
  large: {
    id: "large",
    label: "Example CBSAs",
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
        id: "qsr-texas-florida",
        title: "QSR in Texas & Florida",
        filters: {
          locations: ["TX", "FL"],
          categories: ["Food & Beverage"],
          statuses: ["available"]
        }
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
        id: "fitness-west",
        title: "Fitness in the West",
        filters: {
          locations: ["CA", "AZ", "CO"],
          categories: ["Health & Fitness"],
          statuses: ["available"]
        }
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
    label: "Default",
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
      "real/captain-ds.json",
      "real/college-hunks-hauling-junk-and-moving.json",
      "real/coffee-bean-tea-leaf.json",
      "real/dryer-vent-wizard.json",
      "real/farmer-boys.json",
      "real/five-star-painting.json",
      "real/glass-doctor.json",
      "real/housemaster.json",
      "real/i9-sports.json",
      "real/jantize-america.json",
      "real/junk-king.json",
      "real/launch-family-entertainment.json",
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
      "real/play-street-museum.json",
      "real/pizza-factory.json",
      "real/precision-door-service.json",
      "real/primrose-schools.json",
      "real/rainbow-intl-restoration.json",
      "real/real-property-management.json",
      "real/see-and-be-kitchen.json",
      "real/shelfgenie.json",
      "real/snapology.json",
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
        id: "texas-home-services",
        title: "Home Services in Texas",
        filters: {
          locations: ["TX"],
          categories: ["Home & Services"],
          statuses: ["available"]
        }
      },
      {
        id: "southeast-available",
        title: "South-East of the US",
        filters: {
          locations: ["FL", "GA", "AL", "SC", "NC", "TN", "KY", "VA", "MS", "LA"],
          statuses: ["available"]
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
        id: "florida-cleaning",
        title: "Cleaning in Florida",
        filters: {
          locations: ["FL"],
          categories: ["Cleaning and Maintenance"],
          statuses: ["available"]
        }
      },
      {
        id: "texas-florida",
        title: "Texas & Florida Growth Markets",
        filters: {
          locations: ["TX", "FL"],
          statuses: ["available"]
        }
      },
      {
        id: "midwest-low-investment",
        title: "Under $150k in the Midwest",
        filters: {
          locations: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
          statuses: ["available"],
          investment: { min: 0, max: 150000 }
        }
      }
    ]
  }
};

const TERRITORY_DATASET_ORDER = ["default", "large", "real"];

function persistTerritoryDatasetId(datasetId) {
  try {
    window.localStorage?.setItem(TERRITORY_DATASET_STORAGE_KEY, datasetId);
  } catch (error) {
    console.warn("Unable to save the selected territory dataset.", error);
  }
}

function getActiveTerritoryDataset() {
  return TERRITORY_DATASETS[TERRITORY_DEFAULT_DATASET_ID];
}

function setActiveTerritoryDataset() {
  const currentDataset = getActiveTerritoryDataset();
  persistTerritoryDatasetId(currentDataset.id);
  return currentDataset;
}

persistTerritoryDatasetId(TERRITORY_DEFAULT_DATASET_ID);

window.territoryDatasets = {
  all: TERRITORY_DATASETS,
  order: TERRITORY_DATASET_ORDER,
  getActive: getActiveTerritoryDataset,
  setActive: setActiveTerritoryDataset
};
