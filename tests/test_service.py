import os
from unittest import mock

import json
import os
from pathlib import Path
from unittest import mock

import pytest

from linus_app import LinusService


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    state_path = tmp_path / "linus_state.json"
    monkeypatch.setenv("LINUS_STATE_PATH", str(state_path))
    yield


def test_post_segments_classifies_and_updates_grid(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    payload = {
        "segments": [
            {
                "segment_id": "seg-agr",
                "source": "meeting-2024-09-20",
                "text": "合約 SOW 條款需要立即補進合作文件中。",
            }
        ]
    }

    response = service.post_segments(payload)
    result = response["results"][0]

    assignment = next(
        item for item in result["grid_assignments"] if item["grid_id"] == 3
    )
    assert assignment["confidence"] >= 0.8
    assert result["status"] == "new_entry"

    grid = service.get_grid(3)
    assert any(entry["segment_id"] == "seg-agr" for entry in grid["entries"])
    assert 3 <= len(grid["summary"]) <= 5


def test_duplicate_segments_merge_instead_of_duplication(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    base = {
        "source": "meeting-2024-09-20",
        "text": "合約 SOW 條款需要立即補進合作文件中。",
    }
    service.post_segments({"segments": [dict(segment_id="seg-agr", **base)]})

    response = service.post_segments(
        {
            "segments": [
                {
                    "segment_id": "seg-merge",
                    "source": "meeting-2024-09-20",
                    "text": "合約 SOW 條款必須加上，不然付款流程會被卡住。",
                }
            ]
        }
    )
    result = response["results"][0]
    assert result["status"] == "merged"

    grid = service.get_grid(3)
    assert len(grid["entries"]) == 1

    log = service.get_segment_log("seg-merge")
    assert log["history"][0]["action"] == "merged"


def test_low_confidence_segments_are_flagged_for_review(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    response = service.post_segments(
        {
            "segments": [
                {
                    "segment_id": "seg-review",
                    "source": "meeting",
                    "text": "需要再想想，暫時沒有具體分類。",
                }
            ]
        }
    )

    result = response["results"][0]
    assert result["status"] == "needs_review"

    grid = service.get_grid(result["grid_id"])
    assert any(item["segment_id"] == "seg-review" for item in grid["needs_review"])


def test_summary_stays_within_three_and_five_bullets(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    service.post_segments(
        {
            "segments": [
                {
                    "segment_id": "seg-pay",
                    "source": "ops",
                    "text": "付款系統應透明，所有附件 A 狀態都要顯示在介面上。",
                }
            ]
        }
    )
    grid = service.get_grid(8)
    assert 3 <= len(grid["summary"]) <= 5


def test_segment_logs_are_traceable(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    service.post_segments(
        {
            "segments": [
                {
                    "segment_id": "seg-agr",
                    "source": "meeting",
                    "text": "SOW 條款需要補上。",
                }
            ]
        }
    )
    log = service.get_segment_log("seg-agr")
    assert log["segment_id"] == "seg-agr"
    assert log["history"][0]["action"] == "inserted"


def test_gemini_classifier_bridge_parses_response(monkeypatch):
    fake_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "primary": {"grid": 7, "confidence": 0.9},
                                    "secondary": [{"grid": 3, "confidence": 0.65}],
                                    "related_keywords": ["行銷"],
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps(fake_response).encode("utf-8")

    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    with mock.patch("linus_app.classifier.request.urlopen", return_value=DummyResponse()):
        service = LinusService()
        payload = {
            "segments": [
                {
                    "segment_id": "seg-mkt",
                    "source": "meeting",
                    "text": "品牌啟動會議鎖定冬季檔期。",
                }
            ]
        }
        response = service.post_segments(payload)
        result = response["results"][0]
        primary = result["grid_assignments"][0]
        assert primary["grid_id"] == 7
        assert primary["confidence"] == 0.9
        service.post_segments(
            {
                "segments": [
                    {
                        "segment_id": "seg-agr",
                        "source": "meeting",
                        "text": "SOW 條款需要補上。",
                    }
                ]
            }
        )
        log = service.get_segment_log("seg-agr")
        assert log["segment_id"] == "seg-agr"
        assert log["history"][0]["action"] == "inserted"


def test_persistence_roundtrip(tmp_path, monkeypatch):
    state_path = tmp_path / "linus_state.json"
    monkeypatch.setenv("LINUS_STATE_PATH", str(state_path))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LinusService()
    service.post_segments(
        {
            "segments": [
                {
                    "segment_id": "seg-demo",
                    "source": "meeting",
                    "text": "教練申請流程需要自動化審核。",
                }
            ]
        }
    )
    assert state_path.exists()
    service2 = LinusService()
    found = False
    for grid_id in range(1, 10):
        grid = service2.get_grid(grid_id)
        if any(entry["segment_id"] == "seg-demo" for entry in grid["entries"]):
            found = True
            break
    assert found
