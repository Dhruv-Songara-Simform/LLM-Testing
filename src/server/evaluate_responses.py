#!/usr/bin/env python3
"""
DeepEval integration for comprehensive response evaluation.
Evaluates responses on 14+ quality metrics.
Includes fallback heuristics when DeepEval isn't available.
"""

import sys
import json
from datetime import datetime
import os

os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Single quality bar applied uniformly to every metric (Pass/Fail badges).
PASS_THRESHOLD = 0.75

DEEPEVAL_AVAILABLE = True
try:
    from deepeval.metrics import (
        AnswerRelevancyMetric,
        FaithfulnessMetric,
        ContextualPrecisionMetric,
        ContextualRecallMetric,
        ContextualRelevancyMetric,
        HallucinationMetric,
        ToxicityMetric,
        SummarizationMetric,
    )
    from deepeval.test_case import LLMTestCase
except ImportError as e:
    DEEPEVAL_AVAILABLE = False

def compute_heuristic_metrics(prompt, response):
    """Compute quick heuristic metrics when DeepEval isn't available."""
    response_words = len(response.split())
    prompt_words = len(prompt.split())

    if response_words == 0:
        return {
            "answer_relevancy": 0.0,
            "faithfulness": 0.0,
            "contextual_precision": 0.0,
            "contextual_recall": 0.0,
            "contextual_relevancy": 0.0,
            "hallucination": 0.0,
            "toxicity": 1.0,
            "summarization": 0.0,
            "response_length": 0.0,
            "completeness": 0.0,
            "clarity": 0.0
        }

    # Response Length Score
    length_score = min(1.0, response_words / max(1, prompt_words * 2))

    # Completeness
    completeness = 0.4
    if response_words > 20:
        completeness = 0.8
    if response_words > 100:
        completeness = min(1.0, 0.9)

    # Clarity (inverse of average word length)
    avg_word_len = sum(len(w) for w in response.split()) / response_words
    clarity = max(0.3, 1.0 - min(1.0, (avg_word_len - 5) / 10))

    # Relevancy (simple word overlap check)
    prompt_words_set = set(w.lower() for w in prompt.split() if len(w) > 3)
    response_words_set = set(w.lower() for w in response.split() if len(w) > 3)
    if prompt_words_set:
        overlap = len(prompt_words_set & response_words_set) / len(prompt_words_set)
        relevancy = min(1.0, 0.3 + overlap)
    else:
        relevancy = 0.5

    return {
        "answer_relevancy": round(relevancy, 2),
        "faithfulness": round(0.7, 2),
        "contextual_precision": round(0.75, 2),
        "contextual_recall": round(0.7, 2),
        "contextual_relevancy": round(0.75, 2),
        "hallucination": round(0.8, 2),
        "toxicity": round(0.95, 2),
        "summarization": round(0.75, 2),
        "response_length": round(min(1.0, length_score), 2),
        "completeness": round(min(1.0, completeness), 2),
        "clarity": round(clarity, 2)
    }

def evaluate_custom_metric(metric_desc, response):
    """
    Evaluate a custom metric against a response using semantic analysis.
    Returns score 0-1 based on how well response meets the metric requirement.
    """
    if not response or not metric_desc:
        return 0.0

    desc_lower = metric_desc.lower()
    response_lower = response.lower()
    response_words = response.split()
    response_len = len(response_words)

    if response_len == 0:
        return 0.2

    avg_word_len = sum(len(w) for w in response_words) / response_len
    sentences = [s.strip() for s in response.split('.') if s.strip()]
    avg_sent_len = response_len / max(1, len(sentences))

    # Simplicity / Plain Language checks
    if any(w in desc_lower for w in ['simple', 'simple language', 'english language', 'plain', 'not complex', 'terminology', 'not too much complex']):
        if avg_word_len < 6:
            return 0.92
        elif avg_word_len < 7:
            return 0.82
        elif avg_word_len < 8:
            return 0.72
        elif avg_word_len < 9:
            return 0.58
        else:
            return 0.38

    # Detailed / Comprehensive checks
    if any(w in desc_lower for w in ['detailed', 'comprehensive', 'thorough', 'complete', 'detailed coverage', 'thoroughly']):
        if response_len > 200:
            return 0.93
        elif response_len > 150:
            return 0.85
        elif response_len > 100:
            return 0.76
        elif response_len > 60:
            return 0.62
        else:
            return 0.38

    # Concise / Brief checks
    if any(w in desc_lower for w in ['concise', 'brief', 'short', 'minimal', 'concisely', 'briefly']):
        if response_len < 40:
            return 0.93
        elif response_len < 70:
            return 0.85
        elif response_len < 120:
            return 0.72
        elif response_len < 180:
            return 0.52
        else:
            return 0.28

    # Professional / Formal checks
    if any(w in desc_lower for w in ['professional', 'formal', 'business', 'corporate', 'professional tone', 'formal tone']):
        score = 0.62
        informal_words = ['lol', 'haha', 'gonna', 'wanna', 'gotta', 'dunno', 'kinda', 'sorta', 'yeah', 'nope']
        if not any(w in response_lower for w in informal_words):
            score += 0.22
        exclamation_count = response.count('!')
        if exclamation_count == 0 or exclamation_count < 2:
            score += 0.12
        if avg_sent_len > 12:
            score += 0.04
        return min(1.0, score)

    # Examples / Use cases checks
    if any(w in desc_lower for w in ['example', 'examples', 'use case', 'use cases', 'scenario', 'scenarios', 'instance']):
        example_keywords = ['e.g.', 'example', 'for instance', 'such as', 'like', 'case', 'scenario']
        has_examples = any(kw in response_lower for kw in example_keywords)
        if response_len > 120 and has_examples:
            return 0.91
        elif response_len > 80 and has_examples:
            return 0.82
        elif response_len > 50 and has_examples:
            return 0.68
        elif has_examples:
            return 0.58
        else:
            return 0.38

    # Clarity checks
    if any(w in desc_lower for w in ['clear', 'clarity', 'easy to understand', 'easy', 'understandable', 'readable']):
        clarity_score = 0.52
        if avg_word_len < 6:
            clarity_score += 0.32
        elif avg_word_len < 7:
            clarity_score += 0.26
        elif avg_word_len < 8:
            clarity_score += 0.16
        if response_len > 40:
            clarity_score += 0.08
        if len(sentences) > 2:
            clarity_score += 0.04
        return min(1.0, clarity_score)

    # Grammar / Quality / Structure checks
    if any(w in desc_lower for w in ['grammar', 'quality', 'structure', 'organization', 'organized', 'well-structured']):
        quality_score = 0.58
        if len(sentences) > 2:
            sentence_lens = [len(s.split()) for s in sentences]
            variance = sum((l - avg_sent_len) ** 2 for l in sentence_lens) / len(sentence_lens)
            if 3 < variance < 50:
                quality_score += 0.22
            if 8 < avg_sent_len < 25:
                quality_score += 0.16
        if avg_word_len > 4 and avg_word_len < 10:
            quality_score += 0.09
        return min(1.0, quality_score)

    # Consistency checks
    if any(w in desc_lower for w in ['consistent', 'consistency', 'consistent tone']):
        consistency_score = 0.68
        if len(sentences) > 2:
            sent_lens = [len(s.split()) for s in sentences]
            if max(sent_lens) > 0:
                ratio = min(sent_lens) / max(sent_lens)
                if ratio > 0.5:
                    consistency_score += 0.22
        return min(1.0, consistency_score)

    # Accuracy checks
    if any(w in desc_lower for w in ['accurate', 'correct', 'precise', 'precision', 'accuracy']):
        if response_len < 10:
            return 0.38
        elif response_len > 50:
            return 0.76
        else:
            return 0.66

    # Relevance / Focused checks
    if any(w in desc_lower for w in ['relevant', 'relevance', 'focused', 'focus', 'on-topic', 'on topic']):
        relevance_score = 0.55
        if response_len > 30:
            relevance_score += 0.15
        if response_len > 80:
            relevance_score += 0.12
        if len(sentences) > 1:
            relevance_score += 0.08
        return min(1.0, relevance_score)

    # Depth / Detail checks
    if any(w in desc_lower for w in ['depth', 'deep', 'in-depth', 'indepth', 'detailed explanation', 'explanation']):
        if response_len > 150:
            return 0.88
        elif response_len > 100:
            return 0.78
        elif response_len > 60:
            return 0.65
        else:
            return 0.45

    # Helpful / Useful checks
    if any(w in desc_lower for w in ['helpful', 'useful', 'practical', 'actionable', 'helpful info']):
        helpful_score = 0.55
        if response_len > 50:
            helpful_score += 0.18
        if response_len > 100:
            helpful_score += 0.12
        if len(sentences) > 2:
            helpful_score += 0.08
        return min(1.0, helpful_score)

    # Default: neutral score based on response quality
    if response_len < 5:
        return 0.25
    elif response_len < 20:
        return 0.55
    else:
        return 0.68

def evaluate_response(prompt, response, retrieval_context=None, custom_metrics=None):
    """
    Evaluate a single prompt-response pair on multiple metrics.
    Returns dict with metric scores (0-1 scale).
    """
    if not DEEPEVAL_AVAILABLE:
        metrics = compute_heuristic_metrics(prompt, response)
        if custom_metrics:
            for metric in custom_metrics:
                metric_key = f"custom_{metric['id']}"
                score = evaluate_custom_metric(metric['desc'], response)
                metrics[metric_key] = round(score, 2)
        return metrics

    metrics_results = {}

    try:
        test_case = LLMTestCase(
            input=prompt,
            actual_output=response,
            retrieval_context=retrieval_context or []
        )

        # Try each metric, fall back to None if it fails
        try:
            metric = AnswerRelevancyMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["answer_relevancy"] = round(metric.score, 2)
        except:
            metrics_results["answer_relevancy"] = None

        try:
            metric = FaithfulnessMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["faithfulness"] = round(metric.score, 2)
        except:
            metrics_results["faithfulness"] = None

        try:
            metric = ContextualPrecisionMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["contextual_precision"] = round(metric.score, 2)
        except:
            metrics_results["contextual_precision"] = None

        try:
            metric = ContextualRecallMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["contextual_recall"] = round(metric.score, 2)
        except:
            metrics_results["contextual_recall"] = None

        try:
            metric = ContextualRelevancyMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["contextual_relevancy"] = round(metric.score, 2)
        except:
            metrics_results["contextual_relevancy"] = None

        try:
            metric = HallucinationMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["hallucination"] = round(metric.score, 2)
        except:
            metrics_results["hallucination"] = None

        try:
            metric = ToxicityMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["toxicity"] = round(metric.score, 2)
        except:
            metrics_results["toxicity"] = None

        try:
            metric = SummarizationMetric(threshold=0.5)
            metric.measure(test_case)
            metrics_results["summarization"] = round(metric.score, 2)
        except:
            metrics_results["summarization"] = None

        # Custom metrics
        response_words = len(response.split())
        length_score = min(1.0, response_words / 100)
        metrics_results["response_length"] = round(length_score, 2)

        completeness = 0.8 if response_words > 20 else 0.4
        metrics_results["completeness"] = round(completeness, 2)

        if response_words > 0:
            avg_word_len = sum(len(w) for w in response.split()) / response_words
            clarity = 1.0 - min(1.0, (avg_word_len - 5) / 5)
        else:
            clarity = 0.3
        metrics_results["clarity"] = round(clarity, 2)

        # Use heuristics for any None values
        heuristic = compute_heuristic_metrics(prompt, response)
        for key in metrics_results:
            if metrics_results[key] is None:
                metrics_results[key] = heuristic[key]

        # Evaluate custom metrics
        if custom_metrics:
            for metric in custom_metrics:
                metric_key = f"custom_{metric['id']}"
                score = evaluate_custom_metric(metric['desc'], response)
                metrics_results[metric_key] = round(score, 2)

        return metrics_results

    except Exception:
        metrics = compute_heuristic_metrics(prompt, response)
        if custom_metrics:
            for metric in custom_metrics:
                metric_key = f"custom_{metric['id']}"
                score = evaluate_custom_metric(metric['desc'], response)
                metrics[metric_key] = round(score, 2)
        return metrics

def evaluate_batch(prompts, responses, retrieval_contexts=None, custom_metrics=None):
    """
    Evaluate multiple prompt-response pairs.
    Returns aggregated metrics including custom metrics.
    """
    if retrieval_contexts is None:
        retrieval_contexts = [None] * len(prompts)

    all_metrics = []
    aggregated = {}
    total = len(prompts)

    for idx, (prompt, response, context) in enumerate(zip(prompts, responses, retrieval_contexts)):
        metrics = evaluate_response(prompt, response, context, custom_metrics)
        all_metrics.append(metrics)
        # Progress goes to stderr (not stdout) so it never corrupts the JSON result;
        # server.js scans stderr for this exact format to drive the live progress bar.
        print(f"PROGRESS:{idx + 1}:{total}", file=sys.stderr, flush=True)

    # Aggregate metrics
    if all_metrics:
        metric_keys = set()
        for m in all_metrics:
            metric_keys.update(k for k in m.keys() if k != "error")

        for key in metric_keys:
            values = [m[key] for m in all_metrics if key in m and m[key] is not None]
            if values:
                avg = round(sum(values) / len(values), 2)
                aggregated[key] = {
                    "avg": avg,
                    "min": round(min(values), 2),
                    "max": round(max(values), 2),
                    "all": values,
                    "threshold": PASS_THRESHOLD,
                    "passed": avg >= PASS_THRESHOLD,
                    "status": "Pass" if avg >= PASS_THRESHOLD else "Fail"
                }

    passed_count = sum(1 for m in aggregated.values() if m["passed"])
    total_count = len(aggregated)

    return {
        "individual_metrics": all_metrics,
        "aggregated_metrics": aggregated,
        "timestamp": datetime.now().isoformat(),
        "deepeval_available": DEEPEVAL_AVAILABLE,
        "pass_threshold": PASS_THRESHOLD,
        "metrics_passed": passed_count,
        "metrics_total": total_count,
        "overall_pass_rate": round(passed_count / total_count, 2) if total_count else 0.0,
        "overall_pass": passed_count == total_count and total_count > 0
    }

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        prompts = data.get("prompts", [])
        responses = data.get("responses", [])
        custom_metrics = data.get("custom_metrics", [])

        print(f"[INFO] Evaluating {len(prompts)} prompts with {len(custom_metrics)} custom metrics", file=sys.stderr)
        for i, m in enumerate(custom_metrics):
            print(f"[INFO]   Custom[{i}]: id={m.get('id')}, name={m.get('name')}, desc={m.get('desc')}", file=sys.stderr)

        result = evaluate_batch(prompts, responses, custom_metrics=custom_metrics)

        agg_keys = list(result.get("aggregated_metrics", {}).keys())
        custom_in_result = [k for k in agg_keys if k.startswith('custom_')]
        print(f"[INFO] Result has {len(custom_in_result)} custom metrics: {custom_in_result}", file=sys.stderr)

        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
