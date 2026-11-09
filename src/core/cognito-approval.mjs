const allowedScopes = new Set(["employee", "board", "admin"]);

export function reviewedCognitoWorkforceApproval(subject, email, environment = process.env) {
  if (environment.COGNITO_WORKFORCE_BACKEND_ENABLED !== "true") return null;
  if (typeof subject !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(subject)) return null;
  let approvals;
  try { approvals = JSON.parse(environment.COGNITO_WORKFORCE_APPROVALS_JSON || ""); } catch { return null; }
  if (!approvals || Array.isArray(approvals) || typeof approvals !== "object") return null;
  const approved = Object.hasOwn(approvals, subject) ? approvals[subject] : null;
  if (!approved || typeof approved !== "object" || Array.isArray(approved) || !allowedScopes.has(approved.scope)) return null;
  if (typeof approved.expectedEmail !== "string" || approved.expectedEmail.toLowerCase() !== email ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) return null;
  return Object.freeze({ scope: approved.scope, expectedEmail: email });
}
