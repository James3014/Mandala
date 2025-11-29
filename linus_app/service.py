"""Public service surface that mirrors the API contract from the spec."""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from .classifier import ClassificationError
from .classifier_factory import build_classifier
from .config import GRID_DEFINITIONS
from .integrator import GridIntegrator
from .mandala_blueprint import get_mandala
from .models import GridAssignment, Segment
from .storage import PersistentStore
from .views import (
    format_segment_result,
    format_grid_response,
    format_segment_log,
    format_all_grids,
)


class LinusService:
    def __init__(self):
        self._classifier, self._fallback_classifier = build_classifier()
        self._using_gemini = self._classifier is not self._fallback_classifier
        self._integrator = GridIntegrator(GRID_DEFINITIONS)
        state_path = Path(os.getenv("LINUS_STATE_PATH", "data/linus_state.json"))
        debounce = float(os.getenv("LINUS_SAVE_DEBOUNCE", "0.5"))
        self._store = PersistentStore(state_path, debounce_seconds=debounce)
        self._store.hydrate(self._integrator.cells, self._integrator.logs)

    def post_segments(self, payload: Dict) -> Dict:
        segments = payload.get("segments", [])
        results = []
        for item in segments:
            segment = self._build_segment(item)
            assignments, classifier_used, classifier_error = self._classify_segment(segment)
            segment.assignments = assignments
            outcome = self._integrator.process(segment, assignments)
            result_payload = format_segment_result(segment, classifier_used, classifier_error, outcome)
            results.append(result_payload)
        self._store.schedule_save(self._integrator.cells, self._integrator.logs)
        return {"results": results}

    def get_grid(self, grid_id: int) -> Dict:
        cell = self._integrator.cells.get(grid_id)
        if not cell:
            raise KeyError(f"Unknown grid_id {grid_id}")
        return format_grid_response(cell, grid_id)

    def get_segment_log(self, segment_id: str) -> Dict:
        logs = self._integrator.logs.get(segment_id, [])
        return format_segment_log(segment_id, logs)

    def get_all_grids(self) -> Dict:
        grids = []
        for grid_id in sorted(self._integrator.cells.keys()):
            payload = self.get_grid(grid_id)
            grids.append(payload)
        return format_all_grids(grids)

    def export_state(self) -> Dict:
        return self._store.snapshot(self._integrator.cells, self._integrator.logs)

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

    def _classify_segment(self, segment: Segment) -> tuple[List[GridAssignment], str, str | None]:
        classifier_name = "rule_based"
        error_reason = None
        try:
            assignments = self._classifier.classify(segment.text)
            classifier_name = "gemini" if self._using_gemini else "rule_based"
        except ClassificationError as exc:
            error_reason = str(exc)
            print(f"[Classifier] Gemini failed for segment {segment.id}: {error_reason}", file=sys.stderr)
            assignments = self._fallback_classifier.classify(segment.text)
            classifier_name = "rule_based_fallback"
        return assignments, classifier_name, error_reason

    # _augment_outcome moved to views.py
