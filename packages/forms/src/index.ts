export const enquiryTypes = Object.freeze([
  "Product opportunity",
  "Distribution partnership",
  "Pharmacy or wholesaler account",
  "CMO/CDMO partnership",
  "Regulatory services",
  "Clinical development & CRO support",
  "Oncology & specialist medicines",
  "Supplier enquiry",
  "Media",
  "Careers",
  "General enquiry"
] as const);

export type EnquiryType = (typeof enquiryTypes)[number];

export interface ContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly role: string;
  readonly country: string;
  readonly telephone?: string;
  readonly enquiryType: EnquiryType;
  readonly message: string;
  readonly safetyConfirmation: boolean;
  readonly privacyAcknowledgement: boolean;
  readonly website?: string;
  readonly source?: {
    readonly page?: string;
    readonly campaign?: string;
    readonly audience?: string;
    readonly cta?: string;
    readonly referrer?: string;
    readonly utmSource?: string;
    readonly utmMedium?: string;
    readonly utmCampaign?: string;
  };
}

type ContactSource = NonNullable<ContactSubmission["source"]>;

export interface ValidationResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly errors: Readonly<Record<string, string>>;
  readonly botDetected: boolean;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function boolean(value: unknown): boolean {
  return value === true || value === "yes" || value === "true";
}

function bounded(value: string, minimum: number, maximum: number): boolean {
  return value.length >= minimum && value.length <= maximum;
}

function safeAttribution(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  return candidate.replace(/[\r\n\t]/g, " ").slice(0, 200);
}

function contactSource(input: Readonly<Record<string, unknown>>): ContactSource {
  const output: Record<string, string> = {};
  for (const [sourceKey, targetKey] of [
    ["page", "page"],
    ["campaign", "campaign"],
    ["audience", "audience"],
    ["cta", "cta"],
    ["referrer", "referrer"],
    ["utmSource", "utmSource"],
    ["utmMedium", "utmMedium"],
    ["utmCampaign", "utmCampaign"]
  ] as const) {
    const value = safeAttribution(input[sourceKey]);
    if (value) output[targetKey] = value;
  }
  return Object.freeze(output) as ContactSource;
}

export function validateContactSubmission(input: Readonly<Record<string, unknown>>): ValidationResult<ContactSubmission> {
  const errors: Record<string, string> = {};
  const name = text(input["name"]);
  const email = text(input["email"]).toLowerCase();
  const company = text(input["company"]);
  const role = text(input["role"]);
  const country = text(input["country"]);
  const telephone = text(input["telephone"]);
  const enquiryType = text(input["enquiryType"]);
  const message = text(input["message"]);
  const safetyConfirmation = boolean(input["safetyConfirmation"]);
  const privacyAcknowledgement = boolean(input["privacyAcknowledgement"]);
  const honeypot = text(input["website"]);

  if (!bounded(name, 2, 120)) errors["name"] = "Enter a name between 2 and 120 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) errors["email"] = "Enter a valid business email address.";
  if (!bounded(company, 2, 160)) errors["company"] = "Enter a company name between 2 and 160 characters.";
  if (!bounded(role, 2, 120)) errors["role"] = "Enter a role between 2 and 120 characters.";
  if (!bounded(country, 2, 80)) errors["country"] = "Enter a country between 2 and 80 characters.";
  if (telephone.length > 40) errors["telephone"] = "Telephone must be 40 characters or fewer.";
  if (!enquiryTypes.some((value) => value === enquiryType)) errors["enquiryType"] = "Select a recognised enquiry type.";
  if (!bounded(message, 20, 2000)) errors["message"] = "Enter a message between 20 and 2,000 characters.";
  if (!safetyConfirmation) errors["safetyConfirmation"] = "Confirm that the message contains no patient, adverse-event or urgent medical information.";
  if (!privacyAcknowledgement) errors["privacyAcknowledgement"] = "Acknowledge the business-enquiry privacy information.";

  const sourceInput = input["source"] && typeof input["source"] === "object" ? input["source"] as Readonly<Record<string, unknown>> : {};
  const value: ContactSubmission = {
    name,
    email,
    company,
    role,
    country,
    ...(telephone ? { telephone } : {}),
    enquiryType: enquiryType as EnquiryType,
    message,
    safetyConfirmation,
    privacyAcknowledgement,
    ...(honeypot ? { website: honeypot } : {}),
    source: contactSource(sourceInput)
  };

  return Object.freeze({ ok: Object.keys(errors).length === 0 && !honeypot, value, errors: Object.freeze(errors), botDetected: Boolean(honeypot) });
}
