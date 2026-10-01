import assert from "node:assert/strict";
import { test } from "node:test";
import PublicLink from "../components/public-link";

test("public export uses a complete document link and preserves accessible attributes", () => {
  const original = process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET;
  try {
    process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET = "github-pages";
    const link = PublicLink({ href: "/products/nutraxin/", "aria-label": "Nutraxin catalogue", children: "Catalogue" });
    assert.equal(link.type, "a");
    assert.equal(link.props.href, "/products/nutraxin/");
    assert.equal(link.props["aria-label"], "Nutraxin catalogue");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET;
    else process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET = original;
  }
});

test("managed application retains the Next.js link implementation", () => {
  const original = process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET;
  try {
    delete process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET;
    const link = PublicLink({ href: "/contact/", children: "Contact" });
    assert.notEqual(link.type, "a");
    assert.equal(link.props.href, "/contact/");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET;
    else process.env.NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET = original;
  }
});
