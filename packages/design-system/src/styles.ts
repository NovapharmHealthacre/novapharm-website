export const designSystemCss = String.raw`
.np-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.np-skip-link{position:fixed;z-index:9999;inset:1rem auto auto 1rem;transform:translateY(-180%);background:#fff;color:#0B0B0E;padding:.75rem 1rem}
.np-skip-link:focus{transform:none}
.np-navigation{min-height:4.5rem;display:grid;grid-template-columns:minmax(12rem,1fr) auto minmax(12rem,1fr);align-items:center;gap:1.5rem;padding:.75rem max(1rem,4vw);border-bottom:1px solid #d8dde4;background:#fbfaf8;color:#0B0B0E}
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
.np-editorial--blue{background:#eaf3f8;color:#0B0B0E}
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
.np-timeline__index{font-variant-numeric:tabular-nums;color:#68101F;font-weight:700}
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
.np-tabs [role=tab][aria-selected=true]{border-color:#9D1B32}
.np-tabs [role=tabpanel]{padding-block:1.5rem}
.np-search input,.np-field input,.np-field select,.np-field textarea,.np-file-upload input{width:100%;max-width:100%;min-height:44px;border:1px solid #98a2b3;border-radius:4px;padding:.7rem .8rem;font:inherit}
/* Search fields: contextual scope, visible clear action, touch targets and resilient focus. */
.np-search__control{display:flex;align-items:center;min-width:0;border:1px solid #98a2b3;border-radius:12px;background:#fff;transition:border-color 160ms ease,box-shadow 160ms ease}
.np-search__control:focus-within{border-color:#0b69ff;box-shadow:0 0 0 3px rgba(11,105,255,.16)}
.np-search__icon{flex:none;margin-inline-start:13px;color:#667085}
.np-search .np-search__control input{min-width:0;min-height:44px;flex:1;width:100%;border:0;border-radius:12px;padding:.65rem .75rem;background:transparent;font:inherit;color:#0B0B0E}
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
.np-button--primary{background:#9D1B32;color:#fff}
.np-button--secondary{background:#fff;color:#0B0B0E;border-color:#667085}
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
.np-payment-request{max-inline-size:38rem;margin-inline:auto;display:grid;gap:1.25rem;padding:clamp(1.25rem,4vw,2.5rem);border:1px solid #d8dde4;border-radius:1.75rem;background:#f5f5f7;color:#0B0B0E;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}
.np-payment-request__header{display:grid;gap:.35rem}
.np-payment-request__eyebrow{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;font-weight:650;color:#68101F;margin:0}
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
@media(prefers-contrast:more){.np-payment-request{border-color:#0B0B0E}.np-payment-request__card{border-color:#515154}.np-payment-request__note{color:#0B0B0E}}
@media(forced-colors:active){.np-payment-request,.np-payment-request__card{border:1px solid CanvasText}}

/* Layout and organization components share the same logical spacing as the web estate. */
.np-hig-box{box-sizing:border-box;inline-size:min(100%,var(--np-hig-box-max,52rem));min-inline-size:0;border:1px solid var(--np-hig-box-border,color-mix(in srgb,currentColor 18%,transparent));border-radius:12px;background:var(--np-hig-box-surface,transparent);padding:clamp(16px,2.5vw,24px)}
.np-hig-box--subtle{--np-hig-box-surface:color-mix(in srgb,currentColor 4%,transparent);--np-hig-box-border:transparent}
.np-hig-box--plain{border-color:transparent;background:transparent;padding:0}
.np-hig-box--wide{--np-hig-box-max:100%}
.np-hig-box__heading{margin:0;font-size:clamp(1rem,1.8vw,1.25rem);line-height:1.3}
.np-hig-box__description{margin:8px 0 0;max-inline-size:68ch;line-height:1.55}
.np-hig-box__content{display:grid;gap:16px;min-inline-size:0;margin-block-start:12px}
.np-hig-box:not(:has(.np-hig-box__heading,.np-hig-box__description))>.np-hig-box__content{margin-block-start:0}
.np-hig-collection{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:clamp(16px,2vw,32px);list-style:none;padding:0;margin:0}
.np-hig-collection>li{min-inline-size:0}
.np-hig-split-view{display:grid;grid-template-columns:minmax(0,min(34%,340px)) minmax(0,1fr);gap:clamp(20px,3vw,48px);align-items:start}
.np-hig-split-view>*{min-inline-size:0}
.np-hig-disclosure>summary{cursor:pointer;display:flex;align-items:center;min-block-size:44px;gap:12px}
.np-hig-disclosure>summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.np-hig-disclosure__content{min-inline-size:0;padding-block:12px 4px}
@media(max-width:760px){.np-hig-split-view{grid-template-columns:minmax(0,1fr)}.np-hig-box{inline-size:100%}}
@media(forced-colors:active){.np-hig-box{border-color:CanvasText}.np-hig-box--plain{border-color:transparent}}

/* Native modal uses showModal() for inert background and focus containment. */
.np-modal-dialog{max-height:min(85dvh,60rem);max-width:calc(100vw - 2rem);overflow:auto;color:#0B0B0E;background:#fff}
.np-modal-dialog::backdrop{background:rgba(0,0,0,.48)}
.np-modal-dialog__header{display:flex;align-items:start;justify-content:space-between;gap:1rem}
.np-modal-dialog__header h2{margin:0;font-size:clamp(1.375rem,3vw,2rem);line-height:1.2}
.np-modal-dialog__dismiss{min-height:44px;min-width:44px;border:1px solid #d2d2d7;border-radius:8px;background:#fff;color:#0B0B0E;font:inherit;cursor:pointer}
.np-modal-dialog__body{padding-block:1.25rem;max-width:68ch;line-height:1.6}
.np-modal-dialog__actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:flex-end}
.np-modal-dialog :where(button,a):focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
.np-chart__provenance{font-size:.875rem;line-height:1.5;color:#515861}
.np-chart summary{min-height:44px;display:list-item;padding-block:.75rem;cursor:pointer;color:#0059b8}
.np-tabs [role=tabpanel]:focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
@media (forced-colors:active){.np-modal-dialog{border:2px solid CanvasText}.np-modal-dialog__dismiss{border-color:CanvasText}.np-modal-dialog::backdrop{background:Canvas}}

/* Local file selection is not a network upload; input is the keyboard alternative. */
.np-file-zone{display:grid;gap:.6rem;border:1px dashed #8a8a91;border-radius:12px;background:#fff;padding:clamp(1rem,3vw,1.75rem);color:#0B0B0E;min-width:0}
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

/* Private document details are a presentation of server-provided permissions only. */
.np-controlled-document{min-width:0;border:1px solid #d8dde4;border-radius:12px;padding:clamp(1rem,3vw,2rem);background:#fff;color:#0B0B0E}
.np-controlled-document__header h2{font-size:clamp(1.1rem,2vw,1.65rem);margin:0 0 1rem}
.np-controlled-document__access{display:grid;gap:.5rem;margin:0 0 1rem}
.np-controlled-document__access>div{display:flex;flex-wrap:wrap;gap:1rem}
.np-controlled-document__access dt{min-width:8rem;font-weight:650}
.np-controlled-document__access dd{margin:0}
.np-controlled-document__content{min-width:0;margin-top:1.5rem}
.np-controlled-document__note{font-size:.875rem;color:#515154;max-width:70ch}
.np-controlled-document a:focus-visible{outline:3px solid #0071e3;outline-offset:3px}
@media(forced-colors:active){.np-controlled-document{border-color:CanvasText}}

/* Notification preferences: only confirmed server revisions count as saved. */
.np-notification-settings{min-width:0;max-width:52rem;padding:clamp(1rem,3vw,2rem);border:1px solid #d8dde4;border-radius:12px;background:#fff;color:#0B0B0E}
.np-notification-settings h2{margin:0 0 .5rem}
.np-notification-settings form{display:grid;gap:1rem}
.np-notification-settings fieldset{border:0;margin:0;padding:0;display:grid;gap:.75rem}
.np-notification-settings legend{font-weight:650;padding-bottom:.75rem}
.np-notification-settings__choice{display:flex;align-items:flex-start;gap:1rem;min-height:44px;padding:.75rem 0;border-bottom:1px solid #e5e5e9}
.np-notification-settings__choice input{width:1.3rem;height:1.3rem;margin:.2rem 0 0;flex:none;accent-color:#68101F}
.np-notification-settings__choice span{display:grid;gap:.25rem;font-size:.95rem}
.np-notification-settings__choice span span{color:#515154}
.np-notification-settings button{min-height:44px;padding:.6rem 1rem;border:0;border-radius:8px;background:#0B0B0E;color:#fff;font:inherit;font-weight:600;justify-self:start}
.np-notification-settings button:disabled{opacity:.55;cursor:not-allowed}
.np-notification-settings :is(input,button):focus-visible{outline:3px solid #0071e3;outline-offset:3px}
@media(forced-colors:active){.np-notification-settings{border-color:CanvasText}.np-notification-settings button:disabled{opacity:1;color:GrayText}}

/* Apple HIG menus/actions web adaptation: restrained, semantic and RTL-safe. */
.np-command-menu{position:relative;display:inline-block;min-inline-size:0;color:#0B0B0E}
.np-command-menu__trigger{display:inline-flex;align-items:center;justify-content:space-between;gap:.7rem;min-block-size:44px;padding:.6rem .85rem;font:inherit;font-weight:550;border:1px solid #d2d2d7;border-radius:9px;background:#fff;color:inherit;cursor:pointer;list-style:none}
.np-command-menu__trigger::-webkit-details-marker{display:none}
.np-command-menu__chevron{display:inline-block;font-size:1.125rem;line-height:1;transform:translateY(-.1rem)}
.np-command-menu[open] .np-command-menu__chevron{transform:rotate(180deg)}
.np-command-menu__items{position:absolute;z-index:100;inset-block-start:calc(100% + 4px);inset-inline-end:0;inline-size:max-content;min-inline-size:min(12rem,calc(100vw - 2rem));max-inline-size:min(22rem,calc(100vw - 2rem));margin:0;padding:.35rem;list-style:none;border:1px solid #d8dde4;border-radius:12px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.12)}
.np-command-menu--start .np-command-menu__items{inset-inline-end:auto;inset-inline-start:0}
.np-command-menu__items>li{margin:0;padding:0}
.np-command-menu__separated{border-block-start:1px solid #e5e5e9;margin-block-start:.35rem!important;padding-block-start:.35rem!important}
.np-command-action{box-sizing:border-box;display:inline-flex;align-items:center;min-block-size:44px;padding:.65rem .8rem;background:transparent;border:0;border-radius:7px;text-align:start;text-decoration:none;color:#0B0B0E;cursor:pointer;font:inherit;line-height:1.3}
.np-command-menu__items .np-command-action{display:flex;inline-size:100%;white-space:normal;overflow-wrap:anywhere}
.np-command-action:hover:not(:disabled){background:#f5f5f7}
.np-command-action:active:not(:disabled){background:#e8e8ed}
.np-command-action--destructive{color:#a8182a}
.np-command-action:disabled{color:#73737b;cursor:not-allowed;opacity:1}
.np-command-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;min-inline-size:0}
.np-command-toolbar__leading{flex:1 1 auto;min-inline-size:0}
.np-command-toolbar__actions{display:flex;align-items:center;flex-wrap:wrap;gap:.35rem;min-inline-size:0}
.np-command-toolbar__direct{font-weight:600}
.np-choice-picker{display:grid;gap:.35rem;max-inline-size:100%;color:inherit}
.np-choice-picker label{font-size:.875rem;font-weight:600}
.np-choice-picker select{min-block-size:44px;padding:.5rem .75rem;max-inline-size:100%;font:inherit;border:1px solid #a8a8ae;border-radius:8px;background:Canvas;color:CanvasText}
.np-binary-toggle{display:inline-flex;align-items:center;gap:.75rem;min-block-size:44px;cursor:pointer}
.np-binary-toggle input{flex:none;inline-size:1.25rem;block-size:1.25rem;accent-color:#68101F}
.np-binary-toggle:has(input:disabled){opacity:.65;cursor:not-allowed}
.np-share-link{display:inline-flex;align-items:center;flex-wrap:wrap;gap:.5rem}
.np-share-link__status{font-size:.875rem;color:#515154}
.np-command-menu__trigger:focus-visible,.np-command-action:focus-visible,.np-choice-picker select:focus-visible,.np-binary-toggle input:focus-visible{outline:3px solid #0b69ff;outline-offset:3px}
@media(max-width:480px){.np-command-toolbar__actions{inline-size:100%}.np-command-menu__items{max-inline-size:calc(100vw - 2rem)}}
@media(forced-colors:active){.np-command-menu__trigger,.np-command-menu__items,.np-choice-picker select{border-color:CanvasText;box-shadow:none}.np-command-action--destructive{color:LinkText}.np-command-action:disabled{color:GrayText}.np-command-action:hover:not(:disabled){outline:1px solid Highlight}}
@media(prefers-reduced-motion:reduce){.np-command-menu__chevron{transition:none}}

/* Native-radio segmented choices: one state, equal targets, calm hierarchy. */
.np-segmented-choice{border:0;margin:0;padding:0;min-inline-size:0;max-inline-size:100%}
.np-segmented-choice__track{display:flex;flex-wrap:wrap;gap:3px;padding:3px;background:#f1f1f3;border:1px solid #dfdfe3;border-radius:10px}
.np-segmented-choice__option{position:relative;display:flex;flex:1 1 5rem;min-inline-size:0;cursor:pointer}
.np-segmented-choice__option input{position:absolute;inset:0;inline-size:100%;block-size:100%;margin:0;opacity:0;cursor:inherit}
.np-segmented-choice__option span{display:flex;align-items:center;justify-content:center;inline-size:100%;min-block-size:44px;padding:.5rem .85rem;border-radius:7px;font-size:.875rem;color:#515154;white-space:normal;text-align:center}
.np-segmented-choice__option:has(input:checked) span{background:#fff;color:#0B0B0E;box-shadow:0 1px 4px rgba(0,0,0,.1);font-weight:650}
.np-segmented-choice__option:has(input:focus-visible) span{outline:3px solid #0b69ff;outline-offset:2px}
.np-segmented-choice__option:has(input:disabled){cursor:not-allowed}
.np-segmented-choice__option:has(input:disabled) span{opacity:.6}
@media(forced-colors:active){.np-segmented-choice__track{background:Canvas;border-color:CanvasText}.np-segmented-choice__option:has(input:checked) span{background:Highlight;color:HighlightText;box-shadow:none}.np-segmented-choice__option:has(input:focus-visible) span{outline-color:Highlight}}
`;
