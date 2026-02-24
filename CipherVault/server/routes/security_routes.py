"""
SecureVault OS - Security Routes
Provides audit log access, security monitoring, file sharing, timeline, and IDS alerts.

Endpoints:
  GET  /api/security/audit-logs        - User's audit logs
  GET  /api/security/failed-logins     - Recent failed login attempts
  GET  /api/security/timeline          - Chronological security timeline
  GET  /api/security/ids-alerts        - Intrusion detection alerts
  POST /api/security/share             - Create a share link
  POST /api/security/share/access      - Access a shared file
"""

import secrets
import bcrypt
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
import io

from extensions import db
from models.file_model import File
from models.share_model import ShareLink
from services.audit_service import get_user_logs, get_failed_logins
from services.encryption_service import decrypt_file
from services.hash_service import verify_sha256
from services.audit_service import log_action
from utils.file_utils import read_encrypted_file

security_bp = Blueprint("security", __name__, url_prefix="/api/security")


@security_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def audit_logs():
    """Retrieve the current user's audit logs."""
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 50, type=int)
    logs = get_user_logs(user_id, limit=limit)
    return jsonify({"logs": [log.to_dict() for log in logs]}), 200


@security_bp.route("/failed-logins", methods=["GET"])
@jwt_required()
def failed_logins():
    """Retrieve recent failed login attempts (security monitoring)."""
    limit = request.args.get("limit", 20, type=int)
    logs = get_failed_logins(limit=limit)
    return jsonify({"failed_logins": [log.to_dict() for log in logs]}), 200


@security_bp.route("/timeline", methods=["GET"])
@jwt_required()
def security_timeline():
    """Chronological security timeline for the current user."""
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 100, type=int)
    logs = get_user_logs(user_id, limit=limit)
    return jsonify({
        "timeline": [log.to_dict() for log in logs],
        "count": len(logs),
    }), 200


@security_bp.route("/ids-alerts", methods=["GET"])
@jwt_required()
def ids_alerts_endpoint():
    """List intrusion detection alerts for the current user."""
    from services.ids_service import get_alerts
    user_id = int(get_jwt_identity())
    unresolved = request.args.get("unresolved", "false").lower() == "true"
    alerts = get_alerts(user_id=user_id, unresolved_only=unresolved)
    return jsonify({
        "alerts": [a.to_dict() for a in alerts],
        "count": len(alerts),
    }), 200


@security_bp.route("/share", methods=["POST"])
@jwt_required()
def create_share_link():
    """
    Create a secure share link for a file.
    Supports optional passphrase protection and expiry time.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()

    file_id = data.get("file_id")
    expiry_hours = data.get("expiry_hours", 24)
    passphrase = data.get("passphrase", None)

    if not file_id:
        return jsonify({"error": "file_id is required"}), 400

    file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    # Generate secure random token
    token = secrets.token_urlsafe(48)
    try:
        h = float(expiry_hours)
        if h <= 0:
            return jsonify({"error": "Expiry must be greater than 0 hours"}), 400
        expiry = datetime.now(timezone.utc) + timedelta(hours=h)
    except ValueError:
        return jsonify({"error": "Invalid expiry hours format"}), 400

    # Hash passphrase if provided
    passphrase_hash = None
    if passphrase:
        passphrase_hash = bcrypt.hashpw(
            passphrase.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

    share_link = ShareLink(
        file_id=file_id,
        token=token,
        expiry=expiry,
        passphrase_hash=passphrase_hash,
    )
    db.session.add(share_link)
    db.session.commit()

    log_action(user_id, "share", "success",
               f"Created share link for {file_record.filename}")

    return jsonify({
        "message": "Share link created",
        "share": share_link.to_dict(),
        "link": f"/share/{token}",
    }), 201


@security_bp.route("/share/access", methods=["POST"])
def access_shared_file():
    """
    Access a shared file using the share token.
    Requires the encryption passphrase to decrypt the file.
    If the share link has a passphrase, it must also be provided.
    """
    data = request.get_json()
    token = data.get("token", "")
    encryption_passphrase = data.get("encryption_passphrase", "")
    share_passphrase = data.get("share_passphrase", "")

    if not token or not encryption_passphrase:
        return jsonify({"error": "Token and encryption passphrase are required"}), 400

    share = ShareLink.query.filter_by(token=token).first()
    if not share:
        return jsonify({"error": "Invalid share link"}), 404

    # Check expiry
    share_expiry = share.expiry.replace(tzinfo=timezone.utc) if share.expiry.tzinfo is None else share.expiry
    if datetime.now(timezone.utc) > share_expiry:
        return jsonify({"error": "Share link has expired"}), 410

    # Check share passphrase if required
    if share.passphrase_hash:
        if not share_passphrase:
            return jsonify({"error": "This share link requires a passphrase"}), 401
        if not bcrypt.checkpw(share_passphrase.encode("utf-8"),
                              share.passphrase_hash.encode("utf-8")):
            return jsonify({"error": "Incorrect share passphrase"}), 401

    file_record = File.query.get(share.file_id)
    if not file_record:
        return jsonify({"error": "File no longer exists"}), 404

    # Read and decrypt
    try:
        ciphertext = read_encrypted_file(file_record.encrypted_path)
        plaintext = decrypt_file(
            ciphertext=ciphertext,
            passphrase=encryption_passphrase,
            algorithm=file_record.algorithm,
            salt=file_record.salt,
            nonce_or_iv=file_record.nonce_or_iv,
            tag=file_record.tag,
        )
    except Exception:
        return jsonify({"error": "Decryption failed. Wrong passphrase."}), 400

    # Integrity check
    if not verify_sha256(plaintext, file_record.hash_value):
        return jsonify({"error": "TAMPERING DETECTED"}), 403

    log_action(file_record.owner_id, "share_access", "success",
               f"Shared file {file_record.filename} accessed via token")

    return send_file(
        io.BytesIO(plaintext),
        download_name=file_record.filename,
        as_attachment=True,
    )
