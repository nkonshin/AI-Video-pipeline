"""Settings API router."""

import os

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import Setting
from backend.schemas import BudgetResponse, SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

_DEFAULTS = {
    "replicate_api_token": os.environ.get("REPLICATE_API_TOKEN", ""),
    "default_image_model": "black-forest-labs/flux-dev",
    "default_video_model": "minimax/hailuo-2.3",
    "default_tts_engine": "edge-tts",
    "default_tts_voice": "ru-RU-DmitryNeural",
    "budget_limit": 50.0,
    "budget_spent": 0.0,
    "output_dir": "./output",
}


def _mask_token(token: str) -> str:
    if len(token) <= 6:
        return "***" if token else ""
    return token[:3] + "***"


async def _get_all_settings(session: AsyncSession) -> dict:
    result = await session.execute(select(Setting))
    stored = {s.key: s.value for s in result.scalars().all()}
    merged = {}
    for key, default in _DEFAULTS.items():
        if key in stored:
            merged[key] = stored[key].get("v", default)
        else:
            merged[key] = default
    return merged


@router.get("", response_model=SettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    settings = await _get_all_settings(session)
    settings["replicate_api_token"] = _mask_token(settings["replicate_api_token"])
    return SettingsResponse(**settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        result = await session.execute(select(Setting).where(Setting.key == key))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = {"v": value}
        else:
            session.add(Setting(key=key, value={"v": value}))
    await session.commit()
    settings = await _get_all_settings(session)
    settings["replicate_api_token"] = _mask_token(settings["replicate_api_token"])
    return SettingsResponse(**settings)


@router.post("/validate-model")
async def validate_model(body: dict, session: AsyncSession = Depends(get_session)):
    """Check if a Replicate model ID is valid by querying the API."""
    model_id = body.get("model_id", "").strip()
    if not model_id or "/" not in model_id:
        return {"valid": False, "error": "Model ID must be in format 'owner/name'"}

    settings = await _get_all_settings(session)
    token = settings.get("replicate_api_token", "")
    if not token:
        return {"valid": False, "error": "Replicate API token not configured"}

    try:
        import replicate
        client = replicate.Client(api_token=token)
        model = client.models.get(model_id)
        description = (model.description or "")[:120]
        return {
            "valid": True,
            "model_id": model_id,
            "name": model.name,
            "owner": model.owner,
            "description": description,
        }
    except Exception:
        return {"valid": False, "error": f"Model not found: {model_id}"}


@router.post("/model-schema")
async def get_model_schema(body: dict, session: AsyncSession = Depends(get_session)):
    """Get the input parameter schema for a Replicate model."""
    model_id = body.get("model_id", "").strip()
    if not model_id or "/" not in model_id:
        return {"error": "Model ID must be in format 'owner/name'"}

    settings = await _get_all_settings(session)
    token = settings.get("replicate_api_token", "")
    if not token:
        return {"error": "Replicate API token not configured"}

    try:
        import replicate
        client = replicate.Client(api_token=token)
        model = client.models.get(model_id)
        latest = model.latest_version
        if not latest:
            return {"error": "No versions available for this model"}

        schema = latest.openapi_schema
        input_schema = schema.get("components", {}).get("schemas", {}).get("Input", {})
        properties = input_schema.get("properties", {})

        # Build a clean list of parameters
        params = []
        # Skip internal/complex params, keep user-facing ones
        skip_keys = {"prompt", "image", "video", "audio", "input_image", "input_video",
                      "seed", "webhook", "webhook_events_filter",
                      "text",  # TTS text comes from scene voiceover, not user input
                      }

        for key, prop in properties.items():
            if key in skip_keys:
                continue

            param = {
                "name": key,
                "title": prop.get("title", key.replace("_", " ").title()),
                "description": prop.get("description", ""),
                "type": prop.get("type", "string"),
            }

            if "default" in prop:
                param["default"] = prop["default"]
            if "enum" in prop:
                param["type"] = "enum"
                param["options"] = prop["enum"]
            if "minimum" in prop:
                param["min"] = prop["minimum"]
            if "maximum" in prop:
                param["max"] = prop["maximum"]
            if "allOf" in prop:
                # Resolve $ref for enum types
                for ref in prop["allOf"]:
                    ref_path = ref.get("$ref", "")
                    ref_name = ref_path.split("/")[-1] if ref_path else ""
                    if ref_name:
                        ref_schema = schema.get("components", {}).get("schemas", {}).get(ref_name, {})
                        if "enum" in ref_schema:
                            param["type"] = "enum"
                            param["options"] = ref_schema["enum"]
                            param["description"] = ref_schema.get("description", param["description"])
                if "default" in prop:
                    param["default"] = prop["default"]

            params.append(param)

        return {
            "model_id": model_id,
            "params": params,
        }
    except Exception as e:
        return {"error": f"Failed to fetch schema: {str(e)}"}


@router.get("/budget", response_model=BudgetResponse)
async def get_budget(session: AsyncSession = Depends(get_session)):
    settings = await _get_all_settings(session)
    limit = float(settings["budget_limit"])
    spent = float(settings["budget_spent"])
    return BudgetResponse(limit=limit, spent=spent, remaining=max(0, limit - spent))
