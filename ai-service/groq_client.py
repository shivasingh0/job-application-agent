import base64
import json
import os
from io import BytesIO
from typing import Any

from groq import Groq
from PIL import Image
from pydantic import BaseModel

DEFAULT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

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


def _model() -> str:
    return os.getenv("GROQ_MODEL", DEFAULT_MODEL)


def _vision_model() -> str:
    raw = os.getenv("GROQ_VISION_MODEL", DEFAULT_VISION_MODEL)
    return _DEPRECATED_VISION.get(raw, raw)


def _image_to_data_url(image: Image.Image) -> str:
    buf = BytesIO()
    rgb = image.convert("RGB")
    rgb.save(buf, format="JPEG")
    b64 = base64.standard_b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def generate_json(prompt: str, *, parts: list[Any] | None = None) -> dict:
    client = _client()

    if parts:
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for part in parts:
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
        model = _vision_model()
    else:
        messages = [{"role": "user", "content": prompt}]
        model = _model()

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    text = response.choices[0].message.content or "{}"
    return json.loads(text)


def generate_typed(
    prompt: str, schema: type[BaseModel], *, parts: list[Any] | None = None
) -> BaseModel:
    data = generate_json(prompt, parts=parts)
    return schema.model_validate(data)
