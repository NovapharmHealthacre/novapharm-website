import Image from "next/image";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand${inverse ? " brand--inverse" : ""}`} href="/" aria-label="Novapharm Innovation Technology home">
      {/* The official repository SVG is used unchanged. No filter, recolour, redraw, or typographic reconstruction. */}
      <Image src="/assets/NIT-logo.svg" alt="Novapharm Innovation Technology" width={420} height={38} priority />
    </Link>
  );
}
