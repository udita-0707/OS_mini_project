"""
SecureVault OS v2 - IDS Alert Model
Stores intrusion detection system alerts.

OS Security Concept - Host-Based Intrusion Detection (HIDS):
Monitors user behavior patterns and flags anomalies such as
brute-force attacks, mass downloads, rapid deletions, and IP anomalies.
"""

from extensions import db
from datetime import datetime, timezone


class IDSAlert(db.Model):
    __tablename__ = "ids_alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    alert_type = db.Column(db.String(50), nullable=False)  # brute_force, mass_download, rapid_deletion, ip_anomaly
    severity = db.Column(db.String(20), nullable=False, default="medium")  # low, medium, high, critical
    details = db.Column(db.Text, nullable=True)
    resolved = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = db.relationship("User", backref="ids_alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "details": self.details,
            "resolved": self.resolved,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
