// src/agent/factory/agent.factory.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { CurriculumService } from 'src/curriculum/curriculum.service';
import { createCurriculumTools } from 'src/agent/tools/curriculum.tools';
import { createUserTools } from 'src/agent/tools/userTools.tools';
import { ExerciseType } from 'src/agent/interface/agent.interface';
import { responseFormatMap } from 'src/agent/schema/quick-exercise.schema';
import { QEPrompt } from 'src/agent/schema/teaching-agent.schema';

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

  createAgentDeps(curriculum: CurriculumService) {
    const userTools = createUserTools();
    const curriculumTools = createCurriculumTools(curriculum);

    return {
      model: this.model,
      tools: {
        user: userTools,
        curriculum: curriculumTools,
      },
    };
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
