"""Scenario generation service — wraps existing pipeline generators."""

from pipeline.generators.scenario_gen import (
    CharacterRemixGenerator,
    FruitSoapOperaGenerator,
    MascotContentGenerator,
    CatProgrammerGenerator,
)
from backend.schemas import ScenarioGenerate


def generate_scenario(request: ScenarioGenerate) -> dict:
    content_type = request.content_type

    if content_type == "fruit-soap":
        gen = FruitSoapOperaGenerator()
        scenario = gen.generate(episode_number=request.episode_number)
    elif content_type == "character-remix":
        gen = CharacterRemixGenerator()
        scenario = gen.generate(
            character_name=request.character_name or "Шрек",
            context_index=request.context_index,
            episode_number=request.episode_number,
        )
    elif content_type == "mascot":
        gen = MascotContentGenerator()
        scenario = gen.generate(
            business_type=request.business_type or "недвижимость",
            company_name=request.company_name or "",
            episode_number=request.episode_number,
        )
    elif content_type == "cat-programmer":
        gen = CatProgrammerGenerator()
        scenario = gen.generate(episode_number=request.episode_number)
    else:
        raise ValueError(f"Unknown content type: {content_type}")

    return scenario.model_dump()
