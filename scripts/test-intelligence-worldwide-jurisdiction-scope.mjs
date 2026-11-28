import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const data=JSON.parse(read("docs/intelligence/worldwide-jurisdiction-scope-20261126.json"));
const original=JSON.parse(read("docs/intelligence/country-101-client-catalog-20261118.json"));
const expectedIso="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
test("worldwide scope includes every ISO jurisdiction, all UN members and observers, plus XK",()=>{
 assert.equal(data.jurisdictions.length,250);
 assert.deepEqual(data.jurisdictions.filter(x=>x.iso3166Assigned).map(x=>x.code).sort(),expectedIso.sort());
 assert.equal(data.jurisdictions.filter(x=>x.classification==="un-member-state").length,193);
 assert.deepEqual(data.jurisdictions.filter(x=>x.classification==="un-observer-state").map(x=>x.code).sort(),["PS","VA"]);
 assert.equal(data.jurisdictions.filter(x=>x.classification==="other-iso-jurisdiction").length,54);
 assert.equal(data.jurisdictions.find(x=>x.code==="XK").iso3166Assigned,false);
 assert.deepEqual(data.jurisdictions.filter(x=>x.existingCountryCatalogue).map(x=>x.code).sort(),original.countries.map(x=>x.iso2).sort());
 assert.ok(data.jurisdictions.every(x=>x.customerLive===false&&x.productionAccepted===false));
 assert.ok(data.jurisdictions.filter(x=>!x.existingCountryCatalogue).every(x=>x.candidateSourceCount===0&&x.authorityVerified===false));
});
test("all three clients retain original catalogue and extend it without source activation",()=>{
 const sw=read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift");
 for(const entry of data.jurisdictions.filter(x=>!x.existingCountryCatalogue))assert.ok(sw.includes("("+JSON.stringify(entry.code)+", "+JSON.stringify(entry.displayName)+")"),entry.code);
 for(const p of ["apps/portal/components/country-source-coverage.tsx","native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx"])assert.ok(read(p).includes("worldwide-jurisdiction-scope-20261126.json"));
});
