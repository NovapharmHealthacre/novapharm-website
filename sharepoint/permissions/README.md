# SharePoint Permissions

Use Entra security groups, not direct user grants.

| Group | Access |
|---|---|
| NP-SP-Owners | platform administration only |
| NP-Quality | Quality libraries; contribute and approve by workflow |
| NP-Regulatory | Regulatory libraries; contribute and approve by workflow |
| NP-Finance | invoices, statements and finance folders |
| NP-Sales | customer commercial folders excluding restricted bank data |
| NP-Purchasing | supplier and purchasing folders |
| NP-Warehouse | warehouse and fulfilment folders |
| NP-HR | restricted HR and training libraries |
| NP-Executives | read governed cross-domain content |
| NP-Board | read controlled Executive Platform and approved board files |
| NP-Customer-{id} | customer-scoped approved documents only |

Application-only Graph access should use `Sites.Selected` in production where tenant policy permits. Grant the app only to the NovaPharm site and audit all permission changes.

## Live Executive Platform snapshot

Read-only verification was repeated on 14 July 2026 against the controlled `NovaPharm Digital Ecosystem/16 Website and Portal/Executive Platform` folder. The folder remains present with the expected Executive Platform modules and still carries the site-wide Owners (`owner`), Visitors (`read`) and Members (`write`) effective grants. No anonymous sharing-link permission was returned and no board-specific grant was present. The permission change was not executed because it requires explicit owner approval and a tenant-capable administrator.

Before confidential board content is introduced:

1. Export the parent/folder inheritance state, grants, group membership and sharing links.
2. Confirm an emergency tenant administrator and approved named administrators.
3. Create or validate `NP-SP-Owners` and `NP-Board`; use Board read by default.
4. Stop inheriting permissions on the Executive Platform folder.
5. Remove site-wide Visitors and Members from that folder.
6. Grant only the minimum administrators, approved Board group and least-privilege runtime application identity.
7. Test administrator access, Board read, unauthorised-user rejection, no anonymous access and no inherited broad access.
8. Record the final grants and membership without placing personal identifiers in the public repository.

Rollback uses the exported snapshot: restore the previous inheritance/grants only under owner approval, verify the restored membership, and keep anonymous links disabled. A rollback must not be used as a reason to expose confidential content while broad access is present.
