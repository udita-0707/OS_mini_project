# 🔐 File Encryption & Decryption Tool

> A C-based file encryption system demonstrating OS concepts with POSIX system calls

[![Language](https://img.shields.io/badge/Language-C-blue.svg)](https://en.wikipedia.org/wiki/C_(programming_language))
[![OS Concepts](https://img.shields.io/badge/OS-System_Calls-green.svg)](#operating-system-concepts)

## ✨ Features

- **Encryption Algorithms**: Caesar Cipher & XOR Cipher
- **Universal Binary Support**: Encrypt any file type
- **Interactive UI**: ncurses-based terminal interface
- **CLI Mode**: Command-line automation support
- **Low-Level I/O**: Direct POSIX system calls

## 🚀 Quick Start

```bash
# Build
make

# Interactive mode
./encrypt_tool --menu

# CLI mode
./encrypt_tool -e -a xor -k "password" -i input.txt -o output.enc
./encrypt_tool -d -a xor -k "password" -i output.enc -o decrypted.txt
```

## 📖 Usage

### Interactive Mode
```bash
./encrypt_tool --menu
```
Use arrow keys to navigate, Enter to select.

### Command-Line Options

| Option | Description |
|--------|-------------|
| `-m, --menu` | Launch interactive mode |
| `-e, --encrypt` | Encryption mode |
| `-d, --decrypt` | Decryption mode |
| `-a, --algorithm` | Algorithm: `caesar` or `xor` |
| `-k, --key` | Encryption key |
| `-i, --input` | Input file path |
| `-o, --output` | Output file path |
| `-h, --help` | Display help |

## 🎓 Operating System Concepts

- **System Calls**: `open()`, `read()`, `write()`, `close()`, `lseek()`
- **File Descriptors**: Kernel-managed resource handles
- **Memory Management**: Dynamic allocation with `malloc()`/`free()`
- **Terminal I/O**: ncurses for low-level terminal control

## 🧪 Testing

```bash
make test
```

## 📁 Project Structure

```
OS_mini_project/
├── include/          # Header files
├── src/              # Source files
│   ├── main.c
│   ├── encryption.c
│   ├── file_io.c
│   └── ui.c
├── Makefile
└── presentation.html
```

## 👨‍💻 Team

**Team Root**: Dally, Amatziah, Udita

---

**Built with ❤️ for Operating Systems Course**
