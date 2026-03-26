"""WebSocket endpoint for real-time pipeline progress."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.video_service import active_jobs

router = APIRouter()


@router.websocket("/ws/pipeline/{job_id}")
async def pipeline_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()

    try:
        tracker = active_jobs.get(job_id)
        if not tracker:
            await websocket.send_json({
                "job_id": job_id,
                "stage": "unknown",
                "stage_label": "Not Found",
                "scene": 0,
                "total_scenes": 0,
                "percent": 0,
                "message": f"No active job with id '{job_id}'",
                "cost_so_far": 0.0,
            })
            return

        last_sent = None
        while True:
            tracker = active_jobs.get(job_id)
            if not tracker:
                await websocket.send_json({
                    "job_id": job_id,
                    "stage": "completed",
                    "stage_label": "Completed",
                    "scene": 0,
                    "total_scenes": 0,
                    "percent": 100,
                    "message": "Job completed",
                    "cost_so_far": 0.0,
                })
                break

            current = tracker.to_dict()
            if current != last_sent:
                await websocket.send_json(current)
                last_sent = current

            if tracker.stage in ("completed", "failed"):
                break

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
