import { AdvisorBoard, type BoardCard } from "@/components/advisor-board";
import { IdeaCard } from "@/components/idea-card";
import { PageTitle } from "@/components/page-title";
import { bundle, THEME_LABEL } from "@/lib/data";
import { discussQuestion, evidenceFor, themeFor } from "@/lib/evidence";
import type { Category } from "@/lib/types";

const COLUMNS = [
  { key: "now", label: "Do now" },
  { key: "build", label: "Build next" },
  { key: "position", label: "Reposition & reprice" },
  { key: "double", label: "Double down" },
];
const COLUMN_OF: Record<Category, string> = {
  quick_win: "now",
  build: "build",
  positioning: "position",
  pricing: "position",
  double_down: "double",
};

const firstSentence = (t: string) => (t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t).trim();

export default function Advisor() {
  const cards: (BoardCard & { support: number })[] = bundle.recommendations.map((r) => {
    const ev = evidenceFor(r);
    const theme = themeFor(ev);
    return {
      id: r.id,
      title: r.title,
      summary: firstSentence(r.detail),
      question: discussQuestion(r),
      counts: { pains: ev.pains.length, gaps: ev.gaps.length, pricing: ev.pricing.length, messaging: ev.messaging.length },
      theme,
      themeLabel: theme ? THEME_LABEL[theme] : null,
      column: COLUMN_OF[r.category],
      support: ev.support,
    };
  });

  const best = [...cards].sort((a, b) => b.support - a.support).slice(0, 4);
  const board = [...cards].sort((a, b) => b.support - a.support);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Growth Advisor" />

      <section aria-labelledby="best">
        <h2 id="best" className="text-[15px] font-semibold tracking-tight">
          Best supported
        </h2>
        <p className="mt-0.5 mb-3 text-[13px] text-text-2">Ranked by how much relevant evidence backs each idea, not by business impact.</p>
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {best.map((c) => (
            <IdeaCard key={c.id} card={c} />
          ))}
        </div>
      </section>

      <section aria-labelledby="all">
        <h2 id="all" className="mb-3 text-[15px] font-semibold tracking-tight">
          All {cards.length} ideas
        </h2>
        <AdvisorBoard cards={board} columns={COLUMNS} />
      </section>
    </div>
  );
}
