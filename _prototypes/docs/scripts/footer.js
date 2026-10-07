(() => {
  const host = document.querySelector("[data-doc-footer]");
  if (!host) return;

  const divider = document.createElement("hr");
  divider.className = "doc-footer-divider";

  const prompt = document.createElement("p");
  prompt.className = "doc-footer-prompt";
  prompt.textContent = "Didn’t find your answer?";

  const contact = document.createElement("p");
  contact.className = "doc-footer-contact";
  const link = document.createElement("a");
  link.className = "ui-link";
  link.href = "mailto:mariyam@wefranch.com";
  link.textContent = "mariyam@wefranch.com";
  contact.append("Email us at ", link, ".");

  host.append(divider, prompt, contact);
})();
