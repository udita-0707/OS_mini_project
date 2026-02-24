"""
SecureVault OS - Encryption Service
Implements AES-256-GCM, AES-CBC, and ChaCha20 encryption/decryption.
Uses PBKDF2 for key derivation from user passphrase + random salt.

OS Security Concepts Demonstrated:
- Confidentiality: Files encrypted before being written to disk
- Key Derivation: PBKDF2 stretches user passphrase to a strong key
- Authenticated Encryption: AES-GCM provides both confidentiality and integrity
"""

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# Constants
PBKDF2_ITERATIONS = 600_000  # OWASP recommended minimum
KEY_LENGTH = 32  # 256 bits for AES-256
SALT_LENGTH = 32
NONCE_LENGTH_GCM = 12  # 96 bits for AES-GCM
IV_LENGTH_CBC = 16  # 128 bits for AES-CBC
NONCE_LENGTH_CHACHA = 12  # 96 bits for ChaCha20-Poly1305
CHUNK_SIZE = 64 * 1024  # 64 KB chunks for large file support


def generate_salt():
    """Generate a cryptographically secure random salt."""
    return os.urandom(SALT_LENGTH)


def derive_key(passphrase: str, salt: bytes) -> bytes:
    """
    Derive a 256-bit encryption key from a passphrase using PBKDF2-HMAC-SHA256.

    PBKDF2 (Password-Based Key Derivation Function 2):
    - Applies a pseudorandom function (HMAC-SHA256) iteratively
    - Salt prevents rainbow table attacks
    - High iteration count makes brute-force attacks computationally expensive
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_LENGTH,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
        backend=default_backend(),
    )
    return kdf.derive(passphrase.encode("utf-8"))


# ---------------------------------------------------------------------------
# AES-256-GCM (Galois/Counter Mode)
# Provides authenticated encryption: confidentiality + integrity + authenticity
# ---------------------------------------------------------------------------

def encrypt_aes_gcm(plaintext: bytes, passphrase: str):
    """
    Encrypt data using AES-256-GCM.
    Returns (ciphertext, salt, nonce, tag).
    """
    salt = generate_salt()
    key = derive_key(passphrase, salt)
    nonce = os.urandom(NONCE_LENGTH_GCM)

    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    # GCM appends the 16-byte tag to ciphertext
    actual_ciphertext = ciphertext[:-16]
    tag = ciphertext[-16:]

    return actual_ciphertext, salt, nonce, tag


def decrypt_aes_gcm(ciphertext: bytes, passphrase: str, salt: bytes, nonce: bytes, tag: bytes):
    """
    Decrypt AES-256-GCM encrypted data.
    Raises InvalidTag if data has been tampered with.
    """
    key = derive_key(passphrase, salt)
    aesgcm = AESGCM(key)

    # Re-combine ciphertext + tag as AESGCM expects
    combined = ciphertext + tag
    return aesgcm.decrypt(nonce, combined, None)


# ---------------------------------------------------------------------------
# AES-CBC (Cipher Block Chaining)
# Classic block cipher mode; requires PKCS7 padding
# ---------------------------------------------------------------------------

def encrypt_aes_cbc(plaintext: bytes, passphrase: str):
    """
    Encrypt data using AES-256-CBC with PKCS7 padding.
    Returns (ciphertext, salt, iv, None).
    """
    salt = generate_salt()
    key = derive_key(passphrase, salt)
    iv = os.urandom(IV_LENGTH_CBC)

    # Apply PKCS7 padding (AES-CBC requires block-aligned input)
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()

    return ciphertext, salt, iv, None


def decrypt_aes_cbc(ciphertext: bytes, passphrase: str, salt: bytes, iv: bytes, _tag=None):
    """
    Decrypt AES-256-CBC encrypted data and remove PKCS7 padding.
    """
    key = derive_key(passphrase, salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()

    # Remove PKCS7 padding
    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()

    return plaintext


# ---------------------------------------------------------------------------
# ChaCha20-Poly1305
# Stream cipher alternative to AES; fast on devices without AES hardware
# ---------------------------------------------------------------------------

def encrypt_chacha20(plaintext: bytes, passphrase: str):
    """
    Encrypt data using ChaCha20-Poly1305.
    Returns (ciphertext, salt, nonce, tag).
    """
    salt = generate_salt()
    key = derive_key(passphrase, salt)
    nonce = os.urandom(NONCE_LENGTH_CHACHA)

    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, plaintext, None)

    # Poly1305 appends 16-byte tag
    actual_ciphertext = ciphertext[:-16]
    tag = ciphertext[-16:]

    return actual_ciphertext, salt, nonce, tag


def decrypt_chacha20(ciphertext: bytes, passphrase: str, salt: bytes, nonce: bytes, tag: bytes):
    """
    Decrypt ChaCha20-Poly1305 encrypted data.
    """
    key = derive_key(passphrase, salt)
    chacha = ChaCha20Poly1305(key)

    combined = ciphertext + tag
    return chacha.decrypt(nonce, combined, None)


# ---------------------------------------------------------------------------
# Unified encrypt / decrypt interface
# ---------------------------------------------------------------------------
ALGORITHM_MAP = {
    "AES-GCM": (encrypt_aes_gcm, decrypt_aes_gcm),
    "AES-CBC": (encrypt_aes_cbc, decrypt_aes_cbc),
    "ChaCha20": (encrypt_chacha20, decrypt_chacha20),
}


def encrypt_file(data: bytes, passphrase: str, algorithm: str):
    """
    Encrypt file data with the chosen algorithm.
    Returns dict with ciphertext, salt, nonce_or_iv, tag.
    """
    if algorithm not in ALGORITHM_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    encrypt_fn, _ = ALGORITHM_MAP[algorithm]
    ciphertext, salt, nonce_or_iv, tag = encrypt_fn(data, passphrase)

    return {
        "ciphertext": ciphertext,
        "salt": salt,
        "nonce_or_iv": nonce_or_iv,
        "tag": tag,
    }


def decrypt_file(ciphertext: bytes, passphrase: str, algorithm: str,
                  salt: bytes, nonce_or_iv: bytes, tag: bytes = None):
    """
    Decrypt file data with the chosen algorithm.
    Returns the original plaintext bytes.
    """
    if algorithm not in ALGORITHM_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    _, decrypt_fn = ALGORITHM_MAP[algorithm]
    return decrypt_fn(ciphertext, passphrase, salt, nonce_or_iv, tag)
