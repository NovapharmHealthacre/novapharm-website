# Data Flow Diagrams

## Record Creation And SharePoint Synchronization

```mermaid
sequenceDiagram
  actor User
  participant UI as Portal or Employee App
  participant API as Domain API
  participant DB as SQLite launch / PostgreSQL target
  participant Worker as Sync Worker
  participant SP as SharePoint
  participant Audit as Audit Log
  User->>UI: Submit validated record and documents
  UI->>API: Domain command plus idempotency key
  API->>DB: Transaction: record, document metadata, event outbox
  DB-->>API: Canonical IDs committed
  API-->>UI: Accepted with workflow status
  Worker->>DB: Claim pending event
  Worker->>SP: Ensure entity folder and metadata
  Worker->>SP: Upload file with checksum
  SP-->>Worker: Site, drive and item identifiers
  Worker->>DB: Save SharePoint links and event result
  Worker->>Audit: Append correlation and outcome
```

## Customer Account Opening

```mermaid
flowchart TD
  A["Multi-step application"] --> B["Validate required data and file types"]
  B --> C["Create application aggregate"]
  C --> D["Allocate provisional customer number"]
  D --> E["Create SharePoint folder request"]
  E --> F["Upload and classify documents"]
  F --> G["Compliance due-diligence tasks"]
  G --> H["Sales and finance review"]
  H --> I{"Approval complete?"}
  I -->|No| J["Request information or reject"]
  I -->|Yes| K["Activate customer and portal entitlement"]
  K --> L["Notify applicant and internal owners"]
  C --> M["Audit trail"]
  F --> M
  H --> M
  K --> M
```

## Order To Cash

```mermaid
flowchart LR
  Search["Product search"] --> Basket["Basket or quote"]
  Basket --> Pricing["Contract price and discount policy"]
  Pricing --> Credit["Credit and account status"]
  Credit --> Availability["WMS availability and lead time"]
  Availability --> Order["Confirmed sales order"]
  Order --> Reserve["Batch reservation FEFO"]
  Reserve --> Dispatch["Polar Speed dispatch request"]
  Dispatch --> Delivery["Tracking and POD"]
  Delivery --> Invoice["Finance invoice posting"]
  Invoice --> Statement["Customer statement and payment allocation"]
  Order --> Docs["SharePoint order pack"]
  Dispatch --> Docs
  Invoice --> Docs
```

## Procure To Pay

```mermaid
flowchart LR
  Need["Reorder or sourcing request"] --> Compare["Supplier price and lead-time comparison"]
  Compare --> Draft["Purchase order draft"]
  Draft --> Approval["Policy-based approval"]
  Approval --> Dispatch["PO dispatch"]
  Dispatch --> Receipt["Goods receipt and quality inspection"]
  Receipt --> Batch["Batch and stock creation"]
  Receipt --> Match["Three-way invoice match"]
  Match --> Finance["Payment approval"]
  Draft --> SP["SharePoint procurement folder"]
  Receipt --> SP
  Match --> SP
```

## Quality Complaint And Recall

```mermaid
flowchart TD
  Complaint["Complaint or adverse event"] --> Triage["Quality/PV triage"]
  Triage --> Serious{"Serious or recall risk?"}
  Serious -->|Yes| Hold["Quarantine product and batches"]
  Hold --> Trace["Trace affected deliveries"]
  Trace --> Notify["Notify customers and authority workflow"]
  Notify --> Return["Return and reconciliation"]
  Return --> CAPA["Root cause and CAPA"]
  Serious -->|No| Investigate["Standard investigation"]
  Investigate --> CAPA
  CAPA --> Close["Effectiveness check and closure"]
  Complaint --> Docs["Controlled SharePoint case file"]
  Trace --> Docs
  CAPA --> Docs
```

## Analytics Flow

```mermaid
flowchart LR
  DB["Operational database"] --> Views["Versioned metric views"]
  SP["SharePoint metadata"] --> Curated["Curated document facts"]
  WMS["Warehouse feed"] --> Stage["Validated integration staging"]
  Fin["Finance feed"] --> Stage
  Stage --> Views
  Curated --> Views
  Views --> API["Analytics API"]
  API --> Dash["Role-scoped dashboards"]
  Catalog["Metric catalogue"] --> API
  API --> Fresh["Freshness and quality indicators"]
  Fresh --> Dash
```

## Failure Handling

No external call is made inside a user request transaction. A committed outbox event guarantees delivery attempts. Failed events retain correlation ID, attempt count, safe error code and next retry time; credentials and document content are never written to error logs.
