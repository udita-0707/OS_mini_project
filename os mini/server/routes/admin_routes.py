"""
SecureVault OS - Admin Routes
Administrative endpoints for system monitoring.

Endpoints:
  GET /api/admin/users         - List all users
  GET /api/admin/audit-logs    - All audit logs
  GET /api/admin/stats         - System-wide statistics
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.user_model import User
from models.file_model import File
from models.audit_model import AuditLog
from services.audit_service import get_all_logs

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    """List all registered users."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def all_audit_logs():
    """Retrieve all system audit logs."""
    limit = request.args.get("limit", 100, type=int)
    logs = get_all_logs(limit=limit)
    return jsonify({"logs": [log.to_dict() for log in logs]}), 200


@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def system_stats():
    """Get system-wide statistics."""
    user_count = User.query.count()
    file_count = File.query.count()
    audit_count = AuditLog.query.count()
    locked_users = User.query.filter_by(is_locked=True).count()

    # Algorithm distribution across all files
    algo_counts = {}
    files = File.query.all()
    for f in files:
        algo_counts[f.algorithm] = algo_counts.get(f.algorithm, 0) + 1

    return jsonify({
        "total_users": user_count,
        "total_files": file_count,
        "total_audit_entries": audit_count,
        "locked_accounts": locked_users,
        "algorithm_distribution": algo_counts,
    }), 200
