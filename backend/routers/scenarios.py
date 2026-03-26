"""Scenarios API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import Scenario
from backend.schemas import ScenarioCreate, ScenarioGenerate, ScenarioResponse, ScenarioUpdate
from backend.services.scenario_service import generate_scenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioResponse])
async def list_scenarios(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).order_by(Scenario.created_at.desc()))
    return result.scalars().all()


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(scenario_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.post("", response_model=ScenarioResponse, status_code=201)
async def create_scenario(body: ScenarioCreate, session: AsyncSession = Depends(get_session)):
    scenario = Scenario(name=body.name, content_type=body.content_type, config=body.config)
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(scenario_id: str, body: ScenarioUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(scenario, key, value)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}", status_code=204)
async def delete_scenario(scenario_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    await session.delete(scenario)
    await session.commit()


@router.post("/generate", response_model=ScenarioResponse)
async def generate_scenario_endpoint(body: ScenarioGenerate, session: AsyncSession = Depends(get_session)):
    try:
        config = generate_scenario(body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    scenario = Scenario(
        name=config.get("title", "Generated Scenario"),
        content_type=body.content_type,
        config=config,
    )
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)
    return scenario
