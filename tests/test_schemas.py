"""Schema validation tests."""

import pytest
from pydantic import ValidationError

from backend.schemas import (
    VideoCreate,
    VideoResponse,
    ScenarioCreate,
    ScenarioResponse,
    ScenarioGenerate,
    PlatformConfig,
    SettingsUpdate,
    PipelineProgress,
)


def test_video_create_minimal():
    v = VideoCreate(title="Test", content_type="custom", scenario_config={"scenes": []})
    assert v.title == "Test"
    assert v.content_type == "custom"


def test_video_create_with_all_fields():
    v = VideoCreate(
        title="Ep 1",
        content_type="fruit-soap",
        scenario_config={
            "scenario": {"title": "Ep 1", "scenes": [{"scene_id": "s1", "image_prompt": "test", "voiceover_text": "hi", "description": "d"}]},
            "image_model": {"model_id": "black-forest-labs/flux-dev"},
        },
        skip_publish=True,
    )
    assert v.skip_publish is True


def test_video_create_missing_title():
    with pytest.raises(ValidationError):
        VideoCreate(content_type="custom", scenario_config={})


def test_video_response_has_all_fields():
    v = VideoResponse(
        id="abc123",
        title="Test",
        content_type="custom",
        status="pending",
        scenario_config={},
        cost=0.0,
        output_path=None,
        thumbnail_path=None,
        error_message=None,
        created_at="2026-03-26T00:00:00Z",
        completed_at=None,
        publications=[],
    )
    assert v.id == "abc123"


def test_scenario_create():
    s = ScenarioCreate(name="My Scenario", content_type="fruit-soap", config={"scenes": []})
    assert s.name == "My Scenario"


def test_scenario_generate():
    g = ScenarioGenerate(content_type="fruit-soap", episode_number=3)
    assert g.episode_number == 3


def test_scenario_generate_character_remix():
    g = ScenarioGenerate(content_type="character-remix", character_name="Шрек", context_index=1)
    assert g.character_name == "Шрек"


def test_platform_config():
    p = PlatformConfig(enabled=True, hashtags=["test", "video"], caption_template="Hello {title}")
    assert p.enabled is True


def test_pipeline_progress():
    p = PipelineProgress(
        job_id="abc",
        stage="video_gen",
        stage_label="Video Generation",
        scene=2,
        total_scenes=4,
        percent=50,
        message="Generating...",
    )
    assert p.percent == 50
