import { Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { TeachAgentDto } from 'src/agent/dto/teach-agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('teach')
  async teach(
    @Body()
    body: TeachAgentDto,
  ) {
    return this.agentService.teachTopic(body.prompt, body.userId);
  }

  @Post('exercise')
  async exercise(
    @Body()
    body: TeachAgentDto,
  ) {
    return this.agentService.generateExercises(body.prompt, body.userId);
  }
}
