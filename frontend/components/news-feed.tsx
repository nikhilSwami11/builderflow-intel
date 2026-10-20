"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { DiscussButton } from "@/components/idea-tag";
import type { NewsItem } from "@/lib/types";

const DAY = 86_400_000;
const RANGES = [
  { key: "24h", label: "Last 24 hours", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "1m", label: "1 month", days: 31 },
  { key: "6m", label: "6 months", days: 183 },
  { key: "1y", label: "1 year", days: 366 },
] as const;

const FEEDS = [
  { key: "industry", label: "Industry" },
  { key: "ai", label: "AI news" },
] as const;

function ago(iso: string | null, now: number | null): string {
  if (!iso) return "";
  if (now === null)
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const hours = Math.max(0, (now - Date.parse(iso)) / 3_600_000);
  if (hours < 24) return hours < 1 ? "Just now" : `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function question(n: NewsItem): string {
  return n.builderflowUse
    ? `AI news from ${n.host}: "${n.title}". ${n.summary} Suggested use: ${n.builderflowUse} Is this worth building, and how would we start?`
    : `Market news from ${n.host}: "${n.title}". ${n.summary} How should Builderflow respond?`;
}

function Card({ n, now }: { n: NewsItem; now: number | null }) {
  const headline = n.title.split(" | ")[0];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-sheet transition-colors duration-150 hover:border-rule-strong">
      {n.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.image}
          alt=""
          className="aspect-[16/9] w-full border-b border-rule object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-[12px] text-text-2">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-accent-wash text-[10px] font-semibold text-text">
            {n.host[0].toUpperCase()}
          </span>
          {n.host}
          {n.published && (
            <span className="tnum ml-auto">{ago(n.published, now)}</span>
          )}
        </p>
        <a
          href={n.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 line-clamp-3 text-[15px] leading-snug font-semibold tracking-tight after:absolute after:inset-0"
        >
          {headline}
        </a>
        <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-text-2">
          {n.summary}
        </p>
        {n.builderflowUse && (
          <div className="mt-3 flex gap-2 rounded-md border border-[#f0d68a] bg-[#fff8e1] px-2.5 py-2">
            <Lightbulb
              size={14}
              aria-hidden
              className="mt-0.5 shrink-0 text-[#c98a00]"
            />
            <p className="text-[12.5px] leading-snug">{n.builderflowUse}</p>
          </div>
        )}
        <div className="relative z-10 mt-auto pt-3">
          <DiscussButton question={question(n)} />
        </div>
      </div>
    </article>
  );
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [feed, setFeed] = useState<(typeof FEEDS)[number]["key"]>("industry");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1y");
  const [now, setNow] = useState<number | null>(null);
  // The clock is read after mount so the server-rendered page and the first client render agree.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(Date.now()), []);

  const inFeed = items.filter((n) => n.feed === feed);
  const within = (days: number) =>
    inFeed.filter(
      (n) =>
        n.published &&
        (now === null || now - Date.parse(n.published) <= days * DAY),
    );
  const days = RANGES.find((r) => r.key === range)!.days;
  const shown = within(days).sort(
    (a, b) => Date.parse(b.published!) - Date.parse(a.published!),
  );

  // Newest first, under a heading per age band, so widening the range visibly adds older sections.
  const BANDS = [
    { label: "Last 24 hours", max: 1 },
    { label: "Earlier this week", max: 7 },
    { label: "Earlier this month", max: 31 },
    { label: "Past 6 months", max: 183 },
    { label: "Past year", max: 366 },
  ];
  const ageDays = (n: NewsItem) =>
    now === null ? 0 : (now - Date.parse(n.published!)) / DAY;
  const groups = BANDS.map((band, i) => ({
    label: band.label,
    items: shown.filter(
      (n) =>
        ageDays(n) <= band.max && (i === 0 || ageDays(n) > BANDS[i - 1].max),
    ),
  })).filter((g) => g.items.length);

  const pill = (on: boolean) =>
    `rounded-md border px-3 py-1.5 text-[13px] transition-colors duration-150 ${on ? "border-ink bg-ink text-white" : "border-rule-strong text-text-2 hover:border-accent hover:text-text"}`;

  return (
    <section aria-labelledby="news">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="news" className="text-[15px] font-semibold tracking-tight">
          News
        </h2>
        <div role="tablist" aria-label="News feed" className="flex gap-1.5">
          {FEEDS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={feed === f.key}
              onClick={() => setFeed(f.key)}
              className={pill(feed === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Date range"
        className="mb-4 flex flex-wrap gap-1.5"
      >
        {RANGES.map((r) => (
          <button
            key={r.key}
            aria-pressed={range === r.key}
            onClick={() => setRange(r.key)}
            className={pill(range === r.key)}
          >
            {r.label}{" "}
            <span className="tnum opacity-60">{within(r.days).length}</span>
          </button>
        ))}
      </div>

      {now === null ? (
        <div className="min-h-64" />
      ) : groups.length ? (
        <div className="space-y-7">
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className="mb-3 flex items-baseline gap-2 text-[13px] font-semibold tracking-tight">
                {g.label}{" "}
                <span className="tnum font-normal text-text-2">
                  {g.items.length}
                </span>
              </h3>
              <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                {g.items.map((n) => (
                  <Card key={n.id} n={n} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-rule bg-sheet px-5 py-8 text-center text-[13px] text-text-2">
          Nothing in this window. Try a wider range.
        </p>
      )}
    </section>
  );
}
