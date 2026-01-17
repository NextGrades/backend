/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { v7 as uuidv7 } from 'uuid';
import {
  teachingResponseFormat,
  exerciseResponseFormat,
  // QuickExerciseResponse,
  CurriculumPrompt,
} from 'src/agent/schema/teaching-agent.schema';
import {
  ExerciseResponse,
  ExerciseType,
  TeachingResponse,
} from 'src/agent/interface/agent.interface';
import { CurriculumService } from 'src/curriculum/curriculum.service';

// import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { AgentFactory } from 'src/agent/agent.factory';
import { HttpLogger } from 'src/logger/http-logger.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AgentService {
  private readonly teachingAgent;
  private readonly exerciseAgent;
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly curriculum: CurriculumService,
    @InjectQueue('exercise')
    private readonly exQueue: Queue,
    private agentFactory: AgentFactory,
    private readonly logger: HttpLogger,
  ) {
    const systemPrompt = CurriculumPrompt;
    const { model, tools } = this.agentFactory.createAgentDeps(this.curriculum);

    /* ---------------- AGENTS ---------------- */
    this.teachingAgent = createAgent({
      model,
      systemPrompt,
      responseFormat: teachingResponseFormat,
      checkpointer: this.checkpointer,
      tools: [tools.user.getUserAge, tools.curriculum.getNerdcCurriculum],
    });

    this.exerciseAgent = createAgent({
      model,
      systemPrompt,
      responseFormat: exerciseResponseFormat,
      checkpointer: this.checkpointer,
      tools: [tools.user.getUserAge, tools.curriculum.getNerdcCurriculum],
    });
  }

  async teachTopic(
    prompt: string,
    userId: string,
    threadId = 'edu-thread-1',
  ): Promise<TeachingResponse> {
    this.logger.log(
      `Teaching agent invoked for userId: ${userId}, threadId: ${threadId}`,
      'AgentService.teachTopic',
    );
    try {
      const response = await this.teachingAgent.invoke(
        {
          messages: [{ role: 'user' as const, content: prompt }],
        },
        {
          configurable: { thread_id: threadId },
          context: { user_id: userId },
        },
      );

      // Type assertion with validation
      const structuredResponse = response.structuredResponse as unknown;

      // Validate the response matches our expected type
      const validated = teachingResponseFormat.safeParse(structuredResponse);

      if (!validated.success) {
        throw new Error('Invalid teaching response format');
      }
      this.logger.log(
        `Teaching response validated successfully for userId: ${userId}`,
        'AgentService.teachTopic',
      );
      return validated.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to generate teaching content for userId: ${userId}`,
        errorMessage,
        'AgentService.teachTopic',
      );
      throw new InternalServerErrorException(
        `Failed to generate teaching content: ${errorMessage}`,
      );
    }
  }

  async generateExercises(
    prompt: string,
    userId: string,
    threadId = 'edu-thread-1',
  ): Promise<ExerciseResponse> {
    this.logger.log(
      `Exercise agent invoked for userId: ${userId}, threadId: ${threadId}`,
      AgentService.name,
    );
    try {
      const response = await this.exerciseAgent.invoke(
        {
          messages: [{ role: 'user' as const, content: prompt }],
        },
        {
          configurable: { thread_id: threadId },
          context: { user_id: userId },
        },
      );

      // Type assertion with validation
      const structuredResponse = response.structuredResponse as unknown;

      // Validate the response matches our expected type
      const validated = exerciseResponseFormat.safeParse(structuredResponse);

      if (!validated.success) {
        throw new Error('Invalid exercise response format');
      }
      this.logger.log(
        `Exercise response validated successfully for userId: ${userId}`,
        AgentService.name,
      );
      return validated.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to generate exercises for userId: ${userId}`,
        errorMessage,
        AgentService.name,
      );
      throw new InternalServerErrorException(
        `Failed to generate exercises: ${errorMessage}`,
      );
    }
  }

  //   async generateQuickExercise(
  //     exerciseType: ExerciseType,
  //     count: number,
  //     config: {
  //       configurable: { thread_id: string };
  //       context: { user_id: string; class_level: number };
  //     },
  //   ): Promise<QuickExerciseResponse> {
  //     const userPrompt = `
  // Generate a quick exercise set.

  // Requirements:
  // - Exercise type: ${exerciseType}
  // - Number of exercises: ${count}
  // - General academic skills only
  // - No teaching or explanations
  // - Keep it short and simple

  // Proceed.
  // `;

  //     const messages = [{ role: 'user' as const, content: userPrompt }];

  //     this.logger.log(
  //       `Quick exercise generator invoked for exerciseType: ${exerciseType}, count: ${count}, userId: ${config.context.user_id}`,
  //       AgentService.name,
  //     );

  //     try {
  //       const agent = this.agentFactory.createExerciseGeneratorAgent(
  //         exerciseType,
  //         this.checkpointer,
  //       );
  //       const response = await agent.invoke({ messages }, config);

  //       const responseFormat = responseFormatMap[exerciseType];

  //       if (!responseFormat) {
  //         throw new Error(`Invalid exercise type: ${exerciseType}`);
  //       }

  //       const validated = responseFormat.safeParse(response.structuredResponse);

  //       if (!validated.success) {
  //         throw new Error(`Invalid response format: ${validated.error.message}`);
  //       }

  //       this.logger.log(
  //         `Quick exercise response validated for exerciseType: ${exerciseType}, userId: ${config.context.user_id}`,
  //         AgentService.name,
  //       );

  //       return validated.data as QuickExerciseResponse;
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : 'Unknown error occurred';
  //       this.logger.error(
  //         `Failed to generate ${exerciseType} exercises for userId: ${config.context.user_id}`,
  //         errorMessage,
  //         AgentService.name,
  //       );
  //       throw new InternalServerErrorException(
  //         `Failed to generate ${exerciseType} exercises: ${errorMessage}`,
  //       );
  //     }
  //   }

  async generateQuickExercise(
    exerciseType: ExerciseType,
    count: number,
    config: {
      configurable: { thread_id: string };
      context: { user_id: string; class_level: number };
    },
  ) {
    const jobId = uuidv7();
    this.logger.log(
      `Queueing quick exercise jobId=${jobId} exerciseType=${exerciseType} userId=${config.context.user_id}`,
      AgentService.name,
    );

    await this.exQueue.add(
      'generate-quick-exercise',
      {
        exerciseType,
        count,
        config,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    );

    return jobId;
  }
}
