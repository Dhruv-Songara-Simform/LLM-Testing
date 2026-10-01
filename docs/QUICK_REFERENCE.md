# Quick Reference Guide

Fast lookup for the DeepEval Framework structure and usage.

## 📍 File Location Map

| What | Location | Purpose |
|------|----------|---------|
| **Main Evaluator** | `deepeval/evaluation/engine.py` | `IsolatedEvaluator` class |
| **Custom Metrics** | `deepeval/evaluation/metrics.py` | 5 business logic metrics |
| **Golden Data** | `deepeval/datasets/golden/quality_qa_set.py` | 5 production examples |
| **Edge Cases** | `deepeval/datasets/synthetic/edge_cases.py` | 20+ stress tests |
| **QA Config** | `deepeval/config/qa.py` | Lower thresholds (70%+) |
| **Prod Config** | `deepeval/config/prod.py` | Strict thresholds (80%+) |
| **Tests** | `deepeval/tests/test_*.py` | Pytest test files |
| **Fixtures** | `deepeval/tests/conftest.py` | Shared pytest setup |

## 🚀 Common Tasks

### Evaluate a Response
```python
from deepeval.evaluation.engine import IsolatedEvaluator

evaluator = IsolatedEvaluator()
result = evaluator.evaluate_single("What is AI?", "AI is...")
print(result["answer_relevancy"])  # 0.85
```

### Batch Evaluate
```python
result = evaluator.evaluate_batch(prompts, responses)
print(result["aggregated_metrics"]["answer_relevancy"]["avg"])
```

### Load Datasets
```python
from deepeval.datasets.golden.quality_qa_set import load_golden_dataset
from deepeval.datasets.synthetic.edge_cases import load_edge_case_dataset

golden = load_golden_dataset()
edges = load_edge_case_dataset()
```

### Run Tests
```bash
pytest deepeval/tests/                          # All tests
pytest deepeval/tests/test_quality.py -v        # Specific file
pytest -m golden                                # Golden dataset tests
pytest -m synthetic                             # Edge case tests
```

### Use Configuration
```python
from deepeval.config.qa import get_qa_config
from deepeval.config.prod import get_prod_config

qa = get_qa_config()
prod = get_prod_config()

# Access thresholds
qa["thresholds"]["answer_relevancy"]  # 0.70
prod["thresholds"]["answer_relevancy"]  # 0.80
```

## 📊 Metric Quick Reference

| Metric | Type | Range | Interpretation |
|--------|------|-------|-----------------|
| Answer Relevancy | Quality | 0-1 | Does answer the question? |
| Faithfulness | Quality | 0-1 | Are facts accurate? |
| Hallucination | Safety | 0-1 | No made-up info? |
| Clarity | Quality | 0-1 | Easy to understand? |
| Completeness | Quality | 0-1 | Covers topic fully? |
| Toxicity | Safety | 0-1 | Non-harmful? |
| Latency | Performance | 0-1 | Responds fast? |
| Safety Compliance | Safety | 0-1 | No PII/credentials? |
| Tool Accuracy | Agent | 0-1 | Right tools called? |
| Consistency | Reliability | 0-1 | Same across runs? |

## 🎯 Thresholds Cheat Sheet

### QA (Development)
- Answer Relevancy: 0.70
- Faithfulness: 0.75
- Hallucination: 0.80
- Safety: 0.95

### Production
- Answer Relevancy: 0.80
- Faithfulness: 0.85
- Hallucination: 0.90
- Safety: 0.99

## 📈 Dataset Overview

| Dataset | Location | Size | Purpose |
|---------|----------|------|---------|
| Golden | `datasets/golden/` | 5 Q&A | Baseline quality |
| Edge Cases | `datasets/synthetic/` | 20+ | Stress & robustness |
| Custom | `datasets/test/` | 0 (user-defined) | Business logic |

## 🔄 Data Flow

```
Prompt & Response
    ↓
IsolatedEvaluator.evaluate_single()
    ↓
[11 DeepEval + 5 Custom Metrics]
    ↓
MetricResult {name, score, reasoning, passed}
    ↓
Aggregate Results
    ↓
Report JSON
```

## 🛠️ Adding Stuff

### Add Custom Metric
```python
# In deepeval/evaluation/metrics.py
class MyMetric:
    def measure(self, response):
        return MetricResult(name="my_metric", score=0.85, ...)
```

### Add Golden Example
```python
# In deepeval/datasets/golden/quality_qa_set.py
{
    "id": "golden_006",
    "question": "Your question",
    "expected_elements": ["word1", "word2"],
}
```

### Add Test
```python
# In deepeval/tests/test_mytest.py
def test_something(evaluator, golden_dataset):
    # Your test logic
    assert metrics["answer_relevancy"] >= 0.70
```

## 📚 Doc Map

| Document | Page Count | Use When |
|----------|-----------|----------|
| **CODEBASE_STRUCTURE.md** | 90+ | Need complete technical guide |
| **AI_CHATBOT_EVOLUTION_PROPOSAL.md** | 50+ | Explaining to business/stakeholders |
| **FRAMEWORK_SUMMARY.md** | 20+ | Quick overview of what was built |
| **QUICK_REFERENCE.md** | 2-3 | You are here! Fast lookup |
| **QUICK_START.md** | 10 | Get running in 5 minutes |
| **QUALITY_METRICS.md** | 30+ | Deep dive on metrics |

## ✅ Setup Verification

```bash
# Check if setup is correct
python3 -c "from deepeval.evaluation.engine import IsolatedEvaluator; print('✅ Framework ready')"

# Run quick test
pytest deepeval/tests/test_quality.py::test_answer_relevancy -v

# Load dataset
python3 -c "from deepeval.datasets.golden.quality_qa_set import load_golden_dataset; print(f'✅ Golden dataset loaded: {len(load_golden_dataset()[\"questions\"])} questions')"
```

## 🔗 Key Relationships

```
IsolatedEvaluator (engine.py)
    ├── Uses: DeepEval metrics (if available)
    ├── Uses: Custom metrics (metrics.py)
    ├── Creates: EvaluationSession (separate from chat)
    └── Returns: Dict with aggregated + individual metrics

Tests (conftest.py)
    ├── Fixtures: evaluator, qa_config, prod_config
    ├── Fixtures: golden_dataset, edge_case_dataset
    └── Markers: @pytest.mark.golden, @pytest.mark.synthetic

Config
    ├── QA: Lower thresholds, sequential
    └── Prod: Strict thresholds, parallel
```

## 🎯 Next Steps Checklist

- [ ] Read CODEBASE_STRUCTURE.md (complete understanding)
- [ ] Run `python3 -c "from deepeval import IsolatedEvaluator"` (verify setup)
- [ ] Run test on current chatbot (baseline metrics)
- [ ] Integrate into server.js (production pipeline)
- [ ] Set up CI/CD (automated testing)
- [ ] Configure alerting (regression detection)
- [ ] Train team (metric interpretation)

---

**Last Updated:** September 26, 2024  
**Framework Version:** 1.0.0
