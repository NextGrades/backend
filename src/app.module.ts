import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { AudioModule } from './audio/audio.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { AgentModule } from './agent/agent.module';
import { RedisModule } from './redis/redis.module';
import { AllExceptionsFilter } from 'all-exceptions.filter';
import { APP_FILTER } from '@nestjs/core';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: {
          rejectUnauthorized: false,
        },
        extra: {
          connectionTimeoutMillis: 10000,
          max: 5,
        },
      }),
    }),

    LoggerModule,

    AudioModule,

    CurriculumModule,

    AgentModule,

    RedisModule,

    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
