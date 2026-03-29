"""Video generation — converts static images to short video clips via Replicate."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from pipeline.config import VideoModelConfig, SceneConfig
from pipeline.generators.replicate_client import ReplicateClient
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class VideoGenerator:
    """Generate short video clips from scene images using Replicate video models."""

    def __init__(self, client: ReplicateClient, config: VideoModelConfig):
        self.client = client
        self.config = config

    def generate_clip(
        self,
        scene: SceneConfig,
        image_path: Path,
        output_dir: Path,
    ) -> Path:
        """Generate a video clip from a scene image.

        Returns the path to the saved video file.
        """
        model = self.config.model_id
        image_path = Path(image_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Build input params based on model type
        input_params = self._build_input(scene, image_path)

        log.info(f"[VideoGen] Generating clip for scene '{scene.scene_id}' using {model}")
        output = self.client.run(model, input_params)

        url = _extract_video_url(output)
        dest = output_dir / f"{scene.scene_id}.mp4"
        return self.client.download_output(url, dest)

    def _get_prompt(self, scene: SceneConfig) -> str:
        """Build the prompt for video generation."""
        return scene.video_prompt or scene.description or scene.image_prompt

    def _get_audio_prompt(self, scene: SceneConfig) -> str:
        """Build prompt for models that generate their own audio (e.g. Grok).

        Combines video action description with voiceover/dialogue text
        so the model generates both visuals and speech in one pass.
        """
        parts = []
        # Action/visual description
        action = scene.video_prompt or scene.description
        if action:
            parts.append(action)
        # Dialogue/narration — include as spoken text
        if scene.voiceover_text:
            parts.append(f'The character says: "{scene.voiceover_text}"')
        return ". ".join(parts) if parts else scene.image_prompt

    def _build_input(self, scene: SceneConfig, image_path: Path) -> dict[str, Any]:
        """Build model-specific input parameters."""
        model = self.config.model_id
        # Always use data URI — ensures correct MIME type for all models
        image_uri = _to_data_uri(image_path)

        # Models with built-in audio get combined action+dialogue prompt
        has_audio = any(m in model for m in ("grok", "xai"))
        prompt = self._get_audio_prompt(scene) if has_audio else self._get_prompt(scene)

        params: dict[str, Any] = {**self.config.extra_params}

        if "minimax" in model or "hailuo" in model:
            params.update({
                "prompt": prompt,
                "first_frame_image": image_uri,
            })
        elif "wan-video" in model or "wan-2" in model:
            params.update({
                "image": image_uri,
                "prompt": prompt,
            })
        elif "kling" in model:
            params.update({
                "prompt": prompt,
                "start_image": image_uri,
                "duration": str(self.config.duration),
            })
        elif "seedance" in model:
            params.update({
                "prompt": prompt,
                "image": image_uri,
                "duration": self.config.duration,
            })
        elif "veo" in model:
            params.update({
                "prompt": prompt,
                "image": image_uri,
            })
        elif "grok" in model or "xai" in model:
            params.update({
                "prompt": prompt,
                "image": image_uri,
            })
        else:
            # Generic image-to-video
            params.update({
                "image": image_uri,
                "prompt": prompt,
            })

        return params

    def generate_all(
        self,
        scenes: list[SceneConfig],
        image_paths: dict[str, Path],
        output_dir: Path,
    ) -> dict[str, Path]:
        """Generate video clips for all scenes.

        Args:
            scenes: list of scene configs
            image_paths: mapping scene_id -> image file path
            output_dir: where to save videos

        Returns:
            {scene_id: video_path}
        """
        results: dict[str, Path] = {}
        for scene in scenes:
            img = image_paths.get(scene.scene_id)
            if img is None:
                log.warning(f"[VideoGen] No image for scene '{scene.scene_id}', skipping")
                continue
            path = self.generate_clip(scene, img, output_dir)
            results[scene.scene_id] = path
        return results


def _needs_data_uri(model_id: str) -> bool:
    """Some models expect a data URI instead of a file object."""
    # Minimax/Hailuo models expect URLs or data URIs
    return "minimax" in model_id or "hailuo" in model_id


def _to_data_uri(path: Path) -> str:
    """Convert a file to a base64 data URI."""
    suffix = path.suffix.lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
    mime_type = mime.get(suffix, "application/octet-stream")
    data = base64.b64encode(path.read_bytes()).decode()
    return f"data:{mime_type};base64,{data}"


def _extract_video_url(output: Any) -> str:
    """Extract a video URL from Replicate output."""
    if isinstance(output, str):
        return output
    if isinstance(output, dict) and "url" in output:
        return output["url"]
    if isinstance(output, list) and len(output) > 0:
        return str(output[0])
    if hasattr(output, "url"):
        return str(output.url)
    try:
        return str(next(iter(output)))
    except (StopIteration, TypeError):
        pass
    raise ValueError(f"Cannot extract video URL from output: {type(output)} = {output!r}")
