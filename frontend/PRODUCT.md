# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + Tailwind 4, hand-built components, CSS/SVG charts. No shadcn, no Tremor. Confirmed by the user.

## Users

Builderflow founders and product leads (builderflow.app, by SNS System Inc.), reading an outside growth assessment to decide what to build next, what to double down on, and how to position. They have little internal data and no systematic view of competitors or market complaints. Presented live by the author (Nikhil), then explored by the readers themselves.

## Product Purpose

Tells Builderflow what to build, double down on, and how to position, using evidence from its own product (guide, website, screenshots), three competitors (CompanyCam, JobNimbus, Buildertrend) and market reviews. Includes a chat assistant that answers growth questions with citations. Success: every recommendation can be traced to visible evidence a reader can click.

## Positioning

Not a generic competitor dashboard: every AI recommendation is tied to specific gap-matrix rows, pain points, pricing rows and cited sources, with the signal shown before the advice.

## Operating Context

Static read-only data exported from a cached Python pipeline (data/cache/*.json, hand-verified pricing YAML) into frontend/data/bundle.json. Only the chat calls a live backend (a thin API over intel/rag.py), so it only works locally.

## Capabilities and Constraints

Pages: Overview, Gap Matrix, Pricing, Pain Points & Market, Growth Advisor (list + detail view with linked evidence), Chat. Sidebar navigation. Citations are clickable chips with hover cards: sources are website, search, screenshot, manual, guide. Screenshot citations show a thumbnail. Pricing is small per-company tables (hand-verified, never AI-generated). Chat input pinned to the bottom, history scrolls above. Wording rule: say "not found in our data", never "Builderflow lacks X". Where website, portal and guide disagree, show it as a messaging inconsistency without picking one.

## Brand Commitments

None. Visual direction is left to the designer. Not tied to Builderflow's brand.

## Evidence on Hand

frontend/data/bundle.json: 17 gap-matrix rows, 16 pain points, 6 market trends, 10 review snippets, 5 messaging inconsistencies, 6 companies' pricing, 22 growth recommendations with 213 linked evidence items. 26 cited screenshots in frontend/public/screens/. No charts of time-series data exist; counts and categories only. Do not fabricate metrics, customers or trends.

## Product Principles

1. Signal before advice: show the data, then the recommendation that rests on it.
2. Every claim is traceable: nothing appears without a clickable source.
3. Scannable first, deep on demand: summary on the page, reasoning and evidence one click away.
4. Honest about gaps: unverified and not-found states are shown, not hidden.
5. Simple enough to present live under time pressure.

## Accessibility & Inclusion

No specific standard established. Aim for readable contrast and keyboard-reachable citation chips.
