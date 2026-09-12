(function () {
  const LEADS_STORAGE_KEY = "wefranch:crm-leads";
  const COMPANIES_STORAGE_KEY = "wefranch:crm-companies";
  const LISTS_STORAGE_KEY = "wefranch:crm-lead-lists";
  const LISTS_STORAGE_VERSION = 2;
  const DEFAULT_LEAD_LISTS = [
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
      company: "",
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
    next.company = String(next.company || next.ownerName || "").trim();
    next.ownerName = next.company;
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

  function compareNames(left, right) {
    return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
  }

  function readCustomCompanies() {
    try {
      const savedValue = window.localStorage?.getItem(COMPANIES_STORAGE_KEY);
      if (!savedValue) return [];

      const parsedValue = JSON.parse(savedValue);
      if (!Array.isArray(parsedValue)) return [];

      return [...new Set(
        parsedValue
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )].sort(compareNames);
    } catch (error) {
      console.warn("Unable to read saved companies.", error);
      return [];
    }
  }

  function writeCustomCompanies(names) {
    try {
      window.localStorage?.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(names));
    } catch (error) {
      console.warn("Unable to save companies.", error);
    }
  }

  function rememberCompany(name) {
    const next = String(name || "").trim();
    if (!next) return "";

    const names = readCustomCompanies();
    if (names.some((item) => compareNames(item, next) === 0)) return next;

    names.push(next);
    names.sort(compareNames);
    writeCustomCompanies(names);
    return next;
  }

  function getFranchiseeCompanyNames() {
    const names = new Set(readCustomCompanies());

    (window.cstDumpData?.owners || []).forEach((owner) => {
      const name = String(owner?.name || "").trim();
      if (name) names.add(name);
    });

    (window.ownersData || []).forEach((owner) => {
      const name = String(owner?.ownerName || "").trim();
      if (name) names.add(name);
    });

    return [...names].sort(compareNames);
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
    rememberCompany(nextRecord.company);
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

  function remapList(fromName, toName) {
    const from = String(fromName || "").trim();
    if (!from) return 0;

    const to = String(toName || "").trim();
    const leads = readLeads();
    let changed = 0;
    const nextLeads = leads.map((lead) => {
      if (lead.list !== from) return lead;
      changed += 1;
      return normalizeRecord({ ...lead, list: to }, lead);
    });

    if (changed) writeLeads(nextLeads);
    return changed;
  }

  function normalizeListName(value) {
    return String(value || "").trim();
  }

  function readLists() {
    try {
      const savedValue = window.localStorage?.getItem(LISTS_STORAGE_KEY);
      if (!savedValue) return [...DEFAULT_LEAD_LISTS];

      const parsedValue = JSON.parse(savedValue);
      if (parsedValue?.version === LISTS_STORAGE_VERSION && Array.isArray(parsedValue.lists)) {
        const lists = parsedValue.lists.map(normalizeListName).filter(Boolean);
        return lists.length ? lists : [...DEFAULT_LEAD_LISTS];
      }

      if (Array.isArray(parsedValue)) {
        const extras = parsedValue.map(normalizeListName).filter(Boolean);
        const seen = new Set(DEFAULT_LEAD_LISTS);
        return [
          ...DEFAULT_LEAD_LISTS,
          ...extras.filter((name) => {
            if (seen.has(name)) return false;
            seen.add(name);
            return true;
          })
        ];
      }
    } catch (error) {
      console.warn("Unable to read saved lead lists.", error);
    }

    return [...DEFAULT_LEAD_LISTS];
  }

  function writeLists(lists) {
    try {
      window.localStorage?.setItem(LISTS_STORAGE_KEY, JSON.stringify({
        version: LISTS_STORAGE_VERSION,
        lists: lists.map(normalizeListName).filter(Boolean)
      }));
    } catch (error) {
      console.warn("Unable to save lead lists.", error);
    }
  }

  function getLists() {
    return readLists();
  }

  function rememberList(name) {
    const nextName = normalizeListName(name);
    if (!nextName) return nextName;

    const lists = readLists();
    if (lists.includes(nextName)) return nextName;

    lists.push(nextName);
    writeLists(lists);
    return nextName;
  }

  function listNameExists(name, exceptName = "") {
    const needle = normalizeListName(name).toLocaleLowerCase();
    const except = normalizeListName(exceptName).toLocaleLowerCase();
    return getKnownLists().some((item) => {
      const value = item.toLocaleLowerCase();
      return value === needle && value !== except;
    });
  }

  function renameList(fromName, toName) {
    const from = normalizeListName(fromName);
    const to = normalizeListName(toName);
    if (!from || !to) return null;
    if (from === to) return to;
    if (listNameExists(to, from)) return null;

    const lists = readLists();
    const index = lists.indexOf(from);
    if (index >= 0) lists[index] = to;
    else lists.push(to);
    writeLists(lists);
    remapList(from, to);
    return to;
  }

  function removeList(name) {
    const listName = normalizeListName(name);
    if (!listName) return false;

    const lists = readLists();
    const index = lists.indexOf(listName);
    if (index < 0 && !getKnownLists().includes(listName)) return false;

    if (index >= 0) {
      lists.splice(index, 1);
      writeLists(lists);
    }
    remapList(listName, "");
    return true;
  }

  function getKnownLists() {
    const seen = new Set();
    const lists = [];

    [...getLists(), ...getAll().map((lead) => normalizeListName(lead.list))].forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      lists.push(name);
    });

    return lists;
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
    LISTS_STORAGE_KEY,
    DEFAULT_LEAD_LISTS,
    get LEAD_LISTS() {
      return getLists();
    },
    LEAD_STAGES,
    SOURCE_DATASET_LABELS,
    getAll,
    getById,
    upsert,
    remove,
    remapList,
    getLists,
    getKnownLists,
    rememberList,
    renameList,
    removeList,
    listNameExists,
    buildSourceId,
    parseSourceId,
    getSourceDatasetFromId,
    getSourceDatasetKey,
    getSourceLabel,
    getSourceHref,
    getCustomCompanies: readCustomCompanies,
    getFranchiseeCompanyNames,
    rememberCompany
  };
})();
