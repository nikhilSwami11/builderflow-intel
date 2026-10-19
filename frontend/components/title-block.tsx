import { bundle, formatDate } from "@/lib/data";

/** Page header drawn as a drawing-sheet title block: name and purpose on the left, sheet
 *  number, revision date and what the sheet draws on at the right. */
export function TitleBlock({
  sheet,
  title,
  purpose,
  stat,
}: {
  sheet: string;
  title: string;
  purpose: string;
  stat: { label: string; value: string };
}) {
  return (
    <header className="grid border border-rule-strong bg-sheet sm:grid-cols-[1fr_auto]">
      <div className="px-5 py-4">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-balance">{title}</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-text-2">{purpose}</p>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-rule border-t border-rule-strong text-[12px] sm:border-t-0 sm:border-l">
        <Cell label="Sheet" value={sheet} mono />
        <Cell label="Revised" value={formatDate(bundle.generatedAt)} />
        <Cell label={stat.label} value={stat.value} mono />
      </dl>
    </header>
  );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-24 flex-col justify-center px-4 py-3">
      <dt className="text-text-2">{label}</dt>
      <dd className={`mt-0.5 text-[14px] font-medium tnum ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
