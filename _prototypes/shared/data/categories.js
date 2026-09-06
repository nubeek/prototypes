(function (root) {
  const DATA_DIR = typeof __dirname === "string" ? __dirname : "";

  function readJsonSync(fileName) {
    if (typeof require === "function" && DATA_DIR) {
      const fs = require("fs");
      const path = require("path");
      return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8"));
    }

    const script = typeof document !== "undefined" ? document.currentScript : null;
    const baseUrl = script?.src ? new URL(".", script.src).href : "../shared/data/";
    const request = new XMLHttpRequest();
    request.open("GET", `${baseUrl}${fileName}`, false);
    request.send(null);
    if (request.status !== 200 && request.status !== 0) {
      throw new Error(`Unable to load ${fileName}`);
    }
    return JSON.parse(request.responseText);
  }

  const catalog = readJsonSync("categories.json");
  const legacy = readJsonSync("category-legacy.json");
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  const byId = new Map(categories.map((item) => [item.id, item]));
  const sharedLegacy = indexLabels(legacy.shared);
  const sourceLegacy = {
    cst: indexLabels(legacy.sources?.cst),
    territories: indexLabels(legacy.sources?.territories),
    leads: indexLabels(legacy.sources?.leads)
  };
  const brandLegacy = legacy.brands && typeof legacy.brands === "object" ? legacy.brands : {};

  function indexLabels(map) {
    const indexed = new Map();
    Object.entries(map || {}).forEach(([label, id]) => {
      indexed.set(normalizeKey(label), id);
    });
    return indexed;
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
  }

  function isId(value) {
    return byId.has(String(value || "").trim());
  }

  function get(id) {
    return byId.get(String(id || "").trim()) || null;
  }

  function getLabel(id) {
    return get(id)?.label || "";
  }

  function list() {
    return categories.map((item) => ({ ...item }));
  }

  function getOptions({ ids } = {}) {
    const allowed = Array.isArray(ids) && ids.length ? new Set(ids) : null;
    return categories
      .filter((item) => !allowed || allowed.has(item.id))
      .map((item) => ({ value: item.id, label: item.label }));
  }

  function lookupLegacy(value, source) {
    const key = normalizeKey(value);
    if (!key) return "";
    return sourceLegacy[source]?.get(key) || sharedLegacy.get(key) || "";
  }

  function resolve(value, { source = "", brandId = "" } = {}) {
    const original = value == null ? "" : String(value).trim();
    if (!original) {
      return { categoryId: null, original: "", unresolved: false };
    }

    if (isId(original)) {
      return { categoryId: original, original, unresolved: false };
    }

    const brandIdValue = String(brandId || "").trim();
    if (brandIdValue && brandLegacy[brandIdValue]) {
      return { categoryId: brandLegacy[brandIdValue], original, unresolved: false };
    }

    const mapped = lookupLegacy(original, source);
    if (mapped && isId(mapped)) {
      return { categoryId: mapped, original, unresolved: false };
    }

    return { categoryId: null, original, unresolved: true };
  }

  function resolveMany(values, options) {
    return (Array.isArray(values) ? values : []).map((value) => resolve(value, options));
  }

  function resolveFilterValues(values, options) {
    return resolveMany(values, options)
      .map((item) => item.categoryId)
      .filter(Boolean);
  }

  function getRecordId(record) {
    if (!record || typeof record !== "object") return null;
    if (isId(record.categoryId)) return record.categoryId;
    if (Array.isArray(record.categoryIds)) {
      const match = record.categoryIds.find((id) => isId(id));
      if (match) return match;
    }
    return null;
  }

  function getRecordIds(record) {
    if (!record || typeof record !== "object") return [];
    if (Array.isArray(record.categoryIds) && record.categoryIds.length) {
      return [...new Set(record.categoryIds.filter((id) => isId(id)))];
    }
    const id = getRecordId(record);
    return id ? [id] : [];
  }

  function getRecordLabel(record) {
    const id = getRecordId(record);
    if (id) return getLabel(id);
    return String(record?.categoryOriginal || "").trim();
  }

  function hydrateRecord(record, { source = "", brandId = "" } = {}) {
    if (!record || typeof record !== "object") return record;

    const rawValues = [];
    if (record.categoryId != null && record.categoryId !== "") rawValues.push(record.categoryId);
    if (Array.isArray(record.categoryIds)) rawValues.push(...record.categoryIds);
    if (Array.isArray(record.categories)) rawValues.push(...record.categories);
    if (record.category != null && record.category !== "") rawValues.push(record.category);

    const resolved = rawValues.length
      ? resolveMany(rawValues, { source, brandId: brandId || record.id })
      : [resolve("", { source, brandId })];
    const categoryIds = [...new Set(resolved.map((item) => item.categoryId).filter(Boolean))];
    const unresolvedItems = resolved.filter((item) => item.unresolved);
    const reviewOriginal = unresolvedItems.map((item) => item.original).filter(Boolean).join(", ")
      || String(record.categoryOriginal || "").trim();
    const keepReview = Boolean(record.categoryNeedsReview) || unresolvedItems.length > 0;

    const next = { ...record };
    delete next.category;
    delete next.categories;

    if (categoryIds.length) {
      next.categoryId = categoryIds[0];
      next.categoryIds = categoryIds;
      if (keepReview && reviewOriginal) {
        next.categoryOriginal = reviewOriginal;
        next.categoryNeedsReview = true;
      } else {
        delete next.categoryOriginal;
        delete next.categoryNeedsReview;
      }
      return next;
    }

    next.categoryId = null;
    next.categoryIds = [];
    if (keepReview && reviewOriginal) {
      next.categoryOriginal = reviewOriginal;
      next.categoryNeedsReview = true;
    } else {
      delete next.categoryOriginal;
      delete next.categoryNeedsReview;
    }
    return next;
  }

  function requireId(id, context) {
    const value = String(id || "").trim();
    if (!isId(value)) {
      throw new Error(`Invalid categoryId${context ? ` for ${context}` : ""}: ${JSON.stringify(id)}`);
    }
    return value;
  }

  function toStoredFields(record) {
    const id = getRecordId(record);
    if (id) return { categoryId: id };
    if (record?.categoryNeedsReview) {
      return {
        categoryId: null,
        categoryOriginal: String(record.categoryOriginal || "").trim(),
        categoryNeedsReview: true
      };
    }
    return { categoryId: null };
  }

  const api = {
    version: catalog.version || 1,
    notes: catalog.notes || {},
    list,
    get,
    getLabel,
    getOptions,
    isId,
    resolve,
    resolveMany,
    resolveFilterValues,
    getRecordId,
    getRecordIds,
    getRecordLabel,
    hydrateRecord,
    requireId,
    toStoredFields
  };

  root.WefranchCategories = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
