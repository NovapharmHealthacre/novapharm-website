const legacyBrand = `<div class="sb-hd">
  <div class="sb-brand">
    <div class="sb-mark">NP</div>
    <div><div class="sb-name">NovaPharm</div><div class="sb-co">Healthcare Ltd &middot; EIP v2.0</div></div>
  </div>
</div>`;

const officialBrand = `<div class="sb-hd np-official-brand-shell">
  <a class="np-official-brand" href="/portal/executive-platform/" aria-label="NovaPharm Healthcare Executive Platform">
    <picture><source srcset="/assets/brand/novapharm-healthcare-logo.svg" type="image/svg+xml"><img src="/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare" width="224" height="28" decoding="async"></picture>
  </a>
</div>`;

const officialBrandStyles = `<style id="np-official-brand-styles">
.np-official-brand-shell{background:#fff!important;padding:13px 14px!important}
.np-official-brand{display:block!important;margin:0!important;padding:0!important;background:#fff!important}
.np-official-brand picture,.np-official-brand img{display:block!important;width:100%!important;height:auto!important}
</style>`;

export function applyExecutiveBranding(html, fileName = "") {
  if (!/^NP_[A-Za-z0-9_]+\.html$/.test(fileName)) return html;
  if (!html.includes(legacyBrand)) {
    throw new Error(`Executive Platform branding marker was not found in ${fileName}.`);
  }
  const branded = html.replace(legacyBrand, officialBrand);
  if (!branded.includes("</head>")) throw new Error(`Executive Platform document head was not found in ${fileName}.`);
  return branded.replace("</head>", `${officialBrandStyles}\n</head>`);
}
