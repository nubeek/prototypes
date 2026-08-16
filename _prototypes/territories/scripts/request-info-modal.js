const REQUEST_INFO_MODAL_CLOSE_DURATION_MS = 320;
const REQUEST_INFO_DEFAULT_DESCRIPTION = "Send your inquiry to the brand owner.";
const REQUEST_INFO_DEFAULT_SUCCESS = "The brand owner will follow up with you shortly.";
const requestInfoTerritoryCollator = new Intl.Collator(undefined, { sensitivity: "base" });

let requestInfoModalCloseTimeoutId = null;
let lastRequestInfoModalTrigger = null;
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
const requestInfoTerritoryName = document.getElementById("requestInfoTerritoryName");

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
  requestInfoModal
    ?.querySelector(".request-info-modal")
    ?.setAttribute("aria-labelledby", "requestInfoModalTitle");
}

function showRequestInfoSuccessView() {
  requestInfoFormView?.setAttribute("hidden", "");
  requestInfoSuccessView?.removeAttribute("hidden");
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

function finalizeRequestInfoModalClose() {
  if (!requestInfoModal) return;

  requestInfoModal.classList.remove("is-open", "is-closing");
  requestInfoModal.hidden = true;
  resetRequestInfoModalForm();
  requestInfoModalCloseTimeoutId = null;

  if (lastRequestInfoModalTrigger instanceof HTMLElement) {
    lastRequestInfoModalTrigger.focus({ preventScroll: true });
  }
  lastRequestInfoModalTrigger = null;
}

function closeRequestInfoModal() {
  if (!requestInfoModal || requestInfoModal.hidden) return;

  if (requestInfoModalCloseTimeoutId) {
    window.clearTimeout(requestInfoModalCloseTimeoutId);
  }

  requestInfoModal.classList.remove("is-open");
  requestInfoModal.classList.add("is-closing");
  requestInfoModalCloseTimeoutId = window.setTimeout(
    finalizeRequestInfoModalClose,
    REQUEST_INFO_MODAL_CLOSE_DURATION_MS
  );
}

function openRequestInfoModal(trigger = null, context = null) {
  if (!requestInfoModal) return;

  if (requestInfoModalCloseTimeoutId) {
    window.clearTimeout(requestInfoModalCloseTimeoutId);
    requestInfoModalCloseTimeoutId = null;
  }

  lastRequestInfoModalTrigger = trigger;
  resetRequestInfoModalForm();
  applyRequestInfoContext(context || getRequestInfoContextFromTrigger(trigger));

  requestInfoModal.classList.remove("is-closing");
  requestInfoModal.hidden = false;
  requestInfoModal.classList.remove("is-open");

  window.requestAnimationFrame(() => {
    if (!requestInfoModal || requestInfoModal.hidden) return;
    requestInfoModal.classList.add("is-open");
    requestInfoFirstName?.focus({ preventScroll: true });
  });
}

["territoryInfoRequest", "territoryInfoRequestCompare"].forEach((buttonId) => {
  document.getElementById(buttonId)?.addEventListener("click", (event) => {
    openRequestInfoModal(event.currentTarget);
  });
});

if (requestInfoModal) {
  requestInfoModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const doneButton = event.target.closest(".save-search-success__done");
    if (doneButton) {
      closeRequestInfoModal();
      return;
    }

    const closeControl = event.target.closest(".request-info-modal-close, .request-info-modal-cancel");
    if (closeControl || event.target === requestInfoModal) {
      closeRequestInfoModal();
    }
  });

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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !requestInfoModal || requestInfoModal.hidden) return;
  closeRequestInfoModal();
});

window.territoryRequestInfoModal = {
  open: openRequestInfoModal,
  close: closeRequestInfoModal
};
