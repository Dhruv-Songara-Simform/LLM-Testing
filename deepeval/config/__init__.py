"""Environment configurations."""

from .qa import get_qa_config
from .prod import get_prod_config

__all__ = ["get_qa_config", "get_prod_config"]
