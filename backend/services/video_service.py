"""Video generation service with progress tracking."""

from __future__ import annotations

import asyncio
from typing import Any, Callable

from pipeline.config import PipelineConfig, load_env
from pipeline.orchestrator import PipelineOrchestrator

STAGE_ORDER = ["image_gen", "video_gen", "tts", "subtitle", "assembly", "publish", "completed"]

STAGE_LABELS = {
    "image_gen": "Image Generation",
    "video_gen": "Video Generation",
    "tts": "TTS Voiceover",
    "subtitle": "Subtitles",
    "assembly": "Assembly",
    "publish": "Publishing",
    "completed": "Completed",
}


class ProgressTracker:
    """Tracks pipeline progress across stages and scenes."""

    def __init__(self, total_scenes: int = 1, job_id: str = ""):
        self.job_id = job_id
        self.total_scenes = total_scenes
        self.stage = "pending"
        self.scene = 0
        self.message = ""
        self.cost_so_far = 0.0

    @property
    def percent(self) -> int:
        if self.stage == "completed":
            return 100
        if self.stage not in STAGE_ORDER:
            return 0
        stage_idx = STAGE_ORDER.index(self.stage)
        total_stages = len(STAGE_ORDER) - 1
        if self.total_scenes > 0 and self.scene > 0:
            scene_frac = self.scene / self.total_scenes
        else:
            scene_frac = 0.5
        return int(((stage_idx + scene_frac) / total_stages) * 100)

    def update(self, stage: str, scene: int = 0, message: str = "", cost: float = 0.0):
        self.stage = stage
        self.scene = scene
        if message:
            self.message = message
        if cost > 0:
            self.cost_so_far = cost

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "stage": self.stage,
            "stage_label": STAGE_LABELS.get(self.stage, self.stage),
            "scene": self.scene,
            "total_scenes": self.total_scenes,
            "percent": self.percent,
            "message": self.message,
            "cost_so_far": self.cost_so_far,
        }


# Active job trackers: job_id -> ProgressTracker
active_jobs: dict[str, ProgressTracker] = {}


async def run_pipeline_with_progress(
    job_id: str,
    config_dict: dict[str, Any],
    on_progress: Callable[[dict], Any] | None = None,
    skip_publish: bool = False,
    skip_images: bool = False,
    skip_video: bool = False,
) -> dict[str, Any]:
    config = PipelineConfig.model_validate(config_dict)
    total_scenes = len(config.scenario.scenes)
    tracker = ProgressTracker(total_scenes=total_scenes, job_id=job_id)
    active_jobs[job_id] = tracker

    def sync_run() -> dict[str, Any]:
        env = load_env()
        orchestrator = PipelineOrchestrator(config, env)
        result = orchestrator.run(
            skip_publish=skip_publish,
            skip_images=skip_images,
            skip_video=skip_video,
        )
        return result

    try:
        tracker.update("image_gen", scene=1, message="Starting image generation...")
        if on_progress:
            await on_progress(tracker.to_dict())

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, sync_run)

        tracker.update("completed", message="Pipeline completed!")
        if on_progress:
            await on_progress(tracker.to_dict())

        return result
    except Exception as e:
        tracker.update("failed", message=str(e))
        if on_progress:
            await on_progress(tracker.to_dict())
        raise
    finally:
        active_jobs.pop(job_id, None)
