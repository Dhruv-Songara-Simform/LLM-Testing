"""
DeepEval Framework - Enterprise AI Chatbot Evaluation System.

An isolated, production-grade evaluation framework for measuring
AI chatbot quality across 15+ metrics.
"""

__version__ = "1.0.0"
__author__ = "AI Platform Team"

from deepeval.evaluation.engine import IsolatedEvaluator, EvaluationSession

__all__ = [
    "IsolatedEvaluator",
    "EvaluationSession",
]
