#!/bin/bash

echo "🍽️ Setting up Tafel Reserveren - Restaurant Table Reservation System"
echo "=================================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install root dependencies"
    exit 1
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install client dependencies"
    exit 1
fi

cd ..

# Create environment files if they don't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Supabase credentials"
fi

if [ ! -f client/.env ]; then
    echo "📝 Creating client/.env file from template..."
    cp client/env.example client/.env
    echo "⚠️  Please edit client/.env file with your Supabase credentials"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your Supabase project:"
echo "   - Go to https://supabase.com"
echo "   - Create a new project"
echo "   - Run the SQL from supabase-schema.sql in the SQL editor"
echo ""
echo "2. Configure environment variables:"
echo "   - Edit .env (backend configuration)"
echo "   - Edit client/.env (frontend configuration)"
echo ""
echo "3. Start the application:"
echo "   npm run dev"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "📚 For detailed instructions, see README.md"
echo ""
echo "Happy coding! 🚀"
