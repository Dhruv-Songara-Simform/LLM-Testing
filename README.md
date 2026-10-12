# SimChat DeepEval Framework

AI chatbot evaluation platform: a DeepSeek-backed chatbot plus a dashboard that runs multi-prompt evaluations and scores responses against built-in and custom quality metrics (uniform 75% pass bar).

## Project Structure

```
.
├── server.js               Express server (npm start) — chat API + evaluation API (SSE)
├── evaluate_responses.py   Live evaluation engine, spawned by server.js per run
├── eval-cli.mjs            CLI evaluation + regression gate for CI (npm run eval)
├── test-metrics.js         Python ↔ Node integration check (npm run test:metrics)
├── verify-setup.sh         Environment check (npm run verify)
├── public/
│   ├── index.html          Chat UI
│   └── deepeval.html       Evaluation dashboard (metrics, charts, PDF/JSON export)
├── deepeval/               Target-architecture framework (IsolatedEvaluator, configs,
│                           datasets) — not yet wired into server.js
├── artifacts/              Saved evaluation runs (eval_*.json)
├── docs/                   Architecture, metrics and business documentation
└── reports/                Written analysis reports
```

## Run

```bash
npm install
pip install -r requirements.txt   # optional; heuristic metrics are used if unavailable
npm start                          # http://localhost:3000  (dashboard: /deepeval.html)
```

`.env` needs `TEXT_MODEL_API_KEY`, `TEXT_MODEL_BASE_URL`, `TEXT_MODEL`. Optional:

| Variable | Purpose |
|---|---|
| `PORT` / `HOST` | Listen address (default `127.0.0.1:3000`; set `HOST=0.0.0.0` to expose on the network) |
| `ALLOWED_EVAL_HOSTS` | Comma-separated chatbot hosts evaluations may target besides localhost |
| `JUDGE_MODEL`, `JUDGE_API_KEY`, `JUDGE_BASE_URL` | Score with a different model/provider than the chatbot (recommended: avoids self-grading bias) |

## Evaluation modes

- **Dynamic** — one conversation; AI-generated follow-ups probe consistency.
- **Static** — your prompts, each in its own conversation, sent 3 at a time.
- **Test Suite** — fixed cases from `deepeval/datasets/` (`golden`, `edge_cases`), each also scored on **Reference Match** against its expected answer. Use suites for run-to-run comparisons.

Scoring: each response is judged in its own stateless API call; scores within 10 points of the 75% bar are judged 3 times and the median is used. Custom metrics are saved server-side in `custom_metrics.json`.

## CI regression gate

```bash
npm run eval -- --suite golden --start-server          # exit 0 pass, 1 gate failed, 2 error
npm run eval -- --help                                 # all options
```

Fails when any metric is below 75%, any chatbot call fails, or a metric drops more than `--max-drop` points (default 10) versus the last run of the same endpoint and suite.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Send a message to the chatbot |
| GET | `/api/health` | Health check |
| POST | `/api/generate-question` | Generate an initial test question from a system prompt |
| POST | `/api/extract-metric-name` | Name a custom metric from its description |
| POST | `/api/deepeval` | Run an evaluation (Server-Sent Events: `progress` → `complete` / `error`) |
| GET | `/api/artifacts`, `/api/artifacts/:id` | List / fetch saved runs |
| GET | `/api/suites` | List fixed test suites |
| GET / POST / DELETE | `/api/custom-metrics[/:id]` | Saved custom metric library |

See [CLAUDE.md](CLAUDE.md) for architecture rules and [docs/](docs/) for deeper documentation.
