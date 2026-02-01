import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createAgent } from 'langchain';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { InMemoryStore } from '@langchain/langgraph';

import { createUserTools } from 'src/agent/tools/user.tools';
import { createCourseTools } from 'src/agent/tools/course.tools';
import { AcademicsService } from 'src/academics/academics.service';
import {
  subtopicGeneratorResponseFormat,
  subtopicPrompt,
} from 'src/agent/schema/subtopic.schema';
import {
  contextSchema,
  CourseTeachingResponse,
  courseTeachingResponseFormat,
  courseTutorPrompt,
  followUpResponseFormat,
  followUpSystemPrompt,
} from 'src/agent/schema/course-teacher.schema';
import { CHECKPOINTER, MEMORY_STORE } from 'src/pg-memory/pg-memory.module';
import { createAgentTools } from 'src/agent/tools/agent.tools';

@Injectable()
export class AgentFactory {
  private readonly model: ChatGoogleGenerativeAI;

  constructor(
    configService: ConfigService,

    @Inject(CHECKPOINTER)
    private readonly checkpointer: BaseCheckpointSaver,

    @Inject(MEMORY_STORE)
    private readonly store: InMemoryStore,
  ) {
    const apiKey = configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      temperature: 0,
    });
  }

  /* ---------------- Agents ---------------- */

  createCourseTeachingAgent(academicsSvc: AcademicsService) {
    const userTools = createUserTools();
    const courseTools = createCourseTools({ academicSvc: academicsSvc });

    return createAgent({
      model: this.model,
      systemPrompt: courseTutorPrompt,
      responseFormat: courseTeachingResponseFormat,
      checkpointer: this.checkpointer,
      tools: [userTools.getUserInfo, courseTools.getSubtopicData],
      contextSchema,
    });
  }

  createFollowUpAgent() {
    const agentTools = createAgentTools();
    return createAgent({
      model: this.model,
      systemPrompt: followUpSystemPrompt,
      checkpointer: this.checkpointer,
      responseFormat: followUpResponseFormat,
      store: this.store,
      tools: [agentTools.getGeneratedContent],
      contextSchema,
    });
  }
  summarizeLesson(lesson: CourseTeachingResponse) {
    return `
Course: ${lesson.courseTitle}
Subtopic: ${lesson.topic}
Key points:
- ${lesson.keyConcepts.join('\n- ')}
Examples:
- ${lesson.workedExamples.slice(0, 3).join('\n- ')}
`;
  }

  createSubTopicGeneratorAgent() {
    return createAgent({
      model: this.model,
      systemPrompt: subtopicPrompt,
      responseFormat: subtopicGeneratorResponseFormat,
      checkpointer: this.checkpointer,
      store: this.store,
      tools: [],
    });
  }
}
