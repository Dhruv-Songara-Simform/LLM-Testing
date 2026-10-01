# CLAUDE.md - DeepEval Framework Project Guide

## Project Overview

**SimChat DeepEval Framework** — Production-grade AI chatbot evaluation system with isolated evaluation sessions and 15+ quality metrics.

**Key Distinction:** This is NOT just a chatbot dashboard. It's an enterprise evaluation framework that measures chatbot quality across multiple dimensions with an important innovation: **isolated evaluation sessions** that prevent chat context bias.

---

## Critical Design Principle: Session Isolation

**CORE PRINCIPLE:** Never evaluate a response using the same LLM session that generated it.

```python
# ❌ WRONG (Biased)
response = chatbot("What is AI?")  # chat_session_1
score = judge("Is this good?", response)  # SAME session - BIASED

# ✅ RIGHT (Objective)
response = chatbot("What is AI?")  # chat_session_1
score = evaluator.evaluate(response)  # eval_session_2 (SEPARATE) - UNBIASED
```

**Why:** The chatbot's reasoning contaminates the judge's objectivity. Separate sessions prevent this.

**Implementation:** `deepeval/evaluation/engine.py` → `IsolatedEvaluator` class creates separate session contexts.

---

## ⚠️ Actual Runtime Architecture (read this before touching evaluation code)

There are **two parallel evaluation code paths** in this repo. Know which one you're editing:

1. **What actually runs today:** `server.js` (root) spawns `evaluate_responses.py` (root) as a subprocess for every evaluation request from `public/deepeval.html`. This is the live, production code path — it computes scores, applies the unified 75% pass/fail bar, and feeds `public/deepeval.html`'s Quality Metrics tab.
2. **The `deepeval/` framework package** (`evaluation/engine.py`, `IsolatedEvaluator`, `metrics.py`, `config/qa.py`, `config/prod.py`, `datasets/`, `tests/`) is a more elaborate, isolated-session evaluation library. **It is not yet wired into `server.js`** — nothing currently imports or spawns `engine.py`. Treat it as the target architecture to migrate to, not the current runtime.
3. **`src/`** contains a byte-for-byte mirror of `server.js`, `public/*.html`, and the `deepeval/` package, created during the folder reorganization. It is **not used by `npm start`** (package.json's `main`/`start` script points at the root `server.js`). Keep it in sync manually whenever you touch the root files — there is no build step that does this for you.

**Practical rule:** if your change needs to show up when the user runs `npm start`, it must land in the root `evaluate_responses.py` / `server.js` / `public/deepeval.html` — not just `deepeval/evaluation/engine.py`. Mirror the same edit into `src/` afterward so the two trees don't drift.

---

## Project Structure

```
deepeval/
├── evaluation/
│   ├── engine.py          ⭐ MAIN: IsolatedEvaluator class
│   ├── metrics.py         Custom business metrics (5 types)
│   └── __init__.py
├── datasets/
│   ├── golden/            Human-verified baseline data
│   ├── synthetic/         Auto-generated edge cases
│   └── test/              (User custom tests - extensible)
├── tests/
│   ├── conftest.py        Pytest fixtures
│   ├── test_quality.py    Golden dataset tests
│   └── test_*.py          More test files
├── config/
│   ├── qa.py              QA environment (70% thresholds)
│   ├── prod.py            Production (80%+ thresholds)
│   └── __init__.py
├── reports/
│   ├── runs/              Evaluation result JSONs
│   └── custom/            Custom reports
└── ... (utils, logs, ci)
```

**DO NOT:** Add new top-level directories without clear purpose. Follow feature-based organization, not layer-based.

---

## Key Files to Understand

### `deepeval/evaluation/engine.py` (MAIN)
- **Class:** `IsolatedEvaluator`
- **Key Methods:**
  - `evaluate_single(prompt, response)` → Dict[str, float] (one response)
  - `evaluate_batch(prompts, responses)` → Dict[str, Any] (multiple responses)
  - `compute_heuristic_metrics()` → Fallback if DeepEval unavailable
- **Key Feature:** Creates separate `EvaluationSession` (not same as chat)
- **Design:** Graceful degradation - works with or without DeepEval

### `deepeval/config/qa.py` and `prod.py`
- **Unified metric bar:** Both `qa.py` and `prod.py` set every entry in `METRIC_THRESHOLDS` to **0.75** — one quality bar per metric regardless of environment (updated Sep 2026; previously QA was 70%+/Prod was 80%+, varied per metric).
- **What still differs between QA/Prod:** execution mode (sequential vs parallel), logging verbosity, alerting, and the golden/synthetic **dataset pass-rate** targets (see Configuration Philosophy below) — those are unchanged.
- **Never hardcode thresholds in code** — use config files
- **Live runtime today:** the actual dashboard reads `PASS_THRESHOLD = 0.75` directly from `evaluate_responses.py` (root), not from these config files — see the Actual Runtime Architecture note above.

### `deepeval/datasets/golden/quality_qa_set.py`
- 5 production-quality Q&A pairs
- Human-reviewed baseline for "good" responses
- Add more examples here as you encounter important test cases
- **Format:** Dict with id, question, expected_elements, difficulty, etc.

### `deepeval/datasets/synthetic/edge_cases.py`
- 20+ auto-generated edge cases
- Categories: empty inputs, length boundaries, Unicode, adversarial, security
- Tests robustness and error handling
- Add more edge cases as you discover gaps

### `deepeval/tests/conftest.py`
- Pytest fixtures for all tests
- Fixtures: `evaluator`, `qa_config`, `prod_config`, `golden_dataset`, `edge_case_dataset`
- **Use these fixtures** in all test functions

---

## Common Tasks & Approaches

### Task: Add a Custom Metric
1. Create class in `deepeval/evaluation/metrics.py`
2. Inherit from or follow `MetricResult` pattern
3. Implement `measure()` method returning `MetricResult`
4. Add to `evaluate_all_custom_metrics()` function
5. Import in `deepeval/evaluation/__init__.py`
6. Create test in `deepeval/tests/test_custom_metric.py`

**Example:**
```python
class MyCustomMetric:
    def measure(self, response):
        score = compute_score(response)
        return MetricResult(
            name="my_metric",
            score=score,
            reasoning="why this score",
            passed=score >= 0.75
        )
```

### Task: Add Golden Example
1. Open `deepeval/datasets/golden/quality_qa_set.py`
2. Add to `GoldenQASet.get_quality_questions()` list
3. Include: id, category, question, expected_elements, min/max length, difficulty
4. Follow existing format (consistency matters)
5. Test: `pytest deepeval/tests/test_quality.py -v`

### Task: Add Edge Case
1. Open `deepeval/datasets/synthetic/edge_cases.py`
2. Add to appropriate `generate_*_cases()` method
3. Include: id, question, description, expected_behavior
4. Test: `pytest deepeval/tests/test_edge_cases.py -v`

### Task: Modify Thresholds
1. **For the live dashboard:** Edit `PASS_THRESHOLD` in `evaluate_responses.py` (root) — this is what actually gates the Pass/Fail badges users see. Mirror the edit into `src/server/evaluate_responses.py`.
2. **For the `deepeval/` framework:** Edit `deepeval/config/qa.py` and `deepeval/config/prod.py` → `METRIC_THRESHOLDS` (currently both set to 0.75 uniformly — change both together, they're meant to stay in lockstep unless you have a specific reason to diverge them again).
3. **NEVER hardcode** thresholds in evaluation logic without a named constant (e.g. `PASS_THRESHOLD`)
4. **Document why** you changed each threshold — update this file and `docs/QUALITY_METRICS.md`
5. Run tests after changes: `pytest deepeval/tests/ -v`

### Task: Write a Test
1. Create file: `deepeval/tests/test_mytest.py`
2. Use fixtures from `conftest.py`: `evaluator`, `golden_dataset`, etc.
3. Follow pytest conventions
4. Mark with `@pytest.mark.golden` or `@pytest.mark.synthetic` as appropriate
5. Run: `pytest deepeval/tests/test_mytest.py -v`

**Example:**
```python
def test_answer_relevancy(evaluator, golden_dataset):
    for question in golden_dataset["questions"]:
        response = chatbot(question["question"])
        metrics = evaluator.evaluate_single(question["question"], response)
        assert metrics["answer_relevancy"] >= 0.70, f"Failed for {question['id']}"
```

### Task: Integrate with Server
1. In `server.js` (root — this is what `npm start` actually runs)
2. After chat response generated, call Python evaluation (current live code, in `runPythonEvaluation`):
   ```javascript
   const pythonProcess = spawn('python3', [join(__dirname, 'evaluate_responses.py')]);
   pythonProcess.stdin.write(JSON.stringify({prompts, responses}));
   pythonProcess.stdout.on('data', (data) => {
     const metrics = JSON.parse(data);
     // metrics.aggregated_metrics now includes { avg, min, max, threshold, passed, status } per metric
     // plus top-level pass_threshold, metrics_passed, metrics_total, overall_pass_rate, overall_pass
   });
   ```
3. Pass metrics to dashboard for visualization (`metrics.qualityMetrics`, `metrics.overallPass`, etc.)
4. Test with: `npm run test:metrics`
5. **Future work:** migrating this to spawn `deepeval/evaluation/engine.py`'s `IsolatedEvaluator` instead is the intended direction — not yet done.

### ⚠️ `/api/deepeval` is now a Server-Sent Events stream, not a single JSON response (Sep 2026)

The route used to block until the whole run finished, then send one `res.json(...)`. It now sends `Content-Type: text/event-stream` and writes multiple `data: {...}\n\n` events as the run progresses, ending with `res.end()`:

- `{"type": "progress", "percent": <0-100>, "message": "..."}` — one per chat response collected (`server.js`'s main prompt loop and `generateDynamicPrompts`'s per-turn callback) and one per response scored (`evaluate_responses.py` prints `PROGRESS:<done>:<total>` to **stderr**, which `runPythonEvaluation`'s `onProgress` callback in `server.js` parses out of the subprocess's stderr stream — stdout is reserved for the final JSON result only).
- `{"type": "complete", "success": true, "conversationId": ..., "metrics": {...}, "artifactPath": "..."}` — same payload shape the old single JSON response used to send, now as the terminal event.
- `{"type": "error", "error": "..."}` — sent instead of `complete` on failure.

**Why:** the old design meant the progress bar had no real signal to show — it advanced to ~10% client-side, then sat frozen for the entire evaluation (which can take 30s-4min), then jumped straight to 100% once the one blocking response arrived. Streaming lets `public/deepeval.html` (`consumeProgressStream()`) show genuine per-prompt/per-metric progress the whole way through.

**If you add a new phase to the evaluation pipeline:** emit a `sendEvent('progress', {percent, message})` call for it in `server.js`, and keep the percent ranges roughly in the existing allocation (0-10% setup, 10-65% chat generation, 65-92% quality metrics, 92-100% saving/wrap-up) so the bar doesn't regress or jump backwards.

**A curl/CI example that expects a single JSON body (like the one in `docs/README_QUALITY_METRICS.md`'s CI/CD section) needs to consume the stream and read the `complete` event, not `JSON.parse` the raw body.**

---

## What to Do / What NOT to Do

### ✅ DO

1. **Use isolated sessions** — Always separate chat from evaluation
2. **Use config files** — Never hardcode thresholds
3. **Write tests** — Every metric/dataset addition needs a test
4. **Document changes** — Update CODEBASE_STRUCTURE.md when adding features
5. **Follow existing patterns** — Consistency matters for maintainability
6. **Use fixtures** — Leverage pytest fixtures in conftest.py
7. **Extend, don't rewrite** — Add metrics/datasets without breaking existing ones
8. **Version datasets** — Keep historical test data
9. **Monitor metrics** — Track trends over time
10. **Test edge cases** — Don't just test happy path

### ❌ DON'T

1. **Don't use same session for chat and eval** — This defeats the entire purpose
2. **Don't hardcode thresholds** — Use config files
3. **Don't skip error handling** — Graceful degradation is required
4. **Don't write monolithic functions** — Keep functions focused
5. **Don't add top-level directories** — Organize by feature, not layer
6. **`evaluate_responses.py` is the live evaluation logic** — it's what `server.js` actually spawns today, so it's fair game to edit (keep `PASS_THRESHOLD` as the single source of truth for the pass bar). Long-term, logic should migrate into `deepeval/evaluation/engine.py`'s `IsolatedEvaluator`, but until that migration happens, don't let the two drift on behavior — and always mirror edits into `src/server/evaluate_responses.py`.
7. **Don't ignore test failures** — Fix them before committing
8. **Don't commit without updating docs** — Keep CODEBASE_STRUCTURE.md in sync
9. **Don't remove metrics** — Deprecate instead (maintain backward compatibility)
10. **Don't evaluate without context** — Understand what you're measuring

---

## Metrics System

### Built-in DeepEval Metrics (8)
- Answer Relevancy — Does response address the question?
- Faithfulness — Are facts accurate?
- Contextual Precision — Uses only relevant context?
- Contextual Recall — Covers all relevant context?
- Contextual Relevancy — Is context actually relevant?
- Hallucination Detection — No made-up information?
- Toxicity Analysis — Non-harmful language?
- Summarization Accuracy — Accurate summaries?

### Custom Business Metrics (5)
- Response Consistency — Same answer across runs?
- Tool Call Accuracy — Right tools called? (agents)
- Response Latency — Response time SLA met?
- Context Relevance — Response uses context well?
- Safety Compliance — No PII/credentials exposed?

### Adding Metrics
- Create in `metrics.py` (not scattered)
- Follow `MetricResult` pattern
- Return score 0-1 (standardized)
- Include reasoning string
- Add to test suite

---

## Configuration Philosophy

**Per-metric quality bar is now unified at 75% across QA and Production** (Sep 2026 change — previously QA ran 70%+ and Prod ran 80%+, varied per metric). What still differs between environments is execution behavior and dataset-level pass rates, not the individual metric threshold:

### QA (Development)
- **Metric threshold: 75%** (same as Prod)
- **Sequential execution** — Easier debugging
- **Verbose logging** — See what's happening
- **Golden: 85% pass rate** — Reasonable for dev
- **Synthetic: 70% pass rate** — Acceptable for new features

### Production
- **Metric threshold: 75%** (same as QA)
- **Parallel execution** — Speed for large evaluations
- **Minimal logging** — Compact, focused
- **Golden: 95% pass rate** — Production quality
- **Synthetic: 85% pass rate** — Proven robustness
- **Alerting enabled** — Monitor for regressions

### Never
- Mix QA and Prod configs
- Ignore environment-specific requirements
- Let `evaluate_responses.py`'s `PASS_THRESHOLD` drift from `deepeval/config/qa.py` / `prod.py`'s `METRIC_THRESHOLDS` — change all three together

---

## Documentation Hierarchy

When Claude needs information:

1. **Quick answer** → QUICK_REFERENCE.md (2 pages)
2. **Setup/start** → QUICK_START.md (10 pages)
3. **Architecture** → ARCHITECTURE_DIAGRAM.md (20 pages)
4. **Technical details** → CODEBASE_STRUCTURE.md (90+ pages)
5. **Business context** → AI_CHATBOT_EVOLUTION_PROPOSAL.md (50+ pages)
6. **Framework summary** → FRAMEWORK_SUMMARY.md (20 pages)

**For users asking questions:**
- "How do I...?" → QUICK_START.md or QUICK_REFERENCE.md
- "Why does it work this way?" → CODEBASE_STRUCTURE.md
- "Is this valuable?" → AI_CHATBOT_EVOLUTION_PROPOSAL.md
- "Show me architecture" → ARCHITECTURE_DIAGRAM.md

---

## Testing Strategy

### Golden Dataset Tests
- Test against human-verified examples
- Verify production quality standards
- Higher pass rate required (85%+ QA, 95%+ Prod)
- Location: `deepeval/tests/test_quality.py`

### Edge Case Tests
- Test robustness and error handling
- Verify security measures
- Lower pass rate acceptable (70%+ QA, 85%+ Prod)
- Location: `deepeval/tests/test_edge_cases.py`

### Custom Tests
- Test business-specific logic
- Verify domain requirements
- User-defined pass rates
- Location: `deepeval/tests/test_custom_*.py`

### Running Tests
```bash
pytest deepeval/tests/                    # All tests
pytest deepeval/tests/test_quality.py -v  # Specific test
pytest -m golden                          # Golden tests only
pytest -m synthetic                       # Edge case tests only
```

---

## Integration Points

### With Node.js Server
- Server spawns Python evaluation engine
- Passes prompts and responses via stdin
- Receives metrics JSON via stdout
- No file I/O needed (streaming)

### With Dashboard
- Metrics displayed in Quality Metrics tab (`public/deepeval.html`, mirrored in `src/public/deepeval.html`)
- Radar chart for multi-dimensional view
- Bar chart for ranked comparison
- **Pass/Fail badges** (green/red) — every metric uses the same 75% bar (`PASS_THRESHOLD` in `evaluate_responses.py`); an overall summary banner shows `metrics_passed / metrics_total` and total pass rate above the metric grid

### With CI/CD
- Tests run on every PR
- Blocks merge if metrics fail
- Generates reports
- Notifies team on regressions

---

## Memory for Future Sessions

The following memories are saved and will be available:
- `project_deepeval_architecture.md` — Framework structure and design
- `feedback_isolation_principle.md` — Why session isolation matters
- `MEMORY.md` — Index of all memory files

These provide context for future conversations.

---

## Common Patterns

### Pattern: Batch Evaluation
```python
evaluator = IsolatedEvaluator()
result = evaluator.evaluate_batch(prompts, responses)
for metric_name, scores in result["aggregated_metrics"].items():
    print(f"{metric_name}: avg={scores['avg']}, min={scores['min']}, max={scores['max']}")
```

### Pattern: Load Config
```python
from deepeval.config.qa import get_qa_config
config = get_qa_config()
threshold = config["thresholds"]["answer_relevancy"]  # 0.75
```

### Pattern: Load Dataset
```python
from deepeval.datasets.golden.quality_qa_set import load_golden_dataset
dataset = load_golden_dataset()
for question in dataset["questions"]:
    # Test against each question
```

### Pattern: Create Metric Result
```python
from deepeval.evaluation.metrics import MetricResult
result = MetricResult(
    name="my_metric",
    score=0.85,
    reasoning="why this score",
    passed=True
)
```

---

## Environment Setup

```bash
# Python dependencies
pip install deepeval  # Main evaluation library
pip install pytest    # Testing framework

# Node.js dependencies
npm install          # For server

# Verify setup
npm run verify       # Checks Python, Node, dependencies

# Run tests
pytest deepeval/tests/ -v
```

---

## Troubleshooting

### DeepEval Not Installing
- System falls back to heuristic metrics automatically
- Heuristic metrics are reliable but less sophisticated
- Check Python version (3.8+)
- Try: `pip install deepeval --upgrade`

### Metrics Seem Low
- Check if thresholds are realistic
- Verify dataset quality expectations
- Review metric definitions in QUALITY_METRICS.md
- Adjust config thresholds if needed

### Tests Failing
- Check if config matches environment (QA vs Prod)
- Verify dataset is loaded correctly
- Check chatbot is responding
- Review test logs for specific failures

### Integration Issues
- Verify Python script path is correct
- Check stdin/stdout communication
- Review error messages in logs
- Ensure JSON serialization works

---

## Performance Considerations

### Evaluation Time
- 3 prompts: 15-45 seconds
- 5 prompts: 45-90 seconds
- 10 prompts: 2-4 minutes
- First run slower (model initialization)

### Optimization
- Use parallel execution in Production
- Batch evaluations when possible
- Cache results if running same questions
- Consider sampling in high-volume scenarios

---

## Compliance & Safety

### Data Handling
- Store evaluation results in reports/runs/
- Never log sensitive data
- Respect user privacy
- Document data retention policy

### Metrics for Compliance
These are the custom business metrics' own thresholds (`deepeval/evaluation/metrics.py`'s `SafetyComplianceMetric`, etc.) — deliberately kept **stricter than the unified 75% dashboard bar** because they're regulatory/safety-critical, not general quality signals:
- Safety Compliance: 0.95+ (metric default; docs elsewhere may reference 0.99+ as a target for a hardened production deployment)
- Hallucination: kept at 0.75+ on the unified dashboard bar; treat any hallucination failure as high-priority regardless of the numeric gap to 100%
- Toxicity: kept at 0.75+ on the unified dashboard bar; safety-critical in spirit even though the numeric bar is shared with other metrics
- All metrics tracked and auditable

### Regulatory Alignment
- NIST AI RMF compatible
- DeepEval industry standard
- Evaluation evidence for audits
- Transparent methodology

---

## Version History & Maintenance

**Current Version:** 1.1.0
**Release Date:** September 26, 2024 (1.0.0) · Updated September 27, 2026 (1.1.0 — unified 75% Pass/Fail threshold + badges)
**Stability:** Production-Ready  

### When Updating
1. Maintain backward compatibility
2. Document breaking changes
3. Update version in `__init__.py`
4. Update documentation
5. Run full test suite
6. Test integration with server

---

## Contact & Support

For questions about:
- **Code structure** → See CODEBASE_STRUCTURE.md
- **Business value** → See AI_CHATBOT_EVOLUTION_PROPOSAL.md
- **Getting started** → See QUICK_START.md
- **Architecture** → See ARCHITECTURE_DIAGRAM.md
- **Specific file** → Check docstrings in that file

---

## Final Notes

This framework is designed for:
- ✅ Measuring chatbot quality objectively
- ✅ Detecting regressions early
- ✅ Comparing different approaches
- ✅ Proving safety/compliance
- ✅ Scaling evaluation as chatbot grows

**Key principle:** Session isolation is not optional — it's fundamental to evaluation objectivity.

---

**Last Updated:** September 27, 2026
**Status:** Complete & Production-Ready  
**Maintainer:** AI Platform Team
