"""Disk cache for fetched pages and LLM outputs, keyed by content hash.

Every fetch and every LLM call must go through this so re-runs cost nothing.
"""
import hashlib
import json
from pathlib import Path
from typing import Any, Callable

CACHE_DIR = Path("data/cache")


def _key_to_path(namespace: str, key: str) -> Path:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    folder = CACHE_DIR / namespace
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{digest}.json"


def get(namespace: str, key: str) -> Any | None:
    path = _key_to_path(namespace, key)
    if not path.exists():
        return None
    return json.loads(path.read_text())


def set(namespace: str, key: str, value: Any) -> None:
    path = _key_to_path(namespace, key)
    path.write_text(json.dumps(value, indent=2, default=str))


def cached(namespace: str, key: str, fn: Callable[[], Any]) -> Any:
    """Return the cached value for (namespace, key), computing and storing it via fn() on miss."""
    hit = get(namespace, key)
    if hit is not None:
        return hit
    value = fn()
    set(namespace, key, value)
    return value


def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
