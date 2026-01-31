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
import {
  coursePrompt,
  courseTeachingResponseFormat,
} from 'src/agent/schema/course-teacher.schema';

@Injectable()
export class AgentFactory {
  private readonly model: ChatGoogleGenerativeAI;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      temperature: 0,
    });
  }

  /* ---------------- Shared tools ---------------- */

  private createUserTools() {
    return createUserTools();
  }

  private createCourseTools(academicsSvc: AcademicsService) {
    return createCourseTools({ academicSvc: academicsSvc });
  }

  /* ---------------- Agents ---------------- */

  createCourseTeachingAgent(deps: {
    memory: MemorySaver;
    academicsSvc: AcademicsService;
  }) {
    const userTools = this.createUserTools();
    const courseTools = this.createCourseTools(deps.academicsSvc);

    return createAgent({
      model: this.model,
      systemPrompt: coursePrompt,
      responseFormat: courseTeachingResponseFormat,
      checkpointer: deps.memory,
      tools: [userTools.getUserInfo, courseTools.getSubtopicData],
    });
  }

  createSubTopicGeneratorAgent(deps: { memory: MemorySaver }) {
    return createAgent({
      model: this.model,
      systemPrompt: subtopicPrompt,
      responseFormat: subtopicGeneratorResponseFormat,
      checkpointer: deps.memory,
      tools: [],
    });
  }

  createExerciseGeneratorAgent(deps: {
    exerciseType: ExerciseType;
    memory: MemorySaver;
  }) {
    const userTools = this.createUserTools();
    const responseFormat = responseFormatMap[deps.exerciseType];

    if (!responseFormat) {
      throw new Error(`Invalid exercise type: ${deps.exerciseType}`);
    }

    return createAgent({
      model: this.model,
      systemPrompt: QEPrompt,
      responseFormat,
      checkpointer: deps.memory,
      tools: [userTools.getUserInfo],
    });
  }
}
