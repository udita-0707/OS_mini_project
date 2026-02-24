"""
SecureVault OS - Authentication Routes
Handles user signup, login, token refresh, account lockout, and recovery key.

Endpoints:
  POST /api/auth/signup              - Register a new user
  POST /api/auth/login               - Authenticate and receive JWT
  POST /api/auth/refresh             - Refresh access token
  GET  /api/auth/me                  - Get current user profile
  POST /api/auth/recovery-key/verify - Verify recovery key for password reset
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import os

from extensions import db, redis_client
from models.user_model import User
from services.hash_service import hash_password, verify_password
from services.key_service import generate_master_key, store_encrypted_key
from services.audit_service import log_action
from utils.jwt_utils import generate_tokens

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MAX_FAILED_LOGINS = 5
LOCK_DURATION = 900  # 15 minutes


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user account."""
    data = request.get_json()

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Validation
    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Create user
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
    )
    db.session.add(user)
    db.session.commit()

    # Generate and store master encryption key for the user
    master_key = generate_master_key()
    store_encrypted_key(user.id, master_key)

    # Generate one-time recovery key (shown to user once, never stored in plaintext)
    recovery_key_raw = os.urandom(32).hex()
    user.recovery_key_hash = hash_password(recovery_key_raw)
    db.session.commit()

    # Audit log
    log_action(user.id, "signup", "success", f"User {username} registered")

    # Generate tokens
    tokens = generate_tokens(user.id, user.username)

    return jsonify({
        "message": "Account created successfully",
        "user": user.to_dict(),
        "recovery_key": recovery_key_raw,  # Shown ONCE — user must save offline
        **tokens,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and issue JWT tokens."""
    data = request.get_json()

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()

    if not user:
        log_action(None, "login", "failure", f"Unknown user: {username}")
        return jsonify({"error": "Invalid credentials"}), 401

    # Check account lockout via Redis
    lock_key = f"lock:{user.id}"
    if redis_client.exists(lock_key):
        ttl = redis_client.ttl(lock_key)
        log_action(user.id, "login", "failure", "Account is locked")
        return jsonify({
            "error": "Account is locked due to too many failed attempts",
            "retry_after_seconds": ttl,
        }), 423

    # Verify password
    if not verify_password(password, user.password_hash):
        # Increment failed attempts
        attempts_key = f"failed:{user.id}"
        attempts = redis_client.incr(attempts_key)
        redis_client.expire(attempts_key, LOCK_DURATION)

        user.failed_attempts = int(attempts)
        db.session.commit()

        if int(attempts) >= MAX_FAILED_LOGINS:
            # Lock the account
            redis_client.setex(lock_key, LOCK_DURATION, "locked")
            user.is_locked = True
            db.session.commit()
            log_action(user.id, "login", "failure", "Account locked after 5 failed attempts")
            return jsonify({
                "error": "Account locked due to too many failed attempts",
                "retry_after_seconds": LOCK_DURATION,
            }), 423

        remaining = MAX_FAILED_LOGINS - int(attempts)
        log_action(user.id, "login", "failure", f"Wrong password. {remaining} attempts left")
        return jsonify({
            "error": "Invalid credentials",
            "attempts_remaining": remaining,
        }), 401

    # Successful login - reset failed attempts
    redis_client.delete(f"failed:{user.id}")
    user.failed_attempts = 0
    user.is_locked = False
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    log_action(user.id, "login", "success", f"Login from {request.remote_addr}")

    tokens = generate_tokens(user.id, user.username)

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        **tokens,
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh an expired access token using a valid refresh token."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    tokens = generate_tokens(user.id, user.username)
    return jsonify(tokens), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_profile():
    """Get the current authenticated user's profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/recovery-key/verify", methods=["POST"])
def verify_recovery_key():
    """
    Verify a recovery key for password reset.
    If valid, allows the user to set a new password.
    """
    data = request.get_json()
    username = data.get("username", "").strip()
    recovery_key = data.get("recovery_key", "")
    new_password = data.get("new_password", "")

    if not username or not recovery_key or not new_password:
        return jsonify({"error": "username, recovery_key, and new_password are required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.recovery_key_hash:
        return jsonify({"error": "No recovery key set for this account"}), 400

    if not verify_password(recovery_key, user.recovery_key_hash):
        log_action(user.id, "recovery_key_verify", "failure", "Invalid recovery key")
        return jsonify({"error": "Invalid recovery key"}), 401

    # Reset password
    user.password_hash = hash_password(new_password)
    user.is_locked = False
    user.failed_attempts = 0
    db.session.commit()

    log_action(user.id, "recovery_key_verify", "success", "Password reset via recovery key")

    return jsonify({"message": "Password reset successful"}), 200
