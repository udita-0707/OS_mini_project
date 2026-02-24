"""
SecureVault OS v2 - Version Service
Manages file version history (journaling / snapshots).

OS Concept - Journaling File Systems:
Like ext4 or NTFS journals, every file modification creates a snapshot.
Previous versions are preserved, allowing point-in-time restore.
"""

import os
import uuid
import shutil

from extensions import db
from models.file_model import File
from models.file_version_model import FileVersion


def create_version_snapshot(file_record: File, user_id: int) -> FileVersion:
    """
    Save the current state of a file as a version snapshot before modification.
    Copies the current encrypted file to a versioned path.
    """
    # Copy the current encrypted file to a versioned path
    version_filename = f"{uuid.uuid4().hex}_v{file_record.current_version}.enc"
    version_dir = os.path.dirname(file_record.encrypted_path)
    version_path = os.path.join(version_dir, version_filename)

    if os.path.exists(file_record.encrypted_path):
        shutil.copy2(file_record.encrypted_path, version_path)

    version = FileVersion(
        file_id=file_record.id,
        version_number=file_record.current_version,
        encrypted_path=version_path,
        nonce_or_iv=file_record.nonce_or_iv,
        salt=file_record.salt,
        tag=file_record.tag,
        hash_value=file_record.hash_value,
        file_size=file_record.file_size,
        created_by=user_id,
    )
    db.session.add(version)
    db.session.commit()
    return version


def list_versions(file_id: int) -> list[FileVersion]:
    """List all versions of a file, ordered by version number descending."""
    return (
        FileVersion.query
        .filter_by(file_id=file_id)
        .order_by(FileVersion.version_number.desc())
        .all()
    )


def restore_version(file_id: int, version_number: int, user_id: int) -> File:
    """
    Restore a file to a previous version.
    1. Save current state as a new version snapshot
    2. Copy the target version's data over the current file
    3. Update file metadata to match the restored version
    """
    file_record = File.query.get(file_id)
    if not file_record:
        raise ValueError("File not found")

    target_version = FileVersion.query.filter_by(
        file_id=file_id, version_number=version_number
    ).first()
    if not target_version:
        raise ValueError(f"Version {version_number} not found")

    # Save current state as a snapshot before restoring
    create_version_snapshot(file_record, user_id)

    # Copy target version's encrypted file over current
    if os.path.exists(target_version.encrypted_path):
        shutil.copy2(target_version.encrypted_path, file_record.encrypted_path)

    # Update metadata
    file_record.nonce_or_iv = target_version.nonce_or_iv
    file_record.salt = target_version.salt
    file_record.tag = target_version.tag
    file_record.hash_value = target_version.hash_value
    file_record.file_size = target_version.file_size
    file_record.current_version += 1

    db.session.commit()
    return file_record
