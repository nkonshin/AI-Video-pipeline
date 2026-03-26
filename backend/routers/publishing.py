"""Publishing API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import Publication, Setting, Video
from backend.schemas import PlatformConfig, PlatformStatus

router = APIRouter(prefix="/api/publishing", tags=["publishing"])

PLATFORMS = ["telegram", "instagram", "youtube", "vk", "tiktok"]


async def _get_platform_config(session: AsyncSession, platform: str) -> PlatformConfig:
    result = await session.execute(select(Setting).where(Setting.key == f"platform_{platform}"))
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        return PlatformConfig(**setting.value)
    return PlatformConfig()


@router.get("/platforms", response_model=list[PlatformStatus])
async def list_platforms(session: AsyncSession = Depends(get_session)):
    platforms = []
    for name in PLATFORMS:
        config = await _get_platform_config(session, name)
        platforms.append(PlatformStatus(name=name, connected=bool(config.credentials), config=config))
    return platforms


@router.put("/platforms/{platform_name}", response_model=PlatformStatus)
async def update_platform(platform_name: str, body: PlatformConfig, session: AsyncSession = Depends(get_session)):
    if platform_name not in PLATFORMS:
        raise HTTPException(status_code=404, detail=f"Unknown platform: {platform_name}")
    key = f"platform_{platform_name}"
    result = await session.execute(select(Setting).where(Setting.key == key))
    existing = result.scalar_one_or_none()
    config_dict = body.model_dump()
    if existing:
        existing.value = config_dict
    else:
        session.add(Setting(key=key, value=config_dict))
    await session.commit()
    return PlatformStatus(name=platform_name, connected=bool(body.credentials), config=body)


@router.get("/log")
async def publish_log(limit: int = 50, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Publication, Video.title)
        .join(Video, Publication.video_id == Video.id)
        .order_by(Publication.published_at.desc())
        .limit(limit)
    )
    entries = []
    for pub, video_title in result.all():
        entries.append({
            "id": pub.id, "video_id": pub.video_id, "video_title": video_title,
            "platform": pub.platform, "status": pub.status, "post_url": pub.post_url,
            "published_at": pub.published_at.isoformat(),
        })
    return entries


@router.post("/test/{platform_name}")
async def test_platform(platform_name: str, session: AsyncSession = Depends(get_session)):
    if platform_name not in PLATFORMS:
        raise HTTPException(status_code=404, detail=f"Unknown platform: {platform_name}")
    config = await _get_platform_config(session, platform_name)
    if not config.credentials:
        return {"platform": platform_name, "status": "not_configured"}
    return {"platform": platform_name, "status": "ok"}
