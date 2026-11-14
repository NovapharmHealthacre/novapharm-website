import Image from "next/image";
import Link from "next/link";

/** The approved, already-published NovaPharm Distribution vector is canonical. */
export function DistributionBrand({ home = "/employee/dashboard/" }: Readonly<{ home?: string }>) {
  return <Link className="portal-brand distribution-brand" href={home}
    aria-label="NovaPharm Distribution operations home">
    <Image src="/assets/brand/novapharm-distribution-logo.svg"
      alt="NovaPharm Distribution" width={2307} height={408} priority />
  </Link>;
}
