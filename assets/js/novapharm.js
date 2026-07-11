const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");

if (navToggle && siteNav) {
  const setNavigation = (isOpen) => {
    siteNav.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    const label = navToggle.querySelector(".sr-only");
    if (label) label.textContent = isOpen ? "Close navigation" : "Open navigation";
  };

  navToggle.addEventListener("click", () => setNavigation(!siteNav.classList.contains("open")));
  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNavigation(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.classList.contains("open")) {
      setNavigation(false);
      navToggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!siteNav.contains(event.target) && !navToggle.contains(event.target)) setNavigation(false);
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const articleCards = [...document.querySelectorAll("[data-article-card]")];
const filterStatus = document.querySelector("[data-filter-status]");
document.querySelectorAll("[data-article-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.articleFilter;
    let visible = 0;
    document.querySelectorAll("[data-article-filter]").forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });
    articleCards.forEach((card) => {
      const matches = category === "All" || card.dataset.category === category;
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (filterStatus) {
      filterStatus.textContent = category === "All"
        ? `Showing all ${visible} articles.`
        : `Showing ${visible} ${category} article${visible === 1 ? "" : "s"}.`;
    }
  });
});

function clearErrors(form) {
  form.querySelectorAll("[aria-invalid=true]").forEach((field) => field.removeAttribute("aria-invalid"));
  const summary = form.querySelector("[data-error-summary]");
  if (summary) {
    summary.hidden = true;
    summary.querySelector("ul")?.replaceChildren();
  }
}

function validateForm(form) {
  clearErrors(form);
  const invalidFields = [...form.elements].filter((field) => field.willValidate && !field.checkValidity());
  if (!invalidFields.length) return true;
  const summary = form.querySelector("[data-error-summary]");
  invalidFields.forEach((field) => {
    field.setAttribute("aria-invalid", "true");
    const label = field.id ? form.querySelector(`label[for="${CSS.escape(field.id)}"]`) : null;
    if (summary && field.id) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${field.id}`;
      link.textContent = `${label?.childNodes[0]?.textContent?.trim() || field.name}: ${field.validationMessage}`;
      item.append(link);
      summary.querySelector("ul")?.append(item);
    }
  });
  if (summary) {
    summary.hidden = false;
    summary.focus();
  } else {
    invalidFields[0].focus();
  }
  return false;
}

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const submit = contactForm.querySelector("[data-submit-button]");
  const requestedEnquiry = new URLSearchParams(window.location.search).get("enquiry");
  const enquirySelect = contactForm.elements.enquiryType;
  if (requestedEnquiry && enquirySelect) {
    const option = [...enquirySelect.options].find((candidate) => candidate.value.toLowerCase() === requestedEnquiry.toLowerCase());
    if (option) enquirySelect.value = option.value;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(contactForm) || submit?.disabled) return;
    if (submit) submit.disabled = true;
    if (status) {
      status.textContent = "Submitting enquiry...";
      status.className = "alert form-status";
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());
    try {
      const csrfToken = await window.NovaPharmApi.csrf();
      await window.NovaPharmApi.request("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify(payload)
      });
      contactForm.reset();
      clearErrors(contactForm);
      if (status) {
        status.textContent = "Thank you. Your enquiry has been securely recorded. The NovaPharm team will review it and respond through the contact details provided.";
        status.className = "alert form-status alert-success";
      }
      if (window.gtag) {
        window.gtag("event", "generate_lead", { event_category: "contact", event_label: payload.enquiryType || "general" });
      }
    } catch (error) {
      if (status) {
        status.textContent = window.NovaPharmApi.friendlyError(error, "contact");
        status.className = "alert form-status alert-danger";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}
