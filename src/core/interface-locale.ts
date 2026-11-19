/**
 * NovaPharm web internationalisation boundary.
 * HTML direction is not a translation: untranslated editorial/regulated copy
 * must retain lang="en-GB" until reviewed Arabic/Hebrew copy is published.
 */
export type InterfaceLocale = "en-GB" | "ar" | "he";
export type InterfaceDirection = "ltr" | "rtl";

export const interfaceLocaleCookie = "np_locale";
export const supportedLocales: readonly InterfaceLocale[] = ["en-GB", "ar", "he"];

export function resolveInterfaceLocale(raw: string | null | undefined): InterfaceLocale {
  if (raw === "ar" || raw === "he") return raw;
  return "en-GB";
}

export function directionForLocale(locale: InterfaceLocale): InterfaceDirection {
  return locale === "en-GB" ? "ltr" : "rtl";
}

// Only navigation and common controls have reviewed draft translations here.
// Pharmaceutical, legal, privacy and clinical content remains in English
// until professionally reviewed translations are available.
const labels: Readonly<Record<InterfaceLocale, Readonly<Record<string, string>>>> = {
  "en-GB": {},
  ar: {
    "Language": "اللغة",
    "Language and layout": "اللغة واتجاه العرض",
    "Language / RTL layout preview": "اللغة / معاينة العرض من اليمين إلى اليسار",
    "Language and layout preview": "معاينة اللغة واتجاه العرض",
    "Some navigation labels translated; full content translation pending.": "تمت ترجمة بعض عناوين التنقل؛ ترجمة المحتوى الكامل قيد الإعداد.",
    "Primary navigation": "التنقل الرئيسي",
    "Mobile navigation": "التنقل عبر الهاتف",
    "Open navigation": "فتح القائمة",
    "Close navigation": "إغلاق القائمة",
    "Menu": "القائمة",
    "Close": "إغلاق",
    "Company": "الشركة",
    "Company links": "روابط الشركة",
    "Capability links": "روابط القدرات",
    "Legal links": "روابط قانونية",
    "Footer navigation": "روابط التذييل",
    "CRO support": "دعم الأبحاث السريرية",
    "Capabilities": "القدرات",
    "Distribution": "التوزيع",
    "Oncology": "الأورام",
    "Products": "المنتجات",
    "NovaPharm Intelligence": "نوفافارم إنتليجنس",
    "Insights": "الرؤى",
    "Contact": "اتصل بنا",
    "Secure Portal": "البوابة الآمنة",
    "Secure portal": "البوابة الآمنة",
    "Services": "الخدمات",
    "Regulatory": "الشؤون التنظيمية",
    "Technology": "التكنولوجيا",
    "Leadership": "القيادة",
    "Governance": "الحوكمة",
    "Careers": "الوظائف",
    "Legal": "الشؤون القانونية",
    "Privacy": "الخصوصية",
    "Cookies": "ملفات تعريف الارتباط",
    "Terms": "الشروط",
    "Accessibility": "إمكانية الوصول",
    "Trust centre": "مركز الثقة",
    "Cookie settings": "إعدادات ملفات تعريف الارتباط",
    "Search": "بحث",
    "Open an account": "فتح حساب",
    "About": "نبذة عنا",
    "Investors": "المستثمرون",
    "Partners": "الشركاء",
    "Connect": "تواصل",
    "Refresh": "تحديث",
    "Service status": "حالة الخدمات",
    "Expertise": "الخبرات",
    "Sectors": "القطاعات",
    "How we work": "طريقة عملنا",
    "Start a conversation": "ابدأ محادثة",
    "Bring us the decision": "شاركنا القرار",
    "Ventures": "المشاريع",
    "Thinking": "أفكار",
    "Media": "الإعلام",
    "Portrait": "الصور",
    "Profile": "الملف الشخصي",
    "Ask Vishal’s Work": "اسأل عن أعمال فيشال",
    "Skip to main content": "الانتقال إلى المحتوى الرئيسي",
    "Skip to content": "الانتقال إلى المحتوى",
  },
  he: {
    "Language": "שפה",
    "Language and layout": "שפה וכיוון תצוגה",
    "Language / RTL layout preview": "שפה / תצוגה מקדימה מימין לשמאל",
    "Language and layout preview": "תצוגה מקדימה של שפה וכיוון",
    "Some navigation labels translated; full content translation pending.": "חלק מתוויות הניווט תורגמו; תרגום התוכן המלא עדיין בהכנה.",
    "Primary navigation": "ניווט ראשי",
    "Mobile navigation": "ניווט בנייד",
    "Open navigation": "פתיחת תפריט",
    "Close navigation": "סגירת תפריט",
    "Menu": "תפריט",
    "Close": "סגירה",
    "Company": "החברה",
    "Company links": "קישורי החברה",
    "Capability links": "קישורי תחומי פעילות",
    "Legal links": "קישורים משפטיים",
    "Footer navigation": "ניווט בתחתית האתר",
    "CRO support": "תמיכה במחקר קליני",
    "Capabilities": "יכולות",
    "Distribution": "הפצה",
    "Oncology": "אונקולוגיה",
    "Products": "מוצרים",
    "NovaPharm Intelligence": "נובאפארם אינטליג'נס",
    "Insights": "תובנות",
    "Contact": "יצירת קשר",
    "Secure Portal": "פורטל מאובטח",
    "Secure portal": "פורטל מאובטח",
    "Services": "שירותים",
    "Regulatory": "רגולציה",
    "Technology": "טכנולוגיה",
    "Leadership": "הנהלה",
    "Governance": "ממשל תאגידי",
    "Careers": "קריירה",
    "Legal": "מידע משפטי",
    "Privacy": "פרטיות",
    "Cookies": "קובצי Cookie",
    "Terms": "תנאים",
    "Accessibility": "נגישות",
    "Trust centre": "מרכז אמון",
    "Cookie settings": "הגדרות קובצי Cookie",
    "Search": "חיפוש",
    "Open an account": "פתיחת חשבון",
    "About": "אודות",
    "Investors": "משקיעים",
    "Partners": "שותפים",
    "Connect": "צרו קשר",
    "Refresh": "רענון",
    "Service status": "מצב השירותים",
    "Expertise": "מומחיות",
    "Sectors": "מגזרים",
    "How we work": "איך אנחנו עובדים",
    "Start a conversation": "התחילו שיחה",
    "Bring us the decision": "הציגו לנו את ההחלטה",
    "Ventures": "מיזמים",
    "Thinking": "מחשבות",
    "Media": "תקשורת",
    "Portrait": "תמונות",
    "Profile": "פרופיל",
    "Ask Vishal’s Work": "שאלו על עבודתו של וישאל",
    "Skip to main content": "דילוג לתוכן הראשי",
    "Skip to content": "דילוג לתוכן",
  },
};

export function interfaceLabel(locale: InterfaceLocale, english: string): string {
  return labels[locale][english] ?? english;
}

export function formatInterfaceNumber(value: number, locale: InterfaceLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatInterfaceDate(value: Date, locale: InterfaceLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
}
