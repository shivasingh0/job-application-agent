import base64
import json
import os
from io import BytesIO
from typing import Any

from groq import Groq, RateLimitError
from PIL import Image
from pydantic import BaseModel

DEFAULT_MODEL = "openai/gpt-oss-120b"
DEFAULT_FALLBACK_MODELS = [
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
DEFAULT_VISION_FALLBACK_MODELS = [
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
]

# Groq decommissioned Apr 2025 — auto-map old .env values
_DEPRECATED_VISION = {
    "llama-3.2-90b-vision-preview": DEFAULT_VISION_MODEL,
    "llama-3.2-11b-vision-preview": DEFAULT_VISION_MODEL,
}


def _client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


def get_models() -> list[str]:
    raw_models = os.getenv("GROQ_MODEL", DEFAULT_MODEL)
    raw_fallbacks = os.getenv("GROQ_FALLBACK_MODELS", "")

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


def get_vision_models() -> list[str]:
    raw_vision = os.getenv("GROQ_VISION_MODEL", DEFAULT_VISION_MODEL)
    raw_fallbacks = os.getenv("GROQ_VISION_FALLBACK_MODELS", "")

    models: list[str] = []
    for item in raw_vision.split(","):
        cleaned = _DEPRECATED_VISION.get(item.strip(), item.strip())
        if cleaned and cleaned not in models:
            models.append(cleaned)

    if raw_fallbacks:
        for item in raw_fallbacks.split(","):
            cleaned = _DEPRECATED_VISION.get(item.strip(), item.strip())
            if cleaned and cleaned not in models:
                models.append(cleaned)
    else:
        for default_m in DEFAULT_VISION_FALLBACK_MODELS:
            mapped = _DEPRECATED_VISION.get(default_m, default_m)
            if mapped not in models:
                models.append(mapped)

    return models


def _model() -> str:
    return get_models()[0]


def _vision_model() -> str:
    return get_vision_models()[0]


def _image_to_data_url(image: Image.Image) -> str:
    buf = BytesIO()
    rgb = image.convert("RGB")
    rgb.save(buf, format="JPEG")
    b64 = base64.standard_b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _is_rate_limit(exc: Exception) -> bool:
    err_str = str(exc).lower()
    return (
        isinstance(exc, RateLimitError)
        or "429" in err_str
        or "rate limit" in err_str
        or "quota" in err_str
        or "tokens per minute" in err_str
        or "requests per minute" in err_str
        or "tpm" in err_str
        or "rpm" in err_str
    )


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    client = _client()
    is_vision = bool(parts)
    models_to_try = get_vision_models() if is_vision else get_models()

    if is_vision:
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for part in parts or []:
            if isinstance(part, Image.Image):
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": _image_to_data_url(part)},
                    }
                )
            else:
                content.append({"type": "text", "text": str(part)})
        messages = [{"role": "user", "content": content}]
    else:
        messages = [{"role": "user", "content": prompt}]

    errors: list[str] = []
    for i, model in enumerate(models_to_try):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            if not response.choices:
                raise RuntimeError(f"Model '{model}' returned empty choices")

            text = response.choices[0].message.content
            if not text or not text.strip():
                raise RuntimeError(f"Model '{model}' returned empty content")

            return json.loads(text)

        except Exception as exc:
            err_msg = f"{model}: {type(exc).__name__} ({str(exc)[:120]})"
            errors.append(err_msg)
            next_model = models_to_try[i + 1] if i + 1 < len(models_to_try) else None
            reason = "rate limit/quota exceeded" if _is_rate_limit(exc) else "didn't respond or failed"

            if next_model:
                print(f"[Groq Fallback] Model '{model}' {reason}. Switching to fallback model '{next_model}'...")
            else:
                print(f"[Groq Error] Model '{model}' {reason}. No more Groq models to try.")

    raise RuntimeError(f"All Groq models failed. Attempts: {'; '.join(errors)}")


def generate_typed(
    prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None
) -> BaseModel:
    client = _client()
    is_vision = bool(parts)
    models_to_try = get_vision_models() if is_vision else get_models()

    if is_vision:
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for part in parts or []:
            if isinstance(part, Image.Image):
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": _image_to_data_url(part)},
                    }
                )
            else:
                content.append({"type": "text", "text": str(part)})
        messages = [{"role": "user", "content": content}]
    else:
        messages = [{"role": "user", "content": prompt}]

    errors: list[str] = []
    for i, model in enumerate(models_to_try):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            if not response.choices:
                raise RuntimeError(f"Model '{model}' returned empty choices")

            text = response.choices[0].message.content
            if not text or not text.strip():
                raise RuntimeError(f"Model '{model}' returned empty content")

            data = json.loads(text)
            return schema.model_validate(data)

        except Exception as exc:
            err_msg = f"{model}: {type(exc).__name__} ({str(exc)[:120]})"
            errors.append(err_msg)
            next_model = models_to_try[i + 1] if i + 1 < len(models_to_try) else None
            reason = "rate limit/quota exceeded" if _is_rate_limit(exc) else "didn't respond or failed"

            if next_model:
                print(f"[Groq Fallback] Model '{model}' {reason}. Switching to fallback model '{next_model}'...")
            else:
                print(f"[Groq Error] Model '{model}' {reason}. No more Groq models to try.")

    raise RuntimeError(f"All Groq models failed. Attempts: {'; '.join(errors)}")
