"""Videos API router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Video
from backend.schemas import VideoCreate, VideoList, VideoResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("", response_model=VideoList)
async def list_videos(
    status: str | None = None,
    content_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    query = select(Video).options(selectinload(Video.publications))
    count_query = select(func.count(Video.id))

    if status:
        query = query.where(Video.status == status)
        count_query = count_query.where(Video.status == status)
    if content_type:
        query = query.where(Video.content_type == content_type)
        count_query = count_query.where(Video.content_type == content_type)

    query = query.order_by(Video.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    videos = result.scalars().all()

    total_result = await session.execute(count_query)
    total = total_result.scalar()

    return VideoList(videos=videos, total=total)


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Video).options(selectinload(Video.publications)).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("", response_model=VideoResponse, status_code=201)
async def create_video(body: VideoCreate, session: AsyncSession = Depends(get_session)):
    video = Video(
        title=body.title,
        content_type=body.content_type,
        status="pending",
        scenario_config=body.scenario_config,
    )
    session.add(video)
    await session.commit()
    # Re-fetch with eager-loaded publications to satisfy response_model
    result = await session.execute(
        select(Video).options(selectinload(Video.publications)).where(Video.id == video.id)
    )
    return result.scalar_one()


@router.delete("/{video_id}", status_code=204)
async def delete_video(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await session.delete(video)
    await session.commit()
