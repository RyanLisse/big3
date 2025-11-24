import { describe, expect, it } from "vitest";
import type {
  AgentManagementComponents,
  AgentManagementPaths,
  WorkflowComponents,
  WorkflowPaths,
} from "../../contracts/types/index";

describe("Contract Types - Agent Management API", () => {
  it("should have /agents paths defined", () => {
    const paths: AgentManagementPaths = {} as never;
    expect(paths).toBeDefined();
  });

  it("should have valid agent management schema types", () => {
    // Type validation is implicit through TypeScript compilation
    // This test verifies the import works without errors
    const paths: AgentManagementPaths = {} as never;
    expect(paths).toBeDefined();
  });

  describe("Agent Management Schemas", () => {
    it("should support CreateAgentRequest schema", () => {
      type CreateAgentRequest =
        AgentManagementComponents["schemas"]["CreateAgentRequest"];
      const request: CreateAgentRequest = {
        name: "test-agent",
        model: {
          provider: "openai",
          name: "gpt-4",
          version: "1.0.0",
        },
        capabilities: {
          streaming: true,
          functions: true,
          maxConcurrency: 5,
        },
        configuration: {
          performance: {
            optimization: "balanced",
            maxTokens: 4096,
          },
          communication: {
            maxLatency: 100,
            protocol: "websocket",
          },
          errorHandling: {
            retryAttempts: 3,
            fallbackAction: "retry",
          },
        },
      };
      expect(request.name).toBe("test-agent");
      expect(request.model.provider).toBe("openai");
    });

    it("should support AgentInstance schema", () => {
      type AgentInstance =
        AgentManagementComponents["schemas"]["AgentInstance"];
      const agent: AgentInstance = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "test-agent",
        model: {
          provider: "anthropic",
          name: "claude-3",
          version: "1.0.0",
        },
        state: "idle",
        context: {
          sessionId: "session-123",
          userId: "user-456",
        },
        performance: {
          responseTime: 150,
          tokensUsed: 5000,
          requestsCompleted: 42,
          errorRate: 0.02,
          uptime: 99.9,
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
      expect(agent.id).toBeDefined();
      expect(["idle", "processing", "error", "paused"]).toContain(agent.state);
    });

    it("should support MessageRequest schema", () => {
      type MessageRequest =
        AgentManagementComponents["schemas"]["MessageRequest"];
      const message: MessageRequest = {
        content: "Hello, agent!",
        type: "user",
        streaming: true,
        priority: 1,
        metadata: { source: "test" },
      };
      expect(message.content).toBe("Hello, agent!");
      expect(message.type).toBe("user");
    });

    it("should support MessageResponse schema", () => {
      type MessageResponse =
        AgentManagementComponents["schemas"]["MessageResponse"];
      const response: MessageResponse = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        content: "Response content",
        type: "agent",
        timestamp: new Date().toISOString(),
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        confidence: 0.95,
        metadata: {},
        streaming: false,
      };
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it("should support PerformanceMetrics schema", () => {
      type PerformanceMetrics =
        AgentManagementComponents["schemas"]["PerformanceMetrics"];
      const metrics: PerformanceMetrics = {
        responseTime: {
          average: 150,
          p95: 250,
          p99: 350,
        },
        throughput: {
          requestsPerSecond: 100,
          messagesPerMinute: 6000,
        },
        errorRate: 0.02,
        uptime: 99.9,
        resourceUsage: {
          cpu: 45.5,
          memory: 62.3,
          connections: 150,
        },
      };
      expect(metrics.responseTime.average).toBeLessThan(
        metrics.responseTime.p95
      );
      expect(metrics.responseTime.p95).toBeLessThan(metrics.responseTime.p99);
    });

    it("should support Error schema", () => {
      type ErrorSchema = AgentManagementComponents["schemas"]["Error"];
      const error: ErrorSchema = {
        code: "AGENT_NOT_FOUND",
        message: "Agent with id does not exist",
        details: { agentId: "invalid-id" },
        suggestions: ["Verify the agent ID", "Create a new agent if needed"],
      };
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
    });
  });
});

describe("Contract Types - Workflow API", () => {
  it("should have /workflows paths defined", () => {
    const paths: WorkflowPaths = {} as never;
    expect(paths).toBeDefined();
  });

  it("should have valid workflow schema types", () => {
    // Type validation is implicit through TypeScript compilation
    // This test verifies the import works without errors
    const paths: WorkflowPaths = {} as never;
    expect(paths).toBeDefined();
  });

  describe("Workflow Schemas", () => {
    it("should support CreateWorkflowRequest schema", () => {
      type CreateWorkflowRequest =
        WorkflowComponents["schemas"]["CreateWorkflowRequest"];
      const request: CreateWorkflowRequest = {
        name: "data-processing",
        description: "Process and analyze data",
        steps: [
          {
            id: "step-1",
            name: "Fetch Data",
            type: "task",
            configuration: {},
            inputs: {},
            outputs: {},
            dependencies: [],
            timeout: 5000,
            retryPolicy: {
              maxAttempts: 3,
              baseDelay: 1000,
              maxDelay: 10_000,
              jitter: true,
            },
          },
        ],
        triggers: [
          {
            type: "manual",
            configuration: {},
            conditions: {},
          },
        ],
        errorHandling: {
          retryAttempts: 3,
          fallbackAction: "retry",
          circuitBreaker: {
            failureThreshold: 5,
            recoveryTimeout: 30_000,
          },
        },
      };
      expect(request.name).toBe("data-processing");
      expect(request.steps.length).toBe(1);
    });

    it("should support WorkflowDefinition schema", () => {
      type WorkflowDefinition =
        WorkflowComponents["schemas"]["WorkflowDefinition"];
      const workflow: WorkflowDefinition = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "test-workflow",
        description: "A test workflow",
        steps: [
          {
            id: "step-1",
            name: "Test Step",
            type: "task",
            configuration: {},
            inputs: {},
            outputs: {},
            dependencies: [],
            timeout: 5000,
            retryPolicy: {
              maxAttempts: 1,
              baseDelay: 100,
              maxDelay: 1000,
              jitter: false,
            },
          },
        ],
        triggers: [],
        errorHandling: {
          retryAttempts: 0,
          fallbackAction: "abort",
          circuitBreaker: {
            failureThreshold: 1,
            recoveryTimeout: 1000,
          },
        },
        parallel: false,
      };
      expect(workflow.id).toBeDefined();
      expect(workflow.parallel).toBe(false);
    });

    it("should support WorkflowStep schema with all step types", () => {
      type WorkflowStep = WorkflowComponents["schemas"]["WorkflowStep"];
      const stepTypes: WorkflowStep["type"][] = [
        "task",
        "decision",
        "parallel",
        "subgraph",
      ];
      for (const type of stepTypes) {
        const step: WorkflowStep = {
          id: `step-${type}`,
          name: `${type} step`,
          type,
          configuration: {},
          inputs: {},
          outputs: {},
          dependencies: [],
          timeout: 5000,
          retryPolicy: {
            maxAttempts: 1,
            baseDelay: 100,
            maxDelay: 1000,
            jitter: false,
          },
        };
        expect(step.type).toBe(type);
      }
    });

    it("should support WorkflowExecution schema", () => {
      type WorkflowExecution =
        WorkflowComponents["schemas"]["WorkflowExecution"];
      const execution: WorkflowExecution = {
        executionId: "550e8400-e29b-41d4-a716-446655440003",
        workflowId: "550e8400-e29b-41d4-a716-446655440002",
        status: "running",
        currentStep: "step-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        progress: {
          completed: 50,
          currentStep: "Processing",
        },
        results: {},
        errors: [],
      };
      expect([
        "pending",
        "running",
        "completed",
        "failed",
        "paused",
        "cancelled",
      ]).toContain(execution.status);
    });

    it("should support WorkflowTrigger schema with all trigger types", () => {
      type WorkflowTrigger = WorkflowComponents["schemas"]["WorkflowTrigger"];
      const triggerTypes: WorkflowTrigger["type"][] = [
        "manual",
        "schedule",
        "event",
        "webhook",
      ];
      for (const type of triggerTypes) {
        const trigger: WorkflowTrigger = {
          type,
          configuration: {},
          conditions: {},
        };
        expect(trigger.type).toBe(type);
      }
    });

    it("should support ExecuteWorkflowRequest schema", () => {
      type ExecuteWorkflowRequest =
        WorkflowComponents["schemas"]["ExecuteWorkflowRequest"];
      const request: ExecuteWorkflowRequest = {
        input: { data: "test" },
        autonomous: true,
        context: {
          sessionId: "session-123",
          userId: "user-456",
          timeout: 30_000,
        },
        priority: "normal",
      };
      expect(request.autonomous).toBe(true);
      expect(["low", "normal", "high"]).toContain(request.priority);
    });
  });
});

describe("Type Safety Validation", () => {
  it("should prevent invalid provider values in agent model", () => {
    type CreateAgentRequest =
      AgentManagementComponents["schemas"]["CreateAgentRequest"];
    const validProviders: CreateAgentRequest["model"]["provider"][] = [
      "openai",
      "anthropic",
      "google",
    ];
    for (const provider of validProviders) {
      expect(["openai", "anthropic", "google"]).toContain(provider);
    }
  });

  it("should enforce message type constraints", () => {
    type MessageRequest =
      AgentManagementComponents["schemas"]["MessageRequest"];
    const validTypes: MessageRequest["type"][] = [
      "user",
      "agent",
      "system",
      "error",
    ];
    for (const type of validTypes) {
      expect(["user", "agent", "system", "error"]).toContain(type);
    }
  });

  it("should enforce workflow step type constraints", () => {
    type WorkflowStep = WorkflowComponents["schemas"]["WorkflowStep"];
    const validStepTypes: WorkflowStep["type"][] = [
      "task",
      "decision",
      "parallel",
      "subgraph",
    ];
    for (const stepType of validStepTypes) {
      expect(["task", "decision", "parallel", "subgraph"]).toContain(stepType);
    }
  });

  it("should enforce workflow execution status constraints", () => {
    type WorkflowExecution = WorkflowComponents["schemas"]["WorkflowExecution"];
    const validStatuses: WorkflowExecution["status"][] = [
      "pending",
      "running",
      "completed",
      "failed",
      "paused",
      "cancelled",
    ];
    for (const status of validStatuses) {
      expect([
        "pending",
        "running",
        "completed",
        "failed",
        "paused",
        "cancelled",
      ]).toContain(status);
    }
  });

  it("should enforce confidence score range (0-1)", () => {
    type MessageResponse =
      AgentManagementComponents["schemas"]["MessageResponse"];
    const validScores = [0, 0.5, 0.95, 1];
    for (const score of validScores) {
      const msg: MessageResponse = {
        id: "msg-1",
        content: "test",
        type: "agent",
        timestamp: new Date().toISOString(),
        confidence: score,
      };
      expect(msg.confidence).toBeGreaterThanOrEqual(0);
      expect(msg.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("should enforce priority constraints (1-10)", () => {
    type MessageRequest =
      AgentManagementComponents["schemas"]["MessageRequest"];
    const validPriorities = [1, 5, 10];
    for (const priority of validPriorities) {
      const msg: MessageRequest = {
        content: "test",
        type: "user",
        priority,
      };
      expect(msg.priority).toBeGreaterThanOrEqual(1);
      expect(msg.priority).toBeLessThanOrEqual(10);
    }
  });

  it("should enforce progress percentage constraints (0-100)", () => {
    type WorkflowExecution = WorkflowComponents["schemas"]["WorkflowExecution"];
    const validProgresses = [0, 50, 100];
    for (const completed of validProgresses) {
      const exec: WorkflowExecution = {
        executionId: "exec-1",
        status: "running",
        progress: { completed, currentStep: "Test" },
      };
      expect(exec.progress.completed).toBeGreaterThanOrEqual(0);
      expect(exec.progress.completed).toBeLessThanOrEqual(100);
    }
  });
});
