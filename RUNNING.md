# Running the Big3 AI Agent Application

## Quick Start (Recommended)

```bash
# Complete setup from scratch
make quickstart

# Start all services
make dev

# Or using npm/pnpm
pnpm start
```

That's it! Your application will be running at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Redis**: localhost:6379

---

## Prerequisites

### Required
- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** ([Install](https://pnpm.io/installation): `npm install -g pnpm`)

### Recommended
- **Encore CLI** ([Install](https://encore.dev/docs/install))
- **Redis** ([Install](https://redis.io/docs/getting-started/installation/))
  - macOS: `brew install redis`
  - Ubuntu: `sudo apt install redis-server`
  - Windows: Use Docker or WSL2

### Optional
- **Docker & Docker Compose** (for containerized Redis)
- **Make** (usually pre-installed on macOS/Linux)

---

## Installation

### 1. Check Dependencies
```bash
make check-deps
```

### 2. Install Packages
```bash
make install
```

This installs dependencies for:
- Root SDK workspace
- Backend (Encore service)
- Frontend (Next.js app)

### 3. Setup Environment
```bash
make setup-env
```

Then edit `.env` and `.env.test` with your API keys:
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
TAVILY_API_KEY=tvly-...
REDIS_URL=redis://localhost:6379
```

---

## Running the Application

### Option 1: All Services Together (Recommended)
```bash
make dev
# or
pnpm start
```

This starts:
- ✅ Redis server
- ✅ Encore backend (http://localhost:4000)
- ✅ Next.js frontend (http://localhost:3000)

### Option 2: Individual Services

#### Backend Only
```bash
make dev-backend
# or
cd backend && encore run
```

#### Frontend Only
```bash
make dev-frontend
# or
cd frontend && npm run dev
```

#### SDK Development
```bash
make dev-sdk
# or
pnpm dev
```

### Option 3: Using Docker
```bash
# Start Redis + other services via Docker
make docker-up

# Start app services
make dev-all

# Stop Docker services
make docker-down
```

---

## Testing

### Run All Tests
```bash
make test
```

### Watch Mode
```bash
make test-watch
```

### Coverage Report
```bash
make test-coverage
```

### Specific Test Suites
```bash
make test-unit           # Unit tests only
make test-integration    # Integration tests
make test-multi-agent    # Multi-agent tests
```

---

## Development Workflow

### 1. Start Development
```bash
# Terminal 1: Start Redis
make redis-start

# Terminal 2: Start backend
make dev-backend

# Terminal 3: Start frontend
make dev-frontend
```

Or use the all-in-one command:
```bash
make dev  # Runs everything in one terminal with log prefixes
```

### 2. Code Quality

#### Type Check
```bash
make typecheck
```

#### Lint & Fix
```bash
make lint
```

#### Format Code
```bash
make format
```

### 3. Build for Production
```bash
make build
```

Builds:
- SDK package (`dist/`)
- Backend service
- Frontend static site

---

## Redis Management

### Start Redis
```bash
make redis-start
```

### Stop Redis
```bash
make redis-stop
```

### Open Redis CLI
```bash
make redis-cli
```

### Check Redis Status
```bash
make status
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check which ports are in use
make ports

# Kill specific processes
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:4000 | xargs kill -9  # Backend
lsof -ti:6379 | xargs kill -9  # Redis
```

### Services Won't Start
```bash
# Stop all services
make stop

# Clean and reinstall
make clean
make install

# Start fresh
make dev
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Redis URL in .env
cat .env | grep REDIS_URL
# Should be: redis://localhost:6379
```

### Encore CLI Not Found
```bash
# Install Encore CLI
curl -L https://encore.dev/install.sh | bash

# Verify installation
encore version
```

### TypeScript Errors
```bash
# Run type check to see all errors
make typecheck

# Rebuild everything
make clean
make install
make build
```

### Test Failures
```bash
# Make sure .env.test exists with test API keys
cp .env .env.test

# Run specific test file
pnpm test path/to/test.test.ts --run

# Run with verbose output
pnpm test --run --reporter=verbose
```

---

## Makefile Commands Reference

```bash
make help                 # Show all available commands

# Setup
make install             # Install all dependencies
make setup-env           # Create .env files
make check-deps          # Verify prerequisites
make quickstart          # Complete setup from scratch

# Development
make dev                 # Start all services
make dev-backend         # Start backend only
make dev-frontend        # Start frontend only
make stop                # Stop all services

# Redis
make redis-start         # Start Redis
make redis-stop          # Stop Redis
make redis-cli           # Open Redis CLI

# Testing
make test                # Run all tests
make test-watch          # Watch mode
make test-coverage       # With coverage
make test-integration    # Integration tests only

# Code Quality
make lint                # Lint and fix
make typecheck           # Type checking
make format              # Format code

# Build
make build               # Build everything
make build-sdk           # Build SDK only
make build-backend       # Build backend only
make build-frontend      # Build frontend only
make clean               # Clean build artifacts

# Utilities
make status              # Show service status
make ports               # Show port usage
make logs                # View logs
make visualize-stream    # Stream visualizer
make modernize           # Code modernization

# Docker
make docker-up           # Start Docker services
make docker-down         # Stop Docker services
make docker-logs         # View Docker logs

# CI/CD
make ci-test             # Run tests in CI mode
make ci-build            # Build for CI/CD
```

---

## Project Structure

```
big3/
├── backend/           # Encore.dev service
│   ├── agent/        # Agent orchestration
│   └── encore.app    # Encore config
├── frontend/         # Next.js application
│   ├── src/          # Source code
│   └── public/       # Static assets
├── src/              # SDK source
│   ├── sdk/          # Core SDK
│   ├── services/     # Services
│   └── domain.ts     # Domain types
├── test/             # Test suites
├── docs/             # Documentation
├── specs/            # Feature specifications
├── Makefile          # Build automation
├── docker-compose.yml # Docker services
└── package.json      # Root workspace
```

---

## Environment Variables

### Required
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
REDIS_URL=redis://localhost:6379
```

### Optional
```bash
GEMINI_API_KEY=AIza...
TAVILY_API_KEY=tvly-...
AI_GATEWAY_API_KEY=vck_...
ENCORE_RUNTIME_LIB=/path/to/encore-runtime.node
```

---

## Next Steps

1. ✅ Install prerequisites
2. ✅ Run `make quickstart`
3. ✅ Add API keys to `.env`
4. ✅ Run `make dev`
5. 🚀 Start building!

### Useful Links
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Multi-Agent API**: http://localhost:4000/v2/multi-agent/health
- **API Docs**: http://localhost:4000/_docs (when backend running)

---

## Support

- **Documentation**: `docs/` folder
- **API Reference**: `backend/agent/multi-agent/API.md`
- **Testing Guide**: `backend/agent/AGENT_SERVICE_TESTING.md`
- **Specs**: `specs/` folder

For issues or questions, check the project README or open an issue on GitHub.
