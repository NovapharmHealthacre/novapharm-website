# Corporate information architecture

Last reviewed: 2026-08-22

## Global navigation

The corporate header exposes seven stable category-level destinations:

1. Company
2. Capabilities
3. Oncology
4. Products
5. Insights
6. Contac
7. Secure Portal

The logo returns to the homepage. `Open a Business Account` belongs to the
account journey rather than the primary information hierarchy.

## Local navigation

### Company

- Overview: `/about/`
- Leadership: `/about/leadership/`
- Governance: `/about/governance/`
- Partners: `/partners/`
- Investors: `/investors/`
- Careers: `/careers/`

### Capabilities

- Overview: `/capabilities/`
- Services: `/services/`
- Regulatory & Quality: `/regulatory/`
- Clinical Research & CRO: `/clinical-research-organisation/`
- Technology: `/technology/`

### Products

- Overview: `/products/`
- Nutraxin: `/products/nutraxin/`
- Strategic Pharmaceutical Portfolio: `/products/strategic-portfolio/`

### Accoun

- Open a Business Account: `/open-an-account/`

## Redirect policy

Existing public URLs remain usable through canonical redirects or generated
compatibility pages. The principal mappings are:

| Previous source | Canonical destination |
| --- | --- |
| `/product-portfolio/` | `/products/` |
| `/product-portfolio/nutraxin/` | `/products/nutraxin/` |
| `/cro/` | `/clinical-research-organisation/` |

Redirects must preserve query strings where relevant, avoid chains and use a
permanent response only after managed-runtime validation.

## Route purpose

| Route family | Single purpose |
| --- | --- |
| Homepage | Establish who NovaPharm is, how it approaches supply and how a qualified organisation can proceed. |
| Company | Explain identity, leadership and governance without repeating the homepage. |
| Capabilities | Help an organisation identify the relevant regulated-market support pathway. |
| Oncology | Explain the evidence-led oncology collaboration model without implying clinical or supply authority. |
| Products | Separate a verified food-supplement catalogue from a non-commerce strategic pharmaceutical opportunity portfolio. |
| Insights | Provide authored, reviewable regulated-market analysis. |
| Contact | Route a qualified enquiry to the shortest truthful managed workflow. |
| Secure Portal | Explain or enter the protected service only when its managed authority is available. |

## Navigation acceptance rules

- No icon-only controls in corporate navigation.
- The mobile disclosure control uses the visible word `Menu` and exposes an
  accessible state.
- Local navigation follows the page heading and never competes with the global
  header.
- Keyboard focus order matches the visual order.
- Current-page state is conveyed semantically and not by colour alone.
- At 320 px, all controls remain visible without horizontal precision
  scrolling.
