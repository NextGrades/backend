import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentModule } from 'src/agent/agent.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
          // Optional: Add more Redis options
          maxRetriesPerRequest: null, // Required for BullMQ
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 60 * 60 * 24, // Keep for 24 hours
          },
          removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
          },
        },
      }),
      inject: [ConfigService],
    }),

    AgentModule,
  ],
})
export class WorkerModule {}
