# File Encryption & Decryption Tool
### Operating Systems Course Project - Phase 2
**By Team Root**

A robust, C-based utility for secure file encryption and decryption. This tool demonstrates core Operating System concepts including system calls, file I/O operations, memory management, and process interaction, wrapped in a polished User Interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Language](https://img.shields.io/badge/language-C-orange.svg)
![Platform](https://img.shields.io/badge/platform-POSIX-green.svg)

## 📖 Overview

The File Encryption Tool is designed to separate data persistence from security logic. It allows users to safely encrypt sensible documents, images, and executables using standard algorithms.

### Key Features
*   **Dual Operation Modes**:
    *   **Interactive TUI**: A user-friendly, ncurses-based menu system with ASCII art, color-coded feedback, and progress bars.
    *   **Scriptable CLI**: A fast, flag-based interface ideal for automation and shell scripting.
*   **Multi-Algorithm Support**:
    *   **Caesar Cipher**: A classic substitution cipher shifting byte values (good for educational demonstration).
    *   **XOR Cipher**: A bitwise operation using a cycling key constraint (standard for simple obfuscation).
*   **Binary-Safe I/O**: Capable of handling **any** file type (Text, PDF, JPG, ELF executables) without corruption.
*   **OS Level Integration**: Built directly on POSIX system calls (`read`, `write`, `open`) for maximum performance.

## 👥 The Team (Team Root)

*   **Dally** - Developer
*   **Amathziah** - Developer
*   **Udita** - Developer

---

## 🛠️ Build Instructions

### Prerequisites
*   GCC Compiler
*   Make (GNU Make)
*   Ncurses library (`libncurses-dev` on Linux, usually pre-installed on macOS)

### Compilation
The project includes a comprehensive `Makefile` to handle building and testing.

```bash
# Build the main executable
make all

# Clean up build artifacts
make clean
```

---

## 💻 Usage

### 1. Interactive Menu Mode (TUI)
Launch the visual interface for a guided experience.
```bash
./encrypt_tool --menu
```
*   Navigate using **Arrow Keys**.
*   Select with **Enter**.
*   Follow the on-screen prompts for file paths and keys.

### 2. Command Line Interface (CLI)
Run the tool directly from the shell for quick operations.

**Syntax:**
```bash
./encrypt_tool -[e|d] -a [caesar|xor] -k [key] -i [input] -o [output]
```

**Examples:**

*Encrypt a text file using Caesar Cipher (Shift 5):*
```bash
./encrypt_tool -e -a caesar -k 5 -i secret.txt -o secret.enc
```

*Decrypt a binary file using XOR Cipher:*
```bash
./encrypt_tool -d -a xor -k "supersecret" -i image.enc -o image.jpg
```

**Options:**
| Flag | Long Flag | Description |
|------|-----------|-------------|
| `-e` | `--encrypt` | Encrypt the input file |
| `-d` | `--decrypt` | Decrypt the input file |
| `-a` | `--algorithm` | Choose `caesar` or `xor` |
| `-k` | `--key` | Encryption key (number for Caesar, string for XOR) |
| `-i` | `--input` | Input file path |
| `-o` | `--output` | Output file path |
| `-m` | `--menu` | Launch interactive menu |
| `-h` | `--help` | Show help message |

---

## 🧪 Testing

We have included an automated test suite to verify the correctness of the encryption algorithms and file handling.

```bash
# Run the automated verification suite
make test
```

This will:
1.  Create dummy test files.
2.  Encrypt and then decrypt them using both algorithms.
3.  Compare the final result with the original to ensure 100% integrity (diff check).
4.  Test binary file handling using system binaries (e.g., `/bin/ls`).

---

## 📂 Project Structure

```text
OS_mini_project/
├── src/                # Source files
│   ├── main.c          # Entry point and argument parsing
│   ├── encryption.c    # Caesar and XOR implementation
│   ├── ui.c            # Ncurses UI implementation
│   └── file_io.c       # File reading/writing logic
├── include/            # Header files
│   ├── encryption.h
│   ├── ui.h
│   └── file_io.h
├── test/               # Test artifacts directory
├── Makefile            # Build configuration
└── presentation.html   # Project presentation slide deck
```

---

## 🧠 Technical Details

*   **Buffer Management**: Uses dynamic buffer allocation to handle file streams efficiently.
*   **Error Handling**: Robust error checking for missing files, permission issues, and invalid keys.
*   **Modular Design**: UI, Logic, and I/O are strictly separated, allowing the CLI to run without any UI overhead.
