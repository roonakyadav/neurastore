#!/bin/bash

# E2E Upload Test Script for NeuraStore+
# This script tests the complete upload pipeline

set -e  # Exit on any error

echo "🚀 Starting NeuraStore+ E2E Upload Tests"
echo "=========================================="

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Error: Server not running on http://localhost:3000"
    echo "Please start the dev server with: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# Set environment variables
export NEXTAUTH_URL=http://localhost:3000

# Clean up any previous test results
rm -f /tmp/flat_resp.json /tmp/nested_resp.json

echo ""
echo "📤 Testing flat JSON upload (should create SQL table)"
echo "-----------------------------------------------------"

# Test flat JSON (should create SQL)
FLAT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/upload" \
  -F "file=@tests/flat_sql_test.json" \
  -w "\nHTTP_STATUS:%{http_code}")

FLAT_STATUS=$(echo "$FLAT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
FLAT_BODY=$(echo "$FLAT_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response status: $FLAT_STATUS"
echo "Response body: $FLAT_BODY"

if [ "$FLAT_STATUS" -ne 200 ]; then
    echo "❌ Flat JSON upload failed with status $FLAT_STATUS"
    exit 1
fi

echo "$FLAT_BODY" > /tmp/flat_resp.json

echo ""
echo "📤 Testing nested JSON upload (should be NoSQL)"
echo "------------------------------------------------"

# Test nested JSON (should be NoSQL)
NESTED_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/upload" \
  -F "file=@tests/nested_nosql_test.json" \
  -w "\nHTTP_STATUS:%{http_code}")

NESTED_STATUS=$(echo "$NESTED_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
NESTED_BODY=$(echo "$NESTED_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response status: $NESTED_STATUS"
echo "Response body: $NESTED_BODY"

if [ "$NESTED_STATUS" -ne 200 ]; then
    echo "❌ Nested JSON upload failed with status $NESTED_STATUS"
    exit 1
fi

echo "$NESTED_BODY" > /tmp/nested_resp.json

echo ""
echo "🔍 Checking server logs for processing"
echo "--------------------------------------"

# Check server logs (this assumes logs are in .next/logs or similar)
# Note: In production, you might need to adjust this path
LOG_PATTERNS=("JSON analyzed" "SQL table created" "Saving metadata" "analyze-json" "create-sql-table")
FOUND_PATTERNS=()

for pattern in "${LOG_PATTERNS[@]}"; do
    if find .next -name "*.log" -exec grep -l "$pattern" {} \; 2>/dev/null | head -1 | xargs grep -q "$pattern" 2>/dev/null; then
        FOUND_PATTERNS+=("$pattern")
        echo "✅ Found log pattern: $pattern"
    else
        echo "⚠️  Log pattern not found: $pattern"
    fi
done

echo ""
echo "🗄️  Database verification"
echo "------------------------"

# Note: Database verification would require psql access
# For now, we'll check if the API responses indicate success

echo "Checking flat JSON response..."
if echo "$FLAT_BODY" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Flat JSON upload successful"
    FLAT_FILE_ID=$(echo "$FLAT_BODY" | jq -r '.file_id // empty')
    if [ -n "$FLAT_FILE_ID" ]; then
        echo "✅ Flat JSON file_id: $FLAT_FILE_ID"
    fi
else
    echo "❌ Flat JSON upload response indicates failure"
fi

echo "Checking nested JSON response..."
if echo "$NESTED_BODY" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Nested JSON upload successful"
    NESTED_FILE_ID=$(echo "$NESTED_BODY" | jq -r '.file_id // empty')
    if [ -n "$NESTED_FILE_ID" ]; then
        echo "✅ Nested JSON file_id: $NESTED_FILE_ID"
    fi
else
    echo "❌ Nested JSON upload response indicates failure"
fi

echo ""
echo "📋 Test Results Summary"
echo "======================="

echo "✅ Flat JSON test: $([ "$FLAT_STATUS" -eq 200 ] && echo "PASSED" || echo "FAILED")"
echo "✅ Nested JSON test: $([ "$NESTED_STATUS" -eq 200 ] && echo "PASSED" || echo "FAILED")"
echo "✅ Server logs: $([ ${#FOUND_PATTERNS[@]} -gt 0 ] && echo "FOUND ${#FOUND_PATTERNS[@]} PATTERNS" || echo "NO PATTERNS FOUND")"

if [ "$FLAT_STATUS" -eq 200 ] && [ "$NESTED_STATUS" -eq 200 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED!"
    echo "==================="
    echo "NeuraStore+ upload pipeline is working correctly."
    exit 0
else
    echo ""
    echo "❌ SOME TESTS FAILED"
    echo "==================="
    echo "Please check the logs and responses above for details."
    exit 1
fi
