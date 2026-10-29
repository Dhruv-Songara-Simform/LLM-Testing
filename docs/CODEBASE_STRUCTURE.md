# DeepEval Chatbot Evaluation Framework - Complete Codebase Structure

## 📋 Overview

**SimChat DeepEval Framework** — Production-grade AI chatbot evaluation system with isolated evaluation sessions, multiple test modes, and 13+ quality metrics (8 built-in + 5 custom business metrics).

This document provides a **complete reference** to every file's purpose, key implementation details, and how components interact. Use this to understand:

- What each file does
- Where to make changes for specific features
- How data flows through the system
- Implementation patterns for extending the framework

**Key Features (Oct 2026):**

- ✅ Isolated evaluation sessions (judge never shares chatbot's session)
- ✅ LLM judge with median scoring for borderline metrics (±10 points of 75% bar)
- ✅ Multiple evaluation modes: Dynamic, Static (parallel), Suite (with Reference Match)
- ✅ 8 built-in + custom metrics + reference matching (13 total)
- ✅ Test suites: Golden (5 Q&A) + Edge Cases (15+ edge cases)
- ✅ Server-side custom metric library (persists across page reloads)
- ✅ CLI regression gate for CI/CD with baseline comparison
- ✅ Per-response breakdown with judge reasoning
- ✅ Security: localhost-only, no CORS, URL allowlist

---

## 📁 Root-Level Directory Structure

```
.
├── server.js                          🔴 Express.js main server (npm start)
├── evaluate_responses.py              🔴 LLM judge engine (spawned per evaluation)
├── evaluate_requirements.py           🟢 Requirement judge, 3rd isolated session [NEW Oct 2026]
├── requirements.json                  Saved requirement list (created on first add)
├── pytest.ini                         Disables the pip deepeval pytest plugin
├── test-requirements.mjs              E2E test, fake model (npm run test:requirements)
├── eval-cli.mjs                       🟢 CLI regression gate (npm run eval) [NEW Oct 2026]
├── test-metrics.js                    Integration test (npm run test:metrics)
├── verify-setup.sh                    Environment validation (npm run verify)
├── package.json                       npm dependencies & scripts
├── requirements.txt                   Python dependencies (optional)
├── .env                               Environment variables template
├── .gitignore                         Git exclusion rules
│
├── public/
│   ├── index.html                     Chat UI (chatbot interface)
│   └── deepeval.html                  Evaluation dashboard (6 tabs, suite support, custom metrics) [UPDATED Oct 2026]
│
├── deepeval/                          Target-architecture framework
│   ├── datasets/export_suites.py      Suite loader [NEW Oct 2026]
│   ├── evaluation/
│   │   ├── engine.py                  IsolatedEvaluator class (target arch)
│   │   ├── metrics.py                 Custom business metrics
│   │   └── __init__.py
│   ├── datasets/
│   │   ├── golden/quality_qa_set.py   5 human-reviewed Q&A pairs
│   │   ├── synthetic/edge_cases.py    15+ edge-case test cases
│   │   └── test/                      User custom tests
│   ├── tests/
│   │   ├── conftest.py                Pytest fixtures
│   │   ├── test_quality.py            Golden dataset tests
│   │   └── test_edge_cases.py         Edge case tests
│   ├── config/
│   │   ├── qa.py                      QA config (75% metrics)
│   │   └── prod.py                    Prod config (75% metrics)
│   └── ...
│
├── artifacts/                         Evaluation run storage
├── custom_metrics.json                Server-side custom metric library [NEW Oct 2026]
│
├── docs/
│   ├── CODEBASE_STRUCTURE.md          This file
│   ├── QUICK_START.md
│   ├── QUICK_REFERENCE.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   ├── QUALITY_METRICS.md
│   └── README_QUALITY_METRICS.md
│
└── reports/                           User analysis reports
```

**Legend:** 🔴 = Core (changed in Oct 2026), 🟢 = New Oct 2026, ⚪ = Existing/Unchanged

---

## 📄 File-by-File Reference

### **server.js** — Express.js Main Server 🔴

**Purpose:** HTTP server hosting chat API, evaluation orchestrator, test suite loader, and custom metrics manager.

**Core Responsibilities:**

1. Chat endpoint: forwards user messages to configured chatbot
2. Evaluation orchestrator: collects responses, calls Python judge, streams progress
3. Multiple evaluation modes: Dynamic (shared conv), Static (parallel isolated), Suite (fixed cases)
4. Test suite loading: loads golden + edge-case datasets from Python
5. Custom metrics CRUD: loads/saves `custom_metrics.json` for persistence
6. Artifact storage: saves evaluation runs to `artifacts/` folder
7. Security: URL validation, localhost-only default, no CORS

**Key Functions (Implementation Details):**

| Function                      | Purpose                                                | Key Logic                                                                |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `runPythonEvaluation()`     | Spawn`evaluate_responses.py`, stream stderr progress | Reads PROGRESS lines from stderr, final JSON from stdout                 |
| `askChatbot()`              | Single API call to chatbot endpoint                    | Handles errors, measures response time, returns`{answer, time, error}` |
| `mapWithConcurrency()`      | Parallel execution for static/suite modes              | Promise.all with worker pool, STATIC_CONCURRENCY (default 3)             |
| `endpointError()`           | Validate URL against allowlist                         | Checks protocol, hostname against ALLOWED_EVAL_HOSTS                     |
| `loadSuites()`              | Load test cases from Python datasets                   | Calls`export_suites.py`, caches result                                 |
| `readCustomMetricLibrary()` | Load saved metrics from`custom_metrics.json`         | Empty array if file doesn't exist                                        |

**Evaluation Flow (Oct 2026):**

1. Request arrives: `/api/deepeval` POST with mode, prompts, metrics, suite
2. Validate endpoint, load suite if needed
3. Set SSE headers, start progress streaming
4. If `dynamic`: one conversation, generate follow-ups inline
5. If `static` or `suite`: parallel execution via `mapWithConcurrency()`
6. Collect responses, call `runPythonEvaluation()` with prompts + responses
7. Aggregate metrics, save to `artifacts/eval_*.json`
8. Send complete event, close stream

**Routes Served:**

```javascript
POST   /api/chat                      // Chat message
GET    /api/health                    // Health check
POST   /api/deepeval                  // Evaluation (SSE stream)
GET    /api/suites                    // List test suites [NEW]
GET    /api/custom-metrics            // Load metric library [NEW]
POST   /api/custom-metrics            // Save new metric [NEW]
DELETE /api/custom-metrics/:id        // Delete metric [NEW]
GET    /api/artifacts                 // List saved runs
GET    /api/artifacts/:id             // Fetch saved run
POST   /api/generate-question         // AI question generator
POST   /api/extract-metric-name       // AI metric naming
GET    /*.(html|css|js|png|...)       // Static files
```

**Key Variables (Oct 2026):**

```javascript
const STATIC_CONCURRENCY = 3;         // Parallel prompts in static/suite mode
const CUSTOM_METRICS_FILE = 'custom_metrics.json';
const ALLOWED_EVAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', ...]);
const BUILTIN_METRIC_KEYS = {         // Label → key mapping
  'Answer Relevancy': 'answer_relevancy',
  // ... 7 more
};
```

**Environment Variables Used:**

- `TEXT_MODEL_API_KEY`, `TEXT_MODEL_BASE_URL`, `TEXT_MODEL` — Chatbot model
- `PORT` (default 3000), `HOST` (default 127.0.0.1) — Server binding
- `ALLOWED_EVAL_HOSTS` — Chatbot URL allowlist (comma-separated)
- `FEATURE_REQUIREMENTS` — Enables requirement evaluation and `/api/requirements*` (off unless `true`)
- `ARTIFACTS_DIR`, `REQUIREMENTS_FILE` — Optional overrides (used by tests to keep real data untouched)

---

### **evaluate_requirements.py** — Requirement Judge 🟢 (Oct 2026)

**Purpose:** Checks each scored reply against the checked requirements in a third isolated session (own process, own `REQ_JUDGE_SYSTEM_PROMPT`, `REQ_JUDGE_*` model), and aggregates per-requirement Pass / Fail / Not tested / Not measured with coverage and confidence. Spawned by `server.js` → `runRequirementEvaluation()` after metric scoring; also used via `config` / `parse` / `validate` modes for limits and input checks. UI: `public/requirements.js` (📋 Requirements tab). Design and scoring model: `docs/FUTURE_ENHANCEMENTS.md`.

---

### **evaluate_responses.py** — LLM Judge Engine 🔴

**Purpose:** Scores chatbot responses using an LLM judge in isolated sessions, with stricter calibration and median scoring for borderline metrics.

**Core Responsibilities:**

1. Score each response via judge API in separate session
2. Median scoring: if score ±0.1 of 75% bar, judge 3x and take median
3. Graceful fallback to heuristics if judge unavailable
4. Custom metrics support (user-defined scoring instructions)
5. Reference matching for suite mode
6. Per-response reasoning extraction

**Key Functions:**

| Function                     | Purpose                                                    | Returns                                |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `call_judge()`             | Raw API call to judge model (2 retries)                    | `{scores: {...}, ...}`               |
| `judge_once()`             | Single judge pass, extract scores from JSON                | `(scores_dict, reasons_dict)`        |
| `judge_response()`         | Main orchestrator: single call + median if borderline      | `(scores, reasons, num_samples)`     |
| `heuristic_scores()`       | Fallback: keyword overlap, toxic terms, regex metrics      | `(scores, reasons)`                  |
| `heuristic_custom_score()` | Custom metric fallback: word-limit regex, keyword matching | `score (0.0-1.0)`                    |
| `evaluate_one()`           | Score single response: try judge, fallback to heuristics   | `(scores, reasons, method, samples)` |
| `evaluate_batch()`         | Main entry: parallel evaluation via ThreadPoolExecutor(4)  | Full JSON result                       |

**Judge System Prompt (Oct 2026):**

```python
JUDGE_SYSTEM_PROMPT = """
  You are a demanding, impartial evaluator...
  Calibration anchors (use the whole scale):
  1.0  flawless: ...
  0.9  excellent with only cosmetic nitpicks
  0.75 acceptable but with a clear, specific weakness
  0.5  significant problems
  0.25 mostly fails
  0.0  completely fails
  
  For each metric, first identify the most important weakness (or state none),
  then score. Return ONLY a JSON object: {"scores": {"<metric_key>": {"reason": "...", "score": <number>}}}
"""
```

**Median Scoring (Oct 2026):**

- If `BORDERLINE_MARGIN` (0.1) of `PASS_THRESHOLD` (0.75): score is ±0.75±0.1 = [0.65-0.85]
- Judge 3 times, take median (reduces noise ~12 points/metric/run)
- Track `judge_samples` per response: 1 (single) or 3 (borderline)

**Input (stdin JSON):**

```json
{
  "prompts": ["Q1", "Q2"],
  "responses": ["R1", "R2"],
  "custom_metrics": [{"id": "c1", "name": "Conciseness", "desc": "Under 200 words"}],
  "selected_metrics": ["answer_relevancy", "faithfulness"],
  "system_prompt": "You are a QA engineer",
  "isolated": true,
  "references": ["Expected answer 1", "Expected answer 2"]
}
```

**Output (stdout JSON):**

```json
{
  "individual_metrics": [
    {"answer_relevancy": 0.95, "faithfulness": 0.92, "custom_c1": 1.0},
    {"answer_relevancy": 1.0, "faithfulness": 0.98, "custom_c1": 0.8}
  ],
  "individual_reasons": [
    {"answer_relevancy": "Directly addresses...", "custom_c1": "174 words, under 200"},
    {"answer_relevancy": "Comprehensive...", "custom_c1": "189 words, under 200"}
  ],
  "judge_samples": [1, 3],
  "aggregated_metrics": {
    "answer_relevancy": {
      "avg": 0.975,
      "min": 0.95,
      "max": 1.0,
      "all": [0.95, 1.0],
      "threshold": 0.75,
      "passed": true,
      "worst_reason": "Minor wording could be clearer"
    },
    "custom_c1": {
      "avg": 0.9,
      "min": 0.8,
      "max": 1.0,
      "threshold": 0.75,
      "passed": true,
      "worst_reason": "189 words, under 200"
    }
  },
  "unmeasured_metrics": ["contextual_precision"],
  "scoring_method": "llm_judge",
  "judge_model": "deepseek-chat",
  "overall_pass": true,
  "metrics_passed": 2,
  "metrics_total": 2
}
```

**Heuristic Fallback (No Judge):**

- **answer_relevancy:** keyword overlap (p ∩ r / |p|) + refusal detection (0.3-1.0)
- **toxicity:** count toxic terms, 1.0 - (terms / max)
- **custom metrics:** word-limit regex, keyword matching (concise/detailed/refusal/example)
- **other metrics:** report as `unmeasured_metrics` (NOT fabricated)

**Environment Variables:**

- `JUDGE_MODEL`, `JUDGE_API_KEY`, `JUDGE_BASE_URL` — Use different judge (recommended)
- Falls back to `TEXT_MODEL_*` if judge not set
- `JUDGE_MAX_WORKERS` (default 4) — ThreadPoolExecutor pool size
- `JUDGE_TIMEOUT_SECONDS` (default 120) — Judge API timeout

---

### **eval-cli.mjs** — CI Regression Gate 🟢 [NEW OCT 2026]

**Purpose:** Command-line evaluation with regression detection for CI/CD pipelines. Exit codes guide build pass/fail.

**Core Responsibilities:**

1. Run evaluations from command line (dynamic/static/suite modes)
2. Compare against baseline (previous run with same endpoint + suite/mode)
3. Detect regressions: metric below 75% OR drops > max-drop points
4. Exit with 0 (pass), 1 (gate failed), 2 (error)
5. Generate JSON reports for CI artifacts

**Key Features:**

- `--suite golden|edge_cases` — Fixed test suites (default: golden)
- `--dynamic "question" --turns 5` — AI-generated follow-ups
- `--prompts "q1|q2|..."` or `--prompts-file path.txt` — Static tests
- `--baseline latest|none|runId` — Compare against (default: latest same suite/mode)
- `--max-drop 10` — Fail if metric drops >10 points (default 10, typical variance ~12)
- `--metrics "Answer Relevancy,Faithfulness"` or `all` (default all)
- `--custom all|none|cm_abc123` — Include saved custom metrics
- `--start-server` — Automatically start server.js, kill after run
- `--out file.json` — Write JSON report for CI artifacts

**Example Usage:**

```bash
npm run eval -- --suite golden --start-server --max-drop 5
npm run eval -- --dynamic "Explain ML" --turns 3 --metrics "Answer Relevancy,Hallucination"
npm run eval -- --prompts "What is AI?|What is ML?" --baseline none
npm run eval -- --suite edge_cases --custom all --out results.json
```

**Output Format:**

```
Evaluating http://localhost:3000/api/chat with suite "golden"...

Run eval_2026-10-06_19-30-14_a1b2c3 · scored by llm_judge (deepseek-chat)
Baseline: eval_2026-10-06_19-25-45_x9y8z7 (10/6/2026, 7:25:45 pm)

Metric                      Score   Base     Δ  Result
Answer Relevancy              91%    92%    -1  PASS
Faithfulness                  99%    97%    +2  PASS
Reference Match               65%    60%    +5  FAIL

Quality gate: FAILED
  - Reference Match is 65% (below 75%)
  - Reference Match dropped 5 points vs baseline (max 10)

exit 1
```

**Exit Codes:**

- `0` — Gate passed (all metrics ≥75%, drops ≤max-drop)
- `1` — Gate failed (metrics below threshold or excessive regression)
- `2` — Error (bad args, server unreachable, metric not found, etc.)

**Baseline Logic (Oct 2026):**
Finds previous run where:

- `scoring_method ≠ 'legacy'` (excludes old fixed-score runs)
- `evaluationMode === current_mode` (dynamic/static/suite match)
- `suiteId === current_suite` (if suite mode: same suite)
- `apiEndpoint === current_endpoint` (same chatbot being tested)
- Picks most recent; if `--baseline` specifies run ID, validates it exists

---

### **public/deepeval.html** — Evaluation Dashboard 🟢 [MAJOR UPDATE OCT 2026]

**Purpose:** Web UI for configuring evaluations, viewing results, managing suites/custom metrics, and tracking trends.

**6 Main Tabs:**

1. **Conversation** — Chat history from last evaluation run
2. **Quality Metrics** — Metric cards (Score/Pass badge with judge reasoning), Radar chart, Bar chart
3. **Analysis** — Evaluation config table, scoring method, failed responses
4. **Export** — PDF report download, JSON export
5. **Artifacts** — Run history with comparison vs previous run, 15-run trend chart
6. **Settings** — Custom metric library management

**Key Features (Oct 2026):**

| Feature                | Location            | Implementation                                                                              |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| Evaluation modes       | Dropdown            | Dynamic/Static/Suite selection                                                              |
| Test suites            | Suite mode UI       | Loads from`GET /api/suites`, displays case count + categories                             |
| Metric selection       | Checkboxes          | 8 built-in + custom + reference_match (for suites)                                          |
| Custom metrics         | Input + library     | Add (POST /api/custom-metrics) / Delete (DELETE /api/custom-metrics/:id) [server-persisted] |
| Progress streaming     | Progress bar        | Consumes SSE, shows real-time percent + message                                             |
| Metric cards           | Quality Metrics tab | Name, score%, Pass/Fail badge, worst_reason (judge explanation)                             |
| Per-response breakdown | Quality Metrics tab | Expandable rows: prompt, response, expected answer (suites), each metric + reason [NEW]     |
| Radar/bar charts       | Charts section      | Multi-dimensional view with 75% threshold line                                              |
| Run comparison         | Artifacts tab       | Previous run of same suite/mode → delta % + colored badge per metric [NEW]                 |
| Trend chart            | Artifacts tab       | Last 15 judge-scored runs: line chart avg score + pass rate vs 75% bar [NEW]                |
| PDF export             | Export tab          | 4+ pages: config, summary, conversation, per-response reasons, best/worst                   |
| JSON export            | Export tab          | Actual run data (conversationId, scores, custom metrics, etc.)                              |

**Per-Response Breakdown (Oct 2026):**

```html
<details>
  <summary>
    #1 · golden_001 What is artificial intelligence?
    [Chip1: 90%] [Chip2: 95%] [Chip3: 100%]
  </summary>
  <div>
    <div>Expected: Should cover: machines, learning, data...</div>
    <div>Response: **Artificial intelligence (AI)** is the field...</div>
    <table>
      <tr><td>Answer Relevancy</td><td>90%</td><td>Directly addresses but...</td></tr>
      <tr><td>Faithfulness</td><td>95%</td><td>Claims are accurate...</td></tr>
    </table>
  </div>
</details>
```

**Custom Metrics (Oct 2026):**

- Load on page init from `GET /api/custom-metrics`
- Add: fill description → `POST /api/custom-metrics` (server extracts name) → save to `custom_metrics.json`
- Delete: click ✕ button → `DELETE /api/custom-metrics/:id` → remove from library
- Persist across page reloads (server-side storage)
- Display with 🎯 icon in metrics list

**Run Comparison (Oct 2026):**

- Loads previous run (same endpoint + suite/mode)
- Metric-by-metric comparison: Previous | This Run | Δ (points) | color-coded badge
- Example: "Answer Relevancy: 92% → 91% (Δ -1), Faithfulness: 97% → 99% (Δ +2)"

**History Trend (Oct 2026):**

- Filters to last 15 judge-scored runs (excludes legacy)
- Line chart: X-axis = run date, Y-axis = score (0-100%)
- Shows avg score + pass rate lines, 75% threshold reference
- Helps spot gradual degradation over time

**Key Variables/Structures:**

```javascript
currentEvaluation = {
  conversationId,
  evaluationMode: 'dynamic|static|suite',
  suiteId, suiteName,
  prompts: [],
  responses: [],
  qualityMetrics: {
    "answer_relevancy": {
      avg, min, max, passed, worst_reason, ...
    }
  },
  individualMetrics: [{ answer_relevancy: 0.9, ... }, ...],
  individualReasons: [{ answer_relevancy: "...", ... }, ...],
  evaluatedIndices: [0, 1],
  failedResponses: [{ index, error }, ...],
  scoringMethod: 'llm_judge|heuristic|mixed',
  judgeModel,
  overallPass
};

customMetrics = [
  { id: 'cm_abc123', name: 'Conciseness', desc: '...', createdAt: '...' }
];
```

**Key Functions:**

- `runDeepEval()` — Main orchestrator
- `displayMetrics()` — Render cards + charts
- `displayResponseBreakdown()` — Per-response table
- `loadSuites()` — Fetch test suite list
- `loadCustomMetricLibrary()` — Load saved metrics from server
- `addCustomMetric()` — POST new metric
- `removeCustomMetric()` — DELETE metric
- `renderRunComparison()` — Previous vs current comparison
- `renderHistoryTrend()` — 15-run line chart
- `generatePDF()` — html2canvas → jsPDF (with scrollX:0, scrollY:0 fix)

---

### **deepeval/datasets/export_suites.py** — Suite Loader 🟢 [NEW OCT 2026]

**Purpose:** Load golden and edge-case datasets from Python files, export as JSON for server.js.

**Key Functions:**

- `golden_suite()` — Returns golden Q&A cases with reference field
- `edge_suite()` — Returns edge-case questions with expected behaviors
- Output: JSON list of suites

**Output Format (used by server.js):**

```python
[
  {
    "id": "golden",
    "name": "Golden Quality Q&A Set",
    "description": "Human-reviewed production-quality examples",
    "cases": [
      {
        "id": "golden_001",
        "category": "general_knowledge",
        "prompt": "What is artificial intelligence?",
        "reference": "Should cover: machines, learning, data, decision, algorithm. Length: 30-200 words."
      }
    ]
  },
  {
    "id": "edge_cases",
    "name": "Edge Case & Synthetic Test Set",
    "description": "Programmatically generated edge cases",
    "cases": [
      {
        "id": "edge_empty_001",
        "category": "empty",
        "prompt": "",
        "reference": "Should request clarification"
      }
    ]
  }
]
```

**Note:** Loads by file path, avoids importing `deepeval` package (which shadows pip library).

---

### **deepeval/datasets/golden/quality_qa_set.py**

**Purpose:** Human-reviewed baseline Q&A pairs defining production-quality responses.

**Contains:** 5 golden questions with:

```python
{
    "id": "golden_001",
    "category": "general_knowledge|technical_accuracy|practical_application|edge_case|multi_turn",
    "question": "What is artificial intelligence?",
    "expected_elements": ["machines", "learning", "data", "decision", "algorithm"],
    "min_length_words": 30,
    "max_length_words": 200,
    "should_cite_sources": False,
    "difficulty": "easy|medium|hard"
}
```

**Used By:**

- Suite mode evaluation (Reference Match metric)
- CI regression gate (--suite golden)
- Historical baseline comparison

---

### **deepeval/datasets/synthetic/edge_cases.py**

**Purpose:** Auto-generated edge cases testing robustness and error handling.

**Contains:** 15+ cases across 6 categories:

1. Empty/Null (3) — "", None, whitespace
2. Length Boundary (3) — 2 chars, 500 words, 10k repeated
3. Encoding (3) — Unicode, emojis, special chars
4. Adversarial (3) — Impossible, contradictions, ambiguity
5. Performance (2) — Heavy computation, recursion
6. Security (2) — Prompt injection, SQL injection strings

**Each case includes:**

```python
{
    "id": "edge_empty_001",
    "question": "",
    "description": "Empty question string",
    "expected_behavior": "should request clarification"
}
```

**Used By:**

- Suite mode evaluation (Reference Match metric)
- CI regression gate (--suite edge_cases)
- Edge-case robustness testing

---

### **deepeval/config/qa.py & prod.py**

**Purpose:** Environment-specific configuration (both now unified at 75% per metric).

**Key Contents:**

```python
# Both files now set METRIC_THRESHOLDS = {metric: 0.75 for all}
METRIC_THRESHOLDS = {
    "answer_relevancy": 0.75,
    "faithfulness": 0.75,
    # ... all set to 0.75 (unified Oct 2026)
}

# QA: Sequential, verbose
EVALUATION_CONFIG = {
    "timeout_seconds": 300,
    "max_retries": 3,
    "parallel_evaluations": False,
}

# Prod: Parallel, minimal
EVALUATION_CONFIG = {
    "timeout_seconds": 300,
    "parallel_evaluations": True,
    "batch_size": 50,
}

# Dataset pass-rate targets (differ by env)
DATASET_CONFIG = {
    "golden": {"min_pass_rate": 0.85},  # QA
    "golden": {"min_pass_rate": 0.95},  # Prod
}
```

---

### **deepeval/tests/conftest.py**

**Purpose:** Pytest fixtures shared across all test files.

**Provides:**

- `evaluator` — IsolatedEvaluator instance
- `qa_config`, `prod_config` — Configuration objects
- `golden_dataset` — Golden Q&A set
- `edge_cases` — Edge-case dataset

**Usage:** Used by test files to avoid redundant setup.

---

### **package.json** — npm Scripts & Dependencies

**Key Scripts:**

```json
{
  "scripts": {
    "start": "node server.js",
    "test:metrics": "node test-metrics.js",
    "eval": "node eval-cli.mjs",
    "verify": "bash verify-setup.sh"
  },
  "dependencies": {
    "express": "^4.x",
    "axios": "^1.x",
    "dotenv": "^16.x",
    "html2canvas": "^1.x",
    "jspdf": "^2.x"
  }
}
```

---

### **.env** — Environment Variables Template

**Required:**

```
TEXT_MODEL_API_KEY=sk-xxx
TEXT_MODEL_BASE_URL=https://api.deepseek.com/v1
TEXT_MODEL=deepseek-chat
```

**Optional:**

```
PORT=3000
HOST=127.0.0.1
JUDGE_MODEL=deepseek-chat          # Different judge model (recommended)
JUDGE_API_KEY=sk-yyy
JUDGE_BASE_URL=https://api.deepseek.com/v1
ALLOWED_EVAL_HOSTS=localhost,192.168.1.100
```

---

### **artifacts/** — Evaluation Runs Storage

**Contains:** `eval_*.json` files (one per run).

**Filename Format:** `eval_YYYY-MM-DD_HH-mm-ss_XXXXXX.json` (random suffix ensures uniqueness even within same second)

**Contents:**

```json
{
  "conversationId": "eval_2026-10-06_19-30-14_a1b2c3",
  "conversations": [...],
  "metrics": {
    "prompts": [...],
    "responses": [...],
    "qualityMetrics": {
      "answer_relevancy": { "avg": 0.95, "passed": true, "worst_reason": "..." },
      ...
    },
    "individualMetrics": [...],
    "individualReasons": [...],
    "judgeSamples": [1, 3, 1],
    "evaluatedIndices": [0, 1, 2],
    "failedResponses": [],
    "evaluationMode": "suite",
    "suiteId": "golden",
    "scoringMethod": "llm_judge",
    "judgeModel": "deepseek-chat",
    "overallPass": true,
    ...
  },
  "createdAt": "2026-10-06T19:30:14.000Z"
}
```

---

### **custom_metrics.json** — Custom Metric Library 🟢 [NEW OCT 2026]

**Purpose:** Server-side persistence of user-defined metrics (survives page reload).

**Format:**

```json
[
  {
    "id": "cm_1726000614xyz",
    "name": "Conciseness",
    "desc": "Response should be concise, under 200 words",
    "createdAt": "2026-10-06T19:30:14.000Z"
  },
  {
    "id": "cm_1726000620abc",
    "name": "Actionability",
    "desc": "Response must give concrete, actionable steps with examples",
    "createdAt": "2026-10-06T19:30:20.000Z"
  }
]
```

**Management:**

- Max 50 metrics per library
- Auto-generated unique ID: `cm_` + timestamp.toString(36) + random hex
- Loaded at dashboard startup, never lost on page reload
- Editable via dashboard UI or direct file edit

---

## 🔄 Data Flow & Integration

### Evaluation Flow (Oct 2026)

```
User opens deepeval.html
        ↓
Loads suites (GET /api/suites) + custom metrics (GET /api/custom-metrics)
        ↓
User configures: mode (dynamic/static/suite), prompts, metrics, system prompt
        ↓
Click "Run DeepEval" → POST /api/deepeval (JSON)
        ↓
server.js validates endpoint, loads suite if needed
        ↓
Collects responses from chatbot:
  - Dynamic: 1 conversation, each prompt sent once, AI-generates follow-ups
  - Static: multiple conversations in parallel (STATIC_CONCURRENCY=3)
  - Suite: test cases in parallel, 1 conversation each
        ↓
Sends responses to evaluate_responses.py via stdin
        ↓
Python: Judge each response in isolated session
  - If borderline (±0.1 of 0.75): judge 3×, take median
  - Fallback heuristics if judge unavailable
  - Return scores + per-response reasoning
        ↓
server.js aggregates, saves to artifacts/, sends complete event (SSE)
        ↓
deepeval.html renders:
  - Metric cards with worst_reason tooltip
  - Per-response breakdown with expected answers + judge reasoning
  - Comparison with previous run (same suite/mode)
  - Trend chart of last 15 runs
  - Export to PDF or JSON
```

### Custom Metric Flow (Oct 2026)

```
User fills "Response should be under 200 words"
        ↓
Click "Add Metric" → POST /api/extract-metric-name
        ↓
LLM extracts name: "Conciseness"
        ↓
Server saves to custom_metrics.json, assigns unique ID
        ↓
Dashboard shows metric in checkboxes with 🎯 icon
        ↓
User checks it and runs evaluation
        ↓
Python judge receives custom instruction:
  "custom_abc123 (Conciseness): measure how well response satisfies:
   'Response should be under 200 words'"
        ↓
Judge scores metric, returns score + reason
        ↓
Dashboard displays card: "🎯 Conciseness 85% PASS"
        ↓
On page reload: custom metrics reloaded from custom_metrics.json (NOT lost)
```

### CLI Regression Gate Flow (Oct 2026)

```
npm run eval -- --suite golden --start-server --max-drop 10
        ↓
Starts server.js, waits for /api/health
        ↓
Runs golden suite evaluation
        ↓
Fetches previous golden runs from /api/artifacts
        ↓
Finds baseline: most recent golden run (same endpoint)
        ↓
Compares metrics: score vs baseline, calculates Δ
        ↓
Fails if:
  - Any metric < 75%
  - Any metric Δ > 10 points
  - Any chatbot call failed
        ↓
Prints table: Metric | Score | Baseline | Δ | Result
        ↓
Exits 0 (pass) or 1 (fail)
        ↓
If --out specified: writes JSON report
```

---

## 🛠️ Key Implementation Patterns

### Pattern: Adding a Built-in Metric

1. Add definition to `BUILTIN_METRICS` dict in `evaluate_responses.py`
2. Add to `BUILTIN_METRIC_KEYS` map in `server.js`
3. Include in `JUDGE_SYSTEM_PROMPT` instruction
4. Test via `evaluate_responses.py` directly

### Pattern: Adding a Custom Metric (User-Facing)

1. User fills description in dashboard
2. `POST /api/custom-metrics` (name extracted by LLM)
3. Saved to `custom_metrics.json` + loaded on next page init
4. Included in `selected_metrics` when running evaluation
5. Python judge receives as instruction: `custom_{id}: {description}`

### Pattern: Adding a Suite Case

1. Edit `deepeval/datasets/golden/quality_qa_set.py` or `edge_cases.py`
2. Add entry with `id`, `prompt`, `reference` (expected answer)
3. `export_suites.py` automatically includes in output
4. Suite mode evaluation scores against reference

### Pattern: Median Scoring (Oct 2026)

1. Judge scores response once
2. If score in [0.65, 0.85] (±0.1 of 0.75):
   - Schedule 2 more judgments
   - Collect 3 scores total
   - Take median
3. Track as `judge_samples = 3` (vs 1 for non-borderline)

### Pattern: Parallel Static Execution

1. Collect all test cases
2. Call `mapWithConcurrency(cases, STATIC_CONCURRENCY, async fn)`
3. Each case runs in own conversation (prevents contamination)
4. Results assembled back in order
5. All sent to Python at once for scoring

---

## 📊 Metrics & Thresholds (Oct 2026)

**Unified Bar:** All 13 metrics use 0.75 (both QA and Prod).

| Metric                   | Measures                    | Fallback                            | Best Effort |
| ------------------------ | --------------------------- | ----------------------------------- | ----------- |
| Answer Relevancy         | Addresses question directly | Keyword overlap + refusal detection | Judge       |
| Faithfulness             | Facts accurate              | None (needs judge)                  | Judge       |
| Contextual Precision     | Only relevant context used  | None (needs judge)                  | Judge       |
| Contextual Recall        | All context covered         | None (needs judge)                  | Judge       |
| Contextual Relevancy     | On-topic, no digression     | None (needs judge)                  | Judge       |
| Hallucination            | No fabricated facts         | None (needs judge)                  | Judge       |
| Toxicity                 | Safe language               | Toxic term counting                 | Judge       |
| Summarization            | Dense, accurate             | None (needs judge)                  | Judge       |
| Reference Match (Suites) | Meets expected answer       | None (needs judge)                  | Judge       |
| Conciseness (Custom)     | Word limit                  | Regex word-count                    | Judge       |
| ... other custom         | User-defined                | Regex keyword matching              | Judge       |

---

## 🔒 Security Features (Oct 2026)

1. **No CORS Middleware** — Cross-origin requests fail at preflight
2. **No Form-Body Parser** — Prevents POST from browsers (JSON-only)
3. **URL Allowlist** — `ALLOWED_EVAL_HOSTS` limits chatbot targets
4. **Localhost-Only Default** — `HOST=127.0.0.1` (need explicit HOST=0.0.0.0 to expose)
5. **No Redirect Following** — Axios maxRedirects=0
6. **Input Validation** — Prompts, metrics, endpoints validated before use

---

## 🎯 Best Practices by Role

**For Developers:**

- Edit scoring logic in `evaluate_responses.py` (live evaluation)
- Edit dashboard in `public/deepeval.html`
- Add routes in `server.js`
- Framework code in `deepeval/` is target architecture (not yet live)

**For QA/Testing:**

- Add golden cases to `deepeval/datasets/golden/quality_qa_set.py`
- Use suite mode for reproducible runs
- Use `npm run eval -- --suite golden` in CI
- Track 15-run trend to spot regressions

**For Product Managers:**

- Custom metrics defined via dashboard UI (no coding needed)
- Use PDF export for stakeholder reports
- Run comparison shows improvement/regression per metric
- Baseline comparison enables A/B testing of chatbot versions

---

## 📞 Quick Lookup Table

| Need                        | File                                                  | Line/Function                                          |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Change pass threshold       | `evaluate_responses.py`                             | `PASS_THRESHOLD = 0.75`                              |
| Add built-in metric         | `evaluate_responses.py`                             | `BUILTIN_METRICS` dict + `JUDGE_SYSTEM_PROMPT`     |
| Adjust judge model          | `.env`                                              | `JUDGE_MODEL`, `JUDGE_API_KEY`, `JUDGE_BASE_URL` |
| Change parallel concurrency | `server.js`                                         | `STATIC_CONCURRENCY = 3`                             |
| Add custom metric (UI)      | `public/deepeval.html`                              | Dashboard → Settings tab                              |
| Add golden Q&A              | `deepeval/datasets/golden/quality_qa_set.py`        | `get_quality_questions()`                            |
| Add edge case               | `deepeval/datasets/synthetic/edge_cases.py`         | `generate_*_cases()` method                          |
| CI regression gate          | `eval-cli.mjs`                                      | `npm run eval --`                                    |
| Per-response reasoning      | `evaluate_responses.py` → `public/deepeval.html` | `individual_reasons` + breakdown UI                  |
| Run comparison              | `public/deepeval.html`                              | `renderRunComparison()`                              |
| Trend analysis              | `public/deepeval.html`                              | `renderHistoryTrend()`                               |
| Requirement evaluation      | `evaluate_requirements.py` → `public/requirements.js` | `REQ_*` constants, 📋 Requirements tab             |

---

## 📝 Version & Last Update

**Current Version:** 1.1.0
**Last Updated:** October 6, 2026
**Status:** Production-Ready

**Oct 2026 Major Changes:**

- ✅ LLM judge with stricter calibration + median scoring for borderline metrics
- ✅ Test suites (golden + edge-cases) with Reference Match metric
- ✅ Static mode: isolated conversations + parallel execution (3 at a time)
- ✅ CLI regression gate with baseline comparison (eval-cli.mjs)
- ✅ Per-response breakdown with judge reasoning
- ✅ Server-side custom metric library (persists across reloads)
- ✅ Run comparison and 15-run trend analytics
- ✅ Security hardening: no CORS, URL allowlist, localhost-only default

---

**For more details on a specific topic, see:**

- **CLAUDE.md** — Architecture constraints & design principles
- **README.md** — Quick start & API overview
- **QUICK_START.md** — Installation & setup guide
- **QUALITY_METRICS.md** — Detailed metric definitions
- **ARCHITECTURE_DIAGRAM.md** — Visual data flow diagrams
