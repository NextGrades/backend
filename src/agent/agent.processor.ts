import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InternalServerErrorException } from '@nestjs/common';
import { AgentFactory } from 'src/agent/agent.factory';
import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';

import { MemorySaver } from '@langchain/langgraph';
import { QuickExerciseResponse } from 'src/agent/schema/teaching-agent.schema';
import { AgentConfig, ExerciseType } from 'src/agent/interface/agent.interface';
import { SystemLogger } from 'src/logger/system-logger.service';
import { AcademicsService } from 'src/academics/academics.service';
import { courseTeachingResponseFormat } from 'src/agent/schema/course-teacher.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('exercise')
export class ExerciseProcessor extends WorkerHost {
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly agentFactory: AgentFactory,
    private readonly logger: SystemLogger,
    private readonly academicsSvc: AcademicsService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * Job router
   */
  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'generate-quick-exercise':
        return this.handleGenerateQuickExercise(job);

      case 'generate-course-teaching-content':
        return this.handleGenerateCourseTeachingContent(job);

      default:
        this.logger.warn(
          `Unhandled job name: ${job.name}`,
          ExerciseProcessor.name,
        );
        return;
    }
  }

  // ======================================================
  // Quick Exercise Job
  // ======================================================

  private async handleGenerateQuickExercise(
    job: Job,
  ): Promise<QuickExerciseResponse> {
    const { exerciseType, count, config } = job.data as {
      exerciseType: ExerciseType;
      count: number;
      config: AgentConfig;
    };

    try {
      const agent = this.agentFactory.createExerciseGeneratorAgent(
        exerciseType,
        this.checkpointer,
      );

      const response = await agent.invoke(
        {
          messages: [
            {
              role: 'user',
              content: this.buildQuickExercisePrompt(exerciseType, count),
            },
          ],
        },
        config,
      );

      return this.validateQuickExerciseResponse(
        exerciseType,
        response.structuredResponse,
      );
    } catch (error) {
      this.handleError(
        error,
        `quick-exercise:${exerciseType}`,
        config.context.user_id,
      );
    }
  }

  // ======================================================
  // Course Teaching Job
  // ======================================================

  private async handleGenerateCourseTeachingContent(
    job: Job,
  ): Promise<unknown> {
    const { topicId, userId, threadId } = job.data as {
      topicId: string;
      userId: string;
      threadId: string;
    };

    try {
      const agent = this.agentFactory.createCourseTeachingAgent(
        this.checkpointer,
        this.academicsSvc,
      );

      const response = await agent.invoke(
        {
          messages: [
            {
              role: 'user',
              content: this.buildTeachingPrompt(topicId),
            },
          ],
        },
        {
          configurable: { thread_id: threadId },
          context: { user_id: userId },
        },
      );

      const validated = courseTeachingResponseFormat.safeParse(
        response.structuredResponse,
      );

      if (!validated.success) {
        throw new Error(validated.error.message);
      }

      return validated.data;
    } catch (error) {
      this.handleError(error, `course-teaching:${topicId}`, userId);
    }
  }

  // ======================================================
  // Prompt builders
  // ======================================================

  private buildQuickExercisePrompt(
    exerciseType: ExerciseType,
    count: number,
  ): string {
    return `
Generate a quick exercise set.

Requirements:
- Exercise type: ${exerciseType}
- Number of exercises: ${count}
- General academic skills only
- No teaching or explanations
- Keep it short and simple

Proceed.
`;
  }

  private buildTeachingPrompt(topicId: string): string {
    return `Teach the following course subtopic clearly and concisely.

Subtopic ID: ${topicId}

Requirements:
- Student-friendly yet not dumbed down
- Structured
- No fluff use the schemas and tools provided
- Accurate academic explanations
`;
  }

  // ======================================================
  // Validation
  // ======================================================

  private validateQuickExerciseResponse(
    exerciseType: ExerciseType,
    structuredResponse: unknown,
  ): QuickExerciseResponse {
    const responseFormat = responseFormatMap[exerciseType];

    if (!responseFormat) {
      throw new Error(`Invalid exercise type: ${exerciseType}`);
    }

    const parsed = responseFormat.safeParse(structuredResponse);

    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    return parsed.data as QuickExerciseResponse;
  }

  // ======================================================
  // Error handling
  // ======================================================

  private handleError(error: unknown, context: string, userId: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';

    this.logger.error(
      `Job failed [${context}], userId=${userId}`,
      message,
      ExerciseProcessor.name,
    );

    throw new InternalServerErrorException(message);
  }

  // ======================================================
  // Lifecycle hooks
  // ======================================================

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Job ${job.id} started (${job.name})`,
      ExerciseProcessor.name,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    console.log(result);
    this.logger.log(
      `Job ${job.id} completed (${job.name})`,
      ExerciseProcessor.name,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed (${job.name})`,
      error.message,
      ExerciseProcessor.name,
    );
  }
}
