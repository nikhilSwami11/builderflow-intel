# Builderflow Growth Intelligence Tool

## Working with me (Nikhil)
- This file is a starting plan, not a contract. If I say something in chat that conflicts
  with it, my message wins. Update this file when we change a decision.
- Talk to me like a teammate. Before each phase, give a 3 to 5 line plan and wait for "go".
  After each phase, show what ran, what the output looks like, and what's next.
- If something is unclear or there are two reasonable options, ask one short question
  instead of guessing. If a choice is minor, pick the sensible default and tell me.
- I'm on a tight deadline. If a step is taking too long or a feature is risky, say so and
  suggest a cut. Prefer the simplest thing that works for the demo.
- Explain errors in plain words, then fix them. Don't silently change the plan.
- I prefer direct, honest feedback over validation.
- Keep replies short. No recaps unless I ask. Show outputs trimmed to what matters.

## Goal
A working AI tool that tells Builderflow what to build next, what to double down on, and how
to position itself, using evidence from its own product, its competitors and the market.
Plus a chat assistant that answers growth questions with citations.
A reliable demo on cached data beats a perfect scraper.

## Why this project (open-ended assessment, no external brief)
The assessment was "build something useful for Builderflow". Nikhil chose this idea.
Builderflow (builderflow.app, portal.builderflow.app, by SNS System Inc.) pitches itself as
lead management and CRM for remodelers and contractors ("Stop Losing Leads Start Booking
More Jobs") and lists 7 modules on its website: Lead Intake Automation, Estimate Pro,
Claim Scope, FSM, Finance, Work Orders, Technician Mobile App. The portal says only
Claim Scope is live, with CRM, estimates and finance rolling out next.
It has little internal data and no systematic view of what bigger competitors offer, what
contractors complain about, or where the market is heading. Product decisions are guesswork.
The README must open with this reasoning.

## Default scope (time-boxed, I can expand it)
- 3 competitors: CompanyCam (inspections), JobNimbus (CRM), Buildertrend (remodeler all-in-one).
  Optional later: Encircle, AccuLynx, DASH (Next Gear), JobTread.
- One market node that also covers reviews (Reddit / G2 / Capterra snippets via search).
- Optional extras, done last: flow map + Mermaid diagrams, chat screenshot fallback.

## Stack
- Python 3.11+, Pydantic for every structured LLM output
- Pipeline is a plain cached function chain, not a LangGraph StateGraph -- cut in phase 8.
  It's a straight sequence with no branching/fan-out, and intel/cache.py already makes
  re-runs free; a graph framework would add indirection without adding capability. Dropped
  langgraph from requirements.txt accordingly.
- Web app: frontend/ (Next.js 16 + Tailwind 4, hand-built components, black/white "Vercel-like" design,
  designed with the impeccable skill). Read-only over data/cache via `python scripts/export_frontend.py`
  -> frontend/data/bundle.json. Live at https://builderflow-intel.vercel.app (Vercel project
  builderflow-intel, deployed from frontend/ with the CLI). The old Streamlit app.py still works.
- Chat (frontend/app/api/chat/route.ts): Vercel AI SDK structured output (Zod `replySchema`: answer in
  Markdown, sources ids, ideas[]). Sends the whole analysis + dated news + full guide as context every
  turn (~25k tokens, no vector search). Model route: AI_GATEWAY_API_KEY -> gateway; else OPENAI_API_KEY ->
  OpenAI direct; else on Vercel the gateway via platform OIDC (needs a card on the Vercel account).
  Ideas the model flags become anchored highlights + a node/edge idea tree (drawer). Up to 3 chat tabs
  in localStorage. 30 msgs/hour/visitor soft limit.
- intel/ stays untouched by the frontend work; scripts/ holds fetch_news.py and export_frontend.py.
- Chroma for vectors (RAG over everything the pipeline produces, phase 7)
- Playwright for JS-rendered pages, Tavily for search (cached queries + live chat fallback)
- OpenAI API: mini vision model for screenshots, mini model for collect/extract/market/
  analyze/chat; growth_advisor node uses gpt-5 (the only node that doesn't use the mini model)
- Keys in .env (never commit it)

## Repo layout
```
app.py                      Streamlit entry
intel/
  graph.py                  pipeline entrypoint (plain function chain, see Stack note above)
  ingest.py                 Builderflow ingestion (guide, site, screenshots)
  nodes/                    one file per pipeline node
  schemas.py                Pydantic models
  cache.py                  disk cache keyed by hash
  rag.py                    Chroma ingest + retrieval
data/
  builderflow_guide.docx    user guide (PRIMARY source), converted to builderflow_guide.md
  builderflow_site/         public website text (homepage.md already there)
  builderflow_screens/      ~45 subfolders of screenshots (SECONDARY source)
  competitors.yaml          competitor names + homepage URLs
  manual/                   hand-pasted fallback text for blocked sites
  cache/                    all fetched pages and LLM outputs
```

## Builderflow data rules
Guide
- Convert builderflow_guide.docx to builderflow_guide.md (pandoc or python-docx), keeping Word
  heading styles as markdown headings. If there are few or no real headings, detect section
  titles (short lines, bold, numbered) and fall back to ~800-token chunks with overlap.
  Show me the detected section list before embedding.
- Chunk with metadata (module, feature, section), source="guide".

Website
- data/builderflow_site/*.md, source="website". In phase 3, also crawl builderflow.app's
  Pricing, Who We Serve and each "Our Solutions" module page with the collect node.
- Where website, portal and guide disagree, flag it as a messaging inconsistency.
  Don't pick one.

Screenshots
- No dedupe step. Nikhil captured and sorted these manually; all 98 are kept as-is.
- Walk subfolders recursively. Each of the ~45 folders is a feature or flow: folder name =
  `flow` metadata. Map each flow to a parent `module` with one cached LLM call over the folder
  list plus guide headings. Numeric filename prefixes (01_, 02_) = `step` metadata.
- One-time vision pass: resize to 1280px max, detail=high, temperature 0, 8 concurrent,
  cached by image hash. Per screen: screen, purpose, navigation, components, actions,
  data_fields, status, ux_notes, split into observed vs inferred. Quote UI text verbatim.
  Unreadable text = "unclear". Screenshot-only features = "unverified" unless the guide
  confirms them. Store the image path in metadata.

Summary
- A ~1500-token app_summary built from guide + website + screens always goes in the system
  prompt. Everything else via RAG.
- Never resend images, except the optional chat fallback (re-query one linked screenshot).

Flow map (optional extra)
- data/flow_map.json, one LLM call per folder -> {module, flow, purpose, screens}.
  Optional: steps (tag "order_inferred" if files aren't numbered), gaps_or_dead_ends.
  Single-screenshot folders get module + purpose only. Never invent steps.

## Pipeline nodes
1. collect: competitor homepage, features, pricing, changelog (+ Builderflow site pages).
   Save raw text + URL + timestamp.
2. extract: features, pricing tiers, target customer, positioning (Pydantic).
3. market: industry trends, contractor pain points and competitor review snippets via
   search, saved with sources.
4. analyze: feature gap matrix vs Builderflow (cover lead/CRM, not only inspections),
   pricing comparison, top pain points, messaging inconsistencies.
5. growth_advisor: features to build, strengths to double down on, positioning and pricing
   ideas, growth opportunities, quick wins. Every claim cites a source.

## UI tabs
Overview, Gap Matrix, Pricing, Pain Points & Market, Growth Advisor, Chat.
Chat = brainstorming partner over the whole analysis, news and guide, with source chips and an idea tree
(the Python RAG chat in intel/rag.py is the older version, kept as a fallback).

## Conventions (always follow)
- Cache every fetch and LLM call to data/cache. Re-runs must cost nothing.
- Every insight carries source URLs or chunk ids.
- Say "not found in our data", never "Builderflow lacks X".
- Claude Code itself must NOT open images in data/builderflow_screens. The pipeline does that.
- Small modules. After each phase: run it, show the output, commit, and push to origin main
  (git@github.com:nikhilSwami11/builderflow-intel.git).
- Never commit .env or data/cache/. Ask me before committing anything under
  data/builderflow_screens/ or the guide, since they may be private company material.
- If a site blocks scraping after 2 attempts, log it and fall back to data/manual/<name>.md.

## Commands
- Setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && playwright install chromium`
- Ingest Builderflow: `python -m intel.ingest`
- Run pipeline: `python -m intel.graph`
- Refresh news: `python scripts/fetch_news.py`
- UI (old): `streamlit run app.py`
- Deploy: `cd frontend && npx vercel deploy --prod --yes` (run export_frontend.py first; .vercelignore uploads the gitignored frontend/data)
- UI (new): `python scripts/export_frontend.py && cd frontend && npm install && npm run dev`

## Build phases (update the checkboxes as you go)
- [x] 1. Scaffold, requirements, cache, schemas
- [x] 2. Builderflow ingestion: guide conversion, website text, vision pass, app_summary
- [x] 3. collect + extract: one competitor end to end, then the other two, plus Builderflow site pages
- [x] 4. market node (trends, pain points, reviews)
- [x] 5. analyze + growth_advisor
- [x] 6. Streamlit UI tabs
- [x] 7. Chat with RAG and citations
- [x] 8. README with architecture diagram, offline demo run on cached data
- [x] Frontend rebuild: Next.js app in frontend/ (export script, 6 sheets, evidence detail view, chat via scripts/chat_api.py)
- [ ] Extras: flow map, more competitors, chat screenshot fallback
- [x] News upgrade: `python scripts/fetch_news.py` (Tavily news search, dated, two feeds: industry + AI with "how Builderflow could use it") -> data/cache/news.json -> export -> frontend News section with feed tabs and date filter (24h/7d/1m/6m/1y, filters stored items, no API call per click); chat answers "latest news" from the same items. Re-run fetch_news.py then export_frontend.py to refresh.
- [x] Chat upgrades: streaming, structured JSON replies, Markdown, full guide in context, idea tree + inline idea highlights, 3 chat tabs
- [x] Deploy: live on Vercel (https://builderflow-intel.vercel.app); README rewritten with screenshots in docs/screenshots/
- [ ] Demo prep: 60-second flow (see chat history), optional video
