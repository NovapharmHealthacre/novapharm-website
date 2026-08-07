# Polar Speed Integration Architecture

Polar Speed is treated as NovaPharm's intended third-party warehouse and final-mile logistics integration boundary under an owner-attested contracted arrangement. No public developer API contract was available during implementation, and no Polar Speed authorisation, certificate or operating status is attributed to NovaPharm.

## Implemented boundary

- `src/integrations/polar-speed/client.mjs` defines the authenticated API adapter.
- `src/integrations/polar-speed/sync-engine.mjs` processes `polar_speed` outbox events.
- Sales orders enqueue stock-reservation events through the canonical order service.
- Missing credentials or endpoint paths block events with explicit error codes instead of pretending integration success.

## Required API contract

NovaPharm needs Polar Speed to provide:

- Authentication method and token format.
- Order reservation endpoint.
- Dispatch creation endpoint.
- Inventory availability endpoint.
- Tracking/status endpoint.
- Proof-of-delivery endpoint.
- Temperature telemetry format.
- Error model and retry rules.
- Webhook/signature specification if event callbacks are supported.

## Data relationship

`orders` and `order_lines` remain the source of commercial order truth. Polar Speed becomes the source for allocation, warehouse, dispatch, delivery, POD, return and temperature telemetry once the integration is enabled.
