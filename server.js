import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { spawn, execFileSync } from 'child_process';
import { randomBytes } from 'crypto';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// No CORS middleware and no form-encoded body parsing: other websites can't drive this
// server from a visitor's browser (JSON POSTs from another origin fail the CORS preflight).
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));

const API_KEY = process.env.TEXT_MODEL_API_KEY;
const BASE_URL = process.env.TEXT_MODEL_BASE_URL;
const MODEL = process.env.TEXT_MODEL;

if (!API_KEY || !BASE_URL || !MODEL) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || join(__dirname, 'artifacts');
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const CUSTOM_METRICS_FILE = join(__dirname, 'custom_metrics.json');
const STATIC_CONCURRENCY = 3;

// Requirement-based evaluation (docs/FUTURE_ENHANCEMENTS.md #1/#2). Off unless FEATURE_REQUIREMENTS=true;
// when off, requirements in a run payload are ignored and every route below except /config returns 404.
const FEATURE_REQUIREMENTS = /^(1|true|yes|on)$/i.test(process.env.FEATURE_REQUIREMENTS || '');
const REQUIREMENTS_FILE = process.env.REQUIREMENTS_FILE || join(__dirname, 'requirements.json');
const REQUIREMENTS_SCRIPT = join(__dirname, 'evaluate_requirements.py');

// The server sends requests to whatever chatbot URL an evaluation names, so only
// local hosts plus hosts explicitly listed in ALLOWED_EVAL_HOSTS may be targeted.
const ALLOWED_EVAL_HOSTS = new Set([
  'localhost', '127.0.0.1', '[::1]',
  ...(process.env.ALLOWED_EVAL_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean),
]);

function endpointError(apiEndpoint) {
  let url;
  try {
    url = new URL(apiEndpoint);
  } catch {
    return 'API endpoint must be a valid URL';
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return 'API endpoint must use http or https';
  }
  if (!ALLOWED_EVAL_HOSTS.has(url.hostname.toLowerCase())) {
    return `Host "${url.hostname}" is not in the allowlist. Add it to ALLOWED_EVAL_HOSTS in .env to evaluate it.`;
  }
  return null;
}

function loadSuites() {
  const output = execFileSync('python3', [join(__dirname, 'deepeval', 'datasets', 'export_suites.py')], { encoding: 'utf8' });
  return JSON.parse(output);
}

function readCustomMetricLibrary() {
  if (!existsSync(CUSTOM_METRICS_FILE)) return [];
  return JSON.parse(readFileSync(CUSTOM_METRICS_FILE, 'utf8'));
}

// Limits, parsing and validation live in evaluate_requirements.py so there is one source of truth.
function runRequirementsTool(mode, input) {
  const output = execFileSync('python3', [REQUIREMENTS_SCRIPT, mode], {
    input: input === undefined ? '' : JSON.stringify(input),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  if (result.error) throw new Error(result.error);
  return result;
}

let requirementsConfig = null;
function getRequirementsConfig() {
  if (!requirementsConfig) requirementsConfig = runRequirementsTool('config');
  return requirementsConfig;
}

function readRequirementLibrary() {
  if (!existsSync(REQUIREMENTS_FILE)) return [];
  return JSON.parse(readFileSync(REQUIREMENTS_FILE, 'utf8'));
}

const normaliseRequirement = text => text.toLowerCase().replace(/\s+/g, ' ').trim();

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function askChatbot(apiEndpoint, history, prompt, systemPrompt) {
  const startTime = Date.now();
  try {
    const response = await axios.post(apiEndpoint, {
      messages: [...history, { role: 'user', content: prompt }],
      systemPrompt,
    }, { timeout: 120000, maxRedirects: 0 });
    const answer = response.data?.message;
    if (typeof answer !== 'string' || !answer.trim()) {
      return { error: "Endpoint response did not contain a non-empty 'message' field", time: Date.now() - startTime };
    }
    return { answer, time: Date.now() - startTime };
  } catch (error) {
    return { error: error.response?.data?.error || error.message, time: Date.now() - startTime };
  }
}

const BUILTIN_METRIC_KEYS = {
  'Answer Relevancy': 'answer_relevancy',
  'Faithfulness': 'faithfulness',
  'Contextual Precision': 'contextual_precision',
  'Contextual Recall': 'contextual_recall',
  'Contextual Relevancy': 'contextual_relevancy',
  'Hallucination': 'hallucination',
  'Toxicity': 'toxicity',
  'Summarization': 'summarization',
};

function runPythonEvaluation({ prompts, responses, customMetrics, selectedMetrics, systemPrompt, isolated, references }, onProgress) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [join(__dirname, 'evaluate_responses.py')]);
    let stdout = '';
    let stderr = '';
    let stderrTail = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;

      // Scan for PROGRESS:<done>:<total> lines emitted by evaluate_responses.py
      stderrTail += text;
      const lines = stderrTail.split('\n');
      stderrTail = lines.pop();
      for (const line of lines) {
        const match = line.match(/^PROGRESS:(\d+):(\d+)$/);
        if (match && onProgress) {
          onProgress(parseInt(match[1], 10), parseInt(match[2], 10));
        }
      }
    });

    python.on('close', (code) => {
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (e) {
        console.error(`Python evaluation exited ${code}; unparseable output:`, stderr);
        reject(new Error('Quality metric evaluation failed (see server log)'));
        return;
      }
      if (code !== 0 || result.error) {
        reject(new Error(`Quality metric evaluation failed: ${result.error || `exit code ${code}`}`));
        return;
      }
      resolve(result);
    });

    python.on('error', (err) => {
      reject(new Error(`Could not start Python evaluator: ${err.message}`));
    });

    python.stdin.write(JSON.stringify({
      prompts,
      responses,
      custom_metrics: customMetrics,
      selected_metrics: selectedMetrics,
      system_prompt: systemPrompt,
      isolated,
      references,
    }));
    python.stdin.end();
  });
}

// Third isolated session: requirement checks run in their own process with their own judge prompt.
// Only the prompts, replies, context and requirement texts are sent — never metric scores or reasons.
function runRequirementEvaluation({ prompts, responses, indices, requirements, systemPrompt, isolated }, onProgress) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [REQUIREMENTS_SCRIPT]);
    let stdout = '';
    let stderr = '';
    let stderrTail = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      stderrTail += text;
      const lines = stderrTail.split('\n');
      stderrTail = lines.pop();
      for (const line of lines) {
        const match = line.match(/^PROGRESS:(\d+):(\d+)$/);
        if (match && onProgress) {
          onProgress(parseInt(match[1], 10), parseInt(match[2], 10));
        }
      }
    });

    python.on('close', (code) => {
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (e) {
        console.error(`Requirement evaluation exited ${code}; unparseable output:`, stderr);
        reject(new Error('Requirement evaluation failed (see server log)'));
        return;
      }
      if (code !== 0 || result.error) {
        reject(new Error(`Requirement evaluation failed: ${result.error || `exit code ${code}`}`));
        return;
      }
      resolve(result);
    });

    python.on('error', (err) => {
      reject(new Error(`Could not start requirement evaluator: ${err.message}`));
    });

    python.stdin.write(JSON.stringify({
      prompts,
      responses,
      indices,
      requirements,
      system_prompt: systemPrompt,
      isolated,
    }));
    python.stdin.end();
  });
}

// Used when the requirement evaluator itself crashes: the metric results are kept and every
// requirement is reported as Not measured instead of failing the whole run.
function unmeasuredRequirementResults(requirements, indices, errorMessage) {
  const config = getRequirementsConfig();
  const reason = `Requirement evaluation failed: ${errorMessage}`;
  return {
    judgeModel: config.judgeModel,
    session: 'requirement_judge',
    thresholds: config.thresholds,
    error: errorMessage,
    summary: {
      selected: requirements.length, tested: 0, passed: 0, failed: 0, notTested: 0,
      notMeasured: requirements.length, lowConfidence: 0, coverage: 0, passRate: null, averageScore: null,
    },
    requirements: requirements.map(r => ({
      id: r.id, text: r.text, applicable: 0, notMeasuredResponses: indices.length, score: null, min: null, max: null,
      worstIndex: null, worstReason: '', failedBy: [], status: 'Not measured', passed: null, confidence: null,
    })),
    perResponse: indices.map(index => ({
      index,
      results: Object.fromEntries(requirements.map(r => [r.id, { applies: null, score: null, verdict: 'not measured', reason, samples: 0 }])),
    })),
    judgeCalls: 0,
  };
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const payload = {
      model: MODEL,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
    };

    const response = await client.post('/chat/completions', payload);
    const assistantMessage = response.data.choices[0]?.message?.content;

    if (!assistantMessage) {
      return res.status(500).json({ error: 'No response from API' });
    }

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.error?.message || 'Failed to get response from chatbot',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', model: MODEL });
});

app.post('/api/generate-question', async (req, res) => {
  try {
    const { systemPrompt } = req.body;

    if (!systemPrompt) {
      return res.status(400).json({ error: 'System prompt is required' });
    }

    const response = await client.post('/chat/completions', {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Generate a single, clear, and specific test question that will help evaluate how well an AI assistant can follow the given system prompt. The question should be open-ended and testing their understanding of the role.'
        },
        {
          role: 'user',
          content: `System Prompt: "${systemPrompt}"\n\nBased on this system prompt, generate ONE question to test the assistant. Just provide the question, nothing else.`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const question = response.data.choices[0]?.message?.content?.trim();

    res.json({
      question: question || 'Can you explain your role and responsibilities?'
    });
  } catch (error) {
    console.error('Error generating question:', error.message);
    res.status(500).json({
      error: 'Failed to generate question',
    });
  }
});

app.post('/api/extract-metric-name', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const response = await client.post('/chat/completions', {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a metric naming expert. Extract a concise 1-2 word metric name from the given description. Return ONLY the metric name in the style of DeepEval metrics (e.g., "Clarity", "Completeness", "Specificity", "Relevancy", "Accuracy"). Capitalize first letter. Return ONLY the name, nothing else.'
        },
        {
          role: 'user',
          content: `Extract a metric name from this description: "${description}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 15,
    });

    const metricName = response.data.choices[0]?.message?.content?.trim() || 'Custom Metric';
    res.json({ metricName });
  } catch (error) {
    console.error('Error extracting metric name:', error.message);
    res.status(500).json({ error: 'Failed to extract metric name' });
  }
});

app.get('/api/suites', (_req, res) => {
  try {
    res.json(loadSuites().map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      caseCount: s.cases.length,
      categories: [...new Set(s.cases.map(c => c.category))],
    })));
  } catch (error) {
    res.status(500).json({ error: `Could not load test suites: ${error.message}` });
  }
});

app.get('/api/custom-metrics', (_req, res) => {
  try {
    res.json(readCustomMetricLibrary());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/custom-metrics', (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  const desc = String(req.body?.desc || '').trim();
  if (!desc || desc.length > 500) {
    return res.status(400).json({ error: 'Metric description is required (max 500 characters)' });
  }
  // Validate params: array of strings, max 5, each max 200 chars
  let params = [];
  if (Array.isArray(req.body?.params)) {
    params = req.body.params
      .map(p => String(p || '').trim().slice(0, 200))
      .filter(p => p.length > 0)
      .slice(0, 5);
  }
  try {
    const library = readCustomMetricLibrary();
    if (library.length >= 50) {
      return res.status(400).json({ error: 'The custom metric library is full (50 metrics)' });
    }
    const metric = {
      id: `cm_${Date.now().toString(36)}${randomBytes(2).toString('hex')}`,
      name: name || 'Custom Metric',
      desc,
      params,
      createdAt: new Date().toISOString(),
    };
    library.push(metric);
    writeFileSync(CUSTOM_METRICS_FILE, JSON.stringify(library, null, 2));
    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/custom-metrics/:id', (req, res) => {
  try {
    const library = readCustomMetricLibrary();
    const remaining = library.filter(m => m.id !== req.params.id);
    if (remaining.length === library.length) {
      return res.status(404).json({ error: 'Custom metric not found' });
    }
    writeFileSync(CUSTOM_METRICS_FILE, JSON.stringify(remaining, null, 2));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requirements/config', (_req, res) => {
  if (!FEATURE_REQUIREMENTS) return res.json({ enabled: false });
  try {
    res.json({ enabled: true, ...getRequirementsConfig(), chatModel: MODEL });
  } catch (error) {
    res.status(500).json({ error: `Could not load requirement settings: ${error.message}` });
  }
});

app.use('/api/requirements', (_req, res, next) => {
  if (!FEATURE_REQUIREMENTS) return res.status(404).json({ error: 'Requirement evaluation is disabled (FEATURE_REQUIREMENTS)' });
  next();
});

app.get('/api/requirements', (_req, res) => {
  try {
    res.json(readRequirementLibrary());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parse and validate only: no model call, nothing saved.
app.post('/api/requirements/preview', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Requirement text is required' });
  }
  if (text.length > 200000) {
    return res.status(400).json({ error: 'Requirement text is too long (max 200,000 characters)' });
  }
  try {
    res.json(runRequirementsTool('parse', { text }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requirements', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Requirement text is required' });
  }
  if (text.length > 200000) {
    return res.status(400).json({ error: 'Requirement text is too long (max 200,000 characters)' });
  }
  try {
    const { maxRequirements } = getRequirementsConfig();
    const parsed = runRequirementsTool('parse', { text });
    const library = readRequirementLibrary();
    const known = new Set(library.map(r => normaliseRequirement(r.text)));
    let nextNumber = library.reduce((max, r) => Math.max(max, parseInt(r.id.slice(2), 10) || 0), 0) + 1;
    const added = [];
    const duplicates = [];
    const overLimit = [];
    for (const item of parsed.requirements) {
      const key = normaliseRequirement(item.text);
      if (known.has(key)) {
        duplicates.push(item);
        continue;
      }
      if (library.length + added.length >= maxRequirements) {
        overLimit.push(item);
        continue;
      }
      known.add(key);
      added.push({ id: `R-${String(nextNumber++).padStart(2, '0')}`, text: item.text, createdAt: new Date().toISOString() });
    }
    if (added.length) {
      writeFileSync(REQUIREMENTS_FILE, JSON.stringify([...library, ...added], null, 2));
    }
    res.status(added.length ? 201 : 200).json({ added, duplicates, overLimit, rejected: parsed.rejected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/requirements/:id', (req, res) => {
  try {
    const library = readRequirementLibrary();
    const remaining = library.filter(r => r.id !== req.params.id);
    if (remaining.length === library.length) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    writeFileSync(REQUIREMENTS_FILE, JSON.stringify(remaining, null, 2));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deepeval', async (req, res) => {
  const { apiEndpoint, testPrompts = [], evaluationMode = 'static', suiteId, initialPrompt, numberOfTests = 5, evaluationCriteria = {}, selectedMetrics = {} } = req.body;

  if (!apiEndpoint) {
    return res.status(400).json({ error: 'API endpoint is required' });
  }
  const badEndpoint = endpointError(apiEndpoint);
  if (badEndpoint) {
    return res.status(400).json({ error: badEndpoint });
  }
  if (!['static', 'dynamic', 'suite'].includes(evaluationMode)) {
    return res.status(400).json({ error: `Unknown evaluation mode "${evaluationMode}"` });
  }

  const builtinKeys = (selectedMetrics.builtin || Object.keys(BUILTIN_METRIC_KEYS))
    .map(label => BUILTIN_METRIC_KEYS[label] || label)
    .filter(key => Object.values(BUILTIN_METRIC_KEYS).includes(key));
  const customMetricsList = (selectedMetrics.custom || []).filter(m => m && m.id && m.desc);
  if (builtinKeys.length + customMetricsList.length === 0 && evaluationMode !== 'suite') {
    return res.status(400).json({ error: 'Select at least one metric to evaluate' });
  }
  if (evaluationMode === 'dynamic' && !initialPrompt) {
    return res.status(400).json({ error: 'An initial question is required for dynamic mode' });
  }

  // Requirements are only read when the feature is on; otherwise the run is exactly as before.
  let requirements = [];
  if (FEATURE_REQUIREMENTS && req.body.requirements !== undefined && req.body.requirements !== null) {
    if (!Array.isArray(req.body.requirements)) {
      return res.status(400).json({ error: 'requirements must be an array of { id, text }' });
    }
    requirements = req.body.requirements.map(r => ({ id: String(r?.id ?? ''), text: String(r?.text ?? '').trim() }));
    if (requirements.length) {
      try {
        const { errors } = runRequirementsTool('validate', { requirements });
        if (errors.length) return res.status(400).json({ error: errors.join(' ') });
      } catch (error) {
        return res.status(500).json({ error: `Could not validate requirements: ${error.message}` });
      }
    }
  }

  let suite = null;
  if (evaluationMode === 'suite') {
    try {
      suite = loadSuites().find(s => s.id === suiteId);
    } catch (error) {
      return res.status(500).json({ error: `Could not load test suites: ${error.message}` });
    }
    if (!suite) {
      return res.status(400).json({ error: `Unknown test suite "${suiteId}"` });
    }
  }

  // Stream real progress as Server-Sent Events so the dashboard can show per-step progress.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    // Random suffix keeps runs started in the same second from overwriting each other.
    const conversationId = `eval_${timestamp}_${randomBytes(3).toString('hex')}`;
    const systemPrompt = evaluationCriteria.systemPrompt || null;
    const isolated = evaluationMode !== 'dynamic';

    const metrics = {
      totalMessages: 0,
      averageResponseTime: 0,
      responseTimes: [],
      prompts: [],
      responses: [],
      references: null,
      caseIds: null,
      failedResponses: [],
      testCriteria: evaluationCriteria,
      timestamp: now.toISOString(),
      apiEndpoint,
      evaluationMode,
      isolatedPrompts: isolated,
      suiteId: suite?.id || null,
      suiteName: suite?.name || null,
      selectedBuiltinMetrics: builtinKeys,
      customMetrics: customMetricsList,
    };
    const conversations = [];
    const record = (i, prompt, result) => {
      metrics.prompts[i] = prompt;
      metrics.responseTimes[i] = result.time;
      if (result.error) {
        console.error(`Chatbot error on prompt ${i + 1}: ${result.error}`);
        metrics.responses[i] = `Error: ${result.error}`;
        metrics.failedResponses.push({ index: i, prompt, error: result.error });
      } else {
        metrics.responses[i] = result.answer;
        metrics.totalMessages += 2;
      }
    };

    sendEvent('progress', { percent: 10, message: 'Preparing test prompts...' });

    if (evaluationMode === 'dynamic') {
      // One shared conversation: each follow-up builds on the previous answer, and each prompt is sent once.
      const totalTurns = Math.max(1, numberOfTests);
      let lastResponse = '';
      for (let i = 0; i < totalTurns; i++) {
        let prompt = initialPrompt;
        if (i > 0) {
          sendEvent('progress', { percent: 10 + Math.round((i / totalTurns) * 55), message: `Generating follow-up question ${i}/${totalTurns - 1}...` });
          prompt = await generateFollowUpQuestion(initialPrompt, lastResponse);
        }
        const result = await askChatbot(apiEndpoint, conversations, prompt, systemPrompt);
        record(i, prompt, result);
        if (!result.error) {
          conversations.push({ role: 'user', content: prompt }, { role: 'assistant', content: result.answer });
        }
        lastResponse = result.answer || '';
        sendEvent('progress', { percent: 10 + Math.round(((i + 1) / totalTurns) * 55), message: `Collected response ${i + 1}/${totalTurns}...` });
      }
    } else {
      // Static prompts and suite cases are independent tests: each gets a fresh conversation,
      // so results don't depend on question order, and they run in parallel.
      const cases = suite
        ? suite.cases
        : (testPrompts.length > 0 ? testPrompts : [
          'What is the capital of France?',
          'Explain machine learning in simple terms',
          'How do you make a cup of tea?',
          'What are the benefits of exercise?',
          'Tell me a short story',
        ]).map(prompt => ({ prompt }));
      if (suite) {
        metrics.references = cases.map(c => c.reference || null);
        metrics.caseIds = cases.map(c => c.id);
      }
      let done = 0;
      await mapWithConcurrency(cases, STATIC_CONCURRENCY, async (testCase, i) => {
        const result = await askChatbot(apiEndpoint, [], testCase.prompt, systemPrompt);
        record(i, testCase.prompt, result);
        conversations[i] = result.error ? [] : [{ role: 'user', content: testCase.prompt }, { role: 'assistant', content: result.answer }];
        done++;
        sendEvent('progress', { percent: 10 + Math.round((done / cases.length) * 55), message: `Collected response ${done}/${cases.length}...` });
      });
      metrics.failedResponses.sort((a, b) => a.index - b.index);
    }

    metrics.averageResponseTime = metrics.responseTimes.length > 0
      ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
      : 0;

    const failedIndices = new Set(metrics.failedResponses.map(f => f.index));
    const evaluatedIndices = metrics.prompts.map((_, i) => i).filter(i => !failedIndices.has(i));
    if (evaluatedIndices.length === 0) {
      throw new Error(`The chatbot endpoint failed on all ${metrics.prompts.length} prompts: ${metrics.failedResponses[0].error}`);
    }

    const metricCount = builtinKeys.length + customMetricsList.length + (suite ? 1 : 0);
    // With requirements, metric scoring ends at 85% and requirement checks take 85-92%.
    const metricSpan = requirements.length ? 20 : 27;
    sendEvent('progress', { percent: 65, message: `Scoring ${evaluatedIndices.length} responses on ${metricCount} metrics...` });

    const quality = await runPythonEvaluation(
      {
        prompts: evaluatedIndices.map(i => metrics.prompts[i]),
        responses: evaluatedIndices.map(i => metrics.responses[i]),
        references: metrics.references ? evaluatedIndices.map(i => metrics.references[i]) : null,
        customMetrics: customMetricsList,
        selectedMetrics: builtinKeys,
        systemPrompt,
        isolated,
      },
      (done, total) => {
        sendEvent('progress', { percent: 65 + Math.round((done / total) * metricSpan), message: `Scored response ${done}/${total}...` });
      }
    );

    metrics.qualityMetrics = quality.aggregated_metrics || {};
    metrics.individualMetrics = quality.individual_metrics || [];
    metrics.individualReasons = quality.individual_reasons || [];
    metrics.judgeSamples = quality.judge_samples || [];
    metrics.evaluatedIndices = evaluatedIndices;
    metrics.unmeasuredMetrics = quality.unmeasured_metrics || [];
    metrics.scoringMethod = quality.scoring_method;
    metrics.judgeModel = quality.judge_model;
    metrics.passThreshold = quality.pass_threshold ?? 0.75;
    metrics.metricsPassed = quality.metrics_passed ?? 0;
    metrics.metricsTotal = quality.metrics_total ?? 0;
    metrics.overallPassRate = quality.overall_pass_rate ?? 0;
    // A run where the chatbot failed to answer some prompts can't be an overall pass.
    metrics.overallPass = Boolean(quality.overall_pass) && metrics.failedResponses.length === 0;

    if (requirements.length) {
      sendEvent('progress', { percent: 85, message: `Checking ${requirements.length} requirements in a separate judge session...` });
      let requirementResults;
      try {
        requirementResults = await runRequirementEvaluation(
          {
            prompts: evaluatedIndices.map(i => metrics.prompts[i]),
            responses: evaluatedIndices.map(i => metrics.responses[i]),
            indices: evaluatedIndices,
            requirements,
            systemPrompt,
            isolated,
          },
          (done, total) => {
            sendEvent('progress', { percent: 85 + Math.round((done / total) * 7), message: `Checked requirements for response ${done}/${total}...` });
          }
        );
      } catch (error) {
        // Metric results are already complete, so a requirement failure never loses the run.
        console.error('Requirement evaluation error:', error.message);
        requirementResults = unmeasuredRequirementResults(requirements, evaluatedIndices, error.message);
      }
      const s = requirementResults.summary;
      requirementResults.combinedPass = metrics.overallPass && s.failed === 0 && s.notMeasured === 0 && s.tested > 0;
      metrics.requirements = requirements;
      metrics.requirementResults = requirementResults;
    }

    sendEvent('progress', { percent: 92, message: 'Saving results...' });

    const evaluationData = {
      conversationId,
      conversations: isolated ? conversations.flat() : conversations,
      metrics,
      createdAt: now.toISOString(),
    };

    const artifactFilename = `${conversationId}.json`;
    writeFileSync(join(ARTIFACTS_DIR, artifactFilename), JSON.stringify(evaluationData, null, 2));

    sendEvent('complete', {
      success: true,
      conversationId,
      metrics,
      artifactPath: `/artifacts/${artifactFilename}`,
    });
    res.end();
  } catch (error) {
    console.error('DeepEval Error:', error);
    sendEvent('error', { error: error.message || 'Failed to run DeepEval' });
    res.end();
  }
});

async function generateFollowUpQuestion(initialPrompt, previousResponse) {
  try {
    const response = await client.post('/chat/completions', {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert evaluator. Based on the user\'s initial question and the assistant\'s response, generate ONE clever follow-up question (2-3 sentences max) that either: 1) Tests for contradictions, 2) Asks for deeper explanation, 3) Questions validity, or 4) Explores edge cases. Be concise and specific.'
        },
        {
          role: 'user',
          content: `Initial Question: "${initialPrompt}"\n\nAssistant's Response: "${previousResponse}"\n\nGenerate a follow-up question to test consistency and knowledge:`
        }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const followUpQuestion = response.data.choices[0]?.message?.content?.trim();
    return followUpQuestion || 'Can you provide more specific details about your previous answer?';
  } catch (error) {
    console.error('Error generating follow-up question:', error.message);
    return 'Can you expand on that answer?';
  }
}

function summarizeArtifact(filename) {
  const data = JSON.parse(readFileSync(join(ARTIFACTS_DIR, filename), 'utf8'));
  const m = data.metrics || {};
  const quality = m.qualityMetrics || {};
  const avgs = Object.values(quality).map(q => q.avg).filter(v => typeof v === 'number');
  return {
    id: filename.replace(/\.json$/, ''),
    filename,
    createdAt: data.createdAt,
    evaluationMode: m.evaluationMode,
    suiteId: m.suiteId || null,
    apiEndpoint: m.apiEndpoint || null,
    suiteName: m.suiteName || null,
    totalPrompts: (m.prompts || []).length,
    failedResponses: (m.failedResponses || []).length,
    averageResponseTime: m.averageResponseTime || 0,
    metricsPassed: m.metricsPassed ?? 0,
    metricsTotal: m.metricsTotal ?? 0,
    overallPassRate: m.overallPassRate ?? 0,
    overallPass: Boolean(m.overallPass),
    averageScore: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
    scoringMethod: m.scoringMethod || 'legacy',
    scores: Object.fromEntries(Object.entries(quality).map(([k, q]) => [k, q.avg])),
    customMetrics: (m.customMetrics || []).map(({ id, name, desc, params }) => ({ id, name, desc, params: params || [] })),
    // Requirement fields are only present for runs that evaluated requirements.
    ...(m.requirementResults ? requirementSummary(m.requirementResults) : {}),
  };
}

function requirementSummary(results) {
  const s = results.summary || {};
  return {
    requirementsSelected: s.selected ?? 0,
    requirementsTested: s.tested ?? 0,
    requirementsPassed: s.passed ?? 0,
    requirementsPassRate: s.passRate ?? null,
    requirementsCombinedPass: Boolean(results.combinedPass),
    // Keyed by text so a renumbered requirement list still compares correctly between runs.
    requirementScores: Object.fromEntries((results.requirements || []).map(r => [r.text, { id: r.id, score: r.score, status: r.status }])),
  };
}

app.get('/api/artifacts', (_req, res) => {
  try {
    const artifacts = [];
    for (const f of readdirSync(ARTIFACTS_DIR).filter(f => f.startsWith('eval_') && f.endsWith('.json'))) {
      try {
        artifacts.push(summarizeArtifact(f));
      } catch (e) {
        console.warn(`Skipping unreadable artifact ${f}: ${e.message}`);
      }
    }
    artifacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(artifacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artifacts/:id', (req, res) => {
  const { id } = req.params;
  if (!/^eval_[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid artifact id' });
  }
  const path = join(ARTIFACTS_DIR, `${id}.json`);
  if (!existsSync(path)) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  try {
    res.json(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
// Localhost only by default; set HOST=0.0.0.0 to expose the server on the network.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Chatbot server running on http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Evaluation endpoint allowlist: ${[...ALLOWED_EVAL_HOSTS].join(', ')}`);
  console.log(`Using model: ${MODEL}`);
  console.log(`Artifacts stored in: ${ARTIFACTS_DIR}`);
  console.log(`Requirement evaluation: ${FEATURE_REQUIREMENTS ? 'enabled' : 'disabled'} (FEATURE_REQUIREMENTS)`);
});
