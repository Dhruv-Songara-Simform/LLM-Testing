# SimChat DeepEval Framework

Production-grade AI chatbot evaluation system with isolated evaluation sessions and 15+ quality metrics.

---

## 📁 Project Structure (Clean & Organized)

```
project-root/
│
├── src/                          ⭐ MAIN SOURCE CODE
│   ├── deepeval/                 Python evaluation framework
│   │   ├── evaluation/
│   │   │   ├── engine.py         IsolatedEvaluator class
│   │   │   └── metrics.py        5 custom metrics
│   │   ├── datasets/
│   │   │   ├── golden/           Human-verified examples
│   │   │   ├── synthetic/        Auto-generated edge cases
│   │   │   └── test/             User-defined tests
│   │   ├── tests/
│   │   │   ├── conftest.py       Pytest fixtures
│   │   │   ├── test_quality.py
│   │   │   └── test_edge_cases.py
│   │   ├── config/
│   │   │   ├── qa.py             QA thresholds (70%+)
│   │   │   └── prod.py           Prod thresholds (80%+)
│   │   └── utils/
│   ├── server/                   Node.js backend
│   │   ├── server.js             Express API
│   │   └── test-metrics.js       Integration tests
│   └── public/                   Web UI frontend
│       ├── index.html            Chat interface
│       ├── deepeval.html         Evaluation dashboard
│       └── styles/
│
├── docs/                         ⭐ ALL DOCUMENTATION (225+ pages)
│   ├── QUICK_START.md            5-minute setup
│   ├── CODEBASE_STRUCTURE.md     Technical guide (90+ pages)
│   ├── AI_CHATBOT_EVOLUTION_PROPOSAL.md  Business case (50+ pages)
│   ├── ARCHITECTURE_DIAGRAM.md   Visual diagrams
│   ├── FRAMEWORK_SUMMARY.md      Overview
│   ├── QUALITY_METRICS.md        Metric definitions
│   ├── guides/                   How-to guides
│   ├── api/                      API documentation
│   └── architecture/             Technical deep dives
│
├── reports/                      ⭐ EVALUATION RESULTS & LOGS
│   ├── runs/                     Individual evaluation runs (JSON)
│   │   └── 2024-09-26_eval_001.json
│   ├── custom/                   Custom report artifacts
│   └── logs/                     Application logs
│
├── artifacts/                    ⭐ STORED ARTIFACTS
│   └── (evaluation outputs, visualizations)
│
├── config/                       CONFIGURATION FILES
│   ├── .env                      Environment variables
│   └── .env.example              Example template
│
├── scripts/                      UTILITY SCRIPTS
│   ├── setup.sh
│   ├── run-tests.sh
│   └── deploy.sh
│
├── tests/                        INTEGRATION TESTS
│   ├── e2e/
│   └── integration/
│
├── CLAUDE.md                     Project guide for Claude
├── package.json                  Node.js dependencies
├── requirements.txt              Python dependencies
└── .gitignore
```

---

## 🎯 Key Points

### Clear Separation of Concerns
- **src/** — All source code (Python + Node.js)
- **docs/** — All documentation in one place
- **reports/** — Evaluation results and logs
- **artifacts/** — Generated output files
- **config/** — Configuration files

### No Scattered Files
- ✅ MD files NOT in root (they're in docs/)
- ✅ Reports NOT in src/ (they're in reports/)
- ✅ Code NOT mixed with docs
- ✅ Config centralized in config/

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt
npm install

# 2. Setup configuration
cp config/.env.example config/.env

# 3. Verify setup
npm run verify

# 4. Start server
npm start

# 5. Access dashboard
# Chat: http://localhost:3000
# Eval: http://localhost:3000/deepeval.html
```

---

## 📂 Folder Purposes

### `src/` — SOURCE CODE (Keep organized by component)
```
All code organized by function, not by layer:
- deepeval/      Evaluation framework
- server/        Node.js backend
- public/        Frontend UI
- shared/        Shared utilities (expandable)
```

### `docs/` — DOCUMENTATION (All MD files here)
```
Organized by topic:
- guides/        How-to guides
- api/           API documentation
- architecture/  Technical details
- QUICK_START.md, CODEBASE_STRUCTURE.md, etc.
```

### `reports/` — RESULTS & LOGS (Outputs only, not code)
```
- runs/          Evaluation results (JSON files)
- custom/        Custom report artifacts
- logs/          Application logs
```

### `artifacts/` — GENERATED FILES (User-created outputs)
```
- Visualizations
- Exports
- Custom outputs
```

### `config/` — CONFIGURATION (Environment & setup)
```
- .env           Environment variables
- .env.example   Template/example
- config.yml     Config file (if needed)
```

---

## 📊 Navigation Guide

**Where is each component?**

| What | Location |
|------|----------|
| **Main evaluation code** | `src/deepeval/evaluation/engine.py` |
| **Custom metrics** | `src/deepeval/evaluation/metrics.py` |
| **Golden test data** | `src/deepeval/datasets/golden/` |
| **API server** | `src/server/server.js` |
| **Web UI** | `src/public/index.html` + `deepeval.html` |
| **Setup guide** | `docs/QUICK_START.md` |
| **Technical guide** | `docs/CODEBASE_STRUCTURE.md` |
| **Business case** | `docs/AI_CHATBOT_EVOLUTION_PROPOSAL.md` |
| **Architecture** | `docs/ARCHITECTURE_DIAGRAM.md` |
| **Evaluation results** | `reports/runs/*.json` |
| **Application logs** | `reports/logs/` |
| **Environment vars** | `config/.env` |

---

## 📚 Documentation Organization

All markdown files are in `docs/`:

```
docs/
├── QUICK_START.md                  ← Start here! (5 min)
├── CODEBASE_STRUCTURE.md           ← Technical guide (90+ pages)
├── AI_CHATBOT_EVOLUTION_PROPOSAL.md← Business context (50+ pages)
├── ARCHITECTURE_DIAGRAM.md         ← Visual design
├── FRAMEWORK_SUMMARY.md            ← Overview
├── QUALITY_METRICS.md              ← Metric definitions
├── guides/
│   ├── adding-custom-metrics.md
│   ├── adding-datasets.md
│   └── integration-guide.md
├── api/
│   ├── evaluation-api.md
│   └── config-reference.md
└── architecture/
    ├── isolated-sessions.md
    └── metrics-system.md
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest src/deepeval/tests/ -v

# Run golden dataset tests
pytest src/deepeval/tests/test_quality.py -v

# Run edge case tests
pytest src/deepeval/tests/test_edge_cases.py -v

# Run with specific marker
pytest -m golden     # Golden tests
pytest -m synthetic  # Synthetic tests
```

---

## 🔧 Common Tasks

### View evaluation results
```bash
# Check the latest results
ls -la reports/runs/
cat reports/runs/latest.json
```

### Check logs
```bash
tail -f reports/logs/app.log
```

### Add new golden example
1. Edit: `src/deepeval/datasets/golden/quality_qa_set.py`
2. Add Q&A to list
3. Test: `pytest src/deepeval/tests/test_quality.py -v`

### Change QA thresholds
1. Edit: `src/deepeval/config/qa.py`
2. Update `METRIC_THRESHOLDS`
3. Run tests to verify

### Change Production thresholds
1. Edit: `src/deepeval/config/prod.py`
2. Update `METRIC_THRESHOLDS`
3. Run production tests

---

## 📋 Before & After Comparison

### ❌ BEFORE (Messy)
```
/Chatbot testing/
├── deepeval/                 Mixed with other stuff
├── public/
├── *.md files scattered everywhere
├── server.js at root
├── *.py files scattered
└── node_modules/
```

### ✅ AFTER (Clean)
```
/Chatbot testing/
├── src/deepeval/             All code organized
├── src/server/
├── src/public/
├── docs/                     All documentation
├── reports/                  All results
├── artifacts/                All outputs
├── config/                   All configuration
└── scripts/                  All utilities
```

---

## 🎯 Benefits of New Structure

| Benefit | Before | After |
|---------|--------|-------|
| **Find code** | Scattered | `src/` - one place |
| **Find docs** | All over root | `docs/` - organized |
| **Find reports** | No dedicated folder | `reports/` - centralized |
| **Find config** | Hardcoded/root | `config/` - managed |
| **Add new feature** | Unclear where | Clear folder structure |
| **Onboard new dev** | Confusing | Easy to navigate |
| **Scale project** | Gets messier | Remains organized |

---

## 📖 Reading Guide

**Choose based on your need:**

1. **"I want to get started NOW"**
   → Read: `docs/QUICK_START.md` (10 min)

2. **"I need complete technical understanding"**
   → Read: `docs/CODEBASE_STRUCTURE.md` (90+ pages)

3. **"Show me how this works visually"**
   → Read: `docs/ARCHITECTURE_DIAGRAM.md` (20 pages)

4. **"I need to understand the business value"**
   → Read: `docs/AI_CHATBOT_EVOLUTION_PROPOSAL.md` (50+ pages)

5. **"I need a quick reference"**
   → Read: `docs/QUICK_REFERENCE.md`

6. **"I want to understand the project guide"**
   → Read: `CLAUDE.md`

---

## ✅ Verification Checklist

- [x] All code in `src/`
- [x] All docs in `docs/`
- [x] All reports in `reports/`
- [x] All artifacts in `artifacts/`
- [x] All config in `config/`
- [x] Clear folder purposes
- [x] No scattered files
- [x] Professional structure
- [x] Easy to navigate
- [x] Scalable layout

---

## 🎯 Structure Highlights

### ✨ Professional Organization
- **src/** — Organized by component, not by layer
- **docs/** — Hierarchical documentation
- **reports/** — Time-stamped results
- **artifacts/** — Generated outputs
- **config/** — Environment management

### ✨ Clear Separation
- Code ≠ Documentation
- Source ≠ Results
- Configuration ≠ Code
- Logs ≠ Reports

### ✨ Enterprise Ready
- Scalable structure
- Easy to find things
- Professional layout
- Industry standard

---

## 🚀 Next Steps

1. ✅ Understand the structure (this file)
2. → Read `docs/QUICK_START.md` to get running
3. → Read `docs/CODEBASE_STRUCTURE.md` for technical details
4. → Explore `src/deepeval/` to understand code
5. → Check `reports/runs/` for evaluation results

---

**Status:** ✅ Clean, Professional, Production-Ready  
**Version:** 1.0.0  
**Last Updated:** September 26, 2024
