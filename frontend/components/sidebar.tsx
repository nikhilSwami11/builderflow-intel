"use client";

import { Compass, LayoutDashboard, MessageSquare, Table2, Tag, TrendingDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const SHEETS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/gap-matrix", label: "Gap Matrix", icon: Table2 },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/pain-points", label: "Pain Points & Market", icon: TrendingDown },
  { href: "/advisor", label: "Growth Advisor", icon: Compass },
  { href: "/chat", label: "Chat", icon: MessageSquare },
] as const;

export function Sidebar({ revised }: { revised: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="bg-ink text-ink-text lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
      <div className="px-5 pt-5 pb-4 lg:pt-7 lg:pb-6">
        <p className="text-[17px] leading-tight font-semibold tracking-tight text-white">Builderflow</p>
        <p className="mt-0.5 text-[13px] text-ink-text">Growth Intelligence</p>
      </div>

      <nav aria-label="Sheets" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {SHEETS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-[14px] whitespace-nowrap transition-colors duration-150 ${
                on ? "bg-white/12 text-white" : "hover:bg-white/7 hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} aria-hidden className="shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="hidden border-t border-white/10 px-5 py-4 text-[12px] leading-snug text-[#737373] lg:block">
        Updated <span className="tnum">{revised}</span>
      </p>
    </aside>
  );
}
