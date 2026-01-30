/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { v7 as uuidv7 } from 'uuid';

import { ExerciseType } from 'src/agent/interface/agent.interface';
import { CurriculumService } from 'src/curriculum/curriculum.service';

// import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { AgentFactory } from 'src/agent/agent.factory';
import { HttpLogger } from 'src/logger/http-logger.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { AcademicsService } from 'src/academics/academics.service';
import {
  SubtopicGeneratorInput,
  SubtopicGeneratorResponse,
} from 'src/agent/schema/subtopic.schema';
import {
  courseExerciseResponse,
  courseExerciseResponseFormat,
  coursePrompt,
  courseTeachingResponseFormat,
} from 'src/agent/schema/course-teacher.schema';

@Injectable()
export class AgentService {
  private readonly teachingAgent;
  private readonly exerciseAgent;
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly curriculum: CurriculumService,
    private readonly academicsSvc: AcademicsService,
    @InjectQueue('exercise')
    private readonly exQueue: Queue,
    private agentFactory: AgentFactory,
    private readonly logger: HttpLogger,
  ) {
    // const systemPrompt = CurriculumPrompt;
    const { model, tools } = this.agentFactory.createAgentDeps(
      this.academicsSvc,
    );

    /* ---------------- AGENTS ---------------- */
    this.teachingAgent = createAgent({
      model,
      systemPrompt: coursePrompt,
      responseFormat: courseTeachingResponseFormat,
      checkpointer: this.checkpointer,
      tools: [tools.user.getUserAge, tools.course.getSubtopicData],
    });

    this.exerciseAgent = createAgent({
      model,
      systemPrompt: coursePrompt,
      responseFormat: courseExerciseResponseFormat,
      checkpointer: this.checkpointer,
      tools: [tools.user.getUserAge, tools.course.getSubtopicData],
    });
  }

  async teachTopic(userId: string, topicId: string, threadId = 'edu-thread-1') {
    const jobId = uuidv7();
    this.logger.log(
      {
        event: 'queue_teaching_job',
        jobId,
        userId,
        threadId,
      },
      'AgentService.teachTopic',
    );

    await this.exQueue.add(
      'generate-course-teaching-content',
      {
        userId,
        topicId,
        threadId,
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

  async generateExercisesFromTaughtContent(
    userId: string,
    threadId = 'edu-thread-1',
  ): Promise<courseExerciseResponse> {
    this.logger.log(
      {
        event: 'exercise_agent_invoked',
        threadId,
        userId,
      },
      AgentService.name,
    );

    try {
      const response = await this.exerciseAgent.invoke(
        {
          messages: [
            {
              role: 'user' as const,
              content: 'Give me 3 exercises on this topic',
            },
          ],
        },
        {
          configurable: { thread_id: threadId },
          context: { user_id: userId },
        },
      );

      // Type assertion with validation
      const structuredResponse = response.structuredResponse as unknown;

      // Validate the response matches our expected type
      const validated =
        courseExerciseResponseFormat.safeParse(structuredResponse);

      if (!validated.success) {
        throw new Error('Invalid exercise response format');
      }
      this.logger.error(
        {
          event: 'exercise_response_validation_success',
          userId,
          threadId,
        },
        AgentService.name,
      );

      return validated.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        {
          event: 'generate_exercises_failed',
          userId,
          errorMessage,
        },
        AgentService.name,
      );

      throw new InternalServerErrorException(
        `Failed to generate exercises: ${errorMessage}`,
      );
    }
  }

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
      {
        event: 'queue_quick_exercise_job',
        jobId,
        exerciseType,
        userId: config.context.user_id,
      },
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

  async generateSubTopics(
    courseCode: string,
    config?: {
      configurable: { thread_id: string };
      context: { user_id: string; level: number };
    },
  ): Promise<SubtopicGeneratorResponse> {
    const subTopicAgent = this.agentFactory.createSubTopicGeneratorAgent(
      this.checkpointer,
    );
    const course = await this.academicsSvc.getCourseByCode(courseCode);
    const rawInput: SubtopicGeneratorInput = {
      course_code: course.code,
      course_id: course.id,
      course_title: course.title,
      level: course.level,
      credit_units: course.creditUnits,
      syllabus_item: course.syllabusStructured[0],
    };
    const response = await subTopicAgent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: JSON.stringify(rawInput),
          },
        ],
      },
      config,
    );

    // console.log(JSON.stringify(response.structuredResponse, null, 2));
    return response.structuredResponse as SubtopicGeneratorResponse;
  }
}
