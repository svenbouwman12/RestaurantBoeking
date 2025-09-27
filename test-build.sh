#!/bin/bash

echo "🚀 Testing build before push..."

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Go to client directory
cd client

echo "📦 Installing dependencies..."
if ! npm install; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🔍 Running linting..."
if ! npm run lint; then
    echo "❌ Linting failed! Please fix the errors."
    exit 1
fi

echo "🔨 Running build..."
if ! npm run build; then
    echo "❌ Build failed! Please fix the errors."
    exit 1
fi

echo "✅ All checks passed! Safe to push to GitHub."
echo "🎉 Your code will build successfully on Vercel!"
