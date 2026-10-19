/* Email templates for the Templates tab. "yours" are templates the user
   created and saved; "basic" is the reusable starter gallery. Image paths are
   relative to the Campaigns page. */
(function () {
  const IMAGES = {
    welcome: "assets/images/campaign-template.jpg",
    short: "assets/images/email-template-1.jpg",
    reminder: "assets/images/email-template-2.jpg",
    webinar: "assets/images/email-template-3.jpg",
    outreach: "assets/images/email-template-4.jpg"
  };

  window.wefranchCampaignTemplates = {
    yours: [
      { id: "tpl-fitness-intro", name: "Fitness owners intro", image: IMAGES.outreach, createdAt: "2026-10-14T09:20:00" },
      { id: "tpl-west-coast-territories", name: "West Coast open territories", image: IMAGES.short, createdAt: "2026-10-02T15:05:00" },
      { id: "tpl-nyc-check-in", name: "NYC prospects check-in", image: IMAGES.reminder, createdAt: "2026-09-21T11:40:00" }
    ],
    basic: [
      { id: "introduction", name: "Introduction", image: IMAGES.welcome, createdAt: "2026-03-02T10:00:00" },
      { id: "territory-opportunity", name: "Territory opportunity", image: IMAGES.short, createdAt: "2026-03-02T10:00:00" },
      { id: "market-update", name: "Market update", image: IMAGES.reminder, createdAt: "2026-04-15T10:00:00" },
      { id: "follow-up", name: "Follow-up", image: IMAGES.reminder, createdAt: "2026-04-15T10:00:00" },
      { id: "event-invitation", name: "Event invitation", image: IMAGES.webinar, createdAt: "2026-06-10T10:00:00" }
    ]
  };
})();
