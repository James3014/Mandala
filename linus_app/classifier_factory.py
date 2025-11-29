"""Factory for building classifiers with fallback."""

from .classifier import BaseClassifier, RuleBasedClassifier, GeminiClassifier, ClassificationError
from .config import GRID_DEFINITIONS
import os


def build_classifier() -> tuple[BaseClassifier, BaseClassifier]:
    """Returns (primary_classifier, fallback_classifier)."""
    fallback = RuleBasedClassifier(GRID_DEFINITIONS)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return fallback, fallback
    
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    try:
        gemini = GeminiClassifier(api_key, model, GRID_DEFINITIONS)
        return gemini, fallback
    except Exception:
        return fallback, fallback
