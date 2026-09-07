(function () {
  const page = window.WefranchLeadsPage;
  if (!page) return;

  const DETAIL_MODE = {
    READ: "read",
    EDIT: "edit",
    ADD: "add"
  };

  const card = document.querySelector(".card");
  const leadDetailPanel = document.getElementById("leadDetailPanel");
  const leadDetail = leadDetailPanel?.querySelector(".lead-detail");
  const leadDetailForm = document.getElementById("leadDetailForm");
  const leadDetailHero = document.getElementById("leadDetailHero");
  const leadDetailContent = document.getElementById("leadDetailContent");
  const leadDetailActions = document.getElementById("leadDetailActions");
  const leadDetailClose = leadDetailPanel?.querySelector(".profile-modal-close");
  const addLeadBtn = document.getElementById("addLeadBtn");

  let pendingDetailLeadId = null;
  let lastDetailTrigger = null;
  let detailMode = DETAIL_MODE.READ;
  let detailListApi = null;
  let detailStageApi = null;
  let detailCategoryApi = null;
  let detailFranchiseApi = null;
  let detailCompanyApi = null;
  let detailLocationApi = null;
  let detailLocationMap = null;
  let detailLocationMapPoint = null;
  let locationMapRequestId = 0;
  let mapboxGlLoader = null;
  let mapStylePromise = null;
  let copyEmailTooltip = null;
  let copyEmailTooltipTarget = null;

  const COPY_EMAIL_TOOLTIP = "Copy email";
  const COPIED_EMAIL_TOOLTIP = "Copied!";

  const MAPBOX_GL_SRC = "https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js";
  const MAPBOX_STYLE = window.CST_ENV?.MAPBOX_STYLE || "mapbox://styles/nubeek/cka7zizn720s71iogpmkvmw5z";
  const MAPBOX_BROKEN_LAYER_IDS = new Set(["hillshade"]);

  function isFormMode() {
    return detailMode === DETAIL_MODE.EDIT || detailMode === DETAIL_MODE.ADD;
  }

  function getEmptyLead() {
    return {
      id: "",
      name: "",
      firstName: "",
      surname: "",
      email: "",
      phone: "",
      location: "",
      locationPlace: null,
      franchise: "",
      company: "",
      ownerName: "",
      categoryId: null,
      website: "",
      linkedin: "",
      list: "",
      stage: page.LEAD_STAGES[0],
      note: "",
      source: "manual"
    };
  }

  function getSelectOptions(values) {
    return values.map((label) => ({ label, value: label }));
  }

  function getCategoryOptions() {
    return window.WefranchCategories.getOptions();
  }

  function enhanceSelect(select, options, placeholder, { singleSelect = true, values = [], creatable = false, menuActions = null } = {}) {
    if (!select || !window.WefranchFilterCombobox) return null;

    window.WefranchFilterCombobox.setOptions(select, options, { placeholder });
    if (!singleSelect) {
      select.multiple = true;
      if (values.length) {
        window.WefranchFilterCombobox.setValues(select, values);
      }
    }

    const api = window.WefranchFilterCombobox.enhance(select, {
      singleSelect,
      clearable: true,
      searchable: true,
      creatable,
      menuActions
    });

    if (!api) return null;
    return {
      ...api,
      getValues: () => window.WefranchFilterCombobox.getValues(select)
    };
  }

  function isDetailVisible() {
    return Boolean(card?.classList.contains("is-detail-open"));
  }

  function isAddVisible() {
    return detailMode === DETAIL_MODE.ADD && isDetailVisible();
  }

  function getExternalHref(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    return `https://${text}`;
  }

  function getDisplayUrl(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  function getLeadNameParts(lead) {
    const firstName = String(lead.firstName || "").trim();
    const surname = String(lead.surname || "").trim();
    if (firstName || surname) return { firstName, surname };

    const parts = String(lead.name || "").trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || "",
      surname: parts.slice(1).join(" ")
    };
  }

  function getInputFieldMarkup(label, id, value, { type = "text", autocomplete = "off", required = false, full = false } = {}) {
    const labelId = `${id}Label`;
    return `
      <div class="proto-modal-field${full ? " profile-modal-field-full" : ""}">
        <span id="${page.escapeHtml(labelId)}">${page.escapeHtml(label)}</span>
        <input
          class="proto-modal-control proto-modal-input"
          id="${page.escapeHtml(id)}"
          name="${page.escapeHtml(id)}"
          type="${page.escapeHtml(type)}"
          autocomplete="${page.escapeHtml(autocomplete)}"
          placeholder=" "
          aria-labelledby="${page.escapeHtml(labelId)}"
          ${required ? "required" : ""}
          value="${page.escapeHtml(value)}"
        >
      </div>
    `;
  }

  function getCopyEmailTooltip() {
    if (!copyEmailTooltip) {
      copyEmailTooltip = document.createElement("div");
      copyEmailTooltip.className = "filter-combobox-floating-tooltip contact-action-floating-tooltip";
      copyEmailTooltip.setAttribute("role", "tooltip");
    }

    return copyEmailTooltip;
  }

  function hideCopyEmailTooltip() {
    if (copyEmailTooltipTarget) {
      delete copyEmailTooltipTarget.dataset.tooltipState;
    }
    copyEmailTooltipTarget = null;
    copyEmailTooltip?.classList.remove("is-visible");
  }

  function getCopyEmailTooltipText(emailElement) {
    return emailElement.dataset.tooltipState === "copied" ? COPIED_EMAIL_TOOLTIP : COPY_EMAIL_TOOLTIP;
  }

  function showCopyEmailTooltip(emailElement) {
    if (!(emailElement instanceof Element)) return;

    const tooltip = getCopyEmailTooltip();
    tooltip.textContent = getCopyEmailTooltipText(emailElement);
    copyEmailTooltipTarget = emailElement;

    if (!tooltip.isConnected) {
      document.body.append(tooltip);
    }

    tooltip.classList.add("is-visible");
    window.fitTooltipToContent?.(tooltip);

    const targetRect = window.getElementTextBoundingRect?.(emailElement) ?? emailElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(viewportPadding, targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)),
      window.innerWidth - tooltipRect.width - viewportPadding
    );
    const top = Math.max(viewportPadding, targetRect.top - tooltipRect.height - 6);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  async function copyLeadEmail(emailElement) {
    const email = emailElement?.textContent?.trim();
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    emailElement.dataset.tooltipState = "copied";
    showCopyEmailTooltip(emailElement);
  }

  function getEditFieldButton(fieldKey, label) {
    return `
      <button
        class="profile-modal-field-edit"
        type="button"
        data-lead-detail-action="edit-field"
        data-lead-edit-field="${page.escapeHtml(fieldKey)}"
        aria-label="Edit ${page.escapeHtml(label)}"
      >
        <span class="profile-modal-field-edit-icon" aria-hidden="true"></span>
      </button>
    `;
  }

  function getFieldActionButtons(editField, label) {
    if (!editField) return "";

    return `<div class="profile-modal-field-actions">${getEditFieldButton(editField, label)}</div>`;
  }

  function getFieldMarkup(label, value, { href = "", full = false, external = false, editField = "", copyEmail = false } = {}) {
    const text = String(value || "").trim();
    const display = href && text && external ? getDisplayUrl(text) : text;
    const content = copyEmail && text
      ? `<span class="ui-link ui-ellipsis contact-email-copy" tabindex="0" role="button">${page.escapeHtml(text)}</span>`
      : href && display
        ? `<a class="ui-link ui-ellipsis" href="${page.escapeHtml(href)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${page.escapeHtml(display)}</a>`
        : `<strong class="${display ? "" : "dataset-empty-value"}">${display ? page.escapeHtml(display) : "–"}</strong>`;

    return `
      <div class="profile-modal-field ${full ? "profile-modal-field-full" : ""}${editField ? " is-editable" : ""}">
        <div class="profile-modal-field-body">
          <span>${page.escapeHtml(label)}</span>
          ${content}
        </div>
        ${getFieldActionButtons(editField, label)}
      </div>
    `;
  }

  function getFranchiseViewMarkup(lead) {
    const franchises = page.splitFranchiseValues(lead.franchise);
    if (!franchises.length) return getFieldMarkup("Franchise", "", { editField: "franchise" });

    return `
      <div class="profile-modal-field is-editable">
        <div class="profile-modal-field-body">
          <span>Franchise</span>
          <div class="lead-franchise-view-pills">
            ${franchises.map((name) => `<span class="lead-franchise-view-pill">${page.escapeHtml(name)}</span>`).join("")}
          </div>
        </div>
        ${getFieldActionButtons("franchise", "Franchise")}
      </div>
    `;
  }

  function getSelectFieldMarkup(label, field, lead) {
    const options = field === "stage" ? page.LEAD_STAGES : page.LEAD_LISTS;
    return `
      <div class="profile-modal-field lead-detail-select-field is-editable">
        <div class="profile-modal-field-body">
          <span>${page.escapeHtml(label)}</span>
          ${page.getSelectMarkup(lead.id, field, lead[field], options, "Select")}
        </div>
        ${getFieldActionButtons(field, label)}
      </div>
    `;
  }

  function getLocationFieldMarkup() {
    return `
      <div class="proto-modal-field">
        <span id="detailLeadLocationLabel">Location</span>
        <div class="filter-select-field filter-location-search-field is-single-select" id="detailLeadLocationField">
          <div class="filter-combobox-control">
            <input
              class="filter-combobox-input"
              id="detailLeadLocationInput"
              type="text"
              inputmode="search"
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="false"
              aria-controls="detailLeadLocationSuggestions"
              placeholder="Select"
              aria-labelledby="detailLeadLocationLabel"
            >
          </div>
          <div class="filter-combobox-menu" id="detailLeadLocationMenu" aria-hidden="true">
            <div
              class="filter-combobox-options proto-scrollbar"
              id="detailLeadLocationSuggestions"
              role="listbox"
              aria-label="Location suggestions"
            ></div>
          </div>
          <img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
        </div>
        <div class="lead-detail-location-map" id="detailLeadLocationMap" hidden></div>
      </div>
    `;
  }

  function getFormSelectFieldMarkup(label, fieldKey) {
    const inputId = `detailLead${fieldKey[0].toUpperCase()}${fieldKey.slice(1)}`;
    return `
      <div class="proto-modal-field">
        <span id="${inputId}Label">${page.escapeHtml(label)}</span>
        <div class="filter-select-field" id="${inputId}Field">
          <select class="ui-select filter-field-select" id="${inputId}Select" data-input-id="${inputId}Input" aria-labelledby="${inputId}Label">
            <option value="">Select...</option>
          </select>
          <img src="../../assets/icons/chevron.svg" alt="" aria-hidden="true">
        </div>
      </div>
    `;
  }

  function getMapboxToken() {
    return window.CST_ENV?.MAPBOX_ACCESS_TOKEN || "";
  }

  function getPlaceCoordinates(place) {
    const latitude = Number(place?.coordinates?.latitude);
    const longitude = Number(place?.coordinates?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }

  function getPlaceZoom(place) {
    if (place?.geoLevel === "address") return 10;
    if (place?.geoLevel === "district") return 5;
    if (place?.geoLevel === "region") return 4;
    return 7;
  }

  function getPointFeature(coordinates) {
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [coordinates.longitude, coordinates.latitude]
        }
      }]
    };
  }

  function ensureMapboxGl() {
    if (window.mapboxgl) return Promise.resolve();
    if (mapboxGlLoader) return mapboxGlLoader;

    mapboxGlLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = MAPBOX_GL_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Mapbox GL."));
      document.head.append(script);
    });
    return mapboxGlLoader;
  }

  function loadMapStyle(token) {
    if (mapStylePromise) return mapStylePromise;

    const stylePath = String(MAPBOX_STYLE).replace(/^mapbox:\/\/styles\//, "");
    const url = `https://api.mapbox.com/styles/v1/${stylePath}?access_token=${encodeURIComponent(token)}`;

    mapStylePromise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load map style (${response.status})`);
        return response.json();
      })
      .then((style) => {
        style.layers = (style.layers || []).filter((layer) => !MAPBOX_BROKEN_LAYER_IDS.has(layer.id));
        return style;
      })
      .catch(() => MAPBOX_STYLE);

    return mapStylePromise;
  }

  function destroyLocationMap({ cancelPending = false } = {}) {
    if (cancelPending) locationMapRequestId += 1;
    detailLocationMap?.remove();
    detailLocationMap = null;
    detailLocationMapPoint = null;
    const container = document.getElementById("detailLeadLocationMap");
    if (container) container.hidden = true;
  }

  async function resolvePlaceWithCoordinates(place) {
    const normalized = window.WefranchLocationSearch?.normalizePlace?.(place) || null;
    if (!normalized) return null;
    if (getPlaceCoordinates(normalized)) return normalized;

    const suggestions = await window.WefranchLocationSearch.fetchSuggestions(normalized.label);
    return suggestions.find((item) => item.label === normalized.label)
      || suggestions[0]
      || null;
  }

  function setLocationMapPoint(coordinates, place) {
    detailLocationMapPoint = { coordinates, place };
    const source = detailLocationMap?.getSource("lead-location-point");
    source?.setData(getPointFeature(coordinates));
    detailLocationMap?.jumpTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom: getPlaceZoom(place)
    });
    detailLocationMap?.resize();
  }

  async function syncLocationMap(place) {
    const requestId = ++locationMapRequestId;
    const container = document.getElementById("detailLeadLocationMap");
    const token = getMapboxToken();
    if (!container || !token || !place) {
      destroyLocationMap();
      return;
    }

    const resolved = await resolvePlaceWithCoordinates(place);
    if (requestId !== locationMapRequestId) return;

    const coordinates = getPlaceCoordinates(resolved);
    if (!coordinates) {
      destroyLocationMap();
      return;
    }

    container.hidden = false;
    detailLocationMapPoint = { coordinates, place: resolved };

    if (detailLocationMap) {
      setLocationMapPoint(coordinates, resolved);
      return;
    }

    try {
      const [, mapStyle] = await Promise.all([ensureMapboxGl(), loadMapStyle(token)]);
      if (requestId !== locationMapRequestId || !document.getElementById("detailLeadLocationMap")) return;
      if (!window.mapboxgl) {
        destroyLocationMap();
        return;
      }

      window.mapboxgl.accessToken = token;
      detailLocationMap = new window.mapboxgl.Map({
        container,
        style: mapStyle,
        center: [coordinates.longitude, coordinates.latitude],
        zoom: getPlaceZoom(resolved),
        projection: "mercator",
        attributionControl: false,
        interactive: false,
        preserveDrawingBuffer: true
      });

      detailLocationMap.on("load", () => {
        if (!detailLocationMap || !detailLocationMapPoint) return;
        const point = detailLocationMapPoint.coordinates;
        if (!detailLocationMap.getSource("lead-location-point")) {
          detailLocationMap.addSource("lead-location-point", {
            type: "geojson",
            data: getPointFeature(point)
          });
          detailLocationMap.addLayer({
            id: "lead-location-point",
            type: "circle",
            source: "lead-location-point",
            paint: {
              "circle-radius": 6,
              "circle-color": "#8065e8",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2
            }
          });
        }
        detailLocationMap.jumpTo({
          center: [point.longitude, point.latitude],
          zoom: getPlaceZoom(detailLocationMapPoint.place)
        });
        detailLocationMap.resize();
      });
    } catch (error) {
      console.warn("Unable to show the lead location map.", error);
      destroyLocationMap();
    }
  }

  function destroyFormSelects() {
    destroyLocationMap({ cancelPending: true });
    detailListApi?.close();
    detailStageApi?.close();
    detailCategoryApi?.close();
    detailFranchiseApi?.close();
    detailCompanyApi?.close();
    detailLocationApi?.destroy();
    detailListApi = null;
    detailStageApi = null;
    detailCategoryApi = null;
    detailFranchiseApi = null;
    detailCompanyApi = null;
    detailLocationApi = null;
  }

  function isFormSelectOpen() {
    return Boolean(
      document.getElementById("detailLeadListField")?.classList.contains("is-open")
      || document.getElementById("detailLeadStageField")?.classList.contains("is-open")
      || document.getElementById("detailLeadCategoryField")?.classList.contains("is-open")
      || document.getElementById("detailLeadFranchiseField")?.classList.contains("is-open")
      || document.getElementById("detailLeadCompanyField")?.classList.contains("is-open")
      || document.getElementById("detailLeadLocationField")?.classList.contains("is-open")
    );
  }

  function bindFormSelects(lead) {
    const franchiseValues = page.splitFranchiseValues(lead.franchise);
    const companyName = page.getCompanyName(lead);
    detailListApi = enhanceSelect(
      document.getElementById("detailLeadListSelect"),
      getSelectOptions(page.LEAD_LISTS),
      "Select"
    );
    detailStageApi = enhanceSelect(
      document.getElementById("detailLeadStageSelect"),
      getSelectOptions(page.LEAD_STAGES),
      "Select"
    );
    detailCategoryApi = enhanceSelect(
      document.getElementById("detailLeadCategorySelect"),
      getCategoryOptions(),
      "Select"
    );
    detailFranchiseApi = enhanceSelect(
      document.getElementById("detailLeadFranchiseSelect"),
      getSelectOptions(page.getFranchiseOptions(undefined, franchiseValues)),
      "Select",
      { singleSelect: false, values: franchiseValues }
    );
    detailCompanyApi = enhanceSelect(
      document.getElementById("detailLeadCompanySelect"),
      getSelectOptions(page.getCompanyOptions(undefined, [companyName])),
      "Select",
      {
        singleSelect: true,
        creatable: true,
        menuActions: [
          {
            label: "Add new",
            icon: "../../assets/icons/add.svg",
            onClick({ query, create }) {
              if (query) create(query);
            }
          }
        ]
      }
    );
    if (lead.list) detailListApi?.setValue?.(lead.list, { dispatch: false });
    detailStageApi?.setValue?.(lead.stage || page.LEAD_STAGES[0], { dispatch: false });
    if (lead.categoryId) detailCategoryApi?.setValue?.(lead.categoryId, { dispatch: false });
    if (companyName) detailCompanyApi?.setValue?.(companyName, { dispatch: false });
    detailLocationApi = window.WefranchLocationSearch?.bindField?.(
      document.getElementById("detailLeadLocationField"),
      {
        placeholder: "Select",
        onChange(nextPlace) {
          void syncLocationMap(nextPlace);
        }
      }
    ) || null;
    const locationPlace = window.WefranchLocationSearch?.fromRecord?.(lead);
    if (locationPlace) detailLocationApi?.setValue?.(locationPlace);
    void syncLocationMap(locationPlace);
  }

  function getViewFieldsMarkup(lead) {
    const noteMarkup = lead.note
      ? getFieldMarkup("Note", lead.note, { full: true, editField: "note" })
      : "";

    return `
      ${getFieldMarkup("Email", lead.email, { editField: "email", copyEmail: true })}
      ${getFieldMarkup("Phone number", lead.phone, { editField: "phone" })}
      ${getFieldMarkup("Location", lead.location, { full: true, editField: "location" })}
      ${getFieldMarkup("Company", page.getCompanyName(lead), { editField: "company" })}
      ${getFranchiseViewMarkup(lead)}
      ${getFieldMarkup("Category", window.WefranchCategories.getRecordLabel(lead), { editField: "category" })}
      ${getFieldMarkup("Website", lead.website, { href: getExternalHref(lead.website), external: true, editField: "website" })}
      ${getFieldMarkup("LinkedIn", lead.linkedin, { href: getExternalHref(lead.linkedin), external: true, full: true, editField: "linkedin" })}
      ${getFieldMarkup("List", lead.list, { editField: "list" })}
      ${getSelectFieldMarkup("Stage", "stage", lead)}
      ${noteMarkup}
    `;
  }

  function getFormFieldsMarkup(lead) {
    const names = getLeadNameParts(lead);
    const requireContactFields = detailMode === DETAIL_MODE.ADD;

    return `
      <div class="lead-detail-name-row">
        ${getInputFieldMarkup("First name", "detailLeadFirstName", names.firstName, { autocomplete: "given-name", required: true })}
        ${getInputFieldMarkup("Surname", "detailLeadSurname", names.surname, { autocomplete: "family-name", required: requireContactFields })}
      </div>
      ${getInputFieldMarkup("Email", "detailLeadEmail", lead.email, { type: "email", autocomplete: "email", required: requireContactFields })}
      ${getInputFieldMarkup("Phone number", "detailLeadPhone", lead.phone, { type: "tel", autocomplete: "tel" })}
      ${getLocationFieldMarkup()}
      <div class="proto-modal-divider" aria-hidden="true"></div>
      ${getFormSelectFieldMarkup("Company", "company")}
      ${getFormSelectFieldMarkup("Franchise", "franchise")}
      ${getFormSelectFieldMarkup("Category", "category")}
      ${getInputFieldMarkup("Website", "detailLeadWebsite", lead.website)}
      ${getInputFieldMarkup("LinkedIn", "detailLeadLinkedin", lead.linkedin, { full: true })}
      ${getFormSelectFieldMarkup("List", "list")}
      ${getFormSelectFieldMarkup("Stage", "stage")}
      <div class="proto-modal-field">
        <span id="detailLeadNoteLabel">Note</span>
        <textarea class="proto-modal-control proto-modal-textarea" id="detailLeadNote" name="note" placeholder="Optional" aria-labelledby="detailLeadNoteLabel">${page.escapeHtml(lead.note)}</textarea>
      </div>
    `;
  }

  function getMetaFieldsMarkup(lead) {
    if (detailMode === DETAIL_MODE.ADD) return "";

    return `
      <div class="profile-modal-field-row">
        ${getFieldMarkup("Added", page.formatLeadDate(lead.addedAt))}
        ${getFieldMarkup("Source", page.getSourceLabel(lead), { href: page.getSourceHref(lead) })}
      </div>
    `;
  }

  function getHeroMarkup(lead) {
    if (detailMode === DETAIL_MODE.ADD) {
      return `
        <div class="profile-modal-hero">
          <span class="profile-avatar" aria-hidden="true">+</span>
          <h2 id="leadDetailName">Add lead</h2>
          <p>New lead</p>
        </div>
      `;
    }

    return `
      <div class="profile-modal-hero">
        <span class="profile-avatar" aria-hidden="true">${page.escapeHtml(page.getInitials(lead.name) || "?")}</span>
        <h2 id="leadDetailName">${page.escapeHtml(lead.name)}</h2>
        <p>${page.escapeHtml(page.getCompanyName(lead) || lead.list || "Lead")}</p>
      </div>
    `;
  }

  function getDetailActionsMarkup(lead) {
    if (isFormMode()) {
      return `
        <button class="ui-control ui-button ui-button-primary proto-modal-save" type="submit">Save</button>
        <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button" data-lead-detail-action="cancel">Cancel</button>
      `;
    }

    return `
      <button class="ui-control ui-button ui-button-primary profile-modal-primary is-saved" type="button" data-lead-id="${page.escapeHtml(lead.id)}" data-lead-detail-action="remove">Remove from leads</button>
      <button class="ui-control ui-button ui-button-secondary profile-modal-secondary" type="button" data-lead-detail-action="edit">Edit</button>
    `;
  }

  function syncDetailChrome() {
    const isOpen = isDetailVisible();
    const adding = detailMode === DETAIL_MODE.ADD;
    leadDetail?.classList.toggle("is-editing", isFormMode());
    leadDetail?.classList.toggle("is-adding", adding);
    leadDetailPanel?.setAttribute("aria-label", adding ? "Add lead" : "Lead details");
    leadDetailClose?.setAttribute("aria-label", adding ? "Close add lead" : "Close lead");
    addLeadBtn?.setAttribute("aria-expanded", String(adding && isOpen));
    addLeadBtn?.classList.toggle("is-active", adding && isOpen);
  }

  function renderLeadDetail(lead) {
    if (!leadDetailContent || !leadDetailActions) return;

    hideCopyEmailTooltip();
    destroyFormSelects();
    syncDetailChrome();

    if (leadDetailHero) leadDetailHero.innerHTML = getHeroMarkup(lead);
    leadDetailContent.innerHTML = `
      <div class="profile-modal-fields">
        ${isFormMode() ? getFormFieldsMarkup(lead) : getViewFieldsMarkup(lead)}
        ${getMetaFieldsMarkup(lead)}
      </div>
    `;

    leadDetailContent.scrollTop = 0;
    if (isFormMode()) bindFormSelects(lead);
    leadDetailActions.innerHTML = getDetailActionsMarkup(lead);
  }

  function getLeadFormFocusTarget(fieldKey) {
    const focusIds = {
      email: "detailLeadEmail",
      phone: "detailLeadPhone",
      location: "detailLeadLocationInput",
      company: "detailLeadCompanyInput",
      franchise: "detailLeadFranchiseInput",
      category: "detailLeadCategoryInput",
      website: "detailLeadWebsite",
      linkedin: "detailLeadLinkedin",
      list: "detailLeadListInput",
      stage: "detailLeadStageInput",
      note: "detailLeadNote"
    };

    return document.getElementById(focusIds[fieldKey] || "detailLeadFirstName");
  }

  function focusLeadFormField(fieldKey) {
    const target = getLeadFormFocusTarget(fieldKey);
    if (!target) return;

    target.focus({ preventScroll: true });
    (target.closest(".proto-modal-field") || target).scrollIntoView({
      block: "center",
      inline: "nearest"
    });
  }

  function enterLeadEdit(fieldKey) {
    if (isFormMode() || !pendingDetailLeadId) return;

    const lead = page.getLead(pendingDetailLeadId);
    if (!lead) return;

    detailMode = DETAIL_MODE.EDIT;
    renderLeadDetail(lead);
    focusLeadFormField(fieldKey);
  }

  function getDetailInputValue(id) {
    return document.getElementById(id)?.value.trim() || "";
  }

  function readFormValues() {
    const firstName = getDetailInputValue("detailLeadFirstName");
    const surname = getDetailInputValue("detailLeadSurname");

    return {
      firstName,
      surname,
      name: [firstName, surname].filter(Boolean).join(" "),
      email: getDetailInputValue("detailLeadEmail"),
      phone: getDetailInputValue("detailLeadPhone"),
      location: detailLocationApi?.getValue?.()?.label || "",
      locationPlace: window.WefranchLocationSearch.toStoredPlace(detailLocationApi?.getValue?.()) || null,
      franchise: page.joinFranchiseValues(detailFranchiseApi?.getValues?.() || []),
      company: detailCompanyApi?.getValue?.() || "",
      ownerName: detailCompanyApi?.getValue?.() || "",
      categoryId: detailCategoryApi?.getValue?.() || null,
      website: getDetailInputValue("detailLeadWebsite"),
      linkedin: getDetailInputValue("detailLeadLinkedin"),
      list: detailListApi?.getValue?.() || "",
      stage: detailStageApi?.getValue?.() || page.LEAD_STAGES[0],
      note: getDetailInputValue("detailLeadNote")
    };
  }

  function isValidLeadEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showLeadFormErrors() {
    const firstName = document.getElementById("detailLeadFirstName");
    const surname = document.getElementById("detailLeadSurname");
    const email = document.getElementById("detailLeadEmail");
    const fieldErrors = window.WefranchFieldErrors;
    const requireContactFields = detailMode === DETAIL_MODE.ADD;
    let firstInvalid = null;

    if (!firstName?.value.trim()) {
      fieldErrors?.set(firstName, "Enter a first name");
      firstInvalid = firstName;
    }

    if (requireContactFields && !surname?.value.trim()) {
      fieldErrors?.set(surname, "Enter a surname");
      firstInvalid = firstInvalid || surname;
    }

    const emailValue = email?.value.trim() || "";
    if (requireContactFields && !emailValue) {
      fieldErrors?.set(email, "Enter an email address");
      firstInvalid = firstInvalid || email;
    } else if (emailValue && !isValidLeadEmail(emailValue)) {
      fieldErrors?.set(email, "Enter a valid email address");
      firstInvalid = firstInvalid || email;
    }

    firstInvalid?.focus({ preventScroll: true });
    return Boolean(firstInvalid);
  }

  function saveLeadForm() {
    if (!isFormMode()) return;

    window.WefranchFieldErrors?.clearAll(leadDetailForm, { silent: true });
    if (showLeadFormErrors()) return;

    const values = readFormValues();

    destroyFormSelects();

    if (detailMode === DETAIL_MODE.ADD) {
      const next = page.addLead({ ...values, source: "manual" });
      if (!next) return;
      detailMode = DETAIL_MODE.READ;
      pendingDetailLeadId = next.id;
      page.setSelectedLead(next.id);
      renderLeadDetail(next);
      return;
    }

    if (!pendingDetailLeadId) return;
    detailMode = DETAIL_MODE.READ;
    page.updateLead(pendingDetailLeadId, values);
  }

  function cancelLeadForm() {
    if (detailMode === DETAIL_MODE.ADD) {
      closeLeadDetail();
      return;
    }

    if (detailMode !== DETAIL_MODE.EDIT) return;

    detailMode = DETAIL_MODE.READ;
    destroyFormSelects();
    const lead = page.getLead(pendingDetailLeadId);
    if (lead) renderLeadDetail(lead);
  }

  function setDetailOpen(isOpen) {
    if (!card || !leadDetailPanel) return;

    card.classList.toggle("is-detail-open", Boolean(isOpen));
    leadDetailPanel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) leadDetailPanel.removeAttribute("inert");
    else leadDetailPanel.setAttribute("inert", "");
    syncDetailChrome();
  }

  function resetDetailState() {
    destroyFormSelects();
    detailMode = DETAIL_MODE.READ;
    pendingDetailLeadId = null;
    page.setSelectedLead(null);
    leadDetail?.classList.remove("is-editing", "is-adding");
    syncDetailChrome();
  }

  function closeLeadDetail({ restoreFocus = true } = {}) {
    hideCopyEmailTooltip();
    if (!isDetailVisible()) {
      resetDetailState();
      lastDetailTrigger = null;
      return;
    }

    setDetailOpen(false);
    resetDetailState();

    const trigger = lastDetailTrigger;
    lastDetailTrigger = null;
    if (restoreFocus && trigger instanceof HTMLElement && document.contains(trigger)) {
      trigger.focus();
    }
  }

  function openLeadDetail(id, trigger = null) {
    const lead = page.getLead(id);
    if (!lead || !leadDetailPanel) return;

    if (pendingDetailLeadId === id && detailMode === DETAIL_MODE.READ && isDetailVisible()) {
      closeLeadDetail({ restoreFocus: false });
      return;
    }

    destroyFormSelects();
    detailMode = DETAIL_MODE.READ;
    pendingDetailLeadId = id;
    lastDetailTrigger = trigger;
    page.setSelectedLead(id);
    renderLeadDetail(lead);
    setDetailOpen(true);
  }

  function openAddLead(trigger = null) {
    if (!leadDetailPanel) return;

    lastDetailTrigger = trigger;
    if (isAddVisible()) {
      document.getElementById("detailLeadFirstName")?.focus({ preventScroll: true });
      return;
    }

    destroyFormSelects();
    detailMode = DETAIL_MODE.ADD;
    pendingDetailLeadId = null;
    page.setSelectedLead(null);
    renderLeadDetail(getEmptyLead());
    setDetailOpen(true);
    document.getElementById("detailLeadFirstName")?.focus({ preventScroll: true });
  }

  function syncLeadDetail() {
    if (!isDetailVisible()) return;

    if (detailMode === DETAIL_MODE.ADD) return;

    if (!pendingDetailLeadId) {
      closeLeadDetail({ restoreFocus: false });
      return;
    }

    const lead = page.getLead(pendingDetailLeadId);
    if (!lead) {
      closeLeadDetail({ restoreFocus: false });
      return;
    }

    if (detailMode === DETAIL_MODE.READ) renderLeadDetail(lead);
    page.setSelectedLead(pendingDetailLeadId);
  }

  leadDetailPanel?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target.closest(".profile-modal-close")) {
      closeLeadDetail();
      return;
    }

    const action = event.target.closest("[data-lead-detail-action]")?.dataset.leadDetailAction;
    if (action === "edit") {
      enterLeadEdit();
      return;
    }
    if (action === "edit-field") {
      enterLeadEdit(event.target.closest("[data-lead-edit-field]")?.dataset.leadEditField);
      return;
    }

    const emailCopy = event.target.closest(".contact-email-copy");
    if (emailCopy) {
      event.preventDefault();
      void copyLeadEmail(emailCopy);
      return;
    }
    if (action === "cancel") {
      cancelLeadForm();
      return;
    }
    if (action !== "remove") return;

    const leadId = event.target.closest("[data-lead-id]")?.dataset.leadId || pendingDetailLeadId;
    closeLeadDetail({ restoreFocus: false });
    page.removeLead(leadId);
  });

  leadDetailPanel?.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) return;
    const emailCopy = event.target.closest(".contact-email-copy");
    if (!emailCopy || emailCopy === copyEmailTooltipTarget) return;
    showCopyEmailTooltip(emailCopy);
  });

  leadDetailPanel?.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const emailCopy = event.target.closest(".contact-email-copy");
    if (!emailCopy || emailCopy !== copyEmailTooltipTarget) return;
    if (event.relatedTarget instanceof Node && emailCopy.contains(event.relatedTarget)) return;
    hideCopyEmailTooltip();
  });

  leadDetailPanel?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const emailCopy = event.target.closest(".contact-email-copy");
    if (!emailCopy) return;
    event.preventDefault();
    void copyLeadEmail(emailCopy);
  });

  leadDetailContent?.addEventListener("scroll", hideCopyEmailTooltip, { passive: true });
  window.addEventListener("resize", hideCopyEmailTooltip);

  leadDetailForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveLeadForm();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isDetailVisible()) return;
    if (isFormSelectOpen()) {
      detailListApi?.close();
      detailStageApi?.close();
      detailCategoryApi?.close();
      detailFranchiseApi?.close();
      detailCompanyApi?.close();
      detailLocationApi?.close();
      return;
    }
    if (detailMode === DETAIL_MODE.EDIT) {
      cancelLeadForm();
      return;
    }
    closeLeadDetail();
  });

  window.WefranchLeadModals = {
    openLeadDetail,
    closeLeadDetail,
    openAddLead,
    closeAddLead: closeLeadDetail,
    syncLeadDetail,
    isDetailVisible,
    isAddVisible
  };
})();
