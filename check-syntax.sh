#!/bin/bash

echo "🔍 Checking syntax errors..."

cd client

# Try to build and capture errors
if npm run build 2>&1 | grep -q "Syntax error"; then
  echo "❌ Syntax error detected!"
  echo "Running build to show detailed errors:"
  npm run build
  exit 1
else
  echo "✅ No syntax errors found!"
  exit 0
fi
