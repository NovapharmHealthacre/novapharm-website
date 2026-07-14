# SharePoint Executive Platform Permission Plan

Status: owner authorised; live inventory complete; permission write not executed
Execution gate: Microsoft 365 administrative write surface with permission-management capability

## Recorded current concern

The delegated Microsoft Graph inventory was revalidated on 14 July 2026 against the Executive Platform folder in the `Novapharm Tier 1` SharePoint site. The effective response returned:

| Principal | Effective role | Source |
|---|---|---|
| `Novapharm Tier 1 Owners` | Owner | inherited site group |
| `Novapharm Tier 1 Members` | Write | inherited site group |
| `Novapharm Tier 1 Visitors` | Read | inherited site group |

No anonymous link or `Everyone except external users` grant was returned. Broad inherited Member write and Visitor read remain unsuitable for confidential Board content. The connector could list effective permissions but provides no operation to stop inheritance, remove grants or create SharePoint security groups, so no mutation was attempted.

## Target groups

- `NovaPharm Executive Platform Administrators`: minimum necessary administration; named approved administrators only; preserve an emergency tenant administrator.
- `NovaPharm Executive Platform Board`: read by default; edit only for a specifically approved library/workflow.

The App Service managed identity receives site-specific application access only where required. General Members, Visitors, organisation-wide groups, `Everyone except external users`, anonymous links and unrelated employee groups receive no Executive Platform permission.

## Change procedure

1. Preserve the 14 July 2026 effective-grant snapshot and export full site group membership from SharePoint administration immediately before change.
2. Store that export in a restricted administrative record; do not commit identities or tenant identifiers to the public repository.
3. Confirm approved administrator and Board membership with the owner.
4. Create/validate the two named groups.
5. Stop inheritance only on the controlled Executive Platform scope.
6. Remove broad inherited/direct grants and anonymous links.
7. Grant Administrators minimum administration and Board read.
8. Grant the Graph application/managed identity only approved site/library access.
9. Test an administrator, a Board member, a general employee, a Visitor, an anonymous browser and the application identity.
10. Record final inheritance, groups, membership, direct assignments and link state.

## Acceptance

- administrator permitted;
- Board permitted at approved level;
- unauthorised employee rejected;
- Visitors rejected;
- Members cannot edit unless individually authorised through another approved group;
- anonymous access absent;
- direct file URLs reject unauthorised users;
- audit logs record access/permission changes.

## Rollback

Use the restricted pre-change export to restore only the prior inheritance/grants under owner approval. The recorded baseline is Owners/owner, Members/write and Visitors/read inherited from the site. Do not re-enable anonymous access. If rollback would expose confidential content, keep the location closed while the permission model is repaired.

## Remaining execution gate

Complete the change in **SharePoint site > Settings > Site permissions > Advanced permissions settings** or through an approved Microsoft Graph/SharePoint administrative API that supports inheritance and role-assignment changes. The operator must first export group membership and sharing links, then apply the steps above and test one identity from each allowed and denied class. This is an administrative write action; the current delegated connector cannot perform or verify it.
