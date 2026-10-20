"use client";

import { useState } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import type { OpportunityCardData } from "@/lib/opportunities";

/** Shows the first few opportunities and a button for the rest. */
export function OpportunityGrid({ items, initial }: { items: OpportunityCardData[]; initial: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, initial);
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {shown.map((o) => (
          <OpportunityCard key={o.id} opp={o} />
        ))}
      </div>
      {items.length > initial && (
        <button
          onClick={() => setAll(!all)}
          className="mt-3 text-[13px] text-text-2 underline-offset-4 hover:text-text hover:underline"
        >
          {all ? "Show fewer" : `Show all ${items.length} opportunities`}
        </button>
      )}
    </div>
  );
}
