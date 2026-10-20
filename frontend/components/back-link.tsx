"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cameFromApp } from "@/components/nav-tracker";

/** Goes back to the page the reader came from (Overview, the Advisor list...). Opened directly,
 *  it falls back to `href`. The link still works without JavaScript. */
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (cameFromApp()) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1.5 text-[13px] text-text-2 hover:text-text"
    >
      <ArrowLeft size={14} aria-hidden /> {label}
    </Link>
  );
}
