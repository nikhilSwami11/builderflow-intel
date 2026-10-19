import { ArrowUpRight, Lightbulb } from "lucide-react";
import Link from "next/link";

/** The one idea marker, used wherever an item has an idea attached: a yellow bulb that links
 *  to the idea. Pass `question` to add a Discuss button that opens the chat with that item
 *  and its idea already in the question. */
export function IdeaTag({ href, title, question }: { href?: string; title?: string; question?: string }) {
  const bulb = <Lightbulb size={14} aria-hidden className="text-[#c98a00]" fill="#fde68a" strokeWidth={1.75} />;
  const bulbClass = "inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#f0d68a] bg-[#fff8e1]";

  return (
    <span className="inline-flex items-center gap-1.5">
      {href ? (
        <Link href={href} title={title ? `Idea: ${title}` : "Idea"} aria-label={title ? `Idea: ${title}` : "Idea"} className={`${bulbClass} transition-colors duration-150 hover:border-[#c98a00]`}>
          {bulb}
        </Link>
      ) : (
        <span title="Idea" role="img" aria-label="Idea" className={bulbClass}>
          {bulb}
        </span>
      )}
      {question && (
        <Link
          href={`/chat?q=${encodeURIComponent(question)}`}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-rule-strong bg-sheet px-2 text-[12px] font-medium text-text transition-colors duration-150 hover:bg-accent hover:text-white"
        >
          Discuss <ArrowUpRight size={12} aria-hidden />
        </Link>
      )}
    </span>
  );
}
