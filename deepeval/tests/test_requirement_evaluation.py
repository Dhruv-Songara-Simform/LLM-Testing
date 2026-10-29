"""Requirement scoring model, with a stubbed judge (no network)."""

import pytest

from .requirement_stubs import er, install, reqs


PROMPTS = ["What is your refund policy?", "Tell me a joke", "How do I reset my password?"]
RESPONSES = ["Refunds within 30 days.", "Why did the chicken...", "Click 'Forgot password'."]


def run(requirements, prompts=PROMPTS, responses=RESPONSES, **kw):
    # Static/suite runs: each response is judged without the other conversations as context.
    kw.setdefault("isolated", True)
    return er.evaluate_requirements(prompts, responses, requirements, **kw)


def by_id(result):
    return {r["id"]: r for r in result["requirements"]}


def test_pass_fail_and_not_tested(monkeypatch):
    table = {
        "R-01": lambda u: (True, 0.95, "polite"),                                   # general: applies everywhere
        "R-02": lambda u: ("refund policy" in u, 0.3 if "refund policy" in u else None, "x"),  # one clear violation
        "R-03": lambda u: (False, None, "never touched"),                          # not exercised
    }
    install(monkeypatch, lambda rid, user, _n: table[rid](user))
    result = run(reqs("Be polite", "Explain the refund window clearly", "Mention store opening hours"))
    r = by_id(result)
    assert r["R-01"]["status"] == "Pass" and r["R-01"]["applicable"] == 3 and r["R-01"]["confidence"] == "High"
    assert r["R-02"]["status"] == "Fail" and r["R-02"]["applicable"] == 1 and r["R-02"]["worstIndex"] == 0
    assert r["R-02"]["confidence"] == "Low"  # only one applicable response
    assert r["R-03"]["status"] == "Not tested" and r["R-03"]["score"] is None
    s = result["summary"]
    assert (s["selected"], s["tested"], s["passed"], s["failed"], s["notTested"], s["notMeasured"]) == (3, 2, 1, 1, 1, 0)
    assert s["coverage"] == 0.67 and s["passRate"] == 0.5


def test_case_floor_fails_a_good_average(monkeypatch):
    scores = iter([1.0, 1.0, 0.3])
    install(monkeypatch, lambda rid, user, _n: (True, next(scores), "r"))
    monkeypatch.setattr(er, "REQ_MAX_WORKERS", 1)
    r = by_id(run(reqs("Never be rude")))["R-01"]
    assert r["score"] == pytest.approx(0.77)
    assert r["status"] == "Fail" and r["failedBy"] == ["caseFloor"]


def test_average_below_bar_fails(monkeypatch):
    install(monkeypatch, lambda rid, user, _n: (True, 0.55, "meh"))
    r = by_id(run(reqs("Answer completely")))["R-01"]
    assert r["status"] == "Fail" and r["failedBy"] == ["average"]
    assert all(p["results"]["R-01"]["verdict"] == "partially met" for p in run(reqs("x"))["perResponse"])


def test_verdicts_follow_final_score(monkeypatch):
    values = {"Refunds": 0.95, "chicken": 0.6, "password": 0.2}
    install(monkeypatch, lambda rid, user, _n: (True, next(v for k, v in values.items() if k in user), "r"))
    result = run(reqs("Be helpful"))
    verdicts = [p["results"]["R-01"]["verdict"] for p in result["perResponse"]]
    # 0.6 and 0.2 are not borderline-resampled to other values by this stub (same answer every call).
    assert verdicts == ["met", "partially met", "violated"]


def test_batching_splits_long_lists(monkeypatch):
    stub = install(monkeypatch, lambda rid, user, _n: (True, 1.0, "ok"))
    requirements = reqs(*[f"Requirement number {i}" for i in range(er.REQ_BATCH_SIZE + 3)])
    result = run(requirements, prompts=PROMPTS[:1], responses=RESPONSES[:1])
    assert len(stub.calls) == 2  # ceil(13 / 10) calls for one response
    assert result["judgeCalls"] == 2
    assert all(r["status"] == "Pass" for r in result["requirements"])


def test_borderline_scores_are_rejudged_with_median(monkeypatch):
    samples = iter([0.7, 0.9, 0.8])
    stub = install(monkeypatch, lambda rid, user, _n: (True, next(samples), "r"))
    result = run(reqs("Be concise"), prompts=PROMPTS[:1], responses=RESPONSES[:1])
    entry = result["perResponse"][0]["results"]["R-01"]
    assert len(stub.calls) == er.JUDGE_SAMPLES
    assert entry["score"] == 0.8 and entry["samples"] == 3 and entry["verdict"] == "met"


def test_scores_near_case_floor_are_also_rejudged(monkeypatch):
    samples = iter([0.45, 0.55, 0.6])
    install(monkeypatch, lambda rid, user, _n: (True, next(samples), "r"))
    entry = run(reqs("x"), prompts=PROMPTS[:1], responses=RESPONSES[:1])["perResponse"][0]["results"]["R-01"]
    assert entry["score"] == 0.55


def test_clear_scores_are_judged_once(monkeypatch):
    stub = install(monkeypatch, lambda rid, user, _n: (True, 1.0, "r"))
    run(reqs("x"), prompts=PROMPTS[:1], responses=RESPONSES[:1])
    assert len(stub.calls) == 1


def test_no_judge_means_not_measured_and_no_calls(monkeypatch):
    stub = install(monkeypatch, lambda *_: (True, 1.0, "r"), available=False)
    result = run(reqs("Be polite", "Use English"))
    assert stub.calls == []
    assert {r["status"] for r in result["requirements"]} == {"Not measured"}
    assert result["summary"]["notMeasured"] == 2 and result["summary"]["passRate"] is None
    assert result["judgeModel"] is None


def test_judge_failure_marks_only_that_batch_not_measured(monkeypatch):
    def decide(rid, user, _n):
        if "chicken" in user:
            raise ValueError("bad json")
        return True, 1.0, "fine"
    install(monkeypatch, decide)
    result = run(reqs("Be polite"))
    r = by_id(result)["R-01"]
    assert r["status"] == "Pass" and r["applicable"] == 2
    assert r["notMeasuredResponses"] == 1 and r["confidence"] == "Low"
    assert result["perResponse"][1]["results"]["R-01"]["verdict"] == "not measured"


def test_missing_score_for_applicable_requirement_is_retried_then_not_measured(monkeypatch):
    stub = install(monkeypatch, lambda *_: (True, None, "no score"))
    result = run(reqs("x"), prompts=PROMPTS[:1], responses=RESPONSES[:1])
    assert len(stub.calls) == 2  # one retry
    assert result["requirements"][0]["status"] == "Not measured"


def test_per_response_indices_map_back_to_original_prompts(monkeypatch):
    install(monkeypatch, lambda *_: (True, 0.2, "bad"))
    result = run(reqs("x"), prompts=PROMPTS[:2], responses=RESPONSES[:2], indices=[0, 4])
    assert [p["index"] for p in result["perResponse"]] == [0, 4]
    assert result["requirements"][0]["worstIndex"] in (0, 4)


def test_string_applies_values_are_understood(monkeypatch):
    install(monkeypatch, lambda *_: ("false", None, "n/a"))
    assert run(reqs("x"))["requirements"][0]["status"] == "Not tested"


def test_main_rejects_invalid_payload(monkeypatch):
    import io
    monkeypatch.setattr("sys.stdin", io.StringIO('{"prompts": ["a"], "responses": ["b"], "requirements": [{"id": "bad", "text": "x"}]}'))
    with pytest.raises(ValueError):
        er.main(["evaluate_requirements.py"])
