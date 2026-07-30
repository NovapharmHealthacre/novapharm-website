import { Reveal } from "@/components/reveal";

export function PageHero({
  eyebrow,
  title,
  intro,
  index,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  index: string;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero__grid shell">
        <Reveal className="page-hero__meta" immediate>
          <p className="eyebrow">{eyebrow}</p>
          <span>{index}</span>
        </Reveal>
        <Reveal className="page-hero__content" immediate>
          <h1>{title}</h1>
          <p>{intro}</p>
        </Reveal>
      </div>
    </section>
  );
}
