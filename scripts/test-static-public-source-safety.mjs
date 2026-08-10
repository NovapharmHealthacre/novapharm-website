import { readFileSync } from "node:fs";

const contracts = [
  {
    path: "portal/index.html",
    required: [
      "This public website never asks for a portal username, password or confidential company record",
      "No authentication occurs here."
    ],
    forbidden: ["data-login-form", "data-entra-login", 'type="password"', "/.auth/login/", "bootstrap account"]
  },
  {
    path: "contact/index.html",
    required: ["This public information release does not collect or transmit enquiry details", "No enquiry data is collected here."],
    forbidden: ["data-contact-form", "<form", "data-file-upload"]
  },
  {
    path: "account-application/index.html",
    required: ["This public information release does not accept account applications or business documents", "No application data is collected here."],
    forbidden: ["data-account-application", "<form", 'type="file"', "data-step-next", "Submit application"]
  }
];

const failures = [];
for (const contract of contracts) {
  const source = readFileSync(contract.path, "utf8");
  for (const required of contract.required) {
    if (!source.includes(required)) failures.push(`${contract.path}: missing required public-safety text: ${required}`);
  }
  for (const forbidden of contract.forbidden) {
    if (source.includes(forbidden)) failures.push(`${contract.path}: forbidden operational surface present: ${forbidden}`);
  }
}

if (failures.length) {
  console.error("Checked-in static public source is not safe for legacy Pages:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Checked-in static public source is default-deny: portal authentication, enquiry submission and account-document submission are absent.");
