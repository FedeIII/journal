#!/bin/bash

echo "🚀 Starting Journal Application..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL
echo "📦 Starting PostgreSQL database..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Setup backend if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

if [ ! -f "backend/.env" ]; then
    echo "⚙️  Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Remember to update backend/.env with your secrets!"
fi

# Setup frontend if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚙️  Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application, run these commands in separate terminals:"
echo ""
echo "  Terminal 1 (Backend):"
echo "  $ cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "  $ cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
