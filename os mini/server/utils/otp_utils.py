"""
SecureVault OS - OTP Utilities
Generates and verifies one-time passwords, cached in Redis.
"""

import random
import string
from extensions import redis_client


def generate_otp(user_id: int, length: int = 6, expiry: int = 300) -> str:
    """
    Generate a numeric OTP, store it in Redis with expiry.

    Args:
        user_id: User requesting the OTP.
        length: Number of digits in the OTP.
        expiry: TTL in seconds (default 5 minutes).

    Returns:
        The generated OTP string.
    """
    otp = "".join(random.choices(string.digits, k=length))
    key = f"otp:{user_id}"
    redis_client.setex(key, expiry, otp)
    return otp


def verify_otp(user_id: int, otp: str) -> bool:
    """
    Verify an OTP against the cached value.
    Deletes the OTP after successful verification (single use).
    """
    key = f"otp:{user_id}"
    stored = redis_client.get(key)

    if stored and stored == otp:
        redis_client.delete(key)
        return True
    return False
