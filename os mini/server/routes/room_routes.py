"""
SecureVault OS v2 - Room Routes
CRUD for encrypted rooms, member management, and room file operations.
"""

import os
import uuid
import base64

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from io import BytesIO

from extensions import db
from models.room_model import Room, RoomMember
from models.file_model import File
from models.user_model import User
from services.room_service import (
    create_room, add_member, remove_member,
    get_room_key, check_permission, get_user_rooms,
)
from services.encryption_service import encrypt_file, decrypt_file
from services.hash_service import sha256_hash
from services.audit_service import log_action

room_bp = Blueprint("rooms", __name__, url_prefix="/api/rooms")


# ---------- Room CRUD ----------

@room_bp.route("", methods=["POST"])
@jwt_required()
def create_room_endpoint():
    """Create a new encrypted room."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    name = data.get("name")
    if not name:
        return jsonify({"error": "Room name is required"}), 400

    try:
        room = create_room(user_id, name, data.get("description"))
        log_action(user_id, "room_create", request.remote_addr, "success",
                   f"Created room: {name}")
        return jsonify({"message": "Room created", "room": room.to_dict()}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@room_bp.route("", methods=["GET"])
@jwt_required()
def list_rooms():
    """List all rooms the current user belongs to."""
    user_id = int(get_jwt_identity())
    rooms = get_user_rooms(user_id)
    return jsonify({"rooms": rooms}), 200


@room_bp.route("/<int:room_id>", methods=["GET"])
@jwt_required()
def get_room(room_id):
    """Get room details with member list."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "viewer"):
        return jsonify({"error": "Access denied"}), 403

    room = Room.query.get(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404

    members = [m.to_dict() for m in room.members.all()]
    result = room.to_dict()
    result["members"] = members
    return jsonify({"room": result}), 200


# ---------- Member Management ----------

@room_bp.route("/<int:room_id>/members", methods=["POST"])
@jwt_required()
def add_member_endpoint(room_id):
    """Add a member to the room (admin+ only)."""
    adder_id = int(get_jwt_identity())
    data = request.get_json()

    username = data.get("username")
    role = data.get("role", "member")

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        add_member(room_id, user.id, role, adder_id)
        log_action(adder_id, "room_add_member", request.remote_addr, "success",
                   f"Added {username} as {role} to room {room_id}")
        return jsonify({"message": f"{username} added as {role}"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@room_bp.route("/<int:room_id>/members/<int:member_id>", methods=["DELETE"])
@jwt_required()
def remove_member_endpoint(room_id, member_id):
    """Remove a member from the room (admin+ only)."""
    remover_id = int(get_jwt_identity())
    try:
        remove_member(room_id, member_id, remover_id)
        log_action(remover_id, "room_remove_member", request.remote_addr, "success",
                   f"Removed user {member_id} from room {room_id}")
        return jsonify({"message": "Member removed"}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@room_bp.route("/<int:room_id>/members/<int:member_id>", methods=["PATCH"])
@jwt_required()
def change_role_endpoint(room_id, member_id):
    """Change a member's role (owner only)."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "owner"):
        return jsonify({"error": "Only the owner can change roles"}), 403

    data = request.get_json()
    new_role = data.get("role")
    if new_role not in ("admin", "member", "viewer"):
        return jsonify({"error": "Invalid role"}), 400

    membership = RoomMember.query.filter_by(room_id=room_id, user_id=member_id).first()
    if not membership:
        return jsonify({"error": "Member not found"}), 404
    if membership.role == "owner":
        return jsonify({"error": "Cannot change owner role"}), 400

    membership.role = new_role
    db.session.commit()
    log_action(user_id, "room_role_change", request.remote_addr, "success",
               f"Changed user {member_id} role to {new_role} in room {room_id}")
    return jsonify({"message": f"Role changed to {new_role}"}), 200


# ---------- Room Files ----------

@room_bp.route("/<int:room_id>/files/upload", methods=["POST"])
@jwt_required()
def upload_room_file(room_id):
    """Upload and encrypt a file using the room key."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "member"):
        return jsonify({"error": "Viewers cannot upload files"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    algorithm = request.form.get("algorithm", "AES-GCM")
    passphrase = request.form.get("passphrase", "")

    try:
        # Get room key and use it as part of the passphrase
        room_key = get_room_key(room_id, user_id)
        room_key_hex = room_key.hex()
        combined_passphrase = room_key_hex + passphrase

        file_data = file.read()
        original_hash = sha256_hash(file_data)

        # Encrypt with room key + optional passphrase
        result = encrypt_file(file_data, combined_passphrase, algorithm)

        # Save encrypted file
        enc_filename = f"{uuid.uuid4().hex}.enc"
        enc_path = os.path.join(current_app.config["ENCRYPTED_STORAGE_DIR"], enc_filename)
        with open(enc_path, "wb") as f:
            f.write(result["ciphertext"])

        # Store metadata
        file_record = File(
            owner_id=user_id,
            room_id=room_id,
            filename=file.filename,
            encrypted_path=enc_path,
            algorithm=algorithm,
            nonce_or_iv=result["nonce_or_iv"],
            salt=result["salt"],
            tag=result["tag"] or b"",
            hash_value=original_hash,
            file_size=len(file_data),
        )
        db.session.add(file_record)
        db.session.commit()

        log_action(user_id, "room_upload", request.remote_addr, "success",
                   f"Uploaded {file.filename} to room {room_id}")

        return jsonify({
            "message": "File encrypted and uploaded to room",
            "file": file_record.to_dict(),
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@room_bp.route("/<int:room_id>/files", methods=["GET"])
@jwt_required()
def list_room_files(room_id):
    """List all files in a room."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "viewer"):
        return jsonify({"error": "Access denied"}), 403

    files = File.query.filter_by(room_id=room_id).all()
    return jsonify({"files": [f.to_dict() for f in files]}), 200


@room_bp.route("/<int:room_id>/files/<int:file_id>/decrypt", methods=["POST"])
@jwt_required()
def decrypt_room_file(room_id, file_id):
    """Decrypt and download a room file."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "viewer"):
        return jsonify({"error": "Access denied"}), 403

    file_record = File.query.filter_by(id=file_id, room_id=room_id).first()
    if not file_record:
        return jsonify({"error": "File not found in this room"}), 404

    passphrase = request.json.get("passphrase", "") if request.is_json else ""

    try:
        room_key = get_room_key(room_id, user_id)
        combined_passphrase = room_key.hex() + passphrase

        with open(file_record.encrypted_path, "rb") as f:
            ciphertext = f.read()

        plaintext = decrypt_file(
            ciphertext, combined_passphrase, file_record.algorithm,
            file_record.salt, file_record.nonce_or_iv, file_record.tag,
        )

        # Integrity check
        computed_hash = sha256_hash(plaintext)
        if computed_hash != file_record.hash_value:
            log_action(user_id, "room_decrypt", request.remote_addr, "failure",
                       "TAMPERING DETECTED")
            return jsonify({"error": "TAMPERING DETECTED"}), 403

        log_action(user_id, "room_decrypt", request.remote_addr, "success",
                   f"Decrypted {file_record.filename} from room {room_id}")

        return send_file(
            BytesIO(plaintext),
            download_name=file_record.filename,
            as_attachment=True,
        )
    except Exception as e:
        log_action(user_id, "room_decrypt", request.remote_addr, "failure", str(e))
        return jsonify({"error": f"Decryption failed: {str(e)}"}), 400


@room_bp.route("/<int:room_id>/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_room_file(room_id, file_id):
    """Securely delete a room file (admin+ only)."""
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "admin"):
        return jsonify({"error": "Only admins can delete files"}), 403

    file_record = File.query.filter_by(id=file_id, room_id=room_id).first()
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    from services.secure_delete_service import secure_delete
    secure_delete(file_record.encrypted_path)

    db.session.delete(file_record)
    db.session.commit()

    log_action(user_id, "room_delete", request.remote_addr, "success",
               f"Securely deleted {file_record.filename} from room {room_id}")

    return jsonify({"message": "File securely deleted"}), 200
