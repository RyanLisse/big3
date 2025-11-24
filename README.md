# 🤖 Big 3 Super-Agent V2

A sophisticated multi-agent orchestration system that combines OpenAI Realtime (VoiceService), Claude (CoderService), and Gemini + Playwright (BrowserService) into a persistent, resumable agent with streaming observability.

## 🚀 Quick Start

### One-Command Setup
```bash
# Complete setup from scratch
make quickstart

# Start all services (Backend + Frontend + Redis)
make dev
```

### Manual Setup
```bash
# 1. Install dependencies
make install

# 2. Setup environment files
make setup-env
# Then edit .env with your API keys

# 3. Start all services
make dev
# Or use: pnpm start or ./start.sh
```

**Your app is now running at:**
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:4000
- 📚 **API Docs**: http://localhost:4000/_docs
- 🤖 **Multi-Agent API**: http://localhost:4000/v2/multi-agent/health

**📖 Full Documentation**: See [RUNNING.md](./RUNNING.md) for detailed setup, troubleshooting, and all available commands.

## 🏗️ Architecture Overview

The V2 system provides:
- **🔄 Structured Concurrency**: Effect-based orchestration with proper resource management
- **💾 Persistence-First Autonomy**: Redis checkpointer + composite filesystem for session continuity  
- **🎯 Big 3 Service Boundaries**: Separate Voice, Coder, and Browser services with clear orchestration
- **📡 Transparent Orchestration**: Real-time Skeleton-of-Thought visualization and streaming events
- **🧪 Testable Automation**: Comprehensive observability and structured logging

### ✨ Key Features

- **🎤 Voice-driven coding** with real-time audio processing
- **🛠️ Multi-tool orchestration** (Voice, Coder, Browser tools)
- **💾 Session persistence** and resumption capabilities
- **📊 Streaming observability** with live event monitoring
- **⚡ Effect-based architecture** with structured concurrency
- **🔧 RESTful API** with Server-Sent Events streaming
- **📱 CLI visualizer** with real-time terminal display

### 🎨 Codex-Style Task Dashboard

The frontend now includes a powerful task management interface:

- **✨ AI-Powered Code Generation** - Create tasks with "Code" or "Ask" modes
- **🔄 Real-time Task Updates** - Live status updates via Inngest
- **🐙 GitHub Integration** - OAuth login, repository selection, branch management
- **🌍 Environment Management** - Configure multiple GitHub repositories
- **📝 Conversation History** - View full chat history with markdown rendering
- **🎯 Task Execution Timeline** - See tool events and execution steps
- **🎨 Modern UI** - Cyberpunk theme with dark/light mode support
- **📱 Responsive Design** - Works on desktop, tablet, and mobile

### 🤖 AI Agent SDK Features

The bundled AI Agent SDK provides comprehensive multi-model support:

- **🔀 Multi-Model Support** - Seamlessly switch between OpenAI, Anthropic, and Google providers
- **⚙️ Dynamic Fallback Chains** - Automatic failover between models with configurable performance modes
- **🎯 Performance Optimization** - Choose between cost-optimized, speed-optimized, or balanced modes
- **✓ Model Validation** - Built-in compatibility checking for provider-model pairs
- **📈 Switch Metrics** - Track model switching history, failures, and performance

## 🛠️ Prerequisites

- **Node.js 18+** and `pnpm` installed
- **Redis** server running locally
- **Provider Keys**:
  - `OPENAI_API_KEY` (OpenAI Realtime)
  - `ANTHROPIC_API_KEY` (Claude/Coder)
  - `GEMINI_API_KEY` (Gemini + Playwright)
- **Redis** instance for checkpointer and workspace storage
- **Encore CLI** for backend services

## 🚀 Usage Examples

### **Spawn Agent Session**
```bash
curl -X POST http://localhost:4000/agents/spawn \
  -H "Content-Type: application/json" \
  -d '{
    "initialPrompt": "Create a React authentication component",
    "labels": {"project": "react-auth"}
  }'
```

### **Live Stream Visualization**
```bash
npm run visualize-stream <session-id>
# Shows real-time events:
# 🔄 Status: planning → running
# 📋 Plan: React Authentication Component
# 🔧 Starting: coder - Analyze requirements
# ✅ Tool finished: coder (1200ms)
# 📄 Created: /workspace/components/AuthForm.tsx
```

### **Resume Session**
```bash
curl -X POST http://localhost:4000/agents/<session-id>/resume \
  -H "Content-Type: application/json" \
  -d '{"input": "Add TypeScript interfaces"}'
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run streaming observability tests
pnpm test test/agent/streaming-observability-simple.test.ts

# Run with coverage
pnpm coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint
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
│   ├── stream-manager.ts   # Streaming event management
│   └── composite-filesystem.ts # File routing middleware
├── test/agent/             # Integration and unit tests
├── cli/                    # CLI tools and visualizers
│   └── stream-visualizer.ts # Live event visualization
├── specs/                  # Specifications and documentation
└── docs/                   # Additional documentation
```

## 📊 API Endpoints

### **Agent Registry**
- `POST /agents/spawn` - Create new agent session
- `GET /agents/:id/status` - Get session status and artifacts
- `POST /agents/:id/resume` - Resume existing session
- `POST /agents/:id/cancel` - Cancel active session
- `GET /agents` - List all active sessions

### **Streaming API**
- `GET /agent/stream/:sessionId` - Server-Sent Events stream
- `POST /agent/stream/:sessionId/input` - Send input to stream
- `GET /agent/streams` - List active streams

## 🔧 Development

```bash
# Development mode (all services)
pnpm dev

# Or run individually:
pnpm dev:backend  # Backend on port 4000
pnpm dev:frontend # Frontend on port 3000

# Build project
pnpm build

# Build frontend only
cd frontend && pnpm run build

# Run tests
pnpm test

# Run tests with coverage
pnpm coverage

# Lint and format
pnpm lint
```

## 🎨 Frontend Development

The frontend is a Next.js 16 application with:

```bash
# Start frontend dev server
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Run frontend tests (when configured)
cd frontend && npm run test
```

**Frontend Features**:
- Task dashboard with real-time updates
- GitHub OAuth integration
- Environment management
- Conversation history with markdown
- Dark/light theme toggle
- Responsive design
- Cyberpunk theme

## 📖 Documentation

- **[Quick Start Guide](./docs/quickstart.md)** - Complete setup and usage
- **[API Documentation](./specs/001-big3-super-agent-v2/contracts/agent-api.md)** - API contracts
- **[Architecture Guide](./specs/001-big3-super-agent-v2/plan.md)** - Technical architecture
- **[Data Model](./specs/001-big3-super-agent-v2/data-model.md)** - Entity definitions

## 🎯 Current Status

**✅ Phase 1**: Setup & Tooling  
**✅ Phase 2**: Foundational Infrastructure  
**✅ Phase 3**: Voice-driven Coding Assistant  
**✅ Phase 4**: Persistence & Session Resumption  
**✅ Phase 5**: Streaming Observability  
**🔄 Phase N**: Polish & Cross-Cutting Concerns (In Progress)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `pnpm lint-check` and `pnpm typecheck`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🚀 Ready to build the future of AI agents?** Start with our [Quick Start Guide](./docs/quickstart.md)!

