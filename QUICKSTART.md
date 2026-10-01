# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Install Dependencies
```bash
cd "/home/dhruv.songara@simform.dom/Chatbot testing"
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Access the Applications

#### Chatbot
- **URL**: http://localhost:3000
- **Features**: Chat with DeepSeek AI in real-time
- **System Prompts**: Optional context customization

#### DeepEval Dashboard
- **URL**: http://localhost:3000/deepeval.html
- **Features**: Evaluate APIs, view metrics, store artifacts

---

## 📊 DeepEval Workflow

### Step 1: Configure
1. Open http://localhost:3000/deepeval.html
2. Enter API endpoint (default: `http://localhost:3000/api/chat`)
3. (Optional) Add a system prompt

### Step 2: Test Prompts
- Use default test prompts or add custom ones
- Click **+ Add Prompt** to include custom tests

### Step 3: Run Evaluation
- Click **▶ Run DeepEval**
- Watch the evaluation progress
- See metrics appear in real-time

### Step 4: View Results
- **Conversation Tab**: All Q&A pairs from the evaluation
- **Analysis Tab**: Detailed metrics (response times, counts)
- **Artifacts Tab**: Download previous evaluations

---

## 📈 Key Metrics

When you run an evaluation, you'll see:

- **Total Messages**: Number of test exchanges
- **Avg Response Time**: Average time to respond (ms)
- **Min/Max Response Time**: Fastest/slowest responses
- **Number of Prompts**: How many test prompts were used
- **Evaluation Date**: When the test ran

---

## 💾 Artifacts

All evaluations are automatically saved to the `artifacts/` folder:

- Each evaluation gets a unique ID
- Stored as JSON files
- Contains full conversation and metrics
- Downloadable from the Artifacts tab

---

## 🔧 Environment Variables

Your `.env` file contains:

```
TEXT_MODEL_API_KEY=your-api-key
TEXT_MODEL_BASE_URL=https://api.deepseek.com/v1
TEXT_MODEL=deepseek-chat
PORT=3000
```

To use a different API endpoint, modify the `apiEndpoint` field in the DeepEval dashboard.

---

## ❓ Troubleshooting

### Port Already in Use
```bash
# Use a different port
PORT=3001 npm start
```

### API Connection Error
- Check your `.env` file has valid credentials
- Ensure internet connection
- Verify DeepSeek API is accessible

### Evaluation Fails
- Double-check the API endpoint URL
- Ensure the endpoint is running and accessible
- Check browser console for detailed errors

---

## 📚 Full Documentation

See `README.md` for detailed API documentation and advanced features.
