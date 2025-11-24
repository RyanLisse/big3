#!/bin/bash

set -e

echo "================================"
echo "🔍 VERIFICATION SCRIPT"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Test function
test_step() {
  local name=$1
  local command=$2
  
  echo -n "Testing: $name... "
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
  fi
}

echo "📦 STEP 1: Root Package Integrity"
echo "=================================="
test_step "Root package.json exists" "[ -f package.json ]"
test_step "Root package.json is valid JSON" "node -e \"require('./package.json')\""
test_step "pnpm-lock.yaml exists" "[ -f pnpm-lock.yaml ]"

echo ""
echo "📦 STEP 2: Frontend Package Integrity"
echo "======================================"
test_step "Frontend package.json exists" "[ -f frontend/package.json ]"
test_step "Frontend package.json is valid JSON" "node -e \"require('./frontend/package.json')\""
test_step "Frontend node_modules exists" "[ -d frontend/node_modules ]"

echo ""
echo "🏗️  STEP 3: TypeScript Compilation"
echo "=================================="
test_step "Root tsconfig.json exists" "[ -f tsconfig.json ]"
test_step "Frontend tsconfig.json exists" "[ -f frontend/tsconfig.json ]"

echo ""
echo "📁 STEP 4: Frontend Source Structure"
echo "===================================="
test_step "src/app directory exists" "[ -d frontend/src/app ]"
test_step "src/components directory exists" "[ -d frontend/src/components ]"
test_step "src/hooks directory exists" "[ -d frontend/src/hooks ]"
test_step "src/app/page.tsx exists" "[ -f frontend/src/app/page.tsx ]"
test_step "src/app/layout.tsx exists" "[ -f frontend/src/app/layout.tsx ]"

echo ""
echo "🛣️  STEP 5: Route Components"
echo "============================"
test_step "Home page component" "[ -f frontend/src/app/page.tsx ]"
test_step "Environments page component" "[ -f frontend/src/app/environments/page.tsx ]"
test_step "Task detail page component" "[ -f frontend/src/app/task/\[id\]/page.tsx ]"

echo ""
echo "🧩 STEP 6: Key Components"
echo "========================="
test_step "Navbar component" "[ -f frontend/src/components/Navbar.tsx ]"
test_step "TaskForm component" "[ -f frontend/src/app/_components/TaskForm.tsx ]"
test_step "TaskList component" "[ -f frontend/src/app/_components/TaskList.tsx ]"
test_step "InngestContainer component" "[ -f frontend/src/app/InngestContainer.tsx ]"

echo ""
echo "🪝 STEP 7: Hooks"
echo "================"
test_step "useGitHubAuth hook" "[ -f frontend/src/hooks/use-github-auth.ts ]"

echo ""
echo "🧪 STEP 8: Test Files"
echo "====================="
test_step "EnvironmentsPage tests" "[ -f frontend/src/app/environments/__tests__/environments-page.test.tsx ]"
test_step "TaskForm tests" "[ -f frontend/src/app/_components/__tests__/TaskForm.test.tsx ]"
test_step "TaskList tests" "[ -f frontend/src/app/_components/__tests__/TaskList.test.tsx ]"
test_step "TaskDetailPage tests" "[ -f frontend/src/app/task/__tests__/task-detail.test.tsx ]"
test_step "Navbar tests" "[ -f frontend/src/components/__tests__/Navbar.test.tsx ]"

echo ""
echo "🎨 STEP 9: Styling"
echo "=================="
test_step "globals.css exists" "[ -f frontend/src/app/globals.css ]"
test_step "tailwind.config exists" "[ -f frontend/tailwind.config.ts ] || [ -f frontend/tailwind.config.js ]"

echo ""
echo "🔧 STEP 10: Configuration Files"
echo "================================"
test_step "next.config exists" "[ -f frontend/next.config.ts ] || [ -f frontend/next.config.js ]"
test_step ".env.example exists" "[ -f .env.example ]"

echo ""
echo "================================"
echo "📊 RESULTS"
echo "================================"
echo -e "✓ Passed: ${GREEN}$PASSED${NC}"
echo -e "✗ Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
  exit 1
fi
