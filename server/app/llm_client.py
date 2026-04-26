"""
Shared LLM Client — reusable wrapper around HuggingFace Router.
Auto-retry with exponential backoff, rate limiting, JSON extraction.
"""

import os
import time
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
_HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
_DEFAULT_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

# Rate limiter state
_last_call_time = 0.0


def call_llm(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    model: str | None = None,
) -> str:
    """
    Call HuggingFace Router with auto-retry and rate limiting.
    Returns the raw text response from the LLM.
    """
    global _last_call_time

    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN is not set in server/.env")

    # Rate limiting: 1 req/sec
    now = time.time()
    elapsed = now - _last_call_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or _DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    # Retry with exponential backoff: 1s, 2s, 4s
    last_error = None
    for attempt in range(3):
        try:
            _last_call_time = time.time()
            resp = requests.post(
                _HF_ROUTER_URL, headers=headers, json=payload, timeout=120
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            last_error = e
            wait = 2**attempt  # 1, 2, 4
            print(f"[LLM Client] Attempt {attempt + 1} failed: {e} — retrying in {wait}s")
            time.sleep(wait)

    raise RuntimeError(f"LLM call failed after 3 attempts: {last_error}")


def extract_json(text: str) -> dict | list | None:
    """
    Extract JSON from LLM response text.
    Strips markdown fences, finds JSON object/array, parses it.
    """
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned)

    # Try to find JSON object or array
    for pattern in [r"\{[\s\S]*\}", r"\[[\s\S]*\]"]:
        match = re.search(pattern, cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue

    # Last resort: try parsing the whole cleaned text
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        return None
