import {
  Module,
  Global,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { RequestIdMiddleware } from 'src/logger/request-id.middleware';
import { RequestLoggerService } from 'src/logger/request-logger.service';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [RequestLoggerService],
  exports: [RequestLoggerService],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*splat', method: RequestMethod.ALL });
  }
}
