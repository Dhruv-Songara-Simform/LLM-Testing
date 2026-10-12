# Top 5 Industry-Grade Enhancements

> Analyzed: October 9, 2026
> Based on full end-to-end analysis of evaluate_responses.py, server.js, public/deepeval.html, eval-cli.mjs, and deepeval/ framework.
> Compared against: LangSmith, Braintrust, Arize Phoenix.

---

## #1 — Per-Response Human Feedback Loop

**The gap:** Every score comes from an LLM judge with zero human validation. You can't tell stakeholders "quality is 92%" if no human ever confirmed the judge is calibrated correctly.

**What to build:**
- Add thumbs up/down buttons next to each metric score in per-response breakdown
- Store feedback in artifact JSON (`humanOverrides: {metric, verdict, note}`)
- Show judge-vs-human agreement rate on Artifacts tab
- Compute "Judge Calibration Score" when enough feedback accumulates

**Files to change:**
- `public/deepeval.html` — UI buttons + feedback display
- `server.js` — New `POST /api/feedback` endpoint
- Artifact JSON schema update

---

## #2 — Multi-Run Comparison + Per-Metric Trend Lines

**The gap:** You can only compare the current run to its immediate predecessor. No way to pick two arbitrary runs, and the trend chart only shows 15 runs with no filtering. The system already admits ~12pt variance between identical runs — without trends, you can't distinguish noise from real regression.

**What to build:**
- "Compare" checkbox on each history card — select any 2 runs for side-by-side diff
- Per-metric sparklines on history cards showing the last 10 scores
- Filter history by endpoint, suite, date range, and mode
- Statistical significance indicator (is a 5pt drop noise or real?)

**Files to change:**
- `public/deepeval.html` — Comparison UI, filtering, sparklines
- `server.js` — Add query params to `GET /api/artifacts` for filtering/pagination

---

## #3 — CI/CD GitHub Integration (PR Comments + Status Checks)

**The gap:** `eval-cli.mjs` already has exit codes and baseline comparison — it just needs a GitHub Actions workflow file and PR commenting. This is the #1 feature that separates a "tool you run manually" from a "platform that catches regressions automatically."

**What to build:**
- `.github/workflows/eval.yml` — runs `npm run eval -- --suite golden` on every PR
- `--github-comment` flag on eval-cli that posts a formatted markdown table to the PR with metric scores, deltas, and pass/fail
- `--junit <file>` output format for CI test result dashboards
- Commit status check (green/red) based on the quality gate

**Files to change:**
- `eval-cli.mjs` — Add `--github-comment` and `--junit` flags
- New `.github/workflows/eval.yml`

---

## #4 — Token/Cost Tracking Per Evaluation Run

**The gap:** Zero visibility into how much each evaluation costs. Industry platforms (LangSmith, Braintrust) show tokens consumed and cost per run. Without this, you can't budget for scaling evaluation or optimize expensive judge calls.

**What to build:**
- Count prompt/completion tokens from both chatbot and judge API responses
- Calculate cost using configurable per-token rates (`JUDGE_COST_PER_1K_INPUT`, etc.)
- Show cost summary card on the results page: total tokens, judge tokens, chatbot tokens, estimated cost
- Track cost in artifact JSON for trending over time

**Files to change:**
- `evaluate_responses.py` — Parse `usage` from judge API responses, return token counts
- `server.js` — Parse tokens from chatbot responses, merge into results
- `public/deepeval.html` — Cost summary card

---

## #5 — Evaluation Tracing with Judge Reasoning Drill-Down

**The gap:** When a metric fails, you see a one-line reason. Industry platforms show the full trace: the exact prompt sent to the judge, the raw judge response, the scoring logic applied. Without this, debugging a bad score is guesswork.

**What to build:**
- Store the full judge prompt and raw response for each metric in the per-response data
- Add an expandable "Trace" section under each metric score showing: judge prompt -> raw response -> parsed score -> borderline resampling details (if triggered)
- For heuristic fallback, show which heuristic was used and the intermediate computation
- Export traces in the JSON artifact for offline debugging

**Files to change:**
- `evaluate_responses.py` — Capture and return `trace` objects per metric
- `public/deepeval.html` — Expandable trace UI
- Artifact JSON schema update

---

## Recommended Priority Order

| Priority | Enhancement | Effort | Impact |
|----------|------------|--------|--------|
| 1st | #3 CI/CD GitHub Integration | Medium | Automates quality gating on every PR |
| 2nd | #1 Human Feedback Loop | Medium | Makes scores trustworthy and calibrated |
| 3rd | #5 Judge Tracing | Low-Medium | Makes debugging failures 10x faster |
| 4th | #2 Multi-Run Comparison | Medium | Catches slow regressions in noisy data |
| 5th | #4 Token/Cost Tracking | Low | Budget visibility, optimization signal |

---

## Additional Gaps Identified (Not in Top 5)

- No authentication on API endpoints (mitigated by localhost binding)
- No database — flat JSON file storage with no pagination/retention
- Dead code: `deepeval/config/`, `deepeval/evaluation/engine.py`, `deepeval/evaluation/metrics.py` unused by live system
- Dead dependencies: `cors` and `uuid` in package.json never imported
- XSS risk in `showStatus()` using innerHTML without consistent escaping
- `custom_metrics.json` has no file locking — concurrent writes can lose data
- CDN scripts loaded without SRI hashes
- Coverage doughnut chart is nonsensical (plots prompts vs fixed 100)
- Chart memory leaks — charts recreated without destroying previous instances
- No dark mode
