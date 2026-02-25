# 🔐 OS Mini Project — Encrypted Security Suite

> A three-part operating systems course project demonstrating encryption, secure file storage, real-time encrypted chat, and OS security concepts — built across C, Python (Flask), and React/TypeScript.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Component 1 — C Encryption Tool](#component-1--c-encryption-tool)
- [Component 2 — CipherChat](#component-2--cipherchat)
- [Component 3 — CipherVault](#component-3--ciphervault)
  - [Frontend (React/TypeScript)](#frontend-reacttypescript)
  - [Backend (Flask/Python)](#backend-flaskpython)
- [Shared Encryption Design](#shared-encryption-design)
- [Setup & Running](#setup--running)
- [OS Concepts Demonstrated](#os-concepts-demonstrated)

---

## Project Overview

This project is divided into three self-contained but thematically unified components, each building on the last:

| # | Component | Stack | Purpose |
|---|---|---|---|
| 1 | **C Encryption Tool** | C, OpenSSL, ncurses | Core OS concepts — POSIX syscalls, AES-256-GCM from scratch |
| 2 | **CipherChat** | React, Firebase | Real-time encrypted group chat with client-side crypto |
| 3 | **CipherVault** | React + Flask + SQLite | Full-stack encrypted file vault with security monitoring |

All three share the same underlying encryption design: **AES-256-GCM** with **PBKDF2-SHA-256** key derivation, and the same binary payload header format (`FENC` magic bytes).

---

## Repository Structure

```
OS_MINI_PROJECT/
│
├── cipherchat/                         # Component 2 — Real-time encrypted chat
│   ├── index.html                      # Dev entry point
│   ├── src/
│   │   ├── App.js                      # Root component, channel/modal state
│   │   ├── Chat.js                     # Message list, send/receive, search
│   │   ├── Sidebar.js                  # Channel list, user bar
│   │   ├── channels.js                 # Default channel definitions
│   │   ├── ciphers.js                  # All crypto: Emoji cipher + AES-256-GCM
│   │   └── db.js                       # Firebase wrappers (push, set, onValue)
│   └── dist/
│       ├── index.html
│       ├── cipherchat.12dffa79.js      # Production bundle
│       └── cipherchat.12dffa79.js.map
│
├── ciphervault/                        # Component 3 — Encrypted file vault
│   ├── client/                         # React/TypeScript frontend
│   │   ├── index.html
│   │   └── src/
│   │       ├── api.ts                  # Axios instance + all API calls
│   │       ├── App.tsx                 # Routes + ProtectedRoute guard
│   │       ├── index.css               # Tailwind + custom design system
│   │       ├── main.tsx                # Entry point
│   │       ├── components/
│   │       │   └── Layout.tsx          # Sidebar nav shell
│   │       ├── context/
│   │       │   └── AuthContext.tsx     # Global auth state (JWT)
│   │       └── pages/
│   │           ├── DashboardPage.tsx
│   │           ├── LandingPage.tsx
│   │           ├── LoginPage.tsx
│   │           ├── OSVisualizerPage.tsx
│   │           ├── RansomwareDemoPage.tsx
│   │           ├── RegisterPage.tsx
│   │           ├── RoomDetailPage.tsx
│   │           ├── RoomsPage.tsx
│   │           ├── SecurityMonitorPage.tsx
│   │           ├── ShareAccessPage.tsx
│   │           ├── UploadPage.tsx
│   │           └── VaultPage.tsx
│   │
│   └── server/                         # Flask/Python backend
│       ├── app.py                      # Flask app factory
│       ├── config.py                   # Configuration (DB, JWT, etc.)
│       ├── extensions.py               # Flask extensions (SQLAlchemy, JWT)
│       ├── requirements.txt
│       ├── models/
│       │   ├── audit_model.py          # Security audit log entries
│       │   ├── chat_model.py           # Room chat messages
│       │   ├── file_model.py           # Encrypted file metadata
│       │   ├── file_lock_model.py      # File locking (concurrent access)
│       │   ├── file_version_model.py   # File version history
│       │   ├── ids_alert_model.py      # Intrusion detection alerts
│       │   ├── key_model.py            # Per-file key metadata
│       │   ├── room_model.py           # Collaborative rooms
│       │   ├── share_model.py          # Expiring share links
│       │   └── user_model.py           # User accounts
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── admin_routes.py         # Admin-only: user list, global stats
│       │   ├── auth_routes.py          # Signup, login, /me, token refresh
│       │   ├── chat_routes.py          # Room chat endpoints
│       │   ├── file_routes.py          # Upload, list, decrypt, delete, stats
│       │   ├── lock_routes.py          # File lock/unlock
│       │   ├── room_routes.py          # Room CRUD, members, files
│       │   ├── security_routes.py      # Audit logs, share links, failed logins
│       │   └── version_routes.py       # File version history
│       ├── services/
│       │   ├── __init__.py
│       │   ├── audit_service.py        # Write audit log entries
│       │   ├── encryption_service.py   # AES-256-GCM encrypt/decrypt
│       │   ├── hash_service.py         # SHA-256 file integrity hashing
│       │   ├── ids_service.py          # Intrusion Detection System logic
│       │   ├── key_service.py          # Key derivation and management
│       │   ├── room_service.py         # Room business logic
│       │   ├── secure_delete_service.py # 3-pass overwrite file deletion
│       │   └── version_service.py      # File versioning logic
│       └── utils/
│           ├── __init__.py
│           ├── file_utils.py           # File path helpers, size formatting
│           ├── jwt_utils.py            # JWT encode/decode helpers
│           └── otp_utils.py            # One-time password utilities
│
├── include/                            # Component 1 — C headers
│   ├── encryption.h                    # AES-256-GCM API declarations
│   ├── file_io.h                       # POSIX file I/O API declarations
│   └── ui.h                            # ncurses UI API declarations
│
├── src/                                # Component 1 — C source files
│   ├── main.c                          # CLI entry point, getopt_long parsing
│   ├── encryption.c                    # AES-256-GCM via OpenSSL EVP
│   ├── encryption.o                    # Compiled object (Apple Clang 17, macOS)
│   ├── file_io.c                       # POSIX syscall-based file I/O
│   ├── file_io.o
│   ├── main.o
│   ├── ui.c                            # ncurses terminal UI
│   └── ui.o
│
├── test/
│   └── test_files/
│       ├── test_input.txt              # Plaintext test input
│       ├── test_binary.enc             # Binary file encrypted output
│       ├── test_binary.dec             # Binary file decrypted output
│       ├── test_caesar.enc             # Caesar cipher encrypted output
│       ├── test_caesar.dec             # Caesar cipher decrypted output
│       ├── test_xor.dec                # XOR cipher decrypted output
│       └── test_xor.enc               # XOR cipher encrypted output
│
├── index.html                          # Project landing / demo page
├── presentation.html                   # Interactive slide deck (14 slides)
├── terminal_mock.html                  # Terminal UI mockup / demo
├── Makefile                            # Build rules for the C tool
└── README.md                           # This file
```

---

## Component 1 — C Encryption Tool

A terminal application that encrypts and decrypts files using AES-256-GCM. Built as Phase 1 (core engine) and Phase 2 (ncurses UI) of the course project.

### Encryption Pipeline

```
passphrase + random 16-byte salt
        ↓  PKCS5_PBKDF2_HMAC (SHA-256)
     256-bit AES key
        ↓  EVP_aes_256_gcm + random 12-byte IV
ciphertext + 16-byte GCM auth tag
```

Output files use a custom binary container:

```
[FENC][v1][iterations:4B][salt:16B][iv:12B][tag:16B][ciphertext]
 ─ 4 ─  1 ──── 4 ────── ── 16 ── ─ 12 ─ ─ 16 ─  ─── N bytes ───
```

### Modules

| File | Responsibility | Key APIs |
|---|---|---|
| `main.c` | CLI parsing (`getopt_long`), orchestration | `-e/-d/-k/-i/-o/-m/-h` |
| `encryption.c` | AES-256-GCM + PBKDF2 via OpenSSL EVP | `aes_encrypt_payload`, `aes_decrypt_payload` |
| `file_io.c` | POSIX syscall-based file read/write | `read_file`, `write_file` |
| `ui.c` | ncurses full-screen menu interface | `ui_init`, `ui_show_menu`, `ui_progress_bar` |

### CLI Usage

```bash
# Encrypt
./encrypt_tool -e -k "passphrase" -i report.pdf -o report.enc

# Decrypt
./encrypt_tool -d -k "passphrase" -i report.enc -o report.pdf

# Interactive ncurses menu
./encrypt_tool --menu
```

### Build

A `Makefile` is included at the project root. The `include/` and `src/` directories sit at the root level alongside the other components.

```bash
# Using the Makefile (recommended)
make

# Manual — macOS (Homebrew OpenSSL)
gcc -c src/encryption.c -o src/encryption.o -Iinclude -I/opt/homebrew/opt/openssl@3/include
gcc -c src/file_io.c    -o src/file_io.o    -Iinclude
gcc -c src/ui.c         -o src/ui.o         -Iinclude
gcc -c src/main.c       -o src/main.o       -Iinclude
gcc src/*.o -o encrypt_tool -L/opt/homebrew/opt/openssl@3/lib -lssl -lcrypto -lncurses

# Manual — Linux
sudo apt install libssl-dev libncurses-dev
gcc src/*.c -Iinclude -o encrypt_tool -lssl -lcrypto -lncurses
```

> **Note:** The `.o` files already present in `src/` were compiled with Apple Clang 17.0.0 on macOS and are not portable. Recompile from source on your platform.

---

## Component 2 — CipherChat

A real-time encrypted group chat application with a Discord-style channel sidebar. All messages are encrypted **client-side** before being stored in Firebase — the server never sees plaintext.

### Architecture

```
Browser (React)
  ├── ciphers.js       Client-side encryption (Web Crypto API)
  ├── App.js           Channel state, modals, presence management
  ├── Chat.js          Message timeline, search, per-message actions
  └── Sidebar.js       Channel list, user bar

Firebase Realtime Database
  ├── /channels        Channel metadata + fingerprints
  ├── /messages        Encrypted message payloads (per channel)
  └── /members         Live presence records (TTL: 45s)
```

### Cipher Modes (per message)

| Mode | Algorithm | Security | Use Case |
|---|---|---|---|
| **Emoji Cipher** | Character substitution | 🚫 Not cryptographic | Playful/illustrative |
| **AES-256** | AES-256-GCM + PBKDF2 (250K iterations) | ✅ Cryptographic | Real privacy |

### Notable Features

- **Optimistic sending** — messages appear immediately as "pending" while Firebase confirms
- **Channel fingerprints** — SHA-256 of channel ID for identity verification (TOFU-style)
- **Private channels** — password-gated entry (separate from encryption passphrase)
- **Live presence** — 15s heartbeat, stale members pruned after 45s
- **In-channel search** — decrypts messages on-the-fly with a decryption result cache
- **Message actions** — reply, edit, copy plaintext, copy ciphertext, delete, retry failed
- **Role system** — owner / admin / member per channel
- **Auto-migration** — handles legacy Firebase data shapes on startup

### Firebase Data Model

```
/channels/{channelId}
  id, name, description, isPrivate, password, fingerprint,
  owner, admins[], createdAt, updatedAt

/messages/{channelId}/{pushId}
  sender, cipherType, encryptedText, timestamp, replyTo,
  editedAt, editedBy, meta: { algorithm, kdf, keyLength }

/members/{channelId}/{username-sessionId}
  channelId, username, role, joinedAt, lastSeen, source
```

### Setup

```bash
cd cipherchat
npm install

# Create .env in the project root (not inside src/)
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_DATABASE_URL=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

npm run dev
```

---

## Component 3 — CipherVault

A full-stack encrypted file vault. The frontend is a React/TypeScript SPA; the backend is a Flask REST API backed by SQLite. Files are encrypted server-side before being written to disk.

### Frontend (React/TypeScript)

#### Routes

| Route | Page | Auth | Description |
|---|---|---|---|
| `/` | `LandingPage` | No | Public landing; redirects if logged in |
| `/login` | `LoginPage` | No | Standalone login |
| `/register` | `RegisterPage` | No | Account creation |
| `/share/:token` | `ShareAccessPage` | No | Public shared file download |
| `/dashboard` | `DashboardPage` | ✅ | Stats + audit trail + charts |
| `/vault` | `VaultPage` | ✅ | Personal encrypted file list |
| `/upload` | `UploadPage` | ✅ | Encrypt & upload files |
| `/rooms` | `RoomsPage` | ✅ | Collaborative room list |
| `/rooms/:id` | `RoomDetailPage` | ✅ | Room files + members |
| `/security-monitor` | `SecurityMonitorPage` | ✅ | Audit logs + threat view |

#### Tech Stack

| Library | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| React Router v6 | Client-side routing |
| Axios | HTTP client with JWT interceptors |
| React Hook Form + Zod | Form validation |
| Framer Motion | Animations |
| Chart.js | Dashboard charts |
| Tailwind CSS | Styling (custom dark cyber design system) |
| React Hot Toast | Notifications |

#### Frontend Setup

```bash
cd ciphervault/client
npm install
npm run dev       # http://localhost:5173
# Proxies /api → http://localhost:5000 via vite.config.ts
```

### Backend (Flask/Python)

#### API Reference

All routes are prefixed with `/api`.

| Group | Prefix | Key Endpoints |
|---|---|---|
| Auth | `/api/auth` | `POST /signup`, `POST /login`, `GET /me`, `POST /refresh` |
| Files | `/api/files` | `POST /upload`, `GET /`, `POST /decrypt/:id`, `DELETE /:id`, `GET /stats` |
| Security | `/api/security` | `GET /audit-logs`, `GET /failed-logins`, `POST /share`, `POST /share/access` |
| Rooms | `/api/rooms` | Full CRUD + `/members`, `/files`, `/chat` sub-resources |
| Admin | `/api/admin` | `GET /users`, `GET /audit-logs`, `GET /stats` |
| Versions | `/api/versions` | File version history |
| Locks | `/api/locks` | File lock/unlock for concurrent access control |

#### Services

| Service | Responsibility |
|---|---|
| `encryption_service.py` | AES-256-GCM encrypt/decrypt — same algorithm as C tool and CipherChat |
| `hash_service.py` | SHA-256 integrity hash computed on every stored file |
| `key_service.py` | PBKDF2 key derivation, per-file key metadata |
| `secure_delete_service.py` | 3-pass random overwrite before `unlink` — prevents forensic recovery |
| `audit_service.py` | Writes timestamped entries for every action (login, upload, decrypt, delete) |
| `ids_service.py` | Intrusion Detection — monitors failed login patterns, raises alerts |
| `version_service.py` | Stores previous file versions before overwrite |
| `room_service.py` | Room creation, membership, role enforcement |

#### Database Models

| Model | Purpose |
|---|---|
| `user_model.py` | Accounts: username, email, hashed password, lock status, failed attempts |
| `file_model.py` | Encrypted file metadata: path, algorithm, hash, expiry |
| `key_model.py` | Per-file derived key metadata (salt, iterations) |
| `share_model.py` | Expiring share tokens with optional passphrase protection |
| `room_model.py` | Collaborative rooms with owner and role assignments |
| `audit_model.py` | Full action audit trail with IP address, timestamp, status |
| `chat_model.py` | Room chat messages |
| `file_lock_model.py` | Concurrent access locking |
| `file_version_model.py` | File version history snapshots |
| `ids_alert_model.py` | IDS-generated security alerts |

#### JWT Auth Flow

```
Login → access_token (short-lived) + refresh_token (long-lived)
                                            ↓
Every request → Authorization: Bearer <access_token>
                                            ↓
401 received → POST /auth/refresh with refresh_token
  ├── Success → new access_token + refresh_token → retry request
  └── Failure → clear tokens → redirect to /login
```

#### Backend Setup

```bash
cd ciphervault/server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py     # http://localhost:5000
```

---

## Shared Encryption Design

All three components implement the same encryption scheme:

| Property | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2-SHA-256 |
| Iterations | 250,000 (browser/server), configurable (C tool) |
| Salt | 16 random bytes, stored with ciphertext |
| IV / Nonce | 12 random bytes, stored with ciphertext |
| Auth tag | 16 bytes (GCM) — validates integrity on decrypt |
| Key length | 256-bit |

### Binary Payload Format (C Tool + CipherVault server)

```
Offset  Size   Field
──────  ────   ────────────────────────────────────────
0       4      Magic bytes: "FENC"
4       1      Version: 0x01
5       4      PBKDF2 iterations (uint32, big-endian)
9       16     Salt (random)
25      12     IV / Nonce (random)
37      16     GCM authentication tag
53      N      Ciphertext (same length as plaintext)
```

### Text Message Format (CipherChat AES mode)

```
"v1:<salt_base64>:<iv_base64>:<ciphertext_base64>"
```

---

## Setup & Running

```bash
git clone <repo>
cd OS_MINI_PROJECT

# ── Component 1: C Tool ──────────────────────────────
make                            # or: gcc src/*.c -Iinclude -o encrypt_tool -lssl -lcrypto -lncurses
./encrypt_tool --menu

# ── Component 2: CipherChat ──────────────────────────
cd cipherchat
npm install
# Add Firebase credentials to .env (see Component 2 section)
npm run dev                     # → http://localhost:1234

# ── Component 3: CipherVault Backend ─────────────────
cd ../ciphervault/server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py                   # → http://localhost:5000

# ── Component 3: CipherVault Frontend ────────────────
cd ../ciphervault/client
npm install
npm run dev                     # → http://localhost:5173
```

---

## OS Concepts Demonstrated

| Concept | Where |
|---|---|
| **POSIX System Calls** (`open`, `read`, `write`, `close`, `lseek`) | C Tool — `file_io.c` |
| **User ↔ Kernel boundary** | C Tool — every file I/O call crosses into kernel mode |
| **File descriptors** | C Tool — explicit fd management, error handling with `errno` |
| **File permissions** (`0644`, `O_CREAT`) | C Tool — `open()` flags |
| **Manual memory management** (`malloc`/`free`) | C Tool — caller-owned buffers |
| **Secure deletion** (3-pass random overwrite + `fsync`) | CipherVault — `secure_delete_service.py` |
| **File locking** (concurrent access control) | CipherVault — `file_lock_model.py` + `lock_routes.py` |
| **File versioning** | CipherVault — `version_service.py` |
| **AES-256-GCM encryption** | All three components |
| **PBKDF2 key derivation** | All three components |
| **SHA-256 integrity verification** | C Tool + CipherVault |
| **Intrusion Detection System** (failed login monitoring) | CipherVault — `ids_service.py` |
| **Audit logging** (timestamped event trail) | CipherVault — `audit_service.py` |
| **Role-based access control** | CipherVault (owner/admin/member) + CipherChat |
| **JWT session management** (access + refresh token flow) | CipherVault |
| **Real-time presence** (heartbeat + TTL-based cleanup) | CipherChat — Firebase `/members` |
| **ncurses TUI** (terminal rendering, color pairs, keyboard input) | C Tool — `ui.c` |
