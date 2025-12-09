#!/bin/bash

BASE_URL="http://localhost:8000"
EMAIL="ayazkahloon26@gmail.com"
PASSWORD="TestPassword123!"  # Change this to your desired password
FULL_NAME="Muhammad Ayaz"

echo "=========================================="
echo "  CREATE USER IN DATABASE"
echo "=========================================="
echo ""

# Check if backend is running
echo "Checking if backend is running..."
if ! curl -s "$BASE_URL/docs" > /dev/null 2>&1; then
  echo "ERROR: Backend is not running!"
  echo "Please start the backend first:"
  echo "  cd C:\\Users\\wic\\Desktop\\FYP\\SurgeAI\\server"
  echo "  .\\venv\\Scripts\\Activate.ps1"
  echo "  uvicorn app.main:app --reload"
  exit 1
fi
echo "✓ Backend is running"
echo ""

echo "Creating user:"
echo "  Email: $EMAIL"
echo "  Full Name: $FULL_NAME"
echo ""

echo "=== REGISTER USER ==="
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"full_name\": \"$FULL_NAME\"}")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ User created successfully!"
  echo ""
  echo "User Details:"
  echo "  Email: $EMAIL"
  echo "  Full Name: $FULL_NAME"
  echo "  Password: $PASSWORD"
  echo ""
  echo "You can now login with these credentials."
elif [ "$HTTP_CODE" = "409" ]; then
  echo "⚠️  User already exists with this email."
  echo "   Email: $EMAIL"
else
  echo "❌ Failed to create user."
  echo "   Check the error message above."
fi

echo ""
echo "=========================================="