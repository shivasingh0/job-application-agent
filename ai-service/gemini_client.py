import json
import os
from typing import Any

import google.generativeai as genai
from pydantic import BaseModel

DEFAULT_MODEL = "gemini-3.8-flash"


def _model() -> genai.GenerativeModel:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(os.getenv("GEMINI_MODEL", DEFAULT_MODEL))


import re
import time
import google.api_core.exceptions as g_exceptions


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    model = _model()
    content: list[Any] = [prompt]
    if parts:
        content.extend(parts)

    max_retries = 3
    response = None
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                content,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                ),
            )
            break
        except (g_exceptions.ResourceExhausted, g_exceptions.TooManyRequests) as exc:
            if attempt == max_retries - 1:
                raise
            match = re.search(r"retry in (\d+(?:\.\d+)?)s", str(exc)) or re.search(r"seconds:\s*(\d+)", str(exc))
            wait_time = (float(match.group(1)) + 1.0) if match else 20.0
            print(f"[Gemini 429] Rate limit reached. Waiting {wait_time:.1f}s before retry (attempt {attempt + 1}/{max_retries})...")
            time.sleep(min(wait_time, 35.0))

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
