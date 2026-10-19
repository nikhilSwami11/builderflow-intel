import { Cites } from "@/components/cite";
import { IdeaTag } from "@/components/idea-tag";
import { PageTitle } from "@/components/page-title";
import { PainExplorer, type ThemeGroup } from "@/components/pain-explorer";
import { Section } from "@/components/section";
import { bundle, THEME_LABEL } from "@/lib/data";
import { ideaForPain, ideaForTrend, newsQuestion, painQuestion } from "@/lib/ideas";
import type { PainPoint, Trend } from "@/lib/types";

const COLORS = ["#0a0a0a", "#1a56c4", "#1b7a45", "#a65b00", "#b4234f", "#6b34c9", "#0e7c7b", "#b84a1c", "#8a6d00", "#7a7a7a", "#c4c4c4"];

function host(ref: string) {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref;
  }
}

function NewsCard({ t }: { t: Trend }) {
  const idea = ideaForTrend(t);
  const h = host(t.citation.ref);
  const hasTitle = Boolean(t.title);
  const headline = t.title?.split(" | ")[0] ?? t.description;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-sheet transition-colors duration-150 hover:border-rule-strong">
      {t.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.image} alt="" className="aspect-[16/9] w-full border-b border-rule object-cover" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-text-2">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-accent-wash text-[10px] font-semibold text-text">{h[0].toUpperCase()}</span>
          {h}
        </p>
        <a href={t.citation.ref} target="_blank" rel="noreferrer" className={`mt-2 text-[15px] leading-snug font-semibold tracking-tight after:absolute after:inset-0 ${hasTitle ? "" : "line-clamp-4"}`}>
          {headline}
        </a>
        {hasTitle && <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-text-2">{t.description}</p>}
        {idea && (
          <div className="relative z-10 mt-auto pt-3">
            <IdeaTag href={`/advisor/${idea.id}`} title={idea.title} question={newsQuestion(headline, t.description, h, idea)} />
          </div>
        )}
      </div>
    </article>
  );
}

export default function PainPoints() {
  const { painPoints, trends, reviewSnippets } = bundle;

  const byTheme = painPoints.reduce<Record<string, PainPoint[]>>((acc, p) => {
    (acc[p.theme] ??= []).push(p);
    return acc;
  }, {});
  const groups: ThemeGroup[] = Object.entries(byTheme)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([theme, points], i) => ({
      theme,
      label: THEME_LABEL[theme as keyof typeof THEME_LABEL],
      color: COLORS[i % COLORS.length],
      points: points.map((p) => {
        const idea = ideaForPain(p);
        return { id: p.id, description: p.description, companies: p.companies, citation: p.citation, idea, question: idea ? painQuestion(p, idea) : null };
      }),
    }));

  // Two trends can come from one article; show each article once.
  const news = trends.filter((t, i) => trends.findIndex((x) => x.citation.ref === t.citation.ref) === i);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Pain Points & Market" />

      <Section title="What contractors complain about">
        <PainExplorer groups={groups} />
      </Section>

      <section aria-labelledby="news">
        <h2 id="news" className="mb-3 text-[15px] font-semibold tracking-tight">
          Market news
        </h2>
        <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {news.map((t) => (
            <NewsCard key={t.id} t={t} />
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-rule bg-sheet px-5 py-4">
        <summary className="cursor-pointer text-[14px] font-medium">Review excerpts ({reviewSnippets.length})</summary>
        <ul className="mt-3 divide-y divide-rule">
          {reviewSnippets.map((r, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-[13px] text-text-2">
              <span>{r.note ?? r.ref}</span>
              <Cites citations={[r]} label={false} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
