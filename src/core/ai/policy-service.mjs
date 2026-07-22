import { internalAiUseCase, scopePermitsUseCase } from "./use-case-registry.mjs";

const injectionPattern = /\b(ignore (?:all |the )?(?:previous|prior|system) instructions?|reveal (?:the )?system prompt|bypass (?:the )?(?:policy|restrictions?|role)|developer message|jailbreak|execute javascript|print (?:all )?(?:database )?(?:credentials|secrets|tokens)|access another customer)\b/i;
const exfiltrationPattern = /\b(?:show|reveal|list|print|access)\b[^.\n]{0,60}\b(?:private document|confidential record|credentials?|secrets?|tokens?|passwords?|another customer)\b/i;
const medicalPattern = /\b(diagnos(?:e|is)|treat(?:ment)?|dosage|dose|medicine selection|prescrib|patient-specific|clinical recommendation)\b/i;
const autonomousDecisionPattern = /\b(auto(?:matically|nomously)? (?:approve|reject|release|publish|prescribe)|guarantee approval|approval probability|credit score|supplier score)\b/i;

function deny(code, message, statusCode = 403) {
  return { allowed: false, code, message, statusCode };
}

export function evaluateInternalAiPolicy({ useCaseId, input, scopes = [], records = [] }) {
  const useCase = internalAiUseCase(useCaseId);
  if (!useCase) return deny("unknown_use_case", "This AI review workflow is not registered.", 400);
  if (!scopePermitsUseCase(scopes, useCase)) return deny("scope_denied", "This identity is not authorised for the requested AI review workflow.");
  const text = String(input || "").trim();
  if (!text) return deny("input_required", "Review input is required.", 400);
  if (text.length > 20000) return deny("input_too_large", "Review input exceeds the controlled limit.", 413);
  if (!Array.isArray(records) || records.length > 40) return deny("record_limit", "The authorised source-record limit was exceeded.", 413);
  if (injectionPattern.test(text)) return deny("prompt_injection", "The request conflicts with NovaPharm's AI security policy.");
  if (exfiltrationPattern.test(text)) return deny("data_exfiltration", "The workflow cannot retrieve or disclose records outside the authorised source set.");
  if (autonomousDecisionPattern.test(text)) return deny("autonomous_decision", "AI cannot make or guarantee a regulated, quality, commercial or publication decision.");
  if (medicalPattern.test(text) && useCase.id !== "support-enquiry-classification") {
    return deny("medical_content", "This workflow cannot provide medical or patient-specific advice.");
  }
  const unsupportedSource = records.find((record) => !useCase.sourceTypes.includes(String(record?.sourceType || "")));
  if (unsupportedSource) return deny("source_not_authorised", "A supplied record is outside the approved source classes for this workflow.");
  return { allowed: true, useCase };
}
