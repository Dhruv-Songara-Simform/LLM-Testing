# Future Enhancements

> Created: October 20, 2026 · Updated: October 29, 2026 (**direction changed** Oct 28: requirements are an input to the DeepEval run itself, not a separate test-case generator) · Status: **Implemented Oct 29, 2026** (Phases 1–3, behind `FEATURE_REQUIREMENTS`; see "Implementation status" below)
> Read in order: the ground rule (existing functionality stays intact), the direction change, then #1 (requirement input and evaluation inside DeepEval) and #2 (the dedicated Requirements page and report).
> Related: [ENHANCEMENTS_INDUSTRY_GRADE.md](ENHANCEMENTS_INDUSTRY_GRADE.md) (feedback loop, trends, CI, cost, tracing)

---

## Ground rule: existing functionality must keep working exactly as it does today

This rule applies to every enhancement in this document and overrides any design choice below. If a new feature conflicts with existing behaviour, the new feature changes, not the existing behaviour.

**What must not change**

- **Every current screen and tab:** Conversation, Quality Metrics, Analysis, Artifacts, the history list, custom metrics management, and the configuration panel (endpoint, mode, prompts, suite, initial question, system prompt and criteria, built-in and custom metrics). **The Quality Metrics page stays exactly as it is**; requirement results go on their own new page (#2).
- **Every current scoring result.** For the same inputs, prompt-level scores, pass or fail per metric, `overallPass`, the 75% `PASS_THRESHOLD` bar, the matrix colours and the `unmeasured_metrics` list stay identical. Requirement evaluation is a separate layer and never feeds back into metric scores.
- **Every current mode and suite:** `static`, `dynamic`, `suite`, and the golden and edge suites.
- **Every current route and command:** `/api/chat`, `/api/deepeval` (including its SSE event shape), `/api/suites`, `/api/artifacts`, `/api/custom-metrics`, `/api/generate-question`, `/api/extract-metric-name`, `npm start`, `npm run eval`, `npm run test:metrics`, and `pytest deepeval/tests/`.
- **Every saved artifact.** Artifacts created before any change must still open and show the same content.
- **The current PDF report button.** It keeps working, as it is. Requirement reporting is added next to it, never instead of it.
- **A run with no requirements checked behaves exactly like today**: no extra model calls, no new fields in the result.

**How changes must be made**

1. **Additive only.** New fields are optional. Existing fields are not renamed, removed or changed in meaning. Old clients keep working without edits.
2. **Behind a feature flag.** The work is switched on by `FEATURE_REQUIREMENTS` (off by default until its phase passes the regression gate below). Turning the flag off restores the previous behaviour, which is the rollback plan.
3. **`evaluate_responses.py` is live code and is not touched by this work.** Requirement evaluation lives in its own script (`evaluate_requirements.py`), spawned separately, so the metric scoring path stays byte-for-byte the same.
4. **New UI code lives in its own file** (`public/requirements.js`). `deepeval.html` only calls it through a guard that catches errors, so a bug in the new code can never break an existing view.
5. **Shared logic is changed carefully.** If a helper is used by both old and new code, its existing behaviour is pinned by a test before it is touched.

**Regression gate (every phase, before the flag is turned on)**

- [ ] `pytest deepeval/tests/ -v` passes, including all tests that existed before the phase.
- [ ] `npm run test:metrics` passes.
- [ ] **Golden comparison:** a saved artifact for each existing suite and each mode is re-scored with the flag off and on (with no requirements checked, and with requirements checked). The metric fields must be identical. Only new, optional fields may differ.
- [ ] `npm run eval` against the golden suite, with the flag off, gives the same pass or fail outcome as the last run on the same endpoint, within the ~12-point variance already documented.
- [ ] Old artifacts open unchanged, and the Conversation, Quality Metrics, Analysis, Artifacts and custom-metrics screens work as before (manual checklist in the phase's notes).
- [ ] The current PDF report downloads and matches the previous output for an existing artifact.

A phase that fails any item is not merged. If a regression is found after the flag is turned on, the flag is turned off first, then the cause is fixed.

---

## Direction change (Oct 28, 2026): requirements are part of DeepEval

**What the user wants**

- The requirement upload is **for the DeepEval evaluation of the chatbot**, not for simple test-case generation.
- Requirements are entered **before** DeepEval runs, in the same configuration screen, alongside the metrics.
- After upload, the requirements are shown as a **checklist of bullet points**. The user can **check or uncheck** each requirement; only checked requirements are evaluated.
- When the user clicks **▶ Run DeepEval**, the chatbot is evaluated **on both the selected metrics and the checked requirements**, in the same run.
- There are **two separate result pages**:
  1. **Quality Metrics** — exactly as it is today.
  2. **Requirements** — a new page dedicated only to requirements, with all the details and analysis that the Quality Metrics page gives for metrics (scores, pass/fail, charts, per-response breakdown with reasons).
- Requirement testing runs in **its own AI session**, separate from the session that generated the chat and separate from the session that scored the metrics, so it cannot reuse the reasoning of either.

**What this replaces**

The previous plan (and a first implementation, since removed) treated requirements as input to a **separate "Requirements → Test Dataset" section** that generated test cases, which then had to be reviewed, published and run as a suite. That is **not** what is wanted: it made requirements a test-generation feature detached from DeepEval. In this plan requirements are a first-class evaluation input of DeepEval itself, like metrics. Test-case generation from requirements is no longer part of this work (see "Deferred idea" at the end).

---

## Implementation status (Oct 29, 2026)

| Part | Where |
|---|---|
| Parsing, limits, requirement judge, scoring model | `evaluate_requirements.py` (modes: evaluate, `config`, `parse`, `validate`) |
| Flag, library routes, payload validation, third-session spawn, artifact fields, history summary | `server.js` |
| Checklist panel, 📋 Requirements tab, history/comparison lines, CSV/JSON, requirements PDF | `public/requirements.js`, hooked into `public/deepeval.html` only through the guarded `reqHook()` |
| CI | `eval-cli.mjs --requirements <file> [--gate-requirements]` |
| Tests | `deepeval/tests/test_requirement_*.py`, `test_regression_existing_behaviour.py`, `npm run test:requirements` (end-to-end, fake model, flag on and off) |

Small decisions made while building, beyond the text below:
- Scores within `BORDERLINE_MARGIN` of the **case floor** are re-judged too, since the floor also decides pass/fail.
- A requirement whose judge calls failed for some responses gets Low confidence; if none of its responses could be judged, it is `Not measured`.
- The verdict (`met` / `partially met` / `violated`) is derived from the final (median) score so the two never disagree.
- The combined verdict also needs at least one tested requirement and none `Not measured`.
- If the requirement process crashes, the run still completes: metric results are kept and every requirement is `Not measured` with the error shown.
- `pytest.ini` (`-p no:plugins`) was added because the pip `deepeval` pytest plugin crashed every pytest run before this work.

Regression gate (Oct 29): pytest 30/30, `npm run test:metrics` passed, `npm run test:requirements` 13/13, golden `npm run eval` with the flag off matched the previous golden run's outcome (same two metrics below 75%, all deltas within 8 points), browser check with no console errors and both PDFs downloading.

---

## Enhancement #1: Requirement-Based DeepEval Evaluation

### Summary

The user pastes their requirements (or loads a `.txt` / `.md` file), sees them as a checklist, checks the ones to test, configures the run as today, and clicks **▶ Run DeepEval**. The run collects the chatbot's responses exactly as today, scores the metrics exactly as today, and then — in a **separate requirement-judge session** — checks every response against every checked requirement. Results appear on the new **Requirements** page (#2) and in the saved artifact.

### User flow

1. **Configure** (existing fields, unchanged): endpoint, system prompt, number of prompts, evaluation mode (dynamic / static / suite), built-in and custom metrics.
2. **Requirements** (new panel in the configuration area, shown when `FEATURE_REQUIREMENTS` is on):
   - A text box and a **Load .txt / .md file** button. One requirement per line, at most **100 words** each, up to 50 requirements.
   - **Add requirements** turns the text into a checklist. Lines over 100 words are shown in red with their word count and are not added.
   - The checklist shows each requirement as a **bullet point with a checkbox**, its ID (`R-01`, `R-02`, …) and its text. All new requirements start **checked**.
   - Controls: **Select all**, **Select none**, remove a requirement (✕), and a counter, for example `6 of 8 requirements selected`.
   - A summary line next to the existing metric summary: `✓ Ready: 8 metrics · 6 requirements selected`.
3. **Run DeepEval** (the existing button). Progress shows: collecting responses → scoring metrics → **checking requirements** → saving, on the existing progress bar.
4. **Results:** the existing tabs plus a new **📋 Requirements** tab. Quality Metrics is unchanged; the Requirements tab holds everything about requirements (#2).

If no requirement is checked, the run is identical to today's run and the Requirements tab says "No requirements were selected for this run."

### Requirement input rules

| Rule | Value |
|---|---|
| Input | Text only: pasted text, or a `.txt` / `.md` file read in the browser (`FileReader.readAsText`). No PDF/DOCX, no upload endpoint. |
| Splitting | One requirement per non-empty line. Bullets and numbering (`-`, `*`, `1.`, `1)`) are removed. Markdown heading lines (`# …`) are skipped. |
| Length | **Maximum 100 words per requirement** (`MAX_REQUIREMENT_WORDS = 100`, a temporary limit changed in one place). |
| Count | Up to `MAX_REQUIREMENTS = 50` in the list. |
| Safety | Text with NUL bytes is rejected (a binary file renamed to `.txt`). |
| Persistence | The list is saved on the server (`requirements.json`, like `custom_metrics.json`) so it survives a reload. Checked/unchecked state is per run and is sent with the run. |
| Traceability | Each run's artifact stores a **snapshot** of the checked requirements (ID + text), so later edits to the list never change old results. |

### Session isolation: three separate AI sessions

Session isolation is the core principle of this framework, and requirement testing gets its own session:

| Session | Purpose | Sees |
|---|---|---|
| 1. Chat session | The chatbot under test generates replies | The prompts (and earlier turns in dynamic mode) |
| 2. Metric judge | Scores the selected metrics (`evaluate_responses.py`, unchanged) | Prompt, reply, context, metric definitions |
| 3. **Requirement judge (new)** | Checks each reply against the checked requirements (`evaluate_requirements.py`) | Prompt, reply, context, requirement texts — **never** the metric scores or the metric judge's reasons |

Rules:
- The requirement judge runs in **its own process** (`evaluate_requirements.py`, spawned separately by `server.js`) and makes **its own stateless API calls** with **its own system prompt**. No conversation history is shared with the chat or the metric judge.
- It is never given the metric judge's scores or reasons, so it cannot copy or anchor on them.
- Its model is configurable with `REQ_JUDGE_MODEL` / `REQ_JUDGE_API_KEY` / `REQ_JUDGE_BASE_URL`, falling back to `JUDGE_*`, then `TEXT_MODEL_*`. Even when the same model name is used, every call is a fresh session. The UI warns when the requirement judge model equals the chatbot model.
- Requirement texts are wrapped in delimiters (`<requirement id="R-03">…</requirement>`) and the system prompt says they are data, never instructions, so a requirement cannot inject commands.

### How a requirement is evaluated

For each scored response and each checked requirement, the requirement judge returns:

| Field | Meaning |
|---|---|
| `applies` | Whether this prompt gave the chatbot a chance to meet or break the requirement. General requirements (tone, privacy, language, safety) apply to every response. |
| `score` | 0–1 compliance score when it applies, using the same calibration anchors as the metric judge (1.0 flawless … 0.0 completely violates). |
| `verdict` | `met`, `partially met`, `violated` or `not applicable`. |
| `reason` | One sentence naming the evidence, quoting the reply where possible. |

- Calls are batched **per response**: one call checks one reply against up to `REQ_BATCH_SIZE` requirements (larger lists are split into several calls).
- Scores within `BORDERLINE_MARGIN` of the bar are re-judged `JUDGE_SAMPLES` times and the median is used, the same noise control the metrics use.
- Errored chatbot responses are excluded, as for metrics.
- Without a judge model, requirements are reported as **not measured** (no heuristic guessing).

### Scoring model

| Term | Definition |
|---|---|
| **Response score** `s(p, r)` | The requirement judge's score for response `p` on requirement `r`, only where `applies` is true |
| **Requirement score** `S(r)` | Mean of `s(p, r)` over the responses where `r` applies |
| **Requirement pass** | `S(r) ≥ PASS_THRESHOLD` (0.75, reused from `evaluate_responses.py`) **and** no applicable response below `REQ_CASE_FLOOR` (0.50), so one clear violation is never averaged away |
| **Status** | `Pass`, `Fail`, `Not tested` (no response in this run gave the requirement a chance to show — the user should add prompts that exercise it), or `Not measured` (no judge, or every applicable response errored) |
| **Coverage** | Share of checked requirements that were tested (status `Pass` or `Fail`) |
| **Requirement pass rate** | Passed ÷ tested |
| **Confidence** | `Low` when fewer than `MIN_APPLICABLE_RESPONSES` (2) responses applied or `S(r)` is within `NOISE_BAND` (0.12) of the bar; otherwise `High` |
| **Combined DeepEval verdict** | Shown on the Requirements page only: `PASS` when all metrics pass (existing `overallPass`) **and** every tested requirement passes. The existing `overallPass` field is not changed. |

### API and data (additive)

- `POST /api/deepeval` accepts an optional `requirements: [{ id, text }]` (checked ones only). Validated on the server: at most 50, each at most 100 words, no NUL bytes. When absent or empty, the run is exactly as today.
- New progress phase on the existing SSE stream: requirement checking takes roughly 85–92% of the bar, with messages such as `Checked requirements for response 3/5...`. Event types are unchanged.
- The `complete` event and the artifact gain optional `metrics.requirements` (the snapshot) and `metrics.requirementResults`:

```json
{
  "judgeModel": "…", "thresholds": { "pass": 0.75, "caseFloor": 0.5, "minApplicable": 2, "noiseBand": 0.12 },
  "summary": { "selected": 6, "tested": 5, "passed": 4, "failed": 1, "notTested": 1, "notMeasured": 0, "coverage": 0.83, "passRate": 0.8 },
  "requirements": [{ "id": "R-03", "text": "…", "score": 0.62, "min": 0.3, "applicable": 3, "status": "Fail", "confidence": "High", "worstIndex": 4, "worstReason": "…" }],
  "perResponse": [{ "index": 0, "results": { "R-03": { "applies": true, "score": 0.9, "verdict": "met", "reason": "…" } } }]
}
```

- Requirement library routes, mirroring custom metrics: `GET /api/requirements`, `POST /api/requirements` (add parsed lines), `DELETE /api/requirements/:id`, and `POST /api/requirements/preview` (parse and validate only, no model call).
- `GET /api/artifacts` summaries gain optional `requirementsPassed`, `requirementsTested`, `requirementsSelected` for history and trends.

### Configuration (named constants)

| Name | Default | Where |
|---|---|---|
| `MAX_REQUIREMENT_WORDS` | `100` | `evaluate_requirements.py` (UI reads it from the server) |
| `MAX_REQUIREMENTS` | `50` | same |
| `REQ_BATCH_SIZE` | `10` | requirements per judge call |
| `REQ_CASE_FLOOR` | `0.50` | lowest acceptable single-response score |
| `MIN_APPLICABLE_RESPONSES` | `2` | below this, confidence is Low |
| `NOISE_BAND` | `0.12` | matches the ~12-point run-to-run variance |
| `PASS_THRESHOLD`, `BORDERLINE_MARGIN`, `JUDGE_SAMPLES` | reused | imported from `evaluate_responses.py`, never copied |
| `REQ_JUDGE_*` | falls back to `JUDGE_*`, then `TEXT_MODEL_*` | `.env` |

The UI shows an estimate before running: about `responses × ceil(requirements / REQ_BATCH_SIZE)` extra judge calls.

### Delivery phases

**Phase 1 — Input and checklist (about 2 days):** requirements panel, parse preview with word counts, checklist with check/uncheck, select all/none, remove, persistence (`/api/requirements`), ready summary. No evaluation yet; the run payload carries the checked requirements but the server ignores them until Phase 2.
- *Done when:* pasting 20 requirements shows 20 checkable bullets, a 101-word line is rejected with its line number, and the list survives a page reload.

**Phase 2 — Evaluation in the DeepEval run (about 4 days):** `evaluate_requirements.py` in its own process and session, batching, borderline re-judging, scoring model, progress phase, artifact fields, run snapshot.
- *Done when:* a run with 5 prompts and 6 checked requirements stores a result for every requirement, metric results are byte-identical to the same run with no requirements, and the requirement judge's calls contain no metric scores or reasons (checked in a test).

**Phase 3 — Requirements page and report:** see #2.

---

## Enhancement #2: The Requirements Page and Requirement Report

### Summary

A new **📋 Requirements** tab, next to Conversation, Quality Metrics, Analysis and Artifacts. It is **dedicated only to requirements** and gives them the same depth of analysis that the Quality Metrics page gives metrics. The Quality Metrics page is not changed.

### What the Requirements page shows

| Section | Contents (mirrors the Quality Metrics page) |
|---|---|
| **Summary banner** | `4 of 5 tested requirements pass`, coverage (`5 of 6 tested`), and the combined DeepEval verdict (metrics + requirements), green or red with a text label |
| **Requirement cards grid** | One card per checked requirement, like the metric badges: ID, short text, score %, bar, `✅ Pass` / `❌ Fail` / `Not tested` / `Not measured`, the weakest reason |
| **Charts** | Radar of requirement scores with the 75% line; horizontal bar chart of requirement scores coloured by status; donut of requirements by status; each with a "Show data table" |
| **Requirement × response heatmap** | Rows = requirements, columns = responses; each cell shows the score and verdict (`met` / `partial` / `violated` / `n/a`) |
| **Per-requirement breakdown** | Expandable row per requirement: full text, score, min, applicable responses, and for every response its verdict, score and the judge's reason, with the prompt and the rendered reply |
| **Not tested list** | Requirements no prompt exercised, with the advice to add prompts (static) or a suitable initial question (dynamic) |
| **Run details** | Requirement judge model, thresholds, number of judge calls, and a note that it ran in its own session |

Colour is never the only signal: every status also has a text label. Older artifacts and runs without requirements show "No requirements were selected for this run."

### History and comparison

- Artifact cards show `Requirements: 4/5 pass` when a run has requirements.
- The run comparison shows requirement pass rate before → after, and labels a change smaller than `NOISE_BAND` as noise.
- Requirement IDs are compared by text (via the snapshot), so a renumbered list still compares correctly.

### Report

- The existing **Download PDF Report** button stays exactly as it is.
- A new **Download Requirements Report** button builds a PDF from the saved artifact (the single source of truth) with: cover and overall verdict, executive summary, requirements in scope (snapshot), requirement scorecard, charts with their data tables, findings for every failing requirement (worst responses with prompt, reply excerpt and reason), not-tested list, methodology (three isolated sessions, thresholds, limitations) and a sign-off block. Page headers and "page X of Y" footers; prints correctly in greyscale.
- Exports: requirement results as **CSV** (one row per requirement, spreadsheet-safe) and the full artifact as **JSON**.
- `eval-cli.mjs` gains an opt-in `--requirements <file>` (one per line) and `--gate-requirements` to fail the CI gate on a failing requirement; without these flags the gate is unchanged.

### Delivery phase (Phase 3, about 4 days)

Requirements tab with all sections above, history line and comparison, CSV/JSON export, requirements PDF.
- *Done when:* every number on the Requirements page equals the artifact (automated check), every chart equals its data table, the Quality Metrics page is pixel-identical to a run without requirements, and the requirements PDF matches the page for the same run.

---

## Testing (both enhancements)

- `test_regression_existing_behaviour.py`: metric output of `evaluate_responses.py` is identical with and without requirements; `/api/suites`, `/api/artifacts` and old artifacts are unchanged with the flag off.
- `test_requirement_parse.py`: exactly 100 words accepted, 101 rejected with the line number; bullets, numbering, headings, blank lines, the 50 cap, NUL bytes.
- `test_requirement_evaluation.py` (stubbed model, no network): batching, borderline re-judging, `applies` handling, `Not tested` / `Not measured`, the case floor, confidence, summary counts.
- `test_requirement_isolation.py`: the requirement judge runs in a separate process with its own system prompt, and its requests never contain metric scores, metric reasons or chat history beyond the evaluated context.
- Node end-to-end test (fake model server, temporary folders): check/uncheck requirements, run DeepEval, verify the Requirements results and that unchecked requirements are not evaluated; then the same with the flag off to prove the rollback.
- Browser check: Quality Metrics tab unchanged; Requirements tab renders with no console errors; both PDFs download.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| The run's prompts never exercise a requirement | `Not tested` status and a list with advice, instead of a false pass |
| The requirement judge copies the metric judge's opinion | Separate process, separate system prompt, never given metric scores or reasons |
| Judge noise near the bar | Borderline re-judging, `NOISE_BAND`, confidence labels |
| A single clear violation hidden by an average | `REQ_CASE_FLOOR` fails the requirement |
| Requirement text contains prompt injection | Delimited "data only" framing in the judge prompt |
| Cost grows with requirements × responses | Batching, the 50 cap, and a call estimate before the run |
| Breaking the existing dashboard | Flag, separate script and UI file, guarded hooks, regression gate |

## Docs to update when this is built

- `CLAUDE.md`: a runtime note for requirement evaluation (flag, script, the third isolated session, `REQ_JUDGE_*`, constants).
- `docs/QUALITY_METRICS.md` and `docs/README_QUALITY_METRICS.md`: the requirement scoring model and how to read the Requirements page.
- `docs/QUICK_START.md`: a walkthrough from pasting requirements to the requirements report.
- `docs/ARCHITECTURE_DIAGRAM.md`: the three sessions.

## Out of scope (for now)

- Requirements over 100 words, and multi-line requirements.
- PDF, DOCX or other binary requirement files (text only for now).
- Automatically generating prompts or test cases from requirements (see below).
- Multiple reviewers or approval workflows; the report's sign-off block is a record only.

---

## Deferred idea: test-case generation from requirements

The earlier plan generated test cases from requirements in a separate section (generator + critic, human review, versioned suites `gen_<id>@vN`). It is **not part of the current direction** and must not replace requirement-based DeepEval evaluation. If it is picked up later, its only role would be optional: suggesting extra prompts for requirements that come back `Not tested`, which the user can add to a static run before clicking **Run DeepEval**.
