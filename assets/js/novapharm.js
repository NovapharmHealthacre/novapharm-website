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
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) setNavigation(false);
  });
}

const siteHeader = document.querySelector("[data-site-header]");
if (siteHeader) {
  const updateHeader = () => siteHeader.setAttribute("data-scrolled", String(window.scrollY > 12));
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = navigator.connection?.saveData === true;

if (!reducedMotion && !saveData) {
  document.documentElement.dataset.motion = "ready";
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -12%", threshold: 0.08 });
  document.querySelectorAll("[data-reveal]").forEach((node) => revealObserver.observe(node));

} else {
  document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-visible"));
}

const networkStory = document.querySelector("[data-network-story]");
if (networkStory) {
  const steps = [...networkStory.querySelectorAll("[data-network-step]")];
  const visual = networkStory.querySelector("[data-network-visual]");
  const caption = networkStory.querySelector("[data-network-caption]");
  const activateStep = (step) => {
    const index = Number(step.dataset.networkStep || 0);
    steps.forEach((candidate) => {
      if (candidate === step) candidate.setAttribute("aria-current", "step");
      else candidate.removeAttribute("aria-current");
    });
    if (visual) visual.dataset.activeStep = String(index);
    if (caption) caption.textContent = step.querySelector("h3")?.textContent || "Qualified sourcing route";
  };
  if ("IntersectionObserver" in window) {
    const stepObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activateStep(visible.target);
    }, { rootMargin: "-35% 0px -45%", threshold: [0.1, 0.35, 0.65] });
    steps.forEach((step) => stepObserver.observe(step));
  }
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

const PUBLIC_CONTACT_EMAIL = "vishal@novapharmhealthcare.com";

function serviceIsUnavailable(error) {
  return error?.status === 0 || error?.status === 404 || error?.status === 503 || error?.code === "csrf_unavailable" || error?.code === "network_unavailable";
}

function addEmailFallback(status, payload) {
  if (!status) return;
  const subject = `NovaPharm website enquiry: ${payload.enquiryType || "General enquiry"}`;
  const bodyLines = [
    `Name: ${payload.name || ""}`,
    `Company: ${payload.company || ""}`,
    `Role: ${payload.role || ""}`,
    `Business email: ${payload.email || ""}`,
    `Telephone: ${payload.telephone || ""}`,
    `Country: ${payload.country || ""}`,
    `Enquiry type: ${payload.enquiryType || ""}`,
    "",
    "Message:",
    payload.message || ""
  ];
  const link = document.createElement("a");
  link.className = "btn btn-primary";
  link.href = `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  link.textContent = "Open email draft";

  const strong = document.createElement("strong");
  strong.textContent = "Your enquiry is ready to send.";
  const text = document.createElement("span");
  text.textContent = " The secure web service is being activated. Use the email draft below to send the same information directly to NovaPharm.";
  status.replaceChildren(strong, text, document.createElement("br"), link);
  status.className = "alert form-status static-service-notice";
  link.focus();
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
      const result = await window.NovaPharmApi.request("/api/contact", {
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
        const reference = result.lead?.leadNumber ? ` ${result.lead.leadNumber}` : "";
        status.textContent = `Thank you. Your enquiry${reference} has been securely recorded. The NovaPharm team will review it and respond through the contact details provided.`;
        status.className = "alert form-status alert-success";
      }
    } catch (error) {
      if (serviceIsUnavailable(error)) {
        addEmailFallback(status, payload);
      } else if (status) {
        status.textContent = window.NovaPharmApi.friendlyError(error, "contact");
        status.className = "alert form-status alert-danger";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}
