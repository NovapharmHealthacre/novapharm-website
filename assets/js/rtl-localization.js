/* NovaPharm static-estate RTL layout preview. No analytics, network or storage beyond np_locale. */
(function () {
  "use strict";
  var key = "np_locale";
  var cookie = document.cookie.split("; ").find(function (part) { return part.indexOf(key + "=") === 0; });
  var raw = cookie ? cookie.slice(key.length + 1) : "en-GB";
  var locale = raw === "ar" || raw === "he" ? raw : "en-GB";
  var html = document.documentElement;
  html.lang = locale;
  html.dir = locale === "en-GB" ? "ltr" : "rtl";
  html.dataset.npLocaleStatus = locale === "en-GB" ? "en" : "layout-preview";

  var names = {
    ar: {"Company":"الشركة","Capabilities":"القدرات","Distribution":"التوزيع","Oncology":"الأورام","Products":"المنتجات","Intelligence":"نوفافارم إنتليجنس","NovaPharm Intelligence":"نوفافارم إنتليجنس","Insights":"الرؤى","Contact":"اتصل بنا","Secure portal":"البوابة الآمنة","Secure Portal":"البوابة الآمنة","Services":"الخدمات","Technology":"التكنولوجيا","Leadership":"القيادة","Governance":"الحوكمة","Careers":"الوظائف","Privacy":"الخصوصية","Cookies":"ملفات تعريف الارتباط","Terms":"الشروط","Accessibility":"إمكانية الوصول","Trust centre":"مركز الثقة","Open an account":"فتح حساب","Search":"بحث","Cookie settings":"إعدادات ملفات تعريف الارتباط","Menu":"القائمة"},
    he: {"Company":"החברה","Capabilities":"יכולות","Distribution":"הפצה","Oncology":"אונקולוגיה","Products":"מוצרים","Intelligence":"נובאפארם אינטליג'נס","NovaPharm Intelligence":"נובאפארם אינטליג'נס","Insights":"תובנות","Contact":"יצירת קשר","Secure portal":"פורטל מאובטח","Secure Portal":"פורטל מאובטח","Services":"שירותים","Technology":"טכנולוגיה","Leadership":"הנהלה","Governance":"ממשל תאגידי","Careers":"קריירה","Privacy":"פרטיות","Cookies":"קובצי Cookie","Terms":"תנאים","Accessibility":"נגישות","Trust centre":"מרכז אמון","Open an account":"פתיחת חשבון","Search":"חיפוש","Cookie settings":"הגדרות קובצי Cookie","Menu":"תפריט"}
  };

  function init() {
    if (locale !== "en-GB") {
      document.querySelectorAll("main").forEach(function (node) { node.lang = "en-GB"; });
      document.querySelectorAll(".site-footer p").forEach(function (node) { node.lang = "en-GB"; node.dir = "ltr"; });
      document.querySelectorAll(".site-header nav a, .site-footer nav a, .site-footer h3, .site-header .nav-toggle .sr-only, .site-footer [data-cookie-settings]").forEach(function (node) {
        if (node.children.length > 0) return;
        var label = node.textContent.trim();
        if (names[locale][label]) node.textContent = names[locale][label];
      });
    }
    var control = document.createElement("div");
    control.className = "np-locale-control";
    control.dataset.npControlLocale = locale;
    control.setAttribute("data-np-locale-control", "");
    var label = document.createElement("label");
    label.htmlFor = "np-interface-locale";
    label.textContent = locale === "ar" ? "اللغة" : locale === "he" ? "שפה" : "Language";
    var select = document.createElement("select");
    select.id = "np-interface-locale";
    select.setAttribute("aria-label", locale === "ar" ? "معاينة اللغة واتجاه العرض" : locale === "he" ? "תצוגה מקדימה של שפה וכיוון" : "Language and layout preview");
    [["en-GB","English"],["ar","العربية · preview"],["he","עברית · preview"]].forEach(function (item) {
      var option = document.createElement("option");
      option.value = item[0]; option.textContent = item[1]; option.lang = item[0];
      select.appendChild(option);
    });
    select.value = locale;
    select.addEventListener("change", function () {
      var next = select.value;
      var host = location.hostname;
      var domain = host === "novapharmhealthcare.com" || host.endsWith(".novapharmhealthcare.com") ? "; Domain=.novapharmhealthcare.com" : "";
      var secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = key + "=" + next + "; Path=/; Max-Age=31536000; SameSite=Lax" + domain + secure;
      location.reload();
    });
    var note = document.createElement("span");
    note.className = "np-locale-note";
    note.textContent = locale === "ar" ? "تمت ترجمة بعض عناوين التنقل؛ ترجمة المحتوى الكامل قيد الإعداد." : locale === "he" ? "חלק מתוויות הניווט תורגמו; תרגום התוכן המלא עדיין בהכנה." : "Some navigation labels translated; full content translation pending.";
    var selectWrap = document.createElement("span");
    selectWrap.className = "np-locale-select-wrap";
    selectWrap.appendChild(select);
    control.append(label, selectWrap, note);
    var footerSelectors = [".npd-footer-bottom", ".footer-secondary", ".site-footer__bottom", ".footer-base", ".status-footer", ".site-footer", "footer"];
    var footer = footerSelectors.map(function (selector) { return document.querySelector(selector); })
      .find(function (node) { return node && node.getClientRects().length > 0; });
    (footer || document.body).appendChild(control);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}());
