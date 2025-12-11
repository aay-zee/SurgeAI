#!/bin/bash

BASE_URL="http://localhost:8000"
EMAIL="testuser@example.com"
PASSWORD="Test1234!"

echo "=========================================="
echo "  SURGEAI CAMPAIGN ENDPOINTS TEST"
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

# Step 0: Login to get access token
echo "=== 0. LOGIN (Get Access Token) ==="
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Login failed. Please check your credentials or register first."
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Extract access token
ACCESS_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Could not extract access token from login response"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo "✓ Login successful!"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 1: Create a campaign
echo "=== 1. CREATE CAMPAIGN ==="
CAMPAIGN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/campaigns/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "campaign_name": "AI Chatbot Campaign",
    "description": "Tracking AI chatbot discussions across social media platforms",
    "keywords": ["AI chatbot", "customer service", "SaaS", "conversational AI"],
    "platforms": ["reddit"]
  }')

HTTP_CODE=$(echo "$CAMPAIGN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CAMPAIGN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Failed to create campaign"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Extract campaign ID (first id in response, which is the campaign ID)
CAMPAIGN_ID=$(echo "$RESPONSE_BODY" | grep -o '"campaign_id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$CAMPAIGN_ID" ]; then
  echo "❌ Could not extract campaign ID from response"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo "✓ Campaign created successfully!"
echo "Campaign ID: $CAMPAIGN_ID"
echo ""

# Step 2: Get campaign details
echo "=== 2. GET CAMPAIGN DETAILS ==="
GET_CAMPAIGN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$GET_CAMPAIGN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_CAMPAIGN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Campaign retrieved successfully!"
else
  echo "⚠ Failed to retrieve campaign"
fi
echo ""

# Step 3: Get scraped data (may be empty initially)
echo "=== 3. GET SCRAPED DATA ==="
SCRAPED_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/campaigns/$CAMPAIGN_ID/scraped-data" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$SCRAPED_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SCRAPED_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Scraped data endpoint working!"
  DATA_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"id"' | wc -l)
  echo "Number of scraped items: $DATA_COUNT"
  if [ "$DATA_COUNT" = "0" ]; then
    echo "ℹ No data scraped yet. The scraper may still be running in the background."
  fi
else
  echo "⚠ Failed to retrieve scraped data"
fi
echo ""

echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo "Campaign ID: $CAMPAIGN_ID"
echo "Campaign Name: AI Chatbot Campaign"
echo ""
echo "✓ Login successful"
echo "✓ Campaign created in database"
echo "✓ Campaign endpoints tested"
echo ""
echo "Note: Scraped data will appear once the Celery worker"
echo "      processes the scraping task in the background."
echo ""
echo "To check scraped data later, run:"
echo "  curl -X GET \"$BASE_URL/campaigns/$CAMPAIGN_ID/scraped-data\" \\"
echo "    -H \"Authorization: Bearer YOUR_ACCESS_TOKEN\""
echo ""