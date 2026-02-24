"""
SecureVault OS v2 - File Lock Model
Implements mutual exclusion for concurrent file access.

OS Security Concept - Concurrency Control:
Like a mutex/semaphore in an OS, only one user can hold a write lock
on a file at a time. Other users get read-only access.
The lock auto-expires after a timeout to prevent deadlock.
"""

from extensions import db
from datetime import datetime, timezone


class FileLock(db.Model):
    __tablename__ = "file_locks"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=False, unique=True, index=True)
    locked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    locked_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)

    user = db.relationship("User", backref="file_locks")
    file = db.relationship("File", backref="lock", uselist=False)

    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at

    def to_dict(self):
        return {
            "id": self.id,
            "file_id": self.file_id,
            "locked_by": self.locked_by,
            "locked_by_username": self.user.username if self.user else None,
            "locked_at": self.locked_at.isoformat() if self.locked_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_expired": self.is_expired(),
        }
