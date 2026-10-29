#!/usr/bin/env node
// End-to-end test for requirement-based evaluation (docs/FUTURE_ENHANCEMENTS.md).
// Starts server.js against a fake OpenAI-compatible model server, with temporary artifact and
// requirement files, so it makes no real API calls and never touches artifacts/ or requirements.json.
// Run: npm run test:requirements

import assert from 'assert/strict';
import { spawn } from 'child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const METRIC_JUDGE_MARKER = 'demanding, impartial evaluator';
const REQ_JUDGE_MARKER = 'independent requirements auditor';

// --- fake model server: plays the chatbot, the metric judge and the requirement judge ---

const calls = { chat: 0, metric: [], requirement: [] };

function fakeReply(body) {
  const system = body.messages[0]?.role === 'system' ? body.messages[0].content : '';
  const user = body.messages[body.messages.length - 1].content;
  if (system.includes(REQ_JUDGE_MARKER)) {
    calls.requirement.push(body);
    if (user.includes('BREAKJUDGE')) return null;
    const question = (user.match(/<question>\n([\s\S]*?)\n<\/question>/) || [])[1] || '';
    const results = {};
    for (const [, id, text] of user.matchAll(/<requirement id="(R-\d+)">([\s\S]*?)<\/requirement>/g)) {
      if (/polite/i.test(text)) results[id] = { applies: true, score: 0.95, reason: 'Courteous tone throughout.' };
      else if (/refund/i.test(text)) results[id] = /refund/i.test(question)
        ? { applies: true, score: 0.3, reason: 'The reply never mentions the 30-day window.' }
        : { applies: false, score: null, reason: 'Question is not about refunds.' };
      else results[id] = { applies: false, score: null, reason: 'Not exercised.' };
    }
    return { results };
  }
  if (system.includes(METRIC_JUDGE_MARKER)) {
    calls.metric.push(body);
    const scores = {};
    for (const [, key] of user.matchAll(/^- "([a-z_0-9]+)":/gm)) scores[key] = { reason: 'Fine.', score: 0.9 };
    return { scores };
  }
  if (system.includes('expert evaluator')) return 'What about refunds for damaged items?';
  calls.chat++;
  return `Thanks for asking! Here is a polite answer to: ${user}`;
}

function startFakeModel() {
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      const reply = fakeReply(JSON.parse(raw));
      if (reply === null) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end('{"error":"boom"}');
        return;
      }
      const content = typeof reply === 'string' ? reply : JSON.stringify(reply);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// --- server.js under test ---

async function startApp({ flag, modelUrl, artifactsDir, requirementsFile }) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const fake = { TEXT_MODEL_API_KEY: 'test-key', TEXT_MODEL_BASE_URL: modelUrl, TEXT_MODEL: 'fake-chat-model' };
  const env = {
    ...process.env, ...fake, PORT: String(port), HOST: '127.0.0.1',
    // Every judge points at the fake server even if .env configures real ones.
    JUDGE_API_KEY: 'test-key', JUDGE_BASE_URL: modelUrl, JUDGE_MODEL: 'fake-judge',
    REQ_JUDGE_API_KEY: 'test-key', REQ_JUDGE_BASE_URL: modelUrl, REQ_JUDGE_MODEL: 'fake-req-judge',
    FEATURE_REQUIREMENTS: flag ? 'true' : 'false', ARTIFACTS_DIR: artifactsDir, REQUIREMENTS_FILE: requirementsFile,
  };
  const child = spawn(process.execPath, [join(ROOT, 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, child, log: () => log };
    } catch { /* starting */ }
    await new Promise(r => setTimeout(r, 150));
  }
  child.kill();
  throw new Error(`server.js did not start:\n${log}`);
}

async function runEval(base, payload) {
  const res = await fetch(`${base}/api/deepeval`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!res.ok) return { status: res.status, body: await res.json() };
  const text = await res.text();
  const events = text.split('\n\n').map(s => s.trim()).filter(s => s.startsWith('data:')).map(s => JSON.parse(s.slice(5)));
  return { status: res.status, events, complete: events.find(e => e.type === 'complete'), error: events.find(e => e.type === 'error') };
}

const json = async (res) => ({ status: res.status, body: res.status === 204 ? null : await res.json() });
const post = (base, path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json);

const PROMPTS = ['What is your refund policy?', 'Tell me a joke', 'How do I reset my password?'];
const basePayload = (base) => ({
  apiEndpoint: `${base}/api/chat`,
  evaluationMode: 'static',
  testPrompts: PROMPTS,
  evaluationCriteria: { systemPrompt: 'You are a support bot.' },
  selectedMetrics: { builtin: ['Answer Relevancy', 'Toxicity'], custom: [] },
});

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([true, name]);
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push([false, name]);
    console.log(`  ✗ ${name}\n    ${error.stack.split('\n').slice(0, 4).join('\n    ')}`);
  }
}

async function main() {
  const model = await startFakeModel();
  const modelUrl = `http://127.0.0.1:${model.address().port}`;
  const tmp = mkdtempSync(join(tmpdir(), 'req-e2e-'));
  const artifactsDir = join(tmp, 'artifacts');
  const requirementsFile = join(tmp, 'requirements.json');
  // An artifact saved before this feature existed must summarise and open unchanged.
  const oldArtifact = readdirSync(join(ROOT, 'artifacts')).filter(f => f.startsWith('eval_') && f.endsWith('.json')).sort().pop();
  mkdirSync(artifactsDir, { recursive: true });
  if (oldArtifact) copyFileSync(join(ROOT, 'artifacts', oldArtifact), join(artifactsDir, oldArtifact));

  const on = await startApp({ flag: true, modelUrl, artifactsDir, requirementsFile });
  const off = await startApp({ flag: false, modelUrl, artifactsDir, requirementsFile });
  let withReqs;
  let withoutReqs;

  try {
    console.log('Flag ON');
    await test('config exposes limits from evaluate_requirements.py', async () => {
      const { body } = await json(await fetch(`${on.base}/api/requirements/config`));
      assert.equal(body.enabled, true);
      assert.equal(body.maxRequirementWords, 100);
      assert.equal(body.maxRequirements, 50);
      assert.equal(body.judgeModel, 'fake-req-judge');
      assert.equal(body.chatModel, 'fake-chat-model');
    });

    await test('library: add parsed lines, reject 101 words with line number, skip duplicates, delete', async () => {
      const long = Array.from({ length: 101 }, (_, i) => `w${i}`).join(' ');
      const text = `# Requirements\n- The assistant must be polite\n2. Refund answers must mention the 30-day window\n${long}\n* Mention today's weather`;
      const preview = await post(on.base, '/api/requirements/preview', { text });
      assert.equal(preview.body.requirements.length, 3);
      assert.equal(preview.body.rejected[0].line, 4);
      assert.equal((await json(await fetch(`${on.base}/api/requirements`))).body.length, 0, 'preview must not save');

      const added = await post(on.base, '/api/requirements', { text });
      assert.equal(added.status, 201);
      assert.deepEqual(added.body.added.map(r => r.id), ['R-01', 'R-02', 'R-03']);
      assert.equal(added.body.rejected.length, 1);
      const again = await post(on.base, '/api/requirements', { text: '- the assistant MUST be   polite' });
      assert.equal(again.body.added.length, 0);
      assert.equal(again.body.duplicates.length, 1);

      const extra = await post(on.base, '/api/requirements', { text: 'Temporary requirement' });
      assert.equal(extra.body.added[0].id, 'R-04');
      assert.equal((await fetch(`${on.base}/api/requirements/R-04`, { method: 'DELETE' })).status, 204);
      assert.equal((await fetch(`${on.base}/api/requirements/R-04`, { method: 'DELETE' })).status, 404);
      const list = (await json(await fetch(`${on.base}/api/requirements`))).body;
      assert.deepEqual(list.map(r => r.id), ['R-01', 'R-02', 'R-03']);
      assert.deepEqual(JSON.parse(readFileSync(requirementsFile, 'utf8')).map(r => r.id), ['R-01', 'R-02', 'R-03']);
    });

    await test('run with checked requirements: results for every checked one, unchecked never sent', async () => {
      calls.requirement = [];
      const library = (await json(await fetch(`${on.base}/api/requirements`))).body;
      const checked = library.filter(r => r.id !== 'R-03').map(({ id, text }) => ({ id, text }));
      withReqs = await runEval(on.base, { ...basePayload(on.base), requirements: checked });
      assert.ok(withReqs.complete, JSON.stringify(withReqs.error || withReqs.body));
      const m = withReqs.complete.metrics;
      assert.deepEqual(m.requirements, checked, 'snapshot of the checked requirements');
      const byId = Object.fromEntries(m.requirementResults.requirements.map(r => [r.id, r]));
      assert.deepEqual(Object.keys(byId), ['R-01', 'R-02']);
      assert.equal(byId['R-01'].status, 'Pass');
      assert.equal(byId['R-01'].applicable, 3);
      assert.equal(byId['R-02'].status, 'Fail');
      assert.deepEqual(byId['R-02'].failedBy, ['average', 'caseFloor']);
      assert.equal(byId['R-02'].worstIndex, 0);
      assert.equal(m.requirementResults.summary.passed, 1);
      assert.equal(m.requirementResults.combinedPass, false);
      assert.equal(m.requirementResults.session, 'requirement_judge');
      assert.equal(m.requirementResults.perResponse.length, 3);

      const sent = JSON.stringify(calls.requirement);
      assert.ok(!sent.includes('weather'), 'unchecked requirement must not be evaluated');
      for (const leaked of ['answer_relevancy', 'toxicity', METRIC_JUDGE_MARKER, 'Fine.']) {
        assert.ok(!sent.includes(leaked), `requirement judge must not see "${leaked}"`);
      }
      assert.ok(calls.requirement.every(b => b.messages.length === 2), 'stateless calls only');

      const progress = withReqs.events.filter(e => e.type === 'progress');
      assert.ok(progress.some(e => /Checked requirements for response 3\/3/.test(e.message)));
      const percents = progress.map(e => e.percent);
      assert.deepEqual(percents, [...percents].sort((a, b) => a - b), 'progress never goes backwards');
      assert.ok(percents.every(p => p <= 92));
    });

    await test('run without requirements: identical metric results, no new fields', async () => {
      withoutReqs = await runEval(on.base, basePayload(on.base));
      const m = withoutReqs.complete.metrics;
      assert.equal('requirements' in m, false);
      assert.equal('requirementResults' in m, false);
      const a = withReqs.complete.metrics;
      for (const field of ['qualityMetrics', 'individualMetrics', 'individualReasons', 'unmeasuredMetrics', 'metricsPassed',
        'metricsTotal', 'overallPassRate', 'overallPass', 'passThreshold', 'scoringMethod', 'evaluatedIndices', 'prompts', 'responses']) {
        assert.deepEqual(a[field], m[field], `metric field ${field} must be identical`);
      }
      const progress = withoutReqs.events.filter(e => e.type === 'progress').map(e => e.message);
      assert.ok(!progress.some(msg => /requirement/i.test(msg)));
    });

    await test('artifact summaries: requirement fields only on runs with requirements', async () => {
      const list = (await json(await fetch(`${on.base}/api/artifacts`))).body;
      const a = list.find(r => r.id === withReqs.complete.conversationId);
      const b = list.find(r => r.id === withoutReqs.complete.conversationId);
      assert.equal(a.requirementsSelected, 2);
      assert.equal(a.requirementsTested, 2);
      assert.equal(a.requirementsPassed, 1);
      assert.equal(a.requirementScores['The assistant must be polite'].status, 'Pass');
      assert.equal(Object.keys(b).some(k => k.startsWith('requirement')), false);
      const saved = (await json(await fetch(`${on.base}/api/artifacts/${a.id}`))).body;
      assert.deepEqual(saved.metrics.requirementResults, withReqs.complete.metrics.requirementResults);
    });

    await test('payload validation: 101 words, bad id, over 50, not an array', async () => {
      const long = Array.from({ length: 101 }, () => 'w').join(' ');
      const p = basePayload(on.base);
      assert.equal((await runEval(on.base, { ...p, requirements: [{ id: 'R-01', text: long }] })).status, 400);
      assert.equal((await runEval(on.base, { ...p, requirements: [{ id: 'X1', text: 'ok' }] })).status, 400);
      const many = Array.from({ length: 51 }, (_, i) => ({ id: `R-${String(i + 1).padStart(2, '0')}`, text: 'ok' }));
      assert.equal((await runEval(on.base, { ...p, requirements: many })).status, 400);
      assert.equal((await runEval(on.base, { ...p, requirements: 'R-01' })).status, 400);
    });

    await test('a failing requirement judge call never loses the run (Not measured)', async () => {
      const r = await runEval(on.base, { ...basePayload(on.base), requirements: [{ id: 'R-01', text: 'BREAKJUDGE be polite' }] });
      assert.ok(r.complete);
      const req = r.complete.metrics.requirementResults.requirements[0];
      assert.equal(req.status, 'Not measured');
      assert.ok(r.complete.metrics.qualityMetrics.toxicity);
      assert.equal(r.complete.metrics.requirementResults.combinedPass, false);
    });

    await test('dynamic mode with requirements', async () => {
      const r = await runEval(on.base, {
        ...basePayload(on.base), evaluationMode: 'dynamic', initialPrompt: 'What is your refund policy?', numberOfTests: 2,
        requirements: [{ id: 'R-01', text: 'The assistant must be polite' }],
      });
      assert.ok(r.complete, JSON.stringify(r.error));
      assert.equal(r.complete.metrics.requirementResults.requirements[0].status, 'Pass');
      assert.equal(r.complete.metrics.requirementResults.perResponse.length, 2);
    });

    await test('eval-cli: --gate-requirements fails the gate on a failing requirement; plain run unchanged', async () => {
      const file = join(tmp, 'reqs.txt');
      writeFileSync(file, '- The assistant must be polite\n- Refund answers must mention the 30-day window\n');
      const promptsArgs = ['--server', on.base, '--prompts', PROMPTS.join('|'), '--metrics', 'Toxicity', '--baseline', 'none'];
      // Async spawn: the fake model server lives in this process, so blocking here would deadlock.
      const cli = (extra) => new Promise(resolve => {
        const child = spawn(process.execPath, [join(ROOT, 'eval-cli.mjs'), ...promptsArgs, ...extra], { env: process.env });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d; });
        child.stderr.on('data', d => { stderr += d; });
        child.on('close', status => resolve({ status, stdout, stderr }));
      });
      const gated = await cli(['--requirements', file, '--gate-requirements', '--out', join(tmp, 'out.json')]);
      assert.equal(gated.status, 1, gated.stdout + gated.stderr);
      assert.match(gated.stdout, /Requirement R-02 failed/);
      const out = JSON.parse(readFileSync(join(tmp, 'out.json'), 'utf8'));
      assert.equal(out.requirements.summary.failed, 1);
      const reported = await cli(['--requirements', file]);
      assert.equal(reported.status, 0, 'without --gate-requirements, requirements are reported but do not gate');
      assert.match(reported.stdout, /R-02 .*FAIL/);
      const plain = await cli([]);
      assert.equal(plain.status, 0);
      assert.doesNotMatch(plain.stdout, /Requirements/);
    });

    console.log('Flag OFF (rollback)');
    await test('config disabled, library routes 404', async () => {
      assert.deepEqual((await json(await fetch(`${off.base}/api/requirements/config`))).body, { enabled: false });
      assert.equal((await fetch(`${off.base}/api/requirements`)).status, 404);
      assert.equal((await post(off.base, '/api/requirements', { text: 'x' })).status, 404);
    });

    await test('requirements in the payload are ignored: no judge calls, no new fields', async () => {
      calls.requirement = [];
      const r = await runEval(off.base, { ...basePayload(off.base), requirements: [{ id: 'R-01', text: 'The assistant must be polite' }] });
      assert.ok(r.complete);
      assert.equal(calls.requirement.length, 0);
      assert.equal('requirementResults' in r.complete.metrics, false);
      assert.deepEqual(r.complete.metrics.qualityMetrics, withoutReqs.complete.metrics.qualityMetrics);
      // Even an invalid requirements value is ignored when the feature is off.
      assert.ok((await runEval(off.base, { ...basePayload(off.base), requirements: 'junk' })).complete);
    });

    await test('pre-existing artifact summarises identically with the flag on and off', async () => {
      if (!oldArtifact) return;
      const id = oldArtifact.replace(/\.json$/, '');
      const a = (await json(await fetch(`${on.base}/api/artifacts`))).body.find(r => r.id === id);
      const b = (await json(await fetch(`${off.base}/api/artifacts`))).body.find(r => r.id === id);
      assert.deepEqual(a, b);
      assert.equal(Object.keys(a).some(k => k.startsWith('requirement')), false);
      const saved = (await json(await fetch(`${on.base}/api/artifacts/${id}`))).body;
      assert.deepEqual(saved, JSON.parse(readFileSync(join(ROOT, 'artifacts', oldArtifact), 'utf8')));
    });

    await test('existing routes still answer', async () => {
      for (const path of ['/api/health', '/api/suites', '/api/custom-metrics', '/api/artifacts', '/deepeval.html', '/requirements.js']) {
        assert.equal((await fetch(`${on.base}${path}`)).status, 200, path);
        assert.equal((await fetch(`${off.base}${path}`)).status, 200, path);
      }
    });
  } finally {
    on.child.kill();
    off.child.kill();
    model.close();
    rmSync(tmp, { recursive: true, force: true });
  }

  const failed = results.filter(([ok]) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(2);
});
