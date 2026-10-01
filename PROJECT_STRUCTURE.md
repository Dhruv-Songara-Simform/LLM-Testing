# Project Structure - Complete Reference

Clean, professional codebase organization with clear separation of concerns.

---

## 📊 Complete Project Tree

```
Chatbot testing/
│
├─── src/                          ⭐ MAIN SOURCE CODE (All code here)
│    ├── deepeval/                 Python Evaluation Framework
│    │   ├── evaluation/           Core evaluation logic
│    │   │   ├── __init__.py
│    │   │   ├── engine.py         🔥 IsolatedEvaluator (main)
│    │   │   └── metrics.py        Custom business metrics
│    │   │
│    │   ├── datasets/             Test Data (Golden + Synthetic)
│    │   │   ├── __init__.py
│    │   │   ├── golden/
│    │   │   │   ├── __init__.py
│    │   │   │   └── quality_qa_set.py    (5 baseline examples)
│    │   │   ├── synthetic/
│    │   │   │   ├── __init__.py
│    │   │   │   └── edge_cases.py        (20+ edge cases)
│    │   │   └── test/
│    │   │       └── __init__.py          (user-defined tests)
│    │   │
│    │   ├── tests/                Unit Tests (Pytest)
│    │   │   ├── __init__.py
│    │   │   ├── conftest.py       🔥 Fixtures & setup
│    │   │   ├── test_quality.py
│    │   │   ├── test_consistency.py
│    │   │   └── test_edge_cases.py
│    │   │
│    │   ├── config/               Environment Configurations
│    │   │   ├── __init__.py
│    │   │   ├── qa.py             QA (75% unified metric threshold)
│    │   │   └── prod.py           Production (75% unified metric threshold)
│    │   │
│    │   ├── utils/                Utility Functions
│    │   │   └── __init__.py
│    │   │
│    │   └── __init__.py
│    │
│    ├── server/                   Node.js Backend
│    │   ├── server.js             🔥 Express API
│    │   └── test-metrics.js       Integration tests
│    │
│    └── public/                   Web UI Frontend
│        ├── index.html            Chat interface
│        ├── deepeval.html         Evaluation dashboard
│        └── styles/               CSS files
│
├─── docs/                         ⭐ ALL DOCUMENTATION (225+ pages)
│    ├── QUICK_START.md            🔥 Start here (5 min setup)
│    ├── CODEBASE_STRUCTURE.md     Technical guide (90+ pages)
│    ├── AI_CHATBOT_EVOLUTION_PROPOSAL.md  Business case (50+ pages)
│    ├── ARCHITECTURE_DIAGRAM.md   Visual diagrams & data flow
│    ├── FRAMEWORK_SUMMARY.md      Project overview
│    ├── QUALITY_METRICS.md        Metric definitions
│    ├── QUICK_REFERENCE.md        Fast lookup
│    ├── IMPLEMENTATION_SUMMARY.md Technical summary
│    ├── METRICS_REFERENCE.md      Metric reference
│    │
│    ├── guides/                   How-to Guides
│    │   ├── adding-custom-metrics.md
│    │   ├── adding-datasets.md
│    │   ├── integration-guide.md
│    │   └── deployment-guide.md
│    │
│    ├── api/                      API Documentation
│    │   ├── evaluation-api.md
│    │   ├── config-reference.md
│    │   └── metrics-api.md
│    │
│    └── architecture/             Technical Deep Dives
│        ├── isolated-sessions.md
│        ├── metrics-system.md
│        └── data-flow.md
│
├─── reports/                      ⭐ EVALUATION RESULTS & LOGS
│    ├── runs/                     Individual Evaluation Results
│    │   ├── 2024-09-26_eval_001.json
│    │   ├── 2024-09-26_eval_002.json
│    │   └── ...
│    │
│    ├── custom/                   Custom Report Artifacts
│    │   ├── monthly-summary.md
│    │   ├── regression-analysis.md
│    │   └── ...
│    │
│    └── logs/                     Application Logs
│        ├── app.log
│        ├── qa_evaluation.log
│        └── prod_evaluation.log
│
├─── artifacts/                    ⭐ STORED ARTIFACTS (Generated outputs)
│    ├── visualizations/
│    ├── exports/
│    └── ...
│
├─── config/                       CONFIGURATION FILES
│    ├── .env                      Environment variables (gitignored)
│    ├── .env.example              Template (add to .env)
│    └── config.yml                Main config (optional)
│
├─── scripts/                      UTILITY SCRIPTS
│    ├── setup.sh                  Setup script
│    ├── run-tests.sh              Test runner
│    ├── deploy.sh                 Deployment
│    └── ...
│
├─── tests/                        INTEGRATION TESTS
│    ├── e2e/                      End-to-end tests
│    │   └── evaluation.test.js
│    └── integration/              Integration tests
│        └── api.test.js
│
├── CLAUDE.md                      🔥 Project guide for Claude
├── README.md                      🔥 Project overview (this is new)
├── PROJECT_STRUCTURE.md           This file
├── package.json                   Node.js dependencies
├── requirements.txt               Python dependencies
└── .gitignore
```

---

## 📍 Quick Navigation

### Finding Code
```
All source code → src/
  Python evaluation → src/deepeval/
  Node.js server → src/server/
  Web UI → src/public/
```

### Finding Documentation
```
All docs → docs/
  Quick start → docs/QUICK_START.md
  Technical guide → docs/CODEBASE_STRUCTURE.md
  How-to guides → docs/guides/
  API reference → docs/api/
  Architecture → docs/architecture/
```

### Finding Results
```
Evaluation results → reports/runs/
Custom reports → reports/custom/
Logs → reports/logs/
Generated artifacts → artifacts/
```

### Finding Configuration
```
Environment variables → config/.env
Configuration files → config/
```

---

## 🗂️ Folder Purposes

### `src/` - Source Code
**Purpose:** All project code lives here, organized by component

```
src/
├── deepeval/     Evaluation framework (Python)
│   ├── evaluation/    Core metrics & evaluation logic
│   ├── datasets/      Test data (golden + synthetic)
│   ├── tests/         Unit tests (pytest)
│   ├── config/        QA & Prod configurations
│   └── utils/         Shared utilities
├── server/       Backend API (Node.js)
└── public/       Frontend UI (HTML/CSS/JS)
```

**What goes here:**
- Python files (evaluation, metrics, datasets)
- JavaScript files (server, API routes)
- HTML/CSS files (web UI)
- Test files

**What doesn't go here:**
- Documentation files
- Configuration (that goes in config/)
- Results/logs (that goes in reports/)

---

### `docs/` - Documentation
**Purpose:** All markdown documentation, organized by topic

```
docs/
├── Main guides (QUICK_START.md, CODEBASE_STRUCTURE.md, etc.)
├── guides/       How-to guides
├── api/          API documentation
└── architecture/ Technical deep dives
```

**What goes here:**
- All .md files
- How-to guides
- API documentation
- Technical explanations
- Architecture diagrams (in md)

**What doesn't go here:**
- Code files
- Log files
- Generated reports

---

### `reports/` - Results & Logs
**Purpose:** Store all evaluation results and application logs

```
reports/
├── runs/         Individual evaluation runs (JSON)
├── custom/       Custom report artifacts (markdown/HTML)
└── logs/         Application logs
```

**What goes here:**
- Evaluation results (JSON files)
- Custom reports (markdown, HTML)
- Application logs
- Metrics history

**What doesn't go here:**
- Source code
- Documentation
- Generated visualizations (those go in artifacts/)

---

### `artifacts/` - Generated Files
**Purpose:** Store generated outputs, visualizations, exports

```
artifacts/
├── visualizations/   Charts, graphs, diagrams
├── exports/         CSV, JSON exports
└── ...
```

**What goes here:**
- Generated visualizations
- Exported data files
- Generated reports
- User-created artifacts

**What doesn't go here:**
- Source code
- Configuration
- Logs

---

### `config/` - Configuration
**Purpose:** Centralized configuration management

```
config/
├── .env           Environment variables (SECRET - gitignored)
├── .env.example   Template (public)
└── config.yml     Optional config file
```

**What goes here:**
- Environment variables (.env)
- Configuration templates (.env.example)
- Config files (config.yml)

**What doesn't go here:**
- Hardcoded configuration in code
- Secrets in source files
- Default values (use environment)

---

### `scripts/` - Utilities
**Purpose:** Helper scripts for common tasks

```
scripts/
├── setup.sh       Initial setup
├── run-tests.sh   Test runner
├── deploy.sh      Deployment
└── ...
```

---

### `tests/` - Integration Tests
**Purpose:** Integration and E2E tests (separate from unit tests in src/deepeval/tests/)

```
tests/
├── e2e/           End-to-end tests
└── integration/   Integration tests
```

---

## 🎯 Organization Principles

### ✅ By Component, Not By Layer
```
✅ GOOD:
src/
├── deepeval/      One folder for evaluation framework
│   ├── evaluation/
│   ├── datasets/
│   ├── tests/
│   └── config/
└── server/        One folder for server code

❌ BAD:
src/
├── models/        Scattered by layer
├── controllers/
├── services/
├── tests/
└── config/
```

### ✅ Separated By Purpose
```
Code → src/
Docs → docs/
Results → reports/
Outputs → artifacts/
Config → config/
```

### ✅ Professional & Scalable
```
Easy to:
- Find things
- Add new features
- Onboard developers
- Scale the project
```

---

## 📊 File Count Summary

| Folder | Type | Count |
|--------|------|-------|
| src/deepeval/ | Python | 16 files |
| src/server/ | JavaScript | 2 files |
| src/public/ | HTML/CSS | 2+ files |
| docs/ | Markdown | 10+ files |
| reports/ | JSON/Logs | (grows over time) |
| config/ | Config | 2-3 files |
| scripts/ | Shell/Python | 3-5 files |
| **TOTAL** | | **40+ files (organized)** |

---

## 🔍 Finding Things

### "Where is the main evaluation code?"
→ `src/deepeval/evaluation/engine.py`

### "Where are test datasets?"
→ `src/deepeval/datasets/golden/` and `synthetic/`

### "Where is the API server?"
→ `src/server/server.js`

### "Where is the web UI?"
→ `src/public/deepeval.html`

### "Where is the setup guide?"
→ `docs/QUICK_START.md`

### "Where are evaluation results stored?"
→ `reports/runs/`

### "Where do I set environment variables?"
→ `config/.env`

### "Where are the thresholds configured?"
→ `src/deepeval/config/qa.py` (QA) or `prod.py` (Production)

---

## 🚀 Getting Started with This Structure

### Step 1: Understand the Layout
- Read this file (PROJECT_STRUCTURE.md)
- Look at the folder tree above

### Step 2: Read Documentation
- Start with: `docs/QUICK_START.md`
- Then read: `docs/CODEBASE_STRUCTURE.md`

### Step 3: Explore Code
- Start with: `src/deepeval/evaluation/engine.py`
- Then explore: `src/deepeval/config/` (settings)

### Step 4: Run Tests
```bash
pytest src/deepeval/tests/ -v
```

### Step 5: Check Results
```bash
ls reports/runs/
cat reports/runs/latest.json
```

---

## 📝 Adding New Components

### Add a New Metric
1. Edit: `src/deepeval/evaluation/metrics.py`
2. Create class with `measure()` method
3. Add test: `src/deepeval/tests/test_custom_metric.py`
4. Document: `docs/guides/adding-custom-metrics.md`

### Add a New Dataset
1. Create: `src/deepeval/datasets/mydata/`
2. Add test data file
3. Create loader function
4. Document: `docs/guides/adding-datasets.md`

### Add Documentation
1. Create: `docs/guides/my-guide.md`
2. Link from main docs
3. Follow existing format

### Add Configuration
1. Edit: `src/deepeval/config/qa.py` or `prod.py`
2. Update: `config/.env.example`
3. Document: `docs/api/config-reference.md`

---

## ✨ Benefits of This Structure

| Benefit | Impact |
|---------|--------|
| **Clear separation** | Easy to find things |
| **Professional layout** | Enterprise-ready |
| **Scalable** | Grows without getting messy |
| **Easy onboarding** | New developers understand quickly |
| **No scattered files** | Everything in logical place |
| **Source ≠ Results** | Code and outputs separate |
| **Organized docs** | Easy to find documentation |
| **Configuration centralized** | Single place for config |

---

## 🔄 Maintaining This Structure

### ✅ DO
- Keep code in `src/`
- Keep docs in `docs/`
- Keep results in `reports/`
- Keep artifacts in `artifacts/`
- Keep config in `config/`

### ❌ DON'T
- Don't scatter files at root
- Don't mix code and docs
- Don't put logs in src/
- Don't hardcode config values
- Don't mix concerns

---

## 📌 Summary

This is a **professional, organized codebase** with:
- ✅ All code in `src/`
- ✅ All documentation in `docs/`
- ✅ All results in `reports/`
- ✅ All outputs in `artifacts/`
- ✅ All config in `config/`
- ✅ Clear purposes for each folder
- ✅ Easy to navigate
- ✅ Ready to scale

---

**Version:** 1.0.0  
**Last Updated:** September 26, 2024  
**Status:** Production-Ready & Professional
