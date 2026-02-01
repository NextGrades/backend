import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { AgentFactory } from 'src/agent/agent.factory';

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
import { JOB_MODE } from 'src/common/types';
import { Inject } from '@nestjs/common';
import { InMemoryStore } from '@langchain/langgraph';
import { MEMORY_STORE } from 'src/pg-memory/pg-memory.module';

const BASE_DELAY = 75_000; // 75 seconds
const MAX_UNKNOWN_RETRIES = 5;

@Processor('exercise')
export class ExerciseProcessor extends WorkerHost {
  constructor(
    private readonly agentFactory: AgentFactory,
    private readonly logger: SystemLogger,
    private readonly academicsSvc: AcademicsService,
    @Inject(MEMORY_STORE)
    private readonly store: InMemoryStore,
  ) {
    super();
  }

  /**
   * Job router
   */
  async process(job: Job<BaseJobData>): Promise<unknown> {
    switch (job.name) {
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

  // ======================================================
  // Course Teaching Job
  // ======================================================

  private async handleGenerateCourseTeachingContent(
    job: Job<BaseJobData>,
  ): Promise<unknown> {
    const start = Date.now();
    let userId: string | undefined = undefined;
    let topicId: string | undefined = undefined;
    let conversationId: string | undefined = undefined;
    let jobMode: string | undefined = undefined;
    try {
      const jobData = validateJob(job);
      topicId = jobData.topicId;
      userId = jobData.scope.userId;
      conversationId = jobData.scope.conversationId;
      jobMode = jobData.mode;
      console.log('JOB_DATA', jobData);

      const agent = this.agentFactory.createCourseTeachingAgent(
        this.academicsSvc,
      );

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
              context: {
                userId: jobData.scope.userId,
                conversationId: jobData.scope.conversationId,
              },
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

      // SAVE TO STORE
      const namespace = ['teaching_content', userId, conversationId];

      await this.store.put(namespace, 'latest', validated.data);
      const duration = Date.now() - start;

      await job.updateData({
        ...job.data,
        durationMs: duration.toString(),
      });

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
          jobMode,
        },
        duration,
      );
    }
  }

  // ======================================================
  // Prompt builders
  // ======================================================

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

  // ======================================================
  // Error handling
  // ======================================================
  private async handleJobError(
    job: Job<BaseJobData>,
    error: unknown,
    meta?: Record<string, any>,
    durationMs?: number,
  ): Promise<void> {
    // 1️⃣ Permanent errors → always fail fast
    if (error instanceof PermanentError) {
      const failure: JobFailureEnvelope = {
        failureType: 'PERMANENT',
        code: error.code,
        meta: error.meta,
        durationMs,
      };

      await job.updateData({
        ...job.data,
        __failure: failure,
      });

      throw new UnrecoverableError(error.message);
    }

    const type = classifyError(error, durationMs ?? 0);

    this.logger.error({ type, error }, ExerciseProcessor.name);

    const isInteractive = job.data.mode === JOB_MODE.INTERACTIVE;

    // 2️⃣ INTERACTIVE jobs → never delay, never retry
    if (isInteractive) {
      const failure: JobFailureEnvelope = {
        failureType: type,
        durationMs,
      };

      await job.updateData({
        ...job.data,
        __failure: failure,
      });

      throw new UnrecoverableError(
        error instanceof Error ? error.message : 'AI service unavailable',
      );
    }

    // 3️⃣ ASYNC jobs → retry with delay on transient failures
    if (['RATE_LIMIT', 'TIMEOUT', 'NETWORK', 'SERVER'].includes(type)) {
      await job.moveToDelayed(Date.now() + BASE_DELAY);
      return;
    }

    // 4️⃣ Unknown errors → capped retries
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

    // 5️⃣ Let BullMQ retry naturally
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
  onCompleted(job: Job<BaseJobData>) {
    this.logger.log(
      {
        event: 'job_completed',
        jobId: job.id,
        jobName: job.name,
        durationMs: job.data.durationMs,
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
