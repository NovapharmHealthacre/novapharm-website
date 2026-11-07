import { readFileSync } from "node:fs";

const contracts = [
  {
    path: "portal/index.html",
    required: [
      "This public website never asks for a portal username, password or confidential company record"
    ],
    forbidden: [
      "data-login-form",
      "data-entra-login",
      'type="password"',
      "/.auth/login/",
      "bootstrap account",
      "data-password-change-form"
    ]
  },
  {
    path: "contact/index.html",
    required: [
      "This public information release does not collect or transmit enquiry details"
    ],
    forbidden: [
      "data-contact-form",
      "data-file-upload",
      'type="file"',
      'action="/api'
    ]
  },
  {
    path: "account-application/index.html",
    required: [
      "This public information release does not accept account applications or business documents",
      "No application data is collected here."
    ],
    forbidden: [
      "data-account-application",
      "<form",
      'type="file"',
      "data-step-next",
      "Submit application"
    ]
  }
];

const failures = [];
for (const contract of contracts) {
  const source = readFileSync(contract.path, "utf8");
  for (const required of contract.required) {
    if (!source.includes(required)) {
      failures.push(`${contract.path}: missing required public-safety declaration: ${required}`);
    }
  }
  for (const forbidden of contract.forbidden) {
    if (source.includes(forbidden)) {
      failures.push(`${contract.path}: forbidden operational surface present: ${forbidden}`);
    }
  }
}

// The sole permitted public interaction is an email-client draft. Neither this
// markup nor its optional JS enhancement may submit to the website or persist
// entered contact details. Old checked-in public-only output is also safe.
const publicContact = readFileSync("contact/index.html", "utf8");
if (publicContact.includes("data-email-enquiry-form")) {
  if ((publicContact.match(/<form\b/gi) ?? []).length !== 1) {
    failures.push("contact/index.html: only one local email-draft form may appear");
  }
  if (!/<form\b[^>]*data-email-enquiry-form[^>]*action="mailto:vishal@novapharmhealthcare\.com"[^>]*method="post"/.test(publicContact)) {
    failures.push("contact/index.html: email form must use the approved mailto action, never HTTP");
  }
  if (!publicContact.includes('src="/assets/js/contact-email-draft.js"')) {
    failures.push("contact/index.html: the explicit email-only enhancement is missing");
  }
  const draftScript = readFileSync("assets/js/contact-email-draft.js", "utf8");
  if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/.test(draftScript)) {
    failures.push("assets/js/contact-email-draft.js: network or persistent storage API is forbidden");
  }
} else if (/<form\b/i.test(publicContact)) {
  failures.push("contact/index.html: unexpected non-email public form");
}

if (failures.length) {
  console.error("Static public source is not default-deny:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Static public source is default-deny: public safety declarations are present and authentication, enquiry submission, account-document submission, and uploads are absent.");
