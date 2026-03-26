"""Pydantic request/response schemas for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# --- Videos ---

class VideoCreate(BaseModel):
    title: str
    content_type: str
    scenario_config: dict[str, Any]
    skip_publish: bool = False

class PublicationResponse(BaseModel):
    id: str
    platform: str
    status: str
    post_url: str | None = None
    error_message: str | None = None
    published_at: datetime

    model_config = {"from_attributes": True}

class VideoResponse(BaseModel):
    id: str
    title: str
    content_type: str
    status: str
    scenario_config: dict[str, Any]
    cost: float
    output_path: str | None = None
    thumbnail_path: str | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    publications: list[PublicationResponse] = []

    model_config = {"from_attributes": True}

class VideoList(BaseModel):
    videos: list[VideoResponse]
    total: int


# --- Scenarios ---

class ScenarioCreate(BaseModel):
    name: str
    content_type: str
    config: dict[str, Any]

class ScenarioUpdate(BaseModel):
    name: str | None = None
    content_type: str | None = None
    config: dict[str, Any] | None = None

class ScenarioResponse(BaseModel):
    id: str
    name: str
    content_type: str
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ScenarioGenerate(BaseModel):
    content_type: str
    episode_number: int = 1
    character_name: str | None = None
    context_index: int = 0
    business_type: str | None = None
    company_name: str | None = None


# --- Publishing ---

class PlatformConfig(BaseModel):
    enabled: bool = True
    caption_template: str = ""
    hashtags: list[str] = Field(default_factory=list)
    credentials: dict[str, str] = Field(default_factory=dict)

class PlatformStatus(BaseModel):
    name: str
    connected: bool
    config: PlatformConfig

class PublishRequest(BaseModel):
    platforms: list[str]

class PublishLogEntry(BaseModel):
    id: str
    video_id: str
    video_title: str
    platform: str
    status: str
    post_url: str | None = None
    published_at: datetime

    model_config = {"from_attributes": True}


# --- Settings ---

class SettingsUpdate(BaseModel):
    replicate_api_token: str | None = None
    default_image_model: str | None = None
    default_video_model: str | None = None
    default_tts_engine: str | None = None
    default_tts_voice: str | None = None
    budget_limit: float | None = None
    output_dir: str | None = None

class SettingsResponse(BaseModel):
    replicate_api_token: str = ""
    default_image_model: str = "black-forest-labs/flux-dev"
    default_video_model: str = "minimax/hailuo-2.3"
    default_tts_engine: str = "edge-tts"
    default_tts_voice: str = "ru-RU-DmitryNeural"
    budget_limit: float = 50.0
    budget_spent: float = 0.0
    output_dir: str = "./output"

class BudgetResponse(BaseModel):
    limit: float
    spent: float
    remaining: float


# --- WebSocket ---

class PipelineProgress(BaseModel):
    job_id: str
    stage: str
    stage_label: str
    scene: int = 0
    total_scenes: int = 0
    percent: int = 0
    message: str = ""
    cost_so_far: float = 0.0
