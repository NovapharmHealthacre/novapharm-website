import Image from "next/image";
import Link from "next/link";

/** Owner-verified Distribution wordmark; publication requires the separate branding release gate. */
export function DistributionBrand({ home = "/employee/dashboard/" }: Readonly<{ home?: string }>) {
  return <Link className="portal-brand distribution-brand" href={home}
    aria-label="NovaPharm Distribution operations home">
    <Image src="/assets/brand/novapharm-distribution-logo.svg"
      alt="NovaPharm Distribution" width={2048} height={222} priority />
  </Link>;
}
