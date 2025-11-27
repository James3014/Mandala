"""JSON persistence for grid state."""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .models import GridCell, GridEntry, InsightLogEntry


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return datetime.utcnow()


def _entry_from_dict(data: dict) -> GridEntry:
    return GridEntry(
        segment_id=data["segment_id"],
        source=data.get("source", ""),
        snippet=data.get("snippet", ""),
        status=data.get("status", "new_entry"),
        related_grids=data.get("related_grids", []),
        confidence=data.get("confidence", 0.0),
        created_at=_parse_dt(data.get("created_at")),
    )


def _entry_to_dict(entry: GridEntry) -> dict:
    return {
        "segment_id": entry.segment_id,
        "source": entry.source,
        "snippet": entry.snippet,
        "status": entry.status,
        "related_grids": entry.related_grids,
        "confidence": entry.confidence,
        "created_at": entry.created_at.isoformat(),
    }


def _log_from_dict(segment_id: str, data: dict) -> InsightLogEntry:
    return InsightLogEntry(
        segment_id=segment_id,
        grid_id=data["grid_id"],
        action=data["action"],
        similarity=data.get("similarity", 0.0),
        comment=data.get("comment", ""),
        created_at=_parse_dt(data.get("created_at")),
    )


def _log_to_dict(log: InsightLogEntry) -> dict:
    return {
        "grid_id": log.grid_id,
        "action": log.action,
        "similarity": log.similarity,
        "comment": log.comment,
        "created_at": log.created_at.isoformat(),
    }


class PersistentStore:
    def __init__(self, path: Path, debounce_seconds: Optional[float] = None):
        self._path = path
        self._state = self._load()
        self._lock = threading.Lock()
        self._pending: Optional[dict] = None
        self._timer: Optional[threading.Timer] = None
        default_debounce = float(os.getenv("LINUS_SAVE_DEBOUNCE", "0.5"))
        self._debounce_seconds = debounce_seconds if debounce_seconds is not None else default_debounce

    def _load(self) -> dict:
        if not self._path.exists():
            return {"cells": {}, "logs": {}}
        try:
            with self._path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            return {"cells": {}, "logs": {}}

    def hydrate(self, cells: Dict[int, GridCell], logs: Dict[str, List[InsightLogEntry]]) -> None:
        for grid_id_str, payload in self._state.get("cells", {}).items():
            grid_id = int(grid_id_str)
            cell = cells.get(grid_id)
            if not cell:
                continue
            cell.summary = payload.get("summary", cell.summary)
            cell.entries = [_entry_from_dict(item) for item in payload.get("entries", [])]
            cell.needs_review = [_entry_from_dict(item) for item in payload.get("needs_review", [])]

        for segment_id, entries in self._state.get("logs", {}).items():
            logs[segment_id] = [_log_from_dict(segment_id, item) for item in entries]

    def _serialize(self, cells: Dict[int, GridCell], logs: Dict[str, List[InsightLogEntry]]) -> dict:
        return {
            "cells": {
                str(grid_id): {
                    "summary": cell.summary,
                    "entries": [_entry_to_dict(entry) for entry in cell.entries],
                    "needs_review": [_entry_to_dict(entry) for entry in cell.needs_review],
                }
                for grid_id, cell in cells.items()
            },
            "logs": {
                segment_id: [_log_to_dict(log) for log in entries]
                for segment_id, entries in logs.items()
            },
        }

    def save_now(self, cells: Dict[int, GridCell], logs: Dict[str, List[InsightLogEntry]]) -> None:
        state = self._serialize(cells, logs)
        self._write_state(state)

    def schedule_save(self, cells: Dict[int, GridCell], logs: Dict[str, List[InsightLogEntry]]) -> None:
        if self._debounce_seconds <= 0:
            self.save_now(cells, logs)
            return
        with self._lock:
            self._pending = self._serialize(cells, logs)
            if self._timer and self._timer.is_alive():
                return
            self._timer = threading.Timer(self._debounce_seconds, self._flush_pending)
            self._timer.daemon = True
            self._timer.start()

    def _flush_pending(self) -> None:
        with self._lock:
            state = self._pending
            self._pending = None
            self._timer = None
        if state:
            self._write_state(state)

    def _write_state(self, state: dict) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("w", encoding="utf-8") as fh:
            json.dump(state, fh, ensure_ascii=False, indent=2)

    def snapshot(self, cells: Dict[int, GridCell], logs: Dict[str, List[InsightLogEntry]]) -> dict:
        return self._serialize(cells, logs)
