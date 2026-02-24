"""
SecureVault OS - Audit Service
Records all security-relevant actions for monitoring and compliance.

OS Security Concept - Auditing:
Every action (login, upload, decrypt, delete, share) is logged with
timestamp, user identity, IP address, and result status.
This provides non-repudiation and enables detection of suspicious activity.
"""

from extensions import db
from models.audit_model import AuditLog
from flask import request


def log_action(user_id: int | None, action: str, status: str = "success",
               details: str = None, ip_address: str = None):
    """
    Log a security-relevant action.

    Args:
        user_id: ID of the user performing the action (None for anonymous).
        action: Description of the action (e.g., 'login', 'upload', 'decrypt').
        status: 'success' or 'failure'.
        details: Optional additional context.
        ip_address: Client IP address. Auto-detected from Flask request if None.
    """
    if ip_address is None:
        try:
            ip_address = request.remote_addr
        except RuntimeError:
            ip_address = "unknown"

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        status=status,
        details=details,
    )
    db.session.add(log_entry)
    db.session.commit()


def get_user_logs(user_id: int, limit: int = 50):
    """Retrieve recent audit logs for a user."""
    return (
        AuditLog.query
        .filter_by(user_id=user_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )


def get_all_logs(limit: int = 100):
    """Retrieve all recent audit logs (admin only)."""
    return (
        AuditLog.query
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )


def get_failed_logins(limit: int = 20):
    """Retrieve recent failed login attempts for security monitoring."""
    return (
        AuditLog.query
        .filter_by(action="login", status="failure")
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
