import { tool } from 'langchain';
import { AgentRuntime } from 'src/agent/schema/teaching-agent.schema';
import * as z from 'zod';

export function createUserTools() {
  const getUserAge = tool(
    (_: Record<string, never>, config: AgentRuntime): number => {
      const { user_id } = config.context;
      if (user_id === '1') return 10;
      if (user_id === '2') return 16;
      return 8;
    },
    {
      name: 'get_user_age',
      description: "Retrieve learner's age",
      schema: z.object({}),
    },
  );

  const getUserInfo = tool(
    (_, config: AgentRuntime) => {
      const { user_id, class_level } = config.context;

      // Example logic (replace with DB or API later)
      const ageMap: Record<string, number> = {
        '1': 10,
        '2': 16,
      };

      return {
        user_id,
        class_level,
        age: ageMap[user_id] || 8,
      };
    },
    {
      name: 'get_user_info',
      description:
        "Retrieve learner's complete profile including user_id, class level, and age to tailor exercises difficulty and vocabulary",
      schema: z.object({}),
    },
  );

  return { getUserAge, getUserInfo };
}
