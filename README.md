# 🔐 File Encryption & Decryption Tool

> **A comprehensive C-based file encryption system demonstrating core Operating System concepts through practical implementation**

[![Language](https://img.shields.io/badge/Language-C-blue.svg)](https://en.wikipedia.org/wiki/C_(programming_language))
[![OS Concepts](https://img.shields.io/badge/OS-System_Calls-green.svg)](#-operating-system-concepts)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An educational OS mini-project that implements file encryption/decryption using low-level POSIX system calls, featuring both an interactive ncurses-based UI and a powerful command-line interface.

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [Architecture](#-architecture)
- [Operating System Concepts](#-operating-system-concepts)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Examples](#-examples)

---

## ✨ Features

### 🔒 Encryption Algorithms
- **Caesar Cipher**: Classic shift-based encryption with configurable key (0-255)
- **XOR Cipher**: Password-based symmetric encryption with variable-length keys

### 📁 File Handling
- **Universal Binary Support**: Encrypt any file type (text, images, executables, archives)
- **Low-Level I/O**: Direct POSIX system calls (`open`, `read`, `write`, `close`)
- **Memory Efficient**: Chunked processing for large files
- **Integrity Preservation**: Byte-perfect decryption

### 🎨 User Interface
- **Interactive Menu**: Beautiful ncurses-based terminal UI with color support
- **CLI Mode**: Full command-line interface for scripting and automation
- **Real-time Feedback**: Progress indicators and detailed error messages
- **Cross-platform**: Works on Linux, macOS, and Unix-like systems

### 🛡️ Robustness
- **Error Handling**: Comprehensive validation and error reporting
- **Memory Safety**: Proper allocation/deallocation tracking
- **File Descriptor Management**: Clean resource handling
- **Automated Testing**: Built-in test suite for verification

---

## 🚀 Quick Start

```bash
# Clone or navigate to the project directory
cd OS_mini_project

# Build the project
make

# Launch interactive mode
./encrypt_tool --menu

# Or use CLI mode directly
./encrypt_tool -e -a xor -k "mypassword" -i document.pdf -o document.enc
```

---

## 🔧 Installation

### Prerequisites
- **GCC Compiler**: Version 4.8 or higher
- **ncurses Library**: For terminal UI
- **Make**: Build automation tool
- **POSIX-compliant OS**: Linux, macOS, BSD, etc.

### Installing Dependencies

**macOS (Homebrew):**
```bash
brew install ncurses
```

**Ubuntu/Debian:**
```bash
sudo apt-get install libncurses5-dev libncursesw5-dev
```

**Fedora/RHEL:**
```bash
sudo dnf install ncurses-devel
```

### Building the Project

```bash
# Standard build
make

# Clean and rebuild
make clean && make

# Run automated tests
make test

# Clean everything (build artifacts + test files)
make clean-all
```

---

## 📖 Usage

### Interactive Mode (Recommended)

```bash
./encrypt_tool --menu
```

**Navigation:**
- Use **↑/↓ Arrow Keys** to navigate menu options
- Press **Enter** to select
- Follow on-screen prompts for file paths and keys
- Visual feedback with color-coded status messages

### Command-Line Interface

**Basic Syntax:**
```bash
./encrypt_tool [OPTIONS]
```

**Options:**

| Option | Long Form | Argument | Description |
|--------|-----------|----------|-------------|
| `-m` | `--menu` | None | Launch interactive mode |
| `-e` | `--encrypt` | None | Encryption mode |
| `-d` | `--decrypt` | None | Decryption mode |
| `-a` | `--algorithm` | `caesar\|xor` | Encryption algorithm |
| `-k` | `--key` | String/Number | Encryption key |
| `-i` | `--input` | Path | Input file path |
| `-o` | `--output` | Path | Output file path |
| `-h` | `--help` | None | Display help message |

---

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Main Program                        │
│                      (main.c)                           │
└────────────┬────────────────────────────────┬───────────┘
             │                                │
    ┌────────▼────────┐              ┌────────▼────────┐
    │   UI Module     │              │  CLI Parser     │
    │    (ui.c)       │              │   (main.c)      │
    └────────┬────────┘              └────────┬────────┘
             │                                │
             └────────────┬───────────────────┘
                          │
              ┌───────────▼────────────┐
              │   File I/O Module      │
              │     (file_io.c)        │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │  Encryption Module     │
              │   (encryption.c)       │
              └────────────────────────┘
```

### Module Descriptions

- **`main.c`**: Entry point, argument parsing, mode selection
- **`ui.c`**: ncurses-based interactive interface
- **`file_io.c`**: Low-level file operations using system calls
- **`encryption.c`**: Cipher implementations (Caesar, XOR)
- **Header files** (`include/`): Function prototypes and constants

---

## 🎓 Operating System Concepts

This project demonstrates fundamental OS concepts:

### 1️⃣ **System Calls**
- **`open()`**: Open files with flags (`O_RDONLY`, `O_WRONLY`, `O_CREAT`)
- **`read()`**: Read data from file descriptors
- **`write()`**: Write data to file descriptors
- **`close()`**: Release file descriptors
- **`lseek()`**: Navigate file positions

**Why System Calls?**  
Direct interaction with the kernel for maximum control and efficiency, bypassing standard library buffering.

### 2️⃣ **File Descriptors**
- Integer handles representing open files
- Managed by the kernel's file descriptor table
- Demonstrates resource management and cleanup

### 3️⃣ **Memory Management**
- Dynamic allocation with `malloc()`
- Proper deallocation with `free()`
- Buffer management for file I/O
- Memory leak prevention

### 4️⃣ **Process Control**
- Command-line argument parsing (`argc`, `argv`)
- Error handling and exit codes
- Signal handling (graceful termination)

### 5️⃣ **Terminal I/O**
- **ncurses library**: Low-level terminal control
- Raw mode input handling
- Screen buffer management
- Color attribute manipulation

---

## 🧪 Testing

### Automated Test Suite

```bash
make test
```

**Tests Include:**
1. **Caesar Cipher Test**: Encrypt/decrypt text file with numeric key
2. **XOR Cipher Test**: Encrypt/decrypt text file with password
3. **Binary File Test**: Encrypt/decrypt executable file
4. **Integrity Verification**: Diff comparison of original vs. decrypted

### Manual Testing Examples

```bash
# Test 1: Text file with Caesar cipher
echo "Hello, World!" > test.txt
./encrypt_tool -e -a caesar -k 13 -i test.txt -o test.enc
./encrypt_tool -d -a caesar -k 13 -i test.enc -o test.dec
diff test.txt test.dec  # Should be identical

# Test 2: Image file with XOR cipher
./encrypt_tool -e -a xor -k "secret123" -i photo.jpg -o photo.enc
./encrypt_tool -d -a xor -k "secret123" -i photo.enc -o photo_restored.jpg
# Verify photo_restored.jpg opens correctly

# Test 3: Large file handling
./encrypt_tool -e -a xor -k "longpassword" -i largefile.zip -o largefile.enc
```

---

## 📁 Project Structure

```
OS_mini_project/
│
├── 📂 include/               # Header files
│   ├── encryption.h          # Encryption function prototypes
│   ├── file_io.h             # File I/O function prototypes
│   └── ui.h                  # UI function prototypes
│
├── 📂 src/                   # Source files
│   ├── main.c                # Entry point & CLI parsing
│   ├── encryption.c          # Cipher implementations
│   ├── file_io.c             # System call wrappers
│   └── ui.c                  # ncurses interface
│
├── 📂 test/                  # Testing resources
│   └── test_files/           # Generated test files
│
├── Makefile                  # Build automation
├── README.md                 # This file
└── presentation.html         # Project presentation
```

---

## 💡 Examples

### Example 1: Encrypt a Confidential Document

```bash
./encrypt_tool -e -a xor -k "MySecurePassword123" \
  -i confidential.docx -o confidential.enc
```

### Example 2: Decrypt and Restore

```bash
./encrypt_tool -d -a xor -k "MySecurePassword123" \
  -i confidential.enc -o confidential_restored.docx
```

### Example 3: Simple Caesar Shift

```bash
# ROT13 encoding (shift by 13)
./encrypt_tool -e -a caesar -k 13 -i message.txt -o message.rot13

# Decode (shift by 13 again for ROT13)
./encrypt_tool -d -a caesar -k 13 -i message.rot13 -o message_decoded.txt
```

### Example 4: Batch Processing Script

```bash
#!/bin/bash
# Encrypt all .txt files in current directory

for file in *.txt; do
  ./encrypt_tool -e -a xor -k "batch_key" -i "$file" -o "${file}.enc"
  echo "Encrypted: $file"
done
```

---

## 🤝 Contributing

This is an educational project. Suggestions for improvements:
- Additional cipher algorithms (AES, Blowfish)
- Multi-threading for large files
- Compression before encryption
- Key derivation functions (PBKDF2)

---

## 📄 License

This project is created for educational purposes as part of an Operating Systems course.

---

## 👨‍💻 Author

**OS Course Mini-Project**  
Demonstrating practical application of operating system concepts through file encryption.

---

## 🙏 Acknowledgments

- **ncurses Library**: Terminal UI framework
- **POSIX Standards**: System call specifications
- **OS Course Materials**: Theoretical foundation

---

**Built with ❤️ using C and low-level system programming**
