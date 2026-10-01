import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));

const API_KEY = process.env.TEXT_MODEL_API_KEY;
const BASE_URL = process.env.TEXT_MODEL_BASE_URL;
const MODEL = process.env.TEXT_MODEL;

if (!API_KEY || !BASE_URL || !MODEL) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const ARTIFACTS_DIR = join(__dirname, 'artifacts');
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function runPythonEvaluation(prompts, responses, onProgress, customMetrics = []) {
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
      if (code !== 0) {
        console.warn(`Python evaluation returned code ${code}:`, stderr);
        resolve({ error: 'Evaluation metrics unavailable', metrics: {} });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python output:', e, stdout);
        resolve({ error: 'Failed to parse evaluation results', metrics: {} });
      }
    });

    python.on('error', (err) => {
      console.warn('Python evaluation error:', err.message);
      resolve({ error: 'Python evaluation not available', metrics: {} });
    });

    python.stdin.write(JSON.stringify({ prompts, responses, custom_metrics: customMetrics }));
    python.stdin.end();
  });
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

app.post('/api/deepeval', async (req, res) => {
  const { apiEndpoint, testPrompts = [], evaluationMode = 'static', initialPrompt, numberOfTests = 5, evaluationCriteria = {}, selectedMetrics = {} } = req.body;

  if (!apiEndpoint) {
    return res.status(400).json({ error: 'API endpoint is required' });
  }

  // Stream real progress as Server-Sent Events instead of one blocking JSON response —
  // the frontend previously had no way to know how far through the run the server was.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    // Create timestamp-based ID for better readability
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const conversationId = `eval_${timestamp}`;

    const conversations = [];
    const metrics = {
      totalMessages: 0,
      averageResponseTime: 0,
      responseTimes: [],
      prompts: [],
      responses: [],
      testCriteria: evaluationCriteria,
      timestamp: now.toISOString(),
      apiEndpoint: apiEndpoint,
      evaluationMode: evaluationMode,
    };

    let promptsToEvaluate = [];
    sendEvent('progress', { percent: 10, message: 'Preparing test prompts...' });

    if (evaluationMode === 'dynamic') {
      promptsToEvaluate = await generateDynamicPrompts(
        apiEndpoint,
        initialPrompt,
        numberOfTests,
        evaluationCriteria.systemPrompt,
        conversations,
        (done, total) => {
          const percent = 10 + Math.round((done / total) * 30);
          sendEvent('progress', { percent, message: `Generating conversation turn ${done}/${total}...` });
        }
      );
    } else {
      promptsToEvaluate = testPrompts.length > 0 ? testPrompts : [
        'What is the capital of France?',
        'Explain machine learning in simple terms',
        'How do you make a cup of tea?',
        'What are the benefits of exercise?',
        'Tell me a short story',
      ];
    }

    const totalPrompts = promptsToEvaluate.length;
    for (let i = 0; i < promptsToEvaluate.length; i++) {
      const prompt = promptsToEvaluate[i];
      const startTime = Date.now();

      try {
        const response = await axios.post(apiEndpoint, {
          messages: [
            ...conversations,
            { role: 'user', content: prompt }
          ],
          systemPrompt: evaluationCriteria.systemPrompt || null,
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        conversations.push(
          { role: 'user', content: prompt },
          { role: 'assistant', content: response.data.message }
        );

        metrics.totalMessages += 2;
        metrics.responseTimes.push(responseTime);
        metrics.prompts.push(prompt);
        metrics.responses.push(response.data.message);
      } catch (error) {
        console.error(`Error evaluating prompt: ${prompt}`, error.message);
        metrics.prompts.push(prompt);
        metrics.responses.push(`Error: ${error.message}`);
        metrics.responseTimes.push(Date.now() - startTime);
      }

      const percent = 40 + Math.round(((i + 1) / totalPrompts) * 25);
      sendEvent('progress', { percent, message: `Collected response ${i + 1}/${totalPrompts}...` });
    }

    metrics.averageResponseTime = metrics.responseTimes.length > 0
      ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
      : 0;

    // Compute quality metrics using DeepEval
    console.log('Computing quality metrics...');
    sendEvent('progress', { percent: 65, message: 'Running quality metrics evaluation (14+ metrics per response)...' });

    const customMetricsList = selectedMetrics.custom || [];
    console.log('🔍 Custom metrics being evaluated:', customMetricsList.length, 'metrics');
    customMetricsList.forEach((m, i) => {
      console.log(`  [${i}] ID: ${m.id}, Name: ${m.name}, Desc: ${m.desc}`);
    });

    const qualityMetrics = await runPythonEvaluation(
      metrics.prompts,
      metrics.responses,
      (done, total) => {
        const percent = 65 + Math.round((done / total) * 25);
        sendEvent('progress', { percent, message: `Scoring response ${done}/${total}...` });
      },
      customMetricsList
    );

    console.log('📊 Evaluation results keys:', Object.keys(qualityMetrics.aggregated_metrics || {}));

    metrics.qualityMetrics = qualityMetrics.aggregated_metrics || {};
    metrics.individualMetrics = qualityMetrics.individual_metrics || [];
    metrics.passThreshold = qualityMetrics.pass_threshold ?? 0.75;
    metrics.metricsPassed = qualityMetrics.metrics_passed ?? 0;
    metrics.metricsTotal = qualityMetrics.metrics_total ?? 0;
    metrics.overallPassRate = qualityMetrics.overall_pass_rate ?? 0;
    metrics.overallPass = qualityMetrics.overall_pass ?? false;

    sendEvent('progress', { percent: 92, message: 'Saving results...' });

    const evaluationData = {
      conversationId,
      conversations,
      metrics,
      createdAt: now.toISOString(),
    };

    const artifactFilename = `${conversationId}.json`;
    const artifactPath = join(ARTIFACTS_DIR, artifactFilename);
    writeFileSync(artifactPath, JSON.stringify(evaluationData, null, 2));

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

async function generateDynamicPrompts(apiEndpoint, initialPrompt, numberOfTests, systemPrompt, conversations, onProgress) {
  const prompts = [initialPrompt];
  let lastResponse = '';

  try {
    const initialResponse = await axios.post(apiEndpoint, {
      messages: [
        { role: 'user', content: initialPrompt }
      ],
      systemPrompt: systemPrompt || null,
    });

    lastResponse = initialResponse.data.message;
    conversations.push(
      { role: 'user', content: initialPrompt },
      { role: 'assistant', content: lastResponse }
    );
    if (onProgress) onProgress(1, numberOfTests);

    for (let i = 1; i < numberOfTests; i++) {
      console.log(`Generating follow-up question ${i} of ${numberOfTests - 1}...`);
      const followUpPrompt = await generateFollowUpQuestion(initialPrompt, lastResponse);
      prompts.push(followUpPrompt);

      try {
        const followUpResponse = await axios.post(apiEndpoint, {
          messages: [
            ...conversations,
            { role: 'user', content: followUpPrompt }
          ],
          systemPrompt: systemPrompt || null,
        });

        lastResponse = followUpResponse.data.message;
        conversations.push(
          { role: 'user', content: followUpPrompt },
          { role: 'assistant', content: lastResponse }
        );
      } catch (error) {
        console.error('Error in follow-up response:', error.message);
        conversations.push(
          { role: 'user', content: followUpPrompt },
          { role: 'assistant', content: `Error: ${error.message}` }
        );
      }
      if (onProgress) onProgress(i + 1, numberOfTests);
    }
  } catch (error) {
    console.error('Error in dynamic prompt generation:', error.message);
  }

  console.log(`Total prompts generated: ${prompts.length} (requested: ${numberOfTests})`);
  return prompts;
}

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

app.get('/api/artifacts', (_req, res) => {
  try {
    const files = require('fs').readdirSync(ARTIFACTS_DIR);
    const artifacts = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const data = JSON.parse(readFileSync(join(ARTIFACTS_DIR, f), 'utf8'));
        return {
          id: data.conversationId,
          filename: f,
          createdAt: data.createdAt,
          metrics: data.metrics,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(artifacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artifacts/:id', (req, res) => {
  try {
    const files = require('fs').readdirSync(ARTIFACTS_DIR);
    const file = files.find(f => f.includes(req.params.id));

    if (!file) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const data = JSON.parse(readFileSync(join(ARTIFACTS_DIR, file), 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chatbot server running on http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL}`);
  console.log(`Artifacts stored in: ${ARTIFACTS_DIR}`);
});
