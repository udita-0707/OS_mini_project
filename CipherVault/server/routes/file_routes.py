"""
SecureVault OS - File Routes
Handles file upload (encrypt), download (decrypt), listing, and deletion.

The server NEVER stores plaintext files.

Endpoints:
  POST   /api/files/upload     - Upload & encrypt a file
  POST   /api/files/decrypt/<id> - Decrypt & download a file
  GET    /api/files             - List user's files
  DELETE /api/files/<id>        - Securely delete a file
  GET    /api/files/stats       - Storage usage statistics
"""

import os
import uuid
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
import io

from extensions import db
from models.file_model import File
from services.encryption_service import encrypt_file, decrypt_file
from services.hash_service import sha256_hash, verify_sha256
from services.secure_delete_service import secure_delete_file
from services.audit_service import log_action
from utils.file_utils import save_encrypted_file, read_encrypted_file, get_storage_usage

file_bp = Blueprint("files", __name__, url_prefix="/api/files")


@file_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    """
    Upload & encrypt a file.

    Workflow:
    1. Read the uploaded file
    2. Generate random salt
    3. Derive encryption key using PBKDF2(passphrase + salt)
    4. Encrypt file with chosen algorithm (AES-GCM / AES-CBC / ChaCha20)
    5. Compute SHA-256 hash of original plaintext for integrity verification
    6. Save encrypted file to /encrypted_storage
    7. Store metadata in database
    """
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    uploaded_file = request.files["file"]
    passphrase = request.form.get("passphrase", "")
    algorithm = request.form.get("algorithm", "AES-GCM")
    expiry_hours = request.form.get("expiry_hours", None)

    if not passphrase:
        return jsonify({"error": "Encryption passphrase is required"}), 400

    if algorithm not in ("AES-GCM", "AES-CBC", "ChaCha20"):
        return jsonify({"error": "Invalid algorithm. Choose AES-GCM, AES-CBC, or ChaCha20"}), 400

    # Read file data
    plaintext = uploaded_file.read()
    original_filename = uploaded_file.filename

    # Step 5: Compute SHA-256 hash of original file for integrity checks
    file_hash = sha256_hash(plaintext)

    # Steps 2-4: Encrypt the file
    enc_result = encrypt_file(plaintext, passphrase, algorithm)

    # Step 6: Save encrypted file to disk
    storage_filename = f"{uuid.uuid4().hex}.enc"
    encrypted_path = save_encrypted_file(storage_filename, enc_result["ciphertext"])

    # Step 7: Store metadata in database
    expiry_time = None
    if (expiry_hours):
        try:
            h = float(expiry_hours)
            if h <= 0:
                return jsonify({"error": "Expiry hours must be greater than 0"}), 400
            expiry_time = datetime.now(timezone.utc) + timedelta(hours=h)
        except ValueError:
            pass

    file_record = File(
        owner_id=user_id,
        filename=original_filename,
        encrypted_path=encrypted_path,
        algorithm=algorithm,
        nonce_or_iv=enc_result["nonce_or_iv"],
        salt=enc_result["salt"],
        tag=enc_result["tag"],
        hash_value=file_hash,
        file_size=len(plaintext),
        expiry_time=expiry_time,
    )
    db.session.add(file_record)
    db.session.commit()

    log_action(user_id, "upload", "success",
               f"Uploaded {original_filename} using {algorithm}")

    return jsonify({
        "message": "File encrypted and stored successfully",
        "file": file_record.to_dict(),
    }), 201


@file_bp.route("/decrypt/<int:file_id>", methods=["POST"])
@jwt_required()
def decrypt_file_route(file_id):
    """
    Decrypt & download a file.

    Workflow:
    1. Verify JWT (done by decorator)
    2. Re-derive key using PBKDF2(passphrase + stored salt)
    3. Decrypt file
    4. Recompute SHA-256 of decrypted data
    5. Compare with stored hash — if mismatch, TAMPERING DETECTED
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    passphrase = data.get("passphrase", "")

    if not passphrase:
        return jsonify({"error": "Decryption passphrase is required"}), 400

    file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()
    if not file_record:
        log_action(user_id, "decrypt", "failure", f"File {file_id} not found")
        return jsonify({"error": "File not found"}), 404

    # Read encrypted data from disk
    try:
        ciphertext = read_encrypted_file(file_record.encrypted_path)
    except FileNotFoundError:
        return jsonify({"error": "Encrypted file missing from storage"}), 404

    # Decrypt
    try:
        plaintext = decrypt_file(
            ciphertext=ciphertext,
            passphrase=passphrase,
            algorithm=file_record.algorithm,
            salt=file_record.salt,
            nonce_or_iv=file_record.nonce_or_iv,
            tag=file_record.tag,
        )
    except Exception:
        log_action(user_id, "decrypt", "failure",
                   f"Decryption failed for {file_record.filename}. Wrong passphrase or corrupted data.")
        return jsonify({"error": "Decryption failed. Wrong passphrase or corrupted file."}), 400

    # Integrity check: verify SHA-256
    if not verify_sha256(plaintext, file_record.hash_value):
        log_action(user_id, "decrypt", "failure",
                   f"TAMPERING DETECTED for {file_record.filename}")
        return jsonify({
            "error": "TAMPERING DETECTED",
            "details": "SHA-256 hash mismatch. The file may have been modified.",
        }), 403

    log_action(user_id, "decrypt", "success",
               f"Decrypted {file_record.filename}")

    # Return the decrypted file
    return send_file(
        io.BytesIO(plaintext),
        download_name=file_record.filename,
        as_attachment=True,
    )


@file_bp.route("", methods=["GET"])
@jwt_required()
def list_files():
    """List all encrypted files belonging to the current user."""
    user_id = int(get_jwt_identity())
    files = File.query.filter_by(owner_id=user_id).order_by(File.upload_time.desc()).all()
    return jsonify({"files": [f.to_dict() for f in files]}), 200


@file_bp.route("/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    """
    Securely delete a file.
    Uses DoD 5220.22-M style overwrite to prevent forensic recovery.
    """
    user_id = int(get_jwt_identity())
    file_record = File.query.filter_by(id=file_id, owner_id=user_id).first()

    if not file_record:
        return jsonify({"error": "File not found"}), 404

    # Secure deletion: overwrite with random bytes before removing
    secure_delete_file(file_record.encrypted_path)

    db.session.delete(file_record)
    db.session.commit()

    log_action(user_id, "delete", "success",
               f"Securely deleted {file_record.filename}")

    return jsonify({"message": "File securely deleted"}), 200


@file_bp.route("/stats", methods=["GET"])
@jwt_required()
def file_stats():
    """Get storage usage statistics and algorithm distribution."""
    user_id = int(get_jwt_identity())
    files = File.query.filter_by(owner_id=user_id).all()

    usage = get_storage_usage(files)

    # Algorithm distribution
    algo_counts = {}
    for f in files:
        algo_counts[f.algorithm] = algo_counts.get(f.algorithm, 0) + 1

    return jsonify({
        "storage": usage,
        "algorithm_distribution": algo_counts,
    }), 200
