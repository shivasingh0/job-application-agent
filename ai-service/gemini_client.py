import json
import os
import re
import time
from typing import Any

import google.api_core.exceptions as g_exceptions
import google.generativeai as genai
from pydantic import BaseModel

DEFAULT_MODEL = "gemini-3.8-flash"
DEFAULT_FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
]


def get_models() -> list[str]:
    raw_models = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    raw_fallbacks = os.getenv("GEMINI_FALLBACK_MODELS", "")

    models: list[str] = []
    for item in raw_models.split(","):
        cleaned = item.strip()
        if cleaned and cleaned not in models:
            models.append(cleaned)

    if raw_fallbacks:
        for item in raw_fallbacks.split(","):
            cleaned = item.strip()
            if cleaned and cleaned not in models:
                models.append(cleaned)
    else:
        for default_m in DEFAULT_FALLBACK_MODELS:
            if default_m not in models:
                models.append(default_m)

    return models


def _model(model_name: str | None = None) -> genai.GenerativeModel:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    name = model_name or get_models()[0]
    return genai.GenerativeModel(name)


def _request_options() -> dict[str, Any]:
    timeout = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
    return {"retry": None, "timeout": timeout}


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    models_to_try = get_models()
    content: list[Any] = [prompt]
    if parts:
        content.extend(parts)

    errors: list[str] = []
    for i, model_name in enumerate(models_to_try):
        next_model = models_to_try[i + 1] if i + 1 < len(models_to_try) else None
        try:
            model = _model(model_name)
            response = model.generate_content(
                content,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                ),
                request_options=_request_options(),
            )

            if not response.candidates:
                block = getattr(response, "prompt_feedback", None)
                reason = getattr(block, "block_reason", None) if block else None
                raise RuntimeError(
                    f"Gemini returned no response{f' ({reason})' if reason else ''}"
                )

            text = response.text or "{}"
            if not text.strip():
                raise RuntimeError(f"Gemini model '{model_name}' returned empty text")

            return json.loads(text)

        except (g_exceptions.ResourceExhausted, g_exceptions.TooManyRequests) as exc:
            err_msg = f"{model_name}: Rate limit / quota exceeded ({exc})"
            errors.append(err_msg)
            if next_model:
                print(
                    f"[Gemini Fallback] Quota/rate limit exceeded on model '{model_name}'. "
                    f"Switching to fallback model '{next_model}'..."
                )
            else:
                print(
                    f"[Gemini Error] Quota/rate limit exceeded on model '{model_name}'. "
                    f"No more Gemini models to try."
                )

        except Exception as exc:
            err_msg = f"{model_name}: {type(exc).__name__} ({str(exc)[:120]})"
            errors.append(err_msg)
            if next_model:
                print(
                    f"[Gemini Fallback] Model '{model_name}' did not respond or failed ({exc}). "
                    f"Switching to fallback model '{next_model}'..."
                )
            else:
                print(
                    f"[Gemini Error] Model '{model_name}' did not respond or failed ({exc}). "
                    f"No more Gemini models to try."
                )

    raise RuntimeError(f"All Gemini models failed. Attempts: {'; '.join(errors)}")


def generate_typed(
    prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None
) -> BaseModel:
    models_to_try = get_models()
    content: list[Any] = [prompt]
    if parts:
        content.extend(parts)

    errors: list[str] = []
    for i, model_name in enumerate(models_to_try):
        next_model = models_to_try[i + 1] if i + 1 < len(models_to_try) else None
        try:
            model = _model(model_name)
            response = model.generate_content(
                content,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                ),
                request_options=_request_options(),
            )

            if not response.candidates:
                block = getattr(response, "prompt_feedback", None)
                reason = getattr(block, "block_reason", None) if block else None
                raise RuntimeError(
                    f"Gemini returned no response{f' ({reason})' if reason else ''}"
                )

            text = response.text or "{}"
            if not text.strip():
                raise RuntimeError(f"Gemini model '{model_name}' returned empty text")

            data = json.loads(text)
            return schema.model_validate(data)

        except (g_exceptions.ResourceExhausted, g_exceptions.TooManyRequests) as exc:
            err_msg = f"{model_name}: Rate limit / quota exceeded ({exc})"
            errors.append(err_msg)
            if next_model:
                print(
                    f"[Gemini Fallback] Quota/rate limit exceeded on model '{model_name}'. "
                    f"Switching to fallback model '{next_model}'..."
                )
            else:
                print(
                    f"[Gemini Error] Quota/rate limit exceeded on model '{model_name}'. "
                    f"No more Gemini models to try."
                )

        except Exception as exc:
            err_msg = f"{model_name}: {type(exc).__name__} ({str(exc)[:120]})"
            errors.append(err_msg)
            if next_model:
                print(
                    f"[Gemini Fallback] Model '{model_name}' did not respond or failed ({exc}). "
                    f"Switching to fallback model '{next_model}'..."
                )
            else:
                print(
                    f"[Gemini Error] Model '{model_name}' did not respond or failed ({exc}). "
                    f"No more Gemini models to try."
                )

    raise RuntimeError(f"All Gemini models failed. Attempts: {'; '.join(errors)}")
