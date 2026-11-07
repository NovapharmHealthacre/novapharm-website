import destinations from "../data/nutraxin-uk-links.json";

export function NutraxinKnowMore({ slug, name }: { readonly slug: string; readonly name: string }) {
  const href = destinations.products[slug as keyof typeof destinations.products];
  if (href === undefined) throw new Error(`Unverified Nutraxin UK destination: ${slug}`);
  if (href === null) return <span className="nutraxin-know-more nutraxin-link-publisher">Nutraxin UK product detail temporarily unavailable. Product claims require separate verification.</span>;
  return <a className="text-link nutraxin-know-more" href={href} aria-label={`Know more about ${name} on Nutraxin UK`} rel="external noreferrer">Know more<span className="nutraxin-link-publisher">Nutraxin UK</span></a>;
}
