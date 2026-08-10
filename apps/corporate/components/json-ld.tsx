import { headers } from "next/headers";

export async function JsonLd({ id, value }: { readonly id: string; readonly value: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script id={id} nonce={nonce} type="application/ld+json">{JSON.stringify(value).replaceAll("<", "\\u003c")}</script>;
}
