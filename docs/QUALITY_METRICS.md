# 🎯 DeepEval Quality Metrics Integration

## Overview
The DeepEval Dashboard now includes **14+ quality metrics** to comprehensively evaluate your chatbot's responses:

### Available Metrics

#### DeepEval Built-in Metrics:
1. **Answer Relevancy** - How directly does the response answer the question?
2. **Faithfulness** - Does the response stay true to the retrieval context?
3. **Contextual Precision** - Does the response only use relevant context?
4. **Contextual Recall** - Does the response cover all relevant context?
5. **Contextual Relevancy** - Is the retrieved context actually relevant?
6. **Hallucination** - Does the response contain made-up information?
7. **Toxicity** - Is the response toxic or harmful?
8. **Summarization** - If summarizing, is it accurate?

#### Custom Metrics:
9. **Response Length** - Is the response appropriately detailed?
10. **Completeness** - Does the response feel complete and thorough?
11. **Clarity** - Is the language clear and easy to understand?

## Setup Instructions

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

This installs `deepeval`, a comprehensive evaluation framework.

### 2. Verify Installation
```bash
python3 -c "from deepeval.metrics import AnswerRelevancyMetric; print('✓ DeepEval installed')"
```

### 3. Configuration
- System automatically detects and uses Python evaluation if available
- Falls back gracefully if DeepEval isn't installed
- No additional configuration needed

## Usage

### 1. Run Evaluation
- Go to **📊 DeepEval Dashboard**
- Configure evaluation parameters
- Click **▶ Run DeepEval**
- Metrics are computed automatically during evaluation

### 2. View Results
Three new views are available:

#### **⭐ Quality Metrics Tab**
- **Metric Badges**: Shows score for each metric (0-100%) plus a Pass/Fail label
- **Unified 75% threshold**: every metric uses the same bar — Green/✅ Pass at ≥75%, Red/❌ Fail below 75% (set via `PASS_THRESHOLD` in `evaluate_responses.py`)
- **Overall summary banner**: shows how many of the metrics passed (e.g. "9/11 metrics passed (82%)") above the metric grid
- **Radar Chart**: Visual comparison of all metrics
- **Bar Chart**: Scores distributed by metric

#### **📈 Analysis Tab** 
- Performance metrics (response time)
- Response time distribution

#### **💬 Conversation Tab**
- Full Q&A history

## Metric Interpretation

### Pass/Fail Bar:
- **≥75%**: ✅ Pass — meets the unified quality bar
- **<75%**: ❌ Fail — below the unified quality bar

### Score Ranges (for finer-grained reading of a passing/failing score):
- **80-100%**: Excellent
- **60-79%**: Good
- **40-59%**: Fair
- **0-39%**: Needs Improvement

### What Each Metric Means:

| Metric | High Score | Low Score |
|--------|-----------|-----------|
| Answer Relevancy | Response directly addresses question | Response is off-topic |
| Faithfulness | Stays true to facts/context | Contains false claims |
| Contextual Precision | Uses only relevant info | Includes irrelevant context |
| Contextual Recall | Covers all important info | Missing key information |
| Hallucination | No made-up information | Fabricates facts |
| Toxicity | Respectful language | Harmful/toxic content |
| Clarity | Easy to understand | Confusing or unclear |
| Completeness | Comprehensive answer | Incomplete response |

## API Integration

### Response Format: Server-Sent Events stream (updated Sep 2026)

`POST /api/deepeval` no longer waits for the whole evaluation and returns one JSON body. It sends `Content-Type: text/event-stream` and writes a `data: {...}\n\n` line for every step as the run progresses — this is what drives the live progress bar in `public/deepeval.html` instead of it sitting frozen for the whole run:

```
data: {"type":"progress","percent":10,"message":"Preparing test prompts..."}

data: {"type":"progress","percent":53,"message":"Collected response 1/2..."}

data: {"type":"progress","percent":65,"message":"Running quality metrics evaluation (14+ metrics per response)..."}

data: {"type":"progress","percent":78,"message":"Scoring response 1/2..."}

data: {"type":"complete","success":true,"conversationId":"eval_...","metrics":{ ... },"artifactPath":"/artifacts/eval_....json"}
```

The final `complete` event carries the same `metrics` shape the old single JSON response used to be:

```json
{
  "type": "complete",
  "success": true,
  "conversationId": "eval_...",
  "metrics": {
    "qualityMetrics": {
      "answer_relevancy": {
        "avg": 0.85,
        "min": 0.80,
        "max": 0.90,
        "all": [0.85, 0.88, ...],
        "threshold": 0.75,
        "passed": true,
        "status": "Pass"
      },
      ...
    },
    "individualMetrics": [
      {
        "answer_relevancy": 0.85,
        "faithfulness": 0.92,
        ...
      }
    ],
    "passThreshold": 0.75,
    "metricsPassed": 9,
    "metricsTotal": 11,
    "overallPassRate": 0.82,
    "overallPass": false
  },
  "artifactPath": "/artifacts/eval_....json"
}
```

A failed run sends `{"type": "error", "error": "..."}` instead of `complete`. Any client (browser, curl, CI script) needs to read the streamed body and pick out the `complete` (or `error`) event — a plain `JSON.parse(responseBody)` will fail because the body is several JSON objects, not one.

## Troubleshooting

### "Metrics unavailable" Message
This appears when:
1. Python 3 is not installed
2. DeepEval module not installed (run `pip install -r requirements.txt`)
3. Python evaluation timeout (rare)

**Solution**: Install dependencies, then re-run evaluation

### Performance Notes
- First evaluation may take 30-60 seconds (model loading)
- Subsequent evaluations are faster
- 5-10 questions typically takes 45-90 seconds

### Customizing Metrics

To add custom evaluation metrics, edit `evaluate_responses.py`:

```python
# Add this to the evaluate_response() function:
custom_metric = YourMetric(threshold=0.5)
custom_metric.measure(test_case)
metrics_results["your_metric_name"] = round(custom_metric.score, 2)
```

## Performance Optimization

For faster evaluation:
1. Use **Static Mode** with fewer questions
2. Reduce **Number of Test Prompts** to 3-5
3. Avoid very long responses

## Integration with CI/CD

To integrate in automated testing:

```bash
# Run evaluation and save results
python3 evaluate_responses.py < evaluation_data.json > results.json

# Check quality thresholds
python3 -c "
import json
with open('results.json') as f:
    data = json.load(f)
    avg_quality = sum(m['avg'] for m in data['aggregated_metrics'].values()) / len(data['aggregated_metrics'])
    exit(0 if avg_quality >= 0.7 else 1)
"
```

## Future Enhancements

Planned metric additions:
- **Tool Correctness** - For evaluating function calling
- **Task Completion** - For task-based evals
- **Bias Detection** - For fairness evaluation
- **Custom G-Eval** - Define metrics in plain English
- **Trend Analysis** - Compare across evaluations
