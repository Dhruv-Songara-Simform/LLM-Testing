"""
Pytest configuration and shared fixtures.

Provides common fixtures for all evaluation tests.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from evaluation.engine import IsolatedEvaluator
from datasets.golden.quality_qa_set import load_golden_dataset
from datasets.synthetic.edge_cases import load_edge_case_dataset
from config.qa import get_qa_config
from config.prod import get_prod_config


@pytest.fixture(scope="session")
def qa_config():
    """Load QA environment configuration (session-wide)."""
    return get_qa_config()


@pytest.fixture(scope="session")
def prod_config():
    """Load production environment configuration (session-wide)."""
    return get_prod_config()


@pytest.fixture(scope="session")
def golden_dataset():
    """Load golden dataset (human-verified, production quality)."""
    return load_golden_dataset()


@pytest.fixture(scope="session")
def edge_case_dataset():
    """Load synthetic edge case dataset."""
    return load_edge_case_dataset()


@pytest.fixture
def evaluator(qa_config):
    """Create isolated evaluator instance with QA config."""
    return IsolatedEvaluator(
        eval_model=qa_config["eval_model"],
        judge_temperature=qa_config["judge_temperature"]
    )


@pytest.fixture
def prod_evaluator(prod_config):
    """Create isolated evaluator instance with prod config."""
    return IsolatedEvaluator(
        eval_model=prod_config["eval_model"],
        judge_temperature=prod_config["judge_temperature"]
    )


@pytest.fixture
def sample_qa_pair():
    """Provide a sample question-answer pair for testing."""
    return {
        "question": "What is artificial intelligence?",
        "response": (
            "Artificial intelligence refers to computer systems designed to "
            "perform tasks that typically require human intelligence. These "
            "include learning from experience, recognizing patterns, and "
            "understanding language. AI is used in many applications like "
            "chatbots, recommendation systems, and autonomous vehicles."
        ),
        "context": [
            "AI is a broad field of computer science",
            "Machine learning is a subset of AI",
            "Deep learning uses neural networks"
        ]
    }


@pytest.fixture
def sample_edge_case():
    """Provide a sample edge case for testing."""
    return {
        "question": "什么是人工智能?",  # Chinese
        "description": "Multi-language input (Chinese)",
        "expected_behavior": "should handle gracefully"
    }


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "golden: test against golden dataset"
    )
    config.addinivalue_line(
        "markers", "synthetic: test against synthetic edge cases"
    )
    config.addinivalue_line(
        "markers", "integration: integration test"
    )
    config.addinivalue_line(
        "markers", "slow: slow running test"
    )


def pytest_collection_modifyitems(config, items):
    """Add markers and skip logic for tests."""
    for item in items:
        # Add markers based on test file
        if "golden" in item.nodeid:
            item.add_marker(pytest.mark.golden)
        if "edge_case" in item.nodeid or "synthetic" in item.nodeid:
            item.add_marker(pytest.mark.synthetic)
