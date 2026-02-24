"""
SecureVault OS - User Model
Stores user credentials and account security status.
Demonstrates: Authentication, Access Control, Account Lockout
"""

from extensions import db
from datetime import datetime, timezone


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime, nullable=True)
    failed_attempts = db.Column(db.Integer, default=0)
    is_locked = db.Column(db.Boolean, default=False)
    recovery_key_hash = db.Column(db.String(255), nullable=True)  # bcrypt hash of one-time recovery key

    # Relationships
    files = db.relationship("File", backref="owner", lazy="dynamic")
    keys = db.relationship("Key", backref="user", lazy="dynamic")
    audit_logs = db.relationship("AuditLog", backref="user", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "failed_attempts": self.failed_attempts,
            "is_locked": self.is_locked,
        }
