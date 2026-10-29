#!/usr/bin/env node
// Command-line evaluation + regression gate for CI.
// Exit codes: 0 = quality gate passed, 1 = quality gate failed, 2 = run/usage error.

import 'dotenv/config';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ALL_BUILTIN = ['Answer Relevancy', 'Faithfulness', 'Contextual Precision', 'Contextual Recall', 'Contextual Relevancy', 'Hallucination', 'Toxicity', 'Summarization'];
const USAGE = `Usage: npm run eval -- [options]

Test cases (pick one):
  --suite <id>              Fixed suite: golden | edge_cases            (default: golden)
  --prompts "q1|q2|..."     Static prompts, each in its own conversation
  --prompts-file <path>     Static prompts, one per line
  --dynamic "<question>"    Dynamic conversation starting from this question
  --turns <n>               Turns for --dynamic                         (default: 3)

Options:
  --server <url>            Running dashboard server  (default: http://localhost:$PORT or 3000)
  --start-server            Start server.js for this run and stop it afterwards
  --endpoint <url>          Chatbot endpoint to evaluate                (default: <server>/api/chat)
  --system-prompt <text>    System prompt sent to the chatbot
  --metrics <list|all>      Comma-separated built-in metric names       (default: all)
  --custom <all|none|ids>   Saved custom metrics to include             (default: none)
  --baseline <latest|none|runId>  Run to compare against                (default: latest)
  --max-drop <points>       Fail if any metric drops more than this vs baseline (default: 10;
                            identical golden-suite runs vary by up to ~12 points on Reference Match)
  --out <file>              Write a JSON summary for CI artifacts

Requirements (opt-in; needs FEATURE_REQUIREMENTS=true on the server):
  --requirements <file>     Evaluate these requirements too (.txt/.md, one per line, max 100 words each)
  --gate-requirements       Also fail the gate when a tested requirement fails or is not measured`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    if (key === 'start-server' || key === 'help' || key === 'gate-requirements') {
      args[key] = true;
    } else {
      if (i + 1 >= argv.length) throw new Error(`Missing value for --${key}`);
      args[key] = argv[++i];
    }
  }
  return args;
}

const pct = v => (typeof v === 'number' ? `${Math.round(v * 100)}%` : 'N/A');

async function waitForServer(server, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${server}/api/health`)).ok) return true;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function runEvaluation(server, payload) {
  const res = await fetch(`${server}/api/deepeval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastPercent = -1;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop();
    for (const raw of chunks) {
      const chunk = raw.trim();
      if (!chunk.startsWith('data:')) continue;
      const event = JSON.parse(chunk.slice(5));
      if (event.type === 'progress' && event.percent !== lastPercent) {
        lastPercent = event.percent;
        process.stderr.write(`  [${String(event.percent).padStart(3)}%] ${event.message}\n`);
      } else if (event.type === 'error') {
        throw new Error(event.error);
      } else if (event.type === 'complete') {
        return event;
      }
    }
  }
  throw new Error('Evaluation stream ended without a result');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  const server = (args.server || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  const maxDrop = Number(args['max-drop'] ?? 10);
  if (!Number.isFinite(maxDrop) || maxDrop < 0) throw new Error('--max-drop must be a non-negative number');

  let serverProcess = null;
  if (args['start-server']) {
    serverProcess = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'server.js')], { stdio: 'ignore' });
  }
  try {
    if (!(await waitForServer(server, args['start-server'] ? 20000 : 3000))) {
      throw new Error(`Server not reachable at ${server}. Start it with "npm start" or pass --start-server.`);
    }

    const builtin = !args.metrics || args.metrics === 'all'
      ? ALL_BUILTIN
      : args.metrics.split(',').map(s => s.trim()).filter(Boolean);
    const unknown = builtin.filter(m => !ALL_BUILTIN.includes(m));
    if (unknown.length) throw new Error(`Unknown metric(s): ${unknown.join(', ')}. Valid: ${ALL_BUILTIN.join(', ')}`);

    let custom = [];
    if (args.custom && args.custom !== 'none') {
      const library = await (await fetch(`${server}/api/custom-metrics`)).json();
      custom = args.custom === 'all' ? library : args.custom.split(',').map(id => {
        const m = library.find(x => x.id === id.trim());
        if (!m) throw new Error(`Custom metric "${id}" not found in the saved library`);
        return m;
      });
    }

    // Requirements are parsed by the server (same rules as the dashboard) and sent as R-01, R-02, ...
    let requirements = [];
    if (args['gate-requirements'] && !args.requirements) throw new Error('--gate-requirements needs --requirements <file>');
    if (args.requirements) {
      const config = await (await fetch(`${server}/api/requirements/config`)).json();
      if (!config.enabled) throw new Error('The server has requirement evaluation disabled; set FEATURE_REQUIREMENTS=true in .env');
      const res = await fetch(`${server}/api/requirements/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: readFileSync(args.requirements, 'utf8') }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || `Could not parse ${args.requirements}`);
      if (parsed.rejected.length) throw new Error(`Requirements file has invalid lines: ${parsed.rejected.map(r => r.error).join(' ')}`);
      if (!parsed.requirements.length) throw new Error(`No requirements found in ${args.requirements}`);
      requirements = parsed.requirements.map((r, i) => ({ id: `R-${String(i + 1).padStart(2, '0')}`, text: r.text }));
    }

    const payload = {
      apiEndpoint: args.endpoint || `${server}/api/chat`,
      evaluationCriteria: { systemPrompt: args['system-prompt'] || null },
      selectedMetrics: { builtin, custom },
      ...(requirements.length ? { requirements } : {}),
    };
    if (args.dynamic) {
      Object.assign(payload, { evaluationMode: 'dynamic', initialPrompt: args.dynamic, numberOfTests: Number(args.turns || 3) });
    } else if (args.prompts || args['prompts-file']) {
      const prompts = args.prompts
        ? args.prompts.split('|')
        : readFileSync(args['prompts-file'], 'utf8').split('\n');
      Object.assign(payload, { evaluationMode: 'static', testPrompts: prompts.map(p => p.trim()).filter(Boolean) });
    } else {
      Object.assign(payload, { evaluationMode: 'suite', suiteId: args.suite || 'golden' });
    }

    const label = payload.evaluationMode === 'suite' ? `suite "${payload.suiteId}"` : `${payload.evaluationMode} prompts`;
    console.log(`Evaluating ${payload.apiEndpoint} with ${label}...`);
    const result = await runEvaluation(server, payload);
    const m = result.metrics;

    // Baseline: an earlier judge-scored run of the same endpoint and suite/mode (or an explicit run id).
    let baseline = null;
    const baselineArg = args.baseline || 'latest';
    if (baselineArg !== 'none') {
      const runs = await (await fetch(`${server}/api/artifacts`)).json();
      baseline = baselineArg === 'latest'
        ? runs.find(r => r.id !== result.conversationId && r.scoringMethod !== 'legacy'
            && r.evaluationMode === m.evaluationMode && (r.suiteId || null) === (m.suiteId || null)
            && r.apiEndpoint === m.apiEndpoint)
        : runs.find(r => r.id === baselineArg);
      if (baselineArg !== 'latest' && !baseline) throw new Error(`Baseline run "${baselineArg}" not found`);
    }

    const failures = [];
    const rows = Object.entries(m.qualityMetrics).map(([key, q]) => {
      const name = key.startsWith('custom_')
        ? (m.customMetrics.find(c => `custom_${c.id}` === key)?.name || key)
        : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const base = baseline?.scores?.[key];
      const delta = typeof base === 'number' ? Math.round((q.avg - base) * 100) : null;
      if (!q.passed) failures.push(`${name} is ${pct(q.avg)} (below ${pct(m.passThreshold)})`);
      if (delta !== null && -delta > maxDrop) failures.push(`${name} dropped ${-delta} points vs baseline (max ${maxDrop})`);
      return { name, score: q.avg, passed: q.passed, baseline: base ?? null, delta };
    });
    if (m.failedResponses.length) failures.push(`${m.failedResponses.length} chatbot response(s) failed`);

    console.log(`\nRun ${result.conversationId} · scored by ${m.scoringMethod}${m.judgeModel ? ` (${m.judgeModel})` : ''}`);
    console.log(baseline ? `Baseline: ${baseline.id} (${new Date(baseline.createdAt).toLocaleString()})` : 'Baseline: none (gating on the 75% bar only)');
    console.log(`\n${'Metric'.padEnd(26)}${'Score'.padStart(7)}${'Base'.padStart(7)}${'Δ'.padStart(6)}  Result`);
    for (const r of rows) {
      const d = r.delta === null ? '' : `${r.delta > 0 ? '+' : ''}${r.delta}`;
      console.log(`${r.name.slice(0, 25).padEnd(26)}${pct(r.score).padStart(7)}${pct(r.baseline).padStart(7)}${d.padStart(6)}  ${r.passed ? 'PASS' : 'FAIL'}`);
    }

    const rr = m.requirementResults;
    if (rr) {
      const s = rr.summary;
      console.log(`\nRequirements (separate judge session${rr.judgeModel ? `, ${rr.judgeModel}` : ''}): ${s.passed}/${s.tested} tested pass · coverage ${s.tested}/${s.selected}`);
      console.log(`${'Requirement'.padEnd(46)}${'Score'.padStart(7)}  Result`);
      for (const r of rr.requirements) {
        console.log(`${`${r.id} ${r.text}`.slice(0, 45).padEnd(46)}${pct(r.score).padStart(7)}  ${r.status.toUpperCase()}`);
      }
      if (args['gate-requirements']) {
        rr.requirements.filter(r => r.status === 'Fail').forEach(r => failures.push(`Requirement ${r.id} failed (${pct(r.score)}${r.failedBy.includes('caseFloor') ? ', a response below the floor' : ''})`));
        rr.requirements.filter(r => r.status === 'Not measured').forEach(r => failures.push(`Requirement ${r.id} could not be measured`));
      }
    }

    const gatePassed = failures.length === 0;
    console.log(`\nQuality gate: ${gatePassed ? 'PASSED' : 'FAILED'}`);
    failures.forEach(f => console.log(`  - ${f}`));

    if (args.out) {
      writeFileSync(args.out, JSON.stringify({
        runId: result.conversationId, gatePassed, failures, baseline: baseline?.id || null, metrics: rows,
        ...(rr ? { requirements: { summary: rr.summary, combinedPass: rr.combinedPass, results: rr.requirements.map(({ id, text, status, score, min, applicable, confidence }) => ({ id, text, status, score, min, applicable, confidence })) } } : {}),
      }, null, 2));
    }
    return gatePassed ? 0 : 1;
  } finally {
    if (serverProcess) serverProcess.kill();
  }
}

main().then(code => process.exit(code)).catch(err => {
  console.error(`Error: ${err.message}`);
  if (/Unexpected argument|Missing value/.test(err.message)) console.error(`\n${USAGE}`);
  process.exit(2);
});
