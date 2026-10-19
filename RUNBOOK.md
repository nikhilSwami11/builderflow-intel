# Builderflow Tool: Full Setup + Claude Code Runbook

Repo: git@github.com:nikhilSwami11/builderflow-intel.git
Commands are for Mac/Linux terminal. Run them one block at a time.

## Step 1. Check your tools (2 min)

```bash
git --version        # any version is fine
python3 --version    # needs 3.11 or newer
node --version       # needed for the optional MCP servers
claude --version     # Claude Code
ssh -T git@github.com   # should say "Hi nikhilSwami11!"
```

If `claude` is missing: `npm install -g @anthropic-ai/claude-code`, then run `claude` once and log in with your Pro account.
If the ssh test fails, your SSH key isn't on GitHub. Use the HTTPS URL instead:
https://github.com/nikhilSwami11/builderflow-intel.git

## Step 2. Clone the repo (1 min)

```bash
cd ~/Projects            # or wherever you keep code
git clone git@github.com:nikhilSwami11/builderflow-intel.git
cd builderflow-intel
```

(If it warns "You appear to have cloned an empty repository", that's fine.)

## Step 3. Create folders and .gitignore (1 min)

```bash
mkdir -p data/builderflow_screens data/builderflow_site data/manual data/cache

cat > .gitignore <<'EOF'
# secrets and local stuff
.env
.venv/
__pycache__/
*.pyc
.DS_Store

# generated data
data/cache/
data/chroma/

# private Builderflow material (remove these lines only if the repo is private)
data/builderflow_screens/
data/builderflow_guide.docx
data/builderflow_guide.md
EOF
```

## Step 4. Copy your files in (5 min)

Download CLAUDE.md, RUNBOOK.md and homepage.md from the chat first. Then
(replace the source paths with where your files actually are):

```bash
cp ~/Downloads/CLAUDE.md .
cp ~/Downloads/RUNBOOK.md .
cp ~/Downloads/homepage.md data/builderflow_site/
cp "/path/to/your/guide.docx" data/builderflow_guide.docx
cp -R "/path/to/your/screenshots/"* data/builderflow_screens/
```

Check it looks right:
```bash
ls data/builderflow_screens | head      # should list your folders
ls data/builderflow_screens | wc -l     # should be about 45
ls data                                 # guide, site, screens, manual, cache
```

## Step 5. Create .env with your keys (2 min)

```bash
cat > .env <<'EOF'
OPENAI_API_KEY=sk-...your key...
TAVILY_API_KEY=tvly-...your key...
EOF
```

Get keys at platform.openai.com (add ~$5 to $10 credit) and tavily.com (free tier).

## Step 6. First commit and push (1 min)

```bash
git add .
git status          # make sure .env and the screenshots are NOT listed
git commit -m "Initial setup: CLAUDE.md, runbook, data folders"
git branch -M main
git push -u origin main
```

If the push is rejected because the GitHub repo already has a README:
```bash
git pull origin main --rebase --allow-unrelated-histories
git push -u origin main
```

## Step 7. Optional MCP servers (2 min, skip if anything errors)

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

Playwright lets Claude Code open your Streamlit app and check the UI itself.
Context7 gives it up-to-date library docs (LangGraph changes fast).

## Step 8. Start Claude Code

```bash
claude
```
Then type `/model` and pick Sonnet.

First message:
> Read CLAUDE.md. Summarize the goal and plan in 5 lines, flag anything risky or unclear, then propose phase 1.

Read its summary. Correct anything wrong, otherwise say "go".

---

## Phase prompts

Run /clear after each finished phase. CLAUDE.md carries the context forward.

Phase 1: scaffold
> Do phase 1: scaffold the repo, requirements.txt, venv, cache.py, schemas.py. Install everything and confirm imports work. Commit and push.

Done when: install succeeds, imports work, pushed.

Phase 2: Builderflow ingestion
> Do phase 2. Start with the guide conversion and show me the detected section list before embedding. Then website text, dedupe, vision pass and app_summary. Show me 3 sample screen descriptions and the app_summary. Commit and push.

Done when: you checked the section list, compared 3 screen descriptions with the real screenshots, and read the app_summary.

Phase 3: competitors + Builderflow site pages
> Do phase 3 for CompanyCam only and show me the extracted features and pricing. If it looks right, do JobNimbus and Buildertrend, then crawl Builderflow's own site pages. Commit and push.

Phase 4: market
> Do phase 4. Show me the top 10 findings with sources. Commit and push.

Phase 5: analysis + Growth Advisor
> Do phase 5. Show me the full gap matrix and Growth Advisor output. Commit and push.

Done when: you read it properly. It should catch: 7 modules advertised but only Claim Scope live, no testimonials or named customers, no visible pricing, only QuickBooks named as an integration, 2-4 week onboarding, "all trades" positioning.

Phase 6: UI
> Do phase 6: Streamlit UI with all tabs reading from cached data. Use the Playwright MCP to open it and check the layout. Give me the launch command. Commit and push.

Phase 7: chat
> Do phase 7. Test it with 3 growth questions and show me the answers with citations. Commit and push.

Phase 8: polish
> Do phase 8: README opening with why this tool matters for Builderflow, an architecture diagram, and a full offline run from cached data. Commit and push.

Extras, only if time: flow map, more competitors, chat screenshot fallback.

## Steering phrases

- "Go" / "Looks good, continue"
- "Skip that. What's the simplest version that works for the demo?"
- "This output looks wrong: [paste]. What happened?"
- "Stop. Explain the error in plain words and give me 2 options."
- "We're short on time. What can we cut?"
- "Change of plan: [X]. Update CLAUDE.md too."

## Housekeeping

- Shift+Tab: plan mode, or auto-accept edits when you trust a phase
- /clear after each phase, /status to check Pro usage
- Hit your Pro limit? Wait for the reset, then: "continue from the last commit"
- Any step stuck for over 30 min: paste the data by hand and move on
