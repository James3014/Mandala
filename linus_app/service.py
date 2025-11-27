"""Public service surface that mirrors the API contract from the spec."""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from .classifier import ClassificationError, build_classifier
from .config import GRID_DEFINITIONS
from .integrator import GridIntegrator
from .mandala_blueprint import get_mandala
from .models import GridAssignment, Segment
from .storage import PersistentStore


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
                "classifier": classifier_used,
            }
            if classifier_error:
                result_payload["error"] = classifier_error
            result_payload.update(self._augment_outcome(outcome, classifier_error))
            results.append(result_payload)
        self._store.schedule_save(self._integrator.cells, self._integrator.logs)
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

    @staticmethod
    def _augment_outcome(outcome: dict, classifier_error: str | None) -> dict:
        if classifier_error:
            note = outcome.get("summary_notes", "") or ""
            prefix = f"(Gemini fallback: {classifier_error}) "
            outcome["summary_notes"] = prefix + note
        return outcome
