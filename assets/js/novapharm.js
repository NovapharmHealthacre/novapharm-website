const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

async function getCsrfToken() {
  const response = await fetch("/api/security/csrf", { credentials: "same-origin" });
  if (!response.ok) return "";
  const data = await response.json();
  return data.csrfToken || "";
}

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) {
      status.textContent = "Submitting enquiry...";
      status.className = "alert";
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit enquiry.");
      contactForm.reset();
      if (status) {
        status.textContent = "Thank you. Your enquiry has been recorded and the NovaPharm team will respond shortly.";
        status.className = "alert";
      }
      if (window.gtag) {
        window.gtag("event", "generate_lead", { event_category: "contact", event_label: payload.enquiryType || "general" });
      }
    } catch (error) {
      if (status) {
        status.textContent = error.message || "Submission failed. Please email the team directly.";
        status.className = "alert alert-danger";
      }
    }
  });
}
