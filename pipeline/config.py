"""Pipeline configuration — loads from .env and YAML config files."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


# ---------------------------------------------------------------------------
# Environment-level settings (secrets, tokens)
# ---------------------------------------------------------------------------

class EnvSettings(BaseSettings):
    """Loaded from environment / .env file."""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    # Replicate
    replicate_api_token: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_channel_id: str = ""

    # Instagram
    instagram_username: str = ""
    instagram_password: str = ""

    # YouTube
    youtube_client_secrets_file: str = "client_secret.json"

    # VK
    vk_access_token: str = ""
    vk_group_id: str = ""

    # TikTok
    tiktok_session_id: str = ""

    # Defaults
    default_language: str = "ru"
    default_voice: str = "ru-RU-DmitryNeural"
    output_dir: str = "./output"


# ---------------------------------------------------------------------------
# YAML project config (scenario, models, publishing)
# ---------------------------------------------------------------------------

class ImageModelConfig(BaseModel):
    """Settings for the image generation model on Replicate."""
    model_id: str = "black-forest-labs/flux-1.1-pro"
    width: int = 1080
    height: int = 1920  # 9:16 vertical for Reels/Shorts
    num_inference_steps: int = 25
    guidance_scale: float = 3.5
    output_format: str = "png"
    extra_params: dict[str, Any] = Field(default_factory=dict)


class VideoModelConfig(BaseModel):
    """Settings for the video generation model on Replicate."""
    model_id: str = "minimax/hailuo-2.3"
    duration: int = 5  # seconds
    fps: int = 24
    extra_params: dict[str, Any] = Field(default_factory=dict)


class TTSConfig(BaseModel):
    """Text-to-speech configuration."""
    engine: str = "edge-tts"  # edge-tts (free) or replicate
    voice: str = "ru-RU-DmitryNeural"
    rate: str = "+0%"
    volume: str = "+0%"
    # Replicate TTS model (if engine == "replicate")
    replicate_model_id: str = "resemble-ai/chatterbox-multilingual"
    extra_params: dict[str, Any] = Field(default_factory=dict)


class SubtitleConfig(BaseModel):
    """Subtitle / text overlay settings."""
    enabled: bool = True
    font: str = "Arial"
    font_size: int = 48
    color: str = "white"
    stroke_color: str = "black"
    stroke_width: int = 2
    position: str = "bottom"  # top, center, bottom
    max_chars_per_line: int = 35


class MusicConfig(BaseModel):
    """Background music settings."""
    enabled: bool = True
    file: str = ""  # path to music file, or empty for none
    volume: float = 0.15  # relative to voiceover


class PublishTarget(BaseModel):
    """A single publishing target."""
    platform: str  # instagram, tiktok, youtube, vk, telegram
    enabled: bool = True
    caption_template: str = ""
    hashtags: list[str] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class SceneConfig(BaseModel):
    """A single scene in a scenario."""
    scene_id: str
    description: str  # human description of what happens
    image_prompt: str  # prompt for image generation
    voiceover_text: str  # text for TTS
    duration: float = 5.0  # seconds
    camera_motion: str = ""  # e.g. "zoom in", "pan left"
    transition: str = "crossfade"  # crossfade, cut, fade_black


class ScenarioConfig(BaseModel):
    """Full scenario (episode) definition."""
    title: str = "Untitled Episode"
    series_name: str = "AI Series"
    episode_number: int = 1
    style_prompt: str = ""  # appended to every image prompt for consistency
    negative_prompt: str = "blurry, low quality, text, watermark, deformed"
    character_descriptions: dict[str, str] = Field(default_factory=dict)
    scenes: list[SceneConfig] = Field(default_factory=list)


class PipelineConfig(BaseModel):
    """Top-level pipeline configuration loaded from YAML."""
    scenario: ScenarioConfig = Field(default_factory=ScenarioConfig)
    image_model: ImageModelConfig = Field(default_factory=ImageModelConfig)
    video_model: VideoModelConfig = Field(default_factory=VideoModelConfig)
    tts: TTSConfig = Field(default_factory=TTSConfig)
    subtitles: SubtitleConfig = Field(default_factory=SubtitleConfig)
    music: MusicConfig = Field(default_factory=MusicConfig)
    publish_targets: list[PublishTarget] = Field(default_factory=list)
    output_dir: str = "./output"


def load_pipeline_config(path: str | Path) -> PipelineConfig:
    """Load a pipeline config from a YAML file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return PipelineConfig.model_validate(data or {})


def load_env() -> EnvSettings:
    """Load environment settings."""
    return EnvSettings()


# Convenience: ensure output dirs exist
def ensure_output_dirs(base: str | Path) -> dict[str, Path]:
    """Create and return standard output subdirectories."""
    base = Path(base)
    dirs = {}
    for name in ("images", "videos", "audio", "final"):
        d = base / name
        d.mkdir(parents=True, exist_ok=True)
        dirs[name] = d
    return dirs
