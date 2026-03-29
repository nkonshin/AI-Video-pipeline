"""Subtitle generation — creates SRT files and burn-in-ready text overlays."""

from __future__ import annotations

import math
import textwrap
from dataclasses import dataclass
from pathlib import Path

import srt
from datetime import timedelta

from pipeline.config import SubtitleConfig, SceneConfig
from pipeline.generators.tts_gen import get_audio_duration
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class TimedLine:
    """A single subtitle line with timing."""
    text: str
    start: float  # seconds
    end: float  # seconds


def split_text_to_timed_lines(
    text: str,
    total_duration: float,
    max_chars: int = 35,
) -> list[TimedLine]:
    """Split text into timed subtitle lines that fit within the total duration.

    Uses word-wrapping to split into lines of max_chars width,
    then distributes timing evenly based on word count.
    """
    if not text.strip():
        return []

    # Wrap text into lines
    wrapped = textwrap.wrap(text.strip(), width=max_chars)
    if not wrapped:
        return []

    # Distribute time proportionally to word count per line
    word_counts = [len(line.split()) for line in wrapped]
    total_words = sum(word_counts) or 1
    time_per_word = total_duration / total_words

    lines: list[TimedLine] = []
    current_time = 0.0
    for line_text, wc in zip(wrapped, word_counts):
        duration = max(0.5, time_per_word * wc)  # at least 0.5s per line
        lines.append(TimedLine(
            text=line_text,
            start=current_time,
            end=min(current_time + duration, total_duration),
        ))
        current_time += duration

    # Ensure last line extends to the end
    if lines:
        lines[-1].end = total_duration

    return lines


class SubtitleGenerator:
    """Generate subtitle files and overlays for scenes."""

    def __init__(self, config: SubtitleConfig):
        self.config = config

    def generate_srt(
        self,
        scenes: list[SceneConfig],
        audio_paths: dict[str, Path],
        output_path: Path,
        scene_offsets: dict[str, float] | None = None,
    ) -> Path:
        """Generate a single SRT file for the entire video.

        Args:
            scenes: Scene list (order matters)
            audio_paths: {scene_id: audio_file} for duration info
            output_path: Where to write the .srt file
            scene_offsets: {scene_id: start_time_in_final_video}

        Returns:
            Path to the SRT file.
        """
        if not self.config.enabled:
            log.info("[Subtitles] Disabled, skipping")
            return output_path

        subs: list[srt.Subtitle] = []
        index = 1
        global_offset = 0.0

        for scene in scenes:
            audio = audio_paths.get(scene.scene_id)
            if audio and audio.exists():
                duration = get_audio_duration(audio)
            else:
                duration = scene.duration

            offset = (scene_offsets or {}).get(scene.scene_id, global_offset)

            lines = split_text_to_timed_lines(
                scene.voiceover_text,
                duration,
                max_chars=self.config.max_chars_per_line,
            )

            for line in lines:
                subs.append(srt.Subtitle(
                    index=index,
                    start=timedelta(seconds=offset + line.start),
                    end=timedelta(seconds=offset + line.end),
                    content=line.text,
                ))
                index += 1

            global_offset += duration

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(srt.compose(subs), encoding="utf-8")
        log.info(f"[Subtitles] Generated {len(subs)} subtitle entries -> {output_path}")
        return output_path

    def get_ffmpeg_subtitle_filter(self, srt_path: Path) -> str:
        """Return an FFmpeg subtitles filter string for burning in subtitles.

        Uses the ASS style override to control font, size, colors.
        """
        # Escape path for ffmpeg filter
        escaped = str(srt_path).replace("\\", "\\\\").replace(":", "\\:")

        margin_v = getattr(self.config, 'margin_bottom', 60)
        style = (
            f"FontName={self.config.font},"
            f"FontSize={self.config.font_size},"
            f"PrimaryColour=&H00FFFFFF,"  # white
            f"OutlineColour=&H00000000,"  # black outline
            f"BackColour=&H80000000,"  # semi-transparent shadow
            f"Outline={self.config.stroke_width},"
            f"Shadow=2,"
            f"Bold=1,"
            f"Alignment=2,"  # bottom center
            f"MarginV={margin_v}"
        )

        if self.config.position == "top":
            style = style.replace("Alignment=2", "Alignment=6").replace("MarginV=40", "MarginV=40")
        elif self.config.position == "center":
            style = style.replace("Alignment=2", "Alignment=5").replace("MarginV=40", "MarginV=0")

        return f"subtitles={escaped}:force_style='{style}'"
