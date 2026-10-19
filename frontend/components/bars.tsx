type Segment = { value: number; className: string; label: string };

/** Horizontal bars on one shared scale: every row's length is value / max, so rows compare
 *  honestly. A row is either a single bar or stacked segments. */
export function BarStrip({
  rows,
  max,
}: {
  rows: { label: string; segments: Segment[] }[];
  max: number;
}) {
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const total = row.segments.reduce((a, s) => a + s.value, 0);
        return (
          <li key={row.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,11rem)_1fr_2rem]">
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
            <span className="flex h-3.5 overflow-hidden rounded-sm bg-accent-wash" role="img" aria-label={`${row.label}: ${row.segments.filter((s) => s.value).map((s) => `${s.value} ${s.label}`).join(", ")}`}>
              {row.segments.map(
                (s) =>
                  s.value > 0 && <span key={s.label} className={s.className} style={{ width: `${(s.value / max) * 100}%` }} />,
              )}
            </span>
            <span className="text-right font-mono tnum">{total}</span>
          </li>
        );
      })}
    </ul>
  );
}
