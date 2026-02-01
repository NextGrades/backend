import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v7 as uuidv7 } from 'uuid';

import { HttpLogger } from 'src/logger/http-logger.service';
import { AcademicsService } from 'src/academics/academics.service';
import { AgentFactory } from 'src/agent/agent.factory';
import { followUpResponseFormat } from 'src/agent/schema/course-teacher.schema';
import { JOB_MODE } from 'src/common/types';
import { withTimeout } from 'src/common/errors/withTimeout';
import { InMemoryStore } from '@langchain/langgraph';
import { MEMORY_STORE } from 'src/pg-memory/pg-memory.module';

@Injectable()
export class AgentService {
  constructor(
    @InjectQueue('exercise')
    private readonly exerciseQueue: Queue,
    private readonly logger: HttpLogger,
    private readonly academicSvc: AcademicsService,
    private readonly agentFactory: AgentFactory,
    @Inject(MEMORY_STORE)
    private readonly store: InMemoryStore,
  ) {}

  // ======================================================
  // Conversation helpers
  // ======================================================

  private createConversationScope(userId: string) {
    return {
      userId,
      conversationId: uuidv7(),
    };
  }

  // ======================================================
  // Teaching flow
  // ======================================================

  async teachTopic(userId: string, topicId: string) {
    const jobId = uuidv7();
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
    const namespace = ['teaching_content', userId, conversationId];

    const stored = await this.store.get(namespace, 'latest');
    const memory = stored?.value;
    console.log('MEMORY LOADED', memory);
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

    const validated = followUpResponseFormat.safeParse(
      result.structuredResponse,
    );

    if (!validated.success) {
      throw new InternalServerErrorException(validated.error.message);
    }

    return validated.data;
  }

  // ======================================================
  // Exercises (same conversation)
  // ======================================================

  async generateExercisesFromTaughtContent(
    userId: string,
    conversationId: string,
  ) {
    const jobId = uuidv7();

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
    const jobId = uuidv7();
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
