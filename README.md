# 🔐 OS Mini Project — Encrypted Security Suite

> A three-part operating systems course project demonstrating encryption, secure file storage, real-time encrypted chat, and OS security concepts — built across C, Python (Flask), and React/TypeScript.

---

## 🛠️ Project Overview

This project is divided into three self-contained but thematically unified components:

| Component | Tech Stack | Purpose |
| :--- | :--- | :--- |
| **C Encryption Tool** | C, OpenSSL, ncurses | POSIX syscalls, local file encryption |
| **CipherChat** | React, Firebase | Real-time E2EE chat with client-side crypto |
| **CipherVault** | React, Flask, SQLite | Full-stack encrypted file vault & security monitor |

All three share a unified encryption design: **AES-256-GCM** with **PBKDF2-SHA-256** key derivation.

---

## 📂 Repository Structure

```text
OS_MINI_PROJECT/
├── include/            # C Tool Headers
├── src/                # C Tool Source
├── cipherchat/         # Component 2 — React/Firebase Chat
├── ciphervault/        # Component 3 — Full-stack Vault
│   ├── client/         # React/TS Frontend
│   └── server/         # Flask/Python Backend
├── docs/               # Detailed Documentation
├── test/               # Test suites
├── Makefile            # Build rules for C Tool
└── README.md           # This file
```

---

## 1. 📟 C Encryption Tool (`encrypt_tool`)

A terminal application for military-grade file encryption using AES-256-GCM.

### Key Features
- **POSIX-based I/O**: Direct interaction with the OS kernel.
- **ncurses TUI**: Interactive full-screen menu interface.
- **Crypto Pipeline**: PBKDF2 key derivation + SHA-256 integrity verification.

### Quick Start
```bash
# Build
make

# Interactive Menu
./encrypt_tool --menu

# Direct CLI usage
./encrypt_tool -e -k "passphrase" -i input.txt -o output.enc
```

---

## 2. 💬 CipherChat

A real-time group chat application with a Discord-style UI. All messages are encrypted **client-side** before reaching the database.

### Key Features
- **Zero-Knowledge Architecture**: Firebase never sees your plaintext.
- **Emoji Cipher**: Fun, visual character substitution mode.
- **AES-256-GCM**: Cryptographic mode for real privacy.
- **Live Presence**: Heartbeat-based user status tracking.

### Setup
```bash
cd cipherchat
npm install
# Configure Firebase in .env (see cipherchat/.env.example if available)
npm run dev
```

---

## 3. 🛡️ CipherVault

A comprehensive encrypted document management system with an integrated Security Monitor.

### Key Features
- **Intrusion Detection (IDS)**: Real-time monitoring of failed login patterns.
- **Secure Deletion**: 3-pass random overwrite to prevent forensic recovery.
- **File Versioning**: Automated snapshots before modifications.
- **Visual OS Insights**: Real-time graph of system activity and threats.

### Setup
**Backend:**
```bash
cd ciphervault/server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd ciphervault/client
npm install
npm run dev
```

---

## 🏗️ Technical Specifications

### Encryption Standard
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2-HMAC-SHA256 (250,000+ iterations)
- **Integrity**: Random 12-byte IV + 16-byte GCM Auth Tag per file.

### OS Concepts Demonstrated
- **System Calls**: Direct `open`, `read`, `write` for atomic file operations.
- **Concurrency**: Resource synchronization via file locking mechanisms.
- **Audit Trails**: Non-repudiable logging of all security-sensitive events.
- **Memory Management**: Manual buffer control in C for performance.

---

## 📜 License
This project is part of an Operating Systems course and is intended for educational purposes.
