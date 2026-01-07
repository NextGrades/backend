/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import {
  teachingResponseFormat,
  exerciseResponseFormat,
  QuickExerciseResponse,
  CurriculumPrompt,
} from 'src/agent/schema/teaching-agent.schema';
import {
  ExerciseResponse,
  ExerciseType,
  TeachingResponse,
} from 'src/agent/interface/agent.interface';
import { CurriculumService } from 'src/curriculum/curriculum.service';

import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { AgentFactory } from 'src/agent/agent.factory';

@Injectable()
export class AgentService {
  private readonly teachingAgent;
  private readonly exerciseAgent;
  private readonly checkpointer = new MemorySaver();

  constructor(
    private readonly curriculum: CurriculumService,
    private agentFactory: AgentFactory,
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

    /* ---------------- Quick Exercise ---------------- */
    // this.quickExerciseAgent = createAgent({
    //   model,
    //   systemPrompt: QEPrompt,
    //   responseFormat: quickExerciseResponseFormat,
    //   checkpointer: this.checkpointer,
    //   tools: [tools.user.getUserAge],
    // });
  }

  async teachTopic(
    prompt: string,
    userId: string,
    threadId = 'edu-thread-1',
  ): Promise<TeachingResponse> {
    console.log('AgentService.teachTopic - prompt:', prompt);
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
      // console.log('Structured Response:', structuredResponse);

      // Validate the response matches our expected type
      const validated = teachingResponseFormat.safeParse(structuredResponse);

      if (!validated.success) {
        throw new Error('Invalid teaching response format');
      }
      console.log('Validated Teaching Response:', validated.data);
      return validated.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
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
      console.log('Validated Exercise Response:', validated.data);
      return validated.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
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
  ): Promise<QuickExerciseResponse> {
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

    try {
      const agent = this.agentFactory.createExerciseGeneratorAgent(
        exerciseType,
        this.checkpointer,
      );
      const response = await agent.invoke({ messages }, config);

      const responseFormat = responseFormatMap[exerciseType];

      if (!responseFormat) {
        throw new Error(`Invalid exercise type: ${exerciseType}`);
      }

      const validated = responseFormat.safeParse(response.structuredResponse);

      if (!validated.success) {
        throw new Error(`Invalid response format: ${validated.error.message}`);
      }

      return validated.data as QuickExerciseResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to generate ${exerciseType} exercises: ${errorMessage}`,
      );
    }
  }
}
