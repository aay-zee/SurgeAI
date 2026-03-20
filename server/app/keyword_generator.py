"""
Smart Keyword Generator — uses LLM to generate focused search queries
from a startup name + description, instead of naive comma-splitting.
"""

from .llm_client import call_llm, extract_json


_SYSTEM_PROMPT = (
    "You are a market research keyword expert. "
    "Generate focused search queries that people would actually type "
    "when looking for solutions to the described problem. "
    "Return ONLY a JSON array of strings, nothing else."
)

_USER_TEMPLATE = """Startup idea: {name}
Description: {description}
User-provided keywords: {raw_keywords}

Generate 6-8 focused search queries (2-5 words each) that would find:
- People complaining about the problem this startup solves
- Existing tools/products in this space
- Discussions about this pain point

Return ONLY a JSON array like: ["query 1", "query 2", ...]"""


def generate_search_keywords(
    name: str,
    description: str | None,
    raw_keywords: list[str],
) -> list[str]:
    """
    Generate focused search keywords using LLM.
    Falls back to original keywords if LLM fails.
    """
    try:
        user_prompt = _USER_TEMPLATE.format(
            name=name,
            description=description or "Not provided",
            raw_keywords=", ".join(raw_keywords) if raw_keywords else "None",
        )

        response = call_llm(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            max_tokens=300,
            temperature=0.7,
        )

        parsed = extract_json(response)

        if isinstance(parsed, list) and len(parsed) >= 3:
            # Filter to valid strings, 2-5 words each
            keywords = []
            for item in parsed:
                if isinstance(item, str):
                    cleaned = item.strip()
                    word_count = len(cleaned.split())
                    if 1 <= word_count <= 6 and len(cleaned) <= 100:
                        keywords.append(cleaned)

            if len(keywords) >= 3:
                return keywords[:8]

        print("[Keyword Gen] LLM response didn't parse well, using fallback")
    except Exception as e:
        print(f"[Keyword Gen] LLM failed: {e} — using original keywords")

    # Fallback: return original keywords as-is
    return [k.strip() for k in raw_keywords if k.strip()]
