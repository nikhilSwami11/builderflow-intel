import { STRENGTH_LABEL, STRENGTH_NOTE, type Strength } from "@/lib/strength";

const TONE: Record<
  Strength,
  { bar: string; text: string; wash: string; filled: number }
> = {
  strong: {
    bar: "bg-green",
    text: "text-green",
    wash: "bg-green-wash",
    filled: 3,
  },
  promising: {
    bar: "bg-[#f0a500]",
    text: "text-[#8a5a00]",
    wash: "bg-[#ffefb8]",
    filled: 2,
  },
  early: {
    bar: "bg-stone",
    text: "text-stone",
    wash: "bg-stone-wash",
    filled: 1,
  },
};

export const strengthSelected: Record<Strength, string> = {
  strong: "border-green bg-green text-white",
  promising: "border-[#f0a500] bg-[#f0a500] text-[#3d2a00]",
  early: "border-stone bg-stone text-white",
};

export const strengthEdge = (s: Strength) => TONE[s].bar;

/** Three bars, filled by evidence strength, with the level in words. Never colour alone. */
export function StrengthChip({
  level,
  size = "sm",
}: {
  level: Strength;
  size?: "sm" | "lg";
}) {
  const t = TONE[level];
  const h = size === "lg" ? "h-3.5" : "h-2.5";
  return (
    <span
      title={STRENGTH_NOTE[level]}
      className={`inline-flex items-center gap-1.5 rounded-full ${t.wash} ${t.text} ${size === "lg" ? "px-2.5 py-1 text-[12.5px]" : "px-2 py-0.5 text-[11.5px]"} font-medium`}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-[1px] ${i <= t.filled ? t.bar : "bg-current opacity-20"} ${i === 1 ? "h-1.5" : i === 2 ? (size === "lg" ? "h-2.5" : "h-2") : h}`}
          />
        ))}
      </span>
      {STRENGTH_LABEL[level]}
    </span>
  );
}
