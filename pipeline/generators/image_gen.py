"""Image generation via Replicate — produces scene frames."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pipeline.config import ImageModelConfig, SceneConfig
from pipeline.generators.replicate_client import ReplicateClient
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class ImageGenerator:
    """Generates images for scenes using Replicate image models."""

    def __init__(self, client: ReplicateClient, config: ImageModelConfig):
        self.client = client
        self.config = config

    def _build_prompt(
        self,
        scene: SceneConfig,
        style_prompt: str = "",
        character_descriptions: dict[str, str] | None = None,
    ) -> str:
        """Build the full prompt for a scene, incorporating style and characters."""
        parts = []

        # Inject character descriptions into the image prompt
        if character_descriptions:
            for char_name, char_desc in character_descriptions.items():
                if char_name.lower() in scene.image_prompt.lower():
                    parts.append(f"{char_name}: {char_desc}")

        parts.append(scene.image_prompt)

        if style_prompt:
            parts.append(style_prompt)

        return ". ".join(parts)

    def generate_scene_image(
        self,
        scene: SceneConfig,
        output_dir: Path,
        style_prompt: str = "",
        negative_prompt: str = "",
        character_descriptions: dict[str, str] | None = None,
    ) -> Path:
        """Generate a single image for a scene and save it to disk.

        Returns the path to the saved image.
        """
        prompt = self._build_prompt(scene, style_prompt, character_descriptions)

        input_params: dict[str, Any] = {
            "prompt": prompt,
            "width": self.config.width,
            "height": self.config.height,
            "output_format": self.config.output_format,
            **self.config.extra_params,
        }

        # Model-specific parameter mapping
        model = self.config.model_id
        if "flux" in model:
            input_params["num_inference_steps"] = self.config.num_inference_steps
            input_params["guidance"] = self.config.guidance_scale
        elif "sdxl" in model or "stable-diffusion" in model:
            input_params["num_inference_steps"] = self.config.num_inference_steps
            input_params["guidance_scale"] = self.config.guidance_scale
            if negative_prompt:
                input_params["negative_prompt"] = negative_prompt

        log.info(f"[ImageGen] Generating image for scene '{scene.scene_id}'")
        log.debug(f"[ImageGen] Prompt: {prompt[:120]}...")

        output = self.client.run(model, input_params)

        # Output may be a single URL string or a list / FileOutput
        url = _extract_url(output)
        ext = self.config.output_format or "png"
        dest = output_dir / f"{scene.scene_id}.{ext}"
        return self.client.download_output(url, dest)

    def generate_all(
        self,
        scenes: list[SceneConfig],
        output_dir: Path,
        style_prompt: str = "",
        negative_prompt: str = "",
        character_descriptions: dict[str, str] | None = None,
    ) -> dict[str, Path]:
        """Generate images for all scenes. Returns {scene_id: path}."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        results: dict[str, Path] = {}
        for scene in scenes:
            path = self.generate_scene_image(
                scene, output_dir, style_prompt, negative_prompt, character_descriptions
            )
            results[scene.scene_id] = path
        return results


def _extract_url(output: Any) -> str:
    """Extract a download URL from various Replicate output formats."""
    if isinstance(output, str):
        return output
    if isinstance(output, list) and len(output) > 0:
        return str(output[0])
    # FileOutput or object with .url
    if hasattr(output, "url"):
        return str(output.url)
    # Iterable
    try:
        return str(next(iter(output)))
    except (StopIteration, TypeError):
        pass
    raise ValueError(f"Cannot extract URL from Replicate output: {type(output)} = {output!r}")
