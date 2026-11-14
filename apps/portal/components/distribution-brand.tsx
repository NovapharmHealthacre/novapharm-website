import Image from "next/image";
import Link from "next/link";

/**
 * First-party NovaPharm Distribution identity.
 * Uses the approved, outlined logo artwork supplied by the owner.
 * Keeps the parent company's brand and customer portal distinct.
 */
export function DistributionBrand({ home = "/employee/dashboard/", tone = "primary" }: Readonly<{
  home?: string;
  tone?: "primary" | "reverse";
}>) {
  const logo = tone === "reverse"
    ? "/assets/brand/novapharm-distribution-reverse.svg"
    : "/assets/brand/novapharm-distribution.svg";

  return <Link className="portal-brand distribution-brand" href={home}
    aria-label="NovaPharm Distribution operations home">
    <Image src={logo} alt="NovaPharm Distribution"
      width={2307} height={408} priority />
  </Link>;
}
