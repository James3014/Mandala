from linus_app import LinusService


def test_post_segments_classifies_and_updates_grid():
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


def test_duplicate_segments_merge_instead_of_duplication():
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


def test_low_confidence_segments_are_flagged_for_review():
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


def test_summary_stays_within_three_and_five_bullets():
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


def test_segment_logs_are_traceable():
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
