#!/usr/bin/env python3
"""Generate a full series with sequential episodes and run the pipeline.

Usage:
    python scripts/generate_series.py --type fruit-soap --episodes 10
    python scripts/generate_series.py --type character-remix --character Шрек --episodes 3
    python scripts/generate_series.py --type mascot --business недвижимость --episodes 5

This script generates all scenario YAML files and then runs the pipeline
for each episode sequentially. Use --dry-run to only generate YAMLs.
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import yaml
from pipeline.generators.scenario_gen import (
    FruitSoapOperaGenerator,
    CharacterRemixGenerator,
    MascotContentGenerator,
)


def generate_scenarios(args) -> list[Path]:
    """Generate scenario YAML files."""
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    files = []
    for ep in range(1, args.episodes + 1):
        if args.type == "fruit-soap":
            gen = FruitSoapOperaGenerator()
            scenario = gen.generate(
                series_name=args.series or "Семейка Ягодок",
                episode_number=ep,
            )
        elif args.type == "character-remix":
            gen = CharacterRemixGenerator()
            scenario = gen.generate(
                character_name=args.character,
                context_index=(ep - 1) % len(CharacterRemixGenerator.CONTEXTS),
                episode_number=ep,
            )
        elif args.type == "mascot":
            gen = MascotContentGenerator()
            scenario = gen.generate(
                business_type=args.business,
                topic_index=(ep - 1) % len(
                    gen.BUSINESS_TYPES.get(args.business, {}).get("topics", [{}])
                ),
                company_name=args.company,
                episode_number=ep,
            )
        else:
            print(f"Unknown type: {args.type}")
            sys.exit(1)

        config_data = {
            "scenario": scenario.model_dump(),
            "image_model": {
                "model_id": args.image_model,
                "width": 1080,
                "height": 1920,
            },
            "video_model": {
                "model_id": args.video_model,
                "duration": 5,
            },
            "tts": {
                "engine": "edge-tts",
                "voice": args.voice,
            },
            "subtitles": {"enabled": True},
            "publish_targets": [
                {"platform": "telegram", "enabled": not args.skip_publish},
                {"platform": "instagram", "enabled": not args.skip_publish},
                {"platform": "youtube", "enabled": not args.skip_publish},
                {"platform": "vk", "enabled": not args.skip_publish},
                {"platform": "tiktok", "enabled": not args.skip_publish},
            ],
            "output_dir": "./output",
        }

        fname = output_dir / f"ep_{ep:03d}_{scenario.title.replace(' ', '_').lower()}.yaml"
        with open(fname, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

        print(f"  Generated: {fname} — {scenario.title}")
        files.append(fname)

    return files


def run_pipeline(yaml_files: list[Path], skip_publish: bool = False):
    """Run the pipeline for each YAML file."""
    for i, f in enumerate(yaml_files, 1):
        print(f"\n{'='*60}")
        print(f"Running episode {i}/{len(yaml_files)}: {f.name}")
        print(f"{'='*60}\n")

        cmd = ["videopipe", "run", str(f)]
        if skip_publish:
            cmd.append("--skip-publish")

        result = subprocess.run(cmd)
        if result.returncode != 0:
            print(f"\nWARNING: Episode {i} failed with exit code {result.returncode}")
            continue
        print(f"\nEpisode {i} completed successfully!")


def main():
    parser = argparse.ArgumentParser(description="Generate and run a full video series")
    parser.add_argument("--type", required=True, choices=["fruit-soap", "character-remix", "mascot"])
    parser.add_argument("--episodes", type=int, default=5)
    parser.add_argument("--series", default="")
    parser.add_argument("--character", default="Шрек")
    parser.add_argument("--business", default="недвижимость")
    parser.add_argument("--company", default="")
    parser.add_argument("--output-dir", default="./scenarios")
    parser.add_argument("--image-model", default="black-forest-labs/flux-1.1-pro")
    parser.add_argument("--video-model", default="minimax/hailuo-2.3")
    parser.add_argument("--voice", default="ru-RU-DmitryNeural")
    parser.add_argument("--skip-publish", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="Only generate YAMLs, don't run pipeline")

    args = parser.parse_args()

    print(f"🎬 Generating {args.episodes} episodes ({args.type})...\n")
    files = generate_scenarios(args)
    print(f"\n✅ Generated {len(files)} scenario files\n")

    if not args.dry_run:
        run_pipeline(files, skip_publish=args.skip_publish)
        print(f"\n🎉 All done! {len(files)} episodes processed.")
    else:
        print("Dry run — skipping pipeline execution.")
        print(f"Run manually: videopipe run <file.yaml>")


if __name__ == "__main__":
    main()
