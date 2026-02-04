# File Encryption & Decryption Tool

A C-based encryption tool demonstrating OS concepts with a colorful interactive terminal UI.

## 🚀 Quick Start

```bash
# Build
make

# Interactive mode (recommended!)
./encrypt_tool --menu

# Run tests
make test
```

## ✨ Features

- **🔐 Caesar Cipher**: Byte-level shift encryption
- **🔑 XOR Cipher**: Password-based encryption
- **📁 Binary Support**: Works with any file type
- **🎨 Interactive UI**: Colorful ncurses-based menus
- **⚡ System Calls**: Uses POSIX `open()`, `read()`, `write()`, `close()`

## 📖 Usage

### Interactive Mode
```bash
./encrypt_tool --menu
```
Navigate with arrow keys, select operations, enter file paths!

### CLI Mode
```bash
# Encrypt with Caesar
./encrypt_tool -e -a caesar -k 5 -i secret.txt -o secret.enc

# Decrypt with XOR
./encrypt_tool -d -a xor -k mypassword -i file.enc -o file.txt
```

## 🔧 Options

| Option | Description |
|--------|-------------|
| `-m, --menu` | Interactive mode |
| `-e, --encrypt` | Encrypt mode |
| `-d, --decrypt` | Decrypt mode |
| `-a, --algorithm` | `caesar` or `xor` |
| `-k, --key` | Encryption key |
| `-i, --input` | Input file |
| `-o, --output` | Output file |

## 📁 Structure

```
OS_mini_project/
├── include/           # Headers
├── src/               # Source files
├── test/test_files/   # Test files
├── Makefile
└── README.md
```

## 🎓 OS Concepts

- **System Calls**: `open()`, `read()`, `write()`, `close()`, `lseek()`
- **File Descriptors**: Integer handles to open files
- **Memory Management**: `malloc()`/`free()`
- **ncurses**: Terminal UI library
