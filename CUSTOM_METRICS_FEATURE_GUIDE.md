# Custom Metrics Configuration Feature - User Guide

## Overview

The **Custom Metrics Configuration** feature allows users to define, manage, and report on both built-in and custom evaluation metrics for their chatbot testing. The feature is located in the **Artifacts tab** of the DeepEval Dashboard.

---

## Feature Highlights

✅ **Add Custom Metrics** - Describe any quality metric your chatbot needs to meet  
✅ **Manage Metrics** - View, remove, and organize metrics  
✅ **Select & Filter** - Choose which metrics to include in reports (only selected metrics appear)  
✅ **PDF Reports** - Industry-ready PDF reports with all selected metrics  
✅ **JSON Export** - Export metrics configuration as JSON for documentation  

---

## How to Use

### Step 1: Open Artifacts Tab

1. Run a DeepEval evaluation (click "Run DeepEval" button)
2. Wait for evaluation to complete
3. Click the **📁 Artifacts** tab in the results section

### Step 2: Add Custom Metrics

1. In the "Custom Metrics Configuration" section, find the text area labeled "Describe Custom Metric"
2. Enter a description of your metric, e.g.:
   - `Response length should be between 50-500 words`
   - `Must include references to company policies`
   - `Ensure response uses bullet points for lists`
   - `No grammatical errors allowed`

3. Click **➕ Add Custom Metric** button
4. The metric will be added to your list
5. Repeat for additional metrics (max 20)

### Step 3: Proceed to Selection

1. Click **✓ Next** button
2. The metrics selection section will expand

### Step 4: Select Metrics for Report

**Built-in Metrics** (Top Section):
- All 8 built-in DeepEval metrics are checked by default:
  - Answer Relevancy
  - Faithfulness
  - Contextual Precision
  - Contextual Recall
  - Contextual Relevancy
  - Hallucination
  - Toxicity
  - Summarization

**Custom Metrics** (Bottom Section):
- All your custom metrics appear here
- Uncheck to exclude from report (or check to include)

**Key Feature**: ⭐ **Only metrics with checkboxes checked will appear in the generated report**

### Step 5: Generate Report

Choose your export format:

#### Option A: Download PDF Report 📥
- Click **📥 Download PDF Report**
- A professional, industry-ready PDF will download
- Filename: `deepeval-metrics-report-[timestamp].pdf`
- Includes:
  - Report header with timestamp
  - Summary table (total metrics, builtin vs custom)
  - List of all selected built-in metrics
  - List of all selected custom metrics with descriptions
  - Company branding and confidentiality notice

#### Option B: Export as JSON 💾
- Click **💾 Export as JSON**
- A structured JSON file will download
- Filename: `deepeval-metrics-export-[timestamp].json`
- Includes:
  - Timestamp and summary
  - List of all selected metrics
  - Evaluation context (if available)

---

## Example Workflow

```
1. User adds custom metrics:
   - "Response length 100-500 words"
   - "Use technical terminology correctly"
   - "Cite reliable sources"

2. User clicks "Next"

3. User sees checkboxes for:
   ✓ Answer Relevancy (built-in, checked)
   ✓ Faithfulness (built-in, checked)
   ✓ Hallucination (built-in, checked)
   ✓ Response length 100-500 words (custom, checked)
   ✓ Use technical terminology correctly (custom, checked)
   ✓ Cite reliable sources (custom, checked)

4. User unchecks "Hallucination" (doesn't want it in report)

5. User clicks "Download PDF Report"

6. PDF includes:
   - Only the checked metrics
   - 5 metrics total (3 built-in + 2 custom)
   - Formatted professionally for stakeholders
```

---

## Key Features Explained

### Custom Metrics Count
- Real-time counter shows how many custom metrics have been added
- Displayed in the section header: "Custom Metrics Added: X"

### Remove Custom Metric
- Each custom metric card has a "Remove" button (red)
- Clicking removes it from the list and unchecks it in the report

### Smart Filtering
- **If checkbox is unchecked, the metric doesn't appear in the report**
- This applies to both built-in and custom metrics
- Allows users to create focused reports for different audiences

### PDF Report Quality
- Professional layout with:
  - Company branding header
  - Clear section breaks
  - Numbered metric lists
  - Timestamps and metadata
  - Confidentiality notice
  - Print-ready formatting

### JSON Export Benefits
- Programmatic access to metrics configuration
- Easy integration with CI/CD pipelines
- Version control for metric definitions
- Shareable with team members

---

## Best Practices

### ✅ DO

1. **Be specific in descriptions**
   - ✓ "Response must be under 200 words"
   - ✗ "Keep it short"

2. **Use quantifiable metrics**
   - ✓ "Include at least 3 sources"
   - ✗ "Reference good sources"

3. **Group related metrics**
   - Add metrics that measure similar aspects together

4. **Document the rationale**
   - Your description becomes the report documentation

5. **Review before export**
   - Uncheck metrics you don't need in the final report

### ❌ DON'T

1. **Don't duplicate built-in metrics**
   - Built-in metrics already cover standard quality checks
   - Add custom metrics for business-specific needs only

2. **Don't use vague language**
   - Be precise about what you're measuring

3. **Don't add too many metrics** (>20)
   - System limit is 20 custom metrics per evaluation

4. **Don't forget to uncheck** built-in metrics you don't need
   - Reports are easier to read when focused

---

## Technical Notes

### Built-in Metrics (Always Available)
These 8 metrics are always available and checked by default:

1. **Answer Relevancy** - Does response address the question?
2. **Faithfulness** - Are facts accurate?
3. **Contextual Precision** - Uses only relevant context?
4. **Contextual Recall** - Covers all relevant context?
5. **Contextual Relevancy** - Is context actually relevant?
6. **Hallucination** - No made-up information?
7. **Toxicity** - Non-harmful language?
8. **Summarization** - Accurate summaries?

### Data Persistence
- Custom metrics are stored in browser session memory
- They persist for the current evaluation session
- Refresh the page to clear custom metrics
- Each new evaluation starts with fresh metrics

### Report Generation
- PDF uses html2pdf library (client-side)
- No server calls needed for report generation
- Reports are generated entirely in your browser
- Timestamp is automatically included

---

## Troubleshooting

### Issue: "Please select at least one metric"
**Solution**: Check at least one checkbox in the metrics selection area before downloading

### Issue: Custom metric didn't appear
**Solution**: Make sure you clicked "➕ Add Custom Metric" (not just "✓ Next")

### Issue: PDF looks different on different devices
**Solution**: PDFs are designed for A4 paper - compatibility varies by browser

### Issue: Custom metrics disappeared
**Solution**: Browser refresh clears session memory. Add them again or export to JSON to save them

---

## Integration with Evaluation

### Before Export
- Run DeepEval evaluation first
- Results are linked to custom metrics in the JSON export
- PDF shows only metrics configuration (not evaluation results)

### After Export
- Share PDF with stakeholders
- Use JSON for programmatic validation
- Reference metrics in test documentation
- Track metrics over time

---

## Support

For questions or feature requests related to custom metrics:

1. Check the **Custom_Metrics_Implementation_Plan.md** for technical details
2. Review **QUICK_REFERENCE.md** for general dashboard help
3. See **CODEBASE_STRUCTURE.md** for architecture details

---

**Feature Version**: 1.0.0  
**Last Updated**: October 1, 2026  
**Status**: Production Ready
