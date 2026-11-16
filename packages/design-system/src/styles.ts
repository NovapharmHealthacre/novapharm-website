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
.np-timeline__index{font-variant-numeric:tabular-nums;color:#B30E09;font-weight:700}
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
.np-tabs [role=tab][aria-selected=true]{border-color:#E3120B}
.np-tabs [role=tabpanel]{padding-block:1.5rem}
.np-search input,.np-field input,.np-field select,.np-field textarea,.np-file-upload input{width:100%;max-width:100%;min-height:44px;border:1px solid #98a2b3;border-radius:4px;padding:.7rem .8rem;font:inherit}
/* Search fields: contextual scope, visible clear action, touch targets and resilient focus. */
.np-search__control{display:flex;align-items:center;min-width:0;border:1px solid #98a2b3;border-radius:12px;background:#fff;transition:border-color 160ms ease,box-shadow 160ms ease}
.np-search__control:focus-within{border-color:#0b69ff;box-shadow:0 0 0 3px rgba(11,105,255,.16)}
.np-search__icon{flex:none;margin-inline-start:13px;color:#667085}
.np-search .np-search__control input{min-width:0;min-height:44px;flex:1;width:100%;border:0;border-radius:12px;padding:.65rem .75rem;background:transparent;font:inherit;color:#1d1d1f}
.np-search .np-search__control input:focus{outline:none}
.np-search__control--clear input::-webkit-search-cancel-button{display:none}
.np-search__clear{min-height:44px;flex:none;padding:0 .85rem;border:0;border-radius:10px;background:transparent;color:#0059b8;font:inherit;font-size:.875rem;cursor:pointer}
.np-search__clear:hover{background:#f5f5f7}
.np-search__clear:focus-visible{outline:3px solid #0b69ff;outline-offset:-3px}
.np-search__scope,.np-search__count{margin:0;font-size:.875rem;line-height:1.45;color:#515861}
@media(prefers-reduced-motion:reduce){.np-search__control{transition:none}}
@media(forced-colors:active){.np-search__control{border-color:CanvasText}.np-search__control:focus-within{outline:2px solid Highlight}.np-search__icon,.np-search__clear{color:CanvasText}}

.np-filters{border:0;padding:0}
.np-state{border-inline-start:4px solid #667085;padding:1rem 1.25rem;background:#f8fafc}
.np-state--error{border-color:#9e1b47}
.np-state--loading{border-color:#0b69ff}
.np-portal-controls{padding-bottom:1.5rem;border-bottom:1px solid #d8dde4}
.np-file-upload{border:1px dashed #98a2b3;padding:1.25rem}
.np-status{display:inline-flex;align-items:center;min-height:1.75rem;padding:.2rem .55rem;border:1px solid #98a2b3;border-radius:4px;font-weight:650}
.np-status--positive{border-color:#267a54;color:#175c3d}
.np-status--warning{border-color:#9a6700;color:#7a4f00}
.np-status--critical{border-color:#9e1b47;color:#9e1b47}
.np-audit-history{list-style:none;padding:0}
.np-audit-history li{padding:1rem 0;border-bottom:1px solid #d8dde4}
.np-audit-history time{font-variant-numeric:tabular-nums;color:#667085}
.np-document-viewer__content{min-height:24rem;margin-top:1.5rem;border-top:1px solid #d8dde4;padding-top:1.5rem}
.np-form{min-width:0;display:grid;gap:1.25rem}
.np-button{min-height:44px;border-radius:4px;padding:.65rem 1rem;font:inherit;font-weight:700;border:1px solid transparent}
.np-button--primary{background:#E3120B;color:#fff}
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

/* Semantic text roles match the public, corporate and operational estates. */
:where(.np-navigation,.np-hero,.np-editorial,.np-product-explorer,.np-data-table,.np-form,.np-portal-controls){
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-optical-sizing:auto;
}
:where(.np-hero h1,.np-editorial h2,.np-mega-menu h2){
  font-optical-sizing:auto;
  overflow-wrap:break-word;
}
.np-hero h1{font-size:clamp(2.75rem,6vw,5rem)}
:where(.np-hero__summary,.np-editorial__body p,.np-editorial__body li){
  line-height:1.65;
  max-width:68ch;
}
:where(.np-breadcrumbs,.np-state,.np-field__hint,.np-result-count){
  line-height:1.45;
}
:where(.np-data-table th,.np-data-table td,.np-audit-history time){
  font-variant-numeric:tabular-nums;
}
:where(.np-data-table th,.np-data-table td){overflow-wrap:break-word}
@media(max-width:640px){
  :where(.np-hero h1,.np-editorial h2,.np-editorial__body,.np-data-table th,.np-data-table td){
    min-width:0;
    overflow-wrap:break-word;
  }
}
@media(prefers-contrast:more){
  :where(.np-field__hint,.np-result-count){color:#1b2028}
}
/* Apple's official black App Store badges are immutable art, not themed buttons.
   40 px minimum onscreen, 10 px clear space on each side (1/4 badge height). */
.np-app-store-badges{display:flex;align-items:center;flex-wrap:wrap;gap:0}
.np-app-store-badges__link{display:inline-flex;flex:none;align-items:center;justify-content:center;margin:10px;line-height:0}
.np-app-store-badges__link:focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
.np-app-store-badges__artwork{display:block;height:40px;width:auto;max-width:none}
/* The navigation layer only: opaque default, softened on capable displays. */
.np-navigation,.np-mega-menu{
  background:#fff;
  border-color:rgba(17,24,32,.12);
}
@supports ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){
  .np-navigation{background:rgba(255,255,255,.94);-webkit-backdrop-filter:saturate(125%) blur(14px);backdrop-filter:saturate(125%) blur(14px)}
  .np-mega-menu{background:rgba(255,255,255,.97);-webkit-backdrop-filter:saturate(115%) blur(18px);backdrop-filter:saturate(115%) blur(18px)}
}
/* Legibility, focus and accessibility win over visual effects. */
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more),(forced-colors:active){
  .np-navigation,.np-mega-menu{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
}
:root[data-np-transparency="reduce"] .np-navigation,
:root[data-np-transparency="reduce"] .np-mega-menu{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
@media (forced-colors:active){.np-navigation,.np-mega-menu{background:Canvas;color:CanvasText;border-color:CanvasText}}

/* Original web representation of a payment request, not an Apple payment sheet. */
.np-payment-request{max-inline-size:38rem;margin-inline:auto;display:grid;gap:1.25rem;padding:clamp(1.25rem,4vw,2.5rem);border:1px solid #d8dde4;border-radius:1.75rem;background:#f5f5f7;color:#1d1d1f;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}
.np-payment-request__header{display:grid;gap:.35rem}
.np-payment-request__eyebrow{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;font-weight:650;color:#B30E09;margin:0}
.np-payment-request__header h2{font-size:clamp(1.625rem,4vw,2.5rem);font-weight:650;line-height:1.1;letter-spacing:-.025em;margin:0}
.np-payment-request__card{padding:clamp(1.5rem,5vw,3rem);border:1px solid #d2d2d7;border-radius:1.5rem;background:#fff;box-shadow:0 .75rem 2rem rgb(0 0 0/.04);text-align:center}
.np-payment-request__merchant{font-size:clamp(1rem,2.5vw,1.25rem);font-weight:620;margin:0}
.np-payment-request__amount{font-size:clamp(2.5rem,9vw,5rem);line-height:1.15;letter-spacing:-.035em;font-weight:650;overflow-wrap:anywhere;margin:1.25rem 0}
.np-payment-request__reference{margin:.35rem 0;color:#515154;font-size:.9rem;overflow-wrap:anywhere}
.np-payment-request__status{margin:1.25rem 0 0;padding-block-start:1rem;border-top:1px solid #ececef;color:#404044;font-weight:650}
.np-payment-request__note{color:#515154;line-height:1.5;font-size:.92rem;max-inline-size:58ch;margin:0}
.np-payment-request__actions{display:flex;flex-wrap:wrap;gap:.75rem}
.np-payment-request__actions :where(a,button){display:inline-flex;min-block-size:44px;align-items:center;justify-content:center;border-radius:999px;padding:.75rem 1.25rem;text-decoration:none;font-weight:650}
.np-payment-request__actions :where(a,button):focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
@media(max-width:480px){.np-payment-request{border-radius:1rem;padding:1rem}.np-payment-request__card{padding:1.5rem 1rem}.np-payment-request__actions>*{flex:1 1 auto}}
@media(prefers-contrast:more){.np-payment-request{border-color:#1d1d1f}.np-payment-request__card{border-color:#515154}.np-payment-request__note{color:#1d1d1f}}
@media(forced-colors:active){.np-payment-request,.np-payment-request__card{border:1px solid CanvasText}}

/* Native modal uses showModal() for inert background and focus containment. */
.np-modal-dialog{max-height:min(85dvh,60rem);max-width:calc(100vw - 2rem);overflow:auto;color:#1d1d1f;background:#fff}
.np-modal-dialog::backdrop{background:rgba(0,0,0,.48)}
.np-modal-dialog__header{display:flex;align-items:start;justify-content:space-between;gap:1rem}
.np-modal-dialog__header h2{margin:0;font-size:clamp(1.375rem,3vw,2rem);line-height:1.2}
.np-modal-dialog__dismiss{min-height:44px;min-width:44px;border:1px solid #d2d2d7;border-radius:8px;background:#fff;color:#1d1d1f;font:inherit;cursor:pointer}
.np-modal-dialog__body{padding-block:1.25rem;max-width:68ch;line-height:1.6}
.np-modal-dialog__actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:flex-end}
.np-modal-dialog :where(button,a):focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
.np-chart__provenance{font-size:.875rem;line-height:1.5;color:#515861}
.np-chart summary{min-height:44px;display:list-item;padding-block:.75rem;cursor:pointer;color:#0059b8}
.np-tabs [role=tabpanel]:focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
@media (forced-colors:active){.np-modal-dialog{border:2px solid CanvasText}.np-modal-dialog__dismiss{border-color:CanvasText}.np-modal-dialog::backdrop{background:Canvas}}

/* Local file selection is not a network upload; input is the keyboard alternative. */
.np-file-zone{display:grid;gap:.6rem;border:1px dashed #8a8a91;border-radius:12px;background:#fff;padding:clamp(1rem,3vw,1.75rem);color:#1d1d1f;min-width:0}
.np-file-zone--dragged{border:2px solid #0066cc;background:#f5faff}
.np-file-zone label{font-weight:650}
.np-file-zone input[type=file]{min-height:44px;max-width:100%;font:inherit}
.np-file-zone p{margin:0;line-height:1.5}
.np-file-zone__help{color:#515154}
.np-file-zone input:focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
.np-file-zone input[aria-invalid=true]{outline:2px solid #a8182a}
@media(forced-colors:active){.np-file-zone,.np-file-zone--dragged{border:2px dashed CanvasText;background:Canvas;color:CanvasText}}

/* Read-only controlled documents and tables print as readable A4 content.
   No invoice/payment/approval document is fabricated by these print rules. */
@media print {
  @page { size: A4; margin: 14mm; }
  .np-navigation,.np-skip-link,.np-portal-controls__actions,.np-document-viewer>header a,.np-file-zone,.np-modal-dialog,.np-drawer { display: none !important; }
  .np-document-viewer { border: 0; padding: 0; color: #000; background: #fff; break-inside: auto; }
  .np-document-viewer__content { min-height: 0; border-top: 1px solid #555; padding-top: .5rem; margin-top: 1rem; }
  .np-data-table { font-size: 9pt; border-collapse: collapse; }
  .np-table-scroll { overflow: visible; max-width: none; }
  .np-data-table thead { display: table-header-group; }
  .np-data-table tr { break-inside: avoid; }
  .np-data-table th,.np-data-table td { padding: .35rem .5rem; border-bottom: 1px solid #999; }
  .np-chart { border: 0; padding: 0; }
  .np-chart details { display: block; }
  .np-chart summary { display: none; }
}
`;
