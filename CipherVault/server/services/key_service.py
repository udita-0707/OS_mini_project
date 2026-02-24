"""
SecureVault OS - Key Service
Manages encryption key generation and storage.
User master keys are encrypted before being stored in the database.

OS Security Concepts:
- Key Management: Never store plaintext keys
- Defense in Depth: Multiple layers of key protection
"""

import os
import base64
from extensions import db
from models.key_model import Key


def generate_master_key() -> bytes:
    """Generate a 256-bit random master key."""
    return os.urandom(32)


def store_encrypted_key(user_id: int, master_key: bytes):
    """
    Store an encrypted master key for a user.
    In a production system, this would be encrypted with a KMS key.
    Here we store it base64-encoded to demonstrate the concept.
    """
    existing = Key.query.filter_by(user_id=user_id).first()
    encoded_key = base64.b64encode(master_key)

    if existing:
        existing.encrypted_master_key = encoded_key
    else:
        new_key = Key(user_id=user_id, encrypted_master_key=encoded_key)
        db.session.add(new_key)

    db.session.commit()


def retrieve_master_key(user_id: int) -> bytes | None:
    """Retrieve the master key for a user."""
    key_record = Key.query.filter_by(user_id=user_id).first()
    if key_record:
        return base64.b64decode(key_record.encrypted_master_key)
    return None
