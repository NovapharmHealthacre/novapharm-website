# Polar Speed Integration Architecture

Polar Speed is treated as NovaPharm's warehouse and final-mile logistics integration boundary. Public Marken/UPS Healthcare material describes Polar Speed services, Polar Track temperature/location visibility, Maestro shipment management, and Solo inventory workflows, but a public developer API contract was not available during implementation.

## Implemented boundary

- `src/integrations/polar-speed/client.mjs` defines the authenticated API adapter.
- `src/integrations/polar-speed/sync-engine.mjs` processes `polar_speed` outbox events.
- Sales orders enqueue stock-reservation events through the canonical order service.
- Missing credentials or endpoint paths block events with explicit error codes instead of pretending integration success.

## Required API contract

NovaPharm needs Polar Speed or Marken to provide:

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
