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
    "Language and layout": "اللغة واتجاه العرض",
    "Primary navigation": "التنقل الرئيسي",
    "Mobile navigation": "التنقل عبر الهاتف",
    "Open navigation": "فتح القائمة",
    "Close navigation": "إغلاق القائمة",
    "Menu": "القائمة",
    "Close": "إغلاق",
    "Company": "الشركة",
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
    "Skip to main content": "الانتقال إلى المحتوى الرئيسي",
    "Skip to content": "الانتقال إلى المحتوى",
  },
  he: {
    "Language and layout": "שפה וכיוון תצוגה",
    "Primary navigation": "ניווט ראשי",
    "Mobile navigation": "ניווט בנייד",
    "Open navigation": "פתיחת תפריט",
    "Close navigation": "סגירת תפריט",
    "Menu": "תפריט",
    "Close": "סגירה",
    "Company": "החברה",
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
