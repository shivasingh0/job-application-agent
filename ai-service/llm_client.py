"""Unified LLM entrypoint — provider selected via AI_PROVIDER in .env."""

import os
from typing import Any

from pydantic import BaseModel

import gemini_client
import groq_client

VALID_PROVIDERS = ("gemini", "groq")


def get_provider() -> str:
    provider = os.getenv("AI_PROVIDER", "gemini").lower().strip()
    if provider not in VALID_PROVIDERS:
        raise RuntimeError(
            f"Invalid AI_PROVIDER={provider!r}. Use one of: {', '.join(VALID_PROVIDERS)}"
        )
    return provider


def _module():
    return groq_client if get_provider() == "groq" else gemini_client


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    return _module().generate_json(prompt, parts=parts)


def generate_typed(
    prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None
) -> BaseModel:
    return _module().generate_typed(prompt, schema, parts=parts)


def provider_info() -> dict[str, str]:
    provider = get_provider()
    if provider == "groq":
        return {
            "provider": "groq",
            "model": os.getenv("GROQ_MODEL", groq_client.DEFAULT_MODEL),
            "vision_model": os.getenv(
                "GROQ_VISION_MODEL", groq_client.DEFAULT_VISION_MODEL
            ),
        }
    return {
        "provider": "gemini",
        "model": os.getenv("GEMINI_MODEL", gemini_client.DEFAULT_MODEL),
    }
