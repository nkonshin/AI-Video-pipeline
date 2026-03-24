"""Centralized logging with Rich."""

from rich.console import Console
from rich.logging import RichHandler
import logging

console = Console()

def get_logger(name: str = "pipeline") -> logging.Logger:
    """Return a configured logger with Rich output."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = RichHandler(console=console, rich_tracebacks=True, show_path=False)
        handler.setLevel(logging.DEBUG)
        fmt = logging.Formatter("%(message)s", datefmt="[%X]")
        handler.setFormatter(fmt)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
    return logger
