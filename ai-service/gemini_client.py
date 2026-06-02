import json
import os
from typing import Any

import google.generativeai as genai
from pydantic import BaseModel

DEFAULT_MODEL = "gemini-2.0-flash"


def _model() -> genai.GenerativeModel:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(os.getenv("GEMINI_MODEL", DEFAULT_MODEL))


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    model = _model()
    content: list[Any] = [prompt]
    if parts:
        content.extend(parts)

    response = model.generate_content(
        content,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
        ),
    )

    if not response.candidates:
        block = response.prompt_feedback
        reason = getattr(block, "block_reason", None) if block else None
        raise RuntimeError(
            f"Gemini returned no response{f' ({reason})' if reason else ''}"
        )

    text = response.text or "{}"
    return json.loads(text)


def generate_typed(prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None) -> BaseModel:
    data = generate_json(prompt, parts=parts)
    return schema.model_validate(data)
