"""
SecureVault OS v2 - Intrusion Detection Service
Host-Based Intrusion Detection System (HIDS).

Detects anomalous behavior patterns:
- Brute force login attempts
- Mass file downloads
- Rapid file deletions
- Unusual IP address changes

OS Concept: HIDS monitors system events and flags security violations.
"""

from datetime import datetime, timezone, timedelta

from extensions import db
from models.audit_model import AuditLog
from models.ids_alert_model import IDSAlert
from models.user_model import User


def check_brute_force(user_id: int) -> IDSAlert | None:
    """
    Flag if there are >5 failed logins in the last 10 minutes.
    Demonstrates: detecting password guessing attacks.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    failed_count = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action == "login",
        AuditLog.status == "failure",
        AuditLog.timestamp >= cutoff,
    ).count()

    if failed_count > 5:
        existing = IDSAlert.query.filter(
            IDSAlert.user_id == user_id,
            IDSAlert.alert_type == "brute_force",
            IDSAlert.resolved == False,
            IDSAlert.timestamp >= cutoff,
        ).first()
        if not existing:
            alert = IDSAlert(
                user_id=user_id,
                alert_type="brute_force",
                severity="high",
                details=f"{failed_count} failed login attempts in 10 minutes",
            )
            db.session.add(alert)

            # Lock the account
            user = User.query.get(user_id)
            if user:
                user.is_locked = True

            db.session.commit()
            return alert
    return None


def check_mass_download(user_id: int) -> IDSAlert | None:
    """
    Flag if there are >20 file decryptions in the last 5 minutes.
    Could indicate data exfiltration.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    download_count = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action == "decrypt",
        AuditLog.status == "success",
        AuditLog.timestamp >= cutoff,
    ).count()

    if download_count > 20:
        existing = IDSAlert.query.filter(
            IDSAlert.user_id == user_id,
            IDSAlert.alert_type == "mass_download",
            IDSAlert.resolved == False,
            IDSAlert.timestamp >= cutoff,
        ).first()
        if not existing:
            alert = IDSAlert(
                user_id=user_id,
                alert_type="mass_download",
                severity="critical",
                details=f"{download_count} file downloads in 5 minutes — possible data exfiltration",
            )
            db.session.add(alert)
            db.session.commit()
            return alert
    return None


def check_rapid_deletion(user_id: int) -> IDSAlert | None:
    """
    Flag if there are >10 file deletions in the last 5 minutes.
    Could indicate ransomware or insider threat.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    delete_count = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action == "delete",
        AuditLog.status == "success",
        AuditLog.timestamp >= cutoff,
    ).count()

    if delete_count > 10:
        existing = IDSAlert.query.filter(
            IDSAlert.user_id == user_id,
            IDSAlert.alert_type == "rapid_deletion",
            IDSAlert.resolved == False,
            IDSAlert.timestamp >= cutoff,
        ).first()
        if not existing:
            alert = IDSAlert(
                user_id=user_id,
                alert_type="rapid_deletion",
                severity="critical",
                details=f"{delete_count} file deletions in 5 minutes — possible insider threat",
            )
            db.session.add(alert)
            db.session.commit()
            return alert
    return None


def check_ip_anomaly(user_id: int, current_ip: str) -> IDSAlert | None:
    """
    Flag if the current login IP differs from the last 5 successful logins.
    Indicates possible account compromise.
    """
    recent_logins = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action == "login",
        AuditLog.status == "success",
    ).order_by(AuditLog.timestamp.desc()).limit(5).all()

    if len(recent_logins) >= 3:
        recent_ips = {log.ip_address for log in recent_logins}
        if current_ip not in recent_ips:
            alert = IDSAlert(
                user_id=user_id,
                alert_type="ip_anomaly",
                severity="medium",
                details=f"Login from new IP {current_ip}. Recent IPs: {', '.join(recent_ips)}",
            )
            db.session.add(alert)
            db.session.commit()
            return alert
    return None


def run_ids_check(user_id: int, action: str, ip: str = None) -> list[IDSAlert]:
    """Run all relevant IDS checks based on the action and return any new alerts."""
    alerts = []

    if action == "login":
        a = check_brute_force(user_id)
        if a:
            alerts.append(a)
        if ip:
            a = check_ip_anomaly(user_id, ip)
            if a:
                alerts.append(a)
    elif action == "decrypt":
        a = check_mass_download(user_id)
        if a:
            alerts.append(a)
    elif action == "delete":
        a = check_rapid_deletion(user_id)
        if a:
            alerts.append(a)

    return alerts


def get_alerts(user_id: int = None, unresolved_only: bool = False, limit: int = 50):
    """Retrieve IDS alerts, optionally filtered by user and resolution status."""
    query = IDSAlert.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    if unresolved_only:
        query = query.filter_by(resolved=False)
    return query.order_by(IDSAlert.timestamp.desc()).limit(limit).all()
