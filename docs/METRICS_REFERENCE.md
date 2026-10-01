# 📊 Quality Metrics Reference Guide

Quick lookup for all 14+ quality metrics in the dashboard.

## 🎯 Metric Categories

### Response Quality (4 metrics)
Measures how well the response addresses the user's question.

#### 1. **Answer Relevancy** 
- **Icon**: 📌
- **What it measures**: Does the response directly address the question?
- **Good Score (70%+)**: Response is on-topic and answers the question
- **Poor Score (<50%)**: Response is off-topic or misses the point
- **Example**:
  - ✅ Q: "What is AI?" A: "AI is artificial intelligence..." (High)
  - ❌ Q: "What is AI?" A: "I like computers..." (Low)

#### 2. **Faithfulness**
- **Icon**: ✅
- **What it measures**: Are all facts in the response true and supported?
- **Good Score (70%+)**: All claims are accurate and verifiable
- **Poor Score (<50%)**: Contains false or unverified claims
- **Example**:
  - ✅ "Earth orbits the Sun" (High)
  - ❌ "Earth orbits the Moon" (Low)

#### 3. **Clarity**
- **Icon**: 💎
- **What it measures**: Is the response easy to understand?
- **Good Score (70%+)**: Clear language, good structure, simple words
- **Poor Score (<50%)**: Confusing, poor grammar, complex jargon
- **Example**:
  - ✅ "Machine learning is when computers learn from data" (High)
  - ❌ "Algorithmic cognitive paradigms utilize iterative optimization..." (Low)

#### 4. **Completeness**
- **Icon**: 📦
- **What it measures**: Does the response cover the topic thoroughly?
- **Good Score (70%+)**: Comprehensive, addresses main points
- **Poor Score (<50%)**: Incomplete, surface-level, missing key info
- **Example**:
  - ✅ "Machine learning has supervised, unsupervised, and reinforcement learning..." (High)
  - ❌ "Machine learning exists." (Low)

---

### Context Awareness (3 metrics)
Measures how well the response uses available information.

#### 5. **Contextual Precision**
- **Icon**: 🎯
- **What it measures**: Does response use ONLY relevant context?
- **Good Score (70%+)**: Every sentence is relevant to the topic
- **Poor Score (<50%)**: Includes lots of irrelevant information
- **Example**:
  - ✅ Answering "How to cook pasta?" with cooking steps only (High)
  - ❌ Answering "How to cook pasta?" with life story (Low)

#### 6. **Contextual Recall**
- **Icon**: 🔍
- **What it measures**: Does response cover ALL relevant information?
- **Good Score (70%+)**: Includes all important context points
- **Poor Score (<50%)**: Missing key information from context
- **Example**:
  - ✅ Mentions all ingredients for recipe (High)
  - ❌ Forgets to mention salt (Low)

#### 7. **Contextual Relevancy**
- **Icon**: 🔗
- **What it measures**: Is the provided context actually relevant?
- **Good Score (70%+)**: Context is related and useful
- **Poor Score (<50%)**: Context is irrelevant or off-topic
- **Example**:
  - ✅ Including cooking tips for "How to cook?" (High)
  - ❌ Including Shakespeare quotes for "How to cook?" (Low)

---

### Safety & Fairness (3 metrics)
Measures content appropriateness and safety.

#### 8. **Hallucination**
- **Icon**: 🚨
- **What it measures**: Does response make up false information?
- **Good Score (70%+)**: No fabricated facts
- **Poor Score (<50%)**: Contains invented or false claims
- **Example**:
  - ✅ "The Eiffel Tower is in Paris" (High)
  - ❌ "The Eiffel Tower is on Mars" (Low)

#### 9. **Toxicity**
- **Icon**: ⚠️
- **What it measures**: Is the language respectful and non-harmful?
- **Good Score (70%+)**: Respectful, professional, inclusive
- **Poor Score (<50%)**: Contains harmful, offensive, or abusive language
- **Example**:
  - ✅ "I appreciate your question" (High)
  - ❌ "That's a stupid question" (Low)

#### 10. **Bias Detection**
- **Icon**: ⚖️
- **What it measures**: Is the response fair and unbiased?
- **Good Score (70%+)**: Balanced perspective, no favoritism
- **Poor Score (<50%)**: Shows clear bias or prejudice
- **Example**:
  - ✅ "Both approaches have merits and drawbacks" (High)
  - ❌ "Only our approach is correct" (Low)

---

### Response Characteristics (3 custom metrics)
Measures response structure and format.

#### 11. **Response Length**
- **Icon**: 📏
- **What it measures**: Is the response appropriately detailed?
- **Good Score (70%+)**: Balanced length for the question
- **Poor Score (<50%)**: Too short or unnecessarily verbose
- **Example**:
  - ✅ 50-word answer to "What is AI?" (High)
  - ❌ 5-word answer or 500-word ramble (Low)

#### 12. **Summarization Accuracy**
- **Icon**: 📄
- **What it measures**: If summarizing, is the summary accurate?
- **Good Score (70%+)**: Summary captures main points
- **Poor Score (<50%)**: Summary misses or distorts key points
- **Example**:
  - ✅ Summary includes key facts from original (High)
  - ❌ Summary focuses on irrelevant details (Low)

---

## 📈 Scoring Guide

### Overall Quality Score
Average of all individual metrics.

```
80-100% → Excellent quality ✨
70-79%  → Good quality 👍
50-69%  → Average quality ⚠️
0-49%   → Needs improvement 🔴
```

---

## 🎨 Dashboard Colors

Visual indicators in the Quality Metrics tab use a single unified 75% Pass/Fail bar for every metric (`PASS_THRESHOLD` in `evaluate_responses.py`):

| Color | Score | Meaning |
|-------|-------|---------|
| 🟢 Green | ≥75% | ✅ Pass |
| 🔴 Red | <75% | ❌ Fail |

An overall summary banner above the metric grid shows how many metrics passed out of the total (e.g. "9/11 metrics passed (82%)").

---

## 📊 Visualization Guide

### Metric Badges
Individual score cards with visual bars showing performance.

```
┌─────────────────────┐
│   Answer Relevancy  │  ← Metric name
│        87%          │  ← Score
│ ████████░░ 87%      │  ← Visual bar
└─────────────────────┘
```

### Radar Chart
360° view of all metrics. Larger area = better overall performance.

```
           Relevancy
              ★
            /   \
    Clarity ★     ★ Faithfulness
          /         \
   Clarity★         ★Completeness
         /             \
      ★─────────────────★
  Contextual           Hallucination
  Precision
```

### Bar Chart
Ranked metrics from highest to lowest score.

```
Faithfulness    ████████░ 88%
Answer Rel.     ███████░░ 82%
Clarity         ██████░░░ 78%
Completeness    █████░░░░ 75%
Toxicity        ████░░░░░ 70%
Hallucination   ██░░░░░░░ 45%
```

---

## 💡 Quick Tips

### High Quality Response (80%+)
- ✅ Directly answers the question
- ✅ Facts are accurate
- ✅ Easy to understand
- ✅ Covers the topic thoroughly
- ✅ Respectful tone
- ✅ No made-up information

### Low Quality Response (<50%)
- ❌ Off-topic or irrelevant
- ❌ Contains false claims
- ❌ Confusing or unclear
- ❌ Missing important info
- ❌ Disrespectful tone
- ❌ Fabricated facts

---

## 🔧 Using Metrics to Improve

### If Relevancy is Low
- Check if system prompt is clear
- Use more specific questions
- Ensure initial question is focused

### If Faithfulness is Low
- Add context/facts to system prompt
- Use static mode with fact-based questions
- Provide retrieval context if available

### If Clarity is Low
- Request simpler language in system prompt
- Avoid overly complex questions
- Add formatting hints ("bullet points", "simple terms")

### If Hallucination is High
- Provide factual context
- Use system prompt to emphasize accuracy
- Ask verification questions

---

## 📋 Example Evaluation Results

### Excellent Bot (85%+ average)
```
Answer Relevancy:     92% ✨
Faithfulness:         88% ✨
Clarity:              89% ✨
Completeness:         85% ✨
Contextual Recall:    87% ✨
Hallucination:        92% ✨
Toxicity:             95% ✨
Average:              90% 🌟
```

### Average Bot (60-70% average)
```
Answer Relevancy:     72% 👍
Faithfulness:         65% ⚠️
Clarity:              70% 👍
Completeness:         68% ⚠️
Contextual Recall:    62% ⚠️
Hallucination:        75% 👍
Toxicity:             88% ✨
Average:              70% 👍
```

### Needs Improvement (<60% average)
```
Answer Relevancy:     45% 🔴
Faithfulness:         38% 🔴
Clarity:              52% ⚠️
Completeness:         42% 🔴
Contextual Recall:    48% ⚠️
Hallucination:        35% 🔴
Toxicity:             60% ⚠️
Average:              46% 🔴
```

---

## 🎯 Metric Interactions

Metrics that often correlate:
- **Relevancy** ↔ **Completeness**: More complete answers tend to be more relevant
- **Faithfulness** ↔ **Hallucination**: Faithful responses have no hallucinations
- **Clarity** ↔ **Toxicity**: Clear language usually avoids offensive terms
- **Contextual Recall** ↔ **Completeness**: Both measure thoroughness

---

## 📞 Reference Commands

```bash
# Test metrics integration
npm run test:metrics

# Verify setup
npm run verify

# Start server with metrics
npm start

# View quality metrics tab
http://localhost:3000/deepeval.html
# → ⭐ Quality Metrics tab
```

---

## 🔗 Related Documentation

- **QUICK_START.md** - Get started in 5 minutes
- **QUALITY_METRICS.md** - Detailed metric descriptions
- **README_QUALITY_METRICS.md** - Complete user guide
- **IMPLEMENTATION_SUMMARY.md** - Technical details
