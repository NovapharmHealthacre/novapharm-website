import Image from "next/image";
import Link from "next/link";

export function PortalBrand({ home = "/", tone = "primary" }: Readonly<{ home?: string; tone?: "primary" | "reverse" }>) {
  return <Link className="portal-brand" href={home} aria-label="NovaPharm Healthcare secure portal home">
    <Image src={`/assets/brand/novapharm-healthcare-logo${tone === "reverse" ? "-reverse" : ""}.svg`} alt="NovaPharm Healthcare" width={2048} height={258} priority />
  </Link>;
}
