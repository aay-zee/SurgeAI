"""
Embedding Service — local sentence-transformers for semantic similarity.
Uses all-MiniLM-L6-v2 (384-dim, ~90MB, runs on CPU, no API calls).
"""

import numpy as np

# Lazy-loaded model
_model = None


def _get_model():
    """Lazy-load the sentence transformer model."""
    global _model
    if _model is None:
        print("[Embedding] Loading all-MiniLM-L6-v2 model...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[Embedding] Model loaded.")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-embed a list of texts. Returns list of 384-dim vectors."""
    if not texts:
        return []
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.tolist()


def embed_single(text: str) -> list[float]:
    """Embed a single text string."""
    result = embed_texts([text])
    return result[0] if result else []


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    dot = np.dot(a_arr, b_arr)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))
