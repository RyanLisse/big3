# Quick Start Guide: Letta Multi-Agent System

**Feature**: 003-letta-multi-agents  
**Date**: 2025-11-22

## Overview

This guide helps you get started with Letta's multi-agent system in under 15 minutes. You'll learn how to create a team of collaborating agents, set up shared memory, and enable cross-agent communication.

## Prerequisites

- Letta Cloud account or self-hosted Letta server
- API key for Letta Cloud (if using cloud)
- Python 3.8+ or Node.js 18+
- Basic understanding of Letta agents and memory blocks

## Installation

### Python SDK

```bash
pip install letta-client
```

### Node.js SDK

```bash
npm install @letta-ai/letta-client
```

### Environment Setup

```bash
# Letta Cloud
export LETTA_API_KEY="your_api_key_here"

# Self-hosted (optional)
export LETTA_BASE_URL="http://localhost:8283"
```

## Step 1: Create Your First Multi-Agent Team

### Python Example

```python
from letta_client import Letta
import os

# Initialize client
client = Letta(api_key=os.getenv("LETTA_API_KEY"))

# Create a development team
team = client.teams.create(
    name="Web Development Team",
    description="A team for full-stack web development projects"
)

print(f"Created team: {team.id}")
```

### Node.js Example

```typescript
import { Letta } from "@letta-ai/letta-client";

const client = new Letta({ 
  apiKey: process.env.LETTA_API_KEY 
});

const team = await client.teams.create({
  name: "Web Development Team",
  description: "A team for full-stack web development projects"
});

console.log(`Created team: ${team.id}`);
```

## Step 2: Create Shared Memory Blocks

Shared memory blocks allow agents to maintain common context about projects, requirements, and decisions.

### Python Example

```python
# Create shared memory blocks for the team
project_requirements = client.shared_memory.create(
    team_id=team.id,
    label="project_requirements",
    value="Build a task management web app with user authentication, real-time updates, and mobile responsiveness.",
    description="Core project requirements and scope",
    type="project_context",
    access_level="read_write"
)

architecture_decisions = client.shared_memory.create(
    team_id=team.id,
    label="architecture_decisions",
    value="Frontend: React with TypeScript, Backend: Node.js with Express, Database: PostgreSQL",
    description="Technical architecture decisions",
    type="shared_knowledge",
    access_level="read_write"
)

print(f"Created shared memory blocks")
```

### Node.js Example

```typescript
const projectRequirements = await client.sharedMemory.create({
  teamId: team.id,
  label: "project_requirements",
  value: "Build a task management web app with user authentication, real-time updates, and mobile responsiveness.",
  description: "Core project requirements and scope",
  type: "project_context",
  accessLevel: "read_write"
});

const architectureDecisions = await client.sharedMemory.create({
  teamId: team.id,
  label: "architecture_decisions", 
  value: "Frontend: React with TypeScript, Backend: Node.js with Express, Database: PostgreSQL",
  description: "Technical architecture decisions",
  type: "shared_knowledge",
  accessLevel: "read_write"
});

console.log("Created shared memory blocks");
```

## Step 3: Create Specialized Agents

Create agents with different roles and expertise, each with access to shared memory and specialized tools.

### Python Example

```python
# Frontend Developer Agent
frontend_agent = client.agents.create(
    team_id=team.id,
    name="Frontend Developer",
    memory_blocks=[
        {
            "label": "persona",
            "value": "I'm a frontend developer specializing in React, TypeScript, and modern UI/UX practices."
        },
        {
            "label": "human",
            "value": "The user is a project manager overseeing web development."
        },
        {
            "label": "project",
            "value": "Working on the frontend implementation of the task management app.",
            "description": "Current project context and responsibilities"
        }
    ],
    tools=["web_search", "run_code"],
    model="openai/gpt-4o-mini",
    embedding="openai/text-embedding-3-small"
)

# Backend Developer Agent  
backend_agent = client.agents.create(
    team_id=team.id,
    name="Backend Developer",
    memory_blocks=[
        {
            "label": "persona", 
            "value": "I'm a backend developer specializing in Node.js, Express, and PostgreSQL databases."
        },
        {
            "label": "human",
            "value": "The user is a project manager overseeing web development."
        },
        {
            "label": "project",
            "value": "Working on the backend API and database design for the task management app.",
            "description": "Current project context and responsibilities"
        }
    ],
    tools=["web_search", "run_code"],
    model="openai/gpt-4o-mini", 
    embedding="openai/text-embedding-3-small"
)

# QA Tester Agent
qa_agent = client.agents.create(
    team_id=team.id,
    name="QA Tester",
    memory_blocks=[
        {
            "label": "persona",
            "value": "I'm a QA tester focused on test automation, bug detection, and quality assurance."
        },
        {
            "label": "human", 
            "value": "The user is a project manager overseeing web development."
        },
        {
            "label": "project",
            "value": "Testing the task management web app for bugs and usability issues.",
            "description": "Current project context and responsibilities"
        }
    ],
    tools=["web_search", "run_code"],
    model="openai/gpt-4o-mini",
    embedding="openai/text-embedding-3-small"
)

print(f"Created agents: {frontend_agent.id}, {backend_agent.id}, {qa_agent.id}")
```

### Node.js Example

```typescript
// Frontend Developer Agent
const frontendAgent = await client.agents.create({
  teamId: team.id,
  name: "Frontend Developer",
  memoryBlocks: [
    {
      label: "persona",
      value: "I'm a frontend developer specializing in React, TypeScript, and modern UI/UX practices."
    },
    {
      label: "human",
      value: "The user is a project manager overseeing web development."
    },
    {
      label: "project",
      value: "Working on the frontend implementation of the task management app.",
      description: "Current project context and responsibilities"
    }
  ],
  tools: ["web_search", "run_code"],
  model: "openai/gpt-4o-mini",
  embedding: "openai/text-embedding-3-small"
});

// Backend Developer Agent
const backendAgent = await client.agents.create({
  teamId: team.id,
  name: "Backend Developer", 
  memoryBlocks: [
    {
      label: "persona",
      value: "I'm a backend developer specializing in Node.js, Express, and PostgreSQL databases."
    },
    {
      label: "human",
      value: "The user is a project manager overseeing web development."
    },
    {
      label: "project", 
      value: "Working on the backend API and database design for the task management app.",
      description: "Current project context and responsibilities"
    }
  ],
  tools: ["web_search", "run_code"],
  model: "openai/gpt-4o-mini",
  embedding: "openai/text-embedding-3-small"
});

// QA Tester Agent
const qaAgent = await client.agents.create({
  teamId: team.id,
  name: "QA Tester",
  memoryBlocks: [
    {
      label: "persona",
      value: "I'm a QA tester focused on test automation, bug detection, and quality assurance."
    },
    {
      label: "human",
      value: "The user is a project manager overseeing web development."
    },
    {
      label: "project",
      value: "Testing the task management web app for bugs and usability issues.",
      description: "Current project context and responsibilities"
    }
  ],
  tools: ["web_search", "run_code"],
  model: "openai/gpt-4o-mini",
  embedding: "openai/text-embedding-3-small"
});

console.log(`Created agents: ${frontendAgent.id}, ${backendAgent.id}, ${qaAgent.id}`);
```

## Step 4: Enable Cross-Agent Communication

Configure agents to communicate with each other using Letta's built-in messaging tools.

### Python Example

```python
# Add cross-agent messaging tool to all agents
messaging_tool = client.tools.get("send_message_to_agent_async")

# Update agents to include messaging capability
client.agents.update(
    agent_id=frontend_agent.id,
    tools=[*frontend_agent.tools, messaging_tool.name]
)

client.agents.update(
    agent_id=backend_agent.id, 
    tools=[*backend_agent.tools, messaging_tool.name]
)

client.agents.update(
    agent_id=qa_agent.id,
    tools=[*qa_agent.tools, messaging_tool.name]
)

print("Enabled cross-agent communication")
```

### Node.js Example

```typescript
// Get the messaging tool
const messagingTool = await client.tools.get("send_message_to_agent_async");

// Update agents to include messaging capability
await client.agents.update(frontendAgent.id, {
  tools: [...frontendAgent.tools, messagingTool.name]
});

await client.agents.update(backendAgent.id, {
  tools: [...backendAgent.tools, messagingTool.name]
});

await client.agents.update(qaAgent.id, {
  tools: [...qaAgent.tools, messagingTool.name]
});

console.log("Enabled cross-agent communication");
```

## Step 5: Execute Collaborative Task

Now let's have the agents work together on a simple task.

### Python Example

```python
# Start with the frontend agent
frontend_response = client.agents.messages.create(
    agent_id=frontend_agent.id,
    messages=[{
        "role": "user", 
        "content": "Create the main React component for the task management app. Check the shared project requirements and architecture decisions first, then coordinate with the backend agent for API endpoints."
    }]
)

print("Frontend agent response:")
for msg in frontend_response.messages:
    if msg.message_type == "assistant_message":
        print(msg.content)

# Check if frontend agent sent messages to other agents
frontend_messages = client.agents.messages.list(frontend_agent.id, limit=10)
for msg in frontend_messages.messages:
    if msg.message_type == "tool_call_message" and msg.tool_call.name == "send_message_to_agent_async":
        print(f"Message sent to {msg.tool_call.arguments.get('to_agent_id')}")
```

### Node.js Example

```typescript
// Start with the frontend agent
const frontendResponse = await client.agents.messages.create(frontendAgent.id, {
  messages: [{
    role: "user",
    content: "Create the main React component for the task management app. Check the shared project requirements and architecture decisions first, then coordinate with the backend agent for API endpoints."
  }]
});

console.log("Frontend agent response:");
for (const msg of frontendResponse.messages) {
  if (msg.messageType === "assistant_message") {
    console.log(msg.content);
  }
}

// Check if frontend agent sent messages to other agents
const frontendMessages = await client.agents.messages.list(frontendAgent.id, { limit: 10 });
for (const msg of frontendMessages.messages) {
  if (msg.messageType === "tool_call_message" && msg.toolCall.name === "send_message_to_agent_async") {
    console.log(`Message sent to ${msg.toolCall.arguments?.to_agent_id}`);
  }
}
```

## Step 6: Monitor Team Activity

### Python Example

```python
# Get team overview
team_status = client.teams.get(team.id)
print(f"Team status: {team_status.status}")

# List all agents in the team
team_agents = client.agents.list(team_id=team.id)
print(f"Team agents: {[agent.name for agent in team_agents.agents]}")

# Check shared memory updates
shared_memory = client.shared_memory.list(team_id=team.id)
print(f"Shared memory blocks: {[block.label for block in shared_memory.blocks]}")

# Get cross-agent messages
team_messages = client.messages.list(team_id=team.id, limit=20)
print(f"Recent messages: {len(team_messages.messages)}")
```

### Node.js Example

```typescript
// Get team overview
const teamStatus = await client.teams.get(team.id);
console.log(`Team status: ${teamStatus.status}`);

// List all agents in the team
const teamAgents = await client.agents.list({ teamId: team.id });
console.log(`Team agents: ${teamAgents.agents.map(a => a.name).join(", ")}`);

// Check shared memory updates
const sharedMemory = await client.sharedMemory.list({ teamId: team.id });
console.log(`Shared memory blocks: ${sharedMemory.blocks.map(b => b.label).join(", ")}`);

// Get cross-agent messages
const teamMessages = await client.messages.list({ teamId: team.id, limit: 20 });
console.log(`Recent messages: ${teamMessages.messages.length}`);
```

## Step 7: Create Agent Template (Optional)

Save your agent configuration as a template for reuse.

### Python Example

```python
# Create template from frontend agent
template = client.templates.create_from_agent(
    agent_id=frontend_agent.id,
    name="React Frontend Developer",
    description="Specialized frontend developer for React applications"
)

print(f"Created template: {template.id}")

# Use template to create new agent
new_frontend_agent = client.agents.create_from_template(
    template_id=template.id,
    name="New Frontend Developer",
    memory_overrides={
        "project": "Working on a different React project"
    }
)

print(f"Created agent from template: {new_frontend_agent.id}")
```

### Node.js Example

```typescript
// Create template from frontend agent
const template = await client.templates.createFromAgent({
  agentId: frontendAgent.id,
  name: "React Frontend Developer",
  description: "Specialized frontend developer for React applications"
});

console.log(`Created template: ${template.id}`);

// Use template to create new agent
const newFrontendAgent = await client.agents.createFromTemplate({
  templateId: template.id,
  name: "New Frontend Developer",
  memoryOverrides: {
    project: "Working on a different React project"
  }
});

console.log(`Created agent from template: ${newFrontendAgent.id}`);
```

## Next Steps

### Advanced Features

1. **Tool Rules**: Define execution order constraints for complex workflows
2. **Custom Tools**: Add domain-specific tools for your agents
3. **Memory Access Controls**: Implement fine-grained permissions for shared memory
4. **Agent Monitoring**: Set up observability and alerting for agent teams

### Production Considerations

1. **Error Handling**: Implement robust error handling for agent failures
2. **Resource Management**: Monitor and limit agent resource usage
3. **Security**: Configure proper access controls and authentication
4. **Scaling**: Plan for horizontal scaling of agent teams

### Common Patterns

1. **Specialist Teams**: Create teams of domain specialists (frontend, backend, DevOps)
2. **Hierarchical Teams**: Use lead agents to coordinate specialist teams
3. **Competitive Teams**: Create multiple teams to approach problems from different angles
4. **Review Teams**: Use QA agents to review work from development teams

## Troubleshooting

### Common Issues

1. **Agents Not Communicating**: Ensure all agents have the `send_message_to_agent_async` tool
2. **Shared Memory Not Updating**: Check access level permissions on memory blocks
3. **Message Delivery Failures**: Verify agent IDs and team membership
4. **Tool Rule Violations**: Check rule configuration and agent tool access

### Debug Tips

1. Use `client.agents.messages.list()` to see conversation history
2. Check `client.shared_memory.get()` to verify memory block contents
3. Monitor `client.messages.list()` for cross-agent communication
4. Review `client.teams.get()` for team status and configuration

## Resources

- [Letta Documentation](https://docs.letta.com/)
- [Multi-Agent API Reference](https://docs.letta.com/api-reference/multi-agent)
- [Community Discord](https://discord.gg/letta)
- [Example Projects](https://github.com/letta-ai/examples)
