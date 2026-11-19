import assert from "node:assert/strict";
import { test } from "node:test";
import { UK_STANDARD_VAT_RATE_BPS, quoteUkStandardRatedBasket, ukStandardVatMinor } from "../src/core/uk-vat.mjs";

const line = (unitNetMinor, quantity = 1) => ({ unitNetMinor, quantity, vatClass: "GB_STANDARD_20_APPROVED" });
const quote = (...lines) => quoteUkStandardRatedBasket({ currency: "GBP", destinationCountry: "GB", lines });

test("UK standard-rate tax is 20%, calculated in integer pence", () => {
  assert.equal(UK_STANDARD_VAT_RATE_BPS, 2000);
  assert.equal(ukStandardVatMinor(10000), 2000);
  assert.equal(ukStandardVatMinor(1470), 294);
  assert.equal(ukStandardVatMinor(99), 20);
  assert.equal(ukStandardVatMinor(1), 0);
  const basket = quote(line(1470, 10), line(690, 10));
  assert.equal(basket.netMinor, 21600);
  assert.equal(basket.vatMinor, 4320);
  assert.equal(basket.grossMinor, 25920);
  assert.equal(basket.status, "illustrative_calculation_only");
});

test("VAT rounding happens at the line level rather than from a guessed basket rate", () => {
  const basket = quote(line(3), line(3));
  assert.equal(basket.vatMinor, 2);
  assert.equal(basket.netMinor, 6);
  assert.equal(basket.grossMinor, 8);
});

test("UK VAT quotes fail closed for unknown tax classes, destination and currencies", () => {
  assert.throws(() => quoteUkStandardRatedBasket({ currency: "EUR", destinationCountry: "GB", lines: [line(100)] }), /GBP/);
  assert.throws(() => quoteUkStandardRatedBasket({ currency: "GBP", destinationCountry: "US", lines: [line(100)] }), /Destination/);
  assert.throws(() => quote({ ...line(100), vatClass: "ZERO" }), /classification/);
  assert.throws(() => quote({ ...line(100), vatClass: undefined }), /classification/);
  assert.throws(() => quote({ ...line(100), quantity: 0 }), /Quantity/);
  assert.throws(() => quote({ ...line(100), unitNetMinor: -100 }), /integer amount/);
  assert.throws(() => quote({ ...line(100), unitNetMinor: 0 }), /positive approved/);
  assert.throws(() => quote({ ...line(100), unitNetMinor: 1.25 }), /integer amount/);
  assert.throws(() => quote({ ...line(100), unitNetMinor: Number.MAX_SAFE_INTEGER }), /integer amount/);
  assert.throws(() => quote(), /bounded basket/);
  assert.throws(() => ukStandardVatMinor(Number.NaN), /integer amount/);
});
