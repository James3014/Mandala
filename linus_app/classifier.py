"""Rule-based classifier that mimics the nine-grid prompts."""

from __future__ import annotations

import re
from typing import Dict, List, Tuple

from .config import GRID_DEFINITIONS, GridDefinition
from .models import GridAssignment


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", text.lower())


class SegmentClassifier:
    """Very small footprint classifier derived from the prompt table."""

    def __init__(self, grid_definitions: Dict[int, GridDefinition] | None = None):
        self._definitions = grid_definitions or GRID_DEFINITIONS
        self._keyword_map: Dict[int, List[str]] = {
            grid_id: [kw.lower() for kw in definition.keywords]
            for grid_id, definition in self._definitions.items()
        }

    def classify(self, text: str) -> List[GridAssignment]:
        normalized = _normalize_text(text)
        scored = self._score_grids(normalized)
        if not scored:
            return []

        best: Tuple[int, float, List[str]] = scored[0]
        assignments: List[GridAssignment] = []
        for index, (grid_id, score, keywords) in enumerate(scored):
            confidence = self._confidence(score, bool(keywords))
            if confidence < 0.4:
                continue
            assignments.append(
                GridAssignment(
                    grid_id=grid_id,
                    confidence=confidence,
                    secondary=index > 0,
                    related_keywords=keywords,
                )
            )

        if not assignments:
            assignments.append(
                GridAssignment(
                    grid_id=5,
                    confidence=0.5,
                    secondary=False,
                    related_keywords=[],
                )
            )

        return assignments

    def _score_grids(self, normalized_text: str) -> List[Tuple[int, float, List[str]]]:
        scored: List[Tuple[int, float, List[str]]] = []
        for grid_id, keywords in self._keyword_map.items():
            matched = [kw for kw in keywords if kw and kw in normalized_text]
            score = float(len(matched))
            scored.append((grid_id, score, matched))

        scored.sort(key=lambda item: item[1], reverse=True)
        best_score = scored[0][1]
        # filter out grids without evidence unless everything is zero.
        if best_score == 0:
            return [(5, 0.1, [])]

        filtered: List[Tuple[int, float, List[str]]] = []
        for grid_id, score, matched in scored:
            if score == 0:
                continue
            filtered.append((grid_id, score, matched))
        return filtered

    @staticmethod
    def _confidence(score: float, has_keywords: bool) -> float:
        base = 0.45 if not has_keywords else 0.55
        boost = min(0.4, score * 0.18)
        return round(min(0.95, base + boost), 2)
