import { Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { TeachAgentDto } from 'src/agent/dto/teach-agent.dto';
import { ok } from 'src/common/http/response.helpers';
import { QuickExerciseDto } from 'src/agent/dto/generate-agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('teach')
  async teach(
    @Body()
    body: TeachAgentDto,
  ) {
    const content = await this.agentService.teachTopic(
      body.prompt,
      body.userId,
    );
    return ok(content);
  }

  @Post('exercise')
  async exercise(
    @Body()
    body: TeachAgentDto,
  ) {
    return this.agentService.generateExercises(body.prompt, body.userId);
  }

  @Post('exercise/quick')
  async quickExercise(
    @Body()
    body: QuickExerciseDto,
  ) {
    const content = await this.agentService.generateQuickExercise(
      body.exerciseType,
      body.count,
      {
        configurable: { thread_id: body.threadId || 'quick-exercise-thread' },
        context: { user_id: body.userId, class_level: body.classLevel },
      },
    );
    return ok(content);
  }
}
