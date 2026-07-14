# Structured Data Register

Version: 1.0  
Last reviewed: 14 July 2026

| Schema | Where used | Entity/source | Validation rule |
|---|---|---|---|
| `Organization` / `Corporation` | Site-wide organisation graph | Verified NovaPharm company data and official logo | One canonical `#organisation` entity |
| `WebSite` | Homepage graph | Canonical apex website | Public pages only |
| `WebPage` | All indexable pages | Page title, description, URL | Self-canonical and one H1 |
| `BreadcrumbList` | Nested public pages | Visible breadcrumb route | URLs must resolve locally |
| `ProfilePage` and `Person` | Five leadership profiles | Approved profile copy and status | No invented portrait, career or education |
| `Article` | Six Insights articles | Structured article source, author, dates and citations | Substantive content only |
| `Service` | Service/regulatory pages | Qualified B2B capability text | Planned status retained where applicable |
| `FAQPage` | Pages with visible FAQs | Exact visible question/answer content | No hidden SEO-only questions |
| `ContactPage` | Contact | Controlled corporate contact route | No private personal contact data |

`Product`, `Dataset`, `VideoObject`, `JobPosting` and medical schemas are not emitted unless the underlying authorised public object genuinely exists. The official logo URL is `https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png`; the SVG remains the preferred visible web asset.

