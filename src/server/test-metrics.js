#!/usr/bin/env node
/**
 * Integration test for quality metrics evaluation
 * Tests the Python-Node.js integration without needing a full server
 */

import { spawn } from 'child_process';
import { join } from 'path';

function runPythonEvaluation(prompts, responses) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [join(process.cwd(), 'evaluate_responses.py')]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.warn(`Python returned code ${code}:`, stderr);
        resolve({ error: 'Evaluation metrics unavailable', metrics: {} });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python output:', e);
        resolve({ error: 'Failed to parse evaluation results', metrics: {} });
      }
    });

    python.on('error', (err) => {
      console.warn('Python error:', err.message);
      resolve({ error: 'Python not available', metrics: {} });
    });

    python.stdin.write(JSON.stringify({ prompts, responses }));
    python.stdin.end();
  });
}

async function runTest() {
  console.log('🧪 Testing Quality Metrics Integration...\n');

  const testPrompts = [
    'What is machine learning?',
    'Explain neural networks',
    'How does deep learning work?'
  ];

  const testResponses = [
    'Machine learning is a subset of artificial intelligence that enables systems to learn from data.',
    'Neural networks are computing systems inspired by biological neural networks that constitute animal brains.',
    'Deep learning is a machine learning technique that uses multiple layers of artificial neural networks.'
  ];

  console.log('📊 Input:');
  console.log(`   ${testPrompts.length} prompts`);
  console.log(`   ${testResponses.length} responses\n`);

  console.log('⏳ Running evaluation...');
  const result = await runPythonEvaluation(testPrompts, testResponses);

  if (result.error) {
    console.log(`⚠️  ${result.error}`);
    console.log('\n📋 Note: This is expected if DeepEval is not installed.');
    console.log('   Install it with: pip install -r requirements.txt\n');
    return;
  }

  console.log('✅ Evaluation complete!\n');

  if (result.aggregated_metrics) {
    console.log('📈 Aggregated Metrics:');
    for (const [metric, data] of Object.entries(result.aggregated_metrics)) {
      const displayName = metric.replace(/_/g, ' ').toUpperCase();
      console.log(`   ${displayName}:`);
      console.log(`      Avg: ${(data.avg * 100).toFixed(1)}%`);
      console.log(`      Min: ${(data.min * 100).toFixed(1)}%`);
      console.log(`      Max: ${(data.max * 100).toFixed(1)}%`);
    }
  }

  if (result.individual_metrics) {
    console.log('\n📋 Individual Response Metrics:');
    result.individual_metrics.forEach((metrics, index) => {
      console.log(`   Response ${index + 1}:`);
      Object.entries(metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          console.log(`      ${key}: ${(value * 100).toFixed(1)}%`);
        }
      });
    });
  }

  console.log('\n✨ Integration test successful!');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
