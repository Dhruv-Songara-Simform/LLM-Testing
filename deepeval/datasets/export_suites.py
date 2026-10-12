#!/usr/bin/env python3
"""
Print the fixed test suites as JSON for server.js (`GET /api/suites`, suite runs).

Loads the dataset modules by file path so the `deepeval` package __init__ (and its
import of the pip `deepeval` library it shadows) is never executed.
"""

import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_module(relative_path, name):
    spec = importlib.util.spec_from_file_location(name, HERE / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def golden_suite():
    data = load_module("golden/quality_qa_set.py", "golden_quality_qa_set").load_golden_dataset()
    cases = []
    for q in data["questions"]:
        reference = (
            f"Should cover these elements: {', '.join(q['expected_elements'])}. "
            f"Expected length: {q['min_length_words']}-{q['max_length_words']} words."
        )
        if q.get("should_cite_sources"):
            reference += " Should cite or point to sources."
        cases.append({"id": q["id"], "category": q["category"], "prompt": q["question"], "reference": reference})
    return {"id": "golden", "name": data["name"], "description": data["description"], "cases": cases}


def edge_suite():
    data = load_module("synthetic/edge_cases.py", "synthetic_edge_cases").load_edge_case_dataset()
    cases = [
        {
            "id": c["id"],
            "category": c["id"].split("_")[0],
            "prompt": c["question"],
            "reference": f"Expected behaviour: {c['expected_behavior']} (case: {c['description']}).",
        }
        # A null question can't be sent over a chat API at all, so it isn't a runnable case.
        for c in data["test_cases"] if c.get("question") is not None
    ]
    return {"id": "edge_cases", "name": data["name"], "description": data["description"], "cases": cases}


if __name__ == "__main__":
    print(json.dumps([golden_suite(), edge_suite()]))
