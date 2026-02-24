"""
SecureVault OS - Hash Service
Provides SHA-256 hashing for file integrity verification
and bcrypt hashing for password/passphrase storage.

OS Security Concepts:
- Integrity: SHA-256 hash detects tampering
- Authentication: bcrypt securely stores passwords
"""

import hashlib
import bcrypt


def sha256_hash(data: bytes) -> str:
    """
    Compute SHA-256 hash of file data.
    Used to verify file integrity after decryption —
    if hash doesn't match, the file was tampered with.
    """
    return hashlib.sha256(data).hexdigest()


def verify_sha256(data: bytes, expected_hash: str) -> bool:
    """Compare computed SHA-256 hash with the stored hash."""
    return sha256_hash(data) == expected_hash


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    bcrypt automatically generates a salt and includes it in the hash.
    Work factor of 12 makes brute-force attacks infeasible.
    """
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(
        password.encode("utf-8"), password_hash.encode("utf-8")
    )
