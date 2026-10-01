export type EnquiryReceipt = Readonly<{ id: string; reference: string }>;

export function enquiryRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const deadline = AbortSignal.timeout(20_000);
  return fetch(`/api/platform${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline,
  });
}

export async function requireEnquiryReceipt(response: Response): Promise<EnquiryReceipt> {
  if (!response.ok) throw Object.assign(new Error("submission_failed"), { status: response.status });
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true || !("lead" in payload)) {
    throw Object.assign(new Error("receipt_unconfirmed"), { status: 502 });
  }
  const lead = payload.lead;
  if (!lead || typeof lead !== "object" || !("id" in lead) || typeof lead.id !== "string" || !lead.id.trim()
    || !("leadNumber" in lead) || typeof lead.leadNumber !== "string" || !lead.leadNumber.trim()) {
    throw Object.assign(new Error("receipt_unconfirmed"), { status: 502 });
  }
  return Object.freeze({ id: lead.id.trim(), reference: lead.leadNumber.trim() });
}

export function submissionUnconfirmed(status: number, submissionStarted: boolean): boolean {
  return submissionStarted && (status === 0 || status >= 500);
}

export const unconfirmedEnquiryMessage = "We could not confirm whether your enquiry was recorded. Your information remains in this form. Please contact NovaPharm through the verified email route before submitting it again.";
