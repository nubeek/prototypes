const TERRITORY_CATEGORY_LABELS = {
  "Cleaning and Maintenance": "Cleaning & Maintenance",
  "Home and Building Services": "Home & Services",
  "Home & Building Services": "Home & Services",
  "Home Services": "Home & Services",
  "Food and Beverage": "Food & Beverage",
  "Other Businesses": "Other",
  "Professional Business Services": "Business Services",
  Ecommerce: "E-commerce",
  "Education Programs": "Education & Training",
  "Youth Enrichment": "Youth Enrichment",
  Fitness: "Fitness",
  "Healthcare Services": "Healthcare",
  Pets: "Pet Services",
  "Real Estate": "Real Estate",
  Retail: "Retail",
  "Retail Products and Services": "Retail & Consumer Services",
  "Senior Services": "Senior Care"
};

function formatCategoryLabel(category) {
  const value = String(category || "").trim();
  if (!value) return "";
  return TERRITORY_CATEGORY_LABELS[value] || value;
}

window.territoryCategories = {
  formatLabel: formatCategoryLabel
};
