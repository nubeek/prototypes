(function () {
  const LEADS_STORAGE_KEY = "wefranch:crm-leads";
  const LEAD_LISTS = [
    "Denver territory prospects",
    "High priority outreach",
    "Multi-unit operators",
    "Q2 pipeline",
    "West coast expansion"
  ];
  const LEAD_STAGES = ["New", "Contacted", "Qualified", "Unqualified", "Converted"];
  const SOURCE_DATASET_LABELS = {
    franchisees: "Franchisees",
    candidates: "Candidates",
    searchers: "Searchers",
    athletes: "Athletes",
    locations: "Locations"
  };

  function createManualId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeRecord(record, existing = null) {
    const next = {
      id: "",
      name: "",
      firstName: "",
      surname: "",
      email: "",
      phone: "",
      franchise: "",
      ownerName: "",
      location: "",
      website: "",
      linkedin: "",
      categoryId: null,
      list: "",
      stage: LEAD_STAGES[0],
      note: "",
      source: "manual",
      sourceDataset: "",
      sourceView: "",
      addedAt: existing?.addedAt || new Date().toISOString(),
      ...(existing || {}),
      ...(record || {})
    };

    if (!next.id) {
      next.id = `manual:${createManualId()}`;
    }

    if (!LEAD_STAGES.includes(next.stage)) {
      next.stage = existing?.stage || LEAD_STAGES[0];
    }

    next.name = String(next.name || "").trim();
    next.firstName = String(next.firstName || "").trim();
    next.surname = String(next.surname || "").trim();
    next.email = String(next.email || "").trim();
    next.phone = String(next.phone || "").trim();
    next.franchise = String(next.franchise || "").trim();
    next.ownerName = String(next.ownerName || "").trim();
    const storedPlace = window.WefranchLocationSearch?.toStoredPlace?.(next.locationPlace)
      || window.WefranchLocationSearch?.toStoredPlace?.(window.WefranchLocationSearch?.fromRecord?.(next));
    if (storedPlace) {
      next.location = storedPlace.label;
      next.locationPlace = storedPlace;
    } else {
      next.location = String(next.location || "").trim();
      delete next.locationPlace;
    }
    next.website = String(next.website || "").trim();
    next.linkedin = String(next.linkedin || "").trim();
    const hydratedCategory = window.WefranchCategories?.hydrateRecord?.(
      {
        categoryId: next.categoryId,
        category: next.category,
        categoryOriginal: next.categoryOriginal,
        categoryNeedsReview: next.categoryNeedsReview
      },
      { source: next.source === "cst" ? "cst" : "leads" }
    ) || {};
    next.categoryId = hydratedCategory.categoryId || null;
    if (hydratedCategory.categoryNeedsReview) {
      next.categoryOriginal = hydratedCategory.categoryOriginal;
      next.categoryNeedsReview = true;
    } else {
      delete next.categoryOriginal;
      delete next.categoryNeedsReview;
    }
    delete next.category;
    delete next.categoryIds;
    next.list = String(next.list || "").trim();
    next.note = String(next.note || "").trim();
    next.source = next.source === "cst" ? "cst" : "manual";
    next.sourceView = next.source === "cst"
      ? String(next.sourceView || "").trim() || getSourceDatasetKey(next)
      : "";
    next.sourceDataset = next.source === "cst"
      ? String(next.sourceDataset || "").trim()
        || SOURCE_DATASET_LABELS[next.sourceView]
        || getSourceDatasetFromId(next.id)
      : "";

    if (!next.name) {
      next.name = [next.firstName, next.surname].filter(Boolean).join(" ");
    }

    return next;
  }

  function readLeads() {
    try {
      const savedValue = window.localStorage?.getItem(LEADS_STORAGE_KEY);
      if (!savedValue) return [];

      const parsedValue = JSON.parse(savedValue);
      if (!Array.isArray(parsedValue)) return [];

      return parsedValue
        .filter((item) => item && typeof item === "object")
        .map((item) => normalizeRecord(item, item));
    } catch (error) {
      console.warn("Unable to read saved leads.", error);
      return [];
    }
  }

  function writeLeads(leads) {
    try {
      window.localStorage?.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch (error) {
      console.warn("Unable to save leads.", error);
    }
  }

  function getAll() {
    return readLeads();
  }

  function getById(id) {
    if (!id) return null;
    return readLeads().find((lead) => lead.id === id) || null;
  }

  function upsert(record) {
    if (!record || typeof record !== "object") return null;

    const leads = readLeads();
    const nextId = record.id || "";
    const index = nextId ? leads.findIndex((lead) => lead.id === nextId) : -1;
    const existing = index >= 0 ? leads[index] : null;
    const nextRecord = normalizeRecord(record, existing);

    if (index >= 0) {
      leads[index] = nextRecord;
    } else {
      leads.unshift(nextRecord);
    }

    writeLeads(leads);
    return nextRecord;
  }

  function remove(id) {
    if (!id) return false;

    const leads = readLeads();
    const nextLeads = leads.filter((lead) => lead.id !== id);
    if (nextLeads.length === leads.length) return false;

    writeLeads(nextLeads);
    return true;
  }

  function buildSourceId({ ownerIndex, nodeId, prospectRowKey } = {}) {
    if (prospectRowKey) {
      return `prospect:${prospectRowKey}`;
    }

    const index = Number(ownerIndex);
    if (Number.isFinite(index)) {
      const node = nodeId != null && nodeId !== "" ? String(nodeId) : "main";
      return `owner:${index}:${node}`;
    }

    return `manual:${createManualId()}`;
  }

  function parseSourceId(id) {
    const value = String(id || "");
    if (value.startsWith("prospect:")) {
      return { kind: "prospect", prospectRowKey: value.slice("prospect:".length) };
    }

    if (value.startsWith("owner:")) {
      const parts = value.split(":");
      const ownerIndex = Number(parts[1]);
      if (!Number.isFinite(ownerIndex)) return null;
      const nodeId = parts.slice(2).join(":");
      return {
        kind: "owner",
        ownerIndex,
        nodeId: !nodeId || nodeId === "main" ? null : nodeId
      };
    }

    if (value.startsWith("manual:")) {
      return { kind: "manual", id: value };
    }

    return null;
  }

  function getSourceDatasetFromId(id) {
    const key = getSourceDatasetKey({ id, source: "cst" });
    return SOURCE_DATASET_LABELS[key] || "";
  }

  function getSourceDatasetKey(lead) {
    if (!lead || (lead.source && lead.source !== "cst")) return "";

    const stored = String(lead.sourceView || "").trim();
    if (stored && SOURCE_DATASET_LABELS[stored]) return stored;

    const parsed = parseSourceId(lead.id);
    if (parsed?.kind === "owner") return "franchisees";
    if (parsed?.kind === "prospect") {
      const view = String(parsed.prospectRowKey || "").split(":")[0];
      if (SOURCE_DATASET_LABELS[view]) return view;
    }

    const label = String(lead.sourceDataset || "").trim();
    const match = Object.entries(SOURCE_DATASET_LABELS).find(([, name]) => name === label);
    return match ? match[0] : "";
  }

  function getSourceLabel(lead) {
    if (!lead || lead.source !== "cst") return "Manual";

    const key = getSourceDatasetKey(lead);
    return SOURCE_DATASET_LABELS[key] || String(lead.sourceDataset || "").trim() || "Prospects";
  }

  function getSourceHref(lead) {
    const view = getSourceDatasetKey(lead);
    return view ? `../cst/?view=${encodeURIComponent(view)}` : "";
  }

  window.WefranchLeadsStore = {
    STORAGE_KEY: LEADS_STORAGE_KEY,
    LEAD_LISTS,
    LEAD_STAGES,
    SOURCE_DATASET_LABELS,
    getAll,
    getById,
    upsert,
    remove,
    buildSourceId,
    parseSourceId,
    getSourceDatasetFromId,
    getSourceDatasetKey,
    getSourceLabel,
    getSourceHref
  };
})();
