import Foundation

public enum NovaArea: String, CaseIterable, Codable, Sendable {
    case intelligence
    case customerPortal = "customer-portal"
    case distribution

    public var title: String {
        switch self {
        case .intelligence: "Intelligence"
        case .customerPortal: "Customer Portal"
        case .distribution: "Distribution"
        }
    }
}

public enum NovaAvailability: String, Codable, Sendable {
    case webReadOnly = "Web foundation only"
    case gated = "Approval required"
    case planning = "Planning preview"
}

public struct NovaWorkspace: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let slug: String
    public let title: String
    public let group: String
    public let summary: String
    public let availability: NovaAvailability
    public let area: NovaArea

    public init(area: NovaArea, slug: String, title: String, group: String, summary: String,
                availability: NovaAvailability) {
        self.area = area
        self.slug = slug
        self.id = "\(area.rawValue):\(slug)"
        self.title = title
        self.group = group
        self.summary = summary
        self.availability = availability
    }
}

public enum NovaCatalog {
    private static func item(_ area: NovaArea, _ slug: String, _ title: String, _ group: String,
                             _ summary: String, _ availability: NovaAvailability = .gated) -> NovaWorkspace {
        NovaWorkspace(area: area, slug: slug, title: title, group: group, summary: summary,
                      availability: availability)
    }

    // Exact slugs and titles from apps/portal/data/intelligence-workspaces.ts (20 November 2026).
    // Web-read-only does not imply a live mobile data source.
    public static let intelligence: [NovaWorkspace] = [
        item(.intelligence, "medicine-search", "Search", "Medicine research", "Search the currently ingested medicine identity catalogue.", .webReadOnly),
        item(.intelligence, "medicine-overview", "Medicine Overview", "Medicine research", "A source-separated view of the selected medicine.", .webReadOnly),
        item(.intelligence, "identity", "Identity", "Medicine research", "Current BNF identity, aliases and effective-date history only.", .webReadOnly),
        item(.intelligence, "evidence", "Evidence", "Medicine research", "Published literature and trial evidence is not yet ingested into this authorised workspace."),
        item(.intelligence, "observed-market", "Observed Market", "Medicine research", "UK source-separated prescribing and cost observations where accepted facts exist.", .webReadOnly),
        item(.intelligence, "geography", "Geography", "Medicine research", "Source-backed UK postcode and organisation context where records are available.", .webReadOnly),
        item(.intelligence, "market-structure", "Market Structure", "Market intelligence", "Market shares require complete denominator and channel coverage."),
        item(.intelligence, "forecasts", "Forecasting", "Market intelligence", "No operational forecasts are available from an identity-only catalogue."),
        item(.intelligence, "signals", "Signals", "Market intelligence", "No verified signal scoring or alerting model has been released."),
        item(.intelligence, "medicine-tape", "Medicine Tape", "Market intelligence", "Validated timestamped observation events are required."),
        item(.intelligence, "supply-intelligence", "Supply Intelligence", "Supply & regulation", "No supplier or stock claim without a verified inventory feed."),
        item(.intelligence, "regulatory-intelligence", "Regulatory Intelligence", "Supply & regulation", "Regulator discovery links are not reconciled approvals."),
        item(.intelligence, "pricing-reimbursement", "Pricing & Reimbursement", "Supply & regulation", "Cross-market prices require compatible licensed records."),
        item(.intelligence, "tender-intelligence", "Tender Intelligence", "Supply & regulation", "Tender rankings require accepted award and eligibility evidence."),
        item(.intelligence, "portfolio", "Portfolio", "Supply & regulation", "Private product portfolios require tenant isolation and approved rights."),
        item(.intelligence, "biotech-intelligence", "Biotech Intelligence", "Strategy", "Pipeline intelligence requires approved datasets and entity reconciliation."),
        item(.intelligence, "capital-intelligence", "Capital Intelligence", "Strategy", "Financial intelligence requires licensed sources and as-of valuations."),
        item(.intelligence, "decision-workspace", "Decision Workspace", "Strategy", "Commercial, regulatory and clinical decisions require human sign-off."),
        item(.intelligence, "watchlists", "Watchlists", "Decision tools", "Personal watchlists require tenant-isolated persistence."),
        item(.intelligence, "alerts", "Alerts", "Decision tools", "Monitoring requires consent and verified signal sources."),
        item(.intelligence, "reports", "Reports", "Decision tools", "Reports need reproducible accepted evidence and export permissions."),
        item(.intelligence, "private-commercial", "Private Commercial", "Decision tools", "Private commercial records must remain tenant-isolated.")
    ]

    // Navigation-only planned workspaces: no customer account, stock or payment API is connected.
    public static let customerPortal: [NovaWorkspace] = [
        item(.customerPortal, "dashboard", "Dashboard", "Account", "Authorized company account overview.", .planning),
        item(.customerPortal, "account", "My Account", "Account", "Account details and address book.", .planning),
        item(.customerPortal, "products", "Products", "Catalogue", "Approved business-to-business products.", .planning),
        item(.customerPortal, "prices", "Price Lists", "Catalogue", "Contract-specific authorized prices.", .planning),
        item(.customerPortal, "orders", "Orders", "Transactions", "Order history and requests.", .planning),
        item(.customerPortal, "invoices", "Invoices", "Transactions", "Account-scoped invoice records.", .planning),
        item(.customerPortal, "statements", "Statements", "Transactions", "Account statements.", .planning),
        item(.customerPortal, "delivery", "Delivery Tracking", "Fulfilment", "Shipment progress and exceptions.", .planning),
        item(.customerPortal, "documents", "Documents", "Fulfilment", "Controlled business documents.", .planning),
        item(.customerPortal, "support", "Support Tickets", "Fulfilment", "Account support cases.", .planning)
    ]

    public static let distribution: [NovaWorkspace] = [
        item(.distribution, "inventory", "Inventory", "Stock", "Reconciled warehouse stock.", .planning),
        item(.distribution, "batches", "Batches & FEFO", "Stock", "Batch and expiry traceability.", .planning),
        item(.distribution, "quality", "Quality Assurance", "Stock", "Controlled quarantine and release status.", .planning),
        item(.distribution, "replenishment", "Replenishment", "Stock", "Reorder and transfer candidates.", .planning),
        item(.distribution, "pick", "Pick & Pack", "Fulfilment", "Authorized pick and pack tasks.", .planning),
        item(.distribution, "dispatch", "Dispatch", "Fulfilment", "Shipment and carrier handover.", .planning),
        item(.distribution, "delivery", "Proof of Delivery", "Fulfilment", "Authorized delivery evidence.", .planning),
        item(.distribution, "returns", "Returns", "Fulfilment", "GDP-compliant returns review.", .planning),
        item(.distribution, "performance", "Performance", "Insights", "Reconciled operational quality metrics.", .planning)
    ]

    public static let all: [NovaWorkspace] = intelligence + customerPortal + distribution

    public static func modules(in area: NovaArea) -> [NovaWorkspace] {
        switch area {
        case .intelligence: intelligence
        case .customerPortal: customerPortal
        case .distribution: distribution
        }
    }

    public static func lookup(id: String) -> NovaWorkspace? {
        all.first { $0.id == id }
    }
}
