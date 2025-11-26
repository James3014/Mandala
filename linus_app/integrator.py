"""Integrator that decides how segments update each grid cell."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from .config import GRID_DEFINITIONS, GridDefinition
from .models import GridAssignment, GridCell, GridEntry, InsightLogEntry, Segment
from .summary import SummaryBuilder


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text.lower())


class GridIntegrator:
    def __init__(
        self,
        grid_definitions: Dict[int, GridDefinition] | None = None,
    ):
        self._definitions = grid_definitions or GRID_DEFINITIONS
        self._summary_builder = SummaryBuilder(self._definitions)
        self.cells: Dict[int, GridCell] = {
            grid_id: GridCell(definition=definition, summary=list(definition.fallback_summary))
            for grid_id, definition in self._definitions.items()
        }
        self._keyword_pool: Set[str] = {
            kw.lower() for definition in self._definitions.values() for kw in definition.keywords if kw
        }
        self._grid_keywords: Dict[int, Set[str]] = {
            grid_id: {kw.lower() for kw in definition.keywords if kw}
            for grid_id, definition in self._definitions.items()
        }
        self._logs: Dict[str, List[InsightLogEntry]] = defaultdict(list)

    def process(self, segment: Segment, assignments: List[GridAssignment]) -> dict:
        if not assignments:
            return {}
        primary = next((assign for assign in assignments if not assign.secondary), assignments[0])
        related = [assign.grid_id for assign in assignments if assign.secondary]
        cell = self.cells[primary.grid_id]
        now = datetime.now(timezone.utc)

        snippet = segment.text.strip().replace("\n", " ")
        snippet = snippet[:120] if len(snippet) > 120 else snippet

        if primary.confidence < 0.6:
            entry = self._build_entry(segment, primary, snippet, "needs_review", related, now)
            cell.needs_review.append(entry)
            self._log(segment.id, primary.grid_id, "marked_review", 0.0, "low_confidence")
            return self._outcome(primary, "needs_review", related, "低置信度，需人工確認")

        similarity = self._max_similarity(segment.text, cell)
        if similarity >= 0.85:
            self._log(segment.id, primary.grid_id, "merged", similarity, "similarity>=0.85")
            return self._outcome(primary, "merged", related, "與既有摘要相似，維持原條目")

        if similarity >= 0.7:
            entry = self._build_entry(segment, primary, snippet, "needs_review", related, now)
            cell.needs_review.append(entry)
            self._log(segment.id, primary.grid_id, "marked_review", similarity, "similarity_in_gray_zone")
            return self._outcome(primary, "needs_review", related, "相似度介於 0.7~0.85，需人工決定")

        entry = self._build_entry(segment, primary, snippet, "new_entry", related, now)
        cell.entries.append(entry)
        self._summary_builder.refresh(cell, latest_entry=entry)
        self._log(segment.id, primary.grid_id, "inserted", similarity, "new_entry_appended")
        return self._outcome(primary, "new_entry", related, "新增 insight 已寫入摘要")

    def _build_entry(
        self,
        segment: Segment,
        assignment: GridAssignment,
        snippet: str,
        status: str,
        related_grids: List[int],
        created_at: datetime,
    ) -> GridEntry:
        return GridEntry(
            segment_id=segment.id,
            source=segment.source,
            snippet=snippet,
            status=status,
            related_grids=related_grids,
            confidence=assignment.confidence,
            created_at=created_at,
        )

    def _outcome(
        self, assignment: GridAssignment, status: str, related: List[int], notes: str
    ) -> dict:
        return {
            "grid_id": assignment.grid_id,
            "confidence": assignment.confidence,
            "status": status,
            "related_grids": related,
            "summary_notes": notes,
        }

    def _max_similarity(self, text: str, cell: GridCell) -> float:
        if not cell.entries:
            return 0.0
        tokens = self._extract_tokens(text, cell.definition.grid_id)
        if not tokens:
            return 0.0
        similarities = [
            self._overlap(tokens, self._extract_tokens(entry.snippet or "", cell.definition.grid_id))
            for entry in cell.entries
        ]
        return max(similarities) if similarities else 0.0

    def _extract_tokens(self, text: str, grid_id: Optional[int] = None) -> Set[str]:
        normalized = _normalize(text)
        keyword_source = self._grid_keywords.get(grid_id) if grid_id else self._keyword_pool
        return {kw for kw in (keyword_source or set()) if kw in normalized}

    @staticmethod
    def _overlap(tokens_a: Set[str], tokens_b: Set[str]) -> float:
        if not tokens_a and not tokens_b:
            return 1.0
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = len(tokens_a & tokens_b)
        denominator = min(len(tokens_a), len(tokens_b)) or 1
        return intersection / denominator

    def _log(self, segment_id: str, grid_id: int, action: str, similarity: float, comment: str) -> None:
        entry = InsightLogEntry(
            segment_id=segment_id,
            grid_id=grid_id,
            action=action,
            similarity=round(similarity, 2),
            comment=comment,
            created_at=datetime.now(timezone.utc),
        )
        self._logs[segment_id].append(entry)

    @property
    def logs(self) -> Dict[str, List[InsightLogEntry]]:
        return self._logs
