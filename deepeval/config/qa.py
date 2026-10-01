"""
QA Environment Configuration.

Development and testing environment settings for evaluation runs.
"""

from typing import Dict, Any

# Model Configuration
EVAL_MODEL = "gpt-4"
JUDGE_TEMPERATURE = 0.0  # Deterministic scoring for reproducibility

# Evaluation Settings
EVALUATION_CONFIG = {
    "timeout_seconds": 300,
    "max_retries": 3,
    "batch_size": 10,
    "parallel_evaluations": False,  # Sequential in QA for debugging
}

# Metric Thresholds for QA
# Unified quality bar: every metric must reach 75% to pass, regardless of category.
METRIC_THRESHOLDS = {
    "answer_relevancy": 0.75,
    "faithfulness": 0.75,
    "contextual_precision": 0.75,
    "contextual_recall": 0.75,
    "contextual_relevancy": 0.75,
    "hallucination": 0.75,
    "toxicity": 0.75,
    "summarization": 0.75,
    "response_length": 0.75,
    "completeness": 0.75,
    "clarity": 0.75,
    "response_latency": 0.75,
    "safety_compliance": 0.75,
}

# Dataset Configuration
DATASET_CONFIG = {
    "golden": {
        "enabled": True,
        "min_pass_rate": 0.85,  # 85% of golden questions must pass
        "categories": ["general_knowledge", "technical_accuracy", "practical_application"],
    },
    "synthetic": {
        "enabled": True,
        "min_pass_rate": 0.70,  # 70% of synthetic tests must pass
        "categories": ["edge_cases", "stress_tests", "adversarial"],
    },
    "custom": {
        "enabled": False,
        "min_pass_rate": 0.75,
    },
}

# Report Configuration
REPORT_CONFIG = {
    "save_results": True,
    "results_dir": "./deepeval/reports/runs/",
    "custom_reports_dir": "./deepeval/reports/custom/",
    "include_individual_metrics": True,
    "include_aggregated_metrics": True,
    "include_visualizations": False,  # Skip vis in QA
    "output_formats": ["json", "csv"],
}

# Logging Configuration
LOGGING_CONFIG = {
    "level": "DEBUG",
    "verbose": True,
    "log_file": "./deepeval/logs/qa_evaluation.log",
}


def get_qa_config() -> Dict[str, Any]:
    """Get complete QA environment configuration."""
    return {
        "environment": "qa",
        "eval_model": EVAL_MODEL,
        "judge_temperature": JUDGE_TEMPERATURE,
        "evaluation": EVALUATION_CONFIG,
        "thresholds": METRIC_THRESHOLDS,
        "datasets": DATASET_CONFIG,
        "reports": REPORT_CONFIG,
        "logging": LOGGING_CONFIG,
    }
