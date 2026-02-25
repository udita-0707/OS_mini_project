# CipherVault OS: A Secure OS-Mini Project

> **Secure Vault. Encrypted Privacy. Total Control.**

---

## Executive Summary
CipherVault OS is an advanced security-centric file management system designed to demonstrate core Operating System security principles, including **Confidentiality**, **Integrity**, and **Availability** (CIA Triad). It provides a multi-layered defense-in-depth architecture to protect sensitive data against unauthorized access and tampering.

---

## 🛠 Problem Statement
Standard file systems often lack:
- **Built-in encryption** at rest.
- **Granular audit tracking** for sensitive operations.
- **Resilience** against ransomware and accidental corruption.
- **Secure, time-limited sharing** mechanisms.

---

## 🚀 Key Features

### 1. Multi-Layered Encryption
CipherVault supports several industry-standard encryption algorithms, allowing users to choose their balance between speed and security:
- **AES-256-GCM**: Authenticated encryption (confidentiality + integrity).
- **AES-256-CBC**: Classic block cipher mode.
- **ChaCha20-Poly1305**: High-performance stream cipher.
- *Implementation*: Uses **PBKDF2** for key derivation with 600,000 iterations to resist brute-force attacks.

### 2. Intrusion Detection System (IDS)
Real-time monitoring of system activities to identify potential threats:
- Logs failed login attempts and unauthorized access patterns.
- Visual **Security Timeline** showing chronological events.
- Automated alerts for suspicious behavior.

### 3. File Versioning & Snapshotting
- Automatically creates snapshots before file modifications.
- Allows users to **Restore** previous versions, providing a safety net against data loss or ransomware.

### 4. Resource Synchronization (File Locking)
- Implements a locking mechanism to prevent race conditions during concurrent file access.
- Demonstrates OS-level **Mutual Exclusion** and resource management.

### 5. Secure Governance & Sharing
- Create secure share links with custom **passphrases**.
- Set **expiry times** (TTL) to ensure data doesn't linger indefinitely.
- End-to-end audit logs for every "Share" and "Access" event.

---

## 🏗 System Architecture

### Backend (The Core)
- **Language**: Python (Flask)
- **Database**: SQLAlchemy (SQLite for portability, extensible to PostgreSQL)
- **Security Extensions**: Flask-JWT-Extended, Bcrypt.
- **Asynchronous Tasks**: Background schedulers for automatic cleanup of expired shares.

### Frontend (Mission Control)
- **Framework**: React.js with Vite.
- **Styling**: TailwindCSS for a modern, responsive "Terminal" aesthetic.
- **Visuals**: Glassmorphism and micro-animations for an interactive user experience.

---

## 📡 OS Concepts Demonstrated
| Concept | Implementation in CipherVault |
| :--- | :--- |
| **File Systems** | Encrypted persistence layer with metadata management. |
| **Process Scheduling** | Background cleanup threads for resource management. |
| **Concurrency** | Locking mechanisms for shared resource access. |
| **Observability** | Centralized audit logging and system-wide monitoring. |
| **Integrity** | SHA-256 hashing to detect file tampering. |

---

## 💎 Special Demos

### 🖥 OS Visualizer
A real-time visualization tool that maps the system state, showing how files, users, and security nodes interact within the "OS".

### 🛡 Ransomware Resilience Demo
A simulated attack scenario where CipherVault demonstrates its ability to detect tampering and restore files using its built-in versioning system.

---

## 🏁 Conclusion
CipherVault OS bridges the gap between theoretical OS security and practical implementation. By combining cryptographic primitives with robust system monitoring, it provides a blueprint for secure document management in modern environments.

---

**Thank You!**
*Questions?*
