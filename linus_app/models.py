"""Core dataclasses shared across the Linus service."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List

from .config import GridDefinition


@dataclass
class GridAssignment:
    grid_id: int
    confidence: float
    secondary: bool
    related_keywords: List[str]


@dataclass
class Segment:
    id: str
    source: str
    text: str
    timestamp: datetime
    assignments: List[GridAssignment]
    status: str = "pending"


@dataclass
class GridEntry:
    segment_id: str
    source: str
    snippet: str
    status: str
    related_grids: List[int]
    confidence: float
    created_at: datetime


@dataclass
class GridCell:
    definition: GridDefinition
    summary: List[str] = field(default_factory=list)
    entries: List[GridEntry] = field(default_factory=list)
    needs_review: List[GridEntry] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert into API-friendly structure."""
        return {
            "grid_id": self.definition.grid_id,
            "title": self.definition.title,
            "persona": self.definition.persona,
            "summary": self.summary,
            "entries": [
                {
                    "segment_id": entry.segment_id,
                    "source": entry.source,
                    "snippet": entry.snippet,
                    "status": entry.status,
                    "confidence": round(entry.confidence, 2),
                    "related_grids": entry.related_grids,
                    "created_at": entry.created_at.isoformat(),
                }
                for entry in self.entries
            ],
            "needs_review": [
                {
                    "segment_id": entry.segment_id,
                    "confidence": round(entry.confidence, 2),
                    "snippet": entry.snippet,
                    "created_at": entry.created_at.isoformat(),
                }
                for entry in self.needs_review
            ],
            "related_grids": sorted(
                {grid for entry in self.entries for grid in entry.related_grids}
            ),
        }


@dataclass
class InsightLogEntry:
    segment_id: str
    grid_id: int
    action: str
    similarity: float
    comment: str
    created_at: datetime

    def to_dict(self) -> dict:
        return {
            "grid_id": self.grid_id,
            "action": self.action,
            "similarity": round(self.similarity, 2),
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }
