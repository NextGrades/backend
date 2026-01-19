import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InternalServerErrorException } from '@nestjs/common';
import { AgentFactory } from 'src/agent/agent.factory';
import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { MemorySaver } from '@langchain/langgraph';
import { QuickExerciseResponse } from 'src/agent/schema/teaching-agent.schema';
import { AgentConfig, ExerciseType } from 'src/agent/interface/agent.interface';
import { SystemLogger } from 'src/logger/system-logger.service';

@Processor('exercise')
export class ExerciseProcessor extends WorkerHost {
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly agentFactory: AgentFactory,
    private readonly logger: SystemLogger,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'generate-quick-exercise': {
        const { exerciseType, count, config } = job.data as {
          exerciseType: ExerciseType;
          count: number;
          config: AgentConfig;
        };

        this.logger.log(
          `Worker processing quick exercise for exerciseType: ${exerciseType}, userId: ${config.context.user_id}`,
          ExerciseProcessor.name,
        );

        try {
          const userPrompt = `
Generate a quick exercise set.

Requirements:
- Exercise type: ${exerciseType}
- Number of exercises: ${count}
- General academic skills only
- No teaching or explanations
- Keep it short and simple

Proceed.
`;

          const messages = [{ role: 'user' as const, content: userPrompt }];

          const agent = this.agentFactory.createExerciseGeneratorAgent(
            exerciseType,
            this.checkpointer,
          );

          const response = await agent.invoke({ messages }, config);

          const responseFormat = responseFormatMap[exerciseType];
          if (!responseFormat) {
            throw new Error(`Invalid exercise type: ${exerciseType}`);
          }

          const validated = responseFormat.safeParse(
            response.structuredResponse,
          );

          if (!validated.success) {
            throw new Error(
              `Invalid response format: ${validated.error.message}`,
            );
          }

          this.logger.log(
            `Quick exercise completed for userId: ${config.context.user_id}`,
            ExerciseProcessor.name,
          );

          return validated.data as QuickExerciseResponse;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          this.logger.error(
            `Failed job for exerciseType: ${exerciseType}, userId: ${config.context.user_id}`,
            errorMessage,
            ExerciseProcessor.name,
          );

          throw new InternalServerErrorException(errorMessage);
        }
      }

      default:
        // Ignore unknown job names
        return;
    }
  }
}
