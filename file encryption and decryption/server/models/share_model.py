"""
SecureVault OS - Share Link Model
Stores secure file sharing links with optional passphrase protection.
Demonstrates: Authorization, Access Control, Time-Limited Access
"""

from extensions import db
from datetime import datetime, timezone


class ShareLink(db.Model):
    __tablename__ = "share_links"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id"), nullable=False, index=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    expiry = db.Column(db.DateTime, nullable=False)
    passphrase_hash = db.Column(db.String(255), nullable=True)  # bcrypt hash
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "file_id": self.file_id,
            "token": self.token,
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "has_passphrase": self.passphrase_hash is not None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
