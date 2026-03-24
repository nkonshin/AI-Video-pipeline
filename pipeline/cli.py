"""CLI interface for the AI Video Pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from pipeline.config import load_pipeline_config, load_env, PipelineConfig
from pipeline.generators.scenario_gen import (
    FruitSoapOperaGenerator,
    CharacterRemixGenerator,
    MascotContentGenerator,
)
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.utils.logger import get_logger

app = typer.Typer(
    name="videopipe",
    help="🎬 AI Video Pipeline — automated video production with multi-platform publishing",
    no_args_is_help=True,
)
console = Console()
log = get_logger("cli")


# ---------------------------------------------------------------------------
# Main pipeline command
# ---------------------------------------------------------------------------

@app.command()
def run(
    config: Path = typer.Argument(..., help="Path to YAML pipeline config file"),
    skip_images: bool = typer.Option(False, "--skip-images", help="Skip image generation"),
    skip_video: bool = typer.Option(False, "--skip-video", help="Skip video generation"),
    skip_tts: bool = typer.Option(False, "--skip-tts", help="Skip TTS generation"),
    skip_assembly: bool = typer.Option(False, "--skip-assembly", help="Skip video assembly"),
    skip_publish: bool = typer.Option(False, "--skip-publish", help="Skip publishing"),
    images_dir: Optional[Path] = typer.Option(None, "--images-dir", help="Pre-generated images dir"),
    videos_dir: Optional[Path] = typer.Option(None, "--videos-dir", help="Pre-generated videos dir"),
    audio_dir: Optional[Path] = typer.Option(None, "--audio-dir", help="Pre-generated audio dir"),
):
    """Run the full video production pipeline from a YAML config."""
    console.print(Panel("🎬 AI Video Pipeline", style="bold blue"))

    pipeline_config = load_pipeline_config(config)
    env = load_env()

    orchestrator = PipelineOrchestrator(pipeline_config, env)
    result = orchestrator.run(
        skip_images=skip_images,
        skip_video=skip_video,
        skip_tts=skip_tts,
        skip_assembly=skip_assembly,
        skip_publish=skip_publish,
        images_dir=images_dir,
        videos_dir=videos_dir,
        audio_dir=audio_dir,
    )

    # Print results
    console.print("\n")
    console.print(Panel("Results", style="bold green"))
    console.print_json(json.dumps(result, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------------------
# Scenario generation commands
# ---------------------------------------------------------------------------

@app.command()
def generate_scenario(
    type: str = typer.Argument(
        ..., help="Scenario type: fruit-soap, character-remix, mascot"
    ),
    output: Path = typer.Option("scenario.yaml", "-o", "--output", help="Output YAML file"),
    series_name: str = typer.Option("", "--series", help="Series name"),
    episode: int = typer.Option(1, "--episode", "-e", help="Episode number"),
    character: str = typer.Option("Шрек", "--character", "-c", help="Character name (for remix)"),
    context: int = typer.Option(0, "--context", help="Context index (for remix)"),
    business: str = typer.Option("недвижимость", "--business", "-b", help="Business type (for mascot)"),
    company: str = typer.Option("", "--company", help="Company name (for mascot)"),
    topic: int = typer.Option(0, "--topic", help="Topic index (for mascot)"),
):
    """Generate a scenario YAML file from built-in templates."""
    import yaml

    if type == "fruit-soap":
        gen = FruitSoapOperaGenerator()
        scenario = gen.generate(
            series_name=series_name or "Семейка Ягодок",
            episode_number=episode,
        )
    elif type == "character-remix":
        gen = CharacterRemixGenerator()
        scenario = gen.generate(
            character_name=character,
            context_index=context,
            episode_number=episode,
        )
    elif type == "mascot":
        gen = MascotContentGenerator()
        scenario = gen.generate(
            business_type=business,
            topic_index=topic,
            company_name=company,
            episode_number=episode,
        )
    else:
        console.print(f"[red]Unknown scenario type: {type}[/red]")
        console.print("Available: fruit-soap, character-remix, mascot")
        raise typer.Exit(1)

    # Wrap scenario in full pipeline config
    config_data = {
        "scenario": scenario.model_dump(),
        "image_model": {"model_id": "black-forest-labs/flux-1.1-pro"},
        "video_model": {"model_id": "minimax/video-01-live"},
        "tts": {"engine": "edge-tts", "voice": "ru-RU-DmitryNeural"},
        "subtitles": {"enabled": True},
        "publish_targets": [
            {"platform": "telegram", "enabled": True, "hashtags": ["нейросеть", "ии", "сериал"]},
            {"platform": "instagram", "enabled": True, "hashtags": ["нейросеть", "ии", "рек"]},
            {"platform": "youtube", "enabled": True, "hashtags": ["Shorts", "AI", "нейросеть"]},
            {"platform": "vk", "enabled": True, "hashtags": ["нейросеть", "ии"]},
            {"platform": "tiktok", "enabled": True, "hashtags": ["нейросеть", "ии", "тренд"]},
        ],
        "output_dir": "./output",
    }

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        yaml.dump(config_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

    console.print(f"[green]Scenario saved to {output}[/green]")
    console.print(f"  Series: {scenario.series_name}")
    console.print(f"  Episode {scenario.episode_number}: {scenario.title}")
    console.print(f"  Scenes: {len(scenario.scenes)}")
    console.print(f"\nRun the pipeline with:")
    console.print(f"  [bold]videopipe run {output}[/bold]")


# ---------------------------------------------------------------------------
# Batch generation
# ---------------------------------------------------------------------------

@app.command()
def batch(
    type: str = typer.Argument(..., help="Scenario type: fruit-soap, character-remix, mascot"),
    count: int = typer.Option(5, "-n", "--count", help="Number of episodes to generate"),
    output_dir: Path = typer.Option("./scenarios", "-o", "--output-dir", help="Output directory"),
    series_name: str = typer.Option("", "--series", help="Series name"),
    character: str = typer.Option("Шрек", "--character", "-c", help="Character (for remix)"),
    business: str = typer.Option("недвижимость", "--business", "-b", help="Business (for mascot)"),
    company: str = typer.Option("", "--company", help="Company name (for mascot)"),
):
    """Generate multiple episode scenario files at once."""
    import yaml

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print(f"[bold]Generating {count} episodes of type '{type}'...[/bold]\n")

    for ep in range(1, count + 1):
        if type == "fruit-soap":
            gen = FruitSoapOperaGenerator()
            scenario = gen.generate(
                series_name=series_name or "Семейка Ягодок",
                episode_number=ep,
            )
        elif type == "character-remix":
            gen = CharacterRemixGenerator()
            scenario = gen.generate(
                character_name=character,
                context_index=(ep - 1) % len(CharacterRemixGenerator.CONTEXTS),
                episode_number=ep,
            )
        elif type == "mascot":
            gen = MascotContentGenerator()
            biz_data = gen.BUSINESS_TYPES.get(business, {})
            topics = biz_data.get("topics", [{}])
            scenario = gen.generate(
                business_type=business,
                topic_index=(ep - 1) % len(topics),
                company_name=company,
                episode_number=ep,
            )
        else:
            console.print(f"[red]Unknown type: {type}[/red]")
            raise typer.Exit(1)

        config_data = {
            "scenario": scenario.model_dump(),
            "image_model": {"model_id": "black-forest-labs/flux-1.1-pro"},
            "video_model": {"model_id": "minimax/video-01-live"},
            "tts": {"engine": "edge-tts", "voice": "ru-RU-DmitryNeural"},
            "subtitles": {"enabled": True},
            "publish_targets": [
                {"platform": "telegram", "enabled": True},
                {"platform": "instagram", "enabled": True},
                {"platform": "youtube", "enabled": True},
                {"platform": "vk", "enabled": True},
                {"platform": "tiktok", "enabled": True},
            ],
            "output_dir": "./output",
        }

        fname = output_dir / f"episode_{ep:03d}.yaml"
        with open(fname, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

        console.print(f"  [green]✓[/green] Episode {ep}: {scenario.title} -> {fname}")

    console.print(f"\n[bold green]Done! Generated {count} scenarios in {output_dir}[/bold green]")
    console.print(f"Run them with: [bold]for f in {output_dir}/*.yaml; do videopipe run $f; done[/bold]")


# ---------------------------------------------------------------------------
# Info commands
# ---------------------------------------------------------------------------

@app.command()
def info():
    """Show available scenario types, characters, and business types."""
    table = Table(title="Available Scenario Types")
    table.add_column("Type", style="bold")
    table.add_column("Description")
    table.add_column("Key Options")

    table.add_row(
        "fruit-soap",
        "AI мультсериал с фруктами/овощами (тренд Инстаграм)",
        f"{len(FruitSoapOperaGenerator.PLOTLINES)} сюжетов",
    )
    table.add_row(
        "character-remix",
        "Известные персонажи в необычных контекстах",
        f"Персонажи: {', '.join(CharacterRemixGenerator.CHARACTERS.keys())}",
    )
    table.add_row(
        "mascot",
        "Маскот для бизнеса — брендированный контент",
        f"Бизнесы: {', '.join(MascotContentGenerator.available_businesses())}",
    )

    console.print(table)

    console.print("\n[bold]Примеры команд:[/bold]")
    console.print("  videopipe generate-scenario fruit-soap -o ep1.yaml")
    console.print("  videopipe generate-scenario character-remix -c Шрек --context 0 -o shrek.yaml")
    console.print("  videopipe generate-scenario mascot -b недвижимость --company 'Дом Мечты' -o mascot.yaml")
    console.print("  videopipe batch fruit-soap -n 10 -o ./episodes/")
    console.print("  videopipe run ep1.yaml")
    console.print("  videopipe run ep1.yaml --skip-publish  # generate video without publishing")


if __name__ == "__main__":
    app()
