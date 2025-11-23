# Big 3 V3: Quick Start Guide

## Prerequisites

Ensure you have the following installed:
- Node.js 18+ 
- bun or pnpm
- Git
- Docker (for local MCP servers)

## Step 1: Initialize Project

```bash
# Create project directory
mkdir big3-v3
cd big3-v3

# Initialize TypeScript project
npm init -y
npm install -D typescript @types/node tsx
npx tsc --init --strict

# Create project structure
mkdir -p src/{agents,mcp,sandbox,orchestration,effects}
```

## Step 2: Install Core Dependencies

```bash
# OpenAI Agents SDK and related
npm install @openai/agents-sdk @langchain/deepagents

# MCP Protocol
npm install @modelcontextprotocol/sdk codex-mcp-server

# VibeKit for sandboxing
npm install @vibe-kit/sdk @vibe-kit/e2b @vibe-kit/beam

# Effect-TS for orchestration
npm install effect @effect/schema

# Infrastructure
npm install encore.dev ioredis

# Development tools
npm install -D @types/ws vitest @vitest/ui
```

## Step 3: Environment Setup

Create `.env` file:

```env
# Core API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Codex Configuration
CODEX_API_KEY=...
CODEX_MCP_PORT=8080

# VibeKit Sandbox Providers
E2B_API_KEY=...
BEAM_TOKEN=...
BEAM_WORKSPACE_ID=...
NORTHFLANK_API_KEY=...
NORTHFLANK_PROJECT_ID=...

# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo-name

# Database & Cache
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://user:pass@localhost:5432/big3

# Monitoring
SENTRY_DSN=https://...
TELEMETRY_ENABLED=true

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

## Step 4: Start MCP Servers

### Option A: Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  codex-mcp:
    image: openai/codex-mcp:latest
    ports:
      - "8080:8080"
    environment:
      - CODEX_API_KEY=${CODEX_API_KEY}
      - LOG_LEVEL=debug
    volumes:
      - ./workspace:/workspace

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=big3
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=big3
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

Start services:
```bash
docker-compose up -d
```

### Option B: Local Installation

```bash
# Install Codex CLI globally
npm install -g @openai/codex-cli

# Start Codex as MCP server
codex mcp --port 8080

# In another terminal, start Redis
redis-server

# Start PostgreSQL (if not using Docker)
pg_ctl start
```

## Step 5: Initialize Agents

Create `src/index.ts`:

```typescript
import { config } from "dotenv"
import { AgentOrchestrator } from "./orchestration/workflow"
import { initializeMCPServers } from "./mcp/init"
import { VibeKitFactory } from "./sandbox/vibekit-config"

config() // Load environment variables

async function main() {
  console.log("🚀 Initializing Big 3 V3 Super-Agent...")
  
  // Initialize MCP servers
  await initializeMCPServers()
  
  // Create orchestrator
  const orchestrator = new AgentOrchestrator()
  
  // Test with a simple task
  const result = await orchestrator.executeTask({
    description: "Create a simple counter component with increment/decrement buttons",
    type: "feature",
    priority: "low"
  })
  
  console.log("✅ Task completed:", result)
}

main().catch(console.error)
```

## Step 6: Run Your First Multi-Agent Task

```bash
# Run with tsx for TypeScript support
npx tsx src/index.ts

# Or compile and run
npx tsc
node dist/index.js
```

## Step 7: Monitor Execution

### View Traces

1. Open OpenAI Dashboard: https://platform.openai.com/traces
2. Filter by your API key
3. Watch real-time agent interactions

### Local Monitoring

Create `src/monitor.ts`:

```typescript
import { createServer } from "http"
import { Server } from "socket.io"

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: "*" }
})

io.on("connection", (socket) => {
  console.log("Monitor connected")
  
  // Stream agent events
  socket.on("agent:event", (data) => {
    console.log("[AGENT]", data)
  })
})

httpServer.listen(3001)
console.log("📊 Monitor running on http://localhost:3001")
```

## Common Tasks

### Add a New Specialist Agent

```typescript
// src/agents/specialists/data-analyst.ts
import { Agent } from "@openai/agents-sdk"

export const dataAnalystAgent = new Agent({
  name: "Data Analyst",
  model: "gpt-5",
  instructions: `
    You are a data analysis specialist.
    Use Python/pandas for analysis.
    Create visualizations with plotly.
    Generate insights and reports.
  `,
  tools: [pythonTool, plotlyTool],
  mcp_servers: [jupyterMCP]
})
```

### Execute Parallel Tasks

```typescript
const tasks = [
  { agent: "designer", prompt: "Design a dashboard" },
  { agent: "backend", prompt: "Create REST API" },
  { agent: "frontend", prompt: "Build React app" }
]

const results = await Promise.all(
  tasks.map(t => orchestrator.runAgent(t.agent, t.prompt))
)
```

### Create Branch-Based Development

```typescript
const vibeKit = VibeKitFactory.create("claude")
  .withWorktrees({
    root: "/workspace/worktrees",
    cleanup: false
  })

// Work on feature branch
await vibeKit.generateCode({
  prompt: "Add user authentication",
  mode: "code",
  branch: "feature/auth"
})

// Create PR when ready
await vibeKit.createPR({
  title: "Add authentication",
  description: "Implements JWT auth"
})
```

## Troubleshooting

### MCP Connection Issues

```bash
# Check if Codex MCP is running
curl http://localhost:8080/health

# View MCP logs
docker logs big3-v3-codex-mcp-1

# Test MCP connection
npx codex mcp test
```

### Sandbox Errors

```bash
# Verify E2B credentials
curl -H "X-API-Key: $E2B_API_KEY" \
  https://api.e2b.dev/v1/sandboxes

# Check Beam status
beam status --token $BEAM_TOKEN
```

### Agent Failures

```typescript
// Enable debug logging
process.env.LOG_LEVEL = "debug"
process.env.OPENAI_LOG = "debug"

// Add error handlers
orchestrator.on("error", (error) => {
  console.error("Agent error:", error)
  // Send to monitoring service
})
```

## Production Deployment

### Using Encore.dev

```typescript
// src/api.ts
import { api } from "encore.dev/api"

export const runTask = api(
  { expose: true, method: "POST", path: "/tasks" },
  async (req: { task: string }): Promise<{ result: any }> => {
    const orchestrator = new AgentOrchestrator()
    const result = await orchestrator.executeTask({
      description: req.task,
      type: "feature",
      priority: "medium"
    })
    return { result }
  }
)
```

Deploy:
```bash
encore app create big3-v3
encore deploy
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t big3-v3 .
docker run -p 3000:3000 --env-file .env big3-v3
```

## Resources

- [OpenAI Agents SDK Docs](https://developers.openai.com/agents-sdk)
- [Codex MCP Documentation](https://developers.openai.com/codex/mcp)
- [VibeKit Documentation](https://docs.vibekit.sh)
- [Effect-TS Guide](https://effect.website)
- [MCP Specification](https://modelcontextprotocol.io)

## Support

- GitHub Issues: [your-repo/issues](https://github.com/your-repo/issues)
- Discord: [Join our community](https://discord.gg/...)
- Documentation: [Full docs](https://docs.big3-v3.dev)

## License

MIT
