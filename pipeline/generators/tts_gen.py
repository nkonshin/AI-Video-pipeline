"""Text-to-Speech generation — produces voiceover audio for scenes."""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any

from pipeline.config import TTSConfig, SceneConfig
from pipeline.generators.replicate_client import ReplicateClient
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class TTSGenerator:
    """Generate voiceover audio files for scenes."""

    def __init__(self, config: TTSConfig, replicate_client: ReplicateClient | None = None):
        self.config = config
        self.replicate_client = replicate_client

    def generate_voiceover(self, scene: SceneConfig, output_dir: Path) -> Path:
        """Generate audio for a scene's voiceover_text.

        Returns the path to the saved audio file.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        dest = output_dir / f"{scene.scene_id}.mp3"

        text = scene.voiceover_text.strip()
        if not text:
            log.warning(f"[TTS] No voiceover text for scene '{scene.scene_id}', skipping")
            return dest

        if self.config.engine == "edge-tts":
            return self._generate_edge_tts(text, dest)
        elif self.config.engine == "replicate":
            return self._generate_replicate_tts(text, dest)
        else:
            raise ValueError(f"Unknown TTS engine: {self.config.engine}")

    def _generate_edge_tts(self, text: str, dest: Path) -> Path:
        """Use Microsoft Edge TTS (free, supports Russian)."""
        log.info(f"[TTS/edge] Generating: {text[:60]}...")

        async def _run():
            import edge_tts
            communicate = edge_tts.Communicate(
                text=text,
                voice=self.config.voice,
                rate=self.config.rate,
                volume=self.config.volume,
            )
            await communicate.save(str(dest))

        asyncio.run(_run())
        log.info(f"[TTS/edge] Saved {dest} ({dest.stat().st_size / 1024:.1f} KB)")
        return dest

    def _generate_replicate_tts(self, text: str, dest: Path) -> Path:
        """Use a Replicate TTS model."""
        if not self.replicate_client:
            raise RuntimeError("Replicate client required for replicate TTS engine")

        model_id = self.config.replicate_model_id
        input_params: dict[str, Any] = {
            "text": text,
            **self.config.extra_params,
        }

        # Model-specific parameter mapping
        if "chatterbox-multilingual" in model_id:
            input_params["language"] = "ru"
        elif "minimax/speech" in model_id:
            input_params["voice_id"] = self.config.voice
        else:
            input_params["voice"] = self.config.voice

        log.info(f"[TTS/replicate] Generating with {model_id}: {text[:60]}...")
        output = self.replicate_client.run(model_id, input_params)

        url = str(output) if isinstance(output, str) else str(next(iter(output)))
        return self.replicate_client.download_output(url, dest)

    def generate_all(
        self, scenes: list[SceneConfig], output_dir: Path
    ) -> dict[str, Path]:
        """Generate voiceovers for all scenes.

        Returns {scene_id: audio_path}.
        """
        results: dict[str, Path] = {}
        for scene in scenes:
            path = self.generate_voiceover(scene, output_dir)
            results[scene.scene_id] = path
        return results


def get_audio_duration(path: Path) -> float:
    """Get the duration of an audio file in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-show_entries",
                "format=duration", "-of", "csv=p=0", str(path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        log.warning(f"[TTS] Could not get duration for {path}, defaulting to 5.0s")
        return 5.0
