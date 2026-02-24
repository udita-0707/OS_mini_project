"""
SecureVault OS - Key Model
Stores encrypted master keys for users.
Demonstrates: Key Management, Confidentiality
"""

from extensions import db


class Key(db.Model):
    __tablename__ = "keys"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    encrypted_master_key = db.Column(db.LargeBinary, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
        }
