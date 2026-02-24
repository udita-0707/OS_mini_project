"""
SecureVault OS v2 - Room Model
Implements encrypted collaboration rooms with role-based access control.

Tables: rooms, room_members, room_keys

OS Security Concepts:
- Protection Domains: Each room is an isolated security domain
- Access Control Matrix: role × permission mapping enforced per room
- Key Distribution: Room key encrypted separately for each member
"""

from extensions import db
from datetime import datetime, timezone


class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    members = db.relationship("RoomMember", backref="room", lazy="dynamic", cascade="all, delete-orphan")
    room_keys = db.relationship("RoomKey", backref="room", lazy="dynamic", cascade="all, delete-orphan")
    messages = db.relationship("ChatMessage", backref="room", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "member_count": self.members.count(),
        }


class RoomMember(db.Model):
    """Maps users to rooms with RBAC roles."""
    __tablename__ = "room_members"
    __table_args__ = (db.UniqueConstraint("room_id", "user_id", name="uq_room_user"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False, default="member")  # owner, admin, member, viewer
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="room_memberships")

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "role": self.role,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    "owner": 4,
    "admin": 3,
    "member": 2,
    "viewer": 1,
}


class RoomKey(db.Model):
    """
    Per-member encrypted copy of the room encryption key.
    The room key is encrypted using AES-256-GCM with the member's master key.
    The server NEVER stores the room key in plaintext.
    """
    __tablename__ = "room_keys"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    encrypted_room_key = db.Column(db.LargeBinary, nullable=False)
    nonce = db.Column(db.LargeBinary, nullable=False)
    tag = db.Column(db.LargeBinary, nullable=False)
