#!/bin/bash
set -e

API="http://localhost:5001/api"

# Get Alice Token
ALICE_RES=$(curl -s -X POST $API/auth/signup -H "Content-Type: application/json" -d '{"username":"alice2", "email":"alice2@test.com", "password":"password123"}')
ALICE_TOKEN=$(echo "$ALICE_RES" | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)
if [ -z "$ALICE_TOKEN" ]; then
    # Try login if signup failed
    ALICE_RES=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{"username":"alice2", "password":"password123"}')
    ALICE_TOKEN=$(echo "$ALICE_RES" | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)
fi

echo "Alice Token: $ALICE_TOKEN"

# 1. Upload a file to Alice's vault to share
echo "Uploading file..."
echo "Secret data" > secret.txt
UPLOAD_RES=$(curl -s -X POST $API/files/upload \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -F "file=@secret.txt" \
  -F "algorithm=AES-GCM" \
  -F "passphrase=filepass")

FILE_ID=$(echo "$UPLOAD_RES" | grep -o '"id": *[0-9]*' | head -n1 | cut -d':' -f2 | tr -d ' ')
echo "Uploaded File ID: $FILE_ID"

# 2. Create Share Link
echo "Creating share link..."
SHARE_RES=$(curl -s -X POST $API/security/share \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"file_id\":$FILE_ID, \"expiry_hours\":24, \"passphrase\":\"sharepass\"}")
echo "$SHARE_RES"

SHARE_TOKEN=$(echo "$SHARE_RES" | grep -o '"token": *"[^"]*"' | cut -d'"' -f4)
echo "Share Token: $SHARE_TOKEN"

# 3. Access Share Link
echo "Accessing share link..."
curl -s -X POST $API/security/share/access \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$SHARE_TOKEN\", \"encryption_passphrase\":\"filepass\", \"share_passphrase\":\"sharepass\"}"

