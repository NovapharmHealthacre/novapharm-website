"use client";

import type { ChangeEvent } from "react";
import { directionForLocale, interfaceLabel, interfaceLocaleCookie, resolveInterfaceLocale, type InterfaceLocale } from "../core/interface-locale";

type Props = Readonly<{ locale: InterfaceLocale }>;

/**
 * Explicitly identified as a layout preview until substantive translations
 * (including clinical, legal and commercial copy) pass native-language review.
 * This is a functional preference independent of cookie-consent analytics.
 */
export function InterfaceLocaleSwitcher({ locale }: Props) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = resolveInterfaceLocale(event.currentTarget.value);
    const host = window.location.hostname;
    const domain = host === "novapharmhealthcare.com" || host.endsWith(".novapharmhealthcare.com")
      ? "; Domain=.novapharmhealthcare.com"
      : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${interfaceLocaleCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
    window.location.reload();
  }

  return (
    <div className="np-locale-control" data-np-locale-control data-np-control-locale={locale} lang={locale} dir={directionForLocale(locale)}>
      <label htmlFor="np-interface-locale">{interfaceLabel(locale, "Language")}</label>
      <span className="np-locale-select-wrap">
        <select id="np-interface-locale" aria-label={interfaceLabel(locale, "Language and layout preview")} value={locale} onChange={onChange}>
          <option value="en-GB" lang="en-GB">English</option>
          <option value="ar" lang="ar">العربية · preview</option>
          <option value="he" lang="he">עברית · preview</option>
        </select>
      </span>
      <span className="np-locale-note">{interfaceLabel(locale, "Some navigation labels translated; full content translation pending.")}</span>
    </div>
  );
}
