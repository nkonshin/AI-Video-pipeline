"""Main pipeline orchestrator — runs the full video production pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pipeline.config import (
    PipelineConfig,
    EnvSettings,
    ensure_output_dirs,
    load_env,
    load_pipeline_config,
)
from pipeline.generators.replicate_client import ReplicateClient
from pipeline.generators.image_gen import ImageGenerator
from pipeline.generators.video_gen import VideoGenerator
from pipeline.generators.tts_gen import TTSGenerator
from pipeline.generators.subtitle_gen import SubtitleGenerator
from pipeline.assembler.video_assembler import VideoAssembler
from pipeline.publishers.publish_manager import PublishManager
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class PipelineOrchestrator:
    """Orchestrates the full video pipeline from scenario to published video.

    Stages:
    1. Generate images for each scene
    2. Generate video clips from images
    3. Generate voiceover audio
    4. Generate subtitles
    5. Assemble final video
    6. Publish to platforms
    """

    def __init__(self, config: PipelineConfig, env: EnvSettings | None = None):
        self.config = config
        self.env = env or load_env()
        self.output_dirs = ensure_output_dirs(config.output_dir)

        # Create run-specific subdirectory
        scenario = config.scenario
        run_name = (
            f"{scenario.series_name}_{scenario.episode_number:03d}"
            .replace(" ", "_").lower()
        )
        self.run_dir = Path(config.output_dir) / "runs" / run_name
        self.run_dirs = ensure_output_dirs(self.run_dir)

    def run(
        self,
        skip_images: bool = False,
        skip_video: bool = False,
        skip_tts: bool = False,
        skip_assembly: bool = False,
        skip_publish: bool = False,
        images_dir: Path | None = None,
        videos_dir: Path | None = None,
        audio_dir: Path | None = None,
    ) -> dict[str, Any]:
        """Execute the full pipeline.

        Each stage can be skipped, and pre-generated assets can be provided.

        Returns a dict with paths and results for each stage.
        """
        result: dict[str, Any] = {
            "scenario": self.config.scenario.title,
            "series": self.config.scenario.series_name,
            "episode": self.config.scenario.episode_number,
        }

        scenes = self.config.scenario.scenes
        if not scenes:
            raise ValueError("No scenes defined in the scenario")

        log.info(
            f"[Pipeline] Starting: {self.config.scenario.series_name} "
            f"ep.{self.config.scenario.episode_number} — "
            f"'{self.config.scenario.title}' ({len(scenes)} scenes)"
        )

        # --- Stage 1: Image Generation ---
        image_paths: dict[str, Path] = {}
        if not skip_images:
            log.info("[Pipeline] === Stage 1: Image Generation ===")
            with ReplicateClient(
                api_token=self.env.replicate_api_token,
                budget_limit=50.0,
            ) as client:
                img_gen = ImageGenerator(client, self.config.image_model)
                image_paths = img_gen.generate_all(
                    scenes,
                    self.run_dirs["images"],
                    style_prompt=self.config.scenario.style_prompt,
                    negative_prompt=self.config.scenario.negative_prompt,
                    character_descriptions=self.config.scenario.character_descriptions,
                )
                result["budget_after_images"] = client.budget_remaining
        else:
            # Load existing images from run dir or provided dir
            src = images_dir or self.run_dirs["images"]
            image_paths = _load_existing(src, scenes, ["png", "jpg", "webp"])
            log.info(f"[Pipeline] === Stage 1: Image Generation === SKIPPED (loaded {len(image_paths)} existing)")
        result["images"] = {k: str(v) for k, v in image_paths.items()}

        # --- Stage 2: Video Generation ---
        video_paths: dict[str, Path] = {}
        if not skip_video and image_paths:
            log.info("[Pipeline] === Stage 2: Video Generation ===")
            with ReplicateClient(
                api_token=self.env.replicate_api_token,
                budget_limit=50.0,
            ) as client:
                vid_gen = VideoGenerator(client, self.config.video_model)
                video_paths = vid_gen.generate_all(
                    scenes, image_paths, self.run_dirs["videos"]
                )
                result["budget_after_video"] = client.budget_remaining
        else:
            # Load existing videos from run dir or provided dir
            src = videos_dir or self.run_dirs["videos"]
            video_paths = _load_existing(src, scenes, ["mp4", "webm"])
            log.info(f"[Pipeline] === Stage 2: Video Generation === SKIPPED (loaded {len(video_paths)} existing)")
        result["videos"] = {k: str(v) for k, v in video_paths.items()}

        # --- Stage 3: TTS Voiceover ---
        # Some video models generate their own audio (e.g. xai/grok-imagine-video).
        # In that case, skip TTS and let the assembler use the video's built-in audio.
        video_has_audio = _video_model_has_audio(self.config.video_model.model_id)
        audio_paths: dict[str, Path] = {}
        if video_has_audio:
            log.info(
                "[Pipeline] === Stage 3: TTS Voiceover === SKIPPED "
                f"(video model '{self.config.video_model.model_id}' generates its own audio)"
            )
            result["video_has_audio"] = True
        elif not skip_tts:
            log.info("[Pipeline] === Stage 3: TTS Voiceover ===")
            tts_client = None
            if self.config.tts.engine == "replicate":
                tts_client = ReplicateClient(
                    api_token=self.env.replicate_api_token,
                    budget_limit=50.0,
                )
            tts_gen = TTSGenerator(self.config.tts, replicate_client=tts_client)
            audio_paths = tts_gen.generate_all(scenes, self.run_dirs["audio"])
            if tts_client:
                tts_client.close()
        elif audio_dir:
            audio_paths = _load_existing(audio_dir, scenes, ["mp3", "wav", "ogg"])
        result["audio"] = {k: str(v) for k, v in audio_paths.items()}

        # --- Stage 4: Subtitles ---
        srt_path = self.run_dir / "subtitles.srt"
        if self.config.subtitles.enabled:
            log.info("[Pipeline] === Stage 4: Subtitles ===")
            sub_gen = SubtitleGenerator(self.config.subtitles)
            srt_path = sub_gen.generate_srt(scenes, audio_paths, srt_path)
        result["subtitles"] = str(srt_path)

        # --- Stage 5: Video Assembly ---
        final_video: Path | None = None
        if not skip_assembly and video_paths:
            log.info("[Pipeline] === Stage 5: Video Assembly ===")
            assembler = VideoAssembler(self.config)
            final_video = assembler.assemble(
                scenes, video_paths, audio_paths,
                srt_path=srt_path if self.config.subtitles.enabled else None,
            )
            result["final_video"] = str(final_video)
            log.info(f"[Pipeline] Final video: {final_video}")

        # --- Stage 6: Publish ---
        if not skip_publish and final_video and self.config.publish_targets:
            log.info("[Pipeline] === Stage 6: Publishing ===")
            pub_manager = PublishManager(self.config.publish_targets, self.env)

            # Use first scene image as thumbnail
            thumbnail = next(iter(image_paths.values()), None)

            pub_results = pub_manager.publish_all(
                video_path=final_video,
                title=self.config.scenario.title,
                description=(
                    f"{self.config.scenario.series_name} | "
                    f"Серия {self.config.scenario.episode_number}"
                ),
                thumbnail_path=thumbnail,
            )
            result["publish"] = {
                k: str(v) for k, v in pub_results.items()
            }

        log.info("[Pipeline] === Done! ===")
        return result


def _load_existing(
    directory: Path, scenes: list, extensions: list[str]
) -> dict[str, Path]:
    """Load existing files matching scene IDs from a directory."""
    result: dict[str, Path] = {}
    directory = Path(directory)
    for scene in scenes:
        for ext in extensions:
            p = directory / f"{scene.scene_id}.{ext}"
            if p.exists():
                result[scene.scene_id] = p
                break
    return result


# Video models that generate their own audio track
_MODELS_WITH_AUDIO = {
    "xai/grok-imagine-video",
}


def _video_model_has_audio(model_id: str) -> bool:
    """Check if a video model generates audio in its output."""
    return any(m in model_id for m in _MODELS_WITH_AUDIO)
