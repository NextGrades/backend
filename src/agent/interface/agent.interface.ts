// src/agent/types/agent-config.type.ts
export interface AgentConfigurable {
  thread_id: string;
}

export type ConversationScope = {
  userId: string;
  conversationId: string; // NOT threadId
};

export interface AgentContext {
  user_id: string;
  class_level: number;
}

export interface AgentConfig {
  configurable: AgentConfigurable;
  context: AgentContext;
}
