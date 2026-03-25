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
    help="\ud83c\udfac AI Video Pipeline \u2014 automated video production with multi-platform publishing",
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
    console.print(Panel("\ud83c\udfac AI Video Pipeline", style="bold blue"))

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
    character: str = typer.Option("\u0428\u0440\u0435\u043a", "--character", "-c", help="Character name (for remix)"),
    context: int = typer.Option(0, "--context", help="Context index (for remix)"),
    business: str = typer.Option("\u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c", "--business", "-b", help="Business type (for mascot)"),
    company: str = typer.Option("", "--company", help="Company name (for mascot)"),
    topic: int = typer.Option(0, "--topic", help="Topic index (for mascot)"),
):
    """Generate a scenario YAML file from built-in templates."""
    import yaml

    if type == "fruit-soap":
        gen = FruitSoapOperaGenerator()
        scenario = gen.generate(
            series_name=series_name or "\u0421\u0435\u043c\u0435\u0439\u043a\u0430 \u042f\u0433\u043e\u0434\u043e\u043a",
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
        "video_model": {"model_id": "minimax/hailuo-2.3"},
        "tts": {"engine": "edge-tts", "voice": "ru-RU-DmitryNeural"},
        "subtitles": {"enabled": True},
        "publish_targets": [
            {"platform": "telegram", "enabled": True, "hashtags": ["\u043d\u0435\u0439\u0440\u043e\u0441\u0435\u0442\u044c", "\u0438\u0438", "\u0441\u0435\u0440\u0438\u0430\u043b"]},
            {"platform": "instagram", "enabled": True, "hashtags": ["\u043d\u0435\u0439\u0440\u043e\u0441\u0435\u0442\u044c", "\u0438\u0438", "\u0440\u0435\u043a"]},
            {"platform": "youtube", "enabled": True, "hashtags": ["Shorts", "AI", "\u043d\u0435\u0439\u0440\u043e\u0441\u0435\u0442\u044c"]},
            {"platform": "vk", "enabled": True, "hashtags": ["\u043d\u0435\u0439\u0440\u043e\u0441\u0435\u0442\u044c", "\u0438\u0438"]},
            {"platform": "tiktok", "enabled": True, "hashtags": ["\u043d\u0435\u0439\u0440\u043e\u0441\u0435\u0442\u044c", "\u0438\u0438", "\u0442\u0440\u0435\u043d\u0434"]},
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
    character: str = typer.Option("\u0428\u0440\u0435\u043a", "--character", "-c", help="Character (for remix)"),
    business: str = typer.Option("\u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c", "--business", "-b", help="Business (for mascot)"),
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
                series_name=series_name or "\u0421\u0435\u043c\u0435\u0439\u043a\u0430 \u042f\u0433\u043e\u0434\u043e\u043a",
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
            "video_model": {"model_id": "minimax/hailuo-2.3"},
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

        console.print(f"  [green]\u2713[/green] Episode {ep}: {scenario.title} -> {fname}")

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
        "AI \u043c\u0443\u043b\u044c\u0442\u0441\u0435\u0440\u0438\u0430\u043b \u0441 \u0444\u0440\u0443\u043a\u0442\u0430\u043c\u0438/\u043e\u0432\u043e\u0449\u0430\u043c\u0438 (\u0442\u0440\u0435\u043d\u0434 \u0418\u043d\u0441\u0442\u0430\u0433\u0440\u0430\u043c)",
        f"{len(FruitSoapOperaGenerator.PLOTLINES)} \u0441\u044e\u0436\u0435\u0442\u043e\u0432",
    )
    table.add_row(
        "character-remix",
        "\u0418\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0438 \u0432 \u043d\u0435\u043e\u0431\u044b\u0447\u043d\u044b\u0445 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430\u0445",
        f"\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0438: {', '.join(CharacterRemixGenerator.CHARACTERS.keys())}",
    )
    table.add_row(
        "mascot",
        "\u041c\u0430\u0441\u043a\u043e\u0442 \u0434\u043b\u044f \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u2014 \u0431\u0440\u0435\u043d\u0434\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0435\u043d\u0442",
        f"\u0411\u0438\u0437\u043d\u0435\u0441\u044b: {', '.join(MascotContentGenerator.available_businesses())}",
    )

    console.print(table)

    console.print("\n[bold]\u041f\u0440\u0438\u043c\u0435\u0440\u044b \u043a\u043e\u043c\u0430\u043d\u0434:[/bold]")
    console.print("  videopipe generate-scenario fruit-soap -o ep1.yaml")
    console.print("  videopipe generate-scenario character-remix -c \u0428\u0440\u0435\u043a --context 0 -o shrek.yaml")
    console.print("  videopipe generate-scenario mascot -b \u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c --company '\u0414\u043e\u043c \u041c\u0435\u0447\u0442\u044b' -o mascot.yaml")
    console.print("  videopipe batch fruit-soap -n 10 -o ./episodes/")
    console.print("  videopipe run ep1.yaml")
    console.print("  videopipe run ep1.yaml --skip-publish  # generate video without publishing")
    console.print("  videopipe web                           # launch web interface")


# ---------------------------------------------------------------------------
# Web server
# ---------------------------------------------------------------------------

@app.command()
def web(
    host: str = typer.Option("0.0.0.0", help="Host to bind"),
    port: int = typer.Option(8000, help="Port to listen on"),
):
    """Launch the web interface."""
    console.print(f"[bold green]Starting VideoFactory web UI on http://{host}:{port}[/bold green]")
    import uvicorn
    from pipeline.web.app import app as web_app
    uvicorn.run(web_app, host=host, port=port)


if __name__ == "__main__":
    app()
