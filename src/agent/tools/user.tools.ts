import { tool, ToolRuntime } from 'langchain';
import * as z from 'zod';

type AgentRuntime = ToolRuntime<unknown, { userId: string }>;

export function createUserTools() {
  const getUserInfo = tool(
    (_, config: AgentRuntime) => {
      const { userId } = config.context;

      // Example logic (replace with DB or API later)
      const ageMap: Record<string, number> = {
        '1': 18,
        '2': 20,
      };

      return {
        userId,
        age: ageMap[userId] || 8,
      };
    },
    {
      name: 'get_user_info',
      description:
        "Retrieve learner's complete profile including userId age to tailor exercises vocabulary",
      schema: z.object({}),
    },
  );

  return { getUserInfo };
}
