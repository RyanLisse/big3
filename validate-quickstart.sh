#!/bin/bash

# Quickstart Validation Script for Big 3 Super-Agent V2
# This script validates each step in the quickstart.md

set -e  # Exit on any error

echo "🚀 Starting Big 3 Super-Agent V2 Quickstart Validation"
echo "=================================================="

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env file"
else
    echo "⚠️  .env file not found, creating example .env file"
    cat > .env << EOF
# OpenAI Realtime API
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Redis URL
REDIS_URL=redis://localhost:6379

# Encore Runtime
ENCORE_RUNTIME_LIB=/opt/homebrew/Cellar/encore/1.51.10/libexec/runtimes/js/encore-runtime.node
EOF
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local step=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $step: $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC} - $step: $message"
    else
        echo -e "${YELLOW}⚠️  WARN${NC} - $step: $message"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if environment variable is set
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -n "$var_value" ]; then
        return 0
    else
        return 1
    fi
}

echo ""
echo "Step 1: Checking Prerequisites"
echo "----------------------------"

# Check Node.js version
if command_exists node; then
    node_version=$(node --version | cut -d'v' -f2)
    major_version=$(echo $node_version | cut -d'.' -f1)
    if [ "$major_version" -ge 20 ]; then
        print_status "Node.js" "PASS" "Version $node_version (>= 20)"
    else
        print_status "Node.js" "FAIL" "Version $node_version (< 20, need 20+)"
    fi
else
    print_status "Node.js" "FAIL" "Node.js not found"
fi

# Check pnpm
if command_exists pnpm; then
    pnpm_version=$(pnpm --version)
    print_status "pnpm" "PASS" "Version $pnpm_version"
else
    print_status "pnpm" "FAIL" "pnpm not found"
fi

# Check Encore CLI
if command_exists encore; then
    encore_version=$(encore version 2>/dev/null || echo "unknown")
    print_status "Encore CLI" "PASS" "Version $encore_version"
else
    print_status "Encore CLI" "FAIL" "Encore CLI not found"
fi

# Check Redis connection
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        print_status "Redis" "PASS" "Redis server is reachable"
    else
        print_status "Redis" "WARN" "Redis server not reachable (may need to start Redis)"
    fi
else
    print_status "Redis CLI" "WARN" "redis-cli not found (Redis may still be running)"
fi

echo ""
echo "Step 2: Checking Environment Variables"
echo "--------------------------------------"

# Check required environment variables
env_vars=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "GEMINI_API_KEY" "REDIS_URL" "ENCORE_RUNTIME_LIB")

all_vars_set=true
for var in "${env_vars[@]}"; do
    if check_env_var "$var"; then
        print_status "$var" "PASS" "Environment variable is set"
    else
        print_status "$var" "FAIL" "Environment variable is not set"
        all_vars_set=false
    fi
done

if [ "$all_vars_set" = false ]; then
    echo ""
    echo "⚠️  Some environment variables are missing. Please check your .env file."
fi

echo ""
echo "Step 3: Installing Dependencies"
echo "-------------------------------"

if [ -f "package.json" ]; then
    echo "Running pnpm install..."
    if pnpm install >/dev/null 2>&1; then
        print_status "Dependencies" "PASS" "Dependencies installed successfully"
    else
        print_status "Dependencies" "FAIL" "Failed to install dependencies"
    fi
else
    print_status "package.json" "FAIL" "package.json not found"
fi

echo ""
echo "Step 4: Running Tests"
echo "--------------------"

echo "Running test suite..."
if pnpm test --reporter=verbose >/dev/null 2>&1; then
    print_status "Tests" "PASS" "All tests passed"
else
    print_status "Tests" "WARN" "Some tests failed (check output for details)"
fi

echo ""
echo "Step 5: Backend Service Validation"
echo "----------------------------------"

# Check if backend directory exists
if [ -d "backend" ]; then
    print_status "Backend Directory" "PASS" "Backend directory exists"
    
    # Check for required backend files
    backend_files=("encore.app" "package.json")
    for file in "${backend_files[@]}"; do
        if [ -f "backend/$file" ]; then
            print_status "Backend $file" "PASS" "File exists"
        else
            print_status "Backend $file" "FAIL" "File missing"
        fi
    done
    
    # Try to start backend (brief check)
    echo "Attempting to start backend service..."
    cd backend
    if timeout 10s encore run >/dev/null 2>&1; then
        print_status "Backend Start" "PASS" "Backend starts successfully"
    else
        print_status "Backend Start" "WARN" "Backend may have issues (check logs)"
    fi
    cd ..
else
    print_status "Backend Directory" "FAIL" "Backend directory not found"
fi

echo ""
echo "Step 6: API Endpoint Validation"
echo "--------------------------------"

# Check if we can reach the backend API (basic check)
if command_exists curl; then
    echo "Testing API endpoints..."
    
    # Test health endpoint if available
    if curl -s http://localhost:4000/health >/dev/null 2>&1; then
        print_status "API Health" "PASS" "API health endpoint responds"
    else
        print_status "API Health" "WARN" "API health endpoint not reachable (backend may not be running)"
    fi
    
    # Test spawn endpoint if available
    if curl -s -X POST http://localhost:4000/agents/spawn -H "Content-Type: application/json" -d '{"input":{"type":"text","content":"test"}}' >/dev/null 2>&1; then
        print_status "API Spawn" "PASS" "API spawn endpoint responds"
    else
        print_status "API Spawn" "WARN" "API spawn endpoint not reachable"
    fi
else
    print_status "curl" "WARN" "curl not available for API testing"
fi

echo ""
echo "Step 7: File Structure Validation"
echo "--------------------------------"

# Check key directories and files
key_dirs=("backend/agent" "test/agent" "specs/001-big3-super-agent-v2")
for dir in "${key_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_status "Directory $dir" "PASS" "Directory exists"
    else
        print_status "Directory $dir" "FAIL" "Directory missing"
    fi
done

key_files=("backend/agent/graph.ts" "backend/agent/logging.ts" "backend/agent/persistence.ts" "specs/001-big3-super-agent-v2/tasks.md")
for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "File $file" "PASS" "File exists"
    else
        print_status "File $file" "FAIL" "File missing"
    fi
done

echo ""
echo "Step 8: Legacy CLI Validation"
echo "------------------------------"

if [ -f "src/main.ts" ]; then
    print_status "Legacy CLI" "PASS" "src/main.ts exists"
    
    # Check if tsx is available
    if command_exists tsx; then
        print_status "tsx" "PASS" "tsx command available"
    else
        print_status "tsx" "WARN" "tsx not found (may need to install)"
    fi
else
    print_status "Legacy CLI" "WARN" "src/main.ts not found"
fi

echo ""
echo "=================================================="
echo "🏁 Quickstart Validation Complete"
echo ""

# Summary
echo "Summary:"
echo "- Prerequisites: Node.js, pnpm, Encore CLI"
echo "- Environment: Check .env file for required variables"
echo "- Dependencies: Run 'pnpm install'"
echo "- Tests: Run 'pnpm test'"
echo "- Backend: Start with 'encore run' in backend directory"
echo "- API: Test endpoints at localhost:4000"
echo "- CLI: Use 'pnpm tsx src/main.ts' for experiments"
echo ""
echo "For detailed setup instructions, see: specs/001-big3-super-agent-v2/quickstart.md"
