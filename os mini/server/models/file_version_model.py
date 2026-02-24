"""
SecureVault OS v2 - File Version Model
Maintains versioned snapshots of encrypted files.

OS Security Concept - Journaling / Snapshots:
Like a journaling file system, every modification creates a new version.
Previous versions are preserved, allowing point-in-time restore.
"""

from extensions import db
from datetime import datetime, timezone


class FileVersion(db.Model):
    __tablename__ = "file_versions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    encrypted_path = db.Column(db.String(512), nullable=False)
    nonce_or_iv = db.Column(db.LargeBinary, nullable=False)
    salt = db.Column(db.LargeBinary, nullable=False)
    tag = db.Column(db.LargeBinary, nullable=True)
    hash_value = db.Column(db.String(64), nullable=False)
    file_size = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    file = db.relationship("File", backref="versions")

    def to_dict(self):
        return {
            "id": self.id,
            "file_id": self.file_id,
            "version_number": self.version_number,
            "hash_value": self.hash_value,
            "file_size": self.file_size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by,
        }
