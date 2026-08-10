# Content Model

Status: shared governance implemented; application adoption documented per migration
Review date: 1 August 2026

## Authorities

| Content domain | Authority | Consumers |
|---|---|---|
| Organisation and people | `packages/content/src/index.ts` | Corporate, Founder, Technology, Portal and SEO graph |
| Publishable claims | `packages/claims/src/index.ts` | Visible copy, schema and claim-audit checks |
| Public route/page composition | Application `data/` and `content/` records | Next.js server/static renderers |
| Founder publications | `apps/founder/lib/site-data.ts` | Homepage, Thinking, Media, feed, schema, search and knowledge manifest |
| Portal modules | `packages/portal-contracts/src/module-catalog.json` | Portal routes/navigation/API and maturity report |
| Product/catalogue evidence | Governed JSON registers under `docs/`, `apps/corporate/data/` and private schemas | Corporate portfolio and controlled internal workflows |

## Core fields

Public records carry a stable identifier, canonical name/URL, visible title, description, state, evidence reference, owner, jurisdiction where relevant, review date and publication decision. Articles additionally carry author, reviewer where real, publication/modified dates, reading metadata, primary sources, topic relationships and representative media.

## State model

- `current`: verified current fact with sufficient evidence.
- `active`: active corporate or programme state that does not imply a regulated authorisation.
- `in_development`: work exists but is not operational.
- `planned`: intended and not operational.
- `target`: market or capability intention.
- `subject_to_authorisation`: cannot operate before the applicable permission/release.
- `held_for_evidence`: not publishable as the requested fact.

Visible content and JSON-LD must resolve to the same state. A schema object cannot strengthen a caveated visible statement.

## Editorial lifecycle

1. Author drafts from approved facts and primary sources.
2. Content owner checks purpose, audience, originality and privacy.
3. Qualified reviewer checks technical/regulatory material where assigned.
4. Claims gate rejects unsupported, expired or contradictory statements.
5. Accessibility/SEO checks validate the rendered page.
6. Publication records the meaningful modified date.
7. Scheduled or event-driven review updates, corrects, archives or removes content.

Cosmetic builds do not create fake freshness. External publications store metadata and an original concise abstract only; copyrighted article bodies remain at the publisher.
