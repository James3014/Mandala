"""Public service surface that mirrors the API contract from the spec."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict

from .classifier import build_classifier
from .config import GRID_DEFINITIONS
from .integrator import GridIntegrator
from .mandala_blueprint import get_mandala
from .models import Segment


class LinusService:
    def __init__(self):
        self._classifier = build_classifier()
        self._integrator = GridIntegrator(GRID_DEFINITIONS)

    def post_segments(self, payload: Dict) -> Dict:
        segments = payload.get("segments", [])
        results = []
        for item in segments:
            segment = self._build_segment(item)
            assignments = self._classifier.classify(segment.text)
            segment.assignments = assignments
            outcome = self._integrator.process(segment, assignments)
            result_payload = {
                "segment_id": segment.id,
                "grid_assignments": [
                    {
                        "grid_id": assignment.grid_id,
                        "confidence": assignment.confidence,
                        "secondary": assignment.secondary,
                        "related_keywords": assignment.related_keywords,
                    }
                    for assignment in assignments
                ],
                "snippet": segment.text.replace("\n", " ")[:80],
            }
            result_payload.update(outcome)
            results.append(result_payload)
        return {"results": results}

    def get_grid(self, grid_id: int) -> Dict:
        cell = self._integrator.cells.get(grid_id)
        if not cell:
            raise KeyError(f"Unknown grid_id {grid_id}")
        payload = cell.to_dict()
        mandala = get_mandala(grid_id)
        if mandala:
            payload["mandala"] = mandala
        return payload

    def get_segment_log(self, segment_id: str) -> Dict:
        logs = self._integrator.logs.get(segment_id, [])
        return {
            "segment_id": segment_id,
            "history": [log.to_dict() for log in logs],
        }

    def get_all_grids(self) -> Dict:
        grids = []
        for grid_id in sorted(self._integrator.cells.keys()):
            payload = self.get_grid(grid_id)
            grids.append(payload)
        return {"grids": grids}

    @staticmethod
    def _build_segment(item: Dict) -> Segment:
        segment_id = item.get("segment_id") or f"seg-{uuid.uuid4().hex[:8]}"
        timestamp_str = item.get("timestamp")
        timestamp = datetime.now(timezone.utc)
        if timestamp_str:
            normalized = timestamp_str.replace("Z", "+00:00")
            try:
                timestamp = datetime.fromisoformat(normalized)
            except ValueError:
                timestamp = datetime.now(timezone.utc)
        return Segment(
            id=segment_id,
            source=item.get("source", "unknown"),
            text=item.get("text", ""),
            timestamp=timestamp,
            assignments=[],
        )
