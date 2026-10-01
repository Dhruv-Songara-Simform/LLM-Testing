# DeepEval Framework - Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERACTION LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│                    Web UI (deepeval.html)                       │
│         ⭐ Quality Metrics Tab | 📈 Analysis | 💬 Chat          │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                    Node.js Server (server.js)                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /api/chat        → Send message to chatbot             │   │
│  │ /api/deepeval    → Trigger evaluation                  │   │
│  │ /api/results     → Fetch evaluation results            │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────┬──────────────────┘
             │                                │
             ▼ (Chat Request)                 ▼ (Eval Request)
┌──────────────────────────┐    ┌─────────────────────────────────┐
│   CHAT MODEL API         │    │ EVALUATION ENGINE (Python)      │
├──────────────────────────┤    ├─────────────────────────────────┤
│ Model: deepseek-chat     │    │ Script: evaluation/engine.py    │
│ Session: chat_abc123     │    │ Session: eval_def456 (SEPARATE) │
│ Temperature: 0.7         │    │ Temperature: 0.0 (Deterministic)│
│ Purpose: Generate        │    │ Purpose: Judge response quality │
└──────────────────────────┘    └──────────┬──────────────────────┘
             ▲                             │
             │                            ▼
         Response              ┌─────────────────────────────────┐
         "AI is..."            │ METRIC EVALUATION               │
                               ├─────────────────────────────────┤
                               │ Built-in Metrics (DeepEval):    │
                               │ • Answer Relevancy              │
                               │ • Faithfulness                  │
                               │ • Contextual Precision/Recall   │
                               │ • Hallucination Detection       │
                               │ • Toxicity Analysis             │
                               │ • Summarization Accuracy        │
                               │                                 │
                               │ Custom Metrics (metrics.py):    │
                               │ • Response Consistency          │
                               │ • Tool Call Accuracy            │
                               │ • Response Latency              │
                               │ • Context Relevance             │
                               │ • Safety Compliance             │
                               └──────────┬──────────────────────┘
                                          │
                                    Aggregation
                                          │
                                    ▼
                               Metrics JSON
                          {aggregated, individual}
                                    │
                                    ▼
             ┌──────────────────────────────────────┐
             │    REPORT & STORAGE LAYER            │
             ├──────────────────────────────────────┤
             │ reports/runs/                        │
             │ └─ 2024-09-26_run_001.json          │
             │ reports/custom/                      │
             │ └─ monthly_summary.md                │
             └──────────────────────────────────────┘
```

---

## Isolated Evaluation Sessions (Key Innovation)

```
PROBLEM: Chatbot's Context Bias
═════════════════════════════════════════════════════════════════

User Question: "What is AI?"
        │
        ▼
    CHAT SESSION (chat_abc123)
    ├─ Model: deepseek-chat
    ├─ System Prompt: "You are helpful assistant"
    ├─ Conversation History: [...previous messages...]
    ├─ Reasoning: "User asked Q, so I say R"
    ├─ Temperature: 0.7 (variable)
    └─ Response: "AI is artificial intelligence..."
        │
        ├─ Saved to database
        │
        └─► SAME SESSION EVALUATES ❌ (BIASED!)
             Judge: "It's good because I said it"
             Score: 0.92 (INFLATED)


SOLUTION: Isolated Evaluation Session
═════════════════════════════════════════════════════════════════

Response: "AI is artificial intelligence..."
        │
        ├─► Saved to database
        │
        └─► NEW SESSION EVALUATES ✅ (UNBIASED!)
             
             EVALUATION SESSION (eval_def456)
             ├─ Model: gpt-4 (different LLM)
             ├─ System Prompt: "You are objective judge"
             ├─ Conversation History: (NONE - fresh context)
             ├─ Previous Reasoning: (NOT INCLUDED)
             ├─ Temperature: 0.0 (deterministic)
             └─ Question: "Is this accurate?"
                Response: Yes, but could be more detailed
                Score: 0.75 (REALISTIC)

KEY DIFFERENCE: eval_def456 has NO memory of chat_abc123
═════════════════════════════════════════════════════════════════
```

---

## Data Flow: Chat → Evaluate → Report

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT: "What is machine learning?"                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ CHAT PIPELINE                                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Parse question                                           │
│ 2. Retrieve context (if RAG)                                │
│ 3. Generate response (LLM)                                  │
│ 4. Format output                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ RESPONSE: "Machine learning is a subset of AI..."           │
│ Context: [Retrieved docs], Time: 2.5s                       │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │ SAVE TO DATABASE                       │
    ├────────────────────────────────────────┤
    │ {                                      │
    │   prompt: "What is ML?",               │
    │   response: "ML is...",                │
    │   context: [...],                      │
    │   timestamp: 2024-09-26T10:30:00Z,     │
    │   session_id: "chat_abc123"            │
    │ }                                      │
    └────────────────┬───────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ EVALUATION PIPELINE                                          │
│ (Spawns: python3 deepeval/evaluation/engine.py)             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ INPUT: { prompts: [...], responses: [...] }                │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ISOLATED EVALUATOR                                     │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ session_id: eval_def456 (NEW, SEPARATE)               │  │
│ │ model: gpt-4                                           │  │
│ │ temperature: 0.0 (deterministic)                       │  │
│ │                                                        │  │
│ │ For each (prompt, response):                           │  │
│ │   1. Try DeepEval metrics                             │  │
│ │      • Answer Relevancy: 0.85                         │  │
│ │      • Faithfulness: 0.92                             │  │
│ │      • Contextual Precision: 0.80                     │  │
│ │      • ... (8 metrics total)                          │  │
│ │                                                        │  │
│ │   2. Calculate Custom metrics                         │  │
│ │      • Latency: 0.91 (2.5s response)                 │  │
│ │      • Safety: 0.99 (no PII)                         │  │
│ │      • ... (5 metrics total)                          │  │
│ │                                                        │  │
│ │   3. Aggregate results                                │  │
│ │      • answer_relevancy.avg: 0.85                     │  │
│ │      • answer_relevancy.min: 0.75                     │  │
│ │      • answer_relevancy.max: 0.95                     │  │
│ │      • ... (aggregated for all metrics)               │  │
│ │                                                        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ OUTPUT: {                                                    │
│   evaluation_session: {...},                               │
│   individual_metrics: [{...}, {...}],                      │
│   aggregated_metrics: {                                    │
│     answer_relevancy: {avg: 0.85, min: 0.75, ...},       │
│     faithfulness: {avg: 0.92, ...},                        │
│     ...                                                    │
│   }                                                         │
│ }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ SAVE EVALUATION RESULTS          │
        ├──────────────────────────────────┤
        │ reports/runs/2024-09-26_001.json │
        │ Contains:                        │
        │ • All metrics                    │
        │ • Aggregated scores              │
        │ • Timestamp                      │
        │ • Session info                   │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ DISPLAY IN DASHBOARD             │
        ├──────────────────────────────────┤
        │ ⭐ Quality Metrics Tab           │
        │ • Metric badges                  │
        │ • Radar chart                    │
        │ • Bar chart (ranked)             │
        │ • Overall quality score          │
        └──────────────────────────────────┘
```

---

## File Organization by Purpose

```
deepeval/
│
├── evaluation/
│   ├── engine.py         ← START HERE: IsolatedEvaluator class
│   ├── metrics.py        ← 5 Custom metrics
│   └── __init__.py
│
├── datasets/
│   ├── golden/           ← Human-verified baseline data
│   │   ├── quality_qa_set.py
│   │   └── __init__.py
│   │
│   ├── synthetic/        ← Auto-generated edge cases
│   │   ├── edge_cases.py
│   │   └── __init__.py
│   │
│   └── test/             ← (User-defined custom tests)
│       └── __init__.py
│
├── tests/
│   ├── conftest.py       ← Pytest fixtures (shared setup)
│   ├── test_quality.py   ← Golden dataset tests
│   ├── test_consistency.py
│   ├── test_edge_cases.py
│   └── __init__.py
│
├── config/
│   ├── qa.py             ← QA thresholds (70%+ ok)
│   ├── prod.py           ← Prod thresholds (80%+ required)
│   └── __init__.py
│
├── reports/
│   ├── runs/             ← Evaluation results (JSON)
│   └── custom/           ← Custom report artifacts
│
├── logs/                 ← Application logs
├── utils/                ← (Utilities - extensible)
├── ci/                   ← CI/CD configs
│
└── __init__.py
```

---

## Metric Scoring Hierarchy

```
┌─────────────────────────────────────────────────────┐
│         INDIVIDUAL RESPONSE METRICS                 │
│     (11 built-in + 5 custom = 16 total)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Answer Relevancy ─┐                               │
│  Faithfulness     │                                │
│  Clarity          ├─ Quality Tier                  │
│  Completeness     │  (Avg: 0.82)                   │
│  Response Length  │                                │
│                  ─┘                                │
│                                                     │
│  Contextual Precision ─┐                           │
│  Contextual Recall    ├─ Context Tier              │
│  Context Relevance    │  (Avg: 0.78)               │
│                      ─┘                            │
│                                                     │
│  Hallucination ─┐                                  │
│  Toxicity      ├─ Safety Tier                      │
│  Safety Comp.  │  (Avg: 0.95)                      │
│                ─┘                                  │
│                                                     │
│  Latency              ─┐                           │
│  Tool Accuracy        ├─ System Tier               │
│  Consistency          │  (Avg: 0.88)               │
│                       ─┘                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        AGGREGATED SCORES (Multiple Responses)       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  For each metric:                                  │
│  • Average (mean of all scores)                    │
│  • Min (worst score)                               │
│  • Max (best score)                                │
│  • All (raw scores)                                │
│                                                     │
│  Example for Answer Relevancy:                     │
│  {                                                 │
│    "avg": 0.85,                                    │
│    "min": 0.75,                                    │
│    "max": 0.95,                                    │
│    "all": [0.85, 0.92, 0.75, 0.88, ...]           │
│  }                                                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         COMPOSITE QUALITY SCORES                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Overall Quality = Avg of ALL metrics              │
│                  = (0.82 + 0.78 + 0.95 + 0.88) / 4│
│                  = 0.86 (GOOD ✅)                  │
│                                                     │
│  Safety Score    = Safety tier metrics only        │
│                  = (0.95 + 0.98 + 0.99) / 3        │
│                  = 0.97 (EXCELLENT ✅)             │
│                                                     │
│  Enterprise Score = Critical metrics only          │
│                  = (0.99 + 0.95) / 2               │
│                  = 0.97 (COMPLIANT ✅)             │
└─────────────────────────────────────────────────────┘
```

---

## Configuration Differences: QA vs Production

```
DEVELOPMENT (QA Environment)            PRODUCTION (Prod Environment)
════════════════════════════════════════════════════════════════════

Threshold Philosophy:                  Threshold Philosophy:
"Is this reasonable?"                  "Is this enterprise-ready?"
(Lower standards for iteration)         (Strict standards for safety)

┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ METRIC THRESHOLDS                │  │ METRIC THRESHOLDS                │
├──────────────────────────────────┤  ├──────────────────────────────────┤
│ Answer Relevancy:  0.70 ✅        │  │ Answer Relevancy:  0.80 ✅       │
│ Faithfulness:      0.75 ✅        │  │ Faithfulness:      0.85 ✅       │
│ Hallucination:     0.80 ✅        │  │ Hallucination:     0.90 ✅       │
│ Toxicity:          0.90 ✅        │  │ Toxicity:          0.95 ✅       │
│ Safety Compliance: 0.95 ✅        │  │ Safety Compliance: 0.99 ✅       │
└──────────────────────────────────┘  └──────────────────────────────────┘

EXECUTION MODEL:                       EXECUTION MODEL:
Sequential (one-by-one)                Parallel (concurrent)
  ↓ Slower but easier to debug         ↓ Faster for large batches
  Execution: ~5 seconds for 5 tests    Execution: ~2 seconds for 5 tests

LOGGING:                               LOGGING:
Verbose (DEBUG level)                  Minimal (INFO level)
  ↓ Shows all decisions                ↓ Shows only important events
  Log size: Can be large               Log size: Compact (rotated)

DATASET PASS RATES:                    DATASET PASS RATES:
Golden: 85% minimum                    Golden: 95% minimum
Synthetic: 70% minimum                 Synthetic: 85% minimum
Custom: 75% minimum                    Custom: 90% minimum

ALERTS:                                ALERTS:
None (development only)                Enabled (24/7 monitoring)
  ↓ Manual review of changes           ↓ Automatic alerts if drop > 5%
  Notification: Team Slack

DEPLOYMENT:                            DEPLOYMENT:
Auto-deploy (no gates)                 Gated deployment
  ↓ Test on feature branches           ↓ Only approved for production
  Speed: Fast iteration                Speed: Safe, measured releases
```

---

## Integration Points with Existing Stack

```
┌─────────────────────────────────────────────────────────┐
│              EXISTING SYSTEMS                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Node.js Server (server.js)                            │
│  ├─ /api/chat          → Calls chatbot                │
│  ├─ /api/deepeval      → Triggers evaluation         │
│  └─ /api/results       → Returns metrics              │
│                                                        │
│  Web UI (public/deepeval.html)                         │
│  ├─ Displays chat UI                                 │
│  ├─ Shows quality metrics tab                        │
│  └─ Renders charts (radar, bar)                      │
│                                                        │
│  Database                                             │
│  └─ Stores: Conversations, Metrics, Results          │
│                                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ NEW INTEGRATION
                   ▼
┌─────────────────────────────────────────────────────────┐
│         NEW DEEPEVAL FRAMEWORK                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Python Evaluation Engine                              │
│  └─ deepeval/evaluation/engine.py                      │
│                                                        │
│  Metrics System                                        │
│  ├─ Built-in DeepEval (8 metrics)                     │
│  ├─ Custom Metrics (5 metrics)                        │
│  └─ Aggregation Logic                                 │
│                                                        │
│  Datasets                                              │
│  ├─ Golden (5 baseline examples)                      │
│  └─ Synthetic (20+ edge cases)                        │
│                                                        │
│  Configuration                                         │
│  ├─ QA Config (70% thresholds)                        │
│  └─ Prod Config (80%+ thresholds)                     │
│                                                        │
│  Testing                                               │
│  ├─ Pytest fixtures                                   │
│  └─ Test files (test_quality.py, etc)                 │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Lookup: What to Read When

```
QUESTION                          ANSWER LOCATION
═════════════════════════════════════════════════════════

"What's the overall structure?"   → FRAMEWORK_SUMMARY.md

"How do I use this?"              → QUICK_START.md

"I need complete details"         → CODEBASE_STRUCTURE.md

"How is this better?"             → AI_CHATBOT_EVOLUTION_PROPOSAL.md

"Quick reference for commands?"   → QUICK_REFERENCE.md

"Show me architecture"            → ARCHITECTURE_DIAGRAM.md (this file)

"I want source code docs"         → Code comments in:
                                  deepeval/evaluation/engine.py
                                  deepeval/evaluation/metrics.py
                                  deepeval/config/qa.py
                                  deepeval/config/prod.py

"How to add custom metric?"       → CODEBASE_STRUCTURE.md
                                  Section: "Extension Points"

"Why isolated sessions?"          → AI_CHATBOT_EVOLUTION_PROPOSAL.md
                                  Section: "Session Isolation"

"Metric definitions?"             → QUALITY_METRICS.md

"Help me set up CI/CD"            → IMPLEMENTATION_SUMMARY.md
```

---

**Version:** 1.0.0  
**Last Updated:** September 26, 2024  
**Framework Status:** ✅ Complete & Production-Ready
