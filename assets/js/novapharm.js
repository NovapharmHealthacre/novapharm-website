const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
// Static pages keep the correct screen-reader labels when users toggle the
// mobile menu after choosing the Arabic/Hebrew RTL layout preview.
const navigationLocale = document.documentElement.lang;
const localizedMenuLabels = {
  ar: { open: "فتح القائمة", close: "إغلاق القائمة", menu: "القائمة", closed: "إغلاق", nav: "التنقل الرئيسي" },
  he: { open: "פתיחת תפריט", close: "סגירת תפריט", menu: "תפריט", closed: "סגירה", nav: "ניווט ראשי" },
};
const menuLabels = localizedMenuLabels[navigationLocale] || {
  open: "Open navigation", close: "Close navigation", menu: "Menu", closed: "Close", nav: "Primary navigation",
};

if (navToggle && siteNav) {
  // A parent section is not the current page. Announce only exact destinations
  // to VoiceOver and other screen readers (including legacy generated headers).
  const normaliseNavigationPath = (path) => {
    const canonical = path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
    return canonical.endsWith("/") ? canonical : canonical + "/";
  };
  const currentPath = normaliseNavigationPath(window.location.pathname);
  siteNav.querySelectorAll("a[href^='/']").forEach((link) => {
    const linkPath = normaliseNavigationPath(new URL(link.getAttribute("href"), window.location.href).pathname);
    if (linkPath === currentPath) link.setAttribute("aria-current", "page");
    else if (link.getAttribute("aria-current") === "page") link.removeAttribute("aria-current");
  });

  const setNavigation = (isOpen) => {
    siteNav.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? menuLabels.close : menuLabels.open);
    const label = navToggle.querySelector(".sr-only");
    if (label) label.textContent = isOpen ? menuLabels.close : menuLabels.open;
    const visibleLabel = navToggle.querySelector("[data-menu-label]");
    if (visibleLabel) visibleLabel.textContent = isOpen ? menuLabels.closed : menuLabels.menu;
  };

  navToggle.setAttribute("aria-label", menuLabels.open);
  siteNav.setAttribute("aria-label", menuLabels.nav);
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


/* Desktop category navigation: ordinary anchor links remain the no-JS fallback. */
const megaHeader = document.querySelector("[data-site-header]");
if (megaHeader) {
  const triggers = [...megaHeader.querySelectorAll("[data-mega-trigger]")];
  const panels = [...megaHeader.querySelectorAll("[data-mega-panel]")];
  const desktop = window.matchMedia("(min-width: 1181px)");
  let activeTrigger = null;
  const closeMega = () => {
    megaHeader.dataset.megaOpen = "";
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    panels.forEach((panel) => {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    });
    activeTrigger = null;
  };
  const openMega = (trigger) => {
    if (!desktop.matches) return closeMega();
    const section = trigger.dataset.megaTrigger;
    const selectedPanel = panels.find((panel) => panel.dataset.megaPanel === section);
    if (!selectedPanel) return closeMega();
    closeMega();
    activeTrigger = trigger;
    megaHeader.dataset.megaOpen = section;
    trigger.setAttribute("aria-expanded", "true");
    selectedPanel.classList.add("is-open");
    selectedPanel.setAttribute("aria-hidden", "false");
  };
  triggers.forEach((trigger) => {
    trigger.addEventListener("pointerenter", () => openMega(trigger));
    trigger.addEventListener("focus", () => openMega(trigger));
    // A top-level category click opens its choices like a menu. Each panel
    // contains the category overview link; without JS, the anchor still works.
    // Never intercept browser/system modified-click shortcuts.
    trigger.addEventListener("click", (event) => {
      if (!desktop.matches || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const panel = panels.find((candidate) => candidate.dataset.megaPanel === trigger.dataset.megaTrigger);
      if (!panel) return;
      event.preventDefault();
      openMega(trigger);
      panel.querySelector("a")?.focus({ preventScroll: true });
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" || !desktop.matches) return;
      event.preventDefault();
      openMega(trigger);
      const panel = panels.find((candidate) => candidate.dataset.megaPanel === trigger.dataset.megaTrigger);
      panel?.querySelector("a")?.focus();
    });
  });
  // Tabbing to an unrelated header control must not leave an overlay expanded.
  // Moving into the active panel (or another category trigger) remains allowed.
  megaHeader.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!activeTrigger || activeTrigger.contains(target)) return;
    const inOpenPanel = panels.some((panel) => panel.classList.contains("is-open") && panel.contains(target));
    if (!inOpenPanel && !target.closest("[data-mega-trigger]")) closeMega();
  });
  // Mouse hover must not collapse a menu while its trigger or a menu link
  // retains keyboard focus. Otherwise the focused link becomes display:none
  // and disappears from the accessibility and keyboard navigation tree.
  const focusWithinActiveMega = () => {
    if (!activeTrigger) return false;
    const focused = document.activeElement;
    return activeTrigger === focused || panels.some((panel) =>
      panel.classList.contains("is-open") && panel.contains(focused));
  };
  megaHeader.addEventListener("pointerleave", () => {
    if (!focusWithinActiveMega()) closeMega();
  });
  megaHeader.addEventListener("click", (event) => {
    if (event.target.closest(".npd-mega a")) closeMega();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!megaHeader.contains(event.target)) closeMega();
  });
  document.addEventListener("focusin", (event) => {
    if (!megaHeader.contains(event.target)) closeMega();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !megaHeader.dataset.megaOpen) return;
    const previouslyActive = activeTrigger;
    closeMega();
    if (event.target.closest(".npd-mega")) {
      previouslyActive?.focus({ preventScroll: true });
      closeMega();
    }
    event.preventDefault();
  });
  window.addEventListener("resize", closeMega);
}

const siteHeader = document.querySelector("[data-site-header]");
if (siteHeader) {
  const updateHeader = () => siteHeader.setAttribute("data-scrolled", String(window.scrollY > 12));
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const saveData = navigator.connection?.saveData === true;
const revealNodes = [...document.querySelectorAll("[data-reveal]")];
let revealObserver;
// An optional animation must never hide page content if observer setup fails.
const revealAll = () => {
  delete document.documentElement.dataset.motion;
  revealObserver?.disconnect();
  revealNodes.forEach((node) => node.classList.add("is-visible"));
};
if (revealNodes.length && !motionPreference.matches && !saveData && typeof IntersectionObserver !== "undefined" && typeof window.IntersectionObserver === "function") {
  try {
    revealObserver = new window.IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12%", threshold: 0.08 });
    revealNodes.forEach((node) => revealObserver.observe(node));
    document.documentElement.dataset.motion = "ready";
  } catch {
    revealAll();
  }
} else {
  revealAll();
}
// Mid-session Reduce Motion changes remain immediately usable, even on
// older browsers exposing the deprecated MediaQueryList.addListener method.
const updateMotionPreference = () => {
  if (motionPreference.matches) revealAll();
};
if (typeof motionPreference.addEventListener === "function") {
  motionPreference.addEventListener?.("change", updateMotionPreference);
} else {
  motionPreference.addListener?.(updateMotionPreference);
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
  const quoteMessage = new URLSearchParams(window.location.search).get("quote");
  const messageField = contactForm.elements.message;
  if (quoteMessage?.startsWith("ESCO Anand UK quotation request") && quoteMessage.length <= 850 &&
      messageField instanceof HTMLTextAreaElement && !messageField.value) {
    messageField.value = quoteMessage;
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

// Nutraxin consumer storefront loads only on its public collection and detail routes.
// The static bag cannot authorise payments: the server verifies all commercial data.
if (window.location.pathname.startsWith("/products/nutraxin/") &&
    !window.location.pathname.startsWith("/products/nutraxin/order-request/")) {
  void import("/assets/js/nutraxin-retail-store.js").catch(() => {
    // Static catalogue remains available if shopping enhancement cannot load.
  });
}


/* Keep the approved public wordmark visible in full-page WebKit captures
   and on quick navigation to the footer. It is a small, shared brand asset. */
for (const image of document.querySelectorAll(".npd-footer .npd-footer-identity .brand-logo img")) {
  image.loading = "eager";
}

/* Apple-style mobile web footer disclosure. The source links remain visible
   without JS; only enhance the ordinary public corporate footer groups. */
for (const directory of document.querySelectorAll(
  "footer.site-footer .npd-footer-top, footer.site-footer .footer-grid"
)) {
  if (directory.dataset.npAppleFooter === "enhanced") continue;
  const columns = [...directory.children].filter((child) =>
    child.tagName === "DIV" &&
    !child.classList.contains("npd-footer-identity") &&
    !child.classList.contains("footer-intro")
  );
  if (!columns.length) continue;
  const compact = window.matchMedia("(max-width: 833px)");
  const disclosures = [];
  for (const column of columns) {
    const heading = column.querySelector(":scope > h2, :scope > h3");
    if (!heading) continue;
    const details = document.createElement("details");
    details.className = "np-apple-footer-disclosure";
    const summary = document.createElement("summary");
    summary.append(heading);
    const links = document.createElement("div");
    links.className = "np-apple-footer-disclosure-links";
    while (column.firstChild) links.append(column.firstChild);
    details.append(summary, links);
    column.append(details);
    disclosures.push({ details, summary });
  }
  if (disclosures.length) {
    const syncDisclosureMode = () => {
      for (const { details, summary } of disclosures) {
        // On desktop the directory is always visible, not interactive.
        // On mobile use native details/summary so VoiceOver and keyboard work.
        details.open = !compact.matches;
        summary.tabIndex = compact.matches ? 0 : -1;
      }
    };
    syncDisclosureMode();
    compact.addEventListener("change", syncDisclosureMode);
    directory.dataset.npAppleFooter = "enhanced";
  }
}


// Connective public catalogue: mount only the existing, server-authorised
// retail bridge on exact product-reference routes. This code never supplies a
// price, stock quantity, Stripe key, order or payment request.
(function mountConnectiveLiveOffer() {
  const match = /^\/products\/health-and-wellbeing\/([0-9]{13})\/?$/.exec(window.location.pathname);
  if (!match) return;
  const gtin = match[1];
  const canonical = "https://novapharmhealthcare.com/products/health-and-wellbeing/" + gtin + "/";
  if (document.querySelector('link[rel="canonical"]')?.getAttribute("href") !== canonical) return;
  const main = document.querySelector("main.npr-main");
  if (!main || !main.textContent.includes("GTIN " + gtin)) return;
  // Buyers stay on NovaPharm for ordering; source pages may retain
  // internal provenance in source control without outbound retail links.
  main.querySelector(".npr-source-links")?.remove();
  const manufacturerNote = main.querySelector(".npr-source-manufacturer-details p.npr-reference");
  if (manufacturerNote) manufacturerNote.textContent = "Check the actual packaging before use.";
  // Future generated source pages include the mount and module themselves.
  if (main.querySelector("[data-npr-retail-sku]") ||
      document.querySelector('script[src="/assets/js/nutraxin-retail-store.js"]')) return;
  const notice = [...main.querySelectorAll("p.npr-reference")].find(p =>
    p.textContent.startsWith("Full ingredients, directions, warnings and final ordering terms") ||
    p.textContent.startsWith("Manufacturer's online product information, reviewed 26 November 2026."));
  if (!notice) return;
  notice.setAttribute("data-npr-order-notice", "");
  const host = document.createElement("div");
  host.setAttribute("data-npr-retail-sku", "NP-CP-" + gtin);
  main.append(host);
  const module = document.createElement("script");
  module.type = "module";
  module.src = "/assets/js/nutraxin-retail-store.js";
  document.body.append(module);
})();
