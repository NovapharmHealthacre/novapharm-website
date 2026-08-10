import { headers } from "next/headers";
import { type JsonLdValue, jsonLdText } from "@/lib/seo";

export async function JsonLd({ id, value }: { id: string; value: JsonLdValue }): Promise<React.JSX.Element> {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script id={id} nonce={nonce} type="application/ld+json">
      {jsonLdText(value)}
    </script>
  );
}
