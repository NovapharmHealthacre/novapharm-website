/**
 * Exact ISO 3166-1 alpha-2 identity for the 77 national labels in NovaPharm's
 * 2026 discovery register. EU/EEA and Global are groups, not invented countries.
 */
export const COUNTRY_ISO2 = Object.freeze({
  "United Kingdom":"GB", "Ireland":"IE", "France":"FR", "Spain":"ES",
  "Italy":"IT", "Germany":"DE", "Netherlands":"NL", "Belgium":"BE",
  "Denmark":"DK", "Sweden":"SE", "Norway":"NO", "Finland":"FI",
  "Poland":"PL", "Czechia":"CZ", "Austria":"AT", "Switzerland":"CH",
  "Portugal":"PT", "Hungary":"HU", "Ukraine":"UA", "Russia":"RU",
  "Greece":"GR", "Romania":"RO", "Bulgaria":"BG", "Croatia":"HR",
  "Slovenia":"SI", "Slovakia":"SK", "Estonia":"EE", "Latvia":"LV",
  "Lithuania":"LT", "Serbia":"RS", "Türkiye":"TR",
  "United States":"US", "Canada":"CA", "Mexico":"MX",
  "Brazil":"BR", "Argentina":"AR", "Chile":"CL", "Colombia":"CO",
  "Peru":"PE", "Ecuador":"EC", "Uruguay":"UY",
  "India":"IN", "China":"CN", "Japan":"JP", "South Korea":"KR",
  "Taiwan":"TW", "Singapore":"SG", "Malaysia":"MY", "Indonesia":"ID",
  "Thailand":"TH", "Vietnam":"VN", "Philippines":"PH",
  "Pakistan":"PK", "Bangladesh":"BD", "Nepal":"NP", "Sri Lanka":"LK",
  "Australia":"AU", "New Zealand":"NZ",
  "Saudi Arabia":"SA", "United Arab Emirates":"AE", "Israel":"IL",
  "Jordan":"JO", "Oman":"OM", "Qatar":"QA", "Bahrain":"BH",
  "Kuwait":"KW",
  "South Africa":"ZA", "Nigeria":"NG", "Kenya":"KE", "Ghana":"GH",
  "Tanzania":"TZ", "Rwanda":"RW", "Morocco":"MA", "Egypt":"EG",
  "Algeria":"DZ", "Ethiopia":"ET", "Uganda":"UG"
});
export const SOURCE_GROUP_CODES = Object.freeze({
  "European Union / EEA": "EU-EEA",
  "Global": "GLOBAL"
});
export function requireCountryOrGroupCode(name) {
  if (typeof name !== "string") throw new Error("Unknown source jurisdiction");
  if (Object.hasOwn(COUNTRY_ISO2, name)) return COUNTRY_ISO2[name];
  if (Object.hasOwn(SOURCE_GROUP_CODES, name)) return SOURCE_GROUP_CODES[name];
  throw new Error("Unknown source jurisdiction");
}
