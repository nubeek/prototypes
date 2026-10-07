/* Shared campaign list. Prospects and Campaigns both write here when a
   campaign is scheduled, and the Campaigns overview reads it back. */
(function () {
  const STORAGE_KEY = "wefranch:campaigns";
  const NAME_MAX = 64;
  const STATUSES = new Set(["draft", "scheduled", "sending", "paused", "completed"]);

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function clampName(value) {
    const name = String(value || "").trim() || "Untitled campaign";
    return name.slice(0, NAME_MAX);
  }

  function iso(monthOffset, day, hour = 9, minute = 0) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, minute, 0, 0);
    if (monthOffset === 0 && date.getTime() > Date.now()) {
      date.setTime(Date.now() - 60 * 60 * 1000);
    }
    return date.toISOString();
  }

  function upcoming(day, hour, minute) {
    const now = new Date();
    let date = new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0, 0);
    if (date.getTime() <= Date.now() + 60 * 1000) {
      date = new Date(now.getFullYear(), now.getMonth() + 1, day, hour, minute, 0, 0);
    }
    return date.toISOString();
  }

  function sender(name, email) {
    return { name, email };
  }

  function seedCampaigns() {
    const soon = new Date(Date.now() + 4 * 60 * 1000).toISOString();
    return [
      {
        id: "seed-chirp-family",
        name: "Join the Chirp Photo Labs Family",
        type: "single",
        emailCount: 1,
        sender: sender("Philip Litassy", "philip.litassy@wefanch.com"),
        audienceTitle: "Texas Restaurant Groups",
        recipientCount: 640,
        status: "scheduled",
        attentionReason: "",
        startAt: soon,
        endAt: null,
        sentCount: 0,
        opens: 0,
        replies: 0,
        converts: 0,
        createdAt: soon
      },
      {
        id: "seed-print-success",
        name: "Print Your Success with Chirp",
        type: "single",
        emailCount: 1,
        sender: sender("Philip Litassy", "philip.litassy@wefanch.com"),
        audienceTitle: "Midwest Operator Groups",
        recipientCount: 1000,
        status: "sending",
        attentionReason: "",
        startAt: iso(0, 1, 9, 0),
        endAt: null,
        sentCount: 450,
        opens: 210,
        replies: 24,
        converts: 18,
        createdAt: iso(0, 1, 9, 0)
      },
      {
        id: "seed-meet-team",
        name: "Meet the Chirp Photo Labs Team",
        type: "sequence",
        emailCount: 3,
        sender: sender("Gregory Ugwi", "gregory.ugwi@wefranch.com"),
        audienceTitle: "Fitness Groups",
        recipientCount: 800,
        status: "sending",
        attentionReason: "",
        startAt: iso(0, 2, 9, 0),
        endAt: null,
        sentCount: 720,
        opens: 390,
        replies: 48,
        converts: 40,
        createdAt: iso(0, 2, 9, 0)
      },
      {
        id: "seed-october-update",
        name: "October Market Update",
        type: "single",
        emailCount: 1,
        sender: sender("Philip Litassy", "philip.litassy@wefanch.com"),
        audienceTitle: "200+ Unit Groups",
        recipientCount: 900,
        status: "completed",
        attentionReason: "",
        startAt: iso(0, 1, 9, 0),
        endAt: iso(0, 5, 17, 0),
        sentCount: 900,
        opens: 340,
        replies: 40,
        converts: 60,
        createdAt: iso(0, 1, 8, 0)
      },
      {
        id: "seed-wellness",
        name: "Wellness Operators Follow-up",
        type: "single",
        emailCount: 1,
        sender: sender("Gregory Ugwi", "gregory.ugwi@wefranch.com"),
        audienceTitle: "Wellness Operators",
        recipientCount: 500,
        status: "paused",
        attentionReason: "",
        startAt: iso(0, 4, 11, 0),
        endAt: null,
        sentCount: 200,
        opens: 80,
        replies: 9,
        converts: 10,
        createdAt: iso(0, 4, 11, 0)
      },
      {
        id: "seed-franchise",
        name: "New Franchise Opportunity",
        type: "single",
        emailCount: 1,
        sender: sender("Philip Litassy", "philip.litassy@wefanch.com"),
        audienceTitle: "Southeast Groups at Scale",
        recipientCount: 1200,
        status: "completed",
        attentionReason: "",
        startAt: iso(-1, 1, 9, 0),
        endAt: iso(-1, 28, 16, 0),
        sentCount: 1200,
        opens: 800,
        replies: 70,
        converts: 70,
        createdAt: iso(-1, 1, 9, 0)
      },
      {
        id: "seed-welcome",
        name: "Operator Welcome Series",
        type: "sequence",
        emailCount: 4,
        sender: sender("Gregory Ugwi", "gregory.ugwi@wefranch.com"),
        audienceTitle: "Popeyes Operators",
        recipientCount: 700,
        status: "completed",
        attentionReason: "",
        startAt: iso(-1, 4, 9, 0),
        endAt: iso(-1, 22, 15, 0),
        sentCount: 700,
        opens: 200,
        replies: 33,
        converts: 30,
        createdAt: iso(-1, 4, 9, 0)
      },
      {
        id: "seed-q4",
        name: "Q4 Territory Check-in",
        type: "single",
        emailCount: 1,
        sender: sender("Philip Litassy", "philip.litassy@wefanch.com"),
        audienceTitle: "California Mid-Size Groups",
        recipientCount: 180,
        status: "draft",
        attentionReason: "",
        startAt: null,
        endAt: null,
        sentCount: 0,
        opens: 0,
        replies: 0,
        converts: 0,
        createdAt: iso(0, 3, 14, 0)
      },
      {
        id: "seed-coffee",
        name: "Coffee Brands Introduction",
        type: "sequence",
        emailCount: 2,
        sender: sender("Gregory Ugwi", "gregory.ugwi@wefranch.com"),
        audienceTitle: "Coffee and Bakery Brands",
        recipientCount: 430,
        status: "scheduled",
        attentionReason: "",
        startAt: upcoming(9, 9, 0),
        endAt: null,
        sentCount: 0,
        opens: 0,
        replies: 0,
        converts: 0,
        createdAt: iso(0, 2, 16, 0)
      }
    ].map(normalize);
  }

  function normalize(record) {
    if (!record || typeof record !== "object") return null;
    const status = STATUSES.has(record.status) ? record.status : "draft";
    const type = record.type === "sequence" ? "sequence" : "single";
    const emailCount = Math.max(1, Math.round(Number(record.emailCount) || (type === "sequence" ? 2 : 1)));
    const senderRecord = record.sender && typeof record.sender === "object"
      ? {
        name: String(record.sender.name || "").trim(),
        email: String(record.sender.email || record.sender.emailAddress || "").trim()
      }
      : null;

    return {
      id: String(record.id || createId()),
      name: clampName(record.name),
      type,
      emailCount,
      sender: senderRecord && (senderRecord.name || senderRecord.email) ? senderRecord : null,
      audienceTitle: String(record.audienceTitle || "").trim(),
      recipientCount: Math.max(0, Math.round(Number(record.recipientCount) || 0)),
      status,
      attentionReason: String(record.attentionReason || "").trim(),
      startAt: record.startAt || null,
      endAt: record.endAt || null,
      sentCount: Math.max(0, Math.round(Number(record.sentCount) || 0)),
      opens: Math.max(0, Math.round(Number(record.opens) || 0)),
      replies: Math.max(0, Math.round(Number(record.replies) || 0)),
      converts: Math.max(0, Math.round(Number(record.converts) || 0)),
      createdAt: record.createdAt || new Date().toISOString()
    };
  }

  function isRemovedAttention(record) {
    if (!record || typeof record !== "object") return false;
    if (record.status === "attention") return true;
    return /sender domain not verified/i.test(String(record.attentionReason || ""));
  }

  function readStored() {
    try {
      const savedValue = window.localStorage?.getItem(STORAGE_KEY);
      if (!savedValue) return null;
      const parsed = JSON.parse(savedValue);
      if (!Array.isArray(parsed)) return null;
      const kept = parsed.filter((record) => !isRemovedAttention(record));
      return {
        campaigns: kept.map(normalize).filter(Boolean),
        dirty: kept.length !== parsed.length
      };
    } catch (error) {
      console.warn("Unable to read saved campaigns.", error);
      return null;
    }
  }

  const stored = readStored();
  let campaigns = stored ? stored.campaigns : null;
  if (!campaigns) {
    campaigns = seedCampaigns();
    writeStored();
  } else if (stored.dirty) {
    writeStored();
  }

  function writeStored() {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    } catch (error) {
      console.warn("Unable to save campaigns.", error);
    }
    window.dispatchEvent(new CustomEvent("wefranch:campaigns-change"));
  }

  function clone(campaign) {
    return {
      ...campaign,
      sender: campaign.sender ? { ...campaign.sender } : null
    };
  }

  function list() {
    return campaigns.map(clone);
  }

  function get(id) {
    const campaign = campaigns.find((entry) => entry.id === id);
    return campaign ? clone(campaign) : null;
  }

  function create(draft) {
    const status = STATUSES.has(draft?.status) ? draft.status : "sending";
    const record = normalize({
      ...draft,
      id: createId(),
      status,
      sentCount: draft?.sentCount || 0,
      opens: draft?.opens || 0,
      replies: draft?.replies || 0,
      converts: draft?.converts || 0,
      endAt: draft?.endAt || null,
      startAt: status === "draft" ? null : (draft?.startAt || new Date().toISOString()),
      createdAt: new Date().toISOString()
    });
    campaigns = [record, ...campaigns];
    writeStored();
    return clone(record);
  }

  function update(id, patch) {
    let updated = null;
    campaigns = campaigns.map((campaign) => {
      if (campaign.id !== id) return campaign;
      updated = normalize({ ...campaign, ...patch, id: campaign.id, createdAt: campaign.createdAt });
      return updated;
    });
    if (!updated) return null;
    writeStored();
    return clone(updated);
  }

  function duplicate(id) {
    const source = campaigns.find((campaign) => campaign.id === id);
    if (!source) return null;
    return create({
      ...source,
      name: clampName(`Copy of ${source.name}`),
      status: "draft",
      attentionReason: "",
      startAt: null,
      endAt: null,
      sentCount: 0,
      opens: 0,
      replies: 0,
      converts: 0
    });
  }

  function remove(id) {
    const next = campaigns.filter((campaign) => campaign.id !== id);
    if (next.length === campaigns.length) return false;
    campaigns = next;
    writeStored();
    return true;
  }

  window.WefranchCampaignsStore = {
    list,
    get,
    create,
    update,
    duplicate,
    remove
  };
})();
