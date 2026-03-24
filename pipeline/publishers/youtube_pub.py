"""YouTube Shorts publisher via YouTube Data API v3."""

from __future__ import annotations

from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.publishers.base import Publisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class YouTubePublisher(Publisher):
    """Upload videos as YouTube Shorts."""

    platform = "youtube"

    def __init__(self, target: PublishTarget, client_secrets_file: str):
        super().__init__(target)
        self.client_secrets_file = client_secrets_file
        self._youtube = None

    def _get_service(self):
        if self._youtube is not None:
            return self._youtube

        import os
        import pickle
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
        creds = None
        token_file = "yt_token.pickle"

        if os.path.exists(token_file):
            with open(token_file, "rb") as f:
                creds = pickle.load(f)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.client_secrets_file, SCOPES
                )
                creds = flow.run_local_server(port=0)
            with open(token_file, "wb") as f:
                pickle.dump(creds, f)

        self._youtube = build("youtube", "v3", credentials=creds)
        log.info("[YouTube] Authenticated successfully")
        return self._youtube

    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        from googleapiclient.http import MediaFileUpload

        youtube = self._get_service()
        caption = self._build_caption("", description, hashtags)

        # Add #Shorts tag for YouTube Shorts detection
        if "#Shorts" not in caption and "#shorts" not in caption:
            caption += "\n\n#Shorts"

        body = {
            "snippet": {
                "title": title[:100],  # YouTube title limit
                "description": caption[:5000],
                "tags": [t.lstrip("#") for t in (hashtags or [])],
                "categoryId": "22",  # People & Blogs
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(
            str(video_path),
            mimetype="video/mp4",
            resumable=True,
            chunksize=10 * 1024 * 1024,
        )

        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                log.info(f"[YouTube] Upload progress: {int(status.progress() * 100)}%")

        video_id = response["id"]
        log.info(f"[YouTube] Published Short: https://youtube.com/shorts/{video_id}")
        return video_id
