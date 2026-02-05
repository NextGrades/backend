import {
  Inject,
  Injectable,
  InternalServerErrorException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';

import { HttpLogger } from 'src/logger/http-logger.service';
import { AcademicsService } from 'src/academics/academics.service';
import { AgentFactory } from 'src/agent/agent.factory';
import { followUpResponseFormat } from 'src/agent/schema/course-teacher.schema';
import { JOB_MODE } from 'src/common/types';
import { withTimeout } from 'src/common/errors/withTimeout';
import { BaseStore } from '@langchain/langgraph-checkpoint';
import { REDIS_MEMORY_STORE } from 'src/pg-memory/pg-memory.module';
import { classifyError } from 'src/common/errors/classify';

@Injectable()
export class AgentService {
  constructor(
    @InjectQueue('exercise')
    private readonly exerciseQueue: Queue,
    private readonly logger: HttpLogger,
    private readonly academicSvc: AcademicsService,
    private readonly agentFactory: AgentFactory,
    @Inject(REDIS_MEMORY_STORE)
    private readonly store: BaseStore,
  ) {}

  // ======================================================
  // Conversation helpers
  // ======================================================

  private createConversationScope(userId: string) {
    return {
      userId,
      conversationId: randomUUID(),
    };
  }

  // ======================================================
  // Teaching flow
  // ======================================================

  async teachTopic(userId: string, topicId: string) {
    const jobId = randomUUID();
    const scope = this.createConversationScope(userId);
    const mode = JOB_MODE.INTERACTIVE;

    this.logger.log(
      {
        event: 'queue_teaching_job',
        jobId,
        userId,
        jobMode: mode,
        topicId,
        conversationId: scope.conversationId,
      },
      AgentService.name,
    );

    await this.exerciseQueue.add(
      'generate-course-teaching-content',
      {
        scope,
        topicId,
        mode,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3_000,
        },
      },
    );

    return {
      jobId,
      conversationId: scope.conversationId,
    };
  }

  async askFollowUp(userId: string, conversationId: string, question: string) {
    try {
      console.log('FOLLOW-UP QUESTION:', question);

      const followUpAgent = this.agentFactory.createFollowUpAgent();

      const result = await withTimeout(
        (signal) =>
          followUpAgent.invoke(
            {
              messages: [{ role: 'user', content: question }],
            },
            {
              recursionLimit: 8,
              configurable: { thread_id: conversationId },
              context: { userId, conversationId },
              signal,
            },
          ),
        60_000,
      );

      console.log('FOLLOW-UP RESULT:', result);

      const validated = followUpResponseFormat.safeParse(
        result.structuredResponse,
      );

      if (!validated.success) {
        throw new InternalServerErrorException(
          'Invalid response format from AI agent',
        );
      }

      return validated.data;
    } catch (err) {
      console.log('follo-up agent err', err);
      const failureType = classifyError(err, 60_000);

      switch (failureType) {
        case 'RATE_LIMIT':
          throw new ServiceUnavailableException(
            'AI service is temporarily rate limited. Try again shortly.',
          );
        case 'TIMEOUT':
          throw new RequestTimeoutException(
            'AI service took too long to respond.',
          );
        case 'NETWORK':
        case 'SERVER':
          throw new ServiceUnavailableException(
            'AI service is currently unavailable.',
          );
        case 'PERMANENT':
          throw err;
        default:
          throw new InternalServerErrorException(
            'Failed to process follow-up request.',
          );
      }
    }
  }

  // ======================================================
  // Exercises (same conversation)
  // ======================================================

  async generateExercisesFromTaughtContent(
    userId: string,
    conversationId: string,
  ) {
    const jobId = randomUUID();

    this.logger.log(
      {
        event: 'queue_exercise_from_teaching',
        jobId,
        userId,
        conversationId,
      },
      AgentService.name,
    );

    await this.exerciseQueue.add(
      'generate-course-exercises',
      {
        scope: { userId, conversationId },
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3_000,
        },
      },
    );

    return jobId;
  }

  // ======================================================
  // Subtopics (isolated conversation)
  // ======================================================

  async generateSubTopics(userId: string, courseCode: string) {
    const jobId = randomUUID();
    const scope = this.createConversationScope(userId);

    this.logger.log(
      {
        event: 'queue_subtopic_generation',
        jobId,
        userId,
        courseCode,
        conversationId: scope.conversationId,
      },
      AgentService.name,
    );

    await this.exerciseQueue.add(
      'generate-subtopics',
      {
        scope,
        courseCode,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3_000,
        },
      },
    );

    return {
      jobId,
      conversationId: scope.conversationId,
    };
  }
}
