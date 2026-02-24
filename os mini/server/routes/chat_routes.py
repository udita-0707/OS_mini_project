"""
SecureVault OS v2 - Chat Routes
Encrypted room messaging (secure IPC).

Messages are encrypted client-side with the room key.
The server stores only ciphertext and acts as a relay.
"""

import base64

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.chat_model import ChatMessage
from services.room_service import check_permission
from services.audit_service import log_action

chat_bp = Blueprint("chat", __name__, url_prefix="/api/rooms")


@chat_bp.route("/<int:room_id>/chat", methods=["POST"])
@jwt_required()
def send_message(room_id):
    """
    Send an encrypted message to a room.
    Client-side encryption: message is encrypted with the room key before sending.
    Server stores only the ciphertext — zero-knowledge messaging.
    """
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "member"):
        return jsonify({"error": "Viewers cannot send messages"}), 403

    data = request.get_json()
    encrypted_message = data.get("encrypted_message")
    nonce = data.get("nonce")
    tag = data.get("tag")

    if not all([encrypted_message, nonce, tag]):
        return jsonify({"error": "encrypted_message, nonce, and tag are required"}), 400

    try:
        msg = ChatMessage(
            room_id=room_id,
            sender_id=user_id,
            encrypted_message=base64.b64decode(encrypted_message),
            nonce=base64.b64decode(nonce),
            tag=base64.b64decode(tag),
        )
        db.session.add(msg)
        db.session.commit()

        return jsonify({"message": "Message sent", "chat": msg.to_dict()}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@chat_bp.route("/<int:room_id>/chat", methods=["GET"])
@jwt_required()
def get_chat_history(room_id):
    """
    Get encrypted chat history for a room.
    Returns ciphertext — client must decrypt using the room key.
    """
    user_id = int(get_jwt_identity())
    if not check_permission(room_id, user_id, "viewer"):
        return jsonify({"error": "Access denied"}), 403

    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)

    messages = (
        ChatMessage.query
        .filter_by(room_id=room_id)
        .order_by(ChatMessage.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return jsonify({
        "room_id": room_id,
        "messages": [m.to_dict() for m in reversed(messages)],
        "count": len(messages),
    }), 200
