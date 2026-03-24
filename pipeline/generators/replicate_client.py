"""Low-level Replicate API wrapper with retry logic and budget tracking."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import httpx
import replicate
from replicate.exceptions import ReplicateError

from pipeline.utils.logger import get_logger

log = get_logger(__name__)

# Approximate costs per model (USD) — used for budget tracking only
MODEL_COSTS: dict[str, float] = {
    "black-forest-labs/flux-1.1-pro": 0.04,
    "black-forest-labs/flux-dev": 0.025,
    "black-forest-labs/flux-schnell": 0.003,
    "stability-ai/sdxl": 0.01,
    "minimax/video-01-live": 0.35,
    "minimax/video-01": 0.50,
    "wavespeedai/wan-2.1-i2v-480p": 0.20,
    "kwaivgi/kling-v1.6-pro": 0.60,
    "lucataco/xtts-v2": 0.05,
    "jaaari/kokoro-82m": 0.02,
}


class BudgetExceeded(Exception):
    """Raised when the spending limit is reached."""


class ReplicateClient:
    """Wraps the Replicate Python SDK with retries, budget tracking, and file downloads."""

    def __init__(
        self,
        api_token: str | None = None,
        budget_limit: float = 50.0,
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ):
        self.api_token = api_token or os.environ.get("REPLICATE_API_TOKEN", "")
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN is required")

        self._client = replicate.Client(api_token=self.api_token)
        self._http = httpx.Client(timeout=300)

        self.budget_limit = budget_limit
        self.total_spent = 0.0
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    def _estimate_cost(self, model_id: str) -> float:
        """Estimate the cost of a single run for a model."""
        # Match by prefix to handle versioned model names
        for key, cost in MODEL_COSTS.items():
            if model_id.startswith(key):
                return cost
        return 0.10  # conservative default

    def _check_budget(self, model_id: str) -> None:
        estimated = self._estimate_cost(model_id)
        if self.total_spent + estimated > self.budget_limit:
            raise BudgetExceeded(
                f"Budget limit ${self.budget_limit:.2f} would be exceeded. "
                f"Spent so far: ${self.total_spent:.2f}, "
                f"estimated next call: ${estimated:.2f}"
            )

    def run(self, model_id: str, input_params: dict[str, Any]) -> Any:
        """Run a model on Replicate with retries and budget tracking.

        Returns the raw output from Replicate (usually a URL or list of URLs).
        """
        self._check_budget(model_id)

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                log.info(f"[Replicate] Running {model_id} (attempt {attempt})")
                output = self._client.run(model_id, input=input_params)
                cost = self._estimate_cost(model_id)
                self.total_spent += cost
                log.info(
                    f"[Replicate] Done. Estimated cost: ${cost:.3f} "
                    f"(total: ${self.total_spent:.2f})"
                )
                return output
            except ReplicateError as e:
                last_error = e
                log.warning(f"[Replicate] Error on attempt {attempt}: {e}")
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    log.info(f"[Replicate] Retrying in {delay:.1f}s...")
                    time.sleep(delay)
            except Exception as e:
                last_error = e
                log.error(f"[Replicate] Unexpected error: {e}")
                break

        raise RuntimeError(f"Replicate call failed after {self.max_retries} attempts: {last_error}")

    def download_output(self, url: str, dest: Path) -> Path:
        """Download a file from a Replicate output URL."""
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        log.info(f"[Download] {url} -> {dest}")
        with self._http.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_bytes(chunk_size=65536):
                    f.write(chunk)
        log.info(f"[Download] Saved {dest} ({dest.stat().st_size / 1024:.1f} KB)")
        return dest

    @property
    def budget_remaining(self) -> float:
        return max(0, self.budget_limit - self.total_spent)

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
