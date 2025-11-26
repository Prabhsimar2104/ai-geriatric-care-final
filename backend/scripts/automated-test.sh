#!/bin/bash

echo "🧪 Running Automated Tests..."

# Test 1: Health Check
echo "Test 1: Health Check"
curl -f http://localhost:4000/api/health || exit 1

# Test 2: Fall Alert API
echo "Test 2: Fall Alert API"
curl -f -X POST http://localhost:4000/api/notify/fall-alert \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: secret_token_for_fall_detection" \
  -d '{"userId":1,"timestamp":"2025-11-25T10:00:00Z","confidence":0.95}' \
  || exit 1

# Test 3: Database Connection
echo "Test 3: Database Connection"
mysql -u root -psimar1234 -e "USE ai_geriatric; SELECT COUNT(*) FROM users;" || exit 1

echo "✅ All tests passed!"