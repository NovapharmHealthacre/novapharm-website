import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const categoryGuide = {
  'Hospital Furniture': 180, 'Ward Equipment': 110,
  'Hospital Trolleys': 260, 'SS Hollowware': 18,
  'Hospital Sundries': 8, 'Hospital Linen & OT Textiles': 24,
  'Sterilization & Refrigeration Equipment': 1250,
  'Laboratory Equipment': 390, 'Laboratory Glassware & Consumables': 9,
  'Laboratory Plasticware': 10, 'Surgical Instruments': 48,
  'OT & Surgical Lights': 2800
};
const subcategoryGuide = {
  'Hospital Beds': 850, 'Examination & Consultation': 320,
  'Obstetric & Gynaecology': 640, 'Mattresses & Bed Accessories': 80,
  'Patient Room Furniture': 130, 'Storage & Cabinets': 380,
  'Patient Mobility & Transfer': 165, 'Waste & Infection Control': 22,
  'Ward & Patient Care': 95, 'Ward Utility Equipment': 110,
  'Infusion Equipment': 70, 'Clinical & Patient Care Trolleys': 290,
  'OT & Procedure Trolleys': 305, 'Emergency Trolleys': 780,
  'Linen & Waste Trolleys': 340, 'Hospital Service Trolleys': 340,
  'Trays & Basins': 18, 'Bowls & Containers': 16,
  'Patient-Care Hollowware': 19, 'Sterilization Hollowware': 49,
  'Specimen Collection': 6, 'General Hospital Sundries': 7,
  'Bags & Packaging': 11, 'OT Linen / Surgical Apparel': 29,
  'OT Linen / Surgical Drapes': 31, 'OT Linen / Equipment Covers': 34,
  'Surgical & Procedure Sets': 145, 'Patient & Ward Linen': 28,
  'Patient Apparel': 29, 'Sterilizers': 2200,
  'Refrigeration': 2800, 'Sterilization Consumables & Accessories': 21,
  'Laboratory Equipment': 330, 'Microscopy': 390,
  'Laboratory Safety & Ventilation': 2900,
  'Laboratory Refrigeration & Storage': 2350,
  'Laboratory Glassware': 12, 'Laboratory Consumables': 14,
  'Plastic Measuring & Handling': 12, 'Plastic Bottles & Containers': 12,
  'Plastic Tubes & Racks': 14, 'Plastic Cultureware': 17,
  'Plastic Laboratory Accessories': 13, 'General Surgery': 46,
  'Needle Holders': 68, 'Gynaecology & Obstetrics': 92,
  'Orthopaedic': 88, 'Urology': 98, 'ENT': 73,
  'Ophthalmic': 98, 'Dental & Oral': 64,
  'Cardiovascular': 120, 'Neurosurgical': 135,
  'Laparoscopic': 295, 'Scalpels & Knives': 27,
  'Diagnostic Instruments': 85, 'Plaster & Casting Instruments': 79,
  'Sterilization Instruments': 74, 'Instrument Sets': 450,
  'Operating Theatre Lights': 5800,
  'Examination & Minor Procedure Lights': 930
};
const benchmarkSources = {
  'Hospital Furniture': 'https://www.kaysmedical.com/product/medical-equipment/furniture-medical-equipment/couches-treatment-chairs-furniture-medical-equipment/blue-lion-examination-couch/',
  'Ward Equipment': 'https://www.kaysmedical.com/product/biohazard-decontamination/sharps-disposal-biohazard-decontamination/bins-containers/sharps-bin-5-litre/',
  'Hospital Trolleys': 'https://www.hce-uk.com/shop/furniture/trolleys/surgical-trolley/',
  'SS Hollowware': 'https://mediworld.co.uk/collections/trays-bowls-holloware',
  'Hospital Sundries': 'https://www.kaysmedical.com/product/biohazard-decontamination/sharps-disposal-biohazard-decontamination/bins-containers/sharps-bin-5-litre/',
  'Hospital Linen & OT Textiles': '',
  'Sterilization & Refrigeration Equipment': '',
  'Laboratory Equipment': 'https://www.gbmedical.co.uk/laboratory',
  'Laboratory Glassware & Consumables': 'https://www.kingscientific.co.uk/laboratory-essentials/laboratory-glassware/laboratory-beakers',
  'Laboratory Plasticware': 'https://apcpure.com/product/specimen-tubes-flat-bottom-soda-glass-with-pe-stopper-50mm-x-19mm-dia-pack-of-100',
  'Surgical Instruments': '',
  'OT & Surgical Lights': 'https://www.medicalsupplies.co.uk/operation-theatre-lighting.html'
};
const adjustments = [
  [/^5-function|^5 function|electric|hydraulic|ultra-low|digital microscope/i, 1.95],
  [/^3-function|^3 function|^3-section|^3 section|trino?cular/i, 1.42],
  [/^2-function|^2 function|^2-section|^2 section/i, 1.15],
  [/icu bed|dialysis chair|blood bank refrigerator|blood donor chair/i, 2.1],
  [/baby|infant|pediatric|paediatric/i, 0.78],
  [/manual|portable|compact|single|minor/i, 0.78],
  [/double|major|reinforced/i, 1.6],
  [/roll|bags|apron|cap|cover|slide|label|cup|sticker/i, 0.72],
  [/triple|3-shelf/i, 1.32],
  [/test tubes|pipette tips|cotton|sheets|drapes|pouches|reels/i, 0.77],
  [/specimen|stool|urine|sputum/i, 0.72],
  [/surgical blades|needle holder|forceps|scissors|retractor/i, 0.85],
  [/electric.*bed|led ot lights/i, 1.25],
  [/ice-lined|freezer|steam sterilizer|autoclave/i, 1.25]
];
// Commercial planning inputs. Owner-declared stock is NOT warehouse-verified or pickable.
const OWNER_DECLARED_STOCK_UNITS_PER_CATALOGUE_REFERENCE = 10000;
const ILLUSTRATIVE_OUTBOUND_SHIPPING_GBP = Object.freeze({
  'Hospital Furniture': 55, 'Ward Equipment': 8, 'Hospital Trolleys': 28,
  'SS Hollowware': 5, 'Hospital Sundries': 3, 'Hospital Linen & OT Textiles': 5,
  'Sterilization & Refrigeration Equipment': 160, 'Laboratory Equipment': 25,
  'Laboratory Glassware & Consumables': 4, 'Laboratory Plasticware': 4,
  'Surgical Instruments': 7, 'OT & Surgical Lights': 140
});
const ILLUSTRATIVE_CARD_FEE_FRACTION = 0.025; // Sensitivity assumption, NOT actual Stripe tariff.
const ILLUSTRATIVE_CARD_FEE_FIXED_GBP = 0.20;
const ILLUSTRATIVE_3_MONTH_STORAGE_RESERVE_FRACTION = 0.01; // Hypothetical reserve, NOT warehouse rent.
const TARGET_GROSS_MARGIN_FRACTION = 0.25;
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
function costEnvelopeForIllustration(priceExVat, category) {
  const outboundDelivery = ILLUSTRATIVE_OUTBOUND_SHIPPING_GBP[category];
  if (!Number.isFinite(outboundDelivery)) throw Error('Missing illustrative outbound cost for ' + category);
  const maxTotalVariableCost = money(priceExVat * (1 - TARGET_GROSS_MARGIN_FRACTION));
  const cardFee = money(priceExVat * ILLUSTRATIVE_CARD_FEE_FRACTION + ILLUSTRATIVE_CARD_FEE_FIXED_GBP);
  const threeMonthStorageReserve = money(priceExVat * ILLUSTRATIVE_3_MONTH_STORAGE_RESERVE_FRACTION);
  const maximumSupplierAndInboundCost = money(maxTotalVariableCost - outboundDelivery - cardFee - threeMonthStorageReserve);
  return {
    assumptionsOnly: true,
    grossMarginTarget: TARGET_GROSS_MARGIN_FRACTION,
    maximumTotalVariableCostGbp: maxTotalVariableCost,
    illustrativeOutboundDeliveryAllocationGbp: outboundDelivery,
    illustrativeCardFeeAllocationGbp: cardFee,
    illustrativeThreeMonthStorageReserveGbp: threeMonthStorageReserve,
    maximumSupplierAndInboundCostGbp: Math.max(0, maximumSupplierAndInboundCost),
    modelFeasibleBeforeActualCosts: maximumSupplierAndInboundCost > 0,
    actualSupplierCostKnown: false,
    actualFreightKnown: false,
    actualPaymentFeesKnown: false,
    actualStorageChargesKnown: false,
    grossProfitProven: false
  };
}
const svgEscape = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function roundPrice(v) {
  if (v >= 1000) return Math.max(1, Math.round(v / 10) * 10);
  if (v >= 100) return Math.max(1, Math.round(v / 5) * 5);
  return Math.max(1.95, Math.round(v * 20) / 20);
}
export function guideFor(item) {
  const base = subcategoryGuide[item.subcategory] ?? categoryGuide[item.category];
  if (!Number.isFinite(base)) throw Error('No ESCO pricing basis for ' + item.category + ' / ' + item.subcategory);
  const name = item.name || '';
  const adjust = adjustments.find(([regexp]) => regexp.test(name));
  const guidePriceExVatGbp = roundPrice(base * (adjust ? adjust[1] : 1) * 0.94);
  return {
    catalogueReference: item.id,
    category: item.category,
    guidePriceExVatGbp,
    currency: 'GBP',
    taxDisplay: 'ex-VAT; rate and eligibility not confirmed',
    sourceType: 'CATEGORY_LEVEL_UK_RESEARCH_ESTIMATE',
    benchmarkUrl: benchmarkSources[item.category] || null,
    deliveryIncluded: false,
    ownerDeclaredStockUnits: OWNER_DECLARED_STOCK_UNITS_PER_CATALOGUE_REFERENCE,
    inventoryEvidence: 'OWNER_DECLARATION_NOT_WAREHOUSE_RECONCILED',
    availableToPromiseUnits: null,
    stockVerified: false,
    unitEconomics: costEnvelopeForIllustration(guidePriceExVatGbp, item.category),
    supplierUnitCostKnown: false,
    grossMarginGuaranteed: false,
    maximumFullyLandedCostFor25PercentMarginGbp: Math.round(guidePriceExVatGbp * 0.75 * 100) / 100,
    priceApprovedForCheckout: false,
    checkoutEligible: false,
    publicGuideOnly: true
  };
}
const shapes = {
  bed: '<rect x="135" y="158" width="355" height="93" rx="14"/><path d="M124 246h388M146 258v42M490 258v42M154 149V127M475 149v-22"/><path d="M180 153h125q21 0 32 25H177Z" fill="#E2EAF4" stroke="none"/>',
  trolley: '<rect x="150" y="117" width="338" height="32" rx="5"/><rect x="150" y="212" width="338" height="25" rx="5"/><path d="M169 149v64m303-64v64M165 238v45M475 238v45"/><circle cx="165" cy="290" r="12"/><circle cx="475" cy="290" r="12"/>',
  wheelchair: '<circle cx="254" cy="246" r="71"/><circle cx="254" cy="246" r="35"/><circle cx="437" cy="276" r="21"/><path d="M287 146h88l29 110h30M287 146l-33-68m34 165h94l-14-89M355 161l-25 79"/>',
  chair: '<rect x="255" y="103" width="143" height="112" rx="13"/><rect x="246" y="214" width="170" height="30" rx="8"/><path d="M279 246v80m108-80v80M260 198l-28 44m175-44 28 44"/>',
  light: '<path d="M325 286V154l-91-38M328 155l89-60"/><path d="M218 120l-39 28q38 56 93 28l-15-53Z" fill="#DFEDFD"/><path d="M419 96l28 21q-17 33-49 18l6-38Z" fill="#DFEDFD"/><path d="M272 297h121"/><circle cx="331" cy="150" r="10"/>',
  instrument: '<path d="M213 268 416 99M217 100l197 172M207 286q-37-13-9-44l44-34M415 279q38-11 13-41l-45-36"/><circle cx="220" cy="276" r="26"/><circle cx="412" cy="275" r="26"/><path d="M273 181l111 1"/>',
  microscope: '<path d="M282 120l34-42 95 85-39 43Z"/><path d="M370 199l33 29q-19 48-69 58M278 274h173M240 300h236"/><rect x="223" y="232" width="135" height="27" rx="7"/><circle cx="409" cy="196" r="17"/>',
  glass: '<path d="M237 113v46l-79 122q-13 23 12 23h300q25 0 12-23l-80-122v-46"/><path d="M234 113h172M197 253h251M254 175h121"/><path d="M210 285h224" stroke="#B9D7FF"/>',
  bottle: '<rect x="261" y="124" width="111" height="190" rx="22"/><rect x="288" y="91" width="58" height="36" rx="6"/><path d="M288 100h58M272 218h91M275 240h87"/>',
  tray: '<path d="M158 174h326l-37 115H195Z"/><path d="M172 190h301M220 250h199"/><path d="M170 166h300" stroke-width="10"/>',
  table: '<rect x="180" y="158" width="305" height="40" rx="8"/><path d="M213 201v102m239-102v102"/><path d="M213 264h239M250 135h168"/>',
  pack: '<path d="M245 99h161l28 224H215Z"/><path d="M249 135h153M275 168h101M275 195h101M275 222h67"/><path d="M299 97v-20h53v20"/>',
  tubes: '<path d="M230 104v157q0 39 35 39t35-39V104M347 104v157q0 39 35 39t35-39V104"/><path d="M217 104h96M335 104h96M230 186h70M347 210h70"/>',
  bowl: '<path d="M145 167h345Q487 292 318 299 146 286 145 167Z"/><path d="M130 167h374"/><path d="M234 232q85 46 172-2" stroke="#B9D7FF"/>',
  textile: '<path d="M251 109l-51 38-30 102 66 21 29-54v111h110V216l29 54 66-21-30-102-51-38-44 31h-52Z"/><path d="M286 111l36 51 36-51" stroke="#D1E7FF"/>',
  cabinet: '<rect x="215" y="82" width="215" height="225" rx="9"/><path d="M323 85v218M221 194h204M294 207v25M345 207v25"/><path d="M231 309v16M409 309v16"/>',
  machine: '<rect x="206" y="120" width="230" height="170" rx="18"/><path d="M236 164h166M237 204h167"/><circle cx="258" cy="251" r="15"/><circle cx="316" cy="251" r="15"/><path d="M376 250h36" stroke-width="13"/>',
  freezer: '<rect x="231" y="83" width="172" height="235" rx="14"/><path d="M231 190h172M262 108v36M262 211v32"/><path d="M252 313v15m129-15v15"/>',
  bin: '<path d="M237 139h175l-25 165H261Z"/><path d="M214 139h220M257 112h138M308 100h39"/><path d="M284 168v106m49-106v106m42-106v106"/>',
  crutch: '<path d="M246 85h120M263 96l48 215m42-215-42 215M282 161h57"/><path d="M224 89h160" stroke-width="17"/>'
};
function imageKind(item) {
  const text=(item.name+' '+item.subcategory).toLowerCase();
  if (/overbed table|feeding table|instrument table|back table|ot table cover/.test(text)) return 'table';
  if (/test tubes|centrifuge tubes|micro tubes|cryovials|pipettes|burettes/.test(text)) return 'tubes';
  if (/pouches|reels|indicators|medical labels|patient id bands|drug bags|sample bags|zip-lock|biohazard bags/.test(text)) return 'pack';
  if (/microscope slides|cover slips|slide boxes/.test(text)) return 'tray';
  if (/wheelchair/.test(text)) return 'wheelchair';
  if (/crutch|walking frame|walker/.test(text)) return 'crutch';
  if (/chair|stool/.test(text)) return 'chair';
  if (/bed|cot|couch|examination table|mattress|crib|stretcher/.test(text)) return 'bed';
  if (/light|lamp/.test(text)) return 'light';
  if (/trolley|cart|stand|transfer board/.test(text)) return 'trolley';
  if (/cabinet|locker|cupboard|storage/.test(text)) return 'cabinet';
  if (/freezer|refrigerator|cold box/.test(text)) return 'freezer';
  if (/bin|waste|sharps/.test(text)) return 'bin';
  if (/bowls|bowl|gallipot|basin|urinal|bedpan|cup/.test(text)) return 'bowl';
  if (/tray|instrument container|basket/.test(text)) return 'tray';
  if (/coat|scrub|gown|drape|blanket|linen|sheet|cap|mask|cloth|towel|apron|cover/.test(text)) return 'textile';
  if (/bottle|container|vial|sample|specimen|tube|bag|jar/.test(text)) return 'bottle';
  if (/microscope|microscopy/.test(text)) return 'microscope';
  if (/beaker|flask|cylinder|pipette|glassware|funnel|petri|measuring/.test(text)) return 'glass';
  if (/sterili|incubator|oven|bath|mixers|shakers|centrifuge|hot plate|safety cabinet/.test(text)) return 'machine';
  if (item.category==='Surgical Instruments') return 'instrument';
  if (item.category==='Hospital Linen & OT Textiles') return 'textile';
  return 'machine';
}
function splitTitle(text) {
  const words=String(text).replace(/[—–]/g,'-').split(' ');
  const lines=['',''];
  for(const word of words) {
    if ((lines[0]+' '+word).trim().length<=27 || !lines[0]) lines[0]=(lines[0]+' '+word).trim();
    else lines[1]=(lines[1]+' '+word).trim().slice(0,34);
  }
  return lines;
}
export function makeProductIllustration(item) {
  const kind=imageKind(item);
  const [title1,title2]=splitTitle(item.name);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="Concept illustration for '+svgEscape(item.name)+'">'
   +'<rect width="640" height="420" rx="24" fill="#F6F8FB"/>'
   +'<circle cx="320" cy="196" r="162" fill="#EBF1F9"/>'
   +'<g fill="none" stroke="#283D5A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">'+(shapes[kind]||shapes.machine)+'</g>'
   +'<rect x="24" y="24" width="103" height="32" rx="16" fill="#FFFFFF"/>'
   +'<text x="75" y="45" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#53657C" text-anchor="middle">ESCO / UK</text>'
   +'<text x="320" y="355" font-family="Arial,sans-serif" font-size="23" font-weight="700" text-anchor="middle" fill="#19273A">'+svgEscape(title1)+'</text>'
   +'<text x="320" y="380" font-family="Arial,sans-serif" font-size="19" text-anchor="middle" fill="#56677F">'+svgEscape(title2)+'</text>'
   +'</svg>';
}
export function buildMerchandising(entries) {
  const prices={};
  const visuals={};
  for(const item of entries){
    prices[item.id]=guideFor(item);
    const path='assets/media/esco/previews/'+item.id.toLowerCase()+'.svg';
    mkdirSync(dirname(path),{recursive:true});
    writeFileSync(path,makeProductIllustration(item),'utf8');
    visuals[item.id]='/'+path;
  }
  if(Object.keys(prices).length!==373 || Object.keys(visuals).length!==373)throw Error('ESCO 373 guides/illustrations are incomplete');
  const output={
    version:'esco-uk-guide-2026-11-09', source:'Owner-authorised category-level UK research and illustrative price modelling, not supplier prices',
    taxPolicy:'Ex VAT guide only. Confirm tax per product and customer; freight not included.',
    marginPolicy:'25% gross margin is a target only; supplier delivered costs and additional fees are unknown.',
    checkoutEnabled:false, paymentCollectionEnabled:false, requestQuoteOnly:true, currency:'GBP',
    ownerDeclaredInventoryUnitsPerCatalogueReference: OWNER_DECLARED_STOCK_UNITS_PER_CATALOGUE_REFERENCE,
    totalOwnerDeclaredInventoryUnits: entries.length * OWNER_DECLARED_STOCK_UNITS_PER_CATALOGUE_REFERENCE,
    inventoryEvidence: 'OWNER_DECLARATION_NOT_WAREHOUSE_RECONCILED',
    stockVerified: false,
    availableToPromiseVerified: false,
    unitEconomicsAssumptions: {
      basis: 'Illustrative planning sensitivity, not verified costs or a promise of margin',
      targetGrossMargin: TARGET_GROSS_MARGIN_FRACTION,
      illustrativeCardProcessingRate: ILLUSTRATIVE_CARD_FEE_FRACTION,
      illustrativeCardProcessingFixedGbp: ILLUSTRATIVE_CARD_FEE_FIXED_GBP,
      illustrativeThreeMonthStorageReserveFraction: ILLUSTRATIVE_3_MONTH_STORAGE_RESERVE_FRACTION,
      illustrativeOutboundDeliveryByCategoryGbp: ILLUSTRATIVE_OUTBOUND_SHIPPING_GBP,
      vat: 'Excluded; assess rate and customer treatment for each confirmed SKU',
      marginBasis: 'Guide price ex VAT less all variable costs divided by guide price ex VAT',
      actualSupplierFreightRentFeesVerified: false
    },
    entriesTotal:373, guidePrices:prices, visualPreviews:visuals
  };
  writeFileSync('assets/data/esco-uk-guide-prices.json',JSON.stringify(output,null,2)+'\n','utf8');
  return output;
}