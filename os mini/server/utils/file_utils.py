"""
SecureVault OS - File Utilities
Helper functions for file I/O operations.
"""

import os
from flask import current_app


def get_storage_dir() -> str:
    """Get the encrypted storage directory, creating it if necessary."""
    storage_dir = current_app.config["ENCRYPTED_STORAGE_DIR"]
    os.makedirs(storage_dir, exist_ok=True)
    return storage_dir


def save_encrypted_file(filename: str, data: bytes) -> str:
    """
    Save encrypted file data to the encrypted storage directory.
    Returns the full path to the saved file.
    """
    storage_dir = get_storage_dir()
    filepath = os.path.join(storage_dir, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    return filepath


def read_encrypted_file(filepath: str) -> bytes:
    """Read encrypted file data from disk."""
    with open(filepath, "rb") as f:
        return f.read()


def get_storage_usage(user_files) -> dict:
    """Calculate storage usage statistics for a user's files."""
    total_size = 0
    file_count = 0

    for f in user_files:
        if os.path.exists(f.encrypted_path):
            total_size += os.path.getsize(f.encrypted_path)
        file_count += 1

    return {
        "total_files": file_count,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
    }
