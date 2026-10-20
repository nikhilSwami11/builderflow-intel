import { AdvisorBoard, type BoardCard } from "@/components/advisor-board";
import { IdeaCard } from "@/components/idea-card";
import { PageTitle } from "@/components/page-title";
import { bundle, THEME_LABEL } from "@/lib/data";
import { discussQuestion, evidenceFor, themeFor } from "@/lib/evidence";
import { STRENGTH_LABEL, strengthFor, type Strength } from "@/lib/strength";
import { StrengthChip } from "@/components/strength";
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

const firstSentence = (t: string) =>
  (t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t).trim();

export default function Advisor() {
  const cards: (BoardCard & { support: number })[] = bundle.recommendations.map(
    (r) => {
      const ev = evidenceFor(r);
      const theme = themeFor(ev);
      const st = strengthFor(r, ev);
      return {
        id: r.id,
        title: r.title,
        summary: firstSentence(r.detail),
        question: discussQuestion(r),
        counts: {
          pains: ev.pains.length,
          gaps: ev.gaps.length,
          pricing: ev.pricing.length,
          messaging: ev.messaging.length,
        },
        theme,
        themeLabel: theme ? THEME_LABEL[theme] : null,
        column: COLUMN_OF[r.category],
        support: st.score,
        strength: st.level,
        competitors: st.competitors,
        news: st.news,
      };
    },
  );

  const board = [...cards].sort((a, b) => b.support - a.support);
  const best = board.slice(0, 3);
  const levels: Strength[] = ["strong", "promising", "early"];
  const count = (l: Strength) => cards.filter((c) => c.strength === l).length;
  const BAR: Record<Strength, string> = {
    strong: "bg-green",
    promising: "bg-[#f0a500]",
    early: "bg-stone",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Growth Advisor" />

      <section
        aria-label="Evidence strength overview"
        className="rounded-xl border border-rule bg-sheet p-4"
      >
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-accent-wash"
          role="img"
          aria-label={levels
            .map((l) => `${count(l)} ${STRENGTH_LABEL[l]}`)
            .join(", ")}
        >
          {levels.map((l) => (
            <span
              key={l}
              className={BAR[l]}
              style={{ width: `${(count(l) / cards.length) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="font-semibold tnum">{cards.length} ideas</span>
          {levels.map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-2 text-text-2"
            >
              <StrengthChip level={l} />{" "}
              <span className="tnum">{count(l)}</span>
            </span>
          ))}
          <span className="text-[12px] text-text-2">
            Strength is how much of our data backs an idea, not a forecast of
            business impact.
          </span>
        </div>
      </section>

      <section aria-labelledby="best">
        <h2 id="best" className="mb-3 text-[15px] font-semibold tracking-tight">
          Top picks
        </h2>
        <div className="grid items-start gap-4 md:grid-cols-3">
          {best.map((c) => (
            <IdeaCard key={c.id} card={c} hero />
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
