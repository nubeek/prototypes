const REQUEST_INFO_DEFAULT_DESCRIPTION = "Send your inquiry to the brand owner.";
const REQUEST_INFO_DEFAULT_SUCCESS = "The brand owner will follow up with you shortly.";
const requestInfoTerritoryCollator = new Intl.Collator(undefined, { sensitivity: "base" });

let requestInfoContext = { brand: "", territory: "" };

const requestInfoModal = document.getElementById("requestInfoModal");
const requestInfoModalForm = document.getElementById("requestInfoModalForm");
const requestInfoFormView = document.getElementById("requestInfoFormView");
const requestInfoSuccessView = document.getElementById("requestInfoSuccessView");
const requestInfoDescription = document.getElementById("requestInfoDescription");
const requestInfoSuccessCopy = document.getElementById("requestInfoSuccessCopy");
const requestInfoFirstName = document.getElementById("requestInfoFirstName");
const requestInfoTerritory = document.getElementById("requestInfoTerritory");
const requestInfoTerritoryField = document.getElementById("requestInfoTerritoryField");
const requestInfoTerritoryLogo = document.getElementById("requestInfoTerritoryLogo");
const requestInfoTerritoryBrand = document.getElementById("requestInfoTerritoryBrand");
const requestInfoModalActions = document.getElementById("requestInfoModalActions");

function parseTerritoryRecordKey(key) {
  const value = String(key || "");
  const separator = value.indexOf(":");
  if (separator < 0) return { brandId: value, geoKey: "" };

  return {
    brandId: value.slice(0, separator),
    geoKey: value.slice(separator + 1)
  };
}

function findTerritoryBrand(brandId, brandName) {
  const brands = window.territoryBrands || [];
  return brands.find((brand) => brand.id === brandId)
    || brands.find((brand) => brand.brand === brandName)
    || null;
}

function getBrandTerritoryOptions(brand) {
  return (brand?.territories || [])
    .map((territory) => ({
      value: territory.geoKey || territory.state || "",
      label: territory.name || territory.state || ""
    }))
    .filter((option) => option.value && option.label)
    .sort((left, right) => requestInfoTerritoryCollator.compare(left.label, right.label));
}

function getRequestInfoContextFromTrigger(trigger) {
  const compare = trigger?.id === "territoryInfoRequestCompare";
  const brand = document.getElementById(compare ? "territoryInfoBrandCompare" : "territoryInfoBrand")
    ?.textContent
    .trim() || "";
  const territory = document.getElementById(compare ? "territoryInfoStateCompare" : "territoryInfoState")
    ?.textContent
    .trim() || "";
  let brandId = trigger?.dataset.brandId || "";
  let geoKey = trigger?.dataset.geoKey || "";

  if (!brandId || !geoKey) {
    const selectionKey = compare
      ? window.territoryMapSelection?.getCompareKey?.()
      : window.territoryMapSelection?.getSelectedKey?.();
    const parsed = parseTerritoryRecordKey(selectionKey);
    brandId = brandId || parsed.brandId;
    geoKey = geoKey || parsed.geoKey;
  }

  return { brandId, brand, territory, geoKey };
}

function buildRequestInfoDescription({ brand }) {
  if (brand) {
    return `Send your inquiry about ${brand} to the brand owner.`;
  }

  return REQUEST_INFO_DEFAULT_DESCRIPTION;
}

function buildRequestInfoSuccessCopy({ brand }) {
  if (brand) {
    return `The owners of ${brand} will follow up with you shortly.`;
  }

  return REQUEST_INFO_DEFAULT_SUCCESS;
}

function syncRequestInfoTerritoryDisplay({ brand = "", territory = "", logo = "" } = {}) {
  if (requestInfoTerritoryBrand) {
    requestInfoTerritoryBrand.textContent = brand;
  }

  if (requestInfoTerritoryName) {
    requestInfoTerritoryName.textContent = territory;
  }

  if (!requestInfoTerritoryLogo) return;

  if (logo) {
    requestInfoTerritoryLogo.src = logo;
    requestInfoTerritoryLogo.hidden = false;
    requestInfoTerritoryField?.classList.add("has-logo");
    return;
  }

  requestInfoTerritoryLogo.removeAttribute("src");
  requestInfoTerritoryLogo.hidden = true;
  requestInfoTerritoryField?.classList.remove("has-logo");
}

function populateRequestInfoTerritoryOptions(context) {
  if (!requestInfoTerritory) return;

  const brand = findTerritoryBrand(context.brandId, context.brand);
  const options = getBrandTerritoryOptions(brand);

  if (!options.length && context.territory) {
    options.push({
      value: context.geoKey || context.territory,
      label: context.territory
    });
  }

  const selectedValue = options.some((option) => option.value === context.geoKey)
    ? context.geoKey
    : options.find((option) => option.label === context.territory)?.value
      || options[0]?.value
      || "";

  requestInfoTerritory.replaceChildren();
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    if (option.value === selectedValue) {
      optionElement.selected = true;
    }
    requestInfoTerritory.append(optionElement);
  });

  requestInfoTerritory.value = selectedValue;
  requestInfoTerritory.disabled = options.length === 0;
  requestInfoContext.brand = brand?.brand || context.brand || "";
  requestInfoContext.territory = requestInfoTerritory.selectedOptions[0]?.textContent || context.territory || "";
  requestInfoContext.logo = brand?.logo || "";
  syncRequestInfoTerritoryDisplay({
    brand: requestInfoContext.brand,
    territory: requestInfoContext.territory,
    logo: requestInfoContext.logo
  });
}

function applyRequestInfoContext(context) {
  requestInfoContext = {
    brandId: context?.brandId || "",
    brand: context?.brand || "",
    territory: context?.territory || "",
    geoKey: context?.geoKey || ""
  };

  if (requestInfoDescription) {
    requestInfoDescription.textContent = buildRequestInfoDescription(requestInfoContext);
  }

  if (requestInfoSuccessCopy) {
    requestInfoSuccessCopy.textContent = buildRequestInfoSuccessCopy(requestInfoContext);
  }

  populateRequestInfoTerritoryOptions(requestInfoContext);
}

function showRequestInfoFormView() {
  requestInfoFormView?.removeAttribute("hidden");
  requestInfoSuccessView?.setAttribute("hidden", "");
  requestInfoModalActions?.removeAttribute("hidden");
  requestInfoModal
    ?.querySelector(".request-info-modal")
    ?.setAttribute("aria-labelledby", "requestInfoModalTitle");
}

function showRequestInfoSuccessView() {
  requestInfoFormView?.setAttribute("hidden", "");
  requestInfoSuccessView?.removeAttribute("hidden");
  requestInfoModalActions?.setAttribute("hidden", "");
  requestInfoModal
    ?.querySelector(".request-info-modal")
    ?.setAttribute("aria-labelledby", "requestInfoSuccessTitle");
  requestInfoModal
    ?.querySelector(".save-search-success__done")
    ?.focus({ preventScroll: true });
}

function resetRequestInfoModalForm() {
  if (!requestInfoModalForm) return;

  requestInfoModalForm.reset();
  showRequestInfoFormView();
}

const requestInfoModalApi = window.createProtoModal({
  overlay: requestInfoModal,
  closeSelectors: ".request-info-modal-close, .request-info-modal-cancel, .save-search-success__done",
  onClose() {
    resetRequestInfoModalForm();
  }
});

function closeRequestInfoModal() {
  requestInfoModalApi.close();
}

function openRequestInfoModal(trigger = null, context = null) {
  if (!requestInfoModal) return;

  resetRequestInfoModalForm();
  applyRequestInfoContext(context || getRequestInfoContextFromTrigger(trigger));
  requestInfoModalApi.open(trigger, {
    focus: requestInfoFirstName
  });
}

["territoryInfoRequest", "territoryInfoRequestCompare"].forEach((buttonId) => {
  document.getElementById(buttonId)?.addEventListener("click", (event) => {
    openRequestInfoModal(event.currentTarget);
  });
});

if (requestInfoModal) {
  requestInfoModalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    showRequestInfoSuccessView();
  });

  requestInfoTerritory?.addEventListener("change", () => {
    requestInfoContext.geoKey = requestInfoTerritory.value;
    requestInfoContext.territory = requestInfoTerritory.selectedOptions[0]?.textContent || "";
    syncRequestInfoTerritoryDisplay({
      brand: requestInfoContext.brand,
      territory: requestInfoContext.territory,
      logo: requestInfoContext.logo
    });
  });
}

window.territoryRequestInfoModal = {
  open: openRequestInfoModal,
  close: closeRequestInfoModal
};
