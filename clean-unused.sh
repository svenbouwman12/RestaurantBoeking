#!/bin/bash

echo "🧹 Cleaning unused imports and variables..."

# Remove unused imports and variables from OwnerDashboard.tsx
echo "Cleaning OwnerDashboard.tsx..."

# Remove unused useNavigate import if it exists
sed -i '' '/import { useNavigate } from '\''react-router-dom'\'';/d' client/src/components/OwnerDashboard.tsx

# Remove unused navigate variable
sed -i '' '/const navigate = useNavigate();/d' client/src/components/OwnerDashboard.tsx

echo "✅ Cleaned unused imports and variables!"

# Run build to check
echo "🔍 Running build check..."
cd client
if npm run build > /dev/null 2>&1; then
  echo "✅ Build successful!"
  exit 0
else
  echo "❌ Build failed! Showing errors:"
  npm run build
  exit 1
fi
