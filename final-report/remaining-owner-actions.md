# Remaining Owner Actions

Status: owner-controlled and external gates only
Last reviewed: 20 August 2026
Candidate: Draft PR 69 on `codex/post-pr53-apple-parity`

The owner has authorised repository completion and a conditional managed release. That authority does not waive capacity, cost, staging, security, legal/regulatory or production-smoke gates. Complete these actions in order:

1. In the Azure portal, open **Quotas > My quotas**, select provider **Microsoft.Web**, region **UK South**, and request an S1/App Service regional limit of **4**. If `Total Regional VMs` is shown separately, request **4** there as well. The value is not secret and may be shared in chat. Verify with the Microsoft.Web `locations/uksouth/usages` API that both applicable S1 and total limits can accommodate four workers, then rerun the exact-SHA staging what-if. Evidence: what-if tracking `a7ba93f8-c913-470b-a8d7-e499963b4bea`; self-service request `55a3b0d7-a003-4cf4-8d03-ad766efd4f9b` failed `QuotaNotAvailableForResource`; the support API cannot create a ticket under the Free support plan.
2. Review the recurring Azure estimate before provisioning. The approved topology contains two App Service plans per environment, Azure Front Door Premium/WAF per environment, Azure SQL, private endpoints, storage, Key Vault and monitoring. Record the accepted monthly budget and cost-alert thresholds; this decision is not secret and may be shared in chat.
3. After capacity and budget approval, dispatch the exact-SHA `staging / provision` action through the protected `azure-staging` environment. Do not substitute a weaker topology. Configure secrets only through Key Vault or protected inputs, deploy all six applications from one release manifest, and complete managed-staging browser, accessibility, security, backup/restore and rollback acceptance before considering merge.
4. Review Draft PR 69, its requirements matrix, final screenshots and exact-head workflow results. Keep it in draft until staging passes and an independent reviewer approves the exact final head.
5. In GitHub repository settings, decide whether the canonical platform repository remains public or becomes private. Enable a `main` ruleset requiring pull requests, an independent approval, conversation resolution, current required checks and no force pushes. Enable signed-commit enforcement only after the organisation has a workable signing process.
6. Ask GitHub Support to assess historical provider-managed pull refs for the retired credential incident. Never put the retired value in chat, a normal ticket field, source, logs or screenshots. Replace affected clones after Support confirms the procedure.
7. Approve a second regional origin before enabling real Front Door failover. The Bicep supports priority-two origins, but failover is intentionally disabled until an accepted second estate exists.
8. Approve Entra workforce and External ID registrations, redirect URIs, app roles, groups and invitation policy. Configure and test MFA. Conditional Access, device risk and Privileged Identity Management require tenant/licence confirmation and must not be described as active beforehand.
9. Enter bootstrap, gateway, session, database, email and Graph secrets only through Key Vault or protected deployment inputs. Never share them in chat. Remove any one-time bootstrap secret after password replacement and verify session invalidation.
10. Approve Microsoft Graph permissions and the SharePoint Executive Platform inventory. Record inheritance, Owners, Members, Visitors, direct grants, external links and anonymous links before applying the documented least-privilege change and rollback test.
11. The owner-approved public title for Dr Nishita Trivedi is Chief Technology Officer and Responsible Person. Provide the formal appointment, applicable legal-entity scope and quality-agreement evidence listed in `docs/programme/owner-evidence-request-dr-nishita-responsible-person.md` for the controlled evidence register; the missing document does not revert the approved title or create unevidenced statutory powers.
12. Provide the official Polar Speed certificate/register evidence and executed quality-agreement scope before publishing certificate-specific holder, number, site, scope or agreement claims. Polar Speed's authorisation must never be attributed to NovaPharm.
13. Confirm a production email provider/sender, recipient routes and data-processing terms; then run controlled contact and account-application delivery, failure-queue and replay tests.
14. Approve live malware scanning for private uploads and complete a harmless test-file quarantine/release exercise. Repository scan-state simulations are not production malware protection.
15. Obtain UK solicitor review of privacy, international transfers, cookie wording, website terms, liability/jurisdiction and portal notices. Obtain accountant/company-secretarial confirmation for Modern Slavery and environmental/SECR applicability.
16. Commission an independent penetration test against accepted Azure staging, remediate all critical/high findings and retain a signed retest. Run live WAF, alert, backup, restore and disaster-recovery drills.
17. Verify Google Search Console and Bing Webmaster domain properties, submit canonical sitemaps, approve IndexNow production activation and establish crawler/log dashboards. Search indexing, ranking, Knowledge Panels and AI citations remain external outcomes and are not guaranteed.
18. Complete the AAH and corporate-network retest using `docs/programme/aah-retest-checklist.md`, including DNS, TLS, category, headers, challenge behaviour, false-positive evidence and escalation references.
19. Approve merge only after the final PR head, staging evidence and all required checks pass. Approve production deployment and DNS separately; preserve MX, SPF, DKIM, DMARC and Microsoft 365 records, and keep GitHub Pages available until Azure acceptance and rollback readiness are proven.

## Evidence still unavailable

- App Service capacity approval, Azure resource IDs, deployment IDs, live Front Door/WAF logs and production health results.
- Entra tenant consent, MFA/Conditional Access/PIM evidence and production sign-in logs.
- SharePoint live permissions inventory and unauthorised-user rejection evidence.
- Independent penetration-test and AAH retest reports.
- Dr Nishita Trivedi Responsible Person appointment evidence.
- Polar Speed certificate and quality-agreement wording evidence.
- UK solicitor and accountant/company-secretarial approvals.
- Search-platform ownership, indexing, crawler-log and AI-citation outcomes.

These are genuine gates, not optional polish. No password, token, certificate private key or retired credential should be sent in chat.
