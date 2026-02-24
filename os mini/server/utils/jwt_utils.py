"""
SecureVault OS - JWT Utilities
Provides helper functions for JWT token management.
"""

from flask_jwt_extended import create_access_token, create_refresh_token


def generate_tokens(user_id: int, username: str) -> dict:
    """Generate access and refresh JWT tokens for a user."""
    identity = str(user_id)
    additional_claims = {"username": username}

    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims=additional_claims,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
