# 🚀 Complete Setup & Run Guide

Step-by-step instructions to get the SimChat DeepEval platform running.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### Step 2: Setup Configuration
```bash
# Copy example config
cp config/.env.example config/.env

# Edit with your API keys
nano config/.env
```

**Required in .env:**
```
OPENAI_API_KEY=your_key_here
PORT=3000
```

### Step 3: Start the Server
```bash
npm start
```

### Step 4: Access the Platform
- **Chat UI:** http://localhost:3000
- **Evaluation Dashboard:** http://localhost:3000/deepeval.html

---

## 📋 Detailed Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm
- pip

### Check Prerequisites
```bash
# Check Python
python3 --version      # Should be 3.8+

# Check Node.js
node --version         # Should be 14+

# Check npm
npm --version          # Should be 6+
```

---

## 🔧 Full Installation

### 1. Navigate to Project Directory
```bash
cd "/path/to/Chatbot testing"
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

**What gets installed:**
- deepeval (evaluation metrics)
- pytest (testing framework)
- Other dependencies from requirements.txt

**Verify installation:**
```bash
python3 -c "import deepeval; print('✅ DeepEval installed')"
```

### 3. Install Node.js Dependencies
```bash
npm install
```

**What gets installed:**
- express (web server)
- dotenv (environment variables)
- Other packages from package.json

**Verify installation:**
```bash
npm list | head -20
```

### 4. Setup Environment Variables
```bash
# Copy template
cp config/.env.example config/.env

# Edit the file
nano config/.env
# or
vim config/.env
```

**Add these values:**
```env
# API Keys
OPENAI_API_KEY=sk-your-key-here
DEEPSEEK_API_KEY=your-deepseek-key

# Server Configuration
PORT=3000
NODE_ENV=development

# Database (optional)
DATABASE_URL=

# Logging
LOG_LEVEL=debug
```

### 5. Verify Setup
```bash
npm run verify
```

Expected output:
```
✅ Python 3.10.12 found
✅ DeepEval installed
✅ Node.js v18.0.0 found
✅ npm dependencies found
✅ All required files present
✅ .env configured
```

---

## ▶️ Running the Platform

### Start the Server
```bash
npm start
```

Expected output:
```
Chatbot server running on http://localhost:3000
Using model: deepseek-chat
Artifacts stored in: /path/to/artifacts
Server ready for requests
```

### Alternative: Development Mode (with auto-reload)
```bash
npm run dev
```

This uses `--watch` flag to restart server on file changes.

### Alternative: Run Tests First
```bash
# Run all tests
pytest src/deepeval/tests/ -v

# Then start server
npm start
```

---

## 🌐 Access the Platform

Once the server is running, open your browser:

### Chat Interface
```
URL: http://localhost:3000
```
- Type messages to chat with the bot
- Get responses from the AI model
- See conversation history

### Evaluation Dashboard
```
URL: http://localhost:3000/deepeval.html
```
- Run evaluations
- View quality metrics
- See performance analysis
- Compare metrics over time

---

## 🧪 Run Tests

### Test Evaluation System
```bash
# Run all tests
pytest src/deepeval/tests/ -v

# Run specific test file
pytest src/deepeval/tests/test_quality.py -v

# Run with markers
pytest -m golden          # Golden dataset tests
pytest -m synthetic       # Edge case tests
```

### Test Metrics Integration
```bash
npm run test:metrics
```

This tests Python-Node.js communication.

### Run Verification
```bash
npm run verify
```

Checks:
- Python installation
- DeepEval availability
- Node.js version
- npm dependencies
- Required files
- .env configuration

---

## 📊 Using the Platform

### Chat Interface (http://localhost:3000)

1. **Type a message** in the input box
2. **Press Enter** or click Send
3. **AI responds** with an answer
4. **View history** of all messages

**Example:**
```
You: What is artificial intelligence?
Bot: AI is a field of computer science...
```

### Evaluation Dashboard (http://localhost:3000/deepeval.html)

#### Step 1: Configure Evaluation
- **Evaluation Mode:** Choose "Dynamic" or "Static"
- **System Prompt:** (optional) Customize bot behavior
- **Initial Question:** Enter first question
- **Number of Tests:** How many evaluations to run

#### Step 2: Run Evaluation
- Click **▶ Run DeepEval** button
- Wait for evaluation to complete (1-5 minutes)

#### Step 3: View Results
- **⭐ Quality Metrics Tab** → See metric scores
- **📈 Analysis Tab** → Performance details
- **💬 Conversation Tab** → Q&A pairs
- **📁 Artifacts Tab** → Past evaluations

---

## 🔄 Typical Workflow

### 1. Start the Platform
```bash
npm start
```

### 2. Test the Chat UI
```
Open: http://localhost:3000
Type: "Hello"
Response: Should get AI response
```

### 3. Run an Evaluation
```
Open: http://localhost:3000/deepeval.html
Mode: Dynamic
Prompts: 5
Click: Run DeepEval
Wait: 1-2 minutes
View: Quality metrics
```

### 4. Check Results
```bash
# View evaluation results
cat reports/runs/latest.json

# Check logs
tail -f reports/logs/app.log
```

### 5. Review Metrics
- Check answer_relevancy score
- Check hallucination detection
- Review other metrics
- Compare with previous runs

---

## 🐛 Troubleshooting

### Problem: Port 3000 Already in Use
```bash
# Use a different port
PORT=3001 npm start

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Problem: DeepEval Not Installing
```bash
# Try pip upgrade
pip install --upgrade pip

# Then reinstall
pip install deepeval

# Or use fallback (heuristic metrics work too)
npm start  # Will work without DeepEval
```

### Problem: Node Modules Not Found
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Problem: Environment Variables Not Found
```bash
# Create .env file
cp config/.env.example config/.env

# Edit with your keys
nano config/.env

# Restart server
npm start
```

### Problem: Python Not Found
```bash
# Check Python path
which python3

# Use explicit path if needed
python3 -m pip install -r requirements.txt
```

### Problem: Tests Failing
```bash
# Check if dependencies installed
pip install -r requirements.txt

# Run verification
npm run verify

# Check Python/Node versions
python3 --version
node --version
```

---

## 📊 Monitoring the Platform

### Check Server Status
```bash
# Is server running?
curl http://localhost:3000

# Get server info
curl http://localhost:3000/api/status
```

### View Logs
```bash
# Application logs
tail -f reports/logs/app.log

# Evaluation logs
tail -f reports/logs/qa_evaluation.log

# All logs
ls reports/logs/
```

### View Evaluation Results
```bash
# List evaluation runs
ls reports/runs/

# View latest result
cat reports/runs/latest.json | jq

# View specific run
cat reports/runs/2024-09-26_eval_001.json | jq '.aggregated_metrics'
```

---

## 🔑 API Endpoints

### Chat Endpoint
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is AI?",
    "systemPrompt": "You are helpful"
  }'
```

### Evaluation Endpoint
```bash
curl -X POST http://localhost:3000/api/deepeval \
  -H "Content-Type: application/json" \
  -d '{
    "apiEndpoint": "http://localhost:3000/api/chat",
    "systemPrompt": "You are helpful",
    "evaluationMode": "dynamic",
    "initialPrompt": "What is AI?",
    "numberOfTests": 3
  }'
```

### Get Results
```bash
curl http://localhost:3000/api/results
```

---

## 🎯 Common Commands

### Quick Start
```bash
npm start
```

### Development Mode (Auto-reload)
```bash
npm run dev
```

### Run Tests
```bash
pytest src/deepeval/tests/ -v
```

### Verify Setup
```bash
npm run verify
```

### Check Metrics
```bash
npm run test:metrics
```

### View Logs
```bash
tail -f reports/logs/app.log
```

### View Results
```bash
cat reports/runs/latest.json | jq
```

---

## 📈 Performance Tips

### For Faster Evaluations
```bash
# Use static mode (faster)
# Use fewer test prompts (3-5)
# Use smaller models if available
```

### For Better Results
```bash
# Use dynamic mode (more thorough)
# Use more test prompts (10+)
# Use larger models (GPT-4)
# Provide detailed system prompt
```

### For Production
```bash
# Set NODE_ENV=production
# Use strict metric thresholds (config/prod.py)
# Enable alerting on metric drops
# Monitor logs regularly
```

---

## 🔐 Security Checklist

Before running in production:

- [ ] Create `.env` file (don't commit it)
- [ ] Store API keys securely
- [ ] Set `NODE_ENV=production`
- [ ] Use strict thresholds
- [ ] Enable HTTPS
- [ ] Add authentication
- [ ] Setup monitoring
- [ ] Configure logging
- [ ] Review security settings
- [ ] Test with real data

---

## 📚 Documentation References

| Document | Purpose |
|----------|---------|
| **README.md** | Project overview |
| **PROJECT_STRUCTURE.md** | Folder structure guide |
| **docs/QUICK_START.md** | 5-minute setup |
| **docs/CODEBASE_STRUCTURE.md** | Technical details |
| **CLAUDE.md** | Project guide for Claude |

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Python installed (3.8+)
- [ ] Node.js installed (14+)
- [ ] Dependencies installed
- [ ] .env file created
- [ ] API keys configured
- [ ] Server starts without errors
- [ ] Chat interface loads (http://localhost:3000)
- [ ] Eval dashboard loads (http://localhost:3000/deepeval.html)
- [ ] Tests pass
- [ ] Logs are being created

---

## 🎉 You're Ready!

Your platform is now set up and ready to use:

```bash
npm start
# Open http://localhost:3000 in browser
# Start chatting and evaluating!
```

---

## 📞 Help & Support

**Getting stuck?**

1. Check `npm run verify` output
2. Read docs/QUICK_START.md
3. Check logs in `reports/logs/`
4. Review error messages
5. Read TROUBLESHOOTING section above

---

**Last Updated:** September 26, 2024  
**Status:** Complete Setup Guide
