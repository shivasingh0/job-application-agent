"""Unified LLM entrypoint — provider selected via AI_PROVIDER in .env with fallback support."""

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


def get_provider_order() -> list[str]:
    primary = get_provider()
    explicit_fallback = os.getenv("AI_FALLBACK_PROVIDER", "").lower().strip()
    if explicit_fallback in VALID_PROVIDERS and explicit_fallback != primary:
        return [primary, explicit_fallback]
    if explicit_fallback == "none":
        return [primary]

    # Auto-fallback to other provider if its API key is configured
    secondary = "gemini" if primary == "groq" else "groq"
    sec_key = "GEMINI_API_KEY" if secondary == "gemini" else "GROQ_API_KEY"
    if os.getenv(sec_key):
        return [primary, secondary]

    return [primary]


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    providers = get_provider_order()
    errors: list[str] = []

    for i, provider in enumerate(providers):
        mod = groq_client if provider == "groq" else gemini_client
        try:
            return mod.generate_json(prompt, parts=parts)
        except Exception as exc:
            errors.append(f"{provider}: {exc}")
            next_prov = providers[i + 1] if i + 1 < len(providers) else None
            if next_prov:
                print(
                    f"[LLM Client] Provider '{provider}' failed completely ({exc}). "
                    f"Falling back to provider '{next_prov}'..."
                )
            else:
                print(f"[LLM Client] Provider '{provider}' failed ({exc}).")

    raise RuntimeError(
        f"All AI providers and fallback models failed: {'; '.join(errors)}"
    )


def generate_typed(
    prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None
) -> BaseModel:
    providers = get_provider_order()
    errors: list[str] = []

    for i, provider in enumerate(providers):
        mod = groq_client if provider == "groq" else gemini_client
        try:
            return mod.generate_typed(prompt, schema, parts=parts)
        except Exception as exc:
            errors.append(f"{provider}: {exc}")
            next_prov = providers[i + 1] if i + 1 < len(providers) else None
            if next_prov:
                print(
                    f"[LLM Client] Provider '{provider}' failed completely ({exc}). "
                    f"Falling back to provider '{next_prov}'..."
                )
            else:
                print(f"[LLM Client] Provider '{provider}' failed ({exc}).")

    raise RuntimeError(
        f"All AI providers and fallback models failed: {'; '.join(errors)}"
    )


def provider_info() -> dict[str, Any]:
    providers = get_provider_order()
    primary = providers[0]
    fallback = providers[1] if len(providers) > 1 else None

    info: dict[str, Any] = {
        "provider": primary,
        "fallback_provider": fallback,
        "provider_chain": providers,
        "model": (
            groq_client.get_models()[0]
            if primary == "groq"
            else gemini_client.get_models()[0]
        ),
        "groq_models": groq_client.get_models(),
        "gemini_models": gemini_client.get_models(),
    }

    if "groq" in providers:
        info["groq_vision_models"] = groq_client.get_vision_models()

    return info
