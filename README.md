# File Encryption & Decryption Project

This repository contains:
- A C-based file encryption/decryption tool (`encrypt_tool`)
- A React/Firebase app (`cipherchat`) with chat encryption and a file-crypto workspace channel

## Native Tool (`encrypt_tool`)

### Crypto Standard
- AES-256-GCM
- PBKDF2-HMAC-SHA256 key derivation
- Random salt and IV per file

### Build
```bash
make
```

### Run
```bash
# Interactive menu
./encrypt_tool --menu

# Encrypt
./encrypt_tool -e -k "passphrase" -i input.bin -o input.enc

# Decrypt
./encrypt_tool -d -k "passphrase" -i input.enc -o input.bin
```

### Test
```bash
make test
```

## CipherChat (`cipherchat`)

### Install / Build
```bash
cd cipherchat
npm install
npm run build
```

### Environment
Set Firebase env vars used by `cipherchat/src/db.js`:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### File Crypto Feature
- Channel: `#file-crypto`
- Tabs: `Encrypt` / `Decrypt`
- Upload file + passphrase
- Browser-side AES-256-GCM processing
- Download-only output (no file upload to Firebase)

## Structure
```text
OS_mini_project/
├── include/
├── src/
├── test/
├── cipherchat/
├── Makefile
└── README.md
```
