# NovaPharm — IMDF venue submission preflight

**State:** offline source-only acceptance tool, not a licensed/validated physical venue, indoor-navigation deployment, safety certification or substitute for the official IMDF validator. **Do not store private warehouse geometry or legal approval documents in this public repository.**

## User-supplied evidence

The owner-supplied `IMDF.zip` (README dated **5 August 2021**) was inspected directly. It contains two IMDF data-model diagrams (full and high-level), `categories_20210728.csv` with **2,038 feature-category rows**, and the `imdf-validations` CSV rule catalogues for versions 1.0.0.beta.2, 1.0.1, 1.0.2 and 1.0.3 (**358 rows** in 1.0.3). These are **specification/reference artifacts only**; the ZIP contains no GeoJSON, surveyed buildings, footprints, units, entrances or floor polygons. Do not mistake its categories or rules for a populated map or successful validation report.

Primary reference: [Apple's Indoor Mapping Data Format](https://register.apple.com/resources/imdf/).

## Run offline against an authorised private venue directory

```sh
node scripts/imdf/venue-preflight.mjs /path/to/approved-private-imdf-venue
node --test scripts/imdf/venue-preflight.test.mjs
```

The input must include a versioned `manifest.json`; nonempty `venue.geojson`, `footprint.geojson`, `building.geojson`, `level.geojson`, `unit.geojson` and `opening.geojson` FeatureCollections; and a **NovaPharm-specific** local `nova-venue-rights.json` evidence sidecar with `owner_name`, `rights_reference`, `approved_by` and ISO-8601 `approved_at`. The rights sidecar is **not part of the Apple IMDF specification** and its existence is not itself a genuine authorisation. Named internal reviewers must verify the underlying owner signatures, permitted uses, jurisdiction and revision history before data ingestion.

This preliminary validator rejects missing files, malformed collection/feature types, missing or duplicate UUIDs, invalid numeric coordinates, open/underspecified polygon rings, orphaned unit/opening level references and unresolved footprint-building references. It does **not** certify complete official Apple IMDF schema compliance, floor adjacency, geometry topology, accurate dimensions, internal roads, ADA/accessibility compliance, fire exit/safety routing, live warehouse stock, legal approval authenticity, user/tenant authorisation or production deployment.

A passing local result has `scope: "STRUCTURAL_PREFLIGHT_ONLY"`. Only after separate official validator success, owner approval, a physical on-site survey, controlled tenant admission, end-to-end iOS/Android/web testing and appropriate security sign-offs may an actual venue be considered for a published map. Do not make an emergency egress or vehicle navigation claim based on this tool.

## Privacy and source controls

- Private addresses, floor layouts and sensitive site metadata stay in the approved private environment, never in this repository, CI logs or third-party public map links.
- Sample geometries in unit tests are entirely synthetic and exist solely to verify that malformed submissions fail closed.
- Keep patient, dispensing, business-sensitive fleet and distribution movement data outside this preflight; the Apple MapKit JS use proposed for protected geographic research is not an approval for cross-platform warehouse fleet tracking.
- Source rights, country, survey timestamp, venue owner and update/rollback responsibilities must be accepted in the operating system; a local `.json` file cannot provide independent proof.

## Release isolation and independent acceptance

This offline IMDF preflight is a **source-evidence and geometry-denial gate only**, not a surveyed venue, approved indoor-map dataset, production MapKit tile entitlement or floor-navigation release. Exact source-file changes in `.github/workflows/imdf-venue-evidence-preflight.yml`, `docs/maps/imdf-venue-preflight-20261119.md`, `scripts/imdf/venue-preflight.mjs` and `scripts/imdf/venue-preflight.test.mjs` are private/source-only work and must **not** dispatch the unrelated AWS contact-publication workflow. Mixed changes to the public site, Nutraxin catalogue, customer contact or any unreviewed tool retain ordinary release gates. See security-tracking issue #867.

The 19 November 2026 IMDF-only merge inadvertently entered an AWS-contact release workflow. Publisher run #44461838697 failed the forward-only ancestor/evidence check and skipped the real Pages publication and every live-domain check; this is not production deployment evidence. The next source-only release must verify both dispatcher and publisher skip their AWS/public deployment steps on the exact main merge commit. Surveyed IMDF rights, geometry admission, floor-level routes, device testing, MapKit domain token, native signing and owner production sign-off remain separately outstanding.
