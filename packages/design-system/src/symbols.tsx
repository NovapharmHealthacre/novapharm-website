import React from "react";
import type { ReactNode, SVGProps } from "react";

/**
 * Original, web-safe functional symbols. Geometry is independently authored:
 * no SF Symbols artwork, Apple fonts, or glyph exports are embedded here.
 */
export type NovaSymbolName =
  | "search" | "menu" | "close" | "basket" | "chevron-right"
  | "check-circle" | "alert-circle" | "refresh" | "user"
  | "download" | "external-link" | "sign-out";

export type NovaSymbolProps = Omit<SVGProps<SVGSVGElement>, "children" | "name" | "aria-label" | "aria-hidden" | "role"> & Readonly<{
  name: NovaSymbolName;
  /** Label only when the symbol itself carries meaning; use text labels on buttons. */
  label?: string;
  scale?: "small" | "medium" | "large";
  weight?: "light" | "regular" | "strong";
  tone?: "neutral" | "accent" | "positive" | "warning" | "critical";
  variant?: "outline" | "filled";
}>;

const artwork: Readonly<Record<NovaSymbolName, ReactNode>> = {
  search: <><circle cx="10.6" cy="10.6" r="6.7" /><path d="m15.7 15.7 4.5 4.5" /></>,
  menu: <><path d="M4.5 7h15M4.5 12h15M4.5 17h15" /></>,
  close: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  basket: <><path d="M4 9.3h16l-1.5 10.1H5.5L4 9.3Z" /><path d="m8.3 9.3 3.7-5 3.7 5M9 12.5v4.1m6-4.1v4.1" /></>,
  "chevron-right": <path d="m9 4.5 7 7.5-7 7.5" />,
  "check-circle": <><circle data-symbol-enclosure cx="12" cy="12" r="8.5" /><path data-symbol-center d="m8.1 12.2 2.7 2.8 5.3-6" /></>,
  "alert-circle": <><circle data-symbol-enclosure cx="12" cy="12" r="8.5" /><path data-symbol-center d="M12 7.4v6.1M12 17.2h.01" /></>,
  refresh: <><path d="M19.6 10a7.8 7.8 0 0 0-13.4-3.4L4.5 8.3" /><path d="M4.5 4.7v3.6h3.6" /><path d="M4.4 14a7.8 7.8 0 0 0 13.4 3.4l1.7-1.7" /><path d="M19.5 19.3v-3.6h-3.6" /></>,
  user: <><circle cx="12" cy="8.1" r="3.2" /><path d="M5.5 20v-1.4c0-3.1 2.5-5 6.5-5s6.5 1.9 6.5 5V20" /></>,
  download: <><path d="M12 3.8v11.8m-4.2-4.2 4.2 4.2 4.2-4.2" /><path d="M5 17.6v2.5h14v-2.5" /></>,
  "external-link": <><path d="M13.3 5h5.7v5.7M19 5l-9 9" /><path d="M18.7 14.4v4.3H5.3V5.3h4.3" /></>,
  "sign-out": <><path d="M10.2 4.8H5.3v14.4h4.9" /><path d="M12 12h7.1m-3.3-3.3 3.3 3.3-3.3 3.3" /></>,
};

export function NovaSymbol({
  name,
  label,
  className,
  scale = "medium",
  weight = "regular",
  tone = "neutral",
  variant = "outline",
  ...svgProps
}: NovaSymbolProps) {
  return <svg
    {...svgProps}
    className={["np-symbol", className].filter(Boolean).join(" ")}
    viewBox="0 0 24 24"
    data-scale={scale}
    data-weight={weight}
    data-tone={tone}
    data-variant={variant}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? "img" : undefined}
    focusable="false"
  >
    {artwork[name]}
  </svg>;
}
