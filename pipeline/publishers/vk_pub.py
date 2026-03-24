"""VKontakte video publisher."""

from __future__ import annotations

from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.publishers.base import Publisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class VKPublisher(Publisher):
    """Publish videos to a VK community."""

    platform = "vk"

    def __init__(self, target: PublishTarget, access_token: str, group_id: str):
        super().__init__(target)
        self.access_token = access_token
        self.group_id = group_id

    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        import vk_api

        session = vk_api.VkApi(token=self.access_token)
        vk = session.get_api()

        caption = self._build_caption("", description, hashtags)

        # Step 1: Get upload URL
        upload_data = vk.video.save(
            name=title[:128],
            description=caption[:5000],
            group_id=self.group_id,
            is_private=0,
            wallpost=1,  # also post to wall
        )

        upload_url = upload_data["upload_url"]

        # Step 2: Upload the video
        import requests
        with open(video_path, "rb") as f:
            response = requests.post(upload_url, files={"video_file": f})
            response.raise_for_status()

        result = response.json()
        video_id = result.get("video_id", "unknown")
        owner_id = result.get("owner_id", f"-{self.group_id}")

        log.info(f"[VK] Published video: https://vk.com/video{owner_id}_{video_id}")
        return f"{owner_id}_{video_id}"
