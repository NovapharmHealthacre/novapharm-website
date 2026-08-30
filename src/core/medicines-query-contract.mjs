const datasets = new Set(["epd", "pca"]);
const metrics = new Set(["items", "quantity", "nic", "actual_cost", "items_per_1000"]);
const radii = new Set([1, 3, 5, 10]);

function value(input, key) {
  if (input instanceof URLSearchParams) return input.get(key);
  return input?.[key];
}

function text(input, key, maximum = 160) {
  const raw = value(input, key);
  if (raw === null || raw === undefined || raw === "") return null;
  const result = String(raw).normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!result || result.length > maximum || /[<>\u0000-\u001F]/u.test(result)) throw new Error(`${key} contains invalid text.`);
  return result;
}

function month(input, key) {
  const result = text(input, key, 7);
  if (result && !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/u.test(result)) throw new Error(`${key} must use YYYY-MM.`);
  return result;
}

function integer(input, key, fallback, minimum, maximum) {
  const raw = value(input, key);
  if (raw === null || raw === undefined || raw === "") return fallback;
  const result = Number(raw);
  if (!Number.isInteger(result) || result < minimum || result > maximum) throw new Error(`${key} is outside the allowed range.`);
  return result;
}

export function normaliseUkPostcode(raw) {
  const compact = String(raw ?? "").toUpperCase().replace(/\s+/gu, "");
  if (!/^(?:GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/u.test(compact)) throw new Error("postcode must be a valid UK postcode.");
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function monthIndex(period) {
  const [year, monthNumber] = period.split("-").map(Number);
  return year * 12 + monthNumber - 1;
}

export function normaliseAnalyticsQuery(input) {
  const dataset = text(input, "dataset", 8) ?? "epd";
  if (!datasets.has(dataset)) throw new Error("dataset must be epd or pca.");
  const metric = text(input, "metric", 32) ?? "items";
  if (!metrics.has(metric)) throw new Error("metric is not supported.");
  if (dataset === "pca" && metric === "items_per_1000") throw new Error("items_per_1000 is available only for practice-level EPD facts.");
  const medicineId = text(input, "medicineId", 64);
  if (medicineId && !/^medicine-[a-f0-9]{32}$/u.test(medicineId)) throw new Error("medicineId is invalid.");
  const startMonth = month(input, "startMonth");
  const endMonth = month(input, "endMonth");
  if (startMonth && endMonth && startMonth > endMonth) throw new Error("startMonth must not follow endMonth.");
  if (startMonth && endMonth && monthIndex(endMonth) - monthIndex(startMonth) > 119) throw new Error("The analytical period may not exceed 120 months.");
  const postcodeValue = text(input, "postcode", 12);
  const filters = Object.freeze({
    medicineId,
    chemicalSubstance: text(input, "chemicalSubstance", 240),
    chemicalSubstanceCode: text(input, "chemicalSubstanceCode", 32),
    presentationName: text(input, "presentationName", 500),
    presentationCode: text(input, "presentationCode", 32),
    snomedCode: text(input, "snomedCode", 32),
    bnfChapter: text(input, "bnfChapter", 160),
    bnfSection: text(input, "bnfSection", 160),
    bnfParagraph: text(input, "bnfParagraph", 160),
    supplier: text(input, "supplier", 240),
    region: text(input, "region", 160),
    icb: text(input, "icb", 160),
    practiceCode: text(input, "practiceCode", 32),
    postcode: postcodeValue ? normaliseUkPostcode(postcodeValue) : null,
    startMonth,
    endMonth,
  });
  if (!filters.medicineId && !filters.chemicalSubstance && !filters.chemicalSubstanceCode && !filters.presentationName && !filters.presentationCode && !filters.snomedCode && !filters.bnfChapter && !filters.bnfSection && !filters.bnfParagraph) {
    throw new Error("Select a medicine identity or provide a governed medicine filter.");
  }
  if (dataset === "pca" && (filters.practiceCode || filters.postcode)) throw new Error("Practice and postcode filters require EPD; PCA does not identify a prescribing practice.");
  return Object.freeze({ dataset, metric, filters, page: integer(input, "page", 1, 1, 10_000), pageSize: integer(input, "pageSize", 50, 1, 100) });
}

export function normaliseNearbyQuery(input) {
  const postcode = normaliseUkPostcode(text(input, "postcode", 12));
  const radiusKm = integer(input, "radiusKm", 5, 1, 10);
  if (!radii.has(radiusKm)) throw new Error("radiusKm must be 1, 3, 5 or 10.");
  const period = month(input, "period");
  return Object.freeze({ postcode, radiusKm, period, limit: integer(input, "limit", 100, 1, 250) });
}

export function distanceKm(origin, destination) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
