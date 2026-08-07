# Remaining Owner Actions

Status: owner-controlled and external gates only
Last reviewed: 7 August 2026
Candidate: Draft PR 16 on `codex/unified-digital-estate-foundation`

Repository implementation does not authorise a merge, Azure deployment, Microsoft permission change or DNS cutover. Complete these gates in order:

1. Review Draft PR 16, its requirements matrix, final screenshots and workflow results. Keep it in draft until an independent reviewer approves the exact final head.
2. In GitHub repository settings, decide whether the canonical platform repository remains public or becomes private. Enable a `main` ruleset requiring pull requests, an independent approval, conversation resolution, current required checks and no force pushes. Enable signed-commit enforcement only after the organisation has a workable signing process.
3. Ask GitHub Support to assess historical provider-managed pull refs for the retired credential incident. Never put the retired value in chat, a normal ticket field, source, logs or screenshots. Replace affected clones after Support confirms the procedure.
4. Approve the Azure subscription, region, budget and paid-production architecture. Deploy the six isolated applications, Azure SQL, private Blob storage, Key Vaults, Front Door Premium/WAF and monitoring through OIDC only after an authenticated `what-if` review.
5. Approve a second regional origin before enabling real Front Door failover. The Bicep supports priority-two origins, but failover is intentionally disabled until an accepted second estate exists.
6. Approve Entra workforce and External ID registrations, redirect URIs, app roles, groups and invitation policy. Configure and test MFA. Conditional Access, device risk and Privileged Identity Management require tenant/licence confirmation and must not be described as active beforehand.
7. Enter bootstrap, gateway, session, database, email and Graph secrets only through Key Vault or protected deployment inputs. Never share them in chat. Remove any one-time bootstrap secret after password replacement and verify session invalidation.
8. Approve Microsoft Graph permissions and the SharePoint Executive Platform inventory. Record inheritance, Owners, Members, Visitors, direct grants, external links and anonymous links before applying the documented least-privilege change and rollback test.
9. The owner-approved public title for Dr Nishita Trivedi is Chief Technology Officer and Responsible Person. Provide the formal appointment, applicable legal-entity scope and quality-agreement evidence listed in `docs/programme/owner-evidence-request-dr-nishita-responsible-person.md` for the controlled evidence register; the missing document does not revert the approved title or create unevidenced statutory powers.
10. Provide the official Polar Speed certificate/register evidence and executed quality-agreement scope before publishing certificate-specific holder, number, site, scope or agreement claims. Polar Speed's authorisation must never be attributed to NovaPharm.
11. Confirm a production email provider/sender, recipient routes and data-processing terms; then run controlled contact and account-application delivery, failure-queue and replay tests.
12. Approve live malware scanning for private uploads and complete a harmless test-file quarantine/release exercise. Repository scan-state simulations are not production malware protection.
13. Obtain UK solicitor review of privacy, international transfers, cookie wording, website terms, liability/jurisdiction and portal notices. Obtain accountant/company-secretarial confirmation for Modern Slavery and environmental/SECR applicability.
14. Commission an independent penetration test against accepted Azure staging, remediate all critical/high findings and retain a signed retest. Run live WAF, alert, backup, restore and disaster-recovery drills.
15. Verify Google Search Console and Bing Webmaster domain properties, submit canonical sitemaps, approve IndexNow production activation and establish crawler/log dashboards. Search indexing, ranking, Knowledge Panels and AI citations remain external outcomes and are not guaranteed.
16. Complete the AAH and corporate-network retest using `docs/programme/aah-retest-checklist.md`, including DNS, TLS, category, headers, challenge behaviour, false-positive evidence and escalation references.
17. Approve merge only after the final PR head and all required checks pass. Approve production deployment and DNS separately; preserve MX, SPF, DKIM, DMARC and Microsoft 365 records, and keep GitHub Pages available until Azure acceptance and rollback readiness are proven.

## Evidence still unavailable

- Azure resource IDs, deployment IDs, live Front Door/WAF logs and production health results.
- Entra tenant consent, MFA/Conditional Access/PIM evidence and production sign-in logs.
- SharePoint live permissions inventory and unauthorised-user rejection evidence.
- Independent penetration-test and AAH retest reports.
- Dr Nishita Trivedi Responsible Person appointment evidence.
- Polar Speed certificate and quality-agreement wording evidence.
- UK solicitor and accountant/company-secretarial approvals.
- Search-platform ownership, indexing, crawler-log and AI-citation outcomes.

These are genuine gates, not optional polish. No password, token, certificate private key or retired credential should be sent in chat.
