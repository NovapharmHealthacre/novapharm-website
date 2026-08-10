import { createHmac, timingSafeEqual } from "node:crypto";

const accessTypes = new Set(["customer", "employee", "board", "admin"]);

function canonicalAssertion({
	timestamp,
	nonce,
	method,
	pathname,
	accessType,
	principal,
}) {
	return [
		timestamp,
		nonce,
		method.toUpperCase(),
		pathname,
		accessType,
		principal,
	].join("\n");
}

export function validPortalGatewaySecret(secret) {
	const value = String(secret || "");
	return (
		Buffer.byteLength(value, "utf8") >= 32 &&
		!value.startsWith("@Microsoft.KeyVault(")
	);
}

export function createPortalGatewaySignature({
	secret,
	timestamp,
	nonce,
	method,
	pathname,
	accessType,
	principal,
}) {
	if (!validPortalGatewaySecret(secret))
		throw new Error("The portal gateway signing key is unavailable.");
	if (!/^\d{13}$/.test(String(timestamp)))
		throw new Error("The portal gateway timestamp is invalid.");
	if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(nonce)))
		throw new Error("The portal gateway nonce is invalid.");
	if (
		String(method).toUpperCase() !== "POST" ||
		pathname !== "/api/auth/federated"
	)
		throw new Error("The portal gateway route is invalid.");
	if (!accessTypes.has(accessType))
		throw new Error("The portal gateway access type is invalid.");
	if (!principal || Buffer.byteLength(principal, "utf8") > 32_768)
		throw new Error("The portal gateway principal is invalid.");
	return createHmac("sha256", secret)
		.update(
			canonicalAssertion({
				timestamp: String(timestamp),
				nonce: String(nonce),
				method,
				pathname,
				accessType,
				principal,
			}),
		)
		.digest("base64url");
}

export function portalGatewaySignatureMatches(assertion) {
	let expected;
	try {
		expected = createPortalGatewaySignature(assertion);
	} catch {
		return false;
	}
	const expectedBytes = Buffer.from(expected, "base64url");
	const suppliedBytes = Buffer.from(
		String(assertion.signature || ""),
		"base64url",
	);
	return (
		suppliedBytes.length === expectedBytes.length &&
		timingSafeEqual(suppliedBytes, expectedBytes)
	);
}
