# 🚀 Quick Start - Quality Metrics Dashboard

Get started with the enhanced DeepEval Dashboard in 5 minutes.

## 1️⃣ Install Dependencies (2 minutes)

```bash
# Node dependencies
npm install

# Python quality metrics (REQUIRED for metrics)
pip install -r requirements.txt
```

## 2️⃣ Verify Setup (1 minute)

```bash
npm run verify
```

You should see:
```
✅ Python 3 found
✅ DeepEval found  
✅ Node.js found
✅ node_modules found
```

## 3️⃣ Start Server (1 minute)

```bash
npm start
```

Expected output:
```
Chatbot server running on http://localhost:3000
Using model: deepseek-chat
Artifacts stored in: /path/to/artifacts
```

## 4️⃣ Open Dashboard (1 minute)

In your browser, go to:
```
http://localhost:3000/deepeval.html
```

## 5️⃣ Run Your First Evaluation

### Dynamic Mode (Recommended)
1. **Evaluation Mode**: Select "🤖 Dynamic (AI-Generated Follow-ups)"
2. **Initial Question**: Leave default or set custom
3. **System Prompt** (optional): e.g., "You are a helpful assistant"
4. **Number of Tests**: Set to 5
5. Click **▶ Run DeepEval**
6. Wait 1-2 minutes for evaluation

### Static Mode
1. **Evaluation Mode**: Select "📝 Static (Predefined Questions)"
2. Customize questions or use defaults
3. Click **▶ Run DeepEval**
4. Wait 30-60 seconds

## 📊 View Results

After evaluation completes, click the tabs:

- **⭐ Quality Metrics** ← See individual metric scores
- **📈 Analysis** ← See response time and details
- **💬 Conversation** ← See Q&A pairs
- **📁 Artifacts** ← See past evaluations

## 🎨 Quality Metrics Explained

Each metric is scored 0-100%:

| Score | Meaning | Color |
|-------|---------|-------|
| 70-100% | Excellent | 🟢 Green |
| 50-70% | Good | 🟡 Yellow |
| 0-50% | Needs work | 🔴 Red |

### What Each Metric Means

**Answer Relevancy**: Does response answer the question?
**Faithfulness**: Are the facts correct?
**Clarity**: Is it easy to understand?
**Hallucination**: Any made-up facts?
**Toxicity**: Any harmful content?
**And 6 more...**

## 📋 Evaluate Against Your Requirements

1. Make sure `.env` has `FEATURE_REQUIREMENTS=true` and restart `npm start`.
2. On the DeepEval page, scroll to **📋 Requirements** in the Configuration card.
3. Paste requirements one per line (or **Load .txt / .md file**), e.g.
   ```
   - The assistant must greet the user politely
   - Never ask for or repeat passwords or card numbers
   - Refund answers must mention the 30-day window
   ```
   Lines over 100 words are shown in red with their line number and are not added.
4. Click **➕ Add requirements**. They appear as a checklist (R-01, R-02, …); uncheck any you don't want in this run. The Ready line shows `N metrics selected · M requirements selected`.
5. Pick prompts that exercise your requirements (a requirement no prompt touches is reported as *Not tested*, never as a pass), then click **▶ Run DeepEval**.
6. Open the **📋 Requirements** tab for the verdict, scorecard, charts, heatmap and per-response reasons. The **⭐ Quality Metrics** tab is exactly as before.
7. In **📁 Artifacts**, download the **Requirements Report** PDF, or export CSV/JSON.

Set `REQ_JUDGE_MODEL` (plus `REQ_JUDGE_API_KEY`/`REQ_JUDGE_BASE_URL`) to use a different model for requirement checks than the chatbot under test.

## 💡 Tips & Tricks

### Fast Evaluation
```
- Use Static Mode
- Set 3 test prompts
- Takes ~30 seconds
```

### Thorough Evaluation
```
- Use Dynamic Mode  
- Set 10 test prompts
- Use specific system prompt
- Takes ~3-4 minutes
```

### Consistent Results
```
1. Set a clear system prompt
2. Use same initial question
3. Run multiple times to compare
4. Check Artifacts tab for history
```

## 🧪 Test It Out

Run a quick integration test:
```bash
npm run test:metrics
```

## 🐛 Troubleshooting

### "Metrics unavailable" error?
```bash
# Check Python
python3 --version

# Install DeepEval
pip install deepeval

# Restart server
npm start
```

### Evaluation takes too long?
- Use fewer test prompts (3-5)
- Switch to Static mode
- Check your system resources

### Server won't start?
```bash
# Check port 3000 is free
lsof -i :3000

# Or use different port
PORT=3001 npm start
```

## 📚 Learn More

- **Full Guide**: `README_QUALITY_METRICS.md`
- **Metric Details**: `QUALITY_METRICS.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

## 🎯 Next Steps

1. ✅ Install & verify setup
2. ✅ Run first evaluation
3. ✅ Understand metrics
4. ✅ Compare multiple runs
5. ✅ Optimize based on results

## 📞 Need Help?

1. Check troubleshooting above
2. Run `npm run verify` to diagnose
3. Check `QUALITY_METRICS.md` for detailed info
4. Review server logs for errors

---

**That's it!** 🎉 You're ready to evaluate your chatbot with advanced quality metrics.
