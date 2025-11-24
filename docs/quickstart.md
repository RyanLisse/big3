# 🚀 Big 3 Super-Agent V2 - Quick Start Guide

## 📋 Overview

The Big 3 Super-Agent V2 is a sophisticated AI agent orchestration system that provides:
- **Voice-driven coding assistance** with real-time audio processing
- **Multi-tool orchestration** (Voice, Coder, Browser tools)
- **Session persistence** and resumption capabilities  
- **Streaming observability** with live event monitoring
- **Effect-based architecture** with structured concurrency

## 🛠️ Prerequisites

- **Node.js** 18+ 
- **Redis** server running locally
- **pnpm** package manager
- **TypeScript** development environment

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd big3

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run type checking
pnpm typecheck
```

## 🚀 Quick Start

### 1. Start the Backend Service

```bash
# Start the Encore backend service
cd backend
encore dev

# The service will be available at:
# - Agent Registry: http://localhost:4000/agents
# - Streaming API: http://localhost:4000/agent/stream/:sessionId
# - Health checks: http://localhost:4000/health
```

### 2. Spawn a New Agent Session

```bash
# Spawn a new agent with initial prompt
curl -X POST http://localhost:4000/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "initialPrompt": "Help me create a React component for user authentication",
    "labels": {
      "project": "react-auth",
      "priority": "high"
    }
  }'

# Response:
{
  "sessionId": "session-abc123",
  "status": "running", 
  "plan": {
    "id": "plan-xyz789",
    "title": "React Authentication Component",
    "steps": [...]
  }
}
```

### 3. Monitor with Live Streaming

#### **CLI Visualization** (Recommended)
```bash
# Watch live events in your terminal
npm run visualize-stream session-abc123

# Output:
🤖 Big 3 Super-Agent V2 - Live Stream Visualization
Session ID: session-abc123
[20:37:01] 🔄 Status: planning → running
[20:37:02] 📋 Plan: React Authentication Component (executing)
[20:37:03] 🔧 Starting: coder - Analyze requirements
[20:37:05] ✅ Tool finished: coder (1200ms)
[20:37:06] 📄 Created: /workspace/components/AuthForm.tsx (2048 bytes)
[20:37:11] 🔄 Status: running → completed
```

#### **Frontend Integration**
```javascript
// Connect to the event stream
const eventSource = new EventSource('http://localhost:4000/agent/stream/session-abc123');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.content);
  
  switch (data.type) {
    case 'plan_update':
      updatePlanUI(data.content.plan_update);
      break;
    case 'tool_started':
      showToolProgress(data.content.tool_started);
      break;
    case 'tool_finished':
      completeToolStep(data.content.tool_finished);
      break;
    case 'artifact_created':
      showNewArtifact(data.content.artifact_created);
      break;
  }
};
```

### 4. Resume an Existing Session

```bash
# Resume a session with additional input
curl -X POST http://localhost:4000/agents/session-abc123/resume \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Now add TypeScript interfaces for the auth component"
  }'

# Response:
{
  "sessionId": "session-abc123",
  "status": "running",
  "plan": { /* updated plan with new steps */ },
  "artifacts": [ /* existing artifacts + new ones */ ]
}
```

### 5. Check Session Status

```bash
# Get current session status and artifacts
curl http://localhost:4000/agents/session-abc123/status

# Response:
{
  "sessionId": "session-abc123",
  "status": "completed",
  "lastUpdate": "2025-11-22T20:37:15.000Z",
  "artifacts": [
    {
      "id": "artifact-1",
      "path": "/workspace/components/AuthForm.tsx",
      "kind": "code",
      "createdAt": "2025-11-22T20:37:06.000Z"
    }
  ]
}
```

## 🔧 Development Workflow

### **SDK Usage Examples**

```typescript
import { Effect } from "effect";
import { createAgent } from "./src/sdk/agents";
import { createTeam, addAgent, sharedMemory, sendMessage } from "./src/sdk/agents";
import type { ModelRegistryImpl } from "./src/models/registry";

// Single agent
const registry = new ModelRegistryImpl();
const agent = createAgent(
  { 
    config: {
      name: "MyAgent",
      instructions: "You are a helpful assistant.",
    } 
  },
  registry
);

// Multi-agent team
const baseUrl = process.env.BACKEND_URL || "http://localhost:4000";

const teamReq = { name: "DevTeam", description: "Development coordination team" };
const team = await Effect.runPromise(createTeam(baseUrl, teamReq));

await Effect.runPromise(addAgent(baseUrl, team.id, {
  agentId: agent.id,
  role: "lead-developer"
}));

const memory = await Effect.runPromise(sharedMemory(baseUrl, team.id, {
  label: "project-requirements",
  value: JSON.stringify({ features: ["auth", "ui"] }),
  description: "Current project specs shared across agents",
  type: "project_context",
  accessLevel: "read_write"
}));

const response = await Effect.runPromise(sendMessage(baseUrl, "agent-reviewer", {
  fromAgentId: agent.id,
  teamId: team.id,
  content: "Please review the latest code changes."
}));
```

### **Running Tests**
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test test/agent/
pnpm test test/agent/streaming-observability-simple.test.ts

# Run with coverage
pnpm coverage
```

### **Code Quality**
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint-check

# Build
pnpm build
```

### **Local Development**
```bash
# Start development server
pnpm dev

# Run Encore service in separate terminal
cd backend && encore dev

# Monitor Redis (optional)
redis-cli monitor
```

## 🏗️ Architecture Overview

### **Core Components**

```typescript
// Main orchestrator
AgentOrchestrator {
  processRequest(sessionId, input): Promise<AgentResponse>
  createPlan(sessionId, goal): Promise<SoTPlan>
  executeStep(plan, stepId): Promise<SoTPlan>
}

// Tool interfaces
VoiceTool { transcribe(audioData), speak(text) }
CoderTool { analyzeCode(code), executeCode(code), generateCode(specs) }
BrowserTool { navigate(url), act(selector), extractContent() }

// Persistence layer
AgentSessionRepo { create, get, update, delete, listActive() }
WorkspaceArtifactRepo { create, get, list, update, delete() }

// Streaming observability
StreamManager { createStream, getStream, closeStream() }
StreamEventEmitter { emitPlanUpdate, emitToolStarted, emitToolFinished() }
```

### **Event Types**
```typescript
AgentStreamEvent {
  type: "plan_update" | "tool_started" | "tool_finished" | 
        "status_change" | "artifact_created" | "checkpoint" | "log"
  content: { /* type-specific data */ }
  timestamp: Date
  sessionId: string
}
```

## 📁 Project Structure

```
big3/
├── backend/agent/           # Core agent implementation
│   ├── domain.ts           # Domain types and interfaces
│   ├── graph.ts            # Orchestrator and SoT planning
│   ├── encore.service.ts   # Encore API endpoints
│   ├── persistence.ts      # Redis and filesystem persistence
│   ├── logging.ts          # Structured logging utilities
│   ├── observability.ts    # Metrics and tracing
│   └── stream-manager.ts   # Streaming event management
├── frontend/               # Next.js frontend (if applicable)
├── test/agent/             # Integration and unit tests
├── cli/                    # CLI tools and visualizers
├── specs/                  # Specifications and documentation
└── docs/                   # Additional documentation
```

## 🔍 Troubleshooting

### **Common Issues**

**Redis Connection Failed**
```bash
# Start Redis server
redis-server

# Check Redis connection
redis-cli ping
```

**Encore Service Not Starting**
```bash
# Check if Encore runtime is installed
encore version

# Set environment variable
export ENCORE_RUNTIME_LIB=$(npx encore which-runtime)
```

**Session Not Found**
```bash
# List active sessions
curl http://localhost:4000/agents

# Check session persistence
redis-cli keys "session:*"
```

**Streaming Events Not Working**
```bash
# Check active streams
curl http://localhost:4000/agent/streams

# Test stream manually
curl -N http://localhost:4000/agent/stream/session-abc123
```

### **Debug Mode**

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with verbose output
pnpm dev --verbose

# Check Encore logs
encore app logs
```

## 📚 Next Steps

1. **Explore the API**: Try different prompts and tool combinations
2. **Build a Frontend**: Connect to the streaming API for real-time UI
3. **Add Custom Tools**: Extend the orchestrator with new tool types
4. **Configure Persistence**: Set up Redis clustering for production
5. **Monitor Performance**: Use the built-in metrics and observability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Run `pnpm lint-check` and `pnpm typecheck`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Need help?** Check the [full documentation](./README.md) or open an issue! 🚀
