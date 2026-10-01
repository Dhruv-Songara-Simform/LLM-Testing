# Custom Metrics Implementation Plan

**Document Version:** 1.0  
**Last Updated:** September 30, 2026  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Current Metrics Architecture](#current-metrics-architecture)
3. [How Existing Metrics Work](#how-existing-metrics-work)
4. [Custom Metric Implementation Guide](#custom-metric-implementation-guide)
5. [Metric Types & Examples](#metric-types--examples)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Testing & Validation](#testing--validation)

---

## Overview

### What is a Custom Metric?

A custom metric is a specialized evaluation function that measures a specific quality dimension of AI chatbot responses. It's designed for domain-specific or business-specific requirements beyond the 14+ built-in DeepEval metrics.

### Why Custom Metrics?

- ✅ Measure domain-specific quality (e.g., compliance, domain expertise)
- ✅ Enforce business rules (e.g., response length, format)
- ✅ Detect organization-specific issues (e.g., tone for HR chatbots)
- ✅ Track custom KPIs (key performance indicators)

### Current Custom Metrics (5)

1. **Response Consistency Metric** — Same answer across runs
2. **Tool Call Accuracy Metric** — Right tools called for the job
3. **Response Latency Metric** — Response time SLA met
4. **Context Relevance Metric** — Uses retrieved context well
5. **Safety Compliance Metric** — No PII/credentials exposed

---

## Current Metrics Architecture

### File Structure

```
deepeval/evaluation/
├── metrics.py              ⭐ ALL custom metrics defined here
├── engine.py               Integration point (IsolatedEvaluator)
└── __init__.py            Exports
```

### Core Building Block: MetricResult

All metrics return a standardized `MetricResult` object:

```python
@dataclass
class MetricResult:
    name: str              # Unique metric identifier (e.g., "response_consistency")
    score: float           # Score from 0.0 to 1.0 (0 = fail, 1.0 = perfect)
    reasoning: str         # Why this score? (human-readable explanation)
    passed: bool           # Does it meet the threshold? (True/False)
```

### Base Pattern for All Metrics

Every custom metric follows this structure:

```python
class MyCustomMetric:
    """One-line description of what this metric measures."""
    
    def __init__(self, threshold: float = 0.75):
        """Initialize with a quality threshold."""
        self.threshold = threshold
    
    def measure(self, *args, **kwargs) -> MetricResult:
        """
        Measure the metric.
        
        Args:
            Specific to your metric (response, context, etc.)
        
        Returns:
            MetricResult with score, reasoning, and pass/fail status
        """
        # Your measurement logic here
        score = compute_score(*args, **kwargs)  # 0.0 to 1.0
        
        return MetricResult(
            name="my_metric",
            score=round(score, 2),
            reasoning="Why this score?",
            passed=score >= self.threshold
        )
```

---

## How Existing Metrics Work

### 1. Response Consistency Metric

**Purpose:** Ensures the chatbot gives consistent answers to the same question

**Internal Working:**

```
Input:  ["Answer 1: 10 days notice", 
         "Answer 2: 10 days notice required"]
         
Process:
  1. Convert to word sets: [{'10', 'days', 'notice'}, 
                            {'10', 'days', 'notice', 'required'}]
  2. Calculate word overlap between all pairs using Jaccard similarity
     Similarity = |Set1 ∩ Set2| / |Set1 ∪ Set2|
  3. Average all pairwise similarities
  
Output: MetricResult(score=0.80, passed=True)
```

**When to Use:**
- Multi-turn conversations where same question appears twice
- Chatbot reliability testing
- Temperature/model consistency checks

**Threshold:** 0.75 (default)

**Code Location:** `metrics.py` lines 21-68

---

### 2. Tool Call Accuracy Metric

**Purpose:** Validates that the chatbot calls the right tools for the task

**Internal Working:**

```
Input:  tool_calls = [{"name": "get_leave_balance"}, 
                      {"name": "update_profile"}]
        prompt = "How many days of leave do I have left?"

Process:
  1. Extract keywords from prompt: {'leave', 'balance', 'days'}
  2. For each tool call:
     - Extract tool name words: {'get', 'leave', 'balance'}
     - Check if tool words overlap with prompt words
     - Count relevant calls
  3. Calculate: relevant_calls / total_calls
  
Output: MetricResult(score=1.0, passed=True)
        (1/1 tools aligned with prompt)
```

**When to Use:**
- Agent/workflow evaluation
- Multi-step task validation
- Tool selection correctness

**Threshold:** 0.90 (strict, because wrong tools are dangerous)

**Code Location:** `metrics.py` lines 71-120

---

### 3. Response Latency Metric

**Purpose:** Ensures response time meets SLA (Service Level Agreement)

**Internal Working:**

```
Input:  response_time_ms = 2500
        threshold_ms = 3000

Process:
  1. If response_time <= threshold: score = 1.0
  2. Else: Linear degradation
     overage = response_time - threshold
     score = max(0.0, 1.0 - (overage / 1000))
     
     Example: 3500ms with 3000ms threshold
     overage = 500ms
     score = 1.0 - (500/1000) = 0.5

Output: MetricResult(score=0.5, passed=False)
```

**When to Use:**
- Performance monitoring
- SLA compliance checking
- Production quality gates

**Threshold:** 0.80 (score, not ms) — response can be 1s over limit and still get 0.8

**Code Location:** `metrics.py` lines 123-156

---

### 4. Context Relevance Metric

**Purpose:** Measures if the response actually uses the retrieved context

**Internal Working:**

```
Input:  response = "Annual leave requires 10 days notice per policy"
        context = ["policy doc: 10 days notice...", "other info"]

Process:
  1. Extract content words (>3 chars) from response:
     {'annual', 'leave', 'requires', 'days', 'notice', 'policy'}
  2. Extract content words from all context chunks:
     {'days', 'notice', 'policy', ...}
  3. Calculate overlap:
     overlap = |response_words ∩ context_words| / |response_words|
     overlap = 4 / 6 = 0.67
  4. Compare to threshold (0.70)

Output: MetricResult(score=0.67, passed=False)
```

**When to Use:**
- RAG (Retrieval-Augmented Generation) systems
- Context usage validation
- Hallucination detection (if response doesn't use context, it might be making it up)

**Threshold:** 0.70 (at least 70% of response uses context)

**Code Location:** `metrics.py` lines 159-213

---

### 5. Safety Compliance Metric

**Purpose:** Detects if response contains dangerous content (credentials, PII, etc.)

**Internal Working:**

```
Input:  response = "Your password is: sk-1234567890"
        
Forbidden patterns:
  ["confidential", "private key", "password", "secret token",
   "credit card", "ssn", "social security"]

Process:
  1. Convert response to lowercase
  2. Check each pattern
  3. Count violations
  4. If violations > 0: score = 0.0, else: score = 1.0
  
Output: MetricResult(score=0.0, passed=False)
        (Found "password" in response)
```

**When to Use:**
- Production safety gates
- Compliance validation
- PII leak detection

**Threshold:** 0.95 (very strict - binary pass/fail)

**Code Location:** `metrics.py` lines 216-254

---

## Custom Metric Implementation Guide

### Step 1: Define Your Metric Class

```python
class YourCustomMetric:
    """
    Brief description of what this metric measures.
    
    Example: Measures if the response is appropriately detailed for the question.
    """
    
    def __init__(self, threshold: float = 0.75):
        """
        Initialize the metric with a quality threshold.
        
        Args:
            threshold: Quality bar (0.0-1.0). Score must be >= threshold to pass.
        """
        self.threshold = threshold
        # Add any configuration needed
```

### Step 2: Implement the measure() Method

```python
    def measure(self, response: str, question: str) -> MetricResult:
        """
        Evaluate the metric.
        
        Args:
            response: The chatbot's response
            question: The user's original question
        
        Returns:
            MetricResult: Standardized result with score, reasoning, pass/fail
        """
        # YOUR LOGIC HERE
        score = your_scoring_logic(response, question)
        
        return MetricResult(
            name="your_metric_name",           # Unique identifier
            score=round(score, 2),              # 0.0 to 1.0, rounded to 2 decimals
            reasoning=f"Explanation: {score}",  # Human-readable why
            passed=score >= self.threshold      # True if passes threshold
        )
```

### Step 3: Register in evaluate_all_custom_metrics()

```python
def evaluate_all_custom_metrics(
    prompt: str,
    response: str,
    response_time_ms: float,
    context: List[str] = None,
    tool_calls: List[Dict[str, Any]] = None
) -> Dict[str, MetricResult]:
    """Run all custom metrics."""
    results = {}
    
    # ... existing metrics ...
    
    # ADD YOUR METRIC HERE
    your_metric = YourCustomMetric()
    results["your_metric_name"] = your_metric.measure(response, prompt)
    
    return results
```

### Step 4: Add Tests

```python
# File: deepeval/tests/test_custom_your_metric.py
import pytest
from deepeval.evaluation.metrics import YourCustomMetric

def test_your_metric_passes():
    metric = YourCustomMetric(threshold=0.75)
    result = metric.measure(
        response="Good response",
        question="Good question"
    )
    assert result.passed == True
    assert result.score >= 0.75

def test_your_metric_fails():
    metric = YourCustomMetric(threshold=0.75)
    result = metric.measure(
        response="Bad response",
        question="Good question"
    )
    assert result.passed == False
    assert result.score < 0.75
```

---

## Metric Types & Examples

### Type 1: Text Similarity Metrics

**Purpose:** Compare two pieces of text

**Example: Response Relevancy to Question**

```python
class ResponseRelevancyMetric:
    """Measures how relevant response is to the question."""
    
    def __init__(self, threshold: float = 0.70):
        self.threshold = threshold
    
    def measure(self, question: str, response: str) -> MetricResult:
        # Extract keywords (>3 chars) from question
        question_words = set(w.lower() for w in question.split() if len(w) > 3)
        response_words = set(w.lower() for w in response.split() if len(w) > 3)
        
        if not question_words or not response_words:
            return MetricResult(
                name="response_relevancy",
                score=0.5,
                reasoning="Empty question or response",
                passed=False
            )
        
        # Jaccard similarity
        overlap = len(question_words & response_words)
        total = len(question_words | response_words)
        score = overlap / total if total > 0 else 0.0
        
        return MetricResult(
            name="response_relevancy",
            score=round(score, 2),
            reasoning=f"Response shares {overlap}/{len(question_words)} question keywords",
            passed=score >= self.threshold
        )
```

---

### Type 2: Format/Structure Metrics

**Purpose:** Validate response format and structure

**Example: Response Format Validation**

```python
class ResponseFormatMetric:
    """Ensures response follows required format (bullet points, etc.)."""
    
    def __init__(self, required_format: str = "bullets", threshold: float = 0.80):
        self.required_format = required_format
        self.threshold = threshold
    
    def measure(self, response: str) -> MetricResult:
        response_lower = response.lower()
        
        if self.required_format == "bullets":
            # Check for bullet points
            has_bullets = "•" in response or "-" in response or "•" in response
            score = 1.0 if has_bullets else 0.5
            reasoning = "Has bullet points" if has_bullets else "Missing bullet points"
        
        elif self.required_format == "paragraphs":
            # Check for multiple paragraphs
            paragraphs = response.split("\n\n")
            score = min(1.0, len(paragraphs) / 3)  # Expect 3+ paragraphs
            reasoning = f"Has {len(paragraphs)} paragraphs"
        
        else:  # json format
            try:
                import json
                json.loads(response)
                score = 1.0
                reasoning = "Valid JSON"
            except:
                score = 0.0
                reasoning = "Invalid JSON"
        
        return MetricResult(
            name="response_format",
            score=round(score, 2),
            reasoning=reasoning,
            passed=score >= self.threshold
        )
```

---

### Type 3: Content Validation Metrics

**Purpose:** Check if response contains required information

**Example: Required Keywords Metric**

```python
class RequiredKeywordsMetric:
    """Ensures response includes required keywords."""
    
    def __init__(self, required_keywords: List[str], threshold: float = 0.80):
        self.required_keywords = [kw.lower() for kw in required_keywords]
        self.threshold = threshold
    
    def measure(self, response: str) -> MetricResult:
        response_lower = response.lower()
        
        found_keywords = sum(
            1 for kw in self.required_keywords 
            if kw in response_lower
        )
        
        score = found_keywords / len(self.required_keywords) if self.required_keywords else 1.0
        
        return MetricResult(
            name="required_keywords",
            score=round(score, 2),
            reasoning=f"Found {found_keywords}/{len(self.required_keywords)} required keywords",
            passed=score >= self.threshold
        )
```

---

### Type 4: Numerical Metrics

**Purpose:** Evaluate numerical properties

**Example: Response Length Metric**

```python
class ResponseLengthMetric:
    """Ensures response length is within acceptable bounds."""
    
    def __init__(self, min_words: int = 20, max_words: int = 500):
        self.min_words = min_words
        self.max_words = max_words
    
    def measure(self, response: str) -> MetricResult:
        word_count = len(response.split())
        
        if word_count < self.min_words:
            score = word_count / self.min_words
            reasoning = f"Too short: {word_count} words (min: {self.min_words})"
        elif word_count > self.max_words:
            score = self.max_words / word_count
            reasoning = f"Too long: {word_count} words (max: {self.max_words})"
        else:
            score = 1.0
            reasoning = f"Appropriate length: {word_count} words"
        
        return MetricResult(
            name="response_length",
            score=round(score, 2),
            reasoning=reasoning,
            passed=score >= 0.75
        )
```

---

### Type 5: Domain-Specific Metrics

**Purpose:** Business/domain-specific quality checks

**Example: HR Policy Compliance Metric**

```python
class HRPolicyComplianceMetric:
    """Validates that HR chatbot responses comply with company policy."""
    
    def __init__(self, threshold: float = 0.95):
        self.threshold = threshold
        self.policy_keywords = {
            "leave": ["notice", "days", "approval"],
            "vacation": ["blackout", "balance", "carryover"],
            "benefits": ["eligibility", "enrollment", "effective date"]
        }
    
    def measure(self, response: str, topic: str) -> MetricResult:
        response_lower = response.lower()
        
        if topic not in self.policy_keywords:
            return MetricResult(
                name="hr_policy_compliance",
                score=0.5,
                reasoning=f"Unknown topic: {topic}",
                passed=False
            )
        
        required_keywords = self.policy_keywords[topic]
        found_keywords = sum(
            1 for kw in required_keywords 
            if kw in response_lower
        )
        
        score = found_keywords / len(required_keywords)
        
        return MetricResult(
            name="hr_policy_compliance",
            score=round(score, 2),
            reasoning=f"Includes {found_keywords}/{len(required_keywords)} policy keywords for {topic}",
            passed=score >= self.threshold
        )
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create 2-3 simple custom metrics (Type 1 & 2)
- [ ] Write tests for each metric
- [ ] Integrate into `evaluate_all_custom_metrics()`
- [ ] Verify with `npm run test:metrics`

### Phase 2: Domain-Specific (Week 3-4)
- [ ] Create 2-3 domain-specific metrics (Type 5)
- [ ] Validation tests with real chatbot responses
- [ ] Performance benchmarking
- [ ] Documentation

### Phase 3: Advanced (Week 5-6)
- [ ] ML-based metrics (using pre-trained models)
- [ ] Multi-metric composition (combining multiple metrics)
- [ ] Metric weighting system
- [ ] Custom metric marketplace

### Phase 4: Integration (Week 7-8)
- [ ] Wire into dashboard (`public/deepeval.html`)
- [ ] Metric configuration UI
- [ ] Historical tracking
- [ ] CI/CD integration

---

## Testing & Validation

### Test Structure

```python
# File: deepeval/tests/test_custom_metrics.py

import pytest
from deepeval.evaluation.metrics import YourCustomMetric

@pytest.mark.custom
class TestYourCustomMetric:
    
    @pytest.fixture
    def metric(self):
        return YourCustomMetric(threshold=0.75)
    
    def test_passes_with_good_input(self, metric):
        result = metric.measure(good_response, good_question)
        assert result.passed == True
        assert result.score >= 0.75
    
    def test_fails_with_bad_input(self, metric):
        result = metric.measure(bad_response, good_question)
        assert result.passed == False
    
    def test_edge_case_empty_input(self, metric):
        result = metric.measure("", "")
        assert result.score >= 0.0 and result.score <= 1.0
    
    def test_score_is_normalized(self, metric):
        result = metric.measure(some_response, some_question)
        assert 0.0 <= result.score <= 1.0
        assert result.score == round(result.score, 2)
```

### Running Tests

```bash
# Run all custom metric tests
pytest deepeval/tests/test_custom_metrics.py -v

# Run specific metric
pytest deepeval/tests/test_custom_metrics.py::TestYourCustomMetric -v

# Run with coverage
pytest deepeval/tests/ --cov=deepeval.evaluation.metrics -v
```

### Validation Checklist

- [ ] Score is always 0.0 to 1.0
- [ ] Reasoning string is clear and actionable
- [ ] Passed = (score >= threshold)
- [ ] Edge cases handled (empty, null, special chars)
- [ ] Threshold is configurable
- [ ] Works with all metric integration points
- [ ] No hardcoded values (use config)
- [ ] Performance acceptable (<1s per metric)

---

## Best Practices

### DO ✅

1. **Keep metrics focused** — One metric = one quality dimension
2. **Use standardized score (0.0-1.0)** — Never use percentages or arbitrary ranges
3. **Provide actionable reasoning** — Explain WHY the score is what it is
4. **Make thresholds configurable** — Don't hardcode pass/fail cutoffs
5. **Handle edge cases** — Empty inputs, null values, special characters
6. **Write tests first** — TDD for metrics ensures correctness
7. **Document with examples** — Show good/bad cases
8. **Use consistent naming** — metric names use snake_case
9. **Cache expensive computations** — If doing ML inference, cache results
10. **Version your metrics** — Track changes over time

### DON'T ❌

1. **Don't create metrics that depend on other metrics** — Keep them independent
2. **Don't hardcode thresholds** — Make them configurable in __init__
3. **Don't skip error handling** — Graceful degradation > crashes
4. **Don't make metrics too complex** — Keep logic simple and testable
5. **Don't use external APIs without caching** — Metrics should be fast
6. **Don't forget to normalize scores** — Always 0.0-1.0
7. **Don't create duplicate metrics** — Check existing before building new
8. **Don't hardcode forbidden patterns** — Use config files
9. **Don't forget documentation** — Future devs need to understand your logic
10. **Don't commit without tests** — Untested metrics are liabilities

---

## Integration Points

### Where Metrics Are Used

1. **In engine.py** (IsolatedEvaluator)
   ```python
   # Calls evaluate_all_custom_metrics()
   from deepeval.evaluation.metrics import evaluate_all_custom_metrics
   ```

2. **In server.js** (Node backend)
   ```javascript
   // Spawns evaluate_responses.py which runs metrics
   const pythonProcess = spawn('python3', [join(__dirname, 'evaluate_responses.py')]);
   ```

3. **In dashboard** (`public/deepeval.html`)
   ```javascript
   // Displays metric scores and pass/fail badges
   metrics.qualityMetrics  // Array of metric results
   ```

4. **In tests** (`deepeval/tests/`)
   ```python
   # Golden dataset tests validate metrics work correctly
   pytest deepeval/tests/test_quality.py -v
   ```

---

## Next Steps

1. **Choose your first metric** — Pick one Type 1 or Type 2 metric from examples
2. **Implement & test** — Follow the step-by-step guide
3. **Add to evaluate_all_custom_metrics()** — Register in the function
4. **Run tests** — Ensure all tests pass
5. **Document** — Update this file with your metric
6. **Deploy** — Push to main branch

---

## FAQ

### Q: How many custom metrics should I create?
**A:** Start with 2-3, then add more as business needs evolve. Don't create metric for every possible quality dimension.

### Q: Can metrics depend on each other?
**A:** No. Each metric must be independent. If you need composition, create a new aggregated metric.

### Q: What's the performance target?
**A:** Each metric should complete in <500ms. If slower, consider caching or simplification.

### Q: How do I debug a failing metric?
**A:** Add print statements to the measure() method, run pytest with -s flag to see output.

### Q: Can I use external APIs in metrics?
**A:** Yes, but implement caching. External API calls are slow and unreliable.

### Q: Should I update thresholds per environment?
**A:** Yes. Use config files (`deepeval/config/qa.py` and `prod.py`) for environment-specific thresholds.

---

**Ready to implement?** Start with Step 1 of the Implementation Guide above! 🚀
