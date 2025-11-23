# Quickstart Guide: AI Agent SDK

## Overview

The AI Agent SDK provides a comprehensive framework for building intelligent agents with multi-model support, autonomous workflows, and real-time communication capabilities.

## Prerequisites

- Node.js 18+ or Python 3.11+
- Valid API credentials for supported AI providers (OpenAI, Anthropic, Google)
- TypeScript 4.5+ (for type safety) or Python 3.11+ (for development)

## Installation

```bash
# npm
npm install @big3/ai-agent-sdk

# yarn
yarn add @big3/ai-agent-sdk

# pnpm
pnpm add @big3/ai-agent-sdk
```

## Quick Start

### 1. SDK Initialization

```typescript
import { AIAgentSDK } from '@big3/ai-agent-sdk';

// Initialize with configuration
const sdk = new AIAgentSDK({
  authentication: {
    providers: [
      {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        models: ['gpt-4', 'gpt-3.5-turbo']
      },
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        models: ['claude-3-opus', 'claude-3-sonnet']
      }
    ]
  },
  communication: {
    realtime: {
      protocol: 'websocket',
      maxLatency: 200, // sub-200ms requirement
      bufferSize: 1000
    },
    batching: {
      enabled: true,
      maxBatchSize: 10,
      maxWaitTime: 100
    }
  },
  monitoring: {
    enabled: true,
    metrics: ['responseTime', 'throughput', 'errorRate'],
    alerts: {
      performance: {
        maxResponseTime: 500,
        maxErrorRate: 0.05
      }
    }
  }
});
```

### 2. Creating Your First Agent

```typescript
// Create a simple agent
const agent = await sdk.createAgent({
  name: 'DataProcessor',
  model: {
    provider: 'openai',
    name: 'gpt-4',
    version: 'latest'
  },
  capabilities: {
    streaming: true,
    functions: true,
    maxConcurrency: 5
  }
});

// Send a message and get response
const response = await agent.sendMessage({
  content: 'Analyze this data and provide insights',
  type: 'user'
});

console.log('Agent response:', response.content);
```

### 3. Multi-Model Agent with Dynamic Switching

The SDK supports creating agents with multiple model providers and automatic fallback chains.

#### Basic Multi-Model Setup

```typescript
import { createMultiModelAgent } from '@big3/ai-agent-sdk/sdk/models';

const agent = createMultiModelAgent(sdk, {
  config: {
    name: 'MultiModelAnalyzer',
    description: 'Analyzes data across multiple model providers'
  },
  modelConfig: {
    primary: {
      provider: 'anthropic',
      modelId: 'claude-3.5',
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    fallbacks: [
      {
        provider: 'openai',
        modelId: 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY
      },
      {
        provider: 'google',
        modelId: 'gemini-pro',
        apiKey: process.env.GOOGLE_API_KEY
      }
    ],
    performanceMode: 'balanced'
  }
});
```

#### Performance Optimization Modes

```typescript
import { createMultiModelAgent } from '@big3/ai-agent-sdk/sdk/models';

// Cost-optimized: Prefers cheaper models (Google > Anthropic > OpenAI)
const costAgent = createMultiModelAgent(sdk, {
  config: { name: 'CostOptimized' },
  modelConfig: {
    primary: {
      provider: 'google',
      modelId: 'gemini-pro',
      apiKey: process.env.GOOGLE_API_KEY
    },
    fallbacks: [
      { provider: 'anthropic', modelId: 'claude-3.5', apiKey: process.env.ANTHROPIC_API_KEY }
    ],
    performanceMode: 'cost'
  }
});

// Speed-optimized: Prefers faster models (OpenAI > Anthropic > Google)
const speedAgent = createMultiModelAgent(sdk, {
  config: { name: 'SpeedOptimized' },
  modelConfig: {
    primary: {
      provider: 'openai',
      modelId: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY
    },
    performanceMode: 'speed'
  }
});

// Balanced: Default optimization (Anthropic > OpenAI > Google)
const balancedAgent = createMultiModelAgent(sdk, {
  config: { name: 'BalancedAgent' },
  modelConfig: {
    primary: {
      provider: 'anthropic',
      modelId: 'claude-3.5',
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    performanceMode: 'balanced'
  }
});
```

#### Dynamic Model Switching

```typescript
import { ModelSwitchManager } from '@big3/ai-agent-sdk/sdk/model-switch';

const switchManager = new ModelSwitchManager({
  primary: {
    provider: 'openai',
    modelId: 'gpt-4'
  },
  fallbacks: [
    { provider: 'anthropic', modelId: 'claude-3.5' },
    { provider: 'google', modelId: 'gemini-pro' }
  ],
  performanceMode: 'balanced'
});

// Get current active model
const currentModel = switchManager.getCurrentModel();
console.log('Active model:', currentModel);

// Switch to next fallback on error
try {
  const response = await agent.sendMessage('Process this data');
} catch (error) {
  console.log('Primary model failed, switching to fallback...');
  switchManager.switchToNextFallback();
  const nextModel = switchManager.getCurrentModel();
  console.log('Now using:', nextModel);
}

// View the optimized fallback chain
const chain = switchManager.getFallbackChain();
console.log('Fallback chain:', chain.map(m => m.modelId));

// Track model switches
const history = switchManager.getSwitchHistory();
console.log('Switch history:', history);

// Reset to primary model
switchManager.resetToPrimary();
```

#### Model Compatibility Validation

```typescript
import {
  isModelSupported,
  getSupportedProviders,
  getModelsForProvider
} from '@big3/ai-agent-sdk/sdk/models';

// Check supported providers
const providers = getSupportedProviders();
console.log('Available providers:', providers);
// Output: ['openai', 'anthropic', 'google']

// Get models for a specific provider
const anthropicModels = getModelsForProvider('anthropic');
console.log('Anthropic models:', anthropicModels);
// Output: ['claude-3.5', 'claude-3-opus']

// Validate before creating agent
if (isModelSupported('openai', 'gpt-4')) {
  const config = {
    provider: 'openai' as const,
    modelId: 'gpt-4'
  };
  // Safe to use this config
}

// Handle invalid models gracefully
const invalidModel = isModelSupported('anthropic', 'gpt-4');
if (!invalidModel) {
  console.log('GPT-4 is not available on Anthropic provider');
  // Fall back to alternative configuration
}
```

### 4. Autonomous Workflow

```typescript
// Define a workflow
const workflow = await sdk.createWorkflow({
  name: 'DataProcessingPipeline',
  description: 'Process data through multiple steps autonomously',
  steps: [
    {
      id: 'fetch',
      name: 'Fetch Data',
      type: 'task',
      configuration: {
        source: 'api',
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential'
        }
      }
    },
    {
      id: 'process',
      name: 'Process Data',
      type: 'task',
      dependencies: ['fetch']
    },
    {
      id: 'validate',
      name: 'Validate Results',
      type: 'decision',
      configuration: {
        rules: ['data_integrity', 'business_logic']
      }
    },
    {
      id: 'store',
      name: 'Store Results',
      type: 'task',
      dependencies: ['validate']
    }
  ],
  errorHandling: {
    retryAttempts: 3,
    fallbackAction: 'human_intervention',
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30000
    }
  }
});

// Execute workflow autonomously
const result = await workflow.execute({
  input: {
    dataSource: 'customer_database',
    processingType: 'batch_analysis'
  },
  autonomous: true // Enables fully automatic execution
});
```

### 5. Real-time Communication

```typescript
// Real-time agent with WebSocket support
const realtimeAgent = await sdk.createAgent({
  name: 'RealtimeAssistant',
  communication: {
    protocol: 'websocket',
    latency: {
      target: 150, // Sub-200ms requirement
      maxAcceptable: 500
    },
    connectionPool: {
      maxConnections: 1000,
      idleTimeout: 30000
    }
  }
});

// Handle real-time messages
realtimeAgent.on('message', async (message) => {
  const response = await realtimeAgent.processMessage(message);
  
  // Response guaranteed within 200ms
  await realtimeAgent.send(response);
});

// Batch processing for efficiency
realtimeAgent.on('batch_messages', async (messages) => {
  const responses = await Promise.all(
    messages.map(msg => realtimeAgent.processMessage(msg))
  );
  
  await realtimeAgent.sendBatch(responses);
});
```

## Configuration

### Environment Setup

```bash
# .env file
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key
GOOGLE_API_KEY=AIza-your-google-key

# Configuration file (config.json)
{
  "sdk": {
    "version": "1.0.0",
    "defaultModel": "openai:gpt-4",
    "providers": {
      "openai": {
        "endpoint": "https://api.openai.com/v1",
        "models": ["gpt-4", "gpt-3.5-turbo"]
      },
      "anthropic": {
        "endpoint": "https://api.anthropic.com/v1",
        "models": ["claude-3-opus", "claude-3-sonnet"]
      }
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "interval": 60000
    },
    "alerts": {
      "performance": {
        "maxLatency": 200,
        "maxErrorRate": 0.05
      }
    }
  }
}
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from '@big3/ai-agent-sdk/test';

describe('AI Agent SDK', () => {
  let sdk: AIAgentSDK;
  
  beforeEach(() => {
    sdk = new AIAgentSDK({
      authentication: {
        providers: [{ name: 'openai', apiKey: 'test-key' }]
      }
    });
  });

  it('should initialize agent within 5 minutes', async () => {
    const startTime = Date.now();
    
    const agent = await sdk.createAgent({
      name: 'TestAgent',
      model: { provider: 'openai', name: 'gpt-4' }
    });
    
    const initTime = Date.now() - startTime;
    expect(initTime).toBeLessThan(5 * 60 * 1000); // 5 minutes
  });

  it('should handle real-time communication under 200ms', async () => {
    const agent = await sdk.createAgent({
      name: 'RealtimeTest',
      communication: { latency: { target: 150 } }
    });
    
    const startTime = Date.now();
    await agent.sendMessage({ content: 'test message' });
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(200);
  });
});
```

## Monitoring

```typescript
// Performance monitoring
const monitor = sdk.getMonitor();

monitor.on('alert', (alert) => {
  console.log(`Alert: ${alert.type} - ${alert.message}`);
  
  if (alert.type === 'performance') {
    // Auto-scale or optimize
    await sdk.optimizeResources(alert.suggestions);
  }
});

// Metrics dashboard
const metrics = await monitor.getMetrics();
console.log('Current performance:', {
  responseTime: metrics.averageResponseTime,
  throughput: metrics.requestsPerSecond,
  errorRate: metrics.errorRate,
  uptime: metrics.uptime
});
```

## Next Steps

1. **Review the full documentation** at `/docs/` for detailed API reference
2. **Explore examples** in `/examples/` for common implementation patterns
3. **Check integration guides** for specific frameworks and platforms
4. **Configure monitoring** to track performance and receive alerts
5. **Join the community** for support and contributions

## Support

- **Documentation**: [Full API docs](https://docs.big3.com/ai-agent-sdk)
- **Examples**: [GitHub repository](https://github.com/big3/ai-agent-sdk-examples)
- **Issues**: [Report issues](https://github.com/big3/ai-agent-sdk/issues)
- **Community**: [Discord server](https://discord.gg/big3-ai)

This quickstart guide gets you up and running with the AI Agent SDK in minutes.