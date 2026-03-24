"""Instagram Reels publisher via instagrapi."""

from __future__ import annotations

from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.publishers.base import Publisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class InstagramPublisher(Publisher):
    """Publish videos as Instagram Reels using instagrapi."""

    platform = "instagram"

    def __init__(self, target: PublishTarget, username: str, password: str):
        super().__init__(target)
        self.username = username
        self.password = password
        self._client = None

    def _get_client(self):
        if self._client is None:
            from instagrapi import Client
            self._client = Client()
            # Try loading session first
            session_file = Path(f".ig_session_{self.username}.json")
            if session_file.exists():
                self._client.load_settings(str(session_file))
                self._client.login(self.username, self.password)
            else:
                self._client.login(self.username, self.password)
                self._client.dump_settings(str(session_file))
            log.info(f"[Instagram] Logged in as {self.username}")
        return self._client

    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        client = self._get_client()
        caption = self._build_caption(title, description, hashtags)

        kwargs = {
            "path": str(video_path),
            "caption": caption,
        }
        if thumbnail_path and thumbnail_path.exists():
            kwargs["thumbnail"] = str(thumbnail_path)

        media = client.clip_upload(**kwargs)
        media_id = media.pk
        log.info(f"[Instagram] Published Reel, media_id={media_id}")
        return str(media_id)
