# SharePoint Metadata Model

Required site columns:

- `NovaPharmRecordId` - canonical UUID
- `NovaPharmBusinessNumber` - customer, supplier, SKU, order, PO, invoice or document number
- `NovaPharmEntityType` - controlled entity vocabulary
- `NovaPharmDocumentNumber` - immutable document identifier
- `NovaPharmDocumentClass` - controlled document class
- `NovaPharmLifecycleStatus` - draft, review, approved, effective, superseded or archived
- `NovaPharmRetentionClass` - policy key, not a free-text duration
- `NovaPharmChecksum` - SHA-256 used for reconciliation
- `NovaPharmOwnerDepartment` - controlled department
- `NovaPharmConfidentiality` - public, internal, confidential, regulated or restricted
- `NovaPharmEffectiveDate` and `NovaPharmReviewDate`

Graph writes are rejected when the entity type or document class is outside the application registry. SharePoint item IDs and web URLs are written back to `sharepoint_links`.
