"""Helpers for the requirement tests: import the root evaluate_requirements.py and stub its judge."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import evaluate_requirements as er  # noqa: E402

REQUIREMENT_TAG = re.compile(r'<requirement id="(R-\d+)">')


class StubJudge:
    """Replaces call_req_judge; `decide(rid, user_message, call_number)` returns (applies, score, reason)."""

    def __init__(self, decide):
        self.decide = decide
        self.calls = []

    def __call__(self, messages):
        self.calls.append(messages)
        user = messages[-1]["content"]
        results = {}
        for rid in REQUIREMENT_TAG.findall(user):
            applies, score, reason = self.decide(rid, user, len(self.calls))
            results[rid] = {"applies": applies, "score": score, "reason": reason}
        return {"results": results}


def install(monkeypatch, decide, available=True):
    stub = StubJudge(decide)
    monkeypatch.setattr(er, "call_req_judge", stub)
    monkeypatch.setattr(er, "REQ_JUDGE_AVAILABLE", available)
    monkeypatch.setattr(er, "REQ_JUDGE_MODEL", "stub-judge" if available else None)
    monkeypatch.setattr(er.time, "sleep", lambda _s: None)
    return stub


def reqs(*texts):
    return [{"id": f"R-{i:02d}", "text": t} for i, t in enumerate(texts, start=1)]
