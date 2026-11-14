/** Public product-selection handoff. This module NEVER creates or authorises a sale. */
export const nutraxinOrderProducts = Object.freeze({
  "NUT-UK-VD3-T120": { name: "Nutraxin Vitamin D3", packSize: "120 tablets", slug: "vitamin-d3-120-tablets" },
  "NUT-UK-VD3-S30": { name: "Nutraxin Vitamin D3 Spray", packSize: "30 ml", slug: "vitamin-d3-spray-30ml" },
  "NUT-UK-VD3K2-T120": { name: "Nutraxin Vitamin D3 + K2", packSize: "120 tablets", slug: "vitamin-d3-k2-120-tablets" },
  "NUT-UK-VD3K2-S30": { name: "Nutraxin Vitamin D3 + K2 Spray", packSize: "30 ml", slug: "vitamin-d3-k2-spray-30ml" },
  "NUT-UK-VC1000-T30": { name: "Nutraxin Vitamin C 1000 mg", packSize: "30 tablets", slug: "vitamin-c-1000mg-30-tablets" },
  "NUT-UK-VC500-C30": { name: "Nutraxin Vitamin C 500 mg Chewable", packSize: "30 chewable tablets", slug: "vitamin-c-500mg-chewable-30-tablets" },
  "NUT-UK-VMAX-T60": { name: "Nutraxin Vitamin MAX C + D + Zinc", packSize: "60 tablets", slug: "vitamin-max-60-tablets" },
  "NUT-UK-VMAX-E15": { name: "Nutraxin Vitamin MAX C + D + Zinc Effervescent", packSize: "15 effervescent tablets", slug: "vitamin-max-15-effervescent-tablets" },
  "NUT-UK-MGCX-T60": { name: "Nutraxin Magnesium Complex + Vitamin B6", packSize: "60 tablets", slug: "magnesium-complex-60-tablets" },
  "NUT-UK-MGDL-T60": { name: "Nutraxin Magnesium Daily", packSize: "60 tablets", slug: "magnesium-daily-60-tablets" },
  "NUT-UK-MVE-T60": { name: "Nutraxin Multivitamin Mineral Energy", packSize: "60 tablets", slug: "multivitamin-mineral-energy-60-tablets" },
  "NUT-UK-MVW-T60": { name: "Nutraxin Women's Multivitamin Complex", packSize: "60 tablets", slug: "womens-multivitamin-complex-60-tablets" },
  "NUT-UK-MVM-T60": { name: "Nutraxin Men's Multivitamin Complex", packSize: "60 tablets", slug: "mens-multivitamin-complex-60-tablets" },
  "NUT-UK-CG-T30": { name: "Nutraxin Gold Quality Collagen", packSize: "30 tablets", slug: "collagen-gold-30-tablets" },
  "NUT-UK-CG-S30": { name: "Nutraxin Gold Quality Collagen Sachets", packSize: "30 sachets", slug: "collagen-gold-30-sachets" },
  "NUT-UK-CCX-T90": { name: "Nutraxin Collagen Complex", packSize: "90 tablets", slug: "collagen-complex-90-tablets" },
  "NUT-UK-ART-T90": { name: "Nutraxin Artoflex", packSize: "90 tablets", slug: "artoflex-90-tablets" },
  "NUT-UK-LCAR-T60": { name: "Nutraxin L-Carnitine 700 mg", packSize: "60 tablets", slug: "l-carnitine-60-tablets" },
  "NUT-UK-B12-SL60": { name: "Nutraxin Vitamin B12 Methylcobalamin", packSize: "60 sublingual tablets", slug: "vitamin-b12-60-sublingual-tablets" },
} as const);

export type NutraxinOrderSku = keyof typeof nutraxinOrderProducts;

export function recognisedNutraxinSku(value: string | null): NutraxinOrderSku | null {
  if (!value || value.length > 48 || !Object.prototype.hasOwnProperty.call(nutraxinOrderProducts, value)) return null;
  return value as NutraxinOrderSku;
}

export function nutraxinProductForSelection(search: string) {
  const sku = recognisedNutraxinSku(new URLSearchParams(search).get("nutraxin_sku"));
  return sku ? { sku, ...nutraxinOrderProducts[sku] } : null;
}

export function validatedNutraxinIntentQuery(search: string): string {
  const params = new URLSearchParams(search);
  if (params.get("intent") !== "nutraxin") return "";
  const sku = recognisedNutraxinSku(params.get("sku"));
  return sku ? `?intent=nutraxin&sku=${encodeURIComponent(sku)}` : "";
}

/** Brand-neutral, bounded pre-login catalogue intent. Never an order or payment. */
export function validatedCustomerCommerceIntentQuery(search: string): string {
  const nutraxin = validatedNutraxinIntentQuery(search);
  if (nutraxin) return nutraxin;
  const params = new URLSearchParams(search);
  if (params.size === 1 && params.get("intent") === "esco") return "?intent=esco";
  return "";
}

export function destinationAfterPortalLogin(accessType: string, search: string, standardDestination: string): string {
  if (accessType !== "customer") return standardDestination;
  const query = validatedCustomerCommerceIntentQuery(search);
  if (!query) return standardDestination;
  if (query === "?intent=esco") return "/portal/products/?collection=esco";
  const sku = new URLSearchParams(query).get("sku");
  return `/portal/products/?nutraxin_sku=${encodeURIComponent(sku ?? "")}`;
}
