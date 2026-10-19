export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-rule bg-sheet">
      <div className="px-5 pt-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[13px] text-text-2">{note}</p>}
      </div>
      <div className="px-5 pt-3 pb-5">{children}</div>
    </section>
  );
}
