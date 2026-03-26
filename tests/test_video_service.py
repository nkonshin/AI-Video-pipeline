"""Video service tests."""

import pytest

from backend.services.video_service import ProgressTracker


def test_progress_tracker_stages():
    tracker = ProgressTracker(total_scenes=4)
    assert tracker.percent == 0

    tracker.update("image_gen", scene=1)
    assert tracker.stage == "image_gen"
    assert tracker.scene == 1
    assert 0 < tracker.percent < 100

    tracker.update("image_gen", scene=4)

    tracker.update("video_gen", scene=1)
    assert tracker.stage == "video_gen"

    tracker.update("completed", scene=0)
    assert tracker.percent == 100


def test_progress_tracker_to_dict():
    tracker = ProgressTracker(total_scenes=2, job_id="test-123")
    tracker.update("tts", scene=1, message="Generating voice...")
    d = tracker.to_dict()
    assert d["job_id"] == "test-123"
    assert d["stage"] == "tts"
    assert d["stage_label"] == "TTS Voiceover"
    assert d["scene"] == 1
    assert d["total_scenes"] == 2
    assert d["message"] == "Generating voice..."


def test_progress_tracker_stage_labels():
    tracker = ProgressTracker(total_scenes=1)
    labels = {
        "image_gen": "Image Generation",
        "video_gen": "Video Generation",
        "tts": "TTS Voiceover",
        "subtitle": "Subtitles",
        "assembly": "Assembly",
        "publish": "Publishing",
        "completed": "Completed",
    }
    for stage, label in labels.items():
        tracker.update(stage)
        assert tracker.to_dict()["stage_label"] == label
