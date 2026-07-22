import { createHash, randomUUID } from "node:crypto";
import { audit } from "../../data/database.mjs";

export async function recordAiReviewEvent({ actor, useCaseId, input, recordCount, outcome, provider, persist = true }) {
  const eventId = randomUUID();
  const details = {
    eventId,
    useCaseId,
    provider,
    outcome,
    inputSha256: createHash("sha256").update(String(input || "")).digest("hex"),
    inputCharacters: String(input || "").length,
    recordCount: Number(recordCount || 0),
    promptBodyStored: false,
    humanReviewRequired: true,
    productionWriteAllowed: false
  };
  if (persist) await audit({ actor, action: "ai.review_requested", entityType: "ai_use_case", entityId: useCaseId, details });
  return details;
}
