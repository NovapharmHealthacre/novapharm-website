import Image from "next/image";
import Link from "next/link";

export function Brand({ footer = false }: { readonly footer?: boolean }) {
  return (
    <Link className={footer ? "brand brand-footer" : "brand"} href="/" aria-label="NovaPharm Healthcare home">
      <Image
        src="/assets/brand/novapharm-healthcare-logo.svg"
        alt="NovaPharm Healthcare"
        width={2048}
        height={258}
        priority={!footer}
        unoptimized
      />
    </Link>
  );
}
