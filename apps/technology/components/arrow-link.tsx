import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";

export function ArrowLink({
  href,
  children,
  external = false,
  className = "",
}: {
  href: Route | string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}) {
  const classes = `arrow-link ${className}`.trim();
  if (external) {
    return (
      <a className={classes} href={String(href)} target="_blank" rel="noreferrer">
        <span>{children}</span>
        <ArrowUpRight />
      </a>
    );
  }

  return (
    <Link className={classes} href={href as Route}>
      <span>{children}</span>
      <ArrowRight />
    </Link>
  );
}
