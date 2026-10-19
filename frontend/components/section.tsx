export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border border-rule bg-sheet">
      <div className="border-b border-rule px-5 py-3">
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[13px] text-text-2">{note}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
