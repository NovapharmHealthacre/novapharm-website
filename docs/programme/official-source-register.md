# Official Technical and Compliance Source Register

Status: active
Review date: 30 July 2026

Only primary and official sources are used for implementation decisions. Product/version-specific guidance must be rechecked at the time of deployment.

| Topic | Official source | Decision informed | Owner action |
|---|---|---|---|
| Next.js release support | [Next.js release policy](https://nextjs.org/support-policy) | Use a security-patched Active LTS release, not an unpatched pinned minor | None |
| Next.js self-hosting | [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) | Use a reverse proxy/managed ingress, stable server-action key and deliberate cache/version-skew design | None |
| Next.js static export | [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) | Static export is suitable only for public routes that do not require server features | None |
| Azure Node runtime | [Configure Node.js in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs) | Target supported Node 24 LTS configuration for the managed runtime | Confirm region/SKU at deployment |
| Azure App Service | [App Service overview](https://learn.microsoft.com/en-us/azure/app-service/overview) | Preferred simple managed host for conventional Next.js/Node services | Azure subscription and cost approval |
| Azure managed identity | [Managed identities for Azure resources](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview) | Prefer identity-based service access over stored credentials | Tenant/subscription rights |
| Azure Key Vault | [Key Vault security guidance](https://learn.microsoft.com/en-us/azure/key-vault/general/security-features) | Production secret authority with managed identity and recovery controls | Azure approval |
| Azure SQL authentication | [Microsoft Entra service principals with Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-service-principal) | Prefer managed identity and least-privilege database principals | Entra/SQL administrator action |
| Entra External ID | [Microsoft Entra External ID overview](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview) | Use the current Microsoft customer identity platform for approved external users | External tenant configuration |
| Microsoft Graph permissions | [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference) | Request the least privilege and use selected-site access where feasible | Microsoft admin consent |
| SharePoint selected permissions | [Selected permissions overview](https://learn.microsoft.com/en-us/graph/permissions-selected-overview) | Restrict application access to approved sites/lists/files instead of tenant-wide content | SharePoint/Graph administrator approval |
| GitHub OIDC for Azure | [Configure OpenID Connect in Azure](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure) | Use short-lived workload federation for deployment | GitHub/Azure environment setup |
| Google AI search features | [AI features and the website](https://developers.google.com/search/docs/appearance/ai-features) | Normal search fundamentals apply; no separate AI-only content layer or ranking guarantee | Search Console monitoring |
| Google organisation markup | [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) | Publish one consistent canonical organisation entity and official logo | Verify public facts |
| Google sitemaps | [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | Include canonical public URLs and meaningful `lastmod` only | Submit after owner verification |
| Google robots guidance | [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro) | Use crawler rules for crawl control, never as confidential-data protection | None |
| Google Knowledge Panels | [About Knowledge Panels](https://support.google.com/knowledgepanel/answer/9163198) | Treat panels as automatically generated; do not guarantee or manufacture one | Claim only if an eligible panel appears |
| OpenAI search crawler | [OpenAI publishers and developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) | Allow `OAI-SearchBot` for public discovery; decide `GPTBot` policy separately; keep private content protected | Owner crawler-training preference |
| OpenAI crawler controls | [OpenAI crawler overview](https://platform.openai.com/docs/bots) | Maintain current user-agent policy and verify published IP guidance when needed | None |
| Bing/IndexNow | [IndexNow documentation](https://www.indexnow.org/documentation) | Submit only created, materially updated, redirected or removed canonical URLs; handle throttling safely | Bing Webmaster verification |
| Schema vocabulary | [Schema.org documentation](https://schema.org/docs/documents.html) | Build a connected JSON-LD graph supported by visible content | None |
| WCAG 2.2 | [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/) | Target WCAG 2.2 AA and avoid unsupported conformance claims | Independent/manual review recommended |
| Accessible patterns | [WAI ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | Use proven keyboard/focus/dialog/navigation patterns | None |
| Application security | [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) | Use a structured security acceptance baseline in addition to tests | Independent penetration test approval |
| UK data protection law | [Data (Use and Access) Act 2025](https://www.legislation.gov.uk/ukpga/2025/18/contents) | Review current UK data-processing wording and amendments against actual systems | UK solicitor review |
| ICO cookie guidance | [ICO cookies and similar technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) | Block non-essential storage before consent and make rejection/withdrawal accessible | Privacy review |
| Modern Slavery Act guidance | [Transparency in supply chains guidance](https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide) | Determine section 54 applicability from verified turnover/group facts; otherwise publish a voluntary policy | Owner financial facts and solicitor review |
| UK energy/carbon reporting | [Environmental reporting guidance](https://www.gov.uk/government/publications/environmental-reporting-guidelines-including-mandatory-greenhouse-gas-emissions-reporting-guidance) | Determine SECR applicability from verified company facts and avoid unsupported emissions claims | Accountant/solicitor review |

## Review rule

The URL, publication date and relevant recommendation are rechecked before any production implementation that depends on changeable product, legal, crawler, pricing or licensing behaviour. Search outcomes, rich results, Knowledge Panels and AI citations remain platform decisions and are never guaranteed.
