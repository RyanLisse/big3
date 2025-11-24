export interface MultiAgentTeam {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  configuration: Record<string, unknown>;
}

export interface TeamMembership {
  teamId: string;
  agentId: string;
  role: string;
  joinedAt: string;
}

export interface SharedMemoryBlock {
  id: string;
  teamId: string;
  label: string;
  value: string;
  description: string;
  type: "project_context" | "shared_knowledge" | "workflow_state" | "custom";
  accessLevel: "read" | "read_write" | "admin";
  version: number;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  teamId: string;
  messageType: "request" | "response" | "notification" | "broadcast";
  content: string;
  metadata: Record<string, unknown>;
  status: "pending" | "delivered" | "read" | "failed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface CreateTeamRequest {
  name: string;
  description: string;
}

export interface AddAgentRequest {
  agentId: string;
  role: string;
}

export interface SharedMemoryRequest {
  label: string;
  value: string;
  description: string;
  type: "project_context" | "shared_knowledge" | "workflow_state" | "custom";
  accessLevel: "read" | "read_write" | "admin";
}

export interface SendMessageRequest {
  fromAgentId: string;
  teamId: string;
  content: string;
  messageType?: "request" | "response" | "notification" | "broadcast";
  priority?: "low" | "normal" | "high" | "urgent";
  metadata?: Record<string, unknown>;
}
