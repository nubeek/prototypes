/* Shared campaign list. Prospects and Campaigns both write here when a
   campaign is scheduled, and the Campaigns overview reads it back. */
(function () {
  const STORAGE_KEY = "wefranch:campaigns";
  const DIRECT_SEED_KEY = "wefranch:campaigns-direct-seeded";
  const SEED_CLICKS_KEY = "wefranch:campaigns-seed-clicks-v1";
  const NAME_MAX = 64;
  const STATUSES = new Set(["draft", "scheduled", "sending", "paused", "completed"]);
  // New direct emails wait, then leave in batches. Pause time is subtracted
  // from the clock so a hold delays both the countdown and the next batch.
  const DIRECT_COUNTDOWN_MS = 5 * 60 * 1000;
  const DIRECT_BATCH_SIZE = 10;
  const DIRECT_BATCH_INTERVAL_MS = 30 * 60 * 1000;
  const TEMPLATE_IDS = ["introduction", "territory-opportunity", "market-update", "follow-up", "event-invitation"];

  const seedMessage = (subjectLine, previewText, templateId) => ({ subjectLine, previewText, templateId });
  const SEED_MESSAGES = {
    "seed-chirp-family": [
      seedMessage("Join the Chirp Photo Labs family", "Bring an award-winning photo lab to your market.", "introduction")
    ],
    "seed-print-success": [
      seedMessage("Print your success with Chirp", "Open territories are going fast in the Midwest.", "territory-opportunity")
    ],
    "seed-meet-team": [
      seedMessage("Meet the team behind Chirp Photo Labs", "A quick hello from our franchise development team.", "introduction"),
      seedMessage("How our operators hit break-even in 14 months", "Real numbers from three Chirp locations.", "market-update"),
      seedMessage("Ready to talk territories?", "Book a 20-minute call with Gregory.", "follow-up")
    ],
    "seed-october-update": [
      seedMessage("October market update", "Unit growth, top-performing regions, and what's next.", "market-update")
    ],
    "seed-wellness": [
      seedMessage("Following up on wellness territories", "A few open markets near your current locations.", "follow-up")
    ],
    "seed-franchise": [
      seedMessage("A new franchise opportunity for your group", "Expand your portfolio with a proven concept.", "territory-opportunity")
    ],
    "seed-welcome": [
      seedMessage("Welcome to Wefranch", "Here is how we can help you find the right franchise.", "introduction"),
      seedMessage("Explore financial models for your market", "Forecast performance before you commit.", "market-update"),
      seedMessage("Join our next operator webinar", "Live Q&A with multi-unit operators.", "event-invitation"),
      seedMessage("Any questions so far?", "Reply to this email and we'll get back to you.", "follow-up")
    ],
    "seed-q4": [
      seedMessage("Q4 territory check-in", "", "follow-up")
    ],
    "seed-coffee": [
      seedMessage("Introducing our coffee and bakery brands", "Concepts built for high-traffic locations.", "introduction"),
      seedMessage("You're invited: coffee brands tasting day", "Meet the founders in person.", "event-invitation")
    ]
  };

  function hashString(value) {
    const text = String(value || "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

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
        clicks: 100,
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
        clicks: 145,
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
        clicks: 135,
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
        clicks: 45,
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
    ].concat(seedDirectEmails()).map(normalize);
  }

  function seedDirectEmails() {
    const direct = (id, name, from, recipient, recipientCount, sentAt, stats) => ({
      id,
      source: "direct",
      name,
      type: "single",
      emailCount: 1,
      sender: from,
      audienceTitle: recipient,
      recipientCount,
      status: "completed",
      attentionReason: "",
      startAt: sentAt,
      endAt: sentAt,
      sentCount: recipientCount,
      ...stats,
      createdAt: sentAt
    });
    const philip = sender("Philip Litassy", "philip.litassy@wefanch.com");
    const gregory = sender("Gregory Ugwi", "gregory.ugwi@wefranch.com");
    return [
      direct("seed-direct-follow-up", "Quick follow-up on our call", philip, "Maria Lopez", 1,
        iso(0, 3, 10, 15), { opens: 1, clicks: 0, replies: 1, converts: 0 }),
      direct("seed-direct-intro", "Introducing Chirp Photo Labs", gregory, "12 recipients", 12,
        iso(0, 2, 14, 30), { opens: 7, clicks: 3, replies: 2, converts: 1 }),
      direct("seed-direct-austin", "Territory availability in Austin", philip, "3 recipients", 3,
        iso(-1, 18, 11, 0), { opens: 2, clicks: 1, replies: 1, converts: 0 }),
      direct("seed-direct-next-steps", "Next steps for your franchise application", gregory, "Daniel Kim", 1,
        iso(-1, 9, 16, 45), { opens: 1, clicks: 1, replies: 0, converts: 0 })
    ];
  }

  // Delivered, unsubscribed, and spam counts are not tracked yet, so they are derived
  // from the sent count with a per-campaign rate that stays stable across reloads.
  function engagement(record) {
    const sent = Math.max(0, Math.round(Number(record?.sentCount) || 0));
    const opens = Math.min(sent, Math.max(0, Math.round(Number(record?.opens) || 0)));
    const clicks = Math.min(opens, Math.max(0, Math.round(Number(record?.clicks) || 0)));
    const hash = hashString(record?.id);
    const deliveryRate = 0.97 + (hash % 3) / 100;
    const unsubscribeRate = 0.01 + ((hash >>> 3) % 2) / 100;
    const spamRate = ((hash >>> 5) % 4) / 1000;
    const delivered = Math.min(sent, Math.max(opens, Math.round(sent * deliveryRate)));
    const unsubscribes = Math.min(delivered, Math.round(delivered * unsubscribeRate));
    const spamReports = Math.min(delivered, Math.round(delivered * spamRate));
    return { sent, delivered, opens, clicks, unsubscribes, spamReports };
  }

  function normalizeMessages(record, name, emailCount) {
    const saved = Array.isArray(record.messages) && record.messages.length
      ? record.messages
      : SEED_MESSAGES[record.id] || [];
    const offset = hashString(record.id) % TEMPLATE_IDS.length;
    return Array.from({ length: emailCount }, (_, index) => {
      const message = saved[index] && typeof saved[index] === "object" ? saved[index] : {};
      const subjectLine = String(message.subjectLine || "").trim();
      const templateId = String(message.templateId || "").trim();
      return {
        subjectLine: subjectLine || (index === 0 ? name : `${name} (follow-up ${index})`),
        previewText: String(message.previewText || "").trim(),
        templateId: templateId || TEMPLATE_IDS[(offset + index) % TEMPLATE_IDS.length]
      };
    });
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

    const id = String(record.id || createId());
    const name = clampName(record.name);
    const normalized = {
      id,
      source: record.source === "direct" ? "direct" : "campaign",
      name,
      type,
      emailCount,
      messages: normalizeMessages({ ...record, id }, name, emailCount),
      sender: senderRecord && (senderRecord.name || senderRecord.email) ? senderRecord : null,
      audienceTitle: String(record.audienceTitle || "").trim(),
      recipientCount: Math.max(0, Math.round(Number(record.recipientCount) || 0)),
      status,
      attentionReason: String(record.attentionReason || "").trim(),
      startAt: record.startAt || null,
      endAt: record.endAt || null,
      sentCount: Math.max(0, Math.round(Number(record.sentCount) || 0)),
      opens: Math.max(0, Math.round(Number(record.opens) || 0)),
      // Records saved before clicks existed get a stand-in of ~30% of opens.
      clicks: Math.max(0, Math.round(
        record.clicks == null ? (Number(record.opens) || 0) * 0.3 : Number(record.clicks) || 0
      )),
      replies: Math.max(0, Math.round(Number(record.replies) || 0)),
      converts: Math.max(0, Math.round(Number(record.converts) || 0)),
      createdAt: record.createdAt || new Date().toISOString(),
      batchSize: Number(record.batchSize) > 0 ? Math.round(Number(record.batchSize)) : 0,
      batchIntervalMs: Number(record.batchIntervalMs) > 0 ? Math.round(Number(record.batchIntervalMs)) : 0,
      pausedAt: record.pausedAt || null,
      pausedDurationMs: Math.max(0, Math.round(Number(record.pausedDurationMs) || 0))
    };
    const stats = engagement(normalized);
    normalized.delivered = stats.delivered;
    normalized.unsubscribes = stats.unsubscribes;
    normalized.spamReports = stats.spamReports;
    return normalized;
  }

  function isBatchedDirect(record) {
    return record?.source === "direct" && record.batchSize > 0 && record.batchIntervalMs > 0;
  }

  function scheduleNewDirect(draft) {
    if (draft?.source !== "direct" || draft.status === "draft" || Number(draft.batchSize) > 0) {
      return draft || {};
    }
    return {
      ...draft,
      status: "scheduled",
      startAt: new Date(Date.now() + DIRECT_COUNTDOWN_MS).toISOString(),
      endAt: null,
      sentCount: 0,
      opens: 0,
      clicks: 0,
      replies: 0,
      converts: 0,
      batchSize: DIRECT_BATCH_SIZE,
      batchIntervalMs: DIRECT_BATCH_INTERVAL_MS,
      pausedDurationMs: 0,
      pausedAt: null
    };
  }

  // Projects a batched direct email onto the virtual clock. `now` is injectable
  // so the same rules drive both the live list and catch-up after a reload.
  function deliverySnapshot(record, now = Date.now()) {
    if (!isBatchedDirect(record)) return null;
    const start = Date.parse(record.startAt);
    if (!Number.isFinite(start)) return null;

    const pausedDuration = Math.max(0, Number(record.pausedDurationMs) || 0);
    const pausedAt = record.pausedAt ? Date.parse(record.pausedAt) : NaN;
    const frozen = record.status === "paused" && Number.isFinite(pausedAt);
    const clock = (frozen ? pausedAt : now) - pausedDuration;
    const total = Math.max(0, record.recipientCount);
    const batchSize = record.batchSize;
    const interval = record.batchIntervalMs;
    const status = frozen ? "paused" : null;

    if (clock < start) {
      return {
        status: status || "scheduled",
        sentCount: 0,
        endAt: null,
        remainingMs: Math.max(0, start - clock),
        nextBatchMs: null
      };
    }

    if (total <= 0) {
      return {
        status: status || "completed",
        sentCount: 0,
        endAt: new Date(start + pausedDuration).toISOString(),
        remainingMs: null,
        nextBatchMs: null
      };
    }

    const elapsed = clock - start;
    const batches = Math.floor(elapsed / interval) + 1;
    const sent = Math.min(total, batches * batchSize);
    if (sent >= total) {
      const needed = Math.max(1, Math.ceil(total / batchSize));
      return {
        status: status || "completed",
        sentCount: total,
        endAt: new Date(start + (needed - 1) * interval + pausedDuration).toISOString(),
        remainingMs: null,
        nextBatchMs: null
      };
    }

    return {
      status: status || "sending",
      sentCount: sent,
      endAt: null,
      remainingMs: null,
      nextBatchMs: Math.max(0, start + batches * interval - clock)
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

  function claimDirectSeeds() {
    try {
      if (window.localStorage?.getItem(DIRECT_SEED_KEY)) return false;
      window.localStorage?.setItem(DIRECT_SEED_KEY, "1");
      return true;
    } catch (error) {
      return false;
    }
  }

  // Saved lists keep demo click counts in sync when seed stats change.
  function syncSeedClickStats() {
    try {
      if (window.localStorage?.getItem(SEED_CLICKS_KEY)) return false;
      window.localStorage?.setItem(SEED_CLICKS_KEY, "1");
    } catch (error) {
      return false;
    }
    const byId = new Map(seedCampaigns().map((record) => [record.id, record]));
    let dirty = false;
    campaigns = campaigns.map((campaign) => {
      const seed = byId.get(campaign.id);
      if (!seed || campaign.clicks === seed.clicks) return campaign;
      dirty = true;
      return { ...campaign, clicks: seed.clicks };
    });
    return dirty;
  }

  // Lists saved before direct emails existed get the direct seeds once.
  function addMissingDirectSeeds() {
    if (!claimDirectSeeds()) return false;
    const ids = new Set(campaigns.map((campaign) => campaign.id));
    const missing = seedDirectEmails().map(normalize).filter((record) => !ids.has(record.id));
    if (!missing.length) return false;
    campaigns = [...campaigns, ...missing];
    return true;
  }

  const stored = readStored();
  let campaigns = stored ? stored.campaigns : null;
  if (!campaigns) {
    campaigns = seedCampaigns();
    claimDirectSeeds();
    writeStored();
  } else if (addMissingDirectSeeds() || syncSeedClickStats() || stored.dirty) {
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
      sender: campaign.sender ? { ...campaign.sender } : null,
      messages: campaign.messages.map((entry) => ({ ...entry }))
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
    const incoming = scheduleNewDirect(draft);
    const status = STATUSES.has(incoming?.status) ? incoming.status : "sending";
    const record = normalize({
      ...incoming,
      id: createId(),
      status,
      sentCount: incoming?.sentCount || 0,
      opens: incoming?.opens || 0,
      clicks: incoming?.clicks || 0,
      replies: incoming?.replies || 0,
      converts: incoming?.converts || 0,
      endAt: incoming?.endAt || null,
      startAt: status === "draft" ? null : (incoming?.startAt || new Date().toISOString()),
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
      clicks: 0,
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

  function removeMany(ids) {
    const removing = new Set(ids);
    const next = campaigns.filter((campaign) => !removing.has(campaign.id));
    const removed = campaigns.length - next.length;
    if (!removed) return 0;
    campaigns = next;
    writeStored();
    return removed;
  }

  function advanceDeliveries(now = Date.now()) {
    let changed = false;
    campaigns = campaigns.map((campaign) => {
      if (!isBatchedDirect(campaign) || campaign.status === "paused" || campaign.status === "draft") {
        return campaign;
      }
      if (campaign.status === "completed" && campaign.sentCount >= campaign.recipientCount && campaign.endAt) {
        return campaign;
      }
      const snapshot = deliverySnapshot(campaign, now);
      if (!snapshot) return campaign;
      if (
        snapshot.status === campaign.status
        && snapshot.sentCount === campaign.sentCount
        && snapshot.endAt === campaign.endAt
      ) {
        return campaign;
      }
      changed = true;
      return normalize({ ...campaign, status: snapshot.status, sentCount: snapshot.sentCount, endAt: snapshot.endAt });
    });
    if (changed) writeStored();
    return changed;
  }

  function pause(id) {
    advanceDeliveries();
    const campaign = campaigns.find((entry) => entry.id === id);
    if (!campaign) return null;
    if (isBatchedDirect(campaign)) {
      if (campaign.status !== "scheduled" && campaign.status !== "sending") return null;
      return update(id, { status: "paused", pausedAt: new Date().toISOString() });
    }
    if (campaign.status !== "sending") return null;
    return update(id, { status: "paused" });
  }

  function resume(id) {
    const campaign = campaigns.find((entry) => entry.id === id);
    if (!campaign || campaign.status !== "paused") return null;
    if (!isBatchedDirect(campaign)) return update(id, { status: "sending" });

    const pausedAt = Date.parse(campaign.pausedAt);
    const extra = Number.isFinite(pausedAt) ? Math.max(0, Date.now() - pausedAt) : 0;
    const resumed = {
      ...campaign,
      status: "scheduled",
      pausedAt: null,
      pausedDurationMs: (campaign.pausedDurationMs || 0) + extra
    };
    const snapshot = deliverySnapshot(resumed);
    return update(id, {
      status: snapshot?.status || "scheduled",
      sentCount: snapshot?.sentCount ?? campaign.sentCount,
      endAt: snapshot?.endAt ?? null,
      pausedAt: null,
      pausedDurationMs: resumed.pausedDurationMs
    });
  }

  advanceDeliveries();
  window.setInterval(() => advanceDeliveries(), 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") advanceDeliveries();
  });

  window.WefranchCampaignsStore = {
    list,
    get,
    create,
    update,
    duplicate,
    remove,
    removeMany,
    deliverySnapshot,
    engagement,
    pause,
    resume
  };
})();
