/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createAgent, tool, type ToolRuntime } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import * as z from 'zod';
import {
  teachingResponseFormat,
  exerciseResponseFormat,
  NerdcCurriculumItemSchema,
  Prompt,
} from 'src/agent/schema/agent.schema';
import {
  ExerciseResponse,
  TeachingResponse,
} from 'src/agent/interface/agent.interface';
import { CurriculumService } from 'src/curriculum/curriculum.service';

// Type for agent runtime context
type AgentContext = { user_id: string };
type AgentRuntime = ToolRuntime<unknown, AgentContext>;

@Injectable()
export class AgentService {
  private readonly teachingAgent;
  private readonly exerciseAgent;
  private readonly checkpointer = new MemorySaver();

  constructor(private readonly curriculum: CurriculumService) {
    const systemPrompt = Prompt;

    /* ---------------- TOOLS ---------------- */
    const getNerdcCurriculum = tool(
      async ({
        topic,
        class_level,
      }: {
        topic: string;
        class_level: number;
      }) => {
        console.log('getNerdcCurriculum called with Agent:', {
          topic,
          class_level,
        });
        // console.log('Tool called');
        // console.log('this is:', this); // Will likely show undefined or wrong object
        // console.log('this.curriculum is:', this?.curriculum); // Will be undefined
        try {
          const curriculum = await this.curriculum.getCurriculum({
            topic,
            classLevel: class_level,
          });

          console.log('Curriculum fetched:', curriculum);
          if (curriculum.length === 0) {
            throw new Error(
              `No curriculum found for the given topic: ${topic} and class level: ${class_level}`,
            );
          }

          const parsed = NerdcCurriculumItemSchema.safeParse(curriculum[0]);

          if (!parsed.success) {
            throw new Error('Invalid curriculum response structure');
          }

          return {
            class_level: parsed.data.classlevel,
            subject: parsed.data.subject,
            topic: parsed.data.name,
            performance_objectives: parsed.data.performanceObjectives,
            content: parsed.data.content,
            teacher_activities: parsed.data.teacherActivities,
            pupil_activities: parsed.data.pupilActivities,
            materials: parsed.data.materials,
            evaluation_guide: parsed.data.evaluationGuide,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to fetch curriculum: ${errorMessage}`);
        }
      },
      {
        name: 'get_nerdc_curriculum',
        description:
          'Retrieve official NERDC curriculum objectives and teaching scope',
        schema: z.object({
          topic: z.string().describe('Curriculum topic name'),
          class_level: z
            .number()
            .describe('Class level (e.g., 5 for Primary 5)'),
        }),
      },
    );

    const getUserAge = tool(
      (_: Record<string, never>, config: AgentRuntime): number => {
        const { user_id } = config.context;
        if (user_id === '1') return 10;
        if (user_id === '2') return 16;
        return 8;
      },
      {
        name: 'get_user_age',
        description: "Retrieve the learner's age to tailor explanations",
        schema: z.object({}),
      },
    );

    /* ---------------- MODEL ---------------- */
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash-lite',
      apiKey: process.env.GOOGLE_API_KEY || '',
      temperature: 0,
    });

    const tools = [getUserAge, getNerdcCurriculum];

    /* ---------------- AGENTS ---------------- */
    this.teachingAgent = createAgent({
      model,
      systemPrompt,
      responseFormat: teachingResponseFormat,
      checkpointer: this.checkpointer,
      tools,
    });

    this.exerciseAgent = createAgent({
      model,
      systemPrompt,
      responseFormat: exerciseResponseFormat,
      checkpointer: this.checkpointer,
      tools,
    });
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
}
