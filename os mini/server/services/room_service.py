"""
SecureVault OS v2 - Room Service
Handles room lifecycle, member management, room key distribution, and RBAC.

Encryption Flow:
1. Room created → generate random 256-bit room_key
2. Encrypt room_key with owner's master_key using AES-256-GCM
3. Store encrypted room_key in room_keys table
4. When member added → encrypt room_key with their master_key
5. Server discards plaintext room_key from memory after distribution

OS Concepts:
- Protection Domains: each room is an isolated domain
- Access Control Matrix: role-based permissions per room
"""

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from extensions import db
from models.room_model import Room, RoomMember, RoomKey, ROLE_HIERARCHY
from services.key_service import retrieve_master_key


NONCE_LENGTH = 12  # 96-bit nonce for AES-GCM


def _encrypt_room_key(room_key: bytes, master_key: bytes) -> tuple:
    """Encrypt a room key with a user's master key using AES-256-GCM."""
    nonce = os.urandom(NONCE_LENGTH)
    aesgcm = AESGCM(master_key)
    ciphertext = aesgcm.encrypt(nonce, room_key, None)
    ct = ciphertext[:-16]
    tag = ciphertext[-16:]
    return ct, nonce, tag


def _decrypt_room_key(encrypted_room_key: bytes, nonce: bytes, tag: bytes,
                       master_key: bytes) -> bytes:
    """Decrypt a room key using a user's master key."""
    aesgcm = AESGCM(master_key)
    combined = encrypted_room_key + tag
    return aesgcm.decrypt(nonce, combined, None)


def create_room(owner_id: int, name: str, description: str = None) -> Room:
    """
    Create a room and distribute the room key to the owner.

    1. Generate random 256-bit room key
    2. Retrieve owner's master key
    3. Encrypt room key with owner's master key
    4. Store room, membership, and encrypted key
    5. Return room object (room key discarded from memory)
    """
    # Step 1: generate room key
    room_key = os.urandom(32)

    # Step 2: retrieve owner's master key
    master_key = retrieve_master_key(owner_id)
    if not master_key:
        raise ValueError("Owner has no master key")

    # Create room
    room = Room(name=name, description=description, owner_id=owner_id)
    db.session.add(room)
    db.session.flush()  # get room.id

    # Add owner as member
    membership = RoomMember(room_id=room.id, user_id=owner_id, role="owner")
    db.session.add(membership)

    # Step 3+4: encrypt room key for owner
    ct, nonce, tag = _encrypt_room_key(room_key, master_key)
    room_key_record = RoomKey(
        room_id=room.id,
        user_id=owner_id,
        encrypted_room_key=ct,
        nonce=nonce,
        tag=tag,
    )
    db.session.add(room_key_record)
    db.session.commit()

    # Step 5: room_key goes out of scope — never stored in plaintext
    return room


def add_member(room_id: int, user_id: int, role: str, adder_id: int):
    """
    Add a member to a room and distribute the room key to them.

    Flow:
    1. Verify the adder has permission (admin+)
    2. Decrypt room key using adder's master key
    3. Encrypt room key using new member's master key
    4. Store membership + encrypted key
    """
    # Permission check
    if not check_permission(room_id, adder_id, "admin"):
        raise PermissionError("Only admins and above can add members")

    # Check not already a member
    existing = RoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
    if existing:
        raise ValueError("User is already a member of this room")

    # Validate role
    if role not in ROLE_HIERARCHY or role == "owner":
        raise ValueError(f"Invalid role: {role}. Must be admin, member, or viewer")

    # Get adder's room key (decrypt with their master key)
    room_key = get_room_key(room_id, adder_id)

    # Get new member's master key
    member_master_key = retrieve_master_key(user_id)
    if not member_master_key:
        raise ValueError("Target user has no master key")

    # Encrypt room key for new member
    ct, nonce, tag = _encrypt_room_key(room_key, member_master_key)

    membership = RoomMember(room_id=room_id, user_id=user_id, role=role)
    db.session.add(membership)

    key_record = RoomKey(
        room_id=room_id,
        user_id=user_id,
        encrypted_room_key=ct,
        nonce=nonce,
        tag=tag,
    )
    db.session.add(key_record)
    db.session.commit()


def remove_member(room_id: int, user_id: int, remover_id: int):
    """Remove a member and delete their room key copy."""
    if not check_permission(room_id, remover_id, "admin"):
        raise PermissionError("Only admins and above can remove members")

    membership = RoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
    if not membership:
        raise ValueError("User is not a member")
    if membership.role == "owner":
        raise ValueError("Cannot remove the room owner")

    # Delete their room key
    RoomKey.query.filter_by(room_id=room_id, user_id=user_id).delete()
    db.session.delete(membership)
    db.session.commit()


def get_room_key(room_id: int, user_id: int) -> bytes:
    """Decrypt and return the room key for a member."""
    key_record = RoomKey.query.filter_by(room_id=room_id, user_id=user_id).first()
    if not key_record:
        raise PermissionError("No room key found — user is not a member")

    master_key = retrieve_master_key(user_id)
    if not master_key:
        raise ValueError("User has no master key")

    return _decrypt_room_key(
        key_record.encrypted_room_key,
        key_record.nonce,
        key_record.tag,
        master_key,
    )


def check_permission(room_id: int, user_id: int, required_role: str) -> bool:
    """
    Check if the user has the required role (or higher) in the room.
    Uses the ROLE_HIERARCHY: owner(4) > admin(3) > member(2) > viewer(1).
    """
    membership = RoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
    if not membership:
        return False

    user_level = ROLE_HIERARCHY.get(membership.role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


def get_user_rooms(user_id: int):
    """Get all rooms the user is a member of."""
    memberships = RoomMember.query.filter_by(user_id=user_id).all()
    rooms = []
    for m in memberships:
        room = Room.query.get(m.room_id)
        if room:
            d = room.to_dict()
            d["role"] = m.role
            rooms.append(d)
    return rooms
