import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CurriculumModule } from 'src/curriculum/curriculum.module';

@Module({
  controllers: [AgentController],
  providers: [AgentService],
  imports: [CurriculumModule],
})
export class AgentModule {}
