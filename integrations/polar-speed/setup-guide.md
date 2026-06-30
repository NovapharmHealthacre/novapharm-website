# Polar Speed Setup Guide

## Environment Variables

```sh
POLAR_SPEED_API_BASE_URL=
POLAR_SPEED_API_KEY=
POLAR_SPEED_ACCOUNT_NUMBER=
POLAR_SPEED_RESERVE_STOCK_PATH=
POLAR_SPEED_DISPATCH_PATH=
POLAR_SPEED_TRACKING_PATH=
POLAR_SPEED_INVENTORY_PATH=
POLAR_SPEED_TIMEOUT_MS=30000
```

Use the exact endpoint paths supplied by Polar Speed or Marken. For example, if tracking is documented as `/shipments/{reference}`, set `POLAR_SPEED_TRACKING_PATH=/shipments/{reference}`.

## Validation Steps

1. Confirm credentials in the production environment.
2. Create a test customer, approved product and order.
3. Confirm an `order.wms_reservation_requested` event is created.
4. Run `POST /api/integrations/polar-speed/sync` as an admin user.
5. Confirm the integration event moves to `succeeded`.
6. Reconcile the external Polar Speed reference back into `warehouse_transactions`.

## Current Blocker

The code is ready for an API contract, but live warehouse connectivity cannot be completed until NovaPharm receives Polar Speed/Marken integration credentials and endpoint documentation.
