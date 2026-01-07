import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CurriculumModule } from 'src/curriculum/curriculum.module';
import { AgentFactory } from 'src/agent/agent.factory';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AgentFactory],
  exports: [AgentService],
  imports: [CurriculumModule],
})
export class AgentModule {}
