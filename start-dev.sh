#!/bin/bash

# Better Architecture - Development Setup Script

echo "🏗️  Better Architecture - Starting Development Environment"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Start Backend
echo "${BLUE}🚀 Starting Spring Boot Backend...${NC}"
cd api
./gradlew bootRun &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Start Frontend
echo "${BLUE}🎨 Starting React Frontend...${NC}"
cd client

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "${GREEN}✅ Development environment started!${NC}"
echo ""
echo "📍 Backend running at: http://localhost:8080"
echo "📍 Frontend running at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo ""
    echo "${BLUE}🛑 Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "${GREEN}✅ Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
