const rules = Object.freeze([
  {
    id: "prompt-injection",
    pattern: /\b(ignore (?:all |the )?(?:previous|prior|system) instructions?|reveal (?:the )?system prompt|bypass (?:the )?(?:rules|restrictions|policy)|developer message|execute javascript|script tag|jailbreak|<script|phishing email)\b/i,
    message: "I cannot follow instructions that attempt to bypass the evidence, privacy or safety boundaries of this service."
  },
  {
    id: "medical-advice",
    pattern: /\b(diagnos(?:e|is)|symptoms?|treat(?:ment)?|dosage|dose|(?:drug )?interactions?|pregnan(?:t|cy)|paediatric|pediatric|which medicine|what medicine|prescrib(?:e|ing)?|cure|side effect|how should (?:a )?child take)\b/i,
    message: "NovaPharm's public assistant cannot provide diagnosis, treatment, dosage, medicine-selection or prescribing advice. Please speak with an appropriate healthcare professional. For suspected side effects, use the MHRA Yellow Card service; for an emergency call 999."
  },
  {
    id: "safety-event",
    pattern: /\b(adverse event|adverse reaction|product defect|quality complaint|medicine defect|urgent safety|yellow card|medical emergency|overdose)\b/i,
    message: "This assistant cannot receive or assess adverse events, product defects or urgent medical information. Use the MHRA Yellow Card service for suspected side effects or product-safety concerns, and call 999 for an emergency. Do not enter patient-identifiable information here."
  },
  {
    id: "patient-or-controlled-access",
    pattern: /\b(patient(?:'s)? (?:record|file|history|information|data)|named patient|my patient|another patient|child(?:'s)? medical record|buy|purchase|order (?:a )?prescription|prescription medicine|controlled substance|controlled drug)\b/i,
    message: "NovaPharm's public website is B2B and cannot process patient records, named-patient enquiries, prescription purchases or controlled-drug access requests."
  },
  {
    id: "private-or-secret",
    pattern: /\b(private document|confidential|contract|supplier price|supplier pricing|customer data|all users|database credentials?|passwords?|secrets?|api tokens?|session secret|another customer|portal records?)\b/i,
    message: "I cannot access or disclose private records, credentials, portal information, supplier pricing or another party's data. Public answers are limited to NovaPharm's approved published information."
  },
  {
    id: "financial-forecast",
    pattern: /\b(revenue forecasts?|financial forecasts?|profit forecasts?|ebitda|valuation|cap table|investment return|future revenue|margin forecasts?|investor projections?)\b/i,
    message: "I cannot provide private financial forecasts, valuation material or unpublished investment information."
  },
  {
    id: "unapproved-availability",
    pattern: /\b(live stock|stock level|in stock|available now|available products?|product availability|current prices?|live price|price list|guarantee(?:d)? (?:product )?availability|approved products?|products? (?:are|is) approved|which products? (?:are|is) available)\b/i,
    message: "I cannot verify live stock, price, availability or product approval from NovaPharm's public information. Product and regulatory status must be confirmed through the appropriate controlled B2B process."
  },
  {
    id: "legal-or-personal-regulatory-advice",
    pattern: /\b(legal advice|my legal|guarantee approval|approval probability|will mhra approve|personalised regulatory|personalized regulatory)\b/i,
    message: "This assistant cannot provide legal advice, personalised regulatory advice or predict an authority decision. It can retrieve published corporate information and official source links."
  }
]);

export function evaluatePublicPolicy(query) {
  const value = String(query || "").trim();
  if (!value) return { allowed: false, category: "empty", message: "Enter a question or search term." };
  if (value.length > 500) return { allowed: false, category: "length", message: "Please shorten the question to 500 characters or fewer." };
  const rule = rules.find((candidate) => candidate.pattern.test(value));
  if (rule) return { allowed: false, category: rule.id, message: rule.message };
  return { allowed: true, category: "published-evidence", message: null };
}

export function policyRuleIds() {
  return rules.map((rule) => rule.id);
}

export const ABSTENTION = "I could not verify that from NovaPharm's approved public information.";
