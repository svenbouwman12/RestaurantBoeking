#!/bin/bash

echo "🔧 Fixing ESLint errors..."

cd client

echo "Running ESLint with auto-fix..."
npm run lint:fix

echo "Checking for remaining errors..."
npm run lint

if [ $? -eq 0 ]; then
    echo "✅ All ESLint errors fixed!"
else
    echo "❌ Some errors remain. Please fix them manually."
    exit 1
fi
