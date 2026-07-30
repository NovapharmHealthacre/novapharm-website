import { headers } from "next/headers";
import { type JsonLd, jsonLdText } from "@/lib/seo";

export async function JsonLdScript({ data }: { readonly data: JsonLd }): Promise<React.JSX.Element> {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script nonce={nonce} type="application/ld+json">
      {jsonLdText(data)}
    </script>
  );
}
