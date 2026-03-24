"""Publishing manager — dispatches to platform-specific publishers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pipeline.config import PublishTarget, EnvSettings
from pipeline.publishers.base import Publisher
from pipeline.publishers.telegram_pub import TelegramPublisher
from pipeline.publishers.instagram_pub import InstagramPublisher
from pipeline.publishers.youtube_pub import YouTubePublisher
from pipeline.publishers.vk_pub import VKPublisher
from pipeline.publishers.tiktok_pub import TikTokPublisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class PublishManager:
    """Manages publishing to multiple platforms."""

    def __init__(self, targets: list[PublishTarget], env: EnvSettings):
        self.targets = targets
        self.env = env
        self._publishers: list[Publisher] = []
        self._init_publishers()

    def _init_publishers(self):
        """Initialize publisher instances based on config."""
        for target in self.targets:
            if not target.enabled:
                log.info(f"[Publish] {target.platform} is disabled, skipping")
                continue

            try:
                pub = self._create_publisher(target)
                if pub:
                    self._publishers.append(pub)
            except Exception as e:
                log.warning(f"[Publish] Failed to init {target.platform}: {e}")

    def _create_publisher(self, target: PublishTarget) -> Publisher | None:
        """Create a publisher for a specific platform."""
        platform = target.platform.lower()

        if platform == "telegram":
            if not self.env.telegram_bot_token:
                log.warning("[Publish] Telegram bot token not set")
                return None
            return TelegramPublisher(
                target, self.env.telegram_bot_token, self.env.telegram_channel_id
            )

        elif platform == "instagram":
            if not self.env.instagram_username:
                log.warning("[Publish] Instagram credentials not set")
                return None
            return InstagramPublisher(
                target, self.env.instagram_username, self.env.instagram_password
            )

        elif platform == "youtube":
            return YouTubePublisher(target, self.env.youtube_client_secrets_file)

        elif platform == "vk":
            if not self.env.vk_access_token:
                log.warning("[Publish] VK access token not set")
                return None
            return VKPublisher(target, self.env.vk_access_token, self.env.vk_group_id)

        elif platform == "tiktok":
            return TikTokPublisher(target, self.env.tiktok_session_id)

        else:
            log.warning(f"[Publish] Unknown platform: {platform}")
            return None

    def publish_all(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> dict[str, str | Exception]:
        """Publish to all enabled platforms.

        Returns {platform: post_id_or_url} on success,
        {platform: Exception} on failure.
        """
        results: dict[str, str | Exception] = {}

        for pub in self._publishers:
            try:
                log.info(f"[Publish] Publishing to {pub.platform}...")
                result = pub.publish(
                    video_path, title, description, hashtags, thumbnail_path
                )
                results[pub.platform] = result
                log.info(f"[Publish] ✓ {pub.platform}: {result}")
            except Exception as e:
                results[pub.platform] = e
                log.error(f"[Publish] ✗ {pub.platform}: {e}")

        return results
