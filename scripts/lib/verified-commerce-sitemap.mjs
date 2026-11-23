// Exact public canonical set from the checked-in SEO register, with the two
// generated, indexable commerce collections. No customer bag/status URLs.
const BASE="https://novapharmhealthcare.com";
export const COMMERCE_INDEXABLE_ROUTES=Object.freeze(["/products/esco/","/products/marketplace/"]);
export function validateCommerceSitemap(xml,register) {
  if(typeof xml!=="string" || xml.length>1000000 ||
     !xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') ||
     !xml.includes("</urlset>") || !Array.isArray(register) || register.length<50) {
    throw Error("Published sitemap or approved canonical register missing");
  }
  const required=register.filter(x=>x?.indexable===true);
  if(required.length<50) throw Error("Approved canonical register is incomplete");
  const urls=required.map(x=>{
    if(typeof x.route!=="string" || !/^\/(?:[a-z0-9-]+\/)*$/.test(x.route) ||
       x.canonical!==BASE+x.route) throw Error("Invalid approved canonical source");
    return x.canonical;
  });
  urls.push(...COMMERCE_INDEXABLE_ROUTES.map(x=>BASE+x));
  const expected=new Set(urls);
  if(expected.size!==urls.length) throw Error("Duplicate canonical route in source register");
  const entries=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  const live=entries.map(match=>{
    const locs=[...match[1].matchAll(/<loc>([^<]+)<\/loc>/g)];
    if(locs.length!==1 || !/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(match[1]))
      throw Error("Published sitemap entry malformed");
    return locs[0][1];
  });
  const found=new Set(live);
  if(found.size!==live.length ||
     (xml.match(/<loc>/g)||[]).length!==live.length ||
     found.size!==expected.size || [...expected].some(x=>!found.has(x))) {
    throw Error("Published sitemap canonical set mismatch: expected "+expected.size+" actual "+live.length+
      "; missing="+[...expected].filter(x=>!found.has(x)).join(",")+
      "; unexpected="+live.filter(x=>!expected.has(x)).join(","));
  }
  return {count:live.length,canonicals:live};
}
