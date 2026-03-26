"""WebSocket tests."""

from backend.services.video_service import ProgressTracker, active_jobs
from starlette.testclient import TestClient

from backend.main import app


def test_websocket_receives_progress():
    tracker = ProgressTracker(total_scenes=4, job_id="test-job-1")
    tracker.update("video_gen", scene=2, message="Generating video...")
    active_jobs["test-job-1"] = tracker

    client = TestClient(app)
    with client.websocket_connect("/ws/pipeline/test-job-1") as ws:
        data = ws.receive_json()
        assert data["job_id"] == "test-job-1"
        assert data["stage"] == "video_gen"
        assert data["scene"] == 2

    active_jobs.pop("test-job-1", None)


def test_websocket_unknown_job():
    client = TestClient(app)
    with client.websocket_connect("/ws/pipeline/nonexistent") as ws:
        data = ws.receive_json()
        assert data["stage"] == "unknown"
