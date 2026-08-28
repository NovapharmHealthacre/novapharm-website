import Image from "next/image";
import Link from "next/link";

export function PharmaScopeBrand({ home, tone = "primary" }: Readonly<{ home: string; tone?: "primary" | "reverse" }>) {
  return <Link className="pharmascope-brand" href={home} aria-label="PharmaScope Medicines Intelligence home">
    <Image
      src={`/assets/brand/pharmascope-logo${tone === "reverse" ? "-reverse" : ""}.svg`}
      alt="PharmaScope"
      width={1481}
      height={381}
      priority
    />
  </Link>;
}
