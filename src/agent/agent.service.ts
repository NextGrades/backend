/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v7 as uuidv7 } from 'uuid';

import { ExerciseType } from 'src/agent/interface/agent.interface';
import { HttpLogger } from 'src/logger/http-logger.service';

@Injectable()
export class AgentService {
  constructor(
    @InjectQueue('exercise')
    private readonly exerciseQueue: Queue,
    private readonly logger: HttpLogger,
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

    this.logger.log(
      {
        event: 'queue_teaching_job',
        jobId,
        userId,
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
  // Quick exercise (standalone or scoped)
  // ======================================================

  async generateQuickExercise(
    exerciseType: ExerciseType,
    count: number,
    userId: string,
    conversationId?: string,
  ) {
    const jobId = uuidv7();

    const scope = conversationId
      ? { userId, conversationId }
      : this.createConversationScope(userId);

    this.logger.log(
      {
        event: 'queue_quick_exercise_job',
        jobId,
        exerciseType,
        userId,
        conversationId: scope.conversationId,
      },
      AgentService.name,
    );

    await this.exerciseQueue.add(
      'generate-quick-exercise',
      {
        exerciseType,
        count,
        scope,
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
