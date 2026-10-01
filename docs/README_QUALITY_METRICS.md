# 🎯 SimChat DeepEval Dashboard - Quality Metrics Edition

A comprehensive chatbot evaluation platform with **14+ quality metrics** to assess response accuracy, relevancy, and overall chatbot performance.

## ✨ Features

### 🤖 Evaluation Modes
- **Dynamic Mode**: AI-generated follow-up questions that test consistency and knowledge
- **Static Mode**: Predefined test questions

### ⭐ 14+ Quality Metrics
Comprehensive evaluation across multiple dimensions:

**Response Quality:**
- Answer Relevancy (is the answer on-topic?)
- Faithfulness (does it match the facts?)
- Clarity (is it easy to understand?)
- Completeness (is it thorough?)

**Context Awareness:**
- Contextual Precision (uses only relevant info)
- Contextual Recall (covers all relevant info)
- Contextual Relevancy (context is relevant)

**Safety & Fairness:**
- Hallucination Detection (identifies made-up facts)
- Toxicity (checks for harmful content)
- Bias Detection (fairness evaluation)

**Response Characteristics:**
- Response Length (appropriate depth)
- Summarization Accuracy (if applicable)
- And more...

### 📊 Advanced Visualizations
- **Metric Badges**: Color-coded quality scores
- **Radar Chart**: All metrics at a glance
- **Bar Charts**: Performance distribution
- **Line Charts**: Response time trends
- **Doughnut Charts**: Coverage analysis

### 💾 Artifact Management
- Timestamp-based evaluation storage
- Full conversation history
- Metric snapshots
- Download & compare evaluations

## 🚀 Quick Start

### 1. Prerequisites
```bash
node --version  # v16+
python3 --version  # v3.8+
```

### 2. Installation

```bash
# Install Node dependencies
npm install

# Install Python dependencies for quality metrics
pip install -r requirements.txt

# Verify setup
npm run verify
```

### 3. Configuration

Create a `.env` file:
```env
TEXT_MODEL_API_KEY=your-api-key
TEXT_MODEL_BASE_URL=https://api.deepseek.com/v1
TEXT_MODEL=deepseek-chat
PORT=3000
```

### 4. Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Access the dashboard:
- **Chatbot**: http://localhost:3000
- **DeepEval Dashboard**: http://localhost:3000/deepeval.html

## 📖 How to Use

### Running an Evaluation

1. **Go to DeepEval Dashboard** (📊 tab in navigation)

2. **Configure Evaluation:**
   - **API Endpoint**: Your chatbot API (default: http://localhost:3000/api/chat)
   - **System Prompt** (optional): Set chatbot behavior/role
   - **Evaluation Mode**: Choose Dynamic or Static
   - **Number of Tests**: 3-10 prompts (5 recommended)

3. **Dynamic Mode Setup:**
   - **Initial Question**: Starting prompt (auto-generated from system prompt if provided)
   - DeepSeek will generate follow-ups based on responses
   - Tests consistency, knowledge depth, and contradictions

4. **Static Mode Setup:**
   - Add custom test questions
   - Edit/remove individual questions
   - Predefined questions available by default

5. **Run Evaluation:**
   - Click **▶ Run DeepEval**
   - Watch real-time progress bar
   - Evaluation typically takes 30-120 seconds

### Viewing Results

After evaluation completes, view results in four tabs:

#### **💬 Conversation Tab**
- All Q&A pairs
- Full response text
- Conversation flow

#### **⭐ Quality Metrics Tab**
- **Metric Badges**: Individual scores (0-100%) with a Pass/Fail label
  - 🟢 Green (≥75%): ✅ Pass
  - 🔴 Red (<75%): ❌ Fail
  - Unified threshold — every metric uses the same 75% bar (`PASS_THRESHOLD` in `evaluate_responses.py`)
- **Overall summary banner**: total metrics passed / total, above the grid
- **Radar Chart**: Multi-dimensional view
- **Bar Chart**: Sorted metric scores

#### **📈 Analysis Tab**
- Response time metrics (avg/min/max)
- Performance distribution chart
- Coverage analysis

#### **📁 Artifacts Tab**
- Past evaluations history
- Download evaluation data
- Compare results

## 📊 Understanding Metrics

### Metric Ranges
| Score | Interpretation |
|-------|---|
| 90-100% | Excellent - Production ready |
| 70-89% | Good - Minor improvements possible |
| 50-69% | Fair - Significant improvements needed |
| 0-49% | Poor - Major issues detected |

### Individual Metric Meanings

**Answer Relevancy**
- ✅ High: Response directly answers the question
- ❌ Low: Response is off-topic or irrelevant

**Faithfulness**
- ✅ High: All statements are accurate/verified
- ❌ Low: Contains false or unverified claims

**Contextual Precision**
- ✅ High: Only uses pertinent information
- ❌ Low: Includes unnecessary/irrelevant details

**Contextual Recall**
- ✅ High: Covers all important information
- ❌ Low: Missing key points

**Hallucination**
- ✅ High: No made-up information
- ❌ Low: Contains fabricated facts

**Toxicity**
- ✅ High: Respectful, safe language
- ❌ Low: Contains harmful/offensive content

**Clarity**
- ✅ High: Easy to understand, well-written
- ❌ Low: Confusing, poor grammar/structure

**Completeness**
- ✅ High: Comprehensive, thorough answer
- ❌ Low: Incomplete, surface-level answer

## 🧪 Testing

### Test Quality Metrics
```bash
npm run test:metrics
```

This runs a sample evaluation without needing the full server to test Python integration.

### Verify Setup
```bash
npm run verify
```

Checks:
- ✅ Python 3 installation
- ✅ DeepEval module
- ✅ Node.js & npm
- ✅ Required files
- ✅ Environment configuration

## 🔧 Advanced Configuration

### Custom Metrics

Edit `evaluate_responses.py` to add your own metrics:

```python
# Add custom metric to evaluate_response function
from deepeval.metrics import YourCustomMetric

metric = YourCustomMetric(threshold=0.5)
metric.measure(test_case)
metrics_results["your_metric"] = round(metric.score, 2)
```

### Performance Tuning

- **Fast Evaluation**: Use Static mode with 3 questions
- **Thorough Evaluation**: Use Dynamic mode with 8-10 questions
- **Detailed Analysis**: Dynamic mode + system prompt = best results

### Integration with CI/CD

`/api/deepeval` streams Server-Sent Events (progress updates followed by a final `complete` or `error` event) rather than returning one JSON body — see `docs/QUALITY_METRICS.md`'s API Integration section for the event format. `curl -N` (no buffering) prints the raw stream so you can watch it; to script against it, read the stream and pick out the `data:` line whose JSON has `"type":"complete"`:

```bash
# Run evaluation programmatically and print the raw event stream
curl -N -X POST http://localhost:3000/api/deepeval \
  -H "Content-Type: application/json" \
  -d '{
    "apiEndpoint": "http://chatbot:3000/api/chat",
    "systemPrompt": "You are a helpful assistant",
    "evaluationMode": "dynamic",
    "initialPrompt": "What is AI?",
    "numberOfTests": 5
  }'

# Extract just the final result for a pass/fail CI gate
curl -N -s -X POST http://localhost:3000/api/deepeval \
  -H "Content-Type: application/json" \
  -d '{"apiEndpoint": "http://chatbot:3000/api/chat", "evaluationMode": "static", "testPrompts": ["What is AI?"]}' \
  | grep '"type":"complete"' | sed 's/^data: //' \
  | python3 -c "import json,sys; result = json.load(sys.stdin); exit(0 if result['metrics']['overallPass'] else 1)"
```

## 📁 Project Structure

```
├── server.js                    # Express backend
├── evaluate_responses.py         # Python evaluation engine
├── public/
│   ├── index.html              # Main chatbot UI
│   └── deepeval.html           # Evaluation dashboard
├── artifacts/                   # Stored evaluations
├── package.json                # Node dependencies
├── requirements.txt            # Python dependencies
├── QUALITY_METRICS.md          # Detailed metrics docs
└── README_QUALITY_METRICS.md   # This file
```

## 🐛 Troubleshooting

### "Metrics unavailable" Error
**Problem**: Quality metrics not displaying
**Solutions**:
1. Verify Python is installed: `python3 --version`
2. Install DeepEval: `pip install -r requirements.txt`
3. Restart server: `npm start`

### Evaluation Timeout
**Problem**: Evaluation takes too long or times out
**Solutions**:
1. Reduce number of test prompts (use 3-5)
2. Use Static mode instead of Dynamic
3. Check system resources (RAM, CPU)

### Python Not Found
**Problem**: "spawn ENOENT" error in logs
**Solution**: Install Python 3 and add to PATH

### DeepEval Import Error
**Problem**: `ModuleNotFoundError: No module named 'deepeval'`
**Solution**: 
```bash
pip install deepeval
# or
pip install -r requirements.txt
```

## 📈 Performance Metrics

### Typical Evaluation Times
- **3 prompts (Static)**: 15-30 seconds
- **5 prompts (Dynamic)**: 45-90 seconds
- **10 prompts (Dynamic)**: 2-4 minutes

*First run may be slower (model initialization)*

## 🎓 Best Practices

### Setting Up Effective Evaluations

1. **Define Clear System Prompt**
   - Specify chatbot role and constraints
   - Include domain/context information
   - Quality metrics improve with clear context

2. **Choose Appropriate Mode**
   - Dynamic: Test consistency & knowledge
   - Static: Test specific scenarios

3. **Interpret Metrics Holistically**
   - No single metric tells the whole story
   - Look for patterns across metrics
   - Consider your use case requirements

4. **Compare Iterations**
   - Use Artifacts tab to track changes
   - Monitor metric trends over time
   - Identify improvement areas

## 🔗 API Endpoints

### `/api/chat` - Chat with Chatbot
```bash
POST /api/chat
Body: {
  "messages": [{role: "user", content: "..."}],
  "systemPrompt": "optional"
}
```

### `/api/deepeval` - Run Evaluation
```bash
POST /api/deepeval
Body: {
  "apiEndpoint": "http://localhost:3000/api/chat",
  "systemPrompt": "optional",
  "evaluationMode": "dynamic|static",
  "initialPrompt": "for dynamic mode",
  "numberOfTests": 5,
  "testPrompts": [for static mode]
}
```

### `/api/generate-question` - Auto-generate Question
```bash
POST /api/generate-question
Body: {
  "systemPrompt": "You are a helpful assistant..."
}
```

### `/api/artifacts` - List Evaluations
```bash
GET /api/artifacts
```

### `/api/artifacts/:id` - Get Specific Evaluation
```bash
GET /api/artifacts/{evaluation_id}
```

## 📝 License

Built with DeepEval and Claude

## 🤝 Support

For issues or questions:
1. Check QUALITY_METRICS.md for detailed docs
2. Review troubleshooting section above
3. Check application logs for error details
