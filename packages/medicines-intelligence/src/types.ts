export type Jurisdiction = "England" | "Scotland" | "Wales" | "Northern Ireland" | "United Kingdom";

export type SourceAccessMethod =
  | "ckan_action_api"
  | "ckan_bulk_download"
  | "fhir_api"
  | "rest_api"
  | "arcgis_feature_service"
  | "file_download"
  | "licensed_subscription"
  | "restricted_source";

export type SourceStatus =
  | "discovery_implemented"
  | "documented_adapter_pending"
  | "credentials_required"
  | "licence_required"
  | "restricted"
  | "source_review_required";

export interface SourceRegistryEntry {
  readonly sourceId: string;
  readonly publisher: string;
  readonly datasetName: string;
  readonly datasetSlugOrIdentifier: string;
  readonly jurisdiction: Jurisdiction;
  readonly coverage: string;
  readonly purpose: string;
  readonly accessMethod: SourceAccessMethod;
  readonly apiOrDownload: string;
  readonly baseEndpointOrDiscoveryMethod: string;
  readonly licence: string;
  readonly publicationFrequency: string;
  readonly typicalReportingLag: string;
  readonly latestExpectedPeriod?: string | null;
  readonly latestDiscoveredPeriod: string | null;
  readonly latestResourceId: string | null;
  readonly resourceUrl: string | null;
  readonly resourceHashOrChecksum: string | null;
  readonly schemaVersion: string | null;
  readonly schemaFingerprint: string | null;
  readonly firstSeenAt: string;
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfullyIngestedAt: string | null;
  readonly authorityRank: 1 | 2 | 3;
  readonly status: SourceStatus;
  readonly knownCaveats: readonly string[];
  readonly provenanceNotes: string;
}

export interface CkanResource {
  readonly id: string;
  readonly name: string;
  readonly title?: string;
  readonly url: string;
  readonly zip_url?: string;
  readonly format?: string;
  readonly mimetype?: string | null;
  readonly size?: number | string | null;
  readonly hash?: string | null;
  readonly sha256?: string | null;
  readonly schema?: string | Readonly<{ fields?: readonly Readonly<{ name?: unknown; type?: unknown }>[] }> | null;
  readonly datastore_active?: boolean | string;
  readonly created?: string;
  readonly last_modified?: string | null;
  readonly metadata_modified?: string | null;
  readonly state?: string;
}

export interface CkanPackage {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly license_id?: string | null;
  readonly metadata_modified?: string;
  readonly resources: readonly CkanResource[];
}

export interface ReportingPeriod {
  readonly key: string;
  readonly precision: "month" | "quarter" | "year";
  readonly sortKey: number;
  readonly sourceText: string;
}

export interface DiscoveredResource {
  readonly resource: CkanResource;
  readonly period: ReportingPeriod;
  readonly fingerprint: string;
}

export type SchemaContractStatus = "exact" | "compatible" | "schema_review_required";

export interface SchemaContractResult {
  readonly source: string;
  readonly variant: string;
  readonly status: SchemaContractStatus;
  readonly requiredColumns: readonly string[];
  readonly observedColumns: readonly string[];
  readonly missingColumns: readonly string[];
  readonly unexpectedColumns: readonly string[];
  readonly fingerprint: string;
}

export type MedicineMetric =
  | "items"
  | "quantity"
  | "total_quantity"
  | "nic"
  | "actual_cost"
  | "adq"
  | "items_per_1000"
  | "quantity_per_1000"
  | "nic_per_item"
  | "quantity_per_item"
  | "mom_growth"
  | "growth_3m"
  | "growth_6m"
  | "yoy_growth"
  | "cagr"
  | "forecast_growth"
  | "forecast_interval_width"
  | "volatility"
  | "seasonality"
  | "concentration";

export interface MedicineFilterState {
  readonly query: string;
  readonly metric: MedicineMetric;
  readonly startMonth: string | null;
  readonly endMonth: string | null;
  readonly nation: Jurisdiction | null;
  readonly region: string | null;
  readonly icb: string | null;
  readonly practiceCode: string | null;
  readonly postcode: string | null;
  readonly radiusKm: 1 | 3 | 5 | 10 | null;
  readonly medicine: Readonly<Record<string, string>>;
}

export interface TimeSeriesPoint {
  readonly period: string;
  readonly value: number;
}

export interface ForecastPoint {
  readonly horizon: number;
  readonly period: string;
  readonly value: number;
  readonly lower: number;
  readonly upper: number;
}

export interface ForecastMetrics {
  readonly mae: number;
  readonly wape: number;
  readonly smape: number;
  readonly bias: number;
  readonly intervalCoverage: number;
  readonly observations: number;
}

export interface ForecastResult {
  readonly model: "seasonal_naive" | "holt_linear";
  readonly modelVersion: string;
  readonly trainingCutoff: string;
  readonly featureCutoff: string;
  readonly seasonLength: number;
  readonly intervalLevel: 0.95;
  readonly backtest: ForecastMetrics;
  readonly values: readonly ForecastPoint[];
  readonly limitations: readonly string[];
}

export interface OpportunityComponentInput {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
  readonly source: string;
  readonly period: string | null;
}

export interface OpportunityWeight {
  readonly key: string;
  readonly weight: number;
  readonly direction: "positive" | "negative";
}

export interface OpportunityContribution {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
  readonly weight: number;
  readonly contribution: number | null;
  readonly source: string;
  readonly period: string | null;
}

export interface OpportunityScore {
  readonly modelVersion: string;
  readonly score: number | null;
  readonly eligible: boolean;
  readonly contributions: readonly OpportunityContribution[];
  readonly blockers: readonly string[];
  readonly caveats: readonly string[];
}
