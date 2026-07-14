# SharePoint Executive Platform Permission Plan

Status: plan complete; no permission change authorised or executed  
Owner-controlled gate: Microsoft 365 administrator and NovaPharm owner approval

## Recorded current concern

The read-only inventory was revalidated on 14 July 2026. Effective permissions still include site Owners, Members and Visitors on the Executive Platform location. No anonymous grant was returned, but broad read/write access is not suitable for confidential Board content.

## Target groups

- `NovaPharm Executive Platform Administrators`: minimum necessary administration; named approved administrators only; preserve an emergency tenant administrator.
- `NovaPharm Executive Platform Board`: read by default; edit only for a specifically approved library/workflow.

The App Service managed identity receives site-specific application access only where required. General Members, Visitors, organisation-wide groups, `Everyone except external users`, anonymous links and unrelated employee groups receive no Executive Platform permission.

## Change procedure

1. Export parent/folder inheritance, direct grants, sharing links and group membership.
2. Store the snapshot in a restricted administrative record.
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

Use the restricted pre-change export to restore only the prior inheritance/grants under owner approval. Do not re-enable anonymous access. If rollback would expose confidential content, keep the location closed while the permission model is repaired.
