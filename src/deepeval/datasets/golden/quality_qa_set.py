"""
Golden Dataset: High-quality Q&A pairs with expected outcomes.

These are human-reviewed, production-quality examples that define
the expected behavior of the chatbot.
"""

from typing import List, Dict, Any


class GoldenQASet:
    """Golden quality assurance dataset."""

    @staticmethod
    def get_quality_questions() -> List[Dict[str, Any]]:
        """
        Get golden quality questions with expected outputs.

        Returns:
            List of question dictionaries with expected responses
        """
        return [
            {
                "id": "golden_001",
                "category": "general_knowledge",
                "question": "What is artificial intelligence?",
                "expected_elements": [
                    "machines", "learning", "data", "decision", "algorithm"
                ],
                "min_length_words": 30,
                "max_length_words": 200,
                "should_cite_sources": False,
                "difficulty": "easy",
            },
            {
                "id": "golden_002",
                "category": "technical_accuracy",
                "question": "Explain the difference between machine learning and deep learning.",
                "expected_elements": [
                    "neural networks", "layers", "algorithms", "features",
                    "training data", "subset"
                ],
                "min_length_words": 50,
                "max_length_words": 300,
                "should_cite_sources": False,
                "difficulty": "medium",
            },
            {
                "id": "golden_003",
                "category": "practical_application",
                "question": "How should I evaluate a chatbot's response quality?",
                "expected_elements": [
                    "metrics", "evaluation", "test", "accuracy", "user",
                    "feedback", "context"
                ],
                "min_length_words": 50,
                "max_length_words": 250,
                "should_cite_sources": True,
                "difficulty": "medium",
            },
            {
                "id": "golden_004",
                "category": "edge_case",
                "question": "What happens if there is no good answer to a question?",
                "expected_elements": [
                    "clarify", "limit", "acknowledge", "partial", "context",
                    "honest"
                ],
                "min_length_words": 40,
                "max_length_words": 200,
                "should_cite_sources": False,
                "difficulty": "hard",
            },
            {
                "id": "golden_005",
                "category": "multi_turn",
                "question": "Can you help me understand AI evaluation metrics? Start with the basic ones.",
                "expected_elements": [
                    "accuracy", "precision", "recall", "F1", "basic",
                    "foundational"
                ],
                "min_length_words": 60,
                "max_length_words": 300,
                "should_cite_sources": False,
                "difficulty": "medium",
            },
        ]

    @staticmethod
    def get_acceptable_response_patterns() -> Dict[str, Dict[str, Any]]:
        """
        Get acceptable response patterns for validation.

        Returns:
            Dictionary of pattern rules for response validation
        """
        return {
            "general_knowledge": {
                "min_clarity_score": 0.7,
                "min_completeness_score": 0.6,
                "max_hallucination_tolerance": 0.2,
                "expected_tone": "informative",
            },
            "technical_accuracy": {
                "min_clarity_score": 0.8,
                "min_completeness_score": 0.8,
                "max_hallucination_tolerance": 0.1,
                "expected_tone": "precise",
            },
            "practical_application": {
                "min_clarity_score": 0.75,
                "min_completeness_score": 0.7,
                "max_hallucination_tolerance": 0.15,
                "expected_tone": "helpful",
            },
            "edge_case": {
                "min_clarity_score": 0.7,
                "min_completeness_score": 0.6,
                "max_hallucination_tolerance": 0.3,
                "expected_tone": "honest",
            },
            "multi_turn": {
                "min_clarity_score": 0.75,
                "min_completeness_score": 0.75,
                "max_hallucination_tolerance": 0.1,
                "expected_tone": "structured",
            },
        }


def load_golden_dataset() -> Dict[str, Any]:
    """Load and return the complete golden dataset."""
    golden = GoldenQASet()
    return {
        "name": "Golden Quality Q&A Set",
        "version": "1.0.0",
        "description": "Human-reviewed production-quality examples",
        "questions": golden.get_quality_questions(),
        "patterns": golden.get_acceptable_response_patterns(),
        "total_questions": len(golden.get_quality_questions()),
    }
