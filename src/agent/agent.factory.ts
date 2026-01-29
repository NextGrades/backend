// src/agent/factory/agent.factory.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { createUserTools } from 'src/agent/tools/user.tools';
import { ExerciseType } from 'src/agent/interface/agent.interface';
import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { QEPrompt } from 'src/agent/schema/teaching-agent.schema';
import {
  subtopicGeneratorResponseFormat,
  subtopicPrompt,
} from 'src/agent/schema/subtopic.schema';
import { AcademicsService } from 'src/academics/academics.service';
import { createCourseTools } from 'src/agent/tools/course.tools';

@Injectable()
export class AgentFactory {
  private model: ChatGoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      temperature: 0,
    });
  }

  createAgentDeps(academicsSvc: AcademicsService) {
    const userTools = createUserTools();
    const courseTools = createCourseTools({ academicSvc: academicsSvc });
    // const curriculumTools = createCurriculumTools(curriculum);

    return {
      model: this.model,
      tools: {
        user: userTools,
        course: courseTools,
      },
    };
  }

  createSubTopicGeneratorAgent(checkpointer: MemorySaver) {
    return createAgent({
      model: this.model,
      systemPrompt: subtopicPrompt,
      responseFormat: subtopicGeneratorResponseFormat,
      checkpointer,
      tools: [],
    });
  }

  createExerciseGeneratorAgent(
    exerciseType: ExerciseType,
    checkpointer: MemorySaver,
  ) {
    const userTools = createUserTools();
    const responseFormat = responseFormatMap[exerciseType];

    if (!responseFormat) {
      throw new Error(
        `Invalid exercise type: ${exerciseType}. Valid types are: ${Object.keys(
          responseFormatMap,
        ).join(', ')}`,
      );
    }

    return createAgent({
      model: this.model,
      systemPrompt: QEPrompt,
      responseFormat,
      checkpointer,
      tools: [userTools.getUserInfo],
    });
  }
}
