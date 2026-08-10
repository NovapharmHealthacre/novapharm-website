export interface PortalGatewayAssertion {
	readonly secret: string;
	readonly timestamp: string;
	readonly nonce: string;
	readonly method: string;
	readonly pathname: string;
	readonly accessType: "customer" | "employee" | "board" | "admin";
	readonly principal: string;
}

export function validPortalGatewaySecret(secret: unknown): boolean;
export function createPortalGatewaySignature(
	assertion: PortalGatewayAssertion,
): string;
export function portalGatewaySignatureMatches(
	assertion: PortalGatewayAssertion & { readonly signature: string },
): boolean;
