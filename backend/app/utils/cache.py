from typing import Optional, Any
from cachetools import TTLCache
import threading

# Initialize an in-memory cache: Max 1000 items, each living for 5 minutes by default
# Using a lock for thread-safety in the FastAPI/Uvicorn environment
_cache = TTLCache(maxsize=1000, ttl=300)
_lock = threading.Lock()

print("✅ In-memory cache (cachetools) initialized")

def get_cache_json(key: str) -> Optional[Any]:
    """Retrieve data from the in-memory cache."""
    with _lock:
        return _cache.get(key)

def set_cache_json(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """Store data in the in-memory cache. 
    Note: Using the global TTL (default 300s) specified at initialization.
    """
    with _lock:
        _cache[key] = value

