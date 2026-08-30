import Image from "next/image";
import Link from "next/link";

export function PortalBrand({ home = "/" }: Readonly<{ home?: string }>) {
  return <Link className="portal-brand" href={home} aria-label="NovaPharm Healthcare secure portal home">
    <Image src="/assets/brand/novapharm-healthcare-logo.svg" alt="NovaPharm Healthcare" width={2048} height={258} priority />
  </Link>;
}
