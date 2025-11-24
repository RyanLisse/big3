# Big3 AI Agent SDK - Makefile
# Complete application orchestration

.PHONY: help install dev dev-backend dev-frontend dev-all stop test test-all test-watch test-coverage lint typecheck build clean setup-env check-deps redis-start redis-stop docker-up docker-down logs

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ Help
help: ## Display this help message
	@echo "$(BLUE)Big3 AI Agent SDK$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(CYAN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup
install: ## Install all dependencies (root + backend + frontend)
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pnpm install
	cd backend && pnpm install
	cd frontend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup-env: ## Setup environment files from examples
	@echo "$(BLUE)Setting up environment files...$(NC)"
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env 2>/dev/null || echo "No .env.example found"; \
	fi
	@if [ ! -f .env.test ]; then \
		echo "Creating .env.test..."; \
		echo "# Test environment - Add your test API keys here" > .env.test; \
	fi
	@echo "$(GREEN)✓ Environment files ready$(NC)"
	@echo "$(YELLOW)⚠ Please update .env with your actual API keys$(NC)"

check-deps: ## Check if required dependencies are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js not found$(NC)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)✗ pnpm not found. Install: npm install -g pnpm$(NC)"; exit 1; }
	@command -v encore >/dev/null 2>&1 || { echo "$(YELLOW)⚠ Encore CLI not found. Install: https://encore.dev/docs/install$(NC)"; }
	@command -v valkey-server >/dev/null 2>&1 || command -v redis-server >/dev/null 2>&1 || { echo "$(YELLOW)⚠ Redis/Valkey not found. Install: brew install valkey$(NC)"; }
	@echo "$(GREEN)✓ Core dependencies found$(NC)"

##@ Development
dev: dev-all ## Start all services (alias for dev-all)

dev-all: kill-ports redis-start ## Start backend + frontend + redis in parallel (recommended)
	@echo "$(BLUE)Starting all services...$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:4000$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Redis:    localhost:6379$(NC)"
	@echo ""
	@trap '$(MAKE) stop' INT; \
	(cd backend && encore run 2>&1 | sed 's/^/[backend]  /' &); \
	(cd frontend && npm run dev 2>&1 | sed 's/^/[frontend] /' &); \
	wait

dev-backend: kill-backend-port ## Start only the Encore backend service
	@echo "$(BLUE)Starting backend on http://localhost:4000$(NC)"
	cd backend && encore run

dev-frontend: kill-frontend-port ## Start only the Next.js frontend
	@echo "$(BLUE)Starting frontend on http://localhost:3000$(NC)"
	cd frontend && npm run dev

dev-sdk: ## Run SDK in development mode
	@echo "$(BLUE)Running SDK in dev mode...$(NC)"
	pnpm dev

kill-ports: ## Kill processes on all standard ports (3000, 4000, 6379)
	@echo "$(BLUE)Cleaning up ports...$(NC)"
	@lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Killed process on port 3000$(NC)" || true
	@lsof -ti:4000 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Killed process on port 4000$(NC)" || true
	@lsof -ti:6379 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Killed process on port 6379$(NC)" || true
	@sleep 1
	@echo "$(GREEN)✓ Ports cleaned$(NC)"

kill-backend-port: ## Kill process on backend port (4000)
	@echo "$(BLUE)Cleaning backend port 4000...$(NC)"
	@lsof -ti:4000 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Port 4000 cleaned$(NC)" || true
	@sleep 0.5

kill-frontend-port: ## Kill process on frontend port (3000)
	@echo "$(BLUE)Cleaning frontend port 3000...$(NC)"
	@lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Port 3000 cleaned$(NC)" || true
	@sleep 0.5

kill-redis-port: ## Kill process on Redis port (6379)
	@echo "$(BLUE)Cleaning Redis port 6379...$(NC)"
	@lsof -ti:6379 | xargs kill -9 2>/dev/null && echo "$(GREEN)✓ Port 6379 cleaned$(NC)" || true
	@sleep 0.5

stop: ## Stop all running services
	@echo "$(BLUE)Stopping services...$(NC)"
	-pkill -f "encore run"
	-pkill -f "next dev"
	@$(MAKE) kill-ports
	@echo "$(GREEN)✓ All services stopped$(NC)"

##@ Redis/Valkey
redis-start: ## Start Redis/Valkey server (local)
	@if pgrep -x redis-server > /dev/null || pgrep -x valkey-server > /dev/null; then \
		echo "$(GREEN)✓ Redis/Valkey already running$(NC)"; \
	else \
		echo "$(BLUE)Starting Redis/Valkey...$(NC)"; \
		if command -v valkey-server > /dev/null; then \
			valkey-server --daemonize yes --port 6379 2>/dev/null; \
			sleep 1; \
			if valkey-cli ping > /dev/null 2>&1; then \
				echo "$(GREEN)✓ Valkey started on port 6379$(NC)"; \
			else \
				echo "$(YELLOW)⚠ Could not start Valkey. Using Docker fallback$(NC)"; \
				exit 0; \
			fi; \
		elif command -v redis-server > /dev/null; then \
			redis-server --daemonize yes --port 6379 2>/dev/null; \
			sleep 1; \
			if redis-cli ping > /dev/null 2>&1; then \
				echo "$(GREEN)✓ Redis started on port 6379$(NC)"; \
			else \
				echo "$(YELLOW)⚠ Could not start Redis. Using Docker fallback$(NC)"; \
				exit 0; \
			fi; \
		else \
			echo "$(YELLOW)⚠ No Redis/Valkey found. Using Docker fallback$(NC)"; \
			exit 0; \
		fi; \
	fi

redis-stop: ## Stop Redis/Valkey server
	@echo "$(BLUE)Stopping Redis/Valkey...$(NC)"
	@if command -v valkey-cli > /dev/null; then \
		valkey-cli shutdown 2>/dev/null || echo "$(YELLOW)⚠ Valkey not running$(NC)"; \
	elif command -v redis-cli > /dev/null; then \
		redis-cli shutdown 2>/dev/null || echo "$(YELLOW)⚠ Redis not running$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No Redis/Valkey CLI found$(NC)"; \
	fi
	@echo "$(GREEN)✓ Redis/Valkey stopped$(NC)"

redis-cli: ## Open Redis/Valkey CLI
	@if command -v valkey-cli > /dev/null; then \
		valkey-cli; \
	elif command -v redis-cli > /dev/null; then \
		redis-cli; \
	else \
		echo "$(RED)✗ No Redis/Valkey CLI found$(NC)"; \
	fi

redis-service: ## Start Redis/Valkey as a service (brew services)
	@if command -v valkey > /dev/null; then \
		echo "$(BLUE)Starting Valkey service...$(NC)"; \
		brew services start valkey; \
	elif command -v redis > /dev/null; then \
		echo "$(BLUE)Starting Redis service...$(NC)"; \
		brew services start redis; \
	else \
		echo "$(RED)✗ No Redis/Valkey found$(NC)"; \
	fi

redis-service-stop: ## Stop Redis/Valkey service
	@if command -v valkey > /dev/null; then \
		echo "$(BLUE)Stopping Valkey service...$(NC)"; \
		brew services stop valkey; \
	elif command -v redis > /dev/null; then \
		echo "$(BLUE)Stopping Redis service...$(NC)"; \
		brew services stop redis; \
	else \
		echo "$(RED)✗ No Redis/Valkey found$(NC)"; \
	fi

##@ Docker
docker-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting Docker services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Docker services started$(NC)"

docker-down: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Docker services stopped$(NC)"

docker-logs: ## View Docker logs
	docker-compose logs -f

##@ Testing
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	pnpm test --run

test-all: ## Run all tests (alias for test)
	@$(MAKE) test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	pnpm test

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	pnpm coverage

test-unit: ## Run only unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	pnpm test test/ --run

test-integration: ## Run only integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	pnpm test test/agent/ --run

test-multi-agent: ## Run multi-agent tests
	@echo "$(BLUE)Running multi-agent tests...$(NC)"
	pnpm test test/multi-agent --run

##@ Code Quality
lint: ## Run linter and auto-fix issues
	@echo "$(BLUE)Running linter...$(NC)"
	pnpm lint
	cd backend && pnpm build 2>&1 | grep -i "error" || true
	cd frontend && npm run lint

lint-check: ## Check linting without fixing
	@echo "$(BLUE)Checking code quality...$(NC)"
	pnpm lint-check

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	pnpm typecheck

format: ## Format code with Ultracite/Biome
	@echo "$(BLUE)Formatting code...$(NC)"
	pnpm dlx ultracite fix

##@ Build
build: ## Build all projects
	@echo "$(BLUE)Building projects...$(NC)"
	pnpm build
	cd backend && pnpm build
	cd frontend && npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-sdk: ## Build only the SDK
	@echo "$(BLUE)Building SDK...$(NC)"
	pnpm build

build-backend: ## Build only the backend
	@echo "$(BLUE)Building backend...$(NC)"
	cd backend && pnpm build

build-frontend: ## Build only the frontend
	@echo "$(BLUE)Building frontend...$(NC)"
	cd frontend && npm run build

clean: ## Clean all build artifacts and dependencies
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist
	rm -rf backend/dist
	rm -rf frontend/.next
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf coverage
	@echo "$(GREEN)✓ Clean complete$(NC)"

##@ Utilities
logs: ## View recent logs (requires logging setup)
	@echo "$(BLUE)Recent logs:$(NC)"
	@tail -n 50 logs/*.json 2>/dev/null || echo "No logs found"

visualize-stream: ## Run stream visualizer
	@echo "$(BLUE)Starting stream visualizer...$(NC)"
	pnpm visualize-stream

modernize: ## Run code modernization analysis
	@echo "$(BLUE)Running modernization analysis...$(NC)"
	pnpm modernize:analyze

##@ Quick Start
quickstart: check-deps install setup-env redis-start ## Complete setup from scratch
	@echo ""
	@echo "$(GREEN)✓✓✓ Quick start complete! ✓✓✓$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  1. Update .env with your API keys"
	@echo "  2. Run: $(YELLOW)make dev$(NC) to start all services"
	@echo "  3. Open http://localhost:3000 for frontend"
	@echo "  4. Open http://localhost:4000 for backend API"
	@echo ""

##@ CI/CD
ci-test: ## Run tests in CI mode
	@echo "$(BLUE)Running CI tests...$(NC)"
	$(MAKE) test-all --reporter=verbose

ci-build: ## Build for CI/CD
	@echo "$(BLUE)Building for CI/CD...$(NC)"
	$(MAKE) typecheck
	$(MAKE) lint-check
	$(MAKE) build
	$(MAKE) test-all

##@ Information
status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@echo -n "Redis:    "
	@if pgrep -x redis-server > /dev/null 2>/dev/null; then \
		echo "$(GREEN)✓ Running (Redis)$(NC)"; \
	elif pgrep -x valkey-server > /dev/null 2>/dev/null; then \
		echo "$(GREEN)✓ Running (Valkey)$(NC)"; \
	elif pgrep "valkey-server" > /dev/null 2>/dev/null; then \
		echo "$(GREEN)✓ Running (Valkey)$(NC)"; \
	else \
		echo "$(RED)✗ Stopped$(NC)"; \
	fi
	@echo -n "Backend:  "
	@if pgrep -f "encore run" > /dev/null 2>/dev/null; then \
		echo "$(GREEN)✓ Running$(NC)"; \
	else \
		echo "$(RED)✗ Stopped$(NC)"; \
	fi
	@echo -n "Frontend: "
	@if pgrep -f "next dev" > /dev/null 2>/dev/null; then \
		echo "$(GREEN)✓ Running$(NC)"; \
	else \
		echo "$(RED)✗ Stopped$(NC)"; \
	fi

ports: ## Show which ports are in use
	@echo "$(BLUE)Port Usage:$(NC)"
	@lsof -i :3000 -i :4000 -i :6379 2>/dev/null | grep LISTEN || echo "No services running on standard ports"
