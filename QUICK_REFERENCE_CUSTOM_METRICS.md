# Custom Metrics Configuration - Quick Reference

## 🎯 What's New

A complete custom metrics management system in the **Artifacts** tab that lets you:
- ✅ Add custom quality metrics
- ✅ Select which metrics to include
- ✅ Generate professional PDF reports
- ✅ Export as JSON

---

## 📍 Where to Find It

1. Run a **DeepEval** evaluation (click "▶ Run DeepEval")
2. Wait for evaluation to complete
3. Click the **📁 Artifacts** tab
4. Scroll down to "📋 Custom Metrics Configuration"

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Custom Metrics
```
Describe Custom Metric: [textarea]
E.g., "Response should be under 200 words"
      "Must cite reliable sources"
      "No grammatical errors"

Click: ➕ Add Custom Metric
```

### Step 2: Review & Select
```
Click: ✓ Next

See checkboxes for:
✓ Answer Relevancy (built-in)
✓ Faithfulness (built-in)
✓ Your Custom Metric 1
✓ Your Custom Metric 2
...
```

### Step 3: Download Report
```
Click: 📥 Download PDF Report
  OR
Click: 💾 Export as JSON

File downloads automatically
```

---

## 🎨 The Interface

```
┌─────────────────────────────────────────────────┐
│  📋 Custom Metrics Configuration                │
├─────────────────────────────────────────────────┤
│  Step 1: Add Metrics                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Describe Custom Metric:                 │   │
│  │ [Response should be between 50-500...]  │   │
│  │                                         │   │
│  │ [➕ Add Custom Metric] [✓ Next]         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  (Next section only shows after clicking ✓)   │
│                                                 │
│  Step 2: Custom Metrics Added: 3               │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎯 Response length 50-500 words         │   │
│  │    [Remove]                             │   │
│  │ 🎯 Cite reliable sources                │   │
│  │    [Remove]                             │   │
│  │ 🎯 No grammatical errors                │   │
│  │    [Remove]                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Step 3: Select Metrics to Include in Report  │
│                                                 │
│  📊 Built-in Metrics:                          │
│  ☑ Answer Relevancy     ☑ Faithfulness        │
│  ☑ Contextual Precision ☐ Hallucination       │
│  ☑ Contextual Recall    ☑ Toxicity            │
│  ☑ Contextual Relevancy ☑ Summarization       │
│                                                 │
│  🎯 Custom Metrics:                            │
│  ☑ Response length 50-500 words                │
│  ☑ Cite reliable sources                       │
│  ☑ No grammatical errors                       │
│                                                 │
│  [📥 Download PDF Report] [💾 Export as JSON]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 PDF Report Example

```
╔═══════════════════════════════════════════════════╗
║         DeepEval Report                           ║
║      Custom Metrics Analysis                      ║
║───────────────────────────────────────────────────║
║ Generated Date: 10/1/2026, 2:30 PM               ║
║ Total Metrics Selected: 11                        ║
║ Built-in Metrics: 8                              ║
║ Custom Metrics: 3                                 ║
║───────────────────────────────────────────────────║
║                                                   ║
║ 📊 Built-in Metrics:                             ║
║   1. Answer Relevancy                            ║
║   2. Faithfulness                                ║
║   3. Contextual Precision                        ║
║   ... (8 total)                                  ║
║                                                   ║
║ 🎯 Custom Metrics:                               ║
║   1. Response length between 50-500 words        ║
║      Description: Keep responses concise         ║
║   2. Cite reliable sources                       ║
║      Description: Reference credible sources     ║
║   3. No grammatical errors                       ║
║      Description: Professional language          ║
║                                                   ║
║───────────────────────────────────────────────────║
║ DeepEval Framework v1.1.0                        ║
║ © 2026 SimChat. All rights reserved.             ║
║ Confidential - For authorized use only           ║
╚═══════════════════════════════════════════════════╝
```

---

## 💡 Key Features

### ⭐ Smart Filtering
- **Only checked metrics appear in your report**
- Uncheck metrics you don't need
- Perfect for different audiences

### 📌 Preset Built-in Metrics
All 8 metrics are **checked by default**:
1. Answer Relevancy
2. Faithfulness
3. Contextual Precision
4. Contextual Recall
5. Contextual Relevancy
6. Hallucination
7. Toxicity
8. Summarization

### 🔢 Limits & Rules
- Max 20 custom metrics per evaluation
- No duplicates allowed
- Each metric shows add timestamp
- Live counter of metrics added

### 📥 Export Options

**PDF Report:**
- Professional formatting
- Company branding
- Print-ready (A4)
- Download: `deepeval-metrics-report-[timestamp].pdf`

**JSON Export:**
- Structured data
- Programmatic access
- Version control friendly
- Download: `deepeval-metrics-export-[timestamp].json`

---

## 📝 Example Use Cases

### Use Case 1: HR Chatbot
```
Custom metrics:
- "Must reference company HR policies"
- "No disclosure of confidential employee data"
- "Response under 300 words"
- "Professional and empathetic tone"

Select metrics:
- Built-in: Answer Relevancy, Faithfulness, Toxicity
- Custom: All 4

PDF Report: 7 metrics, ready for HR stakeholders
```

### Use Case 2: Sales Support Bot
```
Custom metrics:
- "Must mention product benefits"
- "Include pricing information"
- "Provide CTA (Call To Action)"
- "No competitor mentions"

Select metrics:
- Built-in: Answer Relevancy, Hallucination
- Custom: All 4

PDF Report: 6 metrics, ready for sales team
```

### Use Case 3: Technical Support Bot
```
Custom metrics:
- "Code samples must be syntactically correct"
- "Reference relevant documentation"
- "Provide step-by-step instructions"

Select metrics:
- Built-in: Faithfulness, Contextual Recall
- Custom: All 3

PDF Report: 5 metrics, ready for engineering review
```

---

## ❓ Common Questions

**Q: Can I edit a metric after adding it?**
A: No, remove it and add it again with new text.

**Q: Do custom metrics persist after page refresh?**
A: No, they're stored in session memory. Export to JSON if you want to save them.

**Q: What if I want all metrics in the report?**
A: Just click "Download PDF Report" without unchecking anything.

**Q: Can I use the same custom metric twice?**
A: No, duplicates are not allowed (system will notify you).

**Q: Is my PDF report private?**
A: Yes! PDFs are generated entirely in your browser. No server involved.

---

## 🔧 Technical Notes

- **Technology**: Client-side PDF generation using html2pdf.js
- **Storage**: Session memory (browser-based)
- **No Database**: Everything happens in your browser
- **No API Calls**: Report generation is instant
- **Security**: HTML properly escaped to prevent XSS

---

## 🚨 Known Limitations

1. Custom metrics don't persist across page refreshes
   - **Workaround**: Export to JSON and save the file

2. PDF formatting may vary slightly across browsers
   - **Workaround**: Print to PDF if needed

3. Maximum 20 custom metrics per evaluation
   - **Workaround**: Combine related metrics into one description

---

## 📚 Additional Resources

- **Full User Guide**: `CUSTOM_METRICS_FEATURE_GUIDE.md`
- **Technical Details**: `FEATURE_SUMMARY.md`
- **Architecture Reference**: `Custom_Metrics_Implementation_Plan.md`
- **Main Dashboard Help**: `public/deepeval.html`

---

## ✅ Checklist Before Exporting

- [ ] Added all needed custom metrics
- [ ] Reviewed metric descriptions
- [ ] Selected/deselected appropriate built-in metrics
- [ ] Chose export format (PDF or JSON)
- [ ] Know where file will download to
- [ ] Have at least one metric selected

---

## 🎓 Pro Tips

1. **Use Clear Descriptions**
   - ✓ "Response must include 2-3 supporting sources"
   - ✗ "Good citations"

2. **Don't Duplicate Built-in Metrics**
   - Faithfulness is already built-in
   - Add custom metrics for unique business needs

3. **Organize by Topic**
   - Group related metrics together
   - Makes reports easier to read

4. **Save Important Metrics**
   - Export to JSON for reuse
   - Keep as version control reference

5. **Review Before Sharing**
   - Uncheck unnecessary metrics
   - Focused reports are more effective

---

**Version**: 1.0.0  
**Last Updated**: October 1, 2026  
**Status**: Ready to Use ✅
