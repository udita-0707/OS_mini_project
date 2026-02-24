"""
SecureVault OS v2 - Version Routes
File versioning endpoints for creating snapshots and restoring previous versions.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.file_model import File
from services.version_service import create_version_snapshot, list_versions, restore_version
from services.audit_service import log_action

version_bp = Blueprint("versions", __name__, url_prefix="/api/files")


@version_bp.route("/<int:file_id>/versions", methods=["GET"])
@jwt_required()
def get_versions(file_id):
    """List all versions of a file."""
    user_id = int(get_jwt_identity())
    file_record = File.query.get(file_id)

    if not file_record:
        return jsonify({"error": "File not found"}), 404
    if file_record.owner_id != user_id:
        return jsonify({"error": "Access denied"}), 403

    versions = list_versions(file_id)
    return jsonify({
        "file_id": file_id,
        "current_version": file_record.current_version,
        "versions": [v.to_dict() for v in versions],
    }), 200


@version_bp.route("/<int:file_id>/versions", methods=["POST"])
@jwt_required()
def create_version(file_id):
    """Create a snapshot of the current file state (before re-uploading)."""
    user_id = int(get_jwt_identity())
    file_record = File.query.get(file_id)

    if not file_record:
        return jsonify({"error": "File not found"}), 404
    if file_record.owner_id != user_id:
        return jsonify({"error": "Access denied"}), 403

    try:
        version = create_version_snapshot(file_record, user_id)
        log_action(user_id, "version_create", request.remote_addr, "success",
                   f"Created version {version.version_number} of {file_record.filename}")
        return jsonify({
            "message": "Version snapshot created",
            "version": version.to_dict(),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@version_bp.route("/<int:file_id>/versions/<int:version_number>/restore", methods=["POST"])
@jwt_required()
def restore_file_version(file_id, version_number):
    """Restore a file to a previous version."""
    user_id = int(get_jwt_identity())
    file_record = File.query.get(file_id)

    if not file_record:
        return jsonify({"error": "File not found"}), 404
    if file_record.owner_id != user_id:
        return jsonify({"error": "Access denied"}), 403

    try:
        updated_file = restore_version(file_id, version_number, user_id)
        log_action(user_id, "version_restore", request.remote_addr, "success",
                   f"Restored {file_record.filename} to version {version_number}")
        return jsonify({
            "message": f"File restored to version {version_number}",
            "file": updated_file.to_dict(),
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
