"""Videos API router."""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.responses import JSONResponse

from backend.database import get_session
from backend.models import Publication, Video
from backend.schemas import PublishRequest, VideoCreate, VideoList, VideoResponse
from backend.services.video_service import run_pipeline_with_progress

router = APIRouter(prefix="/api/videos", tags=["videos"])


def _normalize_config(raw: dict) -> dict:
    """Convert frontend scenario_config format to PipelineConfig format.

    Frontend sends:
      { scenes: [...], image_model: {model_id, ...}, video_model: {model_id, ...}, tts: {voice} }

    Pipeline expects:
      { scenario: {title, scenes: [...]}, image_model: {model_id, ...}, video_model: {model_id, ...}, tts: {...} }
    """
    # If already in pipeline format (has scenario.scenes), return as-is
    if "scenario" in raw and "scenes" in raw.get("scenario", {}):
        return raw

    config: dict = {}

    # Build scenario object
    scenes = raw.get("scenes", [])
    config["scenario"] = {
        "title": raw.get("title", "Generated Video"),
        "series_name": raw.get("series_name", "Video Pipeline"),
        "episode_number": raw.get("episode_number", 1),
        "scenes": scenes,
    }

    # Image model
    img = raw.get("image_model", {})
    if isinstance(img, dict) and img:
        model_id = img.pop("model_id", "black-forest-labs/flux-dev")
        config["image_model"] = {"model_id": model_id, "extra_params": img}
    elif isinstance(img, str):
        config["image_model"] = {"model_id": img}

    # Video model
    vid = raw.get("video_model", {})
    if isinstance(vid, dict) and vid:
        model_id = vid.pop("model_id", "minimax/hailuo-2.3")
        config["video_model"] = {"model_id": model_id, "extra_params": vid}
    elif isinstance(vid, str):
        config["video_model"] = {"model_id": vid}

    # TTS
    tts = raw.get("tts", {})
    if isinstance(tts, dict) and tts:
        config["tts"] = tts

    return config


async def run_generation_task(video_id: str, scenario_config: dict, session_factory):
    """Background task that runs the pipeline and updates the DB."""
    async with session_factory() as session:
        result_q = await session.execute(select(Video).where(Video.id == video_id))
        video = result_q.scalar_one_or_none()
        if not video:
            return

        video.status = "running"
        await session.commit()

        try:
            pipeline_config = _normalize_config(scenario_config)
            result = await run_pipeline_with_progress(
                job_id=video_id,
                config_dict=pipeline_config,
            )
            video.status = "completed"
            video.completed_at = datetime.now(timezone.utc)
            video.output_path = result.get("final_video")
            images = result.get("images", {})
            if images:
                video.thumbnail_path = next(iter(images.values()), None)
        except Exception as e:
            video.status = "failed"
            video.error_message = str(e)

        await session.commit()


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


@router.post("/{video_id}/generate", status_code=202)
async def start_generation(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status == "running":
        raise HTTPException(status_code=409, detail="Generation already in progress")

    video.status = "running"
    await session.commit()

    from backend.database import async_session
    asyncio.create_task(run_generation_task(video_id, video.scenario_config, async_session))

    return {"id": video_id, "status": "running"}


@router.post("/{video_id}/publish")
async def publish_video(video_id: str, body: PublishRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.output_path:
        raise HTTPException(status_code=400, detail="Video has no output file")

    results = []
    for platform in body.platforms:
        pub = Publication(video_id=video_id, platform=platform, status="failed", error_message="Publishing not yet connected")
        session.add(pub)
        results.append({"platform": platform, "status": pub.status})

    await session.commit()
    has_success = any(r["status"] == "success" for r in results)
    has_failure = any(r["status"] == "failed" for r in results)
    if has_success and has_failure:
        status_code = 207
    elif has_success:
        status_code = 200
    else:
        status_code = 207
    return JSONResponse(content=results, status_code=status_code)
