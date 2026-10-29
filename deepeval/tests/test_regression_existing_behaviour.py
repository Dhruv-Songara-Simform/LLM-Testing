"""Ground rule: requirement evaluation must not change the live metric scoring path."""

import importlib
import json
import subprocess
import sys

from .requirement_stubs import ROOT

import evaluate_responses  # noqa: E402  (root on sys.path via requirement_stubs)

PROMPTS = ["What is the capital of France?", "Explain machine learning in simple terms"]
RESPONSES = ["Paris is the capital of France.", "Machine learning lets computers learn patterns from data."]


def heuristic_run(module):
    original = module.JUDGE_AVAILABLE
    module.JUDGE_AVAILABLE = False
    try:
        result = module.evaluate_batch(PROMPTS, RESPONSES, selected_metrics=["answer_relevancy", "toxicity"])
    finally:
        module.JUDGE_AVAILABLE = original
    result.pop("timestamp")
    return result


def test_constants_unchanged():
    assert evaluate_responses.PASS_THRESHOLD == 0.75
    assert evaluate_responses.BORDERLINE_MARGIN == 0.1
    assert evaluate_responses.JUDGE_SAMPLES == 3


def test_metric_output_identical_after_requirement_module_is_loaded():
    before = heuristic_run(evaluate_responses)
    import evaluate_requirements  # noqa: F401
    importlib.reload(evaluate_requirements)
    after = heuristic_run(evaluate_responses)
    assert before == after


def test_metric_scorer_ignores_requirement_fields_on_stdin():
    base = {"prompts": PROMPTS, "responses": RESPONSES, "selected_metrics": ["toxicity"]}
    env = {"PATH": "/usr/bin:/bin"}

    def run(payload):
        proc = subprocess.run([sys.executable, str(ROOT / "evaluate_responses.py")], input=json.dumps(payload),
                              capture_output=True, text=True, env=env, cwd=str(ROOT), timeout=60)
        assert proc.returncode == 0, proc.stderr
        out = json.loads(proc.stdout)
        out.pop("timestamp")
        return out

    assert run(base) == run({**base, "requirements": [{"id": "R-01", "text": "Be polite"}]})


def test_pinned_heuristic_scores():
    result = heuristic_run(evaluate_responses)
    assert result["aggregated_metrics"]["toxicity"]["avg"] == 1.0
    assert result["unmeasured_metrics"] == []
    assert result["scoring_method"] == "heuristic"
    assert set(result["aggregated_metrics"]) == {"answer_relevancy", "toxicity"}
