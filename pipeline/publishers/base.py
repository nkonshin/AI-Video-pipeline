"""Base publisher interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class Publisher(ABC):
    """Abstract base for all social media publishers."""

    platform: str = "unknown"

    def __init__(self, target: PublishTarget):
        self.target = target

    @abstractmethod
    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        """Publish a video to the platform.

        Returns a URL or post ID on success.
        """

    def _build_caption(self, title: str, description: str, hashtags: list[str] | None) -> str:
        """Build a caption from title, description, and hashtags."""
        parts = []
        if title:
            parts.append(title)
        if description:
            parts.append(description)

        all_tags = list(self.target.hashtags)
        if hashtags:
            all_tags.extend(hashtags)
        if all_tags:
            parts.append(" ".join(f"#{t.lstrip('#')}" for t in all_tags))

        return "\n\n".join(parts)
