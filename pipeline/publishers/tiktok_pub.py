"""TikTok video publisher.

Note: TikTok's official Content Posting API requires app approval.
This module supports both the official API and a manual-upload workflow
with instructions for the user.
"""

from __future__ import annotations

import json
from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.publishers.base import Publisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class TikTokPublisher(Publisher):
    """Publish videos to TikTok.

    Currently supports:
    1. Preparing the video + metadata for manual upload
    2. Integration with TikTok Content Posting API (requires approved app)

    For automated posting, you need to register a TikTok developer app
    and get approval for the Content Posting API scope.
    See: https://developers.tiktok.com/doc/content-posting-api-get-started/
    """

    platform = "tiktok"

    def __init__(self, target: PublishTarget, access_token: str = ""):
        super().__init__(target)
        self.access_token = access_token

    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        caption = self._build_caption(title, description, hashtags)

        if self.access_token:
            return self._publish_via_api(video_path, caption)
        else:
            return self._prepare_for_manual_upload(video_path, caption)

    def _publish_via_api(self, video_path: Path, caption: str) -> str:
        """Upload via TikTok Content Posting API."""
        import httpx

        # Step 1: Initialize upload
        init_url = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        file_size = video_path.stat().st_size

        init_body = {
            "post_info": {
                "title": caption[:150],
                "privacy_level": "PUBLIC_TO_EVERYONE",
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            },
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": file_size,
                "chunk_size": file_size,
                "total_chunk_count": 1,
            },
        }

        with httpx.Client(timeout=120) as client:
            resp = client.post(init_url, json=init_body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            upload_url = data["data"]["upload_url"]
            publish_id = data["data"]["publish_id"]

            # Step 2: Upload video
            with open(video_path, "rb") as f:
                upload_resp = client.put(
                    upload_url,
                    content=f.read(),
                    headers={
                        "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
                        "Content-Type": "video/mp4",
                    },
                )
                upload_resp.raise_for_status()

        log.info(f"[TikTok] Published via API, publish_id={publish_id}")
        return publish_id

    def _prepare_for_manual_upload(self, video_path: Path, caption: str) -> str:
        """Save metadata for manual upload. Returns the metadata file path."""
        meta_path = video_path.with_suffix(".tiktok.json")
        metadata = {
            "video_file": str(video_path.resolve()),
            "caption": caption,
            "platform": "tiktok",
            "instructions": (
                "Upload this video to TikTok manually or via the TikTok mobile app. "
                "Use the caption above. For automated posting, set up the TikTok "
                "Content Posting API access token."
            ),
        }
        meta_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"[TikTok] Prepared for manual upload: {meta_path}")
        return str(meta_path)
