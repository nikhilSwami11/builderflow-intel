"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const KEY = "bf-nav-count";
const LAST = "bf-nav-last";

/** Counts in-app page views this session, so a Back link can tell "I came from another page of
 *  this app" (go back) from "I opened this page directly" (use the fallback). */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      // Only a change of page counts (React runs effects twice in development).
      if (sessionStorage.getItem(LAST) === pathname) return;
      sessionStorage.setItem(LAST, pathname);
      sessionStorage.setItem(
        KEY,
        String(Number(sessionStorage.getItem(KEY) ?? 0) + 1),
      );
    } catch {}
  }, [pathname]);
  return null;
}

export function cameFromApp(): boolean {
  try {
    return Number(sessionStorage.getItem(KEY) ?? 0) > 1;
  } catch {
    return false;
  }
}
