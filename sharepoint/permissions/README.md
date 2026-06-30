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
| NP-Customer-{id} | customer-scoped approved documents only |

Application-only Graph access should use `Sites.Selected` in production where tenant policy permits. Grant the app only to the NovaPharm site and audit all permission changes.
