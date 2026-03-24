"""Video assembly — combines clips, audio, subtitles, and music into a final video."""

from __future__ import annotations

import subprocess
import json
from pathlib import Path

from pipeline.config import (
    PipelineConfig,
    SceneConfig,
    SubtitleConfig,
    MusicConfig,
)
from pipeline.generators.subtitle_gen import SubtitleGenerator
from pipeline.generators.tts_gen import get_audio_duration
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


def get_video_duration(path: Path) -> float:
    """Get video duration in seconds."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-show_entries",
                "format=duration", "-of", "csv=p=0", str(path),
            ],
            capture_output=True, text=True, check=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return 5.0


class VideoAssembler:
    """Assembles final video from generated components."""

    def __init__(self, config: PipelineConfig):
        self.config = config

    def assemble(
        self,
        scenes: list[SceneConfig],
        video_paths: dict[str, Path],
        audio_paths: dict[str, Path],
        srt_path: Path | None = None,
        output_path: Path | None = None,
    ) -> Path:
        """Assemble all scenes into a single final video.

        Pipeline:
        1. Normalize each clip (resolution, fps)
        2. Concatenate clips
        3. Mix in voiceover audio (replacing original clip audio)
        4. Add background music
        5. Burn in subtitles
        6. Output final MP4

        Returns path to the final video.
        """
        output_dir = Path(self.config.output_dir) / "final"
        output_dir.mkdir(parents=True, exist_ok=True)

        if output_path is None:
            scenario = self.config.scenario
            safe_name = scenario.series_name.replace(" ", "_").lower()
            output_path = output_dir / f"{safe_name}_ep{scenario.episode_number:03d}.mp4"

        # Step 1: Prepare individual scene segments (video + audio sync)
        log.info("[Assembler] Step 1: Preparing scene segments...")
        segment_paths = self._prepare_segments(scenes, video_paths, audio_paths)

        if not segment_paths:
            raise RuntimeError("No segments to assemble")

        # Step 2: Concatenate segments
        log.info("[Assembler] Step 2: Concatenating segments...")
        concat_path = output_dir / "_concat_raw.mp4"
        self._concatenate(segment_paths, concat_path)

        # Step 3: Add background music (if configured)
        if self.config.music.enabled and self.config.music.file:
            log.info("[Assembler] Step 3: Adding background music...")
            music_path = output_dir / "_with_music.mp4"
            self._add_music(concat_path, Path(self.config.music.file), music_path)
            current = music_path
        else:
            current = concat_path

        # Step 4: Burn in subtitles (if configured)
        if srt_path and self.config.subtitles.enabled:
            log.info("[Assembler] Step 4: Burning in subtitles...")
            sub_gen = SubtitleGenerator(self.config.subtitles)
            sub_filter = sub_gen.get_ffmpeg_subtitle_filter(srt_path)
            self._burn_subtitles(current, sub_filter, output_path)
        else:
            # Just copy/rename
            if current != output_path:
                subprocess.run(
                    ["cp", str(current), str(output_path)], check=True
                )

        # Cleanup temp files
        for tmp in [output_dir / "_concat_raw.mp4", output_dir / "_with_music.mp4"]:
            if tmp.exists() and tmp != output_path:
                tmp.unlink()

        # Cleanup segment temp files
        for sp in segment_paths:
            if sp.name.startswith("_seg_") and sp.exists():
                sp.unlink()

        log.info(f"[Assembler] Final video: {output_path}")
        return output_path

    def _prepare_segments(
        self,
        scenes: list[SceneConfig],
        video_paths: dict[str, Path],
        audio_paths: dict[str, Path],
    ) -> list[Path]:
        """Prepare each scene as a segment with synced audio."""
        output_dir = Path(self.config.output_dir) / "final"
        segments: list[Path] = []

        for i, scene in enumerate(scenes):
            video = video_paths.get(scene.scene_id)
            audio = audio_paths.get(scene.scene_id)

            if video is None or not video.exists():
                log.warning(f"[Assembler] Missing video for scene '{scene.scene_id}', skipping")
                continue

            seg_path = output_dir / f"_seg_{i:03d}.mp4"

            if audio and audio.exists() and audio.stat().st_size > 0:
                audio_dur = get_audio_duration(audio)
                video_dur = get_video_duration(video)

                # Match video length to audio length
                # If video is shorter than audio, slow it down or loop
                # If video is longer, speed it up or trim
                speed_factor = video_dur / audio_dur if audio_dur > 0 else 1.0

                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video),
                    "-i", str(audio),
                    "-filter_complex",
                    (
                        f"[0:v]setpts={1/speed_factor}*PTS,"
                        f"scale=1080:1920:force_original_aspect_ratio=decrease,"
                        f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2,"
                        f"fps=30[v]"
                    ),
                    "-map", "[v]",
                    "-map", "1:a",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "192k",
                    "-shortest",
                    str(seg_path),
                ]
            else:
                # No audio — just normalize video
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video),
                    "-vf", (
                        "scale=1080:1920:force_original_aspect_ratio=decrease,"
                        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,"
                        "fps=30"
                    ),
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-an",
                    str(seg_path),
                ]

            log.debug(f"[Assembler] Preparing segment {i}: {' '.join(cmd[:6])}...")
            subprocess.run(cmd, check=True, capture_output=True)
            segments.append(seg_path)

        return segments

    def _concatenate(self, segments: list[Path], output: Path) -> None:
        """Concatenate video segments using ffmpeg concat demuxer."""
        concat_list = output.parent / "_concat_list.txt"
        with open(concat_list, "w") as f:
            for seg in segments:
                f.write(f"file '{seg.resolve()}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(output),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        concat_list.unlink()

    def _add_music(self, video: Path, music_file: Path, output: Path) -> None:
        """Mix background music into the video at the configured volume."""
        vol = self.config.music.volume
        video_dur = get_video_duration(video)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video),
            "-stream_loop", "-1", "-i", str(music_file),
            "-filter_complex",
            (
                f"[1:a]volume={vol},afade=t=in:st=0:d=2,"
                f"afade=t=out:st={max(0, video_dur-2)}:d=2[music];"
                f"[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            ),
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(output),
        ]
        subprocess.run(cmd, check=True, capture_output=True)

    def _burn_subtitles(self, video: Path, sub_filter: str, output: Path) -> None:
        """Burn subtitles into the video."""
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video),
            "-vf", sub_filter,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "copy",
            str(output),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
