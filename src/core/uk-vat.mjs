/**
 * UK standard-rate VAT arithmetic for an eventual approved domestic Nutraxin
 * food-supplement checkout. Pure computation: no order, payment, invoice or tax
 * registration is created by this module.
 *
 * HMRC VAT Notice 701/14 §4.2 and VFOOD1960: vitamin/mineral and similar
 * dietary supplements are standard-rated. Source consulted 2026-11-08.
 * Other product classes and export destinations must be assessed separately.
 */
export const UK_STANDARD_VAT_RATE_BPS = 2000;
export const UK_STANDARD_VAT_RATE_PERCENT = 20;

function positivePence(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000_00) {
    throw new RangeError(`${label} must be an integer amount in GBP pence.`);
  }
  return value;
}

/**
 * Calculate tax on an exclusive-of-VAT net line total, rounded to the penny.
 * The caller must use an authoritative server-side product price, not browser
 * pricing, and must verify the customer's VAT/invoice and delivery context.
 */
export function ukStandardVatMinor(netMinor) {
  positivePence(netMinor, "Net amount");
  return Math.round((netMinor * UK_STANDARD_VAT_RATE_BPS) / 10_000);
}

/**
 * For explicitly UK-destination, GBP, standard-rated basket lines only.
 * No assumed zero-rating, no tax exemption guessed from customer or product.
 * Every line is priced tax-exclusive. Mixed tax rates require another service.
 */
export function quoteUkStandardRatedBasket({ currency, destinationCountry, lines }) {
  if (currency !== "GBP") throw new RangeError("UK checkout requires GBP currency.");
  if (destinationCountry !== "GB") throw new RangeError("Destination tax treatment requires separate verification.");
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 100) throw new RangeError("A bounded basket is required.");

  const quotedLines = lines.map((line) => {
    if (line?.vatClass !== "GB_STANDARD_20_APPROVED") throw new RangeError("Unverified UK product VAT classification.");
    const quantity = line.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new RangeError("Quantity is invalid.");
    const unitNetMinor = positivePence(line.unitNetMinor, "Unit net amount");
    if (!unitNetMinor) throw new RangeError("A positive approved unit price is required.");
    const netMinor = unitNetMinor * quantity;
    if (!Number.isSafeInteger(netMinor) || netMinor > 100_000_000_00) throw new RangeError("Line total exceeds the permitted bound.");
    const vatMinor = ukStandardVatMinor(netMinor);
    return Object.freeze({ netMinor, vatMinor, grossMinor: netMinor + vatMinor, quantity, vatRatePercent: UK_STANDARD_VAT_RATE_PERCENT });
  });

  const totals = quotedLines.reduce((amount, line) => ({
    netMinor: amount.netMinor + line.netMinor,
    vatMinor: amount.vatMinor + line.vatMinor,
    grossMinor: amount.grossMinor + line.grossMinor
  }), { netMinor: 0, vatMinor: 0, grossMinor: 0 });
  if (!Object.values(totals).every(Number.isSafeInteger)) throw new RangeError("Basket exceeds the supported amount.");
  return Object.freeze({ currency: "GBP", destinationCountry: "GB", vatRatePercent: UK_STANDARD_VAT_RATE_PERCENT, lines: quotedLines, ...totals, status: "illustrative_calculation_only" });
}
