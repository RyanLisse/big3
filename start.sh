#!/bin/bash
# Quick start script for Big3 AI Agent SDK

set -e

echo "🚀 Starting Big3 AI Agent Application..."
echo ""

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from .env.test...${NC}"
    cp .env.test .env
    echo -e "${GREEN}✓ .env created${NC}"
    echo ""
fi

# Start Redis/Valkey (via Docker if local not available)
if ! command -v redis-server &> /dev/null && ! command -v valkey-server &> /dev/null; then
    echo -e "${BLUE}Starting Redis via Docker...${NC}"
    docker-compose up -d redis
    echo -e "${GREEN}✓ Redis started (Docker)${NC}"
else
    echo -e "${BLUE}Starting Redis/Valkey (local)...${NC}"
    make redis-start
fi

echo ""
echo -e "${BLUE}Starting Backend (Encore)...${NC}"
echo -e "${YELLOW}Backend will be at: http://localhost:4000${NC}"
echo ""

# Start backend in background
cd backend && encore run &
BACKEND_PID=$!

echo ""
echo -e "${BLUE}Starting Frontend (Next.js)...${NC}"
echo -e "${YELLOW}Frontend will be at: http://localhost:3000${NC}"
echo ""

# Start frontend in background
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait a bit for services to start
sleep 3

echo ""
echo -e "${GREEN}✓✓✓ All services started! ✓✓✓${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • Frontend:  ${YELLOW}http://localhost:3000${NC}"
echo -e "  • Backend:   ${YELLOW}http://localhost:4000${NC}"
echo -e "  • API Docs:  ${YELLOW}http://localhost:4000/_docs${NC}"
echo -e "  • Multi-Agent API: ${YELLOW}http://localhost:4000/v2/multi-agent/health${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Trap Ctrl+C to clean up
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; make redis-stop 2>/dev/null; exit" INT

# Wait for services
wait
