#!/bin/bash
set -e

API="http://localhost:5001/api"

# Clean DB to start fresh
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
rm -f /Users/sainathmeesala/Desktop/file-encryption-decryption/server/securevault.db
python app.py &
APP_PID=$!
sleep 5

echo "1. Signup Alice..."
ALICE_RES=$(curl -s -X POST $API/auth/signup -H "Content-Type: application/json" -d '{"username":"alice", "email":"alice@test.com", "password":"password123"}')
echo "$ALICE_RES" | grep "Account created" > /dev/null
ALICE_TOKEN=$(echo "$ALICE_RES" | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)
echo "Alice token retrieved"

echo "2. Signup Bob..."
BOB_RES=$(curl -s -X POST $API/auth/signup -H "Content-Type: application/json" -d '{"username":"bob", "email":"bob@test.com", "password":"password123"}')
BOB_TOKEN=$(echo "$BOB_RES" | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)
echo "Bob token retrieved"

echo "3. Create Room as Alice..."
ROOM_RES=$(curl -s -X POST $API/rooms -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{"name":"Secret Project", "description":"Top secret stuff"}')
ROOM_ID=$(echo "$ROOM_RES" | grep -o '"id": *[0-9]*' | head -n1 | cut -d':' -f2 | tr -d ' ')
echo "Room ID: $ROOM_ID"

echo "4. Add Bob to Room..."
ADD_RES=$(curl -s -X POST $API/rooms/$ROOM_ID/members -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{"username":"bob", "role":"member"}')
echo "$ADD_RES"

echo "5. List Rooms as Bob:"
curl -s -X GET $API/rooms -H "Authorization: Bearer $BOB_TOKEN"

kill $APP_PID
