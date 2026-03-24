#!/usr/bin/env bash
# ===========================================================
# Batch runner — generates and publishes multiple episodes
# ===========================================================
# Usage:
#   ./scripts/run_batch.sh fruit-soap 5
#   ./scripts/run_batch.sh character-remix 3
#   ./scripts/run_batch.sh mascot 2
# ===========================================================

set -euo pipefail

TYPE="${1:-fruit-soap}"
COUNT="${2:-5}"
SCENARIOS_DIR="./scenarios/${TYPE}"
LOG_DIR="./logs"

mkdir -p "$SCENARIOS_DIR" "$LOG_DIR"

echo "=== AI Video Pipeline Batch Runner ==="
echo "Type: $TYPE"
echo "Episodes: $COUNT"
echo ""

# Step 1: Generate scenarios
echo "[1/2] Generating $COUNT scenario files..."
videopipe batch "$TYPE" -n "$COUNT" -o "$SCENARIOS_DIR"
echo ""

# Step 2: Run pipeline for each scenario
echo "[2/2] Running pipeline for each episode..."
for yaml_file in "$SCENARIOS_DIR"/*.yaml; do
    episode=$(basename "$yaml_file" .yaml)
    echo ""
    echo "--- Processing: $episode ---"
    videopipe run "$yaml_file" 2>&1 | tee "$LOG_DIR/${episode}.log"
    echo "--- Done: $episode ---"
done

echo ""
echo "=== All episodes processed! ==="
echo "Logs saved in: $LOG_DIR/"
