export const designSystemCss = String.raw`
.np-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.np-skip-link{position:fixed;z-index:9999;inset:1rem auto auto 1rem;transform:translateY(-180%);background:#fff;color:#0d1b2a;padding:.75rem 1rem}
.np-skip-link:focus{transform:none}
.np-navigation{min-height:4.5rem;display:grid;grid-template-columns:minmax(12rem,1fr) auto minmax(12rem,1fr);align-items:center;gap:1.5rem;padding:.75rem max(1rem,4vw);border-bottom:1px solid #d8dde4;background:#fbfaf8;color:#0d1b2a}
.np-navigation__brand{justify-self:start}
.np-navigation__list{display:flex;align-items:center;gap:1.25rem;list-style:none;padding:0;margin:0}
.np-navigation__list a[aria-current=page]{text-decoration-thickness:2px;text-underline-offset:.4rem}
.np-navigation__actions{justify-self:end;display:flex;gap:.5rem}
.np-mega-menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:1.5rem;padding:1.5rem;border:1px solid #d8dde4;background:#fff}
.np-mega-menu h2{font-size:1rem}
.np-mega-menu ul,.np-breadcrumbs ol{list-style:none;padding:0;margin:0}
.np-breadcrumbs ol{display:flex;flex-wrap:wrap;gap:.5rem}
.np-breadcrumbs li+li::before{content:'/';margin-inline-end:.5rem;color:#667085}
.np-hero{min-height:min(44rem,78vh);display:grid;grid-template-columns:minmax(0,7fr) minmax(20rem,5fr);align-items:end;gap:clamp(2rem,5vw,6rem);padding:clamp(4rem,10vw,9rem) max(1rem,6vw);background:#0d1b2a;color:#fff}
.np-hero>*{min-width:0}
.np-hero--compact{min-height:28rem}
.np-hero__content{max-width:58rem}
.np-hero h1{font-size:5rem;letter-spacing:0;line-height:1.02;overflow-wrap:anywhere}
.np-hero__summary{max-width:64ch;font-size:1.2rem;line-height:1.65;color:#eaf3f8}
.np-hero__media{align-self:stretch;min-height:20rem;overflow:hidden}
.np-hero__media img{width:100%;height:100%;object-fit:cover}
.np-eyebrow{text-transform:uppercase;font-size:.78rem;letter-spacing:.08em;font-weight:700}
.np-action-row,.np-portal-controls__actions{display:flex;flex-wrap:wrap;gap:.75rem}
.np-editorial{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:clamp(1.5rem,3vw,3rem);padding:clamp(4rem,8vw,8rem) max(1rem,6vw)}
.np-editorial>*{min-width:0}
.np-editorial>header{grid-column:1/span 5}
.np-editorial__body{grid-column:7/-1}
.np-editorial__media{grid-column:6/-1}
.np-editorial--dark{background:#1b2028;color:#fff}
.np-editorial--blue{background:#eaf3f8;color:#0d1b2a}
.np-leadership-card{display:grid;grid-template-rows:auto 1fr;gap:1rem}
.np-leadership-card__media{aspect-ratio:4/5;overflow:hidden;background:#eaf3f8}
.np-leadership-card__media img{width:100%;height:100%;object-fit:cover}
.np-media-placeholder{background:linear-gradient(135deg,#eaf3f8,#d8dde4)}
.np-product-explorer,.np-chart,.np-document-viewer{min-width:0;border:1px solid #d8dde4;padding:clamp(1rem,3vw,2rem);background:#fff}
.np-filter-row{display:flex;flex-wrap:wrap;gap:1rem}
.np-product-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:1rem}
.np-table-scroll{min-width:0;max-width:100%;overflow:auto}
.np-data-table{width:100%;border-collapse:collapse}
.np-data-table caption{text-align:left;font-weight:700;padding-block:.75rem}
.np-data-table th,.np-data-table td{text-align:left;padding:.75rem;border-bottom:1px solid #d8dde4}
.np-data-table .np-numeric{text-align:right;font-variant-numeric:tabular-nums}
.np-timeline{counter-reset:step;list-style:none;padding:0;margin:0}
.np-timeline li{display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding-block:1.25rem;border-top:1px solid #d8dde4}
.np-timeline__index{font-variant-numeric:tabular-nums;color:#be3035;font-weight:700}
.np-field,.np-search,.np-file-upload{min-width:0;display:grid;gap:.5rem}
.np-field__hint{color:#667085;margin:0}
.np-field__error{color:#9f1239;font-weight:650}
.np-field--error input,.np-field--error select,.np-field--error textarea{border-color:#9f1239}
.np-dialog{width:min(42rem,calc(100% - 2rem));border:0;border-radius:8px;padding:2rem;box-shadow:0 1rem 4rem rgb(13 27 42/.24)}
.np-drawer{position:fixed;z-index:50;inset:0 0 0 auto;width:min(30rem,100%);padding:1.5rem;background:#fff;transform:translateX(100%);visibility:hidden;transition:transform 280ms ease,visibility 280ms}
.np-drawer--open{transform:none;visibility:visible}
.np-drawer>header,.np-document-viewer>header,.np-portal-controls{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
.np-tabs [role=tablist]{display:flex;overflow:auto;border-bottom:1px solid #d8dde4}
.np-tabs [role=tab]{min-height:44px;border:0;border-bottom:3px solid transparent;background:transparent;padding:.75rem 1rem}
.np-tabs [role=tab][aria-selected=true]{border-color:#be3035}
.np-tabs [role=tabpanel]{padding-block:1.5rem}
.np-search input,.np-field input,.np-field select,.np-field textarea,.np-file-upload input{width:100%;max-width:100%;min-height:44px;border:1px solid #98a2b3;border-radius:4px;padding:.7rem .8rem;font:inherit}
.np-filters{border:0;padding:0}
.np-state{border-inline-start:4px solid #667085;padding:1rem 1.25rem;background:#f8fafc}
.np-state--error{border-color:#be3035}
.np-state--loading{border-color:#0b69ff}
.np-portal-controls{padding-bottom:1.5rem;border-bottom:1px solid #d8dde4}
.np-file-upload{border:1px dashed #98a2b3;padding:1.25rem}
.np-status{display:inline-flex;align-items:center;min-height:1.75rem;padding:.2rem .55rem;border:1px solid #98a2b3;border-radius:4px;font-weight:650}
.np-status--positive{border-color:#267a54;color:#175c3d}
.np-status--warning{border-color:#9a6700;color:#7a4f00}
.np-status--critical{border-color:#be3035;color:#9f1239}
.np-audit-history{list-style:none;padding:0}
.np-audit-history li{padding:1rem 0;border-bottom:1px solid #d8dde4}
.np-audit-history time{font-variant-numeric:tabular-nums;color:#667085}
.np-document-viewer__content{min-height:24rem;margin-top:1.5rem;border-top:1px solid #d8dde4;padding-top:1.5rem}
.np-form{min-width:0;display:grid;gap:1.25rem}
.np-button{min-height:44px;border-radius:4px;padding:.65rem 1rem;font:inherit;font-weight:700;border:1px solid transparent}
.np-button--primary{background:#be3035;color:#fff}
.np-button--secondary{background:#fff;color:#0d1b2a;border-color:#667085}
.np-button--danger{background:#9f1239;color:#fff}
:where(.np-button,.np-navigation a,.np-tabs button,input,select,textarea,summary):focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
@media(max-width:800px){
  .np-navigation{grid-template-columns:1fr auto}
  .np-navigation nav{grid-column:1/-1;min-width:0;overflow:auto}
  .np-navigation__list{width:max-content}
  .np-hero{min-height:auto;grid-template-columns:1fr}
  .np-hero h1{font-size:3rem}
  .np-hero__media{min-height:16rem}
  .np-editorial>header,.np-editorial__body,.np-editorial__media{grid-column:1/-1}
  .np-portal-controls{display:grid}
}
@media(prefers-reduced-motion:reduce){.np-drawer{transition:none}}
`;
