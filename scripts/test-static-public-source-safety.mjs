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
      "data-password-change-form",
      "data-api-base"
    ]
  },
  {
    path: "contact/index.html",
    required: [
      "This public information release does not collect or transmit enquiry details"
    ],
    forbidden: [
      "data-contact-form",
      "<form",
      "data-file-upload",
      "data-api-base"
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
      "Submit application",
      "data-api-base"
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

if (failures.length) {
  console.error("Static public source is not default-deny:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Static public source is default-deny: public safety declarations are present and authentication, enquiry submission, account-document submission, and API-bound forms are absent.");
