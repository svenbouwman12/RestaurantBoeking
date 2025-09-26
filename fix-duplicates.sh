#!/bin/bash

echo "🔍 Checking for duplicate declarations..."

# Check for common duplicate declaration patterns
if grep -r "import.*Settings.*from.*lucide-react" client/src/ && grep -r "import.*Settings.*from.*\./Settings" client/src/; then
  echo "❌ Duplicate Settings declaration detected!"
  echo "Fixing by renaming lucide-react Settings to SettingsIcon..."
  
  # Fix the import
  sed -i '' 's/Settings,/Settings as SettingsIcon,/g' client/src/components/OwnerDashboard.tsx
  sed -i '' 's/<Settings /<SettingsIcon /g' client/src/components/OwnerDashboard.tsx
  
  echo "✅ Fixed duplicate Settings declaration!"
else
  echo "✅ No duplicate declarations found!"
fi

echo "🔍 Running syntax check..."
cd client
if npm run build > /dev/null 2>&1; then
  echo "✅ Build successful!"
  exit 0
else
  echo "❌ Build failed! Showing errors:"
  npm run build
  exit 1
fi
