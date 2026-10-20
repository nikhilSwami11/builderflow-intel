import { Cites } from "@/components/cite";
import { NewsFeed } from "@/components/news-feed";
import { PageTitle } from "@/components/page-title";
import { PainExplorer, type ThemeGroup } from "@/components/pain-explorer";
import { Section } from "@/components/section";
import { bundle, THEME_LABEL } from "@/lib/data";
import { ideaForPain, painQuestion } from "@/lib/ideas";
import type { PainPoint } from "@/lib/types";

const COLORS = [
  "#0a0a0a",
  "#1a56c4",
  "#1b7a45",
  "#a65b00",
  "#b4234f",
  "#6b34c9",
  "#0e7c7b",
  "#b84a1c",
  "#8a6d00",
  "#7a7a7a",
  "#c4c4c4",
];

export default function PainPoints() {
  const { painPoints, reviewSnippets } = bundle;

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
        return {
          id: p.id,
          description: p.description,
          companies: p.companies,
          citation: p.citation,
          idea,
          question: idea ? painQuestion(p, idea) : null,
        };
      }),
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Pain Points & Market" />

      <Section title="What contractors complain about">
        <PainExplorer groups={groups} />
      </Section>

      <NewsFeed items={bundle.news} />

      <details className="rounded-xl border border-rule bg-sheet px-5 py-4">
        <summary className="cursor-pointer text-[14px] font-medium">
          Review excerpts ({reviewSnippets.length})
        </summary>
        <ul className="mt-3 divide-y divide-rule">
          {reviewSnippets.map((r, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-3 py-2.5 text-[13px] text-text-2"
            >
              <span>{r.note ?? r.ref}</span>
              <Cites citations={[r]} label={false} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
