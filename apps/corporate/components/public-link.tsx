"use client";

import type { Route } from "next";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type PublicLinkProps = Omit<ComponentProps<"a">, "href"> & { readonly href: string };

export default function PublicLink({ href, ...props }: PublicLinkProps) {
  if (process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET === "github-pages") {
    // A complete document load retains each exported page's own CSP and metadata.
    return <a href={href} {...props} />;
  }
  return <NextLink href={href as Route} {...props} />;
}
