# PharmaScope API v1

PharmaScope API v1 is the stable protected read boundary shared by the managed web Portal and future native clients. It delegates to the same server-authoritative medicine, analytical and geography services as the legacy internal Enterprise routes; it does not duplicate business logic or weaken role checks.

## Authority

- All routes require a valid managed `np_session` and the Board access scope.
- CORS remains restricted to configured Portal origins.
- Existing per-operation rate limits apply to the versioned aliases.
- Validation samples and partial ingestion runs are excluded from all analytical responses.
- The API returns explicit unavailable or source-not-ingested states when facts are absent. It never manufactures medicine metrics, forecasts or commercial opportunity values.
- Production operation remains externally unverified until the managed API, identity and data environment are deployed and accepted at an exact source SHA.

## Routes

| Route | Purpose |
|---|---|
| `GET /api/v1/pharmascope/medicines/search` | Resolve canonical medicine identities and governed aliases. |
| `GET /api/v1/pharmascope/medicines/{medicineId}` | Return one canonical identity and its governed code history. |
| `GET /api/v1/pharmascope/analytics` | Query accepted EPD or PCA observations using one validated filter contract. |
| `GET /api/v1/pharmascope/geography/nearby` | Resolve nearby pharmacies and practices from governed postcode coordinates. |

The normative machine-readable contract is `docs/api/pharmascope-v1.openapi.yaml`. Forecast, opportunity, campaign and mutation routes are deliberately absent until their source, model, approval and audit boundaries are accepted.
