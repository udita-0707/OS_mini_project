"""
SecureVault OS - File Model
Stores encrypted file metadata. The server NEVER stores plaintext files.
Demonstrates: Confidentiality, Integrity (SHA-256 hash verification)
"""

from extensions import db
from datetime import datetime, timezone


class File(db.Model):
    __tablename__ = "files"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=True, index=True)  # NULL = personal vault file
    filename = db.Column(db.String(255), nullable=False)
    encrypted_path = db.Column(db.String(512), nullable=False)
    algorithm = db.Column(db.String(50), nullable=False)  # AES-GCM, AES-CBC, ChaCha20
    nonce_or_iv = db.Column(db.LargeBinary, nullable=False)
    salt = db.Column(db.LargeBinary, nullable=False)
    tag = db.Column(db.LargeBinary, nullable=True)  # GCM auth tag
    hash_value = db.Column(db.String(64), nullable=False)  # SHA-256 hex digest
    file_size = db.Column(db.Integer, default=0)
    upload_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expiry_time = db.Column(db.DateTime, nullable=True)
    current_version = db.Column(db.Integer, default=1)

    # Relationships
    share_links = db.relationship("ShareLink", backref="file", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "filename": self.filename,
            "algorithm": self.algorithm,
            "hash_value": self.hash_value,
            "file_size": self.file_size,
            "upload_time": self.upload_time.isoformat() if self.upload_time else None,
            "expiry_time": self.expiry_time.isoformat() if self.expiry_time else None,
        }
