"""
SecureVault OS - Extensions Module
Initializes Flask extensions (SQLAlchemy, JWT, CORS, Redis)
to be shared across the application.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

# Redis client - initialized lazily to handle missing Redis gracefully
redis_client = None


def init_redis(app):
    """Initialize Redis client. Falls back to in-memory dict if Redis unavailable."""
    global redis_client
    try:
        import redis
        redis_client = redis.from_url(
            app.config.get("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
        )
        redis_client.ping()
        app.logger.info("Redis connected successfully.")
    except Exception:
        app.logger.warning(
            "Redis not available. Using in-memory fallback for rate limiting."
        )
        redis_client = InMemoryRedis()


class InMemoryRedis:
    """In-memory fallback when Redis is not available."""

    def __init__(self):
        self._store = {}
        self._expiry = {}

    def get(self, key):
        import time
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._store[key]
            del self._expiry[key]
            return None
        return self._store.get(key)

    def set(self, key, value, ex=None):
        import time
        self._store[key] = str(value)
        if ex:
            self._expiry[key] = time.time() + ex

    def setex(self, key, time_sec, value):
        self.set(key, value, ex=time_sec)

    def incr(self, key):
        val = int(self._store.get(key, 0)) + 1
        self._store[key] = str(val)
        return val

    def delete(self, key):
        self._store.pop(key, None)
        self._expiry.pop(key, None)

    def expire(self, key, seconds):
        import time
        self._expiry[key] = time.time() + seconds

    def ttl(self, key):
        import time
        if key in self._expiry:
            remaining = self._expiry[key] - time.time()
            return max(0, int(remaining))
        return -1

    def exists(self, key):
        import time
        if key in self._expiry and time.time() > self._expiry[key]:
            del self._store[key]
            del self._expiry[key]
            return 0
        return 1 if key in self._store else 0

    def ping(self):
        return True
