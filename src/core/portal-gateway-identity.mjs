import { createHash } from "node:crypto";
import { insertIgnore, nowIso, run } from "../data/database.mjs";
import {
	portalGatewaySignatureMatches,
	validPortalGatewaySecret,
} from "./portal-gateway-signature.mjs";

const maximumAssertionAgeMs = 60_000;
const maximumClockLeadMs = 5_000;
const accessTypes = new Set(["customer", "employee", "board", "admin"]);

function header(request, name) {
	const value =
		request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
	return Array.isArray(value) ? value[0] : String(value || "");
}

export async function verifyPortalGatewayIdentity(
	request,
	environment = process.env,
) {
	const secret = String(environment.PORTAL_GATEWAY_SECRET || "");
	if (!validPortalGatewaySecret(secret)) return null;

	const timestamp = header(request, "x-novapharm-gateway-timestamp");
	const nonce = header(request, "x-novapharm-gateway-nonce");
	const accessType = header(
		request,
		"x-novapharm-gateway-access",
	).toLowerCase();
	const signature = header(request, "x-novapharm-gateway-signature");
	const principal = header(request, "x-ms-client-principal");
	const timestampValue = Number(timestamp);
	const age = Date.now() - timestampValue;

	if (
		!Number.isSafeInteger(timestampValue) ||
		age < -maximumClockLeadMs ||
		age > maximumAssertionAgeMs
	)
		return null;
	if (!accessTypes.has(accessType)) return null;
	if (
		!portalGatewaySignatureMatches({
			secret,
			timestamp,
			nonce,
			method: request.method,
			pathname: "/api/auth/federated",
			accessType,
			principal,
			signature,
		})
	)
		return null;

	const tokenHash = createHash("sha256")
		.update(`${timestamp}:${nonce}:${signature}`)
		.digest("hex");
	const consumedAt = nowIso();
	const expiresAt = new Date(
		timestampValue + maximumAssertionAgeMs,
	).toISOString();
	const inserted = await insertIgnore(
		"security_replay_tokens",
		{
			token_hash: tokenHash,
			purpose: "portal_federated_identity",
			expires_at: expiresAt,
			consumed_at: consumedAt,
		},
		["token_hash"],
	);
	await run(
		"DELETE FROM security_replay_tokens WHERE expires_at < ?",
		consumedAt,
	);
	if (!inserted.changes) return null;
	return Object.freeze({ principalHeader: principal, accessType });
}
