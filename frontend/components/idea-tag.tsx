import { Lightbulb } from "lucide-react";
import Link from "next/link";

/** The one "Idea" tag, used wherever an item has an idea attached (opportunity cards, pain
 *  points, news). Pass `href` to make it a link to the idea; without it, a plain label. */
export function IdeaTag({ href, title }: { href?: string; title?: string }) {
  const cls =
    "inline-flex items-center gap-1 rounded border border-rule-strong bg-sheet px-1.5 py-0.5 text-[12px] font-medium text-text-2";
  return href ? (
    <Link href={href} title={title} className={`${cls} transition-colors duration-150 hover:border-accent hover:text-text`}>
      <Lightbulb size={12} aria-hidden /> Idea
    </Link>
  ) : (
    <span className={cls}>
      <Lightbulb size={12} aria-hidden /> Idea
    </span>
  );
}
