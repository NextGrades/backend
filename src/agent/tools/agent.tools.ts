import { tool, ToolRuntime } from 'langchain';
import { InMemoryStore } from '@langchain/langgraph';

import * as z from 'zod';

type AgentContext = {
  userId: string;
  conversationId: string;
};

export function createAgentTools() {
  const getGeneratedContent = tool(
    async (
      _input: Record<string, never>,
      runtime: ToolRuntime<unknown, AgentContext>,
    ) => {
      const { userId, conversationId } = runtime.context;
      const namespace = ['teaching_content', userId, conversationId];

      if (!runtime.store) {
        throw new Error('Memory store not configured');
      }

      // ✅ Type assertion for LangGraph store's get() method
      const store = runtime.store as unknown as InMemoryStore;

      const item = await store.get(namespace, 'latest');

      if (!item) {
        throw new Error(
          'No teaching content found for this conversation. The teaching job may not have completed yet.',
        );
      }

      return JSON.stringify(item.value);
    },
    {
      name: 'get_generated_content',
      description:
        'Retrieve the teaching content that was previously generated for this conversation. Call this before answering any follow-up questions.',
      schema: z.object({}),
    },
  );

  return { getGeneratedContent };
}
