/* Formatting shared by the Campaigns list and the campaign detail page.
   Paths are relative to a page one level below
   _prototypes/, so pages deeper than that pass `iconBase`. */
(function () {
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const scheduleFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  let iconBase = "../../assets/icons/";

  function store() {
    return window.WefranchCampaignsStore;
  }

  function setIconBase(path) {
    iconBase = path;
  }

  function iconSrc(name) {
    return `${iconBase}${name}`;
  }

  function rate(part, whole) {
    const sent = Number(whole) || 0;
    if (sent <= 0) return null;
    return (Number(part) || 0) / sent;
  }

  function formatRate(value) {
    if (value == null) return null;
    return `${Math.round(value * 100)}%`;
  }

  function formatCount(value) {
    return (Number(value) || 0).toLocaleString("en-US");
  }

  function dash() {
    const span = document.createElement("span");
    span.className = "dataset-empty-value";
    span.textContent = "–";
    return span;
  }

  function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return dateFormat.format(date);
  }

  function formatSchedule(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return scheduleFormat.format(date);
  }

  function remainingMs(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    return time - Date.now();
  }

  function formatRelative(value) {
    const remaining = remainingMs(value);
    const minutes = remaining == null ? 0 : Math.round(remaining / 60000);
    if (minutes < 1) return "in under 1 minute";
    if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? "" : "s"}`;
  }

  function formatImminent(remaining) {
    if (remaining < 60 * 1000) return "Starting in under 1 minute";
    const minutes = Math.floor(remaining / 60000);
    return `Starting in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, "0");
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
    return `${minutes}:${paddedSeconds}`;
  }

  function presentCampaign(campaign) {
    const snapshot = store()?.deliverySnapshot?.(campaign);
    if (!snapshot) return campaign;
    const live = {
      ...campaign,
      status: snapshot.status,
      sentCount: snapshot.sentCount,
      endAt: snapshot.endAt,
      delivery: snapshot
    };
    const stats = store()?.engagement?.(live);
    if (stats) {
      live.delivered = stats.delivered;
      live.unsubscribes = stats.unsubscribes;
      live.spamReports = stats.spamReports;
    }
    return live;
  }

  function deliverySignature(campaign) {
    const delivery = campaign.delivery;
    if (!delivery) return "";
    const remaining = delivery.remainingMs == null ? "" : Math.ceil(delivery.remainingMs / 1000);
    const next = delivery.nextBatchMs == null ? "" : Math.ceil(delivery.nextBatchMs / 1000);
    return [delivery.status, delivery.sentCount, remaining, next, delivery.endAt || ""].join("|");
  }

  function typeLabel(campaign) {
    if (campaign.type === "sequence") return "Sequence";
    if (campaign.source === "direct") return "Direct";
    return "Single";
  }

  function bindTooltip(trigger) {
    window.bindActionTooltip?.(trigger, {
      tooltipClass: "campaigns-tooltip"
    });
  }

  function sendingDots() {
    const dots = document.createElement("span");
    dots.className = "campaign-status__dots";
    dots.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement("span");
      dot.textContent = ".";
      dots.append(dot);
    }
    return dots;
  }

  function sentProgress(sent, total) {
    const safeTotal = Math.max(Number(total) || 0, 0);
    const safeSent = Math.max(Number(sent) || 0, 0);
    const ratio = safeTotal > 0 ? Math.max(0, Math.min(safeSent / safeTotal, 1)) : 0;
    return {
      sent: safeSent,
      total: safeTotal,
      ratio,
      percent: Math.round(ratio * 100),
      exact: `${safeSent.toLocaleString("en-US")} of ${safeTotal.toLocaleString("en-US")}`
    };
  }

  function progressRing(progress) {
    const size = 18;
    const stroke = 2.5;
    const radius = (size - stroke) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const ring = document.createElement("span");
    ring.className = "campaign-status__ring";
    ring.setAttribute("role", "progressbar");
    ring.setAttribute("aria-valuemin", "0");
    ring.setAttribute("aria-valuemax", String(progress.total));
    ring.setAttribute("aria-valuenow", String(progress.sent));
    ring.setAttribute("aria-valuetext", `${progress.percent}%`);
    ring.setAttribute("aria-label", progress.exact);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("aria-hidden", "true");

    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("class", "campaign-status__ring-track");
    track.setAttribute("cx", String(center));
    track.setAttribute("cy", String(center));
    track.setAttribute("r", String(radius));
    svg.append(track);

    if (progress.ratio > 0) {
      const fill = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      fill.setAttribute("class", "campaign-status__ring-fill");
      fill.setAttribute("cx", String(center));
      fill.setAttribute("cy", String(center));
      fill.setAttribute("r", String(radius));
      fill.setAttribute("stroke-dasharray", `${circumference * progress.ratio} ${circumference}`);
      fill.setAttribute("transform", `rotate(-90 ${center} ${center})`);
      svg.append(fill);
    }

    ring.append(svg);
    return ring;
  }

  function appendSendingProgress(cell, sent, total, { ring = false } = {}) {
    const progress = sentProgress(sent, total);
    const line = document.createElement("span");
    line.className = "campaign-status__line";
    if (ring) {
      line.classList.add("campaign-status__line--ring");
      const count = document.createElement("span");
      count.className = "campaign-status__count";
      count.textContent = `${progress.percent}%`;
      line.append(progressRing(progress), count);
      cell.append(line);
      return;
    }
    const track = document.createElement("span");
    track.className = "campaign-status__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(progress.total));
    track.setAttribute("aria-valuenow", String(progress.sent));
    track.setAttribute("aria-label", progress.exact);
    const fill = document.createElement("span");
    fill.className = "campaign-status__fill";
    fill.style.width = `${progress.ratio * 100}%`;
    track.append(fill);
    const count = document.createElement("span");
    count.className = "campaign-status__count";
    const percent = document.createElement("span");
    percent.className = "campaign-status__percent";
    percent.textContent = `${progress.percent}%`;
    const detail = document.createElement("span");
    detail.className = "campaign-status__exact";
    detail.textContent = progress.exact;
    count.append(percent, detail);
    line.append(track, count);
    cell.append(line);
  }

  function appendNextBatch(cell, nextBatchMs) {
    if (nextBatchMs == null) return;
    const next = document.createElement("span");
    next.className = "campaign-status__next";
    next.textContent = `Next batch in ${formatClock(nextBatchMs)}`;
    cell.append(next);
  }

  function renderStatus(campaign, options = {}) {
    const cell = document.createElement("div");
    cell.className = `campaign-status campaign-status--${campaign.status}`;
    const delivery = campaign.delivery || null;
    const ring = options.progress === "ring";

    if (campaign.status === "sending") {
      const sent = campaign.sentCount;
      const total = Math.max(campaign.recipientCount, 0);
      if (ring) {
        const progress = sentProgress(sent, total);
        const line = document.createElement("span");
        line.className = "campaign-status__line campaign-status__line--ring";
        const label = document.createElement("span");
        label.className = "campaign-status__label";
        const percent = document.createElement("span");
        percent.className = "campaign-status__percent-label";
        percent.textContent = ` (${progress.percent}%)`;
        label.append("Sending", sendingDots(), percent);
        line.append(progressRing(progress), label);
        cell.append(line);
      } else {
        const label = document.createElement("span");
        label.className = "campaign-status__label";
        label.append("Sending", sendingDots());
        cell.append(label);
        appendSendingProgress(cell, sent, total);
      }
      appendNextBatch(cell, delivery?.nextBatchMs);
      return cell;
    }

    if (campaign.status === "scheduled") {
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Scheduled";
      const line = document.createElement("span");
      line.className = "campaign-status__line";
      const date = document.createElement("span");
      date.className = "campaign-status__meta";
      const countdown = delivery?.remainingMs;
      const remaining = countdown == null ? remainingMs(campaign.startAt) : countdown;
      if (countdown != null) {
        date.textContent = `Starting in ${formatClock(countdown)}`;
        line.append(date);
      } else if (remaining != null && remaining < 60 * 60 * 1000) {
        date.textContent = formatImminent(remaining);
        line.append(date);
      } else {
        date.textContent = formatSchedule(campaign.startAt);
        const relative = formatRelative(campaign.startAt);
        const when = document.createElement("button");
        when.className = "campaign-status__info";
        when.type = "button";
        when.dataset.tooltip = relative;
        when.setAttribute("aria-label", `Starts ${relative}`);
        const icon = document.createElement("img");
        icon.src = iconSrc("info.svg");
        icon.alt = "";
        when.append(icon);
        line.append(date, when);
        bindTooltip(when);
      }
      cell.append(label, line);
      return cell;
    }

    if (campaign.status === "completed") {
      const icon = document.createElement("img");
      icon.className = "campaign-status__check";
      icon.src = iconSrc("check.svg");
      icon.alt = "";
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Completed";
      cell.append(icon, label);
      return cell;
    }

    if (campaign.status === "paused") {
      const holding = Boolean(delivery && (delivery.remainingMs != null || delivery.sentCount > 0 || delivery.nextBatchMs != null));
      cell.classList.toggle("is-holding", holding);
      const hold = document.createElement("span");
      hold.className = "campaign-status__hold";
      const icon = document.createElement("img");
      icon.className = "campaign-status__pause";
      icon.src = iconSrc("pause.svg");
      icon.alt = "";
      const label = document.createElement("span");
      label.className = "campaign-status__label";
      label.textContent = "Paused";
      hold.append(icon, label);
      cell.append(hold);
      if (delivery?.remainingMs != null) {
        const date = document.createElement("span");
        date.className = "campaign-status__meta";
        date.textContent = `Starting in ${formatClock(delivery.remainingMs)}`;
        cell.append(date);
      } else if (delivery && (delivery.sentCount > 0 || delivery.nextBatchMs != null)) {
        appendSendingProgress(cell, campaign.sentCount, Math.max(campaign.recipientCount, 0), { ring });
        appendNextBatch(cell, delivery.nextBatchMs);
      }
      return cell;
    }

    const label = document.createElement("span");
    label.className = "campaign-status__label";
    label.textContent = "Draft";
    cell.append(label);
    return cell;
  }

  // Each metric is [value, detail]. Value is null when nothing has been sent yet.
  function engagementMetrics(campaign) {
    const sent = Number(campaign.sentCount) || 0;
    const delivered = Number(campaign.delivered) || 0;
    const ofSent = (count) => `${formatCount(count)} of ${formatCount(sent)}`;
    const recipients = Number(campaign.recipientCount) || 0;
    return {
      sent: {
        label: "Sent",
        value: sent > 0 ? formatCount(sent) : null,
        detail: `of ${formatCount(recipients)} recipient${recipients === 1 ? "" : "s"}`
      },
      delivered: { label: "Delivered", value: formatRate(rate(delivered, sent)), detail: ofSent(delivered) },
      opened: { label: "Open rate", value: formatRate(rate(campaign.opens, sent)), detail: ofSent(campaign.opens) },
      clicked: { label: "Click rate", value: formatRate(rate(campaign.clicks, sent)), detail: ofSent(campaign.clicks) },
      unsubscribed: {
        label: "Unsubscribed",
        value: formatRate(rate(campaign.unsubscribes, delivered)),
        detail: `${formatCount(campaign.unsubscribes)} of ${formatCount(delivered)}`
      }
    };
  }

  function detailHref(campaign, base = "detail/") {
    return `${base}?id=${encodeURIComponent(campaign.id)}`;
  }

  window.WefranchCampaignFormat = {
    setIconBase,
    iconSrc,
    rate,
    formatRate,
    formatCount,
    dash,
    formatDate,
    formatSchedule,
    formatClock,
    remainingMs,
    presentCampaign,
    deliverySignature,
    typeLabel,
    bindTooltip,
    renderStatus,
    engagementMetrics,
    detailHref
  };
})();
