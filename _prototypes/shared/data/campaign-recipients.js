/* Mock recipients for a campaign. The list is generated from the campaign id,
   so it stays the same across reloads, and its event flags add up to the
   campaign's sent, delivered, opened, clicked, and unsubscribed counts. */
(function () {
  const FIRST_NAMES = [
    "Maria", "Daniel", "Aisha", "James", "Sofia", "Marcus", "Priya", "Ethan", "Olivia", "Carlos",
    "Hannah", "Jamal", "Grace", "Lucas", "Mei", "Andre", "Chloe", "Rafael", "Nina", "Owen",
    "Leah", "Tariq", "Emma", "Victor", "Zoe", "Samuel", "Isabel", "Kevin", "Ava", "Diego",
    "Rachel", "Hiro", "Natalie", "Omar", "Julia", "Brandon", "Elena", "Tyler", "Fatima", "Noah"
  ];
  const LAST_NAMES = [
    "Lopez", "Kim", "Patel", "Johnson", "Nguyen", "Garcia", "Williams", "Brown", "Chen", "Martinez",
    "Davis", "Okafor", "Miller", "Rossi", "Singh", "Wilson", "Anderson", "Thomas", "Moore", "Jackson",
    "Taylor", "Hernandez", "White", "Harris", "Clark", "Lewis", "Walker", "Young", "Allen", "Wright",
    "Scott", "Torres", "Hill", "Green", "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Rivera"
  ];
  const COMPANIES = [
    ["Lone Star Restaurant Group", "lonestarrg.com"],
    ["Summit Hospitality", "summithospitality.com"],
    ["Bluebonnet Brands", "bluebonnetbrands.com"],
    ["Northgate Operators", "northgateops.com"],
    ["Harbor Point Foods", "harborpointfoods.com"],
    ["Keystone Franchise Partners", "keystonefp.com"],
    ["Redwood Fitness Holdings", "redwoodfit.com"],
    ["Prairie Wind Ventures", "prairiewind.co"],
    ["Coastal QSR Group", "coastalqsr.com"],
    ["Evergreen Wellness", "evergreenwellness.com"],
    ["Copper Canyon Dining", "coppercanyondining.com"],
    ["Magnolia Multi-Unit", "magnoliamu.com"],
    ["Ironbridge Capital", "ironbridgecap.com"],
    ["Golden Gate Eateries", "goldengateeats.com"],
    ["Sunbelt Franchise Co.", "sunbeltfranchise.com"],
    ["Midway Brands", "midwaybrands.com"],
    ["Cascade Coffee Partners", "cascadecoffee.co"],
    ["Pinnacle Unit Holdings", "pinnacleunits.com"],
    ["Riverbend Restaurants", "riverbendrestaurants.com"],
    ["Atlas Operator Group", "atlasoperators.com"]
  ];
  const STATUSES = {
    pending: "Not sent",
    sent: "Sent",
    bounced: "Bounced",
    delivered: "Delivered",
    opened: "Opened",
    clicked: "Clicked",
    unsubscribed: "Unsubscribed",
    spam: "Marked as spam"
  };
  const SEGMENTS = ["all", "sent", "delivered", "bounced", "opened", "clicked", "unsubscribed", "spam"];

  const cache = new Map();

  function hashString(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
  }

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let next = state;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(length, next) {
    const order = Array.from({ length }, (_, index) => index);
    for (let index = length - 1; index > 0; index -= 1) {
      const swap = Math.floor(next() * (index + 1));
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    return order;
  }

  function stats(campaign) {
    const store = window.WefranchCampaignsStore;
    const counts = store?.engagement?.(campaign) || {
      sent: campaign.sentCount || 0,
      delivered: campaign.delivered || 0,
      opens: campaign.opens || 0,
      clicks: campaign.clicks || 0,
      unsubscribes: campaign.unsubscribes || 0
    };
    const total = Math.max(0, Math.round(Number(campaign.recipientCount) || 0));
    const sent = Math.min(total, counts.sent);
    const delivered = Math.min(sent, counts.delivered);
    const opens = Math.min(delivered, counts.opens);
    const clicks = Math.min(opens, counts.clicks);
    const unsubscribes = Math.min(delivered, counts.unsubscribes);
    const spamReports = Math.min(delivered, counts.spamReports || 0);
    return { total, sent, delivered, opens, clicks, unsubscribes, spamReports };
  }

  function namedRecipient(campaign) {
    const title = String(campaign.audienceTitle || "").trim();
    if (campaign.recipientCount !== 1 || !/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(title)) return null;
    return title;
  }

  // 7919 is coprime with the 1,600 name pairs, so each index below 1,600 maps to a different name.
  function person(index, offset, next, campaign) {
    const named = index === 0 ? namedRecipient(campaign) : null;
    const pairs = FIRST_NAMES.length * LAST_NAMES.length;
    const pair = (index * 7919 + offset) % pairs;
    const [firstName, lastName] = named
      ? named.split(" ")
      : [FIRST_NAMES[pair % FIRST_NAMES.length], LAST_NAMES[Math.floor(pair / FIRST_NAMES.length)]];
    const [company, domain] = COMPANIES[Math.floor(next() * COMPANIES.length)];
    const suffix = index >= pairs ? Math.floor(index / pairs) + 1 : "";
    return {
      id: `${campaign.id}-r${index}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName}.${lastName}${suffix}@${domain}`.toLowerCase(),
      company
    };
  }

  function between(next, from, to) {
    if (!(to > from)) return from;
    return Math.round(from + next() * (to - from));
  }

  function stamp(ms) {
    return new Date(Math.min(ms, Date.now())).toISOString();
  }

  function build(campaign) {
    const counts = stats(campaign);
    const next = random(hashString(campaign.id));
    const start = Date.parse(campaign.startAt) || Date.now();
    const end = Math.max(start, Date.parse(campaign.endAt) || Date.now());
    const offset = Math.floor(next() * FIRST_NAMES.length * LAST_NAMES.length);
    const people = Array.from({ length: counts.total }, (_, index) => person(index, offset, next, campaign));
    const order = shuffled(counts.total, next);
    const sentIds = order.slice(0, counts.sent);
    const deliveredIds = sentIds.slice(0, counts.delivered);
    const openedIds = new Set(deliveredIds.slice(0, counts.opens));
    const clickedIds = new Set(deliveredIds.slice(0, counts.clicks));
    const unsubscribedIds = new Set(deliveredIds.slice(deliveredIds.length - counts.unsubscribes));
    const spamIds = new Set(deliveredIds.slice(0, counts.spamReports));
    const sentSet = new Set(sentIds);
    const deliveredSet = new Set(deliveredIds);

    return people.map((entry, index) => {
      const recipient = {
        ...entry,
        sent: sentSet.has(index),
        delivered: deliveredSet.has(index),
        opened: openedIds.has(index),
        clicked: clickedIds.has(index),
        unsubscribed: unsubscribedIds.has(index),
        bounced: sentSet.has(index) && !deliveredSet.has(index),
        spam: spamIds.has(index),
        status: "pending",
        lastActivityAt: null
      };
      if (!recipient.sent) return recipient;

      const sentAt = between(next, start, end);
      let latest = sentAt;
      recipient.sentAt = stamp(sentAt);
      recipient.status = "sent";
      if (!recipient.delivered) {
        recipient.bouncedAt = recipient.sentAt;
        recipient.status = "bounced";
      } else {
        latest = sentAt + between(next, 2000, 60000);
        recipient.deliveredAt = stamp(latest);
        recipient.status = "delivered";
        if (recipient.opened) {
          latest = between(next, latest, Math.max(latest, end));
          recipient.openedAt = stamp(latest);
          recipient.status = "opened";
        }
        if (recipient.clicked) {
          latest += between(next, 10000, 15 * 60 * 1000);
          recipient.clickedAt = stamp(latest);
          recipient.status = "clicked";
        }
        if (recipient.unsubscribed) {
          latest += between(next, 5000, 5 * 60 * 1000);
          recipient.unsubscribedAt = stamp(latest);
          recipient.status = "unsubscribed";
        }
        if (recipient.spam) recipient.spamAt = stamp(latest);
      }
      recipient.lastActivityAt = stamp(latest);
      return recipient;
    });
  }

  function signature(campaign) {
    const counts = stats(campaign);
    return [campaign.id, campaign.startAt, campaign.endAt, ...Object.values(counts)].join("|");
  }

  function list(campaign) {
    if (!campaign) return [];
    const key = signature(campaign);
    const cached = cache.get(campaign.id);
    if (cached?.key === key) return cached.recipients;
    const recipients = build(campaign);
    cache.set(campaign.id, { key, recipients });
    return recipients;
  }

  function inSegment(recipient, segment) {
    if (segment === "all") return true;
    return Boolean(recipient[segment]);
  }

  function segmentCounts(campaign) {
    const counts = stats(campaign);
    return {
      all: counts.total,
      sent: counts.sent,
      delivered: counts.delivered,
      bounced: Math.max(0, counts.sent - counts.delivered),
      opened: counts.opens,
      clicked: counts.clicks,
      unsubscribed: counts.unsubscribes,
      spam: counts.spamReports
    };
  }

  window.WefranchCampaignRecipients = {
    SEGMENTS,
    STATUSES,
    list,
    inSegment,
    segmentCounts
  };
})();
