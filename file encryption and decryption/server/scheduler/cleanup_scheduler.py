"""
SecureVault OS - Cleanup Scheduler
Runs a background task every 5 minutes to securely delete expired files.

OS Security Concept - Time-Limited Data:
Files can have an expiry time. Once expired, the scheduler securely
overwrites and removes them, preventing unauthorized access to stale data.
"""

from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler

from extensions import db
from models.file_model import File
from services.secure_delete_service import secure_delete_file
from services.audit_service import log_action


def cleanup_expired_files(app):
    """
    Find and securely delete all files past their expiry_time.
    Called periodically by the background scheduler.
    """
    with app.app_context():
        now = datetime.now(timezone.utc)
        expired_files = File.query.filter(
            File.expiry_time.isnot(None),
            File.expiry_time <= now,
        ).all()

        for file_record in expired_files:
            # Securely overwrite the file on disk
            secure_delete_file(file_record.encrypted_path)

            # Log the automatic deletion
            log_action(
                file_record.owner_id,
                "auto_delete",
                "success",
                f"Expired file {file_record.filename} securely deleted by scheduler",
            )

            # Remove database record
            db.session.delete(file_record)

        db.session.commit()

        if expired_files:
            app.logger.info(f"Scheduler: securely deleted {len(expired_files)} expired file(s)")


def start_scheduler(app):
    """Start the background cleanup scheduler."""
    scheduler = BackgroundScheduler()
    interval_minutes = app.config.get("CLEANUP_INTERVAL_MINUTES", 5)

    scheduler.add_job(
        func=cleanup_expired_files,
        trigger="interval",
        minutes=interval_minutes,
        args=[app],
        id="cleanup_expired_files",
        replace_existing=True,
    )

    scheduler.start()
    app.logger.info(f"Cleanup scheduler started (interval: {interval_minutes} min)")
    return scheduler
