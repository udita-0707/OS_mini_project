"""
SecureVault OS v2 - Chat Message Model
Stores encrypted room messages. Server stores ONLY ciphertext.

OS Security Concept - Secure IPC (Inter-Process Communication):
Messages are encrypted client-side with the room key before transmission.
The server acts as a relay, storing only ciphertext it cannot read.
"""

from extensions import db
from datetime import datetime, timezone


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    encrypted_message = db.Column(db.LargeBinary, nullable=False)
    nonce = db.Column(db.LargeBinary, nullable=False)
    tag = db.Column(db.LargeBinary, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    sender = db.relationship("User", backref="chat_messages")

    def to_dict(self):
        import base64
        return {
            "id": self.id,
            "room_id": self.room_id,
            "sender_id": self.sender_id,
            "sender_username": self.sender.username if self.sender else None,
            "encrypted_message": base64.b64encode(self.encrypted_message).decode(),
            "nonce": base64.b64encode(self.nonce).decode(),
            "tag": base64.b64encode(self.tag).decode(),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
