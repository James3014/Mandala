"""Summary builder keeps each grid between three and five actionable bullets."""

from __future__ import annotations

from typing import Dict, List, Optional

from .config import GRID_DEFINITIONS, GridDefinition
from .models import GridCell, GridEntry


class SummaryBuilder:
    def __init__(self, grid_definitions: Dict[int, GridDefinition]):
        self._definitions = grid_definitions or GRID_DEFINITIONS

    def refresh(self, cell: GridCell, latest_entry: Optional[GridEntry] = None) -> None:
        bullets: List[str] = []
        if latest_entry:
            bullets.append(self._format_new_entry(latest_entry))

        recent_entries = list(reversed(cell.entries[-3:]))
        for entry in recent_entries:
            bullets.append(self._format_entry(entry))

        defaults = self._definitions[cell.definition.grid_id].fallback_summary
        for default in defaults:
            bullets.append(default)

        deduped: List[str] = []
        seen = set()
        for bullet in bullets:
            compressed = bullet.strip()
            if not compressed or compressed in seen:
                continue
            deduped.append(compressed)
            seen.add(compressed)
            if len(deduped) == 5:
                break

        while len(deduped) < 3 and len(deduped) < len(bullets):
            candidate = bullets[len(deduped)]
            if candidate not in seen:
                deduped.append(candidate)
                seen.add(candidate)
        cell.summary = deduped[:5]

    @staticmethod
    def _format_entry(entry: GridEntry) -> str:
        snippet = entry.snippet
        return f"{entry.source}：{snippet}"

    @staticmethod
    def _format_new_entry(entry: GridEntry) -> str:
        return f"本次新增：{entry.snippet}"
