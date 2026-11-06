import { readFileSync } from "node:fs";

function fail(message) {
  throw new Error("AWS Free Plan guard: " + message);
}

export function checkFreePlan(state, { expectedAccount, minimumCreditsUsd = 25, minimumDays = 14, now = new Date() } = {}) {
  if (!/^[0-9]{12}$/.test(String(expectedAccount || ""))) fail("a verified 12-digit project AWS account ID is required");
  if (!state || typeof state !== "object") fail("Free Tier response must be an object");
  if (state.accountId !== expectedAccount) fail("Free Tier account does not match authenticated project account");
  if (state.accountPlanType !== "FREE" || state.accountPlanStatus !== "ACTIVE") {
    fail("only an active FREE account plan is authorized, not PAID, inactive or expired plans");
  }
  const credits = state.accountPlanRemainingCredits;
  if (credits?.unit !== "USD" || !Number.isFinite(credits.amount)) fail("remaining USD credits are missing or invalid");
  if (!Number.isFinite(minimumCreditsUsd) || minimumCreditsUsd <= 0) fail("minimum credit threshold must be a positive number");
  if (credits.amount < minimumCreditsUsd) fail("remaining credits are below the required safety reserve");
  const expiration = Date.parse(state.accountPlanExpirationDate);
  const minDays = Number(minimumDays);
  if (!Number.isFinite(expiration) || !Number.isFinite(minDays) || minDays < 1) fail("Free Plan expiry date or safety window is invalid");
  if (expiration <= now.getTime() + minDays * 86400000) fail("Free Plan expires within the safety window");
  return { accountPlanType: "FREE", accountPlanStatus: "ACTIVE", accountId: expectedAccount, remainingCreditsUsd: credits.amount, expirationDate: state.accountPlanExpirationDate };
}

if (process.argv[1]?.endsWith("check-free-plan.mjs")) {
  try {
    if (!process.argv[2]) fail("path to AWS Free Tier JSON response is required");
    const state = JSON.parse(readFileSync(process.argv[2], "utf8"));
    checkFreePlan(state, {
      expectedAccount: process.env.EXPECTED_ACCOUNT,
      minimumCreditsUsd: Number(process.env.AWS_MIN_AVAILABLE_CREDITS_USD || 25),
      minimumDays: Number(process.env.AWS_MIN_REMAINING_DAYS || 14)
    });
    console.log("PASS: verified active AWS FREE plan, project identity, reserve and expiry safety window. This check does not provision services or authorize spend.");
  } catch (error) {
    console.error(error?.message || "Unknown Free Plan guard failure");
    process.exitCode = 1;
  }
}
