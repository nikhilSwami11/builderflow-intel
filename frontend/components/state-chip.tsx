import { Check, CircleHelp, Minus, X } from "lucide-react";
import { HAS_LABEL } from "@/lib/data";
import type { Has } from "@/lib/types";

export const HAS_TONE: Record<Has, { chip: string; bar: string; icon: typeof Check }> = {
  yes: { chip: "bg-green-wash text-green border-green/30", bar: "bg-green", icon: Check },
  partial: { chip: "bg-amber-wash text-amber border-amber/30", bar: "bg-[#d9a21b]", icon: Minus },
  no: { chip: "bg-red-wash text-red border-red/30", bar: "bg-red", icon: X },
  unverified: { chip: "bg-stone-wash text-stone border-stone/30", bar: "bg-[#9aa8b8]", icon: CircleHelp },
};

/** State is a glyph plus a label as well as a color, so it never rests on hue alone. */
export function StateChip({ has }: { has: Has }) {
  const { chip, icon: Icon } = HAS_TONE[has];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${chip}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden />
      {HAS_LABEL[has]}
    </span>
  );
}
