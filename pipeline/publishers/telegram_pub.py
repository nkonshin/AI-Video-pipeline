"""Telegram channel publisher."""

from __future__ import annotations

from pathlib import Path

from pipeline.config import PublishTarget
from pipeline.publishers.base import Publisher
from pipeline.utils.logger import get_logger

log = get_logger(__name__)


class TelegramPublisher(Publisher):
    """Publish videos to a Telegram channel via Bot API."""

    platform = "telegram"

    def __init__(self, target: PublishTarget, bot_token: str, channel_id: str):
        super().__init__(target)
        self.bot_token = bot_token
        self.channel_id = channel_id

    def publish(
        self,
        video_path: Path,
        title: str,
        description: str,
        hashtags: list[str] | None = None,
        thumbnail_path: Path | None = None,
    ) -> str:
        import telegram

        caption = self._build_caption(title, description, hashtags)

        import asyncio

        async def _send():
            bot = telegram.Bot(token=self.bot_token)
            with open(video_path, "rb") as video_file:
                kwargs = {
                    "chat_id": self.channel_id,
                    "video": video_file,
                    "caption": caption[:1024],  # Telegram caption limit
                    "parse_mode": "HTML",
                    "supports_streaming": True,
                }
                if thumbnail_path and thumbnail_path.exists():
                    kwargs["thumbnail"] = open(thumbnail_path, "rb")

                msg = await bot.send_video(**kwargs)
                return str(msg.message_id)

        msg_id = asyncio.run(_send())
        log.info(f"[Telegram] Published to {self.channel_id}, message_id={msg_id}")
        return msg_id
