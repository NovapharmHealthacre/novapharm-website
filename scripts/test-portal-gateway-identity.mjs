import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

const databasePath = `/tmp/novapharm-gateway-${process.pid}-${Date.now()}.sqlite`;
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_PATH = databasePath;

const { createPortalGatewaySignature } = await import(
	"../src/core/portal-gateway-signature.mjs"
);
const { verifyPortalGatewayIdentity } = await import(
	"../src/core/portal-gateway-identity.mjs"
);
const { closeDatabase } = await import("../src/data/database.mjs");

const secret = randomBytes(48).toString("base64url");
const principal = Buffer.from(
	JSON.stringify({ claims: [{ typ: "name", val: "Synthetic Identity" }] }),
).toString("base64");

function requestFor({
	timestamp = String(Date.now()),
	nonce = randomUUID(),
	accessType = "employee",
	suppliedPrincipal = principal,
} = {}) {
	const signature = createPortalGatewaySignature({
		secret,
		timestamp,
		nonce,
		method: "POST",
		pathname: "/api/auth/federated",
		accessType,
		principal: suppliedPrincipal,
	});
	return {
		method: "POST",
		headers: {
			"x-ms-client-principal": suppliedPrincipal,
			"x-novapharm-gateway-timestamp": timestamp,
			"x-novapharm-gateway-nonce": nonce,
			"x-novapharm-gateway-access": accessType,
			"x-novapharm-gateway-signature": signature,
		},
	};
}

try {
	const acceptedRequest = requestFor();
	const accepted = await verifyPortalGatewayIdentity(acceptedRequest, {
		PORTAL_GATEWAY_SECRET: secret,
	});
	assert.equal(accepted.accessType, "employee");
	assert.equal(accepted.principalHeader, principal);
	assert.equal(
		await verifyPortalGatewayIdentity(acceptedRequest, {
			PORTAL_GATEWAY_SECRET: secret,
		}),
		null,
		"A consumed assertion must not be replayed.",
	);

	const tamperedRequest = requestFor();
	tamperedRequest.headers["x-ms-client-principal"] = `${principal}tampered`;
	assert.equal(
		await verifyPortalGatewayIdentity(tamperedRequest, {
			PORTAL_GATEWAY_SECRET: secret,
		}),
		null,
	);

	const staleRequest = requestFor({ timestamp: String(Date.now() - 120_000) });
	assert.equal(
		await verifyPortalGatewayIdentity(staleRequest, {
			PORTAL_GATEWAY_SECRET: secret,
		}),
		null,
	);
	assert.equal(await verifyPortalGatewayIdentity(requestFor(), {}), null);
} finally {
	await closeDatabase();
	rmSync(databasePath, { force: true });
}

console.log(
	"Portal gateway identity tests passed: signed handoff, tamper rejection, expiry, missing-key denial and database-backed replay protection.",
);
