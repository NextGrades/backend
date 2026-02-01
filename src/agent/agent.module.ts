import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CurriculumModule } from 'src/curriculum/curriculum.module';
import { AgentFactory } from 'src/agent/agent.factory';
import { LoggerModule } from 'src/logger/logger.module';
import { BullModule } from '@nestjs/bullmq';
import { ExerciseProcessor } from 'src/agent/agent.processor';
import { AcademicsModule } from 'src/academics/academics.module';
import { PgMemoryModule } from 'src/pg-memory/pg-memory.module';

export const QUEUE__EXERCISE = 'exercise';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AgentFactory, ExerciseProcessor],
  exports: [AgentService],
  imports: [
    PgMemoryModule,
    CurriculumModule,
    AcademicsModule,
    LoggerModule,
    BullModule.registerQueue({
      name: QUEUE__EXERCISE,
    }),
  ],
})
export class AgentModule {}
