import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { AgentFactory } from 'src/agent/agent.factory';
import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';

import { MemorySaver } from '@langchain/langgraph';
import { QuickExerciseResponse } from 'src/agent/schema/teaching-agent.schema';
import { AgentConfig, ExerciseType } from 'src/agent/interface/agent.interface';
import { SystemLogger } from 'src/logger/system-logger.service';
import { AcademicsService } from 'src/academics/academics.service';
import { courseTeachingResponseFormat } from 'src/agent/schema/course-teacher.schema';
import {
  BaseJobData,
  JobFailureEnvelope,
  validateJob,
} from 'src/common/schema/job.schema';
import { withTimeout } from 'src/common/errors/withTimeout';
import { classifyError } from 'src/common/errors/classify';
import { PermanentError } from 'src/common/errors/error';

const BASE_DELAY = 75_000; // 75 seconds
const MAX_UNKNOWN_RETRIES = 5;

@Processor('exercise')
export class ExerciseProcessor extends WorkerHost {
  constructor(
    private readonly agentFactory: AgentFactory,
    private readonly logger: SystemLogger,
    private readonly academicsSvc: AcademicsService,
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
          {
            event: 'unhandled_job_name',
            jobName: job.name,
            jobId: job.id,
          },
          ExerciseProcessor.name,
        );
        return;
    }
  }

  private createMemory(): MemorySaver {
    return new MemorySaver();
  }
  // ======================================================
  // Quick Exercise Job
  // ======================================================

  private async handleGenerateQuickExercise(job: Job): Promise<unknown> {
    const start = Date.now();
    const { exerciseType, count, config } = job.data as {
      exerciseType: ExerciseType;
      count: number;
      config: AgentConfig;
    };

    const memory = this.createMemory();

    try {
      const agent = this.agentFactory.createExerciseGeneratorAgent({
        exerciseType,
        memory,
      });

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
      const duration = Date.now() - start;
      await this.handleJobError(
        job,
        error,
        { userId: config.context.user_id },
        duration,
      );
    }
  }

  // ======================================================
  // Course Teaching Job
  // ======================================================

  private async handleGenerateCourseTeachingContent(
    job: Job,
  ): Promise<unknown> {
    const start = Date.now();
    let userId: string | undefined = undefined;
    let topicId: string | undefined = undefined;
    let conversationId: string | undefined = undefined;
    try {
      const jobData = validateJob(job);
      topicId = jobData.topicId;
      userId = jobData.scope.userId;
      conversationId = jobData.scope.conversationId;

      const memory = this.createMemory();

      const agent = this.agentFactory.createCourseTeachingAgent({
        memory,
        academicsSvc: this.academicsSvc,
      });

      const response = await withTimeout(
        (signal) =>
          agent.invoke(
            {
              messages: [
                {
                  role: 'user',
                  content: this.buildTeachingPrompt(topicId!),
                },
              ],
            },
            {
              configurable: { thread_id: conversationId },
              context: { user_id: userId },
              signal,
            },
          ),
        60_000,
      );

      const validated = courseTeachingResponseFormat.safeParse(
        response.structuredResponse,
      );

      if (!validated.success) {
        throw new Error(validated.error.message);
      }

      return validated.data;
    } catch (error) {
      const duration = Date.now() - start;

      await this.handleJobError(
        job,
        error,
        {
          userId,
          topicId,
          conversationId,
        },
        duration,
      );
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
  private async handleJobError(
    job: Job,
    error: unknown,
    meta?: Record<string, any>,
    durationMs?: number,
  ): Promise<void> {
    // Permanent → fail immediately (no delay)
    if (error instanceof PermanentError) {
      const failure: JobFailureEnvelope = {
        failureType: 'PERMANENT',
        code: error.code,
        meta: error.meta,
        durationMs,
      };

      // Persist failure metadata on the job
      await job.updateData({
        ...job.data,
        __failure: failure,
      });

      // Control signal only
      throw new UnrecoverableError(error.message);
    }

    const type = classifyError(error, durationMs ?? 0);

    // Transient → delay manually (no failure yet)
    if (['RATE_LIMIT', 'TIMEOUT', 'NETWORK', 'SERVER'].includes(type)) {
      await job.moveToDelayed(Date.now() + BASE_DELAY);
      return;
    }

    if (job.attemptsMade >= MAX_UNKNOWN_RETRIES) {
      const failure: JobFailureEnvelope = {
        failureType: 'UNKNOWN',
        durationMs,
      };

      await job.updateData({
        ...job.data,
        __failure: failure,
      });

      throw new UnrecoverableError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    throw error;
  }

  // ======================================================
  // Lifecycle hooks
  // ======================================================

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      {
        event: 'job_started',
        jobId: job.id,
        jobName: job.name,
      },
      ExerciseProcessor.name,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    console.log(result);
    this.logger.log(
      {
        event: 'job_completed',
        jobId: job.id,
        jobName: job.name,
      },
      ExerciseProcessor.name,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<BaseJobData>, err: Error) {
    const failure = job.data?.__failure;

    this.logger.error(
      {
        jobId: job.id,
        name: job.name,
        attemptsMade: job.attemptsMade,
        reason: err.message,
        failureType: failure?.failureType,
        code: failure?.code,
        meta: failure?.meta,
        durationMs: failure?.durationMs,
      },
      ExerciseProcessor.name,
    );
  }
}
