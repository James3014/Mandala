"""Classifiers for mapping segments into nine-grid cells."""

from __future__ import annotations

import json
import os
import re
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple

from urllib import request, parse, error

from .config import GRID_DEFINITIONS, GridDefinition
from .models import GridAssignment


class ClassificationError(Exception):
    """Raised when an upstream classifier fails."""


class BaseClassifier(ABC):
    @abstractmethod
    def classify(self, text: str) -> List[GridAssignment]:
        ...


class RuleBasedClassifier(BaseClassifier):
    """Keyword matcher derived from prompt table (fallback when Gemini not available)."""

    def __init__(self, grid_definitions: Dict[int, GridDefinition] | None = None):
        self._definitions = grid_definitions or GRID_DEFINITIONS
        self._keyword_map: Dict[int, List[str]] = {
            grid_id: [kw.lower() for kw in definition.keywords]
            for grid_id, definition in self._definitions.items()
        }

    def classify(self, text: str) -> List[GridAssignment]:
        normalized = re.sub(r"\s+", "", text.lower())
        scored = self._score_grids(normalized)
        if not scored:
            return []
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
        if best_score == 0:
            return [(5, 0.1, [])]
        return [(grid_id, score, matched) for grid_id, score, matched in scored if score]

    @staticmethod
    def _confidence(score: float, has_keywords: bool) -> float:
        base = 0.45 if not has_keywords else 0.55
        boost = min(0.4, score * 0.18)
        return round(min(0.95, base + boost), 2)


class GeminiClassifier(BaseClassifier):
    """Calls Gemini model with structured prompt to classify segments."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model
        self._prompt = self._build_prompt()

    def _build_prompt(self) -> str:
        bullets = []
        for grid_id, definition in GRID_DEFINITIONS.items():
            keywords = ", ".join(definition.keywords)
            bullets.append(
                f"{grid_id}. {definition.title} - Persona: {definition.persona} - Keywords: {keywords}"
            )
        return (
            "You are a classification engine for a ski education platform.\n"
            "Given a paragraph, assign the primary grid (1-9) and optionally a secondary grid.\n"
            "Rules:\n"
            "- Always respond with JSON: "
            '{"primary":{"grid":number,"confidence":0-1,"notes":string},'
            '"secondary":[{"grid":number,"confidence":0-1}],"related_keywords":[string]} \n'
            "- Confidence above 0.8 if you are sure.\n"
            "- If unsure, pick the grid that best matches WHY/WHO/WHAT below and set confidence <=0.6.\n"
            "Grid cheat sheet:\n"
            + "\n".join(bullets)
        )

    def classify(self, text: str) -> List[GridAssignment]:
        if not text.strip():
            return []
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": self._prompt},
                        {"text": f"Paragraph: {text.strip()}"},
                    ]
                }
            ],
            "safetySettings": [],
            "generationConfig": {"temperature": 0.1, "topP": 0.9, "topK": 32},
        }
        params = {"key": self._api_key}
        data_bytes = json.dumps(payload).encode("utf-8")
        url = f"{self.BASE_URL.format(model=self._model)}?{parse.urlencode(params)}"
        req = request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        try:
            with request.urlopen(req, timeout=20) as resp:
                data = json.load(resp)
        except Exception as exc:  # pragma: no cover
            raise ClassificationError(str(exc)) from exc

        try:
            text_response = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text_response)
        except Exception as exc:  # pragma: no cover
            raise ClassificationError(f"Gemini response parsing error: {exc}") from exc

        assignments: List[GridAssignment] = []
        primary = parsed.get("primary") or {}
        grid_id = int(primary.get("grid", 5))
        confidence = float(primary.get("confidence", 0.5))
        assignments.append(
            GridAssignment(
                grid_id=grid_id,
                confidence=round(confidence, 2),
                secondary=False,
                related_keywords=parsed.get("related_keywords") or [],
            )
        )

        for secondary in parsed.get("secondary") or []:
            try:
                assignments.append(
                    GridAssignment(
                        grid_id=int(secondary["grid"]),
                        confidence=round(float(secondary.get("confidence", 0.5)), 2),
                        secondary=True,
                        related_keywords=[],
                    )
                )
            except (KeyError, ValueError, TypeError):
                continue

        return assignments
