"""
SecureVault OS v2 - File Lock Routes
Implements mutual exclusion (mutex) for concurrent file editing.

OS Concept: Like a kernel mutex, only one process (user) can hold
a write lock at a time. Others get read-only access. Locks auto-expire
to prevent deadlocks.
"""

from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.file_model import File
from models.file_lock_model import FileLock
from services.audit_service import log_action

lock_bp = Blueprint("locks", __name__, url_prefix="/api/files")

DEFAULT_LOCK_TIMEOUT_MINUTES = 15


@lock_bp.route("/<int:file_id>/lock", methods=["POST"])
@jwt_required()
def acquire_lock(file_id):
    """
    Acquire an exclusive write lock on a file.
    If the file is already locked by another user and the lock hasn't expired,
    the request is denied (mutex behavior).
    """
    user_id = int(get_jwt_identity())
    file_record = File.query.get(file_id)

    if not file_record:
        return jsonify({"error": "File not found"}), 404

    # Check ownership or room membership
    if file_record.owner_id != user_id and not file_record.room_id:
        return jsonify({"error": "Access denied"}), 403

    # Check existing lock
    existing_lock = FileLock.query.filter_by(file_id=file_id).first()
    if existing_lock:
        if existing_lock.is_expired():
            # Expired lock — reclaim it
            db.session.delete(existing_lock)
            db.session.flush()
        elif existing_lock.locked_by == user_id:
            # User already holds the lock — extend it
            existing_lock.expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=DEFAULT_LOCK_TIMEOUT_MINUTES
            )
            db.session.commit()
            return jsonify({
                "message": "Lock extended",
                "lock": existing_lock.to_dict(),
            }), 200
        else:
            # Another user holds the lock — mutual exclusion
            return jsonify({
                "error": "File is locked by another user",
                "lock": existing_lock.to_dict(),
            }), 409  # Conflict

    # Create new lock
    lock = FileLock(
        file_id=file_id,
        locked_by=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(
            minutes=DEFAULT_LOCK_TIMEOUT_MINUTES
        ),
    )
    db.session.add(lock)
    db.session.commit()

    log_action(user_id, "file_lock", request.remote_addr, "success",
               f"Acquired lock on file {file_id}")

    return jsonify({
        "message": "Lock acquired",
        "lock": lock.to_dict(),
    }), 200


@lock_bp.route("/<int:file_id>/lock", methods=["DELETE"])
@jwt_required()
def release_lock(file_id):
    """Release a write lock on a file. Only the lock holder can release it."""
    user_id = int(get_jwt_identity())

    lock = FileLock.query.filter_by(file_id=file_id).first()
    if not lock:
        return jsonify({"message": "No lock exists"}), 200

    if lock.locked_by != user_id and not lock.is_expired():
        return jsonify({"error": "Only the lock holder can release the lock"}), 403

    db.session.delete(lock)
    db.session.commit()

    log_action(user_id, "file_unlock", request.remote_addr, "success",
               f"Released lock on file {file_id}")

    return jsonify({"message": "Lock released"}), 200


@lock_bp.route("/<int:file_id>/lock", methods=["GET"])
@jwt_required()
def check_lock(file_id):
    """Check the lock status of a file."""
    lock = FileLock.query.filter_by(file_id=file_id).first()

    if not lock:
        return jsonify({"locked": False}), 200

    if lock.is_expired():
        db.session.delete(lock)
        db.session.commit()
        return jsonify({"locked": False, "note": "Previous lock expired"}), 200

    return jsonify({
        "locked": True,
        "lock": lock.to_dict(),
    }), 200
