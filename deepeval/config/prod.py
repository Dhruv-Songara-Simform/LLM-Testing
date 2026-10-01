"""
Production Environment Configuration.

Strict and optimized settings for production evaluation runs.
"""

from typing import Dict, Any

# Model Configuration
EVAL_MODEL = "gpt-4"
JUDGE_TEMPERATURE = 0.0  # Deterministic scoring

# Evaluation Settings (Optimized for Production)
EVALUATION_CONFIG = {
    "timeout_seconds": 120,
    "max_retries": 5,
    "batch_size": 50,
    "parallel_evaluations": True,  # Parallel in production for speed
    "use_cache": True,
    "cache_expiry_hours": 24,
}

# Metric Thresholds for Production
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

# Dataset Configuration for Production
DATASET_CONFIG = {
    "golden": {
        "enabled": True,
        "min_pass_rate": 0.95,  # 95% of golden questions must pass
        "categories": [
            "general_knowledge",
            "technical_accuracy",
            "practical_application",
            "edge_case",
            "multi_turn",
        ],
    },
    "synthetic": {
        "enabled": True,
        "min_pass_rate": 0.85,  # 85% of synthetic tests must pass
        "categories": [
            "empty_null",
            "length_boundary",
            "encoding",
            "adversarial",
            "security",
        ],
    },
    "custom": {
        "enabled": True,
        "min_pass_rate": 0.90,
    },
}

# Report Configuration
REPORT_CONFIG = {
    "save_results": True,
    "results_dir": "./deepeval/reports/runs/",
    "custom_reports_dir": "./deepeval/reports/custom/",
    "include_individual_metrics": False,  # Aggregate only in prod
    "include_aggregated_metrics": True,
    "include_visualizations": True,
    "output_formats": ["json"],
    "notify_on_failure": True,
    "failure_notification_email": "team@example.com",
}

# Logging Configuration
LOGGING_CONFIG = {
    "level": "INFO",  # Less verbose in prod
    "verbose": False,
    "log_file": "./deepeval/logs/prod_evaluation.log",
    "max_log_size_mb": 100,
    "retention_days": 30,
}

# Alert Configuration
ALERT_CONFIG = {
    "enabled": True,
    "alert_on_metric_drop": True,
    "metric_drop_threshold": 0.05,  # Alert if metric drops 5%
    "alert_channels": ["email", "slack"],
    "critical_metrics": [
        "safety_compliance",
        "hallucination",
        "toxicity",
    ],
}


def get_prod_config() -> Dict[str, Any]:
    """Get complete production environment configuration."""
    return {
        "environment": "prod",
        "eval_model": EVAL_MODEL,
        "judge_temperature": JUDGE_TEMPERATURE,
        "evaluation": EVALUATION_CONFIG,
        "thresholds": METRIC_THRESHOLDS,
        "datasets": DATASET_CONFIG,
        "reports": REPORT_CONFIG,
        "logging": LOGGING_CONFIG,
        "alerts": ALERT_CONFIG,
    }
